#!/usr/bin/env python3
"""python test_sin_permiso_nombre.py [--sin-parche] — el aviso «No tienes acceso a …» del hub enseña el nombre traducido de la herramienta.

Por qué (verificador de bbm en producción, 15-oct-2026): guard.js rebota al hub con `?sin_permiso=<clave de la herramienta>` y el hub la
pintaba en bruto: «You do not have access to “gastos”». Ahora (IDIOMAS_PARCHES de build.py) se busca la herramienta por su clave (herr) en
la lista del hub y sale su nombre traducido; guard.js manda a veces un nombre («Panel de control»), que se traduce tal cual; una clave que
no está en la lista no se enseña nunca.

Cómo: aplica a intranet/index.html de Lawang (sha fijado) los parches de IDIOMAS_PARCHES que lo tocan, saca el trozo del aviso y lo ejecuta
en Node con la lista de herramientas de verdad (contracts/assets/herramientas.js) y un lwT de inglés simulado. Con --sin-parche sale en rojo.
"""
import ast
import json
import os
import subprocess
import sys

AQUI = os.path.dirname(os.path.abspath(__file__))
SIN_PARCHE = '--sin-parche' in sys.argv
fallos, total = [], 0


def ok(nombre, cond, detalle=''):
    global total
    total += 1
    if not cond:
        fallos.append(nombre + (' — ' + detalle if detalle else ''))


def lawang():
    if os.environ.get('AXW_LAWANG_RAIZ'):
        return os.environ['AXW_LAWANG_RAIZ']
    sys.path.insert(0, AQUI)
    import lawang_fijado
    return lawang_fijado.raiz()


def tupla_de_build(nombre):
    arbol = ast.parse(open(os.path.join(AQUI, 'build.py'), encoding='utf-8').read())
    for n in arbol.body:
        if isinstance(n, ast.Assign) and any(isinstance(t, ast.Name) and t.id == nombre for t in n.targets):
            return ast.literal_eval(n.value)
    sys.exit('build.py no trae ' + nombre)


L = lawang()
hub = open(os.path.join(L, 'intranet', 'index.html'), encoding='utf-8').read()
herr = open(os.path.join(L, 'contracts', 'assets', 'herramientas.js'), encoding='utf-8').read()
if not SIN_PARCHE:
    for p in tupla_de_build('IDIOMAS_PARCHES'):
        if p[0] == 'intranet/index.html':
            ok('el trozo de Lawang está una vez: %r' % p[1][:50], hub.count(p[1]) == 1, str(hub.count(p[1])))
            hub = hub.replace(p[1], p[2])

a = hub.find("  const sin = new URLSearchParams(location.search).get('sin_permiso');")
b = hub.find('\n', hub.find("if(sin) $('#avisos').innerHTML", a))
if a < 0 or b < 0:
    sys.exit('no encuentro el aviso de sin permiso en intranet/index.html (¿cambió Lawang?)')
TROZO = hub[a:b]

ARNES = r"""
const vm = require('vm');
const e = JSON.parse(require('fs').readFileSync(0, 'utf8'));
const EN = { 'Gastos y proveedores': 'Expenses and suppliers', 'Panel de control': 'Control panel', 'esta herramienta': 'this tool',
             'No tienes acceso a «%h».': 'You do not have access to “%h”.' };
const r = {};
for (const sin of ['gastos', 'creatividades_ver', 'Panel de control', 'zzz_inventada', '<img src=x>']) {
  const av = { innerHTML: '' };
  const ctx = { URLSearchParams: URLSearchParams, location: { search: '?sin_permiso=' + encodeURIComponent(sin) }, window: {},
    $: function () { return av; },
    esc: function (s) { return String(s).replace(/[&<>"']/g, function (c) { return '&#' + c.charCodeAt(0) + ';'; }); },
    lwT: function (s, h) { var t = EN[s] || s; if (h) for (var k in h) t = t.split('%' + k).join(h[k]); return t; } };
  vm.createContext(ctx);
  vm.runInContext(e.herr + '\n;var HERRAMIENTAS = LW_HERRAMIENTAS;\n' + e.trozo, ctx);
  r[sin] = av.innerHTML;
}
console.log(JSON.stringify(r));
"""

p = subprocess.run(['node', '-e', ARNES], input=json.dumps({'herr': herr, 'trozo': TROZO}), capture_output=True, text=True, encoding='utf-8')
ok('el arnés corre en Node', p.returncode == 0, (p.stderr or '')[-400:])
if p.returncode == 0:
    r = json.loads(p.stdout.strip().splitlines()[-1])
    ok('«gastos» → su nombre traducido, buscado por la clave', '“Expenses and suppliers”' in r['gastos'], r['gastos'])
    ok('«gastos» → la clave en bruto no sale', '“gastos”' not in r['gastos'], r['gastos'])
    ok('una herramienta con varias claves (Creatividades: herr es una lista) también sale por su nombre', '“Creatividades”' in r['creatividades_ver'], r['creatividades_ver'])
    ok('un nombre de guard.js («Panel de control») se traduce tal cual', '“Control panel”' in r['Panel de control'], r['Panel de control'])
    ok('una clave que no está en la lista no se enseña: «esta herramienta»', '“this tool”' in r['zzz_inventada'] and 'zzz' not in r['zzz_inventada'],
       r['zzz_inventada'])
    ok('lo que llega por la URL sigue escapado', '<img' not in r['<img src=x>'], r['<img src=x>'])

nombre = 'test_sin_permiso_nombre' + (' --sin-parche' if SIN_PARCHE else '')
print(('OK' if not fallos else 'MAL') + ' %s: %d/%d' % (nombre, total - len(fallos), total))
for f in fallos:
    print('  FALLA: ' + f)
sys.exit(1 if fallos else 0)
