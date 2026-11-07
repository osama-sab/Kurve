"""Keep one browser open and take rig commands from a local port, a batch at a
time, so a walkthrough can look at each screenshot before deciding what to do
next (a person looks at the screen between actions; a script that runs to the
end does not).

    python tools/ux/repl.py --run T1-1366-light --width 1366 --height 768 \
        --theme light --app path/to/kurve.html --profile cold1366 --port 8765 &
    curl -s localhost:8765 --data-binary @- <<'EOF'
    r.click_role("button", "Plot", exact=True)
    r.shot("plot-menu")
    EOF
    curl -s localhost:8765 -d 'QUIT'

A batch is Python with `r` the open Rig (see drive.py). Only the rig's own
methods belong in a batch: they keep to what a person can perceive and do.
The reply is what the batch printed, or the error it raised.
"""
import argparse
import contextlib
import http.server
import io
import sys
import traceback
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from drive import Rig, NotOnScreen  # noqa: E402

ap = argparse.ArgumentParser()
ap.add_argument("--run", required=True)
ap.add_argument("--width", type=int, default=1366)
ap.add_argument("--height", type=int, default=768)
ap.add_argument("--theme", default="light")
ap.add_argument("--app", default=None)
ap.add_argument("--out", default=None)
ap.add_argument("--profile", default=None)
ap.add_argument("--port", type=int, default=8765)
a = ap.parse_args()

rig = Rig(run=a.run, width=a.width, height=a.height, theme=a.theme, app=a.app, out=a.out, profile=a.profile)
rig.__enter__()
ns = {"r": rig, "NotOnScreen": NotOnScreen, "Path": Path}
stop = False


class H(http.server.BaseHTTPRequestHandler):
    def log_message(self, *x):
        pass

    def do_POST(self):
        global stop
        code = self.rfile.read(int(self.headers.get("content-length", 0))).decode("utf-8")
        buf = io.StringIO()
        if code.strip() == "QUIT":
            stop = True
            buf.write("closing\n")
        else:
            with contextlib.redirect_stdout(buf):
                try:
                    exec(compile(code, "<batch>", "exec"), ns)
                except NotOnScreen as e:
                    print(f"NOT ON SCREEN: {e}")
                except Exception:
                    print(traceback.format_exc(limit=3))
            if rig.errors:
                buf.write("PAGE ERRORS: " + " | ".join(rig.errors[-3:]) + "\n")
        out = buf.getvalue().encode("utf-8")
        self.send_response(200)
        self.send_header("content-type", "text/plain; charset=utf-8")
        self.send_header("content-length", str(len(out)))
        self.end_headers()
        self.wfile.write(out)


srv = http.server.HTTPServer(("127.0.0.1", a.port), H)
print(f"ready on {a.port}: {rig.url}", flush=True)
while not stop:
    srv.handle_request()
rig.report()
rig.__exit__(None, None, None)
