# -*- coding: utf-8 -*-
"""
AxisWorks — Generador de demos comerciales (Fase 1)
=====================================================
Toma un JSON de prospecto y genera una landing EDITORIAL lista para enseñar.
Salida: previews/<slug>/index.html  → publicar en preview.axisworks.studio/<slug>

Uso:
    python generador_demo.py prospectos/ejemplo.json
    python generador_demo.py prospectos/*.json          (varios)

Dirección de diseño 2026 (ver contexto/diseno_web_2026.md): anti-plantilla.
- Tipografía con carácter (Fraunces display + Inter + JetBrains Mono).
- Acento ESCASO (no pintar todo). Neutros con temperatura cálida.
- Hero asimétrico (no stock+overlay gris centrado). Servicios numerados (no emojis).
- Prueba social con números. Grid roto en galería. Cierre con panel oscuro.
La landing es genérica (se adapta al color del negocio) salvo el ribbon de venta.
"""
import json
import os
import re
import sys
import glob
import html
import base64
from datetime import datetime

# Consola Windows: forzar UTF-8 para no romper en cp1252
try:
    sys.stdout.reconfigure(encoding="utf-8")
except Exception:
    pass

BASE = os.path.dirname(os.path.abspath(__file__))
OUT_DIR = os.path.join(BASE, "previews")

# URL del flujo de alta (Stripe). Se sobreescribe con env AXIS_SUSCRIPCION_URL.
SUSCRIPCION_URL = os.environ.get(
    "AXIS_SUSCRIPCION_URL", "https://axisworks.studio/comercial/suscripcion/suscripcion.php"
)


def slugify(text):
    text = (text or "").lower().strip()
    text = text.replace("ñ", "n").replace("á", "a").replace("é", "e").replace(
        "í", "i").replace("ó", "o").replace("ú", "u")
    text = re.sub(r"[^a-z0-9]+", "-", text)
    return re.sub(r"-+", "-", text).strip("-") or "negocio"


def e(value):
    """Escape seguro para HTML."""
    return html.escape(str(value if value is not None else ""), quote=True)


def stars(n):
    n = max(0, min(5, round(float(n or 5))))
    return "★" * n + "☆" * (5 - n)


# ── CSS (plano, con token __ACCENT__ para no doblar llaves) ───────────
CSS = """
  :root{
    --accent:__ACCENT__;
    --accent-strong:color-mix(in srgb, var(--accent), #1a1714 26%);
    --ink:#1a1714; --ink-soft:#5c554e; --bone:#f7f4ef; --paper:#fffdfa;
    --muted:#8a817a; --line:#e7e1d8; --maxw:1180px;
  }
  *{box-sizing:border-box;margin:0;padding:0}
  html{scroll-behavior:smooth}
  body{font-family:'Inter',system-ui,sans-serif;color:var(--ink);background:var(--bone);
    font-size:17px;line-height:1.65;-webkit-font-smoothing:antialiased;overflow-x:hidden}
  h1,h2,h3{font-family:'Fraunces','Georgia',serif;font-weight:600;line-height:1.03;letter-spacing:-.02em}
  a{color:inherit;text-decoration:none}
  img{max-width:100%;display:block}
  .wrap{max-width:var(--maxw);margin:0 auto;padding:0 28px}
  .sec{padding:clamp(72px,11vw,128px) 0}
  .eyebrow{font-family:'JetBrains Mono',monospace;text-transform:uppercase;letter-spacing:.22em;
    font-size:.72rem;color:var(--accent-strong);font-weight:500;display:inline-block;margin-bottom:1.3em}
  .sec h2{font-size:clamp(1.9rem,4.2vw,3.1rem);margin-bottom:.5em}
  .lead{color:var(--ink-soft);font-size:1.15rem;max-width:56ch}
  /* BOTONES */
  .btn{display:inline-flex;align-items:center;gap:9px;padding:15px 30px;border-radius:999px;
    font-family:'Inter',sans-serif;font-weight:600;font-size:1rem;cursor:pointer;
    border:1.5px solid transparent;transition:transform .2s ease,background .25s ease,color .25s ease}
  .btn-primary{background:var(--ink);color:var(--bone)}
  .btn-primary:hover{transform:translateY(-2px);background:var(--accent);color:#fff}
  .btn-ghost{border-color:var(--ink);color:var(--ink)}
  .btn-ghost:hover{background:var(--ink);color:var(--bone)}
  .btn-accent{background:var(--accent);color:#fff}
  .btn-accent:hover{transform:translateY(-2px);filter:brightness(.93)}
  /* NAV */
  header{position:fixed;inset:0 0 auto 0;z-index:50;transition:.35s}
  header.scrolled{background:rgba(247,244,239,.82);backdrop-filter:blur(12px);box-shadow:0 1px 0 var(--line)}
  .nav{display:flex;align-items:center;justify-content:space-between;height:84px}
  .brand{font-family:'Fraunces',serif;font-weight:600;font-size:1.5rem;letter-spacing:-.02em}
  .brand img{height:40px;width:auto}
  .nav-links{display:flex;gap:34px;align-items:center;font-size:.95rem;font-weight:500}
  .nav-links a:not(.nav-cta){position:relative}
  .nav-links a:not(.nav-cta)::after{content:"";position:absolute;left:0;bottom:-5px;height:1.5px;
    width:0;background:var(--accent);transition:width .3s ease}
  .nav-links a:not(.nav-cta):hover::after{width:100%}
  .nav-cta{border:1.5px solid var(--ink);padding:9px 20px;border-radius:999px;transition:.25s}
  .nav-cta:hover{background:var(--ink);color:var(--bone)}
  @media(max-width:760px){.nav-links a:not(.nav-cta){display:none}}
  /* HERO */
  .hero{padding:clamp(120px,18vw,168px) 0 clamp(56px,8vw,90px)}
  .hero-grid{display:grid;grid-template-columns:1.05fr .95fr;gap:clamp(36px,5vw,68px);align-items:center}
  .hero h1{font-size:clamp(2.5rem,6.2vw,5rem);margin:.05em 0 .42em}
  .hero h1 em{font-style:italic;font-weight:500;color:var(--accent-strong)}
  .hero .lead{margin-bottom:2.1rem;max-width:34ch}
  .hero-cta{display:flex;gap:16px;align-items:center;flex-wrap:wrap;margin-bottom:1.6rem}
  .rating-chip{display:inline-flex;align-items:center;gap:10px;font-size:.92rem;color:var(--ink-soft)}
  .rating-chip .s{color:var(--accent);letter-spacing:2px}
  .hero-media{position:relative}
  .hero-frame{aspect-ratio:4/5;border-radius:22px;background:#ded7cc center/cover no-repeat;
    box-shadow:0 40px 70px -28px rgba(26,23,20,.4)}
  .hero-badge{position:absolute;left:-22px;bottom:30px;background:var(--paper);border:1px solid var(--line);
    border-radius:16px;padding:15px 20px;box-shadow:0 18px 40px -16px rgba(26,23,20,.3)}
  .hero-badge .n{font-family:'Fraunces',serif;font-size:1.7rem;font-weight:600;line-height:1}
  .hero-badge .l{font-family:'JetBrains Mono',monospace;font-size:.66rem;text-transform:uppercase;
    letter-spacing:.14em;color:var(--muted);margin-top:5px}
  @media(max-width:880px){.hero-grid{grid-template-columns:1fr}.hero-frame{aspect-ratio:4/3}
    .hero-media{order:-1}.hero-badge{left:auto;right:18px}}
  /* STATS */
  .stats{border-top:1px solid var(--line);border-bottom:1px solid var(--line)}
  .stats-row{display:flex;flex-wrap:wrap}
  .stat{flex:1 1 0;min-width:150px;padding:30px 26px;border-right:1px solid var(--line)}
  .stat:last-child{border-right:none}
  .stat .num{font-family:'Fraunces',serif;font-size:2.1rem;font-weight:600;line-height:1;display:block}
  .stat .num .s{color:var(--accent);font-size:1.3rem}
  .stat .lab{font-family:'JetBrains Mono',monospace;font-size:.68rem;text-transform:uppercase;
    letter-spacing:.14em;color:var(--muted);margin-top:9px}
  /* SERVICIOS (lista numerada editorial) */
  .serv-head{display:flex;justify-content:space-between;align-items:flex-end;gap:24px;flex-wrap:wrap}
  .serv-list{margin-top:clamp(34px,5vw,56px);border-top:1px solid var(--line)}
  .serv-row{display:grid;grid-template-columns:72px 1fr;gap:clamp(18px,3vw,40px);
    padding:clamp(26px,3.5vw,40px) 0;border-bottom:1px solid var(--line);align-items:baseline;
    transition:padding-left .35s ease,background .35s ease}
  .serv-row:hover{padding-left:14px}
  .serv-num{font-family:'JetBrains Mono',monospace;color:var(--accent-strong);font-size:.95rem;
    font-weight:500;letter-spacing:.04em;padding-top:.5em}
  .serv-row h3{font-size:clamp(1.35rem,2.6vw,2.05rem);margin-bottom:.3em}
  .serv-row p{color:var(--muted);max-width:62ch}
  /* SOBRE (asimétrico) */
  .about-grid{display:grid;grid-template-columns:.92fr 1.08fr;gap:clamp(36px,5vw,68px);align-items:center}
  .about-media{aspect-ratio:4/5;border-radius:22px;background:#ded7cc center/cover no-repeat;
    box-shadow:0 36px 64px -30px rgba(26,23,20,.36)}
  @media(max-width:820px){.about-grid{grid-template-columns:1fr}}
  /* GALERÍA (grid roto) */
  .gallery{display:grid;grid-template-columns:repeat(3,1fr);grid-auto-rows:240px;gap:16px;
    margin-top:clamp(34px,5vw,52px)}
  .gal-item{border-radius:18px;background:#ded7cc center/cover no-repeat;overflow:hidden;transition:transform .6s ease}
  .gal-item:first-child{grid-column:span 2;grid-row:span 2}
  .gal-item:hover{transform:scale(1.03)}
  @media(max-width:680px){.gallery{grid-template-columns:repeat(2,1fr);grid-auto-rows:170px}
    .gal-item:first-child{grid-column:span 2;grid-row:span 1}}
  /* RESEÑAS */
  .quote-feat{max-width:860px}
  .quote-feat .s{color:var(--accent);letter-spacing:4px;font-size:1.1rem;margin-bottom:20px;display:block}
  .quote-feat blockquote{font-family:'Fraunces',serif;font-style:italic;font-weight:500;
    font-size:clamp(1.5rem,3.4vw,2.5rem);line-height:1.3;letter-spacing:-.01em}
  .quote-feat figcaption{font-family:'JetBrains Mono',monospace;text-transform:uppercase;
    letter-spacing:.14em;font-size:.76rem;color:var(--muted);margin-top:26px}
  .quote-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(290px,1fr));
    gap:clamp(26px,4vw,40px);margin-top:clamp(40px,6vw,60px)}
  .quote-sm{border-left:2px solid var(--accent);padding-left:24px}
  .quote-sm .s{color:var(--accent);letter-spacing:2px;font-size:.9rem;margin-bottom:12px;display:block}
  .quote-sm blockquote{font-size:1.06rem;margin-bottom:14px}
  .quote-sm figcaption{font-family:'JetBrains Mono',monospace;text-transform:uppercase;
    letter-spacing:.12em;font-size:.72rem;color:var(--muted)}
  /* CIERRE (panel oscuro) */
  .cta-panel{background:var(--ink);color:var(--bone);border-radius:clamp(22px,3vw,32px);
    padding:clamp(44px,7vw,96px);text-align:center}
  .cta-panel .eyebrow{color:var(--accent)}
  .cta-panel h2{color:var(--paper);font-size:clamp(2rem,5.2vw,3.6rem)}
  .cta-panel .info{font-family:'JetBrains Mono',monospace;font-size:.82rem;letter-spacing:.06em;
    color:#b8afa4;margin:1.2em 0 2em;line-height:2}
  .cta-actions{display:flex;gap:14px;justify-content:center;flex-wrap:wrap}
  /* FOOTER */
  footer{padding:48px 0;color:var(--muted);font-size:.88rem}
  .foot-row{display:flex;justify-content:space-between;gap:18px;flex-wrap:wrap;align-items:center}
  .foot-row .brand{font-size:1.2rem;color:var(--ink)}
  /* RIBBON (gancho AxisWorks) */
  .ax-ribbon{position:fixed;inset:auto 0 0 0;z-index:60;background:#15181C;color:#F4F2EC;
    display:flex;align-items:center;justify-content:center;gap:18px;flex-wrap:wrap;
    padding:13px 22px;font-size:.9rem;border-top:2px solid #E2581C}
  .ax-ribbon b{color:#fff}
  .ax-ribbon .x{color:#E2581C;font-weight:700;font-family:'Fraunces',serif}
  .ax-ribbon a{background:#E2581C;color:#fff;padding:9px 20px;border-radius:999px;font-weight:600;
    white-space:nowrap;transition:filter .2s}
  .ax-ribbon a:hover{filter:brightness(.92)}
  body{padding-bottom:66px}
  /* REVEAL */
  .reveal{opacity:0;transform:translateY(26px);transition:opacity .8s cubic-bezier(.16,1,.3,1),
    transform .8s cubic-bezier(.16,1,.3,1)}
  .reveal.in{opacity:1;transform:none}
  @media(prefers-reduced-motion:reduce){.reveal{opacity:1;transform:none;transition:none}}
"""


def build_stats(d):
    items = []
    val = d.get("valoracion")
    if val:
        items.append((f'{e(val)}<span class="s"> ★</span>', "Valoración Google"))
    if d.get("total_resenas"):
        items.append((e(d["total_resenas"]), "Reseñas reales"))
    if d.get("experiencia"):
        items.append((e(d["experiencia"]), "De experiencia"))
    if d.get("ciudad"):
        items.append((e(d["ciudad"]), "Dónde estamos"))
    if len(items) < 2:
        return ""
    cols = "".join(
        f'<div class="stat reveal"><span class="num">{n}</span><span class="lab">{l}</span></div>'
        for n, l in items[:4]
    )
    return f'<section class="stats"><div class="wrap stats-row">{cols}</div></section>'


def section_servicios(servicios):
    if not servicios:
        return ""
    rows = []
    for i, s in enumerate(servicios, 1):
        rows.append(f"""
        <div class="serv-row reveal">
          <div class="serv-num">{i:02d}</div>
          <div>
            <h3>{e(s.get('titulo',''))}</h3>
            <p>{e(s.get('desc',''))}</p>
          </div>
        </div>""")
    return f"""
  <section id="servicios" class="sec">
    <div class="wrap">
      <div class="serv-head reveal">
        <div><p class="eyebrow">Lo que hacemos</p><h2>Servicios pensados para ti</h2></div>
      </div>
      <div class="serv-list">{''.join(rows)}
      </div>
    </div>
  </section>"""


def section_sobre(d):
    sobre = d.get("sobre")
    if not sobre:
        return ""
    img = d.get("sobre_imagen") or d.get("hero_imagen", "")
    media = f'<div class="about-media reveal" style="background-image:url(\'{e(img)}\')"></div>' if img else ""
    return f"""
  <section id="sobre" class="sec">
    <div class="wrap about-grid">
      {media}
      <div class="reveal">
        <p class="eyebrow">Quiénes somos</p>
        <h2>{e(d.get('sobre_titulo','Sobre nosotros'))}</h2>
        <p class="lead">{e(sobre)}</p>
      </div>
    </div>
  </section>"""


def section_galeria(galeria):
    if not galeria:
        return ""
    items = "".join(
        f'<div class="gal-item reveal" style="background-image:url(\'{e(g)}\')"></div>'
        for g in galeria
    )
    return f"""
  <section id="galeria" class="sec">
    <div class="wrap">
      <p class="eyebrow reveal">Galería</p>
      <h2 class="reveal">Nuestro trabajo, de cerca</h2>
      <div class="gallery">{items}</div>
    </div>
  </section>"""


def section_resenas(resenas):
    if not resenas:
        return ""
    feat = resenas[0]
    rest = resenas[1:]
    html_feat = f"""
      <figure class="quote-feat reveal">
        <span class="s">{stars(feat.get('estrella',5))}</span>
        <blockquote>“{e(feat.get('texto',''))}”</blockquote>
        <figcaption>{e(feat.get('autor','Cliente'))}</figcaption>
      </figure>"""
    grid = ""
    if rest:
        cards = "".join(f"""
        <figure class="quote-sm reveal">
          <span class="s">{stars(r.get('estrella',5))}</span>
          <blockquote>“{e(r.get('texto',''))}”</blockquote>
          <figcaption>{e(r.get('autor','Cliente'))}</figcaption>
        </figure>""" for r in rest)
        grid = f'<div class="quote-grid">{cards}</div>'
    return f"""
  <section id="resenas" class="sec">
    <div class="wrap">
      <p class="eyebrow reveal">Opiniones reales</p>
      {html_feat}
      {grid}
    </div>
  </section>"""


def section_contacto(d):
    tel = d.get("telefono", "")
    wa = re.sub(r"[^0-9]", "", d.get("whatsapp", "") or tel)
    cta = e(d.get("cta", "Reserva tu cita"))
    info_bits = [b for b in [d.get("direccion"), d.get("horario"), d.get("telefono")] if b]
    info = " · ".join(e(b) for b in info_bits)
    acciones = []
    if wa:
        acciones.append(f'<a class="btn btn-accent" href="https://wa.me/{wa}" target="_blank" rel="noopener">Escríbenos por WhatsApp</a>')
    if tel:
        acciones.append(f'<a class="btn btn-ghost" style="border-color:#f7f4ef;color:#f7f4ef" href="tel:{e(tel)}">Llamar</a>')
    if d.get("email"):
        acciones.append(f'<a class="btn btn-ghost" style="border-color:#f7f4ef;color:#f7f4ef" href="mailto:{e(d["email"])}">Email</a>')
    info_html = f'<p class="info">{info}</p>' if info else ""
    return f"""
  <section id="contacto" class="sec">
    <div class="wrap">
      <div class="cta-panel reveal">
        <p class="eyebrow">Te esperamos</p>
        <h2>{cta}</h2>
        {info_html}
        <div class="cta-actions">{''.join(acciones)}</div>
      </div>
    </div>
  </section>"""


def render(d):
    negocio = d.get("negocio", "Tu negocio")
    accent = d.get("color_acento", "#E2581C")
    tagline = d.get("tagline", "")
    headline = tagline or negocio
    eyebrow = d.get("hero_eyebrow") or d.get("ciudad") or "Bienvenido"
    hero_img = d.get("hero_imagen", "")
    logo = d.get("logo", "")
    brand = (f'<img src="{e(logo)}" alt="{e(negocio)}">' if logo else e(negocio))

    nav_links = []
    if d.get("servicios"):
        nav_links.append('<a href="#servicios">Servicios</a>')
    if d.get("sobre"):
        nav_links.append('<a href="#sobre">Nosotros</a>')
    if d.get("galeria"):
        nav_links.append('<a href="#galeria">Galería</a>')
    if d.get("resenas"):
        nav_links.append('<a href="#resenas">Opiniones</a>')
    nav_links.append(f'<a href="#contacto" class="nav-cta">{e(d.get("cta","Contacto"))}</a>')

    # Chip de rating en el hero
    chip = ""
    if d.get("valoracion") or d.get("total_resenas"):
        val = d.get("valoracion", "")
        tot = d.get("total_resenas", "")
        txt = " · ".join(p for p in [f"{e(val)}" if val else "", (f"{e(tot)} reseñas" if tot else "")] if p)
        chip = f'<span class="rating-chip"><span class="s">★★★★★</span>{txt}</span>'

    # Badge flotante sobre la imagen
    badge = ""
    if d.get("experiencia"):
        badge = f'<div class="hero-badge"><span class="n">{e(d["experiencia"])}</span><span class="l">De experiencia</span></div>'
    elif d.get("valoracion"):
        badge = f'<div class="hero-badge"><span class="n">{e(d["valoracion"])} ★</span><span class="l">Valoración Google</span></div>'

    frame = (f'<div class="hero-frame" style="background-image:url(\'{e(hero_img)}\')"></div>'
             if hero_img else '<div class="hero-frame"></div>')

    year = datetime.now().year
    css = CSS.replace("__ACCENT__", accent)

    # Favicon SVG con la inicial del negocio (sin peticiones extra, sin 404)
    initial = e((negocio.strip()[:1] or "·").upper())
    fav_svg = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">'
               f'<rect width="32" height="32" rx="7" fill="{accent}"/>'
               f'<text x="16" y="23" font-family="Georgia,serif" font-size="19" '
               f'fill="#fff" text-anchor="middle">{initial}</text></svg>')
    favicon = "data:image/svg+xml;base64," + base64.b64encode(fav_svg.encode("utf-8")).decode("ascii")

    return f"""<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{e(negocio)}{(' — ' + e(tagline)) if tagline else ''}</title>
<meta name="description" content="{e(tagline or negocio)}">
<meta name="robots" content="noindex"><!-- demo / preview -->
<link rel="icon" href="{favicon}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,600;0,9..144,700;1,9..144,500&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
<style>{css}</style>
<noscript><style>.reveal{{opacity:1!important;transform:none!important}}</style></noscript>
</head>
<body>
<header id="hdr">
  <div class="wrap nav">
    <a href="#" class="brand">{brand}</a>
    <nav class="nav-links">{''.join(nav_links)}</nav>
  </div>
</header>

<section class="hero">
  <div class="wrap hero-grid">
    <div class="hero-copy reveal">
      <p class="eyebrow">{e(eyebrow)}</p>
      <h1>{e(headline)}</h1>
      <p class="lead">{e(negocio)}{(' · ' + e(d.get('ciudad'))) if d.get('ciudad') and not tagline else ''}</p>
      <div class="hero-cta">
        <a href="#contacto" class="btn btn-primary">{e(d.get('cta','Reserva tu cita'))}</a>
        {chip}
      </div>
    </div>
    <div class="hero-media reveal">
      {frame}
      {badge}
    </div>
  </div>
</section>
{build_stats(d)}
{section_servicios(d.get('servicios'))}
{section_sobre(d)}
{section_galeria(d.get('galeria'))}
{section_resenas(d.get('resenas'))}
{section_contacto(d)}

<footer>
  <div class="wrap foot-row">
    <span class="brand">{e(negocio)}</span>
    <span>© {year} · Todos los derechos reservados</span>
  </div>
</footer>

<!-- Gancho comercial AxisWorks -->
<div class="ax-ribbon">
  <span>Esta es una <b>vista previa</b> de tu nueva web, creada por <b>Axis<span class="x">✕</span>Works</b>.</span>
  <a href="{e(SUSCRIPCION_URL)}?ref={slugify(negocio)}">Actívala — 100€/mes</a>
</div>

<script>
  var hdr=document.getElementById('hdr');
  addEventListener('scroll',function(){{hdr.classList.toggle('scrolled',scrollY>20)}});
  var els=document.querySelectorAll('.reveal');
  function showAll(){{els.forEach(function(el){{el.classList.add('in')}})}}
  if('IntersectionObserver' in window){{
    var io=new IntersectionObserver(function(es){{
      es.forEach(function(en){{if(en.isIntersecting){{en.target.classList.add('in');io.unobserve(en.target)}}}})
    }},{{threshold:.12}});
    els.forEach(function(el){{io.observe(el)}});
    setTimeout(showAll,3000);
  }} else {{ showAll(); }}
</script>
</body>
</html>"""


def build(path):
    with open(path, "r", encoding="utf-8") as f:
        d = json.load(f)
    slug = d.get("slug") or slugify(d.get("negocio", ""))
    dest_dir = os.path.join(OUT_DIR, slug)
    os.makedirs(dest_dir, exist_ok=True)
    dest = os.path.join(dest_dir, "index.html")
    with open(dest, "w", encoding="utf-8") as f:
        f.write(render(d))
    rel = os.path.relpath(dest, BASE)
    print(f"  ✓ {d.get('negocio','?'):30s} → {rel}")
    return dest


def main(argv):
    if len(argv) < 2:
        print(__doc__)
        return 1
    targets = []
    for arg in argv[1:]:
        targets.extend(glob.glob(arg) or [arg])
    print(f"AxisWorks · generador de demos — {len(targets)} prospecto(s)\n")
    for t in targets:
        if not os.path.exists(t):
            print(f"  ✗ no existe: {t}")
            continue
        try:
            build(t)
        except Exception as ex:
            print(f"  ✗ {t}: {ex}")
    print(f"\nSalida en: {os.path.relpath(OUT_DIR, BASE)}/  ·  publicar en preview.axisworks.studio/<slug>")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
