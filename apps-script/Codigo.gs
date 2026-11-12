/**
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
  'Fecha', 'Cliente', 'N° Suscripción', 'Marca', 'Modelo', 'Tipo de Plan',
  'Normal/Ultra', 'Seña o Completa', 'Autorizó Descuento', 'Valor Cuota #1', 'Monto Cobrado',
  'Cta. Fábrica', 'Sobrepauta', 'valor del auto', '¿Entrega Usado?', 'Modelo Usado',
  'Año Usado', 'Valor Infoauto', 'Valor Toma', 'Cotización Sugerida',
  'Debito Automatico', 'Equipo de Venta', 'Vendedor', 'Origen del Dato'
];

function jsonResponse(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}

function key(text) {
  return String(text || '').trim().toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
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
  const tipoPlanColumn = headerIndex(headers, ['Tipo de Plan']);
  if (tipoPlanColumn >= 0 && headerIndex(headers, ['Normal/Ultra']) < 0) {
    sheet.insertColumnAfter(tipoPlanColumn + 1);
    headers.splice(tipoPlanColumn + 1, 0, 'Normal/Ultra');
    sheet.getRange(1, tipoPlanColumn + 2).setValue('Normal/Ultra');
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
  const vehiculo = headerIndex(headers, ['Vehículo', 'Vehiculo', 'Auto']);
  const modelo = headerIndex(headers, ['Modelo']);
  const plan = headerIndex(headers, ['Tipo de Plan', 'Plan', 'Tipo']);
  const normal1 = headerIndex(headers, ['Normal 1']);
  const normal3 = headerIndex(headers, ['Normal 3']);
  const ultra = headerIndex(headers, ['Ultra']);
  const cuota1 = headerIndex(headers, ['Cuota 1']);
  const valorAuto = headerIndex(headers, ['valor auto', 'valor del auto']);

  return values.slice(1).map(function(row) {
    const normal1Value = normal1 >= 0 ? numberValue(row[normal1], 0) : 0;
    const normal3Value = normal3 >= 0 ? numberValue(row[normal3], 0) : 0;
    const ultraValue = ultra >= 0 ? numberValue(row[ultra], 0) : 0;
    const cuota1Value = cuota1 >= 0 ? numberValue(row[cuota1], 0) : 0;

    return {
      marca: String(row[marca >= 0 ? marca : 0] || '').trim().toUpperCase(),
      vehiculo: String(row[vehiculo >= 0 ? vehiculo : -1] || '').trim(),
      modelo: String(row[modelo >= 0 ? modelo : 1] || '').trim(),
      tipoPlan: String(row[plan >= 0 ? plan : 2] || '').trim(),
      valorCuota1: 0,
      normal1: normal1Value > 0 ? normal1Value : undefined,
      normal3: normal3Value > 0 ? normal3Value : undefined,
      ultra: ultraValue > 0 ? ultraValue : undefined,
      cuota1: cuota1Value > 0 ? cuota1Value : undefined,
      ctaFabrica: cuota1Value > 0 ? cuota1Value : undefined,
      valorAuto: numberValue(row[valorAuto], 0)
    };
  }).filter(function(item) {
    return item.marca && item.modelo;
  });
}

function getEquipos(ss) {
  const sheet = ss.getSheetByName(SHEETS.EQUIPOS);

  if (!sheet || sheet.getLastRow() < 2) return [];

  const values = sheet.getDataRange().getValues();
  const headers = values[0];

  const equipoColumn = headerIndex(headers, [
    'Equipo de Venta',
    'Equipo',
    'Supervisor'
  ]);

  const vendedorColumn = headerIndex(headers, [
    'Vendedor',
    'Vendedores'
  ]);

  const activoColumn = headerIndex(headers, ['Activo']);

  if (equipoColumn < 0 || vendedorColumn < 0 || activoColumn < 0) {
    throw new Error(
      'La hoja Copia de Equipos_de_venta debe tener las columnas: Equipo de Venta, Vendedor y Activo.'
    );
  }

  const equipos = [];
  const equiposPorNombre = {};

  values.slice(1).forEach(function(row) {
    const equipo = String(row[equipoColumn] || '').trim();
    const vendedor = String(row[vendedorColumn] || '').trim();
    const activo = key(row[activoColumn]);

    // Solo aparecen vendedores marcados como "Sí".
    if (!equipo || !vendedor || activo !== 'si') return;

    if (!equiposPorNombre[equipo]) {
      equiposPorNombre[equipo] = {
        supervisor: equipo,
        vendedores: []
      };
      equipos.push(equiposPorNombre[equipo]);
    }

    // Evita mostrar el mismo vendedor dos veces dentro de un equipo.
    if (equiposPorNombre[equipo].vendedores.indexOf(vendedor) < 0) {
      equiposPorNombre[equipo].vendedores.push(vendedor);
    }
  });

  return equipos;
}

function getOrigenes(ss) {
  const sheet = ss.getSheetByName(SHEETS.ORIGEN);
  if (!sheet || sheet.getLastRow() < 2) return [];
  return sheet.getRange(2, 1, sheet.getLastRow() - 1, 1).getValues()
    .map(function(row) { return String(row[0] || '').trim(); }).filter(Boolean);
}

function fieldForHeader(header) {
  const value = key(header);

  if (value === 'debito automatico') return 'debitoAutomatico';

  if (value.indexOf('suscrip') >= 0) return 'numSuscripcion';
  if (value.indexOf('fecha') >= 0) return 'fecha';
  if (value.indexOf('cliente') >= 0) return 'cliente';
  if (value === 'marca') return 'marca';
  if (value === 'vehiculo' || value === 'auto') return 'vehiculo';
  if (value.indexOf('modelo') >= 0 && value.indexOf('usado') < 0) return 'modelo';
  if (value.indexOf('plan') >= 0 || value === 'tipo') return 'tipoPlan';
  if (value === 'normal/ultra' || value === 'modalidad cuota') return 'modalidadCuota';
  // Debe preceder a la coincidencia genérica de seña: es una columna calculada distinta.
  if (value === 'monto restante sena') return 'montoRestanteSena';
  if (value.indexOf('sena') >= 0 || value.indexOf('completa') >= 0) return 'senaOCompleta';
  if (value.indexOf('autoriz') >= 0) return 'autorizoDescuento';
  if (value.indexOf('fabrica') >= 0 || value.indexOf('cta') >= 0) return 'ctaFabrica';
  if (value.indexOf('sobrepauta') >= 0) return 'sobrepauta';
  if (value.indexOf('infoauto') >= 0) return 'valorInfoauto';
  if (value.indexOf('valor') >= 0 && value.indexOf('auto') >= 0) return 'valorAuto';
  if (value.indexOf('cuota') >= 0) return 'valorCuota1';
  if (value.indexOf('cobrado') >= 0 || value.indexOf('monto') >= 0) return 'montoCobrado';
  if (value.indexOf('entrega') >= 0) return 'entregaUsado';
  if (value.indexOf('modelo') >= 0 && value.indexOf('usado') >= 0) return 'modeloUsado';
  if (value.indexOf('ano') >= 0) return 'anoUsado';
  if (value.indexOf('toma') >= 0) return 'valorToma';
  if (value.indexOf('debito') >= 0) return 'debitoAutomatico';
  if (value.indexOf('equipo') >= 0 || value.indexOf('supervisor') >= 0) return 'equipoVenta';
  if (value.indexOf('vendedor') >= 0) return 'vendedor';
  if (value.indexOf('origen') >= 0) return 'origenDato';
  return '';
}

function getValorAuto(ss, marca, modelo, tipoPlan) {
  const matches = getModelos(ss).filter(function(item) {
    return key(item.marca) === key(marca) &&
      key(item.modelo) === key(modelo) &&
      key(item.tipoPlan) === key(tipoPlan);
  });

  // Sin coincidencia o con más de una: la venta se guarda igual,
  // pero "valor del auto" queda vacío.
  if (matches.length !== 1) return '';

  const valorAuto = numberValue(matches[0].valorAuto, 0);

  // Precio faltante o inválido: se guarda vacío, sin bloquear.
  return valorAuto > 0 ? valorAuto : '';
}

function getVehiculo(ss, marca, modelo, tipoPlan) {
  const matches = getModelos(ss).filter(function(item) {
    return key(item.marca) === key(marca) &&
      key(item.modelo) === key(modelo) &&
      key(item.tipoPlan) === key(tipoPlan);
  });
  return matches.length === 1 ? matches[0].vehiculo : '';
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

function columnLetter(columnNumber) {
  let result = '';
  while (columnNumber > 0) {
    const remainder = (columnNumber - 1) % 26;
    result = String.fromCharCode(65 + remainder) + result;
    columnNumber = Math.floor((columnNumber - 1) / 26);
  }
  return result;
}

function doGet() {
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
// --- Acceso de Gerencia y recuperación de clave ---
function hashSecret(value) {
  const bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(value || ''), Utilities.Charset.UTF_8);
  return bytes.map(function(byte) { const v = (byte + 256) % 256; return ('0' + v.toString(16)).slice(-2); }).join('');
}
function sessionKey(token) { return 'manager_session_' + hashSecret(token); }
function managerSession(token) {
  const raw = token && PropertiesService.getScriptProperties().getProperty(sessionKey(token));
  try { return !!raw && JSON.parse(raw).expiresAt > Date.now(); } catch (_) { return false; }
}
function managerAction(ss, body) {
  const props = PropertiesService.getScriptProperties();
  const action = String(body.action || '');
  if (action === 'managerSetup') {
    if (props.getProperty('manager_pin_hash')) throw new Error('Gerencia ya fue configurada.');
    if (!body.pin || String(body.pin).length < 8 || !body.recoveryEmail) throw new Error('Indicá una clave de al menos 8 caracteres y un correo de recuperación.');
    props.setProperty('manager_pin_hash', hashSecret(body.pin));
    props.setProperty('manager_recovery_email', String(body.recoveryEmail).trim());
    return { configured: 'true' };
  }
  if (action === 'managerLogin') {
    if (!props.getProperty('manager_pin_hash')) return { setupRequired: 'true' };
    if (hashSecret(body.pin) !== props.getProperty('manager_pin_hash')) throw new Error('Clave incorrecta.');
    const token = Utilities.getUuid() + Utilities.getUuid();
    props.setProperty(sessionKey(token), JSON.stringify({ expiresAt: Date.now() + 8 * 60 * 60 * 1000 }));
    return { token: token };
  }
  if (action === 'requestManagerReset') {
    const email = props.getProperty('manager_recovery_email');
    if (!email) throw new Error('No hay correo de recuperación configurado.');
    const last = Number(props.getProperty('manager_reset_last') || 0);
    if (Date.now() - last < 5 * 60 * 1000) throw new Error('Esperá cinco minutos antes de solicitar otro código.');
    const code = String(Math.floor(100000 + Math.random() * 900000));
    props.setProperties({ manager_reset_code_hash: hashSecret(code), manager_reset_expires: String(Date.now() + 15 * 60 * 1000), manager_reset_last: String(Date.now()) });
    MailApp.sendEmail(email, 'Código de recuperación — Parte Diario de Ventas', 'Tu código de recuperación es: ' + code + '. Vence en 15 minutos.');
    return { sent: 'true' };
  }
  if (action === 'resetManagerPin') {
    if (!body.newPin || String(body.newPin).length < 8) throw new Error('La nueva clave debe tener al menos 8 caracteres.');
    if (Date.now() > Number(props.getProperty('manager_reset_expires') || 0) || hashSecret(body.code) !== props.getProperty('manager_reset_code_hash')) throw new Error('El código es inválido o venció.');
    props.setProperty('manager_pin_hash', hashSecret(body.newPin));
    props.deleteProperty('manager_reset_code_hash'); props.deleteProperty('manager_reset_expires');
    return { reset: 'true' };
  }
  if (!managerSession(body.token)) throw new Error('La sesión de Gerencia venció. Ingresá nuevamente.');
  if (action === 'setActiveWebAppUrl') {
    const url = String(body.webAppUrl || '').trim();
    if (!/^https:\/\/script\.google\.com\/macros\/s\/.+\/exec/.test(url)) throw new Error('La URL debe ser una implementación pública de Google Apps Script.');    const config = ss.getSheetByName(SHEETS.CONFIG) || ss.insertSheet(SHEETS.CONFIG);
    getUsadoPricing(ss);
    const rows = config.getDataRange().getValues();
    let row = -1; for (let i = 1; i < rows.length; i++) if (String(rows[i][0]).trim() === 'active_web_app_url') row = i + 1;
    if (row < 0) config.appendRow(['active_web_app_url', url, 'URL activa de la base de datos']); else config.getRange(row, 2).setValue(url);
    return { webAppUrl: url };
  }
  throw new Error('Acción de Gerencia no reconocida.');
}
function doPost(e) {
  const lock = LockService.getScriptLock();

  if (!lock.tryLock(10000)) {
    return jsonResponse({
      status: 'error',
      message: 'La planilla está ocupada. Reintentá en unos segundos.'
    });
  }

  try {
    const body = JSON.parse(e.postData && e.postData.contents || '{}');
    const ss = SpreadsheetApp.getActiveSpreadsheet();

    if (String(body.action || '').indexOf('manager') === 0 ||
        body.action === 'setActiveWebAppUrl') {
      return jsonResponse({
        status: 'success',
        data: managerAction(ss, body)
      });
    }

    const numSuscripcion = String(body.numSuscripcion || '').trim();

    if (!numSuscripcion) {
      return jsonResponse({
        status: 'error',
        message: 'El N° de Suscripción es obligatorio.'
      });
    }

    if (['normal_1', 'normal_3', 'ultra'].indexOf(body.modalidadCuota) < 0) {
      return jsonResponse({ status: 'error', message: 'Indicá normal_1, normal_3 o ultra.' });
    }

    if (body.modalidadCuota === 'ultra' && numberValue(body.montoCobrado, 0) < numberValue(body.valorCuota1, 0)) {
      return jsonResponse({ status: 'error', message: 'Ingreso Ultra: solo pago completo.' });
    }

    if (body.debitoAutomatico !== 'Sí' && body.debitoAutomatico !== 'No') {
      return jsonResponse({
        status: 'error',
        message: 'Indicá si la operación tiene débito automático.'
      });
    }

    const destination = ensureDestinationSheet(ss);
    const subscriptionColumn = headerIndex(destination.headers, ['N° Suscripción']) + 1;

    if (destination.sheet.getLastRow() > 1) {
      const existing = destination.sheet
        .getRange(2, subscriptionColumn, destination.sheet.getLastRow() - 1, 1)
        .getValues();

      if (existing.some(function(row) {
        return key(row[0]) === key(numSuscripcion);
      })) {
        return jsonResponse({
          status: 'error',
          message: 'El N° de Suscripción ' + numSuscripcion + ' ya existe en la base de datos.'
        });
      }
    }

    const pricing = getUsadoPricing(ss);
    const infoauto = numberValue(body.valorInfoauto, 0);
    const descuento = numberValue(body.anoUsado, 0) <= pricing.anioCorte
      ? pricing.descuentoHastaCorte
      : pricing.descuentoDesdeCorte;

    const cuotaFabrica = numberValue(
      body.ctaFabrica,
      numberValue(body.cuota1, 0)
    );

    const valorAuto = getValorAuto(
      ss,
      body.marca,
      body.modelo,
      body.tipoPlan
    );

    const payload = Object.assign({}, body, {
      numSuscripcion: numSuscripcion,
      debitoAutomatico: body.debitoAutomatico,
      ctaFabrica: cuotaFabrica,
      vehiculo: getVehiculo(ss, body.marca, body.modelo, body.tipoPlan) || body.vehiculo || '',
      valorAuto: valorAuto,
      sobrepauta: numberValue(body.montoCobrado, 0) - cuotaFabrica,
      cotizacionSugerida: body.entregaUsado === 'Sí'
        ? Math.round(infoauto * (1 - descuento))
        : ''
    });

      const row = destination.headers.map(function(header) {
        if (key(header) === 'modelo') {
          return payload.vehiculo || '';
      }

      const field = fieldForHeader(header);
      return field ? (payload[field] === undefined ? '' : payload[field]) : '';
      });

    destination.sheet.appendRow(row);
    const insertedRow = destination.sheet.getLastRow();
    const remainingColumn = headerIndex(destination.headers, ['Monto Restante seña']) + 1;
    if (remainingColumn > 0) {
      if (body.senaOCompleta === 'Seña') {
        const chargedColumn = headerIndex(destination.headers, ['Monto Cobrado']) + 1;
        const referenceColumn = headerIndex(destination.headers, ['Valor Cuota #1']) + 1;
        if (chargedColumn < 1 || referenceColumn < 1) {
          throw new Error('Faltan encabezados para calcular Monto Restante seña.');
        }
        destination.sheet.getRange(insertedRow, remainingColumn).setFormula(
          '=' + columnLetter(chargedColumn) + insertedRow + '-' + columnLetter(referenceColumn) + insertedRow
        );
      } else {
        destination.sheet.getRange(insertedRow, remainingColumn).setValue(0);
      }
    }

    return jsonResponse({
      status: 'success',
      numSuscripcion: numSuscripcion,
      message: 'Venta registrada en Google Sheets.'
    });
  } catch (error) {
    return jsonResponse({
      status: 'error',
      message: String(error)
    });
  } finally {
    lock.releaseLock();
  }
}
function probarBusquedaPrecios() {
  const ID_BASE = "1eFOLC8ejl_I-dE1vF7cFEp4JELhMg4o7UcwPx8AwyuU";

  const parte = SpreadsheetApp
    .getActiveSpreadsheet()
    .getSheetByName("Modelos_y_Precios");

  const base = SpreadsheetApp
    .openById(ID_BASE)
    .getSheetByName("BASE_PRECIOS");

  const datosParte = parte.getDataRange().getDisplayValues();
  const datosBase = base.getDataRange().getDisplayValues();

  Logger.log("FILAS PARTE: " + datosParte.length);
  Logger.log("FILAS BASE: " + datosBase.length);

  Logger.log("ENCABEZADOS PARTE:");
  Logger.log(datosParte[0]);

  Logger.log("ENCABEZADOS BASE:");
  Logger.log(datosBase[0]);
}
function probarCoincidenciasPrecios() {
  const ID_BASE = "1eFOLC8ejl_I-dE1vF7cFEp4JELhMg4o7UcwPx8AwyuU";

  const parte = SpreadsheetApp
    .getActiveSpreadsheet()
    .getSheetByName("Modelos_y_Precios");

  const base = SpreadsheetApp
    .openById(ID_BASE)
    .getSheetByName("BASE_PRECIOS");

  const datosParte = parte.getDataRange().getDisplayValues();
  const datosBase = base.getDataRange().getDisplayValues();

  const headersParte = datosParte[0];
  const colMarca = headerIndex(headersParte, ['Marca']);
  const colModelo = headerIndex(headersParte, ['Modelo']);
  const colPlan = headerIndex(headersParte, ['Tipo de Plan']);
  if (colMarca < 0 || colModelo < 0 || colPlan < 0) throw new Error('Faltan encabezados de catálogo para la prueba de coincidencias.');
  const basePrecios = datosBase.slice(1);

  for (let i = 1; i < datosParte.length; i++) {
    const marca = datosParte[i][colMarca];
    const modelo = datosParte[i][colModelo];
    const plan = datosParte[i][colPlan];

    const textoBusqueda = normalizarTexto(
      marca + " " + modelo + " " + plan
    );

    const candidatos = basePrecios.filter(fila => {
      const marcaBase = normalizarTexto(fila[0]);
      const modeloBase = normalizarTexto(fila[2]);
      const planBase = normalizarTexto(fila[3]);

      return (
        marcaBase === normalizarTexto(marca) &&
        (
          textoBusqueda.includes(modeloBase) ||
          modeloBase.includes(normalizarTexto(modelo))
        )
      );
    });

    Logger.log(
      `${i + 1} | ${marca} | ${modelo} | ${plan} | CANDIDATOS: ${candidatos.length}`
    );

    candidatos.forEach(candidato => {
      Logger.log(
        `   → ${candidato[2]} | ${candidato[3]} | ${candidato[4]}`
      );
    });
  }
}
function normalizarTexto(texto) {
  return String(texto || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
function obtenerPrecioAuto(marca, modelo, plan, basePrecios) {
  const marcaNorm = normalizarTexto(marca);
  const modeloNorm = normalizarTexto(modelo);
  const planNorm = normalizarTexto(plan);

  let candidatos = basePrecios.filter(function(fila) {
    return normalizarTexto(fila[0]) === marcaNorm;
  });

  if (!candidatos.length) {
    return {
      precio: "",
      estado: "SIN MARCA"
    };
  }

  // =========================
  // RENAULT
  // =========================

  if (marcaNorm === "renault") {

    if (modeloNorm === "kangoo") {
      if (planNorm.includes("2a") && planNorm.includes("express")) {
        candidatos = candidatos.filter(f =>
          normalizarTexto(f[2]).includes("kangoo ii express 2a")
        );
      } else if (planNorm.includes("5a") && planNorm.includes("express")) {
        candidatos = candidatos.filter(f =>
          normalizarTexto(f[2]).includes("kangoo ii express 5a")
        );
      } else if (planNorm.includes("stepway")) {
        candidatos = candidatos.filter(f =>
          normalizarTexto(f[2]).includes("kangoo ii stepway")
        );
      }
    }

    else if (modeloNorm === "kardian") {
      candidatos = candidatos.filter(f =>
        normalizarTexto(f[2]).includes("kardian")
      );
    }

    else {
      candidatos = candidatos.filter(f =>
        normalizarTexto(f[2]).includes(modeloNorm)
      );
    }
  }

  // =========================
  // PEUGEOT
  // =========================

  else if (marcaNorm === "peugeot") {

    if (modeloNorm === "208") {
      if (planNorm.includes("at")) {
        candidatos = candidatos.filter(f =>
          normalizarTexto(f[2]).includes("208 allure at")
        );
      } else {
        candidatos = candidatos.filter(f =>
          normalizarTexto(f[2]).includes("208 allure mt")
        );
      }
    }

    else if (modeloNorm === "partner") {
      candidatos = candidatos.filter(f =>
        normalizarTexto(f[2]).includes("partner van")
      );
    }

    else if (modeloNorm === "rapid") {
      candidatos = candidatos.filter(f =>
        normalizarTexto(f[2]).includes("partner rapid")
      );
    }

    else {
      candidatos = candidatos.filter(f =>
        normalizarTexto(f[2]).includes(modeloNorm)
      );
    }
  }

  // =========================
  // CITROËN
  // =========================

  else if (marcaNorm === "citroen") {

    if (modeloNorm === "c3 feel") {
      candidatos = candidatos.filter(f =>
        normalizarTexto(f[2]).includes("c3 vti 115 feel")
      );
    }

    else if (modeloNorm === "c3 aircross") {
      candidatos = candidatos.filter(f =>
        normalizarTexto(f[2]).includes("c3 aircross")
      );
    }

    else if (modeloNorm === "basalt") {
      if (planNorm.includes("like")) {
        candidatos = candidatos.filter(f =>
          normalizarTexto(f[2]).includes("basalt vti like")
        );
      } else if (planNorm.includes("feel")) {
        candidatos = candidatos.filter(f =>
          normalizarTexto(f[2]).includes("basalt 1.3 feel")
        );
      }
    }

    else {
      candidatos = candidatos.filter(f =>
        normalizarTexto(f[2]).includes(modeloNorm)
      );
    }
  }

  // =========================
  // OTRAS MARCAS
  // =========================

  else {
    candidatos = candidatos.filter(f =>
      normalizarTexto(f[2]).includes(modeloNorm)
    );
  }

  if (!candidatos.length) {
    return {
      precio: "",
      estado: "SIN COINCIDENCIA"
    };
  }

  // Si hay varias versiones pero todas tienen el mismo precio,
  // para "valor auto" son equivalentes.
  const precios = [...new Set(
    candidatos.map(f => String(f[4]).trim())
  )];

  if (precios.length === 1) {
    return {
      precio: precios[0],
      estado: "OK",
      candidatos: candidatos.length
    };
  }

  return {
    precio: "",
    estado: "AMBIGUO",
    candidatos: candidatos.length,
    detalles: candidatos.map(f => ({
      modelo: f[2],
      plan: f[3],
      precio: f[4]
    }))
  };
}


function probarPreciosAuto() {
  const ID_BASE = "1eFOLC8ejl_I-dE1vF7cFEp4JELhMg4o7UcwPx8AwyuU";

  const parte = SpreadsheetApp
    .getActiveSpreadsheet()
    .getSheetByName("Modelos_y_Precios");

  const base = SpreadsheetApp
    .openById(ID_BASE)
    .getSheetByName("BASE_PRECIOS");

  const datosParte = parte.getDataRange().getDisplayValues();
  const datosBase = base.getDataRange().getDisplayValues();

  const headersParte = datosParte[0];
  const colMarca = headerIndex(headersParte, ['Marca']);
  const colModelo = headerIndex(headersParte, ['Modelo']);
  const colPlan = headerIndex(headersParte, ['Tipo de Plan']);
  if (colMarca < 0 || colModelo < 0 || colPlan < 0) throw new Error('Faltan encabezados de catálogo para la prueba de precios.');
  const basePrecios = datosBase.slice(1);

  Logger.log("===== PRUEBA DE PRECIOS =====");

  for (let i = 1; i < datosParte.length; i++) {

    const marca = datosParte[i][colMarca];
    const modelo = datosParte[i][colModelo];
    const plan = datosParte[i][colPlan];

    const resultado = obtenerPrecioAuto(
      marca,
      modelo,
      plan,
      basePrecios
    );

    Logger.log(
      (i + 1) +
      " | " +
      marca +
      " | " +
      modelo +
      " | " +
      plan +
      " → " +
      resultado.estado +
      " | " +
      resultado.precio
    );

    if (resultado.estado === "AMBIGUO") {
      Logger.log(
        "   ⚠️ " +
        JSON.stringify(resultado.detalles)
      );
    }
  }

  Logger.log("===== FIN PRUEBA =====");
}
function actualizarValoresAuto() {
  const ID_BASE = "1eFOLC8ejl_I-dE1vF7cFEp4JELhMg4o7UcwPx8AwyuU";

  const parte = SpreadsheetApp
    .getActiveSpreadsheet()
    .getSheetByName("Modelos_y_Precios");

  const base = SpreadsheetApp
    .openById(ID_BASE)
    .getSheetByName("BASE_PRECIOS");

  if (!parte) throw new Error("No existe la hoja Modelos_y_Precios");
  if (!base) throw new Error("No existe la hoja BASE_PRECIOS");

  const datosParte = parte.getDataRange().getDisplayValues();
  const datosBase = base.getDataRange().getDisplayValues();

  const encabezados = datosParte[0].map(normalizarTexto);

  const colMarca = encabezados.indexOf("marca");
  const colModelo = encabezados.indexOf("modelo");
  const colPlan = encabezados.indexOf("tipo de plan");
  const colValorAuto = encabezados.indexOf("valor auto");

  if (colMarca < 0) throw new Error("No se encontró la columna Marca");
  if (colModelo < 0) throw new Error("No se encontró la columna Modelo");
  if (colPlan < 0) throw new Error("No se encontró la columna Tipo de Plan");
  if (colValorAuto < 0) throw new Error("No se encontró la columna valor auto");

  const basePrecios = datosBase.slice(1);

  const valores = [];
  let actualizados = 0;
  let sinCoincidencia = 0;
  let ambiguos = 0;

  for (let i = 1; i < datosParte.length; i++) {

    const marca = datosParte[i][colMarca];
    const modelo = datosParte[i][colModelo];
    const plan = datosParte[i][colPlan];

    const resultado = obtenerPrecioAuto(
      marca,
      modelo,
      plan,
      basePrecios
    );

    valores.push([resultado.precio]);

    if (resultado.estado === "OK") {
      actualizados++;
    } else if (resultado.estado === "AMBIGUO") {
      ambiguos++;
      Logger.log(
        "⚠️ AMBIGUO — fila " + (i + 1) +
        " | " + marca + " | " + modelo + " | " + plan
      );
    } else {
      sinCoincidencia++;
      Logger.log(
        "⚠️ SIN COINCIDENCIA — fila " + (i + 1) +
        " | " + marca + " | " + modelo + " | " + plan
      );
    }
  }

  // Escribe ÚNICAMENTE la columna "valor auto"
  parte
    .getRange(2, colValorAuto + 1, valores.length, 1)
    .setValues(valores);

  Logger.log("===== ACTUALIZACIÓN TERMINADA =====");
  Logger.log("Actualizados: " + actualizados);
  Logger.log("Sin coincidencia: " + sinCoincidencia);
  Logger.log("Ambiguos: " + ambiguos);
}
function completarValorAutoFila(fila) {
  const ID_BASE = "1eFOLC8ejl_I-dE1vF7cFEp4JELhMg4o7UcwPx8AwyuU";

  const hoja = SpreadsheetApp
    .getActiveSpreadsheet()
    .getSheetByName("ID Ventas");

  const base = SpreadsheetApp
    .openById(ID_BASE)
    .getSheetByName("Modelos_y_Precios");

  if (!hoja) throw new Error("No existe la hoja ID Ventas");
  if (!base) throw new Error("No existe la hoja Modelos_y_Precios");

  const headers = hoja.getRange(1, 1, 1, hoja.getLastColumn()).getDisplayValues()[0];
  const marcaColumn = headerIndex(headers, ['Marca']) + 1;
  const modeloColumn = headerIndex(headers, ['Modelo']) + 1;
  const planColumn = headerIndex(headers, ['Tipo de Plan']) + 1;
  const valorAutoColumn = headerIndex(headers, ['Valor del auto']) + 1;

  if (marcaColumn < 1 || modeloColumn < 1 || planColumn < 1 || valorAutoColumn < 1) {
    throw new Error('Faltan encabezados requeridos en ID Ventas para completar Valor del auto.');
  }

  const marca = hoja.getRange(fila, marcaColumn).getDisplayValue().trim();
  const modelo = hoja.getRange(fila, modeloColumn).getDisplayValue().trim();
  const plan = hoja.getRange(fila, planColumn).getDisplayValue().trim();

  if (!marca || !modelo || !plan) {
    Logger.log(
      "Fila " + fila +
      " incompleta | Marca: " + marca +
      " | Modelo: " + modelo +
      " | Plan: " + plan
    );
    return;
  }

  const datosBase = base.getDataRange().getDisplayValues();
  const basePrecios = datosBase.slice(1);

  const resultado = obtenerPrecioAuto(
    marca,
    modelo,
    plan,
    basePrecios
  );

  Logger.log(
    "Fila " + fila +
    " | " + marca +
    " | " + modelo +
    " | " + plan +
    " | Resultado: " +
    resultado.estado +
    " | Precio: " +
    resultado.precio
  );

  if (resultado.estado === "OK") {
    hoja.getRange(fila, valorAutoColumn).setValue(resultado.precio);
  }
}
