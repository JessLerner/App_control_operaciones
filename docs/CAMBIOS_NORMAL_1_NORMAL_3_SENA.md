# Normal 1, Normal 3, Ultra y saldo de seña

## Archivos modificados

| Archivo | Finalidad |
| --- | --- |
| `src/types.ts` | Define las modalidades persistidas `normal_1`, `normal_3` y `ultra`; conserva los valores históricos `Normal`, `Ultra` y vacío. |
| `src/components/ParteDiarioForm.tsx` | Muestra Normal/Ultra, solicita 1 o 3 pagos para Normal y toma el importe comercial correcto. Mantiene `Cuota 1` separado para fábrica. |
| `src/services/sheetsService.ts` | Normaliza el catálogo remoto sin mezclar modalidades, envía `cuota1` y no reclasifica ventas históricas. |
| `src/components/RecentSalesDrawer.tsx` | Conserva la modalidad almacenada en vistas y exportaciones. |
| `src/services/appsScriptCode.ts` | Muestra el Apps Script local integrado, sin una copia de código paralela. |
| `apps-script/Codigo.gs` | Código completo listo para pegar en Apps Script. Lee el catálogo, valida modalidades y escribe la fórmula de señas. |
| `scripts/verify-quota-contract.mjs` | Verificación local con datos ficticios del contrato de catálogo, modalidades y seña. |

## Funcionamiento

- **Normal + 1 pago** usa `Normal 1` y guarda `normal_1` en `Normal/Ultra`.
- **Normal + 3 pagos** usa `Normal 3` y guarda `normal_3`.
- **Ultra** usa `Ultra`, guarda `ultra` y exige cobro completo.
- Para Normal, la cantidad de pagos inicia vacía. Sin elegirla no hay importe de referencia ni se permite guardar.
- `Cuota 1` se lee como importe independiente de fábrica. No se usa como respaldo de Normal 1, Normal 3 ni Ultra.

## Catálogo

`Modelos_y_Precios` se interpreta por encabezado, con estos campos:

`Marca | Vehículo | Modelo | Tipo de Plan | Normal 1 | Normal 3 | Ultra | Cuota 1 | Valor auto`

Los valores vacíos, cero o inválidos no quedan disponibles como precios comerciales. Cada combinación de Modelo y Tipo de Plan se mantiene separada.

## ID Ventas y seña

No se agregan ni se reordenan columnas. Las referencias se resuelven por encabezado.

- `Normal/Ultra`: guarda `normal_1`, `normal_3` o `ultra` para ventas nuevas.
- `Valor Cuota #1` (J): importe comercial de referencia seleccionado.
- `Monto Cobrado` (K): importe cargado por el supervisor.
- `Monto Restante seña` (L):
  - Seña: fórmula dinámica `=K[fila]-J[fila]`.
  - Completa o Descuento Aprobado: `0`.
- `Cta. Fábrica` y los campos posteriores conservan su posición real, resuelta por encabezado.

También se corrigieron referencias fijas en los utilitarios de precios y en `completarValorAutoFila()`: ya no escribe por el antiguo índice 13.

## Compatibilidad histórica

Las ventas existentes con `Normal`, `Ultra` o modalidad vacía se leen tal como fueron guardadas. No se migran ni se reenvían con una modalidad nueva.

## Problemas reconocibles después de publicar

| Síntoma | Causa probable | Acción |
| --- | --- | --- |
| `Indicá normal_1, normal_3 o ultra.` | La Web App sigue usando el Apps Script anterior o se copió código incompleto. | Reemplazar todo `Código.gs` con `apps-script/Codigo.gs` y actualizar la implementación existente. |
| Normal no muestra importe | Falta `Normal 1` o `Normal 3`, o el valor no es numérico/positivo para ese modelo y plan. | Revisar el catálogo sin usar otra modalidad como reemplazo. |
| Ultra rechaza el registro | Monto Cobrado es menor al importe Ultra. | Registrar pago completo o corregir el importe/cobro. |
| No se calcula saldo de seña | Falta o cambió el encabezado `Monto Restante seña`, `Monto Cobrado` o `Valor Cuota #1`. | Restaurar esos encabezados exactamente; no modificar filas históricas. |

## Reversión

Antes de pegar el nuevo código, conservar una copia del contenido actual del editor. Para volver atrás, reemplazar todo el contenido del editor con el respaldo literal `docs/backups/Codigo.gs.activo.2026-11-12.gs` y, en **Implementar > Administrar implementaciones**, editar la misma Web App y crear una nueva versión con ese código. La URL se conserva al editar la implementación existente.
