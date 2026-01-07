import { useState } from 'react';
import { DataLoader } from './components/DataLoader';
import { KPICards } from './components/KPICards';
import { ProcessGraph } from './components/ProcessGraph';
import { PedidosTable } from './components/PedidosTable';
import { ClienteModal } from './components/ClienteModal';
import { ProveedorModal } from './components/ProveedorModal';
import { useDatabase, DatabaseProvider } from './context/DatabaseContext';

function Dashboard() {
  const { resetDatabase, pedidos, clientes, exportBackup, loadDatabase } = useDatabase();
  const [activeSidebar, setActiveSidebar] = useState<'shortcuts' | 'alerts' | 'recent_orders'>('shortcuts');
  const [modalType, setModalType] = useState<'cliente' | 'proveedor' | null>(null);
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
    const name = window.prompt(`Ingrese el nombre del nuevo ${type}:`);
    if (name) {
      setNewEntityName(name);
      setModalType(type);
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
            Creaactivo Logistics
          </h1>
          <p className="text-gray-400">Process Intelligence Dashboard</p>
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
            title="Descargar copia de seguridad de Clientes, Proveedores y Ajustes"
          >
            <span>💾</span> Guardar Backup
          </button>
          <button
            onClick={() => document.getElementById('header-file-upload')?.click()}
            className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-300 hover:text-white hover:border-gray-600 transition-colors flex items-center gap-2"
          >
            <span>📂</span> Cargar Archivo
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
          {activeSidebar === 'alerts' && (
            <div className="glass-card p-4 h-full animate-in slide-in-from-right duration-300">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-cyan-400">Alertas Recientes</h3>
                <button onClick={() => setActiveSidebar('shortcuts')} className="text-gray-500 hover:text-white">✕</button>
              </div>
              <div className="space-y-3">
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded text-sm">
                  <span className="text-red-400 font-bold">⚠️ Pedido #1234</span>
                  <p className="text-gray-400">Retraso en producción detectado</p>
                </div>
                <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded text-sm">
                  <span className="text-amber-400 font-bold">⚠️ Material</span>
                  <p className="text-gray-400">Stock bajo en vinil mate</p>
                </div>
              </div>
            </div>
          )}

          {activeSidebar === 'recent_orders' && (
            <div className="glass-card p-4 h-full animate-in slide-in-from-right duration-300">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-blue-400">Últimos Pedidos</h3>
                <button onClick={() => setActiveSidebar('shortcuts')} className="text-gray-500 hover:text-white">✕</button>
              </div>
              <div className="space-y-3">
                {recentOrders.length > 0 ? recentOrders.map(p => {
                  const clientData = clientes[p.cliente];
                  return (
                    <div key={p.id} className="p-3 bg-blue-500/10 border border-blue-500/20 rounded text-sm hover:bg-blue-500/20 transition-colors">
                      <div className="flex justify-between items-start mb-1">
                        <span className="font-bold text-blue-200 truncate pr-2 flex-1">{p.descripcion?.split(' ')[0] || 'Pedido'}</span>
                        <span className="text-[10px] text-blue-400 bg-blue-900/50 px-1.5 py-0.5 rounded border border-blue-800/50">{p.estado}</span>
                      </div>

                      <div className="flex items-center gap-2 mt-2">
                        {clientData?.logo ? (
                          <img src={clientData.logo} alt="Logo" className="w-5 h-5 rounded-full object-cover ring-1 ring-blue-500/30" />
                        ) : (
                          <span className="text-lg leading-none opacity-50">👤</span>
                        )}
                        <div className="text-gray-300 text-xs truncate flex-1">{p.cliente}</div>
                      </div>

                      <div className="text-right text-xs font-mono text-cyan-300 mt-2 border-t border-blue-500/10 pt-1">
                        S/.{p.precio?.toFixed(2)}
                      </div>
                    </div>
                  )
                }) : <p className="text-gray-500 text-sm">No hay pedidos recientes.</p>}
              </div>
            </div>
          )}

          {activeSidebar === 'shortcuts' && (
            <div className="flex flex-col gap-4 h-full animate-in fade-in duration-300">
              <button onClick={() => handleNewEntity('cliente')} className="flex-1 bg-blue-600/10 hover:bg-blue-600/20 border border-blue-500/30 hover:border-blue-500/60 p-6 rounded-xl flex flex-col items-center justify-center gap-2 group transition-all">
                <span className="text-4xl group-hover:scale-110 transition-transform mb-2">👤</span>
                <span className="font-bold text-blue-300 text-lg">Nuevo Cliente</span>
                <span className="text-xs text-blue-500/60">Registrar ficha</span>
              </button>
              <button onClick={() => handleNewEntity('proveedor')} className="flex-1 bg-purple-600/10 hover:bg-purple-600/20 border border-purple-500/30 hover:border-purple-500/60 p-6 rounded-xl flex flex-col items-center justify-center gap-2 group transition-all">
                <span className="text-4xl group-hover:scale-110 transition-transform mb-2">🏭</span>
                <span className="font-bold text-purple-300 text-lg">Nuevo Proveedor</span>
                <span className="text-xs text-purple-500/60">Registrar socio</span>
              </button>
            </div>
          )}
        </div>

        {/* Full Width Table */}
        <div className="col-span-1 lg:col-span-4">
          <PedidosTable />
        </div>
      </div>

      {modalType === 'cliente' && <ClienteModal nombre={newEntityName} isOpen={true} onClose={() => setModalType(null)} />}
      {modalType === 'proveedor' && <ProveedorModal nombre={newEntityName} isOpen={true} onClose={() => setModalType(null)} />}
    </div>
  );
}

function AppContent() {
  const { db, events, isLoading } = useDatabase();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-500"></div>
      </div>
    );
  }

  // Show dashboard if we have a DB OR if we have events loaded
  if (!db && events.length === 0) {
    return <DataLoader />;
  }

  return <Dashboard />;
}

export default function App() {
  return (
    <DatabaseProvider>
      <AppContent />
    </DatabaseProvider>
  );
}
