// متغيرات اللعبة
let canvas, ctx;
let player, enemies = [], treasures = [];
let score = 0, level = 1, health = 100, treasureCount = 0;
let keys = {};
let touchControls = { left: false, right: false, up: false, down: false, attack: false };
let gameLoop;
let isPaused = false;
let isAttacking = false;
let attackCooldown = 0;

document.addEventListener('DOMContentLoaded', function() {
    canvas = document.getElementById('gameCanvas');
    if (canvas) {
        ctx = canvas.getContext('2d');
        // تعيين حجم ثابت ومباشر
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight - 200; // ترك مساحة للأزرار
    }
    
    // أزرار التحكم
    const setupBtn = (id, action) => {
        const btn = document.getElementById(id);
        if (btn) {
            btn.addEventListener('touchstart', (e) => { e.preventDefault(); touchControls[action] = true; });
            btn.addEventListener('touchend', (e) => { e.preventDefault(); touchControls[action] = false; });
            btn.addEventListener('mousedown', () => { touchControls[action] = true; });
            btn.addEventListener('mouseup', () => { touchControls[action] = false; });
        }
    };

    setupBtn('btnLeft', 'left');
    setupBtn('btnRight', 'right');
    setupBtn('btnUp', 'up');
    setupBtn('btnDown', 'down');
    setupBtn('btnAttack', 'attack');

    document.addEventListener('keydown', (e) => { keys[e.key] = true; });
    document.addEventListener('keyup', (e) => { keys[e.key] = false; });
});

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

function backToMenu() {
    showScreen('mainMenu');
    if (gameLoop) cancelAnimationFrame(gameLoop);
}

function initGame() {
    score = 0; level = 1; health = 100; treasureCount = 0;
    enemies = []; treasures = [];
    
    player = {
        x: 100,
        y: 100,
        width: 50,
        height: 50,
        speed: 5
    };
    
    for (let i = 0; i < 10; i++) {
        treasures.push({
            x: Math.random() * (canvas.width - 50),
            y: Math.random() * (canvas.height - 50),
            collected: false
        });
    }
    for (let i = 0; i < 3; i++) {
        enemies.push({
            x: Math.random() * (canvas.width - 50),
            y: Math.random() * (canvas.height - 50),
            speed: 1
        });
    }
}

function update() {
    if (isPaused) return;
    
    // الحركة
    if (keys['ArrowRight'] || keys['d'] || touchControls.right) player.x += player.speed;
    if (keys['ArrowLeft'] || keys['a'] || touchControls.left) player.x -= player.speed;
    if (keys['ArrowDown'] || keys['s'] || touchControls.down) player.y += player.speed;
    if (keys['ArrowUp'] || keys['w'] || touchControls.up) player.y -= player.speed;
    
    // الهجوم
    if ((keys[' '] || touchControls.attack) && attackCooldown <= 0) {
        isAttacking = true;
        attackCooldown = 20;
        setTimeout(() => isAttacking = false, 150);
    }
    if (attackCooldown > 0) attackCooldown--;

    // الرسم
    // 1. خلفية رملية واضحة (نهارية)
    ctx.fillStyle = '#f4a460'; 
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // 2. رسم الكنوز
    treasures.forEach(t => {
        if (!t.collected) {
            ctx.fillStyle = '#ffd700';
            ctx.beginPath();
            ctx.arc(t.x + 15, t.y + 15, 15, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#000';
            ctx.stroke();
        }
    });

    // 3. رسم الأعداء
    enemies.forEach(enemy => {
        ctx.fillStyle = '#ff0000';
        ctx.fillRect(enemy.x, enemy.y, 40, 40);
    });
    
    // 4. رسم اللاعب (البطل السعودي)
    drawPlayer();
    
    // فحص التصادم
    treasures.forEach(t => {
        if (!t.collected && Math.hypot(t.x - player.x, t.y - player.y) < 40) {
            t.collected = true;
            treasureCount++;
            score += 100;
        }
    });

    updateHUD();
    gameLoop = requestAnimationFrame(update);
}

function drawPlayer() {
    const x = player.x;
    const y = player.y;
    
    // الثوب
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(x, y + 10, 40, 40);
    
    // الرأس
    ctx.fillStyle = '#f3d2b3';
    ctx.fillRect(x + 5, y - 10, 30, 25);
    
    // الشماغ
    ctx.fillStyle = '#ff0000';
    ctx.fillRect(x, y - 15, 40, 10);
    
    // السيف
    if (isAttacking) {
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(x + 40, y + 20);
        ctx.lineTo(x + 80, y + 10);
        ctx.stroke();
    }
}

function updateHUD() {
    document.getElementById('score').textContent = score;
    document.getElementById('treasureCount').textContent = treasureCount;
    document.getElementById('healthFill').style.width = health + '%';
}
