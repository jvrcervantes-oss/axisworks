# Prueba de build.py:propiedades_en_paquete() (erp-front, 14-oct-2026; contrato encargo_front_pasos_propiedades.md de erp-setup): python test_propiedades_paquete.py
# Los tres escritores de N4 (tipo_vivienda_guarda, obra_fase_guarda, contrato_tipo_etapa_guarda) nacen CERRADOS y se abren en el MISMO aterrizaje que
# setup_propiedades.js. Mira que el script va SOLO donde va la migración que da el grant (su `tipo:` y su `solo-en:`, abanico.va_a), en ninguna si
# esa migración aún no existe, y que una migración que abre solo una parte para el build (los tres pasos son un mismo componente). El comportamiento en
# el navegador lo mide pruebas/setup_propiedades.harness.cjs. No escribe en erp/despliegues/.
import os, shutil, sys, tempfile
AQUI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, AQUI)
import build

fallos, casos = [], 0
def mira(nombre, ok):
    global casos
    casos += 1
    if not ok:
        fallos.append(nombre)

CERRADA = ('-- tipo: propiedades\ncreate function public.tipo_vivienda_guarda(p_clave text, p_datos jsonb) returns text language sql as $$ select p_clave $$;\n'
           'revoke all on function public.tipo_vivienda_guarda(text, jsonb) from public, anon, authenticated, service_role;\n')
ABRE = ('-- tipo: propiedades\n'
        'grant execute on function public.tipo_vivienda_guarda(text, jsonb) to authenticated;\n'
        'grant execute on function public.obra_fase_guarda(text, jsonb) to authenticated;\n'
        'grant execute on function public.contrato_tipo_etapa_guarda(text, text) to authenticated;\n')
viejo_ag, viejo_reg, viejo_ab = build.AGENCIA, build._instancia_registro, build.aborta
d = tempfile.mkdtemp()
class Para(Exception):
    pass
def para(msg):
    raise Para(msg)
try:
    mig = os.path.join(d, 'erp', 'migraciones')
    os.makedirs(mig)
    shutil.copy2(os.path.join(viejo_ag, 'erp', 'abanico.py'), os.path.join(d, 'erp', 'abanico.py'))
    sys.modules.pop('abanico', None)
    build.AGENCIA = d
    build.aborta = para
    build._instancia_registro = lambda n: {'bbm': {'config': {'tipo_erp': 'reservas'}}, 'casas': {'config': {'tipo_erp': 'propiedades'}}, 'demo': {}}.get(n, {})
    open(os.path.join(mig, '20261014051000_n4_setup_propiedades.sql'), 'w', encoding='utf-8').write(CERRADA)
    mira('con los escritores aún cerrados, los pasos no van a ninguna instancia', not build.propiedades_en_paquete('casas') and not build.propiedades_en_paquete('bbm'))
    open(os.path.join(mig, '20261014200000_n4_abre_propiedades.sql'), 'w', encoding='utf-8').write(ABRE)
    mira('con el grant (tipo: propiedades), van a la instancia de Propiedades', build.propiedades_en_paquete('casas') is True)
    mira('y no a una de Reservas (bbm) ni a la que no declara tipo', not build.propiedades_en_paquete('bbm') and not build.propiedades_en_paquete('demo'))
    open(os.path.join(mig, '20261014200000_n4_abre_propiedades.sql'), 'w', encoding='utf-8').write(ABRE.split('grant execute on function public.obra_fase_guarda')[0])
    try:
        build.propiedades_en_paquete('casas')
        mira('una migración que abre solo una parte de los escritores para el build', False)
    except Para as e:
        mira('una migración que abre solo una parte de los escritores para el build', 'abre solo' in str(e))
finally:
    build.AGENCIA, build._instancia_registro, build.aborta = viejo_ag, viejo_reg, viejo_ab
    sys.modules.pop('abanico', None)
    shutil.rmtree(d, ignore_errors=True)

src = open(os.path.join(AQUI, 'build.py'), encoding='utf-8').read()
mira('instancia() llama a setup_propiedades_pasos() solo tras propiedades_en_paquete()', 'if propiedades_en_paquete(nombre):' in src and 'setup_propiedades_pasos()' in src)
mira('setup_propiedades.js está en el chequeo de clases del setup', "'setup_propiedades.js')" in src.split('SETUP_CLASES = ')[1].split('\n')[0])
js = open(os.path.join(AQUI, 'setup_propiedades.js'), encoding='utf-8').read()
mira('el componente nombra LITERAL las tres funciones (contrato_front las busca así)', all("sb.rpc('%s'" % f for f in build.PROPIEDADES_ESCRITORES) and all("sb.rpc('%s'" % f in js for f in build.PROPIEDADES_ESCRITORES))
mira('no lee tipos_contrato con .from (sin SELECT para authenticated): va por plantillas_contrato_datos', ".from('tipos_contrato')" not in js and "datos('plantillas_contrato_datos')" in js)
mira('engancha por data-axw-*, nunca por un rótulo ni con innerHTML', 'innerHTML' not in js and 'textContent ===' not in js)

if fallos:
    print('FALLOS (%d de %d):\n  ' % (len(fallos), casos) + '\n  '.join(fallos))
    sys.exit(1)
print('ok: %d comprobaciones' % casos)
