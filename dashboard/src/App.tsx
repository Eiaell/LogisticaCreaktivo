import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { DataLoader } from './components/DataLoader';
import { KPICards } from './components/KPICards';
import { ProcessGraph } from './components/ProcessGraph';
import { PedidosTable } from './components/PedidosTable';
import { NuevoClienteModal } from './components/NuevoClienteModal';
import { NuevoProveedorModal } from './components/NuevoProveedorModal';
import { NuevoRequerimientoModal, type TipoRequerimiento } from './components/NuevoRequerimientoModal';
import { NuevoPedidoModal } from './components/NuevoPedidoModal';
import { NuevoMovimientoModal } from './components/NuevoMovimientoModal';
import { ProduccionModal } from './components/ProduccionModal';
import { Sidebar } from './components/Sidebar';
import { AppSidebar } from './components/AppSidebar';
import { ClientesPage } from './components/ClientesPage';
import { ClienteFichaPage } from './components/ClienteFichaPage';
import { ProveedoresPage } from './components/ProveedoresPage';
import { ProveedorFichaPage } from './components/ProveedorFichaPage';
import { CatalogoItemsPage } from './components/CatalogoItemsPage';
import { CotizacionesPage } from './components/CotizacionesPage';
import { DiaADiaPage } from './components/DiaADiaPage';
import PKLPage from './components/PKLPage';
import { CostosPage } from './components/CostosPage';
import { ActividadReciente } from './components/ActividadReciente';
import { useDatabase, DatabaseProvider } from './context/DatabaseContext';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider, useToast } from './context/ToastContext';
import { useAutoBackup } from './hooks/useAutoBackup';
import { TIPOS_RENDICION, type TipoRendicion } from './types';
import { findMatchingPKLs } from './utils/pklMatcher';
import { PKLSuggestions } from './components/PKLSuggestions';

type PageView = 'dashboard' | 'clientes' | 'cliente_ficha' | 'proveedores' | 'proveedor_ficha' | 'catalogo_items' | 'cotizaciones' | 'dia_a_dia' | 'pkl' | 'costos';

interface DashboardProps {
  onNavigate: (page: PageView) => void;
  onNuevoRequerimiento: () => void;
  onNavigateToPKL: (pklId: string) => void;
}

// Re-export PageView for child components
export type { PageView };

// Componente PagoRendicionModal
interface PagoRendicionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

function PagoRendicionModal({ isOpen, onClose }: PagoRendicionModalProps) {
  const { createRendicion, clientes, proveedores, pkls } = useDatabase();
  const { showToast } = useToast();

  // Estado del formulario
  const [formData, setFormData] = useState({
    tipo: 'movilidad' as TipoRendicion,
    cliente: '',
    proveedor: '',
    fecha: new Date().toISOString().split('T')[0],
    monto: '',
    moneda: 'PEN' as 'PEN' | 'USD',
    descripcion: '',
    tiene_comprobante: false,
    tipo_comprobante: undefined as 'boleta' | 'factura' | 'recibo' | 'ninguno' | undefined,
    numero_comprobante: '',
    estado: 'registrado' as 'registrado' | 'pendiente' | 'pagado' | 'rechazado',
    observaciones: '',
    pkl_id: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset form cuando se cierra
  useEffect(() => {
    if (!isOpen) {
      setFormData({
        tipo: 'movilidad',
        cliente: '',
        proveedor: '',
        fecha: new Date().toISOString().split('T')[0],
        monto: '',
        moneda: 'PEN',
        descripcion: '',
        tiene_comprobante: false,
        tipo_comprobante: undefined,
        numero_comprobante: '',
        estado: 'registrado',
        observaciones: '',
        pkl_id: ''
      });
    }
  }, [isOpen]);

  // Cerrar con ESC
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    // Validación básica
    if (!formData.tipo || !formData.fecha) {
      showToast('Por favor, completa los campos obligatorios (Tipo, Fecha)', 'warning');
      return;
    }

    if (['movilidad', 'adelanto_produccion', 'pago_saldo', 'gasto_extra', 'compra_material'].includes(formData.tipo)) {
      if (!formData.monto || parseFloat(formData.monto) <= 0) {
        showToast('Por favor, ingresa un monto válido', 'warning');
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const now = new Date().toISOString();
      const rendicionData = {
        id: `RND-${Date.now()}`,
        fecha: formData.fecha,
        tipo: formData.tipo,
        cliente: formData.cliente || undefined,
        proveedor: formData.proveedor || undefined,
        pedido_id: undefined,
        produccion_id: undefined,
        monto: parseFloat(formData.monto) || 0,
        moneda: formData.moneda,
        detalle: {
          concepto: formData.descripcion || '',
          monto: parseFloat(formData.monto) || 0,
          moneda: formData.moneda,
          comprobante: formData.numero_comprobante || undefined
        },
        estado: formData.estado,
        observaciones: formData.observaciones || undefined,
        tiene_comprobante: formData.tiene_comprobante,
        tipo_comprobante: formData.tipo_comprobante || undefined,
        numero_comprobante: formData.numero_comprobante || undefined,
        created_at: now,
        updated_at: now
      };

      await createRendicion(rendicionData);
      console.log('💰 Rendición creada:', rendicionData.id);
      showToast('Rendición guardada exitosamente', 'success');
      onClose();
    } catch (err) {
      console.error('Error creando rendición:', err);
      showToast('Error al guardar la rendición. Por favor, intenta de nuevo.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const clientesList = Object.entries(clientes).map(([key, c]) => ({
    id: key,
    display: c.nombre_comercial || c.razon_social || key
  }));
  const proveedoresList = Object.keys(proveedores);

  // Calcular PKLs sugeridos basados en los datos del formulario
  const pklMatches = useMemo(() => {
    if (!formData.cliente && !formData.proveedor) return [];

    return findMatchingPKLs(
      {
        cliente: formData.cliente,
        proveedor: formData.proveedor,
        fecha: formData.fecha,
        productos: formData.descripcion ? [formData.descripcion] : undefined,
      },
      pkls,
      5 // Top 5
    );
  }, [formData.cliente, formData.proveedor, formData.fecha, formData.descripcion, pkls]);

  return createPortal(
    <div className="fixed inset-0 liquid-glass-overlay z-[9999] flex items-center justify-center p-4">
      <div className="liquid-glass liquid-glass-pink rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 px-6 py-4 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-3xl">💰</span>
              <div>
                <h2 className="text-xl font-bold text-white">PAGO / RENDICIÓN</h2>
                <p className="text-white/70 text-sm">Registro de gastos y rendiciones</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-colors"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {/* Tipo de Rendición */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Tipo de Rendición *</label>
            <select
              value={formData.tipo}
              onChange={(e) => handleChange('tipo', e.target.value)}
              className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-3 text-white focus:border-purple-500 outline-none"
              style={{ colorScheme: 'dark' }}
            >
              {TIPOS_RENDICION.map(t => (
                <option key={t.value} value={t.value}>
                  {t.icon} {t.label}
                </option>
              ))}
            </select>
          </div>

          {/* Cliente y Proveedor */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Cliente</label>
              <select
                value={formData.cliente}
                onChange={(e) => handleChange('cliente', e.target.value)}
                className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-3 text-white focus:border-purple-500 outline-none"
                style={{ colorScheme: 'dark' }}
              >
                <option value="">Seleccionar cliente...</option>
                <option value="INTERNO">🏢 Interno / Creaktivo</option>
                {clientesList.map(c => (
                  <option key={c.id} value={c.id}>{c.display}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Proveedor</label>
              <input
                type="text"
                list="proveedores-list"
                value={formData.proveedor}
                onChange={(e) => handleChange('proveedor', e.target.value.toUpperCase())}
                className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-3 text-white focus:border-purple-500 outline-none placeholder-gray-500"
                placeholder="Nombre del proveedor"
              />
              <datalist id="proveedores-list">
                {proveedoresList.map(p => <option key={p} value={p} />)}
              </datalist>
            </div>
          </div>

          {/* Fecha */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Fecha *</label>
            <input
              type="date"
              value={formData.fecha}
              onChange={(e) => handleChange('fecha', e.target.value)}
              className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-3 text-white focus:border-purple-500 outline-none [color-scheme:dark]"
            />
          </div>

          {/* Monto y Moneda */}
          {formData.tipo !== 'caja_diaria' && (
            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-300 mb-2">Monto *</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.monto}
                  onChange={(e) => handleChange('monto', e.target.value)}
                  className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-3 text-white focus:border-purple-500 outline-none placeholder-gray-500"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Moneda</label>
                <select
                  value={formData.moneda}
                  onChange={(e) => handleChange('moneda', e.target.value)}
                  className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-3 text-white focus:border-purple-500 outline-none"
                  style={{ colorScheme: 'dark' }}
                >
                  <option value="PEN">S/ (Soles)</option>
                  <option value="USD">$ (Dólares)</option>
                </select>
              </div>
            </div>
          )}

          {/* Descripción/Concepto */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Descripción / Concepto</label>
            <input
              type="text"
              value={formData.descripcion}
              onChange={(e) => handleChange('descripcion', e.target.value)}
              className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-3 text-white focus:border-purple-500 outline-none placeholder-gray-500"
              placeholder="Ej: Pasajes del 22/01/2026, Adelanto 50% producción..."
            />
          </div>

          {/* Comprobante */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">¿Tiene comprobante?</label>
              <div className="flex items-center gap-4 h-12">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    checked={formData.tiene_comprobante === true}
                    onChange={() => handleChange('tiene_comprobante', true)}
                    className="text-purple-600 focus:ring-purple-500"
                  />
                  <span className="text-white">Sí</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    checked={formData.tiene_comprobante === false}
                    onChange={() => handleChange('tiene_comprobante', false)}
                    className="text-purple-600 focus:ring-purple-500"
                  />
                  <span className="text-white">No</span>
                </label>
              </div>
            </div>

            {formData.tiene_comprobante && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Tipo</label>
                  <select
                    value={formData.tipo_comprobante || ''}
                    onChange={(e) => handleChange('tipo_comprobante', e.target.value)}
                    className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-3 text-white focus:border-purple-500 outline-none"
                    style={{ colorScheme: 'dark' }}
                  >
                    <option value="">Seleccionar...</option>
                    <option value="boleta">Boleta</option>
                    <option value="factura">Factura</option>
                    <option value="recibo">Recibo</option>
                    <option value="ninguno">Ninguno</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Número</label>
                  <input
                    type="text"
                    value={formData.numero_comprobante}
                    onChange={(e) => handleChange('numero_comprobante', e.target.value)}
                    className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-3 text-white focus:border-purple-500 outline-none placeholder-gray-500"
                    placeholder="000123456"
                  />
                </div>
              </>
            )}
          </div>

          {/* Estado */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Estado</label>
            <select
              value={formData.estado}
              onChange={(e) => handleChange('estado', e.target.value)}
              className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-3 text-white focus:border-purple-500 outline-none"
              style={{ colorScheme: 'dark' }}
            >
              <option value="registrado">Registrado</option>
              <option value="pendiente">Pendiente</option>
              <option value="pagado">Pagado</option>
              <option value="rechazado">Rechazado</option>
            </select>
          </div>

          {/* PKLs Sugeridos */}
          {pklMatches.length > 0 && (
            <PKLSuggestions
              matches={pklMatches}
              selectedPklId={formData.pkl_id}
              onSelectPkl={(pklId) => handleChange('pkl_id', pklId)}
              minScore={50}
            />
          )}

          {/* Vincular a PKL */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Vincular a PKL (Opcional)</label>
            <select
              value={formData.pkl_id}
              onChange={(e) => handleChange('pkl_id', e.target.value)}
              className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-3 text-white focus:border-purple-500 outline-none"
              style={{ colorScheme: 'dark' }}
            >
              <option value="">Sin vincular</option>
              {pkls.map(pkl => (
                <option key={pkl.pkl_id} value={pkl.pkl_id}>
                  {pkl.pkl_id} - {pkl.cliente.nombre} - {pkl.clasificacion.tipo_operacion}
                </option>
              ))}
            </select>
          </div>

          {/* Observaciones */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Observaciones</label>
            <textarea
              value={formData.observaciones}
              onChange={(e) => handleChange('observaciones', e.target.value)}
              rows={3}
              className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-3 text-white focus:border-purple-500 outline-none resize-none placeholder-gray-500"
              placeholder="Notas adicionales..."
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-4 px-6 py-4 border-t border-gray-800">
          <button
            onClick={onClose}
            className="flex-1 py-3 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg font-medium transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="flex-1 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 disabled:opacity-50 text-white rounded-lg font-bold transition-all flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <span className="animate-pulse">Guardando...</span>
            ) : (
              <>
                <span>💾</span>
                Guardar Rendición
              </>
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

function Dashboard({ onNavigate, onNuevoRequerimiento, onNavigateToPKL }: DashboardProps) {
  const { pedidos, clientes, proveedores, pkls } = useDatabase();
  const { createBackup } = useAutoBackup();
  const [activeSidebar, setActiveSidebar] = useState<'shortcuts' | 'alerts' | 'recent_orders'>('shortcuts');
  const [modalType, setModalType] = useState<'cliente' | 'proveedor' | 'nuevo_cliente' | 'nuevo_proveedor' | null>(null);

  const handleCardClick = (title: string) => {
    let nextState: typeof activeSidebar = 'shortcuts';
    if (title === 'Alertas') nextState = 'alerts';
    else if (title === 'Total Pedidos') nextState = 'recent_orders';

    if (activeSidebar === nextState && nextState !== 'shortcuts') {
      setActiveSidebar('shortcuts');
    } else if (nextState !== 'shortcuts') {
      setActiveSidebar(nextState);
    }
  };

  const handleNewEntity = (type: 'cliente' | 'proveedor') => {
    if (type === 'cliente') {
      setModalType('nuevo_cliente');
    } else if (type === 'proveedor') {
      setModalType('nuevo_proveedor');
    }
  };

  const recentOrders = pedidos
    .slice()
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);

  return (
    <div className="min-h-screen p-6 space-y-6">
      {/* Header */}
      <header className="flex items-center mb-4">
        {/* Título - con margen izquierdo para no taparse con sidebar */}
        <div className="flex-shrink-0">
          <p className="text-base font-semibold tracking-widest uppercase leading-tight text-gray-500">
            <span className="text-orange-500">I</span><span className="text-blue-800">NTELIGENCIA</span>
          </p>
          <h1 className="text-4xl font-black tracking-wide leading-tight mt-1">
            <span className="text-orange-500">L</span><span className="text-blue-800">OGÍSTICA</span>
          </h1>
        </div>

        {/* Logo Creaktivo - centrado entre título y botones */}
        <div className="flex-1 flex justify-center items-center px-8">
          <img
            src="/logo-creaktivo.png"
            alt="Creaktivo"
            className="h-16 max-w-md w-full object-contain opacity-90"
          />
        </div>
        <div className="flex gap-3 relative">
          {/* Botones de navegación elegantes */}
          <button
            onClick={() => onNavigate('clientes')}
            className="group px-4 py-2.5 bg-gradient-to-r from-blue-600/20 to-cyan-600/20 border border-blue-500/30 rounded-xl text-blue-300 hover:from-blue-600/40 hover:to-cyan-600/40 hover:border-blue-400/50 hover:text-white transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 flex items-center gap-2"
          >
            <span className="text-lg group-hover:scale-110 transition-transform duration-200">👥</span>
            <span className="font-semibold text-sm">Clientes</span>
            <span className="text-xs bg-blue-500/40 px-2 py-0.5 rounded-full font-medium">{Object.keys(clientes).length}</span>
          </button>
          <button
            onClick={() => onNavigate('proveedores')}
            className="group px-4 py-2.5 bg-gradient-to-r from-emerald-600/20 to-teal-600/20 border border-emerald-500/30 rounded-xl text-emerald-300 hover:from-emerald-600/40 hover:to-teal-600/40 hover:border-emerald-400/50 hover:text-white transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 flex items-center gap-2"
          >
            <span className="text-lg group-hover:scale-110 transition-transform duration-200">🏭</span>
            <span className="font-semibold text-sm">Proveedores</span>
            <span className="text-xs bg-emerald-500/40 px-2 py-0.5 rounded-full font-medium">{Object.keys(proveedores).length}</span>
          </button>
          <button
            onClick={() => onNavigate('catalogo_items')}
            className="group px-4 py-2.5 bg-gradient-to-r from-purple-600/20 to-pink-600/20 border border-purple-500/30 rounded-xl text-purple-300 hover:from-purple-600/40 hover:to-pink-600/40 hover:border-purple-400/50 hover:text-white transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 flex items-center gap-2"
          >
            <span className="text-lg group-hover:scale-110 transition-transform duration-200">📦</span>
            <span className="font-semibold text-sm">Catálogo</span>
          </button>
          <button
            onClick={() => onNavigate('cotizaciones')}
            className="group px-4 py-2.5 bg-gradient-to-r from-yellow-600/20 to-orange-600/20 border border-yellow-500/30 rounded-xl text-yellow-300 hover:from-yellow-600/40 hover:to-orange-600/40 hover:border-yellow-400/50 hover:text-white transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 flex items-center gap-2"
          >
            <span className="text-lg group-hover:scale-110 transition-transform duration-200">💰</span>
            <span className="font-semibold text-sm">Cotizaciones</span>
          </button>
          <button
            onClick={() => onNavigate('pkl')}
            className="group px-4 py-2.5 bg-gradient-to-r from-cyan-600/20 to-blue-600/20 border border-cyan-500/30 rounded-xl text-cyan-300 hover:from-cyan-600/40 hover:to-blue-600/40 hover:border-cyan-400/50 hover:text-white transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 flex items-center gap-2"
          >
            <span className="text-lg group-hover:scale-110 transition-transform duration-200">📋</span>
            <span className="font-semibold text-sm">PKL</span>
            <span className="text-xs bg-cyan-500/40 px-2 py-0.5 rounded-full font-medium">{pkls.length}</span>
          </button>
          <button
            onClick={() => onNavigate('costos')}
            className="group px-4 py-2.5 bg-gradient-to-r from-amber-600/20 to-orange-600/20 border border-amber-500/30 rounded-xl text-amber-300 hover:from-amber-600/40 hover:to-orange-600/40 hover:border-amber-400/50 hover:text-white transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 flex items-center gap-2"
          >
            <span className="text-lg group-hover:scale-110 transition-transform duration-200">📊</span>
            <span className="font-semibold text-sm">Costos</span>
          </button>

          <div className="w-px bg-gray-700/50 mx-2"></div>

          <button
            onClick={() => createBackup()}
            className="px-4 py-2.5 bg-green-600 border border-green-500 rounded-xl text-white hover:bg-green-500 transition-all duration-200 flex items-center gap-2 shadow-md hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 font-semibold text-sm"
            title="Descargar backup completo"
          >
            <span className="text-base">💾</span> Backup
          </button>
        </div>
      </header>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Column: KPIs & Graph */}
        <div className="lg:col-span-4 xl:col-span-3 space-y-6">
          <KPICards onCardClick={handleCardClick} />
          <ProcessGraph />
        </div>

        {/* Right/Bottom Column: Dynamic Sidebar */}
        <div className="lg:col-span-4 xl:col-span-1 xl:col-start-4">
          <Sidebar
            activeSidebar={activeSidebar}
            setActiveSidebar={setActiveSidebar}
            onNewEntity={handleNewEntity}
            onNuevoRequerimiento={onNuevoRequerimiento}
            recentOrders={recentOrders}
            clientes={clientes}
          />
        </div>

        {/* Full Width Table */}
        <div className="col-span-1 lg:col-span-4">
          <PedidosTable onNavigateToPKL={onNavigateToPKL} />
        </div>

        {/* Actividad Reciente - Día a Día */}
        <div className="col-span-1 lg:col-span-4">
          <ActividadReciente
            onVerDiaADia={() => onNavigate('dia_a_dia')}
            maxItems={15}
          />
        </div>
      </div>

      {modalType === 'nuevo_cliente' && <NuevoClienteModal isOpen={true} onClose={() => setModalType(null)} />}
      {modalType === 'nuevo_proveedor' && <NuevoProveedorModal isOpen={true} onClose={() => setModalType(null)} />}
    </div>
  );
}

function AppContent() {
  const { db, events, isLoading, clientes, pedidos, dataSource } = useDatabase();
  // Leer página inicial desde hash de URL
  const [currentPage, setCurrentPage] = useState<PageView>(() => {
    const hash = window.location.hash.replace('#', '') as PageView;
    const validPages: PageView[] = ['dashboard', 'clientes', 'cliente_ficha', 'proveedores', 'proveedor_ficha', 'catalogo_items', 'cotizaciones', 'dia_a_dia', 'pkl', 'costos'];
    return validPages.includes(hash) ? hash : 'dashboard';
  });
  const [selectedClienteRazonSocial, setSelectedClienteRazonSocial] = useState<string | null>(null);
  const [selectedProveedorId, setSelectedProveedorId] = useState<string | null>(null);
  const [selectedPKLId, setSelectedPKLId] = useState<string | null>(null);

  // Estado para volver a la página anterior desde PKL
  const [pklReturnTo, setPklReturnTo] = useState<{ page: PageView; date?: string } | null>(null);

  // Estado de la sidebar con persistencia en localStorage
  const [sidebarExpanded, setSidebarExpanded] = useState(() => {
    const saved = localStorage.getItem('sidebar-expanded');
    return saved !== null ? JSON.parse(saved) : false; // Colapsada por defecto
  });

  // Estado para pedido activo seleccionado
  const [activePedidoId, setActivePedidoId] = useState<string | null>(null);

  // Estado para modales de requerimiento
  const [showRequerimientoModal, setShowRequerimientoModal] = useState(false);
  const [tipoRequerimiento, setTipoRequerimiento] = useState<TipoRequerimiento | null>(null);

  // Persistir página actual en hash de URL
  useEffect(() => {
    window.location.hash = currentPage === 'dashboard' ? '' : currentPage;
  }, [currentPage]);

  // Persistir estado de sidebar
  useEffect(() => {
    localStorage.setItem('sidebar-expanded', JSON.stringify(sidebarExpanded));
  }, [sidebarExpanded]);

  const handleSelectRequerimiento = (tipo: TipoRequerimiento) => {
    setShowRequerimientoModal(false);
    setTipoRequerimiento(tipo);
  };

  const handleCloseRequerimientoFlow = () => {
    setTipoRequerimiento(null);
  };

  const handleSelectPedido = (pedidoId: string) => {
    setActivePedidoId(pedidoId);
    // Aquí podrías navegar a una vista de detalle del pedido
    // Por ahora solo lo marcamos como activo
    console.log('Pedido seleccionado:', pedidoId);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--bg-primary)' }}>
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2" style={{ borderColor: 'var(--accent-cyan)' }}></div>
          <p className="font-mono text-xs animate-pulse" style={{ color: 'var(--accent-cyan)' }}>Sincronizando con la nube...</p>
        </div>
      </div>
    );
  }

  const hasData = dataSource === 'supabase' || db || events.length > 0 || Object.keys(clientes).length > 0 || pedidos.length > 0;
  if (!hasData) return <DataLoader />;

  // Función para renderizar el contenido principal
  const renderMainContent = () => {
    switch (currentPage) {
      case 'clientes':
        return (
          <ClientesPage
            onBack={() => setCurrentPage('dashboard')}
            onSelectCliente={(razonSocial) => {
              setSelectedClienteRazonSocial(razonSocial);
              setCurrentPage('cliente_ficha');
            }}
          />
        );
      case 'cliente_ficha':
        return selectedClienteRazonSocial ? (
          <ClienteFichaPage
            razonSocial={selectedClienteRazonSocial}
            onBack={() => setCurrentPage('clientes')}
          />
        ) : (
          <ClientesPage
            onBack={() => setCurrentPage('dashboard')}
            onSelectCliente={(razonSocial) => {
              setSelectedClienteRazonSocial(razonSocial);
              setCurrentPage('cliente_ficha');
            }}
          />
        );
      case 'proveedores':
        return <ProveedoresPage
          onBack={() => setCurrentPage('dashboard')}
          onSelectProveedor={(proveedorId) => {
            setSelectedProveedorId(proveedorId);
            setCurrentPage('proveedor_ficha');
          }}
        />;
      case 'proveedor_ficha':
        return selectedProveedorId ? (
          <ProveedorFichaPage
            proveedorId={selectedProveedorId}
            onBack={() => setCurrentPage('proveedores')}
          />
        ) : (
          <ProveedoresPage
            onBack={() => setCurrentPage('dashboard')}
            onSelectProveedor={(proveedorId) => {
              setSelectedProveedorId(proveedorId);
              setCurrentPage('proveedor_ficha');
            }}
          />
        );
      case 'catalogo_items':
        return (
          <CatalogoItemsPage onBack={() => setCurrentPage('dashboard')} />
        );
      case 'cotizaciones':
        return (
          <CotizacionesPage
            onBack={() => setCurrentPage('dashboard')}
            onNavigateToPKL={(pklId) => {
              setSelectedPKLId(pklId);
              setPklReturnTo({ page: 'cotizaciones' });
              setCurrentPage('pkl');
            }}
          />
        );
      case 'dia_a_dia':
        return (
          <DiaADiaPage
            onBack={() => setCurrentPage('dashboard')}
            initialSelectedDate={pklReturnTo?.page === 'dia_a_dia' ? pklReturnTo.date : undefined}
            onNavigateToPKL={(pklId, currentDate) => {
              setSelectedPKLId(pklId);
              setPklReturnTo({ page: 'dia_a_dia', date: currentDate });
              setCurrentPage('pkl');
            }}
          />
        );
      case 'pkl':
        return (
          <PKLPage
            initialSelectedPKLId={selectedPKLId}
            onBack={pklReturnTo ? () => {
              const returnPage = pklReturnTo.page;
              setCurrentPage(returnPage);
              // No limpiar pklReturnTo aquí para que DiaADiaPage pueda usar la fecha
            } : undefined}
            returnToLabel={pklReturnTo?.page === 'dia_a_dia' && pklReturnTo.date
              ? `← Volver a ${pklReturnTo.date}`
              : pklReturnTo
                ? '← Volver'
                : undefined}
          />
        );
      case 'costos':
        return (
          <CostosPage onBack={() => setCurrentPage('dashboard')} />
        );
      default:
        return (
          <Dashboard
            onNavigate={setCurrentPage}
            onNuevoRequerimiento={() => setShowRequerimientoModal(true)}
            onNavigateToPKL={(pklId) => {
              setSelectedPKLId(pklId);
              setPklReturnTo({ page: 'dashboard' });
              setCurrentPage('pkl');
            }}
          />
        );
    }
  };

  return (
    <div className="flex min-h-screen" style={{ backgroundColor: 'var(--bg-primary)' }}>
      {/* Sidebar Izquierda - Estilo ChatGPT */}
      <AppSidebar
        isExpanded={sidebarExpanded}
        onToggle={() => setSidebarExpanded(!sidebarExpanded)}
        pedidos={pedidos}
        clientes={clientes}
        activePedidoId={activePedidoId}
        onSelectPedido={handleSelectPedido}
        onNuevoRequerimiento={() => setShowRequerimientoModal(true)}
        onNavigate={setCurrentPage}
        currentPage={currentPage}
      />

      {/* Contenido Principal con margen para la sidebar */}
      <main
        className="flex-1 transition-all duration-300 ease-in-out"
        style={{ marginLeft: sidebarExpanded ? '320px' : '80px' }}
      >
        {renderMainContent()}
      </main>

      {/* Modal de Nuevo Requerimiento Logístico */}
      <NuevoRequerimientoModal
        isOpen={showRequerimientoModal}
        onClose={() => setShowRequerimientoModal(false)}
        onSelect={handleSelectRequerimiento}
      />

      {/* Modales específicos según tipo de requerimiento */}
      {tipoRequerimiento === 'cotizacion' && (
        <NuevoPedidoModal
          isOpen={true}
          onClose={handleCloseRequerimientoFlow}
        />
      )}

      {tipoRequerimiento === 'produccion' && (
        <ProduccionModal
          isOpen={true}
          onClose={handleCloseRequerimientoFlow}
        />
      )}

      {tipoRequerimiento === 'movimiento' && <NuevoMovimientoModal isOpen={true} onClose={handleCloseRequerimientoFlow} />}

      {tipoRequerimiento === 'pago' && <PagoRendicionModal isOpen={true} onClose={handleCloseRequerimientoFlow} />}
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <DatabaseProvider>
        <ToastProvider>
          <AppContent />
        </ToastProvider>
      </DatabaseProvider>
    </ThemeProvider>
  );
}
