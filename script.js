/* --- CONSTANTES --- */
const DISCONNECT_DATA = { "200": 20, "400": 26, "600": 30, "800": 32, "1000": 34, "1200": 36, "1600": 40, "2000": 44, "2500": 48 };
const PANEL_DATA = { "200": 22, "225": 24, "250": 26, "400": 30, "600": 36, "800": 42 };

const DISCONNECT_AMPS_SORTED = Object.keys(DISCONNECT_DATA).map(Number).sort((a,b) => a-b);
const PANEL_AMPS_SORTED = Object.keys(PANEL_DATA).map(Number).sort((a,b) => a-b);

const AMP_OPTIONS = [200, 400, 600, 800, 1000, 1200, 1600, 2000, 2500];
const CT_CABINET_OPTIONS = [600, 800, 1000, 1200];
const CONDUIT_SIZES = [2.0, 2.5, 3.0, 3.5, 4.0, 5.0, 6.0];
const SPACING = 3; 

/* --- ESTADO --- */
let state = {
    isFeederEnabled: true,
    feeder: { type: 'DIRECT', conduitSize: 4.0, sets: 1, amps: 200 },
    loads: [],
    theme: 'light' // Nuevo estado para el tema
};

/* --- INICIALIZACIÓN --- */
document.addEventListener('DOMContentLoaded', () => {
    // Cargar tema guardado
    const savedTheme = localStorage.getItem('theme') || 'light';
    applyTheme(savedTheme);

    renderFeederInputs();
    calculateAndRender();
    renderExportButton();
});

/* --- LÓGICA DE TEMA (DARK MODE) --- */
function toggleTheme() {
    const newTheme = state.theme === 'light' ? 'dark' : 'light';
    applyTheme(newTheme);
}

function applyTheme(themeName) {
    state.theme = themeName;
    document.documentElement.setAttribute('data-theme', themeName);
    localStorage.setItem('theme', themeName);
    
    // Actualizar icono del botón
    const btn = document.getElementById('btnThemeToggle');
    if(btn) {
        btn.innerHTML = themeName === 'light' 
            ? '<i class="fa-solid fa-moon"></i>' 
            : '<i class="fa-solid fa-sun"></i>';
    }

    // Redibujar SVG porque los colores cambian
    calculateAndRender();
}


/* --- LÓGICA DEL FEEDER --- */
function toggleFeeder() {
    state.isFeederEnabled = !state.isFeederEnabled;
    const isActive = state.isFeederEnabled;
    
    const btn = document.getElementById('btnFeederToggle');
    if(btn) {
        btn.className = `btn-toggle ${isActive ? 'active' : 'inactive'}`;
        btn.innerText = isActive ? "ON" : "OFF";
    }
    
    const content = document.getElementById('feederContent');
    if(content) content.classList.toggle('opacity-40', !isActive);
    
    const box = document.getElementById('feederBox');
    if(box) {
        // En dark mode usamos las variables CSS
        box.style.borderLeftColor = isActive ? "var(--blue-500)" : "var(--border-subtle)";
    }

    calculateAndRender();
}

function updateFeederType() {
    const el = document.getElementById('feederType');
    if(!el) return;
    const type = el.value;
    state.feeder.type = type;

    if (type === 'CT_CABINET' && !CT_CABINET_OPTIONS.includes(state.feeder.amps)) {
        state.feeder.amps = 600;
    }

    renderFeederInputs();
    calculateAndRender();
}

function updateFeederValue(field, value) {
    let val = parseFloat(value);
    if (field === 'sets') val = Math.max(1, parseInt(value) || 1);
    state.feeder[field] = val;
    calculateAndRender();
}

function renderFeederInputs() {
    const container = document.getElementById('feederDynamicFields');
    if(!container) return;
    
    let html = '';

    if (state.feeder.type === 'DIRECT') {
        const conduitOptions = CONDUIT_SIZES.map(s => `<option value="${s}" ${s === state.feeder.conduitSize ? 'selected' : ''}>${s}"</option>`).join('');
        html = `
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
            <div class="input-group">
                <label class="input-label">DIAM (IN)</label>
                <select class="input-custom" onchange="updateFeederValue('conduitSize', this.value)">${conduitOptions}</select>
            </div>
            <div class="input-group">
                <label class="input-label">SETS</label>
                <input type="number" min="1" class="input-custom" value="${state.feeder.sets}" onchange="updateFeederValue('sets', this.value)">
            </div>
        </div>`;
    } else {
        const currentOptions = state.feeder.type === 'CT_CABINET' ? CT_CABINET_OPTIONS : AMP_OPTIONS;
        const ampOptionsHtml = currentOptions.map(a => `<option value="${a}" ${a === state.feeder.amps ? 'selected' : ''}>${a}A</option>`).join('');
        html = `
        <div class="input-group">
            <label class="input-label">AMPERAGE</label>
            <select class="input-custom" onchange="updateFeederValue('amps', this.value)">${ampOptionsHtml}</select>
        </div>`;
    }
    container.innerHTML = html;
}

/* --- GESTIÓN DE CARGAS --- */

function addLoad(type) {
    state.loads.push({ 
        id: Date.now().toString() + Math.random().toString(36).substr(2, 5), 
        type, 
        amps: 200, 
        meterSize: 'SMALL',
        isCustom: false,
        customWidth: 10
    });
    calculateAndRender();
}

function removeLoad(id) {
    state.loads = state.loads.filter(l => l.id !== id);
    calculateAndRender();
}

function updateLoad(id, field, value) {
    const load = state.loads.find(l => l.id === id);
    if (load) {
        load[field] = field === 'meterSize' ? value : parseInt(value);
        calculateAndRender();
    }
}

function toggleCustomMode(id) {
    const load = state.loads.find(l => l.id === id);
    if (load) {
        load.isCustom = !load.isCustom;
        calculateAndRender();
    }
}

function updateCustomWidth(id, value) {
    const load = state.loads.find(l => l.id === id);
    if (load) {
        let val = parseFloat(value);
        if (isNaN(val) || val < 0) val = 0;
        load.customWidth = val;
        calculateAndRender();
    }
}

function renderLoadList() {
    const container = document.getElementById('loadListContainer');
    document.getElementById('itemsCount').innerText = `${state.loads.length} Active Loads`;

    if (state.loads.length === 0) {
        container.innerHTML = `
            <div style="padding: 3rem; text-align: center; color: var(--text-muted);">
                <i class="fa-solid fa-layer-group" style="font-size: 2.5rem; margin-bottom: 1rem; opacity:0.3;"></i>
                <span style="font-weight: 700; font-size: 0.9rem; display:block;">NO LOADS ADDED</span>
                <span style="font-size: 0.8rem;">Use the sidebar to add items</span>
            </div>`;
        return;
    }

    container.innerHTML = state.loads.map(l => {
        // Icon colors can remain specific (branding), but backgrounds adjust slightly via opacity or blending if needed.
        // For simplicity we keep the original icon palettes as they work on dark/light
        let bgIcon = l.type === 'PANELBOARD' ? 'var(--blue-100)' : l.type === 'DISCONNECT' ? 'var(--emerald-100)' : 'var(--amber-100)';
        let colorIcon = l.type === 'PANELBOARD' ? 'var(--blue-600)' : l.type === 'DISCONNECT' ? 'var(--emerald-500)' : 'var(--amber-500)';
        
        // En dark mode, oscurecemos un poco el fondo de los iconos para que no brillen tanto
        if (state.theme === 'dark') {
            bgIcon = l.type === 'PANELBOARD' ? '#1e3a8a' : l.type === 'DISCONNECT' ? '#064e3b' : '#78350f'; // Darker variants
            colorIcon = l.type === 'PANELBOARD' ? '#93c5fd' : l.type === 'DISCONNECT' ? '#6ee7b7' : '#fcd34d'; // Lighter text
        }

        let mainControlHtml = '';
        if (l.isCustom) {
            mainControlHtml = `
            <div style="position:relative;">
                <input type="number" step="0.5" class="input-custom" 
                    style="padding-right: 1.5rem; width: 100px; height: 2.75rem;" 
                    value="${l.customWidth}" 
                    onchange="updateCustomWidth('${l.id}', this.value)">
                <span style="position:absolute; right: 10px; top: 50%; transform: translateY(-50%); font-size: 0.7rem; color: var(--text-muted); font-weight:700;">"</span>
            </div>`;
        } else {
            if (l.type === 'METER') {
                mainControlHtml = `
                <select class="input-custom" style="width: 100px; height: 2.75rem; padding: 0 0.5rem;" onchange="updateLoad('${l.id}', 'meterSize', this.value)">
                    <option value="SMALL" ${l.meterSize === 'SMALL'?'selected':''}>SMALL</option>
                    <option value="LARGE" ${l.meterSize === 'LARGE'?'selected':''}>LARGE</option>
                </select>`;
            } else {
                const availableAmps = l.type === 'PANELBOARD' ? PANEL_AMPS_SORTED : (l.type === 'DISCONNECT' ? DISCONNECT_AMPS_SORTED : AMP_OPTIONS);
                const options = availableAmps.map(a => `<option value="${a}" ${a === l.amps ? 'selected' : ''}>${a}A</option>`).join('');
                mainControlHtml = `<select class="input-custom" style="width: 100px; height: 2.75rem; padding: 0 0.5rem;" onchange="updateLoad('${l.id}', 'amps', this.value)">${options}</select>`;
            }
        }

        // Estilos Botón Regla
        let buttonStyle = l.isCustom 
            ? `background: #f3e8ff; border: 1px solid #d8b4fe;` 
            : `background: var(--bg-input); border: 2px solid var(--border-subtle);`;
        
        // En dark mode, ajuste visual del botón activo
        if (state.theme === 'dark' && l.isCustom) {
             buttonStyle = `background: #4c1d95; border: 1px solid #a78bfa;`;
        }
            
        let buttonIconColor = l.isCustom ? (state.theme === 'dark' ? '#d8b4fe' : '#9333ea') : '#6366f1';

        return `
        <div class="load-item" style="display: flex; flex-wrap: wrap; gap: 1rem; align-items: center; justify-content: space-between; padding: 1.25rem; border-bottom: 1px solid var(--border-subtle);">
            
            <div style="display: flex; gap: 1rem; align-items: center; min-width: 140px;">
                <div style="width: 3rem; height: 3rem; background: ${bgIcon}; color: ${colorIcon}; border-radius: 0.85rem; display: flex; align-items: center; justify-content: center; font-weight: 900; font-size: 1.25rem;">
                    ${l.type.charAt(0)}
                </div>
                <div>
                    <div style="font-weight: 800; font-size: 0.85rem; color: var(--text-primary);">${l.type}</div>
                    <div style="font-family: monospace; font-size: 0.7rem; color: var(--text-muted);">ID: ${l.id.slice(-3)}</div>
                </div>
            </div>
            
            <div style="display: flex; align-items: center; gap: 0.75rem;">
                <button onclick="toggleCustomMode('${l.id}')" title="Manual Size"
                    style="width: 2.75rem; height: 2.75rem; border-radius: 0.75rem; cursor: pointer; display:flex; align-items:center; justify-content:center; ${buttonStyle} color: ${buttonIconColor}; transition: 0.2s;">
                    <i class="fa-solid fa-ruler-horizontal"></i>
                </button>
                
                ${mainControlHtml}
                
                <button onclick="removeLoad('${l.id}')" class="btn-icon-only" style="width: 2rem; height: 2rem; margin-left: 0.5rem; display:flex; align-items:center; justify-content:center; font-size: 1rem;">
                    <i class="fa-solid fa-times"></i>
                </button>
            </div>
        </div>`;
    }).join('');
}

/* --- EXPORTAR PDF --- */
function renderExportButton() {
    const headerActions = document.getElementById('headerActions');
    if (headerActions && headerActions.innerHTML === '') {
        const btn = document.createElement('button');
        btn.innerHTML = '<i class="fa-solid fa-file-pdf"></i> PDF';
        btn.style.cssText = `
            padding: 0.75rem 1.5rem; background: var(--text-primary); color: var(--bg-panel); border: none; 
            border-radius: 0.75rem; font-weight: 700; cursor: pointer; font-size: 0.85rem;
            display: flex; align-items: center; gap: 0.6rem; transition: all 0.2s;
            box-shadow: 0 4px 6px rgba(0,0,0, 0.15);
        `;
        btn.onclick = exportReport;
        headerActions.appendChild(btn);
    }
}

function exportReport() {
    const printArea = document.getElementById('printArea');
    if (!printArea) return;

    const totalVal = document.getElementById('totalIn').innerText;
    const totalFt = document.getElementById('totalFt').innerText;
    
    // Clonar y preparar SVG para impresión (Limpiar clases de dark mode)
    let svgElement = document.getElementById('svgContainer').querySelector('svg');
    let svgContent = '';
    if (svgElement) {
        let clonedSvg = svgElement.cloneNode(true);
        clonedSvg.removeAttribute('width');
        clonedSvg.removeAttribute('height');
        clonedSvg.style.width = '100%'; 
        
        // Forzar colores claros para el PDF
        const bgRect = clonedSvg.querySelector('rect[fill="#1e293b"], rect[fill="#334155"], rect[fill="#e2e8f0"]');
        if(bgRect) bgRect.setAttribute('fill', '#e2e8f0');

        svgContent = clonedSvg.outerHTML;
    }

    const date = new Date().toLocaleDateString();
    let itemsRows = '';
    
    if (state.isFeederEnabled) {
        let desc = (state.feeder.type === 'DIRECT') ? `Conduit: ${state.feeder.conduitSize}" (${state.feeder.sets} sets)` : `${state.feeder.amps} Amps`;
        let fW = (state.feeder.type === 'DIRECT') ? (state.feeder.conduitSize * state.feeder.sets) + (SPACING * (state.feeder.sets - 1)) : (state.feeder.type === 'DISCONNECT' ? (DISCONNECT_DATA[state.feeder.amps] || 0) : (state.feeder.amps <= 600 ? 32 : 48));

        itemsRows += `<tr><td><strong>MAIN FEEDER</strong></td><td>${state.feeder.type}</td><td>${desc}</td><td>${fW.toFixed(1)}"</td></tr>`;
    }

    state.loads.forEach((l, index) => {
        let desc = l.isCustom ? 'Manual Size' : (l.type === 'METER' ? l.meterSize : l.amps + 'A');
        let widthDisplay = l.isCustom ? l.customWidth : (l.type === 'PANELBOARD' ? (PANEL_DATA[l.amps]||0) : (l.type === 'DISCONNECT' ? (DISCONNECT_DATA[l.amps]||0) : (l.meterSize === 'LARGE' ? 12 : 9.6)));

        itemsRows += `<tr><td>${index + 1}. ${l.type}</td><td>${l.isCustom ? 'Custom' : 'Standard'}</td><td>${desc}</td><td>${parseFloat(widthDisplay).toFixed(1)}"</td></tr>`;
    });

    const reportHTML = `
        <div style="padding: 2rem; max-width: 100%; margin: 0 auto; font-family: 'Inter', sans-serif;">
            <div style="display:flex; justify-content:space-between; align-items:center; border-bottom: 2px solid #333; padding-bottom: 1rem; margin-bottom: 2rem;">
                <div><h1 style="margin:0; font-size: 1.5rem; color: #1e293b;">Wireway Calculation Report</h1><p style="margin:0.5rem 0 0; color: #64748b;">Generated on ${date}</p></div>
                <div style="text-align:right;"><div style="font-size: 0.8rem; text-transform:uppercase; color: #64748b; font-weight:700;">Total Length</div><div style="font-size: 2.5rem; font-weight: 900; color: #2563eb;">${totalVal}"</div><div style="font-size: 1rem; color: #64748b; font-weight:600;">${totalFt}</div></div>
            </div>
            <div style="margin-bottom: 2rem;"><h3 style="color: #475569; border-bottom: 1px solid #e2e8f0; padding-bottom: 0.5rem;">Visual Layout</h3><div style="margin-top: 1rem; padding: 1rem;">${svgContent}</div></div>
            <div><h3 style="color: #475569; border-bottom: 1px solid #e2e8f0; padding-bottom: 0.5rem;">Load Details & Dimensions</h3><table class="print-table"><thead><tr><th>Item Type</th><th>Config</th><th>Rating/Size</th><th>Width</th></tr></thead><tbody>${itemsRows}</tbody></table></div>
            <div style="margin-top: 4rem; text-align: center; color: #cbd5e1; font-size: 0.8rem;"><p>Brightronix Wireway Calculator</p></div>
        </div>
    `;

    printArea.innerHTML = reportHTML;
    window.print();
}

/* --- MOTOR DE CÁLCULO --- */
function calculateAndRender() {
    renderLoadList();

    let fW = 0;
    if (state.isFeederEnabled) {
        if (state.feeder.type === 'DIRECT') fW = (state.feeder.conduitSize * state.feeder.sets) + (SPACING * (state.feeder.sets - 1));
        else if (state.feeder.type === 'DISCONNECT') fW = DISCONNECT_DATA[state.feeder.amps] || 0;
        else fW = state.feeder.amps <= 600 ? 32 : (state.feeder.amps <= 1200 ? 36 : 48);
    }

    let total = SPACING; 
    let hasPreviousItem = false;

    if (state.isFeederEnabled && fW > 0) {
        total += fW;
        hasPreviousItem = true;
    }

    const calculatedLoads = state.loads.map(l => {
        let w = 0;
        if (l.isCustom) w = l.customWidth;
        else if (l.type === 'PANELBOARD') w = PANEL_DATA[l.amps] || 0;
        else if (l.type === 'DISCONNECT') w = DISCONNECT_DATA[l.amps] || 0;
        else w = (l.meterSize === 'LARGE' ? 12 : 9.6);
        
        if (hasPreviousItem) total += SPACING;
        total += w;
        hasPreviousItem = true;
        return { ...l, width: w };
    });

    total += SPACING;
    if (total < SPACING * 2) total = SPACING * 2;

    const elIn = document.getElementById('totalIn');
    const elFt = document.getElementById('totalFt');
    if(elIn) elIn.innerText = total.toFixed(1);
    if(elFt) elFt.innerText = (total / 12).toFixed(2) + " FT";

    drawVisualizer(fW, calculatedLoads, total);
}

function drawVisualizer(feederWidth, calcLoads, totalWidth) {
    const container = document.getElementById('svgContainer');
    if(!container) return;

    const scale = 5; 
    const rectHeight = 60;
    let currentX = SPACING;
    const svgWidth = (totalWidth * scale) + 50;
    
    // COLOR DINÁMICO DEL WIREWAY SEGÚN TEMA
    // Light: #e2e8f0 (Slate-200) | Dark: #334155 (Slate-700)
    const wirewayFill = state.theme === 'light' ? '#e2e8f0' : '#334155';
    
    let svgContent = `<svg viewBox="0 0 ${svgWidth} 150" xmlns="http://www.w3.org/2000/svg" style="max-height: 150px;">
        <rect x="0" y="30" width="${totalWidth * scale}" height="80" fill="${wirewayFill}" rx="8" />`;

    if (state.isFeederEnabled && feederWidth > 0) {
        svgContent += `
        <g transform="translate(${currentX * scale}, 40)">
            <rect width="${feederWidth * scale}" height="${rectHeight}" fill="#2563eb" rx="4" />
            <text x="5" y="15" fill="white" font-size="10" font-weight="bold" font-family="sans-serif">MAIN</text>
            <text x="${(feederWidth * scale) - 5}" y="${rectHeight - 5}" text-anchor="end" fill="white" font-size="11" font-weight="900" font-family="sans-serif">${parseFloat(feederWidth).toFixed(1)}"</text>
        </g>`;
        currentX += feederWidth; 
    }

    calcLoads.forEach(l => {
        if (currentX > SPACING) currentX += SPACING;
        let stroke = l.isCustom ? (state.theme === 'light' ? 'stroke="#9333ea" stroke-width="2"' : 'stroke="#d8b4fe" stroke-width="2"') : '';
        
        svgContent += `
        <g transform="translate(${currentX * scale}, 40)">
            <rect width="${l.width * scale}" height="${rectHeight}" fill="#1e293b" rx="4" ${stroke} />
            <text x="5" y="15" fill="#94a3b8" font-size="8" font-weight="bold" font-family="sans-serif">${l.type.substring(0,5)}</text>
            <text x="${(l.width * scale) - 5}" y="${rectHeight - 5}" text-anchor="end" fill="white" font-size="11" font-weight="900" font-family="sans-serif">${parseFloat(l.width).toFixed(1)}"</text>
        </g>`;
        currentX += l.width;
    });

    svgContent += '</svg>';
    container.innerHTML = svgContent;
}