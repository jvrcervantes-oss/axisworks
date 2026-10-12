# Prueba de la portada de erp.axisworks.studio (C03, 12-oct-2026; revisión previa #286 Legal + Frontend): python test_portada_erp.py
# Mira (1) que publica_web() saca EXACTAMENTE la lista cerrada, con las fuentes autoalojadas y sin Google ni en el HTML ni en la
# CSP, y que PARA si faltan las fuentes; (2) que portada.js no usa innerHTML ni almacenamiento del navegador; (3) que cada
# enganche data-* de landing.html tiene su manejador y al revés; (4) que el interruptor CLAUDE_STARTUPS está en un solo sitio y
# quita la banda del HTML; (5) que panel/panel.css sigue saliendo de Tailwind y la portada ya no; (6) los textos de Legal.
# No toca dist/ del repo: construye en una carpeta temporal con unas fuentes de mentira si no hay de verdad.
import json, os, re, shutil, sys, tempfile
AQUI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, AQUI)
import build

HTML = open(os.path.join(AQUI, 'landing.html'), encoding='utf-8').read()
JS = open(os.path.join(AQUI, 'portada.js'), encoding='utf-8').read()
CSS = open(os.path.join(AQUI, 'portada.css'), encoding='utf-8').read()
FUENTE_BUILD = open(os.path.join(AQUI, 'build.py'), encoding='utf-8').read()
fallos = []


def ok(cond, que):
    if not cond:
        fallos.append(que)


def sin_comentarios_js(t):
    t = re.sub(r'/\*.*?\*/', '', t, flags=re.S)
    return re.sub(r'(?m)^\s*//.*$', '', t)


CODIGO = sin_comentarios_js(JS)

# ── (2) portada.js: ni innerHTML ni almacenamiento ──
for malo in ('innerHTML', 'outerHTML', 'insertAdjacentHTML', 'document.write', 'localStorage', 'sessionStorage',
             'document.cookie', 'indexedDB', 'leeEstado', 'guardaEstado', 'setItem', 'eval(', 'new Function'):
    ok(malo not in CODIGO, 'portada.js usa ' + malo)

# ── (3) enganches data-* ──
HTML_SIN_COM = re.sub(r'<!--[\s\S]*?-->', '', HTML)
pares = set(re.findall(r'\s(data-[a-z-]+)(?:="([^"]*)")?', HTML_SIN_COM))
LEIDOS_POR_VALOR = {'data-enlace': ('demo', 'tour'), 'data-accion': ('todo', 'base'),
                    'data-tipo': ('properties',) + tuple(re.findall(r'^\s{4}(\w+): \{ head:', JS, flags=re.M))}
for attr, val in sorted(pares):
    if attr in LEIDOS_POR_VALOR:
        ok(val in LEIDOS_POR_VALOR[attr], '%s="%s" sin manejador en portada.js' % (attr, val))
        ok("'[%s]'" % attr in CODIGO or '[%s="' % attr in CODIGO, '%s no se lee en portada.js' % attr)
    elif val:
        ok('[%s="%s"]' % (attr, val) in CODIGO, '%s="%s" no se usa en portada.js' % (attr, val))
    else:
        ok('[%s]' % attr in CODIGO, '%s no se usa en portada.js' % attr)
ok(sorted(LEIDOS_POR_VALOR['data-tipo']) == ['bookings', 'properties', 'services'], 'tipos de negocio: %r' % (LEIDOS_POR_VALOR['data-tipo'],))
ok("=== 'todo'" in CODIGO, 'data-accion=todo sin rama en portada.js')
CREADOS_EN_JS = {'data-k', 'data-cuenta', 'data-seccion', 'data-roi-h'}
for attr, val in set(re.findall(r'\[(data-[a-z-]+)(?:="([^"]*)")?\]', CODIGO)):
    if "'" in val:
        continue                                   # selector montado en tiempo de ejecución (data-tipo de la radio pulsada)
    if attr in CREADOS_EN_JS:
        ok("setAttribute('%s'" % attr in CODIGO, '%s se busca y no se crea' % attr)
    elif val:
        ok((attr, val) in pares, 'portada.js busca [%s="%s"] y no está en landing.html' % (attr, val))
    else:
        ok(any(a == attr for a, _v in pares), 'portada.js busca [%s] y no está en landing.html' % attr)

# Interruptores accesibles
ok("setAttribute('role', 'switch')" in CODIGO and "'aria-checked'" in CODIGO, 'los módulos no son role=switch con aria-checked')
ok("setAttribute('aria-disabled', 'true')" in CODIGO and "'INCLUDED'" in CODIGO, 'la base no lleva aria-disabled e «Included»')
ok('role="status"' in HTML and 'aria-live="polite"' in HTML, 'falta el aviso aria-live del arrastre')
ok(HTML.count('type="radio" name="biz"') == 3, 'el tipo de negocio no es un grupo de 3 radios')
ok('prefers-reduced-motion' in CSS, 'portada.css sin prefers-reduced-motion')
ok('cdn.' not in HTML and 'googleapis' not in HTML and 'gstatic' not in HTML and 'material-symbols' not in HTML,
   'landing.html pide algo de fuera (CDN, Google)')
ok('url(' not in CSS or not re.search(r'url\(\s*["\']?https?:', CSS), 'portada.css pide algo de fuera')
# Enlaces estáticos a la demo (publica_web los hace absolutos) y su versión con ?sel= por data-enlace
ok(HTML.count('href="/home/"') >= 2 and HTML.count('href="/home/?tour=1"') >= 3, 'faltan los enlaces estáticos a /home/')
ok(all('data-enlace=' in a for a in re.findall(r'<a [^>]*href="/home/[^>]*>', HTML)), 'un enlace a /home/ sin data-enlace')
# La cifra de módulos sale de catalogo.js, no se escribe
ok(not re.search(r'>\s*\d{2}\s*<', HTML_SIN_COM.split('<dt>3</dt>')[0]) and '30 modules' not in HTML and '>30<' not in HTML,
   'la cifra de módulos está escrita a mano')
ok('function modulosDeTipo' in CODIGO and 'CAT.MODULOS.map' in CODIGO.split('function modulosDeTipo')[1][:120],
   'modulosDeTipo no devuelve todos los módulos del catálogo')

# ── (4) CLAUDE_STARTUPS: una línea, un sitio ──
ok(len(re.findall(r'(?m)^CLAUDE_STARTUPS\s*=\s*(True|False)\s*$', FUENTE_BUILD)) == 1, 'CLAUDE_STARTUPS no está en una sola línea de build.py')
ok(build.CLAUDE_STARTUPS is True, 'CLAUDE_STARTUPS apagado (decisión del owner: encendido)')
ok(HTML.count('<!--axw:startups-->') == 1 and HTML.count('<!--/axw:startups-->') == 1, 'marcas de la banda Startups')
fuera = build.STARTUPS_RE.sub('', HTML)
ok('startups' not in fuera.lower() and 'claude.com' not in fuera, 'hay texto de Claude for Startups fuera del interruptor')
for f in (JS, CSS):
    ok('Claude for Startups' not in f and 'CLAUDE FOR STARTUPS' not in f, 'texto de Startups fuera del interruptor (js/css)')
encendida, apagada = build.banda_startups(HTML, True), build.banda_startups(HTML, False)
ok('CLAUDE FOR STARTUPS' in encendida and 'PROGRAM MEMBER' in encendida and 'axw:startups' not in encendida, 'encendida no sale bien')
ok('CLAUDE FOR STARTUPS' not in apagada and 'claude.com' not in apagada and 'axw:startups' not in apagada, 'apagada deja rastro')
try:
    build.banda_startups('<p>sin banda</p>')
    fallos.append('banda_startups no para si falta la marca')
except SystemExit:
    pass

# ── (5) Tailwind: el panel sigue, la portada no ──
tw = json.load(open(os.path.join(AQUI, 'tailwind.json'), encoding='utf-8'))
salidas = [s['css'] for s in tw['salidas']]
ok('panel/panel.css' in salidas, 'panel/panel.css ya no sale de tailwind.json')
ok('demo/landing.css' not in salidas, 'demo/landing.css sigue saliendo de Tailwind')
ok("compila_portada('demo/landing.css')" not in FUENTE_BUILD and "compila_portada('panel/panel.css')" in FUENTE_BUILD,
   'build.py: la portada sigue compilando Tailwind o el panel ya no')

# ── (6) Textos (Legal #284 / #286) ──
VISIBLE = HTML_SIN_COM + '\n' + CODIGO
for malo in ('e-signature', 'English and Spanish', 'We usually reply', 'ILLUSTRATION', 'AXISWORKS · DEMO WITH SAMPLE DATA', 'starting set',
             'per company', "another company's", '[COST]', 'in production', 'ROI CALCULATOR', 'guarantee', 'Active now'):
    ok(malo.lower() not in VISIBLE.lower(), 'texto retirado por Legal/owner: ' + malo)
for bueno in ('database per client', "Your data is never in the same database as another client's.",
              'row-level security and scheduled backups', 'WhatsApp setter that qualifies the lead (in testing)',
              "Replies drafted from the client's own contract (in testing)", 'WhatsApp (in testing)', 'HOURS CALCULATOR',
              'How many hours <span class="lt">could you free up?', 'VALUE OF THOSE HOURS / MONTH', 'online signing',
              'Improvements are built once, usually tried on the demo, then rolled out to each client&#39;s instance.'.replace('&#39;', "'"),
              '© 2026 PT MAHKOTA PROPERTY GLOBAL (AxisWorks)', 'href="https://axisworks.studio/legal-notice"',
              'href="https://axisworks.studio/privacy"', 'href="https://axisworks.studio/cookies"',
              'Meta, WhatsApp, GoHighLevel and Google Sheets are trademarks of their respective owners; no affiliation is implied.'):
    ok(bueno in HTML, 'falta el texto de Legal: ' + bueno)
ok('a WhatsApp assistant (in testing)' in JS, 'Bookings: el asistente de WhatsApp sin «(in testing)»')
ok("['WhatsApp assistant', 'In testing']" in JS, 'tarjeta de Bookings sin «In testing»')
# El aviso de la calculadora va pegado a las cifras: dentro de la misma caja, justo después de ellas
caja = re.search(r'<div class="roi-caja">([\s\S]*?)</div>\s*</div>\s*<form', HTML)
ok(caja and caja.group(1).index('data-roi="valor"') < caja.group(1).index('Not an offer or a promise of savings'),
   'el aviso de la calculadora no va en la caja de las cifras')
for cliente in ('Lawang', 'Sumba', 'Bali', 'BBM', 'Dion', 'Padrino', 'BodaEnlace', 'Holmaca', 'Sandalwood'):
    ok(cliente.lower() not in (HTML + JS + CSS).lower(), 'nombre de cliente en la portada: ' + cliente)


# ── (1) publica_web(): lista cerrada, fuentes y CSP ──
def fuentes_de_mentira(d):
    css = os.path.join(d, 'assets', 'x', 'fonts.css')
    os.makedirs(os.path.dirname(css))
    os.makedirs(os.path.join(d, 'assets', 'fonts', 'x'))
    caras = []
    for f in build.FUENTES_WEB:
        open(os.path.join(d, *f.split('/')), 'wb').write(b'x')
        if f.endswith('.woff2'):
            caras.append("@font-face{font-family:'T';src:url(/%s) format('woff2')}" % f)
    open(css, 'w', encoding='utf-8').write('/* fuentes de prueba */\n' + '\n'.join(caras) + '\n')
    return css


def dist_de_prueba(d):
    os.makedirs(os.path.join(d, 'demo'))
    open(os.path.join(d, 'index.html'), 'w', encoding='utf-8').write(build.banda_startups(build.config_portada(HTML, '')))
    shutil.copy2(os.path.join(AQUI, 'portada.css'), os.path.join(d, 'demo', 'landing.css'))
    for f in ('catalogo.js', 'roi.js', 'portada.js'):
        shutil.copy2(os.path.join(AQUI, f), os.path.join(d, 'demo', f))
    for f in ('favicon.png', 'favicon.ico'):
        open(os.path.join(d, f), 'wb').write(b'\x00')


def publica(fuentes_css):
    tmp = tempfile.mkdtemp()
    dist, destino = os.path.join(tmp, 'dist'), os.path.join(tmp, 'AxisWorks', 'dist', 'erp-web')
    dist_de_prueba(dist)
    viejo = (build.DIST, build.DESTINO_WEB, build.FUENTES_CSS)
    build.DIST, build.DESTINO_WEB, build.FUENTES_CSS = dist, destino, fuentes_css
    try:
        build.publica_web()
        return 'pasa', destino
    except SystemExit:
        return 'para', destino
    finally:
        build.DIST, build.DESTINO_WEB, build.FUENTES_CSS = viejo


ok(set(build.PORTADA_SOLO) == {'index.html', 'demo/landing.css', 'demo/roi.js', 'demo/portada.js'}, 'PORTADA_SOLO: %r' % (build.PORTADA_SOLO,))
ok(sorted(build.LISTA_WEB) == sorted(['index.html', 'demo/landing.css', 'demo/catalogo.js', 'demo/roi.js', 'demo/portada.js',
                                      'favicon.png', 'favicon.ico', 'robots.txt', '.htaccess'] + list(build.FUENTES_WEB)),
   'LISTA_WEB no es la esperada: %r' % (build.LISTA_WEB,))
ok(len(build.FUENTES_WEB) == 11 and sum(f.endswith('.woff2') for f in build.FUENTES_WEB) == 8, 'FUENTES_WEB: 8 woff2 + 3 OFL')
real = os.path.isfile(build.FUENTES_CSS)
css_prueba = build.FUENTES_CSS if real else fuentes_de_mentira(tempfile.mkdtemp())
res, destino = publica(css_prueba)
ok(res == 'pasa', 'publica_web() no pasa con fuentes (%s)' % ('reales' if real else 'de prueba'))
if res == 'pasa':
    hay = sorted(os.path.relpath(os.path.join(r, f), destino).replace(os.sep, '/') for r, _d, fs in os.walk(destino) for f in fs)
    ok(hay == sorted(build.LISTA_WEB), 'dist/erp-web no es la lista cerrada: %r' % hay)
    ht = open(os.path.join(destino, '.htaccess'), encoding='utf-8').read()
    csp = re.search(r'Content-Security-Policy "([^"]+)"', ht).group(1)
    ok('google' not in csp and 'gstatic' not in csp, 'la CSP de erp. sigue nombrando Google: ' + csp)
    ok("font-src 'self';" in csp, 'font-src no es solo self: ' + csp)
    # La lista cerrada del .htaccess (RewriteCond %{REQUEST_URI} !^/(…)?$ → todo lo demás va a app.): cada fichero publicado
    # tiene que quedarse en erp. Si no, la fuente iría con un 302 a app. y la página saldría con las del sistema, sin un error.
    permite = re.search(r'RewriteCond %\{REQUEST_URI\} !(\S+)', ht).group(1)
    for f in build.LISTA_WEB:
        if f != '.htaccess':
            ok(re.search(permite, '/' + f), 'el .htaccess manda a app. un fichero de la portada: /' + f)
    ok(re.search(permite, '/'), 'el .htaccess manda a app. la raíz')
    for f in ('/intranet/', '/assets/fonts/x/otra.woff2', '/demo/tour.js', '/portal/', '/demo/portada.jsx'):
        ok(not re.search(permite, f), 'el .htaccess deja en erp. algo fuera de la lista: ' + f)
    hoja = open(os.path.join(destino, 'demo', 'landing.css'), encoding='utf-8').read()
    ok(hoja.lstrip().startswith('/*') and hoja.index('@font-face') < hoja.index(':root'), 'las @font-face no van delante de la hoja')
    idx = open(os.path.join(destino, 'index.html'), encoding='utf-8').read()
    ok(build.DEMO_URL + '/home/' in idx and 'href="/home' not in idx, 'enlaces a la demo no absolutos')
    ok('googleapis' not in idx and 'gstatic' not in idx, 'el index publicado pide Google')
    ok('CLAUDE FOR STARTUPS' in idx, 'la banda Startups no sale con el interruptor encendido')
res2, _d = publica(os.path.join(tempfile.mkdtemp(), 'assets', 'x', 'fonts.css'))
ok(res2 == 'para', 'publica_web() no PARA sin fuentes')

if fallos:
    print('FALLA test_portada_erp.py:\n  ' + '\n  '.join(fallos))
    sys.exit(1)
print('ok test_portada_erp.py (fuentes %s)' % ('reales' if real else 'de prueba'))
