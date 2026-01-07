import { DatabaseProvider, useDatabase } from './context/DatabaseContext';
import { DataLoader } from './components/DataLoader';
import { KPICards } from './components/KPICards';
import { ProcessGraph } from './components/ProcessGraph';
import { PedidosTable } from './components/PedidosTable';

function Dashboard() {
  return (
    <div className="min-h-screen p-6">
      {/* Header */}
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
            Creaactivo Logistics
          </h1>
          <p className="text-gray-400 mt-1">Process Intelligence Dashboard</p>
        </div>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm transition-colors"
        >
          🔄 Cargar otro archivo
        </button>
      </header>

      {/* KPIs */}
      <KPICards />

      {/* Process Graph */}
      <ProcessGraph />

      {/* Pedidos Table */}
      <PedidosTable />
    </div>
  );
}

function App() {
  return (
    <DatabaseProvider>
      <Dashboard />
    </DatabaseProvider>
  );
}

export default App;
