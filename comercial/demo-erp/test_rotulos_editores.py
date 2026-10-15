#!/usr/bin/env python3
"""python test_rotulos_editores.py — la prueba de rótulos de las ventanas de edición (pruebas/rotulos_editores.cjs) caza lo que falta y no da
falsos verdes (bbm-idioma-total, 15-oct-2026).

Por qué: el verificador del tren 4h de bbm vio «Nuevo gasto» en inglés con la interfaz en indonesio y «Nueva cuenta de cobro» en español; el
barrido de pantallas no abre ventanas de edición. El build para con rotulos_editores.cjs; aquí se prueba la prueba sobre un paquete de
mentira (sin construir nada): un label, una ayuda, un placeholder, un atajo y las dos formas de opciones, con y sin traducción. Contrapruebas:
quitar una clave del indonesio, o el inglés de una opción, sale en rojo; un paquete sin i18n.js es «no he podido mirar» (2), no un verde.
También comprueba que i18n_editores.json se lee, no trae entradas vacías y no repite claves de MENU_I18N con otra traducción.
"""
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile

AQUI = os.path.dirname(os.path.abspath(__file__))
CJS = os.path.join(AQUI, 'pruebas', 'rotulos_editores.cjs')
fallos, total = [], 0


def ok(nombre, cond, detalle=''):
    global total
    total += 1
    if not cond:
        fallos.append(nombre + (' — ' + detalle if detalle else ''))


def paquete(raiz, en, id_, js):
    os.makedirs(os.path.join(raiz, 'contracts', 'assets'))
    os.makedirs(os.path.join(raiz, 'assets'))
    if en is not None:
        open(os.path.join(raiz, 'contracts', 'assets', 'i18n.js'), 'w', encoding='utf-8').write(
            '(function(){var EN=%s;window.LW_EN = EN;window.LW_ID=%s;document.querySelectorAll("x");})();' % (json.dumps(en), json.dumps(id_)))
    open(os.path.join(raiz, 'assets', 'editores.js'), 'w', encoding='utf-8').write(js)


def corre(raiz):
    r = subprocess.run(['node', CJS, raiz], capture_output=True, text=True, encoding='utf-8')
    return r.returncode, r.stdout


JS = ('abre([{k:"a",label:"Etiqueta",ayuda:"Lo ve el agente",req:1},{k:"b",placeholder:"Escribe aquí"},'
      '{k:"c",tipo:"select",label:"¿De quién es?",opciones:[["","Sin marcar"],["si","De la sociedad"]]},'
      '{k:"d",tipo:"select",label:"Moneda",opciones:["IDR","Otra"]},{k:"e",tipo:"multicheck",label:"Herramientas",atajos:[{texto:"Todas",valor:true}]},'
      '{k:"f",label:"bg-surface text-outline",placeholder:"#E7E3D2"},{k:"g",label:T("Vence el"),tipo:"date"}]);')
TODO = ['Etiqueta', 'Lo ve el agente', 'Escribe aquí', '¿De quién es?', 'Sin marcar', 'De la sociedad', 'Moneda', 'Otra', 'Herramientas', 'Todas', 'Vence el']
EN = {k: 'en:' + k for k in TODO}
ID = {k: 'id:' + k for k in TODO}

tmp = tempfile.mkdtemp(prefix='rotulos_')
try:
    casos = {
        'completo': (EN, ID, 0),
        'sin un indonesio (la opción «Sin marcar»)': (EN, {k: v for k, v in ID.items() if k != 'Sin marcar'}, 1),
        'sin el inglés de una opción de lista simple («Otra»)': ({k: v for k, v in EN.items() if k != 'Otra'}, ID, 1),
        'sin el inglés del atajo («Todas»)': ({k: v for k, v in EN.items() if k != 'Todas'}, ID, 1),
        'sin el indonesio de la ayuda': (EN, {k: v for k, v in ID.items() if k != 'Lo ve el agente'}, 1),
        'sin el indonesio de un rótulo ya pasado por T() («Vence el»)': (EN, {k: v for k, v in ID.items() if k != 'Vence el'}, 1),
        'sin i18n.js: no ha podido mirar': (None, None, 2),
    }
    for i, (nombre, (en, id_, quiere)) in enumerate(casos.items()):
        raiz = os.path.join(tmp, str(i))
        paquete(raiz, en, id_, JS)
        rc, out = corre(raiz)
        ok('%s → salida %d' % (nombre, quiere), rc == quiere, 'sale %d: %s' % (rc, out[-300:]))
        if nombre == 'completo':
            ok('no cuenta clases CSS, códigos de moneda ni colores como texto', '11 rótulos de editor' in out, out[-200:])
finally:
    shutil.rmtree(tmp, ignore_errors=True)

# El diccionario de Idiomas
try:
    textos = json.load(open(os.path.join(AQUI, 'i18n_editores.json'), encoding='utf-8'))['textos']
except Exception as e:  # noqa: BLE001
    textos = None
    ok('i18n_editores.json se lee', False, str(e))
if textos is not None:
    vacios = [k for k, v in textos.items() if not str(v.get('en') or '').strip() or not str(v.get('id') or '').strip()]
    ok('i18n_editores.json: ninguna entrada sin en o sin id', not vacios, ' | '.join(vacios[:5]))
    sys.path.insert(0, AQUI)
    import build
    choca = [k for k, v in textos.items() if k in build.MENU_I18N and build.MENU_I18N[k] != {'en': v['en'], 'id': v['id']}]
    ok('i18n_editores.json no dice otra cosa que MENU_I18N para la misma clave', not choca, ' | '.join(choca[:5]))
    # PISA_I18N pisa lo de Lawang en la instancia; lo que dice para una clave lo dicen igual las demás fuentes nuestras (si no, la verdad depende
    # del orden en que se pegan)
    pisa = build.PISA_I18N
    distinto = sorted('%s (%s)' % (k, f) for f, fuente in (('i18n_editores.json', textos), ('MENU_I18N', build.MENU_I18N))
                      for k in pisa if k in fuente and fuente[k] != pisa[k])
    ok('PISA_I18N dice lo mismo que MENU_I18N e i18n_editores.json para la misma clave', not distinto, ' | '.join(distinto))
    # M8 (15-oct): la sección «Seguimiento» del menú. Las pantallas del maestro con diccionario propio e i18n_id.json dicen lo mismo que PISA_I18N:
    # si no, el menú y la cabecera de la pantalla discrepan
    seg = pisa['Seguimiento']
    ID_NUESTRO = json.load(open(os.path.join(AQUI, 'i18n_id.json'), encoding='utf-8'))
    ok('i18n_id.json: «Seguimiento» = %s' % seg['id'], ID_NUESTRO.get('Seguimiento') == seg['id'], repr(ID_NUESTRO.get('Seguimiento')))
    for f in ('flota.html', 'portada_reservas.html', 'reservas_producto.html'):
        t = open(os.path.join(AQUI, f), encoding='utf-8').read()
        vistos = re.findall(r'''["']Seguimiento["']:\s*["']([^"']*)["']''', t)
        ok('%s: «Seguimiento» en su diccionario = %s / %s' % (f, seg['en'], seg['id']), vistos and set(vistos) <= {seg['en'], seg['id']}, repr(vistos))

print(('OK' if not fallos else 'MAL') + ' test_rotulos_editores: %d/%d' % (total - len(fallos), total))
for f in fallos:
    print('  FALLA: ' + f)
sys.exit(1 if fallos else 0)
