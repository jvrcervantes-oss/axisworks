# Prueba de build.py:idiomas_de() + idiomas_instancia() + comprueba_idiomas() + i18n_id_nucleo.js + i18n_id.json + glosario_id.json (12-oct-2026; bbm en indonesio e inglés):
#   python test_idiomas_instancia.py
# Parte de los ficheros REALES de Lawang (solo lectura) copiados a una carpeta temporal. Mide (revisión previa de Calidad): que cada parche entra una vez y para si Lawang
# cambia; que Lawang no se toca; que el lwT REAL ya parcheado traduce al indonesio, cae al inglés contándolo y que una frase SOLO en español sale en el contador de español
# (la prueba puede ponerse roja); que idioma.js no deja llegar al español; que el locale es id-ID; diccionario sin vacíos, sin «balian», sin «faktur», con el glosario.
import json, os, re, shutil, subprocess, sys, tempfile
AQUI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, AQUI)
import build

FICHEROS = sorted({x[0] for x in build.IDIOMAS_PARCHES} | {'contracts/assets/i18n.js'} | set(build.ES_ES_FIJOS))
ORIGINAL = {f: open(os.path.join(build.LAWANG, *f.split('/')), encoding='utf-8').read() for f in FICHEROS}
fallos, casos = [], 0
def mira(nombre, ok):
    global casos
    casos += 1
    if not ok:
        fallos.append(nombre)


def prepara(cambia=None, extra=None):
    d = tempfile.mkdtemp()
    for f in FICHEROS:
        dst = os.path.join(d, *f.split('/'))
        os.makedirs(os.path.dirname(dst), exist_ok=True)
        t = ORIGINAL[f]
        if cambia and f in cambia:
            t = cambia[f](t)
        open(dst, 'w', encoding='utf-8', newline='').write(t)
    for f, t in (extra or {}).items():
        dst = os.path.join(d, *f.split('/'))
        os.makedirs(os.path.dirname(dst), exist_ok=True)
        open(dst, 'w', encoding='utf-8', newline='').write(t)
    return d


def corre(idiomas=('id', 'en'), cambia=None, extra=None):
    d = prepara(cambia, extra)
    viejo, build.DIST = build.DIST, d
    try:
        build.idiomas_instancia(list(idiomas))
        return 'pasa', d
    except SystemExit:
        return 'para', d
    finally:
        build.DIST = viejo


def lee(d, f):
    return open(os.path.join(d, *f.split('/')), encoding='utf-8').read()


def node(js):
    tmp = tempfile.mkdtemp(); p = os.path.join(tmp, 'p.js')
    open(p, 'w', encoding='utf-8').write(js)
    r = subprocess.run(['node', p], capture_output=True, text=True, encoding='utf-8')
    return r.stdout.strip().splitlines()[-1] if r.stdout.strip() else ('ERR ' + r.stderr[-300:])


# -- (1) entra sobre los ficheros de Lawang de hoy, una vez, y Lawang no se toca
FECHAS = "var a = new Date().toLocaleDateString('es-ES'); var b = x === 'en' ? 'en-GB' : 'es-ES'; var c = { locale: \"es-ES\" };\n"
r, d = corre(extra={'intranet/v4/assets/fechas_prueba.js': FECHAS})
mira('los parches entran sobre los ficheros de Lawang de hoy', r == 'pasa')
mira('Lawang no se tocó', all(open(os.path.join(build.LAWANG, *f.split('/')), encoding='utf-8').read() == ORIGINAL[f] for f in FICHEROS))
if r == 'pasa':
    for f, viejo, nuevo in build.IDIOMAS_PARCHES:
        mira('%s: el parche entró' % f, nuevo.replace('__AXW_IDIOMAS__', '["id", "en"]') in lee(d, f))
    fp = lee(d, 'intranet/v4/assets/fechas_prueba.js')
    mira("'es-ES' escrito a mano pasa a depender del idioma (comillas simples y dobles)", fp.count("'id-ID'") == 2 and fp.count('"id-ID"') == 1 and fp.count('es-ES') == fp.count('id-ID'))
    i18n = lee(d, 'contracts/assets/i18n.js')
    mira('los es-ES que no son de interfaz (importe editable, factura impresa) se quedan como estaban', all(lee(d, f) == ORIGINAL[f] for f in build.ES_ES_FIJOS))
    mira('el núcleo del indonesio va al final de i18n.js, una vez', i18n.count('window.LW_ID = {') == 1 and i18n.rstrip().endswith('})();') and '__AXW_LW_ID__' not in i18n)
    mira('el idioma.js parcheado declara los idiomas de la instancia', '["id", "en"]' in lee(d, 'contracts/assets/idioma.js'))

# -- (2) para si algo no casa
mira('para si cambia la línea de idioma.js', corre(cambia={'contracts/assets/idioma.js': lambda t: t.replace("(v === 'en') ? 'en' : 'es'", "(v === 'en') ? 'en' : 'es' ", 1)})[0] == 'para')
mira('para si cambia el selector de nav.js', corre(cambia={'intranet/v4/assets/nav.js': lambda t: t.replace("if (t !== 'ES' && t !== 'EN') return;", "if (t !== 'ES' && t !== 'EN' && t !== 'FR') return;", 1)})[0] == 'para')
mira("para si un 'es-ES' va en un atributo HTML (fuera de <script>)", corre(extra={'intranet/v4/z/index.html': '<html lang="es-ES"><body></body></html>'})[0] == 'para')
mira("para si 'es-ES' es CLAVE de un objeto (no se puede envolver)", corre(extra={'intranet/v4/assets/x.js': "var M = { 'es-ES': 1 };\n"})[0] == 'para')
mira('para si el parche deja JavaScript roto', corre(extra={'intranet/v4/assets/y.js': "var a = 'es-ES' +;\n"})[0] == 'para')
viejo_reg = build._instancia_registro
try:
    build._instancia_registro = lambda n: {'idiomas': ['id', 'es']}
    try:
        build.idiomas_de('x'); combo = 'pasa'
    except SystemExit:
        combo = 'para'
    build._instancia_registro = lambda n: {}
    sin = build.idiomas_de('x')
finally:
    build._instancia_registro = viejo_reg
mira('una combinación de idiomas desconocida PARA el build', combo == 'para')
mira('sin la clave, la instancia sigue como siempre (None)', sin is None)

# -- (3) el lwT REAL parcheado, en node (con un documento mínimo)
if r == 'pasa':
    DOC = ("global.document = { documentElement: { lang: 'es' }, title: 'X · Ajustes', querySelectorAll: function () { return []; } };\n"
           "var almacen = {}; global.localStorage = { getItem: function (k) { return almacen[k] || null; }, setItem: function (k, v) { almacen[k] = v; } };\n"
           "global.window = global;\n")
    prueba = DOC + "almacen['lawang_idioma_ui'] = __GUARDADO__;\n" + lee(d, 'contracts/assets/idioma.js') + '\n' + i18n + r'''
var dic = window.LW_ID, enk = Object.keys(window.LW_EN), clave_id = Object.keys(dic).find(function (k) { return k.indexOf('%') < 0 && k.indexOf('~') < 0; });
var solo_en = enk.find(function (k) { return !(k in dic) && k.indexOf('%') < 0 && k.indexOf('~') < 0 && /[a-záéíóúñ]{4}/i.test(k); });
var r = { idioma: window.LW_IDIOMA, locale: window.lwLocale(), id: [clave_id, window.lwT(clave_id), dic[clave_id]], en: [solo_en, window.lwT(solo_en), window.LW_EN[solo_en]],
          sembrada: window.lwT('Frase sembrada solo en español zzq'), caida: window.LW_T_CAIDA_EN.has(solo_en), espanol: window.LW_T_ESPANOL.has('Frase sembrada solo en español zzq'),
          numero: window.LW_T_ESPANOL.has('12.500'), lang: document.documentElement.lang };
window.lwSetIdioma('es'); r.tras_es = window.LW_IDIOMA; window.lwSetIdioma('en'); r.tras_en = window.LW_IDIOMA; r.en_t = window.lwT(clave_id); r.en_locale = window.lwLocale();
window.lwT('12.500');
console.log(JSON.stringify(r));'''
    for guardado, esperado in (("'es'", 'id'), ("'en'", 'en'), ("'basura'", 'id'), ('null', 'id')):
        out = node(prueba.replace('__GUARDADO__', guardado, 1))
        try:
            o = json.loads(out)
        except Exception:
            o = None
        mira('idioma guardado %s → arranca en %s (nunca español)' % (guardado, esperado), bool(o) and o['idioma'] == esperado)
        if guardado == "'es'" and o:
            mira('en id: una clave del diccionario sale en indonesio', o['id'][1] == o['id'][2])
            mira('en id: lo que solo está en inglés cae al INGLÉS y se cuenta', o['en'][1] == o['en'][2] and o['caida'])
            mira('en id: una frase SOLO en español sale tal cual y se cuenta como español (la prueba puede ponerse roja)', o['sembrada'] == 'Frase sembrada solo en español zzq' and o['espanol'])
            mira('en id: un número no cuenta como frase sin traducir', not o['numero'])
            mira('en id: locale id-ID y <html lang="id">', o['locale'] == 'id-ID' and o['lang'] == 'id')
            mira('pedir español lleva al indonesio; inglés sigue funcionando', o['tras_es'] == 'id' and o['tras_en'] == 'en')
            mira('en inglés, el lwT de siempre (no el indonesio) y locale en-GB', o['en_t'] != o['id'][2] and o['en_locale'] == 'en-GB')

# -- (4) diccionarios: sin vacíos, sin iguales a la clave, sin prohibidos, con el glosario
G = json.load(open(os.path.join(AQUI, 'glosario_id.json'), encoding='utf-8'))
dics = {'i18n_id.json': json.load(open(os.path.join(AQUI, 'i18n_id.json'), encoding='utf-8'))}
for f in os.listdir(AQUI):
    if f.endswith(('.html', '.js')) and not f.startswith('test_'):
        t = open(os.path.join(AQUI, f), encoding='utf-8').read()
        for m in re.finditer(r'var (ID_[A-Z]+) = \{', t):
            fin = t.index('\n  };', m.end())
            out = node('var X = {' + t[m.end():fin] + '\n};\nconsole.log(JSON.stringify(X));')
            try:
                dics[f + ':' + m.group(1)] = json.loads(out)
            except Exception:
                mira('%s %s se puede leer' % (f, m.group(1)), False)
comun = open(os.path.join(AQUI, '_compartido', 'pantalla_comun.js'), encoding='utf-8').read()
dics['pantalla_comun.js:ID'] = json.loads(node(comun + '\nconsole.log(JSON.stringify(axwComun(null, function (s) { return s; }).ID));'))
malos, prohibidos, glosario = [], [], []
for nombre, dic in dics.items():
    for k, v in dic.items():
        if not isinstance(v, str) or not v.strip() or (v == k and k not in build.IGUALES_EN_ID):
            malos.append('%s: %s' % (nombre, k[:50]))
        for p in G['prohibidos']:
            if p in v.lower():
                prohibidos.append('%s: «%s» en %s' % (nombre, p, v[:50]))
        if k in G['excepciones']:
            continue
        for es, id_ in G['terminos'].items():
            formas = id_ if isinstance(id_, list) else [id_]
            if re.search(r'\b' + es + r'\b', k, re.I) and not any(x in v.lower() for x in formas):
                glosario.append('%s: «%s» → falta «%s»: %s' % (nombre, k[:40], id_, v[:40]))
mira('ningún diccionario indonesio con traducción vacía o igual a su clave (%s)' % '; '.join(malos[:5]), not malos)
mira('ninguna traducción con palabras prohibidas (%s)' % '; '.join(prohibidos[:5]), not prohibidos)
mira('el glosario se cumple en todos los diccionarios (%s)' % '; '.join(glosario[:6]), not glosario)
# una sola traducción por clave entre todos los diccionarios (el primero que se fusiona en LW_ID gana sin avisar)
vistos, choques = {}, []
for nombre, dic in dics.items():
    for k, v in dic.items():
        if k in vistos and vistos[k][1] != v:
            choques.append('%s: %s=«%s» vs %s=«%s»' % (k[:30], vistos[k][0], vistos[k][1][:25], nombre, v[:25]))
        vistos.setdefault(k, (nombre, v))
mira('una sola traducción por clave entre diccionarios (%s)' % '; '.join(choques[:4]), not choques)
# la barra (topbar.js): toda clave de TB_T tiene su indonesio en TB_ID
_tb = node(ORIGINAL['contracts/assets/topbar.js'][:ORIGINAL['contracts/assets/topbar.js'].index('function tb(k)')] + '\nconsole.log(JSON.stringify(Object.keys(TB_T)));')
_tbid = [x for x in build.IDIOMAS_PARCHES if x[0] == 'contracts/assets/topbar.js' and 'TB_ID' in x[2]][0][2]
_faltan = [k for k in json.loads(_tb) if (k + ':') not in _tbid]
mira('toda clave de la barra (TB_T) tiene su indonesio en TB_ID (%s)' % ', '.join(_faltan), not _faltan)
mira('hay diccionarios ID que revisar (i18n_id.json y al menos los de portada, Ajustes y ayudas comunes)', len(dics) >= 3 and len(dics['i18n_id.json']) > 100)

# -- (5) la comprobación del paquete construido
if r == 'pasa':
    viejo_aqui = build.AQUI
    mira('comprueba_idiomas da por bueno el paquete recién parcheado', (lambda: (build.comprueba_idiomas(d, ['id', 'en']), True)[1])())
    roto = tempfile.mkdtemp(); shutil.rmtree(roto); shutil.copytree(d, roto)
    os.makedirs(os.path.join(roto, 'x'), exist_ok=True)
    open(os.path.join(roto, 'x', 'y.js'), 'w', encoding='utf-8').write("var f = d.toLocaleDateString('es-ES');\n")
    try:
        build.comprueba_idiomas(roto, ['id', 'en']); res = 'pasa'
    except SystemExit:
        res = 'para'
    mira("comprueba_idiomas PARA si queda un 'es-ES' sin su id-ID", res == 'para')

print('%d/%d' % (casos - len(fallos), casos))
for f in fallos:
    print('  FALLA: ' + f)
sys.exit(1 if fallos else 0)
