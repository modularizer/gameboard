
let tabs = localStorage.getItem('tabs');
let existingTabs = tabs?JSON.parse(tabs):[];
console.log("Existing tabs: ", existingTabs, localStorage.getItem('tabs') );
// Generate a unique ID for the current tab

const randomTabID = Math.floor(Math.random() * 1000000000)
const tabID = Math.max(...existingTabs.map(v=>1*v.split("_")[0]), 0) + 1;
const fullTabID = tabID + "_" + randomTabID;

existingTabs.push(fullTabID);
localStorage.setItem('tabs', JSON.stringify(existingTabs));

console.log("Tab ID: ", tabID);

// When the tab is closed or reloaded, decrement the count and notify other tabs
window.addEventListener('beforeunload', function () {
  tabs = localStorage.getItem('tabs');
  existingTabs = tabs?JSON.parse(tabs):[];
  existingTabs = existingTabs.filter(v=>v!==fullTabID);
  localStorage.setItem('tabs', JSON.stringify(existingTabs));
});


export { tabID };


