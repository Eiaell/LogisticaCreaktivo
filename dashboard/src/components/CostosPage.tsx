import { useMemo, useState } from 'react';
import { useDatabase } from '../context/DatabaseContext';
import { TIPOS_RENDICION, type TipoRendicion } from '../types';

interface Props {
  onBack: () => void;
}

export function CostosPage({ onBack }: Props) {
  const { rendiciones, movimientosLogisticos } = useDatabase();

  // Estado para filtros
  const [rangoFecha, setRangoFecha] = useState<'7dias' | '30dias' | '90dias' | 'mes_actual'>('mes_actual');
  const [filtroCliente, setFiltroCliente] = useState<string>('');
  const [filtroTipo, setFiltroTipo] = useState<TipoRendicion | ''>('');

  // Calcular fechas de rango
  const { fechaInicio, fechaFin } = useMemo(() => {
    const hoy = new Date();
    let inicio = new Date();

    switch (rangoFecha) {
      case '7dias':
        inicio.setDate(hoy.getDate() - 7);
        break;
      case '30dias':
        inicio.setDate(hoy.getDate() - 30);
        break;
      case '90dias':
        inicio.setDate(hoy.getDate() - 90);
        break;
      case 'mes_actual':
        inicio = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
        break;
    }

    return {
      fechaInicio: inicio.toISOString().split('T')[0],
      fechaFin: hoy.toISOString().split('T')[0]
    };
  }, [rangoFecha]);

  // Calcular mes anterior para comparación
  const { fechaInicioAnterior, fechaFinAnterior } = useMemo(() => {
    const hoy = new Date();
    const mesAnterior = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1);
    const finMesAnterior = new Date(hoy.getFullYear(), hoy.getMonth(), 0);

    return {
      fechaInicioAnterior: mesAnterior.toISOString().split('T')[0],
      fechaFinAnterior: finMesAnterior.toISOString().split('T')[0]
    };
  }, []);

  // Filtrar datos por rango de fecha
  const rendicionesFiltradas = useMemo(() => {
    return rendiciones.filter(r => {
      const fecha = r.fecha;
      const cumpleRango = fecha >= fechaInicio && fecha <= fechaFin;
      const cumpleCliente = !filtroCliente || r.cliente === filtroCliente;
      const cumpleTipo = !filtroTipo || r.tipo === filtroTipo;
      return cumpleRango && cumpleCliente && cumpleTipo;
    });
  }, [rendiciones, fechaInicio, fechaFin, filtroCliente, filtroTipo]);

  const rendicionesAnterior = useMemo(() => {
    return rendiciones.filter(r => {
      const fecha = r.fecha;
      return fecha >= fechaInicioAnterior && fecha <= fechaFinAnterior;
    });
  }, [rendiciones, fechaInicioAnterior, fechaFinAnterior]);

  // Calcular gastos de movilidad desde movimientos
  const gastosMovilidad = useMemo(() => {
    return movimientosLogisticos
      .filter(m => {
        const fecha = m.fecha;
        const cumpleRango = fecha >= fechaInicio && fecha <= fechaFin;
        const cumpleCliente = !filtroCliente || m.cliente === filtroCliente;
        return cumpleRango && cumpleCliente && m.costo_movilidad;
      })
      .reduce((sum, m) => sum + (m.costo_movilidad || 0), 0);
  }, [movimientosLogisticos, fechaInicio, fechaFin, filtroCliente]);

  // KPIs de Costos
  const kpis = useMemo(() => {
    const totalGastado = rendicionesFiltradas.reduce((sum, r) => sum + r.monto, 0) + gastosMovilidad;
    const totalAnterior = rendicionesAnterior.reduce((sum, r) => sum + r.monto, 0);

    const diasEnRango = Math.ceil((new Date(fechaFin).getTime() - new Date(fechaInicio).getTime()) / (1000 * 60 * 60 * 24)) + 1;
    const promedioDiario = totalGastado / diasEnRango;

    const gastos = rendicionesFiltradas.map(r => r.monto);
    const mayorGasto = gastos.length > 0 ? Math.max(...gastos) : 0;

    const cambioVsAnterior = totalAnterior > 0
      ? ((totalGastado - totalAnterior) / totalAnterior) * 100
      : 0;

    return {
      totalGastado,
      promedioDiario,
      mayorGasto,
      cambioVsAnterior
    };
  }, [rendicionesFiltradas, rendicionesAnterior, gastosMovilidad, fechaInicio, fechaFin]);

  // Gastos por categoría
  const gastosPorCategoria = useMemo(() => {
    const categorias: Record<string, number> = {};

    rendicionesFiltradas.forEach(r => {
      categorias[r.tipo] = (categorias[r.tipo] || 0) + r.monto;
    });

    // Agregar movilidad de movimientos
    if (gastosMovilidad > 0) {
      categorias['movilidad'] = (categorias['movilidad'] || 0) + gastosMovilidad;
    }

    const total = Object.values(categorias).reduce((sum, val) => sum + val, 0);

    return Object.entries(categorias)
      .map(([tipo, monto]) => ({
        tipo: tipo as TipoRendicion,
        monto,
        porcentaje: total > 0 ? (monto / total) * 100 : 0
      }))
      .sort((a, b) => b.monto - a.monto);
  }, [rendicionesFiltradas, gastosMovilidad]);

  // Gastos por cliente
  const gastosPorCliente = useMemo(() => {
    const clienteGastos: Record<string, number> = {};

    rendicionesFiltradas.forEach(r => {
      if (r.cliente) {
        clienteGastos[r.cliente] = (clienteGastos[r.cliente] || 0) + r.monto;
      }
    });

    movimientosLogisticos
      .filter(m => {
        const fecha = m.fecha;
        return fecha >= fechaInicio && fecha <= fechaFin && m.costo_movilidad && m.cliente;
      })
      .forEach(m => {
        if (m.cliente) {
          clienteGastos[m.cliente] = (clienteGastos[m.cliente] || 0) + (m.costo_movilidad || 0);
        }
      });

    const total = Object.values(clienteGastos).reduce((sum, val) => sum + val, 0);

    return Object.entries(clienteGastos)
      .map(([cliente, monto]) => ({
        cliente,
        monto,
        porcentaje: total > 0 ? (monto / total) * 100 : 0
      }))
      .sort((a, b) => b.monto - a.monto)
      .slice(0, 5);
  }, [rendicionesFiltradas, movimientosLogisticos, fechaInicio, fechaFin]);

  // Timeline de gastos (últimos 30 días)
  const timelineGastos = useMemo(() => {
    const gastosPorDia: Record<string, number> = {};

    // Inicializar últimos 30 días
    for (let i = 29; i >= 0; i--) {
      const fecha = new Date();
      fecha.setDate(fecha.getDate() - i);
      const fechaStr = fecha.toISOString().split('T')[0];
      gastosPorDia[fechaStr] = 0;
    }

    // Sumar rendiciones
    rendiciones.forEach(r => {
      if (gastosPorDia.hasOwnProperty(r.fecha)) {
        gastosPorDia[r.fecha] += r.monto;
      }
    });

    // Sumar movilidad
    movimientosLogisticos.forEach(m => {
      if (gastosPorDia.hasOwnProperty(m.fecha) && m.costo_movilidad) {
        gastosPorDia[m.fecha] += m.costo_movilidad;
      }
    });

    const valores = Object.values(gastosPorDia);
    const maxGasto = Math.max(...valores, 1);

    return Object.entries(gastosPorDia).map(([fecha, monto]) => ({
      fecha,
      monto,
      porcentaje: (monto / maxGasto) * 100
    }));
  }, [rendiciones, movimientosLogisticos]);

  // Lista de clientes únicos
  const clientesUnicos = useMemo(() => {
    const set = new Set<string>();
    rendiciones.forEach(r => r.cliente && set.add(r.cliente));
    movimientosLogisticos.forEach(m => m.cliente && set.add(m.cliente));
    return Array.from(set).sort();
  }, [rendiciones, movimientosLogisticos]);

  // Tabla de detalle ordenable
  const [ordenTabla, setOrdenTabla] = useState<'fecha' | 'tipo' | 'monto'>('fecha');
  const [ordenDireccion, setOrdenDireccion] = useState<'asc' | 'desc'>('desc');

  const rendicionesOrdenadas = useMemo(() => {
    const copia = [...rendicionesFiltradas];
    copia.sort((a, b) => {
      let comparacion = 0;
      if (ordenTabla === 'fecha') {
        comparacion = a.fecha.localeCompare(b.fecha);
      } else if (ordenTabla === 'tipo') {
        comparacion = a.tipo.localeCompare(b.tipo);
      } else if (ordenTabla === 'monto') {
        comparacion = a.monto - b.monto;
      }
      return ordenDireccion === 'asc' ? comparacion : -comparacion;
    });
    return copia;
  }, [rendicionesFiltradas, ordenTabla, ordenDireccion]);

  const handleOrdenTabla = (columna: 'fecha' | 'tipo' | 'monto') => {
    if (ordenTabla === columna) {
      setOrdenDireccion(ordenDireccion === 'asc' ? 'desc' : 'asc');
    } else {
      setOrdenTabla(columna);
      setOrdenDireccion('desc');
    }
  };

  // Función para obtener el color del tipo
  const getColorTipo = (tipo: TipoRendicion) => {
    const config = TIPOS_RENDICION.find(t => t.value === tipo);
    return config?.color || 'bg-gray-500';
  };

  const getIconTipo = (tipo: TipoRendicion) => {
    const config = TIPOS_RENDICION.find(t => t.value === tipo);
    return config?.icon || '💰';
  };

  const getLabelTipo = (tipo: TipoRendicion) => {
    const config = TIPOS_RENDICION.find(t => t.value === tipo);
    return config?.label || tipo;
  };

  return (
    <div className="min-h-screen p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <button
            onClick={onBack}
            className="mb-4 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg transition-colors flex items-center gap-2"
          >
            <span>←</span> Volver
          </button>
          <h1 className="text-4xl font-black tracking-wide leading-tight">
            <span className="text-orange-500">📊</span> <span className="text-blue-800">ANÁLISIS DE COSTOS</span>
          </h1>
          <p className="text-gray-400 mt-2">Dashboard de gastos y rendiciones</p>
        </div>

        {/* Filtros */}
        <div className="flex gap-3">
          <select
            value={rangoFecha}
            onChange={(e) => setRangoFecha(e.target.value as any)}
            className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-cyan-500 outline-none"
            style={{ colorScheme: 'dark' }}
          >
            <option value="7dias">Últimos 7 días</option>
            <option value="30dias">Últimos 30 días</option>
            <option value="90dias">Últimos 90 días</option>
            <option value="mes_actual">Mes actual</option>
          </select>

          <select
            value={filtroCliente}
            onChange={(e) => setFiltroCliente(e.target.value)}
            className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-cyan-500 outline-none"
            style={{ colorScheme: 'dark' }}
          >
            <option value="">Todos los clientes</option>
            {clientesUnicos.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          <select
            value={filtroTipo}
            onChange={(e) => setFiltroTipo(e.target.value as any)}
            className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-cyan-500 outline-none"
            style={{ colorScheme: 'dark' }}
          >
            <option value="">Todos los tipos</option>
            {TIPOS_RENDICION.map(t => (
              <option key={t.value} value={t.value}>{t.icon} {t.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* KPIs de Costos */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="glass-card p-6 relative overflow-hidden group hover:scale-[1.02] transition-all">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500 to-yellow-600 opacity-10 group-hover:opacity-15 transition-all" />
          <div className="relative">
            <span className="text-4xl block mb-3">💰</span>
            <p className="text-gray-400 text-xs font-medium uppercase tracking-wider">Total Gastado</p>
            <p className="text-3xl font-bold mt-2">S/. {kpis.totalGastado.toLocaleString('es-PE', { minimumFractionDigits: 2 })}</p>
          </div>
        </div>

        <div className="glass-card p-6 relative overflow-hidden group hover:scale-[1.02] transition-all">
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-500 to-blue-600 opacity-10 group-hover:opacity-15 transition-all" />
          <div className="relative">
            <span className="text-4xl block mb-3">📊</span>
            <p className="text-gray-400 text-xs font-medium uppercase tracking-wider">Promedio Diario</p>
            <p className="text-3xl font-bold mt-2">S/. {kpis.promedioDiario.toLocaleString('es-PE', { minimumFractionDigits: 2 })}</p>
          </div>
        </div>

        <div className="glass-card p-6 relative overflow-hidden group hover:scale-[1.02] transition-all">
          <div className="absolute inset-0 bg-gradient-to-br from-red-500 to-pink-600 opacity-10 group-hover:opacity-15 transition-all" />
          <div className="relative">
            <span className="text-4xl block mb-3">🔥</span>
            <p className="text-gray-400 text-xs font-medium uppercase tracking-wider">Mayor Gasto</p>
            <p className="text-3xl font-bold mt-2">S/. {kpis.mayorGasto.toLocaleString('es-PE', { minimumFractionDigits: 2 })}</p>
          </div>
        </div>

        <div className="glass-card p-6 relative overflow-hidden group hover:scale-[1.02] transition-all">
          <div className={`absolute inset-0 bg-gradient-to-br ${kpis.cambioVsAnterior >= 0 ? 'from-orange-500 to-red-600' : 'from-green-500 to-emerald-600'} opacity-10 group-hover:opacity-15 transition-all`} />
          <div className="relative">
            <span className="text-4xl block mb-3">{kpis.cambioVsAnterior >= 0 ? '📈' : '📉'}</span>
            <p className="text-gray-400 text-xs font-medium uppercase tracking-wider">vs Mes Anterior</p>
            <p className={`text-3xl font-bold mt-2 ${kpis.cambioVsAnterior >= 0 ? 'text-orange-400' : 'text-green-400'}`}>
              {kpis.cambioVsAnterior >= 0 ? '+' : ''}{kpis.cambioVsAnterior.toFixed(1)}%
            </p>
          </div>
        </div>
      </div>

      {/* Gráficos principales */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gastos por Categoría */}
        <div className="glass-card p-6">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <span>🎯</span> Gastos por Categoría
          </h2>
          <div className="space-y-3">
            {gastosPorCategoria.map(({ tipo, monto, porcentaje }) => (
              <div key={tipo}>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm font-medium flex items-center gap-2">
                    <span>{getIconTipo(tipo)}</span>
                    {getLabelTipo(tipo)}
                  </span>
                  <span className="text-sm font-bold">
                    S/. {monto.toLocaleString('es-PE', { minimumFractionDigits: 2 })} ({porcentaje.toFixed(1)}%)
                  </span>
                </div>
                <div className="h-3 bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${getColorTipo(tipo)} transition-all duration-500`}
                    style={{ width: `${porcentaje}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Gastos por Cliente (Top 5) */}
        <div className="glass-card p-6">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <span>👥</span> Top 5 Clientes por Gasto
          </h2>
          <div className="space-y-3">
            {gastosPorCliente.length > 0 ? (
              gastosPorCliente.map(({ cliente, monto, porcentaje }) => (
                <div key={cliente}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-medium">{cliente}</span>
                    <span className="text-sm font-bold">
                      S/. {monto.toLocaleString('es-PE', { minimumFractionDigits: 2 })} ({porcentaje.toFixed(1)}%)
                    </span>
                  </div>
                  <div className="h-3 bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 to-cyan-600 transition-all duration-500"
                      style={{ width: `${porcentaje}%` }}
                    />
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-center py-8">No hay datos de gastos por cliente</p>
            )}
          </div>
        </div>
      </div>

      {/* Timeline de Gastos */}
      <div className="glass-card p-6">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <span>📈</span> Timeline de Gastos (Últimos 30 días)
        </h2>
        <div className="space-y-2">
          <div className="flex items-end gap-1 h-48">
            {timelineGastos.map(({ fecha, monto, porcentaje }) => (
              <div
                key={fecha}
                className="flex-1 group relative"
                title={`${fecha}: S/. ${monto.toFixed(2)}`}
              >
                <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap pointer-events-none z-10">
                  {new Date(fecha).toLocaleDateString('es-PE', { day: '2-digit', month: 'short' })}<br />
                  S/. {monto.toFixed(2)}
                </div>
                <div
                  className="w-full bg-gradient-to-t from-cyan-500 to-blue-600 rounded-t hover:from-cyan-400 hover:to-blue-500 transition-all cursor-pointer"
                  style={{ height: `${porcentaje}%` }}
                />
              </div>
            ))}
          </div>
          <div className="flex justify-between text-xs text-gray-500 mt-2">
            <span>{timelineGastos[0]?.fecha}</span>
            <span>{timelineGastos[timelineGastos.length - 1]?.fecha}</span>
          </div>
        </div>
      </div>

      {/* Tabla de Detalle */}
      <div className="glass-card p-6">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <span>📋</span> Detalle de Rendiciones ({rendicionesOrdenadas.length})
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-700">
                <th
                  className="text-left py-3 px-4 font-semibold cursor-pointer hover:bg-gray-800/20"
                  onClick={() => handleOrdenTabla('fecha')}
                >
                  <div className="flex items-center gap-2">
                    Fecha
                    {ordenTabla === 'fecha' && (
                      <span>{ordenDireccion === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </div>
                </th>
                <th
                  className="text-left py-3 px-4 font-semibold cursor-pointer hover:bg-gray-800/20"
                  onClick={() => handleOrdenTabla('tipo')}
                >
                  <div className="flex items-center gap-2">
                    Tipo
                    {ordenTabla === 'tipo' && (
                      <span>{ordenDireccion === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </div>
                </th>
                <th className="text-left py-3 px-4 font-semibold">Cliente</th>
                <th
                  className="text-right py-3 px-4 font-semibold cursor-pointer hover:bg-gray-800/20"
                  onClick={() => handleOrdenTabla('monto')}
                >
                  <div className="flex items-center justify-end gap-2">
                    Monto
                    {ordenTabla === 'monto' && (
                      <span>{ordenDireccion === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </div>
                </th>
                <th className="text-left py-3 px-4 font-semibold">Estado</th>
              </tr>
            </thead>
            <tbody>
              {rendicionesOrdenadas.map((r) => (
                <tr key={r.id} className="border-b border-gray-800/50 hover:bg-gray-800/20 transition-colors">
                  <td className="py-3 px-4 text-sm">
                    {new Date(r.fecha).toLocaleDateString('es-PE', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric'
                    })}
                  </td>
                  <td className="py-3 px-4">
                    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${getColorTipo(r.tipo)}`}>
                      {getIconTipo(r.tipo)} {getLabelTipo(r.tipo)}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-sm">{r.cliente || '-'}</td>
                  <td className="py-3 px-4 text-sm text-right font-bold">
                    S/. {r.monto.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-3 px-4 text-sm">
                    <span className={`px-2 py-1 rounded text-xs ${
                      r.estado === 'pagado' ? 'bg-green-500/20 text-green-400' :
                      r.estado === 'pendiente' ? 'bg-yellow-500/20 text-yellow-400' :
                      r.estado === 'rechazado' ? 'bg-red-500/20 text-red-400' :
                      'bg-gray-500/20 text-gray-400'
                    }`}>
                      {r.estado}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
