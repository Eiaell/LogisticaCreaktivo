import { useMemo } from 'react';
import type { HistoricoPrecio } from '../types';
import { obtenerProductoBase } from '../config/productosBase';

interface ProviderHistoryPanelProps {
  historico: HistoricoPrecio[];
  onSelectVariante?: (variante: HistoricoPrecio) => void;
}

export function ProviderHistoryPanel({ historico, onSelectVariante }: ProviderHistoryPanelProps) {
  // Agrupar histórico por producto_base
  const historicoAgrupado = useMemo(() => {
    const grupos: Record<string, HistoricoPrecio[]> = {};

    historico.forEach(h => {
      if (!grupos[h.producto_base]) {
        grupos[h.producto_base] = [];
      }
      grupos[h.producto_base].push(h);
    });

    // Ordenar cada grupo por fecha más reciente
    Object.keys(grupos).forEach(key => {
      grupos[key].sort((a, b) =>
        new Date(b.fecha_cotizacion).getTime() - new Date(a.fecha_cotizacion).getTime()
      );
    });

    return grupos;
  }, [historico]);

  if (historico.length === 0) {
    return (
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
        <p className="text-sm text-gray-400 italic">
          No hay histórico de precios para este proveedor
        </p>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 border border-emerald-600/30 rounded-lg p-4 space-y-4">
      <h5 className="text-sm font-bold uppercase text-emerald-300 flex items-center gap-2">
        📊 Histórico de Precios
        <span className="text-xs bg-emerald-600/30 text-emerald-200 px-2 py-0.5 rounded">
          {historico.length} registros
        </span>
      </h5>

      <div className="space-y-3 max-h-96 overflow-y-auto">
        {Object.keys(historicoAgrupado).map(productoBaseKey => {
          const producto = obtenerProductoBase(productoBaseKey);
          const registros = historicoAgrupado[productoBaseKey];

          return (
            <div key={productoBaseKey} className="border border-gray-700 rounded p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-gray-300">
                    {producto?.nombre || productoBaseKey}
                  </p>
                  {producto?.categoria && (
                    <p className="text-xs text-gray-500">{producto.categoria}</p>
                  )}
                </div>
                <span className="text-xs bg-gray-700 text-gray-300 px-2 py-0.5 rounded">
                  {registros.length}
                </span>
              </div>

              {/* Mostrar últimas 3 cotizaciones de este producto */}
              <div className="space-y-2">
                {registros.slice(0, 3).map((registro) => {
                  const fechaCot = new Date(registro.fecha_cotizacion);
                  const ahora = new Date();
                  const diasAtras = Math.floor(
                    (ahora.getTime() - fechaCot.getTime()) / (1000 * 60 * 60 * 24)
                  );

                  return (
                    <div
                      key={registro.id}
                      className="bg-gray-700/50 rounded p-2 hover:bg-gray-700 transition-colors cursor-pointer"
                      onClick={() => onSelectVariante?.(registro)}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-gray-300 truncate">
                            {registro.descripcion}
                          </p>
                          {registro.variante && (
                            <p className="text-xs text-gray-500 italic">
                              {registro.variante}
                            </p>
                          )}
                        </div>
                        <div className="text-right whitespace-nowrap">
                          <p className="text-sm font-bold text-emerald-300">
                            S/ {registro.precio_unitario.toFixed(2)}
                          </p>
                          <p className="text-xs text-gray-500">
                            hace {diasAtras}d
                          </p>
                        </div>
                      </div>

                      {/* Detalles adicionales */}
                      <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                        {registro.incluye_igv && (
                          <span className="bg-gray-600/50 px-1.5 py-0.5 rounded">+IGV</span>
                        )}
                        {registro.cantidad_referencia && (
                          <span>Cant: {registro.cantidad_referencia}</span>
                        )}
                        {registro.tiempo_produccion_dias && (
                          <span>Prod: {registro.tiempo_produccion_dias}d</span>
                        )}
                      </div>
                    </div>
                  );
                })}

                {registros.length > 3 && (
                  <p className="text-xs text-gray-500 text-center">
                    +{registros.length - 3} más
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="border-t border-gray-700 pt-2 text-xs text-gray-500">
        <p>💡 Haz clic en una variante para reutilizarla en la nueva cotización</p>
      </div>
    </div>
  );
}
