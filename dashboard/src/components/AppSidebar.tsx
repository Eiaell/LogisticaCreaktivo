import { useState, useEffect, useRef } from 'react';
import type { Pedido, Cliente } from '../types';
import { ImportarJSONModal } from './ImportarJSONModal';

interface AppSidebarProps {
    isExpanded: boolean;
    onToggle: () => void;
    pedidos: Pedido[];
    clientes: Record<string, Cliente>;
    activePedidoId: string | null;
    onSelectPedido: (pedidoId: string) => void;
    onNuevoRequerimiento: () => void;
    onNavigate: (page: 'dashboard' | 'clientes' | 'proveedores' | 'catalogo_items' | 'cotizaciones') => void;
    currentPage: string;
}

// Iconos SVG inline para mejor control
const IconHome = () => (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
);

const IconDocument = () => (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
);

const IconPlus = () => (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
);

const IconChevronLeft = () => (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
    </svg>
);

const IconMoreVertical = () => (
    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
        <circle cx="12" cy="5" r="1.5" />
        <circle cx="12" cy="12" r="1.5" />
        <circle cx="12" cy="19" r="1.5" />
    </svg>
);

// Función para agrupar pedidos por fecha
function groupPedidosByDate(pedidos: Pedido[]): Record<string, Pedido[]> {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const lastWeek = new Date(today);
    lastWeek.setDate(lastWeek.getDate() - 7);

    const groups: Record<string, Pedido[]> = {
        'Hoy': [],
        'Ayer': [],
        'Últimos 7 días': [],
        'Anteriores': []
    };

    // Ordenar por fecha de creación (más reciente primero)
    const sorted = [...pedidos].sort((a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    sorted.forEach(pedido => {
        const pedidoDate = new Date(pedido.created_at);
        const pedidoDay = new Date(pedidoDate.getFullYear(), pedidoDate.getMonth(), pedidoDate.getDate());

        if (pedidoDay.getTime() === today.getTime()) {
            groups['Hoy'].push(pedido);
        } else if (pedidoDay.getTime() === yesterday.getTime()) {
            groups['Ayer'].push(pedido);
        } else if (pedidoDay >= lastWeek) {
            groups['Últimos 7 días'].push(pedido);
        } else {
            groups['Anteriores'].push(pedido);
        }
    });

    return groups;
}

// Función para generar título corto del pedido
function getPedidoTitle(pedido: Pedido): string {
    if (pedido.descripcion) {
        // Tomar las primeras palabras hasta 30 caracteres
        const words = pedido.descripcion.split(' ');
        let title = '';
        for (const word of words) {
            if ((title + ' ' + word).length > 30) break;
            title += (title ? ' ' : '') + word;
        }
        return title || pedido.descripcion.substring(0, 30);
    }
    return `Pedido ${pedido.id.substring(0, 8)}`;
}

// Colores por estado
const ESTADO_COLORS: Record<string, string> = {
    'cotizacion': 'bg-yellow-500',
    'aprobado': 'bg-green-500',
    'aprobado_pendiente_cambios': 'bg-orange-500',
    'en_produccion': 'bg-blue-500',
    'listo': 'bg-purple-500',
    'entregado': 'bg-emerald-500',
    'cerrado': 'bg-gray-500'
};

interface ContextMenuProps {
    x: number;
    y: number;
    pedido: Pedido;
    onClose: () => void;
    onAction: (action: string, pedido: Pedido) => void;
}

function ContextMenu({ x, y, pedido, onClose, onAction }: ContextMenuProps) {
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                onClose();
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [onClose]);

    const menuItems = [
        { action: 'open', label: 'Abrir requerimiento', icon: '📂' },
        { action: 'rename', label: 'Renombrar', icon: '✏️' },
        { action: 'duplicate', label: 'Duplicar', icon: '📋' },
        { action: 'archive', label: 'Archivar', icon: '📁' },
        { action: 'delete', label: 'Eliminar', icon: '🗑️', danger: true },
    ];

    return (
        <div
            ref={menuRef}
            className="fixed bg-gray-800 border border-gray-700 rounded-lg shadow-xl py-1 z-[9999] min-w-[180px]"
            style={{ left: x, top: y }}
        >
            {menuItems.map((item, index) => (
                <button
                    key={item.action}
                    onClick={() => {
                        onAction(item.action, pedido);
                        onClose();
                    }}
                    className={`w-full px-4 py-2 text-left text-sm flex items-center gap-3 transition-colors ${
                        item.danger
                            ? 'text-red-400 hover:bg-red-500/20'
                            : 'text-gray-300 hover:bg-gray-700'
                    } ${index === menuItems.length - 1 ? 'border-t border-gray-700 mt-1 pt-2' : ''}`}
                >
                    <span>{item.icon}</span>
                    {item.label}
                </button>
            ))}
        </div>
    );
}

export function AppSidebar({
    isExpanded,
    onToggle,
    pedidos,
    clientes,
    activePedidoId,
    onSelectPedido,
    onNuevoRequerimiento,
    onNavigate,
    currentPage
}: AppSidebarProps) {
    const [contextMenu, setContextMenu] = useState<{ x: number; y: number; pedido: Pedido } | null>(null);
    const [hoveredPedidoId, setHoveredPedidoId] = useState<string | null>(null);
    const [showImportarJSON, setShowImportarJSON] = useState(false);

    const groupedPedidos = groupPedidosByDate(pedidos);

    const handleContextMenu = (e: React.MouseEvent, pedido: Pedido) => {
        e.preventDefault();
        e.stopPropagation();
        setContextMenu({ x: e.clientX, y: e.clientY, pedido });
    };

    const handleMenuAction = (action: string, pedido: Pedido) => {
        switch (action) {
            case 'open':
                onSelectPedido(pedido.id);
                break;
            case 'rename':
                // TODO: Implementar renombrar
                console.log('Renombrar:', pedido.id);
                break;
            case 'duplicate':
                // TODO: Implementar duplicar
                console.log('Duplicar:', pedido.id);
                break;
            case 'archive':
                // TODO: Implementar archivar
                console.log('Archivar:', pedido.id);
                break;
            case 'delete':
                // TODO: Implementar eliminar con confirmación
                console.log('Eliminar:', pedido.id);
                break;
        }
    };

    // Navegación items
    const navItems = [
        { id: 'dashboard', icon: <IconHome />, label: 'Dashboard', page: 'dashboard' as const },
        { id: 'requerimientos', icon: <IconDocument />, label: 'Requerimientos', page: 'dashboard' as const },
    ];

    return (
        <>
            <aside
                className={`fixed left-0 top-0 h-full bg-gray-950 border-r border-gray-800 z-50 flex flex-col transition-all duration-300 ease-in-out ${
                    isExpanded ? 'w-72' : 'w-16'
                }`}
            >
                {/* Header con Logo */}
                <div className={`flex items-center border-b border-gray-800 ${isExpanded ? 'p-4' : 'py-4 justify-center'}`}>
                    <button
                        onClick={onToggle}
                        className="flex items-center gap-3 hover:opacity-80 transition-opacity"
                        title={isExpanded ? 'Colapsar sidebar' : 'Expandir sidebar'}
                    >
                        <img
                            src="/logo-creaktivo-icon.png"
                            alt="Creaktivo"
                            className={`object-contain transition-all duration-300 ${isExpanded ? 'h-10 w-10' : 'h-8 w-8'}`}
                        />
                        {isExpanded && (
                            <div className="flex-1">
                                <p className="text-xs font-bold text-gray-400 tracking-wider">INTELIGENCIA</p>
                                <p className="text-sm font-black">
                                    <span className="text-orange-500">L</span>
                                    <span className="text-blue-800">OGÍSTICA</span>
                                </p>
                            </div>
                        )}
                    </button>
                    {isExpanded && (
                        <button
                            onClick={onToggle}
                            className="ml-auto p-1.5 rounded-lg hover:bg-gray-800 text-gray-500 hover:text-white transition-colors"
                        >
                            <IconChevronLeft />
                        </button>
                    )}
                </div>

                {/* Navegación Principal */}
                <div
                    className={`flex flex-col ${isExpanded ? 'gap-2 p-4 mt-4' : 'gap-5 px-3'}`}
                    style={{ paddingTop: isExpanded ? undefined : '50px' }}
                >
                    {navItems.map(item => (
                        <button
                            key={item.id}
                            onClick={() => onNavigate(item.page)}
                            className={`group relative flex items-center gap-3 rounded-xl transition-colors ${
                                isExpanded ? 'px-4 py-3' : 'p-3 justify-center'
                            } ${
                                currentPage === item.page
                                    ? 'bg-gray-800 text-white'
                                    : 'text-gray-400 hover:bg-gray-800/50 hover:text-white'
                            }`}
                            title={!isExpanded ? item.label : undefined}
                        >
                            <span className={isExpanded ? '' : 'text-xl'}>{item.icon}</span>
                            {isExpanded && <span className="text-sm font-medium">{item.label}</span>}

                            {/* Tooltip para estado colapsado */}
                            {!isExpanded && (
                                <div className="absolute left-full ml-3 px-3 py-1.5 bg-gray-800 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50 shadow-lg">
                                    {item.label}
                                </div>
                            )}
                        </button>
                    ))}

                    {/* Botón Importar JSON (el +) */}
                    <button
                        onClick={() => setShowImportarJSON(true)}
                        className={`group relative flex items-center gap-3 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 text-white font-medium transition-all hover:from-orange-400 hover:to-amber-400 shadow-lg shadow-orange-500/20 ${
                            isExpanded ? 'px-4 py-3 mt-3' : 'p-3 justify-center mt-4'
                        }`}
                        title={!isExpanded ? 'Importar JSON' : undefined}
                    >
                        <span className={isExpanded ? '' : 'text-xl'}><IconPlus /></span>
                        {isExpanded && <span className="text-sm">Importar JSON</span>}

                        {/* Tooltip para estado colapsado */}
                        {!isExpanded && (
                            <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
                                Importar JSON
                            </div>
                        )}
                    </button>
                </div>

                {/* Historial de Requerimientos (solo expandido) */}
                {isExpanded && (
                    <div className="flex-1 overflow-y-auto border-t border-gray-800">
                        <div className="p-3">
                            <p className="text-xs text-gray-500 uppercase tracking-wider font-bold mb-3 px-1">
                                Historial
                            </p>

                            {Object.entries(groupedPedidos).map(([group, items]) => {
                                if (items.length === 0) return null;

                                return (
                                    <div key={group} className="mb-4">
                                        <p className="text-xs text-gray-600 font-medium mb-2 px-1">{group}</p>
                                        <div className="space-y-0.5">
                                            {items.map(pedido => {
                                                const cliente = clientes[pedido.cliente];
                                                const isActive = activePedidoId === pedido.id;
                                                const isHovered = hoveredPedidoId === pedido.id;

                                                return (
                                                    <div
                                                        key={pedido.id}
                                                        className={`group relative flex items-center gap-2 px-2 py-2 rounded-lg cursor-pointer transition-colors ${
                                                            isActive
                                                                ? 'bg-gray-800 text-white'
                                                                : 'text-gray-400 hover:bg-gray-800/50 hover:text-gray-200'
                                                        }`}
                                                        onClick={() => onSelectPedido(pedido.id)}
                                                        onContextMenu={(e) => handleContextMenu(e, pedido)}
                                                        onMouseEnter={() => setHoveredPedidoId(pedido.id)}
                                                        onMouseLeave={() => setHoveredPedidoId(null)}
                                                    >
                                                        {/* Indicador de estado */}
                                                        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${ESTADO_COLORS[pedido.estado] || 'bg-gray-500'}`} />

                                                        {/* Contenido */}
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-sm truncate font-medium">
                                                                {getPedidoTitle(pedido)}
                                                            </p>
                                                            <p className="text-xs text-gray-500 truncate">
                                                                {cliente?.nombre_comercial || pedido.cliente || 'Sin cliente'}
                                                            </p>
                                                        </div>

                                                        {/* Botón de tres puntos */}
                                                        {(isHovered || isActive) && (
                                                            <button
                                                                onClick={(e) => handleContextMenu(e, pedido)}
                                                                className="p-1 rounded hover:bg-gray-700 text-gray-500 hover:text-white transition-colors flex-shrink-0"
                                                            >
                                                                <IconMoreVertical />
                                                            </button>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })}

                            {pedidos.length === 0 && (
                                <div className="text-center py-8">
                                    <p className="text-gray-600 text-sm">No hay requerimientos</p>
                                    <button
                                        onClick={onNuevoRequerimiento}
                                        className="mt-2 text-orange-500 hover:text-orange-400 text-sm font-medium"
                                    >
                                        + Crear el primero
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Footer colapsado - mostrar indicador de cantidad */}
                {!isExpanded && pedidos.length > 0 && (
                    <div className="mt-auto p-2 border-t border-gray-800">
                        <div className="flex flex-col items-center gap-1 text-gray-500">
                            <IconDocument />
                            <span className="text-xs font-bold">{pedidos.length}</span>
                        </div>
                    </div>
                )}
            </aside>

            {/* Context Menu */}
            {contextMenu && (
                <ContextMenu
                    x={contextMenu.x}
                    y={contextMenu.y}
                    pedido={contextMenu.pedido}
                    onClose={() => setContextMenu(null)}
                    onAction={handleMenuAction}
                />
            )}

            {/* Modal Importar JSON */}
            <ImportarJSONModal
                isOpen={showImportarJSON}
                onClose={() => setShowImportarJSON(false)}
            />
        </>
    );
}
