# -*- coding: utf-8 -*-
"""Cada instancia del registro se construye de verdad, en seco (13-oct-2026, erp-panel-4; orquestador: «toca mecanismo»).

Por qué: el gate de push de AxisWorks corría los tests de demo-erp, que prueban piezas de build.py sobre carpetas temporales,
pero nadie lanzaba el build COMPLETO de una instancia. Así subió d7602d7 sin poder construir axisworks-demo («pasos declarados
sin frase»: el registro de la agencia declaraba pasos cuya frase vivía en setup_reservas.js) y nadie lo supo hasta ir a
publicar. Es la 2.ª vez de la familia (la 1.ª, capas.json el 11-oct): una pieza que solo falla al construir la instancia entera.

Qué hace: `build.py --instancia <i>` de cada instancia que construye este build (las de erp/instancias.json con `dominio_erp`;
Lawang se sirve desde su propio repo), una tras otra (comparten dist/), con AXW_PRUEBA_DESPLIEGUE en una carpeta temporal FUERA
de la agencia: sin ella el build vacía y rellena erp/despliegues/<i>, el clon que se publica. Para con la instancia y el motivo.
Lee el registro de AXW_AGENCIA_RAIZ, como el resto de tests de demo-erp (test.py se la pasa).
Uso: python test_builds_instancias.py [--solo <instancia>]   → «OK …» o rc=1 con la instancia y la línea ABORTA.
"""
import json
import os
import shutil
import subprocess
import sys
import tempfile
import time

AQUI = os.path.dirname(os.path.abspath(__file__))
AGENCIA = os.path.abspath(os.environ.get('AXW_AGENCIA_RAIZ') or os.path.join(AQUI, '..', '..', '..', '..'))


def instancias():
    reg = json.load(open(os.path.join(AGENCIA, 'erp', 'instancias.json'), encoding='utf-8'))['instancias']
    return [k for k, v in reg.items() if not k.startswith('_') and isinstance(v, dict) and v.get('dominio_erp') and k != 'lawang']


def fuera_de_agencia(ruta):
    a, r = os.path.normcase(os.path.realpath(AGENCIA)), os.path.normcase(os.path.realpath(ruta))
    return not (r == a or r.startswith(a + os.sep))


def construye(nombre):
    """(rc, motivo, segundos). Nunca escribe en erp/despliegues: la carpeta de prueba se crea aquí y se comprueba antes."""
    d = tempfile.mkdtemp(prefix='gate_build_%s_' % nombre)
    try:
        if not fuera_de_agencia(d):
            return 1, 'la carpeta temporal %s cae dentro de la agencia: no construyo (pisaría erp/despliegues)' % d, 0
        env = dict(os.environ, AXW_PRUEBA_DESPLIEGUE=os.path.join(d, 'paquete'), PYTHONIOENCODING='utf-8')
        t0 = time.time()
        try:
            r = subprocess.run([sys.executable, os.path.join(AQUI, 'build.py'), '--instancia', nombre], cwd=AQUI, env=env,
                               capture_output=True, text=True, encoding='utf-8', errors='replace', timeout=600)
        except subprocess.TimeoutExpired:
            return 1, 'el build tardó más de 10 min', time.time() - t0
        seg = time.time() - t0
        out = ((r.stdout or '') + (r.stderr or '')).strip()
        if r.returncode != 0:
            lineas = out.splitlines()
            motivo = next((l for l in reversed(lineas) if 'ABORTA' in l), lineas[-1] if lineas else '(sin salida)')
            return 1, motivo.strip()[:600], seg
        if ('OK instancia %s' % nombre) not in out:
            return 1, 'el build terminó sin su línea «OK instancia %s»' % nombre, seg
        return 0, '', seg
    finally:
        shutil.rmtree(d, ignore_errors=True)


def main(argv):
    todas = instancias()
    if not todas:
        print('PARA: el registro %s no lista ninguna instancia que construya este build' % os.path.join(AGENCIA, 'erp', 'instancias.json'))
        return 1
    if '--solo' in argv:
        i = argv.index('--solo')
        todas = [n for n in todas if i + 1 < len(argv) and n == argv[i + 1]]
        if not todas:
            print('PARA: --solo necesita una instancia del registro')
            return 1
    fallos, hechas = [], []
    for n in todas:
        rc, motivo, seg = construye(n)
        (fallos if rc else hechas).append((n, motivo, seg))
    for n, motivo, seg in fallos:
        print('ROJO: la instancia %s NO construye (%.0f s): %s' % (n, seg, motivo))
    if fallos:
        print('Arreglo: lo que falte en AxisWorks o en el registro de la agencia. A mano: '
              'AXW_PRUEBA_DESPLIEGUE=<carpeta fuera de la agencia> python build.py --instancia <i>')
        return 1
    print('OK test_builds_instancias: %s construyen (%s)' % (', '.join(n for n, _, _ in hechas),
                                                            ', '.join('%s %.0f s' % (n, s) for n, _, s in hechas)))
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv))
