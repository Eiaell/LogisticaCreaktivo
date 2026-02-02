const fs = require('fs');
const p = 'D:/LOGISTICA/VIDEOROJO/focus-video-generator/index.html';
let lines = fs.readFileSync(p, 'utf8').split('\n');

// Find "var sentenceWpms = {};" line and add save/load functions after the global vars block
let insertIdx = -1;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('var sentenceWpms = {}')) {
    insertIdx = i + 1;
    break;
  }
}

if (insertIdx < 0) {
  console.log('ERROR: Could not find sentenceWpms declaration');
  process.exit(1);
}

const saveLoadCode = [
  '',
  '    // ---- LocalStorage: guardar y restaurar estado ----',
  '    function saveState() {',
  '      try {',
  '        var state = {',
  '          text: document.getElementById("textInput").value,',
  '          wpm: document.getElementById("wpm").value,',
  '          fontSize: document.getElementById("fontSize").value,',
  '          bgColor: document.getElementById("bgColor").value,',
  '          textColor: document.getElementById("textColor").value,',
  '          focusColor: document.getElementById("focusColor").value,',
  '          sentenceWpms: sentenceWpms,',
  '          videoWidth: videoWidth,',
  '          videoHeight: videoHeight',
  '        };',
  '        localStorage.setItem("focusVideoState", JSON.stringify(state));',
  '      } catch(e) {}',
  '    }',
  '',
  '    function loadState() {',
  '      try {',
  '        var saved = localStorage.getItem("focusVideoState");',
  '        if (!saved) return;',
  '        var state = JSON.parse(saved);',
  '        if (state.text) document.getElementById("textInput").value = state.text;',
  '        if (state.wpm) document.getElementById("wpm").value = state.wpm;',
  '        if (state.fontSize) document.getElementById("fontSize").value = state.fontSize;',
  '        if (state.bgColor) document.getElementById("bgColor").value = state.bgColor;',
  '        if (state.textColor) document.getElementById("textColor").value = state.textColor;',
  '        if (state.focusColor) document.getElementById("focusColor").value = state.focusColor;',
  '        if (state.sentenceWpms) sentenceWpms = state.sentenceWpms;',
  '        if (state.videoWidth) videoWidth = state.videoWidth;',
  '        if (state.videoHeight) videoHeight = state.videoHeight;',
  '        // Activar el botón de formato correcto',
  '        document.querySelectorAll(".format-btn").forEach(function(btn) {',
  '          var w = parseInt(btn.getAttribute("data-w"));',
  '          var h = parseInt(btn.getAttribute("data-h"));',
  '          btn.classList.toggle("active", w === videoWidth && h === videoHeight);',
  '        });',
  '        // Actualizar sentence editor si hay texto',
  '        if (state.text && typeof updateSentenceEditor === "function") {',
  '          updateSentenceEditor();',
  '        }',
  '      } catch(e) {}',
  '    }',
  '',
  '    // Auto-guardar en cada cambio',
  '    function attachSaveListeners() {',
  '      ["textInput","wpm","fontSize","bgColor","textColor","focusColor"].forEach(function(id) {',
  '        var el = document.getElementById(id);',
  '        if (el) {',
  '          el.addEventListener("input", saveState);',
  '          el.addEventListener("change", saveState);',
  '        }',
  '      });',
  '      document.querySelectorAll(".format-btn").forEach(function(btn) {',
  '        btn.addEventListener("click", function() { setTimeout(saveState, 100); });',
  '      });',
  '    }',
  '',
];
lines.splice(insertIdx, 0, ...saveLoadCode);
console.log('Inserted save/load functions after line ' + insertIdx);

// Now find where the page initializes (look for DOMContentLoaded or window.onload or end of script)
// We need to call loadState() and attachSaveListeners() on page load
// Look for updateSentenceEditor call or similar init code
let initIdx = -1;
for (let i = insertIdx; i < lines.length; i++) {
  // Look for the first call that seems like initialization at the end of the script
  if (lines[i].includes('</script>')) {
    initIdx = i;
    break;
  }
}

if (initIdx >= 0) {
  const initCode = [
    '',
    '    // Cargar estado guardado al iniciar',
    '    loadState();',
    '    attachSaveListeners();',
    '',
  ];
  lines.splice(initIdx, 0, ...initCode);
  console.log('Inserted init calls before </script> at line ' + initIdx);
}

// Also hook saveState into setSentenceWpm so custom WPMs are saved
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('function setSentenceWpm(') || lines[i].includes('function resetAllSentenceWpms(')) {
    // Find the closing brace of this function
    let braceCount = 0;
    let started = false;
    for (let j = i; j < lines.length; j++) {
      if (lines[j].includes('{')) { braceCount++; started = true; }
      if (lines[j].includes('}')) braceCount--;
      if (started && braceCount === 0) {
        // Insert saveState() before the closing brace
        lines.splice(j, 0, '      saveState();');
        console.log('Added saveState() to ' + lines[i].trim().split('(')[0] + ' at line ' + (j+1));
        break;
      }
    }
  }
}

fs.writeFileSync(p, lines.join('\n'), 'utf8');
console.log('Done');
