const PLACE_NUMBERS = [4, 5, 6, 8, 9, 10];
const oddsMultiplier = { 4: 2, 5: 1.5, 6: 1.2, 8: 1.2, 9: 1.5, 10: 2 };
const placeMultiplier = { 4: 9 / 5, 5: 7 / 5, 6: 7 / 6, 8: 7 / 6, 9: 7 / 5, 10: 9 / 5 };
const defaults = { starting: 1000, bankroll: 1000, pass: 25, odds: 0, places: { 4: 0, 5: 0, 6: 18, 8: 18, 9: 0, 10: 0 }, point: null, rolls: 0, maxOdds: 3, tableMin: 15, history: [], snapshots: [] };
let state = load();
const $ = (id) => document.getElementById(id);
const money = (n) => `${n < 0 ? "-" : ""}$${Math.abs(n).toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
const number = (id) => Math.max(0, Number($(id).value) || 0);

function load() {
  try {
    const saved = JSON.parse(localStorage.getItem("craps-tracker"));
    if (!saved) return structuredClone(defaults);
    return { ...defaults, ...saved, places: { ...defaults.places, ...saved.places }, snapshots: saved.snapshots || [] };
  } catch { return structuredClone(defaults); }
}
function save() { localStorage.setItem("craps-tracker", JSON.stringify(state)); }
function placePayout(n) { return +(state.places[n] * placeMultiplier[n]).toFixed(2); }
function nextRollChange(roll) {
  const pointOn = Boolean(state.point);
  if (!pointOn) {
    if (roll === 7 || roll === 11) return state.pass;
    if ([2, 3, 12].includes(roll)) return -state.pass;
    return 0;
  }
  if (roll === 7) return -(state.pass + state.odds + Object.values(state.places).reduce((a, b) => a + b, 0));
  let change = state.places[roll] ? placePayout(roll) : 0;
  if (roll === state.point) change += state.pass + state.odds * oddsMultiplier[state.point];
  return +change.toFixed(2);
}
function syncInputs() {
  $("starting-bankroll").value = state.starting; $("pass-line").value = state.pass; $("odds").value = state.odds;
  $("max-odds").value = state.maxOdds; $("table-min").value = state.tableMin;
  PLACE_NUMBERS.forEach((n) => $("place-" + n).value = state.places[n]);
}
function render() {
  $("point-display").textContent = state.point || "COME OUT"; $("roll-count").textContent = `${state.rolls} roll${state.rolls === 1 ? "" : "s"}`;
  const exposure = state.pass + (state.point ? state.odds : 0) + (state.point ? Object.values(state.places).reduce((a,b)=>a+b,0) : 0);
  $("exposure").textContent = money(exposure); $("bankroll").textContent = money(state.bankroll);
  const pl = +(state.bankroll - state.starting).toFixed(2); const plNode = $("session-pl"); plNode.textContent = `${pl >= 0 ? "+" : ""}${money(pl)}`; plNode.className = pl >= 0 ? "positive" : "negative";
  const allowed = state.pass * state.maxOdds; $("odds-warning").textContent = state.odds > allowed ? `超过 ${state.maxOdds}x 上限（$${allowed}）` : "";
  $("outcome-grid").innerHTML = [2,3,4,5,6,8,9,10,11,12].map(n => outcomeCard(n)).join("") + outcomeCard(7);
  const target = state.point || "come-out"; $("target-label").textContent = `命中 ${target}`; setSigned($("target-win"), nextRollChange(state.point || 7)); setSigned($("seven-loss"), nextRollChange(7));
  $("history").innerHTML = state.history.length ? state.history.slice(0, 12).map(h => `<li><span>${h.label}</span><span class="${h.delta >= 0 ? "positive" : "negative"}">${h.delta >= 0 ? "+" : ""}${money(h.delta)} · ${money(h.balance)}</span></li>`).join("") : '<li class="empty">还没有记录 roll。</li>';
  renderPress(); save();
}
function outcomeCard(n) { const delta = nextRollChange(n); return `<div class="outcome"><b>${n}</b><span class="${delta >= 0 ? "positive" : "negative"}">${delta >= 0 ? "+" : ""}${money(delta)}</span></div>`; }
function setSigned(node, value) { node.textContent = `${value >= 0 ? "+" : ""}${money(value)}`; node.className = value >= 0 ? "positive" : "negative"; }
function recordRoll(roll) {
  state.snapshots.push(structuredClone({ ...state, snapshots: [] }));
  const beforePoint = state.point; const delta = nextRollChange(roll); state.bankroll = +(state.bankroll + delta).toFixed(2); state.rolls += 1;
  let event = `Roll ${roll}`;
  if (!beforePoint && ![2,3,7,11,12].includes(roll)) { state.point = roll; event += ` · Point ${roll} established`; }
  else if (!beforePoint && [7,11].includes(roll)) event += " · Pass Line win";
  else if (!beforePoint && [2,3,12].includes(roll)) { event += " · Pass Line loss"; state.pass = 0; }
  else if (beforePoint && roll === 7) { event += " · 7-out"; state.point = null; state.pass = 0; state.odds = 0; state.places = Object.fromEntries(PLACE_NUMBERS.map(n => [n, 0])); }
  else if (beforePoint && roll === beforePoint) { event += ` · Point made`; state.point = null; state.pass = 0; state.odds = 0; }
  else if (beforePoint && state.places[roll]) event += ` · Place ${roll} paid`;
  state.history.unshift({ label: event, delta, balance: state.bankroll }); syncInputs(); render();
}
function renderPress() { const stake = number("press-stake"); const mode = $("press-mode").value; const found = PLACE_NUMBERS.find(n => state.places[n] === stake) || 6; const profit = +(stake * placeMultiplier[found]).toFixed(2); let text = ""; if (mode === "full") text = `以 Place ${found} 计算：赢 ${money(profit)} 后，追加 ${money(profit)}，新下注 ${money(stake + profit)}。`; if (mode === "half") { const add = Math.floor(profit / 2); text = `以 Place ${found} 计算：赢 ${money(profit)} 后，收 ${money(profit - add)}、Press ${money(add)}，新下注 ${money(stake + add)}。`; } if (mode === "collect") text = `以 Place ${found} 计算：赢 ${money(profit)} 后不加注，收下全部 ${money(profit)}。`; $("press-result").textContent = text; }

$("place-grid").innerHTML = PLACE_NUMBERS.map(n => `<label>Place ${n}<input id="place-${n}" inputmode="decimal" type="number" min="0" step="1" /></label>`).join("");
$("roll-buttons").innerHTML = [2,3,4,5,6,7,8,9,10,11,12].map(n => `<button data-roll="${n}">${n}</button>`).join("");
syncInputs(); render();
$("pass-line").addEventListener("input", () => { state.pass = number("pass-line"); render(); });
$("odds").addEventListener("input", () => { state.odds = number("odds"); render(); });
$("starting-bankroll").addEventListener("change", () => { const delta = number("starting-bankroll") - state.starting; state.starting += delta; state.bankroll += delta; render(); });
PLACE_NUMBERS.forEach(n => $("place-" + n).addEventListener("input", () => { state.places[n] = number("place-" + n); render(); }));
$("max-odds").addEventListener("change", () => { state.maxOdds = Number($("max-odds").value); render(); }); $("table-min").addEventListener("input", () => { state.tableMin = number("table-min"); render(); });
$("roll-buttons").addEventListener("click", e => { if (e.target.dataset.roll) recordRoll(Number(e.target.dataset.roll)); });
$("clear-place").onclick = () => { state.places = Object.fromEntries(PLACE_NUMBERS.map(n => [n, 0])); syncInputs(); render(); };
$("toggle-settings").onclick = () => $("settings-content").classList.toggle("hidden"); $("press-stake").oninput = renderPress; $("press-mode").onchange = renderPress;
$("clear-history").onclick = () => { state.history = []; state.snapshots = []; render(); }; $("undo-roll").onclick = () => { const previous = state.snapshots.pop(); if (!previous) return; state = { ...previous, snapshots: state.snapshots }; syncInputs(); render(); };
$("reset-session").onclick = () => { if (confirm("开始新的 session？当前记录会清除。")) { state = structuredClone(defaults); syncInputs(); render(); } };

let installPrompt;
window.addEventListener("beforeinstallprompt", (event) => { event.preventDefault(); installPrompt = event; $("install-app").textContent = "安装 App"; });
$("install-app").onclick = async () => {
  if (installPrompt) { installPrompt.prompt(); await installPrompt.userChoice; installPrompt = null; return; }
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
  $("install-help-copy").innerHTML = isIOS
    ? "<p>在 Safari 打开此页面，点底部的 <b>分享</b> 按钮，然后选择 <b>加入主画面</b>。</p><p>安装后会像普通 App 一样从主屏幕打开，并保留本机记录。</p>"
    : "<p>请在 Chrome 或 Edge 打开此页面，然后使用浏览器菜单中的 <b>安装应用</b> 或 <b>添加到主屏幕</b>。</p><p>安装需要通过 HTTPS 网站访问；直接打开本地文件时，仍可正常使用但无法启用离线安装。</p>";
  $("install-help").showModal();
};
$("close-install-help").onclick = () => $("install-help").close();
if ("serviceWorker" in navigator && location.protocol !== "file:") navigator.serviceWorker.register("service-worker.js");
