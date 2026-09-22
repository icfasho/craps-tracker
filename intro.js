(() => {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const cover = document.createElement("div");
  cover.className = "intro-cover";
  cover.setAttribute("role", "dialog");
  cover.setAttribute("aria-label", "Craps 助手开场动画");
  const img = document.createElement("img");
  img.alt = "Craps 助手";
  const skip = document.createElement("button");
  skip.type = "button";
  skip.textContent = "跳过";
  cover.append(img, skip);
  document.body.append(cover);
  let timer;
  const fallback = setTimeout(close, 7000);
  function close() {
    clearTimeout(timer);
    clearTimeout(fallback);
    cover.remove();
  }
  skip.onclick = close;
  cover.addEventListener("keydown", event => { if (event.key === "Escape") close(); });
  img.onload = () => { timer = setTimeout(close, 2630); };
  img.onerror = close;
  img.src = "craps-assistant.gif";
})();
