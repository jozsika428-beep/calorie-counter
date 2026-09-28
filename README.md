# Calorie & Macro Counter

A free, private calorie and macro tracker that runs entirely in your browser.
No account, no subscription, no ads, no tracking. Your data never leaves your device.

## Features

- **Home**: a clean, card-based layout (visual style inspired by Cal AI, see below). At the top is a week strip whose day circles fill with that day's calorie progress (dashed = nothing logged; tap a day to open it). Below it are a big "Calories left" card with a ring, and three macro cards (protein, carbs, fat) with their own rings. Swipe that row (or tap the dots) to see fiber, sugar (counted as a *maximum*) and your latest weight. "Recently logged" shows your food as cards (time, kcal, P/C/F) grouped into Breakfast, Lunch, Dinner and Snacks. Use the ‹ › arrows, the week strip or the date to view and edit any day. The 🔥 chip is your day streak.
- **Adding food** (the **+** button or **+ Add** on a meal):
  - **Search**: the built-in food list plus your own foods and recipes. Favorites ★ and recent foods show up here for one-tap re-logging.
  - **Online**: searches [Open Food Facts](https://world.openfoodfacts.org) (free, no key needed).
  - **Barcode**: scan with the camera (where the browser supports it) or type the EAN/UPC number.
  - **📷 Photo**: take or choose a photo of your meal. An on-device food classifier (about 2000 dishes) shows its top 5 guesses with confidence and the matching foods from the food list. Tap one, check the grams (the default is the food's typical serving), choose the meal and confirm. Nothing is logged automatically, and portion sizes are only estimates. **Photos never leave your device**: recognition runs entirely in your browser. There's no upload, no API and no account.
  - **Quick add**: enter kcal and macros directly.
  - Enter amounts in grams/ml or servings. Nutrients are scaled from the per-100 g values. Tap a logged item to edit or delete it.
- **Foods tab**: create custom foods (with an optional barcode), build recipes or meals from ingredients (with servings and an optional cooked weight), and manage favorites. On the Today view, **Save** on a meal turns it into a reusable meal.
- **Progress**: a weight card (with a **Log weight** button) and a streak card with this week's dots, then weekly and monthly charts of calories (against your goal) and macros, per-day averages, and an optional weight log with a chart.
- **Settings**: daily goals, a goal helper (Mifflin-St Jeor BMR × activity factor, adjusted for lose/maintain/gain, with a suggested macro split that you can override), JSON backup and restore, CSV export (food log or daily totals), and a delete-all option.
- **Customization** (Settings → Customization, or the 🎨 button at the top), with a live preview. Every change applies instantly and is saved on this device:
  - **Theme**: Light, Dark or System (follows your phone/computer setting).
  - **Accent color**: 25 basic swatches (black, white, greys, reds, oranges, yellow, greens, teal, blues, purples, pinks, brown, beige) plus a free color picker. Text on buttons automatically switches between white and black for readability. If an accent would be invisible on the background (e.g. black in dark mode, white in light mode), the app adjusts it or adds an outline.
  - **Ring colors**: separate colors for the calories, protein, carbs and fat rings (the calories ring follows the accent by default).
  - **Font**: 10 choices shown as live previews: System default, Inter, Poppins, Nunito, Roboto, Montserrat, Lora (serif), Playfair Display (serif), Comic Neue (playful) and JetBrains Mono (monospace). The fonts are bundled with the app (no Google Fonts or other CDN at runtime), so they work offline.
  - **Text size**: Small, Normal or Large.
  - **Reset to default** restores the original black-and-white look.
- **Works offline** as an installable PWA. It uses metric units throughout.

## Files

| File | Purpose |
|---|---|
| `index.html`, `styles.css`, `app.js` | The app |
| `fonts/` | Bundled web fonts (13 woff2 files, latin subset, ≈ 340 KB), `fonts.css` with the `@font-face` rules, and the licenses in `fonts/licenses/` |
| `foods-fallback.js` | Built-in list of about 115 common foods, used if `foods.json` is missing or invalid |
| `foods.json` | Main food list (452 foods): an array of `{name, kcal, protein, carbs, fat, fiber, sugar}` per 100 g, with optional `unit: "ml"`, `serving_g`, `serving: {label, grams}` (e.g. "1 slice", 32 g) and `source` (shown under "Details & source" when adding a food). Values are used as-is, rounded only for display |
| `photo.js` | Photo recognition: loads the engine and model on first use (with a progress bar), preprocesses the image and maps model classes to foods (the mapping table is `MAP`, with keyword `RULES` as a fallback) |
| `model/` | Food classifier `aiy_food_v1_fp16.onnx` (10.7 MB), plus `labels.json`, the license and a README |
| `vendor/ort/` | ONNX Runtime Web 1.30.0, WebAssembly build (about 14.3 MB), plus its license |
| `tools/convert_aiy_food.py` | Script that converted the original TFLite model to ONNX |
| `manifest.json`, `sw.js`, `icons/` | PWA files: install prompt, offline cache (the fonts are precached in their own cache) and icons (`make-icons.py` regenerates the icons, needs Pillow) |
| `calorie-counter.html` | Self-contained single-file version. Just open it, no server needed. Photo recognition is **not** included, because the 25 MB model can't sensibly be inlined. The Photo tab explains this and points to the hosted app |
| `build-single.py` | Rebuilds `calorie-counter.html` from the source files, embedding `foods.json` if it's valid and the fallback list otherwise, and inlining the fonts as data URIs |

After changing any source file or adding `foods.json`, run:

```bash
python3 build-single.py
```

## Running locally

```bash
cd calorie-app
python3 -m http.server 8000
# open http://localhost:8000
```

You can also double-click `calorie-counter.html`. Everything works that way except offline caching, installation and photo recognition, and camera scanning may need HTTPS.

## Free hosting (recommended, gives HTTPS so camera scanning and "Install app" work)

**Netlify Drop** (easiest): go to <https://app.netlify.com/drop> and drag the `calorie-app` folder onto the page. You get an HTTPS URL right away. A free account keeps the site permanently.

**GitHub Pages**: create a repository, upload the folder contents (with `index.html` at the root), then go to *Settings → Pages → Deploy from branch → main / root*. The app will be at `https://<user>.github.io/<repo>/`.

Cloudflare Pages and Vercel also work: any static host does, since there's no backend.

To **install on your phone**: open the hosted URL. On Android/Chrome use *menu → Install app / Add to Home screen*. On iPhone/Safari use *Share → Add to Home Screen*.

## Your data

- Everything is stored in your browser's `localStorage` on that device only. Different browsers and devices don't sync.
- Clearing browser data deletes it, so **export a JSON backup regularly** (Settings → Data & backup). You can import it on another device.
- The only network requests are to Open Food Facts, and only when you search online or look up a barcode.
- **Photos never leave your device.** Food photos are downscaled and classified in memory in your browser, then discarded. They're never uploaded, stored or sent to any server or AI service. The model files are downloaded once from the same site as the app and cached for offline use.

## Limitations

- **Camera barcode scanning** uses the browser's `BarcodeDetector` API. It works in Chrome, Edge and Samsung Internet on **Android** (and Chrome on macOS/ChromeOS). It is **not** available in Firefox, in Safari on iOS/macOS, or in Chrome on Windows/Linux. There you can type the barcode number instead. The camera also requires HTTPS (or localhost).
- Open Food Facts is crowd-sourced, so check the values. Its search endpoint is sometimes rate-limited or busy (the app retries automatically), and barcode lookup is more reliable.
- **Photo recognition** identifies the *dish*, not the amount, so portion sizes are estimates you should adjust. It works best with one well-lit, close-up dish per photo. The model knows 2023 dishes, skewed toward North American food. Dutch classics like stamppot, poffertjes, stroopwafel, oliebol and frikandel are included, but plain ingredients (a banana, an apple) and mixed plates are weak spots. About 690 of the 1978 named classes map automatically to a food in the list. For the rest, use the "Search for…" link. The first use downloads about 25 MB; inference then takes roughly 40 ms on a desktop and a few hundred ms on a phone. It needs WebAssembly, which is supported by all current browsers.
- Built-in food values are typical averages (NEVO/USDA-style), not brand-specific.
- Goal suggestions are estimates, not medical advice.

## Credits

Based on data from NEVO online version 2025/9.0, RIVM, Bilthoven (and other data sources).
Additional nutrient data and serving sizes come from USDA FoodData Central.

Photo recognition uses Google's AIY Vision Classifier **food_V1** (MobileNet V1), © Google LLC, under the **Apache License 2.0** (<https://www.kaggle.com/models/google/aiy/tfLite/vision-classifier-food-v1>). It has been converted to ONNX with fp16 weights; see `model/README.md`. It runs with **ONNX Runtime Web** 1.30.0, © Microsoft Corporation, under the **MIT License**. Online product search and barcode lookup use Open Food Facts, whose data is available under the Open Database License (ODbL).

### Fonts

All bundled fonts are licensed under the **SIL Open Font License 1.1** (full texts in `fonts/licenses/`). The files are the unmodified latin-subset woff2 files distributed by the Google Fonts open-source collection, served locally from this app:

| Font | Copyright | License file |
|---|---|---|
| Inter | © 2020 The Inter Project Authors (github.com/rsms/inter) | `inter-OFL.txt` |
| Poppins | © 2020 The Poppins Project Authors (github.com/itfoundry/Poppins) | `poppins-OFL.txt` |
| Nunito | © 2014 The Nunito Project Authors (github.com/googlefonts/nunito) | `nunito-OFL.txt` |
| Roboto | © 2011 The Roboto Project Authors (github.com/googlefonts/roboto-classic) | `roboto-OFL.txt` |
| Montserrat | © 2024 The Montserrat Project Authors (github.com/JulietaUla/Montserrat) | `montserrat-OFL.txt` |
| Lora | © 2011 The Lora Project Authors, Reserved Font Name "Lora" | `lora-OFL.txt` |
| Playfair Display | © 2017 The Playfair Display Project Authors, Reserved Font Name "Playfair Display" | `playfairdisplay-OFL.txt` |
| Comic Neue | © 2014 The Comic Neue Project Authors (github.com/crozynski/comicneue) | `comicneue-OFL.txt` |
| JetBrains Mono | © 2020 The JetBrains Mono Project Authors (github.com/JetBrains/JetBrainsMono) | `jetbrainsmono-OFL.txt` |

"System default" uses your device's own font and nothing is downloaded for it.

### Design

The visual style (light, card-based layout, week strip, big calorie ring, per-macro ring cards, floating tab bar and round + button) is inspired by the Cal AI app. This is an independent, free project. It is **not affiliated with, endorsed by or connected to Cal AI** and uses none of its name, logo, code or assets.

