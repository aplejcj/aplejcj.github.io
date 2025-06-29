// --- DOM SELECTORS ---
const boardEl = document.getElementById('bingo-board');
const levelEl = document.getElementById('level');
const expBarEl = document.getElementById('exp-bar');
const expTextEl = document.getElementById('exp-text');
const streakEl = document.getElementById('streak');
const coinsEl = document.getElementById('coins');
const skillPointsEl = document.getElementById('skill-points-display');
const inventoryItemsEl = document.getElementById('inventory-items');
const modalContainer = document.getElementById('modal-container');
const modalTitleEl = document.getElementById('modal-title');
const modalBodyEl = document.getElementById('modal-body');
const levelUpNoticeEl = document.getElementById('level-up-notice');
const newBoardBtn = document.getElementById('new-board-btn');

// --- GAME CONFIG & DATA ---
const BOARD_SIZE = 4;
const LEVEL_EXP_BASE = 100;
const QUEST_TIERS = {
    'C': { points: 10 }, 'B': { points: 20 }, 'A': { points: 40 }, 'S': { points: 80 }
};
const SHOP_ITEMS = {
    reroll: { name: 'ตั๋วสุ่มเควสต์ใหม่', desc: 'ยังไม่สามารถใช้งานได้', cost: 75 },
    exp_potion: { name: 'ขวดยา EXP', desc: 'ได้รับ 50 EXP ทันที', cost: 150 }
};
const SKILLS = {
    phys: { name: 'ฟิสิกส์', maxLevel: 3, levels: [{desc: '+10% EXP/Coins จากฟิสิกส์'}, {desc: 'มีโอกาส 10% ที่เควสต์ฟิสิกส์ใช้แค่ครึ่งแต้ม'}, {desc: 'โบนัส Bingo x1.5 หากมีฟิสิกส์'}] },
    math: { name: 'คณิตศาสตร์', maxLevel: 3, levels: [{desc: '+10% EXP/Coins จากคณิต'}, {desc: 'ปลดล็อก Combo Gauge'}, {desc: 'เพิ่มโบนัสจาก Combo'}] },
    read: { name: 'การอ่าน', maxLevel: 3, levels: [{desc: '+10% EXP/Coins จากการอ่าน'}, {desc: 'ลดเงื่อนไขเควสต์เวลา 10%'}, {desc: 'มีโอกาส 20% ได้รับ Coins 2 เท่า'}] }
};

// --- GAME STATE ---
let player;
let board = [];
let dailyBonusClaimed = false;

const defaultPlayer = () => ({
    level: 1, exp: 0, coins: 100, streak: 0, skillPoints: 0,
    lastLogin: null,
    skills: { phys: 0, math: 0, read: 0 },
    inventory: { reroll: 0, exp_potion: 0 }
});

const defaultTasks = () => ({
    phys: [
        { text: 'ทำโจทย์การเคลื่อนที่', tier: 'B', subject: 'ฟิสิกส์' }, { text: 'สรุปสูตรไฟฟ้า', tier: 'A', subject: 'ฟิสิกส์' },
        { text: 'ดูคลิปติวเรื่องคลื่น', tier: 'C', subject: 'ฟิสิกส์' }, { text: 'ทำข้อสอบเก่า', tier: 'S', subject: 'ฟิสิกส์' },
    ],
    math: [
        { text: 'แก้สมการ', tier: 'C', subject: 'คณิตศาสตร์' }, { text: 'ทำโจทย์แคลคูลัส', tier: 'B', subject: 'คณิตศาสตร์' },
        { text: 'พิสูจน์ทฤษฎีบท', tier: 'A', subject: 'คณิตศาสตร์' }, { text: 'ทำโจทย์สถิติ', tier: 'B', subject: 'คณิตศาสตร์' },
    ],
    read: [
        { text: 'อ่านหนังสือเรียน', tier: 'C', subject: 'การอ่าน' }, { text: 'สรุปเนื้อหาที่อ่าน', tier: 'B', subject: 'การอ่าน' },
        { text: 'ท่องศัพท์/คำนิยาม', tier: 'A', subject: 'การอ่าน' }, { text: 'ทำ Mind Map', tier: 'B', subject: 'การอ่าน' },
    ]
});
let tasks = defaultTasks();

// --- CORE FUNCTIONS ---
function saveData() { localStorage.setItem('studyBingoData', JSON.stringify(player)); }
function loadData() {
    const saved = localStorage.getItem('studyBingoData');
    player = saved ? JSON.parse(saved) : defaultPlayer();
}

function checkDailyBonus() {
    const today = new Date().toDateString();
    if (player.lastLogin !== today) {
        const yesterday = new Date(Date.now() - 864e5).toDateString();
        player.streak = (player.lastLogin === yesterday) ? player.streak + 1 : 1;
        player.lastLogin = today;
        const bonusCoins = 50 + (player.streak * 10);
        player.coins += bonusCoins;
        dailyBonusClaimed = true;
        showModal(`โบนัสล็อกอินวันที่ ${player.streak}!`, `<p>ยอดเยี่ยม! คุณได้รับ ${bonusCoins} 🪙 เป็นรางวัลสำหรับการเล่นต่อเนื่อง!</p>`);
    }
}

function generateBoard() {
    let availableTasks = [...tasks.phys, ...tasks.math, ...tasks.read];
    board = [];
    for (let i = 0; i < BOARD_SIZE * BOARD_SIZE; i++) {
        let task = availableTasks[Math.floor(Math.random() * availableTasks.length)];
        board.push({ ...task, completed: false, index: i });
    }
    renderBoard();
}

function renderBoard() {
    boardEl.innerHTML = board.map(task => `
        <div class="cell ${task.completed ? 'completed' : ''}" data-index="${task.index}">
            <span class="task-text">${task.text}</span>
            <span class="task-subject">${task.subject}</span>
            <span class="tier tier-${task.tier}">${task.tier}</span>
        </div>
    `).join('');
}

function updateUI() {
    const maxExp = LEVEL_EXP_BASE * player.level;
    levelEl.innerText = player.level;
    expBarEl.style.width = `${(player.exp / maxExp) * 100}%`;
    expTextEl.innerText = `${player.exp}/${maxExp}`;
    streakEl.innerText = `🔥 ${player.streak}`;
    coinsEl.innerText = `🪙 ${player.coins}`;
    skillPointsEl.innerText = player.skillPoints;
    renderInventory();
    saveData();
}

function renderInventory() {
    inventoryItemsEl.innerHTML = Object.keys(player.inventory).filter(key => player.inventory[key] > 0).map(key => `
        <div class="inventory-item" data-item-id="${key}" title="${SHOP_ITEMS[key].name}">
            ${key.slice(0,4)}: ${player.inventory[key]}
        </div>
    `).join('');
}

function addExp(basePoints, subject) {
    let finalPoints = basePoints;
    if (subject === 'ฟิสิกส์' && player.skills.phys > 0) finalPoints *= 1.1;
    if (subject === 'คณิตศาสตร์' && player.skills.math > 0) finalPoints *= 1.1;
    if (subject === 'การอ่าน' && player.skills.read > 0) finalPoints *= 1.1;
    
    player.exp += Math.round(finalPoints);
    player.coins += Math.round(finalPoints);

    const maxExp = LEVEL_EXP_BASE * player.level;
    if (player.exp >= maxExp) {
        player.exp -= maxExp;
        player.level++;
        player.skillPoints++;
        levelUp();
    }
    updateUI();
}

function levelUp() {
    levelUpNoticeEl.innerHTML = `LV UP! <br> LV ${player.level}`;
    levelUpNoticeEl.classList.remove('hidden');
    setTimeout(() => levelUpNoticeEl.classList.add('hidden'), 2500);
}

function checkForBingo() {
    const lines = [[0,1,2,3],[4,5,6,7],[8,9,10,11],[12,13,14,15],[0,4,8,12],[1,5,9,13],[2,6,10,14],[3,7,11,15],[0,5,10,15],[3,6,9,12]];
    let bingoCount = 0;
    lines.forEach(line => {
        if (line.every(index => board[index].completed)) {
            bingoCount++;
            line.forEach(index => {
                const cell = boardEl.querySelector(`[data-index='${index}']`);
                if(cell) cell.classList.add('bingo');
            });
        }
    });
    if (bingoCount > 0) {
        player.coins += (50 * bingoCount);
        newBoardBtn.classList.remove('hidden');
        updateUI();
    }
}

// --- MODAL & EVENT HANDLERS ---
function showModal(title, content) {
    modalTitleEl.innerText = title;
    modalBodyEl.innerHTML = content;
    modalContainer.classList.remove('hidden');
    document.body.classList.add('modal-open');
}

function closeModal() {
    modalContainer.classList.add('hidden');
    document.body.classList.remove('modal-open');
}

function openShopModal() {
    const content = `<div class="shop-container">
        ${Object.keys(SHOP_ITEMS).map(key => `
            <div class="shop-item">
                <div>
                    <p>${SHOP_ITEMS[key].name}</p>
                    <p class="item-desc">${SHOP_ITEMS[key].desc}</p>
                </div>
                <button class="buy-btn" data-item-id="${key}" ${player.coins < SHOP_ITEMS[key].cost ? 'disabled' : ''}>${SHOP_ITEMS[key].cost} 🪙</button>
            </div>
        `).join('')}
    </div>`;
    showModal('ร้านค้า', content);
}

function openSkillsModal() {
    const content = `<div class="skill-tree-container">
        ${Object.keys(SKILLS).map(key => {
            const skill = SKILLS[key];
            const currentLevel = player.skills[key];
            return `<div class="skill-branch">
                <h4>${skill.name} (LV ${currentLevel})</h4>
                ${skill.levels.map((level, i) => {
                    const levelNum = i + 1;
                    let classes = 'skill-node';
                    if (currentLevel >= levelNum) classes += ' unlocked';
                    if (currentLevel === skill.maxLevel) classes += ' maxed';
                    return `<div class="${classes}" data-skill-key="${key}" data-skill-level="${levelNum}">
                        <p>LV ${levelNum}: ${level.desc}</p>
                        <span class="cost">${(currentLevel + 1 === levelNum && player.skillPoints > 0) ? 'ปลดล็อก: 1 SP' : ''}</span>
                    </div>`;
                }).join('')}
            </div>`;
        }).join('')}
    </div>`;
    showModal(`สกิล (คุณมี ${player.skillPoints} SP)`, content);
}

function handleBoardClick(e) {
    const cell = e.target.closest('.cell');
    if (!cell || cell.classList.contains('completed')) return;
    const index = parseInt(cell.dataset.index);
    const task = board[index];
    task.completed = true;
    addExp(QUEST_TIERS[task.tier].points, task.subject);
    checkForBingo();
}

function handleInventoryClick(e) {
    const itemEl = e.target.closest('.inventory-item');
    if (!itemEl) return;
    const itemId = itemEl.dataset.itemId;
    if (player.inventory[itemId] > 0) {
        player.inventory[itemId]--;
        if (itemId === 'exp_potion') { addExp(50, 'Bonus'); }
        // Add logic for reroll ticket here later
        updateUI();
    }
}

function handleModalClick(e) {
    // Shop logic
    const buyBtn = e.target.closest('.buy-btn');
    if (buyBtn) {
        buyBtn.disabled = true;
        const itemId = buyBtn.dataset.itemId;
        const item = SHOP_ITEMS[itemId];
        if (player.coins >= item.cost) {
            player.coins -= item.cost;
            player.inventory[itemId]++;
            updateUI();
            openShopModal();
        }
    }

    // Skill logic
    const skillNode = e.target.closest('.skill-node');
    if (skillNode && !skillNode.classList.contains('unlocked') && !skillNode.classList.contains('maxed')) {
        const key = skillNode.dataset.skillKey;
        const level = parseInt(skillNode.dataset.skillLevel);
        if (player.skillPoints > 0 && player.skills[key] === level - 1) {
            player.skillPoints--;
            player.skills[key]++;
            updateUI();
            openSkillsModal();
        }
    }
}

// --- EVENT LISTENERS ---
boardEl.addEventListener('click', handleBoardClick);
inventoryItemsEl.addEventListener('click', handleInventoryClick);
document.getElementById('shop-btn').addEventListener('click', openShopModal);
document.getElementById('skill-btn').addEventListener('click', openSkillsModal);
modalContainer.addEventListener('click', (e) => {
    if (e.target === modalContainer || e.target.classList.contains('close-modal-btn')) {
        closeModal();
    }
});
modalBodyEl.addEventListener('click', handleModalClick);
newBoardBtn.addEventListener('click', () => {
    player.coins += 25; // Board clear bonus
    updateUI();
    generateBoard();
    newBoardBtn.classList.add('hidden');
});

// --- INITIALIZATION ---
function init() {
    loadData();
    checkDailyBonus();
    generateBoard();
    updateUI();
}
init();