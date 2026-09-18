import { ReferenceData, VentaFormData, VentaRecord, SheetsConfig } from '../types';
import { INITIAL_REFERENCE_DATA } from '../data/initialReferenceData';

const STORAGE_KEYS = {
  CONFIG: 'pdv_sheets_config_v1',
  REFERENCE: 'pdv_reference_data_v1',
  SALES_HISTORY: 'pdv_sales_history_v1',
};

export const DEFAULT_CONFIG: SheetsConfig = {
  webAppUrl: '',
  sheetNameDestino: 'ID Ventas',
};

export function getStoredConfig(): SheetsConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CONFIG);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Error leyendo config local:', e);
  }
  return DEFAULT_CONFIG;
}

export function saveStoredConfig(config: SheetsConfig): void {
  try {
    localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(config));
  } catch (e) {
    console.error('Error guardando config:', e);
  }
}

export function getStoredReferenceData(): ReferenceData {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.REFERENCE);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.modelosYPrecios && parsed.equiposDeVenta) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Error leyendo datos de referencia locales:', e);
  }
  return INITIAL_REFERENCE_DATA;
}

export function saveStoredReferenceData(data: ReferenceData): void {
  try {
    localStorage.setItem(STORAGE_KEYS.REFERENCE, JSON.stringify(data));
  } catch (e) {
    console.error('Error guardando datos de referencia:', e);
  }
}

export function getSalesHistory(): VentaRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SALES_HISTORY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Error leyendo historial:', e);
  }
  return [];
}

export function saveSalesHistory(sales: VentaRecord[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.SALES_HISTORY, JSON.stringify(sales));
  } catch (e) {
    console.error('Error guardando historial:', e);
  }
}

/**
 * Verifica si un N° de Suscripción ya existe en el historial local o en la base descargada
 */
export function checkSubscriptionExists(numSuscripcion: string): boolean {
  if (!numSuscripcion) return false;
  const cleanNum = numSuscripcion.trim().toLowerCase();
  
  // 1. Verificar en historial local
  const history = getSalesHistory();
  const existsInHistory = history.some(
    (h) => h.numSuscripcion.trim().toLowerCase() === cleanNum
  );
  if (existsInHistory) return true;

  // 2. Verificar en suscripciones sincronizadas de Sheets
  const refData = getStoredReferenceData();
  if (refData.suscripcionesExistentes && refData.suscripcionesExistentes.length > 0) {
    return refData.suscripcionesExistentes.some(
      (s) => String(s).trim().toLowerCase() === cleanNum
    );
  }

  return false;
}

/**
 * Consulta a la Google Apps Script Web App para sincronizar las 3 tablas de referencia
 * y la lista de suscripciones existentes (Primary Key)
 */
export async function fetchRemoteReferenceData(url: string): Promise<{ success: boolean; data?: ReferenceData; error?: string }> {
  if (!url || !url.startsWith('http')) {
    return { success: false, error: 'URL no configurada o inválida' };
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);

    const fetchUrl = url + (url.includes('?') ? '&' : '?') + 'action=getReference&t=' + Date.now();
    const res = await fetch(fetchUrl, {
      method: 'GET',
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }

    const json = await res.json();
    if (json.status === 'success' && json.data) {
      const refData: ReferenceData = {
        modelosYPrecios: json.data.modelosYPrecios || [],
        equiposDeVenta: json.data.equiposDeVenta || [],
        origenesDatos: json.data.origenesDatos || [],
        suscripcionesExistentes: json.data.suscripcionesExistentes || [],
        lastUpdated: new Date().toISOString(),
        isCustomUrl: true,
      };
      saveStoredReferenceData(refData);
      return { success: true, data: refData };
    } else {
      throw new Error(json.message || 'Estructura de respuesta no válida desde Google Sheets');
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, error: message };
  }
}

/**
 * Envía una venta a la hoja 'ID Ventas' en Google Sheets a través del Web App
 * Utiliza 'numSuscripcion' como PRIMARY KEY único e irrepetible
 */
export async function submitVentaRecord(
  formData: VentaFormData,
  isRetry: boolean = false
): Promise<{ success: boolean; numSuscripcion: string; syncedToRemote: boolean; message: string }> {
  const numSuscripcion = formData.numSuscripcion.trim();
  const config = getStoredConfig();

  // Validación de duplicados si no es reintento de sincronización del mismo ítem
  if (!isRetry && checkSubscriptionExists(numSuscripcion)) {
    return {
      success: false,
      numSuscripcion,
      syncedToRemote: false,
      message: `El N° de Suscripción "${numSuscripcion}" ya fue registrado previamente en la base de datos (Clave Duplicada).`,
    };
  }

  const record: VentaRecord = {
    ...formData,
    numSuscripcion,
    timestamp: Date.now(),
    syncStatus: 'pending',
  };

  // Guardar primero localmente en el dispositivo
  const history = getSalesHistory();
  const existingIndex = history.findIndex((h) => h.numSuscripcion === numSuscripcion);
  if (existingIndex >= 0) {
    history[existingIndex] = record;
  } else {
    history.unshift(record);
  }
  saveSalesHistory(history);

  // Agregar al listado de suscripciones conocidas
  const refData = getStoredReferenceData();
  const updatedSubs = new Set(refData.suscripcionesExistentes || []);
  updatedSubs.add(numSuscripcion);
  refData.suscripcionesExistentes = Array.from(updatedSubs);
  saveStoredReferenceData(refData);

  // Si no hay URL configurada, se guarda localmente
  if (!config.webAppUrl) {
    return {
      success: true,
      numSuscripcion,
      syncedToRemote: false,
      message: `Venta registrada en el dispositivo con clave única #${numSuscripcion} (Modo Local / Demo).`,
    };
  }

  // Intentar sincronización remota con Google Sheets
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    const payload = {
      numSuscripcion: record.numSuscripcion,
      fecha: record.fecha,
      cliente: record.cliente,
      marca: record.marca,
      modelo: record.modelo,
      tipoPlan: record.tipoPlan,
      senaOCompleta: record.senaOCompleta,
      autorizoDescuento: record.senaOCompleta === 'Descuento Aprobado' ? (record.autorizoDescuento || '') : '',
      valorCuota1: record.valorCuota1,
      montoCobrado: record.montoCobrado,
      entregaUsado: record.entregaUsado,
      modeloUsado: record.entregaUsado === 'Sí' ? record.modeloUsado : '',
      anoUsado: record.entregaUsado === 'Sí' ? record.anoUsado : '',
      valorInfoauto: record.entregaUsado === 'Sí' ? record.valorInfoauto : '',
      valorToma: record.entregaUsado === 'Sí' ? record.valorToma : '',
      equipoVenta: record.equipoVenta,
      vendedor: record.vendedor,
      origenDato: record.origenDato,
    };

    const res = await fetch(config.webAppUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    const text = await res.text();
    let json: { status?: string; message?: string } = {};
    try {
      json = JSON.parse(text);
    } catch {
      if (res.ok) {
        json = { status: 'success' };
      }
    }

    if (json.status === 'success' || res.ok) {
      record.syncStatus = 'synced';
      const updatedHistory = getSalesHistory().map((item) =>
        item.numSuscripcion === numSuscripcion ? { ...item, syncStatus: 'synced' as const } : item
      );
      saveSalesHistory(updatedHistory);

      return {
        success: true,
        numSuscripcion,
        syncedToRemote: true,
        message: `¡Venta #${numSuscripcion} registrada y sincronizada en tiempo real con Google Sheets!`,
      };
    } else {
      // Si el servidor detectó duplicado o error
      const isDuplicate = json.message && json.message.toLowerCase().includes('duplicad');
      record.syncStatus = 'error';
      record.errorMessage = json.message;
      const updatedHistory = getSalesHistory().map((item) =>
        item.numSuscripcion === numSuscripcion ? { ...item, syncStatus: 'error' as const, errorMessage: json.message } : item
      );
      saveSalesHistory(updatedHistory);

      return {
        success: !isDuplicate,
        numSuscripcion,
        syncedToRemote: false,
        message: json.message || 'Error al escribir en Google Sheets',
      };
    }
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.warn('No se pudo enviar a Google Sheets inmediatamente, en cola local:', errorMsg);

    const updatedHistory = getSalesHistory().map((item) =>
      item.numSuscripcion === numSuscripcion
        ? { ...item, syncStatus: 'pending' as const, errorMessage: errorMsg }
        : item
    );
    saveSalesHistory(updatedHistory);

    return {
      success: true,
      numSuscripcion,
      syncedToRemote: false,
      message: `Venta guardada localmente con clave #${numSuscripcion}. Se sincronizará automáticamente al reconectar.`,
    };
  }
}

/**
 * Reintenta sincronizar todas las ventas pendientes con Google Sheets
 */
export async function syncPendingSales(): Promise<{ total: number; synced: number }> {
  const history = getSalesHistory();
  const pending = history.filter((h) => h.syncStatus === 'pending');
  let syncedCount = 0;

  for (const item of pending) {
    const res = await submitVentaRecord(item, true);
    if (res.syncedToRemote) {
      syncedCount++;
    }
  }

  return { total: pending.length, synced: syncedCount };
}
