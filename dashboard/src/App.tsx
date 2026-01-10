import { useState } from 'react';
import { DataLoader } from './components/DataLoader';
import { KPICards } from './components/KPICards';
import { ProcessGraph } from './components/ProcessGraph';
import { PedidosTable } from './components/PedidosTable';
import { ClienteModal } from './components/ClienteModal';
import { ProveedorModal } from './components/ProveedorModal';
import { NuevoClienteModal } from './components/NuevoClienteModal';
import { NuevoProveedorModal } from './components/NuevoProveedorModal';
import { Sidebar } from './components/Sidebar';
import { useDatabase, DatabaseProvider } from './context/DatabaseContext';

function Dashboard() {
  const { pedidos, clientes, exportBackup, loadDatabase } = useDatabase();
  const [activeSidebar, setActiveSidebar] = useState<'shortcuts' | 'alerts' | 'recent_orders'>('shortcuts');
  const [modalType, setModalType] = useState<'cliente' | 'proveedor' | 'nuevo_cliente' | 'nuevo_proveedor' | null>(null);
  const [newEntityName, setNewEntityName] = useState('');

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
            onChange={(e) => e.target.files && loadDatabase(e.target.files)}
            accept=".json,.jsonl,.db"
          />

          <button
            onClick={exportBackup}
            className="px-4 py-2 bg-blue-600 border border-blue-500 rounded-lg text-white hover:bg-blue-500 transition-colors flex items-center gap-2 shadow-lg shadow-blue-900/40"
            title="Descargar copia de seguridad de todos los datos"
          >
            <span>💾</span> Guardar Respaldo
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

      {modalType === 'cliente' && <ClienteModal nombre={newEntityName} isOpen={true} onClose={() => setModalType(null)} />}
      {modalType === 'proveedor' && <ProveedorModal nombre={newEntityName} isOpen={true} onClose={() => setModalType(null)} />}
      {modalType === 'nuevo_cliente' && <NuevoClienteModal isOpen={true} onClose={() => setModalType(null)} />}
      {modalType === 'nuevo_proveedor' && <NuevoProveedorModal isOpen={true} onClose={() => setModalType(null)} />}
    </div>
  );
}

function AppContent() {
  const { db, events, isLoading, clientes, pedidos, dataSource } = useDatabase();

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

  if (dataSource === 'supabase') return <Dashboard />;

  const hasData = db || events.length > 0 || Object.keys(clientes).length > 0 || pedidos.length > 0;
  if (!hasData) return <DataLoader />;

  return <Dashboard />;
}

export default function App() {
  return (
    <DatabaseProvider>
      <AppContent />
    </DatabaseProvider>
  );
}
