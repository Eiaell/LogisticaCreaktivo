import { useState, useRef } from 'react';
import { useDatabase } from '../context/DatabaseContext';

interface NuevoClienteModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function NuevoClienteModal({ isOpen, onClose }: NuevoClienteModalProps) {
    const { createCliente, uploadLogo } = useDatabase();
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Main form state
    const [isExpandedMode, setIsExpandedMode] = useState(false);

    // Simple mode (default)
    const [simpleFormData, setSimpleFormData] = useState({
        razon_social: '',
        nombre_comercial: '',
        ruc: '',
        direccion: '',
        contacto: '',
        telefono: '',
        email: '',
        estado: 'activo' as const,
        prioridad: 'medio' as const,
        tipo_cliente: 'corporativo' as const,
        notas: ''
    });

    // Expanded mode: Holding data
    const [holdingData, setHoldingData] = useState({
        nombre: '',
        ruc: ''
    });

    // Expanded mode: Projects (can have multiple razones sociales)
    const [proyectos, setProyectos] = useState<Array<{
        id: string;
        razon_social: string;
        proyecto: string;
        proyecto_codigo: string;
        ruc: string;
        direccion: string;
        contacto: string;
        telefono: string;
        email: string;
    }>>([]);

    const [logoPreview, setLogoPreview] = useState<string | null>(null);
    const [logoFile, setLogoFile] = useState<File | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    if (!isOpen) return null;

    const handleSimpleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setSimpleFormData(prev => ({ ...prev, [name]: value }));
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: '' }));
        }
    };

    const handleHoldingChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setHoldingData(prev => ({ ...prev, [name]: value }));
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: '' }));
        }
    };

    const handleAddProyecto = () => {
        const newId = `proj-${Date.now()}`;
        setProyectos(prev => [...prev, {
            id: newId,
            razon_social: '',
            proyecto: '',
            proyecto_codigo: '',
            ruc: '',
            direccion: '',
            contacto: '',
            telefono: '',
            email: ''
        }]);
    };

    const handleProyectoChange = (id: string, field: string, value: string) => {
        setProyectos(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p));
    };

    const handleRemoveProyecto = (id: string) => {
        setProyectos(prev => prev.filter(p => p.id !== id));
    };

    const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setLogoFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setLogoPreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const validateSimple = () => {
        const newErrors: Record<string, string> = {};

        if (!simpleFormData.razon_social.trim()) {
            newErrors.razon_social = 'La Razón Social es requerida';
        }

        if (simpleFormData.ruc && !/^\d{11}$/.test(simpleFormData.ruc)) {
            newErrors.ruc = 'El RUC debe tener 11 dígitos';
        }

        if (simpleFormData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(simpleFormData.email)) {
            newErrors.email = 'Email inválido';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const validateExpanded = () => {
        const newErrors: Record<string, string> = {};

        if (!holdingData.nombre.trim()) {
            newErrors.holding_nombre = 'El nombre del grupo es requerido';
        }

        if (holdingData.ruc && !/^\d{11}$/.test(holdingData.ruc)) {
            newErrors.holding_ruc = 'El RUC del grupo debe tener 11 dígitos';
        }

        if (proyectos.length === 0) {
            newErrors.proyectos = 'Agrega al menos un proyecto/razón social';
        }

        proyectos.forEach((proj, idx) => {
            if (!proj.razon_social.trim()) {
                newErrors[`proj_razon_${idx}`] = 'Razón social requerida';
            }
            if (proj.ruc && !/^\d{11}$/.test(proj.ruc)) {
                newErrors[`proj_ruc_${idx}`] = 'RUC debe tener 11 dígitos';
            }
        });

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmitSimple = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validateSimple()) return;

        setIsSubmitting(true);
        try {
            let logoUrl: string | undefined;
            if (logoFile) {
                const url = await uploadLogo(logoFile, `cliente-${simpleFormData.razon_social}`);
                if (url) logoUrl = url;
            }

            await createCliente({
                razon_social: simpleFormData.razon_social.trim(),
                nombre_comercial: simpleFormData.nombre_comercial || undefined,
                ruc: simpleFormData.ruc || undefined,
                direccion: simpleFormData.direccion || undefined,
                contacto: simpleFormData.contacto || undefined,
                telefono: simpleFormData.telefono || undefined,
                email: simpleFormData.email || undefined,
                estado: simpleFormData.estado,
                prioridad: simpleFormData.prioridad,
                tipo_cliente: simpleFormData.tipo_cliente,
                notas: simpleFormData.notas || undefined,
                logo: logoUrl
            });

            handleClose();
        } catch (err) {
            console.error('Error creating cliente:', err);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSubmitExpanded = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validateExpanded()) return;

        setIsSubmitting(true);
        try {
            let logoUrl: string | undefined;
            if (logoFile) {
                const url = await uploadLogo(logoFile, `grupo-${holdingData.nombre}`);
                if (url) logoUrl = url;
            }

            // Create all proyectos under this holding
            for (const proyecto of proyectos) {
                await createCliente({
                    grupo_empresarial: holdingData.nombre.trim(),
                    grupo_empresarial_ruc: holdingData.ruc || undefined,
                    razon_social: proyecto.razon_social.trim(),
                    proyecto: proyecto.proyecto || undefined,
                    proyecto_codigo: proyecto.proyecto_codigo || undefined,
                    ruc: proyecto.ruc || undefined,
                    direccion: proyecto.direccion || undefined,
                    contacto: proyecto.contacto || undefined,
                    telefono: proyecto.telefono || undefined,
                    email: proyecto.email || undefined,
                    estado: 'activo',
                    prioridad: 'medio',
                    tipo_cliente: 'corporativo',
                    logo: logoUrl
                });
            }

            handleClose();
        } catch (err) {
            console.error('Error creating clients:', err);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleClose = () => {
        setIsExpandedMode(false);
        setSimpleFormData({
            razon_social: '',
            nombre_comercial: '',
            ruc: '',
            direccion: '',
            contacto: '',
            telefono: '',
            email: '',
            estado: 'activo',
            prioridad: 'medio',
            tipo_cliente: 'corporativo',
            notas: ''
        });
        setHoldingData({ nombre: '', ruc: '' });
        setProyectos([]);
        setLogoPreview(null);
        setLogoFile(null);
        setErrors({});
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={handleClose} />

            <div className="relative w-full max-w-2xl mx-4 animate-in zoom-in-95 fade-in duration-200 max-h-[90vh] overflow-y-auto">
                <div className="bg-gradient-to-br from-gray-900 via-gray-900 to-blue-950/30 border border-blue-500/20 rounded-2xl shadow-2xl shadow-blue-500/10 overflow-hidden">
                    {/* Header */}
                    <div className="relative px-6 py-5 border-b border-blue-500/10 sticky top-0">
                        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 via-transparent to-cyan-600/10" />
                        <div className="relative flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center">
                                    <span className="text-xl">👥</span>
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-white">
                                        {isExpandedMode ? 'Nuevo Grupo Empresarial' : 'Nuevo Cliente'}
                                    </h2>
                                    <p className="text-xs text-blue-400/60">
                                        {isExpandedMode
                                            ? 'Registrar holding con múltiples razones sociales'
                                            : 'Registrar empresa en el sistema'}
                                    </p>
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

                    {/* Form */}
                    <form onSubmit={isExpandedMode ? handleSubmitExpanded : handleSubmitSimple} className="p-6 space-y-5">
                        {/* Logo Upload */}
                        <div className="flex justify-center">
                            <div
                                onClick={() => fileInputRef.current?.click()}
                                className="relative w-20 h-20 rounded-full bg-gray-800/50 border-2 border-dashed border-blue-500/30 hover:border-blue-500/60 flex items-center justify-center cursor-pointer group transition-all overflow-hidden"
                            >
                                {logoPreview ? (
                                    <img src={logoPreview} alt="Preview" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="text-center">
                                        <span className="text-2xl text-blue-400/50 group-hover:text-blue-400 transition-colors">+</span>
                                    </div>
                                )}
                                <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                    <span className="text-[9px] text-white font-bold">LOGO</span>
                                </div>
                            </div>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={handleLogoChange}
                            />
                        </div>

                        {/* SIMPLE MODE (DEFAULT) */}
                        {!isExpandedMode && (
                            <div className="space-y-5">
                                {/* Razón Social */}
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-blue-300 uppercase tracking-wider">
                                        Razón Social *
                                    </label>
                                    <input
                                        type="text"
                                        name="razon_social"
                                        value={simpleFormData.razon_social}
                                        onChange={handleSimpleChange}
                                        placeholder="Nombre legal de la empresa"
                                        className={`w-full px-4 py-3 bg-gray-950/50 border ${errors.razon_social ? 'border-red-500' : 'border-gray-700'} rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition-all`}
                                    />
                                    {errors.razon_social && <p className="text-xs text-red-400">{errors.razon_social}</p>}
                                </div>

                                {/* Nombre Comercial */}
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                                        Nombre Comercial
                                    </label>
                                    <input
                                        type="text"
                                        name="nombre_comercial"
                                        value={simpleFormData.nombre_comercial}
                                        onChange={handleSimpleChange}
                                        placeholder="Nombre de marca (si es diferente)"
                                        className="w-full px-4 py-3 bg-gray-950/50 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-all"
                                    />
                                </div>

                                {/* RUC y Teléfono */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                                            RUC
                                        </label>
                                        <input
                                            type="text"
                                            name="ruc"
                                            value={simpleFormData.ruc}
                                            onChange={handleSimpleChange}
                                            placeholder="20XXXXXXXXX"
                                            maxLength={11}
                                            className={`w-full px-4 py-2.5 bg-gray-950/50 border ${errors.ruc ? 'border-red-500' : 'border-gray-700'} rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-all font-mono`}
                                        />
                                        {errors.ruc && <p className="text-xs text-red-400">{errors.ruc}</p>}
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                                            Teléfono
                                        </label>
                                        <input
                                            type="tel"
                                            name="telefono"
                                            value={simpleFormData.telefono}
                                            onChange={handleSimpleChange}
                                            placeholder="+51 999 999 999"
                                            className="w-full px-4 py-2.5 bg-gray-950/50 border border-gray-700 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-all"
                                        />
                                    </div>
                                </div>

                                {/* Dirección */}
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                                        Dirección
                                    </label>
                                    <input
                                        type="text"
                                        name="direccion"
                                        value={simpleFormData.direccion}
                                        onChange={handleSimpleChange}
                                        placeholder="Av. Principal 123, Distrito, Lima"
                                        className="w-full px-4 py-2.5 bg-gray-950/50 border border-gray-700 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-all"
                                    />
                                </div>

                                {/* Contacto y Email */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                                            Persona de Contacto
                                        </label>
                                        <input
                                            type="text"
                                            name="contacto"
                                            value={simpleFormData.contacto}
                                            onChange={handleSimpleChange}
                                            placeholder="Nombre completo"
                                            className="w-full px-4 py-2.5 bg-gray-950/50 border border-gray-700 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-all"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                                            Email
                                        </label>
                                        <input
                                            type="email"
                                            name="email"
                                            value={simpleFormData.email}
                                            onChange={handleSimpleChange}
                                            placeholder="correo@empresa.com"
                                            className={`w-full px-4 py-2.5 bg-gray-950/50 border ${errors.email ? 'border-red-500' : 'border-gray-700'} rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-all`}
                                        />
                                        {errors.email && <p className="text-xs text-red-400">{errors.email}</p>}
                                    </div>
                                </div>

                                {/* Estado, Prioridad, Tipo Cliente */}
                                <div className="grid grid-cols-3 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                                            Estado
                                        </label>
                                        <select
                                            name="estado"
                                            value={simpleFormData.estado}
                                            onChange={handleSimpleChange}
                                            className="w-full px-4 py-2.5 bg-gray-950/50 border border-gray-700 rounded-xl text-white focus:outline-none focus:border-blue-500 transition-all"
                                        >
                                            <option value="activo">Activo</option>
                                            <option value="inactivo">Inactivo</option>
                                            <option value="suspendido">Suspendido</option>
                                        </select>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                                            Prioridad
                                        </label>
                                        <select
                                            name="prioridad"
                                            value={simpleFormData.prioridad}
                                            onChange={handleSimpleChange}
                                            className="w-full px-4 py-2.5 bg-gray-950/50 border border-gray-700 rounded-xl text-white focus:outline-none focus:border-blue-500 transition-all"
                                        >
                                            <option value="alto">Alto</option>
                                            <option value="medio">Medio</option>
                                            <option value="bajo">Bajo</option>
                                        </select>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                                            Tipo
                                        </label>
                                        <select
                                            name="tipo_cliente"
                                            value={simpleFormData.tipo_cliente}
                                            onChange={handleSimpleChange}
                                            className="w-full px-4 py-2.5 bg-gray-950/50 border border-gray-700 rounded-xl text-white focus:outline-none focus:border-blue-500 transition-all"
                                        >
                                            <option value="corporativo">Corporativo</option>
                                            <option value="pyme">PYME</option>
                                            <option value="individual">Individual</option>
                                        </select>
                                    </div>
                                </div>

                                {/* Notas */}
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                                        Notas Adicionales
                                    </label>
                                    <textarea
                                        name="notas"
                                        value={simpleFormData.notas}
                                        onChange={handleSimpleChange}
                                        placeholder="Información relevante..."
                                        rows={2}
                                        className="w-full px-4 py-2.5 bg-gray-950/50 border border-gray-700 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-all resize-none"
                                    />
                                </div>

                                {/* Expandable Section Button */}
                                <div className="border-t border-gray-800 pt-4">
                                    <button
                                        type="button"
                                        onClick={() => setIsExpandedMode(true)}
                                        className="w-full px-4 py-2.5 bg-gradient-to-r from-purple-600/20 to-pink-600/20 border border-purple-500/30 hover:from-purple-600/40 hover:to-pink-600/40 hover:border-purple-400/50 rounded-xl text-purple-300 hover:text-white font-medium transition-all flex items-center justify-center gap-2"
                                    >
                                        <span>🏢</span>
                                        ¿Es parte de un Grupo Empresarial? Agregar Holding
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* EXPANDED MODE (HOLDING) */}
                        {isExpandedMode && (
                            <div className="space-y-5">
                                {/* Back Button */}
                                <button
                                    type="button"
                                    onClick={() => setIsExpandedMode(false)}
                                    className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors"
                                >
                                    ← Volver a formulario simple
                                </button>

                                {/* Holding Information */}
                                <div className="bg-blue-950/20 border border-blue-500/10 rounded-xl p-4 space-y-4">
                                    <h3 className="text-sm font-semibold text-blue-300 flex items-center gap-2">
                                        <span>🏢</span> Información del Grupo Empresarial
                                    </h3>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-semibold text-blue-300 uppercase tracking-wider">
                                                Nombre del Grupo *
                                            </label>
                                            <input
                                                type="text"
                                                name="nombre"
                                                value={holdingData.nombre}
                                                onChange={handleHoldingChange}
                                                placeholder="E.g., Grupo Lar"
                                                className={`w-full px-4 py-2.5 bg-gray-950/50 border ${errors.holding_nombre ? 'border-red-500' : 'border-gray-700'} rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-all`}
                                            />
                                            {errors.holding_nombre && <p className="text-xs text-red-400">{errors.holding_nombre}</p>}
                                        </div>

                                        <div className="space-y-1.5">
                                            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                                                RUC del Grupo
                                            </label>
                                            <input
                                                type="text"
                                                name="ruc"
                                                value={holdingData.ruc}
                                                onChange={handleHoldingChange}
                                                placeholder="20XXXXXXXXX"
                                                maxLength={11}
                                                className={`w-full px-4 py-2.5 bg-gray-950/50 border ${errors.holding_ruc ? 'border-red-500' : 'border-gray-700'} rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-all font-mono`}
                                            />
                                            {errors.holding_ruc && <p className="text-xs text-red-400">{errors.holding_ruc}</p>}
                                        </div>
                                    </div>
                                </div>

                                {/* Projects List */}
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-sm font-semibold text-cyan-300 flex items-center gap-2">
                                            <span>🎯</span> Razones Sociales / Proyectos
                                        </h3>
                                        <button
                                            type="button"
                                            onClick={handleAddProyecto}
                                            className="text-xs font-bold px-3 py-1.5 bg-cyan-600/20 border border-cyan-500/30 hover:bg-cyan-600/40 text-cyan-300 hover:text-cyan-200 rounded-lg transition-all flex items-center gap-1"
                                        >
                                            <span>+</span> Agregar Razón Social
                                        </button>
                                    </div>

                                    {errors.proyectos && <p className="text-xs text-red-400">{errors.proyectos}</p>}

                                    <div className="space-y-3">
                                        {proyectos.length === 0 ? (
                                            <div className="text-center py-6 bg-gray-950/30 border border-gray-800 rounded-xl">
                                                <p className="text-sm text-gray-500">Agrega al menos una razón social</p>
                                            </div>
                                        ) : (
                                            proyectos.map((proyecto, idx) => (
                                                <div
                                                    key={proyecto.id}
                                                    className="bg-gray-950/30 border border-gray-800 rounded-xl p-4 space-y-3"
                                                >
                                                    {/* Remove button */}
                                                    <div className="flex justify-between items-start mb-2">
                                                        <h4 className="text-xs font-semibold text-gray-400">
                                                            Razón Social #{idx + 1}
                                                        </h4>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleRemoveProyecto(proyecto.id)}
                                                            className="text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 px-2 py-1 rounded transition-colors"
                                                        >
                                                            ✕ Eliminar
                                                        </button>
                                                    </div>

                                                    {/* Razón Social y Proyecto */}
                                                    <div className="grid grid-cols-2 gap-3">
                                                        <div className="space-y-1.5">
                                                            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                                                                Razón Social *
                                                            </label>
                                                            <input
                                                                type="text"
                                                                value={proyecto.razon_social}
                                                                onChange={(e) =>
                                                                    handleProyectoChange(proyecto.id, 'razon_social', e.target.value)
                                                                }
                                                                placeholder="E.g., Comercial Sendai S.A.C."
                                                                className={`w-full px-3 py-2 bg-gray-900/50 border ${
                                                                    errors[`proj_razon_${idx}`] ? 'border-red-500' : 'border-gray-700'
                                                                } rounded-lg text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-all text-sm`}
                                                            />
                                                            {errors[`proj_razon_${idx}`] && (
                                                                <p className="text-xs text-red-400">{errors[`proj_razon_${idx}`]}</p>
                                                            )}
                                                        </div>

                                                        <div className="space-y-1.5">
                                                            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                                                                Proyecto
                                                            </label>
                                                            <input
                                                                type="text"
                                                                value={proyecto.proyecto}
                                                                onChange={(e) =>
                                                                    handleProyectoChange(proyecto.id, 'proyecto', e.target.value)
                                                                }
                                                                placeholder="E.g., Proyecto Sendai"
                                                                className="w-full px-3 py-2 bg-gray-900/50 border border-gray-700 rounded-lg text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-all text-sm"
                                                            />
                                                        </div>
                                                    </div>

                                                    {/* Proyecto Código y RUC */}
                                                    <div className="grid grid-cols-2 gap-3">
                                                        <div className="space-y-1.5">
                                                            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                                                                Código Proyecto
                                                            </label>
                                                            <input
                                                                type="text"
                                                                value={proyecto.proyecto_codigo}
                                                                onChange={(e) =>
                                                                    handleProyectoChange(proyecto.id, 'proyecto_codigo', e.target.value)
                                                                }
                                                                placeholder="E.g., PRY-001"
                                                                className="w-full px-3 py-2 bg-gray-900/50 border border-gray-700 rounded-lg text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-all text-sm font-mono"
                                                            />
                                                        </div>

                                                        <div className="space-y-1.5">
                                                            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                                                                RUC
                                                            </label>
                                                            <input
                                                                type="text"
                                                                value={proyecto.ruc}
                                                                onChange={(e) =>
                                                                    handleProyectoChange(proyecto.id, 'ruc', e.target.value)
                                                                }
                                                                placeholder="20XXXXXXXXX"
                                                                maxLength={11}
                                                                className={`w-full px-3 py-2 bg-gray-900/50 border ${
                                                                    errors[`proj_ruc_${idx}`] ? 'border-red-500' : 'border-gray-700'
                                                                } rounded-lg text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-all text-sm font-mono`}
                                                            />
                                                            {errors[`proj_ruc_${idx}`] && (
                                                                <p className="text-xs text-red-400">{errors[`proj_ruc_${idx}`]}</p>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Dirección */}
                                                    <div className="space-y-1.5">
                                                        <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                                                            Dirección
                                                        </label>
                                                        <input
                                                            type="text"
                                                            value={proyecto.direccion}
                                                            onChange={(e) =>
                                                                handleProyectoChange(proyecto.id, 'direccion', e.target.value)
                                                            }
                                                            placeholder="Av. Principal 123, Distrito"
                                                            className="w-full px-3 py-2 bg-gray-900/50 border border-gray-700 rounded-lg text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-all text-sm"
                                                        />
                                                    </div>

                                                    {/* Contacto, Teléfono, Email */}
                                                    <div className="grid grid-cols-3 gap-3">
                                                        <div className="space-y-1.5">
                                                            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                                                                Contacto
                                                            </label>
                                                            <input
                                                                type="text"
                                                                value={proyecto.contacto}
                                                                onChange={(e) =>
                                                                    handleProyectoChange(proyecto.id, 'contacto', e.target.value)
                                                                }
                                                                placeholder="Nombre"
                                                                className="w-full px-3 py-2 bg-gray-900/50 border border-gray-700 rounded-lg text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-all text-sm"
                                                            />
                                                        </div>

                                                        <div className="space-y-1.5">
                                                            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                                                                Teléfono
                                                            </label>
                                                            <input
                                                                type="tel"
                                                                value={proyecto.telefono}
                                                                onChange={(e) =>
                                                                    handleProyectoChange(proyecto.id, 'telefono', e.target.value)
                                                                }
                                                                placeholder="+51 999"
                                                                className="w-full px-3 py-2 bg-gray-900/50 border border-gray-700 rounded-lg text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-all text-sm"
                                                            />
                                                        </div>

                                                        <div className="space-y-1.5">
                                                            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                                                                Email
                                                            </label>
                                                            <input
                                                                type="email"
                                                                value={proyecto.email}
                                                                onChange={(e) =>
                                                                    handleProyectoChange(proyecto.id, 'email', e.target.value)
                                                                }
                                                                placeholder="email@empresa.com"
                                                                className="w-full px-3 py-2 bg-gray-900/50 border border-gray-700 rounded-lg text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-all text-sm"
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Actions */}
                        <div className="flex gap-3 pt-6 border-t border-gray-800">
                            <button
                                type="button"
                                onClick={handleClose}
                                className="flex-1 px-4 py-3 bg-gray-800/50 hover:bg-gray-700 border border-gray-700 rounded-xl text-gray-300 font-medium transition-all"
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 disabled:from-gray-600 disabled:to-gray-600 rounded-xl text-white font-bold transition-all shadow-lg shadow-blue-500/25 disabled:shadow-none flex items-center justify-center gap-2"
                            >
                                {isSubmitting ? (
                                    <>
                                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        Guardando...
                                    </>
                                ) : (
                                    <>
                                        <span>+</span>
                                        {isExpandedMode ? 'Crear Grupo' : 'Crear Cliente'}
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
