import type { PKLMatch } from '../utils/pklMatcher';

interface PKLSuggestionsProps {
  matches: PKLMatch[];
  selectedPklId: string;
  onSelectPkl: (pklId: string) => void;
  minScore?: number;
}

export function PKLSuggestions({ matches, selectedPklId, onSelectPkl, minScore = 50 }: PKLSuggestionsProps) {
  // Filtrar por score mínimo
  const goodMatches = matches.filter(m => m.score >= minScore);

  if (goodMatches.length === 0) {
    return null;
  }

  return (
    <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 space-y-2">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-sm text-blue-400 font-medium">💡 PKLs Sugeridos</span>
        <span className="text-xs text-gray-400">({goodMatches.length})</span>
      </div>

      <div className="space-y-2">
        {goodMatches.slice(0, 3).map(match => {
          const isSelected = selectedPklId === match.pkl.pkl_id;
          return (
            <button
              key={match.pkl.pkl_id}
              type="button"
              onClick={() => onSelectPkl(match.pkl.pkl_id)}
              className={`
                w-full text-left px-3 py-2 rounded-lg border transition-all
                ${isSelected
                  ? 'bg-blue-500/30 border-blue-500 shadow-lg shadow-blue-500/20'
                  : 'bg-gray-800/50 border-gray-700 hover:border-blue-500/50 hover:bg-gray-800'
                }
              `}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-white truncate">
                      {match.pkl.pkl_id}
                    </span>
                    <span className={`
                      text-xs px-1.5 py-0.5 rounded font-medium
                      ${match.score >= 80 ? 'bg-green-500/20 text-green-400' :
                        match.score >= 60 ? 'bg-blue-500/20 text-blue-400' :
                        'bg-yellow-500/20 text-yellow-400'}
                    `}>
                      {match.score}%
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 truncate mb-1">
                    {match.pkl.cliente.nombre}
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {match.reasons.map((reason, idx) => (
                      <span
                        key={idx}
                        className="text-xs px-1.5 py-0.5 bg-gray-700/50 text-gray-300 rounded"
                      >
                        {reason}
                      </span>
                    ))}
                  </div>
                </div>
                {isSelected && (
                  <span className="text-blue-400 text-lg">✓</span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {goodMatches.length > 3 && (
        <p className="text-xs text-gray-500 text-center pt-1">
          +{goodMatches.length - 3} más disponibles en el selector
        </p>
      )}
    </div>
  );
}
