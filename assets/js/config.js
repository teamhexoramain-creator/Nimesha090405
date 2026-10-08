/* ==========================================================================
   HEXORA — SITE SETTINGS  (edit this file only)
   --------------------------------------------------------------------------
   • All prices are in US DOLLARS (USD), except the mobile app PACKAGES below:
     those are written in LKR for 1 USD = LKR 369 ("packageBaseRate"). The site
     scales them by today's rate, so they go up and down with the dollar.
   • The site gets today's USD → LKR rate automatically and shows LKR.
   • If the live rate can't be loaded, "fallbackRate" is used.
   ========================================================================== */

window.HEXORA = {
  /* ---------- Contact ---------- */
  whatsapp: "94766792617",               // international format, digits only
  phoneDisplay: "076 679 2617",
  email: "teamhexoramain@gmail.com",
  facebook: "",                          // add your Facebook page link (https://...)
  youtube: "",                           // add your YouTube channel link (https://...)

  /* ---------- Notice bar at the top of every page (admin panel → Notice) ---------- */
  notice: { show: false, text: "", linkText: "", link: "" },

  /* ---------- Exchange rate ---------- */
  rateApi: "https://open.er-api.com/v6/latest/USD",   // free, no API key
  fallbackRate: 369,                     // LKR for 1 USD, used if the API fails
  rateCacheHours: 12,
  roundTo: 500,                          // LKR prices are rounded to this

  /* ---------- Terms ---------- */
  advancePercent: 50,
  freeSupportMonths: 1,
  rangeSpread: 1.25,                     // top of estimate range = lowest × this

  /* ---------- Mobile app packages ----------
     lkr = price in LKR when 1 USD = packageBaseRate. Shown price = lkr × (today's rate ÷ packageBaseRate).
     weeks = how long it takes (shown as an estimate range).
     badge = optional label on the card ("ගොඩක් අය තෝරන්නේ"); leave it empty for none. */
  packageBaseRate: 369,
  packages: {
    basic:       { label: "Basic App", lkr: 10000, weeks: 1, includes: ["Basic UI Design", "3–5 Screens", "Basic Navigation", "Static Content", "Simple Forms"] },
    standard:    { label: "Standard App", lkr: 15000, weeks: 1.5, includes: ["5–7 Screens", "Better UI/UX", "Navigation", "Forms & Basic Data Handling", "Local Storage"] },
    firebase:    { label: "Firebase App", badge: "ගොඩක් අය තෝරන්නේ", lkr: 20000, weeks: 2, includes: ["7–10 Screens", "Professional UI", "Login / Register", "Firebase Authentication", "Firestore Database", "User Data Management"] },
    advanced:    { label: "Advanced App", lkr: 25000, weeks: 3, includes: ["10–12 Screens", "Firebase Authentication + Database", "User Profiles", "Search / Filter", "Basic Admin Functions", "Better UI/UX"] },
    complete:    { label: "Complete App", badge: "Business වලට හොඳයි", lkr: 30000, weeks: 4, includes: ["Full App UI/UX", "Firebase Backend", "Authentication", "Database", "Admin Panel", "Push Notifications", "Search / Filter", "Basic Testing"] },
    advpro:      { label: "Advanced Professional App", lkr: 35000, weeks: 5, includes: ["Everything in 30K package", "Advanced Admin Panel", "API Integration", "Advanced Search / Filter", "Notifications", "Reports / Analytics", "More Custom Features"] },
    pro:         { label: "Professional App", lkr: 40000, weeks: 6, includes: ["Complete Professional UI/UX", "Advanced Backend", "Admin Dashboard", "Firebase / API Integration", "Authentication", "Notifications", "Analytics", "Testing & Bug Fixing"] },
    premium:     { label: "Premium App", lkr: 45000, weeks: 7, includes: ["Advanced UI/UX", "Complete Backend System", "Admin Panel", "API Integrations", "Payment/External Service Integration if required", "Notifications", "Analytics & Reports", "Testing & Optimization"] },
    premiumplus: { label: "Complete Premium App", lkr: 50000, weeks: 8, includes: ["Full Professional UI/UX", "Complete Backend", "Authentication", "Database", "Advanced Admin Panel", "API Integrations", "Notifications", "Analytics & Reports", "Testing & Bug Fixing", "Deployment Support", "Final App Optimization"] }
  },

  /* ---------- Package add-ons ("small changes" a customer can add to a package) ----------
     lkr is at packageBaseRate too. qty: true = the customer picks how many. */
  addons: {
    screens:   { label: "Extra screens", note: "Screen එකකට", lkr: 1500, weeks: 0.2, qty: true },
    login:     { label: "Login / Register (Firebase Auth)", note: "", lkr: 4000, weeks: 0.5 },
    database:  { label: "Firestore database + user data", note: "", lkr: 4000, weeks: 0.5 },
    admin:     { label: "Admin panel", note: "App එක manage කරන්න", lkr: 8000, weeks: 1 },
    notify:    { label: "Push notifications", note: "", lkr: 3000, weeks: 0.5 },
    search:    { label: "Search / Filter", note: "", lkr: 2500, weeks: 0.3 },
    payments:  { label: "Payment / external service integration", note: "", lkr: 6000, weeks: 1 },
    api:       { label: "API integration", note: "", lkr: 5000, weeks: 1 },
    analytics: { label: "Analytics & Reports", note: "", lkr: 4000, weeks: 0.7 },
    playstore: { label: "Google Play publish", note: "Google fee USD 25 වෙනම", lkr: 3000, weeks: 0.3 }
  },

  /* ---------- Project types: price for a SMALL project ---------- */
  types: {
    website:  { label: "Website",           note: "Business, shop, portfolio site",           usd: 120, weeks: 2, kind: "web" },
    webapp:   { label: "Web system",        note: "POS, booking, class / stock management",   usd: 300, weeks: 5, kind: "web",  includesAdmin: true },
    android:  { label: "Android app",       note: "Flutter app එක Android phones වලට",    usd: 250, weeks: 4, kind: "app" },
    cross:    { label: "Android + iOS app", note: "එක app එකක් stores දෙකටම",             usd: 350, weeks: 5, kind: "app" },
    appadmin: { label: "App + Admin panel", note: "App එක + manage කරන්න web dashboard",   usd: 500, weeks: 7, kind: "both", includesAdmin: true }
  },

  /* ---------- Size ---------- */
  sizes: {
    small:  { label: "Small",  note: "Screens / pages 5 ට වෙනකන්", priceX: 1.0, weeksX: 1.0, maintenanceUsd: 15 },
    medium: { label: "Medium", note: "Screens / pages 6 – 15",       priceX: 1.6, weeksX: 1.4, maintenanceUsd: 30 },
    large:  { label: "Large",  note: "Screens / pages 16+",          priceX: 2.4, weeksX: 2.0, maintenanceUsd: 45 }
  },

  /* ---------- Features (added on top) ---------- */
  features: {
    login:    { label: "Login & Sign up",              usd: 30,  weeks: 0.5 },
    otp:      { label: "OTP verification (SMS / Email)", usd: 35, weeks: 0.5 },
    admin:    { label: "Admin Panel",                  usd: 90,  weeks: 1.5 },
    payments: { label: "Online payments (Card / PayHere)", usd: 75, weeks: 1 },
    shop:     { label: "Products, Cart & Orders",      usd: 105, weeks: 1.5 },
    booking:  { label: "Bookings & Appointments",      usd: 60,  weeks: 1 },
    chat:     { label: "Chat / Messaging",             usd: 105, weeks: 1.5 },
    notify:   { label: "Push notifications",           usd: 30,  weeks: 0.5 },
    maps:     { label: "Maps & Location",              usd: 45,  weeks: 0.5 },
    uploads:  { label: "Photo / PDF upload",           usd: 30,  weeks: 0.5 },
    reports:  { label: "Reports & Charts",             usd: 45,  weeks: 1 },
    lang:     { label: "Sinhala / Tamil / English",    usd: 35,  weeks: 0.5 },
    offline:  { label: "Offline mode",                 usd: 45,  weeks: 1 },
    qr:       { label: "QR / Barcode scan",            usd: 30,  weeks: 0.5 },
    ai:       { label: "AI features (Chatbot, Smart search)", usd: 135, weeks: 1.5 }
  },

  /* ---------- Design ---------- */
  design: {
    ready: { label: "Design එක මගේ ළඟ තියෙනවා", note: "Figma / XD / screenshots", percent: 0,  usd: 0 },
    ui:    { label: "Screens design කරලා දෙන්න",     note: "Hexora UI/UX design",      percent: 20, usd: 0 },
    brand: { label: "Screens + Logo design",           note: "UI/UX + logo & colours",   percent: 20, usd: 45 }
  },

  /* ---------- Launch extras ---------- */
  extras: {
    playstore: { label: "Google Play එකේ publish කරන්න", note: "Google fee USD 25 (එක පාරයි) වෙනම", usd: 15, for: ["app", "both"] },
    appstore:  { label: "App Store එකේ publish කරන්න",   note: "Apple fee USD 99 / අවුරුද්දට වෙනම", usd: 30, for: ["app", "both"] },
    hosting:   { label: "Domain & Hosting setup",          note: "Domain / hosting fees වෙනම",         usd: 25, for: ["web", "both"] },
    training:  { label: "Training & User guide",           note: "ඔයාගේ team එකට use කරන විදිය",   usd: 15, for: ["app", "web", "both"] }
  },

  /* ---------- Design & Video services (price per item, USD) ----------
     days = working days for the first item, extraDays = for each extra one */
  creative: {
    logo:    { label: "Logo design",              note: "Concepts 3 + revisions 3, ඔක්කොම file formats", usd: 25, unit: "logo",      days: 3, extraDays: 2 },
    brand:   { label: "Branding kit",             note: "Logo, colours, business card, social media kit", usd: 60, unit: "kit",      days: 6, extraDays: 4 },
    social:  { label: "Social media post",        note: "Facebook / Instagram post design",               usd: 4,  unit: "post",     days: 1, extraDays: 0.25 },
    poster:  { label: "Poster / Flyer / Banner",  note: "Print වලටයි online වලටයි",                    usd: 10, unit: "design",   days: 1, extraDays: 0.5 },
    thumb:   { label: "YouTube thumbnail",        note: "Click කරන්න හිතෙන design",                    usd: 4,  unit: "thumbnail", days: 1, extraDays: 0.25 },
    photo:   { label: "Photo editing",            note: "Retouch, background remove, colour fix",          usd: 2,  unit: "photo",    days: 1, extraDays: 0.1 },
    reel:    { label: "Reel / Short video edit",  note: "තත්පර 60 වෙනකන් (TikTok, Reels, Shorts)",       usd: 10, unit: "video",    days: 1, extraDays: 0.5 },
    youtube: { label: "YouTube video edit",       note: "විනාඩි 10 වෙනකන්",                               usd: 25, unit: "video",    days: 2, extraDays: 1 },
    motion:  { label: "Logo animation / Intro",   note: "ඔයාගේ logo එක animate කරලා",                   usd: 20, unit: "animation", days: 2, extraDays: 1 },
    promo:   { label: "Video ad / Promo",         note: "තත්පර 30 – 60 product / business promo",         usd: 35, unit: "video",    days: 3, extraDays: 2 }
  },

  /* ---------- Speed ---------- */
  urgency: {
    normal: { label: "Normal", note: "Standard timeline එක", percent: 0,  weeksX: 1 },
    fast:   { label: "Urgent", note: "ඉක්මනට — +25%",       percent: 25, weeksX: 0.7 }
  }
};
