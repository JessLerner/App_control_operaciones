import React, { useState, useMemo, useEffect } from 'react';
import {
  Calendar,
  User,
  Hash,
  Car,
  Layers,
  DollarSign,
  AlertCircle,
  Check,
  Send,
  Users,
  Compass,
  ArrowRight,
  Sparkles,
  RefreshCw,
  Lock,
  UserCheck,
} from 'lucide-react';
import {
  MarcaAuto,
  VentaFormData,
  ReferenceData,
  SenaOCompleta,
  EntregaUsado,
  AUTORIZADORES_DESCUENTO,
} from '../types';
import { MARCAS_DISPONIBLES } from '../data/initialReferenceData';
import {
  formatNumberWithThousands,
  parseCurrencyInput,
  getTodayDateString,
  formatCurrency,
} from '../utils/formatters';
import { checkSubscriptionExists } from '../services/sheetsService';

interface ParteDiarioFormProps {
  referenceData: ReferenceData;
  onSubmit: (formData: VentaFormData) => Promise<void>;
  isSubmitting: boolean;
  initialValues?: Partial<VentaFormData>;
}

export const ParteDiarioForm: React.FC<ParteDiarioFormProps> = ({
  referenceData,
  onSubmit,
  isSubmitting,
  initialValues,
}) => {
  // Form State
  const [fecha, setFecha] = useState<string>(initialValues?.fecha || getTodayDateString());
  const [cliente, setCliente] = useState<string>(initialValues?.cliente || '');
  const [numSuscripcion, setNumSuscripcion] = useState<string>(initialValues?.numSuscripcion || '');
  const [marca, setMarca] = useState<MarcaAuto | ''>(initialValues?.marca || '');
  const [modelo, setModelo] = useState<string>(initialValues?.modelo || '');
  const [tipoPlan, setTipoPlan] = useState<string>(initialValues?.tipoPlan || '');
  
  // Valor Cuota #1: 100% automático, solo lectura
  const [valorCuota1, setValorCuota1] = useState<number | ''>(initialValues?.valorCuota1 || '');
  const [montoCobrado, setMontoCobrado] = useState<number | ''>(initialValues?.montoCobrado || '');
  
  // Condición de Cobro: Completa, Seña o Descuento Aprobado
  const [senaOCompleta, setSenaOCompleta] = useState<SenaOCompleta>(
    initialValues?.senaOCompleta || 'Completa'
  );
  const [autorizoDescuento, setAutorizoDescuento] = useState<string>(
    initialValues?.autorizoDescuento || ''
  );
  const [otroAutorizador, setOtroAutorizador] = useState<string>('');

  // 1. Valor Predeterminado (Default) en "Sí" para Entrega Usado
  const [entregaUsado, setEntregaUsado] = useState<EntregaUsado>(
    initialValues?.entregaUsado || 'Sí'
  );
  const [modeloUsado, setModeloUsado] = useState<string>(initialValues?.modeloUsado || '');
  const [anoUsado, setAnoUsado] = useState<number | ''>(initialValues?.anoUsado || '');
  const [valorInfoauto, setValorInfoauto] = useState<number | ''>(
    initialValues?.valorInfoauto || ''
  );
  const [valorToma, setValorToma] = useState<number | ''>(initialValues?.valorToma || '');

  // Team & Seller & Origin
  const [equipoVenta, setEquipoVenta] = useState<string>(initialValues?.equipoVenta || '');
  const [vendedor, setVendedor] = useState<string>(initialValues?.vendedor || '');
  const [origenDato, setOrigenDato] = useState<string>(initialValues?.origenDato || '');

  // Field touched states
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const markTouched = (field: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  // Validación de N° Suscripción duplicado en tiempo real (PRIMARY KEY)
  const isDuplicateSubscription = useMemo(() => {
    if (!numSuscripcion || !numSuscripcion.trim()) return false;
    return checkSubscriptionExists(numSuscripcion.trim());
  }, [numSuscripcion]);

  // 1. Filtrado de Modelos según Marca seleccionada
  const availableModelos = useMemo(() => {
    if (!marca) return [];
    const modelsSet = new Set<string>();
    referenceData.modelosYPrecios
      .filter((item) => item.marca.toUpperCase() === marca.toUpperCase())
      .forEach((item) => modelsSet.add(item.modelo));
    return Array.from(modelsSet).sort();
  }, [marca, referenceData.modelosYPrecios]);

  // 2. Filtrado de Tipos de Plan según Marca y Modelo seleccionados
  const availablePlanes = useMemo(() => {
    if (!marca || !modelo) return [];
    const planesSet = new Set<string>();
    referenceData.modelosYPrecios
      .filter(
        (item) =>
          item.marca.toUpperCase() === marca.toUpperCase() &&
          item.modelo.toLowerCase() === modelo.toLowerCase()
      )
      .forEach((item) => planesSet.add(item.tipoPlan));
    return Array.from(planesSet);
  }, [marca, modelo, referenceData.modelosYPrecios]);

  // 3. Autocompletado dinámico de 'Valor Cuota #1' (100% Automático de tabla, Solo Lectura)
  useEffect(() => {
    if (marca && modelo && tipoPlan) {
      const match = referenceData.modelosYPrecios.find(
        (item) =>
          item.marca.toUpperCase() === marca.toUpperCase() &&
          item.modelo.toLowerCase() === modelo.toLowerCase() &&
          item.tipoPlan.toLowerCase() === tipoPlan.toLowerCase()
      );
      if (match && match.valorCuota1 > 0) {
        setValorCuota1(match.valorCuota1);
      } else {
        setValorCuota1('');
      }
    } else {
      setValorCuota1('');
    }
  }, [marca, modelo, tipoPlan, referenceData.modelosYPrecios]);

  // 4. NUEVA LÓGICA CONDICIONAL: Monto Cobrado -> Seña o Completa
  // Escenario A: Monto Cobrado >= Valor Cuota #1
  // -> Se autocompleta automáticamente en "Completa", se deshabilita para edición, y se ocultan campos de autorización.
  // Escenario B: Monto Cobrado < Valor Cuota #1
  // -> Se habilita para elegir entre "Seña" o "Descuento Aprobado".
  const isMontoCobradoMenorACuota = useMemo(() => {
    if (typeof montoCobrado === 'number' && typeof valorCuota1 === 'number' && valorCuota1 > 0) {
      return montoCobrado < valorCuota1;
    }
    return false;
  }, [montoCobrado, valorCuota1]);

  useEffect(() => {
    if (typeof montoCobrado === 'number' && typeof valorCuota1 === 'number' && valorCuota1 > 0) {
      if (montoCobrado >= valorCuota1) {
        // Escenario A: Cobro completo o superior
        setSenaOCompleta('Completa');
        setAutorizoDescuento('');
        setOtroAutorizador('');
      } else {
        // Escenario B: Cobro menor a cuota 1 -> Debe ser Seña o Descuento Aprobado
        if (senaOCompleta === 'Completa') {
          setSenaOCompleta('Seña');
        }
      }
    }
  }, [montoCobrado, valorCuota1, senaOCompleta]);

  // Manejo de cascada al cambiar Marca
  const handleMarcaChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newMarca = e.target.value as MarcaAuto;
    setMarca(newMarca);
    setModelo('');
    setTipoPlan('');
    setValorCuota1('');
    markTouched('marca');
  };

  // Manejo de cascada al cambiar Modelo
  const handleModeloChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newModelo = e.target.value;
    setModelo(newModelo);
    setTipoPlan('');
    setValorCuota1('');
    markTouched('modelo');
  };

  // Manejo de cambio de Tipo de Plan
  const handleTipoPlanChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setTipoPlan(e.target.value);
    markTouched('tipoPlan');
  };

  // Filtrado de Vendedores según Equipo de Venta (Supervisor)
  const availableVendedores = useMemo(() => {
    if (!equipoVenta) return [];
    const team = referenceData.equiposDeVenta.find(
      (eq) => eq.supervisor.toLowerCase() === equipoVenta.toLowerCase()
    );
    return team ? team.vendedores : [];
  }, [equipoVenta, referenceData.equiposDeVenta]);

  const handleEquipoChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newEquipo = e.target.value;
    setEquipoVenta(newEquipo);
    setVendedor('');
    markTouched('equipoVenta');
  };

  // Validación de campos requeridos y coherencia de datos
  const validationErrors = useMemo(() => {
    const errors: string[] = [];

    if (!fecha) errors.push('Fecha');
    if (!cliente.trim()) errors.push('Cliente');
    
    // N° Suscripción (Primary Key)
    if (!numSuscripcion.trim()) {
      errors.push('N° Suscripción');
    } else if (isDuplicateSubscription) {
      errors.push('N° Suscripción ya registrado');
    }

    if (!marca) errors.push('Marca');
    if (!modelo) errors.push('Modelo');
    if (!tipoPlan) errors.push('Tipo de Plan');
    if (valorCuota1 === '' || valorCuota1 <= 0) errors.push('Valor Cuota #1 (requiere Marca, Modelo y Plan)');
    if (montoCobrado === '' || montoCobrado <= 0) errors.push('Monto Cobrado');

    // Validación de Descuento Aprobado
    if (isMontoCobradoMenorACuota && senaOCompleta === 'Descuento Aprobado') {
      if (!autorizoDescuento) {
        errors.push('Autorizador del descuento');
      } else if (autorizoDescuento === 'Otro' && !otroAutorizador.trim()) {
        errors.push('Especificar nombre en Otro');
      }
    }

    // Validación de Usado (default 'Sí')
    if (entregaUsado === 'Sí') {
      if (!modeloUsado.trim()) errors.push('Modelo Usado');
      if (!anoUsado || anoUsado < 1980 || anoUsado > new Date().getFullYear() + 1)
        errors.push('Año Usado válido');
      if (valorInfoauto === '' || valorInfoauto <= 0) errors.push('Valor Infoauto');
      if (valorToma === '' || valorToma <= 0) errors.push('Valor Toma');
    }

    if (!equipoVenta) errors.push('Equipo de Venta');
    if (!vendedor) errors.push('Vendedor');
    if (!origenDato) errors.push('Origen del Dato');

    return errors;
  }, [
    fecha,
    cliente,
    numSuscripcion,
    isDuplicateSubscription,
    marca,
    modelo,
    tipoPlan,
    valorCuota1,
    montoCobrado,
    isMontoCobradoMenorACuota,
    senaOCompleta,
    autorizoDescuento,
    otroAutorizador,
    entregaUsado,
    modeloUsado,
    anoUsado,
    valorInfoauto,
    valorToma,
    equipoVenta,
    vendedor,
    origenDato,
  ]);

  const isFormValid = validationErrors.length === 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid || isSubmitting) return;

    const finalAutorizador =
      senaOCompleta === 'Descuento Aprobado'
        ? autorizoDescuento === 'Otro'
          ? `Otro: ${otroAutorizador.trim()}`
          : autorizoDescuento
        : '';

    const payload: VentaFormData = {
      fecha,
      cliente: cliente.trim(),
      numSuscripcion: numSuscripcion.trim(),
      marca,
      modelo,
      tipoPlan,
      senaOCompleta,
      autorizoDescuento: finalAutorizador,
      valorCuota1: typeof valorCuota1 === 'number' ? valorCuota1 : 0,
      montoCobrado: typeof montoCobrado === 'number' ? montoCobrado : 0,
      entregaUsado,
      modeloUsado: entregaUsado === 'Sí' ? modeloUsado.trim() : '',
      anoUsado: entregaUsado === 'Sí' && typeof anoUsado === 'number' ? anoUsado : '',
      valorInfoauto: entregaUsado === 'Sí' && typeof valorInfoauto === 'number' ? valorInfoauto : '',
      valorToma: entregaUsado === 'Sí' && typeof valorToma === 'number' ? valorToma : '',
      equipoVenta,
      vendedor,
      origenDato,
    };

    await onSubmit(payload);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5 pb-16">
      {/* SECCIÓN 1: DATOS DE LA OPERACIÓN Y CLIENTE */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-4 sm:p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-400">
            <User className="h-4 w-4" />
          </div>
          <h2 className="text-sm font-bold tracking-wide text-white uppercase">
            1. Datos del Cliente y Suscripción (Clave Principal)
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {/* 1. Fecha */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-slate-400" />
              1. Fecha de Carga *
            </label>
            <input
              type="date"
              id="input-fecha"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-800/90 px-3.5 py-2.5 text-sm text-white focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition"
              required
            />
          </div>

          {/* 2. Cliente */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
              <User className="h-3.5 w-3.5 text-slate-400" />
              2. Nombre y Apellido del Cliente *
            </label>
            <input
              type="text"
              id="input-cliente"
              value={cliente}
              onBlur={() => markTouched('cliente')}
              onChange={(e) => setCliente(e.target.value)}
              placeholder="Ej: Marcelo Gómez"
              className={`w-full rounded-xl border px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 transition ${
                touched.cliente && !cliente.trim()
                  ? 'border-red-500 bg-red-950/20 focus:border-red-500 focus:ring-red-500'
                  : 'border-slate-700 bg-slate-800/90 focus:border-emerald-500 focus:ring-emerald-500'
              }`}
              required
            />
          </div>

          {/* 3. N° Suscripción (PRIMARY KEY) */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Hash className="h-3.5 w-3.5 text-emerald-400" />
                3. N° Suscripción (Primary Key) *
              </span>
              <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                Clave Única
              </span>
            </label>
            <input
              type="text"
              id="input-num-suscripcion"
              value={numSuscripcion}
              onBlur={() => markTouched('numSuscripcion')}
              onChange={(e) => setNumSuscripcion(e.target.value)}
              placeholder="Ej: 849201"
              className={`w-full rounded-xl border px-3.5 py-2.5 text-sm font-mono text-white placeholder-slate-500 focus:outline-none focus:ring-1 transition ${
                isDuplicateSubscription
                  ? 'border-red-500 bg-red-950/30 text-red-200 focus:border-red-500 focus:ring-red-500'
                  : touched.numSuscripcion && !numSuscripcion.trim()
                  ? 'border-red-500 bg-red-950/20 focus:border-red-500 focus:ring-red-500'
                  : 'border-slate-700 bg-slate-800/90 focus:border-emerald-500 focus:ring-emerald-500'
              }`}
              required
            />
            {isDuplicateSubscription && (
              <p className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-red-400">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                <span>Este N° de Suscripción ya existe en la base de datos (Clave Duplicada).</span>
              </p>
            )}
          </div>
        </div>
      </div>

      {/* SECCIÓN 2: VEHÍCULO, PLAN Y VALORES (CASCADA DINÁMICA & LÓGICA DE PRECIOS) */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-4 sm:p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-500/15 text-blue-400">
              <Car className="h-4 w-4" />
            </div>
            <h2 className="text-sm font-bold tracking-wide text-white uppercase">
              2. Selección de Vehículo y Condición de Pago
            </h2>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {/* 4. Marca */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              4. Marca *
            </label>
            <select
              id="select-marca"
              value={marca}
              onChange={handleMarcaChange}
              className={`w-full rounded-xl border px-3.5 py-2.5 text-sm text-white focus:outline-none focus:ring-1 transition ${
                !marca
                  ? 'border-slate-700 bg-slate-800/90 text-slate-400'
                  : 'border-emerald-500/60 bg-slate-800 text-white font-medium focus:ring-emerald-500'
              }`}
              required
            >
              <option value="">-- Seleccionar Marca --</option>
              {MARCAS_DISPONIBLES.map((m) => (
                <option key={m} value={m} className="bg-slate-900 text-white">
                  {m}
                </option>
              ))}
            </select>
          </div>

          {/* 5. Modelo (Dependiente de Marca) */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
              <span>5. Modelo *</span>
              {marca && (
                <span className="text-[10px] text-emerald-400 font-normal">
                  {availableModelos.length} opciones
                </span>
              )}
            </label>
            <select
              id="select-modelo"
              value={modelo}
              disabled={!marca}
              onChange={handleModeloChange}
              className={`w-full rounded-xl border px-3.5 py-2.5 text-sm focus:outline-none focus:ring-1 transition ${
                !marca
                  ? 'border-slate-800 bg-slate-900/50 text-slate-600 cursor-not-allowed'
                  : !modelo
                  ? 'border-slate-700 bg-slate-800/90 text-slate-400'
                  : 'border-emerald-500/60 bg-slate-800 text-white font-medium focus:ring-emerald-500'
              }`}
              required
            >
              <option value="">
                {!marca ? 'Primero elija Marca' : '-- Seleccionar Modelo --'}
              </option>
              {availableModelos.map((mod) => (
                <option key={mod} value={mod} className="bg-slate-900 text-white">
                  {mod}
                </option>
              ))}
            </select>
          </div>

          {/* 6. Tipo de Plan (Dependiente de Modelo) */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
              <span>6. Tipo de Plan *</span>
              {modelo && (
                <span className="text-[10px] text-emerald-400 font-normal">
                  {availablePlanes.join(' | ')}
                </span>
              )}
            </label>
            <select
              id="select-tipo-plan"
              value={tipoPlan}
              disabled={!modelo}
              onChange={handleTipoPlanChange}
              className={`w-full rounded-xl border px-3.5 py-2.5 text-sm focus:outline-none focus:ring-1 transition ${
                !modelo
                  ? 'border-slate-800 bg-slate-900/50 text-slate-600 cursor-not-allowed'
                  : !tipoPlan
                  ? 'border-slate-700 bg-slate-800/90 text-slate-400'
                  : 'border-emerald-500/60 bg-slate-800 text-white font-semibold focus:ring-emerald-500'
              }`}
              required
            >
              <option value="">
                {!modelo ? 'Primero elija Modelo' : '-- Seleccionar Tipo de Plan --'}
              </option>
              {availablePlanes.map((plan) => (
                <option key={plan} value={plan} className="bg-slate-900 text-white">
                  {plan}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Separador sutil */}
        <div className="my-4 border-t border-slate-800/80" />

        {/* 8, 9, 7: Valores Financieros y Condición */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {/* 8. Valor Cuota #1 (100% Automático de catálogo - Solo Lectura) */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1">
                <DollarSign className="h-3.5 w-3.5 text-emerald-400" />
                8. Valor Cuota #1 (Catálogo)
              </span>
              <span className="inline-flex items-center gap-1 text-[10px] text-slate-300 bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700">
                <Lock className="h-2.5 w-2.5 text-slate-400" /> Solo Lectura
              </span>
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">
                $
              </span>
              <input
                type="text"
                id="input-valor-cuota-1"
                value={formatNumberWithThousands(valorCuota1)}
                readOnly
                disabled
                placeholder="Automático según Plan"
                className="w-full rounded-xl border border-slate-700/60 bg-slate-950/70 pl-8 pr-3.5 py-2.5 text-sm font-bold font-mono text-slate-200 cursor-not-allowed select-none"
              />
            </div>
            <p className="mt-1 text-[11px] text-slate-400">
              {valorCuota1 !== ''
                ? 'Valor oficial fijado automáticamente por lista de precios.'
                : 'Selecciona Marca, Modelo y Plan para cargar el valor.'}
            </p>
          </div>

          {/* 9. Monto Cobrado (Moneda $, Obligatorio) */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1 text-emerald-400">
                <DollarSign className="h-3.5 w-3.5 text-emerald-400" />
                9. Monto Cobrado *
              </span>
              {typeof valorCuota1 === 'number' && valorCuota1 > 0 && (
                <button
                  type="button"
                  onClick={() => setMontoCobrado(valorCuota1)}
                  className="text-[10px] text-emerald-400 underline hover:text-emerald-300"
                >
                  Cobro 100% Cuota
                </button>
              )}
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-emerald-400">
                $
              </span>
              <input
                type="text"
                id="input-monto-cobrado"
                value={formatNumberWithThousands(montoCobrado)}
                onBlur={() => markTouched('montoCobrado')}
                onChange={(e) => {
                  const num = parseCurrencyInput(e.target.value);
                  setMontoCobrado(num > 0 ? num : '');
                }}
                placeholder="0"
                className={`w-full rounded-xl border pl-8 pr-3.5 py-2.5 text-sm font-bold font-mono text-emerald-300 placeholder-slate-600 focus:outline-none focus:ring-1 transition ${
                  touched.montoCobrado && (montoCobrado === '' || montoCobrado <= 0)
                    ? 'border-red-500 bg-red-950/20 focus:border-red-500 focus:ring-red-500'
                    : 'border-emerald-500/70 bg-slate-800/90 focus:border-emerald-400 focus:ring-emerald-400'
                }`}
                required
              />
            </div>
            <p className="mt-1 text-[11px] text-slate-400">
              Efectivo o transferencia cobrada al cliente.
            </p>
          </div>

          {/* 7. Seña, Completa o Descuento Aprobado (Lógica Condicional de Montos) */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
              <span>7. Seña o Completa *</span>
              {!isMontoCobradoMenorACuota && typeof valorCuota1 === 'number' && valorCuota1 > 0 && typeof montoCobrado === 'number' && montoCobrado >= valorCuota1 ? (
                <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                  Auto: Completa (Cobro &ge; Cuota)
                </span>
              ) : isMontoCobradoMenorACuota ? (
                <span className="text-[10px] text-amber-300 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                  Cobro &lt; Cuota 1
                </span>
              ) : null}
            </label>

            {/* Escenario A: Monto Cobrado >= Valor Cuota #1 -> Deshabilitado en "Completa" */}
            {!isMontoCobradoMenorACuota ? (
              <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 py-2.5 px-3 flex items-center justify-between text-xs font-bold text-emerald-300">
                <div className="flex items-center gap-1.5">
                  <Check className="h-4 w-4 text-emerald-400" />
                  <span>Completa (Fijado automáticamente)</span>
                </div>
                <Lock className="h-3.5 w-3.5 text-emerald-400/60" />
              </div>
            ) : (
              /* Escenario B: Monto Cobrado < Valor Cuota #1 -> Habilitado para elegir entre "Seña" o "Descuento Aprobado" */
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  id="btn-cobro-sena"
                  onClick={() => {
                    setSenaOCompleta('Seña');
                    setAutorizoDescuento('');
                    setOtroAutorizador('');
                  }}
                  className={`flex items-center justify-center gap-1.5 rounded-xl border py-2.5 text-xs font-bold transition ${
                    senaOCompleta === 'Seña'
                      ? 'border-blue-500 bg-blue-500/20 text-blue-300 ring-1 ring-blue-500'
                      : 'border-slate-700 bg-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {senaOCompleta === 'Seña' && <Check className="h-3.5 w-3.5" />}
                  Seña
                </button>
                <button
                  type="button"
                  id="btn-cobro-descuento"
                  onClick={() => setSenaOCompleta('Descuento Aprobado')}
                  className={`flex items-center justify-center gap-1.5 rounded-xl border py-2.5 text-xs font-bold transition ${
                    senaOCompleta === 'Descuento Aprobado'
                      ? 'border-amber-500 bg-amber-500/20 text-amber-300 ring-1 ring-amber-500'
                      : 'border-slate-700 bg-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {senaOCompleta === 'Descuento Aprobado' && <Check className="h-3.5 w-3.5" />}
                  Descuento Aprobado
                </button>
              </div>
            )}
            <p className="mt-1 text-[11px] text-slate-400">
              {!isMontoCobradoMenorACuota
                ? 'Al cubrir o superar la cuota #1, el plan califica como suscripción Completa.'
                : 'Monto inferior a la cuota #1: elige si es Seña de reserva o Descuento Aprobado.'}
            </p>
          </div>
        </div>

        {/* CAMPO DINÁMICO CONDICIONAL: ¿Quién autorizó el descuento? */}
        {isMontoCobradoMenorACuota && senaOCompleta === 'Descuento Aprobado' && (
          <div className="mt-4 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3.5 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="flex items-center gap-2 mb-2 text-xs font-bold text-amber-300">
              <UserCheck className="h-4 w-4 text-amber-400" />
              <span>Autorización de Descuento en Cuota #1</span>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-200 mb-1.5">
                  ¿Quién autorizó el descuento? *
                </label>
                <select
                  id="select-autorizo-descuento"
                  value={autorizoDescuento}
                  onChange={(e) => setAutorizoDescuento(e.target.value)}
                  className="w-full rounded-xl border border-amber-500/60 bg-slate-800 px-3.5 py-2.5 text-sm text-white focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400 transition"
                  required
                >
                  <option value="">-- Seleccionar Gerencia / Responsable --</option>
                  {AUTORIZADORES_DESCUENTO.map((aut) => (
                    <option key={aut} value={aut} className="bg-slate-900 text-white">
                      {aut}
                    </option>
                  ))}
                </select>
              </div>

              {autorizoDescuento === 'Otro' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-200 mb-1.5">
                    Especificar Nombre del Autorizador *
                  </label>
                  <input
                    type="text"
                    id="input-otro-autorizador"
                    value={otroAutorizador}
                    onChange={(e) => setOtroAutorizador(e.target.value)}
                    placeholder="Nombre y cargo de quien autorizó"
                    className="w-full rounded-xl border border-amber-500/60 bg-slate-800 px-3.5 py-2.5 text-sm text-white placeholder-slate-400 focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400 transition"
                    required
                  />
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* SECCIÓN 3: TOMA DE AUTO USADO (DEFAULT "SÍ", CAMPOS VISIBLES Y OBLIGATORIOS POR DEFECTO) */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-4 sm:p-5 shadow-sm transition">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <div
              className={`flex h-7 w-7 items-center justify-center rounded-lg transition ${
                entregaUsado === 'Sí'
                  ? 'bg-amber-500/20 text-amber-400'
                  : 'bg-slate-800 text-slate-400'
              }`}
            >
              <Car className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold tracking-wide text-white uppercase">
                3. Entrega de Vehículo Usado (Predeterminado: Sí)
              </h2>
              <p className="text-xs text-slate-400">
                Los campos de usado vienen activos por defecto para evitar omisiones involuntarias.
              </p>
            </div>
          </div>

          {/* 10. Switch / Radio: ¿Entrega Usado? (Default: Sí) */}
          <div className="flex items-center gap-2 bg-slate-800 p-1 rounded-xl border border-slate-700 w-fit">
            <button
              type="button"
              id="btn-usado-si"
              onClick={() => setEntregaUsado('Sí')}
              className={`rounded-lg px-4 py-1.5 text-xs font-bold transition ${
                entregaUsado === 'Sí'
                  ? 'bg-amber-500 text-slate-950 shadow font-extrabold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Sí, Entrega Usado
            </button>
            <button
              type="button"
              id="btn-usado-no"
              onClick={() => {
                setEntregaUsado('No');
                setModeloUsado('');
                setAnoUsado('');
                setValorInfoauto('');
                setValorToma('');
              }}
              className={`rounded-lg px-4 py-1.5 text-xs font-bold transition ${
                entregaUsado === 'No'
                  ? 'bg-slate-700 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              No
            </button>
          </div>
        </div>

        {/* Campos Condicionales Desplegables */}
        {entregaUsado === 'Sí' ? (
          <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="mb-3 flex items-center gap-2 text-xs font-medium text-amber-300">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>
                Campos obligatorios requeridos para la toma de unidad usada en parte de pago.
              </span>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
              {/* 11. Modelo Usado */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  11. Modelo Usado (Marca, Versión) *
                </label>
                <input
                  type="text"
                  id="input-modelo-usado"
                  value={modeloUsado}
                  onChange={(e) => setModeloUsado(e.target.value)}
                  placeholder="Ej: Chevrolet Onix 1.4 LTZ"
                  className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400 transition"
                  required={entregaUsado === 'Sí'}
                />
              </div>

              {/* 12. Año Usado */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  12. Año *
                </label>
                <input
                  type="number"
                  id="input-ano-usado"
                  min="1980"
                  max={new Date().getFullYear() + 1}
                  value={anoUsado}
                  onChange={(e) => {
                    const val = e.target.value ? parseInt(e.target.value, 10) : '';
                    setAnoUsado(val);
                  }}
                  placeholder="Ej: 2019"
                  className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3.5 py-2.5 text-sm font-mono text-white placeholder-slate-500 focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400 transition"
                  required={entregaUsado === 'Sí'}
                />
              </div>

              {/* 13. Valor Infoauto */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  13. Valor Infoauto *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                    $
                  </span>
                  <input
                    type="text"
                    id="input-valor-infoauto"
                    value={formatNumberWithThousands(valorInfoauto)}
                    onChange={(e) => {
                      const num = parseCurrencyInput(e.target.value);
                      setValorInfoauto(num > 0 ? num : '');
                    }}
                    placeholder="0"
                    className="w-full rounded-xl border border-slate-700 bg-slate-800 pl-7 pr-3 py-2.5 text-sm font-mono text-white placeholder-slate-500 focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400 transition"
                    required={entregaUsado === 'Sí'}
                  />
                </div>
              </div>

              {/* 14. Valor Toma */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
                  <span>14. Valor de Toma Concesionario *</span>
                  {typeof valorInfoauto === 'number' &&
                    typeof valorToma === 'number' &&
                    valorInfoauto > 0 &&
                    valorToma > 0 && (
                      <span className="text-[10px] text-slate-400">
                        Dif: {formatCurrency(valorInfoauto - valorToma)}
                      </span>
                    )}
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-amber-400">
                    $
                  </span>
                  <input
                    type="text"
                    id="input-valor-toma"
                    value={formatNumberWithThousands(valorToma)}
                    onChange={(e) => {
                      const num = parseCurrencyInput(e.target.value);
                      setValorToma(num > 0 ? num : '');
                    }}
                    placeholder="0"
                    className="w-full rounded-xl border border-slate-700 bg-slate-800 pl-7 pr-3 py-2.5 text-sm font-mono text-amber-300 placeholder-slate-500 focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400 transition"
                    required={entregaUsado === 'Sí'}
                  />
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-2 rounded-xl bg-slate-800/40 p-3 text-center border border-dashed border-slate-800">
            <span className="text-xs text-slate-400">
              Operación directa sin auto usado. Los campos de peritaje están ocultos y no son requeridos.
            </span>
          </div>
        )}
      </div>

      {/* SECCIÓN 4: ASIGNACIÓN COMERCIAL Y ORIGEN */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-4 sm:p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-teal-500/15 text-teal-400">
            <Users className="h-4 w-4" />
          </div>
          <h2 className="text-sm font-bold tracking-wide text-white uppercase">
            4. Equipo, Vendedor y Origen del Dato
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {/* 15. Equipo de Venta (Supervisor) */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              15. Equipo de Venta (Supervisor) *
            </label>
            <select
              id="select-equipo-venta"
              value={equipoVenta}
              onChange={handleEquipoChange}
              className={`w-full rounded-xl border px-3.5 py-2.5 text-sm focus:outline-none focus:ring-1 transition ${
                !equipoVenta
                  ? 'border-slate-700 bg-slate-800/90 text-slate-400'
                  : 'border-emerald-500/60 bg-slate-800 text-white font-medium focus:ring-emerald-500'
              }`}
              required
            >
              <option value="">-- Seleccionar Equipo --</option>
              {referenceData.equiposDeVenta.map((eq) => (
                <option key={eq.supervisor} value={eq.supervisor} className="bg-slate-900 text-white">
                  {eq.supervisor}
                </option>
              ))}
            </select>
          </div>

          {/* 16. Apellido y Nombre Vendedor (Dependiente de Equipo) */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
              <span>16. Apellido y Nombre Vendedor *</span>
              {equipoVenta && (
                <span className="text-[10px] text-emerald-400 font-normal">
                  {availableVendedores.length} vendedores
                </span>
              )}
            </label>
            <select
              id="select-vendedor"
              value={vendedor}
              disabled={!equipoVenta}
              onChange={(e) => {
                setVendedor(e.target.value);
                markTouched('vendedor');
              }}
              className={`w-full rounded-xl border px-3.5 py-2.5 text-sm focus:outline-none focus:ring-1 transition ${
                !equipoVenta
                  ? 'border-slate-800 bg-slate-900/50 text-slate-600 cursor-not-allowed'
                  : !vendedor
                  ? 'border-slate-700 bg-slate-800/90 text-slate-400'
                  : 'border-emerald-500/60 bg-slate-800 text-white font-medium focus:ring-emerald-500'
              }`}
              required
            >
              <option value="">
                {!equipoVenta ? 'Primero elija Equipo' : '-- Seleccionar Vendedor --'}
              </option>
              {availableVendedores.map((v) => (
                <option key={v} value={v} className="bg-slate-900 text-white">
                  {v}
                </option>
              ))}
            </select>
          </div>

          {/* 17. Origen del Dato (Cargado desde Origen_datos / AGP) */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Compass className="h-3.5 w-3.5 text-slate-400" />
              17. Origen del Dato (AGP) *
            </label>
            <select
              id="select-origen-dato"
              value={origenDato}
              onChange={(e) => {
                setOrigenDato(e.target.value);
                markTouched('origenDato');
              }}
              className={`w-full rounded-xl border px-3.5 py-2.5 text-sm focus:outline-none focus:ring-1 transition ${
                !origenDato
                  ? 'border-slate-700 bg-slate-800/90 text-slate-400'
                  : 'border-emerald-500/60 bg-slate-800 text-white font-medium focus:ring-emerald-500'
              }`}
              required
            >
              <option value="">-- Seleccionar Origen --</option>
              {referenceData.origenesDatos.map((o) => (
                <option key={o} value={o} className="bg-slate-900 text-white">
                  {o}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* BARRA INFERIOR DE ENVÍO CON VALIDACIÓN EN TIEMPO REAL */}
      <div className="sticky bottom-4 z-20 rounded-2xl border border-slate-700/80 bg-slate-900/95 p-4 shadow-xl backdrop-blur-md">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="w-full sm:w-auto text-left">
            {isFormValid ? (
              <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
                  <Check className="h-3.5 w-3.5" />
                </span>
                <span>Todos los campos obligatorios están validados correctamente</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-xs text-amber-300">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-500/20 text-amber-400 font-bold text-[11px]">
                  !
                </span>
                <span>
                  {isDuplicateSubscription ? (
                    <strong className="text-red-400">N° Suscripción Duplicado. Elige otro.</strong>
                  ) : (
                    <>
                      Faltan {validationErrors.length} campo(s):{' '}
                      <span className="font-medium text-slate-300">
                        {validationErrors.slice(0, 3).join(', ')}
                        {validationErrors.length > 3 ? '...' : ''}
                      </span>
                    </>
                  )}
                </span>
              </div>
            )}
            {montoCobrado !== '' && typeof montoCobrado === 'number' && montoCobrado > 0 && (
              <p className="text-xs text-slate-400 mt-0.5">
                Total a Registrar: <strong className="text-white font-mono">{formatCurrency(montoCobrado)}</strong>
                {' '}&bull; Condición:{' '}
                <strong className={senaOCompleta === 'Completa' ? 'text-emerald-300' : senaOCompleta === 'Descuento Aprobado' ? 'text-amber-300' : 'text-blue-300'}>
                  {senaOCompleta}
                </strong>
                {senaOCompleta === 'Descuento Aprobado' && autorizoDescuento && (
                  <span className="text-slate-300 text-[11px]">
                    {' '}(Aut: {autorizoDescuento === 'Otro' ? otroAutorizador || 'Otro' : autorizoDescuento})
                  </span>
                )}
              </p>
            )}
          </div>

          <button
            type="submit"
            id="btn-enviar-venta"
            disabled={!isFormValid || isSubmitting}
            className={`w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl px-8 py-3.5 text-sm font-bold shadow-lg transition active:scale-95 ${
              !isFormValid || isSubmitting
                ? 'bg-slate-800 text-slate-500 border border-slate-700/60 cursor-not-allowed'
                : 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:from-emerald-500 hover:to-teal-500 shadow-emerald-900/30'
            }`}
          >
            {isSubmitting ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span>Registrando Venta...</span>
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                <span>Registrar Venta</span>
              </>
            )}
          </button>
        </div>
      </div>
    </form>
  );
};
