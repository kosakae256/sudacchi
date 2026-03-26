import puppeteer from 'puppeteer';
import { PDFDocument } from 'pdf-lib';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const htmlPath = path.join(__dirname, 'slide.html');
const pdfPath = path.join(__dirname, 'slide.pdf');

const browser = await puppeteer.launch({
  headless: 'new',
  args: ['--no-sandbox', '--font-render-hinting=none'],
});

const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 720, deviceScaleFactor: 2 });
await page.goto(`file://${htmlPath}`, { waitUntil: 'networkidle0', timeout: 30000 });

const slideCount = await page.evaluate(() => document.querySelectorAll('.slide').length);
console.log(`Found ${slideCount} slides`);

// Create PDF from individual slide PNGs using pdf-lib
const pdfDoc = await PDFDocument.create();

for (let i = 0; i < slideCount; i++) {
  const slideEl = await page.evaluateHandle((idx) => document.querySelectorAll('.slide')[idx], i);
  const pngBuf = await slideEl.screenshot({ type: 'png' });

  const pngImage = await pdfDoc.embedPng(pngBuf);
  // 1280x720 at 72dpi → points
  const pdfPage = pdfDoc.addPage([1280, 720]);
  pdfPage.drawImage(pngImage, { x: 0, y: 0, width: 1280, height: 720 });

  console.log(`Slide ${i + 1}/${slideCount}`);
}

const pdfBytes = await pdfDoc.save();
fs.writeFileSync(pdfPath, pdfBytes);
await browser.close();
console.log('Done:', pdfPath);
