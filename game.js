// متغيرات اللعبة
let canvas, ctx;
let player, enemies = [], items = [];
let score = 0, level = 1, health = 100;
let keys = {};
let gameLoop;
let isPaused = false;

// إعدادات اللعبة
let settings = {
    volume: 70,
    difficulty: 'medium',
    fullscreen: false,
    sound: true
};

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
    
    const fullscreenCheck = document.getElementById('fullscreenCheck');
    if (fullscreenCheck) {
        fullscreenCheck.addEventListener('change', function() {
            settings.fullscreen = this.checked;
            if (this.checked) {
                enterFullscreen();
            } else {
                exitFullscreen();
            }
        });
    }
    
    const soundCheck = document.getElementById('soundCheck');
    if (soundCheck) {
        soundCheck.addEventListener('change', function() {
            settings.sound = this.checked;
        });
    }
}

// الدخول إلى وضع ملء الشاشة
function enterFullscreen() {
    const elem = document.documentElement;
    if (elem.requestFullscreen) {
        elem.requestFullscreen();
    } else if (elem.webkitRequestFullscreen) {
        elem.webkitRequestFullscreen();
    } else if (elem.msRequestFullscreen) {
        elem.msRequestFullscreen();
    }
}

// الخروج من وضع ملء الشاشة
function exitFullscreen() {
    if (document.exitFullscreen) {
        document.exitFullscreen();
    } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
    } else if (document.msExitFullscreen) {
        document.msExitFullscreen();
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
    enemies = [];
    items = [];
    
    // إنشاء اللاعب
    player = {
        x: canvas.width / 2,
        y: canvas.height - 100,
        width: 40,
        height: 60,
        speed: 5,
        color: '#4CAF50',
        velocityY: 0,
        jumping: false
    };
    
    // إنشاء أعداء
    createEnemies();
    
    // إنشاء عناصر
    createItems();
    
    updateHUD();
}

// إنشاء الأعداء
function createEnemies() {
    const enemyCount = 3 + level;
    for (let i = 0; i < enemyCount; i++) {
        enemies.push({
            x: Math.random() * (canvas.width - 40),
            y: Math.random() * (canvas.height / 2),
            width: 35,
            height: 35,
            speed: 2 + (level * 0.5),
            color: '#f44336',
            direction: Math.random() > 0.5 ? 1 : -1
        });
    }
}

// إنشاء العناصر القابلة للجمع
function createItems() {
    const itemCount = 5;
    for (let i = 0; i < itemCount; i++) {
        items.push({
            x: Math.random() * (canvas.width - 20),
            y: Math.random() * (canvas.height - 100),
            width: 20,
            height: 20,
            color: '#FFD700',
            collected: false
        });
    }
}

// تحديث اللعبة
function update() {
    if (isPaused) return;
    
    // مسح الشاشة
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // رسم الخلفية
    drawBackground();
    
    // تحديث اللاعب
    updatePlayer();
    
    // تحديث الأعداء
    updateEnemies();
    
    // تحديث العناصر
    updateItems();
    
    // رسم اللاعب
    drawPlayer();
    
    // رسم الأعداء
    drawEnemies();
    
    // رسم العناصر
    drawItems();
    
    // فحص التصادمات
    checkCollisions();
    
    // تحديث واجهة المستخدم
    updateHUD();
    
    // الاستمرار في الحلقة
    gameLoop = requestAnimationFrame(update);
}

// رسم الخلفية
function drawBackground() {
    // السماء
    const skyGradient = ctx.createLinearGradient(0, 0, 0, canvas.height / 2);
    skyGradient.addColorStop(0, '#87CEEB');
    skyGradient.addColorStop(1, '#F4A460');
    ctx.fillStyle = skyGradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height / 2);
    
    // الأرض
    const groundGradient = ctx.createLinearGradient(0, canvas.height / 2, 0, canvas.height);
    groundGradient.addColorStop(0, '#F4A460');
    groundGradient.addColorStop(1, '#DAA520');
    ctx.fillStyle = groundGradient;
    ctx.fillRect(0, canvas.height / 2, canvas.width, canvas.height / 2);
    
    // رسم الشمس
    ctx.fillStyle = '#FDB813';
    ctx.beginPath();
    ctx.arc(canvas.width - 100, 80, 40, 0, Math.PI * 2);
    ctx.fill();
    
    // رسم الكثبان الرملية
    ctx.fillStyle = 'rgba(218, 165, 32, 0.3)';
    ctx.beginPath();
    ctx.moveTo(0, canvas.height / 2 + 50);
    ctx.quadraticCurveTo(canvas.width / 4, canvas.height / 2, canvas.width / 2, canvas.height / 2 + 50);
    ctx.quadraticCurveTo(3 * canvas.width / 4, canvas.height / 2 + 100, canvas.width, canvas.height / 2 + 50);
    ctx.lineTo(canvas.width, canvas.height);
    ctx.lineTo(0, canvas.height);
    ctx.fill();
}

// تحديث اللاعب
function updatePlayer() {
    // الحركة الأفقية
    if (keys['ArrowRight'] || keys['d'] || keys['D']) {
        player.x += player.speed;
    }
    if (keys['ArrowLeft'] || keys['a'] || keys['A']) {
        player.x -= player.speed;
    }
    
    // القفز
    if ((keys[' '] || keys['ArrowUp'] || keys['w'] || keys['W']) && !player.jumping) {
        player.velocityY = -15;
        player.jumping = true;
    }
    
    // الجاذبية
    player.velocityY += 0.8;
    player.y += player.velocityY;
    
    // الحد من الحركة
    if (player.x < 0) player.x = 0;
    if (player.x > canvas.width - player.width) player.x = canvas.width - player.width;
    
    // الهبوط على الأرض
    if (player.y > canvas.height - player.height - 50) {
        player.y = canvas.height - player.height - 50;
        player.velocityY = 0;
        player.jumping = false;
    }
}

// رسم اللاعب
function drawPlayer() {
    // الجسم
    ctx.fillStyle = player.color;
    ctx.fillRect(player.x, player.y, player.width, player.height);
    
    // الرأس
    ctx.fillStyle = '#FFA726';
    ctx.beginPath();
    ctx.arc(player.x + player.width / 2, player.y - 10, 15, 0, Math.PI * 2);
    ctx.fill();
    
    // العيون
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(player.x + player.width / 2 - 5, player.y - 12, 3, 0, Math.PI * 2);
    ctx.arc(player.x + player.width / 2 + 5, player.y - 12, 3, 0, Math.PI * 2);
    ctx.fill();
}

// تحديث الأعداء
function updateEnemies() {
    enemies.forEach(enemy => {
        enemy.x += enemy.speed * enemy.direction;
        
        // عكس الاتجاه عند الحواف
        if (enemy.x <= 0 || enemy.x >= canvas.width - enemy.width) {
            enemy.direction *= -1;
        }
    });
}

// رسم الأعداء
function drawEnemies() {
    enemies.forEach(enemy => {
        ctx.fillStyle = enemy.color;
        ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height);
        
        // العيون
        ctx.fillStyle = '#FFF';
        ctx.beginPath();
        ctx.arc(enemy.x + 10, enemy.y + 10, 4, 0, Math.PI * 2);
        ctx.arc(enemy.x + 25, enemy.y + 10, 4, 0, Math.PI * 2);
        ctx.fill();
    });
}

// تحديث العناصر
function updateItems() {
    // تأثير التوهج
    const time = Date.now() / 1000;
    items.forEach(item => {
        if (!item.collected) {
            item.scale = 1 + Math.sin(time * 3) * 0.2;
        }
    });
}

// رسم العناصر
function drawItems() {
    items.forEach(item => {
        if (!item.collected) {
            ctx.save();
            ctx.translate(item.x + item.width / 2, item.y + item.height / 2);
            ctx.scale(item.scale || 1, item.scale || 1);
            
            ctx.fillStyle = item.color;
            ctx.beginPath();
            ctx.arc(0, 0, item.width / 2, 0, Math.PI * 2);
            ctx.fill();
            
            // توهج
            ctx.strokeStyle = 'rgba(255, 215, 0, 0.5)';
            ctx.lineWidth = 3;
            ctx.stroke();
            
            ctx.restore();
        }
    });
}

// فحص التصادمات
function checkCollisions() {
    // التصادم مع الأعداء
    enemies.forEach((enemy, index) => {
        if (checkCollision(player, enemy)) {
            health -= 10;
            if (health <= 0) {
                health = 0;
                gameOver();
            }
            // إزالة العدو بعد التصادم
            enemies.splice(index, 1);
        }
    });
    
    // جمع العناصر
    items.forEach((item, index) => {
        if (!item.collected && checkCollision(player, item)) {
            item.collected = true;
            score += 10;
            
            // إنشاء عنصر جديد
            items[index] = {
                x: Math.random() * (canvas.width - 20),
                y: Math.random() * (canvas.height - 100),
                width: 20,
                height: 20,
                color: '#FFD700',
                collected: false
            };
        }
    });
    
    // الانتقال للمستوى التالي
    if (enemies.length === 0) {
        level++;
        createEnemies();
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
    const healthFill = document.getElementById('healthFill');
    
    if (scoreElement) scoreElement.textContent = score;
    if (levelElement) levelElement.textContent = level;
    if (healthFill) healthFill.style.width = health + '%';
}

// نهاية اللعبة
function gameOver() {
    cancelAnimationFrame(gameLoop);
    
    // رسم شاشة نهاية اللعبة
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.fillStyle = '#FFF';
    ctx.font = 'bold 48px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('انتهت اللعبة!', canvas.width / 2, canvas.height / 2 - 50);
    
    ctx.font = '32px Arial';
    ctx.fillText('النقاط النهائية: ' + score, canvas.width / 2, canvas.height / 2 + 20);
    ctx.fillText('المستوى: ' + level, canvas.width / 2, canvas.height / 2 + 70);
    
    ctx.font = '24px Arial';
    ctx.fillText('اضغط على زر القائمة للعودة', canvas.width / 2, canvas.height / 2 + 130);
}
