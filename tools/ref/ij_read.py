"""Reads the TIFFs Kurve wrote for ImageJ (tools/ref/ij_fixtures.mjs), two ways (ux/spec/QUDI_SPEC.md, slice Q.2):

  * Pillow, an independent TIFF reader: the size, the mode (32-bit float), every pixel's value, and the tags as written
    (ImageDescription, XResolution and YResolution as rationals, ResolutionUnit, SampleFormat);
  * ImageJ's own reading of them, its arithmetic written out from ImageJ 1.54f's source (ij/io/TiffDecoder.java,
    ij/io/FileOpener.java, ij/measure/Calibration.java): the pixel size 1.0/(n/d) of each rational, the description read
    as java.util.Properties, the unit sanitised, and each pixel's calibrated centre, getX(x + 0.5) and getY(y + 0.5,
    height) with inverty. Java's doubles and Python's are the same IEEE arithmetic, evaluated in the same order.

ImageJ itself is not run here (this environment may not run its jar); tools/ref/ij/IJRef.java prints the same readout
from ImageJ where it can be run, for comparison.

    python3.13 -I tools/ref/ij_read.py DIR      prints a JSON object {file: readout} for every .tif in DIR
"""
import json, math, os, sys
from array import array
from PIL import Image

def jprops(text):
    """java.util.Properties.load on a string: key, then '=' or ':' or white space, then the value; backslash escapes."""
    out = {}
    for raw in text.replace("\r\n", "\n").replace("\r", "\n").split("\n"):
        line = raw.lstrip(" \t\f")
        if not line or line[0] in "#!":
            continue
        def unesc(s):
            o, i = [], 0
            while i < len(s):
                c = s[i]
                if c == "\\" and i + 1 < len(s):
                    n = s[i + 1]
                    if n == "u" and i + 6 <= len(s):
                        o.append(chr(int(s[i + 2:i + 6], 16))); i += 6; continue
                    o.append({"t": "\t", "n": "\n", "r": "\r", "f": "\f"}.get(n, n)); i += 2; continue
                o.append(c); i += 1
            return "".join(o)
        k, i = 0, 0
        while i < len(line):
            c = line[i]
            if c == "\\":
                i += 2; continue
            if c in "=: \t\f":
                break
            i += 1
        key, rest = line[:i], line[i:]
        rest = rest.lstrip(" \t\f")
        if rest[:1] in ("=", ":"):
            rest = rest[1:].lstrip(" \t\f")
        out[unesc(key)] = unesc(rest)
    return out

def sanitize(unit):      # Calibration.sanitizeUnit
    if unit is None or unit == "":
        return "pixel"
    if unit == "um":
        return "µm"
    if unit == "A":
        return "Å"
    return unit

def jdouble(props, key):  # FileOpener.getDouble: Double.valueOf, 0.0 when missing or not a number
    s = props.get(key)
    try:
        return float(s) if s is not None else 0.0
    except ValueError:
        return 0.0

def read(path):
    im = Image.open(path)
    tags = im.tag_v2
    w, h = im.size
    desc = tags.get(270, "")
    if isinstance(desc, bytes):
        desc = desc.decode("latin-1")
    desc = desc.rstrip("\x00")
    xr, yr = tags.get(282), tags.get(283)
    rat = lambda r: [int(r.numerator), int(r.denominator)] if r is not None else None
    # the pixels as Pillow decoded them (mode F: 32-bit floats in the machine's order); NaN null, infinities as strings
    vals = [None if math.isnan(v) else ("Infinity" if v == math.inf else "-Infinity" if v == -math.inf else v) for v in array("f", im.tobytes())]
    out = {"pil": {"mode": im.mode, "w": w, "h": h, "desc": desc, "xres": rat(xr), "yres": rat(yr),
                   "resunit": tags.get(296), "format": tags.get(339), "bits": tags.get(258), "z": vals}}
    # ImageJ: TiffDecoder (rational → pixel size), FileOpener.decodeDescriptionString and setCalibration, Calibration
    if not desc.startswith("ImageJ"):
        out["ij"] = {"fail": "not an ImageJ description"}
        return out
    props = jprops(desc)
    pw = 1.0 / (xr.numerator / xr.denominator) if xr is not None and xr.denominator else 1.0
    ph = 1.0 / (yr.numerator / yr.denominator) if yr is not None and yr.denominator else pw
    unit = sanitize(props.get("unit", ""))
    yunit = sanitize(props["yunit"]) if props.get("yunit") else unit
    xo, yo = jdouble(props, "xorigin"), jdouble(props, "yorigin")
    inv = props.get("inverty", "false") == "true"
    cx = [(x + 0.5 - xo) * pw for x in range(w)]
    def gety(y):
        if inv:
            return (yo - y) * ph if yo != 0.0 else (h - y - 1) * ph
        return (y - yo) * ph
    cy = [gety(y + 0.5) for y in range(h)]
    out["ij"] = {"pw": pw, "ph": ph, "unit": unit, "yunit": yunit, "vunit": props.get("vunit"), "xo": xo, "yo": yo, "inv": inv,
                 "min": jdouble(props, "min"), "max": jdouble(props, "max"), "name": props.get("name"), "cx": cx, "cy": cy}
    return out

if __name__ == "__main__":
    d = sys.argv[1]
    print(json.dumps({f: read(os.path.join(d, f)) for f in sorted(os.listdir(d)) if f.endswith(".tif")}))
