declare module 'qrcode' {
  export interface QRCodeToStringOptions {
    type: 'svg';
    errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
    margin?: number;
    color?: {
      dark?: string;
      light?: string;
    };
  }

  const QRCode: {
    toString(data: string, options: QRCodeToStringOptions): Promise<string>;
  };

  export default QRCode;
}
