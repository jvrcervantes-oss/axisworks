# Prueba de build.py:ventas_pantalla() + ventas.html (F4 «Pantalla de factura», 8-oct-2026): python test_ventas.py
# Parte de los ficheros REALES de Lawang (proyectos/Lawang, solo lectura) copiados a una carpeta temporal y corre la CADENA entera de overlays
# del maestro en el orden de instancia() (asistente → bot de WhatsApp → correo → ventas): así las anclas de nav.js se cuentan DESPUÉS de lo que
# ya reescribieron las demás, que es como se va a encontrar el build de verdad. Mira que (1) la pantalla entra y todo el JS compila,
# (2) si Lawang cambia cualquiera de las tres anclas de nav.js (o la cáscara) el build PARA, (3) la pantalla cumple las reglas de seguridad del
# front escritas antes de construirla (sin innerHTML ni esc(), solo las RPC con llamador, nada de .from(), el precio nunca viaja), y (4) todo
# texto que pinta está en el diccionario ES/EN. El comportamiento en un navegador lo mide pruebas/ventas.harness.cjs (necesita Chromium).
# NO ejecuta build.instancia(): no escribe nada en erp/despliegues/.
import json, os, re, shutil, subprocess, sys, tempfile
AQUI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, AQUI)
import build

FUENTE = open(os.path.join(AQUI, 'ventas.html'), encoding='utf-8').read()
MARCADO, SCRIPT = FUENTE.split('<!--AXW_SCRIPT-->')
JS = SCRIPT.strip()
CODIGO = re.sub(r'/\*.*?\*/', '', JS, flags=re.S)          # los comentarios cuentan el porqué y nombran lo prohibido: las reglas miran el código
CODIGO = re.sub(r'(?m)^\s*//.*$', '', CODIGO)
FICHEROS = ['intranet/v4/asistente/index.html', 'intranet/v4/assets/nav.js', 'contracts/assets/herramientas.js',
            'intranet/v4/assets/editores.js', 'intranet/v4/assets/ajustes.js']


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


def corre(cambia=None):
    d = prepara(cambia)
    viejo, build.DIST = build.DIST, d
    try:
        for paso in (build.asistente_maestro, build.whatsapp_bot_pantalla, build.ajustes_correo_maestro, build.ventas_pantalla):
            paso()
        return 'pasa', d
    except SystemExit:
        return 'para', d
    finally:
        build.DIST = viejo


def lee(d, ruta):
    return open(os.path.join(d, *ruta.split('/')), encoding='utf-8').read()


fallos, casos = [], 0
def mira(nombre, ok):
    global casos
    casos += 1
    if not ok:
        fallos.append(nombre)

# ── (1) la cadena entera entra y compila
r, d = corre()
mira('la cadena de overlays entra sobre los ficheros de Lawang de hoy', r == 'pasa')
pagina = lee(d, 'intranet/v4/ventas/index.html') if r == 'pasa' else ''
nav = lee(d, 'intranet/v4/assets/nav.js') if r == 'pasa' else ''
mira('la página lleva la puerta de tres herramientas y ya no la del asistente', 'data-herramienta="facturas,operaciones,reservas-producto"' in pagina and 'data-herramienta="asistente"' not in pagina)
mira('el título es Ventas', '<title data-lw-titulo>Ventas</title>' in pagina)
mira('la pantalla de Lawang (asistente) no se mezcla en la nueva', 'asistente-peticiones' not in pagina and 'Telegram' not in pagina)
mira('el marcado de la fuente entra una vez y el script una vez', pagina.count('<div class="flex flex-col w-full gap-8" data-vt="raiz">') == 1 and pagina.count('var EN_VT = {') == 1)
tmp = tempfile.mkdtemp()
m = re.findall(r'<script>\n(.*?)\n</script>\n</body></html>', pagina, flags=re.S)
if m:
    open(os.path.join(tmp, 'v.js'), 'w', encoding='utf-8').write(m[-1])
chk = subprocess.run(['node', '--check', os.path.join(tmp, 'v.js')], capture_output=True, text=True, encoding='utf-8') if m else None
mira('el script de la página resultante compila (node --check)' + (': ' + chk.stderr.strip()[:300] if chk is not None and chk.returncode else ''), bool(m) and chk.returncode == 0)
if r == 'pasa':
    open(os.path.join(tmp, 'nav.js'), 'w', encoding='utf-8').write(nav)
    chk2 = subprocess.run(['node', '--check', os.path.join(tmp, 'nav.js')], capture_output=True, text=True, encoding='utf-8')
    mira('el nav.js resultante compila' + (': ' + chk2.stderr.strip()[:300] if chk2.returncode else ''), chk2.returncode == 0)
    mira('nav.js: entrada de menú, injerto (con núcleo) y casilla, una vez cada uno',
         nav.count("path: 'ventas', texto: 'Ventas', clave: 'facturas', nucleo: true, mismaCasilla: true") == 1
         and nav.count("path: 'ventas',     tras: 'reservas'") == 1 and nav.count("ventas: ['facturas', 'operaciones', 'reservas-producto']") == 1)
    mira('lo que ya habían puesto las otras pantallas sigue en nav.js (bot de WhatsApp y asistente)', "path: 'whatsapp-bot'" in nav and "clave: 'asistente_peticiones'" in nav)
    mira('el injerto de Ventas viene DESPUÉS del de Reservas (cuelga de él)', nav.index("path: 'reservas',   tras: 'vencimientos'") < nav.index("path: 'ventas',     tras: 'reservas'"))
    mira('puedeVer sigue sin dejar pasar a un rol sin las casillas: CLAVE_MENU.ventas existe antes de la línea que la usa', nav.index("ventas: ['facturas'") < nav.index('var k = CLAVE_MENU[path];'))

# ── (2) si Lawang cambia un trozo, el build PARA (y no deja un menú a medias)
ORIGINAL = {f: open(os.path.join(build.LAWANG, *f.split('/')), encoding='utf-8').read() for f in FICHEROS}
for nombre, fich, viejo in (
        ('la entrada de Reservas del menú', 'intranet/v4/assets/nav.js', "      { path: 'reservas', texto: 'Reservas', clave: 'reservas' }] },"),
        ('el injerto de Reservas', 'intranet/v4/assets/nav.js', "    { path: 'reservas',   tras: 'vencimientos', icono: 'event_upcoming', texto: 'Reservas' },"),
        ('CLAVE_MENU', 'intranet/v4/assets/nav.js', "    facturas: 'facturas', recibos: 'recibos', comisiones:")):
    mira('para si Lawang cambia ' + nombre, corre({fich: lambda t, v=viejo: t.replace(v, v.replace(':', ' :', 1))})[0] == 'para')
    mira('para si ' + nombre + ' aparece dos veces', corre({fich: lambda t, v=viejo: t + '\n' + v + '\n'})[0] == 'para')
mira('para si la cáscara de /asistente/ ya no tiene la forma esperada',
     corre({'intranet/v4/asistente/index.html': lambda t: t.replace('<div class="flex flex-col w-full gap-8">', '<div class="otra">', 1)})[0] == 'para')
def sin_marcador():
    alt = tempfile.mkdtemp()
    for otro in ('asistente_peticiones.html', 'whatsapp_bot.html', 'bot_alta.html', 'ajustes_correo.js'):
        shutil.copy(os.path.join(AQUI, otro), os.path.join(alt, otro))
    open(os.path.join(alt, 'ventas.html'), 'w', encoding='utf-8').write(FUENTE.replace('<!--AXW_SCRIPT-->', ''))
    viejo, build.AQUI = build.AQUI, alt        # la fuente alterada vive en otra carpeta: ventas.html no se toca
    try:
        return corre()[0] == 'para'
    finally:
        build.AQUI = viejo
mira('para si falta el marcador AXW_SCRIPT en ventas.html', sin_marcador())
mira('Lawang no se tocó: los ficheros siguen igual', all(open(os.path.join(build.LAWANG, *f.split('/')), encoding='utf-8').read() == ORIGINAL[f] for f in FICHEROS))

# ── (3) reglas de seguridad del front
mira('ningún innerHTML ni insertAdjacentHTML ni outerHTML ni document.write', not re.search(r'innerHTML|insertAdjacentHTML|outerHTML|document\.write|\.append\(\s*`', CODIGO))
mira('no usa el esc() de Lawang (no escapa la comilla simple) ni lwCajonHtml / H.dato / H.seccion', not re.search(r'\besc\(|lwCajonHtml|H\.dato|H\.seccion|lwCajon\(', CODIGO))
mira('ningún console.log', 'console.log' not in CODIGO)
mira('no nombra claves de servicio', not re.search(r'service_role|sb_secret_', JS + MARCADO))
mira('el navegador no escribe ni lee tablas: ni .from( ni insert/update/upsert/delete', not re.search(r'\.from\(|\.insert\(|\.update\(|\.upsert\(|\.delete\(|\.storage\b', CODIGO))
PERMITIDAS = {'operaciones_cola_datos', 'reservas_producto_datos', 'reservas_cobradas_sin_facturar', 'factura_lineas_datos', 'reserva_asigna_cliente',
              'factura_desde_operacion', 'factura_producto_crea', 'factura_emite', 'factura_rectifica', 'factura_borrador_descarta'}
llamadas = set(re.findall(r"\bllama\('([a-z_]+)'", CODIGO))
literales = set(re.findall(r"(?:SB\.rpc|window\.lwDatos)\('([a-z_]+)'", CODIGO))
mira('cada RPC lleva su nombre LITERAL (para que contrato_front.py la vea) y son exactamente las del plan (' + ', '.join(sorted(literales ^ PERMITIDAS)) + ')', literales - {'facturas_equipo'} == PERMITIDAS)
mira('las RPC que llama son exactamente las del plan (' + ', '.join(sorted(llamadas ^ PERMITIDAS)) + ')', llamadas == PERMITIDAS)
mira('la única otra lectura es facturas_equipo (la de la pantalla de operaciones)', set(re.findall(r"\.rpc\('([a-z_]+)'", CODIGO)) - PERMITIDAS == {'facturas_equipo'})
mira('lwDatos solo para *_datos', "/_datos$/.test(nombre)" in CODIGO)
mira('el precio nunca viaja: la venta manda producto y cantidad, nada más', "prods.push({ producto_id: pid, cantidad: cant })" in CODIGO and re.search(r'p_lineas: prods', CODIGO)
     and not re.search(r'precio_unitario\s*:|p_total|p_importe|p_precio|descuento_pct\s*:', CODIGO))
mira('la reclamación manda reserva y cliente, no importes', "{ p_reserva: res.id, p_cliente: clienteId }" in CODIGO)
mira('la clave de idempotencia sale de crypto.getRandomValues y cumple ^[A-Za-z0-9_-]{8,80}$', 'getRandomValues' in CODIGO and re.fullmatch(r'[A-Za-z0-9_-]{8,80}', 'vt-' + '0123456789abcdef' * 2))
mira('la clave se reinicia si cambia el contenido de la venta', CODIGO.count('E.venta.clave = null') >= 4)
mira('los lectores que la base no tiene valen null (no se inventa ninguna RPC)', 'var LECT = { clientes: null, productos: null, emisor: null };' in CODIGO)
mira('las tres acciones sin lector salen BLOQUEADAS con motivo (reclamar, nueva venta)', 'Falta el lector de clientes en la base' in CODIGO and 'Falta el lector de productos en la base' in CODIGO)
mira('enganche por data-accion; ningún texto de botón se usa para encontrar nada', not re.search(r'textContent\s*===|innerText|\.placeholder|querySelector\([^)]*placeholder', CODIGO))
mira('emitir: no se da por emitida sin leer el número de vuelta', "x.estado !== 'emitida' || !x.numero" in CODIGO)
mira('descartar y rectificar leen el estado de vuelta', "r.data.estado !== 'descartada'" in CODIGO and "r.data.estado !== 'borrador'" in CODIGO)
mira('el motivo de descartar (500) y de rectificar (300) se limitan', "m.length > 500" in CODIGO and "m.length > 300" in CODIGO and "maxlength: '500'" in CODIGO and "maxlength: '300'" in CODIGO)
mira('reclamar avisa de que es irreversible y muestra cliente, importe, pago y producto', 'Reclamar es irreversible' in CODIGO and all(k in CODIGO[CODIGO.index('function confirmaReclamo'):CODIGO.index('function confirmaReclamo') + 700] for k in ("['Cliente'", "['Importe'", "['Referencia de pago'", "['Producto'")))
mira('la cola distingue vacía, apagado y sin permiso', all(k in CODIGO for k in ("motivo === 'reservas_apagado'", "'No hay reservas cobradas sin facturar.'", "c.tipo === 'sin_permiso'")))
mira('«RPC no disponible» (PGRST202 / 404) tiene mensaje propio', "'PGRST202'" in CODIGO and 'la actualización F4 no está aplicada' in CODIGO)
mira('las líneas del borrador no tienen inputs editables (solo los de cantidad a abonar al rectificar)', len(re.findall(r"h\('input'", CODIGO)) == 4)
mira('doble clic: un solo envío a la vez', 'function ocupa' in CODIGO and CODIGO.count('ocupa(') >= 7 and CODIGO.count('libera(') >= 7)
mira('los botones de la fila llevan data-accion; no hay data-accion repetido sin manejador',
     all(('"' + a + '"') in MARCADO or ("'" + a + "'") in CODIGO for a in set(re.findall(r"data-accion=\"(vt-[a-z-]+)\"", MARCADO))))

# ── (4) diccionario ES/EN
bloque = JS[JS.index('var EN_VT = {'):JS.index('if (window.LW_EN')]
js_claves = os.path.join(tmp, 'k.js')
open(js_claves, 'w', encoding='utf-8').write(bloque + '\nconsole.log(JSON.stringify(Object.keys(EN_VT)));')
claves = set(json.loads(subprocess.run(['node', js_claves], capture_output=True, text=True, encoding='utf-8').stdout or '[]'))
total_lineas = len(re.findall(r"^\s*'(?:[^'\\]|\\.)*'\s*:\s*'", bloque, flags=re.M)) + len(re.findall(r"'\s*:\s*'(?:[^'\\]|\\.)*',\s*'(?:[^'\\]|\\.)*'\s*:\s*'", bloque))
i18n = open(os.path.join(build.LAWANG, 'contracts', 'assets', 'i18n.js'), encoding='utf-8').read()
def conocida(c):
    return c in claves or ("'" + c.replace("'", "\\'") + "':") in i18n or ('"' + c + '":') in i18n
sin = []
def exige(c, donde):
    if c and not conocida(c):
        sin.append(donde + ': ' + c[:70])
for mm in re.finditer(r"\bT\('((?:[^'\\]|\\.)*)'\)", JS):
    exige(mm.group(1).replace("\\'", "'"), 'T()')
for mm in re.finditer(r"T\([^'()]*\? '((?:[^'\\]|\\.)*)'\s*:\s*'((?:[^'\\]|\\.)*)'\)", JS):
    for g in mm.groups():
        exige(g.replace("\\'", "'"), 'T(a?b:c)')
bloque_hint = JS[JS.index('var TEXTO_HINT = {'):JS.index('/* Mensaje para la persona')]
for mm in re.finditer(r":\s*'((?:[^'\\]|\\.)*)'[,\n]", bloque_hint):
    exige(mm.group(1).replace("\\'", "'"), 'TEXTO_HINT')
for var in ('ESTADO_OP', 'ORIGEN'):
    seg = JS[JS.index('var ' + var + ' = '):]
    seg = seg[:seg.index('\n')]
    for mm in re.finditer(r"(?:\['|: ')((?:[A-Za-zÁÉÍÓÚáéíóúñ ]+))'", seg):
        exige(mm.group(1), var)
for mm in re.finditer(r"\[\['(?:[^\]]*?)\]\]|\['([A-ZÁÉÍÓÚ][^']*)'(?:, 'vt-num')?\]", JS):
    if mm.group(1): exige(mm.group(1), 'cabecera/etiqueta')
for mm in re.finditer(r'<(\w+)[^>]*data-lwt[^>]*>([^<]+)</\1>', MARCADO):
    exige(mm.group(2).strip(), 'data-lwt')
mira('todo texto pintable está en el diccionario ES/EN' + (' (faltan: ' + '; '.join(sin[:8]) + ')' if sin else ''), not sin)
claves_lista = re.findall(r"^\s*'((?:[^'\\]|\\.)*)'\s*:\s*'", bloque, flags=re.M)
mira('ninguna clave repetida en EN_VT', len(claves_lista) == len(set(claves_lista)))

if fallos:
    print('FALLOS (%d de %d):\n  ' % (len(fallos), casos) + '\n  '.join(fallos))
    sys.exit(1)
print('ok: %d comprobaciones' % casos)
