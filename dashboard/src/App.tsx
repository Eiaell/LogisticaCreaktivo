import { useState, useEffect } from 'react';
import { DataLoader } from './components/DataLoader';
import { KPICards } from './components/KPICards';
import { ProcessGraph } from './components/ProcessGraph';
import { PedidosTable } from './components/PedidosTable';
import { NuevoClienteModal } from './components/NuevoClienteModal';
import { NuevoProveedorModal } from './components/NuevoProveedorModal';
import { NuevoRequerimientoModal, type TipoRequerimiento } from './components/NuevoRequerimientoModal';
import { NuevoPedidoModal } from './components/NuevoPedidoModal';
import { Sidebar } from './components/Sidebar';
import { AppSidebar } from './components/AppSidebar';
import { ClientesPage } from './components/ClientesPage';
import { ClienteFichaPage } from './components/ClienteFichaPage';
import { ProveedoresPage } from './components/ProveedoresPage';
import { ProveedorFichaPage } from './components/ProveedorFichaPage';
import { CatalogoItemsPage } from './components/CatalogoItemsPage';
import { CotizacionesPage } from './components/CotizacionesPage';
import { DiaADiaPage } from './components/DiaADiaPage';
import PKLPage from './components/PKLPage';
import { ActividadReciente } from './components/ActividadReciente';
import { useDatabase, DatabaseProvider } from './context/DatabaseContext';
import { ThemeProvider } from './context/ThemeContext';
import { useAutoBackup } from './hooks/useAutoBackup';

type PageView = 'dashboard' | 'clientes' | 'cliente_ficha' | 'proveedores' | 'proveedor_ficha' | 'catalogo_items' | 'cotizaciones' | 'dia_a_dia' | 'pkl';

interface DashboardProps {
  onNavigate: (page: PageView) => void;
  onNuevoRequerimiento: () => void;
}

// Re-export PageView for child components
export type { PageView };

function Dashboard({ onNavigate, onNuevoRequerimiento }: DashboardProps) {
  const { pedidos, clientes, proveedores, loadDatabase } = useDatabase();
  const { createBackup } = useAutoBackup();
  const [activeSidebar, setActiveSidebar] = useState<'shortcuts' | 'alerts' | 'recent_orders'>('shortcuts');
  const [modalType, setModalType] = useState<'cliente' | 'proveedor' | 'nuevo_cliente' | 'nuevo_proveedor' | null>(null);

  const handleCardClick = (title: string) => {
    let nextState: typeof activeSidebar = 'shortcuts';
    if (title === 'Alertas') nextState = 'alerts';
    else if (title === 'Total Pedidos') nextState = 'recent_orders';

    if (activeSidebar === nextState && nextState !== 'shortcuts') {
      setActiveSidebar('shortcuts');
    } else if (nextState !== 'shortcuts') {
      setActiveSidebar(nextState);
    }
  };

  const handleNewEntity = (type: 'cliente' | 'proveedor') => {
    if (type === 'cliente') {
      setModalType('nuevo_cliente');
    } else if (type === 'proveedor') {
      setModalType('nuevo_proveedor');
    }
  };

  const recentOrders = pedidos
    .slice()
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);

  return (
    <div className="min-h-screen p-6">
      {/* Header */}
      <header className="flex items-center mb-8">
        {/* Título - con margen izquierdo para no taparse con sidebar */}
        <div className="flex-shrink-0">
          <p className="text-lg font-bold tracking-widest uppercase">
            <span className="text-orange-500">I</span><span className="text-blue-800">NTELIGENCIA</span>
          </p>
          <h1 className="text-4xl font-black tracking-wider">
            <span className="text-orange-500">L</span><span className="text-blue-800">OGÍSTICA</span>
          </h1>
        </div>

        {/* Logo Creaktivo - centrado entre título y botones */}
        <div className="flex-1 flex justify-center items-center">
          <img
            src="/logo-creaktivo.png"
            alt="Creaktivo"
            className="h-20 max-w-md w-full object-contain"
          />
        </div>
        <div className="flex gap-3 relative">
          <input
            type="file"
            id="header-file-upload"
            multiple
            className="hidden"
            onChange={(e) => {
              if (e.target.files) {
                loadDatabase(e.target.files);
              }
            }}
            accept=".json,.jsonl,.db"
          />

          {/* Botones de navegación elegantes */}
          <button
            onClick={() => onNavigate('clientes')}
            className="group px-4 py-2 bg-gradient-to-r from-blue-600/20 to-cyan-600/20 border border-blue-500/30 rounded-xl text-blue-300 hover:from-blue-600/40 hover:to-cyan-600/40 hover:border-blue-400/50 hover:text-white transition-all flex items-center gap-2"
          >
            <span className="text-lg group-hover:scale-110 transition-transform">👥</span>
            <span className="font-medium">Clientes</span>
            <span className="text-xs bg-blue-500/30 px-2 py-0.5 rounded-full">{Object.keys(clientes).length}</span>
          </button>
          <button
            onClick={() => onNavigate('proveedores')}
            className="group px-4 py-2 bg-gradient-to-r from-emerald-600/20 to-teal-600/20 border border-emerald-500/30 rounded-xl text-emerald-300 hover:from-emerald-600/40 hover:to-teal-600/40 hover:border-emerald-400/50 hover:text-white transition-all flex items-center gap-2"
          >
            <span className="text-lg group-hover:scale-110 transition-transform">🏭</span>
            <span className="font-medium">Proveedores</span>
            <span className="text-xs bg-emerald-500/30 px-2 py-0.5 rounded-full">{Object.keys(proveedores).length}</span>
          </button>
          <button
            onClick={() => onNavigate('catalogo_items')}
            className="group px-4 py-2 bg-gradient-to-r from-purple-600/20 to-pink-600/20 border border-purple-500/30 rounded-xl text-purple-300 hover:from-purple-600/40 hover:to-pink-600/40 hover:border-purple-400/50 hover:text-white transition-all flex items-center gap-2"
          >
            <span className="text-lg group-hover:scale-110 transition-transform">📦</span>
            <span className="font-medium">Catálogo</span>
          </button>
          <button
            onClick={() => onNavigate('cotizaciones')}
            className="group px-4 py-2 bg-gradient-to-r from-yellow-600/20 to-orange-600/20 border border-yellow-500/30 rounded-xl text-yellow-300 hover:from-yellow-600/40 hover:to-orange-600/40 hover:border-yellow-400/50 hover:text-white transition-all flex items-center gap-2"
          >
            <span className="text-lg group-hover:scale-110 transition-transform">💰</span>
            <span className="font-medium">Cotizaciones</span>
          </button>
          <button
            onClick={() => onNavigate('pkl')}
            className="group px-4 py-2 bg-gradient-to-r from-cyan-600/20 to-blue-600/20 border border-cyan-500/30 rounded-xl text-cyan-300 hover:from-cyan-600/40 hover:to-blue-600/40 hover:border-cyan-400/50 hover:text-white transition-all flex items-center gap-2"
          >
            <span className="text-lg group-hover:scale-110 transition-transform">📋</span>
            <span className="font-medium">PKL</span>
            <span className="text-xs bg-cyan-500/30 px-2 py-0.5 rounded-full">3</span>
          </button>

          <div className="w-px bg-gray-700 mx-1"></div>

          <button
            onClick={() => createBackup()}
            className="px-4 py-2 bg-green-600 border border-green-500 rounded-lg text-white hover:bg-green-500 transition-colors flex items-center gap-2 shadow-lg shadow-green-900/40 font-medium"
            title="Descargar backup completo"
          >
            <span>💾</span> Backup
          </button>
          <button
            onClick={() => document.getElementById('header-file-upload')?.click()}
            className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-300 hover:text-white hover:border-gray-600 transition-colors flex items-center gap-2"
          >
            <span>📂</span> Cargar
          </button>
        </div>
      </header>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Column: KPIs & Graph */}
        <div className="lg:col-span-4 xl:col-span-3 space-y-6">
          <KPICards onCardClick={handleCardClick} />
          <ProcessGraph />
        </div>

        {/* Right/Bottom Column: Dynamic Sidebar */}
        <div className="lg:col-span-4 xl:col-span-1 xl:col-start-4">
          <Sidebar
            activeSidebar={activeSidebar}
            setActiveSidebar={setActiveSidebar}
            onNewEntity={handleNewEntity}
            onNuevoRequerimiento={onNuevoRequerimiento}
            recentOrders={recentOrders}
            clientes={clientes}
          />
        </div>

        {/* Full Width Table */}
        <div className="col-span-1 lg:col-span-4">
          <PedidosTable />
        </div>

        {/* Actividad Reciente - Día a Día */}
        <div className="col-span-1 lg:col-span-4">
          <ActividadReciente
            onVerDiaADia={() => onNavigate('dia_a_dia')}
            maxItems={15}
          />
        </div>
      </div>

      {modalType === 'nuevo_cliente' && <NuevoClienteModal isOpen={true} onClose={() => setModalType(null)} />}
      {modalType === 'nuevo_proveedor' && <NuevoProveedorModal isOpen={true} onClose={() => setModalType(null)} />}
    </div>
  );
}

function AppContent() {
  const { db, events, isLoading, clientes, pedidos, dataSource } = useDatabase();
  const [currentPage, setCurrentPage] = useState<PageView>('dashboard');
  const [selectedClienteRazonSocial, setSelectedClienteRazonSocial] = useState<string | null>(null);
  const [selectedProveedorId, setSelectedProveedorId] = useState<string | null>(null);

  // Estado de la sidebar con persistencia en localStorage
  const [sidebarExpanded, setSidebarExpanded] = useState(() => {
    const saved = localStorage.getItem('sidebar-expanded');
    return saved !== null ? JSON.parse(saved) : false; // Colapsada por defecto
  });

  // Estado para pedido activo seleccionado
  const [activePedidoId, setActivePedidoId] = useState<string | null>(null);

  // Estado para modales de requerimiento
  const [showRequerimientoModal, setShowRequerimientoModal] = useState(false);
  const [tipoRequerimiento, setTipoRequerimiento] = useState<TipoRequerimiento | null>(null);

  // Persistir estado de sidebar
  useEffect(() => {
    localStorage.setItem('sidebar-expanded', JSON.stringify(sidebarExpanded));
  }, [sidebarExpanded]);

  const handleSelectRequerimiento = (tipo: TipoRequerimiento) => {
    setShowRequerimientoModal(false);
    setTipoRequerimiento(tipo);
  };

  const handleCloseRequerimientoFlow = () => {
    setTipoRequerimiento(null);
  };

  const handleSelectPedido = (pedidoId: string) => {
    setActivePedidoId(pedidoId);
    // Aquí podrías navegar a una vista de detalle del pedido
    // Por ahora solo lo marcamos como activo
    console.log('Pedido seleccionado:', pedidoId);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--bg-primary)' }}>
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2" style={{ borderColor: 'var(--accent-cyan)' }}></div>
          <p className="font-mono text-xs animate-pulse" style={{ color: 'var(--accent-cyan)' }}>Sincronizando con la nube...</p>
        </div>
      </div>
    );
  }

  const hasData = dataSource === 'supabase' || db || events.length > 0 || Object.keys(clientes).length > 0 || pedidos.length > 0;
  if (!hasData) return <DataLoader />;

  // Función para renderizar el contenido principal
  const renderMainContent = () => {
    switch (currentPage) {
      case 'clientes':
        return (
          <ClientesPage
            onBack={() => setCurrentPage('dashboard')}
            onSelectCliente={(razonSocial) => {
              setSelectedClienteRazonSocial(razonSocial);
              setCurrentPage('cliente_ficha');
            }}
          />
        );
      case 'cliente_ficha':
        return selectedClienteRazonSocial ? (
          <ClienteFichaPage
            razonSocial={selectedClienteRazonSocial}
            onBack={() => setCurrentPage('clientes')}
          />
        ) : (
          <ClientesPage
            onBack={() => setCurrentPage('dashboard')}
            onSelectCliente={(razonSocial) => {
              setSelectedClienteRazonSocial(razonSocial);
              setCurrentPage('cliente_ficha');
            }}
          />
        );
      case 'proveedores':
        return <ProveedoresPage
          onBack={() => setCurrentPage('dashboard')}
          onSelectProveedor={(proveedorId) => {
            setSelectedProveedorId(proveedorId);
            setCurrentPage('proveedor_ficha');
          }}
        />;
      case 'proveedor_ficha':
        return selectedProveedorId ? (
          <ProveedorFichaPage
            proveedorId={selectedProveedorId}
            onBack={() => setCurrentPage('proveedores')}
          />
        ) : (
          <ProveedoresPage
            onBack={() => setCurrentPage('dashboard')}
            onSelectProveedor={(proveedorId) => {
              setSelectedProveedorId(proveedorId);
              setCurrentPage('proveedor_ficha');
            }}
          />
        );
      case 'catalogo_items':
        return (
          <CatalogoItemsPage onBack={() => setCurrentPage('dashboard')} />
        );
      case 'cotizaciones':
        return (
          <CotizacionesPage onBack={() => setCurrentPage('dashboard')} />
        );
      case 'dia_a_dia':
        return (
          <DiaADiaPage onBack={() => setCurrentPage('dashboard')} />
        );
      case 'pkl':
        return (
          <PKLPage />
        );
      default:
        return (
          <Dashboard
            onNavigate={setCurrentPage}
            onNuevoRequerimiento={() => setShowRequerimientoModal(true)}
          />
        );
    }
  };

  return (
    <div className="flex min-h-screen" style={{ backgroundColor: 'var(--bg-primary)' }}>
      {/* Sidebar Izquierda - Estilo ChatGPT */}
      <AppSidebar
        isExpanded={sidebarExpanded}
        onToggle={() => setSidebarExpanded(!sidebarExpanded)}
        pedidos={pedidos}
        clientes={clientes}
        activePedidoId={activePedidoId}
        onSelectPedido={handleSelectPedido}
        onNuevoRequerimiento={() => setShowRequerimientoModal(true)}
        onNavigate={setCurrentPage}
        currentPage={currentPage}
      />

      {/* Contenido Principal con margen para la sidebar */}
      <main
        className="flex-1 transition-all duration-300 ease-in-out"
        style={{ marginLeft: sidebarExpanded ? '320px' : '80px' }}
      >
        {renderMainContent()}
      </main>

      {/* Modal de Nuevo Requerimiento Logístico */}
      <NuevoRequerimientoModal
        isOpen={showRequerimientoModal}
        onClose={() => setShowRequerimientoModal(false)}
        onSelect={handleSelectRequerimiento}
      />

      {/* Modales específicos según tipo de requerimiento */}
      {tipoRequerimiento === 'cotizacion' && (
        <NuevoPedidoModal
          isOpen={true}
          onClose={handleCloseRequerimientoFlow}
        />
      )}

      {tipoRequerimiento === 'produccion' && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-blue-500 rounded-2xl p-8 max-w-md text-center">
            <span className="text-6xl mb-4 block">🏭</span>
            <h2 className="text-2xl font-bold text-blue-400 mb-2">PRODUCCIÓN</h2>
            <p className="text-gray-400 mb-6">Próximamente: Formulario para registrar acuerdos de producción con proveedores</p>
            <button onClick={handleCloseRequerimientoFlow} className="px-6 py-3 bg-blue-600 hover:bg-blue-500 rounded-lg text-white font-bold">
              Cerrar
            </button>
          </div>
        </div>
      )}

      {tipoRequerimiento === 'movimiento' && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-emerald-500 rounded-2xl p-8 max-w-md text-center">
            <span className="text-6xl mb-4 block">🚚</span>
            <h2 className="text-2xl font-bold text-emerald-400 mb-2">MOVIENDO / COMPRANDO / RECOGIENDO</h2>
            <p className="text-gray-400 mb-6">Próximamente: Formulario para registrar movimientos de movilidad y compras</p>
            <button onClick={handleCloseRequerimientoFlow} className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-white font-bold">
              Cerrar
            </button>
          </div>
        </div>
      )}

      {tipoRequerimiento === 'pago' && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-purple-500 rounded-2xl p-8 max-w-md text-center">
            <span className="text-6xl mb-4 block">💰</span>
            <h2 className="text-2xl font-bold text-purple-400 mb-2">PAGANDO / RINDIENDO</h2>
            <p className="text-gray-400 mb-6">Próximamente: Formulario para registrar gastos y rendiciones</p>
            <button onClick={handleCloseRequerimientoFlow} className="px-6 py-3 bg-purple-600 hover:bg-purple-500 rounded-lg text-white font-bold">
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <DatabaseProvider>
        <AppContent />
      </DatabaseProvider>
    </ThemeProvider>
  );
}
