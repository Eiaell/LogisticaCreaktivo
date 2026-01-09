
const events = [
    {
        timestamp: "2023-01-01T00:00:00Z",
        action: "create",
        actor: "user",
        context: {
            proveedor: "New Vendor", // User updated this in file
            cliente: "New Client",
            tipo: "pedido"
        },
        caseId: "CASE-1"
    }
];

// Logic from DatabaseContext.tsx (simplified)
function parseEventsToPedidos(events) {
    // ... creates simple pedido object
    return {
        pedidos: [{
            id: "CASE-1",
            vendedora: events[0].context.proveedor,
            cliente: events[0].context.cliente,
            precio: 100,
            descripcion: "Desc"
        }],
        payments: []
    };
}

const prev = [{
    id: "CASE-1",
    vendedora: "Old Vendor", // Exists in state
    cliente: "Old Client",
    precio: 100,
    descripcion: "Desc"
}];

const { pedidos: parsed } = parseEventsToPedidos(events);

console.log("Parsed (New):", parsed[0].vendedora);
console.log("Previous (Old):", prev[0].vendedora);

// The Buggy Merge Logic
const merged = parsed.map(p => {
    const existing = prev.find(old => old.id === p.id);
    if (existing) {
        return {
            ...p,
            vendedora: existing.vendedora || p.vendedora, // <--- This keeps "Old Vendor"
            cliente: existing.cliente || p.cliente
        };
    }
    return p;
});

console.log("Merged Result:", merged[0].vendedora);

if (merged[0].vendedora === "Old Vendor") {
    console.log("FAIL: Logic kept the old data instead of new file data.");
} else {
    console.log("SUCCESS: Logic used new data.");
}
