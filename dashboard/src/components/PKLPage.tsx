import { useState, useMemo, useEffect } from 'react';
import type { PKL, EstadoPKL, TipoOperacionPKL, TipoTaskPKL } from '../types';
import { ESTADOS_PKL, TIPOS_OPERACION_PKL, TIPOS_TASK_PKL, GRUPOS_OPERACION_PKL } from '../types';
import { useDatabase } from '../context/DatabaseContext';
// Funciones centralizadas de cálculo de costos (#12)
import { getCostoMonto, calcularCostoTotalPKL } from '../utils/pklCostos';

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
    initialTab?: 'overview' | 'tasks' | 'eventos';
    onBack?: () => void;
    returnToLabel?: string;
}

export default function PKLPage({ initialSelectedPKLId, initialTab, onBack, returnToLabel }: PKLPageProps) {
    const { pkls, updatePKL, updatePKLTask, createPKLTask, deletePKLTask, deletePKL, pklParaMerge, setPKLParaMerge, clientes } = useDatabase();
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
            // Excluir PKLs que fueron vinculados a otro PKL (ahora viven como tasks)
            if (pkl.parent_pkl_id) return false;
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

    // Stats (excluyendo PKLs vinculados a otro)
    const stats = useMemo(() => {
        const pklsActivos = pkls.filter(p => !p.parent_pkl_id);
        const total = pklsActivos.length;
        const cerrados = pklsActivos.filter(p => p.estado.actual === 'cerrado_ok').length;
        const enCurso = pklsActivos.filter(p => ['recibido', 'cotizado', 'en_produccion', 'para_recoger'].includes(p.estado.actual)).length;
        const enPausa = pklsActivos.filter(p => p.estado.actual === 'en_pausa').length;
        const totalCosto = pklsActivos.reduce((sum, p) => sum + calcularCostoTotalPKL(p), 0);
        const totalTasks = pklsActivos.reduce((sum, p) => sum + (p.tasks || []).length, 0);
        return { total, cerrados, enCurso, enPausa, totalCosto, totalTasks };
    }, [pkls]);

    return (
        <div className="p-6 space-y-6">
            {/* Botón Volver */}
            {onBack && (
                <button
                    onClick={onBack}
                    className="flex items-center gap-2 text-cyan-400 hover:text-cyan-300 font-medium transition-colors mb-2"
                >
                    <span>{returnToLabel || '← Volver'}</span>
                </button>
            )}

            {/* Header */}
            <div className="flex items-center justify-between mb-2">
                <div>
                    <h1 className="text-3xl font-bold text-white tracking-tight">PKL - Primary Key Logistica</h1>
                    <p className="text-gray-800 dark:text-gray-400 text-sm mt-2 leading-relaxed">
                        Trazabilidad end-to-end de requerimientos logisticos
                    </p>
                </div>
                <button className="px-5 py-2.5 bg-cyan-600 hover:bg-cyan-500 !text-white font-semibold rounded-xl transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 shadow-md">
                    + Nuevo PKL
                </button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                <div className="bg-white dark:bg-gray-800/50 backdrop-blur border border-gray-200 dark:border-gray-700/50 rounded-xl p-5 transition-all duration-200 hover:shadow-lg hover:-translate-y-1 cursor-pointer">
                    <div className="text-3xl font-bold text-gray-900 dark:text-white leading-none">{stats.total}</div>
                    <div className="text-gray-600 dark:text-gray-400 text-sm mt-2 font-medium">Total PKLs</div>
                </div>
                <div className="bg-white dark:bg-gray-800/50 backdrop-blur border border-gray-200 dark:border-gray-700/50 rounded-xl p-5 transition-all duration-200 hover:shadow-lg hover:-translate-y-1 cursor-pointer">
                    <div className="text-3xl font-bold text-green-600 dark:text-green-400 leading-none">{stats.cerrados}</div>
                    <div className="text-gray-600 dark:text-gray-400 text-sm mt-2 font-medium">Cerrados</div>
                </div>
                <div className="bg-white dark:bg-gray-800/50 backdrop-blur border border-gray-200 dark:border-gray-700/50 rounded-xl p-5 transition-all duration-200 hover:shadow-lg hover:-translate-y-1 cursor-pointer">
                    <div className="text-3xl font-bold text-cyan-600 dark:text-cyan-400 leading-none">{stats.enCurso}</div>
                    <div className="text-gray-600 dark:text-gray-400 text-sm mt-2 font-medium">En Curso</div>
                </div>
                <div className="bg-white dark:bg-gray-800/50 backdrop-blur border border-gray-200 dark:border-gray-700/50 rounded-xl p-5 transition-all duration-200 hover:shadow-lg hover:-translate-y-1 cursor-pointer">
                    <div className="text-3xl font-bold text-yellow-600 dark:text-yellow-400 leading-none">{stats.enPausa}</div>
                    <div className="text-gray-600 dark:text-gray-400 text-sm mt-2 font-medium">En Pausa</div>
                </div>
                <div className="bg-white dark:bg-gray-800/50 backdrop-blur border border-gray-200 dark:border-gray-700/50 rounded-xl p-5 transition-all duration-200 hover:shadow-lg hover:-translate-y-1 cursor-pointer">
                    <div className="text-3xl font-bold text-gray-900 dark:text-white leading-none">S/ {stats.totalCosto.toFixed(2)}</div>
                    <div className="text-gray-600 dark:text-gray-400 text-sm mt-2 font-medium">Costo Total</div>
                </div>
                <div className="bg-white dark:bg-gray-800/50 backdrop-blur border border-gray-200 dark:border-gray-700/50 rounded-xl p-5 transition-all duration-200 hover:shadow-lg hover:-translate-y-1 cursor-pointer">
                    <div className="text-3xl font-bold text-purple-600 dark:text-purple-400 leading-none">{stats.totalTasks}</div>
                    <div className="text-gray-600 dark:text-gray-400 text-sm mt-2 font-medium">Tasks Ejecutados</div>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-3 items-center">
                <input
                    type="text"
                    placeholder="Buscar por ID, cliente o descripcion..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="flex-1 min-w-[200px] px-4 py-2.5 bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700/50 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-all duration-200"
                />
                <select
                    value={filterEstado}
                    onChange={e => setFilterEstado(e.target.value as EstadoPKL | 'todos')}
                    className="px-4 py-2.5 bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700/50 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-all duration-200 cursor-pointer font-medium"
                >
                    <option value="todos">Todos los estados</option>
                    {ESTADOS_PKL.map(e => (
                        <option key={e.value} value={e.value}>{e.label}</option>
                    ))}
                </select>
                <select
                    value={filterTipo}
                    onChange={e => setFilterTipo(e.target.value as TipoOperacionPKL | 'todos')}
                    className="px-4 py-2.5 bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700/50 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-all duration-200 cursor-pointer font-medium"
                >
                    <option value="todos">Todos los tipos</option>
                    {GRUPOS_OPERACION_PKL.map(grupo => (
                        <optgroup key={grupo.grupo} label={grupo.grupo}>
                            {grupo.tipos.map(tipoValue => {
                                const tipoConfig = TIPOS_OPERACION_PKL.find(t => t.value === tipoValue);
                                return tipoConfig ? (
                                    <option key={tipoValue} value={tipoValue}>
                                        {tipoConfig.label}
                                    </option>
                                ) : null;
                            })}
                        </optgroup>
                    ))}
                </select>
            </div>

            {/* Main Content */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* PKL List */}
                <div className="lg:col-span-1 space-y-2">
                    <h2 className="text-lg font-semibold text-white mb-4 tracking-tight">
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
                            const isForMerge = pklParaMerge === pkl.pkl_id;

                            return (
                                <div
                                    key={pkl.pkl_id}
                                    className={`p-4 rounded-xl border cursor-pointer transition-all duration-200 ${
                                        isSelected
                                            ? 'bg-cyan-900/30 border-cyan-500 shadow-lg shadow-cyan-500/20'
                                            : isForMerge
                                                ? 'bg-purple-900/30 border-purple-500 ring-2 ring-purple-500 shadow-lg shadow-purple-500/20'
                                                : 'bg-white dark:bg-gray-800/50 border-gray-200 dark:border-gray-700/50 hover:border-gray-400 dark:hover:border-gray-600 hover:shadow-md hover:-translate-y-0.5'
                                    }`}
                                >
                                    <div className="flex items-start gap-3">
                                        {/* Círculo de selección para merge */}
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (isForMerge) {
                                                    setPKLParaMerge(null);
                                                } else {
                                                    setPKLParaMerge(pkl.pkl_id);
                                                }
                                            }}
                                            className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all mt-1 ${
                                                isForMerge
                                                    ? 'bg-purple-500 border-purple-500 text-white scale-110'
                                                    : 'border-gray-500 hover:border-purple-400 hover:bg-purple-500/20'
                                            }`}
                                            title={isForMerge ? 'Deseleccionar para merge' : 'Seleccionar para agregar eventos'}
                                        >
                                            {isForMerge && (
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                                </svg>
                                            )}
                                        </button>

                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between mb-2">
                                                <span className="font-mono text-cyan-400 text-sm cursor-pointer" onClick={() => setSelectedPKLId(pkl.pkl_id)}>{pkl.pkl_id}</span>
                                                {/* Estado dropdown en la lista */}
                                                <div className="relative group/estado">
                                                    <span
                                                        className={`px-3 py-1 text-sm rounded-full ${estadoConfig.color} !text-white font-semibold cursor-pointer hover:ring-2 hover:ring-white/30`}
                                                        onClick={(e) => e.stopPropagation()}
                                                    >
                                                        {estadoConfig.label}
                                                    </span>
                                                    <div className="absolute right-0 top-full mt-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl z-50 opacity-0 invisible group-hover/estado:opacity-100 group-hover/estado:visible transition-all min-w-[140px]">
                                                        {ESTADOS_PKL.filter(e => e.value !== 'recibido').map(estado => (
                                                            <button
                                                                key={estado.value}
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    updatePKL(pkl.pkl_id, { estado: { ...pkl.estado, actual: estado.value } });
                                                                }}
                                                                className={`block w-full text-left px-3 py-2 text-xs hover:brightness-90 first:rounded-t-lg last:rounded-b-lg ${estado.color} !text-white font-medium`}
                                                            >
                                                                {estado.label}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="cursor-pointer" onClick={() => setSelectedPKLId(pkl.pkl_id)}>
                                                <div className="font-medium text-white mb-1">
                                                    {(() => {
                                                        // Buscar cliente por nombre o razón social para mostrar nombre_comercial
                                                        const clienteEntry = Object.entries(clientes).find(([_, c]) =>
                                                            c.nombre_comercial === pkl.cliente.nombre ||
                                                            c.razon_social === pkl.cliente.nombre
                                                        );
                                                        return clienteEntry?.[1]?.nombre_comercial || pkl.cliente.nombre;
                                                    })()}
                                                </div>
                                                {pkl.cliente.proyecto && (
                                                    <div className="text-gray-800 dark:text-gray-400 text-sm mb-2">
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
                                                        {(pkl.tasks || []).length} tasks | S/ {calcularCostoTotalPKL(pkl).toFixed(2)}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
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
                            initialTab={initialTab}
                        />
                    ) : (
                        <div className="bg-white dark:bg-gray-800/50 backdrop-blur border border-gray-200 dark:border-gray-700/50 rounded-xl p-8 text-center">
                            <div className="text-gray-600 dark:text-gray-500 text-lg mb-2">Selecciona un PKL</div>
                            <div className="text-gray-500 dark:text-gray-600 text-sm">
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
function PKLDetail({ pkl, onUpdate, onUpdateTask, onCreateTask, onDeleteTask, onDelete, initialTab }: {
    pkl: PKL;
    onUpdate: UpdatePKLFn;
    onUpdateTask: UpdateTaskFn;
    onCreateTask: CreateTaskFn;
    onDeleteTask: DeleteTaskFn;
    onDelete: () => void;
    initialTab?: 'overview' | 'tasks' | 'eventos';
}) {
    const { clientes, createPKLTask, deletePKLTask } = useDatabase();
    const [activeTab, setActiveTab] = useState<'overview' | 'tasks' | 'eventos'>(initialTab || 'overview');
    const [editingField, setEditingField] = useState<string | null>(null);
    const [editValue, setEditValue] = useState('');
    const [showEditModal, setShowEditModal] = useState(false);

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
        <div className="bg-white dark:bg-gray-800/50 backdrop-blur border border-gray-200 dark:border-gray-700/50 rounded-xl overflow-hidden">
            {/* Header */}
            <div className="p-6 border-b border-gray-200 dark:border-gray-700/50">
                <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                            <span className="font-mono text-2xl text-cyan-400">{pkl.pkl_id}</span>
                            {/* Estado - Dropdown editable */}
                            <div className="relative group">
                                <span className={`px-3 py-1 rounded-full ${estadoConfig.color} !text-white font-semibold text-sm cursor-pointer hover:ring-2 hover:ring-white/30`}>
                                    {estadoConfig.label}
                                </span>
                                <div className="absolute left-0 top-full mt-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl z-50 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all min-w-[140px]">
                                    {ESTADOS_PKL.filter(e => e.value !== 'recibido').map(estado => (
                                        <button
                                            key={estado.value}
                                            onClick={() => onUpdate({ estado: { actual: estado.value } } as any)}
                                            className={`block w-full text-left px-3 py-2 text-xs hover:brightness-90 first:rounded-t-lg last:rounded-b-lg ${estado.color} !text-white font-medium`}
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
                                className="text-xl font-bold bg-gray-50 dark:bg-gray-900 border border-cyan-500 rounded px-2 py-1 text-gray-900 dark:text-white outline-none w-full max-w-md"
                            />
                        ) : (
                            <h2
                                onClick={() => handleEditStart('cliente.nombre', pkl.cliente.nombre)}
                                className="text-xl font-bold text-white cursor-pointer hover:text-cyan-400 transition-colors"
                                title="Click para editar"
                            >
                                {(() => {
                                    const clienteEntry = Object.entries(clientes).find(([_, c]) =>
                                        c.nombre_comercial === pkl.cliente.nombre ||
                                        c.razon_social === pkl.cliente.nombre
                                    );
                                    return clienteEntry?.[1]?.nombre_comercial || pkl.cliente.nombre;
                                })()}
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
                                className="text-gray-800 dark:text-gray-400 cursor-pointer hover:text-cyan-500 dark:hover:text-cyan-400 transition-colors"
                                title="Click para editar proyecto"
                            >
                                {pkl.cliente.proyecto ? `Proyecto: ${pkl.cliente.proyecto}` : <span className="text-gray-600 dark:text-gray-500 italic">+ Agregar proyecto</span>}
                            </div>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        {/* Tipo operacion - Dropdown editable */}
                        <div className="relative group">
                            <span className={`px-3 py-1 rounded ${tipoConfig.color} !text-white text-sm cursor-pointer hover:ring-2 hover:ring-white/30`}>
                                {tipoConfig.label}
                            </span>
                            <div className="absolute right-0 top-full mt-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl z-50 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all min-w-[220px] max-h-[400px] overflow-y-auto">
                                {GRUPOS_OPERACION_PKL.map((grupo) => (
                                    <div key={grupo.grupo}>
                                        <div className={`px-3 py-1.5 text-xs font-bold ${grupo.color} bg-gray-100 dark:bg-gray-800 sticky top-0`}>
                                            {grupo.grupo}
                                        </div>
                                        {grupo.tipos.map(tipoValue => {
                                            const tipoItem = TIPOS_OPERACION_PKL.find(t => t.value === tipoValue);
                                            if (!tipoItem) return null;
                                            return (
                                                <button
                                                    key={tipoItem.value}
                                                    onClick={() => onUpdate({ clasificacion: { ...pkl.clasificacion, tipo_operacion: tipoItem.value } } as any)}
                                                    className={`block w-full text-left px-3 py-2 text-xs hover:brightness-110 ${tipoItem.color} !text-white`}
                                                >
                                                    {tipoItem.label}
                                                </button>
                                            );
                                        })}
                                    </div>
                                ))}
                            </div>
                        </div>
                        {/* Quick Add Task Button */}
                        <button
                            onClick={() => setActiveTab('tasks')}
                            className="px-4 py-2 bg-emerald-700 hover:bg-emerald-600 !text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-1.5"
                            title="Agregar Task"
                        >
                            <span className="text-base">+</span>
                            Task
                        </button>
                        {/* Edit PKL Button */}
                        <button
                            onClick={() => setShowEditModal(true)}
                            className="px-4 py-2 bg-purple-700 hover:bg-purple-600 !text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-1.5"
                            title="Editar PKL"
                        >
                            ✏️ Editar
                        </button>
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
                        className="text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-900 border border-cyan-500 rounded px-2 py-1 outline-none w-full resize-none"
                    />
                ) : (
                    <p
                        onClick={() => handleEditStart('descripcion', pkl.origen.descripcion_inicial)}
                        className="text-gray-800 dark:text-gray-300 cursor-pointer hover:text-cyan-500 dark:hover:text-cyan-400 transition-colors"
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
                            className="bg-gray-50 dark:bg-gray-900 border border-cyan-500 rounded px-2 py-0.5 outline-none text-sm w-32"
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
            <div className="flex gap-2 p-2 bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700/50">
                {(['overview', 'tasks', 'eventos'] as const).map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                            activeTab === tab
                                ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-900/30'
                                : 'bg-gray-100 dark:bg-gray-800/50 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700/50 hover:text-gray-900 dark:hover:text-white border border-gray-200 dark:border-gray-700/50'
                        }`}
                    >
                        {tab === 'overview' && 'Resumen'}
                        {tab === 'tasks' && `Tasks (${(pkl.tasks || []).length})`}
                        {tab === 'eventos' && `Eventos (${(pkl.eventos_externos || []).length})`}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            <div className="p-6">
                {activeTab === 'overview' && <OverviewTab pkl={pkl} onUpdate={onUpdate} onUpdateTask={onUpdateTask} />}
                {activeTab === 'tasks' && <TasksTab pkl={pkl} onUpdateTask={onUpdateTask} onCreateTask={onCreateTask} onDeleteTask={onDeleteTask} />}
                {activeTab === 'eventos' && <EventosTab pkl={pkl} onUpdate={onUpdate} />}
            </div>

            {/* Modal de edición PKL */}
            {showEditModal && (
                <PKLEditModal
                    pkl={pkl}
                    clientes={clientes}
                    onClose={() => setShowEditModal(false)}
                    onUpdate={onUpdate}
                    onCreateTask={createPKLTask}
                    onDeleteTask={deletePKLTask}
                    onUpdateTask={onUpdateTask}
                />
            )}
        </div>
    );
}

// PKL Edit Modal - Same style as merge modal (copiado exactamente)
function PKLEditModal({ pkl, clientes, onClose, onUpdate, onCreateTask, onDeleteTask, onUpdateTask }: {
    pkl: PKL;
    clientes: Record<string, any>;
    onClose: () => void;
    onUpdate: UpdatePKLFn;
    onCreateTask: (pklId: string, task: Omit<import('../types').TaskPKL, 'task_id'>) => void;
    onDeleteTask: (pklId: string, taskId: string) => void;
    onUpdateTask: (pklId: string, taskId: string, updates: Partial<import('../types').TaskPKL>) => void;
}) {
    const [pklNombre, setPklNombre] = useState(pkl.origen?.descripcion_inicial || pkl.pkl_id);

    // Buscar el cliente por nombre para obtener su RUC/key
    const findClienteKey = () => {
        if (!pkl.cliente?.nombre) return '';
        const clienteNombre = pkl.cliente.nombre;
        // Buscar en clientes por nombre_comercial o razon_social
        const entry = Object.entries(clientes).find(([key, c]) =>
            c.nombre_comercial === clienteNombre ||
            c.razon_social === clienteNombre ||
            key === clienteNombre
        );
        return entry ? entry[0] : '';
    };

    const [selectedCliente, setSelectedCliente] = useState(findClienteKey());
    const [tipoOperacion, setTipoOperacion] = useState<string>(pkl.clasificacion?.tipo_operacion || 'produccion');
    const [isSaving, setIsSaving] = useState(false);

    // Estado local de tasks para reflejar cambios inmediatamente
    const [localTasks, setLocalTasks] = useState(pkl.tasks || []);

    // Task form states - copiado del modal de fusión
    const [showAddTask, setShowAddTask] = useState(false);
    const [newTaskTipo, setNewTaskTipo] = useState('cotizacion');
    const [newTaskDesc, setNewTaskDesc] = useState('');
    const [newTaskMonto, setNewTaskMonto] = useState('');
    const [newTaskProveedor, setNewTaskProveedor] = useState('');
    // Para cotización - múltiples ítems
    const [newTaskItems, setNewTaskItems] = useState<Array<{
        id: string;
        codigo: string;
        descripcion: string;
        cantidad: string;
        precio_unitario: string;
    }>>([{ id: crypto.randomUUID(), codigo: '', descripcion: '', cantidad: '', precio_unitario: '' }]);
    const [newTaskIncluyeIgv, setNewTaskIncluyeIgv] = useState(false);

    // Estado para editar task existente
    const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
    const [editTaskNombre, setEditTaskNombre] = useState('');
    const [editTaskMonto, setEditTaskMonto] = useState('');
    const [editTaskTipo, setEditTaskTipo] = useState<import('../types').TipoTaskPKL>('cotizacion');
    const [editTaskCantidad, setEditTaskCantidad] = useState('');
    const [editTaskPrecioUnitario, setEditTaskPrecioUnitario] = useState('');
    const [editTaskEsPrecioUnitario, setEditTaskEsPrecioUnitario] = useState(true);
    const [editTaskIncluyeIgv, setEditTaskIncluyeIgv] = useState(false);

    // Calcular monto total para cotización (suma de todos los ítems)
    const calcularMontoTask = () => {
        if (newTaskTipo === 'cotizacion') {
            // Sumar todos los ítems
            let subtotal = 0;
            for (const item of newTaskItems) {
                const cant = parseFloat(item.cantidad) || 0;
                const precio = parseFloat(item.precio_unitario) || 0;
                if (cant > 0 && precio > 0) {
                    subtotal += cant * precio;
                }
            }
            if (subtotal > 0) {
                if (!newTaskIncluyeIgv) {
                    subtotal = subtotal * 1.18; // Agregar IGV
                }
                return subtotal;
            }
        }
        return parseFloat(newTaskMonto) || 0;
    };

    // Funciones para manejar ítems de cotización
    const addCotizacionItem = () => {
        setNewTaskItems([...newTaskItems, {
            id: crypto.randomUUID(),
            codigo: '',
            descripcion: '',
            cantidad: '',
            precio_unitario: ''
        }]);
    };

    const removeCotizacionItem = (id: string) => {
        if (newTaskItems.length > 1) {
            setNewTaskItems(newTaskItems.filter(item => item.id !== id));
        }
    };

    const updateCotizacionItem = (id: string, field: string, value: string) => {
        setNewTaskItems(newTaskItems.map(item =>
            item.id === id ? { ...item, [field]: value } : item
        ));
    };

    // Cerrar con ESC y hacer scroll al modal cuando se abre
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyDown);

        // Scroll suave hacia arriba para que el modal sea visible
        window.scrollTo({ top: 0, behavior: 'smooth' });

        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    const clientesList = Object.entries(clientes).map(([key, c]) => ({
        id: key,
        display: c.nombre_comercial || c.razon_social || key
    }));

    const tipoIcons: Record<string, string> = {
        'ciclo_completo': '🔄', 'produccion_recojo_entrega': '🏭', 'cotizacion_recojo_entrega': '💬🚚',
        'cotizacion_recojo': '💬🚚', 'recojo_entrega': '🚚📦', 'solo_entrega': '📦',
        'cotizacion_produccion_motorizado': '💬🏭', 'solo_motorizado': '🛵', 'solo_cotizacion': '💬',
        'ciclo_completo_instalacion': '🔄🔧', 'feria_evento': '🎪', 'compra_insumo': '🛒',
        'compra_interna': '🏢', 'movilidad': '🚕', 'produccion': '🏭',
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const clienteNombre = selectedCliente
                ? (clientes[selectedCliente]?.nombre_comercial || clientes[selectedCliente]?.razon_social || selectedCliente)
                : pkl.cliente?.nombre || 'Sin cliente';

            await onUpdate({
                origen: { ...pkl.origen, descripcion_inicial: pklNombre },
                cliente: { ...pkl.cliente, nombre: clienteNombre },
                clasificacion: { ...pkl.clasificacion, tipo_operacion: tipoOperacion as any },
            } as any);

            onClose();
        } catch (err) {
            console.error('Error guardando PKL:', err);
        } finally {
            setIsSaving(false);
        }
    };

    const handleAddTask = async () => {
        console.log('🔥 handleAddTask CALLED!');

        const tipoEmojis: Record<string, string> = {
            cotizacion: '💬', coordinacion_proveedor: '📞', compra_insumo: '🛒',
            pago: '💰', movilidad: '🚚', instalacion: '🔧', cierre: '✅', administrativo: '📋'
        };
        const monto = newTaskTipo === 'cotizacion' ? calcularMontoTask() : (parseFloat(newTaskMonto) || undefined);
        const descripcion = newTaskDesc.trim() || `${newTaskTipo.charAt(0).toUpperCase() + newTaskTipo.slice(1)}${newTaskProveedor ? ` - ${newTaskProveedor}` : ''}`;

        console.log('📝 Agregando task:', { tipo: newTaskTipo, descripcion, monto });

        // Construir items_cotizacion si es tipo cotización
        let itemsCotizacion: import('../types').ItemCotizacionPKL[] | undefined;
        if (newTaskTipo === 'cotizacion') {
            const itemsValidos = newTaskItems.filter(item =>
                item.descripcion.trim() && parseFloat(item.cantidad) > 0 && parseFloat(item.precio_unitario) > 0
            );
            if (itemsValidos.length > 0) {
                itemsCotizacion = itemsValidos.map(item => ({
                    item_id: item.id,
                    codigo: item.codigo.trim() || undefined,
                    descripcion: item.descripcion.trim(),
                    cantidad: parseFloat(item.cantidad),
                    precio_unitario: parseFloat(item.precio_unitario),
                    precio_total: parseFloat(item.cantidad) * parseFloat(item.precio_unitario)
                }));
            }
        }

        const newTaskData = {
            nombre: `${tipoEmojis[newTaskTipo] || '📋'} ${newTaskTipo.toUpperCase()}: ${descripcion}`.substring(0, 100),
            descripcion,
            tipo: newTaskTipo as any,
            estado: 'completado' as const,
            orden: localTasks.length + 1,
            costo: monto ? { monto, moneda: 'PEN' as const, incluye_igv: newTaskIncluyeIgv } : undefined,
            responsable: 'Huber',
            es_happy_path: false,
            items_cotizacion: itemsCotizacion,
        };

        // Agregar al estado local inmediatamente
        const tempTaskId = `${pkl.pkl_id}-T${String(localTasks.length + 1).padStart(3, '0')}`;
        setLocalTasks(prev => [...prev, { ...newTaskData, task_id: tempTaskId } as any]);

        // Guardar en base de datos
        await onCreateTask(pkl.pkl_id, newTaskData);

        // Si es cotización y tiene proveedor, agregarlo a la lista de proveedores del PKL
        if (newTaskTipo === 'cotizacion' && newTaskProveedor.trim()) {
            const proveedorExiste = pkl.proveedores?.some(p =>
                p.nombre.toLowerCase() === newTaskProveedor.trim().toLowerCase()
            );

            if (!proveedorExiste) {
                const nuevoProveedor = {
                    proveedor_id: crypto.randomUUID(),
                    nombre: newTaskProveedor.trim(),
                    cotizacion: itemsCotizacion && itemsCotizacion.length > 0 ? {
                        descripcion: itemsCotizacion.map(i => i.descripcion).join(', '),
                        cantidad: itemsCotizacion.reduce((sum, i) => sum + i.cantidad, 0),
                        precio_total: itemsCotizacion.reduce((sum, i) => sum + i.precio_total, 0),
                        incluye_igv: newTaskIncluyeIgv,
                    } : undefined,
                };

                await onUpdate({
                    proveedores: [...(pkl.proveedores || []), nuevoProveedor]
                } as any);
            }
        }

        console.log('✅ Task agregado');

        // Reset form
        resetTaskForm();
    };

    const resetTaskForm = () => {
        setShowAddTask(false);
        setNewTaskDesc('');
        setNewTaskMonto('');
        setNewTaskProveedor('');
        setNewTaskIncluyeIgv(false);
        setNewTaskItems([{ id: crypto.randomUUID(), codigo: '', descripcion: '', cantidad: '', precio_unitario: '' }]);
    };

    // Calcular monto para edición de task
    const calcularMontoEditTask = () => {
        const cant = parseFloat(editTaskCantidad) || 0;
        const precio = parseFloat(editTaskPrecioUnitario) || 0;

        // Si tiene monto directo (sin cantidad/precio), usar ese
        if (editTaskMonto && !editTaskCantidad && !editTaskPrecioUnitario) {
            return parseFloat(editTaskMonto) || 0;
        }

        if (cant > 0 && precio > 0) {
            let total = editTaskEsPrecioUnitario ? (cant * precio) : precio;
            if (!editTaskIncluyeIgv) {
                total = total * 1.18;
            }
            return total;
        }

        if (precio > 0) {
            let total = precio;
            if (!editTaskIncluyeIgv) {
                total = total * 1.18;
            }
            return total;
        }

        return parseFloat(editTaskMonto) || 0;
    };

    // Funciones para editar task existente
    const startEditTask = (task: any) => {
        setEditingTaskId(task.task_id);
        setEditTaskNombre(task.nombre || task.descripcion || '');
        setEditTaskTipo(task.tipo || 'cotizacion');

        // Extraer datos del costo existente
        const costoActual = getCostoMonto(task.costo);
        if (costoActual > 0) {
            setEditTaskMonto(costoActual.toString());
            // Si el task tiene información de cantidad/precio, usarla
            if (task.costo?.cantidad && task.costo?.precio_unitario) {
                setEditTaskCantidad(task.costo.cantidad.toString());
                setEditTaskPrecioUnitario(task.costo.precio_unitario.toString());
                setEditTaskEsPrecioUnitario(true);
            } else {
                setEditTaskCantidad('');
                setEditTaskPrecioUnitario(costoActual.toString());
                setEditTaskEsPrecioUnitario(false); // Es precio total
            }
            setEditTaskIncluyeIgv(task.costo?.incluye_igv || false);
        } else {
            setEditTaskMonto('');
            setEditTaskCantidad('');
            setEditTaskPrecioUnitario('');
            setEditTaskEsPrecioUnitario(true);
            setEditTaskIncluyeIgv(false);
        }
    };

    const cancelEditTask = () => {
        setEditingTaskId(null);
        setEditTaskNombre('');
        setEditTaskMonto('');
        setEditTaskTipo('cotizacion');
        setEditTaskCantidad('');
        setEditTaskPrecioUnitario('');
        setEditTaskEsPrecioUnitario(true);
        setEditTaskIncluyeIgv(false);
    };

    const saveEditTask = async () => {
        if (!editingTaskId) return;

        const updatedTask = localTasks.find(t => t.task_id === editingTaskId);
        if (!updatedTask) return;

        const montoFinal = calcularMontoEditTask();
        const cant = parseFloat(editTaskCantidad) || undefined;
        const precioUnit = parseFloat(editTaskPrecioUnitario) || undefined;

        const updatedTaskData = {
            ...updatedTask,
            nombre: editTaskNombre,
            tipo: editTaskTipo,
            costo: montoFinal > 0 ? {
                monto: montoFinal,
                moneda: 'PEN' as const,
                incluye_igv: editTaskIncluyeIgv,
                cantidad: cant,
                precio_unitario: precioUnit,
                es_precio_unitario: editTaskEsPrecioUnitario
            } : undefined
        };

        // Actualizar estado local
        setLocalTasks(prev => prev.map(t =>
            t.task_id === editingTaskId ? updatedTaskData : t
        ));

        // Guardar en base de datos
        await onUpdateTask(pkl.pkl_id, editingTaskId, updatedTaskData);

        cancelEditTask();
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4" onClick={onClose}>
            <div
                className="bg-gray-900 border border-purple-500/50 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-6 rounded-t-2xl">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <span className="text-3xl">📋</span>
                            <div>
                                <h2 className="text-xl font-bold !text-white">{pkl.pkl_id}</h2>
                                <p className="text-white/70 text-sm">{localTasks.length} tasks</p>
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
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    {/* Nombre del PKL */}
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">Nombre del PKL</label>
                        <input
                            type="text"
                            value={pklNombre}
                            onChange={(e) => setPklNombre(e.target.value)}
                            className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-2.5 text-white focus:border-purple-500 outline-none"
                            placeholder="Ej: GRUPO LAR - Recojo + Entrega"
                        />
                    </div>

                    {/* Cliente y Tipo */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-1">Cliente</label>
                            <select
                                value={selectedCliente}
                                onChange={(e) => setSelectedCliente(e.target.value)}
                                className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-2.5 text-white focus:border-purple-500 outline-none"
                                style={{ colorScheme: 'dark' }}
                            >
                                <option value="">Seleccionar cliente...</option>
                                {clientesList.map(c => (
                                    <option key={c.id} value={c.id}>{c.display}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-1">Ciclo de Operación</label>
                            <select
                                value={tipoOperacion}
                                onChange={(e) => setTipoOperacion(e.target.value)}
                                className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-2.5 text-white focus:border-purple-500 outline-none"
                                style={{ colorScheme: 'dark' }}
                            >
                                {GRUPOS_OPERACION_PKL.map(grupo => (
                                    <optgroup key={grupo.grupo} label={grupo.grupo}>
                                        {grupo.tipos.map(tipoValue => {
                                            const tipoConfig = TIPOS_OPERACION_PKL.find(t => t.value === tipoValue);
                                            return tipoConfig ? (
                                                <option key={tipoValue} value={tipoValue}>
                                                    {tipoIcons[tipoValue] || '📋'} {tipoConfig.label}
                                                </option>
                                            ) : null;
                                        })}
                                    </optgroup>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Tasks */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className="block text-sm font-medium text-gray-400">Tasks ({localTasks.length})</label>
                            <button
                                onClick={() => setShowAddTask(true)}
                                className="px-2 py-1 bg-purple-600 hover:bg-purple-500 !text-white text-xs rounded transition-colors"
                            >
                                + Agregar Task
                            </button>
                        </div>
                        <div className="bg-gray-800/50 border border-gray-700 rounded-lg max-h-80 overflow-y-auto">
                            {localTasks.map((task, idx) => {
                                const tipoEmojis: Record<string, string> = {
                                    cotizacion: '💬', coordinacion_proveedor: '📞', compra_insumo: '🛒',
                                    pago: '💰', movilidad: '🚚', instalacion: '🔧', cierre: '✅', administrativo: '📋',
                                    movimiento: '🚚', rendicion: '💰', orden_produccion: '🏭'
                                };
                                const isEditing = editingTaskId === task.task_id;

                                return (
                                    <div key={task.task_id} className={`p-3 border-b border-gray-700/50 last:border-0 ${isEditing ? 'bg-purple-900/30' : ''}`}>
                                        {isEditing ? (
                                            // Formulario de edición completo
                                            <div className="space-y-3 p-2 bg-purple-900/20 rounded-lg">
                                                {/* Fila 1: Tipo y Nombre */}
                                                <div className="flex gap-2">
                                                    <select
                                                        value={editTaskTipo}
                                                        onChange={(e) => setEditTaskTipo(e.target.value as import('../types').TipoTaskPKL)}
                                                        className="bg-gray-700 border border-gray-600 rounded px-2 py-1.5 text-white text-sm outline-none"
                                                    >
                                                        <option value="cotizacion">💬 Cotización</option>
                                                        <option value="coordinacion_proveedor">📞 Coordinación</option>
                                                        <option value="compra_insumo">🛒 Compra</option>
                                                        <option value="pago">💰 Pago</option>
                                                        <option value="movilidad">🚚 Movilidad</option>
                                                        <option value="instalacion">🔧 Instalación</option>
                                                        <option value="cierre">✅ Cierre</option>
                                                        <option value="administrativo">📋 Admin</option>
                                                    </select>
                                                    <input
                                                        type="text"
                                                        value={editTaskNombre}
                                                        onChange={(e) => setEditTaskNombre(e.target.value)}
                                                        placeholder="Nombre del task"
                                                        className="flex-1 bg-gray-700 border border-gray-600 rounded px-3 py-1.5 text-white text-sm outline-none focus:border-purple-500"
                                                        autoFocus
                                                    />
                                                </div>

                                                {/* Fila 2: Cantidad, Precio y Tipo de precio */}
                                                <div className="flex gap-2 items-center flex-wrap">
                                                    <input
                                                        type="number"
                                                        value={editTaskCantidad}
                                                        onChange={(e) => setEditTaskCantidad(e.target.value)}
                                                        placeholder="Cantidad"
                                                        className="w-20 bg-gray-700 border border-gray-600 rounded px-2 py-1.5 text-white text-sm outline-none focus:border-purple-500"
                                                    />
                                                    <span className="text-gray-400 text-sm">×</span>
                                                    <input
                                                        type="number"
                                                        value={editTaskPrecioUnitario}
                                                        onChange={(e) => setEditTaskPrecioUnitario(e.target.value)}
                                                        placeholder={editTaskEsPrecioUnitario ? "P. Unit." : "Total"}
                                                        step="0.01"
                                                        className="w-24 bg-gray-700 border border-gray-600 rounded px-2 py-1.5 text-white text-sm outline-none focus:border-purple-500"
                                                    />
                                                    <select
                                                        value={editTaskEsPrecioUnitario ? 'unitario' : 'total'}
                                                        onChange={(e) => setEditTaskEsPrecioUnitario(e.target.value === 'unitario')}
                                                        className="bg-gray-700 border border-gray-600 rounded px-2 py-1.5 text-white text-xs outline-none"
                                                    >
                                                        <option value="unitario">Precio Unitario</option>
                                                        <option value="total">Precio Total</option>
                                                    </select>
                                                </div>

                                                {/* Fila 3: IGV y Total calculado */}
                                                <div className="flex items-center justify-between gap-2">
                                                    <label className="flex items-center gap-2 text-gray-300 text-sm cursor-pointer">
                                                        <input
                                                            type="checkbox"
                                                            checked={editTaskIncluyeIgv}
                                                            onChange={(e) => setEditTaskIncluyeIgv(e.target.checked)}
                                                            className="w-4 h-4 rounded"
                                                        />
                                                        Precio incluye IGV
                                                    </label>
                                                    {(editTaskCantidad || editTaskPrecioUnitario) && (
                                                        <div className="text-amber-400 text-sm font-bold">
                                                            Total: S/. {calcularMontoEditTask().toFixed(2)}
                                                            {!editTaskIncluyeIgv && <span className="text-gray-500 text-xs ml-1">(+IGV)</span>}
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Fila 4: Botones */}
                                                <div className="flex gap-2 justify-end pt-2 border-t border-gray-700">
                                                    <button
                                                        onClick={cancelEditTask}
                                                        className="px-3 py-1.5 bg-gray-600 hover:bg-gray-500 text-white text-xs rounded"
                                                    >
                                                        Cancelar
                                                    </button>
                                                    <button
                                                        onClick={saveEditTask}
                                                        className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs rounded font-medium"
                                                    >
                                                        ✓ Guardar
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            // Vista normal del task (clickeable para editar)
                                            <div className="flex items-center gap-3">
                                                <span className="text-gray-500 text-sm font-mono w-6">{idx + 1}</span>
                                                <span className="text-lg">{tipoEmojis[task.tipo || ''] || '📋'}</span>
                                                <div
                                                    className="flex-1 min-w-0 cursor-pointer hover:bg-gray-700/50 rounded px-2 py-1 -mx-2 transition-colors"
                                                    onClick={() => startEditTask(task)}
                                                    title="Click para editar"
                                                >
                                                    <p className="text-white text-sm font-medium truncate">{task.nombre || task.descripcion}</p>
                                                    <p className="text-gray-500 text-xs">
                                                        {task.tipo?.toUpperCase()} • {task.estado}
                                                        {getCostoMonto(task.costo) > 0 ? (
                                                            <span className="text-emerald-400"> • S/. {getCostoMonto(task.costo).toFixed(2)}</span>
                                                        ) : (
                                                            <span className="text-amber-400/60"> • sin costo</span>
                                                        )}
                                                    </p>
                                                    {/* Mostrar ítems de cotización si existen */}
                                                    {task.items_cotizacion && task.items_cotizacion.length > 0 && (
                                                        <div className="mt-1 pl-2 border-l-2 border-purple-500/30">
                                                            {task.items_cotizacion.map((item, i) => (
                                                                <div key={item.item_id || i} className="text-xs text-gray-400">
                                                                    {item.cantidad}x {item.descripcion} - S/.{item.precio_total?.toFixed(2) || (item.cantidad * item.precio_unitario).toFixed(2)}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                                <button
                                                    onClick={() => startEditTask(task)}
                                                    className="px-2 py-0.5 bg-purple-500/20 text-purple-400 text-xs rounded hover:bg-purple-500/30"
                                                    title="Editar task"
                                                >
                                                    ✏️
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        setLocalTasks(prev => prev.filter(t => t.task_id !== task.task_id));
                                                        onDeleteTask(pkl.pkl_id, task.task_id);
                                                    }}
                                                    className="px-2 py-0.5 bg-red-500/20 text-red-400 text-xs rounded hover:bg-red-500/30"
                                                    title="Eliminar task"
                                                >
                                                    ✕
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                            {localTasks.length === 0 && (
                                <p className="text-gray-500 text-sm text-center py-4">No hay tasks</p>
                            )}
                        </div>

                        {/* Form para agregar task - COPIADO EXACTAMENTE del modal de fusión */}
                        {showAddTask && (
                            <div className="mt-3 p-3 bg-purple-100 dark:bg-purple-900/30 border border-purple-400 dark:border-purple-500/30 rounded-lg space-y-3">
                                {/* Fila 1: Tipo y Descripción */}
                                <div className="flex gap-2">
                                    <select
                                        value={newTaskTipo}
                                        onChange={(e) => setNewTaskTipo(e.target.value)}
                                        className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-gray-900 dark:text-white text-sm outline-none"
                                    >
                                        <option value="cotizacion">💬 Cotización</option>
                                        <option value="coordinacion_proveedor">📞 Coordinación</option>
                                        <option value="compra_insumo">🛒 Compra Insumo</option>
                                        <option value="pago">💰 Pago</option>
                                        <option value="movilidad">🚚 Movilidad</option>
                                        <option value="instalacion">🔧 Instalación</option>
                                        <option value="cierre">✅ Cierre</option>
                                        <option value="administrativo">📋 Administrativo</option>
                                    </select>
                                    <input
                                        type="text"
                                        value={newTaskDesc}
                                        onChange={(e) => setNewTaskDesc(e.target.value)}
                                        placeholder="Descripción del task..."
                                        className="flex-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-gray-900 dark:text-white text-sm outline-none"
                                    />
                                </div>

                                {/* Fila 2: Proveedor */}
                                <input
                                    type="text"
                                    value={newTaskProveedor}
                                    onChange={(e) => setNewTaskProveedor(e.target.value)}
                                    placeholder="Proveedor (opcional)"
                                    className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-gray-900 dark:text-white text-sm outline-none"
                                />

                                {/* Fila 3: Precio - cambia según tipo */}
                                {newTaskTipo === 'cotizacion' ? (
                                    <div className="space-y-2">
                                        {/* Lista de ítems de cotización */}
                                        <div className="space-y-2 max-h-48 overflow-y-auto">
                                            {newTaskItems.map((item) => (
                                                <div key={item.id} className="flex gap-1 items-center bg-gray-100 dark:bg-gray-700/50 p-2 rounded">
                                                    <input
                                                        type="text"
                                                        value={item.descripcion}
                                                        onChange={(e) => updateCotizacionItem(item.id, 'descripcion', e.target.value)}
                                                        placeholder="Descripción del ítem"
                                                        className="flex-1 min-w-0 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-gray-900 dark:text-white text-xs outline-none"
                                                    />
                                                    <input
                                                        type="number"
                                                        value={item.cantidad}
                                                        onChange={(e) => updateCotizacionItem(item.id, 'cantidad', e.target.value)}
                                                        placeholder="Cant"
                                                        className="w-14 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-gray-900 dark:text-white text-xs outline-none text-center"
                                                    />
                                                    <span className="text-gray-500 text-xs">×</span>
                                                    <input
                                                        type="number"
                                                        value={item.precio_unitario}
                                                        onChange={(e) => updateCotizacionItem(item.id, 'precio_unitario', e.target.value)}
                                                        placeholder="P.Unit"
                                                        step="0.01"
                                                        className="w-20 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-gray-900 dark:text-white text-xs outline-none text-right"
                                                    />
                                                    <span className="text-white text-xs font-medium w-16 text-right">
                                                        {(parseFloat(item.cantidad) || 0) * (parseFloat(item.precio_unitario) || 0) > 0
                                                            ? `S/.${((parseFloat(item.cantidad) || 0) * (parseFloat(item.precio_unitario) || 0)).toFixed(2)}`
                                                            : ''}
                                                    </span>
                                                    {newTaskItems.length > 1 && (
                                                        <button
                                                            onClick={() => removeCotizacionItem(item.id)}
                                                            className="text-red-500 hover:text-red-400 text-sm px-1"
                                                            title="Eliminar ítem"
                                                        >
                                                            ×
                                                        </button>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                        {/* Botón agregar ítem y totales */}
                                        <div className="flex items-center justify-between">
                                            <button
                                                onClick={addCotizacionItem}
                                                className="text-purple-500 hover:text-purple-400 text-sm font-medium flex items-center gap-1"
                                            >
                                                <span>+</span> Agregar ítem
                                            </button>
                                            <label className="flex items-center gap-2 text-gray-800 dark:text-gray-200 text-sm cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={newTaskIncluyeIgv}
                                                    onChange={(e) => setNewTaskIncluyeIgv(e.target.checked)}
                                                    className="w-4 h-4 rounded"
                                                />
                                                Precio incluye IGV
                                            </label>
                                        </div>
                                        {/* Total general */}
                                        {calcularMontoTask() > 0 && (
                                            <div className="text-right text-white text-sm font-bold border-t border-gray-300 dark:border-gray-600 pt-2">
                                                TOTAL: S/. {calcularMontoTask().toFixed(2)}
                                                {!newTaskIncluyeIgv && <span className="text-gray-300 text-xs ml-1">(inc. IGV)</span>}
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <input
                                        type="number"
                                        value={newTaskMonto}
                                        onChange={(e) => setNewTaskMonto(e.target.value)}
                                        placeholder="Monto S/. (opcional)"
                                        step="0.01"
                                        className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-gray-900 dark:text-white text-sm outline-none"
                                    />
                                )}

                                {/* Botones */}
                                <div className="flex gap-2 justify-end">
                                    <button
                                        onClick={resetTaskForm}
                                        className="px-3 py-1 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-white text-xs rounded"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        onClick={handleAddTask}
                                        className="px-3 py-1 bg-purple-600 hover:bg-purple-500 !text-white text-xs rounded"
                                    >
                                        Agregar Task
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="flex gap-3 p-6 border-t border-gray-800">
                    <button
                        onClick={onClose}
                        className="flex-1 py-3 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg font-medium transition-colors"
                    >
                        Cerrar
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="flex-1 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 disabled:opacity-50 !text-white rounded-lg font-bold transition-all flex items-center justify-center gap-2"
                    >
                        {isSaving ? (
                            <span className="animate-pulse">Guardando...</span>
                        ) : (
                            <>
                                <span>💾</span>
                                Guardar Cambios
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}

// Overview Tab
function OverviewTab({ pkl, onUpdate, onUpdateTask }: { pkl: PKL; onUpdate: UpdatePKLFn; onUpdateTask?: (pklId: string, taskId: string, updates: Partial<import('../types').TaskPKL>) => void }) {
    const { proveedores: proveedoresDB } = useDatabase();
    // Estado local para tasks en Overview
    const [localTasks, setLocalTasks] = useState(pkl.tasks || []);

    // Sincronizar localTasks cuando pkl.tasks cambie
    useEffect(() => {
        setLocalTasks(pkl.tasks || []);
    }, [pkl.tasks]);

    const [editingObs, setEditingObs] = useState(false);
    const [obsValue, setObsValue] = useState(pkl.observaciones || '');

    // Productos editing
    const [showAddProducto, setShowAddProducto] = useState(false);
    const [editingProductoId, setEditingProductoId] = useState<string | null>(null);
    const [productoForm, setProductoForm] = useState({ tipo: '', cantidad: '', descripcion: '' });

    // Proveedores editing
    const [showAddProveedor, setShowAddProveedor] = useState(false);

    // Costos - expandir task para ver ítems
    const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
    const [editingProveedorId, setEditingProveedorId] = useState<string | null>(null);
    const [proveedorForm, setProveedorForm] = useState({
        nombre: '', servicio: '', ubicacion: '', contacto: '',
        // Cotización
        cotizacion_descripcion: '',
        cotizacion_cantidad: '',
        cotizacion_precio: '', // Precio ingresado (puede ser unitario o total)
        cotizacion_es_precio_unitario: true, // true = precio unitario, false = precio total
        cotizacion_precio_unitario: '', // Calculado
        cotizacion_precio_total: '', // Calculado
        cotizacion_incluye_igv: false,
        cotizacion_tiempo_entrega: '',
        cotizacion_notas: '',
        elegido: false
    });
    const [proveedorSearch, setProveedorSearch] = useState('');

    // Costos editing
    const [showAddCosto, setShowAddCosto] = useState(false);
    const [editingCostoIndex, setEditingCostoIndex] = useState<number | null>(null);
    const [costoForm, setCostoForm] = useState({ concepto: '', monto: '', incluye_igv: false });

    const tasksCompletados = (pkl.tasks || []).filter(t => t.estado === 'completado').length;
    const tasksTotal = (pkl.tasks || []).length;
    const progreso = tasksTotal > 0 ? (tasksCompletados / tasksTotal) * 100 : 0;

    // Calcular precios de cotización automáticamente
    const calcularPreciosCotizacion = (cantidad: string, precio: string, esPrecioUnitario: boolean) => {
        const cant = parseFloat(cantidad) || 0;
        const precioNum = parseFloat(precio) || 0;

        if (cant > 0 && precioNum > 0) {
            if (esPrecioUnitario) {
                // Precio es unitario -> multiplicar para obtener total
                return {
                    precio_unitario: precioNum.toFixed(2),
                    precio_total: (cant * precioNum).toFixed(2)
                };
            } else {
                // Precio es total -> dividir para obtener unitario
                return {
                    precio_unitario: (precioNum / cant).toFixed(2),
                    precio_total: precioNum.toFixed(2)
                };
            }
        }
        return { precio_unitario: '', precio_total: '' };
    };

    // Actualizar cantidad y recalcular precios
    const handleCotizacionCantidadChange = (value: string) => {
        const precios = calcularPreciosCotizacion(value, proveedorForm.cotizacion_precio, proveedorForm.cotizacion_es_precio_unitario);
        setProveedorForm({
            ...proveedorForm,
            cotizacion_cantidad: value,
            cotizacion_precio_unitario: precios.precio_unitario || proveedorForm.cotizacion_precio_unitario,
            cotizacion_precio_total: precios.precio_total || proveedorForm.cotizacion_precio_total
        });
    };

    // Actualizar precio y recalcular
    const handleCotizacionPrecioChange = (value: string) => {
        const precios = calcularPreciosCotizacion(proveedorForm.cotizacion_cantidad, value, proveedorForm.cotizacion_es_precio_unitario);
        setProveedorForm({
            ...proveedorForm,
            cotizacion_precio: value,
            cotizacion_precio_unitario: precios.precio_unitario || proveedorForm.cotizacion_precio_unitario,
            cotizacion_precio_total: precios.precio_total || proveedorForm.cotizacion_precio_total
        });
    };

    // Cambiar tipo de precio (unitario/total) y recalcular
    const handleTipoPrecioChange = (esPrecioUnitario: boolean) => {
        const precios = calcularPreciosCotizacion(proveedorForm.cotizacion_cantidad, proveedorForm.cotizacion_precio, esPrecioUnitario);
        setProveedorForm({
            ...proveedorForm,
            cotizacion_es_precio_unitario: esPrecioUnitario,
            cotizacion_precio_unitario: precios.precio_unitario || proveedorForm.cotizacion_precio_unitario,
            cotizacion_precio_total: precios.precio_total || proveedorForm.cotizacion_precio_total
        });
    };

    const handleSaveObs = () => {
        onUpdate({ observaciones: obsValue } as any);
        setEditingObs(false);
    };

    // Producto handlers
    const handleAddProducto = () => {
        if (!productoForm.tipo.trim()) return;
        const newProducto = {
            producto_id: `PROD-${Date.now()}`,
            tipo: productoForm.tipo.trim(),
            cantidad: productoForm.cantidad ? parseInt(productoForm.cantidad) : undefined,
            descripcion: productoForm.descripcion.trim()
        };
        onUpdate({ productos: [...pkl.productos, newProducto] } as any);
        setProductoForm({ tipo: '', cantidad: '', descripcion: '' });
        setShowAddProducto(false);
    };

    const handleEditProducto = (prod: typeof pkl.productos[0]) => {
        setEditingProductoId(prod.producto_id);
        setProductoForm({
            tipo: prod.tipo,
            cantidad: prod.cantidad?.toString() || '',
            descripcion: prod.descripcion
        });
    };

    const handleSaveProducto = () => {
        if (!editingProductoId) return;
        const updated = (pkl.productos || []).map(p =>
            p.producto_id === editingProductoId
                ? { ...p, tipo: productoForm.tipo, cantidad: productoForm.cantidad ? parseInt(productoForm.cantidad) : undefined, descripcion: productoForm.descripcion }
                : p
        );
        onUpdate({ productos: updated } as any);
        setEditingProductoId(null);
        setProductoForm({ tipo: '', cantidad: '', descripcion: '' });
    };

    const handleDeleteProducto = (productoId: string) => {
        onUpdate({ productos: (pkl.productos || []).filter(p => p.producto_id !== productoId) } as any);
    };

    // Proveedor handlers
    const resetProveedorForm = () => {
        setProveedorForm({
            nombre: '', servicio: '', ubicacion: '', contacto: '',
            cotizacion_descripcion: '', cotizacion_cantidad: '', cotizacion_precio: '',
            cotizacion_es_precio_unitario: true, cotizacion_precio_unitario: '',
            cotizacion_precio_total: '', cotizacion_incluye_igv: false, cotizacion_tiempo_entrega: '',
            cotizacion_notas: '', elegido: false
        });
    };

    const handleAddProveedor = async () => {
        if (!proveedorForm.nombre.trim()) return;

        // Construir cotización si hay datos
        const tieneCotizacion = proveedorForm.cotizacion_descripcion.trim() || proveedorForm.cotizacion_precio_total;
        const cotizacion = tieneCotizacion ? {
            descripcion: proveedorForm.cotizacion_descripcion.trim(),
            cantidad: proveedorForm.cotizacion_cantidad ? parseInt(proveedorForm.cotizacion_cantidad) : undefined,
            precio_unitario: proveedorForm.cotizacion_precio_unitario ? parseFloat(proveedorForm.cotizacion_precio_unitario) : undefined,
            precio_total: parseFloat(proveedorForm.cotizacion_precio_total) || 0,
            incluye_igv: proveedorForm.cotizacion_incluye_igv,
            tiempo_entrega: proveedorForm.cotizacion_tiempo_entrega.trim() || undefined,
            notas: proveedorForm.cotizacion_notas.trim() || undefined,
            fecha_cotizacion: new Date().toISOString().split('T')[0]
        } : undefined;

        // Buscar si ya existe un proveedor con el mismo nombre en el PKL
        const nombreNormalizado = proveedorForm.nombre.trim().toLowerCase();
        const proveedorExistente = (pkl.proveedores || []).find(
            p => p.nombre.toLowerCase() === nombreNormalizado
        );

        if (proveedorExistente && cotizacion) {
            // Agregar cotización al proveedor existente
            const cotizacionesActuales = proveedorExistente.cotizaciones ||
                (proveedorExistente.cotizacion ? [proveedorExistente.cotizacion] : []);

            const proveedoresActualizados = (pkl.proveedores || []).map(p => {
                if (p.proveedor_id === proveedorExistente.proveedor_id) {
                    return {
                        ...p,
                        cotizaciones: [...cotizacionesActuales, cotizacion],
                        cotizacion: undefined, // Migrar a cotizaciones[]
                        elegido: proveedorForm.elegido || p.elegido,
                        // Actualizar datos si se proporcionaron nuevos
                        servicio: proveedorForm.servicio.trim() || p.servicio,
                        ubicacion: proveedorForm.ubicacion.trim() || p.ubicacion,
                        contacto: proveedorForm.contacto.trim() || p.contacto
                    };
                }
                return p;
            });
            onUpdate({ proveedores: proveedoresActualizados } as any);
            console.log('✅ Cotización agregada a proveedor existente:', proveedorExistente.nombre);
        } else {
            // Crear nuevo proveedor
            const newProveedor = {
                proveedor_id: `PROV-${Date.now()}`,
                nombre: proveedorForm.nombre.trim(),
                servicio: proveedorForm.servicio.trim(),
                ubicacion: proveedorForm.ubicacion.trim(),
                contacto: proveedorForm.contacto.trim(),
                cotizaciones: cotizacion ? [cotizacion] : [],
                elegido: proveedorForm.elegido
            };
            onUpdate({ proveedores: [...(pkl.proveedores || []), newProveedor] } as any);
        }

        // Si el proveedor está elegido y tiene cotización, sincronizar con task de cotización
        // NOTA: Las cotizaciones NO deben sumarse a costos - esto se maneja en el segundo fix
        if (proveedorForm.elegido && cotizacion && cotizacion.precio_total > 0 && onUpdateTask) {
            const taskCotizacion = localTasks.find(t => t.tipo === 'cotizacion');
            if (taskCotizacion) {
                // Solo actualizar el proveedor en el task, NO el costo
                await onUpdateTask(pkl.pkl_id, taskCotizacion.task_id, {
                    proveedor: proveedorForm.nombre.trim(),
                    cantidad: cotizacion.cantidad,
                    precioUnitario: cotizacion.precio_unitario,
                    incluyeIgv: cotizacion.incluye_igv
                });
                setLocalTasks(prev => prev.map(t =>
                    t.task_id === taskCotizacion.task_id
                        ? {
                            ...t,
                            proveedor: proveedorForm.nombre.trim()
                        }
                        : t
                ));
                console.log('✅ Task de cotización sincronizado con proveedor elegido:', proveedorForm.nombre);
            }
        }

        resetProveedorForm();
        setShowAddProveedor(false);
        setProveedorSearch('');
    };

    const handleEditProveedor = (prov: typeof pkl.proveedores[0]) => {
        setEditingProveedorId(prov.proveedor_id);

        // Primero intentar cargar datos de cotizacion del proveedor
        let cotizacionData = prov.cotizacion;

        // DEBUG: Ver qué datos tiene el proveedor
        console.log('🔍 handleEditProveedor llamado para:', prov.nombre);
        console.log('🔍 cotizacion existente:', prov.cotizacion);
        // Usar pkl.tasks directamente (más fiable que localTasks)
        const tasksToSearch = pkl.tasks || [];
        console.log('🔍 pkl.tasks disponibles:', tasksToSearch.length);

        // Si el proveedor no tiene cotización guardada, buscar en los tasks
        if (!cotizacionData || !cotizacionData.precio_total) {
            console.log('🔍 No hay cotizacion guardada, buscando en tasks...');
            // Buscar CUALQUIER task que tenga costo y coincida con el proveedor
            const provNombreLower = prov.nombre.toLowerCase().trim();
            // Crear variantes del nombre (Patricia -> Pat, Patty, etc.)
            const nombreCorto3 = provNombreLower.substring(0, 3); // "pat" para Patricia

            console.log('🔍 Buscando con nombreCorto3:', nombreCorto3);

            // DEBUG: Mostrar todos los tasks con sus costos
            tasksToSearch.forEach((t, i) => {
                const taskCosto = getCostoMonto(t.costo);
                console.log(`🔍 Task[${i}]: "${t.nombre}" - costo: ${taskCosto} - proveedor: "${t.proveedor || 'N/A'}"`);
            });

            const taskDelProveedor = tasksToSearch.find(t => {
                // El task debe tener un costo (usar getCostoMonto para consistencia)
                const taskCosto = getCostoMonto(t.costo);
                if (taskCosto <= 0) {
                    console.log(`🔍 Task "${t.nombre}" descartado: costo <= 0 (costo raw:`, t.costo, ')');
                    return false;
                }

                // Verificar si el proveedor del task coincide
                const proveedorTask = t.proveedor?.toLowerCase().trim() || '';
                if (proveedorTask === provNombreLower) {
                    console.log(`🔍 Task "${t.nombre}" coincide: proveedor exacto`);
                    return true;
                }
                if (proveedorTask.startsWith(nombreCorto3)) {
                    console.log(`🔍 Task "${t.nombre}" coincide: proveedor empieza con ${nombreCorto3}`);
                    return true;
                }
                if (provNombreLower.startsWith(proveedorTask.substring(0, 3)) && proveedorTask.length >= 3) {
                    console.log(`🔍 Task "${t.nombre}" coincide: nombre proveedor empieza con prefijo del task`);
                    return true;
                }

                // Verificar si el nombre del task contiene el nombre del proveedor o variantes
                const nombreTaskLower = t.nombre?.toLowerCase() || '';
                if (nombreTaskLower.includes(provNombreLower)) {
                    console.log(`🔍 Task "${t.nombre}" coincide: nombre contiene ${provNombreLower}`);
                    return true;
                }
                if (nombreTaskLower.includes(nombreCorto3)) {
                    console.log(`🔍 Task "${t.nombre}" coincide: nombre contiene ${nombreCorto3}`);
                    return true;
                }
                // Extraer palabras del nombre del task y ver si alguna coincide
                const palabrasTask = nombreTaskLower.split(/\s+/);
                for (const palabra of palabrasTask) {
                    if (palabra.length >= 3) {
                        // Si la palabra empieza igual que el proveedor (pat === pat)
                        if (palabra.startsWith(nombreCorto3)) return true;
                        if (provNombreLower.startsWith(palabra.substring(0, 3))) return true;
                    }
                }

                // Verificar en items_cotizacion si existe
                if ((t as any).items_cotizacion?.some((item: any) =>
                    item.descripcion?.toLowerCase().includes(provNombreLower) ||
                    item.descripcion?.toLowerCase().includes(nombreCorto3)
                )) return true;

                return false;
            });

            if (taskDelProveedor) {
                // Extraer datos del task (usar getCostoMonto para consistencia)
                const monto = getCostoMonto(taskDelProveedor.costo);
                console.log('✅ Task encontrado:', taskDelProveedor.nombre, '- monto:', monto);

                // Verificar si tiene items_cotizacion
                const items = (taskDelProveedor as any).items_cotizacion;
                if (items && items.length > 0) {
                    const totalCant = items.reduce((sum: number, i: any) => sum + (i.cantidad || 0), 0);
                    const totalPrecio = items.reduce((sum: number, i: any) => sum + (i.precio_total || 0), 0);
                    cotizacionData = {
                        descripcion: items.map((i: any) => i.descripcion).join(', '),
                        cantidad: totalCant,
                        precio_unitario: totalCant > 0 ? totalPrecio / totalCant : undefined,
                        precio_total: totalPrecio || monto,
                        incluye_igv: items[0]?.incluye_igv || false,
                        tiempo_entrega: undefined,
                        notas: taskDelProveedor.descripcion || undefined
                    };
                } else {
                    cotizacionData = {
                        descripcion: taskDelProveedor.nombre || '',
                        cantidad: taskDelProveedor.cantidad,
                        precio_unitario: taskDelProveedor.precioUnitario,
                        precio_total: monto,
                        incluye_igv: taskDelProveedor.incluyeIgv || false,
                        tiempo_entrega: undefined,
                        notas: taskDelProveedor.descripcion || undefined
                    };
                }
                console.log('📋 Cargando datos desde task:', taskDelProveedor.nombre, '→', cotizacionData);
            } else {
                console.log('❌ No se encontró ningún task que coincida con:', prov.nombre);
            }
        }

        // Si tiene precio_unitario, usar ese como precio y marcar como unitario
        const precioUnitario = cotizacionData?.precio_unitario?.toString() || '';
        const precioTotal = cotizacionData?.precio_total?.toString() || '';
        setProveedorForm({
            nombre: prov.nombre,
            servicio: prov.servicio || '',
            ubicacion: prov.ubicacion || '',
            contacto: prov.contacto || '',
            cotizacion_descripcion: cotizacionData?.descripcion || '',
            cotizacion_cantidad: cotizacionData?.cantidad?.toString() || '',
            cotizacion_precio: precioUnitario || precioTotal, // Usar unitario si existe, sino total
            cotizacion_es_precio_unitario: !!precioUnitario, // true si tiene unitario
            cotizacion_precio_unitario: precioUnitario,
            cotizacion_precio_total: precioTotal,
            cotizacion_incluye_igv: cotizacionData?.incluye_igv || false,
            cotizacion_tiempo_entrega: cotizacionData?.tiempo_entrega || '',
            cotizacion_notas: cotizacionData?.notas || '',
            elegido: prov.elegido || false
        });
        console.log('📝 Formulario establecido - precioTotal:', precioTotal, 'precioUnitario:', precioUnitario);
    };

    const handleSaveProveedor = async () => {
        if (!editingProveedorId) return;

        // Construir cotización si hay datos
        const tieneCotizacion = proveedorForm.cotizacion_descripcion.trim() || proveedorForm.cotizacion_precio_total;
        const cotizacion = tieneCotizacion ? {
            descripcion: proveedorForm.cotizacion_descripcion.trim(),
            cantidad: proveedorForm.cotizacion_cantidad ? parseInt(proveedorForm.cotizacion_cantidad) : undefined,
            precio_unitario: proveedorForm.cotizacion_precio_unitario ? parseFloat(proveedorForm.cotizacion_precio_unitario) : undefined,
            precio_total: parseFloat(proveedorForm.cotizacion_precio_total) || 0,
            incluye_igv: proveedorForm.cotizacion_incluye_igv,
            tiempo_entrega: proveedorForm.cotizacion_tiempo_entrega.trim() || undefined,
            notas: proveedorForm.cotizacion_notas.trim() || undefined
        } : undefined;

        const updated = (pkl.proveedores || []).map(p =>
            p.proveedor_id === editingProveedorId
                ? {
                    ...p,
                    nombre: proveedorForm.nombre,
                    servicio: proveedorForm.servicio,
                    ubicacion: proveedorForm.ubicacion,
                    contacto: proveedorForm.contacto,
                    cotizacion,
                    elegido: proveedorForm.elegido
                }
                : p
        );
        onUpdate({ proveedores: updated } as any);

        // Si el proveedor está elegido y tiene cotización, sincronizar con task de cotización
        if (proveedorForm.elegido && cotizacion && cotizacion.precio_total > 0 && onUpdateTask) {
            // Buscar task de tipo cotización para actualizar su costo
            const taskCotizacion = localTasks.find(t => t.tipo === 'cotizacion');
            if (taskCotizacion) {
                // Actualizar el task con el costo del proveedor elegido
                await onUpdateTask(pkl.pkl_id, taskCotizacion.task_id, {
                    costo: {
                        monto: cotizacion.precio_total,
                        moneda: 'PEN',
                        incluye_igv: cotizacion.incluye_igv
                    },
                    proveedor: proveedorForm.nombre,
                    cantidad: cotizacion.cantidad,
                    precioUnitario: cotizacion.precio_unitario,
                    incluyeIgv: cotizacion.incluye_igv
                });
                // Actualizar estado local
                setLocalTasks(prev => prev.map(t =>
                    t.task_id === taskCotizacion.task_id
                        ? {
                            ...t,
                            costo: { monto: cotizacion.precio_total, moneda: 'PEN', incluye_igv: cotizacion.incluye_igv },
                            proveedor: proveedorForm.nombre
                        }
                        : t
                ));
                console.log('✅ Task de cotización sincronizado con proveedor elegido:', proveedorForm.nombre, cotizacion.precio_total);
            }
        }

        setEditingProveedorId(null);
        resetProveedorForm();
    };

    const handleDeleteProveedor = (proveedorId: string) => {
        onUpdate({ proveedores: (pkl.proveedores || []).filter(p => p.proveedor_id !== proveedorId) } as any);
    };

    const handleSelectProveedorFromDB = (prov: typeof proveedoresDB[string]) => {
        setProveedorForm({
            ...proveedorForm,
            nombre: prov.nombre,
            servicio: prov.especialidad || '',
            ubicacion: prov.direccion || '',
            contacto: prov.telefono || ''
        });
        setProveedorSearch('');
    };

    // Marcar/desmarcar proveedor como elegido
    const handleToggleElegido = async (proveedorId: string) => {
        const proveedor = (pkl.proveedores || []).find(p => p.proveedor_id === proveedorId);
        const nuevoEstadoElegido = proveedor ? !proveedor.elegido : false;

        const updated = (pkl.proveedores || []).map(p => ({
            ...p,
            elegido: p.proveedor_id === proveedorId ? nuevoEstadoElegido : p.elegido
        }));
        onUpdate({ proveedores: updated } as any);

        // Si el proveedor se marca como elegido y tiene cotización, sincronizar con task
        if (nuevoEstadoElegido && proveedor?.cotizacion && proveedor.cotizacion.precio_total > 0 && onUpdateTask) {
            const taskCotizacion = localTasks.find(t => t.tipo === 'cotizacion');
            if (taskCotizacion) {
                await onUpdateTask(pkl.pkl_id, taskCotizacion.task_id, {
                    costo: {
                        monto: proveedor.cotizacion.precio_total,
                        moneda: 'PEN',
                        incluye_igv: proveedor.cotizacion.incluye_igv
                    },
                    proveedor: proveedor.nombre,
                    cantidad: proveedor.cotizacion.cantidad,
                    precioUnitario: proveedor.cotizacion.precio_unitario,
                    incluyeIgv: proveedor.cotizacion.incluye_igv
                });
                setLocalTasks(prev => prev.map(t =>
                    t.task_id === taskCotizacion.task_id
                        ? {
                            ...t,
                            costo: { monto: proveedor.cotizacion!.precio_total, moneda: 'PEN', incluye_igv: proveedor.cotizacion!.incluye_igv },
                            proveedor: proveedor.nombre
                        }
                        : t
                ));
                console.log('✅ Task de cotización sincronizado al elegir proveedor:', proveedor.nombre, proveedor.cotizacion.precio_total);
            }
        }
    };

    // Filter proveedores from DB for autocomplete
    const filteredProveedoresDB = proveedorSearch.length >= 2
        ? Object.values(proveedoresDB).filter(p =>
            p.nombre.toLowerCase().includes(proveedorSearch.toLowerCase()) ||
            (p.especialidad && p.especialidad.toLowerCase().includes(proveedorSearch.toLowerCase()))
          ).slice(0, 5)
        : [];

    // Costos handlers
    const handleAddCosto = () => {
        if (!costoForm.concepto.trim() || !costoForm.monto) return;
        const newCosto = {
            concepto: costoForm.concepto.trim(),
            monto: parseFloat(costoForm.monto) || 0,
            incluye_igv: costoForm.incluye_igv
        };
        const currentDetalle = pkl.costos?.detalle || [];
        const newDetalle = [...currentDetalle, newCosto];
        const newTotal = newDetalle.reduce((sum, d) => sum + d.monto, 0);
        onUpdate({ costos: { ...pkl.costos, detalle: newDetalle, total: newTotal } } as any);
        setCostoForm({ concepto: '', monto: '', incluye_igv: false });
        setShowAddCosto(false);
    };

    const handleEditCosto = (index: number) => {
        const costo = (pkl.costos?.detalle || [])[index];
        if (!costo) return;
        setEditingCostoIndex(index);
        setCostoForm({ concepto: costo.concepto, monto: costo.monto.toString(), incluye_igv: costo.incluye_igv || false });
    };

    const handleSaveCosto = () => {
        if (editingCostoIndex === null) return;
        const currentDetalle = pkl.costos?.detalle || [];
        const newDetalle = [...currentDetalle];
        newDetalle[editingCostoIndex] = {
            ...newDetalle[editingCostoIndex],
            concepto: costoForm.concepto,
            monto: parseFloat(costoForm.monto) || 0,
            incluye_igv: costoForm.incluye_igv
        };
        const newTotal = newDetalle.reduce((sum, d) => sum + d.monto, 0);
        onUpdate({ costos: { ...pkl.costos, detalle: newDetalle, total: newTotal } } as any);
        setEditingCostoIndex(null);
        setCostoForm({ concepto: '', monto: '', incluye_igv: false });
    };

    const handleDeleteCosto = (index: number) => {
        const newDetalle = (pkl.costos?.detalle || []).filter((_, i) => i !== index);
        const newTotal = newDetalle.reduce((sum, d) => sum + d.monto, 0);
        onUpdate({ costos: { ...pkl.costos, detalle: newDetalle, total: newTotal } } as any);
    };

    return (
        <div className="space-y-6">
            {/* Progress */}
            <div>
                <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-600 dark:text-gray-400">Progreso</span>
                    <span className="text-gray-900 dark:text-white">{tasksCompletados}/{tasksTotal}</span>
                </div>
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-gradient-to-r from-cyan-500 to-emerald-500 transition-all duration-500"
                        style={{ width: `${progreso}%` }}
                    />
                </div>
            </div>

            {/* Info Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Productos */}
                <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                        <h4 className="text-gray-700 dark:text-gray-400 text-sm font-medium">Productos</h4>
                        <button
                            onClick={() => setShowAddProducto(true)}
                            className="px-3 py-1.5 bg-cyan-700 hover:bg-cyan-600 !text-white text-sm font-medium rounded transition-colors"
                        >
                            + Agregar
                        </button>
                    </div>

                    {/* Add Producto Form */}
                    {showAddProducto && (
                        <div className="mb-4 p-3 bg-white dark:bg-gray-800 rounded-lg border border-cyan-500/30 space-y-2">
                            <input
                                type="text"
                                value={productoForm.tipo}
                                onChange={e => setProductoForm({ ...productoForm, tipo: e.target.value })}
                                placeholder="Tipo de producto (ej: Polos, Lanyards...)"
                                className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-gray-900 dark:text-white text-sm outline-none focus:border-cyan-500"
                                autoFocus
                            />
                            <div className="flex gap-2">
                                <input
                                    type="number"
                                    value={productoForm.cantidad}
                                    onChange={e => setProductoForm({ ...productoForm, cantidad: e.target.value })}
                                    placeholder="Cantidad"
                                    className="w-24 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-gray-900 dark:text-white text-sm outline-none focus:border-cyan-500"
                                />
                                <input
                                    type="text"
                                    value={productoForm.descripcion}
                                    onChange={e => setProductoForm({ ...productoForm, descripcion: e.target.value })}
                                    placeholder="Descripcion detallada"
                                    className="flex-1 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-gray-900 dark:text-white text-sm outline-none focus:border-cyan-500"
                                />
                            </div>
                            <div className="flex gap-2 justify-end">
                                <button onClick={() => { setShowAddProducto(false); setProductoForm({ tipo: '', cantidad: '', descripcion: '' }); }} className="px-3 py-1 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-white text-xs rounded">Cancelar</button>
                                <button onClick={handleAddProducto} className="px-3 py-1 bg-cyan-600 hover:bg-cyan-500 text-white text-xs rounded">Guardar</button>
                            </div>
                        </div>
                    )}

                    {(pkl.productos || []).length === 0 ? (
                        <div className="text-gray-500 dark:text-gray-600 dark:text-gray-500 italic text-sm py-4 text-center">Sin productos agregados</div>
                    ) : (pkl.productos || []).map(prod => (
                        <div key={prod.producto_id} className="mb-3 p-3 bg-gray-100 dark:bg-gray-800/50 rounded-lg group hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors">
                            {editingProductoId === prod.producto_id ? (
                                <div className="space-y-2">
                                    <input
                                        type="text"
                                        value={productoForm.tipo}
                                        onChange={e => setProductoForm({ ...productoForm, tipo: e.target.value })}
                                        className="w-full bg-gray-50 dark:bg-gray-700 border border-cyan-500 rounded px-2 py-1 text-gray-900 dark:text-white text-sm outline-none"
                                        autoFocus
                                    />
                                    <div className="flex gap-2">
                                        <input
                                            type="number"
                                            value={productoForm.cantidad}
                                            onChange={e => setProductoForm({ ...productoForm, cantidad: e.target.value })}
                                            placeholder="Cant"
                                            className="w-20 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-gray-900 dark:text-white text-sm outline-none"
                                        />
                                        <input
                                            type="text"
                                            value={productoForm.descripcion}
                                            onChange={e => setProductoForm({ ...productoForm, descripcion: e.target.value })}
                                            className="flex-1 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-gray-900 dark:text-white text-sm outline-none"
                                        />
                                    </div>
                                    <div className="flex gap-2 justify-end">
                                        <button onClick={() => { setEditingProductoId(null); setProductoForm({ tipo: '', cantidad: '', descripcion: '' }); }} className="px-2 py-1 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-white text-xs rounded">Cancelar</button>
                                        <button onClick={handleSaveProducto} className="px-2 py-1 bg-cyan-600 hover:bg-cyan-500 text-white text-xs rounded">Guardar</button>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <div className="text-gray-900 dark:text-white font-medium">{prod.tipo}</div>
                                        <div className="text-gray-800 dark:text-gray-400 text-sm">
                                            {prod.cantidad && <span className="text-cyan-400">Cant: {prod.cantidad}</span>}
                                            {prod.cantidad && prod.descripcion && ' - '}
                                            {prod.descripcion}
                                        </div>
                                    </div>
                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => handleEditProducto(prod)} className="p-1 hover:bg-gray-700 rounded text-gray-400 hover:text-cyan-400" title="Editar">✏️</button>
                                        <button onClick={() => handleDeleteProducto(prod.producto_id)} className="p-1 hover:bg-gray-700 rounded text-gray-400 hover:text-red-400" title="Eliminar">🗑️</button>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                {/* Proveedores */}
                <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                        <h4 className="text-gray-700 dark:text-gray-400 text-sm font-medium">Proveedores</h4>
                        <button
                            onClick={() => setShowAddProveedor(true)}
                            className="px-3 py-1.5 bg-purple-700 hover:bg-purple-600 !text-white text-sm font-medium rounded transition-colors"
                        >
                            + Agregar
                        </button>
                    </div>

                    {/* Add Proveedor Form */}
                    {showAddProveedor && (
                        <div
                            className="mb-4 p-3 bg-white dark:bg-gray-800 rounded-lg border border-purple-500/30 space-y-2"
                            onKeyDown={(e) => {
                                if (e.key === 'Escape') {
                                    setShowAddProveedor(false);
                                    resetProveedorForm();
                                    setProveedorSearch('');
                                }
                            }}
                        >
                            {/* Header con botón cerrar */}
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-purple-400 text-sm font-medium">Agregar Proveedor</span>
                                <button
                                    onClick={() => { setShowAddProveedor(false); resetProveedorForm(); setProveedorSearch(''); }}
                                    className="text-gray-400 hover:text-white text-lg leading-none"
                                    title="Cerrar (ESC)"
                                >
                                    ×
                                </button>
                            </div>
                            <div className="relative">
                                <input
                                    type="text"
                                    value={proveedorSearch || proveedorForm.nombre}
                                    onChange={e => {
                                        setProveedorSearch(e.target.value);
                                        setProveedorForm({ ...proveedorForm, nombre: e.target.value });
                                    }}
                                    onBlur={() => {
                                        // Cerrar dropdown después de un pequeño delay para permitir clicks
                                        setTimeout(() => setProveedorSearch(''), 200);
                                    }}
                                    placeholder="Buscar o escribir nombre del proveedor..."
                                    className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-gray-900 dark:text-white text-sm outline-none focus:border-purple-500"
                                    autoFocus
                                />
                                {/* Autocomplete dropdown */}
                                {proveedorSearch.length >= 2 && (
                                    <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-xl z-10 max-h-48 overflow-y-auto">
                                        {filteredProveedoresDB.length > 0 ? (
                                            filteredProveedoresDB.map(prov => (
                                                <button
                                                    key={prov.nombre}
                                                    onClick={() => handleSelectProveedorFromDB(prov)}
                                                    className="w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                                >
                                                    <div className="text-gray-900 dark:text-white text-sm font-medium">{prov.nombre}</div>
                                                    <div className="text-gray-500 dark:text-gray-400 text-xs">{prov.especialidad} {prov.direccion && `| ${prov.direccion}`}</div>
                                                </button>
                                            ))
                                        ) : (
                                            <div className="px-3 py-3 text-center">
                                                <div className="text-gray-500 dark:text-gray-400 text-sm mb-2">
                                                    No se encontró "{proveedorSearch}" en la base de datos
                                                </div>
                                                <div className="text-purple-600 dark:text-purple-400 text-xs">
                                                    Completa los datos y guarda para crear nuevo proveedor
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                            <input
                                type="text"
                                value={proveedorForm.servicio}
                                onChange={e => setProveedorForm({ ...proveedorForm, servicio: e.target.value })}
                                placeholder="Servicio (ej: Bordado, Sublimado...)"
                                className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-gray-900 dark:text-white text-sm outline-none focus:border-purple-500"
                            />
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={proveedorForm.ubicacion}
                                    onChange={e => setProveedorForm({ ...proveedorForm, ubicacion: e.target.value })}
                                    placeholder="Ubicacion"
                                    className="flex-1 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-gray-900 dark:text-white text-sm outline-none focus:border-purple-500"
                                />
                                <input
                                    type="text"
                                    value={proveedorForm.contacto}
                                    onChange={e => setProveedorForm({ ...proveedorForm, contacto: e.target.value })}
                                    placeholder="Contacto/Telefono"
                                    className="flex-1 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-gray-900 dark:text-white text-sm outline-none focus:border-purple-500"
                                />
                            </div>

                            {/* Sección de Cotización */}
                            <div className="border-t border-cyan-500/30 pt-3 mt-2">
                                <div className="text-cyan-400 text-xs font-medium mb-2">💬 Cotización (opcional)</div>
                                <input
                                    type="text"
                                    value={proveedorForm.cotizacion_descripcion}
                                    onChange={e => setProveedorForm({ ...proveedorForm, cotizacion_descripcion: e.target.value })}
                                    placeholder="¿Qué se cotizó? (ej: 50 polos sublimados)"
                                    className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-gray-900 dark:text-white text-sm outline-none focus:border-purple-500 mb-2"
                                />
                                <div className="flex gap-2 mb-2 items-center flex-wrap">
                                    <div className="flex items-center gap-1">
                                        <span className="text-gray-400 text-xs">Cant:</span>
                                        <input
                                            type="number"
                                            value={proveedorForm.cotizacion_cantidad}
                                            onChange={e => handleCotizacionCantidadChange(e.target.value)}
                                            placeholder="Cantidad"
                                            className="w-16 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded px-2 py-2 text-gray-900 dark:text-white text-sm outline-none focus:border-purple-500"
                                        />
                                    </div>
                                    <span className="text-gray-400">×</span>
                                    <div className="flex items-center gap-1">
                                        <span className="text-gray-400 text-xs">S/.</span>
                                        <input
                                            type="number"
                                            value={proveedorForm.cotizacion_precio}
                                            onChange={e => handleCotizacionPrecioChange(e.target.value)}
                                            placeholder="Precio"
                                            step="0.01"
                                            className="w-20 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded px-2 py-2 text-gray-900 dark:text-white text-sm outline-none focus:border-purple-500"
                                        />
                                    </div>
                                    <select
                                        value={proveedorForm.cotizacion_es_precio_unitario ? 'unitario' : 'total'}
                                        onChange={e => handleTipoPrecioChange(e.target.value === 'unitario')}
                                        className="bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded px-2 py-2 text-gray-900 dark:text-white text-xs outline-none focus:border-purple-500"
                                    >
                                        <option value="unitario">c/u</option>
                                        <option value="total">total</option>
                                    </select>
                                    <span className="text-gray-400">=</span>
                                    <div className="flex items-center gap-1">
                                        <span className="text-amber-400 font-bold text-sm">S/</span>
                                        <span className="text-amber-400 font-bold text-sm min-w-[60px]">
                                            {proveedorForm.cotizacion_precio_total || '0.00'}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex gap-2 mb-2">
                                    <input
                                        type="text"
                                        value={proveedorForm.cotizacion_tiempo_entrega}
                                        onChange={e => setProveedorForm({ ...proveedorForm, cotizacion_tiempo_entrega: e.target.value })}
                                        placeholder="Tiempo entrega (ej: 3 días)"
                                        className="flex-1 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded px-2 py-2 text-gray-900 dark:text-white text-sm outline-none focus:border-purple-500"
                                    />
                                    <label className="flex items-center gap-2 text-gray-400 text-xs cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={proveedorForm.cotizacion_incluye_igv}
                                            onChange={e => setProveedorForm({ ...proveedorForm, cotizacion_incluye_igv: e.target.checked })}
                                            className="w-4 h-4 rounded"
                                        />
                                        Incluye IGV
                                    </label>
                                </div>
                                <input
                                    type="text"
                                    value={proveedorForm.cotizacion_notas}
                                    onChange={e => setProveedorForm({ ...proveedorForm, cotizacion_notas: e.target.value })}
                                    placeholder="Notas adicionales..."
                                    className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-gray-900 dark:text-white text-sm outline-none focus:border-purple-500 mb-2"
                                />
                                <label className="flex items-center gap-2 text-emerald-400 text-sm cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={proveedorForm.elegido}
                                        onChange={e => setProveedorForm({ ...proveedorForm, elegido: e.target.checked })}
                                        className="w-4 h-4 rounded"
                                    />
                                    ✅ Proveedor elegido
                                </label>
                            </div>

                            <div className="flex gap-2 justify-end pt-2">
                                <button onClick={() => { setShowAddProveedor(false); resetProveedorForm(); setProveedorSearch(''); }} className="px-3 py-1.5 bg-gray-600 hover:bg-gray-500 text-white text-xs rounded font-medium">Cancelar</button>
                                <button onClick={handleAddProveedor} className="px-4 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white text-xs rounded font-medium">Guardar</button>
                            </div>
                        </div>
                    )}

                    {(pkl.proveedores || []).length === 0 ? (
                        <div className="text-gray-500 dark:text-gray-600 dark:text-gray-500 italic text-sm py-4 text-center">Sin proveedores asignados</div>
                    ) : (pkl.proveedores || []).map(prov => (
                        <div key={prov.proveedor_id} className={`mb-3 p-3 rounded-lg group transition-colors ${
                            prov.elegido
                                ? 'bg-emerald-500/10 border-2 border-emerald-500/50 hover:bg-emerald-500/20'
                                : 'bg-gray-100 dark:bg-gray-800/50 hover:bg-gray-200 dark:hover:bg-gray-800'
                        }`}>
                            {editingProveedorId === prov.proveedor_id ? (
                                <div className="space-y-2">
                                    <input
                                        type="text"
                                        value={proveedorForm.nombre}
                                        onChange={e => setProveedorForm({ ...proveedorForm, nombre: e.target.value })}
                                        placeholder="Nombre"
                                        className="w-full bg-gray-700 border border-purple-500 rounded px-2 py-1 text-white text-sm outline-none"
                                        autoFocus
                                    />
                                    <input
                                        type="text"
                                        value={proveedorForm.servicio}
                                        onChange={e => setProveedorForm({ ...proveedorForm, servicio: e.target.value })}
                                        placeholder="Servicio"
                                        className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-gray-900 dark:text-white text-sm outline-none"
                                    />
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={proveedorForm.ubicacion}
                                            onChange={e => setProveedorForm({ ...proveedorForm, ubicacion: e.target.value })}
                                            placeholder="Ubicacion"
                                            className="flex-1 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-gray-900 dark:text-white text-sm outline-none"
                                        />
                                        <input
                                            type="text"
                                            value={proveedorForm.contacto}
                                            onChange={e => setProveedorForm({ ...proveedorForm, contacto: e.target.value })}
                                            placeholder="Contacto"
                                            className="flex-1 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-gray-900 dark:text-white text-sm outline-none"
                                        />
                                    </div>

                                    {/* Cotización en edición */}
                                    <div className="border-t border-cyan-500/30 pt-2 mt-2">
                                        <div className="text-cyan-400 text-xs font-medium mb-2">💬 Cotización</div>
                                        <input
                                            type="text"
                                            value={proveedorForm.cotizacion_descripcion}
                                            onChange={e => setProveedorForm({ ...proveedorForm, cotizacion_descripcion: e.target.value })}
                                            placeholder="¿Qué se cotizó?"
                                            className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-gray-900 dark:text-white text-sm outline-none mb-2"
                                        />
                                        <div className="flex gap-2 mb-2 items-center flex-wrap">
                                            <input
                                                type="number"
                                                value={proveedorForm.cotizacion_cantidad}
                                                onChange={e => handleCotizacionCantidadChange(e.target.value)}
                                                placeholder="Cant."
                                                className="w-14 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-gray-900 dark:text-white text-sm outline-none"
                                            />
                                            <span className="text-gray-400 text-xs">×</span>
                                            <input
                                                type="number"
                                                value={proveedorForm.cotizacion_precio}
                                                onChange={e => handleCotizacionPrecioChange(e.target.value)}
                                                placeholder="Precio"
                                                step="0.01"
                                                className="w-20 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-gray-900 dark:text-white text-sm outline-none"
                                            />
                                            <select
                                                value={proveedorForm.cotizacion_es_precio_unitario ? 'unitario' : 'total'}
                                                onChange={e => handleTipoPrecioChange(e.target.value === 'unitario')}
                                                className="bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded px-1 py-1 text-gray-900 dark:text-white text-xs outline-none"
                                            >
                                                <option value="unitario">c/u</option>
                                                <option value="total">total</option>
                                            </select>
                                            <span className="text-gray-400 text-xs">=</span>
                                            <span className="text-amber-400 font-bold text-sm">S/ {proveedorForm.cotizacion_precio_total || '0.00'}</span>
                                        </div>
                                        <div className="flex gap-2 mb-2">
                                            <input
                                                type="text"
                                                value={proveedorForm.cotizacion_tiempo_entrega}
                                                onChange={e => setProveedorForm({ ...proveedorForm, cotizacion_tiempo_entrega: e.target.value })}
                                                placeholder="Tiempo entrega"
                                                className="flex-1 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-gray-900 dark:text-white text-sm outline-none"
                                            />
                                            <label className="flex items-center gap-1 text-gray-400 text-xs cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={proveedorForm.cotizacion_incluye_igv}
                                                    onChange={e => setProveedorForm({ ...proveedorForm, cotizacion_incluye_igv: e.target.checked })}
                                                    className="w-3 h-3 rounded"
                                                />
                                                +IGV
                                            </label>
                                        </div>
                                        <label className="flex items-center gap-2 text-emerald-400 text-sm cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={proveedorForm.elegido}
                                                onChange={e => setProveedorForm({ ...proveedorForm, elegido: e.target.checked })}
                                                className="w-4 h-4 rounded"
                                            />
                                            ✅ Elegido
                                        </label>
                                    </div>

                                    <div className="flex gap-2 justify-end pt-2">
                                        <button onClick={() => { setEditingProveedorId(null); resetProveedorForm(); }} className="px-3 py-1.5 bg-gray-600 hover:bg-gray-500 text-white text-xs rounded font-medium">Cancelar</button>
                                        <button onClick={handleSaveProveedor} className="px-4 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white text-xs rounded font-medium">Guardar</button>
                                    </div>
                                </div>
                            ) : (
                                <div>
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <div className="text-gray-900 dark:text-white font-medium flex items-center gap-2">
                                                {prov.elegido && <span className="text-emerald-400">✅</span>}
                                                <span className="text-purple-400">🏭</span>
                                                {prov.nombre}
                                                {prov.elegido && <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full">ELEGIDO</span>}
                                            </div>
                                            <div className="text-gray-800 dark:text-gray-400 text-sm mt-1">
                                                {prov.servicio && <span className="text-purple-300">{prov.servicio}</span>}
                                                {prov.servicio && prov.ubicacion && ' | '}
                                                {prov.ubicacion && <span>📍 {prov.ubicacion}</span>}
                                            </div>
                                            {prov.contacto && (
                                                <div className="text-gray-500 text-xs mt-1">📞 {prov.contacto}</div>
                                            )}
                                        </div>
                                        <div className="flex gap-1">
                                            <button
                                                onClick={() => handleToggleElegido(prov.proveedor_id)}
                                                className={`p-1.5 rounded transition-colors ${
                                                    prov.elegido
                                                        ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'
                                                        : 'hover:bg-gray-700 text-gray-400 hover:text-emerald-400'
                                                }`}
                                                title={prov.elegido ? 'Quitar selección' : 'Marcar como elegido'}
                                            >
                                                {prov.elegido ? '✅' : '☑️'}
                                            </button>
                                            <button onClick={() => handleEditProveedor(prov)} className="p-1 hover:bg-gray-700 rounded text-gray-400 hover:text-purple-400" title="Editar">✏️</button>
                                            <button onClick={() => handleDeleteProveedor(prov.proveedor_id)} className="p-1 hover:bg-gray-700 rounded text-gray-400 hover:text-red-400" title="Eliminar">🗑️</button>
                                        </div>
                                    </div>

                                    {/* Mostrar cotizaciones (array o singular para backward compat) */}
                                    {(() => {
                                        // Obtener todas las cotizaciones (backward compatible)
                                        const cotizaciones = prov.cotizaciones ||
                                            (prov.cotizacion ? [prov.cotizacion] : []);
                                        if (cotizaciones.length === 0) return null;

                                        return (
                                            <div className="mt-2 pt-2 border-t border-gray-700/50">
                                                <div className="text-cyan-400 text-xs font-medium mb-1">
                                                    💬 Cotizaciones ({cotizaciones.length}):
                                                </div>
                                                <div className="space-y-2">
                                                    {cotizaciones.map((cot, idx) => (
                                                        <div key={idx} className="bg-gray-800/30 rounded p-2">
                                                            <div className="text-gray-300 text-sm">{cot.descripcion}</div>
                                                            <div className="flex items-center gap-3 mt-1 text-xs flex-wrap">
                                                                {cot.cantidad && cot.precio_unitario && (
                                                                    <span className="text-gray-400">
                                                                        {cot.cantidad} × S/ {cot.precio_unitario.toFixed(2)}
                                                                    </span>
                                                                )}
                                                                <span className="text-amber-400 font-bold">
                                                                    Total: S/ {cot.precio_total.toFixed(2)}
                                                                    {cot.incluye_igv && <span className="text-gray-500 ml-1">(inc. IGV)</span>}
                                                                </span>
                                                                {cot.tiempo_entrega && (
                                                                    <span className="text-gray-500">⏱ {cot.tiempo_entrega}</span>
                                                                )}
                                                            </div>
                                                            {cot.notas && (
                                                                <div className="text-gray-500 text-xs mt-1 italic">📝 {cot.notas}</div>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        );
                                    })()}
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                {/* Estado History */}
                <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4">
                    <h4 className="text-gray-600 dark:text-gray-400 text-sm mb-3">Historial de Estados</h4>
                    <div className="space-y-2">
                        {pkl.estado.historial.map((h, i) => {
                            const config = getEstadoConfig(h.estado);
                            return (
                                <div key={i} className="flex items-center gap-2 text-sm group">
                                    <span className={`w-2 h-2 rounded-full ${config.color}`} />
                                    <span className="text-gray-900 dark:text-white">{config.label}</span>
                                    <span className="text-gray-700 dark:text-gray-500">{h.fecha}</span>
                                    <button
                                        onClick={() => {
                                            const newHistorial = pkl.estado.historial.filter((_, idx) => idx !== i);
                                            onUpdate({
                                                estado: {
                                                    ...pkl.estado,
                                                    historial: newHistorial
                                                }
                                            } as any);
                                        }}
                                        className="opacity-0 group-hover:opacity-100 ml-auto text-red-400 hover:text-red-300 transition-opacity"
                                        title="Eliminar del historial"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Cierre */}
                <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4">
                    <h4 className="text-gray-600 dark:text-gray-400 text-sm mb-3">Cierre</h4>
                    {pkl.cierre?.estado_final ? (
                        <>
                            <div className="text-gray-900 dark:text-white mb-2">
                                Estado: {getEstadoConfig(pkl.cierre.estado_final).label}
                            </div>
                            <div className="text-gray-800 dark:text-gray-400 text-sm">
                                Fecha: {pkl.cierre?.fecha_cierre || 'N/A'}
                            </div>
                            {(pkl.cierre?.evidencias || []).length > 0 && (
                                <div className="text-gray-800 dark:text-gray-400 text-sm mt-2">
                                    Evidencias: {(pkl.cierre?.evidencias || []).map(e => e.tipo).join(', ')}
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="text-yellow-400">Pendiente de cierre</div>
                    )}
                </div>
            </div>

            {/* Costos */}
            <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4">
                {(() => {
                    // Calcular costos de tasks (usa getCostoMonto global)
                    // NOTA: Incluimos cotizaciones para mostrarlas pero NO se suman al total
                    const costosFromTasks = pkl.tasks
                        ?.filter(t => getCostoMonto(t.costo) > 0)
                        .map(t => ({
                            concepto: t.nombre || t.descripcion || 'Task',
                            monto: getCostoMonto(t.costo),
                            fecha: t.fecha_completado,
                            fromTask: true,
                            task_id: t.task_id,
                            items_cotizacion: t.items_cotizacion,
                            tipo: t.tipo
                        })) || [];

                    // Filtrar costos del detalle que NO tienen task_id (evitar duplicados)
                    // Los costos con task_id ya se muestran en costosFromTasks
                    const costosManualDetalle = (pkl.costos?.detalle || []).filter(d => !d.task_id);

                    // Combinar: tasks + costos manuales (sin task_id)
                    const allCostos = [
                        ...costosFromTasks,
                        ...costosManualDetalle.map(d => ({ ...d, fromTask: false }))
                    ];

                    // Total combinado: EXCLUIR cotizaciones (no son gastos reales)
                    const totalCombinado = allCostos
                        .filter(c => (c as any).tipo !== 'cotizacion')
                        .reduce((sum, c) => sum + (c.monto || 0), 0);

                    return (
                        <>
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-3">
                                    <h4 className="text-gray-600 dark:text-gray-400 text-sm">Costos</h4>
                                    <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                                        S/ {totalCombinado.toFixed(2)}
                                    </span>
                                </div>
                    <button
                        onClick={() => setShowAddCosto(true)}
                        className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 !text-white text-sm font-medium rounded transition-colors"
                    >
                        + Agregar
                    </button>
                </div>

                {/* Add new costo form */}
                {showAddCosto && (
                    <div className="mb-3 p-3 bg-white dark:bg-gray-800 rounded-lg border border-emerald-500/30 space-y-3">
                        <div className="flex gap-3">
                            <input
                                type="text"
                                value={costoForm.concepto}
                                onChange={e => setCostoForm({ ...costoForm, concepto: e.target.value })}
                                placeholder="Concepto"
                                className="flex-1 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-gray-900 dark:text-white text-sm outline-none focus:border-emerald-500"
                            />
                            <input
                                type="number"
                                value={costoForm.monto}
                                onChange={e => setCostoForm({ ...costoForm, monto: e.target.value })}
                                placeholder="Monto"
                                step="0.01"
                                className="w-28 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-gray-900 dark:text-white text-sm outline-none focus:border-emerald-500"
                            />
                        </div>
                        <div className="flex items-center justify-between">
                            <label className="flex items-center gap-2 text-gray-700 dark:text-gray-400 text-sm cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={costoForm.incluye_igv}
                                    onChange={e => setCostoForm({ ...costoForm, incluye_igv: e.target.checked })}
                                    className="w-4 h-4 rounded border-gray-400 dark:border-gray-600 bg-gray-100 dark:bg-gray-700"
                                />
                                Incluye IGV
                            </label>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => { setShowAddCosto(false); setCostoForm({ concepto: '', monto: '', incluye_igv: false }); }}
                                    className="px-3 py-1 bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500 text-gray-800 dark:text-white text-xs rounded transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleAddCosto}
                                    disabled={!costoForm.concepto.trim() || !costoForm.monto}
                                    className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 disabled:bg-gray-400 disabled:dark:bg-gray-600 text-white text-xs rounded transition-colors"
                                >
                                    Guardar
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {allCostos.length === 0 ? (
                    <div className="text-gray-500 text-center py-2 text-sm">Sin costos registrados</div>
                ) : (
                    <div className="space-y-1">
                        {/* Costos de Tasks */}
                        {costosFromTasks.map((d, i) => {
                            const tieneItems = d.items_cotizacion && d.items_cotizacion.length > 0;
                            const esCotizacion = d.tipo === 'cotizacion';
                            const esExpandible = tieneItems || esCotizacion;

                            return (
                            <div key={`task-${i}`} className="border-b border-gray-200 dark:border-gray-700">
                                <div
                                    className={`flex items-center justify-between py-2 ${esExpandible ? 'cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800/50 rounded px-1 -mx-1' : ''}`}
                                    onClick={() => {
                                        if (esExpandible) {
                                            setExpandedTaskId(expandedTaskId === d.task_id ? null : d.task_id);
                                        }
                                    }}
                                >
                                    <div className="flex items-center gap-2">
                                        {esExpandible && (
                                            <span className="text-gray-400 text-xs">{expandedTaskId === d.task_id ? '▼' : '▶'}</span>
                                        )}
                                        <span className="text-purple-500 text-xs">{esCotizacion ? '💬' : '📋'}</span>
                                        <span className={`text-sm truncate max-w-[200px] ${esCotizacion ? 'text-gray-500 dark:text-gray-500' : 'text-gray-900 dark:text-white'}`}>{d.concepto}</span>
                                        <span className="text-purple-400 text-xs">(task)</span>
                                        {esCotizacion && <span className="text-xs text-orange-500 bg-orange-500/10 px-1.5 py-0.5 rounded">cotización</span>}
                                    </div>
                                    <span className={`font-medium ${esCotizacion ? 'text-gray-400 line-through' : 'text-emerald-600 dark:text-emerald-400'}`}>
                                        S/ {d.monto.toFixed(2)}
                                    </span>
                                </div>
                                {/* Ítems de cotización expandidos */}
                                {expandedTaskId === d.task_id && (
                                    <div className="ml-6 mb-2 pl-3 border-l-2 border-purple-500/30 space-y-1">
                                        {tieneItems ? (
                                            d.items_cotizacion!.map((item, idx) => (
                                                <div key={item.item_id || idx} className="flex justify-between text-xs py-1">
                                                    <span className="text-gray-600 dark:text-gray-400">
                                                        {item.cantidad}x {item.descripcion}
                                                    </span>
                                                    <span className="text-gray-500 dark:text-gray-400">
                                                        S/ {(item.precio_total || item.cantidad * item.precio_unitario).toFixed(2)}
                                                    </span>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="text-xs py-1 text-gray-500 italic">
                                                Cotización sin desglose de ítems (creada antes de la actualización)
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                            );
                        })}
                        {/* Costos manuales del detalle (solo los que NO tienen task_id) */}
                        {costosManualDetalle.map((d, i) => {
                            // Encontrar el índice real en pkl.costos.detalle para edición/eliminación
                            const realIndex = (pkl.costos?.detalle || []).findIndex(det => det.concepto === d.concepto && det.monto === d.monto && !det.task_id);
                            return (
                            <div key={`manual-${i}`} className="flex items-center justify-between py-2 border-b border-gray-200 dark:border-gray-700 group">
                                {editingCostoIndex === realIndex ? (
                                    <div className="flex items-center gap-2 flex-1">
                                        <input
                                            autoFocus
                                            value={costoForm.concepto}
                                            onChange={e => setCostoForm({ ...costoForm, concepto: e.target.value })}
                                            className="flex-1 bg-gray-100 dark:bg-gray-700 border border-emerald-500 rounded px-2 py-1 text-gray-900 dark:text-white text-sm outline-none"
                                        />
                                        <input
                                            type="number"
                                            value={costoForm.monto}
                                            onChange={e => setCostoForm({ ...costoForm, monto: e.target.value })}
                                            step="0.01"
                                            className="w-24 bg-gray-100 dark:bg-gray-700 border border-emerald-500 rounded px-2 py-1 text-gray-900 dark:text-white text-sm outline-none"
                                        />
                                        <button onClick={handleSaveCosto} className="text-emerald-500 hover:text-emerald-400 text-sm">✓</button>
                                        <button onClick={() => { setEditingCostoIndex(null); setCostoForm({ concepto: '', monto: '', incluye_igv: false }); }} className="text-gray-500 hover:text-gray-400 text-sm">✕</button>
                                    </div>
                                ) : (
                                    <>
                                        <div
                                            onClick={() => handleEditCosto(realIndex)}
                                            className="cursor-pointer hover:text-emerald-500 transition-colors"
                                        >
                                            <span className="text-gray-900 dark:text-white">{d.concepto}</span>
                                            {d.incluye_igv && (
                                                <span className="text-emerald-500 dark:text-emerald-400 text-xs ml-2">+IGV</span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                                                S/ {d.monto.toFixed(2)}
                                            </span>
                                            <button
                                                onClick={() => handleDeleteCosto(realIndex)}
                                                className="p-1 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                ✕
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                        );})}
                    </div>
                )}
                        </>
                    );
                })()}
            </div>

            {/* Observaciones - Editable */}
            <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4">
                <h4 className="text-gray-800 dark:text-gray-400 text-sm mb-2">Observaciones</h4>
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
                        className="text-gray-800 dark:text-gray-300 cursor-pointer hover:text-cyan-500 dark:hover:text-cyan-400 transition-colors min-h-[24px]"
                        title="Click para editar"
                    >
                        {pkl.observaciones || <span className="text-gray-600 dark:text-gray-500 italic">+ Agregar observaciones</span>}
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
                                <div className="text-gray-800 dark:text-gray-400 text-sm">Mitigacion: {r.mitigacion}</div>
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
            orden: (pkl.tasks || []).length + 1,
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
                <div className="mb-4 p-4 bg-white dark:bg-gray-800 rounded-lg border border-cyan-500/50 shadow-lg">
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
                                className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-gray-900 dark:text-white font-medium rounded transition-colors"
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
            {(pkl.tasks || []).length === 0 && !showNewTask && (
                <div className="text-center py-8 text-gray-500">
                    <div className="text-4xl mb-2">📋</div>
                    <p>No hay tasks en este PKL</p>
                    <p className="text-sm text-gray-600">Haz clic en "+ Agregar Task" para crear uno</p>
                </div>
            )}

            {(pkl.tasks || []).map((task, index) => {
                const typeConfig = getTaskTypeConfig(task.tipo);
                const isCompleted = task.estado === 'completado';
                const isLast = index === (pkl.tasks || []).length - 1;
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
                                        className="bg-gray-50 dark:bg-gray-900 border border-cyan-500 rounded px-2 py-1 text-gray-900 dark:text-white font-semibold outline-none w-full"
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
                                        className={`px-2 py-0.5 rounded-full ${typeConfig?.color || 'bg-gray-600'} text-white font-medium hover:ring-2 hover:ring-white/30 transition-all`}
                                    >
                                        {typeConfig?.label || task.tipo}
                                    </button>
                                    <div className="absolute left-0 top-full mt-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl z-50 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all min-w-[150px]">
                                        {TIPOS_TASK_PKL.map(tipo => (
                                            <button
                                                key={tipo.value}
                                                onClick={() => handleTipoChange(task.task_id, tipo.value)}
                                                className={`block w-full text-left px-3 py-2 text-xs hover:brightness-90 first:rounded-t-lg last:rounded-b-lg ${tipo.color} !text-white`}
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
                                        className="bg-gray-50 dark:bg-gray-900 border border-cyan-500 rounded px-2 py-0.5 text-gray-300 text-xs outline-none w-24"
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
                                        className="bg-gray-50 dark:bg-gray-900 border border-cyan-500 rounded px-2 py-0.5 text-gray-300 text-xs outline-none w-16"
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
                            <div className="absolute right-0 top-full mt-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl z-50 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all min-w-[120px]">
                                {TASK_ESTADOS.map(estado => (
                                    <button
                                        key={estado.value}
                                        onClick={() => handleEstadoChange(task.task_id, estado.value)}
                                        className={`block w-full text-left px-3 py-2 text-xs hover:brightness-90 first:rounded-t-lg last:rounded-b-lg ${estado.color} !text-white`}
                                    >
                                        {estado.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Delete button - always visible */}
                        <button
                            onClick={() => {
                                if (confirm(`¿Eliminar task "${task.nombre}"?\n\nEsta acción no se puede deshacer.`)) {
                                    onDeleteTask(task.task_id);
                                }
                            }}
                            className="p-2 text-red-400/60 hover:text-red-400 hover:bg-red-500/20 rounded-lg transition-all"
                            title="Eliminar task"
                        >
                            🗑️
                        </button>
                    </div>
                );
            })}
        </div>
    );
}

// Eventos Tab
function EventosTab({ pkl, onUpdate }: { pkl: PKL; onUpdate: UpdatePKLFn }) {
    const [editingEventoId, setEditingEventoId] = useState<string | null>(null);
    const [editDescripcion, setEditDescripcion] = useState('');
    const [showNewEvento, setShowNewEvento] = useState(false);
    const [newEvento, setNewEvento] = useState({ descripcion: '', proveedor_id: '', fecha: new Date().toISOString().split('T')[0] });

    const handleEditStart = (eventoId: string, descripcion: string) => {
        setEditingEventoId(eventoId);
        setEditDescripcion(descripcion);
    };

    const handleEditSave = () => {
        if (!editingEventoId) return;
        const newEventos = pkl.eventos_externos.map(e =>
            e.evento_id === editingEventoId ? { ...e, descripcion: editDescripcion } : e
        );
        onUpdate({ eventos_externos: newEventos } as any);
        setEditingEventoId(null);
    };

    const handleDeleteEvento = (eventoId: string) => {
        const newEventos = pkl.eventos_externos.filter(e => e.evento_id !== eventoId);
        onUpdate({ eventos_externos: newEventos } as any);
    };

    const handleAddEvento = () => {
        if (!newEvento.descripcion.trim()) return;
        const nuevo = {
            evento_id: `EVT-${Date.now()}`,
            tipo: 'otro' as const,
            descripcion: newEvento.descripcion.trim(),
            fecha: newEvento.fecha,
            proveedor_id: newEvento.proveedor_id || undefined,
        };
        onUpdate({ eventos_externos: [...pkl.eventos_externos, nuevo] } as any);
        setNewEvento({ descripcion: '', proveedor_id: '', fecha: new Date().toISOString().split('T')[0] });
        setShowNewEvento(false);
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h4 className="text-gray-800 dark:text-gray-400 text-sm">Eventos Externos (terceros)</h4>
                <button
                    onClick={() => setShowNewEvento(true)}
                    className="px-3 py-1.5 bg-purple-700 hover:bg-purple-600 !text-white text-sm font-medium rounded transition-colors"
                >
                    + Agregar
                </button>
            </div>

            {/* Add new evento form */}
            {showNewEvento && (
                <div className="p-3 bg-white dark:bg-gray-800 rounded-lg border border-purple-500/30 space-y-3">
                    <textarea
                        value={newEvento.descripcion}
                        onChange={e => setNewEvento({ ...newEvento, descripcion: e.target.value })}
                        placeholder="Descripción del evento"
                        rows={2}
                        className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-gray-900 dark:text-white text-sm outline-none focus:border-purple-500 resize-none"
                    />
                    <div className="flex gap-3">
                        <input
                            type="text"
                            value={newEvento.proveedor_id}
                            onChange={e => setNewEvento({ ...newEvento, proveedor_id: e.target.value })}
                            placeholder="Proveedor (opcional)"
                            className="flex-1 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-gray-900 dark:text-white text-sm outline-none focus:border-purple-500"
                        />
                        <input
                            type="date"
                            value={newEvento.fecha}
                            onChange={e => setNewEvento({ ...newEvento, fecha: e.target.value })}
                            className="bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-gray-900 dark:text-white text-sm outline-none focus:border-purple-500"
                        />
                    </div>
                    <div className="flex justify-end gap-2">
                        <button
                            onClick={() => setShowNewEvento(false)}
                            className="px-3 py-1 bg-gray-600 hover:bg-gray-500 text-white text-xs rounded"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleAddEvento}
                            disabled={!newEvento.descripcion.trim()}
                            className="px-3 py-1 bg-purple-600 hover:bg-purple-500 disabled:bg-gray-600 text-white text-xs rounded"
                        >
                            Guardar
                        </button>
                    </div>
                </div>
            )}

            {pkl.eventos_externos.length === 0 ? (
                <div className="text-gray-500 text-center py-8">Sin eventos externos registrados</div>
            ) : (
                <div className="space-y-3">
                    {pkl.eventos_externos.map(evento => (
                        <div
                            key={evento.evento_id}
                            className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 group"
                        >
                            <div className="flex items-start justify-between mb-2">
                                <span className="font-mono text-purple-400 text-sm">{evento.evento_id}</span>
                                <div className="flex items-center gap-2">
                                    <span className="text-gray-500 text-sm">{evento.fecha}</span>
                                    <button
                                        onClick={() => handleDeleteEvento(evento.evento_id)}
                                        className="p-1 text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        ✕
                                    </button>
                                </div>
                            </div>
                            {editingEventoId === evento.evento_id ? (
                                <div className="space-y-2">
                                    <textarea
                                        autoFocus
                                        value={editDescripcion}
                                        onChange={e => setEditDescripcion(e.target.value)}
                                        rows={2}
                                        className="w-full bg-gray-700 border border-purple-500 rounded px-3 py-2 text-white text-sm outline-none resize-none"
                                    />
                                    <div className="flex gap-2">
                                        <button onClick={handleEditSave} className="text-emerald-400 hover:text-emerald-300 text-sm">✓ Guardar</button>
                                        <button onClick={() => setEditingEventoId(null)} className="text-gray-400 hover:text-gray-300 text-sm">Cancelar</button>
                                    </div>
                                </div>
                            ) : (
                                <p
                                    className="text-gray-900 dark:text-white mb-2 cursor-pointer hover:text-cyan-400 transition-colors"
                                    onClick={() => handleEditStart(evento.evento_id, evento.descripcion)}
                                >
                                    {evento.descripcion}
                                </p>
                            )}
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
