# Prueba de build.py:entrega_pantalla() + entrega.html + _compartido/pantalla_comun.{js,css} (F8 pieza 8, 10-oct-2026): python test_entrega.py
# Igual que test_reservas_producto.py: parte de los ficheros REALES de Lawang (proyectos/Lawang, solo lectura) copiados a una carpeta temporal y corre la CADENA entera
# de overlays del maestro en el orden de instancia() (asistente, bot de WhatsApp, correo, ventas, reservas de producto, taller, entrega). Mira que (1) la pantalla entra con las
# ayudas comunes pegadas UNA vez y todo el JS compila, (2) si algo cambia (un ancla de Lawang, la cadena, una marca o un fichero comun) el build PARA, (3) la pantalla
# cumple las reglas de seguridad del front (sin innerHTML ni esc(), solo las tres RPC del contrato, nada de .from(), ni autor ni version propia ni fechas viajan) y (4) todo texto que
# pinta esta en el diccionario ES/EN. El comportamiento en un navegador lo mide pruebas/entrega.harness.cjs.
# NO ejecuta build.instancia(): no escribe nada en erp/despliegues/.
import json, os, re, shutil, subprocess, sys, tempfile
AQUI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, AQUI)
import build

FUENTE = open(os.path.join(AQUI, 'entrega.html'), encoding='utf-8').read()
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
            build.taller_pantalla, build.entrega_pantalla)


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
pagina = lee(d, 'intranet/v4/entrega/index.html') if r == 'pasa' else ''
nav = lee(d, 'intranet/v4/assets/nav.js') if r == 'pasa' else ''
her = lee(d, 'contracts/assets/herramientas.js') if r == 'pasa' else ''
mira('la pagina lleva la puerta de la herramienta entrega y ya no la del asistente', 'data-herramienta="entrega"' in pagina and 'data-herramienta="asistente"' not in pagina)
mira('el titulo es Entrega', '<title data-lw-titulo>Entrega</title>' in pagina)
mira('la pantalla de Lawang (asistente) y la de Taller no se mezclan en la nueva', 'asistente-peticiones' not in pagina and 'Telegram' not in pagina and 'data-tl="raiz"' not in pagina)
mira('el marcado y el script de la fuente entran una vez', pagina.count('<div class="flex flex-col w-full gap-8" data-en="raiz">') == 1 and pagina.count('var EN_ENT = {') == 1)
mira('las ayudas comunes se pegan UNA vez (js y css) y las marcas no quedan en la pagina',
     pagina.count('function axwComun(raiz, T)') == 1 and pagina.count('.axw-boton{') == 1 and '/*AXW_COMUN_' not in pagina)
mira('NO hay una tercera copia local de las ayudas (h, dialogo, clasifica, ocupa, tabla, chip...) fuera de las comunes',
     len(re.findall(r'function (h|dialogo|clasifica|ocupa|libera|tabla|chip|celda|boton|campo|resumen|dinero|fechaHora)\(', CODIGO)) == 0)
m = re.findall(r'<script>\n(.*?)\n</script>\n</body></html>', pagina, flags=re.S)
chk = compila(m[-1], 'v.js') if m else None
mira('el script de la pagina resultante compila (node --check)' + (': ' + chk.stderr.strip()[:300] if chk is not None and chk.returncode else ''), bool(m) and chk.returncode == 0)
mira('la fuente de las ayudas comunes compila sola', compila(COMUN_JS, 'comun.js').returncode == 0)
if r == 'pasa':
    for nombre, cod in (('nav.js', nav), ('herramientas.js', her)):
        c2 = compila(cod, nombre)
        mira('el %s resultante compila%s' % (nombre, (': ' + c2.stderr.strip()[:300]) if c2.returncode else ''), c2.returncode == 0)
    mira('nav.js: entrada de menu, injerto (con nucleo) y casilla, una vez cada uno',
         nav.count("{ path: 'entrega', texto: 'Entrega', clave: 'entrega', nucleo: true }") == 1
         and nav.count("{ path: 'entrega', tras: 'taller'") == 1 and nav.count("entrega: 'entrega',") == 1)
    mira('el injerto de Entrega viene DESPUES del de Taller (cuelga de el)', nav.index("path: 'taller', tras: 'reservas-producto'") < nav.index("path: 'entrega', tras: 'taller'"))
    mira('puedeVer no deja pasar a un rol sin la casilla: CLAVE_MENU de la pantalla existe antes de la linea que la usa', nav.index("entrega: 'entrega',") < nav.index('var k = CLAVE_MENU[path];'))
    mira('lo que habian puesto las otras pantallas sigue en nav.js (taller, reservas, ventas, bot de WhatsApp y asistente)',
         "path: 'taller'" in nav and "path: 'reservas-producto'" in nav and "path: 'ventas'" in nav and "path: 'whatsapp-bot'" in nav and "clave: 'asistente_peticiones'" in nav)
    mira('herramientas.js: la tarjeta entrega esta UNA vez, bajo la bandera del nucleo y tras la de Taller',
         her.count("herr:'entrega'") == 1 and her.index("herr:'entrega'") > her.index('window.AXW_NUCLEO_OPERACION') and her.index("herr:'entrega'") > her.index("herr:'taller'"))
    prueba = ("global.window = { AXW_NUCLEO_OPERACION: true }; var LW_ROL = {}; " + re.sub(r'^\s*export\s+', '', her, flags=re.M) +
              "\nconsole.log(JSON.stringify((typeof LW_HERRAMIENTAS !== 'undefined' ? LW_HERRAMIENTAS : []).filter(t => t.herr === 'entrega').map(t => [t.grupo, t.href])));")
    tmp = tempfile.mkdtemp()
    open(os.path.join(tmp, 'h.js'), 'w', encoding='utf-8').write(prueba)
    sal = subprocess.run(['node', os.path.join(tmp, 'h.js')], capture_output=True, text=True, encoding='utf-8')
    try:
        tarj = json.loads(sal.stdout.strip().splitlines()[-1]) if sal.stdout.strip() else None
    except Exception:
        tarj = None
    mira('con la bandera del nucleo, el catalogo de herramientas trae la tarjeta (Seguimiento, /intranet/v4/entrega/)' + ('' if tarj is not None else ' [no se pudo evaluar: ' + (sal.stderr or sal.stdout)[-200:] + ']'),
         tarj == [['Seguimiento', '/intranet/v4/entrega/']])

# -- (2) si algo cambia, el build PARA (y no deja un menu a medias)
ORIGINAL = {f: open(os.path.join(build.LAWANG, *f.split('/')), encoding='utf-8').read() for f in FICHEROS}
mira('para si falta la pantalla de Taller en la cadena (sus anclas de nav.js y herramientas.js son las que deja ella: el orden importa)',
     corre(pasos=(build.asistente_maestro, build.whatsapp_bot_pantalla, build.ajustes_correo_maestro, build.ventas_pantalla, build.reservas_producto_pantalla, build.entrega_pantalla))[0] == 'para')
mira('para si la cascara de /asistente/ ya no tiene la forma esperada',
     corre({'intranet/v4/asistente/index.html': lambda t: t.replace('<div class="flex flex-col w-full gap-8">', '<div class="otra">', 1)})[0] == 'para')


def con_fuente_alterada(alterar=None, quitar_comun=None):
    alt = tempfile.mkdtemp()
    for otro in ('asistente_peticiones.html', 'whatsapp_bot.html', 'bot_alta.html', 'ajustes_correo.js', 'ventas.html', 'reservas_producto.html', 'taller.html'):
        shutil.copy(os.path.join(AQUI, otro), os.path.join(alt, otro))
    open(os.path.join(alt, 'entrega.html'), 'w', encoding='utf-8').write(alterar(FUENTE) if alterar else FUENTE)
    os.makedirs(os.path.join(alt, '_compartido'))
    for f in ('pantalla_comun.js', 'pantalla_comun.css'):
        if f != quitar_comun:
            shutil.copy(os.path.join(AQUI, '_compartido', f), os.path.join(alt, '_compartido', f))
    viejo, build.AQUI = build.AQUI, alt        # la fuente alterada vive en otra carpeta: entrega.html y _compartido no se tocan
    try:
        return corre()[0]
    finally:
        build.AQUI = viejo
mira('la fuente sin alterar pasa tambien desde otra carpeta (control de la prueba de abajo)', con_fuente_alterada() == 'pasa')
mira('para si falta el marcador AXW_SCRIPT en entrega.html', con_fuente_alterada(lambda t: t.replace('<!--AXW_SCRIPT-->', '')) == 'para')
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
PERMITIDAS = {'entrega_datos', 'entrega_ajustes_guarda', 'entrega_tarifa_guarda'}
llamadas = set(re.findall(r"\bllama\('([a-z_]+)'", CODIGO))
literales = set(re.findall(r"(?:SB\.rpc|window\.lwDatos)\('([a-z_]+)'", CODIGO))
mira('cada RPC lleva su nombre LITERAL (para que contrato_front.py la vea) y son exactamente las tres del contrato (' + ', '.join(sorted(literales ^ PERMITIDAS)) + ')', literales == PERMITIDAS)
mira('las RPC que llama son exactamente las del contrato (' + ', '.join(sorted(llamadas ^ PERMITIDAS)) + ')', llamadas == PERMITIDAS)
mira('lo que lee va por lwDatos y solo entrega_datos; lo que escribe va por sb.rpc', set(re.findall(r"window\.lwDatos\('([a-z_]+)'", CODIGO)) == {'entrega_datos'}
     and set(re.findall(r"SB\.rpc\('([a-z_]+)'", CODIGO)) == {'entrega_ajustes_guarda', 'entrega_tarifa_guarda'})
mira('ninguna lectura por .rpc(...).select() ni encadenada', '.select(' not in CODIGO and not re.search(r"\.rpc\([^)]*\)\s*\.", CODIGO))
# el navegador pide, no decide: ni autor, ni fechas, ni la version de nadie salvo la que la base le dio
mira('guardar la tarifa manda SOLO moneda, precio, km gratis y minimo, el motivo y el id de la tarifa que vio',
     "llama('entrega_tarifa_guarda', { p_datos: plan.tarifa, p_motivo: motivo, p_tarifa_id: E.d.tarifa ? E.d.tarifa.id : null })" in CODIGO
     and "tarifa = { moneda: v.moneda, precio_km: v.precio_km, km_gratis: v.km_gratis, minimo: v.minimo }" in CODIGO)
mira('guardar los ajustes manda SOLO lo cambiado, el motivo y la version que la base dio al leer',
     "llama('entrega_ajustes_guarda', { p_datos: plan.ajustes, p_motivo: motivo, p_version: E.d.version })" in CODIGO)
mira('nada de autor, correo, fechas ni producto viaja a la base', not re.search(r'p_(autor|por|email|creado|actualizado|producto|user|fecha)|producto_id', CODIGO))
mira('los rangos duros salen de `topes` (nada de 500, 365 ni 90 cableados como limite de un campo de la base)',
     'E.d.topes' in CODIGO and not re.search(r'\b(500|365)\b', CODIGO) and "setAttribute('min'" in CODIGO and "setAttribute('max'" in CODIGO)
mira('guardar no se da por hecho: exige version numerica en la respuesta de los ajustes y un id de texto en la tarifa',
     "typeof r2.data.version !== 'number'" in CODIGO and "typeof r.data !== 'string'" in CODIGO)
mira('el conflicto de version (hint entrega_cambio / 40001) tiene su caja con boton de recargar', "'entrega_cambio'" in CODIGO and "'40001'" in CODIGO and 'data-accion="en-recargar"' in MARCADO)
mira('recargar conserva lo escrito: la lectura recibe lo que el usuario cambio', 'sucios()' in CODIGO and 'conserva' in CODIGO)
mira('doble clic: un solo envio a la vez (ocupa/libera) y un solo dialogo', 'C.ocupa(btn)' in CODIGO and 'C.libera(btn)' in CODIGO and 'E.dialogo' in CODIGO and 'function ocupa' in CODIGO_COMUN)
mira('con la entrega activa se confirma por escrito antes de guardar', 'Esto cambia el precio al bot desde ya' in CODIGO and "accion: 'en-modal-confirmar'" in CODIGO)
mira('enganche por data-accion/data-campo; ningun texto de boton se usa para encontrar nada', not re.search(r'textContent\s*===|innerText|\.placeholder|querySelector\([^)]*placeholder', CODIGO))
mira('la lectura distingue cargando, error (no se ha podido mirar), sin permiso y listo', all(x in CODIGO for x in ("'cargando'", "'error'", "'sin_permiso'", "'listo'")) and "T('No se ha podido mirar') + ': '" in CODIGO)
mira('RPC no disponible (PGRST202 / 404) tiene mensaje propio', "'PGRST202'" in CODIGO + CODIGO_COMUN and 'Esta función todavía no está disponible en esta base' in CODIGO_COMUN)
mira('el analisis de «lat, lng» es solo ayuda: la base revalida y se enseña su mensaje (C.mensaje en el fallo)', 'C.mensaje(r.error, false, PROPIOS)' in CODIGO)
acciones_marcado = set(re.findall(r'data-accion="(en-[a-z-]+)"', MARCADO))
mira('todo data-accion del marcado tiene manejador (' + ', '.join(sorted(a for a in acciones_marcado if ("a === '" + a + "'") not in CODIGO)) + ')', all(("a === '" + a + "'") in CODIGO for a in acciones_marcado))
mira('los botones del dialogo llevan su manejador propio y no se mezclan', "a.indexOf('en-modal') === 0" in CODIGO)
campos_marcado = set(re.findall(r'data-campo="([a-z_]+)"', MARCADO))
campos_codigo = set(re.findall(r"'([a-z_]+)'", CODIGO[CODIGO.index('var CAMPOS = ['):CODIGO.index('var CAMPOS = [') + 260]))
mira('todo campo del formulario esta en CAMPOS (salvo el motivo)', campos_marcado - {'motivo'} == campos_codigo)

# -- (4) diccionario ES/EN (el de la pantalla y el de las ayudas comunes)
bloque = JS[JS.index('var EN_ENT = {'):JS.index('var T = typeof window.lwT')]
tmp = tempfile.mkdtemp()
js_claves = os.path.join(tmp, 'k.js')
open(js_claves, 'w', encoding='utf-8').write(bloque + '\n' + COMUN_JS + '\nconsole.log(JSON.stringify(Object.keys(EN_ENT).concat(Object.keys(axwComun(null, function (s) { return s; }).EN))));')
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
for mm in re.finditer(r"\['(?:sede|tarifa|servicio)', '([^']+)'\]", JS):
    exige(mm.group(1), 'faltan')
for mm in re.finditer(r"grupos\.push\('([^']+)'\)|grupos\.push\(v\.activa \? '([^']+)' : '([^']+)'\)", JS):
    for g in mm.groups():
        exige(g, 'grupo')
for mm in re.finditer(r"C\.tabla\(t, (\[\[.*?\]\]), ", JS):
    for c in re.findall(r"\['((?:[^'\\]|\\.)*)'(?:, 'axw-num')?\]", mm.group(1)):
        exige(lit(c), 'cabecera')
for mm in re.finditer(r"\[\['([A-ZÁÉÍÓÚ][^'\\]*)', motivo\]\]", JS):
    exige(mm.group(1), 'resumen')
for mm in re.finditer(r'<(\w+)[^>]*data-lwt[^>]*>([^<]+)</\1>', MARCADO):
    exige(mm.group(2).strip(), 'data-lwt')
mira('todo texto pintable esta en el diccionario ES/EN' + (' (faltan: ' + '; '.join(sin[:10]) + ')' if sin else ''), not sin)
bloque_lineas = re.findall(r"'((?:[^'\\]|\\.)*)'\s*:\s*'", bloque)
repetidas = sorted({c for c in bloque_lineas if bloque_lineas.count(c) > 1})
mira('ninguna clave repetida en EN_ENT' + (' (' + ', '.join(repetidas) + ')' if repetidas else ''), not repetidas)

if fallos:
    print('FALLOS (%d de %d):\n  ' % (len(fallos), casos) + '\n  '.join(fallos))
    sys.exit(1)
print('ok: %d comprobaciones' % casos)
