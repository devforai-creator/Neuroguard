const DEFAULT_SETTINGS = Object.freeze({
  keywords: [
    "세대갈등",
    "남녀갈등",
    "남혐",
    "여혐",
    "틀딱",
    "개저씨",
    "페미",
    "혐오",
    "분노",
    "논란",
    "불매",
    "망했다"
  ],
  interceptDelayMs: 3000,
  hideHome: false
});

let settings = { ...DEFAULT_SETTINGS };
let scanScheduled = false;

function chromeGet(keys) {
  return new Promise((resolve) => {
    chrome.storage.local.get(keys, resolve);
  });
}

function chromeSet(values) {
  return new Promise((resolve) => {
    chrome.storage.local.set(values, resolve);
  });
}

async function init() {
  await loadSettings();
  startObservers();
  applyHideHome();
  filterFeed();

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "local") return;
    let requiresFilter = false;

    if (changes.keywords) {
      settings.keywords = normalizeKeywords(changes.keywords.newValue);
      requiresFilter = true;
    }

    if (changes.interceptDelayMs) {
      settings.interceptDelayMs = Number(changes.interceptDelayMs.newValue) || DEFAULT_SETTINGS.interceptDelayMs;
    }

    if (changes.hideHome) {
      settings.hideHome = Boolean(changes.hideHome.newValue);
      applyHideHome();
    }

    if (requiresFilter) {
      scheduleFilter();
    }
  });
}

async function loadSettings() {
  const stored = await chromeGet(DEFAULT_SETTINGS);
  settings = {
    keywords: normalizeKeywords(stored.keywords),
    interceptDelayMs: Number(stored.interceptDelayMs) || DEFAULT_SETTINGS.interceptDelayMs,
    hideHome: Boolean(stored.hideHome)
  };
}

function normalizeKeywords(value) {
  if (!value) return [...DEFAULT_SETTINGS.keywords];
  if (Array.isArray(value)) return value.filter(Boolean);
  if (typeof value === "string") {
    return value
      .split(/\r?\n/)
      .map((k) => k.trim())
      .filter(Boolean);
  }
  return [...DEFAULT_SETTINGS.keywords];
}

function startObservers() {
  const observer = new MutationObserver(() => scheduleFilter());
  observer.observe(document.body, {
    subtree: true,
    childList: true
  });

  // Also re-run when scrolling to catch lazy-loaded cards.
  window.addEventListener("scroll", debounce(scheduleFilter, 250), { passive: true });
}

function scheduleFilter() {
  if (scanScheduled) return;
  scanScheduled = true;
  requestAnimationFrame(() => {
    scanScheduled = false;
    filterFeed();
  });
}

function filterFeed() {
  applyHideHome();

  const selectors = [
    "ytd-rich-item-renderer",
    "ytd-video-renderer",
    "ytd-compact-video-renderer",
    "ytd-grid-video-renderer"
  ];
  const cards = document.querySelectorAll(selectors.join(","));

  cards.forEach((card) => {
    const titleEl = card.querySelector("#video-title, #video-title-link");
    const channelEl = card.querySelector("#channel-name yt-formatted-string, #channel-name #text");
    const title = titleEl?.textContent?.trim() ?? "";
    const channel = channelEl?.textContent?.trim() ?? "";
    const flagged = matchesKeyword(title) || matchesKeyword(channel);

    if (flagged) {
      card.classList.add("yc-muted");
      installInterceptor(card);
    } else {
      card.classList.remove("yc-muted");
      removeInterceptor(card);
    }
  });
}

function matchesKeyword(text) {
  if (!text) return false;
  const lower = text.toLowerCase();
  return settings.keywords.some((keyword) => lower.includes(keyword.toLowerCase()));
}

function applyHideHome() {
  if (settings.hideHome) {
    document.body.classList.add("yc-hide-home");
  } else {
    document.body.classList.remove("yc-hide-home");
  }
}

function installInterceptor(card) {
  if (card.dataset.ycHooked === "1") return;
  card.dataset.ycHooked = "1";
  const handler = (event) => interceptClick(event, card);
  card.addEventListener("click", handler, true);
  card.dataset.ycHandler = storeHandler(handler);
}

function removeInterceptor(card) {
  if (card.dataset.ycHooked !== "1") return;
  const handler = retrieveHandler(card.dataset.ycHandler);
  if (handler) {
    card.removeEventListener("click", handler, true);
  }
  delete card.dataset.ycHooked;
  delete card.dataset.ycHandler;
}

const handlerRegistry = new Map();
let handlerId = 0;
function storeHandler(handler) {
  const id = String(++handlerId);
  handlerRegistry.set(id, handler);
  return id;
}

function retrieveHandler(id) {
  if (!id) return null;
  const handler = handlerRegistry.get(id);
  handlerRegistry.delete(id);
  return handler;
}

function interceptClick(event, card) {
  const anchor = findAnchor(event);
  if (!anchor || !anchor.href) return;

  event.preventDefault();
  event.stopPropagation();

  if (document.querySelector(".yc-overlay")) {
    return;
  }

  const titleEl = card.querySelector("#video-title, #video-title-link");
  const title = titleEl?.textContent?.trim() ?? anchor.href;

  const overlay = buildOverlay(title, anchor.href);
  document.body.appendChild(overlay.element);

  logEvent("intercept", { title, href: anchor.href });
  overlay.onConfirm = () => {
    logEvent("allowed", { title, href: anchor.href });
    navigateTo(anchor.href);
  };
  overlay.onCancel = () => {
    logEvent("cancel", { title, href: anchor.href });
  };
}

function buildOverlay(title, href) {
  const wrapper = document.createElement("div");
  wrapper.className = "yc-overlay";

  const modal = document.createElement("div");
  modal.className = "yc-modal";
  modal.innerHTML = `
    <div class="yc-title">잠깐, 이건 네 '무의식 클릭' 패턴이야.</div>
    <div class="yc-countdown"></div>
    <p class="yc-desc">${escapeHtml(title)}</p>
    <div class="yc-actions">
      <button class="yc-allow" disabled>3</button>
      <button class="yc-cancel">닫기</button>
    </div>
  `;
  wrapper.appendChild(modal);

  const countdownEl = modal.querySelector(".yc-countdown");
  const allowBtn = modal.querySelector(".yc-allow");
  const cancelBtn = modal.querySelector(".yc-cancel");

  let remaining = Math.max(0, Math.round(settings.interceptDelayMs / 1000));
  countdownEl.textContent = `${remaining}초만 숨 고르기`; // fallback text
  allowBtn.textContent = `${remaining}`;

  if (remaining === 0) {
    allowBtn.disabled = false;
    allowBtn.textContent = "계속 보기";
  } else {
    const timer = setInterval(() => {
      remaining -= 1;
      if (remaining <= 0) {
        clearInterval(timer);
        allowBtn.disabled = false;
        allowBtn.textContent = "계속 보기";
        countdownEl.textContent = "준비됐니?";
      } else {
        allowBtn.textContent = `${remaining}`;
        countdownEl.textContent = `${remaining}초만 숨 고르기`;
      }
    }, 1000);

    allowBtn.dataset.timerId = timer;
  }

  const overlay = {
    element: wrapper,
    onConfirm: null,
    onCancel: null
  };

  allowBtn.addEventListener("click", () => {
    cleanup();
    overlay.onConfirm?.();
  });

  cancelBtn.addEventListener("click", () => {
    cleanup();
    overlay.onCancel?.();
  });

  function cleanup() {
    const timerId = Number(allowBtn.dataset.timerId);
    if (timerId) clearInterval(timerId);
    wrapper.remove();
  }

  return overlay;
}

function findAnchor(event) {
  const path = event.composedPath ? event.composedPath() : buildPath(event.target);
  for (const node of path) {
    if (node?.tagName === "A" && node.href) {
      return node;
    }
  }
  return null;
}

function buildPath(node) {
  const path = [];
  while (node) {
    path.push(node);
    node = node.parentNode;
  }
  return path;
}

function navigateTo(href) {
  window.location.href = href;
}

async function logEvent(type, payload) {
  try {
    const dayKey = new Date().toISOString().slice(0, 10);
    const { logs = {} } = await chromeGet("logs");
    const dayLogs = Array.isArray(logs[dayKey]) ? logs[dayKey] : [];

    dayLogs.push({
      ts: Date.now(),
      type,
      title: payload.title,
      href: payload.href
    });

    await chromeSet({ logs: { ...logs, [dayKey]: dayLogs } });
  } catch (error) {
    console.error("[YT Clean Mind] Failed to log event", error);
  }
}

function debounce(fn, wait) {
  let timer = null;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), wait);
  };
}

function escapeHtml(input = "") {
  return input.replace(/[&<>'"]+/g, (match) => {
    const map = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    };
    return map[match] || match;
  });
}

init().catch((error) => {
  console.error("[YT Clean Mind] 초기화 실패", error);
});
