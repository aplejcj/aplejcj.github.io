document.addEventListener('DOMContentLoaded', () => {
    // --- DOM SELECTORS ---
    const boardEl = document.getElementById('bingo-board');
    const playerLevelEl = document.getElementById('player-level');
    const prestigeIconEl = document.getElementById('prestige-icon');
    const expBarEl = document.getElementById('exp-bar');
    const expTextEl = document.getElementById('exp-text');
    const streakEl = document.getElementById('streak');
    const coinsEl = document.getElementById('coins');
    const skillPointsEl = document.getElementById('skill-points-display');
    const inventoryItemsEl = document.getElementById('inventory-items');
    const modalContainer = document.getElementById('modal-container');
    const modalTitleEl = document.getElementById('modal-title');
    const modalBodyEl = document.getElementById('modal-body');
    const gameNoticeEl = document.getElementById('game-notice');
    const prestigeBtn = document.getElementById('prestige-btn');
    const newBoardBtn = document.getElementById('new-board-btn');
    const weatherDisplayEl = document.getElementById('weather-display');
    const weatherIconEl = document.getElementById('weather-icon');
    const weatherTextEl = document.getElementById('weather-text');
    
    // --- APP-WIDE PAGE SELECTORS (NEW) ---
    const navButtons = document.querySelectorAll('.nav-btn');
    const backButtons = document.querySelectorAll('.back-btn');
    
    // --- GAME CONFIG & DATA (REBALANCED) ---
    const BOARD_SIZE = 4;
    const LEVEL_EXP_BASE = 100;
    const PRESTIGE_LEVEL = 50;
    const PRE_PRESTIGE_RANGE = 5;
    const QUEST_TIERS = { 'C': { points: 15 }, 'B': { points: 25 }, 'A': { points: 50 }, 'S': { points: 100 } };
    const SHOP_ITEMS = {
        reroll: { name: 'ตั๋วสุ่มเควสต์ใหม่', desc: 'คลิกใช้แล้วเลือกช่องที่ต้องการสุ่มใหม่', cost: 200 },
        exp_potion: { name: 'ขวดยา EXP', desc: 'ได้รับ 100 EXP ทันที', cost: 400 },
        bingo_marker: { name: 'ปากกาบิงโก', desc: 'คลิกใช้แล้วเลือกช่องที่ต้องการทำให้สำเร็จฟรี', cost: 850 }
    };
    const SKILLS = {
        phys: { name: 'ฟิสิกส์', maxLevel: 5, levels: [{desc: '+10% EXP', cost: 1}, {desc: '+15% Coins', cost: 2}, {desc: 'โบนัส Bingo x1.2', cost: 2}, {desc: '+10% โอกาสได้ไอเทม', cost: 3}, {desc: 'ปลดล็อกท่าไม้ตายฟิสิกส์', cost: 3}] },
        math: { name: 'คณิตศาสตร์', maxLevel: 5, levels: [{desc: '+10% EXP', cost: 1}, {desc: '+15% Coins', cost: 2}, {desc: 'ปลดล็อก Combo Gauge', cost: 2}, {desc: '+10% โอกาสได้ไอเทม', cost: 3}, {desc: 'เพิ่มโบนัสจาก Combo', cost: 3}] },
        read: { name: 'การอ่าน', maxLevel: 5, levels: [{desc: '+10% EXP', cost: 1}, {desc: '+15% Coins', cost: 2}, {desc: 'มีโอกาส 20% ได้รับ Coins 2 เท่า', cost: 2}, {desc: '+10% โอกาสได้ไอเทม', cost: 3}, {desc: 'ลดเงื่อนไขเควสต์เวลา 10%', cost: 3}] }
    };
    const STUDY_WEATHER = {
        clear: { id: 'clear', icon: '☀️', text: 'วันที่ปลอดโปร่ง' },
        tailwind: { id: 'tailwind', icon: '💨', text: 'ลมส่งท้าย (เควสต์แรก EXP x2)'},
        fog: { id: 'fog', icon: '🌫️', text: 'หมอกลงจัด (บางเควสต์ถูกซ่อน)'},
        meteor: { id: 'meteor', icon: '☄️', text: 'ฝนดาวตก (Coins +25%)'},
        heatwave: { id: 'heatwave', icon: '🔥', text: 'คลื่นความร้อน (EXP ลดลง 10%)'}
    };
    
    // --- GAME STATE ---
    let player;
    let board = [];
    let isRerolling = false;
    let isMarking = false;

    const defaultPlayer = () => ({
        level: 1, exp: 0, coins: 100, streak: 0, skillPoints: 0, prestige: 0,
        lastLogin: null,
        skills: { phys: 0, math: 0, read: 0 },
        inventory: { reroll: 0, exp_potion: 0, bingo_marker: 0 },
        challengeQuest: null,
        weather: STUDY_WEATHER.clear,
        firstQuestToday: true,
    });
    
    const tasks = {
        phys: [ { text: 'ทำโจทย์การเคลื่อนที่', tier: 'B', subject: 'ฟิสิกส์' }, { text: 'สรุปสูตรไฟฟ้า', tier: 'A', subject: 'ฟิสิกส์' }, { text: 'ดูคลิปติวเรื่องคลื่น', tier: 'C', subject: 'ฟิสิกส์' }, { text: 'ทำข้อสอบเก่า', tier: 'S', subject: 'ฟิสิกส์' } ],
        math: [ { text: 'แก้สมการ', tier: 'C', subject: 'คณิตศาสตร์' }, { text: 'ทำโจทย์แคลคูลัส', tier: 'B', subject: 'คณิตศาสตร์' }, { text: 'พิสูจน์ทฤษฎีบท', tier: 'A', subject: 'คณิตศาสตร์' }, { text: 'ทำโจทย์สถิติ', tier: 'B', subject: 'คณิตศาสตร์' } ],
        read: [ { text: 'อ่านหนังสือเรียน', tier: 'C', subject: 'การอ่าน' }, { text: 'สรุปเนื้อหาที่อ่าน', tier: 'B', subject: 'การอ่าน' }, { text: 'ท่องศัพท์/คำนิยาม', tier: 'A', subject: 'การอ่าน' }, { text: 'ทำ Mind Map', tier: 'B', subject: 'การอ่าน' } ]
    };

    // --- CORE FUNCTIONS ---
    function saveData() { localStorage.setItem('studyBingoFlow_v2', JSON.stringify({player, board})); }
    
    function loadData() {
        const saved = localStorage.getItem('studyBingoFlow_v2');
        if (saved) {
            const gameState = JSON.parse(saved);
            player = gameState.player;
            board = gameState.board;
            if (!board || board.length !== 16) generateBoard();
        } else {
            player = defaultPlayer();
            generateBoard();
        }
    }

    function checkNewDay() {
        const today = new Date().toDateString();
        if (player.lastLogin !== today) {
            const yesterday = new Date(Date.now() - 864e5).toDateString();
            if (player.lastLogin && player.lastLogin !== yesterday) player.streak = 0;
            player.streak++;
            player.lastLogin = today;
            player.firstQuestToday = true;

            const bonusCoins = 50 + (player.streak * 10);
            player.coins += bonusCoins;
            showNotice(`โบนัสล็อกอินวันที่ ${player.streak}! ได้รับ ${bonusCoins} 🪙`);

            const weatherKeys = Object.keys(STUDY_WEATHER);
            player.weather = STUDY_WEATHER[weatherKeys[Math.floor(Math.random() * weatherKeys.length)]];
            
            if (player.challengeQuest && player.challengeQuest.accepted && Date.now() > player.challengeQuest.deadline) {
                showNotice(`ล้มเหลวเควสต์ท้าทาย!`);
                player.challengeQuest = null;
            }
        }
        updateWeatherUI();
    }

    function generateBoard() {
        let availableTasks = [...tasks.phys, ...tasks.math, ...tasks.read];
        board = [];
        for (let i = 0; i < BOARD_SIZE * BOARD_SIZE; i++) {
            let task = availableTasks[Math.floor(Math.random() * availableTasks.length)];
            board.push({ ...task, completed: false, index: i, isChallenge: false });
        }
        
        if (player.level >= 5 && Math.random() < 0.15) {
            const challengeIndex = Math.floor(Math.random() * board.length);
            board[challengeIndex] = { text: 'เควสต์ท้าทาย!', tier: 'S', subject: 'พิเศษ', completed: false, index: challengeIndex, isChallenge: true, accepted: false };
        }
        
        renderBoard();
        saveData();
    }

    function renderBoard() {
        boardEl.innerHTML = board.map(task => {
            let classes = 'cell';
            if (task.completed) classes += ' completed';
            if (task.isChallenge && !task.completed) classes += ' challenge';
            if (player.weather.id === 'fog' && !task.completed) {
                const neighbors = [-1, 1, -4, 4].map(offset => task.index + offset);
                if (neighbors.every(n_idx => n_idx < 0 || n_idx >= 16 || !board[n_idx].completed)) {
                    classes += ' fog';
                }
            }
            return `<div class="${classes}" data-index="${task.index}">
                <span class="task-text">${task.text}</span>
                <span class="task-subject">${task.subject}</span>
                <span class="tier tier-${task.tier}">${task.tier}</span>
            </div>`;
        }).join('');
    }
    
    function getMaxExp() {
        let exponent = 1.25;
        if (player.level >= PRESTIGE_LEVEL - PRE_PRESTIGE_RANGE) {
            exponent = 1.5;
        }
        return Math.round(LEVEL_EXP_BASE * Math.pow(player.level, exponent));
    }
    
    function updateUI() {
        const maxExp = getMaxExp();
        playerLevelEl.innerText = `LV ${player.level}`;
        prestigeIconEl.innerHTML = '⭐'.repeat(player.prestige);
        expBarEl.style.width = `${(player.exp / maxExp) * 100}%`;
        expTextEl.innerText = `${player.exp}/${maxExp}`;
        streakEl.innerText = `🔥 ${player.streak}`;
        coinsEl.innerText = `🪙 ${player.coins}`;
        skillPointsEl.innerText = player.skillPoints;
        prestigeBtn.classList.toggle('hidden', player.level < PRESTIGE_LEVEL);
        renderInventory();
        saveData();
    }

    function updateWeatherUI() {
        if(player.weather) {
            weatherIconEl.innerText = player.weather.icon;
            weatherTextEl.innerText = player.weather.text;
            weatherDisplayEl.classList.remove('hidden');
        }
    }
    
    function addExp(basePoints, subject) {
        let finalPoints = basePoints;
        let finalCoins = basePoints;

        if(player.weather.id === 'tailwind' && player.firstQuestToday) { finalPoints *= 2; player.firstQuestToday = false; }
        if(player.weather.id === 'heatwave') finalPoints *= 0.9;
        if(player.weather.id === 'meteor') finalCoins *= 1.25;
        
        if (subject === 'ฟิสิกส์') { if (player.skills.phys >= 1) finalPoints *= 1.1; if (player.skills.phys >= 2) finalCoins *= 1.15; }
        else if (subject === 'คณิตศาสตร์') { if (player.skills.math >= 1) finalPoints *= 1.1; if (player.skills.math >= 2) finalCoins *= 1.15; }
        else if (subject === 'การอ่าน') { if (player.skills.read >= 1) finalPoints *= 1.1; if (player.skills.read >= 2) finalCoins *= 1.15; }
        
        finalPoints *= (1 + player.prestige * 0.05);
        finalCoins *= (1 + player.prestige * 0.05);

        player.exp += Math.round(finalPoints);
        player.coins += Math.round(finalCoins);
        
        const maxExp = getMaxExp();
        if (player.exp >= maxExp) {
            player.exp -= maxExp;
            player.level++;
            let spGain = 1;
            if (player.level % 5 === 0) spGain++;
            player.skillPoints += spGain;
            showNotice(`LEVEL UP! LV ${player.level}<br>ได้รับ SP +${spGain}!`);
        }
        updateUI();
    }

    function showNotice(text) {
        gameNoticeEl.innerHTML = text;
        gameNoticeEl.classList.remove('hidden');
        setTimeout(() => gameNoticeEl.classList.add('hidden'), 2500);
    }

    function checkForBingo() {
        const lines = [[0,1,2,3],[4,5,6,7],[8,9,10,11],[12,13,14,15],[0,4,8,12],[1,5,9,13],[2,6,10,14],[3,7,11,15],[0,5,10,15],[3,6,9,12]];
        let bingoFound = false;
        lines.forEach(line => {
            if (line.every(index => board[index] && board[index].completed)) {
                bingoFound = true;
                line.forEach(index => {
                    const cell = boardEl.querySelector(`[data-index='${index}']`);
                    if(cell) cell.classList.add('bingo');
                });
            }
        });

        if (bingoFound) {
            let bonusCoins = 100;
            let bonusExp = 50;
            if(player.skills.phys >= 3) bonusCoins *= 1.2;
            
            player.coins += Math.round(bonusCoins);
            player.exp += Math.round(bonusExp);
            
            showNotice(`BINGO! <br> +${Math.round(bonusCoins)} 🪙 & ${Math.round(bonusExp)} EXP`);
            newBoardBtn.classList.remove('hidden');
            updateUI();
        }
    }

    function showModal(title, content) {
        modalTitleEl.innerText = title;
        modalBodyEl.innerHTML = content;
        modalContainer.classList.remove('hidden');
        document.body.classList.add('modal-open');
    }

    function closeModal() {
        modalContainer.classList.add('hidden');
        document.body.classList.remove('modal-open');
        isRerolling = false;
        isMarking = false;
        document.body.classList.remove('rerolling', 'marking');
    }

    function openShopModal() {
        const content = `<div class="shop-container">
            ${Object.keys(SHOP_ITEMS).map(key => `
                <div class="shop-item">
                    <div><p>${SHOP_ITEMS[key].name}</p><p class="item-desc">${SHOP_ITEMS[key].desc}</p></div>
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
                    ${skill.levels.map((levelData, i) => {
                        const levelNum = i + 1;
                        let classes = 'skill-node';
                        if (currentLevel >= levelNum) classes += ' unlocked';
                        if (currentLevel >= skill.maxLevel) classes += ' maxed';
                        const cost = levelData.cost || 1;
                        return `<div class="${classes}" data-skill-key="${key}" data-skill-level="${levelNum}" data-skill-cost="${cost}">
                            <p>LV ${levelNum}: ${levelData.desc}</p>
                            <span class="cost">${(currentLevel + 1 === levelNum) ? `(ต้องการ ${cost} SP)` : ''}</span>
                        </div>`;
                    }).join('')}
                </div>`;
            }).join('')}
        </div>`;
        showModal(`สกิล (คุณมี ${player.skillPoints} SP)`, content);
    }

    function renderInventory() {
        inventoryItemsEl.innerHTML = Object.keys(player.inventory).filter(key => player.inventory[key] > 0).map(key => `
            <div class="inventory-item" data-item-id="${key}" title="${SHOP_ITEMS[key].name}">
                ${key.slice(0,4)}...: ${player.inventory[key]}
            </div>
        `).join('');
    }

    function handleBoardClick(e) {
        const cell = e.target.closest('.cell');
        if (!cell) return;
        const index = parseInt(cell.dataset.index);
        let task = board[index];

        if (task.completed && !isRerolling) return;

        if (task.isChallenge && !task.accepted) {
            showModal('เควสต์ท้าทาย!', `<p>คุณจะรับคำท้านี้หรือไม่? ต้องทำให้สำเร็จภายใน 24 ชั่วโมง หากล้มเหลวอาจมีผลเสียตามมา</p><button id="accept-challenge-btn">รับคำท้า</button>`);
            document.getElementById('accept-challenge-btn').onclick = () => {
                task.accepted = true;
                task.deadline = Date.now() + 24 * 3600 * 1000;
                player.challengeQuest = task;
                showNotice("รับคำท้าแล้ว!");
                saveData();
                closeModal();
            };
            return;
        }

        if (isRerolling) {
            let availableTasks = [...tasks.phys, ...tasks.math, ...tasks.read];
            board[index] = { ...availableTasks[Math.floor(Math.random() * availableTasks.length)], completed: false, index: index, isChallenge: false };
            isRerolling = false;
            document.body.classList.remove('rerolling');
            renderBoard();
            saveData();
            return;
        }

        if (isMarking) {
            task.completed = true;
            isMarking = false;
            document.body.classList.remove('marking');
            renderBoard();
            checkForBingo();
            return;
        }
        
        task.completed = true;
        renderBoard(); // Render first to show completion
        if(task.isChallenge && task.accepted) {
            showNotice("สำเร็จเควสต์ท้าทาย! รางวัลใหญ่!");
            player.coins += 500;
            player.skillPoints += 1;
            player.challengeQuest = null;
        }
        addExp(QUEST_TIERS[task.tier].points, task.subject);
        checkForBingo();
    }

    function handleInventoryClick(e) {
        const itemEl = e.target.closest('.inventory-item');
        if (!itemEl) return;
        const itemId = itemEl.dataset.itemId;
        if (isRerolling || isMarking) return;

        if (player.inventory[itemId] > 0) {
            if (itemId === 'exp_potion') {
                player.inventory[itemId]--;
                addExp(100, 'Bonus');
            } else if (itemId === 'reroll') {
                player.inventory[itemId]--;
                isRerolling = true;
                document.body.classList.add('rerolling');
                showNotice("เลือกเควสต์ที่ต้องการสุ่มใหม่");
            } else if (itemId === 'bingo_marker') {
                player.inventory[itemId]--;
                isMarking = true;
                document.body.classList.add('marking');
                showNotice("เลือกช่องที่ต้องการทำให้สำเร็จ");
            }
            updateUI();
        }
    }

    function handleModalClick(e) {
        const buyBtn = e.target.closest('.buy-btn');
        if (buyBtn) {
            const itemId = buyBtn.dataset.itemId;
            const item = SHOP_ITEMS[itemId];
            if (player.coins >= item.cost) {
                player.coins -= item.cost;
                player.inventory[itemId]++;
                updateUI();
                openShopModal();
            }
            return;
        }

        const skillNode = e.target.closest('.skill-node');
        if (skillNode && !skillNode.classList.contains('unlocked') && !skillNode.classList.contains('maxed')) {
            const key = skillNode.dataset.skillKey;
            const level = parseInt(skillNode.dataset.skillLevel);
            const cost = parseInt(skillNode.dataset.skillCost);
            if (player.skillPoints >= cost && player.skills[key] === level - 1) {
                player.skillPoints -= cost;
                player.skills[key]++;
                updateUI();
                openSkillsModal();
            }
        }
    }
    
    function handlePrestige() {
        if (player.level < PRESTIGE_LEVEL) return;
        showModal('ยืนยันการจุติ', `
            <p>คุณแน่ใจหรือไม่ที่จะทำการ "จุติ"?</p>
            <p style="color: var(--warning-color);">เลเวล, สกิล, Coins, และแต้มสกิล จะถูกรีเซ็ตทั้งหมด</p>
            <p>คุณจะได้รับโบนัส EXP/Coins +5% ต่อระดับศักดิ์ศรีอย่างถาวร!</p>
            <button id="confirm-prestige-btn" class="danger-btn">ยืนยันการจุติ</button>
        `);
        document.getElementById('confirm-prestige-btn').onclick = () => {
            let oldPrestige = player.prestige || 0;
            const oldInventory = { ...player.inventory };
            const oldStreak = player.streak;
            const oldLastLogin = player.lastLogin;
            
            player = defaultPlayer();
            player.prestige = oldPrestige + 1;
            player.inventory = oldInventory;
            player.streak = oldStreak;
            player.lastLogin = oldLastLogin;

            showNotice(`จุติสำเร็จ! ระดับ ${player.prestige}`);
            closeModal();
            generateBoard();
            updateUI();
        };
    }

    // --- EVENT LISTENERS ---
    boardEl.addEventListener('click', handleBoardClick);
    inventoryItemsEl.addEventListener('click', handleInventoryClick);
    document.getElementById('shop-btn').addEventListener('click', openShopModal);
    document.getElementById('skill-btn').addEventListener('click', openSkillsModal);
    prestigeBtn.addEventListener('click', handlePrestige);
    newBoardBtn.addEventListener('click', () => {
        showNotice("เริ่มบอร์ดใหม่!");
        generateBoard();
        newBoardBtn.classList.add('hidden');
    });
    modalContainer.addEventListener('click', (e) => {
        if (e.target.classList.contains('close-modal-btn') || e.target === modalContainer) {
            closeModal();
        }
    });
    modalBodyEl.addEventListener('click', handleModalClick);

    // --- INITIALIZATION ---
    function init() {
        loadData();
        checkNewDay();
        renderBoard();
        updateUI();
    }
    init();
});