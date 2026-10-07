# Hexora Website

Official website for **Hexora** — apps, websites, logo design, photo & video editing, Sri Lanka.
Built with plain **HTML + CSS + JavaScript**. No installs, no build step, no server needed.

## Pages
| File | What it is |
|---|---|
| `index.html` | Home page: video hero, services, process, pricing, FAQ, contact |
| `service.html` | One page per service (`service.html?s=mobile-apps`): animation, what's included, how we work, pricing, FAQ and the other services in the same category. With no `?s=` it lists every service by category. |
| `start-project.html` | Project request form with a live LKR price estimate for apps/websites and for logo, design & video work. Customers send the request to WhatsApp or Email. |

## Folder structure
```
hexora-website/
├─ index.html
├─ service.html
├─ start-project.html
├─ README.md
└─ assets/
   ├─ css/style.css        all design + animations
   ├─ js/config.js         ← EDIT THIS: prices, WhatsApp, email, links
   ├─ js/pricing.js        USD → LKR rate + price maths
   ├─ js/main.js           menu, animations, video, live prices
   ├─ js/services.js       ← EDIT THIS: service pages text, categories, FAQ
   ├─ js/service.js        builds service.html from services.js
   ├─ js/planner.js        project form + estimate + WhatsApp/Email message
   ├─ brand/hexora-logo.png  your original logo (the site cuts the mark, name and tagline from it)
   └─ video/               hexora-intro.mp4 (logo animation)
```

## How to change things (only `assets/js/config.js`)
- **Prices**: every price is in **USD**. Change the `usd:` numbers. The site converts to LKR automatically.
- **Design & video prices**: the `creative` list (logo, branding kit, posts, photo editing, video editing, motion…). Each has `usd` per item, a `unit` name, and `days` / `extraDays` for the delivery time.
- **Exchange rate**: loaded live from `open.er-api.com` and saved for 12 hours. If it fails, `fallbackRate` (331) is used.
- **Rounding**: LKR prices round to the nearest `roundTo` (500).
- **Contact**: `whatsapp` (94766792617), `phoneDisplay`, `email`.
- **Facebook / YouTube**: paste your page links into `facebook` and `youtube`. Empty = hidden.
- **Terms**: `advancePercent` (50) and `freeSupportMonths` (1).
- Add a new feature: copy one line inside `features` and give it a new key.

## How to change the service pages (`assets/js/services.js`)
- Each service has a `slug` (its link: `service.html?s=<slug>`), a category `cat` (`dev` or `creative`), text (`summary`, `intro`, `includes`) and its own `faq`. `commonFaq` is added to every service.
- **Prices are not written here.** `prices` points to items in `config.js` (for example `{ type: "android" }` or `{ creative: "logo" }`), so a price changed in `config.js` changes on every page. `featured: true` highlights one card.
- In text you can write `{support}`, `{advance}`, `{urgent}` or a price like `{creative:photo}`; the page fills in the current value.
- `anim` picks the built-in animation (`phone`, `browser`, `dashboard`, `backend`, `chat`, `server`, `logo`, `social`, `photo`, `timeline`, `uiux`). To show your own video instead, set `video: "assets/video/your-file.mp4"`.
- New service: copy one block in `list`, give it a new `slug`, and add a card linking to it in the Services section of `index.html`.

## How to open it on your computer
Double-click `index.html`. For the live exchange rate to work, open it through a local server:
```
npx serve .        (or)        python -m http.server
```
then visit http://localhost:3000 (or :8000).

## How to put it online for free
**Netlify (easiest):** go to https://app.netlify.com/drop and drag the whole `hexora-website` folder in. You get a link right away. You can add your own domain later.

**GitHub Pages:** upload the folder to a GitHub repo → Settings → Pages → Deploy from branch `main`.

**Vercel:** `npx vercel` inside the folder.

## Notes
- Fonts (Michroma, Manrope, JetBrains Mono) load from Google Fonts.
- After the site is online, add a share image: put a 1200×630 image in `assets/brand/` and add
  `<meta property="og:image" content="https://YOUR-DOMAIN/assets/brand/share.jpg">` to every page.
- Animations turn off automatically for people who set "Reduce motion" on their phone.
- The form keeps an unfinished draft in the customer's own browser so nothing is lost on refresh.
- Estimates are shown as a range. Final price is given after the free call.
