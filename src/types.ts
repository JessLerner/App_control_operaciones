export type MarcaAuto =
  | 'RENAULT'
  | 'PEUGEOT'
  | 'JEEP'
  | 'LEAPMOTOR'
  | 'FIAT'
  | 'CITROEN';

export interface ModeloPlanItem {
  marca: MarcaAuto;
  // Campo de agrupación que llega desde Modelos_y_Precios. No se deduce en el formulario.
  vehiculo?: string;
  modelo: string;
  tipoPlan: string; // ej: "100%", "80/20", "70/30"
  valorCuota1: number; // Valor sugerido
  normal1?: number;
  normal3?: number;
  ultra?: number;
  cuota1?: number; // Importe de fábrica, independiente de las modalidades comerciales
  // Alias de transporte legado. Debe contener exactamente cuota1, nunca un precio comercial.
  ctaFabrica?: number;
  valorAuto?: number; // Valor del vehículo
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
  usadoPricing?: UsadoPricingConfig;
}

export interface UsadoPricingConfig {
  anioCorte: number;
  descuentoHastaCorte: number;
  descuentoDesdeCorte: number;
}

export type SenaOCompleta = 'Completa' | 'Seña' | 'Descuento Aprobado';
// Valores nuevos persistidos en la columna existente "Normal/Ultra".
export type ModalidadCuota = 'normal_1' | 'normal_3' | 'ultra';
// Las filas anteriores no se migran: se conservan tal como fueron almacenadas.
export type ModalidadCuotaHistorica = ModalidadCuota | 'Normal' | 'Ultra' | '';
export type EntregaUsado = 'Sí' | 'No';
export type RespuestaSiNo = 'Sí' | 'No';

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
  vehiculo: string;
  modelo: string;
  tipoPlan: string;
  modalidadCuota: ModalidadCuota;
  senaOCompleta: SenaOCompleta;
  autorizoDescuento?: string; // Obligatorio si senaOCompleta === 'Descuento Aprobado'
  valorCuota1: number | ''; // 100% automático, solo lectura
  cuota1?: number | ''; // Importe de fábrica del catálogo
  ctaFabrica?: number | ''; // 100% automático de Modelos_y_Precios
  sobrepauta?: number | ''; // Monto Cobrado - Cta. Fábrica
  montoCobrado: number | '';
  entregaUsado: EntregaUsado; // Default: 'Sí'
  modeloUsado?: string;
  anoUsado?: number | '';
  valorInfoauto?: number | '';
  cotizacionSugerida?: number | '';
  valorAuto?: number | '';
  debitoAutomatico?: RespuestaSiNo;
  valorToma?: number | '';
  equipoVenta: string;
  vendedor: string;
  origenDato: string;
}

export interface VentaRecord extends Omit<VentaFormData, 'modalidadCuota'> {
  modalidadCuota: ModalidadCuotaHistorica;
  timestamp: number;
  syncStatus: 'synced' | 'pending' | 'error';
  errorMessage?: string;
}

export interface SheetsConfig {
  webAppUrl: string;
  spreadsheetId?: string;
  sheetNameDestino: string;
}
