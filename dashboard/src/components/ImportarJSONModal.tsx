import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useDatabase } from '../context/DatabaseContext';

interface Props {
    isOpen: boolean;
    onClose: () => void;
}

// Tipos de importación
type TipoImportacion = 'cotizacion' | 'produccion' | 'movimiento' | 'pago' | null;

const TIPOS_IMPORTACION = [
    {
        id: 'cotizacion' as const,
        nombre: 'Cotización / Propuesta',
        descripcion: 'Propuesta comercial al cliente con productos y precios',
        color: 'from-amber-500 to-orange-600',
        icon: '💰'
    },
    {
        id: 'produccion' as const,
        nombre: 'Producción',
        descripcion: 'Órdenes de producción enviadas a proveedores',
        color: 'from-blue-500 to-indigo-600',
        icon: '🏭'
    },
    {
        id: 'movimiento' as const,
        nombre: 'Moviendo / Recogiendo',
        descripcion: 'Movimientos de logística y recojo de materiales',
        color: 'from-green-500 to-emerald-600',
        icon: '🚚'
    },
    {
        id: 'pago' as const,
        nombre: 'Pagando / Rindiendo',
        descripcion: 'Pagos a proveedores y rendiciones de gastos',
        color: 'from-purple-500 to-pink-600',
        icon: '💳'
    }
];

// ====== Estructuras de JSON para cada tipo ======

// 1. Cotización/Propuesta comercial al cliente
interface JSONCotizacion {
    contexto_propuesta?: {
        cliente: string;
        estado?: string;
        incluye?: string[];
        pendiente?: string[];
    };
    cliente?: string;
    vendedora?: string;
    rq_numero?: string;
    estado?: 'cotizacion' | 'aprobado' | 'en_produccion';
    fecha_compromiso?: string;
    // Formato productos propuestos (cotización formal)
    productos_propuestos?: Array<{
        producto: string;
        codigo?: string;
        cantidad: number;
        descripcion_tecnica?: string;
        precio_unitario?: number | null;
        precio_x_100?: number | null;
        estado_precio?: string;
    }>;
    // Formato lineas simple
    lineas?: Array<{
        item: string;
        detalle: string;
        cantidad?: number;
        precio?: number;
    }>;
    // Formato bloques
    bloques?: Array<{
        nombre: string;
        items: Array<{
            descripcion: string;
            cantidad: number;
            observaciones_logisticas?: string;
            precio?: number;
        }>;
    }>;
    datos_generales?: {
        cliente: string;
        asunto?: string;
    };
}

// 2. Producción (órdenes a proveedores)
interface JSONProduccion {
    proveedor: string;
    pedido_id?: string;
    items: Array<{
        producto: string;
        cantidad: number;
        precio_unitario?: number;
        especificaciones?: string;
        fecha_compromiso?: string;
    }>;
}

// 3. Movimiento/Logística
interface JSONMovimiento {
    fecha?: string;
    tipo: 'recojo' | 'entrega' | 'compra';
    origen?: string;
    destino?: string;
    items?: Array<{
        descripcion: string;
        cantidad?: number;
        proveedor?: string;
    }>;
    costo_movilidad?: number;
    notas?: string;
}

// 4. Pago/Rendición
interface JSONPago {
    proveedor?: string;
    pedido_id?: string;
    monto: number;
    tipo: 'adelanto' | 'saldo' | 'rendicion';
    medio_pago?: string;
    comprobante?: string;
    fecha?: string;
    notas?: string;
}

// ====== Ejemplos de JSON para cada tipo ======

const EJEMPLO_COTIZACION = `{
  "contexto_propuesta": {
    "cliente": "Touring",
    "estado": "Propuesta comercial base presentada"
  },
  "productos_propuestos": [
    {
      "producto": "Termo Metálico",
      "codigo": "TY-B1000",
      "cantidad": 50,
      "descripcion_tecnica": "1 L, 33.5 × Ø8 cm",
      "precio_unitario": 24.00
    },
    {
      "producto": "Lapicero Metálico",
      "codigo": "A-1002R",
      "cantidad": 50,
      "descripcion_tecnica": "Metálico, tinta negra",
      "precio_unitario": 5.00
    }
  ]
}`;

const EJEMPLO_COTIZACION_SIMPLE = `{
  "cliente": "TOURING",
  "vendedora": "Angélica",
  "rq_numero": "TOURING-MERCH-2026",
  "lineas": [
    { "item": "LAPICEROS", "detalle": "250 UNIDADES - PLÁSTICO", "precio": 250 },
    { "item": "LANYARDS", "detalle": "250 UNIDADES - 2.5CM, SUBLIMADO", "precio": 500 }
  ]
}`;

const EJEMPLO_PRODUCCION = `{
  "proveedor": "ARTECK",
  "pedido_id": "PED-123",
  "items": [
    {
      "producto": "Lanyards sublimados",
      "cantidad": 250,
      "precio_unitario": 2.50,
      "especificaciones": "2.5cm, full color, con tiptop",
      "fecha_compromiso": "2026-01-20"
    }
  ]
}`;

const EJEMPLO_MOVIMIENTO = `{
  "fecha": "2026-01-15",
  "tipo": "recojo",
  "origen": "Arteck - Gamarra",
  "destino": "Oficina Creaktivo",
  "items": [
    { "descripcion": "Lanyards Touring", "cantidad": 250, "proveedor": "Arteck" }
  ],
  "costo_movilidad": 15,
  "notas": "Recojo urgente para entrega mañana"
}`;

const EJEMPLO_PAGO = `{
  "proveedor": "ARTECK",
  "pedido_id": "PED-123",
  "monto": 312.50,
  "tipo": "adelanto",
  "medio_pago": "Yape",
  "fecha": "2026-01-15",
  "notas": "50% adelanto lanyards"
}`;

// ====== Interfaces de Preview ======

interface PreviewCotizacion {
    cliente: string;
    total: number;
    lineas: Array<{ item: string; detalle: string; cantidad: number; precio: number }>;
}

interface PreviewProduccion {
    proveedor: string;
    items: Array<{ producto: string; cantidad: number; precio: number }>;
}

interface PreviewMovimiento {
    tipo: string;
    origen: string;
    destino: string;
    items: number;
    costo: number;
}

interface PreviewPago {
    proveedor: string;
    monto: number;
    tipo: string;
}

type Preview = PreviewCotizacion | PreviewProduccion | PreviewMovimiento | PreviewPago | null;

export function ImportarJSONModal({ isOpen, onClose }: Props) {
    const { createPedido, createLineaPedido } = useDatabase();
    const [tipoSeleccionado, setTipoSeleccionado] = useState<TipoImportacion>(null);
    const [jsonInput, setJsonInput] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [preview, setPreview] = useState<Preview>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showEjemplo, setShowEjemplo] = useState<string | null>(null);

    const resetModal = () => {
        setTipoSeleccionado(null);
        setJsonInput('');
        setError(null);
        setPreview(null);
        setShowEjemplo(null);
    };

    const handleClose = () => {
        resetModal();
        onClose();
    };

    // ====== Parsers para cada tipo ======

    const parseCotizacion = (input: string): PreviewCotizacion | null => {
        try {
            const data: JSONCotizacion = JSON.parse(input);
            let cliente = data.cliente || data.contexto_propuesta?.cliente || data.datos_generales?.cliente || '';
            cliente = cliente.toUpperCase();

            const lineas: PreviewCotizacion['lineas'] = [];
            let total = 0;

            // Formato 1: productos_propuestos (cotización formal)
            if (data.productos_propuestos && data.productos_propuestos.length > 0) {
                for (const prod of data.productos_propuestos) {
                    const precio = prod.precio_unitario ?? 0;
                    const subtotal = precio * prod.cantidad;
                    total += subtotal;
                    lineas.push({
                        item: prod.producto.toUpperCase(),
                        detalle: `${prod.cantidad} UND${prod.codigo ? ` - ${prod.codigo}` : ''}${prod.descripcion_tecnica ? ` - ${prod.descripcion_tecnica}` : ''}`.toUpperCase(),
                        cantidad: prod.cantidad,
                        precio: subtotal
                    });
                }
            }

            // Formato 2: lineas directas
            if (data.lineas && data.lineas.length > 0) {
                for (const linea of data.lineas) {
                    const precio = linea.precio || 0;
                    total += precio;
                    lineas.push({
                        item: linea.item.toUpperCase(),
                        detalle: linea.cantidad
                            ? `${linea.cantidad} UNIDADES - ${linea.detalle}`.toUpperCase()
                            : linea.detalle.toUpperCase(),
                        cantidad: linea.cantidad || 1,
                        precio
                    });
                }
            }

            // Formato 3: bloques
            if (data.bloques && data.bloques.length > 0) {
                for (const bloque of data.bloques) {
                    for (const item of bloque.items) {
                        const precio = item.precio || 0;
                        total += precio;
                        lineas.push({
                            item: item.descripcion.toUpperCase(),
                            detalle: `${item.cantidad} UNIDADES${item.observaciones_logisticas ? ` - ${item.observaciones_logisticas}` : ''}`.toUpperCase(),
                            cantidad: item.cantidad,
                            precio
                        });
                    }
                }
            }

            if (lineas.length === 0) {
                throw new Error('No se encontraron productos/líneas en el JSON');
            }

            return { cliente, total, lineas };
        } catch (err) {
            throw new Error(err instanceof Error ? err.message : 'JSON inválido para cotización');
        }
    };

    const parseProduccion = (input: string): PreviewProduccion | null => {
        try {
            const data: JSONProduccion = JSON.parse(input);
            if (!data.proveedor) throw new Error('Falta el proveedor');
            if (!data.items || data.items.length === 0) throw new Error('Faltan los items');

            return {
                proveedor: data.proveedor.toUpperCase(),
                items: data.items.map(item => ({
                    producto: item.producto,
                    cantidad: item.cantidad,
                    precio: (item.precio_unitario || 0) * item.cantidad
                }))
            };
        } catch (err) {
            throw new Error(err instanceof Error ? err.message : 'JSON inválido para producción');
        }
    };

    const parseMovimiento = (input: string): PreviewMovimiento | null => {
        try {
            const data: JSONMovimiento = JSON.parse(input);
            return {
                tipo: data.tipo || 'recojo',
                origen: data.origen || '',
                destino: data.destino || '',
                items: data.items?.length || 0,
                costo: data.costo_movilidad || 0
            };
        } catch (err) {
            throw new Error(err instanceof Error ? err.message : 'JSON inválido para movimiento');
        }
    };

    const parsePago = (input: string): PreviewPago | null => {
        try {
            const data: JSONPago = JSON.parse(input);
            if (!data.monto) throw new Error('Falta el monto');
            return {
                proveedor: data.proveedor || 'Sin especificar',
                monto: data.monto,
                tipo: data.tipo || 'pago'
            };
        } catch (err) {
            throw new Error(err instanceof Error ? err.message : 'JSON inválido para pago');
        }
    };

    const handleInputChange = (value: string) => {
        setJsonInput(value);
        setError(null);
        setPreview(null);

        if (!value.trim() || !tipoSeleccionado) return;

        try {
            let parsed: Preview = null;
            switch (tipoSeleccionado) {
                case 'cotizacion':
                    parsed = parseCotizacion(value);
                    break;
                case 'produccion':
                    parsed = parseProduccion(value);
                    break;
                case 'movimiento':
                    parsed = parseMovimiento(value);
                    break;
                case 'pago':
                    parsed = parsePago(value);
                    break;
            }
            setPreview(parsed);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'JSON inválido');
        }
    };

    const handleSubmit = async () => {
        if (!preview || !tipoSeleccionado) return;

        setIsSubmitting(true);
        try {
            switch (tipoSeleccionado) {
                case 'cotizacion': {
                    const cotPreview = preview as PreviewCotizacion;
                    const descripcionResumen = cotPreview.lineas.slice(0, 3).map(l => l.item).join(', ') +
                        (cotPreview.lineas.length > 3 ? ` (+${cotPreview.lineas.length - 3} más)` : '');

                    const pedido = await createPedido({
                        cliente: cotPreview.cliente,
                        descripcion: descripcionResumen,
                        vendedora: '',
                        estado: 'cotizacion',
                        precio: cotPreview.total,
                        pagado: 0,
                        rq_numero: null,
                    });

                    for (const linea of cotPreview.lineas) {
                        await createLineaPedido(pedido.id, {
                            pedido_id: pedido.id,
                            item: linea.item,
                            detalle: linea.detalle,
                            precio: linea.precio,
                        } as any);
                    }
                    console.log(`✅ Cotización creada con ${cotPreview.lineas.length} líneas:`, pedido.id);
                    break;
                }
                case 'produccion': {
                    // TODO: Implementar creación de producción
                    console.log('📋 Producción a crear:', preview);
                    alert('Funcionalidad de producción próximamente');
                    break;
                }
                case 'movimiento': {
                    // TODO: Implementar creación de movimiento
                    console.log('📋 Movimiento a crear:', preview);
                    alert('Funcionalidad de movimiento próximamente');
                    break;
                }
                case 'pago': {
                    // TODO: Implementar creación de pago
                    console.log('📋 Pago a crear:', preview);
                    alert('Funcionalidad de pago próximamente');
                    break;
                }
            }
            handleClose();
        } catch (err) {
            console.error('Error procesando JSON:', err);
            setError('Error al procesar: ' + (err instanceof Error ? err.message : 'Error desconocido'));
        } finally {
            setIsSubmitting(false);
        }
    };

    const getEjemplos = () => {
        switch (tipoSeleccionado) {
            case 'cotizacion':
                return [
                    { id: 'formal', nombre: 'Cotización formal', json: EJEMPLO_COTIZACION },
                    { id: 'simple', nombre: 'Formato simple', json: EJEMPLO_COTIZACION_SIMPLE }
                ];
            case 'produccion':
                return [{ id: 'produccion', nombre: 'Orden de producción', json: EJEMPLO_PRODUCCION }];
            case 'movimiento':
                return [{ id: 'movimiento', nombre: 'Movimiento/Recojo', json: EJEMPLO_MOVIMIENTO }];
            case 'pago':
                return [{ id: 'pago', nombre: 'Pago/Rendición', json: EJEMPLO_PAGO }];
            default:
                return [];
        }
    };

    if (!isOpen) return null;

    // ====== PASO 1: Selección de tipo ======
    if (!tipoSeleccionado) {
        return createPortal(
            <div
                className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-4"
                onClick={(e) => e.target === e.currentTarget && handleClose()}
            >
                <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-2xl shadow-2xl">
                    <div className="flex items-center justify-between p-6 border-b border-gray-800">
                        <div>
                            <h2 className="text-xl font-bold text-white flex items-center gap-3">
                                <span className="text-2xl">📋</span>
                                Importar desde JSON
                            </h2>
                            <p className="text-gray-400 text-sm mt-1">Selecciona el tipo de información a importar</p>
                        </div>
                        <button
                            onClick={handleClose}
                            className="w-10 h-10 rounded-full hover:bg-gray-800 flex items-center justify-center text-gray-500 hover:text-white transition-colors"
                        >
                            ✕
                        </button>
                    </div>

                    <div className="p-6 grid grid-cols-2 gap-4">
                        {TIPOS_IMPORTACION.map((tipo) => (
                            <button
                                key={tipo.id}
                                onClick={() => setTipoSeleccionado(tipo.id)}
                                className={`p-5 rounded-xl bg-gradient-to-br ${tipo.color} hover:scale-[1.02] transition-all text-left group`}
                            >
                                <div className="text-3xl mb-2">{tipo.icon}</div>
                                <h3 className="text-white font-bold text-lg">{tipo.nombre}</h3>
                                <p className="text-white/70 text-sm mt-1">{tipo.descripcion}</p>
                            </button>
                        ))}
                    </div>

                    <div className="p-6 border-t border-gray-800">
                        <button
                            onClick={handleClose}
                            className="w-full py-3 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg font-medium transition-colors"
                        >
                            Cancelar
                        </button>
                    </div>
                </div>
            </div>,
            document.body
        );
    }

    // ====== PASO 2: Input de JSON ======
    const tipoInfo = TIPOS_IMPORTACION.find(t => t.id === tipoSeleccionado)!;
    const ejemplos = getEjemplos();

    const renderPreview = () => {
        if (!preview) return null;

        switch (tipoSeleccionado) {
            case 'cotizacion': {
                const p = preview as PreviewCotizacion;
                return (
                    <div className="bg-gray-950 border border-green-500/30 rounded-lg p-4 space-y-3">
                        <div className="flex items-center gap-2 text-green-400 text-sm font-medium">
                            ✓ JSON válido - Vista previa
                        </div>
                        <div className="grid grid-cols-3 gap-4 text-sm">
                            <div>
                                <span className="text-gray-500">Cliente:</span>
                                <span className="text-white ml-2 font-medium">{p.cliente || '(Sin especificar)'}</span>
                            </div>
                            <div>
                                <span className="text-gray-500">Productos:</span>
                                <span className="text-cyan-400 ml-2 font-medium">{p.lineas.length} items</span>
                            </div>
                            <div>
                                <span className="text-gray-500">Total:</span>
                                <span className="text-amber-400 ml-2 font-bold">S/. {p.total.toFixed(2)}</span>
                            </div>
                        </div>
                        <div className="border-t border-gray-800 pt-3 mt-3">
                            <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Productos:</p>
                            <div className="max-h-48 overflow-y-auto space-y-1">
                                {p.lineas.map((linea, idx) => (
                                    <div key={idx} className="flex items-start justify-between text-sm py-1">
                                        <div className="flex items-start gap-2">
                                            <span className="text-gray-600 font-mono text-xs w-6">{idx + 1}.</span>
                                            <div>
                                                <span className="text-cyan-400 font-medium">{linea.item}</span>
                                                <span className="text-gray-500 ml-2 text-xs">{linea.detalle.substring(0, 50)}{linea.detalle.length > 50 ? '...' : ''}</span>
                                            </div>
                                        </div>
                                        <span className="text-amber-400 font-mono text-xs">S/. {linea.precio.toFixed(2)}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                );
            }
            case 'produccion': {
                const p = preview as PreviewProduccion;
                const total = p.items.reduce((sum, i) => sum + i.precio, 0);
                return (
                    <div className="bg-gray-950 border border-green-500/30 rounded-lg p-4 space-y-3">
                        <div className="flex items-center gap-2 text-green-400 text-sm font-medium">
                            ✓ JSON válido - Vista previa
                        </div>
                        <div className="grid grid-cols-3 gap-4 text-sm">
                            <div>
                                <span className="text-gray-500">Proveedor:</span>
                                <span className="text-white ml-2 font-medium">{p.proveedor}</span>
                            </div>
                            <div>
                                <span className="text-gray-500">Items:</span>
                                <span className="text-blue-400 ml-2 font-medium">{p.items.length}</span>
                            </div>
                            <div>
                                <span className="text-gray-500">Total:</span>
                                <span className="text-amber-400 ml-2 font-bold">S/. {total.toFixed(2)}</span>
                            </div>
                        </div>
                    </div>
                );
            }
            case 'movimiento': {
                const p = preview as PreviewMovimiento;
                return (
                    <div className="bg-gray-950 border border-green-500/30 rounded-lg p-4 space-y-3">
                        <div className="flex items-center gap-2 text-green-400 text-sm font-medium">
                            ✓ JSON válido - Vista previa
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                                <span className="text-gray-500">Tipo:</span>
                                <span className="text-white ml-2 font-medium capitalize">{p.tipo}</span>
                            </div>
                            <div>
                                <span className="text-gray-500">Costo:</span>
                                <span className="text-green-400 ml-2 font-bold">S/. {p.costo.toFixed(2)}</span>
                            </div>
                            <div>
                                <span className="text-gray-500">Origen:</span>
                                <span className="text-white ml-2">{p.origen || '-'}</span>
                            </div>
                            <div>
                                <span className="text-gray-500">Destino:</span>
                                <span className="text-white ml-2">{p.destino || '-'}</span>
                            </div>
                        </div>
                    </div>
                );
            }
            case 'pago': {
                const p = preview as PreviewPago;
                return (
                    <div className="bg-gray-950 border border-green-500/30 rounded-lg p-4 space-y-3">
                        <div className="flex items-center gap-2 text-green-400 text-sm font-medium">
                            ✓ JSON válido - Vista previa
                        </div>
                        <div className="grid grid-cols-3 gap-4 text-sm">
                            <div>
                                <span className="text-gray-500">Proveedor:</span>
                                <span className="text-white ml-2 font-medium">{p.proveedor}</span>
                            </div>
                            <div>
                                <span className="text-gray-500">Tipo:</span>
                                <span className="text-purple-400 ml-2 font-medium capitalize">{p.tipo}</span>
                            </div>
                            <div>
                                <span className="text-gray-500">Monto:</span>
                                <span className="text-amber-400 ml-2 font-bold">S/. {p.monto.toFixed(2)}</span>
                            </div>
                        </div>
                    </div>
                );
            }
        }
    };

    return createPortal(
        <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-4"
            onClick={(e) => e.target === e.currentTarget && handleClose()}
        >
            <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-800">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setTipoSeleccionado(null)}
                            className="w-8 h-8 rounded-lg bg-gray-800 hover:bg-gray-700 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
                        >
                            ←
                        </button>
                        <div>
                            <h2 className="text-xl font-bold text-white flex items-center gap-3">
                                <span className="text-2xl">{tipoInfo.icon}</span>
                                Importar {tipoInfo.nombre}
                            </h2>
                            <p className="text-gray-400 text-sm mt-1">{tipoInfo.descripcion}</p>
                        </div>
                    </div>
                    <button
                        onClick={handleClose}
                        className="w-10 h-10 rounded-full hover:bg-gray-800 flex items-center justify-center text-gray-500 hover:text-white transition-colors"
                    >
                        ✕
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    {/* Botones de ejemplo */}
                    {ejemplos.length > 0 && (
                        <div className="flex gap-2 flex-wrap">
                            {ejemplos.map((ej) => (
                                <button
                                    key={ej.id}
                                    onClick={() => setShowEjemplo(showEjemplo === ej.id ? null : ej.id)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                                        showEjemplo === ej.id
                                            ? 'bg-cyan-600 text-white'
                                            : 'bg-gray-800 text-gray-400 hover:text-white'
                                    }`}
                                >
                                    Ver ejemplo: {ej.nombre}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Ejemplo */}
                    {showEjemplo && (
                        <div className="bg-gray-950 border border-gray-700 rounded-lg p-4">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-xs text-gray-500 uppercase tracking-wider">
                                    Ejemplo: {ejemplos.find(e => e.id === showEjemplo)?.nombre}
                                </span>
                                <button
                                    onClick={() => {
                                        const ejemplo = ejemplos.find(e => e.id === showEjemplo);
                                        if (ejemplo) {
                                            setJsonInput(ejemplo.json);
                                            handleInputChange(ejemplo.json);
                                        }
                                        setShowEjemplo(null);
                                    }}
                                    className="text-xs text-cyan-400 hover:text-cyan-300"
                                >
                                    Usar este ejemplo
                                </button>
                            </div>
                            <pre className="text-xs text-gray-400 overflow-x-auto whitespace-pre-wrap">
                                {ejemplos.find(e => e.id === showEjemplo)?.json}
                            </pre>
                        </div>
                    )}

                    {/* Input de JSON */}
                    <div className="space-y-2">
                        <label className="text-sm text-gray-400 font-medium">
                            Pega tu JSON aquí:
                        </label>
                        <textarea
                            value={jsonInput}
                            onChange={(e) => handleInputChange(e.target.value)}
                            placeholder={`Pega el JSON de ${tipoInfo.nombre.toLowerCase()} aquí...`}
                            className="w-full h-64 bg-gray-950 border border-gray-700 rounded-lg p-4 text-white font-mono text-sm focus:border-cyan-500 outline-none resize-none"
                            spellCheck={false}
                        />
                    </div>

                    {/* Error */}
                    {error && (
                        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-red-400 text-sm">
                            {error}
                        </div>
                    )}

                    {/* Preview */}
                    {renderPreview()}
                </div>

                {/* Footer */}
                <div className="flex gap-3 p-6 border-t border-gray-800">
                    <button
                        onClick={handleClose}
                        className="flex-1 py-3 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg font-medium transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={isSubmitting || !preview}
                        className={`flex-1 py-3 bg-gradient-to-r ${tipoInfo.color} hover:opacity-90 disabled:from-gray-700 disabled:to-gray-700 disabled:text-gray-500 text-white rounded-lg font-bold transition-all flex items-center justify-center gap-2`}
                    >
                        {isSubmitting ? (
                            <span className="animate-spin">...</span>
                        ) : (
                            <>
                                <span>{tipoInfo.icon}</span>
                                <span>Importar {tipoInfo.nombre}</span>
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}
