using System;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Imaging;
using System.IO;
using System.Runtime.InteropServices;

namespace WolfGuard {
  // Binary stdin/stdout only. This process never opens a window or captures input.
  public static class DesktopEncoder {
    static bool ReadFrame(Stream input, byte[] buffer, bool allowEnd) {
      int offset = 0;
      while (offset < buffer.Length) {
        int count = input.Read(buffer, offset, buffer.Length - offset);
        if (count == 0) { if (allowEnd && offset == 0) return false; throw new EndOfStreamException(); }
        offset += count;
      }
      return true;
    }
    public static int Run() {
      try {
        using (Stream input = Console.OpenStandardInput()) using (Stream output = Console.OpenStandardOutput()) {
          ImageCodecInfo jpeg = null;
          foreach (ImageCodecInfo codec in ImageCodecInfo.GetImageEncoders()) if (codec.MimeType == "image/jpeg") jpeg = codec;
          if (jpeg == null) return 1;
          byte[] header = new byte[8];
          while (ReadFrame(input, header, true)) {
            int width = BitConverter.ToInt32(header, 0), height = BitConverter.ToInt32(header, 4);
            if (width < 1 || height < 1 || width > 8192 || height > 8192 || (long)width * height > 32000000) return 1;
            byte[] pixels = new byte[checked(width * height * 4)]; ReadFrame(input, pixels, false);
            double scale = Math.Min(1, Math.Min(1600.0 / width, 1000.0 / height));
            int targetWidth = Math.Max(1, (int)(width * scale)), targetHeight = Math.Max(1, (int)(height * scale));
            using (Bitmap source = new Bitmap(width, height, PixelFormat.Format32bppRgb)) {
              BitmapData data = source.LockBits(new Rectangle(0, 0, width, height), ImageLockMode.WriteOnly, PixelFormat.Format32bppRgb);
              try { Marshal.Copy(pixels, 0, data.Scan0, pixels.Length); } finally { source.UnlockBits(data); }
              using (Bitmap target = new Bitmap(targetWidth, targetHeight, PixelFormat.Format24bppRgb)) {
                using (Graphics graphics = Graphics.FromImage(target)) {
                  graphics.InterpolationMode = InterpolationMode.Bilinear;
                  graphics.DrawImage(source, new Rectangle(0, 0, targetWidth, targetHeight));
                }
                using (EncoderParameters parameters = new EncoderParameters(1)) using (MemoryStream encoded = new MemoryStream()) {
                  parameters.Param[0] = new EncoderParameter(System.Drawing.Imaging.Encoder.Quality, 50L);
                  target.Save(encoded, jpeg, parameters);
                  if (encoded.Length > 470000) {
                    parameters.Param[0].Dispose(); parameters.Param[0] = new EncoderParameter(System.Drawing.Imaging.Encoder.Quality, 30L);
                    encoded.SetLength(0); target.Save(encoded, jpeg, parameters);
                  }
                  if (encoded.Length > 480000) return 1;
                  using (BinaryWriter writer = new BinaryWriter(output, System.Text.Encoding.UTF8, true)) {
                    writer.Write(targetWidth); writer.Write(targetHeight); writer.Write((int)encoded.Length);
                    encoded.Position = 0; encoded.CopyTo(output); writer.Flush();
                  }
                }
              }
            }
          }
        }
        return 0;
      } catch { return 1; }
    }
  }
}
