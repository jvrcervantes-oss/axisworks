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


def _reg_con(a, b):
    r = json.loads(json.dumps(REG))
    r['modulos'][a]['depende'] = sorted(set(r['modulos'][a]['depende']) | {b})
    return r


def cambia(a, b):
    assert REAL.count(a) == 1, a
    return REAL.replace(a, b)


casos = [
    ('catálogo real', corre(), 'pasa'),
    # corte A (5-oct-2026): facturas y recibos son su propio pack; si vuelven al núcleo o dejan de requerir la base, el guard lo ve
    ('facturas vuelve a depender de contratos (el puente se rompió): facturas no puede ir fuera del núcleo',
     corre(registro=_reg_con('facturas', 'contratos')), 'para'),
    ('facturas y recibos dentro del pack del núcleo (sin pack propio) también casa',
     corre(cambia("['facturas', 'recibos'], ['base']],", "[], ['base']],").replace("'cuentas', 'comisiones'", "'facturas', 'recibos', 'cuentas', 'comisiones'")
           .replace("['base', 'facturacion']]", "['base']]")), 'pasa'),
    ('soporte fuera del núcleo, como suelto',
     corre(cambia("'obra', 'portal', 'soporte'], ['base', 'facturacion']]", "'obra', 'portal'], ['base', 'facturacion']]")
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

# AXW-136/AXW-213 (2-oct-2026): compradores (núcleo) llama a solicitud_cambio_pide, del asistente de peticiones (pack extras, que necesita
# el núcleo). La exención vive SOLO en el registro (`depende_blanda`, por objeto); build.py ya no tiene copia propia.
def sin_exencion():
    r = json.loads(json.dumps(REG))
    ex = r['modulos']['compradores']['depende_blanda'].pop('asistente')
    if not r['modulos']['compradores']['depende_blanda']:
        del r['modulos']['compradores']['depende_blanda']
    return r, ex
assert 'asistente' in REG['modulos']['compradores'].get('depende_blanda', {}), 'el registro real ya no declara la exención compradores→asistente'
# Sin la exención, compradores LEE el asistente de forma dura (como lo declara el registro cuando no hay exención): el núcleo leería un extra.
reg4, _ex = sin_exencion()
reg4['modulos']['compradores']['depende'] = sorted(reg4['modulos']['compradores']['depende'] + ['asistente'])
reg4['modulos']['compradores']['depende_por']['asistente'] = ['solicitud_cambio_pide']
casos.append(('sin la exención en el registro, el núcleo leería un extra', corre(registro=reg4), 'para'))
# Un objeto del asistente que NO está exento (el registro lo deja duro y la exención por objeto ya no basta): aborta, con o sin la blanda.
reg5, _ex = sin_exencion()
reg5['modulos']['compradores']['depende'] = sorted(reg5['modulos']['compradores']['depende'] + ['asistente'])
reg5['modulos']['compradores']['depende_por']['asistente'] = ['solicitud_cambio_pide', 'solicitudes_cambio']
casos.append(('compradores lee una tabla del asistente no exenta (sin blanda)', corre(registro=reg5), 'para'))
reg6 = json.loads(json.dumps(REG))
reg6['modulos']['compradores']['depende'] = sorted(reg6['modulos']['compradores']['depende'] + ['asistente'])
reg6['modulos']['compradores']['depende_por']['asistente'] = ['solicitudes_cambio']
casos.append(('lectura dura y exención a la vez: manda la dura', corre(registro=reg6), 'para'))
# Exención huérfana: nombra un objeto que el módulo leído no tiene (la RPC se renombró o se quitó).
reg7 = json.loads(json.dumps(REG))
reg7['modulos']['compradores']['depende_blanda']['asistente']['objetos'] = ['solicitud_cambio_que_ya_no_existe']
casos.append(('exención huérfana: el objeto ya no es del asistente', corre(registro=reg7), 'para'))
reg8 = json.loads(json.dumps(REG))
reg8['modulos']['compradores']['depende_blanda']['asistente']['objetos'] = []
casos.append(('exención sin objetos', corre(registro=reg8), 'para'))
reg9 = json.loads(json.dumps(REG))
reg9['modulos']['compradores']['depende_blanda']['asistente']['porque'] = ' '
casos.append(('exención sin porqué', corre(registro=reg9), 'para'))
reg10 = json.loads(json.dumps(REG))
reg10['modulos']['compradores']['depende_blanda']['fantasma'] = {'objetos': ['x'], 'porque': 'y'}
casos.append(('exención de un módulo que el registro no conoce', corre(registro=reg10), 'para'))
# Con la exención declarada y compradores sin lectura dura, el catálogo real casa (el asistente sigue en extras, fuera del núcleo).
casos.append(('con la exención en el registro, pasa', corre(), 'pasa'))
# y las dos mitades del asistente no se confunden: el de respuestas (catálogo `asistente`) es el módulo `asistente-correos`
casos.append(('el catálogo real conoce asistente-correos y asistente', 'pasa' if {'asistente', 'asistente-correos'} <= set(REG['modulos']) else 'para', 'pasa'))

mal = [(n, r, e) for n, r, e in casos if r != e]
for n, r, e in casos:
    print(('ok   ' if r == e else 'MAL  ') + n + ': ' + r)
print('%d/%d' % (len(casos) - len(mal), len(casos)))
sys.exit(1 if mal else 0)
