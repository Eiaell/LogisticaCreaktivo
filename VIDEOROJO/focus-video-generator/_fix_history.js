const fs = require('fs');
const p = 'D:/LOGISTICA/VIDEOROJO/focus-video-generator/index.html';
let lines = fs.readFileSync(p, 'utf8').split('\n');

// 1. Add CSS for history sidebar before </style>
let styleEnd = -1;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('</style>')) { styleEnd = i; break; }
}

const css = [
  '',
  '    /* Layout con sidebar historial */',
  '    .page-layout { display: flex; gap: 1rem; }',
  '    .page-main { flex: 1; min-width: 0; }',
  '    .history-sidebar {',
  '      width: 240px;',
  '      flex-shrink: 0;',
  '      background: #111;',
  '      border-radius: 12px;',
  '      border: 1px solid #333;',
  '      padding: 1rem;',
  '      max-height: calc(100vh - 3rem);',
  '      overflow-y: auto;',
  '      position: sticky;',
  '      top: 1.5rem;',
  '    }',
  '    .history-sidebar h3 {',
  '      font-size: 0.85rem;',
  '      color: #aaa;',
  '      margin-bottom: 0.75rem;',
  '      display: flex;',
  '      justify-content: space-between;',
  '      align-items: center;',
  '    }',
  '    .history-sidebar h3 button {',
  '      background: none;',
  '      border: none;',
  '      color: #666;',
  '      cursor: pointer;',
  '      font-size: 0.7rem;',
  '      padding: 2px 6px;',
  '      border-radius: 4px;',
  '    }',
  '    .history-sidebar h3 button:hover { color: #ff3b30; background: #222; }',
  '    .history-item {',
  '      background: #1a1a1a;',
  '      border: 1px solid #2a2a2a;',
  '      border-radius: 8px;',
  '      padding: 0.6rem;',
  '      margin-bottom: 0.5rem;',
  '      cursor: pointer;',
  '      transition: border-color 0.2s;',
  '    }',
  '    .history-item:hover { border-color: #ff3b30; }',
  '    .history-item-title {',
  '      font-size: 0.8rem;',
  '      color: #ddd;',
  '      white-space: nowrap;',
  '      overflow: hidden;',
  '      text-overflow: ellipsis;',
  '      margin-bottom: 4px;',
  '    }',
  '    .history-item-meta {',
  '      font-size: 0.65rem;',
  '      color: #666;',
  '      display: flex;',
  '      justify-content: space-between;',
  '    }',
  '    .history-item-delete {',
  '      background: none;',
  '      border: none;',
  '      color: #555;',
  '      cursor: pointer;',
  '      font-size: 0.65rem;',
  '      padding: 0;',
  '      float: right;',
  '    }',
  '    .history-item-delete:hover { color: #ff3b30; }',
  '    .history-empty {',
  '      color: #555;',
  '      font-size: 0.75rem;',
  '      text-align: center;',
  '      padding: 2rem 0;',
  '    }',
  '    @media (max-width: 1100px) {',
  '      .history-sidebar { width: 200px; }',
  '    }',
  '    @media (max-width: 900px) {',
  '      .page-layout { flex-direction: column; }',
  '      .history-sidebar {',
  '        width: 100%;',
  '        max-height: 200px;',
  '        position: static;',
  '        order: -1;',
  '      }',
  '    }',
  '',
];
lines.splice(styleEnd, 0, ...css);
console.log('Added CSS');

// 2. Wrap the .container content in page-layout and add sidebar HTML
// Find '<div class="container">' and the main-layout div
let containerLine = -1;
let mainLayoutLine = -1;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('<div class="container">')) containerLine = i;
  if (lines[i].includes('<div class="main-layout">')) { mainLayoutLine = i; break; }
}

// Insert page-layout wrapper before main-layout, and sidebar after
// Add opening div before main-layout
if (mainLayoutLine >= 0) {
  // Insert page-layout + page-main before main-layout
  lines.splice(mainLayoutLine, 0,
    '    <div class="page-layout">',
    '    <div class="page-main">'
  );
  console.log('Added page-layout wrapper');
}

// Find </div> that closes the container and add sidebar + closing divs before it
// Find the closing </body> and insert sidebar before the last container close
let bodyLine = -1;
for (let i = lines.length - 1; i >= 0; i--) {
  if (lines[i].includes('</body>')) { bodyLine = i; break; }
}

// Find the </div> just before </body> that closes .container
// We need to insert sidebar and close page-main and page-layout before container closes
// Look for the script end tag
let scriptEnd = -1;
for (let i = lines.length - 1; i >= 0; i--) {
  if (lines[i].includes('</script>')) { scriptEnd = i; break; }
}

// Insert closing divs and sidebar HTML after </script> but before the closing container </div>
if (scriptEnd >= 0) {
  const sidebarHTML = [
    '',
    '    </div><!-- end page-main -->',
    '',
    '    <!-- Sidebar Historial -->',
    '    <div class="history-sidebar" id="historySidebar">',
    '      <h3>Historial <button onclick="clearHistory()" title="Limpiar todo">Limpiar</button></h3>',
    '      <div id="historyList">',
    '        <div class="history-empty">Sin proyectos guardados</div>',
    '      </div>',
    '    </div>',
    '',
    '    </div><!-- end page-layout -->',
  ];
  // Insert after </script>
  lines.splice(scriptEnd + 1, 0, ...sidebarHTML);
  console.log('Added sidebar HTML');
}

// 3. Add history JS functions - find the saveState function and add history functions nearby
let loadStateLine = -1;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('function loadState()')) { loadStateLine = i; break; }
}

// Find attachSaveListeners closing and add history functions after it
let attachEnd = -1;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('function attachSaveListeners()')) {
    let braces = 0; let started = false;
    for (let j = i; j < lines.length; j++) {
      if (lines[j].includes('{')) { braces++; started = true; }
      if (lines[j].includes('}')) braces--;
      if (started && braces === 0) { attachEnd = j; break; }
    }
    break;
  }
}

if (attachEnd >= 0) {
  const historyJS = [
    '',
    '    // ---- Historial de proyectos ----',
    '    function getHistory() {',
    '      try { return JSON.parse(localStorage.getItem("focusVideoHistory") || "[]"); }',
    '      catch(e) { return []; }',
    '    }',
    '',
    '    function saveToHistory() {',
    '      var text = document.getElementById("textInput").value;',
    '      if (!text.trim()) return;',
    '      var words = text.trim().split(/\\s+/).filter(function(w){return w;});',
    '      var title = text.trim().substring(0, 60).replace(/[\\n\\r]+/g, " ");',
    '      var entry = {',
    '        id: Date.now(),',
    '        title: title,',
    '        wordCount: words.length,',
    '        wpm: document.getElementById("wpm").value,',
    '        text: text,',
    '        fontSize: document.getElementById("fontSize").value,',
    '        bgColor: document.getElementById("bgColor").value,',
    '        textColor: document.getElementById("textColor").value,',
    '        focusColor: document.getElementById("focusColor").value,',
    '        sentenceWpms: JSON.parse(JSON.stringify(sentenceWpms)),',
    '        videoWidth: videoWidth,',
    '        videoHeight: videoHeight,',
    '        date: new Date().toLocaleString("es-PE")',
    '      };',
    '      var history = getHistory();',
    '      // No duplicar si el texto es igual al ultimo',
    '      if (history.length > 0 && history[0].text === text) {',
    '        history[0] = entry;',
    '      } else {',
    '        history.unshift(entry);',
    '      }',
    '      // Max 20 entradas',
    '      if (history.length > 20) history = history.slice(0, 20);',
    '      localStorage.setItem("focusVideoHistory", JSON.stringify(history));',
    '      renderHistory();',
    '    }',
    '',
    '    function loadFromHistory(id) {',
    '      var history = getHistory();',
    '      var entry = history.find(function(h) { return h.id === id; });',
    '      if (!entry) return;',
    '      document.getElementById("textInput").value = entry.text || "";',
    '      document.getElementById("wpm").value = entry.wpm || 300;',
    '      document.getElementById("fontSize").value = entry.fontSize || 120;',
    '      document.getElementById("bgColor").value = entry.bgColor || "#000000";',
    '      document.getElementById("textColor").value = entry.textColor || "#ffffff";',
    '      document.getElementById("focusColor").value = entry.focusColor || "#ff3b30";',
    '      if (entry.sentenceWpms) sentenceWpms = entry.sentenceWpms;',
    '      if (entry.videoWidth) videoWidth = entry.videoWidth;',
    '      if (entry.videoHeight) videoHeight = entry.videoHeight;',
    '      document.querySelectorAll(".format-btn").forEach(function(btn) {',
    '        var w = parseInt(btn.getAttribute("data-w"));',
    '        var h = parseInt(btn.getAttribute("data-h"));',
    '        if (w && h) btn.classList.toggle("active", w === videoWidth && h === videoHeight);',
    '      });',
    '      if (typeof updateSentenceEditor === "function") updateSentenceEditor();',
    '      if (typeof updateWordCount === "function") updateWordCount();',
    '      saveState();',
    '    }',
    '',
    '    function deleteFromHistory(id, evt) {',
    '      if (evt) evt.stopPropagation();',
    '      var history = getHistory().filter(function(h) { return h.id !== id; });',
    '      localStorage.setItem("focusVideoHistory", JSON.stringify(history));',
    '      renderHistory();',
    '    }',
    '',
    '    function clearHistory() {',
    '      localStorage.removeItem("focusVideoHistory");',
    '      renderHistory();',
    '    }',
    '',
    '    function renderHistory() {',
    '      var list = document.getElementById("historyList");',
    '      if (!list) return;',
    '      var history = getHistory();',
    '      if (history.length === 0) {',
    '        list.innerHTML = \'<div class="history-empty">Sin proyectos guardados</div>\';',
    '        return;',
    '      }',
    '      list.innerHTML = history.map(function(h) {',
    '        return \'<div class="history-item" onclick="loadFromHistory(\' + h.id + \')">\' +',
    '          \'<button class="history-item-delete" onclick="deleteFromHistory(\' + h.id + \', event)">x</button>\' +',
    '          \'<div class="history-item-title">\' + h.title.replace(/</g,"&lt;") + \'</div>\' +',
    '          \'<div class="history-item-meta"><span>\' + h.wordCount + \' palabras | \' + h.wpm + \' wpm</span><span>\' + h.date + \'</span></div>\' +',
    '          \'</div>\';',
    '      }).join("");',
    '    }',
    '',
  ];
  lines.splice(attachEnd + 1, 0, ...historyJS);
  console.log('Added history JS functions');
}

// 4. Hook saveToHistory into the generate button click
// Find where generate sends the request and add saveToHistory call
// Look for "Generando video" or the generate fetch/XHR
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes("Generando video") && lines[i].includes("statusText")) {
    // Add saveToHistory right before this line
    lines.splice(i, 0, '      saveToHistory();');
    console.log('Hooked saveToHistory into generate at line ' + (i+1));
    break;
  }
}

// 5. Call renderHistory on page load - find where loadState() is called
for (let i = 0; i < lines.length; i++) {
  if (lines[i].trim() === 'loadState();') {
    lines.splice(i + 1, 0, '    renderHistory();');
    console.log('Added renderHistory() on load');
    break;
  }
}

fs.writeFileSync(p, lines.join('\n'), 'utf8');
console.log('Done - history sidebar added');
