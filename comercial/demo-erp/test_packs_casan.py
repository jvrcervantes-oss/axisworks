# Prueba de build.py:packs_casan() (27-sep-2026): python test_packs_casan.py
# Cada caso parte del catalogo.js real, le cambia una cosa y mira si el guard para (o deja pasar) el build.
import io, json, os, sys, tempfile
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import build

AQUI = os.path.dirname(os.path.abspath(__file__))
REAL = io.open(os.path.join(AQUI, 'catalogo.js'), encoding='utf-8').read()
REG = json.load(open(os.path.join(build.AGENCIA, 'erp', 'modulos.json'), encoding='utf-8'))


def corre(catalogo=REAL, registro=REG):
    d = tempfile.mkdtemp()
    c, m = os.path.join(d, 'catalogo.js'), os.path.join(d, 'modulos.json')
    io.open(c, 'w', encoding='utf-8').write(catalogo)
    json.dump(registro, open(m, 'w', encoding='utf-8'))
    try:
        build.packs_casan(c, m)
        return 'pasa'
    except SystemExit:
        return 'para'


def cambia(a, b):
    assert REAL.count(a) == 1, a
    return REAL.replace(a, b)


casos = [
    ('catálogo real', corre(), 'pasa'),
    ('soporte fuera del núcleo, como suelto',
     corre(cambia("'obra', 'portal', 'soporte'], ['base']]", "'obra', 'portal'], ['base']]")
           .replace("['sociedades', ['base']]", "['sociedades', ['base']], ['soporte', ['base']]")), 'para'),
    ('módulo que el registro no conoce',
     corre(cambia("['sociedades', ['base']]", "['sociedades', ['base']], ['nuevomod', ['base']]")
           .replace("  var CAMINO = [", "  MODULOS.push(['nuevomod', 'New', 'Finance', [], '', [], null]);\n  var CAMINO = [")), 'para'),
    ('setter suelto sin el CRM',
     corre(cambia("['crm', 'setter', 'campanas']", "['crm', 'campanas']")
           .replace("['sociedades', ['base']]", "['sociedades', ['base']], ['setter', ['base']]")), 'para'),
]
reg2 = json.loads(json.dumps(REG))
reg2['modulos']['base']['depende'] = reg2['modulos']['base']['depende'] + ['leads']
casos.append(('la base empieza a leer un módulo no exento', corre(registro=reg2), 'para'))
# AXW-139 (1-oct-2026): lo que lee la base (exento uno a uno) no se arrastra a quien depende de ella. Con la base leyendo deck y
# gastos, que no están en ningún pack del núcleo, el núcleo y los sueltos tienen que seguir casando.
reg3 = json.loads(json.dumps(REG))
reg3['modulos']['base']['depende'] = sorted(set(reg3['modulos']['base']['depende']) | {'deck', 'gastos'})
casos.append(('lo que lee la base no se hereda por depender de ella', corre(registro=reg3), 'pasa'))

mal = [(n, r, e) for n, r, e in casos if r != e]
for n, r, e in casos:
    print(('ok   ' if r == e else 'MAL  ') + n + ': ' + r)
print('%d/%d' % (len(casos) - len(mal), len(casos)))
sys.exit(1 if mal else 0)
