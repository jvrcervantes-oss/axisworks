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
mira('la contraseña del buzón nunca se asigna desde el estado; solo se conserva (bloqueada) con un código pedido para esos datos',
     not re.search(r'\be2?\.pass\b|\bestado\.pass\b', CODIGO) and len(re.findall(r'\bpass\.value\s*=', CODIGO)) == 1 and 'if (lock && previo.pass != null) pass.value = previo.pass;' in CODIGO)
mira('la contraseña de la cuenta no se conserva nunca: ni al repintar ni tras leerla', not re.search(r'previo\.reauth|\breauth\.value\s*=|\bre\.value\s*=', CODIGO) and "c !== 'reauth'" in CODIGO and "vacia('reauth');" in CODIGO
     and CODIGO.index("vacia('reauth')") < CODIGO.index('llamaCorreo(cuerpo).then', CODIGO.index('function probarCorreo')))
mira('la contraseña del buzón se vacía al guardar, cancelar, cambiar los datos y tras un fallo al pedir', CODIGO.count("vacia('pass')") >= 5 and "cuerpo.pass = '';" in CODIGO)
mira('el puerto viaja fijo 465 y no sale del campo', "port: 465" in CODIGO and "v('port')" not in CODIGO)
mira('la única edge que llama es ajustes-correo', re.findall(r"lwEdge\('([a-z0-9-]+)'\)", CODIGO) == ['ajustes-correo'])
mira('no escribe en la base: ni .from( ni .insert/.update/.upsert/.delete ni rpc en el overlay', not re.search(r'\.from\(|\.insert\(|\.update\(|\.upsert\(|\.delete\(|\.rpc\(|supabase', CODIGO))
mira('solo se enseñan códigos traducidos: no se lee .error ni .mensaje del servidor', not re.search(r'\bd\.error\b|\.error\)|\.mensaje|\.message\b', CODIGO))
mira('enganche por data-accion / data-correo-*, no por rótulo', all(("'" + a + "'") in CODIGO for a in ('correo-servidor-pedir', 'correo-servidor-probar', 'correo-ajuste-pedir', 'correo-ajuste-guardar', 'correo-estado-reintentar'))
     and 'textContent ===' not in CODIGO and 'innerText' not in CODIGO and "closest('[data-accion]')" in CODIGO)
# el flujo del código (diseño final del 8-oct): pedir antes de guardar, el código viaja SOLO en las dos acciones que lo consumen, y nunca un modo «sin código»
mira('las 4 acciones de la edge que usa la pantalla', sorted(set(re.findall(r"accion: '([a-z_]+)'", CODIGO))) == ['estado', 'guardar_ajuste', 'pedir_codigo', 'probar_y_guardar'])
mira('el código viaja en guardar_ajuste y probar_y_guardar, nunca en pedir_codigo', CODIGO.count('codigo: codigo') == 2 and "accion: 'pedir_codigo', alcance: 'servidor', host" in CODIGO and "alcance: 'ajuste'" in CODIGO)
mira('el código se valida (6 cifras) y su caducidad se mira antes de gastar la llamada', CODIGO.count("/^[0-9]{6}$/.test(codigo)") == 2 and CODIGO.count('Date.now() > u.caduca') == 2)
mira('las 4 direcciones salen del formulario base y se leen del estado de la edge, no de ajustes_config_datos',
     "CLAVES_CODIGO = ['email_from', 'email_reply_to', 'email_avisos_soporte', 'email_avisos_sistema']" in CODIGO and 'CLAVES_CODIGO.indexOf(c.clave) < 0' in CODIGO
     and 'a.soporte' in CODIGO and 'r.reply_to' in CODIGO and 'datos.valores' not in CODIGO)
mira('cambiar host/usuario enseña la contraseña de la cuenta (current-password) y la manda como contrasena_actual', 'srv.reauth || cambia' in CODIGO and 'cuerpo.contrasena_actual = re' in CODIGO)
mira('la contraseña del buzón no viaja en las acciones de dirección', "pass" not in re.findall(r"accion: 'guardar_ajuste'[^}]*\}", CODIGO)[0] and "pass" not in re.findall(r"alcance: 'ajuste'[^}]*\}", CODIGO)[0])
# todo código que puede devolver la edge (index.ts de ajustes-correo, 8-oct-2026) más los de la propia pantalla tiene su texto en llano y sin jerga
CODIGOS_EDGE = ['accion_no_valida', 'alcance_no_valido', 'base_no_responde', 'buzon_ajeno', 'clave_actual_incorrecta', 'clave_no_editable', 'clave_no_valida', 'codigo_no_disponible',
                'codigo_no_enviado', 'codigo_no_valido', 'cuerpo_grande', 'demasiados_intentos', 'envios_pausados', 'from_ajeno', 'host_no_resuelve', 'host_no_valido', 'host_privado',
                'json_no_valido', 'metodo', 'no_super_admin', 'nombre_no_valido', 'origen', 'prueba_caducada', 'prueba_fallida', 'puerto_no_valido', 'reautenticar', 'sin_cambios',
                'sin_correo_usuario', 'sin_dominio_web', 'sin_remitente', 'sin_sesion', 'usuario_no_valido', 'valor_no_valido', 'edge_no_disponible', 'sin_red', 'respuesta_ilegible',
                'codigo_caducado', 'codigo_mal_formado', 'faltan_datos', 'direccion_mal_formada']
bloque_cod = FUENTE[FUENTE.index('var CORREO_MSG = {'):FUENTE.index('// Tras estos fallos')]
sin_texto = [c for c in CODIGOS_EDGE if not re.search(r'\b' + c + r": '", bloque_cod)]
mira('todos los códigos de error de la edge tienen su texto en llano' + (' (faltan: ' + ', '.join(sin_texto) + ')' if sin_texto else ''), not sin_texto)
jerga = [w for w in ('RPC', 'HMAC', 'canon', 'JWT', 'Vault', 'SMTP_', 'service_role', 'pepper') if w in bloque_cod]
mira('los textos de error no llevan jerga' + (' (' + ', '.join(jerga) + ')' if jerga else ''), not jerga)
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
for m in re.finditer(r"\b(?:boton|botonSecundario)\((?:[^'(),]*\? )?'((?:[^'\\]|\\.)*)'(?: : '((?:[^'\\]|\\.)*)')?,|\bcabecera\('((?:[^'\\]|\\.)*)', '((?:[^'\\]|\\.)*)'\)", FUENTE):
    for g in m.groups():
        if g: exige(g.replace("\\'", "'"), 'boton/cabecera')
mira('todo texto pintable está en el diccionario ES/EN' + (' (faltan: ' + '; '.join(sin[:6]) + ')' if sin else ''), not sin)
claves_lista = re.findall(r"'((?:[^'\\]|\\.)*)'\s*:\s*'", bloque_en)
mira('ninguna clave repetida en EN_CORREO', len(claves_lista) == len(set(claves_lista)))
mira('lo que lee cada casilla nueva está dicho (TEXTO_LEE_CORREO en el diccionario)', 'Lo lee el envío de correos de este ERP en cada correo que manda.' in claves_en)

if fallos:
    print('FALLOS (%d de %d):\n  ' % (len(fallos), casos) + '\n  '.join(fallos))
    sys.exit(1)
print('ok: %d comprobaciones' % casos)
