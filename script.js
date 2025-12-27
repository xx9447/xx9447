// 1. Symbol Configuration & Weights
const SYMBOLS = [
    { id: 'LT', name: 'Lantern', icon: '🏮', p3: 2, p4: 5, p5: 10, w: 100 },
    { id: 'KY', name: 'Key',     icon: '🔑', p3: 2, p4: 5, p5: 10, w: 100 },
    { id: 'EY', name: 'Eye',     icon: '👁️', p3: 3, p4: 6, p5: 15, w: 90 },
    { id: 'MS', name: 'Mask',    icon: '🎭', p3: 4, p4: 10, p5: 25, w: 70 },
    { id: 'RV', name: 'Raven',   icon: '🐦', p3: 5, p4: 15, p5: 40, w: 60 },
    { id: 'RG', name: 'Ring',    icon: '💍', p3: 10, p4: 25, p5: 60, w: 40 },
    { id: 'DG', name: 'Dagger',  icon: '🗡️', p3: 20, p4: 50, p5: 150, w: 20 },
    { id: 'SK', name: 'Skull',   icon: '💀', p3: 30, p4: 80, p5: 300, w: 10 }
];

const WILD = { icon: '🌌', w: 8 }; 
const SCATTER = { icon: '📜', w: 4 };

let state = {
    balance: 100000,
    bet: 10,
    isSpinning: false,
    auto: false,
    freeSpins: 0,
    multiplier: 1,
    stickyWilds: [],
    debug: false
};

const UI = {
    reels: [],
    balance: document.getElementById('balance'),
    win: document.getElementById('last-win'),
    log: document.getElementById('win-log'),
    btnSpin: document.getElementById('spin-btn')
};

// Initialize
function init() {
    const container = document.getElementById('reels-container');
    for (let i = 0; i < 5; i++) {
        const reel = document.createElement('div');
        reel.className = 'reel';
        reel.id = `reel-${i}`;
        for (let j = 0; j < 4; j++) {
            const sym = document.createElement('div');
            sym.className = 'symbol';
            sym.innerHTML = SYMBOLS[0].icon;
            reel.appendChild(sym);
        }
        container.appendChild(reel);
        UI.reels.push(reel);
    }
    updateUI();
    buildPaytable();
}

// RNG with Weights
function getRandomSymbol() {
    const pool = [];
    SYMBOLS.forEach(s => { for(let i=0; i<s.w; i++) pool.push(s.icon); });
    for(let i=0; i<WILD.w; i++) pool.push(WILD.icon);
    for(let i=0; i<SCATTER.w; i++) pool.push(SCATTER.icon);
    return pool[Math.floor(Math.random() * pool.length)];
}

async function spin() {
    if (state.isSpinning) return;
    if (state.balance < state.bet && state.freeSpins === 0) {
        state.auto = false;
        return;
    }

    state.isSpinning = true;
    if (state.freeSpins === 0) {
        state.balance -= state.bet;
        state.stickyWilds = [];
    } else {
        state.freeSpins--;
    }
    
    updateUI();
    UI.log.innerHTML = "Spinning...";
    clearHighlights();

    // Generate Results
    const grid = [];
    let scatters = 0;
    for(let c=0; c<5; c++) {
        const col = [];
        for(let r=0; r<4; r++) {
            const sticky = state.stickyWilds.find(sw => sw.c === c && sw.r === r);
            if (sticky) {
                col.push(WILD.icon);
            } else {
                const s = getRandomSymbol();
                if (s === SCATTER.icon) scatters++;
                if (s === WILD.icon && state.freeSpins > 0) state.stickyWilds.push({c, r});
                col.push(s);
            }
        }
        grid.push(col);
    }

    // Roll Multiplier
    state.multiplier = rollMultiplier(state.freeSpins > 0);

    // Animation: Sequential stop
    for (let i = 0; i < 5; i++) {
        UI.reels[i].classList.add('spinning');
        await new Promise(r => setTimeout(r, 120));
    }

    await new Promise(r => setTimeout(r, 400));

    for (let i = 0; i < 5; i++) {
        renderReel(i, grid[i]);
        UI.reels[i].classList.remove('spinning');
        await new Promise(r => setTimeout(r, 150));
    }

    // Process Wins
    const result = calculateResult(grid);
    handleWin(result, scatters);

    if (state.debug) updateDebug(scatters, result);

    state.isSpinning = false;
    updateUI();

    if (state.auto) setTimeout(spin, 900);
}

function calculateResult(grid) {
    let totalWin = 0;
    let winningCells = [];
    let log = "";
    const minMatch = state.freeSpins > 0 ? 3 : 4;

    SYMBOLS.forEach(sym => {
        let matchCount = 0;
        let ways = 1;
        let currentWinningCells = [];

        for (let c = 0; c < 5; c++) {
            let matchesOnReel = 0;
            let tempCells = [];
            for (let r = 0; r < 4; r++) {
                if (grid[c][r] === sym.icon || grid[c][r] === WILD.icon) {
                    matchesOnReel++;
                    tempCells.push({c, r});
                }
            }
            if (matchesOnReel > 0) {
                matchCount++;
                ways *= matchesOnReel;
                currentWinningCells.push(...tempCells);
            } else break;
        }

        if (matchCount >= minMatch) {
            const payout = sym[`p${matchCount}`] * ways * (state.bet / 10) * state.multiplier;
            totalWin += payout;
            winningCells.push(...currentWinningCells);
            log += `${sym.icon} x${matchCount} (${ways} ways) `;
        }
    });

    // Max Win Cap (500x Bet)
    const maxWin = state.bet * 500;
    if (totalWin > maxWin) totalWin = maxWin;

    return { totalWin, winningCells, log };
}

async function handleWin(res, scatters) {
    if (res.totalWin > 0) {
        highlightWins(res.winningCells);
        if (state.multiplier > 1) {
            document.getElementById('multiplier-display').classList.remove('hidden');
            document.getElementById('mult-val').innerText = state.multiplier;
        }
        await countUpBalance(res.totalWin);
        UI.log.innerHTML = res.log;
    } else {
        document.getElementById('multiplier-display').classList.add('hidden');
        UI.log.innerHTML = "No Win";
    }

    if (scatters === 3) state.freeSpins += 10;
    else if (scatters === 4) state.freeSpins += 15;
}

function rollMultiplier(isFS) {
    const r = Math.random() * 100;
    if (isFS) {
        if (r < 0.08) return 100;
        if (r < 0.3) return 50;
        if (r < 3) return 3;
        if (r < 8) return 2;
    } else {
        if (r < 0.01) return 100;
        if (r < 0.03) return 50;
        if (r < 0.2) return 3;
        if (r < 0.8) return 2;
    }
    return 1;
}

// Helpers
async function countUpBalance(amount) {
    const start = state.balance;
    const end = state.balance + amount;
    const duration = 800;
    const step = amount / (duration / 20);
    
    return new Promise(resolve => {
        let current = start;
        const timer = setInterval(() => {
            current += step;
            if (current >= end) {
                state.balance = end;
                UI.balance.innerText = Math.floor(state.balance);
                UI.win.innerText = Math.floor(amount);
                clearInterval(timer);
                resolve();
            } else {
                UI.balance.innerText = Math.floor(current);
            }
        }, 20);
    });
}

function renderReel(c, symbols) {
    const reel = UI.reels[c];
    reel.innerHTML = '';
    symbols.forEach((s, r) => {
        const div = document.createElement('div');
        div.className = 'symbol';
        if (s === WILD.icon) div.style.color = 'var(--gold)';
        if (state.stickyWilds.some(sw => sw.c === c && sw.r === r)) div.style.border = '1px solid var(--gold)';
        div.innerHTML = s;
        reel.appendChild(div);
    });
}

function highlightWins(cells) {
    cells.forEach(cell => {
        const el = UI.reels[cell.c].children[cell.r];
        el.classList.add('win-highlight');
    });
}

function clearHighlights() {
    document.querySelectorAll('.symbol').forEach(s => s.classList.remove('win-highlight'));
}

function updateUI() {
    UI.balance.innerText = Math.floor(state.balance);
    UI.btnSpin.disabled = state.isSpinning;
    const fsInd = document.getElementById('free-spin-indicator');
    if (state.freeSpins > 0) {
        fsInd.classList.remove('hidden');
        document.getElementById('fs-count').innerText = state.freeSpins;
    } else {
        fsInd.classList.add('hidden');
    }
}

// Listeners
UI.btnSpin.addEventListener('click', () => { state.auto = false; spin(); });
document.getElementById('auto-btn').addEventListener('click', () => { 
    state.auto = true; 
    document.getElementById('auto-btn').classList.add('hidden');
    document.getElementById('stop-btn').classList.remove('hidden');
    spin(); 
});
document.getElementById('stop-btn').addEventListener('click', () => { 
    state.auto = false;
    document.getElementById('auto-btn').classList.remove('hidden');
    document.getElementById('stop-btn').classList.add('hidden');
});
document.getElementById('settings-btn').addEventListener('click', () => {
    state.debug = !state.debug;
    document.getElementById('debug-panel').classList.toggle('hidden');
});
document.getElementById('bet-amount').addEventListener('change', (e) => state.bet = parseInt(e.target.value));

function togglePaytable() { document.getElementById('paytable-modal').classList.toggle('hidden'); }
function resetGame() { state.balance = 100000; state.freeSpins = 0; updateUI(); }

function buildPaytable() {
    const table = document.getElementById('payout-table');
    table.innerHTML = `<tr><th>Sym</th><th>x4</th><th>x5</th></tr>`;
    SYMBOLS.forEach(s => {
        table.innerHTML += `<tr><td>${s.icon}</td><td>${s.p4}</td><td>${s.p5}</td></tr>`;
    });
}

function updateDebug(sc, res) {
    document.getElementById('debug-content').innerHTML = `
        Scatters: ${sc} | Mult Roll: x${state.multiplier} <br>
        Raw Win: ${res.totalWin.toFixed(0)} | Ways Log: ${res.log}
    `;
}

init();
