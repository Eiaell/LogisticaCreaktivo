import { useState, useRef, useMemo } from 'react';
import { useDatabase } from '../context/DatabaseContext';
import { NuevoClienteModal } from './NuevoClienteModal';
import { ConfirmDialog } from './ConfirmDialog';
import type { Cliente } from '../types';

interface ClientesPageProps {
    onBack: () => void;
    onSelectCliente?: (razonSocial: string) => void;
}

export function ClientesPage({ onBack, onSelectCliente }: ClientesPageProps) {
    const { clientes, updateCliente, deleteCliente, uploadLogo } = useDatabase();
    const [search, setSearch] = useState('');
    const [showNuevoModal, setShowNuevoModal] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<'hierarchical' | 'flat'>('hierarchical');
    const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
    const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

    // Build hierarchical structure
    const hierarchyData = useMemo(() => {
        const clientesList = Object.values(clientes).filter(c => c && c.razon_social);

        // Filter by search
        const filtered = clientesList.filter(c =>
            (c.razon_social?.toLowerCase().includes(search.toLowerCase())) ||
            (c.nombre_comercial?.toLowerCase().includes(search.toLowerCase())) ||
            (c.grupo_empresarial?.toLowerCase().includes(search.toLowerCase())) ||
            (c.proyecto?.toLowerCase().includes(search.toLowerCase())) ||
            (c.ruc?.includes(search)) ||
            (c.contacto?.toLowerCase().includes(search.toLowerCase()))
        );

        // Group by grupo_empresarial, then by razon_social
        const grouped: Record<string, Record<string, Cliente[]>> = {};

        filtered.forEach(cliente => {
            if (!cliente || !cliente.razon_social) return;

            const grupoKey = cliente.grupo_empresarial || 'Sin Grupo';
            const razonKey = cliente.razon_social;

            if (!grouped[grupoKey]) {
                grouped[grupoKey] = {};
            }
            if (!grouped[grupoKey][razonKey]) {
                grouped[grupoKey][razonKey] = [];
            }
            grouped[grupoKey][razonKey].push(cliente);
        });

        return {
            filtered,
            grouped
        };
    }, [clientes, search]);

    const handleLogoUpload = async (razonSocial: string, file: File) => {
        const url = await uploadLogo(file, `cliente-${razonSocial}`);
        if (url) {
            updateCliente(razonSocial, { logo: url });
        }
    };

    const handleDelete = async () => {
        if (confirmDelete) {
            await deleteCliente(confirmDelete);
            setConfirmDelete(null);
        }
    };

    const toggleGroupExpand = (grupoKey: string) => {
        setExpandedGroups(prev => {
            const newSet = new Set(prev);
            if (newSet.has(grupoKey)) {
                newSet.delete(grupoKey);
            } else {
                newSet.add(grupoKey);
            }
            return newSet;
        });
    };

    const getHoldingData = (grupoKey: string, clientesInGrupo: Cliente[]) => {
        // Preferir cliente sin proyecto (es el holding principal)
        // Si no existe, usar el primero
        const holdingCliente = clientesInGrupo.find(c => !c.proyecto) || clientesInGrupo[0];
        return {
            id: holdingCliente?.id,
            nombre_comercial: grupoKey,
            razon_social: holdingCliente?.razon_social || grupoKey,
            ruc: holdingCliente?.ruc,
            direccion: holdingCliente?.direccion,
            contacto: holdingCliente?.contacto,
            telefono: holdingCliente?.telefono,
            email: holdingCliente?.email,
            logo: holdingCliente?.logo
        };
    };

    // Client Card Component
    const ClientCard = ({ cliente }: { cliente: Cliente }) => (
        <div
            onClick={() => onSelectCliente?.(cliente.razon_social)}
            className="bg-gradient-to-br from-gray-900 to-gray-900/50 border border-gray-800 hover:border-blue-500/30 rounded-xl p-5 transition-all group cursor-pointer hover:shadow-lg hover:shadow-blue-500/20"
        >
            {/* Logo y Nombre */}
            <div className="flex items-start gap-4 mb-4">
                <div
                    className="relative w-14 h-14 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center overflow-hidden cursor-pointer group/logo"
                    onClick={() => fileInputRefs.current[cliente.razon_social]?.click()}
                >
                    {cliente.logo ? (
                        <img src={cliente.logo} alt="" className="w-full h-full object-cover" />
                    ) : (
                        <span className="text-2xl">🏢</span>
                    )}
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover/logo:opacity-100 transition-opacity">
                        <span className="text-[8px] text-white font-bold">CAMBIAR</span>
                    </div>
                    <input
                        ref={el => {
                            fileInputRefs.current[cliente.razon_social] = el;
                        }}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) =>
                            e.target.files?.[0] && handleLogoUpload(cliente.razon_social, e.target.files[0])
                        }
                    />
                </div>
                <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-white truncate text-sm">{cliente.razon_social}</h3>
                    {cliente.nombre_comercial && (
                        <p className="text-xs text-blue-400/70 truncate">{cliente.nombre_comercial}</p>
                    )}
                    {cliente.proyecto && (
                        <p className="text-xs text-purple-400/60 truncate">📌 {cliente.proyecto}</p>
                    )}
                    {cliente.ruc && <p className="text-xs text-gray-500 font-mono">RUC: {cliente.ruc}</p>}
                </div>
            </div>

            {/* Status Badge */}
            <div className="flex gap-2 mb-3">
                <span
                    className={`text-[10px] font-bold px-2 py-1 rounded-full ${
                        cliente.estado === 'activo'
                            ? 'bg-green-500/20 text-green-400'
                            : cliente.estado === 'inactivo'
                              ? 'bg-gray-500/20 text-gray-400'
                              : 'bg-red-500/20 text-red-400'
                    }`}
                >
                    {cliente.estado.toUpperCase()}
                </span>
                <span
                    className={`text-[10px] font-bold px-2 py-1 rounded-full ${
                        cliente.prioridad === 'alto'
                            ? 'bg-red-500/20 text-red-400'
                            : cliente.prioridad === 'medio'
                              ? 'bg-yellow-500/20 text-yellow-400'
                              : 'bg-blue-500/20 text-blue-400'
                    }`}
                >
                    {cliente.prioridad.toUpperCase()}
                </span>
            </div>

            {/* Info */}
            <div className="space-y-2 text-sm border-t border-gray-800 pt-3">
                {cliente.contacto && (
                    <div className="flex items-center gap-2 text-gray-400">
                        <span className="text-xs">👤</span>
                        <span className="truncate text-xs">{cliente.contacto}</span>
                    </div>
                )}
                {cliente.telefono && (
                    <div className="flex items-center gap-2 text-gray-400">
                        <span className="text-xs">📞</span>
                        <span className="text-xs">{cliente.telefono}</span>
                    </div>
                )}
                {cliente.email && (
                    <div className="flex items-center gap-2 text-gray-400">
                        <span className="text-xs">✉️</span>
                        <span className="truncate text-xs">{cliente.email}</span>
                    </div>
                )}
                {cliente.vendedor_asignado && (
                    <div className="flex items-center gap-2 text-gray-400">
                        <span className="text-xs">💼</span>
                        <span className="truncate text-xs">{cliente.vendedor_asignado}</span>
                    </div>
                )}
            </div>

            {/* Actions */}
            <div className="mt-4 pt-4 border-t border-gray-800 flex justify-between gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onSelectCliente?.(cliente.razon_social);
                    }}
                    className="flex-1 px-3 py-1.5 text-xs text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 rounded-lg transition-colors"
                >
                    Ver Ficha
                </button>
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        setConfirmDelete(cliente.razon_social);
                    }}
                    className="px-3 py-1.5 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
                >
                    Eliminar
                </button>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen p-6">
            {/* Header */}
            <header className="mb-8">
                <button
                    onClick={onBack}
                    className="flex items-center gap-2 text-gray-400 hover:text-white mb-4 transition-colors group"
                >
                    <span className="group-hover:-translate-x-1 transition-transform">←</span>
                    <span>Volver al Dashboard</span>
                </button>
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-cyan-500 bg-clip-text text-transparent flex items-center gap-3">
                            <span className="text-4xl">🏢</span>
                            Directorio de Clientes
                        </h1>
                        <p className="text-gray-400 mt-1">
                            {hierarchyData.filtered.length} cliente{hierarchyData.filtered.length !== 1 ? 's' : ''} registrado
                            {hierarchyData.filtered.length !== 1 ? 's' : ''}
                        </p>
                    </div>
                    <button
                        onClick={() => setShowNuevoModal(true)}
                        className="px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 rounded-xl text-white font-bold transition-all shadow-lg shadow-blue-500/25 flex items-center gap-2"
                    >
                        <span className="text-xl">+</span>
                        Nuevo Cliente
                    </button>
                </div>
            </header>

            {/* Controls */}
            <div className="mb-6 flex gap-4 items-end">
                <div className="flex-1">
                    <input
                        type="text"
                        placeholder="Buscar por razón social, grupo, proyecto, RUC o contacto..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-all"
                    />
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setViewMode('hierarchical')}
                        className={`px-4 py-3 rounded-xl font-medium transition-all ${
                            viewMode === 'hierarchical'
                                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25'
                                : 'bg-gray-800 text-gray-400 hover:text-white'
                        }`}
                    >
                        📊 Jerárquica
                    </button>
                    <button
                        onClick={() => setViewMode('flat')}
                        className={`px-4 py-3 rounded-xl font-medium transition-all ${
                            viewMode === 'flat'
                                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25'
                                : 'bg-gray-800 text-gray-400 hover:text-white'
                        }`}
                    >
                        📋 Lista
                    </button>
                </div>
            </div>

            {/* Hierarchical View */}
            {viewMode === 'hierarchical' && hierarchyData.filtered.length > 0 && (
                <div>
                    {/* Holdings Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-8">
                        {Object.entries(hierarchyData.grouped).map(([grupoKey, razonSocialMap]) => {
                            if (grupoKey === 'Sin Grupo') return null; // Skip independent clients for now

                            const allClientesInGrupo = Object.values(razonSocialMap).flat();
                            const isExpanded = expandedGroups.has(grupoKey);
                            const holdingInfo = getHoldingData(grupoKey, allClientesInGrupo);

                            // HOLDING CARD VIEW
                            return (
                                <div key={grupoKey} className="bg-gradient-to-br from-gray-900 to-gray-900/50 border border-purple-500/20 rounded-xl p-5 transition-all group">
                                    {/* Holding Header - Expandible */}
                                    <div
                                        onClick={() => toggleGroupExpand(grupoKey)}
                                        className="flex items-start gap-4 mb-4 cursor-pointer hover:bg-gray-800/30 p-2 rounded-lg transition-colors"
                                    >
                                        {/* Logo */}
                                        <div
                                            className="relative w-14 h-14 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center overflow-hidden cursor-pointer group/logo"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                fileInputRefs.current[`holding-${grupoKey}`]?.click();
                                            }}
                                        >
                                            {holdingInfo?.logo ? (
                                                <img src={holdingInfo.logo} alt="" className="w-full h-full object-cover" />
                                            ) : (
                                                <span className="text-2xl">🏗️</span>
                                            )}
                                            <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover/logo:opacity-100 transition-opacity">
                                                <span className="text-[8px] text-white font-bold">LOGO</span>
                                            </div>
                                            <input
                                                ref={el => {
                                                    fileInputRefs.current[`holding-${grupoKey}`] = el;
                                                }}
                                                type="file"
                                                accept="image/*"
                                                className="hidden"
                                                onChange={(e) => {
                                                    e.target.files?.[0] && handleLogoUpload(holdingInfo?.razon_social || grupoKey, e.target.files[0]);
                                                }}
                                            />
                                        </div>

                                        {/* Info */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <h3 className="font-bold text-white truncate text-sm">{grupoKey}</h3>
                                                <span className={`text-lg transition-transform ${isExpanded ? 'rotate-180' : ''}`}>▼</span>
                                            </div>
                                            {holdingInfo?.razon_social && (
                                                <p className="text-xs text-purple-400/70 truncate">{holdingInfo.razon_social}</p>
                                            )}
                                            {holdingInfo?.ruc && (
                                                <p className="text-xs text-gray-500 font-mono">RUC: {holdingInfo.ruc}</p>
                                            )}
                                            <p className="text-xs text-gray-500 mt-1">
                                                {allClientesInGrupo.length} razón{allClientesInGrupo.length !== 1 ? 'es' : ''} social{allClientesInGrupo.length !== 1 ? 'es' : ''}
                                                {allClientesInGrupo.some(c => c.proyecto) ? ` • ${allClientesInGrupo.filter(c => c.proyecto).length} proyecto(s)` : ''}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Holding Details - Expanded */}
                                    {isExpanded && (
                                        <div className="space-y-4 border-t border-gray-800 pt-4">
                                            {/* Contact Info */}
                                            <div className="bg-purple-950/20 rounded-lg p-3 space-y-2">
                                                <h4 className="text-xs font-semibold text-purple-300 uppercase">Información del Grupo</h4>
                                                {holdingInfo?.contacto && (
                                                    <div className="flex items-center gap-2 text-gray-400">
                                                        <span className="text-xs">👤</span>
                                                        <span className="text-xs">{holdingInfo.contacto}</span>
                                                    </div>
                                                )}
                                                {holdingInfo?.telefono && (
                                                    <div className="flex items-center gap-2 text-gray-400">
                                                        <span className="text-xs">📞</span>
                                                        <span className="text-xs">{holdingInfo.telefono}</span>
                                                    </div>
                                                )}
                                                {holdingInfo?.email && (
                                                    <div className="flex items-center gap-2 text-gray-400">
                                                        <span className="text-xs">✉️</span>
                                                        <span className="text-xs truncate">{holdingInfo.email}</span>
                                                    </div>
                                                )}
                                                {holdingInfo?.direccion && (
                                                    <div className="flex items-center gap-2 text-gray-400">
                                                        <span className="text-xs">📍</span>
                                                        <span className="text-xs">{holdingInfo.direccion}</span>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Projects/Razones Sociales */}
                                            <div>
                                                <h4 className="text-xs font-semibold text-cyan-300 uppercase mb-3">Proyectos y Razones Sociales</h4>
                                                <div className="space-y-2">
                                                    {Object.entries(razonSocialMap).map(([razonKey, clientesOfRazon]) => (
                                                        <div key={razonKey} className="bg-gray-950/50 rounded-lg p-2">
                                                            <p className="text-xs font-semibold text-cyan-400 mb-2">🏛️ {razonKey}</p>
                                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                                                {clientesOfRazon.map(cliente => (
                                                                    <div
                                                                        key={cliente.id}
                                                                        onClick={() => onSelectCliente?.(cliente.razon_social)}
                                                                        className="bg-gray-900/60 border border-gray-700 rounded p-2 cursor-pointer hover:border-blue-500/50 transition-colors text-xs"
                                                                    >
                                                                        <div className="font-semibold text-white mb-1 flex items-center gap-2">
                                                                            {cliente.proyecto && <span className="text-purple-400">🎯</span>}
                                                                            {cliente.proyecto || 'Proyecto General'}
                                                                        </div>
                                                                        {cliente.proyecto_codigo && (
                                                                            <p className="text-gray-500 text-[10px]">{cliente.proyecto_codigo}</p>
                                                                        )}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Actions */}
                                            <div className="flex gap-2 pt-2 border-t border-gray-800">
                                                <button
                                                    onClick={() => onSelectCliente?.(holdingInfo?.razon_social || grupoKey)}
                                                    className="flex-1 px-3 py-1.5 text-xs text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 rounded-lg transition-colors"
                                                >
                                                    Ver Ficha
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {/* Independent Clients Section */}
                    {hierarchyData.grouped['Sin Grupo'] && (
                        <div className="space-y-4">
                            <h2 className="text-lg font-bold text-blue-300 flex items-center gap-2">
                                <span>📋</span> Clientes Independientes
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                {Object.values(hierarchyData.grouped['Sin Grupo']).flat().map(cliente => (
                                    <ClientCard key={cliente.id} cliente={cliente} />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Flat View */}
            {viewMode === 'flat' && hierarchyData.filtered.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {hierarchyData.filtered.map(cliente => (
                        <ClientCard key={cliente.id} cliente={cliente} />
                    ))}
                </div>
            )}

            {/* Empty State */}
            {hierarchyData.filtered.length === 0 && (
                <div className="text-center py-20">
                    <span className="text-6xl mb-4 block grayscale opacity-30">🏢</span>
                    <h3 className="text-gray-400 font-medium">
                        {search ? 'No se encontraron clientes' : 'No hay clientes registrados'}
                    </h3>
                    <p className="text-gray-600 text-sm mt-1">
                        {search
                            ? 'Intenta con otros términos de búsqueda'
                            : 'Agrega tu primer cliente para comenzar'}
                    </p>
                </div>
            )}

            <NuevoClienteModal isOpen={showNuevoModal} onClose={() => setShowNuevoModal(false)} />

            <ConfirmDialog
                isOpen={confirmDelete !== null}
                title="Eliminar Cliente"
                message={`¿Estás seguro de eliminar a "${confirmDelete}"? Esta acción no se puede deshacer.`}
                confirmText="Eliminar"
                cancelText="Cancelar"
                variant="danger"
                onConfirm={handleDelete}
                onCancel={() => setConfirmDelete(null)}
            />
        </div>
    );
}
