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
    const [groupLogos, setGroupLogos] = useState<Record<string, string>>({}); // Store group logos
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
            await updateCliente(razonSocial, { logo: url });
        }
    };

    const handleGroupLogoUpload = async (grupoKey: string, file: File) => {
        const url = await uploadLogo(file, `grupo-${grupoKey}`);
        if (url) {
            setGroupLogos(prev => ({ ...prev, [grupoKey]: url }));
            // Also save to the first client in the group for persistence
            const clientesInGrupo = Object.values(clientes).filter(c => c?.grupo_empresarial === grupoKey);
            if (clientesInGrupo.length > 0) {
                await updateCliente(clientesInGrupo[0].razon_social, {
                    grupo_logo_url: url
                });
            }
        }
    };

    const handleClickLogoButton = (razonSocial: string) => {
        // Reset input ANTES de abrirlo
        console.log('[ClientesPage] Logo button clicked for:', razonSocial);
        console.log('[ClientesPage] fileInputRefs.current keys:', Object.keys(fileInputRefs.current));
        console.log('[ClientesPage] Input exists?', !!fileInputRefs.current[razonSocial]);
        if (fileInputRefs.current[razonSocial]) {
            fileInputRefs.current[razonSocial].value = '';
            console.log('[ClientesPage] Input reset');
        }
        fileInputRefs.current[razonSocial]?.click();
        console.log('[ClientesPage] Click triggered');
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
                    onClick={() => handleClickLogoButton(cliente.razon_social)}
                >
                    {cliente.logo ? (
                        <img src={cliente.logo} alt="" className="w-full h-full object-cover" />
                    ) : (
                        <span className="text-2xl">🏢</span>
                    )}
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover/logo:opacity-100 transition-opacity">
                        <span className="text-[8px] text-white font-bold">CAMBIAR</span>
                    </div>
                </div>
                <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-white truncate text-base">{cliente.nombre_comercial || cliente.razon_social}</h3>
                    {cliente.nombre_comercial && cliente.razon_social !== cliente.nombre_comercial && (
                        <p className="text-xs text-gray-400 truncate">{cliente.razon_social}</p>
                    )}
                    {cliente.proyecto && (
                        <p className="text-xs text-purple-400/60 truncate">📌 {cliente.proyecto}</p>
                    )}
                    {cliente.ruc && <p className="text-xs text-gray-500 font-mono">RUC: {cliente.ruc}</p>}
                </div>
            </div>

            {/* Status Badge - Only show estado, not prioridad */}
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

            {/* Hierarchical View - Accordion for groups with multiple clients, flat for independent */}
            {viewMode === 'hierarchical' && hierarchyData.filtered.length > 0 && (
                <div className="space-y-6">
                    {/* Render each group */}
                    {Object.entries(hierarchyData.grouped).map(([grupoKey, razonSocialMap]) => {
                        const clientesInGrupo = Object.values(razonSocialMap).flat();
                        const isIndependent = grupoKey === 'Sin Grupo';
                        const isExpanded = expandedGroups.has(grupoKey);

                        // If independent clients, show them directly without accordion
                        if (isIndependent) {
                            return (
                                <div key={grupoKey}>
                                    <div className="flex items-center gap-4 mb-4 min-w-0">
                                        <span className="text-2xl flex-shrink-0">📋</span>
                                        <h2 className="text-lg font-bold text-cyan-400 truncate flex-1">Clientes Independientes</h2>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                        {clientesInGrupo.map(cliente => (
                                            <ClientCard key={cliente.id} cliente={cliente} />
                                        ))}
                                    </div>
                                </div>
                            );
                        }

                        // For groups with multiple clients, use accordion
                        const groupLogo = groupLogos[grupoKey] || clientesInGrupo.find(c => c.grupo_logo_url)?.grupo_logo_url;

                        return (
                            <div key={grupoKey}>
                                {/* Accordion Header */}
                                <button
                                    onClick={() => toggleGroupExpand(grupoKey)}
                                    className="w-full flex items-center justify-between gap-4 p-4 border border-gray-700 rounded-xl bg-gray-900/30 hover:bg-gray-800/50 transition-colors mb-4"
                                >
                                    <div className="flex items-center gap-4 flex-1 min-w-0">
                                        {/* Group Logo - Clickable to upload */}
                                        <div
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                fileInputRefs.current[`grupo-${grupoKey}`]?.click();
                                            }}
                                            className="relative w-14 h-14 rounded-lg bg-purple-500/10 border border-purple-500/30 flex items-center justify-center overflow-hidden cursor-pointer group/logo flex-shrink-0"
                                        >
                                            {groupLogo ? (
                                                <img src={groupLogo} alt="" className="w-full h-full object-cover object-center" />
                                            ) : (
                                                <span className="text-xl">🏢</span>
                                            )}
                                            <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover/logo:opacity-100 transition-opacity">
                                                <span className="text-[7px] text-white font-bold">LOGO</span>
                                            </div>
                                            <input
                                                ref={el => {
                                                    fileInputRefs.current[`grupo-${grupoKey}`] = el;
                                                }}
                                                type="file"
                                                accept="image/*"
                                                className="hidden"
                                                onChange={(e) => {
                                                    if (e.target.files?.[0]) {
                                                        handleGroupLogoUpload(grupoKey, e.target.files[0]);
                                                        e.target.value = '';
                                                    }
                                                }}
                                            />
                                        </div>
                                        <div className="text-left min-w-0 flex-1">
                                            <h2 className="text-lg font-bold text-cyan-400 truncate">{grupoKey}</h2>
                                            <p className="text-sm text-gray-500 truncate">
                                                {clientesInGrupo.length} cliente{clientesInGrupo.length !== 1 ? 's' : ''}
                                            </p>
                                        </div>
                                    </div>
                                    <span className={`text-2xl flex-shrink-0 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}>
                                        ▼
                                    </span>
                                </button>

                                {/* Accordion Content - Group by proyecto */}
                                {isExpanded && (
                                    <div className="space-y-3 ml-6 pt-4">
                                        {/* Group clients by proyecto */}
                                        {(() => {
                                            const proyectos: Record<string, typeof clientesInGrupo> = {};
                                            clientesInGrupo.forEach(c => {
                                                const proyKey = c.proyecto || 'Sin Proyecto';
                                                if (!proyectos[proyKey]) proyectos[proyKey] = [];
                                                proyectos[proyKey].push(c);
                                            });

                                            return Object.entries(proyectos).map(([proyKey, clientesDeProyecto]) => {
                                                const isProyExpanded = expandedGroups.has(`${grupoKey}-${proyKey}`);

                                                return (
                                                    <div key={proyKey}>
                                                        <button
                                                            onClick={() => {
                                                                const toggleKey = `${grupoKey}-${proyKey}`;
                                                                setExpandedGroups(prev => {
                                                                    const newSet = new Set(prev);
                                                                    if (newSet.has(toggleKey)) {
                                                                        newSet.delete(toggleKey);
                                                                    } else {
                                                                        newSet.add(toggleKey);
                                                                    }
                                                                    return newSet;
                                                                });
                                                            }}
                                                            className="flex items-center justify-between gap-3 p-4 hover:bg-gray-800/20 transition-colors rounded-lg"
                                                        >
                                                            <div className="flex items-center gap-3 flex-1 min-w-0">
                                                                {/* Project Logo */}
                                                                <div
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        fileInputRefs.current[`proyecto-${grupoKey}-${proyKey}`]?.click();
                                                                    }}
                                                                    className="relative w-14 h-14 rounded-lg bg-purple-500/10 border border-purple-500/30 flex items-center justify-center overflow-hidden cursor-pointer group/logo flex-shrink-0"
                                                                >
                                                                    {clientesDeProyecto[0]?.logo ? (
                                                                        <img src={clientesDeProyecto[0].logo} alt="" className="w-full h-full object-cover object-center" />
                                                                    ) : (
                                                                        <span className="text-xl">🎯</span>
                                                                    )}
                                                                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover/logo:opacity-100 transition-opacity">
                                                                        <span className="text-[7px] text-white font-bold">LOGO</span>
                                                                    </div>
                                                                    <input
                                                                        ref={el => {
                                                                            fileInputRefs.current[`proyecto-${grupoKey}-${proyKey}`] = el;
                                                                        }}
                                                                        type="file"
                                                                        accept="image/*"
                                                                        className="hidden"
                                                                        onChange={(e) => {
                                                                            if (e.target.files?.[0] && clientesDeProyecto[0]) {
                                                                                handleLogoUpload(clientesDeProyecto[0].razon_social, e.target.files[0]);
                                                                                e.target.value = '';
                                                                            }
                                                                        }}
                                                                    />
                                                                </div>
                                                                <span className="text-base font-bold text-blue-300 flex-1 text-left truncate">
                                                                    {proyKey === 'Sin Proyecto' ? '🏛️ Oficina Principal' : proyKey}
                                                                </span>
                                                            </div>
                                                            <span className="text-xs text-gray-500 flex-shrink-0">({clientesDeProyecto.length})</span>
                                                            <span className={`text-lg transition-transform flex-shrink-0 ${isProyExpanded ? 'rotate-180' : ''}`}>▼</span>
                                                        </button>
                                                        {isProyExpanded && (
                                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4 mt-2">
                                                                {clientesDeProyecto.map(cliente => (
                                                                    <ClientCard key={cliente.id} cliente={cliente} />
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            });
                                        })()}
                                    </div>
                                )}
                            </div>
                        );
                    })}
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

            {/* Hidden file inputs for all clients */}
            {Object.values(clientes).map(cliente => (
                <input
                    key={`file-input-${cliente?.razon_social}`}
                    ref={el => {
                        if (cliente?.razon_social) {
                            fileInputRefs.current[cliente.razon_social] = el;
                        }
                    }}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                        console.log('[ClientesPage] Input onChange triggered for:', cliente?.razon_social, 'File:', e.target.files?.[0]?.name);
                        if (e.target.files?.[0] && cliente?.razon_social) {
                            handleLogoUpload(cliente.razon_social, e.target.files[0]);
                            e.target.value = '';
                        }
                    }}
                />
            ))}
        </div>
    );
}
