import { useState, useMemo, useEffect } from 'react';
import type { PKL, EstadoPKL, TipoOperacionPKL, TipoTaskPKL } from '../types';
import { ESTADOS_PKL, TIPOS_OPERACION_PKL, TIPOS_TASK_PKL } from '../types';
import { useDatabase } from '../context/DatabaseContext';

// Helper to get estado config
const getEstadoConfig = (estado: EstadoPKL) => {
    return ESTADOS_PKL.find(e => e.value === estado) || ESTADOS_PKL[0];
};

// Helper to get tipo operacion config
const getTipoOperacionConfig = (tipo: TipoOperacionPKL) => {
    return TIPOS_OPERACION_PKL.find(t => t.value === tipo) || TIPOS_OPERACION_PKL[0];
};

// Helper to get task type config
const getTaskTypeConfig = (tipo: string) => {
    return TIPOS_TASK_PKL.find(t => t.value === tipo);
};

interface PKLPageProps {
    initialSelectedPKLId?: string | null;
}

export default function PKLPage({ initialSelectedPKLId }: PKLPageProps) {
    const { pkls, updatePKL, updatePKLTask, createPKLTask, deletePKLTask, deletePKL } = useDatabase();
    const [selectedPKLId, setSelectedPKLId] = useState<string | null>(initialSelectedPKLId || null);
    const [filterEstado, setFilterEstado] = useState<EstadoPKL | 'todos'>('todos');
    const [filterTipo, setFilterTipo] = useState<TipoOperacionPKL | 'todos'>('todos');
    const [searchTerm, setSearchTerm] = useState('');

    // Update selection when initialSelectedPKLId changes (from navigation)
    useEffect(() => {
        if (initialSelectedPKLId) {
            setSelectedPKLId(initialSelectedPKLId);
        }
    }, [initialSelectedPKLId]);

    // Get selected PKL from state (so it updates when edited)
    const selectedPKL = selectedPKLId ? pkls.find(p => p.pkl_id === selectedPKLId) || null : null;

    // Filter PKLs
    const filteredPKLs = useMemo(() => {
        return pkls.filter(pkl => {
            // Estado filter
            if (filterEstado !== 'todos' && pkl.estado.actual !== filterEstado) return false;
            // Tipo filter
            if (filterTipo !== 'todos' && pkl.clasificacion.tipo_operacion !== filterTipo) return false;
            // Search
            if (searchTerm) {
                const search = searchTerm.toLowerCase();
                return (
                    pkl.pkl_id.toLowerCase().includes(search) ||
                    pkl.cliente.nombre.toLowerCase().includes(search) ||
                    pkl.origen.descripcion_inicial.toLowerCase().includes(search)
                );
            }
            return true;
        });
    }, [pkls, filterEstado, filterTipo, searchTerm]);

    // Stats
    const stats = useMemo(() => {
        const total = pkls.length;
        const cerrados = pkls.filter(p => p.estado.actual === 'cerrado_ok' || p.estado.actual === 'cerrado_parcial').length;
        const enCurso = pkls.filter(p => ['recibido', 'en_produccion', 'en_curso'].includes(p.estado.actual)).length;
        const enPausa = pkls.filter(p => p.estado.actual === 'en_pausa').length;
        const totalCosto = pkls.reduce((sum, p) => sum + (p.costos.total || 0), 0);
        const totalTasks = pkls.reduce((sum, p) => sum + p.tasks.length, 0);
        return { total, cerrados, enCurso, enPausa, totalCosto, totalTasks };
    }, [pkls]);

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white">PKL - Primary Key Logistica</h1>
                    <p className="text-gray-400 text-sm mt-1">
                        Trazabilidad end-to-end de requerimientos logisticos
                    </p>
                </div>
                <button className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg transition-colors">
                    + Nuevo PKL
                </button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                <div className="bg-gray-800/50 backdrop-blur border border-gray-700/50 rounded-xl p-4">
                    <div className="text-2xl font-bold text-white">{stats.total}</div>
                    <div className="text-gray-400 text-sm">Total PKLs</div>
                </div>
                <div className="bg-gray-800/50 backdrop-blur border border-gray-700/50 rounded-xl p-4">
                    <div className="text-2xl font-bold text-green-400">{stats.cerrados}</div>
                    <div className="text-gray-400 text-sm">Cerrados</div>
                </div>
                <div className="bg-gray-800/50 backdrop-blur border border-gray-700/50 rounded-xl p-4">
                    <div className="text-2xl font-bold text-cyan-400">{stats.enCurso}</div>
                    <div className="text-gray-400 text-sm">En Curso</div>
                </div>
                <div className="bg-gray-800/50 backdrop-blur border border-gray-700/50 rounded-xl p-4">
                    <div className="text-2xl font-bold text-yellow-400">{stats.enPausa}</div>
                    <div className="text-gray-400 text-sm">En Pausa</div>
                </div>
                <div className="bg-gray-800/50 backdrop-blur border border-gray-700/50 rounded-xl p-4">
                    <div className="text-2xl font-bold text-white">S/ {stats.totalCosto.toFixed(2)}</div>
                    <div className="text-gray-400 text-sm">Costo Total</div>
                </div>
                <div className="bg-gray-800/50 backdrop-blur border border-gray-700/50 rounded-xl p-4">
                    <div className="text-2xl font-bold text-purple-400">{stats.totalTasks}</div>
                    <div className="text-gray-400 text-sm">Tasks Ejecutados</div>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-4 items-center">
                <input
                    type="text"
                    placeholder="Buscar por ID, cliente o descripcion..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="flex-1 min-w-[200px] px-4 py-2 bg-gray-800/50 border border-gray-700/50 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500"
                />
                <select
                    value={filterEstado}
                    onChange={e => setFilterEstado(e.target.value as EstadoPKL | 'todos')}
                    className="px-4 py-2 bg-gray-800/50 border border-gray-700/50 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                >
                    <option value="todos">Todos los estados</option>
                    {ESTADOS_PKL.map(e => (
                        <option key={e.value} value={e.value}>{e.label}</option>
                    ))}
                </select>
                <select
                    value={filterTipo}
                    onChange={e => setFilterTipo(e.target.value as TipoOperacionPKL | 'todos')}
                    className="px-4 py-2 bg-gray-800/50 border border-gray-700/50 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                >
                    <option value="todos">Todos los tipos</option>
                    {TIPOS_OPERACION_PKL.map(t => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                </select>
            </div>

            {/* Main Content */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* PKL List */}
                <div className="lg:col-span-1 space-y-3">
                    <h2 className="text-lg font-semibold text-white mb-4">
                        Lista de PKLs ({filteredPKLs.length})
                    </h2>
                    {filteredPKLs.length === 0 ? (
                        <div className="text-gray-500 text-center py-8">
                            No se encontraron PKLs
                        </div>
                    ) : (
                        filteredPKLs.map(pkl => {
                            const estadoConfig = getEstadoConfig(pkl.estado.actual);
                            const tipoConfig = getTipoOperacionConfig(pkl.clasificacion.tipo_operacion);
                            const isSelected = selectedPKL?.pkl_id === pkl.pkl_id;

                            return (
                                <div
                                    key={pkl.pkl_id}
                                    onClick={() => setSelectedPKLId(pkl.pkl_id)}
                                    className={`p-4 rounded-xl border cursor-pointer transition-all ${
                                        isSelected
                                            ? 'bg-cyan-900/30 border-cyan-500'
                                            : 'bg-gray-800/50 border-gray-700/50 hover:border-gray-600'
                                    }`}
                                >
                                    <div className="flex items-start justify-between mb-2">
                                        <span className="font-mono text-cyan-400 text-sm">{pkl.pkl_id}</span>
                                        <span className={`px-2 py-0.5 text-xs rounded-full ${estadoConfig.color} text-black font-semibold`}>
                                            {estadoConfig.label}
                                        </span>
                                    </div>
                                    <div className="font-medium text-white mb-1">{pkl.cliente.nombre}</div>
                                    {pkl.cliente.proyecto && (
                                        <div className="text-gray-400 text-sm mb-2">
                                            Proyecto: {pkl.cliente.proyecto}
                                        </div>
                                    )}
                                    <div className="text-gray-500 text-sm line-clamp-2 mb-3">
                                        {pkl.origen.descripcion_inicial}
                                    </div>
                                    <div className="flex items-center justify-between text-xs">
                                        <span className={`px-2 py-0.5 rounded ${tipoConfig.color} !text-white`}>
                                            {tipoConfig.label}
                                        </span>
                                        <span className="text-gray-500">
                                            {pkl.tasks.length} tasks | S/ {(pkl.costos.total || 0).toFixed(2)}
                                        </span>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                {/* PKL Detail */}
                <div className="lg:col-span-2">
                    {selectedPKL ? (
                        <PKLDetail
                            pkl={selectedPKL}
                            onUpdate={(changes) => updatePKL(selectedPKL.pkl_id, changes)}
                            onUpdateTask={updatePKLTask}
                            onCreateTask={(task) => createPKLTask(selectedPKL.pkl_id, task)}
                            onDeleteTask={(taskId) => deletePKLTask(selectedPKL.pkl_id, taskId)}
                            onDelete={async () => {
                                if (confirm(`¿Eliminar PKL ${selectedPKL.pkl_id}?\n\nEsta acción no se puede deshacer.`)) {
                                    await deletePKL(selectedPKL.pkl_id);
                                    setSelectedPKLId(null);
                                }
                            }}
                        />
                    ) : (
                        <div className="bg-gray-800/50 backdrop-blur border border-gray-700/50 rounded-xl p-8 text-center">
                            <div className="text-gray-500 text-lg mb-2">Selecciona un PKL</div>
                            <div className="text-gray-600 text-sm">
                                Haz clic en un PKL de la lista para ver sus detalles
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// Type for task update function
type UpdateTaskFn = (pklId: string, taskId: string, changes: Partial<import('../types').TaskPKL>) => void;
type UpdatePKLFn = (changes: Partial<PKL>) => void;
type CreateTaskFn = (task: Omit<import('../types').TaskPKL, 'task_id'>) => void;
type DeleteTaskFn = (taskId: string) => void;

// PKL Detail Component
function PKLDetail({ pkl, onUpdate, onUpdateTask, onCreateTask, onDeleteTask, onDelete }: {
    pkl: PKL;
    onUpdate: UpdatePKLFn;
    onUpdateTask: UpdateTaskFn;
    onCreateTask: CreateTaskFn;
    onDeleteTask: DeleteTaskFn;
    onDelete: () => void;
}) {
    const [activeTab, setActiveTab] = useState<'overview' | 'tasks' | 'costos' | 'eventos'>('overview');
    const [editingField, setEditingField] = useState<string | null>(null);
    const [editValue, setEditValue] = useState('');

    const estadoConfig = getEstadoConfig(pkl.estado.actual);
    const tipoConfig = getTipoOperacionConfig(pkl.clasificacion.tipo_operacion);

    const handleEditStart = (field: string, value: string) => {
        setEditingField(field);
        setEditValue(value);
    };

    const handleEditSave = () => {
        if (!editingField) return;

        switch (editingField) {
            case 'cliente.nombre':
                onUpdate({ cliente: { ...pkl.cliente, nombre: editValue } } as any);
                break;
            case 'cliente.proyecto':
                onUpdate({ cliente: { ...pkl.cliente, proyecto: editValue || null } } as any);
                break;
            case 'descripcion':
                onUpdate({ origen: { ...pkl.origen, descripcion_inicial: editValue } } as any);
                break;
            case 'solicitado_por':
                onUpdate({ origen: { ...pkl.origen, solicitado_por: editValue } } as any);
                break;
            case 'observaciones':
                onUpdate({ observaciones: editValue } as any);
                break;
        }
        setEditingField(null);
        setEditValue('');
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleEditSave();
        }
        if (e.key === 'Escape') {
            setEditingField(null);
            setEditValue('');
        }
    };

    return (
        <div className="bg-gray-800/50 backdrop-blur border border-gray-700/50 rounded-xl overflow-hidden">
            {/* Header */}
            <div className="p-6 border-b border-gray-700/50">
                <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                            <span className="font-mono text-2xl text-cyan-400">{pkl.pkl_id}</span>
                            {/* Estado - Dropdown editable */}
                            <div className="relative group">
                                <span className={`px-3 py-1 rounded-full ${estadoConfig.color} text-black font-semibold text-sm cursor-pointer hover:ring-2 hover:ring-white/30`}>
                                    {estadoConfig.label}
                                </span>
                                <div className="absolute left-0 top-full mt-1 bg-gray-900 border border-gray-700 rounded-lg shadow-xl z-50 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all min-w-[140px]">
                                    {ESTADOS_PKL.map(estado => (
                                        <button
                                            key={estado.value}
                                            onClick={() => onUpdate({ estado: { actual: estado.value } } as any)}
                                            className={`block w-full text-left px-3 py-2 text-xs hover:bg-gray-800 first:rounded-t-lg last:rounded-b-lg ${estado.color} text-black font-medium`}
                                        >
                                            {estado.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                        {/* Cliente nombre - Editable */}
                        {editingField === 'cliente.nombre' ? (
                            <input
                                autoFocus
                                value={editValue}
                                onChange={e => setEditValue(e.target.value)}
                                onBlur={handleEditSave}
                                onKeyDown={handleKeyDown}
                                className="text-xl font-bold bg-gray-900 border border-cyan-500 rounded px-2 py-1 text-white outline-none w-full max-w-md"
                            />
                        ) : (
                            <h2
                                onClick={() => handleEditStart('cliente.nombre', pkl.cliente.nombre)}
                                className="text-xl font-bold text-white cursor-pointer hover:text-cyan-400 transition-colors"
                                title="Click para editar"
                            >
                                {pkl.cliente.nombre}
                            </h2>
                        )}
                        {/* Proyecto - Editable */}
                        {editingField === 'cliente.proyecto' ? (
                            <input
                                autoFocus
                                value={editValue}
                                onChange={e => setEditValue(e.target.value)}
                                onBlur={handleEditSave}
                                onKeyDown={handleKeyDown}
                                placeholder="Nombre del proyecto"
                                className="text-gray-400 bg-gray-900 border border-cyan-500 rounded px-2 py-1 outline-none w-full max-w-md mt-1"
                            />
                        ) : (
                            <div
                                onClick={() => handleEditStart('cliente.proyecto', pkl.cliente.proyecto || '')}
                                className="text-gray-400 cursor-pointer hover:text-cyan-400 transition-colors"
                                title="Click para editar proyecto"
                            >
                                {pkl.cliente.proyecto ? `Proyecto: ${pkl.cliente.proyecto}` : <span className="text-gray-600 italic">+ Agregar proyecto</span>}
                            </div>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        {/* Tipo operacion - Dropdown editable */}
                        <div className="relative group">
                            <span className={`px-3 py-1 rounded ${tipoConfig.color} !text-white text-sm cursor-pointer hover:ring-2 hover:ring-white/30`}>
                                {tipoConfig.label}
                            </span>
                            <div className="absolute right-0 top-full mt-1 bg-gray-900 border border-gray-700 rounded-lg shadow-xl z-50 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all min-w-[180px]">
                                {TIPOS_OPERACION_PKL.map(tipo => (
                                    <button
                                        key={tipo.value}
                                        onClick={() => onUpdate({ clasificacion: { ...pkl.clasificacion, tipo_operacion: tipo.value } } as any)}
                                        className={`block w-full text-left px-3 py-2 text-xs hover:bg-gray-800 first:rounded-t-lg last:rounded-b-lg ${tipo.color} !text-white`}
                                    >
                                        {tipo.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <button
                            onClick={onDelete}
                            className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                            title="Eliminar PKL"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                        </button>
                    </div>
                </div>
                {/* Descripción - Editable */}
                {editingField === 'descripcion' ? (
                    <textarea
                        autoFocus
                        value={editValue}
                        onChange={e => setEditValue(e.target.value)}
                        onBlur={handleEditSave}
                        onKeyDown={handleKeyDown}
                        rows={2}
                        className="text-gray-300 bg-gray-900 border border-cyan-500 rounded px-2 py-1 outline-none w-full resize-none"
                    />
                ) : (
                    <p
                        onClick={() => handleEditStart('descripcion', pkl.origen.descripcion_inicial)}
                        className="text-gray-300 cursor-pointer hover:text-cyan-400 transition-colors"
                        title="Click para editar descripción"
                    >
                        {pkl.origen.descripcion_inicial}
                    </p>
                )}
                <div className="mt-3 flex flex-wrap gap-4 text-sm text-gray-400">
                    {/* Solicitado por - Editable */}
                    {editingField === 'solicitado_por' ? (
                        <input
                            autoFocus
                            value={editValue}
                            onChange={e => setEditValue(e.target.value)}
                            onBlur={handleEditSave}
                            onKeyDown={handleKeyDown}
                            className="bg-gray-900 border border-cyan-500 rounded px-2 py-0.5 outline-none text-sm w-32"
                        />
                    ) : (
                        <span
                            onClick={() => handleEditStart('solicitado_por', pkl.origen.solicitado_por || '')}
                            className="cursor-pointer hover:text-cyan-400 transition-colors"
                            title="Click para editar"
                        >
                            Solicitado por: {pkl.origen.solicitado_por || 'N/A'}
                        </span>
                    )}
                    <span>Canal: {pkl.origen.canal}</span>
                    <span>Fecha: {pkl.origen.fecha_solicitud}</span>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 p-2 bg-gray-900/50 border-b border-gray-700/50">
                {(['overview', 'tasks', 'costos', 'eventos'] as const).map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                            activeTab === tab
                                ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-900/30'
                                : 'bg-gray-800/50 text-gray-400 hover:bg-gray-700/50 hover:text-white border border-gray-700/50'
                        }`}
                    >
                        {tab === 'overview' && 'Resumen'}
                        {tab === 'tasks' && `Tasks (${pkl.tasks.length})`}
                        {tab === 'costos' && 'Costos'}
                        {tab === 'eventos' && `Eventos (${pkl.eventos_externos.length})`}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            <div className="p-6">
                {activeTab === 'overview' && <OverviewTab pkl={pkl} onUpdate={onUpdate} />}
                {activeTab === 'tasks' && <TasksTab pkl={pkl} onUpdateTask={onUpdateTask} onCreateTask={onCreateTask} onDeleteTask={onDeleteTask} />}
                {activeTab === 'costos' && <CostosTab pkl={pkl} />}
                {activeTab === 'eventos' && <EventosTab pkl={pkl} />}
            </div>
        </div>
    );
}

// Overview Tab
function OverviewTab({ pkl, onUpdate }: { pkl: PKL; onUpdate: UpdatePKLFn }) {
    const [editingObs, setEditingObs] = useState(false);
    const [obsValue, setObsValue] = useState(pkl.observaciones || '');

    const tasksCompletados = pkl.tasks.filter(t => t.estado === 'completado').length;
    const tasksTotal = pkl.tasks.length;
    const progreso = tasksTotal > 0 ? (tasksCompletados / tasksTotal) * 100 : 0;

    const handleSaveObs = () => {
        onUpdate({ observaciones: obsValue } as any);
        setEditingObs(false);
    };

    return (
        <div className="space-y-6">
            {/* Progress */}
            <div>
                <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-400">Progreso</span>
                    <span className="text-white">{tasksCompletados}/{tasksTotal}</span>
                </div>
                <div className="h-3 bg-gray-700 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-gradient-to-r from-cyan-500 to-emerald-500 transition-all duration-500"
                        style={{ width: `${progreso}%` }}
                    />
                </div>
            </div>

            {/* Info Grid */}
            <div className="grid grid-cols-2 gap-4">
                {/* Productos */}
                <div className="bg-gray-900/50 rounded-lg p-4">
                    <h4 className="text-gray-400 text-sm mb-3">Productos</h4>
                    {pkl.productos.length === 0 ? (
                        <div className="text-gray-600 italic text-sm">Sin productos</div>
                    ) : pkl.productos.map(prod => (
                        <div key={prod.producto_id} className="mb-2">
                            <div className="text-white font-medium">{prod.tipo}</div>
                            <div className="text-gray-400 text-sm">
                                {prod.cantidad && `Cant: ${prod.cantidad} - `}{prod.descripcion}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Proveedores */}
                <div className="bg-gray-900/50 rounded-lg p-4">
                    <h4 className="text-gray-400 text-sm mb-3">Proveedores</h4>
                    {pkl.proveedores.length === 0 ? (
                        <div className="text-gray-600 italic text-sm">Sin proveedores</div>
                    ) : pkl.proveedores.map(prov => (
                        <div key={prov.proveedor_id} className="mb-2">
                            <div className="text-white font-medium">{prov.nombre}</div>
                            <div className="text-gray-400 text-sm">
                                {prov.servicio} {prov.ubicacion && `| ${prov.ubicacion}`}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Estado History */}
                <div className="bg-gray-900/50 rounded-lg p-4">
                    <h4 className="text-gray-400 text-sm mb-3">Historial de Estados</h4>
                    <div className="space-y-2">
                        {pkl.estado.historial.map((h, i) => {
                            const config = getEstadoConfig(h.estado);
                            return (
                                <div key={i} className="flex items-center gap-2 text-sm">
                                    <span className={`w-2 h-2 rounded-full ${config.color}`} />
                                    <span className="text-white">{config.label}</span>
                                    <span className="text-gray-500">{h.fecha}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Cierre */}
                <div className="bg-gray-900/50 rounded-lg p-4">
                    <h4 className="text-gray-400 text-sm mb-3">Cierre</h4>
                    {pkl.cierre.estado_final ? (
                        <>
                            <div className="text-white mb-2">
                                Estado: {getEstadoConfig(pkl.cierre.estado_final).label}
                            </div>
                            <div className="text-gray-400 text-sm">
                                Fecha: {pkl.cierre.fecha_cierre || 'N/A'}
                            </div>
                            {pkl.cierre.evidencias.length > 0 && (
                                <div className="text-gray-400 text-sm mt-2">
                                    Evidencias: {pkl.cierre.evidencias.map(e => e.tipo).join(', ')}
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="text-yellow-400">Pendiente de cierre</div>
                    )}
                </div>
            </div>

            {/* Observaciones - Editable */}
            <div className="bg-gray-900/50 rounded-lg p-4">
                <h4 className="text-gray-400 text-sm mb-2">Observaciones</h4>
                {editingObs ? (
                    <div className="space-y-2">
                        <textarea
                            autoFocus
                            value={obsValue}
                            onChange={e => setObsValue(e.target.value)}
                            rows={3}
                            className="w-full bg-gray-800 border border-cyan-500 rounded px-3 py-2 text-gray-300 outline-none resize-none"
                            placeholder="Agregar observaciones..."
                        />
                        <div className="flex gap-2">
                            <button
                                onClick={handleSaveObs}
                                className="px-3 py-1 bg-cyan-600 hover:bg-cyan-700 text-white text-sm rounded transition-colors"
                            >
                                Guardar
                            </button>
                            <button
                                onClick={() => { setEditingObs(false); setObsValue(pkl.observaciones || ''); }}
                                className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded transition-colors"
                            >
                                Cancelar
                            </button>
                        </div>
                    </div>
                ) : (
                    <p
                        onClick={() => setEditingObs(true)}
                        className="text-gray-300 cursor-pointer hover:text-cyan-400 transition-colors min-h-[24px]"
                        title="Click para editar"
                    >
                        {pkl.observaciones || <span className="text-gray-600 italic">+ Agregar observaciones</span>}
                    </p>
                )}
            </div>

            {/* Riesgos */}
            {pkl.riesgos_identificados && pkl.riesgos_identificados.length > 0 && (
                <div className="bg-orange-900/20 border border-orange-500/30 rounded-lg p-4">
                    <h4 className="text-orange-400 text-sm mb-3">Riesgos Identificados</h4>
                    {pkl.riesgos_identificados.map((r, i) => (
                        <div key={i} className="mb-2">
                            <div className="text-white">{r.descripcion}</div>
                            {r.mitigacion && (
                                <div className="text-gray-400 text-sm">Mitigacion: {r.mitigacion}</div>
                            )}
                            {r.costo_referencia && (
                                <div className="text-gray-500 text-sm">Ref: {r.costo_referencia}</div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

// Task estado options
const TASK_ESTADOS = [
    { value: 'pendiente', label: 'Pendiente', color: 'text-gray-400' },
    { value: 'en_progreso', label: 'En Progreso', color: 'text-blue-400' },
    { value: 'completado', label: 'Completado', color: 'text-emerald-400' },
    { value: 'cancelado', label: 'Cancelado', color: 'text-red-400' },
] as const;

// Tasks Tab
function TasksTab({ pkl, onUpdateTask, onCreateTask, onDeleteTask }: { pkl: PKL; onUpdateTask: UpdateTaskFn; onCreateTask: CreateTaskFn; onDeleteTask: DeleteTaskFn }) {
    const [editingTask, setEditingTask] = useState<string | null>(null);
    const [editingField, setEditingField] = useState<string | null>(null);
    const [editValue, setEditValue] = useState('');
    const [showNewTask, setShowNewTask] = useState(false);
    const [newTaskName, setNewTaskName] = useState('');
    const [newTaskDesc, setNewTaskDesc] = useState('');
    const [newTaskTipo, setNewTaskTipo] = useState<TipoTaskPKL>('coordinacion_proveedor');
    const [newTaskResponsable, setNewTaskResponsable] = useState('Huber');

    const handleCreateTask = () => {
        if (!newTaskName.trim()) return;
        onCreateTask({
            orden: pkl.tasks.length + 1,
            nombre: newTaskName.trim(),
            descripcion: newTaskDesc.trim() || undefined,
            tipo: newTaskTipo,
            responsable: newTaskResponsable,
            estado: 'pendiente',
            es_happy_path: false,
        });
        setNewTaskName('');
        setNewTaskDesc('');
        setNewTaskTipo('coordinacion_proveedor');
        setShowNewTask(false);
    };

    const handleEditStart = (taskId: string, field: string, value: string) => {
        setEditingTask(taskId);
        setEditingField(field);
        setEditValue(value);
    };

    const handleEditSave = (taskId: string) => {
        if (editingField === 'nombre') {
            onUpdateTask(pkl.pkl_id, taskId, { nombre: editValue });
        } else if (editingField === 'descripcion') {
            onUpdateTask(pkl.pkl_id, taskId, { descripcion: editValue });
        } else if (editingField === 'responsable') {
            onUpdateTask(pkl.pkl_id, taskId, { responsable: editValue });
        } else if (editingField === 'duracion_min') {
            onUpdateTask(pkl.pkl_id, taskId, { duracion_min: parseInt(editValue) || undefined });
        }
        setEditingTask(null);
        setEditingField(null);
    };

    const handleEstadoChange = (taskId: string, newEstado: 'pendiente' | 'en_progreso' | 'completado' | 'cancelado') => {
        onUpdateTask(pkl.pkl_id, taskId, { estado: newEstado });
    };

    const handleTipoChange = (taskId: string, newTipo: TipoTaskPKL) => {
        onUpdateTask(pkl.pkl_id, taskId, { tipo: newTipo });
    };

    return (
        <div className="space-y-0">
            {/* New Task Form */}
            {showNewTask ? (
                <div className="mb-4 p-4 bg-gray-800 rounded-lg border border-cyan-500/50 shadow-lg">
                    <h4 className="text-white font-semibold mb-3">Nuevo Task</h4>
                    <div className="space-y-3">
                        <div>
                            <label className="block text-gray-400 text-xs mb-1">Nombre *</label>
                            <input
                                autoFocus
                                value={newTaskName}
                                onChange={e => setNewTaskName(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter') handleCreateTask(); if (e.key === 'Escape') setShowNewTask(false); }}
                                placeholder="Ej: Coordinar con proveedor"
                                className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white placeholder-gray-500 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                            />
                        </div>
                        <div>
                            <label className="block text-gray-400 text-xs mb-1">Descripción</label>
                            <textarea
                                value={newTaskDesc}
                                onChange={e => setNewTaskDesc(e.target.value)}
                                placeholder="Descripción opcional..."
                                rows={2}
                                className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white placeholder-gray-500 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 resize-none"
                            />
                        </div>
                        <div className="flex gap-3">
                            <div className="flex-1">
                                <label className="block text-gray-400 text-xs mb-1">Tipo</label>
                                <select
                                    value={newTaskTipo}
                                    onChange={e => setNewTaskTipo(e.target.value as TipoTaskPKL)}
                                    className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white outline-none focus:border-cyan-500"
                                >
                                    {TIPOS_TASK_PKL.map(t => (
                                        <option key={t.value} value={t.value}>{t.label}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex-1">
                                <label className="block text-gray-400 text-xs mb-1">Responsable</label>
                                <input
                                    value={newTaskResponsable}
                                    onChange={e => setNewTaskResponsable(e.target.value)}
                                    placeholder="Nombre"
                                    className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white placeholder-gray-500 outline-none focus:border-cyan-500"
                                />
                            </div>
                        </div>
                        <div className="flex gap-2 pt-2">
                            <button
                                onClick={handleCreateTask}
                                disabled={!newTaskName.trim()}
                                className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium rounded transition-colors"
                            >
                                Crear Task
                            </button>
                            <button
                                onClick={() => setShowNewTask(false)}
                                className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded transition-colors"
                            >
                                Cancelar
                            </button>
                        </div>
                    </div>
                </div>
            ) : (
                <button
                    onClick={() => setShowNewTask(true)}
                    className="mb-4 w-full py-3 border-2 border-dashed border-gray-700 hover:border-cyan-500 rounded-lg text-gray-500 hover:text-cyan-400 transition-colors flex items-center justify-center gap-2"
                >
                    <span className="text-xl">+</span> Agregar Task
                </button>
            )}

            {/* Empty state */}
            {pkl.tasks.length === 0 && !showNewTask && (
                <div className="text-center py-8 text-gray-500">
                    <div className="text-4xl mb-2">📋</div>
                    <p>No hay tasks en este PKL</p>
                    <p className="text-sm text-gray-600">Haz clic en "+ Agregar Task" para crear uno</p>
                </div>
            )}

            {pkl.tasks.map((task, index) => {
                const typeConfig = getTaskTypeConfig(task.tipo);
                const isCompleted = task.estado === 'completado';
                const isLast = index === pkl.tasks.length - 1;
                const isEditing = editingTask === task.task_id;

                return (
                    <div
                        key={task.task_id}
                        className={`relative flex items-start gap-4 py-4 group/task ${!isLast ? 'border-b border-gray-800/50' : ''}`}
                    >
                        {/* Timeline */}
                        <div className="flex flex-col items-center">
                            {/* Number circle - clickable to toggle estado */}
                            <button
                                onClick={() => {
                                    const estados: ('pendiente' | 'en_progreso' | 'completado' | 'cancelado')[] = ['pendiente', 'en_progreso', 'completado'];
                                    const currentIdx = estados.indexOf(task.estado as any);
                                    const nextIdx = (currentIdx + 1) % estados.length;
                                    handleEstadoChange(task.task_id, estados[nextIdx]);
                                }}
                                title="Click para cambiar estado"
                                className={`relative z-10 w-8 h-8 flex items-center justify-center rounded-full text-sm font-bold border-2 transition-all hover:scale-110 ${
                                    isCompleted
                                        ? 'bg-emerald-500 border-emerald-400 text-white shadow-lg shadow-emerald-500/30'
                                        : task.estado === 'en_progreso'
                                        ? 'bg-blue-500 border-blue-400 text-white shadow-lg shadow-blue-500/30'
                                        : 'bg-gray-800 border-gray-600 text-gray-400 hover:border-gray-500'
                                }`}
                            >
                                {isCompleted ? '✓' : task.orden}
                            </button>
                            {/* Connecting line */}
                            {!isLast && (
                                <div className={`w-0.5 flex-1 min-h-[40px] -mb-4 ${
                                    isCompleted ? 'bg-gradient-to-b from-emerald-500 to-emerald-500/20' : 'bg-gray-700/50'
                                }`} />
                            )}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0 pb-2">
                            {/* Nombre - editable */}
                            <div className="flex items-center gap-2 mb-1">
                                {isEditing && editingField === 'nombre' ? (
                                    <input
                                        autoFocus
                                        value={editValue}
                                        onChange={e => setEditValue(e.target.value)}
                                        onBlur={() => handleEditSave(task.task_id)}
                                        onKeyDown={e => {
                                            if (e.key === 'Enter') handleEditSave(task.task_id);
                                            if (e.key === 'Escape') { setEditingTask(null); setEditingField(null); }
                                        }}
                                        className="bg-gray-900 border border-cyan-500 rounded px-2 py-1 text-white font-semibold outline-none w-full"
                                    />
                                ) : (
                                    <span
                                        onClick={() => handleEditStart(task.task_id, 'nombre', task.nombre)}
                                        className={`font-semibold cursor-pointer hover:text-cyan-400 transition-colors ${isCompleted ? 'text-gray-300' : 'text-white'}`}
                                        title="Click para editar"
                                    >
                                        {task.nombre}
                                    </span>
                                )}
                                {task.es_happy_path && (
                                    <span className="px-1.5 py-0.5 bg-green-500/20 text-green-400 text-[10px] rounded font-medium">
                                        HP
                                    </span>
                                )}
                            </div>

                            {/* Descripcion - editable */}
                            {isEditing && editingField === 'descripcion' ? (
                                <textarea
                                    autoFocus
                                    value={editValue}
                                    onChange={e => setEditValue(e.target.value)}
                                    onBlur={() => handleEditSave(task.task_id)}
                                    onKeyDown={e => {
                                        if (e.key === 'Escape') { setEditingTask(null); setEditingField(null); }
                                    }}
                                    className="bg-gray-900 border border-cyan-500 rounded px-2 py-1 text-gray-300 text-sm outline-none w-full mb-2 resize-none"
                                    rows={2}
                                />
                            ) : (
                                <p
                                    onClick={() => handleEditStart(task.task_id, 'descripcion', task.descripcion || '')}
                                    className="text-gray-500 text-sm mb-2 cursor-pointer hover:text-gray-400 transition-colors"
                                    title="Click para editar"
                                >
                                    {task.descripcion || <span className="italic text-gray-600">Sin descripcion</span>}
                                </p>
                            )}

                            <div className="flex flex-wrap items-center gap-2 text-xs">
                                {/* Tipo - dropdown */}
                                <div className="relative group">
                                    <button
                                        className={`px-2 py-0.5 rounded-full ${typeConfig?.color || 'bg-gray-600'} !text-white font-medium hover:ring-2 hover:ring-white/30 transition-all`}
                                    >
                                        {typeConfig?.label || task.tipo}
                                    </button>
                                    <div className="absolute left-0 top-full mt-1 bg-gray-900 border border-gray-700 rounded-lg shadow-xl z-50 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all min-w-[150px]">
                                        {TIPOS_TASK_PKL.map(tipo => (
                                            <button
                                                key={tipo.value}
                                                onClick={() => handleTipoChange(task.task_id, tipo.value)}
                                                className={`block w-full text-left px-3 py-2 text-xs hover:bg-gray-800 first:rounded-t-lg last:rounded-b-lg ${tipo.color} !text-white`}
                                            >
                                                {tipo.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Responsable - editable */}
                                {isEditing && editingField === 'responsable' ? (
                                    <input
                                        autoFocus
                                        value={editValue}
                                        onChange={e => setEditValue(e.target.value)}
                                        onBlur={() => handleEditSave(task.task_id)}
                                        onKeyDown={e => {
                                            if (e.key === 'Enter') handleEditSave(task.task_id);
                                            if (e.key === 'Escape') { setEditingTask(null); setEditingField(null); }
                                        }}
                                        className="bg-gray-900 border border-cyan-500 rounded px-2 py-0.5 text-gray-300 text-xs outline-none w-24"
                                    />
                                ) : (
                                    <span
                                        onClick={() => handleEditStart(task.task_id, 'responsable', task.responsable)}
                                        className="text-gray-500 cursor-pointer hover:text-cyan-400 transition-colors"
                                        title="Click para editar"
                                    >
                                        <span className="text-gray-600">Responsable:</span> {task.responsable}
                                    </span>
                                )}

                                {/* Duracion - editable */}
                                {isEditing && editingField === 'duracion_min' ? (
                                    <input
                                        autoFocus
                                        type="number"
                                        value={editValue}
                                        onChange={e => setEditValue(e.target.value)}
                                        onBlur={() => handleEditSave(task.task_id)}
                                        onKeyDown={e => {
                                            if (e.key === 'Enter') handleEditSave(task.task_id);
                                            if (e.key === 'Escape') { setEditingTask(null); setEditingField(null); }
                                        }}
                                        className="bg-gray-900 border border-cyan-500 rounded px-2 py-0.5 text-gray-300 text-xs outline-none w-16"
                                    />
                                ) : (
                                    <span
                                        onClick={() => handleEditStart(task.task_id, 'duracion_min', String(task.duracion_min || ''))}
                                        className="text-gray-500 cursor-pointer hover:text-cyan-400 transition-colors"
                                        title="Click para editar"
                                    >
                                        <span className="text-gray-600">⏱</span> {task.duracion_min || '-'} min
                                    </span>
                                )}

                                {task.costo?.monto && task.costo.monto > 0 && (
                                    <span className="text-emerald-400 font-medium">S/ {task.costo.monto.toFixed(2)}</span>
                                )}
                                {task.fecha_completado && (
                                    <span className="text-gray-500">{task.fecha_completado}</span>
                                )}
                            </div>
                            {task.ruta && (
                                <div className="mt-2 text-sm text-gray-500 flex items-center gap-1">
                                    <span className="text-gray-600">📍</span>
                                    {task.ruta.origen} <span className="text-cyan-500">→</span> {task.ruta.destino}
                                </div>
                            )}
                        </div>

                        {/* Status Badge - dropdown */}
                        <div className="relative group">
                            <button
                                className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap hover:ring-2 hover:ring-white/20 transition-all ${
                                    isCompleted ? 'text-emerald-400' :
                                    task.estado === 'en_progreso' ? 'text-blue-400' :
                                    task.estado === 'cancelado' ? 'text-red-400' :
                                    'text-gray-500'
                                }`}
                            >
                                {task.estado}
                            </button>
                            <div className="absolute right-0 top-full mt-1 bg-gray-900 border border-gray-700 rounded-lg shadow-xl z-50 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all min-w-[120px]">
                                {TASK_ESTADOS.map(estado => (
                                    <button
                                        key={estado.value}
                                        onClick={() => handleEstadoChange(task.task_id, estado.value)}
                                        className={`block w-full text-left px-3 py-2 text-xs hover:bg-gray-800 first:rounded-t-lg last:rounded-b-lg ${estado.color}`}
                                    >
                                        {estado.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Delete button - visible on hover */}
                        <button
                            onClick={() => {
                                if (confirm(`¿Eliminar task "${task.nombre}"?`)) {
                                    onDeleteTask(task.task_id);
                                }
                            }}
                            className="p-1.5 text-gray-600 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors opacity-0 group-hover/task:opacity-100"
                            title="Eliminar task"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                        </button>
                    </div>
                );
            })}
        </div>
    );
}

// Costos Tab
function CostosTab({ pkl }: { pkl: PKL }) {
    return (
        <div className="space-y-4">
            {/* Total */}
            <div className="bg-gradient-to-r from-emerald-900/30 to-cyan-900/30 rounded-lg p-6 text-center">
                <div className="text-gray-400 text-sm mb-1">Costo Total</div>
                <div className="text-4xl font-bold text-white">
                    S/ {(pkl.costos.total || 0).toFixed(2)}
                </div>
                <div className="text-gray-500 text-sm mt-1">{pkl.costos.moneda}</div>
            </div>

            {/* Desglose */}
            <div className="bg-gray-900/50 rounded-lg p-4">
                <h4 className="text-gray-400 text-sm mb-4">Desglose de Costos</h4>
                {pkl.costos.detalle.length === 0 ? (
                    <div className="text-gray-500 text-center py-4">Sin costos registrados</div>
                ) : (
                    <div className="space-y-2">
                        {pkl.costos.detalle.map((d, i) => (
                            <div key={i} className="flex items-center justify-between py-2 border-b border-gray-800">
                                <div>
                                    <span className="text-white">{d.concepto}</span>
                                    {d.task_id && (
                                        <span className="text-gray-500 text-sm ml-2">({d.task_id})</span>
                                    )}
                                    {d.incluye_igv && (
                                        <span className="text-green-400 text-xs ml-2">+IGV</span>
                                    )}
                                </div>
                                <span className="text-emerald-400 font-medium">
                                    S/ {d.monto.toFixed(2)}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Nota */}
            {pkl.costos.nota && (
                <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-4">
                    <div className="text-yellow-400 text-sm">Nota: {pkl.costos.nota}</div>
                </div>
            )}
        </div>
    );
}

// Eventos Tab
function EventosTab({ pkl }: { pkl: PKL }) {
    return (
        <div className="space-y-4">
            <h4 className="text-gray-400 text-sm">Eventos Externos (terceros)</h4>
            {pkl.eventos_externos.length === 0 ? (
                <div className="text-gray-500 text-center py-8">Sin eventos externos registrados</div>
            ) : (
                <div className="space-y-3">
                    {pkl.eventos_externos.map(evento => (
                        <div
                            key={evento.evento_id}
                            className="bg-gray-900/50 rounded-lg p-4"
                        >
                            <div className="flex items-start justify-between mb-2">
                                <span className="font-mono text-purple-400 text-sm">{evento.evento_id}</span>
                                <span className="text-gray-500 text-sm">{evento.fecha}</span>
                            </div>
                            <p className="text-white mb-2">{evento.descripcion}</p>
                            <div className="flex flex-wrap gap-3 text-sm">
                                {evento.proveedor_id && (
                                    <span className="text-gray-400">Proveedor: {evento.proveedor_id}</span>
                                )}
                                {evento.impacta_estado && (
                                    <span className="text-cyan-400">
                                        Impacta estado: {getEstadoConfig(evento.impacta_estado).label}
                                    </span>
                                )}
                                {evento.duracion_real && (
                                    <span className="text-gray-400">Duracion: {evento.duracion_real}</span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
