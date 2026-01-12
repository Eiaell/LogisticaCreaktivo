import { useState } from 'react';
import { DataLoader } from './components/DataLoader';
import { KPICards } from './components/KPICards';
import { ProcessGraph } from './components/ProcessGraph';
import { PedidosTable } from './components/PedidosTable';
import { NuevoClienteModal } from './components/NuevoClienteModal';
import { NuevoProveedorModal } from './components/NuevoProveedorModal';
import { Sidebar } from './components/Sidebar';
import { ClientesPage } from './components/ClientesPage';
import { ClienteFichaPage } from './components/ClienteFichaPage';
import { ProveedoresPage } from './components/ProveedoresPage';
import { ProveedorFichaPage } from './components/ProveedorFichaPage';
import { CatalogoItemsPage } from './components/CatalogoItemsPage';
import { CotizacionesPage } from './components/CotizacionesPage';
import { useDatabase, DatabaseProvider } from './context/DatabaseContext';
import { useAutoBackup } from './hooks/useAutoBackup';

type PageView = 'dashboard' | 'clientes' | 'cliente_ficha' | 'proveedores' | 'proveedor_ficha' | 'catalogo_items' | 'cotizaciones';

interface DashboardProps {
  onNavigate: (page: PageView) => void;
}

function Dashboard({ onNavigate }: DashboardProps) {
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
      <header className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
            CREAKTIVO LOGISTICS
          </h1>
          <p className="text-gray-400">Panel de Inteligencia Logística</p>
        </div>
        <div className="flex gap-3 relative">
          <input
            type="file"
            id="header-file-upload"
            multiple
            className="hidden"
            onChange={(e) => {
              if (e.target.files) {
                console.log(`🔥 INPUT CHANGE: ${e.target.files.length} archivo(s) seleccionado(s)`);
                for (let i = 0; i < e.target.files.length; i++) {
                  console.log(`  ${i+1}. ${e.target.files[i].name} (${e.target.files[i].size} bytes)`);
                }
                loadDatabase(e.target.files);
              } else {
                console.warn('❌ No files selected');
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

          <div className="w-px bg-gray-700 mx-1"></div>

          <button
            onClick={() => createBackup()}
            className="px-4 py-2 bg-green-600 border border-green-500 rounded-lg text-white hover:bg-green-500 transition-colors flex items-center gap-2 shadow-lg shadow-green-900/40 font-medium"
            title="Descargar backup completo (clientes, proveedores, logos)"
          >
            <span>💾</span> Backup Manual
          </button>
          <button
            onClick={() => document.getElementById('header-file-upload')?.click()}
            className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-300 hover:text-white hover:border-gray-600 transition-colors flex items-center gap-2"
          >
            <span>📂</span> Cargar Datos
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
            recentOrders={recentOrders}
            clientes={clientes}
          />
        </div>

        {/* Full Width Table */}
        <div className="col-span-1 lg:col-span-4">
          <PedidosTable />
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-500"></div>
          <p className="text-cyan-500 font-mono text-xs animate-pulse">Sincronizando con la nube...</p>
        </div>
      </div>
    );
  }

  const hasData = dataSource === 'supabase' || db || events.length > 0 || Object.keys(clientes).length > 0 || pedidos.length > 0;
  if (!hasData) return <DataLoader />;

  // Renderizar la página actual
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
    default:
      return <Dashboard onNavigate={setCurrentPage} />;
  }
}

export default function App() {
  return (
    <DatabaseProvider>
      <AppContent />
    </DatabaseProvider>
  );
}
