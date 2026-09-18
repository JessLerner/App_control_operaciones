import React, { useState } from 'react';
import {
  CheckCircle2,
  Copy,
  Check,
  PlusCircle,
  Hash,
} from 'lucide-react';
import { VentaFormData } from '../types';
import { formatCurrency, formatDateLegible } from '../utils/formatters';

interface SuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  numSuscripcion: string;
  data: VentaFormData | null;
  syncedToRemote: boolean;
  message: string;
}

export const SuccessModal: React.FC<SuccessModalProps> = ({
  isOpen,
  onClose,
  numSuscripcion,
  data,
  syncedToRemote,
  message,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !data) return null;

  const generateWhatsAppReceipt = () => {
    return `📋 *PARTE DIARIO DE VENTA REGISTRADO*
🔢 *N° Suscripción (Clave):* ${data.numSuscripcion}
📅 *Fecha:* ${formatDateLegible(data.fecha)}
👤 *Cliente:* ${data.cliente}
🚗 *Vehículo:* ${data.marca} ${data.modelo}
📑 *Plan:* ${data.tipoPlan} (${data.senaOCompleta}${data.autorizoDescuento ? ` - Aut: ${data.autorizoDescuento}` : ''})
💵 *Monto Cobrado:* ${formatCurrency(data.montoCobrado)}
🔄 *Entrega Usado:* ${data.entregaUsado}${
      data.entregaUsado === 'Sí'
        ? ` (${data.modeloUsado} - ${data.anoUsado} | Toma: ${formatCurrency(data.valorToma)})`
        : ''
    }
👥 *Equipo:* ${data.equipoVenta}
🧑‍💼 *Vendedor:* ${data.vendedor}
🌐 *Origen:* ${data.origenDato}`;
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generateWhatsAppReceipt());
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-lg rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl text-slate-100 max-h-[90vh] overflow-y-auto">
        {/* Encabezado con Icono de Éxito */}
        <div className="flex flex-col items-center text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-lg shadow-emerald-950/50">
            <CheckCircle2 className="h-9 w-9" />
          </div>
          <h3 className="mt-3 text-xl font-extrabold tracking-tight text-white">
            ¡Venta Registrada con Éxito!
          </h3>
          <p className="mt-1 text-xs text-slate-400">
            {message}
          </p>

          {/* Badge N° Suscripción (Primary Key) */}
          <div className="mt-3 inline-flex items-center gap-2 rounded-xl bg-slate-800 border border-slate-700 px-4 py-1.5 font-mono text-xs font-bold text-emerald-300">
            <Hash className="h-3.5 w-3.5 text-emerald-400" />
            <span>Suscripción:</span>
            <span className="text-white text-sm">{numSuscripcion || data.numSuscripcion}</span>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] ${
                syncedToRemote
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
              }`}
            >
              {syncedToRemote ? 'Sincronizado a Sheets' : 'Guardado en Dispositivo'}
            </span>
          </div>
        </div>

        {/* Resumen Comercial */}
        <div className="mt-5 space-y-2 rounded-xl border border-slate-800 bg-slate-950/60 p-4 text-xs">
          <div className="flex justify-between py-1 border-b border-slate-800/80">
            <span className="text-slate-400">Cliente:</span>
            <span className="font-semibold text-white">{data.cliente}</span>
          </div>
          <div className="flex justify-between py-1 border-b border-slate-800/80">
            <span className="text-slate-400">N° Suscripción:</span>
            <span className="font-mono font-semibold text-white">{data.numSuscripcion}</span>
          </div>
          <div className="flex justify-between py-1 border-b border-slate-800/80">
            <span className="text-slate-400">Vehículo & Plan:</span>
            <span className="font-semibold text-emerald-300 text-right">
              {data.marca} {data.modelo} ({data.tipoPlan})
            </span>
          </div>
          <div className="flex justify-between py-1 border-b border-slate-800/80">
            <span className="text-slate-400">Condición:</span>
            <span className="font-semibold text-white">
              {data.senaOCompleta}
              {data.autorizoDescuento && (
                <span className="text-amber-300 font-normal text-[11px] ml-1">
                  (Aut: {data.autorizoDescuento})
                </span>
              )}
            </span>
          </div>
          <div className="flex justify-between py-1 border-b border-slate-800/80">
            <span className="text-slate-400">Monto Cobrado:</span>
            <span className="font-mono font-bold text-sm text-emerald-400">
              {formatCurrency(data.montoCobrado)}
            </span>
          </div>
          {data.entregaUsado === 'Sí' && (
            <div className="flex justify-between py-1 border-b border-slate-800/80 text-amber-300">
              <span>Auto Usado ({data.anoUsado}):</span>
              <span className="font-semibold text-right">
                {data.modeloUsado} (Toma: {formatCurrency(data.valorToma)})
              </span>
            </div>
          )}
          <div className="flex justify-between py-1">
            <span className="text-slate-400">Vendedor / Equipo:</span>
            <span className="font-medium text-slate-300 text-right">
              {data.vendedor} ({data.equipoVenta})
            </span>
          </div>
        </div>

        {/* Botones de acción */}
        <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            type="button"
            onClick={handleCopy}
            id="btn-copiar-whatsapp"
            className="flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-800 py-3 text-xs font-bold text-white hover:bg-slate-700 transition active:scale-95"
          >
            {copied ? (
              <>
                <Check className="h-4 w-4 text-emerald-400" />
                <span className="text-emerald-400">¡Copiado!</span>
              </>
            ) : (
              <>
                <Copy className="h-4 w-4 text-slate-300" />
                <span>Copiar para WhatsApp</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={onClose}
            id="btn-cargar-nueva-venta"
            className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 py-3 text-xs font-bold text-white hover:from-emerald-500 hover:to-teal-500 transition shadow-lg shadow-emerald-950/40 active:scale-95"
          >
            <PlusCircle className="h-4 w-4" />
            <span>Cargar Nueva Venta</span>
          </button>
        </div>
      </div>
    </div>
  );
};
