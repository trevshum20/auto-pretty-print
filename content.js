(async () => {
  "use strict";

  // contentType exposes the document's MIME type without reading response headers.
  const type = document.contentType.split(";", 1)[0].trim();
  if (!/^application\/(?:json|[a-z0-9!#$%&'*+.^_`|~-]+\+json)$/i.test(type)) {
    return;
  }

  const body = document.body;
  const pre = body?.firstElementChild;
  if (!pre || pre.tagName !== "PRE" || pre.children.length || document.scripts.length) {
    return;
  }

  // Accept only Chromium's raw text layout, optionally with its native control.
  // Keep the original PRE and native control so browser listeners remain intact.
  const nativeControl = pre.nextElementSibling;
  if (nativeControl && (nativeControl.tagName !== "DIV" ||
      nativeControl.className !== "json-formatter-container" ||
      nativeControl.childNodes.length || nativeControl.nextElementSibling)) {
    return;
  }
  if ([...body.childNodes].some(node => node !== pre && node !== nativeControl &&
      (node.nodeType !== Node.TEXT_NODE || node.textContent.trim()))) {
    return;
  }

  let data;
  let prettyText;
  try {
    data = JSON.parse(pre.textContent);
    prettyText = JSON.stringify(data, null, 2);
  } catch {
    return; // Invalid, empty, or excessively deep JSON: leave everything intact.
  }

  let stopWave;
  function render(pretty) {
    stopWave?.();
    const formatted = pretty ? prettyText : JSON.stringify(data);
    // Tokenize only our serialized JSON; all untrusted text becomes text nodes.
    const tokens = /"(?:[^"\\]|\\.)*"\s*:|"(?:[^"\\]|\\.)*"|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?|true|false|null|\{\}|\[\]|[{}\[\]]/g;
    const fragment = document.createDocumentFragment();
    const stack = [];
    let parent = fragment;
    let offset = 0;
    for (const match of formatted.matchAll(tokens)) {
      parent.append(document.createTextNode(formatted.slice(offset, match.index)));
      const token = match[0];
      if (pretty && (token === "{" || token === "[")) {
        const group = document.createElement("span");
        group.className = "json-container";
        const toggle = document.createElement("button");
        toggle.type = "button";
        toggle.className = "json-toggle";
        toggle.textContent = token;
        toggle.title = token === "{" ? "Collapse object" : "Collapse array";
        toggle.setAttribute("aria-expanded", "true");
        const contents = document.createElement("span");
        contents.className = "json-contents";
        group.append(toggle, contents);
        parent.append(group);
        stack.push({ parent, group });
        parent = contents;
      } else if (pretty && (token === "}" || token === "]")) {
        const entry = stack.pop();
        entry.group.append(document.createTextNode(token));
        parent = entry.parent;
      } else if (/^[{}\[\]]/.test(token)) {
        parent.append(document.createTextNode(token));
      } else {
        const span = document.createElement("span");
        const kind = token.startsWith('"') ? (token.endsWith(":") ? "key" : "string")
          : token === "null" ? "null"
          : token === "true" || token === "false" ? "boolean" : "number";
        span.className = `json-${kind}`;
        span.textContent = token;
        parent.append(span);
      }
      offset = match.index + token.length;
    }
    fragment.append(document.createTextNode(formatted.slice(offset)));
    pre.replaceChildren(fragment);
    pre.classList.toggle("json-compact", !pretty);
  }

  const themes = ["system", "dark", "light"];
  const palettes = ["classic", "nord", "dracula", "catppuccin", "ocean", "sunset",
    "forest", "candy", "halloween", "christmas", "harvest", "winter"];
  const defaults = { theme: "system", palette: "classic", compact: false,
    animationEnabled: true, animationStyle: "wave" };
  let preferences = { ...defaults };
  try {
    preferences = await chrome.storage.local.get(defaults);
  } catch {
    console.warn("JSON formatter: saved preferences could not be loaded.");
  }
  if (!themes.includes(preferences.theme)) preferences.theme = defaults.theme;
  if (!palettes.includes(preferences.palette)) preferences.palette = defaults.palette;
  if (typeof preferences.compact !== "boolean") preferences.compact = defaults.compact;
  if (typeof preferences.animationEnabled !== "boolean") preferences.animationEnabled = defaults.animationEnabled;
  if (!["wave", "shimmer"].includes(preferences.animationStyle)) preferences.animationStyle = defaults.animationStyle;

  function savePreference(update) {
    chrome.storage.local.set(update).catch(() => {
      console.warn("JSON formatter: preferences could not be saved.");
    });
  }

  render(!preferences.compact);
  pre.addEventListener("click", event => {
    const toggle = event.target.closest("button.json-toggle");
    if (!toggle || !pre.contains(toggle)) return;
    stopWave?.();
    const collapsed = toggle.parentElement.classList.toggle("json-collapsed");
    toggle.setAttribute("aria-expanded", String(!collapsed));
    toggle.title = `${collapsed ? "Expand" : "Collapse"} ${toggle.textContent === "{" ? "object" : "array"}`;
  });
  pre.classList.add("auto-pretty-print");
  document.documentElement.setAttribute("data-auto-pretty-print", preferences.theme);
  document.documentElement.setAttribute("data-json-palette", preferences.palette);

  const controls = document.createElement("div");
  controls.className = "auto-pretty-print-controls";
  const viewLabel = document.createElement("label");
  viewLabel.append(document.createTextNode("Compact "));
  const view = document.createElement("input");
  view.type = "checkbox";
  view.className = "auto-pretty-print-view";
  view.checked = preferences.compact;
  view.addEventListener("change", () => {
    render(!view.checked);
    savePreference({ compact: view.checked });
  });
  viewLabel.append(view);
  controls.append(viewLabel);

  // CSS handles live system appearance; only explicit preferences are stored.
  const label = document.createElement("label");
  label.className = "auto-pretty-print-theme";
  label.append(document.createTextNode("Theme "));
  const select = document.createElement("select");
  for (const name of themes) {
    const option = document.createElement("option");
    option.value = name;
    option.textContent = name[0].toUpperCase() + name.slice(1);
    select.append(option);
  }
  select.value = preferences.theme;
  select.addEventListener("change", () => {
    stopWave?.();
    document.documentElement.setAttribute("data-auto-pretty-print", select.value);
    savePreference({ theme: select.value });
  });
  label.append(select);
  controls.append(label);

  const paletteLabel = document.createElement("label");
  paletteLabel.className = "auto-pretty-print-palette";
  paletteLabel.append(document.createTextNode("Palette "));
  const palette = document.createElement("select");
  for (const name of palettes) {
    const option = document.createElement("option");
    option.value = name;
    option.textContent = name[0].toUpperCase() + name.slice(1);
    palette.append(option);
  }
  palette.value = preferences.palette;
  palette.addEventListener("change", () => {
    stopWave?.();
    document.documentElement.setAttribute("data-json-palette", palette.value);
    savePreference({ palette: palette.value });
  });
  paletteLabel.append(palette);
  controls.append(paletteLabel);

  const animationLabel = document.createElement("label");
  animationLabel.append(document.createTextNode("Animation "));
  const animation = document.createElement("input");
  animation.type = "checkbox";
  animation.className = "auto-pretty-print-animation";
  animation.checked = preferences.animationEnabled;
  animation.addEventListener("change", () => {
    savePreference({ animationEnabled: animation.checked });
    playRefreshAnimation();
  });
  animationLabel.append(animation);
  const animationStyle = document.createElement("select");
  animationStyle.className = "auto-pretty-print-animation-style";
  animationStyle.setAttribute("aria-label", "Refresh animation style");
  for (const [value, name] of [["wave", "Text wave"], ["shimmer", "Shimmer"]]) {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = name;
    animationStyle.append(option);
  }
  animationStyle.value = preferences.animationStyle;
  animationStyle.addEventListener("change", () => {
    savePreference({ animationStyle: animationStyle.value });
    playRefreshAnimation();
  });
  const animationSetting = document.createElement("span");
  animationSetting.className = "auto-pretty-print-animation-setting";
  animationSetting.append(animationLabel, animationStyle);
  controls.append(animationSetting);

  const copy = document.createElement("button");
  copy.type = "button";
  copy.className = "auto-pretty-print-copy";
  copy.title = "Copy complete JSON in the current format (⌘⌥X)";
  copy.setAttribute("aria-keyshortcuts", "Meta+Alt+X");
  const copyIcon = document.createElement("span");
  copyIcon.className = "json-copy-icon";
  copyIcon.setAttribute("aria-hidden", "true");
  const copyStatus = document.createElement("span");
  copyStatus.textContent = "Copy";
  copyStatus.setAttribute("aria-live", "polite");
  copy.append(copyIcon, copyStatus);
  let copyReset;
  copy.addEventListener("click", async () => {
    clearTimeout(copyReset);
    copy.disabled = true;
    try {
      // textContent includes folded values, but excludes CSS ellipses and controls.
      await copyText(pre.textContent);
      copyStatus.textContent = "Copied!";
    } catch {
      copyStatus.textContent = "Copy failed";
    } finally {
      copy.disabled = false;
      copyReset = setTimeout(() => { copyStatus.textContent = "Copy"; }, 2000);
    }
  });
  controls.append(copy);
  body.prepend(controls);

  document.addEventListener("keydown", event => {
    if (event.defaultPrevented || event.isComposing || event.code !== "KeyX" ||
        !event.metaKey || !event.altKey || event.ctrlKey || event.shiftKey) return;
    event.preventDefault();
    if (!event.repeat && !copy.disabled) copy.click();
  }, true);

  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
  reducedMotion.addEventListener("change", () => {
    if (reducedMotion.matches) {
      stopWave?.();
      document.querySelector(".auto-pretty-print-shimmer")?.remove();
    }
  });
  matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => stopWave?.());

  function playRefreshAnimation() {
    stopWave?.();
    document.querySelector(".auto-pretty-print-shimmer")?.remove();
    if (!animation.checked || reducedMotion.matches) return;
    if (animationStyle.value === "wave" && playTextWave()) return;
    playShimmer();
  }

  // Keep the simpler effect for an explicit choice or an unsuitable text layout.
  function playShimmer() {
    const shimmer = document.createElement("div");
    shimmer.className = "auto-pretty-print-shimmer";
    shimmer.setAttribute("aria-hidden", "true");
    shimmer.addEventListener("animationend", () => shimmer.remove(), { once: true });
    shimmer.addEventListener("animationcancel", () => shimmer.remove(), { once: true });
    body.append(shimmer);
  }
  playRefreshAnimation();

  function playTextWave() {
    if (!getSelection()?.isCollapsed) return false;
    const visible = [];
    const walker = document.createTreeWalker(pre, NodeFilter.SHOW_ELEMENT);
    let node;
    let visited = 0;
    // Read geometry before making changes; cap work even after deep scroll restoration.
    while ((node = walker.nextNode()) && visited++ < 1500 && visible.length < 180) {
      if (!node.matches(".json-key,.json-string,.json-number,.json-boolean,.json-null,.json-toggle")) continue;
      const rect = node.getBoundingClientRect();
      if (rect.top >= innerHeight) break;
      if (rect.bottom <= 0 || rect.right <= 0 || rect.left >= innerWidth || !rect.height) continue;
      const text = node.textContent;
      // A long wrapped value dominates compact view: preserve the familiar shimmer.
      if (text.length > 300 && rect.height > innerHeight / 3) return false;
      if (text.length > 300 || rect.width > innerWidth || node.getClientRects().length !== 1) continue;
      const style = getComputedStyle(node);
      visible.push({ node, rect, text, font: style.font, color: style.color,
        letterSpacing: style.letterSpacing, decoration: style.textDecoration });
    }
    if (!visible.length) return false;

    const overlay = document.createElement("div");
    overlay.className = "auto-pretty-print-wave";
    overlay.setAttribute("aria-hidden", "true");
    const animations = [];
    const interrupts = [[window, "scroll"], [window, "resize"],
      [document, "pointerdown"], [document, "keydown"]];
    const observer = new MutationObserver(cleanup);
    let stopped = false;
    function cleanup() {
      if (stopped) return;
      stopped = true;
      observer.disconnect();
      for (const [target, event] of interrupts) target.removeEventListener(event, cleanup, true);
      for (const item of visible) item.node.classList.remove("json-wave-hidden");
      for (const effect of animations) effect.cancel();
      overlay.remove();
      stopWave = undefined;
    }
    stopWave = cleanup;
    for (const [target, event] of interrupts) target.addEventListener(event, cleanup, true);
    observer.observe(pre, { childList: true, subtree: true });
    const top = visible[0].rect.top;
    const distance = Math.max(1, visible[visible.length - 1].rect.top - top);
    const colors = getComputedStyle(document.documentElement);
    const accent = colors.getPropertyValue("--json-boolean").trim();
    const alternate = colors.getPropertyValue("--json-number").trim();
    try {
      body.append(overlay);
      for (const item of visible) {
        const clone = document.createElement("span");
        clone.textContent = item.text;
        Object.assign(clone.style, { left: `${item.rect.left}px`, top: `${item.rect.top}px`,
          font: item.font, lineHeight: `${item.rect.height}px`, color: item.color,
          letterSpacing: item.letterSpacing, textDecoration: item.decoration });
        overlay.append(clone);
        item.node.classList.add("json-wave-hidden");
        const peakColor = item.node.classList.contains("json-boolean") ? alternate : accent;
        animations.push(clone.animate([
          { transform: "translateY(0) scale(1)", color: item.color, textShadow: "0 0 0 transparent" },
          { transform: "translateY(-2px) scale(1.12)", color: peakColor,
            textShadow: `0 0 6px color-mix(in srgb, ${peakColor} 45%, transparent)` },
          { transform: "translateY(0) scale(1)", color: item.color, textShadow: "0 0 0 transparent" }
        ], { duration: 700, delay: (item.rect.top - top) / distance * 900,
          easing: "ease-in-out", fill: "both" }));
      }
      Promise.all(animations.map(effect => effect.finished)).then(cleanup, cleanup);
      return true;
    } catch {
      cleanup();
      return false;
    }
  }

  async function copyText(text) {
    if (navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(text);
        return;
      } catch {
        // Fall back to a user-initiated copy event, also supported on plain HTTP.
      }
    }
    let copied = false;
    const onCopy = event => {
      event.clipboardData.setData("text/plain", text);
      event.preventDefault();
      copied = true;
    };
    document.addEventListener("copy", onCopy);
    try {
      if (!document.execCommand("copy") || !copied) {
        throw new Error("Clipboard unavailable");
      }
    } finally {
      document.removeEventListener("copy", onCopy);
    }
  }
})();
