"""Lawang en una versión FIJADA para el ERP (E3.9; owner 13-oct-2026: «Separar ya el ERP de Lawang»).

POR QUÉ EXISTE. El build de las instancias y sus pruebas leían el DISCO del clon principal de Lawang, que cambia ~10 veces
al día (69 commits en 7 días tocaban lo que lee el ERP, 13-oct). Cada cambio de Lawang que movía un trozo que build.py
parchea dejaba en rojo el build de TODAS las instancias o el gate de todos: 6 veces del 11 al 13-oct. Ahora el ERP lee
Lawang en el sha apuntado en `lawang.json`, extraído con `git archive` del almacén de objetos del clon principal (no se
mueve ningún árbol de trabajo). A Lawang le da igual; al ERP solo le llega un cambio cuando alguien sube el sha a propósito
(orden `sube`, S2), y ese alguien es quien arregla lo que se rompa.

QUÉ GARANTIZA (revisión previa nº 311, Backend+Frontend+Deploy+Seguridad):
  - La caché `%LOCALAPPDATA%/AxisWorks/lawang_sha/<sha>` se extrae a una carpeta temporal y se renombra de una vez
    (nunca queda a medias), sin junctions. NO en solo lectura: build.py copia con shutil.copy2, que arrastra el atributo, y
    luego reescribe la copia en dist/ (medido 13-oct: PermissionError). La guarda es la comprobación de abajo.
  - ANTES DE CADA USO se compara cada fichero con su blob de `git ls-tree` (y que no sobre ninguno): si alguien la tocó,
    aborta. Cuesta ~0,3 s.
  - `-c core.autocrlf=false`: el resultado no depende de la configuración de la máquina (Lawang no tiene .gitattributes).
  - Lista CERRADA de rutas (RUTAS): lo que no está aquí no existe para el ERP. Leer algo nuevo de Lawang = añadirlo aquí.
  - Sin red: si el sha no está en el clon, aborta con el remedio (`git fetch`). El fetch lo hace `sube`, nunca el build.
  - `_qa_double_guard.js` está fuera de git y no viaja en ningún sha: se sigue leyendo del clon principal, pero solo si su
    sha256 es el apuntado en `lawang.json` (la demo pública lo publica como guard.js).

    python lawang_fijado.py --raiz        # imprime la carpeta de Lawang en el sha fijado (para node y la consola)
    python lawang_fijado.py --comprueba   # extrae/verifica y dice qué sha, cuántos ficheros y cuánto tardó
    python lawang_fijado.py pendientes    # la COLA de lo que Lawang main tiene y el ERP aún no (se calcula, no se escribe; ver abajo)
"""
import hashlib
import io
import json
import os
import shutil
import stat
import subprocess
import sys
import tarfile
import time

AQUI = os.path.dirname(os.path.abspath(__file__))
FICHERO = os.path.join(AQUI, 'lawang.json')
# Lo que el ERP lee de Lawang (medido el 13-oct con un gancho de auditoría sobre build.py y sus pruebas). `supabase/` lo
# leen solo las pruebas (test_base_falsa) y nunca llega a dist/: build.py lo filtra con PROHIBIDO (.sql) y EXT_OK.
RUTAS = ('intranet', 'contracts', 'portal', 'favicon.png', 'assets/img/papel-grano.jpg', 'supabase/migrations')
DOBLE_QA = '_qa_double_guard.js'
CONSERVA = 6   # carpetas de sha que se guardan en la caché (la fijada siempre)


def sale(msg):
    print('ABORTA: lawang_fijado: ' + msg)
    sys.exit(1)


def agencia():
    """Raíz de la agencia con el clon principal de Lawang (misma regla que build.py: AXW_AGENCIA_RAIZ o cuatro niveles arriba)."""
    return os.path.abspath(os.environ.get('AXW_AGENCIA_RAIZ') or os.path.join(AQUI, '..', '..', '..', '..'))


def almacen():
    """Repo de Lawang del que se leen los objetos: el clon principal. En una copia de sesión de la agencia `proyectos/` no
    existe; entonces manda `raiz_proyecto.PROYECTOS` (el principal), nunca una cartera vacía."""
    d = os.path.join(agencia(), 'proyectos', 'Lawang')
    if os.path.exists(os.path.join(d, '.git')):
        return d
    tools = os.path.join(agencia(), 'tools')
    if os.path.isfile(os.path.join(tools, 'raiz_proyecto.py')):
        sys.path.insert(0, tools)
        try:
            import raiz_proyecto
            d = str(raiz_proyecto.PROYECTOS / 'Lawang')
        finally:
            sys.path.pop(0)
        if os.path.exists(os.path.join(d, '.git')):
            return d
    sale('no encuentro el clon de Lawang (ni %s/proyectos/Lawang ni el principal): ¿AXW_AGENCIA_RAIZ?' % agencia())


def lee_fijado():
    try:
        f = json.load(open(FICHERO, encoding='utf-8'))
    except (OSError, ValueError) as e:
        sale('no puedo leer %s: %s' % (FICHERO, e))
    sha = str(f.get('sha', ''))
    if len(sha) != 40 or any(c not in '0123456789abcdef' for c in sha):
        sale('lawang.json: «sha» tiene que ser el sha COMPLETO (40 hex) de un commit de Lawang, y es %r' % sha)
    return f


def git(*args, binario=False):
    r = subprocess.run(['git', '-C', almacen(), '--no-optional-locks', '-c', 'core.autocrlf=false', '-c', 'gc.auto=0'] + list(args),
                       capture_output=True, timeout=120)
    if r.returncode:
        return None
    return r.stdout if binario else r.stdout.decode('utf-8', 'replace')


def esperado(sha):
    """{ruta: sha1 del blob} de RUTAS en `sha`, sacado del almacén (no de la caché: lo que se comprueba no puede ser su propia prueba)."""
    if git('cat-file', '-e', sha + '^{commit}') is None:
        sale('el sha fijado %s no está en el clon de Lawang (%s). Remedio: git -C "%s" fetch origin, y repetir. '
             'El build no va a la red a propósito.' % (sha[:12], almacen(), almacen()))
    salida = git('ls-tree', '-r', '-z', '--full-tree', sha, '--', *RUTAS)
    if salida is None:
        sale('git ls-tree falló sobre %s' % sha[:12])
    out = {}
    for linea in salida.split('\0'):
        if not linea:
            continue
        meta, ruta = linea.split('\t', 1)
        modo, tipo, blob = meta.split()
        if tipo != 'blob':
            continue
        if modo == '120000':
            continue   # enlace simbólico (p. ej. contracts/supabase/functions/*, LAW-238): no se extrae; el ERP no los copia
        out[ruta] = blob
    if not out:
        sale('ninguna de las RUTAS existe en %s: ¿sha equivocado?' % sha[:12])
    return out


def sha1_blob(datos):
    return hashlib.sha1(b'blob %d\0' % len(datos) + datos).hexdigest()


def verifica(carpeta, blobs):
    """Lista de problemas: fichero que falta, que sobra o cuyo contenido no es su blob."""
    malos = []
    vistos = set()
    for raiz, dirs, fichs in os.walk(carpeta):
        dirs[:] = [d for d in dirs if not os.path.islink(os.path.join(raiz, d))]
        for n in fichs:
            p = os.path.join(raiz, n)
            rel = os.path.relpath(p, carpeta).replace(os.sep, '/')
            if rel == '.completa':
                continue
            vistos.add(rel)
            if rel not in blobs:
                malos.append('sobra ' + rel)
            elif os.path.islink(p) or sha1_blob(open(p, 'rb').read()) != blobs[rel]:
                malos.append('distinto ' + rel)
    malos += ['falta ' + r for r in sorted(set(blobs) - vistos)]
    return malos


def cache():
    base = os.environ.get('LOCALAPPDATA') or os.path.join(os.path.expanduser('~'), '.cache')
    return os.path.join(base, 'AxisWorks', 'lawang_sha')


def _borra(carpeta):
    def quita_ro(fn, p, _e):
        os.chmod(p, stat.S_IWRITE)
        fn(p)
    shutil.rmtree(carpeta, onexc=quita_ro) if sys.version_info >= (3, 12) else shutil.rmtree(carpeta, onerror=quita_ro)


def extrae(sha, blobs, destino):
    """`git archive` de RUTAS a `destino` (que no existe). Lo que no está en `blobs` (una ruta de RUTAS ausente en este sha)
    no se pide: git aborta con un pathspec que no casa."""
    rutas = sorted({r for r in RUTAS if any(b == r or b.startswith(r + '/') for b in blobs)})
    tar = git('archive', '--format=tar', sha, '--', *rutas, binario=True)
    if tar is None:
        sale('git archive falló sobre %s' % sha[:12])
    os.makedirs(destino)
    with tarfile.open(fileobj=io.BytesIO(tar)) as t:
        t.extractall(destino, members=[m for m in t.getmembers() if not m.issym() and not m.islnk()], filter='data')


def raiz(sha=None):
    """Carpeta con Lawang en `sha` (por defecto el de lawang.json), verificada fichero a fichero contra el almacén."""
    if sha is None:
        sha = lee_fijado()['sha']
        esperado(sha)   # existe en el almacén (si no, aborta con el remedio)
        # Publicado: un lawang.json editado a mano con un sha de una copia de sesión (comparten objetos) no construye (revisor 13-oct).
        # Sin red: contra la referencia local origin/main; si va por detrás, el remedio es el mismo fetch.
        if git('merge-base', '--is-ancestor', sha, 'refs/remotes/origin/main') is None:
            sale('el sha fijado %s no está en origin/main de Lawang (según este clon). Solo se fija lo publicado: '
                 'git -C "%s" fetch origin, y si sigue, lawang.json apunta a un commit sin subir.' % (sha[:12], almacen()))
    blobs = esperado(sha)
    final = os.path.join(cache(), sha)
    if os.path.isdir(final) and os.path.isfile(os.path.join(final, '.completa')):
        malos = verifica(final, blobs)
        if malos:
            sale('la caché %s no es el sha %s (%d diferencias: %s). Alguien la tocó: bórrala y repite.'
                 % (final, sha[:12], len(malos), '; '.join(malos[:4])))
        return final
    os.makedirs(cache(), exist_ok=True)
    tmp = os.path.join(cache(), '.tmp-%s-%d' % (sha[:12], os.getpid()))
    if os.path.exists(tmp):
        _borra(tmp)
    extrae(sha, blobs, tmp)
    malos = verifica(tmp, blobs)
    if malos:
        _borra(tmp)
        sale('la extracción de %s no casa con sus blobs (%s)' % (sha[:12], '; '.join(malos[:4])))
    open(os.path.join(tmp, '.completa'), 'w', encoding='utf-8').write(sha + '\n')
    try:
        os.rename(tmp, final)
    except OSError:
        _borra(tmp)          # otra sesión la dejó a la vez: vale la suya si está completa y verifica
        if not os.path.isfile(os.path.join(final, '.completa')) or verifica(final, blobs):
            sale('no pude dejar la caché de %s en %s' % (sha[:12], final))
    poda(sha)
    return final


def poda(recien):
    """Deja la carpeta del sha de lawang.json, la recién usada y las más recientes hasta CONSERVA; restos de extracciones muertas
    (.tmp-*, .sube-*) de más de 1 h fuera. La fijada nunca: otro worktree puede estar construyendo con ella."""
    try:
        fijado = lee_fijado()['sha']
    except SystemExit:
        fijado = recien
    try:
        hijos = [os.path.join(cache(), n) for n in os.listdir(cache())]
    except OSError:
        return
    ahora = time.time()
    for h in hijos:
        if os.path.basename(h).startswith(('.tmp-', '.sube-')) and os.path.isdir(h) and ahora - os.path.getmtime(h) > 3600:
            _borra(h)
    shas = sorted((h for h in hijos if len(os.path.basename(h)) == 40 and os.path.basename(h) not in (fijado, recien) and os.path.isdir(h)),
                  key=os.path.getmtime, reverse=True)
    # CONSERVA en total: la fijada, la recién usada (si es otra) y las más recientes hasta completar (BAJA del revisor de S1: con
    # `CONSERVA - 2` a secas, si la recién usada ERA la fijada se guardaban 5).
    for h in shas[CONSERVA - (1 if recien == fijado else 2):]:
        _borra(h)


def doble_qa():
    """Ruta del doble de QA (fuera de git, en el clon principal) si su sha256 es el de lawang.json; si no, aborta."""
    f = lee_fijado()
    ruta = os.path.join(almacen(), DOBLE_QA)
    if not os.path.isfile(ruta):
        sale('falta %s en el clon de Lawang (fuera de git: no viaja en el sha)' % ruta)
    h = hashlib.sha256(open(ruta, 'rb').read()).hexdigest()
    if h != f.get('doble_qa_sha256'):
        sale('%s cambió (sha256 %s, lawang.json dice %s). Va a la demo pública como guard.js: revisar el cambio y apuntar '
             'la huella nueva en lawang.json con el mismo cuidado que un sha.' % (DOBLE_QA, h[:12], str(f.get('doble_qa_sha256'))[:12]))
    return ruta


# ── sube: traer una versión nueva de Lawang al ERP, A PROPÓSITO y probada en el mismo paso (S2) ──────────────────────────
# Lo que se mira con lupa en el informe (Seguridad, revisión previa nº 311): permisos, dinero, el canon del correo y el servidor.
SENSIBLES = ('contracts/assets/guard.js', 'contracts/assets/dinero.js', 'contracts/edge', 'supabase/functions', 'supabase/migrations')
INFORME = os.path.join(AQUI, 'lawang_sube.txt')   # va en el MISMO commit que lawang.json: es lo que lee el revisor (.md no: lo ignora el .gitignore)
TOPE_DIFF = 4000
CANDADO_VIEJO = 3600


PRUEBAN_PUBLICADO = ('test_demo_publicado.py', 'test_portal_demo.py')   # miran la demo pública: se les da la carpeta recién construida


def comprobaciones(publico=None):
    """[(nombre, comando)]: las 3 salidas que se publican + todas las pruebas de demo-erp. En serie: comparten dist/."""
    py = sys.executable
    cs = [('build --instancia bbm', [py, 'build.py', '--instancia', 'bbm']),
          ('build --instancia axisworks-demo', [py, 'build.py', '--instancia', 'axisworks-demo']),
          ('build (demo)', [py, 'build.py']),
          ('build --publico', [py, 'build.py', '--publico'])]
    for n in sorted(os.listdir(AQUI)):
        if n.startswith('test_') and n.endswith('.py'):
            cs.append((n, [py, n] + (['--sin-navegador'] if n == 'test_crea_contrasena.py' else [])
                       + (['--publicado', publico] if publico and n in PRUEBAN_PUBLICADO else [])))
        elif n.endswith('.test.js'):
            cs.append((n, ['node', n]))
    return cs


def _etiqueta(salida):
    """La primera línea que dice QUÉ falló, sin rutas de la máquina: es lo que se compara entre incidentes. Una prueba que
    caza abortos a propósito imprime antes sus ABORTA ESPERADOS (test_lawang_fijado: «la caché … no es el sha», 17-oct), así
    que un FALLA manda sobre un ABORTA: si no, el rojo se atribuía a la caché y el fallo de verdad quedaba escondido."""
    lineas = [l.strip() for l in salida.splitlines()]
    for prefijos in (('FALLA',), ('ABORTA', 'ROJO', 'AssertionError', 'Error:')):
        for s in lineas:
            if s.startswith(prefijos):
                return s[:220]
    return (salida.strip().splitlines() or ['(sin salida)'])[-1][:220]


def _candado():
    os.makedirs(cache(), exist_ok=True)
    ruta = os.path.join(cache(), '.sube.lock')
    try:
        if time.time() - os.path.getmtime(ruta) > CANDADO_VIEJO:
            os.remove(ruta)   # de un `sube` muerto hace más de 1 h
    except OSError:
        pass
    try:
        fd = os.open(ruta, os.O_CREAT | os.O_EXCL | os.O_WRONLY)
    except FileExistsError:
        sale('ya hay un `sube` en marcha (%s, %s). Dos a la vez se pisarían dist/ y lawang.json: espera a que acabe.'
             % (ruta, open(ruta, encoding='utf-8').read().strip()))
    os.write(fd, ('pid %d desde %s' % (os.getpid(), time.strftime('%H:%M'))).encode())
    os.close(fd)
    return ruta


def prueba(sha):
    """Todas las comprobaciones contra Lawang en `sha`, SIN tocar lawang.json. [(nombre, etiqueta)] de lo que sale rojo."""
    carpeta = raiz(sha)
    doble_qa()
    # AXW_PRUEBA_DESPLIEGUE fuera de la agencia: sin ella `build.py --instancia` pisa erp/despliegues/<inst> del clon principal
    # (incidente del revisor, 13-oct), que es lo que compara quien publica.
    # AXW_PRUEBA_PUBLICO: `--publico` escribe fuera del repo; si no, dist/demo-erp y dist/erp-web (en git, los publica el push) quedarían
    # construidos con el Lawang candidato aunque salga rojo (revisor 13-oct). AXW_LAWANG_GIT/REV: la pista de quien_cambio_lawang.
    destino = os.path.join(cache(), '.sube-%d' % os.getpid())
    entorno = dict(os.environ, AXW_LAWANG_RAIZ=carpeta, AXW_PRUEBA_DESPLIEGUE=os.path.join(destino, 'paquete'),
                   AXW_PRUEBA_PUBLICO=os.path.join(destino, 'publico'), AXW_LAWANG_GIT=almacen(), AXW_LAWANG_REV=sha)
    rojos = []
    t0 = time.time()
    cs = comprobaciones(os.path.join(destino, 'publico'))
    try:
        for nombre, cmd in cs:
            try:
                r = subprocess.run(cmd, cwd=AQUI, env=entorno, capture_output=True, text=True, encoding='utf-8',
                                   errors='replace', timeout=600)
                ok, salida = r.returncode == 0, r.stdout + r.stderr
            except subprocess.TimeoutExpired:
                ok, salida = False, 'ROJO: más de 600 s'
            print('  %s %s' % ('ok  ' if ok else 'ROJO', nombre) + ('' if ok else ' — ' + _etiqueta(salida)), flush=True)
            if not ok:
                rojos.append((nombre, _etiqueta(salida)))
    finally:
        if os.path.isdir(destino):
            _borra(destino)
    print('Lawang %s: %d comprobaciones, %d en rojo, %.0f s' % (sha[:12], len(cs), len(rojos), time.time() - t0))
    return rojos


def sube(destino, por, motivo, sin_red=False):
    """Prueba Lawang en `destino` (sha o rama de origin, p. ej. «main») contra TODO lo del ERP. Verde → reescribe lawang.json e
    informe. Rojo → lawang.json NO cambia y dice qué falló y qué commits del rango tocan lo que lee el ERP. Devuelve 0/1."""
    candado = _candado()
    try:
        fijado = lee_fijado()
        viejo = fijado['sha']
        if not sin_red and git('fetch', '-q', 'origin') is None:
            sale('git fetch de Lawang falló: sin red no se sube (el sha tiene que estar publicado en origin)')
        nuevo = ''
        for c in (['origin/' + destino] if len(destino) < 40 else []) + [destino]:   # «main» = origin/main, nunca el main local
            s = (git('rev-parse', '--verify', '-q', c + '^{commit}') or '').strip()
            if len(s) == 40:
                nuevo = s
                break
        if not nuevo:
            sale('no encuentro %r en Lawang' % destino)
        if git('merge-base', '--is-ancestor', nuevo, 'origin/main') is None:
            sale('%s no está en origin/main de Lawang: el ERP solo fija lo publicado y sellado' % nuevo[:12])
        if git('merge-base', '--is-ancestor', viejo, nuevo) is None:
            sale('%s no desciende del sha fijado %s: bajar de versión se hace a mano, con motivo' % (nuevo[:12], viejo[:12]))
        if nuevo == viejo:
            print('lawang.json ya está en %s: nada que subir' % viejo[:12])
            return 0
        rango = '%s..%s' % (viejo, nuevo)
        log = git('log', '--first-parent', '--format=%h %ad %s', '--date=short', rango, '--', *RUTAS) or ''
        print('Lawang %s → %s: %d commits de primer nivel tocan lo que lee el ERP' % (viejo[:12], nuevo[:12], len(log.splitlines())))
        rojos = prueba(nuevo)
        if rojos:
            print('\nROJO: lawang.json SIGUE en %s. Arregla lo de arriba EN ESTA RAMA (anclas de build.py, demo_datos.js…) y repite.' % viejo[:12])
            print('Commits del rango que tocan lo que lee el ERP (el culpable está aquí):')
            print('\n'.join('  ' + l for l in log.splitlines()[:40]))
            return 1
        stat_ = git('diff', '--stat=160', rango, '--', *RUTAS) or ''
        sens = git('diff', rango, '--', *SENSIBLES) or ''
        lineas = sens.splitlines()
        cuerpo = '\n'.join(lineas[:TOPE_DIFF]) + ('\n… (%d líneas más: `git diff %s -- %s`)' % (len(lineas) - TOPE_DIFF, rango, ' '.join(SENSIBLES))
                                                  if len(lineas) > TOPE_DIFF else '')
        open(INFORME, 'w', encoding='utf-8', newline='\n').write(
            '# Lawang %s → %s (lo genera `lawang_fijado.py sube`; va en el commit que sube el sha)\n\n'
            'Comprobaciones en verde: %d (las 3 salidas que se publican y todas las pruebas de demo-erp).\n\n'
            '## Commits que tocan lo que lee el ERP\n```\n%s\n```\n\n## Ficheros\n```\n%s\n```\n\n'
            '## Diff entero de lo sensible (%s)\n```diff\n%s\n```\n'
            % (viejo, nuevo, len(comprobaciones()), log.strip(), stat_.strip(), ', '.join(SENSIBLES), cuerpo or '(nada)'))
        nuevo_f = dict(fijado, sha=nuevo, fecha=time.strftime('%Y-%m-%d'), por=por, motivo=motivo)
        open(FICHERO, 'w', encoding='utf-8', newline='\n').write(json.dumps(nuevo_f, ensure_ascii=False, indent=2) + '\n')
        print('\nVERDE: lawang.json → %s. Commit de lawang.json + lawang_sube.txt (+ tus arreglos) y al revisor.' % nuevo[:12])
        return 0
    finally:
        try:
            os.remove(candado)
        except OSError:
            pass


# ── pendientes: la cola de lo que el ERP aún no tiene de Lawang (15-oct-2026, owner: «un sitio donde lo guardemos para luego exportarlo») ──
# Se CALCULA del fijado y de Lawang main: los commits (no merges) que tocan RUTAS, cada uno por su sha con su mensaje y sus rutas. Lo único
# escrito a mano es `lawang_portados.json`: por sha de Lawang, qué parche de build.py trae ya ese arreglo al ERP (y por tanto se quita al
# subir el fijado por encima). «Exportar» = `sube` (arriba), que prueba todo y fija el sha; esto solo dice cuánto hay y qué parches caen.
PORTADOS = os.path.join(AQUI, 'lawang_portados.json')


def lee_portados():
    """{sha de Lawang: {'parche', 'quitar'}} del registro (por sha, nunca por nombre de fichero). Sin fichero = nada portado."""
    try:
        return json.load(open(PORTADOS, encoding='utf-8'))
    except OSError:
        return {}
    except ValueError as e:
        sale('no puedo leer %s: %s' % (PORTADOS, e))


def _git_en(repo, *args):
    r = subprocess.run(['git', '-C', repo, '--no-optional-locks', '-c', 'core.autocrlf=false', '-c', 'gc.auto=0'] + list(args),
                       capture_output=True, timeout=120)
    return None if r.returncode else r.stdout.decode('utf-8', 'replace')


def pendientes(destino='origin/main', repo=None, rango_aterrizaje=None):
    """La cola calculada. Devuelve un dict:
      fijado, destino (shas completos), commits [{sha, fecha, asunto, rutas, portado: None|{parche, quitar}}],
      se_quitan [{parche, quitar, shas}] (parches cuyo arreglo entra al subir el fijado a `destino`),
      caducados [{sha, parche}] (registro cuyo sha YA está en el fijado: el parche tendría que haberse quitado),
      toca_aterrizaje (True/False/None: si `rango_aterrizaje` «a..b» toca RUTAS; None si no se pidió).
    `repo` = dónde leer los objetos (por defecto el clon principal de Lawang; aterriza.py pasa la copia, que ya tiene el sha empujado)."""
    repo = repo or almacen()
    fijado = lee_fijado()['sha']
    nuevo = (_git_en(repo, 'rev-parse', '--verify', '-q', destino + '^{commit}') or '').strip()
    if len(nuevo) != 40:
        sale('no encuentro %r en %s' % (destino, repo))
    portados = {}
    for pref, fila in lee_portados().items():
        if not isinstance(fila, dict) or not fila.get('parche') or not fila.get('quitar'):
            sale('%s: la fila %r necesita «parche» y «quitar»' % (PORTADOS, pref))
        full = (_git_en(repo, 'rev-parse', '--verify', '-q', pref + '^{commit}') or '').strip()
        if len(pref) < 9 or len(full) != 40:
            sale('%s: %r no es un sha (≥9 hex) que exista en Lawang' % (PORTADOS, pref))
        portados[full] = fila
    out = _git_en(repo, 'log', '--no-merges', '--name-only', '--format=@@%H%x09%ad%x09%s', '--date=short',
                  '%s..%s' % (fijado, nuevo), '--', *RUTAS)
    if out is None:
        sale('no puedo recorrer %s..%s en %s (¿el fijado no está en ese repo?)' % (fijado[:9], nuevo[:9], repo))
    commits = []
    for linea in out.splitlines():
        if linea.startswith('@@'):
            sha, fecha, asunto = (linea[2:].split(chr(9), 2) + ['', ''])[:3]
            commits.append({'sha': sha, 'fecha': fecha, 'asunto': asunto, 'rutas': [], 'portado': portados.get(sha)})
        elif linea.strip() and commits:
            commits[-1]['rutas'].append(linea.strip())
    por_parche = {}
    for c in commits:
        if c['portado']:
            f = por_parche.setdefault(c['portado']['parche'], {'parche': c['portado']['parche'], 'quitar': c['portado']['quitar'], 'shas': []})
            f['shas'].append(c['sha'])
    caducados = [{'sha': s, 'parche': f['parche']} for s, f in portados.items()
                 if _git_en(repo, 'merge-base', '--is-ancestor', s, fijado) is not None]
    toca = None
    if rango_aterrizaje:
        nombres = _git_en(repo, 'diff', '--name-only', rango_aterrizaje, '--', *RUTAS)
        toca = bool((nombres or '').strip())
    return {'fijado': fijado, 'destino': nuevo, 'commits': commits, 'se_quitan': list(por_parche.values()),
            'caducados': caducados, 'toca_aterrizaje': toca}


def linea_aterrizaje(p):
    """Una línea para quien aterriza en Lawang, o '' si lo que subió no toca lo que lee el ERP. Solo informa, nunca bloquea."""
    if not p['toca_aterrizaje'] or not p['commits']:
        return ''
    return ('esto toca rutas que el ERP lee de Lawang y NO le llega hasta subir el fijado: %d commits pendientes '
            '(`python proyectos/AxisWorks/comercial/demo-erp/lawang_fijado.py pendientes`; subirlo = `sube main`, lo hace Deploy en el tren).'
            % len(p['commits']))


def imprime_pendientes(p, todo=False):
    cs = p['commits']
    print('Lawang fijado %s → %s: %d commits pendientes que tocan lo que lee el ERP (%d ya portados a mano)'
          % (p['fijado'][:9], p['destino'][:9], len(cs), sum(1 for c in cs if c['portado'])))
    for c in (cs if todo else cs[:40]):
        marca = '  [PORTADO a mano: %s]' % c['portado']['parche'] if c['portado'] else ''
        rutas = ', '.join(c['rutas'][:3]) + (' (+%d)' % (len(c['rutas']) - 3) if len(c['rutas']) > 3 else '')
        print('  %s %s %s%s\n      %s' % (c['sha'][:9], c['fecha'], c['asunto'][:110], marca, rutas))
    if not todo and len(cs) > 40:
        print('  … %d más (--todo los lista)' % (len(cs) - 40))
    for f in p['se_quitan']:
        print('AL SUBIR el fijado se quita el parche %s: %s (sus commits: %s)' % (f['parche'], f['quitar'], ', '.join(s[:9] for s in f['shas'])))
    for f in p['caducados']:
        print('REGISTRO CADUCADO: %s ya está en el fijado; quita el parche %s de build.py y su fila de lawang_portados.json' % (f['sha'][:9], f['parche']))


if __name__ == '__main__':
    if len(sys.argv) > 1 and sys.argv[1] == 'pendientes':
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')   # en Windows, con la salida redirigida, cp1252 no tiene «→» ni «≥»
        def _a(n, d=None):
            return sys.argv[sys.argv.index(n) + 1] if n in sys.argv and sys.argv.index(n) + 1 < len(sys.argv) else d
        if '--fetch' in sys.argv and git('fetch', '-q', 'origin') is None:
            sale('git fetch de Lawang falló (sin red)')
        p = pendientes(_a('--destino', 'origin/main'), repo=_a('--en'), rango_aterrizaje=_a('--aterrizaje'))
        if '--linea' in sys.argv:
            print(linea_aterrizaje(p))
        elif '--json' in sys.argv:
            print(json.dumps(p, ensure_ascii=False, indent=1))
        else:
            imprime_pendientes(p, todo='--todo' in sys.argv)
        sys.exit(0)
    if len(sys.argv) > 2 and sys.argv[1] == 'sube':
        def _arg(n, d=''):
            return sys.argv[sys.argv.index(n) + 1] if n in sys.argv and sys.argv.index(n) + 1 < len(sys.argv) else d
        if not _arg('--por') or not _arg('--motivo'):
            sale('uso: python lawang_fijado.py sube <sha|main> --por "<sesión>" --motivo "<para qué hace falta>"')
        sys.exit(sube(sys.argv[2], _arg('--por'), _arg('--motivo'), sin_red='--sin-red' in sys.argv))
    if len(sys.argv) > 2 and sys.argv[1] == 'prueba':   # probar un sha (o rama de una copia de Lawang) sin fijarlo
        c = _candado()
        try:
            s = (git('rev-parse', '--verify', '-q', sys.argv[2] + '^{commit}') or '').strip()
            if len(s) != 40:
                sale('no encuentro %r en Lawang' % sys.argv[2])
            sys.exit(1 if prueba(s) else 0)
        finally:
            os.remove(c)
    if '--raiz' in sys.argv:
        print(raiz())
    elif '--comprueba' in sys.argv:
        t0 = time.time()
        d = raiz()
        doble_qa()
        n = sum(len(f) for _r, _d, f in os.walk(d)) - 1
        print('OK Lawang %s en %s: %d ficheros verificados en %.1f s' % (lee_fijado()['sha'][:12], d, n, time.time() - t0))
    else:
        print(__doc__)
