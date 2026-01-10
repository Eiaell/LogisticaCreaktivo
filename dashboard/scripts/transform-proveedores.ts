/**
 * Script de Transformación de Proveedores
 * ========================================
 * Convierte data cruda de Excel 2025 al modelo normalizado de la base de datos.
 *
 * USO:
 * 1. Coloca tu JSON crudo en: scripts/input/proveedores-raw.json
 * 2. Ejecuta: npx tsx scripts/transform-proveedores.ts
 * 3. Output en: scripts/output/proveedores-normalized.json
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================================================
// TIPOS
// ============================================================================

// Estructura REAL del Excel 2025 de Creaktivo
interface RawProveedorExcel {
    nombre?: string;
    ruc?: string;
    contacto?: string;           // Puede contener teléfonos y nombre de persona: "994 228 471 (Sra. Pilar)"
    correo?: string;
    direccion?: string;          // A veces es dirección real, a veces es descripción del material
    referencia?: string | null;
    material?: string;           // Capacidades/productos
    pago?: string;               // Condiciones de pago en texto libre
    cuenta?: string;             // Datos bancarios
    categoria?: string;          // Campo opcional si viene agrupado
    // Cualquier campo adicional
    [key: string]: any;
}

// Modelo normalizado de salida (compatible con Supabase)
interface NormalizedProveedor {
    id: string;
    nombre: string;
    razon_social: string | null;
    ruc: string | null;
    contacts: {
        phones: string[];
        emails: string[];
        persons: string[];
    };
    ubicacion: string | null;
    categorias: string[];
    especialidad: string;
    condiciones_comerciales: {
        emite_factura: boolean | null;
        incluye_igv: 'si' | 'no' | 'depende' | null;
        forma_pago: string | null;
        tiempo_produccion_dias: number | null;
        tiempo_entrega_dias: number | null;
        minimo_produccion: string | null;
    };
    notas: string | null;
    factor_demora: number;
    created_at: string;
    updated_at: string;
}

// Modelo plano para inserción directa en Supabase
interface SupabaseProveedor {
    nombre: string;
    razon_social: string | null;
    ruc: string | null;
    contacto: string | null;
    telefono: string | null;
    email: string | null;
    direccion: string | null;
    categorias: string[] | null;
    especialidad: string;
    emite_factura: boolean | null;
    incluye_igv: string | null;
    forma_pago: string | null;
    tiempo_produccion: number | null;
    tiempo_entrega: number | null;
    minimo_produccion: string | null;
    factor_demora: number;
    notas: string | null;
}

// ============================================================================
// CATEGORÍAS VÁLIDAS
// ============================================================================

const CATEGORIAS_VALIDAS = [
    'Logos',
    'Importadores / Merchandising general',
    'Textil',
    'Merchandising pequeño (pines, lanyards, llaveros)',
    'Papelería',
    'Producción gráfica / gran formato',
    'POP y activaciones BTL',
    'Ecológico',
    'Acrílico y loza',
    'Decoración y ambientación',
    'Globos y decoración promocional',
    'Logística y montaje',
    'Personal para eventos',
    'Diseño y servicios creativos',
    'Servicios especiales / ad-hoc'
];

// Mapeo de categorías del Excel a categorías normalizadas
const CATEGORIA_MAP: Record<string, string> = {
    // Impresión / Serigrafía / Pantografía
    'impresion': 'Producción gráfica / gran formato',
    'impresión': 'Producción gráfica / gran formato',
    'imprenta': 'Producción gráfica / gran formato',
    'grafica': 'Producción gráfica / gran formato',
    'gráfica': 'Producción gráfica / gran formato',
    'gran formato': 'Producción gráfica / gran formato',
    'gigantografia': 'Producción gráfica / gran formato',
    'gigantografía': 'Producción gráfica / gran formato',
    'vinil': 'Producción gráfica / gran formato',
    'vinilo': 'Producción gráfica / gran formato',
    'banner': 'Producción gráfica / gran formato',
    'ploteo': 'Producción gráfica / gran formato',
    'serigrafia': 'Producción gráfica / gran formato',
    'serigrafía': 'Producción gráfica / gran formato',
    'pantografia': 'Producción gráfica / gran formato',
    'pantografía': 'Producción gráfica / gran formato',
    'plastico': 'Producción gráfica / gran formato',
    'plástico': 'Producción gráfica / gran formato',
    'aluminio': 'Producción gráfica / gran formato',
    'metal': 'Producción gráfica / gran formato',

    // Textil (ropa, telas)
    'textil': 'Textil',
    'tela': 'Textil',
    'telas': 'Textil',
    'polos': 'Textil',
    'polo': 'Textil',
    'camisetas': 'Textil',
    'camiseta': 'Textil',
    'uniformes': 'Textil',
    'uniforme': 'Textil',
    'confeccion': 'Textil',
    'confección': 'Textil',
    'bordado': 'Textil',
    'bordados': 'Textil',
    'sublimacion': 'Textil',
    'sublimación': 'Textil',
    'serigrafía': 'Textil',
    'serigrafia': 'Textil',

    // Importadores
    'importador': 'Importadores / Merchandising general',
    'importadores': 'Importadores / Merchandising general',
    'merchandising': 'Importadores / Merchandising general',
    'merch': 'Importadores / Merchandising general',
    'promocionales': 'Importadores / Merchandising general',
    'promocional': 'Importadores / Merchandising general',

    // Logos
    'logos': 'Logos',
    'logo': 'Logos',
    'branding': 'Logos',

    // Merchandising pequeño
    'pines': 'Merchandising pequeño (pines, lanyards, llaveros)',
    'pin': 'Merchandising pequeño (pines, lanyards, llaveros)',
    'lanyards': 'Merchandising pequeño (pines, lanyards, llaveros)',
    'lanyard': 'Merchandising pequeño (pines, lanyards, llaveros)',
    'llaveros': 'Merchandising pequeño (pines, lanyards, llaveros)',
    'llavero': 'Merchandising pequeño (pines, lanyards, llaveros)',
    'chapas': 'Merchandising pequeño (pines, lanyards, llaveros)',
    'botones': 'Merchandising pequeño (pines, lanyards, llaveros)',

    // Papelería
    'papeleria': 'Papelería',
    'papelería': 'Papelería',
    'cuadernos': 'Papelería',
    'libretas': 'Papelería',
    'folders': 'Papelería',
    'sobres': 'Papelería',
    'carton': 'Papelería',
    'cartón': 'Papelería',
    'papel': 'Papelería',

    // POP y BTL
    'pop': 'POP y activaciones BTL',
    'btl': 'POP y activaciones BTL',
    'activaciones': 'POP y activaciones BTL',
    'activación': 'POP y activaciones BTL',
    'exhibidores': 'POP y activaciones BTL',
    'exhibidor': 'POP y activaciones BTL',
    'stands': 'POP y activaciones BTL',
    'stand': 'POP y activaciones BTL',

    // Ecológico
    'ecologico': 'Ecológico',
    'ecológico': 'Ecológico',
    'eco': 'Ecológico',
    'reciclado': 'Ecológico',
    'sostenible': 'Ecológico',

    // Acrílico y loza
    'acrilico': 'Acrílico y loza',
    'acrílico': 'Acrílico y loza',
    'loza': 'Acrílico y loza',
    'ceramica': 'Acrílico y loza',
    'cerámica': 'Acrílico y loza',
    'tazas': 'Acrílico y loza',
    'taza': 'Acrílico y loza',
    'mugs': 'Acrílico y loza',

    // Decoración
    'decoracion': 'Decoración y ambientación',
    'decoración': 'Decoración y ambientación',
    'ambientacion': 'Decoración y ambientación',
    'ambientación': 'Decoración y ambientación',

    // Globos
    'globos': 'Globos y decoración promocional',
    'globo': 'Globos y decoración promocional',

    // Logística
    'logistica': 'Logística y montaje',
    'logística': 'Logística y montaje',
    'montaje': 'Logística y montaje',
    'instalacion': 'Logística y montaje',
    'instalación': 'Logística y montaje',
    'transporte': 'Logística y montaje',

    // Personal
    'personal': 'Personal para eventos',
    'anfitrionas': 'Personal para eventos',
    'promotoras': 'Personal para eventos',
    'eventos': 'Personal para eventos',

    // Diseño
    'diseño': 'Diseño y servicios creativos',
    'diseno': 'Diseño y servicios creativos',
    'creativos': 'Diseño y servicios creativos',
    'creatividad': 'Diseño y servicios creativos',

    // Servicios especiales
    'especiales': 'Servicios especiales / ad-hoc',
    'ad-hoc': 'Servicios especiales / ad-hoc',
    'otros': 'Servicios especiales / ad-hoc',
};

// ============================================================================
// FUNCIONES DE TRANSFORMACIÓN
// ============================================================================

function generateId(): string {
    return `PROV-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
}

function cleanString(value: any): string | null {
    if (value === undefined || value === null || value === '') return null;
    return String(value).trim();
}

function extractPhones(raw: RawProveedorExcel): string[] {
    const phones: string[] = [];
    // El campo "contacto" contiene teléfonos: "998 604 537 / (01) 555 2179"
    const phoneFields = [raw.contacto];

    for (const field of phoneFields) {
        if (!field) continue;

        // Primero quitar texto entre paréntesis que NO sean códigos de área (01), (51), etc.
        // Ejemplo: "(Sra. Pilar)" debe ser removido, pero "(01)" debe mantenerse
        let cleaned = String(field).replace(/\([^)]*[a-zA-Z][^)]*\)/g, '');

        // Separar por "/"
        const parts = cleaned.split(/[\/]/);
        for (const part of parts) {
            // Extraer números de teléfono con formato
            const phoneMatch = part.match(/(?:\(\d{2}\)\s*)?[\d\s-]+/g);
            if (phoneMatch) {
                for (const match of phoneMatch) {
                    const phoneCleaned = match.replace(/\s+/g, ' ').trim();
                    // Solo si tiene al menos 7 dígitos
                    if (phoneCleaned.replace(/\D/g, '').length >= 7) {
                        phones.push(phoneCleaned);
                    }
                }
            }
        }
    }

    return [...new Set(phones)]; // Eliminar duplicados
}

function extractEmails(raw: RawProveedorExcel): string[] {
    const emails: string[] = [];
    const emailFields = [raw.email, raw.correo];

    for (const field of emailFields) {
        if (!field) continue;
        // Buscar patrones de email
        const matches = String(field).match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g);
        if (matches) {
            emails.push(...matches.map(e => e.toLowerCase()));
        }
    }

    return [...new Set(emails)];
}

function extractPersons(raw: RawProveedorExcel): string[] {
    const persons: string[] = [];
    if (raw.contacto) {
        // Buscar patrones como "(Sra. Pilar)", "(Sr. Juan)", etc.
        const personMatches = String(raw.contacto).match(/\(([^)]+)\)/g);
        if (personMatches) {
            for (const match of personMatches) {
                // Quitar paréntesis y limpiar
                const name = match.replace(/[()]/g, '').trim();
                // Solo si no es solo números
                if (name && !/^[\d\s-]+$/.test(name)) {
                    persons.push(name);
                }
            }
        }
    }
    return persons;
}

// Mapeo de categorías del Excel a categorías normalizadas del sistema
const CATEGORIA_EXCEL_MAP: Record<string, string> = {
    'LOGOS': 'Logos',
    'IMPORTADORES': 'Importadores / Merchandising general',
    'TEXTIL': 'Textil',
    'PINES': 'Merchandising pequeño (pines, lanyards, llaveros)',
    'PAPELERIA': 'Papelería',
    'ECOLOGICO': 'Ecológico',
    'ACRILICO Y LOZA': 'Acrílico y loza',
    'SERVICIOS': 'Logística y montaje',
    'DECORACIONES': 'Decoración y ambientación',
};

function normalizeCategoria(raw: RawProveedorExcel): string[] {
    const categorias: string[] = [];

    // Primero usar la categoría del Excel si existe
    if (raw.categoria) {
        const catNormalizada = CATEGORIA_EXCEL_MAP[raw.categoria.toUpperCase()];
        if (catNormalizada && !categorias.includes(catNormalizada)) {
            categorias.push(catNormalizada);
        }
    }

    // Usar "material" como fuente adicional de capacidades
    const categoryFields = [raw.material];

    // Detectar si "direccion" es realmente una descripción de servicio (no una dirección real)
    if (raw.direccion && !looksLikeAddress(raw.direccion)) {
        categoryFields.push(raw.direccion);
    }

    for (const field of categoryFields) {
        if (!field) continue;
        const lower = String(field).toLowerCase();

        // Buscar coincidencias en el mapa
        for (const [key, value] of Object.entries(CATEGORIA_MAP)) {
            if (lower.includes(key)) {
                if (!categorias.includes(value)) {
                    categorias.push(value);
                }
            }
        }
    }

    // Si no encontramos ninguna, usar "Servicios especiales"
    if (categorias.length === 0) {
        categorias.push('Servicios especiales / ad-hoc');
    }

    return categorias;
}

// Detectar si un texto parece una dirección real
function looksLikeAddress(text: string): boolean {
    const lower = text.toLowerCase();
    const addressIndicators = [
        'calle', 'av.', 'av ', 'avenida', 'jr.', 'jr ', 'jiron', 'jirón',
        'mz.', 'mz ', 'manzana', 'lte.', 'lte ', 'lote', 'urb.', 'urb ',
        'asoc.', 'asoc ', 'asociación', 'surco', 'miraflores', 'san isidro',
        'la victoria', 'lima', 'callao', 'estacion', 'estación'
    ];
    return addressIndicators.some(ind => lower.includes(ind));
}

function normalizeBoolean(value: any): boolean | null {
    if (value === undefined || value === null || value === '') return null;
    const str = String(value).toLowerCase().trim();
    if (['si', 'sí', 'yes', 'true', '1', 'x'].includes(str)) return true;
    if (['no', 'false', '0', '-'].includes(str)) return false;
    return null;
}

function normalizeIGV(value: any): 'si' | 'no' | 'depende' | null {
    if (value === undefined || value === null || value === '') return null;
    const str = String(value).toLowerCase().trim();
    if (['si', 'sí', 'yes', 'true', '1', 'incluido', 'incluye'].includes(str)) return 'si';
    if (['no', 'false', '0', 'sin', 'no incluye'].includes(str)) return 'no';
    if (['depende', 'variable', 'segun', 'según', 'a veces'].includes(str)) return 'depende';
    return null;
}

function extractDays(value: any): number | null {
    if (value === undefined || value === null || value === '') return null;

    // Si ya es número
    if (typeof value === 'number') return Math.round(value);

    const str = String(value).toLowerCase();

    // Buscar patrones: "5 días", "3-5 días", "1 semana", etc.
    const daysMatch = str.match(/(\d+)\s*(?:días?|dias?|d)/i);
    if (daysMatch) return parseInt(daysMatch[1]);

    const weeksMatch = str.match(/(\d+)\s*(?:semanas?)/i);
    if (weeksMatch) return parseInt(weeksMatch[1]) * 7;

    // Si es solo número
    const numMatch = str.match(/^(\d+)$/);
    if (numMatch) return parseInt(numMatch[1]);

    return null;
}

function normalizeFormaPago(value: any): string | null {
    if (value === undefined || value === null || value === '') return null;
    const str = String(value).toLowerCase().trim();

    if (str.includes('contado')) return 'Contado';
    if (str.includes('adelanto') || str.includes('anticipo')) return 'Adelanto';
    if (str.includes('contra entrega') || str.includes('contraentrega')) return 'Contra entrega';
    if (str.includes('credito') || str.includes('crédito')) return 'Crédito';

    // Devolver el valor original si no coincide
    return cleanString(value);
}

function buildUbicacion(raw: RawProveedorExcel): string | null {
    // Solo usar "direccion" si parece una dirección real
    if (raw.direccion && looksLikeAddress(raw.direccion)) {
        let ubicacion = cleanString(raw.direccion);
        // Agregar referencia si existe
        if (raw.referencia) {
            ubicacion += ` (Ref: ${cleanString(raw.referencia)})`;
        }
        return ubicacion;
    }
    // Si solo hay referencia, usarla
    if (raw.referencia) {
        return cleanString(raw.referencia);
    }
    return null;
}

function buildNotas(raw: RawProveedorExcel): string | null {
    const parts: string[] = [];

    // Material/capacidades como nota
    if (raw.material) {
        parts.push(`Materiales: ${cleanString(raw.material)}`);
    }

    // Si direccion no es dirección real, es descripción de servicio
    if (raw.direccion && !looksLikeAddress(raw.direccion)) {
        parts.push(`Servicios: ${cleanString(raw.direccion)}`);
    }

    // Datos bancarios
    if (raw.cuenta) {
        parts.push(`Cuenta: ${cleanString(raw.cuenta)}`);
    }

    return parts.length > 0 ? parts.join(' | ') : null;
}

function extractFormaPago(raw: RawProveedorExcel): string | null {
    if (!raw.pago) return null;
    const pago = String(raw.pago).toLowerCase();

    if (pago.includes('deposito') || pago.includes('depósito')) return 'Adelanto';
    if (pago.includes('adelanto') || pago.includes('anticipo')) return 'Adelanto';
    if (pago.includes('cuando termina') || pago.includes('contra entrega')) return 'Contra entrega';
    if (pago.includes('contado')) return 'Contado';
    if (pago.includes('credito') || pago.includes('crédito')) return 'Crédito';

    // Si tiene "/" puede ser mixto, devolver el texto original limpio
    return cleanString(raw.pago);
}

// ============================================================================
// FUNCIÓN PRINCIPAL DE TRANSFORMACIÓN
// ============================================================================

function transformProveedor(raw: RawProveedorExcel): SupabaseProveedor | null {
    // Obtener nombre (campo obligatorio)
    const nombre = cleanString(raw.nombre);
    if (!nombre) {
        console.warn('⚠️  Proveedor sin nombre, omitido:', raw);
        return null;
    }

    // Extraer contactos del campo "contacto" que tiene teléfonos y personas
    const phones = extractPhones(raw);
    const emails = extractEmails(raw);
    const persons = extractPersons(raw);

    // Normalizar categorías desde "material" y posiblemente "direccion"
    const categorias = normalizeCategoria(raw);

    // Detectar si tiene RUC de empresa (20) o persona natural (10)
    const rucClean = cleanString(raw.ruc)?.replace(/[^\d]/g, '') || null;
    const esEmpresa = rucClean && rucClean.startsWith('20');

    const result: SupabaseProveedor = {
        nombre: nombre,
        razon_social: esEmpresa ? nombre : null, // Si es empresa, el nombre es la razón social
        ruc: rucClean,
        contacto: persons.length > 0 ? persons.join(', ') : null,
        telefono: phones.length > 0 ? phones.join(' / ') : null,
        email: emails.length > 0 ? emails.join(', ') : null,
        direccion: buildUbicacion(raw),
        categorias: categorias.length > 0 ? categorias : null,
        especialidad: categorias[0] || 'Servicios especiales / ad-hoc',
        emite_factura: rucClean ? true : null, // Si tiene RUC, probablemente emite factura
        incluye_igv: null, // No hay data
        forma_pago: extractFormaPago(raw),
        tiempo_produccion: null, // No hay data
        tiempo_entrega: null, // No hay data
        minimo_produccion: null, // No hay data
        factor_demora: 0,
        notas: buildNotas(raw)
    };

    return result;
}

// ============================================================================
// EJECUCIÓN
// ============================================================================

async function main() {
    const inputPath = path.join(__dirname, 'input', 'proveedores-raw.json');
    const outputPath = path.join(__dirname, 'output', 'proveedores-normalized.json');
    const sqlPath = path.join(__dirname, 'output', 'proveedores-insert.sql');

    // Crear directorios si no existen
    fs.mkdirSync(path.join(__dirname, 'input'), { recursive: true });
    fs.mkdirSync(path.join(__dirname, 'output'), { recursive: true });

    // Verificar archivo de entrada
    if (!fs.existsSync(inputPath)) {
        console.log('═══════════════════════════════════════════════════════════════');
        console.log('📋 SCRIPT DE TRANSFORMACIÓN DE PROVEEDORES');
        console.log('═══════════════════════════════════════════════════════════════');
        console.log('');
        console.log('❌ No se encontró el archivo de entrada.');
        console.log('');
        console.log('📂 Coloca tu JSON crudo del Excel en:');
        console.log(`   ${inputPath}`);
        console.log('');
        console.log('📝 Formato esperado del JSON:');
        console.log('   [');
        console.log('     {');
        console.log('       "nombre": "Proveedor ABC",');
        console.log('       "ruc": "20123456789",');
        console.log('       "telefono": "999 888 777",');
        console.log('       "categoria": "TEXTIL",');
        console.log('       ...');
        console.log('     },');
        console.log('     ...');
        console.log('   ]');
        console.log('');
        console.log('═══════════════════════════════════════════════════════════════');

        // Crear archivo de ejemplo
        const example: RawProveedorExcel[] = [
            {
                nombre: "Ejemplo Textil SAC",
                ruc: "20123456789",
                contacto: "Juan Pérez",
                telefono: "999 888 777, 998 877 666",
                email: "ventas@ejemplo.com",
                direccion: "Gamarra, La Victoria",
                categoria: "TEXTIL",
                emite_factura: "SI",
                incluye_igv: "NO",
                forma_pago: "50% adelanto",
                tiempo_produccion: "5 días",
                notas: "Buen proveedor de polos"
            }
        ];
        fs.writeFileSync(inputPath, JSON.stringify(example, null, 2), 'utf-8');
        console.log('✅ Archivo de ejemplo creado en:', inputPath);
        return;
    }

    // Leer y procesar
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('📋 TRANSFORMANDO PROVEEDORES');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('');

    const fileContent = JSON.parse(fs.readFileSync(inputPath, 'utf-8'));

    // Detectar si es un array o un objeto con categorías
    let rawData: RawProveedorExcel[] = [];

    if (Array.isArray(fileContent)) {
        // Formato plano: [{...}, {...}]
        rawData = fileContent;
    } else if (typeof fileContent === 'object') {
        // Formato agrupado por categoría: { "LOGOS": [...], "TEXTIL": [...] }
        console.log('📂 Detectado formato agrupado por categorías');
        for (const [categoria, proveedores] of Object.entries(fileContent)) {
            if (Array.isArray(proveedores)) {
                console.log(`   → ${categoria}: ${proveedores.length} proveedores`);
                // Agregar la categoría a cada proveedor
                for (const prov of proveedores) {
                    rawData.push({ ...prov, categoria });
                }
            }
        }
        console.log('');
    }

    console.log(`📥 Total proveedores: ${rawData.length}`);

    const normalized: SupabaseProveedor[] = [];
    let skipped = 0;

    for (const raw of rawData) {
        const result = transformProveedor(raw);
        if (result) {
            normalized.push(result);
        } else {
            skipped++;
        }
    }

    console.log(`✅ Proveedores transformados: ${normalized.length}`);
    console.log(`⚠️  Proveedores omitidos (sin nombre): ${skipped}`);

    // Guardar JSON normalizado
    fs.writeFileSync(outputPath, JSON.stringify(normalized, null, 2), 'utf-8');
    console.log(`📤 JSON guardado en: ${outputPath}`);

    // Generar SQL para insert directo
    const sqlStatements = normalized.map(p => {
        const values = [
            p.nombre ? `'${p.nombre.replace(/'/g, "''")}'` : 'NULL',
            p.razon_social ? `'${p.razon_social.replace(/'/g, "''")}'` : 'NULL',
            p.ruc ? `'${p.ruc}'` : 'NULL',
            p.contacto ? `'${p.contacto.replace(/'/g, "''")}'` : 'NULL',
            p.telefono ? `'${p.telefono.replace(/'/g, "''")}'` : 'NULL',
            p.email ? `'${p.email.replace(/'/g, "''")}'` : 'NULL',
            p.direccion ? `'${p.direccion.replace(/'/g, "''")}'` : 'NULL',
            p.categorias ? `ARRAY[${p.categorias.map(c => `'${c}'`).join(', ')}]` : 'NULL',
            `'${p.especialidad.replace(/'/g, "''")}'`,
            p.emite_factura !== null ? p.emite_factura : 'NULL',
            p.incluye_igv ? `'${p.incluye_igv}'` : 'NULL',
            p.forma_pago ? `'${p.forma_pago.replace(/'/g, "''")}'` : 'NULL',
            p.tiempo_produccion ?? 'NULL',
            p.tiempo_entrega ?? 'NULL',
            p.minimo_produccion ? `'${p.minimo_produccion.replace(/'/g, "''")}'` : 'NULL',
            p.factor_demora,
            p.notas ? `'${p.notas.replace(/'/g, "''")}'` : 'NULL'
        ].join(', ');

        return `INSERT INTO proveedores (nombre, razon_social, ruc, contacto, telefono, email, direccion, categorias, especialidad, emite_factura, incluye_igv, forma_pago, tiempo_produccion, tiempo_entrega, minimo_produccion, factor_demora, notas) VALUES (${values});`;
    }).join('\n');

    fs.writeFileSync(sqlPath, sqlStatements, 'utf-8');
    console.log(`📤 SQL guardado en: ${sqlPath}`);

    // Resumen por categoría
    console.log('');
    console.log('📊 RESUMEN POR CATEGORÍA:');
    const catCount: Record<string, number> = {};
    for (const p of normalized) {
        for (const cat of p.categorias || []) {
            catCount[cat] = (catCount[cat] || 0) + 1;
        }
    }
    Object.entries(catCount)
        .sort((a, b) => b[1] - a[1])
        .forEach(([cat, count]) => {
            console.log(`   ${cat}: ${count}`);
        });

    console.log('');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('✅ TRANSFORMACIÓN COMPLETADA');
    console.log('═══════════════════════════════════════════════════════════════');
}

main().catch(console.error);
