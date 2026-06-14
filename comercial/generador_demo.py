# -*- coding: utf-8 -*-
"""
AxisWorks — Generador de demos comerciales (Fase 1)
=====================================================
Toma un JSON de prospecto y genera una landing moderna lista para enseñar.
Salida: previews/<slug>/index.html  → publicar en preview.axisworks.studio/<slug>

Uso:
    python generador_demo.py prospectos/ejemplo.json
    python generador_demo.py prospectos/*.json          (varios)

La landing es GENÉRICA (se adapta al sector y al color del negocio), no lleva
marca AxisWorks salvo un ribbon discreto que enlaza a la suscripción.
Ese ribbon es el gancho de venta: "Tu nueva web — actívala por 100€/mes".
"""
import json
import os
import re
import sys
import glob
import html
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
    n = max(0, min(5, int(n or 5)))
    return "★" * n + "☆" * (5 - n)


def section_servicios(servicios):
    if not servicios:
        return ""
    cards = []
    for s in servicios:
        icono = e(s.get("icono", "●"))
        cards.append(f"""
        <article class="card reveal">
          <div class="card-ico">{icono}</div>
          <h3>{e(s.get('titulo',''))}</h3>
          <p>{e(s.get('desc',''))}</p>
        </article>""")
    return f"""
  <section id="servicios" class="sec">
    <div class="wrap">
      <p class="eyebrow reveal">Lo que ofrecemos</p>
      <h2 class="reveal">Nuestros servicios</h2>
      <div class="grid-cards">{''.join(cards)}
      </div>
    </div>
  </section>"""


def section_sobre(d):
    sobre = d.get("sobre")
    if not sobre:
        return ""
    img = d.get("sobre_imagen") or d.get("hero_imagen", "")
    img_html = f'<div class="about-img reveal" style="background-image:url(\'{e(img)}\')"></div>' if img else ""
    return f"""
  <section id="sobre" class="sec sec-alt">
    <div class="wrap about">
      <div class="about-text reveal">
        <p class="eyebrow">Quiénes somos</p>
        <h2>{e(d.get('sobre_titulo','Sobre nosotros'))}</h2>
        <p>{e(sobre)}</p>
      </div>
      {img_html}
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
      <h2 class="reveal">Un vistazo</h2>
      <div class="gallery">{items}</div>
    </div>
  </section>"""


def section_resenas(resenas):
    if not resenas:
        return ""
    cards = []
    for r in resenas:
        cards.append(f"""
        <figure class="quote reveal">
          <div class="stars">{stars(r.get('estrella',5))}</div>
          <blockquote>{e(r.get('texto',''))}</blockquote>
          <figcaption>— {e(r.get('autor','Cliente'))}</figcaption>
        </figure>""")
    return f"""
  <section id="resenas" class="sec sec-alt">
    <div class="wrap">
      <p class="eyebrow reveal">Opiniones reales</p>
      <h2 class="reveal">Lo que dicen nuestros clientes</h2>
      <div class="grid-cards">{''.join(cards)}
      </div>
    </div>
  </section>"""


def trust_bar(d):
    bits = []
    if d.get("ciudad"):
        bits.append(("Ubicación", d["ciudad"]))
    if d.get("horario"):
        bits.append(("Horario", d["horario"]))
    if d.get("telefono"):
        bits.append(("Teléfono", d["telefono"]))
    if not bits:
        return ""
    cols = "".join(
        f'<div class="trust-col"><span class="trust-k">{e(k)}</span><span class="trust-v">{e(v)}</span></div>'
        for k, v in bits
    )
    return f'<div class="trust"><div class="wrap trust-row">{cols}</div></div>'


def contacto(d):
    tel = d.get("telefono", "")
    wa = re.sub(r"[^0-9]", "", d.get("whatsapp", "") or tel)
    cta = e(d.get("cta", "Contáctanos"))
    acciones = []
    if wa:
        acciones.append(f'<a class="btn btn-primary" href="https://wa.me/{wa}" target="_blank" rel="noopener">WhatsApp</a>')
    if tel:
        acciones.append(f'<a class="btn btn-ghost" href="tel:{e(tel)}">Llamar</a>')
    if d.get("email"):
        acciones.append(f'<a class="btn btn-ghost" href="mailto:{e(d["email"])}">Email</a>')
    dir_html = f'<p class="contact-dir">{e(d["direccion"])}</p>' if d.get("direccion") else ""
    return f"""
  <section id="contacto" class="sec contacto">
    <div class="wrap center">
      <p class="eyebrow reveal">Te esperamos</p>
      <h2 class="reveal">{cta}</h2>
      {dir_html}
      <div class="actions reveal">{''.join(acciones)}</div>
    </div>
  </section>"""


def render(d):
    negocio = d.get("negocio", "Tu negocio")
    accent = d.get("color_acento", "#E2581C")
    tagline = d.get("tagline", "")
    hero_img = d.get("hero_imagen", "")
    logo = d.get("logo", "")
    logo_html = (f'<img src="{e(logo)}" alt="{e(negocio)}" class="logo-img">'
                 if logo else f'<span class="logo-txt">{e(negocio)}</span>')

    nav_links = []
    if d.get("servicios"):
        nav_links.append('<a href="#servicios">Servicios</a>')
    if d.get("sobre"):
        nav_links.append('<a href="#sobre">Nosotros</a>')
    if d.get("galeria"):
        nav_links.append('<a href="#galeria">Galería</a>')
    if d.get("resenas"):
        nav_links.append('<a href="#resenas">Opiniones</a>')
    nav_links.append('<a href="#contacto" class="nav-cta">Contacto</a>')

    hero_style = (f'background-image:linear-gradient(180deg,rgba(10,10,12,.35),rgba(10,10,12,.72)),url(\'{e(hero_img)}\');'
                  if hero_img else 'background:#14151a;')

    year = datetime.now().year

    return f"""<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{e(negocio)}{(' — ' + e(tagline)) if tagline else ''}</title>
<meta name="description" content="{e(tagline or negocio)}">
<meta name="robots" content="noindex"><!-- demo / preview -->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Space+Grotesk:wght@500;700&display=swap" rel="stylesheet">
<style>
  :root{{
    --accent:{accent};
    --ink:#14151a; --bone:#f6f5f1; --muted:#6b7280; --line:#e6e4dd;
  }}
  *{{box-sizing:border-box;margin:0;padding:0}}
  html{{scroll-behavior:smooth}}
  body{{font-family:'Inter',system-ui,sans-serif;color:var(--ink);background:var(--bone);line-height:1.6;-webkit-font-smoothing:antialiased}}
  h1,h2,h3{{font-family:'Space Grotesk',sans-serif;line-height:1.1;font-weight:700;letter-spacing:-.02em}}
  h2{{font-size:clamp(1.8rem,4vw,2.8rem);margin-bottom:.4em}}
  h3{{font-size:1.25rem;margin-bottom:.3em}}
  a{{color:inherit;text-decoration:none}}
  .wrap{{max-width:1120px;margin:0 auto;padding:0 24px}}
  .eyebrow{{font-family:'Space Grotesk',sans-serif;text-transform:uppercase;letter-spacing:.18em;font-size:.72rem;color:var(--accent);font-weight:500;margin-bottom:.8em}}
  .sec{{padding:96px 0}}
  .sec-alt{{background:#fff}}
  .center{{text-align:center}}
  /* NAV */
  header{{position:fixed;top:0;left:0;right:0;z-index:50;backdrop-filter:blur(10px);background:rgba(246,245,241,.0);transition:.3s}}
  header.scrolled{{background:rgba(246,245,241,.92);box-shadow:0 1px 0 var(--line)}}
  .nav{{display:flex;align-items:center;justify-content:space-between;height:72px}}
  .logo-txt{{font-family:'Space Grotesk',sans-serif;font-weight:700;font-size:1.2rem;letter-spacing:-.02em}}
  .logo-img{{height:38px;width:auto}}
  .nav-links{{display:flex;gap:28px;align-items:center;font-size:.95rem;font-weight:500}}
  .nav-links a:hover{{color:var(--accent)}}
  .nav-cta{{background:var(--accent);color:#fff!important;padding:9px 18px;border-radius:999px}}
  .nav-cta:hover{{filter:brightness(.92)}}
  @media(max-width:720px){{.nav-links a:not(.nav-cta){{display:none}}}}
  /* HERO */
  .hero{{min-height:92vh;display:flex;align-items:center;color:#fff;{hero_style}background-size:cover;background-position:center}}
  .hero-in{{max-width:760px}}
  .hero h1{{font-size:clamp(2.4rem,6vw,4.4rem);margin-bottom:.3em}}
  .hero p{{font-size:clamp(1.05rem,2vw,1.4rem);opacity:.92;max-width:560px;margin-bottom:1.6em}}
  .btn{{display:inline-block;padding:14px 30px;border-radius:999px;font-weight:600;font-size:1rem;transition:.2s;cursor:pointer;border:none}}
  .btn-primary{{background:var(--accent);color:#fff}}
  .btn-primary:hover{{filter:brightness(.92);transform:translateY(-2px)}}
  .btn-ghost{{background:transparent;border:1.5px solid currentColor}}
  .btn-ghost:hover{{background:rgba(255,255,255,.1)}}
  .actions{{display:flex;gap:14px;flex-wrap:wrap;justify-content:center}}
  /* TRUST */
  .trust{{background:var(--ink);color:#fff}}
  .trust-row{{display:flex;gap:48px;flex-wrap:wrap;padding:26px 24px}}
  .trust-col{{display:flex;flex-direction:column}}
  .trust-k{{font-size:.7rem;text-transform:uppercase;letter-spacing:.14em;opacity:.55}}
  .trust-v{{font-weight:600;font-size:1.05rem}}
  /* CARDS */
  .grid-cards{{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:24px;margin-top:32px}}
  .card{{background:var(--bone);border:1px solid var(--line);border-radius:16px;padding:32px}}
  .sec-alt .card{{background:var(--bone)}}
  .card-ico{{width:48px;height:48px;border-radius:12px;background:var(--accent);color:#fff;display:flex;align-items:center;justify-content:center;font-size:1.3rem;margin-bottom:18px}}
  .card p{{color:var(--muted)}}
  /* ABOUT */
  .about{{display:grid;grid-template-columns:1.1fr 1fr;gap:56px;align-items:center}}
  .about-img{{min-height:360px;border-radius:18px;background-size:cover;background-position:center}}
  @media(max-width:820px){{.about{{grid-template-columns:1fr}}}}
  /* GALLERY */
  .gallery{{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px;margin-top:32px}}
  .gal-item{{aspect-ratio:4/3;border-radius:14px;background-size:cover;background-position:center;transition:.3s}}
  .gal-item:hover{{transform:scale(1.02)}}
  /* QUOTES */
  .quote{{background:var(--bone);border:1px solid var(--line);border-radius:16px;padding:30px}}
  .stars{{color:var(--accent);letter-spacing:2px;margin-bottom:12px}}
  .quote blockquote{{font-size:1.05rem;margin-bottom:14px}}
  .quote figcaption{{color:var(--muted);font-weight:600;font-size:.9rem}}
  /* CONTACTO */
  .contacto{{background:var(--ink);color:#fff}}
  .contact-dir{{opacity:.8;margin:.4em 0 1.6em}}
  .contacto .actions{{margin-top:8px}}
  /* FOOTER */
  footer{{padding:40px 0;text-align:center;color:var(--muted);font-size:.9rem}}
  /* RIBBON DEMO (gancho AxisWorks) */
  .ax-ribbon{{position:fixed;bottom:0;left:0;right:0;z-index:60;background:#15181C;color:#F4F2EC;
    display:flex;align-items:center;justify-content:center;gap:16px;flex-wrap:wrap;
    padding:12px 20px;font-size:.92rem;border-top:2px solid #E2581C}}
  .ax-ribbon b{{color:#fff}}
  .ax-ribbon .x{{color:#E2581C;font-weight:700}}
  .ax-ribbon a{{background:#E2581C;color:#fff;padding:8px 18px;border-radius:999px;font-weight:600;white-space:nowrap}}
  .ax-ribbon a:hover{{filter:brightness(.92)}}
  body{{padding-bottom:64px}}
  /* REVEAL */
  .reveal{{opacity:0;transform:translateY(24px);transition:opacity .7s ease,transform .7s ease}}
  .reveal.in{{opacity:1;transform:none}}
  @media(prefers-reduced-motion:reduce){{.reveal{{opacity:1;transform:none;transition:none}}}}
</style>
<noscript><style>.reveal{{opacity:1!important;transform:none!important}}</style></noscript>
</head>
<body>
<header id="hdr">
  <div class="wrap nav">
    <div class="logo">{logo_html}</div>
    <nav class="nav-links">{''.join(nav_links)}</nav>
  </div>
</header>

<section class="hero">
  <div class="wrap hero-in">
    <h1>{e(negocio)}</h1>
    <p>{e(tagline)}</p>
    <a href="#contacto" class="btn btn-primary">{e(d.get('cta','Contáctanos'))}</a>
  </div>
</section>
{trust_bar(d)}
{section_servicios(d.get('servicios'))}
{section_sobre(d)}
{section_galeria(d.get('galeria'))}
{section_resenas(d.get('resenas'))}
{contacto(d)}

<footer>
  <div class="wrap">© {year} {e(negocio)}. Todos los derechos reservados.</div>
</footer>

<!-- Gancho comercial AxisWorks -->
<div class="ax-ribbon">
  <span>Esta es una <b>vista previa</b> de tu nueva web, creada por <b>Axis<span class="x">✕</span>Works</b>.</span>
  <a href="{e(SUSCRIPCION_URL)}?ref={slugify(negocio)}">Actívala — 100€/mes</a>
</div>

<script>
  // Nav scroll state
  var hdr=document.getElementById('hdr');
  addEventListener('scroll',function(){{hdr.classList.toggle('scrolled',scrollY>20)}});
  // Reveal on scroll (con failsafe: el contenido SIEMPRE acaba visible)
  var els=document.querySelectorAll('.reveal');
  function showAll(){{els.forEach(function(el){{el.classList.add('in')}})}}
  if('IntersectionObserver' in window){{
    var io=new IntersectionObserver(function(es){{
      es.forEach(function(en){{if(en.isIntersecting){{en.target.classList.add('in');io.unobserve(en.target)}}}})
    }},{{threshold:.12}});
    els.forEach(function(el){{io.observe(el)}});
    setTimeout(showAll,3000); // failsafe por si el observer no dispara
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
