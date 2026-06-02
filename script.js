let qtys = [2, 3, 6];

const el = id => document.getElementById(id);

function fmt(n) {
    if (n === null || n === undefined || isNaN(n)) return '—';
    return '$ ' + n.toFixed(2)
        .replace(/\B(?=(\d{3})+(?!\d))/g, ',');
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
    qtys.splice(i, 1);
    renderChips();
    renderGrid();
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
                       min="1" step="1" placeholder="Qtd de potes"
                       oninput="this.classList.remove('error')">
            </div>
            <button class="modal-rm-row" onclick="removeModalRow(this)" title="Remover">✕</button>
        </div>
    `;
}

function addModalRow() {
    const rows = el('modal-rows');
    const count = rows.querySelectorAll('.modal-row').length + 1;
    const div = document.createElement('div');
    div.className = 'modal-row modal-row-new';
    div.innerHTML = buildModalRow('', count);
    // buildModalRow returns a div wrapper, extract inner
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
        if (!val || val < 1 || newQtys.includes(val)) {
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

function renderGrid() {
    const grid = el('grid');

    const saved = {};
    grid.querySelectorAll('[data-qty]').forEach(c => {
        const v = c.querySelector('[data-disc]')?.value;
        if (v) saved[c.dataset.qty] = v;
    });

    if (!qtys.length) {
        grid.innerHTML = '<div class="empty">Nenhum combo configurado.<br>Clique em <strong>Configurar combos</strong> para começar.</div>';
        return;
    }

    grid.innerHTML = qtys.map(q => `
        <div class="card" data-qty="${q}">
            <div class="card-top" data-qty-bg="${q}">
                <div class="card-top-left">
                    <div class="card-qty">${q} potes</div>
                    <div class="card-sub">Combo</div>
                </div>
                <div class="card-top-right">
                    <span class="disc-badge" data-disc-pct></span>
                    <div class="card-icon">🫙</div>
                </div>
            </div>
            <div class="card-body">
                <div class="inp-label">Valor total com desconto</div>
                <div class="card-inp-wrap">
                    <div class="input-wrap has-prefix">
                        <span class="prefix">$</span>
                        <input type="number" data-disc min="0" step="0.01" placeholder="0,00"
                               value="${saved[q] || ''}"
                               oninput="calc(this, ${q})">
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
                    <span class="sv-lbl">✨ Você economiza</span>
                    <span class="sv-val" data-saves></span>
                </div>
            </div>
        </div>
    `).join('');

    grid.querySelectorAll('[data-qty]').forEach(c => {
        const inp = c.querySelector('[data-disc]');
        calc(inp, parseInt(c.dataset.qty));
    });
}

function calc(input, qty) {
    const card = input.closest('[data-qty]');
    const base = parseFloat(el('base-price').value) || 0;
    const riscado = qty * base;
    const disc = parseFloat(input.value);
    const badge = card.querySelector('[data-disc-pct]');

    card.querySelector('[data-riscado]').textContent = fmt(riscado);

    if (!input.value || isNaN(disc)) {
        card.querySelector('[data-total]').textContent = '—';
        card.querySelector('[data-ppot]').textContent = '—';
        card.querySelector('[data-sbox]').style.display = 'none';
        if (badge) badge.style.display = 'none';
        return;
    }

    const ppot = disc / qty;
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
}

function recalcAll() {
    el('grid').querySelectorAll('[data-qty]').forEach(c => {
        const inp = c.querySelector('[data-disc]');
        calc(inp, parseInt(c.dataset.qty));
    });
}

// ── Init ───────────────────────────────────────────────

function init() {
    renderChips();
    renderGrid();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
