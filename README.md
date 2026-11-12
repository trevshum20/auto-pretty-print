# Auto Pretty Print JSON

A lightweight Chromium extension by [@trevshum20](https://github.com/trevshum20)
that automatically formats standalone JSON. No dependencies or build step.

## Features

- Two-space indentation and highlighting for keys, strings, numbers, booleans, and `null`.
- **Compact** checkbox: single-line JSON that wraps visually without adding line breaks when copied.
- **Copy** icon button or **Command+Option+X**: copies complete JSON in the current format, including folded values, without toolbar text. Shows “Copied!” or “Copy failed”.
- Click an underlined `{` or `[` to collapse or expand an object or array.
- **Theme**: System (follows your laptop), Dark, or Light.
- **Palette**: Classic, Nord, Dracula, Catppuccin, Ocean, Sunset, Forest, Candy, Halloween, Christmas, Harvest, or Winter.

All palettes support light and dark mode. Controls reset on reload; nothing is saved.
Nord, Dracula, and Catppuccin are adaptations inspired by
[Nord](https://www.nordtheme.com/docs/colors-and-palettes/),
[Dracula/Alucard](https://github.com/dracula/dracula-theme#color-palette-oss), and
[Catppuccin](https://github.com/catppuccin/palette), with shades adjusted for readability.

## Install

1. Open `chrome://extensions` in Chrome or Chromium.
2. Enable **Developer mode**.
3. Click **Load unpacked** and select this directory.
4. Navigate directly to an HTTP(S) URL returning `application/json` or `application/*+json`.

After changing code, click the extension's **Reload** button, then refresh the JSON tab.

## Test locally

With Node.js installed, run the optional fixture server (no packages required):

```sh
node tests/serve.js
```

Open `http://127.0.0.1:8080/object`. If the port is busy, use
`node tests/serve.js 8081`. Stop with Ctrl+C.

| Paths | Check |
| --- | --- |
| `/object`, `/array`, `/folding` | Highlighting, nested folding, empty containers, and safe display of HTML-like strings. |
| `/string`, `/number`, `/boolean`, `/null` | Top-level primitives. |
| `/problem`, `/vendor` | JSON MIME suffixes. |
| `/invalid`, `/empty`, `/plain`, `/xml`, `/html` | Original pages stay unchanged. |
| `/long` | Compact wrapping and single-line copying; scrolling in formatted view. |

Try the Compact checkbox, nested folds, and each palette in both themes. Use
**Copy** in both formats, including with folded containers; paste into a text editor
and verify complete JSON with no toolbar labels or ellipses. On macOS, also test
**Command+Option+X** with the JSON page focused. It uses the same Copy action
and is active only on pages formatted by the extension, not in the address bar
or other apps. Held keys do not repeatedly copy.
DevTools Network should show only navigation and any browser favicon request;
HTML-like strings must not trigger alerts, images, or `/unexpected` requests.

Headless Chromium checks covered formatting, folding, compact selection/wrapping,
clipboard copying (including folded values, HTTP fallback, and failure feedback),
page exclusions, safe rendering, native controls, and all 24 palette/theme combinations.
Interactive installation and clipboard behavior in your browser can be checked manually.

## Privacy and limitations

Everything runs locally using safe DOM APIs. No network calls, telemetry, storage,
external assets, cookie/token access, or API permissions. Automatic operation requires
content-script access to all HTTP(S) sites, which Chrome may describe as reading and
changing site data. Site access can be restricted in the extension's details.

- Detection uses `document.contentType` and Chromium's plain JSON layout. Incorrect MIME types and unfamiliar layouts are skipped, as are HTML, XML, plain text, iframes, downloads, and non-HTTP(S) URLs.
- Chromium's native pretty-print checkbox is retained. Toggling it can remove highlighting and folding; toggle **Compact** on/off or refresh to restore them. Other JSON viewers may conflict.
- Manual text selection may omit folded values. The **Copy** action always includes them. It writes plain text only after a click or the shortcut and never reads your clipboard. A copy-event fallback supports plain HTTP; browser policies can still block copying.
- `JSON.parse()` / `JSON.stringify()` normalize formatting, duplicate keys, property order, and numbers. Large numbers may lose precision or exceed JavaScript's range. The original HTTP response is never changed.
- Very large documents may briefly block the tab.
