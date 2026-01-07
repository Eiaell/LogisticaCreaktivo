import { createContext, useContext, useState, type ReactNode } from 'react';
import initSqlJs, { type Database } from 'sql.js';

// Event from JSONL trace files
export interface TraceEvent {
    timestamp: string;
    action: string;
    actor: string;
    context: {
        tipo?: string;
        proveedor?: string;
        producto?: string;
        cantidad?: number;
        cliente?: string;
        costoTotal?: number;
        adelanto?: number;
        costo?: number;
        origen?: string;
        destino?: string;
        nuevoEstado?: string;
        [key: string]: unknown;
    };
    artifacts: string[];
    caseId?: string;
}

interface DatabaseContextType {
    db: Database | null;
    events: TraceEvent[];
    isLoading: boolean;
    error: string | null;
    dataSource: 'db' | 'jsonl' | null;
    loadDatabase: (files: FileList | File[]) => Promise<void>;
    resetDatabase: () => void;
}

const DatabaseContext = createContext<DatabaseContextType | null>(null);

export function DatabaseProvider({ children }: { children: ReactNode }) {
    const [db, setDb] = useState<Database | null>(null);
    const [events, setEvents] = useState<TraceEvent[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [dataSource, setDataSource] = useState<'db' | 'jsonl' | null>(null);

    const resetDatabase = () => {
        setDb(null);
        setEvents([]);
        setDataSource(null);
        setError(null);
    };

    const loadDatabase = async (files: FileList | File[]) => {
        setIsLoading(true);
        setError(null);

        try {
            // Convert to array
            const fileList = Array.from(files);
            if (fileList.length === 0) return;

            const firstFile = fileList[0];
            const fileName = firstFile.name.toLowerCase();

            if (fileName.endsWith('.db')) {
                // Load SQLite database (only single file supported for DB)
                const SQL = await initSqlJs({
                    locateFile: (f: string) => `https://sql.js.org/dist/${f}`
                });

                const arrayBuffer = await firstFile.arrayBuffer();
                const database = new SQL.Database(new Uint8Array(arrayBuffer));

                setDb(database);
                setEvents([]);
                setDataSource('db');

            } else if (fileName.endsWith('.jsonl')) {
                // Load JSONL trace files (multiple supported)
                const allEvents: TraceEvent[] = [];
                let totalErrors = 0;

                for (const file of fileList) {
                    if (!file.name.toLowerCase().endsWith('.jsonl')) continue;

                    console.log(`Loading ${file.name}...`);
                    const text = await file.text();
                    const lines = text.split('\n').filter(line => line.trim());

                    for (const line of lines) {
                        try {
                            const event = JSON.parse(line) as TraceEvent;
                            allEvents.push(event);
                        } catch (e) {
                            totalErrors++;
                            console.error(`JSONL Parse Error in ${file.name}:`, line.substring(0, 50) + '...', e);
                        }
                    }
                }

                if (allEvents.length === 0 && fileList.length > 0) {
                    throw new Error('No se pudieron leer eventos válidos. Revisa la consola.');
                }

                console.log(`Loaded ${allEvents.length} events from ${fileList.length} files. Errors: ${totalErrors}`);

                // Sort events by timestamp to ensure correct history order
                allEvents.sort((a, b) => {
                    const timeA = new Date(a.timestamp || 0).getTime();
                    const timeB = new Date(b.timestamp || 0).getTime();
                    return timeA - timeB;
                });

                setDb(null);
                setEvents(allEvents);
                setDataSource('jsonl');

            } else {
                throw new Error('Formato no soportado. Usa .db o .jsonl');
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error loading file');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <DatabaseContext.Provider value={{ db, events, isLoading, error, dataSource, loadDatabase, resetDatabase }}>
            {children}
        </DatabaseContext.Provider>
    );
}

export function useDatabase() {
    const context = useContext(DatabaseContext);
    if (!context) {
        throw new Error('useDatabase must be used within a DatabaseProvider');
    }
    return context;
}
