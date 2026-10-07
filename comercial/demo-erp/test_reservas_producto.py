# Prueba de build.py:reservas_producto_pantalla() + reservas_producto.html (F8 pieza 1, 8-oct-2026): python test_reservas_producto.py
# Igual que test_ventas.py: parte de los ficheros REALES de Lawang (proyectos/Lawang, solo lectura) copiados a una carpeta temporal y corre la CADENA entera de
# overlays del maestro en el orden de instancia() (asistente, bot de WhatsApp, correo, ventas, reservas de producto): las anclas de nav.js se cuentan DESPUES de lo
# que ya reescribieron las demas. Mira que (1) la pantalla entra, todo el JS compila y la casilla existe en herramientas.js, (2) si Lawang cambia un ancla el build
# PARA, (3) la pantalla cumple las reglas de seguridad del front (sin innerHTML ni esc(), solo las RPC con llamador, nada de .from(), el precio nunca viaja,
# el estado de pago nunca viaja) y (4) todo texto que pinta esta en el diccionario ES/EN. El comportamiento en un navegador lo mide pruebas/reservas_producto.harness.cjs.
# NO ejecuta build.instancia(): no escribe nada en erp/despliegues/.
import json, os, re, shutil, subprocess, sys, tempfile
AQUI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, AQUI)
import build

FUENTE = open(os.path.join(AQUI, 'reservas_producto.html'), encoding='utf-8').read()
MARCADO, SCRIPT = FUENTE.split('<!--AXW_SCRIPT-->')
JS = SCRIPT.strip()
CODIGO = re.sub(r'/\*.*?\*/', '', JS, flags=re.S)          # los comentarios cuentan el porque y nombran lo prohibido: las reglas miran el codigo
CODIGO = re.sub(r'(?m)^\s*//.*$', '', CODIGO)
FICHEROS = ['intranet/v4/asistente/index.html', 'intranet/v4/assets/nav.js', 'contracts/assets/herramientas.js',
            'intranet/v4/assets/editores.js', 'intranet/v4/assets/ajustes.js']


def cadena():
    return (build.asistente_maestro, build.whatsapp_bot_pantalla, build.ajustes_correo_maestro, build.ventas_pantalla, build.reservas_producto_pantalla)


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
pagina = lee(d, 'intranet/v4/reservas-producto/index.html') if r == 'pasa' else ''
nav = lee(d, 'intranet/v4/assets/nav.js') if r == 'pasa' else ''
her = lee(d, 'contracts/assets/herramientas.js') if r == 'pasa' else ''
mira('la pagina lleva la puerta de la herramienta reservas-producto y ya no la del asistente', 'data-herramienta="reservas-producto"' in pagina and 'data-herramienta="asistente"' not in pagina)
mira('el titulo es Reservas de producto', '<title data-lw-titulo>Reservas de producto</title>' in pagina)
mira('la pantalla de Lawang (asistente) no se mezcla en la nueva', 'asistente-peticiones' not in pagina and 'Telegram' not in pagina)
mira('el marcado de la fuente entra una vez y el script una vez', pagina.count('<div class="flex flex-col w-full gap-8" data-rp="raiz">') == 1 and pagina.count('var EN_RP = {') == 1)
m = re.findall(r'<script>\n(.*?)\n</script>\n</body></html>', pagina, flags=re.S)
chk = compila(m[-1], 'v.js') if m else None
mira('el script de la pagina resultante compila (node --check)' + (': ' + chk.stderr.strip()[:300] if chk is not None and chk.returncode else ''), bool(m) and chk.returncode == 0)
if r == 'pasa':
    for nombre, cod in (('nav.js', nav), ('herramientas.js', her)):
        c2 = compila(cod, nombre)
        mira('el %s resultante compila%s' % (nombre, (': ' + c2.stderr.strip()[:300]) if c2.returncode else ''), c2.returncode == 0)
    mira('nav.js: entrada de menu, injerto (con nucleo) y casilla, una vez cada uno',
         nav.count("{ path: 'reservas-producto', texto: 'Reservas de producto', clave: 'reservas-producto', nucleo: true }") == 1
         and nav.count("{ path: 'reservas-producto', tras: 'ventas'") == 1 and nav.count("'reservas-producto': 'reservas-producto',") == 1)
    mira('el injerto de Reservas de producto viene DESPUES del de Ventas (cuelga de el)', nav.index("path: 'ventas',     tras: 'reservas'") < nav.index("path: 'reservas-producto', tras: 'ventas'"))
    mira('puedeVer no deja pasar a un rol sin la casilla: CLAVE_MENU de la pantalla existe antes de la linea que la usa', nav.index("'reservas-producto': 'reservas-producto',") < nav.index('var k = CLAVE_MENU[path];'))
    mira('lo que habian puesto las otras pantallas sigue en nav.js (ventas, bot de WhatsApp y asistente)', "path: 'ventas'" in nav and "path: 'whatsapp-bot'" in nav and "clave: 'asistente_peticiones'" in nav)
    mira('herramientas.js: la tarjeta reservas-producto esta UNA vez, bajo la bandera del nucleo y tras Operaciones',
         her.count("herr:'reservas-producto'") == 1 and her.index("herr:'reservas-producto'") > her.index('window.AXW_NUCLEO_OPERACION')
         and her.index("herr:'reservas-producto'") > her.index("herr:'operaciones'"))
    # la casilla existe de verdad cuando el catalogo se evalua con la bandera del nucleo (Usuarios la deriva de este array)
    prueba = ("global.window = { AXW_NUCLEO_OPERACION: true }; var LW_ROL = {}; " + re.sub(r'^\s*export\s+', '', her, flags=re.M) +
              "\nconsole.log(JSON.stringify((typeof LW_HERRAMIENTAS !== 'undefined' ? LW_HERRAMIENTAS : []).filter(t => t.herr === 'reservas-producto').map(t => [t.grupo, t.href])));")
    tmp = tempfile.mkdtemp()
    open(os.path.join(tmp, 'h.js'), 'w', encoding='utf-8').write(prueba)
    sal = subprocess.run(['node', os.path.join(tmp, 'h.js')], capture_output=True, text=True, encoding='utf-8')
    try:
        tarj = json.loads(sal.stdout.strip().splitlines()[-1]) if sal.stdout.strip() else None
    except Exception:
        tarj = None
    mira('con la bandera del nucleo, el catalogo de herramientas trae la tarjeta (Seguimiento, /intranet/v4/reservas-producto/)' + ('' if tarj is not None else ' [no se pudo evaluar: ' + (sal.stderr or sal.stdout)[-200:] + ']'),
         tarj == [['Seguimiento', '/intranet/v4/reservas-producto/']])

# -- (2) si Lawang cambia un trozo, el build PARA (y no deja un menu a medias)
ORIGINAL = {f: open(os.path.join(build.LAWANG, *f.split('/')), encoding='utf-8').read() for f in FICHEROS}
ANCLA_HER = "claves:'plantillas plantilla modelos contrato tipos de contrato prefijo numeracion campos borrador activar templates template contract types prefix fields draft activate' });\n}"
mira('el ancla de herramientas.js existe una vez en Lawang', ORIGINAL['contracts/assets/herramientas.js'].count(ANCLA_HER) == 1)
mira('para si Lawang cambia el cierre del bloque del nucleo en herramientas.js',
     corre({'contracts/assets/herramientas.js': lambda t: t.replace(ANCLA_HER, ANCLA_HER.replace("' });", "'  });", 1))})[0] == 'para')
mira('para si ese trozo de herramientas.js aparece dos veces', corre({'contracts/assets/herramientas.js': lambda t: t + '\n' + ANCLA_HER + '\n'})[0] == 'para')
mira('para si falta la pantalla de Ventas en la cadena (sus anclas de nav.js son las que deja ella: el orden importa)',
     corre(pasos=(build.asistente_maestro, build.whatsapp_bot_pantalla, build.ajustes_correo_maestro, build.reservas_producto_pantalla))[0] == 'para')
mira('para si la cascara de /asistente/ ya no tiene la forma esperada',
     corre({'intranet/v4/asistente/index.html': lambda t: t.replace('<div class="flex flex-col w-full gap-8">', '<div class="otra">', 1)})[0] == 'para')
def sin_marcador():
    alt = tempfile.mkdtemp()
    for otro in ('asistente_peticiones.html', 'whatsapp_bot.html', 'bot_alta.html', 'ajustes_correo.js', 'ventas.html'):
        shutil.copy(os.path.join(AQUI, otro), os.path.join(alt, otro))
    open(os.path.join(alt, 'reservas_producto.html'), 'w', encoding='utf-8').write(FUENTE.replace('<!--AXW_SCRIPT-->', ''))
    viejo, build.AQUI = build.AQUI, alt        # la fuente alterada vive en otra carpeta: reservas_producto.html no se toca
    try:
        return corre()[0] == 'para'
    finally:
        build.AQUI = viejo
mira('para si falta el marcador AXW_SCRIPT en reservas_producto.html', sin_marcador())
mira('Lawang no se toco: los ficheros siguen igual', all(open(os.path.join(build.LAWANG, *f.split('/')), encoding='utf-8').read() == ORIGINAL[f] for f in FICHEROS))

# -- (3) reglas de seguridad del front
mira('ningun innerHTML ni insertAdjacentHTML ni outerHTML ni document.write', not re.search(r'innerHTML|insertAdjacentHTML|outerHTML|document\.write|\.append\(\s*`', CODIGO))
mira('no usa el esc() de Lawang (no escapa la comilla simple) ni lwCajonHtml / H.dato / H.seccion', not re.search(r'\besc\(|lwCajonHtml|H\.dato|H\.seccion|lwCajon\(', CODIGO))
mira('ningun console.log', 'console.log' not in CODIGO)
mira('no nombra claves de servicio', not re.search(r'service_role|sb_secret_', JS + MARCADO))
mira('el navegador no escribe ni lee tablas: ni .from( ni insert/update/upsert/delete', not re.search(r'\.from\(|\.insert\(|\.update\(|\.upsert\(|\.delete\(|\.storage\b', CODIGO))
PERMITIDAS = {'reservas_producto_datos', 'producto_flota_datos', 'reserva_producto_pagos_datos', 'clientes_datos',
              'reserva_producto_crea', 'reserva_producto_estado', 'reserva_cancela_con_devolucion', 'reserva_producto_cambia_unidad'}
llamadas = set(re.findall(r"\bllama\('([a-z_]+)'", CODIGO))
literales = set(re.findall(r"(?:SB\.rpc|window\.lwDatos)\('([a-z_]+)'", CODIGO))
mira('cada RPC lleva su nombre LITERAL (para que contrato_front.py la vea) y son exactamente las del plan (' + ', '.join(sorted(literales ^ PERMITIDAS)) + ')', literales == PERMITIDAS)
mira('las RPC que llama son exactamente las del plan (' + ', '.join(sorted(llamadas ^ PERMITIDAS)) + ')', llamadas == PERMITIDAS)
mira('lo que lee va por lwDatos y solo *_datos; lo que escribe va por sb.rpc', set(re.findall(r"window\.lwDatos\('([a-z_]+)'", CODIGO)) == {n for n in PERMITIDAS if n.endswith('_datos')}
     and set(re.findall(r"SB\.rpc\('([a-z_]+)'", CODIGO)) == {n for n in PERMITIDAS if not n.endswith('_datos')})
mira('ninguna lectura por .rpc(...).select() ni encadenada', '.select(' not in CODIGO and not re.search(r"\.rpc\([^)]*\)\s*\.", CODIGO))
# el navegador pide, no decide: ni precio, ni total, ni estado de pago, ni importe de la reserva
mira('el precio nunca viaja: la reserva manda producto, unidad, cliente o contacto, fechas, direcciones y notas',
     re.search(r"var datos = \{ producto_id: selP\.value, desde: desde\.value, hasta: hasta\.value \};", CODIGO) is not None
     and not re.search(r'precio_total\s*:|precio_unitario\s*:|p_total|p_importe(?!_devuelto)|p_precio|descuento|[{,]\s*pago_referencia\s*:|datos\.(estado|precio|moneda|desglose|dias|origen|numero)', CODIGO))
claves_datos = set(re.findall(r"datos\.([a-z_]+)\s*=", CODIGO))
mira('las unicas claves que se anaden a p_datos son las que la base lee (' + ', '.join(sorted(claves_datos)) + ')',
     claves_datos <= {'unidad_id', 'client_id', 'contacto_nombre', 'contacto_telefono', 'entrega_direccion', 'recogida_direccion', 'notas'})
mira('crear: llama a reserva_producto_crea con p_datos y p_bloqueo_minutos y lee de vuelta id y numero_reserva', "llama('reserva_producto_crea', { p_datos: datos, p_bloqueo_minutos: minutos })" in CODIGO and '!d.id || !d.numero_reserva' in CODIGO)
mira('el precio que se ensena tras crear sale de la respuesta de la base', "dinero(d.precio_total, d.moneda)" in CODIGO)
mira('el cambio de estado manda solo id, estado y nota, y no se da por hecho si la base no devuelve el estado', "var args = { p_id: x.id, p_estado: nuevo };" in CODIGO and 'r.data !== nuevo' in CODIGO)
mira('los estados que puede pedir son exactamente los de la maquina de la base', set(re.findall(r"^\s*(\w+): \{ titulo:", CODIGO, flags=re.M)) == {'confirmada', 'en_curso', 'devuelta', 'cancelada'})
mira('cancelar con devolucion manda reserva, importe, referencia y motivo, y lee de vuelta estado y reserva_id',
     "{ p_reserva: x.id, p_importe_devuelto: Number(texto), p_referencia_devolucion: rf || null, p_motivo: m }" in CODIGO and "d.estado !== 'cancelada' || d.reserva_id !== x.id" in CODIGO)
mira('el importe devuelto solo se valida de forma numerica (la base compara con lo cobrado y decide)', r"/^\d+(\.\d+)?$/.test(texto)" in CODIGO)
mira('cambiar la unidad manda id y unidad y lee de vuelta la unidad', "{ p_id: x.id, p_unidad_id: sel.value }" in CODIGO and 'r.data !== sel.value' in CODIGO)
mira('la flota se relee antes de ofrecer cambiar de unidad (una moto en taller no se ofrece) y solo se ofrecen las disponibles', "u.estado === 'disponible' && u.id !== x.unidad_id" in CODIGO and CODIGO.count('E.flotaCargada = false;') >= 3)
mira('el formulario solo ofrece unidades disponibles', "p.unidades.filter(function (u) { return u.estado === 'disponible'; })" in CODIGO)
mira('doble clic: un solo envio a la vez (ocupa/libera en cada accion que escribe)', 'function ocupa' in CODIGO and CODIGO.count('ocupa(bt)') >= 4 and CODIGO.count('libera(bt)') >= 4)
mira('enganche por data-accion; ningun texto de boton se usa para encontrar nada', not re.search(r'textContent\s*===|innerText|\.placeholder|querySelector\([^)]*placeholder', CODIGO))
mira('las fechas de calendario se parten a mano (new Date("YYYY-MM-DD") ensena el dia anterior al oeste de UTC)', "new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))" in CODIGO and not re.search(r"new Date\(\s*(x\.desde|x\.hasta|d|s)\s*\)", CODIGO))
mira('la lista distingue vacia de no se ha podido mirar en reservas, calendario, flota y pagos', CODIGO.count("T('No se ha podido mirar') + ': '") >= 5 and 'No hay reservas con ese filtro.' in CODIGO and 'No hay pagos por revisar.' in CODIGO)
mira('pagos por revisar dice que es solo de la administracion (no lo da por vacio)', "tipo: 'solo_admin'" in CODIGO and 'Solo la administración puede ver los pagos por revisar' in CODIGO)
mira('modulo apagado en una lectura se dice (no es no hay nada)', "tipo: 'modulo_apagado'" in CODIGO and 'Esto NO quiere decir que no haya nada' in CODIGO)
mira('RPC no disponible (PGRST202 / 404) tiene mensaje propio', "'PGRST202'" in CODIGO and 'Esta función todavía no está disponible en esta base' in CODIGO)
mira('el hueco de reclamar (sin_reclamar) solo se pinta si llega (degrada sin F1 parte 2)', "x.sin_reclamar === true" in CODIGO)
acciones_marcado = set(re.findall(r'data-accion="(rp-[a-z-]+)"', MARCADO))
acciones_codigo = set(re.findall(r"(?:\), |accion: )'(rp-[a-z-]+)'", CODIGO)) - {'rp-num'}   # rp-num es una clase CSS, no una accion
mira('todo data-accion del marcado tiene manejador (' + ', '.join(sorted(a for a in acciones_marcado if ("a === '" + a + "'") not in CODIGO)) + ')',
     all(("a === '" + a + "'") in CODIGO for a in acciones_marcado))
mira('todo data-accion que crea el codigo tiene manejador o es del dialogo',
     all((("a === '" + a + "'") in CODIGO) or a.startswith('rp-modal') for a in acciones_codigo))

# -- (4) diccionario ES/EN
bloque = JS[JS.index('var EN_RP = {'):JS.index('if (window.LW_EN')]
tmp = tempfile.mkdtemp()
js_claves = os.path.join(tmp, 'k.js')
open(js_claves, 'w', encoding='utf-8').write(bloque + '\nconsole.log(JSON.stringify(Object.keys(EN_RP)));')
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
for mm in re.finditer(r"\bT\('((?:[^'\\]|\\.)*)'\)", JS):
    exige(lit(mm.group(1)), 'T()')
for mm in re.finditer(r"T\([^'()]*\? '((?:[^'\\]|\\.)*)'\s*:\s*'((?:[^'\\]|\\.)*)'\)", JS):
    for g in mm.groups():
        exige(lit(g), 'T(a?b:c)')
for mm in re.finditer(r"\bcampo\('((?:[^'\\]|\\.)*)'", JS):
    exige(lit(mm.group(1)), 'campo()')
for var in ('ESTADO', 'UNIDAD'):
    seg = JS[JS.index('var ' + var + ' = '):]
    seg = seg[:seg.index('\n')]
    for mm in re.finditer(r"\['([A-Za-zÁÉÍÓÚáéíóúñ ]+)', '", seg):
        exige(mm.group(1), var)
seg = JS[JS.index('var PASOS = {'):JS.index('function cambiaEstado')]
for mm in re.finditer(r"(?:titulo|si|hecho): '((?:[^'\\]|\\.)*)'", seg):
    exige(lit(mm.group(1)), 'PASOS')
for mm in re.finditer(r"tabla\(\$v\('[a-z-]+'\), (\[\[.*?\]\]), ", JS):
    for c in re.findall(r"\['((?:[^'\\]|\\.)*)'(?:, 'rp-num')?\]", mm.group(1)):
        exige(lit(c), 'cabecera')
for mm in re.finditer(r"\['([A-ZÁÉÍÓÚ][^'\\]*)', (?:x\.|fecha|T\(|dinero|p\.|importe|'|Number)", JS):
    exige(mm.group(1), 'resumen')
for mm in re.finditer(r'<(\w+)[^>]*data-lwt[^>]*>([^<]+)</\1>', MARCADO):
    exige(mm.group(2).strip(), 'data-lwt')
mira('todo texto pintable esta en el diccionario ES/EN' + (' (faltan: ' + '; '.join(sin[:10]) + ')' if sin else ''), not sin)
bloque_lineas = re.findall(r"'((?:[^'\\]|\\.)*)'\s*:\s*'", bloque)
repetidas = sorted({c for c in bloque_lineas if bloque_lineas.count(c) > 1})
mira('ninguna clave repetida en EN_RP' + (' (' + ', '.join(repetidas) + ')' if repetidas else ''), not repetidas)

if fallos:
    print('FALLOS (%d de %d):\n  ' % (len(fallos), casos) + '\n  '.join(fallos))
    sys.exit(1)
print('ok: %d comprobaciones' % casos)
