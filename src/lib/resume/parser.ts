

export async function parsePdfToText(buffer: Buffer): Promise<{ text: string; pageCount: number }> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfParse = require('pdf-parse')
    const data = await pdfParse(buffer)
    
    // Basic cleaning of the extracted text
    const text = data.text
      .replace(/\n\s*\n/g, '\n\n') // Normalize multiple newlines
      .replace(/[^\S\n]+/g, ' ') // Normalize spaces
      .trim()

    return {
      text,
      pageCount: data.numpages,
    }
  } catch (error) {
    console.error('Error parsing PDF:', error)
    throw new Error('Failed to extract text from PDF.')
  }
}
