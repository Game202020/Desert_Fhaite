// متغيرات اللعبة
let canvas, ctx;
let player, enemies = [], treasures = [], obstacles = [];
let score = 0, level = 1, health = 100, treasureCount = 0;
let keys = {};
let gameLoop;
let isPaused = false;
let isAttacking = false;
let attackCooldown = 0;

// أنيميشن اللاعب
let playerFrame = 0;
let frameCounter = 0;

// المؤثرات الصوتية
const sounds = {
    sword: new Audio('https://assets.mixkit.co/active_storage/sfx/2190/2190-preview.mp3'),
    treasure: new Audio('https://assets.mixkit.co/active_storage/sfx/2019/2019-preview.mp3'),
    hit: new Audio('https://assets.mixkit.co/active_storage/sfx/2593/2593-preview.mp3')
};

function playSound(name) {
    try { if (sounds[name]) { sounds[name].currentTime = 0; sounds[name].play().catch(e => {}); } } catch (e) {}
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
    player = { x: WORLD_SIZE / 2, y: WORLD_SIZE / 2, width: 60, height: 80, speed: 5, moving: false };
    for (let i = 0; i < 80; i++) obstacles.push({ x: Math.random() * WORLD_SIZE, y: Math.random() * WORLD_SIZE, size: 60 });
    for (let i = 0; i < 40; i++) treasures.push({ x: Math.random() * WORLD_SIZE, y: Math.random() * WORLD_SIZE, collected: false });
    
    // إنشاء أعداء بأنواع مختلفة
    const enemyTypes = ['bandit', 'warrior', 'shadow'];
    for (let i = 0; i < 20; i++) {
        const type = enemyTypes[Math.floor(Math.random() * enemyTypes.length)];
        enemies.push({
            x: Math.random() * WORLD_SIZE,
            y: Math.random() * WORLD_SIZE,
            type: type,
            health: type === 'warrior' ? 80 : 50,
            speed: type === 'bandit' ? 2.5 : 1.5,
            width: 50,
            height: 70,
            frame: 0
        });
    }
}

function update() {
    if (isPaused) return;
    let moveX = joystick.active ? joystick.inputX : (keys['ArrowRight'] || keys['d'] ? 1 : (keys['ArrowLeft'] || keys['a'] ? -1 : 0));
    let moveY = joystick.active ? joystick.inputY : (keys['ArrowDown'] || keys['s'] ? 1 : (keys['ArrowUp'] || keys['w'] ? -1 : 0));
    
    player.moving = (moveX !== 0 || moveY !== 0);
    player.x += moveX * player.speed;
    player.y += moveY * player.speed;
    
    player.x = Math.max(0, Math.min(WORLD_SIZE - player.width, player.x));
    player.y = Math.max(0, Math.min(WORLD_SIZE - player.height, player.y));
    camera.x = player.x - canvas.width / 2;
    camera.y = player.y - canvas.height / 2;
    
    // تحديث فريمات الأنيميشن
    frameCounter++;
    if (frameCounter % 10 === 0) {
        playerFrame = (playerFrame + 1) % 5;
    }

    if ((keys[' '] || keys['attack']) && attackCooldown <= 0) {
        isAttacking = true; attackCooldown = 20; playSound('sword');
        setTimeout(() => isAttacking = false, 150);
        enemies.forEach((enemy, index) => {
            if (Math.hypot(enemy.x - player.x, enemy.y - player.y) < 120) {
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
        if (!t.collected && Math.hypot(t.x - player.x, t.y - player.y) < 60) {
            t.collected = true; treasureCount++; score += 100; playSound('treasure');
        }
    });

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.translate(-camera.x, -camera.y);
    
    // رسم الأرضية
    ctx.fillStyle = '#c2a47c'; ctx.fillRect(0, 0, WORLD_SIZE, WORLD_SIZE);
    ctx.fillStyle = '#b3946d';
    for(let i=0; i<WORLD_SIZE; i+=300) {
        for(let j=0; j<WORLD_SIZE; j+=300) { if((i+j)%600 === 0) ctx.fillRect(i, j, 150, 150); }
    }
    
    // رسم الصخور
    obstacles.forEach(obs => {
        ctx.fillStyle = '#6d5a41';
        ctx.beginPath();
        ctx.moveTo(obs.x, obs.y + obs.size * 0.3);
        ctx.lineTo(obs.x + obs.size * 0.4, obs.y);
        ctx.lineTo(obs.x + obs.size, obs.y + obs.size * 0.2);
        ctx.lineTo(obs.x + obs.size * 0.9, obs.y + obs.size);
        ctx.lineTo(obs.x + obs.size * 0.1, obs.y + obs.size * 0.8);
        ctx.closePath(); ctx.fill();
    });
    
    ctx.fillStyle = '#ffd700';
    treasures.forEach(t => { if (!t.collected) { ctx.beginPath(); ctx.arc(t.x, t.y, 15, 0, Math.PI*2); ctx.fill(); } });
    
    enemies.forEach(enemy => {
        drawEnemy(enemy);
    });
    
    drawPlayer();
    ctx.restore();
    drawLanternEffect();
    updateHUD();
    gameLoop = requestAnimationFrame(update);
}

function drawLanternEffect() {
    ctx.save();
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const gradient = ctx.createRadialGradient(centerX, centerY, 60, centerX, centerY, 280);
    gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0.95)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
}

function drawEnemy(enemy) {
    const x = enemy.x;
    const y = enemy.y;
    const frameOffset = Math.sin(Date.now() / 200) * 3;
    
    ctx.save();
    
    if (enemy.type === 'bandit') {
        // قاطع طريق ملثم
        ctx.fillStyle = '#3d2b1f'; // ثوب غامق
        ctx.fillRect(x + 10, y + 20 + frameOffset, 30, 45 - frameOffset);
        ctx.fillStyle = '#000000'; // اللثام
        ctx.fillRect(x + 12, y + 5 + frameOffset, 26, 15);
        ctx.fillStyle = '#f3d2b3'; // العيون
        ctx.fillRect(x + 18, y + 8 + frameOffset, 5, 3);
        ctx.fillRect(x + 27, y + 8 + frameOffset, 5, 3);
        ctx.fillStyle = '#555'; // خنجر
        ctx.fillRect(x + 35, y + 35 + frameOffset, 15, 5);
    } else if (enemy.type === 'warrior') {
        // محارب متمرد
        ctx.fillStyle = '#5a4a3a'; // درع جلدي
        ctx.fillRect(x + 8, y + 15 + frameOffset, 34, 50 - frameOffset);
        ctx.fillStyle = '#f3d2b3'; // وجه
        ctx.fillRect(x + 15, y + 2 + frameOffset, 20, 18);
        ctx.fillStyle = '#000'; // عقال وشعر
        ctx.fillRect(x + 12, y + 2 + frameOffset, 26, 5);
        ctx.fillStyle = '#777'; // سيف حديدي
        ctx.fillRect(x + 38, y + 20 + frameOffset, 5, 30);
    } else {
        // الظل الصحراوي
        ctx.fillStyle = '#1a1a1a'; // عباءة سوداء
        ctx.fillRect(x + 5, y + 10 + frameOffset, 40, 55 - frameOffset);
        ctx.fillStyle = '#ff0000'; // عيون حمراء متوهجة
        ctx.fillRect(x + 15, y + 15 + frameOffset, 4, 4);
        ctx.fillRect(x + 31, y + 15 + frameOffset, 4, 4);
    }
    
    // شريط الصحة للعدو
    ctx.fillStyle = '#ff0000';
    ctx.fillRect(x + 5, y - 10, 40, 5);
    ctx.fillStyle = '#00ff00';
    ctx.fillRect(x + 5, y - 10, (enemy.health / (enemy.type === 'warrior' ? 80 : 50)) * 40, 5);
    
    ctx.restore();
}

function drawPlayer() {
    const x = player.x;
    const y = player.y;
    const frameOffset = player.moving ? Math.sin(playerFrame * 0.8) * 5 : Math.sin(playerFrame * 0.5) * 2;
    
    ctx.save();
    
    // 1. الثوب الأبيض (مع أنيميشن الحركة)
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(x + 10, y + 20 + frameOffset, 40, 50 - frameOffset);
    
    // 2. البشت البني (التصميم الجديد)
    ctx.fillStyle = '#4a3728';
    ctx.fillRect(x + 5, y + 25 + frameOffset, 10, 40); // الجانب الأيسر
    ctx.fillRect(x + 45, y + 25 + frameOffset, 10, 40); // الجانب الأيمن
    
    // تطريز ذهبي على البشت
    ctx.fillStyle = '#d4af37';
    ctx.fillRect(x + 12, y + 25 + frameOffset, 3, 40);
    ctx.fillRect(x + 45, y + 25 + frameOffset, 3, 40);
    
    // 3. الرأس واللحية
    ctx.fillStyle = '#f3d2b3'; // لون البشرة
    ctx.fillRect(x + 15, y + 5 + frameOffset, 30, 25);
    
    ctx.fillStyle = '#2a1f18'; // اللحية السوداء
    ctx.fillRect(x + 15, y + 20 + frameOffset, 30, 10);
    ctx.fillRect(x + 25, y + 15 + frameOffset, 10, 5); // الشارب
    
    // 4. الشماغ الأحمر والعقال
    ctx.fillStyle = '#ff0000'; // الشماغ
    ctx.fillRect(x + 10, y - 5 + frameOffset, 40, 15);
    ctx.fillStyle = '#ffffff'; // تفاصيل الشماغ
    ctx.fillRect(x + 15, y - 2 + frameOffset, 30, 2);
    
    ctx.fillStyle = '#000000'; // العقال
    ctx.fillRect(x + 12, y + 2 + frameOffset, 36, 4);
    
    // 5. السيف (تصميم احترافي)
    if (isAttacking) {
        ctx.strokeStyle = '#c0c0c0'; // نصل السيف
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.moveTo(x + 50, y + 40);
        ctx.quadraticCurveTo(x + 90, y + 20, x + 110, y - 10);
        ctx.stroke();
        
        ctx.fillStyle = '#d4af37'; // مقبض السيف الذهبي
        ctx.fillRect(x + 45, y + 35, 15, 10);
    } else {
        // السيف في وضع الراحة
        ctx.strokeStyle = '#c0c0c0';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(x + 50, y + 40 + frameOffset);
        ctx.lineTo(x + 60, y + 10 + frameOffset);
        ctx.stroke();
        
        ctx.fillStyle = '#d4af37';
        ctx.fillRect(x + 48, y + 38 + frameOffset, 10, 6);
    }
    
    ctx.restore();
}

function updateHUD() {
    const scoreEl = document.getElementById('score');
    const treasureEl = document.getElementById('treasureCount');
    const healthEl = document.getElementById('healthFill');
    if (scoreEl) scoreEl.textContent = score;
    if (treasureEl) treasureEl.textContent = treasureCount;
    if (healthEl) healthEl.style.width = health + '%';
}
