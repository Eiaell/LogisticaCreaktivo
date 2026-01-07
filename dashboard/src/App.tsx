import { DataLoader } from './components/DataLoader';
import { KPICards } from './components/KPICards';
import { ProcessGraph } from './components/ProcessGraph';
import { PedidosTable } from './components/PedidosTable';
import { useDatabase, DatabaseProvider } from './context/DatabaseContext';

function Dashboard() {
  const { resetDatabase } = useDatabase();

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
        <button
          onClick={resetDatabase}
          className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-300 hover:text-white hover:border-gray-600 transition-colors flex items-center gap-2"
        >
          <span>📂</span> Cargar otro archivo
        </button>
      </header>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Column: KPIs & Graph */}
        <div className="lg:col-span-4 xl:col-span-3 space-y-6">
          <KPICards />
          <ProcessGraph />
        </div>

        {/* Right/Bottom Column: Operational View */}
        <div className="lg:col-span-4 xl:col-span-1 xl:col-start-4">
          <div className="glass-card p-4 h-full">
            <h3 className="text-lg font-semibold mb-4 text-cyan-400">Alertas Recientes</h3>
            <div className="space-y-3">
              {/* Placeholder for alerts feed */}
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
        </div>

        {/* Full Width Table */}
        <div className="col-span-1 lg:col-span-4">
          <PedidosTable />
        </div>
      </div>
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
