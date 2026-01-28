import { useState, useMemo } from 'react';
import { useDatabase } from '../context/DatabaseContext';
import type { PKL, TaskPKL } from '../types';

// Estados de tasks PKL
const ESTADOS_TASK = [
  { value: 'pendiente', label: 'Pendiente' },
  { value: 'en_progreso', label: 'En Progreso' },
  { value: 'completado', label: 'Completado' },
  { value: 'cancelado', label: 'Cancelado' },
];

interface CotizacionesPageProps {
  onBack?: () => void;
  onNavigateToPKL?: (pklId: string) => void;
}

// Interfaz para cotización extraída de PKL tasks
interface CotizacionFromPKL {
  task: TaskPKL;
  pkl: PKL;
  fecha: string;
  proveedor: string;
  descripcion: string;
  costo: number;
  estado: string;
  cliente: string;
}

export function CotizacionesPage({ onBack, onNavigateToPKL }: CotizacionesPageProps) {
  const { pkls, getClienteLogo } = useDatabase();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filterEstado, setFilterEstado] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Extraer todas las cotizaciones de PKLs (de tasks y de proveedores)
  const todasLasCotizaciones = useMemo(() => {
    const cotizaciones: CotizacionFromPKL[] = [];
    const cotizacionesAgregadas = new Set<string>(); // Evitar duplicados

    for (const pkl of pkls) {
      // 1. BUSCAR EN TASKS DE TIPO COTIZACION
      if (pkl.tasks) {
        for (const task of pkl.tasks) {
          if (task.tipo === 'cotizacion') {
            let costoTotal = 0;
            let proveedorPrincipal = task.proveedor || '';

            // Buscar costo en diferentes lugares
            if (task.costo && typeof task.costo === 'object' && 'monto' in task.costo && task.costo.monto > 0) {
              costoTotal = task.costo.monto;
            } else if (task.cotizaciones && task.cotizaciones.length > 0) {
              const cotSeleccionada = task.cotizaciones.find(c => c.seleccionada) || task.cotizaciones[0];
              costoTotal = cotSeleccionada.precio || 0;
              proveedorPrincipal = cotSeleccionada.proveedor || proveedorPrincipal;
            } else if (task.resultado && task.resultado.precio_encontrado) {
              costoTotal = task.resultado.precio_encontrado;
            } else if (task.precioUnitario && task.cantidad) {
              costoTotal = task.precioUnitario * task.cantidad;
            } else if (task.items_cotizacion && task.items_cotizacion.length > 0) {
              costoTotal = task.items_cotizacion.reduce((sum, item) => {
                return sum + (item.precio_total || (item.cantidad || 0) * (item.precio_unitario || 0));
              }, 0);
            }

            // Buscar proveedor en PKL si no hay en task
            if (!proveedorPrincipal && pkl.proveedores && pkl.proveedores.length > 0) {
              const provElegido = pkl.proveedores.find(p => p.elegido) || pkl.proveedores[0];
              proveedorPrincipal = provElegido.nombre || '';
              // También buscar costo en proveedor si no hay en task
              if (costoTotal === 0 && provElegido.cotizacion) {
                const cotProv = provElegido.cotizacion as any;
                costoTotal = cotProv.precio_total || cotProv.precio || 0;
              }
            }

            const key = `task-${task.task_id}`;
            if (!cotizacionesAgregadas.has(key)) {
              cotizacionesAgregadas.add(key);
              cotizaciones.push({
                task,
                pkl,
                fecha: (task as any).fecha_programada || (task as any).created_at || pkl.created_at,
                proveedor: proveedorPrincipal || 'Sin proveedor',
                descripcion: task.descripcion || task.nombre || pkl.origen?.descripcion_inicial || 'Sin descripción',
                costo: costoTotal,
                estado: task.estado || 'pendiente',
                cliente: pkl.cliente?.nombre || 'Sin cliente'
              });
            }
          }
        }
      }

      // 2. BUSCAR EN PROVEEDORES DEL PKL QUE TENGAN COTIZACIÓN
      if (pkl.proveedores && pkl.proveedores.length > 0) {
        for (const prov of pkl.proveedores) {
          if (prov.cotizacion) {
            const cotProv = prov.cotizacion as any;
            const costoTotal = cotProv.precio_total || cotProv.precio || cotProv.monto || 0;

            // Solo agregar si tiene precio y no está ya como task
            if (costoTotal > 0) {
              const key = `prov-${pkl.pkl_id}-${prov.proveedor_id}`;
              if (!cotizacionesAgregadas.has(key)) {
                // Verificar que no haya ya un task de cotización con este proveedor
                const yaExisteComoTask = pkl.tasks?.some(t =>
                  t.tipo === 'cotizacion' &&
                  (t.proveedor === prov.nombre || t.proveedor_id === prov.proveedor_id)
                );

                if (!yaExisteComoTask) {
                  cotizacionesAgregadas.add(key);
                  cotizaciones.push({
                    task: {
                      task_id: `virtual-${prov.proveedor_id}`,
                      orden: 0,
                      nombre: cotProv.descripcion || `Cotización ${prov.nombre}`,
                      descripcion: cotProv.descripcion || pkl.origen?.descripcion_inicial,
                      tipo: 'cotizacion',
                      responsable: 'Huber',
                      estado: prov.elegido ? 'completado' : 'pendiente',
                      es_happy_path: false,
                    } as any,
                    pkl,
                    fecha: cotProv.fecha_cotizacion || pkl.created_at,
                    proveedor: prov.nombre,
                    descripcion: cotProv.descripcion || pkl.origen?.descripcion_inicial || 'Sin descripción',
                    costo: costoTotal,
                    estado: prov.elegido ? 'completado' : 'pendiente',
                    cliente: pkl.cliente?.nombre || 'Sin cliente'
                  });
                }
              }
            }
          }
        }
      }
    }

    // Ordenar por fecha descendente
    return cotizaciones.sort((a, b) => {
      const dateA = new Date(b.fecha).getTime();
      const dateB = new Date(a.fecha).getTime();
      return dateA - dateB;
    });
  }, [pkls]);

  // Filtrar cotizaciones por estado y búsqueda
  const cotizacionesFiltradas = useMemo(() => {
    let resultado = todasLasCotizaciones;

    // Filtrar por estado
    if (filterEstado) {
      resultado = resultado.filter(c => c.estado === filterEstado);
    }

    // Filtrar por búsqueda
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      resultado = resultado.filter(c =>
        c.cliente.toLowerCase().includes(term) ||
        c.descripcion.toLowerCase().includes(term) ||
        c.proveedor.toLowerCase().includes(term) ||
        c.pkl.pkl_id.toLowerCase().includes(term) ||
        c.pkl.origen?.descripcion_inicial?.toLowerCase().includes(term) ||
        // Buscar en items de cotización
        c.task.items_cotizacion?.some(item =>
          item.descripcion?.toLowerCase().includes(term)
        ) ||
        // Buscar en productos del PKL
        c.pkl.productos?.some(prod =>
          prod.tipo?.toLowerCase().includes(term) ||
          prod.descripcion?.toLowerCase().includes(term)
        )
      );
    }

    return resultado;
  }, [todasLasCotizaciones, filterEstado, searchTerm]);

  // Agrupar por estado
  const cotizacionesPorEstado = useMemo(() => {
    return {
      pendiente: todasLasCotizaciones.filter(c => c.estado === 'pendiente'),
      en_progreso: todasLasCotizaciones.filter(c => c.estado === 'en_progreso'),
      completado: todasLasCotizaciones.filter(c => c.estado === 'completado'),
      cancelado: todasLasCotizaciones.filter(c => c.estado === 'cancelado')
    };
  }, [todasLasCotizaciones]);

  // Calcular totales
  const totales = useMemo(() => {
    const total = todasLasCotizaciones.reduce((sum, c) => sum + (Number(c.costo) || 0), 0);
    return { total, count: todasLasCotizaciones.length };
  }, [todasLasCotizaciones]);

  // Formatear fecha
  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  // Color por estado
  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case 'pendiente': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'en_progreso': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'completado': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'cancelado': return 'bg-red-500/20 text-red-400 border-red-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const getEstadoLabel = (estado: string) => {
    const found = ESTADOS_TASK.find(e => e.value === estado);
    return found?.label || estado;
  };

  return (
    <div className="min-h-screen p-6" style={{ backgroundColor: 'var(--bg-primary)' }}>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            {onBack && (
              <button
                onClick={onBack}
                className="p-2 rounded-lg transition-colors hover:bg-white/10"
                style={{ color: 'var(--text-secondary)' }}
                title="Volver al Dashboard"
              >
                <span className="text-2xl">←</span>
              </button>
            )}
            <div>
              <h1 className="text-4xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
                💰 Cotizaciones
              </h1>
              <p style={{ color: 'var(--text-muted)' }}>
                Todas las cotizaciones de tus PKLs ({totales.count} total)
              </p>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <div className="rounded-xl p-4 border" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
            <p className="text-sm font-bold uppercase" style={{ color: 'var(--text-muted)' }}>Total</p>
            <p className="text-3xl font-bold text-cyan-400 mt-2">{totales.count}</p>
          </div>
          <div className="rounded-xl p-4 border border-yellow-500/30 bg-yellow-500/10">
            <p className="text-sm font-bold uppercase text-yellow-400/70">Pendientes</p>
            <p className="text-3xl font-bold text-yellow-400 mt-2">{cotizacionesPorEstado.pendiente.length}</p>
          </div>
          <div className="rounded-xl p-4 border border-blue-500/30 bg-blue-500/10">
            <p className="text-sm font-bold uppercase text-blue-400/70">En Progreso</p>
            <p className="text-3xl font-bold text-blue-400 mt-2">{cotizacionesPorEstado.en_progreso.length}</p>
          </div>
          <div className="rounded-xl p-4 border border-green-500/30 bg-green-500/10">
            <p className="text-sm font-bold uppercase text-green-400/70">Completadas</p>
            <p className="text-3xl font-bold text-green-400 mt-2">{cotizacionesPorEstado.completado.length}</p>
          </div>
          <div className="rounded-xl p-4 border" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
            <p className="text-sm font-bold uppercase" style={{ color: 'var(--text-muted)' }}>Monto Total</p>
            <p className="text-2xl font-bold text-emerald-400 mt-2">S/. {totales.total.toFixed(2)}</p>
          </div>
        </div>

        {/* Barra de búsqueda */}
        <div className="mb-6">
          <div className="relative flex items-center">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="🔍 Buscar por producto, cliente, proveedor... (ej: vinil, bolsa, banner)"
              className="w-full px-4 py-3 rounded-xl border text-sm transition-all focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 outline-none"
              style={{
                backgroundColor: 'var(--bg-card)',
                borderColor: 'var(--border-color)',
                color: 'var(--text-primary)'
              }}
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-4 text-gray-400 hover:text-gray-200 transition-colors"
                title="Limpiar búsqueda"
              >
                ✕
              </button>
            )}
          </div>
          {searchTerm && (
            <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
              {cotizacionesFiltradas.length} resultado{cotizacionesFiltradas.length !== 1 ? 's' : ''} para "{searchTerm}"
            </p>
          )}
        </div>

        {/* Filtro por estado */}
        <div className="flex gap-2 mb-6 flex-wrap">
          <button
            onClick={() => setFilterEstado('')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${!filterEstado ? 'bg-cyan-500 text-white' : 'bg-white/5 hover:bg-white/10'}`}
            style={!filterEstado ? {} : { color: 'var(--text-secondary)' }}
          >
            Todas ({totales.count})
          </button>
          <button
            onClick={() => setFilterEstado('pendiente')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${filterEstado === 'pendiente' ? 'bg-yellow-500 text-white' : 'bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20'}`}
          >
            Pendientes ({cotizacionesPorEstado.pendiente.length})
          </button>
          <button
            onClick={() => setFilterEstado('en_progreso')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${filterEstado === 'en_progreso' ? 'bg-blue-500 text-white' : 'bg-blue-500/10 text-blue-400 hover:bg-blue-500/20'}`}
          >
            En Progreso ({cotizacionesPorEstado.en_progreso.length})
          </button>
          <button
            onClick={() => setFilterEstado('completado')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${filterEstado === 'completado' ? 'bg-green-500 text-white' : 'bg-green-500/10 text-green-400 hover:bg-green-500/20'}`}
          >
            Completadas ({cotizacionesPorEstado.completado.length})
          </button>
        </div>

        {/* Lista de cotizaciones */}
        {cotizacionesFiltradas.length === 0 ? (
          <div className="rounded-xl p-12 text-center border" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
            <div className="text-6xl mb-4">💬</div>
            <p className="text-xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
              No hay cotizaciones
            </p>
            <p style={{ color: 'var(--text-muted)' }}>
              {filterEstado
                ? `No hay cotizaciones con estado "${getEstadoLabel(filterEstado)}"`
                : 'Crea un PKL con un task de tipo "Cotización" para verlo aquí'
              }
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {cotizacionesFiltradas.map((cot) => {
              const isExpanded = expandedId === cot.task.task_id;
              const clienteLogo = getClienteLogo(cot.cliente);

              return (
                <div
                  key={cot.task.task_id}
                  className={`rounded-xl border transition-all ${isExpanded ? 'ring-2 ring-cyan-500/50' : 'hover:border-cyan-500/30'}`}
                  style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
                >
                  {/* Header - siempre visible */}
                  <div
                    className="p-4 cursor-pointer"
                    onClick={() => setExpandedId(isExpanded ? null : cot.task.task_id)}
                  >
                    <div className="flex items-start gap-4">
                      {/* Logo cliente */}
                      <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-gray-800 flex items-center justify-center">
                        {clienteLogo ? (
                          <img src={clienteLogo} alt={cot.cliente} className="w-full h-full object-contain" />
                        ) : (
                          <span className="text-2xl">💬</span>
                        )}
                      </div>

                      {/* Info principal */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-sm transition-transform ${isExpanded ? 'rotate-90' : ''}`}>▶</span>
                          <h3 className="font-bold truncate" style={{ color: 'var(--text-primary)' }}>
                            {cot.cliente}
                          </h3>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400 font-mono">
                            {cot.pkl.pkl_id}
                          </span>
                        </div>
                        <p className="text-sm mt-1 truncate" style={{ color: 'var(--text-secondary)' }}>
                          {cot.descripcion}
                        </p>
                        <div className="flex items-center gap-3 mt-2 text-xs" style={{ color: 'var(--text-muted)' }}>
                          <span>📅 {formatDate(cot.fecha)}</span>
                          {cot.proveedor !== 'Sin proveedor' && (
                            <span>🏭 {cot.proveedor}</span>
                          )}
                        </div>
                      </div>

                      {/* Costo y estado */}
                      <div className="text-right flex-shrink-0">
                        {cot.costo > 0 && (
                          <p className="text-lg font-bold text-emerald-400">
                            S/. {cot.costo.toFixed(2)}
                          </p>
                        )}
                        <span className={`inline-block mt-1 text-xs px-2 py-1 rounded-full border ${getEstadoColor(cot.estado)}`}>
                          {getEstadoLabel(cot.estado)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Contenido expandido */}
                  {isExpanded && (
                    <div className="px-4 pb-4 border-t" style={{ borderColor: 'var(--border-color)' }}>
                      <div className="pt-4 space-y-4">
                        {/* Información del PKL */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          <div className="p-3 rounded-lg" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                            <p className="text-xs uppercase font-bold" style={{ color: 'var(--text-muted)' }}>Cliente</p>
                            <p className="text-sm font-medium mt-1" style={{ color: 'var(--text-primary)' }}>{cot.cliente}</p>
                          </div>
                          <div className="p-3 rounded-lg" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                            <p className="text-xs uppercase font-bold" style={{ color: 'var(--text-muted)' }}>Proveedor</p>
                            <p className="text-sm font-medium mt-1" style={{ color: 'var(--text-primary)' }}>{cot.proveedor}</p>
                          </div>
                          <div className="p-3 rounded-lg" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                            <p className="text-xs uppercase font-bold" style={{ color: 'var(--text-muted)' }}>Costo</p>
                            <p className="text-sm font-bold mt-1 text-emerald-400">
                              {cot.costo > 0 ? `S/. ${Number(cot.costo).toFixed(2)}` : 'Sin costo'}
                            </p>
                          </div>
                          <div className="p-3 rounded-lg" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                            <p className="text-xs uppercase font-bold" style={{ color: 'var(--text-muted)' }}>Tipo PKL</p>
                            <p className="text-sm font-medium mt-1" style={{ color: 'var(--text-primary)' }}>
                              {cot.pkl.clasificacion.tipo_operacion || 'No definido'}
                            </p>
                          </div>
                        </div>

                        {/* Descripción completa del PKL */}
                        <div className="p-3 rounded-lg" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                          <p className="text-xs uppercase font-bold mb-2" style={{ color: 'var(--text-muted)' }}>Descripción del Requerimiento</p>
                          <p className="text-sm" style={{ color: 'var(--text-primary)' }}>
                            {cot.pkl.origen?.descripcion_inicial || cot.descripcion || 'Sin descripción'}
                          </p>
                        </div>

                        {/* Items de cotización si existen */}
                        {cot.task.items_cotizacion && cot.task.items_cotizacion.length > 0 && (
                          <div>
                            <h4 className="text-xs font-bold uppercase mb-2" style={{ color: 'var(--text-muted)' }}>
                              Items de Cotización ({cot.task.items_cotizacion.length})
                            </h4>
                            <div className="space-y-2">
                              {cot.task.items_cotizacion.map((item, idx) => (
                                <div
                                  key={idx}
                                  className="p-3 rounded-lg text-sm"
                                  style={{ backgroundColor: 'var(--bg-secondary)' }}
                                >
                                  <div className="flex justify-between items-start">
                                    <div>
                                      <p className="font-medium" style={{ color: 'var(--text-primary)' }}>
                                        {item.descripcion}
                                      </p>
                                      <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                                        {item.cantidad} x S/. {item.precio_unitario?.toFixed(2) || '0.00'}
                                      </p>
                                    </div>
                                    <p className="font-bold text-emerald-400">
                                      S/. {((item.cantidad || 0) * (item.precio_unitario || 0)).toFixed(2)}
                                    </p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Cotizaciones de proveedores dentro del task */}
                        {cot.task.cotizaciones && cot.task.cotizaciones.length > 0 && (
                          <div>
                            <h4 className="text-xs font-bold uppercase mb-2" style={{ color: 'var(--text-muted)' }}>
                              Cotizaciones de Proveedores ({cot.task.cotizaciones.length})
                            </h4>
                            <div className="space-y-2">
                              {cot.task.cotizaciones.map((cotProv, idx: number) => (
                                <div
                                  key={idx}
                                  className={`p-3 rounded-lg text-sm border ${cotProv.seleccionada ? 'border-green-500 bg-green-500/10' : ''}`}
                                  style={cotProv.seleccionada ? {} : { backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}
                                >
                                  <div className="flex justify-between items-start">
                                    <div>
                                      <p className="font-medium text-emerald-400">
                                        🏭 {cotProv.proveedor || 'Proveedor'}
                                        {cotProv.seleccionada && <span className="ml-2 text-green-400 text-xs">✓ Seleccionada</span>}
                                      </p>
                                      {cotProv.cantidad && (
                                        <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                                          📦 Cantidad: {cotProv.cantidad} {cotProv.esPrecioUnitario ? '(precio unitario)' : '(precio total)'}
                                        </p>
                                      )}
                                      <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                                        {cotProv.incluyeIgv ? '✓ Incluye IGV' : '✗ Sin IGV'}
                                      </p>
                                    </div>
                                    <div className="text-right">
                                      <p className="font-bold text-emerald-400 text-lg">
                                        S/. {Number(cotProv.precio || 0).toFixed(2)}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Información de precio directo si no hay cotizaciones */}
                        {(!cot.task.cotizaciones || cot.task.cotizaciones.length === 0) && (cot.task.precioUnitario || cot.task.cantidad) && (
                          <div className="p-3 rounded-lg" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                            <p className="text-xs uppercase font-bold mb-2" style={{ color: 'var(--text-muted)' }}>Detalle de Precio</p>
                            <div className="grid grid-cols-3 gap-3 text-sm">
                              {cot.task.cantidad && (
                                <div>
                                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Cantidad</p>
                                  <p className="font-medium" style={{ color: 'var(--text-primary)' }}>{cot.task.cantidad}</p>
                                </div>
                              )}
                              {cot.task.precioUnitario && (
                                <div>
                                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Precio Unit.</p>
                                  <p className="font-medium" style={{ color: 'var(--text-primary)' }}>S/. {cot.task.precioUnitario.toFixed(2)}</p>
                                </div>
                              )}
                              {cot.task.cantidad && cot.task.precioUnitario && (
                                <div>
                                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Total</p>
                                  <p className="font-bold text-emerald-400">S/. {(cot.task.cantidad * cot.task.precioUnitario).toFixed(2)}</p>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Descripción si existe */}
                        {cot.task.descripcion && (
                          <div className="p-3 rounded-lg" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                            <p className="text-xs uppercase font-bold mb-2" style={{ color: 'var(--text-muted)' }}>Notas</p>
                            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                              {cot.task.descripcion}
                            </p>
                          </div>
                        )}

                        {/* Botón para ir al PKL */}
                        <div className="pt-3 border-t" style={{ borderColor: 'var(--border-color)' }}>
                          <button
                            onClick={() => onNavigateToPKL?.(cot.pkl.pkl_id)}
                            className="w-full py-3 px-4 rounded-lg bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 transition-colors text-sm font-bold"
                          >
                            Ver PKL completo {cot.pkl.pkl_id} →
                          </button>
                        </div>
                      </div>
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
