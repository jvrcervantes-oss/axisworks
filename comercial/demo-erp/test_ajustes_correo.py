# Prueba de build.py:ajustes_correo_maestro() (F3.1 «Correo desde Ajustes», 7-oct-2026; fuente única desde el 10-oct-2026): python test_ajustes_correo.py
# La pantalla Ajustes › Correo del maestro ES el bloque que trae el ajustes.js de Lawang (proyectos/Lawang, solo lectura); el build solo comprueba
# que viene UNA vez y le aplica una línea (el instalador). Esta prueba parte de ese fichero REAL en una carpeta temporal y mira que
# (1) lo que sale es el fichero de Lawang con esa única línea distinta, compila y lleva una sola copia de cada pieza — también DESPUÉS de
#     limpia_publico.js, que es como se publica;
# (2) el build PARA si el bloque falta, si viene dos veces (lo que pasó del 8 al 10-oct con el overlay ajustes_correo.js) o si Lawang cambia
#     la línea que se reemplaza;
# (3) el bloque cumple las reglas de seguridad del front (sin innerHTML, contraseña new-password y nunca prefijada, solo la edge
#     `ajustes-correo`, sin console.log, ninguna escritura directa a la base);
# (4) todo código de error que la edge del MAESTRO puede devolver (leído de su index.ts) tiene texto en llano, y todo texto que se pinta está
#     en el diccionario ES/EN de Lawang, que es el que se publica.
# El comportamiento en un navegador lo mide pruebas/ajustes_correo.harness.cjs (necesita Chromium y un paquete construido).
# Lo corre el gate del repo por ajustes_correo.test.js (tools/test.py solo descubre *.test.js en un proyecto).
import os, re, shutil, subprocess, sys, tempfile
AQUI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, AQUI)
import build

LAWANG_AJ = os.path.join(build.LAWANG, 'intranet', 'v4', 'assets', 'ajustes.js')
LAWANG_I18N = os.path.join(build.LAWANG, 'contracts', 'assets', 'i18n.js')
EDGE_TS = os.path.join(build.AGENCIA, 'erp', 'funciones', 'ajustes-correo', 'index.ts')
for _f in (LAWANG_AJ, LAWANG_I18N, EDGE_TS):
    if not os.path.isfile(_f):   # no poder mirar no es «todo bien»
        print('NO SE HA PODIDO MIRAR: falta ' + _f + ' (¿AXW_AGENCIA_RAIZ / AXW_LAWANG_RAIZ?)')
        sys.exit(1)
ORIGINAL = open(LAWANG_AJ, encoding='utf-8').read()
VIEJO, NUEVO = build.AJUSTES_CORREO_INSTALADOR
INICIO, FIN = '\n  var TEXTO_LEE_CORREO = ', '\n  function arranca() {'   # el bloque de Correo: de su primera declaración al arranque


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


def una_copia(js):
    try:
        build.ajustes_correo_una_copia(js, 'prueba')
        return 'pasa'
    except SystemExit:
        return 'para'


def publicado(js):
    """El fichero tal como sale del build: sin comentarios y reescrito por limpia_publico.js (terser, sin compress ni mangle)."""
    d = tempfile.mkdtemp()
    open(os.path.join(d, 'ajustes.js'), 'w', encoding='utf-8', newline='').write(js)
    r = subprocess.run(['node', os.path.join(AQUI, 'limpia_publico.js'), d], cwd=AQUI, capture_output=True, text=True, encoding='utf-8')
    t = open(os.path.join(d, 'ajustes.js'), encoding='utf-8').read() if r.returncode == 0 else ''
    shutil.rmtree(d, ignore_errors=True)
    return t


fallos, casos = [], 0
def mira(nombre, ok):
    global casos
    casos += 1
    if not ok:
        fallos.append(nombre)

# (1) una sola copia, la de Lawang, con UNA línea distinta
mira('el ajustes.js de Lawang trae el bloque de Correo (de TEXTO_LEE_CORREO a arranca) una vez', ORIGINAL.count(INICIO) == 1 and ORIGINAL.count(FIN) == 1 and ORIGINAL.index(INICIO) < ORIGINAL.index(FIN))
r, salida, ruta = corre(ORIGINAL)
mira('el build pasa sobre el ajustes.js de Lawang de hoy', r == 'pasa')
chk = subprocess.run(['node', '--check', ruta], capture_output=True, text=True, encoding='utf-8')
mira('el JS resultante compila (node --check)' + (': ' + chk.stderr.strip()[:300] if chk.returncode else ''), chk.returncode == 0)
mira('lo que sale es el fichero de Lawang con UNA sola línea distinta (el instalador)',
     salida != ORIGINAL and salida.count(NUEVO) == 1 and salida.replace(NUEVO, VIEJO) == ORIGINAL and len(salida.splitlines()) == len(ORIGINAL.splitlines()))
for que, rx in build.AJUSTES_CORREO_UNA_VEZ:
    mira('en lo que sale, una sola vez: ' + que + ' (hay %d)' % len(re.findall(rx, salida)), len(re.findall(rx, salida)) == 1)
BLOQUE = salida[salida.index(INICIO):salida.index(FIN)] if r == 'pasa' else ''
DOBLE = salida.replace(FIN, BLOQUE + FIN) if BLOQUE else ''   # el bloque dos veces en el mismo IIFE: lo que hacía el overlay
pub, pub_doble = publicado(salida), publicado(DOBLE) if DOBLE else ''
mira('limpia_publico.js procesa el fichero (terser instalado en comercial/demo-erp/node_modules)', bool(pub) and bool(pub_doble))
mira('tal como se publica (sin comentarios, reescrito) sigue pasando el control de una copia', bool(pub) and una_copia(pub) == 'pasa')
mira('tal como se publica, el control CAZA el bloque dos veces', bool(pub_doble) and una_copia(pub_doble) == 'para')
# la forma general: una función cualquiera de la pantalla (no de la lista) repetida, también en el fichero publicado, que es una sola línea
OTRA = '\n  function sueltaCodigo(u) { u.fase = \'idle\'; }\n'
mira('tal como se publica, el control CAZA una función repetida que no está en la lista (sueltaCodigo)',
     salida.count('function sueltaCodigo(') == 1 and una_copia(publicado(salida.replace(FIN, OTRA + FIN))) == 'para')
# y no confunde una nota con una segunda copia: un comentario de Lawang que nombre una pieza no puede parar el build del maestro
NOTAS = ("\n  // carga() llama a pintaServidorCorreo(guardada) y a ajustaCamposCorreo(); lee() mira LEE_CORREO[clave]\n"
         "  /* function pintaServidorCorreo(guardada) { … } · var CORREO_MSG = {} · var srv = {} · function llamaCorreo() */\n")
mira('un comentario que nombra las piezas del bloque NO para el build', corre(ORIGINAL.replace(FIN, NOTAS + FIN))[0] == 'pasa')
mira('en el repo del maestro no queda una segunda copia del bloque (ajustes_correo.js retirado y build.py no lo abre)',
     not os.path.exists(os.path.join(AQUI, 'ajustes_correo.js')) and "'ajustes_correo.js'" not in open(os.path.join(AQUI, 'build.py'), encoding='utf-8').read())

# (2) el build PARA en vez de publicar dos copias, ninguna, o un reemplazo que no encontró su línea
mira('para si el bloque de Correo viene DOS veces (un overlay encima de la copia de Lawang)', bool(DOBLE) and corre(ORIGINAL.replace(FIN, ORIGINAL[ORIGINAL.index(INICIO):ORIGINAL.index(FIN)] + FIN))[0] == 'para')
mira('para si Lawang ya no trae el bloque de Correo', corre(ORIGINAL[:ORIGINAL.index(INICIO)] + ORIGINAL[ORIGINAL.index(FIN):])[0] == 'para')
for nombre, linea in (('carga(): ajustaCamposCorreo()', '      ajustaCamposCorreo();\n'), ('carga(): pintaServidorCorreo(guardada)', '      pintaServidorCorreo(guardada);\n'),
                      ('lee(): LEE_CORREO', '    if (LEE_CORREO[clave]) return T(TEXTO_LEE_CORREO);\n'),
                      ('oyente de clics correo-*', "    if (a.indexOf('correo-') !== 0) return;\n"),
                      ('oyente de hashchange de Correo', "  window.addEventListener('hashchange', function () { if (datos && desdeHash() === 'correo' && srv.fase === 'inicial') pintaServidorCorreo(); });\n")):
    mira('Lawang trae una vez el enganche ' + nombre, ORIGINAL.count(linea) == 1)
    mira('para si falta el enganche ' + nombre, corre(ORIGINAL.replace(linea, '', 1))[0] == 'para')
    mira('para si el enganche ' + nombre + ' está dos veces', corre(ORIGINAL.replace(linea, linea + linea, 1))[0] == 'para')
mira('para si Lawang cambia la línea del instalador', corre(ORIGINAL.replace(VIEJO, VIEJO.replace('(', '( ', 1)))[0] == 'para')
mira('para si la línea del instalador aparece dos veces', corre(ORIGINAL + '\n' + VIEJO + '\n')[0] == 'para')
mira('para si Lawang ya trae la línea del maestro (toca quitar el reemplazo del build, no aplicarlo dos veces)', corre(ORIGINAL.replace(VIEJO, NUEVO))[0] == 'para')

# (3) reglas de seguridad del front, sobre el bloque que SALE (los comentarios cuentan el porqué y nombran lo prohibido: las reglas miran el código)
CODIGO = re.sub(r'/\*.*?\*/', '', BLOQUE, flags=re.S)
mira('el bloque de Correo no está vacío', len(CODIGO) > 20000)
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
mira('no escribe en la base: ni .from( ni .insert/.update/.upsert/.delete ni rpc en el bloque de Correo', not re.search(r'\.from\(|\.insert\(|\.update\(|\.upsert\(|\.delete\(|\.rpc\(|supabase', CODIGO))
mira('solo se enseñan códigos traducidos: no se lee .error ni .mensaje del servidor', not re.search(r'\bd\.error\b|\.error\)|\.mensaje|\.message\b', CODIGO))
mira('enganche por data-accion / data-correo-*, no por rótulo', all(("'" + a + "'") in CODIGO for a in ('correo-servidor-pedir', 'correo-servidor-probar', 'correo-ajuste-pedir', 'correo-ajuste-guardar', 'correo-estado-reintentar'))
     and 'textContent ===' not in CODIGO and 'innerText' not in CODIGO and "closest('[data-accion]')" in CODIGO)
# el flujo del código (diseño final del 8-oct): pedir antes de guardar, el código viaja SOLO en las dos acciones que lo consumen, y nunca un modo «sin código»
mira('las 4 acciones de la edge que usa la pantalla', sorted(set(re.findall(r"accion: '([a-z_]+)'", CODIGO))) == ['estado', 'guardar_ajuste', 'pedir_codigo', 'probar_y_guardar'])
mira('el código viaja en guardar_ajuste y probar_y_guardar, nunca en pedir_codigo', CODIGO.count('codigo: codigo') == 2 and "accion: 'pedir_codigo', alcance: 'servidor', host" in CODIGO and "alcance: 'ajuste'" in CODIGO)
mira('el código se valida (6 cifras) y su caducidad se mira antes de gastar la llamada', CODIGO.count("/^[0-9]{6}$/.test(codigo)") == 2 and CODIGO.count('Date.now() > u.caduca') == 2)
DIRS = ('email_from', 'email_reply_to', 'email_avisos_soporte', 'email_avisos_sistema')
mira('las 4 direcciones no están en el formulario base (una sola mención de cada una como casilla, y es la de «Direcciones») y se leen del estado de la edge',
     all(salida.count("clave: '%s'" % c) == 1 and CODIGO.count("clave: '%s'" % c) == 1 for c in DIRS)
     and 'a.soporte' in CODIGO and 'r.reply_to' in CODIGO and 'datos.valores' not in CODIGO)
mira('cambiar host/usuario enseña la contraseña de la cuenta (current-password) y la manda como contrasena_actual', 'srv.reauth || cambia' in CODIGO and 'cuerpo.contrasena_actual = re' in CODIGO)
cuerpos_dir = re.findall(r"accion: 'guardar_ajuste'[^}]*\}", CODIGO) + re.findall(r"alcance: 'ajuste'[^}]*\}", CODIGO)
mira('la contraseña del buzón no viaja en las acciones de dirección', len(cuerpos_dir) == 2 and not any('pass' in c for c in cuerpos_dir))
mira('las casillas nuevas salen solo si la base las declara editables', 'ed.indexOf(c.clave) >= 0' in CODIGO and 'Array.isArray(ed)' in CODIGO)
mira('edge no disponible (404/5xx sin código, sin red) tiene mensaje propio', 'edge_no_disponible' in CODIGO and 'sin_red' in CODIGO and 'resp.status === 404 || resp.status >= 500' in CODIGO)
mira('«puesta por el instalador» se dice con palabras y dentro de la frase con huecos de Lawang',
     "e.puesto_por === 'instalador' ? T('el instalador')" in CODIGO and "T('Contraseña del buzón puesta el %cuando por %quien', { cuando: cuando || '—', quien: porQuien })" in CODIGO)

# (4a) todo código que la edge del MAESTRO puede devolver tiene su texto en llano. La lista sale de su index.ts (no de la memoria de nadie):
# `host_no_comprobable` existía en la edge y no en la pantalla del maestro, y salió «Respuesta no reconocida» (revisor, 10-oct-2026).
edge = open(EDGE_TS, encoding='utf-8').read()
DE_LA_EDGE = set(re.findall(r"\bno\('([a-z_]+)'", edge)) | set(re.findall(r"ok: false, codigo: '([a-z_]+)'", edge))
# La edge también REENVÍA códigos que no escribe ella (revisión del 10-oct): los del validador del servidor (`no(val.codigo…)`, de
# envia-correo/smtp.ts) y el `hint` de un 22023 de las dos funciones de la base que guardan (`no(g.hint…)`). Se leen de su fuente. Si aparece
# un reenvío nuevo, esta prueba falla hasta que alguien diga de dónde salen sus códigos.
reenvios = sorted(re.findall(r"\bno\((?!')([\w.]+),", edge))
mira('los reenvíos de código de la edge son los tres conocidos (val.codigo y g.hint dos veces): %s' % reenvios, reenvios == ['g.hint', 'g.hint', 'val.codigo'])
SMTP_TS = os.path.join(build.AGENCIA, 'erp', 'funciones', 'envia-correo', 'smtp.ts')
del_validador = set(re.findall(r"codigo: '([a-z_]+)'", open(SMTP_TS, encoding='utf-8').read())) if os.path.isfile(SMTP_TS) else set()
mira('se han leído los códigos del validador del servidor (envia-correo/smtp.ts): %s' % sorted(del_validador), len(del_validador) >= 5)
MIGRACIONES = sorted(f for f in os.listdir(os.path.join(build.AGENCIA, 'erp', 'migraciones')) if f.endswith('.sql'))
def cuerpo_sql(fn):
    """La ÚLTIMA definición de una función de la base en erp/migraciones (la que manda)."""
    ult = ''
    for f in MIGRACIONES:
        t = open(os.path.join(build.AGENCIA, 'erp', 'migraciones', f), encoding='utf-8').read()
        for m in re.finditer(r'create or replace function\s+(?:public\.)?' + re.escape(fn) + r'\s*\(.*?\$\$;', t, flags=re.S | re.I):
            ult = m.group(0)
    return ult
def hints(fn, hondo=1):
    c = cuerpo_sql(fn)
    h = set(re.findall(r"hint\s*:?=\s*'([a-z_]+)'", c))
    if hondo:
        for ayudante in set(re.findall(r'\b(_correo_\w+)\s*\(', c)) - {fn}:
            h |= hints(ayudante, hondo - 1)
    return h
de_la_base = hints('correo_ajuste_guarda') | hints('correo_smtp_guarda_candidato')
mira('se han leído los avisos (hint) de correo_ajuste_guarda y correo_smtp_guarda_candidato: %s' % sorted(de_la_base),
     {'from_ajeno', 'buzon_ajeno', 'valor_no_valido', 'demasiados_intentos'} <= de_la_base)
# Lo que la base puede avisar y la pantalla no traduce A PROPÓSITO, uno a uno y con su porqué (si deja de ser verdad, se quita de aquí):
SIN_TEXTO_A_PROPOSITO = {
    'motivo_no_valido': "el motivo lo escribe la edge ('sin otro destinatario de aviso' o nulo), nunca el usuario: no puede fallar por lo que se teclea",
}
DE_LA_EDGE = sorted((DE_LA_EDGE | del_validador | de_la_base) - set(SIN_TEXTO_A_PROPOSITO))
mira('se han leído los códigos de error de erp/funciones/ajustes-correo/index.ts (%d con los reenviados)' % len(DE_LA_EDGE), len(DE_LA_EDGE) >= 30 and 'host_no_comprobable' in DE_LA_EDGE and 'sin_sesion' in DE_LA_EDGE)
CODIGOS_EDGE = ['accion_no_valida', 'alcance_no_valido', 'base_no_responde', 'buzon_ajeno', 'clave_actual_incorrecta', 'clave_no_editable', 'clave_no_valida', 'codigo_no_disponible',
                'codigo_no_enviado', 'codigo_no_valido', 'cuerpo_grande', 'demasiados_intentos', 'envios_pausados', 'from_ajeno', 'host_no_comprobable', 'host_no_resuelve', 'host_no_valido', 'host_privado',
                'json_no_valido', 'metodo', 'no_super_admin', 'nombre_no_valido', 'origen', 'prueba_caducada', 'prueba_fallida', 'puerto_no_valido', 'reautenticar', 'sin_cambios',
                'sin_correo_usuario', 'sin_dominio_web', 'sin_remitente', 'sin_sesion', 'usuario_no_valido', 'valor_no_valido', 'edge_no_disponible', 'sin_red', 'respuesta_ilegible',
                'codigo_caducado', 'codigo_mal_formado', 'faltan_datos', 'direccion_mal_formada']
def trozo(desde, hasta):
    """El texto del bloque entre dos declaraciones; '' si falta alguna (lo dice la comprobación de abajo, no un traceback)."""
    return BLOQUE[BLOQUE.index(desde):BLOQUE.index(hasta)] if desde in BLOQUE and hasta in BLOQUE and BLOQUE.index(desde) < BLOQUE.index(hasta) else ''
bloque_cod = trozo('var CORREO_MSG = {', 'var CODIGO_SIGUE = {')
mira('el bloque trae la tabla de mensajes entre CORREO_MSG y CODIGO_SIGUE', len(bloque_cod) > 2000)
sin_texto = [c for c in sorted(set(CODIGOS_EDGE) | set(DE_LA_EDGE)) if not re.search(r'\b' + c + r": '", bloque_cod)]
mira('todos los códigos de error de la edge tienen su texto en llano' + (' (faltan: ' + ', '.join(sin_texto) + ')' if sin_texto else ''), not sin_texto)
jerga = [w for w in ('RPC', 'HMAC', 'canon', 'JWT', 'Vault', 'SMTP_', 'service_role', 'pepper', 'DNS') if w in bloque_cod]
mira('los textos de error no llevan jerga' + (' (' + ', '.join(jerga) + ')' if jerga else ''), not jerga)

# (4b) diccionario ES/EN: todo texto que el bloque pinta está en el i18n.js de Lawang (el build lo copia tal cual: es el que se publica)
i18n = open(LAWANG_I18N, encoding='utf-8').read()
sin = []
def exige(c, donde):
    if ("'" + c.replace("'", "\\'") + "':") not in i18n:
        sin.append(donde + ': ' + c[:70])
def suelta(g):
    return g.replace("\\'", "'")
vistos = 0
for donde, rx in (('T()', r"\bT\('((?:[^'\\]|\\.)*)'\s*[,)]"),
                  ('T(a?b:c)', r"T\([^'()]*\? '((?:[^'\\]|\\.)*)'\s*:\s*'((?:[^'\\]|\\.)*)'"),
                  ('etiqueta/ayuda', r"\bclave: '[a-z_]+', etiqueta: '((?:[^'\\]|\\.)*)'|\bayuda: '((?:[^'\\]|\\.)*)'|campoServidor\('[^']+', '((?:[^'\\]|\\.)*)', (?:'((?:[^'\\]|\\.)*)'|null)"),
                  ('boton/cabecera', r"\b(?:botonCorreo|botonSecundario)\((?:[^'(),]*\? )?'((?:[^'\\]|\\.)*)'(?: : '((?:[^'\\]|\\.)*)')?,|\bcabecera\('((?:[^'\\]|\\.)*)', '((?:[^'\\]|\\.)*)'\)"),
                  ('pasos', r"\btituloPaso\(\d, '((?:[^'\\]|\\.)*)'|\[\['((?:[^'\\]|\\.)*)', 1\], \['((?:[^'\\]|\\.)*)', 2\], \['((?:[^'\\]|\\.)*)', 3\]\]"),
                  ('queFallo', r"\bqueFallo = '((?:[^'\\]|\\.)*)'")):
    for m in re.finditer(rx, BLOQUE):
        for g in m.groups():
            if g:
                vistos += 1
                exige(suelta(g), donde)
for m in re.finditer(r":\s*'((?:[^'\\]|\\.)*)'[,\n]", bloque_cod):
    vistos += 1
    exige(suelta(m.group(1)), 'CORREO_MSG')
mira('se han encontrado los textos que pinta el bloque (%d)' % vistos, vistos >= 100)
mira('todo texto pintable está en el diccionario ES/EN de Lawang' + (' (faltan: ' + '; '.join(sorted(set(sin))[:8]) + ')' if sin else ''), not sin)
mira('el diccionario trae la frase del instalador, las dos frases con huecos y la de «no se ha podido comprobar»',
     all(("'" + c + "':") in i18n for c in ('el instalador', 'Contraseña del buzón puesta el %cuando por %quien', 'Contraseña del buzón puesta el %cuando',
                                              'No se ha podido comprobar a dónde apunta ese servidor ahora mismo: no se ha enviado ni guardado nada. Inténtalo de nuevo en un rato.')))
mira('las traducciones de las frases con huecos conservan %cuando y %quien', "'Mailbox password set on %cuando by %quien'" in i18n and "'Mailbox password set on %cuando'" in i18n)

if fallos:
    print('FALLOS (%d de %d):\n  ' % (len(fallos), casos) + '\n  '.join(fallos))
    sys.exit(1)
print('ok: %d comprobaciones' % casos)
