import React, { useState } from 'react';
import {
  X,
  Link2,
  Database,
  Code,
  Copy,
  Check,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  ExternalLink,
  BookOpen,
} from 'lucide-react';
import { SheetsConfig, ReferenceData } from '../types';
import {
  saveStoredConfig,
  fetchRemoteReferenceData,
  saveStoredReferenceData,
} from '../services/sheetsService';
import { GOOGLE_APPS_SCRIPT_CODE } from '../services/appsScriptCode';
import { INITIAL_REFERENCE_DATA } from '../data/initialReferenceData';

interface SheetsConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: SheetsConfig;
  onSaveConfig: (newConfig: SheetsConfig) => void;
  currentReferenceData: ReferenceData;
  onUpdateReferenceData: (data: ReferenceData) => void;
}

export const SheetsConfigModal: React.FC<SheetsConfigModalProps> = ({
  isOpen,
  onClose,
  config,
  onSaveConfig,
  currentReferenceData,
  onUpdateReferenceData,
}) => {
  const [activeTab, setActiveTab] = useState<'connection' | 'script' | 'guide'>('connection');
  const [url, setUrl] = useState(config.webAppUrl || '');
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);
  const [copiedScript, setCopiedScript] = useState(false);

  if (!isOpen) return null;

  const handleTestAndSave = async () => {
    setIsTesting(true);
    setTestResult(null);

    const cleanUrl = url.trim();

    if (!cleanUrl) {
      // Guardar modo local
      const newConfig: SheetsConfig = { ...config, webAppUrl: '' };
      onSaveConfig(newConfig);
      saveStoredConfig(newConfig);
      setIsTesting(false);
      setTestResult({
        success: true,
        message: 'Modo Local / Demo activado con el catálogo predeterminado.',
      });
      return;
    }

    const res = await fetchRemoteReferenceData(cleanUrl);
    setIsTesting(false);

    if (res.success && res.data) {
      const newConfig: SheetsConfig = { ...config, webAppUrl: cleanUrl };
      onSaveConfig(newConfig);
      saveStoredConfig(newConfig);
      onUpdateReferenceData(res.data);
      saveStoredReferenceData(res.data);
      setTestResult({
        success: true,
        message: `¡Conexión exitosa! Se cargaron ${res.data.modelosYPrecios.length} modelos, ${res.data.equiposDeVenta.length} equipos y ${res.data.origenesDatos.length} orígenes desde tu Google Sheets.`,
      });
    } else {
      setTestResult({
        success: false,
        message: `No se pudo conectar: ${res.error || 'Verifica que la URL sea pública y corresponda a la implementación de Google Apps Script'}.`,
      });
    }
  };

  const handleCopyScript = () => {
    navigator.clipboard.writeText(GOOGLE_APPS_SCRIPT_CODE);
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 2500);
  };

  const handleResetDefaults = () => {
    onUpdateReferenceData(INITIAL_REFERENCE_DATA);
    saveStoredReferenceData(INITIAL_REFERENCE_DATA);
    setTestResult({
      success: true,
      message: 'Catálogo de modelos, equipos y orígenes restablecido a valores oficiales.',
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-2xl rounded-2xl border border-slate-700 bg-slate-900 p-5 sm:p-6 shadow-2xl text-slate-100 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-400">
              <Database className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                Configuración de Google Sheets
              </h2>
              <p className="text-xs text-slate-400">
                Sincronización en tiempo real con tu planilla de cálculo
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

        {/* Tabs */}
        <div className="mt-4 flex gap-1 border-b border-slate-800 pb-2">
          <button
            onClick={() => setActiveTab('connection')}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              activeTab === 'connection'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Link2 className="h-3.5 w-3.5" />
            Conexión Web App
          </button>
          <button
            onClick={() => setActiveTab('script')}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              activeTab === 'script'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Code className="h-3.5 w-3.5" />
            Script Google Apps Script (Codigo.gs)
          </button>
          <button
            onClick={() => setActiveTab('guide')}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              activeTab === 'guide'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <BookOpen className="h-3.5 w-3.5" />
            Pestañas y Estructura
          </button>
        </div>

        {/* Tab Content */}
        <div className="mt-4 overflow-y-auto flex-1 pr-1 space-y-4">
          {activeTab === 'connection' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  URL de la Aplicación Web de Google Apps Script:
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    id="input-webapp-url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://script.google.com/macros/s/.../exec"
                    className="flex-1 rounded-xl border border-slate-700 bg-slate-800 px-3.5 py-2.5 text-xs font-mono text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition"
                  />
                  <button
                    type="button"
                    onClick={handleTestAndSave}
                    disabled={isTesting}
                    className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-emerald-500 transition active:scale-95 disabled:opacity-50"
                  >
                    {isTesting ? (
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <CheckCircle className="h-3.5 w-3.5" />
                    )}
                    <span>{url ? 'Probar y Guardar' : 'Usar Modo Local'}</span>
                  </button>
                </div>
                <p className="mt-1 text-[11px] text-slate-400">
                  Pega aquí la URL generada al hacer "Implementar como aplicación web" en Apps Script.
                </p>
              </div>

              {testResult && (
                <div
                  className={`rounded-xl border p-3 text-xs ${
                    testResult.success
                      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                      : 'border-red-500/30 bg-red-500/10 text-red-300'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {testResult.success ? (
                      <CheckCircle className="h-4 w-4 shrink-0 text-emerald-400" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 shrink-0 text-red-400" />
                    )}
                    <span>{testResult.message}</span>
                  </div>
                </div>
              )}

              {/* Estado de Datos en Memoria */}
              <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3.5 text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-300">Base de Datos Actual en la App:</span>
                  <span
                    className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                      config.webAppUrl
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    {config.webAppUrl ? 'Conectado a Google Sheets' : 'Catálogo Local Pre-cargado'}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center pt-2">
                  <div className="rounded-lg bg-slate-900 p-2 border border-slate-800">
                    <div className="text-sm font-bold text-white font-mono">
                      {currentReferenceData.modelosYPrecios.length}
                    </div>
                    <div className="text-[10px] text-slate-400">Modelos & Precios</div>
                  </div>
                  <div className="rounded-lg bg-slate-900 p-2 border border-slate-800">
                    <div className="text-sm font-bold text-white font-mono">
                      {currentReferenceData.equiposDeVenta.length}
                    </div>
                    <div className="text-[10px] text-slate-400">Supervisores/Equipos</div>
                  </div>
                  <div className="rounded-lg bg-slate-900 p-2 border border-slate-800">
                    <div className="text-sm font-bold text-white font-mono">
                      {currentReferenceData.origenesDatos.length}
                    </div>
                    <div className="text-[10px] text-slate-400">Orígenes (AGP)</div>
                  </div>
                </div>
                <div className="flex justify-end pt-1">
                  <button
                    type="button"
                    onClick={handleResetDefaults}
                    className="text-[11px] text-slate-400 hover:text-white underline"
                  >
                    Restablecer catálogo oficial inicial
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'script' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-300">
                  Copia este código y pégalo en tu editor de <strong>Extensiones &gt; Apps Script</strong> en Google Sheets:
                </p>
                <button
                  type="button"
                  onClick={handleCopyScript}
                  className="flex items-center gap-1.5 rounded-lg bg-slate-800 border border-slate-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-700 transition"
                >
                  {copiedScript ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-400" />
                      <span className="text-emerald-400">¡Copiado!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" />
                      <span>Copiar Código</span>
                    </>
                  )}
                </button>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-950 p-3 font-mono text-[11px] text-slate-300 overflow-x-auto max-h-72">
                <pre>{GOOGLE_APPS_SCRIPT_CODE}</pre>
              </div>
            </div>
          )}

          {activeTab === 'guide' && (
            <div className="space-y-3 text-xs text-slate-300">
              <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3.5 space-y-2">
                <h4 className="font-bold text-emerald-400 text-sm">
                  Las 4 Pestañas Requeridas en Google Sheets:
                </h4>
                <ul className="space-y-2.5 mt-2">
                  <li className="flex items-start gap-2">
                    <span className="font-mono font-bold text-white bg-slate-800 px-1.5 py-0.5 rounded text-[11px]">
                      1. ID Ventas
                    </span>
                    <span className="text-slate-300">
                      Tabla de destino donde se registran las filas cargadas desde la app. Contiene los 20 campos (ID Ventas, Fecha, Cliente, N° Suscripción, Marca, Modelo, Tipo de Plan, Seña/Completa, Valor Cuota #1, Monto Cobrado, Cta. Fábrica, Sobrepauta, Usado, etc.).
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-mono font-bold text-white bg-slate-800 px-1.5 py-0.5 rounded text-[11px]">
                      2. Modelos_y_Precios
                    </span>
                    <span className="text-slate-300">
                      Columnas: <code>Marca</code>, <code>Modelo</code>, <code>Tipo de Plan</code>, <code>Valor Cuota #1</code>, <code>Cta. Fábrica</code>. (Marcas: RENAULT, PEUGEOT, JEEP, LEAPMOTOR, FIAT, CITROEN).
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-mono font-bold text-white bg-slate-800 px-1.5 py-0.5 rounded text-[11px]">
                      3. Equipos_de_venta
                    </span>
                    <span className="text-slate-300">
                      La fila 18 contiene la cabecera <code>EQUIPOS</code> donde cada columna representa un Supervisor/Equipo (ej: JUANA BENITEZ, ANDREA FRANCO, etc.) y debajo se enlistan sus vendedores.
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-mono font-bold text-white bg-slate-800 px-1.5 py-0.5 rounded text-[11px]">
                      4. Origen_datos
                    </span>
                    <span className="text-slate-300">
                      Columna <code>AGP</code> con los orígenes comerciales (Base de datos, Meta, Prospect, Referido, Salón, Stand, Subite, etc.).
                    </span>
                  </li>
                </ul>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-900 p-3 text-[11px] text-slate-400">
                <strong className="text-slate-200">Nota de confidencialidad de costos:</strong> Los campos <code>Cta. Fábrica</code> y <code>Sobrepauta</code> nunca son mostrados a los vendedores en la app. La app envía únicamente el monto cobrado y datos comerciales, dejando que las fórmulas de tu planilla calculen los costos internamente.
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-4 flex justify-end border-t border-slate-800 pt-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-slate-800 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-700 transition"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
