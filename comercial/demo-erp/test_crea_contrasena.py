# Prueba de build.py:crea_contrasena_pantalla() + crea_contrasena.html (pieza C de I6, 9-oct-2026): python test_crea_contrasena.py
# Mira que (1) la pantalla entra en /crea-contrasena/ con el estilo de Lawang, sin comentarios y con la marca escapada, y su JS compila, (2) si Lawang cambia
# la forma de su página de contraseña (el <style>, el supabase-js) el build PARA, (3) el código cumple las reglas del front escritas antes de construirlo
# (ni innerHTML ni esc(), ni .from()/rpc/fetch, ni console, el token no va a ningún atributo ni a ningún almacén, solo Auth), (4) todo texto está en el
# diccionario ES/EN, (5) instancia() la llama en su sitio. El comportamiento en un navegador lo mide pruebas/crea_contrasena.harness.cjs (se lanza desde aquí).
# NO ejecuta build.instancia(): no escribe nada en erp/despliegues/.
import io, os, re, shutil, subprocess, sys, tempfile
AQUI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, AQUI)
import build

FUENTE = open(os.path.join(AQUI, 'crea_contrasena.html'), encoding='utf-8').read()
ORIGEN_LAWANG = os.path.join(build.LAWANG, 'intranet', 'contrasena', 'index.html')
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace', line_buffering=True)
fallos, casos = [], 0


def mira(nombre, ok):
    global casos
    casos += 1
    if not ok:
        fallos.append(nombre)


def construye(marca='Mi Marca', lawang=None, dist=None):
    """Corre la función contra una carpeta temporal. Devuelve (estado, ruta_pagina, DIST)."""
    d = dist or tempfile.mkdtemp()
    v_dist, v_law = build.DIST, build.LAWANG
    build.DIST = d
    if lawang:
        build.LAWANG = lawang
    try:
        build.crea_contrasena_pantalla(marca)
        return 'pasa', os.path.join(d, 'crea-contrasena', 'index.html'), d
    except SystemExit:
        return 'para', os.path.join(d, 'crea-contrasena', 'index.html'), d
    finally:
        build.DIST, build.LAWANG = v_dist, v_law


def lawang_con(cambia):
    """Una copia mínima de Lawang (solo la página de contraseña) con la forma cambiada."""
    d = tempfile.mkdtemp()
    p = os.path.join(d, 'intranet', 'contrasena', 'index.html')
    os.makedirs(os.path.dirname(p))
    open(p, 'w', encoding='utf-8', newline='').write(cambia(open(ORIGEN_LAWANG, encoding='utf-8').read()))
    return d


# ── (1) entra y compila
r, ruta, d = construye("Marca <&> \"x\"")
pag = open(ruta, encoding='utf-8').read() if r == 'pasa' else ''
mira('la pantalla entra en /crea-contrasena/index.html con los ficheros de Lawang de hoy', r == 'pasa' and pag != '')
mira('lleva el estilo de Lawang (:root, .card, .msg.err) y no queda ninguna marca sin sustituir', '--dl:' in pag and '.card{' in pag and '.msg.err{' in pag and 'AXW_ESTILO' not in pag and '__AXW_MARCA__' not in pag)
mira('la marca va escapada en título y alt (no rompe el HTML)', 'Marca &lt;&amp;&gt; &quot;x&quot;' in pag and '<title>Marca &lt;&amp;&gt; &quot;x&quot; · Crea tu contraseña</title>' in pag)
mira('sale sin comentarios (los internos del estudio no se publican)', '<!--' not in pag and '/*' not in pag and 'pieza C' not in pag and 'AskUserQuestion' not in pag)
mira('Referrer-Policy no-referrer y noindex en la página', '<meta name="referrer" content="no-referrer">' in pag and 'noindex' in pag)
mira('el logo es el de la instancia (logos_neutros), nunca el de Lawang', '/contracts/assets/brand/axw-logo-v3-dark.png' in pag and 'lawang' not in pag.lower())
mira('NO carga guard.js (es una página de antes de entrar) ni ningún otro script que no sea supabase-js, la ficha, idioma e i18n',
     re.findall(r'<script src="([^"]+)"', pag) == [re.search(r'src="([^"]+supabase-js[^"]+)"', pag).group(1), '/contracts/assets/instancia.js', '/contracts/assets/idioma.js', '/contracts/assets/i18n.js']
     and 'guard.js' not in pag)
tag_lawang = re.search(r'<script src="https://cdn\.jsdelivr\.net/npm/@supabase/supabase-js@[^"]+"[^>]*></script>', open(ORIGEN_LAWANG, encoding='utf-8').read()).group(0)
mira('el supabase-js es EXACTAMENTE el de Lawang: versión fijada, integrity sha384 y crossorigin', tag_lawang in pag and 'integrity="sha384-' in tag_lawang and 'crossorigin="anonymous"' in tag_lawang)
mira('ningún otro origen externo salvo Google Fonts (CSP de la instancia) y jsdelivr', set(re.findall(r'https?://([^/"\')\s]+)', re.sub(r'<svg.*?</svg>', '', pag, flags=re.S))) <= {'cdn.jsdelivr.net', 'fonts.googleapis.com'})
m = re.findall(r'<script>\n(.*?)\n</script>', pag, flags=re.S)
tmp = tempfile.mkdtemp()
open(os.path.join(tmp, 'c.js'), 'w', encoding='utf-8').write(m[-1] if m else '')
chk = subprocess.run(['node', '--check', os.path.join(tmp, 'c.js')], capture_output=True, text=True, encoding='utf-8')
mira('el script de la página resultante compila (node --check)' + (': ' + chk.stderr.strip()[:300] if chk.returncode else ''), bool(m) and chk.returncode == 0)

# ── (2) si Lawang cambia, el build PARA
r2, _, _ = construye(lawang=lawang_con(lambda t: t.replace('<style>', '<style data-x>', 1)))
mira('Lawang sin UN bloque <style> exacto → el build para', r2 == 'para')
r2, _, _ = construye(lawang=lawang_con(lambda t: t.replace('</style>', '</style><style>.x{}</style>', 1)))
mira('Lawang con dos bloques <style> → el build para', r2 == 'para')
r2, _, _ = construye(lawang=lawang_con(lambda t: t.replace('.card{', '.tarjeta{')))
mira('Lawang que renombra .card → el build para (no saldría una página sin estilo)', r2 == 'para')
r2, _, _ = construye(lawang=lawang_con(lambda t: re.sub(r'<script src="https://cdn\.jsdelivr\.net[^>]*></script>', '', t, count=1)))
mira('Lawang sin la etiqueta de supabase-js → el build para', r2 == 'para')
r2, ruta2, _ = construye(lawang=lawang_con(lambda t: t.replace('supabase-js@2.110.9', 'supabase-js@2.999.0').replace('XtYxyIfxexJVTROWK0', 'OTROSRIOTROSRIOTROS')))
p2 = open(ruta2, encoding='utf-8').read() if r2 == 'pasa' else ''
mira('si Lawang sube de versión de supabase-js, la página la sigue (versión y SRI de Lawang)', r2 == 'pasa' and 'supabase-js@2.999.0' in p2 and 'OTROSRIOTROSRIOTROS' in p2 and 'supabase-js@2.110.9' not in p2)
bk = FUENTE
for nombre, roto in (('sin la marca de estilo', FUENTE.replace('/*AXW_ESTILO_LAWANG*/', '', 1)), ('con la marca de marca de menos', FUENTE.replace('alt="__AXW_MARCA__"', 'alt=""'))):
    open(os.path.join(AQUI, 'crea_contrasena.html'), 'w', encoding='utf-8', newline='').write(roto)
    try:
        rr, _, _ = construye()
    finally:
        open(os.path.join(AQUI, 'crea_contrasena.html'), 'w', encoding='utf-8', newline='').write(bk)
    mira('la fuente ' + nombre + ' → el build para', rr == 'para')
mira('la fuente quedó intacta tras las pruebas de rotura', open(os.path.join(AQUI, 'crea_contrasena.html'), encoding='utf-8').read() == bk)

# ── (3) reglas del front sobre el código (los comentarios nombran lo prohibido: se miran sin ellos)
JS = FUENTE.split('<script>\n', 1)[1].rsplit('</script>', 1)[0]
CODIGO = re.sub(r'/\*.*?\*/', '', JS, flags=re.S)
CODIGO = re.sub(r'(?m)^\s*//.*$', '', CODIGO)
MARCADO = re.sub(r'<script>.*?</script>', '', FUENTE, flags=re.S)
mira('sin innerHTML / outerHTML / insertAdjacentHTML / document.write / eval / new Function', not re.search(r'innerHTML|outerHTML|insertAdjacentHTML|document\.write|\beval\(|new Function', CODIGO))
mira('sin el esc() de Lawang (no escapa la comilla simple)', not re.search(r'\besc\(', CODIGO))
mira('ninguna escritura ni lectura de tablas: sin .from( ni .rpc( ni fetch ni XMLHttpRequest ni sendBeacon', not re.search(r'\.from\(|\.rpc\(|\bfetch\(|XMLHttpRequest|sendBeacon|\.storage\b', CODIGO))
mira('solo cuatro llamadas a Auth: setSession, verifyOtp, updateUser, signOut', sorted(set(re.findall(r'sb\.auth\.(\w+)', CODIGO))) == ['setSession', 'signOut', 'updateUser', 'verifyOtp'])
mira('sin console.*', 'console.' not in CODIGO)
mira('el token no se guarda en ningún almacén ni se escribe en el DOM (sin localStorage/sessionStorage/cookie; ningún setAttribute con el token)',
     not re.search(r'localStorage\.setItem|sessionStorage|document\.cookie|indexedDB', CODIGO) and not re.search(r'setAttribute\([^)]*(acceso|refresco|\.th|enlace)', CODIGO))
mira('borra el token de la URL con history.replaceState ANTES de crear el cliente ni canjear', CODIGO.index('history.replaceState') < CODIGO.index('createClient') < CODIGO.index('setSession'))
mira('cliente sin persistencia, sin refresco ni detección en la URL', 'persistSession: false' in CODIGO and 'autoRefreshToken: false' in CODIGO and 'detectSessionInUrl: false' in CODIGO)
mira('solo acepta type invite (nunca recovery: ese flujo es de admin-usuarios y no se toca)', "enlace.tipo !== 'invite'" in CODIGO and "type: 'invite'" in CODIGO and 'recovery' not in CODIGO)
mira('sin token NO mira la sesión existente (nada de getSession)', 'getSession' not in CODIGO)
mira('el éxito cierra la sesión de invitación (signOut global) y no entra solo', "signOut({ scope: 'global' })" in CODIGO and 'location.href' not in CODIGO and 'location.replace' not in CODIGO)
mira('requisito de contraseña = el de la suite (10 caracteres) y repetirla', 'a.length < 10' in CODIGO and 'a !== b' in CODIGO)
mira('el formulario nace oculto (sin canje no hay formulario) y se engancha por data-cp / data-accion, nunca por texto',
     'class="cp-oculto"' in MARCADO and 'data-accion="guardar"' in MARCADO and 'data-accion="idioma"' in MARCADO
     and not re.search(r'querySelector\w*\([^)]*(:contains|:has-text|text=)', CODIGO) and 'textContent ===' not in CODIGO and 'innerText ===' not in CODIGO)
mira('los mensajes de Auth no se pintan (solo mensajes propios): r.error.message no aparece', 'error.message' not in CODIGO)

# ── (4) diccionario ES/EN: toda clave que se pinta existe
dic = re.search(r'var EN_CP = \{(.*?)\n  \};', JS, flags=re.S).group(1)
claves = set(re.findall(r"^\s*'((?:[^'\\]|\\.)*)':", dic, flags=re.M))
usadas = set(re.findall(r'data-cp-t="([^"]+)"', MARCADO)) | set(re.findall(r"(?:T|di|enlaceMalo)\('((?:[^'\\]|\\.)*)'", CODIGO)) | set(re.findall(r"estado\.(?:intro|msg) = '((?:[^'\\]|\\.)*)'", CODIGO)) \
    | set(re.findall(r"intro: '((?:[^'\\]|\\.)*)'", CODIGO)) | set(re.findall(r"(?:return |&& )di\('((?:[^'\\]|\\.)*)'", CODIGO)) | set(re.findall(r"\|\| '((?:[^'\\]|\\.)*)'", CODIGO))
usadas = {u.replace("\\'", "'") for u in usadas if u}
claves = {c.replace("\\'", "'") for c in claves}
mira('todo texto que se pinta está en el diccionario EN (faltan: %s)' % sorted(usadas - claves), usadas <= claves and len(usadas) >= 14)
mira('ninguna entrada del diccionario sobra (huérfanas: %s)' % sorted(claves - usadas), claves <= usadas)
i18n = open(os.path.join(build.LAWANG, 'contracts', 'assets', 'i18n.js'), encoding='utf-8').read()
mira('no pisa claves de Lawang con otra traducción (solo se añaden las que no existen; las coincidentes se dejan)',
     "if (!(k in window.LW_EN))" in JS)

# ── (5) instancia() la llama, después de logos_neutros() y antes de versiona()
cuerpo = open(os.path.join(AQUI, 'build.py'), encoding='utf-8').read()
inst = cuerpo[cuerpo.index('def instancia(nombre):'):cuerpo.index('EXENTOS_BASE = {')]
mira('instancia() llama a crea_contrasena_pantalla(marca) tras logos_neutros() y antes de versiona()',
     inst.count('crea_contrasena_pantalla(marca)') == 1 and inst.index('logos_neutros(marca)') < inst.index('crea_contrasena_pantalla(marca)') < inst.index('versiona(DIST)'))

# ── (6) el harness en Chromium, con Auth simulado
if '--sin-navegador' not in sys.argv:
    r, ruta, d = construye('Prueba')
    h = subprocess.run(['node', os.path.join(AQUI, 'pruebas', 'crea_contrasena.harness.cjs'), ruta, os.path.join(build.LAWANG, 'contracts', 'assets')],
                       capture_output=True, text=True, encoding='utf-8', errors='replace')
    sal = h.stdout + h.stderr
    m2 = re.search(r'(\d+)/(\d+) comprobaciones del harness', sal)
    mira('el harness en Chromium pasa entero (%s)%s' % (m2.group(0) if m2 else 'sin resultado', '' if h.returncode == 0 else '\n' + sal[-2500:]), h.returncode == 0 and bool(m2))
    if m2:
        casos += int(m2.group(2)) - 1   # las del navegador cuentan una a una (la de arriba ya sumó 1)
        print('harness: %s' % m2.group(0))

print('\n%d comprobaciones, %d fallos' % (casos, len(fallos)))
for f in fallos:
    print('FALLA  ' + f)
sys.exit(1 if fallos else 0)
