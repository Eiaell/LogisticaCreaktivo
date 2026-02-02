import { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useDatabase } from '../context/DatabaseContext';
import { supabase } from '../supabaseClient';
import type { PKL, TaskPKL, HistoricoPrecio } from '../types';

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

// Interfaz para JSON de importación
interface ImportJSON {
  proveedor: string;
  proveedor_id?: string;
  notas_proveedor?: string;
  items: {
    producto_base: string;
    descripcion: string;
    variante?: string;
    precio_unitario: number;
    incluye_igv: boolean;
    cantidad_referencia?: number | null;
    tiempo_produccion_dias?: number | null;
    fecha_cotizacion: string;
    notas?: string;
  }[];
}

export function CotizacionesPage({ onBack, onNavigateToPKL }: CotizacionesPageProps) {
  const { pkls, getClienteLogo, historicoPrecio, createHistoricoPrecio, updateHistoricoPrecio, updatePKLTask, updatePKL, proveedores } = useDatabase();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filterEstado, setFilterEstado] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'pkl' | 'precios'>('pkl');
  const [showImportModal, setShowImportModal] = useState(false);

  // ====== TAB PKL: Cotizaciones de PKLs ======
  const todasLasCotizaciones = useMemo(() => {
    const cotizaciones: CotizacionFromPKL[] = [];
    const cotizacionesAgregadas = new Set<string>();

    for (const pkl of pkls) {
      if (pkl.tasks) {
        for (const task of pkl.tasks) {
          if (task.tipo === 'cotizacion') {
            let costoTotal = 0;
            let proveedorPrincipal = task.proveedor || '';

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

            if (!proveedorPrincipal && pkl.proveedores && pkl.proveedores.length > 0) {
              const provElegido = pkl.proveedores.find(p => p.elegido) || pkl.proveedores[0];
              proveedorPrincipal = provElegido.nombre || '';
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

      if (pkl.proveedores && pkl.proveedores.length > 0) {
        for (const prov of pkl.proveedores) {
          if (prov.cotizacion) {
            const cotProv = prov.cotizacion as any;
            const costoTotal = cotProv.precio_total || cotProv.precio || cotProv.monto || 0;

            if (costoTotal > 0) {
              const key = `prov-${pkl.pkl_id}-${prov.proveedor_id}`;
              if (!cotizacionesAgregadas.has(key)) {
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

    return cotizaciones.sort((a, b) => {
      const dateA = new Date(b.fecha).getTime();
      const dateB = new Date(a.fecha).getTime();
      return dateA - dateB;
    });
  }, [pkls]);

  const cotizacionesFiltradas = useMemo(() => {
    let resultado = todasLasCotizaciones;
    if (filterEstado) {
      resultado = resultado.filter(c => c.estado === filterEstado);
    }
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      resultado = resultado.filter(c =>
        c.cliente.toLowerCase().includes(term) ||
        c.descripcion.toLowerCase().includes(term) ||
        c.proveedor.toLowerCase().includes(term) ||
        c.pkl.pkl_id.toLowerCase().includes(term) ||
        c.pkl.origen?.descripcion_inicial?.toLowerCase().includes(term) ||
        c.task.items_cotizacion?.some(item =>
          item.descripcion?.toLowerCase().includes(term)
        ) ||
        c.pkl.productos?.some(prod =>
          prod.tipo?.toLowerCase().includes(term) ||
          prod.descripcion?.toLowerCase().includes(term)
        )
      );
    }
    return resultado;
  }, [todasLasCotizaciones, filterEstado, searchTerm]);

  const cotizacionesPorEstado = useMemo(() => ({
    pendiente: todasLasCotizaciones.filter(c => c.estado === 'pendiente'),
    en_progreso: todasLasCotizaciones.filter(c => c.estado === 'en_progreso'),
    completado: todasLasCotizaciones.filter(c => c.estado === 'completado'),
    cancelado: todasLasCotizaciones.filter(c => c.estado === 'cancelado')
  }), [todasLasCotizaciones]);

  const totalesPKL = useMemo(() => ({
    total: todasLasCotizaciones.reduce((sum, c) => sum + (Number(c.costo) || 0), 0),
    count: todasLasCotizaciones.length
  }), [todasLasCotizaciones]);

  // ====== TAB PRECIOS: Histórico de precios de proveedores ======
  const [preciosSearch, setPreciosSearch] = useState('');
  const [preciosFilterProv, setPreciosFilterProv] = useState('');
  const [expandedPrecioId, setExpandedPrecioId] = useState<string | null>(null);
  const [editingPrecio, setEditingPrecio] = useState<Record<string, any> | null>(null);
  const [expandedProveedores, setExpandedProveedores] = useState<Set<string>>(new Set());
  const [renamingProveedor, setRenamingProveedor] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [showRenameSuggestions, setShowRenameSuggestions] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);

  const handleRenameProveedor = async (oldName: string, newName: string) => {
    if (!newName.trim() || newName === oldName) {
      setRenamingProveedor(null);
      return;
    }
    setIsRenaming(true);
    try {
      let updated = 0;
      let errors = 0;
      const errorMessages: string[] = [];

      // 0. Asegurar que el proveedor destino exista en tabla proveedores (FK constraint)
      const { error: upsertErr } = await supabase.from('proveedores').upsert(
        { nombre: newName, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
        { onConflict: 'nombre' }
      );
      if (upsertErr) {
        errorMessages.push(`Error creando proveedor destino: ${upsertErr.message}`);
      }

      // Recopilar TODAS las variantes del nombre (case-insensitive) que no sean el destino
      // Ej: si newName="Dennis", buscamos "DENNIS", "dennis", etc. en historico y PKL
      const allVariants = new Set<string>();
      allVariants.add(oldName);
      // Buscar en historicoPrecio todos los proveedor_id que matcheen case-insensitive con oldName
      historicoPrecio.forEach(h => {
        if (h.proveedor_id.toLowerCase() === oldName.toLowerCase() && h.proveedor_id !== newName) {
          allVariants.add(h.proveedor_id);
        }
      });

      // 1. Actualizar historico_precios para TODAS las variantes
      for (const variant of allVariants) {
        const itemsToUpdate = historicoPrecio.filter(h => h.proveedor_id === variant);
        if (itemsToUpdate.length > 0) {
          const { error } = await supabase
            .from('historico_precios')
            .update({ proveedor_id: newName, updated_at: new Date().toISOString() })
            .eq('proveedor_id', variant);
          if (error) {
            errorMessages.push(`historico_precios (${variant}): ${error.message}`);
            errors++;
          } else {
            updated += itemsToUpdate.length;
          }
        }
      }

      // 2. Actualizar tasks de PKL (case-insensitive con oldName)
      for (const pkl of pkls) {
        // 2a. Tasks con proveedor
        if (pkl.tasks) {
          for (const task of pkl.tasks) {
            if (task.proveedor && task.proveedor.toLowerCase() === oldName.toLowerCase() && task.proveedor !== newName) {
              try {
                await updatePKLTask(pkl.pkl_id, task.task_id, { proveedor: newName });
                updated++;
              } catch (err: any) {
                errorMessages.push(`PKL task ${task.task_id}: ${err?.message || err}`);
                errors++;
              }
            }
            if (task.cotizaciones) {
              const hasMatch = task.cotizaciones.some(c => c.proveedor && c.proveedor.toLowerCase() === oldName.toLowerCase() && c.proveedor !== newName);
              if (hasMatch) {
                const updatedCots = task.cotizaciones.map(c =>
                  c.proveedor && c.proveedor.toLowerCase() === oldName.toLowerCase() ? { ...c, proveedor: newName } : c
                );
                try {
                  await updatePKLTask(pkl.pkl_id, task.task_id, { cotizaciones: updatedCots });
                  updated++;
                } catch (err: any) {
                  errorMessages.push(`PKL cots ${task.task_id}: ${err?.message || err}`);
                  errors++;
                }
              }
            }
          }
        }

        // 2b. Proveedores del PKL (pkl.proveedores[].nombre)
        if (pkl.proveedores) {
          const hasMatch = pkl.proveedores.some(p =>
            (p.nombre && p.nombre.toLowerCase() === oldName.toLowerCase() && p.nombre !== newName) ||
            (p.proveedor_id && p.proveedor_id.toLowerCase() === oldName.toLowerCase() && p.proveedor_id !== newName)
          );
          if (hasMatch) {
            const updatedProvs = pkl.proveedores.map(p => ({
              ...p,
              nombre: (p.nombre && p.nombre.toLowerCase() === oldName.toLowerCase()) ? newName : p.nombre,
              proveedor_id: (p.proveedor_id && p.proveedor_id.toLowerCase() === oldName.toLowerCase()) ? newName : p.proveedor_id,
            }));
            try {
              await updatePKL(pkl.pkl_id, { proveedores: updatedProvs });
              updated++;
            } catch (err: any) {
              errorMessages.push(`PKL proveedores ${pkl.pkl_id}: ${err?.message || err}`);
              errors++;
            }
          }
        }
      }

      if (errors > 0) {
        alert(`Errores al renombrar "${oldName}" → "${newName}":\n${errorMessages.join('\n')}`);
      } else if (updated > 0) {
        window.location.reload();
        return;
      } else {
        alert(`No se encontraron items para renombrar de "${oldName}" a "${newName}".`);
      }

      setRenamingProveedor(null);
      setRenameValue('');
    } finally {
      setIsRenaming(false);
    }
  };

  const toggleProveedor = (provId: string) => {
    setExpandedProveedores(prev => {
      const next = new Set(prev);
      if (next.has(provId)) {
        next.delete(provId);
        // Colapsar items expandidos de ese proveedor
        setExpandedPrecioId(null);
        setEditingPrecio(null);
      } else {
        next.add(provId);
      }
      return next;
    });
  };

  // Extraer precios de PKL cotizaciones para unificar con histórico
  const preciosDePKL = useMemo(() => {
    const precios: HistoricoPrecio[] = [];
    const ids = new Set<string>();

    for (const pkl of pkls) {
      // 1. Tasks de tipo cotización con cotizaciones de proveedores
      if (pkl.tasks) {
        for (const task of pkl.tasks) {
          if (task.tipo !== 'cotizacion') continue;

          // Cotizaciones dentro del task
          if (task.cotizaciones && task.cotizaciones.length > 0) {
            for (const cot of task.cotizaciones) {
              if (!cot.proveedor || !cot.precio) continue;
              const key = `pkl-cot-${task.task_id}-${cot.proveedor}`;
              if (ids.has(key)) continue;
              ids.add(key);

              const precioUnit = cot.esPrecioUnitario ? cot.precio : (cot.cantidad ? cot.precio / cot.cantidad : cot.precio);
              precios.push({
                id: key,
                proveedor_id: cot.proveedor,
                producto_base: task.nombre || pkl.productos?.[0]?.tipo || 'varios',
                descripcion: task.descripcion || task.nombre || pkl.origen?.descripcion_inicial || '',
                variante: undefined,
                precio_unitario: precioUnit,
                incluye_igv: cot.incluyeIgv || false,
                cantidad_referencia: cot.cantidad,
                tiempo_produccion_dias: undefined,
                fecha_cotizacion: (task as any).fecha_programada || pkl.created_at,
                created_at: pkl.created_at,
                updated_at: pkl.created_at,
                _from_pkl: pkl.pkl_id,
              } as HistoricoPrecio & { _from_pkl?: string });
            }
          }

          // Items de cotización con proveedor
          if (task.items_cotizacion && task.items_cotizacion.length > 0 && task.proveedor) {
            for (const item of task.items_cotizacion) {
              if (!item.precio_unitario && !item.precio_total) continue;
              const key = `pkl-item-${task.task_id}-${item.descripcion}`;
              if (ids.has(key)) continue;
              ids.add(key);

              precios.push({
                id: key,
                proveedor_id: task.proveedor,
                producto_base: item.descripcion?.split(' ')[0]?.toLowerCase() || 'varios',
                descripcion: item.descripcion || '',
                variante: undefined,
                precio_unitario: item.precio_unitario || (item.precio_total && item.cantidad ? item.precio_total / item.cantidad : item.precio_total || 0),
                incluye_igv: task.incluyeIgv || false,
                cantidad_referencia: item.cantidad,
                tiempo_produccion_dias: undefined,
                fecha_cotizacion: (task as any).fecha_programada || pkl.created_at,
                created_at: pkl.created_at,
                updated_at: pkl.created_at,
                _from_pkl: pkl.pkl_id,
              } as HistoricoPrecio & { _from_pkl?: string });
            }
          }

          // Task directo con precio unitario y proveedor
          if (task.precioUnitario && task.proveedor) {
            const key = `pkl-direct-${task.task_id}`;
            if (ids.has(key)) continue;
            ids.add(key);

            precios.push({
              id: key,
              proveedor_id: task.proveedor,
              producto_base: task.nombre || 'varios',
              descripcion: task.descripcion || task.nombre || '',
              variante: undefined,
              precio_unitario: task.precioUnitario,
              incluye_igv: task.incluyeIgv || false,
              cantidad_referencia: task.cantidad,
              tiempo_produccion_dias: undefined,
              fecha_cotizacion: (task as any).fecha_programada || pkl.created_at,
              created_at: pkl.created_at,
              updated_at: pkl.created_at,
              _from_pkl: pkl.pkl_id,
            } as HistoricoPrecio & { _from_pkl?: string });
          }
        }
      }

      // 2. Proveedores del PKL con cotización
      if (pkl.proveedores) {
        for (const prov of pkl.proveedores) {
          if (!prov.cotizacion) continue;
          const cotProv = prov.cotizacion as any;
          const precio = cotProv.precio_total || cotProv.precio || cotProv.monto || 0;
          if (!precio) continue;

          const key = `pkl-prov-${pkl.pkl_id}-${prov.proveedor_id}`;
          if (ids.has(key)) continue;
          ids.add(key);

          const cantidad = cotProv.cantidad || undefined;
          precios.push({
            id: key,
            proveedor_id: prov.nombre || prov.proveedor_id,
            producto_base: pkl.productos?.[0]?.tipo || pkl.origen?.descripcion_inicial?.split(' ')[0]?.toLowerCase() || 'varios',
            descripcion: cotProv.descripcion || pkl.origen?.descripcion_inicial || '',
            variante: undefined,
            precio_unitario: cantidad ? precio / cantidad : precio,
            incluye_igv: cotProv.incluye_igv || false,
            cantidad_referencia: cantidad,
            tiempo_produccion_dias: undefined,
            fecha_cotizacion: cotProv.fecha_cotizacion || pkl.created_at,
            created_at: pkl.created_at,
            updated_at: pkl.created_at,
            _from_pkl: pkl.pkl_id,
          } as HistoricoPrecio & { _from_pkl?: string });
        }
      }
    }

    return precios;
  }, [pkls]);

  // Combinar histórico + PKL
  const todosLosPrecios = useMemo(() => {
    return [...historicoPrecio, ...preciosDePKL];
  }, [historicoPrecio, preciosDePKL]);

  // Proveedores únicos combinados
  const proveedoresUnicos = useMemo(() => {
    const provs = new Set<string>();
    todosLosPrecios.forEach(h => provs.add(h.proveedor_id));
    return Array.from(provs).sort();
  }, [todosLosPrecios]);

  // Filtrar precios
  const preciosFiltrados = useMemo(() => {
    let resultado = [...todosLosPrecios];

    if (preciosFilterProv) {
      resultado = resultado.filter(h => h.proveedor_id === preciosFilterProv);
    }

    if (preciosSearch.trim()) {
      const term = preciosSearch.toLowerCase().trim();
      resultado = resultado.filter(h =>
        h.producto_base.toLowerCase().includes(term) ||
        h.descripcion.toLowerCase().includes(term) ||
        (h.variante || '').toLowerCase().includes(term) ||
        h.proveedor_id.toLowerCase().includes(term)
      );
    }

    return resultado.sort((a, b) =>
      new Date(b.fecha_cotizacion).getTime() - new Date(a.fecha_cotizacion).getTime()
    );
  }, [todosLosPrecios, preciosFilterProv, preciosSearch]);

  // Agrupar por proveedor
  const preciosPorProveedor = useMemo(() => {
    const grouped: Record<string, (HistoricoPrecio & { _from_pkl?: string })[]> = {};
    preciosFiltrados.forEach(h => {
      if (!grouped[h.proveedor_id]) grouped[h.proveedor_id] = [];
      grouped[h.proveedor_id].push(h as any);
    });
    return grouped;
  }, [preciosFiltrados]);

  // ====== UTILIDADES ======
  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

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
        <div className="mb-6">
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
            <div className="flex-1">
              <h1 className="text-4xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
                💰 Cotizaciones
              </h1>
              <p style={{ color: 'var(--text-muted)' }}>
                Cotizaciones de PKLs y precios de proveedores
              </p>
            </div>
            {activeTab === 'precios' && (
              <button
                onClick={() => setShowImportModal(true)}
                className="px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white font-bold rounded-xl transition-all flex items-center gap-2 text-sm"
              >
                📥 Importar JSON
              </button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b mb-6" style={{ borderColor: 'var(--border-color)' }}>
          <button
            onClick={() => setActiveTab('precios')}
            className={`px-6 py-3 font-medium text-sm transition-colors relative ${
              activeTab === 'precios'
                ? 'text-emerald-500'
                : ''
            }`}
            style={activeTab !== 'precios' ? { color: 'var(--text-muted)' } : {}}
          >
            🏷️ Precios Proveedores ({todosLosPrecios.length})
            {activeTab === 'precios' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('pkl')}
            className={`px-6 py-3 font-medium text-sm transition-colors relative ${
              activeTab === 'pkl'
                ? 'text-cyan-500'
                : ''
            }`}
            style={activeTab !== 'pkl' ? { color: 'var(--text-muted)' } : {}}
          >
            📋 Cotizaciones PKL ({totalesPKL.count})
            {activeTab === 'pkl' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-cyan-500" />
            )}
          </button>
        </div>

        {/* ====== TAB: PRECIOS PROVEEDORES ====== */}
        {activeTab === 'precios' && (
          <>
            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="rounded-xl p-4 border" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
                <p className="text-xs font-bold uppercase" style={{ color: 'var(--text-muted)' }}>Precios registrados</p>
                <p className="text-3xl font-bold text-emerald-400 mt-1">{todosLosPrecios.length}</p>
              </div>
              <div className="rounded-xl p-4 border" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
                <p className="text-xs font-bold uppercase" style={{ color: 'var(--text-muted)' }}>Proveedores</p>
                <p className="text-3xl font-bold text-cyan-400 mt-1">{proveedoresUnicos.length}</p>
              </div>
              <div className="rounded-xl p-4 border" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
                <p className="text-xs font-bold uppercase" style={{ color: 'var(--text-muted)' }}>Productos</p>
                <p className="text-3xl font-bold text-purple-400 mt-1">
                  {new Set(todosLosPrecios.map(h => h.producto_base)).size}
                </p>
              </div>
              <div className="rounded-xl p-4 border" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
                <p className="text-xs font-bold uppercase" style={{ color: 'var(--text-muted)' }}>Resultados</p>
                <p className="text-3xl font-bold text-amber-400 mt-1">{preciosFiltrados.length}</p>
              </div>
            </div>

            {/* Búsqueda + Filtro proveedor */}
            <div className="flex gap-3 mb-6">
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={preciosSearch}
                  onChange={(e) => setPreciosSearch(e.target.value)}
                  placeholder="🔍 Buscar por producto, descripción, variante... (ej: bolsa, mug, tocuyo)"
                  className="w-full px-4 py-3 rounded-xl border text-sm transition-all focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 outline-none"
                  style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
                />
                {preciosSearch && (
                  <button
                    onClick={() => setPreciosSearch('')}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200 transition-colors"
                  >
                    ✕
                  </button>
                )}
              </div>
              <select
                value={preciosFilterProv}
                onChange={(e) => setPreciosFilterProv(e.target.value)}
                className="px-4 py-3 rounded-xl border text-sm font-medium cursor-pointer"
                style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
              >
                <option value="">Todos los proveedores</option>
                {proveedoresUnicos.map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>

            {preciosSearch && (
              <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>
                {preciosFiltrados.length} resultado{preciosFiltrados.length !== 1 ? 's' : ''} para "{preciosSearch}"
              </p>
            )}

            {/* Lista de precios agrupados por proveedor */}
            {preciosFiltrados.length === 0 ? (
              <div className="rounded-xl p-12 text-center border" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
                <div className="text-6xl mb-4">🏷️</div>
                <p className="text-xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
                  No hay precios registrados
                </p>
                <p className="mb-4" style={{ color: 'var(--text-muted)' }}>
                  Importa un JSON con cotizaciones de tus proveedores
                </p>
                <button
                  onClick={() => setShowImportModal(true)}
                  className="px-6 py-3 bg-gradient-to-r from-emerald-600 to-cyan-600 text-white font-bold rounded-xl"
                >
                  📥 Importar JSON
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {Object.entries(preciosPorProveedor).map(([provId, items]) => {
                  const isProvExpanded = expandedProveedores.has(provId);
                  const pklCount = items.filter((i: any) => i._from_pkl).length;
                  const histCount = items.length - pklCount;
                  return (
                  <div key={provId} className="rounded-xl border" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
                    {/* Header proveedor - clickable accordion */}
                    <div
                      className="px-5 py-3 flex items-center gap-3 cursor-pointer hover:bg-white/5 transition-colors select-none"
                      style={{ backgroundColor: 'var(--bg-secondary)' }}
                      onClick={() => toggleProveedor(provId)}
                    >
                      <span className={`text-sm transition-transform duration-200 ${isProvExpanded ? 'rotate-90' : ''}`}>▶</span>
                      <span className="text-xl">🏭</span>
                      <div className="flex-1">
                        {renamingProveedor === provId ? (
                          <div className="space-y-1" onClick={(e) => e.stopPropagation()}>
                            <p className="text-[10px] font-bold text-amber-400">
                              Renombrar "{provId}" → ¿a cuál proveedor?
                            </p>
                            <div className="flex items-center gap-2">
                              <div className="relative flex-1">
                                <input
                                  type="text"
                                  value={renameValue}
                                  onChange={(e) => { setRenameValue(e.target.value); setShowRenameSuggestions(true); }}
                                  onFocus={() => setShowRenameSuggestions(true)}
                                  onBlur={() => setTimeout(() => setShowRenameSuggestions(false), 250)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter' && renameValue.trim()) handleRenameProveedor(provId, renameValue);
                                    if (e.key === 'Escape') { setRenamingProveedor(null); setRenameValue(''); }
                                  }}
                                  placeholder="Escribe nombre o elige abajo..."
                                  autoFocus
                                  className="w-full px-3 py-1.5 rounded-lg border text-sm font-bold outline-none focus:ring-2 focus:ring-amber-500/50"
                                  style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
                                />
                                {showRenameSuggestions && proveedoresUnicos.filter(p => p !== provId).length > 0 && (
                                  <div
                                    className="absolute left-0 right-0 top-full mt-1 rounded-lg border-2 border-amber-400 shadow-xl z-[200] max-h-48 overflow-y-auto"
                                    style={{ backgroundColor: 'var(--bg-card)' }}
                                  >
                                    <div className="px-3 py-1.5 text-[10px] font-bold border-b" style={{ color: 'var(--text-muted)', borderColor: 'var(--border-color)' }}>
                                      Proveedores existentes:
                                    </div>
                                    {proveedoresUnicos
                                      .filter(p => p !== provId && (!renameValue.trim() || p.toLowerCase().includes(renameValue.toLowerCase())))
                                      .map(prov => (
                                        <button
                                          key={prov}
                                          onMouseDown={(e) => {
                                            e.preventDefault();
                                            handleRenameProveedor(provId, prov);
                                          }}
                                          className="w-full text-left px-3 py-2 text-sm hover:bg-amber-500/20 transition-colors font-medium"
                                          style={{ color: 'var(--text-primary)' }}
                                        >
                                          → {prov}
                                        </button>
                                      ))}
                                  </div>
                                )}
                              </div>
                              <button
                                onClick={() => handleRenameProveedor(provId, renameValue)}
                                disabled={isRenaming || !renameValue.trim() || renameValue === provId}
                                className="px-3 py-1.5 rounded-lg bg-amber-600 text-white text-xs font-bold disabled:opacity-50"
                              >
                                {isRenaming ? '...' : '✓'}
                              </button>
                              <button
                                onClick={() => { setRenamingProveedor(null); setRenameValue(''); }}
                                className="px-2 py-1.5 rounded-lg text-xs font-bold hover:bg-white/10"
                                style={{ color: 'var(--text-muted)' }}
                              >
                                ✕
                              </button>
                            </div>
                          </div>
                        ) : (
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-bold text-lg" style={{ color: 'var(--text-primary)' }}>{provId}</h3>
                          {histCount > 0 && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-medium">
                              {histCount} importado{histCount > 1 ? 's' : ''}
                            </span>
                          )}
                          {pklCount > 0 && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-400 font-medium">
                              {pklCount} de PKL
                            </span>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setRenamingProveedor(provId);
                              setRenameValue('');
                            }}
                            className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400 hover:bg-amber-500/25 transition-colors font-medium"
                            title="Renombrar / fusionar con otro proveedor"
                          >
                            Renombrar
                          </button>
                        </div>
                        )}
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{items.length} precio{items.length > 1 ? 's' : ''} registrado{items.length > 1 ? 's' : ''}</p>
                      </div>
                    </div>

                    {/* Items - colapsable */}
                    {isProvExpanded && (
                    <div className="divide-y border-t" style={{ borderColor: 'var(--border-color)' }}>
                      {items.map((item) => {
                        const isExpanded = expandedPrecioId === item.id;
                        return (
                          <div key={item.id} className="hover:bg-white/5 transition-colors">
                            <div
                              className="px-5 py-3 cursor-pointer flex items-center gap-4"
                              onClick={() => setExpandedPrecioId(isExpanded ? null : item.id)}
                            >
                              <span className={`text-xs transition-transform ${isExpanded ? 'rotate-90' : ''}`}>▶</span>

                              {/* Producto */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400 font-mono font-bold">
                                    {item.producto_base.replace(/_/g, ' ')}
                                  </span>
                                  {item.variante && (
                                    <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-500">
                                      {item.variante}
                                    </span>
                                  )}
                                  {!item.cantidad_referencia && (
                                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400">
                                      dato por averiguar: cantidad
                                    </span>
                                  )}
                                  {(item as any)._from_pkl && (
                                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/15 text-cyan-500 font-mono">
                                      {(item as any)._from_pkl}
                                    </span>
                                  )}
                                </div>
                                <p className="text-sm mt-1 truncate" style={{ color: 'var(--text-secondary)' }}>
                                  {item.descripcion}
                                </p>
                              </div>

                              {/* Precio */}
                              <div className="text-right flex-shrink-0">
                                <p className="text-lg font-bold text-emerald-400">
                                  S/. {item.precio_unitario.toFixed(2)}
                                  <span className="text-xs font-normal text-gray-500 ml-1">
                                    c/u
                                  </span>
                                </p>
                                <div className="flex items-center gap-2 justify-end mt-0.5">
                                  <span className={`text-[10px] px-1.5 py-0.5 rounded ${item.incluye_igv ? 'bg-green-500/20 text-green-400' : 'bg-orange-500/20 text-orange-400'}`}>
                                    {item.incluye_igv ? 'Inc. IGV' : 'Sin IGV (+ley)'}
                                  </span>
                                  {item.cantidad_referencia && (
                                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-500/20" style={{ color: 'var(--text-muted)' }}>
                                      comprando {item.cantidad_referencia}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Detalle expandido - editable */}
                            {isExpanded && (
                              <div className="px-5 pb-4 pt-1 ml-8">
                                {editingPrecio && editingPrecio.id === item.id ? (
                                  /* Modo edición */
                                  <div className="space-y-3">
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                                      <div className="p-2.5 rounded-lg" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                                        <label className="text-[10px] uppercase font-bold block mb-1" style={{ color: 'var(--text-muted)' }}>Proveedor</label>
                                        <input
                                          type="text"
                                          list="proveedores-list"
                                          value={editingPrecio.proveedor_id}
                                          onChange={(e) => setEditingPrecio({ ...editingPrecio, proveedor_id: e.target.value })}
                                          className="w-full px-2 py-1.5 rounded border text-sm outline-none focus:ring-1 focus:ring-emerald-500"
                                          style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
                                        />
                                        <datalist id="proveedores-list">
                                          {proveedoresUnicos.map(p => <option key={p} value={p} />)}
                                        </datalist>
                                      </div>
                                      <div className="p-2.5 rounded-lg" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                                        <label className="text-[10px] uppercase font-bold block mb-1" style={{ color: 'var(--text-muted)' }}>Precio unitario (S/.)</label>
                                        <input
                                          type="number"
                                          step="0.01"
                                          value={editingPrecio.precio_unitario}
                                          onChange={(e) => setEditingPrecio({ ...editingPrecio, precio_unitario: parseFloat(e.target.value) || 0 })}
                                          className="w-full px-2 py-1.5 rounded border text-sm outline-none focus:ring-1 focus:ring-emerald-500"
                                          style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
                                        />
                                      </div>
                                      <div className="p-2.5 rounded-lg" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                                        <label className="text-[10px] uppercase font-bold block mb-1" style={{ color: 'var(--text-muted)' }}>Cantidad ref.</label>
                                        <input
                                          type="number"
                                          value={editingPrecio.cantidad_referencia || ''}
                                          onChange={(e) => setEditingPrecio({ ...editingPrecio, cantidad_referencia: e.target.value ? parseInt(e.target.value) : null })}
                                          placeholder="Ej: 100"
                                          className="w-full px-2 py-1.5 rounded border text-sm outline-none focus:ring-1 focus:ring-emerald-500"
                                          style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
                                        />
                                      </div>
                                      <div className="p-2.5 rounded-lg" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                                        <label className="text-[10px] uppercase font-bold block mb-1" style={{ color: 'var(--text-muted)' }}>Producción (días)</label>
                                        <input
                                          type="number"
                                          value={editingPrecio.tiempo_produccion_dias || ''}
                                          onChange={(e) => setEditingPrecio({ ...editingPrecio, tiempo_produccion_dias: e.target.value ? parseInt(e.target.value) : null })}
                                          placeholder="Ej: 3"
                                          className="w-full px-2 py-1.5 rounded border text-sm outline-none focus:ring-1 focus:ring-emerald-500"
                                          style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
                                        />
                                      </div>
                                      <div className="p-2.5 rounded-lg" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                                        <label className="text-[10px] uppercase font-bold block mb-1" style={{ color: 'var(--text-muted)' }}>IGV</label>
                                        <select
                                          value={editingPrecio.incluye_igv ? 'true' : 'false'}
                                          onChange={(e) => setEditingPrecio({ ...editingPrecio, incluye_igv: e.target.value === 'true' })}
                                          className="w-full px-2 py-1.5 rounded border text-sm outline-none focus:ring-1 focus:ring-emerald-500"
                                          style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
                                        >
                                          <option value="false">No incluido (+ley)</option>
                                          <option value="true">Incluido</option>
                                        </select>
                                      </div>
                                      <div className="p-2.5 rounded-lg" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                                        <label className="text-[10px] uppercase font-bold block mb-1" style={{ color: 'var(--text-muted)' }}>Descripción</label>
                                        <input
                                          type="text"
                                          value={editingPrecio.descripcion}
                                          onChange={(e) => setEditingPrecio({ ...editingPrecio, descripcion: e.target.value })}
                                          className="w-full px-2 py-1.5 rounded border text-sm outline-none focus:ring-1 focus:ring-emerald-500"
                                          style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
                                        />
                                      </div>
                                      <div className="p-2.5 rounded-lg" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                                        <label className="text-[10px] uppercase font-bold block mb-1" style={{ color: 'var(--text-muted)' }}>Variante</label>
                                        <input
                                          type="text"
                                          value={editingPrecio.variante || ''}
                                          onChange={(e) => setEditingPrecio({ ...editingPrecio, variante: e.target.value || undefined })}
                                          placeholder="Ej: 1 color, full color"
                                          className="w-full px-2 py-1.5 rounded border text-sm outline-none focus:ring-1 focus:ring-emerald-500"
                                          style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
                                        />
                                      </div>
                                    </div>
                                    <div className="flex gap-2 justify-end">
                                      <button
                                        onClick={() => setEditingPrecio(null)}
                                        className="px-4 py-1.5 rounded-lg border text-sm font-medium transition-colors"
                                        style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}
                                      >
                                        Cancelar
                                      </button>
                                      <button
                                        onClick={async () => {
                                          const { id, ...fields } = editingPrecio;
                                          await updateHistoricoPrecio(id, {
                                            proveedor_id: fields.proveedor_id,
                                            precio_unitario: fields.precio_unitario,
                                            cantidad_referencia: fields.cantidad_referencia ?? undefined,
                                            tiempo_produccion_dias: fields.tiempo_produccion_dias ?? undefined,
                                            incluye_igv: fields.incluye_igv,
                                            descripcion: fields.descripcion,
                                            variante: fields.variante,
                                          });
                                          setEditingPrecio(null);
                                        }}
                                        className="px-4 py-1.5 rounded-lg bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700 transition-colors"
                                      >
                                        Guardar
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  /* Modo vista */
                                  <div>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                                      <div className="p-2.5 rounded-lg" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                                        <p className="text-[10px] uppercase font-bold" style={{ color: 'var(--text-muted)' }}>Precio por unidad</p>
                                        <p className="font-bold text-emerald-400">S/. {item.precio_unitario.toFixed(2)} c/u</p>
                                      </div>
                                      <div className="p-2.5 rounded-lg" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                                        <p className="text-[10px] uppercase font-bold" style={{ color: 'var(--text-muted)' }}>Precio cotizado comprando</p>
                                        <p className="font-medium" style={{ color: 'var(--text-primary)' }}>
                                          {item.cantidad_referencia
                                            ? <>{item.cantidad_referencia} und <span className="text-emerald-400 font-bold ml-1">= S/. {(item.precio_unitario * item.cantidad_referencia).toFixed(2)}</span></>
                                            : <span className="text-amber-400 text-xs">Dato por averiguar</span>
                                          }
                                        </p>
                                      </div>
                                      <div className="p-2.5 rounded-lg" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                                        <p className="text-[10px] uppercase font-bold" style={{ color: 'var(--text-muted)' }}>IGV</p>
                                        <p className={`font-medium ${item.incluye_igv ? 'text-green-400' : 'text-orange-400'}`}>
                                          {item.incluye_igv ? 'Incluido' : 'No incluido (+ley)'}
                                        </p>
                                      </div>
                                      <div className="p-2.5 rounded-lg" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                                        <p className="text-[10px] uppercase font-bold" style={{ color: 'var(--text-muted)' }}>Producción</p>
                                        <p className="font-medium" style={{ color: 'var(--text-primary)' }}>
                                          {item.tiempo_produccion_dias
                                            ? `${item.tiempo_produccion_dias} día${item.tiempo_produccion_dias > 1 ? 's' : ''}`
                                            : <span className="text-amber-400 text-xs">Dato por averiguar</span>
                                          }
                                        </p>
                                      </div>
                                      <div className="p-2.5 rounded-lg" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                                        <p className="text-[10px] uppercase font-bold" style={{ color: 'var(--text-muted)' }}>Fecha cotización</p>
                                        <p className="font-medium" style={{ color: 'var(--text-primary)' }}>
                                          {formatDate(item.fecha_cotizacion)}
                                        </p>
                                      </div>
                                    </div>
                                    <div className="mt-3 flex gap-2 justify-end">
                                      {(item as any)._from_pkl && (
                                        <>
                                          <button
                                            onClick={() => onNavigateToPKL?.((item as any)._from_pkl)}
                                            className="text-xs px-3 py-1.5 rounded-lg bg-cyan-500/10 text-cyan-500 hover:bg-cyan-500/20 transition-colors"
                                          >
                                            {(item as any)._from_pkl} →
                                          </button>
                                          <button
                                            onClick={async () => {
                                              await createHistoricoPrecio({
                                                proveedor_id: item.proveedor_id,
                                                producto_base: item.producto_base,
                                                descripcion: item.descripcion,
                                                variante: item.variante,
                                                precio_unitario: item.precio_unitario,
                                                incluye_igv: item.incluye_igv,
                                                cantidad_referencia: item.cantidad_referencia,
                                                tiempo_produccion_dias: item.tiempo_produccion_dias,
                                                fecha_cotizacion: item.fecha_cotizacion,
                                              });
                                            }}
                                            className="text-xs px-3 py-1.5 rounded-lg bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 transition-colors"
                                          >
                                            Guardar en histórico (editable)
                                          </button>
                                        </>
                                      )}
                                      {!(item as any)._from_pkl && (
                                        <button
                                          onClick={() => setEditingPrecio({
                                            id: item.id,
                                            proveedor_id: item.proveedor_id,
                                            precio_unitario: item.precio_unitario,
                                            cantidad_referencia: item.cantidad_referencia ?? null,
                                            tiempo_produccion_dias: item.tiempo_produccion_dias ?? null,
                                            incluye_igv: item.incluye_igv,
                                            descripcion: item.descripcion,
                                            variante: item.variante || '',
                                          })}
                                          className="px-4 py-1.5 rounded-lg text-sm font-medium transition-colors bg-cyan-500/15 text-cyan-400 hover:bg-cyan-500/25"
                                        >
                                          Editar
                                        </button>
                                      )}
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
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* ====== TAB: COTIZACIONES PKL ====== */}
        {activeTab === 'pkl' && (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
              <div className="rounded-xl p-4 border" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
                <p className="text-sm font-bold uppercase" style={{ color: 'var(--text-muted)' }}>Total</p>
                <p className="text-3xl font-bold text-cyan-400 mt-2">{totalesPKL.count}</p>
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
                <p className="text-2xl font-bold text-emerald-400 mt-2">S/. {totalesPKL.total.toFixed(2)}</p>
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
                  style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute right-4 text-gray-400 hover:text-gray-200 transition-colors"
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
                Todas ({totalesPKL.count})
              </button>
              {(['pendiente', 'en_progreso', 'completado'] as const).map(estado => {
                const colors = { pendiente: 'yellow', en_progreso: 'blue', completado: 'green' };
                const c = colors[estado];
                return (
                  <button
                    key={estado}
                    onClick={() => setFilterEstado(estado)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${filterEstado === estado ? `bg-${c}-500 text-white` : `bg-${c}-500/10 text-${c}-400 hover:bg-${c}-500/20`}`}
                  >
                    {getEstadoLabel(estado)} ({cotizacionesPorEstado[estado].length})
                  </button>
                );
              })}
            </div>

            {/* Lista de cotizaciones PKL */}
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
                      <div className="p-4 cursor-pointer" onClick={() => setExpandedId(isExpanded ? null : cot.task.task_id)}>
                        <div className="flex items-start gap-4">
                          <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-gray-800 flex items-center justify-center">
                            {clienteLogo ? (
                              <img src={clienteLogo} alt={cot.cliente} className="w-full h-full object-contain" />
                            ) : (
                              <span className="text-2xl">💬</span>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`text-sm transition-transform ${isExpanded ? 'rotate-90' : ''}`}>▶</span>
                              <h3 className="font-bold truncate" style={{ color: 'var(--text-primary)' }}>{cot.cliente}</h3>
                              <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400 font-mono">{cot.pkl.pkl_id}</span>
                            </div>
                            <p className="text-sm mt-1 truncate" style={{ color: 'var(--text-secondary)' }}>{cot.descripcion}</p>
                            <div className="flex items-center gap-3 mt-2 text-xs" style={{ color: 'var(--text-muted)' }}>
                              <span>📅 {formatDate(cot.fecha)}</span>
                              {cot.proveedor !== 'Sin proveedor' && <span>🏭 {cot.proveedor}</span>}
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0">
                            {cot.costo > 0 && <p className="text-lg font-bold text-emerald-400">S/. {cot.costo.toFixed(2)}</p>}
                            <span className={`inline-block mt-1 text-xs px-2 py-1 rounded-full border ${getEstadoColor(cot.estado)}`}>
                              {getEstadoLabel(cot.estado)}
                            </span>
                          </div>
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="px-4 pb-4 border-t" style={{ borderColor: 'var(--border-color)' }}>
                          <div className="pt-4 space-y-4">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                              {[
                                { label: 'Cliente', value: cot.cliente },
                                { label: 'Proveedor', value: cot.proveedor },
                                { label: 'Costo', value: cot.costo > 0 ? `S/. ${Number(cot.costo).toFixed(2)}` : 'Sin costo', isGreen: true },
                                { label: 'Tipo PKL', value: cot.pkl.clasificacion.tipo_operacion || 'No definido' },
                              ].map((field, idx) => (
                                <div key={idx} className="p-3 rounded-lg" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                                  <p className="text-xs uppercase font-bold" style={{ color: 'var(--text-muted)' }}>{field.label}</p>
                                  <p className={`text-sm font-medium mt-1 ${field.isGreen ? 'text-emerald-400 font-bold' : ''}`} style={field.isGreen ? {} : { color: 'var(--text-primary)' }}>
                                    {field.value}
                                  </p>
                                </div>
                              ))}
                            </div>

                            <div className="p-3 rounded-lg" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                              <p className="text-xs uppercase font-bold mb-2" style={{ color: 'var(--text-muted)' }}>Descripción del Requerimiento</p>
                              <p className="text-sm" style={{ color: 'var(--text-primary)' }}>
                                {cot.pkl.origen?.descripcion_inicial || cot.descripcion || 'Sin descripción'}
                              </p>
                            </div>

                            {cot.task.items_cotizacion && cot.task.items_cotizacion.length > 0 && (
                              <div>
                                <h4 className="text-xs font-bold uppercase mb-2" style={{ color: 'var(--text-muted)' }}>
                                  Items de Cotización ({cot.task.items_cotizacion.length})
                                </h4>
                                <div className="space-y-2">
                                  {cot.task.items_cotizacion.map((item, idx) => (
                                    <div key={idx} className="p-3 rounded-lg text-sm" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                                      <div className="flex justify-between items-start">
                                        <div>
                                          <p className="font-medium" style={{ color: 'var(--text-primary)' }}>{item.descripcion}</p>
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
                                        <p className="font-bold text-emerald-400 text-lg">S/. {Number(cotProv.precio || 0).toFixed(2)}</p>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

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

                            {cot.task.descripcion && (
                              <div className="p-3 rounded-lg" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                                <p className="text-xs uppercase font-bold mb-2" style={{ color: 'var(--text-muted)' }}>Notas</p>
                                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{cot.task.descripcion}</p>
                              </div>
                            )}

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
          </>
        )}
      </div>

      {/* Modal de importación JSON */}
      {showImportModal && (
        <ImportarPreciosModal
          isOpen={showImportModal}
          onClose={() => setShowImportModal(false)}
          proveedoresExistentes={Object.keys(proveedores)}
          onImport={async (data: ImportJSON) => {
            let imported = 0;
            let errors = 0;
            for (const item of data.items) {
              try {
                await createHistoricoPrecio({
                  proveedor_id: data.proveedor_id || data.proveedor,
                  producto_base: item.producto_base,
                  descripcion: item.descripcion + (item.notas ? ` | ${item.notas}` : ''),
                  variante: item.variante,
                  precio_unitario: item.precio_unitario,
                  incluye_igv: item.incluye_igv,
                  cantidad_referencia: item.cantidad_referencia ?? undefined,
                  tiempo_produccion_dias: item.tiempo_produccion_dias ?? undefined,
                  fecha_cotizacion: new Date(item.fecha_cotizacion + 'T12:00:00').toISOString(),
                });
                imported++;
              } catch (err) {
                console.error('Error importing item:', item, err);
                errors++;
              }
            }
            return { imported, errors };
          }}
        />
      )}
    </div>
  );
}

// ====== MODAL DE IMPORTACIÓN JSON ======
function ImportarPreciosModal({ isOpen, onClose, onImport, proveedoresExistentes }: {
  isOpen: boolean;
  onClose: () => void;
  onImport: (data: ImportJSON) => Promise<{ imported: number; errors: number }>;
  proveedoresExistentes: string[];
}) {
  const [jsonText, setJsonText] = useState('');
  const [parsed, setParsed] = useState<ImportJSON | null>(null);
  const [parseError, setParseError] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [result, setResult] = useState<{ imported: number; errors: number } | null>(null);
  const [proveedorOverride, setProveedorOverride] = useState<string | null>(null);
  const [showProveedorSuggestions, setShowProveedorSuggestions] = useState(false);

  const proveedorDisplay = proveedorOverride !== null ? proveedorOverride : (parsed?.proveedor || '');
  const proveedorFinal = (proveedorOverride !== null ? proveedorOverride : parsed?.proveedor_id || parsed?.proveedor) || '';
  const proveedorExiste = proveedoresExistentes.some(p => p.toLowerCase() === proveedorFinal.toLowerCase());

  const filteredProveedores = useMemo(() => {
    if (proveedorOverride === null || !proveedorOverride.trim()) return proveedoresExistentes;
    const term = proveedorOverride.toLowerCase();
    return proveedoresExistentes.filter(p => p.toLowerCase().includes(term));
  }, [proveedorOverride, proveedoresExistentes]);

  const handleParse = () => {
    try {
      const data = JSON.parse(jsonText) as ImportJSON;
      if (!data.proveedor || !data.items || !Array.isArray(data.items)) {
        setParseError('JSON debe tener "proveedor" (string) e "items" (array)');
        setParsed(null);
        return;
      }
      if (data.items.length === 0) {
        setParseError('El array "items" está vacío');
        setParsed(null);
        return;
      }
      // Validar campos mínimos
      for (let i = 0; i < data.items.length; i++) {
        const item = data.items[i];
        if (!item.producto_base) {
          setParseError(`Item ${i + 1}: falta "producto_base"`);
          setParsed(null);
          return;
        }
        if (typeof item.precio_unitario !== 'number') {
          setParseError(`Item ${i + 1}: "precio_unitario" debe ser un número`);
          setParsed(null);
          return;
        }
      }
      setParsed(data);
      setProveedorOverride(null);
      setParseError('');
    } catch (err: any) {
      setParseError(`Error de sintaxis JSON: ${err.message}`);
      setParsed(null);
    }
  };

  const handleImport = async () => {
    if (!parsed) return;
    // Aplicar el proveedor corregido antes de importar
    const dataToImport = {
      ...parsed,
      proveedor: proveedorFinal || parsed.proveedor,
      proveedor_id: proveedorFinal || parsed.proveedor_id || parsed.proveedor,
    };
    setIsImporting(true);
    try {
      const res = await onImport(dataToImport);
      setResult(res);
    } finally {
      setIsImporting(false);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
      <div className="rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl" style={{ backgroundColor: 'var(--bg-card)' }}>
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600 to-cyan-600 p-5 rounded-t-2xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">📥</span>
            <div>
              <h2 className="text-lg font-bold text-white">Importar Precios de Proveedor</h2>
              <p className="text-white/70 text-xs">Pega un JSON con cotizaciones para importar al historial</p>
            </div>
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {result ? (
            /* Resultado de importación */
            <div className="text-center py-8">
              <div className="text-6xl mb-4">{result.errors === 0 ? '✅' : '⚠️'}</div>
              <p className="text-xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
                {result.errors === 0 ? 'Importación exitosa' : 'Importación con errores'}
              </p>
              <p className="text-emerald-400 font-bold text-lg">{result.imported} precios importados</p>
              {result.errors > 0 && (
                <p className="text-red-400 text-sm mt-1">{result.errors} errores (ver consola)</p>
              )}
              <button
                onClick={onClose}
                className="mt-6 px-6 py-3 bg-gradient-to-r from-emerald-600 to-cyan-600 text-white font-bold rounded-xl"
              >
                Cerrar
              </button>
            </div>
          ) : parsed ? (
            /* Preview antes de importar */
            <>
              <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-xl">🏭</span>
                  <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Proveedor:</span>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    value={proveedorDisplay}
                    onChange={(e) => {
                      setProveedorOverride(e.target.value);
                      setShowProveedorSuggestions(true);
                    }}
                    onFocus={() => setShowProveedorSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowProveedorSuggestions(false), 200)}
                    placeholder="Escribe para buscar proveedor existente..."
                    className="w-full px-3 py-2 rounded-lg border text-sm font-bold outline-none focus:ring-2 focus:ring-emerald-500/50"
                    style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
                  />
                  {showProveedorSuggestions && filteredProveedores.length > 0 && (
                    <div
                      className="absolute left-0 right-0 top-full mt-1 rounded-lg border-2 border-emerald-400 shadow-xl z-[200] max-h-48 overflow-y-auto"
                      style={{ backgroundColor: 'var(--bg-card)' }}
                    >
                      {filteredProveedores.map(prov => (
                        <button
                          key={prov}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            setProveedorOverride(prov);
                            setShowProveedorSuggestions(false);
                          }}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-emerald-500/20 transition-colors flex items-center gap-2"
                          style={{ color: 'var(--text-primary)' }}
                        >
                          <span className="text-emerald-400 text-xs">✓</span>
                          {prov}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 text-xs">
                  {proveedorExiste ? (
                    <span className="text-emerald-400 font-medium">✓ Proveedor existente</span>
                  ) : (
                    <span className="text-amber-400 font-medium">+ Se creará como proveedor nuevo</span>
                  )}
                  <span style={{ color: 'var(--text-muted)' }}>· {parsed.items.length} items</span>
                </div>
                {proveedorOverride !== null && proveedorOverride !== parsed.proveedor && (
                  <div className="text-xs flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
                    <span className="line-through">{parsed.proveedor}</span>
                    <span>→</span>
                    <span className="font-bold text-emerald-400">{proveedorOverride}</span>
                  </div>
                )}
              </div>

              <div className="space-y-1.5 max-h-[40vh] overflow-y-auto">
                {parsed.items.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-2.5 rounded-lg text-sm" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                    <span className="text-xs font-mono text-gray-500 w-6 text-right">{idx + 1}</span>
                    <span className="text-xs px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-400 font-mono">
                      {item.producto_base.replace(/_/g, ' ')}
                    </span>
                    <span className="flex-1 truncate" style={{ color: 'var(--text-secondary)' }}>
                      {item.descripcion}
                    </span>
                    <span className="font-bold text-emerald-400 flex-shrink-0">
                      S/. {item.precio_unitario.toFixed(2)}
                    </span>
                    <span className={`text-[10px] px-1 rounded ${item.incluye_igv ? 'bg-green-500/20 text-green-400' : 'bg-orange-500/20 text-orange-400'}`}>
                      {item.incluye_igv ? 'IGV' : '+ley'}
                    </span>
                  </div>
                ))}
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => { setParsed(null); setParseError(''); }}
                  className="flex-1 py-3 rounded-xl border font-medium transition-colors"
                  style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}
                >
                  ← Volver a editar
                </button>
                <button
                  onClick={handleImport}
                  disabled={isImporting}
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-cyan-600 text-white font-bold transition-all disabled:opacity-50"
                >
                  {isImporting ? 'Importando...' : `Importar ${parsed.items.length} precios`}
                </button>
              </div>
            </>
          ) : (
            /* Textarea para pegar JSON */
            <>
              <textarea
                value={jsonText}
                onChange={(e) => setJsonText(e.target.value)}
                placeholder='Pega aquí el JSON con el formato:\n{\n  "proveedor": "Nombre",\n  "proveedor_id": "id-proveedor",\n  "items": [\n    {\n      "producto_base": "bolsa_tocuyo",\n      "descripcion": "Descripción...",\n      "precio_unitario": 0.52,\n      "incluye_igv": false,\n      "cantidad_referencia": 500,\n      "tiempo_produccion_dias": 4,\n      "fecha_cotizacion": "2026-01-29"\n    }\n  ]\n}'
                className="w-full h-64 px-4 py-3 rounded-xl border text-sm font-mono resize-none outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500"
                style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
              />
              {parseError && (
                <p className="text-red-400 text-sm p-2 rounded-lg bg-red-500/10">❌ {parseError}</p>
              )}
              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="flex-1 py-3 rounded-xl border font-medium transition-colors"
                  style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleParse}
                  disabled={!jsonText.trim()}
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-cyan-600 text-white font-bold transition-all disabled:opacity-50"
                >
                  Validar y previsualizar
                </button>
              </div>

              {/* Formato de ejemplo */}
              <details className="mt-2">
                <summary className="text-xs cursor-pointer" style={{ color: 'var(--text-muted)' }}>Ver formato JSON esperado</summary>
                <pre className="mt-2 p-3 rounded-lg text-[11px] overflow-x-auto" style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>
{`{
  "proveedor": "Jhonn Arteck",
  "proveedor_id": "jhonn-arteck",
  "items": [
    {
      "producto_base": "bolsa_tocuyo",
      "descripcion": "Serigrafía bolsas tocuyo 25x35",
      "variante": "1 color 1 cara",
      "precio_unitario": 0.60,
      "incluye_igv": false,
      "cantidad_referencia": 300,
      "tiempo_produccion_dias": 2,
      "fecha_cotizacion": "2026-01-07",
      "notas": "S/.180 lote de 300 +ley"
    }
  ]
}`}
                </pre>
              </details>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
