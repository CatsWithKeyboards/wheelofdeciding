document.addEventListener("DOMContentLoaded", function () {
  "use strict";

  // ==================== CONSTANTS ====================
  
  const STORAGE_KEY = "wheelOfDeciding.v1";
  const SOUND_KEY = "wheelOfDeciding.sound";
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
  const wheelFrame = $(".wheel-frame");
  const wheelSparkles = $("#wheelSparkles");

  // ==================== STATE ====================
  
  const state = {
    wheelName: "What should we do?",
    options: [],
    history: [],
    isSpinning: false,
    rotation: 0,
    soundEnabled: true
  };

  // ==================== AUDIO ENGINE ====================
  
  let audioCtx = null;
  
  function getAudioContext() {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === "suspended") {
      audioCtx.resume();
    }
    return audioCtx;
  }

  // Synthesized tick sound - mechanical click
  function playTick() {
    if (!state.soundEnabled) return;
    try {
      const ctx = getAudioContext();
      const now = ctx.currentTime;
      
      // Click oscillator
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();
      
      osc.type = "square";
      osc.frequency.setValueAtTime(1800 + Math.random() * 400, now);
      osc.frequency.exponentialRampToValueAtTime(600, now + 0.03);
      
      filter.type = "bandpass";
      filter.frequency.value = 2000;
      filter.Q.value = 2;
      
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
      
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start(now);
      osc.stop(now + 0.05);
    } catch (e) {}
  }

  // Synthesized whoosh/spin start sound
  function playSpinStart() {
    if (!state.soundEnabled) return;
    try {
      const ctx = getAudioContext();
      const now = ctx.currentTime;
      const duration = 0.6;
      
      // Noise-based whoosh
      const bufferSize = ctx.sampleRate * duration;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      
      for (let i = 0; i < bufferSize; i++) {
        const t = i / bufferSize;
        const env = Math.sin(t * Math.PI) * Math.pow(1 - t, 0.5);
        data[i] = (Math.random() * 2 - 1) * env;
      }
      
      const source = ctx.createBufferSource();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();
      
      source.buffer = buffer;
      
      filter.type = "bandpass";
      filter.frequency.setValueAtTime(500, now);
      filter.frequency.exponentialRampToValueAtTime(4000, now + duration * 0.3);
      filter.frequency.exponentialRampToValueAtTime(1000, now + duration);
      filter.Q.value = 1;
      
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
      
      source.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      
      source.start(now);
      
      // Rising tone
      const osc = ctx.createOscillator();
      const oscGain = ctx.createGain();
      
      osc.type = "sine";
      osc.frequency.setValueAtTime(200, now);
      osc.frequency.exponentialRampToValueAtTime(800, now + 0.4);
      
      oscGain.gain.setValueAtTime(0.1, now);
      oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
      
      osc.connect(oscGain);
      oscGain.connect(ctx.destination);
      
      osc.start(now);
      osc.stop(now + 0.5);
    } catch (e) {}
  }

  // Synthesized victory fanfare
  function playWinSound() {
    if (!state.soundEnabled) return;
    try {
      const ctx = getAudioContext();
      const now = ctx.currentTime;
      
      // Victory chord progression: C major arpeggio up
      const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
      const delays = [0, 0.08, 0.16, 0.24];
      
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain = ctx.createGain();
        const filter = ctx.createBiquadFilter();
        
        osc.type = "sine";
        osc.frequency.value = freq;
        
        osc2.type = "triangle";
        osc2.frequency.value = freq;
        
        filter.type = "lowpass";
        filter.frequency.value = 3000;
        
        const startTime = now + delays[i];
        
        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(0.2, startTime + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.8);
        
        osc.connect(filter);
        osc2.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);
        
        osc.start(startTime);
        osc.stop(startTime + 0.8);
        osc2.start(startTime);
        osc2.stop(startTime + 0.8);
      });
      
      // Shimmer effect
      setTimeout(() => {
        for (let i = 0; i < 12; i++) {
          setTimeout(() => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            
            osc.type = "sine";
            osc.frequency.value = 1500 + Math.random() * 2500;
            
            gain.gain.setValueAtTime(0.06, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
            
            osc.connect(gain);
            gain.connect(ctx.destination);
            
            osc.start();
            osc.stop(ctx.currentTime + 0.15);
          }, i * 40);
        }
      }, 300);
      
      // Bass thump
      const bass = ctx.createOscillator();
      const bassGain = ctx.createGain();
      
      bass.type = "sine";
      bass.frequency.setValueAtTime(150, now + 0.24);
      bass.frequency.exponentialRampToValueAtTime(50, now + 0.5);
      
      bassGain.gain.setValueAtTime(0.3, now + 0.24);
      bassGain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
      
      bass.connect(bassGain);
      bassGain.connect(ctx.destination);
      
      bass.start(now + 0.24);
      bass.stop(now + 0.6);
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
      osc.frequency.setValueAtTime(800, now);
      osc.frequency.exponentialRampToValueAtTime(500, now + 0.1);
      
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start(now);
      osc.stop(now + 0.1);
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
      const saved = localStorage.getItem(SOUND_KEY);
      state.soundEnabled = saved !== "false";
      updateSoundUI();
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
    const radius = Math.min(w, h) / 2 - 2;
    
    // Background
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    const bgGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
    bgGrad.addColorStop(0, "#1e293b");
    bgGrad.addColorStop(0.5, "#0f172a");
    bgGrad.addColorStop(1, "#030712");
    ctx.fillStyle = bgGrad;
    ctx.fill();
    ctx.restore();
    
    if (!state.options.length) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, radius * 0.94, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(30, 64, 175, 0.15)";
      ctx.fill();
      ctx.fillStyle = "rgba(148, 163, 184, 0.4)";
      ctx.font = "500 16px Inter, system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("Add options to spin!", cx, cy);
      ctx.restore();
      return;
    }
    
    const count = state.options.length;
    const sliceAngle = (Math.PI * 2) / count;
    
    // Draw segments
    for (let i = 0; i < count; i++) {
      const opt = state.options[i];
      const start = state.rotation + i * sliceAngle;
      const end = start + sliceAngle;
      const mid = start + sliceAngle / 2;
      
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, radius * 0.94, start, end);
      ctx.closePath();
      
      // Gradient fill
      const gx1 = cx + Math.cos(mid) * radius * 0.2;
      const gy1 = cy + Math.sin(mid) * radius * 0.2;
      const gx2 = cx + Math.cos(mid) * radius * 0.9;
      const gy2 = cy + Math.sin(mid) * radius * 0.9;
      
      const segGrad = ctx.createLinearGradient(gx1, gy1, gx2, gy2);
      segGrad.addColorStop(0, opt.color.gradient[0]);
      segGrad.addColorStop(1, opt.color.gradient[1]);
      ctx.fillStyle = segGrad;
      ctx.fill();
      
      // Segment border
      ctx.strokeStyle = "rgba(0, 0, 0, 0.3)";
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();
      
      // Highlight
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, radius * 0.94, start, start + sliceAngle * 0.35);
      ctx.closePath();
      ctx.fillStyle = "rgba(255, 255, 255, 0.12)";
      ctx.fill();
      ctx.restore();
      
      // Text
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(mid);
      ctx.textAlign = "right";
      ctx.textBaseline = "middle";
      
      // Shadow
      ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
      ctx.font = "600 14px Inter, system-ui, sans-serif";
      const text = truncate(ctx, opt.label, radius * 0.6);
      ctx.fillText(text, radius * 0.86, 2);
      
      // Text
      ctx.fillStyle = "#ffffff";
      ctx.fillText(text, radius * 0.86, 0);
      ctx.restore();
    }
    
    // Outer glow ring
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, radius * 0.94, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
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
    
    const count = state.options.length;
    const sliceAngle = (Math.PI * 2) / count;
    const winIndex = Math.floor(random() * count);
    const startRot = normalizeAngle(state.rotation);
    lastTickAngle = startRot;
    
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
      
      state.rotation = startRot + delta * eased;
      renderWheel();
      
      // Tick sounds
      const curr = normalizeAngle(state.rotation);
      const diff = Math.abs(curr - lastTickAngle);
      
      if (diff > sliceAngle * 0.7 || diff < sliceAngle * 0.2) {
        if (t < 0.92) {
          playTick();
          // Sparkle effect
          if (wheelSparkles) {
            const rect = wheelSparkles.getBoundingClientRect();
            createSparkle(
              Math.random() * rect.width,
              Math.random() * rect.height,
              wheelSparkles
            );
          }
        }
        lastTickAngle = curr;
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

  // ==================== INIT ====================
  
  loadSoundPref();
  loadState();
  render();
  initParticles();
  resizeConfettiCanvas();

  window.addEventListener("resize", () => {
    renderWheel();
    resizeParticleCanvas();
    resizeConfettiCanvas();
  });

  // Init audio on first interaction
  document.addEventListener("click", function init() {
    getAudioContext();
    document.removeEventListener("click", init);
  }, { once: true });
});
