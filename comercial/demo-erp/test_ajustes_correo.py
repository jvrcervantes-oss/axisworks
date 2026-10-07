# Prueba de build.py:ajustes_correo_maestro() + ajustes_correo.js (F3.1 «Correo desde Ajustes», 7-oct-2026): python test_ajustes_correo.py
# Parte del ajustes.js REAL de Lawang (proyectos/Lawang, solo lectura) en una carpeta temporal y mira que (1) el overlay entra y el JS resultante
# compila, (2) si Lawang cambia cualquiera de los cuatro trozos que se reemplazan el build PARA (no deja nada a medias), (3) la pantalla cumple las
# reglas de seguridad del front que se escribieron antes de construirla (sin innerHTML, contraseña new-password y nunca prefijada, solo la edge
# `ajustes-correo` + la RPC de config, sin console.log, ninguna escritura directa a la base), y (4) todo texto que pinta está en el mini-diccionario
# ES/EN (o ya está en el de Lawang). El comportamiento en un navegador lo mide pruebas/ajustes_correo.harness.cjs (necesita Chromium).
import os, re, subprocess, sys, tempfile
AQUI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, AQUI)
import build

LAWANG_AJ = os.path.join(build.LAWANG, 'intranet', 'v4', 'assets', 'ajustes.js')
LAWANG_I18N = os.path.join(build.LAWANG, 'contracts', 'assets', 'i18n.js')
FUENTE = open(os.path.join(AQUI, 'ajustes_correo.js'), encoding='utf-8').read()
CODIGO = re.sub(r'/\*.*?\*/', '', FUENTE, flags=re.S)   # los comentarios cuentan el porqué y nombran lo prohibido: las reglas miran el código
ORIGINAL = open(LAWANG_AJ, encoding='utf-8').read()


def corre(texto):
    d = tempfile.mkdtemp()
    p = os.path.join(d, 'intranet', 'v4', 'assets', 'ajustes.js')
    os.makedirs(os.path.dirname(p))
    open(p, 'w', encoding='utf-8', newline='').write(texto)
    viejo, build.DIST = build.DIST, d
    try:
        build.ajustes_correo_maestro()
        return 'pasa', open(p, encoding='utf-8').read(), p
    except SystemExit:
        return 'para', '', p
    finally:
        build.DIST = viejo


fallos, casos = [], 0
def mira(nombre, ok):
    global casos
    casos += 1
    if not ok:
        fallos.append(nombre)

r, salida, ruta = corre(ORIGINAL)
mira('el overlay entra sobre el ajustes.js de Lawang de hoy', r == 'pasa')
chk = subprocess.run(['node', '--check', ruta], capture_output=True, text=True, encoding='utf-8')
mira('el JS resultante compila (node --check)' + (': ' + chk.stderr.strip()[:300] if chk.returncode else ''), chk.returncode == 0)
mira('el código de Lawang sigue intacto salvo los tres puntos de enganche', len(salida) > len(ORIGINAL) and
     salida.replace(FUENTE.rstrip('\n') + '\n\n', '').replace("    if (ES_MAESTRO && LEE_CORREO[clave]) return T(TEXTO_LEE_CORREO);\n", '')
     .replace("      ajustaCamposCorreo();\n", '').replace("      pintaServidorCorreo(guardada);\n", '') == ORIGINAL)
mira('queda dentro del IIFE (antes de arranca) y arranca() sigue una sola vez', salida.count('\n  function arranca() {') == 1 and salida.index('function pintaServidorCorreo') < salida.index('\n  function arranca() {'))

# (2) si Lawang cambia un trozo, el build PARA
for nombre, viejo in (('arranca()', '\n  function arranca() {'),
                      ('lee()', '    if (ES_MAESTRO) return LO_LEE_EL_MAESTRO[clave] ? T(TEXTO_LEE) : T(TEXTO_NO_LEE);'),
                      ('carga()', "      pintaFormulario('correo', 'lw-aj-correo', ant, guardada);")):
    mira('para si Lawang cambia ' + nombre, corre(ORIGINAL.replace(viejo, viejo.replace('(', '( ', 1)))[0] == 'para')
    mira('para si ' + nombre + ' aparece dos veces', corre(ORIGINAL + '\n' + viejo + '\n')[0] == 'para')

# (3) reglas de seguridad del front
mira('ningún innerHTML ni insertAdjacentHTML ni document.write', not re.search(r'innerHTML|insertAdjacentHTML|document\.write|outerHTML', CODIGO))
mira('ningún console.log', 'console.log' not in CODIGO)
mira('la contraseña del buzón es type=password con autocomplete=new-password', "inputServidor('password', 'pass', 200, { autocomplete: 'new-password' })" in CODIGO)
mira('la contraseña de la cuenta es current-password', "inputServidor('password', 'reauth', 200, { autocomplete: 'current-password' })" in CODIGO)
mira('la contraseña nunca se asigna desde el estado ni desde lo tecleado antes', not re.search(r'\bpass\.value\s*=|\breauth\.value\s*=|previo\.pass|previo\.reauth|e2?\.pass\b', CODIGO))
mira('las dos contraseñas se vacían en cuanto se leen', "vacia('pass'); vacia('reauth');" in CODIGO and CODIGO.index("vacia('pass')") < CODIGO.index('llamaCorreo(cuerpo).then'))
mira('el puerto viaja fijo 465 y no sale del campo', "port: 465" in CODIGO and "v('port')" not in CODIGO)
mira('la única edge que llama es ajustes-correo', re.findall(r"lwEdge\('([a-z0-9-]+)'\)", CODIGO) == ['ajustes-correo'])
mira('no escribe en la base: ni .from( ni .insert/.update/.upsert/.delete ni rpc en el overlay', not re.search(r'\.from\(|\.insert\(|\.update\(|\.upsert\(|\.delete\(|\.rpc\(|supabase', CODIGO))
mira('solo se enseñan códigos traducidos: no se lee .error ni .mensaje del servidor', not re.search(r'\bd\.error\b|\.error\)|\.mensaje|\.message\b', CODIGO))
mira('enganche por data-accion / data-correo, no por rótulo', "'data-accion': 'correo-servidor-probar'" in CODIGO and 'textContent ===' not in CODIGO and 'innerText' not in CODIGO)
mira('las casillas nuevas salen solo si la base las declara editables', 'ed.indexOf(c.clave) >= 0' in CODIGO and 'Array.isArray(ed)' in CODIGO)
mira('edge no disponible (404/5xx sin código, sin red) tiene mensaje propio', 'edge_no_disponible' in CODIGO and 'sin_red' in CODIGO and 'resp.status === 404 || resp.status >= 500' in CODIGO)

# (4) diccionario ES/EN: todo T('…') literal está en EN_CORREO, en CORREO_MSG (que se traduce al pintar) o en el diccionario de Lawang
i18n = open(LAWANG_I18N, encoding='utf-8').read()
bloque_en = FUENTE[FUENTE.index('var EN_CORREO = {'):FUENTE.index("if (window.LW_EN")]
claves_en = set(m.group(1).replace("\\'", "'") for m in re.finditer(r"'((?:[^'\\]|\\.)*)'\s*:\s*'", bloque_en))
def en_lawang(c):
    return ("'" + c.replace("'", "\\'") + "':") in i18n
sin = []
def exige(c, donde):
    if c not in claves_en and not en_lawang(c):
        sin.append(donde + ': ' + c[:70])
for m in re.finditer(r"\bT\('((?:[^'\\]|\\.)*)'\)", FUENTE):
    exige(m.group(1).replace("\\'", "'"), 'T()')
for m in re.finditer(r"T\(\w+ \? '((?:[^'\\]|\\.)*)' : '((?:[^'\\]|\\.)*)'\)|T\([^'()]*\? '((?:[^'\\]|\\.)*)'\s*:\s*'((?:[^'\\]|\\.)*)'", FUENTE):
    for g in m.groups():
        if g: exige(g.replace("\\'", "'"), 'T(a?b:c)')
bloque_msg = FUENTE[FUENTE.index('var CORREO_MSG = {'):FUENTE.index('var srv = {')]
for m in re.finditer(r":\s*'((?:[^'\\]|\\.)*)'[,\n]", bloque_msg):
    exige(m.group(1).replace("\\'", "'"), 'CORREO_MSG')
for m in re.finditer(r"\bclave: '[a-z_]+', etiqueta: '((?:[^'\\]|\\.)*)'|\bayuda: '((?:[^'\\]|\\.)*)'|campoServidor\('[^']+', '((?:[^'\\]|\\.)*)', (?:'((?:[^'\\]|\\.)*)'|null)", FUENTE):
    for g in m.groups():
        if g: exige(g.replace("\\'", "'"), 'etiqueta/ayuda')
mira('todo texto pintable está en el diccionario ES/EN' + (' (faltan: ' + '; '.join(sin[:6]) + ')' if sin else ''), not sin)
claves_lista = re.findall(r"'((?:[^'\\]|\\.)*)'\s*:\s*'", bloque_en)
mira('ninguna clave repetida en EN_CORREO', len(claves_lista) == len(set(claves_lista)))
mira('lo que lee cada casilla nueva está dicho (TEXTO_LEE_CORREO en el diccionario)', 'Lo lee el envío de correos de este ERP en cada correo que manda.' in claves_en)

if fallos:
    print('FALLOS (%d de %d):\n  ' % (len(fallos), casos) + '\n  '.join(fallos))
    sys.exit(1)
print('ok: %d comprobaciones' % casos)
