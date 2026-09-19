import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { ParteDiarioForm } from './components/ParteDiarioForm';
import { SuccessModal } from './components/SuccessModal';
import { SheetsConfigModal } from './components/SheetsConfigModal';
import { RecentSalesDrawer } from './components/RecentSalesDrawer';
import { OfflineIndicator } from './components/OfflineIndicator';
import {
  ReferenceData,
  SheetsConfig,
  VentaFormData,
  VentaRecord,
} from './types';
import {
  getStoredConfig,
  saveStoredConfig,
  getStoredReferenceData,
  saveStoredReferenceData,
  getSalesHistory,
  fetchRemoteReferenceData,
  submitVentaRecord,
  syncPendingSales,
} from './services/sheetsService';
import {
  Sparkles,
  Database,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Car,
} from 'lucide-react';
import { getTodayDateString } from './utils/formatters';

export default function App() {
  const [config, setConfig] = useState<SheetsConfig>(getStoredConfig);
  const [referenceData, setReferenceData] = useState<ReferenceData>(getStoredReferenceData);
  const [salesHistory, setSalesHistory] = useState<VentaRecord[]>(getSalesHistory);

  // Modals and Drawers
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isSuccessOpen, setIsSuccessOpen] = useState(false);

  // Submission State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [formKey, setFormKey] = useState<number>(1); // used to cleanly reset form on new entry
  const [preservedCommercials, setPreservedCommercials] = useState<{
    equipoVenta?: string;
    vendedor?: string;
  }>({});

  const [lastSubmittedSale, setLastSubmittedSale] = useState<{
    numSuscripcion: string;
    data: VentaFormData;
    syncedToRemote: boolean;
    message: string;
  } | null>(null);

  // Refresh history on mount
  useEffect(() => {
    setSalesHistory(getSalesHistory());
  }, []);

  // En cada instalación, usar los datos remotos más recientes sin depender de una acción manual.
  // Si la red no está disponible, se conserva el catálogo guardado en el dispositivo.
  useEffect(() => {
    if (!config.webAppUrl) return;

    let isCurrent = true;
    fetchRemoteReferenceData(config.webAppUrl).then((result) => {
      if (isCurrent && result.success && result.data) {
        setReferenceData(result.data);
        setSalesHistory(result.sales || getSalesHistory());
      } else if (isCurrent && !result.success) {
        console.warn('No se pudo actualizar el catálogo remoto:', result.error);
      }
    });

    return () => {
      isCurrent = false;
    };
  }, [config.webAppUrl]);

  // Calculate today's sales
  const todayStr = getTodayDateString();
  const currentDaySales = salesHistory.filter((s) => s.fecha === todayStr);
  const todaySalesCount = currentDaySales.length;
  const pendingCount = salesHistory.filter((s) => s.syncStatus !== 'synced').length;

  // Auto-verificar suscripciones pendientes al cargar si hay URL configurada.
  useEffect(() => {
    if (config.webAppUrl && pendingCount > 0) {
      syncPendingSales().then(() => {
        setSalesHistory(getSalesHistory());
      });
    }
  }, [config.webAppUrl]);

  const refreshFromCloud = useCallback(async () => {
    const result = await fetchRemoteReferenceData(config.webAppUrl);
    if (result.success && result.data) {
      setReferenceData(result.data);
      setSalesHistory(result.sales || getSalesHistory());
    }
  }, [config.webAppUrl]);

  const handleFormSubmit = async (formData: VentaFormData) => {
    setIsSubmitting(true);
    try {
      const result = await submitVentaRecord(formData);
      setLastSubmittedSale({
        numSuscripcion: result.numSuscripcion,
        data: formData,
        syncedToRemote: result.syncedToRemote,
        message: result.message,
      });

      // Preserve supervisor & seller for next rapid entry
      setPreservedCommercials({
        equipoVenta: formData.equipoVenta,
        vendedor: formData.vendedor,
      });

      // Update history in state
      setSalesHistory(getSalesHistory());
      setIsSuccessOpen(true);
    } catch (error) {
      console.error('Error al registrar venta:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCloseSuccess = () => {
    setIsSuccessOpen(false);
    setLastSubmittedSale(null);
    setFormKey((prev) => prev + 1); // Increments key to reset form clean
  };

  const handleQuickSync = async () => {
    setIsSyncing(true);
    try {
      await syncPendingSales();
      setSalesHistory(getSalesHistory());
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Header */}
      <Header
        onOpenHistory={() => {
          void refreshFromCloud();
          setSalesHistory(getSalesHistory());
          setIsHistoryOpen(true);
        }}
        onOpenSettings={() => setIsSettingsOpen(true)}
        isCustomSheetsConnected={!!config.webAppUrl}
        pendingCount={pendingCount}
        todaySalesCount={todaySalesCount}
        onQuickSync={handleQuickSync}
        isSyncing={isSyncing}
      />

      {/* Main Content Area */}
      <main className="flex-1 mx-auto w-full max-w-4xl px-4 py-5 sm:px-6">
        {/* Banner de Estado / Conexión a Google Sheets */}
        {!config.webAppUrl && (
          <div className="mb-5 rounded-2xl border border-emerald-500/30 bg-gradient-to-r from-slate-900 via-slate-900 to-emerald-950/40 p-4 shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                <Database className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <span>Modo Local / Demo Activo</span>
                  <span className="rounded bg-emerald-500/20 text-emerald-300 px-2 py-0.5 text-[10px] font-semibold">
                    6 Marcas Oficiales
                  </span>
                </h3>
                <p className="text-xs text-slate-300 mt-0.5">
                  La app cuenta con el catálogo pre-cargado de marcas (Renault, Peugeot, Jeep, Leapmotor, Fiat, Citroën) y equipos. Conecta tu Google Sheets cuando quieras sincronizar en la nube.
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="shrink-0 rounded-xl bg-emerald-600/90 hover:bg-emerald-500 text-white px-3.5 py-2 text-xs font-bold transition shadow"
            >
              Conectar Google Sheets
            </button>
          </div>
        )}

        {/* Lead / Subheader */}
        <div className="mb-5">
          <h2 className="text-lg sm:text-xl font-extrabold text-white tracking-tight">
            Registro Diario de Suscripciones & Planes
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Sistema a prueba de errores humanos con validación en tiempo real y cálculo automático de cuota #1.
          </p>
        </div>

        {/* Formulario Principal */}
        <ParteDiarioForm
          key={formKey}
          referenceData={referenceData}
          onSubmit={handleFormSubmit}
          isSubmitting={isSubmitting}
          initialValues={{
            equipoVenta: preservedCommercials.equipoVenta || '',
            vendedor: preservedCommercials.vendedor || '',
          }}
        />
      </main>

      {/* Offline Toast Indicator */}
      <OfflineIndicator />

      {/* Modal de Éxito al Registrar */}
      <SuccessModal
        isOpen={isSuccessOpen}
        onClose={handleCloseSuccess}
        numSuscripcion={lastSubmittedSale?.numSuscripcion || ''}
        data={lastSubmittedSale?.data || null}
        syncedToRemote={lastSubmittedSale?.syncedToRemote || false}
        message={lastSubmittedSale?.message || ''}
      />

      {/* Modal de Configuración de Google Sheets */}
      <SheetsConfigModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        config={config}
        onSaveConfig={setConfig}
        currentReferenceData={referenceData}
        onUpdateReferenceData={setReferenceData}
      />

      {/* Drawer de Historial de Ventas */}
      <RecentSalesDrawer
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        sales={currentDaySales}
        onSyncPending={async () => { await handleQuickSync(); await refreshFromCloud(); }}
        isSyncing={isSyncing}
      />
    </div>
  );
}
