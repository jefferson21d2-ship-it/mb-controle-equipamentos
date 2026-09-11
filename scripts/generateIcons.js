import fs from 'fs';
import path from 'path';
import { PNG } from 'pngjs';

function createIcon(size, isMaskable = false) {
  const png = new PNG({ width: size, height: size });
  const center = size / 2;
  const radius = size * (isMaskable ? 0.38 : 0.46);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (size * y + x) << 2;
      const dx = x - center;
      const dy = y - center;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Fundo Slate Escuro #0f172a
      let r = 15;
      let g = 23;
      let b = 42;
      let a = 255;

      // Anel circular externo
      if (Math.abs(dist - radius) < size * 0.02) {
        // Azul claro
        r = 56;
        g = 189;
        b = 248;
      }

      // Triângulo do Prisma / Drone
      // Vértices normalizados
      const ny = (y - (center - radius * 0.5)) / (radius * 1.3);
      const nx = (x - center) / (radius * 0.8);
      if (ny >= 0 && ny <= 1 && Math.abs(nx) <= (ny * 0.85)) {
        // Dentro do prisma - Gradiente Azul Nobre
        r = Math.floor(37 + ny * 30);
        g = Math.floor(99 + ny * 50);
        b = Math.floor(235);
      }

      // Núcleo central
      if (dist < size * 0.08) {
        // Branco puro central
        r = 255;
        g = 255;
        b = 255;
      } else if (dist < size * 0.12) {
        // Anel âmbar
        r = 245;
        g = 158;
        b = 11;
      }

      // Cruz do retículo
      if ((Math.abs(dx) < size * 0.015 && dist < radius * 0.9 && dist > size * 0.12) ||
          (Math.abs(dy) < size * 0.015 && dist < radius * 0.9 && dist > size * 0.12)) {
        r = 56;
        g = 189;
        b = 248;
      }

      png.data[idx] = r;
      png.data[idx + 1] = g;
      png.data[idx + 2] = b;
      png.data[idx + 3] = a;
    }
  }

  return PNG.sync.write(png);
}

const publicDir = path.resolve(process.cwd(), 'public');

console.log('Gerando ícones PWA...');
fs.writeFileSync(path.join(publicDir, 'pwa-192x192.png'), createIcon(192, false));
fs.writeFileSync(path.join(publicDir, 'pwa-512x512.png'), createIcon(512, false));
fs.writeFileSync(path.join(publicDir, 'pwa-maskable-512x512.png'), createIcon(512, true));
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), createIcon(180, false));
fs.writeFileSync(path.join(publicDir, 'favicon.ico'), createIcon(64, false));

console.log('Ícones PWA gerados com sucesso na pasta public/');
