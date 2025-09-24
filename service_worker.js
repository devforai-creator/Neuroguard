const DAILY_RESET_KEY = "yc-last-reset";

async function ensureDailyReset() {
  const today = new Date().toISOString().slice(0, 10);
  const { [DAILY_RESET_KEY]: lastReset } = await chrome.storage.local.get(DAILY_RESET_KEY);
  if (lastReset === today) return;

  const { logs = {} } = await chrome.storage.local.get("logs");

  // prune logs older than 30 days to keep storage bounded
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const pruned = Object.fromEntries(
    Object.entries(logs).filter(([day]) => day >= cutoff)
  );

  await chrome.storage.local.set({ logs: pruned, [DAILY_RESET_KEY]: today });
}

chrome.runtime.onInstalled.addListener(() => {
  ensureDailyReset().catch(console.error);
});

chrome.runtime.onStartup.addListener(() => {
  ensureDailyReset().catch(console.error);
});
