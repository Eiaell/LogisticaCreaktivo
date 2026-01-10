import { useState, useRef } from 'react';
import { useDatabase } from '../context/DatabaseContext';

interface NuevoClienteModalProps {
    isOpen: boolean;
    onClose: () => void;
}

type ClienteType = 'unico' | 'holding' | null;
type WizardStep = 1 | 2 | 3;

export function NuevoClienteModal({ isOpen, onClose }: NuevoClienteModalProps) {
    const { createCliente, uploadLogo } = useDatabase();
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Wizard state
    const [step, setStep] = useState<WizardStep>(1);
    const [clienteType, setClienteType] = useState<ClienteType>(null);
    const [logoFile, setLogoFile] = useState<File | null>(null);
    const [logoPreview, setLogoPreview] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    // Step 2: Holding Info (if Holding type)
    const [holdingData, setHoldingData] = useState({
        nombre_comercial: '',
        razon_social: '',
        ruc: '',
        direccion: '',
        contacto: '',
        telefono: '',
        email: ''
    });

    // Step 3: Razones Sociales
    const [razonesSociales, setRazonesSociales] = useState<Array<{
        id: string;
        razon_social: string;
        nombre_comercial?: string;
        ruc?: string;
        direccion?: string;
        contacto?: string;
        telefono?: string;
        email?: string;
    }>>([]);

    // Step 1: Simple Cliente (if Único type)
    const [simpleCliente, setSimpleCliente] = useState({
        razon_social: '',
        nombre_comercial: '',
        ruc: '',
        direccion: '',
        contacto: '',
        telefono: '',
        email: ''
    });

    if (!isOpen) return null;

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

    const handleTypeSelect = (type: ClienteType) => {
        setClienteType(type);
        if (type === 'unico') {
            setStep(1);
        } else if (type === 'holding') {
            setStep(2);
        }
    };

    const handleHoldingChange = (field: string, value: string) => {
        setHoldingData(prev => ({ ...prev, [field]: value }));
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: '' }));
        }
    };

    const handleSimpleChange = (field: string, value: string) => {
        setSimpleCliente(prev => ({ ...prev, [field]: value }));
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: '' }));
        }
    };

    const handleAddRazonSocial = () => {
        setRazonesSociales(prev => [...prev, {
            id: `rs-${Date.now()}`,
            razon_social: '',
            nombre_comercial: '',
            ruc: '',
            direccion: '',
            contacto: '',
            telefono: '',
            email: ''
        }]);
    };

    const handleRemoveRazonSocial = (id: string) => {
        setRazonesSociales(prev => prev.filter(rs => rs.id !== id));
    };

    const handleRazonSocialChange = (id: string, field: string, value: string) => {
        setRazonesSociales(prev => prev.map(rs =>
            rs.id === id ? { ...rs, [field]: value } : rs
        ));
    };

    const validateStep2 = () => {
        const newErrors: Record<string, string> = {};

        if (!holdingData.nombre_comercial.trim()) {
            newErrors.nombre_comercial = 'Nombre comercial del grupo requerido';
        }
        if (!holdingData.razon_social.trim()) {
            newErrors.razon_social = 'Razón social del grupo requerida';
        }
        if (!holdingData.ruc.trim() || !/^\d{11}$/.test(holdingData.ruc)) {
            newErrors.ruc = 'RUC debe tener 11 dígitos';
        }
        if (!holdingData.direccion.trim()) {
            newErrors.direccion = 'Dirección requerida';
        }
        if (holdingData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(holdingData.email)) {
            newErrors.email = 'Email inválido';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const validateStep3 = () => {
        const newErrors: Record<string, string> = {};

        if (razonesSociales.length === 0) {
            newErrors.razones = 'Agrega al menos una razón social';
        }

        razonesSociales.forEach((rs, idx) => {
            if (!rs.razon_social.trim()) {
                newErrors[`razon_${idx}`] = 'Razón social requerida';
            }
            if (rs.ruc && !/^\d{11}$/.test(rs.ruc)) {
                newErrors[`ruc_${idx}`] = 'RUC debe tener 11 dígitos';
            }
        });

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const validateSimple = () => {
        const newErrors: Record<string, string> = {};

        if (!simpleCliente.razon_social.trim()) {
            newErrors.razon_social = 'Razón Social requerida';
        }
        if (simpleCliente.ruc && !/^\d{11}$/.test(simpleCliente.ruc)) {
            newErrors.ruc = 'RUC debe tener 11 dígitos';
        }
        if (simpleCliente.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(simpleCliente.email)) {
            newErrors.email = 'Email inválido';
        }

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
                const url = await uploadLogo(logoFile, `cliente-${simpleCliente.razon_social}`);
                if (url) logoUrl = url;
            }

            await createCliente({
                razon_social: simpleCliente.razon_social.trim(),
                nombre_comercial: simpleCliente.nombre_comercial || undefined,
                ruc: simpleCliente.ruc || undefined,
                direccion: simpleCliente.direccion || undefined,
                contacto: simpleCliente.contacto || undefined,
                telefono: simpleCliente.telefono || undefined,
                email: simpleCliente.email || undefined,
                estado: 'activo',
                prioridad: 'medio',
                tipo_cliente: 'corporativo',
                logo: logoUrl
            });

            handleClose();
        } catch (err) {
            console.error('Error:', err);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSubmitHolding = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validateStep3()) return;

        setIsSubmitting(true);
        try {
            let logoUrl: string | undefined;
            if (logoFile) {
                const url = await uploadLogo(logoFile, `grupo-${holdingData.nombre_comercial}`);
                if (url) logoUrl = url;
            }

            for (const razon of razonesSociales) {
                await createCliente({
                    grupo_empresarial: holdingData.nombre_comercial.trim(),
                    grupo_empresarial_ruc: holdingData.ruc || undefined,
                    razon_social: razon.razon_social.trim(),
                    nombre_comercial: razon.nombre_comercial || holdingData.nombre_comercial || undefined,
                    ruc: razon.ruc || holdingData.ruc || undefined,
                    direccion: razon.direccion || holdingData.direccion || undefined,
                    contacto: razon.contacto || holdingData.contacto || undefined,
                    telefono: razon.telefono || holdingData.telefono || undefined,
                    email: razon.email || holdingData.email || undefined,
                    estado: 'activo',
                    prioridad: 'medio',
                    tipo_cliente: 'corporativo',
                    logo: logoUrl
                });
            }

            handleClose();
        } catch (err) {
            console.error('Error:', err);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleClose = () => {
        setStep(1);
        setClienteType(null);
        setLogoFile(null);
        setLogoPreview(null);
        setErrors({});
        setHoldingData({ nombre_comercial: '', razon_social: '', ruc: '', direccion: '', contacto: '', telefono: '', email: '' });
        setRazonesSociales([]);
        setSimpleCliente({ razon_social: '', nombre_comercial: '', ruc: '', direccion: '', contacto: '', telefono: '', email: '' });
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={handleClose} />

            <div className="relative w-full max-w-xl mx-4 animate-in zoom-in-95 fade-in duration-200 max-h-[90vh] overflow-y-auto">
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
                                    <h2 className="text-lg font-bold text-white">Nuevo Cliente</h2>
                                    <p className="text-xs text-blue-400/60">
                                        {clienteType === null && 'Paso 1: Selecciona tipo de cliente'}
                                        {clienteType === 'unico' && 'Cliente Único'}
                                        {clienteType === 'holding' && step === 2 && 'Paso 2: Información del Grupo'}
                                        {clienteType === 'holding' && step === 3 && 'Paso 3: Agregar Razones Sociales'}
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

                    {/* Content */}
                    <div className="p-6">
                        {/* STEP 1: Type Selection */}
                        {clienteType === null && (
                            <div className="space-y-4">
                                <p className="text-sm text-gray-400 mb-6">¿Qué tipo de cliente deseas registrar?</p>

                                <button
                                    onClick={() => handleTypeSelect('unico')}
                                    className="w-full p-6 bg-gradient-to-r from-blue-600/20 to-cyan-600/20 border-2 border-blue-500/30 hover:border-blue-500/60 hover:from-blue-600/40 hover:to-cyan-600/40 rounded-xl transition-all group text-left"
                                >
                                    <div className="flex items-start gap-4">
                                        <span className="text-4xl">🏢</span>
                                        <div>
                                            <h3 className="text-lg font-bold text-white mb-1">Cliente Único</h3>
                                            <p className="text-sm text-gray-400">Una razón social, un cliente simple</p>
                                            <p className="text-xs text-gray-500 mt-2">Ideal para empresas individuales</p>
                                        </div>
                                    </div>
                                </button>

                                <button
                                    onClick={() => handleTypeSelect('holding')}
                                    className="w-full p-6 bg-gradient-to-r from-purple-600/20 to-pink-600/20 border-2 border-purple-500/30 hover:border-purple-500/60 hover:from-purple-600/40 hover:to-pink-600/40 rounded-xl transition-all group text-left"
                                >
                                    <div className="flex items-start gap-4">
                                        <span className="text-4xl">🏗️</span>
                                        <div>
                                            <h3 className="text-lg font-bold text-white mb-1">Grupo Empresarial</h3>
                                            <p className="text-sm text-gray-400">Un holding con múltiples razones sociales</p>
                                            <p className="text-xs text-gray-500 mt-2">Para grupos con varios proyectos</p>
                                        </div>
                                    </div>
                                </button>
                            </div>
                        )}

                        {/* STEP 1 (SIMPLE): Cliente Único */}
                        {clienteType === 'unico' && (
                            <form onSubmit={handleSubmitSimple} className="space-y-5">
                                {/* Logo */}
                                <div className="flex justify-center mb-4">
                                    <div
                                        onClick={() => fileInputRef.current?.click()}
                                        className="relative w-20 h-20 rounded-full bg-gray-800/50 border-2 border-dashed border-blue-500/30 hover:border-blue-500/60 flex items-center justify-center cursor-pointer group"
                                    >
                                        {logoPreview ? (
                                            <img src={logoPreview} alt="" className="w-full h-full object-cover rounded-full" />
                                        ) : (
                                            <span className="text-3xl">+</span>
                                        )}
                                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-full">
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

                                {/* Razón Social */}
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-blue-300 uppercase">Razón Social *</label>
                                    <input
                                        type="text"
                                        value={simpleCliente.razon_social}
                                        onChange={(e) => handleSimpleChange('razon_social', e.target.value)}
                                        placeholder="Nombre legal de la empresa"
                                        className={`w-full px-4 py-3 bg-gray-950/50 border ${errors.razon_social ? 'border-red-500' : 'border-gray-700'} rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-all`}
                                    />
                                    {errors.razon_social && <p className="text-xs text-red-400">{errors.razon_social}</p>}
                                </div>

                                {/* Nombre Comercial */}
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-gray-400 uppercase">Nombre Comercial</label>
                                    <input
                                        type="text"
                                        value={simpleCliente.nombre_comercial}
                                        onChange={(e) => handleSimpleChange('nombre_comercial', e.target.value)}
                                        placeholder="Nombre de marca"
                                        className="w-full px-4 py-2.5 bg-gray-950/50 border border-gray-700 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-all"
                                    />
                                </div>

                                {/* RUC y Teléfono */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold text-gray-400 uppercase">RUC</label>
                                        <input
                                            type="text"
                                            value={simpleCliente.ruc}
                                            onChange={(e) => handleSimpleChange('ruc', e.target.value)}
                                            placeholder="20XXXXXXXXX"
                                            maxLength={11}
                                            className={`w-full px-4 py-2.5 bg-gray-950/50 border ${errors.ruc ? 'border-red-500' : 'border-gray-700'} rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-all font-mono`}
                                        />
                                        {errors.ruc && <p className="text-xs text-red-400">{errors.ruc}</p>}
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold text-gray-400 uppercase">Teléfono</label>
                                        <input
                                            type="tel"
                                            value={simpleCliente.telefono}
                                            onChange={(e) => handleSimpleChange('telefono', e.target.value)}
                                            placeholder="+51 999 999 999"
                                            className="w-full px-4 py-2.5 bg-gray-950/50 border border-gray-700 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-all"
                                        />
                                    </div>
                                </div>

                                {/* Dirección */}
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-gray-400 uppercase">Dirección</label>
                                    <input
                                        type="text"
                                        value={simpleCliente.direccion}
                                        onChange={(e) => handleSimpleChange('direccion', e.target.value)}
                                        placeholder="Av. Principal 123"
                                        className="w-full px-4 py-2.5 bg-gray-950/50 border border-gray-700 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-all"
                                    />
                                </div>

                                {/* Contacto y Email */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold text-gray-400 uppercase">Contacto</label>
                                        <input
                                            type="text"
                                            value={simpleCliente.contacto}
                                            onChange={(e) => handleSimpleChange('contacto', e.target.value)}
                                            placeholder="Nombre"
                                            className="w-full px-4 py-2.5 bg-gray-950/50 border border-gray-700 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-all"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold text-gray-400 uppercase">Email</label>
                                        <input
                                            type="email"
                                            value={simpleCliente.email}
                                            onChange={(e) => handleSimpleChange('email', e.target.value)}
                                            placeholder="correo@empresa.com"
                                            className={`w-full px-4 py-2.5 bg-gray-950/50 border ${errors.email ? 'border-red-500' : 'border-gray-700'} rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-all`}
                                        />
                                        {errors.email && <p className="text-xs text-red-400">{errors.email}</p>}
                                    </div>
                                </div>

                                {/* Buttons */}
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
                                        className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 disabled:from-gray-600 disabled:to-gray-600 rounded-xl text-white font-bold transition-all shadow-lg shadow-blue-500/25 disabled:shadow-none"
                                    >
                                        {isSubmitting ? 'Guardando...' : '✓ Crear Cliente'}
                                    </button>
                                </div>
                            </form>
                        )}

                        {/* STEP 2: Holding Information */}
                        {clienteType === 'holding' && step === 2 && (
                            <div className="space-y-5">
                                {/* Logo */}
                                <div className="flex justify-center mb-4">
                                    <div
                                        onClick={() => fileInputRef.current?.click()}
                                        className="relative w-20 h-20 rounded-full bg-gray-800/50 border-2 border-dashed border-purple-500/30 hover:border-purple-500/60 flex items-center justify-center cursor-pointer group"
                                    >
                                        {logoPreview ? (
                                            <img src={logoPreview} alt="" className="w-full h-full object-cover rounded-full" />
                                        ) : (
                                            <span className="text-3xl">+</span>
                                        )}
                                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-full">
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

                                <div className="bg-purple-950/20 border border-purple-500/10 rounded-xl p-4 space-y-4">
                                    <h3 className="text-sm font-semibold text-purple-300">🏗️ Información del Grupo Empresarial</h3>

                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold text-purple-300 uppercase">Nombre Comercial del Grupo *</label>
                                        <input
                                            type="text"
                                            value={holdingData.nombre_comercial}
                                            onChange={(e) => handleHoldingChange('nombre_comercial', e.target.value)}
                                            placeholder="E.g., Grupo Lar"
                                            className={`w-full px-4 py-3 bg-gray-950/50 border ${errors.nombre_comercial ? 'border-red-500' : 'border-gray-700'} rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-all`}
                                        />
                                        {errors.nombre_comercial && <p className="text-xs text-red-400">{errors.nombre_comercial}</p>}
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold text-purple-300 uppercase">Razón Social del Grupo *</label>
                                        <input
                                            type="text"
                                            value={holdingData.razon_social}
                                            onChange={(e) => handleHoldingChange('razon_social', e.target.value)}
                                            placeholder="E.g., Grupo Lar S.A.C."
                                            className={`w-full px-4 py-3 bg-gray-950/50 border ${errors.razon_social ? 'border-red-500' : 'border-gray-700'} rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-all`}
                                        />
                                        {errors.razon_social && <p className="text-xs text-red-400">{errors.razon_social}</p>}
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold text-gray-400 uppercase">RUC del Grupo *</label>
                                        <input
                                            type="text"
                                            value={holdingData.ruc}
                                            onChange={(e) => handleHoldingChange('ruc', e.target.value)}
                                            placeholder="20XXXXXXXXX"
                                            maxLength={11}
                                            className={`w-full px-4 py-3 bg-gray-950/50 border ${errors.ruc ? 'border-red-500' : 'border-gray-700'} rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-all font-mono`}
                                        />
                                        {errors.ruc && <p className="text-xs text-red-400">{errors.ruc}</p>}
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold text-gray-400 uppercase">Dirección del Grupo *</label>
                                        <input
                                            type="text"
                                            value={holdingData.direccion}
                                            onChange={(e) => handleHoldingChange('direccion', e.target.value)}
                                            placeholder="Av. Principal 123, Distrito"
                                            className={`w-full px-4 py-3 bg-gray-950/50 border ${errors.direccion ? 'border-red-500' : 'border-gray-700'} rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-all`}
                                        />
                                        {errors.direccion && <p className="text-xs text-red-400">{errors.direccion}</p>}
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-semibold text-gray-400 uppercase">Contacto</label>
                                            <input
                                                type="text"
                                                value={holdingData.contacto}
                                                onChange={(e) => handleHoldingChange('contacto', e.target.value)}
                                                placeholder="Nombre"
                                                className="w-full px-4 py-3 bg-gray-950/50 border border-gray-700 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-all"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-semibold text-gray-400 uppercase">Teléfono</label>
                                            <input
                                                type="tel"
                                                value={holdingData.telefono}
                                                onChange={(e) => handleHoldingChange('telefono', e.target.value)}
                                                placeholder="+51 999 999 999"
                                                className="w-full px-4 py-3 bg-gray-950/50 border border-gray-700 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-all"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold text-gray-400 uppercase">Email</label>
                                        <input
                                            type="email"
                                            value={holdingData.email}
                                            onChange={(e) => handleHoldingChange('email', e.target.value)}
                                            placeholder="correo@grupo.com"
                                            className={`w-full px-4 py-3 bg-gray-950/50 border ${errors.email ? 'border-red-500' : 'border-gray-700'} rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-all`}
                                        />
                                        {errors.email && <p className="text-xs text-red-400">{errors.email}</p>}
                                    </div>
                                </div>

                                {/* Buttons */}
                                <div className="flex gap-3 pt-6 border-t border-gray-800">
                                    <button
                                        type="button"
                                        onClick={() => setClienteType(null)}
                                        className="flex-1 px-4 py-3 bg-gray-800/50 hover:bg-gray-700 border border-gray-700 rounded-xl text-gray-300 font-medium transition-all"
                                    >
                                        ← Atrás
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (validateStep2()) {
                                                setStep(3);
                                                handleAddRazonSocial();
                                            }
                                        }}
                                        className="flex-1 px-4 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 rounded-xl text-white font-bold transition-all shadow-lg shadow-purple-500/25"
                                    >
                                        Continuar →
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* STEP 3: Add Razones Sociales */}
                        {clienteType === 'holding' && step === 3 && (
                            <form onSubmit={handleSubmitHolding} className="space-y-5">
                                <div className="bg-purple-950/20 border border-purple-500/10 rounded-xl p-4 mb-4">
                                    <h3 className="text-sm font-semibold text-purple-300 mb-2">🏗️ {holdingData.nombre_comercial}</h3>
                                    <p className="text-xs text-gray-500">RUC: {holdingData.ruc} • {holdingData.direccion}</p>
                                </div>

                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-sm font-semibold text-cyan-300">🏛️ Razones Sociales</h3>
                                    <button
                                        type="button"
                                        onClick={handleAddRazonSocial}
                                        className="text-xs font-bold px-3 py-1.5 bg-cyan-600/20 border border-cyan-500/30 hover:bg-cyan-600/40 text-cyan-300 rounded-lg transition-all"
                                    >
                                        + Agregar
                                    </button>
                                </div>

                                {errors.razones && <p className="text-xs text-red-400">{errors.razones}</p>}

                                <div className="space-y-3 max-h-[300px] overflow-y-auto">
                                    {razonesSociales.map((razon, idx) => (
                                        <div key={razon.id} className="bg-gray-950/30 border border-gray-800 rounded-xl p-4 space-y-3">
                                            <div className="flex justify-between items-center mb-2">
                                                <h4 className="text-xs font-semibold text-gray-400">Razón Social #{idx + 1}</h4>
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveRazonSocial(razon.id)}
                                                    className="text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 px-2 py-1 rounded transition-colors"
                                                >
                                                    ✕
                                                </button>
                                            </div>

                                            <input
                                                type="text"
                                                value={razon.razon_social}
                                                onChange={(e) => handleRazonSocialChange(razon.id, 'razon_social', e.target.value)}
                                                placeholder="Ej: Comercial Sendai S.A.C."
                                                className={`w-full px-3 py-2 bg-gray-900/50 border ${errors[`razon_${idx}`] ? 'border-red-500' : 'border-gray-700'} rounded-lg text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-all text-sm`}
                                            />
                                            {errors[`razon_${idx}`] && <p className="text-xs text-red-400">{errors[`razon_${idx}`]}</p>}

                                            <div className="grid grid-cols-2 gap-2">
                                                <input
                                                    type="text"
                                                    value={razon.nombre_comercial || ''}
                                                    onChange={(e) => handleRazonSocialChange(razon.id, 'nombre_comercial', e.target.value)}
                                                    placeholder="Nombre comercial"
                                                    className="w-full px-3 py-2 bg-gray-900/50 border border-gray-700 rounded-lg text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-all text-sm"
                                                />
                                                <input
                                                    type="text"
                                                    value={razon.ruc || ''}
                                                    onChange={(e) => handleRazonSocialChange(razon.id, 'ruc', e.target.value)}
                                                    placeholder="RUC"
                                                    maxLength={11}
                                                    className={`w-full px-3 py-2 bg-gray-900/50 border ${errors[`ruc_${idx}`] ? 'border-red-500' : 'border-gray-700'} rounded-lg text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-all text-sm font-mono`}
                                                />
                                                {errors[`ruc_${idx}`] && <p className="text-xs text-red-400 col-span-2">{errors[`ruc_${idx}`]}</p>}
                                            </div>

                                            <input
                                                type="text"
                                                value={razon.direccion || ''}
                                                onChange={(e) => handleRazonSocialChange(razon.id, 'direccion', e.target.value)}
                                                placeholder="Dirección"
                                                className="w-full px-3 py-2 bg-gray-900/50 border border-gray-700 rounded-lg text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-all text-sm"
                                            />

                                            <div className="grid grid-cols-2 gap-2">
                                                <input
                                                    type="text"
                                                    value={razon.contacto || ''}
                                                    onChange={(e) => handleRazonSocialChange(razon.id, 'contacto', e.target.value)}
                                                    placeholder="Contacto"
                                                    className="w-full px-3 py-2 bg-gray-900/50 border border-gray-700 rounded-lg text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-all text-sm"
                                                />
                                                <input
                                                    type="tel"
                                                    value={razon.telefono || ''}
                                                    onChange={(e) => handleRazonSocialChange(razon.id, 'telefono', e.target.value)}
                                                    placeholder="Teléfono"
                                                    className="w-full px-3 py-2 bg-gray-900/50 border border-gray-700 rounded-lg text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-all text-sm"
                                                />
                                            </div>

                                            <input
                                                type="email"
                                                value={razon.email || ''}
                                                onChange={(e) => handleRazonSocialChange(razon.id, 'email', e.target.value)}
                                                placeholder="Email"
                                                className="w-full px-3 py-2 bg-gray-900/50 border border-gray-700 rounded-lg text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-all text-sm"
                                            />
                                        </div>
                                    ))}
                                </div>

                                {/* Buttons */}
                                <div className="flex gap-3 pt-6 border-t border-gray-800">
                                    <button
                                        type="button"
                                        onClick={() => setStep(2)}
                                        className="flex-1 px-4 py-3 bg-gray-800/50 hover:bg-gray-700 border border-gray-700 rounded-xl text-gray-300 font-medium transition-all"
                                    >
                                        ← Atrás
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isSubmitting}
                                        className="flex-1 px-4 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 disabled:from-gray-600 disabled:to-gray-600 rounded-xl text-white font-bold transition-all shadow-lg shadow-purple-500/25 disabled:shadow-none"
                                    >
                                        {isSubmitting ? 'Creando...' : '✓ Crear Grupo'}
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
