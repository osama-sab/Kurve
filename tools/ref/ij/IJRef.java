// What ImageJ reads and measures, for Kurve's bench (ux/spec/QUDI_SPEC.md). Run by tools/ref/ij_fixtures.mjs with ImageJ's
// ij.jar on the class path (ImageJ 1.54f, headless). Reads job lines on stdin and writes one JSON line each on stdout:
//   open <path>              the image as ImageJ opens it: size, bit depth, calibration, every value, every pixel's centre
// Numbers are written by Double.toString (shortest round trip), NaN as null.
import ij.IJ;
import ij.ImagePlus;
import ij.measure.Calibration;
import ij.process.ImageProcessor;
import java.io.BufferedReader;
import java.io.InputStreamReader;

public class IJRef {
  static String num(double v) { return Double.isNaN(v) || Double.isInfinite(v) ? "null" : Double.toString(v); }
  static String str(String s) { if (s == null) return "null"; StringBuilder b = new StringBuilder("\"");
    for (char c : s.toCharArray()) { if (c == '"' || c == '\\') b.append('\\').append(c); else if (c < 0x20 || c > 0x7e) b.append(String.format("\\u%04x", (int) c)); else b.append(c); }
    return b.append('"').toString(); }

  static String open(String path) {
    ImagePlus imp = IJ.openImage(path); if (imp == null) return "{\"fail\":\"ImageJ did not open it\"}";
    ImageProcessor ip = imp.getProcessor(); Calibration cal = imp.getCalibration(); int w = imp.getWidth(), h = imp.getHeight();
    StringBuilder b = new StringBuilder("{");
    b.append("\"w\":").append(w).append(",\"h\":").append(h).append(",\"bits\":").append(imp.getBitDepth());
    b.append(",\"pw\":").append(num(cal.pixelWidth)).append(",\"ph\":").append(num(cal.pixelHeight));
    b.append(",\"unit\":").append(str(cal.getUnit())).append(",\"yunit\":").append(str(cal.getYUnit())).append(",\"vunit\":").append(str(cal.getValueUnit()));
    b.append(",\"xo\":").append(num(cal.xOrigin)).append(",\"yo\":").append(num(cal.yOrigin)).append(",\"inv\":").append(cal.getInvertY());
    b.append(",\"scaled\":").append(cal.scaled()).append(",\"min\":").append(num(ip.getMin())).append(",\"max\":").append(num(ip.getMax()));
    b.append(",\"title\":").append(str(imp.getTitle()));
    b.append(",\"z\":["); for (int y = 0; y < h; y++) for (int x = 0; x < w; x++) { if (x > 0 || y > 0) b.append(','); b.append(num(ip.getf(x, y))); } b.append(']');
    b.append(",\"cx\":["); for (int x = 0; x < w; x++) { if (x > 0) b.append(','); b.append(num(cal.getX(x + 0.5))); } b.append(']');
    b.append(",\"cy\":["); for (int y = 0; y < h; y++) { if (y > 0) b.append(','); b.append(num(cal.getY(y + 0.5, h))); } b.append(']');
    return b.append('}').toString(); }

  public static void main(String[] args) throws Exception {
    BufferedReader in = new BufferedReader(new InputStreamReader(System.in, "UTF-8")); String line;
    while ((line = in.readLine()) != null) { line = line.trim(); if (line.isEmpty()) continue;
      String out; try { int sp = line.indexOf(' '); String cmd = sp < 0 ? line : line.substring(0, sp), arg = sp < 0 ? "" : line.substring(sp + 1);
        if (cmd.equals("open")) out = open(arg); else out = "{\"fail\":\"unknown job " + cmd + "\"}"; }
      catch (Throwable e) { out = "{\"fail\":" + str(e.toString()) + "}"; }
      System.out.println(out); System.out.flush(); } }
}
