/**
 * DICCIONARIO DE PRODUCTOS BASE
 *
 * Normalización canónica de productos para comparación de precios históricos.
 * Cada producto_base es singular, en minúsculas, sin acentos.
 */

export interface ProductoBase {
  id: string;           // lanyard, pin, bolsa, etc.
  nombre: string;       // "Lanyard" (para display)
  categoria: string;    // Categoría para agrupamiento
  sinonimos: string[];  // Variaciones que se mapean a este producto_base
}

export const PRODUCTOS_BASE: ProductoBase[] = [
  // ────────────────────────────────────────────────────────
  // MERCHANDISING
  // ────────────────────────────────────────────────────────
  {
    id: 'lanyard',
    nombre: 'Lanyard',
    categoria: 'Merchandising',
    sinonimos: ['lanyards', 'cordón', 'cordon de id', 'porta id', 'cinta porta credencial', 'porta fotocheck', 'cinta impresa']
  },
  {
    id: 'pin',
    nombre: 'Pin',
    categoria: 'Merchandising',
    sinonimos: ['pines', 'pin esmaltado', 'pin metalico', 'pin metálico', 'pin personalizado']
  },
  {
    id: 'llavero',
    nombre: 'Llavero',
    categoria: 'Merchandising',
    sinonimos: ['llaveros', 'llavero acrilico', 'llavero acrílico', 'llavero personalizado', 'llavero metal', 'keychain']
  },
  {
    id: 'bolsa',
    nombre: 'Bolsa',
    categoria: 'Merchandising',
    sinonimos: ['bolsas', 'bolsa de tela', 'bolsa ecologica', 'bolsa ecológica', 'bolsa reciclable', 'tote bag', 'bolsa publicitaria']
  },
  {
    id: 'lapicero',
    nombre: 'Lapicero',
    categoria: 'Merchandising',
    sinonimos: ['bolígrafo', 'boligrafo', 'pen', 'lapiceros', 'lapiceros personalizados', 'lapicero publicitario']
  },
  {
    id: 'cuaderno',
    nombre: 'Cuaderno',
    categoria: 'Merchandising',
    sinonimos: ['cuadernos', 'libreta', 'libretita', 'notebook']
  },
  {
    id: 'gorra',
    nombre: 'Gorra',
    categoria: 'Merchandising',
    sinonimos: ['gorras', 'cap', 'gorro', 'gorra bordada']
  },
  {
    id: 'polo',
    nombre: 'Polo',
    categoria: 'Merchandising',
    sinonimos: ['polos', 'camiseta', 'playera', 'poloshirt', 'polo publicitario', 't-shirt']
  },
  {
    id: 'casaca',
    nombre: 'Casaca',
    categoria: 'Merchandising',
    sinonimos: ['casacas', 'chaqueta', 'jacket', 'buzo', 'abrigo promocional']
  },
  {
    id: 'mochila',
    nombre: 'Mochila',
    categoria: 'Merchandising',
    sinonimos: ['mochilas', 'backpack', 'mochila escolar']
  },

  // ────────────────────────────────────────────────────────
  // PAPELERÍA E IMPRESIÓN
  // ────────────────────────────────────────────────────────
  {
    id: 'afiche',
    nombre: 'Afiche',
    categoria: 'Papelería e Impresión',
    sinonimos: ['afiches', 'poster', 'cartel', 'póster', 'afiches a3', 'afiches a2', 'afiches a1']
  },
  {
    id: 'volante',
    nombre: 'Volante',
    categoria: 'Papelería e Impresión',
    sinonimos: ['volantes', 'hoja volante', 'flyer', 'folleto', 'flyers', 'volanteo']
  },
  {
    id: 'tarjeta',
    nombre: 'Tarjeta',
    categoria: 'Papelería e Impresión',
    sinonimos: ['tarjetas', 'tarjeta presentación', 'business card', 'escort card', 'tarjeta de invitación']
  },
  {
    id: 'posavaso',
    nombre: 'Posavaso',
    categoria: 'Papelería e Impresión',
    sinonimos: ['posavasos', 'coaster']
  },
  {
    id: 'ticket',
    nombre: 'Ticket',
    categoria: 'Papelería e Impresión',
    sinonimos: ['tickets', 'recibo', 'boleta']
  },
  {
    id: 'impresion',
    nombre: 'Impresión',
    categoria: 'Papelería e Impresión',
    sinonimos: ['impresiones', 'printing', 'estampado', 'sublimado', 'impresión digital', 'impresión offset', 'impresión uv', 'impresión sublimada']
  },

  // ────────────────────────────────────────────────────────
  // PRODUCCIÓN GRÁFICA / MATERIALES
  // ────────────────────────────────────────────────────────
  {
    id: 'vinil',
    nombre: 'Vinilo',
    categoria: 'Producción Gráfica',
    sinonimos: ['vinyl', 'vinil adhesivo', 'vinil decorativo', 'sticker', 'vinilo', 'viniles', 'adhesivo']
  },
  {
    id: 'foam',
    nombre: 'Foam',
    categoria: 'Producción Gráfica',
    sinonimos: ['espuma foam', 'foam board', 'foamboard', 'panel foam']
  },
  {
    id: 'celtex',
    nombre: 'Celtex',
    categoria: 'Producción Gráfica',
    sinonimos: ['panel celtex', 'celtex blanco', 'cartón celtex', 'pvc espumado']
  },
  {
    id: 'acrilico',
    nombre: 'Acrílico',
    categoria: 'Producción Gráfica',
    sinonimos: ['acrílicos', 'acrilico', 'plexiglás', 'plexiglas', 'acrílico']
  },
  {
    id: 'mica',
    nombre: 'Mica',
    categoria: 'Producción Gráfica',
    sinonimos: ['micas', 'mica transparente']
  },
  {
    id: 'cuadro',
    nombre: 'Cuadro',
    categoria: 'Producción Gráfica',
    sinonimos: ['cuadros', 'marco', 'cuadro personalizado', 'cuadro selfie', 'marco gráfico']
  },

  // ────────────────────────────────────────────────────────
  // DECORACIÓN Y AMBIENTACIÓN
  // ────────────────────────────────────────────────────────
  {
    id: 'globo',
    nombre: 'Globo',
    categoria: 'Decoración y Ambientación',
    sinonimos: ['globos', 'balloon', 'globo metalizado', 'globos personalizados']
  },
  {
    id: 'adorno',
    nombre: 'Adorno',
    categoria: 'Decoración y Ambientación',
    sinonimos: ['adornos', 'ornamento', 'decoración']
  },
  {
    id: 'arbol',
    nombre: 'Árbol',
    categoria: 'Decoración y Ambientación',
    sinonimos: ['arbol', 'árbol', 'árbol navideño', 'arbol artificial', 'árbol decorativo']
  },
  {
    id: 'disfraz',
    nombre: 'Disfraz',
    categoria: 'Decoración y Ambientación',
    sinonimos: ['disfraces', 'traje']
  },
  {
    id: 'peluche',
    nombre: 'Peluche',
    categoria: 'Decoración y Ambientación',
    sinonimos: ['peluches', 'muñeco de peluche']
  },
  {
    id: 'golosina',
    nombre: 'Golosina',
    categoria: 'Decoración y Ambientación',
    sinonimos: ['golosinas', 'dulce', 'caramelo', 'chocolate', 'dulces promocionales']
  },

  // ────────────────────────────────────────────────────────
  // SERVICIOS
  // ────────────────────────────────────────────────────────
  {
    id: 'instalacion',
    nombre: 'Instalación',
    categoria: 'Servicios',
    sinonimos: ['instalaciones', 'montaje', 'instalación de viniles']
  },
  {
    id: 'transporte',
    nombre: 'Transporte',
    categoria: 'Servicios',
    sinonimos: ['transportes', 'envio', 'envío', 'taxi', 'movilidad', 'traslado']
  },
  {
    id: 'recojo',
    nombre: 'Recojo',
    categoria: 'Servicios',
    sinonimos: ['recojos', 'recogida']
  },
  {
    id: 'servicio_evento',
    nombre: 'Servicio de Evento',
    categoria: 'Servicios',
    sinonimos: ['servicios evento', 'coordinación evento', 'catering', 'día 1', 'día 2', 'apoyo evento', 'personal evento']
  },
  {
    id: 'servicio_diseno',
    nombre: 'Servicio de Diseño',
    categoria: 'Servicios',
    sinonimos: ['servicios diseño', 'diseño gráfico', 'diseño', 'arte', 'adaptación']
  },

  // ────────────────────────────────────────────────────────
  // OTROS
  // ────────────────────────────────────────────────────────
  {
    id: 'taza',
    nombre: 'Taza',
    categoria: 'Otros',
    sinonimos: ['tazas', 'mug', 'taza personalizada']
  },
  {
    id: 'vaso',
    nombre: 'Vaso',
    categoria: 'Otros',
    sinonimos: ['vasos', 'vaso personalizado', 'glass']
  },
  {
    id: 'trofeo',
    nombre: 'Trofeo',
    categoria: 'Otros',
    sinonimos: ['trofeos', 'medalla', 'premio']
  },
  {
    id: 'banderola',
    nombre: 'Banderola',
    categoria: 'Otros',
    sinonimos: ['banderolas', 'banner']
  },
  {
    id: 'senaletica',
    nombre: 'Señalética',
    categoria: 'Otros',
    sinonimos: ['senaletica', 'señalización', 'señalética']
  },
  {
    id: 'banner',
    nombre: 'Banner',
    categoria: 'Otros',
    sinonimos: ['banners', 'lona', 'banner publicitario']
  }
];

/**
 * Mapeo rápido de sinónimos a producto_base
 * Usado para normalización automática
 */
export const SINONIMOS_MAP: Record<string, string> = {};
PRODUCTOS_BASE.forEach(producto => {
  SINONIMOS_MAP[producto.id] = producto.id;
  producto.sinonimos.forEach(sinonimo => {
    SINONIMOS_MAP[sinonimo.toLowerCase()] = producto.id;
  });
});

/**
 * Obtener producto_base desde descripción
 * Busca en la descripción qué producto se menciona
 */
export function normalizarAProductoBase(descripcion: string): string | null {
  if (!descripcion) return null;

  const desc = descripcion.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const palabras = desc.split(/[\s\-,]+/);

  for (const palabra of palabras) {
    if (SINONIMOS_MAP[palabra]) {
      return SINONIMOS_MAP[palabra];
    }
  }

  return null;
}

/**
 * Obtener producto_base por ID
 */
export function obtenerProductoBase(id: string): ProductoBase | undefined {
  return PRODUCTOS_BASE.find(p => p.id === id);
}

/**
 * Agrupar productos_base por categoría
 */
export function agruparPorCategoria(): Record<string, ProductoBase[]> {
  const agrupados: Record<string, ProductoBase[]> = {};
  PRODUCTOS_BASE.forEach(producto => {
    if (!agrupados[producto.categoria]) {
      agrupados[producto.categoria] = [];
    }
    agrupados[producto.categoria].push(producto);
  });
  return agrupados;
}
