const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const startScreen = document.getElementById('start-screen');
const storyScreen = document.getElementById('story-screen');
const hud = document.getElementById('hud');
const scoreDisplay = document.getElementById('hud-score');
const touchControls = document.getElementById('touch-controls');
const trackNameEl = document.getElementById('track-name');
const muteBtn = document.getElementById('mute-btn');

let frameCount = 0;

/* ======================================================================
   RESPONSIVIDADE (MOBILE / DESKTOP)
====================================================================== */
const viewportWrap = document.getElementById('viewport-wrap');
const gameContainer = document.getElementById('game-container');

function resizeGame() {
    const scale = Math.min(
        viewportWrap.clientWidth / 800,
        viewportWrap.clientHeight / 600
    );
    gameContainer.style.transform = `scale(${scale})`;
}
window.addEventListener('resize', resizeGame);
window.addEventListener('orientationchange', () => setTimeout(resizeGame, 250));
resizeGame();

const isTouchDevice = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
if (isTouchDevice) {
    document.body.classList.add('touch-device');
}
function updateTouchControlsVisibility() {
    touchControls.style.display = (isTouchDevice && currentState === GAME_STATE.PLAYING) ? 'flex' : 'none';
}

/* ======================================================================
   ÁUDIO — MÚSICA (independente dos efeitos sonoros)
====================================================================== */
const introMusic = new Audio('assets/human-factor-intro.mp3');
introMusic.loop = true;
introMusic.volume = 0.5;

const bgMusic = new Audio('assets/segredos-loss.mp3');
bgMusic.loop = true;
bgMusic.volume = 0.4;

let musicMuted = false;
function applyMusicMute() {
    introMusic.muted = musicMuted;
    bgMusic.muted = musicMuted;
    muteBtn.textContent = musicMuted ? '🔇' : '🔊';
}
muteBtn.addEventListener('click', () => {
    musicMuted = !musicMuted;
    applyMusicMute();
});

function setTrackName(name) { trackNameEl.textContent = name; }

function playIntroMusic() {
    bgMusic.pause();
    introMusic.currentTime = 0;
    introMusic.play().catch(() => {});
    setTrackName('Human Factor Intro');
}
function playGameMusic() {
    introMusic.pause();
    bgMusic.currentTime = 0;
    bgMusic.play().catch(() => {});
    setTrackName('Segredos - Loss');
}

// Autoplay costuma ser bloqueado até um gesto do usuário — tenta assim que possível
// e garante na primeira interação.
function unlockAudioOnce() {
    if (currentState === GAME_STATE.MENU || currentState === GAME_STATE.STORY) {
        introMusic.play().catch(() => {});
    }
    ensureAudioCtx();
    window.removeEventListener('pointerdown', unlockAudioOnce);
    window.removeEventListener('keydown', unlockAudioOnce);
}
window.addEventListener('pointerdown', unlockAudioOnce);
window.addEventListener('keydown', unlockAudioOnce);

/* ======================================================================
   ÁUDIO — EFEITOS SONOROS (Web Audio sintetizado, canal independente)
====================================================================== */
let audioCtx = null;
let sfxGain = null;
function ensureAudioCtx() {
    if (audioCtx) return;
    try {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        sfxGain = audioCtx.createGain();
        sfxGain.gain.value = 0.55;
        sfxGain.connect(audioCtx.destination);
    } catch (e) { /* sem suporte, silencioso */ }
}

function sfxOsc(type, freqStart, freqEnd, duration, gainStart = 0.5, delay = 0) {
    if (!audioCtx) return;
    const t0 = audioCtx.currentTime + delay;
    const osc = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freqStart, t0);
    osc.frequency.exponentialRampToValueAtTime(Math.max(freqEnd, 1), t0 + duration);
    g.gain.setValueAtTime(gainStart, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + duration);
    osc.connect(g); g.connect(sfxGain);
    osc.start(t0); osc.stop(t0 + duration + 0.02);
}

function sfxNoise(duration, gainStart = 0.4, filterFreq = 2000) {
    if (!audioCtx) return;
    const bufferSize = audioCtx.sampleRate * duration;
    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    const src = audioCtx.createBufferSource();
    src.buffer = buffer;
    const filter = audioCtx.createBiquadFilter();
    filter.type = 'highpass'; filter.frequency.value = filterFreq;
    const g = audioCtx.createGain();
    g.gain.setValueAtTime(gainStart, audioCtx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
    src.connect(filter); filter.connect(g); g.connect(sfxGain);
    src.start();
}

function playJumpSfx()   { sfxOsc('square', 260, 520, 0.18, 0.35); }
function playShootSfx()  { sfxOsc('sawtooth', 900, 180, 0.12, 0.3); }
function playSonicSfx()  { sfxOsc('sine', 120, 640, 0.5, 0.45); sfxNoise(0.4, 0.15, 400); }
function playCollectSfx(){ sfxOsc('triangle', 500, 1100, 0.18, 0.35); }
function playBaquetasSfx(){ sfxOsc('triangle', 400, 900, 0.14, 0.4); sfxOsc('triangle', 700, 1300, 0.18, 0.35, 0.08); }
function playEnemyHitSfx(){ sfxNoise(0.15, 0.3, 800); }
function playBossHitSfx(){ sfxOsc('sawtooth', 200, 60, 0.15, 0.4); }
function playPlayerHurtSfx(){ sfxOsc('sawtooth', 300, 90, 0.25, 0.4); }
function playVictorySfx(){ [523,659,784,1047].forEach((f,i)=>sfxOsc('triangle', f, f, 0.25, 0.3, i*0.14)); }
function playGameOverSfx(){ sfxOsc('sawtooth', 220, 55, 0.9, 0.35); }

// Tic-tac do metrônomo vilão — toca em loop próprio, independente da trilha
let metronomeIntervalId = null;
function playMetronomeTick(isTock) {
    sfxOsc(isTock ? 'square' : 'square', isTock ? 1500 : 2200, isTock ? 1400 : 2100, 0.045, 0.25);
}
function startMetronomeLoop() {
    if (metronomeIntervalId) return;
    let tock = false;
    metronomeIntervalId = setInterval(() => {
        if (currentState === GAME_STATE.PLAYING && bossFightActive && levelData.boss.active) {
            playMetronomeTick(tock);
            tock = !tock;
        }
    }, 480);
}
function stopMetronomeLoop() {
    if (metronomeIntervalId) { clearInterval(metronomeIntervalId); metronomeIntervalId = null; }
}

/* ======================================================================
   CARREGAMENTO DE IMAGENS E VÍDEOS
====================================================================== */
const bgImage = new Image();
bgImage.src = 'assets/mr-rock.jpg';

const robustusSheet = new Image();
robustusSheet.src = 'assets/sheet-robustus.png';

const bossSheet = new Image();
bossSheet.src = 'assets/metronomo-executor.png';

const marshallImg = new Image();
marshallImg.src = 'assets/marshall.png';
let marshallAspect = 799 / 774;

const baquetasImg = new Image();
baquetasImg.src = 'assets/baquetas.png';
let baquetasAspect = 334 / 564;

const quantSheet = new Image();
quantSheet.src = 'assets/quantizado.png';
const QUANT_FRAME_W = 125, QUANT_FRAME_H = 166;
// índices no sheet: 0,1,2 = idle (ciclo sutil) | 3 = perseguindo | 4 = atingido

// Teddy de fundo no palco (chroma-key já removido, .webm com alpha)
const angryTeddyVideo = document.createElement('video');
angryTeddyVideo.src = 'assets/angry_teddy.webm';
angryTeddyVideo.loop = true; angryTeddyVideo.muted = true; angryTeddyVideo.playsInline = true;
angryTeddyVideo.autoplay = true;
angryTeddyVideo.style.cssText = 'position:absolute;width:1px;height:1px;opacity:0;pointer-events:none;';
document.body.appendChild(angryTeddyVideo);

const happyTeddyVideo = document.createElement('video');
happyTeddyVideo.src = 'assets/happy_teddy.webm';
happyTeddyVideo.loop = true; happyTeddyVideo.muted = true; happyTeddyVideo.playsInline = true;
happyTeddyVideo.style.cssText = 'position:absolute;width:1px;height:1px;opacity:0;pointer-events:none;';
document.body.appendChild(happyTeddyVideo);

let activeTeddyVideo = angryTeddyVideo;
const teddyWorld = { x: 7060, y: 560, h: 170 };

function trySafePlay(video) { video.play().catch(() => {}); }
trySafePlay(angryTeddyVideo);

const spriteConfig = {
    cols: 5, rows: 3,
    frameW: 0, frameH: 0,
    currentFrameX: 0, currentFrameY: 0,
    animTimer: 0, animSpeed: 6
};
robustusSheet.onload = () => {
    spriteConfig.frameW = robustusSheet.width / spriteConfig.cols;
    spriteConfig.frameH = robustusSheet.height / spriteConfig.rows;
};

const bossSpriteConfig = {
    cols: 6, rows: 4,
    frameW: 0, frameH: 0,
    currentFrameX: 0, currentFrameY: 0,
    animTimer: 0, animSpeed: 10
};
bossSheet.onload = () => {
    bossSpriteConfig.frameW = bossSheet.width / bossSpriteConfig.cols;
    bossSpriteConfig.frameH = bossSheet.height / bossSpriteConfig.rows;
};

/* ======================================================================
   ESTADOS DO JOGO
====================================================================== */
const GAME_STATE = { MENU: 0, STORY: 1, PLAYING: 2, GAME_OVER: 3, VICTORY: 4 };
let currentState = GAME_STATE.MENU;
let score = 0;
let cameraX = 0;
let bossFightActive = false;
let gameOverTimer = 600;

/* ======================================================================
   ENTRADA — TECLADO + TOQUE + GAMEPAD (unificados em `keys`)
====================================================================== */
const kb = { left: false, right: false, up: false, attack: false, shoot: false };
const touch = { left: false, right: false, up: false, attack: false, shoot: false };
const gp = { left: false, right: false, up: false, attack: false, shoot: false };
const keys = { left: false, right: false, up: false, attack: false, shoot: false };

function mergeInputs() {
    keys.left = kb.left || touch.left || gp.left;
    keys.right = kb.right || touch.right || gp.right;
    keys.up = kb.up || touch.up || gp.up;
    keys.shoot = kb.shoot || touch.shoot || gp.shoot;
    keys.attack = kb.attack || touch.attack || gp.attack;
}

function handleConfirmPress() {
    if (currentState === GAME_STATE.MENU) {
        currentState = GAME_STATE.STORY;
        startScreen.style.display = 'none';
        storyScreen.style.display = 'flex';
    } else if (currentState === GAME_STATE.STORY) {
        startGame();
    } else if (currentState === GAME_STATE.GAME_OVER) {
        startGame();
    } else if (currentState === GAME_STATE.VICTORY) {
        startGame();
    }
    updateTouchControlsVisibility();
}

document.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
        e.preventDefault();
        if (currentState === GAME_STATE.PLAYING) {
            kb.attack = true;
        } else {
            handleConfirmPress();
        }
    }
    if (currentState === GAME_STATE.PLAYING) {
        if (e.code === 'ArrowLeft' || e.code === 'KeyA') kb.left = true;
        if (e.code === 'ArrowRight' || e.code === 'KeyD') kb.right = true;
        if (e.code === 'ArrowUp' || e.code === 'KeyW') kb.up = true;
        if (e.code === 'KeyF' || e.code === 'KeyJ') kb.shoot = true;
    }
});
document.addEventListener('keyup', (e) => {
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') kb.left = false;
    if (e.code === 'ArrowRight' || e.code === 'KeyD') kb.right = false;
    if (e.code === 'ArrowUp' || e.code === 'KeyW') kb.up = false;
    if (e.code === 'Space') kb.attack = false;
    if (e.code === 'KeyF' || e.code === 'KeyJ') kb.shoot = false;
});

// Toque em telas de menu / game-over / vitória avança o jogo
[startScreen, storyScreen].forEach(el => {
    el.addEventListener('pointerdown', handleConfirmPress);
});
canvas.addEventListener('pointerdown', () => {
    if (currentState !== GAME_STATE.PLAYING) handleConfirmPress();
});

// Controles virtuais de toque
function bindTouchButton(id, prop) {
    const el = document.getElementById(id);
    const set = (v) => (e) => { e.preventDefault(); touch[prop] = v; el.classList.toggle('pressed', v); };
    el.addEventListener('pointerdown', set(true));
    el.addEventListener('pointerup', set(false));
    el.addEventListener('pointercancel', set(false));
    el.addEventListener('pointerleave', set(false));
}
bindTouchButton('btn-left', 'left');
bindTouchButton('btn-right', 'right');
bindTouchButton('btn-jump', 'up');
bindTouchButton('btn-shoot', 'shoot');
bindTouchButton('btn-sonic', 'attack');

// Gamepad (joystick físico via Gamepad API)
let gpConfirmPrev = false;
function pollGamepad() {
    if (!navigator.getGamepads) return;
    const pads = navigator.getGamepads();
    const pad = pads && pads[0];
    if (!pad) { gp.left = gp.right = gp.up = gp.shoot = gp.attack = false; return; }

    const axisX = pad.axes[0] || 0;
    const THRESH = 0.35;
    gp.left = axisX < -THRESH || !!(pad.buttons[14] && pad.buttons[14].pressed);
    gp.right = axisX > THRESH || !!(pad.buttons[15] && pad.buttons[15].pressed);
    gp.up = !!(pad.buttons[0] && pad.buttons[0].pressed) || !!(pad.buttons[12] && pad.buttons[12].pressed);
    gp.shoot = !!(pad.buttons[1] && pad.buttons[1].pressed);
    gp.attack = !!(pad.buttons[2] && pad.buttons[2].pressed) || !!(pad.buttons[7] && pad.buttons[7].pressed);

    const confirmNow = !!(pad.buttons[9] && pad.buttons[9].pressed) || !!(pad.buttons[0] && pad.buttons[0].pressed);
    if (confirmNow && !gpConfirmPrev && currentState !== GAME_STATE.PLAYING) {
        handleConfirmPress();
    }
    gpConfirmPrev = confirmNow;
}

/* ======================================================================
   JOGADOR
====================================================================== */
const PLAYER_STATES = {
    IDLE: 'IDLE', WALK: 'WALK', JUMP: 'JUMP',
    ATTACK_SHOOT: 'ATTACK_SHOOT', ATTACK_SONIC: 'ATTACK_SONIC',
    BORED_THINKER: 'BORED_THINKER'
};

const player = {
    x: 50, y: 446, width: 76, height: 114,
    speed: 5, dx: 0, dy: 0, gravity: 0.5, jumpForce: -13,
    grounded: true, facing: 1,
    health: 100, maxHealth: 100,
    invulnerableTimer: 0, ammo: 5, maxAmmo: 5,
    state: PLAYER_STATES.IDLE,
    tedioTimer: 0,
    isAttacking: false,
    attackTimer: 0,
    attackDuration: 20,
    attackRadius: 0
};

let projectiles = [];

function shootProjectile() {
    if (player.ammo > 0) {
        player.ammo--;
        projectiles.push({
            x: player.facing === 1 ? player.x + player.width : player.x - 12,
            y: player.y + 45, w: 12, h: 6, speed: 8 * player.facing, active: true
        });
        playShootSfx();
        updateHUD();
    }
}

/* ======================================================================
   NÍVEL
====================================================================== */
const levelData = {
    width: 7600,
    platforms: [
        { x: 0, y: 560, w: 7600, h: 40 },
        { x: 3300, y: 462, w: 120, h: 98, isCase: true },
        { x: 6850, y: 440, w: 80, h: 120, isMarshall: true },
        { x: 7000, y: 380, w: 90, h: 180, isMarshall: true },
        { x: 7300, y: 420, w: 80, h: 140, isMarshall: true },
        { x: 7450, y: 360, w: 90, h: 200, isMarshall: true }
    ],
    collectibles: [
        { x: 800, y: 410, type: "valvula", name: "Válvula", collected: false, radius: 10 },
        { x: 1800, y: 410, type: "palheta", name: "Palheta", collected: false, radius: 8 },
        { x: 2800, y: 410, type: "valvula", name: "Válvula", collected: false, radius: 10 },
        { x: 3360, y: 420, type: "baquetas", name: "Baquetas Secretas", collected: false, radius: 22, hidden: true },
        { x: 3800, y: 410, type: "palheta", name: "Palheta", collected: false, radius: 8 },
        { x: 4800, y: 410, type: "valvula", name: "Válvula", collected: false, radius: 10 },
        { x: 5800, y: 410, type: "palheta", name: "Palheta", collected: false, radius: 8 },
        { x: 6700, y: 410, type: "valvula", name: "Válvula", collected: false, radius: 10 }
    ],
    enemies: [
        { x: 900, y: 484, w: 56, h: 76, speed: 2, dir: 1, limitLeft: 700, limitRight: 1300, active: true, state: 'idle', hitTimer: 0, chasing: false },
        { x: 2100, y: 484, w: 56, h: 76, speed: 2.5, dir: 1, limitLeft: 1600, limitRight: 2400, active: true, state: 'idle', hitTimer: 0, chasing: false },
        { x: 4100, y: 484, w: 56, h: 76, speed: 2, dir: 1, limitLeft: 3500, limitRight: 4500, active: true, state: 'idle', hitTimer: 0, chasing: false },
        { x: 6000, y: 484, w: 56, h: 76, speed: 3, dir: 1, limitLeft: 5500, limitRight: 6400, active: true, state: 'idle', hitTimer: 0, chasing: false }
    ],
    boss: {
        x: 7100, y: 380, w: 140, h: 180, health: 300, maxHealth: 300, speed: 3, dir: -1, active: true,
        mode: 'patrol', modeTimer: 0
    }
};

function updateHUD() {
    scoreDisplay.innerText = "SCORE: " + score.toString().padStart(4, '0') + " | TIROS: " + player.ammo + "/" + player.maxAmmo;
    document.getElementById('hud-lives').innerHTML = bossFightActive ?
        "<span style='color:#e74c3c'>O METRÔNOMO EXECUTOR</span>" :
        "<span style='color:#3498db'>ROBUSTUS</span>";
}

function startGame() {
    currentState = GAME_STATE.PLAYING;
    storyScreen.style.display = 'none';
    hud.style.display = 'flex';

    score = 0;
    bossFightActive = false;
    player.health = player.maxHealth;
    player.ammo = 5;
    player.maxAmmo = 5;
    player.x = 50;
    player.y = 446;
    player.dx = 0;
    player.dy = 0;
    player.grounded = true;
    player.state = PLAYER_STATES.IDLE;
    player.tedioTimer = 0;

    levelData.boss.health = levelData.boss.maxHealth;
    levelData.boss.active = true;
    levelData.boss.mode = 'patrol';
    levelData.boss.modeTimer = 0;

    levelData.collectibles.forEach(item => item.collected = false);
    levelData.enemies.forEach((enemy, i) => {
        const defaults = levelData.enemies0[i];
        enemy.x = defaults.x; enemy.dir = defaults.dir; enemy.active = true;
        enemy.state = 'idle'; enemy.hitTimer = 0; enemy.chasing = false;
    });

    activeTeddyVideo = angryTeddyVideo;
    happyTeddyVideo.pause();
    trySafePlay(angryTeddyVideo);

    cameraX = 0;
    projectiles = [];
    updateHUD();

    playGameMusic();
    stopMetronomeLoop();
    startMetronomeLoop();
    updateTouchControlsVisibility();
}
// guarda posições originais dos inimigos para reiniciar corretamente
levelData.enemies0 = levelData.enemies.map(e => ({ x: e.x, dir: e.dir }));

function rectIntersect(x1, y1, w1, h1, x2, y2, w2, h2) {
    return x2 < x1 + w1 && x2 + w2 > x1 && y2 < y1 + h1 && y2 + h2 > y1;
}

function animateRobustus() {
    spriteConfig.animTimer++;
    if (spriteConfig.animTimer >= spriteConfig.animSpeed) {
        spriteConfig.animTimer = 0;
        switch (player.state) {
            case PLAYER_STATES.IDLE:
                spriteConfig.currentFrameY = 0; spriteConfig.currentFrameX = 0; break;
            case PLAYER_STATES.WALK:
                spriteConfig.currentFrameY = 0; spriteConfig.currentFrameX = (spriteConfig.currentFrameX + 1) % 5; break;
            case PLAYER_STATES.JUMP:
                spriteConfig.currentFrameY = 1; spriteConfig.currentFrameX = (spriteConfig.currentFrameX + 1) % 2; break;
            case PLAYER_STATES.ATTACK_SHOOT:
            case PLAYER_STATES.ATTACK_SONIC:
                spriteConfig.currentFrameY = 2; spriteConfig.currentFrameX++;
                if (spriteConfig.currentFrameX >= 3) { spriteConfig.currentFrameX = 0; player.state = PLAYER_STATES.IDLE; }
                break;
            case PLAYER_STATES.BORED_THINKER:
                spriteConfig.currentFrameY = 2; spriteConfig.currentFrameX = 3; break;
        }
    }
}

function animateBoss() {
    bossSpriteConfig.animTimer++;
    if (bossSpriteConfig.animTimer >= bossSpriteConfig.animSpeed) {
        bossSpriteConfig.animTimer = 0;
        bossSpriteConfig.currentFrameX = (bossSpriteConfig.currentFrameX + 1) % 6;
        bossSpriteConfig.currentFrameY = levelData.boss.health < levelData.boss.maxHealth * 0.5 ? 2 : 0;
    }
}

/* ======================================================================
   UPDATE
====================================================================== */
function update() {
    frameCount++;
    pollGamepad();
    mergeInputs();

    if (currentState === GAME_STATE.GAME_OVER) {
        gameOverTimer--;
        if (gameOverTimer <= 0) {
            currentState = GAME_STATE.MENU;
            startScreen.style.display = 'flex';
            hud.style.display = 'none';
            bgMusic.pause();
            playIntroMusic();
            stopMetronomeLoop();
            updateTouchControlsVisibility();
        }
        return;
    }

    if (currentState === GAME_STATE.VICTORY) {
        // câmera se aproxima suavemente do Teddy feliz, foco na celebração
        const targetCam = Math.max(0, Math.min(levelData.width - canvas.width, teddyWorld.x - canvas.width / 2));
        cameraX += (targetCam - cameraX) * 0.06;
        return;
    }

    if (currentState !== GAME_STATE.PLAYING) return;

    let hasInput = false;

    if (keys.left) { player.dx = -player.speed; player.facing = -1; hasInput = true; }
    else if (keys.right) { player.dx = player.speed; player.facing = 1; hasInput = true; }
    else { player.dx = 0; }

    if (keys.shoot && player.state !== PLAYER_STATES.ATTACK_SHOOT) {
        shootProjectile();
        player.state = PLAYER_STATES.ATTACK_SHOOT;
        spriteConfig.currentFrameX = 0;
        hasInput = true;
    }

    if (keys.attack && player.state !== PLAYER_STATES.ATTACK_SONIC) {
        player.state = PLAYER_STATES.ATTACK_SONIC;
        spriteConfig.currentFrameX = 0;
        player.isAttacking = true;
        player.attackTimer = player.attackDuration;
        player.attackRadius = 30;
        playSonicSfx();
        hasInput = true;
    }

    if (keys.up && player.grounded) {
        player.dy = player.jumpForce;
        player.grounded = false;
        player.state = PLAYER_STATES.JUMP;
        spriteConfig.currentFrameX = 0;
        playJumpSfx();
        hasInput = true;
    }

    if (player.state === PLAYER_STATES.ATTACK_SHOOT || player.state === PLAYER_STATES.ATTACK_SONIC) {
        if (hasInput) player.tedioTimer = 0;
    } else if (!player.grounded) {
        player.state = PLAYER_STATES.JUMP; player.tedioTimer = 0;
    } else if (player.dx !== 0) {
        player.state = PLAYER_STATES.WALK; player.tedioTimer = 0;
    } else {
        if (hasInput || keys.left || keys.right || keys.up || keys.attack || keys.shoot) {
            player.state = PLAYER_STATES.IDLE; player.tedioTimer = 0;
        } else {
            if (player.state === PLAYER_STATES.BORED_THINKER) {
                if (keys.left || keys.right || keys.up || keys.attack || keys.shoot) {
                    player.state = PLAYER_STATES.IDLE; player.tedioTimer = 0;
                }
            } else {
                player.tedioTimer++;
                if (player.tedioTimer >= 300) {
                    player.state = PLAYER_STATES.BORED_THINKER;
                    spriteConfig.currentFrameX = 3;
                } else {
                    player.state = PLAYER_STATES.IDLE;
                }
            }
        }
    }

    player.dy += player.gravity;
    player.x += player.dx;
    player.y += player.dy;

    if (player.x < 0) player.x = 0;
    if (player.x + player.width > levelData.width) player.x = levelData.width - player.width;

    player.grounded = false;
    for (let plat of levelData.platforms) {
        if (player.dy >= 0 && player.x < plat.x + plat.w && player.x + player.width > plat.x &&
            player.y + player.height >= plat.y && player.y + player.height <= plat.y + player.dy + 2) {
            player.grounded = true; player.dy = 0; player.y = plat.y - player.height;
        }
    }

    if (player.invulnerableTimer > 0) player.invulnerableTimer--;

    if (player.state === PLAYER_STATES.ATTACK_SONIC) {
        player.attackTimer--;
        player.attackRadius += 5;
        if (player.attackTimer <= 0) player.isAttacking = false;
    } else {
        player.isAttacking = false;
    }

    animateRobustus();
    animateBoss();

    projectiles.forEach(p => {
        if (p.active) {
            p.x += p.speed;
            if (Math.abs(p.x - player.x) > 800) p.active = false;

            levelData.enemies.forEach(enemy => {
                if (enemy.active && enemy.state !== 'hit' && rectIntersect(p.x, p.y, p.w, p.h, enemy.x, enemy.y, enemy.w, enemy.h)) {
                    enemy.state = 'hit'; enemy.hitTimer = 16; p.active = false; score += 50; playEnemyHitSfx(); updateHUD();
                }
            });

            if (levelData.boss.active && rectIntersect(p.x, p.y, p.w, p.h, levelData.boss.x, levelData.boss.y, levelData.boss.w, levelData.boss.h)) {
                levelData.boss.health -= 15; p.active = false; playBossHitSfx();
                if (levelData.boss.health <= 0) {
                    triggerVictory();
                }
            }
        }
    });

    let pCenterX = player.x + player.width / 2;
    let pCenterY = player.y + player.height / 2;

    levelData.collectibles.forEach(item => {
        if (!item.collected && Math.abs(pCenterX - item.x) < 30 && Math.abs(pCenterY - item.y) < 34) {
            item.collected = true;
            if (item.type === 'baquetas') {
                player.maxAmmo += 30;
                player.ammo += 30;
                score += 300;
                playBaquetasSfx();
            } else {
                score += 150;
                if (player.ammo < player.maxAmmo) player.ammo++;
                playCollectSfx();
            }
            updateHUD();
        }
    });

    // --- INIMIGOS: patrulha, mas perseguem o jogador se ele estiver perto (IA reativa) ---
    const CHASE_RANGE = 260;
    const CHASE_MARGIN = 160;
    levelData.enemies.forEach(enemy => {
        if (!enemy.active) return;

        if (enemy.state === 'hit') {
            enemy.hitTimer--;
            if (enemy.hitTimer <= 0) enemy.active = false;
            return; // parado, piscando, não persegue nem machuca durante o flash
        }

        const distToPlayer = Math.abs(pCenterX - (enemy.x + enemy.w / 2));
        enemy.chasing = distToPlayer < CHASE_RANGE && !bossFightActive;
        if (enemy.chasing) {
            enemy.dir = pCenterX > enemy.x ? 1 : -1;
            enemy.x += enemy.speed * 1.5 * enemy.dir;
            if (enemy.x < enemy.limitLeft - CHASE_MARGIN) enemy.x = enemy.limitLeft - CHASE_MARGIN;
            if (enemy.x + enemy.w > enemy.limitRight + CHASE_MARGIN) enemy.x = enemy.limitRight + CHASE_MARGIN;
        } else {
            enemy.x += enemy.speed * enemy.dir;
            if (enemy.x <= enemy.limitLeft || enemy.x + enemy.w >= enemy.limitRight) enemy.dir *= -1;
        }

        if (player.state === PLAYER_STATES.ATTACK_SONIC && Math.hypot(pCenterX - (enemy.x + enemy.w / 2), pCenterY - (enemy.y + enemy.h / 2)) < player.attackRadius) {
            enemy.state = 'hit'; enemy.hitTimer = 16; score += 50; playEnemyHitSfx(); updateHUD();
            return;
        }

        if (player.invulnerableTimer === 0 && rectIntersect(player.x, player.y, player.width, player.height, enemy.x, enemy.y, enemy.w, enemy.h)) {
            player.health -= 20; player.invulnerableTimer = 60; playPlayerHurtSfx();
        }
    });

    if (player.x > 6800 && !bossFightActive) { bossFightActive = true; updateHUD(); }

    // --- BOSS: patrulha + fase de raiva (< 50% vida) com ataque de investida telegrafado ---
    let boss = levelData.boss;
    if (bossFightActive && boss.active) {
        const phase2 = boss.health < boss.maxHealth * 0.5;
        boss.modeTimer++;

        if (boss.mode === 'patrol') {
            boss.x += boss.speed * boss.dir;
            if (boss.x < 6900) boss.dir = 1;
            if (boss.x > 7400) boss.dir = -1;
            if (phase2 && boss.modeTimer > 150) { boss.mode = 'telegraph'; boss.modeTimer = 0; }
        } else if (boss.mode === 'telegraph') {
            if (boss.modeTimer > 35) {
                boss.mode = 'dash'; boss.modeTimer = 0;
                boss.dir = (player.x < boss.x) ? -1 : 1;
            }
        } else if (boss.mode === 'dash') {
            boss.x += boss.speed * 3.2 * boss.dir;
            if (boss.x < 6880) { boss.x = 6880; boss.mode = 'patrol'; boss.modeTimer = 0; }
            if (boss.x > 7420) { boss.x = 7420; boss.mode = 'patrol'; boss.modeTimer = 0; }
            if (boss.modeTimer > 40) { boss.mode = 'patrol'; boss.modeTimer = 0; }
        }

        if (player.state === PLAYER_STATES.ATTACK_SONIC && Math.hypot(pCenterX - (boss.x + boss.w / 2), pCenterY - (boss.y + boss.h / 2)) < player.attackRadius) {
            boss.health -= 2;
            if (boss.health <= 0) { triggerVictory(); }
        }

        if (player.invulnerableTimer === 0 && rectIntersect(player.x, player.y, player.width, player.height, boss.x, boss.y, boss.w, boss.h)) {
            player.health -= 30; player.invulnerableTimer = 60; player.dx = -15; player.dy = -5;
            playPlayerHurtSfx();
        }
    }

    if (player.health <= 0 && currentState === GAME_STATE.PLAYING) {
        currentState = GAME_STATE.GAME_OVER;
        gameOverTimer = 600;
        bgMusic.pause();
        stopMetronomeLoop();
        playGameOverSfx();
        updateTouchControlsVisibility();
    }

    if (!bossFightActive) {
        cameraX = player.x - (canvas.width / 2) + (player.width / 2);
        if (cameraX < 0) cameraX = 0;
        if (cameraX > levelData.width - canvas.width) cameraX = levelData.width - canvas.width;
    } else {
        cameraX = levelData.width - canvas.width;
        if (player.x < cameraX) player.x = cameraX;
    }
}

function triggerVictory() {
    if (currentState === GAME_STATE.VICTORY) return;
    levelData.boss.active = false;
    currentState = GAME_STATE.VICTORY;
    bgMusic.pause();
    stopMetronomeLoop();
    playVictorySfx();
    // Angry Teddy vira Teddy Happy quando o vilão é derrotado
    activeTeddyVideo = happyTeddyVideo;
    angryTeddyVideo.pause();
    trySafePlay(happyTeddyVideo);
    updateTouchControlsVisibility();
}

/* ======================================================================
   DESENHO
====================================================================== */

// Fundo — respeita a proporção real da arte (evita esticar/distorcer) e
// repete lado a lado para cobrir toda a largura da fase.
function drawBackground() {
    if (!bgImage.complete || !bgImage.naturalWidth) return;
    const tileW = bgImage.width * (canvas.height / bgImage.height);
    let startX = -(cameraX % tileW);
    if (startX > 0) startX -= tileW;
    for (let x = startX; x < canvas.width; x += tileW) {
        ctx.drawImage(bgImage, 0, 0, bgImage.width, bgImage.height, x, 0, tileW, canvas.height);
    }
}

// Teddy animado ao fundo do palco (vídeo com fundo removido)
function drawTeddy() {
    const vid = activeTeddyVideo;
    if (!vid || vid.readyState < 2) return;
    const h = teddyWorld.h;
    const w = h * (232 / 416);
    const rx = teddyWorld.x - cameraX;
    if (rx < -w - 50 || rx > canvas.width + 50) return;
    ctx.drawImage(vid, rx, teddyWorld.y - h, w, h);
}

// Amplificadores Marshall com a arte real (empilhados mantendo a proporção da imagem)
function drawMarshallAmps() {
    levelData.platforms.forEach(plat => {
        if (!plat.isMarshall) return;
        let rx = plat.x - cameraX, ry = plat.y, rw = plat.w, rh = plat.h;
        if (rx < -200 || rx > canvas.width + 200) return;

        if (marshallImg.complete && marshallImg.naturalWidth > 0) {
            const unitH = rw / marshallAspect;
            const count = Math.max(1, Math.round(rh / unitH));
            const actualUnitH = rh / count;
            for (let i = 0; i < count; i++) {
                const uy = ry + rh - (i + 1) * actualUnitH;
                ctx.drawImage(marshallImg, rx, uy, rw, actualUnitH);
            }
        } else {
            ctx.fillStyle = '#1a1a1a';
            ctx.fillRect(rx, ry, rw, rh);
        }
    });
}

// Case de equipamento (plataforma "escondida" com as baquetas em cima)
function drawGearCase() {
    levelData.platforms.forEach(plat => {
        if (!plat.isCase) return;
        let rx = plat.x - cameraX, ry = plat.y, rw = plat.w, rh = plat.h;
        if (rx < -150 || rx > canvas.width + 150) return;
        ctx.fillStyle = '#15181c';
        ctx.fillRect(rx, ry, rw, rh);
        ctx.fillStyle = '#2c3136';
        ctx.fillRect(rx + 5, ry + 5, rw - 10, rh - 10);
        ctx.fillStyle = '#7f8c8d';
        [[rx + 4, ry + 4], [rx + rw - 14, ry + 4], [rx + 4, ry + rh - 14], [rx + rw - 14, ry + rh - 14]].forEach(([cx, cy]) => {
            ctx.fillRect(cx, cy, 10, 10);
        });
    });
}

function drawCollectibleIcon(item) {
    let screenX = item.x - cameraX;
    if (screenX < -60 || screenX > canvas.width + 60) return;

    const bob = Math.sin((frameCount + item.x) * 0.06) * 5;
    const y = item.y + bob;

    if (item.type === 'baquetas') {
        // item especial/escondido — halo pulsante + sinalizador quando o jogador está perto
        const pulse = 0.55 + 0.35 * Math.sin(frameCount * 0.12);
        ctx.save();
        ctx.shadowColor = '#f1c40f';
        ctx.shadowBlur = 22 * pulse;
        if (baquetasImg.complete && baquetasImg.naturalWidth > 0) {
            const h = 44, w = h * baquetasAspect;
            ctx.drawImage(baquetasImg, screenX - w / 2, y - h / 2, w, h);
        }
        ctx.restore();

        ctx.save();
        ctx.globalAlpha = pulse;
        ctx.strokeStyle = '#f1c40f'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(screenX, y, 30 + pulse * 4, 0, Math.PI * 2); ctx.stroke();
        ctx.restore();

        // seta guia flutuando acima, para dar uma dica do item escondido
        const arrowBob = Math.sin(frameCount * 0.1) * 4;
        ctx.save();
        ctx.fillStyle = '#f1c40f';
        ctx.globalAlpha = pulse;
        ctx.beginPath();
        ctx.moveTo(screenX, y - 46 + arrowBob);
        ctx.lineTo(screenX - 7, y - 56 + arrowBob);
        ctx.lineTo(screenX + 7, y - 56 + arrowBob);
        ctx.closePath(); ctx.fill();
        ctx.restore();
        return;
    }

    ctx.save();
    ctx.shadowBlur = 14;
    if (item.type === 'valvula') {
        ctx.shadowColor = '#f39c12';
        ctx.fillStyle = '#d35400'; ctx.fillRect(screenX - 7, y - 13, 14, 20);
        ctx.fillStyle = '#f39c12'; ctx.fillRect(screenX - 4, y - 10, 8, 13);
        ctx.fillStyle = '#bdc3c7'; ctx.fillRect(screenX - 8, y + 7, 16, 6);
    } else {
        ctx.shadowColor = '#f1c40f';
        ctx.fillStyle = '#f1c40f';
        ctx.beginPath();
        ctx.moveTo(screenX, y - 13); ctx.lineTo(screenX + 11, y + 9); ctx.lineTo(screenX - 11, y + 9);
        ctx.closePath(); ctx.fill();
        ctx.strokeStyle = '#b7950b'; ctx.lineWidth = 1.5; ctx.stroke();
    }
    ctx.restore();
}

function drawEnemies() {
    levelData.enemies.forEach(enemy => {
        if (!enemy.active) return;
        let sx = enemy.x - cameraX;
        if (sx < -120 || sx > canvas.width + 120) return;

        if (!quantSheet.complete || !quantSheet.naturalWidth) {
            ctx.fillStyle = "#9b59b6"; ctx.fillRect(sx, enemy.y, enemy.w, enemy.h);
            return;
        }

        let frameIdx;
        if (enemy.state === 'hit') {
            frameIdx = (Math.floor(enemy.hitTimer / 4) % 2 === 0) ? 4 : 0; // pisca
        } else if (enemy.chasing) {
            frameIdx = 3;
        } else {
            frameIdx = Math.floor((frameCount + enemy.x) / 20) % 3;
        }

        const scale = enemy.h / QUANT_FRAME_H;
        const drawW = QUANT_FRAME_W * scale, drawH = enemy.h;
        const facing = enemy.dir >= 0 ? 1 : -1;

        ctx.save();
        ctx.translate(sx + enemy.w / 2, enemy.y);
        ctx.scale(facing, 1);
        ctx.drawImage(quantSheet, frameIdx * QUANT_FRAME_W, 0, QUANT_FRAME_W, QUANT_FRAME_H,
            -drawW / 2, 0, drawW, drawH);
        ctx.restore();
    });
}

function drawBossTelegraph(boss) {
    if (boss.mode !== 'telegraph') return;
    const flash = 0.25 + 0.35 * Math.abs(Math.sin(frameCount * 0.6));
    ctx.save();
    ctx.globalAlpha = flash;
    ctx.fillStyle = '#ff2222';
    ctx.beginPath();
    ctx.ellipse(boss.x - cameraX + boss.w / 2, boss.y + boss.h + 6, boss.w * 0.7, 14, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
}

function draw() {
    if (currentState === GAME_STATE.GAME_OVER) {
        ctx.fillStyle = "rgba(0, 0, 0, 0.9)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "#e74c3c"; ctx.font = "26px 'Press Start 2P'";
        ctx.fillText("O ALGORITMO VENCEU", 130, 200);
        let segundosRestantes = Math.ceil(gameOverTimer / 60);
        ctx.fillStyle = "#f1c40f"; ctx.font = "20px 'Press Start 2P'";
        ctx.fillText("CONTINUE: " + segundosRestantes + "s", 270, 270);
        ctx.fillStyle = "#ffffff"; ctx.font = "12px 'Press Start 2P'";
        ctx.fillText("Pressione [ESPAÇO] ou toque", 165, 340);
        return;
    }

    if (currentState === GAME_STATE.VICTORY) {
        drawBackground();
        drawTeddy();

        // vinheta suave — escurece as bordas mas mantém o Teddy visível no centro
        const grad = ctx.createRadialGradient(canvas.width / 2, canvas.height / 2, 90, canvas.width / 2, canvas.height / 2, canvas.width * 0.72);
        grad.addColorStop(0, 'rgba(0,0,0,0.12)');
        grad.addColorStop(1, 'rgba(0,0,0,0.88)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.textAlign = 'center';
        ctx.fillStyle = "#2ecc71"; ctx.font = "26px 'Press Start 2P'";
        ctx.fillText("MR. ROCK SALVO!", canvas.width / 2, 80);
        ctx.fillStyle = "#ffffff"; ctx.font = "12px 'Press Start 2P'";
        ctx.fillText("Pressione espaço ou toque!", canvas.width / 2, canvas.height - 50);
        ctx.textAlign = 'left';
        return;
    }

    if (currentState !== GAME_STATE.PLAYING) return;

    drawBackground();
    drawTeddy();
    drawGearCase();
    drawMarshallAmps();

    levelData.collectibles.forEach(item => { if (!item.collected) drawCollectibleIcon(item); });

    drawEnemies();

    ctx.fillStyle = "#00ffff";
    projectiles.forEach(p => { if (p.active) ctx.fillRect(p.x - cameraX, p.y, p.w, p.h); });

    let boss = levelData.boss;
    if (boss.active) {
        drawBossTelegraph(boss);
        if (bossSpriteConfig.frameW > 0) {
            ctx.save();
            let bossFacing = (boss.dir === 1) ? 1 : -1;
            ctx.translate(boss.x - cameraX + (bossFacing === -1 ? boss.w : 0), boss.y);
            ctx.scale(bossFacing, 1);
            ctx.drawImage(bossSheet,
                bossSpriteConfig.currentFrameX * bossSpriteConfig.frameW,
                bossSpriteConfig.currentFrameY * bossSpriteConfig.frameH,
                bossSpriteConfig.frameW, bossSpriteConfig.frameH,
                0, 0, boss.w, boss.h);
            ctx.restore();
        } else {
            ctx.fillStyle = "rgba(231, 76, 60, 0.5)";
            ctx.fillRect(boss.x - cameraX, boss.y, boss.w, boss.h);
        }
    }

    if (player.invulnerableTimer === 0 || Math.floor(player.invulnerableTimer / 5) % 2 === 0) {
        if (spriteConfig.frameW > 0) {
            ctx.save();
            ctx.translate(player.x - cameraX + (player.facing === -1 ? player.width : 0), player.y);
            ctx.scale(player.facing, 1);
            ctx.drawImage(robustusSheet,
                spriteConfig.currentFrameX * spriteConfig.frameW,
                spriteConfig.currentFrameY * spriteConfig.frameH,
                spriteConfig.frameW, spriteConfig.frameH,
                0, 0, player.width, player.height);
            ctx.restore();
        } else {
            ctx.fillStyle = "#7f8c8d"; ctx.fillRect(player.x - cameraX, player.y, player.width, player.height);
        }
    }

    if (player.state === PLAYER_STATES.ATTACK_SONIC) {
        ctx.beginPath(); ctx.arc(player.x + player.width / 2 - cameraX, player.y + player.height / 2, player.attackRadius, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(0, 200, 255, 0.7)"; ctx.lineWidth = 6; ctx.stroke();
    }

    ctx.fillStyle = "#000"; ctx.fillRect(20, 60, 200, 15);
    ctx.fillStyle = "#3498db"; ctx.fillRect(22, 62, (player.health / player.maxHealth) * 196, 11);

    if (bossFightActive && boss.active) {
        ctx.fillStyle = "#000"; ctx.fillRect(400, 60, 360, 15);
        ctx.fillStyle = "#e74c3c"; ctx.fillRect(402, 62, (boss.health / boss.maxHealth) * 356, 11);
    }
}

function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

applyMusicMute();
updateTouchControlsVisibility();
gameLoop();
