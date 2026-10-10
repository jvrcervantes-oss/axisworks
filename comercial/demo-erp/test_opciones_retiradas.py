# Prueba de build.py:rechaza_retiradas() (11-oct-2026): python test_opciones_retiradas.py
# Una opción retirada se RECHAZA, no se ignora: ignorada, `--instancia X --solo-ajustes-correo` haría el build completo y
# reescribiría erp/despliegues/<instancia>. Mira que (1) cada opción de OPCIONES_RETIRADAS aborta con rc=1 y su motivo,
# (2) aborta en main() ANTES de vaciar dist/ (no toca nada) y (3) una orden sin opciones retiradas no aborta por esto.
# No toca erp/despliegues/ ni dist/.
import os, sys, io, contextlib
AQUI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, AQUI)
import build

fallos = []

for op in build.OPCIONES_RETIRADAS:
    salida = io.StringIO()
    try:
        with contextlib.redirect_stdout(salida):
            build.rechaza_retiradas(['build.py', '--instancia', 'x', op])
        fallos.append('%s no aborta' % op)
    except SystemExit as e:
        if e.code != 1:
            fallos.append('%s sale con %r, no 1' % (op, e.code))
        if op not in salida.getvalue() or 'ABORTA' not in salida.getvalue():
            fallos.append('%s aborta sin decir por qué: %r' % (op, salida.getvalue()))

try:
    build.rechaza_retiradas(['build.py', '--instancia', 'x'])
except SystemExit:
    fallos.append('una orden sin opciones retiradas aborta')

# (2) el rechazo va lo primero en main(): si llegara a vaciar dist/, esta prueba lo vería
llamadas = []
real = build.packs_casan
build.packs_casan = lambda: llamadas.append('packs_casan')
viejo_argv = sys.argv
sys.argv = ['build.py', '--instancia', 'x', '--solo-ajustes-correo']
try:
    with contextlib.redirect_stdout(io.StringIO()):
        build.main()
    fallos.append('main() no aborta con una opción retirada')
except SystemExit:
    if llamadas:
        fallos.append('main() hizo trabajo antes de rechazar la opción retirada')
finally:
    sys.argv = viejo_argv
    build.packs_casan = real

if fallos:
    print('FALLA test_opciones_retiradas:\n  ' + '\n  '.join(fallos))
    sys.exit(1)
print('test_opciones_retiradas: OK (%d opción(es) retirada(s) rechazada(s))' % len(build.OPCIONES_RETIRADAS))
