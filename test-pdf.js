if (typeof global !== "undefined" && !global.DOMMatrix) {
  global.DOMMatrix = class DOMMatrix {} as any;
}
if (typeof global !== "undefined" && !global.ImageData) {
  global.ImageData = class ImageData {} as any;
}
if (typeof global !== "undefined" && !global.Path2D) {
  global.Path2D = class Path2D {} as any;
}
const pdfParse = require('pdf-parse');
const fs = require('fs');

async function test() {
  try {
    const buffer = Buffer.from("%PDF-1.4...", "utf8");
    await pdfParse(buffer);
  } catch (e) {
    console.log("Error:", e.message);
  }
}
test();
