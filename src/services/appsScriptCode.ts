export const GOOGLE_APPS_SCRIPT_CODE = `/**
 * =========================================================================
 * PARTE DIARIO DE VENTAS - BACKEND GOOGLE APPS SCRIPT (Codigo.gs)
 * Concesionario Automotriz - Sincronización PWA / Web App
 * =========================================================================
 * 
 * INSTRUCCIONES DE ACTUALIZACIÓN RÁPIDA:
 * 1. En tu Google Sheets, abre el menú: Extensiones > Apps Script.
 * 2. Selecciona todo el código existente en 'Codigo.gs', bórralo y pega este código completo.
 * 3. Haz clic en el icono de disco "Guardar proyecto" (o Ctrl+S).
 * 4. Haz clic en "Implementar" (Deploy) > "Administrar implementaciones" (Manage deployments).
 * 5. Haz clic en el lápiz (Editar), selecciona Versión: "Nueva versión" (New version) y pulsa "Implementar".
 *    (O bien "Nueva implementación" > "Aplicación web" > Quién tiene acceso: "Cualquier usuario").
 * 
 * ¡Listo! Ahora el script creará automáticamente las columnas 'Cta. Fábrica' y 'Sobrepauta'
 * si no existían en 'ID Ventas' y completará los valores en cada nueva venta.
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
      if (dataModelos.length > 1) {
        // Localizar la fila de cabeceras dinámicamente
        var headerRowIdx = 0;
        for (var r = 0; r < Math.min(6, dataModelos.length); r++) {
          var rowStr = dataModelos[r].join(' ').toLowerCase();
          if (rowStr.includes('marca') || rowStr.includes('modelo')) {
            headerRowIdx = r;
            break;
          }
        }

        var headers = dataModelos[headerRowIdx].map(function(h) {
          return String(h || '').trim().toLowerCase();
        });

        var colMarca = -1, colModelo = -1, colPlan = -1, colCuota1 = -1, colCtaFabrica = -1;
        for (var c = 0; c < headers.length; c++) {
          var h = headers[c];
          if (colMarca === -1 && h.includes('marca')) {
            colMarca = c;
          } else if (colModelo === -1 && h.includes('modelo')) {
            colModelo = c;
          } else if (colPlan === -1 && (h.includes('plan') || h.includes('tipo'))) {
            colPlan = c;
          } else if (colCtaFabrica === -1 && (h.includes('fáb') || h.includes('fab') || h.includes('terminal') || h.includes('costo'))) {
            colCtaFabrica = c;
          } else if (colCuota1 === -1 && (h.includes('cuota') || h.includes('valor') || h.includes('lista') || h.includes('precio') || h.includes('cta'))) {
            colCuota1 = c;
          }
        }

        if (colMarca === -1) colMarca = 0;
        if (colModelo === -1) colModelo = 1;
        if (colPlan === -1) colPlan = 2;
        if (colCuota1 === -1) colCuota1 = 3;
        if (colCtaFabrica === -1) {
          // Si no hay columna explícita con nombre Fábrica, buscar si hay una 5ta columna (índice 4)
          colCtaFabrica = headers.length > 4 ? 4 : colCuota1;
        }

        for (var i = headerRowIdx + 1; i < dataModelos.length; i++) {
          var row = dataModelos[i];
          var marca = String(row[colMarca] || '').trim().toUpperCase();
          var modelo = String(row[colModelo] || '').trim();
          var tipoPlan = String(row[colPlan] || '').trim();
          var valorCuota1 = parseFloat(String(row[colCuota1] || '').replace(/[^0-9.-]/g, '')) || 0;
          
          var rawCtaFab = row[colCtaFabrica];
          var ctaFabrica = parseFloat(String(rawCtaFab || '').replace(/[^0-9.-]/g, '')) || 0;
          if (!ctaFabrica && valorCuota1) {
            ctaFabrica = valorCuota1;
          }

          if (marca && modelo) {
            modelosYPrecios.push({
              marca: marca,
              modelo: modelo,
              tipoPlan: tipoPlan,
              valorCuota1: valorCuota1,
              ctaFabrica: ctaFabrica
            });
          }
        }
      }
    }

    // 2. Equipos de venta (Cabecera en Fila 18 o dinámica)
    const sheetEquipos = ss.getSheetByName(SHEETS.EQUIPOS);
    const equiposDeVenta = [];
    if (sheetEquipos) {
      const lastRow = sheetEquipos.getLastRow();
      const lastCol = sheetEquipos.getLastColumn();
      
      var equipHeaderRow = 18;
      // Si la fila 18 no tiene datos, buscar la primera fila no vacía
      if (lastRow < 18) {
        equipHeaderRow = 1;
      }

      if (lastRow >= equipHeaderRow && lastCol >= 1) {
        const range = sheetEquipos.getRange(equipHeaderRow, 1, lastRow - equipHeaderRow + 1, lastCol).getValues();
        const headers = range[0];
        
        for (let c = 0; c < lastCol; c++) {
          const supervisor = String(headers[c] || '').trim();
          if (supervisor && supervisor.toUpperCase() !== 'EQUIPOS' && supervisor.toUpperCase() !== 'SUPERVISOR') {
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
 * Endpoint POST: Registra una nueva venta con asignación inteligente de columnas
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

    // RESOLVER CTA. FÁBRICA Y SOBREPAUTA
    var finalCtaFabrica = Number(body.ctaFabrica) || Number(body.cta_fabrica) || Number(body.cuotaFabrica) || 0;
    
    // Si no vino en el body o es 0, buscarla directamente en la hoja Modelos_y_Precios del spreadsheet
    if (!finalCtaFabrica && body.marca && body.modelo) {
      var sheetModelos = ss.getSheetByName(SHEETS.MODELOS_PRECIOS);
      if (sheetModelos) {
        var mRange = sheetModelos.getDataRange().getValues();
        for (var m = 1; m < mRange.length; m++) {
          var rowM = mRange[m];
          var rowMarca = String(rowM[0] || '').trim().toUpperCase();
          var rowModelo = String(rowM[1] || '').trim().toLowerCase();
          var rowPlan = String(rowM[2] || '').trim().toLowerCase();
          
          if (rowMarca === String(body.marca || '').trim().toUpperCase() &&
              rowModelo === String(body.modelo || '').trim().toLowerCase()) {
            if (!body.tipoPlan || rowPlan === String(body.tipoPlan || '').trim().toLowerCase()) {
              var fabVal = parseFloat(String(rowM[4] !== undefined && rowM[4] !== '' ? rowM[4] : rowM[3] || 0).replace(/[^0-9.-]/g, '')) || 0;
              if (fabVal > 0) {
                finalCtaFabrica = fabVal;
                break;
              }
            }
          }
        }
      }
    }
    
    if (!finalCtaFabrica) {
      finalCtaFabrica = Number(body.valorCuota1) || 0;
    }

    var finalMontoCobrado = Number(body.montoCobrado) || 0;
    var finalSobrepauta = (body.sobrepauta !== undefined && body.sobrepauta !== '')
      ? Number(body.sobrepauta)
      : (finalMontoCobrado - finalCtaFabrica);

    // AUTO-CURACIÓN Y ASIGNACIÓN DINÁMICA DE CABECERAS
    var lastCol = Math.max(1, sheetDestino.getLastColumn());
    var rawHeaders = [];
    if (sheetDestino.getLastRow() >= 1) {
      rawHeaders = sheetDestino.getRange(1, 1, 1, lastCol).getValues()[0].map(function(h) {
        return String(h || '').trim();
      });
    }

    // Si la hoja está completamente vacía, insertar todas las cabeceras estándar
    if (rawHeaders.length === 0 || !rawHeaders.some(function(h) { return h.length > 0; })) {
      rawHeaders = [
        'N° Suscripción', 'Fecha', 'Cliente', 'Marca', 'Modelo',
        'Tipo de Plan', 'Seña o Completa', 'Valor Cuota #1', 'Monto Cobrado',
        'Autorizó Descuento', 'Cta. Fábrica', 'Sobrepauta', '¿Entrega Usado?',
        'Modelo Usado', 'Año Usado', 'Valor Infoauto', 'Cotización Sugerida', 'Valor Toma',
        'Equipo de Venta', 'Vendedor', 'Origen'
      ];
      sheetDestino.getRange(1, 1, 1, rawHeaders.length).setValues([rawHeaders]);
    } else {
      // Si la hoja ya existía, comprobar si faltan las columnas 'Cta. Fábrica' y 'Sobrepauta'
      var hasCtaFab = false;
      var hasSobrepauta = false;
      var hasCotizSug = false;

      for (var k = 0; k < rawHeaders.length; k++) {
        var hNorm = rawHeaders[k].toLowerCase();
        if (hNorm.includes('fábrica') || hNorm.includes('fabrica') || (hNorm.includes('cta') && !hNorm.includes('cuota #1'))) {
          hasCtaFab = true;
        }
        if (hNorm.includes('sobrepauta')) {
          hasSobrepauta = true;
        }
        if (hNorm.includes('sugerida') || hNorm.includes('cotiz')) {
          hasCotizSug = true;
        }
      }

      // Añadir automáticamente las columnas faltantes al final de la fila 1
      var nextHeaderCol = rawHeaders.length + 1;
      if (!hasCtaFab) {
        sheetDestino.getRange(1, nextHeaderCol).setValue('Cta. Fábrica');
        rawHeaders.push('Cta. Fábrica');
        nextHeaderCol++;
      }
      if (!hasSobrepauta) {
        sheetDestino.getRange(1, nextHeaderCol).setValue('Sobrepauta');
        rawHeaders.push('Sobrepauta');
        nextHeaderCol++;
      }
      if (!hasCotizSug) {
        sheetDestino.getRange(1, nextHeaderCol).setValue('Cotización Sugerida');
        rawHeaders.push('Cotización Sugerida');
        nextHeaderCol++;
      }
    }

    // CONSTRUIR LA FILA EXACTA SEGÚN CADA NOMBRE DE CABECERA
    var rowToAppend = new Array(rawHeaders.length).fill('');
    for (var colIdx = 0; colIdx < rawHeaders.length; colIdx++) {
      var colHeader = rawHeaders[colIdx].toLowerCase();

      if (colHeader.includes('suscrip')) {
        rowToAppend[colIdx] = numSuscripcion;
      } else if (colHeader.includes('fecha')) {
        rowToAppend[colIdx] = body.fecha || Utilities.formatDate(new Date(), 'GMT-3', 'yyyy-MM-dd');
      } else if (colHeader.includes('cliente')) {
        rowToAppend[colIdx] = body.cliente || '';
      } else if (colHeader.includes('marca')) {
        rowToAppend[colIdx] = body.marca || '';
      } else if (colHeader.includes('modelo') && !colHeader.includes('usado')) {
        rowToAppend[colIdx] = body.modelo || '';
      } else if (colHeader.includes('plan') || colHeader.includes('tipo')) {
        rowToAppend[colIdx] = body.tipoPlan || '';
      } else if (colHeader.includes('seña') || colHeader.includes('completa') || colHeader.includes('condic')) {
        rowToAppend[colIdx] = body.senaOCompleta || 'Completa';
      } else if (colHeader.includes('cuota') && !colHeader.includes('fáb') && !colHeader.includes('fab') && !colHeader.includes('cta')) {
        rowToAppend[colIdx] = Number(body.valorCuota1) || 0;
      } else if (colHeader.includes('cobrado') || colHeader.includes('monto')) {
        rowToAppend[colIdx] = finalMontoCobrado;
      } else if (colHeader.includes('autoriz')) {
        rowToAppend[colIdx] = body.senaOCompleta === 'Descuento Aprobado' ? (body.autorizoDescuento || '') : '';
      } else if (colHeader.includes('fábrica') || colHeader.includes('fabrica') || (colHeader.includes('cta') && !colHeader.includes('cuota #1'))) {
        rowToAppend[colIdx] = finalCtaFabrica;
      } else if (colHeader.includes('sobrepauta')) {
        rowToAppend[colIdx] = finalSobrepauta;
      } else if (colHeader.includes('entrega') || (colHeader.includes('usado') && colHeader.includes('?'))) {
        rowToAppend[colIdx] = body.entregaUsado || 'No';
      } else if (colHeader.includes('modelo') && colHeader.includes('usado')) {
        rowToAppend[colIdx] = body.entregaUsado === 'Sí' ? (body.modeloUsado || '') : '';
      } else if (colHeader.includes('año') || colHeader.includes('ano')) {
        rowToAppend[colIdx] = body.entregaUsado === 'Sí' ? (body.anoUsado || '') : '';
      } else if (colHeader.includes('infoauto')) {
        rowToAppend[colIdx] = body.entregaUsado === 'Sí' ? (Number(body.valorInfoauto) || 0) : '';
      } else if (colHeader.includes('sugerida') || colHeader.includes('cotiz')) {
        rowToAppend[colIdx] = body.entregaUsado === 'Sí'
          ? (Number(body.cotizacionSugerida) || Math.round((Number(body.valorInfoauto) || 0) * 0.7))
          : '';
      } else if (colHeader.includes('toma')) {
        rowToAppend[colIdx] = body.entregaUsado === 'Sí' ? (Number(body.valorToma) || 0) : '';
      } else if (colHeader.includes('equipo') || colHeader.includes('supervisor')) {
        rowToAppend[colIdx] = body.equipoVenta || '';
      } else if (colHeader.includes('vendedor')) {
        rowToAppend[colIdx] = body.vendedor || '';
      } else if (colHeader.includes('origen')) {
        rowToAppend[colIdx] = body.origenDato || '';
      }
    }

    sheetDestino.appendRow(rowToAppend);

    const response = {
      status: 'success',
      numSuscripcion: numSuscripcion,
      ctaFabrica: finalCtaFabrica,
      sobrepauta: finalSobrepauta,
      message: 'Venta registrada exitosamente con suscripción ' + numSuscripcion + ' (Cta. Fábrica: ' + finalCtaFabrica + ', Sobrepauta: ' + finalSobrepauta + ')',
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
