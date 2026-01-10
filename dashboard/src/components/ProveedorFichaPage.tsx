import { useState, useRef } from 'react';
import { useDatabase } from '../context/DatabaseContext';
import { ConfirmDialog } from './ConfirmDialog';
import type { Proveedor, Cotizacion } from '../types';

interface ProveedorFichaPageProps {
    proveedorId: string;
    onBack: () => void;
}

export function ProveedorFichaPage({ proveedorId, onBack }: ProveedorFichaPageProps) {
    const {
        proveedores,
        updateProveedor,
        uploadLogo,
        getCotizacionesByProveedor,
        createCotizacion,
        updateCotizacion,
        deleteCotizacion
    } = useDatabase();

    const proveedor = proveedores[proveedorId];
    const cotizaciones = getCotizacionesByProveedor(proveedorId);

    const [activeTab, setActiveTab] = useState<'info' | 'cotizaciones' | 'notas'>('info');
    const [isEditingInfo, setIsEditingInfo] = useState(false);
    const [editForm, setEditForm] = useState<Partial<Proveedor>>({});
    const [notasInternas, setNotasInternas] = useState(proveedor?.notas || '');
    const [showNuevaCotizacion, setShowNuevaCotizacion] = useState(false);
    const [editingCotizacion, setEditingCotizacion] = useState<Cotizacion | null>(null);
    const [confirmDeleteCotizacion, setConfirmDeleteCotizacion] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    if (!proveedor) {
        return (
            <div className="min-h-screen p-6 flex items-center justify-center">
                <div className="text-center">
                    <span className="text-6xl mb-4 block">❌</span>
                    <h2 className="text-xl text-white mb-2">Proveedor no encontrado</h2>
                    <button onClick={onBack} className="text-emerald-400 hover:text-emerald-300">
                        ← Volver al directorio
                    </button>
                </div>
            </div>
        );
    }

    const handleLogoUpload = async (file: File) => {
        const url = await uploadLogo(file, `proveedor-${proveedor.nombre}`);
        if (url) {
            updateProveedor(proveedor.nombre, { logo: url });
        }
    };

    const handleSaveInfo = async () => {
        await updateProveedor(proveedor.nombre, editForm);
        setIsEditingInfo(false);
        setEditForm({});
    };

    const handleSaveNotas = async () => {
        await updateProveedor(proveedor.nombre, { notas: notasInternas });
    };

    const startEditInfo = () => {
        setEditForm({
            razon_social: proveedor.razon_social,
            ruc: proveedor.ruc,
            contacto: proveedor.contacto,
            telefono: proveedor.telefono,
            email: proveedor.email,
            direccion: proveedor.direccion,
            especialidad: proveedor.especialidad,
            emite_factura: proveedor.emite_factura,
            incluye_igv: proveedor.incluye_igv,
            forma_pago: proveedor.forma_pago,
            tiempo_produccion: proveedor.tiempo_produccion,
            tiempo_entrega: proveedor.tiempo_entrega,
        });
        setIsEditingInfo(true);
    };

    // Color de la especialidad
    const getEspecialidadColor = (especialidad: string) => {
        const colors: Record<string, string> = {
            'Logos': 'text-purple-400 bg-purple-500/20 border-purple-500/30',
            'Importadores / Merchandising general': 'text-blue-400 bg-blue-500/20 border-blue-500/30',
            'Textil': 'text-pink-400 bg-pink-500/20 border-pink-500/30',
            'Merchandising pequeño (pines, lanyards, llaveros)': 'text-amber-400 bg-amber-500/20 border-amber-500/30',
            'Papelería': 'text-green-400 bg-green-500/20 border-green-500/30',
            'Producción gráfica / gran formato': 'text-cyan-400 bg-cyan-500/20 border-cyan-500/30',
            'POP y activaciones BTL': 'text-red-400 bg-red-500/20 border-red-500/30',
            'Ecológico': 'text-emerald-400 bg-emerald-500/20 border-emerald-500/30',
            'Acrílico y loza': 'text-indigo-400 bg-indigo-500/20 border-indigo-500/30',
            'Decoración y ambientación': 'text-rose-400 bg-rose-500/20 border-rose-500/30',
            'Servicios especiales / ad-hoc': 'text-violet-400 bg-violet-500/20 border-violet-500/30',
        };
        return colors[especialidad] || 'text-gray-400 bg-gray-500/20 border-gray-500/30';
    };

    const formatFormaPago = (forma: string) => {
        const labels: Record<string, string> = {
            'contado': 'Contado (100%)',
            'adelanto_50': '50% Adelanto',
            'adelanto_70': '70% Adelanto',
            'contra_entrega': 'Contra entrega',
            'credito': 'Crédito',
            'otro': 'Otro'
        };
        return labels[forma] || forma;
    };

    const getEstadoCotizacionColor = (estado: string) => {
        const colors: Record<string, string> = {
            'pendiente': 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
            'aprobada': 'bg-green-500/20 text-green-300 border-green-500/30',
            'rechazada': 'bg-red-500/20 text-red-300 border-red-500/30',
            'vencida': 'bg-gray-500/20 text-gray-400 border-gray-500/30',
        };
        return colors[estado] || 'bg-gray-500/20 text-gray-300';
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
                    <span>Volver al Directorio</span>
                </button>

                {/* Ficha Header */}
                <div className="bg-gradient-to-br from-gray-900 to-gray-900/50 border border-gray-800 rounded-2xl p-6">
                    <div className="flex items-start gap-6">
                        {/* Logo grande */}
                        <div
                            className="relative w-24 h-24 rounded-2xl bg-gray-800/50 border border-gray-700 flex items-center justify-center overflow-hidden cursor-pointer group"
                            onClick={() => fileInputRef.current?.click()}
                        >
                            {proveedor.logo ? (
                                <img src={proveedor.logo} alt="" className="w-full h-full object-cover" />
                            ) : (
                                <span className="text-4xl">🏭</span>
                            )}
                            <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <span className="text-xs text-white font-bold">CAMBIAR</span>
                            </div>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => e.target.files?.[0] && handleLogoUpload(e.target.files[0])}
                            />
                        </div>

                        {/* Info principal */}
                        <div className="flex-1">
                            <h1 className="text-3xl font-bold text-white mb-2">{proveedor.nombre}</h1>
                            {proveedor.razon_social && (
                                <p className="text-gray-400 text-sm mb-2">{proveedor.razon_social}</p>
                            )}
                            <div className="flex flex-wrap gap-2">
                                {proveedor.especialidad && (
                                    <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getEspecialidadColor(proveedor.especialidad)}`}>
                                        {proveedor.especialidad}
                                    </span>
                                )}
                                {proveedor.ruc && (
                                    <span className="px-3 py-1 rounded-full text-sm bg-gray-800 text-gray-300 border border-gray-700">
                                        RUC: {proveedor.ruc}
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Stats rápidos */}
                        <div className="flex gap-4">
                            <div className="text-center p-4 bg-gray-800/50 rounded-xl border border-gray-700">
                                <p className="text-2xl font-bold text-emerald-400">{cotizaciones.length}</p>
                                <p className="text-xs text-gray-500">Cotizaciones</p>
                            </div>
                            {proveedor.factor_demora !== undefined && proveedor.factor_demora > 0 && (
                                <div className="text-center p-4 bg-gray-800/50 rounded-xl border border-gray-700">
                                    <p className={`text-2xl font-bold ${proveedor.factor_demora > 1 ? 'text-red-400' : proveedor.factor_demora > 0.5 ? 'text-yellow-400' : 'text-green-400'}`}>
                                        {proveedor.factor_demora.toFixed(1)}
                                    </p>
                                    <p className="text-xs text-gray-500">Factor Demora</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </header>

            {/* Tabs */}
            <div className="flex gap-2 mb-6">
                {(['info', 'cotizaciones', 'notas'] as const).map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`px-6 py-3 rounded-xl font-medium transition-all ${
                            activeTab === tab
                                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/25'
                                : 'bg-gray-800/50 text-gray-400 hover:text-white hover:bg-gray-800'
                        }`}
                    >
                        {tab === 'info' && '📋 Información'}
                        {tab === 'cotizaciones' && `💰 Cotizaciones (${cotizaciones.length})`}
                        {tab === 'notas' && '📝 Notas Internas'}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            <div className="bg-gradient-to-br from-gray-900 to-gray-900/50 border border-gray-800 rounded-2xl p-6">
                {/* TAB: Información */}
                {activeTab === 'info' && (
                    <div>
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold text-white">Datos del Proveedor</h2>
                            {!isEditingInfo ? (
                                <button
                                    onClick={startEditInfo}
                                    className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors"
                                >
                                    ✏️ Editar
                                </button>
                            ) : (
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => { setIsEditingInfo(false); setEditForm({}); }}
                                        className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        onClick={handleSaveInfo}
                                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors"
                                    >
                                        💾 Guardar
                                    </button>
                                </div>
                            )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Contacto */}
                            <div className="space-y-4">
                                <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Contacto</h3>

                                <InfoField
                                    label="Persona de contacto"
                                    value={proveedor.contacto}
                                    icon="👤"
                                    isEditing={isEditingInfo}
                                    editValue={editForm.contacto || ''}
                                    onChange={(v) => setEditForm({ ...editForm, contacto: v })}
                                />
                                <InfoField
                                    label="Teléfono / WhatsApp"
                                    value={proveedor.telefono}
                                    icon="📞"
                                    isEditing={isEditingInfo}
                                    editValue={editForm.telefono || ''}
                                    onChange={(v) => setEditForm({ ...editForm, telefono: v })}
                                />
                                <InfoField
                                    label="Email"
                                    value={proveedor.email}
                                    icon="✉️"
                                    isEditing={isEditingInfo}
                                    editValue={editForm.email || ''}
                                    onChange={(v) => setEditForm({ ...editForm, email: v })}
                                />
                                <InfoField
                                    label="Dirección"
                                    value={proveedor.direccion}
                                    icon="📍"
                                    isEditing={isEditingInfo}
                                    editValue={editForm.direccion || ''}
                                    onChange={(v) => setEditForm({ ...editForm, direccion: v })}
                                />
                            </div>

                            {/* Condiciones comerciales */}
                            <div className="space-y-4">
                                <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Condiciones Comerciales</h3>

                                <div className="flex items-center gap-3 p-3 bg-gray-800/30 rounded-lg">
                                    <span className="text-lg">🧾</span>
                                    <div className="flex-1">
                                        <p className="text-xs text-gray-500">Emite Factura</p>
                                        {isEditingInfo ? (
                                            <select
                                                value={editForm.emite_factura ? 'si' : 'no'}
                                                onChange={(e) => setEditForm({ ...editForm, emite_factura: e.target.value === 'si' })}
                                                className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-white text-sm"
                                            >
                                                <option value="si">Sí</option>
                                                <option value="no">No</option>
                                            </select>
                                        ) : (
                                            <p className="text-white">{proveedor.emite_factura ? 'Sí' : 'No'}</p>
                                        )}
                                    </div>
                                </div>

                                <div className="flex items-center gap-3 p-3 bg-gray-800/30 rounded-lg">
                                    <span className="text-lg">💵</span>
                                    <div className="flex-1">
                                        <p className="text-xs text-gray-500">Incluye IGV</p>
                                        {isEditingInfo ? (
                                            <select
                                                value={editForm.incluye_igv || 'depende'}
                                                onChange={(e) => setEditForm({ ...editForm, incluye_igv: e.target.value as 'si' | 'no' | 'depende' })}
                                                className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-white text-sm"
                                            >
                                                <option value="si">Sí</option>
                                                <option value="no">No</option>
                                                <option value="depende">Depende</option>
                                            </select>
                                        ) : (
                                            <p className="text-white capitalize">{proveedor.incluye_igv || 'No especificado'}</p>
                                        )}
                                    </div>
                                </div>

                                <div className="flex items-center gap-3 p-3 bg-gray-800/30 rounded-lg">
                                    <span className="text-lg">💳</span>
                                    <div className="flex-1">
                                        <p className="text-xs text-gray-500">Forma de Pago</p>
                                        {isEditingInfo ? (
                                            <select
                                                value={editForm.forma_pago || ''}
                                                onChange={(e) => setEditForm({ ...editForm, forma_pago: e.target.value })}
                                                className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-white text-sm"
                                            >
                                                <option value="">Seleccionar...</option>
                                                <option value="contado">Contado (100%)</option>
                                                <option value="adelanto_50">50% Adelanto</option>
                                                <option value="adelanto_70">70% Adelanto</option>
                                                <option value="contra_entrega">Contra entrega</option>
                                                <option value="credito">Crédito</option>
                                                <option value="otro">Otro</option>
                                            </select>
                                        ) : (
                                            <p className="text-white">{proveedor.forma_pago ? formatFormaPago(proveedor.forma_pago) : 'No especificado'}</p>
                                        )}
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div className="p-3 bg-gray-800/30 rounded-lg">
                                        <p className="text-xs text-gray-500 mb-1">⏱️ Tiempo Producción</p>
                                        {isEditingInfo ? (
                                            <input
                                                type="number"
                                                value={editForm.tiempo_produccion || ''}
                                                onChange={(e) => setEditForm({ ...editForm, tiempo_produccion: parseInt(e.target.value) || undefined })}
                                                className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-white text-sm"
                                                placeholder="días"
                                            />
                                        ) : (
                                            <p className="text-white">{proveedor.tiempo_produccion ? `${proveedor.tiempo_produccion} días` : '-'}</p>
                                        )}
                                    </div>
                                    <div className="p-3 bg-gray-800/30 rounded-lg">
                                        <p className="text-xs text-gray-500 mb-1">🚚 Tiempo Entrega</p>
                                        {isEditingInfo ? (
                                            <input
                                                type="number"
                                                value={editForm.tiempo_entrega || ''}
                                                onChange={(e) => setEditForm({ ...editForm, tiempo_entrega: parseInt(e.target.value) || undefined })}
                                                className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-white text-sm"
                                                placeholder="días"
                                            />
                                        ) : (
                                            <p className="text-white">{proveedor.tiempo_entrega ? `${proveedor.tiempo_entrega} días` : '-'}</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* TAB: Cotizaciones */}
                {activeTab === 'cotizaciones' && (
                    <div>
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold text-white">Historial de Cotizaciones</h2>
                            <button
                                onClick={() => setShowNuevaCotizacion(true)}
                                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors flex items-center gap-2"
                            >
                                <span>+</span> Nueva Cotización
                            </button>
                        </div>

                        {cotizaciones.length === 0 ? (
                            <div className="text-center py-12">
                                <span className="text-5xl mb-4 block opacity-30">💰</span>
                                <p className="text-gray-400">No hay cotizaciones registradas</p>
                                <p className="text-gray-600 text-sm mt-1">Agrega la primera cotización de este proveedor</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {cotizaciones
                                    .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
                                    .map(cot => (
                                        <CotizacionCard
                                            key={cot.id}
                                            cotizacion={cot}
                                            onEdit={() => setEditingCotizacion(cot)}
                                            onDelete={() => setConfirmDeleteCotizacion(cot.id)}
                                            getEstadoColor={getEstadoCotizacionColor}
                                            formatFormaPago={formatFormaPago}
                                        />
                                    ))}
                            </div>
                        )}
                    </div>
                )}

                {/* TAB: Notas Internas */}
                {activeTab === 'notas' && (
                    <div>
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold text-white">Notas Internas</h2>
                            <button
                                onClick={handleSaveNotas}
                                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors"
                            >
                                💾 Guardar Notas
                            </button>
                        </div>
                        <textarea
                            value={notasInternas}
                            onChange={(e) => setNotasInternas(e.target.value)}
                            placeholder="Escribe aquí notas internas sobre este proveedor...&#10;&#10;Por ejemplo:&#10;- Calidad de productos&#10;- Puntualidad en entregas&#10;- Trato con el personal&#10;- Incidentes pasados&#10;- Recomendaciones"
                            className="w-full h-80 px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-emerald-500 transition-all resize-none"
                        />
                        <p className="text-gray-600 text-xs mt-2">
                            Estas notas son privadas y solo visibles para el equipo interno.
                        </p>
                    </div>
                )}
            </div>

            {/* Modal Nueva/Editar Cotización */}
            {(showNuevaCotizacion || editingCotizacion) && (
                <CotizacionModal
                    isOpen={true}
                    cotizacion={editingCotizacion}
                    proveedorId={proveedorId}
                    onClose={() => {
                        setShowNuevaCotizacion(false);
                        setEditingCotizacion(null);
                    }}
                    onSave={async (data) => {
                        if (editingCotizacion) {
                            await updateCotizacion(editingCotizacion.id, data);
                        } else {
                            await createCotizacion(data as Omit<Cotizacion, 'id' | 'created_at' | 'updated_at'>);
                        }
                        setShowNuevaCotizacion(false);
                        setEditingCotizacion(null);
                    }}
                />
            )}

            {/* Confirm Delete Cotización */}
            <ConfirmDialog
                isOpen={confirmDeleteCotizacion !== null}
                title="Eliminar Cotización"
                message="¿Estás seguro de eliminar esta cotización? Esta acción no se puede deshacer."
                confirmText="Eliminar"
                cancelText="Cancelar"
                variant="danger"
                onConfirm={async () => {
                    if (confirmDeleteCotizacion) {
                        await deleteCotizacion(confirmDeleteCotizacion);
                        setConfirmDeleteCotizacion(null);
                    }
                }}
                onCancel={() => setConfirmDeleteCotizacion(null)}
            />
        </div>
    );
}

// Componente auxiliar para campos de información
function InfoField({
    label,
    value,
    icon,
    isEditing,
    editValue,
    onChange
}: {
    label: string;
    value?: string | null;
    icon: string;
    isEditing: boolean;
    editValue: string;
    onChange: (value: string) => void;
}) {
    return (
        <div className="flex items-center gap-3 p-3 bg-gray-800/30 rounded-lg">
            <span className="text-lg">{icon}</span>
            <div className="flex-1">
                <p className="text-xs text-gray-500">{label}</p>
                {isEditing ? (
                    <input
                        type="text"
                        value={editValue}
                        onChange={(e) => onChange(e.target.value)}
                        className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-white text-sm"
                    />
                ) : (
                    <p className="text-white">{value || '-'}</p>
                )}
            </div>
        </div>
    );
}

// Componente para mostrar una cotización
function CotizacionCard({
    cotizacion,
    onEdit,
    onDelete,
    getEstadoColor,
    formatFormaPago
}: {
    cotizacion: Cotizacion;
    onEdit: () => void;
    onDelete: () => void;
    getEstadoColor: (estado: string) => string;
    formatFormaPago: (forma: string) => string;
}) {
    const fecha = new Date(cotizacion.fecha).toLocaleDateString('es-PE', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    });

    return (
        <div className="bg-gray-800/30 border border-gray-700 rounded-xl p-5 hover:border-gray-600 transition-all group">
            <div className="flex justify-between items-start mb-4">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <span className={`px-2 py-0.5 text-xs font-medium rounded-full border ${getEstadoColor(cotizacion.estado)}`}>
                            {cotizacion.estado.charAt(0).toUpperCase() + cotizacion.estado.slice(1)}
                        </span>
                        <span className="text-gray-500 text-sm">{fecha}</span>
                    </div>
                    <h4 className="text-white font-medium">{cotizacion.descripcion}</h4>
                </div>
                <div className="text-right">
                    <p className="text-2xl font-bold text-emerald-400">
                        {cotizacion.moneda === 'USD' ? '$' : 'S/'} {cotizacion.precio_total.toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-500">
                        {cotizacion.incluye_igv ? 'Incluye IGV' : 'Sin IGV'}
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm mb-4">
                {cotizacion.cantidad && (
                    <div>
                        <p className="text-gray-500 text-xs">Cantidad</p>
                        <p className="text-white">{cotizacion.cantidad} unid.</p>
                    </div>
                )}
                {cotizacion.tiempo_produccion && (
                    <div>
                        <p className="text-gray-500 text-xs">Producción</p>
                        <p className="text-white">{cotizacion.tiempo_produccion} días</p>
                    </div>
                )}
                <div>
                    <p className="text-gray-500 text-xs">Forma de Pago</p>
                    <p className="text-white">{formatFormaPago(cotizacion.forma_pago)}</p>
                </div>
                {cotizacion.prueba_color && (
                    <div>
                        <p className="text-gray-500 text-xs">Extras</p>
                        <p className="text-green-400">✓ Prueba de color</p>
                    </div>
                )}
            </div>

            {(cotizacion.banco || cotizacion.yape_plin) && (
                <div className="pt-3 border-t border-gray-700/50 text-sm">
                    <p className="text-gray-500 text-xs mb-1">Datos de pago</p>
                    {cotizacion.banco && cotizacion.cuenta_bancaria && (
                        <p className="text-gray-300">{cotizacion.banco}: {cotizacion.cuenta_bancaria}</p>
                    )}
                    {cotizacion.yape_plin && (
                        <p className="text-gray-300">Yape/Plin: {cotizacion.yape_plin}</p>
                    )}
                </div>
            )}

            {cotizacion.notas && (
                <div className="pt-3 border-t border-gray-700/50 mt-3">
                    <p className="text-gray-400 text-sm italic">"{cotizacion.notas}"</p>
                </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-gray-700/50 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                    onClick={onEdit}
                    className="px-3 py-1.5 text-xs text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
                >
                    ✏️ Editar
                </button>
                <button
                    onClick={onDelete}
                    className="px-3 py-1.5 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
                >
                    🗑️ Eliminar
                </button>
            </div>
        </div>
    );
}

// Modal para crear/editar cotización
function CotizacionModal({
    isOpen,
    cotizacion,
    proveedorId,
    onClose,
    onSave
}: {
    isOpen: boolean;
    cotizacion: Cotizacion | null;
    proveedorId: string;
    onClose: () => void;
    onSave: (data: Partial<Cotizacion>) => void;
}) {
    const [form, setForm] = useState<Partial<Cotizacion>>(cotizacion || {
        proveedor_id: proveedorId,
        fecha: new Date().toISOString().split('T')[0],
        descripcion: '',
        precio_total: 0,
        incluye_igv: false,
        moneda: 'PEN',
        forma_pago: 'adelanto_50',
        estado: 'pendiente',
    });

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(form);
    };

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <div className="p-6 border-b border-gray-800">
                    <h2 className="text-xl font-bold text-white">
                        {cotizacion ? 'Editar Cotización' : 'Nueva Cotización'}
                    </h2>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {/* Básicos */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm text-gray-400 mb-1">Fecha *</label>
                            <input
                                type="date"
                                value={form.fecha?.split('T')[0] || ''}
                                onChange={(e) => setForm({ ...form, fecha: e.target.value })}
                                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-gray-400 mb-1">Estado</label>
                            <select
                                value={form.estado || 'pendiente'}
                                onChange={(e) => setForm({ ...form, estado: e.target.value as Cotizacion['estado'] })}
                                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                            >
                                <option value="pendiente">Pendiente</option>
                                <option value="aprobada">Aprobada</option>
                                <option value="rechazada">Rechazada</option>
                                <option value="vencida">Vencida</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm text-gray-400 mb-1">Descripción del producto/servicio *</label>
                        <textarea
                            value={form.descripcion || ''}
                            onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
                            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white h-20 resize-none"
                            placeholder="Ej: 500 polos de algodón con estampado full color"
                            required
                        />
                    </div>

                    {/* Precio */}
                    <div className="grid grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm text-gray-400 mb-1">Cantidad</label>
                            <input
                                type="number"
                                value={form.cantidad || ''}
                                onChange={(e) => setForm({ ...form, cantidad: parseInt(e.target.value) || undefined })}
                                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                                placeholder="Unidades"
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-gray-400 mb-1">Precio Total *</label>
                            <input
                                type="number"
                                step="0.01"
                                value={form.precio_total || ''}
                                onChange={(e) => setForm({ ...form, precio_total: parseFloat(e.target.value) || 0 })}
                                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-gray-400 mb-1">Moneda</label>
                            <select
                                value={form.moneda || 'PEN'}
                                onChange={(e) => setForm({ ...form, moneda: e.target.value as 'PEN' | 'USD' })}
                                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                            >
                                <option value="PEN">Soles (S/)</option>
                                <option value="USD">Dólares ($)</option>
                            </select>
                        </div>
                    </div>

                    <div className="flex items-center gap-6">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={form.incluye_igv || false}
                                onChange={(e) => setForm({ ...form, incluye_igv: e.target.checked })}
                                className="w-4 h-4 rounded border-gray-600 text-emerald-500 focus:ring-emerald-500"
                            />
                            <span className="text-gray-300">Incluye IGV</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={form.prueba_color || false}
                                onChange={(e) => setForm({ ...form, prueba_color: e.target.checked })}
                                className="w-4 h-4 rounded border-gray-600 text-emerald-500 focus:ring-emerald-500"
                            />
                            <span className="text-gray-300">Prueba de color</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={form.muestra_fisica || false}
                                onChange={(e) => setForm({ ...form, muestra_fisica: e.target.checked })}
                                className="w-4 h-4 rounded border-gray-600 text-emerald-500 focus:ring-emerald-500"
                            />
                            <span className="text-gray-300">Muestra física</span>
                        </label>
                    </div>

                    {/* Condiciones de pago */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm text-gray-400 mb-1">Forma de Pago</label>
                            <select
                                value={form.forma_pago || 'adelanto_50'}
                                onChange={(e) => setForm({ ...form, forma_pago: e.target.value as Cotizacion['forma_pago'] })}
                                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                            >
                                <option value="contado">Contado (100%)</option>
                                <option value="adelanto_50">50% Adelanto</option>
                                <option value="adelanto_70">70% Adelanto</option>
                                <option value="contra_entrega">Contra entrega</option>
                                <option value="credito">Crédito</option>
                                <option value="otro">Otro</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm text-gray-400 mb-1">Vigencia (días)</label>
                            <input
                                type="number"
                                value={form.vigencia_dias || ''}
                                onChange={(e) => setForm({ ...form, vigencia_dias: parseInt(e.target.value) || undefined })}
                                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                                placeholder="Ej: 15"
                            />
                        </div>
                    </div>

                    {/* Tiempos */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm text-gray-400 mb-1">Tiempo de Producción (días)</label>
                            <input
                                type="number"
                                value={form.tiempo_produccion || ''}
                                onChange={(e) => setForm({ ...form, tiempo_produccion: parseInt(e.target.value) || undefined })}
                                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-gray-400 mb-1">Tiempo de Entrega (días)</label>
                            <input
                                type="number"
                                value={form.tiempo_entrega || ''}
                                onChange={(e) => setForm({ ...form, tiempo_entrega: parseInt(e.target.value) || undefined })}
                                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                            />
                        </div>
                    </div>

                    {/* Datos bancarios */}
                    <div className="border-t border-gray-800 pt-4">
                        <h3 className="text-sm font-semibold text-gray-400 mb-3">Datos de Pago (opcional)</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm text-gray-400 mb-1">Banco</label>
                                <input
                                    type="text"
                                    value={form.banco || ''}
                                    onChange={(e) => setForm({ ...form, banco: e.target.value })}
                                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                                    placeholder="Ej: BCP, Interbank"
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-gray-400 mb-1">Cuenta Corriente</label>
                                <input
                                    type="text"
                                    value={form.cuenta_bancaria || ''}
                                    onChange={(e) => setForm({ ...form, cuenta_bancaria: e.target.value })}
                                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-gray-400 mb-1">CCI</label>
                                <input
                                    type="text"
                                    value={form.cci || ''}
                                    onChange={(e) => setForm({ ...form, cci: e.target.value })}
                                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-gray-400 mb-1">Yape / Plin</label>
                                <input
                                    type="text"
                                    value={form.yape_plin || ''}
                                    onChange={(e) => setForm({ ...form, yape_plin: e.target.value })}
                                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                                    placeholder="Número de celular"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Notas */}
                    <div>
                        <label className="block text-sm text-gray-400 mb-1">Notas adicionales</label>
                        <textarea
                            value={form.notas || ''}
                            onChange={(e) => setForm({ ...form, notas: e.target.value })}
                            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white h-20 resize-none"
                            placeholder="Observaciones, condiciones especiales, etc."
                        />
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end gap-3 pt-4 border-t border-gray-800">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors"
                        >
                            {cotizacion ? 'Guardar Cambios' : 'Crear Cotización'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
