# Prueba de build.py:tokens_solo_etiquetas() (9-oct-2026): python test_tokens_etiquetas.py
# /contracts/tokens.json de Lawang trae nombres de sus proyectos y sociedades; la instancia solo lee de el etiquetas es/en (textos-contrato.js).
# Mira que (1) sale SOLO el extracto (secciones -> clave + etiqueta es/en), sin defaults, sin listas de opciones y sin el idioma `id`,
# (2) las etiquetas que lee TC.etiquetasDeTokens sobreviven identicas, (3) con el fichero REAL de Lawang (si esta) no queda rastro y
# (4) si el fichero cambia de forma el build PARA. No toca erp/despliegues/ ni dist/.
import json, os, re, sys, tempfile
AQUI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, AQUI)
import build

fallos = []
def igual(a, b, que):
    if a != b:
        fallos.append('%s: %r != %r' % (que, a, b))

def corre(tokens_texto):
    lw, dist = tempfile.mkdtemp(), tempfile.mkdtemp()
    for base in (lw, dist):
        os.makedirs(os.path.join(base, 'contracts'))
    open(os.path.join(lw, 'contracts', 'tokens.json'), 'w', encoding='utf-8').write(tokens_texto)
    open(os.path.join(dist, 'contracts', 'tokens.json'), 'w', encoding='utf-8').write(tokens_texto)   # lo que copio cierra_referencias()
    build.LAWANG, build.DIST = lw, dist
    build.tokens_solo_etiquetas()
    return json.load(open(os.path.join(dist, 'contracts', 'tokens.json'), encoding='utf-8'))

FALSO = {'resortPorProyecto': {'Proyecto Ajeno': 'Sociedad Ajena'}, 'projectDefaults': {'sociedad_firmante': 'Sociedad Ajena'},
         'sections': [{'id': 's1', 'tier': 'siempre', 'title': {'es': 'Uno'}, 'fields': [
             ['proyecto_nombre', {'es': 'Nombre del proyecto', 'en': 'Project name', 'id': 'Nama'}, 'select', ['Proyecto Ajeno']],
             ['plazo', {'es': 'Plazo (dias)', 'en': 'Term'}, 'number']]}]}
r = corre(json.dumps(FALSO))
igual(sorted(r), ['sections'], 'solo la clave sections')
igual(r['sections'], [{'id': 's1', 'fields': [['proyecto_nombre', {'es': 'Nombre del proyecto', 'en': 'Project name'}], ['plazo', {'es': 'Plazo (dias)', 'en': 'Term'}]]}], 'extracto exacto')
if 'Ajena' in json.dumps(r):
    fallos.append('queda un nombre del fichero de origen')

def etiquetas(j, idioma):   # la misma regla que TC.etiquetasDeTokens (textos-contrato-nucleo.js)
    out = {}
    for s in j.get('sections') or []:
        for f in s.get('fields') or []:
            l = f[1] and (f[1].get(idioma) or f[1].get('es'))
            if l:
                corto = re.sub(r'[:.]+$', '', re.sub(r'\s*[(—–].*$', '', str(l))).strip()
                if corto:
                    out[f[0]] = corto
    return out
for idioma in ('es', 'en'):
    igual(etiquetas(r, idioma), etiquetas(FALSO, idioma), 'etiquetas %s intactas' % idioma)

real = os.path.join(os.environ.get('AXW_LAWANG_RAIZ') or os.path.join(build.AGENCIA, 'proyectos', 'Lawang'), 'contracts', 'tokens.json')
if os.path.isfile(real):
    t = open(real, encoding='utf-8').read()
    r = corre(t)
    igual(sorted(r), ['sections'], 'real: solo sections')
    for idioma in ('es', 'en'):
        igual(etiquetas(r, idioma), etiquetas(json.loads(t), idioma), 'real: etiquetas %s intactas' % idioma)
    if build.RASTRO.pattern != '(?!)' and build.RASTRO.search(json.dumps(r, ensure_ascii=False)):
        fallos.append('real: el extracto aun casa con el filtro de rastro: ' + build.RASTRO.search(json.dumps(r, ensure_ascii=False)).group(0))

try:
    corre(json.dumps({'sections': []}))
    fallos.append('un tokens.json sin campos no hizo parar el build')
except SystemExit:
    pass

if fallos:
    print('FALLA test_tokens_etiquetas:\n  ' + '\n  '.join(fallos)); sys.exit(1)
print('OK test_tokens_etiquetas')
