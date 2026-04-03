declare module "pdf-parse/lib/pdf-parse.js" {
  type PdfParseResult = {
    text?: string;
    numpages?: number;
  };

  const pdfParse: (
    dataBuffer: Buffer,
    options?: Record<string, unknown>
  ) => Promise<PdfParseResult>;

  export default pdfParse;
}
