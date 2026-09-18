export type MarcaAuto =
  | 'RENAULT'
  | 'PEUGEOT'
  | 'JEEP'
  | 'LEAPMOTOR'
  | 'FIAT'
  | 'CITROEN';

export interface ModeloPlanItem {
  marca: MarcaAuto;
  modelo: string;
  tipoPlan: string; // ej: "100%", "80/20", "70/30"
  valorCuota1: number; // Valor sugerido
}

export interface EquipoVenta {
  supervisor: string; // Fila 18 cabecera (Supervisor / Equipo)
  vendedores: string[]; // Vendedores listados debajo
}

export interface ReferenceData {
  modelosYPrecios: ModeloPlanItem[];
  equiposDeVenta: EquipoVenta[];
  origenesDatos: string[]; // Columna AGP de Origen_datos
  suscripcionesExistentes?: string[]; // Para validación de clave única N° Suscripción
  lastUpdated?: string;
  isCustomUrl?: boolean;
}

export type SenaOCompleta = 'Completa' | 'Seña' | 'Descuento Aprobado';
export type EntregaUsado = 'Sí' | 'No';

export const AUTORIZADORES_DESCUENTO = [
  'Matias Gonzalez',
  'Florencia Rodriguez',
  'Fabricio Gonzalez',
  'Antonella Villarino',
  'Leonardo Soldano',
  'Otro',
] as const;

export type AutorizadorDescuento = (typeof AUTORIZADORES_DESCUENTO)[number];

export interface VentaFormData {
  fecha: string; // AAAA-MM-DD
  cliente: string;
  numSuscripcion: string; // PRIMARY KEY
  marca: MarcaAuto | '';
  modelo: string;
  tipoPlan: string;
  senaOCompleta: SenaOCompleta;
  autorizoDescuento?: string; // Obligatorio si senaOCompleta === 'Descuento Aprobado'
  valorCuota1: number | ''; // 100% automático, solo lectura
  montoCobrado: number | '';
  entregaUsado: EntregaUsado; // Default: 'Sí'
  modeloUsado?: string;
  anoUsado?: number | '';
  valorInfoauto?: number | '';
  valorToma?: number | '';
  equipoVenta: string;
  vendedor: string;
  origenDato: string;
}

export interface VentaRecord extends VentaFormData {
  timestamp: number;
  syncStatus: 'synced' | 'pending' | 'error';
  errorMessage?: string;
}

export interface SheetsConfig {
  webAppUrl: string;
  spreadsheetId?: string;
  sheetNameDestino: string;
}
