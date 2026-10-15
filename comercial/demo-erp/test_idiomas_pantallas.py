#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""python test_idiomas_pantallas.py — el check del build que para si una pantalla de una instancia que no es española sale en español
(bbm-idiomas, 15-oct-2026; owner: «/ajustes/ no puede salir en español, ¿tengo que ir ventana a ventana avisándote?»).

Sin navegador (corre en el gate): build.comprueba_pantallas_idiomas() con el arnés simulado:
  · instancia sin idiomas, o solo español: no lanza el arnés;
  · lanza el arnés con los idiomas que no son 'es' (LENGUAS) y la agencia de este build (AXW_AGENCIA_RAIZ);
  · salida 1 (hay español) PARA el build; salida 2 («no he podido mirar») TAMBIÉN lo para: no es un verde; salida 0 sigue.
  · traduce_instancia_js() pega PISA_I18N y traduce_instancia.js con PATRONES_INSTANCIA, y los patrones compilan.
Con navegador, CONTRAPRUEBA sobre un paquete ya construido (AXW_PAQUETE_IDIOMAS=<carpeta>; no se toca, se copia a una temporal):
  · el paquete tal cual da 0 en /home/;
  · con «← Anteriores» de vuelta en el paginador y un texto español crudo (visible y en un aria-label oculto) en /home/, da 1 y nombra los tres;
  · con una carpeta que no es un paquete, da 2."""
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
import types

AQUI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, AQUI)
import build

fallos, casos = [], 0


def mira(nombre, ok):
    global casos
    casos += 1
    if not ok:
        fallos.append(nombre)


# ── 1. comprueba_pantallas_idiomas con el arnés simulado ──────────────────────────────────────────────────────────────────────────────────
llamadas = []


def corre_con(rc):
    def falso(cmd, **kw):
        llamadas.append((cmd, kw.get('env') or {}))
        return types.SimpleNamespace(returncode=rc, stdout='FALLA  en vacia /x/: 1 en español\nTODO BIEN' if rc == 0 else 'FALLA  en vacia /x/', stderr='')
    return falso


def para(f):
    try:
        f()
    except SystemExit:
        return True
    return False


real = build.subprocess.run
try:
    for idiomas in (None, [], ['es']):
        llamadas.clear()
        build.subprocess.run = corre_con(1)
        mira('sin idiomas o solo español (%r): no lanza el arnés ni para' % (idiomas,),
             not para(lambda: build.comprueba_pantallas_idiomas('dist', idiomas)) and not llamadas)
    llamadas.clear()
    build.subprocess.run = corre_con(0)
    mira('salida 0: el build sigue', not para(lambda: build.comprueba_pantallas_idiomas('dist', ['id', 'en'])))
    mira('lanza idiomas_pantallas.harness.cjs sobre el paquete', len(llamadas) == 1 and llamadas[0][0][-2].endswith('idiomas_pantallas.harness.cjs')
         and llamadas[0][0][-1] == 'dist')
    mira('LENGUAS = los idiomas que no son el español', llamadas and llamadas[0][1].get('LENGUAS') == 'id,en')
    mira('AXW_AGENCIA_RAIZ = la agencia de este build (todos los módulos de erp/modulos.json)',
         llamadas and llamadas[0][1].get('AXW_AGENCIA_RAIZ') == build.AGENCIA)
    build.subprocess.run = corre_con(1)
    mira('salida 1 (hay español): el build PARA', para(lambda: build.comprueba_pantallas_idiomas('dist', ['id', 'en'])))
    build.subprocess.run = corre_con(2)
    mira('salida 2 (no ha podido mirar): el build PARA también', para(lambda: build.comprueba_pantallas_idiomas('dist', ['id', 'en'])))
    llamadas.clear()
    build.subprocess.run = corre_con(1)
    os.environ['AXW_IDIOMAS_SIN_NAVEGADOR'] = '1'
    try:
        mira('AXW_IDIOMAS_SIN_NAVEGADOR=1 (solo el gate): no lanza el arnés', not para(lambda: build.comprueba_pantallas_idiomas('dist', ['id', 'en']))
             and not llamadas)
    finally:
        del os.environ['AXW_IDIOMAS_SIN_NAVEGADOR']
    src = open(os.path.join(AQUI, 'test_builds_instancias.py'), encoding='utf-8').read()
    mira('el único que lo apaga es test_builds_instancias.py', "AXW_IDIOMAS_SIN_NAVEGADOR='1'" in src
         and "AXW_IDIOMAS_SIN_NAVEGADOR" not in open(os.path.join(AQUI, 'build.py'), encoding='utf-8').read().replace(
             "os.environ.get('AXW_IDIOMAS_SIN_NAVEGADOR') == '1'", '').replace('(AXW_IDIOMAS_SIN_NAVEGADOR=1, solo el gate)', ''))
finally:
    build.subprocess.run = real

# ── 2. traduce_instancia_js sobre un i18n.js mínimo ───────────────────────────────────────────────────────────────────────────────────────
tmp = tempfile.mkdtemp(prefix='axw_idiomas_')
try:
    os.makedirs(os.path.join(tmp, 'contracts', 'assets'))
    i18n = os.path.join(tmp, 'contracts', 'assets', 'i18n.js')
    open(i18n, 'w', encoding='utf-8').write('var EN={"Ajustes":"Settings"};\nwindow.LW_EN = EN;\n')
    dist_antes = build.DIST
    build.DIST = tmp
    try:
        build.traduce_instancia_js()
    finally:
        build.DIST = dist_antes
    t = open(i18n, encoding='utf-8').read()
    mira('pega traduce_instancia.js con los PATRONES en su hueco', '__AXW_PATRONES__' not in t and 'axwTraduceTexto' in t
         and json.dumps(build.PATRONES_INSTANCIA, ensure_ascii=False) in t)
    mira('pega PISA_I18N (pisa claves existentes)', 'Expenses and suppliers' in t)
    r = subprocess.run(['node', '--check', i18n], capture_output=True, text=True)
    mira('el i18n.js resultante es JavaScript válido', r.returncode == 0)
    for p, moldes in build.PATRONES_INSTANCIA:
        mira('patrón %r compila y tiene en+id' % p[:40], bool(re.compile(p)) and {'en', 'id'} <= set(moldes))
    mira('el patrón de «No se ha podido cargar» casa con lo que pinta datos.js',
         re.match(build.PATRONES_INSTANCIA[0][0], 'No se ha podido cargar «facturas» (57014) — revisa sesión/permisos.') is not None)
    for k, v in build.MENU_I18N.items():
        if not (v.get('en') and v.get('id')):
            mira('MENU_I18N %r tiene en e id' % k, False)
finally:
    shutil.rmtree(tmp, ignore_errors=True)

# ── 3. CONTRAPRUEBA en el navegador (solo con AXW_PAQUETE_IDIOMAS: necesita un paquete construido y Chromium) ────────────────────────────
paquete = os.environ.get('AXW_PAQUETE_IDIOMAS')
if paquete:
    arnes = os.path.join(AQUI, 'pruebas', 'idiomas_pantallas.harness.cjs')
    env = dict(os.environ, PANTALLAS='home', MODOS='vacia', AXW_AGENCIA_RAIZ=build.AGENCIA)
    corre = lambda raiz: subprocess.run(['node', arnes, raiz], capture_output=True, text=True, encoding='utf-8', env=env)
    tmp = tempfile.mkdtemp(prefix='axw_contra_')
    try:
        copia = os.path.join(tmp, 'pkg')
        shutil.copytree(paquete, copia)
        r0 = corre(copia)
        mira('el paquete tal cual: 0 en /home/ (%s)' % r0.stdout.strip().splitlines()[-1:], r0.returncode == 0)
        pag = os.path.join(copia, 'contracts', 'assets', 'paginacion.js')
        t = open(pag, encoding='utf-8').read()
        viejo = '(typeof lwT==="function"?lwT("← Anteriores"):"← Anteriores")'
        mira('el paginador del paquete pide «← Anteriores» a lwT (una vez)', t.count(viejo) == 1)
        open(pag, 'w', encoding='utf-8').write(t.replace(viejo, '"← Anteriores"'))
        home = os.path.join(copia, 'home', 'index.html')
        h = open(home, encoding='utf-8').read()
        h = h.replace('</body>', '<p id="contra-es">Guardar los cambios del cliente ahora mismo</p><button hidden aria-label="Borrar la reserva del cliente sin aviso">x</button></body>', 1)
        open(home, 'w', encoding='utf-8').write(h)
        r1 = corre(copia)
        sal = r1.stdout
        mira('con español metido: sale 1', r1.returncode == 1)
        mira('caza el texto visible crudo', 'Guardar los cambios del cliente ahora mismo' in sal)
        mira('caza el aria-label oculto', 'Borrar la reserva del cliente sin aviso' in sal)
        mira('caza «← Anteriores» en el paginador', re.search(r'FALLA\s+\w+ paginador', sal) is not None)
        r2 = corre(os.path.join(tmp, 'no-es-un-paquete'))
        mira('sin paquete: sale 2 («no he podido mirar»)', r2.returncode == 2)
    finally:
        shutil.rmtree(tmp, ignore_errors=True)
else:
    print('(contraprueba con navegador: AXW_PAQUETE_IDIOMAS=<paquete construido> para correrla)')

print('%d/%d comprobaciones' % (casos - len(fallos), casos))
for f in fallos:
    print('FALLA: ' + f)
sys.exit(1 if fallos else 0)
