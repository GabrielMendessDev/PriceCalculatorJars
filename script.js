let qtys = [2, 3, 6];
let inputMode = 'total'; // 'total' | 'ppot'
let theme = null; // null = ainda segue o sistema; depois 'light' | 'dark'

const el = id => document.getElementById(id);
const STORAGE_KEY = 'potes_state';

// Crossfade nativo ao re-renderizar o grid. Sem biblioteca: se o navegador
// não suportar, ou se o usuário pediu menos movimento, roda direto.
function withTransition(fn) {
    // Todo uso daqui muda o estado global (qtys/inputMode) e reconstrói o grid.
    // Um save agendado antes da mudança leria o DOM antigo com o estado novo e
    // gravaria valores corrompidos — descarta-se, pois fn() reagenda o correto.
    cancelPendingSave();

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (document.startViewTransition && !reduced) {
        document.startViewTransition(fn);
    } else {
        fn();
    }
}

function fmt(n) {
    if (n === null || n === undefined || isNaN(n)) return '—';
    const formatted = n % 1 === 0 ? n.toFixed(0) : n.toFixed(2);
    return '$ ' + formatted.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

// ── Tema ───────────────────────────────────────────────
// Enquanto o usuário não clica, `theme` fica null e quem manda é a media
// query do CSS. O ícone mostra o tema em vigor: sol = claro, lua = escuro.

const SUN = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4l1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>';

const MOON = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>';

// Tema que está valendo agora: a escolha do usuário, ou o que o sistema pede.
function currentTheme() {
    if (theme) return theme;
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

function applyTheme() {
    const root = document.documentElement;
    if (theme) root.setAttribute('data-theme', theme);
    else root.removeAttribute('data-theme');

    const btn = el('btn-theme');
    if (!btn) return;

    const now = currentTheme();
    const other = now === 'light' ? 'escuro' : 'claro';
    btn.innerHTML = now === 'light' ? SUN : MOON;
    btn.setAttribute('title', `Mudar para o tema ${other}`);
    btn.setAttribute('aria-label', `Tema ${now === 'light' ? 'claro' : 'escuro'}. Clique para mudar para o ${other}.`);
}

function toggleTheme() {
    theme = currentTheme() === 'light' ? 'dark' : 'light';
    applyTheme();
    saveState();
}

// ── Persistência ───────────────────────────────────────

let saveTimer;

function cancelPendingSave() {
    clearTimeout(saveTimer);
}

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
            inputMode,
            theme
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
        if (state.theme === 'light' || state.theme === 'dark') theme = state.theme;
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
        withTransition(() => {
            renderChips();
            renderGrid({});
        });
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
    // saveState() lê os inputs do DOM e os interpreta segundo inputMode.
    // Precisa rodar DEPOIS do re-render, senão leria valores no modo antigo.
    withTransition(() => {
        renderGrid(totals);
        saveState();
    });
}

function updateModeButtons() {
    const isTotal = inputMode === 'total';
    el('mode-total')?.classList.toggle('active', isTotal);
    el('mode-ppot')?.classList.toggle('active', !isTotal);
    el('mode-total')?.setAttribute('aria-pressed', String(isTotal));
    el('mode-ppot')?.setAttribute('aria-pressed', String(!isTotal));
}

// Valores digitados agrupados pela quantidade de potes do combo.
// Sempre em termos de "total", como no localStorage. Usa fila por quantidade
// porque é permitido ter mais de um kit com a mesma quantidade.
function collectDiscountsByQty() {
    const byQty = {};
    el('grid').querySelectorAll('[data-idx]').forEach(c => {
        const inp = c.querySelector('[data-disc]');
        const qty = parseInt(c.dataset.qty);
        const v = parseFloat(inp?.value);
        if (inp?.value && !isNaN(v)) {
            (byQty[qty] = byQty[qty] || []).push(inputMode === 'ppot' ? v * qty : v);
        }
    });
    return byQty;
}

// ── Chips ──────────────────────────────────────────────

function renderChips() {
    el('chips').innerHTML = qtys.map((q, i) => `
        <div class="chip" data-chip-idx="${i}">
            <span>${q} potes</span>
            <button class="chip-rm" type="button" onclick="removeQty(${i})"
                    title="Remover" aria-label="Remover combo de ${q} potes">✕</button>
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

    withTransition(() => {
        renderChips();
        renderGrid(remapped);
        saveState();
    });
}

// ── Modal ──────────────────────────────────────────────

function openModal() {
    const overlay = document.createElement('div');
    overlay.id = 'modal-overlay';
    overlay.innerHTML = `
        <div class="modal" id="modal-box" role="dialog" aria-modal="true"
             aria-labelledby="modal-title">
            <div class="modal-header">
                <div>
                    <div class="modal-title" id="modal-title">Configurar Combos</div>
                    <div class="modal-subtitle">Defina as quantidades de potes de cada kit</div>
                </div>
                <button class="modal-close" type="button" onclick="closeModal()"
                        aria-label="Fechar">✕</button>
            </div>
            <div class="modal-body">
                <div id="modal-rows">
                    ${qtys.map((q, i) => buildModalRow(q, i + 1)).join('')}
                </div>
                <button class="modal-add-row" type="button" onclick="addModalRow()">+ Adicionar combo</button>
            </div>
            <div class="modal-footer">
                <button class="modal-cancel" type="button" onclick="closeModal()">Cancelar</button>
                <button class="modal-save" type="button" onclick="saveModal()">Salvar combos</button>
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
            <label for="kit-${index}">Kit ${index}</label>
            <div class="input-wrap" style="flex:1">
                <input type="number" class="modal-qty-input" id="kit-${index}"
                       value="${value || ''}" min="1" step="1" placeholder="Qtd"
                       inputmode="numeric"
                       oninput="this.classList.remove('error')">
            </div>
            <button class="modal-rm-row" type="button" onclick="removeModalRow(this)"
                    title="Remover" aria-label="Remover kit ${index}">✕</button>
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
    el('modal-rows').querySelectorAll('.modal-row').forEach((row, i) => {
        const n = i + 1;
        const id = `kit-${n}`;
        row.querySelector('label').textContent = `Kit ${n}`;
        row.querySelector('label').setAttribute('for', id);
        row.querySelector('.modal-qty-input').id = id;
        row.querySelector('.modal-rm-row')?.setAttribute('aria-label', `Remover kit ${n}`);
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

    // Precisa ler o grid ANTES de trocar qtys — o DOM ainda é o antigo.
    // O índice não serve de identidade aqui: o sort() abaixo reordena tudo,
    // e o modal pode ter editado, somado ou removido kits. A quantidade de
    // potes é o que identifica o combo de fato.
    const byQty = collectDiscountsByQty();

    qtys = newQtys.sort((a, b) => a - b);

    const remapped = {};
    qtys.forEach((q, i) => {
        const queue = byQty[q];
        if (queue && queue.length) remapped[i] = queue.shift();
    });

    closeModal();
    withTransition(() => {
        renderChips();
        renderGrid(remapped);
        saveState();
    });
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
        <div class="card is-empty" data-idx="${i}" data-qty="${q}" style="--i:${Math.min(i, 5)}">
            <div class="card-top" data-qty-bg="${q}">
                <div class="card-top-left">
                    <div class="card-qty">${q} potes</div>
                    <div class="card-sub">${q * 30} Day Supply</div>
                </div>
                <div class="card-top-right">
                    <span class="best-tag">★ Melhor valor</span>
                    <span class="disc-badge" data-disc-pct></span>
                </div>
            </div>
            <div class="card-body">
                <label class="inp-label" for="disc-${i}">${inpLabel}</label>
                <div class="card-inp-wrap">
                    <div class="input-wrap has-prefix">
                        <span class="prefix" aria-hidden="true">$</span>
                        <input type="number" data-disc id="disc-${i}" min="0" step="0.01"
                               placeholder="0.00" inputmode="decimal"
                               aria-label="${inpLabel} — combo de ${q} potes"
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
        card.classList.add('is-empty');
        delete card.dataset.ppot;
        updateBest();
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

    // Estado visual: ranking de melhor valor.
    card.classList.remove('is-empty');
    card.dataset.ppot = ppot;
    updateBest();

    saveState();
}

// O menor valor por pote é sempre o maior desconto — o preço cheio por pote
// é o mesmo em todos os combos. Só marca se houver mais de um combo preenchido,
// senão "melhor valor" não significa nada.
function updateBest() {
    const cards = Array.from(el('grid').querySelectorAll('[data-idx]'));
    let best = null;
    let filled = 0;

    cards.forEach(c => {
        const p = parseFloat(c.dataset.ppot);
        if (isNaN(p)) return;
        filled++;
        if (best === null || p < parseFloat(best.dataset.ppot)) best = c;
    });

    cards.forEach(c => c.classList.toggle('is-best', filled > 1 && c === best));
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
    applyTheme();

    // Sem escolha do usuário, o ícone precisa acompanhar o sistema se ele
    // mudar com a página aberta.
    window.matchMedia('(prefers-color-scheme: light)')
        .addEventListener('change', () => { if (!theme) applyTheme(); });

    updateModeButtons();
    renderChips();
    renderGrid(discounts);
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
