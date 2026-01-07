import { useCallback, useState } from 'react';
import { useDatabase } from '../context/DatabaseContext';

export function DataLoader() {
    const { loadDatabase, isLoading, error } = useDatabase();
    const [isDragging, setIsDragging] = useState(false);

    const handleDrop = useCallback(async (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);

        if (e.dataTransfer.files.length > 0) {
            await loadDatabase(e.dataTransfer.files);
        }
    }, [loadDatabase]);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback(() => {
        setIsDragging(false);
    }, []);

    const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files && files.length > 0) {
            await loadDatabase(files);
        }
    }, [loadDatabase]);

    return (
        <div className="min-h-screen flex items-center justify-center p-8">
            <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                className={`
          glass-card p-12 text-center cursor-pointer
          transition-all duration-300 max-w-lg w-full
          ${isDragging ? 'border-cyan-400 scale-105 shadow-lg shadow-cyan-500/20' : 'border-gray-700'}
          hover:border-cyan-500
        `}
            >
                {isLoading ? (
                    <div className="flex flex-col items-center gap-4">
                        <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin" />
                        <p className="text-gray-400">Cargando datos...</p>
                    </div>
                ) : (
                    <>
                        <div className="text-6xl mb-6">📊</div>
                        <h2 className="text-2xl font-bold mb-4 bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
                            Creaactivo Logistics Dashboard
                        </h2>
                        <p className="text-gray-400 mb-6">
                            Arrastra tus archivos aquí
                            <br />
                            <span className="text-cyan-400 font-mono">.db</span> o{' '}
                            <span className="text-cyan-400 font-mono">.jsonl</span>
                            <br />
                            <span className="text-xs text-gray-500">(Puedes seleccionar múltiples .jsonl para cargar todo el historial)</span>
                        </p>
                        <input
                            type="file"
                            accept=".db,.jsonl"
                            multiple
                            onChange={handleFileSelect}
                            className="hidden"
                            id="file-input"
                        />
                        <label
                            htmlFor="file-input"
                            className="inline-block px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-lg font-medium cursor-pointer hover:opacity-90 transition-opacity"
                        >
                            Seleccionar archivos
                        </label>
                        <p className="text-gray-500 text-xs mt-4">
                            💡 Los archivos .jsonl están en <code>knowledge_base/traces/</code>
                        </p>
                    </>
                )}

                {error && (
                    <p className="mt-4 text-red-400 text-sm">{error}</p>
                )}
            </div>
        </div>
    );
}
