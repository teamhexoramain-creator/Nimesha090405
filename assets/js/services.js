/* ==========================================================================
   HEXORA — SERVICES  (each service gets its own page: service.html?s=<slug>)
   --------------------------------------------------------------------------
   • Prices are NOT written here. "prices" points to items in config.js, so a
     price changed there changes on every page.
       { type: "android" }     project type          (config.js → types)
       { creative: "logo" }    design / video item   (config.js → creative)
       { feature: "ai" }       add-on feature        (config.js → features)
       { extra: "hosting" }    launch extra          (config.js → extras)
       { maint: "small" }      monthly maintenance   (config.js → sizes)
       { design: "ui" }        design option         (config.js → design)
     Add  featured: true  to highlight one price card.
   • In text you can write {support}, {advance}, {urgent} or a price such as
     {feature:ai}, {creative:photo}, {maint:small}. The page fills them in.
   • short = the one-line description shown in the service lists (summary is used if it is missing).
   • anim = built-in animation: phone, browser, dashboard, backend, chat,
     server, logo, social, photo, timeline, uiux.
     video = "assets/video/your-file.mp4" shows your own video instead.
   ========================================================================== */

window.HX_SERVICES = {
  categories: {
    dev: {
      label: "Development",
      note: "Apps, websites සහ business systems",
      steps: [
        { t: "Idea එක කියන්න", d: "Project form එක fill කරන්න. Estimate price එක සහ කල් යන වෙලාව එකපාර පෙන්නනවා." },
        { t: "Free call & quote", d: "Details කතා කරලා fixed quote එකක් සහ timeline එකක් ඔයාට එවනවා." },
        { t: "Build + test versions", d: "කොටස් වලට හදලා test version එවනවා. වෙනස් කරන්න ඕන ඒවා එතකොට කියන්න පුළුවන්." },
        { t: "Launch & support", d: "App එක store එකට, site එක domain එකට. ඊට පස්සේ {support} එකක් bug fixes free." }
      ]
    },
    creative: {
      label: "Design & Video",
      note: "Logo, branding, photo editing සහ video editing",
      steps: [
        { t: "Brief එක", d: "මොකද ඕන, colours, examples කියන්න. Photos / footage Google Drive හරි WhatsApp එකෙන් එවන්න." },
        { t: "Draft එක", d: "වැඩ පටන් අරන් මුල් draft එක හරි concepts පෙන්නනවා." },
        { t: "Revisions", d: "ඔයාට ඕන වෙනස් කරලා දෙනවා." },
        { t: "Final files", d: "Logo, design, video files ඔක්කොම full quality වලින් ඔයාට." }
      ]
    }
  },

  /* Added to the end of every service's FAQ */
  commonFaq: [
    { q: "Payment කරන්නේ කොහොමද?", a: "වැඩ පටන් ගන්න {advance} advance, ඉතුරු ටික deliver කරද්දී, bank transfer එකෙන්. ලොකු projects milestones වලට කඩලා ගෙවන්න පුළුවන්." },
    { q: "ඉක්මනටම ඕන නම්?", a: "Project form එකේ Speed එක \"Urgent\" කළාම price එකට +{urgent} ක් එකතු වෙනවා, වැඩ ඉක්මනට ඉවර කරනවා." }
  ],

  list: [
    /* ---------------- Development ---------------- */
    {
      slug: "mobile-apps", cat: "dev", name: "Mobile Apps", anim: "phone",
      icon: '<rect x="6" y="2" width="12" height="20" rx="2.5"/><path d="M11 18h2"/>',
      short: "Android සහ iPhone දෙකටම එක Flutter app එකක්",
      summary: "Flutter වලින් හදන එක app එකක් Android සහ iPhone දෙකටම. Fast, smooth, Play Store සහ App Store වලට ready.",
      intro: "Order, booking, delivery, class වගේ ඔයාගේ business එකට ඕන app එක Flutter වලින් හදනවා. එක code එකෙන් Android සහ iPhone දෙකටම app එක ලැබෙනවා.",
      tags: ["Flutter", "Android", "iOS"],
      packages: true,
      includes: [
        "Android සහ iOS දෙකටම එක app එකක්",
        "Login, OTP, payments (PayHere), push notifications වගේ features ඕන විදියට",
        "Firebase backend",
        "කොටස් වලට test versions, ඔයාට use කරලා බලන්න පුළුවන්",
        "Play Store / App Store එකට publish කරලා දෙනවා",
        "Final payment එකෙන් පස්සේ full source code එක ඔයාට"
      ],
      prices: [{ type: "android" }, { type: "cross", featured: true }, { type: "appadmin" }],
      faq: [
        { q: "App එකක් හදන්න කොච්චර කල් යනවද?", a: "තෝරන package එක අනුව සති 1 ඉඳන් 8 ක් විතර. Screens සහ features වැඩි වෙන්න වෙන්න කාලය වැඩි වෙනවා. Project form එකේ package එකයි වෙනස්කම් ටිකයි තෝරද්දී ඔයාගේ app එකට ගැළපෙන time එක පෙන්නනවා." },
        { q: "Screen එකක් කියන්නේ මොකක්ද?", a: "App එකේ වෙන වෙනම page එකක් (Ex: Login, Home, Cart, Profile). හැම package එකකම screens ගණන වෙනස්. Package එකේ නැති screens ඕන නම් project form එකේ extra screens විදියට එකතු කරන්න පුළුවන්." },
        { q: "Play Store / App Store එකට දාන්න පුළුවන්ද?", a: "ඔව්. Listing එක, screenshots, builds ඔක්කොම හදලා ඔයාගේ developer account එකෙන් publish කරනවා. එතකොට app එක ඔයාගේ නමින් තියෙන්නේ. Google USD 25 එකපාරයි, Apple USD 99 අවුරුද්දට." }
      ]
    },
    {
      slug: "websites", cat: "dev", name: "Websites", anim: "browser",
      icon: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18M7 6.5h.01M10 6.5h.01"/>',
      short: "Business, shop, portfolio sites. Fast සහ SEO ready",
      summary: "Business, shop, portfolio sites. Phone එකේ ලස්සනට පෙන්නන, ඉක්මනට load වෙන, Google එකේ හොයාගන්න පුළුවන් sites.",
      intro: "ඔයාගේ business එක online ගෙනියන්න website එකක්. Phone, tablet, computer හැම එකකම ලස්සනට පේන, ඉක්මනට load වෙන විදියට හදනවා.",
      tags: ["Next.js", "SEO", "Hosting"],
      includes: [
        "Small site එකක pages 5 ට වෙනකන්",
        "Phone වලට ගැළපෙන design",
        "Google ready (SEO)",
        "Domain & hosting setup ඕන නම්",
        "Launch උනාට පස්සේ monthly maintenance plan එකක් ගන්න පුළුවන්"
      ],
      prices: [{ type: "website", featured: true }, { extra: "hosting" }, { maint: "small" }],
      faq: [
        { q: "Website එකක් හදන්න කොච්චර කල් යනවද?", a: "පොඩි site එකකට (pages 5 ට වෙනකන්) සති 2 – 3 ක් විතර. Project form එකේ ඔයාගේ site එකට ගැළපෙන time එක පෙන්නනවා." },
        { q: "Domain එක සහ hosting එක ගණන් වලට include ද?", a: "Domain & hosting setup එක අපි කරනවා ({extra:hosting}). ඒත් domain / hosting fees වෙනම ගෙවන්න ඕන." },
        { q: "Pages 5 කට වැඩි ඕන නම්?", a: "Medium site එකක් (pages 6 – 15) නම් price එක ×1.6, large (16+) නම් ×2.4. Project form එකෙන් හරියටම බලන්න පුළුවන්." }
      ]
    },
    {
      slug: "business-systems", cat: "dev", name: "Business Systems", anim: "dashboard",
      icon: '<rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/>',
      short: "POS, booking, stock සහ class management systems",
      summary: "POS, booking, stock, class සහ student management systems. Reports ඔක්කොම ඕන තැනක ඉඳන් බලන්න පුළුවන්.",
      intro: "POS, booking, stock, class සහ student management වගේ වැඩ computer එකෙන් හරි phone එකෙන් හරි කරන්න පුළුවන් web system එකක්. Admin panel එක දැනටම include.",
      tags: ["Dashboards", "Reports", "User roles"],
      includes: [
        "Dashboard + Admin panel (include)",
        "Reports & user roles",
        "ඕන device එකක වැඩ කරනවා",
        "ඔයාගේ team එකට training & user guide ඕන නම්"
      ],
      prices: [{ type: "webapp", featured: true }, { extra: "training" }, { maint: "medium" }],
      faq: [
        { q: "System එකක් හදන්න කොච්චර කල් යනවද?", a: "පොඩි system එකකට සති 5 – 7 ක් විතර. ලොකු systems වලට මාස 2 – 4 ක් යන්න පුළුවන්." },
        { q: "Admin panel එක වෙනම ගෙවන්න ඕනද?", a: "නෑ. Web system එකක admin panel එක දැනටම include." },
        { q: "මගේ staff එකට use කරන විදිය කියලා දෙනවද?", a: "ඔව්. Training & user guide එක ඕන නම් add කරන්න පුළුවන් ({extra:training})." }
      ]
    },
    {
      slug: "backend-admin", cat: "dev", name: "Backend & Admin Panel", anim: "backend",
      icon: '<ellipse cx="12" cy="5.5" rx="8" ry="3"/><path d="M4 5.5v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6M4 11.5v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6"/>',
      short: "Secure login, database සහ admin panel එකක්",
      summary: "Secure login, database සහ admin panel එකක්. Prices, content, users ඔක්කොම ඔයාටම update කරන්න පුළුවන්.",
      intro: "App එකට හරි website එකට හරි secure login එකක්, database එකක් සහ admin panel එකක්. Prices, content, users ඔක්කොම ඔයාටම update කරන්න පුළුවන්.",
      tags: ["Firebase", "Auth", "Cloud"],
      includes: [
        "Login & sign up",
        "OTP verification (SMS / Email)",
        "Admin panel එකෙන් prices, content, users manage කරන්න",
        "Firebase backend",
        "Photo / PDF upload"
      ],
      prices: [{ type: "appadmin", featured: true }, { feature: "admin" }, { feature: "login" }, { feature: "otp" }],
      faq: [
        { q: "App එක සහ admin panel එක එකට ගන්න පුළුවන්ද?", a: "ඔව්. \"App + Admin panel\" එකේ app එක සහ manage කරන්න web dashboard එක දෙකම තියෙනවා." },
        { q: "OTP කියන්නේ මොකක්ද?", a: "Login වෙනකොට SMS එකට හරි email එකට හරි එන code එකක්. එතකොට වෙන කෙනෙක්ට ඔයාගේ account එකට යන්න අමාරුයි." }
      ]
    },
    {
      slug: "ai-features", cat: "dev", name: "AI Features", anim: "chat",
      icon: '<path d="M12 3l1.8 4.7 4.7 1.8-4.7 1.8L12 16l-1.8-4.7-4.7-1.8 4.7-1.8z"/><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z"/>',
      short: "Chatbots, smart search, text-to-speech, automation",
      summary: "Chatbots, smart search, text-to-speech, automation. ඔයාගේ customersලාගේ සහ staff එකේ වෙලාව ඉතුරු කරනවා.",
      intro: "ඔයාගේ app එකට, website එකට හරි system එකට AI features. Customersලා අහන ප්‍රශ්න වලට chatbot එක උත්තර දෙනවා, smart search එකෙන් ඕන දෙයක් ඉක්මනට හොයාගන්න පුළුවන්.",
      tags: ["Chatbots", "TTS", "Automation"],
      includes: [
        "Chatbots",
        "Smart search",
        "Text-to-speech",
        "Automation"
      ],
      prices: [{ feature: "ai", featured: true }],
      faq: [
        { q: "AI features ගන්න පුළුවන් කොහොමද?", a: "AI features add කරන්නේ app එකකට, website එකකට හරි system එකකට. Project form එකේ Features වලින් \"AI features\" tick කරන්න." },
        { q: "Text-to-speech කියන්නේ මොකක්ද?", a: "Text එක හඬින් කියවන feature එක. Notes, articles, messages කියවන්න වෙනුවට අහන්න පුළුවන්." }
      ]
    },
    {
      slug: "maintenance-hosting", cat: "dev", name: "Maintenance & Hosting", anim: "server",
      icon: '<path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.4-.6-.6-2.4z"/>',
      short: "Updates, bug fixes, domain, hosting, server checks",
      summary: "Launch උනාට පස්සේ updates, bug fixes, domain, hosting සහ server checks ඔක්කොම බලාගන්නවා.",
      intro: "Launch කළාට පස්සේ ඔයාගේ app එක හරි site එක හරියට වැඩ කරන්න බලාගන්නවා. Updates, bug fixes, domain, hosting සහ server checks ඔක්කොම අපි කරනවා.",
      tags: ["Updates", "Domain", "Support"],
      includes: [
        "Launch උනාට පස්සේ {support} එකක් bug fixes free",
        "Updates සහ bug fixes",
        "Domain & hosting setup",
        "Server checks"
      ],
      prices: [{ maint: "small" }, { maint: "medium", featured: true }, { maint: "large" }, { extra: "hosting" }],
      faq: [
        { q: "Free support කොච්චර කල් තියෙනවද?", a: "Launch කළාට පස්සේ {support} එකක් bug fixes free. ඊට පස්සේ monthly maintenance plan එකක් ගන්න පුළුවන්." },
        { q: "Monthly plan එකේ price එක කොහොමද තීරණය වෙන්නේ?", a: "App එකේ හරි site එකේ size එක අනුව: small {maint:small}, medium {maint:medium}, large {maint:large} මාසයට." }
      ]
    },

    /* ---------------- Design & Video ---------------- */
    {
      slug: "logo-branding", cat: "creative", name: "Logo & Branding", anim: "logo",
      icon: '<path d="M12 2l8.7 5v10L12 22l-8.7-5V7z"/><path d="M12 22V12M12 12l8.7-5M12 12L3.3 7"/>',
      short: "Logo, colours, fonts, business card, social kit",
      summary: "ඔයාගේ business එකට තමා කියන logo එකක්. Colours, fonts, business card සහ social media kit එකත් එක්කම.",
      intro: "ඔයාගේ business එකට තමා කියන logo එකක්. Branding kit එක ගත්තොත් colours, fonts, business card සහ social media kit එකත් ලැබෙනවා.",
      tags: ["Logo", "Brand kit", "Business card"],
      includes: [
        "Concepts 3ක්",
        "Revisions 3ක් free",
        "PNG, JPG, SVG, PDF files",
        "Branding kit: logo + colours + fonts",
        "Business card සහ social media kit (branding kit එකේ)"
      ],
      prices: [{ creative: "logo" }, { creative: "brand", featured: true }, { creative: "motion" }],
      faq: [
        { q: "Logo එකකට කොච්චර කල් යනවද?", a: "Logo එකකට දවස් 3ක් විතර. Branding kit එකකට ටිකක් වැඩි කාලයක් යනවා." },
        { q: "Logo එකකට revisions කීයක් දෙනවද?", a: "Concepts 3ක් පෙන්නනවා. ඔයාට කැමති එක revisions 3ක් වෙනකන් free. Final files PNG, JPG, SVG, PDF විදියට දෙනවා, print වලටයි online වලටයි දාන්න පුළුවන්." },
        { q: "Branding kit එකේ මොකද තියෙන්නේ?", a: "Logo එක, colours, fonts, business card design සහ social media kit." }
      ]
    },
    {
      slug: "social-print", cat: "creative", name: "Social Media & Print", anim: "social",
      icon: '<rect x="3" y="3" width="18" height="18" rx="3"/><path d="M3 15l5-5 4 4 3-3 6 6"/><circle cx="16" cy="8" r="1.5"/>',
      short: "Posts, posters, flyers, YouTube thumbnails",
      summary: "Facebook / Instagram posts, posters, flyers, banners, YouTube thumbnails. Click කරන්න හිතෙන designs.",
      intro: "Facebook / Instagram posts, posters, flyers, banners සහ YouTube thumbnails. ඔයාගේ brand එකට ගැළපෙන, click කරන්න හිතෙන designs.",
      tags: ["Posts", "Posters", "Thumbnails"],
      includes: [
        "Facebook / Instagram posts",
        "Posters, flyers, banners (print වලටයි online වලටයි)",
        "YouTube thumbnails",
        "Monthly packs"
      ],
      prices: [{ creative: "social", featured: true }, { creative: "poster" }, { creative: "thumb" }],
      faq: [
        { q: "Monthly posts pack එකක් ගන්න පුළුවන්ද?", a: "ඔව්. මාසයට ඕන posts ගණන project form එකේ දාලා, ඒකට ගැළපෙන price එක එකපාර බලන්න පුළුවන්." },
        { q: "Print කරන්න පුළුවන් files ද දෙන්නේ?", a: "ඔව්. Posters, flyers, banners print වලටයි online වලටයි ගැළපෙන විදියට දෙනවා." }
      ]
    },
    {
      slug: "photo-editing", cat: "creative", name: "Photo Editing", anim: "photo",
      icon: '<path d="M3 7h3l2-3h8l2 3h3v13H3z"/><circle cx="12" cy="13" r="4"/>',
      short: "Retouch, background remove, product photos",
      summary: "Retouch, background remove, colour correction, product photos. Online shop එකට ලස්සන photos.",
      intro: "Retouch, background remove, colour correction සහ product photos. Online shop එකට, social media වලට ලස්සන photos.",
      tags: ["Retouch", "Background", "Product"],
      includes: [
        "Retouch",
        "Background remove",
        "Colour correction",
        "Online shop වලට product photos"
      ],
      prices: [{ creative: "photo", featured: true }],
      faq: [
        { q: "Photos එවන්නේ කොහොමද?", a: "Google Drive link එකක් හරි WhatsApp එකෙන් එවන්න පුළුවන්." },
        { q: "Photos ගොඩක් තියෙනවා නම්?", a: "Photo එකකට {creative:photo} විදියට ගණන් වෙනවා. Project form එකේ photo ගණන දාලා total එක එකපාර බලන්න." }
      ]
    },
    {
      slug: "video-editing", cat: "creative", name: "Video Editing", anim: "timeline",
      icon: '<rect x="2" y="5" width="15" height="14" rx="2"/><path d="M17 10l5-3v10l-5-3"/>',
      short: "YouTube, Reels, TikTok, Shorts, subtitles",
      summary: "YouTube videos, Reels, TikTok, Shorts. Cuts, subtitles, music, colour grading ඔක්කොම එක්ක.",
      intro: "YouTube videos, Reels, TikTok සහ Shorts. Cuts, subtitles, music සහ colour grading ඔක්කොම එක්ක edit කරලා දෙනවා.",
      tags: ["YouTube", "Reels", "Subtitles"],
      includes: [
        "Reels, TikTok, Shorts (තත්පර 60 වෙනකන්)",
        "YouTube videos (විනාඩි 10 වෙනකන්)",
        "Cuts, subtitles, music",
        "Colour grading"
      ],
      prices: [{ creative: "reel", featured: true }, { creative: "youtube" }],
      faq: [
        { q: "Video එකක් edit කරන්න කොච්චර කල් යනවද?", a: "Reel එකක් usually දවස් 1 – 2කින්, YouTube video එකක් දවස් 2 – 4කින් deliver කරනවා." },
        { q: "Video editing වලට footage එවන්නේ කොහොමද?", a: "Google Drive link එකක් හරි WhatsApp එකෙන් එවන්න පුළුවන්." }
      ]
    },
    {
      slug: "motion-graphics", cat: "creative", name: "Motion Graphics", video: "assets/video/hexora-intro.mp4",
      icon: '<circle cx="12" cy="12" r="9"/><path d="M10 8.5v7l6-3.5z"/>',
      short: "Logo animations, intros, video ads",
      summary: "Logo animations, intros, video ads, promo videos. මේ site එකේ video එක වගේ animations.",
      intro: "Logo animations, intros, video ads සහ promo videos. මේ page එකේ video එක Hexora logo එක animate කරපු එකක්.",
      tags: ["Logo animation", "Intros", "Ads"],
      includes: [
        "Logo animations",
        "YouTube / video intros",
        "Video ads සහ promos (තත්පර 30 – 60)"
      ],
      prices: [{ creative: "motion", featured: true }, { creative: "promo" }],
      faq: [
        { q: "මේ site එකේ video එක වගේ එකක් හදලා දෙනවද?", a: "ඔව්. මේ video එක Hexora logo එක animate කරපු එකක්. ඔයාගේ logo එකටත් එහෙම intro එකක් හදන්න පුළුවන්." },
        { q: "Logo animation එකකට කොච්චර කල් යනවද?", a: "Logo animation එකකට දවස් 2 – 3 ක් විතර. Video ad / promo එකකට ටිකක් වැඩි කාලයක් යනවා." }
      ]
    },
    {
      slug: "ui-ux-design", cat: "creative", name: "UI/UX Design", anim: "uiux",
      icon: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
      short: "Figma screens, prototypes, wireframes",
      summary: "App සහ website screens Figma එකෙන් design කරලා පෙන්නනවා. Code කරන්න කලින් ඔයාට බලන්න පුළුවන්.",
      intro: "App සහ website screens Figma එකෙන් design කරලා පෙන්නනවා. Code කරන්න කලින් ඔයාට බලලා වෙනස් කියන්න පුළුවන්.",
      tags: ["Figma", "Prototypes", "Wireframes"],
      includes: [
        "App සහ website screens Figma එකෙන්",
        "Wireframes සහ prototypes",
        "Code කරන්න කලින් ඔයාට බලන්න පුළුවන්",
        "Screens + logo design එකට ගන්න පුළුවන්"
      ],
      prices: [{ design: "ready" }, { design: "ui", featured: true }, { design: "brand" }],
      faq: [
        { q: "Design price එක කොහොමද ගණන් වෙන්නේ?", a: "Screens design කරලා දෙන්න නම් app / website project price එකට 20% ක් එකතු වෙනවා. Screens + logo design නම් 20% + {design:brand}." },
        { q: "Design එක මගේ ළඟ තියෙනවා නම්?", a: "Figma / XD design එකක් හරි screenshots තියෙනවා නම් ඒ විදියටම හදනවා. ඒකට design charge එකක් නෑ." }
      ]
    }
  ]
};
