import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useDatabase } from '../context/DatabaseContext';

interface Props {
    isOpen: boolean;
    onClose: () => void;
}

// Estructura del JSON que el usuario puede pegar
interface JSONRequerimiento {
    cliente: string;
    vendedora?: string;
    rq_numero?: string;
    estado?: 'cotizacion' | 'aprobado' | 'en_produccion';
    fecha_compromiso?: string;
    descripcion?: string;
    // Formato simple: array de líneas
    lineas?: Array<{
        item: string;
        detalle: string;
        cantidad?: number;
        precio?: number;
    }>;
    // Formato alternativo: bloques con items (como el ejemplo del usuario)
    bloques?: Array<{
        bloque_id?: string;
        nombre: string;
        items: Array<{
            item_id?: number;
            descripcion: string;
            cantidad: number;
            observaciones_logisticas?: string;
            precio?: number;
        }>;
    }>;
    // Datos generales opcionales (formato extendido)
    datos_generales?: {
        cliente: string;
        asunto?: string;
        tipo_requerimiento?: string;
        estado_actual?: string;
    };
}

const EJEMPLO_JSON = `{
  "cliente": "TOURING",
  "vendedora": "Angélica",
  "rq_numero": "TOURING-MERCH-2026",
  "estado": "cotizacion",
  "lineas": [
    {
      "item": "LAPICEROS",
      "detalle": "250 UNIDADES - PLÁSTICO, IMPRESIÓN 1 CARA",
      "precio": 0
    },
    {
      "item": "LANYARDS",
      "detalle": "250 UNIDADES - 2.5CM, SUBLIMADO, CON TIPTOP",
      "precio": 0
    }
  ]
}`;

const EJEMPLO_JSON_BLOQUES = `{
  "cliente": "TOURING",
  "rq_numero": "TOURING-MERCH-2026",
  "bloques": [
    {
      "nombre": "Merch Básico",
      "items": [
        { "descripcion": "Lapiceros", "cantidad": 250, "observaciones_logisticas": "Plástico, impresión 1 cara" },
        { "descripcion": "Lanyards", "cantidad": 250, "observaciones_logisticas": "2.5cm, sublimado, tiptop" }
      ]
    }
  ]
}`;

export function ImportarJSONModal({ isOpen, onClose }: Props) {
    const { createPedido, createLineaPedido } = useDatabase();
    const [jsonInput, setJsonInput] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [preview, setPreview] = useState<{ cliente: string; lineas: Array<{ item: string; detalle: string }> } | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showEjemplo, setShowEjemplo] = useState<'simple' | 'bloques' | null>(null);

    const parseJSON = (input: string) => {
        try {
            const data: JSONRequerimiento = JSON.parse(input);

            // Extraer cliente
            let cliente = data.cliente || data.datos_generales?.cliente || '';
            cliente = cliente.toUpperCase();

            // Extraer líneas
            const lineas: Array<{ item: string; detalle: string; precio: number }> = [];

            // Formato 1: Líneas directas
            if (data.lineas && data.lineas.length > 0) {
                for (const linea of data.lineas) {
                    lineas.push({
                        item: linea.item.toUpperCase(),
                        detalle: linea.cantidad
                            ? `${linea.cantidad} UNIDADES - ${linea.detalle}`.toUpperCase()
                            : linea.detalle.toUpperCase(),
                        precio: linea.precio || 0
                    });
                }
            }

            // Formato 2: Bloques con items
            if (data.bloques && data.bloques.length > 0) {
                for (const bloque of data.bloques) {
                    for (const item of bloque.items) {
                        const detallePartes = [];
                        if (item.cantidad) detallePartes.push(`${item.cantidad} UNIDADES`);
                        if (item.observaciones_logisticas) detallePartes.push(item.observaciones_logisticas);

                        lineas.push({
                            item: item.descripcion.toUpperCase(),
                            detalle: detallePartes.join(' - ').toUpperCase() || item.descripcion.toUpperCase(),
                            precio: item.precio || 0
                        });
                    }
                }
            }

            if (lineas.length === 0) {
                throw new Error('No se encontraron líneas/items en el JSON');
            }

            setPreview({ cliente, lineas });
            setError(null);

            return {
                cliente,
                vendedora: data.vendedora || '',
                rq_numero: data.rq_numero || data.datos_generales?.asunto || '',
                estado: data.estado || 'cotizacion',
                fecha_compromiso: data.fecha_compromiso,
                lineas
            };
        } catch (err) {
            setError(err instanceof Error ? err.message : 'JSON inválido');
            setPreview(null);
            return null;
        }
    };

    const handleInputChange = (value: string) => {
        setJsonInput(value);
        if (value.trim()) {
            parseJSON(value);
        } else {
            setPreview(null);
            setError(null);
        }
    };

    const handleSubmit = async () => {
        const parsed = parseJSON(jsonInput);
        if (!parsed) return;

        setIsSubmitting(true);
        try {
            // Crear el pedido
            const descripcionResumen = parsed.lineas.slice(0, 3).map(l => l.item).join(', ') +
                (parsed.lineas.length > 3 ? ` (+${parsed.lineas.length - 3} más)` : '');

            const pedido = await createPedido({
                cliente: parsed.cliente,
                descripcion: descripcionResumen,
                vendedora: parsed.vendedora,
                estado: parsed.estado as any,
                precio: 0,
                pagado: 0,
                rq_numero: parsed.rq_numero || null,
                fecha_compromiso: parsed.fecha_compromiso ? new Date(parsed.fecha_compromiso).toISOString() : undefined,
            });

            // Crear todas las líneas
            for (const linea of parsed.lineas) {
                await createLineaPedido(pedido.id, {
                    pedido_id: pedido.id,
                    item: linea.item,
                    detalle: linea.detalle,
                    precio: linea.precio,
                } as any);
            }

            console.log(`✅ Pedido creado con ${parsed.lineas.length} líneas:`, pedido.id);

            // Limpiar y cerrar
            setJsonInput('');
            setPreview(null);
            onClose();
        } catch (err) {
            console.error('Error creando pedido:', err);
            setError('Error al crear el pedido: ' + (err instanceof Error ? err.message : 'Error desconocido'));
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    const modalContent = (
        <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-4"
            onClick={(e) => e.target === e.currentTarget && onClose()}
        >
            <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-800">
                    <div>
                        <h2 className="text-xl font-bold text-white flex items-center gap-3">
                            <span className="text-2xl">📋</span>
                            Importar Requerimiento desde JSON
                        </h2>
                        <p className="text-gray-400 text-sm mt-1">Pega un JSON con los datos del requerimiento</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-10 h-10 rounded-full hover:bg-gray-800 flex items-center justify-center text-gray-500 hover:text-white transition-colors"
                    >
                        ✕
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    {/* Botones de ejemplo */}
                    <div className="flex gap-2">
                        <button
                            onClick={() => {
                                setShowEjemplo(showEjemplo === 'simple' ? null : 'simple');
                            }}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                                showEjemplo === 'simple'
                                    ? 'bg-cyan-600 text-white'
                                    : 'bg-gray-800 text-gray-400 hover:text-white'
                            }`}
                        >
                            Ver ejemplo simple
                        </button>
                        <button
                            onClick={() => {
                                setShowEjemplo(showEjemplo === 'bloques' ? null : 'bloques');
                            }}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                                showEjemplo === 'bloques'
                                    ? 'bg-cyan-600 text-white'
                                    : 'bg-gray-800 text-gray-400 hover:text-white'
                            }`}
                        >
                            Ver ejemplo con bloques
                        </button>
                    </div>

                    {/* Ejemplo */}
                    {showEjemplo && (
                        <div className="bg-gray-950 border border-gray-700 rounded-lg p-4">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-xs text-gray-500 uppercase tracking-wider">
                                    Ejemplo {showEjemplo === 'simple' ? 'Simple' : 'con Bloques'}
                                </span>
                                <button
                                    onClick={() => {
                                        setJsonInput(showEjemplo === 'simple' ? EJEMPLO_JSON : EJEMPLO_JSON_BLOQUES);
                                        handleInputChange(showEjemplo === 'simple' ? EJEMPLO_JSON : EJEMPLO_JSON_BLOQUES);
                                        setShowEjemplo(null);
                                    }}
                                    className="text-xs text-cyan-400 hover:text-cyan-300"
                                >
                                    Usar este ejemplo
                                </button>
                            </div>
                            <pre className="text-xs text-gray-400 overflow-x-auto">
                                {showEjemplo === 'simple' ? EJEMPLO_JSON : EJEMPLO_JSON_BLOQUES}
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
                            placeholder='{"cliente": "NOMBRE", "lineas": [{"item": "PRODUCTO", "detalle": "DESCRIPCIÓN"}]}'
                            className="w-full h-64 bg-gray-950 border border-gray-700 rounded-lg p-4 text-white font-mono text-sm focus:border-cyan-500 outline-none resize-none"
                            spellCheck={false}
                        />
                    </div>

                    {/* Error */}
                    {error && (
                        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-red-400 text-sm">
                            ❌ {error}
                        </div>
                    )}

                    {/* Preview */}
                    {preview && (
                        <div className="bg-gray-950 border border-green-500/30 rounded-lg p-4 space-y-3">
                            <div className="flex items-center gap-2 text-green-400 text-sm font-medium">
                                ✓ JSON válido - Vista previa
                            </div>

                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <span className="text-gray-500">Cliente:</span>
                                    <span className="text-white ml-2 font-medium">{preview.cliente || '(Sin especificar)'}</span>
                                </div>
                                <div>
                                    <span className="text-gray-500">Líneas:</span>
                                    <span className="text-cyan-400 ml-2 font-medium">{preview.lineas.length} items</span>
                                </div>
                            </div>

                            <div className="border-t border-gray-800 pt-3 mt-3">
                                <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Items a crear:</p>
                                <div className="max-h-48 overflow-y-auto space-y-1">
                                    {preview.lineas.map((linea, idx) => (
                                        <div key={idx} className="flex items-start gap-2 text-sm py-1">
                                            <span className="text-gray-600 font-mono text-xs w-6">{idx + 1}.</span>
                                            <div>
                                                <span className="text-cyan-400 font-medium">{linea.item}</span>
                                                <span className="text-gray-500 ml-2 text-xs">{linea.detalle.substring(0, 60)}{linea.detalle.length > 60 ? '...' : ''}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex gap-3 p-6 border-t border-gray-800">
                    <button
                        onClick={onClose}
                        className="flex-1 py-3 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg font-medium transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={isSubmitting || !preview}
                        className="flex-1 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:from-gray-700 disabled:to-gray-700 disabled:text-gray-500 text-white rounded-lg font-bold transition-all flex items-center justify-center gap-2"
                    >
                        {isSubmitting ? (
                            <span className="animate-spin">⏳</span>
                        ) : (
                            <>
                                <span>Crear Requerimiento</span>
                                <span className="text-cyan-200">({preview?.lineas.length || 0} líneas)</span>
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );

    return createPortal(modalContent, document.body);
}
