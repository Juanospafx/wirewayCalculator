/* --- CONSTANTES --- */
const DISCONNECT_DATA = { "200": 20, "400": 26, "600": 30, "800": 32, "1000": 34, "1200": 36, "1600": 40, "2000": 44, "2500": 48 };
const PANEL_DATA = { "200": 22, "225": 24, "250": 26, "400": 30, "600": 36, "800": 42 };
const LV_DATA = { 
    "PLYWOOD_4": { width: 48, label: "Ply 4'" },
    "PLYWOOD_8": { width: 96, label: "Ply 8'" },
    "TTB": { width: 20, label: "TTB" },
    "CUSTOM_LV": { width: 24, label: "Custom LV" },
    "TRANSFORMER": { width: 30, label: "Transformer" },
    "WIREWAY": { width: 12, label: "Wireway" },
    "SPACE": { width: 12, label: "Space" }
};

const DISCONNECT_AMPS_SORTED = Object.keys(DISCONNECT_DATA).map(Number).sort((a,b) => a-b);
const PANEL_AMPS_SORTED = Object.keys(PANEL_DATA).map(Number).sort((a,b) => a-b);

const AMP_OPTIONS = [200, 400, 600, 800, 1000, 1200, 1600, 2000, 2500];
const CT_CABINET_OPTIONS = [600, 800, 1000, 1200];
const CONDUIT_SIZES = [2.0, 2.5, 3.0, 3.5, 4.0, 5.0, 6.0];

/* --- ESTADO --- */
let state = {
    walls: [
        { id: 1, name: 'North', active: true, width: 120, height: 96, items: [] },
        { id: 2, name: 'East',  active: false, width: 120, height: 96, items: [] },
        { id: 3, name: 'South', active: false, width: 120, height: 96, items: [] },
        { id: 4, name: 'West',  active: false, width: 120, height: 96, items: [] }
    ],
    activeWallId: 1,
    theme: 'light' // Nuevo estado para el tema
};

/* --- INICIALIZACIÓN --- */
document.addEventListener('DOMContentLoaded', () => {
    // Cargar tema guardado
    const savedTheme = localStorage.getItem('theme') || 'light';
    applyTheme(savedTheme);

    renderWallControls();
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

/* --- GESTIÓN DE PAREDES --- */
function toggleWall(id) {
    const wall = state.walls.find(w => w.id === id);
    if (wall) {
        wall.active = !wall.active;
        // Si desactivamos la pared actual, cambiamos a la primera activa
        if (!wall.active && state.activeWallId === id) {
            const firstActive = state.walls.find(w => w.active);
            state.activeWallId = firstActive ? firstActive.id : null;
        } else if (wall.active && !state.activeWallId) {
            state.activeWallId = id;
        }
        renderWallControls();
        calculateAndRender();
    }
}

function setActiveWall(id) {
    const wall = state.walls.find(w => w.id === id);
    if (wall && wall.active) {
        state.activeWallId = id;
        renderWallControls();
        calculateAndRender();
    }
}

function updateWallDim(id, field, value) {
    const wall = state.walls.find(w => w.id === id);
    if (wall) {
        wall[field] = parseFloat(value) || 0;
        calculateAndRender();
    }
}

function renderWallControls() {
    // Render Botones de Activación
    const activatorContainer = document.getElementById('wallActivatorContainer');
    activatorContainer.innerHTML = state.walls.map(w => `
        <button class="wall-btn ${w.active ? 'active' : ''}" onclick="toggleWall(${w.id})">
            ${w.active ? '<i class="fa-solid fa-check"></i>' : ''} ${w.name}
        </button>
    `).join('');

    // Render Inputs de Dimensiones (Solo para paredes activas)
    const dimContainer = document.getElementById('wallDimensionsContainer');
    dimContainer.innerHTML = state.walls.filter(w => w.active).map(w => `
        <div style="margin-top: 0.75rem; padding: 0.75rem; background: var(--bg-input); border-radius: 0.5rem; border: 1px solid ${state.activeWallId === w.id ? 'var(--accent-primary)' : 'var(--border-subtle)'}; cursor: pointer;" onclick="setActiveWall(${w.id})">
            <div style="display:flex; justify-content:space-between; margin-bottom: 0.5rem;">
                <span style="font-size: 0.75rem; font-weight: 800; color: ${state.activeWallId === w.id ? 'var(--accent-primary)' : 'var(--text-muted)'};">${w.name.toUpperCase()} WALL ${state.activeWallId === w.id ? '(SELECTED)' : ''}</span>
            </div>
            <div class="grid-2">
                <div>
                    <label class="input-label">Width (ft)</label>
                    <input type="number" step="0.5" min="0" class="input-std" value="${(w.width / 12).toFixed(2)}" onchange="updateWallDim(${w.id}, 'width', this.value * 12)" onclick="event.stopPropagation()">
                </div>
                <div>
                    <label class="input-label">Height (ft)</label>
                    <input type="number" step="0.5" min="0" class="input-std" value="${(w.height / 12).toFixed(2)}" onchange="updateWallDim(${w.id}, 'height', this.value * 12)" onclick="event.stopPropagation()">
                </div>
            </div>
        </div>
    `).join('');

    // Actualizar Label Principal
    const activeLabel = document.getElementById('activeWallLabel');
    if(activeLabel) {
        const activeWall = state.walls.find(w => w.id === state.activeWallId);
        activeLabel.innerText = activeWall ? `${activeWall.name} Wall Selected` : 'No Wall Selected';
    }
}

/* --- GESTIÓN DE CARGAS --- */

function addLoad(type) {
    if (!state.activeWallId) {
        alert("Please select a wall first.");
        return;
    }
    const wall = state.walls.find(w => w.id === state.activeWallId);
    if (!wall) return;

    // --- LIMIT CHECKS ---
    // 1. Per-wall item limit
    if (wall.items.length >= 25) {
        alert("Wall item limit reached. You cannot add more than 25 items to a single wall.");
        return;
    }

    // 2. Global item limit
    const totalItems = state.walls.reduce((acc, w) => acc + w.items.length, 0);
    if (totalItems >= 100) {
        alert("Global item limit reached. You cannot have more than 100 items in the entire project.");
        return;
    }

    // 3. Overflow limit (allow one item to cause overflow, but no more after)
    if (wall.items.length > 0) {
        const calculatedItems = calculateWallItems(wall);
        const totalUsed = calculatedItems.reduce((acc, item, idx) => acc + item.width + item.spacingAfter + (idx === 0 ? item.spacingBefore : 0), 0);
        if (totalUsed > wall.width) {
            alert("Overflow limit reached. You cannot add more items to a wall that is already over capacity.");
            return;
        }
    }

    // Determinar ancho inicial
    let initialWidth = 20;
    if (LV_DATA[type]) initialWidth = LV_DATA[type].width;
    else if (type === 'PANELBOARD') initialWidth = PANEL_DATA[200];
    else if (type === 'DISCONNECT') initialWidth = DISCONNECT_DATA[200];
    else if (type === 'METER') initialWidth = 9.6;
    else if (type === 'CT_CABINET') initialWidth = 32; // Default for 600A

    wall.items.push({ 
        id: Date.now().toString() + Math.random().toString(36).substr(2, 5), 
        type, 
        amps: 200, 
        meterSize: 'SMALL',
        isCustom: (type === 'CUSTOM_LV' || type === 'TRANSFORMER' || type === 'WIREWAY' || type === 'SPACE'),
        customWidth: initialWidth,
        description: (type === 'SPACE' ? 'Reserved' : ''),
        spacingBefore: 0, // New: Spacing before the item (relevant for first item)
        spacingAfter: 3 // Default spacing
    });
    calculateAndRender();
}

function removeLoad(id) {
    const wall = state.walls.find(w => w.id === state.activeWallId);
    if (wall) {
        wall.items = wall.items.filter(l => l.id !== id);
        calculateAndRender();
    }
}

function updateLoad(id, field, value) {
    const wall = state.walls.find(w => w.id === state.activeWallId);
    if (wall) {
        const item = wall.items.find(l => l.id === id);
        if (item) {
            if (field === 'meterSize') item.meterSize = value;
            else if (field === 'amps') item.amps = parseInt(value);
            else if (field === 'customWidth') item.customWidth = parseFloat(value);
            else if (field === 'spacingAfter') item.spacingAfter = parseFloat(value);
            else if (field === 'spacingBefore') item.spacingBefore = parseFloat(value);
            else if (field === 'description') item.description = value;
            calculateAndRender();
        }
    }
}

function toggleCustomMode(id) {
    const wall = state.walls.find(w => w.id === state.activeWallId);
    if (wall) {
        const item = wall.items.find(l => l.id === id);
        if (item) {
            item.isCustom = !item.isCustom;
            calculateAndRender();
        }
    }
}

function renderLoadList() {
    const container = document.getElementById('loadListContainer');
    
    if (!state.activeWallId) {
        container.innerHTML = '<div style="padding:2rem; text-align:center; color:var(--text-muted);">No Wall Selected</div>';
        return;
    }

    const wall = state.walls.find(w => w.id === state.activeWallId);
    if (!wall || wall.items.length === 0) {
        container.innerHTML = `
            <div style="padding: 3rem; text-align: center; color: var(--text-muted);">
                <i class="fa-solid fa-layer-group" style="font-size: 2.5rem; margin-bottom: 1rem; opacity:0.3;"></i>
                <span style="font-weight: 700; font-size: 0.9rem; display:block;">EMPTY WALL</span>
                <span style="font-size: 0.8rem;">Add items to ${wall.name} Wall</span>
            </div>`;
        return;
    }

    container.innerHTML = wall.items.map((l, index) => {
        // --- Icon and Color Logic ---
        let bgIcon = 'var(--bg-input)';
        let colorIcon = 'var(--text-muted)';
        if (l.type === 'PANELBOARD') { bgIcon = 'var(--blue-100)'; colorIcon = 'var(--blue-600)'; }
        else if (l.type === 'DISCONNECT') { bgIcon = 'var(--emerald-100)'; colorIcon = 'var(--emerald-500)'; }
        else if (l.type === 'METER') { bgIcon = 'var(--amber-100)'; colorIcon = 'var(--amber-500)'; }
        else if (l.type === 'CT_CABINET') { bgIcon = '#cffafe'; colorIcon = '#0891b2'; }
        else if (l.type === 'TRANSFORMER') { bgIcon = '#e0e7ff'; colorIcon = '#6366f1'; }
        else if (l.type === 'WIREWAY') { bgIcon = '#f1f5f9'; colorIcon = '#64748b'; }
        else if (l.type === 'SPACE') { bgIcon = '#f8fafc'; colorIcon = '#94a3b8'; }
        else { bgIcon = '#f3e8ff'; colorIcon = '#9333ea'; }
        if (state.theme === 'dark') {
            if (l.type === 'PANELBOARD') { bgIcon = '#1e3a8a'; colorIcon = '#93c5fd'; }
            else if (l.type === 'DISCONNECT') { bgIcon = '#064e3b'; colorIcon = '#6ee7b7'; }
            else if (l.type === 'METER') { bgIcon = '#78350f'; colorIcon = '#fcd34d'; }
            else if (l.type === 'CT_CABINET') { bgIcon = '#164e63'; colorIcon = '#22d3ee'; }
            else if (l.type === 'TRANSFORMER') { bgIcon = '#312e81'; colorIcon = '#818cf8'; }
            else if (l.type === 'WIREWAY') { bgIcon = '#334155'; colorIcon = '#94a3b8'; }
            else if (l.type === 'SPACE') { bgIcon = '#1e293b'; colorIcon = '#64748b'; }
            else { bgIcon = '#581c87'; colorIcon = '#d8b4fe'; }
        }

        // --- Controls Logic ---
        let spacingBeforeHtml = '';
        if (index === 0) {
            spacingBeforeHtml = `
            <div class="control-group">
                <label class="input-label" style="color: var(--accent-primary);">Start Gap</label>
                <div style="position:relative;">
                    <input type="number" step="0.5" min="0" class="input-custom" style="width: 80px; text-align:center; padding-right: 1.4rem;" 
                    value="${l.spacingBefore}" onchange="updateLoad('${l.id}', 'spacingBefore', this.value)">
                    <span style="position:absolute; right: 0.6rem; top: 50%; transform: translateY(-50%); font-size: 0.8rem; color: var(--text-secondary); font-weight:800; pointer-events: none;">"</span>
                </div>
            </div>`;
        }

        const spacingAfterHtml = `
            <div class="control-group">
                <label class="input-label">Spacing After</label>
                <div style="position:relative;">
                    <input type="number" step="0.5" min="0" class="input-custom" style="width: 80px; text-align:center; padding-right: 1.4rem;" 
                    value="${l.spacingAfter}" onchange="updateLoad('${l.id}', 'spacingAfter', this.value)">
                    <span style="position:absolute; right: 0.6rem; top: 50%; transform: translateY(-50%); font-size: 0.8rem; color: var(--text-secondary); font-weight:800; pointer-events: none;">"</span>
                </div>
            </div>`;

        let mainControlLabel = 'Amps';
        if (l.type === 'METER') mainControlLabel = 'Size';
        if (l.isCustom || LV_DATA[l.type]) mainControlLabel = 'Width';
        if (l.type === 'SPACE') mainControlLabel = 'Width / Label';

        let mainControlInputHtml = '';
        if (l.type === 'SPACE') {
            mainControlInputHtml = `<div style="display:flex; gap:0.5rem;"><div style="position:relative;"><input type="number" step="0.5" min="0" class="input-custom" style="padding-right: 1.4rem; width: 80px;" value="${l.customWidth}" onchange="updateLoad('${l.id}', 'customWidth', this.value)"><span style="position:absolute; right: 0.6rem; top: 50%; transform: translateY(-50%); font-size: 0.8rem; color: var(--text-secondary); font-weight:800; pointer-events: none;">"</span></div><input type="text" class="input-custom" style="width: 100px; font-size: 0.8rem;" value="${l.description || ''}" placeholder="Label" onchange="updateLoad('${l.id}', 'description', this.value)"></div>`;
        } else if (l.isCustom || LV_DATA[l.type]) {
            mainControlInputHtml = `<div style="position:relative;"><input type="number" step="0.5" min="0" class="input-custom" style="padding-right: 1.4rem; width: 110px;" value="${l.customWidth}" onchange="updateLoad('${l.id}', 'customWidth', this.value)"><span style="position:absolute; right: 0.6rem; top: 50%; transform: translateY(-50%); font-size: 0.8rem; color: var(--text-secondary); font-weight:800; pointer-events: none;">"</span></div>`;
        } else {
            if (l.type === 'METER') {
                mainControlInputHtml = `<select class="input-custom" style="width: 100px;" onchange="updateLoad('${l.id}', 'meterSize', this.value)"><option value="SMALL" ${l.meterSize === 'SMALL'?'selected':''}>SMALL</option><option value="LARGE" ${l.meterSize === 'LARGE'?'selected':''}>LARGE</option></select>`;
            } else if (l.type === 'CT_CABINET') {
                const options = CT_CABINET_OPTIONS.map(a => `<option value="${a}" ${a === l.amps ? 'selected' : ''}>${a}A</option>`).join('');
                mainControlInputHtml = `<select class="input-custom" style="width: 100px;" onchange="updateLoad('${l.id}', 'amps', this.value)">${options}</select>`;
            } else {
                const availableAmps = l.type === 'PANELBOARD' ? PANEL_AMPS_SORTED : (l.type === 'DISCONNECT' ? DISCONNECT_AMPS_SORTED : AMP_OPTIONS);
                const options = availableAmps.map(a => `<option value="${a}" ${a === l.amps ? 'selected' : ''}>${a}A</option>`).join('');
                mainControlInputHtml = `<select class="input-custom" style="width: 100px;" onchange="updateLoad('${l.id}', 'amps', this.value)">${options}</select>`;
            }
        }
        const mainControlHtml = `<div class="control-group"><label class="input-label">${mainControlLabel}</label>${mainControlInputHtml}</div>`;

        let buttonStyle = l.isCustom ? `background: #f3e8ff; border: 1px solid #d8b4fe;` : `background: var(--bg-input); border: 2px solid var(--border-subtle);`;
        if (state.theme === 'dark' && l.isCustom) { buttonStyle = `background: #4c1d95; border: 1px solid #a78bfa;`; }
        let buttonIconColor = l.isCustom ? (state.theme === 'dark' ? '#d8b4fe' : '#9333ea') : '#6366f1';
        const buttonsHtml = `<div class="control-group-buttons"><button onclick="toggleCustomMode('${l.id}')" title="Manual Size Override" style="width: 2.75rem; height: 2.75rem; border-radius: 0.75rem; cursor: pointer; display:flex; align-items:center; justify-content:center; ${buttonStyle} color: ${buttonIconColor}; transition: 0.2s;"><i class="fa-solid fa-ruler-horizontal"></i></button><button onclick="removeLoad('${l.id}')" class="btn-icon-only" style="width: 2.75rem; height: 2.75rem; display:flex; align-items:center; justify-content:center; font-size: 1rem; border: 1px solid var(--border-subtle); border-radius: 0.75rem;"><i class="fa-solid fa-times"></i></button></div>`;

        // --- Final Assembly ---
        return `
        <div class="load-item" style="display: flex; flex-wrap: wrap; gap: 1rem; align-items: center; justify-content: space-between; padding: 1.25rem; border-bottom: 1px solid var(--border-subtle);">
            <div style="display: flex; gap: 1rem; align-items: center; min-width: 180px; margin-right: auto;">
                <div style="width: 3rem; height: 3rem; background: ${bgIcon}; color: ${colorIcon}; border-radius: 0.85rem; display: flex; align-items: center; justify-content: center; font-weight: 900; font-size: 1.25rem;">
                    ${l.type === 'PANELBOARD' ? 'P' : (l.type === 'DISCONNECT' ? 'D' : (l.type === 'METER' ? 'M' : (l.type === 'CT_CABINET' ? 'CT' : (l.type === 'TRANSFORMER' ? 'T' : (l.type === 'WIREWAY' ? 'W' : 'L')))))}
                </div>
                <div>
                    <div style="font-weight: 800; font-size: 0.85rem; color: var(--text-primary);">${LV_DATA[l.type] ? LV_DATA[l.type].label : l.type}</div>
                    <div style="font-family: monospace; font-size: 0.7rem; color: var(--text-muted);">ID: ${l.id.slice(-3)}</div>
                </div>
            </div>
            <div class="load-item-controls">
                ${spacingBeforeHtml}
                ${spacingAfterHtml}
                ${mainControlHtml}
                ${buttonsHtml}
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

    const date = new Date().toLocaleDateString();
    let reportContent = '';

    // Iterar sobre paredes activas
    state.walls.filter(w => w.active).forEach((wall, index) => {
        // Calcular items para esta pared
        const calculatedItems = calculateWallItems(wall);
        const totalUsed = calculatedItems.reduce((acc, item, idx) => acc + item.width + item.spacingAfter + (idx === 0 ? item.spacingBefore : 0), 0);
        
        // Generar SVG para PDF
        const svgHtml = generateWallSVG(wall, calculatedItems, true);

        // Tabla de items
        let itemsRows = calculatedItems.map((l, index) => {
            let desc = l.isCustom ? 'Manual Size' : (l.type === 'METER' ? l.meterSize : (l.amps ? l.amps + 'A' : '-'));
            if (l.type === 'SPACE') desc = l.description || 'Reserved Space';
            if (LV_DATA[l.type]) desc = LV_DATA[l.type].label;
            return `<tr>
                <td>${index + 1}. ${l.type}</td>
                <td>${desc}</td>
                <td>${parseFloat(l.width).toFixed(1)}"</td>
                <td>${index === 0 ? `(Start: ${l.spacingBefore}") ` : ''}${parseFloat(l.spacingAfter).toFixed(1)}"</td>
            </tr>`;
        }).join('');

        const pageBreakClass = index > 0 ? 'page-break' : ''; // Apply page-break only AFTER the first wall
        reportContent += `
            <div class="${pageBreakClass}" style="margin-bottom: 3rem; max-height: 95vh; display: flex; flex-direction: column;">
                <h2 style="border-bottom: 2px solid #333; padding-bottom: 0.5rem;">${wall.name} Wall (${(wall.width / 12).toFixed(2)} ft x ${(wall.height / 12).toFixed(2)} ft)</h2>
                <div style="margin: 1rem 0; border: 1px solid #ccc; padding: 1rem;">${svgHtml}</div>
                <div style="margin-bottom: 1rem; font-weight:bold;">Usage: ${totalUsed.toFixed(1)}" / ${wall.width}"</div>
                <table class="print-table">
                    <thead><tr><th>Item Type</th><th>Config</th><th>Width</th><th>Spacing After</th></tr></thead>
                    <tbody>${itemsRows}</tbody>
                </table>
            </div>
        `;
    });

    const reportHTML = `
        <div style="padding: 2rem; max-width: 100%; margin: 0 auto; font-family: 'Inter', sans-serif;">
            <div style="margin-bottom: 2rem;">
                <h1 style="margin:0; font-size: 1.5rem; color: #1e293b;">Electrical Room Layout</h1>
                <p style="margin:0.5rem 0 0; color: #64748b;">Generated on ${date}</p>
            </div>
            ${reportContent}
            <div style="margin-top: 2rem; text-align: center; color: #cbd5e1; font-size: 0.8rem;"><p>Brightronix Electrical Room Designer</p></div>
        </div>
    `;

    printArea.innerHTML = reportHTML;
    window.print();
}

/* --- MOTOR DE CÁLCULO --- */
function calculateAndRender() {
    // 1. Renderizar lista de items de la pared activa
    renderLoadList();

    // 2. Calcular y dibujar visualizador para TODAS las paredes activas
    const svgContainer = document.getElementById('svgContainer');
    svgContainer.innerHTML = '';
    
    // Filter active walls
    const activeWalls = state.walls.filter(w => w.active);
    
    if (activeWalls.length === 0) {
        svgContainer.innerHTML = '<div style="color:var(--text-muted); text-align: center;">No active walls. <br> Please enable a wall in the "Room Configuration" section.</div>';
        return;
    }

    // Find current active wall object
    let currentWall = activeWalls.find(w => w.id === state.activeWallId);
    if (!currentWall) {
        currentWall = activeWalls[0];
        state.activeWallId = currentWall.id;
        renderWallControls(); // Update sidebar if active wall changed
    }

    // Render Carousel
    const calculatedItems = calculateWallItems(currentWall);
    const totalUsed = calculatedItems.reduce((acc, item, idx) => acc + item.width + item.spacingAfter + (idx === 0 ? item.spacingBefore : 0), 0);
    
    // Update Stats
    const pct = currentWall.width > 0 ? Math.min(100, (totalUsed / currentWall.width) * 100).toFixed(0) : 0;
    const pctEl = document.getElementById('wallUsagePct');
    const textEl = document.getElementById('wallUsageText');
    if(pctEl) {
        pctEl.innerText = `${pct}%`;
        pctEl.style.color = totalUsed > currentWall.width ? '#ef4444' : 'var(--text-primary)';
    }
    if(textEl) textEl.innerText = `${totalUsed.toFixed(1)}" / ${currentWall.width}"`;

    // Generate SVG
    const svgHtml = generateWallSVG(currentWall, calculatedItems, false);

    svgContainer.innerHTML = `
        <button class="carousel-btn" onclick="changeWall(-1)"><i class="fa-solid fa-chevron-left"></i></button>
        <div class="carousel-content" id="carouselSwipeArea" onclick="setActiveWall(${currentWall.id})">${svgHtml}</div>
        <button class="carousel-btn" onclick="changeWall(1)"><i class="fa-solid fa-chevron-right"></i></button>
    `;

    // Add Fullscreen Trigger Button if it doesn't exist
    const visualLayoutCard = document.getElementById('svgContainer').parentElement;
    if (visualLayoutCard && !visualLayoutCard.querySelector('.btn-fullscreen-trigger')) {
        const fsBtn = document.createElement('button');
        fsBtn.className = 'btn-fullscreen-trigger';
        fsBtn.title = 'Enter Fullscreen';
        fsBtn.innerHTML = '<i class="fa-solid fa-expand"></i>';
        fsBtn.onclick = () => toggleFullscreen(true);
        visualLayoutCard.appendChild(fsBtn);
    }

    // Add Swipe Listeners
    const swipeArea = document.getElementById('carouselSwipeArea');
    if (swipeArea) {
        let touchStartX = 0;
        
        swipeArea.addEventListener('touchstart', e => { touchStartX = e.changedTouches[0].screenX; }, { passive: true });
        swipeArea.addEventListener('touchend', e => {
            const touchEndX = e.changedTouches[0].screenX;
            if (touchStartX - touchEndX > 50) changeWall(1); // Swipe Left -> Next
            if (touchEndX - touchStartX > 50) changeWall(-1); // Swipe Right -> Prev
        }, { passive: true });
    }
}

function changeWall(direction) {
    const activeWalls = state.walls.filter(w => w.active);
    if (activeWalls.length <= 1) return;

    const currentIndex = activeWalls.findIndex(w => w.id === state.activeWallId);
    let newIndex = currentIndex + direction;

    if (newIndex < 0) newIndex = activeWalls.length - 1;
    if (newIndex >= activeWalls.length) newIndex = 0;

    setActiveWall(activeWalls[newIndex].id);
}

// This needs to be accessible for add/removeEventListener
function handleEscKey(event) {
    if (event.key === 'Escape') {
        toggleFullscreen(false);
    }
}

function toggleFullscreen(enter = true) {
    const existingOverlay = document.querySelector('.fullscreen-overlay');

    if (enter) {
        if (existingOverlay) return;

        // 1. Get current data
        const currentWall = state.walls.find(w => w.id === state.activeWallId);
        if (!currentWall) return;
        const calculatedItems = calculateWallItems(currentWall);

        // 2. Create elements
        const overlay = document.createElement('div');
        overlay.className = 'fullscreen-overlay';

        const closeBtn = document.createElement('button');
        closeBtn.className = 'fullscreen-close-btn';
        closeBtn.innerHTML = '<i class="fa-solid fa-times"></i>';
        closeBtn.title = 'Exit Fullscreen (Esc)';
        closeBtn.onclick = () => toggleFullscreen(false);

        const svgContainer = document.createElement('div');
        svgContainer.className = 'fullscreen-svg-container';
        svgContainer.innerHTML = generateWallSVG(currentWall, calculatedItems, false);

        // 3. Assemble and append
        overlay.append(closeBtn, svgContainer);
        document.body.appendChild(overlay);
        document.body.style.overflow = 'hidden'; // Prevent background scroll

        // 4. Add listeners
        document.addEventListener('keydown', handleEscKey);

        // Add click-to-close listener
        overlay.addEventListener('click', (e) => {
            // If the click was on the close button or one of its children (the icon), do nothing.
            // The button's own onclick handler will manage the closing.
            if (closeBtn.contains(e.target)) {
                return;
            }
            // For any other click on the overlay (SVG, padding, etc.), close it.
            toggleFullscreen(false);
        });
    } else {
        if (!existingOverlay) return;
        existingOverlay.remove();
        document.body.style.overflow = ''; // Restore scroll
        document.removeEventListener('keydown', handleEscKey);
    }
}

function calculateWallItems(wall) {
    return wall.items.map(l => {
        let w = 0;
        if (l.isCustom) w = l.customWidth;
        else if (LV_DATA[l.type]) w = LV_DATA[l.type].width;
        else if (l.type === 'PANELBOARD') w = PANEL_DATA[l.amps] || 0;
        else if (l.type === 'DISCONNECT') w = DISCONNECT_DATA[l.amps] || 0;
        else w = (l.meterSize === 'LARGE' ? 12 : 9.6);
        
        // CT Cabinet Logic
        if (l.type === 'CT_CABINET') {
            w = l.amps <= 600 ? 32 : (l.amps <= 1200 ? 36 : 48);
        }

        return { ...l, width: w, spacingBefore: l.spacingBefore || 0 };
    });
}

function generateWallSVG(wall, items, forPrint) {
    const scale = 4; // Pixels per inch
    const svgWidth = wall.width * scale;
    let svgHeight = wall.height * scale;
    
    // --- VISUAL SCALING ---
    // Calcula un multiplicador visual basado en el ancho de la pared.
    // Para prevenir que el SVG se "aplasta" en paredes muy altas, limitamos la altura visual.
    const visualHeight = Math.min(svgHeight, svgWidth * 2); // La altura visual no será más del doble del ancho.
    const heightScaleFactor = svgHeight > 0 ? visualHeight / svgHeight : 1;

    // Base: 120 pulgadas (10 pies). Por cada 240 pulgadas adicionales, aumenta la escala en 1.
    // Esto hace que el texto y las líneas sean más gruesos en paredes muy grandes para mantener la legibilidad al hacer zoom out.
    const visualMultiplier = 1 + Math.max(0, (wall.width - 120) / 240);
    
    const padding = 60 * visualMultiplier;
    const fsDim = 14 * visualMultiplier;     // Font Size: Dimensiones
    const fsHeader = 16 * visualMultiplier;  // Font Size: Título Pared
    const fsItem = 12 * visualMultiplier;    // Font Size: Items
    const swWall = 4 * visualMultiplier;     // Stroke Width: Pared
    const swItem = 2 * visualMultiplier;     // Stroke Width: Items

    // Calcular uso total para detectar overflow
    const totalUsed = items.reduce((acc, item, idx) => acc + item.width + item.spacingAfter + (idx===0 ? item.spacingBefore : 0), 0);
    const isOverflow = totalUsed > wall.width;

    // Colores
    let wallFill = forPrint ? '#f1f5f9' : (state.theme === 'light' ? '#e2e8f0' : '#334155');
    let wallStroke = forPrint ? '#94a3b8' : (state.activeWallId === wall.id ? 'var(--accent-primary)' : 'var(--border-subtle)');
    const textFill = forPrint ? '#000' : (state.theme === 'light' ? '#475569' : '#cbd5e1');
    const dimColor = forPrint ? '#000' : (state.theme === 'light' ? '#94a3b8' : '#64748b');

    // Overflow Alert Colors
    if (isOverflow && !forPrint) {
        wallFill = state.theme === 'light' ? '#fee2e2' : '#450a0a'; // Red-100 / Red-900
        wallStroke = '#ef4444'; // Red-500
    }

    let svg = `<svg width="${forPrint ? '100%' : '100%'}" height="100%" viewBox="-${padding} -${padding} ${svgWidth + padding*2} ${visualHeight + padding*2}" xmlns="http://www.w3.org/2000/svg" style="cursor: pointer;">
        
        <!-- Dimensions -->
        <!-- Top Width -->
        <line x1="0" y1="${-20 * visualMultiplier}" x2="${svgWidth}" y2="${-20 * visualMultiplier}" stroke="${dimColor}" stroke-width="${2 * visualMultiplier}" />
        <line x1="0" y1="${-25 * visualMultiplier}" x2="0" y2="${-15 * visualMultiplier}" stroke="${dimColor}" stroke-width="${2 * visualMultiplier}" />
        <line x1="${svgWidth}" y1="${-25 * visualMultiplier}" x2="${svgWidth}" y2="${-15 * visualMultiplier}" stroke="${dimColor}" stroke-width="${2 * visualMultiplier}" />
        <text x="${svgWidth/2}" y="${-30 * visualMultiplier}" text-anchor="middle" fill="${dimColor}" font-size="${fsDim}" font-weight="bold">${wall.width}" (${(wall.width/12).toFixed(1)}')</text>

        <!-- Left Height -->
        <line x1="${-20 * visualMultiplier}" y1="0" x2="${-20 * visualMultiplier}" y2="${visualHeight}" stroke="${dimColor}" stroke-width="${2 * visualMultiplier}" />
        <line x1="${-25 * visualMultiplier}" y1="0" x2="${-15 * visualMultiplier}" y2="0" stroke="${dimColor}" stroke-width="${2 * visualMultiplier}" />
        <line x1="${-25 * visualMultiplier}" y1="${visualHeight}" x2="${-15 * visualMultiplier}" y2="${visualHeight}" stroke="${dimColor}" stroke-width="${2 * visualMultiplier}" />
        <text x="${-30 * visualMultiplier}" y="${visualHeight/2}" text-anchor="middle" transform="rotate(-90, ${-30 * visualMultiplier}, ${visualHeight/2})" fill="${dimColor}" font-size="${fsDim}" font-weight="bold">${wall.height}" (${(wall.height/12).toFixed(1)}')</text>
        
        <!-- Wall Rect -->
        <rect x="0" y="0" width="${svgWidth}" height="${visualHeight}" fill="${wallFill}" stroke="${wallStroke}" stroke-width="${swWall}" />
        
        <!-- Wall Label Inside -->
        <text x="${10 * visualMultiplier}" y="${25 * visualMultiplier}" fill="${textFill}" font-weight="900" font-family="sans-serif" font-size="${fsHeader}" opacity="0.5">${wall.name.toUpperCase()} WALL</text>
    `;

    let currentX = 0;
    const itemHeight = Math.min(visualHeight * 0.6, 200 * visualMultiplier); // Altura fija visual para items (escalada)
    const itemY = (visualHeight - itemHeight) / 2; // Centrado verticalmente

    items.forEach((item, idx) => {
        const itemW = item.width * scale;
        const spacingW = item.spacingAfter * scale;
        const spacingBeforeW = (idx === 0) ? item.spacingBefore * scale : 0;

        // Apply Spacing Before (Start Gap)
        currentX += spacingBeforeW;

        // Draw Start Gap Indicator if exists
        if (idx === 0 && item.spacingBefore > 0) {
             svg += `
                <g transform="translate(0, ${itemY + itemHeight/2})">
                    <line x1="0" y1="0" x2="${spacingBeforeW}" y2="0" stroke="${dimColor}" stroke-width="${1 * visualMultiplier}" stroke-dasharray="${4 * visualMultiplier}" />
                    <text x="${spacingBeforeW/2}" y="${-5 * visualMultiplier}" text-anchor="middle" fill="${dimColor}" font-size="${10 * visualMultiplier}">${item.spacingBefore}"</text>
                </g>
            `;
        }
        
        // Item Color
        let fill = '#64748b';
        if (item.type === 'PANELBOARD') fill = '#3b82f6';
        else if (item.type === 'DISCONNECT') fill = '#10b981';
        else if (item.type === 'METER') fill = '#f59e0b';
        else if (item.type === 'CT_CABINET') fill = '#06b6d4';
        else if (item.type === 'TRANSFORMER') fill = '#6366f1';
        else if (item.type === 'WIREWAY') fill = '#94a3b8';
        else if (item.type === 'SPACE') fill = 'transparent';
        else fill = '#8b5cf6'; // LV

        if (forPrint) fill = '#cbd5e1'; // Gris para impresión

        // Draw Item
        let label = item.type.substring(0,3);
        let subLabel = '';
        if (['PANELBOARD', 'DISCONNECT', 'CT_CABINET'].includes(item.type)) {
            subLabel = `${item.amps}A`;
        }
        if (item.type === 'SPACE') {
            label = item.description || 'SPACE';
            subLabel = '';
        }

        // Posiciona la dimensión del ítem siempre en la parte inferior, dentro del recuadro.
        const dimensionText = `<text x="${itemW/2}" y="${itemHeight - (fsItem * 1.5)}" text-anchor="middle" fill="${item.type === 'SPACE' ? dimColor : 'white'}" font-size="${fsItem}" font-weight="bold" font-family="sans-serif" opacity="0.8">${item.width}"</text>`;
        
        let mainText = '';
        if (subLabel) {
            // Si hay amperaje, muestra el nombre y el amperaje juntos en el centro.
            mainText = `
                <text x="${itemW/2}" y="${itemHeight/2 - (7 * visualMultiplier)}" text-anchor="middle" dominant-baseline="central" fill="white" font-size="${10 * visualMultiplier}" font-weight="bold" font-family="sans-serif">${label}</text>
                <text x="${itemW/2}" y="${itemHeight/2 + (7 * visualMultiplier)}" text-anchor="middle" dominant-baseline="central" fill="white" font-size="${9 * visualMultiplier}" font-weight="bold" font-family="sans-serif">${subLabel}</text>
            `;
        } else {
            // Si no, solo muestra el nombre en el centro.
            const labelFill = item.type === 'SPACE' ? dimColor : 'white';
            const labelSize = (item.type === 'SPACE' ? 10 : 12) * visualMultiplier;
            mainText = `<text x="${itemW/2}" y="${itemHeight/2}" text-anchor="middle" dominant-baseline="central" fill="${labelFill}" font-size="${labelSize}" font-weight="bold" font-family="sans-serif">${label}</text>`;
        }

        // Estilo especial para SPACE (borde discontinuo)
        let strokeStyle = item.type === 'SPACE' ? `stroke-dasharray="${5 * visualMultiplier},${5 * visualMultiplier}"` : '';
        let rectStroke = item.type === 'SPACE' ? dimColor : (forPrint ? '#666' : '#fff');

        svg += `
            <g transform="translate(${currentX}, ${itemY})">
                <rect width="${itemW}" height="${itemHeight}" fill="${fill}" stroke="${rectStroke}" stroke-width="${swItem}" rx="${4 * visualMultiplier}" ${strokeStyle} />
                ${mainText}
                ${dimensionText}
            </g>
        `;

        // Draw Spacing Indicator
        if (item.spacingAfter > 0) {
            svg += `
                <g transform="translate(${currentX + itemW}, ${itemY + itemHeight + (5 * visualMultiplier)})">
                    <line x1="0" y1="0" x2="${spacingW}" y2="0" stroke="${dimColor}" stroke-width="${1 * visualMultiplier}" stroke-dasharray="${4 * visualMultiplier}" />
                    <text x="${spacingW/2}" y="${15 * visualMultiplier}" text-anchor="middle" fill="${dimColor}" font-size="${10 * visualMultiplier}">${item.spacingAfter}"</text>
                </g>
            `;
        }

        currentX += itemW + spacingW;
    });

    // Warning si se pasa
    if (isOverflow && !forPrint) {
        svg += `<text x="${svgWidth/2}" y="${svgHeight/2}" text-anchor="middle" fill="red" font-size="${24 * visualMultiplier}" font-weight="900" opacity="0.5">OVERFLOW</text>`;
    }

    svg += `</g></svg>`;
    return svg;
}