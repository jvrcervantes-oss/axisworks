# Prueba de build.py:portada_reservas() + ajustes_puesta_en_marcha() + portada_reservas.html + ajustes_puesta.js (11-oct-2026, plan único F8): python test_portada_reservas.py
# Igual que test_taller.py: parte de los ficheros REALES de Lawang (proyectos/Lawang, solo lectura) copiados a una carpeta temporal y corre la cadena de overlays del maestro en el
# orden de instancia() con las dos piezas nuevas al final. Mira que (1) la Home y Ajustes entran y todo el JS compila, (2) si un ancla de Lawang cambia o el registro trae
# una portada desconocida el build PARA, (3) las dos piezas cumplen las reglas del front (sin innerHTML, solo sus RPC, nada de .from(), el estado del pago no se deduce en la
# pantalla) y (4) todo texto que pintan está en el diccionario ES/EN. NO ejecuta build.instancia(): no escribe nada en erp/despliegues/.
import json, os, re, shutil, subprocess, sys, tempfile
AQUI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, AQUI)
import build

FUENTE = open(os.path.join(AQUI, 'portada_reservas.html'), encoding='utf-8').read()
MARCADO, SCRIPT = FUENTE.split('<!--AXW_SCRIPT-->')
AJ = open(os.path.join(AQUI, 'ajustes_puesta.js'), encoding='utf-8').read()
def sin_comentarios(t):
    t = re.sub(r'/\*.*?\*/', '', t, flags=re.S)
    return re.sub(r'(?m)^\s*//.*$', '', t)
CODIGO = sin_comentarios(SCRIPT)
CODIGO_AJ = sin_comentarios(AJ)
FICHEROS = ['intranet/v4/asistente/index.html', 'intranet/v4/assets/nav.js', 'contracts/assets/herramientas.js', 'intranet/v4/assets/editores.js',
            'intranet/v4/assets/ajustes.js', 'intranet/v4/ajustes/index.html', 'intranet/v4/home/index.html', 'intranet/v4/assets/datos.js']


def cadena():
    return (build.asistente_maestro, build.whatsapp_bot_pantalla, build.ajustes_correo_maestro, build.ventas_pantalla, build.reservas_producto_pantalla,
            build.taller_pantalla, build.entrega_pantalla, build.flota_pantalla, build.portada_reservas, build.ajustes_puesta_en_marcha)


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

# -- (1) la cadena entra y compila
r, d = corre()
mira('la cadena de overlays (con portada y puesta en marcha al final) entra sobre los ficheros de Lawang de hoy', r == 'pasa')
home = lee(d, 'intranet/v4/home/index.html') if r == 'pasa' else ''
ajp = lee(d, 'intranet/v4/ajustes/index.html') if r == 'pasa' else ''
ajs = lee(d, 'intranet/v4/assets/ajustes.js') if r == 'pasa' else ''
mira('la Home de parcelas ya no está: ni sus KPI ni sus acciones', 'kpi-unidades-libres' not in home and 'nuevo-contrato' not in home and 'data-ph="raiz"' in home)
mira('la Home NO pide herramienta (es el inicio de todos) y no queda la puerta del asistente', 'data-herramienta=' not in home and 'data-axw-portada="reservas"' in home)
mira('el título es Inicio', '<title data-lw-titulo>Inicio</title>' in home)
datos = lee(d, 'intranet/v4/assets/datos.js') if r == 'pasa' else ''
mira('datos.js no arranca la Home de Lawang sobre la portada (segmento propio, una vez, tras calcular seg)',
     datos.count(build.PORTADA_SEG_RESERVAS) == 1 and datos.index(build.PORTADA_SEG) < datos.index(build.PORTADA_SEG_RESERVAS))
c4 = compila(datos, 'd.js') if datos else None
mira('el datos.js resultante compila', c4 is not None and c4.returncode == 0)
mira('las ayudas comunes se pegan UNA vez y las marcas no quedan', home.count('function axwComun(raiz, T)') == 1 and '/*AXW_COMUN_' not in home)
m = re.findall(r'<script>\n(.*?)\n</script>\n</body></html>', home, flags=re.S)
chk = compila(m[-1], 'h.js') if m else None
mira('el script de la Home resultante compila' + (': ' + chk.stderr.strip()[:300] if chk is not None and chk.returncode else ''), bool(m) and chk.returncode == 0)
c2 = compila(AJ, 'a.js')
mira('ajustes_puesta.js compila' + (': ' + c2.stderr.strip()[:300] if c2.returncode else ''), c2.returncode == 0)
c3 = compila(ajs, 'aj.js') if ajs else None
mira('el ajustes.js resultante compila', c3 is not None and c3.returncode == 0)
mira('Ajustes: pestaña y panel de Configurar módulos UNA vez, la pestaña antes de Empresa',
     ajp.count('data-lw-tab="puesta"') == 1 and ajp.count('data-lw-panel="puesta"') == 1 and ajp.count('id="lw-aj-puesta"') == 1
     and 0 <= ajp.find('data-lw-tab="puesta"') < ajp.find('data-lw-tab="empresa"'))
mira('Ajustes carga ajustes_puesta.js UNA vez y después de ajustes.js', ajp.count('ajustes_puesta.js') == 1 and ajp.find('assets/ajustes.js') < ajp.find('ajustes_puesta.js'))
mira('Ajustes carga setup_pasos.js UNA vez y antes de ajustes_puesta.js', ajp.count('setup_pasos.js') == 1 and ajp.find('setup_pasos.js') < ajp.find('ajustes_puesta.js'))
mira('ajustes.js conoce la pestaña y abre en ella sin #', "var PESTANAS = ['puesta', 'empresa'," in ajs and "? h : 'puesta';" in ajs)
mira('Ajustes › Correo sigue con UNA copia tras el parche', ajs.count('ajustes-correo') >= 1 and build.ajustes_correo_una_copia(ajs, 'prueba', con_comentarios=True) is None)
if r == 'pasa':
    mira('ajustes_puesta.js se copia al paquete', os.path.isfile(os.path.join(d, 'intranet', 'v4', 'assets', 'ajustes_puesta.js')))

# -- (2) si algo cambia, el build PARA
ORIGINAL = {f: open(os.path.join(build.LAWANG, *f.split('/')), encoding='utf-8').read() for f in FICHEROS}
mira('para si la pestaña Empresa de Ajustes cambia de forma',
     corre({'intranet/v4/ajustes/index.html': lambda t: t.replace('id="lw-tab-empresa"', 'id="lw-tab-emp"', 1)})[0] == 'para')
mira('para si la lista de pestañas de ajustes.js ya no empieza por empresa',
     corre({'intranet/v4/assets/ajustes.js': lambda t: t.replace("var PESTANAS = ['empresa',", "var PESTANAS = ['correo', 'empresa',", 1)})[0] == 'para')
# 12-oct-2026: Lawang añade pestañas a la lista (Sociedades emisoras tras Empresa); el build sigue y 'puesta' entra la primera
# (13-oct: el ancla era el final exacto de la lista y se rompió cuando Lawang añadió 'servicios'; ahora se añade al final de la que haya)
r_otra = corre({'intranet/v4/assets/ajustes.js': lambda t: re.sub(r"(var PESTANAS = \[[^\]]*)\];", r"\1, 'otra'];", t, count=1)})
mira('sigue si Lawang añade una pestaña a la lista, con puesta la primera',
     r_otra[0] == 'pasa' and "var PESTANAS = ['puesta', 'empresa'," in lee(r_otra[1], 'intranet/v4/assets/ajustes.js') and "'otra'];" in lee(r_otra[1], 'intranet/v4/assets/ajustes.js'))
mira('para si falta la Home copiada de Lawang', corre(pasos=(lambda: os.remove(os.path.join(build.DIST, 'intranet', 'v4', 'home', 'index.html')), build.portada_reservas))[0] == 'para')
viejo_reg = build._instancia_registro
try:
    build._instancia_registro = lambda n: {'portada': 'reserva'}
    try:
        build.portada_de('x'); errata = 'pasa'
    except SystemExit:
        errata = 'para'
    build._instancia_registro = lambda n: {}
    sin = build.portada_de('x')
    build._instancia_registro = lambda n: {'portada': 'reservas'}
    con = build.portada_de('x')
finally:
    build._instancia_registro = viejo_reg
mira('una portada desconocida en el registro PARA el build', errata == 'para')
mira('sin clave, la instancia sigue con su Home (None); con "reservas", la nueva', sin is None and con == 'reservas')
reg = json.load(open(os.path.join(build.AGENCIA, 'erp', 'instancias.json'), encoding='utf-8')).get('instancias') or {}
mira('en el registro solo las instancias declaradas llevan portada, y todas con un valor conocido',
     all((v.get('portada') in (None,) + build.PORTADAS) for v in reg.values()))
mira('Lawang no se tocó: los ficheros siguen igual', all(open(os.path.join(build.LAWANG, *f.split('/')), encoding='utf-8').read() == ORIGINAL[f] for f in FICHEROS))

# -- (3) reglas de seguridad del front
for nombre, cod in (('la portada', CODIGO), ('la puesta en marcha', CODIGO_AJ)):
    mira('%s: ningún innerHTML ni insertAdjacentHTML ni outerHTML ni document.write' % nombre, not re.search(r'innerHTML|insertAdjacentHTML|outerHTML|document\.write', cod))
    mira('%s: no usa el esc() de Lawang' % nombre, not re.search(r'\besc\(', cod))
    mira('%s: ningún console.log' % nombre, 'console.log' not in cod)
    sin_lectura_soc = re.sub(r"\.from\('sociedades'\)\.select\(", '', cod)   # F3: Configurar módulos lee la fila de la empresa (solo select)
    mira('%s: ni .from( (salvo leer sociedades) ni insert/update/upsert/delete ni storage' % nombre, not re.search(r'\.from\(|\.insert\(|\.update\(|\.upsert\(|\.delete\(|\.storage\b', sin_lectura_soc))
mira('no nombra claves de servicio', not re.search(r'service_role|sb_secret_', SCRIPT + MARCADO + AJ))
mira('la portada solo LEE y solo portada_reservas_dia_datos, por lwDatos',
     set(re.findall(r"(?:\.rpc|lwDatos)\('([a-z_]+)'", CODIGO)) == {'portada_reservas_dia_datos'} and '.rpc(' not in CODIGO)
PASOS_JS = open(os.path.join(AQUI, 'setup_pasos.js'), encoding='utf-8').read()
mira('Configurar módulos lee ajustes_config_datos (lwDatos) y no llama a la base por su cuenta: escribe por los componentes de setup_pasos.js',
     set(re.findall(r"lwDatos\('([a-z_]+)'", CODIGO_AJ)) == {'ajustes_config_datos'} and not re.findall(r"\.rpc\('", CODIGO_AJ))
# S14 «Quién lo usa» (bbm-p41, 13-oct): usuario_guarda_permisos, que en la base exige super_admin para tocar herramientas (revisión previa de Seguridad #296)
mira('los pasos solo escriben por ajustes_config_guardar, sociedad_guarda y usuario_guarda_permisos',
     set(re.findall(r"\.rpc\('([a-z_]+)'", PASOS_JS)) == {'ajustes_config_guardar', 'sociedad_guarda', 'usuario_guarda_permisos'})
mira('setup_pasos.js solo LEE una tabla (usuarios, para «Quién lo usa»; la empresa la lee la página), nunca escribe en ella',
     set(re.findall(r"\.from\('([a-z_]+)'\)", PASOS_JS)) == {'usuarios'} and not re.search(r'\.insert\(|\.update\(|\.upsert\(|\.delete\(', PASOS_JS))
mira('los ajustes que guardan los pasos son una lista cerrada (moneda y los dos sí/no, con valor si|no)',
     set(re.findall(r"opcionUnica\('([a-z_]+)'", PASOS_JS)) == {'precio_incluye_impuesto', 'reservas_sin_impuesto'}
     and set(re.findall(r"guardaAjuste\(sb, '([a-z_]+)'", PASOS_JS)) == {'moneda'} and "v === 'si' || v === 'no'" in PASOS_JS)
mira('el estado del pago sale de pago_estado de la base: la portada no mira importes ni referencias para decidirlo',
     'x.pago_estado' in CODIGO and not re.search(r'pago_referencia|precio_total\s*[<>=!]|pagado_en', CODIGO))
mira('el día por defecto lo decide la base (p_dia null), no el reloj del navegador', "p_dia: dia || null" in CODIGO and 'new Date()' not in CODIGO and 'Date.now' not in CODIGO)
mira('la portada distingue vacía de no se ha podido mirar, y sin permiso / módulo apagado',
     'Hoy no hay entregas.' in CODIGO and "T('No se han podido mirar las reservas')" in CODIGO and 'No es que no haya' in CODIGO and 'Esto NO quiere decir que no haya nada' in CODIGO)
mira('Configurar módulos no deduce el hecho: lee modulos_setup_estado y vuelve a leer tras guardar', 'S.estado(true)' in CODIGO_AJ and 'return carga()' in CODIGO_AJ and 'puesta_en_marcha_estado' not in CODIGO_AJ)
mira('no poder mirar no es «todo configurado»: se dice y se ofrece Reintentar', "U('no_mirar')" in CODIGO_AJ and 'pm-reintentar' in CODIGO_AJ)
mira('cambiar lo guardado pide motivo y un irreversible sin hacer lleva al asistente', "U('motivo_corto')" in CODIGO_AJ and 'enlaceAsistente(p.modulo, p.clave)' in CODIGO_AJ)
mira('la hora no se deduce: se pinta la que llega o «Sin hora» (la columna nunca queda vacía, diseño 13-oct), y en la ficha solo si llega',
     CODIGO.count('if (x.hora)') == 2 and "T('Sin hora')" in CODIGO)
acciones = set(re.findall(r'data-accion="(ph-[a-z-]+)"', MARCADO)) | set(re.findall(r"'data-accion': '(ph-[a-z-]+)'", CODIGO))
mira('todo data-accion de la portada tiene manejador', all(("a === '" + a + "'") in CODIGO for a in acciones))
mira('enganche por data-*: nada busca por texto', not re.search(r'textContent\s*===|innerText|\.placeholder', CODIGO + CODIGO_AJ))

# -- (4) diccionario ES/EN
def claves_de(bloque, var):
    tmp = tempfile.mkdtemp(); p = os.path.join(tmp, 'k.js')
    open(p, 'w', encoding='utf-8').write(bloque + '\nconsole.log(JSON.stringify(Object.keys(%s)));' % var)
    return set(json.loads(subprocess.run(['node', p], capture_output=True, text=True, encoding='utf-8').stdout or '[]'))
COMUN = open(os.path.join(AQUI, '_compartido', 'pantalla_comun.js'), encoding='utf-8').read()
claves = claves_de(SCRIPT[SCRIPT.index('var EN_PH = {'):SCRIPT.index('var T = typeof window.lwT')], 'EN_PH')
claves |= claves_de(COMUN + '\nvar X = axwComun(null, function (s) { return s; }).EN;', 'X')
claves |= claves_de(AJ[AJ.index('var EN_PM = {'):AJ.index('var ID_PM')], 'EN_PM')
i18n = open(os.path.join(build.LAWANG, 'contracts', 'assets', 'i18n.js'), encoding='utf-8').read()
def conocida(c):
    return c in claves or ("'" + c.replace("'", "\\'") + "':") in i18n or ('"' + c + '":') in i18n
pintados = set(re.findall(r"T\('([^']+)'", CODIGO + CODIGO_AJ))
pintados |= {s.strip() for s in re.findall(r'data-lwt>([^<]+)<', MARCADO + build.AJUSTES_PUESTA_TAB + build.AJUSTES_PUESTA_PANEL)}
# los rótulos de los mapas PAGO y ESTADO se leen por el nombre de la variable (Frontend, 13-oct): un rótulo nuevo (fuera_erp…) no se escapa
for mapa in ('PAGO', 'ESTADO'):
    bloque = re.search(r'var ' + mapa + r' = \{(.*?)\};', CODIGO, flags=re.S)
    mira('el mapa %s está en la portada' % mapa, bool(bloque))
    if bloque:
        pintados |= set(re.findall(r":\s*\['([^']+)'", bloque.group(1)))
pintados |= set(re.findall(r"pregunta: '([^']+)'", CODIGO_AJ))
for par in re.findall(r"\['(?:si|no)', '([^']{4,})'\]", CODIGO_AJ):
    pintados.add(par)
for k in ('Reserva', 'Modelo', 'Unidad', 'Cliente', 'Fechas', 'Estado', 'Pago', 'Precio', 'Dirección de entrega', 'Dirección de recogida', 'Hora'):
    pintados.add(k)
faltan = sorted(c for c in pintados if not conocida(c))
mira('todo texto pintado tiene su inglés (' + '; '.join(x[:50] for x in faltan[:8]) + ')', not faltan)
# el indonesio cubre todo el inglés de la pantalla (si no, en bbm cae al inglés sin avisar: Frontend, 13-oct)
claves_id = claves_de(SCRIPT[SCRIPT.index('var ID_PH = {'):SCRIPT.index('var T = typeof window.lwT')], 'ID_PH')
claves_en = claves_de(SCRIPT[SCRIPT.index('var EN_PH = {'):SCRIPT.index('var ID_PH = {')], 'EN_PH')
mira('ID_PH tiene las mismas claves que EN_PH (' + '; '.join(sorted(claves_en ^ claves_id))[:200] + ')', claves_en == claves_id)

print('%d/%d' % (casos - len(fallos), casos))
for f in fallos:
    print('  FALLA: ' + f)
sys.exit(1 if fallos else 0)
