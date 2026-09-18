export const GOOGLE_APPS_SCRIPT_CODE = `/**
 * =========================================================================
 * PARTE DIARIO DE VENTAS - BACKEND GOOGLE APPS SCRIPT (Codigo.gs)
 * Concesionario Automotriz - Sincronización PWA / Web App
 * =========================================================================
 * 
 * INSTRUCCIONES DE INSTALACIÓN:
 * 1. En tu Google Sheet con las 4 pestañas:
 *    - 'ID Ventas'
 *    - 'Modelos_y_Precios'
 *    - 'Equipos_de_venta'
 *    - 'Origen_datos'
 * 2. Ve a Extensiones > Apps Script.
 * 3. Borra el código existente y pega este archivo completo.
 * 4. Haz clic en "Implementar" (Deploy) > "Nueva implementación" (New deployment).
 * 5. Tipo: "Aplicación web" (Web app).
 * 6. Configuración:
 *    - Descripción: "Parte Diario de Ventas API"
 *    - Ejecutar como: "Yo" (tu cuenta de Google)
 *    - Quién tiene acceso: "Cualquier usuario" (Anyone - permite a los vendedores enviar ventas desde la PWA)
 * 7. Copia la URL generada (termina en /exec) y pégala en los Ajustes de la App.
 */

// Nombres exactos de las pestañas
const SHEETS = {
  DESTINO: 'ID Ventas',
  MODELOS_PRECIOS: 'Modelos_y_Precios',
  EQUIPOS: 'Equipos_de_venta',
  ORIGEN: 'Origen_datos'
};

/**
 * Endpoint GET: Lee las tablas de referencia y suscripciones existentes
 */
function doGet(e) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    
    // 1. Modelos y Precios
    const sheetModelos = ss.getSheetByName(SHEETS.MODELOS_PRECIOS);
    const modelosYPrecios = [];
    if (sheetModelos) {
      const dataModelos = sheetModelos.getDataRange().getValues();
      // Fila 1 es cabecera: Marca | Modelo | Tipo de Plan | Valor Cuota #1 | Cta. Fábrica
      for (let i = 1; i < dataModelos.length; i++) {
        const row = dataModelos[i];
        const marca = String(row[0] || '').trim().toUpperCase();
        const modelo = String(row[1] || '').trim();
        const tipoPlan = String(row[2] || '').trim();
        const valorCuota1 = parseFloat(row[3]) || 0;
        
        if (marca && modelo) {
          modelosYPrecios.push({
            marca: marca,
            modelo: modelo,
            tipoPlan: tipoPlan,
            valorCuota1: valorCuota1
          });
        }
      }
    }

    // 2. Equipos de venta (Cabecera en Fila 18, cada columna es un Supervisor)
    const sheetEquipos = ss.getSheetByName(SHEETS.EQUIPOS);
    const equiposDeVenta = [];
    if (sheetEquipos) {
      const lastRow = sheetEquipos.getLastRow();
      const lastCol = sheetEquipos.getLastColumn();
      
      if (lastRow >= 18 && lastCol >= 1) {
        const range = sheetEquipos.getRange(18, 1, lastRow - 17, lastCol).getValues();
        const headers = range[0]; // Fila 18: Nombres de Supervisores / Equipos
        
        for (let c = 0; c < lastCol; c++) {
          const supervisor = String(headers[c] || '').trim();
          if (supervisor && supervisor.toUpperCase() !== 'EQUIPOS') {
            const vendedores = [];
            for (let r = 1; r < range.length; r++) {
              const vendedor = String(range[r][c] || '').trim();
              if (vendedor) {
                vendedores.push(vendedor);
              }
            }
            if (vendedores.length > 0) {
              equiposDeVenta.push({
                supervisor: supervisor,
                vendedores: vendedores
              });
            }
          }
        }
      }
    }

    // 3. Origen de datos (Columna AGP)
    const sheetOrigen = ss.getSheetByName(SHEETS.ORIGEN);
    const origenesDatos = [];
    if (sheetOrigen) {
      const dataOrigen = sheetOrigen.getDataRange().getValues();
      for (let i = 1; i < dataOrigen.length; i++) {
        const agp = String(dataOrigen[i][0] || '').trim();
        if (agp) {
          origenesDatos.push(agp);
        }
      }
    }

    // 4. Suscripciones existentes en 'ID Ventas' para validación de clave única
    const sheetDestino = ss.getSheetByName(SHEETS.DESTINO);
    const suscripcionesExistentes = [];
    if (sheetDestino && sheetDestino.getLastRow() > 1) {
      const dataDestino = sheetDestino.getRange(2, 1, sheetDestino.getLastRow() - 1, 1).getValues();
      for (let i = 0; i < dataDestino.length; i++) {
        const num = String(dataDestino[i][0] || '').trim();
        if (num) suscripcionesExistentes.push(num);
      }
    }

    const payload = {
      status: 'success',
      data: {
        modelosYPrecios: modelosYPrecios,
        equiposDeVenta: equiposDeVenta,
        origenesDatos: origenesDatos,
        suscripcionesExistentes: suscripcionesExistentes,
        lastUpdated: new Date().toISOString()
      }
    };

    return ContentService
      .createTextOutput(JSON.stringify(payload))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: 'error', message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Endpoint POST: Registra una nueva venta con N° Suscripción como PRIMARY KEY
 */
function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.tryLock(10000);
  
  try {
    const rawData = e.postData ? e.postData.contents : '';
    const body = JSON.parse(rawData);
    
    const numSuscripcion = String(body.numSuscripcion || '').trim();
    if (!numSuscripcion) {
      return ContentService
        .createTextOutput(JSON.stringify({
          status: 'error',
          message: 'El N° de Suscripción es obligatorio (Clave Principal).'
        }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheetDestino = ss.getSheetByName(SHEETS.DESTINO);
    
    if (!sheetDestino) {
      sheetDestino = ss.insertSheet(SHEETS.DESTINO);
      // Cabecera: N° Suscripción es la Clave Principal (Columna 1)
      sheetDestino.appendRow([
        'N° Suscripción', 'Fecha', 'Cliente', 'Marca', 'Modelo',
        'Tipo de Plan', 'Seña o Completa', 'Valor Cuota #1', 'Monto Cobrado',
        'Autorizó Descuento', 'Cta. Fábrica', 'Sobrepauta', '¿Entrega Usado?',
        'Modelo Usado', 'Año Usado', 'Valor Infoauto', 'Valor Toma',
        'Equipo de Venta', 'Vendedor', 'Origen'
      ]);
    }

    // VALIDACIÓN DE CLAVE ÚNICA (PRIMARY KEY)
    const lastRow = sheetDestino.getLastRow();
    if (lastRow > 1) {
      const existingSubs = sheetDestino.getRange(2, 1, lastRow - 1, 1).getValues();
      for (let i = 0; i < existingSubs.length; i++) {
        if (String(existingSubs[i][0]).trim() === numSuscripcion) {
          return ContentService
            .createTextOutput(JSON.stringify({
              status: 'error',
              message: 'El N° de Suscripción ' + numSuscripcion + ' ya existe en la base de datos (clave duplicada).'
            }))
            .setMimeType(ContentService.MimeType.JSON);
        }
      }
    }

    // Fila con N° Suscripción como Col 1 y Autorizó Descuento incluido
    const rowToAppend = [
      numSuscripcion,                            // Col 1: N° Suscripción (PRIMARY KEY)
      body.fecha || Utilities.formatDate(new Date(), 'GMT-3', 'yyyy-MM-dd'), // Col 2: Fecha
      body.cliente || '',                        // Col 3: Cliente
      body.marca || '',                          // Col 4: Marca
      body.modelo || '',                         // Col 5: Modelo
      body.tipoPlan || '',                       // Col 6: Tipo de Plan
      body.senaOCompleta || 'Completa',          // Col 7: Seña, Completa o Descuento Aprobado
      body.valorCuota1 || 0,                     // Col 8: Valor Cuota #1 (Automático)
      body.montoCobrado || 0,                    // Col 9: Monto Cobrado
      body.senaOCompleta === 'Descuento Aprobado' ? (body.autorizoDescuento || '') : '', // Col 10: Autorizó Descuento
      '',                                        // Col 11: Cta. Fábrica (Fórmula interna)
      '',                                        // Col 12: Sobrepauta (Fórmula interna)
      body.entregaUsado || 'Sí',                 // Col 13: ¿Entrega Usado? (Default: Sí)
      body.entregaUsado === 'Sí' ? (body.modeloUsado || '') : '',     // Col 14: Modelo Usado
      body.entregaUsado === 'Sí' ? (body.anoUsado || '') : '',        // Col 15: Año Usado
      body.entregaUsado === 'Sí' ? (body.valorInfoauto || 0) : '',    // Col 16: Valor Infoauto
      body.entregaUsado === 'Sí' ? (body.valorToma || 0) : '',        // Col 17: Valor Toma
      body.equipoVenta || '',                    // Col 18: Equipo de Venta
      body.vendedor || '',                       // Col 19: Vendedor
      body.origenDato || ''                      // Col 20: Origen
    ];

    sheetDestino.appendRow(rowToAppend);

    const response = {
      status: 'success',
      numSuscripcion: numSuscripcion,
      message: 'Venta registrada exitosamente con suscripción ' + numSuscripcion,
      rowNumber: sheetDestino.getLastRow()
    };

    return ContentService
      .createTextOutput(JSON.stringify(response))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: 'error', message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}
`;
