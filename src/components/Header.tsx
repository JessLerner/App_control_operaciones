import React, { useState } from 'react';
import {
  Car,
  Cloud,
  CloudOff,
  History,
  Settings,
  Download,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

interface HeaderProps {
  onOpenHistory: () => void;
  onOpenSettings: () => void;
  isCustomSheetsConnected: boolean;
  pendingCount: number;
  todaySalesCount: number;
  onQuickSync: () => void;
  isSyncing: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenHistory,
  onOpenSettings,
  isCustomSheetsConnected,
  pendingCount,
  todaySalesCount,
  onQuickSync,
  isSyncing,
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const isOnline = useOnlineStatus();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  return (
    <header className="sticky top-0 z-30 w-full border-b border-slate-800 bg-slate-900/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3 sm:px-6">
        {/* Brand / Title */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white shadow-md shadow-emerald-900/30">
            <Car className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold tracking-tight text-white sm:text-lg">
                Parte Diario de Ventas
              </h1>
              <span className="hidden rounded bg-emerald-500/15 px-2 py-0.5 text-[11px] font-semibold text-emerald-400 border border-emerald-500/30 sm:inline-block">
                PWA
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Planes de Ahorro &bull; Concesionario Oficial
            </p>
          </div>
        </div>

        {/* Action controls */}
        <div className="flex items-center gap-2">
          {/* PWA Install Button */}
          {!isInstalled && isInstallable && (
            <button
              onClick={install}
              id="btn-pwa-install"
              className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow hover:bg-emerald-500 transition active:scale-95"
            >
              <Download className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Instalar App</span>
            </button>
          )}

          {!isInstalled && isIOS && (
            <button
              onClick={() => setShowIOSGuide(true)}
              id="btn-pwa-ios-guide"
              className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-700 transition"
            >
              <Download className="h-3.5 w-3.5 text-emerald-400" />
              <span className="hidden sm:inline">Instalar iOS</span>
            </button>
          )}

          {/* Cloud Sync Status Pill */}
          <button
            onClick={pendingCount > 0 ? onQuickSync : onOpenSettings}
            title={
              !isOnline
                ? 'Sin conexión a Internet'
                : pendingCount > 0
                ? `${pendingCount} venta(s) pendiente(s) de sincronizar`
                : isCustomSheetsConnected
                ? 'Conectado a Google Sheets'
                : 'Modo Local / Configurar Sheets'
            }
            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition border ${
              !isOnline
                ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                : pendingCount > 0
                ? 'bg-amber-500/15 text-amber-300 border-amber-500/40 animate-pulse'
                : isCustomSheetsConnected
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
            }`}
          >
            {isSyncing ? (
              <RefreshCw className="h-3.5 w-3.5 animate-spin text-emerald-400" />
            ) : !isOnline ? (
              <CloudOff className="h-3.5 w-3.5 text-amber-400" />
            ) : pendingCount > 0 ? (
              <RefreshCw className="h-3.5 w-3.5 text-amber-400" />
            ) : (
              <Cloud className="h-3.5 w-3.5 text-emerald-400" />
            )}
            <span className="hidden md:inline font-mono">
              {!isOnline
                ? 'Offline'
                : pendingCount > 0
                ? `${pendingCount} pend.`
                : isCustomSheetsConnected
                ? 'Sheets Online'
                : 'Local'}
            </span>
          </button>

          {/* History Button */}
          <button
            onClick={onOpenHistory}
            id="btn-open-history"
            className="relative flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-700 transition"
          >
            <History className="h-4 w-4 text-slate-300" />
            <span className="hidden sm:inline">Ventas Hoy</span>
            {todaySalesCount > 0 && (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-[10px] font-bold text-white shadow-sm">
                {todaySalesCount}
              </span>
            )}
          </button>

          {/* Settings Button */}
          <button
            onClick={onOpenSettings}
            id="btn-open-settings"
            title="Ajustes de Google Sheets & Backend"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white transition"
          >
            <Settings className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* iOS Install Instructions Modal */}
      {showIOSGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-slate-700 bg-slate-800 p-6 shadow-2xl text-slate-100">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Download className="h-5 w-5 text-emerald-400" />
              Instalar en iPhone / iPad
            </h3>
            <p className="mt-2 text-xs text-slate-300">
              Para tener la app en tu pantalla de inicio como una aplicación nativa:
            </p>
            <div className="mt-4 space-y-2.5 text-xs text-slate-200">
              <div className="flex items-start gap-2.5 rounded-lg bg-slate-900/60 p-2.5 border border-slate-700/50">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-[11px] font-bold text-emerald-400">
                  1
                </span>
                <span>Toca el botón <strong>Compartir</strong> (ícono de caja con flecha hacia arriba) en la barra inferior de Safari.</span>
              </div>
              <div className="flex items-start gap-2.5 rounded-lg bg-slate-900/60 p-2.5 border border-slate-700/50">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-[11px] font-bold text-emerald-400">
                  2
                </span>
                <span>Desplázate hacia abajo y selecciona <strong>"Agregar a Inicio"</strong>.</span>
              </div>
              <div className="flex items-start gap-2.5 rounded-lg bg-slate-900/60 p-2.5 border border-slate-700/50">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-[11px] font-bold text-emerald-400">
                  3
                </span>
                <span>Toca <strong>"Agregar"</strong> en la esquina superior derecha.</span>
              </div>
            </div>
            <button
              onClick={() => setShowIOSGuide(false)}
              className="mt-5 w-full rounded-xl bg-slate-700 py-2.5 text-xs font-semibold text-white hover:bg-slate-600 transition"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
