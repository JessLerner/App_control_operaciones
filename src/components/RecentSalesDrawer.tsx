import React, { useEffect } from 'react';
import {
  X,
  History,
  CheckCircle,
  RefreshCw,
  Download,
  Car,
  Hash,
} from 'lucide-react';
import { VentaRecord } from '../types';
import { formatCurrency, formatDateLegible } from '../utils/formatters';

interface RecentSalesDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  sales: VentaRecord[];
  onSyncPending: () => void;
  isSyncing: boolean;
}

export const RecentSalesDrawer: React.FC<RecentSalesDrawerProps> = ({
  isOpen,
  onClose,
  sales,
  onSyncPending,
  isSyncing,
}) => {
  // Cerrar con Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const pendingSales = sales.filter((s) => s.syncStatus !== 'synced');

  const exportToCSV = () => {
    if (sales.length === 0) return;

    const headers = [
      'N° Suscripción (PK)',
      'Fecha',
      'Cliente',
      'Marca',
      'Modelo',
      'Tipo de Plan',
      'Seña o Completa',
      'Autorizó Descuento',
      'Valor Cuota #1',
      'Cta. Fábrica',
      'Monto Cobrado',
      'Sobrepauta',
      'Entrega Usado',
      'Modelo Usado',
      'Año Usado',
      'Valor Infoauto',
      'Cotización Sugerida',
      'Valor Toma',
      'Equipo de Venta',
      'Vendedor',
      'Origen',
      'Estado Sync',
    ];

    const rows = sales.map((s) => [
      `"${s.numSuscripcion}"`,
      `"${s.fecha}"`,
      `"${s.cliente.replace(/"/g, '""')}"`,
      `"${s.marca}"`,
      `"${s.modelo.replace(/"/g, '""')}"`,
      `"${s.tipoPlan}"`,
      `"${s.senaOCompleta}"`,
      `"${(s.autorizoDescuento || '').replace(/"/g, '""')}"`,
      s.valorCuota1 || 0,
      s.ctaFabrica !== undefined ? s.ctaFabrica : (s.valorCuota1 || 0),
      s.montoCobrado || 0,
      s.sobrepauta !== undefined ? s.sobrepauta : (s.montoCobrado || 0) - (s.ctaFabrica || s.valorCuota1 || 0),
      `"${s.entregaUsado}"`,
      `"${(s.modeloUsado || '').replace(/"/g, '""')}"`,
      s.anoUsado || '',
      s.valorInfoauto || '',
      s.cotizacionSugerida || (s.valorInfoauto ? Math.round(Number(s.valorInfoauto) * 0.7) : ''),
      s.valorToma || '',
      `"${s.equipoVenta}"`,
      `"${s.vendedor}"`,
      `"${s.origenDato}"`,
      `"${s.syncStatus}"`,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(';'), ...rows.map((e) => e.join(';'))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `parte_diario_ventas_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      className="fixed inset-0 z-50 flex items-center justify-end bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="h-full w-full max-w-md bg-slate-900 border-l border-slate-800 p-5 shadow-2xl flex flex-col text-slate-100 animate-in slide-from-right duration-300"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400">
              <History className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                Ventas Registradas ({sales.length})
              </h2>
              <p className="text-xs text-slate-400">
                Historial compartido desde Google Sheets
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Action Bar */}
        <div className="mt-3 flex items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
          {pendingSales.length > 0 ? (
            <button
              type="button"
              onClick={onSyncPending}
              disabled={isSyncing}
              id="btn-sincronizar-ventas"
              className="flex items-center gap-1.5 rounded-lg bg-amber-500/20 border border-amber-500/40 px-3 py-1.5 text-xs font-bold text-amber-300 hover:bg-amber-500/30 transition active:scale-95 disabled:opacity-50"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${isSyncing ? 'animate-spin' : ''}`}
              />
              <span>Sincronizar {pendingSales.length} Pendiente(s)</span>
            </button>
          ) : (
            <div
              id="badge-estado-sincronizado"
              className="flex items-center gap-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 px-3 py-1.5 text-xs font-semibold text-emerald-400"
            >
              <CheckCircle className="h-4 w-4 text-emerald-400 shrink-0" />
              <span>Todo sincronizado</span>
            </div>
          )}

          {sales.length > 0 && (
            <button
              type="button"
              onClick={exportToCSV}
              id="btn-exportar-csv"
              className="flex items-center gap-1 rounded-lg bg-slate-800 border border-slate-700 px-2.5 py-1.5 text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-700 transition ml-auto"
            >
              <Download className="h-3.5 w-3.5" />
              <span>CSV</span>
            </button>
          )}
        </div>

        {/* List of Sales */}
        <div className="mt-3 flex-1 overflow-y-auto space-y-3 pr-1">
          {sales.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center text-slate-500">
              <Car className="h-10 w-10 mb-2 opacity-30" />
              <p className="text-xs">No hay ventas registradas aún.</p>
              <p className="text-[11px] text-slate-600 mt-1">
                Completa el formulario para registrar la primera venta.
              </p>
            </div>
          ) : (
            sales.map((sale) => (
              <div
                key={sale.numSuscripcion}
                className="rounded-xl border border-slate-800 bg-slate-950/60 p-3.5 text-xs space-y-2 hover:border-slate-700 transition"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-emerald-400 flex items-center gap-1">
                    <Hash className="h-3.5 w-3.5" />
                    {sale.numSuscripcion}
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                      sale.syncStatus === 'synced'
                        ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                        : 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                    }`}
                  >
                    {sale.syncStatus === 'synced' ? 'Sincronizado' : 'Pendiente'}
                  </span>
                </div>

                <div className="font-semibold text-white text-sm">
                  {sale.cliente}
                </div>

                <div className="text-slate-300">
                  <span className="text-emerald-300 font-medium">
                    {sale.marca} {sale.modelo}
                  </span>{' '}
                  &bull; {sale.tipoPlan} ({sale.senaOCompleta}
                  {sale.autorizoDescuento ? ` - Aut: ${sale.autorizoDescuento}` : ''})
                </div>

                <div className="pt-1 border-t border-slate-800/80 space-y-1 text-[11px] text-slate-400">
                  <div className="flex items-center justify-between">
                    <span>
                      Cuota 1: <strong className="text-slate-200">{formatCurrency(sale.valorCuota1)}</strong>
                    </span>
                    <span className="font-mono font-bold text-emerald-400 text-xs">
                      Cobrado: {formatCurrency(sale.montoCobrado)}
                    </span>
                  </div>
                </div>

                {sale.entregaUsado === 'Sí' && (
                  <div className="text-[10px] text-amber-300/90 bg-amber-500/10 px-2 py-1.5 rounded space-y-0.5">
                    <div>
                      Usado: <strong>{sale.modeloUsado}</strong> ({sale.anoUsado}) &bull; Toma: <strong>{formatCurrency(sale.valorToma)}</strong>
                    </div>
                    <div className="text-[9px] text-amber-400/70">
                      Infoauto: {formatCurrency(sale.valorInfoauto || 0)} &bull; Cotiz. Sugerida: {formatCurrency(sale.cotizacionSugerida || Math.round(Number(sale.valorInfoauto || 0) * 0.7))}
                    </div>
                  </div>
                )}

                <div className="text-[10px] text-slate-400 flex items-center justify-between">
                  <span>Vendedor: {sale.vendedor} ({sale.equipoVenta})</span>
                  <span>{formatDateLegible(sale.fecha)}</span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="mt-3 border-t border-slate-800 pt-3">
          <button
            onClick={onClose}
            className="w-full rounded-xl bg-slate-800 py-2.5 text-xs font-semibold text-white hover:bg-slate-700 transition"
          >
            Cerrar Historial
          </button>
        </div>
      </div>
    </div>
  );
};
