<?php /* Agents as a Service del diseño «X marks the work» (lienzo del owner, 12-oct-2026), mesa C04. Generada con
 * convierte.py y retocada por su parche (encargo 20261012_axisworks_web_nueva_brand_kit). Textos: inc/x/t_<página>.php;
 * las zonas <template data-r> las pinta su assets/x/<página>.js con assets/x/dc.js. */ ?>
<div style="font-family: Manrope, sans-serif; color: #F2F3F7; background: #0B0C1E; overflow-x: hidden">
<header class="navlight" style="background: #F2F3F7; color: #0B0C1E; border-bottom: 1px solid #DADCE6">
<div style="max-width: 1280px; margin: 0 auto; padding: 14px clamp(20px, 5vw, 80px); display: grid; grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr); align-items: center; gap: 16px">
<a aria-label="<?= x('axisworks_home') ?>" href="<?= h("WebHome.dc.html", 'a') ?>" style="grid-column: 1; justify-self: start; font-family: Unbounded, sans-serif; font-size: 20px; letter-spacing: -.03em; display: inline-flex; align-items: baseline"><span style="font-weight: 600"><?= x('a') ?></span><svg aria-hidden="true" style="width: .57em; height: .57em; margin: 0 .05em" viewbox="10 10 80 80"><polygon fill="#2E3BEB" points="10,10 41,10 90,90 59,90"></polygon><polygon fill="#C8F04A" points="59,10 90,10 41,90 10,90"></polygon><polygon fill="#0B0C1E" points="50,24.7 65.5,50 50,75.3 34.5,50"></polygon></svg><span style="font-weight: 600"><?= x('is') ?></span><span style="font-weight: 300"><?= x('works') ?></span></a>
<nav aria-label="<?= x('main') ?>" class="navlinks" style="grid-column: 2; display: flex; align-items: center; gap: 2px; padding: 4px; border-radius: 999px; background: #FFFFFF; border: 1px solid #DADCE6; font-size: 15px; font-weight: 600; white-space: nowrap">
<a aria-current="page" class="nl cur" href="<?= h("WebHome.dc.html", 'what_we_sell') ?>"><?= x('what_we_sell') ?></a><a class="nl" href="<?= h("WebHome.dc.html", 'how_we_work') ?>"><?= x('how_we_work') ?></a><a class="nl" href="<?= h("WebHome.dc.html", 'studio') ?>"><?= x('studio') ?></a><a class="nl" href="<?= h("WebHome.dc.html", 'tools') ?>"><?= x('tools') ?></a><a class="nl" href="<?= h("ErpLanding.dc.html", 'erp') ?>"><?= x('erp') ?> <span aria-hidden="true" style="color: #2E3BEB"><?= x('x') ?></span></a>
</nav>
<div style="grid-column: 3; justify-self: end; display: flex; align-items: center; gap: 12px">
<div aria-label="<?= x('language') ?>" class="lang" role="group" style="display: inline-flex; padding: 3px; border-radius: 999px; border: 1px solid #DADCE6; font-family: 'IBM Plex Mono', monospace; font-size: 12px; font-weight: 500"><?php foreach (['en', 'es'] as $lg): ?><a href="<?= e(xlang_url($lg)) ?>" hreflang="<?= $lg ?>" lang="<?= $lg ?>"<?= $lg === $lang ? ' class="on" aria-current="true" style="padding: 6px 10px; border-radius: 999px; background: #0B0C1E; color: #F2F3F7"' : ' style="padding: 6px 10px; border-radius: 999px; color: #4A4E66"' ?>><?= strtoupper($lg) ?></a><?php endforeach; ?></div>
<a class="navcta" href="<?= h("#contact", 'talk_to_the_studio') ?>" style="min-height: 44px; padding: 0 20px; border-radius: 999px; background: #0B0C1E; color: #C8F04A; display: inline-flex; align-items: center; font-weight: 700; white-space: nowrap"><?= x('talk_to_the_studio') ?></a>
<details class="menubtn"><summary style="min-height: 44px; padding: 0 18px; border-radius: 999px; border: 1.5px solid #0B0C1E; display: inline-flex; align-items: center; gap: 8px; font-weight: 700"><?= x('menu') ?><svg aria-hidden="true" height="14" viewbox="10 10 80 80" width="14"><polygon fill="currentColor" points="10,10 41,10 90,90 59,90"></polygon><polygon fill="currentColor" points="59,10 90,10 41,90 10,90"></polygon></svg></summary>
<nav aria-label="<?= x('main_compact') ?>" style="position: absolute; right: 0; top: calc(100% + 10px); z-index: 20; min-width: 220px; padding: 8px; border-radius: 18px; background: #FFFFFF; border: 1px solid #DADCE6; box-shadow: 0 18px 40px rgba(11,12,30,.18); display: flex; flex-direction: column; font-weight: 600"><a aria-current="page" class="nl cur" href="<?= h("WebHome.dc.html", 'what_we_sell') ?>"><?= x('what_we_sell') ?></a><a class="nl" href="<?= h("WebHome.dc.html", 'how_we_work') ?>"><?= x('how_we_work') ?></a><a class="nl" href="<?= h("WebHome.dc.html", 'studio') ?>"><?= x('studio') ?></a><a class="nl" href="<?= h("WebHome.dc.html", 'tools') ?>"><?= x('tools') ?></a><a class="nl" href="<?= h("ErpLanding.dc.html", 'erp_2') ?>"><?= x('erp_2') ?></a><a class="nl" href="<?= h("#contact", 'talk_to_the_studio') ?>"><?= x('talk_to_the_studio') ?></a><a class="nl" href="<?= h("#", 'es_espanol') ?>"><?= x('es_espanol') ?></a></nav>
</details>
</div>
</div>
</header>
<section id="hero" style="position: relative; overflow: hidden">
<div style="max-width: 1280px; margin: 0 auto; padding: clamp(40px, 6vw, 72px) clamp(20px, 5vw, 80px) clamp(40px, 5vw, 64px); display: flex; flex-wrap: wrap; align-items: center; gap: 32px">
<div style="flex: 1 1 500px; min-width: 0; display: flex; flex-direction: column; gap: 22px">
<span class="rise" style="animation-delay: .1s; display: inline-flex; align-items: center; gap: 10px; font-family: 'IBM Plex Mono', monospace; font-size: 13px; letter-spacing: .14em; color: #A9ADC2"><svg aria-hidden="true" height="16" viewbox="10 10 80 80" width="16"><polygon fill="#2E3BEB" points="10,10 41,10 90,90 59,90"></polygon><polygon fill="#C8F04A" points="59,10 90,10 41,90 10,90"></polygon></svg><?= x('agents_as_a_service') ?></span>
<h1 style="margin: 0; font-family: Unbounded, sans-serif; font-weight: 600; font-size: clamp(34px, 3.6vw, 52px); line-height: 1.04; letter-spacing: -.05em"><span class="rise" style="animation-delay: .2s; display: block"><?= x('an_agent_that_runs') ?></span><span class="rise" style="animation-delay: .28s; display: block"><?= x('your_business') ?></span><span class="rise" style="animation-delay: .36s; display: block; font-weight: 300"><?= x('within_limits') ?></span><span class="rise" style="animation-delay: .44s; display: block; font-weight: 300"><?= x('a_person_sets') ?></span></h1>
<p class="rise" style="animation-delay: .46s; margin: 0; font-size: clamp(17px, 1.4vw, 19px); line-height: 1.6; color: #C9CCDB; max-width: 46ch"><?= x('a_captain_agent_takes') ?></p>
<div class="rise" style="animation-delay: .56s; display: flex; flex-wrap: wrap; gap: 12px"><a class="xbtn" href="<?= h("#contact", 'talk_to_the_studio') ?>" style="min-height: 52px; padding: 0 12px 0 24px; border-radius: 999px; background: #C8F04A; color: #0B0C1E; display: inline-flex; align-items: center; gap: 12px; font-weight: 700; font-size: 16px"><?= x('talk_to_the_studio') ?><svg aria-hidden="true" height="26" viewbox="0 0 100 100" width="26"><polygon class="xa" fill="#0B0C1E" points="10,10 41,10 90,90 59,90"></polygon><polygon class="xb" fill="#0B0C1E" points="59,10 90,10 41,90 10,90"></polygon></svg></a><a href="<?= h("#pack", 'meet_the_nine_agents') ?>" style="min-height: 52px; padding: 0 24px; border-radius: 999px; border: 1.5px solid #4A4E66; display: inline-flex; align-items: center; font-weight: 700; font-size: 16px"><?= x('meet_the_nine_agents') ?></a></div>
<dl class="rise" style="animation-delay: .66s; margin: 6px 0 0; display: flex; flex-wrap: wrap; gap: 16px 36px">
<div><dt style="font-family: 'IBM Plex Mono', monospace; font-size: 11px; letter-spacing: .1em; color: #A9ADC2"><?= x('agents_per_business') ?></dt><dd style="margin: 4px 0 0; font-family: Unbounded, sans-serif; font-weight: 600; font-size: 28px; letter-spacing: -.05em"><?= x('9') ?></dd></div>
<div><dt style="font-family: 'IBM Plex Mono', monospace; font-size: 11px; letter-spacing: .1em; color: #A9ADC2"><?= x('hard_stops_for_a') ?></dt><dd style="margin: 4px 0 0; font-family: Unbounded, sans-serif; font-weight: 600; font-size: 28px; letter-spacing: -.05em"><?= x('5') ?></dd></div>
<div><dt style="font-family: 'IBM Plex Mono', monospace; font-size: 11px; letter-spacing: .1em; color: #A9ADC2"><?= x('decided_by_the_owner') ?></dt><template data-r="0"><dd style="margin: 4px 0 0; font-family: Unbounded, sans-serif; font-weight: 600; font-size: 28px; letter-spacing: -.05em">{{ decidedCount }}</dd></template></div>
</dl>
</div>
<div style="flex: 1 1 560px; min-width: 0; display: flex; flex-direction: column; gap: 14px">
<div class="stagewrap" style="overflow: hidden">
<div aria-label="<?= x('the_captain_at_the') ?>" class="stage" role="img">
<svg aria-hidden="true" height="600" style="position: absolute; inset: 0" viewbox="0 0 580 600" width="580"><g class="orbit" fill="none" stroke="#2A2D47" stroke-dasharray="2 9" stroke-width="1.5"><circle cx="290" cy="290" r="225"></circle></g><g class="orbit2" fill="none" stroke="#23253D" stroke-dasharray="1 6" stroke-width="1"><circle cx="290" cy="290" r="135"></circle></g></svg>
<template data-r="1"><sc-for as="sp" hint-placeholder-count="8" list="{{ spokes }}">
<div aria-hidden="true" style="position: absolute; left: {{ sp.x }}; top: {{ sp.y }}; width: {{ sp.w }}; height: 1px; background: {{ sp.line }}; transform-origin: 0 50%; transform: rotate({{ sp.angle }}deg); transition: background-color .45s"><sc-if hint-placeholder-val="{{ false }}" value="{{ sp.on }}"><span class="sig {{ sp.anim }}"></span></sc-if></div>
</sc-for></template>
<template data-r="2"><svg aria-hidden="true" class="bars" height="150" style="position: absolute; left: 215px; top: 215px" viewbox="0 0 100 100" width="150"><polygon class="ba" fill="#2E3BEB" points="10,10 41,10 90,90 59,90"></polygon><polygon class="bb" fill="#C8F04A" points="59,10 90,10 41,90 10,90"></polygon><polygon class="{{ ptAnim }}" fill="#F2F3F7" points="50,24.7 65.5,50 50,75.3 34.5,50"></polygon></svg></template>
<template data-r="3"><span style="position: absolute; left: 290px; top: 378px; transform: translateX(-50%); white-space: nowrap; font-family: 'IBM Plex Mono', monospace; font-size: 11px; letter-spacing: .14em; color: {{ capColor }}; transition: color .45s"><?= x('captain') ?></span></template>
<template data-r="4"><sc-for as="nd" hint-placeholder-count="8" list="{{ nodes }}">
<div class="nin" style="animation-delay: {{ nd.delay }}; position: absolute; left: {{ nd.x }}; top: {{ nd.y }}; transform: translate(-50%, -50%); display: flex; flex-direction: column; align-items: center; gap: 6px; width: 110px">
<span class="node {{ nd.halo }}" style="margin-top: 22px; width: 64px; height: 64px; border-radius: 50%; box-sizing: border-box; border: 1.5px solid {{ nd.border }}; background: {{ nd.bg }}; color: {{ nd.fg }}; display: inline-flex; align-items: center; justify-content: center"><svg aria-hidden="true" fill="none" height="24" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75" viewbox="0 0 24 24" width="24"><path d="{{ nd.d }}"></path></svg></span>
<span style="font-size: 12px; font-weight: 700; color: {{ nd.label }}; transition: color .45s">{{ nd.name }}</span>
</div>
</sc-for></template>
</div>
</div>
<div style="display: flex; flex-wrap: wrap; gap: 12px">
<section aria-label="<?= x('what_the_agents_did') ?>" style="flex: 1 1 260px; min-width: 0; border-radius: 20px; background: #10112A; border: 1px solid #23253D; padding: 14px 16px; display: flex; flex-direction: column; gap: 6px">
<div style="display: flex; justify-content: space-between; font-family: 'IBM Plex Mono', monospace; font-size: 10px; letter-spacing: .12em; color: #A9ADC2"><span style="display: inline-flex; align-items: center; gap: 8px"><span aria-hidden="true" class="pulse" style="width: 7px; height: 7px; border-radius: 50%; background: #C8F04A"></span><?= x('a_day_of_the') ?></span><span><?= x('sample') ?></span></div>
<ol style="margin: 0; padding: 0; list-style: none; display: flex; flex-direction: column">
<template data-r="5"><sc-for as="ev" hint-placeholder-count="4" list="{{ log }}">
<li class="{{ ev.anim }}" style="display: grid; grid-template-columns: 40px 1fr; gap: 8px; padding: 6px 0; border-bottom: 1px solid #1E2038; font-size: 12px; line-height: 1.4; opacity: {{ ev.op }}"><span style="font-family: 'IBM Plex Mono', monospace; color: #7D82A3">{{ ev.time }}</span><span><b>{{ ev.who }}</b> <span style="color: #A9ADC2">· {{ ev.what }}</span><sc-if hint-placeholder-val="{{ false }}" value="{{ ev.stop }}"> <span style="font-family: 'IBM Plex Mono', monospace; font-size: 10px; letter-spacing: .08em; padding: 2px 6px; border-radius: 999px; background: #F2F3F7; color: #0B0C1E; white-space: nowrap">{{ ev.stopName }}</span></sc-if></span></li>
</sc-for></template>
</ol>
</section>
<template data-r="6"><section aria-label="<?= x('a_decision_waiting_for') ?>" aria-live="polite" class="{{ dec.anim }}" style="flex: 1 1 260px; min-width: 0; border-radius: 20px; background: #F2F3F7; color: #0B0C1E; padding: 16px 18px; display: flex; flex-direction: column; gap: 10px">
<div style="display: flex; justify-content: space-between; align-items: center; gap: 8px; font-family: 'IBM Plex Mono', monospace; font-size: 10px; letter-spacing: .12em"><span style="color: #2E3BEB">NEEDS A PERSON · {{ dec.stop }}</span><span style="color: #4A4E66"><?= x('try_it') ?></span></div>
<p style="margin: 0; font-size: 15px; line-height: 1.45; font-weight: 600"><b style="color: #2E3BEB">{{ dec.who }}</b> {{ dec.what }}</p>
<sc-if hint-placeholder-val="{{ true }}" value="{{ dec.open }}">
<div style="display: flex; gap: 8px"><button class="dbtn" onclick="{{ dec.approve }}" style="min-height: 44px; padding: 0 18px; border-radius: 999px; border: 0; background: #0B0C1E; color: #F2F3F7; font: inherit; font-weight: 700; cursor: pointer" type="button"><?= x('approve') ?></button><button class="dbtn" onclick="{{ dec.reject }}" style="min-height: 44px; padding: 0 18px; border-radius: 999px; border: 1.5px solid #0B0C1E; background: transparent; color: #0B0C1E; font: inherit; font-weight: 700; cursor: pointer" type="button"><?= x('reject') ?></button></div>
</sc-if>
<span style="font-size: 13px; line-height: 1.45; color: {{ dec.statusColor }}">{{ dec.status }}</span>
</section></template>
</div>
<span style="display: inline-flex; align-items: center; gap: 8px; font-family: 'IBM Plex Mono', monospace; font-size: 11px; letter-spacing: .1em; color: #7D82A3"><?= x('illustration_sample_data_not') ?></span>
</div>
</div>
</section>
<section id="pack" style="background: #F2F3F7; color: #0B0C1E">
<div style="max-width: 1280px; margin: 0 auto; padding: clamp(64px, 9vw, 120px) clamp(20px, 5vw, 80px); display: flex; flex-direction: column; gap: 36px">
<div style="display: flex; flex-wrap: wrap; justify-content: space-between; align-items: flex-end; gap: 20px">
<div style="display: flex; flex-direction: column; gap: 14px; max-width: 760px">
<span style="font-family: 'IBM Plex Mono', monospace; font-size: 13px; letter-spacing: .14em; color: #2E3BEB"><?= x('the_pack') ?></span>
<h2 class="reveal" style="margin: 0; font-family: Unbounded, sans-serif; font-weight: 600; font-size: clamp(30px, 4vw, 54px); line-height: 1.04; letter-spacing: -.045em"><?= x('nine_agents') ?> <span style="font-weight: 300"><?= x('for_each_business') ?></span></h2>
</div>
<p style="flex: 0 1 420px; margin: 0; font-size: 17px; line-height: 1.6; color: #4A4E66"><?= x('each_agent_holds_only') ?></p>
</div>
<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 16px">
<article class="lift reveal" style="border-radius: 24px; background: #0B0C1E; color: #F2F3F7; border: 1.5px solid #0B0C1E; padding: 24px; display: flex; flex-direction: column; gap: 12px">
<div style="display: flex; justify-content: space-between; align-items: center"><svg aria-hidden="true" height="40" viewbox="10 10 80 80" width="40"><polygon fill="#2E3BEB" points="10,10 41,10 90,90 59,90"></polygon><polygon fill="#C8F04A" points="59,10 90,10 41,90 10,90"></polygon><polygon fill="#F2F3F7" points="50,24.7 65.5,50 50,75.3 34.5,50"></polygon></svg><span style="font-family: 'IBM Plex Mono', monospace; font-size: 11px; letter-spacing: .1em; padding: 5px 10px; border-radius: 999px; background: #C8F04A; color: #0B0C1E"><?= x('leads_the_pack') ?></span></div>
<h3 style="margin: 0; font-family: Unbounded, sans-serif; font-weight: 600; font-size: 24px; letter-spacing: -.04em"><?= x('captain_2') ?></h3>
<span style="font-family: 'IBM Plex Mono', monospace; font-size: 11px; letter-spacing: .12em; color: #A9ADC2"><?= x('ceo_of_the_business') ?></span>
<p style="margin: 0; font-size: 15px; line-height: 1.6; color: #C9CCDB"><?= x('sets_the_plan_decides') ?></p>
</article>
<article class="lift reveal" style="border-radius: 24px; background: #FFFFFF; border: 1.5px solid #FFFFFF; padding: 24px; display: flex; flex-direction: column; gap: 12px">
<span aria-hidden="true" style="width: 44px; height: 44px; border-radius: 50%; background: #E3E6FD; color: #2E3BEB; display: inline-flex; align-items: center; justify-content: center"><svg aria-hidden="true" fill="none" height="22" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75" style="flex: none" viewbox="0 0 24 24" width="22"><path d="M4 5h16v11H9l-5 4V5z"></path></svg></span>
<h3 style="margin: 0; font-family: Unbounded, sans-serif; font-weight: 600; font-size: 24px; letter-spacing: -.04em"><?= x('reception') ?></h3>
<span style="font-family: 'IBM Plex Mono', monospace; font-size: 11px; letter-spacing: .12em; color: #4A4E66"><?= x('customer_service') ?></span>
<p style="margin: 0; font-size: 15px; line-height: 1.6; color: #4A4E66"><?= x('answers_customers_the_first') ?></p>
</article>
<article class="lift reveal" style="border-radius: 24px; background: #FFFFFF; border: 1.5px solid #FFFFFF; padding: 24px; display: flex; flex-direction: column; gap: 12px">
<span aria-hidden="true" style="width: 44px; height: 44px; border-radius: 50%; background: #E3E6FD; color: #2E3BEB; display: inline-flex; align-items: center; justify-content: center"><svg aria-hidden="true" fill="none" height="22" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75" style="flex: none" viewbox="0 0 24 24" width="22"><path d="M21 12a9 9 0 1 1-9-9M17 12a5 5 0 1 1-5-5M12 12l7-7"></path></svg></span>
<h3 style="margin: 0; font-family: Unbounded, sans-serif; font-weight: 600; font-size: 24px; letter-spacing: -.04em"><?= x('radar') ?></h3>
<span style="font-family: 'IBM Plex Mono', monospace; font-size: 11px; letter-spacing: .12em; color: #4A4E66"><?= x('market_strategy') ?></span>
<p style="margin: 0; font-size: 15px; line-height: 1.6; color: #4A4E66"><?= x('reads_the_market_and') ?></p>
</article>
<article class="lift reveal" style="border-radius: 24px; background: #FFFFFF; border: 1.5px solid #FFFFFF; padding: 24px; display: flex; flex-direction: column; gap: 12px">
<span aria-hidden="true" style="width: 44px; height: 44px; border-radius: 50%; background: #E3E6FD; color: #2E3BEB; display: inline-flex; align-items: center; justify-content: center"><svg aria-hidden="true" fill="none" height="22" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75" style="flex: none" viewbox="0 0 24 24" width="22"><path d="M5 20v-8M12 20V5M19 20v-5M3 20h18"></path></svg></span>
<h3 style="margin: 0; font-family: Unbounded, sans-serif; font-weight: 600; font-size: 24px; letter-spacing: -.04em"><?= x('figures') ?></h3>
<span style="font-family: 'IBM Plex Mono', monospace; font-size: 11px; letter-spacing: .12em; color: #4A4E66"><?= x('analytics') ?></span>
<p style="margin: 0; font-size: 15px; line-height: 1.6; color: #4A4E66"><?= x('measures_what_each_bet') ?></p>
</article>
<article class="lift reveal" style="border-radius: 24px; background: #FFFFFF; border: 1.5px solid #FFFFFF; padding: 24px; display: flex; flex-direction: column; gap: 12px">
<span aria-hidden="true" style="width: 44px; height: 44px; border-radius: 50%; background: #E3E6FD; color: #2E3BEB; display: inline-flex; align-items: center; justify-content: center"><svg aria-hidden="true" fill="none" height="22" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75" style="flex: none" viewbox="0 0 24 24" width="22"><path d="M6 4v7a6 6 0 0 0 12 0V4M6 8h4M14 8h4"></path></svg></span>
<h3 style="margin: 0; font-family: Unbounded, sans-serif; font-weight: 600; font-size: 24px; letter-spacing: -.04em"><?= x('hook') ?></h3>
<span style="font-family: 'IBM Plex Mono', monospace; font-size: 11px; letter-spacing: .12em; color: #4A4E66"><?= x('acquisition') ?></span>
<p style="margin: 0; font-size: 15px; line-height: 1.6; color: #4A4E66"><?= x('finds_new_customers_within') ?></p>
</article>
<article class="lift reveal" style="border-radius: 24px; background: #FFFFFF; border: 1.5px solid #FFFFFF; padding: 24px; display: flex; flex-direction: column; gap: 12px">
<span aria-hidden="true" style="width: 44px; height: 44px; border-radius: 50%; background: #E3E6FD; color: #2E3BEB; display: inline-flex; align-items: center; justify-content: center"><svg aria-hidden="true" fill="none" height="22" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75" style="flex: none" viewbox="0 0 24 24" width="22"><path d="M4 20l4-1 11-11-3-3L5 16l-1 4zM14 6l3 3"></path></svg></span>
<h3 style="margin: 0; font-family: Unbounded, sans-serif; font-weight: 600; font-size: 24px; letter-spacing: -.04em"><?= x('quill') ?></h3>
<span style="font-family: 'IBM Plex Mono', monospace; font-size: 11px; letter-spacing: .12em; color: #4A4E66"><?= x('creative_conversion') ?></span>
<p style="margin: 0; font-size: 15px; line-height: 1.6; color: #4A4E66"><?= x('writes_the_content_and') ?></p>
</article>
<article class="lift reveal" style="border-radius: 24px; background: #FFFFFF; border: 1.5px solid #FFFFFF; padding: 24px; display: flex; flex-direction: column; gap: 12px">
<span aria-hidden="true" style="width: 44px; height: 44px; border-radius: 50%; background: #E3E6FD; color: #2E3BEB; display: inline-flex; align-items: center; justify-content: center"><svg aria-hidden="true" fill="none" height="22" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75" style="flex: none" viewbox="0 0 24 24" width="22"><path d="M4 10v4M8 7v10M12 4v16M16 8v8M20 11v2"></path></svg></span>
<h3 style="margin: 0; font-family: Unbounded, sans-serif; font-weight: 600; font-size: 24px; letter-spacing: -.04em"><?= x('listener') ?></h3>
<span style="font-family: 'IBM Plex Mono', monospace; font-size: 11px; letter-spacing: .12em; color: #4A4E66"><?= x('customer_analysis') ?></span>
<p style="margin: 0; font-size: 15px; line-height: 1.6; color: #4A4E66"><?= x('reads_what_customers_say') ?></p>
</article>
<article class="lift reveal" style="border-radius: 24px; background: #FFFFFF; border: 1.5px solid #FFFFFF; padding: 24px; display: flex; flex-direction: column; gap: 12px">
<span aria-hidden="true" style="width: 44px; height: 44px; border-radius: 50%; background: #E3E6FD; color: #2E3BEB; display: inline-flex; align-items: center; justify-content: center"><svg aria-hidden="true" fill="none" height="22" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75" style="flex: none" viewbox="0 0 24 24" width="22"><path d="M6 20a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM18 8a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM8 18h7a3 3 0 0 0 0-6H9a3 3 0 0 1 0-6h7"></path></svg></span>
<h3 style="margin: 0; font-family: Unbounded, sans-serif; font-weight: 600; font-size: 24px; letter-spacing: -.04em"><?= x('route') ?></h3>
<span style="font-family: 'IBM Plex Mono', monospace; font-size: 11px; letter-spacing: .12em; color: #4A4E66"><?= x('operations') ?></span>
<p style="margin: 0; font-size: 15px; line-height: 1.6; color: #4A4E66"><?= x('looks_after_day_to') ?></p>
</article>
<article class="lift reveal" style="border-radius: 24px; background: #FFFFFF; border: 1.5px solid #FFFFFF; padding: 24px; display: flex; flex-direction: column; gap: 12px">
<span aria-hidden="true" style="width: 44px; height: 44px; border-radius: 50%; background: #E3E6FD; color: #2E3BEB; display: inline-flex; align-items: center; justify-content: center"><svg aria-hidden="true" fill="none" height="22" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75" style="flex: none" viewbox="0 0 24 24" width="22"><path d="M6 11h12v9H6zM8 11V8a4 4 0 0 1 8 0v3M12 15v2"></path></svg></span>
<h3 style="margin: 0; font-family: Unbounded, sans-serif; font-weight: 600; font-size: 24px; letter-spacing: -.04em"><?= x('treasurer') ?></h3>
<span style="font-family: 'IBM Plex Mono', monospace; font-size: 11px; letter-spacing: .12em; color: #4A4E66"><?= x('money_rules') ?></span>
<p style="margin: 0; font-size: 15px; line-height: 1.6; color: #4A4E66"><?= x('plain_code_not_a') ?></p><span style="align-self: flex-start; font-family: 'IBM Plex Mono', monospace; font-size: 10px; letter-spacing: .1em; padding: 4px 8px; border-radius: 999px; border: 1px solid #0B0C1E"><?= x('plain_code_not_a_2') ?></span>
</article>
</div>
<p style="margin: 0; font-size: 14px; line-height: 1.6; color: #4A4E66"><?= x('the_builder_the_reviewer') ?></p>
</div>
</section>
<section id="how">
<div style="max-width: 1280px; margin: 0 auto; padding: clamp(64px, 9vw, 120px) clamp(20px, 5vw, 80px); display: flex; flex-direction: column; gap: 36px">
<div style="display: flex; flex-direction: column; gap: 14px; max-width: 760px">
<span style="font-family: 'IBM Plex Mono', monospace; font-size: 13px; letter-spacing: .14em; color: #A9ADC2"><?= x('how_it_works') ?></span>
<h2 class="reveal" style="margin: 0; font-family: Unbounded, sans-serif; font-weight: 600; font-size: clamp(30px, 4vw, 54px); line-height: 1.04; letter-spacing: -.045em"><?= x('the_agent_proposes') ?> <span style="font-weight: 300"><?= x('a_person_approves') ?></span></h2>
</div>
<div style="position: relative">
<div aria-hidden="true" style="position: absolute; left: 0; right: 0; top: 23px; height: 2px; background: #23253D; border-radius: 2px"><template data-r="7"><div class="prog" style="height: 100%; width: {{ progW }}; background: #C8F04A; border-radius: 2px"></div></template></div>
<ol style="position: relative; margin: 0; padding: 0; list-style: none; display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 16px">
<template data-r="8"><sc-for as="s" hint-placeholder-count="4" list="{{ steps }}">
<li style="display: flex; flex-direction: column; gap: 16px">
<button aria-pressed="{{ s.pressed }}" onclick="{{ s.pick }}" style="align-self: flex-start; width: 48px; height: 48px; border-radius: 50%; border: 2px solid {{ s.ring }}; background: {{ s.dot }}; color: {{ s.num }}; font-family: Unbounded, sans-serif; font-weight: 600; font-size: 16px; cursor: pointer; transition: background-color .45s, border-color .45s, color .45s" type="button">{{ s.n }}</button>
<div class="stepc" style="flex: 1; border-radius: 20px; padding: 22px; background: {{ s.bg }}; border: 1px solid {{ s.border }}; opacity: {{ s.op }}; display: flex; flex-direction: column; gap: 10px">
<h3 style="margin: 0; font-family: Unbounded, sans-serif; font-weight: 500; font-size: 19px; letter-spacing: -.03em">{{ s.h }}</h3>
<p style="margin: 0; font-size: 15px; line-height: 1.6; color: #C9CCDB">{{ s.p }}</p>
</div>
</li>
</sc-for></template>
</ol>
</div>
</div>
</section>
<section id="limits" style="background: #2E3BEB">
<div style="max-width: 1280px; margin: 0 auto; padding: clamp(64px, 9vw, 120px) clamp(20px, 5vw, 80px); display: flex; flex-direction: column; gap: 36px">
<div style="display: flex; flex-wrap: wrap; justify-content: space-between; align-items: flex-end; gap: 20px">
<div style="display: flex; flex-direction: column; gap: 14px; max-width: 760px">
<span style="font-family: 'IBM Plex Mono', monospace; font-size: 13px; letter-spacing: .14em; color: #E3E6FD"><?= x('limits_and_guarantees') ?></span>
<h2 class="reveal" style="margin: 0; font-family: Unbounded, sans-serif; font-weight: 600; font-size: clamp(30px, 4vw, 54px); line-height: 1.04; letter-spacing: -.045em"><?= x('hard_stops_that_are') ?> <span style="font-weight: 300"><?= x('not_up_to_the') ?></span></h2>
</div>
<p style="flex: 0 1 440px; margin: 0; font-size: 17px; line-height: 1.6; color: #E3E6FD"><?= x('these_five_are_reserved') ?></p>
</div>
<div style="display: flex; flex-direction: column; gap: 14px">
<ul style="margin: 0; padding: 0; list-style: none; display: grid; grid-template-columns: repeat(auto-fit, minmax(190px, 1fr)); gap: 12px">
<template data-r="9"><sc-for as="sp" hint-placeholder-count="5" list="{{ stops }}">
<li class="stop {{ sp.anim }}" style="min-height: 112px; box-sizing: border-box; padding: 18px; border-radius: 20px; background: {{ sp.bg }}; color: {{ sp.fg }}; border: 1.5px solid {{ sp.border }}; display: flex; flex-direction: column; justify-content: space-between; gap: 10px">
<span style="display: flex; justify-content: space-between; align-items: center"><svg aria-hidden="true" fill="none" height="22" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75" viewbox="0 0 24 24" width="22"><path d="M6 11h12v9H6zM8 11V8a4 4 0 0 1 8 0v3"></path></svg><span style="font-family: 'IBM Plex Mono', monospace; font-size: 10px; letter-spacing: .1em">{{ sp.n }}</span></span>
<b style="font-family: Unbounded, sans-serif; font-weight: 500; font-size: 17px; letter-spacing: -.03em">{{ sp.name }}</b>
<span class="{{ sp.tryAnim }}" style="font-family: 'IBM Plex Mono', monospace; font-size: 10px; letter-spacing: .08em; min-height: 14px">{{ sp.attempt }}</span>
</li>
</sc-for></template>
</ul>
</div>
<ul style="margin: 0; padding: 0; list-style: none; display: grid; grid-template-columns: repeat(auto-fit, minmax(340px, 1fr)); gap: 12px">
<li class="reveal" style="padding: 22px; border-radius: 20px; background: rgba(11,12,30,.22); border: 1px solid rgba(242,243,247,.18); display: flex; flex-direction: column; gap: 10px"><span style="color: #C8F04A"><svg aria-hidden="true" fill="none" height="24" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75" style="flex: none" viewbox="0 0 24 24" width="24"><path d="M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM6 6l12 12"></path></svg></span><b style="font-size: 17px"><?= x('money_lives_in_code') ?></b><span style="font-size: 14px; line-height: 1.6; color: #E3E6FD"><?= x('a_monthly_spending_cap') ?></span></li><li class="reveal" style="padding: 22px; border-radius: 20px; background: rgba(11,12,30,.22); border: 1px solid rgba(242,243,247,.18); display: flex; flex-direction: column; gap: 10px"><span style="color: #C8F04A"><svg aria-hidden="true" fill="none" height="24" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75" style="flex: none" viewbox="0 0 24 24" width="24"><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"></path></svg></span><b style="font-size: 17px"><?= x('it_says_it_is') ?></b><span style="font-size: 14px; line-height: 1.6; color: #E3E6FD"><?= x('the_first_message_of') ?></span></li><li class="reveal" style="padding: 22px; border-radius: 20px; background: rgba(11,12,30,.22); border: 1px solid rgba(242,243,247,.18); display: flex; flex-direction: column; gap: 10px"><span style="color: #C8F04A"><svg aria-hidden="true" fill="none" height="24" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75" style="flex: none" viewbox="0 0 24 24" width="24"><path d="M4 6h16M4 12h10M4 18h7"></path></svg></span><b style="font-size: 17px"><?= x('it_never_invents_proof') ?></b><span style="font-size: 14px; line-height: 1.6; color: #E3E6FD"><?= x('no_made_up_reviews') ?></span></li><li class="reveal" style="padding: 22px; border-radius: 20px; background: rgba(11,12,30,.22); border: 1px solid rgba(242,243,247,.18); display: flex; flex-direction: column; gap: 10px"><span style="color: #C8F04A"><svg aria-hidden="true" fill="none" height="24" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75" style="flex: none" viewbox="0 0 24 24" width="24"><path d="M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21c0-4 4-7 8-7s8 3 8 7"></path></svg></span><b style="font-size: 17px"><?= x('a_closed_list_goes') ?></b><span style="font-size: 14px; line-height: 1.6; color: #E3E6FD"><?= x('identity_checks_signatures_the') ?></span></li><li class="reveal" style="padding: 22px; border-radius: 20px; background: rgba(11,12,30,.22); border: 1px solid rgba(242,243,247,.18); display: flex; flex-direction: column; gap: 10px"><span style="color: #C8F04A"><svg aria-hidden="true" fill="none" height="24" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75" style="flex: none" viewbox="0 0 24 24" width="24"><path d="M6 3h9l4 4v14H6zM14 3v5h5"></path></svg></span><b style="font-size: 17px"><?= x('its_own_brief_is') ?></b><span style="font-size: 14px; line-height: 1.6; color: #E3E6FD"><?= x('no_tool_of_the') ?></span></li><li class="reveal" style="padding: 22px; border-radius: 20px; background: rgba(11,12,30,.22); border: 1px solid rgba(242,243,247,.18); display: flex; flex-direction: column; gap: 10px"><span style="color: #C8F04A"><svg aria-hidden="true" fill="none" height="24" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75" style="flex: none" viewbox="0 0 24 24" width="24"><path d="M4 6h2M4 12h2M4 18h2M9 6h11M9 12h11M9 18h11"></path></svg></span><b style="font-size: 17px"><?= x('everything_leaves_a_trace') ?></b><span style="font-size: 14px; line-height: 1.6; color: #E3E6FD"><?= x('activity_decisions_escalations_and') ?></span></li>
</ul>
</div>
</section>
<section id="erp" style="background: #F2F3F7; color: #0B0C1E">
<div style="max-width: 1280px; margin: 0 auto; padding: clamp(64px, 9vw, 120px) clamp(20px, 5vw, 80px); display: flex; flex-wrap: wrap; align-items: center; gap: 48px">
<div style="flex: 1 1 440px; min-width: 0; display: flex; flex-direction: column; gap: 16px">
<span style="font-family: 'IBM Plex Mono', monospace; font-size: 13px; letter-spacing: .14em; color: #2E3BEB"><?= x('what_it_runs_on') ?></span>
<h2 class="reveal" style="margin: 0; font-family: Unbounded, sans-serif; font-weight: 600; font-size: clamp(30px, 4vw, 54px); line-height: 1.04; letter-spacing: -.045em"><?= x('it_operates_on') ?> <span style="font-weight: 300"><?= x('your_erp_data') ?></span></h2>
<p style="margin: 0; font-size: 17px; line-height: 1.6; color: #4A4E66; max-width: 52ch"><?= x('the_agents_work_on') ?></p>
<a href="<?= h("ErpLanding.dc.html", 'see_the_erp') ?>" style="align-self: flex-start; min-height: 52px; padding: 0 24px; border-radius: 999px; background: #0B0C1E; color: #C8F04A; display: inline-flex; align-items: center; font-weight: 700"><?= x('see_the_erp') ?></a>
</div>
<div class="reveal" style="flex: 1 1 480px; min-width: 0; border-radius: 28px; background: #FFFFFF; padding: clamp(22px, 3vw, 36px); display: flex; flex-direction: column; gap: 22px">
<div style="display: flex; align-items: center; gap: 14px">
<b style="flex: none; padding: 12px 20px; border-radius: 999px; background: #E3E6FD; color: #2E3BEB; font-family: Unbounded, sans-serif; font-weight: 600; font-size: 18px; letter-spacing: -.03em"><?= x('aaas') ?></b>
<div aria-hidden="true" style="position: relative; flex: 1; height: 2px; background: #DADCE6; border-radius: 2px"><span class="flowdot"></span><span class="flowdot" style="animation-delay: .9s"></span></div>
<span style="flex: none; font-family: 'IBM Plex Mono', monospace; font-size: 11px; letter-spacing: .12em; color: #4A4E66"><?= x('operates_on') ?></span>
<div aria-hidden="true" style="position: relative; flex: 1; height: 2px; background: #DADCE6; border-radius: 2px"><span class="flowdot" style="animation-delay: .45s"></span><span class="flowdot" style="animation-delay: 1.35s"></span></div>
<b style="flex: none; display: inline-flex; align-items: center; gap: 8px; padding: 12px 20px; border-radius: 999px; background: #0B0C1E; color: #C8F04A; font-family: Unbounded, sans-serif; font-weight: 600; font-size: 18px; letter-spacing: -.03em"><svg aria-hidden="true" height="18" viewbox="10 10 80 80" width="18"><polygon fill="#2E3BEB" points="10,10 41,10 90,90 59,90"></polygon><polygon fill="#C8F04A" points="59,10 90,10 41,90 10,90"></polygon><polygon fill="#F2F3F7" points="50,24.7 65.5,50 50,75.3 34.5,50"></polygon></svg><?= x('erp') ?></b>
</div>
<div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px">
<span style="padding: 14px 16px; border-radius: 14px; background: #F2F3F7; font-weight: 700"><?= x('customers') ?></span>
<span style="padding: 14px 16px; border-radius: 14px; background: #F2F3F7; font-weight: 700"><?= x('bookings') ?></span>
<span style="padding: 14px 16px; border-radius: 14px; background: #F2F3F7; font-weight: 700"><?= x('contracts') ?></span>
<span style="padding: 14px 16px; border-radius: 14px; background: #F2F3F7; font-weight: 700"><?= x('invoices') ?></span>
</div>
<div style="border-top: 1px solid #DADCE6; padding-top: 18px; display: flex; flex-direction: column; gap: 10px">
<span style="font-family: 'IBM Plex Mono', monospace; font-size: 11px; letter-spacing: .12em; color: #4A4E66"><?= x('the_agent_module_inside') ?></span>
<div style="display: flex; flex-wrap: wrap; gap: 8px"><span style="font-family: 'IBM Plex Mono', monospace; font-size: 12px; padding: 6px 12px; border-radius: 999px; border: 1px solid #A9ADC2"><?= x('brief') ?></span><span style="font-family: 'IBM Plex Mono', monospace; font-size: 12px; padding: 6px 12px; border-radius: 999px; border: 1px solid #A9ADC2"><?= x('audit_trail') ?></span><span style="font-family: 'IBM Plex Mono', monospace; font-size: 12px; padding: 6px 12px; border-radius: 999px; border: 1px solid #A9ADC2"><?= x('proposals') ?></span><span style="font-family: 'IBM Plex Mono', monospace; font-size: 12px; padding: 6px 12px; border-radius: 999px; background: #0B0C1E; color: #F2F3F7"><?= x('approvals') ?></span></div>
</div>
</div>
</div>
</section>
<section id="contact">
<div style="max-width: 1280px; margin: 0 auto; padding: clamp(64px, 9vw, 120px) clamp(20px, 5vw, 80px); display: flex; flex-wrap: wrap; gap: 48px">
<div style="flex: 1 1 420px; min-width: 0; display: flex; flex-direction: column; gap: 22px">
<h2 class="reveal" style="margin: 0; font-family: Unbounded, sans-serif; font-weight: 600; font-size: clamp(32px, 4.4vw, 58px); line-height: 1.02; letter-spacing: -.045em"><?= x('would_an_agent_pack') ?> <span style="font-weight: 300"><?= x('fit_your_business') ?></span></h2>
<p style="margin: 0; font-size: 18px; line-height: 1.6; color: #C9CCDB; max-width: 44ch"><?= x('tell_us_about_your') ?></p>
<span style="align-self: flex-start; display: inline-flex; align-items: center; gap: 10px; font-family: 'IBM Plex Mono', monospace; font-size: 12px; letter-spacing: .1em; color: #A9ADC2"><svg aria-hidden="true" height="16" viewbox="10 10 80 80" width="16"><polygon fill="#F2F3F7" points="10,10 41,10 90,90 59,90"></polygon><polygon fill="#C8F04A" points="59,10 90,10 41,90 10,90"></polygon><polygon fill="#0B0C1E" points="50,24.7 65.5,50 50,75.3 34.5,50"></polygon></svg><?= x('part_of_the_claude') ?></span>
</div>
<form data-contacto novalidate class="reveal" style="flex: 1 1 420px; min-width: 0; border-radius: 24px; background: #F2F3F7; color: #0B0C1E; padding: clamp(24px, 3vw, 36px); display: flex; flex-direction: column; gap: 16px">
<div style="display: flex; flex-wrap: wrap; gap: 16px">
<label style="flex: 1 1 200px; display: flex; flex-direction: column; gap: 6px; font-size: 14px; font-weight: 700"><?= x('your_name') ?><input autocomplete="name" maxlength="120" name="nombre" required style="min-height: 48px; border-radius: 12px; border: 1.5px solid #A9ADC2; background: #FFFFFF; padding: 0 14px; font: inherit; font-weight: 400" type="text"/></label>
<label style="flex: 1 1 200px; display: flex; flex-direction: column; gap: 6px; font-size: 14px; font-weight: 700"><?= x('work_email') ?><input autocomplete="email" maxlength="200" name="email" required style="min-height: 48px; border-radius: 12px; border: 1.5px solid #A9ADC2; background: #FFFFFF; padding: 0 14px; font: inherit; font-weight: 400" type="email"/></label>
</div>
<label style="display: flex; flex-direction: column; gap: 6px; font-size: 14px; font-weight: 700"><span style="display: flex; align-items: baseline; gap: 8px"><?= x('company') ?><span style="font-family: 'IBM Plex Mono', monospace; font-size: 11px; font-weight: 400; color: #4A4E66"><?= x('optional') ?></span></span><input autocomplete="organization" maxlength="160" name="empresa" style="min-height: 48px; border-radius: 12px; border: 1.5px solid #A9ADC2; background: #FFFFFF; padding: 0 14px; font: inherit; font-weight: 400" type="text"/></label>
<label style="display: flex; flex-direction: column; gap: 6px; font-size: 14px; font-weight: 700"><?= x('what_does_your_business') ?><textarea maxlength="4000" minlength="10" name="mensaje" required placeholder="<?= x('for_example_a_booking') ?>" rows="4" style="border-radius: 12px; border: 1.5px solid #A9ADC2; background: #FFFFFF; padding: 12px 14px; font: inherit; font-weight: 400; resize: vertical"></textarea></label>
<button style="align-self: flex-start; min-height: 52px; padding: 0 26px; border-radius: 999px; border: 0; background: #0B0C1E; color: #C8F04A; font: inherit; font-weight: 700; font-size: 16px; cursor: pointer" type="submit"><?= x('send') ?></button>

<label aria-hidden="true" style="position: absolute; left: -10000px; width: 1px; height: 1px; overflow: hidden">Website <input autocomplete="off" name="website" tabindex="-1" type="text"></label>
<input name="pagina" type="hidden" value="<?= e($url) ?>"><input name="lang" type="hidden" value="<?= $lang ?>">
<p aria-live="polite" class="fc-msg" role="status" style="margin: 0; font-size: 14px; line-height: 1.5; color: #0B0C1E" data-sending="<?= e($T[$lang]['fc_sending']) ?>" data-ok="<?= e($T[$lang]['fc_ok']) ?>" data-val="<?= e($T[$lang]['fc_val']) ?>" data-err="<?= e($T[$lang]['fc_err']) ?>" data-lim="<?= e($T[$lang]['fc_lim']) ?>" data-mail="<?= e(correo(($lang === 'es' ? 'Consulta — ' : 'Enquiry — ') . $url)) ?>" data-to="<?= EMAIL ?>"></p>
<p style="margin: 0; font-size: 12px; line-height: 1.5; color: #4A4E66"><?= $lang === 'es' ? $LEGAL_CAPA1_ES : $LEGAL_CAPA1_EN ?></p>
</form>
</div>
</section>
<footer>
<div style="max-width: 1280px; margin: 0 auto; padding: 44px clamp(20px, 5vw, 80px); display: flex; flex-wrap: wrap; justify-content: space-between; gap: 28px">
<div style="flex: 1 1 360px; display: flex; flex-direction: column; gap: 12px">
<span style="font-family: Unbounded, sans-serif; font-size: 20px; letter-spacing: -.03em; display: inline-flex; align-items: baseline"><span style="font-weight: 600"><?= x('a') ?></span><svg aria-hidden="true" style="width: .57em; height: .57em; margin: 0 .05em" viewbox="10 10 80 80"><polygon fill="#2E3BEB" points="10,10 41,10 90,90 59,90"></polygon><polygon fill="#C8F04A" points="59,10 90,10 41,90 10,90"></polygon><polygon fill="#F2F3F7" points="50,24.7 65.5,50 50,75.3 34.5,50"></polygon></svg><span style="font-weight: 600"><?= x('is') ?></span><span style="font-weight: 300"><?= x('works') ?></span></span>
<p style="margin: 0; font-size: 14px; line-height: 1.6; color: #C9CCDB; max-width: 46ch"><?= x('custom_business_software_and') ?></p>
</div>
<nav aria-label="<?= x('footer') ?>" style="display: flex; flex-wrap: wrap; gap: 10px 26px; font-size: 14px; color: #A9ADC2; align-items: flex-start"><a href="<?= h("#products", 'what_we_sell') ?>"><?= x('what_we_sell') ?></a><a href="<?= h("WebAgents.dc.html", 'agents_as_a_service_2') ?>"><?= x('agents_as_a_service_2') ?></a><a href="<?= h("#activity", 'how_we_work') ?>"><?= x('how_we_work') ?></a><a href="<?= h("#studio", 'studio') ?>"><?= x('studio') ?></a><a href="<?= h("#", 'legal_notice') ?>"><?= x('legal_notice') ?></a><a href="<?= h("#", 'privacy') ?>"><?= x('privacy') ?></a><a href="<?= h("#", 'cookies') ?>"><?= x('cookies') ?></a></nav>
<span style="flex-basis: 100%; font-family: 'IBM Plex Mono', monospace; font-size: 11px; letter-spacing: .08em; color: #7D82A3"><?= x('2026_axisworks_pt_mahkota') ?> <a href="<?= h("https://claude.com/programs/startups", 'claude_for_startups') ?>" style="color: #C9CCDB"><?= x('claude_for_startups') ?></a> <?= x('program') ?></span>
</div>
</footer>
</div>
