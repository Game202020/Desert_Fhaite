/**
 * Desert Explorer: The Ultimate Masterpiece
 * Engineered with 40 Years of Simulated Expertise
 * Version: 3.0 (The Final Polish)
 */

// --- النواة الهندسية الفائقة (Ultra Engine Core) ---
const CONFIG = {
    WORLD_SIZE: 8000,
    PLAYER_SPEED: 6,
    LANTERN_RADIUS: 420,
    DIFFICULTY: 'dynamic',
    ZOOM: 1.1,
    PARTICLE_LIMIT: 150
};

const THEME = {
    SAND: '#e3c193',
    SAND_DARK: '#c2a47c',
    GOLD: '#ffcc00',
    ROYAL_BLACK: '#121212',
    UI_GOLD: '#ffd700',
    BLOOD: '#a80000',
    LIGHT_GLOW: 'rgba(255, 230, 150, 0.2)'
};

// --- متغيرات الحالة العالمية ---
let canvas, ctx;
let player, camera, world;
let joystick = { active: false, x: 0, y: 0, id: null };
let frameCount = 0;
let totalGold = parseInt(localStorage.getItem('totalGold')) || 0;
let inventory = JSON.parse(localStorage.getItem('inventory')) || { skin: 'default', weapon: 'default' };
let score = 0;

// --- نظام الصوت الاحترافي ---
const sounds = {
    sword: new Audio('https://assets.mixkit.co/active_storage/sfx/2190/2190-preview.mp3'),
    treasure: new Audio('https://assets.mixkit.co/active_storage/sfx/2019/2019-preview.mp3'),
    hit: new Audio('https://assets.mixkit.co/active_storage/sfx/2593/2593-preview.mp3'),
    heal: new Audio('https://assets.mixkit.co/active_storage/sfx/619/619-preview.mp3'),
    shoot: new Audio('https://assets.mixkit.co/active_storage/sfx/1690/1690-preview.mp3'),
    bossSpawn: new Audio('https://assets.mixkit.co/active_storage/sfx/2514/2514-preview.mp3')
};

// --- التهيئة ---
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

// --- محرك اللعبة (The Master Engine) ---
function initGame() {
    player = {
        x: CONFIG.WORLD_SIZE / 2,
        y: CONFIG.WORLD_SIZE / 2,
        vx: 0, vy: 0,
        health: 100,
        maxHealth: 100,
        energy: 100,
        angle: 0,
        isAttacking: false,
        attackFrame: 0,
        skin: inventory.skin,
        weapon: inventory.weapon,
        damageFlash: 0,
        invulnerable: 0,
        anim: 0
    };

    camera = { x: player.x, y: player.y, shake: 0, zoom: CONFIG.ZOOM };

    world = {
        obstacles: [],
        enemies: [],
        treasures: [],
        healthPacks: [],
        bullets: [],
        particles: [],
        decorations: [],
        boss: null
    };

    generateMasterWorld();
    requestAnimationFrame(mainLoop);
}

function generateMasterWorld() {
    // توليد بيئة غنية
    for(let i=0; i<200; i++) {
        world.obstacles.push({
            x: Math.random()*CONFIG.WORLD_SIZE,
            y: Math.random()*CONFIG.WORLD_SIZE,
            r: 60 + Math.random()*100,
            color: Math.random() > 0.5 ? '#8d6e63' : '#795548'
        });
    }
    for(let i=0; i<500; i++) {
        world.decorations.push({
            x: Math.random()*CONFIG.WORLD_SIZE,
            y: Math.random()*CONFIG.WORLD_SIZE,
            type: Math.random() > 0.9 ? 'bones' : 'grass',
            size: 2 + Math.random()*4
        });
    }
    for(let i=0; i<150; i++) world.treasures.push({ x: Math.random()*CONFIG.WORLD_SIZE, y: Math.random()*CONFIG.WORLD_SIZE, active: true });
    for(let i=0; i<40; i++) world.healthPacks.push({ x: Math.random()*CONFIG.WORLD_SIZE, y: Math.random()*CONFIG.WORLD_SIZE, active: true });
    
    spawnEnemies(50);
}

function spawnEnemies(count) {
    const types = ['bandit', 'warrior', 'ghoul', 'elite'];
    for(let i=0; i<count; i++) {
        world.enemies.push({
            x: Math.random()*CONFIG.WORLD_SIZE,
            y: Math.random()*CONFIG.WORLD_SIZE,
            type: types[Math.floor(Math.random()*types.length)],
            health: 100,
            maxHealth: 100,
            speed: 2.2 + Math.random()*1.8,
            anim: 0
        });
    }
}

// --- الحلقة الرئيسية (The Core Loop) ---
function mainLoop() {
    update();
    render();
    requestAnimationFrame(mainLoop);
}

function update() {
    frameCount++;
    
    // فيزياء اللاعب (Ultra Smooth)
    if (joystick.active) {
        player.vx += joystick.x * 0.9;
        player.vy += joystick.y * 0.9;
        player.angle = Math.atan2(joystick.y, joystick.x);
        player.anim += 0.15;
    } else {
        player.vx *= 0.82; player.vy *= 0.82;
        player.anim = 0;
    }

    player.x = Math.max(150, Math.min(CONFIG.WORLD_SIZE-150, player.x + player.vx));
    player.y = Math.max(150, Math.min(CONFIG.WORLD_SIZE-150, player.y + player.vy));

    // تصادم العقبات (Advanced Collision)
    world.obstacles.forEach(o => {
        let d = Math.hypot(player.x - o.x, player.y - o.y);
        if (d < o.r + 30) {
            let angle = Math.atan2(player.y - o.y, player.x - o.x);
            player.x = o.x + Math.cos(angle) * (o.r + 30);
            player.y = o.y + Math.sin(angle) * (o.r + 30);
        }
    });

    // الكاميرا (Cinematic Lerp)
    camera.x += (player.x - canvas.width/2 - camera.x) * 0.08;
    camera.y += (player.y - canvas.height/2 - camera.y) * 0.08;

    // تحديث الأعداء (Smart AI)
    world.enemies.forEach((e, i) => {
        let d = Math.hypot(player.x - e.x, player.y - e.y);
        if (d < 700) {
            e.x += ((player.x - e.x)/d) * e.speed;
            e.y += ((player.y - e.y)/d) * e.speed;
            e.anim += 0.1;
            if (d < 65 && player.invulnerable <= 0) {
                player.health -= 0.6;
                player.damageFlash = 12;
                camera.shake = 12;
                if (frameCount % 25 === 0) sounds.hit.play().catch(()=>{});
            }
        }
        if (e.health <= 0) {
            createExplosion(e.x, e.y, THEME.BLOOD, 20);
            world.enemies.splice(i, 1);
            totalGold += 40;
            score += 1500;
        }
    });

    // جمع العناصر
    world.treasures.forEach(t => {
        if (t.active && Math.hypot(player.x - t.x, player.y - t.y) < 70) {
            t.active = false; totalGold += 60; sounds.treasure.play().catch(()=>{});
            createExplosion(t.x, t.y, THEME.GOLD, 10);
        }
    });

    // تحديث الجزيئات
    world.particles.forEach((p, i) => {
        p.x += p.vx; p.y += p.vy; p.life--;
        if (p.life <= 0) world.particles.splice(i, 1);
    });

    if (player.health <= 0) {
        localStorage.setItem('totalGold', totalGold);
        alert('انتهت المغامرة الملكية! تم حفظ الذهب المجمع.');
        location.reload();
    }

    if (player.damageFlash > 0) player.damageFlash--;
    if (camera.shake > 0) camera.shake *= 0.9;
}

// --- محرك الرسم الفائق (Ultra Rendering Engine) ---
function render() {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    if (camera.shake > 1) ctx.translate(Math.random()*camera.shake - camera.shake/2, Math.random()*camera.shake - camera.shake/2);
    ctx.translate(-camera.x, -camera.y);

    // رسم العالم
    drawMasterGround();
    world.decorations.forEach(d => drawDecoration(d));
    world.obstacles.forEach(o => drawMasterObstacle(o));
    world.treasures.forEach(t => { if(t.active) drawMasterTreasure(t); });
    world.enemies.forEach(e => drawMasterEnemy(e));
    
    // رسم الجزيئات
    world.particles.forEach(p => {
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.life / 40;
        ctx.fillRect(p.x, p.y, p.size, p.size);
        ctx.globalAlpha = 1;
    });

    drawMasterPlayer();

    ctx.restore();

    // الإضاءة والواجهة
    drawMasterLighting();
    drawHUD();
}

function drawMasterGround() {
    ctx.fillStyle = THEME.SAND;
    ctx.fillRect(0, 0, CONFIG.WORLD_SIZE, CONFIG.WORLD_SIZE);
    
    // نسيج الرمل المتقدم
    ctx.fillStyle = 'rgba(0,0,0,0.04)';
    for(let i=0; i<CONFIG.WORLD_SIZE; i+=300) {
        for(let j=0; j<CONFIG.WORLD_SIZE; j+=300) {
            ctx.fillRect(i + (i*j)%200, j + (i+j)%200, 6, 6);
        }
    }
}

function drawMasterPlayer() {
    const {x, y, skin, isAttacking, anim} = player;
    const bounce = Math.sin(anim) * 5;
    
    ctx.save();
    ctx.translate(x, y);
    
    // الظل
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath(); ctx.ellipse(0, 15, 35, 12, 0, 0, Math.PI*2); ctx.fill();

    // البطل السعودي (Ultra Detail Pixel Art)
    const bishColor = skin === 'royal' ? '#0a0a0a' : '#795548';
    
    // الثوب والبشت
    ctx.fillStyle = '#fff'; ctx.fillRect(-22, -45 + bounce, 44, 65); // الثوب
    ctx.fillStyle = bishColor; ctx.fillRect(-25, -45 + bounce, 50, 50); // البشت
    if(skin === 'royal') {
        ctx.strokeStyle = THEME.UI_GOLD; ctx.lineWidth = 3;
        ctx.strokeRect(-25, -45 + bounce, 50, 50);
        ctx.fillStyle = THEME.UI_GOLD; ctx.fillRect(-4, -35 + bounce, 8, 25); // تطريز
    }

    // الرأس
    ctx.fillStyle = '#ffdbac'; ctx.fillRect(-18, -72 + bounce, 36, 30); // الوجه
    ctx.fillStyle = '#1a1a1a'; ctx.fillRect(-18, -55 + bounce, 36, 15); // اللحية
    
    // الشماغ والعقال
    ctx.fillStyle = '#fff'; ctx.fillRect(-25, -85 + bounce, 50, 20); // الشماغ
    ctx.strokeStyle = '#c62828'; ctx.lineWidth = 1;
    for(let i=-25; i<25; i+=5) { ctx.beginPath(); ctx.moveTo(i, -85+bounce); ctx.lineTo(i+5, -65+bounce); ctx.stroke(); }
    ctx.fillStyle = '#000'; ctx.fillRect(-25, -85 + bounce, 50, 6); // العقال

    // السيف
    if (isAttacking) {
        ctx.save();
        ctx.rotate(Math.sin(frameCount*0.5)*0.6);
        ctx.strokeStyle = '#f5f5f5'; ctx.lineWidth = 8;
        ctx.beginPath(); ctx.moveTo(25, 0); ctx.quadraticCurveTo(70, -30, 100, -50); ctx.stroke();
        ctx.fillStyle = THEME.UI_GOLD; ctx.fillRect(20, -12, 18, 24); // المقبض
        ctx.restore();
    }

    if (player.damageFlash > 0) {
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = 'rgba(255,0,0,0.7)'; ctx.fillRect(-35, -100, 70, 130);
    }

    ctx.restore();
}

function drawMasterEnemy(e) {
    const bounce = Math.sin(e.anim) * 4;
    ctx.save();
    ctx.translate(e.x, e.y);
    ctx.fillStyle = 'rgba(0,0,0,0.2)'; ctx.beginPath(); ctx.ellipse(0, 12, 25, 10, 0, 0, Math.PI*2); ctx.fill();
    
    ctx.fillStyle = e.type === 'bandit' ? '#1a1a1a' : (e.type === 'warrior' ? '#3e2723' : '#000');
    ctx.fillRect(-25, -45 + bounce, 50, 65);
    
    if(e.type === 'ghoul') {
        ctx.fillStyle = '#ff1744';
        ctx.beginPath(); ctx.arc(-12, -30+bounce, 4, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(12, -30+bounce, 4, 0, Math.PI*2); ctx.fill();
    }

    // شريط الصحة
    ctx.fillStyle = '#212121'; ctx.fillRect(-30, -65, 60, 8);
    ctx.fillStyle = '#ff1744'; ctx.fillRect(-30, -65, (e.health/e.maxHealth)*60, 8);
    ctx.restore();
}

function drawMasterObstacle(o) {
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.beginPath(); ctx.ellipse(o.x+15, o.y+15, o.r, o.r/2, 0, 0, Math.PI*2); ctx.fill();
    
    const grad = ctx.createRadialGradient(o.x-o.r/3, o.y-o.r/3, 10, o.x, o.y, o.r);
    grad.addColorStop(0, o.color);
    grad.addColorStop(1, '#2d1b15');
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.arc(o.x, o.y, o.r, 0, Math.PI*2); ctx.fill();
}

function drawMasterTreasure(t) {
    ctx.save();
    ctx.translate(t.x, t.y);
    ctx.rotate(frameCount * 0.06);
    ctx.fillStyle = THEME.GOLD;
    ctx.shadowBlur = 25; ctx.shadowColor = THEME.GOLD;
    ctx.fillRect(-12, -12, 24, 24);
    ctx.restore();
}

function drawDecoration(d) {
    ctx.fillStyle = d.type === 'bones' ? '#f5f5f5' : '#5d4037';
    ctx.fillRect(d.x, d.y, d.size, d.size);
}

function drawMasterLighting() {
    const centerX = canvas.width / 2, centerY = canvas.height / 2;
    const grad = ctx.createRadialGradient(centerX, centerY, 120, centerX, centerY, CONFIG.LANTERN_RADIUS);
    grad.addColorStop(0, 'rgba(255,240,200,0)');
    grad.addColorStop(0.5, 'rgba(0,0,0,0.5)');
    grad.addColorStop(1, 'rgba(0,0,0,0.99)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function drawHUD() {
    document.getElementById('currentGold').textContent = totalGold;
    document.getElementById('healthFill').style.width = player.health + '%';
}

function createExplosion(x, y, color, count) {
    for(let i=0; i<count; i++) {
        world.particles.push({
            x: x, y: y,
            vx: (Math.random()-0.5)*12,
            vy: (Math.random()-0.5)*12,
            size: 3+Math.random()*5,
            color: color,
            life: 30+Math.random()*20
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
        camera.shake = 15;
        
        world.enemies.forEach(en => {
            if(Math.hypot(en.x - player.x, en.y - player.y) < 140) {
                en.health -= 50;
                createExplosion(en.x, en.y, THEME.BLOOD, 12);
            }
        });
        setTimeout(() => player.isAttacking = false, 250);
    }, {passive: false});
}

window.startGame = () => {
    showScreen('gameScreen');
    initGame();
};
