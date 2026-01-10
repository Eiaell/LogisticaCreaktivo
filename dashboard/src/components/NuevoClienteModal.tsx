import { useState, useRef } from 'react';
import { useDatabase } from '../context/DatabaseContext';

interface NuevoClienteModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function NuevoClienteModal({ isOpen, onClose }: NuevoClienteModalProps) {
    const { createCliente, uploadLogo } = useDatabase();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [formData, setFormData] = useState({
        nombre: '',
        ruc: '',
        direccion: '',
        contacto: '',
        telefono: '',
        email: '',
        notas: ''
    });
    const [logoPreview, setLogoPreview] = useState<string | null>(null);
    const [logoFile, setLogoFile] = useState<File | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    if (!isOpen) return null;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: '' }));
        }
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

    const validate = () => {
        const newErrors: Record<string, string> = {};
        if (!formData.nombre.trim()) {
            newErrors.nombre = 'La razón social es requerida';
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
        if (!validate()) return;

        setIsSubmitting(true);
        try {
            let logoUrl: string | undefined;
            if (logoFile) {
                const url = await uploadLogo(logoFile, `cliente-${formData.nombre}`);
                if (url) logoUrl = url;
            }

            await createCliente({
                nombre: formData.nombre.trim(),
                ruc: formData.ruc || undefined,
                direccion: formData.direccion || undefined,
                contacto: formData.contacto || undefined,
                telefono: formData.telefono || undefined,
                email: formData.email || undefined,
                notas: formData.notas || undefined,
                logo: logoUrl
            });

            // Reset form
            setFormData({ nombre: '', ruc: '', direccion: '', contacto: '', telefono: '', email: '', notas: '' });
            setLogoPreview(null);
            setLogoFile(null);
            onClose();
        } catch (err) {
            console.error('Error creating cliente:', err);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleClose = () => {
        setFormData({ nombre: '', ruc: '', direccion: '', contacto: '', telefono: '', email: '', notas: '' });
        setLogoPreview(null);
        setLogoFile(null);
        setErrors({});
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                onClick={handleClose}
            />

            {/* Modal */}
            <div className="relative w-full max-w-lg mx-4 animate-in zoom-in-95 fade-in duration-200">
                <div className="bg-gradient-to-br from-gray-900 via-gray-900 to-blue-950/30 border border-blue-500/20 rounded-2xl shadow-2xl shadow-blue-500/10 overflow-hidden">
                    {/* Header */}
                    <div className="relative px-6 py-5 border-b border-blue-500/10">
                        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 via-transparent to-cyan-600/10" />
                        <div className="relative flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center">
                                    <span className="text-xl">👤</span>
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-white">Nuevo Cliente</h2>
                                    <p className="text-xs text-blue-400/60">Registrar empresa en el sistema</p>
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
                    <form onSubmit={handleSubmit} className="p-6 space-y-5">
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

                        {/* Razón Social - Principal */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-blue-300 uppercase tracking-wider">
                                Razón Social *
                            </label>
                            <input
                                type="text"
                                name="nombre"
                                value={formData.nombre}
                                onChange={handleChange}
                                placeholder="Nombre de la empresa"
                                className={`w-full px-4 py-3 bg-gray-950/50 border ${errors.nombre ? 'border-red-500' : 'border-gray-700'} rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition-all`}
                            />
                            {errors.nombre && <p className="text-xs text-red-400">{errors.nombre}</p>}
                        </div>

                        {/* RUC y Teléfono - Row */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                                    RUC
                                </label>
                                <input
                                    type="text"
                                    name="ruc"
                                    value={formData.ruc}
                                    onChange={handleChange}
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
                                    value={formData.telefono}
                                    onChange={handleChange}
                                    placeholder="+51 999 999 999"
                                    className="w-full px-4 py-2.5 bg-gray-950/50 border border-gray-700 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-all"
                                />
                            </div>
                        </div>

                        {/* Dirección */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                                Dirección de Facturación
                            </label>
                            <input
                                type="text"
                                name="direccion"
                                value={formData.direccion}
                                onChange={handleChange}
                                placeholder="Av. Principal 123, Distrito, Lima"
                                className="w-full px-4 py-2.5 bg-gray-950/50 border border-gray-700 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-all"
                            />
                        </div>

                        {/* Contacto y Email - Row */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                                    Persona de Contacto
                                </label>
                                <input
                                    type="text"
                                    name="contacto"
                                    value={formData.contacto}
                                    onChange={handleChange}
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
                                    value={formData.email}
                                    onChange={handleChange}
                                    placeholder="correo@empresa.com"
                                    className={`w-full px-4 py-2.5 bg-gray-950/50 border ${errors.email ? 'border-red-500' : 'border-gray-700'} rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-all`}
                                />
                                {errors.email && <p className="text-xs text-red-400">{errors.email}</p>}
                            </div>
                        </div>

                        {/* Notas */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                                Notas Adicionales
                            </label>
                            <textarea
                                name="notas"
                                value={formData.notas}
                                onChange={handleChange}
                                placeholder="Información relevante sobre el cliente..."
                                rows={2}
                                className="w-full px-4 py-2.5 bg-gray-950/50 border border-gray-700 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-all resize-none"
                            />
                        </div>

                        {/* Actions */}
                        <div className="flex gap-3 pt-2">
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
                                        Crear Cliente
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
