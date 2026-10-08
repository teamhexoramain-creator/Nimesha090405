# Hexora Website

Official website for **Hexora** — apps, websites, logo design, photo & video editing, Sri Lanka.
Built with plain **HTML + CSS + JavaScript**. No installs, no build step, no server needed.

## Pages
| File | What it is |
|---|---|
| `index.html` | Home page: video hero, services, process, pricing, FAQ, contact |
| `service.html` | One page per service (`service.html?s=mobile-apps`): animation, what's included, how we work, pricing, FAQ and the other services in the same category. With no `?s=` it lists every service by category. |
| `start-project.html` | Project request form with a live LKR price estimate for apps/websites and for logo, design & video work. Customers send the request to WhatsApp or Email; it is also saved for the admin panel. |
| `account.html` | **මගේ projects**: customers log in with their phone number and a 6-digit PIN and see each project's stage, % done, latest update and finish date. |
| `admin.html` | PIN-locked admin panel (see below). |
| `404.html` | "Page එක හම්බුනේ නෑ" page (GitHub Pages shows it for a wrong link). |

## Folder structure
```
hexora-website/
├─ index.html
├─ service.html
├─ start-project.html
├─ account.html
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
   ├─ js/fb.js             Firebase login + database helper for the customer pages
   ├─ js/account.js        customer page (account.html)
   ├─ js/chat.js           chat box: text, photos, voice, Seen, Online (customer page, admin panel, live chat)
   ├─ js/livechat.js       the green chat button: live chat for visitors
   ├─ js/packages.js       mobile app package cards (home page, Mobile Apps page)
   ├─ js/boot.js           loads the admin panel's saved data, then the page scripts
   ├─ js/admin.js          admin panel (admin.html)
   ├─ brand/hexora-logo.png  your original logo (the site cuts the mark, name and tagline from it)
   └─ video/               hexora-intro.mp4 (logo animation)
```

## How to change things (`assets/js/config.js`, or the admin panel once Firebase is set up)
- **Mobile app packages** (`packages`, 9 of them) and **add-ons** (`addons`) are written in **LKR for 1 USD = 369** (`packageBaseRate`). The site multiplies by (today's rate ÷ 369), so when the dollar goes up the price goes up and when it goes down the price goes down. At exactly 369 a package shows its own price (Basic App = LKR 10,000). `weeks` and the add-on prices are starting values: check them in the admin panel → Prices.
- **Badges on packages**: each package has an optional `badge` (Firebase App: "ගොඩක් අය තෝරන්නේ", Complete App: "Business වලට හොඳයි"). Change or clear them in the admin panel → Prices → Mobile app packages. A package with a badge is shown as a highlighted card.
- **Other prices** (websites, web systems, design & video): every price is in **USD**. Change the `usd:` numbers. The site converts to LKR automatically.
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
- **Projects & requests**: every project form sent from `start-project.html` is saved to Firestore (`requests`), even if the customer never taps WhatsApp / Email. For each one set the **stage** (New → Contacted → Design → Building → Testing → Done), **% done**, **finish date**, the **project name** and an **update for the customer**, then press **Update**. **New project** adds one that came by WhatsApp or phone.
- **Customer accounts**: link a project to a customer's account (an account with the same phone is picked for you). Linked projects show on that customer's **මගේ projects** page.
- **Mobile app packages / add-ons** are edited in **Prices** (Mobile app packages, Package add-ons). On a service, the **Mobile app packages පෙන්නන්න** tick shows the 9 packages on that service's page (on for Mobile Apps).
- Tabs: Dashboard, Projects & requests, Notice (a bar at the top of every page), Contact, Prices, Services (text, FAQ, prices, animation, new services), History (go back to an earlier version), Security (change the PIN).
- Until Firebase is set up, the site uses `assets/js/config.js` and `services.js` as before.

### One-time Firebase setup
1. https://console.firebase.google.com → **Create a project** (Google Analytics not needed).
2. **Build → Authentication → Get started → Sign-in method → Email/Password → Enable.**
   Then **Users → Add user**: your admin email, and the PIN (`090405`) as the password.
   Keep **Settings → User actions → Enable create (sign-up)** turned **on**: customers make their accounts with it.
3. **Build → Firestore Database → Create database** → location `asia-south1` (Mumbai) → **production mode**.
   Open the **Rules** tab, paste everything from `firestore.rules` (the admin email is in `isAdmin()`; change it there if you use another one), **Publish**.
4. **Project settings (gear) → General → Your apps → Web (`</>`)** → register an app (no hosting needed).
   Copy `apiKey` and `projectId` into `assets/js/firebase-config.js`, and put the admin email in `adminEmail`.
5. Push to GitHub. Open `/admin.html`, type the PIN, and press **Save කරන්න** once: this copies the site's current data into Firebase.

Good to know:
- `apiKey` and `projectId` are not secrets; Firebase web apps always show them. The rules decide who can change data. Never put the PIN in any file.
- Change the PIN from the **Security** tab (or in Firebase → Authentication → Users → Reset password). If you forget it, set a new password there.
- `config.js` / `services.js` are only the starting data and the backup. After the first Save, edit from the admin panel; editing those files will not change the live site.
- A new service appears on the service pages; add a card for it in the Services section of `index.html` if you want it on the home page too.

## Customer accounts (`account.html`, "මගේ projects")
- A customer makes an account with their **name, phone number and a 6-digit PIN** they choose, then logs in with the phone number and PIN. Firebase keeps it as a login `c<phone>@hexora-admin-panel.firebaseapp.com` (for example `c94771234567@…`); no email is sent to it.
- A request sent from the same phone/browser before making the account is added to the account automatically. Anything else (another phone, a WhatsApp customer, a project you made with **New project**) you link from the admin panel.
- A customer sees only the projects linked to their own account, and cannot change anything on them. `firestore.rules` enforces this.
- **Forgot PIN**: on the login box the customer taps **PIN එක අමතක උනාද?**, types their name and phone number and sends it. The page then waits. In the admin panel the request appears under **Customers** (red number on the tab) with the name typed, the phone, whether the name matches the account, and the account's PIN. Two ways to answer:
  - **App එකට PIN එක යවන්න** (press twice): the PIN shows on the customer's waiting page, on the phone/browser that sent the request, for one hour. Use it when the name matches.
  - **PIN එක WhatsApp කරන්න**: opens WhatsApp to the phone number *of the account* (not the one typed), so only the owner of that phone gets it. Use it when the request looks suspicious.
  Then press **එව්වා ✓** to clear it. Nothing is sent automatically: a PIN is never shown without you approving it, otherwise anyone who types someone's phone number would get that person's PIN. (Sending WhatsApp messages by itself needs the paid WhatsApp Business API and a server.)
- Why the PIN is stored: Firebase cannot show a password again, so a copy of the PIN is kept in the customer's profile (`customers/<id>.pin`). Only you (the admin) and that customer can read it, and it is updated when they change their PIN. The sign-up box tells customers to use a PIN that is not a bank/phone PIN. Do not share these PINs with anyone but the customer.
- An old account without a saved PIN: Firebase console → Authentication → Users → delete `c94…@hexora-admin-panel.firebaseapp.com`; the customer makes a new account with the same phone and you link their projects again.
- **Chat on a project** (customer page and admin panel): text, photos and voice messages, per project. A project must be linked to a customer account to have a chat. A **අලුත්** badge shows on the project (customer side), on the tab, and in the admin panel's Requests tab. Photos are shrunk in the browser (about 1100 px, under 350 KB) and voice messages are limited to 90 seconds; both are stored inside the message in Firestore because Firebase Storage now needs a paid plan. There is no push notification: new messages show while the page is open (it checks every few seconds inside an open chat, every 45 seconds for the badges). If chats grow large, switch to Firebase Storage (Blaze plan) later.
- **Voice messages** look like WhatsApp: a play button, a waveform of how loud the speaker was, the time, and a 1× / 1.5× / 2× speed button. The waveform is saved with the message (`wave`, 40 digits).
- **Seen and Online**: a sent message shows ✓; when the other side has the chat open and has read it, it turns to a blue ✓✓ and the newest one says "Seen". The chat header shows **Hexora Developer · Online** while the admin panel is open and in use (the panel writes the server time to `site/presence` every 25 seconds), otherwise "Last seen 10 min ago". The admin sees the same for the customer. Times are compared with the server's clock (`readTime`), not the phone's, so a wrong phone clock cannot fake it.
- **New request notice**: after sending a request the customer sees "⏳ Pending · Under review. A Hexora Developer will contact you shortly, please wait." The same notice stays on the project in **මගේ projects** until you move it past **New** in the admin panel.
- **Live chat for visitors (no login)**: the green chat button on the home page and service pages (and any "Chat කරන්න" button) opens a chat. A visitor first gives a **name and a phone number**, so you can tell who is writing; a logged-in customer skips the form and their account name and phone are used. It is the same chat box (text, photos, voice, Seen ticks, Online). The admin panel has a **Live chats** tab: every visitor with name, phone (with a WhatsApp / Call button), the page they were on, their device, an "Account: …" mark when the phone matches a customer account, and a red number for new messages. The phone number is typed by the visitor and is **not verified**; if in doubt, confirm with a WhatsApp message. The visitor's browser keeps a long random id, so closing the page and coming back continues the same chat, and a red 1 shows on the green button when the developer has replied. Delete a chat (and its messages) with the bin button. Anyone can start a chat, so an unwanted one can be deleted there.
- **Account page tabs**: **මගේ projects** and **Settings** (name, PIN, logout).
- After changing `firestore.rules`, paste it again in Firebase → Firestore Database → Rules → **Publish**.

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
