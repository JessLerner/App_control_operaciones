/**
 * Utilidades de formato financiero y validación para el Parte Diario de Ventas
 */

/**
 * Formatea un número a formato de moneda con signo $ y separador de miles.
 * Ej: 245000 -> "$ 245.000"
 */
export function formatCurrency(value: number | string | undefined | null): string {
  if (value === undefined || value === null || value === '') return '';
  const num = typeof value === 'number' ? value : parseFloat(String(value).replace(/[^0-9.-]+/g, ''));
  if (isNaN(num)) return '';

  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  }).format(num);
}

/**
 * Convierte un texto con caracteres de moneda a número puro.
 * Ej: "$ 245.000" -> 245000
 */
export function parseCurrencyInput(text: string): number {
  if (!text) return 0;
  // Limpia cualquier caracter no numérico
  const clean = text.replace(/[^0-9]/g, '');
  const parsed = parseInt(clean, 10);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Formatea el número a medida que el usuario tipea (con separador de miles sin el signo para inputs o con prefijo)
 */
export function formatNumberWithThousands(val: number | string): string {
  if (val === '' || val === null || val === undefined) return '';
  const clean = String(val).replace(/[^0-9]/g, '');
  if (!clean) return '';
  const num = parseInt(clean, 10);
  if (isNaN(num)) return '';
  return new Intl.NumberFormat('es-AR').format(num);
}

/**
 * Genera un ID de venta único y secuencial
 */
export function generateSaleId(): string {
  const now = new Date();
  const year = String(now.getFullYear()).slice(-2);
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  return `VTA-${year}${month}${day}-${randomSuffix}`;
}

/**
 * Obtiene la fecha actual en formato YYYY-MM-DD para el input type="date"
 */
export function getTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Formatea una fecha ISO a legible DD/MM/AAAA
 */
export function formatDateLegible(dateStr: string): string {
  if (!dateStr) return '';
  try {
    const [year, month, day] = dateStr.split('-');
    if (year && month && day) {
      return `${day}/${month}/${year}`;
    }
    return dateStr;
  } catch {
    return dateStr;
  }
}
