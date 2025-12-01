document.addEventListener("DOMContentLoaded", function () {
  "use strict";

  const STORAGE_KEY = "wheelOfDeciding.v1";
  const MAX_OPTIONS = 64;

  const COLOR_PALETTE = [
    "#f97316",
    "#22c55e",
    "#3b82f6",
    "#e11d48",
    "#a855f7",
    "#06b6d4",
    "#facc15",
    "#4ade80",
    "#60a5fa",
    "#fb7185",
    "#c4b5fd",
    "#2dd4bf"
  ];

  const canvas = document.getElementById("wheelCanvas");
  const ctx = canvas && canvas.getContext ? canvas.getContext("2d") : null;

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

  const state = {
    wheelName: "What should we do?",
    options: [],
    history: [],
    isSpinning: false,
    rotation: 0
  };

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
    return "hsl(" + hue + "deg, 82%, 56%)";
  }

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
            id:
              "opt-shared-" +
              Date.now().toString(36) +
              "-" +
              index.toString(36),
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
            var lbl = opt.label.trim().slice(0, 80);
            if (!lbl) return null;
            return {
              id:
                opt.id ||
                "opt-" +
                  index.toString(36) +
                  "-" +
                  Date.now().toString(36),
              label: lbl,
              color: opt.color || pickColor(index)
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
            label: opt.label,
            color: opt.color
          };
        }),
        history: state.history.slice(0, 30)
      };
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch (err) {
      console.warn("Failed to persist wheel state:", err);
    }
  }

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
      dot.style.backgroundColor = opt.color;

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

  function renderResult(message) {
    if (!resultDisplay) return;

    if (message) {
      resultDisplay.innerHTML = "";
      const strong = document.createElement("strong");
      strong.textContent = message;
      resultDisplay.appendChild(strong);
      return;
    }

    if (state.history[0]) {
      resultDisplay.innerHTML = "";
      const prefix = document.createElement("span");
      prefix.textContent = "Last spin: ";
      const strong = document.createElement("strong");
      strong.textContent = state.history[0].result;
      resultDisplay.appendChild(prefix);
      resultDisplay.appendChild(strong);
    } else {
      resultDisplay.textContent = "Add some options and spin the wheel.";
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
      const origin =
        window.location.origin ||
        window.location.protocol + "//" + window.location.host;
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
    const radius = size / 2 - 6;

    ctx.save();
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    const baseGradient = ctx.createRadialGradient(
      centerX,
      centerY,
      radius * 0.2,
      centerX,
      centerY,
      radius
    );
    baseGradient.addColorStop(0, "#020617");
    baseGradient.addColorStop(0.6, "#020617");
    baseGradient.addColorStop(1, "#020617");
    ctx.fillStyle = baseGradient;
    ctx.fill();
    ctx.restore();

    if (!state.options.length) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius * 0.96, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(30, 64, 175, 0.26)";
      ctx.fill();
      ctx.restore();
      return;
    }

    const count = state.options.length;
    const anglePerSlice = (Math.PI * 2) / count;

    for (let i = 0; i < count; i++) {
      const opt = state.options[i];
      const startAngle = state.rotation + i * anglePerSlice;
      const endAngle = startAngle + anglePerSlice;

      ctx.save();
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius * 0.96, startAngle, endAngle);
      ctx.closePath();
      ctx.fillStyle = opt.color;
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = "rgba(15, 23, 42, 0.9)";
      ctx.stroke();
      ctx.restore();

      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(startAngle + anglePerSlice / 2);
      ctx.textAlign = "right";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "#f9fafb";
      ctx.font =
        "500 14px system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

      const label = opt.label;
      const maxTextWidth = radius * 0.7;
      const truncated = truncateText(ctx, label, maxTextWidth);
      ctx.fillText(truncated, radius * 0.9 - 12, 0);
      ctx.restore();
    }

    ctx.save();
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius * 0.2, 0, Math.PI * 2);
    const hubGradient = ctx.createRadialGradient(
      centerX,
      centerY,
      radius * 0.02,
      centerX,
      centerY,
      radius * 0.2
    );
    hubGradient.addColorStop(0, "#0b1120");
    hubGradient.addColorStop(0.55, "#020617");
    hubGradient.addColorStop(1, "#020617");
    ctx.fillStyle = hubGradient;
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = "rgba(248, 250, 252, 0.12)";
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
    const index = state.options.length;
    const option = {
      id:
        "opt-" +
        Date.now().toString(36) +
        "-" +
        Math.random().toString(16).slice(2),
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
    const next = state.options.filter(function (opt) {
      return opt.id !== id;
    });
    state.options = next;
    saveState();
    renderOptionsList();
    renderWheel();
    updateShareLink();
  }

  function resetWheel() {
    if (!window.confirm("Clear all options and spin history?")) return;
    seedDefaultOptions();
    state.rotation = 0;
    saveState();
    renderWheelName();
    renderOptionsList();
    renderHistory();
    renderResult();
    updateShareLink();
  }

  function easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
  }

  function spinWheel() {
    if (state.isSpinning) return;
    if (!state.options.length) {
      alert("Add at least one option before spinning the wheel.");
      return;
    }

    state.isSpinning = true;
    if (spinButton) {
      spinButton.disabled = true;
      spinButton.textContent = "Spinning...";
    }

    const count = state.options.length;
    const anglePerSlice = (Math.PI * 2) / count;
    const winningIndex = Math.floor(getRandom() * count);
    const startRotation = normalizeAngle(state.rotation);

    const extraSpins = 4 + Math.floor(getRandom() * 4);
    const targetBaseRotation =
      -Math.PI / 2 - (winningIndex * anglePerSlice + anglePerSlice / 2);
    const finalRotation = targetBaseRotation + extraSpins * (Math.PI * 2);
    const totalDelta = finalRotation - startRotation;

    const duration = 4500 + getRandom() * 2500;
    const startTime = performance.now();

    function frame(now) {
      const elapsed = now - startTime;
      const t = Math.min(elapsed / duration, 1);
      const eased = easeOutCubic(t);

      state.rotation = startRotation + totalDelta * eased;
      renderWheel();

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
      spinButton.textContent = "Spin the wheel";
    }

    const chosen = state.options[index];
    if (!chosen) {
      renderResult("Something went wrong. Please spin again.");
      return;
    }

    addHistoryEntry(chosen.label);
    saveState();
    renderHistory();
    renderResult("The wheel chose: " + chosen.label);
  }

  function handleCopyShareLink() {
    if (!shareLinkInput) return;
    const text = shareLinkInput.value.trim();
    if (!text) return;

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
          showToast("Link copied to clipboard.");
        })
        .catch(function () {
          showToast("Could not copy. Try selecting and copying manually.");
        });
      return;
    }

    shareLinkInput.select();
    try {
      const ok = document.execCommand("copy");
      showToast(ok ? "Link copied to clipboard." : "Could not copy link.");
    } catch (err) {
      console.warn("Clipboard copy failed:", err);
      showToast("Could not copy. Try selecting and copying manually.");
    } finally {
      shareLinkInput.setSelectionRange(0, 0);
      shareLinkInput.blur();
    }
  }

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

  loadState();
  renderWheelName();
  renderOptionsList();
  renderHistory();
  renderResult();
  renderWheel();
  updateShareLink();

  window.addEventListener("resize", function () {
    renderWheel();
  });
});
