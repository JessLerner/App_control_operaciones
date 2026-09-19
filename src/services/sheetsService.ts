import { ReferenceData, VentaFormData, VentaRecord, SheetsConfig, ModeloPlanItem } from '../types';
import { INITIAL_REFERENCE_DATA, INITIAL_MODELOS_Y_PRECIOS } from '../data/initialReferenceData';

const STORAGE_KEYS = {
  CONFIG: 'pdv_sheets_config_v1',
  REFERENCE: 'pdv_reference_data_v1',
  SALES_HISTORY: 'pdv_sales_history_v1',
};

// URL publicada para que una instalación nueva quede conectada sin configuración manual.
// Puede reemplazarse por VITE_GOOGLE_APPS_SCRIPT_URL al compilar la app.
export const DEFAULT_WEB_APP_URL =
  import.meta.env.VITE_GOOGLE_APPS_SCRIPT_URL ||
  'https://script.google.com/macros/s/AKfycbzKh9PhBkGd4u4Xpdg2iuezywSun6Kk6E5E0KarsMBhsRewxstt53qCpjx04QHZy6Px/exec';

export const DEFAULT_CONFIG: SheetsConfig = {
  webAppUrl: DEFAULT_WEB_APP_URL,
  sheetNameDestino: 'ID Ventas',
};

export function getStoredConfig(): SheetsConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CONFIG);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<SheetsConfig>;
      return {
        ...DEFAULT_CONFIG,
        ...parsed,
      };
    }
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
        // Garantizar que todos los modelos tengan su Cta. Fábrica calculada
        parsed.modelosYPrecios = parsed.modelosYPrecios.map((item: ModeloPlanItem) => {
          if (item.ctaFabrica === undefined || item.ctaFabrica === null || item.ctaFabrica <= 0) {
            const fallback = INITIAL_MODELOS_Y_PRECIOS.find(
              (f) =>
                f.marca.toUpperCase() === String(item.marca || '').toUpperCase() &&
                f.modelo.toLowerCase() === String(item.modelo || '').toLowerCase() &&
                f.tipoPlan.toLowerCase() === String(item.tipoPlan || '').toLowerCase()
            );
            return {
              ...item,
              ctaFabrica: fallback?.ctaFabrica || item.valorCuota1 || 0,
            };
          }
          return item;
        });
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
      const rawModelos: ModeloPlanItem[] = json.data.modelosYPrecios || [];
      const enrichedModelos: ModeloPlanItem[] = rawModelos.map((item) => {
        const itemCuota = Number(item.valorCuota1) || 0;
        let fab = Number(item.ctaFabrica);
        if (!fab || fab <= 0) {
          const fallback = INITIAL_MODELOS_Y_PRECIOS.find(
            (f) =>
              f.marca.toUpperCase() === String(item.marca || '').toUpperCase() &&
              f.modelo.toLowerCase() === String(item.modelo || '').toLowerCase() &&
              f.tipoPlan.toLowerCase() === String(item.tipoPlan || '').toLowerCase()
          );
          fab = fallback?.ctaFabrica || itemCuota;
        }
        return {
          ...item,
          valorCuota1: itemCuota,
          ctaFabrica: fab,
        };
      });

      const refData: ReferenceData = {
        modelosYPrecios: enrichedModelos,
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
 * Verifica remotamente si una Primary Key (N° de Suscripción) ya existe en Google Sheets
 */
export async function verifySubscriptionInRemoteSheets(numSuscripcion: string): Promise<boolean> {
  if (!numSuscripcion) return false;
  const config = getStoredConfig();
  if (!config.webAppUrl) return false;

  try {
    const res = await fetchRemoteReferenceData(config.webAppUrl);
    if (res.success && res.data?.suscripcionesExistentes) {
      const cleanNum = numSuscripcion.trim().toLowerCase();
      const exists = res.data.suscripcionesExistentes.some(
        (s) => String(s).trim().toLowerCase() === cleanNum
      );
      if (exists) {
        // Asegurar que el registro local refleje 'synced'
        const history = getSalesHistory().map((item) =>
          item.numSuscripcion.trim().toLowerCase() === cleanNum
            ? { ...item, syncStatus: 'synced' as const, errorMessage: undefined }
            : item
        );
        saveSalesHistory(history);
        return true;
      }
    }
  } catch (e) {
    console.warn('Error verificando suscripción en Google Sheets:', e);
  }
  return false;
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
    history[existingIndex] = { ...record, syncStatus: history[existingIndex].syncStatus };
  } else {
    history.unshift(record);
  }
  saveSalesHistory(history);

  // Si no hay URL configurada, se guarda localmente en modo Demo
  if (!config.webAppUrl) {
    // Agregar al listado de suscripciones conocidas localmente
    const refData = getStoredReferenceData();
    const updatedSubs = new Set(refData.suscripcionesExistentes || []);
    updatedSubs.add(numSuscripcion);
    refData.suscripcionesExistentes = Array.from(updatedSubs);
    saveStoredReferenceData(refData);

    return {
      success: true,
      numSuscripcion,
      syncedToRemote: false,
      message: `Venta guardada en este dispositivo con clave #${numSuscripcion} (Modo Local / Demo).`,
    };
  }

  // Intentar sincronización remota con Google Sheets
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    const ctaFabricaNum =
      typeof record.ctaFabrica === 'number' && record.ctaFabrica > 0
        ? record.ctaFabrica
        : Number(record.valorCuota1) || 0;

    const montoCobradoNum = typeof record.montoCobrado === 'number' ? record.montoCobrado : 0;
    const sobrepautaNum =
      typeof record.sobrepauta === 'number'
        ? record.sobrepauta
        : montoCobradoNum - ctaFabricaNum;

    const cotizacionSugeridaNum =
      record.entregaUsado === 'Sí' && record.valorInfoauto
        ? (typeof record.cotizacionSugerida === 'number' ? record.cotizacionSugerida : Math.round(Number(record.valorInfoauto) * 0.7))
        : '';

    const payload = {
      numSuscripcion: record.numSuscripcion,
      fecha: record.fecha,
      cliente: record.cliente,
      marca: record.marca,
      modelo: record.modelo,
      tipoPlan: record.tipoPlan,
      senaOCompleta: record.senaOCompleta,
      autorizoDescuento: record.senaOCompleta === 'Descuento Aprobado' ? (record.autorizoDescuento || '') : '',
      valorCuota1: Number(record.valorCuota1) || 0,
      ctaFabrica: ctaFabricaNum,
      cta_fabrica: ctaFabricaNum,
      cuotaFabrica: ctaFabricaNum,
      sobrepauta: sobrepautaNum,
      sobrePauta: sobrepautaNum,
      montoCobrado: montoCobradoNum,
      entregaUsado: record.entregaUsado,
      modeloUsado: record.entregaUsado === 'Sí' ? record.modeloUsado : '',
      anoUsado: record.entregaUsado === 'Sí' ? record.anoUsado : '',
      valorInfoauto: record.entregaUsado === 'Sí' ? (Number(record.valorInfoauto) || '') : '',
      cotizacionSugerida: cotizacionSugeridaNum,
      valorToma: record.entregaUsado === 'Sí' ? (Number(record.valorToma) || '') : '',
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
      // Un HTTP 200 no confirma una escritura: Apps Script puede responder errores con 200.
      json = {};
    }

    // Solo una confirmación explícita del backend permite marcar la venta como sincronizada.
    if (res.ok && json.status === 'success') {
      record.syncStatus = 'synced';
      record.errorMessage = undefined;
      const updatedHistory = getSalesHistory().map((item) =>
        item.numSuscripcion === numSuscripcion
          ? { ...item, syncStatus: 'synced' as const, errorMessage: undefined }
          : item
      );
      saveSalesHistory(updatedHistory);

      // Agregar a suscripciones conocidas de referencia
      const refData = getStoredReferenceData();
      const updatedSubs = new Set(refData.suscripcionesExistentes || []);
      updatedSubs.add(numSuscripcion);
      refData.suscripcionesExistentes = Array.from(updatedSubs);
      saveStoredReferenceData(refData);

      return {
        success: true,
        numSuscripcion,
        syncedToRemote: true,
        message: `¡Venta #${numSuscripcion} registrada y guardada exitosamente en Google Sheets!`,
      };
    } else {
      // Ante una respuesta ambigua o de error, comprobar el origen antes de dejarla pendiente.
      const isActuallyInSheet = await verifySubscriptionInRemoteSheets(numSuscripcion);
      if (isActuallyInSheet) {
        return {
          success: true,
          numSuscripcion,
          syncedToRemote: true,
          message: `¡Venta #${numSuscripcion} confirmada y registrada en Google Sheets!`,
        };
      }

      record.syncStatus = 'pending';
      record.errorMessage = json.message;
      const updatedHistory = getSalesHistory().map((item) =>
        item.numSuscripcion === numSuscripcion
          ? { ...item, syncStatus: 'pending' as const, errorMessage: json.message }
          : item
      );
      saveSalesHistory(updatedHistory);

      return {
        success: true,
        numSuscripcion,
        syncedToRemote: false,
        message: `Venta guardada localmente (${json.message || 'Pendiente de sincronización remota'}).`,
      };
    }
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.warn('Error en la llamada directa a Google Sheets, verificando estado remoto:', errorMsg);

    // Verificación de respaldo: comprobar si la Primary Key sí quedó asentada en Google Sheets
    const isActuallyInSheet = await verifySubscriptionInRemoteSheets(numSuscripcion);
    if (isActuallyInSheet) {
      return {
        success: true,
        numSuscripcion,
        syncedToRemote: true,
        message: `¡Venta #${numSuscripcion} confirmada y guardada exitosamente en Google Sheets!`,
      };
    }

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
      message: `Venta guardada en este dispositivo con clave #${numSuscripcion}. Se sincronizará automáticamente al conectarse con Google Sheets.`,
    };
  }
}

/**
 * Reintenta sincronizar todas las ventas pendientes con Google Sheets
 * y verifica la existencia de Primary Keys remotas
 */
export async function syncPendingSales(): Promise<{ total: number; synced: number; remainingPending: number }> {
  const config = getStoredConfig();
  let history = getSalesHistory();
  let pending = history.filter((h) => h.syncStatus !== 'synced');

  if (pending.length === 0) {
    return { total: 0, synced: 0, remainingPending: 0 };
  }

  // 1. Si hay Web App URL, consultar la planilla remota para ver si alguna ya existe
  if (config.webAppUrl) {
    try {
      const refCheck = await fetchRemoteReferenceData(config.webAppUrl);
      if (refCheck.success && refCheck.data?.suscripcionesExistentes) {
        const remoteSubs = new Set(
          refCheck.data.suscripcionesExistentes.map((s) => String(s).trim().toLowerCase())
        );

        history = history.map((item) => {
          if (item.syncStatus !== 'synced' && remoteSubs.has(item.numSuscripcion.trim().toLowerCase())) {
            return { ...item, syncStatus: 'synced' as const, errorMessage: undefined };
          }
          return item;
        });
        saveSalesHistory(history);
      }
    } catch (e) {
      console.warn('Error consultando suscripciones previas en syncPendingSales:', e);
    }
  }

  // 2. Re-evaluar registros que siguen no sincronizados
  history = getSalesHistory();
  pending = history.filter((h) => h.syncStatus !== 'synced');

  let syncedCount = 0;
  for (const item of pending) {
    const res = await submitVentaRecord(item, true);
    if (res.syncedToRemote) {
      syncedCount++;
    }
  }

  // 3. Verificación final de respaldo
  if (config.webAppUrl) {
    try {
      const refFinal = await fetchRemoteReferenceData(config.webAppUrl);
      if (refFinal.success && refFinal.data?.suscripcionesExistentes) {
        const remoteSubs = new Set(
          refFinal.data.suscripcionesExistentes.map((s) => String(s).trim().toLowerCase())
        );
        history = getSalesHistory().map((item) => {
          if (item.syncStatus !== 'synced' && remoteSubs.has(item.numSuscripcion.trim().toLowerCase())) {
            return { ...item, syncStatus: 'synced' as const, errorMessage: undefined };
          }
          return item;
        });
        saveSalesHistory(history);
      }
    } catch (e) {
      console.warn('Error en verificación final de syncPendingSales:', e);
    }
  }

  const finalHistory = getSalesHistory();
  const remaining = finalHistory.filter((h) => h.syncStatus !== 'synced').length;

  return { total: pending.length, synced: syncedCount, remainingPending: remaining };
}
