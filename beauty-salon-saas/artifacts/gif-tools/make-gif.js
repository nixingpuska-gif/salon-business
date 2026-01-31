const fs = require('fs');
const path = require('path');
const GIFEncoder = require('gif-encoder-2');
const { PNG } = require('pngjs');

const base = 'C:\\Users\\Nicita\\beauty-salon-saas\\artifacts';
const frames = [
  'switch-1-en.png',
  'switch-2-ru.png',
  'switch-3-en.png',
].map(f => path.join(base, f));
const outPath = path.join(base, 'admin-panel-lang-switch.gif');

const firstPng = PNG.sync.read(fs.readFileSync(frames[0]));
const encoder = new GIFEncoder(firstPng.width, firstPng.height);
const writeStream = fs.createWriteStream(outPath);
encoder.createReadStream().pipe(writeStream);

encoder.start();
encoder.setRepeat(0);
encoder.setDelay(800);
encoder.setQuality(10);

for (const file of frames) {
  const png = PNG.sync.read(fs.readFileSync(file));
  encoder.addFrame(png.data);
}

encoder.finish();

writeStream.on('finish', () => {
  console.log('GIF saved to ' + outPath);
});
