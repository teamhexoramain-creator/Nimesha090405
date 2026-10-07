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
   • anim = built-in animation: phone, browser, dashboard, backend, chat,
     server, logo, social, photo, timeline, uiux.
     video = "assets/video/your-file.mp4" shows your own video instead.
   ========================================================================== */

window.HX_SERVICES = {
  categories: {
    dev: {
      label: "Development",
      note: "Apps, websites saha business systems",
      steps: [
        { t: "Idea eka kiyanna", d: "Project form eka fill karanna. Estimate price eka saha kal yana welawa ekapara pennanawa." },
        { t: "Free call & quote", d: "Details katha karala fixed quote ekak saha timeline ekak oyata ewanawa." },
        { t: "Build + test versions", d: "Kotas walata hadala test version ewanawa. Wenas karanna ona ewa ethakota kiyanna puluwan." },
        { t: "Launch & support", d: "App eka store ekata, site eka domain ekata. Ita passe {support} ekak bug fixes free." }
      ]
    },
    creative: {
      label: "Design & Video",
      note: "Logo, branding, photo editing saha video editing",
      steps: [
        { t: "Brief eka", d: "Mokada ona, colours, examples kiyanna. Photos / footage Google Drive hari WhatsApp eken ewanna." },
        { t: "Draft eka", d: "Wada patan aran mul draft eka hari concepts pennanawa." },
        { t: "Revisions", d: "Oyata ona wenas karala denawa." },
        { t: "Final files", d: "Logo, design, video files okkoma full quality walin oyata." }
      ]
    }
  },

  /* Added to the end of every service's FAQ */
  commonFaq: [
    { q: "Payment karanne kohomada?", a: "Wada patan ganna {advance} advance, ithuru tika deliver karaddi, bank transfer eken. Loku projects milestones walata kadala gewanna puluwan." },
    { q: "Ikmanatama ona nam?", a: "Project form eke Speed eka \"Urgent\" kalama price ekata +{urgent} k ekathu wenawa, wada ikmanata iwara karanawa." }
  ],

  list: [
    /* ---------------- Development ---------------- */
    {
      slug: "mobile-apps", cat: "dev", name: "Mobile Apps", anim: "phone",
      icon: '<rect x="6" y="2" width="12" height="20" rx="2.5"/><path d="M11 18h2"/>',
      summary: "Flutter walin hadana eka app ekak Android saha iPhone dekatama. Fast, smooth, Play Store saha App Store walata ready.",
      intro: "Order, booking, delivery, class wage oyage business ekata ona app eka Flutter walin hadanawa. Eka code eken Android saha iPhone dekatama app eka labenawa.",
      tags: ["Flutter", "Android", "iOS"],
      includes: [
        "Android saha iOS dekatama eka app ekak",
        "Login, OTP, payments (PayHere), push notifications wage features ona widiyata",
        "Firebase backend",
        "Kotas walata test versions, oyata use karala balanna puluwan",
        "Play Store / App Store ekata publish karala denawa",
        "Final payment eken passe full source code eka oyata"
      ],
      prices: [{ type: "android" }, { type: "cross", featured: true }, { type: "appadmin" }],
      faq: [
        { q: "App ekak hadanna kochchara kal yanawada?", a: "Podi app ekakata (screens 5 ta wenakan) sathi 4 – 6 k witara. Screens saha features wadi wenna wenna kalaya wadi wenawa. Project form eke oyage app ekata galapena time eka pennanawa." },
        { q: "Screen ekak kiyanne mokakda?", a: "App eke wena wenama page ekak (Ex: Login, Home, Cart, Profile). Small app ekaka screens 5 ta wenakan, medium 6 – 15, large 16+." },
        { q: "Play Store / App Store ekata danna puluwanda?", a: "Ow. Listing eka, screenshots, builds okkoma hadala oyage developer account eken publish karanawa. Ethakota app eka oyage namin thiyenne. Google USD 25 ekaparai, Apple USD 99 awuruddata." }
      ]
    },
    {
      slug: "websites", cat: "dev", name: "Websites", anim: "browser",
      icon: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18M7 6.5h.01M10 6.5h.01"/>',
      summary: "Business, shop, portfolio sites. Phone eke lassanata pennana, ikmanata load wena, Google eke hoyaganna puluwan sites.",
      intro: "Oyage business eka online gena yanna website ekak. Phone, tablet, computer hama ekakama lassanata penna, ikmanata load wena widiyata hadanawa.",
      tags: ["Next.js", "SEO", "Hosting"],
      includes: [
        "Small site ekaka pages 5 ta wenakan",
        "Phone walata galapena design",
        "Google ready (SEO)",
        "Domain & hosting setup ona nam",
        "Launch unata passe monthly maintenance plan ekak ganna puluwan"
      ],
      prices: [{ type: "website", featured: true }, { extra: "hosting" }, { maint: "small" }],
      faq: [
        { q: "Website ekak hadanna kochchara kal yanawada?", a: "Podi site ekakata (pages 5 ta wenakan) sathi 2 – 3 k witara. Project form eke oyage site ekata galapena time eka pennanawa." },
        { q: "Domain eka saha hosting eka ganan walata include da?", a: "Domain & hosting setup eka api karanawa ({extra:hosting}). Eth domain / hosting fees wenama gewanna ona." },
        { q: "Pages 5 kata wadi ona nam?", a: "Medium site ekak (pages 6 – 15) nam price eka ×1.6, large (16+) nam ×2.4. Project form eken hariyatama balanna puluwan." }
      ]
    },
    {
      slug: "business-systems", cat: "dev", name: "Business Systems", anim: "dashboard",
      icon: '<rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/>',
      summary: "POS, booking, stock, class saha student management systems. Reports okkoma ona thanaka idan balanna puluwan.",
      intro: "POS, booking, stock, class saha student management wage wada computer eken hari phone eken hari karanna puluwan web system ekak. Admin panel eka danatama include.",
      tags: ["Dashboards", "Reports", "User roles"],
      includes: [
        "Dashboard + Admin panel (include)",
        "Reports & user roles",
        "Ona device ekaka wada karanawa",
        "Oyage team ekata training & user guide ona nam"
      ],
      prices: [{ type: "webapp", featured: true }, { extra: "training" }, { maint: "medium" }],
      faq: [
        { q: "System ekak hadanna kochchara kal yanawada?", a: "Podi system ekakata sathi 5 – 7 k witara. Loku systems walata masa 2 – 4 k yanna puluwan." },
        { q: "Admin panel eka wenama gewanna onada?", a: "Na. Web system ekaka admin panel eka danatama include." },
        { q: "Mage staff ekata use karana widiya kiyala denawada?", a: "Ow. Training & user guide eka ona nam add karanna puluwan ({extra:training})." }
      ]
    },
    {
      slug: "backend-admin", cat: "dev", name: "Backend & Admin Panel", anim: "backend",
      icon: '<ellipse cx="12" cy="5.5" rx="8" ry="3"/><path d="M4 5.5v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6M4 11.5v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6"/>',
      summary: "Secure login, database saha admin panel ekak. Prices, content, users okkoma oyatama update karanna puluwan.",
      intro: "App ekata hari website ekata secure login ekak, database ekak saha admin panel ekak. Prices, content, users okkoma oyatama update karanna puluwan.",
      tags: ["Firebase", "Auth", "Cloud"],
      includes: [
        "Login & sign up",
        "OTP verification (SMS / Email)",
        "Admin panel eken prices, content, users manage karanna",
        "Firebase backend",
        "Photo / PDF upload"
      ],
      prices: [{ type: "appadmin", featured: true }, { feature: "admin" }, { feature: "login" }, { feature: "otp" }],
      faq: [
        { q: "App eka saha admin panel eka ekata ganna puluwanda?", a: "Ow. \"App + Admin panel\" eke app eka saha manage karanna web dashboard eka dekama thiyenawa." },
        { q: "OTP kiyanne mokakda?", a: "Login wenakota SMS ekata hari email ekata ena code ekak. Ethakota wena kenekuta oyage account ekata yanna amarui." }
      ]
    },
    {
      slug: "ai-features", cat: "dev", name: "AI Features", anim: "chat",
      icon: '<path d="M12 3l1.8 4.7 4.7 1.8-4.7 1.8L12 16l-1.8-4.7-4.7-1.8 4.7-1.8z"/><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z"/>',
      summary: "Chatbots, smart search, text-to-speech, automation. Oyage customersge saha staff ekage welawa ithuru karanawa.",
      intro: "Oyage app ekata, website ekata hari system ekata AI features. Customersla ahana prashna walata chatbot eka uththara denawa, smart search eken ona deyak ikmanata hoyaganna puluwan.",
      tags: ["Chatbots", "TTS", "Automation"],
      includes: [
        "Chatbots",
        "Smart search",
        "Text-to-speech",
        "Automation"
      ],
      prices: [{ feature: "ai", featured: true }],
      faq: [
        { q: "AI features ganna puluwan kohomada?", a: "AI features add karanne app ekakata, website ekakata hari system ekakata. Project form eke Features walin \"AI features\" tick karanna." },
        { q: "Text-to-speech kiyanne mokakda?", a: "Text eka hadin kiyawana feature eka. Notes, articles, messages kiyawanna wenuwata ahanna puluwan." }
      ]
    },
    {
      slug: "maintenance-hosting", cat: "dev", name: "Maintenance & Hosting", anim: "server",
      icon: '<path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.4-.6-.6-2.4z"/>',
      summary: "Launch unata passe updates, bug fixes, domain, hosting saha server checks okkoma balagannawa.",
      intro: "Launch karata passe oyage app eka hari site eka hariyata wada karanna balagannawa. Updates, bug fixes, domain, hosting saha server checks okkoma api karanawa.",
      tags: ["Updates", "Domain", "Support"],
      includes: [
        "Launch unata passe {support} ekak bug fixes free",
        "Updates saha bug fixes",
        "Domain & hosting setup",
        "Server checks"
      ],
      prices: [{ maint: "small" }, { maint: "medium", featured: true }, { maint: "large" }, { extra: "hosting" }],
      faq: [
        { q: "Free support kochchara kal thiyenawada?", a: "Launch karata passe {support} ekak bug fixes free. Ita passe monthly maintenance plan ekak ganna puluwan." },
        { q: "Monthly plan eke price eka kohomada thiranaya wenne?", a: "App eke hari site eke size eka anuwa: small {maint:small}, medium {maint:medium}, large {maint:large} masayata." }
      ]
    },

    /* ---------------- Design & Video ---------------- */
    {
      slug: "logo-branding", cat: "creative", name: "Logo & Branding", anim: "logo",
      icon: '<path d="M12 2l8.7 5v10L12 22l-8.7-5V7z"/><path d="M12 22V12M12 12l8.7-5M12 12L3.3 7"/>',
      summary: "Oyage business ekata thama kiyana logo ekak. Colours, fonts, business card saha social media kit ekath ekkama.",
      intro: "Oyage business ekata thama kiyana logo ekak. Branding kit eka gaththoth colours, fonts, business card saha social media kit ekath labenawa.",
      tags: ["Logo", "Brand kit", "Business card"],
      includes: [
        "Concepts 3k",
        "Revisions 3k free",
        "PNG, JPG, SVG, PDF files",
        "Branding kit: logo + colours + fonts",
        "Business card saha social media kit (branding kit eke)"
      ],
      prices: [{ creative: "logo" }, { creative: "brand", featured: true }, { creative: "motion" }],
      faq: [
        { q: "Logo ekakata kochchara kal yanawada?", a: "Logo ekakata dawas 3k witara. Branding kit ekakata tikak wadi kalayak yanawa." },
        { q: "Logo ekakata revisions kiyak denawada?", a: "Concepts 3k pennanawa. Oyata kamathi eka revisions 3k wenakan free. Final files PNG, JPG, SVG, PDF widiyata denawa, print walatai online walatai danna puluwan." },
        { q: "Branding kit eke mokada thiyenne?", a: "Logo eka, colours, fonts, business card design saha social media kit." }
      ]
    },
    {
      slug: "social-print", cat: "creative", name: "Social Media & Print", anim: "social",
      icon: '<rect x="3" y="3" width="18" height="18" rx="3"/><path d="M3 15l5-5 4 4 3-3 6 6"/><circle cx="16" cy="8" r="1.5"/>',
      summary: "Facebook / Instagram posts, posters, flyers, banners, YouTube thumbnails. Click karanna hithena designs.",
      intro: "Facebook / Instagram posts, posters, flyers, banners saha YouTube thumbnails. Oyage brand ekata galapena, click karanna hithena designs.",
      tags: ["Posts", "Posters", "Thumbnails"],
      includes: [
        "Facebook / Instagram posts",
        "Posters, flyers, banners (print walatai online walatai)",
        "YouTube thumbnails",
        "Monthly packs"
      ],
      prices: [{ creative: "social", featured: true }, { creative: "poster" }, { creative: "thumb" }],
      faq: [
        { q: "Monthly posts pack ekak ganna puluwanda?", a: "Ow. Masayata ona posts gana project form eke dala, ekata galapena price eka ekapara balanna puluwan." },
        { q: "Print karanna puluwan files da denne?", a: "Ow. Posters, flyers, banners print walatai online walatai galapena widiyata denawa." }
      ]
    },
    {
      slug: "photo-editing", cat: "creative", name: "Photo Editing", anim: "photo",
      icon: '<path d="M3 7h3l2-3h8l2 3h3v13H3z"/><circle cx="12" cy="13" r="4"/>',
      summary: "Retouch, background remove, colour correction, product photos. Online shop ekata lassana photos.",
      intro: "Retouch, background remove, colour correction saha product photos. Online shop ekata, social media walata lassana photos.",
      tags: ["Retouch", "Background", "Product"],
      includes: [
        "Retouch",
        "Background remove",
        "Colour correction",
        "Online shop walata product photos"
      ],
      prices: [{ creative: "photo", featured: true }],
      faq: [
        { q: "Photos ewanne kohomada?", a: "Google Drive link ekak hari WhatsApp eken ewanna puluwan." },
        { q: "Photos godak thiyenawa nam?", a: "Photo ekakata {creative:photo} widiyata gana wenawa. Project form eke photo gana dala total eka ekapara balanna." }
      ]
    },
    {
      slug: "video-editing", cat: "creative", name: "Video Editing", anim: "timeline",
      icon: '<rect x="2" y="5" width="15" height="14" rx="2"/><path d="M17 10l5-3v10l-5-3"/>',
      summary: "YouTube videos, Reels, TikTok, Shorts. Cuts, subtitles, music, colour grading okkoma ekka.",
      intro: "YouTube videos, Reels, TikTok saha Shorts. Cuts, subtitles, music saha colour grading okkoma ekka edit karala denawa.",
      tags: ["YouTube", "Reels", "Subtitles"],
      includes: [
        "Reels, TikTok, Shorts (second 60 wenakan)",
        "YouTube videos (minute 10 wenakan)",
        "Cuts, subtitles, music",
        "Colour grading"
      ],
      prices: [{ creative: "reel", featured: true }, { creative: "youtube" }],
      faq: [
        { q: "Video ekak edit karanna kochchara kal yanawada?", a: "Reel ekak usually dawas 1 – 2kin, YouTube video ekak dawas 2 – 4kin deliver karanawa." },
        { q: "Video editing walata footage ewanne kohomada?", a: "Google Drive link ekak hari WhatsApp eken ewanna puluwan." }
      ]
    },
    {
      slug: "motion-graphics", cat: "creative", name: "Motion Graphics", video: "assets/video/hexora-intro.mp4",
      icon: '<circle cx="12" cy="12" r="9"/><path d="M10 8.5v7l6-3.5z"/>',
      summary: "Logo animations, intros, video ads, promo videos. Me site eke video eka wage animations.",
      intro: "Logo animations, intros, video ads saha promo videos. Me page eke video eka Hexora logo eka animate karapu ekak.",
      tags: ["Logo animation", "Intros", "Ads"],
      includes: [
        "Logo animations",
        "YouTube / video intros",
        "Video ads saha promos (second 30 – 60)"
      ],
      prices: [{ creative: "motion", featured: true }, { creative: "promo" }],
      faq: [
        { q: "Me site eke video eka wage ekak hadala denawada?", a: "Ow. Me video eka Hexora logo eka animate karapu ekak. Oyage logo ekatath ehema intro ekak hadanna puluwan." },
        { q: "Logo animation ekakata kochchara kal yanawada?", a: "Logo animation ekakata dawas 2 – 3 k witara. Video ad / promo ekakata tikak wadi kalayak yanawa." }
      ]
    },
    {
      slug: "ui-ux-design", cat: "creative", name: "UI/UX Design", anim: "uiux",
      icon: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
      summary: "App saha website screens Figma eken design karala pennanawa. Code karanna kalin oyata balanna puluwan.",
      intro: "App saha website screens Figma eken design karala pennanawa. Code karanna kalin oyata balala wenas kiyanna puluwan.",
      tags: ["Figma", "Prototypes", "Wireframes"],
      includes: [
        "App saha website screens Figma eken",
        "Wireframes saha prototypes",
        "Code karanna kalin oyata balanna puluwan",
        "Screens + logo design ekata ganna puluwan"
      ],
      prices: [{ design: "ready" }, { design: "ui", featured: true }, { design: "brand" }],
      faq: [
        { q: "Design price eka kohomada gana wenne?", a: "Screens design karala denna nam app / website project price ekata 20% k ekathu wenawa. Screens + logo design nam 20% + {design:brand}." },
        { q: "Design eka mage langa thiyenawa nam?", a: "Figma / XD design ekak hari screenshots thiyenawa nam e widiyatama hadanawa. Ekata design charge ekak na." }
      ]
    }
  ]
};
