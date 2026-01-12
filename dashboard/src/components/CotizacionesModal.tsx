import { useState, useMemo } from 'react';
import { useDatabase } from '../context/DatabaseContext';
import { PRODUCTOS_BASE, normalizarAProductoBase } from '../config/productosBase';
import type { HistoricoPrecio } from '../types';

interface CotizacionesModalProps {
  pedidoId: string;
  onClose: () => void;
}

interface VarianteForm {
  descripcion: string;
  cantidad: number;
  precio_unitario: number;
  precio_total: number;
  incluye_igv: boolean;
  tiempo_produccion_dias?: number;
  tiempo_entrega_dias?: number;
  producto_base: string;
  _precargado?: boolean;
}

interface NuevaCotizacionForm {
  proveedor_nombre: string;
  variantes: VarianteForm[];
  forma_pago: 'contado' | 'adelanto_50' | 'adelanto_70' | 'contra_entrega' | 'credito' | 'otro';
}

export function CotizacionesModal({ pedidoId, onClose }: CotizacionesModalProps) {
  const { cotizaciones, proveedores, pedidos, createCotizacion, createHistoricoPrecio, getHistoricoPorProveedor } = useDatabase();
  const [filterProveedor, setFilterProveedor] = useState('');
  const [mostrarDropdown, setMostrarDropdown] = useState(false);
  const [historicoProveedor, setHistoricoProveedor] = useState<HistoricoPrecio[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<'view' | 'add'>('view');

  const [formData, setFormData] = useState<NuevaCotizacionForm>({
    proveedor_nombre: '',
    variantes: [
      {
        descripcion: '',
        cantidad: 0,
        precio_unitario: 0,
        precio_total: 0,
        incluye_igv: false,
        producto_base: ''
      }
    ],
    forma_pago: 'contado'
  });

  // Obtener pedido actual
  const pedido = useMemo(() => pedidos.find(p => p.id === pedidoId), [pedidos, pedidoId]);

  // Filtrar proveedores por búsqueda
  const proveedoresFiltrados = useMemo(() => {
    if (!filterProveedor) return Object.values(proveedores);
    return Object.values(proveedores).filter(p =>
      p.nombre.toLowerCase().includes(filterProveedor.toLowerCase())
    );
  }, [filterProveedor, proveedores]);

  // Cotizaciones para este pedido
  const cotizacionesPedido = useMemo(() => {
    return cotizaciones.filter(c => c.pedido_id === pedidoId).sort((a, b) => {
      const dateA = new Date(b.created_at).getTime();
      const dateB = new Date(a.created_at).getTime();
      return dateA - dateB;
    });
  }, [cotizaciones, pedidoId]);

  const seleccionarProveedor = (proveedor: any) => {
    setFormData({
      ...formData,
      proveedor_nombre: proveedor.nombre
    });
    setFilterProveedor(proveedor.nombre);
    setMostrarDropdown(false);

    try {
      const historico = getHistoricoPorProveedor(proveedor.nombre);
      setHistoricoProveedor(historico);
    } catch (error) {
      console.error('Error al cargar histórico del proveedor:', error);
      setHistoricoProveedor([]);
    }
  };

  const agregarVariante = () => {
    setFormData({
      ...formData,
      variantes: [
        ...formData.variantes,
        {
          descripcion: '',
          cantidad: 0,
          precio_unitario: 0,
          precio_total: 0,
          incluye_igv: false,
          producto_base: ''
        }
      ]
    });
  };

  const eliminarVariante = (index: number) => {
    if (formData.variantes.length > 1) {
      setFormData({
        ...formData,
        variantes: formData.variantes.filter((_, i) => i !== index)
      });
    }
  };

  const calcularPrecioTotal = (cantidad: number, precioUnitario: number) => {
    return cantidad * precioUnitario;
  };

  const actualizarVariante = (index: number, campo: keyof VarianteForm, valor: any) => {
    const nuevasVariantes = [...formData.variantes];
    nuevasVariantes[index] = { ...nuevasVariantes[index], [campo]: valor };

    if (campo === 'cantidad' || campo === 'precio_unitario') {
      const { cantidad, precio_unitario } = nuevasVariantes[index];
      nuevasVariantes[index].precio_total = calcularPrecioTotal(cantidad, precio_unitario);
    }

    if (campo === 'descripcion' && valor) {
      const productoDetectado = normalizarAProductoBase(valor);
      if (productoDetectado) {
        nuevasVariantes[index].producto_base = productoDetectado;
      }
    }

    setFormData({
      ...formData,
      variantes: nuevasVariantes
    });
  };

  const precargarVariante = (historico: HistoricoPrecio) => {
    const nuevaVariante: VarianteForm = {
      descripcion: historico.descripcion,
      cantidad: 0,
      precio_unitario: historico.precio_unitario,
      precio_total: 0,
      incluye_igv: historico.incluye_igv,
      tiempo_produccion_dias: historico.tiempo_produccion_dias,
      tiempo_entrega_dias: historico.tiempo_entrega_dias,
      producto_base: historico.producto_base,
      _precargado: true
    };

    const nuevasVariantes = [...formData.variantes, nuevaVariante];
    setFormData({
      ...formData,
      variantes: nuevasVariantes
    });
  };

  const handleAddCotizacion = async () => {
    if (!formData.proveedor_nombre) {
      alert('Por favor ingresa el nombre del proveedor');
      return;
    }

    if (formData.variantes.length === 0 || !formData.variantes[0].descripcion) {
      alert('Por favor agrega al menos una variante con descripción');
      return;
    }

    const variantesValidas = formData.variantes.every(v =>
      v.descripcion && v.cantidad > 0 && v.precio_unitario > 0 && v.producto_base
    );

    if (!variantesValidas) {
      alert('Todas las variantes deben tener: descripción, cantidad, precio unitario y producto base');
      return;
    }

    setIsSubmitting(true);
    try {
      const variantes = formData.variantes.map(v => ({
        producto_base: v.producto_base,
        descripcion: v.descripcion,
        cantidad: v.cantidad,
        precio_unitario: v.precio_unitario,
        precio_total: v.precio_total,
        incluye_igv: v.incluye_igv,
        tiempo_produccion_dias: v.tiempo_produccion_dias,
        tiempo_entrega_dias: v.tiempo_entrega_dias
      }));

      const nuevaCotizacion = await createCotizacion({
        pedido_id: pedidoId,
        proveedor_id: formData.proveedor_nombre,
        fecha: new Date().toISOString(),
        variantes: variantes as any,
        forma_pago: formData.forma_pago,
        moneda: 'PEN',
        estado: 'pendiente'
      });

      for (const variante of formData.variantes) {
        await createHistoricoPrecio({
          proveedor_id: formData.proveedor_nombre,
          producto_base: variante.producto_base,
          descripcion: variante.descripcion,
          precio_unitario: variante.precio_unitario,
          incluye_igv: variante.incluye_igv,
          cantidad_referencia: variante.cantidad,
          tiempo_produccion_dias: variante.tiempo_produccion_dias,
          tiempo_entrega_dias: variante.tiempo_entrega_dias,
          pedido_origen_id: pedidoId,
          cotizacion_origen_id: nuevaCotizacion.id,
          fecha_cotizacion: new Date().toISOString()
        });
      }

      alert('✅ Cotización guardada exitosamente');
      setFormData({
        proveedor_nombre: '',
        variantes: [
          {
            descripcion: '',
            cantidad: 0,
            precio_unitario: 0,
            precio_total: 0,
            incluye_igv: false,
            producto_base: ''
          }
        ],
        forma_pago: 'contado'
      });
      setFilterProveedor('');
      setActiveTab('view');
    } catch (err) {
      console.error('Error al agregar cotización:', err);
      alert('Error al guardar la cotización');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 rounded-lg w-full max-w-4xl max-h-[90vh] flex flex-col border border-gray-700">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <div>
            <h2 className="text-lg font-bold text-white">📋 Cotizaciones - Pedido {pedidoId.slice(0, 8)}</h2>
            {pedido && <p className="text-xs text-gray-400 mt-1">{pedido.cliente || 'Sin cliente'} • {pedido.descripcion}</p>}
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl font-bold"
          >
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-700 bg-gray-950">
          <button
            onClick={() => setActiveTab('view')}
            className={`flex-1 py-3 text-sm font-bold uppercase transition-colors ${
              activeTab === 'view'
                ? 'text-cyan-400 border-b-2 border-cyan-500'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            📨 Recibidas ({cotizacionesPedido.length})
          </button>
          <button
            onClick={() => setActiveTab('add')}
            className={`flex-1 py-3 text-sm font-bold uppercase transition-colors ${
              activeTab === 'add'
                ? 'text-cyan-400 border-b-2 border-cyan-500'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            ➕ Agregar Nueva
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {activeTab === 'view' ? (
            // View Tab
            <div className="space-y-3">
              {cotizacionesPedido.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p className="text-sm">Sin cotizaciones aún</p>
                </div>
              ) : (
                cotizacionesPedido.map((cot) => (
                  <div key={cot.id} className="p-3 bg-gray-950 border border-gray-800 rounded hover:border-gray-700">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-bold text-cyan-300 text-sm">{cot.proveedor_id}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {cot.variantes?.length || 0} variante(s) • {new Date(cot.created_at).toLocaleDateString('es-PE')}
                        </p>
                      </div>
                      <p className="font-bold text-emerald-400 text-sm">
                        S/. {cot.variantes?.reduce((s, v) => s + (v.precio_total || 0), 0).toFixed(2) || '0.00'}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : (
            // Add Tab
            <div className="space-y-4">
              {/* Proveedor */}
              <div>
                <label className="text-xs text-gray-400 font-bold uppercase block mb-2">Proveedor *</label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setMostrarDropdown(!mostrarDropdown)}
                    className="w-full bg-gray-950 border border-gray-700 rounded p-3 text-white text-left flex justify-between items-center hover:border-gray-600"
                  >
                    <span>{formData.proveedor_nombre || 'Seleccionar proveedor...'}</span>
                    <span>▼</span>
                  </button>

                  {mostrarDropdown && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-gray-950 border border-gray-700 rounded shadow-lg z-50 max-h-48 overflow-y-auto">
                      <div className="p-2 border-b border-gray-800">
                        <input
                          type="text"
                          value={filterProveedor}
                          onChange={(e) => setFilterProveedor(e.target.value)}
                          placeholder="Buscar..."
                          className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1 text-white text-xs focus:border-cyan-500 outline-none"
                          autoFocus
                        />
                      </div>
                      {proveedoresFiltrados.map((prov) => (
                        <button
                          key={prov.id}
                          type="button"
                          onClick={() => seleccionarProveedor(prov)}
                          className="w-full text-left px-4 py-2 hover:bg-gray-900 text-sm text-gray-300"
                        >
                          {prov.nombre}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Histórico */}
              {historicoProveedor.length > 0 && (
                <div className="bg-gray-950 p-3 rounded border border-gray-800">
                  <p className="text-xs text-gray-400 font-bold mb-2">Histórico de este proveedor:</p>
                  <div className="space-y-1">
                    {historicoProveedor.slice(0, 3).map((h) => (
                      <button
                        key={h.id}
                        onClick={() => precargarVariante(h)}
                        className="w-full text-left text-xs p-2 hover:bg-gray-900 rounded transition-colors text-gray-300"
                      >
                        {h.descripcion} - S/. {h.precio_unitario.toFixed(2)}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Variantes */}
              <div>
                <label className="text-xs text-gray-400 font-bold uppercase block mb-2">Variantes *</label>
                <div className="space-y-3 max-h-48 overflow-y-auto">
                  {formData.variantes.map((variante, index) => (
                    <div key={index} className="p-3 bg-gray-950 border border-gray-800 rounded space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-gray-400">Variante #{index + 1}</span>
                        {formData.variantes.length > 1 && (
                          <button
                            type="button"
                            onClick={() => eliminarVariante(index)}
                            className="text-red-400 hover:text-red-300 text-sm"
                          >
                            ✕
                          </button>
                        )}
                      </div>

                      <input
                        type="text"
                        value={variante.descripcion}
                        onChange={(e) => actualizarVariante(index, 'descripcion', e.target.value)}
                        placeholder="Descripción"
                        className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white text-sm"
                      />

                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="number"
                          value={variante.cantidad || ''}
                          onChange={(e) => actualizarVariante(index, 'cantidad', parseInt(e.target.value) || 0)}
                          placeholder="Cantidad"
                          className="bg-gray-900 border border-gray-700 rounded p-2 text-white text-sm"
                        />
                        <input
                          type="number"
                          value={variante.precio_unitario || ''}
                          onChange={(e) => actualizarVariante(index, 'precio_unitario', parseFloat(e.target.value) || 0)}
                          placeholder="Precio"
                          className="bg-gray-900 border border-gray-700 rounded p-2 text-white text-sm"
                        />
                      </div>

                      <select
                        value={variante.producto_base}
                        onChange={(e) => actualizarVariante(index, 'producto_base', e.target.value)}
                        className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white text-sm"
                      >
                        <option value="">Selecciona producto...</option>
                        {PRODUCTOS_BASE.map(p => (
                          <option key={p.id} value={p.id}>{p.nombre}</option>
                        ))}
                      </select>

                      <div className="flex justify-between items-center text-xs">
                        <span className="text-gray-500">Total: S/. {variante.precio_total.toFixed(2)}</span>
                        <label className="text-gray-400 flex items-center gap-1">
                          <input
                            type="checkbox"
                            checked={variante.incluye_igv}
                            onChange={(e) => actualizarVariante(index, 'incluye_igv', e.target.checked)}
                            className="w-3 h-3"
                          />
                          +IGV
                        </label>
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={agregarVariante}
                  className="w-full mt-2 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded text-sm"
                >
                  + Agregar Variante
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-4 border-t border-gray-700">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded font-medium text-sm"
          >
            Cerrar
          </button>
          {activeTab === 'add' && (
            <button
              type="button"
              onClick={handleAddCotizacion}
              disabled={isSubmitting || !formData.proveedor_nombre}
              className="flex-1 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:bg-gray-800 disabled:text-gray-600 text-white rounded font-bold text-sm"
            >
              {isSubmitting ? '⏳' : '✓ Guardar'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
