"""Kurve UX rig: drive kurve.html in Chromium the way a person does.

Only what a sighted user can perceive is used: the mouse, the keyboard, and
controls found by their role, visible text or label (get_by_role, get_by_text,
get_by_label). There is no page.evaluate, no element.click() in JavaScript and
no reading of the DOM for hidden state. A control is clicked by moving the
mouse to the middle of where it is drawn and pressing the button there, so
whatever lies on top of it at that moment gets the click, as it would for a
person. A control that cannot be found, or is not on the screen, raises
NotOnScreen: that is a finding for the report, not something to code around.

Every action is logged with its time, the task it belongs to, what was aimed
at and where, to ux/logs/<run>.json (rewritten after every action, so a crash
keeps the log). Screenshots go to ux/shots/<run>/NN-name.png. Downloads (an
exported PNG, CSV, PDF...) land in ux/downloads/<run>/.

The page is served over HTTP from the folder that holds kurve.html (Chromium
gives file:// pages unreliable storage), in a fresh browser profile unless a
named profile is asked for (ux/profiles/<name>, kept between runs, so a
project made in one run can be opened again in the next, as a person would).

Use it from Python:

    import sys; sys.path.insert(0, "tools/ux")
    from drive import Rig
    with Rig(run="T1-1366-light", width=1366, height=768, theme="light") as r:
        r.task("T1", "Type 6 x,y pairs, scatter plot, axis titles, export PNG")
        r.shot("first-screen")
        r.click_role("button", "Plot")            # the menu bar's Plot
        r.shot("plot-menu")
        r.say("Where is 'Insert chart'?")         # the persona's inner voice
        r.wrong_turn("Opened Plot first; the chart is made from the worksheet")
        r.end_task("partly")
    # ux/logs/T1-1366-light.json holds every action; r.report() prints the counts.

or from the command line, to check the rig itself:

    python tools/ux/drive.py --smoke [--width 1366 --height 768 --theme light]

Counting (see Rig.summary): a click is one press of a mouse button (a double
click is two), a keystroke one key or chord pressed (typed text counts each
character), a drag one press; time is from task() to end_task(), waits
included, since a person waits too.
"""
from __future__ import annotations

import argparse
import contextlib
import functools
import http.server
import json
import os
import re
import socketserver
import sys
import threading
import time
from datetime import datetime, timezone
from pathlib import Path

from playwright.sync_api import sync_playwright, TimeoutError as PWTimeout

HERE = Path(__file__).resolve().parent
REPO = HERE.parent.parent
# Chromium already installed on this machine, used when Playwright's own build is missing.
CHROME_PATHS = [os.environ.get("KURVE_CHROME", ""), "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
                "/opt/pw-browsers/chromium/chrome-linux/chrome"]


class NotOnScreen(Exception):
    """A control could not be found by what a person sees, or is not on the screen."""


class _Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a):  # the server's own log is noise here
        pass


def _serve(folder: Path):
    handler = functools.partial(_Quiet, directory=str(folder))
    srv = socketserver.ThreadingTCPServer(("127.0.0.1", 0), handler)
    srv.daemon_threads = True
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    return srv


class Rig:
    def __init__(self, run: str, width: int = 1366, height: int = 768, theme: str = "light",
                 app: str | os.PathLike | None = None, out: str | os.PathLike | None = None,
                 profile: str | None = None, headless: bool = True, type_delay_ms: int = 35,
                 block_web_fonts: bool = False):
        self.run, self.width, self.height, self.theme = run, width, height, theme
        self.app = Path(app).resolve() if app else (REPO / "kurve.html")
        # Output goes to ux/ beside the app (the repository's, or a cold-test folder's).
        self.out = Path(out).resolve() if out else self.app.parent / "ux"
        self.profile, self.headless, self.type_delay = profile, headless, type_delay_ms
        self.block_web_fonts = block_web_fonts
        self.shots = self.out / "shots" / run
        self.downloads = self.out / "downloads" / run
        self.logfile = self.out / "logs" / f"{run}.json"
        self.events: list[dict] = []
        self.t0 = time.monotonic()
        self.cur_task: str | None = None
        self.n_shot = 0
        self.pos = (width / 2, height / 2)
        self.errors: list[str] = []

    # ---- start and stop ------------------------------------------------------
    def __enter__(self):
        for d in (self.shots, self.downloads, self.logfile.parent):
            d.mkdir(parents=True, exist_ok=True)
        self._srv = _serve(self.app.parent)
        self.url = f"http://127.0.0.1:{self._srv.server_address[1]}/{self.app.name}"
        self._pw = sync_playwright().start()
        opts = dict(viewport={"width": self.width, "height": self.height}, color_scheme=self.theme,
                    accept_downloads=True, locale="en-GB", timezone_id="Europe/Berlin")
        launch = dict(headless=self.headless)
        exe = next((p for p in CHROME_PATHS if p and Path(p).exists()), None)
        try:
            self._try_launch(launch, opts, None)
        except Exception:
            if not exe:
                raise
            self._try_launch(launch, opts, exe)
        page = self.page
        page.on("pageerror", lambda e: self.errors.append(f"page error: {e}"))
        page.on("console", lambda m: m.type == "error" and "Failed to load resource" not in m.text
                and self.errors.append(f"console: {m.text}"))
        if self.block_web_fonts:
            page.route(re.compile(r"fonts\.(googleapis|gstatic)\.com"), lambda r: r.abort())
        self._log("open", target=self.url, viewport=f"{self.width}x{self.height}", theme=self.theme)
        page.goto(self.url)
        self.wait_quiet()
        return self

    def _try_launch(self, launch, opts, exe):
        if exe:
            launch = dict(launch, executable_path=exe)
        if self.profile:
            udir = self.out / "profiles" / self.profile
            udir.mkdir(parents=True, exist_ok=True)
            self.ctx = self._pw.chromium.launch_persistent_context(str(udir), **launch, **opts)
            self.browser = None
            self.page = self.ctx.pages[0] if self.ctx.pages else self.ctx.new_page()
        else:
            self.browser = self._pw.chromium.launch(**launch)
            self.ctx = self.browser.new_context(**opts)
            self.page = self.ctx.new_page()

    def __exit__(self, *exc):
        if self.cur_task:
            self.end_task("abandoned" if exc[0] else "unknown", note=str(exc[1]) if exc[1] else "")
        self._log("close", errors=self.errors)
        self._flush()
        with contextlib.suppress(Exception):
            self.ctx.close()
        with contextlib.suppress(Exception):
            if self.browser:
                self.browser.close()
        with contextlib.suppress(Exception):
            self._pw.stop()
        self._srv.shutdown()
        return False

    def reload(self):
        """Reload the page, as a person pressing F5 does."""
        self._log("key", keys="F5", target="reload")
        self.page.reload()
        self.wait_quiet()

    # ---- the log ---------------------------------------------------------------
    def _log(self, kind: str, **kw):
        ev = {"t": round(time.monotonic() - self.t0, 3), "wall": datetime.now(timezone.utc).isoformat(timespec="seconds"),
              "task": self.cur_task, "kind": kind}
        ev.update({k: v for k, v in kw.items() if v is not None})
        self.events.append(ev)
        self._flush()
        return ev

    def _flush(self):
        meta = {"run": self.run, "app": str(self.app), "viewport": [self.width, self.height], "theme": self.theme}
        tmp = self.logfile.with_suffix(".tmp")
        tmp.write_text(json.dumps({"meta": meta, "events": self.events, "summary": self.summary()}, indent=1, ensure_ascii=False))
        tmp.replace(self.logfile)

    def task(self, tid: str, title: str = ""):
        if self.cur_task:
            self.end_task("unknown")
        self.cur_task = tid
        self._log("task_start", target=title)

    def end_task(self, success: str, note: str = ""):
        """success: yes, partly, no (or abandoned / unknown)."""
        self._log("task_end", success=success, note=note)
        self.cur_task = None

    # Annotations: what the persona thinks and does wrong. They cost no clicks.
    def say(self, text: str):
        """The persona's inner voice, quoted in the report."""
        self._log("say", text=text)

    def wrong_turn(self, text: str):
        """Somewhere gone first that was not the way."""
        self._log("wrong_turn", text=text)

    def guess(self, text: str):
        """An action taken without being confident what it would do."""
        self._log("guess", text=text)

    def help_opened(self, text: str = ""):
        """The persona opened the app's Help (counted: needing Help for a basic task is a finding)."""
        self._log("help", text=text)

    def finding(self, text: str):
        self._log("finding", text=text)

    # ---- looking -----------------------------------------------------------------
    def wait_quiet(self, ms: int = 400):
        """Let the page settle (network, then a short pause), as a person waits for it to load."""
        with contextlib.suppress(PWTimeout):
            self.page.wait_for_load_state("networkidle", timeout=8000)
        self.page.wait_for_timeout(ms)

    def wait(self, ms: int):
        self.page.wait_for_timeout(ms)

    def shot(self, name: str, note: str = "") -> Path:
        """A screenshot of what is on the screen now. Look at it before the next action."""
        self.n_shot += 1
        path = self.shots / f"{self.n_shot:02d}-{name}.png"
        self.page.wait_for_timeout(150)
        self.page.screenshot(path=str(path))
        self._log("shot", target=name, path=str(path.relative_to(self.out)), note=note or None)
        return path

    # ---- finding controls by what is seen ----------------------------------------
    def _box(self, loc, what: str):
        try:
            loc.first.wait_for(state="visible", timeout=2500)
        except PWTimeout:
            raise NotOnScreen(f"cannot see {what}")
        b = loc.first.bounding_box()
        if not b or b["width"] < 1 or b["height"] < 1:
            raise NotOnScreen(f"{what} has no size on screen")
        cx, cy = b["x"] + b["width"] / 2, b["y"] + b["height"] / 2
        if not (0 <= cx < self.width and 0 <= cy < self.height):
            raise NotOnScreen(f"{what} is off the screen at ({cx:.0f}, {cy:.0f}); scroll to it")
        return cx, cy, b

    def by_role(self, role: str, name: str | None = None, exact: bool = False, nth: int = 0, within=None):
        root = within if within is not None else self.page
        loc = root.get_by_role(role, name=name, exact=exact) if name is not None else root.get_by_role(role)
        return loc.nth(nth) if nth else loc

    def by_text(self, text: str, exact: bool = False, nth: int = 0, within=None):
        root = within if within is not None else self.page
        loc = root.get_by_text(text, exact=exact)
        return loc.nth(nth) if nth else loc

    def by_label(self, label: str, exact: bool = False, nth: int = 0, within=None):
        root = within if within is not None else self.page
        loc = root.get_by_label(label, exact=exact)
        return loc.nth(nth) if nth else loc

    def where(self, loc, what: str = "control"):
        """Where a control is drawn (its middle), without touching it."""
        x, y, _ = self._box(loc, what)
        return x, y

    def sees(self, loc) -> bool:
        """Whether a control is visible now (no waiting)."""
        with contextlib.suppress(Exception):
            return loc.first.is_visible()
        return False

    # ---- acting ------------------------------------------------------------------
    def _move(self, x, y):
        self.page.mouse.move(x, y, steps=8)
        self.pos = (x, y)

    def click_at(self, x: float, y: float, what: str = "", button: str = "left", clicks: int = 1, mods: list[str] | None = None):
        mods = mods or []
        self._move(x, y)
        for m in mods:
            self.page.keyboard.down(m)
        self.page.mouse.click(x, y, button=button, click_count=clicks, delay=40)
        for m in reversed(mods):
            self.page.keyboard.up(m)
        kind = {1: "click", 2: "dblclick"}.get(clicks, "click")
        if button == "right":
            kind = "rightclick"
        self._log(kind, target=what or None, x=round(x), y=round(y), mods=mods or None, presses=clicks)
        self.page.wait_for_timeout(120)

    def click(self, loc, what: str = "", **kw):
        x, y, _ = self._box(loc, what or "control")
        self.click_at(x, y, what, **kw)

    def click_role(self, role, name=None, exact=False, nth=0, within=None, **kw):
        self.click(self.by_role(role, name, exact, nth, within), f"{role} '{name}'" if name else role, **kw)

    def click_text(self, text, exact=False, nth=0, within=None, **kw):
        self.click(self.by_text(text, exact, nth, within), f"text '{text}'", **kw)

    def click_label(self, label, exact=False, nth=0, within=None, **kw):
        self.click(self.by_label(label, exact, nth, within), f"label '{label}'", **kw)

    def dblclick(self, loc, what=""):
        self.click(loc, what, clicks=2)

    def rightclick(self, loc, what=""):
        self.click(loc, what, button="right")

    def hover(self, loc_or_xy, what: str = "", ms: int = 900):
        """Rest the pointer on something long enough for its tooltip, as a person does on an icon."""
        if isinstance(loc_or_xy, tuple):
            x, y = loc_or_xy
        else:
            x, y, _ = self._box(loc_or_xy, what or "control")
        self._move(x, y)
        self._log("hover", target=what or None, x=round(x), y=round(y))
        self.page.wait_for_timeout(ms)

    def drag(self, x1, y1, x2, y2, what: str = "", steps: int = 18, mods: list[str] | None = None):
        mods = mods or []
        self._move(x1, y1)
        for m in mods:
            self.page.keyboard.down(m)
        self.page.mouse.down()
        self.page.mouse.move(x2, y2, steps=steps)
        self.page.mouse.up()
        for m in reversed(mods):
            self.page.keyboard.up(m)
        self.pos = (x2, y2)
        self._log("drag", target=what or None, x=round(x1), y=round(y1), x2=round(x2), y2=round(y2), mods=mods or None)
        self.page.wait_for_timeout(150)

    def wheel(self, dy: float, dx: float = 0, at: tuple | None = None, what: str = ""):
        if at:
            self._move(*at)
        self.page.mouse.wheel(dx, dy)
        self._log("wheel", target=what or None, x=round(self.pos[0]), y=round(self.pos[1]), dx=dx, dy=dy)
        self.page.wait_for_timeout(200)

    def type(self, text: str, what: str = ""):
        """Type text at the keyboard focus, a key at a time."""
        self.page.keyboard.type(text, delay=self.type_delay)
        self._log("type", target=what or None, text=text, keys=len(text))

    def press(self, keys: str, what: str = "", times: int = 1):
        """Press a key or a chord (\"Enter\", \"Control+Z\", \"Shift+Tab\")."""
        for _ in range(times):
            self.page.keyboard.press(keys)
            self.page.wait_for_timeout(40)
        self._log("key", target=what or None, keys=keys, presses=times)
        self.page.wait_for_timeout(100)

    def choose_file(self, open_with, files, what: str = ""):
        """Open a file dialog with an action (a callable that clicks, e.g. lambda: r.click_text("Import")),
        and pick files in it, as a person picks them in the system's dialog."""
        files = [str(Path(f).resolve()) for f in ([files] if isinstance(files, (str, os.PathLike)) else files)]
        with self.page.expect_file_chooser(timeout=6000) as fc:
            open_with()
        fc.value.set_files(files)
        self._log("choose_file", target=what or None, files=[Path(f).name for f in files])
        self.page.wait_for_timeout(500)

    def expect_download(self, do, name: str | None = None, what: str = "") -> Path | None:
        """Run an action that should save a file (an export) and keep the file, as the browser's
        downloads folder would. Returns its path, or None when nothing was saved."""
        try:
            with self.page.expect_download(timeout=15000) as dl:
                do()
            d = dl.value
            path = self.downloads / (name or d.suggested_filename)
            d.save_as(str(path))
            self._log("download", target=what or None, file=str(path.relative_to(self.out)), suggested=d.suggested_filename)
            return path
        except PWTimeout:
            self._log("download", target=what or None, file=None, note="nothing was saved")
            return None

    # ---- counting ----------------------------------------------------------------
    def summary(self) -> dict:
        """Per task: success, clicks, keystrokes, seconds, wrong turns, guesses, help, shots."""
        out: dict[str, dict] = {}
        start: dict[str, float] = {}
        for ev in self.events:
            tid = ev.get("task")
            if ev["kind"] == "task_start":
                start[tid] = ev["t"]
                out[tid] = {"title": ev.get("target", ""), "success": None, "clicks": 0, "keys": 0, "drags": 0,
                            "wrong_turns": 0, "guesses": 0, "help": 0, "shots": 0, "seconds": None}
                continue
            if tid not in out:
                continue
            s = out[tid]
            k = ev["kind"]
            if k in ("click", "rightclick", "dblclick"):
                s["clicks"] += ev.get("presses", 1)
            elif k == "drag":
                s["clicks"] += 1
                s["drags"] += 1
            elif k == "type":
                s["keys"] += ev.get("keys", 0)
            elif k == "key":
                s["keys"] += ev.get("presses", 1)
            elif k == "wrong_turn":
                s["wrong_turns"] += 1
            elif k == "guess":
                s["guesses"] += 1
            elif k == "help":
                s["help"] += 1
            elif k == "shot":
                s["shots"] += 1
            elif k == "task_end":
                s["success"] = ev.get("success")
                s["seconds"] = round(ev["t"] - start.get(tid, ev["t"]), 1)
        # A person's time by the keystroke-level model (Card, Moran and Newell): each click a
        # decision, a point and a press (1.35 + 1.1 + 0.2 s), each key 0.28 s, a drag one more
        # point. The rig's own seconds include the driver's thinking between steps.
        for s in out.values():
            s["klm_seconds"] = round(s["clicks"] * 2.65 + s["keys"] * 0.28 + s["drags"] * 1.1, 1)
        return out

    def report(self):
        for tid, s in self.summary().items():
            print(f"{tid}: {s['success']} | clicks {s['clicks']} | keys {s['keys']} | {s['seconds']} s (KLM {s['klm_seconds']} s) | "
                  f"wrong turns {s['wrong_turns']} | guesses {s['guesses']} | help {s['help']} | shots {s['shots']}")
        if self.errors:
            print("page errors:", *self.errors[:5], sep="\n  ")


def smoke(args):
    """Open the app as a first-time visitor, look, open a menu with a real click, close it."""
    run = f"smoke-{args.width}x{args.height}-{args.theme}"
    with Rig(run=run, width=args.width, height=args.height, theme=args.theme, app=args.app,
             headless=not args.headed) as r:
        r.task("S0", "Rig check: first screen, a menu opened by a real click")
        r.shot("first-screen")
        r.click_role("button", "Plot", exact=True)
        r.shot("plot-menu-open")
        r.press("Escape", "close the menu")
        r.shot("menu-closed")
        r.end_task("yes")
        r.report()
        print("log:", r.logfile)
        print("shots:", r.shots)


if __name__ == "__main__":
    ap = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    ap.add_argument("--smoke", action="store_true", help="check the rig: open the app, screenshot, open a menu")
    ap.add_argument("--width", type=int, default=1366)
    ap.add_argument("--height", type=int, default=768)
    ap.add_argument("--theme", choices=["light", "dark"], default="light")
    ap.add_argument("--app", default=None, help="path to kurve.html (default: the repository's)")
    ap.add_argument("--headed", action="store_true")
    a = ap.parse_args()
    if a.smoke:
        smoke(a)
    else:
        ap.print_help()
