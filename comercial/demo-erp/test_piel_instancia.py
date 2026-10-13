# Prueba de build.py: piel_instancia(), comprueba_piel() y logos_instancia() (F14, 11-oct-2026): python test_piel_instancia.py
# Mira que (1) una instancia con `piel` aprobada lleva UN aplicador con solo tríos de enteros y la lista cerrada de tokens, y una sin piel
# no lleva ninguno (axisworks-demo y Lawang no cambian), (2) una propuesta sin aprobar o una piel desconocida PARA el build, (3) el build para
# si el paquete lleva un segundo aplicador, uno fuera de la ficha (instancia.js), otro setProperty('--tema-…') suelto, el init del arnés (addInitScript), una piel por la URL
# (`skin=`, get('skin')) o los presets enteros, (4) con `icono` el
# logo y el favicon salen del icono del cliente con el lienzo de siempre, sin `icono` los neutros de AxisWorks, y un icono fuera de
# erp/tema/marcas/ PARA, (5) instancia() las llama en su sitio. NO ejecuta build.instancia(): no escribe nada en erp/despliegues/.
import io, json, os, re, sys, tempfile
AQUI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, AQUI)
import build

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace', line_buffering=True)
fallos, casos = [], 0
PRESETS = os.path.join(build.AGENCIA, 'erp', 'tema', 'presets.json')
if not os.path.isfile(PRESETS):
    print('NO SE HA PODIDO MIRAR: falta ' + PRESETS + ' (¿AXW_AGENCIA_RAIZ?)')
    sys.exit(1)
APROBADAS = json.load(open(PRESETS, encoding='utf-8'))
PIEL = sorted(APROBADAS['presets'])[0]
PROPUESTA = sorted(APROBADAS.get('propuestas_sin_aprobar') or {'-': 0})[0]
ICONO = next((os.path.relpath(os.path.join(r, f), build.AGENCIA).replace(os.sep, '/')
              for r, _d, fs in os.walk(os.path.join(build.AGENCIA, 'erp', 'tema', 'marcas')) for f in fs if f.endswith('.png')), None)


def mira(nombre, ok):
    global casos
    casos += 1
    print(('ok   ' if ok else 'MAL  ') + nombre)
    if not ok:
        fallos.append(nombre)


def con_registro(reg, f, *a):
    """Corre f con _instancia_registro devolviendo `reg`. Devuelve ('pasa', valor) o ('para', None)."""
    viejo = build._instancia_registro
    build._instancia_registro = lambda _n: reg
    try:
        return 'pasa', f(*a)
    except SystemExit:
        return 'para', None
    finally:
        build._instancia_registro = viejo


# 1 — el aplicador
est, js = con_registro({'piel': PIEL}, build.piel_instancia, 'x')
m = re.fullmatch(r'window\.AXW_PIEL="([a-z0-9-]+)";\(function\(\)\{var s=document\.documentElement\.style,p=(\{.*\});'
                 r'for\(var k in p\)s\.setProperty\("--tema-"\+k,p\[k\]\);\}\)\(\);\n', js or '')
mira('con piel aprobada: un aplicador con la forma esperada', est == 'pasa' and bool(m) and m.group(1) == PIEL)
valores = json.loads(m.group(2)) if m else {}
mira('solo los tokens de la lista cerrada, y todos', sorted(valores) == sorted(APROBADAS['presets'][PIEL]))
mira('cada valor son tres enteros 0-255 y nada más',
     all(re.fullmatch(r'\d{1,3} \d{1,3} \d{1,3}', v) and all(0 <= int(x) <= 255 for x in v.split()) for v in valores.values()))
mira('sin piel: nada', con_registro({}, build.piel_instancia, 'x') == ('pasa', ''))
mira('piel lawang: nada (Lawang es la de por defecto)', con_registro({'piel': 'lawang'}, build.piel_instancia, 'x') == ('pasa', ''))
# 2 — lo que no se publica
mira('una propuesta sin aprobar PARA', PROPUESTA == '-' or con_registro({'piel': PROPUESTA}, build.piel_instancia, 'x')[0] == 'para')
mira('una piel desconocida PARA', con_registro({'piel': 'no-existe'}, build.piel_instancia, 'x')[0] == 'para')
mira('el registro real: axisworks-demo no lleva piel', build.piel_instancia('axisworks-demo') == '')


# 3 — lo publicado no lleva caminos de piel ajenos
def paquete(ficheros):
    d = tempfile.mkdtemp()
    for ruta, texto in ficheros.items():
        p = os.path.join(d, *ruta.split('/'))
        os.makedirs(os.path.dirname(p), exist_ok=True)
        open(p, 'w', encoding='utf-8').write(texto)
    return d


GUARD = build.FICHA_REL   # la ficha: la cargan todas las páginas, también la puerta y /crea-contrasena/
mira('paquete con su aplicador en la ficha: pasa',
     con_registro({'piel': PIEL}, build.comprueba_piel, paquete({GUARD: js, 'a.js': 'var a=1;'}), 'x')[0] == 'pasa')
mira('dos aplicadores: PARA', con_registro({'piel': PIEL}, build.comprueba_piel, paquete({GUARD: js, 'a.js': js}), 'x')[0] == 'para')
mira('el aplicador fuera de la ficha: PARA', con_registro({'piel': PIEL}, build.comprueba_piel, paquete({GUARD: 'var g;', 'a.js': js}), 'x')[0] == 'para')
mira('instancia sin piel con aplicador: PARA', con_registro({}, build.comprueba_piel, paquete({GUARD: js}), 'x')[0] == 'para')
mira('instancia sin piel y sin aplicador: pasa', con_registro({}, build.comprueba_piel, paquete({GUARD: 'var g;'}), 'x')[0] == 'pasa')
mira('el init del arnés (addInitScript): PARA',
     con_registro({'piel': PIEL}, build.comprueba_piel, paquete({GUARD: js, 'b.js': 'page.addInitScript(f)'}), 'x')[0] == 'para')
mira('piel por la URL (?skin=): PARA',
     con_registro({'piel': PIEL}, build.comprueba_piel, paquete({GUARD: js, 'c.html': '<a href="/home/?skin=neon">'}), 'x')[0] == 'para')
for nombre, extra in (('otro setProperty de --tema- sin la marca', {'d.js': 'document.documentElement.style.setProperty("--tema-primary","1 2 3")'}),
                      ("piel leída por get('skin')", {'e.js': "new URLSearchParams(location.search).get('skin')"}),
                      ('propuestas_sin_aprobar en el paquete', {'f.js': 'var x={propuestas_sin_aprobar:{}}'}),
                      ('presets.json copiado al paquete', {'assets/presets.json': '{}'})):
    ficheros = dict({GUARD: js}, **extra)
    mira(nombre + ': PARA', con_registro({'piel': PIEL}, build.comprueba_piel, paquete(ficheros), 'x')[0] == 'para')


# 4 — identidad
def logos(reg):
    d = tempfile.mkdtemp()
    v = build.DIST
    build.DIST = d
    try:
        return con_registro(reg, build.logos_instancia, 'x', 'Mi Marca')[0], d
    finally:
        build.DIST = v


from PIL import Image
if ICONO:
    est, d = logos({'piel': PIEL, 'icono': ICONO})
    marca = os.path.join(d, 'contracts', 'assets', 'brand')
    mira('con icono: los dos logos con el lienzo de siempre (1726×240)', est == 'pasa' and all(
        Image.open(os.path.join(marca, n)).size == (1726, 240) for n in ('axw-logo-v3.png', 'axw-logo-v3-dark.png')))
    fav = Image.open(os.path.join(d, 'favicon.png')).convert('RGB') if est == 'pasa' else None
    ico = Image.open(os.path.join(build.AGENCIA, ICONO)).convert('RGB').resize((64, 64), Image.LANCZOS)
    mira('con icono: el favicon ES el icono del cliente reducido', fav is not None and fav.size == (64, 64) and fav.tobytes() == ico.tobytes())
else:
    mira('hay un icono de cliente en erp/tema/marcas/ con el que probar', False)
est, d = logos({})
fav = Image.open(os.path.join(d, 'favicon.png')).convert('RGBA') if est == 'pasa' else None
mira('sin icono: los neutros de AxisWorks (favicon índigo de 32 px)', fav is not None and fav.size == (32, 32) and fav.getpixel((16, 2))[:3] == (79, 70, 229))
mira('icono fuera de erp/tema/marcas/: PARA', logos({'icono': 'erp/instancias.json'})[0] == 'para')
mira('icono que sube de carpeta: PARA', logos({'icono': 'erp/tema/marcas/../pieles.json'})[0] == 'para')

# 4b — menú oscuro (registro `menu: "oscuro"`)
mira('sin `menu`: nada', con_registro({'piel': PIEL}, build.menu_oscuro_css, 'x') == ('pasa', ''))
mira('menu oscuro sin piel: PARA', con_registro({'menu': 'oscuro'}, build.menu_oscuro_css, 'x')[0] == 'para')
est, css = con_registro({'piel': PIEL, 'menu': 'oscuro'}, build.menu_oscuro_css, 'x')
m = re.fullmatch(r'\n(.+?)\{(.+)\}\n', css or '', re.S)
mira('menu oscuro: una regla con el enganche estable (data-path="login", data-lw="k-avisos")',
     est == 'pasa' and bool(m) and m.group(1) == build.MENU_SELECTOR and 'data-path="login"' in m.group(1) and 'data-lw="k-avisos"' in m.group(1))
decl = dict(x.split(':', 1) for x in m.group(2).split(';')) if m else {}
mira('solo variables --tema- con tres enteros 0-255 (nada de url() ni texto)',
     bool(decl) and all(k.startswith('--tema-') and re.fullmatch(r'\d{1,3} \d{1,3} \d{1,3}', v) and all(int(n) <= 255 for n in v.split())
                         for k, v in decl.items()))
mira('sin setProperty ni "skin": comprueba_piel no la confunde con un aplicador',
     con_registro({'piel': PIEL, 'menu': 'oscuro'}, build.comprueba_piel, paquete({GUARD: js, 'assets/shell.css': 'a{}' + (css or '')}), 'x')[0] == 'pasa')
D = build._deriva()
rgb = {k[len('--tema-'):]: tuple(int(n) for n in v.split()) for k, v in decl.items()}
mira('texto del menú ≥ 4,5:1 sobre sus tres fondos', bool(rgb) and all(D.contraste(rgb[t], rgb[f]) >= 4.5
     for t in ('on-surface', 'on-surface-variant', 'outline') for f in ('surface-container-low', 'surface-container', 'surface-container-high')))
mira('el acento del menú ≥ 4,5:1 sobre la tinta, y la tinta sobre él', bool(rgb) and D.contraste(rgb['deep-lagoon'], rgb['surface-container-low']) >= 4.5
     and D.contraste(rgb['on-primary'], rgb['primary-container']) >= 4.5)
mira('el registro real: axisworks-demo sin menú oscuro', build.menu_oscuro_css('axisworks-demo') == '')

# 4b2 — menú lateral (registro `menu: "lateral"`, bbm-p33): solo el <aside>, la barra superior clara como en el diseño
BBM = 'bbm' if 'bbm' in APROBADAS['presets'] else PIEL
est, css = con_registro({'piel': BBM, 'menu': 'lateral'}, build.menu_oscuro_css, 'x')
reglas = re.findall(r'\n?(.+?)\{(.+?)\}\n', css or '')
mira('menu lateral: el aside y nada de la barra superior', est == 'pasa' and len(reglas) == 2
     and reglas[0][0] == build.MENU_LATERAL and 'k-avisos' not in css and reglas[1][0] == build.MENU_LATERAL + ' .bg-deep-lagoon')
decl = dict(x.split(':', 1) for x in reglas[0][1].split(';')) if reglas else {}
rgb = {k[len('--tema-'):]: tuple(int(n) for n in v.split()) for k, v in decl.items()}
p_bbm = {k: tuple(v) for k, v in APROBADAS['presets'][BBM].items()}
mira('menu lateral: solo --tema- con tríos y todo ≥ 4,5:1 (texto, marca, pastilla)', bool(rgb)
     and all(re.fullmatch(r'\d{1,3} \d{1,3} \d{1,3}', v) for v in decl.values())
     and all(D.contraste(rgb[t], rgb[f]) >= 4.5 for t in ('on-surface', 'on-surface-variant', 'outline', 'deep-lagoon', 'primary')
             for f in ('surface-container-low',)) and D.contraste(rgb['on-primary'], rgb['primary-container']) >= 4.5)
mira('menu lateral con el estándar AxisWorks: pastilla del acento con el fondo encima',
     BBM != 'bbm' or (rgb['primary-container'] == p_bbm['accent-gold'] and rgb['on-primary'] == p_bbm['background']))
mira('menu de valor desconocido: nada', con_registro({'piel': BBM, 'menu': 'raro'}, build.menu_oscuro_css, 'x') == ('pasa', ''))


# 4b3 — sistema de la instancia (registro `sistema`): fuentes autoalojadas y forma, y los colores a mano de la cáscara v4
def en_dist(ficheros, reg, f, *a):
    d = paquete(ficheros)
    v = build.DIST
    build.DIST = d
    try:
        r = con_registro(reg, f, *a)
    finally:
        build.DIST = v
    return r, d

mira('sin `sistema`: nada', en_dist({}, {'piel': BBM}, build.sistema_instancia, 'x')[0] == ('pasa', 0))
mira('sistema desconocido: PARA', en_dist({}, {'piel': BBM, 'sistema': 'no-existe'}, build.sistema_instancia, 'x')[0][0] == 'para')
mira('sistema sin piel: PARA', en_dist({}, {'sistema': 'axisworks'}, build.sistema_instancia, 'x')[0][0] == 'para')
# cadenas REALES de Lawang tal como llegan tras tipografias_libres (Jost ya en lugar de Neue Kabel; revisor 13-oct)
GJ = 'https://fonts.googleapis.com/css2?family=Jost:wght@400;500;600;700&display=swap'
GM = 'https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap'
# el <head> REAL de intranet/facturas/documento.js de Lawang (p37 13-oct: el papel pedía Jost a Google y Manrope no llegaba)
DOC = ("h = '<link rel=\"preconnect\" href=\"https://fonts.googleapis.com\">' +\n"
       "    '<link href=\"https://fonts.googleapis.com/css2?family=Jost:wght@300;400;500;600&family=Cormorant+Garamond:wght@400;500;600&display=swap\" rel=\"stylesheet\">' +\n"
       "    '<link rel=\"stylesheet\" href=\"' + base + '/assets/brand.css\">';")
PAQ_SIS = {'assets/fonts/fonts.css': "@import url('https://fonts.googleapis.com/css2?family=Jost');",
                       'a/index.html': '<link href="https://fonts.googleapis.com/css2?family=Jost:wght@400&display=swap" rel="stylesheet"><p style="font-family:Jost">',
                       'assets/shell.css': "@import url('%s');.a{font-family:Jost,system-ui,sans-serif}" % GJ,
                       'contracts/assets/piel.js': 'a="%s";b="%s"' % (GJ, GM),
                       'assets/editores.js': 'l.href="%s";x="Cormorant Garamond"' % GJ,
                       'clasico/facturas/documento.js': DOC}
(est, n), d = en_dist(PAQ_SIS, {'piel': BBM, 'sistema': 'axisworks'}, build.sistema_instancia, 'x')
lee = lambda r: open(os.path.join(d, *r.split('/')), encoding='utf-8').read()
mira('sistema: fonts.css con @font-face propias (nada a Google) y la forma', est == 'pasa' and 'googleapis' not in lee('assets/fonts/fonts.css')
     and "src:url(/assets/fonts/x/manrope-400.woff2)" in lee('assets/fonts/fonts.css') and 'box-shadow:none' in lee('assets/fonts/fonts.css'))
mira('sistema: la página carga la hoja propia y usa Manrope; shell.css, piel.js y editores.js ya no piden texto a Google',
     est == 'pasa' and '<link rel="stylesheet" href="/assets/fonts/fonts.css">' in lee('a/index.html') and 'Manrope' in lee('a/index.html')
     and "@import url('/assets/fonts/fonts.css')" in lee('assets/shell.css') and 'Manrope' in lee('assets/shell.css')
     and 'family=Jost' not in lee('contracts/assets/piel.js') and 'family=Manrope' not in lee('contracts/assets/piel.js')
     and 'googleapis' not in lee('assets/editores.js') and 'Unbounded' in lee('assets/editores.js'))
mira('sistema: los iconos (Material Symbols) siguen igual', est == 'pasa' and GM in lee('contracts/assets/piel.js'))
mira('sistema: el documento imprimible carga la hoja propia (misma base que brand.css) y nada de Google',
     est == 'pasa' and '<link rel="stylesheet" href="\' + base + \'/assets/fonts/fonts.css">' in lee('clasico/facturas/documento.js')
     and 'googleapis' not in lee('clasico/facturas/documento.js') and "/assets/brand.css" in lee('clasico/facturas/documento.js'))
mira('sistema: si el <head> del documento cambia, PARA (no se publica pidiendo a Google)',
     en_dist(dict(PAQ_SIS, **{'clasico/facturas/documento.js': DOC.replace('family=Jost', 'family=Lato')}),
             {'piel': BBM, 'sistema': 'axisworks'}, build.sistema_instancia, 'x')[0][0] == 'para')
mira('sistema: las woff2 están en el paquete', est == 'pasa' and os.path.isfile(os.path.join(d, 'assets', 'fonts', 'x', 'unbounded-600.woff2')))

NAV = 'a.style.cssText=on?"background:#485B37;color:#fff":"color:#44483f"'
MASC = ''.join(lit for rel_f, lit, _t, _f in build.V4_FIJOS if rel_f == 'assets/mascota.js')
d = paquete({'assets/nav.js': NAV, 'assets/mascota.js': MASC})
est, n = con_registro({'piel': BBM}, build.piel_v4_fijos, d, 'x')
fuera = [lit for rel_f, lit, _t, _f in build.V4_FIJOS if lit in lee(rel_f)]
mira('colores a mano de la cáscara v4: todos los literales de Lawang reemplazados', est == 'pasa' and n == len(build.V4_FIJOS) and not fuera)
mira('la pestaña activa ≥ 4,5:1', est == 'pasa' and (lambda m: m and D.contraste(D.rgb(m.group(1)), D.rgb(m.group(2))) >= 4.5)(
     re.search(r'background:(#[0-9A-F]{6});color:(#[0-9A-F]{6})', lee('assets/nav.js'))))
mira('un literal que ya no está PARA (¿cambió Lawang?)',
     con_registro({'piel': BBM}, build.piel_v4_fijos, paquete({'assets/nav.js': 'nada', 'assets/mascota.js': MASC}), 'x')[0] == 'para')
mira('sin piel: los colores a mano no se tocan', con_registro({}, build.piel_v4_fijos, paquete({'assets/nav.js': NAV}), 'x') == ('pasa', 0))

# 4c — favicon con versión (la CDN de Hostinger lo cachea 7 días)
d = paquete({'index.html': '<link rel="icon" href="/favicon.png"><p>', 'a/index.html': '<p>sin icono</p>'})
open(os.path.join(d, 'favicon.png'), 'wb').write(b'\x89PNG prueba')
n = build.favicon_versionado(d)
pag = open(os.path.join(d, 'index.html'), encoding='utf-8').read()
mira('favicon: el enlace lleva ?v= con la huella del fichero', n == 1 and re.search(r'href="/favicon\.png\?v=[0-9a-f]{8}"', pag) is not None
     and 'href="/favicon.png"' not in pag)
mira('favicon: sin fichero no toca nada', build.favicon_versionado(paquete({'index.html': 'href="/favicon.png"'})) == 0)

# 4d — suite clásica (puerta / y /crea-contrasena/): html:root gana a la :root propia de cada página (Calidad 12-oct: salía verde)
mira('suite clásica sin piel: nada', con_registro({}, build.paleta_clasica_css, 'x') == ('pasa', ''))
est, css = con_registro({'piel': PIEL}, build.paleta_clasica_css, 'x')
mira('suite clásica con piel: una regla html:root con las variables de la puerta y de crea-contraseña', est == 'pasa'
     and re.fullmatch(r'\nhtml:root\{(--[a-z0-9-]+:#[0-9A-F]{6};?)+\}\n', css or '') is not None
     and all(v + ':' in css for v in ('--dl', '--tg', '--sc', '--ss', '--linen', '--stone', '--muted', '--paper')))
mira('el registro real: axisworks-demo sin paleta clásica', build.paleta_clasica_css('axisworks-demo') == '')
viejo_preset = build._piel_preset
build._piel_preset = lambda _n: dict(viejo_preset('bbm'), **{'deep-lagoon': [200, 200, 200]})   # blanco sobre --dl ilegible
mira('suite clásica: PARA si el blanco sobre --dl baja de 4,5:1', con_registro({'piel': 'bbm'}, build.paleta_clasica_css, 'bbm')[0] == 'para')
build._piel_preset = viejo_preset
build._piel_preset = lambda _n: {k: v for k, v in viejo_preset('bbm').items() if k != 'warm-border'}
mira('suite clásica: PARA con mensaje si la piel no trae un token que pinta', con_registro({'piel': 'bbm'}, build.paleta_clasica_css, 'bbm')[0] == 'para')
build._piel_preset = lambda _n: dict(viejo_preset('bbm'), **{'secondary-fixed-dim': [240, 240, 240]})
mira('suite clásica: PARA si el botón desactivado queda peor que en Lawang', con_registro({'piel': 'bbm'}, build.paleta_clasica_css, 'bbm')[0] == 'para')
build._piel_preset = viejo_preset
PUERTA = '<style>\n:root{\n--dl:#104C4F}\n.a{box-shadow:0 0 0 3px rgba(72,91,55,.15)}.b{background:#F5F0E6}.c{color:#CBD6B6}' \
         '.d{box-shadow:0 0 0 3px rgba(143,155,122,.22)}</style>'
CREA = '<style>:root{--dl:#104c4f}.card{}</style>'
MASC = 'x.style="background:#104C4F;box-shadow:0 1px rgba(16,76,79,.7)";h="#0c3c3e";l="#316669"'
NAV = 'var CORTINA_V="20260926a";var MASCOTA_V="20260930b";s.src=ROOT+"assets/mascota.js?v="+MASCOTA_V;'
HOJA = '@media (max-width:9px){.x{}}.lw-btn.primary:hover{background:#0d5b5f;box-shadow:0 2px 4px rgba(16,76,79,.32)}'
d = d0 = paquete({'index.html': PUERTA, 'crea-contrasena/index.html': CREA, 'contracts/assets/axw.css': HOJA, 'assets/mascota.js': MASC, 'assets/nav.js': NAV})
est, n = con_registro({'piel': 'bbm'}, build.piel_suite_clasica, d, 'bbm')
hoja = open(os.path.join(d, 'contracts', 'assets', 'axw.css'), encoding='utf-8').read()
puerta = open(os.path.join(d, 'index.html'), encoding='utf-8').read()
crea = open(os.path.join(d, 'crea-contrasena', 'index.html'), encoding='utf-8').read()
mira('suite clásica: la regla va al final de axw.css, fuera de cualquier bloque', est == 'pasa' and n == 4
     and hoja.rstrip().endswith('}') and re.search(r'\}\nhtml:root\{[^}]+\}\n$', hoja) is not None)
mira('suite clásica: la regla va DESPUÉS de la :root de cada página, dentro de su <style>', est == 'pasa'
     and puerta.index(':root{') < puerta.index('html:root{') < puerta.index('</style>')
     and crea.index(':root{') < crea.index('html:root{') < crea.index('</style>'))
mira('suite clásica: los colores de Lawang escritos a mano ya no están', est == 'pasa'
     and not re.search(r'#0d5b5f|rgba\(16,76,79|rgba\(72,91,55|#F5F0E6|#CBD6B6|rgba\(143,155,122', hoja + puerta, re.I))
mascota = open(os.path.join(d0, 'assets', 'mascota.js'), encoding='utf-8').read() if est == 'pasa' else ''
mira('suite clásica: el marco de la mascota ya no es Deep Lagoon de Lawang', est == 'pasa'
     and not re.search(r'#104C4F|rgba\(16,76,79|#0c3c3e|#316669', mascota, re.I)
     and '#%02X%02X%02X' % tuple(APROBADAS['presets']['bbm']['deep-lagoon']) in mascota)   # el de la piel vigente, no un hex fijo
d = paquete({'index.html': PUERTA.replace('#CBD6B6', '#ABCDEF'), 'crea-contrasena/index.html': CREA, 'contracts/assets/axw.css': HOJA, 'assets/mascota.js': MASC, 'assets/nav.js': NAV})
mira('suite clásica: PARA si Lawang quita un color fijo que la piel sustituye', con_registro({'piel': 'bbm'}, build.piel_suite_clasica, d, 'bbm')[0] == 'para')
d = paquete({'index.html': PUERTA, 'crea-contrasena/index.html': CREA, 'contracts/assets/axw.css': HOJA + '@media (x){', 'assets/mascota.js': MASC, 'assets/nav.js': NAV})
mira('suite clásica: PARA si axw.css deja un bloque abierto', con_registro({'piel': 'bbm'}, build.piel_suite_clasica, d, 'bbm')[0] == 'para')
d = paquete({'index.html': PUERTA, 'crea-contrasena/index.html': CREA, 'contracts/assets/axw.css': HOJA, 'assets/mascota.js': MASC, 'assets/nav.js': NAV})
mira('suite clásica sin piel: no toca el paquete', con_registro({}, build.piel_suite_clasica, d, 'x') == ('pasa', 0)
     and open(os.path.join(d, 'index.html'), encoding='utf-8').read() == PUERTA)

# 4e — la mascota cambia de URL cuando cambia el fichero publicado (nav.js la pide con MASCOTA_V, que versiona() no ve)
import hashlib
d = paquete({'assets/mascota.js': MASC + 'final', 'assets/nav.js': NAV})
h = build.mascota_versionada(d)
nav = open(os.path.join(d, 'assets', 'nav.js'), encoding='utf-8').read()
mira('mascota: MASCOTA_V = huella de la mascota.js que queda en el paquete; CORTINA_V intacta',
     h == 'p' + hashlib.sha1((MASC + 'final').encode('utf-8')).hexdigest()[:8] and 'MASCOTA_V="%s"' % h in nav and 'CORTINA_V="20260926a"' in nav)
d = paquete({'assets/mascota.js': MASC, 'assets/nav.js': 'var x=1;'})
est, _h = con_registro({}, build.mascota_versionada, d)
mira('mascota: PARA si nav.js ya no declara MASCOTA_V una vez', est == 'para')
mira('mascota: sin nav.js ni mascota.js no hace nada', build.mascota_versionada(paquete({'index.html': 'x'})) is None)

# 4f — la puerta: selector de idioma visible con más de un idioma, correo neutro, marca centrada (verificador 12-oct sobre bbm)
PUERTA2 = ('<style>.lw-login{}</style><div class="lw-login"><div class="marca"><div class="word">X</div></div><form id="fLogin">'
           '<input type="email" id="loginEmail" autocomplete="username" placeholder="nombre@axisworks.studio" required></form><p class="pie">p</p></div>')
d = paquete({'index.html': PUERTA2})
puso = build.puerta_instancia(d, ['id', 'en'])
pg = open(os.path.join(d, 'index.html'), encoding='utf-8').read()
mira('puerta: con id+en, selector justo después del formulario con SUS idiomas', puso is True
     and pg.index('</form>') < pg.index('data-lw="login-idioma"') < pg.index('class="pie"')
     and 'data-idioma="id"' in pg and 'data-idioma="en"' in pg and 'data-idioma="es"' not in pg and 'window.lwSetIdioma' in pg)
mira('puerta: el correo de ejemplo es neutro', 'placeholder="email@example.com"' in pg and 'axisworks.studio' not in pg)
mira('puerta: la marca va centrada y el selector oculto respeta [hidden]', '.lw-login .marca .word{text-align:center}' in pg
     and '.lw-login .lw-login-idioma[hidden]{display:none}' in pg)
d = paquete({'index.html': PUERTA2})
puso = build.puerta_instancia(d, None)
pg = open(os.path.join(d, 'index.html'), encoding='utf-8').read()
mira('puerta: sin idiomas declarados no hay selector, pero sí correo neutro', puso is False and 'login-idioma"' not in pg.split('</style>')[1]
     and 'placeholder="email@example.com"' in pg)
d = paquete({'index.html': PUERTA2.replace('id="loginEmail"', 'id="otro"')})
mira('puerta: PARA si ya no hay #loginEmail', con_registro({}, build.puerta_instancia, d, ['id', 'en'])[0] == 'para')
d = paquete({'index.html': PUERTA2.replace('id="fLogin"', 'id="f2"')})
mira('puerta: PARA si ya no hay #fLogin y hay que poner el selector', con_registro({}, build.puerta_instancia, d, ['id', 'en'])[0] == 'para')
d = paquete({'index.html': PUERTA2.replace('<style>.lw-login{}</style>', '')})
mira('puerta: PARA si ya no hay un <style> con .lw-login', con_registro({}, build.puerta_instancia, d, None)[0] == 'para')

# 4g — rótulos del menú en en/id en TODAS las páginas (owner 12-oct en bbm: Taller, Entrega y Flota seguían en español)
import subprocess
viejo_dist = build.DIST
build.DIST = paquete({'contracts/assets/i18n.js': '(function(){var EN={"Hola":"Hello","Ventas":"Ya"};window.LW_EN = EN;})();\nwindow.LW_ID={"Hola":"Halo"};'})
build.menu_i18n()
i18n = open(os.path.join(build.DIST, 'contracts', 'assets', 'i18n.js'), encoding='utf-8').read()
build.DIST = viejo_dist
r = subprocess.run(['node', '-e', 'var window={};' + i18n + ';console.log(JSON.stringify([window.LW_EN.Taller,window.LW_ID.Taller,window.LW_EN.Ventas,window.LW_ID["Flota y tarifas"],window.LW_EN.Hola]))'],
                   capture_output=True, text=True, encoding='utf-8')
mira('menú: Taller/Flota entran en LW_EN y LW_ID y una clave que ya existe no se pisa',
     r.returncode == 0 and json.loads(r.stdout.strip() or 'null') == ['Workshop', 'Bengkel', 'Ya', 'Armada dan tarif', 'Hello'])
if r.returncode != 0:
    print('     node: ' + (r.stdout + r.stderr).strip()[-300:])
build.DIST = paquete({'contracts/assets/i18n.js': '(function(){})();'})
mira('menú: PARA si i18n.js ya no expone LW_EN', con_registro({}, build.menu_i18n)[0] == 'para')
build.DIST = viejo_dist

# 5 — cableado en instancia()
fuente = open(os.path.join(AQUI, 'build.py'), encoding='utf-8').read()
cuerpo = fuente[fuente.index('def instancia(nombre):'):]
cuerpo = cuerpo[:cuerpo.index('\ndef ')]
mira('instancia() añade la piel a la ficha, después de escribirla', 'piel = piel_instancia(nombre)' in cuerpo
     and cuerpo.index('escribe_instancia(') < cuerpo.index('piel = piel_instancia(nombre)') < cuerpo.index('versiona(DIST)'))
mira('el guard.js ya no lleva la piel', 'piel_instancia(nombre) + interruptores' not in cuerpo)
mira('instancia() añade el menú oscuro a assets/shell.css antes de versionar', 'menu = menu_oscuro_css(nombre)' in cuerpo
     and "os.path.join(DIST, 'assets', 'shell.css')" in cuerpo and cuerpo.index('menu = menu_oscuro_css(nombre)') < cuerpo.index('versiona(DIST)'))
mira('instancia() versiona la mascota justo antes de versiona(), cuando ya nadie toca mascota.js', 'mascota_versionada(DIST)' in cuerpo
     and cuerpo.index('tipografias_libres()') < cuerpo.index('mascota_versionada(DIST)') < cuerpo.index('\n    versiona(DIST)'))
mira('instancia() versiona el favicon justo antes de versiona()', 'favicon_versionado(DIST)' in cuerpo
     and cuerpo.index('favicon_versionado(DIST)') < cuerpo.index('\n    versiona(DIST)'))
mira('instancia() pinta la suite clásica tras crea-contraseña y ANTES de versionar (si no, la CDN sirve la hoja vieja)',
     cuerpo.index('crea_contrasena_pantalla(marca)') < cuerpo.index('piel_suite_clasica(DIST, nombre)') < cuerpo.index('\n    versiona(DIST)'))
mira('instancia() arregla la puerta tras la piel y antes de versionar', cuerpo.index('piel_suite_clasica(DIST, nombre)') < cuerpo.index('puerta_instancia(DIST, idiomas)') < cuerpo.index('\n    versiona(DIST)'))
mira('instancia() añade los rótulos del menú después de los idiomas', cuerpo.index('idiomas_instancia(idiomas') <cuerpo.index('menu_i18n()'))
mira('instancia() pone los logos de la instancia, no los neutros a secas', 'logos_instancia(nombre, marca)' in cuerpo and 'logos_neutros(' not in cuerpo)
mira('instancia() comprueba la piel antes de dar el paquete por bueno', cuerpo.index('comprueba_piel(DIST, nombre)') < cuerpo.index('comprueba_resultado(DIST)'))

# capa de módulos en el hub de entrada (12-oct-2026: 403 del panel de herramientas a funciones de módulos apagados)
def hub(html):
    d = tempfile.mkdtemp()
    v = build.DIST
    build.DIST = d
    try:
        if html is not None:
            open(os.path.join(d, 'index.html'), 'w', encoding='utf-8').write(html)
        try:
            build.capa_modulos_hub('/*capa*/window.fetch=window.fetch;')
            r = 'pasa'
        except SystemExit:
            r = 'para'
        sal = open(os.path.join(d, 'index.html'), encoding='utf-8').read() if html is not None else ''
        capa = os.path.join(d, *build.HUB_CAPA.split('/'))
        return r, sal, (open(capa, encoding='utf-8').read() if os.path.isfile(capa) else None)
    finally:
        build.DIST = v

HUB = ('<script src="https://cdn/supabase.min.js"></script><script src="/contracts/assets/instancia.js?v=1"></script>'
       '<script>const sb=window.supabase.createClient(a,b);window.LW_SB=sb;</script>')
r, sal, capa = hub(HUB)
mira('hub: la capa va en su fichero y se carga justo antes de instancia.js',
     r == 'pasa' and capa == '/*capa*/window.fetch=window.fetch;'
     and '<script src="/%s"></script><script src="/contracts/assets/instancia.js?v=1"></script>' % build.HUB_CAPA in sal)
mira('hub sin window.LW_SB = sb: PARA', hub(HUB.replace('window.LW_SB=sb;', ''))[0] == 'para')
mira('hub con dos cargas de instancia.js: PARA', hub(HUB + '<script src="/contracts/assets/instancia.js"></script>')[0] == 'para')
mira('sin hub en el paquete: nada', hub(None)[0] == 'pasa')
mira('instancia() pone el sistema tras tipografias_libres y los colores a mano tras la suite clásica, todo antes de versionar',
     cuerpo.index('tipografias_libres()') < cuerpo.index('sistema_instancia(nombre)') < cuerpo.index('\n    versiona(DIST)')
     and cuerpo.index('piel_suite_clasica(DIST, nombre)') < cuerpo.index('piel_v4_fijos(DIST, nombre)') < cuerpo.index('\n    versiona(DIST)'))
mira('instancia() pone la capa en el hub justo después de pegarla al guard', cuerpo.index('setup_para_guard())') < cuerpo.index('capa_modulos_hub(interruptores)') < cuerpo.index('\n    versiona(DIST)'))

# 4c — el ELEGIDO (filtro, pestaña, segmento) en el acento de la piel (bbm-p40 F14, 13-oct)
DATOS_DEF = 'var ON=cont.getAttribute("data-lw-on")||"bg-volcanic-ash text-x";var OFF=cont.getAttribute("data-lw-off")||"bg-surface-container-low text-y";'
CHIPS_OK = {'assets/datos.js': DATOS_DEF,
            'a/index.html': '<div data-lw-chips="tipo" data-lw-on="bg-deep-lagoon text-on-secondary" data-lw-off="bg-surface-container text-z">',
            'b/index.html': '<div class="f" data-lw-chips="estado">'}   # sin on/off: el defecto de datos.js
mira('elegido sin piel: nada', con_registro({}, build.seleccion_css, 'x', paquete(CHIPS_OK)) == ('pasa', ''))
est, css = con_registro({'piel': BBM}, build.seleccion_css, 'x', paquete(CHIPS_OK))
mira('elegido: chips por su «on» declarado y por el defecto de datos.js', est == 'pasa'
     and 'html [data-lw-chips] button.bg-deep-lagoon' in css and 'html [data-lw-chips] button.bg-volcanic-ash' in css)
mira('elegido: lista con nombre, sin el aria-pressed genérico (revisor: Chalk sobre claro en el asistente de reserva)', est == 'pasa'
     and 'html [aria-pressed="true"]{' not in css and ':not(aside' not in css and all('html ' + s in css for s in build.SELECCION_SELECTORES))
mira('elegido: la pestaña de subrayado va en raya y texto, no en bloque', est == 'pasa'
     and re.search(r'html \.fin-tab\[aria-selected="true"\]\{color:#[0-9A-F]{6};border-bottom-color:#[0-9A-F]{6}\}', css or '')
     and '.fin-tab' not in css.split('\n')[1].replace(':not(.fin-tab)', ''))
mira('elegido: las tarjetas del asistente de reserva solo cambian el borde (su fondo claro y su texto se quedan)', est == 'pasa'
     and re.search(r'html \.rp-as-moto\[aria-pressed="true"\],html \.rp-as-opcion\[aria-pressed="true"\]\{border-color:#[0-9A-F]{6}\}', css or ''))
hexes = re.findall(r'\{background:(#[0-9A-F]{6});color:(#[0-9A-F]{6})', css or '')
h2 = lambda x: tuple(int(x[i:i + 2], 16) for i in (1, 3, 5))
mira('elegido: texto ≥ 4,5:1 sobre el elegido y el elegido ≥ 3:1 contra fondo y tarjetas', bool(hexes)
     and D.contraste(h2(hexes[0][0]), h2(hexes[0][1])) >= 4.5
     and all(D.contraste(h2(hexes[0][0]), tuple(p_bbm[t])) >= 3 for t in build.SELECCION_ALREDEDOR))
mira('elegido con el estándar AxisWorks (bbm): Ultramarine con Chalk', BBM != 'bbm' or hexes[0] == ('#2E3BEB', '#F2F3F7'))
mira('elegido: sin grupos de chips en el paquete: PARA', con_registro({'piel': BBM}, build.seleccion_css, 'x', paquete({'a.js': 'x'}))[0] == 'para')
mira('elegido: un grupo sin «on» y datos.js sin defecto: PARA',
     con_registro({'piel': BBM}, build.seleccion_css, 'x', paquete({'b/index.html': '<div data-lw-chips="e">'}))[0] == 'para')
mira('elegido: el «on» de un grupo es el «off» de otro: PARA', con_registro({'piel': BBM}, build.seleccion_css, 'x', paquete(dict(CHIPS_OK, **{
    'c/index.html': '<div data-lw-chips="z" data-lw-on="bg-primary text-a" data-lw-off="bg-deep-lagoon text-b">'})))[0] == 'para')
mira('elegido: un «on» sin fondo propio: PARA', con_registro({'piel': BBM}, build.seleccion_css, 'x', paquete(dict(CHIPS_OK, **{
    'c/index.html': '<div data-lw-chips="z" data-lw-on="text-a shadow-sm" data-lw-off="bg-surface text-b">'})))[0] == 'para')
MARCA = ('<button class="px-4 bg-primary-container text-on-primary" data-chip-clave="todas">'
         '<button class="px-4 bg-surface-container-low text-x" data-chip-clave="a">')
est, css = con_registro({'piel': BBM}, build.seleccion_css, 'x', paquete(dict(CHIPS_OK, **{'c/index.html': MARCA})))
mira('elegido: los chips de marcaChip por el fondo de su PRIMER botón', est == 'pasa' and 'html [data-chip-clave].bg-primary-container' in css)
mira('elegido: un grupo de marcaChip con el mismo fondo en el 1.º y el 2.º: PARA', con_registro({'piel': BBM}, build.seleccion_css, 'x', paquete(dict(CHIPS_OK, **{
    'c/index.html': MARCA.replace('bg-surface-container-low', 'bg-primary-container')})))[0] == 'para')
mira('instancia() añade el elegido a assets/shell.css antes de versionar', 'elegido = seleccion_css(nombre, DIST)' in cuerpo
     and cuerpo.index('elegido = seleccion_css(nombre, DIST)') < cuerpo.index('\n    versiona(DIST)'))

print('%d/%d' % (casos - len(fallos), casos))
sys.exit(1 if fallos else 0)
