import pklsData from '../data/pkls.json';
import type { PKL } from '../types';
import { ESTADOS_PKL, TIPOS_OPERACION_PKL } from '../types';

interface PKLSummaryWidgetProps {
  onViewAll?: () => void;
  onSelectPKL?: (pklId: string) => void;
}

export function PKLSummaryWidget({ onViewAll, onSelectPKL }: PKLSummaryWidgetProps) {
  const pkls: PKL[] = pklsData as unknown as PKL[];

  // Stats
  const totalPKLs = pkls.length;
  const pklsActivos = pkls.filter(p => !['cerrado_ok', 'cerrado_parcial', 'cancelado'].includes(p.estado.actual)).length;
  const pklsCerrados = pkls.filter(p => p.estado.actual === 'cerrado_ok').length;
  const pklsEnPausa = pkls.filter(p => p.estado.actual === 'en_pausa').length;
  const costoTotal = pkls.reduce((sum, p) => sum + (p.costos?.total || 0), 0);
  const tasksTotal = pkls.reduce((sum, p) => sum + (p.tasks?.length || 0), 0);
  const tasksCompletadas = pkls.reduce((sum, p) => sum + (p.tasks?.filter(t => t.estado === 'completado').length || 0), 0);

  // Get color for estado
  const getEstadoColor = (estado: string) => {
    const estadoInfo = ESTADOS_PKL.find(e => e.value === estado);
    return estadoInfo?.color || 'bg-gray-500';
  };

  // Get label for estado
  const getEstadoLabel = (estado: string) => {
    const estadoInfo = ESTADOS_PKL.find(e => e.value === estado);
    return estadoInfo?.label || estado;
  };

  // Get tipo operacion info
  const getTipoOperacion = (tipo: string) => {
    const tipoInfo = TIPOS_OPERACION_PKL.find(t => t.value === tipo);
    return tipoInfo || { label: tipo, color: 'bg-gray-500' };
  };

  // Sort PKLs by update date (most recent first)
  const sortedPKLs = [...pkls].sort((a, b) =>
    new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
  );

  // Get next pending task for a PKL
  const getNextTask = (pkl: PKL) => {
    const pendingTask = pkl.tasks?.find(t => t.estado === 'pendiente' || t.estado === 'en_progreso');
    return pendingTask?.nombre || null;
  };

  return (
    <div className="glass-card p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
            <span className="text-xl">📋</span>
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">PKL Logistica</h2>
            <p className="text-xs text-gray-400">Primary Key Logistica - Trazabilidad</p>
          </div>
        </div>
        {onViewAll && (
          <button
            onClick={onViewAll}
            className="px-3 py-1.5 text-sm bg-cyan-600/20 hover:bg-cyan-600/40 border border-cyan-500/30 hover:border-cyan-400/50 rounded-lg text-cyan-300 hover:text-white transition-all"
          >
            Ver todos
          </button>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-gray-800/50 rounded-xl p-3 border border-gray-700/50">
          <p className="text-xs text-gray-400 mb-1">Total PKLs</p>
          <p className="text-2xl font-bold text-white">{totalPKLs}</p>
        </div>
        <div className="bg-gray-800/50 rounded-xl p-3 border border-gray-700/50">
          <p className="text-xs text-gray-400 mb-1">Activos</p>
          <p className="text-2xl font-bold text-cyan-400">{pklsActivos}</p>
        </div>
        <div className="bg-gray-800/50 rounded-xl p-3 border border-gray-700/50">
          <p className="text-xs text-gray-400 mb-1">Cerrados OK</p>
          <p className="text-2xl font-bold text-emerald-400">{pklsCerrados}</p>
        </div>
        <div className="bg-gray-800/50 rounded-xl p-3 border border-gray-700/50">
          <p className="text-xs text-gray-400 mb-1">Costo Total</p>
          <p className="text-xl font-bold text-amber-400">S/{costoTotal.toLocaleString()}</p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-6">
        <div className="flex items-center justify-between text-xs text-gray-400 mb-2">
          <span>Progreso Tasks ({tasksCompletadas}/{tasksTotal})</span>
          <span>{tasksTotal > 0 ? Math.round((tasksCompletadas / tasksTotal) * 100) : 0}%</span>
        </div>
        <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-cyan-500 to-emerald-500 rounded-full transition-all duration-500"
            style={{ width: `${tasksTotal > 0 ? (tasksCompletadas / tasksTotal) * 100 : 0}%` }}
          />
        </div>
      </div>

      {/* PKL List */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-gray-300 mb-3">PKLs Recientes</h3>
        {sortedPKLs.map((pkl) => {
          const tipoOp = getTipoOperacion(pkl.clasificacion.tipo_operacion);
          const nextTask = getNextTask(pkl);
          const tasksCount = pkl.tasks?.length || 0;
          const completedCount = pkl.tasks?.filter(t => t.estado === 'completado').length || 0;

          return (
            <div
              key={pkl.pkl_id}
              onClick={() => onSelectPKL?.(pkl.pkl_id)}
              className="group p-4 bg-gray-800/40 hover:bg-gray-800/70 border border-gray-700/50 hover:border-cyan-500/30 rounded-xl cursor-pointer transition-all"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  {/* PKL ID + Cliente */}
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-xs text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded">
                      {pkl.pkl_id}
                    </span>
                    <span className="font-semibold text-white truncate">
                      {pkl.cliente.nombre}
                    </span>
                    {pkl.cliente.proyecto && (
                      <span className="text-xs text-gray-500">/ {pkl.cliente.proyecto}</span>
                    )}
                  </div>

                  {/* Descripcion */}
                  <p className="text-sm text-gray-400 mb-2 line-clamp-1">
                    {pkl.origen.descripcion_inicial}
                  </p>

                  {/* Tags */}
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Tipo Operacion */}
                    <span className={`text-xs px-2 py-0.5 rounded ${tipoOp.color} text-white`}>
                      {tipoOp.label}
                    </span>

                    {/* Estado */}
                    <span className={`text-xs px-2 py-0.5 rounded ${getEstadoColor(pkl.estado.actual)} text-white`}>
                      {getEstadoLabel(pkl.estado.actual)}
                    </span>

                    {/* Tasks Progress */}
                    <span className="text-xs text-gray-500">
                      {completedCount}/{tasksCount} tasks
                    </span>

                    {/* Costo */}
                    {(pkl.costos?.total ?? 0) > 0 && (
                      <span className="text-xs text-amber-400">
                        S/{(pkl.costos?.total ?? 0).toLocaleString()}
                      </span>
                    )}
                  </div>

                  {/* Next Task */}
                  {nextTask && (
                    <div className="mt-2 flex items-center gap-1 text-xs text-orange-400">
                      <span>Pendiente:</span>
                      <span className="font-medium">{nextTask}</span>
                    </div>
                  )}
                </div>

                {/* Arrow */}
                <div className="text-gray-600 group-hover:text-cyan-400 transition-colors">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* En Pausa Alert */}
      {pklsEnPausa > 0 && (
        <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-xl">
          <div className="flex items-center gap-2 text-yellow-400 text-sm">
            <span>⚠️</span>
            <span>{pklsEnPausa} PKL{pklsEnPausa > 1 ? 's' : ''} en pausa - requiere atencion</span>
          </div>
        </div>
      )}
    </div>
  );
}
