#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
CREAACTIVO LOGISTICS INTELLIGENCE SYSTEM
Process Intelligence Graph Builder (Celonis-Style)

Transforms event logs into a process-centric graph visualization
following Celonis object-centric process mining principles.
"""

import json
import os
import re
import unicodedata
from datetime import datetime
from pathlib import Path
from collections import defaultdict

import networkx as nx
from pyvis.network import Network

# Get project root (parent of scripts directory)
PROJECT_ROOT = Path(__file__).parent.parent
TRACES_DIR = PROJECT_ROOT / "knowledge_base" / "traces"
GRAPHS_DIR = PROJECT_ROOT / "knowledge_base" / "graphs"

# =============================================================================
# PROCESS STATES (Happy Path - Celonis Style)
# =============================================================================
PROCESS_STATES = [
    "cotizacion",
    "aprobado",
    "en_produccion",
    "listo_recoger",
    "entregado",
    "cerrado"
]

STATE_LABELS = {
    "cotizacion": "Cotizacion",
    "aprobado": "Aprobado",
    "en_produccion": "En Produccion",
    "listo_recoger": "Listo para Recoger",
    "entregado": "Entregado",
    "cerrado": "Cerrado"
}

# Map event types to process states
EVENT_TO_STATE = {
    "mensaje_acuerdo_produccion": "en_produccion",
    "mensaje_cambio_estado": None,  # Determined by context
    "mensaje_movimiento_movilidad": "entregado",
    "mensaje_consulta": None,  # Query, no state change
    "mensaje_registro_gasto": "en_produccion",
    "mensaje_pendientes": None,
    "mensaje_reporte": None,
    "mensaje_otro": None,
}

# =============================================================================
# NORMALIZATION FUNCTIONS
# =============================================================================

def normalize_text(text: str) -> str:
    """
    Normalize text: Title Case, remove accents for comparison,
    but preserve readable format.
    """
    if not text:
        return ""

    # Strip and title case
    normalized = text.strip().title()

    # Common corrections
    corrections = {
        "Patricia": "Patricia",
        "Angelica": "Angelica",
        "Angélica": "Angelica",
        "Tyc": "TYC",
        "Tic": "TYC",
        "T&C": "TYC",
        "Dhl": "DHL",
        "Hugo": "Hugo",
        "Johana": "Johana",
        "Viniles": "Viniles",
        "Vinilas": "Viniles",
        "Polos": "Polos",
    }

    for wrong, correct in corrections.items():
        if normalized == wrong:
            normalized = correct
            break

    return normalized


def remove_accents(text: str) -> str:
    """Remove accents for ID generation (keeps letters)."""
    if not text:
        return ""
    nfkd = unicodedata.normalize('NFKD', text)
    return ''.join(c for c in nfkd if not unicodedata.combining(c))


def generate_case_id(event: dict) -> str:
    """
    Generate a Case ID for an event.
    Priority: explicit caseId > pedido reference > actor+date grouping
    """
    # Check for explicit case ID
    if event.get("caseId"):
        return event["caseId"]

    # Check context for pedido reference
    context = event.get("context", {})
    if context.get("pedidoId"):
        return f"PED-{context['pedidoId']}"

    # Check artifacts for client/provider combination
    artifacts = event.get("artifacts", [])
    client = None
    provider = None

    for art in artifacts:
        if art.startswith("cliente:"):
            client = art.split(":", 1)[1]
        elif art.startswith("proveedor:"):
            provider = art.split(":", 1)[1]

    if client and provider:
        client_norm = remove_accents(normalize_text(client)).upper()[:3]
        provider_norm = remove_accents(normalize_text(provider)).upper()[:3]
        date_part = event.get("timestamp", "")[:10].replace("-", "")
        return f"CASE-{client_norm}-{provider_norm}-{date_part}"

    # Fallback: Actor + Date grouping
    actor = event.get("actor", "Unknown")
    timestamp = event.get("timestamp", "")[:10]  # YYYY-MM-DD
    actor_norm = remove_accents(actor).upper()[:3]
    date_norm = timestamp.replace("-", "")

    return f"CASE-{actor_norm}-{date_norm}"


def extract_state_from_event(event: dict) -> str:
    """
    Determine which process state an event belongs to.
    """
    action = event.get("action", "")
    context = event.get("context", {})

    # Check explicit state mapping
    if action in EVENT_TO_STATE:
        mapped_state = EVENT_TO_STATE[action]
        if mapped_state:
            return mapped_state

    # Check for state change events
    if "cambio_estado" in action:
        new_state = context.get("nuevoEstado", "")
        if new_state in PROCESS_STATES:
            return new_state

    # Check context for tipo
    tipo = context.get("tipo", "")
    if tipo == "acuerdo_produccion":
        return "en_produccion"
    elif tipo == "movimiento_movilidad":
        return "entregado"

    # Default: production phase for most activities
    return "en_produccion"


# =============================================================================
# DATA LOADING
# =============================================================================

def get_today_date():
    """Get today's date in YYYY-MM-DD format."""
    return datetime.now().strftime("%Y-%m-%d")


def load_today_events():
    """Load events from today's JSONL trace file."""
    today_file = TRACES_DIR / f"{get_today_date()}.jsonl"

    if not today_file.exists():
        print(f"No trace file found for today: {today_file}")
        return []

    events = []
    with open(today_file, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line:
                try:
                    events.append(json.loads(line))
                except json.JSONDecodeError as e:
                    print(f"Error parsing line: {e}")
                    continue

    return events


# =============================================================================
# GRAPH BUILDING (Celonis Process Intelligence Style)
# =============================================================================

def build_process_graph(events):
    """
    Build a process-centric graph following Celonis principles:
    - Central spine: Process States (Happy Path)
    - Cases flow through states
    - Resources (people) connected to activities
    - Artifacts (products, amounts) connected to cases
    """
    G = nx.DiGraph()

    # Track cases and their current states
    cases = defaultdict(lambda: {
        "state": "cotizacion",
        "events": [],
        "resources": set(),
        "artifacts": set(),
        "total_amount": 0
    })

    # ==========================================================================
    # STEP 1: Add Process State Nodes (The Happy Path Spine)
    # ==========================================================================
    state_x_positions = {}
    for i, state in enumerate(PROCESS_STATES):
        state_id = f"STATE_{state}"
        state_x_positions[state] = i * 200

        G.add_node(
            state_id,
            label=STATE_LABELS.get(state, state),
            color="#FFD700",  # Yellow - Activities/States
            title=f"Estado: {STATE_LABELS.get(state, state)}",
            group="state",
            size=40,
            level=1,  # Middle level for states
            x=i * 200,
            y=0,
            physics=False,  # Fixed position
            shape="box",
            font={"size": 16, "color": "#000000", "bold": True}
        )

    # Connect states in sequence (Happy Path)
    for i in range(len(PROCESS_STATES) - 1):
        from_state = f"STATE_{PROCESS_STATES[i]}"
        to_state = f"STATE_{PROCESS_STATES[i + 1]}"
        G.add_edge(
            from_state,
            to_state,
            color="#FFD700",
            width=4,
            title="Flujo normal",
            smooth={"type": "curvedCW", "roundness": 0.1}
        )

    # ==========================================================================
    # STEP 2: Process Events and Group by Case
    # ==========================================================================
    for event in events:
        # Skip "otro" type events (noise)
        context = event.get("context", {})
        if context.get("tipo") == "otro":
            continue

        # Generate case ID
        case_id = generate_case_id(event)

        # Determine state
        state = extract_state_from_event(event)

        # Update case info
        case_info = cases[case_id]
        case_info["events"].append(event)

        # Track state progression (only move forward)
        current_state_idx = PROCESS_STATES.index(case_info["state"]) if case_info["state"] in PROCESS_STATES else 0
        new_state_idx = PROCESS_STATES.index(state) if state in PROCESS_STATES else current_state_idx
        if new_state_idx > current_state_idx:
            case_info["state"] = state

        # Extract resources (people)
        actor = event.get("actor", "")
        if actor and actor != "Unknown":
            case_info["resources"].add(normalize_text(actor))

        # Extract artifacts
        for artifact in event.get("artifacts", []):
            if ":" in artifact:
                art_type, art_value = artifact.split(":", 1)
                art_value_norm = normalize_text(art_value)
                case_info["artifacts"].add(f"{art_type}:{art_value_norm}")

                # Track amounts
                if art_type == "monto":
                    try:
                        amount = float(re.sub(r'[^\d.]', '', art_value))
                        case_info["total_amount"] += amount
                    except:
                        pass

    # ==========================================================================
    # STEP 3: Add Case Nodes and Connect to States
    # ==========================================================================
    case_y_offset = 150
    case_idx = 0

    for case_id, case_info in cases.items():
        if not case_info["events"]:
            continue

        current_state = case_info["state"]
        state_x = state_x_positions.get(current_state, 0)

        # Create case node
        case_label = case_id.replace("CASE-", "")[:15]
        amount_str = f"\nS/.{case_info['total_amount']:.0f}" if case_info["total_amount"] > 0 else ""

        G.add_node(
            case_id,
            label=f"{case_label}{amount_str}",
            color="#1E90FF",  # Blue - Cases/Pedidos
            title=f"Caso: {case_id}\nEstado: {STATE_LABELS.get(current_state, current_state)}\nMonto Total: S/.{case_info['total_amount']:.2f}\nEventos: {len(case_info['events'])}",
            group="case",
            size=30 + min(case_info["total_amount"] / 50, 20),  # Size based on amount
            level=0,  # Above states
            x=state_x,
            y=-case_y_offset - (case_idx * 80),
            shape="dot"
        )

        # Connect case to its current state
        state_node = f"STATE_{current_state}"
        edge_width = 1 + min(case_info["total_amount"] / 100, 5)
        G.add_edge(
            case_id,
            state_node,
            color="#1E90FF",
            width=edge_width,
            title=f"En estado: {STATE_LABELS.get(current_state, current_state)}",
            dashes=False
        )

        # =======================================================================
        # STEP 4: Add Resource Nodes (Providers, Sellers)
        # =======================================================================
        for resource in case_info["resources"]:
            resource_id = f"RES_{remove_accents(resource).upper()}"

            if not G.has_node(resource_id):
                G.add_node(
                    resource_id,
                    label=resource,
                    color="#32CD32",  # Green - Resources
                    title=f"Recurso: {resource}",
                    group="resource",
                    size=25,
                    level=2,  # Below states
                    shape="diamond"
                )

            # Connect case to resource
            G.add_edge(
                case_id,
                resource_id,
                color="#32CD32",
                width=1,
                title="involucra",
                dashes=True
            )

        # =======================================================================
        # STEP 5: Add Key Artifacts (Clients, Products)
        # =======================================================================
        for artifact in case_info["artifacts"]:
            if ":" not in artifact:
                continue

            art_type, art_value = artifact.split(":", 1)

            # Only show important artifacts
            if art_type not in ["cliente", "proveedor", "producto"]:
                continue

            artifact_id = f"ART_{art_type}_{remove_accents(art_value).upper()}"

            if not G.has_node(artifact_id):
                # Color by type
                if art_type == "cliente":
                    color = "#9370DB"  # Purple - Clients
                elif art_type == "proveedor":
                    color = "#32CD32"  # Green - Providers
                else:
                    color = "#FFA500"  # Orange - Products

                G.add_node(
                    artifact_id,
                    label=art_value,
                    color=color,
                    title=f"{art_type.title()}: {art_value}",
                    group=art_type,
                    size=20,
                    level=2,
                    shape="ellipse"
                )

            # Connect case to artifact
            G.add_edge(
                case_id,
                artifact_id,
                color="#888888",
                width=1,
                title=art_type,
                dashes=True
            )

        case_idx += 1

    return G


# =============================================================================
# VISUALIZATION (Celonis Style)
# =============================================================================

def generate_html(G, output_path):
    """Generate interactive HTML visualization using pyvis with Celonis-style layout."""

    net = Network(
        height="900px",
        width="100%",
        bgcolor="#0D1117",  # Dark background like Celonis
        font_color="white",
        directed=True,
        notebook=False
    )

    # Configure for hierarchical left-to-right layout
    net.set_options("""
    {
        "nodes": {
            "font": {
                "size": 14,
                "face": "Segoe UI, Arial, sans-serif",
                "color": "white"
            },
            "borderWidth": 2,
            "borderWidthSelected": 4,
            "shadow": {
                "enabled": true,
                "color": "rgba(0,0,0,0.5)",
                "size": 10
            }
        },
        "edges": {
            "arrows": {
                "to": {
                    "enabled": true,
                    "scaleFactor": 0.5
                }
            },
            "color": {
                "inherit": false
            },
            "smooth": {
                "type": "cubicBezier",
                "forceDirection": "horizontal",
                "roundness": 0.4
            },
            "shadow": {
                "enabled": true,
                "color": "rgba(0,0,0,0.3)"
            }
        },
        "layout": {
            "hierarchical": {
                "enabled": true,
                "direction": "LR",
                "sortMethod": "directed",
                "levelSeparation": 250,
                "nodeSpacing": 100,
                "treeSpacing": 200,
                "blockShifting": true,
                "edgeMinimization": true,
                "parentCentralization": true
            }
        },
        "physics": {
            "enabled": false,
            "hierarchicalRepulsion": {
                "centralGravity": 0.0,
                "springLength": 200,
                "springConstant": 0.01,
                "nodeDistance": 150
            }
        },
        "interaction": {
            "hover": true,
            "tooltipDelay": 100,
            "navigationButtons": true,
            "keyboard": {
                "enabled": true
            },
            "zoomView": true,
            "dragView": true
        }
    }
    """)

    # Add nodes and edges from NetworkX graph
    net.from_nx(G)

    # Generate HTML with custom title
    html_content = net.generate_html()

    # Add custom header
    custom_header = """
    <div style="position: fixed; top: 10px; left: 10px; z-index: 1000;
                background: rgba(30, 144, 255, 0.9); padding: 10px 20px;
                border-radius: 8px; color: white; font-family: 'Segoe UI', sans-serif;">
        <h3 style="margin: 0;">CREAACTIVO - Process Intelligence Graph</h3>
        <small>Powered by Celonis-Style Process Mining</small>
    </div>
    <div style="position: fixed; bottom: 10px; right: 10px; z-index: 1000;
                background: rgba(0,0,0,0.7); padding: 10px; border-radius: 8px;
                color: white; font-family: 'Segoe UI', sans-serif; font-size: 12px;">
        <div><span style="color: #FFD700;">&#9632;</span> Estados (Flujo)</div>
        <div><span style="color: #1E90FF;">&#9679;</span> Casos/Pedidos</div>
        <div><span style="color: #32CD32;">&#9670;</span> Recursos</div>
        <div><span style="color: #9370DB;">&#9679;</span> Clientes</div>
        <div><span style="color: #FFA500;">&#9679;</span> Productos</div>
    </div>
    """

    # Insert custom header after body tag
    html_content = html_content.replace("<body>", f"<body>{custom_header}")

    # Save
    with open(output_path, "w", encoding="utf-8") as f:
        f.write(html_content)

    print(f"Graph saved to: {output_path}")


def main():
    """Main entry point."""
    print("=" * 60)
    print("CREAACTIVO - Process Intelligence Graph Builder")
    print("Celonis-Style Process Mining Visualization")
    print("=" * 60)
    print(f"\nBuilding graph for {get_today_date()}...")

    # Ensure output directory exists
    GRAPHS_DIR.mkdir(parents=True, exist_ok=True)

    # Load today's events
    events = load_today_events()
    print(f"Loaded {len(events)} events")

    if not events:
        print("No events to visualize. Creating empty graph with process flow.")
        G = nx.DiGraph()

        # Still show the Happy Path even with no events
        for i, state in enumerate(PROCESS_STATES):
            state_id = f"STATE_{state}"
            G.add_node(
                state_id,
                label=STATE_LABELS.get(state, state),
                color="#FFD700",
                title=f"Estado: {STATE_LABELS.get(state, state)}",
                group="state",
                size=40,
                shape="box"
            )

        for i in range(len(PROCESS_STATES) - 1):
            G.add_edge(
                f"STATE_{PROCESS_STATES[i]}",
                f"STATE_{PROCESS_STATES[i + 1]}",
                color="#FFD700",
                width=4
            )
    else:
        # Build the process graph
        G = build_process_graph(events)
        print(f"Built graph with {G.number_of_nodes()} nodes and {G.number_of_edges()} edges")

    # Generate HTML
    output_path = GRAPHS_DIR / "graph_today.html"
    generate_html(G, output_path)

    # Also save with date for history
    dated_path = GRAPHS_DIR / f"graph_{get_today_date()}.html"
    generate_html(G, dated_path)

    print("\n" + "=" * 60)
    print("Done! Graph features:")
    print("  - Hierarchical Left-to-Right layout (Celonis style)")
    print("  - Process states as central spine (Happy Path)")
    print("  - Cases grouped and connected to current state")
    print("  - Resources and artifacts linked to cases")
    print("  - Edge width reflects monetary importance")
    print("=" * 60)

    return str(output_path)


if __name__ == "__main__":
    main()
