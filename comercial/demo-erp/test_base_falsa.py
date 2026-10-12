# Prueba de la base falsa de la demo (demo_datos.js + el doble de QA, juntados por build.guard_demo()): python test_base_falsa.py
# (A2/A3 del encargo 20261011_demo_cliente_flujo_total, 11-oct-2026). Dos partes:
#  1. pruebas/base_falsa.harness.cjs: el guard.js que genera el build, en Node con un navegador mínimo, recorre alta de cliente →
#     contrato → firma → factura → recibí, el diario de la pestaña (otra página lo ve; «Reset demo» y pestaña nueva lo borran),
#     que editar/borrar filtran, el candado (nada que no sea GET/HEAD) y que los datos de partida no nombran a ningún cliente.
#  2. Las reglas: cada texto `es` de REGLAS (demo_datos.js) tiene que seguir en las migraciones de Lawang. Si Lawang cambia o quita
#     una regla, esto se pone en rojo y el doble se revisa: si no, la demo enseñaría algo que el producto ya no hace (Backend, rev. previa).
# No escribe nada: el guard.js va a una carpeta temporal.
import glob, os, re, subprocess, sys, tempfile
AQUI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, AQUI)
import build

fallos = []
if not os.path.isfile(build.DOBLE_QA):
    print('test_base_falsa: no encuentro el doble de QA de Lawang en %s — desde una copia de sesión pon AXW_AGENCIA_RAIZ=<raíz de la agencia>' % build.DOBLE_QA)
    sys.exit(1)
guard = build.guard_demo()
d = tempfile.mkdtemp()
ruta = os.path.join(d, 'guard.js')
open(ruta, 'w', encoding='utf-8', newline='').write(guard)
dinero = os.path.join(build.LAWANG, 'contracts', 'assets', 'dinero.js')
totales = os.path.join(build.LAWANG, 'intranet', 'facturas', 'totales.js')
adaptador = os.path.join(AQUI, 'portal_demo', 'adaptador.js')   # el portal de clientes sobre el mismo doble (E1, 12-oct)
r = subprocess.run(['node', os.path.join(AQUI, 'pruebas', 'base_falsa.harness.cjs'), ruta, dinero, totales, adaptador],
                   capture_output=True, text=True, encoding='utf-8')
print(r.stdout[-6000:])
if r.returncode:
    fallos.append('harness de la base falsa (%d): %s' % (r.returncode, r.stderr[-800:]))

# ── 2. los textos de las reglas siguen en las migraciones de Lawang
datos = open(os.path.join(AQUI, 'demo_datos.js'), encoding='utf-8').read()
es = re.findall(r"\{ es: '((?:[^'\\]|\\.)+)', en: ", datos)
sql = ''
for f in glob.glob(os.path.join(build.LAWANG, 'supabase', 'migrations', '*.sql')):
    sql += open(f, encoding='utf-8', errors='replace').read()
if len(es) < 25:
    fallos.append('solo encuentro %d textos de reglas en demo_datos.js: ¿ha cambiado la forma de REGLAS?' % len(es))
for t in es:
    t = t.replace("\\'", "'")
    if t not in sql and t.replace("'", "''") not in sql:
        fallos.append('la regla «%s» ya no está en las migraciones de Lawang: revisa el doble' % t[:90])

print('test_base_falsa: %d textos de reglas comprobados contra Lawang' % len(es))
if fallos:
    print('FALLA:\n  ' + '\n  '.join(fallos))
    sys.exit(1)
print('test_base_falsa: OK')
