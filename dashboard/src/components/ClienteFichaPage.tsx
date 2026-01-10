import { useState, useRef } from 'react';
import { useDatabase } from '../context/DatabaseContext';
import type { Cliente, Documento } from '../types';

interface ClienteFichaPageProps {
    razonSocial: string;
    onBack: () => void;
}

export function ClienteFichaPage({ razonSocial, onBack }: ClienteFichaPageProps) {
    const { clientes, updateCliente, uploadLogo } = useDatabase();
    const cliente = clientes[razonSocial];
    const fileInputRef = useRef<HTMLInputElement>(null);
    const docInputRef = useRef<HTMLInputElement>(null);

    const [isEditMode, setIsEditMode] = useState(false);
    const [editData, setEditData] = useState<Partial<Cliente>>({});
    const [isSaving, setIsSaving] = useState(false);
    const [isUploadingDoc, setIsUploadingDoc] = useState(false);

    if (!cliente) {
        return (
            <div className="min-h-screen p-6 flex items-center justify-center">
                <div className="text-center">
                    <span className="text-6xl mb-4 block">❌</span>
                    <h2 className="text-xl font-bold text-white mb-2">Cliente no encontrado</h2>
                    <button
                        onClick={onBack}
                        className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-white transition-colors"
                    >
                        Volver
                    </button>
                </div>
            </div>
        );
    }

    const handleEditChange = (field: string, value: any) => {
        setEditData(prev => ({ ...prev, [field]: value }));
    };

    const handleSaveEdit = async () => {
        setIsSaving(true);
        try {
            await updateCliente(razonSocial, editData);
            setIsEditMode(false);
            setEditData({});
        } catch (err) {
            console.error('Error updating cliente:', err);
        } finally {
            setIsSaving(false);
        }
    };

    const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const url = await uploadLogo(file, `cliente-${razonSocial}`);
            if (url) {
                await updateCliente(razonSocial, { logo: url });
            }
        }
    };

    const handleDocumentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploadingDoc(true);
        try {
            const url = await uploadLogo(file, `documento-${razonSocial}-${Date.now()}`);
            if (url) {
                const nuevoDocumento: Documento = {
                    id: `doc-${Date.now()}`,
                    nombre: file.name,
                    tipo: 'otro',
                    url: url,
                    fecha_subida: new Date().toISOString(),
                    descripcion: ''
                };

                const documentosActuales = cliente.documentos || [];
                await updateCliente(razonSocial, {
                    documentos: [...documentosActuales, nuevoDocumento]
                });
            }
        } catch (err) {
            console.error('Error uploading document:', err);
        } finally {
            setIsUploadingDoc(false);
        }
    };

    const handleDeleteDocument = async (docId: string) => {
        const documentosActualizados = (cliente.documentos || []).filter(d => d.id !== docId);
        await updateCliente(razonSocial, { documentos: documentosActualizados });
    };

    const documentos = cliente.documentos || [];

    return (
        <div className="min-h-screen p-6">
            {/* Header */}
            <header className="mb-8">
                <button
                    onClick={onBack}
                    className="flex items-center gap-2 text-gray-400 hover:text-white mb-4 transition-colors group"
                >
                    <span className="group-hover:-translate-x-1 transition-transform">←</span>
                    <span>Volver a Clientes</span>
                </button>

                <div className="flex justify-between items-start gap-6">
                    {/* Left: Logo y Info Básica */}
                    <div className="flex gap-6 flex-1">
                        <div
                            onClick={() => fileInputRef.current?.click()}
                            className="relative w-32 h-32 rounded-2xl bg-blue-500/10 border-2 border-dashed border-blue-500/30 hover:border-blue-500/60 flex items-center justify-center cursor-pointer group flex-shrink-0"
                        >
                            {cliente.logo ? (
                                <img src={cliente.logo} alt="" className="w-full h-full object-cover rounded-2xl" />
                            ) : (
                                <span className="text-5xl">🏢</span>
                            )}
                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl">
                                <span className="text-sm text-white font-bold">CAMBIAR LOGO</span>
                            </div>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={handleLogoChange}
                            />
                        </div>

                        <div className="flex-1">
                            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-cyan-500 bg-clip-text text-transparent mb-2">
                                {cliente.razon_social}
                            </h1>
                            {cliente.nombre_comercial && (
                                <p className="text-lg text-blue-300 mb-4">{cliente.nombre_comercial}</p>
                            )}

                            {/* Status Badges */}
                            <div className="flex gap-3 flex-wrap mb-4">
                                <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                                    cliente.estado === 'activo'
                                        ? 'bg-green-500/20 text-green-400'
                                        : cliente.estado === 'inactivo'
                                          ? 'bg-gray-500/20 text-gray-400'
                                          : 'bg-red-500/20 text-red-400'
                                }`}>
                                    {cliente.estado.toUpperCase()}
                                </span>
                                <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                                    cliente.prioridad === 'alto'
                                        ? 'bg-red-500/20 text-red-400'
                                        : cliente.prioridad === 'medio'
                                          ? 'bg-yellow-500/20 text-yellow-400'
                                          : 'bg-blue-500/20 text-blue-400'
                                }`}>
                                    {cliente.prioridad.toUpperCase()}
                                </span>
                            </div>

                            {/* Quick Info */}
                            <div className="space-y-1 text-sm">
                                {cliente.ruc && <p className="text-gray-400"><span className="text-blue-400">RUC:</span> {cliente.ruc}</p>}
                                {cliente.grupo_empresarial && <p className="text-gray-400"><span className="text-blue-400">Grupo:</span> {cliente.grupo_empresarial}</p>}
                                {cliente.proyecto && <p className="text-gray-400"><span className="text-blue-400">Proyecto:</span> {cliente.proyecto}</p>}
                            </div>
                        </div>
                    </div>

                    {/* Right: Edit Button */}
                    <button
                        onClick={() => {
                            if (isEditMode) {
                                setEditData({});
                            }
                            setIsEditMode(!isEditMode);
                        }}
                        className={`px-6 py-3 rounded-xl font-bold transition-all whitespace-nowrap flex-shrink-0 ${
                            isEditMode
                                ? 'bg-gray-800 text-gray-300 hover:bg-gray-700 border border-gray-700'
                                : 'bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white shadow-lg shadow-blue-500/25'
                        }`}
                    >
                        {isEditMode ? '✕ Cancelar' : '✎ Editar'}
                    </button>
                </div>
            </header>

            {/* Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column: Details */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Contact Information */}
                    <div className="bg-gradient-to-br from-gray-900 to-gray-900/50 border border-blue-500/10 rounded-2xl p-6">
                        <h2 className="text-lg font-bold text-blue-300 mb-4 flex items-center gap-2">
                            <span>📋</span> Información de Contacto
                        </h2>

                        <div className="space-y-4">
                            {isEditMode ? (
                                <>
                                    <div className="space-y-2">
                                        <label className="text-xs font-semibold text-gray-400 uppercase">Contacto</label>
                                        <input
                                            type="text"
                                            value={editData.contacto ?? cliente.contacto ?? ''}
                                            onChange={(e) => handleEditChange('contacto', e.target.value)}
                                            className="w-full px-3 py-2 bg-gray-950/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-semibold text-gray-400 uppercase">Teléfono</label>
                                        <input
                                            type="tel"
                                            value={editData.telefono ?? cliente.telefono ?? ''}
                                            onChange={(e) => handleEditChange('telefono', e.target.value)}
                                            className="w-full px-3 py-2 bg-gray-950/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-semibold text-gray-400 uppercase">Email</label>
                                        <input
                                            type="email"
                                            value={editData.email ?? cliente.email ?? ''}
                                            onChange={(e) => handleEditChange('email', e.target.value)}
                                            className="w-full px-3 py-2 bg-gray-950/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-semibold text-gray-400 uppercase">Dirección</label>
                                        <input
                                            type="text"
                                            value={editData.direccion ?? cliente.direccion ?? ''}
                                            onChange={(e) => handleEditChange('direccion', e.target.value)}
                                            className="w-full px-3 py-2 bg-gray-950/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                                        />
                                    </div>
                                </>
                            ) : (
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-xs text-gray-500 mb-1">CONTACTO</p>
                                        <p className="text-white">{cliente.contacto || '—'}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500 mb-1">TELÉFONO</p>
                                        <p className="text-white">{cliente.telefono || '—'}</p>
                                    </div>
                                    <div className="col-span-2">
                                        <p className="text-xs text-gray-500 mb-1">EMAIL</p>
                                        <p className="text-white break-all">{cliente.email || '—'}</p>
                                    </div>
                                    <div className="col-span-2">
                                        <p className="text-xs text-gray-500 mb-1">DIRECCIÓN</p>
                                        <p className="text-white">{cliente.direccion || '—'}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Commercial Information */}
                    <div className="bg-gradient-to-br from-gray-900 to-gray-900/50 border border-cyan-500/10 rounded-2xl p-6">
                        <h2 className="text-lg font-bold text-cyan-300 mb-4 flex items-center gap-2">
                            <span>💼</span> Información Comercial
                        </h2>

                        <div className="space-y-4">
                            {isEditMode ? (
                                <>
                                    <div className="space-y-2">
                                        <label className="text-xs font-semibold text-gray-400 uppercase">Términos Comerciales</label>
                                        <input
                                            type="text"
                                            value={editData.terminos_comerciales ?? cliente.terminos_comerciales ?? ''}
                                            onChange={(e) => handleEditChange('terminos_comerciales', e.target.value)}
                                            placeholder="Ej: Crédito 30 días"
                                            className="w-full px-3 py-2 bg-gray-950/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-semibold text-gray-400 uppercase">Vendedor Asignado</label>
                                        <input
                                            type="text"
                                            value={editData.vendedor_asignado ?? cliente.vendedor_asignado ?? ''}
                                            onChange={(e) => handleEditChange('vendedor_asignado', e.target.value)}
                                            placeholder="Nombre del vendedor"
                                            className="w-full px-3 py-2 bg-gray-950/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                                        />
                                    </div>
                                </>
                            ) : (
                                <div className="space-y-3">
                                    <div>
                                        <p className="text-xs text-gray-500 mb-1">TÉRMINOS COMERCIALES</p>
                                        <p className="text-white">{cliente.terminos_comerciales || '—'}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500 mb-1">VENDEDOR ASIGNADO</p>
                                        <p className="text-white">{cliente.vendedor_asignado || '—'}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Notes */}
                    <div className="bg-gradient-to-br from-gray-900 to-gray-900/50 border border-purple-500/10 rounded-2xl p-6">
                        <h2 className="text-lg font-bold text-purple-300 mb-4 flex items-center gap-2">
                            <span>📝</span> Notas
                        </h2>

                        {isEditMode ? (
                            <textarea
                                value={editData.notas ?? cliente.notas ?? ''}
                                onChange={(e) => handleEditChange('notas', e.target.value)}
                                placeholder="Agregar notas..."
                                rows={4}
                                className="w-full px-3 py-2 bg-gray-950/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500 resize-none"
                            />
                        ) : (
                            <p className="text-white whitespace-pre-wrap">{cliente.notas || '—'}</p>
                        )}
                    </div>

                    {/* Save Button (visible when editing) */}
                    {isEditMode && (
                        <button
                            onClick={handleSaveEdit}
                            disabled={isSaving}
                            className="w-full px-4 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 disabled:from-gray-600 disabled:to-gray-600 rounded-xl text-white font-bold transition-all shadow-lg shadow-green-500/25 disabled:shadow-none"
                        >
                            {isSaving ? '💾 Guardando...' : '✓ Guardar Cambios'}
                        </button>
                    )}
                </div>

                {/* Right Column: Documents */}
                <div className="lg:col-span-1">
                    <div className="bg-gradient-to-br from-gray-900 to-gray-900/50 border border-orange-500/10 rounded-2xl p-6 sticky top-6">
                        <h2 className="text-lg font-bold text-orange-300 mb-4 flex items-center gap-2">
                            <span>📄</span> Documentos & Facturas
                        </h2>

                        {/* Upload Button */}
                        <button
                            onClick={() => docInputRef.current?.click()}
                            disabled={isUploadingDoc}
                            className="w-full px-4 py-3 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 disabled:from-gray-600 disabled:to-gray-600 rounded-xl text-white font-bold transition-all shadow-lg shadow-orange-500/25 disabled:shadow-none mb-4 flex items-center justify-center gap-2"
                        >
                            {isUploadingDoc ? (
                                <>
                                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Subiendo...
                                </>
                            ) : (
                                <>
                                    <span>+</span>
                                    Subir Documento
                                </>
                            )}
                        </button>

                        <input
                            ref={docInputRef}
                            type="file"
                            className="hidden"
                            onChange={handleDocumentUpload}
                        />

                        {/* Documents List */}
                        <div className="space-y-2">
                            {documentos.length === 0 ? (
                                <div className="text-center py-6 bg-gray-950/30 border border-gray-800 rounded-lg">
                                    <p className="text-sm text-gray-500">No hay documentos</p>
                                </div>
                            ) : (
                                documentos.map((doc) => (
                                    <div key={doc.id} className="bg-gray-950/30 border border-gray-800 rounded-lg p-3 space-y-2">
                                        <div className="flex items-start gap-2">
                                            <span className="text-lg flex-shrink-0">
                                                {doc.tipo === 'factura' && '🧾'}
                                                {doc.tipo === 'contrato' && '📋'}
                                                {doc.tipo === 'cotizacion' && '💰'}
                                                {doc.tipo === 'otro' && '📄'}
                                            </span>
                                            <div className="flex-1 min-w-0">
                                                <a
                                                    href={doc.url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-xs font-bold text-blue-400 hover:text-blue-300 truncate block transition-colors"
                                                >
                                                    {doc.nombre}
                                                </a>
                                                <p className="text-[10px] text-gray-500 mt-1">
                                                    {new Date(doc.fecha_subida).toLocaleDateString('es-PE')}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex gap-2">
                                            <a
                                                href={doc.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex-1 text-[10px] px-2 py-1 bg-blue-600/20 text-blue-400 hover:bg-blue-600/40 rounded transition-colors text-center"
                                            >
                                                Ver
                                            </a>
                                            <button
                                                onClick={() => handleDeleteDocument(doc.id)}
                                                className="flex-1 text-[10px] px-2 py-1 bg-red-600/20 text-red-400 hover:bg-red-600/40 rounded transition-colors"
                                            >
                                                ✕ Eliminar
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
