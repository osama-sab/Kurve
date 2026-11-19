"""qudi's confocal files for the bench (QUDI_SPEC Q.1), written as qudi's own code writes them.

The new format (qudi-iqo-modules, qudi ≥ 1.0): qudi-core's TextDataStorage (release v1.5.0,
`src/qudi/util/datastorage.py`: get_timestamp_filename, format_header, metadata_to_str_dict,
TextDataStorage.save_data and append_file) reproduced line for line with the standard library's
ConfigParser, as qudi-iqo-modules' ScanningDataLogic.save_scan calls it: the same metadata in the same
order, the same tag, column_headers='Image (columns is X, rows is Y)', the data indexed [x, y], floats
'.15e'. The classic format (qudi v0.x): its save_logic's text writer (`Ulm-IQO/qudi` master,
`logic/save_logic.py`, save_data, and `logic/confocal_logic.py`, _save_xy_data and _save_depth_data)
reproduced the same way, with np.savetxt as it calls it.

Writes tools/ref/qudi/*.dat and tools/ref/fixtures/qudi.json: for each file what Kurve must read from it
(the matrices, their positions in the units QUDI_SPEC decision 2 gives, every value, a 1D scan's curve,
the header fields). Usage: PYREF=… python3.13 -I tools/ref/qudi_fixtures.py
"""
import os, re, sys, json, datetime
from io import StringIO
from configparser import ConfigParser
from collections import OrderedDict
here = os.path.dirname(os.path.abspath(__file__))
if os.environ.get("PYREF"): sys.path.insert(0, os.environ["PYREF"])
import numpy as np

OUT = os.path.join(here, "qudi"); os.makedirs(OUT, exist_ok=True)
for f in os.listdir(OUT):
    if f.endswith(".dat"): os.remove(os.path.join(OUT, f))
rng = np.random.default_rng(19)
cases = []
UM = 1e6
def um(v, unit): return v * UM if unit == "m" else v

# ---- qudi-core v1.5.0's TextDataStorage, reproduced ---------------------------------------------------
def get_timestamp_filename(timestamp, nametag=None):
    datetime_str = timestamp.strftime('%Y%m%d-%H%M-%S')
    if nametag:
        nametag = nametag.strip(); nametag = re.sub(r'[\s]+', '_', nametag)
    return f'{datetime_str}_{nametag}' if nametag else datetime_str
def format_header(timestamp, metadata=None, column_dtypes=None, column_headers=None, comments='# ', delimiter='\t'):
    config = ConfigParser(comment_prefixes=None, delimiters=('=',))
    general_dict = {'timestamp': timestamp.isoformat()}
    if comments: general_dict['comments'] = repr(comments)
    if delimiter: general_dict['delimiter'] = repr(delimiter)
    if column_dtypes: general_dict['column_dtypes'] = ';;'.join(column_dtypes)
    if column_headers: general_dict['column_headers'] = repr(column_headers)
    config['General'] = general_dict
    if metadata: config['Metadata'] = {str(param): repr(value) for param, value in metadata.items()}
    buffer = StringIO(); config.write(buffer, space_around_delimiters=False); buffer.seek(0)
    header_lines = buffer.read().splitlines(); buffer.close()
    header_lines.append('---- END HEADER ----')
    line_sep = f'\n{comments}'
    return f'{comments}{line_sep.join(header_lines)}\n'
def text_save(data, metadata, nametag, timestamp, column_headers):
    is_1d = np.ndim(data) == 1
    first_row = data if is_1d else data[0]
    column_dtypes = ['float' for _ in first_row]
    filename = get_timestamp_filename(timestamp=timestamp, nametag=nametag) + '.dat'
    header = format_header(timestamp, metadata=metadata, column_dtypes=column_dtypes, column_headers=column_headers)
    row_fmt_str = '\t'.join('{:.15e}' for _ in first_row) + '\n'
    with open(os.path.join(OUT, filename), 'w') as file:
        file.write(header)
        if is_1d: file.write(row_fmt_str.format(*data))
        else:
            for data_row in data: file.write(row_fmt_str.format(*data_row))
    return filename

def iqo_scan(axes, units, ranges, res, channel, back=False, tag=None, hole=False, others=(("z", "m"),)):
    """ScanningDataLogic.save_scan for one channel: its metadata in its order, its tag, data[x, y]."""
    ts = datetime.datetime(2026, 11, 19, 12, 0, int(rng.integers(0, 60)))
    shape = tuple(res); data = rng.poisson(2000, size=shape).astype(float) + rng.uniform(0, 1, size=shape)
    if len(res) == 2: data += 5000 * np.exp(-np.add.outer((np.arange(res[0]) - res[0] / 3) ** 2, (np.arange(res[1]) - res[1] / 2) ** 2) / 4)
    if hole: data[-2:, ...] = np.nan          # a scan stopped early: the last lines not scanned
    p = {}
    for rg, n, u, ax in zip(ranges, res, units, axes):
        p[f"{ax} axis name"] = ax; p[f"{ax} axis unit"] = u; p[f"{ax} scan range"] = tuple(rg); p[f"{ax} axis resolution"] = n
        p[f"{ax} axis min"] = rg[0]; p[f"{ax} axis max"] = rg[1]
    p["pixel frequency"] = 500.0; target = {ax: 0.0 for ax in axes}; target.update({o: 1.5e-06 for o, _ in others})
    p["scanner target at start"] = target; p["measurement start"] = str(ts); p["coordinate transform info"] = None
    for o, u in others: p[f"{o} axis name"] = o; p[f"{o} axis unit"] = u
    t = tag or f"{len(axes)}D-scan with {''.join(axes)} axes from channel {channel}"
    if back: t = "back " + t
    name = text_save(data, p, t, ts, 'Image (columns is X, rows is Y)')
    fx = lambda k: np.linspace(um(ranges[k][0], units[k]), um(ranges[k][1], units[k]), res[k])
    unit = lambda k: "µm" if units[k] == "m" else units[k]
    z = lambda v: None if np.isnan(v) else float('{:.15e}'.format(v))   # what the file holds: 16 digits, as qudi-core writes them
    ch = channel if not tag else None
    if len(res) == 2:   # Kurve's matrix: X the first axis (columns), Y the second (rows)
        want = {"kind": "matrix", "nx": res[0], "ny": res[1], "x": fx(0).tolist(), "y": fx(1).tolist(), "xunit": unit(0), "yunit": unit(1),
                "xname": axes[0], "yname": axes[1], "z": [z(data[c, r]) for r in range(res[1]) for c in range(res[0])]}
    else:
        want = {"kind": "curve", "x": fx(0).tolist(), "y": [z(v) for v in data], "xunit": unit(0), "xname": axes[0]}
    want.update({"channel": ch, "back": back, "meta": {k: repr(v) for k, v in p.items()}})
    cases.append({"file": name, "gen": "iqo", "want": want})

iqo_scan(["x", "y"], ["m", "m"], [(-5e-06, 5e-06), (-2e-06, 3e-06)], [7, 5], "APD events")
iqo_scan(["x", "y"], ["m", "m"], [(-5e-06, 5e-06), (-2e-06, 3e-06)], [7, 5], "APD events", back=True)
iqo_scan(["x", "z"], ["m", "m"], [(1.25e-05, 1.6e-05), (-1e-06, 4e-06)], [6, 9], "SPCM 1", hole=True, others=(("y", "m"),))
iqo_scan(["x", "y"], ["V", "V"], [(-1.0, 1.0), (0.0, 0.5)], [4, 3], "photodiode", others=())
iqo_scan(["x"], ["m"], [(0.0, 2e-06)], [11], "APD events")
iqo_scan(["y", "x"], ["m", "m"], [(3e-06, 4e-06), (-1e-06, 0.0)], [5, 6], "APD events", tag="nv_search APD events")

# ---- classic qudi's save_logic, reproduced -----------------------------------------------------------------
def classic_save(label, data, parameters, timestamp, fmt='%.6e', delimiter='\t', poi=''):
    """save_logic.save_data's text path for one data dict, as confocal_logic calls it."""
    module_name = "ConfocalLogic"
    filename = timestamp.strftime('%Y%m%d-%H%M-%S' + '_' + label + '.dat')
    header = 'Saved Data from the class {0} on {1}.\n'.format(module_name, timestamp.strftime('%d.%m.%Y at %Hh%Mm%Ss'))
    header += '\nParameters:\n===========\n\n'
    if poi != '': header += 'Measured at POI: {0}\n'.format(poi)
    for entry, param in parameters.items():
        if isinstance(param, float): header += '{0}: {1:.16e}\n'.format(entry, param)
        else: header += '{0}: {1}\n'.format(entry, param)
    header += '\nData:\n=====\n'
    if len(data) != 1:
        identifier_str = ''; cols = []
        for keyname in data: identifier_str += keyname + delimiter; cols.append(data[keyname])
        arr = np.column_stack(cols); header += identifier_str
    else:
        key = list(data)[0]; arr = data[key]; header += key
    with open(os.path.join(OUT, filename), 'wb') as file:
        np.savetxt(file, arr, fmt=fmt, delimiter=delimiter, header=header, comments='#')
    return filename

def classic_scan(kind, xr, vr, nx, nv, channels, at, poi='', tilt=False):
    ts = datetime.datetime(2026, 11, 18, 9, 30, int(rng.integers(0, 60)))
    p = OrderedDict()
    p['X image min (m)'] = xr[0]; p['X image max (m)'] = xr[1]; p['X image range (m)'] = xr[1] - xr[0]
    V = 'Y' if kind == 'xy' else 'Z'
    p[f'{V} image min'] = vr[0]; p[f'{V} image max'] = vr[1]; p[f'{V} image range'] = vr[1] - vr[0]
    p['XY resolution (samples per range)'] = max(nx, nv)
    if kind == 'xy': p['XY Image at z position (m)'] = at
    else: p['Z resolution (samples per range)'] = nv; p['Depth Image at y position (m)'] = at
    p['Clock frequency of scanner (Hz)'] = 100.0; p['Return Slowness (Steps during retrace line)'] = 50
    X = np.linspace(xr[0], xr[1], nx); Vv = np.linspace(vr[0], vr[1], nv)
    img = np.zeros((nv, nx, 3 + len(channels)))
    img[:, :, 0] = X[None, :]
    if kind == 'xy': img[:, :, 1] = Vv[:, None]; img[:, :, 2] = at + (0.01 * img[:, :, 0] if tilt else 0)
    else: img[:, :, 1] = at; img[:, :, 2] = Vv[:, None]
    for n in range(len(channels)):
        img[:, :, 3 + n] = rng.poisson(3000, size=(nv, nx)) + 20000 * np.exp(-((X[None, :] - X[nx // 2]) ** 2 + (Vv[:, None] - Vv[nv // 3]) ** 2) / (2 * ((xr[1] - xr[0]) / 6) ** 2))
    files = []
    for n, ch in enumerate(channels):
        image_data = OrderedDict()
        image_data[f'Confocal pure {"XY" if kind == "xy" else "depth"} scan image data without axis.\n'
                   'The upper left entry represents the signal at the upper left pixel position.\n'
                   'A pixel-line in the image corresponds to a row '
                   'of entries where the Signal is in counts/s:'] = img[:, :, 3 + n]
        files.append(classic_save(f'confocal_{"xy" if kind == "xy" else "depth"}_image_{ch.replace("/", "")}', image_data, p, ts, poi=poi))
    data = OrderedDict()
    data['x position (m)'] = img[:, :, 0].flatten(); data['y position (m)'] = img[:, :, 1].flatten(); data['z position (m)'] = img[:, :, 2].flatten()
    for n, ch in enumerate(channels): data['count rate {0} (Hz)'.format(ch)] = img[:, :, 3 + n].flatten()
    dfile = classic_save(f'confocal_{"xy" if kind == "xy" else "depth"}_data', data, p, ts, poi=poi)
    # what Kurve reads: an image file's positions from the header's ranges (16 digits), a data file's from its own columns (%.6e)
    r6 = lambda a: np.array([float('%.6e' % v) for v in np.ravel(a)])
    vname = 'y position' if kind == 'xy' else 'z position'
    meta = {k: ('{0:.16e}'.format(v) if isinstance(v, float) else str(v)) for k, v in p.items()}
    if poi: meta = {'Measured at POI': poi, **meta}
    for n, ch in enumerate(channels):
        cases.append({"file": files[n], "gen": "classic", "want": {"kind": "matrix", "nx": nx, "ny": nv, "x": np.linspace(xr[0] * UM, xr[1] * UM, nx).tolist(),
            "y": np.linspace(vr[0] * UM, vr[1] * UM, nv).tolist(), "xunit": "µm", "yunit": "µm", "xname": "x position", "yname": vname,
            "z": r6(img[:, :, 3 + n]).tolist(), "channel": ch.replace("/", ""), "zunit": "c/s", "meta": meta}})
    sheets = [{"channel": ch, "zunit": "c/s", "z": r6(img[:, :, 3 + n]).tolist()} for n, ch in enumerate(channels)]
    third = r6(img[:, :, 2] if kind == 'xy' else img[:, :, 1])
    if np.any(third != third[0]): sheets.append({"channel": None, "zname": "z position" if kind == 'xy' else "y position", "zunit": "µm", "z": (third * UM).tolist()})
    cases.append({"file": dfile, "gen": "classic", "want": {"kind": "data", "nx": nx, "ny": nv, "x": (r6(X) * UM).tolist(), "y": (r6(Vv) * UM).tolist(),
        "xunit": "µm", "yunit": "µm", "xname": "x position", "yname": vname, "sheets": sheets, "const": None if np.any(third != third[0]) else float(third[0])}})

classic_scan('xy', (1.0e-06, 6.0e-06), (2.0e-06, 4.5e-06), 6, 4, ['/Dev1/Ctr1', '/Dev1/Ctr2'], 3.2e-06, poi='poi_20261118')
classic_scan('depth', (-2.0e-06, 2.0e-06), (-1.0e-06, 5.0e-06), 5, 7, ['/Dev1/Ctr1'], 0.0)
classic_scan('xy', (0.0, 1.0e-05), (0.0, 1.0e-05), 5, 5, ['/Dev1/Ctr1'], 1.0e-06, tilt=True)

json.dump(cases, open(os.path.join(here, "fixtures", "qudi.json"), "w"), indent=0)
print(len(cases), "cases;", len([f for f in os.listdir(OUT) if f.endswith(".dat")]), "files in", OUT)
