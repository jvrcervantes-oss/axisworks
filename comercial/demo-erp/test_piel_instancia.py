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
     and not re.search(r'#104C4F|rgba\(16,76,79|#0c3c3e|#316669', mascota, re.I) and '#442C1E' in mascota)
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
mira('instancia() arregla la puerta tras la piel y antes de versionar', cuerpo.index('piel_suite_clasica(DIST, nombre)') < cuerpo.index('puerta_instancia(DIST, idiomas_de(nombre))') < cuerpo.index('\n    versiona(DIST)'))
mira('instancia() pone los logos de la instancia, no los neutros a secas', 'logos_instancia(nombre, marca)' in cuerpo and 'logos_neutros(' not in cuerpo)
mira('instancia() comprueba la piel antes de dar el paquete por bueno', cuerpo.index('comprueba_piel(DIST, nombre)') < cuerpo.index('comprueba_resultado(DIST)'))

print('%d/%d' % (casos - len(fallos), casos))
sys.exit(1 if fallos else 0)
