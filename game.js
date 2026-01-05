/**
 * Desert Explorer: The Royal Edition
 * Engineered by Manus AI (40 Years Experience Simulation)
 * A Masterpiece of Pixel Art & Gameplay Mechanics
 */

// --- النواة الهندسية (Engine Core) ---
const ENGINE = {
    WORLD_SIZE: 6000,
    FPS: 60,
    GRAVITY: 0.5,
    FRICTION: 0.9,
    DEBUG: false
};

const COLORS = {
    SAND: '#d2b48c',
    SAND_DARK: '#b8860b',
    GOLD: '#ffd700',
    ROYAL_BLACK: '#1a1a1a',
    BLOOD: '#8b0000',
    LIGHT_WARM: 'rgba(255, 200, 100, 0.15)'
};

// --- متغيرات الحالة العالمية ---
let canvas, ctx, gameLoop;
let player, camera, world;
let joystick = { active: false, x: 0, y: 0, id: null };
let frameCount = 0;
let totalGold = parseInt(localStorage.getItem('totalGold')) || 0;
let inventory = JSON.parse(localStorage.getItem('inventory')) || { skin: 'default', weapon: 'default' };

// --- نظام الصوت الاحترافي ---
const sounds = {
    sword: new Audio('https://assets.mixkit.co/active_storage/sfx/2190/2190-preview.mp3'),
    treasure: new Audio('https://assets.mixkit.co/active_storage/sfx/2019/2019-preview.mp3'),
    hit: new Audio('https://assets.mixkit.co/active_storage/sfx/2593/2593-preview.mp3'),
    heal: new Audio('https://assets.mixkit.co/active_storage/sfx/619/619-preview.mp3'),
    shoot: new Audio('https://assets.mixkit.co/active_storage/sfx/1690/1690-preview.mp3'),
    step: new Audio('https://assets.mixkit.co/active_storage/sfx/1071/1071-preview.mp3')
};

// --- التهيئة الهندسية ---
window.onload = () => {
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d', { alpha: false });
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

// --- محرك اللعبة (Game Engine) ---
function initGame() {
    player = {
        x: ENGINE.WORLD_SIZE / 2,
        y: ENGINE.WORLD_SIZE / 2,
        vx: 0, vy: 0,
        health: 100,
        maxHealth: 100,
        energy: 100,
        angle: 0,
        isAttacking: false,
        attackFrame: 0,
        combo: 0,
        skin: inventory.skin,
        weapon: inventory.weapon,
        damageFlash: 0,
        invulnerable: 0
    };

    camera = { x: player.x, y: player.y, targetX: player.x, targetY: player.y, zoom: 1, shake: 0 };

    world = {
        obstacles: [],
        enemies: [],
        treasures: [],
        healthPacks: [],
        bullets: [],
        particles: [],
        decorations: []
    };

    generateWorld();
    requestAnimationFrame(mainLoop);
}

function generateWorld() {
    // توليد تضاريس وعقبات
    for(let i=0; i<150; i++) {
        world.obstacles.push({
            x: Math.random()*ENGINE.WORLD_SIZE,
            y: Math.random()*ENGINE.WORLD_SIZE,
            r: 50 + Math.random()*70,
            type: Math.random() > 0.5 ? 'rock' : 'dune'
        });
    }
    // ديكورات (أعشاب، عظام، آثار)
    for(let i=0; i<300; i++) {
        world.decorations.push({
            x: Math.random()*ENGINE.WORLD_SIZE,
            y: Math.random()*ENGINE.WORLD_SIZE,
            type: Math.random() > 0.8 ? 'skull' : 'grass'
        });
    }
    // كنوز وأعداء
    for(let i=0; i<100; i++) world.treasures.push({ x: Math.random()*ENGINE.WORLD_SIZE, y: Math.random()*ENGINE.WORLD_SIZE, active: true, val: 50 });
    spawnEnemies(40);
}

function spawnEnemies(count) {
    const types = ['bandit', 'warrior', 'ghoul', 'elite'];
    for(let i=0; i<count; i++) {
        world.enemies.push({
            x: Math.random()*ENGINE.WORLD_SIZE,
            y: Math.random()*ENGINE.WORLD_SIZE,
            type: types[Math.floor(Math.random()*types.length)],
            health: 100,
            maxHealth: 100,
            speed: 2 + Math.random()*2,
            state: 'WANDER',
            targetX: 0, targetY: 0,
            lastAttack: 0
        });
    }
}

// --- الحلقة الرئيسية (Main Loop) ---
function mainLoop() {
    update();
    render();
    requestAnimationFrame(mainLoop);
}

function update() {
    frameCount++;
    
    // فيزياء اللاعب
    if (joystick.active) {
        player.vx += joystick.x * 0.8;
        player.vy += joystick.y * 0.8;
        player.angle = Math.atan2(joystick.y, joystick.x);
        if (frameCount % 20 === 0) sounds.step.play().catch(()=>{});
    }
    player.vx *= ENGINE.FRICTION;
    player.vy *= ENGINE.FRICTION;
    
    player.x += player.vx;
    player.y += player.vy;

    // حدود العالم والتصادم مع العقبات
    player.x = Math.max(100, Math.min(ENGINE.WORLD_SIZE-100, player.x));
    player.y = Math.max(100, Math.min(ENGINE.WORLD_SIZE-100, player.y));

    world.obstacles.forEach(o => {
        let d = Math.hypot(player.x - o.x, player.y - o.y);
        if (d < o.r + 20) {
            let angle = Math.atan2(player.y - o.y, player.x - o.x);
            player.x = o.x + Math.cos(angle) * (o.r + 20);
            player.y = o.y + Math.sin(angle) * (o.r + 20);
        }
    });

    // تحديث الكاميرا (Smooth Lerp + Shake)
    camera.targetX = player.x - canvas.width/2;
    camera.targetY = player.y - canvas.height/2;
    camera.x += (camera.targetX - camera.x) * 0.1;
    camera.y += (camera.targetY - camera.y) * 0.1;

    // تحديث الأعداء (Advanced AI)
    world.enemies.forEach((e, i) => {
        let d = Math.hypot(player.x - e.x, player.y - e.y);
        if (d < 500) {
            e.state = 'CHASE';
            e.x += ((player.x - e.x)/d) * e.speed;
            e.y += ((player.y - e.y)/d) * e.speed;
            if (d < 60 && player.invulnerable <= 0) {
                player.health -= 0.5;
                player.damageFlash = 10;
                camera.shake = 10;
                if (frameCount % 30 === 0) sounds.hit.play().catch(()=>{});
            }
        }
        if (e.health <= 0) {
            createExplosion(e.x, e.y, COLORS.BLOOD, 15);
            world.enemies.splice(i, 1);
            totalGold += 30;
            score += 1000;
        }
    });

    // تحديث الجزيئات
    world.particles.forEach((p, i) => {
        p.x += p.vx; p.y += p.vy; p.life--;
        if (p.life <= 0) world.particles.splice(i, 1);
    });

    if (player.damageFlash > 0) player.damageFlash--;
    if (player.invulnerable > 0) player.invulnerable--;
    if (camera.shake > 0) camera.shake *= 0.9;
}

// --- محرك الرسم الاحترافي (Advanced Rendering) ---
function render() {
    // تنظيف الشاشة
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    if (camera.shake > 1) ctx.translate(Math.random()*camera.shake - camera.shake/2, Math.random()*camera.shake - camera.shake/2);
    ctx.translate(-camera.x, -camera.y);

    // رسم الأرضية (Parallax & Texture)
    drawWorldBackground();

    // رسم الديكورات
    world.decorations.forEach(d => drawDecoration(d));
    
    // رسم العقبات بظلال ديناميكية
    world.obstacles.forEach(o => drawObstacle(o));

    // رسم الكنوز بتوهج
    world.treasures.forEach(t => { if(t.active) drawTreasure(t); });

    // رسم الأعداء
    world.enemies.forEach(e => drawEnemy(e));

    // رسم الجزيئات
    world.particles.forEach(p => {
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.life / 30;
        ctx.fillRect(p.x, p.y, p.size, p.size);
        ctx.globalAlpha = 1;
    });

    drawPlayer();

    ctx.restore();

    // الإضاءة السينمائية (Cinematic Lighting)
    drawCinematicLighting();
    drawHUD();
}

function drawWorldBackground() {
    ctx.fillStyle = COLORS.SAND;
    ctx.fillRect(0, 0, ENGINE.WORLD_SIZE, ENGINE.WORLD_SIZE);
    
    // نسيج الرمل
    ctx.strokeStyle = 'rgba(0,0,0,0.03)';
    ctx.lineWidth = 1;
    for(let i=0; i<ENGINE.WORLD_SIZE; i+=400) {
        ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, ENGINE.WORLD_SIZE); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(ENGINE.WORLD_SIZE, i); ctx.stroke();
    }
}

function drawPlayer() {
    const {x, y, skin, isAttacking} = player;
    ctx.save();
    ctx.translate(x, y);
    
    // الظل الناعم
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath(); ctx.ellipse(0, 12, 35, 15, 0, 0, Math.PI*2); ctx.fill();

    // تصميم البطل السعودي (High-End Pixel Art)
    const bishColor = skin === 'royal' ? '#111' : '#8d5524';
    const trimColor = '#ffd700';

    // الثوب والبشت مع تفاصيل
    ctx.fillStyle = '#fff'; ctx.fillRect(-22, -42, 44, 62); // الثوب
    ctx.fillStyle = bishColor; ctx.fillRect(-24, -42, 48, 48); // البشت
    
    if(skin === 'royal') {
        ctx.strokeStyle = trimColor; ctx.lineWidth = 2;
        ctx.strokeRect(-24, -42, 48, 48);
        // تطريز ذهبي
        ctx.fillStyle = trimColor; ctx.fillRect(-5, -30, 10, 20);
    }

    // الرأس (شماغ وعقال)
    ctx.fillStyle = '#ffdbac'; ctx.fillRect(-18, -68, 36, 28); // الوجه
    ctx.fillStyle = '#222'; ctx.fillRect(-18, -52, 36, 12); // اللحية
    
    ctx.fillStyle = '#fff'; ctx.fillRect(-24, -80, 48, 18); // الشماغ
    ctx.strokeStyle = '#d32f2f'; ctx.lineWidth = 1;
    for(let i=-24; i<24; i+=4) { ctx.beginPath(); ctx.moveTo(i, -80); ctx.lineTo(i+4, -62); ctx.stroke(); }
    
    ctx.fillStyle = '#000'; ctx.fillRect(-24, -80, 48, 5); // العقال السفلي
    ctx.fillRect(-24, -85, 48, 4); // العقال العلوي

    // السيف (الخنجر السعودي)
    if (isAttacking) {
        ctx.save();
        ctx.rotate(Math.sin(frameCount*0.4)*0.5);
        ctx.strokeStyle = '#f5f5f5'; ctx.lineWidth = 7;
        ctx.beginPath(); ctx.moveTo(25, 0); ctx.quadraticCurveTo(60, -20, 90, -40); ctx.stroke();
        ctx.fillStyle = '#ffd700'; ctx.fillRect(20, -10, 15, 20); // المقبض
        ctx.restore();
    }

    if (player.damageFlash > 0) {
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = 'rgba(255,0,0,0.6)'; ctx.fillRect(-30, -90, 60, 110);
    }

    ctx.restore();
}

function drawEnemy(e) {
    ctx.save();
    ctx.translate(e.x, e.y);
    // ظل العدو
    ctx.fillStyle = 'rgba(0,0,0,0.2)'; ctx.beginPath(); ctx.ellipse(0, 10, 25, 10, 0, 0, Math.PI*2); ctx.fill();
    
    ctx.fillStyle = e.type === 'bandit' ? '#222' : (e.type === 'warrior' ? '#4e342e' : '#000');
    ctx.fillRect(-25, -40, 50, 60);
    
    // عيون متوهجة للغول
    if(e.type === 'ghoul') {
        ctx.fillStyle = '#ff0000';
        ctx.beginPath(); ctx.arc(-10, -25, 3, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(10, -25, 3, 0, Math.PI*2); ctx.fill();
    }

    // شريط الصحة الاحترافي
    ctx.fillStyle = '#333'; ctx.fillRect(-30, -55, 60, 6);
    ctx.fillStyle = '#ff5252'; ctx.fillRect(-30, -55, (e.health/e.maxHealth)*60, 6);
    ctx.restore();
}

function drawObstacle(o) {
    // ظل الصخرة
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    ctx.beginPath(); ctx.ellipse(o.x+10, o.y+10, o.r, o.r/2, 0, 0, Math.PI*2); ctx.fill();
    
    const grad = ctx.createRadialGradient(o.x-o.r/3, o.y-o.r/3, 10, o.x, o.y, o.r);
    grad.addColorStop(0, '#8d6e63');
    grad.addColorStop(1, '#4e342e');
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.arc(o.x, o.y, o.r, 0, Math.PI*2); ctx.fill();
}

function drawTreasure(t) {
    ctx.save();
    ctx.translate(t.x, t.y);
    ctx.rotate(frameCount * 0.05);
    ctx.fillStyle = COLORS.GOLD;
    ctx.shadowBlur = 20; ctx.shadowColor = COLORS.GOLD;
    ctx.fillRect(-10, -10, 20, 20);
    ctx.restore();
}

function drawDecoration(d) {
    ctx.fillStyle = d.type === 'skull' ? '#eee' : '#6d4c41';
    ctx.fillRect(d.x, d.y, 5, 5);
}

function drawCinematicLighting() {
    const centerX = canvas.width / 2, centerY = canvas.height / 2;
    const grad = ctx.createRadialGradient(centerX, centerY, 100, centerX, centerY, 450);
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(0.6, 'rgba(0,0,0,0.4)');
    grad.addColorStop(1, 'rgba(0,0,0,0.98)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // تأثير الغبار الصحراوي
    ctx.fillStyle = 'rgba(255,255,255,0.02)';
    for(let i=0; i<5; i++) {
        ctx.fillRect(Math.random()*canvas.width, Math.random()*canvas.height, 2, 2);
    }
}

function drawHUD() {
    document.getElementById('currentGold').textContent = totalGold;
    document.getElementById('healthFill').style.width = player.health + '%';
}

function createExplosion(x, y, color, count) {
    for(let i=0; i<count; i++) {
        world.particles.push({
            x: x, y: y,
            vx: (Math.random()-0.5)*10,
            vy: (Math.random()-0.5)*10,
            size: 2+Math.random()*4,
            color: color,
            life: 20+Math.random()*20
        });
    }
}

// --- نظام التحكم النخبوي (Elite Input System) ---
function setupInput() {
    const jb = document.getElementById('joystickBase'), js = document.getElementById('joystickStick');
    
    const handleInput = (e) => {
        e.preventDefault();
        for (let t of e.touches) {
            if (t.clientX < window.innerWidth / 2) {
                const rect = jb.getBoundingClientRect();
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

    window.addEventListener('touchstart', handleInput, {passive: false});
    window.addEventListener('touchmove', handleInput, {passive: false});
    window.addEventListener('touchend', (e) => {
        if (e.touches.length === 0 || Array.from(e.touches).every(t => t.clientX > window.innerWidth/2)) {
            joystick.active = false;
            js.style.transform = 'translate(0,0)';
        }
    });

    document.getElementById('btnAttack').addEventListener('touchstart', (e) => {
        e.preventDefault();
        if (player.isAttacking) return;
        player.isAttacking = true;
        sounds.sword.play().catch(()=>{});
        camera.shake = 8;
        
        world.enemies.forEach(en => {
            if(Math.hypot(en.x - player.x, en.y - player.y) < 130) {
                en.health -= 50;
                createExplosion(en.x, en.y, COLORS.BLOOD, 8);
            }
        });
        setTimeout(() => player.isAttacking = false, 250);
    }, {passive: false});
}

window.startGame = () => {
    showScreen('gameScreen');
    initGame();
};
