import { useState, useMemo } from 'react';
import { useDatabase } from '../context/DatabaseContext';
import { PRODUCTOS_BASE, normalizarAProductoBase } from '../config/productosBase';
import { ProviderHistoryPanel } from './ProviderHistoryPanel';
import type { Cotizacion, HistoricoPrecio } from '../types';
import { supabase } from '../supabaseClient';

interface CotizacionesPageProps {
  onBack?: () => void;
}

interface VarianteForm {
  id?: string; // Para edición de variantes existentes
  descripcion: string;
  cantidad: number;
  precio_unitario: number;
  precio_total: number;
  incluye_igv: boolean;
  tiempo_produccion_dias?: number;
  tiempo_entrega_dias?: number;
  producto_base: string; // Campo OBLIGATORIO (seleccionado del diccionario)
  variante?: string; // Campo opcional: diferencias comerciales (con gancho, con tiptop, etc)
  _precargado?: boolean; // Flag interno: indica si fue precargada desde histórico (no se guarda)
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

export function CotizacionesPage({ onBack }: CotizacionesPageProps) {
  const { pedidos, cotizaciones, lineasPedido, clientes, proveedores, createCotizacion, createHistoricoPrecio, getHistoricoPorProveedor, updateCotizacion } = useDatabase();
  const [expandedPedidoId, setExpandedPedidoId] = useState<string | null>(null);
  const [showingCotizacionForm, setShowingCotizacionForm] = useState<string | null>(null);
  const [cotizacionEnEdicion, setCotizacionEnEdicion] = useState<Cotizacion | null>(null);
  const [filterProveedor, setFilterProveedor] = useState('');
  const [mostrarDropdown, setMostrarDropdown] = useState(false);
  const [historicoProveedor, setHistoricoProveedor] = useState<HistoricoPrecio[]>([]);

  const [formData, setFormData] = useState<NuevaCotizacionForm>({
    proveedor_nombre: '',
    variantes: [
      {
        descripcion: '',
        cantidad: 0,
        precio_unitario: 0,
        precio_total: 0,
        incluye_igv: false,
        producto_base: '' // OBLIGATORIO - se debe seleccionar
      }
    ],
    forma_pago: 'contado'
  });

  // Filtrar pedidos en estado 'cotizacion'
  const pedidosCotizacion = useMemo(() => {
    return pedidos.filter(p => p.estado === 'cotizacion').sort((a, b) => {
      const dateA = new Date(b.created_at).getTime();
      const dateB = new Date(a.created_at).getTime();
      return dateA - dateB;
    });
  }, [pedidos]);

  // Filtrar proveedores por búsqueda
  const proveedoresFiltrados = useMemo(() => {
    if (!filterProveedor) return Object.values(proveedores);
    return Object.values(proveedores).filter(p =>
      p.nombre.toLowerCase().includes(filterProveedor.toLowerCase())
    );
  }, [filterProveedor, proveedores]);

  // Seleccionar proveedor del dropdown
  const seleccionarProveedor = (proveedor: any) => {
    setFormData({
      ...formData,
      proveedor_nombre: proveedor.nombre,
      banco: proveedor.email || formData.banco,
      condiciones_pago_detalle: proveedor.condiciones_pago || formData.condiciones_pago_detalle
    });
    setFilterProveedor(proveedor.nombre);
    setMostrarDropdown(false);

    // Cargar histórico de precios del proveedor
    try {
      const historico = getHistoricoPorProveedor(proveedor.nombre);
      setHistoricoProveedor(historico);
    } catch (error) {
      console.error('Error al cargar histórico del proveedor:', error);
      setHistoricoProveedor([]);
    }
  };

  // Obtener detalles de un pedido
  const getPedidoDetails = (pedidoId: string) => {
    const lineas = lineasPedido.filter(l => l.pedido_id === pedidoId);
    const totalLineas = lineas.length;
    const totalValor = lineas.reduce((sum, l) => sum + (l.precio || 0), 0);
    return { lineas, totalLineas, totalValor };
  };

  // Formatear fecha
  const formatDate = (dateStr: string) => {
    try {
      const partes = dateStr.split('T')[0].split('-');
      const year = parseInt(partes[0]);
      const month = parseInt(partes[1]);
      const day = parseInt(partes[2]);
      const date = new Date(year, month - 1, day);
      return date.toLocaleDateString('es-PE', { year: 'numeric', month: 'short', day: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  // Calcular precio total de variante
  const calcularPrecioTotal = (cantidad: number, precioUnitario: number) => {
    return cantidad * precioUnitario;
  };

  // Agregar variante vacía
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

  // Eliminar variante
  const eliminarVariante = (index: number) => {
    if (formData.variantes.length > 1) {
      setFormData({
        ...formData,
        variantes: formData.variantes.filter((_, i) => i !== index)
      });
    }
  };

  // Precargar variante desde histórico (sin insertar automáticamente cantidad/precio total)
  const precargarVariante = (historico: HistoricoPrecio) => {
    // POLÍTICA DE COPIA SELECTIVA:
    // Campos que SÍ se copian (requerimiento de producto):
    //   ✅ descripcion: Descripción de la variante histórica
    //   ✅ precio_unitario: Precio unitario del histórico
    //   ✅ incluye_igv: Flag de IGV
    //   ✅ tiempo_produccion_dias: Tiempo de producción
    //   ✅ tiempo_entrega_dias: Tiempo de entrega
    //   ✅ producto_base: Clasificación estándar
    //
    // Campos que NO se copian (requerimiento de control de usuario):
    //   ❌ cantidad: Usuario debe especificar cantidad NUEVA (no heredar del histórico)
    //   ❌ precio_total: Se auto-calcula cuando usuario cambia cantidad
    //   ❌ referencias de pedidos/cotizaciones: Garantiza trazabilidad limpia
    //
    // Nota: cantidad_referencia se muestra en tooltip para contexto del usuario

    const nuevaVariante: VarianteForm = {
      descripcion: historico.descripcion,
      cantidad: 0, // ❌ NO copiar: usuario especifica cantidad nueva
      precio_unitario: historico.precio_unitario, // ✅ Copiar
      precio_total: 0, // ❌ NO copiar: auto-calcula
      incluye_igv: historico.incluye_igv, // ✅ Copiar
      tiempo_produccion_dias: historico.tiempo_produccion_dias, // ✅ Copiar
      tiempo_entrega_dias: historico.tiempo_entrega_dias, // ✅ Copiar
      producto_base: historico.producto_base, // ✅ Copiar
      _precargado: true // Flag visual: indica que fue precargada desde histórico
    };

    // Agregar variante al formulario
    const nuevasVariantes = [...formData.variantes, nuevaVariante];
    setFormData({
      ...formData,
      variantes: nuevasVariantes
    });

    // Mostrar feedback visual al usuario
    const productoNombre = PRODUCTOS_BASE.find(p => p.id === historico.producto_base)?.nombre || historico.producto_base;
    const mensaje = `✅ Variante "${productoNombre}" precargada desde histórico.\n\nCantidad referencia: ${historico.cantidad_referencia || '?'} unidades\n\nAjusta la cantidad según necesites.`;

    // TODO: Reemplazar alert() con toast notification system
    // Actualmente usar alert como fallback, pero ideal integrar:
    // - React Toastify, React Hot Toast, o similar
    // - Para mejor UX sin interrumpir el flujo
    alert(mensaje);
  };

  // Actualizar variante
  const actualizarVariante = (index: number, campo: keyof VarianteForm, valor: any) => {
    const nuevasVariantes = [...formData.variantes];
    nuevasVariantes[index] = { ...nuevasVariantes[index], [campo]: valor };

    // Auto-calcular precio total si cambian cantidad o precio unitario
    if (campo === 'cantidad' || campo === 'precio_unitario') {
      const { cantidad, precio_unitario } = nuevasVariantes[index];
      nuevasVariantes[index].precio_total = calcularPrecioTotal(cantidad, precio_unitario);
    }

    // Auto-normalizar producto_base si cambia la descripción (intenta detectar automáticamente)
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

  // Manejar click en botón Editar de una cotización
  const handleEditarCotizacion = (cotizacion: Cotizacion, pedidoId: string) => {
    // Pre-llenar el formulario con los datos de la cotización
    const variantesForm = (cotizacion.variantes || []).map(v => ({
      id: v.id,
      descripcion: v.descripcion,
      cantidad: v.cantidad,
      precio_unitario: v.precio_unitario,
      precio_total: v.precio_total,
      incluye_igv: v.incluye_igv,
      tiempo_produccion_dias: v.tiempo_produccion_dias,
      tiempo_entrega_dias: v.tiempo_entrega_dias,
      producto_base: v.producto_base,
      variante: v.variante,
      _precargado: false
    }));

    setFormData({
      proveedor_nombre: cotizacion.proveedor_id,
      variantes: variantesForm.length > 0 ? variantesForm : [{
        descripcion: '',
        cantidad: 0,
        precio_unitario: 0,
        precio_total: 0,
        incluye_igv: false,
        producto_base: '',
        variante: ''
      }],
      forma_pago: (cotizacion.forma_pago || 'contado') as any,
      condiciones_pago_detalle: cotizacion.condiciones_pago_detalle,
      cuenta_bancaria: cotizacion.cuenta_bancaria,
      banco: cotizacion.banco,
      cci: cotizacion.cci,
      yape_plin: cotizacion.yape_plin,
      prueba_color: cotizacion.prueba_color,
      muestra_fisica: cotizacion.muestra_fisica,
      notas: cotizacion.notas
    });

    // Cargar histórico del proveedor
    try {
      const historico = getHistoricoPorProveedor(cotizacion.proveedor_id);
      setHistoricoProveedor(historico);
    } catch (error) {
      console.error('Error al cargar histórico:', error);
    }

    // Establecer el filtro de proveedor
    setFilterProveedor(cotizacion.proveedor_id);

    // Marcar que estamos en modo edición y abrir el formulario
    // IMPORTANTE: usar pedidoId para que isFormOpen = showingCotizacionForm === pedido.id se cumpla
    setCotizacionEnEdicion(cotizacion);
    setShowingCotizacionForm(pedidoId);
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

    // Validar que todas las variantes tengan información requerida
    const variantesValidas = formData.variantes.every(v => {
      if (!v.descripcion) return false;
      if (v.cantidad <= 0) return false;
      if (v.precio_unitario <= 0) return false;
      if (!v.producto_base) return false; // Validar que producto_base esté seleccionado
      return true;
    });

    if (!variantesValidas) {
      const errorMessages: string[] = [];
      formData.variantes.forEach((v, idx) => {
        if (!v.descripcion) errorMessages.push(`Variante ${idx + 1}: falta descripción`);
        if (v.cantidad <= 0) errorMessages.push(`Variante ${idx + 1}: cantidad debe ser > 0`);
        if (v.precio_unitario <= 0) errorMessages.push(`Variante ${idx + 1}: precio debe ser > 0`);
        if (!v.producto_base) errorMessages.push(`Variante ${idx + 1}: debe seleccionar producto base`);
      });
      alert('Errores en variantes:\n\n' + errorMessages.join('\n'));
      return;
    }

    try {
      // Detectar si estamos editando o creando
      const isEditing = showingCotizacionForm && cotizacionEnEdicion;
      const cotizacionId = showingCotizacionForm;

      // Calcular precio total de toda la cotización
      const precioTotalCotizacion = formData.variantes.reduce((sum, v) => sum + v.precio_total, 0);

      if (isEditing && cotizacionId && cotizacionEnEdicion) {
        // EDITAR: Actualizar cotización existente
        // Primero, eliminar las variantes existentes de Supabase
        if (cotizacionEnEdicion.variantes && cotizacionEnEdicion.variantes.length > 0) {
          for (const variante of cotizacionEnEdicion.variantes) {
            try {
              await supabase.from('variantes_cotizacion').delete().eq('id', variante.id);
            } catch (error) {
              console.error('Error al eliminar variante:', error);
            }
          }
        }

        // Actualizar la cotización principal
        await updateCotizacion(cotizacionId, {
          proveedor_id: formData.proveedor_nombre,
          descripcion: `${formData.variantes.length} variante(s)`,
          precio_total: precioTotalCotizacion,
          forma_pago: formData.forma_pago,
          condiciones_pago_detalle: formData.condiciones_pago_detalle,
          tiempo_produccion: formData.variantes[0]?.tiempo_produccion_dias,
          tiempo_entrega: formData.variantes[0]?.tiempo_entrega_dias,
          cuenta_bancaria: formData.cuenta_bancaria,
          banco: formData.banco,
          cci: formData.cci,
          yape_plin: formData.yape_plin,
          prueba_color: formData.prueba_color,
          muestra_fisica: formData.muestra_fisica,
          notas: formData.notas,
          updated_at: new Date().toISOString()
        } as any);

        // Insertar las nuevas variantes
        for (const variante of formData.variantes) {
          try {
            await supabase.from('variantes_cotizacion').insert({
              id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              cotizacion_id: cotizacionId,
              descripcion: variante.descripcion,
              cantidad: variante.cantidad,
              precio_unitario: variante.precio_unitario,
              precio_total: variante.precio_total,
              incluye_igv: variante.incluye_igv,
              tiempo_produccion_dias: variante.tiempo_produccion_dias,
              tiempo_entrega_dias: variante.tiempo_entrega_dias,
              producto_base: variante.producto_base || normalizarAProductoBase(variante.descripcion) || 'otro',
              variante: variante.variante || null,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            });
          } catch (error) {
            console.error('Error al insertar variante:', error);
          }
        }

        alert(`✅ Cotización actualizada exitosamente con ${formData.variantes.length} variante(s)`);
        console.log(`✅ Cotización actualizada (ID: ${cotizacionId}) con ${formData.variantes.length} variante(s)`);
      } else {
        // CREAR: Nueva cotización
        // Solo incluir campos que existen en la tabla cotizaciones
        const nuevaCotizacion = await createCotizacion({
          proveedor_id: formData.proveedor_nombre,
          fecha: new Date().toISOString(),
          descripcion: `${formData.variantes.length} variante(s)`,
          precio_total: precioTotalCotizacion,
          incluye_igv: formData.variantes[0]?.incluye_igv || false,
          moneda: 'PEN',
          forma_pago: formData.forma_pago,
          condiciones_pago_detalle: formData.condiciones_pago_detalle,
          tiempo_produccion: formData.variantes[0]?.tiempo_produccion_dias,
          tiempo_entrega: formData.variantes[0]?.tiempo_entrega_dias,
          cuenta_bancaria: formData.cuenta_bancaria,
          banco: formData.banco,
          cci: formData.cci,
          yape_plin: formData.yape_plin,
          prueba_color: formData.prueba_color,
          muestra_fisica: formData.muestra_fisica,
          estado: 'pendiente',
          notas: formData.notas
        } as any);

        // Insertar las variantes en la tabla variantes_cotizacion
        for (const variante of formData.variantes) {
          try {
            await supabase.from('variantes_cotizacion').insert({
              id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              cotizacion_id: nuevaCotizacion.id,
              descripcion: variante.descripcion,
              cantidad: variante.cantidad,
              precio_unitario: variante.precio_unitario,
              precio_total: variante.precio_total,
              incluye_igv: variante.incluye_igv,
              tiempo_produccion_dias: variante.tiempo_produccion_dias,
              tiempo_entrega_dias: variante.tiempo_entrega_dias,
              producto_base: variante.producto_base || normalizarAProductoBase(variante.descripcion) || 'otro',
              variante: variante.variante || null,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            });
          } catch (error) {
            console.error('Error al insertar variante:', error);
          }
        }

        // Crear registros de histórico de precios para cada variante
        for (const variante of formData.variantes) {
          const productoBase = variante.producto_base;

          await createHistoricoPrecio({
            proveedor_id: formData.proveedor_nombre,
            producto_base: productoBase,
            descripcion: variante.descripcion,
            variante: variante.variante || undefined,
            precio_unitario: variante.precio_unitario,
            incluye_igv: variante.incluye_igv,
            cantidad_referencia: variante.cantidad,
            tiempo_produccion_dias: variante.tiempo_produccion_dias,
            tiempo_entrega_dias: variante.tiempo_entrega_dias,
            pedido_origen_id: showingCotizacionForm || undefined,
            cotizacion_origen_id: nuevaCotizacion.id,
            fecha_cotizacion: new Date().toISOString()
          });
        }

        alert('✅ Cotización creada exitosamente');
        console.log(`✅ Cotización creada (ID: ${nuevaCotizacion.id}) con ${formData.variantes.length} variante(s)`);
      }

      // Resetear formulario
      setFormData({
        proveedor_nombre: '',
        variantes: [
          {
            descripcion: '',
            cantidad: 0,
            precio_unitario: 0,
            precio_total: 0,
            incluye_igv: false,
            producto_base: '',
            variante: ''
          }
        ],
        forma_pago: 'contado'
      });
      setFilterProveedor('');
      setMostrarDropdown(false);
      setShowingCotizacionForm(null);
      setCotizacionEnEdicion(null);
    } catch (error) {
      console.error('Error al guardar cotización:', error);
      alert('Error al guardar la cotización');
    }
  };

  // Agrupar cotizaciones por estado
  const cotizacionesPorEstado = useMemo(() => {
    const todas = cotizaciones;
    return {
      pendiente: todas.filter(c => c.estado === 'pendiente'),
      aprobada: todas.filter(c => c.estado === 'aprobada'),
      rechazada: todas.filter(c => c.estado === 'rechazada'),
      vencida: todas.filter(c => c.estado === 'vencida')
    };
  }, [cotizaciones]);

  return (
    <div className="min-h-screen bg-gray-950 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            {onBack && (
              <button
                onClick={onBack}
                className="p-2 hover:bg-gray-900 rounded-lg transition-colors"
                title="Volver al Dashboard"
              >
                <span className="text-2xl">←</span>
              </button>
            )}
            <div>
              <h1 className="text-4xl font-bold text-white mb-2">💰 Cotizaciones</h1>
              <p className="text-gray-400">Visualiza todos los pedidos en cotización y gestiona cotizaciones de proveedores</p>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-gray-900 border border-yellow-500/30 rounded-lg p-4">
            <p className="text-gray-400 text-sm font-bold uppercase">Cotizaciones Activas</p>
            <p className="text-3xl font-bold text-yellow-400 mt-2">{pedidosCotizacion.length}</p>
          </div>
          <div className="bg-gray-900 border border-yellow-500/30 rounded-lg p-4">
            <p className="text-gray-400 text-sm font-bold uppercase">Pendientes</p>
            <p className="text-3xl font-bold text-yellow-400 mt-2">{cotizacionesPorEstado.pendiente.length}</p>
          </div>
          <div className="bg-gray-900 border border-green-500/30 rounded-lg p-4">
            <p className="text-gray-400 text-sm font-bold uppercase">Aprobadas</p>
            <p className="text-3xl font-bold text-green-400 mt-2">{cotizacionesPorEstado.aprobada.length}</p>
          </div>
          <div className="bg-gray-900 border border-red-500/30 rounded-lg p-4">
            <p className="text-gray-400 text-sm font-bold uppercase">Rechazadas</p>
            <p className="text-3xl font-bold text-red-400 mt-2">{cotizacionesPorEstado.rechazada.length}</p>
          </div>
        </div>

        {/* Cotizaciones List */}
        {pedidosCotizacion.length === 0 ? (
          <div className="bg-gray-900 border border-gray-700 rounded-lg p-8 text-center">
            <p className="text-gray-400 text-lg">No hay pedidos en cotización</p>
          </div>
        ) : (
          <div className="space-y-4">
            {pedidosCotizacion.map(pedido => {
              const clienteInfo = clientes[pedido.cliente];
              const { lineas, totalLineas, totalValor } = getPedidoDetails(pedido.id);
              const isExpanded = expandedPedidoId === pedido.id;
              const isFormOpen = showingCotizacionForm === pedido.id;

              return (
                <div key={pedido.id} className="bg-gray-900 border border-gray-700 rounded-lg overflow-hidden hover:border-yellow-500/50 transition-colors">
                  {/* Header Pedido */}
                  <div
                    onClick={() => setExpandedPedidoId(isExpanded ? null : pedido.id)}
                    className="p-6 cursor-pointer hover:bg-gray-850 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-4">
                          <span className="text-2xl">{isExpanded ? '▼' : '▶'}</span>
                          <div>
                            <h3 className="text-lg font-bold text-white">
                              {clienteInfo?.nombre_comercial || clienteInfo?.razon_social || pedido.cliente}
                            </h3>
                            <p className="text-gray-400 text-sm">{pedido.descripcion}</p>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-yellow-400">S/. {totalValor.toFixed(2)}</p>
                        <p className="text-gray-400 text-xs mt-1">{totalLineas} ítem(s)</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-700">
                      <div className="text-sm text-gray-500">
                        <span>📅 {formatDate(pedido.created_at)}</span>
                        {pedido.fecha_compromiso && (
                          <span className="ml-4">
                            ⏰ Vence: {formatDate(pedido.fecha_compromiso)}
                          </span>
                        )}
                      </div>
                      <div className="text-sm font-mono text-gray-500">{pedido.id.substring(0, 8)}</div>
                    </div>
                  </div>

                  {/* Expanded Content */}
                  {isExpanded && (
                    <div className="border-t border-gray-700 bg-gray-950 p-6 space-y-6">
                      {/* Items del Pedido */}
                      <div>
                        <h4 className="text-sm font-bold uppercase text-gray-400 mb-4">Ítems Solicitados</h4>
                        <div className="space-y-3">
                          {lineas.map(linea => (
                            <div key={linea.id} className="bg-gray-900 border border-gray-700 rounded p-4">
                              <div className="flex justify-between items-start gap-4">
                                <div className="flex-1">
                                  <p className="font-bold text-cyan-300">{linea.item}</p>
                                  <p className="text-gray-400 text-sm mt-2">{linea.detalle}</p>
                                </div>
                                <div className="text-right">
                                  <p className="font-bold text-white">S/. {linea.precio.toFixed(2)}</p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Cotizaciones de Proveedores - Agrupadas por Estado */}
                      <div>
                        <h4 className="text-sm font-bold uppercase text-gray-400 mb-4">Cotizaciones de Proveedores</h4>

                        {cotizaciones.length === 0 ? (
                          <p className="text-gray-500 text-sm italic mb-4">Sin cotizaciones registradas aún</p>
                        ) : (
                          <div className="space-y-4 mb-6">
                            {/* Pendientes */}
                            {cotizacionesPorEstado.pendiente.length > 0 && (
                              <div>
                                <h5 className="text-xs font-bold uppercase text-yellow-400 mb-2">📋 Pendientes</h5>
                                <div className="space-y-2">
                                  {cotizacionesPorEstado.pendiente.map(cot => (
                                    <CotizacionCard key={cot.id} cotizacion={cot} onEditClick={handleEditarCotizacion} pedidoId={pedido.id} />
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Aprobadas */}
                            {cotizacionesPorEstado.aprobada.length > 0 && (
                              <div>
                                <h5 className="text-xs font-bold uppercase text-green-400 mb-2">✅ Aprobadas</h5>
                                <div className="space-y-2">
                                  {cotizacionesPorEstado.aprobada.map(cot => (
                                    <CotizacionCard key={cot.id} cotizacion={cot} onEditClick={handleEditarCotizacion} pedidoId={pedido.id} />
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Rechazadas */}
                            {cotizacionesPorEstado.rechazada.length > 0 && (
                              <div>
                                <h5 className="text-xs font-bold uppercase text-red-400 mb-2">❌ Rechazadas</h5>
                                <div className="space-y-2">
                                  {cotizacionesPorEstado.rechazada.map(cot => (
                                    <CotizacionCard key={cot.id} cotizacion={cot} onEditClick={handleEditarCotizacion} pedidoId={pedido.id} />
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Vencidas */}
                            {cotizacionesPorEstado.vencida.length > 0 && (
                              <div>
                                <h5 className="text-xs font-bold uppercase text-gray-400 mb-2">⏱️ Vencidas</h5>
                                <div className="space-y-2">
                                  {cotizacionesPorEstado.vencida.map(cot => (
                                    <CotizacionCard key={cot.id} cotizacion={cot} onEditClick={handleEditarCotizacion} pedidoId={pedido.id} />
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Agregar Cotización Form */}
                      {!isFormOpen ? (
                        <button
                          onClick={() => setShowingCotizacionForm(pedido.id)}
                          className="w-full bg-yellow-600/20 border border-yellow-500/50 rounded-lg p-4 text-yellow-300 hover:bg-yellow-600/30 transition-colors flex items-center justify-center gap-2"
                        >
                          <span className="text-2xl">➕</span>
                          <span className="font-bold">Agregar Cotización de Proveedor</span>
                        </button>
                      ) : (
                        <div className="bg-gray-900 border border-yellow-500/50 rounded-lg p-6 space-y-4">
                          <h4 className="text-sm font-bold uppercase text-yellow-400">Registrar Nueva Cotización con Variantes</h4>

                          {/* Proveedor con Dropdown */}
                          <div className="space-y-2 relative">
                            <label className="text-xs text-gray-400 font-bold uppercase">Nombre del Proveedor * ({Object.keys(proveedores).length} disponibles)</label>
                            <input
                              type="text"
                              value={filterProveedor}
                              onChange={(e) => {
                                setFilterProveedor(e.target.value);
                                setFormData({ ...formData, proveedor_nombre: e.target.value });
                                setMostrarDropdown(true);
                              }}
                              onFocus={() => setMostrarDropdown(true)}
                              placeholder="Buscar proveedor..."
                              className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-white focus:border-yellow-500 outline-none"
                            />

                            {/* Dropdown de Proveedores */}
                            {mostrarDropdown && filterProveedor && proveedoresFiltrados.length > 0 && (
                              <div className="absolute top-full left-0 right-0 mt-1 bg-gray-800 border border-gray-600 rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto">
                                {proveedoresFiltrados.map((prov) => (
                                  <button
                                    key={prov.id}
                                    type="button"
                                    onClick={() => seleccionarProveedor(prov)}
                                    className="w-full text-left px-4 py-2 hover:bg-gray-700 border-b border-gray-700 last:border-b-0 transition-colors text-white"
                                  >
                                    <div className="font-bold text-emerald-300">{prov.nombre}</div>
                                    <div className="text-xs text-gray-500">
                                      {prov.contacto && `${prov.contacto} | `}
                                      {prov.telefono && `📱 ${prov.telefono}`}
                                    </div>
                                  </button>
                                ))}
                              </div>
                            )}

                            {/* Mostrar proveedor seleccionado con info */}
                            {formData.proveedor_nombre && Object.keys(proveedores).length > 0 && proveedores[formData.proveedor_nombre] && (
                              <>
                                <div className="bg-gray-800 border border-emerald-600/30 rounded p-3 mt-2">
                                  <p className="text-xs text-gray-500 mb-2">📋 Información del Proveedor:</p>
                                  {(() => {
                                    const prov = proveedores[formData.proveedor_nombre];
                                    return (
                                      <div className="text-xs text-gray-300 space-y-1">
                                        {prov.contacto && <p>👤 Contacto: {prov.contacto}</p>}
                                        {prov.telefono && <p>📱 Teléfono: {prov.telefono}</p>}
                                        {prov.email && <p>✉️ Email: {prov.email}</p>}
                                        {prov.tiempo_produccion && <p>⏱️ Tiempo prod.: {prov.tiempo_produccion} días</p>}
                                        {prov.especialidad && <p>🏷️ Especialidad: {prov.especialidad}</p>}
                                      </div>
                                    );
                                  })()}
                                </div>

                                {/* Mostrar histórico de precios del proveedor */}
                                {historicoProveedor.length > 0 && (
                                  <div className="mt-3">
                                    <ProviderHistoryPanel
                                      historico={historicoProveedor}
                                      onSelectVariante={precargarVariante}
                                    />
                                  </div>
                                )}
                              </>
                            )}
                          </div>

                          {/* Variantes */}
                          <div className="space-y-4">
                            <div className="flex items-center justify-between">
                              <h5 className="text-sm font-bold uppercase text-yellow-300">Variantes del Proveedor</h5>
                              <span className="text-xs text-gray-500">{formData.variantes.length} variante(s)</span>
                            </div>

                            {formData.variantes.map((variante, index) => (
                              <div key={index} className="bg-gray-800 border border-gray-700 rounded-lg p-4 space-y-3">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <h6 className="text-xs font-bold text-cyan-300">Variante #{index + 1}</h6>
                                    {variante._precargado && (
                                      <span className="text-xs bg-emerald-600/50 text-emerald-200 px-2 py-0.5 rounded font-bold">
                                        📦 PRECARGADA
                                      </span>
                                    )}
                                  </div>
                                  {formData.variantes.length > 1 && (
                                    <button
                                      onClick={() => eliminarVariante(index)}
                                      className="text-red-400 hover:text-red-300 text-sm font-bold"
                                    >
                                      ✕ Eliminar
                                    </button>
                                  )}
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                  {/* Descripción */}
                                  <div className="md:col-span-2 space-y-2">
                                    <label className="text-xs text-gray-400 font-bold uppercase">Descripción *</label>
                                    <input
                                      type="text"
                                      value={variante.descripcion}
                                      onChange={(e) => actualizarVariante(index, 'descripcion', e.target.value)}
                                      placeholder="Ej: Lanyard 2.5cm sin tip top"
                                      className="w-full bg-gray-700 border border-gray-600 rounded p-2 text-white text-sm focus:border-yellow-500 outline-none"
                                    />
                                  </div>

                                  {/* Producto Base - OBLIGATORIO */}
                                  <div className="md:col-span-2 space-y-2">
                                    <label className="text-xs text-gray-400 font-bold uppercase">Producto Base * (normalizado)</label>
                                    <select
                                      value={variante.producto_base}
                                      onChange={(e) => actualizarVariante(index, 'producto_base', e.target.value)}
                                      className="w-full bg-gray-700 border border-cyan-600/50 rounded p-2 text-white text-sm focus:border-cyan-400 outline-none"
                                      required
                                    >
                                      <option value="">Selecciona un producto...</option>
                                      {PRODUCTOS_BASE.map(p => (
                                        <option key={p.id} value={p.id}>
                                          {p.nombre} ({p.categoria})
                                        </option>
                                      ))}
                                    </select>
                                    {variante.producto_base && (
                                      <p className="text-xs text-cyan-400">✓ {variante.producto_base}</p>
                                    )}
                                  </div>

                                  {/* Cantidad */}
                                  <div className="space-y-2">
                                    <label className="text-xs text-gray-400 font-bold uppercase">Cantidad *</label>
                                    <input
                                      type="number"
                                      value={variante.cantidad || ''}
                                      onChange={(e) => actualizarVariante(index, 'cantidad', parseInt(e.target.value) || 0)}
                                      placeholder="25"
                                      title="Ingresa la cantidad nueva. Nota: si precargaste desde histórico, la cantidad anterior era referencial."
                                      className="w-full bg-gray-700 border border-gray-600 rounded p-2 text-white text-sm focus:border-yellow-500 outline-none"
                                    />
                                  </div>

                                  {/* Precio Unitario */}
                                  <div className="space-y-2">
                                    <label className="text-xs text-gray-400 font-bold uppercase">Precio Unit. *</label>
                                    <input
                                      type="number"
                                      value={variante.precio_unitario || ''}
                                      onChange={(e) => actualizarVariante(index, 'precio_unitario', parseFloat(e.target.value) || 0)}
                                      placeholder="6.00"
                                      step="0.01"
                                      className="w-full bg-gray-700 border border-gray-600 rounded p-2 text-white text-sm focus:border-yellow-500 outline-none"
                                    />
                                  </div>

                                  {/* Precio Total (auto-calculado) */}
                                  <div className="space-y-2">
                                    <label className="text-xs text-gray-400 font-bold uppercase flex items-center gap-2">
                                      💰 Precio Total
                                      <span className="text-xs bg-amber-600/40 text-amber-200 px-2 py-0.5 rounded">AUTOMÁTICO</span>
                                    </label>
                                    <div className="w-full bg-amber-900/20 border border-amber-600/40 rounded p-3 text-amber-100 text-sm font-bold">
                                      {variante.cantidad && variante.precio_unitario ? (
                                        <div>
                                          <div className="text-lg">{(variante.cantidad * variante.precio_unitario).toFixed(2)}</div>
                                          <div className="text-xs text-amber-400 mt-1">({variante.cantidad} × {variante.precio_unitario.toFixed(2)})</div>
                                        </div>
                                      ) : (
                                        <div className="text-gray-400 italic">Completa cantidad y precio unitario</div>
                                      )}
                                    </div>
                                  </div>

                                  {/* Tiempo Producción */}
                                  <div className="space-y-2">
                                    <label className="text-xs text-gray-400 font-bold uppercase">Tiempo Prod. (días)</label>
                                    <input
                                      type="number"
                                      value={variante.tiempo_produccion_dias || ''}
                                      onChange={(e) => actualizarVariante(index, 'tiempo_produccion_dias', parseInt(e.target.value) || undefined)}
                                      placeholder="5"
                                      className="w-full bg-gray-700 border border-gray-600 rounded p-2 text-white text-sm focus:border-yellow-500 outline-none"
                                    />
                                  </div>

                                  {/* Tiempo Entrega */}
                                  <div className="space-y-2">
                                    <label className="text-xs text-gray-400 font-bold uppercase">Tiempo Entrega (días)</label>
                                    <input
                                      type="number"
                                      value={variante.tiempo_entrega_dias || ''}
                                      onChange={(e) => actualizarVariante(index, 'tiempo_entrega_dias', parseInt(e.target.value) || undefined)}
                                      placeholder="2"
                                      className="w-full bg-gray-700 border border-gray-600 rounded p-2 text-white text-sm focus:border-yellow-500 outline-none"
                                    />
                                  </div>

                                  {/* Incluye IGV */}
                                  <div className="space-y-2 flex items-end">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                      <input
                                        type="checkbox"
                                        checked={variante.incluye_igv}
                                        onChange={(e) => actualizarVariante(index, 'incluye_igv', e.target.checked)}
                                        className="w-4 h-4 rounded"
                                      />
                                      <span className="text-xs text-gray-400 font-bold">Incluye IGV</span>
                                    </label>
                                  </div>
                                </div>
                              </div>
                            ))}

                            {/* Botón para agregar variante */}
                            <button
                              onClick={agregarVariante}
                              className="w-full bg-gray-700 hover:bg-gray-600 border border-gray-600 rounded-lg p-2 text-gray-300 text-sm font-bold transition-colors"
                            >
                              + Agregar Variante
                            </button>
                          </div>

                          {/* Condiciones Comunes */}
                          <div className="border-t border-gray-700 pt-4 space-y-3">
                            <h5 className="text-xs font-bold uppercase text-gray-400">Condiciones Generales</h5>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {/* Forma de Pago */}
                              <div className="space-y-2">
                                <label className="text-xs text-gray-400 font-bold uppercase">Forma de Pago</label>
                                <select
                                  value={formData.forma_pago}
                                  onChange={(e) => setFormData({ ...formData, forma_pago: e.target.value as any })}
                                  className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white text-sm focus:border-yellow-500 outline-none"
                                >
                                  <option value="contado">Contado</option>
                                  <option value="adelanto_50">Adelanto 50%</option>
                                  <option value="adelanto_70">Adelanto 70%</option>
                                  <option value="contra_entrega">Contra Entrega</option>
                                  <option value="credito">Crédito</option>
                                  <option value="otro">Otro</option>
                                </select>
                              </div>

                              {/* Banco */}
                              <div className="space-y-2">
                                <label className="text-xs text-gray-400 font-bold uppercase">Banco (opcional)</label>
                                <input
                                  type="text"
                                  value={formData.banco || ''}
                                  onChange={(e) => setFormData({ ...formData, banco: e.target.value })}
                                  placeholder="BCP, BBVA, etc."
                                  className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white text-sm focus:border-yellow-500 outline-none"
                                />
                              </div>

                              {/* CCI */}
                              <div className="space-y-2">
                                <label className="text-xs text-gray-400 font-bold uppercase">CCI (opcional)</label>
                                <input
                                  type="text"
                                  value={formData.cci || ''}
                                  onChange={(e) => setFormData({ ...formData, cci: e.target.value })}
                                  placeholder="Código interbancario"
                                  className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white text-sm focus:border-yellow-500 outline-none"
                                />
                              </div>

                              {/* Yape/Plin */}
                              <div className="space-y-2">
                                <label className="text-xs text-gray-400 font-bold uppercase">Yape/Plin (opcional)</label>
                                <input
                                  type="text"
                                  value={formData.yape_plin || ''}
                                  onChange={(e) => setFormData({ ...formData, yape_plin: e.target.value })}
                                  placeholder="Número"
                                  className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white text-sm focus:border-yellow-500 outline-none"
                                />
                              </div>
                            </div>

                            {/* Condiciones de Pago */}
                            <div className="space-y-2">
                              <label className="text-xs text-gray-400 font-bold uppercase">Condiciones de Pago</label>
                              <textarea
                                value={formData.condiciones_pago_detalle || ''}
                                onChange={(e) => setFormData({ ...formData, condiciones_pago_detalle: e.target.value })}
                                placeholder="Ej: Medio adelanto al confirmar, medio al recoger"
                                rows={2}
                                className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white text-sm focus:border-yellow-500 outline-none"
                              />
                            </div>

                            {/* Notas */}
                            <div className="space-y-2">
                              <label className="text-xs text-gray-400 font-bold uppercase">Notas Adicionales</label>
                              <textarea
                                value={formData.notas || ''}
                                onChange={(e) => setFormData({ ...formData, notas: e.target.value })}
                                placeholder="Cualquier otra información importante"
                                rows={2}
                                className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white text-sm focus:border-yellow-500 outline-none"
                              />
                            </div>

                            {/* Checkboxes */}
                            <div className="flex gap-4">
                              <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={formData.prueba_color || false}
                                  onChange={(e) => setFormData({ ...formData, prueba_color: e.target.checked })}
                                  className="w-4 h-4 rounded"
                                />
                                <span className="text-xs text-gray-400">Ofrece prueba de color</span>
                              </label>
                              <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={formData.muestra_fisica || false}
                                  onChange={(e) => setFormData({ ...formData, muestra_fisica: e.target.checked })}
                                  className="w-4 h-4 rounded"
                                />
                                <span className="text-xs text-gray-400">Ofrece muestra física</span>
                              </label>
                            </div>
                          </div>

                          {/* Botones */}
                          <div className="flex gap-3 pt-4 border-t border-gray-700">
                            <button
                              onClick={() => handleAddCotizacion()}
                              className="flex-1 bg-yellow-600 hover:bg-yellow-500 text-white font-bold py-3 rounded-lg transition-colors"
                            >
                              Guardar Cotización
                            </button>
                            <button
                              onClick={() => {
                                setShowingCotizacionForm(null);
                                setFilterProveedor('');
                                setMostrarDropdown(false);
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
                              }}
                              className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 rounded-lg transition-colors"
                            >
                              Cancelar
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}

// Componente para mostrar una cotización individual
function CotizacionCard({
  cotizacion,
  onEditClick,
  pedidoId
}: {
  cotizacion: Cotizacion;
  onEditClick: (cotizacion: Cotizacion, pedidoId: string) => void;
  pedidoId: string;
}) {
  const { deleteCotizacion } = useDatabase();
  const [isExpanded, setIsExpanded] = useState(false);

  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case 'pendiente':
        return 'text-yellow-400 bg-yellow-900/20';
      case 'aprobada':
        return 'text-green-400 bg-green-900/20';
      case 'rechazada':
        return 'text-red-400 bg-red-900/20';
      case 'vencida':
        return 'text-gray-400 bg-gray-900/20';
      default:
        return 'text-gray-400 bg-gray-900/20';
    }
  };

  // Calcular precio total si tiene variantes
  const precioTotal = cotizacion.variantes ?
    cotizacion.variantes.reduce((sum, v) => sum + v.precio_total, 0) :
    cotizacion.precio_total || 0;

  const handleEliminar = async () => {
    if (!confirm('¿Estás seguro de que quieres eliminar esta cotización? Esta acción no se puede deshacer.')) {
      return;
    }

    try {
      await deleteCotizacion(cotizacion.id);
      alert('✅ Cotización eliminada exitosamente');
    } catch (error) {
      console.error('Error al eliminar cotización:', error);
      alert('❌ Error al eliminar la cotización');
    }
  };

  return (
    <div className={`bg-gray-800/50 border rounded transition-all ${isExpanded ? 'border-cyan-500 bg-gray-800' : 'border-gray-700 hover:border-gray-600'} p-3`}>
      {/* Encabezado - siempre visible */}
      <div className="flex justify-between items-start gap-3 cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={`text-lg transition-transform ${isExpanded ? 'rotate-90' : ''}`}>▶</span>
            <p className="font-bold text-emerald-300">{cotizacion.proveedor_id}</p>
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="font-bold text-white text-lg">S/. {precioTotal.toFixed(2)}</p>
          <p className="text-gray-500 text-xs mt-1">
            {cotizacion.variantes ? `${cotizacion.variantes.length} variante(s)` : 'Sin variantes'}
          </p>
          <span className={`text-xs font-semibold mt-2 inline-block px-2 py-1 rounded ${getEstadoColor(cotizacion.estado)}`}>
            {cotizacion.estado}
          </span>
        </div>
      </div>

      {/* Contenido expandido */}
      {isExpanded && (
        <div className="mt-4 space-y-3 border-t border-gray-700 pt-3">
          {/* Mostrar variantes si existen */}
          {cotizacion.variantes && cotizacion.variantes.length > 0 ? (
            <div className="space-y-2">
              {cotizacion.variantes.map((variante, idx) => (
                <div key={idx} className="text-sm bg-gray-900/50 p-2 rounded border border-gray-700">
                  <p className="text-cyan-300 font-semibold">Variante {idx + 1}: {variante.descripcion}</p>
                  <div className="grid grid-cols-2 gap-2 text-xs text-gray-400 mt-2">
                    <span>📦 Cantidad: {variante.cantidad} u</span>
                    <span>💰 Precio: S/. {variante.precio_unitario.toFixed(2)}/u</span>
                    <span>= Total: S/. {variante.precio_total.toFixed(2)}</span>
                    {variante.tiempo_produccion_dias && <span>⏱️ Producción: {variante.tiempo_produccion_dias}d</span>}
                    {variante.variante && <span>🏷️ Variante: {variante.variante}</span>}
                    {variante.producto_base && <span>📦 Base: {variante.producto_base}</span>}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-400 text-sm">{cotizacion.descripcion}</p>
          )}

          {cotizacion.forma_pago && (
            <p className="text-xs text-gray-400"><span className="text-gray-500">Forma de pago:</span> {cotizacion.forma_pago}</p>
          )}
          {cotizacion.condiciones_pago_detalle && (
            <p className="text-xs text-gray-400"><span className="text-gray-500">Condiciones:</span> {cotizacion.condiciones_pago_detalle}</p>
          )}
          {cotizacion.notas && (
            <p className="text-xs text-gray-400"><span className="text-gray-500">Notas:</span> {cotizacion.notas}</p>
          )}

          {/* Botones de acción */}
          <div className="flex gap-2 mt-3 pt-3 border-t border-gray-700">
            <button
              onClick={() => setIsExpanded(false)}
              className="flex-1 py-2 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded text-sm font-medium transition-colors"
            >
              ▼ Contraer
            </button>
            <button
              onClick={() => onEditClick(cotizacion, pedidoId)}
              className="flex-1 py-2 bg-blue-900/50 hover:bg-blue-900 text-blue-300 rounded text-sm font-medium transition-colors"
            >
              ✏️ Editar
            </button>
            <button
              onClick={handleEliminar}
              className="flex-1 py-2 bg-red-900/50 hover:bg-red-900 text-red-300 rounded text-sm font-medium transition-colors"
            >
              🗑️ Eliminar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
