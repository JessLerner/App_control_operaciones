import React, { useMemo, useState } from 'react';
import { BarChart3, KeyRound, LockKeyhole, Mail, RefreshCw, Save, ShieldCheck, X } from 'lucide-react';
import { ReferenceData, SheetsConfig, VentaRecord } from '../types';
import { fetchRemoteReferenceData, managerRequest } from '../services/sheetsService';

interface ManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  todaySales: VentaRecord[];
  sales: VentaRecord[];
  referenceData: ReferenceData;
  config: SheetsConfig;
  onChangeConfig: (config: SheetsConfig) => void;
  onRefresh: () => Promise<void>;
}

const TOKEN_KEY = 'pdv_manager_session_v1';

export const ManagerModal: React.FC<ManagerModalProps> = ({ isOpen, onClose, todaySales, sales, referenceData, config, onChangeConfig, onRefresh }) => {
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
    const monthPrefix = new Date().toISOString().slice(0, 7);
    const monthSales = sales.filter((sale) => sale.fecha.startsWith(monthPrefix));
    const countBy = (records: VentaRecord[], field: 'equipoVenta' | 'marca') => records.reduce<Record<string, number>>((acc, sale) => {
      const name = String(sale[field] || 'Sin informar');
      acc[name] = (acc[name] || 0) + 1;
      return acc;
    }, {});
    const supervisors = [...new Set([...referenceData.equiposDeVenta.map((team) => team.supervisor), ...sales.map((sale) => sale.equipoVenta)])].filter(Boolean).sort();
    const brands = [...new Set([...referenceData.modelosYPrecios.map((model) => model.marca), ...sales.map((sale) => sale.marca)])].filter(Boolean).sort();
    const todayBySupervisor = countBy(todaySales, 'equipoVenta');
    const monthBySupervisor = countBy(monthSales, 'equipoVenta');
    const todayByBrand = countBy(todaySales, 'marca');
    const monthByBrand = countBy(monthSales, 'marca');
    return {
      monthSales,
      supervisorRows: supervisors.map((name) => ({ name, today: todayBySupervisor[name] || 0, month: monthBySupervisor[name] || 0 })),
      brandRows: brands.map((name) => ({ name, today: todayByBrand[name] || 0, month: monthByBrand[name] || 0 })),
    };
  }, [sales, todaySales, referenceData]);

  if (!isOpen) return null;

  const request = async (payload: Record<string, unknown>) => managerRequest<Record<string, string>>('/api/manager', payload);

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
        <section><div className="mb-3 flex items-center gap-2"><BarChart3 className="h-4 w-4 text-emerald-400" /><h3 className="text-sm font-bold">Resumen comercial</h3></div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4"><Metric label="Ventas del día" value={String(todaySales.length)} /><Metric label="Ventas del mes" value={String(metrics.monthSales.length)} /></div>
        </section>
        <section className="grid gap-4 md:grid-cols-2"><MetricTable title="Ventas por supervisor" rows={metrics.supervisorRows} /><MetricTable title="Ventas por marca" rows={metrics.brandRows} /></section>
        <section className="rounded-xl border border-slate-800 bg-slate-950/50 p-4"><h3 className="mb-1 text-sm font-bold">Cambio de base de Google Sheets</h3><p className="mb-3 text-xs text-slate-400">Se prueba la nueva URL antes de activarla. Conservá el Apps Script anterior como puente para que todos los dispositivos reciban el cambio.</p><input value={endpoint} onChange={(e) => setEndpoint(e.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-950 p-2.5 text-xs" /><button onClick={() => void saveEndpoint()} disabled={busy || !endpoint} className="mt-3 flex items-center rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold hover:bg-emerald-500 disabled:opacity-50"><Save className="mr-1.5 h-3.5 w-3.5" />Validar y activar</button></section>
        <div className="flex justify-between border-t border-slate-800 pt-4"><button onClick={() => void onRefresh()} className="flex items-center text-xs text-emerald-400"><RefreshCw className="mr-1.5 h-3.5 w-3.5" />Actualizar datos</button><button onClick={() => { sessionStorage.removeItem(TOKEN_KEY); setToken(''); }} className="flex items-center text-xs text-slate-400"><KeyRound className="mr-1.5 h-3.5 w-3.5" />Cerrar Gerencia</button></div>
        {message && <p className="rounded-lg bg-slate-800 p-3 text-xs text-slate-200">{message}</p>}
      </div>}
    </div>
  </div>;
};

const Metric = ({ label, value }: { label: string; value: string }) => <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3"><p className="text-[11px] text-slate-400">{label}</p><p className="mt-1 text-lg font-bold text-white">{value}</p></div>;
const MetricTable = ({ title, rows }: { title: string; rows: Array<{ name: string; today: number; month: number }> }) => <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-950/60"><h4 className="border-b border-slate-800 px-3 py-3 text-xs font-bold text-slate-200">{title}</h4><div className="max-h-72 overflow-y-auto"><table className="w-full text-left text-xs"><thead className="sticky top-0 bg-slate-900 text-[10px] uppercase text-slate-400"><tr><th className="px-3 py-2 font-semibold">{title.includes('supervisor') ? 'Supervisor' : 'Marca'}</th><th className="px-3 py-2 text-right font-semibold">Día</th><th className="px-3 py-2 text-right font-semibold">Mes</th></tr></thead><tbody>{rows.map((row) => <tr className="border-t border-slate-800/70" key={row.name}><td className="px-3 py-2 text-slate-200">{row.name}</td><td className="px-3 py-2 text-right font-bold text-emerald-400">{row.today}</td><td className="px-3 py-2 text-right font-bold text-emerald-300">{row.month}</td></tr>)}</tbody></table></div></div>;
