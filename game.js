// متغيرات اللعبة
let canvas, ctx;
let player, enemies = [], treasures = [], obstacles = [];
let score = 0, level = 1, health = 100, treasureCount = 0;
let keys = {};
let gameLoop;
let isPaused = false;
let isAttacking = false;
let attackCooldown = 0;

// المؤثرات الصوتية (تحميل آمن)
const sounds = {
    sword: new Audio('https://assets.mixkit.co/active_storage/sfx/2190/2190-preview.mp3'),
    treasure: new Audio('https://assets.mixkit.co/active_storage/sfx/2019/2019-preview.mp3'),
    hit: new Audio('https://assets.mixkit.co/active_storage/sfx/2593/2593-preview.mp3')
};

function playSound(name) {
    try {
        if (sounds[name]) {
            sounds[name].currentTime = 0;
            sounds[name].play().catch(e => console.log("Audio play blocked until user interaction"));
        }
    } catch (e) {
        console.log("Sound error:", e);
    }
}

// نظام الكاميرا
let camera = { x: 0, y: 0 };
const WORLD_SIZE = 3000;

// نظام الجويستيك (Joystick)
let joystick = {
    active: false,
    baseX: 0,
    baseY: 0,
    stickX: 0,
    stickY: 0,
    inputX: 0,
    inputY: 0,
    maxRadius: 50
};

document.addEventListener('DOMContentLoaded', function() {
    canvas = document.getElementById('gameCanvas');
    if (canvas) {
        ctx = canvas.getContext('2d');
        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);
    }
    
    // تهيئة الجويستيك فوراً
    initJoystick();
    
    const btnAttack = document.getElementById('btnAttack');
    if (btnAttack) {
        btnAttack.addEventListener('touchstart', (e) => { e.preventDefault(); keys['attack'] = true; });
        btnAttack.addEventListener('touchend', (e) => { e.preventDefault(); keys['attack'] = false; });
        btnAttack.addEventListener('mousedown', (e) => { keys['attack'] = true; });
        btnAttack.addEventListener('mouseup', (e) => { keys['attack'] = false; });
    }

    document.addEventListener('keydown', (e) => { keys[e.key] = true; });
    document.addEventListener('keyup', (e) => { keys[e.key] = false; });
});

function initJoystick() {
    const container = document.getElementById('joystickContainer');
    const stick = document.getElementById('joystickStick');
    const base = document.getElementById('joystickBase');
    
    if (!container || !stick || !base) {
        console.error("Joystick elements not found!");
        return;
    }

    const handleStart = (e) => {
        e.preventDefault();
        const touch = e.touches ? e.touches[0] : e;
        const rect = base.getBoundingClientRect();
        joystick.baseX = rect.left + rect.width / 2;
        joystick.baseY = rect.top + rect.height / 2;
        joystick.active = true;
        handleMove(e);
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
            distance = joystick.maxRadius;
        }
        
        joystick.stickX = dx;
        joystick.stickY = dy;
        joystick.inputX = dx / joystick.maxRadius;
        joystick.inputY = dy / joystick.maxRadius;
        
        stick.style.transform = `translate(${dx}px, ${dy}px)`;
    };

    const handleEnd = () => {
        joystick.active = false;
        joystick.stickX = 0;
        joystick.stickY = 0;
        joystick.inputX = 0;
        joystick.inputY = 0;
        stick.style.transform = `translate(0px, 0px)`;
    };

    container.addEventListener('touchstart', handleStart, { passive: false });
    window.addEventListener('touchmove', handleMove, { passive: false });
    window.addEventListener('touchend', handleEnd);
    
    container.addEventListener('mousedown', handleStart);
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleEnd);
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
    if (screenId === 'gameScreen') {
        setTimeout(resizeCanvas, 100);
    }
}

function startGame() {
    showScreen('gameScreen');
    initGame();
    if (gameLoop) cancelAnimationFrame(gameLoop);
    gameLoop = requestAnimationFrame(update);
}

function initGame() {
    score = 0; level = 1; health = 100; treasureCount = 0;
    enemies = []; treasures = []; obstacles = [];
    player = { x: WORLD_SIZE / 2, y: WORLD_SIZE / 2, width: 40, height: 50, speed: 5 };
    
    for (let i = 0; i < 100; i++) {
        obstacles.push({ x: Math.random() * WORLD_SIZE, y: Math.random() * WORLD_SIZE, size: 40 + Math.random() * 60 });
    }
    for (let i = 0; i < 50; i++) {
        treasures.push({ x: Math.random() * WORLD_SIZE, y: Math.random() * WORLD_SIZE, collected: false });
    }
    for (let i = 0; i < 20; i++) {
        enemies.push({ x: Math.random() * WORLD_SIZE, y: Math.random() * WORLD_SIZE, health: 50, speed: 1.5 + Math.random() });
    }
}

function update() {
    if (isPaused) return;
    
    let moveX = 0;
    let moveY = 0;
    
    if (keys['ArrowRight'] || keys['d']) moveX = 1;
    if (keys['ArrowLeft'] || keys['a']) moveX = -1;
    if (keys['ArrowDown'] || keys['s']) moveY = 1;
    if (keys['ArrowUp'] || keys['w']) moveY = -1;
    
    if (joystick.active) {
        moveX = joystick.inputX;
        moveY = joystick.inputY;
    }
    
    let nextX = player.x + moveX * player.speed;
    let nextY = player.y + moveY * player.speed;
    
    let canMoveX = true;
    let canMoveY = true;
    obstacles.forEach(obs => {
        if (nextX < obs.x + obs.size && nextX + player.width > obs.x && player.y < obs.y + obs.size && player.y + player.height > obs.y) canMoveX = false;
        if (player.x < obs.x + obs.size && player.x + player.width > obs.x && nextY < obs.y + obs.size && nextY + player.height > obs.y) canMoveY = false;
    });
    
    if (canMoveX) player.x = nextX;
    if (canMoveY) player.y = nextY;
    
    player.x = Math.max(0, Math.min(WORLD_SIZE - player.width, player.x));
    player.y = Math.max(0, Math.min(WORLD_SIZE - player.height, player.y));
    camera.x = player.x - canvas.width / 2;
    camera.y = player.y - canvas.height / 2;
    
    if ((keys[' '] || keys['attack']) && attackCooldown <= 0) {
        isAttacking = true;
        attackCooldown = 20;
        playSound('sword');
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
            if (Math.random() < 0.05) playSound('hit');
            if (health <= 0) { alert('انتهت اللعبة!'); initGame(); }
        }
    });
    
    treasures.forEach(t => {
        if (!t.collected && Math.hypot(t.x - player.x, t.y - player.y) < 50) {
            t.collected = true; treasureCount++; score += 100;
            playSound('treasure');
        }
    });

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.translate(-camera.x, -camera.y);
    ctx.fillStyle = '#d2b48c';
    ctx.fillRect(0, 0, WORLD_SIZE, WORLD_SIZE);
    
    ctx.strokeStyle = '#c2a47c';
    ctx.lineWidth = 2;
    for(let i=0; i<WORLD_SIZE; i+=200) {
        ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, WORLD_SIZE); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(WORLD_SIZE, i); ctx.stroke();
    }
    
    ctx.fillStyle = '#8b7355';
    obstacles.forEach(obs => { ctx.fillRect(obs.x, obs.y, obs.size, obs.size); });
    
    ctx.fillStyle = '#ffd700';
    treasures.forEach(t => { if (!t.collected) { ctx.beginPath(); ctx.arc(t.x, t.y, 15, 0, Math.PI*2); ctx.fill(); } });
    
    ctx.fillStyle = '#5c0000';
    enemies.forEach(enemy => { ctx.fillRect(enemy.x, enemy.y, 40, 40); });
    
    drawPlayer();
    ctx.restore();
    drawLanternEffect();
    updateHUD();
    gameLoop = requestAnimationFrame(update);
}

function drawLanternEffect() {
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.92)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.globalCompositeOperation = 'destination-out';
    const gradient = ctx.createRadialGradient(canvas.width/2, canvas.height/2, 50, canvas.width/2, canvas.height/2, 220);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = gradient;
    ctx.beginPath(); ctx.arc(canvas.width/2, canvas.height/2, 220, 0, Math.PI*2); ctx.fill();
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
