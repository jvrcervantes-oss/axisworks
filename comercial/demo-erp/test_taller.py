# Prueba de build.py:taller_pantalla() + taller.html + _compartido/{pantalla_comun.js,css, fotos_guiadas.js} (F8 8.T1 «Taller por pasos», 12-oct-2026): python test_taller.py
# Parte de los ficheros REALES de Lawang (proyectos/Lawang, solo lectura) copiados a una carpeta temporal y corre la CADENA de overlays del maestro en el orden de instancia()
# hasta el taller. Mira que (1) la pantalla entra con las ayudas comunes y las fotos guiadas pegadas UNA vez y todo el JS compila, (2) si algo cambia (un ancla de Lawang, la cadena,
# una marca o un fichero común) el build PARA, (3) la pantalla cumple las reglas del front (sin innerHTML, solo las RPC taller_* de la migración 20261011170000 y con su nombre
# literal, lecturas por lwDatos, nada de .from(), ni autor ni número ni ruta viajan, colores solo por --tema-*, enganche por data-*), los hints que traduce existen en la base o
# en la edge, y (4) idiomas: EN e ID con las mismas claves, todo texto pintable con clave en los dos, glosario indonesio sin «balian». El comportamiento lo mide
# pruebas/taller.harness.cjs. NO ejecuta build.instancia(): no escribe nada en erp/despliegues/.
# La migración se busca en la agencia (AXW_AGENCIA_RAIZ o la de build.py); si no está (todavía en una copia de sesión) esos casos se dicen NO COMPROBADOS, no verdes.
import glob, json, os, re, shutil, subprocess, sys, tempfile
AQUI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, AQUI)
import build

FUENTE = open(os.path.join(AQUI, 'taller.html'), encoding='utf-8').read()
MARCADO, SCRIPT = FUENTE.split('<!--AXW_SCRIPT-->')
COMUN_JS = open(os.path.join(AQUI, '_compartido', 'pantalla_comun.js'), encoding='utf-8').read()
FOTOS_JS = open(os.path.join(AQUI, '_compartido', 'fotos_guiadas.js'), encoding='utf-8').read()
JS = SCRIPT.strip()
def sin_comentarios(t):
    t = t.replace("'image/*'", "'image/TODAS'")   # el accept del input no abre un comentario
    t = re.sub(r'/\*.*?\*/', '', t, flags=re.S)            # los comentarios cuentan el porqué y nombran lo prohibido: las reglas miran el código
    return re.sub(r'(?m)^\s*//.*$', '', t)
CODIGO = sin_comentarios(JS)
CODIGO_COMUN = sin_comentarios(COMUN_JS)
CODIGO_FOTOS = sin_comentarios(FOTOS_JS)
FICHEROS = ['intranet/v4/asistente/index.html', 'intranet/v4/assets/nav.js', 'contracts/assets/herramientas.js',
            'intranet/v4/assets/editores.js', 'intranet/v4/assets/ajustes.js']
NO_COMPROBADO = []


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


def node(codigo, check=False):
    tmp = tempfile.mkdtemp()
    p = os.path.join(tmp, 'x.js')
    open(p, 'w', encoding='utf-8').write(codigo)
    return subprocess.run(['node', '--check', p] if check else ['node', p], capture_output=True, text=True, encoding='utf-8')


fallos, casos = [], 0
def mira(nombre, ok):
    global casos
    casos += 1
    if not ok:
        fallos.append(nombre)

# -- (1) la cadena entra y compila
r, d = corre()
mira('la cadena de overlays entra sobre los ficheros de Lawang de hoy', r == 'pasa')
pagina = lee(d, 'intranet/v4/taller/index.html') if r == 'pasa' else ''
nav = lee(d, 'intranet/v4/assets/nav.js') if r == 'pasa' else ''
her = lee(d, 'contracts/assets/herramientas.js') if r == 'pasa' else ''
mira('la página lleva la puerta de la herramienta taller y ya no la del asistente', 'data-herramienta="taller"' in pagina and 'data-herramienta="asistente"' not in pagina)
mira('el título es Taller', '<title data-lw-titulo>Taller</title>' in pagina)
mira('el marcado y el script de la fuente entran una vez', pagina.count('data-tl="raiz" data-modo="inicio"') == 1 and pagina.count('var EN_TL = {') == 1 and pagina.count('var ID_TL = {') == 1)
mira('ayudas comunes y fotos guiadas pegadas UNA vez, sin marcas', pagina.count('function axwComun(raiz, T)') == 1 and pagina.count('function axwFotosGuiadas(cfg)') == 1
     and pagina.count('function axwFotosDiccionario()') == 1 and pagina.count('.axw-boton{display:inline-flex') == 1 and '/*AXW_COMUN_' not in pagina and '/*AXW_FOTOS_JS*/' not in pagina)
mira('la página no trae copias propias de las ayudas (h, dialogo, clasifica, ocupa, tabla)', len(re.findall(r'function (h|dialogo|clasifica|ocupa|tabla)\(', CODIGO)) == 0)
m = re.findall(r'<script>\n(.*?)\n</script>\n</body></html>', pagina, flags=re.S)
chk = node(m[-1], check=True) if m else None
mira('el script de la página resultante compila (node --check)' + (': ' + chk.stderr.strip()[:300] if chk is not None and chk.returncode else ''), bool(m) and chk.returncode == 0)
mira('las ayudas comunes compilan solas', node(COMUN_JS, check=True).returncode == 0)
mira('fotos_guiadas.js compila solo', node(FOTOS_JS, check=True).returncode == 0)
if r == 'pasa':
    for nombre, cod in (('nav.js', nav), ('herramientas.js', her)):
        c2 = node(cod, check=True)
        mira('el %s resultante compila%s' % (nombre, (': ' + c2.stderr.strip()[:300]) if c2.returncode else ''), c2.returncode == 0)
    mira('nav.js: entrada de menú, injerto y casilla del taller, una vez cada uno',
         nav.count("{ path: 'taller', texto: 'Taller', clave: 'taller', nucleo: true }") == 1
         and nav.count("{ path: 'taller', tras: 'reservas-producto'") == 1 and nav.count("taller: 'taller',") == 1)
    mira('herramientas.js: la tarjeta taller una vez, tras la de Reservas de producto', her.count("herr:'taller'") == 1 and her.index("herr:'taller'") > her.index("herr:'reservas-producto'"))
    # M3 (owner 15-oct, 20261015190000): el admin ve la entrada y la tarjeta de Taller sin la casilla (la base decide si hay mecánico); nadie más
    mira('M3: el menú deja pasar al admin a Taller (rol admin exacto)', nav.count("(path === 'taller' && ficha.rol === 'admin')") == 1)
    mira('M3: la tarjeta del hub deja pasar al admin a Taller', her.count("(t.herr === 'taller' && ficha.rol === 'admin')") == 1)
    # la puerta de guard.js (guard_asistente_admin) la mide test_asistente_maestro.py sobre el guard.js construido

# -- (2) si algo cambia, el build PARA
ORIGINAL = {f: open(os.path.join(build.LAWANG, *f.split('/')), encoding='utf-8').read() for f in FICHEROS}
mira('para si falta Reservas de producto en la cadena (sus anclas de nav.js)',
     corre(pasos=(build.asistente_maestro, build.whatsapp_bot_pantalla, build.ajustes_correo_maestro, build.ventas_pantalla, build.taller_pantalla))[0] == 'para')
mira('para si la cáscara de /asistente/ ya no tiene la forma esperada',
     corre({'intranet/v4/asistente/index.html': lambda t: t.replace('<div class="flex flex-col w-full gap-8">', '<div class="otra">', 1)})[0] == 'para')


def con_fuente_alterada(alterar_taller=None, quitar_comun=None):
    alt = tempfile.mkdtemp()
    for otro in ('asistente_peticiones.html', 'whatsapp_bot.html', 'bot_alta.html', 'ventas.html', 'reservas_producto.html'):
        shutil.copy(os.path.join(AQUI, otro), os.path.join(alt, otro))
    open(os.path.join(alt, 'taller.html'), 'w', encoding='utf-8').write(alterar_taller(FUENTE) if alterar_taller else FUENTE)
    os.makedirs(os.path.join(alt, '_compartido'))
    for f in ('pantalla_comun.js', 'pantalla_comun.css', 'fotos_guiadas.js'):
        if f != quitar_comun:
            shutil.copy(os.path.join(AQUI, '_compartido', f), os.path.join(alt, '_compartido', f))
    viejo, build.AQUI = build.AQUI, alt        # la fuente alterada vive en otra carpeta: taller.html y _compartido no se tocan
    try:
        return corre()[0]
    finally:
        build.AQUI = viejo
mira('la fuente sin alterar pasa también desde otra carpeta (control de la prueba de abajo)', con_fuente_alterada() == 'pasa')
mira('para si falta el marcador AXW_SCRIPT en taller.html', con_fuente_alterada(lambda t: t.replace('<!--AXW_SCRIPT-->', '')) == 'para')
mira('para si la página usa una marca común repetida', con_fuente_alterada(lambda t: t.replace('/*AXW_COMUN_CSS*/', '/*AXW_COMUN_CSS*/ /*AXW_COMUN_CSS*/')) == 'para')
mira('para si la marca de las fotos aparece dos veces', con_fuente_alterada(lambda t: t.replace('/*AXW_FOTOS_JS*/', '/*AXW_FOTOS_JS*/ /*AXW_FOTOS_JS*/')) == 'para')
mira('para si falta pantalla_comun.js', con_fuente_alterada(quitar_comun='pantalla_comun.js') == 'para')
mira('para si falta fotos_guiadas.js', con_fuente_alterada(quitar_comun='fotos_guiadas.js') == 'para')
mira('Lawang no se tocó: los ficheros siguen igual', all(open(os.path.join(build.LAWANG, *f.split('/')), encoding='utf-8').read() == ORIGINAL[f] for f in FICHEROS))

# -- (3) reglas del front
for nombre, cod in (('la pantalla', CODIGO), ('las ayudas comunes', CODIGO_COMUN), ('las fotos guiadas', CODIGO_FOTOS)):
    mira('%s: ningún innerHTML ni insertAdjacentHTML ni outerHTML ni document.write' % nombre, not re.search(r'innerHTML|insertAdjacentHTML|outerHTML|document\.write', cod))
    mira('%s: no usa el esc() de Lawang ni lwCajonHtml' % nombre, not re.search(r'\besc\(|lwCajonHtml|H\.dato|H\.seccion', cod))
    mira('%s: ningún console.log' % nombre, 'console.log' not in cod)
    # las fotos usan .delete( de IndexedDB para su cola local: en ellas se mira que no haya cliente de la base (.rpc, .from, storage)
    mira('%s: ni .from( ni insert/update/upsert/delete ni storage' % nombre,
         not re.search(r'\.from\(|\.insert\(|\.update\(|\.upsert\(|\.storage\b' + (r'|\.rpc\(' if cod is CODIGO_FOTOS else r'|\.delete\('), cod))
    mira('%s: enganche por data-*: nada busca por texto' % nombre, not re.search(r'textContent\s*===|innerText|\.placeholder\s*===', cod))
mira('no nombra claves de servicio', not re.search(r'service_role|sb_secret_', JS + MARCADO + FOTOS_JS))
# orden_trabajo_datos (S9 «Partes hechos», 15-oct-2026): la ÚNICA lectura de partes CERRADOS que hay en la base; desde ese día tiene llamador con nombre y la
# retirada de Seguridad #275 (a) queda en orden_trabajo_abre / orden_trabajo_cierra, que siguen prohibidas aquí abajo. Revertir: una taller_partes_datos propia.
LECTURAS = {'taller_datos', 'taller_orden_datos', 'taller_listas_datos', 'orden_trabajo_datos'}
ESCRITURAS = {'taller_orden_abre', 'taller_orden_km', 'taller_orden_paso', 'taller_revision_marca', 'taller_orden_resultado', 'taller_moto_devuelve',
              'taller_revision_guarda', 'taller_recambio_guarda', 'taller_recambio_vincula', 'taller_listas_copia', 'taller_lista_basica'}
lect = set(re.findall(r"window\.lwDatos\('([a-z_]+)'", CODIGO))
escr = set(re.findall(r"SB\.rpc\('([a-z_]+)'", CODIGO))
mira('lecturas por lwDatos: exactamente las cuatro *_datos (%s)' % ', '.join(sorted(lect ^ LECTURAS)), lect == LECTURAS)
mira('escrituras por sb.rpc: exactamente las once del plan (%s)' % ', '.join(sorted(escr ^ ESCRITURAS)), escr == ESCRITURAS)
llamadas = set(re.findall(r"\bllama\('([a-z_]+)'", CODIGO)) | set(re.findall(r"\benvia\('([a-z_]+)'", CODIGO)) | set(re.findall(r"lEscribe\(el, '([a-z_]+)'", CODIGO))
mira('todo lo que se llama tiene su entrada literal (%s)' % ', '.join(sorted(llamadas - LECTURAS - ESCRITURAS)), llamadas <= LECTURAS | ESCRITURAS)
mira('ni la viejas orden_trabajo_abre/cierra ni las de la edge (foto_prepara/confirma/ver/cuenta) se llaman desde el navegador',
     not re.search(r"'orden_trabajo_(?!datos')|taller_foto_|taller_fotos_cuenta", CODIGO + CODIGO_FOTOS))
mira('ninguna lectura encadenada (.rpc(...).select)', '.select(' not in CODIGO and not re.search(r"\.rpc\([^)]*\)\s*\.", CODIGO))
# el filtro p_estado: 'cerrada' de la lectura de partes (S9) no es un estado que se escriba: se quita ESE literal y nada más antes de mirar
mira('el navegador no manda autor, correo, número, ruta ni estado de la moto',
     not re.search(r"p_(autor|por|email|numero|ruta|estado|unidad_estado|abierta|cerrada|user)\b", CODIGO.replace("llama('orden_trabajo_datos', { p_estado: 'cerrada', p_limit: PARTES_PAGINA,", "llama('orden_trabajo_datos', {")) and "'ruta'" not in CODIGO_FOTOS and 'ruta' not in re.sub(r"'[^']*'", '', CODIGO_FOTOS))
mira('abrir manda SOLO moto, motivo y nota', "{ p_unidad: E.moto.id, p_motivo_tipo: E.motivo, p_nota: nota || null }" in CODIGO)
mira('km manda orden, km entero, gasolina y la confirmación', "{ p_orden: id, p_km: n, p_gasolina: E.gas, p_confirma: !!confirma }" in CODIGO and 'inputmode: \'numeric\'' in CODIGO and "replace(/[^0-9]/g, '')" in CODIGO)
mira('resultado manda orden, resultado, nota y motivo de excepción', "{ p_orden: id, p_resultado: res, p_nota: nota || null, p_motivo_excepcion: exc || null }" in CODIGO)
mira('las fotos van a la edge taller-fotos con el token de la sesión, multipart accion/orden/ranura/clave/fichero',
     "window.lwEdge('taller-fotos')" in CODIGO and all("fd.append('%s'" % k in CODIGO_FOTOS for k in ('accion', 'orden', 'ranura', 'clave', 'fichero')))
mira('fotos: cámara trasera y re-codificación webp o JPEG; el original nunca se sube',
     "capture: 'environment'" in CODIGO_FOTOS and "'image/webp'" in CODIGO_FOTOS and "'image/jpeg'" in CODIGO_FOTOS and "fd.append('fichero', e.blob" in CODIGO_FOTOS
     and re.search(r"recodifica\(f\)\.then\(function \(blob\)", CODIGO_FOTOS) is not None)
mira('un envío del asistente a la vez (doble toque = uno) y la barra bloqueada mientras dura', 'if (E.enviando) return Promise.resolve(null);' in CODIGO and 'bloquea(true);' in CODIGO)
mira('«no hay» ≠ «no he podido mirar» en el inicio y en las listas', "T('No se han podido mirar las motos')" in CODIGO and "T('No se han podido mirar las listas')" in CODIGO
     and "T('No hay motos esperando revisión. Busca la matrícula para abrir una orden.')" in CODIGO)
mira('setup: sin «setup» en la respuesta se trata como listo; se pintan los pasos obligatorios sin hacer, por su clave',
     "if (!s || typeof s !== 'object') return { listo: true" in CODIGO and 'p.obligatorio === true && p.hecho !== true' in CODIGO and 'SETUP[p.clave]' in CODIGO and 'p.detalle' not in CODIGO)
mira('el «donde» de la base solo se usa como enlace si es una ruta relativa del mismo origen', 'seguro(p.donde)' in CODIGO and r"^\/(?!\/)" in CODIGO)
mira('la matrícula se busca sin espacios ni signos', "replace(/[^A-Z0-9]/g, '')" in CODIGO)
mira('la URL lleva #o=<orden>&p=<paso> con pushState y popstate, y #listas', "'#o=' + E.orden.orden.id + '&p=' + paso" in CODIGO and 'history.pushState' in CODIGO
     and "addEventListener('popstate'" in CODIGO and "'#listas'" in CODIGO)
mira('el hash no choca con los tokens de Supabase que adelanta la portada', not re.search(r'access_token|refresh_token|token_hash|error_description', ''.join(re.findall(r"'#[a-z]=", CODIGO))))
acciones = set(re.findall(r'data-accion="(tl-[a-z-]+)"', MARCADO)) | set(re.findall(r"'data-accion': '(tl-[a-z-]+)'", CODIGO)) | set(re.findall(r"accion: '(tl-[a-z-]+)'", CODIGO))
sin_manejador = sorted(a for a in acciones if ("a === '" + a + "'") not in CODIGO and not a.startswith('tl-km-'))
mira('todo data-accion tiene manejador (%s)' % ', '.join(sin_manejador), not sin_manejador)
estilo = MARCADO[MARCADO.index('<style>'):MARCADO.index('</style>')].replace('/*AXW_COMUN_CSS*/', '')
mira('CSS de la pantalla: ningún color hex ni rgb() fijo; solo var(--tema-*)', not re.search(r'#[0-9a-fA-F]{3,8}\b', estilo) and not re.search(r'rgba?\((?!var\()', estilo))
mira('móvil: por debajo de 768 px ancho completo con 16 px y barra fija con safe-area y dvh', '@media (max-width:767px)' in estilo and 'padding-left:16px' in estilo
     and 'env(safe-area-inset-bottom)' in estilo and '100dvh' in estilo and 'position:fixed' in estilo)
mira('botones de 56 px', estilo.count('min-height:56px') >= 4)
mira('Baik / Perlu dicek / Rusak como radiogroup con aria-checked, texto e icono', "role: 'radiogroup'" in CODIGO and "role: 'radio'" in CODIGO and "'aria-checked'" in CODIGO and "'tl-ico'" in CODIGO)

# hints: los que se traducen existen en la base (migración) o en la edge; los pendientes de la base se declaran aquí
def migracion(nombre='20261011170000_f8_taller_pasos.sql'):
    cands = [os.path.join(build.AGENCIA, 'erp', 'migraciones', nombre)]
    cands += sorted(glob.glob(os.path.join(build.AGENCIA, 'proyectos', '_sesiones', '*', 'Agencia', 'erp', 'migraciones', nombre)))
    for c in cands:
        if os.path.isfile(c):
            return open(c, encoding='utf-8').read()
    return None
MIG = migracion()
MIG_VIEJA = migracion('20261008135100_f8_orden_trabajo.sql')   # orden_trabajo_datos (S9) nace aquí con su grant; 20261011170000 la reemplaza y conserva permisos
# los propios de la edge taller-fotos (cabecera de erp/funciones/taller-fotos/index.ts, ebaab585, 12-oct-2026)
EDGE_HINTS = {'origen', 'metodo', 'sin_sesion', 'sesion_no_comprobada', 'tope_minuto', 'cuerpo', 'accion', 'campo_no_admitido', 'orden', 'ranura', 'clave', 'foto',
              'fichero', 'fichero_grande', 'fichero_vacio', 'fichero_tipo', 'fichero_exif', 'almacen', 'base', 'config'}
PENDIENTES_BASE = set()   # hints que la pantalla traduce antes de que la base los tenga (taller_sin_configurar ya entró en 20261011170000 el 12-oct)
bloque = CODIGO[CODIGO.index('/*TEXTOS*/') if '/*TEXTOS*/' in CODIGO else 0:]
textos = JS[JS.index('/*TEXTOS*/'):JS.index('/*FIN_TEXTOS*/')]
out = node(textos + '\nconsole.log(JSON.stringify({h: Object.keys(TEXTO_HINT), v: [PASOS, TITULO, MOTIVOS, GASOLINA, RESULTADOS, REV, ESTADO_MOTO, SETUP, PORQUE, FOTO_RANURA, TEXTO_HINT]}));')
TX = json.loads(out.stdout) if out.returncode == 0 else {'h': [], 'v': []}
mira('el bloque TEXTOS se puede evaluar', out.returncode == 0)
fg = node(FOTOS_JS + '\nvar F = axwFotosDiccionario(); console.log(JSON.stringify({en: F.EN, id: F.ID}));')
FG = json.loads(fg.stdout) if fg.returncode == 0 else {'en': {}, 'id': {}}
hints_fotos = set(re.findall(r"^\s+([a-z_]+): ", FOTOS_JS[FOTOS_JS.index('var DEFINITIVOS = {'):FOTOS_JS.index('};', FOTOS_JS.index('var DEFINITIVOS = {'))], flags=re.M)) | \
              set(re.findall(r"\b([a-z_]+): (?:REPITE|CERRADA|')", FOTOS_JS[FOTOS_JS.index('var DEFINITIVOS = {'):FOTOS_JS.index('};', FOTOS_JS.index('var DEFINITIVOS = {'))]))
if MIG is None:
    NO_COMPROBADO.append('hints y funciones contra la migración 20261011170000 (no está en la agencia de este disco)')
else:
    base_hints = set(re.findall(r"hint = '([a-z_]+)'", MIG))
    mira('la base da el setup como lo lee la pantalla (setup.listo y setup.pasos con clave/hecho/obligatorio/donde)', ("'setup', (select jsonb_build_object('listo'" in MIG and "'pasos', s.p)" in MIG and "jsonb_build_object('clave', 'revisiones', 'hecho'" in MIG))
    malos = sorted(set(TX['h']) - base_hints - PENDIENTES_BASE)
    mira('todo hint que traduce la pantalla existe en la migración o está declarado pendiente (%s)' % ', '.join(malos), not malos)
    mira('los pendientes declarados de verdad faltan en la migración (si ya están, quítalos de PENDIENTES_BASE)', not (PENDIENTES_BASE & base_hints))
    malos_f = sorted(hints_fotos - base_hints - EDGE_HINTS)
    mira('todo hint de las fotos existe en la base o en la edge (%s)' % ', '.join(malos_f), not malos_f)
    funcs = set(re.findall(r'create function public\.([a-z_]+)\(', MIG))
    grant = MIG[MIG.index('grant execute on function public.taller_datos()'):MIG.index('to authenticated;', MIG.index('grant execute on function public.taller_datos()'))]
    vieja_ok = bool(MIG_VIEJA) and 'grant execute on function public.orden_trabajo_datos(text, integer, uuid) to authenticated;' in MIG_VIEJA \
        and 'create or replace function public.orden_trabajo_datos(p_estado text default null, p_limit integer default 100, p_despues uuid default null)' in MIG
    faltan = sorted(n for n in LECTURAS | ESCRITURAS if not (n == 'orden_trabajo_datos' and vieja_ok) and (n not in funcs or ('public.%s(' % n) not in grant))
    mira('cada RPC existe en la migración y authenticated la ejecuta (%s)' % ', '.join(faltan), not faltan)
    for n, firma in (('taller_orden_abre', 'p_unidad uuid, p_motivo_tipo text, p_nota text'), ('taller_orden_km', 'p_orden uuid, p_km integer, p_gasolina smallint, p_confirma boolean'),
                     ('taller_orden_resultado', 'p_orden uuid, p_resultado text, p_nota text default null, p_motivo_excepcion text'),
                     ('taller_moto_devuelve', 'p_unidades uuid[], p_motivo text'), ('taller_revision_marca', 'p_orden uuid, p_revision uuid, p_resultado text, p_nota text')):
        mira('la firma de %s casa con lo que manda la pantalla' % n, ('create function public.%s(%s' % (n, firma)) in MIG)

# -- (4) idiomas
def dic(bloque_js, var):
    o = node(bloque_js + '\nconsole.log(JSON.stringify(%s));' % var)
    return json.loads(o.stdout) if o.returncode == 0 else {}
EN = dic(JS[JS.index('var EN_TL = {'):JS.index('var ID_TL = {')], 'EN_TL')
ID = dic(JS[JS.index('var ID_TL = {'):JS.index('var T = typeof window.lwT')], 'ID_TL')
CO = json.loads(node(COMUN_JS + '\nvar X = axwComun(null, function (s) { return s; }); console.log(JSON.stringify({en: X.EN, id: X.ID}));').stdout or '{"en":{},"id":{}}')
mira('EN_TL e ID_TL con las mismas claves (%s)' % '; '.join(sorted(set(EN) ^ set(ID))[:6]), set(EN) == set(ID) and len(EN) > 50)
mira('las fotos: EN e ID con las mismas claves', set(FG['en']) == set(FG['id']) and len(FG['en']) > 10)
conoce_en = set(EN) | set(CO['en']) | set(FG['en'])
conoce_id = set(ID) | set(CO['id']) | set(FG['id'])
pintados = set()
for cod in (CODIGO, CODIGO_FOTOS):
    pintados |= {s.replace("\\'", "'") for s in re.findall(r"\bT\('((?:[^'\\]|\\.)+)'", cod)}
    pintados |= {s.replace("\\'", "'") for s in re.findall(r"\bTT\('((?:[^'\\]|\\.)+)'", cod)}
    pintados |= set(re.findall(r"\bcampoL\('([^']+)'", cod)) | set(re.findall(r"\bseccion\('([^']+)'", cod))
pintados |= {s.strip() for s in re.findall(r'data-lwt>([^<]+)<', MARCADO)}
pintados |= set(re.findall(r"\[\['Clave'\].*?\]\]", CODIGO) and re.findall(r"\['([A-ZÁÉÍÓÚ][^']*)'\]", re.findall(r"\[\['Clave'\].*?\]\]", CODIGO)[0]))
def valores(x):
    if isinstance(x, str):
        yield x
    elif isinstance(x, list):
        for y in x:
            yield from valores(y)
    elif isinstance(x, dict):
        for y in x.values():
            yield from valores(y)
for s in valores(TX['v']):
    if re.search(r'[A-Za-zÁ-ú]', s) and not re.match(r'^[a-z_]+$', s):
        pintados.add(s)
for s in re.findall(r"'((?:[^'\\]|\\.)+)'", FOTOS_JS[FOTOS_JS.index('var ROTULO = {'):FOTOS_JS.index('};', FOTOS_JS.index('var ROTULO = {'))]):
    if s[0].isupper():
        pintados.add(s)
for s in re.findall(r": '([A-Z¿][^']+)'", FOTOS_JS[FOTOS_JS.index('var TEXTO_ESTADO = {'):FOTOS_JS.index('};', FOTOS_JS.index('var TEXTO_ESTADO = {'))]):
    pintados.add(s)
pintados = {p for p in pintados if re.search(r'[A-Za-zÁ-ú]', p)}
i18n = open(os.path.join(build.LAWANG, 'contracts', 'assets', 'i18n.js'), encoding='utf-8').read()
sin_en = sorted(p for p in pintados if p not in conoce_en and ("'" + p + "':") not in i18n)
sin_id = sorted(p for p in pintados if p not in conoce_id)
mira('todo texto pintable tiene inglés (%s)' % '; '.join(x[:40] for x in sin_en[:6]), not sin_en)
mira('todo texto pintable tiene indonesio (%s)' % '; '.join(x[:40] for x in sin_id[:6]), not sin_id)
G = json.load(open(os.path.join(AQUI, 'glosario_id.json'), encoding='utf-8'))
malos, glos = [], []
for nombre, dd in (('ID_TL', ID), ('fotos', FG['id'])):
    for k, v in dd.items():
        if not v.strip() or (v == k and k not in build.IGUALES_EN_ID):
            malos.append('%s: %s' % (nombre, k[:40]))
        for p in G['prohibidos']:
            if p in v.lower():
                malos.append('%s: «%s» en %s' % (nombre, p, v[:40]))
        if k in G['excepciones']:
            continue
        for es, id_ in G['terminos'].items():
            formas = id_ if isinstance(id_, list) else [id_]
            if re.search(r'\b' + es + r'\b', k, re.I) and not any(x in v.lower() for x in formas):
                glos.append('%s: «%s» → «%s»' % (nombre, k[:30], v[:30]))
mira('indonesio sin vacíos, sin iguales a la clave y sin palabras prohibidas (%s)' % '; '.join(malos[:5]), not malos)
mira('el glosario se cumple en ID_TL y en las fotos (%s)' % '; '.join(glos[:5]), not glos)
mira('nada con «balian» en la pantalla ni en las fotos', 'balian' not in FUENTE.lower() and 'balian' not in FOTOS_JS.lower())
# una sola traducción por clave entre ID_TL, las fotos, las ayudas comunes y el diccionario de la instancia (i18n_id.json): el primero que se fusiona gana sin avisar
otros = {'i18n_id.json': json.load(open(os.path.join(AQUI, 'i18n_id.json'), encoding='utf-8')), 'comun': CO['id']}
for f in os.listdir(AQUI):
    if f.endswith('.html') and f != 'taller.html':
        t = open(os.path.join(AQUI, f), encoding='utf-8').read()
        for mm in re.finditer(r'var (ID_[A-Z]+) = \{', t):
            o2 = node('var X = {' + t[mm.end():t.index('\n  };', mm.end())] + '\n};\nconsole.log(JSON.stringify(X));')
            if o2.returncode == 0:
                otros[f + ':' + mm.group(1)] = json.loads(o2.stdout)
choques = []
for nombre, dd in (('ID_TL', ID), ('fotos', FG['id'])):
    for k, v in dd.items():
        for on, od in otros.items():
            if k in od and od[k] != v:
                choques.append('%s: %s=«%s» vs %s=«%s»' % (k[:25], nombre, v[:20], on, od[k][:20]))
mira('una sola traducción por clave con los demás diccionarios (%s)' % '; '.join(choques[:4]), not choques)
mira('ID_TL se declara como lo lee test_idiomas_instancia.py (var ID_TL = { … \\n  };)', re.search(r'\n  var ID_TL = \{', JS) is not None and '\n  };' in JS[JS.index('var ID_TL = {'):])

# B9 (N4/T, 14-oct-2026): «Necesario para abrir el Taller» tiene una sola fuente, el `exige_taller` de los pasos taller_* en erp/modulos.json (que
# erp/modulos.py --check ata a _taller_setup_estado). Los pasos de una instancia vienen de su base (erp_modulos.setup, sin ese campo), así que la
# pantalla lleva su lista NECESARIO_TALLER y aquí se comprueba que es la misma. Sin el campo en la agencia, NO COMPROBADO solo mientras B9 no haya aterrizado (sin taller_exige_roto en modulos.py); después, rojo.
def necesario_taller(js):
    m = re.search(r'var NECESARIO_TALLER = \{([^}]*)\}', js)
    return None if not m else set(re.findall(r'(\w+)\s*:\s*1', m.group(1)))
def exige_registro(ruta):
    pasos = (json.load(open(ruta, encoding='utf-8')).get('setup', {}).get('modulos', {}).get('reservas-producto') or {}).get('pasos') or []
    taller = [p for p in pasos if p.get('clave', '').startswith('taller_')]
    if not taller or any('exige_taller' not in p for p in taller):
        return None
    return {p['clave'] for p in taller if p['exige_taller'] is True}
_comun_js = open(os.path.join(AQUI, 'setup_comun.js'), encoding='utf-8').read()
_reg = os.path.join(build.AGENCIA, 'erp', 'modulos.json')
_exige = exige_registro(_reg) if os.path.isfile(_reg) else None
# el escape caduca solo: con B9 ya en la agencia (modulos.py trae taller_exige_roto), un registro sin el campo o sin pasos taller_* es rojo
_b9_en_agencia = 'def taller_exige_roto(' in open(os.path.join(build.AGENCIA, 'erp', 'modulos.py'), encoding='utf-8').read()
if _exige is None and not _b9_en_agencia:
    NO_COMPROBADO.append('B9: erp/modulos.json de la agencia sin exige_taller en los pasos taller_* (B9 sin aterrizar): NECESARIO_TALLER sin comparar')
else:
    mira('B9: NECESARIO_TALLER de setup_comun.js = los pasos con exige_taller del registro (%s vs %s)' % (sorted(necesario_taller(_comun_js) or []), sorted(_exige or [])),
         _exige is not None and necesario_taller(_comun_js) == _exige)
mira('B9 contraprueba: una lista distinta no casa', necesario_taller('var NECESARIO_TALLER = { taller_revisiones: 1 };') != {'taller_revisiones', 'taller_mecanicos'})
def _registro_inventado(pasos):
    d = tempfile.mkdtemp()
    ruta = os.path.join(d, 'modulos.json')
    json.dump({'setup': {'modulos': {'reservas-producto': {'pasos': pasos}}}}, open(ruta, 'w', encoding='utf-8'))
    try:
        return exige_registro(ruta)
    finally:
        shutil.rmtree(d, ignore_errors=True)
_otro = _registro_inventado([{'clave': 'taller_revisiones', 'exige_taller': True}, {'clave': 'taller_mecanicos', 'exige_taller': False},
                             {'clave': 'taller_recambios', 'exige_taller': True}])
mira('B9 contraprueba: un registro con otro exige_taller no casa con NECESARIO_TALLER (%s)' % sorted(_otro or []),
     _otro == {'taller_revisiones', 'taller_recambios'} and necesario_taller(_comun_js) != _otro)
mira('B9 contraprueba: un paso taller_* sin exige_taller deja el registro sin lista (None)',
     _registro_inventado([{'clave': 'taller_revisiones', 'exige_taller': True}, {'clave': 'taller_mecanicos'}]) is None)

print('ok: %d comprobaciones' % casos if not fallos else 'FALLOS (%d de %d):\n  %s' % (len(fallos), casos, '\n  '.join(fallos)))
for n in NO_COMPROBADO:
    print('NO COMPROBADO: ' + n)
sys.exit(1 if fallos else 0)
