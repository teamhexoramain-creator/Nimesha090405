# Installed skills — how to use them

Claude Code skills for this project. They live in `.claude/skills/` (project scope), so every Claude Code session opened on this repo can use them. Plugin settings are in `.claude/settings.json`.

## How to call a skill

* **By name:** type `/skill-name` in Claude Code, then say what you want. Example: `/impeccable audit the home page`.
* **Automatically:** just describe the job ("make the pricing section feel more premium"). Claude picks a skill whose description fits.
* **More skills:** ask Claude to run `find-skills` ("find a skill for Sinhala typography"), or run `npx skills find <topic>`.

> Skills run with full agent permissions. They were scanned for obvious problems (remote-script piping, key theft); read a skill before trusting a new one.

## What to use for what (Hexora site)

| Goal | Skill(s) |
|---|---|
| Make a page look premium / not templated | `impeccable`, `high-end-visual-design`, `design-taste-frontend`, `frontend-design`, `ui-ux-pro-max`, `redesign-existing-projects` |
| Small polish details (spacing, shadows, hit areas, text wrap) | `make-interfaces-feel-better`, `emil-design-eng` |
| Animation and motion | `animate`, `review-animations`, `improve-animations`, `find-animation-opportunities`, `apple-design` |
| Phone feel (100vh bug, tap flashes, notch) | `mobile-native` |
| Find what breaks (long names, empty data) | `break-ui`, `click-path-audit` |
| Colours, fonts, design tokens | `design-system`, `ui-ux-pro-max`, `brand`, `pick-ui-library` |
| Accessibility | `accessibility`, `frontend-ui-engineering` |
| Speed (LCP, CLS, TBT) | `performance-optimization`, `browser-qa`, `playwright-cli` |
| SEO | `seo` |
| Security | `vibesec-skill`, `security-and-hardening`, `security-review`, `claude-security`, plus the **security-guidance** plugin (warns while code is written) |
| Plan before building | `brainstorming`, `spec-driven-development`, `planning-and-task-breakdown`, `writing-plans` |
| Bugs and "is it really fixed?" | `systematic-debugging`, `debugging-and-error-recovery`, `verification-before-completion`, `verification-loop`, `test-driven-development` |
| Review, ship | `code-review-and-quality`, `requesting-code-review`, `shipping-and-launch`, `git-workflow-and-versioning` |
| Flutter (A/L Tech Notes app) | `dart-flutter-patterns`, `flutter-dart-code-review`, `mobile-native` |
| Next.js | `nextjs-turbopack`, `frontend-patterns` |
| Banners, social images, logos, slides | `banner-design`, `brand`, `design`, `slides`, `brandkit`, `img2threejs` |
| Map a big codebase | `graphify` — run `/graphify .` (CLI installed with `uv tool install graphifyy`) |

## What was installed from your 13 links

| # | Source | Result |
|---|---|---|
| 1 | ui-ux-pro-max-skill | all 7 skills |
| 2 | superpowers | all 15 skills |
| 3 | Ilm-Alan/frontend-design | installed |
| 4 | ECC | **28 of 303** (frontend, a11y, SEO, security, e2e, motion, Flutter, deploy). The rest are Java/Swift/healthcare/logistics etc. and would only add noise to every session. Ask for any extra one by name. |
| 5 | claude-plugins-official | 5 useful skills: `claude-md-improver`, `claude-automation-recommender`, `claude-security`, `playground`, `session-report` |
| 6 | agent-skills (addyosmani) | all 25 skills |
| 7 | security-guidance | installed as a project plugin (hook that flags insecure code patterns) |
| 8 | graphify | installed (CLI + `/graphify` skill) |
| 9 | emilkowalski/skills | all 14 skills |
| 10 | impeccable | installed |
| 11 | claude-mem | marketplace registered, plugin **not enabled** (see below) |
| 12 | VibeSec-Skill | installed |
| 13 | find-skills | installed |

### claude-mem

It runs a background worker and a hook on every tool call, and keeps its memory database on the machine it runs on. Cloud sessions are wiped when they end, so there it would only add start-up time and keep nothing. Turn it on from your own computer instead:

```
/plugin marketplace add thedotmack/claude-mem
/plugin install claude-mem
```

### Superpowers note

`using-superpowers` tells Claude to look for a matching skill before every reply. That is the intended design (more careful, slower). Remove `.claude/skills/using-superpowers` if you want a lighter workflow.

## Keeping the repo clean

`.claude/` and `.agents/` are tooling, not part of the website. They are on the working branch only. Before the site goes to `Main`, decide whether to keep them there or leave them out (the site works either way).
