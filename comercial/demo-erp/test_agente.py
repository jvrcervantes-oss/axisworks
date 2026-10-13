# Prueba de build.py:agente_pantalla() + agente.html (panel del AaaS, EP.5, 13-oct-2026): python test_agente.py
# Igual que test_entrega.py: parte de los ficheros REALES de Lawang (solo lectura) copiados a una carpeta temporal y corre la CADENA entera de overlays hasta Flota y
# AaaS. Mira que (1) la pantalla entra con las ayudas comunes pegadas UNA vez y todo el JS compila, (2) si algo cambia (la cadena, una marca, un fichero común) el build
# PARA, (3) la pantalla cumple las reglas de seguridad del front (sin innerHTML, solo las RPC de agente_forma.json, nada de .from(), ningún rol cableado) y (4) todo texto
# que pinta está en los diccionarios EN e ID. El comportamiento en un navegador lo mide pruebas/agente.harness.cjs (contra el doble de agente_forma.json).
# NO ejecuta build.instancia(): no escribe nada en erp/despliegues/.
import json, os, re, shutil, subprocess, sys, tempfile
AQUI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, AQUI)
import build

FUENTE = open(os.path.join(AQUI, 'agente.html'), encoding='utf-8').read()
MARCADO, SCRIPT = FUENTE.split('<!--AXW_SCRIPT-->')
COMUN_JS = open(os.path.join(AQUI, '_compartido', 'pantalla_comun.js'), encoding='utf-8').read()
FORMA = json.load(open(os.path.join(AQUI, 'agente_forma.json'), encoding='utf-8'))
JS = SCRIPT.strip()
JS_TODO = JS.replace('/*AXW_COMUN_JS*/', COMUN_JS.strip())
def sin_comentarios(t):
    t = re.sub(r'/\*.*?\*/', '', t, flags=re.S)
    return re.sub(r'(?m)^\s*//.*$', '', t)
CODIGO = sin_comentarios(JS)
FICHEROS = ['intranet/v4/asistente/index.html', 'intranet/v4/assets/nav.js', 'contracts/assets/herramientas.js',
            'intranet/v4/assets/editores.js', 'intranet/v4/assets/ajustes.js']


def cadena():
    return (build.asistente_maestro, build.whatsapp_bot_pantalla, build.ajustes_correo_maestro, build.ventas_pantalla, build.reservas_producto_pantalla,
            build.taller_pantalla, build.entrega_pantalla, build.flota_pantalla, build.agente_pantalla)


def prepara():
    d = tempfile.mkdtemp()
    for f in FICHEROS:
        dst = os.path.join(d, *f.split('/'))
        os.makedirs(os.path.dirname(dst), exist_ok=True)
        shutil.copy(os.path.join(build.LAWANG, *f.split('/')), dst)
    return d


def corre(pasos=None):
    d = prepara()
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
mira('la cadena de overlays (hasta Flota y AaaS) entra sobre los ficheros de Lawang de hoy', r == 'pasa')
pagina = lee(d, 'intranet/v4/agente/index.html') if r == 'pasa' else ''
nav = lee(d, 'intranet/v4/assets/nav.js') if r == 'pasa' else ''
her = lee(d, 'contracts/assets/herramientas.js') if r == 'pasa' else ''
mira('la pagina lleva la puerta de la herramienta agente y ya no la del asistente', 'data-herramienta="agente"' in pagina and 'data-herramienta="asistente"' not in pagina)
mira('el titulo es AaaS', '<title data-lw-titulo>AaaS</title>' in pagina)
mira('el marcado y el script de la fuente entran una vez', pagina.count('<div class="flex flex-col w-full gap-8" data-ag="raiz">') == 1 and pagina.count('var EN_AG = {') == 1 and pagina.count('var ID_AG = {') == 1)
mira('las ayudas comunes se pegan UNA vez (js y css) y las marcas no quedan en la pagina',
     pagina.count('function axwComun(raiz, T)') == 1 and pagina.count('.axw-boton{') == 1 and '/*AXW_COMUN_' not in pagina)
mira('NO hay otra copia local de las ayudas comunes', len(re.findall(r'function (h|dialogo|clasifica|ocupa|libera|tabla|chip|celda|boton|campo|resumen|dinero|fechaHora)\(', CODIGO)) == 0)
m = re.findall(r'<script>\n(.*?)\n</script>\n</body></html>', pagina, flags=re.S)
chk = compila(m[-1], 'v.js') if m else None
mira('el script de la pagina resultante compila (node --check)' + (': ' + chk.stderr.strip()[:300] if chk is not None and chk.returncode else ''), bool(m) and chk.returncode == 0)
if r == 'pasa':
    for nombre, cod in (('nav.js', nav), ('herramientas.js', her)):
        c2 = compila(cod, nombre)
        mira('el %s resultante compila%s' % (nombre, (': ' + c2.stderr.strip()[:300]) if c2.returncode else ''), c2.returncode == 0)
    mira('nav.js: entrada de menu, injerto y casilla del AaaS, una vez cada uno',
         nav.count("{ path: 'agente', texto: 'AaaS', clave: 'agente', nucleo: true }") == 1 and nav.count("{ path: 'agente', tras: 'flota'") == 1 and nav.count("agente: 'agente',") == 1)
    mira('el injerto del AaaS viene DESPUES del de Flota', nav.index("path: 'flota', tras: 'entrega'") < nav.index("path: 'agente', tras: 'flota'"))
    mira('puedeVer no deja pasar sin la casilla: CLAVE_MENU de agente existe antes de la linea que la usa', nav.index("agente: 'agente',") < nav.index('var k = CLAVE_MENU[path];'))
    mira('herramientas.js: la tarjeta agente esta UNA vez, tras la de Flota, entre las dos marcas',
         her.count("herr:'agente'") == 1 and her.index("herr:'agente'") > her.index("herr:'flota'")
         and her.index('/*AXW_FIN_TARJETA_FLOTA*/') < her.index("herr:'agente'") < her.index('/*AXW_FIN_TARJETA_AGENTE*/'))
    prueba = ("global.window = { AXW_NUCLEO_OPERACION: true }; var LW_ROL = {}; " + re.sub(r'^\s*export\s+', '', her, flags=re.M) +
              "\nconsole.log(JSON.stringify((typeof LW_HERRAMIENTAS !== 'undefined' ? LW_HERRAMIENTAS : []).filter(t => t.herr === 'agente').map(t => [t.grupo, t.href])));")
    tmp = tempfile.mkdtemp()
    open(os.path.join(tmp, 'h.js'), 'w', encoding='utf-8').write(prueba)
    sal = subprocess.run(['node', os.path.join(tmp, 'h.js')], capture_output=True, text=True, encoding='utf-8')
    try:
        tarj = json.loads(sal.stdout.strip().splitlines()[-1]) if sal.stdout.strip() else None
    except Exception:
        tarj = None
    mira('el catalogo de herramientas trae la tarjeta del AaaS (Seguimiento, /intranet/v4/agente/)', tarj == [['Seguimiento', '/intranet/v4/agente/']])

# -- (2) si algo cambia, el build PARA
ORIGINAL = {f: open(os.path.join(build.LAWANG, *f.split('/')), encoding='utf-8').read() for f in FICHEROS}
mira('para si falta la pantalla de Flota en la cadena (sus anclas son las que deja ella)',
     corre(pasos=cadena()[:-2] + (build.agente_pantalla,))[0] == 'para')
mira('Lawang no se toco: los ficheros siguen igual', all(open(os.path.join(build.LAWANG, *f.split('/')), encoding='utf-8').read() == ORIGINAL[f] for f in FICHEROS))

# -- (3) reglas de seguridad del front
mira('ningun innerHTML ni insertAdjacentHTML ni outerHTML ni document.write', not re.search(r'innerHTML|insertAdjacentHTML|outerHTML|document\.write|\.append\(\s*`', CODIGO))
mira('no usa el esc() de Lawang', not re.search(r'\besc\(|lwCajonHtml', CODIGO))
mira('ningun console.log', 'console.log' not in CODIGO)
mira('el navegador no toca tablas ni almacenamiento: ni .from( ni insert/update/upsert/delete ni storage', not re.search(r'\.from\(|\.insert\(|\.update\(|\.upsert\(|\.delete\(|\.storage\b|localStorage|sessionStorage', CODIGO))
mira('no nombra claves de servicio', not re.search(r'service_role|sb_secret_', JS + MARCADO))
mira('no trae un rol cableado: quien es dueño lo dice la base (soy_dueno / puedo_decidir)', not re.search(r"rol\s*===|\.rol\b|es_admin|esAdmin|LW_ROL|super_admin", CODIGO) and 'soy_dueno' in CODIGO)
CONTRATO = set(FORMA['lecturas']) | set(FORMA['escrituras'])
literales = set(re.findall(r"(?:SB\.rpc|window\.lwDatos)\('([a-z_]+)'", CODIGO))
mira('cada RPC con su nombre LITERAL y son exactamente las de agente_forma.json (' + ', '.join(sorted(literales ^ CONTRATO)) + ')', literales == CONTRATO)
mira('las *_datos van por lwDatos y el resto por sb.rpc (lwDatos lanza con otro nombre)',
     set(re.findall(r"window\.lwDatos\('([a-z_]+)'", CODIGO)) == {n for n in CONTRATO if n.endswith('_datos')}
     and all(not n.endswith('_datos') for n in re.findall(r"SB\.rpc\('([a-z_]+)'", CODIGO)))
for n, e in FORMA['escrituras'].items():
    usados = re.findall(r"(?:llama\(|hazYRecarga\(el, |hazYRecarga\(btn, )'" + n + r"', \{([^}]*)\}", CODIGO)
    args = set()
    for u in usados:
        args |= set(re.findall(r'\b(p_[a-z_]+)\s*:', u))
    mira('%s: manda exactamente los argumentos del contrato %s (manda %s)' % (n, sorted(e['args']), sorted(args)), args == set(e['args']))
mira('nada de autor, correo, fechas ni uid viaja a la base', not re.search(r'p_(autor|por|email|creado|actualizado|user|uid|fecha|dueno)', CODIGO))
mira('los trabajos NO van en una lista fija de la pantalla: el orden sale de trabajos_orden de la base', not re.search(r'var TRABAJOS\s*=', CODIGO) and 'd.trabajos_orden' in CODIGO)
def mapa(nombre):
    """{clave: texto} del objeto `var <nombre> = {...};` del código (sin comentarios)."""
    i = CODIGO.index('var ' + nombre + ' = {')
    trozo = CODIGO[i:CODIGO.index('};', i)]
    return dict(re.findall(r"(?:\b|')([a-z0-9_]+)'?:\s*'((?:[^'\\]|\\.)*)'", trozo))
mira('cada trabajo del catálogo de Reservas (agente_forma.json) tiene su nombre en NOMBRE', set(FORMA['trabajos']) <= set(mapa('NOMBRE')))
mira('un trabajo sin nombre se enseña tal cual (sin T(), que lo daría por frase sin traducir)', "NOMBRE[t] ? T(NOMBRE[t]) : String(t)" in CODIGO)
mira('trabajos_orden vacío lo dice', "T('Este ERP aún no tiene trabajos del AaaS para su tipo de negocio.')" in CODIGO)

# -- (3c) ventana de configuración (14-oct): claves LEÍDAS del contrato, no copiadas a mano
EST = FORMA['lecturas']['agente_panel_estado']['devuelve']
NO_PINTA = {'nivel_max', 'cupo_dia'}   # la ventana no las enseña (decisión de la pantalla: el cupo y el techo de nivel son de la base)
sin_leer = sorted(k for k in EST if k not in NO_PINTA and not re.search(r'\bd\.' + k + r'\b', CODIGO))
mira('la ventana lee cada clave de agente_panel_estado del contrato' + (' (no lee: ' + ', '.join(sin_leer) + ')' if sin_leer else ''), not sin_leer)
ACC = FORMA['lecturas']['agente_notas_datos']['devuelve']['acciones']
claves_acc = set(re.findall(r'[\[{,]\s*([a-z_]+):', ACC))
mira('cada clave de una acción del contrato se lee (%s)' % ', '.join(sorted(k for k in claves_acc if not re.search(r'\.' + k + r'\b', CODIGO))),
     all(re.search(r'\.' + k + r'\b', CODIGO) for k in claves_acc))
def opciones(campo, texto):
    m = re.search(campo + r": ('[a-z_]+'(?: \| '[a-z_]+')*)", texto)
    return set(re.findall(r"'([a-z_]+)'", m.group(1))) if m else set()
mira('cada estado de acción del contrato tiene su rótulo (ACC_ESTADO)', opciones('estado', ACC) == set(mapa('ACC_ESTADO')) and opciones('estado', ACC))
mira('cada motivo de aviso_reserva del contrato tiene su frase (ACC_AVISO)', opciones(r'datos: \{reserva: uuid, motivo', ACC) == set(mapa('ACC_AVISO')) and mapa('ACC_AVISO'))
mira('cada motivo de una acción decidida tiene su frase (ACC_MOTIVO)', set(re.findall(r"'([a-z]+)'", ACC.split('motivo: null |')[1].split(',')[0])) == set(mapa('ACC_MOTIVO')))
RES = FORMA['escrituras']['agente_accion_decide']['devuelve']
mira('cada resultado de agente_accion_decide tiene su frase (ACC_RESULTADO: estados aceptada/rechazada y motivos de anulada/caducada)',
     set(mapa('ACC_RESULTADO')) == (opciones('estado', RES) - {'anulada'}) | set(re.findall(r"'([a-z]+)'", RES.split('motivo: null |')[1])))
hints = set(re.findall(r"hint '([a-z_]+)'", json.dumps(FORMA['errores_con_hint'], ensure_ascii=False))) | {'ya_decidida'}
mira('cada hint del contrato (y ya_decidida) tiene su frase en POR_HINT (' + ', '.join(sorted(hints - set(mapa('POR_HINT')))) + ')', hints <= set(mapa('POR_HINT')))
mira('modulo_de_pago dice que lo enciende el estudio, y modulo_de_otro_tipo tiene frase propia',
     'lo enciende el estudio' in mapa('POR_HINT').get('modulo_de_pago', '') and 'tipo de negocio' in mapa('POR_HINT').get('modulo_de_otro_tipo', ''))
mira('cada nivel 0-3 tiene su nombre', set(mapa('NIVELES')) == {'0', '1', '2', '3'})
mira('guardar límites manda TODAS las filas de `limites` (nunca limites_fuera) y los topes vacíos no viajan',
     'd.limites.forEach(function (l)' in CODIGO and 'niveles[l.modulo] = n;' in CODIGO and 'if (!imp.vacio) topes[l.modulo]' in CODIGO
     and not re.search(r'limites_fuera[^;]*(niveles|topes)\[', CODIGO))
mira('«Cancelar la subida»: el tope GUARDADO explícito y null en trabajos y nivel; solo con subida pendiente y solo el dueño',
     "llama('agente_ficha_ajusta', { p_tope_mensual_cent: guardado, p_trabajos: null, p_nivel_ruta: null, p_motivo: m })" in CODIGO
     and 'var guardado = d.tope_mensual_cent;' in CODIGO and "if (d.soy_dueno && ent(d.tope_propuesto_cent)) acc.appendChild(C.boton(T('Cancelar la subida'), 'ag-cancelar-subida'));" in CODIGO)
mira('decidir una acción: un solo envío (ocupa + la tarjeta marcada mientras va) y solo el dueño ve los botones',
     "art.getAttribute('data-enviando') === '1'" in CODIGO and 'C.ocupa(btn)' in CODIGO and '} else if (dueno) {' in CODIGO
     and "if (E.estado && E.estado.soy_dueno) decideAccion(" in CODIGO)
mira('límites, contexto y ajustes: el dueño escribe; el resto los ve en solo lectura (fieldset deshabilitado)',
     all(s in CODIGO for s in ("$a('ajustes').disabled = !d.soy_dueno;", 'form.disabled = !d.soy_dueno;')) and CODIGO.count('form.disabled = !d.soy_dueno;') == 2)
mira('el nombre de un módulo es un dato (rótulo del registro o su id), nunca pasa por T()', 'window.AXW_MAPA_MODULOS' in CODIGO and not re.search(r'T\(nombreModulo', CODIGO))
mira('cada bloque nuevo que no puede leer su parte lo dice en su sitio (no mirado ≠ vacío)',
     all(s in CODIGO for s in ("msg('error-limites', T(NO_MIRADO))", "msg('error-contexto', T(NO_MIRADO))", "msg('error-acciones', T(NO_MIRADO))", "'historial-error'")))
mira('cada clase de aviso de la forma tiene su frase (RECUENTO, MOTIVO_TARIFA o caso propio)',
     all(("'" + k + "'") in CODIGO or (k + ':') in CODIGO for t, d2 in FORMA['items_por_trabajo'].items() for k in d2 if k != '_sin_tipo')
     and all((k + ':') in CODIGO for k in FORMA['motivos_tarifa']))
mira('un aviso desconocido NO se calla: tiene frase propia', 'Aviso de un tipo que esta pantalla aún no conoce.' in CODIGO)
mira('un trabajo sin nota hoy lo dice («Sin pasada todavía hoy.») y uno sin datos también', 'Sin pasada todavía hoy.' in CODIGO and 'Sin reservas en este sistema todavía.' in CODIGO)
mira('apagar y encender piden motivo y confirmacion en un dialogo', "conMotivo(T(enc ? 'Encender el AaaS' : 'Apagar el AaaS')" in CODIGO and "accion: 'ag-modal-confirmar'" in CODIGO)
mira('doble clic: un solo envio a la vez (ocupa/libera)', 'C.ocupa(btn)' in CODIGO and 'C.libera(btn)' in CODIGO)
mira('enganche por data-accion/data-ag/data-campo; ningun texto de boton se usa para encontrar nada', not re.search(r'textContent\s*===|innerText|\.placeholder', CODIGO))
acciones = set(re.findall(r"C\.boton\([^;]*?, '(ag-[a-z-]+)'", CODIGO)) | set(re.findall(r'data-accion="(ag-[a-z-]+)"', MARCADO))
mira('toda accion tiene manejador (' + ', '.join(sorted(a for a in acciones if ("a === '" + a + "'") not in CODIGO)) + ')', all(("a === '" + a + "'") in CODIGO for a in acciones))

# -- (3b) revisor 13-oct: paquete solo con la marca de la instancia, dinero sin moneda inventada, tope que no viaja si no cambió, Parar con permiso
BUILD = open(os.path.join(AQUI, 'build.py'), encoding='utf-8').read()
mira('la ventana solo entra en el paquete de una instancia con `"aaas": true` (sin sus migraciones, el contrato front-base pararía la publicación)',
     BUILD.count('    if aaas_en_paquete(nombre):\n        agente_pantalla()') == 1 and BUILD.count('agente_pantalla()') == 2
     and "if _instancia_registro(nombre).get('aaas') is not True:" in BUILD)
def aaas_con(clases, marca=True):
    """aaas_en_paquete() con un registro de módulos hecho a mano: True, False o 'para' (aborta)."""
    tmp = tempfile.mkdtemp()
    os.makedirs(os.path.join(tmp, 'erp'))
    json.dump({'objetos': {'funciones': {f: {'clase': c} for f, c in clases.items()}}}, open(os.path.join(tmp, 'erp', 'modulos.json'), 'w', encoding='utf-8'))
    viejo_ag, viejo_reg = build.AGENCIA, build._instancia_registro
    build.AGENCIA, build._instancia_registro = tmp, (lambda n: {'aaas': True} if marca else {})
    try:
        return build.aaas_en_paquete('x')
    except SystemExit:
        return 'para'
    finally:
        build.AGENCIA, build._instancia_registro = viejo_ag, viejo_reg
mira('sin la marca no hay ventana (aunque el registro esté bien)', aaas_con({'agente_panel_estado': 'nucleo', 'agente_modulo_cambia': 'nucleo'}, marca=False) is False)
mira('con la marca y las dos funciones en el núcleo, sí', aaas_con({'agente_panel_estado': 'nucleo', 'agente_modulo_cambia': 'nucleo'}) is True)
mira('con la marca y leer el estado en el módulo agente: el build PARA (Encender quedaría muerto)', aaas_con({'agente_panel_estado': 'modulo', 'agente_modulo_cambia': 'nucleo'}) == 'para')
mira('con la marca y encender sin registrar: el build PARA', aaas_con({'agente_panel_estado': 'nucleo'}) == 'para')
mira('ninguna moneda escrita en la pantalla: la da la base (trinquete eur_literal)', not re.search(r"'EUR'|\"EUR\"", CODIGO))
mira('con el módulo encendido, sin moneda o sin tope entero la respuesta es de forma mala', "ent(d.tope_mensual_cent)" in CODIGO and "/^[A-Z]{3}$/.test(d.moneda)" in CODIGO)
mira('nunca «Sin tope»: un tope ausente vale 0 en la base', 'Sin tope' not in CODIGO and "T('tope 0: no puede gastar')" in CODIGO)
mira('el tope solo viaja si el dueño lo cambió (null = no cambia)', "p_tope_mensual_cent: Math.round(imp.v * 100) === d.tope_mensual_cent ? null : Math.round(imp.v * 100)" in CODIGO)
mira('«Parar» solo con puedo_decidir (la cuenta de pruebas no lo ve)', "if (!d.parado && d.puedo_decidir) acc.appendChild(C.boton(T('Parar'), 'ag-parar'));" in CODIGO)
mira('nada visible dice «piloto»: se llama AaaS (owner, 13-oct)', not re.search(r"(?<![\w_])[Pp]iloto(?![\w_])|(?<![\w_])[Pp]ilot(?![\w_])", re.sub(r'<!--.*?-->|/\*.*?\*/', '', JS + MARCADO, flags=re.S)))

# -- (4) diccionarios EN e ID: todo texto pintable está en los dos
bloque = JS[JS.index('var EN_AG = {'):JS.index('var T = typeof window.lwT')]
tmp = tempfile.mkdtemp()
js_claves = os.path.join(tmp, 'k.js')
open(js_claves, 'w', encoding='utf-8').write(bloque + '\n' + COMUN_JS + '\nvar c = axwComun(null, function (s) { return s; });\nconsole.log(JSON.stringify({en: Object.keys(EN_AG).concat(Object.keys(c.EN)), id: Object.keys(ID_AG).concat(Object.keys(c.ID))}));')
k = json.loads(subprocess.run(['node', js_claves], capture_output=True, text=True, encoding='utf-8').stdout or '{"en":[],"id":[]}')
EN, ID = set(k['en']), set(k['id'])
textos = set()
def lit(s):
    return s.replace("\\'", "'")
for mm in re.finditer(r"\bT\('((?:[^'\\]|\\.)*)'\)|\bTf\('((?:[^'\\]|\\.)*)'", CODIGO):
    textos.add(lit(mm.group(1) or mm.group(2)))
for nombre in ('NOMBRE', 'SIN_DATOS', 'RECUENTO', 'MOTIVO_TARIFA', 'RESULTADO', 'POR_HINT', 'NIVELES', 'CAMPO', 'ACC_ESTADO', 'ACC_MOTIVO', 'ACC_AVISO', 'ACC_RESULTADO'):
    i = CODIGO.index('var ' + nombre + ' = {')
    trozo = CODIGO[i:CODIGO.index('};', i)]
    textos |= {lit(x) for x in re.findall(r":\s*'((?:[^'\\]|\\.)*)'", trozo)}
i = CODIGO.index('var PANTALLA = {'); textos |= {lit(x) for x in re.findall(r"\['/[^']+', '((?:[^'\\]|\\.)*)'\]", CODIGO[i:CODIGO.index('};', i)])}
for mm in re.finditer(r"C\.resumen\(\[(.*?)\]\)", CODIGO):
    textos |= {lit(x) for x in re.findall(r"\['([^'\\]+)',", mm.group(1))}
for mm in re.finditer(r"dato\('([^']+)'", CODIGO):
    textos.add(mm.group(1))
for mm in re.finditer(r'<(\w+)[^>]*data-lwt[^>]*>([^<]+)</\1>', MARCADO):
    textos.add(mm.group(2).strip())
textos.discard('')
sin_en = sorted(t for t in textos if t not in EN)
sin_id = sorted(t for t in textos if t not in ID)
mira('todo texto pintable esta en EN_AG' + (' (faltan: ' + '; '.join(x[:50] for x in sin_en[:8]) + ')' if sin_en else ''), not sin_en)
mira('todo texto pintable esta en ID_AG' + (' (faltan: ' + '; '.join(x[:50] for x in sin_id[:8]) + ')' if sin_id else ''), not sin_id)
mira('EN_AG e ID_AG tienen las mismas claves', set(EN) - set(json.loads(json.dumps(list(EN)))) == set() and set(k['en']) - set(k['id']) == set() and set(k['id']) - set(k['en']) == set())
for nombre_d in ('EN_AG', 'ID_AG'):
    i = JS.index('var ' + nombre_d + ' = {'); trozo = JS[i:JS.index('\n  };', i)]
    cl = re.findall(r"'((?:[^'\\]|\\.)*)'\s*:\s*'", trozo)
    rep = sorted({c for c in cl if cl.count(c) > 1})
    mira('ninguna clave repetida en %s%s' % (nombre_d, (' (' + ', '.join(rep) + ')') if rep else ''), not rep)
# a fichero y no por `node -e`: los diccionarios ya no caben en una línea de órdenes de Windows (WinError 206, 32 767 caracteres)
js_dic = os.path.join(tmp, 'd.js')
open(js_dic, 'w', encoding='utf-8').write(bloque + ';console.log(JSON.stringify([EN_AG, ID_AG]))')
sal2 = subprocess.run(['node', js_dic], capture_output=True, text=True, encoding='utf-8')
den, did = json.loads(sal2.stdout)
malos = [c for c in den if set(re.findall(r'\{[a-z]\}', c)) != set(re.findall(r'\{[a-z]\}', den[c])) or set(re.findall(r'\{[a-z]\}', c)) != set(re.findall(r'\{[a-z]\}', did.get(c, '')))]
mira('las frases con huecos llevan los mismos huecos en EN e ID' + (' (' + '; '.join(malos[:5]) + ')' if malos else ''), not malos)

if fallos:
    print('FALLOS (%d de %d):\n  ' % (len(fallos), casos) + '\n  '.join(fallos))
    sys.exit(1)
print('ok: %d comprobaciones' % casos)
