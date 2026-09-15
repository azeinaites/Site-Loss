const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const startScreen = document.getElementById('start-screen');
const storyScreen = document.getElementById('story-screen');
const storyTitleEl = document.getElementById('story-title');
const storyTextEl = document.getElementById('story-text');
const storyPromptEl = document.getElementById('story-prompt');
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
   ÁUDIO — MÚSICA (independente dos efeitos sonoros; troca de faixa por fase)
====================================================================== */
const introMusic = new Audio('assets/human factor intro.mp3');
introMusic.loop = true;
introMusic.volume = 0.5;

const bgMusic = new Audio();
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
    const phase = PHASES[currentPhaseIndex];
    if (bgMusic.getAttribute('src') !== phase.musicSrc) {
        bgMusic.src = phase.musicSrc;
    }
    bgMusic.currentTime = 0;
    bgMusic.play().catch(() => {});
    setTrackName(phase.trackName);
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
function playSpecialItemSfx(){ sfxOsc('triangle', 400, 900, 0.14, 0.4); sfxOsc('triangle', 700, 1300, 0.18, 0.35, 0.08); }
function playEnemyHitSfx(){ sfxNoise(0.15, 0.3, 800); }
function playBossHitSfx(){ sfxOsc('sawtooth', 200, 60, 0.15, 0.4); }
function playPlayerHurtSfx(){ sfxOsc('sawtooth', 300, 90, 0.25, 0.4); }
function playVictorySfx(){ [523,659,784,1047].forEach((f,i)=>sfxOsc('triangle', f, f, 0.25, 0.3, i*0.14)); }
function playGameOverSfx(){ sfxOsc('sawtooth', 220, 55, 0.9, 0.35); }
// "canto" do Pierre Autotune ao disparar a onda sonora — bem diferente do tic-tac do metrônomo
function playSingSfx(){ sfxOsc('sawtooth', 500, 1400, 0.3, 0.3); sfxOsc('sine', 700, 1800, 0.35, 0.25, 0.05); }

// Tic-tac do metrônomo vilão (fase 1) — toca em loop próprio, independente da trilha
let metronomeIntervalId = null;
function playMetronomeTick(isTock) {
    sfxOsc('square', isTock ? 1500 : 2200, isTock ? 1400 : 2100, 0.045, 0.25);
}
function startMetronomeLoop() {
    if (metronomeIntervalId) return;
    let tock = false;
    metronomeIntervalId = setInterval(() => {
        if (currentState === GAME_STATE.PLAYING && bossFightActive && currentLevel.boss.active && PHASES[currentPhaseIndex].tickSfx) {
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
function loadImg(src) { const i = new Image(); i.src = src; return i; }
function loadVideo(src) {
    const v = document.createElement('video');
    v.src = src; v.loop = true; v.muted = true; v.playsInline = true;
    v.style.cssText = 'position:absolute;width:1px;height:1px;opacity:0;pointer-events:none;';
    document.body.appendChild(v);
    return v;
}
function trySafePlay(video) { video.play().catch(() => {}); }

// --- Fase 1: Mr Rock (BH) ---
const barImage = loadImg('assets/bar_section.jpg');
const stageImage = loadImg('assets/stage_section.jpg');
const robustusSheet = loadImg('assets/sheet robustus.png');
const robustusThinker = loadImg('assets/robustus_thinker.png');
let thinkerAspect = 777 / 969;
const metronomoSheet = loadImg('assets/metronomo executor.png');
const marshallImg = loadImg('assets/marshall.png');
let marshallAspect = 799 / 774;
const baquetasImg = loadImg('assets/baquetas.png');
let baquetasAspect = 334 / 564;
const angryTeddyVideo = loadVideo('assets/angry_teddy.webm');
const happyTeddyVideo = loadVideo('assets/happy_teddy.webm');
trySafePlay(angryTeddyVideo);

// --- Fase 2: La Java (Paris) ---
const lajavaImage = loadImg('assets/lajava_bg.jpg');
const pierreSheet = loadImg('assets/pierre_autotune.png');
const lesPaulImg = loadImg('assets/les_paul.png');
let lesPaulAspect = 1163 / 663;
const sadAztVideo = loadVideo('assets/sad_azt.webm');
const happyAztVideo = loadVideo('assets/happy_azt.webm');
trySafePlay(sadAztVideo);

// --- Inimigo comum (compartilhado entre fases) ---
const quantSheet = loadImg('assets/quantizado.png');
const QUANT_FRAME_W = 125, QUANT_FRAME_H = 166;
// índices no sheet: 0,1,2 = idle (ciclo sutil) | 3 = perseguindo | 4 = atingido

const spriteConfig = {
    cols: 5, rows: 3, frameW: 0, frameH: 0,
    currentFrameX: 0, currentFrameY: 0, animTimer: 0, animSpeed: 6
};
robustusSheet.onload = () => {
    spriteConfig.frameW = robustusSheet.width / spriteConfig.cols;
    spriteConfig.frameH = robustusSheet.height / spriteConfig.rows;
};

// Metrônomo Executor (fase 1): grid 6 colunas x 4 linhas (linha 2 = fase de raiva)
const metronomoConfig = {
    cols: 6, rows: 4, frameW: 0, frameH: 0,
    currentFrameX: 0, currentFrameY: 0, animTimer: 0, animSpeed: 10
};
metronomoSheet.onload = () => {
    metronomoConfig.frameW = metronomoSheet.width / metronomoConfig.cols;
    metronomoConfig.frameH = metronomoSheet.height / metronomoConfig.rows;
};

// Pierre Autotune (fase 2): 6 frames numa única linha (idle1,idle2,idle3,attack,hit,defeated)
const pierreConfig = {
    cols: 6, rows: 1, frameW: 0, frameH: 0,
    currentFrameX: 0, animTimer: 0, animSpeed: 10
};
pierreSheet.onload = () => {
    pierreConfig.frameW = pierreSheet.width / pierreConfig.cols;
    pierreConfig.frameH = pierreSheet.height;
};
const PIERRE_FRAME = { IDLE: [0, 1, 2], ATTACK: 3, HIT: 4, DEFEATED: 5 };

/* ======================================================================
   DEFINIÇÃO DAS FASES
====================================================================== */
const PHASES = [
    {
        id: 1,
        name: 'Mr Rock',
        storyTitle: 'FASE 1: MR. ROCK (BH)',
        storyHtml: `O ano é 2026. A Inteligência Artificial padronizou a música.
            <br><br>
            <span class="highlight-robus">ROBUSTUS</span>, o ciborgue filósofo, desperta em Belo Horizonte para recuperar a essência analógica.
            <br><br>
            Cuidado... <span class="highlight-boss">O METRÔNOMO EXECUTOR</span> assumiu o controle do palco principal!`,
        storyPrompt: 'Pressione [ESPAÇO] ou toque para Entrar no Bar',
        musicSrc: 'assets/Segredos - Loss.mp3',
        trackName: 'Segredos - Loss',
        tickSfx: true,
        bgMode: 'tile', bgTile: barImage, bgStage: stageImage,
        levelWidth: 7600, stageWorldStart: 6800, bossTriggerX: 6800,
        seams: [],
        charSad: angryTeddyVideo, charHappy: happyTeddyVideo,
        charWorld: { x: 7060, y: 560, h: 170, aspect: 232 / 416 },
        bossName: 'O METRÔNOMO EXECUTOR', bossType: 'melee',
        victoryTitle: 'MR. ROCK SALVO!',
        specialItem: {
            type: 'baquetas', name: 'Baquetas Secretas', img: baquetasImg, aspect: baquetasAspect,
            bonusAmmo: 30, bonusScore: 300, x: 3360, y: 420
        },
        levelTemplate: {
            platforms: [
                { x: 0, y: 560, w: 7600, h: 40 },
                { x: 3300, y: 462, w: 120, h: 98, isCase: true },
                { x: 6850, y: 440, w: 80, h: 120, isMarshall: true },
                { x: 7000, y: 380, w: 90, h: 180, isMarshall: true },
                { x: 7300, y: 420, w: 80, h: 140, isMarshall: true },
                { x: 7450, y: 360, w: 90, h: 200, isMarshall: true }
            ],
            collectibles: [
                { x: 800, y: 410, type: "valvula", name: "Válvula", collected: false },
                { x: 1800, y: 410, type: "palheta", name: "Palheta", collected: false },
                { x: 2800, y: 410, type: "valvula", name: "Válvula", collected: false },
                { x: 3360, y: 420, type: "baquetas", name: "Baquetas Secretas", collected: false, hidden: true },
                { x: 3800, y: 410, type: "palheta", name: "Palheta", collected: false },
                { x: 4800, y: 410, type: "valvula", name: "Válvula", collected: false },
                { x: 5800, y: 410, type: "palheta", name: "Palheta", collected: false },
                { x: 6700, y: 410, type: "valvula", name: "Válvula", collected: false }
            ],
            enemies: [
                { x: 900, y: 484, w: 56, h: 76, speed: 2, dir: 1, limitLeft: 700, limitRight: 1300 },
                { x: 2100, y: 484, w: 56, h: 76, speed: 2.5, dir: 1, limitLeft: 1600, limitRight: 2400 },
                { x: 4100, y: 484, w: 56, h: 76, speed: 2, dir: 1, limitLeft: 3500, limitRight: 4500 },
                { x: 6000, y: 484, w: 56, h: 76, speed: 3, dir: 1, limitLeft: 5500, limitRight: 6400 }
            ],
            boss: { x: 7100, y: 380, w: 140, h: 180, health: 300, maxHealth: 300, speed: 3, dir: -1 }
        }
    },
    {
        id: 2,
        name: 'La Java',
        storyTitle: 'FASE 2: LA JAVA (PARIS)',
        storyHtml: `Robustus atravessa o Atlântico rastreando o eco da Música Natural.
            <br><br>
            Em Belleville, desce as escadarias centenárias do <span class="highlight-robus">LA JAVA</span> —
            o clube mais antigo da França, aberto em 1923, onde Édith Piaf um dia cantou.
            <br><br>
            Os agentes sintéticos esconderam a guitarra Les Paul de Adriano nas sombras do salão.
            Sem ela, Robustus não pode enfrentar quem tomou o palco...
            <br><br>
            <span class="highlight-boss">PIERRE AUTOTUNE</span> afina a plateia inteira à força!`,
        storyPrompt: 'Pressione [ESPAÇO] ou toque para Entrar no La Java',
        musicSrc: 'assets/Leaving.mp3',
        trackName: 'Leaving',
        tickSfx: false,
        bgMode: 'single', bgSingle: lajavaImage,
        levelWidth: 7600, stageWorldStart: 6850, bossTriggerX: 6750,
        seams: [], // arte de fundo agora é uma imagem única e contínua — sem emenda pra disfarçar
        charSad: sadAztVideo, charHappy: happyAztVideo,
        charWorld: { x: 7180, y: 560, h: 155, aspect: 663 / 1163 * (1163 / 663) }, // ajustado abaixo
        bossName: 'PIERRE AUTOTUNE', bossType: 'ranged',
        victoryTitle: 'ADRIANO TOCA DE NOVO!',
        specialItem: {
            type: 'guitarra', name: 'Guitarra Les Paul', img: lesPaulImg, aspect: lesPaulAspect,
            bonusAmmo: 50, bonusScore: 500, x: 4250, y: 420
        },
        levelTemplate: {
            platforms: [
                { x: 0, y: 560, w: 7600, h: 40 },
                { x: 4200, y: 462, w: 120, h: 98, isCase: true }
            ],
            collectibles: [
                { x: 700, y: 410, type: "valvula", name: "Taça Vintage", collected: false },
                { x: 1600, y: 410, type: "palheta", name: "Partitura", collected: false },
                { x: 2500, y: 410, type: "valvula", name: "Taça Vintage", collected: false },
                { x: 3300, y: 410, type: "palheta", name: "Partitura", collected: false },
                { x: 4250, y: 420, type: "guitarra", name: "Guitarra Les Paul", collected: false, hidden: true },
                { x: 5000, y: 410, type: "valvula", name: "Taça Vintage", collected: false },
                { x: 5800, y: 410, type: "palheta", name: "Partitura", collected: false },
                { x: 6500, y: 410, type: "valvula", name: "Taça Vintage", collected: false }
            ],
            enemies: [
                { x: 850, y: 484, w: 56, h: 76, speed: 2, dir: 1, limitLeft: 650, limitRight: 1250 },
                { x: 1900, y: 484, w: 56, h: 76, speed: 2.4, dir: 1, limitLeft: 1450, limitRight: 2300 },
                { x: 3100, y: 484, w: 56, h: 76, speed: 2, dir: 1, limitLeft: 2600, limitRight: 3600 },
                { x: 5300, y: 484, w: 56, h: 76, speed: 2.6, dir: 1, limitLeft: 4800, limitRight: 5700 },
                { x: 6300, y: 484, w: 56, h: 76, speed: 3, dir: 1, limitLeft: 5900, limitRight: 6650 }
            ],
            boss: { x: 7150, y: 370, w: 135, h: 190, health: 260, maxHealth: 260, speed: 1.6, dir: -1 }
        }
    }
];
// aspecto real do personagem de fundo da fase 2 (vídeo 232x416, igual ao Teddy)
PHASES[1].charWorld = { x: 7180, y: 560, h: 155, aspect: 232 / 416 };

/* ======================================================================
   ESTADOS DO JOGO
====================================================================== */
const GAME_STATE = { MENU: 0, STORY: 1, PLAYING: 2, GAME_OVER: 3, VICTORY: 4, GAME_COMPLETE: 5 };
let currentState = GAME_STATE.MENU;
let currentPhaseIndex = 0;
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
        showPhaseIntro(0);
    } else if (currentState === GAME_STATE.STORY) {
        beginPhase(currentPhaseIndex);
    } else if (currentState === GAME_STATE.GAME_OVER) {
        beginPhase(currentPhaseIndex);
    } else if (currentState === GAME_STATE.VICTORY) {
        if (currentPhaseIndex + 1 < PHASES.length) {
            showPhaseIntro(currentPhaseIndex + 1);
        } else {
            currentState = GAME_STATE.GAME_COMPLETE;
        }
    } else if (currentState === GAME_STATE.GAME_COMPLETE) {
        currentPhaseIndex = 0;
        currentState = GAME_STATE.MENU;
        startScreen.style.display = 'flex';
        hud.style.display = 'none';
        playIntroMusic();
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
    ATTACK_SHOOT: 'ATTACK_SHOOT', ATTACK_SONIC: 'ATTACK_SONIC'
};
const THINKER_DELAY = 225; // frames parado antes de sentar na pose do Pensador (~0.25s)

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

let projectiles = [];       // tiros do jogador
let bossProjectiles = [];   // ataques à distância do chefão (fase 2)

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
   FASE ATUAL (dados mutáveis do nível em jogo)
====================================================================== */
let currentLevel = null;

function cloneLevelTemplate(tpl) {
    return {
        platforms: tpl.platforms.map(p => ({ ...p })),
        collectibles: tpl.collectibles.map(c => ({ ...c })),
        enemies: tpl.enemies.map(e => ({ ...e, active: true, state: 'idle', hitTimer: 0, chasing: false })),
        boss: { ...tpl.boss, active: true, mode: 'patrol', modeTimer: 0, singTimer: 90 }
    };
}

function updateHUD() {
    const phase = PHASES[currentPhaseIndex];
    scoreDisplay.innerText = "SCORE: " + score.toString().padStart(4, '0') + " | TIROS: " + player.ammo + "/" + player.maxAmmo;
    document.getElementById('hud-lives').innerHTML = bossFightActive ?
        `<span style='color:#e74c3c'>${phase.bossName}</span>` :
        "<span style='color:#3498db'>ROBUSTUS</span>";
}

function showPhaseIntro(index) {
    currentPhaseIndex = index;
    const phase = PHASES[index];
    currentState = GAME_STATE.STORY;
    startScreen.style.display = 'none';
    storyTitleEl.textContent = phase.storyTitle;
    storyTextEl.innerHTML = phase.storyHtml;
    storyPromptEl.textContent = phase.storyPrompt;
    storyScreen.style.display = 'flex';
}

function beginPhase(index) {
    currentPhaseIndex = index;
    const phase = PHASES[index];
    currentLevel = cloneLevelTemplate(phase.levelTemplate);

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

    activeCharVideo = phase.charSad;
    phase.charHappy.pause();
    trySafePlay(phase.charSad);

    cameraX = 0;
    projectiles = [];
    bossProjectiles = [];
    updateHUD();

    playGameMusic();
    stopMetronomeLoop();
    startMetronomeLoop();
    updateTouchControlsVisibility();
}

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
        }
    }
}

function animateBoss() {
    const phase = PHASES[currentPhaseIndex];
    const boss = currentLevel.boss;
    if (phase.bossType === 'melee') {
        metronomoConfig.animTimer++;
        if (metronomoConfig.animTimer >= metronomoConfig.animSpeed) {
            metronomoConfig.animTimer = 0;
            metronomoConfig.currentFrameX = (metronomoConfig.currentFrameX + 1) % 6;
            metronomoConfig.currentFrameY = boss.health < boss.maxHealth * 0.5 ? 2 : 0;
        }
    } else {
        pierreConfig.animTimer++;
        if (pierreConfig.animTimer >= pierreConfig.animSpeed) {
            pierreConfig.animTimer = 0;
            if (!boss.active) {
                pierreConfig.currentFrameX = PIERRE_FRAME.DEFEATED;
            } else if (boss.mode === 'singing') {
                pierreConfig.currentFrameX = PIERRE_FRAME.ATTACK;
            } else if (boss.hitFlash > 0) {
                pierreConfig.currentFrameX = PIERRE_FRAME.HIT;
            } else {
                const idle = PIERRE_FRAME.IDLE;
                pierreConfig.currentFrameX = idle[Math.floor(frameCount / 24) % idle.length];
            }
        }
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
            currentPhaseIndex = 0;
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
        // câmera se aproxima suavemente do personagem feliz, foco na celebração
        const phase = PHASES[currentPhaseIndex];
        const targetCam = Math.max(0, Math.min(phase.levelWidth - canvas.width, phase.charWorld.x - canvas.width / 2));
        cameraX += (targetCam - cameraX) * 0.06;
        return;
    }

    if (currentState !== GAME_STATE.PLAYING) return;

    const phase = PHASES[currentPhaseIndex];
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
        player.state = PLAYER_STATES.IDLE;
        if (hasInput) { player.tedioTimer = 0; } else { player.tedioTimer++; }
    }

    player.dy += player.gravity;
    player.x += player.dx;
    player.y += player.dy;

    if (player.x < 0) player.x = 0;
    if (player.x + player.width > phase.levelWidth) player.x = phase.levelWidth - player.width;

    player.grounded = false;
    for (let plat of currentLevel.platforms) {
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

            currentLevel.enemies.forEach(enemy => {
                if (enemy.active && enemy.state !== 'hit' && rectIntersect(p.x, p.y, p.w, p.h, enemy.x, enemy.y, enemy.w, enemy.h)) {
                    enemy.state = 'hit'; enemy.hitTimer = 16; p.active = false; score += 50; playEnemyHitSfx(); updateHUD();
                }
            });

            if (currentLevel.boss.active && rectIntersect(p.x, p.y, p.w, p.h, currentLevel.boss.x, currentLevel.boss.y, currentLevel.boss.w, currentLevel.boss.h)) {
                currentLevel.boss.health -= 15; p.active = false; playBossHitSfx();
                currentLevel.boss.hitFlash = 10;
                if (currentLevel.boss.health <= 0) triggerVictory();
            }
        }
    });

    // ataques à distância do chefão (fase 2 / bossType 'ranged')
    bossProjectiles.forEach(bp => {
        if (!bp.active) return;
        bp.x += bp.speed;
        bp.wavePhase = (bp.wavePhase || 0) + 0.4;
        if (bp.x < cameraX - 100 || bp.x > cameraX + canvas.width + 100) { bp.active = false; return; }
        if (player.invulnerableTimer === 0 && rectIntersect(bp.x, bp.y, bp.w, bp.h, player.x, player.y, player.width, player.height)) {
            player.health -= 15; player.invulnerableTimer = 50; bp.active = false; playPlayerHurtSfx();
        }
    });
    bossProjectiles = bossProjectiles.filter(bp => bp.active);

    let pCenterX = player.x + player.width / 2;
    let pCenterY = player.y + player.height / 2;

    currentLevel.collectibles.forEach(item => {
        if (!item.collected && Math.abs(pCenterX - item.x) < 30 && Math.abs(pCenterY - item.y) < 34) {
            item.collected = true;
            if (item.type === phase.specialItem.type) {
                player.maxAmmo += phase.specialItem.bonusAmmo;
                player.ammo += phase.specialItem.bonusAmmo;
                score += phase.specialItem.bonusScore;
                playSpecialItemSfx();
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
    currentLevel.enemies.forEach(enemy => {
        if (!enemy.active) return;

        if (enemy.state === 'hit') {
            enemy.hitTimer--;
            if (enemy.hitTimer <= 0) enemy.active = false;
            return;
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

    if (player.x > phase.bossTriggerX && !bossFightActive) { bossFightActive = true; updateHUD(); }

    let boss = currentLevel.boss;
    if (boss.hitFlash > 0) boss.hitFlash--;

    if (bossFightActive && boss.active) {
        if (phase.bossType === 'melee') {
            updateMeleeBoss(boss, pCenterX, pCenterY);
        } else {
            updateRangedBoss(boss, pCenterX, pCenterY);
        }

        if (player.state === PLAYER_STATES.ATTACK_SONIC && Math.hypot(pCenterX - (boss.x + boss.w / 2), pCenterY - (boss.y + boss.h / 2)) < player.attackRadius) {
            boss.health -= 2;
            boss.hitFlash = 10;
            if (boss.health <= 0) triggerVictory();
        }

        if (player.invulnerableTimer === 0 && rectIntersect(player.x, player.y, player.width, player.height, boss.x, boss.y, boss.w, boss.h)) {
            const dmg = phase.bossType === 'melee' ? 30 : 20;
            player.health -= dmg; player.invulnerableTimer = 60; player.dx = -15; player.dy = -5;
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
        if (cameraX > phase.levelWidth - canvas.width) cameraX = phase.levelWidth - canvas.width;
    } else {
        cameraX = phase.levelWidth - canvas.width;
        if (player.x < cameraX) player.x = cameraX;
    }
}

// --- IA do chefão corpo-a-corpo (Metrônomo Executor, fase 1) ---
function updateMeleeBoss(boss, pCenterX, pCenterY) {
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
            boss.dir = (playerXLessThan(boss.x)) ? -1 : 1;
        }
    } else if (boss.mode === 'dash') {
        boss.x += boss.speed * 3.2 * boss.dir;
        if (boss.x < 6880) { boss.x = 6880; boss.mode = 'patrol'; boss.modeTimer = 0; }
        if (boss.x > 7420) { boss.x = 7420; boss.mode = 'patrol'; boss.modeTimer = 0; }
        if (boss.modeTimer > 40) { boss.mode = 'patrol'; boss.modeTimer = 0; }
    }
}
function playerXLessThan(x) { return player.x < x; }

// --- IA do chefão à distância (Pierre Autotune, fase 2) ---
function updateRangedBoss(boss, pCenterX, pCenterY) {
    const enraged = boss.health < boss.maxHealth * 0.5;
    const patrolMin = 6950, patrolMax = 7350;

    if (boss.mode === 'patrol') {
        boss.x += boss.speed * boss.dir;
        if (boss.x < patrolMin) boss.dir = 1;
        if (boss.x > patrolMax) boss.dir = -1;
        boss.singTimer--;
        if (boss.singTimer <= 0) { boss.mode = 'singing'; boss.modeTimer = 0; }
    } else if (boss.mode === 'singing') {
        boss.modeTimer++;
        if (boss.modeTimer === 18) {
            const dirToPlayer = pCenterX < boss.x ? -1 : 1;
            bossProjectiles.push({
                x: boss.x + boss.w / 2, y: boss.y + 80, w: 30, h: 18,
                speed: (enraged ? 7.5 : 6) * dirToPlayer, dir: dirToPlayer, active: true, wavePhase: 0
            });
            playSingSfx();
        }
        if (boss.modeTimer > 42) {
            boss.mode = 'patrol'; boss.modeTimer = 0;
            boss.singTimer = enraged ? 75 : 130;
        }
    }
}

function triggerVictory() {
    if (currentState === GAME_STATE.VICTORY) return;
    currentLevel.boss.active = false;
    currentState = GAME_STATE.VICTORY;
    bgMusic.pause();
    stopMetronomeLoop();
    playVictorySfx();
    // o personagem de fundo (Teddy / Adriano) fica feliz quando o vilão é derrotado
    const phase = PHASES[currentPhaseIndex];
    activeCharVideo = phase.charHappy;
    phase.charSad.pause();
    trySafePlay(phase.charHappy);
    updateTouchControlsVisibility();
}

/* ======================================================================
   DESENHO
====================================================================== */

// Fundo — fase 1 repete o bar lado a lado até a arena do chefão (onde dá lugar à
// cena do palco); fase 2 usa uma única imagem já do tamanho exato do nível.
function drawBackground() {
    const phase = PHASES[currentPhaseIndex];

    if (phase.bgMode === 'single') {
        const img = phase.bgSingle;
        if (!img.complete || !img.naturalWidth) return;
        const rx = -cameraX;
        ctx.drawImage(img, 0, 0, img.width, img.height, rx, 0, phase.levelWidth, canvas.height);
        drawSeamVignettes(phase);
        return;
    }

    // bgMode 'tile'
    if (!phase.bgTile.complete || !phase.bgTile.naturalWidth) return;
    const stageImg = phase.bgStage;

    if (cameraX >= phase.stageWorldStart - canvas.width) {
        if (stageImg.complete && stageImg.naturalWidth) {
            const stageX = phase.stageWorldStart - cameraX;
            ctx.drawImage(stageImg, 0, 0, stageImg.width, stageImg.height, stageX, 0, canvas.width, canvas.height);
            if (stageX > 0) {
                const tileW = phase.bgTile.width * (canvas.height / phase.bgTile.height);
                ctx.drawImage(phase.bgTile, 0, 0, phase.bgTile.width, phase.bgTile.height, stageX - tileW, 0, tileW, canvas.height);
            }
        }
        drawSeamVignettes(phase);
        return;
    }

    const tileW = phase.bgTile.width * (canvas.height / phase.bgTile.height);
    let startX = -(cameraX % tileW);
    if (startX > 0) startX -= tileW;
    for (let x = startX; x < canvas.width; x += tileW) {
        ctx.drawImage(phase.bgTile, 0, 0, phase.bgTile.width, phase.bgTile.height, x, 0, tileW, canvas.height);
    }
    drawSeamVignettes(phase);
}

const SEAM_FADE_W = 220; // largura (em px de tela) da vinheta que disfarça uma emenda pontual
function drawSeamVignettes(phase) {
    (phase.seams || []).forEach(worldX => {
        const seamX = worldX - cameraX;
        if (seamX < -SEAM_FADE_W || seamX > canvas.width + SEAM_FADE_W) return;
        const grad = ctx.createLinearGradient(seamX - SEAM_FADE_W / 2, 0, seamX + SEAM_FADE_W / 2, 0);
        grad.addColorStop(0, 'rgba(4,3,5,0)');
        grad.addColorStop(0.5, 'rgba(4,3,5,0.85)');
        grad.addColorStop(1, 'rgba(4,3,5,0)');
        ctx.fillStyle = grad;
        ctx.fillRect(seamX - SEAM_FADE_W / 2, 0, SEAM_FADE_W, canvas.height);
    });
    // a emenda bar→palco da fase 1 usa a mesma técnica, ancorada no início do palco
    if (phase.bgMode === 'tile') {
        const seamX = phase.stageWorldStart - cameraX;
        if (seamX >= -SEAM_FADE_W && seamX <= canvas.width + SEAM_FADE_W) {
            const grad = ctx.createLinearGradient(seamX - SEAM_FADE_W / 2, 0, seamX + SEAM_FADE_W / 2, 0);
            grad.addColorStop(0, 'rgba(4,3,5,0)');
            grad.addColorStop(0.5, 'rgba(4,3,5,0.85)');
            grad.addColorStop(1, 'rgba(4,3,5,0)');
            ctx.fillStyle = grad;
            ctx.fillRect(seamX - SEAM_FADE_W / 2, 0, SEAM_FADE_W, canvas.height);
        }
    }
}

// Personagem animado ao fundo do palco (vídeo com fundo removido) — Teddy na fase 1,
// "Adriano" (AZT) na fase 2. Triste/bravo até o item especial ser recuperado, feliz na vitória.
function drawPhaseChar() {
    const phase = PHASES[currentPhaseIndex];
    const vid = activeCharVideo;
    if (!vid || vid.readyState < 2) return;
    const cw = phase.charWorld;
    const h = cw.h;
    const w = h * cw.aspect;
    const rx = cw.x - cameraX;
    if (rx < -w - 50 || rx > canvas.width + 50) return;
    ctx.drawImage(vid, rx, cw.y - h, w, h);
}

// Amplificadores Marshall com a arte real (só fase 1 — fase 2 já tem os amps na própria arte)
function drawMarshallAmps() {
    currentLevel.platforms.forEach(plat => {
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

// Case de equipamento (plataforma "escondida" com o item especial em cima)
function drawGearCase() {
    currentLevel.platforms.forEach(plat => {
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
    const phase = PHASES[currentPhaseIndex];
    let screenX = item.x - cameraX;
    if (screenX < -60 || screenX > canvas.width + 60) return;

    const bob = Math.sin((frameCount + item.x) * 0.06) * 5;
    const y = item.y + bob;

    if (item.type === phase.specialItem.type) {
        // item especial/escondido — halo pulsante + sinalizador quando o jogador está perto
        const special = phase.specialItem;
        const pulse = 0.55 + 0.35 * Math.sin(frameCount * 0.12);
        ctx.save();
        ctx.shadowColor = '#f1c40f';
        ctx.shadowBlur = 22 * pulse;
        if (special.img.complete && special.img.naturalWidth > 0) {
            const h = 46, w = h * special.aspect;
            ctx.drawImage(special.img, screenX - w / 2, y - h / 2, w, h);
        }
        ctx.restore();

        ctx.save();
        ctx.globalAlpha = pulse;
        ctx.strokeStyle = '#f1c40f'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(screenX, y, 30 + pulse * 4, 0, Math.PI * 2); ctx.stroke();
        ctx.restore();

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
    currentLevel.enemies.forEach(enemy => {
        if (!enemy.active) return;
        let sx = enemy.x - cameraX;
        if (sx < -120 || sx > canvas.width + 120) return;

        if (!quantSheet.complete || !quantSheet.naturalWidth) {
            ctx.fillStyle = "#9b59b6"; ctx.fillRect(sx, enemy.y, enemy.w, enemy.h);
            return;
        }

        let frameIdx;
        if (enemy.state === 'hit') {
            frameIdx = (Math.floor(enemy.hitTimer / 4) % 2 === 0) ? 4 : 0;
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

// Onda sonora do Pierre Autotune — zigue-zague rosa/verde viajando até o jogador
function drawBossProjectiles() {
    bossProjectiles.forEach(bp => {
        if (!bp.active) return;
        const sx = bp.x - cameraX;
        if (sx < -60 || sx > canvas.width + 60) return;
        ctx.save();
        ctx.translate(sx, bp.y + bp.h / 2);
        [['#ff2fa0', 1], ['#7CFC00', -1]].forEach(([color, sign]) => {
            ctx.beginPath();
            ctx.moveTo(-bp.w / 2, 0);
            const segs = 5;
            for (let i = 0; i <= segs; i++) {
                const px = -bp.w / 2 + (bp.w * i) / segs;
                const py = sign * Math.sin(bp.wavePhase + i * 1.3) * 9;
                ctx.lineTo(px, py);
            }
            ctx.strokeStyle = color; ctx.lineWidth = 3; ctx.stroke();
        });
        ctx.restore();
    });
}

function drawBoss() {
    const phase = PHASES[currentPhaseIndex];
    const boss = currentLevel.boss;
    if (!boss.active && phase.bossType !== 'ranged') return; // metrônomo some ao morrer (efeito já coberto pela vitória)

    if (phase.bossType === 'melee') {
        drawBossTelegraph(boss);
        if (metronomoConfig.frameW > 0) {
            ctx.save();
            let bossFacing = (boss.dir === 1) ? 1 : -1;
            ctx.translate(boss.x - cameraX + (bossFacing === -1 ? boss.w : 0), boss.y);
            ctx.scale(bossFacing, 1);
            ctx.drawImage(metronomoSheet,
                metronomoConfig.currentFrameX * metronomoConfig.frameW, metronomoConfig.currentFrameY * metronomoConfig.frameH,
                metronomoConfig.frameW, metronomoConfig.frameH, 0, 0, boss.w, boss.h);
            ctx.restore();
        } else {
            ctx.fillStyle = "rgba(231, 76, 60, 0.5)";
            ctx.fillRect(boss.x - cameraX, boss.y, boss.w, boss.h);
        }
    } else {
        if (!boss.active) return; // Pierre derrotado: sem sprite após a queda (vitória assume a cena)
        if (pierreConfig.frameW > 0) {
            ctx.save();
            let bossFacing = (boss.dir === 1) ? 1 : -1;
            ctx.translate(boss.x - cameraX + (bossFacing === -1 ? boss.w : 0), boss.y);
            ctx.scale(bossFacing, 1);
            ctx.drawImage(pierreSheet,
                pierreConfig.currentFrameX * pierreConfig.frameW, 0,
                pierreConfig.frameW, pierreConfig.frameH, 0, 0, boss.w, boss.h);
            ctx.restore();
        } else {
            ctx.fillStyle = "rgba(231, 76, 60, 0.5)";
            ctx.fillRect(boss.x - cameraX, boss.y, boss.w, boss.h);
        }
    }
}

function draw() {
    const phase = PHASES[currentPhaseIndex];

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
        drawPhaseChar();

        const grad = ctx.createRadialGradient(canvas.width / 2, canvas.height / 2, 90, canvas.width / 2, canvas.height / 2, canvas.width * 0.72);
        grad.addColorStop(0, 'rgba(0,0,0,0.12)');
        grad.addColorStop(1, 'rgba(0,0,0,0.88)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.textAlign = 'center';
        ctx.fillStyle = "#2ecc71"; ctx.font = "26px 'Press Start 2P'";
        ctx.fillText(phase.victoryTitle, canvas.width / 2, 80);
        ctx.fillStyle = "#ffffff"; ctx.font = "12px 'Press Start 2P'";
        ctx.fillText("Pressione espaço ou toque!", canvas.width / 2, canvas.height - 50);
        ctx.textAlign = 'left';
        return;
    }

    if (currentState === GAME_STATE.GAME_COMPLETE) {
        ctx.fillStyle = "#050505";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.textAlign = 'center';
        ctx.fillStyle = "#f1c40f"; ctx.font = "24px 'Press Start 2P'";
        ctx.fillText("L.O.S.S COMPLETO!", canvas.width / 2, 260);
        ctx.fillStyle = "#ffffff"; ctx.font = "11px 'Press Start 2P'";
        ctx.fillText("Robustus devolveu a música ao mundo.", canvas.width / 2, 310);
        ctx.fillStyle = "#3498db"; ctx.font = "12px 'Press Start 2P'";
        ctx.fillText("Pressione espaço ou toque para voltar ao menu", canvas.width / 2, 380);
        ctx.textAlign = 'left';
        return;
    }

    if (currentState !== GAME_STATE.PLAYING) return;

    drawBackground();
    drawPhaseChar();
    drawGearCase();
    drawMarshallAmps();

    currentLevel.collectibles.forEach(item => { if (!item.collected) drawCollectibleIcon(item); });

    drawEnemies();

    ctx.fillStyle = "#00ffff";
    projectiles.forEach(p => { if (p.active) ctx.fillRect(p.x - cameraX, p.y, p.w, p.h); });
    drawBossProjectiles();

    drawBoss();

    if (player.invulnerableTimer === 0 || Math.floor(player.invulnerableTimer / 5) % 2 === 0) {
        const showThinker = player.state === PLAYER_STATES.IDLE &&
            player.tedioTimer >= THINKER_DELAY &&
            robustusThinker.complete && robustusThinker.naturalWidth > 0;

        if (showThinker) {
            const h = player.height * 1.05;
            const w = h * thinkerAspect;
            const feetX = player.x - cameraX + player.width / 2;
            const feetY = player.y + player.height;
            ctx.save();
            ctx.translate(feetX, feetY);
            ctx.scale(player.facing, 1);
            ctx.drawImage(robustusThinker, -w / 2, -h, w, h);
            ctx.restore();
        } else if (spriteConfig.frameW > 0) {
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

    if (bossFightActive && currentLevel.boss.active) {
        ctx.fillStyle = "#000"; ctx.fillRect(400, 60, 360, 15);
        ctx.fillStyle = "#e74c3c"; ctx.fillRect(402, 62, (currentLevel.boss.health / currentLevel.boss.maxHealth) * 356, 11);
    }
}

let activeCharVideo = angryTeddyVideo;

function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

applyMusicMute();
updateTouchControlsVisibility();
gameLoop();
