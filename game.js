// متغيرات اللعبة
let canvas, ctx;
let player, enemies = [], treasures = [], particles = [];
let score = 0, level = 1, health = 100, treasureCount = 0;
let keys = {};
let touchControls = { left: false, right: false, up: false, down: false, attack: false };
let gameLoop;
let isPaused = false;
let isAttacking = false;
let attackCooldown = 0;

// ثوابت اللعبة
const LANTERN_RADIUS = 150;
const PLAYER_SIZE = 40;
const ENEMY_SIZE = 30;
const TREASURE_SIZE = 20;

document.addEventListener('DOMContentLoaded', function() {
    canvas = document.getElementById('gameCanvas');
    if (canvas) {
        ctx = canvas.getContext('2d');
        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);
    }
    
    // أزرار التحكم
    const controls = ['btnLeft', 'btnRight', 'btnUp', 'btnDown', 'btnAttack'];
    controls.forEach(id => {
        const btn = document.getElementById(id);
        if (btn) {
            const action = id.replace('btn', '').toLowerCase();
            btn.addEventListener('touchstart', (e) => { e.preventDefault(); touchControls[action] = true; });
            btn.addEventListener('touchend', (e) => { e.preventDefault(); touchControls[action] = false; });
        }
    });

    document.addEventListener('keydown', (e) => { keys[e.key] = true; });
    document.addEventListener('keyup', (e) => { keys[e.key] = false; });
});

function resizeCanvas() {
    if (canvas) {
        canvas.width = canvas.clientWidth;
        canvas.height = canvas.clientHeight;
    }
}

function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(screenId).classList.add('active');
    if (screenId === 'gameScreen') {
        setTimeout(resizeCanvas, 100); // التأكد من حجم الكانفاس بعد ظهور الشاشة
    }
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
    enemies = []; treasures = []; particles = [];
    
    // التأكد من أن اللاعب يبدأ في منتصف الشاشة تماماً
    player = {
        x: canvas.width / 2 - PLAYER_SIZE / 2,
        y: canvas.height / 2 - PLAYER_SIZE / 2,
        width: PLAYER_SIZE,
        height: PLAYER_SIZE,
        speed: 4
    };
    
    // إنشاء كنوز وأعداء بعيداً عن المركز قليلاً
    for (let i = 0; i < 10; i++) {
        treasures.push({
            x: Math.random() * (canvas.width - 40) + 20,
            y: Math.random() * (canvas.height - 40) + 20,
            collected: false
        });
    }
    for (let i = 0; i < 3; i++) {
        enemies.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            health: 50
        });
    }
}

function update() {
    if (isPaused) return;
    
    // تحديث الحركة
    if (keys['ArrowRight'] || keys['d'] || touchControls.right) player.x += player.speed;
    if (keys['ArrowLeft'] || keys['a'] || touchControls.left) player.x -= player.speed;
    if (keys['ArrowDown'] || keys['s'] || touchControls.down) player.y += player.speed;
    if (keys['ArrowUp'] || keys['w'] || touchControls.up) player.y -= player.speed;
    
    // حدود الشاشة
    player.x = Math.max(0, Math.min(canvas.width - player.width, player.x));
    player.y = Math.max(0, Math.min(canvas.height - player.height, player.y));

    // الهجوم
    if ((keys[' '] || touchControls.attack) && attackCooldown <= 0) {
        isAttacking = true;
        attackCooldown = 20;
        setTimeout(() => isAttacking = false, 150);
    }
    if (attackCooldown > 0) attackCooldown--;

    // الرسم
    // 1. مسح الشاشة بلون رملي (للتأكد من أن الكانفاس يعمل)
    ctx.fillStyle = '#d2b48c'; 
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // 2. رسم الكنوز والأعداء
    drawTreasures();
    drawEnemies();
    
    // 3. رسم الظلام (بطريقة مبسطة جداً ومضمونة)
    drawSimpleFog();
    
    // 4. رسم اللاعب (فوق كل شيء)
    drawPlayer();
    
    updateHUD();
    gameLoop = requestAnimationFrame(update);
}

function drawSimpleFog() {
    ctx.save();
    // إنشاء طبقة سوداء شفافة تغطي كل شيء
    ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
    
    // استخدام globalCompositeOperation لعمل "فتحة" في الظلام
    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.arc(player.x + player.width / 2, player.y + player.height / 2, LANTERN_RADIUS, 0, Math.PI * 2);
    ctx.fill();
    
    // العودة للوضع الطبيعي لرسم الظلام
    ctx.globalCompositeOperation = 'destination-over';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
}

function drawPlayer() {
    const x = player.x;
    const y = player.y;
    
    // الثوب الأبيض
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(x + 10, y + 10, 20, 25);
    
    // الرأس
    ctx.fillStyle = '#f3d2b3';
    ctx.fillRect(x + 12, y, 16, 12);
    
    // الشماغ الأحمر
    ctx.fillStyle = '#ff0000';
    ctx.fillRect(x + 10, y - 4, 20, 6);
    
    // العقال الأسود
    ctx.fillStyle = '#000000';
    ctx.fillRect(x + 11, y - 1, 18, 2);
    
    // السيف عند الهجوم
    if (isAttacking) {
        ctx.strokeStyle = '#ffffff';
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
        ctx.fillRect(enemy.x, enemy.y, ENEMY_SIZE, ENEMY_SIZE);
        ctx.fillStyle = '#ff0000';
        ctx.fillRect(enemy.x + 5, enemy.y + 5, 4, 4);
        ctx.fillRect(enemy.x + ENEMY_SIZE - 9, enemy.y + 5, 4, 4);
    });
}

function drawTreasures() {
    treasures.forEach(t => {
        if (!t.collected) {
            ctx.fillStyle = '#ffd700';
            ctx.beginPath();
            ctx.arc(t.x + 10, t.y + 10, 8, 0, Math.PI * 2);
            ctx.fill();
        }
    });
}

function updateHUD() {
    document.getElementById('score').textContent = score;
    document.getElementById('treasureCount').textContent = treasureCount;
    document.getElementById('healthFill').style.width = health + '%';
}
