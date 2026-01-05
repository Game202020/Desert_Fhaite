/**
 * Desert Explorer - النسخة العالمية الاحترافية
 * تطوير: Manus AI
 */

// --- الإعدادات والمقاييس ---
const CONFIG = {
    WORLD_SIZE: 5000,
    PLAYER_SPEED: 5.5,
    LANTERN_RADIUS: 380,
    DIFFICULTY: 'medium',
    FPS: 60
};

// --- متغيرات الحالة ---
let canvas, ctx;
let player, camera, world;
let joystick = { active: false, x: 0, y: 0, id: null, base: {x:0, y:0} };
let gameState = 'MENU';
let frameCount = 0;
let particles = [];
let totalGold = parseInt(localStorage.getItem('totalGold')) || 0;
let inventory = JSON.parse(localStorage.getItem('inventory')) || { skin: 'default', weapon: 'default' };

// --- الأصول (الأصوات) ---
const sounds = {
    sword: new Audio('https://assets.mixkit.co/active_storage/sfx/2190/2190-preview.mp3'),
    treasure: new Audio('https://assets.mixkit.co/active_storage/sfx/2019/2019-preview.mp3'),
    hit: new Audio('https://assets.mixkit.co/active_storage/sfx/2593/2593-preview.mp3'),
    heal: new Audio('https://assets.mixkit.co/active_storage/sfx/619/619-preview.mp3'),
    shoot: new Audio('https://assets.mixkit.co/active_storage/sfx/1690/1690-preview.mp3')
};

// --- التهيئة ---
window.onload = () => {
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d', { alpha: false }); // تحسين الأداء
    resize();
    window.addEventListener('resize', resize);
    setupInput();
    updateTotalGoldDisplay();
};

function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

function updateTotalGoldDisplay() {
    const el = document.getElementById('totalGoldDisplay');
    if (el) el.textContent = totalGold;
}

// --- محرك اللعبة الرئيسي ---
function initGame() {
    player = {
        x: CONFIG.WORLD_SIZE / 2,
        y: CONFIG.WORLD_SIZE / 2,
        vx: 0, vy: 0,
        health: 100,
        maxHealth: 100,
        angle: 0,
        isAttacking: false,
        attackFrame: 0,
        lastAttack: 0,
        skin: inventory.skin,
        weapon: inventory.weapon,
        damageFlash: 0
    };

    camera = { x: player.x, y: player.y, lerp: 0.1 };

    world = {
        obstacles: [],
        enemies: [],
        treasures: [],
        healthPacks: [],
        bullets: [],
        particles: []
    };

    // توليد العالم بتفاصيل
    for(let i=0; i<120; i++) world.obstacles.push({ x: Math.random()*CONFIG.WORLD_SIZE, y: Math.random()*CONFIG.WORLD_SIZE, r: 40+Math.random()*60 });
    for(let i=0; i<80; i++) world.treasures.push({ x: Math.random()*CONFIG.WORLD_SIZE, y: Math.random()*CONFIG.WORLD_SIZE, active: true });
    for(let i=0; i<25; i++) world.healthPacks.push({ x: Math.random()*CONFIG.WORLD_SIZE, y: Math.random()*CONFIG.WORLD_SIZE, active: true });
    
    spawnEnemies(35);
    
    document.getElementById('btnShoot').style.display = (player.weapon === 'gun') ? 'block' : 'none';
    requestAnimationFrame(gameLoop);
}

function spawnEnemies(count) {
    const types = ['bandit', 'warrior', 'ghoul'];
    for(let i=0; i<count; i++) {
        world.enemies.push({
            x: Math.random()*CONFIG.WORLD_SIZE,
            y: Math.random()*CONFIG.WORLD_SIZE,
            type: types[Math.floor(Math.random()*types.length)],
            health: 100,
            speed: 1.8 + Math.random()*1.5,
            state: 'IDLE'
        });
    }
}

function gameLoop() {
    if (gameState === 'PAUSED') return;
    update();
    render();
    requestAnimationFrame(gameLoop);
}

// --- منطق التحديث ---
function update() {
    frameCount++;

    // حركة اللاعب مع تنعيم (Input Smoothing)
    if (joystick.active) {
        player.vx = joystick.x * CONFIG.PLAYER_SPEED;
        player.vy = joystick.y * CONFIG.PLAYER_SPEED;
        player.angle = Math.atan2(joystick.y, joystick.x);
    } else {
        player.vx *= 0.8; player.vy *= 0.8;
    }

    player.x = Math.max(100, Math.min(CONFIG.WORLD_SIZE-100, player.x + player.vx));
    player.y = Math.max(100, Math.min(CONFIG.WORLD_SIZE-100, player.y + player.vy));

    // الكاميرا السينمائية (Smooth Follow)
    camera.x += (player.x - canvas.width/2 - camera.x) * camera.lerp;
    camera.y += (player.y - canvas.height/2 - camera.y) * camera.lerp;

    // تحديث الأعداء (AI)
    world.enemies.forEach((e, i) => {
        let d = Math.hypot(player.x - e.x, player.y - e.y);
        if (d < 600) {
            e.x += ((player.x - e.x)/d) * e.speed;
            e.y += ((player.y - e.y)/d) * e.speed;
        }
        if (d < 50) {
            player.health -= 0.4;
            player.damageFlash = 15;
            if (frameCount % 20 === 0) sounds.hit.play().catch(()=>{});
        }
        if (e.health <= 0) { world.enemies.splice(i, 1); totalGold += 25; }
    });

    // جمع العناصر
    world.treasures.forEach(t => {
        if (t.active && Math.hypot(player.x - t.x, player.y - t.y) < 60) {
            t.active = false; totalGold += 50; sounds.treasure.play().catch(()=>{});
        }
    });

    if (player.health <= 0) {
        localStorage.setItem('totalGold', totalGold);
        alert('انتهت المغامرة! تم حفظ الذهب.');
        location.reload();
    }

    if (player.damageFlash > 0) player.damageFlash--;
}

// --- محرك الرسم (Rendering) ---
function render() {
    ctx.fillStyle = '#111';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.translate(-camera.x, -camera.y);

    // رسم الأرضية بتفاصيل
    drawGround();

    // رسم العناصر
    world.obstacles.forEach(o => drawObstacle(o));
    world.treasures.forEach(t => { if(t.active) drawTreasure(t); });
    world.enemies.forEach(e => drawEnemy(e));
    
    drawPlayer();

    ctx.restore();

    // تأثير المصباح الاحترافي
    drawLighting();
    drawHUD();
}

function drawGround() {
    ctx.fillStyle = '#c2a47c';
    ctx.fillRect(0, 0, CONFIG.WORLD_SIZE, CONFIG.WORLD_SIZE);
    
    // حبيبات الرمل
    ctx.fillStyle = 'rgba(0,0,0,0.05)';
    for(let i=0; i<CONFIG.WORLD_SIZE; i+=250) {
        for(let j=0; j<CONFIG.WORLD_SIZE; j+=250) {
            ctx.fillRect(i + (i*j)%100, j + (i+j)%100, 4, 4);
        }
    }
}

function drawPlayer() {
    const {x, y, angle, skin} = player;
    ctx.save();
    ctx.translate(x, y);
    
    // الظل
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.beginPath(); ctx.ellipse(0, 10, 30, 12, 0, 0, Math.PI*2); ctx.fill();

    // الجسم (بكسل آرت عالي الجودة)
    const bishColor = skin === 'royal' ? '#1a1a1a' : '#8d5524';
    
    // الثوب والبشت
    ctx.fillStyle = '#fff'; ctx.fillRect(-20, -40, 40, 60);
    ctx.fillStyle = bishColor; ctx.fillRect(-22, -40, 44, 45);
    if(skin === 'royal') { ctx.strokeStyle = '#ffd700'; ctx.lineWidth = 2; ctx.strokeRect(-22, -40, 44, 45); }

    // الرأس والشماغ
    ctx.fillStyle = '#ffcccc'; ctx.fillRect(-15, -65, 30, 25);
    ctx.fillStyle = '#333'; ctx.fillRect(-15, -50, 30, 10); // اللحية
    
    ctx.fillStyle = '#fff'; ctx.fillRect(-20, -75, 40, 15); // الشماغ
    ctx.strokeStyle = '#ff0000'; ctx.lineWidth = 1; ctx.strokeRect(-20, -75, 40, 15);
    ctx.fillStyle = '#000'; ctx.fillRect(-20, -75, 40, 4); // العقال

    // السيف عند الهجوم
    if (player.isAttacking) {
        ctx.strokeStyle = '#eee'; ctx.lineWidth = 6;
        ctx.beginPath(); ctx.moveTo(20, 0); ctx.lineTo(80, -30); ctx.stroke();
    }

    if (player.damageFlash > 0) {
        ctx.fillStyle = 'rgba(255,0,0,0.5)'; ctx.fillRect(-25, -80, 50, 100);
    }

    ctx.restore();
}

function drawEnemy(e) {
    ctx.save();
    ctx.translate(e.x, e.y);
    ctx.fillStyle = e.type === 'bandit' ? '#333' : '#5d4037';
    ctx.fillRect(-25, -40, 50, 60);
    // شريط الصحة
    ctx.fillStyle = '#444'; ctx.fillRect(-25, -55, 50, 6);
    ctx.fillStyle = '#ff4444'; ctx.fillRect(-25, -55, (e.health/100)*50, 6);
    ctx.restore();
}

function drawObstacle(o) {
    ctx.fillStyle = '#5d4037';
    ctx.beginPath(); ctx.arc(o.x, o.y, o.r, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.1)';
    ctx.beginPath(); ctx.arc(o.x+5, o.y+5, o.r-5, 0, Math.PI*2); ctx.fill();
}

function drawTreasure(t) {
    ctx.fillStyle = '#ffd700';
    ctx.beginPath(); ctx.arc(t.x, t.y, 12, 0, Math.PI*2); ctx.fill();
    ctx.shadowBlur = 15; ctx.shadowColor = '#ffd700';
}

function drawLighting() {
    const grad = ctx.createRadialGradient(canvas.width/2, canvas.height/2, 50, canvas.width/2, canvas.height/2, CONFIG.LANTERN_RADIUS);
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(0.5, 'rgba(0,0,0,0.4)');
    grad.addColorStop(1, 'rgba(0,0,0,0.98)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function drawHUD() {
    document.getElementById('currentGold').textContent = totalGold;
    document.getElementById('healthFill').style.width = player.health + '%';
}

// --- نظام التحكم (Multi-Touch الاحترافي) ---
function setupInput() {
    const jb = document.getElementById('joystickBase'), js = document.getElementById('joystickStick');
    
    const handleTouch = (e) => {
        e.preventDefault();
        for (let t of e.touches) {
            const rect = jb.getBoundingClientRect();
            // منطقة الجويستيك
            if (t.clientX < window.innerWidth / 2) {
                joystick.active = true;
                let dx = t.clientX - (rect.left + rect.width/2);
                let dy = t.clientY - (rect.top + rect.height/2);
                let dist = Math.min(50, Math.hypot(dx, dy));
                let angle = Math.atan2(dy, dx);
                joystick.x = (dist/50) * Math.cos(angle);
                joystick.y = (dist/50) * Math.sin(angle);
                js.style.transform = `translate(${joystick.x*40}px, ${joystick.y*40}px)`;
            }
        }
    };

    window.addEventListener('touchstart', handleTouch, {passive: false});
    window.addEventListener('touchmove', handleTouch, {passive: false});
    window.addEventListener('touchend', (e) => {
        if (e.touches.length === 0 || Array.from(e.touches).every(t => t.clientX > window.innerWidth/2)) {
            joystick.active = false;
            js.style.transform = 'translate(0,0)';
        }
    });

    document.getElementById('btnAttack').addEventListener('touchstart', (e) => {
        e.preventDefault();
        player.isAttacking = true;
        sounds.sword.play().catch(()=>{});
        world.enemies.forEach(en => {
            if(Math.hypot(en.x - player.x, en.y - player.y) < 120) en.health -= 50;
        });
        setTimeout(() => player.isAttacking = false, 200);
    }, {passive: false});
}

// دالة بدء اللعبة من القائمة
window.startGame = () => {
    showScreen('gameScreen');
    initGame();
};
