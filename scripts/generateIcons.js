import fs from 'fs';
import path from 'path';
import { PNG } from 'pngjs';

const publicDir = path.resolve(process.cwd(), 'public');
const logoPath = path.join(publicDir, 'mb-logo.png');

function createIcon(size, isMaskable = false) {
  const png = new PNG({ width: size, height: size });
  const logo = PNG.sync.read(fs.readFileSync(logoPath));
  const maxLogoWidth = size * (isMaskable ? 0.52 : 0.64);
  const maxLogoHeight = size * (isMaskable ? 0.72 : 0.82);
  const scale = Math.min(maxLogoWidth / logo.width, maxLogoHeight / logo.height);
  const logoWidth = Math.max(1, Math.round(logo.width * scale));
  const logoHeight = Math.max(1, Math.round(logo.height * scale));
  const offsetX = Math.floor((size - logoWidth) / 2);
  const offsetY = Math.floor((size - logoHeight) / 2);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (size * y + x) << 2;
      png.data[idx] = 15;
      png.data[idx + 1] = 23;
      png.data[idx + 2] = 42;
      png.data[idx + 3] = 255;

      const sourceX = Math.floor((x - offsetX) / scale);
      const sourceY = Math.floor((y - offsetY) / scale);
      if (sourceX < 0 || sourceX >= logo.width || sourceY < 0 || sourceY >= logo.height) continue;

      const sourceIdx = (logo.width * sourceY + sourceX) << 2;
      const alpha = logo.data[sourceIdx + 3] / 255;
      if (alpha === 0) continue;
      const backgroundAlpha = 1 - alpha;
      png.data[idx] = Math.round(logo.data[sourceIdx] * alpha + png.data[idx] * backgroundAlpha);
      png.data[idx + 1] = Math.round(logo.data[sourceIdx + 1] * alpha + png.data[idx + 1] * backgroundAlpha);
      png.data[idx + 2] = Math.round(logo.data[sourceIdx + 2] * alpha + png.data[idx + 2] * backgroundAlpha);
    }
  }

  return PNG.sync.write(png);
}

console.log('Gerando ícones PWA...');
fs.writeFileSync(path.join(publicDir, 'pwa-192x192.png'), createIcon(192, false));
fs.writeFileSync(path.join(publicDir, 'pwa-512x512.png'), createIcon(512, false));
fs.writeFileSync(path.join(publicDir, 'pwa-maskable-512x512.png'), createIcon(512, true));
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), createIcon(180, false));
fs.writeFileSync(path.join(publicDir, 'favicon.ico'), createIcon(64, false));

console.log('Ícones PWA gerados com sucesso na pasta public/');
