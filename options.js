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

const keywordBox = document.getElementById("keywords");
const delayField = document.getElementById("delay");
const hideHomeToggle = document.getElementById("hideHome");
const statusEl = document.getElementById("status");

const exportBtn = document.getElementById("export");
const clearBtn = document.getElementById("clearLogs");
const saveBtn = document.getElementById("save");
const logSummary = document.getElementById("log-summary");

async function loadSettings() {
  const stored = await chrome.storage.local.get(DEFAULT_SETTINGS);
  const keywords = Array.isArray(stored.keywords) ? stored.keywords : DEFAULT_SETTINGS.keywords;
  keywordBox.value = keywords.join("\n");
  delayField.value = Math.round((stored.interceptDelayMs ?? DEFAULT_SETTINGS.interceptDelayMs) / 1000);
  hideHomeToggle.checked = Boolean(stored.hideHome);
}

async function loadLogSummary() {
  const { logs = {} } = await chrome.storage.local.get("logs");
  const todayKey = new Date().toISOString().slice(0, 10);
  const todayLogs = logs[todayKey] || [];
  if (!todayLogs.length) {
    logSummary.textContent = "기록이 아직 없어요.";
    return;
  }

  const counts = todayLogs.reduce(
    (acc, entry) => {
      acc[entry.type] = (acc[entry.type] || 0) + 1;
      return acc;
    },
    {}
  );
  const total = todayLogs.length;
  logSummary.textContent = `오늘 ${total}건 중 차단 ${counts.intercept || 0}회, 허용 ${counts.allowed || 0}회.`;
}

async function saveSettings() {
  const keywords = keywordBox.value
    .split(/\r?\n/)
    .map((k) => k.trim())
    .filter(Boolean);
  const delaySeconds = Math.max(0, Number(delayField.value) || 0);
  const payload = {
    keywords: keywords.length ? keywords : DEFAULT_SETTINGS.keywords,
    interceptDelayMs: delaySeconds * 1000,
    hideHome: hideHomeToggle.checked
  };
  await chrome.storage.local.set(payload);
  reportStatus("저장 완료!", 1500);
}

async function exportLogs() {
  const { logs = {} } = await chrome.storage.local.get("logs");
  const blob = new Blob([JSON.stringify(logs, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `yt-clean-mind-logs-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

async function clearLogs() {
  await chrome.storage.local.remove("logs");
  reportStatus("로그를 비웠어요.", 1500);
  loadLogSummary();
}

function reportStatus(message, timeout = 0) {
  statusEl.textContent = message;
  if (timeout) {
    setTimeout(() => {
      if (statusEl.textContent === message) {
        statusEl.textContent = "";
      }
    }, timeout);
  }
}

saveBtn.addEventListener("click", saveSettings);
exportBtn.addEventListener("click", exportLogs);
clearBtn.addEventListener("click", clearLogs);

document.addEventListener("DOMContentLoaded", async () => {
  await loadSettings();
  await loadLogSummary();
});
