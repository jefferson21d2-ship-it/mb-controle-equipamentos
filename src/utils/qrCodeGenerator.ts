import QRCode from 'qrcode';

export interface QRCodeData {
  dataUrl: string;
  svg: string;
}

/**
 * Gera QR Code em DataURL (PNG) ou SVG a partir do código do equipamento.
 * Conforme especificado no requisito, o conteúdo do QR Code é EXCLUSIVAMENTE
 * o Código do Equipamento (ex: MB-DRN-001, MB-GNSS-002, MB-BAT-005).
 */
export async function generateEquipamentoQRCode(
  codigo: string,
  options?: {
    width?: number;
    margin?: number;
    darkColor?: string;
    lightColor?: string;
  }
): Promise<string> {
  const cleanCode = codigo.trim().toUpperCase();
  const width = options?.width || 280;
  const margin = options?.margin !== undefined ? options.margin : 1;
  const darkColor = options?.darkColor || '#000000';
  const lightColor = options?.lightColor || '#ffffff';

  try {
    const dataUrl = await QRCode.toDataURL(cleanCode, {
      width,
      margin,
      errorCorrectionLevel: 'M',
      color: {
        dark: darkColor,
        light: lightColor,
      },
    });
    return dataUrl;
  } catch (err) {
    console.error('Erro ao gerar QR Code para', codigo, err);
    throw err;
  }
}

/**
 * Gera QR Code em formato SVG (vetorial, ideal para impressão em alta resolução de etiquetas).
 */
export async function generateEquipamentoQRCodeSVG(
  codigo: string,
  options?: {
    margin?: number;
    darkColor?: string;
    lightColor?: string;
  }
): Promise<string> {
  const cleanCode = codigo.trim().toUpperCase();
  const margin = options?.margin !== undefined ? options.margin : 1;
  const darkColor = options?.darkColor || '#000000';
  const lightColor = options?.lightColor || '#ffffff';

  try {
    const svg = await QRCode.toString(cleanCode, {
      type: 'svg',
      margin,
      errorCorrectionLevel: 'M',
      color: {
        dark: darkColor,
        light: lightColor,
      },
    });
    return svg;
  } catch (err) {
    console.error('Erro ao gerar SVG do QR Code para', codigo, err);
    throw err;
  }
}

/**
 * Extrai o código MB de qualquer string lida (seja direto "MB-BAT-005",
 * ou um link contendo "?code=MB-BAT-005", ou espaços adicionais).
 */
export function extractCodigoMB(rawText: string): string {
  if (!rawText) return '';
  const text = rawText.trim();

  // Caso seja direto MB-...
  const directMatch = text.match(/MB-[A-Z0-9-]+/i);
  if (directMatch) {
    return directMatch[0].toUpperCase();
  }

  // Caso seja código simples
  return text.toUpperCase();
}

/**
 * Valida se o formato do código é compatível com o padrão M&B
 */
export function isValidCodigoMB(code: string): boolean {
  if (!code) return false;
  const clean = code.trim().toUpperCase();
  return /^MB-[A-Z0-9]+(-[A-Z0-9]+)*$/.test(clean);
}
