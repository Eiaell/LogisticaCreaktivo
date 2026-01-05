#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
CREAACTIVO LOGISTICS INTELLIGENCE SYSTEM
Context Graph Builder

Reads today's JSONL trace file and generates an interactive graph visualization.
"""

import json
import os
from datetime import datetime
from pathlib import Path

import networkx as nx
from pyvis.network import Network

# Get project root (parent of scripts directory)
PROJECT_ROOT = Path(__file__).parent.parent
TRACES_DIR = PROJECT_ROOT / "knowledge_base" / "traces"
GRAPHS_DIR = PROJECT_ROOT / "knowledge_base" / "graphs"


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


def build_graph(events):
    """Build a NetworkX directed graph from events."""
    G = nx.DiGraph()

    for i, event in enumerate(events):
        actor = event.get("actor", "Unknown")
        action = event.get("action", "unknown_action")
        timestamp = event.get("timestamp", "")
        artifacts = event.get("artifacts", [])
        context = event.get("context", {})

        # Create unique event node ID
        event_id = f"Event_{i}_{action}"

        # Add actor node (blue for people)
        if not G.has_node(actor):
            G.add_node(actor,
                       label=actor,
                       color="#4A90D9",  # Blue
                       title=f"Actor: {actor}",
                       group="actor",
                       size=30)

        # Add event node (red for events)
        event_label = action.replace("_", " ").title()
        time_short = timestamp[11:19] if len(timestamp) >= 19 else timestamp
        G.add_node(event_id,
                   label=f"{event_label}\n{time_short}",
                   color="#D94A4A",  # Red
                   title=f"Action: {action}\nTime: {timestamp}\nContext: {json.dumps(context, ensure_ascii=False, indent=2)}",
                   group="event",
                   size=25)

        # Connect actor to event
        G.add_edge(actor, event_id, title="performed")

        # Add artifact nodes (green for items)
        for artifact in artifacts:
            # Parse artifact format "Type:Value"
            if ":" in artifact:
                art_type, art_value = artifact.split(":", 1)
            else:
                art_type = "Item"
                art_value = artifact

            artifact_id = f"{art_type}:{art_value}"

            if not G.has_node(artifact_id):
                G.add_node(artifact_id,
                           label=art_value,
                           color="#4AD96A",  # Green
                           title=f"{art_type}: {art_value}",
                           group="artifact",
                           size=20)

            # Connect event to artifact
            G.add_edge(event_id, artifact_id, title=art_type.lower())

    return G


def generate_html(G, output_path):
    """Generate interactive HTML visualization using pyvis."""
    # Create pyvis network
    net = Network(
        height="800px",
        width="100%",
        bgcolor="#1a1a2e",
        font_color="white",
        directed=True,
        notebook=False
    )

    # Configure physics for better layout
    net.set_options("""
    {
        "nodes": {
            "font": {
                "size": 14,
                "face": "Segoe UI, Arial, sans-serif"
            },
            "borderWidth": 2,
            "borderWidthSelected": 4
        },
        "edges": {
            "arrows": {
                "to": {
                    "enabled": true,
                    "scaleFactor": 0.5
                }
            },
            "color": {
                "color": "#848484",
                "highlight": "#ffffff"
            },
            "smooth": {
                "type": "curvedCW",
                "roundness": 0.2
            }
        },
        "physics": {
            "forceAtlas2Based": {
                "gravitationalConstant": -50,
                "centralGravity": 0.01,
                "springLength": 150,
                "springConstant": 0.08
            },
            "minVelocity": 0.75,
            "solver": "forceAtlas2Based",
            "stabilization": {
                "enabled": true,
                "iterations": 200
            }
        },
        "interaction": {
            "hover": true,
            "tooltipDelay": 200,
            "navigationButtons": true
        }
    }
    """)

    # Add nodes and edges from NetworkX graph
    net.from_nx(G)

    # Generate HTML
    net.save_graph(str(output_path))
    print(f"Graph saved to: {output_path}")


def main():
    """Main entry point."""
    print(f"Building context graph for {get_today_date()}...")

    # Ensure output directory exists
    GRAPHS_DIR.mkdir(parents=True, exist_ok=True)

    # Load today's events
    events = load_today_events()
    print(f"Loaded {len(events)} events")

    if not events:
        print("No events to visualize. Creating empty graph.")
        # Create a placeholder graph with a single node
        G = nx.DiGraph()
        G.add_node("No events today",
                   label="No events recorded yet",
                   color="#888888",
                   size=30)
    else:
        # Build the graph
        G = build_graph(events)
        print(f"Built graph with {G.number_of_nodes()} nodes and {G.number_of_edges()} edges")

    # Generate HTML
    output_path = GRAPHS_DIR / "graph_today.html"
    generate_html(G, output_path)

    # Also save with date for history
    dated_path = GRAPHS_DIR / f"graph_{get_today_date()}.html"
    generate_html(G, dated_path)

    print("Done!")
    return str(output_path)


if __name__ == "__main__":
    main()
