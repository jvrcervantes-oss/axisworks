#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""python test_motion_cifra.py — los contadores del ERP no dicen «0» (cifra_cuenta() de build.py, Calidad, 15-oct-2026).

Por qué: cuenta() de motion.js escribía «0» en el texto de cada contador y lo subía con requestAnimationFrame; con la pestaña oculta se
quedaba en 0 para siempre (Usuarios de bbm, 14-oct: «0 activos» con 2 en la lista). Arreglado en Lawang 671a23edf; el fijado de lawang.json
es anterior y build.py trae el bloque nuevo (motion_cuenta_lawang.js) y recalcula MOTION_V de nav.js.

Sobre el motion.js y el nav.js REALES del fijado (o AXW_LAWANG_RAIZ):
  · el bloque viejo es el medido (si no, el build para: toca quitar el parche);
  · motion_cifra_prueba.cjs (copia de motion.test.js de Lawang) sale ROJO con el motion.js tal cual (la prueba puede fallar: pestaña
    oculta → 0) y VERDE con el parcheado;
  · el parcheado es el de Lawang 671a23edf letra por letra (MOTION_V 92fedc21, el que lleva nav.js de Lawang) y cifra_cuenta() deja ese
    MOTION_V en nav.js;
  · el portal de clientes de la demo (su propio cuenta(), con el importe; Lawang 671a23edf): su prueba sale ROJA sin parche y VERDE con
    él, y cifra_cuenta_portal() sube motion.js?v en el index.html del portal;
  · si el bloque viejo cambia, cifra_cuenta_motion() aborta (nunca un reemplazo a ciegas)."""
import contextlib
import io
import os
import shutil
import subprocess
import sys
import tempfile

AQUI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, AQUI)
import build  # noqa: E402

MOTION_V_LAWANG = '92fedc21'   # nav.js de Lawang 671a23edf (motion.js con el arreglo)
ARNES = os.path.join(AQUI, 'motion_cifra_prueba.cjs')
ARNES_PORTAL = os.path.join(AQUI, 'motion_cifra_portal_prueba.cjs')   # copia de portal/motion.test.js de Lawang 671a23edf
fallos, total = [], 0


def ok(nombre, cond, detalle=''):
    global total
    total += 1
    print(('ok     ' if cond else 'FALLA  ') + nombre + ('' if cond or not detalle else ' → ' + detalle))
    if not cond:
        fallos.append(nombre)


def arnes(ruta):
    r = subprocess.run(['node', ARNES, ruta], capture_output=True, text=True, encoding='utf-8')
    return r.returncode, (r.stdout + r.stderr).strip()


assets = os.path.join(build.LAWANG, 'intranet', 'v4', 'assets')
motion = open(os.path.join(assets, 'motion.js'), encoding='utf-8', newline='').read()
nav = open(os.path.join(assets, 'nav.js'), encoding='utf-8', newline='').read()

tmp = tempfile.mkdtemp(prefix='motion_cifra_')
try:
    viejo = os.path.join(tmp, 'viejo.js')
    open(viejo, 'w', encoding='utf-8', newline='').write(motion)
    rc, out = arnes(viejo)
    ok('sin parche: el arnés sale ROJO (pestaña oculta → «0»)', rc != 0 and 'FALLA  A oculta' in out, out[-300:])

    nuevo = build.cifra_cuenta_motion(motion)
    p = os.path.join(tmp, 'nuevo.js')
    open(p, 'w', encoding='utf-8', newline='').write(nuevo)
    rc, out = arnes(p)
    ok('con parche: el arnés sale VERDE (el dato siempre en el texto)', rc == 0, out[-300:])
    ok('el parcheado es el motion.js de Lawang 671a23edf (MOTION_V %s)' % MOTION_V_LAWANG, build._motion_v(nuevo) == MOTION_V_LAWANG,
       build._motion_v(nuevo))
    ok('solo cambia cuenta(): lo de fuera del bloque, igual', nuevo.startswith(motion[:motion.find('  var NUM = ')])
       and nuevo.endswith(motion[motion.find('  function entra() {'):]))

    # cifra_cuenta() sobre un dist/ de mentira: motion.js parcheado y MOTION_V nuevo en nav.js
    dist_real = build.DIST
    build.DIST = os.path.join(tmp, 'dist')
    try:
        d = os.path.join(build.DIST, 'intranet', 'v4', 'assets')
        os.makedirs(d)
        shutil.copy(os.path.join(assets, 'motion.js'), d)
        shutil.copy(os.path.join(assets, 'nav.js'), d)
        build.cifra_cuenta()
        nav2 = open(os.path.join(d, 'nav.js'), encoding='utf-8', newline='').read()
        ok('cifra_cuenta(): nav.js carga motion.js con MOTION_V %s' % MOTION_V_LAWANG,
           "var MOTION_V = '%s';" % MOTION_V_LAWANG in nav2 and nav2.count('var MOTION_V = ') == 1)
        ok('cifra_cuenta(): nav.js no cambia en nada más', nav2.replace("'%s'" % MOTION_V_LAWANG, 'X') ==
           nav.replace("'%s'" % build._motion_v(motion), 'X'))
        ok('cifra_cuenta(): motion.js de dist/ es el parcheado',
           open(os.path.join(d, 'motion.js'), encoding='utf-8', newline='').read() == nuevo)
    finally:
        build.DIST = dist_real

    # el portal de clientes de la demo: su propio cuenta() con el importe (Lawang 671a23edf)
    pm = open(os.path.join(build.LAWANG, 'portal', 'motion.js'), encoding='utf-8', newline='').read()
    pi = open(os.path.join(build.LAWANG, 'portal', 'index.html'), encoding='utf-8', newline='').read()
    pd = os.path.join(tmp, 'portal')
    os.makedirs(pd)
    shutil.copy(ARNES_PORTAL, os.path.join(pd, 'motion.test.js'))   # pide ./motion.js a su lado
    for nombre, texto, debe in (('sin parche', pm, False), ('con parche', build.cifra_cuenta_motion(pm, build.MOTION_CUENTA_PORTAL), True)):
        open(os.path.join(pd, 'motion.js'), 'w', encoding='utf-8', newline='').write(texto)
        r = subprocess.run(['node', os.path.join(pd, 'motion.test.js')], capture_output=True, text=True, encoding='utf-8')
        sale = (r.stdout + r.stderr).strip()
        ok('portal %s: su prueba sale %s' % (nombre, 'VERDE' if debe else 'ROJA (el importe decía «0 €»)'),
           (r.returncode == 0) == debe and (debe or 'pestaña oculta' in sale), sale[-300:])
    _, ini, fin, _, _ = build.MOTION_CUENTA_PORTAL
    pn = build.cifra_cuenta_motion(pm, build.MOTION_CUENTA_PORTAL)
    ok('portal: solo cambia cuenta()', pn[:pn.find(ini)] == pm[:pm.find(ini)] and pn[pn.find(fin):] == pm[pm.find(fin):])
    dist_real = build.DIST
    build.DIST = os.path.join(tmp, 'dist2')
    try:
        os.makedirs(os.path.join(build.DIST, 'portal'))
        shutil.copy(os.path.join(build.LAWANG, 'portal', 'motion.js'), os.path.join(build.DIST, 'portal'))
        shutil.copy(os.path.join(build.LAWANG, 'portal', 'index.html'), os.path.join(build.DIST, 'portal'))
        build.cifra_cuenta_portal()
        pi2 = open(os.path.join(build.DIST, 'portal', 'index.html'), encoding='utf-8', newline='').read()
        ok('cifra_cuenta_portal(): motion.js?v nuevo y nada más cambia en index.html',
           pi2 == pi.replace(*build.PORTAL_MOTION_V) and pi2 != pi)
        ok('cifra_cuenta_portal(): motion.js del portal es el parcheado',
           open(os.path.join(build.DIST, 'portal', 'motion.js'), encoding='utf-8', newline='').read() == pn)
    finally:
        build.DIST = dist_real

    # nunca a ciegas: un bloque viejo distinto para el build
    for que, cambiado, aviso in (('cuenta() cambia por dentro', motion.replace('  function entra() {', '  var otra = 1;\n  function entra() {', 1),
                                  'ya no es la medida'),
                                 ('cuenta() desaparece', motion.replace('  var NUM = ', '  var NUMERO = ', 1), 'no encuentro cuenta()')):
        salida = io.StringIO()
        try:
            with contextlib.redirect_stdout(salida):
                build.cifra_cuenta_motion(cambiado)
            paro = False
        except SystemExit:
            paro = True
        ok('si %s en el fijado, el build para y dice por qué' % que, paro and aviso in salida.getvalue(), salida.getvalue()[:200])
finally:
    shutil.rmtree(tmp, ignore_errors=True)

print('%d de %d' % (total - len(fallos), total) + ('' if not fallos else ' — FALLAN: ' + '; '.join(fallos)))
sys.exit(1 if fallos else 0)
