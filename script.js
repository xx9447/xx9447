const SYMBOLS = [
    { name: 'Dagger', icon: '🗡️', p3: 2, p4: 5, p5: 15 },
    { name: 'Mask', icon: '🎭', p3: 2, p4: 5, p5: 15 },
    { name: 'Key', icon: '🔑', p3: 3, p4: 8, p5: 20 },
    { name: 'Lantern', icon: '🏮', p3: 3, p4: 8, p5: 20 },
    { name: 'Eye', icon: '👁️', p3: 5, p4: 15, p5: 40 },
    { name: 'Raven', icon: '🐦', p3: 5, p4: 15, p5: 40 },
    { name: 'Ring', icon: '💍', p3: 10, p4: 25, p5: 80 },
    { name: 'Skull', icon: '💀', p3: 15, p4: 50, p5: 150 }
];

const WILD = { name: 'Wild', icon: '🌌' };
const SCATTER = { name: 'Scatter', icon: '📜' };

let balance = 100000;
let currentBet = 10;
let isSpinning = false;
let autoSpin = false;
let freeSpinsLeft = 0;
let stickyWilds = []; // Stores {reel, row}
let currentMultiplier = 1;

const reelsContainer = document.getElementById('reels-container');
const winLog = document.getElementById('win-log');

// Initialize Reels
function init() {
    for (let i = 0; i < 5; i++) {
        const reelDiv = document.createElement('div');
        reelDiv.className = 'reel';
        reelDiv.id = `reel-${i}`;
        for (let j = 0; j < 4; j++) {
            const symbolDiv = document.createElement('div');
            symbolDiv.className = 'symbol';
            symbolDiv.innerHTML = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)].icon;
            reelDiv.appendChild(symbolDiv);
        }
        reelsContainer.appendChild(reelDiv);
    }
    updateUI();
    buildPaytable();
}

function updateUI() {
    document.getElementById('balance').innerText = Math.floor(balance);
    const spinBtn = document.getElementById('spin-btn');
    if (balance < currentBet && freeSpinsLeft === 0) {
        spinBtn.disabled = true;
        spinBtn.innerText = "NO COINS";
    } else {
        spinBtn.disabled = isSpinning;
        spinBtn.innerText = freeSpinsLeft > 0 ? "FREE SPIN" : "SPIN";
    }
    
    const fsIndicator = document.getElementById('free-spin-indicator');
    if (freeSpinsLeft > 0) {
        fsIndicator.classList.remove('hidden');
        document.getElementById('fs-count').innerText = freeSpinsLeft;
        document.getElementById('fs-mult').innerText = currentMultiplier;
    } else {
        fsIndicator.classList.add('hidden');
    }
}

async function spin() {
    if (isSpinning) return;
    if (balance < currentBet && freeSpinsLeft === 0) return;

    isSpinning = true;
    winLog.innerHTML = "Spinning...";
    
    if (freeSpinsLeft === 0) {
        balance -= currentBet;
        stickyWilds = []; // Clear sticky wilds if not in FS
    } else {
        freeSpinsLeft--;
    }

    updateUI();

    // Randomize Multiplier
    currentMultiplier = getRandomMultiplier(freeSpinsLeft > 0);

    // Simulate Spin Delay
    await new Promise(r => setTimeout(r, 600));

    const grid = generateGrid();
    renderGrid(grid);
    const results = calculateWins(grid);
    
    balance += results.totalWin;
    document.getElementById('last-win').innerText = results.totalWin;
    
    if (results.scatters >= 3) {
        freeSpinsLeft += 12;
        winLog.innerHTML = `<b style="color:gold">EXTRACTED 12 FREE SPINS!</b><br>` + winLog.innerHTML;
    }

    winLog.innerHTML = results.log + (results.totalWin > 0 ? ` <br>Total: ${results.totalWin}` : "");
    
    isSpinning = false;
    updateUI();

    if (autoSpin && !isSpinning) {
        setTimeout(spin, 800);
    }
}

function generateGrid() {
    let grid = [];
    for (let c = 0; c < 5; c++) {
        let reel = [];
        for (let r = 0; r < 4; r++) {
            // Check for sticky wild
            const isSticky = stickyWilds.some(sw => sw.c === c && sw.r === r);
            if (isSticky) {
                reel.push(WILD.icon);
                continue;
            }

            let rnd = Math.random();
            if (rnd < 0.05) reel.push(SCATTER.icon);
            else if (rnd < 0.12) {
                reel.push(WILD.icon);
                if (freeSpinsLeft > 0) stickyWilds.push({c, r}); // Save sticky
            }
            else {
                let symbol = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
                reel.push(symbol.icon);
            }
        }
        grid.push(reel);
    }
    return grid;
}

function renderGrid(grid) {
    for (let c = 0; c < 5; c++) {
        const reelDiv = document.getElementById(`reel-${c}`);
        reelDiv.innerHTML = '';
        for (let r = 0; r < 4; r++) {
            const sym = grid[c][r];
            const div = document.createElement('div');
            div.className = 'symbol';
            if (sym === WILD.icon) div.classList.add('wild');
            if (sym === SCATTER.icon) div.classList.add('scatter');
            if (stickyWilds.some(sw => sw.c === c && sw.r === r)) div.classList.add('sticky');
            div.innerHTML = sym;
            reelDiv.appendChild(div);
        }
    }
}

function calculateWins(grid) {
    let totalWin = 0;
    let log = "";
    let scatterCount = 0;

    // Check each regular symbol
    SYMBOLS.forEach(sym => {
        let matchCount = 0;
        let waysPerReel = [];

        for (let c = 0; c < 5; c++) {
            let matchesOnReel = 0;
            for (let r = 0; r < 4; r++) {
                if (grid[c][r] === sym.icon || grid[c][r] === WILD.icon) {
                    matchesOnReel++;
                }
            }
            if (matchesOnReel > 0) {
                matchCount++;
                waysPerReel.push(matchesOnReel);
            } else {
                break;
            }
        }

        if (matchCount >= 3) {
            let ways = waysPerReel.reduce((a, b) => a * b, 1);
            let basePayout = sym[`p${matchCount}`];
            let winAmount = basePayout * ways * (currentBet / 10) * currentMultiplier;
            totalWin += winAmount;
            log += `${sym.icon} x${matchCount} (${ways} ways): ${winAmount.toFixed(0)} | `;
        }
    });

    // Count Scatters
    grid.forEach(col => col.forEach(cell => { if(cell === SCATTER.icon) scatterCount++; }));

    return { totalWin, log, scatters: scatterCount };
}

function getRandomMultiplier(isFreeSpin) {
    let rnd = Math.random();
    if (isFreeSpin) {
        if (rnd < 0.02) return 100;
        if (rnd < 0.05) return 50;
        if (rnd < 0.4) return 3;
        return 2;
    } else {
        if (rnd < 0.005) return 100;
        if (rnd < 0.01) return 50;
        if (rnd < 0.05) return 3;
        if (rnd < 0.1) return 2;
        return 1;
    }
}

// UI Handlers
document.getElementById('spin-btn').addEventListener('click', () => { autoSpin = false; spin(); });
document.getElementById('auto-btn').addEventListener('click', () => { 
    autoSpin = true; 
    document.getElementById('auto-btn').classList.add('hidden');
    document.getElementById('stop-btn').classList.remove('hidden');
    spin(); 
});
document.getElementById('stop-btn').addEventListener('click', () => { 
    autoSpin = false; 
    document.getElementById('auto-btn').classList.remove('hidden');
    document.getElementById('stop-btn').classList.add('hidden');
});
document.getElementById('bet-amount').addEventListener('change', (e) => {
    currentBet = parseInt(e.target.value);
    updateUI();
});

function togglePaytable() { document.getElementById('paytable-modal').classList.toggle('hidden'); }
function resetGame() { balance = 100000; updateUI(); winLog.innerHTML = "Balance Reset."; }

function buildPaytable() {
    const table = document.getElementById('payout-table');
    table.innerHTML = `<tr><th>Sym</th><th>x3</th><th>x4</th><th>x5</th></tr>`;
    SYMBOLS.forEach(s => {
        table.innerHTML += `<tr><td>${s.icon}</td><td>${s.p3}</td><td>${s.p4}</td><td>${s.p5}</td></tr>`;
    });
}

init();
