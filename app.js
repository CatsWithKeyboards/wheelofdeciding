document.addEventListener("DOMContentLoaded", function () {
  "use strict";

  const STORAGE_KEY = "wheelOfDeciding.v1";
  const SOUND_STORAGE_KEY = "wheelOfDeciding.sound";
  const MAX_OPTIONS = 64;

  // Enhanced color palette with gradients
  const COLOR_PALETTE = [
    { solid: "#f97316", gradient: ["#f97316", "#fb923c"] },
    { solid: "#22c55e", gradient: ["#22c55e", "#4ade80"] },
    { solid: "#3b82f6", gradient: ["#3b82f6", "#60a5fa"] },
    { solid: "#e11d48", gradient: ["#e11d48", "#fb7185"] },
    { solid: "#a855f7", gradient: ["#a855f7", "#c4b5fd"] },
    { solid: "#06b6d4", gradient: ["#06b6d4", "#22d3ee"] },
    { solid: "#eab308", gradient: ["#eab308", "#facc15"] },
    { solid: "#ec4899", gradient: ["#ec4899", "#f472b6"] },
    { solid: "#14b8a6", gradient: ["#14b8a6", "#2dd4bf"] },
    { solid: "#8b5cf6", gradient: ["#8b5cf6", "#a78bfa"] },
    { solid: "#f43f5e", gradient: ["#f43f5e", "#fb7185"] },
    { solid: "#0ea5e9", gradient: ["#0ea5e9", "#38bdf8"] }
  ];

  // DOM Elements
  const canvas = document.getElementById("wheelCanvas");
  const ctx = canvas && canvas.getContext ? canvas.getContext("2d") : null;
  const particleCanvas = document.getElementById("particleCanvas");
  const particleCtx = particleCanvas && particleCanvas.getContext ? particleCanvas.getContext("2d") : null;
  const confettiCanvas = document.getElementById("confettiCanvas");
  const confettiCtx = confettiCanvas && confettiCanvas.getContext ? confettiCanvas.getContext("2d") : null;

  const spinButton = document.getElementById("spinButton");
  const resetButton = document.getElementById("resetButton");
  const resultDisplay = document.getElementById("resultDisplay");
  const historyList = document.getElementById("historyList");
  const optionForm = document.getElementById("optionForm");
  const wheelNameInput = document.getElementById("wheelName");
  const newOptionInput = document.getElementById("newOptionInput");
  const optionsList = document.getElementById("optionsList");
  const optionCount = document.getElementById("optionCount");
  const shareLinkInput = document.getElementById("shareLink");
  const copyShareLinkButton = document.getElementById("copyShareLinkButton");
  const shareToast = document.getElementById("shareCopyToast");
  const soundToggle = document.getElementById("soundToggle");
  const wheelFrame = document.querySelector(".wheel-frame");

  // State
  const state = {
    wheelName: "What should we do?",
    options: [],
    history: [],
    isSpinning: false,
    rotation: 0,
    soundEnabled: true
  };

  // ==================== SOUND SYSTEM ====================
  
  let audioContext = null;

  function initAudioContext() {
    if (!audioContext) {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioContext.state === 'suspended') {
      audioContext.resume();
    }
    return audioContext;
  }

  function playTone(frequency, duration, type = 'sine', volume = 0.3) {
    if (!state.soundEnabled) return;
    try {
      const ctx = initAudioContext();
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      oscillator.type = type;
      oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);
      
      gainNode.gain.setValueAtTime(volume, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      
      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + duration);
    } catch (e) {
      console.warn("Audio playback failed:", e);
    }
  }

  function playTickSound() {
    playTone(800 + Math.random() * 400, 0.05, 'sine', 0.15);
  }

  function playSpinStartSound() {
    if (!state.soundEnabled) return;
    try {
      const ctx = initAudioContext();
      
      // Whoosh sound using noise
      const bufferSize = ctx.sampleRate * 0.3;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      
      for (let i = 0; i < bufferSize; i++) {
        const t = i / bufferSize;
        data[i] = (Math.random() * 2 - 1) * Math.sin(t * Math.PI) * 0.3;
      }
      
      const source = ctx.createBufferSource();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();
      
      source.buffer = buffer;
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1000, ctx.currentTime);
      filter.frequency.exponentialRampToValueAtTime(3000, ctx.currentTime + 0.3);
      
      source.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      
      gain.gain.setValueAtTime(0.4, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      
      source.start();
    } catch (e) {
      console.warn("Spin sound failed:", e);
    }
  }

  function playWinSound() {
    if (!state.soundEnabled) return;
    
    // Victory fanfare
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    const delays = [0, 0.1, 0.2, 0.3];
    
    notes.forEach((freq, i) => {
      setTimeout(() => {
        playTone(freq, 0.4, 'sine', 0.25);
        // Add harmonics
        playTone(freq * 2, 0.3, 'sine', 0.1);
      }, delays[i] * 1000);
    });

    // Shimmer effect
    setTimeout(() => {
      for (let i = 0; i < 8; i++) {
        setTimeout(() => {
          playTone(1000 + Math.random() * 2000, 0.1, 'sine', 0.08);
        }, i * 50);
      }
    }, 400);
  }

  function playClickSound() {
    playTone(600, 0.08, 'sine', 0.2);
  }

  // Load sound preference
  function loadSoundPreference() {
    try {
      const saved = localStorage.getItem(SOUND_STORAGE_KEY);
      if (saved !== null) {
        state.soundEnabled = saved === 'true';
      }
      updateSoundToggleUI();
    } catch (e) {
      console.warn("Failed to load sound preference:", e);
    }
  }

  function saveSoundPreference() {
    try {
      localStorage.setItem(SOUND_STORAGE_KEY, state.soundEnabled.toString());
    } catch (e) {
      console.warn("Failed to save sound preference:", e);
    }
  }

  function updateSoundToggleUI() {
    if (soundToggle) {
      soundToggle.classList.toggle('is-muted', !state.soundEnabled);
    }
  }

  function toggleSound() {
    state.soundEnabled = !state.soundEnabled;
    saveSoundPreference();
    updateSoundToggleUI();
    if (state.soundEnabled) {
      playClickSound();
    }
  }

  // ==================== PARTICLE SYSTEM ====================

  const particles = [];
  const confetti = [];
  let animationFrame = null;

  class Particle {
    constructor(x, y) {
      this.x = x;
      this.y = y;
      this.size = Math.random() * 2 + 1;
      this.speedX = (Math.random() - 0.5) * 0.5;
      this.speedY = (Math.random() - 0.5) * 0.5;
      this.opacity = Math.random() * 0.5 + 0.2;
      this.hue = Math.random() * 60 + 15; // Orange-ish hues
    }

    update() {
      this.x += this.speedX;
      this.y += this.speedY;
      
      // Wrap around screen
      if (this.x < 0) this.x = particleCanvas.width;
      if (this.x > particleCanvas.width) this.x = 0;
      if (this.y < 0) this.y = particleCanvas.height;
      if (this.y > particleCanvas.height) this.y = 0;
    }

    draw() {
      particleCtx.beginPath();
      particleCtx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      particleCtx.fillStyle = `hsla(${this.hue}, 100%, 60%, ${this.opacity})`;
      particleCtx.fill();
    }
  }

  function initParticles() {
    if (!particleCanvas || !particleCtx) return;
    
    resizeParticleCanvas();
    
    const particleCount = Math.min(50, Math.floor(window.innerWidth / 30));
    for (let i = 0; i < particleCount; i++) {
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
    
    particles.forEach(particle => {
      particle.update();
      particle.draw();
    });
    
    // Draw connections between close particles
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < 100) {
          particleCtx.beginPath();
          particleCtx.strokeStyle = `rgba(249, 115, 22, ${0.1 * (1 - distance / 100)})`;
          particleCtx.lineWidth = 0.5;
          particleCtx.moveTo(particles[i].x, particles[i].y);
          particleCtx.lineTo(particles[j].x, particles[j].y);
          particleCtx.stroke();
        }
      }
    }
    
    animationFrame = requestAnimationFrame(animateParticles);
  }

  // ==================== CONFETTI SYSTEM ====================

  class ConfettiPiece {
    constructor(x, y) {
      this.x = x;
      this.y = y;
      this.size = Math.random() * 10 + 5;
      this.speedX = (Math.random() - 0.5) * 15;
      this.speedY = Math.random() * -15 - 5;
      this.gravity = 0.5;
      this.rotation = Math.random() * 360;
      this.rotationSpeed = (Math.random() - 0.5) * 10;
      this.color = `hsl(${Math.random() * 360}, 100%, 60%)`;
      this.opacity = 1;
      this.shape = Math.random() > 0.5 ? 'rect' : 'circle';
    }

    update() {
      this.x += this.speedX;
      this.speedY += this.gravity;
      this.y += this.speedY;
      this.rotation += this.rotationSpeed;
      this.speedX *= 0.99;
      this.opacity -= 0.008;
    }

    draw() {
      confettiCtx.save();
      confettiCtx.translate(this.x, this.y);
      confettiCtx.rotate(this.rotation * Math.PI / 180);
      confettiCtx.globalAlpha = Math.max(0, this.opacity);
      confettiCtx.fillStyle = this.color;
      
      if (this.shape === 'rect') {
        confettiCtx.fillRect(-this.size / 2, -this.size / 4, this.size, this.size / 2);
      } else {
        confettiCtx.beginPath();
        confettiCtx.arc(0, 0, this.size / 2, 0, Math.PI * 2);
        confettiCtx.fill();
      }
      
      confettiCtx.restore();
    }

    isDead() {
      return this.opacity <= 0 || this.y > confettiCanvas.height + 50;
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
    
    // Launch from multiple positions
    const launchPoints = [
      { x: confettiCanvas.width * 0.25, y: confettiCanvas.height },
      { x: confettiCanvas.width * 0.5, y: confettiCanvas.height },
      { x: confettiCanvas.width * 0.75, y: confettiCanvas.height }
    ];
    
    launchPoints.forEach(point => {
      for (let i = 0; i < 50; i++) {
        confetti.push(new ConfettiPiece(
          point.x + (Math.random() - 0.5) * 100,
          point.y
        ));
      }
    });
    
    // Also launch from center of wheel
    const wheelRect = canvas.getBoundingClientRect();
    const centerX = wheelRect.left + wheelRect.width / 2;
    const centerY = wheelRect.top + wheelRect.height / 2;
    
    for (let i = 0; i < 80; i++) {
      const piece = new ConfettiPiece(centerX, centerY);
      piece.speedX = (Math.random() - 0.5) * 25;
      piece.speedY = Math.random() * -20 - 5;
      confetti.push(piece);
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

  // ==================== UTILITIES ====================

  function getRandom() {
    if (window.crypto && window.crypto.getRandomValues) {
      const array = new Uint32Array(1);
      window.crypto.getRandomValues(array);
      return array[0] / (0xffffffff + 1);
    }
    return Math.random();
  }

  function normalizeAngle(angle) {
    const twoPI = Math.PI * 2;
    return ((angle % twoPI) + twoPI) % twoPI;
  }

  function pickColor(index) {
    if (index < COLOR_PALETTE.length) {
      return COLOR_PALETTE[index];
    }
    const hue = (index * 47) % 360;
    return {
      solid: `hsl(${hue}, 75%, 55%)`,
      gradient: [`hsl(${hue}, 75%, 55%)`, `hsl(${hue}, 85%, 65%)`]
    };
  }

  // ==================== STATE MANAGEMENT ====================

  function seedDefaultOptions() {
    state.wheelName = "What should we do?";
    state.options = [
      { id: "opt-yes", label: "Yes", color: pickColor(0) },
      { id: "opt-no", label: "No", color: pickColor(1) },
      { id: "opt-maybe", label: "Maybe", color: pickColor(2) }
    ];
    state.history = [];
    state.rotation = 0;
  }

  function tryLoadFromUrl() {
    try {
      const params = new URLSearchParams(window.location.search);
      const encoded = params.get("wheel");
      if (!encoded) return null;
      const json = decodeURIComponent(encoded);
      const data = JSON.parse(json);
      if (!data || !Array.isArray(data.options)) {
        return null;
      }
      const name =
        typeof data.name === "string" && data.name.trim()
          ? data.name.trim().slice(0, 60)
          : "Shared wheel";
      const options = data.options
        .map(function (label, index) {
          const text = String(label || "").trim().slice(0, 80);
          if (!text) return null;
          return {
            id: "opt-shared-" + Date.now().toString(36) + "-" + index.toString(36),
            label: text,
            color: pickColor(index)
          };
        })
        .filter(Boolean);
      if (!options.length) {
        return null;
      }
      return {
        wheelName: name,
        options: options
      };
    } catch (err) {
      console.warn("Failed to parse wheel from URL:", err);
      return null;
    }
  }

  function loadState() {
    const shared = tryLoadFromUrl();
    if (shared) {
      state.wheelName = shared.wheelName;
      state.options = shared.options;
      state.history = [];
      state.rotation = 0;
      return;
    }

    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        seedDefaultOptions();
        return;
      }
      const data = JSON.parse(raw);
      if (data && typeof data.wheelName === "string") {
        state.wheelName = data.wheelName.slice(0, 60);
      } else {
        state.wheelName = "What should we do?";
      }
      if (data && Array.isArray(data.options) && data.options.length) {
        state.options = data.options
          .map(function (opt, index) {
            if (!opt || typeof opt.label !== "string") return null;
            const lbl = opt.label.trim().slice(0, 80);
            if (!lbl) return null;
            return {
              id: opt.id || "opt-" + index.toString(36) + "-" + Date.now().toString(36),
              label: lbl,
              color: pickColor(index)
            };
          })
          .filter(Boolean);
        if (!state.options.length) {
          seedDefaultOptions();
        }
      } else {
        seedDefaultOptions();
      }
      if (data && Array.isArray(data.history)) {
        state.history = data.history
          .slice(0, 30)
          .map(function (entry) {
            if (!entry) return null;
            return {
              ts: entry.ts || Date.now(),
              result: String(entry.result || "")
            };
          })
          .filter(function (entry) {
            return entry.result && entry.result.trim();
          });
      } else {
        state.history = [];
      }
    } catch (err) {
      console.warn("Failed to load stored wheel:", err);
      seedDefaultOptions();
    }
  }

  function saveState() {
    try {
      const payload = {
        wheelName: state.wheelName,
        options: state.options.map(function (opt) {
          return {
            id: opt.id,
            label: opt.label
          };
        }),
        history: state.history.slice(0, 30)
      };
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch (err) {
      console.warn("Failed to persist wheel state:", err);
    }
  }

  // ==================== RENDERING ====================

  function renderWheelName() {
    if (wheelNameInput) {
      wheelNameInput.value = state.wheelName;
    }
  }

  function renderOptionsList() {
    if (!optionsList) return;

    optionsList.innerHTML = "";

    if (!state.options.length) {
      const empty = document.createElement("p");
      empty.className = "options-list-empty";
      empty.textContent = "No choices yet. Add your first option above.";
      optionsList.appendChild(empty);
      if (optionCount) optionCount.textContent = "0";
      return;
    }

    state.options.forEach(function (opt, index) {
      const li = document.createElement("li");
      li.className = "options-list-item";

      const idx = document.createElement("span");
      idx.className = "option-index";
      idx.textContent = String(index + 1) + ".";

      const dot = document.createElement("span");
      dot.className = "option-color-dot";
      dot.style.backgroundColor = opt.color.solid;

      const label = document.createElement("span");
      label.className = "option-label";
      label.textContent = opt.label;

      const del = document.createElement("button");
      del.type = "button";
      del.className = "icon-button icon-button-danger";
      del.setAttribute("aria-label", 'Remove option "' + opt.label + '"');
      del.dataset.deleteId = opt.id;
      del.textContent = "×";

      li.appendChild(idx);
      li.appendChild(dot);
      li.appendChild(label);
      li.appendChild(del);

      optionsList.appendChild(li);
    });

    if (optionCount) {
      optionCount.textContent = String(state.options.length);
    }
  }

  function renderHistory() {
    if (!historyList) return;
    historyList.innerHTML = "";

    if (!state.history.length) {
      const li = document.createElement("li");
      li.className = "history-empty";
      li.textContent = "No spins yet. Spin the wheel to see your history.";
      historyList.appendChild(li);
      return;
    }

    state.history.forEach(function (entry) {
      const li = document.createElement("li");
      li.className = "history-item";

      const resultSpan = document.createElement("span");
      resultSpan.className = "history-result";
      resultSpan.textContent = entry.result;

      const metaSpan = document.createElement("span");
      metaSpan.className = "history-meta";
      try {
        const date = new Date(entry.ts);
        const timeString = date.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit"
        });
        metaSpan.textContent = timeString;
      } catch (err) {
        metaSpan.textContent = "";
      }

      li.appendChild(resultSpan);
      li.appendChild(metaSpan);
      historyList.appendChild(li);
    });
  }

  function renderResult(message, isWin = false) {
    if (!resultDisplay) return;

    resultDisplay.classList.toggle('has-result', !!message);
    
    if (message) {
      resultDisplay.innerHTML = "";
      const span = document.createElement("span");
      span.className = "result-text";
      
      if (isWin) {
        const strong = document.createElement("strong");
        strong.textContent = "🎉 " + message;
        span.appendChild(strong);
      } else {
        span.textContent = message;
      }
      resultDisplay.appendChild(span);
      return;
    }

    if (state.history[0]) {
      resultDisplay.innerHTML = "";
      resultDisplay.classList.add('has-result');
      const span = document.createElement("span");
      span.className = "result-text";
      const prefix = document.createTextNode("Last spin: ");
      const strong = document.createElement("strong");
      strong.textContent = state.history[0].result;
      span.appendChild(prefix);
      span.appendChild(strong);
      resultDisplay.appendChild(span);
    } else {
      resultDisplay.innerHTML = '<span class="result-text">Add some options and spin the wheel.</span>';
    }
  }

  function updateShareLink() {
    if (!shareLinkInput) return;

    try {
      const data = {
        name: state.wheelName,
        options: state.options.map(function (opt) {
          return opt.label;
        })
      };
      const json = JSON.stringify(data);
      const encoded = encodeURIComponent(json);
      const origin = window.location.origin || window.location.protocol + "//" + window.location.host;
      const base = origin + window.location.pathname;
      const url = base + "?wheel=" + encoded;
      shareLinkInput.value = url;
    } catch (err) {
      console.warn("Failed to update share link:", err);
      shareLinkInput.value = "";
    }
  }

  function renderWheel() {
    if (!canvas || !ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const width = rect.width || canvas.width;
    const height = rect.height || canvas.height;

    if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
      canvas.width = width * dpr;
      canvas.height = height * dpr;
    }

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    const size = Math.min(width, height);
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = size / 2 - 4;

    // Draw base circle with gradient
    ctx.save();
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    const baseGradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
    baseGradient.addColorStop(0, "#1a1f35");
    baseGradient.addColorStop(0.5, "#0f172a");
    baseGradient.addColorStop(1, "#030712");
    ctx.fillStyle = baseGradient;
    ctx.fill();
    ctx.restore();

    if (!state.options.length) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius * 0.95, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(30, 64, 175, 0.2)";
      ctx.fill();
      ctx.restore();
      
      // Draw placeholder text
      ctx.save();
      ctx.fillStyle = "rgba(148, 163, 184, 0.5)";
      ctx.font = "500 16px 'Outfit', system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("Add options to spin!", centerX, centerY);
      ctx.restore();
      return;
    }

    const count = state.options.length;
    const anglePerSlice = (Math.PI * 2) / count;

    // Draw segments with gradients and effects
    for (let i = 0; i < count; i++) {
      const opt = state.options[i];
      const startAngle = state.rotation + i * anglePerSlice;
      const endAngle = startAngle + anglePerSlice;

      // Create gradient for segment
      const midAngle = startAngle + anglePerSlice / 2;
      const gradX1 = centerX + Math.cos(midAngle) * radius * 0.3;
      const gradY1 = centerY + Math.sin(midAngle) * radius * 0.3;
      const gradX2 = centerX + Math.cos(midAngle) * radius * 0.9;
      const gradY2 = centerY + Math.sin(midAngle) * radius * 0.9;

      ctx.save();
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius * 0.95, startAngle, endAngle);
      ctx.closePath();

      // Gradient fill
      const segGradient = ctx.createLinearGradient(gradX1, gradY1, gradX2, gradY2);
      segGradient.addColorStop(0, opt.color.gradient[0]);
      segGradient.addColorStop(1, opt.color.gradient[1]);
      ctx.fillStyle = segGradient;
      ctx.fill();

      // Segment border
      ctx.lineWidth = 2;
      ctx.strokeStyle = "rgba(0, 0, 0, 0.4)";
      ctx.stroke();
      ctx.restore();

      // Inner highlight
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius * 0.95, startAngle, startAngle + anglePerSlice * 0.3);
      ctx.closePath();
      ctx.fillStyle = "rgba(255, 255, 255, 0.1)";
      ctx.fill();
      ctx.restore();

      // Draw text with shadow
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(startAngle + anglePerSlice / 2);
      ctx.textAlign = "right";
      ctx.textBaseline = "middle";
      
      // Text shadow
      ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
      ctx.font = "600 14px 'Outfit', system-ui, sans-serif";
      const label = opt.label;
      const maxTextWidth = radius * 0.65;
      const truncated = truncateText(ctx, label, maxTextWidth);
      ctx.fillText(truncated, radius * 0.88, 2);
      
      // Main text
      ctx.fillStyle = "#ffffff";
      ctx.fillText(truncated, radius * 0.88, 0);
      ctx.restore();
    }

    // Draw outer ring highlight
    ctx.save();
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius * 0.95, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
  }

  function truncateText(ctx, text, maxWidth) {
    const ellipsis = "…";
    if (ctx.measureText(text).width <= maxWidth) {
      return text;
    }
    let trimmed = text;
    while (trimmed.length > 0) {
      trimmed = trimmed.slice(0, -1);
      if (ctx.measureText(trimmed + ellipsis).width <= maxWidth) {
        return trimmed + ellipsis;
      }
    }
    return text;
  }

  // ==================== WHEEL ACTIONS ====================

  function addHistoryEntry(resultLabel) {
    state.history.unshift({
      ts: Date.now(),
      result: resultLabel
    });
    state.history = state.history.slice(0, 30);
  }

  function addOption(label) {
    const trimmed = label.trim();
    if (!trimmed) return;
    if (state.options.length >= MAX_OPTIONS) {
      alert("You can only have up to " + MAX_OPTIONS + " options on the wheel.");
      return;
    }
    playClickSound();
    const index = state.options.length;
    const option = {
      id: "opt-" + Date.now().toString(36) + "-" + Math.random().toString(16).slice(2),
      label: trimmed.slice(0, 80),
      color: pickColor(index)
    };
    state.options.push(option);
    saveState();
    renderOptionsList();
    renderWheel();
    updateShareLink();
  }

  function removeOption(id) {
    playClickSound();
    const next = state.options.filter(function (opt) {
      return opt.id !== id;
    });
    state.options = next;
    // Reassign colors to maintain consistency
    state.options = state.options.map((opt, index) => ({
      ...opt,
      color: pickColor(index)
    }));
    saveState();
    renderOptionsList();
    renderWheel();
    updateShareLink();
  }

  function resetWheel() {
    if (!window.confirm("Clear all options and spin history?")) return;
    playClickSound();
    seedDefaultOptions();
    state.rotation = 0;
    saveState();
    renderWheelName();
    renderOptionsList();
    renderHistory();
    renderResult();
    updateShareLink();
    renderWheel();
  }

  // Easing functions
  function easeOutQuint(t) {
    return 1 - Math.pow(1 - t, 5);
  }

  let lastTickAngle = 0;

  function spinWheel() {
    if (state.isSpinning) return;
    if (!state.options.length) {
      alert("Add at least one option before spinning the wheel.");
      return;
    }

    state.isSpinning = true;
    if (spinButton) {
      spinButton.disabled = true;
      spinButton.classList.add('is-spinning');
      spinButton.querySelector('.btn-text').textContent = "🎰 Spinning...";
    }

    playSpinStartSound();

    const count = state.options.length;
    const anglePerSlice = (Math.PI * 2) / count;
    const winningIndex = Math.floor(getRandom() * count);
    const startRotation = normalizeAngle(state.rotation);
    lastTickAngle = startRotation;

    const extraSpins = 5 + Math.floor(getRandom() * 4);
    const targetBaseRotation = -Math.PI / 2 - (winningIndex * anglePerSlice + anglePerSlice / 2);
    const randomOffset = (getRandom() - 0.5) * anglePerSlice * 0.6; // Random position within segment
    const finalRotation = targetBaseRotation + extraSpins * (Math.PI * 2) + randomOffset;
    const totalDelta = finalRotation - startRotation;

    const duration = 5000 + getRandom() * 2000;
    const startTime = performance.now();

    function frame(now) {
      const elapsed = now - startTime;
      const t = Math.min(elapsed / duration, 1);
      const eased = easeOutQuint(t);

      state.rotation = startRotation + totalDelta * eased;
      renderWheel();

      // Play tick sounds based on segment changes
      const currentAngle = normalizeAngle(state.rotation);
      const angleChange = Math.abs(currentAngle - lastTickAngle);
      if (angleChange > anglePerSlice * 0.8 || angleChange < anglePerSlice * 0.2) {
        if (t < 0.95) { // Don't tick near the end
          playTickSound();
        }
        lastTickAngle = currentAngle;
      }

      if (t < 1) {
        window.requestAnimationFrame(frame);
      } else {
        finishSpin(winningIndex);
      }
    }

    window.requestAnimationFrame(frame);
  }

  function finishSpin(index) {
    state.rotation = normalizeAngle(state.rotation);
    state.isSpinning = false;

    if (spinButton) {
      spinButton.disabled = false;
      spinButton.classList.remove('is-spinning');
      spinButton.querySelector('.btn-text').textContent = "🎰 Spin the wheel";
    }

    const chosen = state.options[index];
    if (!chosen) {
      renderResult("Something went wrong. Please spin again.");
      return;
    }

    // Celebration effects!
    playWinSound();
    launchConfetti();
    
    // Screen shake
    document.body.classList.add('is-shaking');
    setTimeout(() => {
      document.body.classList.remove('is-shaking');
    }, 500);
    
    // Wheel glow celebration
    if (wheelFrame) {
      wheelFrame.classList.add('is-celebrating');
      setTimeout(() => {
        wheelFrame.classList.remove('is-celebrating');
      }, 2400);
    }

    addHistoryEntry(chosen.label);
    saveState();
    renderHistory();
    renderResult("The wheel chose: " + chosen.label, true);
  }

  function handleCopyShareLink() {
    if (!shareLinkInput) return;
    const text = shareLinkInput.value.trim();
    if (!text) return;

    playClickSound();

    function showToast(message) {
      if (!shareToast) return;
      shareToast.textContent = message;
      shareToast.classList.add("is-visible");
      window.setTimeout(function () {
        shareToast.classList.remove("is-visible");
      }, 1800);
    }

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard
        .writeText(text)
        .then(function () {
          showToast("✓ Link copied to clipboard!");
        })
        .catch(function () {
          showToast("Could not copy. Try selecting manually.");
        });
      return;
    }

    shareLinkInput.select();
    try {
      const ok = document.execCommand("copy");
      showToast(ok ? "✓ Link copied to clipboard!" : "Could not copy link.");
    } catch (err) {
      console.warn("Clipboard copy failed:", err);
      showToast("Could not copy. Try selecting manually.");
    } finally {
      shareLinkInput.setSelectionRange(0, 0);
      shareLinkInput.blur();
    }
  }

  // ==================== EVENT LISTENERS ====================

  if (optionForm && newOptionInput) {
    optionForm.addEventListener("submit", function (event) {
      event.preventDefault();
      addOption(newOptionInput.value || "");
      newOptionInput.value = "";
      newOptionInput.focus();
    });
  }

  if (optionsList) {
    optionsList.addEventListener("click", function (event) {
      const target = event.target;
      if (!target) return;
      const button = target.closest("button[data-delete-id]");
      if (!button) return;
      const id = button.getAttribute("data-delete-id");
      if (!id) return;
      removeOption(id);
    });
  }

  if (wheelNameInput) {
    wheelNameInput.addEventListener("input", function () {
      const value = wheelNameInput.value || "";
      state.wheelName = value.slice(0, 60);
      saveState();
      updateShareLink();
    });
  }

  if (spinButton) {
    spinButton.addEventListener("click", function () {
      spinWheel();
    });
  }

  if (resetButton) {
    resetButton.addEventListener("click", function () {
      resetWheel();
    });
  }

  if (copyShareLinkButton) {
    copyShareLinkButton.addEventListener("click", function () {
      handleCopyShareLink();
    });
  }

  if (soundToggle) {
    soundToggle.addEventListener("click", function () {
      toggleSound();
    });
  }

  // ==================== INITIALIZATION ====================

  loadSoundPreference();
  loadState();
  renderWheelName();
  renderOptionsList();
  renderHistory();
  renderResult();
  renderWheel();
  updateShareLink();
  initParticles();
  resizeConfettiCanvas();

  window.addEventListener("resize", function () {
    renderWheel();
    resizeParticleCanvas();
    resizeConfettiCanvas();
  });

  // Initialize audio context on first user interaction
  document.addEventListener('click', function initAudio() {
    initAudioContext();
    document.removeEventListener('click', initAudio);
  }, { once: true });
});
