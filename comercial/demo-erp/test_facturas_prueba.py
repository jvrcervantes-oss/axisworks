# Prueba de build.py:capa_facturas_prueba() (erp-front, 14-oct-2026; contrato bbm_bot_al_erp_13oct.md §3b): python test_facturas_prueba.py
# La capa facturas_prueba.js llama a facturas_prueba_datos(): pegarla en una instancia cuya base no tiene la función dejaría el contrato front↔base en
# rojo. Mira que va SOLO donde va la migración que la crea (su `tipo:` y su `solo-en:`, abanico.va_a) y en ninguna si esa migración aún no está, y que
# la capa sale sin comentarios (notas internas que se pegan después de la limpieza pública). El comportamiento en el navegador lo mide
# pruebas/facturas_prueba.harness.cjs. No escribe en erp/despliegues/.
import os, re, shutil, sys, tempfile
AQUI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, AQUI)
import build

fallos, casos = [], 0
def mira(nombre, ok):
    global casos
    casos += 1
    if not ok:
        fallos.append(nombre)

MIG = ('-- e110a: las pruebas fuera de los totales\n-- solo-en: bbm\n'
       'create or replace function public.facturas_prueba_datos() returns jsonb language sql stable as $$ select \'{}\'::jsonb $$;\n')
viejo_ag, viejo_reg = build.AGENCIA, build._instancia_registro
d = tempfile.mkdtemp()
try:
    os.makedirs(os.path.join(d, 'erp', 'migraciones'))
    shutil.copy2(os.path.join(viejo_ag, 'erp', 'abanico.py'), os.path.join(d, 'erp', 'abanico.py'))
    sys.modules.pop('abanico', None)
    build.AGENCIA = d
    build._instancia_registro = lambda n: {'bbm': {'config': {'tipo_erp': 'reservas'}}, 'otra': {'config': {'tipo_erp': 'reservas'}}, 'demo': {}}.get(n, {})
    mira('sin la migración en la agencia, la capa no va a ninguna instancia', build.capa_facturas_prueba('bbm') == '')
    open(os.path.join(d, 'erp', 'migraciones', '20261014081000_e110a_pruebas_fuera_de_totales.sql'), 'w', encoding='utf-8').write(MIG)
    js = build.capa_facturas_prueba('bbm')
    mira('con la migración (solo-en: bbm), la capa va a bbm', "lwDatos('facturas_prueba_datos')" in js)
    mira('y no a otra instancia del mismo tipo ni a la demo', build.capa_facturas_prueba('otra') == '' and build.capa_facturas_prueba('demo') == '')
    mira('la capa pegada va sin comentarios (ni «Lawang» ni notas internas)', '/*' not in js and 'Lawang' not in js and 'PROVISIONAL' not in js)
    mira('ni comentarios al final de una línea (los // que la limpieza no quita)', not re.search(r'\S[ \t]+//', js))
    open(os.path.join(d, 'erp', 'migraciones', '20261014200000_e110a_recrea.sql'), 'w', encoding='utf-8').write(MIG.replace('-- solo-en: bbm', '-- solo-en: otra'))
    mira('si una migración posterior la recrea con otro solo-en, manda la última', build.capa_facturas_prueba('otra') != '' and build.capa_facturas_prueba('bbm') == '')
finally:
    build.AGENCIA, build._instancia_registro = viejo_ag, viejo_reg
    sys.modules.pop('abanico', None)
src = open(os.path.join(AQUI, 'build.py'), encoding='utf-8').read()
mira('la capa se pega al final de guard.js, después de setup_para_guard()', '+ interruptores + t + setup_para_guard() + capa_facturas_prueba(nombre))' in src)
capa = open(os.path.join(AQUI, 'facturas_prueba.js'), encoding='utf-8').read()
mira('la capa engancha por identificadores (data-lw-id, nombre de función, ruta del script), nunca por un rótulo', 'data-lw-id' in capa
     and 'window.documentoHTML' in capa and 'textContent ===' not in capa.replace("f.textContent !== texto", "").replace("chip.textContent === txt", ""))

if fallos:
    print('FALLOS (%d de %d):\n  ' % (len(fallos), casos) + '\n  '.join(fallos))
    sys.exit(1)
print('ok: %d comprobaciones' % casos)
