import { useState, useRef, useEffect } from 'react';
import { useDatabase } from '../context/DatabaseContext';
import { NuevoProveedorModal } from './NuevoProveedorModal';
import { ConfirmDialog } from './ConfirmDialog';

interface ProveedoresPageProps {
    onBack: () => void;
    onSelectProveedor?: (proveedorId: string) => void;
}

export function ProveedoresPage({ onBack, onSelectProveedor }: ProveedoresPageProps) {
    const { proveedores, updateProveedor, deleteProveedor, uploadLogo } = useDatabase();
    const [search, setSearch] = useState('');
    const [filterCategoria, setFilterCategoria] = useState<string | null>(null);
    const [showNuevoModal, setShowNuevoModal] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
    const [showCategoriaDropdown, setShowCategoriaDropdown] = useState(false);
    const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Cerrar dropdown al hacer click fuera
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setShowCategoriaDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Obtener categorías únicas de los proveedores
    const categoriasDisponibles = Array.from(
        new Set(
            Object.values(proveedores)
                .map(p => p.especialidad)
                .filter(Boolean)
        )
    ).sort();

    const proveedoresList = Object.values(proveedores).filter(p => {
        const matchesSearch =
            p.nombre.toLowerCase().includes(search.toLowerCase()) ||
            p.contacto?.toLowerCase().includes(search.toLowerCase()) ||
            p.especialidad?.toLowerCase().includes(search.toLowerCase()) ||
            p.telefono?.includes(search);

        const matchesCategoria = !filterCategoria || p.especialidad === filterCategoria;

        return matchesSearch && matchesCategoria;
    });

    const handleLogoUpload = async (nombre: string, file: File) => {
        const url = await uploadLogo(file, `proveedor-${nombre}`);
        if (url) {
            updateProveedor(nombre, { logo: url });
        }
    };

    const handleDelete = async () => {
        if (confirmDelete) {
            await deleteProveedor(confirmDelete);
            setConfirmDelete(null);
        }
    };

    // Colores por especialidad
    const getEspecialidadColor = (especialidad: string) => {
        const colors: Record<string, string> = {
            'Logos': 'from-purple-500/20 to-purple-600/10 border-purple-500/30',
            'Importadores / Merchandising general': 'from-blue-500/20 to-blue-600/10 border-blue-500/30',
            'Textil': 'from-pink-500/20 to-pink-600/10 border-pink-500/30',
            'Merchandising pequeño (pines, lanyards, llaveros)': 'from-amber-500/20 to-amber-600/10 border-amber-500/30',
            'Papelería': 'from-green-500/20 to-green-600/10 border-green-500/30',
            'Producción gráfica / gran formato': 'from-cyan-500/20 to-cyan-600/10 border-cyan-500/30',
            'POP y activaciones BTL': 'from-red-500/20 to-red-600/10 border-red-500/30',
            'Ecológico': 'from-emerald-500/20 to-emerald-600/10 border-emerald-500/30',
            'Acrílico y loza': 'from-indigo-500/20 to-indigo-600/10 border-indigo-500/30',
            'Decoración y ambientación': 'from-rose-500/20 to-rose-600/10 border-rose-500/30',
            'Servicios especiales / ad-hoc': 'from-violet-500/20 to-violet-600/10 border-violet-500/30',
        };
        return colors[especialidad] || 'from-gray-500/20 to-gray-600/10 border-gray-500/30';
    };

    const getBadgeColor = (especialidad: string) => {
        const colors: Record<string, string> = {
            'Logos': 'bg-purple-500/20 text-purple-300 border-purple-500/30',
            'Importadores / Merchandising general': 'bg-blue-500/20 text-blue-300 border-blue-500/30',
            'Textil': 'bg-pink-500/20 text-pink-300 border-pink-500/30',
            'Merchandising pequeño (pines, lanyards, llaveros)': 'bg-amber-500/20 text-amber-300 border-amber-500/30',
            'Papelería': 'bg-green-500/20 text-green-300 border-green-500/30',
            'Producción gráfica / gran formato': 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
            'POP y activaciones BTL': 'bg-red-500/20 text-red-300 border-red-500/30',
            'Ecológico': 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
            'Acrílico y loza': 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
            'Decoración y ambientación': 'bg-rose-500/20 text-rose-300 border-rose-500/30',
            'Servicios especiales / ad-hoc': 'bg-violet-500/20 text-violet-300 border-violet-500/30',
        };
        return colors[especialidad] || 'bg-gray-500/20 text-gray-300 border-gray-500/30';
    };

    // Color del dot indicador para el dropdown
    const getDotColor = (especialidad: string) => {
        const colors: Record<string, string> = {
            'Logos': 'bg-purple-500',
            'Importadores / Merchandising general': 'bg-blue-500',
            'Textil': 'bg-pink-500',
            'Merchandising pequeño (pines, lanyards, llaveros)': 'bg-amber-500',
            'Papelería': 'bg-green-500',
            'Producción gráfica / gran formato': 'bg-cyan-500',
            'POP y activaciones BTL': 'bg-red-500',
            'Ecológico': 'bg-emerald-500',
            'Acrílico y loza': 'bg-indigo-500',
            'Decoración y ambientación': 'bg-rose-500',
            'Servicios especiales / ad-hoc': 'bg-violet-500',
        };
        return colors[especialidad] || 'bg-gray-500';
    };

    // Contar proveedores por categoría
    const contarPorCategoria = (categoria: string) => {
        return Object.values(proveedores).filter(p => p.especialidad === categoria).length;
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
                        <h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-400 to-teal-500 bg-clip-text text-transparent flex items-center gap-3">
                            <span className="text-4xl">🏭</span>
                            Directorio de Proveedores
                        </h1>
                        <p className="text-gray-400 mt-1">{proveedoresList.length} proveedores registrados</p>
                    </div>
                    <button
                        onClick={() => setShowNuevoModal(true)}
                        className="px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 rounded-xl text-white font-bold transition-all shadow-lg shadow-emerald-500/25 flex items-center gap-2"
                    >
                        <span className="text-xl">+</span>
                        Nuevo Proveedor
                    </button>
                </div>
            </header>

            {/* Search & Filters */}
            <div className="mb-6 flex flex-wrap gap-4">
                <input
                    type="text"
                    placeholder="Buscar por nombre, contacto, especialidad o teléfono..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="flex-1 min-w-[300px] px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 transition-all"
                />
                {/* Dropdown personalizado con colores */}
                <div className="relative" ref={dropdownRef}>
                    <button
                        onClick={() => setShowCategoriaDropdown(!showCategoriaDropdown)}
                        className={`px-4 py-3 bg-gray-900/50 border rounded-xl text-white focus:outline-none transition-all cursor-pointer flex items-center gap-3 min-w-[280px] justify-between ${
                            showCategoriaDropdown ? 'border-emerald-500' : 'border-gray-700 hover:border-gray-600'
                        }`}
                    >
                        <div className="flex items-center gap-2">
                            {filterCategoria ? (
                                <>
                                    <span className={`w-3 h-3 rounded-full ${getDotColor(filterCategoria)}`}></span>
                                    <span className="truncate max-w-[200px]">{filterCategoria}</span>
                                </>
                            ) : (
                                <>
                                    <span className="w-3 h-3 rounded-full bg-gradient-to-r from-purple-500 via-emerald-500 to-cyan-500"></span>
                                    <span>Todas las categorías</span>
                                </>
                            )}
                        </div>
                        <span className={`transition-transform ${showCategoriaDropdown ? 'rotate-180' : ''}`}>▼</span>
                    </button>

                    {showCategoriaDropdown && (
                        <div className="absolute z-50 mt-2 w-full bg-gray-900 border border-gray-700 rounded-xl shadow-2xl shadow-black/50 overflow-hidden">
                            {/* Opción "Todas" */}
                            <button
                                onClick={() => {
                                    setFilterCategoria(null);
                                    setShowCategoriaDropdown(false);
                                }}
                                className={`w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-800 transition-colors text-left ${
                                    !filterCategoria ? 'bg-emerald-500/10 border-l-2 border-emerald-500' : ''
                                }`}
                            >
                                <span className="w-3 h-3 rounded-full bg-gradient-to-r from-purple-500 via-emerald-500 to-cyan-500"></span>
                                <span className="text-white">Todas las categorías</span>
                                <span className="ml-auto text-xs text-gray-500">{Object.keys(proveedores).length}</span>
                            </button>

                            <div className="h-px bg-gray-800"></div>

                            {/* Lista de categorías con scroll */}
                            <div className="max-h-[320px] overflow-y-auto">
                                {categoriasDisponibles.map(cat => (
                                    <button
                                        key={cat}
                                        onClick={() => {
                                            setFilterCategoria(cat);
                                            setShowCategoriaDropdown(false);
                                        }}
                                        className={`w-full px-4 py-2.5 flex items-center gap-3 hover:bg-gray-800 transition-colors text-left ${
                                            filterCategoria === cat ? 'bg-emerald-500/10 border-l-2 border-emerald-500' : ''
                                        }`}
                                    >
                                        <span className={`w-3 h-3 rounded-full ${getDotColor(cat)} flex-shrink-0`}></span>
                                        <span className="text-gray-300 text-sm truncate">{cat}</span>
                                        <span className="ml-auto text-xs text-gray-600 flex-shrink-0">{contarPorCategoria(cat)}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Grid de Proveedores */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {proveedoresList.map(proveedor => (
                    <div
                        key={proveedor.nombre}
                        onClick={() => onSelectProveedor?.(proveedor.nombre)}
                        className={`bg-gradient-to-br ${getEspecialidadColor(proveedor.especialidad || '')} border rounded-xl p-5 transition-all group hover:scale-[1.02] cursor-pointer hover:shadow-lg hover:shadow-emerald-500/10`}
                    >
                        {/* Logo y Nombre */}
                        <div className="flex items-start gap-4 mb-4">
                            <div
                                className="relative w-14 h-14 rounded-xl bg-gray-800/50 border border-gray-700 flex items-center justify-center overflow-hidden cursor-pointer group/logo"
                                onClick={() => fileInputRefs.current[proveedor.nombre]?.click()}
                            >
                                {proveedor.logo ? (
                                    <img src={proveedor.logo} alt="" className="w-full h-full object-cover" />
                                ) : (
                                    <span className="text-2xl">🏭</span>
                                )}
                                <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover/logo:opacity-100 transition-opacity">
                                    <span className="text-[8px] text-white font-bold">CAMBIAR</span>
                                </div>
                                <input
                                    ref={el => { fileInputRefs.current[proveedor.nombre] = el; }}
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={(e) => e.target.files?.[0] && handleLogoUpload(proveedor.nombre, e.target.files[0])}
                                />
                            </div>
                            <div className="flex-1 min-w-0">
                                <h3 className="font-bold text-white truncate">{proveedor.nombre}</h3>
                                {proveedor.especialidad && (
                                    <span className={`inline-block mt-1 px-2 py-0.5 text-[10px] font-medium rounded-full border ${getBadgeColor(proveedor.especialidad)}`}>
                                        {proveedor.especialidad.length > 20 ? proveedor.especialidad.slice(0, 20) + '...' : proveedor.especialidad}
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Info */}
                        <div className="space-y-2 text-sm">
                            {proveedor.contacto && (
                                <div className="flex items-center gap-2 text-gray-400">
                                    <span className="text-xs">👤</span>
                                    <span className="truncate">{proveedor.contacto}</span>
                                </div>
                            )}
                            {proveedor.telefono && (
                                <div className="flex items-center gap-2 text-gray-400">
                                    <span className="text-xs">📞</span>
                                    <span>{proveedor.telefono}</span>
                                </div>
                            )}
                            {proveedor.email && (
                                <div className="flex items-center gap-2 text-gray-400">
                                    <span className="text-xs">✉️</span>
                                    <span className="truncate text-xs">{proveedor.email}</span>
                                </div>
                            )}
                            {proveedor.direccion && (
                                <div className="flex items-start gap-2 text-gray-400">
                                    <span className="text-xs">📍</span>
                                    <span className="text-xs line-clamp-2">{proveedor.direccion}</span>
                                </div>
                            )}
                        </div>

                        {/* Factor de demora */}
                        {proveedor.factor_demora !== undefined && proveedor.factor_demora > 0 && (
                            <div className="mt-3 pt-3 border-t border-gray-700/50">
                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-gray-500">Factor demora:</span>
                                    <span className={`text-xs font-mono ${proveedor.factor_demora > 1 ? 'text-red-400' : proveedor.factor_demora > 0.5 ? 'text-yellow-400' : 'text-green-400'}`}>
                                        {proveedor.factor_demora.toFixed(1)}
                                    </span>
                                </div>
                            </div>
                        )}

                        {/* Actions */}
                        <div className="mt-4 pt-4 border-t border-gray-800/50 flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                                onClick={() => setConfirmDelete(proveedor.nombre)}
                                className="px-3 py-1.5 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
                            >
                                Eliminar
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {/* Empty State */}
            {proveedoresList.length === 0 && (
                <div className="text-center py-20">
                    <span className="text-6xl mb-4 block grayscale opacity-30">🏭</span>
                    <h3 className="text-gray-400 font-medium">No hay proveedores registrados</h3>
                    <p className="text-gray-600 text-sm mt-1">
                        {search || filterCategoria ? 'No se encontraron resultados para tu búsqueda' : 'Agrega tu primer proveedor para comenzar'}
                    </p>
                </div>
            )}

            <NuevoProveedorModal isOpen={showNuevoModal} onClose={() => setShowNuevoModal(false)} />

            <ConfirmDialog
                isOpen={confirmDelete !== null}
                title="Eliminar Proveedor"
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
