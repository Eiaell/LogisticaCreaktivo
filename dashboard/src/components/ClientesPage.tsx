import { useState, useRef } from 'react';
import { useDatabase } from '../context/DatabaseContext';
import { NuevoClienteModal } from './NuevoClienteModal';
import { ConfirmDialog } from './ConfirmDialog';

interface ClientesPageProps {
    onBack: () => void;
}

export function ClientesPage({ onBack }: ClientesPageProps) {
    const { clientes, updateCliente, deleteCliente, uploadLogo } = useDatabase();
    const [search, setSearch] = useState('');
    const [showNuevoModal, setShowNuevoModal] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
    const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

    const clientesList = Object.values(clientes).filter(c =>
        c.nombre.toLowerCase().includes(search.toLowerCase()) ||
        c.ruc?.includes(search) ||
        c.contacto?.toLowerCase().includes(search.toLowerCase())
    );

    const handleLogoUpload = async (nombre: string, file: File) => {
        const url = await uploadLogo(file, `cliente-${nombre}`);
        if (url) {
            updateCliente(nombre, { logo: url });
        }
    };

    const handleDelete = async () => {
        if (confirmDelete) {
            await deleteCliente(confirmDelete);
            setConfirmDelete(null);
        }
    };

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
                            <span className="text-4xl">👥</span>
                            Directorio de Clientes
                        </h1>
                        <p className="text-gray-400 mt-1">{clientesList.length} clientes registrados</p>
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

            {/* Search */}
            <div className="mb-6">
                <input
                    type="text"
                    placeholder="Buscar por nombre, RUC o contacto..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full max-w-md px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-all"
                />
            </div>

            {/* Grid de Clientes */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {clientesList.map(cliente => (
                    <div
                        key={cliente.nombre}
                        className="bg-gradient-to-br from-gray-900 to-gray-900/50 border border-gray-800 hover:border-blue-500/30 rounded-xl p-5 transition-all group"
                    >
                        {/* Logo y Nombre */}
                        <div className="flex items-start gap-4 mb-4">
                            <div
                                className="relative w-14 h-14 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center overflow-hidden cursor-pointer group/logo"
                                onClick={() => fileInputRefs.current[cliente.nombre]?.click()}
                            >
                                {cliente.logo ? (
                                    <img src={cliente.logo} alt="" className="w-full h-full object-cover" />
                                ) : (
                                    <span className="text-2xl">👤</span>
                                )}
                                <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover/logo:opacity-100 transition-opacity">
                                    <span className="text-[8px] text-white font-bold">CAMBIAR</span>
                                </div>
                                <input
                                    ref={el => { fileInputRefs.current[cliente.nombre] = el; }}
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={(e) => e.target.files?.[0] && handleLogoUpload(cliente.nombre, e.target.files[0])}
                                />
                            </div>
                            <div className="flex-1 min-w-0">
                                <h3 className="font-bold text-white truncate">{cliente.nombre}</h3>
                                {cliente.nombre_comercial && (
                                    <p className="text-xs text-blue-400/70 truncate">{cliente.nombre_comercial}</p>
                                )}
                                {cliente.ruc && (
                                    <p className="text-xs text-gray-500 font-mono">RUC: {cliente.ruc}</p>
                                )}
                            </div>
                        </div>

                        {/* Info */}
                        <div className="space-y-2 text-sm">
                            {cliente.contacto && (
                                <div className="flex items-center gap-2 text-gray-400">
                                    <span className="text-xs">👤</span>
                                    <span className="truncate">{cliente.contacto}</span>
                                </div>
                            )}
                            {cliente.telefono && (
                                <div className="flex items-center gap-2 text-gray-400">
                                    <span className="text-xs">📞</span>
                                    <span>{cliente.telefono}</span>
                                </div>
                            )}
                            {cliente.email && (
                                <div className="flex items-center gap-2 text-gray-400">
                                    <span className="text-xs">✉️</span>
                                    <span className="truncate text-xs">{cliente.email}</span>
                                </div>
                            )}
                            {cliente.direccion && (
                                <div className="flex items-start gap-2 text-gray-400">
                                    <span className="text-xs">📍</span>
                                    <span className="text-xs line-clamp-2">{cliente.direccion}</span>
                                </div>
                            )}
                        </div>

                        {/* Actions */}
                        <div className="mt-4 pt-4 border-t border-gray-800 flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                                onClick={() => setConfirmDelete(cliente.nombre)}
                                className="px-3 py-1.5 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
                            >
                                Eliminar
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {/* Empty State */}
            {clientesList.length === 0 && (
                <div className="text-center py-20">
                    <span className="text-6xl mb-4 block grayscale opacity-30">👥</span>
                    <h3 className="text-gray-400 font-medium">No hay clientes registrados</h3>
                    <p className="text-gray-600 text-sm mt-1">Agrega tu primer cliente para comenzar</p>
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
