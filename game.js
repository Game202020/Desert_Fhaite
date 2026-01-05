// متغيرات اللعبة
let canvas, ctx;
let player, enemies = [], treasures = [], obstacles = [], healthPacks = [];
let score = 0, level = 1, health = 100, treasureCount = 0;
let keys = {};
let gameLoop;
let isPaused = false;
let isAttacking = false;
let attackCooldown = 0;
let damageFlash = 0; // مؤقت وميض الضرر
let screenShake = 0; // مؤقت اهتزاز الشاشة

// متغيرات الإعدادات
let gameSettings = {
    soundEnabled: true,
    difficulty: 'medium',
    lanternRadius: 320,
    playerSpeed: 5
};

// أنيميشن اللاعب والأعداء
let globalFrame = 0;
let frameCounter = 0;

// المؤثرات الصوتية
const sounds = {
    sword: new Audio('https://assets.mixkit.co/active_storage/sfx/2190/2190-preview.mp3'),
    treasure: new Audio('https://assets.mixkit.co/active_storage/sfx/2019/2019-preview.mp3'),
    hit: new Audio('https://assets.mixkit.co/active_storage/sfx/2593/2593-preview.mp3'),
    heal: new Audio('https://assets.mixkit.co/active_storage/sfx/619/619-preview.mp3')
};

function playSound(name) {
    if (!gameSettings.soundEnabled) return;
    try { if (sounds[name]) { sounds[name].currentTime = 0; sounds[name].play().catch(e => {}); } } catch (e) {}
}

// نظام الكاميرا
let camera = { x: 0, y: 0 };
const WORLD_SIZE = 4000;

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
    const target = document.getElementById(screenId);
    if (target) target.classList.add('active');
    
    // إيقاف اللعبة إذا خرجنا من شاشة اللعبة
    if (screenId !== 'gameScreen' && gameLoop) {
        cancelAnimationFrame(gameLoop);
        gameLoop = null;
    }
}

function updateSettings() {
    gameSettings.soundEnabled = document.getElementById('soundToggle').checked;
    gameSettings.difficulty = document.getElementById('difficultySelect').value;
    gameSettings.lanternRadius = parseInt(document.getElementById('lanternRange').value);
    gameSettings.playerSpeed = parseInt(document.getElementById('speedRange').value);
    
    if (player) player.speed = gameSettings.playerSpeed;
}

function togglePause() {
    isPaused = !isPaused;
    const btn = document.getElementById('btnPause');
    btn.textContent = isPaused ? '▶️' : '⏸️';
    if (!isPaused) update();
}

function startGame() {
    showScreen('gameScreen');
    initGame();
    if (gameLoop) cancelAnimationFrame(gameLoop);
    gameLoop = requestAnimationFrame(update);
}

function initGame() {
    score = 0; health = 100; treasureCount = 0;
    enemies = []; treasures = []; obstacles = []; healthPacks = [];
    player = { x: WORLD_SIZE / 2, y: WORLD_SIZE / 2, width: 60, height: 80, speed: gameSettings.playerSpeed, moving: false };
    
    // تعديل الصعوبة
    let enemyCount = 25;
    if (gameSettings.difficulty === 'easy') enemyCount = 15;
    if (gameSettings.difficulty === 'hard') enemyCount = 40;
    
    // توليد عقبات (صخور بكسل آرت)
    for (let i = 0; i < 100; i++) obstacles.push({ x: Math.random() * WORLD_SIZE, y: Math.random() * WORLD_SIZE, size: 60 + Math.random() * 40 });
    
    // توليد كنوز
    for (let i = 0; i < 50; i++) treasures.push({ x: Math.random() * WORLD_SIZE, y: Math.random() * WORLD_SIZE, collected: false });
    
    // توليد صناديق علاج
    for (let i = 0; i < 15; i++) healthPacks.push({ x: Math.random() * WORLD_SIZE, y: Math.random() * WORLD_SIZE, collected: false });
    
    // توليد أعداء متنوعين (اللص، السياف، الغول)
    const types = ['bandit', 'warrior', 'ghoul'];
    for (let i = 0; i < 25; i++) {
        const type = types[Math.floor(Math.random() * types.length)];
        enemies.push({
            x: Math.random() * WORLD_SIZE,
            y: Math.random() * WORLD_SIZE,
            type: type,
            health: type === 'warrior' ? 100 : (type === 'ghoul' ? 150 : 60),
            speed: type === 'bandit' ? 3 : (type === 'warrior' ? 2 : 1.2),
            width: 60,
            height: 80
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
    
    // تصادم مع العقبات
    obstacles.forEach(obs => {
        if (player.x < obs.x + obs.size && player.x + player.width > obs.x &&
            player.y < obs.y + obs.size && player.y + player.height > obs.y) {
            player.x -= moveX * player.speed;
            player.y -= moveY * player.speed;
        }
    });

    player.x = Math.max(0, Math.min(WORLD_SIZE - player.width, player.x));
    player.y = Math.max(0, Math.min(WORLD_SIZE - player.height, player.y));
    camera.x = player.x - canvas.width / 2;
    camera.y = player.y - canvas.height / 2;
    
    frameCounter++;
    if (frameCounter % 8 === 0) globalFrame = (globalFrame + 1) % 6;

    if ((keys[' '] || keys['attack']) && attackCooldown <= 0) {
        isAttacking = true; attackCooldown = 25; playSound('sword');
        setTimeout(() => isAttacking = false, 200);
        enemies.forEach((enemy, index) => {
            if (Math.hypot(enemy.x - player.x, enemy.y - player.y) < 130) {
                enemy.health -= 40;
                if (enemy.health <= 0) { enemies.splice(index, 1); score += 100; }
            }
        });
    }
    if (attackCooldown > 0) attackCooldown--;

    enemies.forEach(enemy => {
        let dist = Math.hypot(player.x - enemy.x, player.y - enemy.y);
        if (dist < 500) {
            enemy.x += ((player.x - enemy.x) / dist) * enemy.speed;
            enemy.y += ((player.y - enemy.y) / dist) * enemy.speed;
        }
        if (dist < 50) {
            health -= 0.2;
            damageFlash = 10; // تفعيل الوميض الأحمر
            screenShake = 5;  // تفعيل اهتزاز الشاشة
            if (Math.random() < 0.03) playSound('hit');
            if (health <= 0) { 
                alert('انتهت اللعبة! لقد سقطت في رمال الصحراء.'); 
                cancelAnimationFrame(gameLoop);
                showScreen('mainMenu'); 
            }
        }
    });
    
    treasures.forEach(t => {
        if (!t.collected && Math.hypot(t.x - player.x, t.y - player.y) < 70) {
            t.collected = true; treasureCount++; score += 200; playSound('treasure');
        }
    });
    
    healthPacks.forEach(hp => {
        if (!hp.collected && Math.hypot(hp.x - player.x, hp.y - player.y) < 70) {
            hp.collected = true;
            health = Math.min(100, health + 25); // زيادة الصحة بنسبة 25%
            playSound('heal');
            damageFlash = -10; // وميض أخضر (قيمة سالبة للتمييز)
        }
    });

    draw();
    updateHUD();
    gameLoop = requestAnimationFrame(update);
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    
    // تطبيق اهتزاز الشاشة
    if (screenShake > 0) {
        ctx.translate(Math.random() * screenShake - screenShake/2, Math.random() * screenShake - screenShake/2);
        screenShake--;
    }
    
    ctx.translate(-camera.x, -camera.y);
    
    // رسم الأرضية البكسلية
    ctx.fillStyle = '#c2a47c';
    ctx.fillRect(0, 0, WORLD_SIZE, WORLD_SIZE);
    
    // نسيج الرمل
    ctx.fillStyle = '#b3946d';
    for(let i=0; i<WORLD_SIZE; i+=200) {
        for(let j=0; j<WORLD_SIZE; j+=200) {
            if((i+j)%400 === 0) ctx.fillRect(i+20, j+20, 40, 40);
        }
    }
    
    // رسم الصخور البكسلية
    obstacles.forEach(obs => {
        ctx.fillStyle = '#6d5a41';
        ctx.fillRect(obs.x, obs.y, obs.size, obs.size);
        ctx.fillStyle = '#4d3f2e';
        ctx.fillRect(obs.x + obs.size*0.6, obs.y, obs.size*0.4, obs.size);
        ctx.fillStyle = '#8b7355';
        ctx.fillRect(obs.x, obs.y, obs.size, obs.size*0.2);
    });
    
    // رسم الكنوز
    treasures.forEach(t => {
        if (!t.collected) {
            ctx.fillStyle = '#ffd700';
            ctx.beginPath(); ctx.arc(t.x, t.y, 15, 0, Math.PI*2); ctx.fill();
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(t.x-5, t.y-5, 10, 10); // لمعة الكنز
        }
    });
    
    // رسم صناديق العلاج
    healthPacks.forEach(hp => {
        if (!hp.collected) {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(hp.x - 15, hp.y - 15, 30, 30);
            ctx.fillStyle = '#ff0000';
            ctx.fillRect(hp.x - 10, hp.y - 2, 20, 4); // علامة +
            ctx.fillRect(hp.x - 2, hp.y - 10, 4, 20);
        }
    });
    
    enemies.forEach(enemy => drawEnemy(enemy));
    drawPlayer();
    
    ctx.restore();
    drawLanternEffect();
    
    // رسم وميض الضرر الأحمر أو العلاج الأخضر
    if (damageFlash > 0) {
        ctx.fillStyle = `rgba(255, 0, 0, ${damageFlash * 0.05})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        damageFlash--;
    } else if (damageFlash < 0) {
        ctx.fillStyle = `rgba(0, 255, 0, ${Math.abs(damageFlash) * 0.05})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        damageFlash++;
    }
}

function drawPlayer() {
    const x = player.x;
    const y = player.y;
    const anim = Math.sin(globalFrame * 0.5) * 4;
    
    ctx.save();
    // الثوب
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(x + 10, y + 20 + anim, 40, 50 - anim);
    // البشت البني المذهب
    ctx.fillStyle = '#4a3728';
    ctx.fillRect(x + 5, y + 25 + anim, 12, 45);
    ctx.fillRect(x + 43, y + 25 + anim, 12, 45);
    ctx.fillStyle = '#d4af37'; // تطريز ذهبي
    ctx.fillRect(x + 14, y + 25 + anim, 3, 45);
    ctx.fillRect(x + 43, y + 25 + anim, 3, 45);
    // الوجه واللحية
    ctx.fillStyle = '#f3d2b3';
    ctx.fillRect(x + 15, y + 5 + anim, 30, 25);
    ctx.fillStyle = '#1a1a1a'; // لحية سوداء كثيفة
    ctx.fillRect(x + 15, y + 22 + anim, 30, 10);
    ctx.fillRect(x + 22, y + 18 + anim, 16, 4); // شارب
    // الشماغ والعقال
    ctx.fillStyle = '#cc0000';
    ctx.fillRect(x + 8, y - 5 + anim, 44, 15);
    ctx.fillStyle = '#000000';
    ctx.fillRect(x + 10, y + 2 + anim, 40, 5);
    // السيف
    if (isAttacking) {
        ctx.strokeStyle = '#e0e0e0'; ctx.lineWidth = 8;
        ctx.beginPath(); ctx.moveTo(x+50, y+40); ctx.quadraticCurveTo(x+100, y+20, x+120, y-20); ctx.stroke();
        ctx.fillStyle = '#d4af37'; ctx.fillRect(x+45, y+35, 15, 15);
    } else {
        ctx.strokeStyle = '#c0c0c0'; ctx.lineWidth = 5;
        ctx.beginPath(); ctx.moveTo(x+50, y+45+anim); ctx.lineTo(x+65, y+10+anim); ctx.stroke();
        ctx.fillStyle = '#d4af37'; ctx.fillRect(x+48, y+40+anim, 12, 8);
    }
    ctx.restore();
}

function drawEnemy(enemy) {
    const x = enemy.x; const y = enemy.y;
    const anim = Math.sin((Date.now() / 200) + (x * 0.01)) * 4;
    ctx.save();
    
    if (enemy.type === 'bandit') {
        ctx.fillStyle = '#3d2b1f'; ctx.fillRect(x+10, y+20+anim, 35, 45-anim);
        ctx.fillStyle = '#1a1a1a'; ctx.fillRect(x+12, y+5+anim, 30, 18); // لثام
        ctx.fillStyle = '#f3d2b3'; ctx.fillRect(x+18, y+10+anim, 6, 4); // عيون
        ctx.fillRect(x+30, y+10+anim, 6, 4);
    } else if (enemy.type === 'warrior') {
        ctx.fillStyle = '#5a4a3a'; ctx.fillRect(x+5, y+15+anim, 45, 55-anim);
        ctx.fillStyle = '#f3d2b3'; ctx.fillRect(x+15, y+2+anim, 25, 20);
        ctx.fillStyle = '#000'; ctx.fillRect(x+12, y+2+anim, 32, 6); // عقال
        ctx.strokeStyle = '#777'; ctx.lineWidth = 6;
        ctx.beginPath(); ctx.moveTo(x+45, y+30+anim); ctx.lineTo(x+60, y+60+anim); ctx.stroke();
    } else { // غول
        ctx.fillStyle = '#1a1a1a'; ctx.fillRect(x+5, y+10+anim, 50, 65-anim);
        ctx.fillStyle = '#ff0000'; ctx.shadowBlur = 15; ctx.shadowColor = "red";
        ctx.fillRect(x+18, y+20+anim, 6, 6); ctx.fillRect(x+36, y+20+anim, 6, 6);
    }
    
    // شريط الصحة
    ctx.fillStyle = '#444'; ctx.fillRect(x, y-15, 50, 6);
    ctx.fillStyle = '#00ff00'; ctx.fillRect(x, y-15, (enemy.health / (enemy.type === 'warrior' ? 100 : (enemy.type === 'ghoul' ? 150 : 60))) * 50, 6);
    ctx.restore();
}

function drawLanternEffect() {
    ctx.save();
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const gradient = ctx.createRadialGradient(centerX, centerY, 50, centerX, centerY, gameSettings.lanternRadius);
    gradient.addColorStop(0, 'rgba(255, 200, 100, 0.05)'); // توهج دافئ خفيف
    gradient.addColorStop(0.5, 'rgba(0, 0, 0, 0.4)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0.96)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
}

function updateHUD() {
    document.getElementById('score').textContent = score;
    document.getElementById('treasureCount').textContent = treasureCount;
    document.getElementById('healthFill').style.width = health + '%';
}
