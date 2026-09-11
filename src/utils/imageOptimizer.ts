/**
 * Utilitário profissional de Compressão e Otimização de Imagens para o M&B
 * Garante que fotografias tiradas em celulares modernos (8-48MP) sejam
 * redimensionadas e comprimidas antes do envio ao Google Drive e Sheets.
 * Reduz arquivos de ~5MB-15MB para ~200KB-600KB mantendo total nitidez
 * de plaquetas patrimoniais, números de série e etiquetas.
 */

export interface CompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number; // 0.1 a 1.0 (padrão 0.82)
  format?: 'image/jpeg' | 'image/webp';
}

export interface CompressedImageResult {
  blob: Blob;
  dataUrl: string; // Base64 com data prefix (para renderizar na tela)
  base64Pure: string; // Base64 puro sem prefixo (para enviar ao Apps Script / Drive)
  fileName: string;
  width: number;
  height: number;
  originalSize: number; // bytes
  compressedSize: number; // bytes
  mimeType: string;
}

/**
 * Gera nome seguro e padronizado para a fotografia do patrimônio
 * Exemplo: MB-GNSS-001_FOTO.jpg
 */
export function generatePhotoFileName(codigoEquipamento: string, customSuffix?: string): string {
  const cleanCode = (codigoEquipamento || 'EQUIP')
    .toUpperCase()
    .replace(/[^A-Z0-9_-]/g, '_');
  
  if (customSuffix) {
    return `${cleanCode}_FOTO_${customSuffix}.jpg`;
  }
  return `${cleanCode}_FOTO.jpg`;
}

/**
 * Redimensiona e comprime uma imagem (File, Blob ou DataURL)
 */
export async function compressAndResizeImage(
  source: File | Blob | string,
  codigoEquipamento: string,
  options: CompressionOptions = {}
): Promise<CompressedImageResult> {
  const {
    maxWidth = 1600,
    maxHeight = 1600,
    quality = 0.82,
    format = 'image/jpeg',
  } = options;

  let originalSize = 0;
  let imageSourceUrl = '';
  let shouldRevoke = false;

  if (typeof source === 'string') {
    imageSourceUrl = source;
    // Estimativa de tamanho para data URL
    originalSize = Math.round((source.length * 3) / 4);
  } else {
    originalSize = source.size;
    imageSourceUrl = URL.createObjectURL(source);
    shouldRevoke = true;
  }

  try {
    const img = await loadImage(imageSourceUrl);

    // Calcula dimensões preservando proporção
    let { width, height } = img;

    if (width > maxWidth || height > maxHeight) {
      const ratio = Math.min(maxWidth / width, maxHeight / height);
      width = Math.round(width * ratio);
      height = Math.round(height * ratio);
    }

    // Renderiza em Canvas de alta performance
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Não foi possível obter o contexto 2D do Canvas.');
    }

    // Melhora a interpolação para preservar texto em etiquetas
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // Fundo branco para garantir que transparências fiquem limpas em JPEG
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, width, height);

    ctx.drawImage(img, 0, 0, width, height);

    // Converte para Blob e DataUrl
    const dataUrl = canvas.toDataURL(format, quality);
    const base64Pure = dataUrl.split(',')[1] || '';

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (b) => {
          if (b) resolve(b);
          else reject(new Error('Erro ao converter Canvas para Blob'));
        },
        format,
        quality
      );
    });

    const fileName = generatePhotoFileName(codigoEquipamento);

    return {
      blob,
      dataUrl,
      base64Pure,
      fileName,
      width,
      height,
      originalSize,
      compressedSize: blob.size,
      mimeType: format,
    };
  } finally {
    if (shouldRevoke && imageSourceUrl) {
      URL.revokeObjectURL(imageSourceUrl);
    }
  }
}

/**
 * Rotaciona uma imagem em 90 graus no canvas
 */
export async function rotateImageDataUrl(
  dataUrl: string,
  degrees: 90 | 180 | 270 | -90 = 90
): Promise<string> {
  const img = await loadImage(dataUrl);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas context não disponível');

  const rads = (degrees * Math.PI) / 180;
  const isPerpendicular = Math.abs(degrees) === 90 || Math.abs(degrees) === 270;

  canvas.width = isPerpendicular ? img.height : img.width;
  canvas.height = isPerpendicular ? img.width : img.height;

  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate(rads);
  ctx.drawImage(img, -img.width / 2, -img.height / 2);

  return canvas.toDataURL('image/jpeg', 0.85);
}

/**
 * Carrega elemento Image a partir de uma URL ou DataURL
 */
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (err) => reject(new Error('Falha ao carregar a imagem: ' + String(err)));
    img.src = src;
  });
}

/**
 * Formata tamanho em KB ou MB amigável
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const dm = 1;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}
