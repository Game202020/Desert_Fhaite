// متغيرات اللعبة
let canvas, ctx;
let player, enemies = [], treasures = [], particles = [];
let score = 0, level = 1, health = 100, treasureCount = 0;
let keys = {};
let touchControls = {
    left: false,
    right: false,
    up: false,
    down: false,
    attack: false
};
let gameLoop;
let isPaused = false;
let isAttacking = false;
let attackCooldown = 0;

// إعدادات اللعبة
let settings = {
    volume: 70,
    difficulty: 'medium',
    sound: true
};

// ثوابت اللعبة
const LANTERN_RADIUS = 180; // زيادة نطاق المصباح قليلاً
const PLAYER_SIZE = 40;
const ENEMY_SIZE = 30;
const TREASURE_SIZE = 20;

// تهيئة اللعبة عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', function() {
    canvas = document.getElementById('gameCanvas');
    if (canvas) {
        ctx = canvas.getContext('2d');
        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);
    }
    initSettings();
    
    document.addEventListener('keydown', (e) => {
        keys[e.key] = true;
        if (e.key === 'Escape') pauseGame();
    });
    document.addEventListener('keyup', (e) => {
        keys[e.key] = false;
    });
    
    initTouchControls();
});

function resizeCanvas() {
    if (canvas) {
        canvas.width = canvas.offsetWidth;
        canvas.height = canvas.offsetHeight;
    }
}

function initSettings() {
    const volumeSlider = document.getElementById('volumeSlider');
    const volumeValue = document.getElementById('volumeValue');
    if (volumeSlider) {
        volumeSlider.addEventListener('input', function() {
            settings.volume = this.value;
            volumeValue.textContent = this.value + '%';
        });
    }
}

function initTouchControls() {
    const controls = ['btnLeft', 'btnRight', 'btnUp', 'btnDown', 'btnAttack'];
    controls.forEach(id => {
        const btn = document.getElementById(id);
        if (btn) {
            const action = id.replace('btn', '').toLowerCase();
            btn.addEventListener('touchstart', (e) => {
                e.preventDefault();
                touchControls[action] = true;
            });
            btn.addEventListener('touchend', (e) => {
                e.preventDefault();
                touchControls[action] = false;
            });
        }
    });
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

function backToMenu() {
    showScreen('mainMenu');
    if (gameLoop) cancelAnimationFrame(gameLoop);
}

function pauseGame() {
    isPaused = !isPaused;
    if (!isPaused) gameLoop = requestAnimationFrame(update);
}

function initGame() {
    score = 0; level = 1; health = 100; treasureCount = 0;
    enemies = []; treasures = []; particles = [];
    
    player = {
        x: canvas.width / 2 - PLAYER_SIZE / 2,
        y: canvas.height / 2 - PLAYER_SIZE / 2,
        width: PLAYER_SIZE,
        height: PLAYER_SIZE,
        speed: 5,
        direction: 0
    };
    
    createTreasures();
    createEnemies();
}

function createTreasures() {
    for (let i = 0; i < 10 + level * 2; i++) {
        treasures.push({
            x: Math.random() * (canvas.width - TREASURE_SIZE),
            y: Math.random() * (canvas.height - TREASURE_SIZE),
            width: TREASURE_SIZE,
            height: TREASURE_SIZE,
            collected: false
        });
    }
}

function createEnemies() {
    for (let i = 0; i < 4 + level; i++) {
        enemies.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            width: ENEMY_SIZE,
            height: ENEMY_SIZE,
            speed: 1 + Math.random() * 1.5,
            health: 50,
            maxHealth: 50
        });
    }
}

function update() {
    if (isPaused) return;
    
    // 1. تحديث المنطق
    updatePlayer();
    updateEnemies();
    updateParticles();
    checkCollisions();
    
    // 2. الرسم (الترتيب مهم جداً)
    
    // أ. رسم الخلفية الرملية (دائماً ظاهرة لكن معتمة)
    ctx.fillStyle = '#2c1e14'; // لون رملي غامق جداً للصحراء في الليل
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // ب. رسم الكنوز والأعداء (سيتم تغطيتهم بالظلام لاحقاً إلا في منطقة الضوء)
    drawTreasures();
    drawEnemies();
    drawParticles();
    
    // ج. رسم الظلام مع فتحة المصباح (نظام القناع)
    drawFogOfWar();
    
    // د. رسم اللاعب (فوق الظلام لضمان ظهوره دائماً)
    drawPlayer();
    
    updateHUD();
    gameLoop = requestAnimationFrame(update);
}

function drawFogOfWar() {
    ctx.save();
    ctx.beginPath();
    // رسم مستطيل يغطي الشاشة بالكامل
    ctx.rect(0, 0, canvas.width, canvas.height);
    
    // رسم دائرة المصباح (عكسية)
    ctx.arc(player.x + player.width / 2, player.y + player.height / 2, LANTERN_RADIUS, 0, Math.PI * 2, true);
    
    ctx.fillStyle = 'rgba(0, 0, 0, 0.92)'; // درجة الظلام
    ctx.fill();
    ctx.restore();
    
    // إضافة توهج حول حافة المصباح
    const grad = ctx.createRadialGradient(
        player.x + player.width / 2, player.y + player.height / 2, LANTERN_RADIUS - 50,
        player.x + player.width / 2, player.y + player.height / 2, LANTERN_RADIUS
    );
    grad.addColorStop(0, 'rgba(255, 200, 0, 0)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0.92)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(player.x + player.width / 2, player.y + player.height / 2, LANTERN_RADIUS, 0, Math.PI * 2);
    ctx.fill();
}

function updatePlayer() {
    if (keys['ArrowRight'] || keys['d'] || touchControls.right) player.x += player.speed;
    if (keys['ArrowLeft'] || keys['a'] || touchControls.left) player.x -= player.speed;
    if (keys['ArrowDown'] || keys['s'] || touchControls.down) player.y += player.speed;
    if (keys['ArrowUp'] || keys['w'] || touchControls.up) player.y -= player.speed;
    
    player.x = Math.max(0, Math.min(canvas.width - player.width, player.x));
    player.y = Math.max(0, Math.min(canvas.height - player.height, player.y));
    
    if ((keys[' '] || keys['e'] || touchControls.attack) && attackCooldown <= 0) {
        performAttack();
        attackCooldown = 20;
    }
    if (attackCooldown > 0) attackCooldown--;
}

function performAttack() {
    isAttacking = true;
    enemies.forEach((enemy, index) => {
        const dist = Math.hypot(enemy.x - player.x, enemy.y - player.y);
        if (dist < 80) {
            enemy.health -= 25;
            if (enemy.health <= 0) {
                enemies.splice(index, 1);
                score += 50;
            }
        }
    });
    setTimeout(() => isAttacking = false, 150);
}

function updateEnemies() {
    enemies.forEach(enemy => {
        const dx = player.x - enemy.x;
        const dy = player.y - enemy.y;
        const dist = Math.hypot(dx, dy);
        
        // الأعداء يطاردون اللاعب فقط إذا كان قريباً (داخل نطاق المصباح)
        if (dist < LANTERN_RADIUS + 50) {
            enemy.x += (dx / dist) * enemy.speed;
            enemy.y += (dy / dist) * enemy.speed;
        }
    });
}

function drawPlayer() {
    const x = player.x;
    const y = player.y;
    
    // رسم الشخصية السعودية (بكسل آرت مبسط)
    // الثوب (أبيض)
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(x + 10, y + 10, 20, 25);
    
    // الرأس
    ctx.fillStyle = '#f3d2b3';
    ctx.fillRect(x + 12, y, 16, 12);
    
    // الغترة (حمراء وبيضاء - شماغ)
    ctx.fillStyle = '#ff0000';
    ctx.fillRect(x + 10, y - 4, 20, 6);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x + 12, y - 2, 16, 2);
    
    // العقال (أسود)
    ctx.fillStyle = '#000000';
    ctx.fillRect(x + 11, y - 1, 18, 2);
    
    // السيف عند الهجوم
    if (isAttacking) {
        ctx.strokeStyle = '#e5e5e5';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(x + 20, y + 20);
        ctx.lineTo(x + 50, y + 10);
        ctx.stroke();
    }
}

function drawEnemies() {
    enemies.forEach(enemy => {
        ctx.fillStyle = '#5c0000';
        ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height);
        // عيون حمراء متوهجة
        ctx.fillStyle = '#ff0000';
        ctx.fillRect(enemy.x + 5, enemy.y + 5, 4, 4);
        ctx.fillRect(enemy.x + enemy.width - 9, enemy.y + 5, 4, 4);
    });
}

function drawTreasures() {
    treasures.forEach(t => {
        if (!t.collected) {
            ctx.fillStyle = '#ffd700';
            ctx.beginPath();
            ctx.arc(t.x + 10, t.y + 10, 8, 0, Math.PI * 2);
            ctx.fill();
            // بريق
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(t.x + 8, t.y + 6, 4, 4);
        }
    });
}

function updateParticles() {
    particles = particles.filter(p => (p.life-- > 0));
    particles.forEach(p => { p.x += p.vx; p.y += p.vy; });
}

function drawParticles() {
    particles.forEach(p => {
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x, p.y, 2, 2);
    });
}

function checkCollisions() {
    enemies.forEach(enemy => {
        if (Math.hypot(enemy.x - player.x, enemy.y - player.y) < 30) {
            health -= 0.5;
            if (health <= 0) gameOver();
        }
    });
    
    treasures.forEach(t => {
        if (!t.collected && Math.hypot(t.x - player.x, t.y - player.y) < 30) {
            t.collected = true;
            treasureCount++;
            score += 100;
        }
    });
}

function updateHUD() {
    document.getElementById('score').textContent = score;
    document.getElementById('treasureCount').textContent = treasureCount;
    document.getElementById('healthFill').style.width = health + '%';
}

function gameOver() {
    alert('انتهت اللعبة! نقاطك: ' + score);
    initGame();
}
