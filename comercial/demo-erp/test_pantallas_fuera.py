# Prueba de las pantallas que salen del paquete de una instancia (9-oct-2026): python test_pantallas_fuera.py
# build.py: poda_ficheros_sin_pantalla() / ficheros_cargados() y la lista `apagados_extra.p` de axisworks-demo (erp/instancias.json).
# Porqué existe: una pantalla sustituida por «Pantalla no incluida» deja sus .js en /assets/ y erp/contrato_front.py lee TODO lo servido;
# si la poda quitara de más (un fichero compartido) se rompen pantallas sin un error, y si quitara de menos el contrato sigue en rojo.
import os, sys, tempfile
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
xp_bbm = set(build.mapa_modulos('bbm')['xp'])
if {'/taller/', '/whatsapp-bot/', '/textos-contrato/', '/reservas-producto/'} & xp_bbm:
    fallos.append('bbm lleva sus pantallas (taller y reservas-producto son suyos): %s' % sorted(xp_bbm))

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
