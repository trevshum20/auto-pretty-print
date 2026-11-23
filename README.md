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
- **Animation**: Text wave rolls through visible text in about 1.6 seconds, with 12% growth, a palette-color shift, and a soft glow. Choose **Shimmer** for the original sweep. Uncheck to disable; recheck to preview. Respects macOS Reduce Motion.

All palettes support light and dark mode. Theme, Palette, Compact, and Animation preferences (including style)
are saved locally for all sites and restored after reloads and browser restarts.
JSON responses and folded-container states are never saved.
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
Change Theme, Palette, Compact, and Animation, then reload, open another JSON URL, and
restart the browser to check that your preferences are restored.
With Animation enabled, each refresh should play the selected effect once. Try
both Text wave and Shimmer. Disabling Animation or enabling Reduce Motion should
prevent either effect. Copying, folding, and compact wrapping should keep working.
DevTools Network should show only navigation and any browser favicon request;
HTML-like strings must not trigger alerts, images, or `/unexpected` requests.

Headless Chromium checks covered formatting, folding, compact selection/wrapping,
clipboard copying (including folded values, HTTP fallback, and failure feedback),
page exclusions, safe rendering, native controls, and all 24 palette/theme combinations.
Preference restoration was verified across reloads, different sites, and a full
browser restart; only preference values were stored.
Both effects were checked for cleanup, saved settings, and live Reduce Motion
changes. Text-wave checks also covered text alignment, clipboard output, folding,
compact wrapping, bounded work on large responses, and Shimmer fallback.
Interactive installation and clipboard behavior in your browser can be checked manually.

## Privacy and limitations

Everything runs locally using safe DOM APIs. The only API permission is `storage`,
used to save preferences in extension-local storage on this browser profile.
JSON responses are never saved. There are no network calls, telemetry, external
assets, or cookie/token access. Preferences do not sync to other computers. Automatic operation requires
content-script access to all HTTP(S) sites, which Chrome may describe as reading and
changing site data. Site access can be restricted in the extension's details.

- Detection uses `document.contentType` and Chromium's plain JSON layout. Incorrect MIME types and unfamiliar layouts are skipped, as are HTML, XML, plain text, iframes, downloads, and non-HTTP(S) URLs.
- Chromium's native pretty-print checkbox is retained. Toggling it can remove highlighting and folding; toggle **Compact** on/off or refresh to restore them. Other JSON viewers may conflict.
- Manual text selection may omit folded values. The **Copy** action always includes them. It writes plain text only after a click or the shortcut and never reads your clipboard. A copy-event fallback supports plain HTTP; browser policies can still block copying.
- `JSON.parse()` / `JSON.stringify()` normalize formatting, duplicate keys, property order, and numbers. Large numbers may lose precision or exceed JavaScript's range. The original HTTP response is never changed.
- Very large documents may briefly block the tab.
- Text wave uses temporary, noninteractive copies of up to 180 visible tokens, leaving JSON layout unchanged. It stops on interaction, scrolling, resizing, or content changes. Large wrapped values and unsuitable layouts fall back to Shimmer.
- The animation confirms the JSON was rendered. A reload may still use a cached response; the extension does not force a new network request.
