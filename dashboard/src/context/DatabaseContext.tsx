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
    loadDatabase: (file: File) => Promise<void>;
}

const DatabaseContext = createContext<DatabaseContextType | null>(null);

export function DatabaseProvider({ children }: { children: ReactNode }) {
    const [db, setDb] = useState<Database | null>(null);
    const [events, setEvents] = useState<TraceEvent[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [dataSource, setDataSource] = useState<'db' | 'jsonl' | null>(null);

    const loadDatabase = async (file: File) => {
        setIsLoading(true);
        setError(null);

        try {
            const fileName = file.name.toLowerCase();

            if (fileName.endsWith('.db')) {
                // Load SQLite database
                const SQL = await initSqlJs({
                    locateFile: (f: string) => `https://sql.js.org/dist/${f}`
                });

                const arrayBuffer = await file.arrayBuffer();
                const database = new SQL.Database(new Uint8Array(arrayBuffer));

                setDb(database);
                setEvents([]);
                setDataSource('db');

            } else if (fileName.endsWith('.jsonl')) {
                // Load JSONL trace file
                const text = await file.text();
                const lines = text.split('\n').filter(line => line.trim());
                const parsedEvents: TraceEvent[] = [];
                let errors = 0;

                console.log(`Parsing ${lines.length} lines from ${fileName}`);

                for (const line of lines) {
                    try {
                        const event = JSON.parse(line) as TraceEvent;
                        parsedEvents.push(event);
                    } catch (e) {
                        errors++;
                        console.error('JSONL Parse Error in line:', line.substring(0, 50) + '...', e);
                    }
                }

                if (parsedEvents.length === 0 && lines.length > 0) {
                    throw new Error('No se pudieron leer eventos válidos. Revisa la consola.');
                }

                console.log(`Loaded ${parsedEvents.length} events. Errors: ${errors}`);

                setDb(null);
                setEvents(parsedEvents);
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
        <DatabaseContext.Provider value={{ db, events, isLoading, error, dataSource, loadDatabase }}>
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
