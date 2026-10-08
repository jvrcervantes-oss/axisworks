# Prueba de build.py:taller_pantalla() + taller.html + _compartido/pantalla_comun.{js,css} (F8 pieza 2, 8-oct-2026): python test_taller.py
# Igual que test_reservas_producto.py: parte de los ficheros REALES de Lawang (proyectos/Lawang, solo lectura) copiados a una carpeta temporal y corre la CADENA entera
# de overlays del maestro en el orden de instancia() (asistente, bot de WhatsApp, correo, ventas, reservas de producto, taller). Mira que (1) la pantalla entra con las
# ayudas comunes pegadas UNA vez y todo el JS compila, (2) si algo cambia (un ancla de Lawang, la cadena, una marca o un fichero comun) el build PARA, (3) la pantalla
# cumple las reglas de seguridad del front (sin innerHTML ni esc(), solo las tres RPC del plan, nada de .from(), ni autor ni numero ni estado viajan) y (4) todo texto que
# pinta esta en el diccionario ES/EN. El comportamiento en un navegador lo mide pruebas/taller.harness.cjs.
# NO ejecuta build.instancia(): no escribe nada en erp/despliegues/.
import json, os, re, shutil, subprocess, sys, tempfile
AQUI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, AQUI)
import build

FUENTE = open(os.path.join(AQUI, 'taller.html'), encoding='utf-8').read()
MARCADO, SCRIPT = FUENTE.split('<!--AXW_SCRIPT-->')
COMUN_JS = open(os.path.join(AQUI, '_compartido', 'pantalla_comun.js'), encoding='utf-8').read()
COMUN_CSS = open(os.path.join(AQUI, '_compartido', 'pantalla_comun.css'), encoding='utf-8').read()
JS = SCRIPT.strip()                                       # la pantalla tal cual se escribe (con la marca AXW_COMUN_JS)
JS_TODO = JS.replace('/*AXW_COMUN_JS*/', COMUN_JS.strip())   # ... y con las ayudas comunes pegadas, que es lo que corre
def sin_comentarios(t):
    t = re.sub(r'/\*.*?\*/', '', t, flags=re.S)            # los comentarios cuentan el porque y nombran lo prohibido: las reglas miran el codigo
    return re.sub(r'(?m)^\s*//.*$', '', t)
CODIGO = sin_comentarios(JS)
CODIGO_COMUN = sin_comentarios(COMUN_JS)
FICHEROS = ['intranet/v4/asistente/index.html', 'intranet/v4/assets/nav.js', 'contracts/assets/herramientas.js',
            'intranet/v4/assets/editores.js', 'intranet/v4/assets/ajustes.js']


def cadena():
    return (build.asistente_maestro, build.whatsapp_bot_pantalla, build.ajustes_correo_maestro, build.ventas_pantalla, build.reservas_producto_pantalla,
            build.taller_pantalla)


def prepara(cambia=None):
    d = tempfile.mkdtemp()
    for f in FICHEROS:
        dst = os.path.join(d, *f.split('/'))
        os.makedirs(os.path.dirname(dst), exist_ok=True)
        t = open(os.path.join(build.LAWANG, *f.split('/')), encoding='utf-8').read()
        if cambia and f in cambia:
            t = cambia[f](t)
        open(dst, 'w', encoding='utf-8', newline='').write(t)
    return d


def corre(cambia=None, pasos=None):
    d = prepara(cambia)
    viejo, build.DIST = build.DIST, d
    try:
        for paso in (pasos or cadena()):
            paso()
        return 'pasa', d
    except SystemExit:
        return 'para', d
    finally:
        build.DIST = viejo


def lee(d, ruta):
    return open(os.path.join(d, *ruta.split('/')), encoding='utf-8').read()


def compila(codigo, nombre):
    tmp = tempfile.mkdtemp()
    p = os.path.join(tmp, nombre)
    open(p, 'w', encoding='utf-8').write(codigo)
    return subprocess.run(['node', '--check', p], capture_output=True, text=True, encoding='utf-8')


fallos, casos = [], 0
def mira(nombre, ok):
    global casos
    casos += 1
    if not ok:
        fallos.append(nombre)

# -- (1) la cadena entera entra y compila
r, d = corre()
mira('la cadena de overlays entra sobre los ficheros de Lawang de hoy', r == 'pasa')
pagina = lee(d, 'intranet/v4/taller/index.html') if r == 'pasa' else ''
nav = lee(d, 'intranet/v4/assets/nav.js') if r == 'pasa' else ''
her = lee(d, 'contracts/assets/herramientas.js') if r == 'pasa' else ''
mira('la pagina lleva la puerta de la herramienta taller y ya no la del asistente', 'data-herramienta="taller"' in pagina and 'data-herramienta="asistente"' not in pagina)
mira('el titulo es Taller', '<title data-lw-titulo>Taller</title>' in pagina)
mira('la pantalla de Lawang (asistente) no se mezcla en la nueva', 'asistente-peticiones' not in pagina and 'Telegram' not in pagina)
mira('el marcado y el script de la fuente entran una vez', pagina.count('<div class="flex flex-col w-full gap-8" data-tl="raiz">') == 1 and pagina.count('var EN_TL = {') == 1)
mira('las ayudas comunes se pegan UNA vez (js y css) y las marcas no quedan en la pagina',
     pagina.count('function axwComun(raiz, T)') == 1 and pagina.count('.axw-boton{') == 1 and '/*AXW_COMUN_' not in pagina)
mira('la pagina no trae sus propias copias de las ayudas (h, dialogo, clasifica, ocupa) fuera de las comunes',
     len(re.findall(r'function (h|dialogo|clasifica|ocupa|tabla)\(', CODIGO)) == 0)
m = re.findall(r'<script>\n(.*?)\n</script>\n</body></html>', pagina, flags=re.S)
chk = compila(m[-1], 'v.js') if m else None
mira('el script de la pagina resultante compila (node --check)' + (': ' + chk.stderr.strip()[:300] if chk is not None and chk.returncode else ''), bool(m) and chk.returncode == 0)
mira('la fuente de las ayudas comunes compila sola', compila(COMUN_JS, 'comun.js').returncode == 0)
if r == 'pasa':
    for nombre, cod in (('nav.js', nav), ('herramientas.js', her)):
        c2 = compila(cod, nombre)
        mira('el %s resultante compila%s' % (nombre, (': ' + c2.stderr.strip()[:300]) if c2.returncode else ''), c2.returncode == 0)
    mira('nav.js: entrada de menu, injerto (con nucleo) y casilla, una vez cada uno',
         nav.count("{ path: 'taller', texto: 'Taller', clave: 'taller', nucleo: true }") == 1
         and nav.count("{ path: 'taller', tras: 'reservas-producto'") == 1 and nav.count("taller: 'taller',") == 1)
    mira('el injerto de Taller viene DESPUES del de Reservas de producto (cuelga de el)', nav.index("path: 'reservas-producto', tras: 'ventas'") < nav.index("path: 'taller', tras: 'reservas-producto'"))
    mira('puedeVer no deja pasar a un rol sin la casilla: CLAVE_MENU de la pantalla existe antes de la linea que la usa', nav.index("taller: 'taller',") < nav.index('var k = CLAVE_MENU[path];'))
    mira('lo que habian puesto las otras pantallas sigue en nav.js (reservas, ventas, bot de WhatsApp y asistente)',
         "path: 'reservas-producto'" in nav and "path: 'ventas'" in nav and "path: 'whatsapp-bot'" in nav and "clave: 'asistente_peticiones'" in nav)
    mira('herramientas.js: la tarjeta taller esta UNA vez, bajo la bandera del nucleo y tras la de Reservas de producto',
         her.count("herr:'taller'") == 1 and her.index("herr:'taller'") > her.index('window.AXW_NUCLEO_OPERACION')
         and her.index("herr:'taller'") > her.index("herr:'reservas-producto'"))
    prueba = ("global.window = { AXW_NUCLEO_OPERACION: true }; var LW_ROL = {}; " + re.sub(r'^\s*export\s+', '', her, flags=re.M) +
              "\nconsole.log(JSON.stringify((typeof LW_HERRAMIENTAS !== 'undefined' ? LW_HERRAMIENTAS : []).filter(t => t.herr === 'taller').map(t => [t.grupo, t.href])));")
    tmp = tempfile.mkdtemp()
    open(os.path.join(tmp, 'h.js'), 'w', encoding='utf-8').write(prueba)
    sal = subprocess.run(['node', os.path.join(tmp, 'h.js')], capture_output=True, text=True, encoding='utf-8')
    try:
        tarj = json.loads(sal.stdout.strip().splitlines()[-1]) if sal.stdout.strip() else None
    except Exception:
        tarj = None
    mira('con la bandera del nucleo, el catalogo de herramientas trae la tarjeta (Seguimiento, /intranet/v4/taller/)' + ('' if tarj is not None else ' [no se pudo evaluar: ' + (sal.stderr or sal.stdout)[-200:] + ']'),
         tarj == [['Seguimiento', '/intranet/v4/taller/']])

# -- (2) si algo cambia, el build PARA (y no deja un menu a medias)
ORIGINAL = {f: open(os.path.join(build.LAWANG, *f.split('/')), encoding='utf-8').read() for f in FICHEROS}
mira('para si falta la pantalla de Reservas de producto en la cadena (sus anclas de nav.js son las que deja ella: el orden importa)',
     corre(pasos=(build.asistente_maestro, build.whatsapp_bot_pantalla, build.ajustes_correo_maestro, build.ventas_pantalla, build.taller_pantalla))[0] == 'para')
mira('para si la cascara de /asistente/ ya no tiene la forma esperada',
     corre({'intranet/v4/asistente/index.html': lambda t: t.replace('<div class="flex flex-col w-full gap-8">', '<div class="otra">', 1)})[0] == 'para')
mira('para si ese trozo de herramientas.js aparece dos veces',
     corre({'contracts/assets/herramientas.js': lambda t: t + "\nbookings rental fleet unit calendar rate hold return' });\n}\n"})[0] == 'para')


def con_fuente_alterada(alterar_taller=None, quitar_comun=None):
    alt = tempfile.mkdtemp()
    for otro in ('asistente_peticiones.html', 'whatsapp_bot.html', 'bot_alta.html', 'ajustes_correo.js', 'ventas.html', 'reservas_producto.html'):
        shutil.copy(os.path.join(AQUI, otro), os.path.join(alt, otro))
    open(os.path.join(alt, 'taller.html'), 'w', encoding='utf-8').write(alterar_taller(FUENTE) if alterar_taller else FUENTE)
    os.makedirs(os.path.join(alt, '_compartido'))
    for f in ('pantalla_comun.js', 'pantalla_comun.css'):
        if f != quitar_comun:
            shutil.copy(os.path.join(AQUI, '_compartido', f), os.path.join(alt, '_compartido', f))
    viejo, build.AQUI = build.AQUI, alt        # la fuente alterada vive en otra carpeta: taller.html y _compartido no se tocan
    try:
        return corre()[0]
    finally:
        build.AQUI = viejo
mira('la fuente sin alterar pasa tambien desde otra carpeta (control de la prueba de abajo)', con_fuente_alterada() == 'pasa')
mira('para si falta el marcador AXW_SCRIPT en taller.html', con_fuente_alterada(lambda t: t.replace('<!--AXW_SCRIPT-->', '')) == 'para')
mira('para si la pagina usa una marca comun repetida', con_fuente_alterada(lambda t: t.replace('/*AXW_COMUN_CSS*/', '/*AXW_COMUN_CSS*/ /*AXW_COMUN_CSS*/')) == 'para')
mira('para si falta el fichero comun que la pagina pide', con_fuente_alterada(quitar_comun='pantalla_comun.js') == 'para')
mira('Lawang no se toco: los ficheros siguen igual', all(open(os.path.join(build.LAWANG, *f.split('/')), encoding='utf-8').read() == ORIGINAL[f] for f in FICHEROS))

# -- (3) reglas de seguridad del front (la pantalla Y las ayudas comunes que pega)
for nombre, cod in (('la pantalla', CODIGO), ('las ayudas comunes', CODIGO_COMUN)):
    mira('%s: ningun innerHTML ni insertAdjacentHTML ni outerHTML ni document.write' % nombre, not re.search(r'innerHTML|insertAdjacentHTML|outerHTML|document\.write|\.append\(\s*`', cod))
    mira('%s: no usa el esc() de Lawang (no escapa la comilla simple) ni lwCajonHtml / H.dato / H.seccion' % nombre, not re.search(r'\besc\(|lwCajonHtml|H\.dato|H\.seccion|lwCajon\(', cod))
    mira('%s: ningun console.log' % nombre, 'console.log' not in cod)
    mira('%s: el navegador no escribe ni lee tablas: ni .from( ni insert/update/upsert/delete ni storage' % nombre, not re.search(r'\.from\(|\.insert\(|\.update\(|\.upsert\(|\.delete\(|\.storage\b', cod))
mira('no nombra claves de servicio', not re.search(r'service_role|sb_secret_', JS + MARCADO + COMUN_JS))
PERMITIDAS = {'orden_trabajo_datos', 'orden_trabajo_abre', 'orden_trabajo_cierra'}
llamadas = set(re.findall(r"\bllama\('([a-z_]+)'", CODIGO))
literales = set(re.findall(r"(?:SB\.rpc|window\.lwDatos)\('([a-z_]+)'", CODIGO))
mira('cada RPC lleva su nombre LITERAL (para que contrato_front.py la vea) y son exactamente las tres del plan (' + ', '.join(sorted(literales ^ PERMITIDAS)) + ')', literales == PERMITIDAS)
mira('las RPC que llama son exactamente las del plan (' + ', '.join(sorted(llamadas ^ PERMITIDAS)) + ')', llamadas == PERMITIDAS)
mira('lo que lee va por lwDatos y solo *_datos; lo que escribe va por sb.rpc', set(re.findall(r"window\.lwDatos\('([a-z_]+)'", CODIGO)) == {'orden_trabajo_datos'}
     and set(re.findall(r"SB\.rpc\('([a-z_]+)'", CODIGO)) == {'orden_trabajo_abre', 'orden_trabajo_cierra'})
mira('ninguna lectura por .rpc(...).select() ni encadenada', '.select(' not in CODIGO and not re.search(r"\.rpc\([^)]*\)\s*\.", CODIGO))
# el navegador pide, no decide: ni autor, ni numero, ni estado, ni fechas de la orden
mira('abrir manda SOLO moto, motivo y si bloquea',
     "llama('orden_trabajo_abre', { p_unidad: sel.value, p_motivo: m, p_bloquea: !!bloquea.checked })" in CODIGO)
mira('cerrar manda SOLO la orden, el coste (texto numerico), la moneda y la nota',
     "llama('orden_trabajo_cierra', { p_id: o.id, p_coste: c === '' ? null : c, p_moneda: c === '' ? null : mo, p_nota: n === '' ? null : n })" in CODIGO)
mira('nada de autor, correo, numero ni fechas viaja a la base, y el unico estado que se manda es el FILTRO de la lista',
     not re.search(r'p_(autor|por|email|numero|abierta|cerrada|user)', CODIGO) and CODIGO.count('p_estado') == 1 and 'p_estado: estadoFiltro()' in CODIGO)
mira('abrir no se da por hecho: exige id y numero de orden en la respuesta', "typeof x.id !== 'string' || typeof x.numero !== 'string'" in CODIGO)
mira('cerrar no se da por hecho: exige estado cerrada en la respuesta', "x.estado !== 'cerrada'" in CODIGO)
mira('el estado de la moto que se anuncia sale de la respuesta de la base', CODIGO.count('x.unidad_estado') >= 2)
mira('las reservas vivas se leen del detalle de la base y se pintan como texto, con el enlace solo si el usuario tiene Reservas', "c.hint === 'reservas_vivas'" in CODIGO and 'E.puedeReservas' in CODIGO and "'reservas-producto'" in CODIGO)
mira('doble clic: un solo envio a la vez (ocupa/libera en abrir y cerrar)', CODIGO.count('C.ocupa(bt)') == 2 and CODIGO.count('C.libera(bt)') == 2 and 'function ocupa' in CODIGO_COMUN)
mira('enganche por data-accion; ningun texto de boton se usa para encontrar nada', not re.search(r'textContent\s*===|innerText|\.placeholder|querySelector\([^)]*placeholder', CODIGO))
mira('la lista distingue vacia de no se ha podido mirar', "T('No se ha podido mirar') + ': '" in CODIGO and 'No hay órdenes abiertas.' in CODIGO)
mira('modulo apagado y sin permiso en una lectura se dicen (no es no hay nada)', 'Esto NO quiere decir que no haya nada' in CODIGO and 'No es que esté vacío: no se ha podido mirar' in CODIGO)
mira('RPC no disponible (PGRST202 / 404) tiene mensaje propio', "'PGRST202'" in CODIGO + CODIGO_COMUN and 'Esta función todavía no está disponible en esta base' in CODIGO_COMUN)
acciones_marcado = set(re.findall(r'data-accion="(tl-[a-z-]+)"', MARCADO))
acciones_codigo = set(re.findall(r"(?:\), |accion: )'(tl-[a-z-]+)'", CODIGO))
mira('todo data-accion del marcado tiene manejador (' + ', '.join(sorted(a for a in acciones_marcado if ("a === '" + a + "'") not in CODIGO)) + ')',
     all(("a === '" + a + "'") in CODIGO for a in acciones_marcado))
mira('todo data-accion que crea el codigo tiene manejador o es del dialogo', all((("a === '" + a + "'") in CODIGO) or a.startswith('tl-modal') for a in acciones_codigo))

# -- (4) diccionario ES/EN (el de la pantalla y el de las ayudas comunes)
bloque = JS[JS.index('var EN_TL = {'):JS.index('var T = typeof window.lwT')]
tmp = tempfile.mkdtemp()
js_claves = os.path.join(tmp, 'k.js')
open(js_claves, 'w', encoding='utf-8').write(bloque + '\n' + COMUN_JS + '\nconsole.log(JSON.stringify(Object.keys(EN_TL).concat(Object.keys(axwComun(null, function (s) { return s; }).EN))));')
claves = set(json.loads(subprocess.run(['node', js_claves], capture_output=True, text=True, encoding='utf-8').stdout or '[]'))
i18n = open(os.path.join(build.LAWANG, 'contracts', 'assets', 'i18n.js'), encoding='utf-8').read()
def conocida(c):
    return c in claves or ("'" + c.replace("'", "\\'") + "':") in i18n or ('"' + c + '":') in i18n
sin = []
def exige(c, donde):
    if c and not conocida(c):
        sin.append(donde + ': ' + c[:70])
def lit(s):
    return s.replace("\\'", "'")
for mm in re.finditer(r"\bT\('((?:[^'\\]|\\.)*)'\)", JS_TODO):
    exige(lit(mm.group(1)), 'T()')
for mm in re.finditer(r"\bT\([^'()]*\? '((?:[^'\\]|\\.)*)'\s*:\s*'((?:[^'\\]|\\.)*)'\)", JS_TODO):
    for g in mm.groups():
        exige(lit(g), 'T(a?b:c)')
for mm in re.finditer(r"T\(x\.unidad_estado === 'taller' \? '([^']+)' : \(x\.unidad_estado === 'disponible' \? '([^']+)' : '([^']+)'\)\)", JS):
    for g in mm.groups():
        exige(g, 'T(estado)')
for mm in re.finditer(r"\bcampo\('((?:[^'\\]|\\.)*)'", JS_TODO):
    exige(lit(mm.group(1)), 'campo()')
for mm in re.finditer(r"ESTADO_ORDEN = \{[^\n]*", JS):
    for c in re.findall(r"\['([A-Za-zÁÉÍÓÚáéíóúñ ]+)', '", mm.group(0)):
        exige(c, 'ESTADO_ORDEN')
for mm in re.finditer(r"C\.tabla\(\$v\('[a-z-]+'\), (\[\[.*?\]\]), ", JS):
    for c in re.findall(r"\['((?:[^'\\]|\\.)*)'(?:, 'axw-num')?\]", mm.group(1)):
        exige(lit(c), 'cabecera')
for mm in re.finditer(r"\['([A-ZÁÉÍÓÚ][^'\\]*)', (?:nombreMoto|o\.|C\.|T\()", JS):
    exige(mm.group(1), 'resumen')
for mm in re.finditer(r'<(\w+)[^>]*data-lwt[^>]*>([^<]+)</\1>', MARCADO):
    exige(mm.group(2).strip(), 'data-lwt')
mira('todo texto pintable esta en el diccionario ES/EN' + (' (faltan: ' + '; '.join(sin[:10]) + ')' if sin else ''), not sin)
bloque_lineas = re.findall(r"'((?:[^'\\]|\\.)*)'\s*:\s*'", bloque)
repetidas = sorted({c for c in bloque_lineas if bloque_lineas.count(c) > 1})
mira('ninguna clave repetida en EN_TL' + (' (' + ', '.join(repetidas) + ')' if repetidas else ''), not repetidas)

if fallos:
    print('FALLOS (%d de %d):\n  ' % (len(fallos), casos) + '\n  '.join(fallos))
    sys.exit(1)
print('ok: %d comprobaciones' % casos)
