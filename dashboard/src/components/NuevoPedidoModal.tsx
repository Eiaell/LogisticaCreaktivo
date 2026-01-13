import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useDatabase } from '../context/DatabaseContext';
import { toUpperCase } from '../utils/parsers';

interface Props {
    isOpen: boolean;
    onClose: () => void;
}

const VENDEDORAS = ['Angélica', 'Johana', 'Natalia', 'Patricia', 'Pati'];
const ESTADOS_INICIALES = [
    { value: 'cotizacion', label: 'Cotización', color: 'bg-yellow-600', textColor: 'text-yellow-100', borderColor: 'border-yellow-500' },
    { value: 'aprobado', label: 'Aprobado', color: 'bg-green-600', textColor: 'text-green-100', borderColor: 'border-green-500' },
    { value: 'en_produccion', label: 'En Producción', color: 'bg-blue-600', textColor: 'text-blue-100', borderColor: 'border-blue-500' },
];

const getEstadoColor = (estado: string) => {
    const estadoObj = ESTADOS_INICIALES.find(e => e.value === estado);
    return estadoObj || ESTADOS_INICIALES[0];
};


export function NuevoPedidoModal({ isOpen, onClose }: Props) {
    const { clientes, getItemsUnicos, createPedido, createLineaPedido } = useDatabase();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [expandedGroup, setExpandedGroup] = useState<string | null>(null);

    // Form state
    const [cliente, setCliente] = useState('');
    const [nuevoCliente, setNuevoCliente] = useState('');
    const [vendedora, setVendedora] = useState('');
    const [estado, setEstado] = useState<'cotizacion' | 'aprobado' | 'en_produccion'>('cotizacion');
    const [isEstadoDropdownOpen, setIsEstadoDropdownOpen] = useState(false);
    const [rqNumero, setRqNumero] = useState('');
    const [fechaCompromiso, setFechaCompromiso] = useState('');

    // Form para cada item (como un object con múltiples entradas)
    const [itemForms, setItemForms] = useState<Array<{id: string; item: string; detalle: string}>>([{id: `FORM-${Date.now()}`, item: '', detalle: ''}]);

    // Get unique items from history for autocomplete
    const itemsHistorico = getItemsUnicos();

    // Función para obtener labels dinámicos según estado
    const getLabels = () => {
        switch (estado) {
            case 'cotizacion':
                return {
                    fecha: 'Fecha de Pedido de Cotización',
                    detalle: 'Detalle de Pedido de Cotización',
                    mostrarPrecio: false,
                    placeholderDetalle: 'Descripción de lo que se necesita cotizar...'
                };
            case 'aprobado':
                return {
                    fecha: 'Fecha de Pedido de Compra',
                    detalle: 'Detalle de Compra',
                    mostrarPrecio: true,
                    placeholderDetalle: '100 unidades, color rojo, con logo, cinta 2.5cm FULL COLOR...'
                };
            case 'en_produccion':
                return {
                    fecha: 'Fecha desde que está en Producción',
                    detalle: 'Detalle de Producción',
                    mostrarPrecio: true,
                    placeholderDetalle: 'Estado de producción, especificaciones, observaciones...'
                };
            default:
                return {
                    fecha: 'Fecha de Compromiso',
                    detalle: 'Detalle',
                    mostrarPrecio: true,
                    placeholderDetalle: 'Ingrese detalles...'
                };
        }
    };

    const labels = getLabels();

    // Build structure: main entities (groups + independent clients)
    const mainEntities: Array<{
        nombre: string;
        displayName: string;
        razonSocial?: string;
        isGroup: boolean;
        logo?: string;
        children?: Array<{ razonSocial: string; displayName: string; proyecto: string; logo?: string }>;
    }> = [];

    // First, collect groups and their clients
    const groupMap: Record<string, Array<{ razonSocial: string; displayName: string; proyecto: string; logo?: string }>> = {};

    Object.entries(clientes).forEach(([razonSocial, clienteData]) => {
        const grupo = clienteData.grupo_empresarial;

        if (grupo) {
            // This client belongs to a group
            if (!groupMap[grupo]) {
                groupMap[grupo] = [];
            }
            groupMap[grupo].push({
                razonSocial,
                displayName: clienteData.nombre_comercial && clienteData.nombre_comercial.trim()
                    ? clienteData.nombre_comercial
                    : razonSocial,
                proyecto: clienteData.proyecto || 'Oficina Principal',
                logo: clienteData.logo
            });
        } else {
            // Independent client
            mainEntities.push({
                nombre: razonSocial,
                displayName: clienteData.nombre_comercial && clienteData.nombre_comercial.trim()
                    ? clienteData.nombre_comercial
                    : razonSocial,
                razonSocial,
                isGroup: false,
                logo: clienteData.logo
            });
        }
    });

    // Add groups to main entities
    Object.entries(groupMap).forEach(([grupo, clients]) => {
        clients.sort((a, b) => a.displayName.localeCompare(b.displayName));

        // Find grupo_logo_url from any client in the group
        let groupLogo: string | undefined;
        const firstClientKey = Object.keys(clientes).find(key =>
            clientes[key]?.grupo_empresarial === grupo && clientes[key]?.grupo_logo_url
        );
        if (firstClientKey) {
            groupLogo = clientes[firstClientKey]?.grupo_logo_url;
        }

        mainEntities.push({
            nombre: grupo,
            displayName: grupo,
            isGroup: true,
            logo: groupLogo,
            children: clients
        });
    });

    // Sort main entities
    mainEntities.sort((a, b) => a.displayName.localeCompare(b.displayName));

    const clienteFinal = cliente === '__nuevo__' ? nuevoCliente : cliente;

    const resetForm = () => {
        setCliente('');
        setNuevoCliente('');
        setVendedora('');
        setEstado('cotizacion');
        setRqNumero('');
        setFechaCompromiso('');
        setItemForms([{id: `FORM-${Date.now()}`, item: '', detalle: ''}]);
    };

    const updateItemForm = (formId: string, field: 'item' | 'detalle', value: string) => {
        setItemForms(prev => prev.map(form =>
            form.id === formId ? {...form, [field]: value} : form
        ));
    };


    const deleteItemFromForm = (formId: string) => {
        if (itemForms.length === 1) return; // Siempre mantener al menos una forma
        setItemForms(prev => prev.filter(f => f.id !== formId));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        // Cliente es OPCIONAL - permitir crear sin especificar cliente

        // Convertir itemForms con datos a lineas
        const itemsACrear = itemForms.filter(f => f.item && f.detalle);
        if (!itemsACrear.length) return;

        setIsSubmitting(true);
        try {
            // Convertir fecha YYYY-MM-DD a ISO ajustando por zona horaria (Peru UTC-5)
            let fechaFinal: string | undefined = undefined;
            if (fechaCompromiso) {
                // fechaCompromiso es "YYYY-MM-DD" del input type="date"
                // Lo convertimos a ISO string agregando la zona horaria correcta
                const partes = fechaCompromiso.split('-');
                const year = parseInt(partes[0]);
                const month = parseInt(partes[1]) - 1; // Meses son 0-11
                const day = parseInt(partes[2]);

                // Crear date en zona horaria local (sin asumir UTC)
                const fecha = new Date(year, month, day, 0, 0, 0, 0);
                fechaFinal = fecha.toISOString();
            }

            // Create the pedido
            const descripcionItems = itemsACrear.map(f => f.item).join(', ');
            const pedido = await createPedido({
                cliente: clienteFinal || '', // Cliente es opcional - permitir string vacío
                descripcion: descripcionItems,
                vendedora: vendedora || '',
                estado,
                precio: 0, // En cotización siempre es 0
                pagado: 0,
                rq_numero: rqNumero || null,
                fecha_compromiso: fechaFinal,
            });

            // Create all lines
            for (const form of itemsACrear) {
                await createLineaPedido(pedido.id, {
                    pedido_id: pedido.id,
                    item: form.item,
                    detalle: form.detalle,
                    precio: 0, // En cotización siempre es 0
                } as any);
            }

            console.log('✅ Pedido creado exitosamente:', pedido.id);
            resetForm();
            onClose();
        } catch (err) {
            console.error('Error creando pedido:', err);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    const modalContent = (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
            <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-800">
                    <h2 className="text-xl font-bold text-white flex items-center gap-3">
                        <span className="text-2xl">📦</span>
                        Nuevo Pedido
                    </h2>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 rounded-full hover:bg-gray-800 flex items-center justify-center text-gray-500 hover:text-white transition-colors"
                    >
                        ✕
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
                    {/* Cliente */}
                    <div className="space-y-2">
                        <label className="text-xs text-gray-400 font-bold uppercase tracking-wide">
                            Cliente <span className="text-gray-500">(opcional)</span>
                        </label>

                        <div className="relative">
                            <button
                                type="button"
                                className="w-full bg-gray-950 border border-gray-700 rounded-lg p-3 text-white text-left flex items-center justify-between hover:border-gray-600 transition-colors"
                                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                            >
                                <span>
                                    {cliente
                                        ? clientes[cliente]?.nombre_comercial || cliente
                                        : 'Seleccionar cliente...'}
                                </span>
                                <span className={`transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`}>
                                    ▼
                                </span>
                            </button>

                            {/* Dropdown Content */}
                            {isDropdownOpen && (
                                <div className="absolute top-full left-0 right-0 mt-1 bg-gray-950 border border-gray-700 rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto">
                                    {mainEntities.map((entity) => {
                                        if (!entity.isGroup) {
                                            // Independent client
                                            return (
                                                <button
                                                    key={entity.nombre}
                                                    type="button"
                                                    onClick={() => {
                                                        setCliente(entity.razonSocial!);
                                                        setIsDropdownOpen(false);
                                                    }}
                                                    className={`w-full text-left px-4 py-3 transition-colors border-b border-gray-800 last:border-b-0 flex items-center gap-3 ${
                                                        cliente === entity.razonSocial
                                                            ? 'bg-cyan-600/30 text-cyan-300'
                                                            : 'hover:bg-gray-900 text-gray-300'
                                                    }`}
                                                >
                                                    {entity.logo ? (
                                                        <img src={entity.logo} alt="" className="w-6 h-6 rounded object-cover flex-shrink-0" />
                                                    ) : (
                                                        <span className="w-6 h-6 rounded bg-gray-800 flex items-center justify-center text-xs flex-shrink-0">🏢</span>
                                                    )}
                                                    {entity.displayName}
                                                </button>
                                            );
                                        }

                                        // Group with submenu
                                        const isGroupExpanded = expandedGroup === entity.nombre;
                                        return (
                                            <div key={entity.nombre} className="border-b border-gray-800 last:border-b-0">
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        setExpandedGroup(isGroupExpanded ? null : entity.nombre);
                                                    }}
                                                    className="w-full text-left px-4 py-3 bg-gray-900/50 hover:bg-gray-900 text-cyan-400 flex items-center justify-between transition-colors"
                                                >
                                                    <div className="flex items-center gap-3">
                                                        {entity.logo ? (
                                                            <img src={entity.logo} alt="" className="w-6 h-6 rounded object-cover" />
                                                        ) : (
                                                            <span className="w-6 h-6 rounded bg-gray-800 flex items-center justify-center text-xs">🏢</span>
                                                        )}
                                                        <span className="font-semibold">{entity.displayName}</span>
                                                    </div>
                                                    <span className={`text-xs transition-transform ${isGroupExpanded ? 'rotate-90' : ''}`}>
                                                        ▶
                                                    </span>
                                                </button>

                                                {/* Group Projects Submenu */}
                                                {isGroupExpanded && entity.children && (
                                                    <div className="bg-gray-950/50">
                                                        {entity.children.map((child) => (
                                                            <button
                                                                key={child.razonSocial}
                                                                type="button"
                                                                onClick={() => {
                                                                    setCliente(child.razonSocial);
                                                                    setIsDropdownOpen(false);
                                                                    setExpandedGroup(null);
                                                                }}
                                                                className={`w-full text-left px-8 py-2 text-sm transition-colors border-b border-gray-800 last:border-b-0 flex items-center gap-3 ${
                                                                    cliente === child.razonSocial
                                                                        ? 'bg-cyan-600/30 text-cyan-300'
                                                                        : 'hover:bg-gray-900/50 text-gray-400'
                                                                }`}
                                                            >
                                                                {child.logo ? (
                                                                    <img src={child.logo} alt="" className="w-5 h-5 rounded object-cover flex-shrink-0" />
                                                                ) : (
                                                                    <span className="w-5 h-5 rounded bg-gray-800 flex items-center justify-center text-xs flex-shrink-0">🏢</span>
                                                                )}
                                                                <div className="flex-1">
                                                                    <div>{child.displayName}</div>
                                                                    <div className="text-xs text-gray-500">{child.proyecto}</div>
                                                                </div>
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}

                                    {/* Nuevo Cliente option */}
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setCliente('__nuevo__');
                                            setIsDropdownOpen(false);
                                            setNuevoCliente('');
                                        }}
                                        className="w-full text-left px-4 py-3 text-gray-400 hover:text-gray-300 hover:bg-gray-900 transition-colors border-t border-gray-800"
                                    >
                                        + Nuevo Cliente
                                    </button>
                                </div>
                            )}
                        </div>

                        {cliente === '__nuevo__' && (
                            <input
                                type="text"
                                value={nuevoCliente}
                                onChange={(e) => setNuevoCliente(toUpperCase(e.target.value))}
                                placeholder="NOMBRE DEL NUEVO CLIENTE"
                                className="w-full bg-gray-950 border border-cyan-500/50 rounded-lg p-3 text-white focus:border-cyan-500 outline-none mt-2 uppercase"
                                required
                            />
                        )}
                    </div>

                    {/* Vendedora + Estado */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-xs text-gray-400 font-bold uppercase tracking-wide">
                                Vendedor/a
                            </label>
                            <select
                                value={vendedora}
                                onChange={(e) => setVendedora(e.target.value)}
                                className="w-full bg-gray-950 border border-gray-700 rounded-lg p-3 text-white focus:border-cyan-500 outline-none"
                            >
                                <option value="">Sin asignar</option>
                                {VENDEDORAS.map(v => (
                                    <option key={v} value={v}>{v}</option>
                                ))}
                            </select>
                        </div>
                        <div className="space-y-1 relative">
                            <label className="text-xs text-gray-400 font-bold uppercase tracking-wide">
                                Estado Inicial
                            </label>
                            <button
                                type="button"
                                onClick={() => setIsEstadoDropdownOpen(!isEstadoDropdownOpen)}
                                className={`w-full rounded-lg p-3 text-left font-medium transition-all border-2 flex items-center justify-between ${getEstadoColor(estado).color} ${getEstadoColor(estado).textColor} ${getEstadoColor(estado).borderColor}`}
                            >
                                <span>{ESTADOS_INICIALES.find(e => e.value === estado)?.label}</span>
                                <span className={`text-sm transition-transform ${isEstadoDropdownOpen ? 'rotate-180' : ''}`}>▼</span>
                            </button>

                            {/* Dropdown menu */}
                            {isEstadoDropdownOpen && (
                                <div className="absolute top-full left-0 right-0 mt-1 bg-gray-950 border-2 border-gray-700 rounded-lg shadow-lg z-50">
                                    {ESTADOS_INICIALES.map(e => (
                                        <button
                                            key={e.value}
                                            type="button"
                                            onClick={() => {
                                                setEstado(e.value as 'cotizacion' | 'aprobado' | 'en_produccion');
                                                setIsEstadoDropdownOpen(false);
                                            }}
                                            className={`w-full text-left px-4 py-3 border-b border-gray-800 last:border-b-0 transition-colors flex items-center gap-3 ${
                                                estado === e.value
                                                    ? `${e.color} ${e.textColor} font-bold`
                                                    : 'text-gray-400 hover:text-white hover:bg-gray-900'
                                            }`}
                                        >
                                            <span className={`w-3 h-3 rounded-full ${e.color}`}></span>
                                            {e.label}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* RQ + Fecha Compromiso */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-xs text-gray-400 font-bold uppercase tracking-wide">
                                RQ / Referencia
                            </label>
                            <input
                                type="text"
                                value={rqNumero}
                                onChange={(e) => setRqNumero(toUpperCase(e.target.value))}
                                placeholder="EJ: RQ-2024-001"
                                className="w-full bg-gray-950 border border-gray-700 rounded-lg p-3 text-white focus:border-cyan-500 outline-none text-sm uppercase"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs text-gray-400 font-bold uppercase tracking-wide">
                                {labels.fecha}
                            </label>
                            <input
                                type="date"
                                value={fechaCompromiso}
                                onChange={(e) => setFechaCompromiso(e.target.value)}
                                className="w-full bg-gray-950 border border-gray-700 rounded-lg p-3 text-white focus:border-cyan-500 outline-none text-sm"
                            />
                        </div>
                    </div>

                    {/* Items/Líneas Section */}
                    <div className="space-y-4 border-t border-gray-700 pt-6">
                        <div className="flex items-center justify-between mb-2">
                            <label className="text-xs text-gray-400 font-bold uppercase tracking-wide">
                                Líneas de Pedido
                            </label>
                            <span className="text-xs text-gray-500 bg-gray-800 px-2 py-1 rounded">{itemForms.length} ítem{itemForms.length !== 1 ? 's' : ''}</span>
                        </div>

                        {/* Formularios para agregar items */}
                        <div className="space-y-3">
                            {itemForms.map((form, index) => (
                                <div key={form.id} className="border border-gray-700 rounded-lg p-4 space-y-3">
                                    {/* Item Header */}
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-bold text-cyan-400 uppercase tracking-wide">Línea {index + 1}</span>
                                        {itemForms.length > 1 && (
                                            <button
                                                type="button"
                                                onClick={() => deleteItemFromForm(form.id)}
                                                className="text-gray-500 hover:text-red-400 transition-colors text-lg"
                                                title="Eliminar línea"
                                            >
                                                ✕
                                            </button>
                                        )}
                                    </div>

                                    {/* Producto / Item */}
                                    <div className="space-y-1">
                                        <label className="text-xs text-gray-400 font-bold uppercase tracking-wide">Producto / Item *</label>
                                        <datalist id={`items-${form.id}`}>
                                            {itemsHistorico.map(item => (
                                                <option key={item} value={item} />
                                            ))}
                                        </datalist>
                                        <input
                                            type="text"
                                            list={`items-${form.id}`}
                                            value={form.item}
                                            onChange={(e) => updateItemForm(form.id, 'item', toUpperCase(e.target.value))}
                                            placeholder="Ej: BOLSAS, CAMISETAS, AFICHES..."
                                            className="w-full bg-gray-950 border border-gray-700 rounded-lg p-3 text-white text-sm placeholder-gray-500 focus:border-cyan-500 outline-none uppercase"
                                        />
                                    </div>

                                    {/* Detalle - Textarea */}
                                    <div className="space-y-1">
                                        <label className="text-xs text-gray-400 font-bold uppercase tracking-wide">{labels.detalle} *</label>
                                        <textarea
                                            value={form.detalle}
                                            onChange={(e) => updateItemForm(form.id, 'detalle', toUpperCase(e.target.value))}
                                            placeholder={labels.placeholderDetalle.toUpperCase()}
                                            className="w-full bg-gray-950 border border-gray-700 rounded-lg p-3 text-white text-sm placeholder-gray-500 focus:border-cyan-500 outline-none resize-none h-20 uppercase"
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Botón para agregar otro item */}
                        <button
                            type="button"
                            onClick={() => setItemForms(prev => [...prev, {id: `FORM-${Date.now()}`, item: '', detalle: ''}])}
                            className="w-full py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-cyan-400 rounded-lg text-sm font-medium transition-all border border-gray-700 border-dashed hover:border-cyan-500/50 flex items-center justify-center gap-2"
                        >
                            <span className="text-lg">+</span>
                            Agregar otra línea
                        </button>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 p-6 border-t border-gray-700 bg-gray-900/50 -m-6 mt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-3 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg font-medium transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting || !itemForms.some(f => f.item && f.detalle)}
                            className="flex-1 py-3 bg-cyan-600 hover:bg-cyan-500 disabled:bg-gray-800 disabled:text-gray-600 text-white rounded-lg font-bold transition-colors flex items-center justify-center gap-2"
                        >
                            {isSubmitting ? (
                                <span className="animate-spin">⏳</span>
                            ) : (
                                <>
                                    <span>Crear Pedido</span>
                                    <span>↵</span>
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );

    return createPortal(modalContent, document.body);
}
