let qtys = [2, 3, 6];
let inputMode = 'total'; // 'total' | 'ppot'

const el = id => document.getElementById(id);
const STORAGE_KEY = 'potes_state';

function fmt(n) {
    if (n === null || n === undefined || isNaN(n)) return '—';
    const formatted = n % 1 === 0 ? n.toFixed(0) : n.toFixed(2);
    return '$ ' + formatted.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

// ── Persistência ───────────────────────────────────────

let saveTimer;
function saveState() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
        const discounts = {};
        document.querySelectorAll('[data-idx]').forEach(c => {
            const inp = c.querySelector('[data-disc]');
            const qty = parseInt(c.dataset.qty);
            const idx = c.dataset.idx;
            const v = parseFloat(inp?.value);
            if (inp?.value && !isNaN(v)) {
                // Always store totals in localStorage
                discounts[idx] = inputMode === 'ppot' ? String(v * qty) : String(v);
            }
        });
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
            qtys,
            base: el('base-price')?.value || '179',
            discounts,
            inputMode
        }));
    }, 300);
}

function loadState() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return {};
        const state = JSON.parse(raw);
        if (Array.isArray(state.qtys) && state.qtys.length > 0) qtys = state.qtys;
        if (state.inputMode) inputMode = state.inputMode;
        if (state.base) {
            const bp = el('base-price');
            if (bp) bp.value = state.base;
        }
        return state.discounts || {};
    } catch (e) {
        return {};
    }
}

function clearAll(btn) {
    if (btn.dataset.confirm === '1') {
        localStorage.removeItem(STORAGE_KEY);
        qtys = [2, 3, 6];
        inputMode = 'total';
        el('base-price').value = '179';
        updateModeButtons();
        renderChips();
        renderGrid({});
        btn.textContent = 'Limpar';
        delete btn.dataset.confirm;
        btn.classList.remove('confirming');
    } else {
        btn.textContent = 'Tem certeza?';
        btn.dataset.confirm = '1';
        btn.classList.add('confirming');
        setTimeout(() => {
            if (btn.dataset.confirm === '1') {
                btn.textContent = 'Limpar';
                delete btn.dataset.confirm;
                btn.classList.remove('confirming');
            }
        }, 3000);
    }
}

// ── Modo de entrada ────────────────────────────────────

function setMode(mode) {
    if (mode === inputMode) return;

    const totals = {};
    el('grid').querySelectorAll('[data-idx]').forEach(c => {
        const inp = c.querySelector('[data-disc]');
        const idx = c.dataset.idx;
        const qty = parseInt(c.dataset.qty);
        const v = parseFloat(inp.value);
        if (inp.value && !isNaN(v)) {
            totals[idx] = inputMode === 'ppot' ? v * qty : v;
        }
    });

    inputMode = mode;
    updateModeButtons();
    renderGrid(totals);
    saveState();
}

function updateModeButtons() {
    el('mode-total')?.classList.toggle('active', inputMode === 'total');
    el('mode-ppot')?.classList.toggle('active', inputMode === 'ppot');
}

// ── Chips ──────────────────────────────────────────────

function renderChips() {
    el('chips').innerHTML = qtys.map((q, i) => `
        <div class="chip" data-chip-idx="${i}">
            <span>${q} potes</span>
            <button class="chip-rm" onclick="removeQty(${i})" title="Remover">✕</button>
        </div>
    `).join('');
}

function removeQty(i) {
    // Collect discounts before mutating qtys, then re-map indices
    const currentDiscounts = {};
    el('grid').querySelectorAll('[data-idx]').forEach(c => {
        const inp = c.querySelector('[data-disc]');
        const idx = parseInt(c.dataset.idx);
        const qty = parseInt(c.dataset.qty);
        const v = parseFloat(inp?.value);
        if (inp?.value && !isNaN(v)) {
            currentDiscounts[idx] = inputMode === 'ppot' ? v * qty : v;
        }
    });

    qtys.splice(i, 1);

    // Shift indices: skip removed, decrement higher ones
    const remapped = {};
    Object.entries(currentDiscounts).forEach(([idx, val]) => {
        const n = parseInt(idx);
        if (n < i) remapped[n] = val;
        else if (n > i) remapped[n - 1] = val;
    });

    renderChips();
    renderGrid(remapped);
    saveState();
}

// ── Modal ──────────────────────────────────────────────

function openModal() {
    const overlay = document.createElement('div');
    overlay.id = 'modal-overlay';
    overlay.innerHTML = `
        <div class="modal" id="modal-box">
            <div class="modal-header">
                <div>
                    <div class="modal-title">Configurar Combos</div>
                    <div class="modal-subtitle">Defina as quantidades de potes de cada kit</div>
                </div>
                <button class="modal-close" onclick="closeModal()">✕</button>
            </div>
            <div class="modal-body">
                <div id="modal-rows">
                    ${qtys.map((q, i) => buildModalRow(q, i + 1)).join('')}
                </div>
                <button class="modal-add-row" onclick="addModalRow()">+ Adicionar combo</button>
            </div>
            <div class="modal-footer">
                <button class="modal-cancel" onclick="closeModal()">Cancelar</button>
                <button class="modal-save" onclick="saveModal()">Salvar combos</button>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);
    overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(); });
    document.addEventListener('keydown', handleModalKey);
}

function buildModalRow(value, index) {
    return `
        <div class="modal-row">
            <label>Kit ${index}</label>
            <div class="input-wrap" style="flex:1">
                <input type="number" class="modal-qty-input" value="${value || ''}"
                       min="1" step="1" placeholder="Qtd"
                       oninput="this.classList.remove('error')">
            </div>
            <button class="modal-rm-row" onclick="removeModalRow(this)" title="Remover">✕</button>
        </div>
    `;
}

function addModalRow() {
    const rows = el('modal-rows');
    const count = rows.querySelectorAll('.modal-row').length + 1;
    const temp = document.createElement('div');
    temp.innerHTML = buildModalRow('', count);
    const newRow = temp.firstElementChild;
    newRow.classList.add('modal-row-new');
    rows.appendChild(newRow);
    newRow.querySelector('input').focus();
    updateModalLabels();
}

function removeModalRow(btn) {
    const rows = el('modal-rows');
    if (rows.querySelectorAll('.modal-row').length <= 1) return;
    btn.closest('.modal-row').remove();
    updateModalLabels();
}

function updateModalLabels() {
    el('modal-rows').querySelectorAll('.modal-row label').forEach((lbl, i) => {
        lbl.textContent = `Kit ${i + 1}`;
    });
}

function saveModal() {
    const inputs = el('modal-rows').querySelectorAll('.modal-qty-input');
    const newQtys = [];
    let hasError = false;

    inputs.forEach(inp => {
        const val = parseInt(inp.value);
        if (!val || val < 1) {
            inp.classList.add('error');
            hasError = true;
        } else {
            inp.classList.remove('error');
            newQtys.push(val);
        }
    });

    if (hasError) return;

    qtys = newQtys.sort((a, b) => a - b);
    closeModal();
    renderChips();
    renderGrid();
    saveState();
}

function closeModal() {
    const overlay = el('modal-overlay');
    if (!overlay) return;
    document.removeEventListener('keydown', handleModalKey);
    overlay.classList.add('modal-closing');
    setTimeout(() => overlay.remove(), 180);
}

function handleModalKey(e) {
    if (e.key === 'Escape') closeModal();
    if (e.key === 'Enter' && e.target.classList.contains('modal-qty-input')) saveModal();
}

// ── Grid ───────────────────────────────────────────────

function renderGrid(discountOverride) {
    const grid = el('grid');
    // saved is index-keyed; values always in "total" terms
    const saved = {};

    if (discountOverride) {
        Object.assign(saved, discountOverride);
    } else {
        grid.querySelectorAll('[data-idx]').forEach(c => {
            const inp = c.querySelector('[data-disc]');
            const idx = c.dataset.idx;
            const qty = parseInt(c.dataset.qty);
            const v = parseFloat(inp?.value);
            if (inp?.value && !isNaN(v)) {
                saved[idx] = inputMode === 'ppot' ? v * qty : v;
            }
        });
    }

    if (!qtys.length) {
        grid.innerHTML = '<div class="empty">Nenhum combo configurado.<br>Clique em <strong>⚙ Configurar combos</strong> para começar.</div>';
        return;
    }

    const inpLabel = inputMode === 'ppot' ? 'Valor por pote com desconto' : 'Valor total com desconto';

    grid.innerHTML = qtys.map((q, i) => {
        const totalVal = saved[i];
        let inputStr = '';
        if (totalVal != null && totalVal !== '') {
            const parsed = parseFloat(totalVal);
            if (!isNaN(parsed)) {
                const displayVal = inputMode === 'ppot' ? parsed / q : parsed;
                inputStr = displayVal % 1 === 0 ? String(displayVal) : displayVal.toFixed(2);
            }
        }

        return `
        <div class="card" data-idx="${i}" data-qty="${q}">
            <div class="card-top" data-qty-bg="${q}">
                <div class="card-top-left">
                    <div class="card-qty">${q} potes</div>
                    <div class="card-sub">${q * 30} Day Supply</div>
                </div>
                <div class="card-top-right">
                    <span class="disc-badge" data-disc-pct></span>
                </div>
            </div>
            <div class="card-body">
                <div class="inp-label">${inpLabel}</div>
                <div class="card-inp-wrap">
                    <div class="input-wrap has-prefix">
                        <span class="prefix">$</span>
                        <input type="number" data-disc min="0" step="0.01" placeholder="0.00"
                               value="${inputStr}"
                               oninput="calc(this, ${i})">
                    </div>
                </div>

                <hr class="sep">

                <div class="result-row">
                    <span class="r-lbl">Valor total riscado</span>
                    <span class="r-val strike" data-riscado>—</span>
                </div>
                <div class="result-row">
                    <span class="r-lbl">Valor total com desconto</span>
                    <span class="r-val disc" data-total>—</span>
                </div>
                <div class="result-row">
                    <span class="r-lbl">Valor dos potes</span>
                    <span class="r-val ppot" data-ppot>—</span>
                </div>

                <div class="savings" data-sbox>
                    <span class="sv-lbl">Você economiza</span>
                    <span class="sv-val" data-saves></span>
                </div>
            </div>
        </div>
    `}).join('');

    grid.querySelectorAll('[data-idx]').forEach(c => {
        const inp = c.querySelector('[data-disc]');
        calc(inp, parseInt(c.dataset.idx));
    });
}

function calc(input, idx) {
    const card = input.closest('[data-idx]');
    const qty = parseInt(card.dataset.qty);
    const base = parseFloat(el('base-price').value) || 0;
    const riscado = qty * base;
    const rawVal = parseFloat(input.value);
    const badge = card.querySelector('[data-disc-pct]');

    card.querySelector('[data-riscado]').textContent = fmt(riscado);

    if (!input.value || isNaN(rawVal)) {
        card.querySelector('[data-total]').textContent = '—';
        card.querySelector('[data-ppot]').textContent = '—';
        card.querySelector('[data-sbox]').style.display = 'none';
        if (badge) badge.style.display = 'none';
        saveState();
        return;
    }

    let disc, ppot;
    if (inputMode === 'ppot') {
        ppot = rawVal;
        disc = ppot * qty;
    } else {
        disc = rawVal;
        ppot = disc / qty;
    }

    const saves = riscado - disc;

    card.querySelector('[data-total]').textContent = fmt(disc);
    card.querySelector('[data-ppot]').textContent = fmt(ppot);

    if (badge && riscado > 0) {
        const pct = Math.round((saves / riscado) * 100);
        if (pct > 0) {
            badge.textContent = pct + '% OFF';
            badge.style.display = 'inline-flex';
        } else {
            badge.style.display = 'none';
        }
    }

    const sbox = card.querySelector('[data-sbox]');
    if (saves > 0.001) {
        sbox.style.display = 'flex';
        card.querySelector('[data-saves]').textContent = fmt(saves);
    } else {
        sbox.style.display = 'none';
    }

    saveState();
}

function recalcAll() {
    el('grid').querySelectorAll('[data-idx]').forEach(c => {
        const inp = c.querySelector('[data-disc]');
        calc(inp, parseInt(c.dataset.idx));
    });
}

// ── Init ───────────────────────────────────────────────

function init() {
    const discounts = loadState();
    updateModeButtons();
    renderChips();
    renderGrid(discounts);
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
