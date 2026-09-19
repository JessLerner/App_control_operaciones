import React, { useMemo, useState } from 'react';
import { BarChart3, KeyRound, LockKeyhole, Mail, RefreshCw, Save, ShieldCheck, X } from 'lucide-react';
import { SheetsConfig, VentaRecord } from '../types';
import { fetchRemoteReferenceData, managerRequest } from '../services/sheetsService';
import { formatCurrency } from '../utils/formatters';

interface ManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  sales: VentaRecord[];
  config: SheetsConfig;
  onChangeConfig: (config: SheetsConfig) => void;
  onRefresh: () => Promise<void>;
}

const TOKEN_KEY = 'pdv_manager_session_v1';

export const ManagerModal: React.FC<ManagerModalProps> = ({ isOpen, onClose, sales, config, onChangeConfig, onRefresh }) => {
  const [pin, setPin] = useState('');
  const [token, setToken] = useState(() => sessionStorage.getItem(TOKEN_KEY) || '');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [recoveryMode, setRecoveryMode] = useState(false);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [newPin, setNewPin] = useState('');
  const [endpoint, setEndpoint] = useState(config.webAppUrl);

  const metrics = useMemo(() => {
    const totalCobrado = sales.reduce((sum, sale) => sum + (Number(sale.montoCobrado) || 0), 0);
    const totalSobrepauta = sales.reduce((sum, sale) => sum + (Number(sale.sobrepauta) || 0), 0);
    const completas = sales.filter((sale) => sale.senaOCompleta === 'Completa').length;
    const usados = sales.filter((sale) => sale.entregaUsado === 'Sí').length;
    const by = (field: 'equipoVenta' | 'vendedor' | 'origenDato') => Object.entries(sales.reduce<Record<string, number>>((acc, sale) => {
      const key = sale[field] || 'Sin informar';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {})).sort((a, b) => b[1] - a[1]).slice(0, 5);
    return { totalCobrado, totalSobrepauta, completas, usados, byTeam: by('equipoVenta'), bySeller: by('vendedor'), byOrigin: by('origenDato') };
  }, [sales]);

  if (!isOpen) return null;

  const request = async (payload: Record<string, unknown>) => managerRequest<Record<string, string>>(config.webAppUrl, payload);

  const login = async () => {
    setBusy(true); setMessage('');
    const result = await request({ action: 'managerLogin', pin });
    setBusy(false);
    if (result.success && result.data?.token) {
      sessionStorage.setItem(TOKEN_KEY, result.data.token); setToken(result.data.token); setPin('');
    } else if (result.success && result.data?.setupRequired) {
      setNeedsSetup(true); setMessage('Configurá el acceso maestro una sola vez.');
    } else setMessage(result.error || 'Clave incorrecta.');
  };

  const setup = async () => {
    setBusy(true); setMessage('');
    const result = await request({ action: 'managerSetup', pin, recoveryEmail });
    setBusy(false);
    if (result.success) { setNeedsSetup(false); setMessage('Acceso configurado. Ingresá con la clave que acabás de crear.'); setPin(''); }
    else setMessage(result.error || 'No se pudo configurar el acceso.');
  };

  const recover = async () => {
    setBusy(true); setMessage('');
    const result = await request(resetCode && newPin
      ? { action: 'resetManagerPin', code: resetCode, newPin }
      : { action: 'requestManagerReset' });
    setBusy(false);
    if (result.success) {
      setMessage(resetCode ? 'Clave actualizada. Ingresá nuevamente.' : 'Te enviamos un código de recuperación al correo configurado.');
      if (resetCode) { setResetCode(''); setNewPin(''); setRecoveryMode(false); }
    } else setMessage(result.error || 'No se pudo procesar la recuperación.');
  };

  const saveEndpoint = async () => {
    const candidate = endpoint.trim();
    setBusy(true); setMessage('');
    const tested = await fetchRemoteReferenceData(candidate);
    if (!tested.success) { setBusy(false); setMessage(`La nueva conexión no responde: ${tested.error}`); return; }
    const saved = await request({ action: 'setActiveWebAppUrl', token, webAppUrl: candidate });
    setBusy(false);
    if (!saved.success) { setMessage(saved.error || 'No se pudo guardar el enlace central.'); return; }
    onChangeConfig({ ...config, webAppUrl: candidate });
    await onRefresh();
    setMessage('Nueva base validada y activada. Los dispositivos la tomarán al actualizar.');
  };

  return <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
    <div className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 text-slate-100 shadow-2xl">
      <div className="flex items-center justify-between border-b border-slate-800 p-5">
        <div className="flex items-center gap-2.5"><ShieldCheck className="h-5 w-5 text-emerald-400" /><div><h2 className="font-bold">Gerencia</h2><p className="text-xs text-slate-400">Métricas y administración de la operación</p></div></div>
        <button onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-slate-800"><X className="h-5 w-5" /></button>
      </div>
      {!token ? <div className="mx-auto w-full max-w-sm p-6 space-y-4">
        <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 p-4 text-xs text-emerald-100">Acceso exclusivo para gerencia. La clave se valida en Google Apps Script y no se guarda en este dispositivo.</div>
        {!recoveryMode ? <>{needsSetup ? <><p className="text-xs text-slate-300">Definí la clave maestra y el único correo autorizado para recuperarla.</p><label className="block text-xs font-semibold">Clave maestra<input value={pin} onChange={(e) => setPin(e.target.value)} type="password" className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-950 p-3 text-sm" autoFocus /></label><label className="block text-xs font-semibold">Correo de recuperación<input value={recoveryEmail} onChange={(e) => setRecoveryEmail(e.target.value)} type="email" className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-950 p-3 text-sm" /></label><button onClick={() => void setup()} disabled={busy || pin.length < 8 || !recoveryEmail} className="flex w-full justify-center rounded-lg bg-emerald-600 p-3 text-xs font-bold hover:bg-emerald-500 disabled:opacity-50"><ShieldCheck className="mr-2 h-4 w-4" />{busy ? 'Configurando…' : 'Activar Gerencia'}</button></> : <><label className="block text-xs font-semibold">Clave de Gerencia<input value={pin} onChange={(e) => setPin(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && void login()} type="password" className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-950 p-3 text-sm" autoFocus /></label>
          <button onClick={() => void login()} disabled={busy || !pin} className="flex w-full justify-center rounded-lg bg-emerald-600 p-3 text-xs font-bold hover:bg-emerald-500 disabled:opacity-50"><LockKeyhole className="mr-2 h-4 w-4" />{busy ? 'Validando…' : 'Ingresar'}</button></>}
          <button onClick={() => { setRecoveryMode(true); setMessage(''); }} className="w-full text-xs text-emerald-400 hover:text-emerald-300">¿Olvidaste la clave?</button></>
          : <><p className="text-xs text-slate-300">Solicitá un código de un solo uso. Llegará únicamente al correo de recuperación de Gerencia.</p>{resetCode && <><input value={resetCode} onChange={(e) => setResetCode(e.target.value)} placeholder="Código recibido" className="w-full rounded-lg border border-slate-700 bg-slate-950 p-3 text-sm" /><input value={newPin} onChange={(e) => setNewPin(e.target.value)} placeholder="Nueva clave" type="password" className="w-full rounded-lg border border-slate-700 bg-slate-950 p-3 text-sm" /></>}
          <button onClick={() => void recover()} disabled={busy} className="flex w-full justify-center rounded-lg bg-emerald-600 p-3 text-xs font-bold disabled:opacity-50"><Mail className="mr-2 h-4 w-4" />{resetCode ? 'Cambiar clave' : 'Enviar código'}</button>
          {!resetCode && <button onClick={() => setResetCode(' ')} className="w-full text-xs text-slate-400">Ya tengo un código</button>}
          <button onClick={() => { setRecoveryMode(false); setResetCode(''); }} className="w-full text-xs text-slate-400">Volver</button></>}
        {message && <p className="rounded-lg bg-slate-800 p-3 text-xs text-slate-200">{message}</p>}
      </div> : <div className="overflow-y-auto p-5 space-y-6">
        <section><div className="mb-3 flex items-center gap-2"><BarChart3 className="h-4 w-4 text-emerald-400" /><h3 className="text-sm font-bold">Indicadores del día</h3></div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4"><Metric label="Operaciones" value={String(sales.length)} /><Metric label="Monto cobrado" value={formatCurrency(metrics.totalCobrado)} /><Metric label="Promedio" value={formatCurrency(sales.length ? metrics.totalCobrado / sales.length : 0)} /><Metric label="Sobrepauta" value={formatCurrency(metrics.totalSobrepauta)} /><Metric label="Completas" value={`${metrics.completas} de ${sales.length}`} /><Metric label="Con usado" value={`${metrics.usados} de ${sales.length}`} /></div>
        </section>
        <section className="grid gap-3 md:grid-cols-3"><Ranking title="Por supervisor" items={metrics.byTeam} /><Ranking title="Por vendedor" items={metrics.bySeller} /><Ranking title="Por origen" items={metrics.byOrigin} /></section>
        <section className="rounded-xl border border-slate-800 bg-slate-950/50 p-4"><h3 className="mb-1 text-sm font-bold">Cambio de base de Google Sheets</h3><p className="mb-3 text-xs text-slate-400">Se prueba la nueva URL antes de activarla. Conservá el Apps Script anterior como puente para que todos los dispositivos reciban el cambio.</p><input value={endpoint} onChange={(e) => setEndpoint(e.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-950 p-2.5 text-xs" /><button onClick={() => void saveEndpoint()} disabled={busy || !endpoint} className="mt-3 flex items-center rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold hover:bg-emerald-500 disabled:opacity-50"><Save className="mr-1.5 h-3.5 w-3.5" />Validar y activar</button></section>
        <div className="flex justify-between border-t border-slate-800 pt-4"><button onClick={() => void onRefresh()} className="flex items-center text-xs text-emerald-400"><RefreshCw className="mr-1.5 h-3.5 w-3.5" />Actualizar datos</button><button onClick={() => { sessionStorage.removeItem(TOKEN_KEY); setToken(''); }} className="flex items-center text-xs text-slate-400"><KeyRound className="mr-1.5 h-3.5 w-3.5" />Cerrar Gerencia</button></div>
        {message && <p className="rounded-lg bg-slate-800 p-3 text-xs text-slate-200">{message}</p>}
      </div>}
    </div>
  </div>;
};

const Metric = ({ label, value }: { label: string; value: string }) => <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3"><p className="text-[11px] text-slate-400">{label}</p><p className="mt-1 text-sm font-bold text-white">{value}</p></div>;
const Ranking = ({ title, items }: { title: string; items: [string, number][] }) => <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3"><h4 className="mb-2 text-xs font-bold text-slate-200">{title}</h4>{items.length ? items.map(([name, count]) => <div className="flex justify-between border-t border-slate-800 py-1.5 text-xs" key={name}><span className="truncate pr-2 text-slate-300">{name}</span><strong className="text-emerald-400">{count}</strong></div>) : <p className="text-xs text-slate-500">Sin datos aún.</p>}</div>;
