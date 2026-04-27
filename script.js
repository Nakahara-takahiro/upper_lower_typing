// --- Audio System ---
const AudioContext = window.AudioContext || window.webkitAudioContext;
let audioCtx;

function initAudio() {
    if (!audioCtx) {
        audioCtx = new AudioContext();
    }
}

function playTone(freq, type, duration, vol = 0.1) {
    if (!audioCtx) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
    
    gain.gain.setValueAtTime(vol, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);
    
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    
    osc.start();
    osc.stop(audioCtx.currentTime + duration);
}

function playCorrectSound(combo) {
    // Pitch goes up with combo, capped
    const baseFreq = 440;
    const freq = baseFreq * Math.pow(1.05, Math.min(combo, 20));
    playTone(freq, 'sine', 0.1, 0.15);
}

function playMissSound() {
    playTone(150, 'sawtooth', 0.2, 0.2);
}

function playLevelUpSound() {
    if (!audioCtx) return;
    const now = audioCtx.currentTime;
    [440, 554, 659, 880].forEach((f, i) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'square';
        osc.frequency.value = f;
        gain.gain.setValueAtTime(0.1, now + i * 0.1);
        gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.1 + 0.2);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(now + i * 0.1);
        osc.stop(now + i * 0.1 + 0.2);
    });
}

function playFanfareSound() {
    if (!audioCtx) return;
    const now = audioCtx.currentTime;
    const notes = [
        {f: 523.25, t: 0, d: 0.2}, // C5
        {f: 523.25, t: 0.2, d: 0.2}, // C5
        {f: 523.25, t: 0.4, d: 0.2}, // C5
        {f: 659.25, t: 0.6, d: 0.4}, // E5
        {f: 783.99, t: 1.0, d: 0.4}, // G5
        {f: 1046.50, t: 1.4, d: 0.8} // C6
    ];
    notes.forEach(n => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'triangle';
        osc.frequency.value = n.f;
        gain.gain.setValueAtTime(0.2, now + n.t);
        gain.gain.exponentialRampToValueAtTime(0.01, now + n.t + n.d);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(now + n.t);
        osc.stop(now + n.t + n.d);
    });
}

// --- Constants & Data ---
const KEYBOARD_LAYOUT = [
    ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
    ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
    ['ShiftLeft', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', 'ShiftRight']
];

const FINGER_MAP = {
    'Q':'f-lp', 'A':'f-lp', 'Z':'f-lp', 'ShiftLeft':'f-lp',
    'W':'f-lr', 'S':'f-lr', 'X':'f-lr',
    'E':'f-lm', 'D':'f-lm', 'C':'f-lm',
    'R':'f-li', 'T':'f-li', 'F':'f-li', 'G':'f-li', 'V':'f-li', 'B':'f-li',
    'Y':'f-ri', 'U':'f-ri', 'H':'f-ri', 'J':'f-ri', 'N':'f-ri', 'M':'f-ri',
    'I':'f-rm', 'K':'f-rm',
    'O':'f-rr', 'L':'f-rr',
    'P':'f-rp', 'ShiftRight':'f-rp'
};

const HAND_MAP = {
    'Q':'L', 'W':'L', 'E':'L', 'R':'L', 'T':'L', 'A':'L', 'S':'L', 'D':'L', 'F':'L', 'G':'L', 'Z':'L', 'X':'L', 'C':'L', 'V':'L', 'B':'L',
    'Y':'R', 'U':'R', 'I':'R', 'O':'R', 'P':'R', 'H':'R', 'J':'R', 'K':'R', 'L':'R', 'N':'R', 'M':'R'
};

const ALPHABETS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

// --- Game State ---
let gameState = {
    mode: 'lower', // 'lower' or 'upper'
    isPlaying: false,
    score: 0,
    combo: 0,
    maxCombo: 0,
    level: 1,
    misses: 0, // misses in current level
    timeLeft: 60,
    timerId: null,
    currentWord: "",
    currentIndex: 0,
    highScore: 0,
    shiftPressed: false
};

// --- DOM Elements ---
const screens = {
    title: document.getElementById('title-screen'),
    play: document.getElementById('play-screen'),
    result: document.getElementById('result-screen')
};

const UI = {
    timeDisplay: document.getElementById('time-display'),
    scoreDisplay: document.getElementById('score-display'),
    hiScoreDisplay: document.getElementById('hi-score-display'),
    levelDisplay: document.getElementById('level-display'),
    comboContainer: document.getElementById('combo-container'),
    comboDisplay: document.getElementById('combo-display'),
    wordDisplay: document.getElementById('word-display'),
    keyboard: document.getElementById('keyboard'),
    uiEffectsLayer: document.getElementById('ui-effects-layer')
};

// --- Initialization ---
function init() {
    checkMobile();
    loadHighScore();
    generateKeyboard();
    setupEventListeners();
}

function checkMobile() {
    if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
        document.getElementById('mobile-warning').classList.remove('hidden');
    }
}

function loadHighScore() {
    const saved = localStorage.getItem('alphabetMasterHighScore');
    if (saved) {
        gameState.highScore = parseInt(saved, 10);
    }
    UI.hiScoreDisplay.textContent = gameState.highScore;
}

function saveHighScore() {
    if (gameState.score > gameState.highScore) {
        gameState.highScore = gameState.score;
        localStorage.setItem('alphabetMasterHighScore', gameState.highScore);
        return true; // New record
    }
    return false;
}

function generateKeyboard() {
    UI.keyboard.innerHTML = '';
    KEYBOARD_LAYOUT.forEach(row => {
        const rowEl = document.createElement('div');
        rowEl.className = 'keyboard-row';
        row.forEach(key => {
            const keyEl = document.createElement('div');
            keyEl.className = 'key';
            keyEl.id = 'key-' + key;
            if (key.startsWith('Shift')) {
                keyEl.classList.add('special');
                keyEl.textContent = 'Shift';
            } else {
                keyEl.textContent = key;
            }
            rowEl.appendChild(keyEl);
        });
        UI.keyboard.appendChild(rowEl);
    });
}

function setupEventListeners() {
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
}

function switchScreen(screenName) {
    Object.values(screens).forEach(s => s.classList.add('hidden'));
    screens[screenName].classList.remove('hidden');
}

// --- Game Logic ---
function startGame(mode) {
    initAudio();
    gameState.mode = mode;
    gameState.isPlaying = true;
    gameState.score = 0;
    gameState.combo = 0;
    gameState.maxCombo = 0;
    gameState.level = 1;
    gameState.misses = 0;
    gameState.timeLeft = 60;
    
    updateScoreUI();
    UI.timeDisplay.textContent = gameState.timeLeft;
    UI.timeDisplay.classList.remove('time-warning');
    UI.comboContainer.classList.add('hidden');
    UI.levelDisplay.textContent = 'LEVEL ' + gameState.level;
    
    switchScreen('play');
    nextWord();
    
    gameState.timerId = setInterval(gameTick, 1000);
}

function gameTick() {
    gameState.timeLeft--;
    UI.timeDisplay.textContent = gameState.timeLeft;
    
    if (gameState.timeLeft <= 10) {
        UI.timeDisplay.classList.add('time-warning');
    }
    
    if (gameState.timeLeft <= 0) {
        endGame();
    }
}

function endGame() {
    gameState.isPlaying = false;
    clearInterval(gameState.timerId);
    
    const isNewRecord = saveHighScore();
    
    document.getElementById('result-score').textContent = gameState.score;
    document.getElementById('result-max-combo').textContent = gameState.maxCombo;
    document.getElementById('result-hi-score').textContent = gameState.highScore;
    
    const badge = document.getElementById('new-record-badge');
    if (isNewRecord && gameState.score > 0) {
        badge.classList.remove('hidden');
        playFanfareSound();
        triggerConfetti();
    } else {
        badge.classList.add('hidden');
    }
    
    switchScreen('result');
}

function restartGame() {
    startGame(gameState.mode);
}

function goTitle() {
    switchScreen('title');
}

function nextWord() {
    let length = Math.min(gameState.level, 5); // Max 5 letters
    let word = "";
    for(let i=0; i<length; i++) {
        word += ALPHABETS[Math.floor(Math.random() * ALPHABETS.length)];
    }
    
    if (gameState.mode === 'lower') {
        word = word.toLowerCase();
    }
    
    gameState.currentWord = word;
    gameState.currentIndex = 0;
    renderWord();
    updateGuides();
}

function renderWord() {
    UI.wordDisplay.innerHTML = '';
    for(let i=0; i<gameState.currentWord.length; i++) {
        const span = document.createElement('span');
        span.className = 'letter';
        span.textContent = gameState.currentWord[i];
        
        if (i < gameState.currentIndex) {
            span.classList.add('typed');
        } else if (i === gameState.currentIndex) {
            span.classList.add('current');
        } else if (i === gameState.currentIndex + 1) {
            span.classList.add('next-1');
        } else if (i === gameState.currentIndex + 2) {
            span.classList.add('next-2');
        }
        
        UI.wordDisplay.appendChild(span);
    }
}

// --- Input Handling ---
function handleKeyDown(e) {
    if (e.key === 'Shift') gameState.shiftPressed = true;
    
    if (!gameState.isPlaying) return;
    
    // Ignore meta keys
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    
    // Visual press effect
    let keyId = 'key-' + e.key.toUpperCase();
    if (e.code.startsWith('Shift')) keyId = 'key-' + e.code;
    const keyEl = document.getElementById(keyId);
    if (keyEl) keyEl.classList.add('pressed');

    // Only process letters
    if (e.key.length === 1 && e.key.match(/[a-zA-Z]/)) {
        checkInput(e.key);
    }
}

function handleKeyUp(e) {
    if (e.key === 'Shift') gameState.shiftPressed = false;
    
    // Visual unpress
    let keyId = 'key-' + e.key.toUpperCase();
    if (e.code.startsWith('Shift')) keyId = 'key-' + e.code;
    const keyEl = document.getElementById(keyId);
    if (keyEl) keyEl.classList.remove('pressed');
}

function checkInput(inputChar) {
    const targetChar = gameState.currentWord[gameState.currentIndex];
    const isCorrectChar = inputChar.toLowerCase() === targetChar.toLowerCase();
    let isCorrectCase = true;
    
    if (gameState.mode === 'upper') {
        // Upper mode requires exactly uppercase (Shift pressed implicitly tested by key value being upper)
        // Actually, js e.key gives 'A' if shift+a is pressed.
        isCorrectCase = (inputChar === targetChar);
    }

    if (isCorrectChar && isCorrectCase) {
        // Correct
        playCorrectSound(gameState.combo);
        gameState.combo++;
        if (gameState.combo > gameState.maxCombo) gameState.maxCombo = gameState.combo;
        
        gameState.score += 100 + (gameState.combo * 10);
        gameState.misses = 0; // Reset misses on correct
        
        showComboPopup(gameState.combo);
        triggerCorrectParticles();
        
        gameState.currentIndex++;
        if (gameState.currentIndex >= gameState.currentWord.length) {
            checkLevelUp();
            nextWord();
        } else {
            renderWord();
            updateGuides();
        }
        updateScoreUI();
    } else {
        // Miss
        playMissSound();
        gameState.misses++;
        
        // Shake letter
        const currentLetterSpan = UI.wordDisplay.children[gameState.currentIndex];
        if (currentLetterSpan) {
            currentLetterSpan.classList.remove('error');
            void currentLetterSpan.offsetWidth; // trigger reflow
            currentLetterSpan.classList.add('error');
        }
        
        // Screen effects
        document.getElementById('play-screen').classList.add('screen-shake');
        setTimeout(() => document.getElementById('play-screen').classList.remove('screen-shake'), 400);
        
        const flash = document.createElement('div');
        flash.className = 'screen-flash-red';
        document.getElementById('play-screen').appendChild(flash);
        setTimeout(() => flash.remove(), 300);
        
        // Penalty logic
        if (gameState.misses >= 3) {
            if (gameState.level > 1) {
                gameState.level--;
                gameState.combo = (gameState.level - 1) * 10; // Reset combo to baseline of that level
                UI.levelDisplay.textContent = 'LEVEL ' + gameState.level;
                // Re-generate word for new level
                nextWord();
            }
            gameState.misses = 0;
        }
        updateScoreUI();
    }
}

function checkLevelUp() {
    // Level up every 10 combos, up to level 5
    const expectedLevel = Math.min(5, Math.floor(gameState.combo / 10) + 1);
    if (expectedLevel > gameState.level) {
        gameState.level = expectedLevel;
        playLevelUpSound();
        UI.levelDisplay.textContent = 'LEVEL ' + gameState.level;
        
        const flash = document.createElement('div');
        flash.className = 'screen-flash-level';
        document.getElementById('play-screen').appendChild(flash);
        setTimeout(() => flash.remove(), 800);
        
        showFloatingText("LEVEL UP!", "center");
    }
}

function updateScoreUI() {
    UI.scoreDisplay.textContent = gameState.score;
    if (gameState.combo > 1) {
        UI.comboContainer.classList.remove('hidden');
        UI.comboDisplay.textContent = gameState.combo + ' COMBO';
        
        UI.comboDisplay.classList.remove('combo-anim');
        void UI.comboDisplay.offsetWidth; // trigger reflow
        UI.comboDisplay.classList.add('combo-anim');
    } else {
        UI.comboContainer.classList.add('hidden');
    }
}

// --- Guides & Highlights ---
function clearGuides() {
    document.querySelectorAll('.key').forEach(el => {
        el.classList.remove('active-target', 'active-shift');
    });
    document.querySelectorAll('.finger').forEach(el => {
        el.classList.remove('highlight-target', 'highlight-shift');
    });
}

function updateGuides() {
    clearGuides();
    if (!gameState.isPlaying || gameState.currentIndex >= gameState.currentWord.length) return;
    
    const targetChar = gameState.currentWord[gameState.currentIndex].toUpperCase();
    const targetKeyId = 'key-' + targetChar;
    const targetKeyEl = document.getElementById(targetKeyId);
    
    if (targetKeyEl) targetKeyEl.classList.add('active-target');
    
    const fingerId = FINGER_MAP[targetChar];
    if (fingerId) {
        const fingerEl = document.getElementById(fingerId);
        if (fingerEl) fingerEl.classList.add('highlight-target');
    }
    
    // Handle uppercase mode Shift guide
    if (gameState.mode === 'upper') {
        const hand = HAND_MAP[targetChar];
        let shiftId = '';
        let shiftFingerId = '';
        if (hand === 'L') {
            shiftId = 'key-ShiftRight';
            shiftFingerId = FINGER_MAP['ShiftRight'];
        } else if (hand === 'R') {
            shiftId = 'key-ShiftLeft';
            shiftFingerId = FINGER_MAP['ShiftLeft'];
        }
        
        if (shiftId) {
            const shiftEl = document.getElementById(shiftId);
            if (shiftEl) shiftEl.classList.add('active-shift');
            const shiftFingerEl = document.getElementById(shiftFingerId);
            if (shiftFingerEl) shiftFingerEl.classList.add('highlight-shift');
        }
    }
}

// --- Visual Effects ---
function showFloatingText(text, pos = "center") {
    const el = document.createElement('div');
    el.className = 'floating-text';
    el.textContent = text;
    
    if (pos === "center") {
        el.style.left = '50%';
        el.style.top = '40%';
        el.style.transform = 'translate(-50%, -50%)';
    }
    
    UI.uiEffectsLayer.appendChild(el);
    setTimeout(() => el.remove(), 1000);
}

function showComboPopup(combo) {
    if (combo % 5 === 0) {
        showFloatingText(`x${combo} COMBO!`);
    }
}

// Particles Canvas
const pCanvas = document.getElementById('particles-canvas');
const pCtx = pCanvas.getContext('2d');
let particles = [];

function resizeCanvas() {
    pCanvas.width = window.innerWidth;
    pCanvas.height = window.innerHeight;
    const cCanvas = document.getElementById('confetti-canvas');
    cCanvas.width = window.innerWidth;
    cCanvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

function triggerCorrectParticles() {
    // Get target character position approximation
    const rect = document.getElementById('play-center').getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2 + 50;
    
    for(let i=0; i<15; i++) {
        particles.push({
            x: x,
            y: y,
            vx: (Math.random() - 0.5) * 10,
            vy: (Math.random() - 0.5) * 10 - 2,
            life: 1,
            color: `hsl(${Math.random()*60 + 150}, 100%, 60%)` // Cyan-ish
        });
    }
}

function animateParticles() {
    pCtx.clearRect(0, 0, pCanvas.width, pCanvas.height);
    for(let i=particles.length-1; i>=0; i--) {
        let p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 0.02;
        p.vy += 0.2; // gravity
        
        if (p.life <= 0) {
            particles.splice(i, 1);
            continue;
        }
        
        pCtx.globalAlpha = p.life;
        pCtx.fillStyle = p.color;
        pCtx.beginPath();
        pCtx.arc(p.x, p.y, 4, 0, Math.PI*2);
        pCtx.fill();
    }
    pCtx.globalAlpha = 1;
    requestAnimationFrame(animateParticles);
}
animateParticles();

// Confetti Canvas
const cCanvas = document.getElementById('confetti-canvas');
const cCtx = cCanvas.getContext('2d');
let confetti = [];
let confettiActive = false;

function triggerConfetti() {
    confettiActive = true;
    confetti = [];
    for(let i=0; i<100; i++) {
        confetti.push({
            x: Math.random() * cCanvas.width,
            y: -10 - Math.random() * 50,
            vx: (Math.random() - 0.5) * 2,
            vy: Math.random() * 3 + 2,
            size: Math.random() * 10 + 5,
            color: `hsl(${Math.random()*360}, 100%, 60%)`,
            rot: Math.random() * Math.PI*2,
            rotSpeed: (Math.random() - 0.5) * 0.2
        });
    }
}

function animateConfetti() {
    cCtx.clearRect(0, 0, cCanvas.width, cCanvas.height);
    if (!confettiActive) {
        requestAnimationFrame(animateConfetti);
        return;
    }
    
    let activeCount = 0;
    for(let i=0; i<confetti.length; i++) {
        let c = confetti[i];
        c.x += c.vx;
        c.y += c.vy;
        c.rot += c.rotSpeed;
        
        if (c.y < cCanvas.height) {
            activeCount++;
            cCtx.save();
            cCtx.translate(c.x, c.y);
            cCtx.rotate(c.rot);
            cCtx.fillStyle = c.color;
            cCtx.fillRect(-c.size/2, -c.size/2, c.size, c.size);
            cCtx.restore();
        }
    }
    if (activeCount === 0) confettiActive = false;
    requestAnimationFrame(animateConfetti);
}
animateConfetti();

// Init on load
window.onload = init;
