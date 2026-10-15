#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""El motivo de un ABORTA llega a la consola del owner (16-oct-2026).

    python test_build_salida_utf8.py [ruta/a/build.py]

Publicando bbm desde su ventana de Windows (stdout en cp1252), `aborta()` reventó con UnicodeEncodeError al imprimir «←» y el build
paró sin decir por qué. Aquí se lanza build.main() con una consola cp1252 y una opción retirada cuyo motivo lleva «←», tildes y ñ:
tiene que salir con 1, con la línea ABORTA y sin traceback. Con la ruta de un build.py viejo (sin el arreglo) sale rojo.
"""
import os
import subprocess
import sys

AQUI = os.path.dirname(os.path.abspath(__file__))
build = os.path.abspath(sys.argv[1]) if len(sys.argv) > 1 else os.path.join(AQUI, 'build.py')
codigo = ("import sys; sys.path.insert(0, %r); sys.argv = ['build.py']; import build; "
          "build.OPCIONES_RETIRADAS = {'--opcion-de-prueba': 'retirada ← con tildes y ñ'}; "
          "sys.argv = ['build.py', '--opcion-de-prueba']; build.main()") % os.path.dirname(build)
# build.py busca el clon de Lawang desde la agencia: en una copia (worktree) se la da AXW_AGENCIA_RAIZ, que sale del clon principal
# (el padre de --git-common-dir, como tools/test.py) si no viene puesta
entorno = dict(os.environ, PYTHONIOENCODING='cp1252', PYTHONUTF8='0')
if not entorno.get('AXW_AGENCIA_RAIZ'):
    comun = subprocess.run(['git', 'rev-parse', '--path-format=absolute', '--git-common-dir'], capture_output=True, text=True,
                           cwd=os.path.dirname(build)).stdout.strip()
    if comun:
        entorno['AXW_AGENCIA_RAIZ'] = os.path.dirname(os.path.dirname(os.path.dirname(comun)))   # <agencia>/proyectos/AxisWorks/.git
r = subprocess.run([sys.executable, '-c', codigo], capture_output=True, cwd=os.path.dirname(build), env=entorno)
out = (r.stdout or b'').decode('cp1252', 'replace') + (r.stderr or b'').decode('cp1252', 'replace')
assert r.returncode == 1, (r.returncode, out[-800:])
assert 'ABORTA: --opcion-de-prueba retirada' in out, out[-800:]
assert 'Traceback' not in out and 'UnicodeEncodeError' not in out, out[-800:]
print('OK build salida utf8: el motivo del ABORTA se imprime en una consola cp1252, sin traceback')
