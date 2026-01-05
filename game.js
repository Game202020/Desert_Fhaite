// متغيرات اللعبة
let canvas, ctx;
let player, enemies = [], treasures = [], obstacles = [];
let score = 0, level = 1, health = 100, treasureCount = 0;
let keys = {};
let gameLoop;
let isPaused = false;
let isAttacking = false;
let attackCooldown = 0;

// المؤثرات الصوتية
const sounds = {
    sword: new Audio('https://assets.mixkit.co/active_storage/sfx/2190/2190-preview.mp3'),
    treasure: new Audio('https://assets.mixkit.co/active_storage/sfx/2019/2019-preview.mp3'),
    hit: new Audio('https://assets.mixkit.co/active_storage/sfx/2593/2593-preview.mp3')
};

function playSound(name) {
    try {
        if (sounds[name]) {
            sounds[name].currentTime = 0;
            sounds[name].play().catch(e => {});
        }
    } catch (e) {}
}

// نظام الكاميرا
let camera = { x: 0, y: 0 };
const WORLD_SIZE = 3000;

// نظام الجويستيك
let joystick = { active: false, baseX: 0, baseY: 0, stickX: 0, stickY: 0, inputX: 0, inputY: 0, maxRadius: 50 };

document.addEventListener('DOMContentLoaded', function() {
    canvas = document.getElementById('gameCanvas');
    if (canvas) {
        ctx = canvas.getContext('2d');
        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);
    }
    initJoystick();
    const btnAttack = document.getElementById('btnAttack');
    if (btnAttack) {
        btnAttack.addEventListener('touchstart', (e) => { e.preventDefault(); keys['attack'] = true; });
        btnAttack.addEventListener('touchend', (e) => { e.preventDefault(); keys['attack'] = false; });
    }
    document.addEventListener('keydown', (e) => { keys[e.key] = true; });
    document.addEventListener('keyup', (e) => { keys[e.key] = false; });
});

function initJoystick() {
    const container = document.getElementById('joystickContainer');
    const stick = document.getElementById('joystickStick');
    const base = document.getElementById('joystickBase');
    if (!container || !stick || !base) return;

    const handleStart = (e) => {
        e.preventDefault();
        const touch = e.touches ? e.touches[0] : e;
        const rect = base.getBoundingClientRect();
        joystick.baseX = rect.left + rect.width / 2;
        joystick.baseY = rect.top + rect.height / 2;
        joystick.active = true;
    };

    const handleMove = (e) => {
        if (!joystick.active) return;
        const touch = e.touches ? e.touches[0] : e;
        let dx = touch.clientX - joystick.baseX;
        let dy = touch.clientY - joystick.baseY;
        let distance = Math.sqrt(dx * dx + dy * dy);
        if (distance > joystick.maxRadius) {
            dx = (dx / distance) * joystick.maxRadius;
            dy = (dy / distance) * joystick.maxRadius;
        }
        joystick.inputX = dx / joystick.maxRadius;
        joystick.inputY = dy / joystick.maxRadius;
        stick.style.transform = `translate(${dx}px, ${dy}px)`;
    };

    const handleEnd = () => {
        joystick.active = false;
        joystick.inputX = 0; joystick.inputY = 0;
        stick.style.transform = `translate(0px, 0px)`;
    };

    container.addEventListener('touchstart', handleStart);
    window.addEventListener('touchmove', handleMove, { passive: false });
    window.addEventListener('touchend', handleEnd);
}

function resizeCanvas() {
    if (canvas) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight - 180;
    }
}

function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(screenId).classList.add('active');
}

function startGame() {
    showScreen('gameScreen');
    initGame();
    if (gameLoop) cancelAnimationFrame(gameLoop);
    gameLoop = requestAnimationFrame(update);
}

function initGame() {
    score = 0; health = 100; treasureCount = 0;
    enemies = []; treasures = []; obstacles = [];
    player = { x: WORLD_SIZE / 2, y: WORLD_SIZE / 2, width: 40, height: 50, speed: 5 };
    for (let i = 0; i < 80; i++) obstacles.push({ x: Math.random() * WORLD_SIZE, y: Math.random() * WORLD_SIZE, size: 50 });
    for (let i = 0; i < 40; i++) treasures.push({ x: Math.random() * WORLD_SIZE, y: Math.random() * WORLD_SIZE, collected: false });
    for (let i = 0; i < 15; i++) enemies.push({ x: Math.random() * WORLD_SIZE, y: Math.random() * WORLD_SIZE, health: 50, speed: 2 });
}

function update() {
    if (isPaused) return;
    let moveX = joystick.active ? joystick.inputX : (keys['ArrowRight'] || keys['d'] ? 1 : (keys['ArrowLeft'] || keys['a'] ? -1 : 0));
    let moveY = joystick.active ? joystick.inputY : (keys['ArrowDown'] || keys['s'] ? 1 : (keys['ArrowUp'] || keys['w'] ? -1 : 0));
    
    player.x += moveX * player.speed;
    player.y += moveY * player.speed;
    
    player.x = Math.max(0, Math.min(WORLD_SIZE - player.width, player.x));
    player.y = Math.max(0, Math.min(WORLD_SIZE - player.height, player.y));
    camera.x = player.x - canvas.width / 2;
    camera.y = player.y - canvas.height / 2;
    
    if ((keys[' '] || keys['attack']) && attackCooldown <= 0) {
        isAttacking = true; attackCooldown = 20; playSound('sword');
        setTimeout(() => isAttacking = false, 150);
        enemies.forEach((enemy, index) => {
            if (Math.hypot(enemy.x - player.x, enemy.y - player.y) < 100) {
                enemy.health -= 25;
                if (enemy.health <= 0) { enemies.splice(index, 1); score += 50; }
            }
        });
    }
    if (attackCooldown > 0) attackCooldown--;

    enemies.forEach(enemy => {
        let dist = Math.hypot(player.x - enemy.x, player.y - enemy.y);
        if (dist < 400) {
            enemy.x += ((player.x - enemy.x) / dist) * enemy.speed;
            enemy.y += ((player.y - enemy.y) / dist) * enemy.speed;
        }
        if (dist < 40) {
            health -= 0.1;
            if (Math.random() < 0.02) playSound('hit');
            if (health <= 0) { alert('انتهت اللعبة!'); initGame(); }
        }
    });
    
    treasures.forEach(t => {
        if (!t.collected && Math.hypot(t.x - player.x, t.y - player.y) < 50) {
            t.collected = true; treasureCount++; score += 100; playSound('treasure');
        }
    });

    // الرسم
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // 1. رسم العالم (تحت الظلام)
    ctx.save();
    ctx.translate(-camera.x, -camera.y);
    ctx.fillStyle = '#d2b48c';
    ctx.fillRect(0, 0, WORLD_SIZE, WORLD_SIZE);
    
    ctx.fillStyle = '#8b7355';
    obstacles.forEach(obs => { ctx.fillRect(obs.x, obs.y, obs.size, obs.size); });
    
    ctx.fillStyle = '#ffd700';
    treasures.forEach(t => { if (!t.collected) { ctx.beginPath(); ctx.arc(t.x, t.y, 15, 0, Math.PI*2); ctx.fill(); } });
    
    ctx.fillStyle = '#5c0000';
    enemies.forEach(enemy => { ctx.fillRect(enemy.x, enemy.y, 40, 40); });
    
    drawPlayer();
    ctx.restore();
    
    // 2. رسم نظام المصباح (طريقة التدرج المضمونة)
    drawLanternEffect();
    
    updateHUD();
    gameLoop = requestAnimationFrame(update);
}

function drawLanternEffect() {
    ctx.save();
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    
    // إنشاء تدرج شعاعي يغطي الشاشة
    // المنطقة القريبة شفافة، والبعيدة سوداء
    const gradient = ctx.createRadialGradient(centerX, centerY, 50, centerX, centerY, 250);
    gradient.addColorStop(0, 'rgba(0, 0, 0, 0)'); // شفاف حول اللاعب
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0.95)'); // أسود في البعيد
    
    ctx.fillStyle = gradient;
    
    // رسم 4 مستطيلات تغطي الشاشة حول منطقة التدرج لضمان الظلام التام في البعيد
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.restore();
}

function drawPlayer() {
    const x = player.x; const y = player.y;
    ctx.fillStyle = '#FFFFFF'; ctx.fillRect(x, y + 10, 40, 40);
    ctx.fillStyle = '#f3d2b3'; ctx.fillRect(x + 5, y - 10, 30, 25);
    ctx.fillStyle = '#ff0000'; ctx.fillRect(x, y - 15, 40, 10);
    if (isAttacking) {
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 5;
        ctx.beginPath(); ctx.moveTo(x + 20, y + 20); ctx.lineTo(x + 80, y + 10); ctx.stroke();
    }
}

function updateHUD() {
    const scoreEl = document.getElementById('score');
    const treasureEl = document.getElementById('treasureCount');
    const healthEl = document.getElementById('healthFill');
    if (scoreEl) scoreEl.textContent = score;
    if (treasureEl) treasureEl.textContent = treasureCount;
    if (healthEl) healthEl.style.width = health + '%';
}
