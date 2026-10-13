"""python test_lawang_fijado.py — el resolutor del Lawang fijado (E3.9, 13-oct-2026) sobre un Lawang FALSO en una carpeta temporal.

No toca el clon de Lawang ni la caché de verdad: AXW_AGENCIA_RAIZ y LOCALAPPDATA apuntan a carpetas temporales. Comprueba:
  · extrae el sha, deja .completa y cada fichero es su blob; la 2.ª vez reutiliza la caché;
  · un byte cambiado, un fichero colado o uno quitado en la caché → aborta (nunca construye con algo que no es el sha);
  · un sha fijado que no está en origin/main → aborta; un sha corto en lawang.json → aborta;
  · el doble de QA con otra huella → aborta;
  · `sube` en ROJO no toca lawang.json ni deja informe; en VERDE lo reescribe y deja lawang_sube.txt;
  · `sube` a un sha que no desciende del fijado → se niega; con otro `sube` en marcha (candado) → se niega.
"""
import hashlib
import json
import os
import subprocess
import sys
import tempfile

AQUI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, AQUI)
fallos = []


def ok(cond, que):
    print(('ok   ' if cond else 'FALLA ') + que)
    if not cond:
        fallos.append(que)


def aborta(f, *a, **k):
    """True si f(...) sale por `sale()` (SystemExit con código 1)."""
    try:
        f(*a, **k)
    except SystemExit as e:
        return e.code == 1
    return False


tmp = tempfile.mkdtemp(prefix='axw_lawang_fijado_')
os.environ['LOCALAPPDATA'] = os.path.join(tmp, 'local')
os.environ['AXW_AGENCIA_RAIZ'] = os.path.join(tmp, 'agencia')
repo = os.path.join(tmp, 'agencia', 'proyectos', 'Lawang')
os.makedirs(os.path.join(repo, 'intranet', 'v4'))
os.makedirs(os.path.join(repo, 'contracts'))


def g(*a):
    return subprocess.run(['git', '-C', repo, '-c', 'user.name=t', '-c', 'user.email=t@t', '-c', 'core.autocrlf=false'] + list(a),
                          capture_output=True, text=True, check=True).stdout.strip()


g('init', '-q')
open(os.path.join(repo, 'intranet', 'v4', 'nav.js'), 'w', newline='\n').write('var MENU = 1;\n')
open(os.path.join(repo, 'contracts', 'tokens.json'), 'w', newline='\n').write('{"sections": []}\n')
open(os.path.join(repo, 'fuera.txt'), 'w').write('no es del ERP\n')
open(os.path.join(repo, '_qa_double_guard.js'), 'w', newline='\n').write('// doble\n')
g('add', 'intranet', 'contracts', 'fuera.txt')
g('commit', '-q', '-m', 'uno')
uno = g('rev-parse', 'HEAD')
open(os.path.join(repo, 'intranet', 'v4', 'nav.js'), 'w', newline='\n').write('var MENU = 2;\n')
g('commit', '-q', '-am', 'dos')
dos = g('rev-parse', 'HEAD')
g('update-ref', 'refs/remotes/origin/main', dos)          # «publicado»
g('checkout', '-q', '-b', 'suelta', uno)
open(os.path.join(repo, 'intranet', 'v4', 'nav.js'), 'w', newline='\n').write('var MENU = 3;\n')
g('commit', '-q', '-am', 'sin subir')
suelta = g('rev-parse', 'HEAD')

import lawang_fijado as L  # noqa: E402

L.FICHERO = os.path.join(tmp, 'lawang.json')
L.INFORME = os.path.join(tmp, 'lawang_sube.txt')
doble = hashlib.sha256(open(os.path.join(repo, '_qa_double_guard.js'), 'rb').read()).hexdigest()


def fija(sha, h=doble):
    open(L.FICHERO, 'w', encoding='utf-8').write(json.dumps({'sha': sha, 'doble_qa_sha256': h}))


fija(uno)
d = L.raiz()
ok(os.path.isfile(os.path.join(d, '.completa')) and open(os.path.join(d, 'intranet', 'v4', 'nav.js')).read() == 'var MENU = 1;\n',
   'extrae el sha fijado con su contenido y .completa')
ok(not os.path.exists(os.path.join(d, 'fuera.txt')), 'solo extrae RUTAS (lista cerrada)')
ok(L.raiz() == d, 'la 2.ª vez reutiliza la caché')
nav = os.path.join(d, 'intranet', 'v4', 'nav.js')
open(nav, 'w', newline='\n').write('var MENU = 9;\n')
ok(aborta(L.raiz), 'un byte cambiado en la caché → aborta')
open(nav, 'w', newline='\n').write('var MENU = 1;\n')
open(os.path.join(d, 'intranet', 'colado.js'), 'w').write('x')
ok(aborta(L.raiz), 'un fichero colado en la caché → aborta')
os.remove(os.path.join(d, 'intranet', 'colado.js'))
os.remove(nav)
ok(aborta(L.raiz), 'un fichero quitado de la caché → aborta')
open(nav, 'w', newline='\n').write('var MENU = 1;\n')
ok(not aborta(L.raiz), 'restaurada, vuelve a valer')
fija(suelta)
ok(aborta(L.raiz), 'sha fijado que no está en origin/main → aborta')
fija(uno[:9])
ok(aborta(L.lee_fijado), 'sha corto en lawang.json → aborta')
fija(uno, h='00' * 32)
ok(aborta(L.doble_qa), 'doble de QA con otra huella → aborta')
fija(uno)
ok(L.doble_qa().endswith('_qa_double_guard.js'), 'doble de QA con su huella → vale')

L.prueba = lambda sha: [('build --instancia bbm', 'ABORTA: ancla')]
ok(L.sube(dos, 'test', 'rojo', sin_red=True) == 1, '`sube` en rojo devuelve 1')
ok(json.load(open(L.FICHERO))['sha'] == uno and not os.path.exists(L.INFORME), '`sube` en rojo NO toca lawang.json ni deja informe')
cerrojo = os.path.join(L.cache(), '.sube.lock')
vio = []
L.prueba = lambda sha: vio.append(os.path.exists(cerrojo)) or []
ok(L.sube(dos, 'test', 'verde', sin_red=True) == 0, '`sube` en verde devuelve 0')
# El candado: puesto MIENTRAS corre la prueba y quitado al acabar por el propio `sube` (BAJA del revisor de S1: antes lo borraba el test).
ok(vio == [True] and not os.path.exists(cerrojo), 'el candado está puesto durante `sube` y lo suelta él al acabar')
f = json.load(open(L.FICHERO))
ok(f['sha'] == dos and f['doble_qa_sha256'] == doble and f['por'] == 'test', '`sube` en verde fija el sha nuevo y conserva la huella del doble')
ok(os.path.isfile(L.INFORME) and 'Commits que tocan' in open(L.INFORME, encoding='utf-8').read(), '`sube` en verde deja lawang_sube.txt')
ok(aborta(L.sube, uno, 'test', 'atrás', sin_red=True), '`sube` a un sha que no desciende del fijado → se niega')
ok(aborta(L.sube, suelta, 'test', 'sin subir', sin_red=True), '`sube` a un sha fuera de origin/main → se niega')
c = L._candado()
ok(aborta(L.sube, 'main', 'test', 'a la vez', sin_red=True), 'con otro `sube` en marcha (candado) → se niega')
os.remove(c)

# La poda (axw-cola, 14-oct-2026, BAJA del revisor): CONSERVA carpetas en total, con la fijada y la recién usada, también cuando
# la recién usada ES la fijada (antes se guardaban CONSERVA - 1).
import time as _t  # noqa: E402
fij = json.load(open(L.FICHERO))['sha']
carpetas = lambda: [n for n in os.listdir(L.cache()) if len(n) == 40 and os.path.isdir(os.path.join(L.cache(), n))]


def falsas(n):
    os.makedirs(os.path.join(L.cache(), fij), exist_ok=True)   # la fijada, extraída (aquí `sube` no la extrae: su prueba es falsa)
    for k in range(n):
        d = os.path.join(L.cache(), '%040x' % (k + 1))
        os.makedirs(d, exist_ok=True)
        os.utime(d, (_t.time() - 100 * (k + 1),) * 2)


falsas(8)
L.poda(fij)
q = carpetas()
ok(len(q) == L.CONSERVA and fij in q, 'la poda deja %d carpetas con la fijada aunque sea la recién usada (%d)' % (L.CONSERVA, len(q)))
falsas(8)
otra = '%040x' % 8   # la más vieja de las falsas: solo sobrevive por ser la recién usada
L.poda(otra)
q = carpetas()
ok(len(q) == L.CONSERVA and fij in q and otra in q, 'la poda deja %d carpetas con la fijada y la recién usada (%d)' % (L.CONSERVA, len(q)))

import shutil  # noqa: E402
shutil.rmtree(tmp, ignore_errors=True)   # solo la carpeta temporal de esta prueba
print('\n%d fallo(s)' % len(fallos))
sys.exit(1 if fallos else 0)
