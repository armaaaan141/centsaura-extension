// Runs only inside popup.html
document.addEventListener("DOMContentLoaded", () => {
  // 1) Grab your UI elements
  const intervalInput = document.getElementById("interval");
  const repeatInput   = document.getElementById("repeatnumber");
  const refreshBtn    = document.getElementById("refresh");
  const statusDiv     = document.getElementById("status");

  // 2) Load stored options (with defaults) and populate the UI
  chrome.storage.sync.get(
    { interval: 7, repeatnumber: 0 },
    ({ interval, repeatnumber }) => {
      intervalInput.value     = interval;
      repeatInput.value       = repeatnumber;
    }
  );

  // 3) Save on click
  refreshBtn.addEventListener("click", () => {
    const newOpts = {
      interval: Number(intervalInput.value) || 7,
      repeatnumber: Number(repeatInput.value) || 0
    };
    chrome.storage.sync.set(newOpts, () => {
      statusDiv.textContent = "✅ Saved!";
      setTimeout(() => (statusDiv.textContent = ""), 1500);
    });
  });
});
