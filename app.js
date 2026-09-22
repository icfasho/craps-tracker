const PLACE_NUMBERS = [4, 5, 6, 8, 9, 10];
const oddsMultiplier = { 4: 2, 5: 1.5, 6: 1.2, 8: 1.2, 9: 1.5, 10: 2 };
const placeMultiplier = { 4: 9 / 5, 5: 7 / 5, 6: 7 / 6, 8: 7 / 6, 9: 7 / 5, 10: 9 / 5 };
const defaults = { starting: 1000, bankroll: 1000, pass: 25, odds: 0, places: { 4: 0, 5: 0, 6: 18, 8: 18, 9: 0, 10: 0 }, point: null, rolls: 0, runs: [], pendingWin: null, history: [], snapshots: [] };
let sessionBook = loadSessions();
let state = normalize(sessionBook.sessions.find(s => s.id === sessionBook.activeId).state);
const $ = (id) => document.getElementById(id);
const money = (n) => `${n < 0 ? "-" : ""}$${Math.abs(n).toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
const number = (id) => Math.max(0, Number($(id).value) || 0);

function load() {
  try {
    const saved = JSON.parse(localStorage.getItem("craps-tracker"));
    if (!saved) return structuredClone(defaults);
    return normalize(saved);
  } catch { return structuredClone(defaults); }
}
function makeSession(name, sessionState) {
  return { id: crypto.randomUUID(), name, createdAt: new Date().toISOString(), state: sessionState };
}
function loadSessions() {
  const raw = localStorage.getItem("craps-sessions-v1");
  if (raw) {
    const book = JSON.parse(raw);
    if (!Array.isArray(book.sessions) || !book.sessions.length) throw Error("Session storage is invalid");
    if (!book.sessions.some(s => s.id === book.activeId)) book.activeId = book.sessions[0].id;
    return book;
  }
  const first = makeSession("Session 1", load());
  return { activeId: first.id, sessions: [first] };
}
function escapeText(value) {
  return String(value).replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));
}
function renderSessions() {
  $("session-select").innerHTML = sessionBook.sessions.map(s =>
    `<option value="${escapeText(s.id)}">${escapeText(s.name)} · ${escapeText(new Date(s.createdAt).toLocaleDateString())} · P/L ${money(s.state.bankroll - s.state.starting)}</option>`
  ).join("");
  $("session-select").value = sessionBook.activeId;
  $("session-count").textContent = `已保存 ${sessionBook.sessions.length} 场 · 仅保存在本机`;
}
function switchSession(id) {
  if (!sessionBook.sessions.some(s => s.id === id) || !save()) return;
  sessionBook.activeId = id;
  state = normalize(sessionBook.sessions.find(s => s.id === id).state);
  $("press-dialog").close();
  if (state.pendingWin) { $("press-amount").value = state.pendingWin.profit; $("press-target").value = PLACE_NUMBERS.includes(state.pendingWin.roll) ? state.pendingWin.roll : 6; }
  syncInputs(); render();
  if (state.pendingWin) $("press-dialog").showModal();
}
function createSession(name, starting) {
  if (!Number.isFinite(starting) || starting < 0 || !save()) return false;
  const fresh = structuredClone(defaults);
  fresh.starting = starting; fresh.bankroll = starting;
  const entry = makeSession(name.trim().slice(0, 80) || `Session ${sessionBook.sessions.length + 1}`, fresh);
  sessionBook.sessions.push(entry);
  sessionBook.activeId = entry.id;
  state = fresh;
  syncInputs(); render();
  return true;
}
function normalize(saved) {
  const merged = { ...structuredClone(defaults), ...saved, places: { ...defaults.places, ...saved.places } };
  if (!Array.isArray(saved.runs)) {
    merged.rolls = 0; merged.runs = [];
    for (const item of [...(saved.history || [])].reverse()) {
      const roll = Number(item.roll || /^Roll (\d+)/.exec(item.label)?.[1]);
      if (!roll) continue;
      merged.rolls++;
      if (roll === 7) { merged.runs.unshift(merged.rolls); merged.rolls = 0; }
    }
  }
  return merged;
}
function save() {
  sessionBook.sessions.find(s => s.id === sessionBook.activeId).state = structuredClone(state);
  try {
    localStorage.setItem("craps-sessions-v1", JSON.stringify(sessionBook));
    $("save-error").textContent = "";
    return true;
  } catch {
    $("save-error").textContent = "本机保存失败，可能空间不足。请暂时不要关闭页面。";
    return false;
  }
}
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
  PLACE_NUMBERS.forEach((n) => $("place-" + n).value = state.places[n]);
}
function render() {
  $("roll-count").textContent = `${state.rolls} rolls`;
  $("previous-run").textContent = state.runs.length ? `上一段 ${state.runs[0]} rolls（含 7）` : "尚无已结束的段";
  $("run-total").textContent = `已结束 ${state.runs.length} 段`;
  $("run-history").innerHTML = [...state.runs].reverse().map((count, i) =>
    `<li><span>第 ${i + 1} 段 · 已结束</span><span>${count} rolls</span></li>`
  ).join("") + `<li><span>第 ${state.runs.length + 1} 段 · ${state.rolls ? "进行中" : "待开始"}</span><span>${state.rolls} rolls</span></li>`;
  const exposure = state.pass + (state.point ? state.odds : 0) + (state.point ? Object.values(state.places).reduce((a,b)=>a+b,0) : 0);
  $("exposure").textContent = money(exposure); $("bankroll").textContent = money(state.bankroll);
  const pl = +(state.bankroll - state.starting).toFixed(2); const plNode = $("session-pl"); plNode.textContent = `${pl >= 0 ? "+" : ""}${money(pl)}`; plNode.className = pl >= 0 ? "positive" : "negative";
  renderOutcomes();
  $("history").innerHTML = state.history.length ? state.history.slice(0, 12).map(h => `<li><span>${h.label}</span><span class="${h.delta >= 0 ? "positive" : "negative"}">${h.delta >= 0 ? "+" : ""}${money(h.delta)} · ${money(h.balance)}</span></li>`).join("") : '<li class="empty">还没有记录 roll。</li>';
  renderPress(); save(); renderSessions();
}
function outcomeCard(label, delta, neutral = false) { return `<div class="outcome"><b>${label}</b><span class="${neutral ? "neutral" : delta >= 0 ? "positive" : "negative"}">${neutral ? "无即时盈亏" : `${delta >= 0 ? "+" : ""}${money(delta)}`}</span></div>`; }
function renderOutcomes() {
  if (!state.point) {
    $("outcome-intro").textContent = "开局：7 / 11 赢 Pass Line；2 / 3 / 12 输 Pass Line；其余数字进入下一阶段。";
    $("outcome-grid").innerHTML = outcomeCard("7 或 11 · Pass win", nextRollChange(7)) + outcomeCard("2 / 3 / 12 · Pass loss", nextRollChange(2)) + outcomeCard("4 / 5 / 6", 0, true) + outcomeCard("8 / 9 / 10 · 建立 Point", 0, true);
    return;
  }
  $("outcome-intro").textContent = "按当前下注计算下一掷的净盈亏。";
  const cards = [outcomeCard(`掷出 ${state.point} · 本轮结算`, nextRollChange(state.point)), outcomeCard("7 · 清台", nextRollChange(7))];
  PLACE_NUMBERS.filter(n => state.places[n] > 0 && n !== state.point).forEach(n => cards.push(outcomeCard(`Place ${n} hit`, placePayout(n))));
  $("outcome-grid").innerHTML = cards.join("");
}
function recordRoll(roll) {
  if (state.pendingWin) return;
  state.snapshots.push(structuredClone({ ...state, snapshots: [] }));
  const beforePoint = state.point; const delta = nextRollChange(roll); state.bankroll = +(state.bankroll + delta).toFixed(2); state.rolls += 1;
  let event = `Roll ${roll}`;
  if (roll === 7) { state.runs.unshift(state.rolls); event += ` · 本段 ${state.rolls} rolls（含 7）`; state.rolls = 0; }
  if (!beforePoint && ![2,3,7,11,12].includes(roll)) { state.point = roll; event += ` · Point ${roll} established`; }
  else if (!beforePoint && [7,11].includes(roll)) event += " · Pass Line win";
  else if (!beforePoint && [2,3,12].includes(roll)) { event += " · Pass Line loss"; state.pass = 0; }
  else if (beforePoint && roll === 7) { event += " · 7-out"; state.point = null; state.pass = 0; state.odds = 0; state.places = Object.fromEntries(PLACE_NUMBERS.map(n => [n, 0])); }
  else if (beforePoint && roll === beforePoint) { event += ` · Point made`; state.point = null; state.pass = 0; state.odds = 0; }
  else if (beforePoint && state.places[roll]) event += ` · Place ${roll} paid`;
  state.history.unshift({ label: event, roll, delta, balance: state.bankroll });
  if (delta > 0) {
    state.pendingWin = { roll, profit: delta };
    $("press-target").value = PLACE_NUMBERS.includes(roll) ? roll : 6;
    $("press-amount").value = delta;
  }
  syncInputs(); render();
  if (state.pendingWin) $("press-dialog").showModal();
}
function renderPress() {
  if (!state.pendingWin) return;
  const { roll, profit } = state.pendingWin;
  const target = Number($("press-target").value);
  const amount = Number($("press-amount").value);
  const valid = Number.isFinite(amount) && amount > 0 && amount <= profit && Math.abs(amount * 100 - Math.round(amount * 100)) < 0.00001;
  $("press-profit").textContent = `刚才掷出 ${roll}，实际净赢利 ${money(profit)}。`;
  $("apply-press").disabled = !valid;
  $("press-result").textContent = valid
    ? `Place ${target}：${money(state.places[target])} → ${money(state.places[target] + amount)}；收下 ${money(profit - amount)}。`
    : `请输入大于 0、最多 ${money(profit)} 的金额（最多两位小数）。`;
}
function settlePress(press) {
  if (!state.pendingWin) return;
  renderPress();
  if (press && $("apply-press").disabled) return;
  const amount = press ? Number($("press-amount").value) : 0;
  const target = Number($("press-target").value);
  if (press) state.places[target] = +(state.places[target] + amount).toFixed(2);
  state.history[0].label += press ? ` · Press ${money(amount)} → Place ${target}` : " · 全部收下";
  state.pendingWin = null;
  $("press-dialog").close();
  syncInputs(); render();
}

$("place-grid").innerHTML = PLACE_NUMBERS.map(n => `<label>Place ${n}<input id="place-${n}" class="quick-input" inputmode="decimal" type="text" /></label>`).join("");
$("roll-buttons").innerHTML = [2,3,4,5,6,7,8,9,10,11,12].map(n => `<button data-roll="${n}">${n}</button>`).join("");
const pressOptions = PLACE_NUMBERS.map(n => `<option value="${n}">Place ${n}</option>`).join(""); $("press-target").innerHTML = pressOptions; $("press-target").value = 6;
if (state.pendingWin) $("press-amount").value = state.pendingWin.profit;
syncInputs(); render();
$("pass-line").addEventListener("input", () => { state.pass = number("pass-line"); render(); });
$("odds").addEventListener("input", () => { state.odds = number("odds"); render(); });
$("starting-bankroll").addEventListener("change", () => { const delta = number("starting-bankroll") - state.starting; state.starting += delta; state.bankroll += delta; render(); });
PLACE_NUMBERS.forEach(n => $("place-" + n).addEventListener("input", () => { state.places[n] = number("place-" + n); render(); }));
$("roll-buttons").addEventListener("click", e => { if (e.target.dataset.roll) recordRoll(Number(e.target.dataset.roll)); });
$("clear-place").onclick = () => { state.places = Object.fromEntries(PLACE_NUMBERS.map(n => [n, 0])); syncInputs(); render(); };
$("press-target").onchange = renderPress; $("press-amount").oninput = renderPress;
$("apply-press").onclick = () => settlePress(true);
$("collect-profit").onclick = () => settlePress(false);
$("press-half").onclick = () => { $("press-amount").value = Math.floor(state.pendingWin.profit * 50) / 100; renderPress(); };
$("press-all").onclick = () => { $("press-amount").value = state.pendingWin.profit; renderPress(); };
$("press-dialog").addEventListener("cancel", event => { event.preventDefault(); settlePress(false); });
if (state.pendingWin) $("press-dialog").showModal();
document.querySelectorAll(".quick-input").forEach(input => input.addEventListener("focus", () => input.select()));
$("clear-history").onclick = () => { state.history = []; state.snapshots = []; render(); }; $("undo-roll").onclick = () => { const previous = state.snapshots.pop(); if (!previous) return; state = normalize({ ...previous, snapshots: state.snapshots }); syncInputs(); render(); };
$("reset-session").onclick = () => {
  $("new-session-name").value = `Session ${sessionBook.sessions.length + 1}`;
  $("new-session-bankroll").value = state.starting;
  $("new-session-dialog").showModal();
};
$("cancel-session").onclick = () => $("new-session-dialog").close();
$("create-session").onclick = () => {
  const starting = Number($("new-session-bankroll").value);
  if ($("new-session-bankroll").value.trim() === "" || !Number.isFinite(starting) || starting < 0) {
    $("new-session-error").textContent = "请输入有效的起始金额。"; return;
  }
  if (createSession($("new-session-name").value, starting)) {
    $("new-session-dialog").close(); $("new-session-error").textContent = "";
  }
};
$("session-select").onchange = () => switchSession($("session-select").value);
$("rename-session").onclick = () => {
  const entry = sessionBook.sessions.find(s => s.id === sessionBook.activeId);
  const name = prompt("给这场 Session 命名", entry.name);
  if (name !== null && name.trim()) { entry.name = name.trim().slice(0, 80); render(); }
};

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
