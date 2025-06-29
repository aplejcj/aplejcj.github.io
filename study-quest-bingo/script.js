// --- DOM SELECTORS ---
const boardEl = document.getElementById('bingo-board');
const levelEl = document.getElementById('level');
const expBarEl = document.getElementById('exp-bar');
const expTextEl = document.getElementById('exp-text');
const streakEl = document.getElementById('streak');
const coinsEl = document.getElementById('coins');
const modalContainer = document.getElementById('modal-container');
const modalTitleEl = document.getElementById('modal-title');
const modalBodyEl = document.getElementById('modal-body');
const levelUpNoticeEl = document.getElementById('level-up-notice');

// --- GAME CONFIG ---
const BOARD_SIZE = 4;
const LEVEL_EXP_BASE = 100;
const QUEST_TIERS = {
    'C': { points: 10 },
    'B': { points: 20 },
    'A': { points: 40 },
    'S': { points: 80 }
};

// --- GAME STATE & DATA ---
let player = {};
let tasks = {};
let board = [];
let dailyBonusClaimed = false;

const defaultPlayer = () => ({
    level: 1,
    exp: 0,
    coins: 0,
    streak: 0,
    lastLogin: null,
    skills: { phys: 0, math: 0, read: 0 },
    themes: ['dark'],
    currentTheme: 'dark'
});

const defaultTasks = () => ({
    phys: [{ text: 'ทำโจทย์ฟิสิกส์ 5 ข้อ', tier: 'B' }],
    math: [{ text: 'แก้สมการ 10 ข้อ', tier: 'C' }],
    read: [{ text: 'อ่านหนังสือ 15 หน้า', tier: 'B' }]
});

// --- CORE FUNCTIONS ---

function saveData() {
    const gameState = {
        player,
        tasks
    };
    localStorage.setItem('studyBingoData', JSON.stringify(gameState));
}

function loadData() {
    const savedData = localStorage.getItem('studyBingoData');
    if (savedData) {
        const gameState = JSON.parse(savedData);
        player = gameState.player;
        tasks = gameState.tasks;
    } else {
        player = defaultPlayer();
        tasks = defaultTasks();
    }
}

function checkDailyBonus() {
    const today = new Date().toDateString();
    if (player.lastLogin !== today) {
        // Daily Login Bonus
        const yesterday = new Date(Date.now() - 864e5).toDateString();
        if (player.lastLogin === yesterday) {
            player.streak++;
        } else {
            player.streak = 1;
        }
        player.lastLogin = today;
        
        const bonusCoins = 50 + (player.streak * 10);
        player.coins += bonusCoins;
        dailyBonusClaimed = true;
        
        // Update modal content for daily bonus
        modalTitleEl.innerText = `โบนัสล็อกอินวันที่ ${player.streak}!`;
        modalBodyEl.innerHTML = `<p>ยอดเยี่ยม! คุณได้รับ ${bonusCoins} 🪙 เป็นรางวัลสำหรับการเล่นต่อเนื่อง!</p>`;
        modalContainer.classList.remove('hidden');
    }
}

function generateBoard() {
    let availableTasks = [...tasks.phys, ...tasks.math, ...tasks.read];
    if (availableTasks.length < BOARD_SIZE * BOARD_SIZE) {
        alert("โปรดเพิ่มเควสต์ในคลังให้มากกว่า 16 เควสต์");
        return;
    }

    board = [];
    let usedIndexes = new Set();
    for (let i = 0; i < BOARD_SIZE * BOARD_SIZE; i++) {
        let randomIndex;
        do {
            randomIndex = Math.floor(Math.random() * availableTasks.length);
        } while (usedIndexes.has(randomIndex));
        usedIndexes.add(randomIndex);
        board.push({ ...availableTasks[randomIndex], completed: false, index: i });
    }
    renderBoard();
}

function renderBoard() {
    boardEl.innerHTML = '';
    board.forEach(task => {
        const cell = document.createElement('div');
        cell.classList.add('cell');
        if (task.completed) cell.classList.add('completed');
        
        cell.innerHTML = `
            <span>${task.text}</span>
            <span class="tier tier-${task.tier}">${task.tier}</span>
        `;
        cell.dataset.index = task.index;
        boardEl.appendChild(cell);
    });
}

function updateStatsUI() {
    const maxExp = LEVEL_EXP_BASE * player.level;
    levelEl.innerText = player.level;
    expBarEl.style.width = `${(player.exp / maxExp) * 100}%`;
    expTextEl.innerText = `${player.exp}/${maxExp}`;
    streakEl.innerText = `🔥 ${player.streak}`;
    coinsEl.innerText = player.coins;
    
    // Apply theme
    document.body.className = ''; // clear previous themes
    document.body.classList.add(`theme-${player.currentTheme}`);
}

function addExp(amount) {
    player.exp += amount;
    const maxExp = LEVEL_EXP_BASE * player.level;
    if (player.exp >= maxExp) {
        player.exp -= maxExp;
        player.level++;
        levelUp();
    }
    updateStatsUI();
    saveData();
}

function levelUp() {
    levelUpNoticeEl.classList.remove('hidden');
    setTimeout(() => {
        levelUpNoticeEl.classList.add('hidden');
    }, 2000);
    // You could add skill points here in the future
}

function checkForBingo() {
    const lines = [
        [0,1,2,3], [4,5,6,7], [8,9,10,11], [12,13,14,15], // rows
        [0,4,8,12], [1,5,9,13], [2,6,10,14], [3,7,11,15], // cols
        [0,5,10,15], [3,6,9,12] // diags
    ];

    let bingoCount = 0;
    lines.forEach(line => {
        if (line.every(index => board[index].completed)) {
            bingoCount++;
            line.forEach(index => {
                boardEl.children[index].classList.add('bingo');
            });
        }
    });

    if (bingoCount > 0) {
        const bonusCoins = 50 * bingoCount;
        player.coins += bonusCoins;
        // You can add a notice for bingo bonus here
    }
}

function handleTaskClick(e) {
    const cell = e.target.closest('.cell');
    if (!cell || cell.classList.contains('completed')) return;

    const index = parseInt(cell.dataset.index);
    const task = board[index];
    
    task.completed = true;
    cell.classList.add('completed');

    const points = QUEST_TIERS[task.tier].points;
    addExp(points);
    player.coins += points;
    
    checkForBingo();
    updateStatsUI();
    saveData();
}

// --- MODAL CONTENT FUNCTIONS ---

function openTasksModal() {
    modalTitleEl.innerText = 'คลังเควสต์';
    let content = '<h3>ยังไม่สามารถจัดการเควสต์ได้ในเวอร์ชันนี้</h3>';
    // This section can be expanded to allow adding/deleting tasks
    modalBodyEl.innerHTML = content;
    modalContainer.classList.remove('hidden');
}

function openSkillsModal() {
    modalTitleEl.innerText = 'ตารางสกิล';
    let content = '<h3>ยังไม่เปิดใช้งานระบบสกิล</h3>';
    // This can be expanded into a full skill tree
    modalBodyEl.innerHTML = content;
    modalContainer.classList.remove('hidden');
}

function openShopModal() {
    modalTitleEl.innerText = 'ร้านค้า';
    const themes = [
        { id: 'dark', name: 'ธีมมืด (เริ่มต้น)', cost: 0 },
        { id: 'light', name: 'ธีมสว่าง', cost: 100 },
        { id: 'forest', name: 'ธีมพงไพร', cost: 200 }
    ];

    let content = '<div class="shop-items">';
    themes.forEach(theme => {
        const isOwned = player.themes.includes(theme.id);
        const isEquipped = player.currentTheme === theme.id;
        
        content += `
            <div class="shop-item">
                <span>${theme.name}</span>
                <button class="buy-theme-btn" 
                    data-theme-id="${theme.id}" 
                    data-theme-cost="${theme.cost}"
                    ${isOwned ? 'disabled' : ''}>
                    ${isOwned ? 'มีแล้ว' : `${theme.cost} 🪙`}
                </button>
                ${isOwned ? `<button class="equip-theme-btn" data-theme-id="${theme.id}" ${isEquipped ? 'disabled' : ''}>${isEquipped ? 'สวมใส่' : 'ใช้งาน'}</button>` : ''}
            </div>
        `;
    });
    content += '</div>';

    modalBodyEl.innerHTML = content;
    modalContainer.classList.remove('hidden');
}

function handleShopClick(e) {
    if (e.target.classList.contains('buy-theme-btn')) {
        const themeId = e.target.dataset.themeId;
        const cost = parseInt(e.target.dataset.themeCost);

        if (player.coins >= cost) {
            player.coins -= cost;
            player.themes.push(themeId);
            updateStatsUI();
            saveData();
            openShopModal(); // Refresh shop view
        } else {
            alert('Coins ไม่เพียงพอ!');
        }
    } else if (e.target.classList.contains('equip-theme-btn')) {
        const themeId = e.target.dataset.themeId;
        player.currentTheme = themeId;
        updateStatsUI();
        saveData();
        openShopModal(); // Refresh shop view
    }
}


// --- EVENT LISTENERS ---
boardEl.addEventListener('click', handleTaskClick);

document.querySelector('.close-modal-btn').addEventListener('click', () => {
    modalContainer.classList.add('hidden');
});

document.getElementById('task-btn').addEventListener('click', openTasksModal);
document.getElementById('skill-btn').addEventListener('click', openSkillsModal);
document.getElementById('shop-btn').addEventListener('click', openShopModal);
modalBodyEl.addEventListener('click', handleShopClick);


// --- INITIALIZATION ---
function initGame() {
    loadData();
    if (!dailyBonusClaimed) {
        checkDailyBonus();
    }
    generateBoard();
    updateStatsUI();
}

initGame();