document.addEventListener("DOMContentLoaded", function () {
  "use strict";

  // ==================== CONSTANTS ====================
  
  const STORAGE_KEY = "wheelOfDeciding.v1";
  const SOUND_KEY = "wheelOfDeciding.sound";
  const VOLUME_KEY = "wheelOfDeciding.volume";
  const MAX_OPTIONS = 64;

  const COLORS = [
    { solid: "#f97316", gradient: ["#f97316", "#fb923c"], glow: "rgba(249, 115, 22, 0.6)" },
    { solid: "#22c55e", gradient: ["#22c55e", "#4ade80"], glow: "rgba(34, 197, 94, 0.6)" },
    { solid: "#3b82f6", gradient: ["#3b82f6", "#60a5fa"], glow: "rgba(59, 130, 246, 0.6)" },
    { solid: "#e11d48", gradient: ["#e11d48", "#fb7185"], glow: "rgba(225, 29, 72, 0.6)" },
    { solid: "#a855f7", gradient: ["#a855f7", "#c4b5fd"], glow: "rgba(168, 85, 247, 0.6)" },
    { solid: "#06b6d4", gradient: ["#06b6d4", "#22d3ee"], glow: "rgba(6, 182, 212, 0.6)" },
    { solid: "#eab308", gradient: ["#eab308", "#facc15"], glow: "rgba(234, 179, 8, 0.6)" },
    { solid: "#ec4899", gradient: ["#ec4899", "#f472b6"], glow: "rgba(236, 72, 153, 0.6)" },
    { solid: "#14b8a6", gradient: ["#14b8a6", "#2dd4bf"], glow: "rgba(20, 184, 166, 0.6)" },
    { solid: "#8b5cf6", gradient: ["#8b5cf6", "#a78bfa"], glow: "rgba(139, 92, 246, 0.6)" },
    { solid: "#f43f5e", gradient: ["#f43f5e", "#fb7185"], glow: "rgba(244, 63, 94, 0.6)" },
    { solid: "#0ea5e9", gradient: ["#0ea5e9", "#38bdf8"], glow: "rgba(14, 165, 233, 0.6)" }
  ];

  // ==================== DOM ELEMENTS ====================
  
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);
  
  const canvas = $("#wheelCanvas");
  const ctx = canvas?.getContext("2d");
  const particleCanvas = $("#particleCanvas");
  const particleCtx = particleCanvas?.getContext("2d");
  const confettiCanvas = $("#confettiCanvas");
  const confettiCtx = confettiCanvas?.getContext("2d");
  
  const spinButton = $("#spinButton");
  const resetButton = $("#resetButton");
  const resultDisplay = $("#resultDisplay");
  const resultLabel = $(".result-label");
  const resultValue = $(".result-value");
  const historyList = $("#historyList");
  const clearHistoryBtn = $("#clearHistoryBtn");
  const optionForm = $("#optionForm");
  const wheelNameInput = $("#wheelName");
  const newOptionInput = $("#newOptionInput");
  const optionsList = $("#optionsList");
  const optionCountEl = $("#optionCount");
  const shareLinkInput = $("#shareLink");
  const copyShareLinkButton = $("#copyShareLinkButton");
  const shareToast = $("#shareCopyToast");
  const soundToggle = $("#soundToggle");
  const volumeSlider = $("#volumeSlider");
  const volumeValue = $("#volumeValue");
  const volumeControl = $(".volume-control");
  const wheelFrame = $(".wheel-frame");
  const wheelSparkles = $("#wheelSparkles");
  const studioAudience = $("#studioAudience");

  // ==================== STATE ====================

  const state = {
    wheelName: "What should we do?",
    options: [],
    history: [],
    isSpinning: false,
    rotation: 0,
    soundEnabled: true,
    volume: 0.7
  };

  // ==================== AUDIO ENGINE ====================
  
  let audioCtx = null;
  let masterGain = null;
  
  function getAudioContext() {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      masterGain = audioCtx.createGain();
      masterGain.connect(audioCtx.destination);
      masterGain.gain.value = state.volume;
    }
    if (audioCtx.state === "suspended") {
      audioCtx.resume();
    }
    return audioCtx;
  }
  
  function setVolume(vol) {
    state.volume = Math.max(0, Math.min(1, vol)); // Clamp between 0 and 1
    // Ensure audio context is initialized
    const ctx = getAudioContext();
    if (masterGain) {
      masterGain.gain.value = state.volume;
    }
  }

  // Wheel of Fortune style tick - the iconic "clicker" sound
  function playTick(speed = 1) {
    if (!state.soundEnabled) return;
    try {
      const ctx = getAudioContext();
      const now = ctx.currentTime;
      
      // The Wheel of Fortune tick is a sharp, woody "tock" sound
      // It's created by the pegs hitting the leather flapper
      
      // Main click - sharp transient
      const click = ctx.createOscillator();
      const clickGain = ctx.createGain();
      const clickFilter = ctx.createBiquadFilter();
      
      // Square wave for sharp attack, specific frequency for that "tock"
      click.type = "square";
      click.frequency.setValueAtTime(1800, now);
      click.frequency.exponentialRampToValueAtTime(400, now + 0.008);
      
      clickFilter.type = "bandpass";
      clickFilter.frequency.value = 1200;
      clickFilter.Q.value = 2;
      
      clickGain.gain.setValueAtTime(0.35, now);
      clickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.025);
      
      click.connect(clickFilter);
      clickFilter.connect(clickGain);
      clickGain.connect(masterGain);
      
      click.start(now);
      click.stop(now + 0.03);
      
      // Resonant body - gives it that hollow "clack" character
      const body = ctx.createOscillator();
      const bodyGain = ctx.createGain();
      const bodyFilter = ctx.createBiquadFilter();
      
      body.type = "triangle";
      body.frequency.setValueAtTime(800, now);
      body.frequency.exponentialRampToValueAtTime(200, now + 0.04);
      
      bodyFilter.type = "bandpass";
      bodyFilter.frequency.value = 600;
      bodyFilter.Q.value = 3;
      
      bodyGain.gain.setValueAtTime(0.25, now);
      bodyGain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
      
      body.connect(bodyFilter);
      bodyFilter.connect(bodyGain);
      bodyGain.connect(masterGain);
      
      body.start(now);
      body.stop(now + 0.05);
      
      // Subtle high "ting" for brightness
      const ting = ctx.createOscillator();
      const tingGain = ctx.createGain();
      
      ting.type = "sine";
      ting.frequency.value = 2800;
      
      tingGain.gain.setValueAtTime(0.08, now);
      tingGain.gain.exponentialRampToValueAtTime(0.001, now + 0.015);
      
      ting.connect(tingGain);
      tingGain.connect(masterGain);
      
      ting.start(now);
      ting.stop(now + 0.02);
    } catch (e) {}
  }

  // Wheel of Fortune style spin start - exciting "here we go!" feel
  function playSpinStart() {
    if (!state.soundEnabled) return;
    try {
      const ctx = getAudioContext();
      const now = ctx.currentTime;
      
      // Quick ascending "whomp" like the wheel being pushed
      const whomp = ctx.createOscillator();
      const whompGain = ctx.createGain();
      const whompFilter = ctx.createBiquadFilter();
      
      whomp.type = "sawtooth";
      whomp.frequency.setValueAtTime(80, now);
      whomp.frequency.exponentialRampToValueAtTime(250, now + 0.15);
      
      whompFilter.type = "lowpass";
      whompFilter.frequency.setValueAtTime(200, now);
      whompFilter.frequency.exponentialRampToValueAtTime(800, now + 0.15);
      
      whompGain.gain.setValueAtTime(0.4, now);
      whompGain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
      
      whomp.connect(whompFilter);
      whompFilter.connect(whompGain);
      whompGain.connect(masterGain);
      whomp.start(now);
      whomp.stop(now + 0.2);
      
      // Bright "ding" accent
      const ding = ctx.createOscillator();
      const dingGain = ctx.createGain();
      
      ding.type = "sine";
      ding.frequency.value = 880;
      
      dingGain.gain.setValueAtTime(0.2, now + 0.05);
      dingGain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
      
      ding.connect(dingGain);
      dingGain.connect(masterGain);
      ding.start(now + 0.05);
      ding.stop(now + 0.3);
    } catch (e) {}
  }

  // Spinning ambience functions (disabled - just ticks now)
  function startSpinAmbience() {}
  function stopSpinAmbience() {}
  function updateSpinAmbience(speed) {}

  // Wheel of Fortune style win sound - bell dings and celebration
  function playWinSound() {
    if (!state.soundEnabled) return;
    try {
      const ctx = getAudioContext();
      const now = ctx.currentTime;
      
      // Main "DING DING DING!" bells (the iconic WoF sound)
      const bellFreqs = [1318.51, 1567.98, 2093.00]; // E6, G6, C7
      
      bellFreqs.forEach((freq, i) => {
        const bell = ctx.createOscillator();
        const bellGain = ctx.createGain();
        const bellFilter = ctx.createBiquadFilter();
        
        bell.type = "sine";
        bell.frequency.value = freq;
        
        // Bell-like filter resonance
        bellFilter.type = "bandpass";
        bellFilter.frequency.value = freq;
        bellFilter.Q.value = 15;
        
        const start = now + i * 0.12;
        bellGain.gain.setValueAtTime(0, start);
        bellGain.gain.linearRampToValueAtTime(0.35, start + 0.005);
        bellGain.gain.exponentialRampToValueAtTime(0.001, start + 0.6);
        
        bell.connect(bellFilter);
        bellFilter.connect(bellGain);
        bellGain.connect(masterGain);
        
        bell.start(start);
        bell.stop(start + 0.6);
        
        // Add harmonic overtone for richness
        const overtone = ctx.createOscillator();
        const overtoneGain = ctx.createGain();
        overtone.type = "sine";
        overtone.frequency.value = freq * 2.5;
        overtoneGain.gain.setValueAtTime(0, start);
        overtoneGain.gain.linearRampToValueAtTime(0.08, start + 0.005);
        overtoneGain.gain.exponentialRampToValueAtTime(0.001, start + 0.3);
        overtone.connect(overtoneGain);
        overtoneGain.connect(masterGain);
        overtone.start(start);
        overtone.stop(start + 0.3);
      });
      
      // Bright celebratory "sparkle" cascade
      for (let i = 0; i < 8; i++) {
        setTimeout(() => {
          try {
            const sparkle = ctx.createOscillator();
            const sparkleGain = ctx.createGain();
            
            sparkle.type = "sine";
            sparkle.frequency.value = 2500 + i * 200 + Math.random() * 300;
            
            sparkleGain.gain.setValueAtTime(0.1, ctx.currentTime);
            sparkleGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
            
            sparkle.connect(sparkleGain);
            sparkleGain.connect(masterGain);
            sparkle.start();
            sparkle.stop(ctx.currentTime + 0.15);
          } catch (e) {}
        }, 350 + i * 50);
      }
      
      // Final triumphant chord
      setTimeout(() => {
        try {
          // C major chord (bright and happy)
          [523.25, 659.25, 783.99, 1046.50].forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            
            osc.type = "sine";
            osc.frequency.value = freq;
            
            gain.gain.setValueAtTime(0, ctx.currentTime);
            gain.gain.linearRampToValueAtTime(0.12, ctx.currentTime + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.5);
            
            osc.connect(gain);
            gain.connect(masterGain);
            osc.start();
            osc.stop(ctx.currentTime + 1.5);
          });
        } catch (e) {}
      }, 500);
    } catch (e) {}
  }

  // UI click sound
  function playClick() {
    if (!state.soundEnabled) return;
    try {
      const ctx = getAudioContext();
      const now = ctx.currentTime;
      
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = "sine";
      osc.frequency.setValueAtTime(1200, now);
      osc.frequency.exponentialRampToValueAtTime(600, now + 0.08);
      
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
      
      osc.connect(gain);
      gain.connect(masterGain);
      
      osc.start(now);
      osc.stop(now + 0.08);
    } catch (e) {}
  }

  // ==================== PARTICLE SYSTEM ====================
  
  const particles = [];
  let particleAnimFrame = null;

  class Particle {
    constructor(x, y) {
      this.x = x;
      this.y = y;
      this.size = Math.random() * 2 + 0.5;
      this.vx = (Math.random() - 0.5) * 0.3;
      this.vy = (Math.random() - 0.5) * 0.3;
      this.alpha = Math.random() * 0.5 + 0.2;
      this.hue = Math.random() * 40 + 15; // Orange tones
      this.life = Math.random() * 0.5 + 0.5;
    }

    update() {
      this.x += this.vx;
      this.y += this.vy;
      
      // Wrap around
      const w = particleCanvas.width;
      const h = particleCanvas.height;
      if (this.x < 0) this.x = w;
      if (this.x > w) this.x = 0;
      if (this.y < 0) this.y = h;
      if (this.y > h) this.y = 0;
    }

    draw() {
      particleCtx.beginPath();
      particleCtx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      particleCtx.fillStyle = `hsla(${this.hue}, 100%, 65%, ${this.alpha})`;
      particleCtx.fill();
    }
  }

  function initParticles() {
    if (!particleCanvas || !particleCtx) return;
    
    resizeParticleCanvas();
    
    const count = Math.min(60, Math.floor(window.innerWidth / 25));
    for (let i = 0; i < count; i++) {
      particles.push(new Particle(
        Math.random() * particleCanvas.width,
        Math.random() * particleCanvas.height
      ));
    }
    
    animateParticles();
  }

  // Generate studio audience
  function initAudience() {
    if (!studioAudience) return;
    
    studioAudience.innerHTML = '';
    
    // Create rows of audience members
    const rows = 3;
    const peoplePerRow = Math.floor(window.innerWidth / 50);
    
    for (let row = 0; row < rows; row++) {
      for (let i = 0; i < peoplePerRow; i++) {
        const person = document.createElement('div');
        person.className = 'audience-person';
        person.style.setProperty('--delay', Math.random() * 20);
        person.style.width = `${30 + Math.random() * 20}px`;
        person.style.height = `${50 + Math.random() * 30}px`;
        person.style.marginLeft = `${Math.random() * 10}px`;
        person.style.marginRight = `${Math.random() * 10}px`;
        studioAudience.appendChild(person);
      }
    }
  }

  function resizeParticleCanvas() {
    if (!particleCanvas) return;
    particleCanvas.width = window.innerWidth;
    particleCanvas.height = window.innerHeight;
  }

  function animateParticles() {
    if (!particleCtx) return;
    
    particleCtx.clearRect(0, 0, particleCanvas.width, particleCanvas.height);
    
    // Draw and update particles
    particles.forEach(p => {
      p.update();
      p.draw();
    });
    
    // Draw connections
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist < 120) {
          const alpha = (1 - dist / 120) * 0.15;
          particleCtx.beginPath();
          particleCtx.strokeStyle = `rgba(249, 115, 22, ${alpha})`;
          particleCtx.lineWidth = 0.5;
          particleCtx.moveTo(particles[i].x, particles[i].y);
          particleCtx.lineTo(particles[j].x, particles[j].y);
          particleCtx.stroke();
        }
      }
    }
    
    particleAnimFrame = requestAnimationFrame(animateParticles);
  }

  // ==================== CONFETTI SYSTEM ====================
  
  const confetti = [];

  class Confetto {
    constructor(x, y) {
      this.x = x;
      this.y = y;
      this.w = Math.random() * 10 + 6;
      this.h = this.w * 0.4;
      this.vx = (Math.random() - 0.5) * 20;
      this.vy = Math.random() * -18 - 8;
      this.gravity = 0.4;
      this.rotation = Math.random() * 360;
      this.rotationSpeed = (Math.random() - 0.5) * 15;
      this.color = `hsl(${Math.random() * 360}, 90%, 60%)`;
      this.alpha = 1;
      this.wobble = Math.random() * 10;
    }

    update() {
      this.x += this.vx + Math.sin(this.wobble) * 2;
      this.vy += this.gravity;
      this.y += this.vy;
      this.rotation += this.rotationSpeed;
      this.vx *= 0.99;
      this.wobble += 0.1;
      this.alpha -= 0.006;
    }

    draw() {
      confettiCtx.save();
      confettiCtx.translate(this.x, this.y);
      confettiCtx.rotate((this.rotation * Math.PI) / 180);
      confettiCtx.globalAlpha = Math.max(0, this.alpha);
      confettiCtx.fillStyle = this.color;
      confettiCtx.fillRect(-this.w / 2, -this.h / 2, this.w, this.h);
      confettiCtx.restore();
    }

    isDead() {
      return this.alpha <= 0 || this.y > confettiCanvas.height + 100;
    }
  }

  function resizeConfettiCanvas() {
    if (!confettiCanvas) return;
    confettiCanvas.width = window.innerWidth;
    confettiCanvas.height = window.innerHeight;
  }

  function launchConfetti() {
    if (!confettiCanvas || !confettiCtx) return;
    
    resizeConfettiCanvas();
    
    // Launch points
    const sources = [
      { x: confettiCanvas.width * 0.2, y: confettiCanvas.height + 50 },
      { x: confettiCanvas.width * 0.5, y: confettiCanvas.height + 50 },
      { x: confettiCanvas.width * 0.8, y: confettiCanvas.height + 50 }
    ];
    
    sources.forEach(src => {
      for (let i = 0; i < 40; i++) {
        confetti.push(new Confetto(
          src.x + (Math.random() - 0.5) * 80,
          src.y
        ));
      }
    });
    
    // From wheel center
    if (canvas) {
      const rect = canvas.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      
      for (let i = 0; i < 60; i++) {
        const c = new Confetto(cx, cy);
        c.vx = (Math.random() - 0.5) * 30;
        c.vy = Math.random() * -25 - 10;
        confetti.push(c);
      }
    }
    
    animateConfetti();
  }

  function animateConfetti() {
    if (!confettiCtx || confetti.length === 0) return;
    
    confettiCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
    
    for (let i = confetti.length - 1; i >= 0; i--) {
      confetti[i].update();
      confetti[i].draw();
      
      if (confetti[i].isDead()) {
        confetti.splice(i, 1);
      }
    }
    
    if (confetti.length > 0) {
      requestAnimationFrame(animateConfetti);
    }
  }

  // ==================== SPARKLE EFFECTS ====================
  
  function createSparkle(x, y, container) {
    const sparkle = document.createElement("div");
    sparkle.style.cssText = `
      position: absolute;
      left: ${x}px;
      top: ${y}px;
      width: 4px;
      height: 4px;
      background: white;
      border-radius: 50%;
      pointer-events: none;
      box-shadow: 0 0 6px 2px rgba(255, 255, 255, 0.8);
      animation: sparkle-fade 0.6s ease-out forwards;
    `;
    container.appendChild(sparkle);
    setTimeout(() => sparkle.remove(), 600);
  }

  // Add sparkle animation
  const sparkleStyle = document.createElement("style");
  sparkleStyle.textContent = `
    @keyframes sparkle-fade {
      0% { transform: scale(0); opacity: 1; }
      50% { transform: scale(1.5); opacity: 1; }
      100% { transform: scale(0); opacity: 0; }
    }
  `;
  document.head.appendChild(sparkleStyle);

  // ==================== UTILITIES ====================
  
  function random() {
    if (window.crypto?.getRandomValues) {
      const arr = new Uint32Array(1);
      crypto.getRandomValues(arr);
      return arr[0] / (0xffffffff + 1);
    }
    return Math.random();
  }

  function normalizeAngle(angle) {
    const TWO_PI = Math.PI * 2;
    return ((angle % TWO_PI) + TWO_PI) % TWO_PI;
  }

  function getColor(index) {
    if (index < COLORS.length) return COLORS[index];
    const hue = (index * 47) % 360;
    return {
      solid: `hsl(${hue}, 75%, 55%)`,
      gradient: [`hsl(${hue}, 75%, 55%)`, `hsl(${hue}, 85%, 70%)`],
      glow: `hsla(${hue}, 75%, 55%, 0.6)`
    };
  }

  // ==================== STATE MANAGEMENT ====================
  
  function seedDefaults() {
    state.wheelName = "What should we do?";
    state.options = [
      { id: "opt-yes", label: "Yes", color: getColor(0) },
      { id: "opt-no", label: "No", color: getColor(1) },
      { id: "opt-maybe", label: "Maybe", color: getColor(2) }
    ];
    state.history = [];
    state.rotation = 0;
  }

  function loadFromUrl() {
    try {
      const params = new URLSearchParams(location.search);
      const encoded = params.get("wheel");
      if (!encoded) return null;
      
      const data = JSON.parse(decodeURIComponent(encoded));
      if (!data?.options?.length) return null;
      
      const name = (data.name || "Shared wheel").trim().slice(0, 60);
      const options = data.options
        .map((label, i) => {
          const text = String(label || "").trim().slice(0, 80);
          if (!text) return null;
          return {
            id: `opt-shared-${Date.now().toString(36)}-${i}`,
            label: text,
            color: getColor(i)
          };
        })
        .filter(Boolean);
      
      return options.length ? { wheelName: name, options } : null;
    } catch (e) {
      return null;
    }
  }

  function loadState() {
    const shared = loadFromUrl();
    if (shared) {
      Object.assign(state, shared, { history: [], rotation: 0 });
      return;
    }

    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        seedDefaults();
        return;
      }
      
      const data = JSON.parse(raw);
      state.wheelName = (data.wheelName || "What should we do?").slice(0, 60);
      
      if (data.options?.length) {
        state.options = data.options
          .map((opt, i) => {
            const label = opt?.label?.trim().slice(0, 80);
            if (!label) return null;
            return {
              id: opt.id || `opt-${i}-${Date.now().toString(36)}`,
              label,
              color: getColor(i)
            };
          })
          .filter(Boolean);
      }
      
      if (!state.options.length) seedDefaults();
      
      state.history = (data.history || [])
          .slice(0, 30)
        .filter(e => e?.result?.trim())
        .map(e => ({ ts: e.ts || Date.now(), result: e.result }));
    } catch (e) {
      seedDefaults();
    }
  }

  function loadSoundPref() {
    try {
      const savedSound = localStorage.getItem(SOUND_KEY);
      state.soundEnabled = savedSound !== "false";
      
      const savedVolume = localStorage.getItem(VOLUME_KEY);
      if (savedVolume !== null) {
        state.volume = parseFloat(savedVolume) || 0.7;
      }
      
      updateSoundUI();
      updateVolumeUI();
    } catch (e) {}
  }

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        wheelName: state.wheelName,
        options: state.options.map(o => ({ id: o.id, label: o.label })),
        history: state.history.slice(0, 30)
      }));
    } catch (e) {}
  }

  function saveSoundPref() {
    try {
      localStorage.setItem(SOUND_KEY, state.soundEnabled);
      localStorage.setItem(VOLUME_KEY, state.volume);
    } catch (e) {}
  }

  // ==================== RENDERING ====================
  
  function render() {
    renderWheelName();
    renderOptions();
    renderHistory();
    renderResult();
    renderWheel();
    updateShareLink();
  }

  function renderWheelName() {
    if (wheelNameInput) wheelNameInput.value = state.wheelName;
  }

  function renderOptions() {
    if (!optionsList) return;

    optionsList.innerHTML = "";

    if (!state.options.length) {
      optionsList.innerHTML = `<li class="options-list-empty">No options yet. Add your first choice above!</li>`;
      if (optionCountEl) optionCountEl.textContent = "0";
      return;
    }

    state.options.forEach((opt, i) => {
      const li = document.createElement("li");
      li.className = "options-list-item";
      li.innerHTML = `
        <span class="option-index">${i + 1}.</span>
        <span class="option-color-dot" style="background-color: ${opt.color.solid}; color: ${opt.color.glow}"></span>
        <span class="option-label">${escapeHtml(opt.label)}</span>
        <button type="button" class="icon-button" data-delete="${opt.id}" aria-label="Remove ${opt.label}">×</button>
      `;
      optionsList.appendChild(li);
    });

    if (optionCountEl) optionCountEl.textContent = state.options.length;
  }

  function renderHistory() {
    if (!historyList) return;
    
    historyList.innerHTML = "";

    if (!state.history.length) {
      historyList.innerHTML = `<li class="history-empty">No spins yet. Give the wheel a spin!</li>`;
      return;
    }

    state.history.forEach(entry => {
      const li = document.createElement("li");
      li.className = "history-item";

      const time = new Date(entry.ts).toLocaleTimeString([], { 
          hour: "2-digit",
          minute: "2-digit"
        });
      
      li.innerHTML = `
        <span class="history-result">${escapeHtml(entry.result)}</span>
        <span class="history-meta">${time}</span>
      `;
      historyList.appendChild(li);
    });
  }

  function renderResult(message, isWin = false) {
    if (!resultDisplay) return;

    resultDisplay.classList.toggle("has-result", isWin || !!message);
    
    if (message) {
      if (resultLabel) resultLabel.textContent = isWin ? "🎉 The wheel chose:" : "";
      if (resultValue) resultValue.textContent = message;
    } else if (state.history[0]) {
      if (resultLabel) resultLabel.textContent = "Last spin:";
      if (resultValue) resultValue.textContent = state.history[0].result;
    } else {
      if (resultLabel) resultLabel.textContent = "Ready to spin!";
      if (resultValue) resultValue.textContent = "";
      resultDisplay.classList.remove("has-result");
    }
  }

  function updateShareLink() {
    if (!shareLinkInput) return;

    try {
      const data = {
        name: state.wheelName,
        options: state.options.map(o => o.label)
      };
      const base = location.origin + location.pathname;
      shareLinkInput.value = `${base}?wheel=${encodeURIComponent(JSON.stringify(data))}`;
    } catch (e) {
      shareLinkInput.value = "";
    }
  }

  function updateSoundUI() {
    if (soundToggle) {
      soundToggle.classList.toggle("is-muted", !state.soundEnabled);
    }
    if (volumeControl) {
      volumeControl.classList.toggle("is-muted", !state.soundEnabled);
    }
  }
  
  function updateVolumeUI() {
    if (volumeSlider) {
      const volPercent = Math.round(state.volume * 100);
      volumeSlider.value = volPercent;
      // Update CSS variable on the slider element itself
      volumeSlider.style.setProperty('--volume-percent', `${volPercent}%`);
      // Also update on the wrapper for the gradient
      const wrap = volumeSlider.closest('.volume-slider-wrap');
      if (wrap) {
        wrap.style.setProperty('--volume-percent', `${volPercent}%`);
      }
    }
    if (volumeValue) {
      volumeValue.textContent = `${Math.round(state.volume * 100)}%`;
    }
  }

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  // ==================== WHEEL RENDERING ====================

  function renderWheel() {
    if (!canvas || !ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;
    
    if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
      canvas.width = w * dpr;
      canvas.height = h * dpr;
    }

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    
    const cx = w / 2;
    const cy = h / 2;
    const radius = Math.min(w, h) / 2 - 4;
    
    // === OUTER METALLIC RIM (Classic Game Show Style) ===
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    const rimGrad = ctx.createLinearGradient(cx, cy - radius, cx, cy + radius);
    rimGrad.addColorStop(0, "#fbbf24"); // Gold top
    rimGrad.addColorStop(0.2, "#fcd34d");
    rimGrad.addColorStop(0.4, "#fef3c7"); // Bright center
    rimGrad.addColorStop(0.6, "#fcd34d");
    rimGrad.addColorStop(0.8, "#d97706");
    rimGrad.addColorStop(1, "#92400e"); // Dark bottom
    ctx.fillStyle = rimGrad;
    ctx.fill();
    
    // Rim highlight
    ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();

    // === INNER SHADOW ON RIM ===
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, radius - 8, 0, Math.PI * 2);
    ctx.fillStyle = "#0a0a0a";
    ctx.fill();
    ctx.restore();
    
    const innerRadius = radius - 10;
    
    // === EMPTY STATE ===
    if (!state.options.length) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, innerRadius, 0, Math.PI * 2);
      const emptyGrad = ctx.createRadialGradient(cx, cy - innerRadius * 0.3, 0, cx, cy, innerRadius);
      emptyGrad.addColorStop(0, "#334155");
      emptyGrad.addColorStop(1, "#1e293b");
      ctx.fillStyle = emptyGrad;
      ctx.fill();
      ctx.fillStyle = "rgba(148, 163, 184, 0.5)";
      ctx.font = "600 16px Inter, system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("Add options to spin!", cx, cy);
      ctx.restore();
      return;
    }

    const count = state.options.length;
    const sliceAngle = (Math.PI * 2) / count;

    // === DRAW SEGMENTS ===
    for (let i = 0; i < count; i++) {
      const opt = state.options[i];
      const start = state.rotation + i * sliceAngle;
      const end = start + sliceAngle;
      const mid = start + sliceAngle / 2;

      // Main segment fill with radial gradient for 3D effect
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, innerRadius, start, end);
      ctx.closePath();
      
      // Create a radial gradient from center outward for 3D depth
      const segGrad = ctx.createRadialGradient(
        cx, cy - innerRadius * 0.4, 0,  // Light source from top
        cx, cy, innerRadius
      );
      
      // Brighter, more vibrant colors for classic game show look
      const baseColor = opt.color.solid;
      segGrad.addColorStop(0, lightenColor(baseColor, 40)); // Very bright at top
      segGrad.addColorStop(0.3, lightenColor(baseColor, 20));
      segGrad.addColorStop(0.6, baseColor);
      segGrad.addColorStop(0.9, darkenColor(baseColor, 10));
      segGrad.addColorStop(1, darkenColor(baseColor, 20));
      
      ctx.fillStyle = segGrad;
      ctx.fill();
      ctx.restore();
    }
    
    // === SEGMENT DIVIDERS (Bold black lines) ===
    ctx.save();
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 3;
    for (let i = 0; i < count; i++) {
      const angle = state.rotation + i * sliceAngle;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(
        cx + Math.cos(angle) * innerRadius,
        cy + Math.sin(angle) * innerRadius
      );
      ctx.stroke();
    }
    ctx.restore();
    
    // === DRAW TEXT ON SEGMENTS (Bold, dramatic styling) ===
    for (let i = 0; i < count; i++) {
      const opt = state.options[i];
      const start = state.rotation + i * sliceAngle;
      const mid = start + sliceAngle / 2;

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(mid);
      
      // Bold, dramatic text styling
      const fontSize = Math.max(12, Math.min(16, innerRadius * 0.08));
      ctx.font = `bold ${fontSize}px 'Inter', system-ui, sans-serif`;
      ctx.textAlign = "right";
      ctx.textBaseline = "middle";
      
      const label = truncate(ctx, opt.label, innerRadius * 0.55);
      const textX = innerRadius * 0.85;
      
      // Multiple shadow layers for dramatic effect
      ctx.fillStyle = "rgba(0, 0, 0, 0.8)";
      ctx.fillText(label, textX + 2, 2);
      ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
      ctx.fillText(label, textX + 1, 1);
      
      // Main text (bright white with slight glow)
      ctx.fillStyle = "#ffffff";
      ctx.strokeStyle = "rgba(0, 0, 0, 0.3)";
      ctx.lineWidth = 0.5;
      ctx.strokeText(label, textX, 0);
      ctx.fillText(label, textX, 0);
      
      ctx.restore();
    }

    // === OUTER RING HIGHLIGHT (top) ===
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, innerRadius, Math.PI * 1.2, Math.PI * 1.8);
    ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.restore();
    
    // === CENTER HUB - Metallic look ===
    const hubRadius = innerRadius * 0.18;
    
    // Hub outer ring
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, hubRadius + 4, 0, Math.PI * 2);
    const hubRingGrad = ctx.createLinearGradient(cx, cy - hubRadius - 4, cx, cy + hubRadius + 4);
    hubRingGrad.addColorStop(0, "#fbbf24");
    hubRingGrad.addColorStop(0.3, "#fcd34d");
    hubRingGrad.addColorStop(0.5, "#fef3c7");
    hubRingGrad.addColorStop(0.7, "#fcd34d");
    hubRingGrad.addColorStop(1, "#b45309");
    ctx.fillStyle = hubRingGrad;
    ctx.fill();
    ctx.restore();
    
    // Hub main body
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, hubRadius, 0, Math.PI * 2);
    const hubGrad = ctx.createRadialGradient(cx, cy - hubRadius * 0.5, 0, cx, cy, hubRadius);
    hubGrad.addColorStop(0, "#374151");
    hubGrad.addColorStop(0.5, "#1f2937");
    hubGrad.addColorStop(1, "#111827");
    ctx.fillStyle = hubGrad;
    ctx.fill();
    ctx.restore();
    
    // Hub inner highlight
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy - hubRadius * 0.2, hubRadius * 0.4, 0, Math.PI * 2);
    const hubHighlight = ctx.createRadialGradient(cx, cy - hubRadius * 0.3, 0, cx, cy - hubRadius * 0.2, hubRadius * 0.4);
    hubHighlight.addColorStop(0, "rgba(255, 255, 255, 0.3)");
    hubHighlight.addColorStop(1, "rgba(255, 255, 255, 0)");
    ctx.fillStyle = hubHighlight;
    ctx.fill();
    ctx.restore();
  }
  
  // Helper: Lighten a hex color
  function lightenColor(hex, percent) {
    const num = parseInt(hex.replace("#", ""), 16);
    const amt = Math.round(2.55 * percent);
    const R = Math.min(255, (num >> 16) + amt);
    const G = Math.min(255, ((num >> 8) & 0x00FF) + amt);
    const B = Math.min(255, (num & 0x0000FF) + amt);
    return `rgb(${R}, ${G}, ${B})`;
  }
  
  // Helper: Darken a hex color
  function darkenColor(hex, percent) {
    const num = parseInt(hex.replace("#", ""), 16);
    const amt = Math.round(2.55 * percent);
    const R = Math.max(0, (num >> 16) - amt);
    const G = Math.max(0, ((num >> 8) & 0x00FF) - amt);
    const B = Math.max(0, (num & 0x0000FF) - amt);
    return `rgb(${R}, ${G}, ${B})`;
  }

  function truncate(ctx, text, maxW) {
    if (ctx.measureText(text).width <= maxW) return text;
    let t = text;
    while (t.length && ctx.measureText(t + "…").width > maxW) {
      t = t.slice(0, -1);
    }
    return t + "…";
  }

  // ==================== WHEEL ACTIONS ====================

  function addOption(label) {
    const trimmed = label.trim();
    if (!trimmed) return;
    
    if (state.options.length >= MAX_OPTIONS) {
      alert(`Maximum ${MAX_OPTIONS} options allowed.`);
      return;
    }
    
    playClick();
    
    state.options.push({
      id: `opt-${Date.now().toString(36)}-${Math.random().toString(16).slice(2)}`,
      label: trimmed.slice(0, 80),
      color: getColor(state.options.length)
    });
    
    saveState();
    renderOptions();
    renderWheel();
    updateShareLink();
  }

  function removeOption(id) {
    playClick();
    state.options = state.options.filter(o => o.id !== id);
    // Reassign colors
    state.options.forEach((opt, i) => {
      opt.color = getColor(i);
    });
    saveState();
    renderOptions();
    renderWheel();
    updateShareLink();
  }

  function resetWheel() {
    if (!confirm("Clear all options and start fresh?")) return;
    playClick();
    seedDefaults();
    state.rotation = 0;
    saveState();
    render();
  }

  function clearHistory() {
    if (!confirm("Clear spin history?")) return;
    playClick();
    state.history = [];
    saveState();
    renderHistory();
    renderResult();
  }

  // ==================== SPIN LOGIC ====================

  let lastTickAngle = 0;
  let lastTickTime = 0;
  let tickCooldown = 0;

  function spin() {
    if (state.isSpinning) return;
    
    if (!state.options.length) {
      alert("Add at least one option first!");
      return;
    }
    
    state.isSpinning = true;
    
    if (spinButton) {
      spinButton.disabled = true;
      spinButton.classList.add("is-spinning");
      const btnText = spinButton.querySelector(".btn-text");
      if (btnText) btnText.textContent = "SPINNING...";
    }
    
    playSpinStart();
    startSpinAmbience();
    
    const count = state.options.length;
    const sliceAngle = (Math.PI * 2) / count;
    const winIndex = Math.floor(random() * count);
    const startRot = normalizeAngle(state.rotation);
    lastTickAngle = startRot;
    lastTickTime = performance.now();
    tickCooldown = 0;
    
    const spins = 6 + Math.floor(random() * 4);
    const targetBase = -Math.PI / 2 - (winIndex * sliceAngle + sliceAngle / 2);
    const offset = (random() - 0.5) * sliceAngle * 0.7;
    const finalRot = targetBase + spins * Math.PI * 2 + offset;
    const delta = finalRot - startRot;
    
    const duration = 5500 + random() * 2000;
    const startTime = performance.now();
    
    function easeOut(t) {
      return 1 - Math.pow(1 - t, 5);
    }
    
    function frame(now) {
      const elapsed = now - startTime;
      const t = Math.min(elapsed / duration, 1);
      const eased = easeOut(t);
      const speed = 1 - t; // Speed decreases as we approach end
      
      state.rotation = startRot + delta * eased;
      renderWheel();
      
      // Update spin ambience with current speed
      updateSpinAmbience(speed);
      
      // Tick sounds - only when crossing segment boundaries
      const curr = normalizeAngle(state.rotation);
      const angleDiff = Math.abs(curr - lastTickAngle);
      
      // Calculate minimum time between ticks based on speed
      // When fast (speed near 1): short interval (30ms)
      // When slow (speed near 0): long interval (200ms)
      const minTickInterval = 30 + (200 - 30) * (1 - speed);
      const timeSinceLastTick = now - lastTickTime;
      
      // Only play tick when:
      // 1. We've crossed a significant portion of a segment (wrapped around or crossed boundary)
      // 2. Enough time has passed since last tick (prevents spam)
      const hasCrossedBoundary = angleDiff > sliceAngle * 0.5 || angleDiff < sliceAngle * 0.1;
      
      if (hasCrossedBoundary && timeSinceLastTick >= minTickInterval && t < 0.99) {
        playTick();
        lastTickAngle = curr;
        lastTickTime = now;
        
        // Sparkle effect on faster spins
        if (wheelSparkles && speed > 0.3 && Math.random() > 0.7) {
          const rect = wheelSparkles.getBoundingClientRect();
          createSparkle(
            Math.random() * rect.width,
            Math.random() * rect.height,
            wheelSparkles
          );
        }
      }
      
      if (t < 1) {
        requestAnimationFrame(frame);
      } else {
        finishSpin(winIndex);
      }
    }
    
    requestAnimationFrame(frame);
  }

  function finishSpin(winIndex) {
    state.rotation = normalizeAngle(state.rotation);
    state.isSpinning = false;
    
    // Stop spin ambience
    stopSpinAmbience();
    
    if (spinButton) {
      spinButton.disabled = false;
      spinButton.classList.remove("is-spinning");
      const btnText = spinButton.querySelector(".btn-text");
      if (btnText) btnText.textContent = "SPIN";
    }
    
    const winner = state.options[winIndex];
    if (!winner) {
      renderResult("Something went wrong. Try again!");
      return;
    }
    
    // Celebration!
    playWinSound();
    launchConfetti();
    
    // Screen shake
    document.body.classList.add("is-shaking");
    setTimeout(() => document.body.classList.remove("is-shaking"), 500);
    
    // Wheel glow
    if (wheelFrame) {
      wheelFrame.classList.add("is-celebrating");
      setTimeout(() => wheelFrame.classList.remove("is-celebrating"), 2500);
    }
    
    // Crowd excitement!
    if (studioAudience) {
      const people = studioAudience.querySelectorAll('.audience-person');
      people.forEach((person, i) => {
        setTimeout(() => {
          person.style.animation = 'none';
          person.offsetHeight; // Trigger reflow
          person.style.animation = 'audience-cheer 0.3s ease-in-out 5';
        }, i * 20);
      });
    }
    
    // Record result
    state.history.unshift({
      ts: Date.now(),
      result: winner.label
    });
    state.history = state.history.slice(0, 30);
    
    saveState();
    renderHistory();
    renderResult(winner.label, true);
  }

  function copyShareLink() {
    if (!shareLinkInput?.value) return;
    
    playClick();
    
    const text = shareLinkInput.value;
    
    function showToast(msg) {
      if (!shareToast) return;
      shareToast.textContent = msg;
      shareToast.classList.add("is-visible");
      setTimeout(() => shareToast.classList.remove("is-visible"), 2000);
    }
    
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text)
        .then(() => showToast("✓ Copied to clipboard!"))
        .catch(() => showToast("Failed to copy"));
    } else {
    shareLinkInput.select();
    try {
        document.execCommand("copy");
        showToast("✓ Copied!");
      } catch {
        showToast("Please copy manually");
      }
      shareLinkInput.blur();
    }
  }

  function toggleSound() {
    state.soundEnabled = !state.soundEnabled;
    saveSoundPref();
    updateSoundUI();
    if (state.soundEnabled) playClick();
  }

  // ==================== EVENT LISTENERS ====================

  if (optionForm && newOptionInput) {
    optionForm.addEventListener("submit", e => {
      e.preventDefault();
      addOption(newOptionInput.value);
      newOptionInput.value = "";
      newOptionInput.focus();
    });
  }

  if (optionsList) {
    optionsList.addEventListener("click", e => {
      const btn = e.target.closest("button[data-delete]");
      if (btn) removeOption(btn.dataset.delete);
    });
  }

  if (wheelNameInput) {
    wheelNameInput.addEventListener("input", () => {
      state.wheelName = (wheelNameInput.value || "").slice(0, 60);
      saveState();
      updateShareLink();
    });
  }

  if (spinButton) {
    spinButton.addEventListener("click", spin);
  }

  if (resetButton) {
    resetButton.addEventListener("click", resetWheel);
  }

  if (clearHistoryBtn) {
    clearHistoryBtn.addEventListener("click", clearHistory);
  }

  if (copyShareLinkButton) {
    copyShareLinkButton.addEventListener("click", copyShareLink);
  }

  if (soundToggle) {
    soundToggle.addEventListener("click", toggleSound);
  }
  
  if (volumeSlider) {
    volumeSlider.addEventListener("input", (e) => {
      const vol = parseFloat(e.target.value) / 100;
      setVolume(vol);
      updateVolumeUI();
      saveSoundPref();
    });
    
    // Play a test sound on release
    volumeSlider.addEventListener("change", () => {
      if (state.soundEnabled) {
        playClick();
      }
    });
  }

  // ==================== INIT ====================
  
  loadSoundPref();
  loadState();
  render();
  initParticles();
  initAudience();
  resizeConfettiCanvas();
  updateVolumeUI();

  window.addEventListener("resize", () => {
    renderWheel();
    resizeParticleCanvas();
    resizeConfettiCanvas();
    initAudience();
  });

  // Init audio on first interaction
  document.addEventListener("click", function init() {
    getAudioContext();
    document.removeEventListener("click", init);
  }, { once: true });
});
