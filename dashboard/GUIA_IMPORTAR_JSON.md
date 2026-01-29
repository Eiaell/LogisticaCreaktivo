# Guia para Generar JSON de Importacion - Dia a Dia (Resumen)

## Estructura Base

```json
{
  "fecha": "YYYY-MM-DD",
  "eventos_dia": [
    { ... evento 1 ... },
    { ... evento 2 ... }
  ]
}
```

- `fecha`: Obligatorio. Formato ISO: `"2026-01-22"`
- `eventos_dia`: Array obligatorio. Minimo 1 evento.

---

## Las 3 Secciones Validas

Solo existen 3 secciones. Si usas otra (ej: `COSTO_MATERIAL`, `PROCESO_INTERNO`), el evento se IGNORA silenciosamente.

| Seccion | Que registra | Tabla Supabase |
|---------|-------------|----------------|
| `MOVIMIENTO_LOGISTICO` | Entregas, recojos, instalaciones, intervenciones, traslados | `movimientos_logisticos` |
| `RENDICION_PAGO` | Gastos, pagos, movilidad, compras de materiales | `rendiciones` |
| `PRODUCCION` | Ordenes de produccion con proveedor | `eventos_produccion` |

---

## 1. MOVIMIENTO_LOGISTICO

### Tipos validos

| Tipo | Uso | Icono |
|------|-----|-------|
| `entrega` | Entregar productos/materiales a cliente o punto | 📦 |
| `recojo` | Recoger materiales de proveedor o punto | 🚚 |
| `compra` | Compra presencial de materiales (sin costo, solo el movimiento) | 🛒 |
| `traslado` | Mover materiales entre puntos | 🔄 |
| `instalacion` | Montaje, armado, implementacion en sitio | 🔧 |
| `intervencion` | Intervencion en sitio: cambio de tags, retiro, colocacion | 🛠️ |
| `supervision` | Inspeccion, verificacion en campo | 👁️ |
| `mantenimiento` | Reparacion, limpieza, ajustes | ⚙️ |
| `coordinacion` | Coordinacion general, tareas administrativas, llamadas | 📞 |
| `solicitud_stock` | Solicitud de stock a almacen | 📋 |
| `cotizacion` | Cotizacion en campo | 💬 |

### Estructura

```json
{
  "seccion": "MOVIMIENTO_LOGISTICO",
  "tipo": "entrega",
  "cliente": "Nombre del Cliente",
  "proveedor": "Nombre del Proveedor (opcional)",
  "estado": "completado",
  "detalle": {
    "items": [
      { "producto": "Volantes A5", "cantidad": 1000 },
      { "producto": "Banners", "cantidad": 5 }
    ]
  },
  "observaciones": "Texto libre opcional"
}
```

### Campos

| Campo | Obligatorio | Tipo | Notas |
|-------|------------|------|-------|
| `seccion` | SI | string | Siempre `"MOVIMIENTO_LOGISTICO"` |
| `tipo` | SI | string | Ver tabla de tipos arriba |
| `cliente` | NO (pero recomendado) | string | Nombre del cliente. Se guarda en MAYUSCULAS |
| `proveedor` | NO | string | Nombre del proveedor |
| `estado` | SI | string | Ver estados validos abajo |
| `detalle` | SI | object | Estructura flexible (ver abajo) |
| `observaciones` | NO | string | Texto libre |

### Detalle - Estructura flexible

El campo `detalle` acepta CUALQUIER estructura JSON. Sin embargo, para que se muestre correctamente en la UI, se recomienda:

**Para entregas/recojos (items):**
```json
{
  "items": [
    { "producto": "Nombre del producto", "cantidad": 100 }
  ]
}
```

**Para intervenciones/instalaciones (tareas en sitio):**
```json
{
  "proyecto": "Nombre del proyecto",
  "lugares_intervenidos": [
    { "tipo": "Departamento", "cantidad": 2 }
  ],
  "tareas": [
    "Tarea 1",
    "Tarea 2"
  ]
}
```

**Para coordinacion/administrativo:**
```json
{
  "modalidad": "Remota",
  "ubicacion": "Oficina"
}
```

---

## 2. RENDICION_PAGO

### Tipos validos

| Tipo | Uso |
|------|-----|
| `movilidad` | Taxi, transporte, combustible |
| `compra_material` | Compra de materiales e insumos |
| `adelanto_produccion` | Adelanto a proveedor por produccion |
| `pago_saldo` | Pago de saldo pendiente |
| `gasto_extra` | Gasto extraordinario |
| `caja_diaria` | Gasto de caja diaria |
| `viaticos` | Alimentacion, gastos en campo |
| `caja_chica` | Gastos menores de caja chica |

### Estructura

```json
{
  "seccion": "RENDICION_PAGO",
  "tipo": "compra_material",
  "cliente": "Grupo Lar",
  "proveedor": "Tienda Publicitaria",
  "monto": 2125.59,
  "moneda": "PEN",
  "estado": "pagado",
  "detalle": {
    "concepto": "Descripcion de lo que se pago",
    "forma_pago": "Contado"
  },
  "observaciones": "Texto libre opcional"
}
```

### Campos

| Campo | Obligatorio | Tipo | Notas |
|-------|------------|------|-------|
| `seccion` | SI | string | Siempre `"RENDICION_PAGO"` |
| `tipo` | SI | string | Ver tabla de tipos arriba |
| `cliente` | NO | string | Cliente asociado al gasto |
| `proveedor` | NO | string | A quien se le pago |
| `monto` | SI | number | **PRIMER NIVEL, no dentro de detalle** |
| `moneda` | NO | string | `"PEN"` (default) o `"USD"` |
| `estado` | SI | string | Ver estados validos abajo |
| `detalle` | SI | object | Ver estructura abajo |
| `observaciones` | NO | string | Texto libre |

### Detalle - Estructura recomendada

**Para movilidad:**
```json
{
  "concepto": "Taxi ida y vuelta San Isidro",
  "monto": 12.00,
  "moneda": "PEN"
}
```

**Para compra de materiales:**
```json
{
  "concepto": "Tomatodos x150 + Bolsas x150",
  "forma_pago": "Contado",
  "op_gravadas": 1528.27,
  "igv": 273.08
}
```

**Para adelanto de produccion:**
```json
{
  "porcentaje": 50,
  "monto_pagado": 500.00,
  "moneda": "PEN",
  "incluye_igv": false,
  "factura_requerida": true
}
```

### ERRORES COMUNES en Rendiciones

| Error | Correcto |
|-------|----------|
| `"costo_soles": 50` dentro de detalle | `"monto": 50` como campo de primer nivel |
| `"seccion": "COSTO_MATERIAL"` | `"seccion": "RENDICION_PAGO"` con `"tipo": "compra_material"` |
| No poner moneda | Siempre poner `"moneda": "PEN"` o `"USD"` |

---

## 3. PRODUCCION

### Tipos validos

| Tipo | Uso |
|------|-----|
| `orden_produccion` | Unico tipo. Toda orden de produccion usa este. |

### Estructura

```json
{
  "seccion": "PRODUCCION",
  "tipo": "orden_produccion",
  "cliente": "Grupo Lar",
  "proveedor": "Imprenta Cuche",
  "producto": "Volantes A5",
  "cantidad": 4000,
  "estado": "en_produccion",
  "detalle": {
    "precio_por_millar_sin_igv": 105.00,
    "especificaciones": "Couche 150gr, full color ambas caras"
  },
  "observaciones": "Texto libre opcional"
}
```

### Campos

| Campo | Obligatorio | Tipo | Notas |
|-------|------------|------|-------|
| `seccion` | SI | string | Siempre `"PRODUCCION"` |
| `tipo` | SI | string | Siempre `"orden_produccion"` |
| `cliente` | SI | string | Cliente que solicita la produccion |
| `proveedor` | SI | string | Proveedor que produce |
| `producto` | SI | string | **PRIMER NIVEL** - Que se produce |
| `cantidad` | NO | number | **PRIMER NIVEL** - Cantidad en unidades |
| `estado` | SI | string | Ver estados validos abajo |
| `detalle` | NO | object | Precio, especificaciones |
| `observaciones` | NO | string | Texto libre |

### Detalle - Estructura recomendada

```json
{
  "precio_por_millar_sin_igv": 105.00,
  "especificaciones": "Couche 150gr, full color"
}
```

El sistema calcula automaticamente:
- `precio_unitario` = `precio_por_millar_sin_igv`
- `precio_total` = `(cantidad / 1000) * precio_por_millar_sin_igv`

---

## Estados Validos (para todas las secciones)

| Estado | Uso |
|--------|-----|
| `completado` | Tarea terminada |
| `pendiente` | Aun no se hace |
| `registrado` | Solo registrado, sin accion |
| `pagado` | Pago realizado (ideal para rendiciones) |
| `en_produccion` | En proceso de produccion |
| `en_proceso` | En proceso general |
| `rechazado` | Rechazado |
| `cancelado` | Cancelado |

---

## Reglas Importantes

### 1. NO usar tildes ni caracteres especiales problematicos
Al copiar/pegar JSON, las tildes y caracteres como `S/.` pueden introducir "control characters" invisibles que rompen el JSON. Alternativas seguras:
- `Intervencion` en vez de `Intervención`
- `S/. 50` escribirlo como `50` (numero) o `"50 soles"` (texto)
- `Cantua` en vez de `Cantúa`

### 2. Campos de PRIMER NIVEL vs dentro de DETALLE
Estos campos van AFUERA de detalle (primer nivel del evento):
- `monto` y `moneda` (rendiciones)
- `producto` y `cantidad` (produccion)
- `proveedor` (todas las secciones)
- `cliente` (todas las secciones)

### 3. Secciones que NO existen
Estas secciones se IGNORAN silenciosamente:
- `COSTO_MATERIAL` -> Usar `RENDICION_PAGO` con `tipo: "compra_material"`
- `PROCESO_INTERNO` -> Usar `MOVIMIENTO_LOGISTICO` con `tipo: "coordinacion"`
- `ADMINISTRATIVO` -> Usar `MOVIMIENTO_LOGISTICO` con `tipo: "coordinacion"`
- `COMPRA` -> Usar `RENDICION_PAGO` con `tipo: "compra_material"`
- Cualquier otra -> Se ignora

### 4. El campo `detalle` es flexible
Puedes poner cualquier estructura dentro de `detalle`. El sistema lo guarda tal cual en Supabase como JSONB. Solo los campos de primer nivel tienen estructura fija.

### 5. Cliente se guarda en MAYUSCULAS
`"cliente": "Grupo Lar"` se guardara como `"GRUPO LAR"` automaticamente.

---

## Ejemplos Completos por Tipo de Dia

### Dia de entregas y recojos
```json
{
  "fecha": "2026-01-23",
  "eventos_dia": [
    {
      "seccion": "MOVIMIENTO_LOGISTICO",
      "tipo": "recojo",
      "cliente": "Grupo Lar",
      "proveedor": "Dennis",
      "estado": "completado",
      "detalle": {
        "items": [
          { "producto": "Volantes", "cantidad": 2000 },
          { "producto": "Muestra de color", "cantidad": 1 }
        ]
      },
      "observaciones": "Recojo en Centro de Lima"
    },
    {
      "seccion": "MOVIMIENTO_LOGISTICO",
      "tipo": "entrega",
      "cliente": "Grupo Lar",
      "estado": "completado",
      "detalle": {
        "items": [
          { "producto": "Volantes Proyecto Zendai", "cantidad": 1000 },
          { "producto": "Volantes Proyecto D34", "cantidad": 1000 }
        ]
      },
      "observaciones": "Distribucion en proyectos del cliente"
    },
    {
      "seccion": "RENDICION_PAGO",
      "tipo": "movilidad",
      "cliente": "Grupo Lar",
      "monto": 25.00,
      "moneda": "PEN",
      "estado": "registrado",
      "detalle": {
        "concepto": "Taxi ida Centro de Lima + vuelta oficina"
      }
    }
  ]
}
```

### Dia de intervenciones en campo
```json
{
  "fecha": "2026-01-22",
  "eventos_dia": [
    {
      "seccion": "MOVIMIENTO_LOGISTICO",
      "tipo": "intervencion",
      "cliente": "Grupo Lar",
      "estado": "completado",
      "detalle": {
        "proyecto": "D34",
        "lugares_intervenidos": [
          { "tipo": "Departamento piloto", "cantidad": 1 },
          { "tipo": "Oficina", "cantidad": 1 }
        ],
        "tareas": [
          "Retiro de tags antiguos",
          "Limpieza con thinner",
          "Colocacion de nuevos tags"
        ]
      },
      "observaciones": "Cambio de tags en dos espacios"
    },
    {
      "seccion": "RENDICION_PAGO",
      "tipo": "viaticos",
      "cliente": "Grupo Lar",
      "monto": 15.00,
      "moneda": "PEN",
      "estado": "registrado",
      "detalle": {
        "concepto": "Almuerzo en campo"
      }
    }
  ]
}
```

### Dia de compras y produccion
```json
{
  "fecha": "2026-01-24",
  "eventos_dia": [
    {
      "seccion": "RENDICION_PAGO",
      "tipo": "compra_material",
      "cliente": "Grupo Lar",
      "proveedor": "Tienda Publicitaria",
      "monto": 2125.59,
      "moneda": "PEN",
      "estado": "pagado",
      "detalle": {
        "concepto": "Tomatodos sublimables x150 + Bolsas con fuelle x150",
        "forma_pago": "Contado"
      },
      "observaciones": "Compra presencial en Ate"
    },
    {
      "seccion": "PRODUCCION",
      "tipo": "orden_produccion",
      "cliente": "Grupo Lar",
      "proveedor": "Arteck Jhonn",
      "producto": "Tomatodos sublimados",
      "cantidad": 150,
      "estado": "en_produccion",
      "detalle": {
        "especificaciones": "Sublimacion full color con logo cliente"
      },
      "observaciones": "Materiales entregados al proveedor"
    },
    {
      "seccion": "RENDICION_PAGO",
      "tipo": "movilidad",
      "cliente": "Grupo Lar",
      "monto": 30.00,
      "moneda": "PEN",
      "estado": "registrado",
      "detalle": {
        "concepto": "Taxi Ate ida y vuelta"
      }
    }
  ]
}
```

---

## Checklist Rapido antes de Importar

- [ ] `fecha` en formato `YYYY-MM-DD`
- [ ] Cada evento tiene `seccion` valida: `MOVIMIENTO_LOGISTICO`, `RENDICION_PAGO` o `PRODUCCION`
- [ ] Cada evento tiene `tipo` valido para su seccion (ver tablas arriba)
- [ ] Cada evento tiene `estado` valido
- [ ] Rendiciones: `monto` y `moneda` estan como campos de PRIMER NIVEL (no dentro de detalle)
- [ ] Produccion: `producto` y `proveedor` estan como campos de PRIMER NIVEL
- [ ] No hay tildes ni caracteres especiales que puedan romper el JSON al copiar/pegar
- [ ] JSON validado (pegar en jsonlint.com si hay dudas)
