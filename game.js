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
const LANTERN_RADIUS = 150; // نطاق المصباح
const PLAYER_SIZE = 32;
const ENEMY_SIZE = 24;
const TREASURE_SIZE = 16;

// تهيئة اللعبة عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', function() {
    // تهيئة Canvas
    canvas = document.getElementById('gameCanvas');
    if (canvas) {
        ctx = canvas.getContext('2d');
        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);
    }
    
    // تهيئة الإعدادات
    initSettings();
    
    // التحكم بلوحة المفاتيح
    document.addEventListener('keydown', (e) => {
        keys[e.key] = true;
        if (e.key === 'Escape') {
            pauseGame();
        }
    });
    
    document.addEventListener('keyup', (e) => {
        keys[e.key] = false;
    });
    
    // تهيئة أزرار اللمس للجوال
    initTouchControls();
});

// تغيير حجم Canvas
function resizeCanvas() {
    if (canvas) {
        canvas.width = canvas.offsetWidth;
        canvas.height = canvas.offsetHeight;
    }
}

// تهيئة الإعدادات
function initSettings() {
    const volumeSlider = document.getElementById('volumeSlider');
    const volumeValue = document.getElementById('volumeValue');
    
    if (volumeSlider) {
        volumeSlider.addEventListener('input', function() {
            settings.volume = this.value;
            volumeValue.textContent = this.value + '%';
        });
    }
    
    const difficultySelect = document.getElementById('difficultySelect');
    if (difficultySelect) {
        difficultySelect.addEventListener('change', function() {
            settings.difficulty = this.value;
        });
    }
    
    const soundCheck = document.getElementById('soundCheck');
    if (soundCheck) {
        soundCheck.addEventListener('change', function() {
            settings.sound = this.checked;
        });
    }
}

// تهيئة أزرار التحكم باللمس
function initTouchControls() {
    const btnLeft = document.getElementById('btnLeft');
    const btnRight = document.getElementById('btnRight');
    const btnUp = document.getElementById('btnUp');
    const btnDown = document.getElementById('btnDown');
    const btnAttack = document.getElementById('btnAttack');
    
    if (btnLeft) {
        btnLeft.addEventListener('touchstart', (e) => {
            e.preventDefault();
            touchControls.left = true;
        });
        btnLeft.addEventListener('touchend', (e) => {
            e.preventDefault();
            touchControls.left = false;
        });
    }
    
    if (btnRight) {
        btnRight.addEventListener('touchstart', (e) => {
            e.preventDefault();
            touchControls.right = true;
        });
        btnRight.addEventListener('touchend', (e) => {
            e.preventDefault();
            touchControls.right = false;
        });
    }
    
    if (btnUp) {
        btnUp.addEventListener('touchstart', (e) => {
            e.preventDefault();
            touchControls.up = true;
        });
        btnUp.addEventListener('touchend', (e) => {
            e.preventDefault();
            touchControls.up = false;
        });
    }
    
    if (btnDown) {
        btnDown.addEventListener('touchstart', (e) => {
            e.preventDefault();
            touchControls.down = true;
        });
        btnDown.addEventListener('touchend', (e) => {
            e.preventDefault();
            touchControls.down = false;
        });
    }
    
    if (btnAttack) {
        btnAttack.addEventListener('touchstart', (e) => {
            e.preventDefault();
            touchControls.attack = true;
        });
        btnAttack.addEventListener('touchend', (e) => {
            e.preventDefault();
            touchControls.attack = false;
        });
    }
}

// التنقل بين الشاشات
function showScreen(screenId) {
    const screens = document.querySelectorAll('.screen');
    screens.forEach(screen => screen.classList.remove('active'));
    
    const targetScreen = document.getElementById(screenId);
    if (targetScreen) {
        targetScreen.classList.add('active');
    }
}

function startGame() {
    showScreen('gameScreen');
    initGame();
    if (gameLoop) {
        cancelAnimationFrame(gameLoop);
    }
    gameLoop = requestAnimationFrame(update);
}

function showInstructions() {
    showScreen('instructionsScreen');
}

function showSettings() {
    showScreen('settingsScreen');
}

function showAbout() {
    showScreen('aboutScreen');
}

function backToMenu() {
    showScreen('mainMenu');
    if (gameLoop) {
        cancelAnimationFrame(gameLoop);
    }
    isPaused = false;
}

function pauseGame() {
    isPaused = !isPaused;
    if (!isPaused && gameLoop) {
        gameLoop = requestAnimationFrame(update);
    }
}

// تهيئة اللعبة
function initGame() {
    score = 0;
    level = 1;
    health = 100;
    treasureCount = 0;
    enemies = [];
    treasures = [];
    particles = [];
    
    // إنشاء اللاعب
    player = {
        x: canvas.width / 2,
        y: canvas.height / 2,
        width: PLAYER_SIZE,
        height: PLAYER_SIZE,
        speed: 4,
        direction: 0, // 0: يمين، 1: أسفل، 2: يسار، 3: أعلى
        health: 100
    };
    
    // إنشاء الكنوز
    createTreasures();
    
    // إنشاء أعداء
    createEnemies();
    
    updateHUD();
}

// إنشاء الكنوز
function createTreasures() {
    const treasureCount = 8 + level * 2;
    for (let i = 0; i < treasureCount; i++) {
        treasures.push({
            x: Math.random() * (canvas.width - TREASURE_SIZE),
            y: Math.random() * (canvas.height - TREASURE_SIZE),
            width: TREASURE_SIZE,
            height: TREASURE_SIZE,
            collected: false
        });
    }
}

// إنشاء الأعداء
function createEnemies() {
    const enemyCount = 3 + level * 2;
    for (let i = 0; i < enemyCount; i++) {
        enemies.push({
            x: Math.random() * (canvas.width - ENEMY_SIZE),
            y: Math.random() * (canvas.height - ENEMY_SIZE),
            width: ENEMY_SIZE,
            height: ENEMY_SIZE,
            speed: 1.5 + (level * 0.3),
            health: 30 + (level * 10),
            maxHealth: 30 + (level * 10),
            targetX: 0,
            targetY: 0,
            updateTarget: 0
        });
    }
}

// تحديث اللعبة
function update() {
    if (isPaused) return;
    
    // مسح الشاشة
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // تحديث اللاعب
    updatePlayer();
    
    // تحديث الأعداء
    updateEnemies();
    
    // تحديث الجزيئات
    updateParticles();
    
    // فحص التصادمات
    checkCollisions();
    
    // رسم البيئة المظلمة
    drawDarkEnvironment();
    
    // رسم الكنوز (فقط داخل نطاق المصباح)
    drawTreasures();
    
    // رسم الأعداء (فقط داخل نطاق المصباح)
    drawEnemies();
    
    // رسم الجزيئات
    drawParticles();
    
    // رسم اللاعب والمصباح
    drawPlayer();
    
    // تحديث واجهة المستخدم
    updateHUD();
    
    // الاستمرار في الحلقة
    gameLoop = requestAnimationFrame(update);
}

// رسم البيئة المظلمة مع المصباح
function drawDarkEnvironment() {
    // الظلام الكامل
    ctx.fillStyle = 'rgba(0, 0, 0, 0.95)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // إضاءة المصباح (Radial Gradient)
    const gradient = ctx.createRadialGradient(
        player.x + player.width / 2, 
        player.y + player.height / 2, 
        0,
        player.x + player.width / 2, 
        player.y + player.height / 2, 
        LANTERN_RADIUS
    );
    
    gradient.addColorStop(0, 'rgba(255, 200, 0, 0.8)');
    gradient.addColorStop(0.5, 'rgba(255, 150, 0, 0.4)');
    gradient.addColorStop(1, 'rgba(100, 50, 0, 0)');
    
    ctx.fillStyle = gradient;
    ctx.fillRect(
        player.x + player.width / 2 - LANTERN_RADIUS,
        player.y + player.height / 2 - LANTERN_RADIUS,
        LANTERN_RADIUS * 2,
        LANTERN_RADIUS * 2
    );
}

// تحديث اللاعب
function updatePlayer() {
    let moveX = 0;
    let moveY = 0;
    
    // الحركة الأفقية
    if (keys['ArrowRight'] || keys['d'] || keys['D'] || touchControls.right) {
        moveX = 1;
        player.direction = 0;
    }
    if (keys['ArrowLeft'] || keys['a'] || keys['A'] || touchControls.left) {
        moveX = -1;
        player.direction = 2;
    }
    
    // الحركة العمودية
    if (keys['ArrowDown'] || keys['s'] || keys['S'] || touchControls.down) {
        moveY = 1;
        player.direction = 1;
    }
    if (keys['ArrowUp'] || keys['w'] || keys['W'] || touchControls.up) {
        moveY = -1;
        player.direction = 3;
    }
    
    // تطبيق الحركة
    player.x += moveX * player.speed;
    player.y += moveY * player.speed;
    
    // الحد من الحركة
    if (player.x < 0) player.x = 0;
    if (player.x > canvas.width - player.width) player.x = canvas.width - player.width;
    if (player.y < 0) player.y = 0;
    if (player.y > canvas.height - player.height) player.y = canvas.height - player.height;
    
    // الهجوم
    if (keys[' '] || keys['e'] || keys['E'] || touchControls.attack) {
        if (attackCooldown <= 0) {
            performAttack();
            attackCooldown = 30; // 30 frame cooldown
        }
    }
    
    // تقليل cooldown الهجوم
    if (attackCooldown > 0) {
        attackCooldown--;
    }
}

// تنفيذ الهجوم
function performAttack() {
    isAttacking = true;
    
    // فحص الأعداء في نطاق الهجوم
    const attackRange = 60;
    enemies.forEach((enemy, index) => {
        const dx = (enemy.x + enemy.width / 2) - (player.x + player.width / 2);
        const dy = (enemy.y + enemy.height / 2) - (player.y + player.height / 2);
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < attackRange) {
            enemy.health -= 25;
            
            // إنشاء جزيئات دم
            for (let i = 0; i < 5; i++) {
                particles.push({
                    x: enemy.x + enemy.width / 2,
                    y: enemy.y + enemy.height / 2,
                    vx: (Math.random() - 0.5) * 4,
                    vy: (Math.random() - 0.5) * 4,
                    life: 20,
                    color: '#ff4444'
                });
            }
            
            if (enemy.health <= 0) {
                enemies.splice(index, 1);
                score += 50;
                
                // إنشاء جزيئات عند هزيمة العدو
                for (let i = 0; i < 10; i++) {
                    particles.push({
                        x: enemy.x + enemy.width / 2,
                        y: enemy.y + enemy.height / 2,
                        vx: (Math.random() - 0.5) * 6,
                        vy: (Math.random() - 0.5) * 6,
                        life: 30,
                        color: '#ffaa00'
                    });
                }
            }
        }
    });
    
    setTimeout(() => {
        isAttacking = false;
    }, 200);
}

// تحديث الأعداء
function updateEnemies() {
    enemies.forEach(enemy => {
        // تحديث الهدف كل 60 frame
        enemy.updateTarget--;
        if (enemy.updateTarget <= 0) {
            enemy.targetX = Math.random() * canvas.width;
            enemy.targetY = Math.random() * canvas.height;
            enemy.updateTarget = 60;
        }
        
        // الحركة نحو الهدف
        const dx = enemy.targetX - (enemy.x + enemy.width / 2);
        const dy = enemy.targetY - (enemy.y + enemy.height / 2);
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance > 0) {
            enemy.x += (dx / distance) * enemy.speed;
            enemy.y += (dy / distance) * enemy.speed;
        }
        
        // الحد من الحركة
        if (enemy.x < 0) enemy.x = 0;
        if (enemy.x > canvas.width - enemy.width) enemy.x = canvas.width - enemy.width;
        if (enemy.y < 0) enemy.y = 0;
        if (enemy.y > canvas.height - enemy.height) enemy.y = canvas.height - enemy.height;
    });
}

// رسم اللاعب (شخصية سعودية بكسل آرت)
function drawPlayer() {
    const x = player.x;
    const y = player.y;
    const size = player.width;
    
    // الجسم (بني)
    ctx.fillStyle = '#8B4513';
    ctx.fillRect(x + 8, y + 12, 16, 16);
    
    // الرأس (بني فاتح)
    ctx.fillStyle = '#D2691E';
    ctx.fillRect(x + 10, y + 2, 12, 10);
    
    // الغترة (بيضاء)
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(x + 6, y - 2, 20, 6);
    
    // العيون
    ctx.fillStyle = '#000';
    ctx.fillRect(x + 11, y + 4, 2, 2);
    ctx.fillRect(x + 19, y + 4, 2, 2);
    
    // السيف (إذا كان يهاجم)
    if (isAttacking) {
        ctx.strokeStyle = '#FFD700';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(x + 24, y + 8);
        ctx.lineTo(x + 40, y + 8);
        ctx.stroke();
    }
}

// رسم الأعداء
function drawEnemies() {
    enemies.forEach(enemy => {
        // فحص إذا كان العدو داخل نطاق المصباح
        const dx = (enemy.x + enemy.width / 2) - (player.x + player.width / 2);
        const dy = (enemy.y + enemy.height / 2) - (player.y + player.height / 2);
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < LANTERN_RADIUS) {
            // الجسم (أحمر)
            ctx.fillStyle = '#FF4444';
            ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height);
            
            // العيون (أبيض)
            ctx.fillStyle = '#FFF';
            ctx.fillRect(enemy.x + 4, enemy.y + 4, 3, 3);
            ctx.fillRect(enemy.x + enemy.width - 7, enemy.y + 4, 3, 3);
            
            // شريط الصحة
            const healthBarWidth = enemy.width;
            const healthPercent = enemy.health / enemy.maxHealth;
            
            ctx.fillStyle = '#333';
            ctx.fillRect(enemy.x, enemy.y - 8, healthBarWidth, 4);
            
            ctx.fillStyle = healthPercent > 0.5 ? '#00FF00' : '#FF6600';
            ctx.fillRect(enemy.x, enemy.y - 8, healthBarWidth * healthPercent, 4);
        }
    });
}

// رسم الكنوز
function drawTreasures() {
    treasures.forEach((treasure, index) => {
        if (!treasure.collected) {
            // فحص إذا كان الكنز داخل نطاق المصباح
            const dx = (treasure.x + treasure.width / 2) - (player.x + player.width / 2);
            const dy = (treasure.y + treasure.height / 2) - (player.y + player.height / 2);
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < LANTERN_RADIUS) {
                // الكنز (ذهبي)
                ctx.fillStyle = '#FFD700';
                ctx.fillRect(treasure.x, treasure.y, treasure.width, treasure.height);
                
                // توهج
                const glow = Math.sin(Date.now() / 200) * 2 + 3;
                ctx.strokeStyle = 'rgba(255, 215, 0, 0.5)';
                ctx.lineWidth = 2;
                ctx.strokeRect(treasure.x - glow, treasure.y - glow, treasure.width + glow * 2, treasure.height + glow * 2);
            }
        }
    });
}

// تحديث الجزيئات
function updateParticles() {
    particles = particles.filter(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.1; // الجاذبية
        p.life--;
        return p.life > 0;
    });
}

// رسم الجزيئات
function drawParticles() {
    particles.forEach(p => {
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.life / 30;
        ctx.fillRect(p.x, p.y, 3, 3);
        ctx.globalAlpha = 1;
    });
}

// فحص التصادمات
function checkCollisions() {
    // التصادم مع الأعداء
    enemies.forEach((enemy, index) => {
        if (checkCollision(player, enemy)) {
            health -= 5;
            if (health <= 0) {
                health = 0;
                gameOver();
            }
        }
    });
    
    // جمع الكنوز
    treasures.forEach((treasure, index) => {
        if (!treasure.collected && checkCollision(player, treasure)) {
            treasure.collected = true;
            treasureCount++;
            score += 100;
            
            // إنشاء جزيئات عند جمع كنز
            for (let i = 0; i < 8; i++) {
                particles.push({
                    x: treasure.x + treasure.width / 2,
                    y: treasure.y + treasure.height / 2,
                    vx: (Math.random() - 0.5) * 5,
                    vy: (Math.random() - 0.5) * 5 - 2,
                    life: 25,
                    color: '#FFD700'
                });
            }
        }
    });
    
    // الانتقال للمستوى التالي
    if (enemies.length === 0) {
        level++;
        createEnemies();
        createTreasures();
    }
}

// فحص التصادم بين كائنين
function checkCollision(obj1, obj2) {
    return obj1.x < obj2.x + obj2.width &&
           obj1.x + obj1.width > obj2.x &&
           obj1.y < obj2.y + obj2.height &&
           obj1.y + obj1.height > obj2.y;
}

// تحديث واجهة المستخدم
function updateHUD() {
    const scoreElement = document.getElementById('score');
    const levelElement = document.getElementById('level');
    const treasureElement = document.getElementById('treasureCount');
    const healthFill = document.getElementById('healthFill');
    
    if (scoreElement) scoreElement.textContent = score;
    if (levelElement) levelElement.textContent = level;
    if (treasureElement) treasureElement.textContent = treasureCount;
    if (healthFill) healthFill.style.width = health + '%';
}

// نهاية اللعبة
function gameOver() {
    cancelAnimationFrame(gameLoop);
    
    // رسم شاشة نهاية اللعبة
    ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 48px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('انتهت اللعبة!', canvas.width / 2, canvas.height / 2 - 50);
    
    ctx.font = '32px Arial';
    ctx.fillText('الكنوز المجمعة: ' + treasureCount, canvas.width / 2, canvas.height / 2 + 20);
    ctx.fillText('النقاط النهائية: ' + score, canvas.width / 2, canvas.height / 2 + 70);
    ctx.fillText('المستوى: ' + level, canvas.width / 2, canvas.height / 2 + 120);
    
    ctx.font = '24px Arial';
    ctx.fillText('اضغط على زر القائمة للعودة', canvas.width / 2, canvas.height / 2 + 180);
}
