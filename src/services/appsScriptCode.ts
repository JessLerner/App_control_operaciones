export const GOOGLE_APPS_SCRIPT_CODE = `/**
 * PARTE DIARIO DE VENTAS — backend de Google Apps Script
 * La hoja ID Ventas es la fuente única: la app lee y escribe allí.
 */
const SHEETS = {
  DESTINO: 'ID Ventas',
  MODELOS: 'Modelos_y_Precios',
  EQUIPOS: 'Equipos_de_venta',
  ORIGEN: 'Origen_datos',
  CONFIG: 'Configuracion'
};

const HEADERS = [
  'N° Suscripción', 'Fecha', 'Cliente', 'Marca', 'Modelo', 'Tipo de Plan',
  'Seña o Completa', 'Valor Cuota #1', 'Monto Cobrado', 'Autorizó Descuento',
  'Cta. Fábrica', 'Sobrepauta', '¿Entrega Usado?', 'Modelo Usado', 'Año Usado',
  'Valor Infoauto', 'Cotización Sugerida', 'Valor Toma', 'Equipo de Venta',
  'Vendedor', 'Origen del Dato'
];

function jsonResponse(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}

function key(text) {
  return String(text || '').trim().toLowerCase()
    .normalize('NFD').replace(/[\\u0300-\\u036f]/g, '');
}

function numberValue(value, fallback) {
  if (value === '' || value === null || value === undefined) return fallback;
  const result = Number(String(value).replace(/[^0-9.-]/g, ''));
  return isNaN(result) ? fallback : result;
}

function dateValue(value) {
  if (Object.prototype.toString.call(value) === '[object Date]' && !isNaN(value)) {
    return Utilities.formatDate(value, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  }
  return String(value || '');
}

function headerIndex(headers, names) {
  const normalized = headers.map(key);
  for (let i = 0; i < names.length; i++) {
    const position = normalized.indexOf(key(names[i]));
    if (position >= 0) return position;
  }
  return -1;
}

function ensureDestinationSheet(ss) {
  let sheet = ss.getSheetByName(SHEETS.DESTINO);
  if (!sheet) sheet = ss.insertSheet(SHEETS.DESTINO);
  const lastCol = Math.max(sheet.getLastColumn(), 1);
  let headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(String);
  if (!headers.some(function(value) { return String(value).trim(); })) {
    sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
    return { sheet: sheet, headers: HEADERS.slice() };
  }
  HEADERS.forEach(function(required) {
    if (headerIndex(headers, [required]) < 0) {
      headers.push(required);
      sheet.getRange(1, headers.length).setValue(required);
    }
  });
  return { sheet: sheet, headers: headers };
}

function getUsadoPricing(ss) {
  let sheet = ss.getSheetByName(SHEETS.CONFIG);
  if (!sheet) sheet = ss.insertSheet(SHEETS.CONFIG);
  const defaults = [
    ['Clave', 'Valor', 'Descripción'],
    ['anio_corte_usado', 2016, 'Año incluido en el descuento de vehículos más antiguos'],
    ['descuento_hasta_anio_corte', 0.30, 'Descuento para año menor o igual al corte'],
    ['descuento_desde_anio_corte', 0.25, 'Descuento para año posterior al corte']
  ];
  if (sheet.getLastRow() === 0 || !String(sheet.getRange(1, 1).getValue()).trim()) {
    sheet.getRange(1, 1, defaults.length, 3).setValues(defaults);
    sheet.getRange(2, 2).setNumberFormat('0');
    sheet.getRange(3, 2, 2, 1).setNumberFormat('0%');
  }
  const values = sheet.getDataRange().getValues();
  const settings = {};
  for (let row = 1; row < values.length; row++) settings[String(values[row][0] || '').trim()] = values[row][1];
  return {
    anioCorte: numberValue(settings.anio_corte_usado, 2016),
    descuentoHastaCorte: numberValue(settings.descuento_hasta_anio_corte, 0.30),
    descuentoDesdeCorte: numberValue(settings.descuento_desde_anio_corte, 0.25)
  };
}

function getModelos(ss) {
  const sheet = ss.getSheetByName(SHEETS.MODELOS);
  if (!sheet || sheet.getLastRow() < 2) return [];
  const values = sheet.getDataRange().getValues();
  const headers = values[0];
  const marca = headerIndex(headers, ['Marca']);
  const modelo = headerIndex(headers, ['Modelo']);
  const plan = headerIndex(headers, ['Tipo de Plan', 'Plan', 'Tipo']);
  const cuota = headerIndex(headers, ['Valor Cuota #1', 'Cuota #1', 'Cuota', 'Valor']);
  const fabrica = headerIndex(headers, ['Cta. Fábrica', 'Cta Fabrica', 'Fábrica', 'Fabrica']);
  return values.slice(1).map(function(row) {
    const cuota1 = numberValue(row[cuota >= 0 ? cuota : 3], 0);
    return {
      marca: String(row[marca >= 0 ? marca : 0] || '').trim().toUpperCase(),
      modelo: String(row[modelo >= 0 ? modelo : 1] || '').trim(),
      tipoPlan: String(row[plan >= 0 ? plan : 2] || '').trim(),
      valorCuota1: cuota1,
      ctaFabrica: numberValue(row[fabrica >= 0 ? fabrica : cuota], cuota1)
    };
  }).filter(function(item) { return item.marca && item.modelo; });
}

function getEquipos(ss) {
  const sheet = ss.getSheetByName(SHEETS.EQUIPOS);
  if (!sheet || sheet.getLastRow() === 0) return [];
  const headerRow = sheet.getLastRow() >= 18 ? 18 : 1;
  const values = sheet.getRange(headerRow, 1, sheet.getLastRow() - headerRow + 1, sheet.getLastColumn()).getValues();
  return values[0].map(function(supervisor, column) {
    const name = String(supervisor || '').trim();
    const vendedores = values.slice(1).map(function(row) { return String(row[column] || '').trim(); }).filter(Boolean);
    return { supervisor: name, vendedores: vendedores };
  }).filter(function(team) { return team.supervisor && key(team.supervisor) !== 'equipos' && team.vendedores.length; });
}

function getOrigenes(ss) {
  const sheet = ss.getSheetByName(SHEETS.ORIGEN);
  if (!sheet || sheet.getLastRow() < 2) return [];
  return sheet.getRange(2, 1, sheet.getLastRow() - 1, 1).getValues()
    .map(function(row) { return String(row[0] || '').trim(); }).filter(Boolean);
}

function fieldForHeader(header) {
  const value = key(header);
  if (value.indexOf('suscrip') >= 0) return 'numSuscripcion';
  if (value.indexOf('fecha') >= 0) return 'fecha';
  if (value.indexOf('cliente') >= 0) return 'cliente';
  if (value === 'marca') return 'marca';
  if (value.indexOf('modelo') >= 0 && value.indexOf('usado') < 0) return 'modelo';
  if (value.indexOf('plan') >= 0 || value === 'tipo') return 'tipoPlan';
  if (value.indexOf('sena') >= 0 || value.indexOf('completa') >= 0) return 'senaOCompleta';
  if (value.indexOf('autoriz') >= 0) return 'autorizoDescuento';
  if (value.indexOf('fabrica') >= 0 || value.indexOf('cta') >= 0) return 'ctaFabrica';
  if (value.indexOf('sobrepauta') >= 0) return 'sobrepauta';
  if (value.indexOf('cuota') >= 0) return 'valorCuota1';
  if (value.indexOf('cobrado') >= 0 || value.indexOf('monto') >= 0) return 'montoCobrado';
  if (value.indexOf('entrega') >= 0) return 'entregaUsado';
  if (value.indexOf('modelo') >= 0 && value.indexOf('usado') >= 0) return 'modeloUsado';
  if (value.indexOf('ano') >= 0) return 'anoUsado';
  if (value.indexOf('infoauto') >= 0) return 'valorInfoauto';
  if (value.indexOf('sugerida') >= 0 || value.indexOf('cotiz') >= 0) return 'cotizacionSugerida';
  if (value.indexOf('toma') >= 0) return 'valorToma';
  if (value.indexOf('equipo') >= 0 || value.indexOf('supervisor') >= 0) return 'equipoVenta';
  if (value.indexOf('vendedor') >= 0) return 'vendedor';
  if (value.indexOf('origen') >= 0) return 'origenDato';
  return '';
}

function getVentas(destination) {
  if (destination.sheet.getLastRow() < 2) return [];
  const rows = destination.sheet.getRange(2, 1, destination.sheet.getLastRow() - 1, destination.headers.length).getValues();
  return rows.map(function(row) {
    const sale = {};
    destination.headers.forEach(function(header, index) {
      const field = fieldForHeader(header);
      if (field) sale[field] = field === 'fecha' ? dateValue(row[index]) : row[index];
    });
    return sale;
  }).filter(function(sale) { return String(sale.numSuscripcion || '').trim(); });
}

function hashSecret(value) {
  const bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(value || ''), Utilities.Charset.UTF_8);
  return bytes.map(function(byte) { const value = (byte + 256) % 256; return ('0' + value.toString(16)).slice(-2); }).join('');
}

function sessionKey(token) { return 'manager_session_' + hashSecret(token); }

function managerSession(token) {
  if (!token) return false;
  const raw = PropertiesService.getScriptProperties().getProperty(sessionKey(token));
  if (!raw) return false;
  try { return JSON.parse(raw).expiresAt > Date.now(); } catch (_) { return false; }
}

function requireManager(body) {
  if (!managerSession(body.token)) throw new Error('La sesión de Gerencia venció. Ingresá nuevamente.');
}

function handleManagerAction(ss, body) {
  const properties = PropertiesService.getScriptProperties();
  const action = String(body.action || '');
  if (action === 'managerSetup') {
    if (properties.getProperty('manager_pin_hash')) throw new Error('Gerencia ya fue configurada.');
    if (!body.pin || String(body.pin).length < 8 || !body.recoveryEmail) throw new Error('Indicá una clave de al menos 8 caracteres y un correo de recuperación.');
    properties.setProperty('manager_pin_hash', hashSecret(body.pin));
    properties.setProperty('manager_recovery_email', String(body.recoveryEmail).trim());
    return { configured: 'true' };
  }
  if (action === 'managerLogin') {
    if (!properties.getProperty('manager_pin_hash')) return { setupRequired: 'true' };
    if (hashSecret(body.pin) !== properties.getProperty('manager_pin_hash')) throw new Error('Clave incorrecta.');
    const token = Utilities.getUuid() + Utilities.getUuid();
    properties.setProperty(sessionKey(token), JSON.stringify({ expiresAt: Date.now() + 8 * 60 * 60 * 1000 }));
    return { token: token };
  }
  if (action === 'requestManagerReset') {
    const email = properties.getProperty('manager_recovery_email');
    if (!email) throw new Error('No hay correo de recuperación configurado.');
    const last = Number(properties.getProperty('manager_reset_last') || 0);
    if (Date.now() - last < 5 * 60 * 1000) throw new Error('Esperá unos minutos antes de solicitar otro código.');
    const code = String(Math.floor(100000 + Math.random() * 900000));
    properties.setProperties({ manager_reset_code_hash: hashSecret(code), manager_reset_expires: String(Date.now() + 15 * 60 * 1000), manager_reset_last: String(Date.now()) });
    MailApp.sendEmail(email, 'Código de recuperación — Parte Diario de Ventas', 'Tu código de recuperación es: ' + code + '. Vence en 15 minutos. Si no lo solicitaste, ignorá este correo.');
    return { sent: 'true' };
  }
  if (action === 'resetManagerPin') {
    if (!body.newPin || String(body.newPin).length < 8) throw new Error('La nueva clave debe tener al menos 8 caracteres.');
    if (Date.now() > Number(properties.getProperty('manager_reset_expires') || 0) || hashSecret(body.code) !== properties.getProperty('manager_reset_code_hash')) throw new Error('El código es inválido o venció.');
    properties.setProperty('manager_pin_hash', hashSecret(body.newPin));
    properties.deleteProperty('manager_reset_code_hash'); properties.deleteProperty('manager_reset_expires');
    return { reset: 'true' };
  }
  requireManager(body);
  if (action === 'setActiveWebAppUrl') {
    const url = String(body.webAppUrl || '').trim();
    if (!/^https:\/\/script\.google\.com\/macros\/s\/.+\/exec/.test(url)) throw new Error('La URL debe ser una implementación pública de Google Apps Script.');
    const config = ss.getSheetByName(SHEETS.CONFIG) || ss.insertSheet(SHEETS.CONFIG);
    getUsadoPricing(ss);
    const values = config.getDataRange().getValues();
    let row = -1;
    for (let i = 1; i < values.length; i++) if (String(values[i][0]).trim() === 'active_web_app_url') row = i + 1;
    if (row < 0) config.appendRow(['active_web_app_url', url, 'URL activa de la base de datos para las aplicaciones']);
    else config.getRange(row, 2).setValue(url);
    return { webAppUrl: url };
  }
  throw new Error('Acción de Gerencia no reconocida.');
}

function doGet(e) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const destination = ensureDestinationSheet(ss);
    const ventas = getVentas(destination);
    return jsonResponse({ status: 'success', data: {
      modelosYPrecios: getModelos(ss), equiposDeVenta: getEquipos(ss), origenesDatos: getOrigenes(ss),
      suscripcionesExistentes: ventas.map(function(sale) { return String(sale.numSuscripcion).trim(); }),
      ventas: ventas, usadoPricing: getUsadoPricing(ss), lastUpdated: new Date().toISOString()
    }});
  } catch (error) { return jsonResponse({ status: 'error', message: String(error) }); }
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) return jsonResponse({ status: 'error', message: 'La planilla está ocupada. Reintentá en unos segundos.' });
  try {
    const body = JSON.parse(e.postData && e.postData.contents || '{}');
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    if (String(body.action || '').indexOf('manager') === 0 || body.action === 'setActiveWebAppUrl') {
      return jsonResponse({ status: 'success', data: handleManagerAction(ss, body) });
    }
    const numSuscripcion = String(body.numSuscripcion || '').trim();
    if (!numSuscripcion) return jsonResponse({ status: 'error', message: 'El N° de Suscripción es obligatorio.' });
    const destination = ensureDestinationSheet(ss);
    const subscriptionColumn = headerIndex(destination.headers, ['N° Suscripción']) + 1;
    if (destination.sheet.getLastRow() > 1) {
      const existing = destination.sheet.getRange(2, subscriptionColumn, destination.sheet.getLastRow() - 1, 1).getValues();
      if (existing.some(function(row) { return key(row[0]) === key(numSuscripcion); })) {
        return jsonResponse({ status: 'error', message: 'El N° de Suscripción ' + numSuscripcion + ' ya existe en la base de datos.' });
      }
    }
    const pricing = getUsadoPricing(ss);
    const infoauto = numberValue(body.valorInfoauto, 0);
    const descuento = numberValue(body.anoUsado, 0) <= pricing.anioCorte ? pricing.descuentoHastaCorte : pricing.descuentoDesdeCorte;
    const cuotaFabrica = numberValue(body.ctaFabrica, numberValue(body.valorCuota1, 0));
    const payload = Object.assign({}, body, {
      numSuscripcion: numSuscripcion, ctaFabrica: cuotaFabrica,
      sobrepauta: numberValue(body.montoCobrado, 0) - cuotaFabrica,
      cotizacionSugerida: body.entregaUsado === 'Sí' ? Math.round(infoauto * (1 - descuento)) : ''
    });
    const row = destination.headers.map(function(header) {
      const field = fieldForHeader(header);
      return field ? (payload[field] === undefined ? '' : payload[field]) : '';
    });
    destination.sheet.appendRow(row);
    return jsonResponse({ status: 'success', numSuscripcion: numSuscripcion, message: 'Venta registrada en Google Sheets.' });
  } catch (error) { return jsonResponse({ status: 'error', message: String(error) });
  } finally { lock.releaseLock(); }
}
`;
