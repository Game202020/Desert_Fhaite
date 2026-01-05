// متغيرات اللعبة
let canvas, ctx;
let player, enemies = [], treasures = [], obstacles = [];
let score = 0, level = 1, health = 100, treasureCount = 0;
let keys = {};
let touchControls = { left: false, right: false, up: false, down: false, attack: false };
let gameLoop;
let isPaused = false;
let isAttacking = false;
let attackCooldown = 0;

// نظام الكاميرا
let camera = { x: 0, y: 0 };
const WORLD_SIZE = 3000; // حجم العالم الصحراوي

document.addEventListener('DOMContentLoaded', function() {
    canvas = document.getElementById('gameCanvas');
    if (canvas) {
        ctx = canvas.getContext('2d');
        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);
    }
    
    const setupBtn = (id, action) => {
        const btn = document.getElementById(id);
        if (btn) {
            btn.addEventListener('touchstart', (e) => { e.preventDefault(); touchControls[action] = true; });
            btn.addEventListener('touchend', (e) => { e.preventDefault(); touchControls[action] = false; });
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
    score = 0; level = 1; health = 100; treasureCount = 0;
    enemies = []; treasures = []; obstacles = [];
    
    player = {
        x: WORLD_SIZE / 2,
        y: WORLD_SIZE / 2,
        width: 40,
        height: 50,
        speed: 5
    };
    
    // توليد عشوائي للعقبات (صخور)
    for (let i = 0; i < 100; i++) {
        obstacles.push({
            x: Math.random() * WORLD_SIZE,
            y: Math.random() * WORLD_SIZE,
            size: 40 + Math.random() * 60
        });
    }
    
    // توليد عشوائي للكنوز
    for (let i = 0; i < 50; i++) {
        treasures.push({
            x: Math.random() * WORLD_SIZE,
            y: Math.random() * WORLD_SIZE,
            collected: false
        });
    }
    
    // توليد عشوائي للأعداء
    for (let i = 0; i < 20; i++) {
        enemies.push({
            x: Math.random() * WORLD_SIZE,
            y: Math.random() * WORLD_SIZE,
            health: 50,
            speed: 1.5 + Math.random()
        });
    }
}

function update() {
    if (isPaused) return;
    
    // حركة اللاعب مع فحص التصادم مع العقبات
    let nextX = player.x;
    let nextY = player.y;
    
    if (keys['ArrowRight'] || keys['d'] || touchControls.right) nextX += player.speed;
    if (keys['ArrowLeft'] || keys['a'] || touchControls.left) nextX -= player.speed;
    if (keys['ArrowDown'] || keys['s'] || touchControls.down) nextY += player.speed;
    if (keys['ArrowUp'] || keys['w'] || touchControls.up) nextY -= player.speed;
    
    // فحص التصادم مع العقبات قبل الحركة
    let canMoveX = true;
    let canMoveY = true;
    
    obstacles.forEach(obs => {
        if (nextX < obs.x + obs.size && nextX + player.width > obs.x &&
            player.y < obs.y + obs.size && player.y + player.height > obs.y) {
            canMoveX = false;
        }
        if (player.x < obs.x + obs.size && player.x + player.width > obs.x &&
            nextY < obs.y + obs.size && nextY + player.height > obs.y) {
            canMoveY = false;
        }
    });
    
    if (canMoveX) player.x = nextX;
    if (canMoveY) player.y = nextY;
    
    // حدود العالم
    player.x = Math.max(0, Math.min(WORLD_SIZE - player.width, player.x));
    player.y = Math.max(0, Math.min(WORLD_SIZE - player.height, player.y));
    
    // تحديث الكاميرا لتتبع اللاعب
    camera.x = player.x - canvas.width / 2;
    camera.y = player.y - canvas.height / 2;
    
    // الهجوم
    if ((keys[' '] || touchControls.attack) && attackCooldown <= 0) {
        isAttacking = true;
        attackCooldown = 20;
        setTimeout(() => isAttacking = false, 150);
        
        // ضرب الأعداء القريبين
        enemies.forEach((enemy, index) => {
            let dist = Math.hypot(enemy.x - player.x, enemy.y - player.y);
            if (dist < 100) {
                enemy.health -= 25;
                if (enemy.health <= 0) {
                    enemies.splice(index, 1);
                    score += 50;
                }
            }
        });
    }
    if (attackCooldown > 0) attackCooldown--;

    // ذكاء الأعداء (مطاردة اللاعب إذا كان قريباً)
    enemies.forEach(enemy => {
        let dist = Math.hypot(player.x - enemy.x, player.y - enemy.y);
        if (dist < 400) {
            let dx = player.x - enemy.x;
            let dy = player.y - enemy.y;
            enemy.x += (dx / dist) * enemy.speed;
            enemy.y += (dy / dist) * enemy.speed;
        }
        
        // تصادم العدو مع اللاعب
        if (dist < 40) {
            health -= 0.1;
            if (health <= 0) { alert('انتهت اللعبة!'); initGame(); }
        }
    });
    
    // جمع الكنوز
    treasures.forEach(t => {
        if (!t.collected && Math.hypot(t.x - player.x, t.y - player.y) < 50) {
            t.collected = true;
            treasureCount++;
            score += 100;
        }
    });

    // الرسم
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    ctx.save();
    ctx.translate(-camera.x, -camera.y);
    
    // 1. رسم الأرضية الرملية
    ctx.fillStyle = '#d2b48c';
    ctx.fillRect(0, 0, WORLD_SIZE, WORLD_SIZE);
    
    // رسم شبكة بسيطة للصحراء
    ctx.strokeStyle = '#c2a47c';
    ctx.lineWidth = 2;
    for(let i=0; i<WORLD_SIZE; i+=200) {
        ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, WORLD_SIZE); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(WORLD_SIZE, i); ctx.stroke();
    }
    
    // 2. رسم العقبات (صخور)
    ctx.fillStyle = '#8b7355';
    obstacles.forEach(obs => {
        ctx.fillRect(obs.x, obs.y, obs.size, obs.size);
        ctx.strokeStyle = '#5d4d3a';
        ctx.strokeRect(obs.x, obs.y, obs.size, obs.size);
    });
    
    // 3. رسم الكنوز
    ctx.fillStyle = '#ffd700';
    treasures.forEach(t => {
        if (!t.collected) {
            ctx.beginPath(); ctx.arc(t.x, t.y, 15, 0, Math.PI*2); ctx.fill();
            ctx.strokeStyle = '#000'; ctx.stroke();
        }
    });
    
    // 4. رسم الأعداء
    ctx.fillStyle = '#5c0000';
    enemies.forEach(enemy => {
        ctx.fillRect(enemy.x, enemy.y, 40, 40);
        ctx.fillStyle = '#ff0000';
        ctx.fillRect(enemy.x+5, enemy.y+5, 5, 5);
        ctx.fillRect(enemy.x+30, enemy.y+5, 5, 5);
        ctx.fillStyle = '#5c0000';
    });
    
    // 5. رسم اللاعب
    drawPlayer();
    
    ctx.restore();
    
    // 6. رسم نظام المصباح (فوق الكاميرا)
    drawLanternEffect();
    
    updateHUD();
    gameLoop = requestAnimationFrame(update);
}

function drawLanternEffect() {
    ctx.save();
    
    // 1. رسم طبقة سوداء تغطي الشاشة بالكامل
    ctx.fillStyle = 'rgba(0, 0, 0, 0.92)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // 2. استخدام 'destination-out' لعمل فتحة دائرية شفافة (المصباح)
    ctx.globalCompositeOperation = 'destination-out';
    
    // إنشاء تدرج دائري لجعل حواف الضوء ناعمة
    const gradient = ctx.createRadialGradient(
        canvas.width / 2, canvas.height / 2, 50,
        canvas.width / 2, canvas.height / 2, 220
    );
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(canvas.width / 2, canvas.height / 2, 220, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.restore();
}

function drawPlayer() {
    const x = player.x;
    const y = player.y;
    ctx.fillStyle = '#FFFFFF'; ctx.fillRect(x, y + 10, 40, 40); // الثوب
    ctx.fillStyle = '#f3d2b3'; ctx.fillRect(x + 5, y - 10, 30, 25); // الرأس
    ctx.fillStyle = '#ff0000'; ctx.fillRect(x, y - 15, 40, 10); // الشماغ
    if (isAttacking) {
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 5;
        ctx.beginPath(); ctx.moveTo(x + 40, y + 20); ctx.lineTo(x + 80, y + 10); ctx.stroke();
    }
}

function updateHUD() {
    document.getElementById('score').textContent = score;
    document.getElementById('treasureCount').textContent = treasureCount;
    document.getElementById('healthFill').style.width = health + '%';
}
