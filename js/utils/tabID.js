// Create a BroadcastChannel to communicate between tabs
const channel = new BroadcastChannel('tab-channel');

// Generate a unique ID for the current tab
const tabID = Math.random().toString(36).substr(2, 9);
sessionStorage.tabID = tabID;

// Get the current count of tabs and increment it
let tabCount = parseInt(localStorage.getItem('tab-count')) || 0;
localStorage.setItem('tab-count', ++tabCount);

// Broadcast to other tabs that a new tab was opened
channel.postMessage('tab-opened');

// When receiving a message that a tab was opened, update the count
channel.onmessage = function () {
  let tabOrder = parseInt(localStorage.getItem('tab-count'));
//  document.getElementById('tab-info').textContent = `You are on Tab${tabOrder}, and there are ${tabOrder} tabs open.`;
};

// Update the display on the current page
//document.getElementById('tab-info').textContent = `You are on Tab${tabCount}, and there are ${tabCount} tabs open.`;

// When the tab is closed or reloaded, decrement the count and notify other tabs
window.addEventListener('unload', function () {
  let tabCount = parseInt(localStorage.getItem('tab-count')) - 1;
  localStorage.setItem('tab-count', tabCount);
  channel.postMessage('tab-closed');
});


export { tabID };


