#!/usr/bin/env python3
"""Generates the brand dossier boards (A4 landscape, Spanish) for the Design artifact."""
import os, sys

OUT = sys.argv[1]
W, H = 1122, 793
TOTAL = 10

HEAD = """<link href="https://fonts.googleapis.com/css2?family=Unbounded:wght@300;500;600&amp;family=Manrope:wght@400;500;700&amp;family=IBM+Plex+Mono:wght@400;500&amp;display=swap" rel="stylesheet">
<style>
@page{size:297mm 210mm;margin:0}
html,body{margin:0;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.pg{width:1122px;height:793px;box-sizing:border-box;position:relative;overflow:hidden;font-family:Manrope,sans-serif;display:flex;flex-direction:column;padding:40px 56px 32px}
.night{background:#0B0C1E;color:#F2F3F7}
.chalk{background:#F2F3F7;color:#0B0C1E}
.ultra{background:#2E3BEB;color:#F2F3F7}
.mono{font-family:'IBM Plex Mono',monospace}
.unb{font-family:Unbounded,sans-serif}
.bar{display:flex;justify-content:space-between;align-items:center;font-family:'IBM Plex Mono',monospace;font-size:11px;letter-spacing:.14em}
.eb{font-family:'IBM Plex Mono',monospace;font-size:12px;letter-spacing:.14em}
.h2{margin:0;font-family:Unbounded,sans-serif;font-weight:600;font-size:38px;line-height:1.06;letter-spacing:-.045em}
.h2 span{font-weight:300;display:block}
.p{margin:0;font-size:15px;line-height:1.6}
.ok{display:flex;gap:10px;font-size:13.5px;line-height:1.5}
.ok b{flex:none;width:18px;height:18px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-size:11px;margin-top:1px}
.rise{animation:rise .7s cubic-bezier(.2,.8,.2,1) both}
.d1{animation-delay:.08s}.d2{animation-delay:.16s}.d3{animation-delay:.24s}.d4{animation-delay:.32s}.d5{animation-delay:.4s}.d6{animation-delay:.48s}
@keyframes rise{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
.xin{animation:xin 1.1s cubic-bezier(.2,.8,.2,1) both;transform-origin:50% 50%}
@keyframes xin{from{opacity:0;transform:scale(.86) rotate(-8deg)}to{opacity:1;transform:none}}
.axis{stroke-dasharray:1400;animation:draw 1.6s cubic-bezier(.2,.8,.2,1) .2s both}
@keyframes draw{from{stroke-dashoffset:1400}to{stroke-dashoffset:0}}
.sig{position:absolute;top:50%;width:8px;height:8px;margin:-4px 0 0 -4px;border-radius:50%;animation:sig 2.6s linear infinite}
@keyframes sig{0%{left:0;opacity:0}12%{opacity:1}88%{opacity:1}100%{left:100%;opacity:0}}
.halo{animation:halo 1.6s ease-out infinite}
@keyframes halo{0%{box-shadow:0 0 0 0 rgba(200,240,74,.55)}100%{box-shadow:0 0 0 14px rgba(200,240,74,0)}}
.np{animation:np 5s cubic-bezier(.2,.8,.2,1) infinite}.npl{animation:npl 5s cubic-bezier(.2,.8,.2,1) infinite}
@keyframes np{0%,20%,100%{box-shadow:0 0 0 0 rgba(46,59,235,0)}6%{box-shadow:0 0 0 6px rgba(46,59,235,.35)}}
@keyframes npl{0%,20%,100%{box-shadow:0 0 0 0 rgba(200,240,74,0)}6%{box-shadow:0 0 0 6px rgba(200,240,74,.4)}}
@media (prefers-reduced-motion: reduce){.rise,.xin,.axis,.halo,.np,.npl{animation:none}.sig{display:none}}
@media print{.rise,.xin,.axis,.halo,.np,.npl{animation:none}.sig{display:none}}
</style>"""

MONO = "font-family: 'IBM Plex Mono', monospace"
SHD = "box-shadow: inset 0 1px 0 rgba(242,243,247,.07), 0 18px 36px -18px rgba(0,0,0,.8)"
SH = "box-shadow: 0 1px 2px rgba(11,12,30,.08), 0 16px 32px -14px rgba(11,12,30,.32)"
UNB = "font-family: Unbounded, sans-serif"


def xmark(size, point='#0B0C1E', build='#2E3BEB', cls='', label=None):
    aria = f'role="img" aria-label="{label}"' if label else 'aria-hidden="true"'
    c = f' class="{cls}"' if cls else ''
    return (f'<svg{c} {aria} width="{size}" height="{size}" viewBox="10 10 80 80" style="display: block; flex: none">'
            f'<polygon points="10,10 41,10 90,90 59,90" fill="{build}"></polygon>'
            f'<polygon points="59,10 90,10 41,90 10,90" fill="#C8F04A"></polygon>'
            f'<polygon points="50,24.7 65.5,50 50,75.3 34.5,50" fill="{point}"></polygon></svg>')


def wordmark(size, point):
    return (f'<span role="img" aria-label="axisworks" style="{UNB}; font-size: {size}px; letter-spacing: -.03em; display: inline-flex; align-items: baseline">'
            f'<span style="font-weight: 600">a</span>'
            f'<svg aria-hidden="true" viewBox="10 10 80 80" style="width: .57em; height: .57em; margin: 0 .05em"><polygon points="10,10 41,10 90,90 59,90" fill="#2E3BEB"></polygon><polygon points="59,10 90,10 41,90 10,90" fill="#C8F04A"></polygon><polygon points="50,24.7 65.5,50 50,75.3 34.5,50" fill="{point}"></polygon></svg>'
            f'<span style="font-weight: 600">is</span><span style="font-weight: 300">works</span></span>')


def page(n, theme, title, body, section=''):
    dark = theme in ('night', 'ultra')
    point = '#0B0C1E' if not dark else ('#F2F3F7' if theme == 'night' else '#0B0C1E')
    dim = {'night': '#A9ADC2', 'chalk': '#4A4E66', 'ultra': '#E3E6FD'}[theme]
    rule = {'night': '#23253D', 'chalk': '#DADCE6', 'ultra': 'rgba(242,243,247,.28)'}[theme]
    wm = wordmark(17, point) if theme != 'ultra' else (
        f'<span role="img" aria-label="axisworks" style="{UNB}; font-size: 17px; letter-spacing: -.03em; display: inline-flex; align-items: baseline"><span style="font-weight: 600">a</span>'
        f'<svg aria-hidden="true" viewBox="10 10 80 80" style="width: .57em; height: .57em; margin: 0 .05em"><polygon points="10,10 41,10 90,90 59,90" fill="#F2F3F7"></polygon><polygon points="59,10 90,10 41,90 10,90" fill="#C8F04A"></polygon><polygon points="50,24.7 65.5,50 50,75.3 34.5,50" fill="#0B0C1E"></polygon></svg>'
        f'<span style="font-weight: 600">is</span><span style="font-weight: 300">works</span></span>')
    top = (f'<header class="bar" style="color: {dim}; padding-bottom: 14px; border-bottom: 1px solid {rule}">{wm}'
           f'<span>DOSIER 2026 · {n:02d} / {TOTAL:02d}</span></header>')
    foot = (f'<footer class="bar" style="color: {dim}; margin-top: auto; padding-top: 12px; border-top: 1px solid {rule}">'
            f'<span>{section}</span><span>AXISWORKS.STUDIO · HELLO@AXISWORKS.STUDIO</span></footer>')
    return f"""<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<title>axisworks — Dosier · {title}</title>
<script src="./support.js"></script>
</head>
<body>
<x-dc>
<helmet>
{HEAD}
</helmet>
<div class="pg {theme}">
{top}
{body}
{foot}
</div>
</x-dc>
</body>
</html>
"""


def ok(text, bg, fg):
    return f'<div class="ok"><b style="background: {bg}; color: {fg}">✓</b><span>{text}</span></div>'


pages = []

# 01 — Cover
pages.append(('DCover', 'night', 'Portada', 'SOFTWARE A MEDIDA HECHO CON IA', f"""
<div style="flex: 1; display: grid; grid-template-columns: minmax(0, 1fr) 300px; gap: 32px; align-items: center">
<div style="display: flex; flex-direction: column; gap: 26px">
<div class="eb rise" style="color: #8C95FF">ESTUDIO DE SOFTWARE × EQUIPO DE IA</div>
<h1 class="rise d1" style="margin: 0; {UNB}; font-weight: 600; font-size: 50px; line-height: 1.04; letter-spacing: -.05em"><span style="display: block">Software a medida</span><span style="display: block">para llevar tu negocio</span><span style="display: block; font-weight: 300; color: #C9CCDB">con menos personas.</span></h1>
<p class="p rise d2" style="max-width: 50ch; font-size: 17px; color: #C9CCDB">Construimos el software y los asistentes de IA que quitan a tu equipo el trabajo manual: leads, contratos, facturas, cobros y comisiones.</p>
</div>
<div style="position: relative; width: 300px; height: 400px; display: flex; align-items: center; justify-content: center">
<svg aria-hidden="true" width="300" height="400" viewBox="0 0 300 400" style="position: absolute; inset: 0"><g stroke="#A9ADC2" stroke-opacity=".22" stroke-width="1"><line class="axis" x1="28" y1="0" x2="272" y2="400"></line><line class="axis" x1="272" y1="0" x2="28" y2="400"></line></g></svg>
{xmark(230, '#F2F3F7', cls='xin', label='La X de axisworks')}
</div>
</div>
<div class="rise d3" style="display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px; margin-bottom: 18px">
<div style="border-top: 1px solid #2A2D47; padding-top: 12px"><div style="{UNB}; font-weight: 600; font-size: 30px; letter-spacing: -.05em">17</div><div class="mono" style="font-size: 11px; letter-spacing: .1em; color: #A9ADC2; margin-top: 4px">DEPARTAMENTOS DE IA CONSTRUYEN</div></div>
<div style="border-top: 1px solid #2A2D47; padding-top: 12px"><div style="{UNB}; font-weight: 600; font-size: 30px; letter-spacing: -.05em">2</div><div class="mono" style="font-size: 11px; letter-spacing: .1em; color: #A9ADC2; margin-top: 4px">PERSONAS FIRMAN CADA ENTREGA</div></div>
<div style="border-top: 1px solid #2A2D47; padding-top: 12px"><div style="{UNB}; font-weight: 600; font-size: 30px; letter-spacing: -.05em">3</div><div class="mono" style="font-size: 11px; letter-spacing: .1em; color: #A9ADC2; margin-top: 4px">PRODUCTOS: ERP, AGENTES Y WEBS</div></div>
</div>
"""))

# 02 — Qué hacemos
groups_what = [('ALQUILER DE MOTOS · CASO COMPLETO EN LA PÁG. 7', [
    ('TALLER', 'Lo que hay que arreglar llega al mecánico por WhatsApp o de palabra.', 'La devolución abre un parte de taller con lo que hay que revisar y cambiar.'),
    ('PEDIDOS', 'Falta una pieza y alguien tiene que llamar o escribir al proveedor.', 'El parte lanza solo el pedido de materiales al proveedor que corresponde.'),
    ('DISPONIBLE', 'La moto ya está lista, pero sigue parada hasta que alguien se acuerda.', 'Al cerrar el parte vuelve al calendario y el bot de WhatsApp la ofrece.'),
    ('RENTABILIDAD', 'Una moto se alquila poco y nadie lo ve hasta revisar los números.', 'Los agentes lo detectan, buscan la causa y te proponen una oferta para aprobar.')]),
    ('PROMOCIÓN INMOBILIARIA · CASO COMPLETO EN LA PÁG. 8', [
    ('FACTURAS', 'Empieza la obra y alguien hace y envía las facturas una a una.', 'El parte del jefe de obra emite todas las facturas y las envía por WhatsApp y email.'),
    ('COBROS', 'Alguien mira quién no ha pagado y llama uno a uno.', 'Recordatorios automáticos hasta que el pago llega y queda registrado.'),
    ('COMPRADORES', 'Los compradores llaman para preguntar por facturas y por la obra.', 'Lo ven en su portal: facturas, pagos y avance de la obra.')])]
COLS = 'grid-template-columns: 104px minmax(0, 1fr) 28px minmax(0, 1fr); gap: 8px'
rows_html = ''
n = 0
for gname, rows in groups_what:
    rows_html += f'<div class="mono rise d{min(n + 2, 6)}" style="font-size: 10px; letter-spacing: .12em; color: #4A4E66; margin-top: 6px; padding-bottom: 2px; border-bottom: 1px solid #DADCE6">{gname}</div>'
    for k, before, after in rows:
        rows_html += (f'<div class="rise d{min(n + 2, 6)}" style="display: grid; {COLS}; align-items: stretch">'
                      f'<div class="mono" style="display: flex; align-items: center; font-size: 10.5px; letter-spacing: .1em; color: #2E3BEB">{k}</div>'
                      f'<div style="display: flex; align-items: center; background: #FFFFFF; border: 1px solid #C9CCDB; box-shadow: 0 1px 2px rgba(11,12,30,.08), 0 16px 32px -14px rgba(11,12,30,.32); border-radius: 10px; padding: 6px 12px; font-size: 12.5px; line-height: 1.35; color: #4A4E66">{before}</div>'
                      f'<div style="display: flex; align-items: center; justify-content: center"><span class="np" aria-hidden="true" style="animation-delay: {n * .7:.1f}s; width: 24px; height: 24px; border-radius: 50%; background: #2E3BEB; color: #F2F3F7; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700">→</span></div>'
                      f'<div style="display: flex; align-items: center; background: #0B0C1E; border-radius: 10px; padding: 6px 12px; font-size: 12.5px; line-height: 1.35; color: #E3E6FD">{after}</div></div>')
        n += 1
pages.append(('DWhat', 'chalk', 'Qué hacemos', '01 — QUÉ HACEMOS', f"""
<div style="display: flex; flex-direction: column; gap: 12px; margin-top: 20px">
<div class="eb rise" style="color: #4A4E66">01 — QUÉ HACEMOS</div>
<h2 class="h2 rise d1" style="font-size: 40px">Estás pagando sueldos <span>por trabajo que puede hacer el software.</span></h2>
</div>
<div style="display: flex; flex-direction: column; gap: 5px; margin-top: 18px">
<div style="display: grid; {COLS}">
<span></span><span class="mono" style="font-size: 10.5px; letter-spacing: .12em; color: #4A4E66">HOY, A MANO</span><span></span><span class="mono" style="font-size: 10.5px; letter-spacing: .12em; color: #2E3BEB">CON AXISWORKS</span>
</div>
{rows_html}
</div>
<div class="rise d6" style="margin: 12px 0 10px; background: #0B0C1E; color: #F2F3F7; border-radius: 16px; padding: 12px 20px; display: flex; align-items: center; gap: 20px">
<span class="mono" style="flex: none; font-size: 10.5px; letter-spacing: .12em; color: #C8F04A">EL OBJETIVO</span>
<span style="flex: none; {UNB}; font-weight: 600; font-size: 19px; letter-spacing: -.035em">El mismo trabajo, <span style="font-weight: 300">con menos plantilla.</span></span>
<span style="margin-left: auto; text-align: right; font-size: 12.5px; line-height: 1.45; color: #A9ADC2">17 departamentos de IA lo construyen.<br>Javier y Andrea firman cada entrega.</span>
</div>
"""))

# 03 — Qué vendemos
def product(tag, name, text, extra, checks, d):
    cks = ''.join(ok(c, '#C8F04A' if i == 0 and d == 1 else '#2E3BEB', '#0B0C1E' if i == 0 and d == 1 else '#F2F3F7') for i, c in enumerate(checks))
    return (f'<article class="rise d{d + 1}" style="background: #1A1C33; border: 1px solid rgba(140,149,255,.34); box-shadow: inset 0 1px 0 rgba(242,243,247,.07), 0 18px 36px -18px rgba(0,0,0,.8); border-radius: 20px; padding: 22px; display: flex; flex-direction: column; gap: 12px">'
            f'<div class="mono" style="font-size: 11px; letter-spacing: .12em; color: #8C95FF">{tag}</div>'
            f'<h3 style="margin: 0; {UNB}; font-weight: 600; font-size: 22px; letter-spacing: -.04em">{name}</h3>'
            f'<p class="p" style="font-size: 14px; color: #C9CCDB">{text}</p>{extra}'
            f'<div style="display: flex; flex-direction: column; gap: 8px; margin-top: auto; padding-top: 12px; border-top: 1px solid #23253D; color: #E3E6FD">{cks}</div></article>')

chips = lambda xs: '<div style="display: flex; flex-wrap: wrap; gap: 6px">' + ''.join(
    f'<span style="padding: 5px 10px; border-radius: 999px; border: 1px solid #2A2D47; font-size: 12px; font-weight: 600; color: #E3E6FD">{x}</span>' for x in xs) + '</div>'
also = ['CRM y embudos de venta', 'Asistente de WhatsApp 24/7', 'Automatizaciones', 'Portal del cliente', 'Integraciones: Meta, WhatsApp, pasarelas de pago', 'Campañas en Meta Ads', 'SEO y visibilidad en IA', 'Contenido para redes', 'Consultoría: qué construir primero']
pages.append(('DSell', 'night', 'Qué vendemos', '02 — QUÉ VENDEMOS', f"""
<div style="display: flex; justify-content: space-between; align-items: flex-end; gap: 40px; margin-top: 26px">
<div style="display: flex; flex-direction: column; gap: 12px">
<div class="eb rise" style="color: #8C95FF">02 — QUÉ VENDEMOS</div>
<h2 class="h2 rise d1">Un ERP, los agentes que trabajan en él <span>y las webs que traen clientes.</span></h2>
</div>
</div>
<p class="p rise d1" style="color: #C9CCDB; margin-top: 12px; max-width: 80ch">Llevas el negocio en el ERP. Los agentes trabajan con sus datos y las webs le traen clientes. Los tres los diseña, construye y mantiene el mismo estudio.</p>
<div style="display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; margin-top: 22px">
{product('ERP MODULAR', 'AxisWorks ERP', 'Enciendes los módulos que tu negocio usa hoy y añades otros cuando los necesita.', chips(['Promotoras', 'Reservas', 'Servicios']), ['Contratos, facturas y cobros en un solo sistema', 'Una base de datos privada por cliente'], 0)}
{product('9 AGENTES POR NEGOCIO', 'Agents as a Service', 'Un agente capitán lleva el día a día de tu negocio dentro de los límites que tú fijas.', '', ['Precio, publicar, borrar, gastar y enviar a terceros quedan para una persona', 'Trabaja sobre los datos de tu ERP'], 1)}
{product('HECHAS A MEDIDA', 'Webs y landings', 'Diseñadas, construidas, publicadas y probadas por el mismo equipo.', '', ['SEO y Meta Ads desde el mismo estudio', 'Un departamento aparte la prueba en producción antes de darla por terminada'], 2)}
</div>
<div class="rise d5" style="display: flex; flex-direction: column; gap: 10px; margin: 20px 0 18px">
<div class="mono" style="font-size: 11px; letter-spacing: .12em; color: #A9ADC2">TAMBIÉN A MEDIDA</div>
<div style="display: flex; flex-wrap: wrap; gap: 6px">{''.join(f'<span style="padding: 6px 12px; border-radius: 999px; background: #1A1C33; border: 1px solid rgba(140,149,255,.34); font-size: 12.5px; font-weight: 600; color: #E3E6FD">{x}</span>' for x in also)}</div>
</div>
"""))

# 04 — Cómo trabajamos
how = [('Nos cuentas qué se hace a mano', 'Qué tareas le quitan más horas a tu equipo. Te decimos qué parte puede hacer el software y cuánto costaría construirlo.'),
       ('El CEO IA reparte el trabajo', 'Divide el encargo en tareas y las asigna a los departamentos de IA que corresponden.'),
       ('Los departamentos lo construyen', 'Construyen, revisan y prueban. Calidad comprueba que funciona y Seguridad audita accesos y secretos.'),
       ('Javier y Andrea firman la entrega', 'Nada sale sin el visto bueno de una persona. Un departamento aparte lo prueba en producción.')]
how_html = ''.join(
    f'<li class="rise d{i + 2}" style="display: grid; grid-template-columns: 40px minmax(0, 1fr); gap: 14px; position: relative">'
    f'<span style="{UNB}; font-weight: 600; font-size: 14px; width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; '
    f'{"background: #0B0C1E; color: #C8F04A" if i == 3 else "background: #FFFFFF; border: 1px solid #C9CCDB; box-shadow: 0 1px 2px rgba(11,12,30,.08), 0 16px 32px -14px rgba(11,12,30,.32); color: #2E3BEB"}; position: relative; z-index: 1">0{i + 1}</span>'
    f'<div style="display: flex; flex-direction: column; gap: 4px; padding-top: 2px"><b style="font-size: 16px">{h}</b><span style="font-size: 13.5px; line-height: 1.5; color: #4A4E66">{p}</span></div></li>'
    for i, (h, p) in enumerate(how))
groups = [('CONSTRUIR', 'El software', ['Frontend', 'Backend', 'Bots', 'Arquitectura', 'Deploy', 'Juegos', 'Juego 3D', 'Pilotos']),
          ('CRECER', 'Marca y demanda', ['Diseño', 'Marketing', 'Comunicación']),
          ('CONTROLAR', 'Reglas, dinero y papeles', ['Seguridad', 'Calidad', 'Legal', 'Administración', 'Documentación', 'Organización'])]
num = 0
cols = ''
for g, sub, deps in groups:
    items = ''
    for d in deps:
        num += 1
        items += f'<div style="display: flex; gap: 8px; align-items: baseline; font-size: 12.5px"><span class="mono" style="font-size: 10px; color: #7D82A3">{num:02d}</span><span style="color: #E3E6FD">{d}</span></div>'
    cols += (f'<div style="display: flex; flex-direction: column; gap: 6px"><div class="mono" style="font-size: 10.5px; letter-spacing: .12em; color: #8C95FF">{g}</div>'
             f'<div style="font-size: 11.5px; color: #A9ADC2; margin-bottom: 4px">{sub}</div>{items}</div>')
pages.append(('DHow', 'chalk', 'Cómo trabajamos', '03 — CÓMO TRABAJAMOS', f"""
<div style="display: flex; flex-direction: column; gap: 12px; margin-top: 26px">
<div class="eb rise" style="color: #4A4E66">03 — CÓMO TRABAJAMOS</div>
<h2 class="h2 rise d1">Así se convierte un encargo <span>en software que funciona.</span></h2>
</div>
<div style="display: grid; grid-template-columns: minmax(0, 1fr) 470px; gap: 36px; margin-top: 26px; flex: 1; min-height: 0; margin-bottom: 18px">
<ol style="list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; justify-content: space-between; position: relative">
<span aria-hidden="true" style="position: absolute; left: 19px; top: 20px; bottom: 30px; width: 2px; background: #DADCE6"></span>
{how_html}
</ol>
<div class="rise d3" style="background: #0B0C1E; color: #F2F3F7; border-radius: 20px; padding: 22px; display: flex; flex-direction: column; gap: 16px">
<div style="display: flex; align-items: center; gap: 14px">
<span class="halo" style="width: 46px; height: 46px; border-radius: 14px; background: #1A1C33; border: 1px solid #2A2D47; display: flex; align-items: center; justify-content: center">{xmark(24, '#F2F3F7')}</span>
<div><div style="{UNB}; font-weight: 600; font-size: 18px; letter-spacing: -.03em">CEO IA</div><div class="mono" style="font-size: 10.5px; letter-spacing: .1em; color: #A9ADC2; margin-top: 3px">RECIBE CADA ENCARGO · 17 DEPARTAMENTOS DE IA</div></div>
</div>
<div style="display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; border-top: 1px solid #23253D; padding-top: 14px">{cols}</div>
<p style="margin: auto 0 0; font-size: 12.5px; line-height: 1.55; color: #A9ADC2">Cada departamento es un agente de IA que trabaja con reglas escritas y responde ante el CEO IA. Javier y Andrea dirigen el trabajo y dan el visto bueno a lo que sale.</p>
</div>
</div>
"""))

# 05 — ERP
biz = [('PROMOTORAS INMOBILIARIAS', 'Proyectos y obra', 'Proyectos y parcelas, reservas con plazos, contratos en tres idiomas, pagos por hito de obra y un portal donde cada comprador sigue lo suyo.',
        ['Proyectos y parcelas', 'Reservas con plazos', 'Contratos · 3 idiomas', 'Portal del comprador']),
       ('NEGOCIOS DE RESERVAS', 'Reservas por fechas', 'Reservas de un producto por fechas, con tarifas, disponibilidad y cobro, y un asistente de WhatsApp que contesta con tus propios datos.',
        ['Reservas por fecha', 'Tarifas y disponibilidad', 'Cobro por reserva', 'Asistente de WhatsApp']),
       ('EMPRESAS DE SERVICIOS', 'Catálogo y facturación', 'Un catálogo de productos y servicios facturado por línea, cobros con justificante y atención al cliente con su historial.',
        ['Catálogo', 'Facturación por línea', 'Cobros con justificante', 'Atención al cliente'])]
biz_html = ''.join(
    f'<article class="rise d{i + 2}" style="background: #1A1C33; border: 1px solid {"#2E3BEB" if i == 0 else "rgba(140,149,255,.34)"}; box-shadow: inset 0 1px 0 rgba(242,243,247,.07), 0 18px 36px -18px rgba(0,0,0,.8); border-radius: 20px; padding: 20px; display: flex; flex-direction: column; gap: 10px">'
    f'<div class="mono" style="font-size: 10.5px; letter-spacing: .12em; color: #8C95FF">{t}</div>'
    f'<h3 style="margin: 0; {UNB}; font-weight: 600; font-size: 19px; letter-spacing: -.04em">{h}</h3>'
    f'<p style="margin: 0; font-size: 13px; line-height: 1.55; color: #C9CCDB">{p}</p>'
    f'<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-top: auto">' + ''.join(
        f'<span style="padding: 7px 9px; border-radius: 10px; background: #0B0C1E; border: 1px solid #23253D; font-size: 11.5px; font-weight: 600; color: #E3E6FD">{c}</span>' for c in cs) +
    '</div></article>' for i, (t, h, p, cs) in enumerate(biz))
mods = [('Ventas', 6), ('Documentos', 4), ('Finanzas', 11), ('Comunicación', 3), ('Base de datos', 4), ('Panel de control', 2)]
mods_html = ''.join(
    f'<div style="background: #1A1C33; border: 1px solid rgba(140,149,255,.34); box-shadow: inset 0 1px 0 rgba(242,243,247,.07), 0 18px 36px -18px rgba(0,0,0,.8); border-radius: 12px; padding: 10px 12px; display: flex; flex-direction: column; gap: 6px">'
    f'<div style="display: flex; justify-content: space-between; align-items: baseline"><span style="font-size: 12.5px; font-weight: 700; color: #E3E6FD">{name}</span><span style="{UNB}; font-weight: 600; font-size: 16px; letter-spacing: -.04em">{n}</span></div>'
    f'<span aria-hidden="true" style="height: 4px; border-radius: 4px; background: #23253D; display: block"><span style="display: block; height: 4px; border-radius: 4px; width: {round(n / 11 * 100)}%; background: {"#C8F04A" if name == "Finanzas" else "#2E3BEB"}"></span></span></div>'
    for name, n in mods)
stats = [('30', 'módulos'), ('3', 'tipos de negocio'), ('1', 'base de datos por empresa'), ('3', 'idiomas de contrato')]
pages.append(('DErp', 'night', 'AxisWorks ERP', '04 — AXISWORKS ERP', f"""
<div style="display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, .8fr); gap: 40px; align-items: end; margin-top: 26px">
<div style="display: flex; flex-direction: column; gap: 12px">
<div class="eb rise" style="color: #8C95FF">04 — AXISWORKS ERP</div>
<h2 class="h2 rise d1">Mismos módulos, <span>distinto inventario.</span></h2>
</div>
<p class="p rise d1" style="color: #C9CCDB; font-size: 14.5px">Un ERP modular con contratos, facturas y cobros en un solo sistema. Cada empresa tiene su propia base de datos y enciende solo los módulos que usa.</p>
</div>
<div style="display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; margin-top: 22px">{biz_html}</div>
<div class="rise d5" style="display: flex; flex-direction: column; gap: 22px; margin: 24px 0 18px">
<dl style="margin: 0; display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 16px; border-top: 1px solid #23253D; padding-top: 14px">{''.join(f'<div><dd style="margin: 0; {UNB}; font-weight: 600; font-size: 30px; letter-spacing: -.05em">{v}</dd><dt style="font-size: 11.5px; line-height: 1.35; color: #A9ADC2; margin-top: 4px">{k}</dt></div>' for v, k in stats)}</dl>
<div style="display: flex; flex-direction: column; gap: 8px">
<div class="mono" style="font-size: 10.5px; letter-spacing: .12em; color: #A9ADC2">LOS 30 MÓDULOS, POR ÁREA</div>
<div style="display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 8px">{mods_html}</div>
</div>
</div>
"""))

# 06 — Agents as a Service
pack = [('Captain', 'CEO del negocio', 'Fija el plan y reparte el trabajo. Es la única voz ante el dueño.'),
        ('Reception', 'Atención al cliente', 'Contesta a los clientes y dice desde el primer mensaje que es una IA.'),
        ('Radar', 'Mercado y estrategia', 'Lee el mercado y propone dónde apostar. Solo lectura.'),
        ('Figures', 'Analítica', 'Mide lo que da cada apuesta.'),
        ('Hook', 'Captación', 'Busca clientes con el presupuesto y los canales permitidos.'),
        ('Quill', 'Creatividad y conversión', 'Escribe el contenido y las páginas que venden.'),
        ('Listener', 'Análisis de clientes', 'Lee lo que dicen los clientes.'),
        ('Route', 'Operaciones', 'Se ocupa del día a día.'),
        ('Treasurer', 'Reglas del dinero', 'Código, no un modelo: aplica el tope de gasto mensual.')]
pack_html = ''.join(
    f'<div style="background: {"#0B0C1E" if i == 0 else "#FFFFFF"}; color: {"#F2F3F7" if i == 0 else "#0B0C1E"}; border: 1px solid {"#0B0C1E" if i == 0 else "#C9CCDB"}; border-radius: 14px; padding: 12px 13px; box-shadow: 0 1px 2px rgba(11,12,30,.08), 0 16px 32px -14px rgba(11,12,30,.32); display: flex; flex-direction: column; gap: 4px">'
    f'<b style="{UNB}; font-weight: 600; font-size: 15px; letter-spacing: -.03em">{n}</b>'
    f'<span class="mono" style="font-size: 9.5px; letter-spacing: .08em; color: {"#C8F04A" if i == 0 else "#2E3BEB"}">{r.upper()}</span>'
    f'<span style="font-size: 11.5px; line-height: 1.4; color: {"#C9CCDB" if i == 0 else "#4A4E66"}">{d}</span></div>'
    for i, (n, r, d) in enumerate(pack))
asteps = [('El dueño escribe el brief', 'Misión, tope de gasto y permisos. El agente lo lee y nunca lo puede escribir.'),
          ('El agente propone', 'Cada apuesta lleva hipótesis, medida, plazo y coste. Propone cambios; no los hace.'),
          ('Una persona aprueba', 'Lo que toca un límite duro espera a una persona. Todo queda registrado en el ERP.'),
          ('Lo que funciona se queda', 'Una apuesta que funciona pasa a ser código que corre solo. La que no, se descarta.')]
asteps_html = ''.join(
    f'<li style="display: grid; grid-template-columns: 26px minmax(0, 1fr); gap: 10px"><span class="mono" style="font-size: 12px; color: #2E3BEB; padding-top: 2px">0{i + 1}</span>'
    f'<div><b style="font-size: 14px">{h}</b><div style="font-size: 12.5px; line-height: 1.5; color: #4A4E66; margin-top: 2px">{p}</div></div></li>'
    for i, (h, p) in enumerate(asteps))
stops = ['Precio', 'Publicar', 'Borrar', 'Gastar', 'Enviar a terceros']
pages.append(('DAgents', 'chalk', 'Agents as a Service', '05 — AGENTS AS A SERVICE', f"""
<div style="display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, .85fr); gap: 40px; align-items: end; margin-top: 24px">
<div style="display: flex; flex-direction: column; gap: 12px">
<div class="eb rise" style="color: #4A4E66">05 — AGENTS AS A SERVICE</div>
<h2 class="h2 rise d1">El agente propone, <span>una persona aprueba.</span></h2>
</div>
<p class="p rise d1" style="color: #4A4E66; font-size: 14.5px">Cada negocio tiene su propio equipo de nueve agentes. Un capitán lleva el día a día dentro de los límites que fija el dueño, y todo queda escrito en su ERP.</p>
</div>
<div style="display: grid; grid-template-columns: minmax(0, 1.35fr) minmax(0, 1fr); gap: 28px; margin-top: 20px">
<div class="rise d2" style="display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px">{pack_html}</div>
<ol class="rise d3" style="list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; justify-content: space-between; gap: 10px">{asteps_html}</ol>
</div>
<div class="rise d4" style="margin: 18px 0 16px; background: #2E3BEB; color: #F2F3F7; border-radius: 18px; padding: 16px 20px; display: grid; grid-template-columns: 210px minmax(0, 1fr); gap: 20px; align-items: center">
<div><div class="mono" style="font-size: 10.5px; letter-spacing: .12em; color: #E3E6FD">LÍMITES DUROS</div><div style="{UNB}; font-weight: 600; font-size: 17px; line-height: 1.15; letter-spacing: -.03em; margin-top: 4px">Siempre para una persona</div></div>
<div style="display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 8px">{''.join(f'<div style="border: 1.5px solid rgba(242,243,247,.45); border-radius: 12px; padding: 10px 12px; display: flex; align-items: center; gap: 8px; font-weight: 700; font-size: 13px"><span aria-hidden="true" style="width: 8px; height: 8px; border-radius: 2px; background: #F2F3F7; flex: none"></span>{s}</div>' for s in stops)}</div>
</div>
"""))

# 07 — Caso: alquiler de motos
def flow(nodes, dark):
    """A row of steps joined by a line; a light card marks the step a person does."""
    cards = ''
    for i, (tag, h, p, person) in enumerate(nodes):
        if dark:
            bg, fg, bd, dim, tg = ('#F2F3F7', '#0B0C1E', '#F2F3F7', '#4A4E66', '#2E3BEB') if person else ('#1A1C33', '#F2F3F7', 'rgba(140,149,255,.34)', '#C9CCDB', '#8C95FF')
        else:
            bg, fg, bd, dim, tg = ('#FFFFFF', '#0B0C1E', '#2E3BEB', '#4A4E66', '#2E3BEB') if person else ('#0B0C1E', '#F2F3F7', '#0B0C1E', '#C9CCDB', '#8C95FF')
        num = (f'<span class="{"npl" if dark else "np"}" style="animation-delay: {i}s; flex: none; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; '
               f'{UNB}; font-weight: 600; font-size: 12px; background: {"#2E3BEB" if not person else "#0B0C1E"}; color: {"#F2F3F7" if not person else "#C8F04A"}">{i + 1}</span>')
        who = (f'<span class="mono" style="padding: 3px 7px; border-radius: 999px; background: {"#E3E6FD" if person else "transparent"}; border: 1px solid {"#E3E6FD" if person else "#2A2D47"}; font-size: 9.5px; letter-spacing: .1em; color: {"#2E3BEB" if person else "#A9ADC2"}">'
               f'{"PERSONA" if person else "SISTEMA"}</span>')
        cards += (f'<div class="rise d{min(i + 2, 6)}" style="position: relative; z-index: 1; background: {bg}; color: {fg}; border: 1px solid {bd}; border-radius: 16px; padding: 14px; {SHD + ';' if dark else SH + ';'} display: flex; flex-direction: column; gap: 8px">'
                  f'<div style="display: flex; justify-content: space-between; align-items: center">{num}{who}</div>'
                  f'<div class="mono" style="font-size: 10px; letter-spacing: .1em; color: {tg}; margin-top: 2px">{tag}</div>'
                  f'<b style="font-size: 15px; line-height: 1.25">{h}</b>'
                  f'<span style="font-size: 12.5px; line-height: 1.5; color: {dim}">{p}</span></div>')
    line = '#2A2D47' if dark else '#DADCE6'
    dot = '#C8F04A' if dark else '#2E3BEB'
    return (f'<div style="position: relative">'
            f'<div aria-hidden="true" style="position: absolute; left: 30px; right: 30px; top: 29px; height: 2px; background: {line}"><span class="sig" style="background: {dot}"></span></div>'
            f'<div style="display: grid; grid-template-columns: repeat({len(nodes)}, minmax(0, 1fr)); gap: 10px">{cards}</div></div>')


moto = [('RECEPCIÓN · ERP', 'Entra la moto', 'Se registra la devolución y la moto pasa a «en taller».', False),
        ('TALLER · PARTE DE TRABAJO', 'Se abre el parte', 'El mecánico tiene en el parte qué revisar y qué cambiar, y lo cierra al terminar.', True),
        ('COMPRAS · PROVEEDORES', 'Se piden los materiales', 'Lo que el parte necesita sale como pedido al proveedor que corresponde.', False),
        ('RESERVAS · DISPONIBILIDAD', 'Vuelve a estar disponible', 'Al cerrar el parte, la moto vuelve al calendario con sus tarifas.', False),
        ('BOT · WHATSAPP', 'El bot la ofrece', 'El asistente la ofrece a quien pregunta, con precio y fechas reales, y cierra la reserva.', False)]
watch = [('Figures', 'Detecta', 'una moto que se alquila menos que el resto de la flota.', False),
         ('Radar · Listener', 'Busca la causa', 'en las métricas: ocupación, precio frente al mercado, temporada, lo que dicen los clientes.', False),
         ('Captain', 'Propone una oferta', 'con su hipótesis, su plazo y cómo se va a medir.', False),
         ('El dueño', 'La aprueba', 'Precio y publicación son límites duros: decide una persona.', True),
         ('Quill · Hook · Figures', 'La lanza y la mide', 'Si funciona, se queda. Si no, se descarta y se prueba otra.', False)]
watch_html = ''.join(
    f'<div style="background: {"#F2F3F7" if person else "rgba(11,12,30,.28)"}; color: {"#0B0C1E" if person else "#F2F3F7"}; border-radius: 14px; padding: 12px; display: flex; flex-direction: column; gap: 5px">'
    f'<span class="mono" style="font-size: 9.5px; letter-spacing: .1em; color: {"#2E3BEB" if person else "#E3E6FD"}">{a.upper()}</span>'
    f'<b style="font-size: 14px">{h}</b><span style="font-size: 12px; line-height: 1.45; color: {"#4A4E66" if person else "#E3E6FD"}">{p}</span></div>'
    for a, h, p, person in watch)
pages.append(('DCaseMoto', 'night', 'Caso: alquiler de motos', '06 — CASO DE USO · ALQUILER DE MOTOS', f"""
<div style="display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, .8fr); gap: 40px; align-items: end; margin-top: 22px">
<div style="display: flex; flex-direction: column; gap: 12px">
<div class="eb rise" style="color: #8C95FF">06 — CASO DE USO · ALQUILER DE MOTOS</div>
<h2 class="h2 rise d1">De la devolución <span>al siguiente alquiler.</span></h2>
</div>
<p class="p rise d1" style="color: #C9CCDB; font-size: 14.5px">Toda la flota vive en el ERP. Cada moto que vuelve sigue el mismo circuito, y nadie pasa datos de un sitio a otro: la única tarea de una persona es el trabajo de taller.</p>
</div>
<div style="margin-top: 22px">{flow(moto, True)}</div>
<div class="mono rise d6" style="font-size: 10.5px; letter-spacing: .1em; color: #A9ADC2; margin-top: 10px">↻ CUANDO LA MOTO VUELVE DEL SIGUIENTE ALQUILER, EL CIRCUITO EMPIEZA OTRA VEZ</div>
<div class="rise d6" style="margin: 16px 0 16px; background: #2E3BEB; border-radius: 18px; padding: 16px; display: flex; flex-direction: column; gap: 12px">
<div style="display: flex; justify-content: space-between; align-items: baseline; gap: 20px">
<div style="{UNB}; font-weight: 600; font-size: 17px; letter-spacing: -.03em">Y si una moto no se alquila lo suficiente…</div>
<span class="mono" style="font-size: 10px; letter-spacing: .12em; color: #E3E6FD">AGENTS AS A SERVICE · VIGILA LA FLOTA</span>
</div>
<div style="display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 8px">{watch_html}</div>
</div>
"""))

# 08 — Caso: promoción inmobiliaria
obra = [('OBRA · PARTE DE TRABAJO', 'El jefe de obra marca el hito', 'Desde la obra, su parte registra el inicio de obra o el hito que toque.', True),
        ('FINANZAS · FACTURAS', 'Se emiten las facturas', 'El ERP factura a cada comprador lo que marca su contrato para ese hito.', False),
        ('WHATSAPP Y EMAIL', 'Se envían solas', 'Cada comprador recibe su factura por WhatsApp y por email.', False),
        ('PORTAL DEL COMPRADOR', 'Le espera en su portal', 'El aviso le lleva a su portal, donde ve sus facturas, sus pagos y el avance de la obra.', False),
        ('COBROS · RECORDATORIOS', 'Recuerda el pago', 'Si el pago no llega, salen recordatorios automáticos hasta que queda cobrado y registrado.', False)]
sys_list = ['Las facturas de cada comprador', 'El envío por WhatsApp y por email', 'El aviso de que está en su portal', 'Los recordatorios de pago', 'El registro del cobro']
pages.append(('DCaseObra', 'chalk', 'Caso: promoción inmobiliaria', '07 — CASO DE USO · PROMOCIÓN INMOBILIARIA', f"""
<div style="display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, .8fr); gap: 40px; align-items: end; margin-top: 22px">
<div style="display: flex; flex-direction: column; gap: 12px">
<div class="eb rise" style="color: #4A4E66">07 — CASO DE USO · PROMOCIÓN INMOBILIARIA</div>
<h2 class="h2 rise d1">Un parte de obra <span>activa los cobros.</span></h2>
</div>
<p class="p rise d1" style="color: #4A4E66; font-size: 14.5px">En una promoción, los compradores pagan por hitos de obra. El jefe de obra registra el avance y el ERP hace el resto: factura, avisa y recuerda los pagos.</p>
</div>
<div style="margin-top: 22px">{flow(obra, False)}</div>
<div style="display: grid; grid-template-columns: minmax(0, .85fr) minmax(0, 1fr) minmax(0, 1fr); gap: 12px; margin: 18px 0 16px; flex: 1; min-height: 0">
<div class="rise d5" style="background: #FFFFFF; border: 1px solid #2E3BEB; border-radius: 18px; padding: 18px; box-shadow: 0 1px 2px rgba(11,12,30,.08), 0 16px 32px -14px rgba(11,12,30,.32); display: flex; flex-direction: column; gap: 8px">
<span class="mono" style="font-size: 10.5px; letter-spacing: .12em; color: #2E3BEB">LO QUE HACE UNA PERSONA</span>
<div style="{UNB}; font-weight: 600; font-size: 24px; letter-spacing: -.04em; line-height: 1.1">Un parte de obra.</div>
<span style="font-size: 13px; line-height: 1.5; color: #4A4E66; margin-top: auto">Lo rellena el jefe de obra, desde la propia obra. Todo lo demás sale solo.</span>
</div>
<div class="rise d5" style="background: #E3E6FD; border-radius: 18px; padding: 18px; display: flex; flex-direction: column; gap: 10px">
<span class="mono" style="font-size: 10.5px; letter-spacing: .12em; color: #2E3BEB">EJEMPLO DE AVISO · WHATSAPP</span>
<div style="align-self: flex-start; max-width: 92%; background: #FFFFFF; border-radius: 4px 14px 14px 14px; padding: 10px 12px; font-size: 13px; line-height: 1.5; color: #2B2E45; box-shadow: 0 1px 0 #DADCE6">Hola. Ya tienes en tu portal la factura del hito «Inicio de obra» de tu vivienda, junto con tu calendario de pagos.<div class="mono" style="margin-top: 6px; font-size: 10px; color: #4A4E66">FACTURA.PDF · VER EN EL PORTAL ›</div></div>
<div style="align-self: flex-start; max-width: 92%; background: #FFFFFF; border-radius: 4px 14px 14px 14px; padding: 10px 12px; font-size: 13px; line-height: 1.5; color: #2B2E45; box-shadow: 0 1px 0 #DADCE6">Recordatorio: el pago de este hito vence en 5 días.</div>
<span style="margin-top: auto; font-size: 11.5px; color: #4A4E66">Texto de ejemplo. El mismo aviso llega por email.</span>
</div>
<div class="rise d6" style="background: #0B0C1E; color: #F2F3F7; border-radius: 18px; padding: 18px; display: flex; flex-direction: column; gap: 10px">
<span class="mono" style="font-size: 10.5px; letter-spacing: .12em; color: #C8F04A">LO QUE HACE EL SISTEMA, SOLO</span>
<div style="display: flex; flex-direction: column; gap: 9px">{''.join(ok(x, '#2E3BEB', '#F2F3F7') for x in sys_list)}</div>
</div>
</div>
"""))

# 09 — Estudio
people = [('PERSONA · CONSTRUIR', 'Javier', 'Ingeniería y arquitectura', 'Diseña los sistemas y firma lo que sale.', False, 'FIRMA · SISTEMAS Y ENTREGAS'),
          ('IA · DIRIGE EL ESTUDIO', 'CEO IA', 'Reparte cada encargo', 'Recibe cada encargo, lo reparte entre los diecisiete departamentos y revisa lo que entregan.', True, 'RESPONDEN ANTE ÉL · 17 DEPARTAMENTOS'),
          ('PERSONA · DISEÑO', 'Andrea', 'Diseño y contenido', 'Lleva la marca, el contenido y el diseño visual, y aprueba las interfaces.', False, 'APRUEBA · MARCA E INTERFACES')]
people_html = ''.join(
    f'<article class="rise d{i + 2}" style="background: {"#1A1C33" if ai else "#F2F3F7"}; color: {"#F2F3F7" if ai else "#0B0C1E"}; border: 1px solid {"rgba(140,149,255,.34)" if ai else "#F2F3F7"}; {"box-shadow: inset 0 1px 0 rgba(242,243,247,.07), 0 18px 36px -18px rgba(0,0,0,.8)" if ai else ""}; border-radius: 20px; padding: 22px; display: flex; flex-direction: column; gap: 10px">'
    f'<div style="display: flex; justify-content: space-between; align-items: center"><span class="mono" style="font-size: 10.5px; letter-spacing: .12em; color: {"#8C95FF" if ai else "#4A4E66"}">{tag}</span>'
    + (f'<span class="halo" aria-hidden="true" style="width: 10px; height: 10px; border-radius: 50%; background: #C8F04A"></span>' if ai else '') +
    f'</div><h3 style="margin: 6px 0 0; {UNB}; font-weight: 600; font-size: 26px; letter-spacing: -.045em">{n}</h3>'
    f'<div style="font-weight: 700; font-size: 14px; color: {"#E3E6FD" if ai else "#2E3BEB"}">{role}</div>'
    f'<p style="margin: 0; font-size: 14px; line-height: 1.55; color: {"#C9CCDB" if ai else "#4A4E66"}">{p}</p>'
    f'<div class="mono" style="margin-top: auto; padding-top: 12px; border-top: 1px solid {"#2A2D47" if ai else "#DADCE6"}; font-size: 10.5px; letter-spacing: .1em; color: {"#A9ADC2" if ai else "#4A4E66"}">{foot}</div></article>'
    for i, (tag, n, role, p, ai, foot) in enumerate(people))
pages.append(('DStudio', 'night', 'El estudio', '08 — EL ESTUDIO', f"""
<div style="display: flex; flex-direction: column; gap: 12px; margin-top: 26px">
<div class="eb rise" style="color: #8C95FF">08 — EL ESTUDIO</div>
<h2 class="h2 rise d1">Un estudio de dos personas <span>con un equipo de IA detrás.</span></h2>
</div>
<div style="display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; margin-top: 26px; flex: 1; min-height: 0">{people_html}</div>
<div style="display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1.25fr); gap: 14px; margin: 14px 0 18px">
<div class="rise d4" style="background: #1A1C33; border: 1px solid rgba(140,149,255,.34); box-shadow: inset 0 1px 0 rgba(242,243,247,.07), 0 18px 36px -18px rgba(0,0,0,.8); border-radius: 20px; padding: 20px; display: flex; flex-direction: column; gap: 10px">
<div style="{UNB}; font-weight: 600; font-size: 48px; letter-spacing: -.06em; line-height: 1">17</div>
<div style="font-size: 13.5px; line-height: 1.5; color: #C9CCDB">departamentos de IA en tres áreas: construir el software, hacer crecer la marca y controlar reglas, dinero y papeles.</div>
</div>
<div class="rise d5" style="background: #1A1C33; border: 1px solid rgba(140,149,255,.34); box-shadow: inset 0 1px 0 rgba(242,243,247,.07), 0 18px 36px -18px rgba(0,0,0,.8); border-radius: 20px; padding: 20px; display: flex; flex-direction: column; gap: 10px">
<div style="{UNB}; font-weight: 600; font-size: 48px; letter-spacing: -.06em; line-height: 1">2</div>
<div style="font-size: 13.5px; line-height: 1.5; color: #C9CCDB">personas dirigen el trabajo y dan el visto bueno a todo lo que sale del estudio.</div>
</div>
<div class="rise d6" style="background: #1A1C33; border: 1px solid rgba(140,149,255,.34); box-shadow: inset 0 1px 0 rgba(242,243,247,.07), 0 18px 36px -18px rgba(0,0,0,.8); border-radius: 20px; padding: 20px; display: flex; flex-direction: column; gap: 10px">
<span class="mono" style="align-self: flex-start; padding: 5px 10px; border-radius: 999px; border: 1px solid #2A2D47; font-size: 10.5px; letter-spacing: .12em; color: #E3E6FD">MIEMBRO DEL PROGRAMA</span>
<div style="{UNB}; font-weight: 600; font-size: 18px; letter-spacing: -.03em">Claude for Startups</div>
<p style="margin: 0; font-size: 13px; line-height: 1.55; color: #C9CCDB">Claude for Startups es el programa de Anthropic para startups que construyen con Claude. Nuestros departamentos de IA trabajan con Claude.</p>
</div>
</div>
"""))

# 08 — La marca
swatches = [('Ultramarine', '#2E3BEB', '#F2F3F7', 'La barra de construir'), ('Volt', '#C8F04A', '#0B0C1E', 'La señal en marcha'),
            ('Night', '#0B0C1E', '#F2F3F7', 'Fondo por defecto'), ('Chalk', '#F2F3F7', '#0B0C1E', 'Menú y secciones claras')]
sw_html = ''.join(
    f'<div style="background: {bg}; color: {fg}; {"border: 1px solid #A9ADC2; " if name == "Chalk" else ""}border-radius: 14px; padding: 12px; display: flex; flex-direction: column; justify-content: space-between; min-height: 92px">'
    f'<b style="{UNB}; font-weight: 500; font-size: 14px; letter-spacing: -.02em">{name}</b><span class="mono" style="font-size: 10.5px; line-height: 1.5">{bg}<br>{job}</span></div>'
    for name, bg, fg, job in swatches)
pages.append(('DBrand', 'chalk', 'La marca', '09 — LA MARCA', f"""
<div style="display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 40px; align-items: end; margin-top: 24px">
<div style="display: flex; flex-direction: column; gap: 12px">
<div class="eb rise" style="color: #4A4E66">09 — LA MARCA</div>
<h2 class="h2 rise d1">Dos líneas, <span>un punto.</span></h2>
</div>
<p class="p rise d1" style="color: #4A4E66; font-size: 14.5px">La x siempre fue el centro del nombre. Ahora es el centro de todo: dos barras, construir y marca, que se cruzan en un punto. Vive dentro del nombre y también funciona sola como símbolo.</p>
</div>
<div style="display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1.1fr); gap: 20px; margin-top: 20px; flex: 1; min-height: 0; margin-bottom: 16px">
<div style="display: grid; grid-template-columns: 1fr 1fr; grid-template-rows: 1.5fr 1fr; gap: 10px">
<div class="rise d2" style="grid-column: 1 / 3; background: #0B0C1E; border-radius: 18px; display: flex; align-items: center; justify-content: center; gap: 36px; position: relative">
{xmark(150, '#F2F3F7', cls='xin', label='La X sobre Night')}
<span class="mono" style="position: absolute; left: 16px; bottom: 12px; font-size: 10px; letter-spacing: .1em; color: #A9ADC2">SOBRE NIGHT · PUNTO CHALK</span>
</div>
<div class="rise d3" style="background: #FFFFFF; border: 1px solid #C9CCDB; box-shadow: 0 1px 2px rgba(11,12,30,.08), 0 16px 32px -14px rgba(11,12,30,.32); border-radius: 18px; display: flex; align-items: center; justify-content: center; position: relative">{wordmark(34, '#0B0C1E')}<span class="mono" style="position: absolute; left: 14px; bottom: 10px; font-size: 10px; letter-spacing: .1em; color: #4A4E66">LOGOTIPO</span></div>
<div class="rise d4" style="background: #2E3BEB; border-radius: 18px; display: flex; align-items: center; justify-content: center; position: relative">{xmark(70, '#0B0C1E', build='#F2F3F7', label='La X sobre Ultramarine')}<span class="mono" style="position: absolute; left: 14px; bottom: 10px; font-size: 10px; letter-spacing: .1em; color: #E3E6FD">SOBRE ULTRAMARINE</span></div>
</div>
<div style="display: flex; flex-direction: column; gap: 14px">
<div class="rise d3" style="display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px">{sw_html}</div>
<div class="rise d4" style="background: #FFFFFF; border: 1px solid #C9CCDB; box-shadow: 0 1px 2px rgba(11,12,30,.08), 0 16px 32px -14px rgba(11,12,30,.32); border-radius: 16px; padding: 14px 16px; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px">
<div><div style="{UNB}; font-weight: 600; font-size: 24px; letter-spacing: -.04em">Aa</div><b style="font-size: 13px">Unbounded</b><div style="font-size: 11.5px; color: #4A4E66">Titulares · 600 y 300</div></div>
<div><div style="font-family: Manrope, sans-serif; font-weight: 700; font-size: 24px">Aa</div><b style="font-size: 13px">Manrope</b><div style="font-size: 11.5px; color: #4A4E66">Texto e interfaz</div></div>
<div><div class="mono" style="font-weight: 500; font-size: 24px">Aa</div><b style="font-size: 13px">IBM Plex Mono</b><div style="font-size: 11.5px; color: #4A4E66">Datos y etiquetas</div></div>
</div>
<div class="rise d5" style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; flex: 1">
<div style="background: #0B0C1E; color: #F2F3F7; border-radius: 16px; padding: 14px 16px; display: flex; flex-direction: column; gap: 6px"><span class="mono" style="font-size: 10px; letter-spacing: .12em; color: #C8F04A">MOVIMIENTO</span><span style="font-size: 13px; line-height: 1.5; color: #C9CCDB">Lo que se mueve es trabajo en marcha. Entradas suaves de 200 a 700 ms; nada se mueve por adornar.</span><div style="margin-top: auto; position: relative; height: 2px; background: #23253D"><span class="sig" style="background: #C8F04A"></span></div><span class="mono" style="font-size: 10.5px; line-height: 1.6; color: #A9ADC2">cubic-bezier(.2, .8, .2, 1)<br>200 · 450 · 700 ms</span></div>
<div style="background: #FFFFFF; border: 1px solid #C9CCDB; box-shadow: 0 1px 2px rgba(11,12,30,.08), 0 16px 32px -14px rgba(11,12,30,.32); border-radius: 16px; padding: 14px 16px; display: flex; flex-direction: column; gap: 6px"><span class="mono" style="font-size: 10px; letter-spacing: .12em; color: #2E3BEB">CÓMO HABLAMOS</span><span style="font-size: 13px; line-height: 1.5; color: #4A4E66">Concreto y en corto. Decimos qué hace el software y quién lo firma. Nunca inventamos pruebas ni cifras.</span><div style="margin-top: auto; display: flex; flex-direction: column; gap: 6px; font-size: 12px; line-height: 1.45"><span style="color: #2B2E45"><b style="color: #2E3BEB">Sí:</b> «Contesta, cualifica y agenda, y pasa a una persona.»</span><span style="color: #4A4E66"><b>No:</b> «Revoluciona tu negocio con el poder de la IA.»</span></div></div>
</div>
</div>
</div>
"""))

# 09 — Contacto
pages.append(('DContact', 'ultra', 'Contacto', '09 — HABLEMOS', f"""
<div style="flex: 1; display: grid; grid-template-columns: minmax(0, 1fr) 300px; gap: 40px; align-items: center">
<div style="display: flex; flex-direction: column; gap: 22px">
<div class="eb rise" style="color: #E3E6FD">09 — HABLEMOS</div>
<h2 class="rise d1" style="margin: 0; {UNB}; font-weight: 600; font-size: 52px; line-height: 1.04; letter-spacing: -.05em">¿Qué trabajo le quita <span style="font-weight: 300; display: block">más horas a tu equipo?</span></h2>
<p class="p rise d2" style="max-width: 52ch; font-size: 17px; color: #E3E6FD">Cuéntanos qué hace tu equipo a mano hoy. Te decimos qué parte puede hacer el software y cuánto costaría construirlo.</p>
<div class="rise d3" style="display: flex; flex-wrap: wrap; gap: 10px; margin-top: 6px">
<span style="min-height: 52px; padding: 0 24px; border-radius: 999px; background: #0B0C1E; color: #C8F04A; display: inline-flex; align-items: center; font-weight: 700; font-size: 16px">hello@axisworks.studio</span>
<span style="min-height: 52px; padding: 0 24px; border-radius: 999px; border: 1.5px solid #F2F3F7; display: inline-flex; align-items: center; font-weight: 700; font-size: 16px">axisworks.studio</span>
</div>
</div>
<div style="display: flex; justify-content: center">{xmark(260, '#0B0C1E', build='#F2F3F7', cls='xin', label='La X sobre Ultramarine')}</div>
</div>
<div class="rise d4" style="display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px; margin-bottom: 18px">
<div style="border-top: 1px solid rgba(242,243,247,.35); padding-top: 12px"><b style="font-size: 15px">Javier</b><div style="font-size: 13px; color: #E3E6FD; margin-top: 3px">Ingeniería y arquitectura</div></div>
<div style="border-top: 1px solid rgba(242,243,247,.35); padding-top: 12px"><b style="font-size: 15px">Andrea</b><div style="font-size: 13px; color: #E3E6FD; margin-top: 3px">Diseño y contenido</div></div>
<div style="border-top: 1px solid rgba(242,243,247,.35); padding-top: 12px"><b style="font-size: 15px">Claude for Startups</b><div style="font-size: 13px; color: #E3E6FD; margin-top: 3px">Miembro del programa de Anthropic</div></div>
</div>
"""))

pages = [pg for pg in pages if pg[0] != 'DBrand']
assert len(pages) == TOTAL
for n, (name, theme, title, section, body) in enumerate(pages, 1):
    with open(os.path.join(OUT, name + '.dc.html'), 'w') as f:
        f.write(page(n, theme, title, body, section))
print('\n'.join(p[0] for p in pages))
