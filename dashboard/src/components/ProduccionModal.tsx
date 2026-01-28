import { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useDatabase } from '../context/DatabaseContext';
import { useToast } from '../context/ToastContext';
import { findMatchingPKLs } from '../utils/pklMatcher';
import { PKLSuggestions } from './PKLSuggestions';

interface ProduccionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ProduccionModal({ isOpen, onClose }: ProduccionModalProps) {
  const { clientes, proveedores, pkls, createProduccion } = useDatabase();
  const { showToast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [cliente, setCliente] = useState('');
  const [proveedor, setProveedor] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [cantidad, setCantidad] = useState('');
  const [precio, setPrecio] = useState('');
  const [esPrecioUnitario, setEsPrecioUnitario] = useState(true);
  const [incluyeIgv, setIncluyeIgv] = useState(false);
  const [fechaEntrega, setFechaEntrega] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [pklId, setPklId] = useState('');

  const resetForm = () => {
    setCliente('');
    setProveedor('');
    setDescripcion('');
    setCantidad('');
    setPrecio('');
    setEsPrecioUnitario(true);
    setIncluyeIgv(false);
    setFechaEntrega('');
    setObservaciones('');
    setPklId('');
  };

  const calcularPrecioTotal = () => {
    const cant = parseFloat(cantidad) || 0;
    const precioNum = parseFloat(precio) || 0;
    if (cant > 0 && precioNum > 0) {
      return esPrecioUnitario ? cant * precioNum : precioNum;
    }
    return 0;
  };

  const calcularPrecioUnitario = () => {
    const cant = parseFloat(cantidad) || 0;
    const precioNum = parseFloat(precio) || 0;
    if (cant > 0 && precioNum > 0) {
      return esPrecioUnitario ? precioNum : precioNum / cant;
    }
    return 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cliente || !proveedor || !descripcion || !cantidad || !precio) {
      showToast('Por favor completa todos los campos requeridos', 'warning');
      return;
    }

    setIsSubmitting(true);
    try {
      const now = new Date().toISOString();
      const precioTotal = calcularPrecioTotal();
      const precioUnit = calcularPrecioUnitario();

      await createProduccion({
        pedido_id: '', // Se puede vincular después si es necesario
        proveedor_id: proveedor,
        producto_base: descripcion,
        descripcion: descripcion,
        cantidad_aprobada: parseFloat(cantidad),
        precio_unitario: precioUnit,
        precio_total: precioTotal,
        incluye_igv: incluyeIgv,
        fecha_aprobacion: now,
        fecha_compromiso: fechaEntrega || undefined,
        prueba_color: 'na',
        muestra_fisica: 'na',
        estado: 'en_proceso',
        notas: observaciones || undefined,
      });

      showToast('Producción creada exitosamente', 'success');
      resetForm();
      onClose();
    } catch (err) {
      console.error('Error creando producción:', err);
      showToast('Error al crear la producción', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const clientesList = Object.entries(clientes).map(([key, c]) => ({
    id: key,
    display: c.nombre_comercial || c.razon_social || key,
  }));

  const proveedoresList = Object.keys(proveedores);

  // Filtrar PKLs del cliente seleccionado
  const pklsDelCliente = pkls.filter(pkl =>
    cliente && pkl.cliente.nombre.toLowerCase().includes(cliente.toLowerCase())
  );

  // Calcular PKLs sugeridos basados en los datos del formulario
  const pklMatches = useMemo(() => {
    if (!cliente && !proveedor) return [];

    return findMatchingPKLs(
      {
        cliente,
        proveedor,
        fecha: new Date().toISOString(),
        productos: descripcion ? [descripcion] : undefined,
      },
      pkls,
      5 // Top 5
    );
  }, [cliente, proveedor, descripcion, pkls]);

  return createPortal(
    <div className="fixed inset-0 liquid-glass-overlay z-[9999] flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="liquid-glass liquid-glass-blue rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-cyan-600 px-6 py-4 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-3xl">🏭</span>
              <div>
                <h2 className="text-xl font-bold text-white">Nuevo Acuerdo de Producción</h2>
                <p className="text-white/70 text-sm">Registrar orden de producción con proveedor</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-colors text-lg"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {/* Cliente y Proveedor */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">
                Cliente <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                list="clientes-produccion-list"
                value={cliente}
                onChange={(e) => setCliente(e.target.value)}
                className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:border-blue-500 outline-none"
                placeholder="Escribe para buscar..."
                required
              />
              <datalist id="clientes-produccion-list">
                {clientesList.map(c => (
                  <option key={c.id} value={c.id}>{c.display}</option>
                ))}
              </datalist>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">
                Proveedor <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                list="proveedores-produccion-list"
                value={proveedor}
                onChange={(e) => setProveedor(e.target.value)}
                className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:border-blue-500 outline-none"
                placeholder="Escribe para buscar..."
                required
              />
              <datalist id="proveedores-produccion-list">
                {proveedoresList.map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </datalist>
            </div>
          </div>

          {/* Descripción del trabajo */}
          <div>
            <label className="block text-sm text-gray-400 mb-1">
              Descripción del producto <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Ej: Lanyards 2.5cm sublimados con gancho"
              className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:border-blue-500 outline-none"
              required
            />
          </div>

          {/* Cantidad y Precio */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">
                Cantidad <span className="text-red-400">*</span>
              </label>
              <input
                type="number"
                value={cantidad}
                onChange={(e) => setCantidad(e.target.value)}
                placeholder="100"
                min="1"
                step="1"
                className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:border-blue-500 outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">
                Precio <span className="text-red-400">*</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={precio}
                  onChange={(e) => setPrecio(e.target.value)}
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                  className="flex-1 bg-gray-800/50 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:border-blue-500 outline-none"
                  required
                />
                <input
                  type="text"
                  list="precio-tipo-produccion-list"
                  value={esPrecioUnitario ? 'unitario' : 'total'}
                  onChange={(e) => setEsPrecioUnitario(e.target.value === 'unitario')}
                  className="bg-gray-800/50 border border-gray-700 rounded-lg px-3 py-2 text-white text-xs focus:border-blue-500 outline-none"
                  placeholder="c/u o total"
                />
                <datalist id="precio-tipo-produccion-list">
                  <option value="unitario">c/u</option>
                  <option value="total">total</option>
                </datalist>
              </div>
            </div>
          </div>

          {/* Cálculo automático */}
          {cantidad && precio && (
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Precio unitario:</span>
                <span className="text-white font-medium">S/ {calcularPrecioUnitario().toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm mt-1">
                <span className="text-gray-400">Precio total:</span>
                <span className="text-blue-400 font-bold text-lg">S/ {calcularPrecioTotal().toFixed(2)}</span>
              </div>
            </div>
          )}

          {/* IGV y Fecha de entrega */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={incluyeIgv}
                  onChange={(e) => setIncluyeIgv(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-700 bg-gray-800 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-400">Incluye IGV</span>
              </label>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">
                Fecha de entrega estimada
              </label>
              <input
                type="date"
                value={fechaEntrega}
                onChange={(e) => setFechaEntrega(e.target.value)}
                className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:border-blue-500 outline-none"
                style={{ colorScheme: 'dark' }}
              />
            </div>
          </div>

          {/* PKLs Sugeridos */}
          {pklMatches.length > 0 && (
            <PKLSuggestions
              matches={pklMatches}
              selectedPklId={pklId}
              onSelectPkl={setPklId}
              minScore={50}
            />
          )}

          {/* Vincular a PKL (opcional) */}
          {pklsDelCliente.length > 0 && (
            <div>
              <label className="block text-sm text-gray-400 mb-1">
                Vincular a PKL (opcional)
              </label>
              <input
                type="text"
                list="pkls-produccion-list"
                value={pklId}
                onChange={(e) => setPklId(e.target.value)}
                className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:border-blue-500 outline-none"
                placeholder="Escribe para buscar..."
              />
              <datalist id="pkls-produccion-list">
                <option value="">Sin vincular</option>
                {pklsDelCliente.map(pkl => (
                  <option key={pkl.pkl_id} value={pkl.pkl_id}>
                    {pkl.pkl_id} - {pkl.origen.descripcion_inicial.substring(0, 50)}...
                  </option>
                ))}
              </datalist>
            </div>
          )}

          {/* Observaciones */}
          <div>
            <label className="block text-sm text-gray-400 mb-1">
              Observaciones
            </label>
            <textarea
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              placeholder="Notas adicionales sobre la producción..."
              rows={3}
              className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:border-blue-500 outline-none resize-none"
            />
          </div>
        </form>

        {/* Footer */}
        <div className="border-t border-gray-800 px-6 py-4 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg font-medium transition-colors"
            disabled={isSubmitting}
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            className="px-6 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white rounded-lg font-bold transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Guardando...' : 'Guardar Producción'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
