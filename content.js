(() => {
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

  function render(pretty) {
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

  render(true);
  pre.addEventListener("click", event => {
    const toggle = event.target.closest("button.json-toggle");
    if (!toggle || !pre.contains(toggle)) return;
    const collapsed = toggle.parentElement.classList.toggle("json-collapsed");
    toggle.setAttribute("aria-expanded", String(!collapsed));
    toggle.title = `${collapsed ? "Expand" : "Collapse"} ${toggle.textContent === "{" ? "object" : "array"}`;
  });
  pre.classList.add("auto-pretty-print");
  document.documentElement.setAttribute("data-auto-pretty-print", "system");
  document.documentElement.setAttribute("data-json-palette", "classic");

  const controls = document.createElement("div");
  controls.className = "auto-pretty-print-controls";
  const viewLabel = document.createElement("label");
  viewLabel.append(document.createTextNode("Compact "));
  const view = document.createElement("input");
  view.type = "checkbox";
  view.className = "auto-pretty-print-view";
  view.addEventListener("change", () => render(!view.checked));
  viewLabel.append(view);
  controls.append(viewLabel);

  // Per-page controls; system preference and live changes are handled by CSS.
  const label = document.createElement("label");
  label.className = "auto-pretty-print-theme";
  label.append(document.createTextNode("Theme "));
  const select = document.createElement("select");
  for (const name of ["System", "Dark", "Light"]) {
    const option = document.createElement("option");
    option.value = name.toLowerCase();
    option.textContent = name;
    select.append(option);
  }
  select.addEventListener("change", () => {
    document.documentElement.setAttribute("data-auto-pretty-print", select.value);
  });
  label.append(select);
  controls.append(label);

  const paletteLabel = document.createElement("label");
  paletteLabel.className = "auto-pretty-print-palette";
  paletteLabel.append(document.createTextNode("Palette "));
  const palette = document.createElement("select");
  for (const name of ["Classic", "Nord", "Dracula", "Catppuccin", "Ocean", "Sunset",
    "Forest", "Candy", "Halloween", "Christmas", "Harvest", "Winter"]) {
    const option = document.createElement("option");
    option.value = name.toLowerCase();
    option.textContent = name;
    palette.append(option);
  }
  palette.addEventListener("change", () => {
    document.documentElement.setAttribute("data-json-palette", palette.value);
  });
  paletteLabel.append(palette);
  controls.append(paletteLabel);
  body.prepend(controls);
})();
