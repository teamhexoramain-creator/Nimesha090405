# Hexora Website

Official website for **Hexora** — apps, websites, logo design, photo & video editing, Sri Lanka.
Built with plain **HTML + CSS + JavaScript**. No installs, no build step, no server needed.

## Pages
| File | What it is |
|---|---|
| `index.html` | Home page: video hero, services, process, pricing, FAQ, contact |
| `service.html` | One page per service (`service.html?s=mobile-apps`): animation, what's included, how we work, pricing, FAQ and the other services in the same category. With no `?s=` it lists every service by category. |
| `start-project.html` | Project request form with a live LKR price estimate for apps/websites and for logo, design & video work. Customers send the request to WhatsApp or Email; it is also saved for the admin panel. |
| `admin.html` | PIN-locked admin panel (see below). |

## Folder structure
```
hexora-website/
├─ index.html
├─ service.html
├─ start-project.html
├─ admin.html
├─ firestore.rules       Firebase security rules (paste into the Firebase console)
├─ README.md
└─ assets/
   ├─ css/style.css        all design + animations
   ├─ css/admin.css        admin panel design
   ├─ js/config.js         prices, WhatsApp, email, links (starting data; the admin panel edits the live copy)
   ├─ js/pricing.js        USD → LKR rate + price maths
   ├─ js/main.js           menu, animations, video, live prices
   ├─ js/services.js       service pages text, categories, FAQ (starting data)
   ├─ js/service.js        builds service.html from services.js
   ├─ js/planner.js        project form + estimate + WhatsApp/Email message (+ saves the request to Firebase)
   ├─ js/firebase-config.js  ← Firebase apiKey, projectId, admin email
   ├─ js/boot.js           loads the admin panel's saved data, then the page scripts
   ├─ js/admin.js          admin panel (admin.html)
   ├─ brand/hexora-logo.png  your original logo (the site cuts the mark, name and tagline from it)
   └─ video/               hexora-intro.mp4 (logo animation)
```

## How to change things (`assets/js/config.js`, or the admin panel once Firebase is set up)
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

## Admin panel (`admin.html`) — Firebase
Open it from the small lock icon in the bottom-right corner of any page's footer (or go to `/admin.html`).
The panel saves to **Firebase** (free Spark plan is enough). No GitHub token is needed.

- **Log in** with the 6-digit **PIN**. The PIN is the password of one Firebase user, so Firebase checks it; it is not written in the site code. 5 wrong tries lock the screen for 60 seconds, and Firebase also blocks repeated wrong tries.
- **Save** writes prices, contact, services and the notice bar to Firestore (`site/content`). Every page loads them through `assets/js/boot.js`. New visitors see a change at once; people already on the site see it from their next page.
- **Requests**: every project form sent from `start-project.html` is saved to Firestore (`requests`), even if the customer never taps WhatsApp / Email. Mark them New / Contacted / Done, or delete them.
- Tabs: Dashboard, Requests, Notice (a bar at the top of every page), Contact, Prices, Services (text, FAQ, prices, animation, new services), History (go back to an earlier version), Security (change the PIN).
- Until Firebase is set up, the site uses `assets/js/config.js` and `services.js` as before.

### One-time Firebase setup
1. https://console.firebase.google.com → **Create a project** (Google Analytics not needed).
2. **Build → Authentication → Get started → Sign-in method → Email/Password → Enable.**
   Then **Users → Add user**: your admin email, and the PIN (`090405`) as the password.
   Optional but good: **Settings → User actions →** turn off **Enable create (sign-up)**.
3. **Build → Firestore Database → Create database** → location `asia-south1` (Mumbai) → **production mode**.
   Open the **Rules** tab, paste everything from `firestore.rules`, change `ADMIN_EMAIL` to your admin email, **Publish**.
4. **Project settings (gear) → General → Your apps → Web (`</>`)** → register an app (no hosting needed).
   Copy `apiKey` and `projectId` into `assets/js/firebase-config.js`, and put the admin email in `adminEmail`.
5. Push to GitHub. Open `/admin.html`, type the PIN, and press **Save කරන්න** once: this copies the site's current data into Firebase.

Good to know:
- `apiKey` and `projectId` are not secrets; Firebase web apps always show them. The rules decide who can change data. Never put the PIN in any file.
- Change the PIN from the **Security** tab (or in Firebase → Authentication → Users → Reset password). If you forget it, set a new password there.
- `config.js` / `services.js` are only the starting data and the backup. After the first Save, edit from the admin panel; editing those files will not change the live site.
- A new service appears on the service pages; add a card for it in the Services section of `index.html` if you want it on the home page too.

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
- Fonts (Michroma, Manrope, JetBrains Mono, and Noto Sans Sinhala for Sinhala text) load from Google Fonts.
- Customer-facing text is Sinhala in Sinhala script, with English words (app, logo, Flutter…) left in English.
- After the site is online, add a share image: put a 1200×630 image in `assets/brand/` and add
  `<meta property="og:image" content="https://YOUR-DOMAIN/assets/brand/share.jpg">` to every page.
- Animations turn off automatically for people who set "Reduce motion" on their phone.
- The form keeps an unfinished draft in the customer's own browser so nothing is lost on refresh.
- Estimates are shown as a range. Final price is given after the free call.
