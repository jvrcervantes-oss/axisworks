# AxisWorks: design guide for LLMs

This file is for an AI model (Claude Code or similar) that is asked to design or build anything for AxisWorks: a web page, a section, a component, an email, a slide. Read all of it before writing code or copy. When this file and a request disagree, follow the request and say which rule you broke.

- Visual reference: the **Brand kit** artifact (pages "Brand kit" and "Website"): https://claude.ai/artifact/HqaZmhgru6Zo5LPtwD32d5. It is private: you may not be able to open it, so this file is written to be enough on its own.
- Tokens, components and motion in CSS: [`tokens.css`](tokens.css). Use it instead of inventing values.
- Logo files: [`logo/`](logo/).
- These files live in `private/brand/`, which `.htaccess` blocks from the web. To use the tokens on the site, copy what you need into `/assets` (for example `assets/brand.css`) and self-host the fonts in `/assets/fonts`.

---

## 1. What AxisWorks sells, and the one message

AxisWorks is a two-person software studio (Javier: engineering; Andrea: design and content) with seventeen AI departments behind it, run by an **AI CEO**. It sells:

1. **AxisWorks ERP**: a modular ERP (30 modules, one private database per company) for three kinds of business: properties, bookings, services. Demo available.
2. **Agents as a Service (AaaS)**: nine AI agents per business (Captain, Reception, Radar, Figures, Hook, Quill, Listener, Route, Treasurer) that work on the ERP data inside five hard stops a person keeps: price, publishing, deleting, spending, sending to a third party.
3. **Websites and landing pages**, built to order.

**The message, in this order, on every page:**

1. **What:** custom software and AI assistants, built by AI departments and signed off by people.
2. **For whom:** businesses whose team spends the day on leads, contracts, invoices, bookings and WhatsApp by hand.
3. **What it changes:** the business runs with fewer people (lower operating costs). Say it as the goal. **Never promise a figure**: savings only appear as the visitor's own estimate in a calculator, next to "Not an offer or a promise of savings" (Spanish law on misleading advertising, LCD art. 5).
4. **Proof:** the ERP demo, the hours calculator, the studio's activity log (published with a delay), membership of Anthropic's Claude for Startups program.

The current Home hero is the reference: eyebrow `SOFTWARE STUDIO × AI TEAM`, headline **"Custom software / to run your business / with fewer people."**

### Hard content rules

- **No clients.** No client names, logos, case studies, testimonials or screenshots of a client's product. Use business types as examples.
- **No status labels on public pages:** never "in testing", "planned", "beta", "pilot", "shadow mode", "coming soon", "in production". If something can't be offered, leave it out. If availability depends, say "Tell us about your business and we will tell you whether it could work for you, and when."
- **Simulated activity is always labelled** `ILLUSTRATION · SAMPLE DATA, NOT LIVE ACTIVITY` (or `SAMPLE`). Never present animated numbers as live.
- **Names are roles:** "the AI CEO" (never a nickname), departments by job (Backend, Quality, Legal), agents by function. People by first name.
- **Claude for Startups:** text only (`CLAUDE FOR STARTUPS | PROGRAM MEMBER`), linking to https://claude.com/programs/startups. No Anthropic or Claude logo. Don't claim credits, support, partnership or endorsement.
- **Bot and robot pictures** are only for the studio org chart (the 17 department avatars). Everywhere else use line icons.

---

## 2. The brand idea: the X

The x in "axisworks" is the logo. Two bars cross at one point:

- **Ultramarine bar** (top-left to bottom-right): build. Javier's side.
- **Volt bar** (top-right to bottom-left): brand and design. Andrea's side.
- **The point** where they cross: where every request passes. On the website the AI CEO sits at the point; a person signs off what leaves it.

Signature lines: "Two halves, one axis." / "Dos mitades, un eje." / "X marks the work."

### Construction (80 × 80 grid, use these exact polygons)

```html
<svg viewBox="10 10 80 80" aria-hidden="true">
  <polygon points="10,10 41,10 90,90 59,90" fill="#2E3BEB"/>        <!-- build bar -->
  <polygon points="59,10 90,10 41,90 10,90" fill="#C8F04A"/>        <!-- brand bar -->
  <polygon points="50,24.7 65.5,50 50,75.3 34.5,50" fill="#F2F3F7"/><!-- the point: Chalk on dark, Night on light -->
</svg>
```

Wordmark: Unbounded, `a` + the X at 0.57em + `is` in 600, `works` in 300, letter-spacing −.03em, all lowercase:

```html
<a class="aw-menu__logo" href="/" aria-label="axisworks home" style="font-family:Unbounded;font-size:20px;letter-spacing:-.03em;display:inline-flex;align-items:baseline">
  <span style="font-weight:600">a</span><svg viewBox="10 10 80 80" style="width:.57em;height:.57em;margin:0 .05em" aria-hidden="true">…the X…</svg><span style="font-weight:600">is</span><span style="font-weight:300">works</span>
</a>
```

Rules: the build bar always runs top-left to bottom-right. The point is always the strongest contrast. Minimum 16 px; under 32 px drop the point (`logo/x-mark-small.svg`). Clear space = one bar width. Never a plain ×, never rotated, never outlined; it only moves in its intro and in the X→+ button. One color: `logo/x-mark-one-color.svg` (point cut out).

---

## 3. Color

| Token | Hex | Job |
|---|---|---|
| Ultramarine | `#2E3BEB` | build bar, trust bands, links and current items on light |
| Volt | `#C8F04A` | brand bar, primary button, **the live signal** |
| Night | `#0B0C1E` | default page background |
| Chalk | `#F2F3F7` | menu, light sections, "a person decides" |
| Panel / Raised / Lifted | `#10112A` / `#14152A` / `#1A1C33` | panels, tiles, active card on Night |
| Line / Edge | `#23253D` / `#2A2D47` | borders on Night / control borders |
| Periwinkle | `#8C95FF` | Ultramarine as text or second signal on Night |
| Haze / Fog / Dusk | `#C9CCDB` / `#A9ADC2` / `#7D82A3` | body / secondary / dimmest text on Night |
| Ice | `#E3E6FD` | current nav item, hover, chips on Chalk |
| Slate / Ink | `#4A4E66` / `#2B2E45` | body text on Chalk / long text on white |
| Mist / White | `#DADCE6` / `#FFFFFF` | borders on Chalk / cards on Chalk |

Rules:

- **One static Volt moment per screen** (usually the primary button). Animated signals may also be Volt, because Volt means "something is working now". If two static things are Volt, neither is.
- **Volt never sits on Chalk or white.** On light surfaces the action is a Night button with Volt text.
- Color roles in motion: Volt = working now; Periwinkle = a second signal; Chalk = a person decides; Edge on Raised = idle.
- **Section rhythm:** pages run dark. Menu is Chalk on every page. Never stack two Chalk or two Ultramarine sections; a Night band follows every Ultramarine one. The Home: menu (Chalk) → hero (Night) → Claude for Startups (Ultramarine) → studio activity (Night) → tools carousel (Night) → what we sell (Chalk) → studio (Night) → contact (Ultramarine) → footer (Night).
- Contrast (WCAG 2.2): Night/Chalk 17.4, Volt/Night 14.8, Haze/Night 12.1, Fog/Night 8.7, Dusk/Night 5.2, Chalk/Ultramarine 6.4, Ultramarine/Chalk 6.4, Slate/Chalk 7.4. Don't use any text color dimmer than Dusk on Night.

---

## 4. Typography

Three families, self-hosted as woff2 (no Google Fonts requests in production):

- **Unbounded** 600 + 300 (500 for small heads): display, headlines, stats, the wordmark.
- **Manrope** 400 / 500 / 600 / 700: body, UI, buttons, navigation.
- **IBM Plex Mono** 400 / 500: labels, data, times, eyebrows. Uppercase, tracking .08–.14em.

| Role | Spec |
|---|---|
| H1 (hero) | Unbounded 600 + 300, `clamp(34px, 3.6vw, 52px)`, line 1.04, tracking −.05em, max 3 lines |
| H2 (section) | Unbounded 600 + 300, `clamp(30px, 4vw, 54px)`, line 1.04, −.045em, max 2 lines |
| H3 (card) | Unbounded 600, 24–26px, −.04em; small heads 500, 17–19px |
| Lead | Manrope 400, `clamp(17px, 1.4vw, 19px)`, line 1.6, 46–50ch |
| Body | Manrope 400, 15–17px, line 1.6, 46–56ch |
| UI | Manrope 600–700, 15–16px |
| Label | Plex Mono 400/500, 10–13px, uppercase |
| Stat | Unbounded 600, 28–36px, with a mono label above |

**The split headline:** the first half in 600 says what it is, the second half in 300 says what it means for the reader. Put each line in its own block span so you control the breaks and never leave an orphan word:

```html
<h1 class="aw-h1"><span>Custom software</span><span>to run your business</span><span class="l">with fewer people.</span></h1>
```

Never: Unbounded for body or buttons, italics, all caps in Unbounded or Manrope, colored words in headlines, more than two weights in a headline.

---

## 5. Layout and components

- Content max 1280px, side padding `clamp(20px, 5vw, 80px)`, section padding `clamp(64px, 9vw, 120px)`.
- Spacing on an 8px base: 8 · 16 · 24 · 40 · 64 · 104.
- Corners: 8 chips · 12 fields · 16 tiles · 20–24 cards · 28 panels · pill (999px) for every action and the nav.
- Two-column heroes: text column `flex: 1 1 520px`, illustration `flex: 1 1 520px`, both `min-width: 0`, wrapping on phones.
- Card grids: `repeat(auto-fit, minmax(280–340px, 1fr))`, chosen so no row ends with a lonely card at 1440px (9 cards → 3 × 3, 6 → 3 × 2).
- Icons: outline, 24px grid, stroke 1.75, round caps and joins, inside a 44px circle (Ice on light, Raised on Night). Volt marks the one active icon.

Components (classes in `tokens.css`):

- **Menu** `.aw-menu`: Chalk bar; grid `1fr auto 1fr`; logo left; centred white pill holding the links (current item in Ice with Ultramarine text); right side: EN/ES segmented toggle + one Night CTA with Volt text ("Talk to the studio"). Under 1100px the pill becomes a "Menu" button with a dropdown. Pin each part to its grid column (`grid-column: 1/2/3`) so hiding the pill doesn't shift the right side.
- **Primary button** `.aw-btn--primary.aw-xbtn`: Volt, Night text, 52px, pill, a small X at the end that turns into a + on hover and focus (bars rotate −31.5° and +58.5°, 450ms). Only on Night or Ultramarine, one per screen.
- **Secondary** `.aw-btn--ghost` (1.5px Slate outline). **On light**: `.aw-btn--dark` (Night, Volt text) + outline Night. Text links: Ultramarine with →.
- **Badges** describe the product, never its status: `DEMO AVAILABLE` (Volt), `9 AGENTS PER BUSINESS` (Ice), `BUILT TO ORDER` (Night). The program badge `.aw-program` is a split pill.
- **Cards** `.aw-card`: radius 24, padding 28, lift 4px with an Ultramarine border on hover. Nothing scales on hover.
- **Fields** `.aw-field`: 48px, radius 12, Fog border, Ultramarine border + Ice ring on focus. Labels above, never placeholder-only. Placeholders give a real example ("For example: two people answer WhatsApp all day and copy every booking into a spreadsheet.").
- **Segmented control** (e.g. "What do you sell? Properties | Bookings | Services"): pills inside a Raised capsule; selected in Ultramarine (300ms); content that depends on it re-enters with a stagger.
- **Activity log**: mono time, bold actor, Fog action, newest on top, older rows fade 20% each, labelled `SAMPLE`.
- **Logo carousel**: two rows in opposite directions, tiles of one-color logos (Haze) + name, from Simple Icons. If a brand asked Simple Icons to remove its logo (e.g. OpenAI, Canva), show the name only.

---

## 6. Motion (this matters most)

**Principle: motion shows the work happening.** The brand moves in two registers:

1. **The X** makes two moves and then stays still: build bar enters along its own axis (0ms), brand bar (200ms), they cross (400ms), the point flashes Volt (500ms), settled (700ms). One X animation per screen.
2. **The interface** shows a studio at work: signals travel along lines to the point, the active agent lights up, numbers change, logs grow, blocked actions bounce off a hard stop. A landing should feel alive: things happen continuously, at a calm pace.

### Tokens

- Easing for every movement: `cubic-bezier(.2, .8, .2, 1)` (fast out, soft landing). Linear only for loops (particles, marquee, orbits).
- Durations for transitions: **200ms** state (color, toggle, menu hover) · **450ms** moves (hover, X→+, new rows, numbers) · **700ms** entrances (intro, sections, the X). No others.
- Loops: 1.3s live-dot pulse · 1.4s halo · 2.4s particle on a line · 650–1600ms ticker (a new event or number) · 5–7s swarm blink · 60–70s marquee · 90–140s orbit rings · 24s the program seal.
- Stagger: 60–120ms between siblings, at most 8 in a row.
- The only overshoots: a dot popping in (scale 1.35) and the point of the X (1.18). No bounce or elastic easing anywhere else.

### Patterns (all in use on the website)

| # | Pattern | Spec |
|---|---|---|
| 01 | Rise | translateY 18px → 0, opacity 0 → 1, 700ms, stagger 80ms per line (`.aw-rise`) |
| 02 | Stagger | cards: 12px up + scale .97 → 1, 550ms, 70ms between |
| 03 | Scroll reveal | `animation-timeline: view()`, range `entry 0% entry 100%`, inside `@supports` (`.aw-reveal`). Never a cover-% range: the last sections of a tall page stay half faded |
| 04 | The X intro | as above, bars move only along their own axis |
| 05 | Swarm | a grid of small x glyphs (10 × 12px, two 2.5px bars at ±31.5°), Volt blink every 5s and Periwinkle every 7s, random negative delays, entering by distance from the point |
| 06 | Signal | a dot pops (450ms), a 1px line draws to the point (clip-path, 450ms), a 6px particle runs along it (1.3s ease-in), a tag "Backend · adjusting a database" rises 120ms later |
| 07 | Flow | 6px particles along 1px edges, 2.4s linear, fading in at 12% and out at 88%; Volt on live edges, Fog 45% on idle |
| 08 | Halo | active node: border and icon to Volt (450ms), halo 0 → 24px, 55% → 0 opacity, 1.4s (`.aw-halo`) |
| 09 | Number swap | new value drops in from −8px, 450ms; only for values that stand for live work, labelled sample |
| 10 | Switch | selected pill to Ultramarine (300ms); dependent content re-enters with the stagger; a swapped headline word rises (450ms) |
| 11 | Marquee | duplicated list, translateX −50%, 60s / 70s, pause on hover, masked edges (`.aw-marquee`) |
| 12 | Hard stop | a blocked action shakes −7 / +6 / −3px and settles (700ms, `.aw-hit`); the stop turns Chalk: a person decides |
| 13 | X → + | primary button hover and focus, 450ms (`.aw-xbtn`) |
| 14 | Lift | cards up 4px + Ultramarine border; transform 450ms, color 200ms |
| 15 | Progress | 3px Volt bar grows 450ms; each step rises 10px; older steps dim to 50–70%; the current one pulses |
| 16 | Reduced motion | see below |

### Choreography of a hero (the Home, first two seconds)

Text arrives first, top to bottom, so the message is readable by 1.4s: badge 100ms · eyebrow 180 · H1 lines 260 / 320 / 380 · lead 500 · buttons 600 · stats 700 (each a 700ms rise). The illustration builds in parallel: axis lines draw 200ms (1.4s) · build bar 300 · brand bar 500 · swarm 550–1000 radial · point 950 · AI CEO label 1100 · console 1200 · first signal 1300. After that the page moves at the ticker's pace (one event every 650ms on the Home, 1.6s on the AaaS hero), never faster.

### Replay without re-mounting

To restart an entrance when data changes (a new log row, a new number, a new decision card), define **two identical keyframe sets** and alternate the class on each change:

```css
.aw-inA { animation: aw-inA 450ms var(--aw-ease) both; }
.aw-inB { animation: aw-inB 450ms var(--aw-ease) both; }
@keyframes aw-inA { from { opacity: 0; transform: translateY(10px); } }
@keyframes aw-inB { from { opacity: 0; transform: translateY(10px); } }
```
```js
row.className = tick % 2 ? 'aw-inA' : 'aw-inB';
```

Don't animate `fill` on an element whose color is also set by data: the keyframe overrides the binding.

### Reduced motion (not optional)

`@media (prefers-reduced-motion: reduce)` turns off every keyframe and shows final states; particles are hidden; the marquee becomes a wrapped list. In JavaScript, **don't start the timers** (no ticking numbers, no rotating briefs):

```js
const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
if (!still) timer = setInterval(tick, 650);
```

The still page must read complete on its own.

### Don't

More than one X animation per screen; a spinning X; parallax; scroll-jacking; autoplay video; typewriter text; scale on hover; fake "live" numbers without the sample label; motion that stands for nothing (decorative loops must be slow and dim).

---

## 7. Page patterns

**Hero:** text column (eyebrow, split H1, lead, primary + secondary buttons, 2–3 stats) + a living illustration (the X at the point with the swarm, signals and a console; or the AaaS orbit: Captain at the point, eight agents around it, the active one sends a signal, decisions that touch a hard stop wait in a card with Approve / Reject). Under the illustration: `ILLUSTRATION · SAMPLE DATA, NOT LIVE ACTIVITY` and a link to the real record.

**Home order:** hero → Claude for Startups band → studio activity diagram (how a request becomes working software) → tools carousel → what we sell (3 products) → studio (two people + AI CEO + 17 departments with avatars) → contact ("Which work takes your team the most hours?") → footer.

**Product landing (ERP):** the hero is a business-type selector: "One ERP for / property developers. | booking businesses. | service companies." with "What do you sell? Properties | Bookings | Services"; switching changes the headline word, the copy, the four modules around the X and the module configurator below. Then modules configurator → hours calculator ("How much hiring can you skip?") → capabilities → FAQ → tour CTA.

**Agents as a Service landing:** orbit hero with a live decision card → the pack (9 agent cards, Captain in Night) → how it works (4 steps, auto-advancing, clickable) → hard stops (Ultramarine band; five stops, one bounces each tick) + six guarantees → what it runs on (AaaS → ERP flow) → contact.

---

## 8. Copy

Voice: two people who build software, talking to a business owner across a table. Short sentences. Outcome first, then how. Colons instead of dashes for asides. Buttons are a verb plus an object ("See what we sell", "Talk to the studio", "Open the ERP demo", "Work out the hours you free up"). Spanish uses tú and is written natively, never translated.

| We say | We don't say |
|---|---|
| Custom software to run your business with fewer people. | Software built by AI departments, signed off by people. (true, but says how, not what you get) |
| The AI CEO splits each request into tasks. | Everything crosses here. / It holds the thread of the assignment. |
| Which work takes your team the most hours? | Want to see it working with your business? |
| Sample data: 7 of 17 departments active in this frame. | AI teams under human oversight. |
| Sales, contracts and invoicing in one ERP. | Design your company's ERP on a living modular canvas. |
| 9 AGENTS PER BUSINESS | IN TESTING · SHADOW MODE |

Words we use: custom software, request, department, agent, AI CEO, hard stop, sign off, hours freed, sample data, by hand.
Words we don't: solutions, seamless, cutting-edge, world-class, leverage, empower, journey, ecosystem, unlock, synergy, "every decision that matters", guaranteed savings.

---

## 9. Checklist before you hand anything over

1. The page says what we sell, for whom, and what it changes, in the first screen.
2. No clients, no status labels, no promised savings, simulated activity labelled.
3. Menu is Chalk with the centred pill; one static Volt moment per screen; no Volt on Chalk or white.
4. Section colors follow the rhythm; no two Chalk or two Ultramarine sections in a row.
5. Headlines split 600/300 with one span per line; no orphans; body text within 56ch.
6. Every animation uses the brand easing and one of the three durations or a listed loop; reduced motion turns it all off and timers don't start.
7. Contrast meets the table in section 3; focus is visible (Volt outline on dark, Ultramarine on light).
8. Checked at 1440, 900 and 390px wide: no horizontal scroll, grids leave no lonely card, the menu collapses at 1100px.
9. Illustrations have an `aria-label` that says what they show; decorative SVG is `aria-hidden`.
10. Fonts self-hosted; no third-party requests added without a reason.

---

## 10. A brief you can paste into Claude Code

> Read `private/brand/DESIGN-GUIDE-FOR-LLMS.md` and use `private/brand/tokens.css`. Build [page or section] for AxisWorks. Audience: [business type]. The page must say in the first screen what we sell, for whom and what it changes (fewer people doing manual work), without promising figures. Follow the section rhythm, the menu and the motion system (one X animation, a living illustration labelled as sample data, reduced motion respected). Before finishing, run the checklist in section 9 and tell me which items you could not meet.
