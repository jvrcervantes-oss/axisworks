# Prueba de build.py:flota_pantalla() + flota.html + _compartido/pantalla_comun.{js,css} + el enlace «Editar flota» de reservas_producto.html (F8, 10-oct-2026): python test_flota.py
# Igual que test_reservas_producto.py: parte de los ficheros REALES de Lawang (proyectos/Lawang, solo lectura) copiados a una carpeta temporal y corre la CADENA entera
# de overlays del maestro en el orden de instancia() (asistente, bot de WhatsApp, correo, ventas, reservas de producto, taller, entrega, flota). Mira que (1) la pantalla entra con las
# ayudas comunes pegadas UNA vez y todo el JS compila, (2) si algo cambia (un ancla de Lawang, la cadena, una marca o un fichero comun) el build PARA, (3) la pantalla
# cumple las reglas de seguridad del front (sin innerHTML ni esc(), solo las cinco RPC del contrato, nada de .from(), ni autor ni version propia ni fechas viajan) y (4) todo texto que
# pinta esta en el diccionario ES/EN. El comportamiento en un navegador lo mide pruebas/flota.harness.cjs.
# NO ejecuta build.instancia(): no escribe nada en erp/despliegues/.
import json, os, re, shutil, subprocess, sys, tempfile
AQUI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, AQUI)
import build

FUENTE = open(os.path.join(AQUI, 'flota.html'), encoding='utf-8').read()
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
RP = open(os.path.join(AQUI, 'reservas_producto.html'), encoding='utf-8').read()
FICHEROS = ['intranet/v4/asistente/index.html', 'intranet/v4/assets/nav.js', 'contracts/assets/herramientas.js',
            'intranet/v4/assets/editores.js', 'intranet/v4/assets/ajustes.js']


def cadena():
    return (build.asistente_maestro, build.whatsapp_bot_pantalla, build.ajustes_correo_maestro, build.ventas_pantalla, build.reservas_producto_pantalla,
            build.taller_pantalla, build.entrega_pantalla, build.flota_pantalla)


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
pagina = lee(d, 'intranet/v4/flota/index.html') if r == 'pasa' else ''
nav = lee(d, 'intranet/v4/assets/nav.js') if r == 'pasa' else ''
her = lee(d, 'contracts/assets/herramientas.js') if r == 'pasa' else ''
mira('la pagina lleva la puerta de la herramienta flota y ya no la del asistente', 'data-herramienta="flota"' in pagina and 'data-herramienta="asistente"' not in pagina)
mira('el titulo es Flota y tarifas', '<title data-lw-titulo>Flota y tarifas</title>' in pagina)
mira('las pantallas de Lawang, Taller y Entrega no se mezclan en la nueva', 'asistente-peticiones' not in pagina and 'Telegram' not in pagina and 'data-tl="raiz"' not in pagina and 'data-en="raiz"' not in pagina)
mira('el marcado y el script de la fuente entran una vez', pagina.count('<div class="flex flex-col w-full gap-8" data-fl="raiz">') == 1 and pagina.count('var EN_FL = {') == 1)
mira('las ayudas comunes se pegan UNA vez (js y css) y las marcas no quedan en la pagina',
     pagina.count('function axwComun(raiz, T)') == 1 and pagina.count('.axw-boton{') == 1 and '/*AXW_COMUN_' not in pagina)
mira('NO hay otra copia local de las ayudas (h, dialogo, clasifica, ocupa, tabla, chip, importe...) fuera de las comunes',
     len(re.findall(r'function (h|dialogo|clasifica|ocupa|libera|tabla|chip|celda|boton|campo|resumen|dinero|fechaHora|importe|numero)\(', CODIGO)) == 0)
m = re.findall(r'<script>\n(.*?)\n</script>\n</body></html>', pagina, flags=re.S)
chk = compila(m[-1], 'v.js') if m else None
mira('el script de la pagina resultante compila (node --check)' + (': ' + chk.stderr.strip()[:300] if chk is not None and chk.returncode else ''), bool(m) and chk.returncode == 0)
mira('la fuente de las ayudas comunes compila sola', compila(COMUN_JS, 'comun.js').returncode == 0)
if r == 'pasa':
    for nombre, cod in (('nav.js', nav), ('herramientas.js', her)):
        c2 = compila(cod, nombre)
        mira('el %s resultante compila%s' % (nombre, (': ' + c2.stderr.strip()[:300]) if c2.returncode else ''), c2.returncode == 0)
    mira('nav.js: entrada de menu, injerto (con nucleo) y casilla, una vez cada uno',
         nav.count("{ path: 'flota', texto: 'Flota y tarifas', clave: 'flota', nucleo: true }") == 1
         and nav.count("{ path: 'flota', tras: 'entrega'") == 1 and nav.count("flota: 'flota',") == 1)
    mira('el injerto de Flota viene DESPUES del de Entrega (cuelga de el)', nav.index("path: 'entrega', tras: 'taller'") < nav.index("path: 'flota', tras: 'entrega'"))
    mira('puedeVer no deja pasar a un rol sin la casilla: CLAVE_MENU de la pantalla existe antes de la linea que la usa', nav.index("flota: 'flota',") < nav.index('var k = CLAVE_MENU[path];'))
    mira('lo que habian puesto las otras pantallas sigue en nav.js (entrega, taller, reservas, ventas, bot de WhatsApp y asistente)',
         "path: 'entrega'" in nav and "path: 'taller'" in nav and "path: 'reservas-producto'" in nav and "path: 'ventas'" in nav and "path: 'whatsapp-bot'" in nav and "clave: 'asistente_peticiones'" in nav)
    mira('herramientas.js: la tarjeta flota esta UNA vez, bajo la bandera del nucleo y tras la de Entrega',
         her.count("herr:'flota'") == 1 and her.index("herr:'flota'") > her.index('window.AXW_NUCLEO_OPERACION') and her.index("herr:'flota'") > her.index("herr:'entrega'"))
    prueba = ("global.window = { AXW_NUCLEO_OPERACION: true }; var LW_ROL = {}; " + re.sub(r'^\s*export\s+', '', her, flags=re.M) +
              "\nconsole.log(JSON.stringify((typeof LW_HERRAMIENTAS !== 'undefined' ? LW_HERRAMIENTAS : []).filter(t => t.herr === 'flota').map(t => [t.grupo, t.href])));")
    tmp = tempfile.mkdtemp()
    open(os.path.join(tmp, 'h.js'), 'w', encoding='utf-8').write(prueba)
    sal = subprocess.run(['node', os.path.join(tmp, 'h.js')], capture_output=True, text=True, encoding='utf-8')
    try:
        tarj = json.loads(sal.stdout.strip().splitlines()[-1]) if sal.stdout.strip() else None
    except Exception:
        tarj = None
    mira('con la bandera del nucleo, el catalogo de herramientas trae la tarjeta (Seguimiento, /intranet/v4/flota/)' + ('' if tarj is not None else ' [no se pudo evaluar: ' + (sal.stderr or sal.stdout)[-200:] + ']'),
         tarj == [['Seguimiento', '/intranet/v4/flota/']])

# -- (2) si algo cambia, el build PARA (y no deja un menu a medias)
ORIGINAL = {f: open(os.path.join(build.LAWANG, *f.split('/')), encoding='utf-8').read() for f in FICHEROS}
mira('para si falta la pantalla de Entrega en la cadena (sus anclas de nav.js y herramientas.js son las que deja ella: el orden importa)',
     corre(pasos=(build.asistente_maestro, build.whatsapp_bot_pantalla, build.ajustes_correo_maestro, build.ventas_pantalla, build.reservas_producto_pantalla, build.taller_pantalla, build.flota_pantalla))[0] == 'para')
mira('para si Flota va ANTES que Entrega (el orden de la cadena importa)',
     corre(pasos=(build.asistente_maestro, build.whatsapp_bot_pantalla, build.ajustes_correo_maestro, build.ventas_pantalla, build.reservas_producto_pantalla, build.taller_pantalla, build.flota_pantalla, build.entrega_pantalla))[0] == 'para')
mira('para si la cascara de /asistente/ ya no tiene la forma esperada',
     corre({'intranet/v4/asistente/index.html': lambda t: t.replace('<div class="flex flex-col w-full gap-8">', '<div class="otra">', 1)})[0] == 'para')
mira('instancia() llama a flota_pantalla() justo despues de entrega_pantalla()',
     re.search(r'\n    entrega_pantalla\(\)[^\n]*\n    flota_pantalla\(\)', open(os.path.join(AQUI, 'build.py'), encoding='utf-8').read()) is not None)


def con_fuente_alterada(alterar=None, quitar_comun=None):
    alt = tempfile.mkdtemp()
    for otro in ('asistente_peticiones.html', 'whatsapp_bot.html', 'bot_alta.html', 'ajustes_correo.js', 'ventas.html', 'reservas_producto.html', 'taller.html', 'entrega.html'):
        shutil.copy(os.path.join(AQUI, otro), os.path.join(alt, otro))
    open(os.path.join(alt, 'flota.html'), 'w', encoding='utf-8').write(alterar(FUENTE) if alterar else FUENTE)
    os.makedirs(os.path.join(alt, '_compartido'))
    for f in ('pantalla_comun.js', 'pantalla_comun.css'):
        if f != quitar_comun:
            shutil.copy(os.path.join(AQUI, '_compartido', f), os.path.join(alt, '_compartido', f))
    viejo, build.AQUI = build.AQUI, alt        # la fuente alterada vive en otra carpeta: flota.html y _compartido no se tocan
    try:
        return corre()[0]
    finally:
        build.AQUI = viejo
mira('la fuente sin alterar pasa tambien desde otra carpeta (control de la prueba de abajo)', con_fuente_alterada() == 'pasa')
mira('para si falta el marcador AXW_SCRIPT en flota.html', con_fuente_alterada(lambda t: t.replace('<!--AXW_SCRIPT-->', '')) == 'para')
mira('para si la pagina usa una marca comun repetida', con_fuente_alterada(lambda t: t.replace('/*AXW_COMUN_CSS*/', '/*AXW_COMUN_CSS*/ /*AXW_COMUN_CSS*/')) == 'para')
mira('para si falta el fichero comun que la pagina pide', con_fuente_alterada(quitar_comun='pantalla_comun.js') == 'para')
mira('Lawang no se toco: los ficheros siguen igual', all(open(os.path.join(build.LAWANG, *f.split('/')), encoding='utf-8').read() == ORIGINAL[f] for f in FICHEROS))

# -- (3) reglas de seguridad del front (la pantalla Y las ayudas comunes que pega)
for nombre, cod in (('la pantalla', CODIGO), ('las ayudas comunes', CODIGO_COMUN)):
    mira('%s: ningun innerHTML ni insertAdjacentHTML ni outerHTML ni document.write' % nombre, not re.search(r'innerHTML|insertAdjacentHTML|outerHTML|document\.write|\.append\(\s*`', cod))
    mira('%s: no usa el esc() de Lawang (no escapa la comilla simple) ni lwCajonHtml / H.dato / H.seccion' % nombre, not re.search(r'\besc\(|lwCajonHtml|H\.dato|H\.seccion|lwCajon\(', cod))
    mira('%s: ningun console.log' % nombre, 'console.log' not in cod)
    mira('%s: el navegador no escribe ni lee tablas: ni .from( ni insert/update/upsert/delete ni storage' % nombre, not re.search(r'\.from\(|\.insert\(|\.update\(|\.upsert\(|\.delete\(|\.storage\b|localStorage|sessionStorage', cod))
mira('no nombra claves de servicio', not re.search(r'service_role|sb_secret_', JS + MARCADO + COMUN_JS))
mira('no trae un rol cableado: la pantalla no decide quien es admin (la base contesta 42501 y se dice DESPUES)',
     not re.search(r"rol\s*===|\.rol\b|es_admin|esAdmin|ficha\.|LW_ROL", CODIGO) and 'sin_permiso' in CODIGO)
PERMITIDAS = {'producto_flota_datos', 'producto_unidades_alta_lote', 'producto_unidad_guarda', 'producto_tarifa_guarda', 'producto_tarifa_borra'}
llamadas = set(re.findall(r"\bllama\('([a-z_]+)'", CODIGO))
literales = set(re.findall(r"(?:SB\.rpc|window\.lwDatos)\('([a-z_]+)'", CODIGO))
nombres_envia = set(re.findall(r"\benvia\('([a-z_]+)'", CODIGO))
mira('cada RPC lleva su nombre LITERAL (para que contrato_front.py la vea) y son exactamente las cinco del contrato (' + ', '.join(sorted(literales ^ PERMITIDAS)) + ')', literales == PERMITIDAS)
mira('las RPC que llama (llama/envia) son exactamente las del contrato (' + ', '.join(sorted((llamadas | nombres_envia) ^ PERMITIDAS)) + ')', (llamadas | nombres_envia) == PERMITIDAS)
mira('lo que lee va por lwDatos y solo producto_flota_datos; lo que escribe va por sb.rpc', set(re.findall(r"window\.lwDatos\('([a-z_]+)'", CODIGO)) == {'producto_flota_datos'}
     and set(re.findall(r"SB\.rpc\('([a-z_]+)'", CODIGO)) == PERMITIDAS - {'producto_flota_datos'})
mira('ninguna lectura por .rpc(...).select() ni encadenada', '.select(' not in CODIGO and not re.search(r"\.rpc\([^)]*\)\s*\.", CODIGO))
# el navegador pide, no decide: argumentos EXACTOS del contrato; ni autor, ni fechas, ni importes calculados
mira('alta en lote manda solo producto, identificadores y motivo', "envia('producto_unidades_alta_lote', { p_producto_id: pid, p_identificadores: a.valores, p_motivo: m.v }" in CODIGO)
mira('guardar una moto manda solo id, {identificador, estado, notas}, motivo y la version que vio',
     "envia('producto_unidad_guarda', { p_id: id, p_datos: { identificador: idv, estado: selEl.value, notas: notas }, p_motivo: m.v, p_esperado: ctx.esperado }" in CODIGO)
mira('guardar un tramo manda producto, dias, precio, moneda, etiqueta, motivo y la version que vio (null si es nuevo)',
     "p_producto_id: pid, p_dias: r.v.dias, p_precio: r.v.precio, p_moneda: r.v.moneda, p_etiqueta: r.v.etiqueta || null, p_motivo: m.v, p_esperado: visto ? visto.esperado : null" in CODIGO)
mira('borrar un tramo manda id, motivo y la version que vio', "envia('producto_tarifa_borra', { p_id: tid, p_motivo: m.v, p_esperado: ctx.esperado }" in CODIGO)
mira('la version (actualizado_en) viaja TAL CUAL la dio la base: nunca pasa por Date ni se reformatea (los microsegundos de timestamptz se perderian y todo guardado daria 40001)',
     'actualizado_en' in CODIGO and not re.search(r'new Date\([^)]*actualizado_en|Date\.parse|\.toISOString\(', CODIGO))
mira('nada de autor, correo, fechas ni totales viaja a la base', not re.search(r'p_(autor|por|email|creado|actualizado|user|fecha|total)', CODIGO))
mira('los rangos duros salen de `topes` (nada de 100, 101, 366, 365 ni 500 cableados como limite)',
     'E.d.topes' in CODIGO and not re.search(r'\b(100|101|366|365|500|1000)\b', CODIGO) and "tope('lote')" in CODIGO and "tope('dias')" in CODIGO and "tope('motivo')" in CODIGO
     and "tope('identificador')" in CODIGO and "tope('unidades_por_producto')" in CODIGO and 'topes.precio' in CODIGO)
mira('las monedas salen de las claves de topes.precio.max_por_moneda (ni IDR ni EUR escritos en el codigo)', 'max_por_moneda' in CODIGO and not re.search(r"\b(IDR|EUR|USD)\b", CODIGO + MARCADO))
mira('el precio se parsea con la ayuda comun importe() (sin adivinar el separador) y se rechaza lo ambiguo', 'C.importe(precioEl.value' in CODIGO and "im.e === 'ambiguo'" in CODIGO and 'function importe' in CODIGO_COMUN)
mira('el precio se muestra de vuelta antes de confirmar (eco) con la moneda', "T('Se enviará')" in CODIGO and "'data-fl': 'eco'" in CODIGO)
mira('la matricula se normaliza como la base: recorte + mayusculas (nada mas)', ".replace(/^\\s+|\\s+$/g, '').toUpperCase()" in CODIGO)
mira('el lote se rechaza SIN enviar con mas lineas que topes.lote.max y no se quitan repetidas a escondidas (se marcan y se bloquea)',
     'tl.max != null && L.filas.length > tl.max' in CODIGO and "'repetida'" in CODIGO and "'existe'" in CODIGO and 'if (!a.ok)' in CODIGO)
mira('el lote dice que es todo o nada y, si falla, la base dice cual (su mensaje con textContent)', "T('No se ha añadido ninguna moto: el lote es todo o nada.')" in CODIGO and 'C.mensaje(err, false, PROPIOS)' in CODIGO)
mira('el conflicto de version (hint flota_cambio / 40001) tiene su boton de recargar conservando lo tecleado y toma la version NUEVA', "'flota_cambio'" in CODIGO and "'40001'" in CODIGO and "'fl-modal-recargar'" in CODIGO and 'ctx.esperado = f.' in CODIGO and 'instantanea()' in CODIGO)
mira('un tramo que ya existe se trata como cambio: manda la version de ESA fila (no null)', 'ctx.vistos[String(r.v.dias)]' in CODIGO and "T('Este tramo ya existe: lo que guardes cambia su precio.')" in CODIGO)
mira('moneda: con 2 o mas tramos se explica que hay que borrar y recrear', 'n >= 2' in CODIGO and 'borra los tramos y créalos de nuevo en la otra moneda' in CODIGO)
mira('borrar el ultimo tramo avisa que el producto deja de cotizarse', 'var ultimo = s.p.tarifas.length === 1' in CODIGO and 'el producto deja de cotizarse' in CODIGO)
mira('motivo obligatorio con el rango de topes.motivo (sin numeros escritos)', 'function validaMotivo' in CODIGO and "tope('motivo')" in CODIGO and not re.search(r'motivo\.length\s*[<>]\s*\d', CODIGO))
mira('doble clic: un solo envio a la vez (ocupa/libera) y una sola ventana (E.dialogo)', 'C.ocupa(btn)' in CODIGO and 'C.libera(btn)' in CODIGO and 'E.dialogo' in CODIGO and 'function ocupa' in CODIGO_COMUN)
mira('tras escribir se RELEE de la base (carga()) y no hay estado optimista: nada se pinta antes de la respuesta', re.search(r"function envia\([\s\S]{0,900}return carga\(\)", CODIGO) is not None and not re.search(r'E\.d\.productos\.push|\.unidades\.push|\.tarifas\.push|splice\(', CODIGO))
mira('si se guarda pero no se puede releer lo dice (no «Guardado» a ciegas)', "T('Se guardó, pero no se pudo volver a leer: recarga la página.')" in CODIGO)
mira('estado vacio guiado hacia Productos, distinto de «no se ha podido mirar»', "'vacio'" in CODIGO and "T('Aún no hay productos: créalos en Productos.')" in CODIGO and '/intranet/v4/productos/' in CODIGO and "T('No se ha podido mirar') + ': '" in CODIGO)
mira('lista recortada (recortado) avisa sin escribir el numero', "d.recortado !== true" in CODIGO and 'data-fl="recortado"' in MARCADO and not re.search(r'recortada a los primeros', MARCADO))
mira('el aviso fijo de reservas ya hechas y el texto de cuando llega al bot (constantes BOT_LLEGA_ES/EN, parametrizables) estan', 'Las reservas ya hechas no cambian de precio; el cambio vale para lo que se cotice desde ahora.' in MARCADO and 'var BOT_LLEGA_ES =' in JS and 'var BOT_LLEGA_EN =' in JS and 'el bot lo usa en cuanto se actualice su catálogo' in JS.lower())
mira('enganche por data-accion/data-campo/data-*-id; ningun texto de boton se usa para encontrar nada', not re.search(r'textContent\s*===|innerText|\.placeholder|querySelector\([^)]*placeholder|querySelector\(\'\[data-accion=', CODIGO))
mira('la lectura distingue cargando, error (no se ha podido mirar), sin permiso, vacio y listo', all(x in CODIGO for x in ("'cargando'", "'error'", "'sin_permiso'", "'listo'", "'vacio'")))
mira('RPC no disponible (PGRST202 / 404) tiene mensaje propio', "'PGRST202'" in CODIGO + CODIGO_COMUN and 'Esta función todavía no está disponible en esta base' in CODIGO_COMUN)
acciones_codigo = set(re.findall(r"C\.boton\(T\('[^']*'\), '(fl-[a-z-]+)'", CODIGO)) | set(re.findall(r'data-accion="(fl-[a-z-]+)"', MARCADO))
sin_manejador = sorted(a for a in acciones_codigo if not a.startswith('fl-modal') and ("a === '" + a + "'") not in CODIGO)
mira('toda accion fl-* (salvo las de las ventanas) tiene manejador en alClic (' + ', '.join(sin_manejador) + ')', not sin_manejador)
mira('los botones de las ventanas llevan su manejador propio y no se mezclan', "a.indexOf('fl-modal') === 0" in CODIGO)
mira('«Editar flota» de reservas_producto.html: enlace a /intranet/v4/flota/ oculto por defecto, solo con la casilla flota, sin decidir el rol',
     'class="rp-boton rp-oculto" data-rp="flota-editar" href="/intranet/v4/flota/"' in RP and "indexOf('flota') !== -1" in RP and "'Editar flota': 'Edit fleet'" in RP)

# -- (4) diccionario ES/EN (el de la pantalla y el de las ayudas comunes)
bloque = JS[JS.index('var EN_FL = {'):JS.index('var T = typeof window.lwT')]
tmp = tempfile.mkdtemp()
js_claves = os.path.join(tmp, 'k.js')
open(js_claves, 'w', encoding='utf-8').write(bloque + '\n' + COMUN_JS + '\nconsole.log(JSON.stringify(Object.keys(EN_FL).concat(Object.keys(axwComun(null, function (s) { return s; }).EN))));')
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
for c in ('día', 'días'):
    exige(c, 'plural')
for mm in re.finditer(r"ESTADOS = \{([^}]*)\}", JS):
    for c in re.findall(r"\['([^']+)', '(?:ok|espera|mal)'\]", mm.group(1)):
        exige(c, 'estado')
for mm in re.finditer(r"C\.tabla\(t, (\[\[.*?\]\]), ", JS):
    for c in re.findall(r"\['((?:[^'\\]|\\.)*)'(?:, 'axw-num')?\]", mm.group(1)):
        exige(lit(c), 'cabecera')
for mm in re.finditer(r'<(\w+)[^>]*data-lwt[^>]*>([^<]+)</\1>', MARCADO):
    exige(mm.group(2).strip(), 'data-lwt')
mira('el texto de cuando llega al bot se registra tambien en ingles (BOT_LLEGA_EN) en LW_EN', 'window.LW_EN[BOT_LLEGA_ES] = BOT_LLEGA_EN' in JS)
mira('todo texto pintable esta en el diccionario ES/EN' + (' (faltan: ' + '; '.join(sin[:10]) + ')' if sin else ''), not sin)
bloque_lineas = re.findall(r"'((?:[^'\\]|\\.)*)'\s*:\s*'", bloque)
repetidas = sorted({c for c in bloque_lineas if bloque_lineas.count(c) > 1})
mira('ninguna clave repetida en EN_FL' + (' (' + ', '.join(repetidas) + ')' if repetidas else ''), not repetidas)

if fallos:
    print('FALLOS (%d de %d):\n  ' % (len(fallos), casos) + '\n  '.join(fallos))
    sys.exit(1)
print('ok: %d comprobaciones' % casos)
