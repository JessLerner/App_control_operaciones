import { readFileSync } from 'node:fs';
import { strict as assert } from 'node:assert';
import vm from 'node:vm';

const appScript = readFileSync('apps-script/Codigo.gs', 'utf8');
const form = readFileSync('src/components/ParteDiarioForm.tsx', 'utf8');
const service = readFileSync('src/services/sheetsService.ts', 'utf8');

for (const header of ['Normal 1', 'Normal 3', 'Ultra', 'Cuota 1']) {
  assert.match(appScript, new RegExp(`headerIndex\\(headers, \\['${header}'\\]\\)`));
}
assert.match(appScript, /body\.senaOCompleta === 'Seña'/);
assert.match(appScript, /setFormula\(/);
assert.match(appScript, /Monto Restante seña/);
assert.match(appScript, /columnLetter\(chargedColumn\).*columnLetter\(referenceColumn\)/s);
assert.match(form, /select-cantidad-pagos/);
assert.match(form, /const availableMarcas = useMemo/);
assert.doesNotMatch(form, /MARCAS_DISPONIBLES/);
assert.match(form, /normal_1/);
assert.match(form, /normal_3/);
assert.match(form, /modalidadCuota === 'ultra'/);
assert.match(service, /modalidadCuota: String\(raw\.modalidadCuota \|\| ''\)/);

const sandbox = {
  ContentService: { MimeType: { JSON: 'json' }, createTextOutput: (text) => ({ text, setMimeType() { return this; } }) },
  LockService: { getScriptLock: () => ({ tryLock: () => true, releaseLock() {} }) },
};
vm.runInNewContext(`${appScript}\nglobalThis.__getModelos = getModelos; globalThis.__columnLetter = columnLetter; globalThis.__fieldForHeader = fieldForHeader; globalThis.__doPost = doPost;`, sandbox);
const catalogRows = [
  ['Marca', 'Vehículo', 'Modelo', 'Tipo de Plan', 'Normal 1', 'Normal 3', 'Ultra', 'Cuota 1', 'Valor auto'],
  ['FIAT', 'Cronos', 'Cronos Drive', '70/30', '900000', '1200000', '1500000', '450000', '20000000'],
  ['PEUGEOT', '208', '208 Active', '100%', '', 'invalido', '1300000', '500000', '18000000'],
];
const fakeSheet = { getLastRow: () => catalogRows.length, getDataRange: () => ({ getValues: () => catalogRows }) };
const [fiat, peugeot] = sandbox.__getModelos({ getSheetByName: () => fakeSheet });
assert.deepEqual({ normal1: fiat.normal1, normal3: fiat.normal3, ultra: fiat.ultra, cuota1: fiat.cuota1 }, { normal1: 900000, normal3: 1200000, ultra: 1500000, cuota1: 450000 });
assert.equal(peugeot.normal1, undefined);
assert.equal(peugeot.normal3, undefined);
assert.equal(sandbox.__columnLetter(10), 'J');
assert.equal(sandbox.__columnLetter(11), 'K');
assert.equal(sandbox.__fieldForHeader('Monto Restante seña'), 'montoRestanteSena');
assert.equal(sandbox.__fieldForHeader('Seña o Completa'), 'senaOCompleta');
assert.equal(sandbox.__fieldForHeader('Normal/Ultra'), 'modalidadCuota');

const saleHeaders = ['Fecha', 'Cliente', 'N° Suscripción', 'Marca', 'Modelo', 'Tipo de Plan', 'Normal/Ultra', 'Seña o Completa', 'Autorizó Descuento', 'Valor Cuota #1', 'Monto Cobrado', 'Monto Restante seña', 'Cta. Fábrica'];
const writes = { rows: [], formulas: [], values: [] };
const destination = {
  getLastColumn: () => saleHeaders.length,
  getLastRow: () => writes.rows.length + 1,
  getRange: (row, column) => ({
    getValues: () => row === 1 ? [saleHeaders] : [],
    setValue: (value) => writes.values.push({ row, column, value }),
    setFormula: (formula) => writes.formulas.push({ row, column, formula }),
  }),
  appendRow: (row) => writes.rows.push(row),
};
sandbox.SpreadsheetApp = { getActiveSpreadsheet: () => ({ getSheetByName: (name) => name === 'ID Ventas' ? destination : null }) };
sandbox.getUsadoPricing = () => ({ anioCorte: 2016, descuentoHastaCorte: 0.3, descuentoDesdeCorte: 0.25 });
sandbox.getValorAuto = () => '';
sandbox.getVehiculo = () => 'Cronos';
const response = sandbox.__doPost({ postData: { contents: JSON.stringify({ numSuscripcion: 'FICT-001', modalidadCuota: 'normal_3', senaOCompleta: 'Seña', debitoAutomatico: 'Sí', montoCobrado: 400000, valorCuota1: 950000, cuota1: 450000, entregaUsado: 'No' }) } });
assert.equal(JSON.parse(response.text).status, 'success');
assert.equal(writes.rows.length, 1);
assert.deepEqual(writes.formulas, [{ row: 2, column: 12, formula: '=K2-J2' }]);

const normalOneResponse = sandbox.__doPost({ postData: { contents: JSON.stringify({ numSuscripcion: 'FICT-002', modalidadCuota: 'normal_1', senaOCompleta: 'Descuento Aprobado', debitoAutomatico: 'No', montoCobrado: 700000, valorCuota1: 900000, cuota1: 450000, entregaUsado: 'No' }) } });
assert.equal(JSON.parse(normalOneResponse.text).status, 'success');
assert.deepEqual(writes.values.at(-1), { row: 3, column: 12, value: 0 });

const rejectedUltraResponse = sandbox.__doPost({ postData: { contents: JSON.stringify({ numSuscripcion: 'FICT-003', modalidadCuota: 'ultra', senaOCompleta: 'Completa', debitoAutomatico: 'No', montoCobrado: 1499999, valorCuota1: 1500000, cuota1: 450000, entregaUsado: 'No' }) } });
assert.equal(JSON.parse(rejectedUltraResponse.text).status, 'error');
assert.equal(writes.rows.length, 2);

const completeResponse = sandbox.__doPost({ postData: { contents: JSON.stringify({ numSuscripcion: 'FICT-004', modalidadCuota: 'ultra', senaOCompleta: 'Completa', debitoAutomatico: 'No', montoCobrado: 1500000, valorCuota1: 1500000, cuota1: 450000, entregaUsado: 'No' }) } });
assert.equal(JSON.parse(completeResponse.text).status, 'success');
assert.deepEqual(writes.values.at(-1), { row: 4, column: 12, value: 0 });

console.log('Contrato de modalidades y seña verificado con datos ficticios.');
