# Prueba de las pantallas que salen del paquete de una instancia (9-oct-2026): python test_pantallas_fuera.py
# build.py: poda_ficheros_sin_pantalla() / ficheros_cargados() y la lista `apagados_extra.p` de axisworks-demo (erp/instancias.json).
# Porqué existe: una pantalla sustituida por «Pantalla no incluida» deja sus .js en /assets/ y erp/contrato_front.py lee TODO lo servido;
# si la poda quitara de más (un fichero compartido) se rompen pantallas sin un error, y si quitara de menos el contrato sigue en rojo.
import json, os, sys, tempfile
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import build

fallos = []


def escribe(raiz, ruta, texto):
    p = os.path.join(raiz, *ruta.split('/'))
    os.makedirs(os.path.dirname(p), exist_ok=True)
    open(p, 'w', encoding='utf-8').write(texto)


def hay(raiz, ruta):
    return os.path.isfile(os.path.join(raiz, *ruta.split('/')))


with tempfile.TemporaryDirectory() as d:
    # la pantalla que sale (taller) y dos que se quedan (home, facturas)
    escribe(d, 'taller/index.html', '<script src="../assets/solo_taller.js?v=1"></script><link href="/assets/solo_taller.css" rel="stylesheet">'
                                    '<script src="/assets/compartido.js"></script><script src="https://cdn.x/otro.js"></script>')
    escribe(d, 'home/index.html', '<script src="/assets/compartido.js"></script>')
    escribe(d, 'facturas/index.html', '<script src="/assets/textos-contrato-config.js"></script>')   # nombra uno de los candidatos «parecidos»
    escribe(d, 'assets/solo_taller.js', "window.cargaOtro('extra_de_taller.js');")                  # un script que SOLO él cargaba
    escribe(d, 'assets/extra_de_taller.js', 'var a = 1;')
    escribe(d, 'assets/solo_taller.css', 'a{color:red}')
    escribe(d, 'assets/compartido.js', "var b = 2;")
    escribe(d, 'assets/textos-contrato.js', 'var c = 3;')              # nadie lo nombra... salvo que se confunda con textos-contrato-config.js
    escribe(d, 'assets/textos-contrato-config.js', 'var d = 4;')
    cargados = build.ficheros_cargados(os.path.join(d, 'taller', 'index.html'), d)
    if cargados != {'assets/solo_taller.js', 'assets/solo_taller.css', 'assets/compartido.js'}:
        fallos.append('ficheros_cargados (relativa y absoluta, sin ?v=, sin CDN): %s' % sorted(cargados))
    escribe(d, 'taller/index.html', '<p>Pantalla no incluida</p>')   # como en el build: la página ya está sustituida cuando se poda
    quitados = build.poda_ficheros_sin_pantalla(d, cargados | {'assets/textos-contrato.js'})
    if quitados != ['assets/extra_de_taller.js', 'assets/solo_taller.css', 'assets/solo_taller.js', 'assets/textos-contrato.js']:
        fallos.append('poda: sale lo que nadie más nombra, también en cadena; nada compartido: %s' % quitados)
    if not hay(d, 'assets/compartido.js') or not hay(d, 'assets/textos-contrato-config.js'):
        fallos.append('poda: un fichero compartido o con nombre parecido (textos-contrato-config.js) se borró')
    if hay(d, 'assets/solo_taller.js') or hay(d, 'assets/extra_de_taller.js'):
        fallos.append('poda: lo que solo cargaba la pantalla (y lo que cargaba él) debe salir')

# la instancia real: las cuatro fuera (reservas-producto apagado a propósito, 10-oct-2026), ventas y el resto dentro, bbm intacta
xp = set(build.mapa_modulos('axisworks-demo')['xp'])
for fuera in ('/taller/', '/whatsapp-bot/', '/textos-contrato/', '/reservas-producto/'):
    if fuera not in xp:
        fallos.append('axisworks-demo: %s debería salir del paquete (apagados_extra.p): %s' % (fuera, sorted(xp)))
for dentro in ('/ventas/', '/crea-contrasena/', '/facturas/', '/home/'):
    if dentro in xp:
        fallos.append('axisworks-demo: %s NO debe salir del paquete: %s' % (dentro, sorted(xp)))
# bbm, paquete del «mínimo útil» (erp/instancias.json → bbm.apagados_extra.p; agencia 8492d7f5, 10-oct-2026): taller y reservas-producto son
# SUYOS y se quedan; whatsapp-bot, textos-contrato y asistente salen del paquete, como en axisworks-demo. Hasta ese commit esta prueba exigía
# las cuatro dentro y se quedó en rojo sin que nadie lo viera (ningún gate la corre).
xp_bbm = set(build.mapa_modulos('bbm')['xp'])
if {'/taller/', '/reservas-producto/'} & xp_bbm:
    fallos.append('bbm lleva sus pantallas (taller y reservas-producto son suyos): %s' % sorted(xp_bbm))
for fuera in ('/whatsapp-bot/', '/textos-contrato/', '/asistente/'):
    if fuera not in xp_bbm:
        fallos.append('bbm: %s debería salir del paquete (mínimo útil, apagados_extra.p): %s' % (fuera, sorted(xp_bbm)))
for dentro in ('/ventas/', '/facturas/', '/home/', '/ajustes/'):
    if dentro in xp_bbm:
        fallos.append('bbm: %s NO debe salir del paquete: %s' % (dentro, sorted(xp_bbm)))

# TODA instancia del maestro saca /textos-contrato/ (12-oct-2026, G2 de Ajustes): en Lawang esa pantalla es su «Plantillas», y el menú
# compartido (nav.js) no la ofrece con AXW_NUCLEO_OPERACION (`sinNucleo`). Una instancia nueva que la llevara en el paquete tendría la
# pantalla sin entrada en el menú y llamando a RPC que su base no tiene. Lawang no se construye con este build: queda fuera.
_reg = json.load(open(os.path.join(build.AGENCIA, 'erp', 'instancias.json'), encoding='utf-8'))['instancias']
for _n in sorted(_reg):
    if _n == 'lawang':
        continue
    if '/textos-contrato/' not in set(build.mapa_modulos(_n)['xp']):
        fallos.append('%s: /textos-contrato/ debería salir del paquete (apagados_extra.p de erp/instancias.json): es la Plantillas de Lawang' % _n)

# N6.3 (erp-front, 14-oct-2026; agencia-81: «por TIPO, no por encendido»): lo que una instancia no puede encender nunca por su tipo de ERP no viaja
# como pantalla real. bbm es de tipo Reservas: fuera lo de Propiedades y lo «fuera» (solo Lawang); dentro el núcleo, Ajustes, lo de todos los tipos y
# Reservas de producto, aunque esté apagado (se enciende desde el panel sin republicar).
sys.path.insert(0, os.path.join(build.AGENCIA, 'erp'))
from modulos import TIPO_MODULO
_bbm = build.pantallas_por_tipo('bbm')
_fuera_esperadas = {'/proyectos/', '/modelos/', '/contratos/', '/emitir/', '/obra/', '/comisiones/', '/reparto/', '/soporte/', '/comision-admin/'}
if not _fuera_esperadas <= set(_bbm):
    fallos.append('bbm (Reservas): faltan fuera %s' % sorted(_fuera_esperadas - set(_bbm)))
_mods_fuera = set(_bbm.values())
_malos = sorted(m for m in _mods_fuera if TIPO_MODULO[m].get('clase') != 'fuera' and ('todos' in TIPO_MODULO[m]['tipos'] or 'reservas' in TIPO_MODULO[m]['tipos']))
if _malos:
    fallos.append('bbm: saca pantallas de módulos que SÍ valen para Reservas: %s' % _malos)
for _m in ('base', 'facturas', 'recibos', 'gastos', 'productos', 'reservas-producto', 'compradores', 'finanzas', 'sociedades', 'cuentas', 'whatsapp-bot', 'agente'):
    if _m in _mods_fuera:
        fallos.append('bbm: %s es núcleo, ajuste, de todos los tipos o de Reservas y no puede salir del paquete' % _m)
if not set(_bbm) <= set(build.mapa_modulos('bbm')['xp']):
    fallos.append('bbm: las pantallas de otro tipo tienen que ir en xp (el menú las oculta siempre)')
_viejo = build._instancia_registro
try:
    build._instancia_registro = lambda n: {'config': {}}
    if build.pantallas_por_tipo('x') != {}:
        fallos.append('sin tipo_erp en el registro la instancia sale como hasta hoy (nada fuera por tipo)')
    build._instancia_registro = lambda n: {'config': {'tipo_erp': 'propiedades'}}
    _prop = build.pantallas_por_tipo('x')
    if '/proyectos/' in _prop or '/contratos/' in _prop:
        fallos.append('tipo propiedades: sus propias pantallas no pueden salir')
    if '/comision-admin/' not in _prop:
        fallos.append('tipo propiedades: lo «fuera» (solo Lawang) sale igual')
    build._instancia_registro = lambda n: {'config': {'tipo_erp': 'inventado'}}
    try:
        build.pantallas_por_tipo('x')
        fallos.append('un tipo_erp desconocido tiene que PARAR el build (una errata no puede vaciar el paquete)')
    except SystemExit:
        pass
finally:
    build._instancia_registro = _viejo

# el texto de la pantalla de taller no miente: no dice que «Reservas de producto» no esté activo
marca = 'AxisWorks'
try:
    plantilla = '{{titulo}}|{{texto}}|{{que_hace}}|{{asunto}}|{{oculta_que_hace}}|{{oculta_contacto}}|{{oculta_reintenta}}'
    pag = build.pagina_no_instalado(plantilla, marca, None, '/taller/', herramienta='Taller')
    if 'Reservas de producto' in pag or 'Pantalla no incluida' not in pag or '«Taller» no se incluye' not in pag:
        fallos.append('la pantalla de taller debe decir «Taller» no se incluye, sin nombrar Reservas de producto')
except Exception as e:  # noqa: BLE001
    fallos.append('pagina_no_instalado falló: %s' % e)

if fallos:
    print('FALLO test_pantallas_fuera.py:\n  ' + '\n  '.join(fallos))
    sys.exit(1)
print('OK test_pantallas_fuera.py · poda de ficheros sin pantalla, lista p de axisworks-demo y texto de la pantalla no incluida')
