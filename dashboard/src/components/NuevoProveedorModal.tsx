import { useState, useRef } from 'react';
import { useDatabase } from '../context/DatabaseContext';
import { CATEGORIAS_PROVEEDOR } from '../types';

interface NuevoProveedorModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function NuevoProveedorModal({ isOpen, onClose }: NuevoProveedorModalProps) {
    const { createProveedor, uploadLogo } = useDatabase();
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Form state
    const [formData, setFormData] = useState({
        // Sección 1 - Identificación
        nombre: '',
        razon_social: '',
        ruc: '',
        contacto: '',
        telefono: '',
        email: '',
        direccion: '',
        // Sección 2 - Capacidades
        categorias: [] as string[],
        // Sección 3 - Condiciones comerciales
        emite_factura: undefined as boolean | undefined,
        incluye_igv: '' as '' | 'si' | 'no' | 'depende',
        forma_pago: '',
        tiempo_produccion: '',
        tiempo_entrega: '',
        minimo_produccion: '',
        // Sección 4 - Observaciones
        notas: ''
    });

    const [logoPreview, setLogoPreview] = useState<string | null>(null);
    const [logoFile, setLogoFile] = useState<File | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [activeSection, setActiveSection] = useState(1);

    if (!isOpen) return null;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: '' }));
        }
    };

    const handleCategoriaToggle = (categoria: string) => {
        setFormData(prev => ({
            ...prev,
            categorias: prev.categorias.includes(categoria)
                ? prev.categorias.filter(c => c !== categoria)
                : [...prev.categorias, categoria]
        }));
    };

    const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setLogoFile(file);
            const reader = new FileReader();
            reader.onloadend = () => setLogoPreview(reader.result as string);
            reader.readAsDataURL(file);
        }
    };

    const validate = () => {
        const newErrors: Record<string, string> = {};
        if (!formData.nombre.trim()) {
            newErrors.nombre = 'El nombre comercial es requerido';
        }
        if (formData.ruc && !/^\d{11}$/.test(formData.ruc)) {
            newErrors.ruc = 'El RUC debe tener 11 dígitos';
        }
        if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
            newErrors.email = 'Email inválido';
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) {
            setActiveSection(1);
            return;
        }

        setIsSubmitting(true);
        try {
            let logoUrl: string | undefined;
            if (logoFile) {
                const url = await uploadLogo(logoFile, `proveedor-${formData.nombre}`);
                if (url) logoUrl = url;
            }

            await createProveedor({
                nombre: formData.nombre.trim(),
                razon_social: formData.razon_social || undefined,
                ruc: formData.ruc || undefined,
                contacto: formData.contacto || undefined,
                telefono: formData.telefono || undefined,
                email: formData.email || undefined,
                direccion: formData.direccion || undefined,
                categorias: formData.categorias.length > 0 ? formData.categorias : undefined,
                especialidad: formData.categorias[0] || 'General',
                emite_factura: formData.emite_factura,
                incluye_igv: formData.incluye_igv || undefined,
                forma_pago: formData.forma_pago || undefined,
                tiempo_produccion: formData.tiempo_produccion ? Number(formData.tiempo_produccion) : undefined,
                tiempo_entrega: formData.tiempo_entrega ? Number(formData.tiempo_entrega) : undefined,
                minimo_produccion: formData.minimo_produccion || undefined,
                factor_demora: 0,
                notas: formData.notas || undefined,
                logo: logoUrl
            });

            handleClose();
        } catch (err) {
            console.error('Error creating proveedor:', err);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleClose = () => {
        setFormData({
            nombre: '', razon_social: '', ruc: '', contacto: '', telefono: '', email: '', direccion: '',
            categorias: [], emite_factura: undefined, incluye_igv: '', forma_pago: '',
            tiempo_produccion: '', tiempo_entrega: '', minimo_produccion: '', notas: ''
        });
        setLogoPreview(null);
        setLogoFile(null);
        setErrors({});
        setActiveSection(1);
        onClose();
    };

    const sections = [
        { id: 1, title: 'Identificación', icon: '🏢' },
        { id: 2, title: 'Capacidades', icon: '🔧' },
        { id: 3, title: 'Condiciones', icon: '💰' },
        { id: 4, title: 'Notas', icon: '📝' }
    ];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={handleClose} />

            {/* Modal */}
            <div className="relative w-full max-w-2xl mx-4 max-h-[90vh] animate-in zoom-in-95 fade-in duration-200">
                <div className="bg-gradient-to-br from-gray-900 via-gray-900 to-purple-950/30 border border-purple-500/20 rounded-2xl shadow-2xl shadow-purple-500/10 overflow-hidden flex flex-col max-h-[90vh]">
                    {/* Header */}
                    <div className="relative px-6 py-5 border-b border-purple-500/10 flex-shrink-0">
                        <div className="absolute inset-0 bg-gradient-to-r from-purple-600/10 via-transparent to-pink-600/10" />
                        <div className="relative flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center">
                                    <span className="text-xl">🏭</span>
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-white">Nuevo Proveedor</h2>
                                    <p className="text-xs text-purple-400/60">Registrar proveedor en el sistema</p>
                                </div>
                            </div>
                            <button
                                onClick={handleClose}
                                className="w-8 h-8 rounded-lg bg-gray-800/50 hover:bg-gray-700 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
                            >
                                ✕
                            </button>
                        </div>
                    </div>

                    {/* Section Tabs */}
                    <div className="flex border-b border-gray-800 px-4 flex-shrink-0">
                        {sections.map(section => (
                            <button
                                key={section.id}
                                onClick={() => setActiveSection(section.id)}
                                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-all border-b-2 -mb-px ${
                                    activeSection === section.id
                                        ? 'border-purple-500 text-purple-400'
                                        : 'border-transparent text-gray-500 hover:text-gray-300'
                                }`}
                            >
                                <span>{section.icon}</span>
                                <span className="hidden sm:inline">{section.title}</span>
                            </button>
                        ))}
                    </div>

                    {/* Form Content */}
                    <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
                        <div className="p-6 space-y-5 overflow-y-auto flex-1">
                            {/* Sección 1 - Identificación */}
                            {activeSection === 1 && (
                                <div className="space-y-5 animate-in fade-in duration-200">
                                    {/* Logo Upload */}
                                    <div className="flex justify-center">
                                        <div
                                            onClick={() => fileInputRef.current?.click()}
                                            className="relative w-20 h-20 rounded-xl bg-gray-800/50 border-2 border-dashed border-purple-500/30 hover:border-purple-500/60 flex items-center justify-center cursor-pointer group transition-all overflow-hidden"
                                        >
                                            {logoPreview ? (
                                                <img src={logoPreview} alt="Preview" className="w-full h-full object-cover" />
                                            ) : (
                                                <span className="text-2xl text-purple-400/50 group-hover:text-purple-400 transition-colors">🏭</span>
                                            )}
                                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                <span className="text-[9px] text-white font-bold">LOGO</span>
                                            </div>
                                        </div>
                                        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
                                    </div>

                                    {/* Nombre comercial */}
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold text-purple-300 uppercase tracking-wider">
                                            Nombre Comercial *
                                        </label>
                                        <input
                                            type="text"
                                            name="nombre"
                                            value={formData.nombre}
                                            onChange={handleChange}
                                            placeholder="Nombre del proveedor"
                                            className={`w-full px-4 py-3 bg-gray-950/50 border ${errors.nombre ? 'border-red-500' : 'border-gray-700'} rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500/30 transition-all`}
                                        />
                                        {errors.nombre && <p className="text-xs text-red-400">{errors.nombre}</p>}
                                    </div>

                                    {/* Razón Social y RUC */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Razón Social</label>
                                            <input
                                                type="text"
                                                name="razon_social"
                                                value={formData.razon_social}
                                                onChange={handleChange}
                                                placeholder="Razón social legal"
                                                className="w-full px-4 py-2.5 bg-gray-950/50 border border-gray-700 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-purple-500 transition-all"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">RUC</label>
                                            <input
                                                type="text"
                                                name="ruc"
                                                value={formData.ruc}
                                                onChange={handleChange}
                                                placeholder="20XXXXXXXXX"
                                                maxLength={11}
                                                className={`w-full px-4 py-2.5 bg-gray-950/50 border ${errors.ruc ? 'border-red-500' : 'border-gray-700'} rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-purple-500 transition-all font-mono`}
                                            />
                                            {errors.ruc && <p className="text-xs text-red-400">{errors.ruc}</p>}
                                        </div>
                                    </div>

                                    {/* Contacto y Teléfono */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Persona de Contacto</label>
                                            <input
                                                type="text"
                                                name="contacto"
                                                value={formData.contacto}
                                                onChange={handleChange}
                                                placeholder="Nombre completo"
                                                className="w-full px-4 py-2.5 bg-gray-950/50 border border-gray-700 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-purple-500 transition-all"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Teléfono / WhatsApp</label>
                                            <input
                                                type="tel"
                                                name="telefono"
                                                value={formData.telefono}
                                                onChange={handleChange}
                                                placeholder="+51 999 999 999"
                                                className="w-full px-4 py-2.5 bg-gray-950/50 border border-gray-700 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-purple-500 transition-all"
                                            />
                                        </div>
                                    </div>

                                    {/* Email y Ubicación */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Correo Electrónico</label>
                                            <input
                                                type="email"
                                                name="email"
                                                value={formData.email}
                                                onChange={handleChange}
                                                placeholder="correo@proveedor.com"
                                                className={`w-full px-4 py-2.5 bg-gray-950/50 border ${errors.email ? 'border-red-500' : 'border-gray-700'} rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-purple-500 transition-all`}
                                            />
                                            {errors.email && <p className="text-xs text-red-400">{errors.email}</p>}
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Ubicación</label>
                                            <input
                                                type="text"
                                                name="direccion"
                                                value={formData.direccion}
                                                onChange={handleChange}
                                                placeholder="Distrito, Ciudad"
                                                className="w-full px-4 py-2.5 bg-gray-950/50 border border-gray-700 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-purple-500 transition-all"
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Sección 2 - Capacidades */}
                            {activeSection === 2 && (
                                <div className="space-y-4 animate-in fade-in duration-200">
                                    <div className="space-y-2">
                                        <label className="text-xs font-semibold text-purple-300 uppercase tracking-wider">
                                            Tipo y Capacidades del Proveedor
                                        </label>
                                        <p className="text-xs text-gray-500">Selecciona una o varias categorías</p>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[340px] overflow-y-auto pr-2">
                                        {CATEGORIAS_PROVEEDOR.map(categoria => (
                                            <button
                                                key={categoria}
                                                type="button"
                                                onClick={() => handleCategoriaToggle(categoria)}
                                                className={`px-4 py-3 rounded-xl text-left text-sm transition-all border ${
                                                    formData.categorias.includes(categoria)
                                                        ? 'bg-purple-500/20 border-purple-500/50 text-purple-300'
                                                        : 'bg-gray-800/30 border-gray-700/50 text-gray-400 hover:border-gray-600 hover:text-gray-300'
                                                }`}
                                            >
                                                <span className="flex items-center gap-2">
                                                    <span className={`w-4 h-4 rounded border-2 flex items-center justify-center text-xs ${
                                                        formData.categorias.includes(categoria)
                                                            ? 'bg-purple-500 border-purple-500 text-white'
                                                            : 'border-gray-600'
                                                    }`}>
                                                        {formData.categorias.includes(categoria) && '✓'}
                                                    </span>
                                                    {categoria}
                                                </span>
                                            </button>
                                        ))}
                                    </div>

                                    {formData.categorias.length > 0 && (
                                        <div className="pt-3 border-t border-gray-800">
                                            <p className="text-xs text-gray-500 mb-2">Seleccionados ({formData.categorias.length}):</p>
                                            <div className="flex flex-wrap gap-2">
                                                {formData.categorias.map(cat => (
                                                    <span key={cat} className="px-2 py-1 bg-purple-500/20 border border-purple-500/30 rounded-lg text-xs text-purple-300">
                                                        {cat}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Sección 3 - Condiciones comerciales */}
                            {activeSection === 3 && (
                                <div className="space-y-5 animate-in fade-in duration-200">
                                    {/* Factura e IGV */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Emite Factura</label>
                                            <div className="flex gap-2">
                                                {[
                                                    { value: true, label: 'Sí' },
                                                    { value: false, label: 'No' }
                                                ].map(option => (
                                                    <button
                                                        key={String(option.value)}
                                                        type="button"
                                                        onClick={() => setFormData(prev => ({ ...prev, emite_factura: option.value }))}
                                                        className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-medium transition-all border ${
                                                            formData.emite_factura === option.value
                                                                ? 'bg-purple-500/20 border-purple-500/50 text-purple-300'
                                                                : 'bg-gray-800/30 border-gray-700/50 text-gray-400 hover:border-gray-600'
                                                        }`}
                                                    >
                                                        {option.label}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Incluye IGV</label>
                                            <div className="flex gap-2">
                                                {[
                                                    { value: 'si', label: 'Sí' },
                                                    { value: 'no', label: 'No' },
                                                    { value: 'depende', label: 'Depende' }
                                                ].map(option => (
                                                    <button
                                                        key={option.value}
                                                        type="button"
                                                        onClick={() => setFormData(prev => ({ ...prev, incluye_igv: option.value as 'si' | 'no' | 'depende' }))}
                                                        className={`flex-1 px-3 py-2.5 rounded-xl text-sm font-medium transition-all border ${
                                                            formData.incluye_igv === option.value
                                                                ? 'bg-purple-500/20 border-purple-500/50 text-purple-300'
                                                                : 'bg-gray-800/30 border-gray-700/50 text-gray-400 hover:border-gray-600'
                                                        }`}
                                                    >
                                                        {option.label}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Forma de pago */}
                                    <div className="space-y-2">
                                        <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Forma de Pago</label>
                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                            {['Contado', 'Adelanto', 'Contra entrega', 'Crédito'].map(option => (
                                                <button
                                                    key={option}
                                                    type="button"
                                                    onClick={() => setFormData(prev => ({ ...prev, forma_pago: option }))}
                                                    className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all border ${
                                                        formData.forma_pago === option
                                                            ? 'bg-purple-500/20 border-purple-500/50 text-purple-300'
                                                            : 'bg-gray-800/30 border-gray-700/50 text-gray-400 hover:border-gray-600'
                                                    }`}
                                                >
                                                    {option}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Tiempos */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Tiempo Producción (días)</label>
                                            <input
                                                type="number"
                                                name="tiempo_produccion"
                                                value={formData.tiempo_produccion}
                                                onChange={handleChange}
                                                placeholder="Ej: 5"
                                                min="0"
                                                className="w-full px-4 py-2.5 bg-gray-950/50 border border-gray-700 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-purple-500 transition-all font-mono"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Tiempo Entrega (días)</label>
                                            <input
                                                type="number"
                                                name="tiempo_entrega"
                                                value={formData.tiempo_entrega}
                                                onChange={handleChange}
                                                placeholder="Ej: 2"
                                                min="0"
                                                className="w-full px-4 py-2.5 bg-gray-950/50 border border-gray-700 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-purple-500 transition-all font-mono"
                                            />
                                        </div>
                                    </div>

                                    {/* Mínimo de producción */}
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Mínimo de Producción</label>
                                        <input
                                            type="text"
                                            name="minimo_produccion"
                                            value={formData.minimo_produccion}
                                            onChange={handleChange}
                                            placeholder="Ej: 100 unidades, S/ 500 mínimo, etc."
                                            className="w-full px-4 py-2.5 bg-gray-950/50 border border-gray-700 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-purple-500 transition-all"
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Sección 4 - Notas */}
                            {activeSection === 4 && (
                                <div className="space-y-4 animate-in fade-in duration-200">
                                    <div className="space-y-2">
                                        <label className="text-xs font-semibold text-purple-300 uppercase tracking-wider">
                                            Observaciones Internas
                                        </label>
                                        <p className="text-xs text-gray-500">Notas libres para comentarios internos sobre el proveedor</p>
                                    </div>
                                    <textarea
                                        name="notas"
                                        value={formData.notas}
                                        onChange={handleChange}
                                        placeholder="Información relevante: calidad del trabajo, puntualidad, problemas anteriores, recomendaciones, etc."
                                        rows={8}
                                        className="w-full px-4 py-3 bg-gray-950/50 border border-gray-700 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-purple-500 transition-all resize-none"
                                    />

                                    {/* Summary */}
                                    <div className="p-4 bg-gray-800/30 rounded-xl border border-gray-700/50">
                                        <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Resumen del Proveedor</h4>
                                        <div className="grid grid-cols-2 gap-3 text-sm">
                                            <div>
                                                <span className="text-gray-500">Nombre:</span>
                                                <span className="text-white ml-2">{formData.nombre || '-'}</span>
                                            </div>
                                            <div>
                                                <span className="text-gray-500">RUC:</span>
                                                <span className="text-white ml-2 font-mono">{formData.ruc || '-'}</span>
                                            </div>
                                            <div className="col-span-2">
                                                <span className="text-gray-500">Categorías:</span>
                                                <span className="text-purple-300 ml-2">
                                                    {formData.categorias.length > 0 ? formData.categorias.join(', ') : '-'}
                                                </span>
                                            </div>
                                            <div>
                                                <span className="text-gray-500">Factura:</span>
                                                <span className="text-white ml-2">
                                                    {formData.emite_factura === true ? 'Sí' : formData.emite_factura === false ? 'No' : '-'}
                                                </span>
                                            </div>
                                            <div>
                                                <span className="text-gray-500">Pago:</span>
                                                <span className="text-white ml-2">{formData.forma_pago || '-'}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Footer Actions */}
                        <div className="p-6 border-t border-gray-800 bg-gray-900/50 flex-shrink-0">
                            <div className="flex gap-3">
                                <button
                                    type="button"
                                    onClick={handleClose}
                                    className="flex-1 px-4 py-3 bg-gray-800/50 hover:bg-gray-700 border border-gray-700 rounded-xl text-gray-300 font-medium transition-all"
                                >
                                    Cancelar
                                </button>
                                {activeSection < 4 ? (
                                    <button
                                        type="button"
                                        onClick={() => setActiveSection(prev => prev + 1)}
                                        className="flex-1 px-4 py-3 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 rounded-xl text-purple-300 font-medium transition-all flex items-center justify-center gap-2"
                                    >
                                        Siguiente
                                        <span>→</span>
                                    </button>
                                ) : (
                                    <button
                                        type="submit"
                                        disabled={isSubmitting}
                                        className="flex-1 px-4 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 disabled:from-gray-600 disabled:to-gray-600 rounded-xl text-white font-bold transition-all shadow-lg shadow-purple-500/25 disabled:shadow-none flex items-center justify-center gap-2"
                                    >
                                        {isSubmitting ? (
                                            <>
                                                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                Guardando...
                                            </>
                                        ) : (
                                            <>
                                                <span>+</span>
                                                Crear Proveedor
                                            </>
                                        )}
                                    </button>
                                )}
                            </div>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
