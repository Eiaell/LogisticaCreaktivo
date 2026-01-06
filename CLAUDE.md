# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Creaactivo Logistics Intelligence System** - An AI-powered WhatsApp bot for capturing and querying logistics decisions in real-time. The system uses voice-first interaction, allowing a logistics coordinator to speak naturally about their daily operations while the system extracts, structures, and visualizes the data.

**Primary user context**: Logistics coordinator (Huber) in Lima, Peru working with promotional materials suppliers (shirts, prints, fabrics, vinyls). All interactions are in Spanish.

**Vision**: Transform chaotic daily logistics communications into a structured Process Intelligence Graph (inspired by Celonis) that enables pattern recognition, bottleneck identification, and decision optimization.

## Development Commands

```bash
npm run dev      # Start with tsx (hot reload)
npm run watch    # Start with tsx watch mode
npm run build    # Compile TypeScript to dist/
npm start        # Run compiled JS from dist/
npm run sync     # Build knowledge graph and sync to Google Drive
npm run auth     # Setup Google OAuth authentication
```

## Required Environment Variables

Copy `.env.example` to `.env` and configure:
- `OPENAI_API_KEY` - For Whisper audio transcription (optional, using local Whisper)
- `ANTHROPIC_API_KEY` - For Claude entity extraction
- `FLACO_NUMERO` - Authorized WhatsApp number (Peru format: 51XXXXXXXXX)
- `GOOGLE_CREDENTIALS_PATH` (optional) - OAuth credentials JSON path
- `GOOGLE_DRIVE_FOLDER_ID` (optional) - Drive folder for backups

## Architecture

### High-Level Data Flow
```
┌─────────────┐    ┌──────────────┐    ┌─────────────┐    ┌──────────────┐
│  WhatsApp   │───▶│   Whisper    │───▶│   Claude    │───▶│   Storage    │
│  (Audio/    │    │ Transcription│    │  Extraction │    │  (JSON/JSONL)│
│   Text)     │    │ + Corrections│    │  + Classify │    │              │
└─────────────┘    └──────────────┘    └─────────────┘    └──────────────┘
                                                                  │
                                                                  ▼
┌─────────────┐    ┌──────────────┐    ┌─────────────────────────────────┐
│Google Drive │◀───│  Sync Script │◀───│  Process Intelligence Graph    │
│   Backup    │    │  (Python)    │    │  (Celonis-Style Visualization) │
└─────────────┘    └──────────────┘    └─────────────────────────────────┘
```

### Detailed Component Flow

1. **WhatsApp Client** (`src/whatsapp/client.ts`)
   - Uses `whatsapp-web.js` with Puppeteer
   - Listens to `message_create` events (processes user's OWN messages)
   - Filters: Only processes messages from self-chat or "Logibot" groups
   - Anti-loop protection: Ignores messages containing `📝` or `{"tipo"`

2. **Transcription** (`src/services/transcription.ts`)
   - Uses LOCAL Whisper via `faster-whisper` (Python/Anaconda)
   - Post-processing corrections for business-specific terms
   - Corrections map: `tic`→`TYC`, `patricia`→`Patricia`, etc.
   - Also exports `aplicarCorrecciones()` for text messages

3. **Entity Extraction** (`src/services/extraction.ts`)
   - Claude API extracts structured data from natural language
   - Classifies into message types (see below)
   - Returns JSON with extracted entities
   - Uses correction history to improve future extractions

4. **Message Handlers** (`src/whatsapp/handlers.ts`)
   - Routes extractions to appropriate storage handlers
   - Special commands: `CORREGIR:`, `STATS`
   - Applies text corrections before extraction

5. **Event Logger** (`src/services/eventLogger.ts`) - **Celonis-Style**
   - Logs events in JSONL format with Celonis ontology
   - Fields: `caseId`, `activity`, `timestamp`, `resource`, `processState`
   - Auto-generates Case IDs from client+provider+date
   - 30-minute session continuity window

6. **Process Graph Builder** (`scripts/build_graph.py`)
   - Reads JSONL traces and builds NetworkX graph
   - Celonis-style visualization with PyVis
   - Hierarchical Left-to-Right layout
   - Happy Path: Cotización → Aprobado → Producción → Listo → Entregado → Cerrado

7. **Google Drive Sync** (`src/services/driveSync.ts`)
   - OAuth 2.0 authentication (user credentials, not service account)
   - Syncs `knowledge_base/` folder to Drive
   - Manual sync via `npm run sync`

### Key Types (`src/models/types.ts`)

- **Pedido**: Customer order with state machine
  - States: `cotizacion` → `aprobado` → `en_produccion` → `listo_recoger` → `en_campo` → `entregado` → `cerrado`
- **Proveedor**: Supplier with price/time history
- **AcuerdoProduccion**: Production agreement with supplier
  - States: `pendiente` → `listo` → `recogido` → `problema`
- **MovimientoMovilidad**: Transportation movement with cost tracking
- **GastoExtraordinario**: Extraordinary expenses requiring reimbursement

### Message Types Extracted by Claude

The extraction service classifies messages into:
- `acuerdo_produccion` - Supplier production orders (triggers `en_produccion` state)
- `consulta` - Queries about history, prices, times
- `movimiento_movilidad` - Transportation movements (triggers `entregado` state)
- `cambio_estado` - Status updates
- `registro_gasto` - Expense registration
- `pendientes` - Pending items query
- `reporte` - Report requests (movilidad/gastos/produccion)
- `otro` - Unclassified (filtered from graph)

### Storage Structure

**JSON Data** (`data/`):
- `YYYY-MM-DD.json` - Daily aggregated data (acuerdos, movilidad, gastos)
- `pedidos.json`, `proveedores.json` - Master data
- `historial.json` - Message history with extractions
- `correcciones.json` - User corrections for learning
- `audios/YYYY-MM/` - Audio file backups

**Knowledge Base** (`knowledge_base/`):
- `traces/YYYY-MM-DD.jsonl` - Daily event logs (Celonis format)
- `graphs/graph_today.html` - Interactive process visualization
- `graphs/graph_YYYY-MM-DD.html` - Historical graphs

### Celonis-Style Process Mining

The system implements concepts from Celonis Process Mining:

**Ontology:**
- **Case ID**: Unique identifier for a business process instance (e.g., `CASE-TYC-PAT-20260105`)
- **Activity**: What happened (e.g., `mensaje_acuerdo_produccion`)
- **Timestamp**: When it happened (ISO 8601)
- **Resource**: Who did it (e.g., `Usuario`, `Bot`)
- **Process State**: Current position in Happy Path

**Graph Visualization:**
- Yellow boxes: Process States (Happy Path spine)
- Blue circles: Cases/Pedidos (size = monetary value)
- Green diamonds: Resources (providers, sellers)
- Purple ellipses: Clients
- Orange ellipses: Products
- Edge width: Reflects monetary importance

**Case ID Generation Logic:**
1. Explicit `caseId` in context
2. `pedidoId` reference → `PED-{id}`
3. Client + Provider found → `CASE-{CLI}-{PRV}-{DATE}`
4. Session continuity (30 min window) → reuse last case
5. Fallback → `CASE-{DATE}-{RANDOM}`

## Text/Audio Corrections System

Business-specific corrections applied to all input (`src/services/transcription.ts`):

```typescript
const CORRECCIONES = {
  // People
  'hubo': 'Hugo', 'angelica': 'Angélica', 'yohana': 'Johana',
  // Locations
  'mira flores': 'Miraflores', 'san isidro': 'San Isidro',
  // Clients - IMPORTANT
  'tic': 'TYC', 't&c': 'TYC', 'tec': 'TYC',
  // Companies
  'dhel': 'DHL',
};
```

**User Correction Command:**
```
CORREGIR: el cliente es TYC, no TIC
```
- Saves original + correction to `correcciones.json`
- Used as examples in future Claude extractions

## Key Patterns & Gotchas

1. **WhatsApp Loop Prevention**: Bot responds to its own messages, so `client.ts` filters out messages containing `📝` or `{"tipo"`

2. **Self-Chat Mode**: Bot only processes messages from the user's own chat or "Logibot" groups (not messages from others)

3. **Local Whisper**: Uses Anaconda Python at `D:/Anaconda/python.exe` with `faster-whisper`

4. **Corrections Apply to Both**: `aplicarCorrecciones()` is called for audio transcriptions AND text messages

5. **Case Continuity**: Events within 30 minutes without explicit case info are grouped under the same case

6. **Graph Filters Noise**: Events with `tipo: "otro"` are excluded from the process graph

## File Organization

```
D:\LOGISTICA\
├── src/
│   ├── whatsapp/
│   │   ├── client.ts      # WhatsApp connection & event handling
│   │   └── handlers.ts    # Message processing & routing
│   ├── services/
│   │   ├── transcription.ts   # Whisper + corrections
│   │   ├── extraction.ts      # Claude entity extraction
│   │   ├── eventLogger.ts     # Celonis-style event logging
│   │   ├── driveSync.ts       # Google Drive sync
│   │   ├── storage.ts         # File storage utilities
│   │   ├── daily-storage.ts   # Daily JSON aggregation
│   │   ├── memoria.ts         # History & corrections
│   │   └── queries.ts         # Query processing
│   ├── config/
│   │   └── constants.ts       # Business constants
│   └── models/
│       └── types.ts           # TypeScript interfaces
├── scripts/
│   ├── build_graph.py         # Process graph builder (Python)
│   ├── setup_auth.ts          # Google OAuth setup
│   ├── sync.ts                # Manual sync script
│   └── whisper_transcribe.py  # Local Whisper transcription
├── knowledge_base/
│   ├── traces/                # JSONL event logs
│   └── graphs/                # HTML visualizations
├── data/
│   ├── *.json                 # Business data
│   └── audios/                # Audio backups
└── .wwebjs_auth/              # WhatsApp session
```

## Scheduled Tasks

- **End-of-day reminder**: 5:30 PM Mon-Sat (configurable via `REMINDER_CRON`)
- **Drive sync**: Manual via `npm run sync` (can be automated)

## Current Limitations & Known Issues

1. **No automatic case linking**: Events don't automatically link to existing pedidos
2. **Corrections don't modify saved data**: `CORREGIR:` only teaches for future, doesn't update the record
3. **Single user**: System designed for one logistics coordinator
4. **No real-time graph updates**: Must run `npm run sync` to regenerate graph
5. **Spanish only**: All prompts and processing assume Spanish input

## Future Improvements (Ideas)

1. **Auto-link to Pedidos**: Use Claude to identify which existing pedido an event relates to
2. **Real-time Dashboard**: WebSocket-based live graph updates
3. **Anomaly Detection**: Alert when process deviates from Happy Path
4. **Cost Analytics**: Aggregate and visualize spending patterns
5. **Multi-user Support**: Handle multiple coordinators
6. **Mobile App**: Native app instead of WhatsApp dependency
