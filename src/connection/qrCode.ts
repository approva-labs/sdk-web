import QRCode from "qrcode";

export async function generateQrCode(value: string): Promise<string> {
  return QRCode.toDataURL(value, {
    width: 320,
    margin: 2,
  });
}
