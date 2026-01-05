// متغيرات اللعبة
let canvas, ctx;
let player, enemies = [], treasures = [], obstacles = [], healthPacks = [], bullets = [];
let score = 0, health = 100, treasureCount = 0;
let totalGold = parseInt(localStorage.getItem('totalGold')) || 0;
let inventory = JSON.parse(localStorage.getItem('inventory')) || { skin: 'default', weapon: 'default' };
let keys = {};
let gameLoop;
let isPaused = false;
let isAttacking = false;
let attackCooldown = 0;
let damageFlash = 0;
let screenShake = 0;

// إعدادات اللعبة
let gameSettings = {
    soundEnabled: true,
    difficulty: 'medium',
    lanternRadius: 320,
    playerSpeed: 5
};

// المؤثرات الصوتية
const sounds = {
    sword: new Audio('https://assets.mixkit.co/active_storage/sfx/2190/2190-preview.mp3'),
    treasure: new Audio('https://assets.mixkit.co/active_storage/sfx/2019/2019-preview.mp3'),
    hit: new Audio('https://assets.mixkit.co/active_storage/sfx/2593/2593-preview.mp3'),
    heal: new Audio('https://assets.mixkit.co/active_storage/sfx/619/619-preview.mp3'),
    shoot: new Audio('https://assets.mixkit.co/active_storage/sfx/1690/1690-preview.mp3')
};

function playSound(name) {
    if (!gameSettings.soundEnabled) return;
    try { if (sounds[name]) { sounds[name].currentTime = 0; sounds[name].play().catch(e => {}); } } catch (e) {}
}

// نظام الكاميرا والعالم
let camera = { x: 0, y: 0 };
const WORLD_SIZE = 4000;

window.onload = () => {
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    updateTotalGoldDisplay();
    setupControls();
};

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight - 180;
}

function updateTotalGoldDisplay() {
    const display = document.getElementById('totalGoldDisplay');
    if (display) display.textContent = totalGold;
}

function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const target = document.getElementById(screenId);
    if (target) target.classList.add('active');
    if (screenId === 'mainMenu') updateTotalGoldDisplay();
}

function buyItem(type, id, price) {
    if (totalGold >= price) {
        totalGold -= price;
        inventory[type] = id;
        localStorage.setItem('totalGold', totalGold);
        localStorage.setItem('inventory', JSON.stringify(inventory));
        updateTotalGoldDisplay();
        alert('تم الشراء بنجاح!');
    } else {
        alert('ليس لديك ذهب كافٍ!');
    }
}

function startGame() {
    showScreen('gameScreen');
    initGame();
    if (gameLoop) cancelAnimationFrame(gameLoop);
    gameLoop = requestAnimationFrame(update);
}

function initGame() {
    score = 0; health = 100; treasureCount = 0;
    enemies = []; treasures = []; obstacles = []; healthPacks = []; bullets = [];
    player = { 
        x: WORLD_SIZE / 2, y: WORLD_SIZE / 2, 
        width: 60, height: 80, 
        speed: gameSettings.playerSpeed, 
        moving: false,
        weapon: inventory.weapon,
        skin: inventory.skin
    };
    
    // إظهار زر المسدس إذا كان مملوكاً
    document.getElementById('btnShoot').style.display = (player.weapon === 'gun') ? 'block' : 'none';

    // توليد العالم
    for (let i = 0; i < 100; i++) obstacles.push({ x: Math.random() * WORLD_SIZE, y: Math.random() * WORLD_SIZE, size: 60 + Math.random() * 40 });
    for (let i = 0; i < 50; i++) treasures.push({ x: Math.random() * WORLD_SIZE, y: Math.random() * WORLD_SIZE, collected: false });
    for (let i = 0; i < 15; i++) healthPacks.push({ x: Math.random() * WORLD_SIZE, y: Math.random() * WORLD_SIZE, collected: false });
    
    const types = ['bandit', 'warrior', 'ghoul'];
    let count = gameSettings.difficulty === 'hard' ? 40 : (gameSettings.difficulty === 'easy' ? 15 : 25);
    for (let i = 0; i < count; i++) {
        enemies.push({
            x: Math.random() * WORLD_SIZE, y: Math.random() * WORLD_SIZE,
            type: types[Math.floor(Math.random() * types.length)],
            health: 100, speed: 1.5 + Math.random() * 2
        });
    }
}

function update() {
    if (isPaused) return;
    
    // حركة اللاعب
    if (joystick.active) {
        let dx = joystick.x * player.speed;
        let dy = joystick.y * player.speed;
        player.x = Math.max(0, Math.min(WORLD_SIZE, player.x + dx));
        player.y = Math.max(0, Math.min(WORLD_SIZE, player.y + dy));
        player.moving = true;
    } else {
        player.moving = false;
    }

    camera.x = player.x - canvas.width / 2;
    camera.y = player.y - canvas.height / 2;

    // تحديث الرصاص
    bullets.forEach((b, i) => {
        b.x += b.vx; b.y += b.vy;
        enemies.forEach(e => {
            if (Math.hypot(e.x - b.x, e.y - b.y) < 40) {
                e.health -= 50; bullets.splice(i, 1);
            }
        });
        if (Math.hypot(b.x - player.x, b.y - player.y) > 800) bullets.splice(i, 1);
    });

    // تحديث الأعداء
    enemies.forEach((enemy, index) => {
        let dist = Math.hypot(player.x - enemy.x, player.y - enemy.y);
        if (dist < 500) {
            enemy.x += ((player.x - enemy.x) / dist) * enemy.speed;
            enemy.y += ((player.y - enemy.y) / dist) * enemy.speed;
        }
        if (dist < 50) {
            health -= 0.3; damageFlash = 10; screenShake = 5;
            if (Math.random() < 0.03) playSound('hit');
            if (health <= 0) { 
                totalGold += Math.floor(score / 10);
                localStorage.setItem('totalGold', totalGold);
                alert('انتهت اللعبة! تم حفظ الذهب المجمع.'); 
                showScreen('mainMenu'); 
            }
        }
        if (enemy.health <= 0) { enemies.splice(index, 1); score += 500; }
    });

    // جمع الكنوز والعلاج
    treasures.forEach(t => {
        if (!t.collected && Math.hypot(t.x - player.x, t.y - player.y) < 70) {
            t.collected = true; score += 200; totalGold += 50; playSound('treasure');
        }
    });
    healthPacks.forEach(hp => {
        if (!hp.collected && Math.hypot(hp.x - player.x, hp.y - player.y) < 70) {
            hp.collected = true; health = Math.min(100, health + 25); playSound('heal'); damageFlash = -10;
        }
    });

    draw();
    updateHUD();
    gameLoop = requestAnimationFrame(update);
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    if (screenShake > 0) { ctx.translate(Math.random()*4-2, Math.random()*4-2); screenShake--; }
    ctx.translate(-camera.x, -camera.y);

    // الأرضية
    ctx.fillStyle = '#c2a47c'; ctx.fillRect(0, 0, WORLD_SIZE, WORLD_SIZE);
    for(let i=0; i<WORLD_SIZE; i+=200) {
        for(let j=0; j<WORLD_SIZE; j+=200) {
            ctx.fillStyle = 'rgba(0,0,0,0.03)'; ctx.fillRect(i, j, 2, 2);
        }
    }

    obstacles.forEach(obs => {
        ctx.fillStyle = '#5d4037'; ctx.beginPath(); ctx.arc(obs.x, obs.y, obs.size/2, 0, Math.PI*2); ctx.fill();
    });

    treasures.forEach(t => { if(!t.collected) { ctx.fillStyle = '#ffd700'; ctx.beginPath(); ctx.arc(t.x, t.y, 15, 0, Math.PI*2); ctx.fill(); } });
    healthPacks.forEach(hp => { if(!hp.collected) { ctx.fillStyle = '#fff'; ctx.fillRect(hp.x-15, hp.y-15, 30, 30); ctx.fillStyle='red'; ctx.fillRect(hp.x-10, hp.y-2, 20, 4); ctx.fillRect(hp.x-2, hp.y-10, 4, 20); } });
    bullets.forEach(b => { ctx.fillStyle = '#333'; ctx.beginPath(); ctx.arc(b.x, b.y, 5, 0, Math.PI*2); ctx.fill(); });

    enemies.forEach(e => drawEnemy(e));
    drawPlayer();
    ctx.restore();
    drawLanternEffect();

    if (damageFlash > 0) { ctx.fillStyle = `rgba(255,0,0,${damageFlash*0.05})`; ctx.fillRect(0,0,canvas.width,canvas.height); damageFlash--; }
    else if (damageFlash < 0) { ctx.fillStyle = `rgba(0,255,0,${Math.abs(damageFlash)*0.05})`; ctx.fillRect(0,0,canvas.width,canvas.height); damageFlash++; }
}

function drawPlayer() {
    const x = player.x, y = player.y;
    const bishColor = player.skin === 'royal' ? '#1a1a1a' : '#8d5524';
    const goldColor = '#ffd700';

    ctx.fillStyle = '#fff'; ctx.fillRect(x-20, y-40, 40, 60); // الثوب
    ctx.fillStyle = bishColor; ctx.fillRect(x-22, y-40, 44, 45); // البشت
    if(player.skin === 'royal') { ctx.strokeStyle = goldColor; ctx.lineWidth = 2; ctx.strokeRect(x-22, y-40, 44, 45); }
    
    ctx.fillStyle = '#ffcccc'; ctx.fillRect(x-15, y-65, 30, 25); // الوجه
    ctx.fillStyle = '#333'; ctx.fillRect(x-15, y-50, 30, 10); // اللحية
    ctx.fillStyle = '#fff'; ctx.fillRect(x-20, y-75, 40, 15); // الشماغ
    ctx.strokeStyle = '#ff0000'; ctx.lineWidth = 1; ctx.strokeRect(x-20, y-75, 40, 15);
    ctx.fillStyle = '#000'; ctx.fillRect(x-20, y-75, 40, 4); // العقال

    // السيف
    if (isAttacking) {
        ctx.strokeStyle = '#aaa'; ctx.lineWidth = 5;
        ctx.beginPath(); ctx.moveTo(x+20, y); ctx.lineTo(x+60 + (player.weapon === 'long' ? 30 : 0), y-20); ctx.stroke();
    }
}

function drawEnemy(e) {
    ctx.fillStyle = e.type === 'bandit' ? '#333' : (e.type === 'warrior' ? '#8b4513' : '#1a1a1a');
    ctx.fillRect(e.x-25, e.y-40, 50, 60);
    ctx.fillStyle = 'red'; ctx.fillRect(e.x-25, e.y-50, (e.health/100)*50, 5);
}

function drawLanternEffect() {
    const centerX = canvas.width / 2, centerY = canvas.height / 2;
    const grad = ctx.createRadialGradient(centerX, centerY, 50, centerX, centerY, gameSettings.lanternRadius);
    grad.addColorStop(0, 'rgba(255,200,100,0.05)');
    grad.addColorStop(1, 'rgba(0,0,0,0.95)');
    ctx.fillStyle = grad; ctx.fillRect(0,0,canvas.width,canvas.height);
}

function updateHUD() {
    document.getElementById('currentGold').textContent = totalGold;
    document.getElementById('healthFill').style.width = health + '%';
}

// نظام التحكم
let joystick = { active: false, x: 0, y: 0 };
function setupControls() {
    const jb = document.getElementById('joystickBase'), js = document.getElementById('joystickStick');
    const handleMove = (e) => {
        if (!joystick.active) return;
        const touch = e.touches ? e.touches[0] : e;
        const rect = jb.getBoundingClientRect();
        const centerX = rect.left + rect.width/2, centerY = rect.top + rect.height/2;
        let dx = touch.clientX - centerX, dy = touch.clientY - centerY;
        const dist = Math.min(50, Math.hypot(dx, dy));
        const angle = Math.atan2(dy, dx);
        joystick.x = (dist/50) * Math.cos(angle); joystick.y = (dist/50) * Math.sin(angle);
        js.style.transform = `translate(${joystick.x*40}px, ${joystick.y*40}px)`;
    };
    jb.addEventListener('touchstart', (e) => { joystick.active = true; handleMove(e); });
    window.addEventListener('touchmove', handleMove);
    window.addEventListener('touchend', () => { joystick.active = false; js.style.transform = 'translate(0,0)'; });
    
    document.getElementById('btnAttack').onclick = () => {
        isAttacking = true; playSound('sword');
        enemies.forEach(e => { if(Math.hypot(e.x-player.x, e.y-player.y) < (player.weapon === 'long' ? 120 : 80)) e.health -= 40; });
        setTimeout(() => isAttacking = false, 200);
    };
    
    document.getElementById('btnShoot').onclick = () => {
        if (player.weapon === 'gun') {
            playSound('shoot');
            bullets.push({ x: player.x, y: player.y, vx: (joystick.active ? joystick.x : 1) * 10, vy: (joystick.active ? joystick.y : 0) * 10 });
        }
    };
}
