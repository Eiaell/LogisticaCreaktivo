import { useState, useMemo } from 'react';
import { useDatabase } from '../context/DatabaseContext';
import { PRODUCTOS_BASE, normalizarAProductoBase } from '../config/productosBase';
import { ProviderHistoryPanel } from './ProviderHistoryPanel';
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
  condiciones_pago_detalle?: string;
  cuenta_bancaria?: string;
  banco?: string;
  cci?: string;
  yape_plin?: string;
  prueba_color?: boolean;
  muestra_fisica?: boolean;
  notas?: string;
}

export function CotizacionesModal({ pedidoId, onClose }: CotizacionesModalProps) {
  const { cotizaciones, proveedores, createCotizacion, createHistoricoPrecio, getHistoricoPorProveedor } = useDatabase();
  const [filterProveedor, setFilterProveedor] = useState('');
  const [mostrarDropdown, setMostrarDropdown] = useState(false);
  const [historicoProveedor, setHistoricoProveedor] = useState<HistoricoPrecio[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

    const productoNombre = PRODUCTOS_BASE.find(p => p.id === historico.producto_base)?.nombre || historico.producto_base;
    alert(`✅ Variante "${productoNombre}" precargada desde histórico.`);
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
      // Mapear VarianteForm a formato esperado por createCotizacion
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
        condiciones_pago_detalle: formData.condiciones_pago_detalle,
        cuenta_bancaria: formData.cuenta_bancaria,
        banco: formData.banco,
        cci: formData.cci,
        yape_plin: formData.yape_plin,
        prueba_color: formData.prueba_color,
        muestra_fisica: formData.muestra_fisica,
        moneda: 'PEN',
        estado: 'pendiente',
        notas: formData.notas
      });

      // Guardar histórico de precios
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
    } catch (err) {
      console.error('Error al agregar cotización:', err);
      alert('Error al guardar la cotización');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-hidden">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl">
        {/* Header - Fixed */}
        <div className="bg-gray-900 border-b border-gray-700 p-6 flex items-center justify-between flex-shrink-0">
          <h2 className="text-xl font-bold text-white flex items-center gap-3">
            <span className="text-2xl">📋</span>
            Cotizaciones
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-gray-800 flex items-center justify-center text-gray-500 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Cotizaciones Existentes */}
          <div>
            <h3 className="text-sm font-bold text-gray-400 uppercase mb-3 flex items-center gap-2">
              <span>📨</span>
              Cotizaciones Recibidas ({cotizacionesPedido.length})
            </h3>
            {cotizacionesPedido.length === 0 ? (
              <div className="text-gray-600 italic text-sm p-4 bg-gray-950 rounded border border-gray-800">
                Sin cotizaciones aún
              </div>
            ) : (
              <div className="space-y-2">
                {cotizacionesPedido.map((cot) => (
                  <div key={cot.id} className="p-3 bg-gray-950 border border-gray-800 rounded-lg hover:border-gray-700 transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-bold text-cyan-300">{cot.proveedor_id}</span>
                      <span className="text-xs bg-gray-800 text-gray-400 px-2 py-1 rounded">
                        {new Date(cot.created_at).toLocaleDateString('es-PE')}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500">
                      {cot.variantes?.length || 0} variante(s) • S/. {cot.variantes?.reduce((s, v) => s + (v.precio_total || 0), 0).toFixed(2) || '0.00'}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="border-t border-gray-700 pt-6">
            <h3 className="text-sm font-bold text-gray-400 uppercase mb-4 flex items-center gap-2">
              <span>➕</span>
              Agregar Nueva Cotización
            </h3>

            {/* Proveedor */}
            <div className="space-y-2 mb-4">
              <label className="text-xs text-gray-400 font-bold uppercase">Proveedor *</label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setMostrarDropdown(!mostrarDropdown)}
                  className="w-full bg-gray-950 border border-gray-700 rounded-lg p-3 text-white text-left flex items-center justify-between hover:border-gray-600 transition-colors"
                >
                  <span>{formData.proveedor_nombre || 'Seleccionar proveedor...'}</span>
                  <span className={`transition-transform ${mostrarDropdown ? 'rotate-180' : ''}`}>▼</span>
                </button>

                {mostrarDropdown && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-gray-950 border border-gray-700 rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto">
                    <div className="p-2 border-b border-gray-800">
                      <input
                        type="text"
                        value={filterProveedor}
                        onChange={(e) => setFilterProveedor(e.target.value)}
                        placeholder="Buscar proveedor..."
                        className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1 text-white text-xs focus:border-cyan-500 outline-none"
                        autoFocus
                      />
                    </div>
                    {proveedoresFiltrados.map((prov) => (
                      <button
                        key={prov.id}
                        type="button"
                        onClick={() => seleccionarProveedor(prov)}
                        className="w-full text-left px-4 py-2 hover:bg-gray-900 border-b border-gray-800 last:border-b-0 transition-colors text-sm"
                      >
                        {prov.nombre}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Histórico del Proveedor */}
            {historicoProveedor.length > 0 && (
              <div className="mb-4">
                <ProviderHistoryPanel
                  historico={historicoProveedor}
                  onSelectVariante={precargarVariante}
                />
              </div>
            )}

            {/* Variantes */}
            <div className="space-y-3 mb-4">
              <label className="text-xs text-gray-400 font-bold uppercase">Variantes *</label>
              {formData.variantes.map((variante, index) => (
                <div key={index} className="border-2 border-cyan-600/30 rounded-lg p-4 space-y-3 bg-gray-900/30">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-gray-400 font-bold">Variante #{index + 1}</span>
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

                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="text"
                      value={variante.descripcion}
                      onChange={(e) => actualizarVariante(index, 'descripcion', e.target.value)}
                      placeholder="Descripción"
                      className="col-span-2 bg-gray-800 border border-gray-600 rounded p-2 text-white text-sm focus:border-cyan-500 outline-none"
                    />
                    <input
                      type="number"
                      value={variante.cantidad || ''}
                      onChange={(e) => actualizarVariante(index, 'cantidad', parseInt(e.target.value) || 0)}
                      placeholder="Cantidad"
                      className="bg-gray-800 border border-gray-600 rounded p-2 text-white text-sm focus:border-cyan-500 outline-none"
                    />
                    <input
                      type="number"
                      value={variante.precio_unitario || ''}
                      onChange={(e) => actualizarVariante(index, 'precio_unitario', parseFloat(e.target.value) || 0)}
                      placeholder="Precio Unitario"
                      className="bg-gray-800 border border-gray-600 rounded p-2 text-white text-sm focus:border-cyan-500 outline-none"
                    />
                    <div className="col-span-2">
                      <select
                        value={variante.producto_base}
                        onChange={(e) => actualizarVariante(index, 'producto_base', e.target.value)}
                        className="w-full bg-gray-800 border border-gray-600 rounded p-2 text-white text-sm focus:border-cyan-500 outline-none"
                      >
                        <option value="">Selecciona producto...</option>
                        {PRODUCTOS_BASE.map(p => (
                          <option key={p.id} value={p.id}>{p.nombre}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">Total: S/. {variante.precio_total.toFixed(2)}</span>
                    <label className="text-xs text-gray-400 flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={variante.incluye_igv}
                        onChange={(e) => actualizarVariante(index, 'incluye_igv', e.target.checked)}
                        className="w-3 h-3"
                      />
                      + IGV
                    </label>
                  </div>
                </div>
              ))}

              <button
                type="button"
                onClick={agregarVariante}
                className="w-full py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded text-sm font-medium transition-colors"
              >
                + Agregar Variante
              </button>
            </div>
          </div>
        </div>

        {/* Footer - Fixed */}
        <div className="bg-gray-900 border-t border-gray-700 p-4 flex gap-3 flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg font-medium transition-colors"
          >
            Cerrar
          </button>
          <button
            type="button"
            onClick={handleAddCotizacion}
            disabled={isSubmitting || !formData.proveedor_nombre}
            className="flex-1 py-3 bg-cyan-600 hover:bg-cyan-500 disabled:bg-gray-800 disabled:text-gray-600 text-white rounded-lg font-bold transition-colors flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <span className="animate-spin">⏳</span>
            ) : (
              <>
                <span>Guardar Cotización</span>
                <span>✓</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
