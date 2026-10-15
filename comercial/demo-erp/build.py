#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Demo del ERP (intranet v4 de Lawang) para enseñar a prospectos SIN darles acceso — 24-sep-2026.

    python build.py            # genera dist/ desde Lawang en el sha de lawang.json (E3.9, 13-oct-2026; antes: el disco)
    presentar.cmd              # lo sirve en http://127.0.0.1:8977/ y abre el navegador

Qué hace: copia la v4 y los assets compartidos que usa, y en el sitio de
`/contracts/assets/guard.js` pone un DOBLE (derivado de `_qa_double_guard.js` de
Lawang): cliente de Supabase falso en memoria + candado de red + datos
sintéticos (`demo_datos.js`). Regenerable: cuando la v4 cambie, se vuelve a
lanzar y la demo enseña la versión nueva. Nunca se edita `dist/` a mano.

Revisión previa (24-sep, Seguridad + Legal), cada regla con su porqué:
- `dist/` está en .gitignore del repo AxisWorks, que despliega a Hostinger: el
  bundle lleva código de un cliente y un guard que siempre dice super_admin.
  Se presenta EN LOCAL compartiendo pantalla.
- PUBLICARLO (owner, 24-sep: demo.axisworks.studio con marca neutra) solo con
  `python build.py --publico`: sin comentarios, sin marca ni nombres de Lawang,
  y se niega a copiar a `AxisWorks/dist/demo-erp/` si queda un rastro (ver `publica()`).
  El push del repo lo despliega; el subdominio apunta a esa carpeta.
- La URL y la clave de Supabase se cambian por `demo.invalid`: si el candado de
  red tuviera un hueco, no hay dónde llegar. La RLS no es la red: hay RPC que un
  anónimo SÍ puede leer, y `leads` admite INSERT anónimo.
- Copia por LISTA BLANCA y comprueba al final: fuera DNI de apoderados, firmas
  escaneadas, anexos, folletos, plantillas de contrato (una lleva los datos de
  un comprador real; el texto de los contratos es información de Lawang),
  `_plan`, tests, `.sql`, `_*`.
- El generador de contratos y el portal del inversor NO van en la demo (Legal).
- Nombres sintéticos cruzados por hash contra `clients`/`usuarios`
  (`tools/pii_maqueta.py --check`): lo lanza este script; sin índice, aborta.
- Se niega a escribir fuera de su `dist/` o dentro de `proyectos/Lawang/`: un
  guard falso escrito ahí lo desplegaría el webhook de Lawang.
"""
import base64
import collections
import hashlib
import html
import json
import os
import posixpath
import re
import shutil
import subprocess
import sys

AQUI = os.path.dirname(os.path.abspath(__file__))


def node_modules_de_fuera(aqui=AQUI):
    """El node_modules de ESTA carpeta en el clon principal, si aquí no hay uno completo; o None (15-oct-2026, deploy-axw).
    node_modules no va en git: una copia de AxisWorks (cualquier `git worktree`: `proyectos/_sesiones/…` o el scratchpad) no lo
    trae y limpia_publico.js caía con «Cannot find module 'terser'» (calidad-gastos lo pasó a mano con NODE_PATH). El clon
    principal es el padre del git-common-dir, como en el gate (tools/test.py). Completo = con `.package-lock.json`."""
    if os.path.isfile(os.path.join(aqui, 'node_modules', '.package-lock.json')):
        return None
    try:
        g = lambda *a: subprocess.run(['git', *a], cwd=aqui, capture_output=True, text=True, encoding='utf-8',
                                      timeout=15).stdout.strip()
        rel = os.path.relpath(aqui, g('rev-parse', '--show-toplevel'))
        nm = os.path.join(os.path.dirname(g('rev-parse', '--path-format=absolute', '--git-common-dir')), rel, 'node_modules')
    except (OSError, ValueError, subprocess.SubprocessError):
        return None
    return nm if os.path.isfile(os.path.join(nm, '.package-lock.json')) else None


# Todos los `node` que lanza el build heredan la ruta (solo AÑADE una ruta de búsqueda: no cambia nada si aquí ya está completo).
_NM_FUERA = node_modules_de_fuera()
if _NM_FUERA:
    os.environ['NODE_PATH'] = os.pathsep.join([_NM_FUERA] + ([os.environ['NODE_PATH']] if os.environ.get('NODE_PATH') else []))


def limpia_publico(dist):
    """`node limpia_publico.js <dist>`; sin sus módulos lo dice claro en vez de dejar solo la traza de node."""
    r = subprocess.run(['node', os.path.join(AQUI, 'limpia_publico.js'), dist], cwd=AQUI, capture_output=True, text=True,
                       encoding='utf-8', errors='replace')
    sys.stdout.write(r.stdout or '')
    sys.stderr.write(r.stderr or '')
    if r.returncode != 0:
        falta = re.search(r"Cannot find module '([^']+)'", (r.stderr or '') + (r.stdout or ''))
        if falta:
            aborta("limpia_publico.js no encuentra el módulo '%s': falta node_modules en %s y tampoco hay uno completo en el clon "
                   "principal. Instálalo con `npm ci` en %s (o en esa carpeta del clon principal)." % (falta.group(1), AQUI, AQUI))
        aborta('limpia_publico.js no pudo quitar los comentarios de algún fichero (ver arriba)')


# AXW_AGENCIA_RAIZ: raíz de la AGENCIA (donde viven erp/, tools/, private/ y proyectos/Lawang) cuando se construye desde una copia de
# sesión de AxisWorks, que vive en _sesiones/<id>/AxisWorks y no cuatro niveles bajo la agencia: apunta a la copia de sesión de la agencia.
AGENCIA = os.path.abspath(os.environ.get('AXW_AGENCIA_RAIZ') or os.path.join(AQUI, '..', '..', '..', '..'))
# LAWANG = Lawang en el sha FIJADO de lawang.json, nunca el disco del clon principal (E3.9, owner 13-oct-2026: «Separar ya
# el ERP de Lawang»; 6 builds/gates en rojo en 3 días por leer el Lawang vivo). Ver lawang_fijado.py.
# AXW_LAWANG_RAIZ: construir desde OTRO árbol de Lawang (una copia de sesión o un sha candidato) para probar un cambio del núcleo
# ANTES de fijarlo (26-sep-2026, F3 lote 2b). publica_instancia.py se niega a publicar con ella puesta.
import lawang_fijado  # noqa: E402
if os.environ.get('AXW_LAWANG_RAIZ'):
    LAWANG = os.path.abspath(os.environ['AXW_LAWANG_RAIZ'])
    # `prueba`/`sube` pasan el almacén y el sha candidato para que la pista de quien_cambio_lawang diga el commit
    LAWANG_GIT, LAWANG_REV = os.environ.get('AXW_LAWANG_GIT') or LAWANG, os.environ.get('AXW_LAWANG_REV') or 'HEAD'
else:
    LAWANG = lawang_fijado.raiz()
    LAWANG_GIT, LAWANG_REV = lawang_fijado.almacen(), lawang_fijado.lee_fijado()['sha']
# El doble de QA está gitignorado (no viaja en ningún sha ni en las copias de sesión): del clon principal, SOLO si su sha256 es el
# de lawang.json, sea cual sea el árbol de Lawang (un solo camino, revisor 13-oct).
DOBLE_QA = lawang_fijado.doble_qa()
DIST = os.path.join(AQUI, 'dist')

SB_URL = 'https://vtulllundrfennhjddhc.supabase.co'
SB_HOST = 'vtulllundrfennhjddhc'
SB_KEY_RE = re.compile(r'sb_publishable_[A-Za-z0-9_\-]+')

# Pantallas de la v4 que NO entran (Legal, revisión previa 24-sep). `movil`: maquetas con el texto de un
# contrato real y fotos del cliente (24-sep, al preparar la versión pública).
FUERA_V4 = {'_plan', 'generador-contratos', 'contratos-inversor', 'movil'}
# Nada que case con esto puede acabar en dist/ (Seguridad). El hub de maqueta de la v4 y el constructor de
# dossier son material de marketing del cliente, no del ERP.
PROHIBIDO = re.compile(r'(/contracts/app\.html$|apoderados|/firma-|firma_|/anexos/|/folletos/|/templates/|/_plan/|\.sql$|\.test\.js$|/_[^/]*$|/arnes_[^/]*$|'
                       r'Backups|/private/|credentials|token\.json|\.md$|\.py$|\.zip$|'
                       r'/intranet/v4/index\.html$|/intranet/v4/movil/|/intranet/v4/assets/img/|/intranet/dossier/)', re.I)
# El mismo veto sobre las rutas del BUNDLE, que tras reraiz() ya no cuelgan de /intranet/: los tres patrones de arriba
# cambian de sitio y, sin su ruta nueva, dejarían de casar sin un solo error. (`/intranet/v4/index.html` era el hub de
# maqueta: no se copia, y una /index.html en la raíz del bundle ahora es la puerta o la landing.)
_VIEJOS = r'/intranet/v4/index\.html$|/intranet/v4/movil/|/intranet/v4/assets/img/|/intranet/dossier/'
assert _VIEJOS in PROHIBIDO.pattern
PROHIBIDO_DIST = re.compile(PROHIBIDO.pattern.replace(_VIEJOS, r'^/movil/|^/assets/img/|^/clasico/dossier/'), re.I)

# ── Versión PÚBLICA (demo.axisworks.studio, owner 24-sep: «marca neutra, dispara») ──────────────────────────
# `python build.py --publico` construye lo mismo y además: quita los comentarios (limpia_publico.js), cambia marca,
# promociones, sociedades y logo por inventados, y se NIEGA a copiar a `dist/demo-erp/` si queda un rastro de Lawang.
# Porqué: el código viene de la intranet de un cliente; sus comentarios y literales cuentan sus sociedades, sus
# representantes y sus incidentes. Sin su OK escrito (AXW-11) nada suyo sale en una web pública.
# `dist/` en la ruta a propósito: los controles de push del estudio (unificar.py, fallos_mudos.py) ya saltan
# las carpetas `dist` como código generado; este código se revisa en su origen, el repo de Lawang.
DESTINO_PUBLICO = os.path.abspath(os.path.join(AQUI, '..', '..', 'dist', 'demo-erp'))   # raíz de demo.axisworks.studio
# ── Tres hosts (AXW-70, 28-sep-2026): la web comercial (portada + configurador) en erp., la demo en demo. y el ERP
# real en app. La portada sale ADEMÁS a dist/erp-web/ con una lista cerrada de ficheros (Seguridad, rev. #146: nunca
# el bundle de la demo, con su guard falso de super_admin, en un origen que fue del ERP real).
DESTINO_WEB = os.path.abspath(os.path.join(AQUI, '..', '..', 'dist', 'erp-web'))         # raíz de erp.axisworks.studio
DEMO_URL = 'https://demo.axisworks.studio'
WEB_URL = 'https://erp.axisworks.studio'
APP_URL = 'https://app.axisworks.studio'
# Prueba con dos orígenes locales (`--prueba-origenes`): las URLs de la demo y de la portada salen de
# AXW_PRUEBA_DEMO / AXW_PRUEBA_WEB (solo http://127.0.0.1:N o http://localhost:N) y los dos bundles se escriben en
# AXW_PRUEBA_SALIDA, FUERA de este repo: un build de prueba no puede acabar en dist/ con localhost dentro.
PRUEBA_ORIGENES = '--prueba-origenes' in sys.argv
if PRUEBA_ORIGENES:
    _local = re.compile(r'^http://(127\.0\.0\.1|localhost):\d{2,5}$')
    DEMO_URL, WEB_URL = os.environ.get('AXW_PRUEBA_DEMO', ''), os.environ.get('AXW_PRUEBA_WEB', '')
    _salida = os.path.abspath(os.environ.get('AXW_PRUEBA_SALIDA', ''))
    _repo = os.path.normcase(os.path.abspath(os.path.join(AQUI, '..', '..')))
    if not (_local.match(DEMO_URL) and _local.match(WEB_URL)) or not os.environ.get('AXW_PRUEBA_SALIDA') \
            or os.path.normcase(_salida).startswith(_repo):
        print('ABORTA: --prueba-origenes pide AXW_PRUEBA_DEMO y AXW_PRUEBA_WEB (http://127.0.0.1:N o http://localhost:N) '
              'y AXW_PRUEBA_SALIDA fuera del repo AxisWorks')
        sys.exit(1)
    DESTINO_PUBLICO, DESTINO_WEB = os.path.join(_salida, 'demo-erp'), os.path.join(_salida, 'erp-web')
# AXW_PRUEBA_PUBLICO (E3.9, 13-oct-2026): `lawang_fijado.py prueba/sube` construyen `--publico` con el Lawang CANDIDATO; con las URLs
# reales pero escribiendo FUERA del repo, para no dejar dist/demo-erp y dist/erp-web (que van en git y los publica el push) construidos
# con un Lawang que aún no se ha fijado (revisor, 13-oct).
PRUEBA_PUBLICO = bool(os.environ.get('AXW_PRUEBA_PUBLICO')) and not PRUEBA_ORIGENES
if PRUEBA_PUBLICO:
    _salida = os.path.abspath(os.environ['AXW_PRUEBA_PUBLICO'])
    # La raíz del repo justa también cuenta como dentro (BAJA del revisor de S1): `startswith(repo + sep)` solo no la veía.
    _repo = os.path.normcase(os.path.abspath(os.path.join(AQUI, '..', '..')))
    if os.path.normcase(_salida) == _repo or os.path.normcase(_salida).startswith(_repo + os.sep):
        print('ABORTA: AXW_PRUEBA_PUBLICO tiene que estar fuera del repo AxisWorks: ' + _salida)
        sys.exit(1)
    DESTINO_PUBLICO, DESTINO_WEB = os.path.join(_salida, 'demo-erp'), os.path.join(_salida, 'erp-web')
# Dónde vuelve la demo al configurador («← Modules», el aviso de módulo apagado, el final del tour): la portada, que en
# la versión pública ya no está en el mismo origen. En local (presentar.cmd) es la raíz del mismo servidor.
PORTADA_URL = (WEB_URL + '/') if '--publico' in sys.argv else '/'
# ── Demo para un cliente (12-oct-2026, encargo 20261011_demo_cliente_flujo_total) ─────────────────────────────────────
# La marca de la demo, en UN solo sitio (owner, 11-oct 23:07: «AxisWorks Demo» con el aspecto de AxisWorks, cambiable): la
# leen la ficha (cabecera del menú y títulos de pestaña), el logotipo y el favicon, la portada de dos puertas y la piel
# (preset aprobado de erp/tema/presets.json, el mismo mecanismo que las instancias, F14).
DEMO = {'marca': 'AxisWorks Demo', 'cabecera': 'AXISWORKS', 'subcabecera': 'ERP DEMO', 'piel': 'axisworks'}
# Marcas y nombres de clientes que NUNCA pueden salir en la demo pública (owner, 11-oct: «marca blanca»; revisión previa de
# Backend: los proyectos de Lawang que lleva su portal). Se comprueba sobre TODO lo publicado, portal incluido.
MARCAS_CLIENTE = re.compile(r'(?i)lawang|sandal\s*woods|boda\s*enlace|bali\s*best|balibest|palm\s*field|sumba\s*hills|bonian|'
                            r'riverfront|bali\s*moto|bali2komodo|'
                            # 12-oct (portal de la demo = el del ERP): la mascota del cliente, su demo de origen y su zona
                            # («balian» con borde: «pengembalian» es indonesio corriente).
                            r'moanito|marta\s*keller|(?<![a-z])balian(?![a-z])|' + SB_HOST)
# Sesión real que hubiera en el origen (sb-*: refresh token de Supabase), fuera antes de nada: la demo (Seguridad #2,
# 25-sep) y la portada de erp., que fue el origen del ERP real y comparte storage con el configurador (rev. #146).
LIMPIA_SESION = ("(function(){try{[localStorage,sessionStorage].forEach(function(s){for(var i=s.length-1;i>=0;i--){"
                 "var k=s.key(i);if(k&&k.indexOf('sb-')===0)s.removeItem(k);}});}catch(e){}})();\n")
# Orden: de lo más largo y concreto a lo general. Se aplica al texto y a los nombres de fichero.
# Las correspondencias nombre real → inventado y la lista de rastros NO viven aquí (este repo es público, y
# decirlas es deshacer la anonimización — auditoría de Seguridad, 25-sep): private/demo_publico.json del repo
# privado del estudio. Sin ese fichero, --publico no se puede construir.
def _privado():
    ruta = os.path.join(AGENCIA, 'private', 'demo_publico.json')
    if not os.path.isfile(ruta):
        return None
    return json.load(open(ruta, encoding='utf-8'))


_PRIV = _privado()
REEMPLAZOS_PUBLICO = [tuple(x) for x in (_PRIV or {}).get('reemplazos', [])]
# «Lawang» suelto va al final y con cuidado: dentro de un identificador (pintaLawang, window.Lawang) un
# reemplazo con espacio rompe el JavaScript (24-sep: «Unexpected identifier 'Demo'» en todas las pantallas).
# Pegado a letra, dígito, $, punto, paréntesis, corchete o = → identificador → «Axw»; si no, es texto visible.
LAWANG_SUELTO = re.compile(r'Lawang')


def cambia_lawang(t):
    def uno(m):
        a = t[m.start() - 1] if m.start() else ''
        b = t[m.end()] if m.end() < len(t) else ''
        if re.match(r'[\w$.]', a) or re.match(r'[\w$.(\[=]', b):
            return 'Axw'
        return 'AxisWorks Demo'
    return LAWANG_SUELTO.sub(uno, t)
# Lo que no puede quedar en la versión pública. `timon` sin letra delante: «Multimoneda» no es un rastro.
RASTRO = re.compile((_PRIV or {}).get('rastro', r'(?!)'), re.I)
EXT_TEXTO = ('.html', '.js', '.css', '.json', '.svg')
EXT_OK = EXT_TEXTO + ('.woff', '.woff2', '.ttf', '.otf', '.png', '.jpg', '.jpeg', '.webp', '.gif', '.ico')
REF_RE = re.compile(r'''["'(=]\s*(/(?:contracts|intranet|assets|media|fonts)/[^"'()\s?#<>]+)''')


def aborta(msg):
    print('ABORTA: ' + msg)
    sys.exit(1)


def comprueba_salida():
    d = os.path.normcase(os.path.realpath(DIST))
    if not d.endswith(os.path.normcase(os.path.join('AxisWorks', 'comercial', 'demo-erp', 'dist'))):
        aborta('la salida no es comercial/demo-erp/dist: ' + d)
    if any(os.path.normcase(os.path.realpath(x)) in d for x in (LAWANG, lawang_fijado.almacen())):
        aborta('la salida cae dentro de proyectos/Lawang (o de la caché del sha fijado)')
    r = subprocess.run(['git', 'check-ignore', '-q', os.path.join(DIST, 'x.html')], cwd=AQUI)
    if r.returncode != 0:
        aborta('dist/ no está en .gitignore del repo AxisWorks: el webhook lo publicaría')


def rel(p):
    return '/' + os.path.relpath(p, DIST).replace(os.sep, '/')


def se_copia(src_abs):
    """¿Copia el build este fichero de Lawang? Extensión permitida y fuera de PROHIBIDO. Lo usan copia() y el aviso del gate de push
    de Lawang (lawang_que_lee_el_build): una sola regla."""
    return src_abs.lower().endswith(EXT_OK) and not PROHIBIDO.search('/' + os.path.relpath(src_abs, LAWANG).replace(os.sep, '/'))


def copia(src_abs, dst_abs):
    if not se_copia(src_abs):
        return False
    os.makedirs(os.path.dirname(dst_abs), exist_ok=True)
    shutil.copy2(src_abs, dst_abs)
    return True


def fuentes_v4():
    """Los ficheros de intranet/v4 de Lawang que recorre copia_v4() (sin FUERA_V4 ni carpetas «_»). También los lee el aviso del gate."""
    base = os.path.join(LAWANG, 'intranet', 'v4')
    for raiz, dirs, fichs in os.walk(base):
        rel_raiz = os.path.relpath(raiz, base)
        if rel_raiz == '.':
            dirs[:] = [d for d in dirs if d not in FUERA_V4]
        dirs[:] = [d for d in dirs if not d.startswith('_')]
        for f in fichs:
            yield os.path.join(raiz, f)


def copia_v4():
    base = os.path.join(LAWANG, 'intranet', 'v4')
    for s in fuentes_v4():
        copia(s, os.path.join(DIST, 'intranet', 'v4', os.path.relpath(s, base)))
    copia(os.path.join(LAWANG, 'favicon.png'), os.path.join(DIST, 'favicon.png'))
    # El CRM de leads (v3) está en el menú de la v4.
    for f in ('index.html', 'leads.css', 'leads.js'):
        copia(os.path.join(LAWANG, 'intranet', 'leads', f), os.path.join(DIST, 'intranet', 'leads', f))


# Contadores que dicen «0» (15-oct-2026, Calidad, encargo de agencia-c0): cuenta() de motion.js escribía «0» en el TEXTO de cada contador
# [data-lw^="k-"] y lo subía con requestAnimationFrame; hasta el primer fotograma —y para siempre con la pestaña oculta, donde rAF no corre—
# Usuarios decía «0 activos» con 2 en la lista (Experiencia, bbm, 14-oct). Arreglado en Lawang (8297615bb, afinado en 671a23edf): el dato se queda siempre en el
# texto y la cifra que sube es una capa aria-hidden encima; sin animación si la pestaña está oculta. El fijado (lawang.json) es anterior, así
# que el bloque nuevo llega tal cual, cortado del motion.js de Lawang (motion_cuenta_lawang.js), y MOTION_V de nav.js se recalcula como lo
# hace Lawang (8 primeros del sha1 del fichero con LF) para que ningún navegador siga con el viejo de caché.
# El portal de clientes (solo la demo: las instancias no llevan /portal/) tenía el mismo fallo con el importe en su propio cuenta()
# (portal/motion.js): mismo arreglo en Lawang (ee3d296a8, afinado en 671a23edf), que llega igual con motion_cuenta_portal_lawang.js y motion.js?v=20261015.
# QUITAR (constantes, funciones, sus llamadas en main() y los dos motion_cuenta_*.js) cuando el fijado pase de Lawang 671a23edf: el bloque
# viejo ya no estará y esto para el build a propósito. Prueba: test_motion_cifra.py.
# (fichero en dist/, ancla de inicio, ancla de fin, sha1 del bloque viejo del fijado con LF, bloque nuevo)
MOTION_CUENTA = ('intranet/v4/assets/motion.js', '  var NUM = ', '  function entra() {',
                 'e26238648f7d4c9629bd0f9353b2bb3f11ab3b86', os.path.join(AQUI, 'motion_cuenta_lawang.js'))
MOTION_CUENTA_PORTAL = ('portal/motion.js', '  /* El dinero que se recorre', '  /* Entrada de una pantalla',
                        'c5abfcfc03ecdb53c974aed69286df95500a44de', os.path.join(AQUI, 'motion_cuenta_portal_lawang.js'))
PORTAL_MOTION_V = ('/portal/motion.js?v=20261009', '/portal/motion.js?v=20261015')


def _motion_v(texto):
    return hashlib.sha1(texto.replace('\r\n', '\n').encode('utf-8')).hexdigest()[:8]


def cifra_cuenta_motion(texto, cual=MOTION_CUENTA):
    """motion.js del fijado → con el cuenta() arreglado de Lawang. Para si el bloque viejo no es el medido el 15-oct."""
    donde, ini, fin, sha, fuente = cual
    a, b = texto.find(ini), texto.find(fin)
    if a < 0 or b < a:
        aborta('%s: no encuentro cuenta() (%r … %r)%s' % (donde, ini, fin, quien_cambio_lawang(donde)))
    viejo = texto[a:b]
    if hashlib.sha1(viejo.replace('\r\n', '\n').encode('utf-8')).hexdigest() != sha:
        aborta('%s: cuenta() del fijado ya no es la medida el 15-oct; si el fijado ya trae el arreglo, quita cifra_cuenta() y '
               'motion_cuenta_*.js%s' % (donde, quien_cambio_lawang(donde)))
    nuevo = open(fuente, encoding='utf-8', newline='').read().replace('\r\n', '\n')
    if '\r\n' in viejo:
        nuevo = nuevo.replace('\n', '\r\n')
    return texto[:a] + nuevo + texto[b:]


def cifra_cuenta_portal():
    """El cuenta() arreglado en dist/portal/motion.js y su ?v= en dist/portal/index.html (solo la demo, tras portal_lawang())."""
    m = os.path.join(DIST, 'portal', 'motion.js')
    texto = cifra_cuenta_motion(open(m, encoding='utf-8', newline='').read(), MOTION_CUENTA_PORTAL)   # leer ANTES de abrir para escribir
    open(m, 'w', encoding='utf-8', newline='').write(texto)
    p = os.path.join(DIST, 'portal', 'index.html')
    texto = _una_vez(open(p, encoding='utf-8', newline='').read(), *PORTAL_MOTION_V, 'portal/index.html')
    open(p, 'w', encoding='utf-8', newline='').write(texto)


def cifra_cuenta():
    """Aplica cifra_cuenta_motion() al motion.js de dist/ y sube MOTION_V en nav.js (demo e instancias: los dos pasan por copia_v4())."""
    assets = os.path.join(DIST, 'intranet', 'v4', 'assets')
    m, n = os.path.join(assets, 'motion.js'), os.path.join(assets, 'nav.js')
    texto = cifra_cuenta_motion(open(m, encoding='utf-8', newline='').read())
    open(m, 'w', encoding='utf-8', newline='').write(texto)
    nav = open(n, encoding='utf-8', newline='').read()
    v = re.findall(r"var MOTION_V = '([0-9a-f]{8})';", nav)
    if len(v) != 1:
        aborta('nav.js: esperaba una sola `var MOTION_V = \'…\';` y hay %d%s' % (len(v), quien_cambio_lawang('nav.js')))
    nav = _una_vez(nav, "var MOTION_V = '%s';" % v[0], "var MOTION_V = '%s';" % _motion_v(texto), 'nav.js')
    open(n, 'w', encoding='utf-8', newline='').write(nav)


def cierra_referencias():
    """Sigue las rutas absolutas locales de lo copiado hasta que no aparezca nada nuevo."""
    vistos, faltan = set(), set()
    for _ in range(6):
        nuevos = 0
        for raiz, _d, fichs in os.walk(DIST):
            for f in fichs:
                if not f.endswith(EXT_TEXTO):
                    continue
                txt = open(os.path.join(raiz, f), encoding='utf-8', errors='replace').read()
                for m in REF_RE.finditer(txt):
                    ruta = m.group(1)
                    if ruta in vistos:
                        continue
                    vistos.add(ruta)
                    src = os.path.join(LAWANG, ruta.lstrip('/').replace('/', os.sep))
                    dst = os.path.join(DIST, ruta.lstrip('/').replace('/', os.sep))
                    if os.path.isfile(src) and not os.path.exists(dst):
                        if copia(src, dst):
                            nuevos += 1
                    elif not os.path.exists(src) and '.' in os.path.basename(ruta):
                        faltan.add(ruta)
        if not nuevos:
            break
    return faltan


def tokens_solo_etiquetas():
    """`/contracts/tokens.json` de Lawang trae, además de las etiquetas de los marcadores, lo que es DE LAWANG: los nombres de sus
    proyectos y sociedades (parcelaPorProyecto, resortPorProyecto, projectDefaults, las listas de opciones de cada campo). Lo único
    que una instancia lee de él es `sections[].fields[]` → clave + etiqueta es/en (textos-contrato.js, TC.etiquetasDeTokens). Por eso
    lo que se publica es ESE extracto y nada más: ni defaults, ni opciones, ni el idioma `id` (no se lee, y una palabra corriente
    del indonesio, «pengembalian», casa con un nombre del filtro de rastro). El filtro de rastro no se toca ni se le añade excepción:
    lo que queda en el fichero tiene que pasarlo (9-oct-2026, bloqueaba la publicación completa de las instancias)."""
    dst = os.path.join(DIST, 'contracts', 'tokens.json')
    if not os.path.isfile(dst):
        return
    fuente = json.load(open(os.path.join(LAWANG, 'contracts', 'tokens.json'), encoding='utf-8'))
    secciones = []
    for s in fuente.get('sections') or []:
        campos = []
        for f in s.get('fields') or []:
            etq = f[1] if len(f) > 1 and isinstance(f[1], dict) else {}
            campos.append([f[0], {k: etq[k] for k in ('es', 'en') if k in etq}])
        secciones.append({'id': s.get('id'), 'fields': campos})
    if not secciones:
        aborta('contracts/tokens.json de Lawang ya no trae sections[].fields[]: ¿cambió de forma? textos-contrato.js se quedaría sin etiquetas')
    open(dst, 'w', encoding='utf-8', newline='\n').write(json.dumps({'sections': secciones}, ensure_ascii=False, separators=(',', ':')))


# ── Raíz limpia: sin /intranet/ ni v4 en la barra (encargos/20260930_erp_urls_limpias.md, 1-oct-2026) ──────────────
# Porqué: el ERP de una instancia (y la demo) se abría en /intranet/v4/home/, nombres de Lawang que el cliente no
# eligió. El front se COPIA de Lawang con esa estructura y Lawang no se toca (independiente, en producción): este paso
# del build lo reubica en el bundle, UNA vez y para los dos caminos (demo e instancia), de modo que lo que se prueba en
# demo. es lo mismo que luego se publica en bbm. y app.
#     /intranet/ (puerta + panel clásico) → /          /intranet/v4/<x>/ → /<x>/         /intranet/v4/assets/ → /assets/
#     /intranet/{leads,obra,…}/ (v3 con llamador) → /clasico/<x>/          /intranet/v4/entrar/ (stub) → se elimina
#     /contracts/, /portal/ y /entrar/ no se mueven.
# Reglas de método, cada una con su porqué:
#   · Las rutas viejas se reescriben por TOKEN (cada /intranet/… con su camino, en sus tres escrituras: `/`, `\/` de una
#     regex de JS y `%2F` de un `?next=`), nunca con un replace global: `/intranet/v4/` suelto significa «¿estoy en la v4?»
#     en nav.js y con un replace pasaría a ser `/`, siempre cierto (el menú aparecería en la puerta y el login).
#   · Los sitios donde el código DECIDE por la ruta (nav.js, mascota.js) se sustituyen a mano, con el número exacto de
#     veces esperado: si Lawang cambia su forma, el build para en vez de dejar la pantalla sin menú sin un solo error.
#   · Las relativas (`../assets/…`) se resuelven contra la ubicación VIEJA y se comprueba que siguen apuntando a lo mismo
#     desde la NUEVA; si no, se pasan a absolutas. Un grep «intranet = 0» da verde con el CSS caído (lo que paró esto en
#     Lawang), así que enlaces_rotos() también resuelve desde la ubicación nueva.
#   · Al final, lo que quede con `intranet/` o `/v4/` aborta el build.
CLASICAS = ('leads', 'obra', 'creatividades', 'dossier', 'facturas', 'vencimientos')
# Carpetas de la raíz que una pantalla v4 no puede ocupar (ni la v4 de mañana: un choque aborta el build).
RAIZ_RESERVADA = frozenset(('contracts', 'portal', 'entrar', 'assets', 'clasico', 'panel', 'demo', 'media', 'fonts'))
_SEP = r'(?:\\/|/|%2[Ff])'
# `pre` (la barra de delante, en cualquiera de sus tres escrituras) o, sin barra, que no haya una letra/punto/guion pegado
# delante («myintranet», «x.intranet»); con `%2F` delante la letra pegada es la F de la propia barra.
RUTA_INTRANET = re.compile(r'(?:(?P<pre>' + _SEP + r')|(?<![\w.\-]))intranet(?![\w.\-])(?P<cola>(?:' + _SEP + r'[A-Za-z0-9_.\-]*)*)')
_PARTE = re.compile(_SEP)
RESTO_RAIZ = re.compile(r'(?<![\w.\-])intranet' + _SEP + r'|' + _SEP + r'v4' + _SEP)
# «¿esta página NO es de la v4?»: lo que nav.js y mascota.js preguntaban con indexOf('/intranet/v4/') === -1. Ahora la v4
# es toda la raíz salvo la puerta (/), la parte clásica, el login, el portal, el panel y los assets compartidos.
NO_ES_V4 = r"/^(?:\/|\/index\.html|\/(?:clasico|entrar|portal|panel|contracts)\/.*)$/.test(location.pathname)"
_IDX_V4 = r"""location\.pathname\.indexOf\(\s*(['"])/intranet/v4/\1\s*\)\s*%s\s*-1"""
A_MANO = (
    # (fichero en su sitio NUEVO, regex, reemplazo, mínimo de veces). Mínimo y no exacto: nav.js ganó una comparación
    # (`!== -1`, la mascota y las novedades) entre dos versiones de Lawang; lo que cuenta es que el hueco siga existiendo.
    # Una comparación NUEVA que no case aquí la caza TRAMPA_RUTA, no el número.
    ('/assets/nav.js', re.compile(_IDX_V4 % '==='), NO_ES_V4, 3),
    ('/assets/nav.js', re.compile(_IDX_V4 % '!=='), '!' + NO_ES_V4, 1),
    ('/assets/mascota.js', re.compile(_IDX_V4 % '==='), NO_ES_V4, 1),
    ('/assets/novedades.js', re.compile(_IDX_V4 % '==='), NO_ES_V4, 1),   # el fichero es de 30-sep: puede no estar (Lawang fijado a un commit viejo)
)
A_MANO_OPCIONALES = ('/assets/novedades.js',)
# Cualquier otra pregunta de código por la RAÍZ vieja (indexOf/startsWith/includes('/intranet/') o ('/intranet/v4/')) que
# sobreviva a A_MANO se traduciría con el replace de tokens a `indexOf('/')` y diría siempre que sí: aborta y se decide a
# mano. (Preguntar por una pantalla concreta, `indexOf('/intranet/v4/reservas')`, sí se traduce bien: `/reservas`.)
TRAMPA_RUTA = re.compile(r'''(?:indexOf|lastIndexOf|startsWith|includes)\(\s*(["'`])[^"'`]*intranet(?:/v4)?/?\1''')


def _segs_nuevos(s):
    """Segmentos que siguen a `intranet` → segmentos que siguen a la raíz. [''] = la propia raíz (o una carpeta con barra
    final)."""
    if not s or s == ['']:
        return ['']
    if s[0] == 'v4':
        r = s[1:]
        return [''] if (not r or r in ([''], ['index.html'])) else r
    if s == ['index.html']:
        return ['']
    if s[0] in CLASICAS:
        return ['clasico'] + s
    return s   # una herramienta v3 que ya vive en la v4 (/intranet/operaciones/ → /operaciones/)


def mapea_url(url):
    """Ruta absoluta del bundle viejo → la nueva. Lo que no es /intranet no cambia."""
    if not (url == '/intranet' or url.startswith('/intranet/')):
        return url
    cuerpo, resto = re.match(r'([^?#]*)(.*)', url, re.S).groups()
    partes = cuerpo[len('/intranet'):].split('/')[1:]
    return '/' + '/'.join(_segs_nuevos(partes)) + resto


def _reescribe(m, pelados):
    pre, cola = m.group('pre'), m.group('cola') or ''
    if pre is None and not cola:
        return m.group(0)                                      # la palabra «intranet» en un texto
    if pre is not None and not cola:
        pelados.append(m.group(0))                             # `/intranet` a pelo: podría ser un startsWith; a mano
        return m.group(0)
    partes = _PARTE.split(cola)[1:]
    estilo = pre or _PARTE.match(cola).group(0)
    nuevo = '/'.join(_segs_nuevos(partes)).replace('/', estilo)
    return (pre + nuevo) if pre is not None else nuevo        # sin barra delante: mensajes («falta intranet/v4/assets/…»)


def _resuelve(base, ref):
    """Ruta absoluta a la que apunta `ref` (relativa) desde `base`; None si no es una ruta de este sitio."""
    if re.match(r'^(?:[a-zA-Z][a-zA-Z0-9+.\-]*:|//|#|\?|$)', ref):
        return None
    ruta = re.match(r'[^?#]*', ref).group(0)
    if not ruta:
        return None
    if not ruta.startswith('/'):
        ruta = posixpath.join(posixpath.dirname(base), ruta)
    res = posixpath.normpath(ruta)
    return res + '/' if ruta.endswith('/') and not res.endswith('/') else res


def _relativas(t, url_vieja, url_nueva):
    """Cada ruta RELATIVA de un .html/.css (src, href, action, url()) debe seguir apuntando a lo mismo desde la ubicación
    nueva; si no, se escribe absoluta. Las absolutas ya las cambió el paso de tokens."""
    def corrige(m):
        v = m.group('v')
        if v.startswith('/') or '${' in v or not v.strip():
            return m.group(0)
        viejo = _resuelve(url_vieja, v)
        if viejo is None:
            return m.group(0)
        destino = mapea_url(viejo)
        if _resuelve(url_nueva, v) == destino:
            return m.group(0)
        suf = re.search(r'[?#].*', v)
        return m.group(0).replace(v, destino + (suf.group(0) if suf else ''), 1)
    t = re.sub(r'''(?P<a>\b(?:src|href|action|poster)\s*=\s*)(?P<q>["'])(?P<v>[^"']*)(?P=q)''', corrige, t, flags=re.I)
    return re.sub(r'''(?P<a>url\(\s*)(?P<q>["']?)(?P<v>[^)"']+)(?P=q)(?P<c>\s*\))''', corrige, t, flags=re.I)


BRAND_LAWANG = re.compile(r'url\(\s*brand/(?:tiki-totem|lawang-logo-v3|lawang-logo-v3-dark)\.png\s*\)')


def sin_marca_lawang(dist):
    """AXW-141 (1-oct-2026): `lawang.css` y `brand.css` declaran tres imágenes de marca de Lawang (`brand/tiki-totem.png`,
    `lawang-logo-v3.png`, `lawang-logo-v3-dark.png`) que ningún bundle del ERP lleva (no son del cliente): cada página daba
    3 × 404 en la red. Se dejan en `none`: la variable sigue existiendo y la imagen ya no se pedía con éxito antes, así que
    no cambia nada visible. Solo estas tres: cualquier otra `url()` rota la caza `enlaces_rotos()`."""
    tocados = 0
    for nombre in ('lawang.css', 'brand.css'):
        p = os.path.join(dist, 'contracts', 'assets', nombre)
        if not os.path.isfile(p):
            continue
        t = open(p, encoding='utf-8', newline='').read()
        t2, n = BRAND_LAWANG.subn('none', t)
        if n:
            open(p, 'w', encoding='utf-8', newline='').write(t2)
            tocados += n
    return tocados


def reraiz(dist):
    """Reubica el front copiado de Lawang en `dist` al mapa de URLs limpio y reescribe todo lo que lo nombra. Lo llaman la
    demo (main) y la instancia (instancia()): UN solo paso. Devuelve los nombres de pantalla v4 (carpetas de la raíz)."""
    intranet, v4 = os.path.join(dist, 'intranet'), os.path.join(dist, 'intranet', 'v4')
    if not os.path.isdir(v4):
        aborta('reraiz: no hay intranet/v4 en el bundle (¿se llamó dos veces?)')
    pantallas = sorted(d for d in os.listdir(v4) if os.path.isdir(os.path.join(v4, d)) and d not in ('assets', 'entrar'))
    for d in os.listdir(intranet):
        p = os.path.join(intranet, d)
        if d != 'v4' and not ((os.path.isdir(p) and d in CLASICAS) or (os.path.isfile(p) and d == 'index.html')):
            aborta('reraiz: intranet/%s no está en el mapa (carpeta clásica nueva: decidir su sitio en CLASICAS)' % d)
    choques = sorted({n for n in pantallas if n in RAIZ_RESERVADA}
                     | {n for n in pantallas + ['assets', 'clasico'] if os.path.exists(os.path.join(dist, n))})
    if choques or (os.path.isfile(os.path.join(intranet, 'index.html')) and os.path.exists(os.path.join(dist, 'index.html'))):
        aborta('reraiz: la raíz ya tiene %s (una pantalla v4 choca con la raíz del bundle)' % (', '.join(choques) or 'index.html'))
    movidos = {}                                              # url nueva → url vieja
    for raiz, _d, fichs in os.walk(intranet):
        for f in fichs:
            vieja = '/' + os.path.relpath(os.path.join(raiz, f), dist).replace(os.sep, '/')
            if vieja.startswith('/intranet/v4/entrar/'):
                continue                                      # el stub que redirigía al login: ahora /entrar/ (legado en .htaccess)
            nueva = mapea_url(vieja)
            movidos[nueva + 'index.html' if nueva.endswith('/') else nueva] = vieja
    for nueva, vieja in movidos.items():
        destino = os.path.join(dist, *nueva.strip('/').split('/'))
        os.makedirs(os.path.dirname(destino), exist_ok=True)
        os.replace(os.path.join(dist, *vieja.strip('/').split('/')), destino)
    shutil.rmtree(intranet)
    v4_suelto = re.compile(r'(?P<pre>\\/|/)v4(?:\\/|/)(?=(?:assets|' + '|'.join(re.escape(n) for n in pantallas)
                           + r')(?:\\/|/|["\'`?#\s)<]|$))')
    veces, pelados, trampas, vistos, cambiados = {}, [], [], set(), 0
    for raiz, _d, fichs in os.walk(dist):
        for f in fichs:
            if not f.endswith(EXT_TEXTO):
                continue
            p = os.path.join(raiz, f)
            url_n = '/' + os.path.relpath(p, dist).replace(os.sep, '/')
            url_v = movidos.get(url_n, url_n)
            vistos.add(url_n)
            t = open(p, encoding='utf-8', errors='replace').read()
            t2 = t
            for i, (fichero, rx, nuevo, _n) in enumerate(A_MANO):
                if url_n == fichero:
                    t2, n = rx.subn(lambda _m, nuevo=nuevo: nuevo, t2)
                    veces[i] = veces.get(i, 0) + n
            for m in TRAMPA_RUTA.finditer(t2):
                trampas.append('%s: %s' % (url_n, m.group(0)[:100]))
            t2 = RUTA_INTRANET.sub(lambda m: _reescribe(m, pelados), t2)
            t2 = v4_suelto.sub(lambda m: m.group('pre'), t2)
            if f.endswith(('.html', '.css')):
                t2 = _relativas(t2, url_v, url_n)
            if t2 != t:
                open(p, 'w', encoding='utf-8', newline='').write(t2)
                cambiados += 1
    malos = ['%s: se esperaban al menos %d y hay %d (¿ha cambiado el código de Lawang? revisa A_MANO)' % (f, n, veces.get(i, 0))
             for i, (f, _rx, _nu, n) in enumerate(A_MANO)
             if veces.get(i, 0) < n and (f in vistos or f not in A_MANO_OPCIONALES)]
    malos += ['el código decide por una ruta con «intranet» y no está en A_MANO: ' + x for x in trampas[:8]]
    malos += ['`/intranet` a pelo (¿un startsWith?): ' + x for x in pelados[:5]]
    for raiz, _d, fichs in os.walk(dist):
        for f in fichs:
            if f.endswith(EXT_TEXTO):
                p = os.path.join(raiz, f)
                for m in RESTO_RAIZ.finditer(open(p, encoding='utf-8', errors='replace').read()):
                    malos.append('resto en %s: %s' % (rel(p), m.group(0)))
    if malos:
        aborta('reraiz no ha dejado el bundle limpio:\n  ' + '\n  '.join(malos[:30]))
    print('reraiz: %d pantallas v4 a la raíz, %d clásicas a /clasico/, %d ficheros reescritos' % (len(pantallas), sum(
        1 for n in CLASICAS if os.path.isdir(os.path.join(dist, 'clasico', n))), cambiados))
    return pantallas


def legado_htaccess(dist):
    """Bloque de .htaccess con el legado: lo de antes no muere (enlaces guardados, correos ya enviados, `?next=`).
    302 y no 301 mientras el mapa no esté verificado en producción (un 301 se guarda para siempre en el navegador);
    pasarán a 301 cuando lo esté. Solo GET/HEAD. Patrones CERRADOS: el primer segmento del destino sale de una lista
    blanca (las carpetas que el bundle sirve) y el resto va detrás de él, así que ninguna ruta de entrada puede producir
    un destino fuera de este dominio (`/intranet//evil.com`, `/%2f%2fevil.com` o `/%5cevil.com` no casan o acaban
    bajo `/<pantalla>/`)."""
    pantallas = sorted(d for d in os.listdir(dist) if os.path.isdir(os.path.join(dist, d)) and d not in RAIZ_RESERVADA)
    if not pantallas:
        aborta('legado_htaccess: no hay pantallas en ' + dist)
    lista = '|'.join(re.escape(n) for n in pantallas + ['assets'])
    lista_v3 = '|'.join(re.escape(n) for n in pantallas if n not in CLASICAS)
    # una clásica que en este bundle solo trae assets (facturas, vencimientos) no tiene pantalla: su carpeta a pelo va a la v4
    sin_pagina = [c for c in CLASICAS if c in pantallas and not os.path.isfile(os.path.join(dist, 'clasico', c, 'index.html'))]
    get = '  RewriteCond %{REQUEST_METHOD} ^(GET|HEAD)$\n'
    reglas = [
        (r'^intranet(?:/index\.html)?/?$', '/'),
        (r'^intranet/v4(?:/index\.html)?/?$', '/'),
        (r'^intranet/v4/entrar(?:/.*)?$', '/entrar/'),
        ('^intranet/v4/(' + lista + ')(?:/(.*))?$', '/$1/$2'),
    ]
    if sin_pagina:
        reglas.append(('^intranet/(' + '|'.join(sin_pagina) + r')/?(?:index\.html)?$', '/$1/'))
    reglas += [
        ('^intranet/(' + '|'.join(CLASICAS) + ')(?:/(.*))?$', '/clasico/$1/$2'),
        # herramientas v3 que hoy son pantallas v4 con el mismo nombre (/intranet/operaciones/ → /operaciones/): la base guarda
        # enlaces así (avisos) y cabecera.js ya los traducía al pintar. Detrás de las clásicas, que comparten algún nombre.
        ('^intranet/(' + lista_v3 + ')(?:/(.*))?$', '/$1/$2'),
    ]
    return ('# Legado: lo de antes no muere. 302 hasta verificar el mapa en producción; luego 301.\n'
            '<IfModule mod_rewrite.c>\n  RewriteEngine On\n'
            + ''.join(get + '  RewriteRule %s %s [R=302,L,QSA]\n' % (p, d) for p, d in reglas) + '</IfModule>\n')


def escribe_instancia(ficha):
    """ERP F3 (25-sep-2026): la ficha de la instancia (/contracts/assets/instancia.js) la escribe el build con los datos
    del destino, en vez de copiar la de Lawang y confiar en los reemplazos de texto. El núcleo (guard.js y la suite) lee
    host, clave y marca de aquí."""
    # firma_correo: con qué nombre firma el correo de facturas — la MARCA comercial, nunca la sociedad emisora (owner,
    # 8-sep-2026; se llamaba razon_social hasta el 26-sep y eso invitaba a poner la sociedad: Legal, consulta de deploy).
    campos = ('sb_url', 'sb_key', 'marca', 'cabecera', 'subcabecera', 'titulo', 'firma_correo')
    faltan = [k for k in campos if not ficha.get(k)]
    if faltan:
        aborta('ficha de instancia incompleta: ' + ', '.join(faltan))
    # Opcionales: `inicio` = adónde lleva el acceso tras entrar (26-sep-2026: el estándar del producto es la Home de
    # la v4; sin él, el panel clásico). Lawang no lo lleva y sigue con su portada de siempre.
    campos = campos + tuple(k for k in ('inicio',) if ficha.get(k))
    # F3 lote 3 (27-sep-2026): lo que el código de Lawang decidía con NOMBRES de proyecto sale de la ficha. Van
    # SIEMPRE (vacíos si la instancia no los declara): sin entrada no hay plano ni campos de fase, y el valor nunca
    # puede caer en los proyectos de Lawang. `masterplans` = {proyectos.nombre: ruta del .json del masterplan};
    # `proyectos_con_fases` = [proyectos.nombre] cuyas unidades llevan fase/zona de masterplan.
    ficha = dict(ficha)
    mp = ficha.get('masterplans') or {}
    fases = ficha.get('proyectos_con_fases') or []
    if not isinstance(mp, dict) or not all(isinstance(k, str) and k and isinstance(v, str) and v.startswith('/')
                                           for k, v in mp.items()):
        aborta('masterplans de la ficha: {nombre de proyecto: "/ruta/del/masterplan.json"}')
    if not isinstance(fases, list) or not all(isinstance(x, str) and x for x in fases):
        aborta('proyectos_con_fases de la ficha: lista de nombres de proyecto')
    ficha['masterplans'], ficha['proyectos_con_fases'] = mp, fases
    campos = campos + ('masterplans', 'proyectos_con_fases')

    def valor(v):   # lo anidado también congelado: la ficha es de solo lectura entera, no solo su primer nivel
        j = json.dumps(v, ensure_ascii=False)
        return 'Object.freeze(%s)' % j if isinstance(v, (dict, list)) else j
    cuerpo = ',\n'.join('    %s: %s' % (k, valor(ficha[k])) for k in campos)
    ruta = os.path.join(DIST, 'contracts', 'assets', 'instancia.js')
    os.makedirs(os.path.dirname(ruta), exist_ok=True)
    open(ruta, 'w', encoding='utf-8', newline='\n').write(
        '/* GENERADO por AxisWorks/comercial/demo-erp/build.py — ficha de esta instancia del ERP. No editar. */\n'
        '(function () {\n  var ficha = Object.freeze({\n' + cuerpo + '\n  });\n'
        "  try { Object.defineProperty(window, 'LW_INSTANCIA', { value: ficha, writable: false, configurable: false, enumerable: true }); }\n"
        '  catch (e) {}\n})();\n')


def guard_demo():
    doble = open(DOBLE_QA, encoding='utf-8').read()
    datos = open(os.path.join(AQUI, 'demo_datos.js'), encoding='utf-8').read()
    cambios = [
        # El rol de QA existía para no confundirse con el guard real; aquí no hay guard real.
        ("rol: 'qa_super_admin', activo: true, nombre: 'QA Tester'", "rol: 'super_admin', activo: true, nombre: 'Clara Montesinos'"),
        # La siembra, en una función (se iza): la llaman `chainable` y también el envoltorio de `rpc`, porque la Home
        # pide sus cifras por lwDatos ANTES de cualquier `.from()` (28-sep-2026, B10a).
        ("function chainable(table) {", "function __lwDemoSiembra() { if (!window.__LW_DEMO_SEMBRADO) { window.__LW_DEMO_SEMBRADO = true; "
                                        "window.LW_DEMO_SIEMBRA(FIXTURES, { fila: fila, hoy: hoy, FICHA: FICHA_QA, USUARIOS: USUARIOS_QA, VENTAS: VENTAS_QA }); "
                                        "window.LW_DEMO_LIMPIA(FIXTURES); window.LW_DEMO_REPITE(FIXTURES); } }\n"
                                        "  function chainable(table) { __lwDemoSiembra();"),
        # Escrituras (11-oct, demo-pA): las aplica Y las anota demo_datos.js (diario de la pestaña, se repite tras la
        # siembra en cada página). Los filtros viajan con la escritura: el diario la repite sobre las filas que casen.
        ("if (obj._op === 'insert' || obj._op === 'update' || obj._op === 'upsert') {",
         "if (obj._op) { return window.LW_DEMO_TABLA(FIXTURES, table, obj._op, obj._val, filtros, !!obj._single); }\n"
         "      if (false) {"),
        # Filtros que el doble de QA deja pasar a propósito (su cabecera lo dice): en
        # una demo se VEN — «0 vencimientos en 30 días» con hitos la semana que viene.
        # Los filtros los evalúa demo_datos.js (11-oct, demo-pA): or/not/contains/overlaps/match/filter FILTRAN de
        # verdad. Antes eran no-op, y «Borrar operación» (.or('id.eq.X,contrato_padre_id.eq.X')) contaba la tabla entera.
        # Uno que no sabe evaluar: en lectura deja pasar (como el doble de QA); en escritura, LW_DEMO_TABLA falla.
        ("  function coincide(row, campo, op, val) {",
         "  function coincide(row, campo, op, val) { return window.LW_DEMO_COINCIDE(row, campo, op, val);"),
        ("    ['gte', 'lte', 'not', 'or', 'order', 'limit', 'contains', 'overlaps', 'range', 'match']",
         "    obj.gte = function (c, v) { filtros.push(['gte', c, v]); return obj; };\n"
         "    obj.lte = function (c, v) { filtros.push(['lte', c, v]); return obj; };\n"
         "    obj.lt = function (c, v) { filtros.push(['lt', c, v]); return obj; };\n"
         "    obj.like = function (c, v) { filtros.push(['like', c, v]); return obj; };\n"
         "    obj.or = function (s, o) { if (!(o && (o.foreignTable || o.referencedTable))) filtros.push(['or', s, null]); return obj; };\n"
         "    obj.not = function (c, op, v) { filtros.push(['not', c, [op, v]]); return obj; };\n"
         "    obj.contains = function (c, v) { filtros.push(['contains', c, v]); return obj; };\n"
         "    obj.overlaps = function (c, v) { filtros.push(['overlaps', c, v]); return obj; };\n"
         "    obj.match = function (m) { Object.keys(m || {}).forEach(function (k) { filtros.push(['eq', k, m[k]]); }); return obj; };\n"
         "    obj.filter = function (c, op, v) { filtros.push(['filter', c, [op, v]]); return obj; };\n"
         "    obj.textSearch = function (c, v) { filtros.push(['desconocido', c, v]); return obj; };\n"
         "    obj.range = function (a, b, o) { if (!(o && (o.foreignTable || o.referencedTable))) obj._rango = [a, b]; return obj; };\n"
         "    obj.order = function (c, o) { if (!(o && (o.foreignTable || o.referencedTable))) (obj._ord = obj._ord || []).push([c, !(o && o.ascending === false)]); return obj; };\n"
         "    obj.limit = function (n, o) { if (!(o && (o.foreignTable || o.referencedTable))) obj._lim = n; return obj; };\n"
         "    ['abortSignal', 'returns', 'csv', 'explain']"),
        ("      var datos = Array.isArray(base.data) ? filtradas : base.data;",
         "      var datos = Array.isArray(base.data) ? filtradas : base.data;\n"
         "      if (Array.isArray(datos) && obj._ord) { datos = datos.slice().sort(function (a, b) { for (var i = 0; i < obj._ord.length; i++) { var c = obj._ord[i][0], x = a[c], y = b[c]; if (x === y) continue; if (x == null) return 1; if (y == null) return -1; return (x < y ? -1 : 1) * (obj._ord[i][1] ? 1 : -1); } return 0; }); }\n"
         "      if (Array.isArray(datos) && obj._rango && !obj._count) datos = datos.slice(obj._rango[0], obj._rango[1] + 1);\n"
         "      if (Array.isArray(datos) && obj._lim != null && !obj._count) datos = datos.slice(0, obj._lim);"),
        # Portadas de la rejilla de Proyectos (createSignedUrls): «about:blank#qa-…» como <img> es un error de consola y
        # un icono roto en directo; en la demo no hay fotos, así que va una tesela neutra (data:, la CSP la admite).
        ("data: (paths || []).map(function (p) { return { path: p, signedUrl: 'about:blank#qa-' + p, error: null }; }),",
         "data: (paths || []).map(function (p) { return { path: p, signedUrl: 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 4 3%22%3E%3Crect width=%224%22 height=%223%22 fill=%22%23e7e5df%22/%3E%3C/svg%3E', error: null }; }),"),
        ("createSignedUrl: function (path) { return Promise.resolve({ data: { signedUrl: 'about:blank#qa-' + path }, error: null }); },",
         # Fotos de obra de muestra (13-oct-2026): demo_datos.js las nombra «…/demo-obra-<escena>.webp» y aquí se sirven con la foto
         # libre de /portal/demo/fotos/ (la misma que enseña el portal), para que Obra en la intranet las vea; el resto, la tesela.
         "createSignedUrl: function (path) { var m = bucket === 'obra' && /[/]demo-obra-([a-z]+)[.]webp$/.exec(String(path)); return Promise.resolve({ data: { signedUrl: m ? '/portal/demo/fotos/obra-' + m[1] + '.webp' : 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 4 3%22%3E%3Crect width=%224%22 height=%223%22 fill=%22%23e7e5df%22/%3E%3C/svg%3E' }, error: null }); },"),
        # Lo mismo para las fotos PÚBLICAS (getPublicUrl: fotos de modelo en /v4/modelos/ y lwFotoUrls): revisor, 28-sep.
        ("getPublicUrl: function (path) { return { data: { publicUrl: 'about:blank#qa-' + path } }; },",
         "getPublicUrl: function (path) { return { data: { publicUrl: 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 4 3%22%3E%3Crect width=%224%22 height=%223%22 fill=%22%23e7e5df%22/%3E%3C/svg%3E' } }; },"),
        # Justificante «subido» (11-oct, demo-pA; Seguridad): se anota solo nombre y tamaño en la pestaña, el contenido no
        # se lee. Lo comprueba el doble de guardar_recibi, como la base mira storage.objects.
        ("          list: function () { return Promise.resolve({ data: [], error: null }); },",
         "          list: function () { return Promise.resolve({ data: [], error: null }); },\n"
         "          uploadToSignedUrl: function (path, token, file) { return window.LW_DEMO_SUBE(FIXTURES, bucket, path, file); },"),
        ("console.warn('[qa-doble] MODO QA activo","console.info('[demo] Demo ERP — made-up data, no real network'); void ('"),
        # Todo el despacho de rpc en UNA función de demo_datos.js (11-oct, demo-pA, revisión previa de Frontend): los
        # guardados devuelven lo que devolvería la base (factura_guarda → {id, numero, total}, guardar_recibi → jsonb),
        # las lecturas *_datos lo mismo, y TODO resultado es encadenable (sb.rpc('compradores_lista').select().order()).
        # Lo que demo_datos.js no conoce sigue por el doble de QA (`siguiente`).
        ("    rpc: function (nombre, args) {\n      console.warn('[qa-doble] rpc bloqueada (no real):', nombre, args);",
         "    rpc: function (nombre, args) {\n"
         "      __lwDemoSiembra();\n"
         "      var self = this;\n"
         "      return window.LW_DEMO_RPC(FIXTURES, nombre, args || {}, function () { return self._rpc(nombre, args); }, chainable);\n"
         "    },\n"
         "    _rpc: function (nombre, args) {"),
    ]
    for viejo, nuevo in cambios:
        if doble.count(viejo) != 1:
            aborta('el doble de QA ha cambiado y no encuentro (1 vez): ' + viejo[:70])
        doble = doble.replace(viejo, nuevo)
    doble = doble.replace("'qa-user-1'", "'d-u-1'").replace('qa@axisworks.test', 'direccion@example.com')
    # La barra de la demo (vuelta a la portada, «Reset demo» y el aviso de datos ficticios) y el asistente de ejemplo viven
    # en /demo/cascara.js (demo_cascara.js, 12-oct-2026): sustituye a la barra «← Modules», que llevaba al configurador de
    # erp. y no a la portada de dos puertas. El pop-up de novedades de la intranet (anuncios internos del cliente para su
    # equipo) no sale en la demo: novedades.js sale solo si encuentra __lwNovedades ya puesto.
    # catalogo.js (fuente única de módulos) → modulos.js (menú y aviso de módulo apagado) → tour.js → cascara.js, en
    # ese orden: un script insertado por JS es asíncrono salvo async=false. Detrás, «New contract» y la firma de ejemplo del
    # paquete B (/flujo/nuevo-contrato.js carga sus otros tres ficheros desde su carpeta). El portal ya lo carga él mismo.
    # En /portal/ (el portal de clientes, otra puerta de la demo) solo la barra: ni el filtro de módulos marcados en la portada
    # (taparía el portal con su aviso o escondería botones por su texto) ni el tour de la intranet; «New contract»/firma la carga
    # la propia página (revisión previa de Frontend #279, 12-oct).
    volver = ("window.__lwNovedades = true;\n"
              "['/demo/catalogo.js','/demo/modulos.js','/demo/tour.js','/demo/cascara.js','/flujo/nuevo-contrato.js'].filter(function(u){"
              "return location.pathname.indexOf('/portal/')!==0||u==='/demo/cascara.js';}).forEach(function(u){var s=document.createElement('script');"
              "s.src=u;s.async=false;(document.head||document.documentElement).appendChild(s);});\n")
    # Sesión real que el presentador pudiera tener en este origen: fuera antes de nada (Seguridad #2).
    limpia_sesion = LIMPIA_SESION + 'window.AXW_PORTADA = %s;\n' % json.dumps(PORTADA_URL)
    # Núcleo del ERP (25-sep): la demo ya enseña la OPERACIÓN. Bandera que Lawang no enciende nunca: su base aún no
    # tiene la tabla, y el código compartido (operaciones-cuentas.js, datos.js) solo la lee si está encendida.
    nucleo = 'window.AXW_NUCLEO_OPERACION = true;\n'
    # Versión de los datos de ejemplo + doble: el diario de la pestaña (demo_datos.js) la lleva en su clave, así un
    # diario escrito contra otra siembra no se repite sobre esta.
    version = 'window.AXW_DEMO_VERSION = %s;\n' % json.dumps(hashlib.sha256((datos + doble).encode('utf-8')).hexdigest()[:12])
    return ('/* GENERADO por AxisWorks/comercial/demo-erp/build.py — no editar. Demo: datos inventados, sin red real. */\n'
            + nucleo + version + limpia_sesion + volver + PUERTAS_DEMO + datos + '\n' + doble)


# Lo que el guard REAL de Lawang publica con fija() (window.lwDatos, lwEdge, lwFichero…) tiene que existir también en la
# demo: el doble de QA no lo trae porque en Lawang se carga DESPUÉS del guard real, y aquí el guard real no se carga.
# 28-sep-2026: B10a añadió lwDatos al real y la Home de demo.axisworks.studio se quedó sin cifras con un TypeError.
# Mismo nombre de helper (`fija`) a propósito: verifica() comprueba que cada fija('X') del real tiene su fija('X') aquí.
# Contratos: los del real. lwDatos → sb.rpc (el envoltorio de rpc lo resuelve con LW_DEMO_DATOS) y {data, error};
# las edges y los ficheros no existen en la demo: rechazan con un Error que la pantalla enseña (como un fallo de red).
PUERTAS_DEMO = r"""(function () {
  function fija(k, v) { try { Object.defineProperty(window, k, { value: v, writable: false, configurable: false, enumerable: true }); } catch (e) { /* MUDO A PROPOSITO: el guard cargado dos veces; la primera ya fijó lo mismo */ } }
  var FICHA = window.LW_INSTANCIA || {};
  var URL_SB = FICHA.sb_url || 'https://demo.invalid';
  function noDemo(que) { var e = new Error(que + ': not available in the demo'); e.clave = 'no_disponible_en_la_demo'; return Promise.reject(e); }
  fija('LW_SB_URL', URL_SB);
  fija('LW_SB_KEY', FICHA.sb_key || 'demo-publishable-key');
  /* Moneda base (F3 fase E, 12-oct-2026): el guard real la saca de Ajustes vía la capa de módulos, que la demo no lleva. Los
     datos de la demo son en euros: sin esto la demo, que va con AXW_NUCLEO_OPERACION, pintaría «—» en vez de sus cifras. */
  fija('lwMonedaBase', function () { return 'EUR'; });
  fija('lwEdge', function (nombre) {
    if (!/^[a-z0-9-]+$/.test(String(nombre))) throw new Error('lwEdge: nombre de edge no válido');
    return URL_SB + '/functions/v1/' + nombre;
  });
  fija('lwDatos', function (nombre, args) {
    if (!/^[a-z][a-z0-9_]*_datos$/.test(String(nombre))) throw new Error('lwDatos: solo RPC *_datos (' + nombre + ')');
    if (!(window.LW_DEMO_DATOS && Object.prototype.hasOwnProperty.call(window.LW_DEMO_DATOS, nombre))) {
      return Promise.resolve({ data: null, error: { message: 'not available in the demo' } });
    }
    var cli = window.LW_SB ? Promise.resolve(window.LW_SB)
      : window.LW_AUTH ? window.LW_AUTH.then(function (a) { return a.sb; })
      : Promise.reject(new Error('lwDatos: sin cliente en esta página'));
    return cli.then(function (sb) { return sb.rpc(nombre, args || {}); })
      .then(function (r) { return { data: r.data, error: r.error }; },
            function (e) { return { data: null, error: e }; });
  });
  // Solo la URL de subida de un justificante (demo_datos.js la simula, sin red); el resto, cerrado con el error a la vista.
  fija('lwFicheros', function (sb, accion, datos) { return window.LW_DEMO_FICHEROS ? window.LW_DEMO_FICHEROS(accion, datos) : noDemo('Ficheros de contratos'); });
  fija('lwKyc', function () { return noDemo('Documentos KYC'); });
  fija('lwKycSube', function () { return noDemo('Subir documentos KYC'); });
  fija('lwFichero', function () { return noDemo('Ficheros'); });
  fija('lwFicheroSube', function () { return noDemo('Subir ficheros'); });
  fija('lwFotoUrls', function (sb, fotos) {
    var urls = {};
    (fotos || []).forEach(function (f) {
      var id = typeof f === 'string' ? f : f && f.id;
      if (!id || Object.prototype.hasOwnProperty.call(urls, id)) return;
      urls[id] = f && f.ambito === 'modelo' && f.path ? sb.storage.from('deck').getPublicUrl(f.path).data.publicUrl : null;
    });
    return Promise.resolve({ urls: urls, caduca_seg: 3600 });
  });
})();
"""
FIJA_RE = re.compile(r"""\bfija\(\s*['"]([A-Za-z_$][\w$]*)['"]""")
# Solo las funciones que llaman a lwDatos (revisor, 28-sep): con cualquier `x('algo_datos')` saltaba con una tabla
# de demo_datos.js que se llama así.
LWDATOS_LLAMADA = re.compile(r"""(?<![\w$])(lwDatos|cifras)\(\s*['"]([a-z][a-z0-9_]*_datos)['"]""")


def contrato_guard_demo():
    """Guardrail (28-sep-2026, tras la Home de la demo sin cifras por `window.lwDatos is not a function`): la demo no
    puede quedarse atrás del guard real en silencio. Aborta si
      · el guard real de Lawang publica con fija() un nombre que el guard de la demo no publica, o
      · la v4 copiada a dist/ pide una lectura `x_datos` (lwDatos('x_datos'), cifras('x_datos')…; `sb.rpc(...)` no,
        que sigue por el doble) que demo_datos.js no implementa en LW_DEMO_DATOS.
    Límite conocido: compara NOMBRES. PUERTAS_DEMO repite a mano lwDatos y lwFotoUrls del guard real; si el real
    cambia cómo responde sin cambiar de nombre, esto no lo ve (aceptado para una demo, revisor 28-sep)."""
    real = set(FIJA_RE.findall(open(os.path.join(LAWANG, 'contracts', 'assets', 'guard.js'), encoding='utf-8').read()))
    if 'lwDatos' not in real:
        aborta('no encuentro fija(\'lwDatos\') en el guard real de Lawang: ¿ha cambiado su forma? revisa FIJA_RE')
    demo = set(FIJA_RE.findall(open(os.path.join(DIST, 'contracts', 'assets', 'guard.js'), encoding='utf-8').read()))
    faltan = sorted(real - demo)
    r = subprocess.run(['node', '-e', "global.window={};require(process.argv[1]);"
                        "console.log(JSON.stringify(Object.keys(window.LW_DEMO_DATOS||{})))",
                        os.path.join(AQUI, 'demo_datos.js')], capture_output=True, text=True, encoding='utf-8')
    if r.returncode:
        aborta('no puedo leer LW_DEMO_DATOS de demo_datos.js: ' + r.stderr[:300])
    hechas = set(json.loads(r.stdout))
    pedidas = {}
    for raiz, _d, fichs in os.walk(DIST):
        for f in fichs:
            if f.endswith(('.js', '.html')):
                p = os.path.join(raiz, f)
                for fn, nombre in LWDATOS_LLAMADA.findall(open(p, encoding='utf-8', errors='replace').read()):
                    if fn != 'rpc':
                        pedidas.setdefault(nombre, set()).add(rel(p))
    if not pedidas:
        aborta('no encuentro ninguna llamada lwDatos(\'x_datos\') en la v4: ¿ha cambiado su forma? revisa LWDATOS_LLAMADA')
    sin = sorted(n for n in pedidas if n not in hechas)
    malos = ['el guard real publica %s y el de la demo no (añádelo a PUERTAS_DEMO)' % n for n in faltan]
    malos += ['la v4 pide %s (%s) y demo_datos.js no lo implementa en LW_DEMO_DATOS' % (n, ', '.join(sorted(pedidas[n])[:3]))
              for n in sin]
    if malos:
        aborta('la demo se ha quedado atrás del guard real:\n  ' + '\n  '.join(malos))
    return sorted(pedidas)


def neutraliza():
    n = 0
    cdn = re.compile(r'<script[^>]*supabase-js[^>]*>\s*</script>\s*', re.I)
    for raiz, _d, fichs in os.walk(DIST):
        for f in fichs:
            if not f.endswith(EXT_TEXTO):
                continue
            p = os.path.join(raiz, f)
            t = open(p, encoding='utf-8', errors='replace').read()
            t2 = t.replace(SB_URL, 'https://demo.invalid').replace(SB_HOST + '.supabase.co', 'demo.invalid')
            t2 = SB_KEY_RE.sub('demo-publishable-key', t2)
            if f.endswith('.html'):
                t2 = cdn.sub('', t2)
            if t2 != t:
                open(p, 'w', encoding='utf-8', newline='').write(t2)
                n += 1
    return n


def panel_nav(pagina, actual):
    """Pone en `pagina` la barra de secciones del panel (_compartido/panel_nav.html, la misma para todas) y marca la actual. Una sola
    barra para las dos páginas: copiada a mano en cada una, el menú ya divergió en B2K (6 versiones) y en Lawang (9)."""
    if '__AXW_PANEL_NAV__' not in pagina:
        aborta('una página del panel sin el hueco __AXW_PANEL_NAV__')
    nav = open(os.path.join(AQUI, '_compartido', 'panel_nav.html'), encoding='utf-8').read().strip()
    marca = 'data-nav="%s"' % actual
    if marca not in nav:
        aborta('_compartido/panel_nav.html no tiene la sección %r' % actual)
    return pagina.replace('__AXW_PANEL_NAV__', nav.replace(marca, marca + ' aria-current="page"'))


def compila_portada(solo=None):
    """Tailwind COMPILADO (ERP F3 lote 4a, 27-sep-2026): el Play CDN no lo admite la CSP. Su tema vive en tailwind.json,
    al lado; lo compila la misma herramienta que el de Lawang (tools/empaqueta_css.py de la agencia: binario v3.4.17
    verificado por SHA256). Desde el 12-oct-2026 (C03) solo sale panel/panel.css: la portada (landing.html) tiene hoja
    escrita a mano (portada.css). Se compila en cada build: nunca se queda atrás de sus páginas."""
    sys.path.insert(0, os.path.join(AGENCIA, 'tools'))
    import empaqueta_css
    fuente = json.load(open(os.path.join(AQUI, 'tailwind.json'), encoding='utf-8'))
    if fuente.get('version') != empaqueta_css.TW_VERSION:
        aborta('tailwind.json pide Tailwind %s; el binario apuntado es %s' % (fuente.get('version'), empaqueta_css.TW_VERSION))
    binario = empaqueta_css.tw_binario(descargar=True)
    # solo: la salida (su `css`) que toca en este build: la portada en la demo pública, panel/panel.css en la instancia
    # con panel_control (panel de control de módulos, 28-sep-2026)
    for salida in fuente['salidas']:
        if solo and salida['css'] != solo:
            continue
        css = empaqueta_css.tw_compila(fuente, salida, binario, raiz=AQUI)
        destino = os.path.join(DIST, salida['css'].replace('/', os.sep))
        os.makedirs(os.path.dirname(destino), exist_ok=True)
        open(destino, 'w', encoding='utf-8', newline='\n').write(css)


def idioma_ingles():
    """La demo pública abre en INGLÉS (owner, 28-sep-2026: «hazla en inglés»). idioma.js de la v4 cae a español si no
    hay elección guardada; en la copia de la demo cae a inglés salvo que el visitante haya elegido 'es' con el
    interruptor (que sigue funcionando: lwSetIdioma no se toca). Solo en dist/ de la demo: Lawang y las instancias no
    pasan por aquí (instancia() vuelve antes en main)."""
    p = os.path.join(DIST, 'contracts', 'assets', 'idioma.js')
    t = open(p, encoding='utf-8').read()
    viejo = "window.LW_IDIOMA = (v === 'en') ? 'en' : 'es';"
    if t.count(viejo) != 1:
        aborta('idioma.js de Lawang ha cambiado y no encuentro (1 vez): ' + viejo)
    open(p, 'w', encoding='utf-8', newline='').write(t.replace(viejo, "window.LW_IDIOMA = (v === 'es') ? 'es' : 'en';"))


def paginas_propias():
    """Las páginas que la demo escribe ella misma. Se llama DESPUÉS de reraiz(): ya con las rutas nuevas (/home/, /clasico/…).
    La puerta de Lawang (intranet/index.html) no se copia a la demo: aquí `/` es la landing en local y un 302 a /home/ en
    la pública."""
    redir = ('<!doctype html><meta charset="utf-8"><title>Demo</title>'
             '<script>location.replace("/home/")</script>')
    # Portada: la landing de módulos (fuente: landing.html, al lado de este script). Su primer <script> lo pone el
    # build: barrido de sesión sb-* y el origen de la demo ('' = este mismo servidor).
    open(os.path.join(DIST, 'index.html'), 'w', encoding='utf-8', newline='').write(
        banda_startups(config_portada(open(os.path.join(AQUI, 'landing.html'), encoding='utf-8').read(), '')))
    os.makedirs(os.path.join(DIST, 'demo'), exist_ok=True)
    # C03 (12-oct-2026): la portada ya no es Tailwind. Su hoja es portada.css, escrita a mano, y sale con el mismo nombre
    # de siempre (demo/landing.css); su lógica, portada.js. Las fuentes NO van aquí: las pone publica_web() en erp.
    shutil.copy2(os.path.join(AQUI, 'portada.css'), os.path.join(DIST, 'demo', 'landing.css'))
    shutil.copy2(os.path.join(AQUI, 'portada.js'), os.path.join(DIST, 'demo', 'portada.js'))
    shutil.copy2(os.path.join(AQUI, 'tour.js'), os.path.join(DIST, 'demo', 'tour.js'))
    shutil.copy2(os.path.join(AQUI, 'catalogo.js'), os.path.join(DIST, 'demo', 'catalogo.js'))
    shutil.copy2(os.path.join(AQUI, 'roi.js'), os.path.join(DIST, 'demo', 'roi.js'))   # calculadora de la portada (28-sep)
    shutil.copy2(os.path.join(AQUI, 'modulos_demo.js'), os.path.join(DIST, 'demo', 'modulos.js'))
    # Barra única de la demo y asistente de ejemplo (12-oct-2026): la carga el guard en todas las pantallas.
    shutil.copy2(os.path.join(AQUI, 'demo_cascara.js'), os.path.join(DIST, 'demo', 'cascara.js'))
    # El panel de control (panel.html + /demo/instancia.js, que salían de datos_instancia(): ver git log) NO se publica desde el 27-sep
    # (owner: «oculta el panel»): encendía módulos solo en el navegador y la demo prometía algo que no hacía.
    # Vuelve cuando active módulos de verdad sobre la instancia (interruptores F4 del ERP maestro).
    aviso = AVISO_DEMO
    for carpeta_v4, t, m in (
            ('generador-contratos', 'Contract generator', AVISO_GENERADOR),
            ('contratos-inversor', 'Buyer portal',
             'We show the buyer portal separately, on the call.')):
        d = os.path.join(DIST, carpeta_v4)
        os.makedirs(d, exist_ok=True)
        open(os.path.join(d, 'index.html'), 'w', encoding='utf-8').write(aviso.format(t=t, m=m))
    # El generador clásico lleva el texto de las cláusulas inline (Legal): su ruta
    # enseña el mismo aviso, para que «Ver en el generador» no acabe en un 404.
    open(os.path.join(DIST, 'contracts', 'app.html'), 'w', encoding='utf-8').write(
        aviso.format(t='Contract generator', m=AVISO_GENERADOR))
    d = os.path.join(DIST, 'clasico', 'dossier')   # el menú enlaza el constructor de dossier: aviso, no 404
    os.makedirs(d, exist_ok=True)
    for pagina in ('builder.html', 'index.html'):   # index: destino de la dirección vieja /intranet/dossier/ (revisor, 12-oct)
        open(os.path.join(d, pagina), 'w', encoding='utf-8').write(aviso.format(
            t='Sales brochure', m=AVISO_NO_INCLUIDO + ' the brochure carries each client\'s own brand material.'))
    d = os.path.join(DIST, 'clasico', 'creatividades')   # está en el menú de la v4; sin esto, 404 en directo
    os.makedirs(d, exist_ok=True)
    open(os.path.join(d, 'index.html'), 'w', encoding='utf-8').write(aviso.format(
        t='Creatives', m='We show each project\'s asset library on the call: they are the client\'s real ads.'))
    # /entrar/ (el acceso de la intranet real) lleva a la portada de dos puertas: en la demo no hay contraseña.
    os.makedirs(os.path.join(DIST, 'entrar'), exist_ok=True)
    open(os.path.join(DIST, 'entrar', 'index.html'), 'w', encoding='utf-8').write(redir.replace('/home/', '/'))
    # /portal/: el portal de clientes del ERP, copiado y transformado por portal_lawang() antes de cierra_referencias().
    if not os.path.isfile(os.path.join(DIST, 'portal', 'index.html')):
        aborta('paginas_propias: falta /portal/index.html (portal_lawang() no se ha ejecutado)')


FLUJO = os.path.join(AQUI, 'flujo')
FLUJO_FICHEROS = ('textos.js', 'contrato_ejemplo.js', 'nuevo-contrato.js', 'flujo.css')

# ── El portal de clientes de la demo es el del ERP TAL CUAL (owner, 12-oct-2026 07:02: «El client portal no! Quiero la demo que
# hicimos para Lawang, tal cual está»; 07:08: «igual, con marca AxisWorks Demo», «enlazado con la intranet», «inglés»). Se copia
# de Lawang FIJADO (el mismo commit que la intranet de la demo) y se transforma con reemplazos LITERALES de recuento exacto: si
# Lawang cambia uno de estos trozos, el build para en vez de publicar un portal a medias. No se copian su fichero de datos de
# demo (nombres de un cliente real), sus portadas reales ni sus pruebas: los datos salen del MISMO doble que la intranet, por el
# adaptador portal_demo/adaptador.js. Revisión previa #279 (Frontend + Seguridad) en encargos/20261011_demo_cliente_flujo_total.md.
PORTAL_LAWANG = ('index.html', 'resumen.js', 'calendario.js', 'zip.js', 'motion.js', 'enlace.js')
PORTAL_DEMO = os.path.join(AQUI, 'portal_demo')
# El bloque «MODO DEMO» del portal de origen: con ?demo carga su fichero de datos y, si no carga, falla cerrado. En la demo
# pública se cambia por la carga FIJA del doble (guard.js, con su candado y la barra de la demo) y del adaptador.
PORTAL_MODO_DEMO = re.compile(r'<script>if\(/\[\?&\]demo\(=\|&\|\$\)/\.test\(location\.search\)\)\{document\.write\(\'<script src="/portal/demo\.js'
                              r'[^"]*"><\\/script>\'\);\}</script><script>if\(/\[\?&\]demo\(=\|&\|\$\)/\.test\(location\.search\)&&'
                              r'!window\.LW_DEMO\).*?</script>', re.S)
PORTAL_VERSION_JS = re.compile(r'<script src="/contracts/assets/version\.js[^"]*"></script>')
PORTAL_CARGA_DEMO = (
    '<script src="/contracts/assets/roles.js"></script>'
    '<script src="/contracts/assets/guard.js" data-herramienta="portal"></script>'
    '<script src="/portal/demo-axw.js"></script>'
    # Falla CERRADO, como el modo demo de origen: sin el adaptador no se crea ningún cliente y la página lo dice.
    '<script>if(!window.AXW_PORTAL_DEMO){try{window.supabase={createClient:function(){throw new Error(\'demo unavailable\');}};}catch(e){}'
    'document.addEventListener(\'DOMContentLoaded\',function(){document.body.textContent=\'The demo portal is not available right now.\';});}</script>'
    # «Sign now» abre la firma de ejemplo de la demo (paquete B, por data-accion="demo-firmar"); el guard no la carga en /portal/.
    '<script src="/flujo/nuevo-contrato.js" defer></script>')
SELLO_DOC = ('<div class="axw-demo-sello" style="margin:0 0 12px;padding:6px 10px;border:3px solid rgba(186,26,26,.55);color:#ba1a1a;'
             'text-align:center;font:600 13px/1.4 system-ui,sans-serif;letter-spacing:.08em">DEMO · NOT A VALID DOCUMENT</div>')
ICONO_PERFIL = ('<svg viewBox="0 0 24 24" width="58%" height="58%" fill="#fff" aria-hidden="true"><circle cx="12" cy="8" r="4.2"/>'
                '<path d="M3.8 21c.7-4.3 4-7 8.2-7s7.5 2.7 8.2 7z"/></svg>')
# (viejo, nuevo, veces): cada uno tiene que aparecer EXACTAMENTE esas veces en el index.html de Lawang fijado.
PORTAL_CAMBIOS = [
    ('<title>Lawang · Área de clientes</title>', '<title>Client area · AxisWorks Demo</title>', 1),
    # Tipografía de marca del cliente: no se publica (tipografias_libres). El portal ya carga Jost de Google Fonts.
    ('<link rel="stylesheet" href="/assets/neue-kabel.css">\n', '', 1),
    ('<span class="carga-marca">Lawang</span>', '<span class="carga-marca">AxisWorks Demo</span>', 1),
    ('<div class="marca">LAWANG</div>', '<div class="marca">AXISWORKS DEMO</div>', 1),
    ('<b>LAWANG</b>', '<b>AXISWORKS DEMO</b>', 1),
    # Isotipo e icono de perfil del cliente → dibujos neutros; la textura de papel (hecha por el estudio, 9-oct) junto al portal.
    ("url('/assets/img/isotipo.png')", "url('/portal/demo/isotipo.svg')", 6),
    ("url('/assets/img/papel-grano.jpg')", "url('/portal/demo/papel-grano.jpg')", 1),
    ('<img src="/assets/img/moanito-face.webp" alt="">', ICONO_PERFIL, 1),
    # Sin formularios de contraseña en una página pública (Seguridad #279): la entrada no se ve nunca (sesión de demo siempre
    # abierta), pero sus ids se quedan porque el script del portal los engancha al cargar.
    ('<input type="password" id="inPass" autocomplete="current-password" required placeholder="••••••••">', '<input type="hidden" id="inPass">', 1),
    ('placeholder="tu@correo.com"', 'placeholder="you@example.com"', 2),
    ('<a href="mailto:sales@lawangproperties.com" class="link-sutil">sales@lawangproperties.com</a>', '<span>hello@example.com</span>', 1),
    ('sales@lawangproperties.com', 'hello@example.com', 6),   # los avisos de la entrada en es/en/id
    ("ph_correo:'tu@correo.com'", "ph_correo:'tu@example.com'", 1),
    ("ph_correo:'you@email.com'", "ph_correo:'you@example.com'", 1),
    ("ph_correo:'anda@email.com'", "ph_correo:'anda@example.com'", 1),
    ('iconoMoanito', 'iconoPerfil', 3),
    ('Lawang Estate', 'AxisWorks Demo', 9),   # «N properties with …» en es/en/id
    ('<a href="/intranet/" class="link-sutil" data-t="team_link">', '<a href="/home/" class="link-sutil" data-t="team_link">', 1),
    ("'<div class=\"campo\"><label>' + esc(t('cambiar_pass_nueva')) + '</label><input type=\"password\" id=\"cpNueva\" autocomplete=\"new-password\"></div>' +\n"
     "      '<div class=\"campo\"><label>' + esc(t('cambiar_pass_repite')) + '</label><input type=\"password\" id=\"cpRepite\" autocomplete=\"new-password\"></div>' +",
     "'<p class=\"aviso\" data-demo=\"sin-contrasena\">Disabled in the demo: there is no real account behind this portal.</p>"
     "<input type=\"hidden\" id=\"cpNueva\"><input type=\"hidden\" id=\"cpRepite\">' +", 1),
    ("'<button type=\"button\" class=\"btn-oscuro\" id=\"btnCpGuardar\">'", "'<button type=\"button\" class=\"btn-oscuro\" id=\"btnCpGuardar\" hidden>'", 1),
    # Inglés (owner, 12-oct): el portal trae su diccionario es/en/id; sin elección, inglés. La elección vive en la pestaña con el
    # prefijo de la demo, así «Reset demo» la borra con lo demás (Seguridad #279).
    ("localStorage.getItem('lw_portal_lang')", "sessionStorage.getItem('axw-demo:portal-lang')", 1),
    ("localStorage.setItem('lw_portal_lang', LANG)", "sessionStorage.setItem('axw-demo:portal-lang', LANG)", 1),
    ("LANG = (nl === 'es' || nl === 'id') ? nl : 'en';", "LANG = 'en';", 1),
    # «Sign now»: la firma de ejemplo de la demo en la MISMA página (sin pestaña nueva, que no tendría el almacén de la pestaña),
    # enganchada por data-accion, nunca por la clase de estilo.
    ("'<a class=\"btn-oscuro ct-firmar\" href=\"' + esc(fp.enlace) + '\" target=\"_blank\" rel=\"noopener\">'",
     "'<a class=\"btn-oscuro ct-firmar\" data-accion=\"demo-firmar\" data-id=\"' + esc(fp.contrato_id) + '\" href=\"' + esc(fp.enlace) + '\">'", 2),
    # «Sign out» vuelve a la portada de dos puertas (en la demo no hay sesión que cerrar).
    ("location.replace('/portal/' + (window.LW_DEMO ? '?demo=1' : ''))", "location.replace('/')", 1),
]
# Lo que no puede quedar en el portal publicado (Seguridad #279): enlaces a fuera, campos de contraseña, rastros del modo demo de
# origen o del cliente. Los enlaces a Google Fonts sí (hoja de estilo de la tipografía).
PORTAL_FUERA = re.compile(r'''(?:href|src|action)\s*=\s*["'](?:https?:)?//(?!fonts\.(?:googleapis|gstatic)\.com)|wa\.me/|["']tel:|["']mailto:|'''
                          r'''type=["']password|/assets/img/|neue-kabel|/portal/demo\.js|moanito-face''', re.I)


def portal_lawang():
    """Copia el portal de Lawang fijado a dist/portal/ y lo transforma (ver PORTAL_CAMBIOS). Se llama ANTES de cierra_referencias()
    para que lo que el portal pide de /contracts/ y /intranet/ venga con él, y nada de /assets/img/ del cliente."""
    destino = os.path.join(DIST, 'portal')
    os.makedirs(destino, exist_ok=True)
    for f in PORTAL_LAWANG:
        if not copia(os.path.join(LAWANG, 'portal', f), os.path.join(destino, f)):
            aborta('portal_lawang: no se pudo copiar portal/%s de Lawang' % f)
    p = os.path.join(destino, 'index.html')
    t = open(p, encoding='utf-8', newline='').read()
    t, n = PORTAL_MODO_DEMO.subn('', t)
    if n != 1:
        aborta('portal_lawang: el bloque MODO DEMO del portal aparece %d veces (esperaba 1): ¿cambió el portal de Lawang?' % n)
    t, n = PORTAL_VERSION_JS.subn(lambda m: m.group(0) + PORTAL_CARGA_DEMO, t)
    if n != 1:
        aborta('portal_lawang: version.js aparece %d veces en el portal (esperaba 1)' % n)
    for viejo, nuevo, veces in PORTAL_CAMBIOS:
        if t.count(viejo) != veces:
            aborta('portal_lawang: esperaba %d vez/veces %r y hay %d (¿cambió el portal de Lawang?)' % (veces, viejo[:90], t.count(viejo)))
        t = t.replace(viejo, nuevo)
    open(p, 'w', encoding='utf-8', newline='').write(t)


def portal_demo_assets():
    """El adaptador y los ficheros propios del portal de la demo (después de reraiz: /portal/ no se mueve)."""
    destino = os.path.join(DIST, 'portal')
    os.makedirs(os.path.join(destino, 'demo'), exist_ok=True)
    shutil.copy2(os.path.join(PORTAL_DEMO, 'adaptador.js'), os.path.join(destino, 'demo-axw.js'))
    shutil.copy2(os.path.join(PORTAL_DEMO, 'isotipo.svg'), os.path.join(destino, 'demo', 'isotipo.svg'))
    shutil.copy2(os.path.join(PORTAL_DEMO, 'documento.html'), os.path.join(destino, 'demo', 'documento.html'))
    if not copia(os.path.join(LAWANG, 'assets', 'img', 'papel-grano.jpg'), os.path.join(destino, 'demo', 'papel-grano.jpg')):
        aborta('portal_demo_assets: no encuentro assets/img/papel-grano.jpg en Lawang')
    # Fotos de relleno del portal (owner vía agencia-40, 12-oct): libres de licencia, servidas desde la propia demo. Su
    # procedencia vive en portal_demo/fotos/LICENCIAS.txt (no .md: el .gitignore del repo ignora *.md), que no se publica;
    # sin ella las fotos no salen.
    fotos = os.path.join(PORTAL_DEMO, 'fotos')
    webp = sorted(f for f in os.listdir(fotos) if f.endswith('.webp')) if os.path.isdir(fotos) else []
    lic = os.path.join(fotos, 'LICENCIAS.txt')
    licencias = open(lic, encoding='utf-8').read() if os.path.isfile(lic) else ''
    if sorted(webp) != sorted(FOTOS_PORTAL) or any(f not in licencias for f in webp):
        aborta('portal_demo_assets: portal_demo/fotos/ tiene que traer exactamente %s, cada una con su fila en LICENCIAS.txt' % ', '.join(FOTOS_PORTAL))
    os.makedirs(os.path.join(destino, 'demo', 'fotos'), exist_ok=True)
    for f in webp:
        shutil.copy2(os.path.join(fotos, f), os.path.join(destino, 'demo', 'fotos', f))


# Las que pide portal_demo/adaptador.js (portada-N y obra-<paso>): si cambia una, cambian las dos listas.
FOTOS_PORTAL = ('portada-1.webp', 'portada-2.webp', 'portada-3.webp', 'obra-replanteo.webp', 'obra-excavacion.webp',
                'obra-hormigonado.webp', 'obra-cimentacion.webp', 'obra-pilares.webp', 'obra-encofrado.webp',
                'obra-cubierta.webp', 'obra-interior.webp', 'obra-llaves.webp')


def comprueba_portal():
    """Después de neutraliza() (que quita supabase-js del CDN): nada en /portal/ que salga fuera o pida una contraseña."""
    destino = os.path.join(DIST, 'portal')
    malos = []
    for raiz, _d, fichs in os.walk(destino):
        for f in fichs:
            if f.endswith(('.html', '.js', '.css')):
                for m in PORTAL_FUERA.finditer(open(os.path.join(raiz, f), encoding='utf-8', errors='replace').read()):
                    malos.append('%s: %s' % (rel(os.path.join(raiz, f)), m.group(0)))
    if malos:
        aborta('el portal de la demo lleva lo que no puede salir (enlaces a fuera, contraseñas, restos del cliente):\n  ' + '\n  '.join(malos[:20]))
# Ancla de la ficha de cliente (datos.js de Lawang): el botón de la vista previa del portal, enganchado por su atributo, nunca
# por el rótulo. Delante se pone «New contract» del paquete B con el id del cliente (B lo casa contra la lista, no lo pinta).
FICHA_ANCLA = '\'<button type="button" data-portal-preview '
FICHA_NUEVO = ('\'<button type="button" data-accion="demo-nuevo-contrato" data-cliente="\' + esc(String(c2.id)) + \'" '
               'style="padding:7px 14px;border-radius:8px;border:1px solid #15181C;background:#15181C;color:#F4F2EC;font-weight:600;'
               'font-size:12.5px;cursor:pointer">New contract</button>\' + ')


# Marca de agua en TODO documento de factura/proforma/recibí que la demo imprime o enseña (revisión previa de Seguridad,
# 11-oct: lo que hay que vigilar en una demo abierta es que alguien fabrique un documento creíble). documentoPagina() de
# documento.js arma la página que se imprime, la vista previa y el correo: se le añade antes del cierre del <body>.
DOC_CIERRE = "'</div></body></html>';"
DOC_MARCA = ("'</div><div aria-hidden=\"true\" style=\"position:fixed;inset:0;display:flex;align-items:center;justify-content:center;"
             "pointer-events:none;z-index:9\"><div style=\"transform:rotate(-30deg);font:600 64px/1.1 system-ui,sans-serif;"
             "letter-spacing:.08em;color:rgba(186,26,26,.22);text-align:center;border:6px solid rgba(186,26,26,.22);padding:12px 28px\">"
             "DEMO<br>NOT A VALID DOCUMENT</div></div></body></html>';")


NOVEDADES_APAGA = 'if (window.__lwNovedades) return;'


def comprueba_novedades_apagable():
    """El pop-up de novedades de la intranet (anuncios internos de Lawang) se apaga en la demo y en toda instancia poniendo
    __lwNovedades antes de que cargue: aprovecha su guarda contra doble carga. Si Lawang la cambia, el pop-up volvería sin avisar: el build para."""
    p = os.path.join(DIST, 'assets', 'novedades.js')
    # sin blancos: en una instancia se mira después de limpia_publico.js, que compacta «if (x) return;» a «if(x)return;»
    if os.path.isfile(p) and re.sub(r'\s', '', NOVEDADES_APAGA) not in re.sub(r'\s', '', open(p, encoding='utf-8').read()):
        aborta('novedades.js ya no trae %r: ni la demo ni las instancias pueden apagar el pop-up de novedades de Lawang (revisa guard_demo y la cabecera del guard de instancia)' % NOVEDADES_APAGA)


def marca_agua_documentos():
    """La gran marca diagonal en documentoPagina (la página que se imprime o se envía) y, además, un sello «DEMO · NOT A VALID
    DOCUMENT» al principio de documentoHTML, de la que tiran TODOS: el cajón de factura del portal imprime con documentoHTML, no
    con documentoPagina, y oculta en la impresión todo lo que no sea el cajón (revisión previa de Seguridad #279, 12-oct)."""
    p = os.path.join(DIST, 'clasico', 'facturas', 'documento.js')
    t = open(p, encoding='utf-8').read()
    t = _una_vez(t, DOC_CIERRE, DOC_MARCA, 'documento.js (marca de agua de la demo)')
    t = _una_vez(t, "  return '' +\n  '<div class=\"head\">' +", "  return '" + SELLO_DOC.replace("'", "\\'") + "' +\n  '<div class=\"head\">' +",
                 'documento.js (sello de la demo en documentoHTML)')
    open(p, 'w', encoding='utf-8', newline='').write(t)


def engancha_flujo():
    """Paquete B de la demo para un cliente (12-oct-2026): «New contract» y la firma de ejemplo (flujo/, un panel dentro de la
    intranet que escribe en la base falsa de la pestaña). Se publican en /flujo/, pasan por los mismos filtros que el resto
    (neutraliza, RASTRO, pii, comprueba_sin_secretos) y sustituyen al aviso «Not included» del generador. El portal de cliente
    propio que traía B (flujo/portal/) se retiró el 12-oct (owner: el portal es el del ERP tal cual, ver portal_lawang())."""
    destino = os.path.join(DIST, 'flujo')
    os.makedirs(destino, exist_ok=True)
    for f in FLUJO_FICHEROS:
        shutil.copy2(os.path.join(FLUJO, f), os.path.join(destino, f))
    portal_demo_assets()
    # El generador de Lawang no va (Legal, 24-sep): su ruta abre el «New contract» de la demo.
    open(os.path.join(DIST, 'generador-contratos', 'index.html'), 'w', encoding='utf-8').write(
        '<!doctype html><meta charset="utf-8"><title>New contract · Demo</title>'
        '<script>location.replace("/contratos/?nuevo")</script>'
        '<p><a href="/contratos/?nuevo">New contract</a></p>')
    p = os.path.join(DIST, 'assets', 'datos.js')
    t = open(p, encoding='utf-8').read()
    open(p, 'w', encoding='utf-8', newline='').write(_una_vez(t, FICHA_ANCLA, FICHA_NUEVO + FICHA_ANCLA, 'datos.js (ficha de cliente)'))


# Textos de ejemplo de la intranet que casan con personas reales (tools/pii_maqueta.py). En la demo se cambian por
# un marcador neutro; en Lawang los arregla quien lleve esa pantalla. 25-sep: el placeholder del nuevo /asistente/.
EJEMPLOS_PERSONA = [('a Juan García', 'al comprador de ejemplo A'),
                    ('Andrea Lestari', 'Operadora de ejemplo')]   # auditoría de Seguridad, 25-sep


def neutraliza_ejemplos():
    for raiz, _d, fichs in os.walk(DIST):
        for f in fichs:
            if not f.endswith(EXT_TEXTO):
                continue
            p = os.path.join(raiz, f)
            t = open(p, encoding='utf-8', errors='replace').read()
            t2 = t
            for a, b in EJEMPLOS_PERSONA:
                t2 = t2.replace(a, b)
            if t2 != t:
                open(p, 'w', encoding='utf-8', newline='').write(t2)


AVISO = ('<!doctype html><html lang="en"><meta charset="utf-8"><title>{t} · Demo</title>'
         '<body style="margin:0;display:flex;min-height:100vh;align-items:center;justify-content:center;'
         'background:#fbf9f4;font:16px/1.6 system-ui,sans-serif;color:#2b2b25"><div style="max-width:30rem;padding:2rem">'
         '<h1 style="font-weight:500;color:#485B37">{t}</h1><p>{m}</p>'
         '<p><a href="/home/" style="color:#485B37">Back to home</a></p></div></body></html>')
# La de la demo para un cliente (12-oct-2026): colores de AxisWorks y vuelta también a la portada de dos puertas. AVISO se
# queda como estaba porque las instancias (bbm…) lo usan en avisos_para_rotos() y no cambian con este encargo.
AVISO_DEMO = ('<!doctype html><html lang="en"><meta charset="utf-8"><title>{t} · Demo</title>'
              '<body style="margin:0;display:flex;min-height:100vh;align-items:center;justify-content:center;'
              'background:#F4F2EC;font:16px/1.6 system-ui,sans-serif;color:#15181C"><div style="max-width:30rem;padding:2rem">'
              '<h1 style="font-weight:500;color:#15181C">{t}</h1><p>{m}</p>'
              '<p><a href="/home/" style="color:#15181C">Back to the intranet</a> · <a href="/" style="color:#15181C">Start</a></p>'
              '</div></body></html>')
# Pantallas que la demo no trae (texto de AVISO, en inglés). verifica() reconoce las propias por AVISO_NO_INCLUIDO.
AVISO_NO_INCLUIDO = 'Not included in the demo:'
AVISO_GENERADOR = AVISO_NO_INCLUIDO + ' its templates are the client\'s own documents. We show it on the call with a sample document.'
ENLACE_LOCAL = re.compile(r'''(?:src|href|action)=["']([^"'#?]*)''')


def enlaces_rotos(raiz_dir):
    """Rutas locales enlazadas desde el HTML (absolutas Y relativas) que no existen en la carpeta (ni como fichero ni como
    carpeta con index.html). Auditoría de Desarrollo (25-sep): la demo tenía 3 enlaces del menú a herramientas clásicas
    que no se copian → 404 en directo. Las relativas se resuelven DESDE LA UBICACIÓN DEL HTML en el bundle (1-oct-2026,
    URLs limpias): al subir las pantallas de /intranet/v4/<x>/ a /<x>/, un `../assets/shell.css` que apuntara a otro
    sitio saldría con la página sin estilos y sin un solo error, y mirar solo las absolutas daba verde."""
    rotos = set()
    for raiz, _d, fichs in os.walk(raiz_dir):
        for f in fichs:
            if not f.endswith('.html'):
                continue
            url = '/' + os.path.relpath(os.path.join(raiz, f), raiz_dir).replace(os.sep, '/')
            for ruta in ENLACE_LOCAL.findall(open(os.path.join(raiz, f), encoding='utf-8', errors='replace').read()):
                if re.search(r'[{}$]', ruta):
                    continue                                   # una plantilla de JS, no una ruta
                destino = _resuelve(url, ruta)
                if destino is None:
                    continue
                p = os.path.join(raiz_dir, *destino.strip('/').split('/'))
                if not (os.path.isfile(p) or os.path.isfile(os.path.join(p, 'index.html'))):
                    rotos.add(destino)
    return sorted(rotos)


def ficheros_cargados(pagina, dist):
    """Ficheros .js/.css de `dist` que una página carga por <script src> / <link href> (rutas del sitio, ya sin ?v=)."""
    url = '/' + os.path.relpath(pagina, dist).replace(os.sep, '/')
    out = set()
    texto = open(pagina, encoding='utf-8', errors='replace').read()
    for ref in re.findall(r'(?:\bsrc|\bhref)\s*=\s*["\']([^"\']+)["\']', texto, flags=re.I):
        destino = _resuelve(url, ref)
        if destino and destino.endswith(('.js', '.css')) and os.path.isfile(os.path.join(dist, *destino.strip('/').split('/'))):
            out.add(destino.strip('/'))
    return out


def poda_ficheros_sin_pantalla(dist, candidatos):
    """Quita de `dist` los `candidatos` (ruta relativa) que ya no carga NADIE: ni una página, ni otro script, ni una hoja, por nombre.
    Porqué: una pantalla que sale del paquete deja sus ficheros en /assets/, y erp/contrato_front.py lee TODO lo servido: lo que
    ya no se usa seguía llamando a RPC que la base no tiene y mantenía el contrato en rojo (textos-contrato-config.js: plantilla_*).
    Además, publicar código sin llamador es exposición sin motivo («lo que no se publica no llama»). Solo se quita lo que NINGÚN
    fichero restante nombra: uno compartido (i18n.js, guard.js…) siempre lo nombra otro y se queda. Se repite hasta que no cae
    nada más, porque un fichero quitado puede ser el único que cargaba a otro. Devuelve las rutas quitadas."""
    def nombra(nombre):
        return re.compile(r'(?<![\w.-])' + re.escape(nombre) + r'(?![\w-])')
    textos = {}
    for raiz, _d, fichs in os.walk(dist):
        for f in fichs:
            if f.endswith(EXT_TEXTO):
                p = os.path.join(raiz, f)
                textos[os.path.relpath(p, dist).replace(os.sep, '/')] = open(p, encoding='utf-8', errors='replace').read()
    quitados, pendientes, cambio = [], set(candidatos), True
    while cambio:
        cambio = False
        for ruta in sorted(pendientes):
            if ruta not in textos:
                continue
            usado = nombra(posixpath.basename(ruta))
            if any(usado.search(t) for k, t in textos.items() if k != ruta):
                continue
            os.remove(os.path.join(dist, *ruta.split('/')))
            propio = textos.pop(ruta)
            quitados.append(ruta)
            cambio = True
            for otro in textos:   # lo que ese fichero nombraba (otro script que cargaba él) pasa a ser candidato
                if otro.endswith(('.js', '.css')) and nombra(posixpath.basename(otro)).search(propio):
                    pendientes.add(otro)
        pendientes -= set(quitados)
    return sorted(quitados)


def avisos_para_rotos(demo=False, pagina=None):
    """Cada herramienta enlazada que la demo no trae enseña el aviso, no un 404. `demo`: el de la demo para un cliente (en
    inglés, AVISO_DEMO); sin él, el de siempre, que es el que usan las instancias. `pagina(ruta)`: el aviso de la instancia en SUS idiomas
    (bbm-idiomas, 15-oct: /contracts/ salía «Herramienta no incluida · Demo» en español en bbm, que es inglesa)."""
    if demo:
        texto = AVISO_DEMO.format(t='Not included in the demo',
                                  m='This older tool is not part of the demo: the demo shows the current version of the ERP.')
    else:
        texto = AVISO.format(t='Herramienta no incluida',
                             m='En la demo no se incluye esta herramienta clásica: la demo enseña la versión 4 del ERP.')
    for ruta in enlaces_rotos(DIST):
        if '.' in os.path.basename(ruta.rstrip('/')):
            continue                                   # un fichero que falta es un fallo, no una pantalla
        d = os.path.join(DIST, ruta.strip('/').replace('/', os.sep))
        os.makedirs(d, exist_ok=True)
        open(os.path.join(d, 'index.html'), 'w', encoding='utf-8').write(pagina('/' + ruta.strip('/') + '/') if pagina else texto)
        if pagina:   # ya no es el AVISO verde de Lawang: LAWANG_POR_CONTEXTO no lo cuenta (como las retiradas por tipo)
            AVISOS_SIN_PANTALLA.add(ruta.strip('/') + '/index.html')


def comprueba_resultado(raiz_dir):
    """Lo último antes de dar por bueno un build (auditoría de Desarrollo, 25-sep): cada .js sigue siendo JavaScript
    válido (los reemplazos de texto de --publico ya rompieron una vez todas las pantallas) y ningún enlace local
    apunta a la nada."""
    malos = []
    for raiz, _d, fichs in os.walk(raiz_dir):
        for f in fichs:
            if f.endswith('.js'):
                r = subprocess.run(['node', '--check', os.path.join(raiz, f)], capture_output=True, text=True)
                if r.returncode:
                    malos.append('sintaxis: %s — %s' % (os.path.relpath(os.path.join(raiz, f), raiz_dir),
                                                       (r.stderr.strip().splitlines() or [''])[-1][:120]))
    malos += ['enlace roto: ' + x for x in enlaces_rotos(raiz_dir)]
    # El Play CDN de Tailwind no puede salir en ningún build (ERP F3 lote 4a, revisor 27-sep-2026): la CSP de la demo
    # y de las instancias ya no lo admite, así que una página que aún lo cargue saldría SIN ESTILOS. Pasa si se
    # construye desde un Lawang de antes del lote 4a o si una página propia nueva se olvida de compilar su CSS.
    for raiz, _d, fichs in os.walk(raiz_dir):
        for f in fichs:
            if f.endswith(EXT_TEXTO) or f == '.htaccess':
                p = os.path.join(raiz, f)
                if 'cdn.tailwindcss.com' in open(p, encoding='utf-8', errors='replace').read():
                    malos.append('Play CDN de Tailwind (la CSP no lo admite, saldría sin estilos): '
                                 + os.path.relpath(p, raiz_dir))
    if malos:
        aborta('el resultado no se sostiene:\n  ' + '\n  '.join(malos[:30]))


def verifica():
    # sel= es la única entrada que llega del navegador a la demo desde otro origen (AXW-70): su test corre en cada
    # build, no solo cuando alguien se acuerda (revisor, 28-sep).
    r = subprocess.run(['node', os.path.join(AQUI, 'sel.test.js')], cwd=AQUI, capture_output=True, text=True,
                       encoding='utf-8', errors='replace')
    if r.returncode:
        aborta('sel.test.js falla:\n' + (r.stdout + r.stderr)[-1500:])
    neutraliza_ejemplos()
    print('lecturas *_datos de la v4 con doble en la demo: ' + ', '.join(contrato_guard_demo()))
    malos = []
    for raiz, _d, fichs in os.walk(DIST):
        for f in fichs:
            p = os.path.join(raiz, f)
            r = rel(p)
            aviso_propio = r in ('/contracts/app.html', '/clasico/dossier/builder.html', '/clasico/dossier/index.html') and os.path.getsize(p) < 5000 and \
                AVISO_NO_INCLUIDO in open(p, encoding='utf-8').read()
            if PROHIBIDO_DIST.search(r) and not aviso_propio:
                malos.append('prohibido: ' + r)
            if f.endswith(EXT_TEXTO):
                t = open(p, encoding='utf-8', errors='replace').read()
                if SB_HOST in t or SB_KEY_RE.search(t):
                    malos.append('Supabase real: ' + r)
    if malos:
        aborta('\n  '.join([''] + malos))
    # pii_maqueta.py solo mira .html, y los nombres inventados viven en JS: sin
    # esto el check pasaba en verde sin haber leído un solo nombre (24-sep).
    import tempfile
    envoltorio = os.path.join(tempfile.mkdtemp(prefix='demo_erp_pii_'), 'guard_demo.html')
    # El adaptador del portal también: sus textos de ejemplo (consultas, documentos) son JS (Seguridad #279, 12-oct).
    with open(envoltorio, 'w', encoding='utf-8') as fh:
        for js in (('contracts', 'assets', 'guard.js'), ('portal', 'demo-axw.js')):
            fh.write('<script>' + open(os.path.join(DIST, *js), encoding='utf-8').read() + '</script>\n')
    pii = subprocess.run([sys.executable, os.path.join(AGENCIA, 'tools', 'pii_maqueta.py'), '--check',
                          envoltorio, DIST], cwd=AGENCIA)
    if pii.returncode != 0:
        aborta('pii_maqueta.py no da el visto bueno (o no tiene índice): ver salida de arriba')


def logos_neutros(texto='AxisWorks Demo'):
    """Logo y favicon de la demo en lugar de los de Lawang, con el mismo tamaño para no mover la maqueta.
    Ojo, nombres al revés de lo que parecen: el logo «-dark» es el de texto OSCURO (va sobre fondo claro)."""
    from PIL import Image, ImageDraw, ImageFont
    def fuente(tam):
        return _fuente_logo(tam) or ImageFont.load_default()
    marca = os.path.join(DIST, 'contracts', 'assets', 'brand')
    for nombre, color in (('axw-logo-v3.png', (238, 240, 251, 255)), ('axw-logo-v3-dark.png', (15, 23, 48, 255))):
        im = Image.new('RGBA', (1726, 240), (0, 0, 0, 0))
        d = ImageDraw.Draw(im)
        d.rounded_rectangle((0, 30, 180, 210), radius=36, fill=(79, 70, 229, 255))
        d.text((90, 120), 'A', font=fuente(130), fill=(255, 255, 255, 255), anchor='mm')
        d.text((230, 120), texto, font=fuente(150), fill=color, anchor='lm')
        os.makedirs(marca, exist_ok=True)
        im.save(os.path.join(marca, nombre))
    fav = Image.new('RGBA', (32, 32), (0, 0, 0, 0))
    d = ImageDraw.Draw(fav)
    d.rounded_rectangle((0, 0, 31, 31), radius=7, fill=(79, 70, 229, 255))
    d.text((16, 16), 'A', font=fuente(22), fill=(255, 255, 255, 255), anchor='mm')
    fav.save(os.path.join(DIST, 'favicon.png'))


def logos_demo():
    """Logo y favicon de la demo pública con la identidad de AxisWorks (owner, 11-oct 23:07): el sello de la web (la ✕ en
    Signal sobre Ink, assets/favicon.svg dibujado aquí: PIL no lee SVG) y DEMO['marca']. Mismo lienzo que logos_neutros,
    que sigue siendo el de las instancias sin icono."""
    from PIL import Image, ImageDraw
    p = _preset_aprobado(DEMO['piel'])
    tinta, claro, senal = (tuple(p[k]) + (255,) for k in ('on-background', 'on-primary', 'accent-gold'))

    def sello(lado):
        im = Image.new('RGBA', (lado, lado), tinta)
        d = ImageDraw.Draw(im)
        a, b, g = round(lado * 9 / 32), round(lado * 23 / 32), max(2, round(lado * 3.2 / 32))
        d.line((a, a, b, b), fill=senal, width=g)
        d.line((b, a, a, b), fill=senal, width=g)
        return im

    def fuente(tam):
        return _fuente_logo(tam) or aborta('sin fuente para el logotipo (segoeuib.ttf / arialbd.ttf)')
    marca = os.path.join(DIST, 'contracts', 'assets', 'brand')
    os.makedirs(marca, exist_ok=True)
    for nombre, color in (('axw-logo-v3.png', claro), ('axw-logo-v3-dark.png', tinta)):
        im = Image.new('RGBA', (1726, 240), (0, 0, 0, 0))
        im.paste(sello(180), (0, 30))
        ImageDraw.Draw(im).text((230, 120), DEMO['marca'], font=fuente(150), fill=color, anchor='lm')
        im.save(os.path.join(marca, nombre))
    sello(64).save(os.path.join(DIST, 'favicon.png'))


def _preset_aprobado(piel):
    """{token: [r, g, b]} de una piel APROBADA de erp/tema/presets.json, validada (el mismo filtro que _piel_preset)."""
    D = _deriva()
    if D.main(['--check']) != 0:
        aborta('erp/tema/presets.json no corresponde a pieles.json: python erp/tema/deriva.py')
    aprobadas = json.load(open(os.path.join(AGENCIA, 'erp', 'tema', 'presets.json'), encoding='utf-8'))['presets']
    if piel not in aprobadas:
        aborta('la piel %r no está entre las aprobadas de erp/tema/presets.json' % piel)
    try:
        return D.valida_preset(aprobadas[piel])
    except ValueError as e:
        aborta('preset %r no válido: %s' % (piel, e))


def piel_demo():
    """La piel de la demo (DEMO['piel']) en la ficha, con el MISMO aplicador que una instancia (piel_instancia): una línea al
    final de contracts/assets/instancia.js, que todas las pantallas cargan en el <head>. comprueba_piel_demo() lo vigila."""
    valores = {k: '%d %d %d' % tuple(v) for k, v in sorted(_preset_aprobado(DEMO['piel']).items())}
    linea = ('%s%s;(function(){var s=document.documentElement.style,p=%s;for(var k in p)s.setProperty("--tema-"+k,p[k]);})();\n'
             % (PIEL_MARCA, json.dumps(DEMO['piel']), json.dumps(valores, separators=(',', ':'))))
    open(os.path.join(DIST, *FICHA_REL.split('/')), 'a', encoding='utf-8', newline='\n').write(linea)


def comprueba_piel_demo(raiz):
    """Un solo aplicador de piel en todo el paquete, en la ficha: lo mismo que comprueba_piel exige a una instancia."""
    donde = []
    for r, _d, fichs in os.walk(raiz):
        for f in fichs:
            if f in ('presets.json', 'pieles.json'):
                aborta('presets de piel copiados a la demo: ' + f)
            if f.endswith(EXT_TEXTO):
                t = open(os.path.join(r, f), encoding='utf-8', errors='replace').read()
                ruta = os.path.relpath(os.path.join(r, f), raiz).replace(os.sep, '/')
                if t.count(PIEL_MARCA) != len(APLICA_TEMA.findall(t)):
                    aborta('%s pone variables --tema- fuera del aplicador del build' % ruta)
                donde += [ruta] * t.count(PIEL_MARCA)
    if donde != [FICHA_REL]:
        aborta('aplicadores de piel en la demo: %r (se esperaba 1, en %s)' % (donde, FICHA_REL))


# Lo que la portada de dos puertas necesita además de su HTML (mesa «D01 — Demo landing» del owner, 12-oct-2026): las tres
# tipografías de la marca nueva (Unbounded, Manrope, IBM Plex Mono, licencia OFL; autoalojadas, Legal 24-sep: sin Google
# Fonts) de assets/fonts/x/, con sus licencias, y las dos vistas previas de las puertas (capturas REALES de la demo
# publicada, 1280×720, datos inventados) de portada/. Solo index.html usa /demo/fonts/.
FUENTES_PUERTA = ('unbounded-300.woff2', 'unbounded-600.woff2', 'manrope-400.woff2', 'manrope-500.woff2', 'manrope-700.woff2',
                  'ibm-plex-mono-400.woff2', 'ibm-plex-mono-500.woff2',
                  'OFL-unbounded.txt', 'OFL-manrope.txt', 'OFL-ibm-plex-mono.txt')
VISTAS_PUERTA = ('portal.webp', 'intranet.webp')
MARCA_HUECO = '__AXW_DEMO_MARCA__'


def puerta_demo(destino):
    """Escribe la portada de dos puertas (puerta_demo.html) en la raíz de `destino` con DEMO['marca'], sin sus comentarios."""
    t = open(os.path.join(AQUI, 'puerta_demo.html'), encoding='utf-8').read()
    if t.count(MARCA_HUECO) < 2:
        aborta('puerta_demo.html sin el hueco %s de la marca' % MARCA_HUECO)
    t = re.sub(r'<!--[\s\S]*?-->\n?', '', t).replace(MARCA_HUECO, html.escape(DEMO['marca']))
    open(os.path.join(destino, 'index.html'), 'w', encoding='utf-8', newline='\n').write(t)
    fuentes = os.path.join(destino, 'demo', 'fonts')
    os.makedirs(fuentes, exist_ok=True)
    for f in FUENTES_PUERTA:
        shutil.copy2(os.path.join(AQUI, '..', '..', 'assets', 'fonts', 'x', f), os.path.join(fuentes, f))
    vistas = os.path.join(destino, 'demo', 'portada')
    os.makedirs(vistas, exist_ok=True)
    for f in VISTAS_PUERTA:
        if ('/demo/portada/' + f) not in t:
            aborta('puerta_demo.html no usa la vista previa %s' % f)
        shutil.copy2(os.path.join(AQUI, 'portada', f), os.path.join(vistas, f))


# ── Piel e identidad de una instancia (F14, 11-oct-2026; revisión previa #265 de Diseño + Seguridad) ──────────────────
# `piel` e `icono` del registro (erp/instancias.json, FUERA de `config`: nueva_instancia.py sube `config` a la base). La
# instancia lleva SOLO su preset, ya derivado y validado (tríos de enteros, lista cerrada de tokens): nunca deriva en el
# navegador, nunca texto CSS. Se aplica con style.setProperty desde la ficha (contracts/assets/instancia.js), que todas las
# páginas cargan en el <head> antes que las hojas: sin lectura a la base al cargar, así que no hay parpadeo con los colores
# de Lawang. Lawang no pasa por aquí: idéntica.
PIEL_MARCA = 'window.AXW_PIEL='


def _deriva():
    import importlib.util
    spec = importlib.util.spec_from_file_location('axw_tema_deriva', os.path.join(AGENCIA, 'erp', 'tema', 'deriva.py'))
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def _piel_preset(nombre):
    """{token: [r, g, b]} de la piel aprobada de la instancia, o None si no declara piel (o declara la de Lawang)."""
    piel = _instancia_registro(nombre).get('piel')
    if not piel or piel == 'lawang':
        return None
    D = _deriva()
    if D.main(['--check']) != 0:
        aborta('erp/tema/presets.json no corresponde a pieles.json: python erp/tema/deriva.py')
    aprobadas = json.load(open(os.path.join(AGENCIA, 'erp', 'tema', 'presets.json'), encoding='utf-8'))['presets']
    if piel not in aprobadas:
        aborta('la piel %r de %s no está entre las aprobadas de erp/tema/presets.json (una propuesta no se publica)' % (piel, nombre))
    try:
        return D.valida_preset(aprobadas[piel])
    except ValueError as e:
        aborta('preset %r no válido: %s' % (piel, e))


def piel_instancia(nombre):
    """JS (una línea) que pone la piel de la instancia en <html>, o '' sin piel."""
    p = _piel_preset(nombre)
    if p is None:
        return ''
    valores = {k: '%d %d %d' % tuple(v) for k, v in sorted(p.items())}
    return ('%s%s;(function(){var s=document.documentElement.style,p=%s;for(var k in p)s.setProperty("--tema-"+k,p[k]);})();\n'
            % (PIEL_MARCA, json.dumps(_instancia_registro(nombre)['piel']), json.dumps(valores, separators=(',', ':'))))


# Menú lateral y barra superior en la tinta de la marca (owner 11-oct, «es como la de Lawang y me confundo»; registro `menu:
# "oscuro"`). Ningún token pinta SOLO el menú: se redefinen las variables de la piel DENTRO de él, en una regla de CSS
# estática añadida a assets/shell.css del paquete (sin JS: nada de parpadeo; sin <style> ni inline: la CSP no cambia).
# Enganche por identificador estable (norma del 29-sep), no por clases de Tailwind: el menú es el <aside> que lleva la
# salida (a[data-path="login"], la misma estructura que usa maqueta.js) y la barra es el <header> del contador de avisos
# ([data-lw="k-avisos"]). Colores medidos sobre el preset, nunca a mano: el build PARA si una pareja baja de 4,5:1.
MENU_SELECTOR = 'aside:has(a[data-path="login"]),header:has([data-lw="k-avisos"])'
# `menu: "lateral"` (bbm-p33, 12-oct; owner: «al estándar de axisworks nuevo»): como en el diseño del owner («AxisWorks ERP
# Dashboard»), SOLO el menú lateral es Night; la barra superior va sobre la zona de trabajo clara. Superficies del menú medidas
# contra el diseño (Raised #14152A ≈ 4 %, Lifted #1A1C33 ≈ 7 %, Haze #C9CCDB ≈ 18 % de la tinta sobre el fondo), el nombre de
# la marca en el color del fondo (el wordmark del diseño va en Chalk) y el elemento activo como pastilla del ACENTO con el
# fondo encima (Ultramarine con texto Chalk), si ese par llega a 4,5:1; si no, el acento aclarado con la tinta encima.
MENU_LATERAL = 'aside:has(a[data-path="login"])'


def menu_oscuro_css(nombre):
    """La regla CSS del menú oscuro de la instancia (`menu`: "oscuro" = menú y barra, "lateral" = solo el menú), o '' si no
    lo declara. Requiere piel."""
    modo = _instancia_registro(nombre).get('menu')
    if modo not in ('oscuro', 'lateral'):
        return ''
    p = _piel_preset(nombre)
    if p is None:
        aborta('menu "%s" de %s sin piel: el menú se pinta con los colores de su preset' % (modo, nombre))
    D = _deriva()
    tinta, fondo, acento = tuple(p['on-background']), tuple(p['background']), tuple(p['accent-gold'])
    acento_menu, _p = D.minimo_p(acento, fondo, [tinta])   # el acento, aclarado lo justo para 4,5:1 sobre la tinta
    if modo == 'oscuro':
        m = {'surface-container-low': tinta, 'surface-container': D.mix(tinta, fondo, 0.10),
             'surface-container-high': D.mix(tinta, fondo, 0.16), 'on-surface': fondo,
             'on-surface-variant': D.mix(fondo, tinta, 0.12), 'outline': D.mix(fondo, tinta, 0.30),
             'primary': acento_menu, 'primary-container': acento_menu, 'deep-lagoon': acento_menu, 'on-primary': tinta}
    else:
        # `primary` (el acento aclarado) es TEXTO en el menú; no hay fondo bg-primary en el aside (nav.js pinta la activa con
        # bg-primary-container), así que on-primary sobre primary no se comprueba: si un día lo hay, añadir su pareja abajo.
        pastilla, sobre_pastilla = (acento, fondo) if D.contraste(fondo, acento) >= 4.5 else (acento_menu, tinta)
        m = {'surface-container-low': tinta, 'surface-container': D.mix(tinta, fondo, 0.04),
             'surface-container-high': D.mix(tinta, fondo, 0.07), 'on-surface': fondo,
             'on-surface-variant': D.mix(fondo, tinta, 0.18), 'outline': D.mix(fondo, tinta, 0.30),
             'primary': acento_menu, 'primary-container': pastilla, 'deep-lagoon': fondo, 'on-primary': sobre_pastilla}
    parejas = [(t, f) for t in ('on-surface', 'on-surface-variant', 'outline')
               for f in ('surface-container-low', 'surface-container', 'surface-container-high')]
    parejas += [('deep-lagoon', 'surface-container-low'), ('on-primary', 'primary-container'), ('primary', 'surface-container-low')]
    bajas = ['%s/%s %.2f' % (a, b, D.contraste(m[a], m[b])) for a, b in parejas if D.contraste(m[a], m[b]) < 4.5]
    if bajas:
        aborta('menú oscuro de %s por debajo de 4,5:1: %s' % (nombre, ', '.join(bajas)))
    cuerpo = ';'.join('--tema-%s:%d %d %d' % ((k,) + tuple(v)) for k, v in sorted(m.items()))
    if modo == 'oscuro':
        return '\n%s{%s}\n' % (MENU_SELECTOR, cuerpo)
    # el selector de idioma del menú pinta su opción activa con bg-deep-lagoon + text-on-primary: dentro de ESE fondo la marca
    # pasa a ser la pastilla (como el segmento elegido del diseño), o saldría Chalk sobre Chalk (medido, 12-oct)
    return '\n%s{%s}\n%s .bg-deep-lagoon{--tema-deep-lagoon:%d %d %d}\n' % (
        MENU_LATERAL, cuerpo, MENU_LATERAL, *m['primary-container'])


# El filtro, la pestaña o el segmento ELEGIDO (bbm-p40, F14, 13-oct; owner: azul vivo, no Night) va como la sección activa del
# menú y la pestaña activa de nav.js: el acento con el fondo encima si ese par da 4,5:1 (en bbm, Ultramarine con Chalk); si no,
# el botón de la piel. Antes cada pantalla lo pintaba a su manera, con tokens que en la piel de bbm son todos Night (deep-lagoon,
# territorial-green, primary-container) o con el verde de Lawang a mano (.fin-chip). Los botones de ACCIÓN no cambian.
# Colores explícitos y no tokens redefinidos: --v4-lagoon se resuelve en :root y no seguiría a un token cambiado en el botón.
# Una LISTA CON NOMBRE, no «todo lo que lleve aria-pressed» (revisor, 13-oct: el genérico dejaba Chalk sobre claro, 1,01:1, en la
# moto elegida del asistente de reserva, cuya regla de página pone fondo y no color). Cada entrada engancha por el ESTADO
# (aria-selected / aria-pressed / la clase «active» del filtro / la clase «on» que pone el propio JS), nunca por un rótulo. El
# `html` delante sube la especificidad en (0,0,1): gana a una regla de página de la MISMA forma (.x[aria-…]); a una más
# específica no, y por eso Reservas va con su selector entero. Una página nueva con su propio elegido se añade aquí y se mide.
SELECCION_SELECTORES = (
    '.filter-btn.active',                                          # Usuarios (rol)
    '[role="tab"][aria-selected="true"]:not(.fin-tab)',            # Reservas, Ventas, Taller, Gastos, Cuentas, Ajustes (< 1024 px)
    # Reservas de producto (reservas_producto.html) repinta su pestaña elegida con una regla (0,4,0) en Night+Volt
    '.rp .rp-tabs .rp-tab[aria-selected="true"]',
    '[data-lw-vista] button.bg-deep-lagoon',                       # Facturas: «Lista / Por contrato» (datos.js le pone bg-deep-lagoon)
    '.fin-chip[aria-pressed="true"]',                              # Finanzas y Gastos: el chip (su regla de página, verde de Lawang a mano)
    '.rp-as-dia[data-sel="ini"]', '.rp-as-dia[data-sel="fin"]',    # asistente de reserva: día de recogida y de devolución
)
# Pestañas de SUBRAYADO (.fin-tab de Finanzas): el elegido es la raya y el texto en el acento, no un bloque
SELECCION_SUBRAYADO = ('.fin-tab[aria-selected="true"]',)
# Tarjetas elegidas que se marcan con el BORDE sobre fondo claro (asistente de reserva: la moto y la opción): solo el borde
SELECCION_BORDE = ('.rp-as-moto[aria-pressed="true"]', '.rp-as-opcion[aria-pressed="true"]')
# Lo que hay alrededor de un elegido: tiene que distinguirse de ello (≥ 3:1, WCAG 1.4.11); el subrayado es texto: ≥ 4,5:1
SELECCION_ALREDEDOR = ('background', 'surface-container-lowest', 'surface-container', 'surface-container-low', 'surface-container-highest')
# Los chips de datos.js (chipsReales) no marcan el elegido con un atributo: le ponen las clases de data-lw-on de su contenedor o,
# si no lo declara (Contratos), las de su defecto en datos.js. El selector de cada grupo sale de ahí, leído del paquete.
CHIPS_DEFECTO = re.compile(r"""getAttribute\(["']data-lw-(on|off)["']\)\s*\|\|\s*["']([^"']+)["']""")


def _chips_del_paquete(dist):
    """[(on, off)] de cada contenedor data-lw-chips de las páginas del paquete, con el defecto de datos.js si no los declara."""
    defecto = {}
    ruta = os.path.join(dist, 'assets', 'datos.js')
    if os.path.isfile(ruta):
        defecto = dict(CHIPS_DEFECTO.findall(open(ruta, encoding='utf-8', errors='replace').read()))
    grupos = []
    for raiz_, _d, fs in os.walk(dist):
        for f in fs:
            if f.endswith('.html'):
                for tag in re.findall(r'<[^>]*\bdata-lw-chips="[^"]*"[^>]*>', open(os.path.join(raiz_, f), encoding='utf-8', errors='replace').read()):
                    attr = lambda k: (re.search(r'\bdata-lw-%s="([^"]*)"' % k, tag) or [None, None])[1]
                    on, off = attr('on') or defecto.get('on'), attr('off') or defecto.get('off')
                    if not on or not off:
                        aborta('elegido: un grupo de chips de %s no declara su «on»/«off» y datos.js ya no trae el defecto (mirar CHIPS_DEFECTO)'
                               % os.path.relpath(os.path.join(raiz_, f), dist))
                    grupos.append((on, off))
    return grupos


def _chips_marcados(dist):
    """{atributo: (fondo «on», fondo «off»)} de los grupos data-chip-* de las páginas: marcaChip() de datos.js le pone al elegido
    la clase del PRIMER botón del grupo y al resto la del segundo (chipClases), así que el «on» es el fondo del primero."""
    grupos = {}
    for raiz_, _d, fs in os.walk(dist):
        for f in fs:
            if f.endswith('.html'):
                por = {}
                for tag in re.findall(r'<button[^>]*\bdata-chip-[a-z]+="[^"]*"[^>]*>', open(os.path.join(raiz_, f), encoding='utf-8', errors='replace').read()):
                    attr = re.search(r'\b(data-chip-[a-z]+)=', tag).group(1)
                    clase = (re.search(r'\bclass="([^"]*)"', tag) or [None, ''])[1]
                    por.setdefault(attr, []).append([c for c in clase.split() if re.fullmatch(r'bg-[a-z-]+', c)])
                for attr, fondos in por.items():
                    if len(fondos) < 2 or len(fondos[0]) != 1 or fondos[0] == fondos[1][:1]:
                        aborta('elegido: el grupo %s de %s no tiene un primer botón con fondo propio (marcaChip copia su clase)'
                               % (attr, os.path.relpath(os.path.join(raiz_, f), dist)))
                    grupos.setdefault(attr, set()).add((fondos[0][0], fondos[1][0] if fondos[1] else ''))
    # el chip de empresa (data-chip-e) lo crea datos.js con las clases del grupo de proyectos (clasesP): mismo «on»
    if 'data-chip-p' in grupos:
        grupos['data-chip-e'] = set(grupos['data-chip-p'])
    return grupos


def seleccion_css(nombre, dist):
    """La regla CSS del elegido en el color de la piel (ver SELECCION_SELECTORES), o '' sin piel (Lawang, demo). PARA si el
    texto baja de 4,5:1, si el elegido no se distingue de lo que lo rodea (3:1), si no hay grupos de chips, si un grupo no tiene
    un fondo «on» propio, o si el fondo «on» de un grupo es el «off» de otro (pintaría de elegido a todos los de ese)."""
    p = _piel_preset(nombre)
    if p is None:
        return ''
    D = _deriva()
    fondo, acento = tuple(p['background']), tuple(p['accent-gold'])
    bg, fg = (acento, fondo) if D.contraste(fondo, acento) >= 4.5 else (tuple(p['primary-container']), tuple(p['on-primary']))
    if D.contraste(bg, fg) < 4.5:
        aborta('elegido de %s: texto por debajo de 4,5:1 (%.2f)' % (nombre, D.contraste(bg, fg)))
    bajas = ['%s %.2f' % (t, D.contraste(bg, tuple(p[t]))) for t in SELECCION_ALREDEDOR if D.contraste(bg, tuple(p[t])) < 3]
    bajas += ['subrayado/%s %.2f' % (t, D.contraste(bg, tuple(p[t]))) for t in SELECCION_ALREDEDOR if D.contraste(bg, tuple(p[t])) < 4.5]
    if bajas:
        aborta('elegido de %s: no se distingue de lo que lo rodea: %s' % (nombre, ', '.join(bajas)))
    grupos = _chips_del_paquete(dist)
    if not grupos:
        aborta('elegido de %s: ningún grupo de chips (data-lw-chips) en el paquete' % nombre)
    ons, offs = set(), set()
    for on, off in grupos:
        fondo_on = [c for c in on.split() if re.fullmatch(r'bg-[a-z-]+', c)]
        if len(fondo_on) != 1:
            aborta('elegido de %s: el «on» de un grupo de chips no tiene un fondo propio (on=%r)' % (nombre, on))
        ons.add(fondo_on[0])
        offs |= set(off.split())
    if ons & offs:
        aborta('elegido de %s: el fondo «on» de un grupo de chips es el «off» de otro: %s' % (nombre, ', '.join(sorted(ons & offs))))
    marcados = []
    for attr, pares in sorted(_chips_marcados(dist).items()):
        on_a, off_a = {o for o, _f in pares}, {f for _o, f in pares}
        if on_a & off_a:   # el mismo atributo en dos páginas, con el «on» de una como «off» de la otra
            aborta('elegido de %s: en %s el fondo «on» de un grupo es el «off» de otro: %s' % (nombre, attr, ', '.join(sorted(on_a & off_a))))
        marcados += ['[%s].%s' % (attr, o) for o in sorted(on_a)]
    h = lambda c: '#%02X%02X%02X' % tuple(c)
    sel = ','.join('html ' + s for s in ['[data-lw-chips] button.' + o for o in sorted(ons)] + marcados + list(SELECCION_SELECTORES))
    sub = ','.join('html ' + s for s in SELECCION_SUBRAYADO)
    borde = ','.join('html ' + s for s in SELECCION_BORDE)
    return ('\n%s{background:%s;color:%s;border-color:%s}\n%s{color:%s;border-bottom-color:%s}\n%s{border-color:%s}\n'
            % (sel, h(bg), h(fg), h(bg), sub, h(bg), h(bg), borde, h(bg)))


# La suite clásica (la puerta /, /crea-contrasena/) no pinta con los tokens --tema-: cada página declara su paleta de Lawang en
# un `:root{--dl:#104C4F…}` de su propio <style>, que va DESPUÉS de las hojas y por eso ganaba a cualquier `:root` añadido a
# axw.css (Calidad, 12-oct: la puerta de bbm salía con el botón y el título verdes; el primer intento, que añadía `:root` a la
# hoja, no pintaba nada). Aquí la regla es `html:root{…}` (especificidad 0,1,1 > 0,1,0): gana a la de la página sea cual sea
# el orden. Cada variable va por su USO, no por su nombre (en la piel de bbm stone-sand y soft-canopy son el mismo gris oscuro):
# --ss es fondo del botón desactivado (texto blanco: el tono medio de la piel, no el más claro; revisor 12-oct) y --stone borde
# → neutros claros; --sc es texto sobre blanco y anillo de foco.
PALETA_CLASICA = (('--tg', 'territorial-green'), ('--dl', 'deep-lagoon'), ('--be', 'burnt-earth'), ('--va', 'volcanic-ash'),
                  ('--sc', 'soft-canopy'), ('--ss', 'secondary-fixed-dim'), ('--rl', 'raw-linen'), ('--ink', 'on-background'),
                  ('--line', 'warm-border'), ('--line-fuerte', 'outline-variant'), ('--sup-2', 'surface-container-low'),
                  ('--linen', 'background'), ('--paper', 'surface-container-lowest'), ('--stone', 'outline-variant'),
                  ('--muted', 'on-surface-variant'),
                  # texto del pie del panel clásico (#6B7072 de Lawang fijo): 4,14:1 sobre --rl, medido en bbm (bbm-p33, 12-oct)
                  ('--ink-3', 'on-surface-variant'))
# Lo que la piel no alcanza redefiniendo variables: colores de Lawang escritos a mano. (fichero, literal, token, formato).
# Reemplazo literal en la copia de DIST; si un literal desaparece de la fuente el build PARA (no se queda verde en silencio).
CLASICA_FIJOS = (('contracts/assets/axw.css', '#0d5b5f', 'primary-container', 'hex'),          # hover de los botones primarios
                 ('contracts/assets/axw.css', 'rgba(16,76,79,', 'deep-lagoon', 'rgba'),        # sombra del botón primario
                 ('index.html', 'rgba(72,91,55,.15)', 'territorial-green', 'rgba.15'),         # anillo del campo de la puerta
                 ('index.html', '#F5F0E6', 'background', 'hex'),                              # velo «entrando…»
                 ('index.html', '#CBD6B6', 'inverse-primary', 'hex'),                          # rol «manda» del panel clásico
                 ('index.html', 'rgba(143,155,122,.22)', 'soft-canopy', 'rgba.22'),            # anillo del buscador clásico
                 # la mascota (botón flotante de avisos, en todas las pantallas v4): su marco y sus botones en Deep Lagoon fijo.
                 # El personaje (su brote verde) es dibujo, no marca de la suite: se queda (orquestador decide si se cambia).
                 ('assets/mascota.js', '#104C4F', 'deep-lagoon', 'hex'),
                 ('assets/mascota.js', 'rgba(16,76,79,', 'deep-lagoon', 'rgba'),
                 ('assets/mascota.js', '#0c3c3e', 'on-background', 'hex'),                     # hover del botón principal
                 ('assets/mascota.js', '#316669', 'primary-container', 'hex'))                 # enlaces de texto
# Texto del botón desactivado: no se exige 4,5 (WCAG lo exime) pero tampoco peor que en Lawang (blanco sobre #BEB3A5, 2,1:1).
CLASICA_DESACTIVADO_MIN = 2.1
CLASICA_CONTRASTE = (('#FFFFFF', '--dl'), ('#FFFFFF', '--tg'), ('#FFFFFF', 'primary-container'), ('#FFFFFF', 'on-background'), ('--sc', '#FFFFFF'),
                     ('--muted', '--paper'), ('--linen', '--dl'), ('--ink', '--rl'), ('--ink-3', '--rl'))


# Colores de Lawang escritos a mano en la cáscara v4 que la piel no alcanza (bbm-p33, 12-oct, medido en captura: la pestaña
# activa Facturas/Recibos salía verde oliva de Lawang). Reemplazo literal en la copia de DIST, como CLASICA_FIJOS, y PARA si el
# literal desaparece de la fuente. La pestaña activa va como el segmento elegido del diseño: el acento con el fondo encima si
# ese par da 4,5:1; si no, el botón de la piel (acción con su «on»).
V4_FIJOS = (('assets/nav.js', 'background:#485B37;color:#fff', 'pestana', None),        # pestaña activa (herramientas con pestañas)
            ('assets/nav.js', 'color:#44483f', 'on-surface-variant', 'color'),          # pestaña inactiva
            # la mascota del asistente (owner vía orquestador, 12-oct: «o va con la piel o se oculta, no a medias»): el personaje
            # en la tinta y el acento de la piel, con las hojas en el «on» del botón (Volt en bbm, sobre el aro oscuro); su
            # globo y su campo en las superficies, filete y textos de la piel. Lo de CLASICA_FIJOS (#104C4F…) va aparte.
            ('assets/mascota.js', 'fill="#314322"', 'on-background', 'fill'),           # cuerpo
            ('assets/mascota.js', 'fill="#485b37"', 'accent-gold', 'fill'),             # cara
            ('assets/mascota.js', 'stroke="#485b37"', 'accent-gold', 'stroke'),         # tallo
            ('assets/mascota.js', 'fill="#b8cea1"', 'on-primary', 'fill'),              # hoja
            ('assets/mascota.js', 'fill="#d3eabb"', 'on-primary', 'fill'),              # hoja
            ('assets/mascota.js', '#fbf9f4', 'surface-container-lowest', 'hex'),        # ojos y fondo del campo
            ('assets/mascota.js', '#E4DCCB', 'filete', 'hex'),                          # borde del globo
            ('assets/mascota.js', '#f5f4ee', 'surface-container-low', 'hex'),           # hover de botón
            ('assets/mascota.js', '#efeee8', 'surface-container', 'hex'),               # hover de cerrar
            ('assets/mascota.js', '#1b1c19', 'on-background', 'hex'),                   # texto y sombra del suelo
            ('assets/mascota.js', '#44483f', 'on-surface-variant', 'hex'),              # texto del globo
            ('assets/mascota.js', '#75786e', 'outline', 'hex'),                         # botón cerrar
            ('assets/mascota.js', '#c5c8bc', 'outline', 'hex'),                         # borde del campo (≥ 3:1)
            ('assets/mascota.js', '#2E3437', 'on-surface', 'hex'),                      # texto de botón
            ('assets/mascota.js', 'rgba(27,28,25,', 'on-background', 'rgba'))           # sombra del globo


def piel_v4_fijos(dist, nombre):
    """Aplica V4_FIJOS con los colores de la piel de la instancia. Sin piel no toca nada (Lawang, demo)."""
    p = _piel_preset(nombre)
    if p is None:
        return 0
    D = _deriva()
    fondo, acento = tuple(p['background']), tuple(p['accent-gold'])
    bg, fg = (acento, fondo) if D.contraste(fondo, acento) >= 4.5 else (tuple(p['primary-container']), tuple(p['on-primary']))
    if D.contraste(bg, fg) < 4.5:
        aborta('pestaña activa de %s por debajo de 4,5:1 (%.2f)' % (nombre, D.contraste(bg, fg)))
    h = lambda c: '#%02X%02X%02X' % tuple(c)
    fmt = {'color': lambda c: 'color:' + h(c), 'fill': lambda c: 'fill="%s"' % h(c), 'stroke': lambda c: 'stroke="%s"' % h(c),
           'hex': h, 'rgba': lambda c: 'rgba(%d,%d,%d,' % tuple(c)}
    textos, n = {}, 0
    for rel_f, literal, tok, f in V4_FIJOS:
        ruta = os.path.join(dist, rel_f)
        if rel_f not in textos:
            textos[rel_f] = open(ruta, encoding='utf-8').read() if os.path.isfile(ruta) else ''
        if literal not in textos[rel_f]:
            aborta('piel de la cáscara v4: %s ya no lleva %r (¿cambió Lawang? mirar V4_FIJOS)' % (rel_f, literal))
        nuevo = 'background:%s;color:%s' % (h(bg), h(fg)) if tok == 'pestana' else fmt[f](p[tok])
        textos[rel_f] = textos[rel_f].replace(literal, nuevo)
        n += 1
    for rel_f, t in textos.items():
        open(os.path.join(dist, rel_f), 'w', encoding='utf-8', newline='').write(t)
    return n


# ── Colores de Lawang escritos a fuego en TODO lo que publica una instancia con piel (bbm-p42b, 13-oct-2026; hallazgo de p40,
# orquestador agencia-81). Los editores y cajones (Facturas › «Dokumen baru», Gastos › «New supplier»…) y el PAPEL seguían con el
# crema, el verde azulado y el verde oliva de Lawang: 878 literales en 53 ficheros que V4_FIJOS/CLASICA_FIJOS no alcanzan. El papel
# (cabecera de la tabla #485B37 en la factura que recibe el cliente) lo pone contracts/assets/brand.css (`--brand-primary:var(--tg)`,
# `--tg:#485B37`), que el editor carga en v4 y al que no llega el `html:root` de la piel (medido en bbm real: tinta de la sociedad NULL).
# Regla: cada color de Lawang va al MISMO token en la piel de la instancia (los tokens de Lawang son su propia piel: tw.css de Lawang);
# los escritos a mano que no son token, por la tabla LAWANG_SUELTOS. Se reemplaza en la copia de DIST, nunca en el repo de Lawang: sin
# piel (Lawang, demo sin piel) no se toca nada. Un color con DOS significados (el verde de Lawang es marca y es «disponible/hecho/en
# vivo») no cabe en una tabla color→token: va por CONTEXTO (LAWANG_POR_CONTEXTO: fichero + texto de alrededor + cuántas veces) y el
# build PARA si encuentra una aparición sin clasificar o si cambia el recuento. Al final, barrido: PARA si queda un color de Lawang en
# cualquier forma (#rgb, #rrggbb, #rrggbbaa, %23 de un SVG en URL, rgb()/rgba() con comas o espacios). Y PARA si el pase cambia algo
# que no sea un color (ni un texto, ni un importe, ni un data-*).
LAWANG_TW = os.path.join('intranet', 'v4', 'assets', 'tw.css')   # la piel de Lawang: sus --tema-* por defecto
# Colores de Lawang escritos a mano que NO son token de su tw.css → token de la piel. Cremas y grises cálidos de su suite (axw.css,
# brand.css, documento.css, suite-v3.css…), medidos en el paquete de bbm el 13-oct. Lo que no está aquí ni en tw.css no se considera
# «de Lawang» (los tonos de estado propios y la cola larga de grises van en una segunda pasada: ver la fila del estudio en pendientes).
LAWANG_SUELTOS = {'0D5B5F': 'primary-container',        # hover del botón primario (como CLASICA_FIJOS)
                  '0C3C3E': 'on-background',            # hover del botón de la mascota
                  '6B7072': 'on-surface-variant',       # texto del pie del panel clásico
                  'FFFDF8': 'surface-container-lowest',  # --paper de la suite clásica
                  'FDFCF9': 'surface-container-lowest',
                  'F7F3E9': 'surface-container-low',
                  'EDE7D9': 'surface-container',
                  'F7EEDC': 'surface-container-low',
                  'EFEADE': 'surface-container',        # --sup-hover
                  'E8E2D5': 'filete', 'F0EBE0': 'filete',  # filetes del papel (documento.css)
                  '6B6C66': 'on-surface-variant', '676B63': 'on-surface-variant'}   # --muted
# La COLA (bbm-p42c, 13-oct; orquestador: «un documento que recibe el cliente no puede llevar tonos de otra marca»): los colores escritos a
# mano en el código de LAWANG (están en su repo) que no son token ni suelto: sus tonos de estado propios y la cola larga de grises y cremas
# cálidos, por FAMILIAS. Clasificados por tono y luz (scratchpad familias.py del 13-oct) y revisados a mano: un crema claro es superficie,
# no aviso; los degradados oscuros de las tarjetas de proyecto (tw-movil-pc) van a la tinta. Los destinos que no son token de la piel se
# derivan de su token de estado (FAMILIAS_DERIVADAS). El CRM clásico de leads (su verde bosque y su ocre) entra entero por aquí: a
# medias quedaba con la acción principal en verde Tailwind y sus fondos en la piel (revisor de p42c). FUERA, a propósito y con nombre (orquestador, 13-oct): ver COLORES_AJENOS.
LAWANG_FAMILIAS = {
    'accent-gold': ('2F5D9E', '3E6E8E', '5B4B8A', '6B4E9B', '9DB6CF'),
    'aviso': ('5C4210', '634A00', '662906', '6A4A14', '6A5A3C', '6B5420', '6B5A3A', '78350F', '7A4B14', '7A5200', '8A3B1C', '8A4B00', '8A5A00', '8A6A34', '8C5E10', '92400E', 'B06A3B', 'B45309', 'B8550A', 'C06C47', 'C8791F', 'C9892B', 'CF6312', 'D97706', 'E8741C', 'F59E0B'),
    'aviso-borde': ('C5A880', 'D8A984', 'E6D7B4', 'E8C27A', 'EBDCB4', 'FDE68A'),
    'aviso-fondo': ('FBEEE7', 'FBEFBE', 'FBF3E4', 'FDF6F2', 'FEF3C7', 'FFF1D6', 'FFF4E0', 'FFFAF0', 'FFFBEB'),
    'deep-lagoon': ('0B3638', '0C3A3C', '0E6B70', '0F2E30', '1F4E4A', '4E8386', '7FB3B5', '9AC0C2', 'A9CDCE'),
    'filete': ('D6CFC2', 'D6D2C8', 'D6D3D1', 'E2DACA', 'E4E0D6', 'E6E1D6', 'E7DDCD', 'E7E1D2', 'E7E3D2', 'E7E4DC', 'EAE4D3', 'EAE5D8', 'ECE4D6'),
    'inverse-primary': ('CBD6B6',),
    'ok': ('043C2E', '064E3B', '065F46', '10B981', '1B4332', '1F5130', '2C4A2C', '2E5B3E', '2F5D3A', '354F2C', '3A5231', '3C4D2D', '98BF98'),
    'ok-fondo': ('A7F3D0', 'DCEBDC', 'E4F0DA', 'E6EFE9', 'E7EFE3', 'ECF6EF', 'ECFDF5', 'EEF3E6', 'EEF3EA', 'EEF3F0', 'F1F7F5', 'FBFDFC'),
    'on-background': ('0C0A09', '103436', '123E40', '143236', '1A1E20', '1A494D', '1B2B1A', '1C1917', '1C1B17', '1C1C1C', '1E2522', '204944', '21272A', '22282A', '25423F', '273822', '292524', '2C281E', '2D3F27', '344B2A', '3B2B1E', '483A25', '523D2B'),
    'on-surface-variant': ('3A3A3A', '44403C', '4A4F4A', '4A5052', '57534E', '5A6062', '5C5A52', '5E625A'),
    'outline': ('6B6B6B', '6E7B5A', '736B5E', '73777F', '78716C', '78786E', '7B7C74', '7C8B7A', '8A9182'),
    'outline-variant': ('A8A29E', 'B9B2A4', 'B9B5A8', 'BDBDB5', 'C9BCA4', 'C9C3B4', 'D3C8B2'),
    'peligro': ('842620', '8A2E22', '9E2F26', 'B5462F', 'BE123C', 'C46A62', 'E11D48', 'F43F5E'),
    'peligro-fondo': ('E0C6C2', 'E9C9C5', 'F5B8B2', 'F6E1DE', 'F8E3E0', 'FBF3F1', 'FDECEA', 'FFF1EF', 'FFF4F2'),
    'surface-container': ('EAE8E2', 'EDE8DE', 'EFE7D9', 'EFE8DA', 'EFEAE0', 'EFECE4', 'F0EEE9', 'F1EFE9', 'F2EEE3', 'F3F0E8', 'F3F1EA', 'F4ECD8', 'F4EFE3', 'F4F2EC', 'F5EFE6', 'F5F1E8', 'F6F2E7'),
    'surface-container-low': ('CFE2E2', 'CFE3E3', 'D9ECEC', 'DCEAE7', 'E3ECF5', 'F2F8F8', 'F3F6EE', 'F5F5F4', 'F6FAF2', 'F7F4EA', 'F7F4EC', 'F7F5EF', 'FAF7F0', 'FAF8F3', 'FAFAF9', 'FBF8F2', 'FBF9F3', 'FBFDF7', 'FDFCF8'),
}
# Colores que NO son de otra marca y por eso no entran (ni se cambian ni los cuenta el barrido): la ✕ de AxisWorks (la marca del fabricante,
# en el icono de las herramientas) y los grises y azules por defecto de Tailwind (preflight y forms; el slate del CRM clásico de leads no está
# en ninguna lista y por eso tampoco se toca). Los TONOS DE ESTADO de Tailwind que Lawang usa (ámbar, esmeralda, rosa, stone; también los
# chips del CRM) sí entran por su familia: un «aprobado» lleva el verde de estado de la piel, sea de Tailwind o no. Del MAESTRO se quedan
# solo los dos que ya son del lenguaje de la casa (el tinte azul del chip «confirmada» y el velo del cajón de flota); el resto va por
# COLORES_MAESTRO, abajo.
COLORES_AJENOS = {'15181C': 'la ✕ de AxisWorks', 'E2581C': 'la ✕ de AxisWorks', '6B7280': 'Tailwind', '2563EB': 'Tailwind', '3B82F6': 'Tailwind',
                  '9CA3AF': 'Tailwind', 'E5E7EB': 'Tailwind', 'D1D5DB': 'Tailwind',
                  'E3E6FD': 'el tinte azul del maestro (chip «confirmada» de la portada y de reservas)',
                  '0F111E': 'el velo del cajón de flota (tinta azul del maestro, rgba)'}
# Colores que el MAESTRO escribe a mano en sus propias pantallas (no están en el repo de Lawang) y que hablan el idioma de Lawang —las cajas
# de aviso de pantalla_comun (oliva, crema, rojo teja), sus rayas y tintas cálidas— o son un fondo de estado: también a la piel, cada uno con
# su porqué (revisión del 13-oct: un hueco sin nombre no es una exclusión; el barrido los conoce como cualquier color de la cola).
COLORES_MAESTRO = {
    '7A1A14': ('peligro', 'texto de la caja de error (pantalla_comun)'),
    'FDE2E0': ('peligro-fondo', 'fondo de la caja de error (pantalla_comun)'),
    'FDE4E1': ('peligro-fondo', 'fondo de error (flota, portada de reservas)'),
    'F3C5BE': ('peligro-fondo', 'borde de la caja de error de flota'),
    'FFF3E0': ('aviso-fondo', 'fondo de la caja de aviso (pantalla_comun)'),
    'FFE9D2': ('aviso-fondo', 'chip «en espera» (portada de reservas)'),
    'E6EFDD': ('ok-fondo', 'fondo oliva de la caja de éxito (pantalla_comun)'),
    'DCF2E3': ('ok-fondo', 'chip «ok» (portada de reservas)'),
    '2C3D1F': ('ok', 'texto oliva de la caja de éxito (pantalla_comun)'),
    'F0EEE8': ('filete', 'raya cálida de las tablas (pantalla_comun)'),
    'FAF9F5': ('surface-container-low', 'fila al pasar el ratón (ventas, alta del bot)'),
    '4A4C45': ('on-surface-variant', 'texto secundario cálido (flota, entrega)'),
    '2B2B25': ('on-background', 'tinta cálida de la página de rescate (contratos, obra)'),
}
# destino derivado → (token de la piel, mezcla con el blanco de la hoja). El texto de estado sobre su fondo, ≥ 4,5:1 o PARA.
FAMILIAS_DERIVADAS = {'aviso-fondo': ('aviso', 0.88), 'aviso-borde': ('aviso', 0.62), 'ok-fondo': ('ok', 0.86), 'peligro-fondo': ('peligro', 0.88)}
NEUTROS = {(255, 255, 255), (0, 0, 0)}
# Apariciones de un color de Lawang con más de un significado: (fichero de DIST, texto que tiene que aparecer junto al color —regex sobre
# 80 caracteres antes y 40 después—, destino, cuántas). Destino None = el token del color (marca); 'ok' = el verde de estado de la piel
# ('ok' o, si no lo trae, 'fiduciary-green'); 'ok-fondo'/'ok-tinta' = la pareja fondo/texto de una etiqueta «aprobada». Decisión por
# defecto del orquestador (13-oct): los colores de ESTADO van a los de estado de la piel, nunca al acento de la marca.
# Rutas retiradas por tipo que el paquete NO traía y que instancia() rellena con «Pantalla no incluida» (14-oct, /clasico/obra/ de bbm): para el
# recuento de LAWANG_POR_CONTEXTO siguen siendo «una pantalla que no sale» (antes el fichero no existía y la regla no contaba).
AVISOS_SIN_PANTALLA = set()
LAWANG_POR_CONTEXTO = {
    '485B37': (('assets/datos.js', r'(?i)background:#485b37;color:#fff', None, 2),                 # botón
               ('assets/datos.js', r'DATOS EN VIVO|disponible:|en_venta:|llega\?', 'ok', 4),        # estados
               ('assets/editores.js', r'focus-visible', None, 1),
               ('assets/ficha_modelo.js', r'verde:', 'ok', 1),
               ('whatsapp-bot-alta/index.html', r'data-listo="1"|data-hecho="1"', 'ok', 2),       # pasos hechos
               ('contracts/index.html', r'', None, 2), ('clasico/obra/index.html', r'', None, 2),  # «Herramienta no incluida»
               ('index.html', r'', None, 1), ('crea-contrasena/index.html', r'', None, 1),        # --tg de la puerta
               ('contracts/assets/autoria.js', r'', None, 2), ('contracts/assets/axw.css', r'', None, 20),
               ('contracts/assets/suite-v3.css', r'', None, 5), ('contracts/assets/brand.css', r'', None, 1)),
    'D3EABB': (('assets/comisiones-equipo.js', r'aprobada:', 'ok-fondo', 1),),
    '0F2003': (('assets/comisiones-equipo.js', r'aprobada:', 'ok-tinta', 1),),
}
# El PAPEL (decisión por defecto del orquestador, 13-oct): el de una instancia nunca lleva los colores de otro cliente; va en sobrio, el
# texto en la tinta y el acento de la marca solo donde hoy va el verde (cabecera de la tabla, filetes de total). Se revierte en una línea.
PAPEL_FIJOS = (('contracts/assets/brand.css', '--brand-primary: var(--tg);', '--brand-primary: %s;', 'accent-gold'),
               ('contracts/assets/brand.css', '--brand-deep:    var(--dl);', '--brand-deep:    %s;', 'on-background'))
COLOR_RE = re.compile(r'(#|%23)([0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{4}|[0-9a-fA-F]{3})(?![0-9a-zA-Z_])'
                      r'|(rgba?\(\s*)(\d{1,3})(\s*[, ]\s*)(\d{1,3})(\s*[, ]\s*)(\d{1,3})')
PIEL_EXT = ('.js', '.css', '.html', '.php', '.svg')   # nada binario ni de datos (.json fuera)
# Un hex que es TEXTO que lee la persona, no pintura: el ejemplo de un campo de color (Ajustes › sociedad: `ayuda:"#42210B"` bajo «Tinta
# oscura»). Ni se cambia ni lo cuenta el barrido (revisión de e6d96ed: el pase lo cambiaba y la comprobación de «solo colores» no lo ve,
# porque el texto también es un hex).
TEXTO_ANTES_RE = re.compile(r'(?:ayuda:"|placeholder=["\']|placeholder:\s*["\'])$')


def _es_texto(m):
    return bool(TEXTO_ANTES_RE.search(m.string[max(0, m.start() - 20):m.start()]))


def _rgb_hex(h):
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def lawang_paleta():
    """{(r,g,b): [tokens de Lawang]} con los --tema-* por defecto de la tw.css de Lawang + LAWANG_SUELTOS (sin blanco ni negro)."""
    ruta = os.path.join(LAWANG, LAWANG_TW)
    if not os.path.isfile(ruta):
        aborta('colores de Lawang: falta %s (la piel de Lawang)' % ruta)
    pal = {}
    for k, r, g, b in re.findall(r'--tema-([a-z0-9-]+):\s*(\d+) (\d+) (\d+)', open(ruta, encoding='utf-8').read()):
        c = (int(r), int(g), int(b))
        if c not in NEUTROS and k not in pal.get(c, []):
            pal.setdefault(c, []).append(k)
    if len(pal) < 20:
        aborta('colores de Lawang: %s trae solo %d colores (¿cambió su forma?)' % (LAWANG_TW, len(pal)))
    for hx, tok in LAWANG_SUELTOS.items():
        pal.setdefault(_rgb_hex(hx), []).append(tok)
    for dst, hxs in LAWANG_FAMILIAS.items():
        for hx in hxs:
            if hx in COLORES_AJENOS or _rgb_hex(hx) in pal:
                aborta('colores de Lawang: %s está en LAWANG_FAMILIAS y además es %s' % (hx, COLORES_AJENOS.get(hx) or 'token o suelto de Lawang'))
            pal[_rgb_hex(hx)] = [dst]
    for hx, (dst, _porque) in COLORES_MAESTRO.items():
        if hx in COLORES_AJENOS or _rgb_hex(hx) in pal:
            aborta('colores de Lawang: %s está en COLORES_MAESTRO y además es %s' % (hx, COLORES_AJENOS.get(hx) or 'de Lawang'))
        pal[_rgb_hex(hx)] = [dst]
    return pal


def _color_de(m):
    if m.group(2):
        h = m.group(2)
        return _rgb_hex(''.join(c * 2 for c in h[:3]) if len(h) in (3, 4) else h[:6])
    return tuple(int(m.group(i)) for i in (4, 6, 8))


def _pon_color(m, c):
    """La misma forma con otro color: el prefijo (# o %23), el alfa y los separadores se quedan como estaban."""
    if m.group(2):
        h = m.group(2)
        alfa = h[3] * 2 if len(h) == 4 else (h[6:] if len(h) == 8 else '')
        return m.group(1) + '%02X%02X%02X' % c + alfa
    return m.group(3) + str(c[0]) + m.group(5) + str(c[1]) + m.group(7) + str(c[2])


def _ajusta_luz(D, tono, origen):
    """El color con el tono de `tono` y la luminancia de `origen`: mezcla con blanco (para aclarar) o con negro (para oscurecer)."""
    objetivo = D.lum(origen)
    hacia = (255, 255, 255) if D.lum(tono) < objetivo else (0, 0, 0)
    lo, hi = 0.0, 1.0
    for _ in range(24):
        medio = (lo + hi) / 2
        if (D.lum(D.mix(tono, hacia, medio)) < objetivo) == (hacia == (255, 255, 255)):
            lo = medio
        else:
            hi = medio
    return min((D.mix(tono, hacia, x) for x in (lo, hi)), key=lambda c: abs(D.lum(c) - objetivo))


def piel_colores_lawang(dist, nombre):
    """Pasa a la piel de la instancia todo color de Lawang que quede en lo publicado (.js/.css/.html/.php/.svg). Sin piel no toca
    nada. PARA si: un color ambiguo aparece sin clasificar o con otro recuento, el token no existe en la piel, el pase cambia algo que no
    es un color, o al final queda un color de Lawang. Devuelve cuántos colores cambió."""
    p = _piel_preset(nombre)
    if p is None:
        return 0
    D = _deriva()
    pal = lawang_paleta()
    p = dict(p)
    if 'ok' not in p:
        p['ok'] = p['fiduciary-green']
    blanco = tuple(p['surface-container-lowest'])
    faltan = sorted({t for toks in pal.values() for t in toks} - set(p) - set(FAMILIAS_DERIVADAS)
                    | {b for b, _m in FAMILIAS_DERIVADAS.values()} - set(p))
    if faltan:
        aborta('colores de Lawang: la piel de %s no trae los tokens %s' % (nombre, ', '.join(faltan)))
    for dst, (base, mezcla) in FAMILIAS_DERIVADAS.items():
        p[dst] = D.mix(tuple(p[base]), blanco, mezcla)
    ok = tuple(p['ok'])
    destino = {'ok': ok, 'ok-fondo': tuple(p['ok-fondo']), 'ok-tinta': ok}
    bajas = ['%s sobre %s %.2f' % (a, b, D.contraste(tuple(p[a]), tuple(p[b]))) for a, b in
             (('ok', 'surface-container-lowest'), ('ok', 'ok-fondo'), ('aviso', 'surface-container-lowest'), ('aviso', 'aviso-fondo'),
              ('peligro', 'surface-container-lowest'), ('peligro', 'peligro-fondo')) if D.contraste(tuple(p[a]), tuple(p[b])) < 4.5]
    if bajas:
        aborta('colores de estado de %s por debajo de 4,5:1: %s' % (nombre, ', '.join(bajas)))
    # un color de Lawang compartido por varios tokens que en la piel valen distinto es ambiguo: sin reglas de contexto, PARA
    simple, ambiguos = {}, set()
    for c, toks in pal.items():
        vals = {tuple(p[t]) for t in toks}
        if len(vals) == 1:
            simple[c] = vals.pop()
        else:
            ambiguos.add(c)
    # La COLA (familias y maestro) toma el TONO de su token pero conserva la LUZ que tenía (revisor de p42c, 13-oct: por tono a secas un
    # tinte claro caía en el token oscuro; en el saldo del contrato «Este documento» se leía como «Cobrado» y los cuatro tramos del panel
    # de finanzas salían de un color). Misma luminancia = mismo contraste con lo que tenga alrededor, y lo distinto sigue distinto.
    cola = {_rgb_hex(hx): dst for dst, hxs in LAWANG_FAMILIAS.items() for hx in hxs}
    cola.update({_rgb_hex(hx): dst for hx, (dst, _porque) in COLORES_MAESTRO.items()})
    for c, dst in cola.items():
        simple[c] = _ajusta_luz(D, tuple(p[FAMILIAS_DERIVADAS[dst][0] if dst in FAMILIAS_DERIVADAS else dst]), c)
        if not 0.93 <= (D.lum(simple[c]) + .05) / (D.lum(c) + .05) <= 1.07:
            aborta('colores de Lawang: #%02X%02X%02X no se puede llevar al tono de %s con su misma luz' % (c + (dst,)))
    reglas = {_rgb_hex(hx): r for hx, r in LAWANG_POR_CONTEXTO.items()}
    sin_regla = sorted('#%02X%02X%02X (%s)' % (c + ('/'.join(pal[c]),)) for c in ambiguos - set(reglas))
    if sin_regla:
        aborta('colores de Lawang con dos tokens que en la piel de %s valen distinto, sin reglas en LAWANG_POR_CONTEXTO: %s'
               % (nombre, ', '.join(sin_regla)))
    # el papel: el acento sobre la hoja y blanco sobre el acento, ≥ 4,5:1
    acento, tinta = tuple(p['accent-gold']), tuple(p['on-background'])
    for a, b, que in ((acento, blanco, 'acento sobre el papel'), ((255, 255, 255), acento, 'blanco sobre la cabecera'), (tinta, blanco, 'tinta sobre el papel')):
        if D.contraste(a, b) < 4.5:
            aborta('papel de %s: %s por debajo de 4,5:1 (%.2f)' % (nombre, que, D.contraste(a, b)))
    h = lambda c: '#%02X%02X%02X' % tuple(c)
    # Un color que YA es de la piel no se toca, como no lo cuenta el barrido (revisor del merge de p42c, 13-oct): seleccion_css() escribe
    # los colores de la piel antes de este pase, y una piel con un valor igual a uno de Lawang (un crema de LAWANG_FAMILIAS) vería su
    # elegido retocado. Los de varios significados (reglas) siguen pasando por su regla: si no, su recuento no cuadraría.
    de_la_piel = {tuple(v) for v in p.values() if isinstance(v, (list, tuple)) and len(v) == 3}
    vistos = collections.Counter()
    n = 0
    for raiz, _dirs, fs in os.walk(dist):
        for f in fs:
            if not f.endswith(PIEL_EXT):
                continue
            ruta = os.path.join(raiz, f)
            rel = os.path.relpath(ruta, dist).replace(os.sep, '/')
            t = open(ruta, encoding='utf-8', newline='').read()   # newline='': un CRLF se queda CRLF (ni un byte que no sea color)
            nuevo = t
            for viejo, plantilla, tok in (x[1:] for x in PAPEL_FIJOS if x[0] == rel):
                if nuevo.count(viejo) != 1:
                    aborta('papel: %s ya no lleva UNA vez %r (¿cambió Lawang? mirar PAPEL_FIJOS)' % (rel, viejo))
                nuevo = nuevo.replace(viejo, plantilla % h(p[tok]))
            cambios = [0]

            def cambia(m):
                if _es_texto(m):
                    return m.group(0)
                c = _color_de(m)
                if c in de_la_piel and c not in reglas:
                    return m.group(0)   # ya es un color de la instancia (p. ej. lo que escribió seleccion_css antes del pase)
                if c in reglas:
                    ventana = m.string[max(0, m.start() - 80):m.end() + 40]
                    for i, (fr, ctx, dst, _n) in enumerate(reglas[c]):
                        if fr == rel and re.search(ctx, ventana):
                            vistos[(c, i)] += 1
                            cambios[0] += 1
                            return _pon_color(m, destino[dst] if dst else simple.get(c) or tuple(p[pal[c][0]]))
                    aborta('colores de Lawang: %s lleva %s sin clasificar (ni marca ni estado): «%s» → añadir su regla en LAWANG_POR_CONTEXTO'
                           % (rel, h(c), ventana.replace('\n', ' ')))
                if c in simple:
                    cambios[0] += 1
                    return _pon_color(m, simple[c])
                return m.group(0)
            nuevo = COLOR_RE.sub(cambia, nuevo)
            if nuevo != t:
                # ni un texto, ni un importe, ni un data-*: quitando los colores, antes y después son idénticos (el papel, por su línea).
                # OJO, lo que esta guarda NO ve: un texto con forma de color (el ejemplo «#42210B» de un campo) se quita igual en los dos
                # lados; eso lo protege _es_texto(), que lo deja fuera del pase y del barrido.
                antes = COLOR_RE.sub('§', t)
                for viejo, plantilla, _tok in (x[1:] for x in PAPEL_FIJOS if x[0] == rel):
                    antes = antes.replace(viejo, plantilla % '§')
                if COLOR_RE.sub('§', nuevo) != antes:
                    aborta('colores de Lawang: el pase cambió en %s algo que no es un color' % rel)
                open(ruta, 'w', encoding='utf-8', newline='').write(nuevo)
                n += cambios[0]
    mal = []
    for c, rs in reglas.items():
        for i, (fr, ctx, dst, cuantas) in enumerate(rs):
            # una pantalla que no sale en esta instancia (módulo apagado, poda) no cuenta; la que sale tiene que cuadrar
            if os.path.isfile(os.path.join(dist, *fr.split('/'))) and fr not in AVISOS_SIN_PANTALLA and vistos[(c, i)] != cuantas:
                mal.append('%s en %s («%s»): %d, se esperaban %d' % (h(c), fr, ctx or 'el resto', vistos[(c, i)], cuantas))
    if mal:
        aborta('colores de Lawang: cambió el recuento de un color ambiguo (¿una aparición nueva de Lawang?):\n  ' + '\n  '.join(mal))
    quedan = colores_lawang_en(dist, p, set(simple.values()) | set(destino.values()))
    if quedan:
        aborta('quedan colores de Lawang en el paquete de %s:\n  %s' % (nombre, '\n  '.join(quedan[:40])))
    return n


def colores_lawang_en(dist, p=None, escritos=()):
    """Barrido: fichero y color de cada color de Lawang (cualquier forma) que quede en lo publicado. Los que coinciden con un valor de
    la piel `p` o con uno que el pase acaba de ESCRIBIR (`escritos`: un verde casi blanco llevado al verde de la piel con su misma luz
    puede salir idéntico, #FBFDFC → #FBFDFC) no cuentan: son de la instancia aunque casen con uno de Lawang."""
    pal = lawang_paleta()
    propios = {tuple(v) for v in (p or {}).values()} | {tuple(c) for c in escritos}
    out = []
    for raiz, _dirs, fs in os.walk(dist):
        for f in fs:
            if not f.endswith(PIEL_EXT):
                continue
            ruta = os.path.join(raiz, f)
            rel = os.path.relpath(ruta, dist).replace(os.sep, '/')
            for m in COLOR_RE.finditer(open(ruta, encoding='utf-8').read()):
                c = _color_de(m)
                if c in pal and c not in propios and not _es_texto(m):
                    out.append('%s: %s (%s)' % (rel, m.group(0), '/'.join(pal[c])))
    return out


# La parada, ANTES y a quien la causa (orquestador, 13-oct): una sesión de Lawang que añade un color a un fichero que este build copia
# no sabe que deja parado el siguiente build de las instancias. El gate de push de Lawang (tools/predeploy.py, capa 0) llama a
# colores_lawang_diff() con su diff: misma tabla, mismas reglas de qué se copia, una sola fuente.
def lawang_que_lee_el_build():
    """Rutas de Lawang (relativas, con /) que el build de una instancia copia: la v4 (fuentes_v4(), lo que recorre copia_v4()), el CRM
    de leads, la puerta, y lo que todo eso referencia (REF_RE, como cierra_referencias()); de todo, solo lo que deja pasar se_copia(),
    la misma regla que copia() (revisor de p42c: sin ella, un .test.js o contracts/app.html daban un rojo falso al push de Lawang)."""
    cola = ['intranet/leads/index.html', 'intranet/leads/leads.css', 'intranet/leads/leads.js', 'intranet/index.html']
    cola += [os.path.relpath(s, LAWANG).replace(os.sep, '/') for s in fuentes_v4()]
    leidos = set()
    while cola:
        rel = cola.pop()
        ruta = os.path.join(LAWANG, *rel.split('/'))
        if rel in leidos or not os.path.isfile(ruta) or not se_copia(ruta):
            continue
        leidos.add(rel)
        if rel.endswith(EXT_TEXTO):
            cola += [m.group(1).lstrip('/') for m in REF_RE.finditer(open(ruta, encoding='utf-8', errors='replace').read())]
    return leidos


def _es_numero_de_referencia(m):
    """«Seguridad #163», «revisión #197»: un número corto de solo dígitos detrás de una palabra es una referencia en un comentario, no un
    color (el repaso de 14 días de Lawang dio tres así). Solo lo usa el aviso del gate: el pase de colores solo toca colores de la paleta."""
    return (m.group(2) or '').isdigit() and len(m.group(2)) in (3, 4) and bool(re.search(r'[^\W\d_]\s$', m.string[max(0, m.start() - 2):m.start()]))


def colores_lawang_diff(diff):
    """[(fichero, línea, color, para, qué hacer)] de cada color que un diff de LAWANG AÑADE en un fichero que este build copia y que el build
    no sabría llevar a la piel: uno con varios significados (LAWANG_POR_CONTEXTO: su recuento cambia y el build PARA) o uno que no es
    token, suelto, familia ni del maestro (se quedaría el tono de Lawang en las instancias). Cuenta NETO por fichero y color, como el
    recuento del build: retocar una línea que ya lo llevaba no avisa; solo una aparición de más. No cuentan blanco/negro, los ajenos con
    nombre, el texto (ayuda/placeholder) ni una línea con `predeploy-ok: <motivo>`. `para` = True si el build de las instancias PARARÍA
    (varios significados); False si solo se colaría el tono (aviso)."""
    lee, pal = lawang_que_lee_el_build(), lawang_paleta()
    ajenos = {_rgb_hex(h) for h in COLORES_AJENOS}
    mas, menos = collections.defaultdict(list), collections.Counter()
    fich, n, viejas, nuevas = None, 0, 0, 0
    for l in diff.split('\n'):
        # Dentro de un bloque @@ se cuentan las líneas que le quedan: una línea AÑADIDA que empiece por «++ » no es la cabecera «+++ »
        # de otro fichero (revisor de p42c). Fuera de un bloque, las cabeceras.
        if viejas <= 0 and nuevas <= 0:
            if l.startswith('+++ '):
                fich = l[6:].strip() if l.startswith('+++ b/') else None
            elif l.startswith('@@'):
                m = re.match(r'@@ -\d+(?:,(\d+))? \+(\d+)(?:,(\d+))? @@', l)
                if m:
                    viejas, n, nuevas = int(m.group(1) or 1), int(m.group(2)) - 1, int(m.group(3) or 1)
            continue
        if l.startswith('\\'):   # «\ No newline at end of file»
            continue
        if l[:1] == '-':
            viejas -= 1
        elif l[:1] == '+':
            nuevas -= 1
            n += 1
        else:
            viejas -= 1
            nuevas -= 1
            n += 1
        if l[:1] not in ('+', '-') or fich not in lee or not fich.endswith(PIEL_EXT) or 'predeploy-ok' in l:
            continue
        for m in COLOR_RE.finditer(l[1:]):
            c = _color_de(m)
            if _es_texto(m) or c in NEUTROS or c in ajenos or _es_numero_de_referencia(m):
                continue
            hx = '%02X%02X%02X' % c
            if hx not in LAWANG_POR_CONTEXTO and c in pal:
                continue
            if l[0] == '+':
                mas[(fich, hx)].append((n, m.group(0)))
            else:
                menos[(fich, hx)] += 1
    out = []
    for (fich, hx), apariciones in sorted(mas.items()):
        if len(apariciones) <= menos[(fich, hx)]:
            continue
        que = ('tiene varios significados (marca o estado) y el build de las instancias cuenta cada aparición: usa el token '
               '(rgb(var(--tema-…))) o añade su regla en LAWANG_POR_CONTEXTO' if hx in LAWANG_POR_CONTEXTO else
               'no es token de la tw.css de Lawang ni está en LAWANG_FAMILIAS: en las instancias se quedaría el tono de Lawang. Usa un '
               'token (rgb(var(--tema-…))) o clasifícalo en LAWANG_FAMILIAS')
        out += [(fich, ln, col, hx in LAWANG_POR_CONTEXTO, que) for ln, col in apariciones[menos[(fich, hx)]:]]
    return out


def _profundidad_llaves(css):
    return css.count('{') - css.count('}')


def paleta_clasica(nombre):
    """{var: (r, g, b)} de la suite clásica con los colores de la piel, o None sin piel. PARA si una pareja baja de 4,5:1."""
    p = _piel_preset(nombre)
    if p is None:
        return None
    faltan = sorted(({tok for _v, tok in PALETA_CLASICA} | {f[2] for f in CLASICA_FIJOS} | {'primary-container', 'on-background'}) - set(p))
    if faltan:
        aborta('la piel de %s no trae los tokens que pinta la suite clásica: %s (mirar PALETA_CLASICA y CLASICA_FIJOS)' % (nombre, ', '.join(faltan)))
    v = {var: tuple(p[tok]) for var, tok in PALETA_CLASICA}
    D = _deriva()
    if D.contraste((255, 255, 255), v['--ss']) < CLASICA_DESACTIVADO_MIN:
        aborta('suite clásica de %s: el botón desactivado (blanco sobre --ss) da %.2f:1, peor que en Lawang'
               % (nombre, D.contraste((255, 255, 255), v['--ss'])))
    color = lambda k: (255, 255, 255) if k == '#FFFFFF' else (v[k] if k in v else tuple(p[k]))
    bajas = ['%s/%s %.2f' % (a, b, D.contraste(color(a), color(b))) for a, b in CLASICA_CONTRASTE
             if D.contraste(color(a), color(b)) < 4.5]
    if bajas:
        aborta('suite clásica de %s por debajo de 4,5:1: %s' % (nombre, ', '.join(bajas)))
    return v


def paleta_clasica_css(nombre):
    """`html:root{--dl:#…}` de la suite clásica con la piel de la instancia, o '' sin piel."""
    v = paleta_clasica(nombre)
    if v is None:
        return ''
    return '\nhtml:root{%s}\n' % ';'.join('%s:#%02X%02X%02X' % ((var,) + v[var]) for var, _t in PALETA_CLASICA)


def piel_suite_clasica(dist, nombre):
    """Pone la piel en la puerta (/), en lo que carga axw.css, en /crea-contrasena/ y en el marco de la mascota. Sin piel no toca nada (Lawang, demo).
    Va ANTES de versiona(): el ?v= de axw.css tiene que cambiar o la CDN sirve la hoja vieja (como pasó con el favicon)."""
    css = paleta_clasica_css(nombre)
    if not css:
        return 0
    p = _piel_preset(nombre)
    fmt = {'hex': lambda c: '#%02X%02X%02X' % c, 'rgba': lambda c: 'rgba(%d,%d,%d,' % c,
           'rgba.15': lambda c: 'rgba(%d,%d,%d,.15)' % c, 'rgba.22': lambda c: 'rgba(%d,%d,%d,.22)' % c}
    textos = {}
    for rel in sorted({'contracts/assets/axw.css', 'index.html', 'crea-contrasena/index.html'} | {f[0] for f in CLASICA_FIJOS}):
        ruta = os.path.join(dist, rel)
        if not os.path.isfile(ruta):
            aborta('piel de la suite clásica: falta %s en el paquete' % rel)
        textos[rel] = open(ruta, encoding='utf-8').read()
    for rel, literal, tok, f in CLASICA_FIJOS:
        if literal not in textos[rel]:
            aborta('piel de la suite clásica: %s ya no lleva %r (¿cambió Lawang? mirar CLASICA_FIJOS)' % (rel, literal))
        textos[rel] = textos[rel].replace(literal, fmt[f](tuple(p[tok])))
    # axw.css: la regla al final, con las llaves cerradas (no dentro de un @media colgado)
    if _profundidad_llaves(textos['contracts/assets/axw.css']) != 0:
        aborta('piel de la suite clásica: axw.css no cierra sus llaves; la regla quedaría dentro de un bloque')
    textos['contracts/assets/axw.css'] += css
    # las dos páginas: al final de su ÚNICO <style> propio con :root (la CSP de la instancia admite style en línea)
    for rel in ('index.html', 'crea-contrasena/index.html'):
        t = textos[rel]
        m = [x for x in re.finditer(r'<style>(.*?)</style>', t, flags=re.S) if ':root{' in x.group(1).replace(' ', '')]
        if len(m) != 1 or _profundidad_llaves(m[0].group(1)) != 0:
            aborta('piel de la suite clásica: %s no tiene UN <style> con :root y llaves cerradas' % rel)
        textos[rel] = t[:m[0].end(1)] + css + t[m[0].end(1):]
    for rel, t in textos.items():
        open(os.path.join(dist, rel), 'w', encoding='utf-8', newline='').write(t)
    return len(textos)


# La puerta (/) de una instancia (12-oct-2026, verificador sobre la 2.ª de bbm; orquestador): (1) bbm sale en indonesio y el botón
# de idioma de la puerta vive en la barra de la app, que en la puerta está oculta (display:none): quien no lee indonesio no podía
# cambiar de idioma antes de entrar. Con MÁS de un idioma declarado, la tarjeta de entrada lleva un selector visible con SUS idiomas,
# que usa el mismo lwSetIdioma que la barra (idioma.js, cargado en el <head> de la puerta). (2) El placeholder del correo venía de
# Lawang con su dominio y, tras los reemplazos de marca, decía «nombre@axisworks.studio»: neutro en toda instancia. (3) La marca
# de dos líneas a 390 px quedaba alineada a la izquierda bajo un «INTRANET» centrado. Enganche estable: #loginEmail, #fLogin, .marca.
NOMBRE_IDIOMA = {'id': 'Bahasa Indonesia', 'en': 'English', 'es': 'Español'}
PUERTA_CORREO = 'email@example.com'
PUERTA_CSS = ('.lw-login .marca .word{text-align:center}'
              '.lw-login .lw-login-idioma{display:flex;justify-content:center;gap:6px;margin-top:18px}'
              '.lw-login .lw-login-idioma[hidden]{display:none}'
              '.lw-login .lw-login-idioma button{width:auto;margin:0;padding:5px 12px;font-size:12px;font-weight:600;letter-spacing:.06em;'
              'color:var(--ink-2);background:transparent;border:1px solid var(--line-fuerte);border-radius:999px;cursor:pointer}'
              '.lw-login .lw-login-idioma button[aria-pressed="true"]{color:#fff;background:var(--dl);border-color:var(--dl);cursor:default}')
PUERTA_JS = ('(function(){var d=document.querySelector(\'[data-lw="login-idioma"]\');if(!d||!window.lwSetIdioma)return;'
             'var b=d.querySelectorAll("button[data-idioma]");for(var i=0;i<b.length;i++)(function(x){var c=x.getAttribute("data-idioma"),'
             'on=c===window.LW_IDIOMA;x.setAttribute("aria-pressed",on?"true":"false");x.addEventListener("click",function(){if(c!==window.LW_IDIOMA)'
             '{window.lwSetIdioma(c);location.reload();}});})(b[i]);d.hidden=false;})();')


HUB_CAPA = 'contracts/assets/modulos_hub.js'


def capa_modulos_hub(interruptores):
    """La capa de módulos (apagados_instancia.js) también en el hub de entrada (12-oct-2026, medido por bbm-p17-backend con la cuenta de
    pruebas: el panel de herramientas lanzaba 403 a crm_leads_resumen, contrato_firmas_equipo ×2 y auditoria_firmas, de módulos apagados).
    El hub (index.html de la raíz = intranet/index.html de Lawang) NO carga guard.js, que es donde va pegada la capa; él mismo crea el
    cliente y lo publica en window.LW_SB, que es lo que la capa espera. Se copia la MISMA capa a un fichero propio y se carga antes que
    instancia.js: así sus llamadas a funciones de un módulo apagado se contestan sin salir a la red, igual que en el resto de pantallas.
    PARA si el hub cambió de forma (sin su window.LW_SB = sb o sin UNA carga de instancia.js). Lawang no pasa por aquí."""
    hub = os.path.join(DIST, 'index.html')
    if not os.path.isfile(hub):
        return
    t = open(hub, encoding='utf-8').read()
    if not re.search(r'window\.LW_SB\s*=\s*sb\b', t):   # limpia_publico ya lo ha compactado: «window.LW_SB=sb»
        aborta('hub: index.html ya no publica su cliente en window.LW_SB (la capa de módulos no tendría con qué preguntar)')
    cargas = re.findall(r'<script src="/contracts/assets/instancia\.js[^"]*"></script>', t)
    if len(cargas) != 1:
        aborta('hub: index.html no tiene UNA carga de /contracts/assets/instancia.js (la capa de módulos va justo antes)')
    os.makedirs(os.path.dirname(os.path.join(DIST, HUB_CAPA)), exist_ok=True)
    open(os.path.join(DIST, HUB_CAPA), 'w', encoding='utf-8', newline='').write(interruptores)
    t = t.replace(cargas[0], '<script src="/%s"></script>%s' % (HUB_CAPA, cargas[0]))
    open(hub, 'w', encoding='utf-8', newline='').write(t)


def puerta_instancia(dist, idiomas):
    """Selector de idioma visible en la tarjeta de entrada (si hay más de un idioma), correo de ejemplo neutro y marca centrada.
    Devuelve True si puso el selector. PARA si la puerta cambió de forma (sin #loginEmail, #fLogin o su <style> con .lw-login)."""
    ruta = os.path.join(dist, 'index.html')
    t = open(ruta, encoding='utf-8').read()
    m = re.findall(r'<input[^>]*id="loginEmail"[^>]*>', t)
    if len(m) != 1 or 'placeholder="' not in m[0]:
        aborta('puerta: index.html ya no tiene UN #loginEmail con placeholder (¿cambió la puerta de Lawang?)')
    t = t.replace(m[0], re.sub(r'placeholder="[^"]*"', 'placeholder="%s"' % PUERTA_CORREO, m[0]))
    estilos = [x for x in re.finditer(r'<style>(.*?)</style>', t, flags=re.S) if '.lw-login' in x.group(1)]
    if len(estilos) != 1 or _profundidad_llaves(estilos[0].group(1)) != 0:
        aborta('puerta: index.html no tiene UN <style> con .lw-login y llaves cerradas')
    t = t[:estilos[0].end(1)] + '\n' + PUERTA_CSS + '\n' + t[estilos[0].end(1):]
    selector = bool(idiomas) and len(idiomas) > 1
    if selector:
        i = t.find('id="fLogin"')
        j = t.find('</form>', i) if i >= 0 else -1
        if i < 0 or j < 0 or t.count('id="fLogin"') != 1:
            aborta('puerta: index.html ya no tiene UN <form id="fLogin"> (el selector de idioma va justo después)')
        botones = ''.join('<button type="button" data-idioma="%s" lang="%s" title="%s" aria-label="%s">%s</button>'
                          % (c, c, NOMBRE_IDIOMA[c], NOMBRE_IDIOMA[c], c.upper()) for c in idiomas)
        bloque = ('<div class="lw-login-idioma" data-lw="login-idioma" role="group" aria-label="Bahasa / Language" hidden>%s</div>'
                  '<script>%s</script>' % (botones, PUERTA_JS))
        j += len('</form>')
        t = t[:j] + bloque + t[j:]
    open(ruta, 'w', encoding='utf-8', newline='').write(t)
    return selector


# Rótulos del MENÚ y de pestañas compartidas que pone el maestro (12-oct-2026, owner en bbm en inglés: «Taller», «Entrega» y
# «Flota y tarifas» seguían en español, y «Puesta en marcha» en la pestaña de Ajustes). Cada pantalla trae su diccionario y lo
# añade a LW_EN / LW_ID al cargar, así que su rótulo solo se traducía en el menú de SU página. Aquí van una vez, en i18n.js
# (lo cargan todas), después del núcleo del indonesio (que crea LW_ID); una clave que ya exista no se pisa. Las traducciones son
# las mismas que ya usan esas pantallas.
MENU_I18N = {
    'Taller': {'en': 'Workshop', 'id': 'Bengkel'},
    'Entrega': {'en': 'Delivery', 'id': 'Antar'},
    'Flota y tarifas': {'en': 'Fleet and rates', 'id': 'Armada dan tarif'},
    'Ventas': {'en': 'Sales', 'id': 'Penjualan'},
    # paginador común (bbm-cola-2 T1, 15-oct): el inglés ya está en el diccionario de Lawang y no se pisa; aquí entra el indonesio
    '← Anteriores': {'en': '← Previous', 'id': '← Sebelumnya'},
    'Siguientes →': {'en': 'Next →', 'id': 'Berikutnya →'},
    'de': {'en': 'of', 'id': 'dari'},
    # cabecera del CSV de Gastos, ahora por T (bbm-cola-2 T1, 15-oct): las que el diccionario de Lawang no tenía, y el indonesio de todas
    'Nº factura': {'en': 'Invoice no.', 'id': 'No. invoice'},
    'Impuesto': {'en': 'Tax', 'id': 'Pajak'},
    'Tipo PPh': {'en': 'PPh type', 'id': 'Jenis PPh'},
    'Cuenta de pago': {'en': 'Payment account', 'id': 'Rekening pembayaran'},
    'Motivo anulación': {'en': 'Cancellation reason', 'id': 'Alasan pembatalan'},
    'Proveedor': {'en': 'Supplier', 'id': 'Pemasok'},
    'Categoría': {'en': 'Category', 'id': 'Kategori'},
    'Concepto': {'en': 'Concept', 'id': 'Keterangan'},
    'Base': {'en': 'Base', 'id': 'DPP'},
    'Total': {'en': 'Total', 'id': 'Total'},
    'Retención PPh': {'en': 'PPh withholding', 'id': 'Pemotongan PPh'},
    'Retención ingresada': {'en': 'Withholding paid', 'id': 'Pemotongan disetor'},
    'Moneda': {'en': 'Currency', 'id': 'Mata uang'},
    'Vence': {'en': 'Due', 'id': 'Jatuh tempo'},
    'Pagado el': {'en': 'Paid on', 'id': 'Dibayar pada'},
    'Reservas de producto': {'en': 'Product bookings', 'id': 'Booking sewa motor'},
    'Configurar módulos': {'en': 'Module setup', 'id': 'Penyiapan modul'},
    'Interruptores de comisiones': {'en': 'Commission switches', 'id': 'Sakelar komisi'},
    # rótulos que whatsapp_bot_pantalla() injerta en el menú (idiomas-pH, 12-oct): el menú los pasa por lwT aunque estén ocultos
    'Bot de WhatsApp': {'en': 'WhatsApp bot', 'id': 'Bot WhatsApp'},
    'Bot de WhatsApp · alta': {'en': 'WhatsApp bot · sign-up', 'id': 'Bot WhatsApp · pendaftaran'},
    # textos_instancia() (owner, 12-oct): lo que sustituye a proyectos, villas y Cartas de Reserva en las pantallas comunes
    'Referencia': {'en': 'Reference', 'id': 'Referensi'},
    'Ej. Reserva R-0012 — Honda PCX': {'en': 'e.g. Booking R-0012 — Honda PCX', 'id': 'Contoh: Booking R-0012 — Honda PCX'},
    'Ej. Reserva R-0012': {'en': 'e.g. Booking R-0012', 'id': 'Contoh: Booking R-0012'},
    'Buscar por número, cliente o reserva…': {'en': 'Search by number, client or booking…', 'id': 'Cari nomor, pelanggan, atau booking…'},
    'Lo que el sistema aplica solo y no hace falta tocar en el código: el nombre y la zona horaria de la instalación, el correo y el modo mantenimiento. Cambiarlos aquí vale desde ese momento, y cada cambio queda en el registro.': {
        'en': 'What the system applies by itself, with no need to touch the code: the installation name and time zone, email and maintenance mode. Changes made here apply from that moment, and every change is logged.',
        'id': 'Yang diterapkan sistem secara otomatis, tanpa perlu mengubah kode: nama dan zona waktu instalasi, email, dan mode pemeliharaan. Perubahan di sini langsung berlaku, dan setiap perubahan tercatat.'},
    'Impuestos': {'en': 'Taxes', 'id': 'Pajak'},
    'Plazos': {'en': 'Time limits', 'id': 'Batas waktu'},
    # rótulos FIJOS que build.py pone en el HTML de Ajustes (pestañas y cabeceras): su traducción tiene que estar ANTES de que la página traduzca el
    # HTML; la de setup_modulos.js / ajustes_puesta.js llega tarde (agencia-81, 12-oct: la pestaña «Cobros en línea» salía en español en inglés).
    # Lo comprueba rotulos_build.test.js. Mismas traducciones que esos ficheros.
    'Cobros en línea': {'en': 'Online payments', 'id': 'Pembayaran online'},
    'Las claves de Xendit con las que el ERP crea el enlace de pago y comprueba los pagos. Se escriben una vez y no se vuelven a enseñar.': {
        'en': 'The Xendit keys the ERP uses to create payment links and check payments. They are typed once and never shown again.',
        'id': 'Kunci Xendit yang dipakai ERP untuk membuat tautan pembayaran dan memeriksa pembayaran. Diketik sekali dan tidak ditampilkan lagi.'},
    'Lo que hace falta para que cada módulo funcione': {'en': 'What each module needs in order to work', 'id': 'Yang dibutuhkan setiap modul agar berfungsi'},
    'Cada módulo encendido, con sus pasos. Se cambian aquí o con el asistente, paso a paso.': {
        'en': 'Every module that is switched on, with its steps. Change them here or with the wizard, step by step.',
        'id': 'Setiap modul yang aktif, beserta langkah-langkahnya. Ubah di sini atau dengan panduan, langkah demi langkah.'},
    'Trayendo la configuración…': {'en': 'Loading the setup…', 'id': 'Memuat pengaturan…'},
    '¿Eres cliente?': {'en': 'Are you a client?', 'id': 'Anda pelanggan?'},
    'Empresa, correo, impuestos y usuarios del ERP.': {'en': 'Company, email, taxes and users of the ERP.', 'id': 'Perusahaan, email, pajak, dan pengguna ERP.'},
    # bbm-p39 (13-oct): Facturas, Recibos y Ajustes › Mantenimiento sin contratos, proyectos ni portal de compradores
    'Cliente': {'en': 'Client', 'id': 'Pelanggan'},
    'sin referencia': {'en': 'no reference', 'id': 'tanpa referensi'},
    # corto a propósito: el de Lawang ya se cortaba en el buscador a 1440 (gate impeccable, bbm-p39)
    'Número, cliente, factura o referencia…': {'en': 'Number, client, invoice or reference…', 'id': 'Nomor, pelanggan, invoice, referensi…'},
    # bbm-p40 (13-oct): la nota del alta de usuario sin el módulo proyectos (el inglés ya está en Lawang; esta línea no lo pisa)
    'Se crea la cuenta y se le da acceso de inmediato.': {'en': 'The account is created and access granted immediately.', 'id': 'Akun dibuat dan aksesnya langsung diberikan.'},
    # el formulario «Nuevo usuario» salía en indonesio con trozos en inglés y en español (medido en el paquete de bbm, 13-oct); en inglés, con la
    # contraseña y las ayudas en español. Una clave que Lawang ya traduce al inglés conserva su inglés (menu_i18n no lo pisa).
    'Nuevo usuario': {'en': 'New user', 'id': 'Pengguna baru'},
    'Crear usuario': {'en': 'Create user', 'id': 'Buat pengguna'},
    # N4/T F2 (14-oct): el alta por invitación y el reenvío desde la ficha
    'Enviar invitación': {'en': 'Send invitation', 'id': 'Kirim undangan'},
    'Reenviar invitación': {'en': 'Resend invitation', 'id': 'Kirim ulang undangan'},
    'Le llega un correo con un enlace para poner su contraseña: nadie más la ve. Hasta que la ponga no puede entrar.': {
        'en': 'They get an email with a link to set their password: nobody else sees it. Until they set it, they cannot sign in.',
        'id': 'Dia menerima email berisi tautan untuk membuat kata sandinya: tidak ada orang lain yang melihatnya. Sebelum dibuat, dia belum bisa masuk.'},
    'Le llega un correo con un enlace para poner su contraseña: nadie más la ve. Hasta que la ponga no puede entrar. Nace sin ningún proyecto asignado — se asigna después editando la ficha ya creada.': {
        'en': 'They get an email with a link to set their password: nobody else sees it. Until they set it, they cannot sign in. The account starts with no project assigned; assign one later by editing the profile.',
        'id': 'Dia menerima email berisi tautan untuk membuat kata sandinya: tidak ada orang lain yang melihatnya. Sebelum dibuat, dia belum bisa masuk. Akun dimulai tanpa proyek; tetapkan nanti dengan mengedit profilnya.'},
    'Invitación enviada a %e: pondrá su contraseña desde el correo.': {
        'en': 'Invitation sent to %e: they will set their password from the email.', 'id': 'Undangan terkirim ke %e: dia akan membuat kata sandi dari email.'},
    'Invitación creada para %e, pero el correo no ha salido: reenvíala desde su ficha («Reenviar invitación») cuando el correo funcione.': {
        'en': 'Invitation created for %e, but the email did not go out: resend it from their profile (“Resend invitation”) once email works.',
        'id': 'Undangan dibuat untuk %e, tetapi email tidak terkirim: kirim ulang dari profilnya («Kirim ulang undangan») setelah email berfungsi.'},
    'Invitación reenviada a %e.': {'en': 'Invitation resent to %e.', 'id': 'Undangan dikirim ulang ke %e.'},
    'El correo no ha salido: revisa Ajustes › Correo. Podrás reenviarla dentro de una hora.': {
        'en': 'The email did not go out: check Settings › Email. You can resend it in an hour.',
        'id': 'Email tidak terkirim: periksa Pengaturan › Email. Anda bisa mengirim ulang dalam satu jam.'},
    'No tiene ninguna invitación pendiente: ya entró con su contraseña.': {
        'en': 'There is no pending invitation: they already signed in with their password.', 'id': 'Tidak ada undangan yang tertunda: dia sudah masuk dengan kata sandinya.'},
    'Ya se le envió hace menos de una hora: espera antes de reenviarla.': {
        'en': 'It was sent less than an hour ago: wait before resending it.', 'id': 'Sudah dikirim kurang dari satu jam lalu: tunggu sebelum mengirim ulang.'},
    'Esta invitación ya se ha reenviado 5 veces: no se reenvía más. Revisa que el correo esté bien escrito.': {
        'en': 'This invitation has already been resent 5 times: it will not be resent again. Check that the email address is correct.',
        'id': 'Undangan ini sudah dikirim ulang 5 kali: tidak akan dikirim lagi. Periksa apakah alamat email sudah benar.'},
    'Solo un super admin reenvía la invitación de un administrador.': {
        'en': 'Only a super admin can resend an administrator’s invitation.', 'id': 'Hanya super admin yang bisa mengirim ulang undangan administrator.'},
    'Esta invitación no se reenvía desde aquí: la del administrador principal va por el panel del estudio.': {
        'en': 'This invitation is not resent from here: the main administrator’s goes through the studio panel.',
        'id': 'Undangan ini tidak dikirim ulang dari sini: undangan administrator utama lewat panel studio.'},
    'No se pudo: %e': {'en': 'Could not do it: %e', 'id': 'Tidak bisa: %e'},
    'No se pudo: sesión no encontrada.': {'en': 'Could not do it: session not found.', 'id': 'Tidak bisa: sesi tidak ditemukan.'},
    'Cerrar panel': {'en': 'Close panel', 'id': 'Tutup panel'},
    'Datos': {'en': 'Details', 'id': 'Data'},
    'Opciones': {'en': 'Options', 'id': 'Opsi'},
    'Campos requeridos': {'en': 'Required fields', 'id': 'Wajib diisi'},
    'Faltan %n de %m datos obligatorios': {'en': '%n of %m required fields missing', 'id': 'Kurang %n dari %m data wajib'},
    'Sales manager': {'en': 'Sales manager', 'id': 'Manajer penjualan'},
    'Project manager': {'en': 'Project manager', 'id': 'Manajer proyek'},
    'Administrador': {'en': 'Administrator', 'id': 'Administrator'},
    'CRM de leads': {'en': 'Lead CRM', 'id': 'CRM prospek'},
    'Herramientas que verá': {'en': 'Tools they will see', 'id': 'Alat yang akan dilihat'},
    'Contraseña provisional': {'en': 'Temporary password', 'id': 'Kata sandi sementara'},
    'Permisos de %n': {'en': 'Permissions of %n', 'id': 'Izin %n'},
    'Guardar permisos': {'en': 'Save permissions', 'id': 'Simpan izin'},
    'Activo': {'en': 'Active', 'id': 'Aktif'},
    'Mínimo 10 caracteres. La verá al entrar; que la cambie después. No se puede volver a consultar.': {
        'en': 'At least 10 characters. They will see it when signing in and should change it afterwards. It cannot be looked up again.',
        'id': 'Minimal 10 karakter. Akan terlihat saat masuk; minta dia menggantinya setelah itu. Tidak bisa dilihat lagi.'},
    'Nunca preseleccionada: Leads abre datos de contacto de personas reales y se decide una a una, nunca de regalo con el rol.': {
        'en': 'Never preselected: Leads opens the contact details of real people, so it is decided one by one, never handed out with the role.',
        'id': 'Tidak pernah dipilih otomatis: Leads membuka data kontak orang sungguhan, jadi diputuskan satu per satu, tidak ikut otomatis dengan peran.'},
    'Preselección según el rol elegido arriba — editable. Solo aparecen las herramientas que tienes tú.': {
        'en': 'Preselected from the role chosen above — editable. Only the tools you have yourself appear.',
        'id': 'Dipilih otomatis sesuai peran di atas — bisa diubah. Hanya alat yang Anda miliki yang muncul.'},
    'En pausa no sale ningún email: ni invitaciones, ni avisos, ni comunicados. Lo bloquea el servidor, no esta pantalla. Lo que se encola en Comunicación espera y sale solo al reanudar. Pausar y reanudar: cualquier admin.': {
        'en': 'While paused no email goes out: no invitations, no alerts, no announcements. The server blocks it, not this screen. Whatever is queued in Communication waits and goes out by itself on resume. Pause and resume: any admin.',
        'id': 'Saat dijeda, tidak ada email yang terkirim: tidak ada undangan, peringatan, maupun pengumuman. Server yang memblokirnya, bukan layar ini. Yang masuk antrean di Komunikasi akan menunggu dan terkirim otomatis saat dilanjutkan. Menjeda dan melanjutkan: admin mana pun.'},
    'Cerrada, solo entran los admins: el resto del equipo ve una pantalla de mantenimiento con el motivo, y quien esté dentro recibe un aviso y se le cierra a los 3 minutos. Es una puerta de pantalla: no cambia los permisos de la base de datos. Cerrar y reabrir: cualquier admin.': {
        'en': 'When closed, only admins get in: the rest of the team sees a maintenance screen with the reason, and anyone inside gets a warning and is signed out after 3 minutes. It is a screen gate: it does not change database permissions. Closing and reopening: any admin.',
        'id': 'Saat ditutup, hanya admin yang bisa masuk: anggota tim lain melihat layar pemeliharaan beserta alasannya, dan siapa pun yang sedang berada di dalam menerima peringatan lalu dikeluarkan setelah 3 menit. Ini hanya pintu di layar: izin basis data tidak berubah. Menutup dan membuka kembali: admin mana pun.'},
}


# bbm-idiomas (15-oct-2026, owner: «/ajustes/ no puede salir en español, ¿tengo que ir ventana a ventana avisándote?»): lo que el barrido de
# pantallas (pruebas/idiomas_pantallas.harness.cjs, todas las del paquete, todos los módulos) encontró en español y no era una clave del
# diccionario. Lo pinta traduce_instancia.js (el HTML de Lawang sin marca de diccionario) o lwT (lo que ya pasaba por él sin clave). Inglés: el término que
# ya usa el diccionario de Lawang para lo mismo (Reparto → Routing, Escrow); indonesio: glosario_id.json (rekening para la cuenta bancaria,
# perusahaan, kuitansi, invoice). Traducción automática SIN REVISAR por un hablante nativo (departamentos/idiomas: ISO 18587); la valida el
# equipo de Dion como el resto del glosario. Lo que ya tenía inglés en Lawang solo recibe aquí su indonesio (una clave EN existente no se pisa).
MENU_I18N.update({
    # Gastos: la primera categoría al vuelo (agencia-c0, 15-oct; GASTOS_INSTANCIA)
    'Primero, una categoría': {'en': 'First, a category', 'id': 'Pertama, satu kategori'},
    'Cada gasto va en una categoría y aún no hay ninguna. Crea la primera: después podrás añadir más.': {
        'en': 'Every expense goes into a category and there are none yet. Create the first one: you can add more later.',
        'id': 'Setiap pengeluaran masuk ke satu kategori dan belum ada satu pun. Buat yang pertama: nanti Anda bisa menambah lagi.'},
    'Nombre de la categoría': {'en': 'Category name', 'id': 'Nama kategori'},
    'Crear y seguir': {'en': 'Create and continue', 'id': 'Buat dan lanjut'},
    'El nombre va de 1 a 80 caracteres y no empieza por = + - @.': {
        'en': "The name must be 1 to 80 characters and can't start with = + - @.", 'id': 'Nama 1 sampai 80 karakter dan tidak diawali = + - @.'},
    'No se pudo crear la categoría': {'en': 'The category could not be created', 'id': 'Kategori tidak dapat dibuat'},
    'Aún no hay categorías de gasto: la primera se crea al pulsar «Nuevo gasto».': {
        'en': 'There are no expense categories yet: the first one is created when you press «New expense».',
        'id': 'Belum ada kategori pengeluaran: yang pertama dibuat saat Anda menekan «Pengeluaran baru».'},
    # Cuentas de cobro y reparto (pantalla de Lawang sin marca de diccionario)
    'Cuentas de Cobro & Reparto': {'en': 'Payment Accounts & Routing', 'id': 'Rekening Pembayaran & Alokasi'},
    'Las cuentas a las que transfiere el cliente, y qué cuenta puede elegir el agente en cada documento y en cada proyecto.': {
        'en': 'The accounts the client transfers to, and which account the agent can choose on each document and each project.',
        'id': 'Rekening tujuan transfer pelanggan, dan rekening mana yang dapat dipilih agen di setiap dokumen dan setiap proyek.'},
    'Ver el reparto lo puede cualquier admin; cambiarlo exige super admin, y el permiso lo comprueba la base. La clave de una cuenta no se edita nunca: viaja dentro de cada documento ya emitido.': {
        'en': 'Any admin can see the routing; changing it requires a super admin, and the database checks the permission. An account key is never edited: it travels inside every document already issued.',
        'id': 'Setiap admin dapat melihat alokasi; mengubahnya memerlukan super admin, dan izinnya diperiksa oleh basis data. Kode rekening tidak pernah diubah: kode itu ikut di setiap dokumen yang sudah diterbitkan.'},
    'Cuentas activas': {'en': 'Active accounts', 'id': 'Rekening aktif'},
    'dadas de alta': {'en': 'registered', 'id': 'terdaftar'},   # «de ⟨n⟩ dadas de alta»: el número va en su propio <span data-lw>
    'Cuentas de cobro': {'en': 'Payment accounts', 'id': 'Rekening pembayaran'},
    'Depósito en garantía': {'en': 'Escrow deposit', 'id': 'Deposit escrow'},
    'cuentas escrow': {'en': 'escrow accounts', 'id': 'rekening escrow'},
    'Documentos que cobran': {'en': 'Documents that collect payment', 'id': 'Dokumen yang menagih'},
    'plantillas de pago': {'en': 'payment templates', 'id': 'templat pembayaran'},
    'Sin cuenta marcada': {'en': 'No account selected', 'id': 'Tanpa rekening terpilih'},
    'ningún documento vivo se queda sin cuenta': {'en': 'no live document is left without an account', 'id': 'tidak ada dokumen aktif tanpa rekening'},
    'Nueva cuenta': {'en': 'New account', 'id': 'Rekening baru'},
    'Por contrato': {'en': 'By contract', 'id': 'Per kontrak'},
    'Por proyecto': {'en': 'By project', 'id': 'Per proyek'},
    'Por cuenta': {'en': 'By account', 'id': 'Per rekening'},
    'Reparto': {'en': 'Routing', 'id': 'Alokasi'},
    'Qué cuentas puede elegir el agente en cada contrato': {'en': 'Which accounts the agent can choose on each contract', 'id': 'Rekening yang dapat dipilih agen di setiap kontrak'},
    'Cuentas ofrecidas': {'en': 'Accounts offered', 'id': 'Rekening yang ditawarkan'},
    'Ningún tipo de contrato registrado.': {'en': 'No contract type registered.', 'id': 'Belum ada jenis kontrak terdaftar.'},
    'Las cuentas dadas de alta': {'en': 'Registered accounts', 'id': 'Rekening terdaftar'},
    'Ninguna cuenta dada de alta.': {'en': 'No account registered.', 'id': 'Belum ada rekening terdaftar.'},
    'Ningún proyecto activo.': {'en': 'No active project.', 'id': 'Tidak ada proyek aktif.'},
    'Qué proyectos tienen reglas propias, fuera del reparto general': {'en': 'Which projects have their own rules, outside the general routing', 'id': 'Proyek dengan aturan sendiri, di luar alokasi umum'},
    'En cuántos documentos se ofrece cada cuenta': {'en': 'On how many documents each account is offered', 'id': 'Di berapa dokumen setiap rekening ditawarkan'},
    'Con contrato': {'en': 'With contract', 'id': 'Dengan kontrak'},
    'En firma': {'en': 'Out for signing', 'id': 'Dalam penandatanganan'},
    'Trayendo los clientes…': {'en': 'Loading clients…', 'id': 'Memuat pelanggan…'},
    'Todos los vencimientos': {'en': 'All payments', 'id': 'Semua jatuh tempo'},
    'Incluir sin firmar': {'en': 'Include unsigned', 'id': 'Sertakan yang belum ditandatangani'},
    'Ver más hechos': {'en': 'See more events', 'id': 'Lihat kejadian lainnya'},
    'Enviar': {'en': 'Send', 'id': 'Kirim'},
    'Mes': {'en': 'Month', 'id': 'Bulan'},
    # Comunicación
    'Aún no hay comunicados. Escribe el primero a la izquierda.': {'en': 'No announcements yet. Write the first one on the left.', 'id': 'Belum ada pengumuman. Tulis yang pertama di sebelah kiri.'},
    'No se pudieron traer los comunicados.': {'en': 'Could not load the announcements.', 'id': 'Pengumuman tidak dapat dimuat.'},
    'Vista previa del email': {'en': 'Email preview', 'id': 'Pratinjau email'},
    # Finanzas y Bancos
    'Base sin impuesto de los gastos registrados': {'en': 'Pre-tax amount of recorded expenses', 'id': 'DPP pengeluaran yang tercatat'},
    'Recibís cobrados menos gastos y comisiones pagados': {'en': 'Receipts collected minus expenses and commissions paid', 'id': 'Kuitansi yang tertagih dikurangi pengeluaran dan komisi yang dibayar'},
    'Se solapa con «Firmado por cobrar»: no se suman.': {'en': 'It overlaps with «Signed, to collect»: they are not added together.', 'id': 'Tumpang tindih dengan «Ditandatangani, belum ditagih»: tidak dijumlahkan.'},
    'Firmado por cobrar': {'en': 'Signed, to collect', 'id': 'Ditandatangani, belum ditagih'},
    'Secciones de Finanzas': {'en': 'Finance sections', 'id': 'Bagian Keuangan'},
    'Saldos por cuenta': {'en': 'Balances by account', 'id': 'Saldo per rekening'},
    'cobrado por contrato': {'en': 'collected per contract', 'id': 'tertagih per kontrak'},
    'calendario de pagos': {'en': 'payment schedule', 'id': 'jadwal pembayaran'},
    'facturas y recibís': {'en': 'invoices and receipts', 'id': 'invoice dan kuitansi'},
    'pendiente por factura': {'en': 'outstanding per invoice', 'id': 'sisa per invoice'},
    'unidades': {'en': 'units', 'id': 'unit'},
    'solicitudes de pago': {'en': 'payment requests', 'id': 'permintaan pembayaran'},
    'comisiones': {'en': 'commissions', 'id': 'komisi'},
    # «No se ha podido cargar «⟨qué⟩» …» (datos.js de Lawang): lo que va entre comillas, para PATRONES_INSTANCIA
    'ajustes': {'en': 'settings', 'id': 'pengaturan'},
    'compradores': {'en': 'clients', 'id': 'pelanggan'},
    'cuentas bancarias': {'en': 'bank accounts', 'id': 'rekening bank'},
    'facturas': {'en': 'invoices', 'id': 'invoice'},
    'historial de sociedades': {'en': 'company history', 'id': 'riwayat perusahaan'},
    'impuestos': {'en': 'taxes', 'id': 'pajak'},
    'operaciones': {'en': 'deals', 'id': 'transaksi'},
    'proyectos': {'en': 'projects', 'id': 'proyek'},
    'recibís': {'en': 'receipts', 'id': 'kuitansi'},
    'sociedades': {'en': 'companies', 'id': 'perusahaan'},
    'tipos de contrato': {'en': 'contract types', 'id': 'jenis kontrak'},
    # Ajustes y su asistente (setup_modulos.js y Lawang): frases que pasan por lwT sin clave
    'Configurar': {'en': 'Configure', 'id': 'Atur'},
    'No se ha podido mirar la configuración': {'en': 'Could not check the configuration', 'id': 'Konfigurasi tidak dapat diperiksa'},
    'No se ha podido hacer. Si vuelve a pasar, avisa al estudio.': {'en': 'That could not be done. If it happens again, let the studio know.', 'id': 'Tidak dapat dilakukan. Jika terjadi lagi, beri tahu studio.'},
    '«Tu reserva está confirmada.»': {'en': '«Your booking is confirmed.»', 'id': '«Booking Anda sudah dikonfirmasi.»'},
    # Alta del bot de WhatsApp (bot_alta.html: pasa por lwT y no tenía clave)
    'Condiciones del servicio': {'en': 'Terms of service', 'id': 'Ketentuan layanan'},
    'Cuando todo esté completo, el estudio enciende el bot desde su panel.': {'en': 'When everything is complete, the studio switches the bot on from its panel.', 'id': 'Setelah semuanya lengkap, studio menyalakan bot dari panelnya.'},
    'Todavía no hay condiciones publicadas: avisa al estudio.': {'en': 'No terms published yet: let the studio know.', 'id': 'Belum ada ketentuan yang diterbitkan: beri tahu studio.'},
    'Pendiente: lo firma el cliente con el estudio y el estudio lo marca aquí cuando lo recibe. Sin él el bot no se enciende.': {
        'en': 'Pending: the client signs it with the studio, and the studio marks it here when it arrives. Without it the bot does not switch on.',
        'id': 'Menunggu: klien menandatanganinya bersama studio, dan studio menandainya di sini setelah diterima. Tanpa itu bot tidak dapat dinyalakan.'},
    'alta': {'en': 'sign-up', 'id': 'pendaftaran'},   # el tramo del menú «Bot de WhatsApp · alta»
    # El velo de carga de la v4 (datos.js de Lawang, f1d931ff3): solo se ve mientras queda una consulta en vuelo, así que el barrido lo caza
    # o no según lo que tarde la pantalla (tren de bbm, 15-oct: /finanzas/ en «vacía», en inglés). Lawang lo escribe sin tildes.
    'Trayendo los datos de la pantalla': {'en': 'Loading the data for this screen', 'id': 'Memuat data untuk layar ini'},
    'Sigue viniendo — la consulta esta tardando mas de lo normal': {
        'en': 'Still loading — the request is taking longer than usual',
        'id': 'Masih memuat — permintaan ini memakan waktu lebih lama dari biasanya'},
})

# Traducciones de Lawang que en INGLÉS dejan dentro el nombre español de una casilla o un permiso («tick «Gastos y proveedores»»): en la instancia
# se dice con el rótulo que ve en inglés (el de la casilla de Usuarios). Estas SÍ pisan (menu_i18n no pisa una clave existente).
PISA_I18N = {
    'Solo se importan cuentas marcadas como propias en Cuentas. Si falta una (por ejemplo Statrys), dala de alta en Cuentas y márcala «De la sociedad».': {
        'en': 'Only accounts marked as own in Accounts can be imported. If one is missing (for example Statrys), add it in Accounts and tick «Company-owned».',
        'id': 'Hanya rekening yang ditandai milik perusahaan di Rekening yang dapat diimpor. Jika ada yang belum ada (misalnya Statrys), tambahkan di Rekening dan centang «Milik perusahaan».'},
    'De la sociedad': {'en': 'Company-owned', 'id': 'Milik perusahaan'},
    'Si eres admin, pide que te marquen «Gastos y proveedores» en Usuarios.': {
        'en': 'If you are an admin, ask to have «Expenses and suppliers» ticked in Users.',
        'id': 'Jika Anda admin, minta agar «Pengeluaran dan pemasok» dicentang di Pengguna.'},
    'Si eres admin, pide que te marquen «Bancos» en Usuarios.': {
        'en': 'If you are an admin, ask to have «Banks» ticked in Users.', 'id': 'Jika Anda admin, minta agar «Bank» dicentang di Pengguna.'},
    'Falta la casilla «Gastos y proveedores» en Usuarios: sin ella no se ve lo que sale.': {
        'en': 'The «Expenses and suppliers» permission is missing in Users: without it outflows are not visible.',
        'id': 'Izin «Pengeluaran dan pemasok» belum dicentang di Pengguna: tanpa itu uang keluar tidak terlihat.'},
    'Sin la casilla «Gastos y proveedores» el gráfico enseña solo lo que entra.': {
        'en': 'Without the «Expenses and suppliers» permission the chart shows only inflows.',
        'id': 'Tanpa izin «Pengeluaran dan pemasok», grafik hanya menampilkan uang masuk.'},
}

# Frases de Lawang montadas con un dato (traduce_instancia.js): regex sobre el texto entero → molde por idioma; {n} = grupo n, traducido si es una
# clave. Mismo sentido que el original; «revisa sesión/permisos» se dice entero.
PATRONES_INSTANCIA = [
    ['^No se ha podido cargar «(.+?)»( \\([^)]*\\))? — revisa sesión/permisos\\.$',
     {'en': 'Could not load «{1}»{2} — check your session and permissions.', 'id': 'Tidak dapat memuat «{1}»{2} — periksa sesi dan izin Anda.'}],
    ['^(\\d+) dadas de baja$', {'en': '{1} deactivated', 'id': '{1} dinonaktifkan'}],
    ['^de (\\d+) tipos en el catálogo · (\\d+) archivados$', {'en': 'of {1} types in the catalogue · {2} archived', 'id': 'dari {1} jenis di katalog · {2} diarsipkan'}],
    ['^Comunicados: (.+)$', {'en': 'Announcements: {1}', 'id': 'Pengumuman: {1}'}],
]


def traduce_instancia_js():
    """Pega al final del i18n.js de la COPIA (después del núcleo del indonesio y de MENU_I18N) las correcciones de PISA_I18N y
    traduce_instancia.js con PATRONES_INSTANCIA. Solo la instancia: Lawang y la demo no pasan por aquí (instancia())."""
    ruta = os.path.join(DIST, 'contracts', 'assets', 'i18n.js')
    t = open(ruta, encoding='utf-8').read()
    if 'window.LW_EN = EN;' not in t:
        aborta('traduce_instancia: i18n.js de Lawang ya no expone window.LW_EN')
    js = open(os.path.join(AQUI, 'traduce_instancia.js'), encoding='utf-8').read()
    if js.count('__AXW_PATRONES__') != 1:
        aborta('traduce_instancia.js: tiene que llevar UNA vez el hueco __AXW_PATRONES__')
    for p, _m in PATRONES_INSTANCIA:
        re.compile(p)   # un patrón roto para aquí y no en el navegador
    pisa = ('(function(){var D=%s,E=window.LW_EN,I=window.LW_ID;for(var k in D){if(E)E[k]=D[k].en;if(I)I[k]=D[k].id;}})();\n'
            % json.dumps(PISA_I18N, ensure_ascii=False, sort_keys=True))
    js = js.replace('__AXW_PATRONES__', json.dumps(PATRONES_INSTANCIA, ensure_ascii=False))
    open(ruta, 'w', encoding='utf-8', newline='').write(t.rstrip() + '\n' + pisa + js.rstrip() + '\n')


def menu_i18n():
    """Añade MENU_I18N a LW_EN y LW_ID al final de i18n.js de la copia (toda instancia; sin indonesio, LW_ID no existe y se salta)."""
    ruta = os.path.join(DIST, 'contracts', 'assets', 'i18n.js')
    t = open(ruta, encoding='utf-8').read()
    if 'window.LW_EN = EN;' not in t:
        aborta('menu_i18n: i18n.js de Lawang ya no expone window.LW_EN (los rótulos del menú no se podrían traducir)')
    bloque = ('(function(){var D=%s,E=window.LW_EN,I=window.LW_ID;for(var k in D){if(E&&!Object.prototype.hasOwnProperty.call(E,k))E[k]=D[k].en;'
              'if(I&&!Object.prototype.hasOwnProperty.call(I,k))I[k]=D[k].id;}})();\n') % json.dumps(MENU_I18N, ensure_ascii=False, sort_keys=True)
    open(ruta, 'w', encoding='utf-8', newline='').write(t.rstrip() + '\n' + bloque)


def mascota_versionada(dist):
    """MASCOTA_V de assets/nav.js = huella de la assets/mascota.js QUE SE PUBLICA (revisor, 12-oct). nav.js la carga con
    `assets/mascota.js?v=" + MASCOTA_V`, una URL que se arma al ejecutarse y que versiona() no ve: con el valor de Lawang, la CDN
    seguiría sirviendo la mascota vieja 7 días tras repintarla (piel) o reescribirla (reraiz, comentarios, tipografías). Va justo
    antes de versiona(), cuando ya nadie toca mascota.js, y así cambia también el ?v= de nav.js. Sin nav.js ni mascota.js no hace nada."""
    import hashlib
    nav, masc = os.path.join(dist, 'assets', 'nav.js'), os.path.join(dist, 'assets', 'mascota.js')
    if not (os.path.isfile(nav) and os.path.isfile(masc)):
        return None
    tn = open(nav, encoding='utf-8').read()
    m = list(re.finditer(r'''(MASCOTA_V\s*=\s*)(['"])([^'"]+)\2''', tn))
    if len(m) != 1:
        aborta('assets/nav.js no declara UNA vez MASCOTA_V (la mascota publicada no cambiaría de URL)')
    huella = 'p' + hashlib.sha1(open(masc, 'rb').read()).hexdigest()[:8]
    open(nav, 'w', encoding='utf-8', newline='').write(tn[:m[0].start(3)] + huella + tn[m[0].end(3):])
    return huella


def favicon_versionado(dist):
    """`href="/favicon.png"` → `?v=<huella>` en todas las páginas (Calidad, 12-oct): Hostinger cachea /favicon.png 7 días y,
    tras cambiar el icono de bbm, la URL sin versión seguía sirviendo el viejo. Devuelve cuántas páginas cambió."""
    import hashlib
    fav = os.path.join(dist, 'favicon.png')
    if not os.path.isfile(fav):
        return 0
    nuevo = 'href="/favicon.png?v=%s"' % hashlib.sha1(open(fav, 'rb').read()).hexdigest()[:8]
    n = 0
    for raiz, _d, fichs in os.walk(dist):
        for f in fichs:
            if f.endswith('.html'):
                p = os.path.join(raiz, f)
                t = open(p, encoding='utf-8', errors='replace').read()
                if 'href="/favicon.png"' in t:
                    open(p, 'w', encoding='utf-8', newline='').write(t.replace('href="/favicon.png"', nuevo))
                    n += 1
    return n


APLICA_TEMA = re.compile(r"""setProperty\(\s*['"`]--tema-""")
FICHA_REL = 'contracts/assets/instancia.js'


def comprueba_piel(dist, nombre):
    """Pendiente de Seguridad (#265): lo publicado no lleva caminos de piel ajenos. Un solo aplicador, en la ficha, y solo si
    la instancia declara piel: ningún otro `setProperty('--tema-…')`, ni el init del arnés (addInitScript), ni una piel
    elegida por la URL (`skin=`, `get('skin')`), ni los presets enteros (presets.json, propuestas_sin_aprobar)."""
    esperado = 1 if _piel_preset(nombre) is not None else 0
    donde = []
    for raiz, _d, fichs in os.walk(dist):
        for f in fichs:
            rel = os.path.relpath(os.path.join(raiz, f), dist).replace(os.sep, '/')
            if f in ('presets.json', 'pieles.json'):
                aborta('presets de piel copiados al paquete: ' + rel)
            if not f.endswith(EXT_TEXTO):
                continue
            t = open(os.path.join(raiz, f), encoding='utf-8', errors='replace').read()
            if ('addInitScript' in t or 'propuestas_sin_aprobar' in t or re.search(r'[?&]skin=', t)
                    or re.search(r"""['"`]skin['"`]""", t)):
                aborta('camino de piel ajeno en el paquete: ' + rel)
            marcas, aplica = t.count(PIEL_MARCA), len(APLICA_TEMA.findall(t))
            if marcas != aplica:
                aborta('%s pone variables --tema- fuera del aplicador del build (%d aplicador, %d setProperty)' % (rel, marcas, aplica))
            donde += [rel] * marcas
    if len(donde) != esperado or (donde and donde[0] != FICHA_REL):
        aborta('aplicadores de piel en el paquete: %r (se esperaba %d, en %s)' % (donde, esperado, FICHA_REL))


def _fuente_logo(tam):
    """La letra de los logotipos generados (neutros y de instancia): negrita del sistema, o None si no hay."""
    from PIL import ImageFont
    for f in ('segoeuib.ttf', 'arialbd.ttf'):
        try:
            return ImageFont.truetype(os.path.join(os.environ.get('WINDIR', 'C:\\Windows'), 'Fonts', f), tam)
        except OSError:
            continue
    return None


def logos_instancia(nombre, marca):
    """Logo y favicon del CLIENTE si la instancia declara `icono` (su logo real, solo reducido: erp/tema/marcas/LEEME.md);
    si no, los neutros de AxisWorks. Mismo lienzo que logos_neutros (1726×240, la maqueta no se mueve). El texto es la
    marca en mayúsculas con el punto en el acento de su piel, como el logotipo de su web pública."""
    icono = _instancia_registro(nombre).get('icono')
    if not icono:
        return logos_neutros(marca)
    from PIL import Image, ImageDraw
    # realpath + normcase: un enlace (junction) o una mayúscula no sacan el icono de su carpeta (incidente del 10-oct)
    base = os.path.normcase(os.path.realpath(os.path.join(AGENCIA, 'erp', 'tema', 'marcas')))
    ruta = os.path.realpath(os.path.join(AGENCIA, icono))
    if not os.path.normcase(ruta).startswith(base + os.sep) or not os.path.isfile(ruta):
        aborta('icono de %s fuera de erp/tema/marcas/ o inexistente: %s' % (nombre, icono))
    p = _piel_preset(nombre) or {}
    tinta = tuple(p.get('on-background', (15, 23, 48))) + (255,)
    claro = tuple(p.get('on-primary', (238, 240, 251))) + (255,)   # va sobre la barra de marca: su «on», también en piel oscura
    acento = tuple(p.get('accent-gold', (79, 70, 229))) + (255,)

    def fuente(tam):
        return _fuente_logo(tam) or aborta('sin fuente para el logotipo (segoeuib.ttf / arialbd.ttf)')
    ico = Image.open(ruta).convert('RGBA')
    mascara = Image.new('L', (180, 180), 0)
    ImageDraw.Draw(mascara).rounded_rectangle((0, 0, 179, 179), radius=36, fill=255)
    ico180 = ico.resize((180, 180), Image.LANCZOS)
    texto = marca.upper()
    tam = 150
    while tam > 40 and ImageDraw.Draw(Image.new('RGBA', (1, 1))).textlength(texto + '.', font=fuente(tam)) > 1726 - 230:
        tam -= 4
    marca_dir = os.path.join(DIST, 'contracts', 'assets', 'brand')
    os.makedirs(marca_dir, exist_ok=True)
    for nombre_png, color in (('axw-logo-v3.png', claro), ('axw-logo-v3-dark.png', tinta)):
        im = Image.new('RGBA', (1726, 240), (0, 0, 0, 0))
        im.paste(ico180, (0, 30), mascara)
        d = ImageDraw.Draw(im)
        d.text((230, 120), texto, font=fuente(tam), fill=color, anchor='lm')
        d.text((230 + d.textlength(texto, font=fuente(tam)), 120), '.', font=fuente(tam), fill=acento, anchor='lm')
        im.save(os.path.join(marca_dir, nombre_png))
    ico.resize((64, 64), Image.LANCZOS).save(os.path.join(DIST, 'favicon.png'))


def tipografias_libres():
    """La demo pública no lleva las tipografías de marca de Lawang (owner, 25-sep, AXW-19): Neue Kabel y The Seasons
    son identidad del cliente y los .otf venían de fonnts.com, sin licencia web nuestra. Se sustituyen por dos parecidas
    de Google Fonts (licencia OFL): Jost (geométrica, como Kabel) y Cormorant Garamond (serif de display)."""
    fuentes = os.path.join(DIST, 'assets', 'fonts')
    if os.path.isdir(fuentes):
        for f in os.listdir(fuentes):
            if f.lower().endswith(('.otf', '.ttf', '.woff', '.woff2')):
                os.remove(os.path.join(fuentes, f))
        open(os.path.join(fuentes, 'fonts.css'), 'w', encoding='utf-8', newline='\n').write(
            "@import url('https://fonts.googleapis.com/css2?family=Jost:ital,wght@0,300..800;1,300..800"
            "&family=Cormorant+Garamond:ital,wght@0,400..700;1,400..700&display=swap');\n")
    for raiz, _d, fichs in os.walk(DIST):
        for f in fichs:
            if not f.endswith(EXT_TEXTO):
                continue
            p = os.path.join(raiz, f)
            t = open(p, encoding='utf-8', errors='replace').read()
            t2 = t.replace('Neue Kabel', 'Jost').replace('The Seasons', 'Cormorant Garamond')
            if t2 != t:
                open(p, 'w', encoding='utf-8', newline='').write(t2)
    sueltas = [os.path.join(r, f) for r, _d, fs in os.walk(DIST) for f in fs if f.lower().endswith('.otf')]
    if sueltas:
        aborta('quedan tipografías .otf en la versión pública: ' + ', '.join(rel(x) for x in sueltas[:5]))


# Sistema visual de AxisWorks en una instancia (registro `sistema: "axisworks"`; bbm-p33, 12-oct, owner: «el ERP de BBM es
# ilegible, necesitamos actualizarlo al estándar de axisworks nuevo»; diseño «AxisWorks ERP Dashboard», página Reservas).
# Los COLORES van por la piel (presets.json); aquí lo que no es color y la piel no alcanza:
#   · fuentes: las tres OFL de la portada (fuentes_portada, AUTOALOJADAS: nada a Google) en lugar de Jost/Cormorant de Google
#     que deja tipografias_libres(). Manrope para lo que se lee o se pulsa, Unbounded para titulares y cifras, IBM Plex Mono
#     para rótulos. Sin manrope-600: un 600 pedido pinta el 700 (coincidencia de CSS, sin negrita sintética). Los iconos
#     (Material Symbols de Google) quedan fuera: los comparte con Lawang.
#   · forma: sin sombras (la profundidad es tarjeta blanca + filete), tarjetas a 20 px, campos con borde visible (≥ 3:1).
# Todo con `html main`/`html ` delante: fonts.css va ANTES que las hojas de Tailwind, que redefinen estas clases (misma
# especificidad). Unbounded solo en la zona de trabajo (el nombre del cliente en el menú es suyo, no el wordmark del estudio)
# y Plex Mono solo en rótulos EN MAYÚSCULAS (`font-label-md` también viste botones y chips: en mono no se leen; medido).
SISTEMAS_INSTANCIA = {
    'axisworks': {
        'familias': (('Jost', 'Manrope'), ('Cormorant Garamond', 'Unbounded'), ('Instrument Sans', 'Manrope')),
        'css': ('\nhtml main .font-headline-lg,html main .font-headline-md,html main .font-headline-sm,html .font-kpi-number,'
                'html .lw-cifra{font-family:\'Unbounded\',system-ui,sans-serif;letter-spacing:-.03em}\n'
                # Plex Mono solo tiene 400/500: un 700 pedido saldría en negrita sintética
                'html .font-label-md.uppercase{font-family:\'IBM Plex Mono\',ui-monospace,monospace;font-weight:500}\n'
                # cabecera de tabla del diseño: rótulo mono en mayúsculas
                'html main th{font-family:\'IBM Plex Mono\',ui-monospace,monospace;font-weight:500!important;font-size:11px;'
                'letter-spacing:.1em;text-transform:uppercase}\n'
                'html main .shadow-sm,html main .shadow,html main .shadow-md,html main .shadow-xs,html main .hover\\:shadow-md:hover'
                '{box-shadow:none}\n'
                'html main .bg-surface-container-lowest.shadow-sm{border:1px solid rgb(var(--tema-filete))}\n'
                'html main .bg-surface-container-lowest.rounded-xl.shadow-sm:not(.rounded-full){border-radius:20px}\n'
                # campos: borde visible (≥ 3:1, medido 1,4:1 antes) sin cambiar su tamaño; el buscador en pastilla no tenía borde
                # (solo en reposo: el foco de cada campo, su anillo y su borde, sigue siendo el suyo; revisor 13-oct)
                'html main input:not([type=checkbox]):not([type=radio]):not([type=range]):not([type=color]):not(:focus),'
                'html main select:not(:focus),html main textarea:not(:focus){border-color:rgb(var(--tema-outline))!important}\n'
                'html main input.shadow-sm.rounded-full:not(:focus){box-shadow:inset 0 0 0 1.5px rgb(var(--tema-outline))}\n'
                # botón secundario de las pantallas del maestro: el «fantasma» del diseño (contorno de 1,5 px en la tinta) en
                # vez de gris sobre blanco (1,2:1 como control, medido); el principal, el elegido y el de peligro no cambian
                'html main .axw-boton:not([data-primario="1"]):not([aria-selected="true"]):not([data-peligro="1"])'
                '{background:rgb(var(--tema-surface-container-lowest));box-shadow:inset 0 0 0 1.5px rgb(var(--tema-on-surface))}\n'),
    },
}
GOOGLE_TEXTO = re.compile(r'<link[^>]*fonts\.googleapis\.com/css2\?family=(?:Jost|Cormorant)[^>]*>')
# Toda URL de Google Fonts de TEXTO que quede tras el renombrado (Jost ya es Manrope: el @import de shell.css, el panel de
# editores.js, piel.js…) pasa a la hoja propia. Se aplica DESPUÉS de renombrar (revisor 13-oct: antes no casaba nunca).
GOOGLE_TEXTO_URL = re.compile(r'''https://fonts\.googleapis\.com/css2\?family=(?!Material)[^'"\)\s]*''')
# El documento imprimible de facturas no pasa por el renombrado de familias; SOLO se le cambia el enlace de fuentes (sistema_documento_fuentes, p37 13-oct).
SISTEMA_EXCLUIDOS = ('clasico/facturas/documento.js',)


DOC_GOOGLE = re.compile(r'''<link rel="preconnect" href="https://fonts\.googleapis\.com">'\s*\+\s*'<link href="https://fonts\.googleapis\.com/css2\?family=Jost[^"]*" rel="stylesheet">''')


def sistema_documento_fuentes():
    """El documento imprimible (factura/recibí: documento.js, que el renombrado no toca) carga brand.css de la instancia, cuyas
    familias ya son las del sistema (--font-body: 'Manrope'), pero pedía a Google Jost/Cormorant: Manrope no llegaba nunca y el
    papel salía en la letra de sistema del navegador, distinto de su vista previa (editores.js, que sí carga fonts.css). Medido
    en el paquete de bbm (p37, 13-oct). Se cambia ese enlace por la hoja propia, con la misma base que brand.css: papel y vista
    previa con las mismas letras y ninguna petición a Google desde el documento."""
    p = os.path.join(DIST, 'clasico', 'facturas', 'documento.js')
    if not os.path.isfile(p):
        aborta('sistema: falta clasico/facturas/documento.js en el paquete')
    t = open(p, encoding='utf-8').read()
    n = len(DOC_GOOGLE.findall(t))
    papeles = 2 if 'axwDocId' in t else 1   # BBM-72: la copia de una instancia en indonesio lleva los dos papeles (es·en e id·en)
    if n != papeles:
        aborta('sistema: documento.js tiene %d enlaces a las fuentes de Google con la forma esperada (%d): ¿cambió su <head>?' % (n, papeles))
    t = DOC_GOOGLE.sub(lambda _m: '''<link rel="stylesheet" href="' + base + '/assets/fonts/fonts.css">''', t)
    if 'fonts.googleapis.com' in t:
        aborta('sistema: documento.js sigue pidiendo fuentes a Google tras el cambio')
    open(p, 'w', encoding='utf-8', newline='').write(t)


def sistema_instancia(nombre):
    """Pone el sistema del registro (`sistema`): fuentes servidas desde el propio dominio y la forma. Sin `sistema`, nada."""
    clave = _instancia_registro(nombre).get('sistema')
    if not clave:
        return 0
    if clave not in SISTEMAS_INSTANCIA:
        aborta('sistema %r de %s no es uno conocido (%s)' % (clave, nombre, ', '.join(sorted(SISTEMAS_INSTANCIA))))
    if _piel_preset(nombre) is None:
        aborta('sistema %r de %s sin piel: la forma usa los colores de su preset (--tema-filete, --tema-outline)' % (clave, nombre))
    juego = SISTEMAS_INSTANCIA[clave]
    css_caras, ficheros = fuentes_portada()
    for rel_pub, origen in ficheros:
        destino = os.path.join(DIST, rel_pub)
        os.makedirs(os.path.dirname(destino), exist_ok=True)
        shutil.copy2(origen, destino)
    fuentes_css = os.path.join(DIST, 'assets', 'fonts', 'fonts.css')
    if not os.path.isfile(fuentes_css):
        aborta('sistema de %s: falta assets/fonts/fonts.css en el paquete' % nombre)
    open(fuentes_css, 'w', encoding='utf-8', newline='\n').write(css_caras.rstrip('\n') + '\n' + juego['css'])
    cambiados = 0
    for raiz, _d, fichs in os.walk(DIST):
        for f in fichs:
            if not f.endswith(EXT_TEXTO):
                continue
            p = os.path.join(raiz, f)
            if os.path.relpath(p, DIST).replace(os.sep, '/') in SISTEMA_EXCLUIDOS:
                continue
            t = open(p, encoding='utf-8', errors='replace').read()
            t2 = GOOGLE_TEXTO.sub('<link rel="stylesheet" href="/assets/fonts/fonts.css">', t) if f.endswith('.html') else t
            for viejo, nuevo in juego['familias']:
                t2 = t2.replace(viejo, nuevo)
            t2 = GOOGLE_TEXTO_URL.sub('/assets/fonts/fonts.css', t2)
            if t2 != t:
                open(p, 'w', encoding='utf-8', newline='').write(t2)
                cambiados += 1
    sistema_documento_fuentes()
    quedan = [os.path.relpath(os.path.join(r, f), DIST) for r, _d, fs in os.walk(DIST) for f in fs if f.endswith(EXT_TEXTO)
              and os.path.relpath(os.path.join(r, f), DIST).replace(os.sep, '/') not in SISTEMA_EXCLUIDOS
              and GOOGLE_TEXTO_URL.search(open(os.path.join(r, f), encoding='utf-8', errors='replace').read())]
    if quedan:
        aborta('sistema de %s: quedan peticiones de texto a Google en %s' % (nombre, ', '.join(quedan[:5])))
    return cambiados


REF_ESTATICO = re.compile(r'''(["'])([^"'\s<>()]+?\.(?:js|css))(\?v=[0-9A-Za-z_-]+)?\1''')


def versiona(raiz):
    """?v=<huella del contenido PUBLICADO> en cada .js/.css local que se referencia (25-sep-2026).
    El ?v= que trae la v4 es la huella del fichero de LAWANG, no la del que sale de aquí: guard.js se reescribe
    entero y conservaba su ?v=, y catalogo.js/modulos.js/tour.js iban sin versión. Un navegador que entró el 24-sep
    siguió usando el catalogo.js de antes de los packs (Hostinger cachea 7 días) y la landing se quedó sin módulos.
    Se repite hasta que nada cambia: si guard.js cambia al versionar lo que inyecta, cambia también su huella."""

    def huella(p):
        return hashlib.sha1(open(p, 'rb').read()).hexdigest()[:8]

    def resuelve(desde, ruta):
        # Un nombre suelto («nav.js») no es una carga sino un selector: script[src*="nav.js"] con ?v= deja de casar.
        if '/' not in ruta or ruta.startswith(('http:', 'https:', '//', 'data:')):
            return None
        p = os.path.join(raiz, ruta.lstrip('/')) if ruta.startswith('/') else os.path.join(os.path.dirname(desde), ruta)
        p = os.path.normpath(p)
        return p if p.startswith(os.path.normpath(raiz)) and os.path.isfile(p) else None

    def pasada(ext):
        cambiados = 0
        for r, _d, fichs in os.walk(raiz):
            for f in fichs:
                if not f.endswith(ext):
                    continue
                p = os.path.join(r, f)
                t = open(p, encoding='utf-8', errors='replace').read()

                def uno(m):
                    destino = resuelve(p, m.group(2))
                    if not destino:
                        return m.group(0)
                    return m.group(1) + m.group(2) + '?v=' + huella(destino) + m.group(1)
                t2 = REF_ESTATICO.sub(uno, t)
                if t2 != t:
                    open(p, 'w', encoding='utf-8', newline='').write(t2)
                    cambiados += 1
        return cambiados

    for _ in range(6):                     # primero los .js entre sí, hasta que se estabilizan
        if not pasada('.js'):
            break
    else:
        aborta('versiona(): las huellas de los .js no se estabilizan (¿referencia circular?)')
    pasada('.css')
    pasada('.html')


# Lo que no puede salir NUNCA en la demo pública (revisión previa de Seguridad, 11-oct-2026, encargo demo_cliente_flujo_total).
# Secretos y servidores: si aparecen, la demo podría hablar con algo real o lo enseña. Referencias internas: cuentan cómo
# trabaja el estudio. Cada patrón con sus excepciones exactas (lo único que se admite y por qué).
SECRETOS_DEMO = [
    (re.compile(r'[a-z]{20}\.supabase\.co'), 'URL de una base de Supabase'),
    (re.compile(r'sb_secret_'), 'clave secreta de Supabase'),
    (re.compile(r'sb_publishable_(?!demo\b)'), 'clave publicable de Supabase que no es la de la demo'),
    (re.compile(r'eyJhbGci'), 'token JWT'),
    (re.compile(r'\b(?:sk|rk)_(?:live|test)_'), 'clave de Stripe'),
    (re.compile(r'whsec_'), 'secreto de webhook'),
    (re.compile(r'railway\.app'), 'servicio de Railway'),
    # El dominio de su API, no el nombre: «cuentas GoHighLevel» es el rótulo de una integración del CRM (como «Stripe»).
    (re.compile(r'(?i)leadconnectorhq\.com|gohighlevel\.com|msgsndr\.com'), 'API del CRM de un cliente'),
    # Una función del servidor con su host escrito: las de la demo se componen sobre la URL falsa (lwEdge, sb.supabaseUrl
    # = demo.invalid) y el candado de red y connect-src 'self' las cortan.
    (re.compile(r'''["'`]https?://(?![a-z]*\.invalid)[^"'`\s]*/functions/v1/'''), 'función del servidor con host real'),
    (re.compile(r'(?i)anthropic'), 'llamada a un modelo'),
    (re.compile(r'(?:LAW|AXW|BBM|EST)-\d+'), 'referencia interna del estudio'),
    (re.compile(r'(?<![A-Za-z0-9_$])[Qq][Aa][._-]'), 'resto del doble de QA'),
    (re.compile(r'@demo\.test|@axisworks\.test'), 'correo de pruebas'),
    # Revisión previa de Seguridad #279 (12-oct, portal de la demo): un correo que no sea de un dominio reservado, un teléfono
    # (internacional que no empiece por +00, o nacional con separadores), un IBAN o un NPWP con dígitos que no sean ceros.
    (re.compile(r'[A-Za-z0-9._%+-]+@(?!example\.(?:com|org|net)\b)(?![A-Za-z0-9-]+\.invalid\b)[A-Za-z0-9-]+\.(?:com|net|org|id|co|io|es|de|fr|uk|studio|app)\b'),
     'correo con un dominio real'),
    (re.compile(r'(?<![\w.+/-])\+(?!00)\d{2}[ -]\d{2,4}[ -]\d{3,4}[ -]?\d{2,4}(?![\w.])'), 'teléfono internacional'),
    (re.compile(r'(?<![\w.:/-])0[1-9]\d{1,3}[ -]\d{3,4}[ -]\d{3,4}(?![\w.])'), 'teléfono nacional'),
    (re.compile(r'\b[A-Z]{2}\d{2}(?: ?[0-9]{4}){4,7}\b'), 'IBAN'),
    (re.compile(r'\b(?!00\.000\.000)\d{2}\.\d{3}\.\d{3}\.\d-\d{3}\.\d{3}\b'), 'NPWP'),
]
# Lo único que esos patrones admiten: textos de AYUDA del front compartido (placeholders y ejemplos de «cómo se escribe»), no
# datos de nadie. Lista CERRADA y exacta: uno nuevo para el build y se decide aquí, con su porqué (12-oct, primera pasada).
EJEMPLOS_ADMITIDOS = frozenset((
    'nombre@tudominio.com', 'name@yourdomain.com', 'nombre@dominio.com', 'cliente@email.com', 'ejemplo@ejemplo.com',
    'name@domain.com',                                           # la traducción del anterior (tanda 2 de idioma, Lawang 4a3eaa0a)
    'tucorreo+portal@gmail.com', 'youraddress+portal@gmail.com',   # cómo usar un alias de Gmail (ayuda de Ajustes)
    '+34 600 000 000',                                           # ejemplo de teléfono en el cuadro del asistente
))


REF_INTERNA = re.compile(r'\s*\((?:LAW|AXW|BBM|EST)-\d+\)|(?:LAW|AXW|BBM|EST)-\d+')
# El proveedor de IA nombrado ENTRE PARÉNTESIS en un texto de ayuda («…a un proveedor externo de IA (Anthropic) para…», aviso de
# privacidad del editor de contratos de Lawang, E10, 13-oct-2026): fuera, como las referencias internas; la frase sigue siendo
# verdad sin el nombre. Por forma y no por la frase de Lawang (no se engancha a su texto), y la misma en i18n.js y en la
# pantalla, así la clave sigue casando. Una llamada de verdad (api.anthropic.com, una clave) no va entre paréntesis: la sigue
# parando comprueba_sin_secretos().
PROVEEDOR_IA = re.compile(r'\s*\((?i:anthropic)\)')
QA_ID = re.compile(r'(?<![A-Za-z0-9_$])(qa|QA)(?=[._-])')
QA_PALABRA = re.compile(r'(?<![A-Za-z0-9_$])QA(?![A-Za-z0-9_$])')
# Lo visible del doble de QA que se cambia por algo de demo ANTES del renombrado genérico (cada uno debe aparecer: si el doble
# cambia y deja de traerlo, el build lo dice). Datos de prueba, no de un cliente.
DOBLE_VISIBLE = [
    (re.compile(r'QA Tester'), 'Clara Montesinos'),
    (re.compile(r'qa_super_admin'), 'super_admin'),
    (re.compile(r'qa\.([a-z0-9]+)@axisworks\.test'), r'\1@example.com'),
    (re.compile(r'QA-SELLADO-001'), 'CT-26-101'),
    (re.compile(r'-QA-(\d+)'), r'-26-\1'),
    (re.compile(r'QA (?=[A-Z])'), 'Demo '),
    # plantilla_web: una tabla que el asistente de correos SÍ sabe rotular («Plantilla (texto publicado)»); con otra salía
    # el nombre técnico (revisor, 12-oct).
    (re.compile(r'tabla:(["\'])bot_fuentes\1,id:(["\'])prompt_sistema\2'), r'tabla:\1plantilla_web\1,id:\2texto_base\2'),
    (re.compile(r'pendiente del owner'), 'pendiente de confirmar'),
]


def limpia_internos(dist):
    """Fuera de la demo pública lo que cuenta cómo trabaja el estudio (revisión previa de Seguridad, 11-oct): las referencias
    «LAW-124» de los textos del front y del doble, y los nombres del doble de QA (qa-user-2, qa.agente@…, «QA Tester»). Se
    renombran en el guard ENTERO (doble + datos de la demo), así que siguen casando entre sí. Después comprueba_sin_secretos()
    vuelve a mirar todo y aborta si queda algo."""
    refs = 0
    for raiz, _d, fichs in os.walk(dist):
        for f in fichs:
            if not f.endswith(EXT_TEXTO):
                continue
            p = os.path.join(raiz, f)
            t = open(p, encoding='utf-8', errors='replace').read()
            t2, n = REF_INTERNA.subn('', t)
            t2, n_ia = PROVEEDOR_IA.subn('', t2)
            n += n_ia
            if n:
                refs += n
                open(p, 'w', encoding='utf-8', newline='').write(t2)
    g = os.path.join(dist, 'contracts', 'assets', 'guard.js')
    t = open(g, encoding='utf-8').read()
    for rx, nuevo in DOBLE_VISIBLE:
        t, n = rx.subn(nuevo, t)
        if not n:
            aborta('limpia_internos: el doble de QA ya no trae %r (¿ha cambiado _qa_double_guard.js?)' % rx.pattern)
    # Identificadores (qa-user-2, qa.lead, qa_x) y después la palabra «QA» suelta que queda a la vista («Equipo QA», «QA: …»,
    # también dentro de las expresiones regulares del propio doble, que así siguen casando con sus datos). La propiedad `qa:`
    # (sin . - _ detrás) no se toca: es código, no se ve.
    t, n = QA_ID.subn(lambda m: 'dm' if m.group(1) == 'qa' else 'DM', t)
    t, n2 = QA_PALABRA.subn('Demo', t)
    # El dominio de los correos inventados: example.com (reservado, RFC 2606), no uno «de pruebas» del estudio. Opcional: el
    # paquete A puede traerlo ya cambiado en demo_datos.js.
    t = t.replace('@demo.test', '@example.com').replace('@axisworks.test', '@example.com')
    open(g, 'w', encoding='utf-8', newline='').write(t)
    print('limpia_internos: %d referencias internas fuera, %d nombres del doble de QA renombrados' % (refs, n + n2))


def reemplaza_publico(t):
    """REEMPLAZOS_PUBLICO sin repetirse: lo que YA es el nombre inventado no se vuelve a sustituir. Una regla cuyo destino
    contiene su origen (X → «X algo») doblaba el nombre al pasar sobre los datos de la demo, que ya lo traen inventado
    («Batu Ridge Ridge» en el portal, 12-oct-2026). Se aparta cada destino con una marca antes de sustituir y se devuelve."""
    for i, (a, b) in enumerate(REEMPLAZOS_PUBLICO):
        marca = '\x00%d\x00' % i
        t = t.replace(b, marca).replace(a, b).replace(marca, b) if a in b else t.replace(a, b)
    return t


HUELLA = '.huella'


def huella_de(raiz):
    """sha256 de todo lo publicado (rutas + contenido), sin la propia huella. La comprueba test_demo_publicado.py. Los
    finales de línea de los ficheros de texto cuentan como LF: el repo tiene core.autocrlf y otra copia los saca en CRLF."""
    import hashlib
    h = hashlib.sha256()
    for r, dirs, fichs in os.walk(raiz):
        dirs.sort()
        for f in sorted(fichs):
            if f == HUELLA and r == raiz:
                continue
            p = os.path.join(r, f)
            datos = open(p, 'rb').read()
            if f.endswith(EXT_TEXTO) or f in ('.htaccess', 'robots.txt'):
                datos = datos.replace(b'\r\n', b'\n')
            h.update(os.path.relpath(p, raiz).replace(os.sep, '/').encode('utf-8') + b'\0')
            h.update(datos + b'\0')
    return h.hexdigest()


def escribe_huella(raiz):
    """Lo último de publica(), DESPUÉS de todos los controles (revisión previa de Seguridad, 11-oct): dist/demo-erp solo es
    válido si salió de un `build.py --publico` que los pasó. Editado a mano o copiado de un build viejo, la huella no casa y
    test_demo_publicado.py (que corre en el control de subida) para el push."""
    open(os.path.join(raiz, HUELLA), 'w', encoding='utf-8', newline='\n').write(huella_de(raiz) + '\n')


def comprueba_sin_secretos(raiz):
    """Aborta si lo que se va a publicar lleva un secreto, un servidor real, una marca de cliente o una referencia interna."""
    malos = []
    for r, _d, fichs in os.walk(raiz):
        for f in fichs:
            if not (f.endswith(EXT_TEXTO) or f in ('.htaccess', 'robots.txt')):
                continue
            p = os.path.join(r, f)
            ruta = os.path.relpath(p, raiz).replace(os.sep, '/')
            t = open(p, encoding='utf-8', errors='replace').read()
            for rx, que in SECRETOS_DEMO + [(MARCAS_CLIENTE, 'marca o base de un cliente')]:
                for m in rx.finditer(t):
                    if m.group(0) in EJEMPLOS_ADMITIDOS:
                        continue
                    malos.append('%s: %s «%s»' % (ruta, que, t[max(0, m.start() - 30):m.end() + 20].replace('\n', ' ')))
            # En la pantalla del asistente de correos son CLAVES del código de Lawang (rótulos de sus fuentes), no texto: se
            # admiten. En cualquier otro sitio —sobre todo en las respuestas del doble, guard.js— son nombres internos.
            if re.search(r'bot_fuentes|prompt_sistema', t) and not ruta.startswith('asistente-correos/'):
                malos.append('%s: nombres internos del asistente (bot_fuentes / prompt_sistema)' % ruta)
    if malos:
        aborta('la demo pública lleva lo que no puede salir:\n  ' + '\n  '.join(malos[:40]))


# La limpieza EN VIVO de los datos de partida (MARCA_BLANCA + LW_DEMO_LIMPIA de demo_datos.js) sirve a la demo local, que no
# pasa por las sustituciones privadas. En la pública sobra y estorba (verificador, 12-oct): publicaba los nombres reales de su
# tabla en claro, y las sustituciones del build reescribían sus expresiones («Batu → Batu Ridge» doblaba el nombre en el
# navegador; «QA» → «Demo» la convertía en «borra Demo»). Aquí la limpieza se hace en el build y comprueba_sin_secretos lo mira.
LIMPIEZA_EN_VIVO = re.compile(r'  var MARCA_BLANCA = \[.*?\n  \];\n  window\.LW_DEMO_LIMPIA = function \(F\) \{.*?\n  \};\n', re.S)


def quita_limpieza_en_vivo():
    g = os.path.join(DIST, 'contracts', 'assets', 'guard.js')
    t = open(g, encoding='utf-8').read()
    t, n = LIMPIEZA_EN_VIVO.subn('  window.LW_DEMO_LIMPIA = function () {};\n', t)
    if n != 1:
        aborta('quita_limpieza_en_vivo: esperaba 1 bloque MARCA_BLANCA + LW_DEMO_LIMPIA en guard.js y hay %d (¿cambió demo_datos.js?)' % n)
    open(g, 'w', encoding='utf-8', newline='').write(t)


def publica():
    """Versión pública: sin comentarios, sin marca ni nombres de Lawang, y comprobado antes de copiar a demo/."""
    if not _PRIV or not REEMPLAZOS_PUBLICO:
        aborta('falta private/demo_publico.json (repo privado del estudio): sin él no se puede anonimizar la demo')
    quita_limpieza_en_vivo()
    limpia_publico(DIST)
    # Nombres de fichero primero (el logo, la hoja lawang.css…), después el texto que los nombra.
    for raiz, dirs, fichs in os.walk(DIST, topdown=False):
        for f in fichs + dirs:
            nuevo = f
            for a, b in REEMPLAZOS_PUBLICO:
                nuevo = nuevo.replace(a, b)
            nuevo = nuevo.replace('Lawang', 'Axw')
            if nuevo != f:
                os.replace(os.path.join(raiz, f), os.path.join(raiz, nuevo))
    for raiz, _d, fichs in os.walk(DIST):
        for f in fichs:
            if not f.endswith(EXT_TEXTO):
                continue
            p = os.path.join(raiz, f)
            t = open(p, encoding='utf-8', errors='replace').read()
            t2 = reemplaza_publico(t)
            t2 = cambia_lawang(t2)
            if t2 != t:
                open(p, 'w', encoding='utf-8', newline='').write(t2)
    limpia_internos(DIST)
    logos_demo()
    # /favicon.ico: el navegador lo pide solo en las páginas sin <link rel=icon> (la Home de la v4) y daba un 404 en
    # consola; un PNG servido como .ico lo aceptan todos los navegadores.
    shutil.copy2(os.path.join(DIST, 'favicon.png'), os.path.join(DIST, 'favicon.ico'))
    tipografias_libres()
    restos = []
    for raiz, _d, fichs in os.walk(DIST):
        for f in fichs:
            p = os.path.join(raiz, f)
            if RASTRO.search(f):
                restos.append('nombre de fichero: ' + rel(p))
            if f.endswith(EXT_TEXTO):
                for m in RASTRO.finditer(open(p, encoding='utf-8', errors='replace').read()):
                    restos.append('%s: …%s…' % (rel(p), m.group(0)))
    if restos:
        aborta('quedan rastros de Lawang, no se publica:\n  ' + '\n  '.join(restos[:40]))
    versiona(DIST)
    # Copia a dist/demo-erp/: se vacía por dentro (la carpeta es del repo) y se rellena con lo comprobado.
    if not PRUEBA_ORIGENES and not PRUEBA_PUBLICO and not DESTINO_PUBLICO.endswith(os.path.join('AxisWorks', 'dist', 'demo-erp')):
        aborta('destino público inesperado: ' + DESTINO_PUBLICO)
    os.makedirs(DESTINO_PUBLICO, exist_ok=True)
    for x in os.listdir(DESTINO_PUBLICO):
        p = os.path.join(DESTINO_PUBLICO, x)
        shutil.rmtree(p) if os.path.isdir(p) else os.remove(p)
    for x in os.listdir(DIST):
        s = os.path.join(DIST, x)
        shutil.copytree(s, os.path.join(DESTINO_PUBLICO, x)) if os.path.isdir(s) else shutil.copy2(s, DESTINO_PUBLICO)
    # La portada NO va en la demo pública (owner, 28-sep, AXW-70): vive solo en erp. (dist/erp-web); en demo. la raíz
    # redirige a la Home. En local (presentar.cmd, sin --publico) dist/ la sigue llevando en la raíz.
    for f in PORTADA_SOLO:
        p = os.path.join(DESTINO_PUBLICO, f.replace('/', os.sep))
        if not os.path.isfile(p):
            aborta('la portada no está donde se espera en la demo pública (%s): revisa paginas_propias()' % f)
        os.remove(p)
    # La raíz de la demo es la portada de DOS PUERTAS (owner, 11-oct-2026: «al entrar quiero que pueda elegir ver el portal
    # de cliente en demo o la intranet en demo»), no un 302 a la Home. La portada comercial (landing.html) sigue en erp.
    puerta_demo(DESTINO_PUBLICO)
    # Solo se sirve desde demo.axisworks.studio: por axisworks.studio/demo/ las rutas absolutas no casan.
    # El legado (/intranet/v4/<x>/ → /<x>/) sigue en 302 hasta verificar el mapa en producción (legado_htaccess); pasará a
    # 301 en una subida aparte, ya verificado (decisión por defecto del 12-oct en el encargo). Antes de eso hay que arreglar
    # /intranet/dossier → /clasico/dossier/, que no tiene index.html (revisor, 12-oct).
    open(os.path.join(DESTINO_PUBLICO, '.htaccess'), 'w', encoding='utf-8', newline='\n').write(
        '# GENERADO por comercial/demo-erp/build.py --publico — no editar.\n'
        '# demo.axisworks.studio: la demo del ERP. Fuera de ese host, redirige a él.\n'
        '<IfModule mod_rewrite.c>\n  RewriteEngine On\n'
        '  RewriteCond %{HTTP_HOST} !^demo\\.axisworks\\.studio$ [NC]\n'
        '  RewriteRule ^(.*)$ https://demo.axisworks.studio/$1 [R=302,L]\n</IfModule>\n'
        + legado_htaccess(DESTINO_PUBLICO)
        + cabeceras_seguridad(
            # Sin cdn.tailwindcss.com desde el 27-sep-2026 (ERP F3 lote 4a): la v4 y la portada van con Tailwind
            # COMPILADO. jsdelivr en estilos y fuentes: los iconos Phosphor del CRM (visto en producción, 25-sep).
            'default-src \'self\'; script-src \'self\' \'unsafe-inline\' '
            'https://cdn.jsdelivr.net https://cdnjs.cloudflare.com; style-src \'self\' '
            '\'unsafe-inline\' https://fonts.googleapis.com https://cdn.jsdelivr.net; font-src \'self\' data: '
            'https://fonts.gstatic.com https://cdn.jsdelivr.net; img-src '
            # form-action 'none' (revisión previa de Seguridad, 11-oct): ningún formulario de la demo se envía de verdad (todos
            # van por JS); uno que se escapara al navegador no sale a ningún sitio.
            '\'self\' data: blob:; connect-src \'self\'; frame-ancestors \'self\'; base-uri \'self\'; form-action '
            '\'none\'; object-src \'none\''))
    open(os.path.join(DESTINO_PUBLICO, 'robots.txt'), 'w', encoding='utf-8', newline='\n').write('User-agent: *\nDisallow: /\n')
    comprueba_resultado(DESTINO_PUBLICO)
    vuelve = [f for f in PORTADA_SOLO[1:] if os.path.exists(os.path.join(DESTINO_PUBLICO, f.replace('/', os.sep)))]
    if vuelve:
        aborta('la portada ha reaparecido en la demo pública (vive solo en erp.): ' + ', '.join(vuelve))
    if 'data-puerta="portal"' not in open(os.path.join(DESTINO_PUBLICO, 'index.html'), encoding='utf-8').read():
        aborta('la raíz de la demo pública no es la portada de dos puertas')
    comprueba_piel_demo(DESTINO_PUBLICO)
    comprueba_sin_secretos(DESTINO_PUBLICO)
    escribe_huella(DESTINO_PUBLICO)
    total = sum(len(f) for _r, _d, f in os.walk(DESTINO_PUBLICO))
    print('OK versión pública en %s: %d ficheros, sin rastros de Lawang' % (os.path.relpath(DESTINO_PUBLICO, AGENCIA), total))
    publica_web()


def cabeceras_seguridad(csp):
    """Cabeceras de seguridad de los .htaccess públicos (auditoría de Seguridad, 25-sep: el .htaccess del sitio
    principal no llega a los subdominios). connect-src 'self' es además la barrera de red de verdad: el doble ya no
    llama fuera, y si un build se dejara algo, el navegador lo cortaría igual. Una sola fuente para demo. y erp."""
    return ('<IfModule mod_headers.c>\n'
            '  Header always set X-Robots-Tag "noindex, nofollow"\n'
            '  Header always set Strict-Transport-Security "max-age=31536000"\n'
            '  Header always set X-Content-Type-Options "nosniff"\n'
            '  Header always set X-Frame-Options "SAMEORIGIN"\n'
            '  Header always set Referrer-Policy "strict-origin-when-cross-origin"\n'
            '  Header always set Permissions-Policy "camera=(), microphone=(), geolocation=(), payment=()"\n'
            '  Header always set Content-Security-Policy "' + csp + '"\n'
            # Hostinger sirve .js/.css con max-age de 7 días: el 25-sep un catalogo.js viejo (sin PACKS) cacheado del
            # 24 dejó la landing nueva sin módulos. no-cache = el navegador revalida con el ETag (304 si no cambió).
            '  <FilesMatch "\\.(html|js|css|json)$">\n'
            '    Header unset Expires\n'
            '    Header unset Cache-Control\n'
            '    Header always set Cache-Control "no-cache"\n'
            '  </FilesMatch>\n'
            '</IfModule>\n'
            'DirectoryIndex index.html\n')


# ── Portada en erp.axisworks.studio (AXW-70, 28-sep-2026) ──────────────────────────────────────────────────────────
# LISTA CERRADA de lo que se sirve en erp. (Seguridad, rev. #146). Todo lo demás —y en especial /intranet, /panel,
# /contracts, /portal, /entrar y los callbacks de auth— lo manda el .htaccess al ERP real (app.). publica_web() aborta si
# en la carpeta aparece algo fuera de esta lista.
# Lo que es SOLO de la portada: sale de la demo pública (la demo sigue usando demo/catalogo.js).
PORTADA_SOLO = ('index.html', 'demo/landing.css', 'demo/roi.js', 'demo/portada.js')
# Fuentes de la portada (C03, 12-oct-2026): Unbounded, Manrope e IBM Plex Mono, OFL, AUTOALOJADAS (Legal 24-sep: nada a
# Google), los mismos ficheros que la web de axisworks.studio. Fuente única: <raíz del repo>/assets/x/fonts.css; las
# copia publica_web() desde sus url() (con las licencias OFL al lado) y antepone sus @font-face a demo/landing.css. En main
# desde fdcfb73 (web nueva, 12-oct); AXW_FUENTES_X solo para probar otro fonts.css (misma estructura assets/x +
# assets/fonts/x debajo de su raíz). Si no hay ninguno, el build PARA al publicar: sin fuentes saldría con las del sistema.
FUENTES_CSS = os.path.abspath(os.environ.get('AXW_FUENTES_X') or os.path.join(AQUI, '..', '..', 'assets', 'x', 'fonts.css'))
FUENTES_WEB = tuple('assets/fonts/x/' + f for f in (
    'unbounded-300.woff2', 'unbounded-500.woff2', 'unbounded-600.woff2', 'manrope-400.woff2', 'manrope-500.woff2',
    'manrope-700.woff2', 'ibm-plex-mono-400.woff2', 'ibm-plex-mono-500.woff2',
    'OFL-unbounded.txt', 'OFL-manrope.txt', 'OFL-ibm-plex-mono.txt'))
LISTA_WEB = ('index.html', 'demo/landing.css', 'demo/catalogo.js', 'demo/roi.js', 'demo/portada.js', 'favicon.png',
             'favicon.ico', 'robots.txt', '.htaccess') + FUENTES_WEB
# Banda «Claude for Startups» de la portada. ACEPTADO: owner 12-oct 10:10 («estoy en el programa: se queda») + opción (a)
# de Legal 10:25 (encargos/20261012_axisworks_web_nueva_brand_kit.md); la prueba de membresía la guarda el owner. ESTE es
# el único interruptor: False la quita del HTML al construir (no se
# oculta con CSS: no sale). En landing.html va entre <!--axw:startups--> y <!--/axw:startups-->.
CLAUDE_STARTUPS = True
STARTUPS_RE = re.compile(r'<!--axw:startups-->([\s\S]*?)<!--/axw:startups-->')
CONFIG_PORTADA_RE = re.compile(r'<script id="?axw-config"?>[\s\S]*?</script>')


def banda_startups(html_txt, encendida=None):
    """Deja (sin las marcas) o quita la banda «Claude for Startups» según CLAUDE_STARTUPS. Para si no está una vez."""
    on = CLAUDE_STARTUPS if encendida is None else encendida
    nuevo, n = STARTUPS_RE.subn(lambda m: m.group(1) if on else '', html_txt)
    if n != 1:
        aborta('la portada no trae (1 vez) la banda <!--axw:startups-->: encontradas %d' % n)
    return nuevo


def fuentes_portada():
    """(texto de fonts.css, [(ruta publicada, fichero de origen)]) de las url() de fonts.css + sus licencias OFL.
    PARA con un mensaje claro si falta algo: es bloqueo de la PUBLICACIÓN, no de construir (lo llaman publica_web y, desde el
    13-oct, fuentes_panel() para el panel de la instancia con panel_control)."""
    if not os.path.isfile(FUENTES_CSS):
        aborta('faltan las fuentes de la portada de erp.: no existe %s.\n  Viven en main (assets/x/fonts.css + '
               'assets/fonts/x/, desde fdcfb73): ¿copia sin actualizar? Para otro origen, AXW_FUENTES_X=<ruta a un '
               'assets/x/fonts.css con assets/fonts/x/ al lado>.' % FUENTES_CSS)
    raiz_f = os.path.dirname(os.path.dirname(os.path.dirname(FUENTES_CSS)))
    css = open(FUENTES_CSS, encoding='utf-8').read()
    urls = re.findall(r'''url\(\s*['"]?(/assets/fonts/x/[A-Za-z0-9._-]+\.woff2)['"]?\s*\)''', css)
    if not urls or len(urls) != len(re.findall(r'url\(', css)):
        aborta('fonts.css (%s) trae url() fuera de /assets/fonts/x/*.woff2 o ninguna' % FUENTES_CSS)
    pares = []
    for u in urls:
        rel = u.lstrip('/')
        origen = os.path.join(raiz_f, *rel.split('/'))
        if not os.path.isfile(origen):
            aborta('fonts.css pide %s y no está en %s' % (u, origen))
        pares.append((rel, origen))
    for carpeta in sorted({os.path.dirname(o) for _r, o in pares}):
        for f in sorted(os.listdir(carpeta)):
            if f.startswith('OFL-') and f.endswith('.txt'):
                pares.append((os.path.relpath(os.path.join(carpeta, f), raiz_f).replace(os.sep, '/'), os.path.join(carpeta, f)))
    return css, pares
def fuentes_panel():
    """Las @font-face de fonts.css (la misma fuente única que la portada) con cada woff2 DENTRO, en data: (13-oct-2026, erp-panel-3).
    Para /panel/index.html: en producción solo se sirven /panel/, /panel/index.html y /panel/panel.css (.htaccess de app.), así que
    unos woff2 al lado darían 503, y la marca no se pide a Google (Legal, 24-sep). La CSP ya admite `font-src data:`. Unos 180 KB."""
    css, pares = fuentes_portada()
    datos = {}
    for rel, origen in pares:
        if rel.endswith('.woff2'):
            datos['/' + rel] = 'data:font/woff2;base64,' + base64.b64encode(open(origen, 'rb').read()).decode('ascii')
    falta = sorted(set(re.findall(r'(/assets/fonts/x/[A-Za-z0-9._-]+\.woff2)', css)) - set(datos))
    if falta:
        aborta('fuentes del panel: fonts.css cita woff2 que no están entre los ficheros de fuentes: %s' % falta)
    css = re.sub(r'''url\(\s*['"]?(/assets/fonts/x/[A-Za-z0-9._-]+\.woff2)['"]?\s*\)''', lambda m: 'url(%s)' % datos[m.group(1)], css)
    css = re.sub(r'/\*.*?\*/', '', css, flags=re.S).strip()
    if 'url(/' in css or '@font-face' not in css:
        aborta('fuentes del panel: quedan url() locales o no hay @font-face')
    return css


# Tokens de Supabase en el #fragmento (flujo implícito): el servidor no los ve, así que el .htaccess no puede
# mandarlos a app.; lo hace el primer script de la página, antes que nada.
ADELANTA_TOKENS = ("(function(){var h=location.hash||'';if(/(^#|&)(access_token|refresh_token|token_hash|"
                   "error_description)=/.test(h))location.replace(%s+location.pathname+location.search+h);})();\n")


def config_portada(html_txt, demo_url, app_url=None):
    """El primer <script> de la portada: barrido sb-*, (en erp.) tokens del #fragmento a app., y el origen de la demo."""
    js = LIMPIA_SESION + (ADELANTA_TOKENS % json.dumps(app_url) if app_url else '') + \
        'window.AXW_DEMO_URL = %s;' % json.dumps(demo_url)
    nuevo, n = CONFIG_PORTADA_RE.subn(lambda _m: '<script id="axw-config">' + js + '</script>', html_txt)
    if n != 1:
        aborta('la portada no trae (1 vez) su <script id="axw-config">: encontrados %d' % n)
    return nuevo


def publica_web():
    """dist/erp-web/: la portada sola, con los enlaces a la demo absolutos. Sale de lo ya comprobado en DIST."""
    destino = DESTINO_WEB
    if not PRUEBA_ORIGENES and not PRUEBA_PUBLICO and not destino.endswith(os.path.join('AxisWorks', 'dist', 'erp-web')):
        aborta('destino de la portada inesperado: ' + destino)
    fuentes_css, fuentes = fuentes_portada()   # antes de vaciar nada: sin fuentes no se publica
    os.makedirs(destino, exist_ok=True)
    for x in os.listdir(destino):
        p = os.path.join(destino, x)
        shutil.rmtree(p) if os.path.isdir(p) else os.remove(p)
    for f in LISTA_WEB:
        if f in ('index.html', 'robots.txt', '.htaccess') or f in FUENTES_WEB:
            continue
        s = os.path.join(DIST, f.replace('/', os.sep))
        if not os.path.isfile(s):
            aborta('falta en el build lo que la portada necesita: ' + f)
        os.makedirs(os.path.dirname(os.path.join(destino, f.replace('/', os.sep))), exist_ok=True)
        shutil.copy2(s, os.path.join(destino, f.replace('/', os.sep)))
    # Fuentes (C03): de las url() de fonts.css, a la misma ruta; sus @font-face, delante de la hoja de la portada.
    for rel, origen in fuentes:
        d = os.path.join(destino, rel.replace('/', os.sep))
        os.makedirs(os.path.dirname(d), exist_ok=True)
        shutil.copy2(origen, d)
    hoja = os.path.join(destino, 'demo', 'landing.css')
    propia = open(hoja, encoding='utf-8').read()   # leer ANTES de abrir para escribir (que la vacía)
    open(hoja, 'w', encoding='utf-8', newline='\n').write(fuentes_css.rstrip('\n') + '\n' + propia)
    t = config_portada(open(os.path.join(DIST, 'index.html'), encoding='utf-8').read(), DEMO_URL, APP_URL)
    # Enlaces a la demo, ABSOLUTOS: en erp. una ruta /home/ la manda el .htaccess al ERP real, no a la demo.
    t, n = re.subn(r'''(href=["']?)/home/''', lambda m: m.group(1) + DEMO_URL + '/home/', t)
    if not n:
        aborta('la portada no enlaza la demo (/home/): ¿ha cambiado landing.html?')
    # «Open the demo» va a la PORTADA de dos puertas (owner, 13-oct-2026), por su data-enlace y no por el rótulo.
    t, n = re.subn(r'''href="/"(\s+data-enlace="demo")''', lambda m: 'href="' + DEMO_URL + '/"' + m.group(1), t)
    if not n:
        aborta('la portada no enlaza la portada de la demo (href="/" data-enlace="demo"): ¿ha cambiado landing.html?')
    open(os.path.join(destino, 'index.html'), 'w', encoding='utf-8', newline='').write(t)
    open(os.path.join(destino, 'robots.txt'), 'w', encoding='utf-8', newline='\n').write('User-agent: *\nDisallow: /\n')
    permitidas = '|'.join(re.escape(f) for f in LISTA_WEB if f != '.htaccess' and f != 'index.html')
    open(os.path.join(destino, '.htaccess'), 'w', encoding='utf-8', newline='\n').write(
        '# GENERADO por comercial/demo-erp/build.py --publico — no editar.\n'
        '# erp.axisworks.studio: la web comercial del ERP (portada + configurador), lista cerrada de ficheros.\n'
        '# Todo lo demás es del ERP real (app.). 302 mientras dura el cambio de dominios (AXW-70): 301 al cerrarlo.\n'
        '<IfModule mod_rewrite.c>\n  RewriteEngine On\n'
        '  RewriteCond %{HTTP_HOST} !^erp\\.axisworks\\.studio$ [NC]\n'
        '  RewriteRule ^(.*)$ https://erp.axisworks.studio/$1 [R=302,L]\n'
        # Un enlace de auth con la Site URL vieja cae en la raíz (Seguridad, rev. #146): al ERP real con su query.
        '  RewriteCond %{QUERY_STRING} (^|&)(code|token_hash|type)= [NC]\n'
        '  RewriteRule ^$ ' + APP_URL + '/ [R=302,L]\n'
        '  RewriteCond %{REQUEST_URI} !^/(index\\.html|' + permitidas + ')?$\n'
        # E=AXW_ERP_VIEJO: quien llega aquí es casi siempre un navegador con la raíz VIEJA de erp. (el ERP real, que
        # hacía location.replace('/intranet/')) guardada en caché: nunca pide la portada nueva al servidor. Esta
        # respuesta le manda vaciar su caché de erp. (Clear-Site-Data "cache", solo caché: ni cookies ni storage) y la
        # próxima visita ya trae la portada. Visto por el owner el 28-sep: erp. le llevaba a app./intranet/v4/home/.
        '  RewriteRule ^ ' + APP_URL + '%{REQUEST_URI} [R=302,L,E=AXW_ERP_VIEJO:1]\n</IfModule>\n'
        # Comillas simples por fuera: LiteSpeed (Hostinger) NO quita las barras de "\"cache\"" y mandaba \"cache\",
        # que el navegador ignora (visto con curl -I el 28-sep).
        '<IfModule mod_headers.c>\n  Header always set Clear-Site-Data \'"cache"\' env=AXW_ERP_VIEJO\n</IfModule>\n'
        + cabeceras_seguridad(
            # Sin Google Fonts desde C03 (12-oct-2026): las fuentes van autoalojadas (fuentes_portada).
            'default-src \'self\'; script-src \'self\' \'unsafe-inline\'; style-src \'self\' \'unsafe-inline\'; '
            'font-src \'self\'; img-src \'self\' data:; '
            'connect-src \'self\'; frame-ancestors \'self\'; base-uri \'self\'; form-action \'self\'; object-src \'none\''))
    versiona(destino)
    # Lista cerrada: ni un fichero más ni uno menos.
    hay = sorted(os.path.relpath(os.path.join(r, f), destino).replace(os.sep, '/') for r, _d, fs in os.walk(destino) for f in fs)
    if hay != sorted(LISTA_WEB):
        aborta('dist/erp-web no es la lista cerrada:\n  sobra: %s\n  falta: %s'
               % (sorted(set(hay) - set(LISTA_WEB)), sorted(set(LISTA_WEB) - set(hay))))
    t = open(os.path.join(destino, 'index.html'), encoding='utf-8').read()
    malos = [x for x in ('href="/home', "href='/home", 'href=/home', '/contracts/', '/portal/', '/entrar/',
                         'guard.js', '/demo/tour.js', '/demo/modulos.js', 'fonts.googleapis', 'fonts.gstatic') if x in t]
    if DEMO_URL + '/home/' not in t or "window.AXW_DEMO_URL = %s;" % json.dumps(DEMO_URL) not in t:
        malos.append('los enlaces o el origen de la demo no apuntan a ' + DEMO_URL)
    if not PRUEBA_ORIGENES:
        for r, _d, fs in os.walk(destino):
            for f in fs:
                if re.search(r'localhost|127\.0\.0\.1', open(os.path.join(r, f), encoding='utf-8', errors='replace').read()):
                    malos.append('origen local en la versión pública: ' + f)
    if malos:
        aborta('la portada de erp. no se sostiene:\n  ' + '\n  '.join(malos))
    comprueba_resultado(destino)
    print('OK portada en %s: %s' % (destino if PRUEBA_ORIGENES else os.path.relpath(destino, AGENCIA), ', '.join(hay)))



# ── Modo instancia real (F8-lite, 25-sep-2026) ─────────────────────────────────────────────────────────────────────
# `python build.py --instancia <nombre>` construye el ERP REAL de una instancia de erp/instancias.json: el guard de
# verdad (login y RLS contra SU base, con su clave publicable), la marca del estudio en lugar de la de Lawang y
# nada de la demo (ni landing, ni tour, ni doble). Encargo encargos/20260925_estudio_erp_cliente_cero.md.
# Sale FUERA de este repo, que es público (revisión previa #82, Deploy): a erp/despliegues/<nombre>/ de la agencia,
# gitignored allí, que es el clon del repo PRIVADO que Hostinger despliega en el subdominio de la instancia.
DESPLIEGUES = os.path.join(AGENCIA, 'erp', 'despliegues')


def _instancia_registro(nombre):
    return ((json.load(open(os.path.join(AGENCIA, 'erp', 'instancias.json'), encoding='utf-8')).get('instancias') or {})
            .get(nombre) or {})


def _instancia_alias(nombre):
    """Otros hosts que sirven el MISMO ERP durante un cambio de dominio (AXW-70, 28-sep-2026: erp. → app.). El
    .htaccess los acepta además de dominio_erp; un host que no esté en ninguno redirige (302) a dominio_erp."""
    alias = _instancia_registro(nombre).get('dominios_alias') or []
    for d in alias:
        if not re.fullmatch(r'[a-z0-9.-]+\.[a-z]{2,}', d):
            aborta('dominios_alias no válido en %s: %r' % (nombre, d))
    return alias


def _instancia_conf(nombre):
    inst = _instancia_registro(nombre)
    if not inst:
        aborta('instancia desconocida en erp/instancias.json: ' + nombre)
    if nombre == 'lawang':
        aborta('Lawang se sirve desde su propio repo, no desde este build')
    url = ((inst.get('config') or {}).get('url_supabase') or '').rstrip('/')
    clave = inst.get('clave_publicable') or ''
    dominio = inst.get('dominio_erp') or ''
    if not re.fullmatch(r'https://[a-z0-9]{20}\.supabase\.co', url):
        aborta('url_supabase no válida para %s' % nombre)
    if not clave.startswith('sb_publishable_'):
        aborta('falta clave_publicable (sb_publishable_…) de %s: la de servicio no vale nunca' % nombre)
    if not re.fullmatch(r'[a-z0-9.-]+\.[a-z]{2,}', dominio):
        aborta('falta dominio_erp de %s en erp/instancias.json' % nombre)
    return url, clave, dominio, inst.get('marca') or 'AxisWorks'


HTACCESS_INSTANCIA = """# GENERADO por comercial/demo-erp/build.py --instancia {nombre} — no editar.
# {dominio}: el ERP de la instancia (más sus dominios_alias). Fuera de esos hosts, redirige a él.
# 302 y no 301 (AXW-70, Deploy): el navegador guarda un 301 para siempre y un cambio de dominio lo dejaría grabado.
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteCond %{{HTTP_HOST}} !^{dominio_re}$ [NC]
  RewriteRule ^(.*)$ https://{dominio}/$1 [R=302,L]
</IfModule>
{legado}# Lo que nunca debe servirse (estaba solo en el .htaccess de Lawang; aqui lo pedia la revision previa #180): ficheros de
# codigo y de trabajo, y las carpetas de estado. Por extension ademas de por carpeta: lo proximo nace cubierto.
<IfModule mod_alias.c>
  RedirectMatch 404 (?i)\\.(sql|py|ts|mjs|toml|md|bak|log)$
  RedirectMatch 404 (?i)/(private|supabase)/
  RedirectMatch 404 (?i)/_
</IfModule>
<IfModule mod_headers.c>
  Header always set X-Robots-Tag "noindex, nofollow"
  Header always set Strict-Transport-Security "max-age=31536000"
  Header always set X-Content-Type-Options "nosniff"
  Header always set X-Frame-Options "SAMEORIGIN"
  Header always set Referrer-Policy "strict-origin-when-cross-origin"
  Header always set Permissions-Policy "camera=(), microphone=(), geolocation=(), payment=()"
  Header always set Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://cdnjs.cloudflare.com https://connect.facebook.net; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net; font-src 'self' data: https://fonts.gstatic.com https://cdn.jsdelivr.net; img-src 'self' data: blob: https://{sb}; frame-src https://www.facebook.com https://web.facebook.com https://staticxx.facebook.com; connect-src 'self' https://{sb} wss://{sb}; frame-ancestors 'self'; base-uri 'self'; form-action 'self'; object-src 'none'"
  # Hostinger cachea .js/.css 7 días: sin esto, tras publicar el navegador sigue con el guard viejo (AXW-70, Deploy;
  # el mismo bloque que la demo pública).
  <FilesMatch "\\.(html|js|css|json)$">
    Header unset Expires
    Header unset Cache-Control
    Header always set Cache-Control "no-cache"
  </FilesMatch>
</IfModule>
DirectoryIndex index.html
"""
# connect-src: SOLO su base (REST, auth, storage y realtime). Es la barrera de red: aunque un fichero trajera otra
# URL, el navegador no la llamaría.

QA_DOBLE = re.compile(r'<script>\(function\(\)\{try\{(?:(?!</script>).)*?_qa_double_guard\.js.*?</script>', re.S)

# «Módulo no instalado» (28-sep-2026, owner: «poner info de AxisWorks ahí»): UNA plantilla, no_instalado.html, para las
# dos vías — la pantalla no portada que el build sustituye (estática) y el módulo apagado desde el panel, que
# apagados_instancia.js pinta al cargar. Antes eran dos textos sueltos en system-ui, sin marca ni salida.
PLANTILLA_NO_INSTALADO = os.path.join(AQUI, 'no_instalado.html')
SELLO_AXISWORKS = os.path.join(AQUI, '..', '..', 'assets', 'favicon.svg')   # la ✕ de la marca, fuente de la web
CAMPOS_NO_INSTALADO = {'titulo', 'texto', 'que_hace', 'asunto', 'oculta_que_hace', 'oculta_contacto', 'oculta_reintenta'}
HOJA_V4 = ('assets', 'tw-base.css')   # tras reraiz(): antes colgaba de intranet/v4/


def no_instalado_base(marca):
    """La plantilla con la marca de la instancia y el sello de AxisWorks puestos, lista para rellenar por pantalla.
    Aborta si usa una clase que la hoja de la v4 no trae (Tailwind purgado en el repo de Lawang: una clase puede
    desaparecer en silencio y la pantalla saldría sin estilo) o si sus huecos no son los que rellenan las dos vías."""
    t = re.sub(r'<!--.*?-->\s*', '', open(PLANTILLA_NO_INSTALADO, encoding='utf-8').read(), flags=re.S).strip()
    sello = open(SELLO_AXISWORKS, encoding='utf-8').read().strip()
    if not sello.startswith('<svg '):
        aborta('el sello de AxisWorks (assets/favicon.svg) no es un <svg>')
    sello = sello.replace('<svg ', '<svg width="32" height="32" aria-hidden="true" focusable="false" ', 1)
    t = t.replace('{{marca}}', html.escape(marca + ' ERP')).replace('{{sello}}', sello)
    huecos = set(re.findall(r'\{\{([a-z_]+)\}\}', t))
    if huecos != CAMPOS_NO_INSTALADO:
        aborta('no_instalado.html: huecos %s, se esperaban %s' % (sorted(huecos), sorted(CAMPOS_NO_INSTALADO)))
    hoja = open(os.path.join(DIST, *HOJA_V4), encoding='utf-8').read()
    faltan = sorted({c for grupo in re.findall(r'class="([^"]*)"', t) for c in grupo.split()
                     if not re.search(r'\.' + re.escape(c) + r'\s*\{', hoja)})
    if faltan:
        aborta('no_instalado.html usa clases que %s no trae: %s' % ('/'.join(HOJA_V4), ', '.join(faltan)))
    js = open(os.path.join(AQUI, 'apagados_instancia.js'), encoding='utf-8').read()
    distintos = [x for x in TEXTOS_NO_INSTALADO if x not in js]
    if distintos:
        aborta('pantalla() de apagados_instancia.js ya no dice lo mismo que pagina_no_instalado(): %s' % distintos)
    return t


def rotulos():
    """{clave del registro: [nombre, sección, icono, qué hace]} de modulos_rotulos.json, la fuente única del lado ERP
    (panel de control y «Módulo no instalado»). Aborta si una clave de erp/modulos.json no tiene fila: un módulo nuevo
    saldría en el panel con su clave y en la pantalla sin nombre."""
    r = {k: v for k, v in json.load(open(os.path.join(AQUI, 'modulos_rotulos.json'), encoding='utf-8')).items()
         if not k.startswith('_')}
    mods = json.load(open(os.path.join(AGENCIA, 'erp', 'modulos.json'), encoding='utf-8'))['modulos']
    faltan = sorted(set(mods) - set(r))
    malos = sorted(k for k, v in r.items() if not (isinstance(v, list) and len(v) == 4 and all(isinstance(x, str) and x for x in v)))
    if faltan or malos:
        aborta('modulos_rotulos.json: sin fila %s · filas mal formadas %s' % (faltan, malos))
    return r


# Suman pasos a AXW_SETUP.TEXTOS, en el orden del paquete. cobros_paso.js no: engancha la página al cargarse (getElementById) y la
# frase de su paso «cobros» ya vive en setup_modulos.js. Un fichero nuevo que sume pasos se añade aquí (si falta, el build aborta).
SETUP_SUMAN = ('setup_reservas.js', 'setup_comun.js')


def setup_para_panel():
    """Lo que el panel de control necesita del REGISTRO para el setup (12-oct-2026, erp-panel-2; owner: «módulo primero y setup
    después»): el hueco __AXW_SETUP__ de panel_control.html. Nada se escribe a mano aquí:
      - `registro`: erp/modulos.json → setup.modulos (lo que declara erp/modulos.py → SETUP). Solo lo usa el mapa de la instalación
        (S00, la lámina por tipo de negocio): los pasos de UNA instancia los da su base (erp_control_estado → setup), nunca esto.
      - `textos`: los títulos de cada paso y de cada módulo en es y en, sacados de setup_modulos.js y de los ficheros que le suman pasos
        (SETUP_SUMAN: Reservas de producto y pasos comunes; el mismo mapa código → frase del aviso, el asistente y Ajustes; no hay
        una segunda copia de las frases).
      - `en`: panel_setup_en.json (nombres EN de módulos y tipos). Aborta si falta un módulo del registro o un tipo de perfiles.json."""
    reg = json.load(open(os.path.join(AGENCIA, 'erp', 'modulos.json'), encoding='utf-8'))
    perf = json.load(open(os.path.join(AGENCIA, 'erp', 'perfiles.json'), encoding='utf-8'))['perfiles']
    en = json.load(open(os.path.join(AQUI, 'panel_setup_en.json'), encoding='utf-8'))
    faltan = sorted(set(reg['modulos']) - set(en['modulos'])) + sorted('tipo ' + t for t in set(perf) - set(en['tipos']))
    if faltan:
        aborta('panel_setup_en.json: sin nombre en inglés para %s' % faltan)
    # 13-oct (erp-panel-4): los pasos de Reservas de producto (clase, reglas_reserva, alquileres_previos) y los comunes (negocio, idiomas,
    # correo, taller_*) suman su frase desde su propio fichero (en S.TEXTOS) y su inglés en LW_EN, no en S.EN. Se cargan detrás, en
    # el orden en que los sirve el paquete (el de setup_frases.test.js), con AXW_PASOS y addEventListener de mentira (solo registran
    # pantallas y eventos, que aquí no se pintan): sin ellos, el registro declaraba esos pasos y el build de la instancia del estudio abortaba.
    prog = ("global.window={LW_EN:{},LW_ID:{},addEventListener:function(){}};global.document={readyState:'complete',addEventListener:function(){}};"
            "global.location={pathname:'/'};require(process.argv[1]);var S=window.AXW_SETUP;window.AXW_PASOS={registra:function(){}};"
            "process.argv.slice(2).forEach(function(f){require(f);});var E=function(t){return S.EN[t]||window.LW_EN[t]||null;};"
            "var o={paso:{},modulo:{}};Object.keys(S.TEXTOS.paso).forEach(function(k){var t=S.TEXTOS.paso[k][0];o.paso[k]={es:t,en:E(t)};});"
            "Object.keys(S.TEXTOS.modulo).forEach(function(k){var t=S.TEXTOS.modulo[k];o.modulo[k]={es:t,en:E(t)};});"
            "process.stdout.write(JSON.stringify(o));")
    r = subprocess.run(['node', '-e', prog] + [os.path.join(AQUI, f) for f in ('setup_modulos.js',) + SETUP_SUMAN],
                       capture_output=True, text=True, encoding='utf-8')
    if r.returncode != 0:
        aborta('setup_modulos.js / %s no se dejan leer para el panel: ' % ', '.join(SETUP_SUMAN) + (r.stderr or '')[-400:])
    textos = json.loads(r.stdout)
    sin_en = sorted(k for k, v in textos['paso'].items() if not v['en'])
    pasos_decl = sorted({p['clave'] for m in reg['setup']['modulos'].values() if isinstance(m, dict) for p in m.get('pasos', [])})
    sin_texto = [k for k in pasos_decl if k not in textos['paso']]
    if sin_en or sin_texto:
        aborta('setup_modulos.js + %s: pasos sin frase en inglés %s · pasos declarados sin frase %s' % (', '.join(SETUP_SUMAN), sin_en, sin_texto))
    # Lista blanca (revisor, 12-oct): /panel/ es público (sin sesión da 200), así que solo sale lo que el mapa lee — clave, obligatorio,
    # irreversible y si el módulo se declara «ninguno» —, nunca rpc, ajustes, funciones de estado, herramientas ni el motivo interno.
    registro = {}
    for k, d in reg['setup']['modulos'].items():
        if isinstance(d, str) and d.startswith('ninguno'):
            registro[k] = {'ninguno': True}
        elif isinstance(d, dict) and isinstance(d.get('pasos'), list):
            registro[k] = {'pasos': [{'clave': p['clave'], 'obligatorio': bool(p['obligatorio']), 'irreversible': bool(p['irreversible'])}
                                     for p in d['pasos']]}
        else:
            aborta('erp/modulos.json → setup.%s: forma desconocida' % k)
    return {'registro': registro, 'textos': textos, 'en': {'modulos': en['modulos'], 'tipos': en['tipos']}}


# Los textos de pantalla() en apagados_instancia.js: deben ser los mismos que aquí (no_instalado_base lo comprueba).
TEXTOS_NO_INSTALADO = ('Módulo no instalado', ' no está activo en esta instancia.',
                       'Este módulo no está activo en esta instancia.', 'Activar módulo: ')


# El aviso estático en los idiomas de la instancia (erp-front, 14-oct-2026; agencia-81: «Bali Best es un cliente indonesio: el aviso tiene que salir en
# los idiomas de la instancia»). instancia() pone aquí (idiomas, idioma de pantalla por defecto) de la ficha; None = el de siempre, solo en español.
AVISO_IDIOMAS = None
# Frases del aviso por idioma. Las de la plantilla son el español EXACTO de no_instalado.html (si una cambia, el build aborta: saldría a medias).
# «%s» = el nombre de la pantalla o del módulo; sin nombre en ese idioma, la frase sin nombre (nunca español dentro de otro idioma).
FRASES_PLANTILLA_NO_INSTALADO = ('aria-label="Cómo activarlo"', 'Este ERP lo construye y mantiene AxisWorks. Para activar este módulo en tu empresa, '
                                 'escríbenos y lo vemos contigo.', '>Reintentar<', '>Volver al inicio<')
AVISO_I18N = {
    'en': {'incluida': 'Screen not included', 'instalado': 'Module not installed',
           'incluida_n': '«%s» is not included in this instance.', 'incluida_0': 'This screen is not included in this instance.',
           'activo_n': '«%s» is not active in this instance.', 'activo_0': 'This module is not active in this instance.', 'asunto': 'Activate module: ',
           'error_t': 'Could not check the modules', 'error_x': "We couldn't ask the database which modules this instance has. It isn't missing: try again.",
           'plantilla': ('aria-label="How to activate it"', 'This ERP is built and maintained by AxisWorks. To activate this module for your company, '
                         'write to us and we will go through it with you.', '>Retry<', '>Back to home<')},
    'id': {'incluida': 'Layar tidak tersedia', 'instalado': 'Modul belum dipasang',
           'incluida_n': '«%s» tidak termasuk dalam ERP ini.', 'incluida_0': 'Layar ini tidak termasuk dalam ERP ini.',
           'activo_n': '«%s» belum aktif di ERP ini.', 'activo_0': 'Modul ini belum aktif di ERP ini.', 'asunto': 'Aktifkan modul: ',
           'error_t': 'Modul tidak dapat diperiksa', 'error_x': 'Kami tidak dapat menanyakan ke basis data modul apa saja yang dimiliki ERP ini. Bukan berarti tidak ada: coba lagi.',
           'plantilla': ('aria-label="Cara mengaktifkannya"', 'ERP ini dibangun dan dikelola oleh AxisWorks. Untuk mengaktifkan modul ini di perusahaan '
                         'Anda, kirimi kami pesan dan kami akan membahasnya bersama Anda.', '>Coba lagi<', '>Kembali ke beranda<')},
}


def _nombre_en(nombre_es, modulo, idioma):
    """El nombre de la pantalla o del módulo en `idioma`, o None si no se sabe. en: panel_setup_en.json (el del panel de módulos), por clave de
    módulo · id: i18n_id.json (el diccionario de la interfaz), por el nombre en español."""
    if not nombre_es:
        return None
    menu = (MENU_I18N.get(nombre_es) or {}).get(idioma)
    if menu:
        return menu
    if idioma == 'en':
        # el nombre del MÓDULO en inglés solo si lo que se nombra es el módulo (no una pantalla suya: «Generador de contratos» no es «Contracts»)
        if not modulo or (rotulos().get(modulo) or [None])[0] != nombre_es:
            return None
        return json.load(open(os.path.join(AQUI, 'panel_setup_en.json'), encoding='utf-8'))['modulos'].get(modulo)
    return json.load(open(os.path.join(AQUI, 'i18n_id.json'), encoding='utf-8')).get(nombre_es)


def _valores_no_instalado(ficha, ruta, herramienta, modulo, idioma):
    from urllib.parse import quote
    if idioma == 'es':
        if herramienta:
            return {'titulo': 'Pantalla no incluida', 'texto': '«%s» no se incluye en esta instancia.' % herramienta,
                    'que_hace': '', 'asunto': '', 'oculta_que_hace': 'hidden', 'oculta_contacto': 'hidden',
                    'oculta_reintenta': 'hidden'}
        nombre, que_hace = ficha or (None, None)
        return {'titulo': TEXTOS_NO_INSTALADO[0],
                'texto': ('«%s»%s' % (nombre, TEXTOS_NO_INSTALADO[1])) if nombre else TEXTOS_NO_INSTALADO[2],
                'que_hace': que_hace or '', 'asunto': quote(TEXTOS_NO_INSTALADO[3] + (nombre or ruta), safe=''),
                'oculta_que_hace': '' if que_hace else 'hidden', 'oculta_contacto': '', 'oculta_reintenta': 'hidden'}
    tr = AVISO_I18N.get(idioma)
    if not tr:
        aborta('aviso de pantalla no incluida: no hay frases en %r (AVISO_I18N de build.py)' % idioma)
    if herramienta:
        n = _nombre_en(herramienta, modulo, idioma)
        return {'titulo': tr['incluida'], 'texto': tr['incluida_n'] % n if n else tr['incluida_0'], 'que_hace': '', 'asunto': '',
                'oculta_que_hace': 'hidden', 'oculta_contacto': 'hidden', 'oculta_reintenta': 'hidden'}
    nombre = (ficha or (None, None))[0]
    n = _nombre_en(nombre, modulo, idioma)
    # el «qué hace» del módulo solo existe en español (modulos_rotulos.json): en otro idioma no sale
    return {'titulo': tr['instalado'], 'texto': tr['activo_n'] % n if n else tr['activo_0'], 'que_hace': '',
            'asunto': quote(tr['asunto'] + (n or ruta), safe=''), 'oculta_que_hace': 'hidden', 'oculta_contacto': '', 'oculta_reintenta': 'hidden'}


def aviso_i18n_js(base, mapa):
    """Lo que necesita pantalla() de apagados_instancia.js para pintar «Módulo no instalado» en otro idioma (revisor 14-oct, 2.ª vuelta: el aviso
    que sale al vuelo seguía solo en español): por idioma de la instancia que no es el español, la plantilla traducida y las frases, y el nombre de
    cada módulo en ese idioma cuando se sabe. Vacío sin AVISO_IDIOMAS (el de siempre)."""
    if not AVISO_IDIOMAS:
        return {}
    out = {}
    for l in AVISO_IDIOMAS[0]:
        if l == 'es':
            continue
        tr = AVISO_I18N.get(l)
        if not tr:
            aborta('aviso de pantalla no incluida: no hay frases en %r (AVISO_I18N de build.py)' % l)
        nombres = {}
        for mod, ficha in (mapa.get('n') or {}).items():
            n = _nombre_en(ficha[0] if ficha else None, mod, l)
            if n:
                nombres[mod] = n
        out[l] = {'p': _plantilla_en(base, l), 'tit': tr['instalado'], 'an': tr['activo_n'], 'a0': tr['activo_0'], 'as': tr['asunto'],
                  'et': tr['error_t'], 'ex': tr['error_x'], 'n': nombres}
    return out


def _plantilla_en(base, idioma):
    if idioma == 'es':
        return base
    for es, otro in zip(FRASES_PLANTILLA_NO_INSTALADO, AVISO_I18N[idioma]['plantilla']):
        if es not in base:
            aborta('no_instalado.html ya no dice %r: el aviso en %s saldría a medias (FRASES_PLANTILLA_NO_INSTALADO de build.py)' % (es, idioma))
        base = base.replace(es, otro)
    return base


def pagina_no_instalado(base, marca, ficha, ruta, herramienta=None, modulo=None):
    """La pantalla estática: mismos textos que pantalla() de apagados_instancia.js. `herramienta` (nombre): una pantalla
    que esta instancia no trae aunque su módulo esté encendido (el generador de contratos, el portal clásico…): es
    estática y no sabe qué está activo, así que no nombra el módulo ni invita a contratarlo (revisor, 28-sep).
    Con AVISO_IDIOMAS (instancia con `idiomas`) lleva una variante por idioma en <div data-axw-idioma>: se ve la del idioma de pantalla de la
    ficha y una línea de guion cambia a la que eligió esa persona (axw_idioma_ui, la clave de idioma.js) o a la de la base
    (axw_idioma_pantalla_erp), si la instancia la ofrece. `modulo` (clave) da el nombre en inglés."""
    rellena = lambda t, v: re.sub(r'\{\{([a-z_]+)\}\}', lambda m: html.escape(v[m.group(1)]), t)
    if not AVISO_IDIOMAS:
        v = _valores_no_instalado(ficha, ruta, herramienta, modulo, 'es')
        lengua, titulo, cuerpo = 'es', v['titulo'], rellena(base, v)
    else:
        idiomas, lengua = AVISO_IDIOMAS
        lengua = lengua if lengua in idiomas else idiomas[0]
        partes, titulos = [], {}
        for l in idiomas:
            v = _valores_no_instalado(ficha, ruta, herramienta, modulo, l)
            titulos[l] = v['titulo'] + ' · ' + marca
            partes.append('<div data-axw-idioma="%s" lang="%s"%s>%s</div>' % (l, l, '' if l == lengua else ' hidden', rellena(_plantilla_en(base, l), v)))
        titulo = titulos[lengua][:-len(' · ' + marca)]
        cuerpo = ''.join(partes) + (
            '<script>(function(){var l=%s,d=%s,t=%s,g=null,b=null;try{g=localStorage.getItem("axw_idioma_ui");b=localStorage.getItem("axw_idioma_pantalla_erp");}'
            'catch(e){}var x=l.indexOf(g)>=0?g:(l.indexOf(b)>=0?b:d);if(x===d)return;var v=document.querySelectorAll("[data-axw-idioma]");'
            'for(var i=0;i<v.length;i++)v[i].hidden=v[i].getAttribute("data-axw-idioma")!==x;document.documentElement.lang=x;document.title=t[x];})();</script>'
            % (json.dumps(idiomas), json.dumps(lengua), json.dumps(titulos, ensure_ascii=False).replace('<', '\\u003c')))
    return ('<!doctype html>\n<html lang="%s"><head><meta charset="utf-8">'
            '<meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex">'
            '<title>%s · %s</title><link rel="icon" href="/favicon.png">'
            '<link href="/assets/fonts/fonts.css" rel="stylesheet">'
            '<link href="/assets/tw-base.css" rel="stylesheet"></head>\n<body>%s</body></html>\n'
            % (lengua, html.escape(titulo), html.escape(marca), cuerpo))


def ruta_limpia(u):
    """Una pantalla de erp/modulos.json (/intranet/v4/x/) con la ruta que tiene en el bundle (/x/). Esas claves se comparan
    con location.pathname en el navegador (apagados_instancia.js): sin traducirlas, el apagado de módulos moriría sin
    error. Una ruta que quedara en `/` ocultaría TODOS los enlaces absolutos (a[href^="/"]): se rechaza."""
    n = mapea_url(u)
    if not re.fullmatch(r'/[a-z0-9-]+/(?:[a-z0-9-]+/)?', n):
        aborta('pantalla de módulo sin ruta limpia válida: %s → %s' % (u, n))
    return n


def pantallas_por_tipo(nombre):
    """{ruta limpia: módulo} de las pantallas que esta instancia NO puede encender nunca por su TIPO de ERP, más las de los módulos «fuera» (solo Lawang).
    N6.3 del plan ajustado (erp-front, 14-oct-2026; owner 13-oct: «las instalaciones del ERP MAESTRO deben estar limpias»; agencia-81: «por TIPO, no por
    encendido»): el paquete lleva el núcleo, Ajustes y TODAS las pantallas de los módulos de su tipo, encendidos o no, porque un módulo se enciende desde el
    panel sin volver a publicar (apagados_instancia.js lo decide en el navegador). Lo de otro tipo no se puede encender ahí, así que su pantalla sale como
    «Pantalla no incluida» y los ficheros que solo ella cargaba salen del paquete (como apagados_extra.p). El tipo es `config.tipo_erp` del registro de
    instancias (A12) y el de cada módulo, TIPO_MODULO de erp/modulos.py (E3.1): una sola fuente, la misma que usa el servidor (A13). Sin tipo en el registro,
    nada cambia (la instancia sale como hasta hoy). Revertir: devolver {} aquí."""
    tipo = (_instancia_registro(nombre).get('config') or {}).get('tipo_erp')
    if tipo is None:
        return {}
    sys.path.insert(0, os.path.join(AGENCIA, 'erp'))
    from modulos import TIPO_MODULO, TIPOS_ERP
    if tipo not in TIPOS_ERP:
        aborta('erp/instancias.json: %s declara tipo_erp %r y solo se conocen %s' % (nombre, tipo, ', '.join(TIPOS_ERP)))
    m = json.load(open(os.path.join(AGENCIA, 'erp', 'modulos.json'), encoding='utf-8'))
    out = {}
    for mod, d in sorted(TIPO_MODULO.items()):
        if mod == 'base' or ((d.get('clase') != 'fuera') and ('todos' in d['tipos'] or tipo in d['tipos'])):
            continue
        for u in (m['modulos'].get(mod) or {}).get('pantallas') or []:
            if u.startswith('/intranet/'):
                out[ruta_limpia(u)] = mod
    return out


def mapa_modulos(nombre):
    """Panel de control (28-sep-2026, rev. previa #138): el mapa objeto → módulo de TODOS los módulos (salvo base), para
    que el navegador decida al cargar con los activos que le da la base (apagados_instancia.js). Hasta el 27-sep esto
    era la lista de lo APAGADO según erp/instancias.json, grabada en el build: con los módulos cambiando desde el panel,
    un build no puede saber qué estará apagado mañana.
      t/f/b/e: tabla o vista / función / bucket / edge → módulo   ·   p: {prefijo de pantalla: módulo}
      x, xp:   apagados_extra (objetos y pantallas que esta base NO tiene porque no se portaron): siempre apagados.
    `/panel/` no es de ningún módulo (Des #5)."""
    reg = json.load(open(os.path.join(AGENCIA, 'erp', 'instancias.json'), encoding='utf-8'))['instancias'][nombre]
    m = json.load(open(os.path.join(AGENCIA, 'erp', 'modulos.json'), encoding='utf-8'))
    sys.path.insert(0, os.path.join(AGENCIA, 'erp'))
    from modulos import DESPLIEGUE_EDGES
    out = {'t': {}, 'f': {}, 'b': {}, 'e': {}, 'p': {}, 'x': {'t': {}, 'f': {}, 'b': {}}, 'xp': []}
    for clase, k in (('tablas', 't'), ('vistas', 't'), ('funciones', 'f'), ('buckets', 'b')):
        for obj, d in m['objetos'].get(clase, {}).items():
            if d['clase'] == 'modulo' and d['detalle'] and d['detalle'][0] != 'base':
                out[k][obj] = d['detalle'][0]
    for n, e in DESPLIEGUE_EDGES.items():
        if e['modulo'] != 'base' and not e.get('solo_lawang'):   # las solo_lawang no existen en una instancia
            out['e'][n] = e['modulo']
    for mod, d in m['modulos'].items():
        if mod != 'base':
            for u in d.get('pantallas') or []:
                if u.startswith('/intranet/'):
                    out['p'][ruta_limpia(u)] = mod
    if any(u.startswith('/panel') for u in out['p']):
        aborta('/panel/ no puede ser pantalla de un módulo: el panel de control se quedaría oculto')
    # apagados_extra (27-sep-2026, B8 del encargo del canon): lo que esta base NO tiene. Misma lista que lee
    # erp/contrato_front.py y que el instalador marca como no instalable en la base.
    extra = reg.get('apagados_extra') or {}
    for k in ('t', 'f', 'b'):
        for obj, mod in (extra.get(k) or {}).items():
            out['x'][k][obj] = mod
    # y las pantallas de los módulos que esta instancia no puede encender nunca (misma regla que el instalador y que
    # erp/contrato_front.py: nueva_instancia.no_instalables): se sirven como «Módulo no instalado»
    from nueva_instancia import no_instalables
    nunca = set(no_instalables(reg))
    xp = {ruta_limpia(u) for u in extra.get('p') or []}
    for mod in nunca:
        xp |= {ruta_limpia(u) for u in (m['modulos'].get(mod) or {}).get('pantallas') or [] if u.startswith('/intranet/')}
    xp |= set(pantallas_por_tipo(nombre))   # N6.3 (14-oct-2026): lo de otro tipo, también oculto en el menú
    out['xp'] = sorted(xp)
    # n: nombre y «qué hace» de cada módulo, para la pantalla «Módulo no instalado» (28-sep-2026)
    out['n'] = {k: [v[0], v[3]] for k, v in rotulos().items() if k != 'base'}
    # h: la herramienta de cada módulo con setup, la MISMA con la que la base decide el paso «Quién lo usa» (setup.modulos[m].herramienta,
    # sembrada desde este registro). El paso del asistente da o quita solo esa herramienta (bbm-p41, 13-oct, mesa S14 del diseño del owner).
    out['h'] = {k: d['herramienta'] for k, d in ((m.get('setup') or {}).get('modulos') or {}).items()
                if isinstance(d, dict) and isinstance(d.get('herramienta'), str) and d['herramienta']}
    # operativos: en ellos el super_admin no cuenta como «quién lo usa» (20261012130000_f3_e1_setup_marco.sql, paso usuarios)
    out['o'] = sorted(k for k, d in ((m.get('setup') or {}).get('modulos') or {}).items() if isinstance(d, dict) and d.get('operativo') is True)
    # r: rótulos por RUTA (erp-front, 14-oct-2026). En una instancia de tipo Reservas /productos/ es la pantalla «Extras y servicios» (extras_pantalla):
    # apagados_instancia.js cambia el texto visible de los enlaces a esa ruta. Sin anclas sobre el texto de nav.js de Lawang.
    out['r'] = ROTULOS_RUTA_RESERVAS if portada_de(nombre) == 'reservas' else {}
    return out


# Textos del editor de ficha (editores.js, copia de Lawang): van en español a secas, como el resto de ese formulario (la copia no
# traduce sus avisos y el diccionario i18n.js es de Lawang).
MSG_CAMPO_NO_PEDIBLE = 'Ese dato (nacionalidad, pasaporte / NPWP o estado KYC) no se puede pedir por aquí. Envía una petición libre desde Asistente y la resuelve un administrador.'
NOTA_EDITOR = 'Nacionalidad, pasaporte / NPWP y estado KYC no se piden por aquí: envía una petición libre desde Asistente.'


def quien_cambio_lawang(donde):
    """Para el mensaje de un ancla que ya no casa: el último commit de Lawang que tocó el fichero nombrado en `donde` (si es de Lawang).
    Así el aviso dice QUÉ aterrizaje de Lawang lo rompió, no solo que algo cambió (13-oct: dos veces en dos días). Nunca tapa el aborto."""
    # la ruta entera («intranet/v4/assets/editores.js») o un nombre corto («nav.js MENU_V4», «ajustes/index.html»): se busca en las carpetas de
    # Lawang de donde sale la copia, y la primera que exista manda
    m = re.search(r'([\w./-]+\.(?:js|html|css))', donde)
    if not m or '..' in m.group(1):
        return ''
    rel_ = next((c for c in (m.group(1), 'intranet/v4/' + m.group(1), 'intranet/v4/assets/' + m.group(1), 'contracts/assets/' + m.group(1))
                 if os.path.isfile(os.path.join(LAWANG, *c.split('/')))), None)
    if not rel_:
        return ''
    try:
        r = subprocess.run(['git', '-C', LAWANG_GIT, '--no-optional-locks', 'log', '-1', '--date=short', '--format=%h %ad %s', LAWANG_REV, '--', rel_],
                           capture_output=True, text=True, encoding='utf-8', timeout=20)
        return (' · último cambio de Lawang en %s: %s' % (rel_, r.stdout.strip()[:160])) if r.returncode == 0 and r.stdout.strip() else ''
    except Exception:   # MUDO A PROPOSITO: es solo una pista para el mensaje; el build ya está parando
        return ''


def _una_vez(texto, viejo, nuevo, donde):
    """Reemplazo LITERAL de algo que tiene que aparecer exactamente una vez: si Lawang cambia ese trozo, el build para (nunca
    un reemplazo que no encuentra nada y deja el permiso o el menú a medias, sin un solo error)."""
    if texto.count(viejo) != 1:
        aborta('%s: esperaba exactamente 1 vez %r y hay %d (¿cambió el fichero de Lawang?)%s' % (donde, viejo[:90], texto.count(viejo), quien_cambio_lawang(donde)))
    return texto.replace(viejo, nuevo)


def asistente_maestro():
    """Pantalla /asistente/ del ERP maestro (AXW-136 subtarea 3, 2-oct-2026; encargos/20261002_erp_asistente_maestro.md).
    La v4 que copia copia_v4() trae la página de Lawang (peticiones por Telegram, tablas leídas con sb.from, permiso `asistente`
    que en el maestro es el del bot). En el maestro la sustituye `asistente_peticiones.html` (lee por solicitudes_cambio_datos,
    resuelve con un panel y NO lleva Telegram), y el permiso pasa a ser `asistente_peticiones`, el que comprueba la base. Se hace
    AL PRINCIPIO de instancia(), con las rutas de Lawang: lo que viene después (limpia comentarios, reraiz, marca, ?v=) la trata
    como a cualquier otra pantalla. Lo apagado se decide en el navegador (apagados_instancia.js): con el módulo `asistente` apagado
    esta página se cambia por «Módulo no instalado». La demo pública (sin --instancia) conserva la de Lawang: su doble no sirve estas RPC.
    Solo se toca lo copiado en DIST, nunca el repo de Lawang."""
    v4 = os.path.join(DIST, 'intranet', 'v4')
    # 1. La página: el <head> y la cáscara siguen siendo los de Lawang (una sola fuente); se cambia el contenido y su script.
    pag = os.path.join(v4, 'asistente', 'index.html')
    t = open(pag, encoding='utf-8').read()
    frag = open(os.path.join(AQUI, 'asistente_peticiones.html'), encoding='utf-8').read().split('<!--AXW_SCRIPT-->')
    if len(frag) != 2:
        aborta('asistente_peticiones.html: tiene que llevar UNA línea <!--AXW_SCRIPT--> entre el marcado y el script')
    marcado, script = frag[0].strip(), frag[1].strip()
    ancla = '<div class="flex flex-col w-full gap-8">'
    cierre = '</div>\n</main></div>\n<script>'
    fin = '</script>\n</body></html>'
    if t.count(ancla) != 1 or t.count(cierre) != 1 or not t.rstrip().endswith(fin):
        aborta('asistente_maestro: la página de Lawang ya no tiene la forma esperada (contenedor, cierre de <main>, script final)')
    i0, i1 = t.index(ancla), t.index(cierre)
    if i1 < i0:
        aborta('asistente_maestro: el cierre de <main> está antes del contenedor')
    t = t[:i0] + marcado + '\n</main></div>\n' + script + '\n</body></html>\n'   # el </div> final de `marcado` cierra el contenedor
    t = _una_vez(t, 'data-herramienta="asistente"', 'data-herramienta="asistente_peticiones"', 'asistente/index.html')
    open(pag, 'w', encoding='utf-8', newline='').write(t)
    # 2. El permiso: menú, casilla de Usuarios, mascota y hub miran `asistente_peticiones` (lo que exige la base en
    # solicitud_cambio_pide). `asistente-correos` sigue con `asistente` (el bot). NO se tocan los presets por rol de
    # herramientas.js: admin-usuarios (código de Lawang) rechaza con 400 una herramienta que no conoce al dar de alta.
    nav = os.path.join(v4, 'assets', 'nav.js')
    n = open(nav, encoding='utf-8').read()
    n = _una_vez(n, "{ path: 'asistente', texto: 'Asistente', clave: 'asistente' }", "{ path: 'asistente', texto: 'Asistente', clave: 'asistente_peticiones' }", 'nav.js MENU_V4')
    n = _una_vez(n, "contratos: 'contratos', asistente: 'asistente', 'asistente-correos': 'asistente',", "contratos: 'contratos', asistente: 'asistente_peticiones', 'asistente-correos': 'asistente',", 'nav.js CLAVE_MENU')
    # Un admin pasa SIN la casilla (decisión del CEO, 2-oct-2026): la base lo deja (`es_admin() or puede('asistente_peticiones')` dentro
    # de las RPC de listar y resolver); el agente sigue necesitándola. Menú, tarjeta del hub y puerta (guard.js, abajo) dicen lo mismo.
    # (7-oct-2026, reforma «dos empresas» de Lawang: puedeVer/lwPermitida/guard pasaron a LW_ROL.esSuperGlobal.) El super global pasa como
    # antes; el admin SOLO con rol === 'admin' exacto (un admin_empresa NO: no se amplía a nadie), y fallo cerrado si no hay ficha clara.
    n = _una_vez(n, "if (!k || !ficha || LW_ROL.esSuperGlobal(ficha)) return true;",
                 "if (!k || !ficha || LW_ROL.esSuperGlobal(ficha) || (path === 'asistente' && ficha.rol === 'admin')) return true;", 'nav.js puedeVer')
    open(nav, 'w', encoding='utf-8', newline='').write(n)
    her = os.path.join(DIST, 'contracts', 'assets', 'herramientas.js')
    h = open(her, encoding='utf-8').read()
    h = _una_vez(h, "href:'/intranet/v4/asistente/', herr:'asistente',", "href:'/intranet/v4/asistente/', herr:'asistente_peticiones',", 'herramientas.js tarjeta Asistente')
    h = _una_vez(h, "(!ficha || window.LW_ROL.esSuperGlobal(ficha) || !t.herr ||",
                 "(!ficha || window.LW_ROL.esSuperGlobal(ficha) || !t.herr || (t.herr === 'asistente_peticiones' && ficha.rol === 'admin') ||", 'herramientas.js lwPermitida')
    open(her, 'w', encoding='utf-8', newline='').write(h)
    # 3. El editor de ficha (editores.js, copia de Lawang): en el maestro la lista blanca de `solicitud_cambio_pide` es más corta
    # (sin nacionalidad, pasaporte/NPWP ni estado KYC: la base rechaza esos campos con 22023 «el campo X no se puede pedir por aquí»).
    # Se avisa en el propio formulario de «Pedir cambio» y el rechazo se explica con palabras; el contrato de la RPC no cambia.
    ed = os.path.join(v4, 'assets', 'editores.js')
    e = open(ed, encoding='utf-8').read()
    e = _una_vez(e, "Cambia lo que haga falta y se enviará al administrador para que lo apruebe; te llegará la respuesta a la campana.' },",
                 "Cambia lo que haga falta y se enviará al administrador para que lo apruebe; te llegará la respuesta a la campana. %s' }," % NOTA_EDITOR,
                 'editores.js nota de pedir cambio')
    viejo_rechazo = "          if (r.error) return { error: { message: r.error.message } };\n          var n = r.data;\n          toast('Enviado para aprobar'"
    nuevo_rechazo = ("          if (r.error) return { error: { message: /no se puede pedir por aquí/.test(String(r.error.message || '')) ? " +
                     json.dumps(MSG_CAMPO_NO_PEDIBLE, ensure_ascii=False) +
                     " : r.error.message } };\n          var n = r.data;\n          toast('Enviado para aprobar'")
    e = _una_vez(e, viejo_rechazo, nuevo_rechazo, 'editores.js rechazo de campo')
    open(ed, 'w', encoding='utf-8', newline='').write(e)


def whatsapp_bot_pantalla():
    """Pantalla /whatsapp-bot/ del ERP maestro (módulo «Bot de WhatsApp», S1 de encargos/20261005_estudio_bots_modulo_erp.md, 5-oct-2026).
    No existe en Lawang (su base no tiene el módulo): la crea el build clonando la CÁSCARA de la página /asistente/ de Lawang (head, nav, guard,
    i18n, tw.css: una sola fuente) con el contenido de `whatsapp_bot.html`, igual que asistente_maestro() hace con las peticiones. La puerta
    es `data-rol="admin"` (como Resumen o Ajustes): el que edita es el administrador de la instancia, sin casilla propia en Usuarios; la
    base lo vuelve a exigir (es_admin() dentro de cada RPC). Con el módulo apagado esta página se cambia por «Módulo no instalado»
    (apagados_instancia.js, por el registro). El menú gana su entrada en Comunicación. Solo se toca lo copiado en DIST, nunca el repo de Lawang."""
    v4 = os.path.join(DIST, 'intranet', 'v4')
    # S8 (5-oct-2026): segunda pantalla, la del ALTA y la aceptación de las Condiciones (bot_alta.html → /whatsapp-bot-alta/). Es de `base` (erp/modulos.py,
    # PANTALLAS_MAESTRO): se usa ANTES de encender el módulo, y con él apagado /whatsapp-bot/ queda oculta. Misma cáscara, mismo reemplazo literal.
    for archivo, carpeta, titulo in (('whatsapp_bot.html', 'whatsapp-bot', 'Bot de WhatsApp'), ('bot_alta.html', 'whatsapp-bot-alta', 'Bot de WhatsApp · alta')):
        _pantalla_bot(v4, archivo, carpeta, titulo)
    nav = os.path.join(v4, 'assets', 'nav.js')
    n = open(nav, encoding='utf-8').read()
    n = _una_vez(n, "{ path: 'soporte', texto: 'Soporte', clave: 'soporte' }] },",
                 "{ path: 'soporte', texto: 'Soporte', clave: 'soporte' },\n      { path: 'whatsapp-bot', texto: 'Bot de WhatsApp', rol: 'admin' },\n"
                 "      { path: 'whatsapp-bot-alta', texto: 'Bot de WhatsApp · alta', rol: 'admin' }] },", 'nav.js MENU_V4 Comunicación')
    # La barra lateral NO sale de MENU_V4 (son las páginas de Lawang con su <aside> escrito a mano): una entrada solo aparece si nav.js
    # la injerta (INJERTOS) y solo se poda por rol si puedeVer() lo sabe. Sin esto el enlace no existía y la pantalla solo se abría
    # tecleando la URL; y como CLAVE_MENU no tiene casilla para ella, puedeVer() la habría dejado ver a cualquier rol.
    # Solo se injerta /whatsapp-bot/ (la del alta se abre desde el flujo de instalación), pero la regla de rol vale para las dos.
    n = _una_vez(n, 'var INJERTOS = [',
                 "var INJERTOS = [\n    { path: 'whatsapp-bot', tras: 'soporte', icono: 'chat', texto: 'Bot de WhatsApp' },", 'nav.js INJERTOS whatsapp-bot')
    n = _una_vez(n, 'var k = CLAVE_MENU[path];',
                 "if (path === 'whatsapp-bot' || path === 'whatsapp-bot-alta') return !ficha || ficha.rol === 'admin' || ficha.rol === 'super_admin';\n    var k = CLAVE_MENU[path];",
                 'nav.js puedeVer whatsapp-bot (solo admin)')
    open(nav, 'w', encoding='utf-8', newline='').write(n)


# Lo que «Ajustes › Correo» trae UNA sola vez en ajustes.js, ni cero ni dos: sus funciones, su tabla de mensajes, su estado, sus dos oyentes y sus
# tres enganches en el código de la pantalla. Son expresiones y no texto literal porque se miden dos veces: sobre el fichero de Lawang tal cual
# y sobre el que SALE del build, ya sin comentarios y reescrito por limpia_publico.js (comillas dobles, sin espacios).
AJUSTES_CORREO_UNA_VEZ = (
    ('la función pintaServidorCorreo', r'\bfunction\s+pintaServidorCorreo\s*\('),
    ('la función ajustaCamposCorreo', r'\bfunction\s+ajustaCamposCorreo\s*\('),
    ('la función llamaCorreo (la única puerta a la edge)', r'\bfunction\s+llamaCorreo\s*\('),
    ('la tabla de mensajes CORREO_MSG', r'\bvar\s+CORREO_MSG\s*='),
    ('el estado `srv`', r'\bvar\s+srv\s*='),
    ('el oyente de clics de las acciones correo-*', r'''\.indexOf\(\s*['"]correo-['"]\s*\)\s*!==\s*0'''),
    ('el oyente de hashchange de la pestaña Correo', r'''desdeHash\(\)\s*===\s*['"]correo['"]\s*&&\s*srv\.fase\s*===\s*['"]inicial['"]\s*\)\s*pintaServidorCorreo\(\)'''),
    ('el enganche de carga(): ajustaCamposCorreo()', r'\bajustaCamposCorreo\(\)\s*;'),
    ('el enganche de carga(): pintaServidorCorreo(guardada)', r'(?<!function\s)\bpintaServidorCorreo\(guardada\)'),
    ('el enganche de lee(): LEE_CORREO[clave]', r'\bLEE_CORREO\[clave\]'),
)


def ajustes_correo_una_copia(js, donde, con_comentarios=False):
    """PARA si «Ajustes › Correo» no está exactamente UNA vez en `js`. Porqué (revisor, 10-oct-2026): del 8 al 10-oct el build insertaba
    su propia copia del bloque encima de la que Lawang ya traía desde su porte (e0e88e58). Dos copias en el mismo IIFE no dan error: gana
    la segunda, lo que Lawang endurezca queda tapado, cada clic se oye dos veces («Reintentar» pedía el estado dos veces) y un código que
    la edge sí devuelve (`host_no_comprobable`) se pintaba como «Respuesta no reconocida».
    `con_comentarios`: el fichero de Lawang tal cual. Se cuenta sobre el código, sin sus comentarios: una nota que nombre
    `pintaServidorCorreo(guardada)` no es una segunda copia y no puede parar el build. El fichero que SALE ya no trae comentarios
    (limpia_publico.js) y se mide tal cual: es una sola línea, y quitarle «comentarios» a ojo se llevaría media pantalla."""
    if con_comentarios:
        js = re.sub(r'(?m)(^|\s)//.*$', r'\1', re.sub(r'/\*.*?\*/', '', js, flags=re.S))
    veces = [(que, len(re.findall(rx, js))) for que, rx in AJUSTES_CORREO_UNA_VEZ]
    malos = ['%s: %d (se espera 1)' % (que, n) for que, n in veces if n != 1]
    # La forma general del mismo fallo, también para lo que no está en la lista de arriba: ninguna función con nombre declarada dos veces
    # en todo el fichero (vale igual antes y después de limpia_publico.js; hoy son 57 y ninguna se repite). Las `var` del IIFE solo se
    # distinguen de las locales por los dos espacios de Lawang, así que esa mitad solo dice algo sobre el fichero de entrada.
    for rx, que in ((r'\bfunction\s+(\w+)\s*\(', 'function'), (r'(?m)^  var (\w+)\b', 'var')):
        nombres = re.findall(rx, js)
        malos += ['%s %s declarada %d veces' % (que, n, nombres.count(n)) for n in sorted(set(nombres)) if nombres.count(n) > 1]
    if malos:
        aborta('ajustes_correo: %s no trae UNA sola copia de Ajustes › Correo:\n  %s' % (donde, '\n  '.join(malos)))


# La ÚNICA diferencia del maestro con la pantalla de Lawang: quién puso la contraseña del buzón. En el maestro el primer servidor lo deja el
# instalador (`puesto_por = 'instalador'`, migración 20261007210000) y se dice con palabras; Lawang no tiene instalador.
AJUSTES_CORREO_INSTALADOR = ("        var porQuien = textoSimple(e.puesto_por, 120);",
                             "        var porQuien = e.puesto_por === 'instalador' ? T('el instalador') : textoSimple(e.puesto_por, 120);")


def ajustes_correo_maestro():
    """Ajustes › Correo del ERP maestro (F3.1 del plan único, 7-oct-2026): «Servidor de salida», «Direcciones» y la casilla del asunto por
    defecto. FUENTE ÚNICA: el bloque que el `ajustes.js` de Lawang trae desde su porte del 8-oct-2026 (es el mismo código, y Lawang lo sigue
    endureciendo). Hasta el 10-oct el build pegaba encima su propia copia (`ajustes_correo.js`, ya retirado): ver ajustes_correo_una_copia().
    Aquí solo se COMPRUEBA que el bloque viene entero y una vez, y se aplica la única diferencia real del maestro (el instalador) con un
    reemplazo LITERAL que aborta si Lawang cambia esa línea (patrón de asistente_maestro). Los textos en inglés salen del i18n.js de Lawang,
    que el build copia tal cual. Es el ÚNICO llamador de la edge `ajustes-correo`: el navegador no escribe en la base ni guarda secretos.
    Todo cuelga de `datos.editables` y de `datos.puede_escribir` (sin migración o sin super admin, no sale nada). Solo se toca lo copiado
    en DIST, nunca el repo de Lawang."""
    ruta = os.path.join(DIST, 'intranet', 'v4', 'assets', 'ajustes.js')
    t = open(ruta, encoding='utf-8').read()
    ajustes_correo_una_copia(t, 'el ajustes.js de Lawang', con_comentarios=True)
    t = _una_vez(t, AJUSTES_CORREO_INSTALADOR[0], AJUSTES_CORREO_INSTALADOR[1], 'ajustes.js «puesta por el instalador»')
    open(ruta, 'w', encoding='utf-8', newline='').write(t)


# Ayudas comunes de las pantallas del maestro (taller, 8-oct-2026): una pantalla escribe la marca donde las quiere y el build pega el fichero de _compartido/.
# La marca va dentro de un comentario (CSS o JS) para que el fichero fuente siga siendo válido tal cual. Una marca repetida o un fichero que falta PARA.
# AXW_FOTOS_JS (12-oct-2026, F8 8.T1): las fotos guiadas de la moto (taller; la entrega de 8.T3 las reutilizará), pieza común y no copia por pantalla.
COMUN_MARCAS = {'/*AXW_COMUN_CSS*/': 'pantalla_comun.css', '/*AXW_COMUN_JS*/': 'pantalla_comun.js', '/*AXW_FOTOS_JS*/': 'fotos_guiadas.js'}


def _inyecta_comun(texto, archivo):
    for marca, fichero in COMUN_MARCAS.items():
        n = texto.count(marca)
        if n > 1:
            aborta('%s: la marca %s aparece %d veces (una sola)' % (archivo, marca, n))
        if n == 1:
            ruta = os.path.join(AQUI, '_compartido', fichero)
            if not os.path.isfile(ruta):
                aborta('%s usa %s pero falta _compartido/%s' % (archivo, marca, fichero))
            texto = texto.replace(marca, open(ruta, encoding='utf-8').read().strip())
    return texto


def _pantalla_bot(v4, archivo, carpeta, titulo, puerta='data-rol="admin"'):
    """Una pantalla del maestro sobre la cáscara de /asistente/ de Lawang (ver whatsapp_bot_pantalla y ventas_pantalla). `puerta` es lo que
    sustituye a `data-herramienta="asistente"`: por defecto solo el administrador; /ventas/ pide una herramienta (varias, con coma = cualquiera)."""
    t = open(os.path.join(LAWANG, 'intranet', 'v4', 'asistente', 'index.html'), encoding='utf-8').read()
    frag = open(os.path.join(AQUI, archivo), encoding='utf-8').read().split('<!--AXW_SCRIPT-->')
    if len(frag) != 2:
        aborta('%s: tiene que llevar UNA línea <!--AXW_SCRIPT--> entre el marcado y el script' % archivo)
    marcado, script = _inyecta_comun(frag[0].strip(), archivo), _inyecta_comun(frag[1].strip(), archivo)
    ancla = '<div class="flex flex-col w-full gap-8">'
    cierre = '</div>\n</main></div>\n<script>'
    fin = '</script>\n</body></html>'
    if t.count(ancla) != 1 or t.count(cierre) != 1 or not t.rstrip().endswith(fin):
        aborta('whatsapp_bot_pantalla: la página de Lawang ya no tiene la forma esperada (contenedor, cierre de <main>, script final)')
    i0, i1 = t.index(ancla), t.index(cierre)
    if i1 < i0:
        aborta('whatsapp_bot_pantalla: el cierre de <main> está antes del contenedor')
    t = t[:i0] + marcado + '\n</main></div>\n' + script + '\n</body></html>\n'
    t = _una_vez(t, 'data-herramienta="asistente"', puerta, carpeta + '/index.html puerta')
    t = _una_vez(t, '<title data-lw-titulo>Asistente</title>', '<title data-lw-titulo>%s</title>' % titulo, carpeta + '/index.html título')
    os.makedirs(os.path.join(v4, carpeta), exist_ok=True)
    open(os.path.join(v4, carpeta, 'index.html'), 'w', encoding='utf-8', newline='').write(t)


def ventas_pantalla():
    """Pantalla /ventas/ del ERP maestro (F4 «Pantalla de factura», 8-oct-2026; encargos/20261008_erp_f4_pantalla_factura_plan.md v2).
    No existe en Lawang: la crea el build clonando la CÁSCARA de /asistente/ con el contenido de `ventas.html`, igual que whatsapp_bot_pantalla.
    La puerta es una herramienta (`facturas`, `operaciones` o `reservas-producto`: cualquiera de las tres, guard.js acepta una lista con coma);
    la base vuelve a comprobar el permiso en cada RPC. El menú gana su entrada en Seguimiento, tras Reservas, y SOLO con el núcleo de
    operaciones (`nucleo`: la base de Lawang no tiene estas RPC). CLAVE_MENU es lo que hace que puedeVer() no la deje ver a cualquier rol
    (sin esa línea la barra la enseñaría a todos: lo midió la pantalla del bot). Solo se toca lo copiado en DIST, nunca el repo de Lawang."""
    v4 = os.path.join(DIST, 'intranet', 'v4')
    _pantalla_bot(v4, 'ventas.html', 'ventas', 'Ventas', puerta='data-herramienta="facturas,operaciones,reservas-producto"')
    nav = os.path.join(v4, 'assets', 'nav.js')
    n = open(nav, encoding='utf-8').read()
    n = _una_vez(n, "      { path: 'reservas', texto: 'Reservas', clave: 'reservas' }] },",
                 "      { path: 'reservas', texto: 'Reservas', clave: 'reservas' }," + '\n' +
                 "      { path: 'ventas', texto: 'Ventas', clave: 'facturas', nucleo: true, mismaCasilla: true }] },", 'nav.js MENU_V4 Seguimiento')
    n = _una_vez(n, "    { path: 'reservas',   tras: 'vencimientos', icono: 'event_upcoming', texto: 'Reservas' },",
                 "    { path: 'reservas',   tras: 'vencimientos', icono: 'event_upcoming', texto: 'Reservas' }," + '\n' +
                 "    { path: 'ventas',     tras: 'reservas',     icono: 'receipt_long',   texto: 'Ventas', nucleo: true },", 'nav.js INJERTOS ventas')
    n = _una_vez(n, "    facturas: 'facturas', recibos: 'recibos', comisiones:",
                 "    ventas: ['facturas', 'operaciones', 'reservas-producto']," + '\n' + "    facturas: 'facturas', recibos: 'recibos', comisiones:", 'nav.js CLAVE_MENU ventas')
    open(nav, 'w', encoding='utf-8', newline='').write(n)


def reservas_producto_pantalla():
    """Pantalla /reservas-producto/ del ERP maestro (F8 pieza 1, 8-oct-2026; encargos/20261008_erp_f8_bbm_inventario_reservas_plan.md §3 y §7.1, BBM-20).
    No existe en Lawang (su /reservas/ es la carta de reserva de parcela, otra cosa): la crea el build clonando la CÁSCARA de /asistente/ con el contenido de
    `reservas_producto.html`, igual que ventas_pantalla. La puerta es la herramienta `reservas-producto` (la base la vuelve a exigir en cada RPC). Lleva
    además, todo con reemplazo literal que aborta si Lawang (o una pantalla anterior de la cadena) cambia el trozo:
      · nav.js: entrada de menú en Seguimiento (tras Ventas), injerto de sidebar y casilla en CLAVE_MENU (sin esa línea puedeVer() la enseñaría a todos);
      · herramientas.js: la tarjeta `reservas-producto` bajo AXW_NUCLEO_OPERACION. Sin ella no existiría la casilla en Usuarios y solo el super admin
        podría abrir la pantalla (BBM-20 punto 2). Va en Seguimiento, tras Operaciones.
    Va DESPUÉS de ventas_pantalla() porque sus anclas de nav.js son las líneas que esa deja. Solo se toca lo copiado en DIST, nunca el repo de Lawang."""
    v4 = os.path.join(DIST, 'intranet', 'v4')
    _pantalla_bot(v4, 'reservas_producto.html', 'reservas-producto', 'Reservas de producto', puerta='data-herramienta="reservas-producto"')
    nav = os.path.join(v4, 'assets', 'nav.js')
    n = open(nav, encoding='utf-8').read()
    n = _una_vez(n, "      { path: 'ventas', texto: 'Ventas', clave: 'facturas', nucleo: true, mismaCasilla: true }] },",
                 "      { path: 'ventas', texto: 'Ventas', clave: 'facturas', nucleo: true, mismaCasilla: true }," + '\n' +
                 "      { path: 'reservas-producto', texto: 'Reservas de producto', clave: 'reservas-producto', nucleo: true }] },", 'nav.js MENU_V4 Seguimiento (reservas-producto)')
    n = _una_vez(n, "    { path: 'ventas',     tras: 'reservas',     icono: 'receipt_long',   texto: 'Ventas', nucleo: true },",
                 "    { path: 'ventas',     tras: 'reservas',     icono: 'receipt_long',   texto: 'Ventas', nucleo: true }," + '\n' +
                 "    { path: 'reservas-producto', tras: 'ventas', icono: 'calendar_month', texto: 'Reservas de producto', nucleo: true },", 'nav.js INJERTOS reservas-producto')
    n = _una_vez(n, "    ventas: ['facturas', 'operaciones', 'reservas-producto'],",
                 "    ventas: ['facturas', 'operaciones', 'reservas-producto']," + '\n' + "    'reservas-producto': 'reservas-producto',", 'nav.js CLAVE_MENU reservas-producto')
    open(nav, 'w', encoding='utf-8', newline='').write(n)
    her = os.path.join(DIST, 'contracts', 'assets', 'herramientas.js')
    h = open(her, encoding='utf-8').read()
    ancla = "claves:'plantillas plantilla modelos contrato tipos de contrato prefijo numeracion campos borrador activar templates template contract types prefix fields draft activate' });" + '\n' + "}"
    h = _una_vez(h, ancla,
                 "claves:'plantillas plantilla modelos contrato tipos de contrato prefijo numeracion campos borrador activar templates template contract types prefix fields draft activate' });" + '\n' +
                 "  /* RESERVAS DE PRODUCTO (F8, 8-oct-2026): la pantalla de reservas por fechas (motos, coches) del maestro. Permiso propio `reservas-producto`: es el que ya exigen" + '\n' +
                 "     las RPC de la base (puede('reservas-producto')); sin esta tarjeta la casilla no existiría en Usuarios. Misma bandera y por lo mismo que Productos. */" + '\n' +
                 "  LW_HERRAMIENTAS.splice(LW_HERRAMIENTAS.findIndex(t => t.herr === 'operaciones') + 1, 0," + '\n' +
                 "    { grupo:'Seguimiento', nombre:'Reservas de producto', icon:'ph-calendar-check', href:'/intranet/v4/reservas-producto/', herr:'reservas-producto'," + '\n' +
                 "      para:'Las reservas de tus productos por fechas (motos, coches): calendario por unidad, flota y tarifas, y el paso de cada reserva.'," + '\n' +
                 "      claves:'reservas producto alquiler motos coches flota unidad calendario tarifa bloqueo entrega devolucion bookings rental fleet unit calendar rate hold return' });" + '\n' + "}",
                 'herramientas.js tarjeta Reservas de producto')
    open(her, 'w', encoding='utf-8', newline='').write(h)


def taller_pantalla():
    """Pantalla /taller/ del ERP maestro (F8 pieza 2, 8-oct-2026; encargos/20261008_erp_f8_bbm_inventario_reservas_plan.md §2, §3 y §7.2; decisión 1 del owner: orden ligera ahora, el resto de
    F7 después). Es del módulo `reservas-producto` pero con permiso PROPIO: la herramienta `taller` (la base la exige en cada RPC: sin ella ni el administrador entra). La crea el build
    clonando la CÁSCARA de /asistente/ con el contenido de `taller.html`, y esa página NO pega las ayudas de las otras: las trae de _compartido/ por las marcas AXW_COMUN_CSS/JS.
    Lleva además, todo con reemplazo literal que aborta si una pantalla anterior de la cadena cambia el trozo:
      · nav.js: entrada de menú en Seguimiento (tras Reservas de producto), injerto de sidebar y casilla en CLAVE_MENU (sin esa línea puedeVer() la enseñaría a todos);
      · herramientas.js: la tarjeta `taller` tras la de Reservas de producto. Sin ella no existiría la casilla en Usuarios y solo el super admin podría abrir la pantalla.
    Va DESPUÉS de reservas_producto_pantalla() porque sus anclas de nav.js son las líneas que esa deja. Solo se toca lo copiado en DIST, nunca el repo de Lawang."""
    v4 = os.path.join(DIST, 'intranet', 'v4')
    _pantalla_bot(v4, 'taller.html', 'taller', 'Taller', puerta='data-herramienta="taller"')
    nav = os.path.join(v4, 'assets', 'nav.js')
    n = open(nav, encoding='utf-8').read()
    n = _una_vez(n, "      { path: 'reservas-producto', texto: 'Reservas de producto', clave: 'reservas-producto', nucleo: true }] },",
                 "      { path: 'reservas-producto', texto: 'Reservas de producto', clave: 'reservas-producto', nucleo: true }," + '\n' +
                 "      { path: 'taller', texto: 'Taller', clave: 'taller', nucleo: true }] },", 'nav.js MENU_V4 Seguimiento (taller)')
    n = _una_vez(n, "    { path: 'reservas-producto', tras: 'ventas', icono: 'calendar_month', texto: 'Reservas de producto', nucleo: true },",
                 "    { path: 'reservas-producto', tras: 'ventas', icono: 'calendar_month', texto: 'Reservas de producto', nucleo: true }," + '\n' +
                 "    { path: 'taller', tras: 'reservas-producto', icono: 'build', texto: 'Taller', nucleo: true },", 'nav.js INJERTOS taller')
    n = _una_vez(n, "    'reservas-producto': 'reservas-producto',",
                 "    'reservas-producto': 'reservas-producto'," + '\n' + "    taller: 'taller',", 'nav.js CLAVE_MENU taller')
    open(nav, 'w', encoding='utf-8', newline='').write(n)
    her = os.path.join(DIST, 'contracts', 'assets', 'herramientas.js')
    h = open(her, encoding='utf-8').read()
    ancla = "bookings rental fleet unit calendar rate hold return' });" + '\n' + "}"
    h = _una_vez(h, ancla,
                 "bookings rental fleet unit calendar rate hold return' });" + '\n' +
                 "  /* TALLER (F8 pieza 2, 8-oct-2026; asistente por pasos 8.T1, 12-oct-2026): el mecánico revisa cada moto paso a paso. Permiso propio `taller` (es el que exigen las RPC taller_* y orden_trabajo_*); sin esta tarjeta la casilla no existiría en Usuarios, y sin un usuario con ella el Taller sale «sin configurar». */" + '\n' +
                 "  LW_HERRAMIENTAS.splice(LW_HERRAMIENTAS.findIndex(t => t.herr === 'reservas-producto') + 1, 0," + '\n' +
                 "    { grupo:'Seguimiento', nombre:'Taller', icon:'ph-wrench', href:'/intranet/v4/taller/', herr:'taller'," + '\n' +
                 "      para:'El mecánico revisa cada moto paso a paso (motivo, km, fotos, revisiones) y la deja lista o en espera; mientras está en el taller no se puede reservar.'," + '\n' +
                 "      claves:'taller orden de trabajo moto reparacion mecanico mantenimiento revision fotos bloquear reservas bengkel servis workshop repair mechanic maintenance inspection work order' });" + '\n' +
                 "  /*AXW_FIN_TARJETA_TALLER*/" + '\n' + "}",
                 'herramientas.js tarjeta Taller')
    open(her, 'w', encoding='utf-8', newline='').write(h)


def entrega_pantalla():
    """Pantalla /entrega/ del ERP maestro (F8 pieza 8, 10-oct-2026; encargos/20261008_erp_f8_bbm_inventario_reservas_plan.md §3): la configuración de la entrega por km (sede, tarifa, límites y el
    interruptor Activar) en UN formulario. Pantalla PROPIA como Taller, no una pestaña de Reservas de producto (decisión de la revisión previa de Desarrollo). La herramienta `entrega` es la puerta de
    la cáscara (guard.js: un admin normal también pasa por su lista de herramientas); la base exige además administración en cada RPC y la pantalla no lo adivina: lo dice tras la respuesta.
    La crea el build clonando la CÁSCARA de /asistente/ con `entrega.html` y las ayudas comunes de _compartido/. Lleva además, todo con reemplazo literal que aborta si una pantalla anterior de la cadena
    cambia el trozo:
      · nav.js: entrada de menú en Seguimiento (tras Taller), injerto de sidebar y casilla en CLAVE_MENU (sin esa línea puedeVer() la enseñaría a todos);
      · herramientas.js: la tarjeta `entrega` tras la de Taller. Sin ella no existiría la casilla en Usuarios.
    Va DESPUÉS de taller_pantalla() porque sus anclas de nav.js y herramientas.js son las líneas que esa deja. Solo se toca lo copiado en DIST, nunca el repo de Lawang."""
    v4 = os.path.join(DIST, 'intranet', 'v4')
    _pantalla_bot(v4, 'entrega.html', 'entrega', 'Entrega', puerta='data-herramienta="entrega"')
    nav = os.path.join(v4, 'assets', 'nav.js')
    n = open(nav, encoding='utf-8').read()
    n = _una_vez(n, "      { path: 'taller', texto: 'Taller', clave: 'taller', nucleo: true }] },",
                 "      { path: 'taller', texto: 'Taller', clave: 'taller', nucleo: true }," + '\n' +
                 "      { path: 'entrega', texto: 'Entrega', clave: 'entrega', nucleo: true }] },", 'nav.js MENU_V4 Seguimiento (entrega)')
    n = _una_vez(n, "    { path: 'taller', tras: 'reservas-producto', icono: 'build', texto: 'Taller', nucleo: true },",
                 "    { path: 'taller', tras: 'reservas-producto', icono: 'build', texto: 'Taller', nucleo: true }," + '\n' +
                 "    { path: 'entrega', tras: 'taller', icono: 'local_shipping', texto: 'Entrega', nucleo: true },", 'nav.js INJERTOS entrega')
    n = _una_vez(n, "    taller: 'taller',",
                 "    taller: 'taller'," + '\n' + "    entrega: 'entrega',", 'nav.js CLAVE_MENU entrega')
    open(nav, 'w', encoding='utf-8', newline='').write(n)
    her = os.path.join(DIST, 'contracts', 'assets', 'herramientas.js')
    h = open(her, encoding='utf-8').read()
    # la de Entrega se engancha detrás de la MARCA que deja taller_pantalla() al final de su tarjeta, no del texto de sus claves (revisor 12-oct: cambiar las palabras
    # de búsqueda del Taller ya rompió este ancla una vez, en 4f686ba)
    ancla = "  /*AXW_FIN_TARJETA_TALLER*/" + '\n' + "}"
    h = _una_vez(h, ancla,
                 "  /*AXW_FIN_TARJETA_TALLER*/" + '\n' +
                 "  /* ENTREGA (F8 pieza 8, 10-oct-2026): la sede, la tarifa por km y los límites de la entrega a domicilio. Permiso propio `entrega`; sin esta tarjeta la casilla no existiría en Usuarios. La base exige además administración. */" + '\n' +
                 "  LW_HERRAMIENTAS.splice(LW_HERRAMIENTAS.findIndex(t => t.herr === 'taller') + 1, 0," + '\n' +
                 "    { grupo:'Seguimiento', nombre:'Entrega', icon:'ph-truck', href:'/intranet/v4/entrega/', herr:'entrega'," + '\n' +
                 "      para:'Cuánto cuesta llevar la moto al cliente: la oficina, el precio por kilómetro, los límites y el interruptor que activa el cobro de la entrega.'," + '\n' +
                 "      claves:'entrega domicilio km kilometro tarifa sede oficina recogida precio delivery pickup distance office rate' });" + '\n' + "}",
                 'herramientas.js tarjeta Entrega')
    open(her, 'w', encoding='utf-8', newline='').write(h)


def flota_pantalla():
    """Pantalla /flota/ del ERP maestro (F8, 10-oct-2026; revisión previa #256 Frontend+Backend+Seguridad): el editor de la flota (motos) y de las tarifas por tramo de días. Pantalla PROPIA como Taller y Entrega, no un
    editor dentro de la pestaña «Flota y tarifas» de Reservas de producto (esa se queda de lectura y enlaza aquí). La herramienta `flota` es la puerta de la cáscara (guard.js: un admin normal también pasa por su
    lista de herramientas); la base exige además administración en cada RPC y la pantalla no lo adivina: lo dice tras la respuesta.
    La crea el build clonando la CÁSCARA de /asistente/ con `flota.html` y las ayudas comunes de _compartido/. Lleva además, todo con reemplazo literal que aborta si una pantalla anterior de la cadena cambia el trozo:
      · nav.js: entrada de menú en Seguimiento (tras Entrega), injerto de sidebar y casilla en CLAVE_MENU (sin esa línea puedeVer() la enseñaría a todos);
      · herramientas.js: la tarjeta `flota` tras la de Entrega. Sin ella no existiría la casilla en Usuarios.
    Va DESPUÉS de entrega_pantalla() porque sus anclas de nav.js y herramientas.js son las líneas que esa deja. Solo se toca lo copiado en DIST, nunca el repo de Lawang."""
    v4 = os.path.join(DIST, 'intranet', 'v4')
    _pantalla_bot(v4, 'flota.html', 'flota', 'Flota y tarifas', puerta='data-herramienta="flota"')
    nav = os.path.join(v4, 'assets', 'nav.js')
    n = open(nav, encoding='utf-8').read()
    n = _una_vez(n, "      { path: 'entrega', texto: 'Entrega', clave: 'entrega', nucleo: true }] },",
                 "      { path: 'entrega', texto: 'Entrega', clave: 'entrega', nucleo: true }," + '\n' +
                 "      { path: 'flota', texto: 'Flota y tarifas', clave: 'flota', nucleo: true }] },", 'nav.js MENU_V4 Seguimiento (flota)')
    n = _una_vez(n, "    { path: 'entrega', tras: 'taller', icono: 'local_shipping', texto: 'Entrega', nucleo: true },",
                 "    { path: 'entrega', tras: 'taller', icono: 'local_shipping', texto: 'Entrega', nucleo: true }," + '\n' +
                 "    { path: 'flota', tras: 'entrega', icono: 'two_wheeler', texto: 'Flota y tarifas', nucleo: true },", 'nav.js INJERTOS flota')
    n = _una_vez(n, "    entrega: 'entrega',",
                 "    entrega: 'entrega'," + '\n' + "    flota: 'flota',", 'nav.js CLAVE_MENU flota')
    open(nav, 'w', encoding='utf-8', newline='').write(n)
    her = os.path.join(DIST, 'contracts', 'assets', 'herramientas.js')
    h = open(her, encoding='utf-8').read()
    ancla = "distance office rate' });" + '\n' + "}"
    h = _una_vez(h, ancla,
                 "distance office rate' });" + '\n' +
                 "  /* FLOTA Y TARIFAS (F8, 10-oct-2026): las motos de cada producto y sus tarifas por días. Permiso propio `flota`; sin esta tarjeta la casilla no existiría en Usuarios. La base exige además administración. */" + '\n' +
                 "  LW_HERRAMIENTAS.splice(LW_HERRAMIENTAS.findIndex(t => t.herr === 'entrega') + 1, 0," + '\n' +
                 "    { grupo:'Seguimiento', nombre:'Flota y tarifas', icon:'ph-motorcycle', href:'/intranet/v4/flota/', herr:'flota'," + '\n' +
                 "      para:'Las motos de cada producto y lo que cuesta alquilarlas según los días: lo que cambies es lo que el bot cotiza y cobra.'," + '\n' +
                 "      claves:'flota motos moto matricula unidades tarifa tarifas precio dias tramo alquiler fleet bikes bike plate units rate rates price days tier rental' });" + '\n' +
                 "  /*AXW_FIN_TARJETA_FLOTA*/" + '\n' + "}",
                 'herramientas.js tarjeta Flota')
    open(her, 'w', encoding='utf-8', newline='').write(h)


ROTULOS_RUTA_RESERVAS = {'/productos/': {'es': 'Extras y servicios', 'en': 'Extras and services', 'id': 'Ekstra dan layanan'}}


def extras_pantalla():
    """/productos/ de una instancia de tipo Reservas = «Extras y servicios» (erp-front, 14-oct-2026; owner 13-oct: «¿Fleets and rates y Products no es lo
    mismo?»). Pantalla PROPIA del maestro (extras.html, sobre la cáscara de /asistente/ como Flota) que sustituye a la de Productos de Lawang SOLO en lo copiado
    a DIST: misma carpeta, así la entrada del menú, la casilla `productos` de Usuarios y el mapa de módulos siguen enganchados por su ruta y su clave. Lo que se
    alquila vive en Flota; aquí solo lo demás. datos.js de Lawang arranca REG.productos por el trozo de ruta, pero sin su tabla (#lw-prd-lista) se va sin hacer
    nada. Se descarta filtrar la pantalla de Lawang desde aquí: serían anclas nuevas sobre su texto (erp-limpieza, 13-oct). Revertir: no llamarla."""
    v4 = os.path.join(DIST, 'intranet', 'v4')
    if not os.path.isfile(os.path.join(v4, 'productos', 'index.html')):
        aborta('extras_pantalla: no está la pantalla Productos copiada de Lawang (intranet/v4/productos/index.html): ¿cambió su sitio?')
    _pantalla_bot(v4, 'extras.html', 'productos', 'Extras y servicios', puerta='data-herramienta="productos"')


AAAS_NUCLEO = ('agente_panel_estado', 'agente_modulo_cambia')   # lo que la ventana del AaaS llama con el módulo apagado


def aaas_en_paquete(nombre):
    """¿Lleva esta instancia la ventana del AaaS (/agente/)? Solo si su registro lo declara (`"aaas": true` en erp/instancias.json de la agencia).
    Revisor 13-oct (ALTA): sus funciones (agente_panel_estado, agente_notas_datos…) no existen en una base hasta que se le aplican las migraciones
    20261013180000/183000/190000; con la pantalla en el paquete y sin ellas, el contrato front↔base para la publicación de esa instancia. La marca se
    pone EN EL MISMO PASO que se aplican (precedente: setup_reservas_pasos y E3 en bbm). Sin la marca, la instancia sale como hoy: sin menú ni tarjeta."""
    if _instancia_registro(nombre).get('aaas') is not True:
        return False
    # Revisor 13-oct (ALTA 2): con el módulo `agente` apagado, apagados_instancia.js contesta null a sus funciones sin salir a la red. Leer el estado y
    # encender tienen que estar en el NÚCLEO del registro o el botón Encender no llegaría nunca a la base. Sin eso, no hay ventana: se para el build.
    funcs = json.load(open(os.path.join(AGENCIA, 'erp', 'modulos.json'), encoding='utf-8'))['objetos']['funciones']
    malas = [f for f in AAAS_NUCLEO if (funcs.get(f) or {}).get('clase') != 'nucleo']
    if malas:
        aborta('instancia %s con "aaas": true y %s fuera del núcleo en erp/modulos.json (clase %s): con el módulo apagado no se podría encender. '
               'Regístralas en el núcleo (erp/modulos.py) antes de poner la marca' % (nombre, ', '.join(malas), ', '.join(str((funcs.get(f) or {}).get('clase')) for f in malas)))
    return True


def agente_pantalla():
    """Pantalla /agente/ del ERP maestro: la VENTANA DEL AaaS (EP.5, 13-oct-2026; agencia encargos/20261013_pilotos_bbm/panel.md, revisión previa #313). Herramienta propia `agente`
    (la que exige la base en agente_notas_datos y en las decisiones; el dueño de la ficha entra además por su uid). La crea el build clonando la CÁSCARA de /asistente/ con `agente.html`
    y las ayudas comunes de _compartido/. Lleva además, todo con reemplazo literal que aborta si una pantalla anterior de la cadena cambia el trozo:
      · nav.js: entrada de menú en Seguimiento (tras Flota y tarifas), injerto de sidebar y casilla en CLAVE_MENU (sin esa línea puedeVer() la enseñaría a todos);
      · herramientas.js: la tarjeta `agente` tras la de Flota, enganchada a la MARCA que deja flota_pantalla() (AXW_FIN_TARJETA_FLOTA), no al texto de sus claves.
    Va DESPUÉS de flota_pantalla(): sus anclas son las líneas que esa deja. No añade ningún ancla nueva sobre texto de Lawang. Solo se toca lo copiado en DIST.
    La pantalla NO se declara pantalla del módulo `agente` en el mapa de apagados: con el módulo apagado tiene que verse para poder encenderlo (la base decide quién)."""
    v4 = os.path.join(DIST, 'intranet', 'v4')
    _pantalla_bot(v4, 'agente.html', 'agente', 'AaaS', puerta='data-herramienta="agente"')
    nav = os.path.join(v4, 'assets', 'nav.js')
    n = open(nav, encoding='utf-8').read()
    n = _una_vez(n, "      { path: 'flota', texto: 'Flota y tarifas', clave: 'flota', nucleo: true }] },",
                 "      { path: 'flota', texto: 'Flota y tarifas', clave: 'flota', nucleo: true }," + '\n' +
                 "      { path: 'agente', texto: 'AaaS', clave: 'agente', nucleo: true }] },", 'nav.js MENU_V4 Seguimiento (agente)')
    n = _una_vez(n, "    { path: 'flota', tras: 'entrega', icono: 'two_wheeler', texto: 'Flota y tarifas', nucleo: true },",
                 "    { path: 'flota', tras: 'entrega', icono: 'two_wheeler', texto: 'Flota y tarifas', nucleo: true }," + '\n' +
                 "    { path: 'agente', tras: 'flota', icono: 'smart_toy', texto: 'AaaS', nucleo: true },", 'nav.js INJERTOS agente')
    n = _una_vez(n, "    flota: 'flota',",
                 "    flota: 'flota'," + '\n' + "    agente: 'agente',", 'nav.js CLAVE_MENU agente')
    open(nav, 'w', encoding='utf-8', newline='').write(n)
    her = os.path.join(DIST, 'contracts', 'assets', 'herramientas.js')
    h = open(her, encoding='utf-8').read()
    ancla = "  /*AXW_FIN_TARJETA_FLOTA*/" + '\n' + "}"
    h = _una_vez(h, ancla,
                 "  /*AXW_FIN_TARJETA_FLOTA*/" + '\n' +
                 "  /* AaaS (EP.5, 13-oct-2026): el panel del AaaS de operaciones. Permiso propio `agente`; sin esta tarjeta la casilla no existiría en Usuarios. Encender, apagar, el tope y los trabajos los exige además la base al dueño de la ficha. */" + '\n' +
                 "  LW_HERRAMIENTAS.splice(LW_HERRAMIENTAS.findIndex(t => t.herr === 'flota') + 1, 0," + '\n' +
                 "    { grupo:'Seguimiento', nombre:'AaaS', icon:'ph-robot', href:'/intranet/v4/agente/', herr:'agente'," + '\n' +
                 "      para:'Dos veces al día mira el negocio y deja avisos con su prueba: motos paradas en el taller, salidas sin moto, reservas que caducan. No toca nada; las personas deciden.'," + '\n' +
                 "      claves:'AaaS agente autonomo avisos operaciones pasada encender apagar pausa tope trabajos propuestas AaaS agent alerts operations pause cap jobs proposals' });" + '\n' +
                 "  /*AXW_FIN_TARJETA_AGENTE*/" + '\n' + "}",
                 'herramientas.js tarjeta AaaS')
    open(her, 'w', encoding='utf-8', newline='').write(h)


def crea_contrasena_pantalla(marca):
    """Pantalla /crea-contrasena/ del ERP maestro (pieza C de I6, 9-oct-2026): donde aterriza el primer administrador desde la invitación de Auth que
    manda nueva_instancia.py (paso `admin`) para poner su contraseña. Es una página PROPIA (crea_contrasena.html), no un overlay de la de Lawang
    (intranet/contrasena/index.html: solo canjea ?th= de recuperación y sigue con cualquier sesión existente; ver el comentario de la fuente). Lo que
    reutiliza de Lawang es su estilo: se lee su <style> y, si Lawang cambia de forma (no hay UN bloque style), el build PARA en vez de sacar una
    página sin estilos. No lleva guard.js a propósito: es una página de ANTES de entrar. Se escribe DESPUÉS de logos_neutros() (usa el logo de la
    instancia) y antes de versiona() (que le pone el ?v= a sus scripts). Solo se toca DIST, nunca el repo de Lawang."""
    origen = open(os.path.join(LAWANG, 'intranet', 'contrasena', 'index.html'), encoding='utf-8').read().replace('\r\n', '\n')
    if origen.count('<style>') != 1 or origen.count('</style>') != 1:
        aborta('crea_contrasena_pantalla: la página de contraseña de Lawang ya no tiene UN bloque <style> (¿cambió de forma?)')
    estilo = origen.split('<style>')[1].split('</style>')[0].strip()
    if ':root{' not in estilo or '.card{' not in estilo:
        aborta('crea_contrasena_pantalla: el <style> de Lawang ya no trae :root ni .card (¿cambió de forma?)')
    pag = open(os.path.join(AQUI, 'crea_contrasena.html'), encoding='utf-8').read()
    if pag.count('/*AXW_ESTILO_LAWANG*/') != 1 or pag.count('__AXW_MARCA__') != 2:
        aborta('crea_contrasena.html: tiene que llevar UNA marca /*AXW_ESTILO_LAWANG*/ y DOS __AXW_MARCA__ (título y alt del logo)')
    # El supabase-js (con su SRI) es el MISMO que carga la suite: si Lawang lo sube de versión, esta página no se queda atrás en silencio.
    m = re.search(r'<script src="https://cdn\.jsdelivr\.net/npm/@supabase/supabase-js@[^"]+"[^>]*></script>', origen)
    mia = re.search(r'<script src="https://cdn\.jsdelivr\.net/npm/@supabase/supabase-js@[^"]+"[^>]*></script>', pag)
    if not m or not mia:
        aborta('crea_contrasena_pantalla: no encuentro la etiqueta de supabase-js (con SRI) en alguna de las dos páginas')
    pag = pag.replace(mia.group(0), m.group(0))
    pag = pag.replace('/*AXW_ESTILO_LAWANG*/', estilo).replace('__AXW_MARCA__', html.escape(marca, quote=True))
    # Sin comentarios, como el resto de lo que sale (limpia_publico.js ya pasó): los de esta página cuentan decisiones internas del estudio.
    pag = re.sub(r'<!--.*?-->', '', pag, flags=re.S)
    pag = re.sub(r'/\*.*?\*/', '', pag, flags=re.S)
    d = os.path.join(DIST, 'crea-contrasena')
    os.makedirs(d, exist_ok=True)
    open(os.path.join(d, 'index.html'), 'w', encoding='utf-8', newline='').write(pag)


def guard_asistente_admin():
    """guard.js del maestro: la puerta de /asistente/ deja pasar al admin sin la casilla `asistente_peticiones` (la base lo permite).
    Va aparte de asistente_maestro() porque instancia() vuelve a copiar el guard.js de Lawang DESPUÉS de esa función; se llama justo
    tras esa copia. Reemplazo literal con ancla que aborta si Lawang cambia la línea."""
    g = os.path.join(DIST, 'contracts', 'assets', 'guard.js')
    t = open(g, encoding='utf-8').read()
    t = _una_vez(t, "var sinLimite = LW_ROL.esSuperGlobal(ficha);",
                 "var sinLimite = LW_ROL.esSuperGlobal(ficha) || (ficha && ficha.rol === 'admin' && HERRAMIENTA === 'asistente_peticiones');", 'guard.js sinLimite')
    open(g, 'w', encoding='utf-8', newline='').write(t)


# ── --panel-contra-publicado (5-oct-2026, owner: «panel contra lo ya publicado») ───────────────────────────────────────
# QUÉ: el panel de control (panel/index.html y panel/pilotos/index.html) sale apuntando a lo que PRODUCCIÓN sirve HOY, no a lo que
# este build habría publicado entero. QUÉ SE ADAPTA, solo en el panel y solo los enlaces/`src` locales que salen de panel/:
#   · la ruta: si lo publicado no tiene `/home/` pero sí `/intranet/v4/home/` (la estructura vieja), el enlace pasa a esa;
#   · el `?v=`: la huella (sha1[:8]) del fichero PUBLICADO, no la del build. Hostinger cachea cada URL hasta 7 días: con la
#     huella nueva y el fichero viejo, la CDN guardaría el viejo bajo la URL nueva y la publicación completa de después
#     (misma huella) serviría el guard.js viejo durante días.
# POR QUÉ ASÍ Y NO REESCRIBIENDO A MANO EL panel/ YA CONSTRUIDO: lo que se sube sigue saliendo del build (probado, con su comprobación
# de resultado), y el panel solo habla con la edge `erp-control` y le pide a guard.js lo mismo que el panel viejo (LW_AUTH, lwEdge:
# se comprueba en test_panel_publicado.py). Los ficheros publicados no se tocan: `--solo-panel` de erp/publica_instancia.py
# sube solo panel/. Si algo que el panel pide NO existe en lo publicado, el build PARA (nunca se inventa).
# DE DÓNDE SALE «LO PUBLICADO»: el HEAD de la rama `limpio` del clon erp/despliegues/<instancia> (blobs de git: el disco de
# Windows puede traer CRLF), exigiendo que sea lo que está en origin/main. Nunca el clon con el build recién copiado encima.
REF_PANEL = re.compile(r"""(?P<pre>(?:src|href)=)(?P<q>["'])(?P<ruta>/[^"'#?<>\s]*)(?:\?v=(?P<v>[0-9A-Za-z_-]+))?(?P=q)""")


def panel_contra_publicado(panel_dir, leer_publicado):
    """Reescribe en `panel_dir` los enlaces locales que salen de panel/ para que existan en lo publicado (`leer_publicado(rel)` ->
    bytes del fichero publicado o None) y lleven la huella de allí. Devuelve la lista de cambios (ruta, nueva, huella).
    Aborta si algo no existe en lo publicado ni con la raíz vieja (/intranet/v4)."""
    faltan, cambios = [], []

    def blob(ruta):
        rel = ruta.lstrip('/')
        if ruta.endswith('/') or '.' not in ruta.rsplit('/', 1)[-1]:
            rel = rel.rstrip('/') + '/index.html' if rel.rstrip('/') else 'index.html'
        return leer_publicado(rel)

    for raiz, _d, fichs in os.walk(panel_dir):
        for f in sorted(fichs):
            if not f.endswith('.html'):
                continue
            p = os.path.join(raiz, f)
            t = open(p, encoding='utf-8', errors='replace').read()

            def uno(m):
                ruta, v = m.group('ruta'), m.group('v')
                if ruta.startswith('//') or ruta.startswith('/panel/') or ruta == '/panel':
                    return m.group(0)
                for cand in (ruta, '/intranet/v4' + ruta):
                    b = blob(cand)
                    if b is not None:
                        break
                else:
                    faltan.append('%s (en %s) no existe en lo publicado, ni como /intranet/v4%s' % (ruta, os.path.relpath(p, panel_dir), ruta))
                    return m.group(0)
                h = hashlib.sha1(b).hexdigest()[:8]
                if cand != ruta or (v and v != h):
                    cambios.append((ruta, cand, h if v else None))
                return m.group('pre') + m.group('q') + cand + (('?v=' + h) if v else '') + m.group('q')
            t2 = REF_PANEL.sub(uno, t)
            if t2 != t:
                open(p, 'w', encoding='utf-8', newline='').write(t2)
    if faltan:
        aborta('--panel-contra-publicado: el panel pide algo que producción aún no sirve:\n  ' + '\n  '.join(sorted(set(faltan))[:15]))
    return cambios


def publicado_de_clon(nombre, despliegues=None):
    """`leer_publicado` real: blobs del HEAD de la rama `limpio` del clon de despliegue de la instancia, que debe ser lo que
    hay en origin/main (un commit local sin subir no es «lo publicado»). Aborta si no se puede confirmar."""
    clon = os.path.join(despliegues or DESPLIEGUES, nombre)

    def git(*a):
        r = subprocess.run(['git'] + list(a), cwd=clon, capture_output=True)
        return r.returncode, r.stdout
    if not os.path.isdir(os.path.join(clon, '.git')):
        aborta('--panel-contra-publicado: %s no es el clon de lo publicado (sin .git)' % clon)
    rc, rama = git('branch', '--show-current')
    if rc or rama.decode().strip() != 'limpio':
        aborta('--panel-contra-publicado: el clon de %s no está en la rama `limpio`' % nombre)
    rc, _ = git('fetch', '-q', 'origin')   # sin fetch, origin/main local puede estar vieja y «lo publicado» sería obsoleto
    if rc:
        aborta('--panel-contra-publicado: no puedo consultar origin en el clon de %s (git fetch falla): no se confirma «lo publicado»' % nombre)
    rc, a = git('rev-parse', 'HEAD')
    rc2, b = git('rev-parse', 'origin/main')
    if rc or rc2 or a != b:
        aborta('--panel-contra-publicado: el HEAD del clon de %s no es lo que hay en origin/main: no es «lo publicado»' % nombre)

    def leer(rel):
        rc, out = git('cat-file', 'blob', 'HEAD:' + rel)
        return out if rc == 0 else None
    return leer


def rastros_en(raiz):
    """Rastro de Lawang, de la demo o de una clave que no es publicable en `raiz`."""
    restos = []
    for dirpath, _d, fichs in os.walk(raiz):
        for f in fichs:
            p = os.path.join(dirpath, f)
            if RASTRO.search(f):
                restos.append('nombre de fichero: ' + rel(p))
            if not f.endswith(EXT_TEXTO):
                continue
            t = open(p, encoding='utf-8', errors='replace').read()
            if SB_HOST in t or 'demo.invalid' in t or 'LW_DEMO_' in t:
                restos.append('%s: base de Lawang o doble de la demo' % rel(p))
            if re.search(r'sb_secret_|service_role', t):
                restos.append('%s: clave de servicio' % rel(p))
            for m in RASTRO.finditer(t):
                restos.append('%s: …%s…' % (rel(p), m.group(0)))
    return restos


# ── Portada y Puesta en marcha de las instancias de tipo Reservas (11-oct-2026, plan único F8) ──────────────────────────────────────────
# Solo las instancias con `"portada": "reservas"` en erp/instancias.json; Lawang, la demo y el resto siguen con la Home y los Ajustes de siempre.
PORTADAS = ('reservas',)
PORTADA_SEG = "  var seg = location.pathname.replace(/\\/(index\\.html)?$/, '').split('/').pop();\n"
PORTADA_SEG_RESERVAS = ("  if (seg === 'home' && document.querySelector('script[data-axw-portada=\"reservas\"]')) seg = 'portada-reservas';"
                        "   /* la Home de reservas pinta con su propio script (build.py portada_reservas) */\n")
AJUSTES_PUESTA_TAB_ANCLA = ('<button class="lw-tab-btn px-4 py-2 rounded-full bg-primary-container text-on-primary font-label-md text-[13px] font-medium transition-colors"'
                            ' role="tab" type="button" id="lw-tab-empresa"')
AJUSTES_PUESTA_TAB = ('<button class="lw-tab-btn px-4 py-2 rounded-full text-on-surface-variant hover:bg-surface-container font-label-md text-[13px] font-medium transition-colors"'
                      ' role="tab" type="button" id="lw-tab-puesta" aria-controls="lw-panel-puesta" aria-selected="false" tabindex="-1" data-lw-tab="puesta" data-lwt>'
                      'Configurar módulos</button>\n')
AJUSTES_PUESTA_PANEL_ANCLA = '<section id="lw-panel-empresa" role="tabpanel"'
AJUSTES_PUESTA_PANEL = (
    '<section id="lw-panel-puesta" role="tabpanel" aria-labelledby="lw-tab-puesta" data-lw-panel="puesta" class="bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden" hidden>\n'
    '<div class="px-8 pt-8 pb-4 flex flex-col gap-1 border-b border-outline-variant/40">\n'
    '<span class="font-label-md text-[11px] tracking-[0.16em] uppercase text-outline font-bold" data-lwt>Configurar módulos</span>\n'
    '<h2 class="font-headline-sm text-headline-sm text-deep-lagoon tracking-tight" data-lwt>Lo que hace falta para que cada módulo funcione</h2>\n'
    '<p class="font-body-sm text-body-sm text-outline" data-lwt>Cada módulo encendido, con sus pasos. Se cambian aquí o con el asistente, paso a paso.</p>\n'
    '</div>\n'
    '<div id="lw-aj-puesta">\n'
    '<p class="px-8 py-6 font-body-md text-body-md text-on-surface-variant" data-lwt>Trayendo la configuración…</p>\n'
    '</div>\n'
    '</section>\n\n')
# Solo el comienzo de la lista (12-oct-2026): Lawang añadió 'sociedades' tras 'empresa' (Sociedades emisoras en Ajustes) y puede añadir más; lo que hace
# falta es que 'puesta' entre la PRIMERA. Vale con la lista vieja y con la nueva.
AJUSTES_PESTANAS = "var PESTANAS = ['empresa',"
AJUSTES_DEFECTO = "return PESTANAS.indexOf(h) >= 0 ? h : 'empresa';"


def portada_de(nombre):
    """La portada que declara la instancia en el registro (`portada`), o None si sigue la de siempre. Un valor desconocido PARA: una errata no puede dejar
    la Home de parcelas sin un solo aviso."""
    p = _instancia_registro(nombre).get('portada')
    if p is not None and p not in PORTADAS:
        aborta('erp/instancias.json: %s declara "portada": %r y solo se conocen %s' % (nombre, p, ', '.join(PORTADAS)))
    return p


def portada_reservas():
    """/home/ de una instancia de tipo Reservas: las entregas y devoluciones del día (portada_reservas.html sobre la cáscara de /asistente/, como taller).
    SIN puerta de herramienta: es el `inicio` de todo el que entra (un mecánico con solo `taller` no puede rebotar al iniciar sesión); la lectura la vuelve
    a exigir la base. Sustituye la Home de Lawang solo en lo copiado a DIST, nunca en su repo."""
    v4 = os.path.join(DIST, 'intranet', 'v4')
    if not os.path.isfile(os.path.join(v4, 'home', 'index.html')):
        aborta('portada_reservas: no está la Home copiada de Lawang (intranet/v4/home/index.html): ¿cambió su sitio?')
    _pantalla_bot(v4, 'portada_reservas.html', 'home', 'Inicio', puerta='data-axw-portada="reservas"')
    # datos.js de Lawang elige qué cargar por el último trozo de la ruta: en /home/ arrancaba la Home de Lawang (KPIs de contratos y
    # cobros, tabla de documentos) sobre esta portada: 7 errores de consola y cuatro lecturas que la portada no usa (bbm-p16-publica,
    # 12-oct). Con la marca de la portada, datos.js no ve «home»: la trata como Taller o Ventas, que pintan con su propio script.
    dj = os.path.join(v4, 'assets', 'datos.js')
    t = open(dj, encoding='utf-8').read()
    t = _una_vez(t, PORTADA_SEG, PORTADA_SEG + PORTADA_SEG_RESERVAS, 'datos.js segmento de la portada de reservas')
    open(dj, 'w', encoding='utf-8', newline='').write(t)


# ── Setup por módulo (F3 Entrega 1, bbm-p18-front, 12-oct-2026) ────────────────────────────────────────────────────────────────────────────
# Owner, 12-oct 08:00: «1. Yo activo modulo. 2. Al entrar a la intranet salta un aviso de modulo sin configurar, te toca configurarlo. Salta un
# asistente que te guia por pasos y deja todo eso en Ajustes.» El núcleo (setup_modulos.js) y el aviso (aviso_setup.js) van pegados al guard.js
# de la instancia, como apagados_instancia.js, así salen en TODAS las páginas sin tocar su HTML; el asistente es una pantalla nueva en
# /ajustes/configurar/ (no /ajustes/asistente/: datos.js de Lawang arranca por el último trozo de la ruta y «asistente» es la pantalla del
# Asistente). Mientras la base no tenga modulos_setup_estado, el aviso no pinta nada y el asistente dice «todavía no disponible».
SETUP_GUARD = ('setup_modulos.js', 'aviso_setup.js')


def capa_facturas_prueba(nombre):
    """facturas_prueba.js (erp-front, 14-oct-2026; contrato bbm_bot_al_erp_13oct.md §3b, opción A de agencia-81; PROVISIONAL, AXW-291): marca las
    facturas de prueba en la lista y en el papel de Lawang sin tocarlos. Va pegada al final de guard.js SOLO en la instancia a la que va la migración
    que crea `facturas_prueba_datos()` (abanico.va_a: su `tipo:` y su `solo-en:`); donde no va, llamar a la lectura dejaría el contrato front↔base en
    rojo. Sin esa migración en la agencia, en ninguna. '' = nada que pegar."""
    sys.path.insert(0, os.path.join(AGENCIA, 'erp'))
    from abanico import va_a
    d = os.path.join(AGENCIA, 'erp', 'migraciones')
    crea = [n for n in sorted(os.listdir(d)) if n.endswith('.sql')
            and re.search(r'create\s+(or\s+replace\s+)?function\s+public\.facturas_prueba_datos\s*\(', open(os.path.join(d, n), encoding='utf-8').read(), re.I)]
    if not crea:
        return ''
    # la ÚLTIMA que la crea manda (una posterior puede recrearla con otro `solo-en:`; revisor, 1.ª vuelta de erp-front-cobros)
    texto = open(os.path.join(d, crea[-1]), encoding='utf-8').read()
    tipo = (_instancia_registro(nombre).get('config') or {}).get('tipo_erp')
    if not va_a(texto, nombre, tipo):
        return ''
    js = open(os.path.join(AQUI, 'facturas_prueba.js'), encoding='utf-8').read()
    if "window.lwDatos('facturas_prueba_datos')" not in js:
        aborta('facturas_prueba.js ya no llama a facturas_prueba_datos por lwDatos (contrato_front no la vería)')
    # sin sus comentarios, como apagados_instancia.js: va DESPUÉS de limpia_publico.js y son notas internas del estudio
    js = re.sub(r'/\*.*?\*/', '', js, flags=re.S)
    js = re.sub(r'^\s*//[^\n]*\n', '', js, flags=re.M)
    if re.search(r'\S[ \t]+//', js):
        aborta('facturas_prueba.js: un comentario al final de una línea de código saldría en el guard.js público (ponlo en su propia línea)')
    print('facturas de prueba: capa pegada a guard.js (%s)' % crea[-1])
    return '\n' + js


def setup_para_guard():
    """El núcleo y el aviso, sin comentarios (son notas internas del estudio), para pegarlos detrás del guard.js de la instancia."""
    trozos = []
    for f in SETUP_GUARD:
        s = open(os.path.join(AQUI, f), encoding='utf-8').read()
        s = re.sub(r'/\*.*?\*/', '', s, flags=re.S)
        s = re.sub(r'^\s*//[^\n]*\n', '', s, flags=re.M)
        if 'window.AXW_SETUP' not in s and 'window.AXW_AVISO' not in s:
            aborta('%s: no publica window.AXW_SETUP / window.AXW_AVISO' % f)
        trozos.append(s.strip())
    return '\n' + '\n'.join(trozos) + '\n'


def asistente_setup_pantalla():
    """/ajustes/configurar/: el asistente por pasos (asistente_setup.html) sobre la cáscara de /asistente/, con la puerta de administración (quién
    configura lo decide la base: puede_configurar). Va dos niveles por debajo de la raíz: sus rutas relativas pasan de ../assets/ a ../../assets/
    (nav.js saca su raíz de la src de su propio script). setup_pasos.js se carga aquí; el núcleo ya viene en guard.js."""
    v4 = os.path.join(DIST, 'intranet', 'v4')
    _pantalla_bot(v4, 'asistente_setup.html', os.path.join('ajustes', 'configurar'), 'Configurar', puerta='data-rol="admin"')
    pag = os.path.join(v4, 'ajustes', 'configurar', 'index.html')
    s = open(pag, encoding='utf-8').read()
    n = s.count('"../assets/')
    if n < 3:
        aborta('asistente_setup_pantalla: la cáscara de /asistente/ ya no carga sus assets con ../assets/ (hay %d)' % n)
    s = s.replace('"../assets/', '"../../assets/')
    if '"../assets/' in s or s.count('"../../assets/') != n:
        aborta('asistente_setup_pantalla: rutas relativas a medias')
    s = _una_vez(s, '<!--AXW_SCRIPT-->', '', 'configurar sin marca') if '<!--AXW_SCRIPT-->' in s else s
    cierre = '</body></html>'
    if s.count(cierre) != 1:
        aborta('asistente_setup_pantalla: la página no cierra con </body></html> una vez')
    s = s.replace(cierre, '<script src="../../assets/setup_pasos.js" defer></script>\n' + cierre)
    open(pag, 'w', encoding='utf-8', newline='').write(s)
    shutil.copy2(os.path.join(AQUI, 'setup_pasos.js'), os.path.join(v4, 'assets', 'setup_pasos.js'))


def ajustes_puesta_en_marcha():
    """Ajustes › Puesta en marcha (instancias de tipo Reservas): una pestaña más, la PRIMERA y la que abre /ajustes/ sin #, con los pasos que da la base
    (puesta_en_marcha_estado) y los dos sí/no de impuestos. El contenido lo pinta ajustes_puesta.js; aquí solo se pone la pestaña, su panel, el script y se
    le dice a ajustes.js (que tiene la lista de pestañas CERRADA) que existe. Todo con reemplazo literal que para si Lawang cambia el trozo. Va después de
    ajustes_correo_maestro(), que también reescribe ajustes.js. Solo se toca lo copiado en DIST, nunca el repo de Lawang."""
    v4 = os.path.join(DIST, 'intranet', 'v4')
    pag = os.path.join(v4, 'ajustes', 'index.html')
    t = open(pag, encoding='utf-8').read()
    t = _una_vez(t, AJUSTES_PUESTA_TAB_ANCLA, AJUSTES_PUESTA_TAB + AJUSTES_PUESTA_TAB_ANCLA, 'ajustes/index.html pestaña Puesta en marcha')
    t = _una_vez(t, AJUSTES_PUESTA_PANEL_ANCLA, AJUSTES_PUESTA_PANEL + AJUSTES_PUESTA_PANEL_ANCLA, 'ajustes/index.html panel Puesta en marcha')
    m = re.findall(r'<script src="\.\./assets/ajustes\.js(?:\?v=[0-9a-f]+)?" defer></script>', t)
    if len(m) != 1:
        aborta('ajustes_puesta_en_marcha: ajustes/index.html no carga UNA vez ../assets/ajustes.js con defer (hay %d)' % len(m))
    t = t.replace(m[0], m[0] + '<script src="../assets/setup_pasos.js" defer></script><script src="../assets/ajustes_puesta.js" defer></script>')
    open(pag, 'w', encoding='utf-8', newline='').write(t)
    js = os.path.join(v4, 'assets', 'ajustes.js')
    a = open(js, encoding='utf-8').read()
    a = _una_vez(a, AJUSTES_PESTANAS, AJUSTES_PESTANAS.replace("['empresa',", "['puesta', 'empresa',"), 'ajustes.js PESTANAS')
    a = _una_vez(a, AJUSTES_DEFECTO, AJUSTES_DEFECTO.replace("'empresa';", "'puesta';"), 'ajustes.js pestaña por defecto')
    open(js, 'w', encoding='utf-8', newline='').write(a)
    shutil.copy2(os.path.join(AQUI, 'ajustes_puesta.js'), os.path.join(v4, 'assets', 'ajustes_puesta.js'))
    shutil.copy2(os.path.join(AQUI, 'setup_pasos.js'), os.path.join(v4, 'assets', 'setup_pasos.js'))   # el mismo componente por paso que el asistente


# Revisor 13-oct (bbm-p41): la tw.css de la instancia es la de Lawang, purgada con las páginas de Lawang. Una clase que solo usan los ficheros del
# setup (que no son de Lawang) no se compila y la pantalla sale sin ese estilo, en silencio: p-3, gap-x-5 y tracking-[0.08em] en S44/S45. Estos
# ficheros pintan /ajustes/configurar/ y /ajustes/, que cargan esa tw.css; las axw-* las define el propio fichero en su <style>.
# setup_modulos.js (15-oct): la ventana común de Ajustes; sus clases no pueden depender de que otro fichero las use. Una sola línea: test_propiedades_paquete la lee
SETUP_CLASES = ('asistente_setup.html', 'setup_pasos.js', 'setup_reservas.js', 'setup_comun.js', 'ajustes_puesta.js', 'cobros_paso.js', 'setup_modulos.js', 'setup_propiedades.js')
# Dónde empieza una lista de clases: `class:` y `className =`/`+=` (se lee la expresión ENTERA: ternarios y concatenaciones), las constantes
# BTN*/CLS_* y el atributo class="…" del HTML.
RE_CLASES_INICIO = re.compile(r"""\bclass\s*:|\bclassName\s*\+?=(?!=)|\bvar\s+(?:BTN\w*|CLS_\w*)\s*=|\bclass="([^"\n]*)\"""")
_OPS_SIGUE = ('+', '?', ':', '||', '&&', '(', ',')   # la expresión sigue en la línea de abajo si esta acaba en uno o la siguiente empieza por uno


def _es_comparacion(antes, despues):
    """Un literal comparado (== != < > <= >=) no es una clase: `tipo === 'error' ? …`. La flecha `=>` no es comparación."""
    a, d = antes.rstrip(), despues.lstrip()
    if a.endswith(('==', '!=', '<=', '>=', '<')) or (a.endswith('>') and not a.endswith('=>')):
        return True
    return d.startswith(('==', '!=', '<', '>'))


def _literales(t, i):
    """Los literales '…', "…" y `…` de la expresión que empieza en t[i:], hasta , ; ) ] } de nivel 0 o el fin de la expresión (un salto de
    línea solo la corta si ni esa línea acaba ni la siguiente empieza con un operador). Fuera: los comparados y los argumentos de una llamada
    (`claseDe('error')`). Una plantilla `…${…}…` se devuelve entera: `${` no tiene forma de clase y para el build (mejor que perderla)."""
    out, nivel, j, n = [], 0, i, len(t)
    while j < n:
        c = t[j]
        if c in '\'"`':
            k = j + 1
            while k < n and t[k] != c:
                k += 2 if t[k] == '\\' else 1
            antes = t[:j].rstrip()
            llamada = antes.endswith('(') and re.search(r'[\w$]\s*\($', antes)
            if not llamada and not _es_comparacion(t[:j], t[k + 1:]):
                out.append(t[j + 1:k])
            j = k + 1
            continue
        if c in '([{':
            nivel += 1
        elif c in ')]}':
            if nivel == 0:
                break
            nivel -= 1
        elif c in ',;' and nivel == 0:
            break
        elif c == '\n' and nivel == 0 and t[i:j].strip():
            linea = t[t.rfind('\n', 0, j) + 1:j].rstrip()
            sig = t[j + 1:t.find('\n', j + 1) if t.find('\n', j + 1) >= 0 else n].lstrip()
            if not (linea.endswith(_OPS_SIGUE) or sig.startswith(_OPS_SIGUE)):
                break
        j += 1
    return out


def _selectores_tw(c):
    """Las formas en que Tailwind/CSS puede escribir el selector de la clase: puntuación con barra invertida, la coma como \\2c y un dígito
    inicial como \\3N, con espacio detrás solo si lo que sigue podría leerse como hexadecimal (Tailwind 3.4: `.\\32xl\\:…`)."""
    cuerpo = lambda s: ''.join(ch if ch.isalnum() or ch in '-_' else ('\\2c ' if ch == ',' else '\\' + ch) for ch in s)
    if not c[0].isdigit():
        return ['.' + cuerpo(c)]
    resto = cuerpo(c[1:])
    formas = ['.\\3' + c[0] + ' ' + resto]
    if not re.match(r'[0-9a-fA-F]', c[1:2]):
        formas.append('.\\3' + c[0] + resto)
    return formas


def clases_que_faltan(hoja, textos):
    """[«fichero:línea clase»] de las clases de `textos` ({nombre: contenido}) que `hoja` no trae. Pura: la prueba la llama sin construir."""
    faltan = []
    for f, t in textos.items():
        for m in RE_CLASES_INICIO.finditer(t):
            for lit in ([m.group(1)] if m.group(1) is not None else _literales(t, m.end())):
                for c in lit.split():
                    if c.startswith('axw-'):
                        continue
                    if not re.fullmatch(r'[\w:/.\[\]%#(),!-]+', c) or not any(
                            re.search(re.escape(s) + r'[\s{,:]', hoja) for s in _selectores_tw(c)):
                        faltan.append('%s:%d %s' % (f, t.count('\n', 0, m.start()) + 1, c))
    return faltan


def clases_setup_en_hoja():
    """Aborta si un fichero del setup usa una clase que la tw.css de la instancia no trae (como no_instalado_base() con la suya). Las lw-* de la
    cáscara vienen de shell.css, que las dos páginas también cargan; las axw-* las define cada fichero en su <style>. Una pieza que no tiene
    forma de clase también para: o es una clase rara que hay que mirar, o el chequeo está leyendo algo que no es una clase."""
    hoja = ''.join(open(os.path.join(DIST, 'intranet', 'v4', 'assets', f), encoding='utf-8').read() for f in ('tw.css', 'shell.css'))
    faltan = clases_que_faltan(hoja, {f: open(os.path.join(AQUI, f), encoding='utf-8').read() for f in SETUP_CLASES})
    if faltan:
        aborta('clases del setup que la tw.css (ni shell.css) de la instancia no trae (saldrían sin estilo; usa una que exista o estilo en línea): '
               + ', '.join(faltan))


def reservas_en_paquete(nombre):
    """¿Lleva esta instancia la pantalla de Reservas de producto? No si su registro la saca del paquete (apagados_extra.p): axisworks-demo tiene el
    módulo APAGADO a propósito (owner, 10-oct) y sacó /flota/ y /entrega/ por sus RPC; los pasos de setup_reservas.js las llamarían desde Ajustes y
    pondrían rojo su contrato del paquete (revisor, 12-oct). Sin el script, esos pasos caen en el componente genérico de «otra pantalla»."""
    fuera = {ruta_limpia(u) for u in ((_instancia_registro(nombre).get('apagados_extra') or {}).get('p') or [])}
    return ruta_limpia('/intranet/v4/reservas-producto/') not in fuera


def setup_reservas_pasos():
    """Pasos del setup de Reservas de producto (F3 Entregas 3 y 4, bbm-p27, 12-oct-2026): clase, alquiler con unidades, reglas, lo ya alquilado y
    entrega, en setup_reservas.js. Se suman a los componentes de setup_pasos.js con AXW_PASOS.registra(), así que van DETRÁS de setup_pasos.js y
    DELANTE del script que los usa, en las dos páginas que comparten componente: el asistente y Ajustes › Configurar módulos. Va después de
    asistente_setup_pantalla() y ajustes_puesta_en_marcha(); reemplazo literal que para si cambia la etiqueta."""
    v4 = os.path.join(DIST, 'intranet', 'v4')
    for pag, pre in ((os.path.join(v4, 'ajustes', 'configurar', 'index.html'), '../../assets/'), (os.path.join(v4, 'ajustes', 'index.html'), '../assets/')):
        t = open(pag, encoding='utf-8').read()
        tag = '<script src="%ssetup_pasos.js" defer></script>' % pre
        t = _una_vez(t, tag, tag + '<script src="%ssetup_reservas.js" defer></script>' % pre, 'setup_reservas_pasos %s' % os.path.relpath(pag, v4))
        open(pag, 'w', encoding='utf-8', newline='').write(t)
    shutil.copy2(os.path.join(AQUI, 'setup_reservas.js'), os.path.join(v4, 'assets', 'setup_reservas.js'))


# Los escritores de setup_propiedades.js (N4, 20261014051000) nacen CERRADOS: ninguno tiene EXECUTE hasta que llega la pantalla (agencia-81, opción A).
# La migración que los abre llega en el MISMO aterrizaje que este script; el script entra solo en la instancia a la que va esa migración.
PROPIEDADES_ESCRITORES = ('tipo_vivienda_guarda', 'obra_fase_guarda', 'contrato_tipo_etapa_guarda', 'comisiones_interruptor_guarda')
# la lectura de Ajustes › Comisiones (erp-setup la escribe en la MISMA migración que abre el grant de los cuatro)
PROPIEDADES_LECTURAS = ('comisiones_interruptor_datos',)
AJUSTES_COMISIONES_TAB = ('<button class="lw-tab-btn px-4 py-2 rounded-full text-on-surface-variant hover:bg-surface-container font-label-md text-[13px] font-medium transition-colors"'
                          ' role="tab" type="button" id="lw-tab-comisiones" aria-controls="lw-panel-comisiones" aria-selected="false" tabindex="-1" data-lw-tab="comisiones" data-lwt hidden>'
                          'Comisiones</button>\n')
AJUSTES_COMISIONES_PANEL = (
    '<section id="lw-panel-comisiones" role="tabpanel" aria-labelledby="lw-tab-comisiones" data-lw-panel="comisiones" class="bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden" hidden>\n'
    '<div class="px-8 pt-8 pb-4 flex flex-col gap-1 border-b border-outline-variant/40">\n'
    '<span class="font-label-md text-[11px] tracking-[0.16em] uppercase text-outline font-bold" data-lwt>Ajustes</span>\n'
    '<h2 class="font-headline-sm text-headline-sm text-deep-lagoon tracking-tight" data-lwt>Interruptores de comisiones</h2>\n'
    '</div>\n'
    '<div id="lw-aj-comisiones"></div>\n'
    '</section>\n\n')


def propiedades_en_paquete(nombre):
    """¿Lleva esta instancia los pasos de Propiedades (setup_propiedades.js, erp-front 14-oct-2026; contrato encargo_front_pasos_propiedades.md de
    erp-setup)? Sí solo si en la agencia hay una migración que da `grant execute … to authenticated` a sus cuatro escritores y una lectura y esa migración va a la
    instancia (abanico.va_a: su `tipo:` y su `solo-en:`). Sin el grant, la pantalla llamaría a una función cerrada (42501 a todo el mundo) y el
    contrato front↔base saldría rojo; con el grant y sin la pantalla, una función abierta sin llamador (§1.ter). Una migración que abra solo
    algunas de esas funciones no vale: aborta, porque los pasos y la pestaña son un mismo componente."""
    sys.path.insert(0, os.path.join(AGENCIA, 'erp'))
    from abanico import va_a
    d = os.path.join(AGENCIA, 'erp', 'migraciones')
    tipo = (_instancia_registro(nombre).get('config') or {}).get('tipo_erp')
    for n in sorted(os.listdir(d)):
        if not n.endswith('.sql'):
            continue
        texto = open(os.path.join(d, n), encoding='utf-8').read()
        abre = [f for f in PROPIEDADES_ESCRITORES + PROPIEDADES_LECTURAS
                if re.search(r'grant\s+execute\s+on\s+function\s+public\.%s\s*\([^)]*\)\s+to\s+authenticated' % f, texto, re.I)]
        if not abre:
            continue
        if len(abre) != len(PROPIEDADES_ESCRITORES + PROPIEDADES_LECTURAS):
            aborta('%s abre solo %s de las funciones de Propiedades %s: setup_propiedades.js las llama todas' % (n, abre, list(PROPIEDADES_ESCRITORES + PROPIEDADES_LECTURAS)))
        return bool(va_a(texto, nombre, tipo))
    return False


def setup_propiedades_pasos():
    """Pasos del setup de Propiedades (tipos_vivienda, fases_obra, carta_reserva) en setup_propiedades.js. Como setup_reservas_pasos(): se suman con
    AXW_PASOS.registra(), DETRÁS de setup_pasos.js, en las dos páginas que comparten componente (el asistente y Ajustes › Configurar módulos)."""
    v4 = os.path.join(DIST, 'intranet', 'v4')
    for pag, pre in ((os.path.join(v4, 'ajustes', 'configurar', 'index.html'), '../../assets/'), (os.path.join(v4, 'ajustes', 'index.html'), '../assets/')):
        s = open(pag, encoding='utf-8').read()
        tag = '<script src="%ssetup_pasos.js" defer></script>' % pre
        s = _una_vez(s, tag, tag + '<script src="%ssetup_propiedades.js" defer></script>' % pre, 'setup_propiedades_pasos %s' % os.path.relpath(pag, v4))
        open(pag, 'w', encoding='utf-8', newline='').write(s)
    js = open(os.path.join(AQUI, 'setup_propiedades.js'), encoding='utf-8').read()
    for f in PROPIEDADES_ESCRITORES:   # contrato_front busca el nombre LITERAL de la función en el paquete
        if "sb.rpc('%s'" % f not in js:
            aborta('setup_propiedades.js ya no llama a %s por su nombre literal' % f)
    for f in PROPIEDADES_LECTURAS:
        if "datos('%s')" % f not in js:
            aborta('setup_propiedades.js ya no lee %s por su nombre literal' % f)
    # Ajustes › Comisiones (pieza 4): la pestaña OCULTA y su panel; setup_propiedades.js la enseña solo al administrador principal. Mismas anclas que
    # Cobros (antes de la pestaña y del panel de Registro) y la pestaña se añade al FINAL de la lista cerrada de ajustes.js.
    pag = os.path.join(v4, 'ajustes', 'index.html')
    s = open(pag, encoding='utf-8').read()
    s = _una_vez(s, AJUSTES_COBROS_TAB_ANCLA, AJUSTES_COMISIONES_TAB + AJUSTES_COBROS_TAB_ANCLA, 'ajustes/index.html pestaña Comisiones')
    s = _una_vez(s, AJUSTES_COBROS_PANEL_ANCLA, AJUSTES_COMISIONES_PANEL + AJUSTES_COBROS_PANEL_ANCLA, 'ajustes/index.html panel Comisiones')
    open(pag, 'w', encoding='utf-8', newline='').write(s)
    aj = os.path.join(v4, 'assets', 'ajustes.js')
    a = open(aj, encoding='utf-8').read()
    lista = AJUSTES_COBROS_PESTANAS.findall(a)
    if len(lista) != 1 or "'comisiones'" in lista[0]:
        aborta('ajustes.js: esperaba UNA lista `var PESTANAS = [...];` sin comisiones y hay %d%s' % (len(lista), quien_cambio_lawang('ajustes.js')))
    a = AJUSTES_COBROS_PESTANAS.sub(lambda m: m.group(1) + ", 'comisiones'];", a, count=1)
    open(aj, 'w', encoding='utf-8', newline='').write(a)
    shutil.copy2(os.path.join(AQUI, 'setup_propiedades.js'), os.path.join(v4, 'assets', 'setup_propiedades.js'))
    print('pasos de Propiedades: setup_propiedades.js en el asistente y en Ajustes')


# ── Ajustes › Cobros (F3 Entrega 2, bbm-p24-cobros-front, 12-oct-2026) ─────────────────────────────────────────────────────────────────────
# Owner, 12-oct 04:56: «La clave de xendit o stripe que la ponga el cliente en ajustes»; 08:25: «El ERP crea el enlace de pago». cobros_paso.js es el
# componente del paso «cobros» (se registra en setup_pasos.js) y el anfitrión de la pestaña. La pestaña nace OCULTA: cobros_paso.js la enseña solo
# si la base declara el paso (modulos_setup_estado) — en una instancia sin Cobros aplicado no sale nada. Es el único llamador de la edge ajustes-pagos.
AJUSTES_COBROS_TAB_ANCLA = ('<button class="lw-tab-btn px-4 py-2 rounded-full text-on-surface-variant hover:bg-surface-container font-label-md text-[13px] font-medium transition-colors"'
                            ' role="tab" type="button" id="lw-tab-registro"')
AJUSTES_COBROS_TAB = ('<button class="lw-tab-btn px-4 py-2 rounded-full text-on-surface-variant hover:bg-surface-container font-label-md text-[13px] font-medium transition-colors"'
                      ' role="tab" type="button" id="lw-tab-cobros" aria-controls="lw-panel-cobros" aria-selected="false" tabindex="-1" data-lw-tab="cobros" data-lwt hidden>'
                      'Cobros en línea</button>\n')
AJUSTES_COBROS_PANEL_ANCLA = '<section id="lw-panel-registro" role="tabpanel"'
AJUSTES_COBROS_PANEL = (
    '<section id="lw-panel-cobros" role="tabpanel" aria-labelledby="lw-tab-cobros" data-lw-panel="cobros" class="bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden" hidden>\n'
    '<div class="px-8 pt-8 pb-4 flex flex-col gap-1 border-b border-outline-variant/40">\n'
    '<span class="font-label-md text-[11px] tracking-[0.16em] uppercase text-outline font-bold" data-lwt>Ajustes</span>\n'
    '<h2 class="font-headline-sm text-headline-sm text-deep-lagoon tracking-tight" data-lwt>Cobros en línea</h2>\n'
    '<p class="font-body-sm text-body-sm text-outline" data-lwt>Las claves de Xendit con las que el ERP crea el enlace de pago y comprueba los pagos. Se escriben una vez y no se vuelven a enseñar.</p>\n'
    '</div>\n'
    '<div id="lw-aj-cobros"></div>\n'
    '</section>\n\n')
# La lista CERRADA de pestañas de ajustes.js (`var PESTANAS = [...];`): 'cobros' se añade al FINAL de la que haya. Antes el ancla era el último
# elemento ('registro'];) y una pestaña nueva de Lawang al final habría dejado rojo el build de bbm (revisor, 13-oct; familia ancla-de-texto-en-lawang).
AJUSTES_COBROS_PESTANAS = re.compile(r"(var PESTANAS = \[[^\]\n]*)\];")
COBROS_TRAS = '/setup_pasos.js" defer></script>'


def ajustes_cobros():
    """La pestaña Ajustes › Cobros y cobros_paso.js en /ajustes/ y en /ajustes/configurar/, justo DETRÁS de setup_pasos.js (registra el componente
    del paso «cobros») y, en /ajustes/, antes de ajustes_puesta.js (el orden de los defer). Va después de ajustes_puesta_en_marcha() y de
    asistente_setup_pantalla(), que ponen setup_pasos.js. Reemplazos literales que paran si Lawang cambia el trozo; solo se toca DIST."""
    v4 = os.path.join(DIST, 'intranet', 'v4')
    pag = os.path.join(v4, 'ajustes', 'index.html')
    t = open(pag, encoding='utf-8').read()
    t = _una_vez(t, AJUSTES_COBROS_TAB_ANCLA, AJUSTES_COBROS_TAB + AJUSTES_COBROS_TAB_ANCLA, 'ajustes/index.html pestaña Cobros')
    t = _una_vez(t, AJUSTES_COBROS_PANEL_ANCLA, AJUSTES_COBROS_PANEL + AJUSTES_COBROS_PANEL_ANCLA, 'ajustes/index.html panel Cobros')
    t = _una_vez(t, '../assets' + COBROS_TRAS, '../assets' + COBROS_TRAS + '<script src="../assets/cobros_paso.js" defer></script>', 'ajustes/index.html cobros_paso.js')
    if t.index('cobros_paso.js') > t.index('ajustes_puesta.js'):
        aborta('ajustes_cobros: cobros_paso.js tiene que cargar antes que ajustes_puesta.js')
    open(pag, 'w', encoding='utf-8', newline='').write(t)
    conf = os.path.join(v4, 'ajustes', 'configurar', 'index.html')
    s = open(conf, encoding='utf-8').read()
    s = _una_vez(s, '../../assets' + COBROS_TRAS, '../../assets' + COBROS_TRAS + '\n<script src="../../assets/cobros_paso.js" defer></script>', 'ajustes/configurar cobros_paso.js')
    open(conf, 'w', encoding='utf-8', newline='').write(s)
    js = os.path.join(v4, 'assets', 'ajustes.js')
    a = open(js, encoding='utf-8').read()
    lista = AJUSTES_COBROS_PESTANAS.findall(a)
    if len(lista) != 1 or "'cobros'" in lista[0]:
        aborta('ajustes.js: esperaba UNA lista `var PESTANAS = [...];` sin cobros y hay %d%s' % (len(lista), quien_cambio_lawang('ajustes.js')))
    a = AJUSTES_COBROS_PESTANAS.sub(lambda m: m.group(1) + ", 'cobros'];", a, count=1)
    open(js, 'w', encoding='utf-8', newline='').write(a)
    shutil.copy2(os.path.join(AQUI, 'cobros_paso.js'), os.path.join(v4, 'assets', 'cobros_paso.js'))


# ── Pasos comunes del setup y del Taller + Ajustes › Idiomas contra la base (F3, bbm-p31-front-comun, 12-oct-2026) ─────────────────────────────
# setup_comun.js registra los componentes de negocio, idiomas, correo y taller_* (setup_pasos.js → AXW_PASOS.registra) en las DOS páginas que comparten
# componente. No pinta nada que la base no declare: sin la migración 20261012220000 (bbm-p28) aplicada, ningún paso suyo sale.
# El adaptador de Ajustes › Idiomas (IDIOMAS_ORIGEN de Lawang, ajustes-pG2) se sustituye en la COPIA: lee modulos_activos_datos().idiomas y guarda por
# ajustes_config_guardar('idiomas', [...]). Si la respuesta de la base no trae `idiomas` (base sin la 220000), sigue en solo lectura como hoy. Lawang no cambia.
IDIOMAS_ORIGEN_LAWANG = ("  var IDIOMAS_ORIGEN = {\n    lee: function () {\n"
                         "      var dec = Array.isArray(window.AXW_IDIOMAS) && window.AXW_IDIOMAS.length ? window.AXW_IDIOMAS.slice() : ['es', 'en'];\n"
                         "      return Promise.resolve({ ofrecidos: dec, defecto: dec[0], origen: 'publicacion' });\n    },\n"
                         "    puedeGuardar: false,   // pasa a true cuando la base tenga su clave y su función de guardar\n"
                         "    guarda: function () { return Promise.resolve({ ok: false, motivo: 'sin_base' }); }\n  };\n")
IDIOMAS_ORIGEN_BASE = """  var IDIOMAS_ORIGEN = {
    // AxisWorks (build.py, bbm-p31, 12-oct): la base guarda los idiomas (clave `idiomas`, migración 20261012220000). Sin `idiomas` en la respuesta = esa
    // base aún no los guarda: solo lectura, como antes. null = no se han guardado: manda lo que fijó el build.
    puedeGuardar: false,
    lee: function () {
      var b = Array.isArray(window.AXW_IDIOMAS_BUILD) ? window.AXW_IDIOMAS_BUILD.slice() : (Array.isArray(window.AXW_IDIOMAS) && window.AXW_IDIOMAS.length ? window.AXW_IDIOMAS.slice() : ['es', 'en']);
      var deBuild = { ofrecidos: b, defecto: b[0], origen: 'publicacion' };
      if (!sb) return Promise.resolve(deBuild);
      return Promise.resolve(sb.rpc('modulos_activos_datos')).then(function (r) {
        if (!r || r.error || !r.data || typeof r.data !== 'object' || Array.isArray(r.data)) throw new Error('modulos_activos_datos');
        if (!('idiomas' in r.data)) { IDIOMAS_ORIGEN.puedeGuardar = false; return deBuild; }
        IDIOMAS_ORIGEN.puedeGuardar = true;
        var v = r.data.idiomas;
        if (v == null) return deBuild;
        if (typeof v !== 'object' || !Array.isArray(v.ofrecidos)) throw new Error('forma de idiomas');
        return { ofrecidos: v.ofrecidos.slice(), defecto: v.defecto, origen: 'base' };
      });
    },
    guarda: function (v) {
      var lista = [v.defecto].concat(v.ofrecidos.filter(function (c) { return c !== v.defecto; }));
      function apunta() { try { localStorage.setItem('axw_idiomas_erp', JSON.stringify(lista)); } catch (e) { /* MUDO A PROPOSITO: el arranque cae al build */ } return { ok: true }; }
      // sin respuesta: se relee y se compara (nunca se reenvía solo)
      function duda() {
        return IDIOMAS_ORIGEN.lee().then(function (x) {
          var l = [x.defecto].concat(x.ofrecidos.filter(function (c) { return c !== x.defecto; }));
          return x.origen === 'base' && l.join() === lista.join() ? apunta() : { ok: false, motivo: T('sin respuesta') };
        }, function () { return { ok: false, motivo: T('sin respuesta') }; });
      }
      if (!sb) return Promise.resolve({ ok: false, motivo: T('sin respuesta') });
      return Promise.resolve(sb.rpc('ajustes_config_guardar', { p_clave: 'idiomas', p_valor: lista })).then(function (r) {
        if (r && !r.error) return apunta();
        var e = (r && r.error) || {};
        if (e.code === '42501') return { ok: false, motivo: T('Solo el super admin puede cambiar los ajustes.') };
        if (e.hint === 'idiomas_no_validos') return { ok: false, motivo: T('Esa combinación de idiomas todavía no se puede usar en este ERP. Pídesela al estudio.') };
        if (!e.code) return duda();
        return { ok: false, motivo: T('sin detalle') };
      }, duda);
    }
  };
"""
IDIOMAS_PINTABLES_LAWANG = "  var IDIOMAS_PINTABLES = [['es', 'en'], ['id', 'en']];"
# id+en solo si el paquete trae el indonesio (el build lo fijó): sin su diccionario sería una casilla que no hace nada
IDIOMAS_PINTABLES_BASE = ("  var IDIOMAS_PINTABLES = [['es', 'en'], ['id', 'en']].filter(function (p) { return p[0] !== 'id' || "
                          "(Array.isArray(window.AXW_IDIOMAS_BUILD) && window.AXW_IDIOMAS_BUILD.indexOf('id') >= 0); });")


# ── N4/T F2 (14-oct-2026, erp-setup-b1b5): /usuarios/ da de alta por INVITACIÓN, sin contraseña ───────────────────────────────────────────────
# Owner 14-oct: «Si tengo que darte cosas es porque el ERP está mal»; y nadie fija ni ve la contraseña de otro. La edge admin-usuarios de cada
# instancia (parche de erp/nueva_instancia.py, B1) tiene la acción `invitar`: crea la cuenta SIN contraseña y manda el enlace a
# /crea-contrasena/ por el correo de la instancia; el enlace nunca vuelve al navegador. Aquí solo cambia el formulario de la COPIA de Lawang:
# fuera el campo «Contraseña provisional» y su comprobación, `accion: 'invitar'` sin `password`, y los textos de lo que pasa. Mismos campos
# `k` y misma edge (enganche por identificador, norma del 29-sep). Reemplazos literales que paran si Lawang cambia el trozo; Lawang no cambia.
USUARIOS_INVITACION = (
    ("          { k: 'password', label: 'Contraseña provisional', req: 1, medio: 1,\n"
     "            ayuda: 'Mínimo 10 caracteres. La verá al entrar; que la cambie después. No se puede volver a consultar.' },\n", ''),
    ("          if ((v.password || '').length < 10) return { error: { message: 'la contraseña necesita 10 caracteres o más' } };\n", ''),
    ("                accion: 'crear', email: email, password: v.password,\n", "                accion: 'invitar', email: email,\n"),
    ("              if (d.email_enviado === false) {\n"
     "                aviso('Usuario creado: ' + email + '. Aviso: no se pudo enviar el correo de bienvenida — dale la contraseña a mano.' + noDados, '#8A6A34');\n"
     "              } else {\n"
     "                aviso('Usuario creado: ' + email + ' — correo de bienvenida enviado.' + noDados, noDados ? '#8A6A34' : undefined);\n"
     "              }\n",
     "              if (d.enviado === false) {\n"
     "                aviso(tH('Invitación creada para %e, pero el correo no ha salido: reenvíala desde su ficha («Reenviar invitación») cuando el correo funcione.', { e: email }) + noDados, '#8A6A34');\n"
     "              } else {\n"
     "                aviso(tH('Invitación enviada a %e: pondrá su contraseña desde el correo.', { e: email }) + noDados, noDados ? '#8A6A34' : undefined);\n"
     "              }\n"),
    ("              if (d.user_id) u2.searchParams.set('u', email); else u2.searchParams.delete('u');\n",
     "              if (d.usuario_id) u2.searchParams.set('u', email); else u2.searchParams.delete('u');\n"),
)


# La ficha de un usuario (datos.js): «Reenviar invitación» junto a «Cambiar contraseña», para quien no ha aceptado aún (la edge decide: si ya
# aceptó contesta sin_invitacion_pendiente). «Cambiar contraseña» se queda: el owner la dejó funcionando en Bali Best el 13-oct (guion 3).
USUARIOS_REENVIO_FICHA = (
    ("            acciones.push({ texto: 'Cambiar contraseña', onClick: function () {\n"
     "              if (window.LW_V4.abreCambiaPassword) window.LW_V4.abreCambiaPassword(u);\n"
     "              else toast('El editor aún no ha cargado — prueba de nuevo en un segundo.');\n"
     "            } });\n",
     "            acciones.push({ texto: 'Cambiar contraseña', onClick: function () {\n"
     "              if (window.LW_V4.abreCambiaPassword) window.LW_V4.abreCambiaPassword(u);\n"
     "              else toast('El editor aún no ha cargado — prueba de nuevo en un segundo.');\n"
     "            } });\n"
     "            // N4/T F2 (AxisWorks, 14-oct): la edge admin-usuarios de la instancia reenvía SOLO una invitación sin aceptar, con su espera y su tope\n"
     "            acciones.push({ texto: 'Reenviar invitación', onClick: function () {\n"
     "              var MOT = { sin_invitacion_pendiente: 'No tiene ninguna invitación pendiente: ya entró con su contraseña.',\n"
     "                espera: 'Ya se le envió hace menos de una hora: espera antes de reenviarla.',\n"
     "                tope: 'Esta invitación ya se ha reenviado 5 veces: no se reenvía más. Revisa que el correo esté bien escrito.',\n"
     "                sin_permiso: 'Solo un super admin reenvía la invitación de un administrador.',\n"
     "                usuario_no_valido: 'Esta invitación no se reenvía desde aquí: la del administrador principal va por el panel del estudio.' };\n"
     "              sb.auth.getSession().then(function (s) {\n"
     "                var tk = s && s.data && s.data.session && s.data.session.access_token;\n"
     "                if (!tk) return toastMal(tx('No se pudo: sesión no encontrada.'));\n"
     "                return fetch(window.lwEdge('admin-usuarios'), { method: 'POST',\n"
     "                  headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + tk, 'apikey': window.LW_SB_KEY },\n"
     "                  body: JSON.stringify({ accion: 'reenviar_invitacion', usuario_id: u.user_id }) })\n"
     "                  .then(function (r) { return r.json().catch(function () { return { error: 'respuesta ilegible del servidor' }; }); })\n"
     "                  .then(function (d) {\n"
     "                    if (d && d.ok && d.enviado) toast(tx('Invitación reenviada a %e.', { e: u.email }));\n"
     "                    else if (d && d.ok) toastMal(tx('El correo no ha salido: revisa Ajustes › Correo. Podrás reenviarla dentro de una hora.'));\n"
     "                    else toastMal(MOT[d && d.error] ? tx(MOT[d.error]) : tx('No se pudo: %e', { e: String((d && d.error) || '') }));\n"
     "                  }, function () { toastMal(tx('No se pudo: %e', { e: 'sin conexión' })); });\n"
     "              });\n"
     "            } });\n"),
)
INVITA_NOTA = 'Le llega un correo con un enlace para poner su contraseña: nadie más la ve. Hasta que la ponga no puede entrar.'


def usuarios_por_invitacion():
    """F2: el alta de /usuarios/ de la instancia por invitación (ver USUARIOS_INVITACION) y el reenvío desde la ficha. Solo toca DIST. Va DESPUÉS
    de oculta_por_modulo: el botón y la nota del alta son anclas de ALTA_SIN_CONTRATOS, así que aquí se cambia el texto que esa deja (revisor
    14-oct: con F2 antes, el build de toda instancia paraba en oculta_por_modulo)."""
    boton = [n for _, v, n in ALTA_SIN_CONTRATOS if "'Crear usuario', function (v) {" in v]
    nota = [n for _, v, n in ALTA_SIN_CONTRATOS if "tipo: 'nota', label: 'Se crea la cuenta" in v]
    if len(boton) != 1 or len(nota) != 1 or nota[0].count('Se crea la cuenta y se le da acceso de inmediato.') != 2:
        aborta('usuarios_por_invitacion: ALTA_SIN_CONTRATOS ya no deja el botón y la nota del alta como espera F2')
    reps = USUARIOS_INVITACION + ((boton[0], boton[0].replace("'Crear usuario'", "'Enviar invitación'")),
                                  (nota[0], nota[0].replace('Se crea la cuenta y se le da acceso de inmediato.', INVITA_NOTA)))
    js = os.path.join(DIST, 'intranet', 'v4', 'assets', 'editores.js')
    e = open(js, encoding='utf-8').read()
    for viejo, nuevo in reps:
        e = _una_vez(e, viejo, nuevo, 'usuarios_por_invitacion editores.js')
    if "accion: 'crear', email: email" in e or "k: 'password', label: 'Contraseña provisional'" in e:
        aborta('usuarios_por_invitacion: queda un alta con contraseña en editores.js')
    open(js, 'w', encoding='utf-8', newline='').write(e)
    dj = os.path.join(DIST, 'intranet', 'v4', 'assets', 'datos.js')
    d = open(dj, encoding='utf-8').read()
    for viejo, nuevo in USUARIOS_REENVIO_FICHA:
        d = _una_vez(d, viejo, nuevo, 'usuarios_por_invitacion datos.js')
    open(dj, 'w', encoding='utf-8', newline='').write(d)


def setup_comun_pasos():
    """setup_comun.js detrás de setup_pasos.js en /ajustes/configurar/ y en /ajustes/ (todas las instancias: el módulo base está en todas), y el adaptador
    de Ajustes › Idiomas contra la base. Va después de asistente_setup_pantalla() y ajustes_puesta_en_marcha(). Reemplazos literales que paran si cambia el
    trozo de Lawang; solo se toca DIST."""
    v4 = os.path.join(DIST, 'intranet', 'v4')
    for pag, pre in ((os.path.join(v4, 'ajustes', 'configurar', 'index.html'), '../../assets/'), (os.path.join(v4, 'ajustes', 'index.html'), '../assets/')):
        t = open(pag, encoding='utf-8').read()
        tag = '<script src="%ssetup_pasos.js" defer></script>' % pre
        t = _una_vez(t, tag, tag + '<script src="%ssetup_comun.js" defer></script>' % pre, 'setup_comun_pasos %s' % os.path.relpath(pag, v4))
        if 'ajustes_puesta.js' in t and t.index('setup_comun.js') > t.index('ajustes_puesta.js'):
            aborta('setup_comun_pasos: setup_comun.js tiene que cargar antes que ajustes_puesta.js')
        open(pag, 'w', encoding='utf-8', newline='').write(t)
    shutil.copy2(os.path.join(AQUI, 'setup_comun.js'), os.path.join(v4, 'assets', 'setup_comun.js'))
    js = os.path.join(v4, 'assets', 'ajustes.js')
    a = open(js, encoding='utf-8').read()
    a = _una_vez(a, IDIOMAS_ORIGEN_LAWANG, IDIOMAS_ORIGEN_BASE, 'ajustes.js IDIOMAS_ORIGEN')
    a = _una_vez(a, IDIOMAS_PINTABLES_LAWANG, IDIOMAS_PINTABLES_BASE, 'ajustes.js IDIOMAS_PINTABLES')
    open(js, 'w', encoding='utf-8', newline='').write(a)


# ── Textos de inmobiliaria fuera de las pantallas COMUNES de una instancia (owner, 12-oct-2026: «Sí, tal cual» a la lista de idiomas-pH) ──────────────
# En una instancia del ERP (bbm alquila motos) no hay proyectos, villas ni Cartas de Reserva: el campo de la factura, su ejemplo, el buscador de
# Facturas, la cabecera y la pestaña de Ajustes y la tarjeta de Ajustes del hub hablaban de ellos. Solo cambia el TEXTO: el campo sigue siendo
# `proyecto_nombre`, la pestaña sigue siendo data-lw-tab="reservas" y la tarjeta sigue apuntando a /ajustes/ (enganche por identificador, norma del
# 29-sep). Reemplazos literales sobre la COPIA que paran si Lawang cambia el trozo; Lawang no cambia. Traducciones en MENU_I18N (en/id).
TEXTOS_INSTANCIA = (
    # (fichero en DIST, trozo de Lawang, sustituto, veces que aparece)
    ('intranet/v4/assets/editores.js', "label: 'Proyecto / unidad'", "label: 'Referencia'", 2),
    ('intranet/v4/facturas/index.html', 'placeholder="Buscar por número, cliente, contrato o proyecto…"', 'placeholder="Buscar por número, cliente o reserva…"', 1),
    ('intranet/v4/ajustes/index.html', 'el correo, el modo mantenimiento y los plazos de las Cartas de Reserva. Cambiarlos aquí',
     'el correo y el modo mantenimiento. Cambiarlos aquí', 1),
    ('intranet/v4/ajustes/index.html', '<span class="font-label-md text-[11px] tracking-[0.16em] uppercase text-outline font-bold" data-lwt>Reservas</span>\n'
     '<h2 class="font-headline-sm text-headline-sm text-deep-lagoon tracking-tight" data-lwt>Vencimiento, gracia y prórrogas de las Cartas de Reserva</h2>',
     '<span class="font-label-md text-[11px] tracking-[0.16em] uppercase text-outline font-bold" data-lwt>Ajustes</span>\n'
     '<h2 class="font-headline-sm text-headline-sm text-deep-lagoon tracking-tight" data-lwt>Plazos</h2>', 1),
    ('contracts/assets/herramientas.js', "para:'Días de gracia, prórrogas y techos de las reservas: lo que el sistema aplica solo.',",
     "para:'Empresa, correo, impuestos y usuarios del ERP.',", 1),
    # bbm-p39 (13-oct): la columna y el dato que enseñan ese campo (`proyecto_nombre`) se llaman como él. La base no lo rellena al facturar una
    # reserva (medido en bbm: ni factura_producto_crea ni el borrador de operación lo escriben); solo el editor manual, en «Referencia».
    ('intranet/v4/facturas/index.html', '<th class="py-3.5 px-4 font-semibold" data-lwt>Proyecto</th>', '<th class="py-3.5 px-4 font-semibold" data-lwt>Referencia</th>', 1),
    ('intranet/v4/recibos/index.html', '<th class="py-3.5 px-4 font-semibold" data-lwt>Proyecto</th>', '<th class="py-3.5 px-4 font-semibold" data-lwt>Referencia</th>', 1),
    ('intranet/v4/assets/datos.js', "H.dato('Proyecto', f.proyecto_nombre)", "H.dato('Referencia', f.proyecto_nombre)", 1),
    ('intranet/v4/assets/datos.js', "(g.proyecto || tx('sin proyecto'))", "(g.proyecto || tx('sin referencia'))", 1),
    # la ficha de factura/recibí: sin el módulo contratos no hay contrato que enseñar (el dato salía «—» siempre); uno ya guardado se sigue viendo
    ('intranet/v4/assets/datos.js', "H.seccion('Cliente y contrato',", "H.seccion(contratosActivo() ? 'Cliente y contrato' : 'Cliente',", 1),
    ('intranet/v4/assets/datos.js', "        H.dato('Contrato', c ? (contratosActivo() ? enlaceFichaContrato(c) : esc(c.numero || '')) : (f.contrato_numero || null), { html: !!c }) +",
     "        (c || f.contrato_numero || contratosActivo() ? H.dato('Contrato', c ? (contratosActivo() ? enlaceFichaContrato(c) : esc(c.numero || '')) : (f.contrato_numero || null), { html: !!c }) : '') +", 1),
    # bbm-cola-2 T1 (15-oct-2026, owner por agencia-c0: «la paginación sale en español» en bbm en inglés): el paginador común de Lawang escribe
    # «← Anteriores», «Siguientes →» y «1–25 de 120» a mano, sin lwT, aunque las tres claves están en su diccionario. Se piden a lwT al pintarse
    # (en español lwT devuelve la misma clave: la vista española no cambia). Indonesio de las tres, en MENU_I18N.
    ('contracts/assets/paginacion.js', """'<button type="button" class="sui-chip" data-pag="antes">← Anteriores</button>' +""",
     """'<button type="button" class="sui-chip" data-pag="antes">' + (typeof lwT === 'function' ? lwT('← Anteriores') : '← Anteriores') + '</button>' +""", 1),
    ('contracts/assets/paginacion.js', """'<button type="button" class="sui-chip" data-pag="despues">Siguientes →</button>';""",
     """'<button type="button" class="sui-chip" data-pag="despues">' + (typeof lwT === 'function' ? lwT('Siguientes →') : 'Siguientes →') + '</button>';""", 1),
    ('contracts/assets/paginacion.js', "(desde + 1) + '–' + (desde + trozo.length) + ' de ' + todas.length",
     "(desde + 1) + '–' + (desde + trozo.length) + ' ' + (typeof lwT === 'function' ? lwT('de') : 'de') + ' ' + todas.length", 1),
)
# Retoques de COMPORTAMIENTO (no de texto) del editor de documentos en toda instancia (bbm-comodidad, 15-oct-2026; revisor de 371396e: no van
# en TEXTOS_INSTANCIA, que solo cambia texto). Mismo formato y misma función (textos_instancia): cada trozo las veces dichas o el build para.
# Prueba: test_comodidad_instancia.py. Lawang no pasa por aquí.
COMODIDAD_INSTANCIA = (
    # bbm-comodidad F4 (15-oct-2026, medido en bbm real): con UNA sola empresa emisora, «Sociedad que factura/cobra» empezaba en «— elige —» en
    # cada factura y cada recibí (2 clics más, y los impuestos esperaban a elegirla). Con una sola se preselecciona; con dos o más, como siempre.
    # Los impuestos y la previa leen el valor vivo del select al montarse (montaImpuestosDoc.socActual), así que salen ya con esa empresa.
    ('intranet/v4/assets/editores.js', "valor: f0.sociedad || '', opciones: [['', '— elige —']].concat(opcionesSociedadDoc())",
     "valor: f0.sociedad || (Object.keys(SOCIEDADES).length === 1 ? Object.keys(SOCIEDADES)[0] : ''), opciones: [['', '— elige —']].concat(opcionesSociedadDoc())", 2),
    # bbm-comodidad F8: un recibí no vence; «Vencimiento (opcional)» solo se enseña en uno ya guardado que lo tenga (no se pierde el dato).
    ('intranet/v4/assets/editores.js', "          campoSimpleDoc(filaF, { k: 'fecha_vencimiento', label: 'Vencimiento (opcional)', tipo: 'date', valor: f0.fecha_vencimiento || '' });\n\n"
     "          var secEmisor = seccionPlegableDoc(host, 'Emisor', true, { resumen: resumenEmisorDoc });\n"
     "          campoSimpleDoc(secEmisor, { k: 'sociedad', label: 'Sociedad que cobra',",
     "          if (f0.fecha_vencimiento) campoSimpleDoc(filaF, { k: 'fecha_vencimiento', label: 'Vencimiento (opcional)', tipo: 'date', valor: f0.fecha_vencimiento });\n\n"
     "          var secEmisor = seccionPlegableDoc(host, 'Emisor', true, { resumen: resumenEmisorDoc });\n"
     "          campoSimpleDoc(secEmisor, { k: 'sociedad', label: 'Sociedad que cobra',", 1),
    # bbm-comodidad F10 (15-oct-2026, medido en bbm a 1440): el robot del Asistente (fijo abajo a la derecha, 88 px; 72 px en móvil) tapaba lo último
    # de cada página: «Nuevo modelo» en Flota, la columna Acciones en Facturas, «Configurar» en Ajustes. Se reserva su hueco al final de <main> para
    # que se pueda bajar más allá del robot. Solo en pantalla y solo donde se pinta el robot (la regla viaja en la hoja que inyecta mascota.js).
    ('intranet/v4/assets/mascota.js', "    '@media print{#lw-masc{display:none}}';",
     "    '@media screen{main{padding-bottom:132px!important}}@media screen and (max-width:767px){main{padding-bottom:104px!important}}' +\n"
     "    '@media print{#lw-masc{display:none}}';", 1),
    # bbm-comodidad F12: una barra de pestañas con UNA sola pestaña («General» en Ajustes de bbm) repite la entrada del menú y no lleva a ningún
    # sitio. Con una sola pestaña no se INSERTA; con dos o más, como siempre (Facturas · Recibos). Se toca solo la inserción y no el `return` de
    # arriba: el resto de cableaPestanas() (la versión «Mis comisiones» de /reparto/ para el closer, que tiene UNA pestaña) tiene que seguir corriendo
    # (revisor sobre e8e30cf, MEDIA).
    ('intranet/v4/assets/nav.js', '    if (cab && cab.parentNode) cab.parentNode.insertBefore(barra, cab.nextSibling);\n    else main.insertBefore(barra, main.firstChild);',
     '    if (mias.length < 2) { /* una sola pestaña: sin barra */ } else if (cab && cab.parentNode) cab.parentNode.insertBefore(barra, cab.nextSibling);\n'
     '    else main.insertBefore(barra, main.firstChild);', 1),
    # bbm-comodidad F12: Facturas tenía el botón «Recibos» en la cabecera Y la pestaña «Recibos» justo debajo (la barra del grupo Cobros). Quien
    # puede abrir Recibos tiene la pestaña; quien no, tampoco podía usar el botón. Se quita el botón.
    ('intranet/v4/facturas/index.html', '<a class="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-surface-container-lowest text-on-surface hover:bg-surface-container-high transition-colors shadow-sm font-label-md text-label-md" href="/intranet/v4/recibos/">\n'
     '<span class="material-symbols-outlined text-[18px] text-stone-sand">payments</span>\n<span class="" data-lwt>Recibos</span>\n</a>\n', '', 1),
)
# Gastos sin «Proyecto» con el módulo proyectos apagado y su CSV por T (bbm-cola-2 T1, 15-oct-2026). Mismo formato y misma función que
# COMODIDAD_INSTANCIA (textos_instancia); tupla aparte porque es de otro encargo (bbm-idiomas). Lawang no pasa por aquí.
GASTOS_INSTANCIA = (
    # bbm-cola-2 T1 (15-oct-2026, owner por agencia-c0: Gastos «lleva textos de Lawang» en un negocio de alquiler de motos). Con el módulo
    # proyectos APAGADO (dato de la base: axwModuloActivo devuelve false solo entonces; sin saber, todo como siempre):
    #   · el formulario no ofrece «Proyecto» (un gasto ya guardado CON proyecto lo sigue enseñando: no se pierde el dato); sin el campo,
    #     el envío manda proyecto_id null, igual que elegir «General (sin proyecto)»;
    #   · la columna de la lista se queda (cabecera en el HTML y celda en el JS: ocultar solo una descuadraría la tabla);
    #   · la ficha no enseña «Proyecto: General (sin proyecto)».
    # Y la cabecera del CSV pasa por T (en Lawang era español fijo en toda lengua; en español no cambia).
    ('intranet/v4/assets/panel-gastos.js', "  function camposGasto(g) {\n    g = g || {};\n    var socs = sociedades();\n    return [\n",
     "  function camposGasto(g) {\n    g = g || {};\n    var socs = sociedades();\n"
     "    var sinProy = !g.proyecto_id && typeof window.axwModuloActivo === 'function' && window.axwModuloActivo('proyectos') === false;\n    return [\n", 1),
    ('intranet/v4/assets/panel-gastos.js', "      { k: 'notas', label: T('Notas'), tipo: 'textarea', valor: g.notas || '' }\n    ];\n",
     "      { k: 'notas', label: T('Notas'), tipo: 'textarea', valor: g.notas || '' }\n    ].filter(function (c) { return !(sinProy && c.k === 'proyecto_id'); });\n", 1),
    ('intranet/v4/assets/panel-gastos.js', "H.dato(T('Proyecto'), proy) +",
     "(!g.proyecto_id && typeof window.axwModuloActivo === 'function' && window.axwModuloActivo('proyectos') === false ? '' : H.dato(T('Proyecto'), proy)) +", 1),
    ('intranet/v4/assets/panel-gastos.js', "    var filas = [['Fecha', 'Sociedad', 'Proyecto', 'Proveedor', 'Categoría', 'Concepto', 'Nº factura', 'Base', 'Impuesto', 'Total', 'Retención PPh', 'Tipo PPh', 'Retención ingresada', 'Moneda', 'Estado', 'Vence', 'Pagado el', 'Cuenta de pago', 'Motivo anulación']]\n",
     "    var filas = [['Fecha', 'Sociedad', 'Proyecto', 'Proveedor', 'Categoría', 'Concepto', 'Nº factura', 'Base', 'Impuesto', 'Total', 'Retención PPh', 'Tipo PPh', 'Retención ingresada', 'Moneda', 'Estado', 'Vence', 'Pagado el', 'Cuenta de pago', 'Motivo anulación'].map(T)]\n", 1),
    ('intranet/v4/assets/panel-gastos.js', "proyPorId[g.proyecto_id].nombre : 'General',", "proyPorId[g.proyecto_id].nombre : T('General'),", 1),
    # agencia-c0, 15-oct-2026 (bbm vivo: «Categoría» salía en «— elige —» sin ninguna y el aviso decía «Pídelo a administración»): sin ninguna
    # categoría activa, «Nuevo gasto» pide ANTES la primera, aquí mismo y en un solo campo (el nombre; grupo «general», que el paso del asistente
    # deja elegir), con la misma función de la base que ese paso (gasto_categoria_guarda: la clave la saca la base del nombre y ella decide quién
    # puede). Creada, se releen los datos y se abre el gasto con ella ya elegida, sin recargar la página. Prueba: test_gastos_primera_categoria.py.
    ('intranet/v4/assets/panel-gastos.js', "  function nuevoGasto() {\n    var campos = camposGasto().concat([\n",
     "  function axwPrimeraCategoria() {\n"
     "    window.lwVentana(T('Primero, una categoría'), [\n"
     "      { tipo: 'nota', label: T('Cada gasto va en una categoría y aún no hay ninguna. Crea la primera: después podrás añadir más.') },\n"
     "      { k: 'nombre', label: T('Nombre de la categoría'), req: true, valor: '' }\n"
     "    ], T('Crear y seguir'), function (v) {\n"
     "      var n = String(v.nombre || '').trim();\n"
     "      if (!n || n.length > 80 || /^[-=+@]/.test(n)) return { error: { message: T('El nombre va de 1 a 80 caracteres y no empieza por = + - @.') } };\n"
     "      return sb.rpc('gasto_categoria_guarda', { p_clave: null, p_datos: { nombre: n, grupo: 'general' } }).then(function (r) {\n"
     "        if (r.error) return rpcOk(r, T('No se pudo crear la categoría'));\n"
     "        return cargar().then(function () {\n"
     "          pintaTodo();\n"
     "          var c = D.categorias.filter(function (x) { return x.activa && x.nombre === n; })[0];\n"
     "          nuevoGasto(c ? c.clave : null);   // abre el gasto: el editor ya no es este y no se recarga (sinRecarga)\n"
     "          return null;\n"
     "        });\n"
     "      });\n"
     "    }, { sub: T('Gastos y proveedores'), sinRecarga: true });\n"
     "  }\n"
     "  function nuevoGasto(axwCat) {\n"
     "    if (!D.categorias.some(function (c) { return c.activa; })) { axwPrimeraCategoria(); return; }\n"
     "    var campos = camposGasto(axwCat ? { categoria: axwCat } : null).concat([\n", 1),
    ('intranet/v4/assets/panel-gastos.js',
     "T('No hay categorías de gasto dadas de alta: sin ellas no se puede registrar un gasto. Pídelo a administración.')",
     "T('Aún no hay categorías de gasto: la primera se crea al pulsar «Nuevo gasto».')", 1),
)
# Solo en las instancias de alquileres (portada «reservas»): el ejemplo del campo y la pestaña «Reservas» de Ajustes, que en ellas solo lleva los impuestos
TEXTOS_ALQUILER = (
    ('intranet/v4/assets/editores.js', "placeholder: 'Ej. Proyecto — Villa 2BR S2'", "placeholder: 'Ej. Reserva R-0012 — Honda PCX'", 2),
    ('intranet/v4/ajustes/index.html', 'data-lw-tab="reservas" data-lwt>Reservas<', 'data-lw-tab="reservas" data-lwt>Impuestos<', 1),
    # bbm-p39 (13-oct, barrido en bbm real): Recibos hablaba de titular, contrato y proyecto; Mantenimiento de contratos para firmar y del portal de compradores
    ('intranet/v4/recibos/index.html', '<th class="py-3.5 px-4 font-semibold" data-lwt>Titular / Pagador</th>', '<th class="py-3.5 px-4 font-semibold" data-lwt>Cliente</th>', 1),
    ('intranet/v4/recibos/index.html', 'placeholder="Buscar por número, cliente, contrato o proyecto…"', 'placeholder="Número, cliente, factura o referencia…"', 1),
    ('intranet/v4/ajustes/index.html', 'data-lwt>En pausa no sale ningún email: ni contratos para firmar, ni invitaciones, ni avisos, ni comunicados. Lo bloquea el servidor, no esta pantalla. Lo que se encola en Comunicación espera y sale solo al reanudar. Pausar y reanudar: cualquier admin.</p>', 'data-lwt>En pausa no sale ningún email: ni invitaciones, ni avisos, ni comunicados. Lo bloquea el servidor, no esta pantalla. Lo que se encola en Comunicación espera y sale solo al reanudar. Pausar y reanudar: cualquier admin.</p>', 1),
    ('intranet/v4/ajustes/index.html', 'data-lwt>Cerrada, solo entran los admins: el resto del equipo ve una pantalla de mantenimiento con el motivo, y quien esté dentro recibe un aviso y se le cierra a los 3 minutos. Es una puerta de pantalla: no cambia los permisos de la base de datos. El portal de compradores sigue abierto. Cerrar y reabrir: cualquier admin.</p>', 'data-lwt>Cerrada, solo entran los admins: el resto del equipo ve una pantalla de mantenimiento con el motivo, y quien esté dentro recibe un aviso y se le cierra a los 3 minutos. Es una puerta de pantalla: no cambia los permisos de la base de datos. Cerrar y reabrir: cualquier admin.</p>', 1),
)
TEXTOS_OTRA = (   # el resto de instancias: un ejemplo neutro, sin la villa de Lawang
    ('intranet/v4/assets/editores.js', "placeholder: 'Ej. Proyecto — Villa 2BR S2'", "placeholder: 'Ej. Reserva R-0012'", 2),
)
# Lo que no tiene sentido con un módulo apagado se oculta POR EL MÓDULO, nunca por el nombre del cliente (bbm-p39, 13-oct-2026). build.py marca el
# trozo de la COPIA con `data-axw-sin="<módulos>"` y pone en esa página su regla; apagados_instancia.js pone `axw-sin-<módulo>` en <html> por cada
# módulo apagado, solo cuando la base ya ha contestado (sin saber, o si falló, no se esconde nada: falla abierto, como axwModuloActivo). Se oculta
# cuando están apagados TODOS los módulos del marcador. Medido en bbm (contratos y operaciones apagados): la columna «Contrato» de Facturas pintaba
# «Venta suelta» en todas las filas, la de Recibos «—» siempre, y la vista «Por operación» lo metía todo en un solo cajón. Las celdas salen de la
# fila plantilla del HTML, que plantillaFilas() de datos.js clona con sus atributos: no cambia ningún índice de columna de datos.js. Lawang no pasa por aquí.
OCULTA_POR_MODULO = (
    # (fichero en DIST, trozo de Lawang, el mismo trozo marcado)
    # bbm-p40 (13-oct): la columna «Proyectos» de Usuarios (cuántos proyectos tiene cada persona) sin el módulo proyectos
    ('intranet/v4/usuarios/index.html', '<th class="py-3 px-3" data-lwt>Proyectos</th>',
     '<th class="py-3 px-3" data-axw-sin="proyectos" data-lwt>Proyectos</th>'),
    ('intranet/v4/usuarios/index.html', '<td class="py-3.5 px-3 text-on-surface-variant">—</td>\n<td class="py-3.5 px-3"><span class="inline-flex items-center gap-1.5',
     '<td class="py-3.5 px-3 text-on-surface-variant" data-axw-sin="proyectos">—</td>\n<td class="py-3.5 px-3"><span class="inline-flex items-center gap-1.5'),
    ('intranet/v4/facturas/index.html', '<th class="py-3.5 px-4 font-semibold" data-lwt>Contrato</th>',
     '<th class="py-3.5 px-4 font-semibold" data-axw-sin="contratos operaciones" data-lwt>Contrato</th>'),
    ('intranet/v4/facturas/index.html', '<td class="py-4 px-4 font-medium text-on-surface">—</td>\n<td class="py-4 px-4 font-label-md text-on-surface">—</td>',
     '<td class="py-4 px-4 font-medium text-on-surface">—</td>\n<td class="py-4 px-4 font-label-md text-on-surface" data-axw-sin="contratos operaciones">—</td>'),
    ('intranet/v4/facturas/index.html', '<div class="flex flex-wrap items-center gap-2" data-lw-vista>',
     '<div class="flex flex-wrap items-center gap-2" data-lw-vista data-axw-sin="contratos operaciones">'),
    ('intranet/v4/recibos/index.html', '<th class="py-3.5 px-4 font-semibold" data-lwt>Contrato</th>',
     '<th class="py-3.5 px-4 font-semibold" data-axw-sin="contratos" data-lwt>Contrato</th>'),
    ('intranet/v4/recibos/index.html', '<td class="py-4 px-5 font-label-md font-semibold text-deep-lagoon tracking-wide">—</td>\n<td class="py-4 px-4 font-label-md text-on-surface">—</td>',
     '<td class="py-4 px-5 font-label-md font-semibold text-deep-lagoon tracking-wide">—</td>\n<td class="py-4 px-4 font-label-md text-on-surface" data-axw-sin="contratos">—</td>'),
    # bbm-comodidad F7 (15-oct-2026, medido en el HTML servido de bbm): Gastos hablaba de comisiones de closers, compra de suelo, cuentas de
    # escrow y filtraba por Proyecto en un negocio de alquiler de motos. Fuera sin comisiones / sin proyectos; con ellos, igual que en Lawang.
    ('intranet/v4/gastos/index.html', '<li data-lwt>Las comisiones de los closers no se apuntan aquí: salen solas de Comisiones y ya cuentan en Finanzas.</li>',
     '<li data-axw-sin="comisiones" data-lwt>Las comisiones de los closers no se apuntan aquí: salen solas de Comisiones y ya cuentan en Finanzas.</li>'),
    ('intranet/v4/gastos/index.html', '<li data-lwt>La compra de suelo es inversión, no gasto de explotación: Finanzas la enseña aparte. Nunca se paga un gasto desde una cuenta de escrow.</li>',
     '<li data-axw-sin="proyectos" data-lwt>La compra de suelo es inversión, no gasto de explotación: Finanzas la enseña aparte. Nunca se paga un gasto desde una cuenta de escrow.</li>'),
    ('intranet/v4/gastos/index.html', '<select id="lw-gas-f-proyecto" class="',
     '<select id="lw-gas-f-proyecto" data-axw-sin="proyectos" class="'),
)
# El editor de factura de una instancia SIN el módulo contratos y cuya empresa permite facturar sin contrato nace en el modo «sin contrato» que ya
# existe (el cliente se elige en el editor) y no enseña el selector de contrato, que solo podía ofrecer «— sin contrato —». Mismo camino que pulsar
# esa opción: lo que se envía no cambia. Un documento ya guardado con contrato se reabre como siempre. Toda instancia; Lawang no pasa por aquí.
EDITOR_SIN_CONTRATO = (
    ('intranet/v4/assets/editores.js', "          sinContrato: !!(regla.sinContrato && origen && !origen.contrato_id)\n",
     "          sinContrato: !!(regla.sinContrato && (origen ? !origen.contrato_id\n"
     "            : (!pre.contrato_id && typeof window.axwModuloActivo === 'function' && window.axwModuloActivo('contratos') === false)))\n"),
    ('intranet/v4/assets/editores.js', "          secDoc.appendChild(lblC); secDoc.appendChild(btnC); secDoc.appendChild(notaC);\n",
     "          if (!(estadoContrato.sinContrato && typeof window.axwModuloActivo === 'function' && window.axwModuloActivo('contratos') === false)) {\n"
     "            secDoc.appendChild(lblC); secDoc.appendChild(btnC); secDoc.appendChild(notaC);\n          }\n"),
    # Ancla (revisor, BAJA 2): el modo «sin contrato» por defecto deja el estado que pasaASinContrato() de Lawang pone a mano; si Lawang
    # cambia esa función, el build PARA aquí y se revisa si el arranque de arriba tiene que hacer lo mismo. No cambia nada (viejo == nuevo).
    ('intranet/v4/assets/editores.js', "          function pasaASinContrato() {\n            // Lo que trajo el contrato anterior se suelta y se vacía: el cliente se elige de nuevo.\n            estadoContrato.id = null; estadoContrato.numero = ''; estadoContrato.clienteId = null; estadoContrato.sinContrato = true;\n            sueltaCamposDoc();\n            ['cliente_nombre', 'cliente_documento', 'cliente_email', 'cliente_domicilio', 'proyecto_nombre'].forEach(function (k) { ponCampoDoc(k, ''); });\n            if (delC) delC.limpia();\n            btnC.textContent = edT('— sin contrato —'); btnCli.textContent = edT('— elige el cliente —');\n            notaC.textContent = edT('El documento irá a nombre del cliente que elijas, sin contrato.');\n            pintaModoContrato(); repintaPreview();\n          }\n",
     "          function pasaASinContrato() {\n            // Lo que trajo el contrato anterior se suelta y se vacía: el cliente se elige de nuevo.\n            estadoContrato.id = null; estadoContrato.numero = ''; estadoContrato.clienteId = null; estadoContrato.sinContrato = true;\n            sueltaCamposDoc();\n            ['cliente_nombre', 'cliente_documento', 'cliente_email', 'cliente_domicilio', 'proyecto_nombre'].forEach(function (k) { ponCampoDoc(k, ''); });\n            if (delC) delC.limpia();\n            btnC.textContent = edT('— sin contrato —'); btnCli.textContent = edT('— elige el cliente —');\n            notaC.textContent = edT('El documento irá a nombre del cliente que elijas, sin contrato.');\n            pintaModoContrato(); repintaPreview();\n          }\n"),
)

# «Enviar por email» de factura y recibí en una instancia SIN el módulo contratos (bbm-correo, 15-oct-2026). El botón llama a la edge
# send-contract-email (pinta el PDF en el servidor), que es del módulo contratos: con él apagado no existe (404) y `publica_instancia --simula`
# paraba en rojo (contrato_front: la contaba alcanzable por `usada_por` facturas/recibos de erp/modulos.py, que se retira en el mismo cambio).
# Con contratos apagado (dato de la base: axwModuloActivo devuelve false solo entonces) el botón de la barra se oculta —también cuando la base
# contesta después de montarla—, la ficha no lo ofrece y enviaDocMail no sale a la red; con contratos encendido, o sin saber, lo de siempre
# (y en esa ventana apagados_instancia.js corta la llamada con 404 sin salir a la red). Para que bbm envíe facturas por correo hace falta la
# edge en la instancia con su render (para después). Lawang no pasa por aquí. Lo fija test_oculta_por_modulo.py (casos en Node).
CORREO_DOC_SIN_CONTRATOS = (
    ('intranet/v4/assets/editores.js', "  function enviaDocMail(sb, vals, saved, alEnviado) {\n",
     "  function enviaDocMail(sb, vals, saved, alEnviado) {\n"
     "    if (typeof window.axwModuloActivo === 'function' && window.axwModuloActivo('contratos') === false) { toastMal(edT('No se pudo enviar')); return; }\n"),
    ('intranet/v4/assets/editores.js',
     "    var bMail = btn('Enviar por email', function () { enviaDocMail(ctx.sb, ctx.getVals(), ctx.saved, ctx.alEnviado); });\n",
     "    var bMail = btn('Enviar por email', function () { enviaDocMail(ctx.sb, ctx.getVals(), ctx.saved, ctx.alEnviado); });\n"
     "    var ocultaMail = function () { if (typeof window.axwModuloActivo === 'function' && window.axwModuloActivo('contratos') === false) bMail.style.display = 'none'; };\n"
     "    ocultaMail();\n"
     "    if (window.AXW_MODULOS_LISTOS && window.AXW_MODULOS_LISTOS.then) window.AXW_MODULOS_LISTOS.then(ocultaMail);\n"),
    ('intranet/v4/assets/datos.js',
     "    if (!f0.anulada) acciones.push({ texto: 'Enviar por email', onClick: V4acc('enviarDocumento', f0.id) });\n",
     "    if (!f0.anulada && contratosActivo()) acciones.push({ texto: 'Enviar por email', onClick: V4acc('enviarDocumento', f0.id) });\n"),
)

# Alta de usuario en una instancia SIN el módulo contratos (bbm-p40, 13-oct-2026). El botón «Nuevo usuario» leía primero el catálogo de tipos
# de contrato (plantillas_contrato_datos, del módulo contratos) y, si no lo podía leer, NO abría el alta: con contratos apagado no se leía
# nunca, así que en bbm no se podía dar de alta a nadie. Ahora espera a saber los módulos y, con contratos apagado (dato de la base, no un
# «no sé»: axwModuloActivo devuelve false solo entonces), abre el alta sin el campo «Contratos que puede hacer» y sin la nota de proyectos
# si proyectos también está apagado. Lo que se envía es lo de siempre con ese campo vacío: la edge lo filtra y desde el 24-sep un vacío ya no
# significa «todos» (admin-usuarios, contratos_tipo_permitido). Con contratos encendido, o sin saber, el camino de siempre. Lawang no pasa por aquí.
ALTA_SIN_CONTRATOS = (
    # Ancla SOLO en la rama del ERP (desde su comentario «ERP: si el catálogo…»): la línea de antes es la rama de Lawang, que Lawang retoca
    # cuando quiere (13-oct, d17d5df2a «Contratos propios» la convirtió en un bloque y dejó rojo el build de todas las instancias).
    ('intranet/v4/assets/editores.js',
     "        /* ERP: si el catálogo no se lee, el alta NO se abre. «Contratos que puede hacer» vacío significa TODOS:\n"
     "           un formulario sin opciones daría acceso a todo sin que nadie lo decidiera. */\n"
     "        tiposErp().then(function (t) {\n"
     "          if (!t) return aviso('No se ha podido leer el catálogo de tipos de contrato, o no tiene ninguno activo: recarga la pantalla (o activa un tipo en Plantillas) antes de dar de alta a nadie.', '#9E2F26');\n"
     "          abreAlta(opcionesTipos(t));\n"
     "        });\n",
     "        /* ERP: si el catálogo no se lee, el alta NO se abre. «Contratos que puede hacer» vacío significa TODOS:\n"
     "           un formulario sin opciones daría acceso a todo sin que nadie lo decidiera. */\n"
     "        Promise.resolve(window.AXW_MODULOS_LISTOS).then(function () {\n"
     "          // Solo las herramientas de módulos encendidos (PERMISOS_POR_MODULO): las listas del alta se rehacen ya sabiendo los módulos.\n"
     "          herrCrmAlta = herrCrmAlta.filter(function (p) { return window.axwPermisoActivo(p[0]); });\n"
     "          herrRestoAlta = permisosPorMenu(function (k) { return puedoDarAlta(k) && !esCrmAlta([k]) && window.axwPermisoActivo(k); });\n"
     "          // Instancia con el módulo contratos APAGADO (bbm-p40): no hay catálogo que leer ni contratos que conceder.\n"
     "          if (typeof window.axwModuloActivo === 'function' && window.axwModuloActivo('contratos') === false) return abreAlta(null);\n"
     "          tiposErp().then(function (t) {\n"
     "            if (!t) return aviso('No se ha podido leer el catálogo de tipos de contrato, o no tiene ninguno activo: recarga la pantalla (o activa un tipo en Plantillas) antes de dar de alta a nadie.', '#9E2F26');\n"
     "            abreAlta(opcionesTipos(t));\n"
     "          });\n"
     "        });\n"),
    ('intranet/v4/assets/editores.js',
     "          { k: 'tipos_contrato', label: 'Contratos que puede hacer', tipo: 'multicheck', opciones: tiposCatAlta,\n",
     "          tiposCatAlta === null ? null : { k: 'tipos_contrato', label: 'Contratos que puede hacer', tipo: 'multicheck', opciones: tiposCatAlta,\n"),
    ('intranet/v4/assets/editores.js',
     "        ], 'Crear usuario', function (v) {\n",
     "        ].filter(Boolean), 'Crear usuario', function (v) {\n"),
    ('intranet/v4/assets/editores.js',
     "          { tipo: 'nota', label: 'Se crea la cuenta y se le da acceso de inmediato. Nace sin ningún proyecto asignado — se asigna después editando la ficha ya creada.' },\n",
     "          { tipo: 'nota', label: (typeof window.axwModuloActivo === 'function' && window.axwModuloActivo('proyectos') === false)\n"
     "            ? 'Se crea la cuenta y se le da acceso de inmediato.'\n"
     "            : 'Se crea la cuenta y se le da acceso de inmediato. Nace sin ningún proyecto asignado — se asigna después editando la ficha ya creada.' },\n"),
)

# Usuarios de una instancia: solo las herramientas de módulos ENCENDIDOS (bbm-p40, 13-oct-2026; owner tras rellenar el asistente de bbm: «la
# ventana de permisos es la que teníamos en Lawang… aparecen todos los módulos. Deberían aparecer sólo los activos»). Por el camino de la casa:
# cada casilla sale de su entrada del menú v4 (LW_MENU_V4) → su pantalla → su módulo (mapa de apagados_instancia.js, axwRutaActiva), nunca de
# una lista escrita a mano ni del nombre del cliente. Aplica al alta, al editor de permisos y a la ficha. Reglas:
#   · lo que la persona YA tiene de un módulo apagado no se enseña pero VIAJA al guardar (usuario_guarda_permisos sustituye la lista entera:
#     si no, guardar se lo quitaría en silencio y al volver a encender el módulo la persona habría perdido el acceso);
#   · «Proyectos en los que trabaja» y «Contratos que puede hacer» no se pintan con su módulo apagado y NO viajan (la base conserva lo que
#     hay; mandar [] borraría proyectos y un vacío en tipos de contrato bloquea al agente);
#   · falla abierto: sin saber los módulos (la base no contestó), todo como en Lawang. No es el candado: lo que se concede lo decide el servidor.
# Lawang no pasa por aquí (0 bytes): estos trozos solo se cambian en la COPIA de la instancia.
PERMISOS_POR_MODULO = (
    # la función que dice si una casilla es de un módulo encendido (la usan el alta, el editor y la ficha de datos.js)
    ('intranet/v4/assets/editores.js',
     "  window.lwEtiquetaPermiso = function (k) {\n    var o = permisosPorMenu(function (x) { return x === k; }).filter(Array.isArray)[0];\n    return o ? o[1] : k;\n  };\n",
     "  window.lwEtiquetaPermiso = function (k) {\n    var o = permisosPorMenu(function (x) { return x === k; }).filter(Array.isArray)[0];\n    return o ? o[1] : k;\n  };\n"
     "  /* Instancia (bbm-p40): ¿la casilla `k` es de un módulo encendido? Por la pantalla de su entrada en LW_MENU_V4 (el mismo recorrido que\n"
     "     permisosPorMenu) y axwRutaActiva de apagados_instancia.js. Una casilla sin entrada en el menú, o sin saber los módulos: true. */\n"
     "  var rutaDePermiso = null;\n"
     "  window.axwPermisoActivo = function (k) {\n"
     "    if (typeof window.axwRutaActiva !== 'function') return true;\n"
     "    if (!rutaDePermiso) {\n"
     "      if (!(window.LW_MENU_V4 || []).length) return true;\n"
     "      rutaDePermiso = {};\n"
     "      var pon = function (c, ruta) { if (c && !Object.prototype.hasOwnProperty.call(rutaDePermiso, c)) rutaDePermiso[c] = ruta; };\n"
     "      window.LW_MENU_V4.forEach(function (sec) {\n"
     "        sec.entradas.forEach(function (e) {\n"
     "          if (e.pestanas) e.pestanas.forEach(function (t) { pon(t.clave, t.path); });\n"
     "          else if (e.claves) e.claves.forEach(function (c) { pon(c.clave, e.path); });\n"
     "          else if (e.clave) pon(e.clave, e.path);\n"
     "          (e.extra || []).forEach(function (c) { pon(c.clave, e.path); });\n"
     "        });\n"
     "      });\n"
     "    }\n"
     "    return !Object.prototype.hasOwnProperty.call(rutaDePermiso, k) || window.axwRutaActiva(rutaDePermiso[k]);\n"
     "  };\n"),
    # las filas sin casilla (Resumen, Bot de WhatsApp: «según rol») de un módulo apagado tampoco se pintan
    ('intranet/v4/assets/editores.js',
     "        else if (e.path !== 'home') filas.push({ info: nom, nota: T(e.rol === 'super_admin' ? 'solo super admin' : 'según rol') });\n",
     "        else if (e.path !== 'home' && (typeof window.axwRutaActiva !== 'function' || window.axwRutaActiva(e.path))) filas.push({ info: nom, nota: T(e.rol === 'super_admin' ? 'solo super admin' : 'según rol') });\n"),
    # alta: el CRM de leads solo si queda alguna casilla
    ('intranet/v4/assets/editores.js',
     "          { k: 'herr_crm', label: 'CRM de leads', tipo: 'multicheck', opciones: herrCrmAlta, valor: [],\n",
     "          !herrCrmAlta.length ? null : { k: 'herr_crm', label: 'CRM de leads', tipo: 'multicheck', opciones: herrCrmAlta, valor: [],\n"),
    # editor: espera a saber los módulos antes de montar las casillas (un clic rápido al cargar no enseña la lista entera)
    ('intranet/v4/assets/editores.js',
     "          (typeof LW_PERMISOS !== 'undefined') ? Promise.resolve({ data: null }) : sb.from('usuarios').select('herramientas'),\n",
     "          (typeof LW_PERMISOS !== 'undefined') ? Promise.resolve(window.AXW_MODULOS_LISTOS).then(function () { return { data: null }; }) : sb.from('usuarios').select('herramientas'),\n"),
    ('intranet/v4/assets/editores.js',
     "          window.AXW_NUCLEO_OPERACION ? tiposErp() : Promise.resolve(undefined),\n",
     "          window.AXW_NUCLEO_OPERACION ? Promise.resolve(window.AXW_MODULOS_LISTOS).then(function () {\n"
     "            return (typeof window.axwModuloActivo === 'function' && window.axwModuloActivo('contratos') === false) ? undefined : tiposErp();\n"
     "          }) : Promise.resolve(undefined),\n"),
    ('intranet/v4/assets/editores.js',
     "            ops = permisosPorMenu();\n",
     "            ops = permisosPorMenu(window.axwPermisoActivo);\n"),
    ('intranet/v4/assets/editores.js',
     "          var proyectosOk = !rs[1].error;\n",
     "          var proyectosModulo = !(typeof window.axwModuloActivo === 'function' && window.axwModuloActivo('proyectos') === false);\n"
     "          var proyectosOk = proyectosModulo && !rs[1].error;\n"),
    ('intranet/v4/assets/editores.js',
     "          } else {\n            campos.push({ tipo: 'nota', label: 'No se pudo cargar el catálogo de proyectos",
     "          } else if (proyectosModulo) {\n            campos.push({ tipo: 'nota', label: 'No se pudo cargar el catálogo de proyectos"),
    ('intranet/v4/assets/editores.js',
     "          if (!tiposOk) campos.push({ tipo: 'nota', label: 'No se pudo leer el catálogo de tipos de contrato",
     "          if (typeof window.axwModuloActivo === 'function' && window.axwModuloActivo('contratos') === false) tiposOk = false;   // ni se pinta ni viaja\n"
     "          else if (!tiposOk) campos.push({ tipo: 'nota', label: 'No se pudo leer el catálogo de tipos de contrato"),
    # sin herramientas.js el editor ofrece las llaves que ya tiene alguien: también solo las de módulos encendidos
    ('intranet/v4/assets/editores.js',
     "            ops = Object.keys(todas).sort();\n",
     "            ops = Object.keys(todas).sort().filter(function (k) { return window.axwPermisoActivo(k); });\n"),
    # al guardar, lo que la persona ya tiene de módulos apagados viaja tal cual (no se enseña, no se quita) y EN EL ORDEN
    # GUARDADO: usuarios_bloquea_cambio_rol_herramientas compara la lista con `is distinct from` (cuenta el orden), y un
    # admin que no es super admin solo pasa si la lista sale idéntica. Primero lo guardado que sigue (apagado o marcado),
    # luego lo marcado nuevo en el orden del menú.
    ('intranet/v4/assets/editores.js',
     "              nombre: v.nombre.trim() || null, herramientas: v.herramientas,\n",
     "              nombre: v.nombre.trim() || null,\n"
     "              herramientas: (u.herramientas || []).filter(function (k) { return !window.axwPermisoActivo(k) || v.herramientas.indexOf(k) !== -1; })\n"
     "                .concat(v.herramientas.filter(function (k) { return (u.herramientas || []).indexOf(k) === -1; })),\n"),
    # la ficha que se reabre sola por ?u= (tras «Guardar permisos») espera a saber los módulos: sin esto, como falla abierto,
    # enseñaba un instante lo apagado
    ('intranet/v4/assets/datos.js',
     "        if (el) setTimeout(function () { abreFicha(el); }, 0);\n",
     "        if (el) Promise.resolve(esperaModulos()).then(function () { abreFicha(el); });\n"),
    # ficha (datos.js): herramientas, proyectos y contratos por la misma regla
    ('intranet/v4/assets/datos.js',
     "          var hs = u.herramientas || [], pr = nombresProy(u.proyectos), sup = nombresProy(u.proyectos_supervisados);\n",
     "          var hs = (u.herramientas || []).filter(function (k) { return !window.axwPermisoActivo || window.axwPermisoActivo(k); }), pr = nombresProy(u.proyectos), sup = nombresProy(u.proyectos_supervisados);\n"
     "          var modOn = function (m) { return !(typeof window.axwModuloActivo === 'function' && window.axwModuloActivo(m) === false); };   // bbm-p40\n"),
    ('intranet/v4/assets/datos.js',
     "            H.seccion(tx('Proyectos en los que trabaja (%n)', { n: pr.length }),\n",
     "            (modOn('proyectos') ? H.seccion(tx('Proyectos en los que trabaja (%n)', { n: pr.length }),\n"),
    ('intranet/v4/assets/datos.js',
     "              sup.length ? H.chips(sup) : H.nota('Ninguno. Es una lista distinta de la de arriba: supervisar es ver y escribir lo del proyecto entero, no solo lo propio.')) +\n"
     "            H.seccion('Contratos que puede hacer',\n"
     "              tipos.length ? H.chips(tipos) : H.nota('Sin restricción: vacío = TODOS los tipos (al revés que Proyectos).'));\n",
     "              sup.length ? H.chips(sup) : H.nota('Ninguno. Es una lista distinta de la de arriba: supervisar es ver y escribir lo del proyecto entero, no solo lo propio.')) : '') +\n"
     "            (modOn('contratos') ? H.seccion('Contratos que puede hacer',\n"
     "              tipos.length ? H.chips(tipos) : H.nota('Sin restricción: vacío = TODOS los tipos (al revés que Proyectos).')) : '');\n"),
)

# Accesos que solo existen con su módulo encendido en ESTA instancia (no marcado: comportamiento; OCULTA_POR_MODULO solo añade
# data-axw-sin al marcado y test_oculta_por_modulo lo exige). Mismo formato y la misma oculta_por_modulo().
ACCESOS_POR_MODULO = (
    # Owner 15-oct-2026 (bbm): «Si no está el módulo del asistente, ¿por qué aparece ahí?». nav.js cargaba el robot del Asistente (mascota.js)
    # mirando solo el ROL; ahora también el módulo `asistente` de ESTA instancia, el que da su base (modulos_activos_datos, apagados_instancia.js).
    # Se espera a saberlo (axwModuloActivo falla abierto mientras carga) y, si no se pudo comprobar, no sale: es un acceso, no un dato.
    # Prueba: test_comodidad_instancia.py (con la forma vieja el robot sale con el módulo apagado).
    ('intranet/v4/assets/nav.js',
     "        sm.src = ROOT + 'assets/mascota.js?v=' + MASCOTA_V;\n        document.head.appendChild(sm);\n",
     "        sm.src = ROOT + 'assets/mascota.js?v=' + MASCOTA_V;\n"
     "        (window.AXW_MODULOS_LISTOS || Promise.resolve(false)).then(function (sabido) {   // ERP: solo con el módulo asistente encendido\n"
     "          if (sabido && typeof window.axwModuloActivo === 'function' && window.axwModuloActivo('asistente')) document.head.appendChild(sm);\n"
     "        });\n"),
)


def oculta_por_modulo():
    """Marca en la copia lo que sobra con un módulo apagado (OCULTA_POR_MODULO) y pone en cada página su regla; y el editor de factura sin
    contrato (EDITOR_SIN_CONTRATO), el correo de factura sin contratos (CORREO_DOC_SIN_CONTRATOS), el alta de usuario sin contratos (ALTA_SIN_CONTRATOS) y Usuarios solo con las herramientas de módulos
    encendidos (PERMISOS_POR_MODULO). Cada trozo exactamente una vez o el build para."""
    reglas = {}
    for rel_, viejo, nuevo in OCULTA_POR_MODULO + EDITOR_SIN_CONTRATO + CORREO_DOC_SIN_CONTRATOS + ALTA_SIN_CONTRATOS + PERMISOS_POR_MODULO + ACCESOS_POR_MODULO:
        ruta = os.path.join(DIST, *rel_.split('/'))
        t = open(ruta, encoding='utf-8').read()
        open(ruta, 'w', encoding='utf-8', newline='').write(_una_vez(t, viejo, nuevo, 'oculta_por_modulo ' + rel_))
        for mods in re.findall(r'data-axw-sin="([a-z -]+)"', nuevo):
            reglas.setdefault(rel_, set()).add(mods)
    for rel_, marcas in sorted(reglas.items()):
        css = ''.join('html%s [data-axw-sin="%s"]{display:none!important}' % (''.join('.axw-sin-' + m for m in mods.split()), mods) for mods in sorted(marcas))
        ruta = os.path.join(DIST, *rel_.split('/'))
        t = open(ruta, encoding='utf-8').read()
        open(ruta, 'w', encoding='utf-8', newline='').write(_una_vez(t, '</head>', '<style id="axw-sin-modulo">%s</style>\n</head>' % css, 'oculta_por_modulo css ' + rel_))


def textos_instancia(nombre):
    """Los textos de inmobiliaria de las pantallas comunes, cambiados en la copia de la instancia (ver TEXTOS_INSTANCIA). Cada trozo tiene que
    aparecer EXACTAMENTE las veces dichas: si Lawang lo cambia, el build para en vez de dejar medio cambio."""
    for rel_, viejo, nuevo, veces in TEXTOS_INSTANCIA + COMODIDAD_INSTANCIA + GASTOS_INSTANCIA + (TEXTOS_ALQUILER if portada_de(nombre) == 'reservas' else TEXTOS_OTRA):
        ruta = os.path.join(DIST, *rel_.split('/'))
        t = open(ruta, encoding='utf-8').read()
        if t.count(viejo) != veces:
            aborta('textos_instancia: %s: esperaba %d vez/veces %r y hay %d (¿cambió el fichero de Lawang?)%s' % (rel_, veces, viejo[:70], t.count(viejo), quien_cambio_lawang(rel_)))
        open(ruta, 'w', encoding='utf-8', newline='').write(t.replace(viejo, nuevo))


# ── Idiomas de la interfaz por instancia (owner, 11-oct-2026: bbm «Añade Indonesio y quita español») ─────────────────────────────────────────
# Una instancia con `"idiomas": ["id", "en"]` en erp/instancias.json sale en indonesio (el primero, por defecto) e inglés, y el español deja de
# ofrecerse. Todo con reemplazos literales sobre la COPIA (DIST), nunca en Lawang; si Lawang cambia un trozo, el build para. Sin la clave, nada cambia.
# Plan y revisión previa (Calidad + Diseño): encargo estudio_erp_plan_unico F8; lo no traducido cae a INGLÉS y se cuenta (LW_T_CAIDA_EN), lo que
# quede en español se cuenta aparte (LW_T_ESPANOL) para que la prueba pueda ponerse roja.
IDIOMAS_CONOCIDOS = (('id', 'en'),)
# Palabras que en indonesio se escriben igual que en español (Diseño, 12-oct): las únicas traducciones que pueden ser iguales a su clave.
IGUALES_EN_ID = ('CRM', 'Intranet', 'Total', 'Km gratis', 'Panel', 'Bot',
                 # 13-oct (editores.js al indonesio): «Closer» y «Setter» son los nombres de los roles de venta, que el equipo usa tal
                 # cual en indonesio
                 'Closer', 'Setter',
                 'AaaS',   # AaaS: nombre del producto, igual en los tres idiomas (owner, 13-oct)
                 # 15-oct (panel V2 del AaaS, agente.html): «Radar» es el nombre del agente de precios (como Closer/Setter, un nombre,
                 # no una palabra que traducir); Facebook, Instagram y Google Business son marcas
                 'Radar', 'Facebook', 'Instagram', 'Google Business')
# Lo que hay que tocar en el front copiado: (fichero en DIST, trozo de Lawang, sustituto). Cada trozo tiene que aparecer EXACTAMENTE una vez.
IDIOMAS_PARCHES = (
    ('contracts/assets/idioma.js', "  window.LW_IDIOMA = (v === 'en') ? 'en' : 'es';",
     # bbm-p31 (12-oct): AXW_IDIOMAS_BUILD = lo que fija el build (respaldo). Lo que la base guardó (Ajustes › Idiomas, 220000) lo apunta
     # apagados_instancia.js en localStorage tras el login y GANA aquí, en <head>, antes de pintar nada; solo si este paquete sabe pintarlo.
     "  window.AXW_IDIOMAS_BUILD = __AXW_IDIOMAS__;\n"
     "  window.AXW_IDIOMAS = (function (b) { var g = null; try { g = JSON.parse(localStorage.getItem('axw_idiomas_erp') || 'null'); } catch (e) { g = null; }\n"
     "    var ok = Array.isArray(g) && [['es', 'en'], ['id', 'en']].some(function (p) { return p.join() === g.join(); }) && (g[0] !== 'id' || b.indexOf('id') >= 0);\n"
     "    return ok ? g : b.slice(); })(window.AXW_IDIOMAS_BUILD);\n"
     # bbm-p42 (13-oct, owner «debe ir en inglés»): el idioma de PANTALLA por defecto ya no es a la fuerza el primero de la lista (el primero manda el
     # orden del papel). Precedencia: lo que eligió esa persona > `idiomas.pantalla` de la base (dato de Ajustes › Idiomas, p36; lo apunta
     # apagados_instancia.js tras el login) > `idioma_pantalla` del registro (el de la instancia; manda también en la puerta sin sesión, donde la base no se lee) > el primero.
     "  window.AXW_IDIOMA_GUARDADO = v;\n"
     "  window.AXW_IDIOMA_PANTALLA_BUILD = __AXW_IDIOMA_PANTALLA__;\n"
     "  window.AXW_IDIOMA_PANTALLA = (function (l) { var g = null; try { g = localStorage.getItem('axw_idioma_pantalla_erp'); } catch (e) { g = null; }\n"
     "    if (g && l.indexOf(g) >= 0) return g; var b = window.AXW_IDIOMA_PANTALLA_BUILD; return b && l.indexOf(b) >= 0 ? b : l[0]; })(window.AXW_IDIOMAS);\n"
     "  window.LW_IDIOMA = (window.AXW_IDIOMAS.indexOf(v) >= 0) ? v : window.AXW_IDIOMA_PANTALLA;"),
    ('contracts/assets/idioma.js', "    window.LW_IDIOMA = (idioma === 'en') ? 'en' : 'es';",
     "    window.LW_IDIOMA = (window.AXW_IDIOMAS.indexOf(idioma) >= 0) ? idioma : window.AXW_IDIOMA_PANTALLA;"),
    # el par de botones de la barra lateral se encuentra por su TEXTO («ES»/«EN»): el «ES» pasa a ser «ID» y cada botón dice su idioma en su idioma
    ('intranet/v4/assets/nav.js', "      if (t !== 'ES' && t !== 'EN') return;\n      var destino = t.toLowerCase();",
     "      if (t === 'ES' && window.AXW_IDIOMAS) { t = window.AXW_IDIOMAS[0].toUpperCase(); b.textContent = t; }\n"
     "      if (t !== 'ES' && t !== 'EN' && t !== 'ID') return;\n      var destino = t.toLowerCase();\n"
     "      b.title = { id: 'Bahasa Indonesia', en: 'English', es: 'Español' }[destino] || t; b.setAttribute('aria-label', b.title);"),
    ('contracts/assets/topbar.js', "function tb(k) { return (TB_T[k] && TB_T[k][window.LW_IDIOMA])",
     "var TB_ID = { cuentaTitle: 'Akun dan notifikasi Anda', cerrarSesion: 'Keluar', notificaciones: 'Notifikasi', nadaNuevo: 'Belum ada yang baru.', cargando: 'Memuat…', rolSuperAdmin: 'Super admin',\n"
     "  rolAdmin: 'Admin', rolAgente: 'Agen', hace: '', minAgo: ' menit lalu', hAgo: ' jam lalu', ayer: 'kemarin', volverIntranet: '← Beranda' };\n"
     "function tb(k) { if (window.LW_IDIOMA === 'id') { if (Object.prototype.hasOwnProperty.call(TB_ID, k)) return TB_ID[k]; if (TB_T[k] && TB_T[k].en != null) return TB_T[k].en; }"
     " return (TB_T[k] && TB_T[k][window.LW_IDIOMA])"),
    ('contracts/assets/topbar.js', "  var otro = window.LW_IDIOMA === 'en' ? 'es' : 'en';",
     "  var otro = window.LW_IDIOMA === 'en' ? (window.AXW_IDIOMAS ? window.AXW_IDIOMAS[0] : 'es') : 'en';"),
    ('contracts/assets/topbar.js', "'<span>' + (otro === 'en' ? 'English' : 'Español') + '</span>';",
     "'<span>' + (otro === 'en' ? 'English' : otro === 'id' ? 'Bahasa Indonesia' : 'Español') + '</span>';"),
    ('contracts/assets/topbar.js', "  boton.title = otro === 'en' ? 'Switch interface to English' : 'Cambiar la interfaz a español';",
     "  boton.title = otro === 'en' ? 'Switch interface to English' : otro === 'id' ? 'Ganti bahasa ke Bahasa Indonesia' : 'Cambiar la interfaz a español';"),
    ('contracts/assets/version.js', "          boton: 'Reload' }\n  };",
     "          boton: 'Reload' }\n  };\n"
     "  TEXTOS.id = { msg: 'Ada versi baru halaman ini. Muat ulang untuk melanjutkan (Ctrl/Cmd+Shift+R).',\n"
     "               pierde: 'Simpan atau salin dulu pekerjaan yang belum selesai: yang belum tersimpan akan hilang saat dimuat ulang.', boton: 'Muat ulang' };"),
    ('contracts/assets/version.js', "    var idiomas = bilingue ? ['es', 'en'] : [idioma()];",
     "    var idiomas = bilingue ? (raiz.AXW_IDIOMAS || ['es', 'en']) : [idioma()];"),
    ('intranet/v4/assets/datos.js', "    var l = window.LW_IDIOMA === 'en' ? 'en' : 'es';\n    return o[l] || o.es || o.en || o.id || '';",
     "    var l = window.LW_IDIOMA || 'es';\n    return o[l] || (l === 'id' && o.en) || o.es || o.en || o.id || '';"),
    ('intranet/v4/assets/mascota.js', "(window.LW_IDIOMA === 'en' ? 'EN' : 'ES')", "String(window.LW_IDIOMA || 'es').toUpperCase()"),
    # la puerta: la pregunta del pie no llevaba marca de idioma (lo cazó la prueba de las páginas de entrada, 12-oct)
    ('intranet/index.html', '<p class="pie">¿Eres cliente? <a href="/portal/"', '<p class="pie"><span data-lwt>¿Eres cliente?</span> <a href="/portal/"'),
)
# Fechas y números escritos a mano en español: 'es-ES' → el locale del idioma elegido. Un 'es-ES' usado como CLAVE de objeto no se puede envolver: para.
ES_ES_ENVUELTO = {"'": "(window.LW_IDIOMA === 'id' ? 'id-ID' : 'es-ES')", '"': '(window.LW_IDIOMA === "id" ? "id-ID" : "es-ES")'}
# Los 'es-ES' que NO son de interfaz y se quedan como están (revisión, 12-oct): cambiarlos con el idioma de quien mira cambiaría un dato, no un rótulo.
ES_ES_FIJOS = {
    'contracts/assets/dinero.js': 'lwImporteCanonico escribe el importe DENTRO de un campo editable que lwParseImporte vuelve a leer: id-ID agrupa «1.500» donde es-ES deja «1500»',
    'intranet/facturas/documento.js': 'la fecha de la factura impresa es del documento fiscal, no del idioma de quien la mira',
}


def idiomas_de(nombre):
    """Los idiomas de la interfaz que declara la instancia (`idiomas`), o None. Solo combinaciones conocidas: una errata no puede publicar un idioma a medias."""
    i = _instancia_registro(nombre).get('idiomas')
    if i is None:
        return None
    if tuple(i) not in IDIOMAS_CONOCIDOS:
        aborta('erp/instancias.json: %s declara "idiomas": %r y solo se conocen %s' % (nombre, i, IDIOMAS_CONOCIDOS))
    return list(i)


def idioma_pantalla_de(nombre, idiomas):
    """El idioma en que ABRE la pantalla de la instancia si nadie eligió otro (`idioma_pantalla` del registro), o None (= el primero de `idiomas`, como
    siempre). bbm-p42, 13-oct-2026 (agencia-81). Con sesión, el dato de la base (`idiomas.pantalla`, Ajustes › Idiomas, p36) va por encima; este se QUEDA:
    es el idioma de la puerta sin sesión, donde la base no se lee (Seguridad #289). No cambia la lista de idiomas ni el orden del papel. Tiene que ser uno de
    los idiomas declarados."""
    p = _instancia_registro(nombre).get('idioma_pantalla')
    if p is None:
        return None
    if not idiomas or p not in idiomas:
        aborta('erp/instancias.json: %s declara "idioma_pantalla": %r y sus idiomas son %r: tiene que ser uno de ellos' % (nombre, p, idiomas))
    return p


def _sintaxis(rutas):
    """node comprueba la sintaxis de cada .js y de cada <script> en línea de cada .html (un solo proceso). Devuelve los que fallan."""
    if not rutas:
        return []
    prog = ("const fs=require('fs'),vm=require('vm');const malos=[];"
            "for(const f of process.argv.slice(1)){const t=fs.readFileSync(f,'utf8');"
            "const trozos=f.endsWith('.js')?[t]:[...t.matchAll(/<script(?![^>]*\\bsrc=)[^>]*>([\\s\\S]*?)<\\/script>/gi)].map(m=>m[1]);"
            "for(const c of trozos){try{new vm.Script(c)}catch(e){malos.push(f+': '+e.message);break}}}"
            "console.log(JSON.stringify(malos));")
    r = subprocess.run(['node', '-e', prog] + rutas, capture_output=True, text=True, encoding='utf-8')
    if r.returncode != 0:
        aborta('idiomas: no se pudo comprobar la sintaxis: ' + (r.stderr or '')[-400:])
    return json.loads(r.stdout.strip().splitlines()[-1])


def idiomas_instancia(idiomas, pantalla=None):
    """Aplica los idiomas de la instancia sobre la copia del front (DIST, ANTES de quitar comentarios y de los reemplazos de marca: así las claves del
    diccionario reciben el mismo trato que el código que las pide). Solo lo copiado, nunca el repo de Lawang."""
    v4 = os.path.join(DIST, 'intranet', 'v4')
    for rel_, viejo, nuevo in IDIOMAS_PARCHES:
        ruta = os.path.join(DIST, *rel_.split('/'))
        t = open(ruta, encoding='utf-8').read()
        t = _una_vez(t, viejo, nuevo.replace('__AXW_IDIOMAS__', json.dumps(idiomas)).replace('__AXW_IDIOMA_PANTALLA__', json.dumps(pantalla)), 'idiomas ' + rel_)
        open(ruta, 'w', encoding='utf-8', newline='').write(t)
    # El indonesio: núcleo (envuelve lwT, lwLocale y lwIdiomaAplicar) + diccionario, al FINAL de i18n.js
    if idiomas[0] == 'id':
        ruta = os.path.join(DIST, 'contracts', 'assets', 'i18n.js')
        t = open(ruta, encoding='utf-8').read()
        if not t.rstrip().endswith('})();'):
            aborta('idiomas: i18n.js de Lawang ya no termina en «})();»: el núcleo del indonesio se pega al final y hay que revisar dónde')
        dic = json.load(open(os.path.join(AQUI, 'i18n_id.json'), encoding='utf-8'))
        malos = [k for k, v in dic.items() if not isinstance(v, str) or not v.strip() or (v == k and k not in IGUALES_EN_ID)]
        if malos:
            aborta('i18n_id.json: traducción vacía o igual a su clave: ' + ', '.join(malos[:10]))
        nucleo = open(os.path.join(AQUI, 'i18n_id_nucleo.js'), encoding='utf-8').read()
        if nucleo.count('__AXW_LW_ID__') != 1:
            aborta('i18n_id_nucleo.js sin el hueco __AXW_LW_ID__ (una vez)')
        open(ruta, 'w', encoding='utf-8', newline='').write(
            t.rstrip() + '\n\n' + nucleo.replace('__AXW_LW_ID__', json.dumps(dic, ensure_ascii=False, sort_keys=True)))
    # 'es-ES' a mano → locale del idioma elegido, en todo .js y .html de la copia
    tocados = []
    fijos = {os.path.normcase(os.path.join(DIST, *r_.split('/'))) for r_ in ES_ES_FIJOS}
    for r_ in ES_ES_FIJOS:
        if not os.path.isfile(os.path.join(DIST, *r_.split('/'))):
            aborta('idiomas: ES_ES_FIJOS nombra %s y no está en la copia: revisa la lista' % r_)
    for raiz_, _d, fichs in os.walk(DIST):
        for f in fichs:
            if not f.endswith(('.js', '.html')):
                continue
            ruta = os.path.join(raiz_, f)
            if os.path.normcase(ruta) in fijos:
                continue
            t = open(ruta, encoding='utf-8', errors='replace').read()
            if "es-ES'" not in t and 'es-ES"' not in t:
                continue
            if f.endswith('.html') and re.search(r'''['"]es-ES['"]''', re.sub(r'(?is)<script\b[^>]*>.*?</script>', '', t)):
                aborta('idiomas: %s lleva es-ES fuera de un <script> (un atributo HTML no se puede envolver con JavaScript)' % rel(ruta))
            t2 = t
            for q, env in ES_ES_ENVUELTO.items():
                lit = q + 'es-ES' + q
                if re.search(re.escape(lit) + r'\s*:(?!\s*' + re.escape(q) + ')', t2.replace(env, '')):
                    aborta("idiomas: %s usa %s como clave de objeto (no se puede envolver)" % (rel(ruta), lit))
                t2 = t2.replace(env, '\0').replace(lit, env).replace('\0', env)
            if t2 != t:
                open(ruta, 'w', encoding='utf-8', newline='').write(t2)
                tocados.append(ruta)
    malos = _sintaxis(tocados + [os.path.join(DIST, *r_.split('/')) for r_ in {x[0] for x in IDIOMAS_PARCHES}] +
                      ([os.path.join(DIST, 'contracts', 'assets', 'i18n.js')] if idiomas[0] == 'id' else []))
    if malos:
        aborta('idiomas: el parche deja JavaScript roto:\n  ' + '\n  '.join(malos[:20]))
    print('idiomas %s: %d parches, %d ficheros con fechas en el idioma elegido' % ('+'.join(idiomas), len(IDIOMAS_PARCHES), len(tocados)))


def comprueba_idiomas(dist, idiomas):
    """Sobre el paquete YA construido: el diccionario llegó entero y sin cambios (los reemplazos de marca no lo tocaron), y no queda ningún 'es-ES' ni
    ternario de dos idiomas sin envolver en lo que se sirve. Si queda uno, el build para: esa pantalla saldría en español."""
    if idiomas[0] != 'id':
        return
    fuente = json.load(open(os.path.join(AQUI, 'i18n_id.json'), encoding='utf-8'))
    t = open(os.path.join(dist, 'contracts', 'assets', 'i18n.js'), encoding='utf-8').read()
    falta = [v for v in fuente.values() if json.dumps(v, ensure_ascii=False)[1:-1] not in t]
    if falta:
        aborta('idiomas: el diccionario indonesio no llegó intacto al paquete (¿un reemplazo de marca lo cambió?): ' + ' | '.join(falta[:5]))
    # Por RECUENTO y no por forma: el build minifica después y cambia comillas y espacios. Cada 'es-ES' envuelto lleva su 'id-ID' al lado.
    restos = []
    # ES_ES_FIJOS, en su sitio de antes y de después de reraiz (intranet/facturas → clasico/facturas)
    fijos = tuple(ES_ES_FIJOS) + ('clasico/facturas/documento.js',)
    dos_idiomas = re.compile(r"""LW_IDIOMA\s*===?\s*(['"])en\1\s*\?\s*(['"])(?:en|es|EN|ES)\2\s*:\s*(['"])(?:es|en|ES|EN)\3""")
    for raiz_, _d, fichs in os.walk(dist):
        for f in fichs:
            if f.endswith(('.js', '.html')):
                x = open(os.path.join(raiz_, f), encoding='utf-8', errors='replace').read()
                if os.path.relpath(os.path.join(raiz_, f), dist).replace(os.sep, '/') in fijos:
                    continue
                if x.count('es-ES') > x.count('id-ID'):
                    restos.append('%s: %d es-ES sin su id-ID' % (rel(os.path.join(raiz_, f)), x.count('es-ES') - x.count('id-ID')))
                for m in dos_idiomas.finditer(x):
                    restos.append('%s: %s' % (rel(os.path.join(raiz_, f)), m.group(0)))
    if restos:
        aborta('idiomas: quedan formatos o idiomas fijados a español/inglés sin el idioma de la instancia:\n  ' + '\n  '.join(restos[:30]))


# ── El DOCUMENTO (factura, proforma, recibí) en el par de idiomas de la instancia (owner, 12-oct-2026, BBM-65: «Indonesio e inglés») ───────────────
# documento.js de Lawang pinta el papel bilingüe es·en, y de él salen la vista previa, el PDF (window.print del iframe) y el correo (la edge recibe el
# HTML ya armado). En una instancia con `"idiomas": ["id", ...]` en erp/instancias.json, la COPIA pasa a id·en: rótulos, títulos, concepto del
# recibí, fecha en id-ID fija (del documento, no de quien mira: por eso documento.js sigue en ES_ES_FIJOS) y lang del HTML. Desde BBM-72 la copia
# lleva este papel id·en Y el es·en, y elige al pintar según Ajustes › Idiomas (ver DOC_ENVOLTORIO); nunca según AXW_IDIOMAS/localStorage. Sin
# `idiomas` o con es primero en el build: no se toca nada (Lawang y la demo siguen es·en byte a byte). Los importes no cambian: lwFormatoImporte
# ya da «1.500.000 IDR», sin decimales.
# Términos fiscales en indonesio revisados por Legal (bbm-p36, 13-oct); lo que solo confirma un hablante nativo va a la fila del owner.
DOC_TITULOS_ID = {'factura': 'Invoice', 'proforma': 'Invoice Proforma', 'recibi': 'Kuitansi', 'rectificativa': 'Invoice Koreksi'}
DOC_PARCHES_ID = (
    # (fichero en DIST, trozo de Lawang, sustituto)
    ('intranet/facturas/documento.js', "  factura:  { es:'Factura',", "  factura:  { id:'%(factura)s', es:'Factura',"),
    ('intranet/facturas/documento.js', "  proforma: { es:'Factura proforma',", "  proforma: { id:'%(proforma)s', es:'Factura proforma',"),
    ('intranet/facturas/documento.js', "  recibi:   { es:'Recibí',", "  recibi:   { id:'%(recibi)s', es:'Recibí',"),
    ('intranet/facturas/documento.js', "  rectificativa: { es:'Factura rectificativa',", "  rectificativa: { id:'%(rectificativa)s', es:'Factura rectificativa',"),
    # en indonesio la factura se llama «Invoice» (como en la interfaz): si el título id y el en coinciden, el subtítulo no se repite
    ('intranet/facturas/documento.js', "      '<h2>' + escDoc(tipo.es) + '</h2>' +\n      '<div class=\"titulo-en\">' + escDoc(tipo.en) + '</div>' +",
     # un tipo que Lawang añada sin `id` sale con su título inglés, nunca vacío (revisor, 1.ª vuelta)
     "      '<h2>' + escDoc(tipo.id || tipo.en) + '</h2>' +\n      ((tipo.id || tipo.en) !== tipo.en ? '<div class=\"titulo-en\">' + escDoc(tipo.en) + '</div>' : '') +"),
    ('intranet/facturas/documento.js', "'Cobro de la factura ' + numero + ' · Payment of invoice ' + numero : 'Cobro · Payment'",
     "'Pembayaran invoice ' + numero + ' · Payment of invoice ' + numero : 'Pembayaran · Payment'"),
    ('intranet/facturas/documento.js', "? (v.es || '') : (v || '')", "? (v.id || v.en || v.es || '') : (v || '')"),
    ('intranet/facturas/documento.js', "'<h3>Datos bancarios · Bank details</h3>'", "'<h3>Rekening bank · Bank details</h3>'"),
    ('intranet/facturas/documento.js', "dato('Titular · Holder',", "dato('Atas nama · Account holder',"),
    ('intranet/facturas/documento.js', "dato('Banco · Bank',", "dato('Bank',"),
    ('intranet/facturas/documento.js', "dato('Cuenta · Account',", "dato('Nomor rekening · Account number',"),
    ('intranet/facturas/documento.js', "dato('Dirección · Address',", "dato('Alamat bank · Bank address',"),
    ('intranet/facturas/documento.js', "dato('Nota · Note',", "dato('Catatan · Note',"),
    ('intranet/facturas/documento.js', "toLocaleDateString('es-ES',", "toLocaleDateString('id-ID',"),
    ('intranet/facturas/documento.js', "'<tr><td class=\"vacio\">Sin conceptos</td>", "'<tr><td class=\"vacio\">Tidak ada rincian · No items</td>"),
    ('intranet/facturas/documento.js', "'Fecha · Date: '", "'Tanggal · Date: '"),
    ('intranet/facturas/documento.js', "'Vencimiento · Due: '", "'Jatuh tempo · Due date: '"),
    ('intranet/facturas/documento.js', "'Contrato · Contract: '", "'Kontrak · Contract: '"),
    ('intranet/facturas/documento.js', "'<div class=\"meta rectifica\">Rectifica a · Corrects: <b>'", "'<div class=\"meta rectifica\">Mengoreksi · Corrects: <b>'"),
    ('intranet/facturas/documento.js', "'<br>Motivo · Reason: '", "'<br>Alasan · Reason: '"),
    # un recibí no factura a nadie: acredita lo recibido (Legal, 13-oct)
    ('intranet/facturas/documento.js', "'<h3>Facturar a · Bill to</h3>'",
     "'<h3>' + (d.tipo === 'recibi' ? 'Diterima dari · Received from' : 'Ditagihkan kepada · Bill to') + '</h3>'"),
    # en una instancia el campo `proyecto_nombre` es la «Referencia» (textos_instancia, owner 12-oct)
    ('intranet/facturas/documento.js', ">Proyecto · Project: <b>'", ">Referensi · Reference: <b>'"),
    ('intranet/facturas/documento.js', "'<h3>Conceptos · Items</h3>'", "'<h3>Rincian · Items</h3>'"),
    ('intranet/facturas/documento.js', "<th>Descripción · Description</th><th class=\"imp\">Importe · Amount</th>",
     "<th>Deskripsi · Description</th><th class=\"imp\">Jumlah · Amount</th>"),
    ('intranet/facturas/documento.js', "(d.imp_etiqueta || 'Impuesto · Tax')", "(d.imp_etiqueta || 'Pajak · Tax')"),
    ('intranet/facturas/documento.js', "'<h3>Notas · Notes</h3>", "'<h3>Catatan · Notes</h3>"),
    ('intranet/facturas/documento.js', "'<!DOCTYPE html><html lang=\"es\">", "'<!DOCTYPE html><html lang=\"id\">"),
    # El correo que acompaña al PDF (lo recibe el cliente): asunto con el título id del documento y mensaje por defecto id + en (editable antes de enviar)
    # tipoDocEs conserva su nombre (lo usan el asunto, el mensaje y el título del PDF) pero en la copia devuelve el título id del tipo REAL:
    # una rectificativa es tipo 'factura' con rectifica_numero, igual que en documentoHTML (revisor, 1.ª vuelta)
    ('intranet/v4/assets/editores.js', "TIPOS_DOC[vals.tipo]) || { es: 'Factura' }).es;", "TIPOS_DOC[DOC_TIPO_REAL]) || { id: '%(factura)s' }).id;"),
    ('intranet/v4/assets/editores.js',
     "'Buenos días' + (vals.cliente_nombre ? ' ' + vals.cliente_nombre : '') + ',\\n\\n' +\n"
     "        'Adjunto ' + tipo.toLowerCase() + ' ' + saved.numero + ' para su revisión.\\n\\nUn saludo,\\n' + lwMarca('%%firma_correo'));",
     "'Halo' + (vals.cliente_nombre ? ' ' + vals.cliente_nombre : '') + ',\\n\\n' +\n"
     # un recibí confirma un pago, no se manda «para revisar» (Legal, 13-oct, BBM-72)
     "        (DOC_TIPO_REAL === 'recibi' ? 'Terlampir kuitansi ' + saved.numero + ' sebagai bukti pembayaran Anda.\\n' +\n"
     "        'Please find attached receipt ' + saved.numero + ' confirming your payment.\\n\\n' :\n"
     "        'Terlampir ' + tipo.toLowerCase() + ' ' + saved.numero + ' untuk Anda periksa.\\n' +\n"
     "        'Please find attached ' + (((typeof TIPOS_DOC !== 'undefined' && TIPOS_DOC[DOC_TIPO_REAL]) || { en: 'Invoice' }).en).toLowerCase() + ' ' + saved.numero + ' for your review.\\n\\n') +\n"
     "        'Salam / Kind regards,\\n' + lwMarca('%%firma_correo'));"),
)
# BBM-72: lo que es de la INSTANCIA y no del idioma va también al papel es·en (el que sale con Ajustes es·en); sin esto el papel español de una
# instancia decía «Proyecto · Project» y, en el recibí, «Facturar a · Bill to» (revisor, 13-oct). Mismo criterio que el id·en (Legal, 13-oct).
DOC_PARCHES_INSTANCIA_ES = (
    ("'<h3>Facturar a · Bill to</h3>'",
     "'<h3>' + (d.tipo === 'recibi' ? 'Recibido de · Received from' : 'Facturar a · Bill to') + '</h3>'"),
    (">Proyecto · Project: <b>'", ">Referencia · Reference: <b>'"),
)
# El correo del papel es·en de una instancia, también en los dos idiomas del papel (en Lawang sigue solo en español: no pasa por aquí)
DOC_CORREO_ES_EN = (
    "'Buenos días' + (vals.cliente_nombre ? ' ' + vals.cliente_nombre : '') + ',\\n\\n' +\n"
    "        (DOC_TIPO_REAL === 'recibi' ? 'Adjunto el recibí ' + saved.numero + ', justificante de su pago.\\n' +\n"
    "        'Please find attached receipt ' + saved.numero + ' confirming your payment.\\n\\n' :\n"
    "        'Adjunto ' + tipo.toLowerCase() + ' ' + saved.numero + ' para su revisión.\\n' +\n"
    "        'Please find attached ' + (((typeof TIPOS_DOC !== 'undefined' && TIPOS_DOC[DOC_TIPO_REAL]) || { en: 'Invoice' }).en).toLowerCase() + ' ' + saved.numero + ' for your review.\\n\\n') +\n"
    "        'Un saludo / Kind regards,\\n' + lwMarca('%firma_correo')")


# La factura y el recibí NUEVOS nacen en la moneda de la instancia (Ajustes › moneda → lwMonedaBase() de guard.js), no en 'EUR' escrito a mano
# (bbm-p36, medido en producción el 13-oct: la vista previa de una factura nueva de bbm decía «0 EUR»). Sin moneda decidida, EUR como antes.
# Toda instancia; Lawang no cambia. Parte de BBM-64 (el resto de 'EUR' a mano sigue en esa fila).
MONEDA_DOC_PARCHES = (
    ('intranet/v4/assets/editores.js', "k: 'moneda', label: 'Moneda', tipo: 'select', valor: f0.moneda || 'EUR',",
     "k: 'moneda', label: 'Moneda', tipo: 'select', valor: f0.moneda || lwMonedaBase() || 'EUR',"),
    ('intranet/v4/assets/editores.js', "          moneda: f0.moneda || 'EUR',\n", "          moneda: f0.moneda || lwMonedaBase() || 'EUR',\n"),
)


def moneda_documento():
    for rel_, viejo, nuevo in MONEDA_DOC_PARCHES:
        ruta = os.path.join(DIST, *rel_.split('/'))
        t = open(ruta, encoding='utf-8').read()
        open(ruta, 'w', encoding='utf-8', newline='').write(_una_vez(t, viejo, nuevo, 'moneda del documento ' + rel_))


# Gastos en la moneda de la instancia (calidad-gastos, 15-oct-2026; lo vio Experiencia en bbm y Calidad lo midió: bbm tiene 0 gastos y moneda IDR
# en Ajustes, y las cifras de arriba decían «0 EUR» porque panel-gastos.js de Lawang cae a ['EUR'] sin gastos). Sin gastos, las cifras salen en la
# moneda de Ajustes (lwMonedaBase() de guard.js); sin moneda decidida, «—», nunca «0 EUR», y se repintan cuando llega la capa de módulos
# (AXW_MODULOS_LISTOS, la misma espera que conMonedaBase de datos.js, que vive dentro de su IIFE y aquí no se alcanza). El alta de un gasto nace en
# esa moneda y la ofrece aunque no esté en la lista de Lawang; sin moneda decidida nace en «— elige —» y es obligatoria (orquestador agencia-c0,
# 15-oct: ningún EUR por defecto a fuego). Se lee la base EN EJECUCIÓN (config_instancia.moneda vía modulos_activos_datos): el paquete no
# guarda ninguna moneda. El servidor tampoco la supone: gasto_guarda (migración de calidad-gastos) usa la de Ajustes o da error.
# Con gastos, la suma por moneda de siempre. Toda instancia; Lawang no pasa por aquí (allí EUR es su moneda). Parte de BBM-64.
# Y el alta ofrece SOLO la moneda de Ajustes (agencia-c0, 15-oct, visto en bbm vivo: ofrecía también EUR y USD, y la base rechaza cualquier
# otra con «La moneda de la instancia es IDR»: Dion rellenaría todo para chocar al guardar). Con una sola posible no hay desplegable: «Moneda:
# IDR» como texto fijo (tipo 'nota' de modal) y payloadDe manda la de Ajustes. Al editar un gasto en otra moneda, se ofrecen esa y la de Ajustes.
# Prueba: test_moneda_gastos.py (aplica esto al Lawang fijado y ejecuta pintaKpis/camposGasto/payloadDe en Node; sin el parche, rojo).
MONEDA_GASTOS_PARCHES = (
    ('intranet/v4/assets/panel-gastos.js', "  var MONEDAS = [['EUR', 'EUR'], ['IDR', 'IDR'], ['USD', 'USD']];\n",
     "  var MONEDAS = [['EUR', 'EUR'], ['IDR', 'IDR'], ['USD', 'USD']];\n"
     "  /* AxisWorks (calidad-gastos, 15-oct-2026): la moneda de los gastos es la de Ajustes (lwMonedaBase), no 'EUR' escrito a mano. */\n"
     "  function axwMonedaGastos() { var m = typeof window.lwMonedaBase === 'function' ? window.lwMonedaBase() : null; return /^[A-Z]{3}$/.test(m || '') ? m : null; }\n"
     "  function axwMonedasGastos(actual) {   // SOLO la de Ajustes (la base rechaza otra) y la que ya tiene el gasto que se edita\n"
     "    var m = axwMonedaGastos(), a = /^[A-Z]{3}$/.test(actual || '') ? actual : null;\n"
     "    if (m) return a && a !== m ? [[m, m], [a, a]] : [[m, m]];\n"
     "    var out = MONEDAS.slice(); if (a && !out.some(function (y) { return y[0] === a; })) out.unshift([a, a]);   // sin moneda decidida: la base dirá cuál\n"
     "    return a ? out : [['', T('— elige —')]].concat(out);\n"
     "  }\n"
     "  function axwCampoMoneda(actual) {   // una sola posible: texto fijo, sin desplegable que ofrezca lo que la base rechaza\n"
     "    var m = axwMonedaGastos(), ops = axwMonedasGastos(actual);\n"
     "    if (m && ops.length === 1) return { tipo: 'nota', axwMoneda: m, label: T('Moneda') + ': ' + m };\n"
     "    return { k: 'moneda', label: T('Moneda'), tipo: 'select', req: true, medio: 1, valor: actual || m || '', opciones: ops };\n"
     "  }\n"
     "  var axwMonedaGastosEsperada = false;\n"
     "  function axwTrasMonedaGastos(fn) {\n"
     "    var p = window.AXW_MODULOS_LISTOS;\n"
     "    if (axwMonedaGastosEsperada || !p || typeof p.then !== 'function') return;\n"
     "    axwMonedaGastosEsperada = true;\n"
     "    p.then(function () { if (axwMonedaGastos()) fn(); }, function () { /* MUDO A PROPOSITO: sin la capa de módulos la moneda no se sabe y las cifras siguen en «—» */ });\n"
     "  }\n"),
    ('intranet/v4/assets/panel-gastos.js',
     "    var monedas = Object.keys(calc); if (!monedas.length) monedas = ['EUR'];\n"
     "    var linea = function (k) { return monedas.map(function (m) { return fmt((calc[m] || {})[k] || 0, m); }).join(' · '); };\n",
     "    var monedas = Object.keys(calc); if (!monedas.length) { var mbG = axwMonedaGastos(); monedas = mbG ? [mbG] : []; if (!mbG) axwTrasMonedaGastos(pintaKpis); }\n"
     "    var linea = function (k) { return monedas.length ? monedas.map(function (m) { return fmt((calc[m] || {})[k] || 0, m); }).join(' · ') : '—'; };\n"),
    ('intranet/v4/assets/panel-gastos.js', "{ k: 'moneda', label: T('Moneda'), tipo: 'select', medio: 1, valor: g.moneda || 'EUR', opciones: MONEDAS }",
     "axwCampoMoneda(g.moneda)"),
    ('intranet/v4/assets/panel-gastos.js', "moneda: v.moneda || 'EUR', fecha: v.fecha,",
     "moneda: v.moneda || axwMonedaGastos() || null, fecha: v.fecha,"),
)


def moneda_gastos():
    for rel_, viejo, nuevo in MONEDA_GASTOS_PARCHES:
        ruta = os.path.join(DIST, *rel_.split('/'))
        t = open(ruta, encoding='utf-8').read()
        open(ruta, 'w', encoding='utf-8', newline='').write(_una_vez(t, viejo, nuevo, 'moneda de los gastos ' + rel_))


DOC_TIPO_REAL_JS ="(vals.rectifica_numero && vals.tipo !== 'proforma' && vals.tipo !== 'recibi' ? 'rectificativa' : vals.tipo)"


# BBM-72 (owner 13-oct, «Sí, un solo sitio»; bbm-p40): el idioma del papel lo decide Ajustes › Idiomas, no el build. El documento.js de la copia lleva
# los DOS papeles —el es·en de Lawang, intacto, y el id·en de DOC_PARCHES_ID— cada uno en su ámbito, y elige al pintar con `axwDocId()`: lo que la base
# guardó (modulos_activos_datos().idiomas, apuntado por apagados_instancia.js en window.AXW_IDIOMAS_DOC: el PRIMERO de la lista manda, igual que
# _doc_idioma() de la base) y, sin fila o sin saberlo aún, el par del build, como hasta hoy. La decisión sale de la BASE (no de localStorage ni de
# la interfaz de quien mira): dos navegadores no emiten el mismo documento en idiomas distintos. Contrato de la fila: bbm-p36, 13-oct.
# El correo que acompaña al PDF (editores.js) sigue la misma regla.
DOC_ENVOLTORIO = """/* ── bbm-p40, BBM-72: los dos papeles de esta instancia; manda Ajustes › Idiomas (window.AXW_IDIOMAS_DOC), y sin él el par del build ── */
function axwDocId() {
  var v = (typeof window !== 'undefined') ? window.AXW_IDIOMAS_DOC : null;
  if (Array.isArray(v) && v[0] === 'es') return false;   // solo «es» primero da el papel español; «id» primero, el indonesio
  if (Array.isArray(v) && v[0] === 'id') return true;
  return __DEFECTO_ID__;   // sin fila, o algo que no es uno de los dos pares: el del build
}
var __docEs = (function () {
__ES__
  return { TIPOS_DOC: TIPOS_DOC, conceptoCobroRecibi: conceptoCobroRecibi, escDoc: escDoc, bancoDocHTML: bancoDocHTML, documentoVars: documentoVars, documentoHTML: documentoHTML, documentoPagina: documentoPagina };
})();
var __docId = (function () {
__ID__
  return { TIPOS_DOC: TIPOS_DOC, conceptoCobroRecibi: conceptoCobroRecibi, escDoc: escDoc, bancoDocHTML: bancoDocHTML, documentoVars: documentoVars, documentoHTML: documentoHTML, documentoPagina: documentoPagina };
})();
function __docPapel() { return axwDocId() ? __docId : __docEs; }
var TIPOS_DOC = __docId.TIPOS_DOC;   // lleva id, es y en: el correo elige con axwDocId()
function conceptoCobroRecibi(numero) { return __docPapel().conceptoCobroRecibi(numero); }
function escDoc(s) { return __docEs.escDoc(s); }
function bancoDocHTML(d) { return __docPapel().bancoDocHTML(d); }
function documentoVars(soc) { return __docPapel().documentoVars(soc); }
function documentoHTML(d, opts) { return __docPapel().documentoHTML(d, opts); }
function documentoPagina(d, opts) { return __docPapel().documentoPagina(d, opts); }
if (typeof module !== 'undefined')
  module.exports = { TIPOS_DOC, conceptoCobroRecibi, escDoc, bancoDocHTML, documentoVars, documentoHTML, documentoPagina, axwDocId };
"""
DOC_EXPORTS = ("if(typeof module !== 'undefined')\n"
               "  module.exports = { TIPOS_DOC, conceptoCobroRecibi, escDoc, bancoDocHTML, documentoVars, documentoHTML, documentoPagina };\n")
DOC_CORREO_ES = "(typeof axwDocId === 'function' && !axwDocId())"   # el correo en español solo si el papel va en español


def documento_idiomas(idiomas):
    """El papel de factura/proforma/recibí y el correo que lo acompaña, en el par de la instancia (ver DOC_PARCHES_ID) o en el que guarde Ajustes ›
    Idiomas (BBM-72, DOC_ENVOLTORIO). Solo la copia (DIST, antes de reraiz y de quitar comentarios); cada trozo exactamente una vez o el build para."""
    if not idiomas or idiomas[0] != 'id':
        return
    doc = os.path.join(DIST, 'intranet', 'facturas', 'documento.js')
    es = open(doc, encoding='utf-8').read()
    ed_ruta = os.path.join(DIST, 'intranet', 'v4', 'assets', 'editores.js')
    ed = open(ed_ruta, encoding='utf-8').read()
    idd = es
    for rel_, viejo, nuevo in DOC_PARCHES_ID:
        v_, n_ = viejo.replace('%%', '%'), (nuevo % DOC_TITULOS_ID).replace('DOC_TIPO_REAL', DOC_TIPO_REAL_JS)
        if rel_ == 'intranet/facturas/documento.js':
            idd = _una_vez(idd, v_, n_, 'documento ' + rel_)
        else:
            # el correo: id·en o es (el de Lawang), según el papel. Cada trozo es el final de una expresión que cierra con «;» o «);»
            fin = ');' if v_.endswith(');') else ';'
            if not (v_.endswith(fin) and n_.endswith(fin)):
                aborta('documento: el trozo del correo no termina como se espera (%r)' % v_[-20:])
            pre = 'return ' if v_.startswith('TIPOS_DOC') else ''
            if pre:   # tipoDocEs: se sustituye la línea entera de su return
                v_ = "return ((typeof TIPOS_DOC !== 'undefined' && " + v_
                n_ = "return ((typeof TIPOS_DOC !== 'undefined' && " + n_
            # el mensaje del papel es·en va en español + inglés (DOC_CORREO_ES_EN); el asunto, con el título español del tipo
            es_ = v_[len(pre):-len(fin)]
            if es_.startswith("'Buenos días'"):
                es_ = DOC_CORREO_ES_EN.replace('DOC_TIPO_REAL', DOC_TIPO_REAL_JS)
            if pre:   # tipoDocEs del papel es·en: también el tipo REAL (una rectificativa no es «Factura» en el asunto ni en el PDF; revisor, 2.ª vuelta)
                es_ = v_[len(pre):-1]
                if es_.count('TIPOS_DOC[vals.tipo]') != 1:
                    aborta('documento: tipoDocEs de Lawang ya no lee TIPOS_DOC[vals.tipo] (mirar documento_idiomas)')
                es_ = es_.replace('TIPOS_DOC[vals.tipo]', 'TIPOS_DOC[' + DOC_TIPO_REAL_JS + ']')
            ed = _una_vez(ed, v_, '(%s ? %s : %s)%s' % (DOC_CORREO_ES, es_, n_[len(pre):-len(fin)], fin) if not pre else
                          'return %s ? %s : %s;' % (DOC_CORREO_ES, es_, n_[len(pre):-1]), 'documento ' + rel_)
    for viejo, nuevo in DOC_PARCHES_INSTANCIA_ES:   # después de sacar el id·en, que parte del original de Lawang
        es = _una_vez(es, viejo, nuevo, 'documento: papel es·en de la instancia')
    es = _una_vez(es, DOC_EXPORTS, '', 'documento: module.exports del papel es')
    idd = _una_vez(idd, DOC_EXPORTS, '', 'documento: module.exports del papel id')
    envuelto = (DOC_ENVOLTORIO.replace('__DEFECTO_ID__', 'true')
                .replace('__ES__', es).replace('__ID__', idd))
    open(doc, 'w', encoding='utf-8', newline='').write(envuelto)
    open(ed_ruta, 'w', encoding='utf-8', newline='').write(ed)
    malos = _sintaxis([doc, ed_ruta])
    if malos:
        aborta('documento: el parche deja JavaScript roto:\n  ' + '\n  '.join(malos))
    print('documento %s (o el de Ajustes › Idiomas): %d parches (factura, proforma, recibí y correo)' % ('+'.join(idiomas), len(DOC_PARCHES_ID)))


def comprueba_documento_idiomas(dist, idiomas):
    """Sobre el paquete construido: el documento.js servido lleva el selector de Ajustes › Idiomas (BBM-72), y el arnés
    (pruebas/documento_idiomas.harness.cjs) pinta el papel id·en (sin fila y con Ajustes id·en) buscando palabras españolas —así para un rótulo
    NUEVO de Lawang— y el es·en de la instancia (Ajustes es·en) con sus correcciones de instancia."""
    if not idiomas or idiomas[0] != 'id':
        return
    t = open(os.path.join(dist, 'clasico', 'facturas', 'documento.js'), encoding='utf-8').read()
    # BBM-72: el servido lleva los dos papeles (el es·en de Lawang para Ajustes es·en), así que la lista fija ya no se busca en el fichero entero:
    # se exige el selector y el arnés pinta el papel id·en (sin fila y con Ajustes id·en) y el es·en, y busca español en el id·en
    if 'axwDocId' not in t or 'AXW_IDIOMAS_DOC' not in t:
        aborta('documento: el papel servido no lleva el selector de Ajustes › Idiomas (axwDocId)')
    # Un rótulo NUEVO de Lawang lo caza pintar el papel y buscar español en él (revisor)
    r = subprocess.run(['node', os.path.join(AQUI, 'pruebas', 'documento_idiomas.harness.cjs'), dist], capture_output=True, text=True, encoding='utf-8')
    if r.returncode != 0:
        aborta('documento: el papel de la instancia no sale entero en %s:\n%s' % ('·'.join(idiomas), (r.stdout + r.stderr)[-1500:]))


def comprueba_pantallas_idiomas(dist, idiomas):
    """Sobre el paquete construido: NINGUNA pantalla sale en español en un idioma de la instancia que no sea el español (owner, 15-oct-2026, bbm:
    «/ajustes/ no puede salir en español, ¿tengo que ir ventana a ventana avisándote?»). El arnés (pruebas/idiomas_pantallas.harness.cjs) abre
    cada carpeta con index.html del paquete en Chromium, con la base simulada vacía y caída, en cada idioma que no sea 'es', y mira texto, <option>,
    placeholder, title, aria-label, <title>, lo oculto que se abrirá, los diálogos, LW_T_MISSES y el paginador. Para con cualquier salida que no sea
    0: un 2 («no he podido mirar») tampoco es un verde. Datos de la base, correos y PDF quedan fuera de este arnés (el PDF lo mira el de arriba)."""
    lenguas = [x for x in (idiomas or []) if x != 'es']
    if not lenguas:
        return
    # Solo test_builds_instancias.py (el gate de push, que mide que la instancia CONSTRUYE y no puede depender de Chromium; mismo criterio que
    # test_crea_contrasena --sin-navegador en tools/test.py) lo apaga, y lo dice. Publicar una instancia corre el build entero, con el barrido.
    if os.environ.get('AXW_IDIOMAS_SIN_NAVEGADOR') == '1':
        print('idiomas: barrido de pantallas SIN MIRAR (AXW_IDIOMAS_SIN_NAVEGADOR=1, solo el gate): no vale como verde para publicar')
        return
    # la agencia de ESTE build (erp/modulos.json: todos los módulos encendidos, también desde un worktree) y el informe entero si se pide
    entorno = dict(os.environ, LENGUAS=','.join(lenguas), AXW_AGENCIA_RAIZ=AGENCIA,
                   PARALELO=os.environ.get('PARALELO', '4'))
    r = subprocess.run(['node', os.path.join(AQUI, 'pruebas', 'idiomas_pantallas.harness.cjs'), dist], capture_output=True, text=True,
                       encoding='utf-8', env=entorno)
    sal = (r.stdout or '') + (r.stderr or '')
    if r.returncode != 0:
        aborta('idiomas: hay pantallas con texto en español en %s (salida %d del arnés):\n%s' % ('+'.join(lenguas), r.returncode, sal[-3000:]))
    print('idiomas: ' + ' · '.join(l for l in sal.splitlines() if l.strip() and not l.startswith('FALLA'))[-300:])


def instancia(nombre):
    url, clave, dominio, marca = _instancia_conf(nombre)
    asistente_maestro()   # AXW-136: la pantalla de peticiones del maestro (antes de limpiar y reubicar)
    whatsapp_bot_pantalla()   # módulo Bot de WhatsApp (5-oct-2026): su pantalla, clonando la cáscara de Lawang
    ajustes_correo_maestro()   # F3.1 (7-oct-2026): Ajustes › Correo con el servidor de salida (llama a la edge ajustes-correo)
    ventas_pantalla()   # F4 (8-oct-2026): Ventas — reserva → borrador → emitir → rectificar y la cola «cobrado sin facturar»
    reservas_producto_pantalla()   # F8 (8-oct-2026): Reservas de producto — lista, calendario, flota y pagos por revisar (tras ventas: sus anclas de nav.js)
    taller_pantalla()   # F8 pieza 2 (8-oct-2026): Taller — órdenes de trabajo ligeras (tras reservas de producto: sus anclas de nav.js)
    entrega_pantalla()   # F8 pieza 8 (10-oct-2026): Entrega — sede, tarifa por km y límites (tras taller: sus anclas de nav.js y herramientas.js)
    flota_pantalla()   # F8 (10-oct-2026): Flota y tarifas — editor de motos y tramos de tarifa (tras entrega: sus anclas de nav.js y herramientas.js)
    if aaas_en_paquete(nombre):
        agente_pantalla()   # EP.5 (13-oct-2026): AaaS — su ventana (tras flota: sus anclas de nav.js y la marca de herramientas.js)
    asistente_setup_pantalla()   # F3 (12-oct-2026): /ajustes/configurar/, el asistente de setup por módulo (todas las instancias)
    ajustes_puesta_en_marcha()   # F3 (12-oct-2026): Ajustes › Configurar módulos, primera pestaña, en todas las instancias (antes solo las de reservas)
    ajustes_cobros()   # F3 E2 (12-oct-2026): Ajustes › Cobros y el paso «cobros» (oculto hasta que la base declare el paso)
    setup_comun_pasos()   # F3 (12-oct-2026, bbm-p31): pasos negocio/idiomas/correo/taller_* y Ajustes › Idiomas contra la base
    textos_instancia(nombre)   # owner 12-oct («Sí, tal cual»): fuera proyectos, villas y Cartas de Reserva de las pantallas comunes de la instancia
    oculta_por_modulo()   # bbm-p39 (13-oct): columnas, vista y selector de contrato que no tienen sentido con su módulo apagado
    usuarios_por_invitacion()   # N4/T F2 (14-oct-2026): /usuarios/ invita sin contraseña (admin-usuarios `invitar`, B1); DETRÁS de oculta_por_modulo
    # F3 E3/E4 (pasos de Reservas de producto, setup_reservas.js): en el paquete desde que E3/E4 (20261012210000) está aplicada en bbm (bbm-p35, 13-oct;
    # sube a main en el mismo paso que la aplicación, por el guion de la mañana). Sin estas dos líneas el paso OBLIGATORIO «alquileres_previos» no tiene
    # pantalla y bbm no cotiza; con ellas y sin E3, el contrato front↔base para toda publicación de bbm.
    if reservas_en_paquete(nombre):
        setup_reservas_pasos()
    if propiedades_en_paquete(nombre):   # erp-front 14-oct: tipos de vivienda, fases de obra y carta de reserva, donde va el grant de sus escritores
        setup_propiedades_pasos()
    clases_setup_en_hoja()   # revisor 13-oct (bbm-p41): ninguna clase del setup sin compilar en la tw.css de la instancia
    if portada_de(nombre) == 'reservas':   # 11-oct-2026: la Home de las reservas del día y Ajustes › Puesta en marcha (solo instancias de tipo Reservas)
        portada_reservas()
        extras_pantalla()   # erp-front 14-oct-2026: /productos/ = «Extras y servicios»; las motos solo en Flota
    moneda_documento()   # 13-oct (bbm-p36): factura y recibí nuevos en la moneda de la instancia, no en EUR
    moneda_gastos()   # 15-oct (calidad-gastos): Gastos en la moneda de la instancia; sin gastos, «0 EUR» era mentira en bbm (IDR)
    idiomas = idiomas_de(nombre)
    pantalla = idioma_pantalla_de(nombre, idiomas)   # bbm-p42: SIEMPRE, también sin `idiomas` (un idioma_pantalla sin lista aborta, no se ignora: revisor)
    global AVISO_IDIOMAS
    AVISO_IDIOMAS = (idiomas, pantalla) if idiomas else None   # erp-front 14-oct: los avisos de pantalla no incluida, en los idiomas de la instancia
    if idiomas:   # 12-oct-2026: interfaz en los idiomas de la instancia (bbm: indonesio e inglés)
        idiomas_instancia(idiomas, pantalla)   # + el idioma de pantalla por defecto (el del registro; también el de la puerta sin sesión)
        documento_idiomas(idiomas)   # BBM-65 (13-oct): el papel de factura/recibí y su correo en el par de la instancia (id·en en bbm)
    menu_i18n()   # rótulos del menú en en/id en todas las páginas (después del núcleo del indonesio)
    traduce_instancia_js()   # bbm-idiomas (15-oct): el HTML de Lawang sin marca de diccionario, en el idioma de la instancia (después de MENU_I18N)
    if not _PRIV or not REEMPLAZOS_PUBLICO:
        aborta('falta private/demo_publico.json: sin él quedarían nombres de Lawang en el ERP de la instancia')
    host_sb = url[len('https://'):]
    # 0. Sin comentarios, como la pública: los de Lawang cuentan sociedades, personas e incidentes.
    shutil.copy2(os.path.join(LAWANG, 'contracts', 'assets', 'guard.js'), os.path.join(DIST, 'contracts', 'assets', 'guard.js'))
    guard_asistente_admin()   # AXW-136: el admin entra a /asistente/ sin la casilla (como la base)
    limpia_publico(DIST)
    # 1. Guard REAL: el de Lawang tal cual, con la base de la instancia.
    g = os.path.join(DIST, 'contracts', 'assets', 'guard.js')
    for raiz, _d, fichs in os.walk(DIST):
        for f in fichs:
            if not f.endswith(EXT_TEXTO):
                continue
            p = os.path.join(raiz, f)
            t = open(p, encoding='utf-8', errors='replace').read()
            t2 = t.replace(SB_URL, url).replace(SB_HOST + '.supabase.co', host_sb)
            # El cargador del doble de QA (solo localhost+?qa=1) no existe en una instancia real.
            t2 = QA_DOBLE.sub('', t2)
            t2 = SB_KEY_RE.sub(clave, t2)
            for a, b in REEMPLAZOS_PUBLICO:
                t2 = t2.replace(a, b)
            t2 = cambia_lawang(t2).replace('AxisWorks Demo', marca)
            if t2 != t:
                open(p, 'w', encoding='utf-8', newline='').write(t2)
    # URLs limpias (1-oct-2026): TODO lo copiado de Lawang pasa a la raíz del bundle (/home/, /assets/, /clasico/…) antes de
    # escribir nada propio: lo que sigue (ficha, mapa de módulos, pantallas «no instalado») ya habla con las rutas nuevas.
    reraiz(DIST)
    sin_marca_lawang(DIST)
    # ERP F3: su ficha, escrita desde el registro (después de los reemplazos, que ya no la tocan)
    escribe_instancia({'sb_url': url, 'sb_key': clave, 'marca': marca, 'cabecera': marca.upper(), 'subcabecera': 'ERP',
                       'titulo': marca + ' ERP', 'firma_correo': marca,
                       'inicio': '/home/',
                       # F3 lote 3: los de la instancia en erp/instancias.json (hoy ninguna los declara → vacíos)
                       'masterplans': _instancia_registro(nombre).get('masterplans') or {},
                       'proyectos_con_fases': _instancia_registro(nombre).get('proyectos_con_fases') or []})
    # F14: la piel va en la ficha, que cargan en el <head> TODAS las páginas de la instancia (la puerta / y /crea-contrasena/
    # no cargan guard.js: revisor, 11-oct). Se añade después de escribirla: escribe_instancia también sirve a la demo, sin piel.
    piel = piel_instancia(nombre)
    if piel:
        open(os.path.join(DIST, 'contracts', 'assets', 'instancia.js'), 'a', encoding='utf-8', newline='\n').write(piel)
    menu = menu_oscuro_css(nombre)
    if menu:
        hoja = os.path.join(DIST, 'assets', 'shell.css')   # la cargan todas las pantallas de la cáscara v4
        if not os.path.isfile(hoja):
            aborta('menú oscuro: falta assets/shell.css en el paquete')
        open(hoja, 'a', encoding='utf-8', newline='\n').write(menu)
    elegido = seleccion_css(nombre, DIST)   # F14 (bbm-p40): filtro, pestaña o segmento elegido en el acento de la piel
    if elegido:
        hoja = os.path.join(DIST, 'assets', 'shell.css')
        if not os.path.isfile(hoja):
            aborta('elegido: falta assets/shell.css en el paquete')
        open(hoja, 'a', encoding='utf-8', newline='\n').write(elegido)
    # El núcleo «operación» ya está en la base de las instancias del ERP (no aún en Lawang): se enciende.
    # Módulos: el navegador pregunta a la base cuáles están activos al cargar (panel de control, 28-sep-2026). Va en
    # TODA instancia del ERP (antes solo si el registro traía modulos_activos, Des #4).
    mapa = mapa_modulos(nombre)
    plantilla = open(os.path.join(AQUI, 'apagados_instancia.js'), encoding='utf-8').read()
    if '__AXW_MAPA__' not in plantilla:
        aborta('apagados_instancia.js sin el hueco __AXW_MAPA__')
    # sin sus comentarios: se antepone DESPUÉS de limpia_publico.js y son notas internas del estudio
    plantilla = re.sub(r'/\*.*?\*/', '', plantilla, flags=re.S)
    plantilla = re.sub(r'^\s*//[^\n]*\n', '', plantilla, flags=re.M)
    if '__AXW_NO_INSTALADO__' not in plantilla:
        aborta('apagados_instancia.js sin el hueco __AXW_NO_INSTALADO__')
    # la pantalla se inyecta DESPUÉS de quitar comentarios (sus URL llevan «//») y como literal de cadena JS
    no_instalado = no_instalado_base(marca)
    mapa['ni'] = aviso_i18n_js(no_instalado, mapa)   # erp-front 14-oct: «Módulo no instalado» al vuelo en los idiomas de la instancia
    interruptores = (plantilla.replace('__AXW_MAPA__', json.dumps(mapa, ensure_ascii=False, sort_keys=True))
                     .replace('__AXW_NO_INSTALADO__', json.dumps(no_instalado, ensure_ascii=False)) + '\n')
    t = open(g, encoding='utf-8').read()
    # El pop-up de novedades de la intranet son anuncios de LAWANG para su equipo (parcelas, «Bloqueo», venta de equipo): en una
    # instancia no sale, como en la demo (idiomas-pH, 12-oct; orquestador: «contenido de un cliente visible en la instancia de otro»).
    # novedades.js lo carga nav.js por JS, después de guard.js, y vuelve sin pintar nada si encuentra __lwNovedades ya puesto.
    comprueba_novedades_apagable()
    open(g, 'w', encoding='utf-8', newline='').write(
        '/* GENERADO por AxisWorks/comercial/demo-erp/build.py --instancia %s — no editar. */\n'
        'window.AXW_NUCLEO_OPERACION = true;\nwindow.__lwNovedades = true;\n' % nombre + interruptores + t + setup_para_guard() + capa_facturas_prueba(nombre))
    capa_modulos_hub(interruptores)
    for raiz, dirs, fichs in os.walk(DIST, topdown=False):
        for f in fichs + dirs:
            nuevo = f
            for a, b in REEMPLAZOS_PUBLICO:
                nuevo = nuevo.replace(a, b)
            nuevo = nuevo.replace('Lawang', 'Axw')
            if nuevo != f:
                os.replace(os.path.join(raiz, f), os.path.join(raiz, nuevo))
    logos_instancia(nombre, marca)
    # /favicon.ico, como la demo: la Home v4 no lleva <link rel=icon> y el navegador lo pide solo (404 en producción, p33 13-oct)
    shutil.copy2(os.path.join(DIST, 'favicon.png'), os.path.join(DIST, 'favicon.ico'))
    crea_contrasena_pantalla(marca)   # pieza C de I6 (9-oct-2026): «Crea tu contraseña» para el primer administrador invitado
    piel_suite_clasica(DIST, nombre)   # tras el renombrado (axw.css) y tras crea-contrasena; antes de versiona()
    piel_v4_fijos(DIST, nombre)        # colores de Lawang a mano en la cáscara v4 (antes de versiona())
    puerta_instancia(DIST, idiomas)   # selector de idioma visible, correo neutro, marca centrada (12-oct)
    tipografias_libres()
    sistema_instancia(nombre)   # tras tipografias_libres (que deja Jost/Cormorant de Google) y antes de versiona()
    neutraliza_ejemplos()   # ejemplos de persona que casan con gente real (pii_maqueta)
    # 2. Portada = la puerta de acceso, que reraiz() ha subido a la raíz (antes /intranet/). Lo que en la demo es un aviso,
    # aquí dice que no está en esta instancia. /entrar/ y /portal/ no tienen pantalla propia: mandan a la puerta.
    redir = ('<!doctype html><meta charset="utf-8"><title>%s</title>'
             '<script>location.replace("/")</script>' % marca)
    if not os.path.isfile(os.path.join(DIST, 'index.html')):
        aborta('falta la pantalla de acceso (la raíz /): el guard real mandaría a un 404')
    for sitio in ('entrar', 'portal'):
        d = os.path.join(DIST, sitio)
        os.makedirs(d, exist_ok=True)
        open(os.path.join(d, 'index.html'), 'w', encoding='utf-8').write(redir)
    # Solo lo NO PORTADO se sustituye en el build (nunca estará en esta base). Lo apagado se decide en el navegador:
    # se sirve la pantalla y apagados_instancia.js la cambia por «Módulo no instalado» si su módulo está apagado.
    extra_p = _instancia_registro(nombre).get('apagados_extra') or {}
    fuera = {ruta_limpia(u) for u in extra_p.get('p') or []}
    fuera |= set(pantallas_por_tipo(nombre))   # N6.3: lo de otro tipo sale como «Pantalla no incluida» y se lleva sus ficheros, como apagados_extra.p
    rotulos_fuera = {ruta_limpia(u): r for u, r in (extra_p.get('p_rotulos') or {}).items()}
    cargaban = set()   # ficheros que cargaban las pantallas que salen del paquete: candidatos a salir con ellas
    AVISOS_SIN_PANTALLA.clear()
    for u in mapa['xp']:
        f = os.path.join(DIST, *u.strip('/').split('/'), 'index.html')
        if u in fuera and not os.path.isfile(f):
            AVISOS_SIN_PANTALLA.add(u.strip('/') + '/index.html')
            # Una pantalla retirada que el paquete ni siquiera trae (la /clasico/obra/ de bbm, 14-oct): sin su aviso, el servidor daba 403 (carpeta vacía
            # que dejó la publicación anterior) o 404 a quien la tenía guardada. Lleva el mismo «Pantalla no incluida» que las demás.
            os.makedirs(os.path.dirname(f), exist_ok=True)
            open(f, 'w', encoding='utf-8').write('')
        if os.path.isfile(f):
            if u in fuera:
                # Declarada en apagados_extra.p («pantalla no incluida en esta instancia»): no nombra un módulo (taller cuelga de
                # reservas-producto, que SÍ se enciende: decir «Reservas de producto no está activo» sería mentir) y sus ficheros salen con ella.
                cargaban |= ficheros_cargados(f, DIST)
                open(f, 'w', encoding='utf-8').write(pagina_no_instalado(
                    no_instalado, marca, None, u, herramienta=rotulos_fuera.get(u) or mapa['n'].get(mapa['p'].get(u), [u])[0], modulo=mapa['p'].get(u)))
            else:
                open(f, 'w', encoding='utf-8').write(pagina_no_instalado(no_instalado, marca, mapa['n'].get(mapa['p'].get(u)), u, modulo=mapa['p'].get(u)))
    quitados = poda_ficheros_sin_pantalla(DIST, cargaban)
    if quitados:
        print('pantallas fuera del paquete: %d fichero(s) que solo ellas cargaban, fuera: %s' % (len(quitados), ', '.join(quitados)))
    # El panel de control: solo en la instancia que manda (panel_control en erp/instancias.json)
    if _instancia_registro(nombre).get('panel_control'):
        d = os.path.join(DIST, 'panel')
        os.makedirs(d, exist_ok=True)
        panel = open(os.path.join(AQUI, 'panel_control.html'), encoding='utf-8').read()
        if '__AXW_ROTULOS__' not in panel or '__AXW_SETUP__' not in panel or panel.count('__AXW_FUENTES__') != 1:
            aborta('panel_control.html sin el hueco __AXW_ROTULOS__, __AXW_SETUP__ o __AXW_FUENTES__ (una vez)')
        open(os.path.join(d, 'index.html'), 'w', encoding='utf-8', newline='').write(
            panel_nav(panel, 'modulos').replace('__AXW_ROTULOS__', json.dumps(rotulos(), ensure_ascii=False, sort_keys=True).replace('</', '<\\/'))
            .replace('__AXW_SETUP__', json.dumps(setup_para_panel(), ensure_ascii=False, sort_keys=True).replace('</', '<\\/'))
            .replace('__AXW_FUENTES__', fuentes_panel()))
        # La vista «Pilotos» (1-oct-2026, encargos/20261001_panel_pilotos_vista.md): /panel/pilotos/, mismo CSS. Esta página
        # NO lleva su contenido (/panel/ es público): lo pide a la edge erp-control (acción `pilotos`, solo operador).
        d_pil = os.path.join(d, 'pilotos')
        os.makedirs(d_pil, exist_ok=True)
        pilotos = open(os.path.join(AQUI, 'panel_pilotos.html'), encoding='utf-8').read()
        open(os.path.join(d_pil, 'index.html'), 'w', encoding='utf-8', newline='').write(panel_nav(pilotos, 'pilotos'))
        # La vista «Aprobaciones» (9-oct-2026, AXW-178, owner: «Sí, cólgala»): /panel/aprobaciones/. Mismo patrón que Pilotos: ni lleva
        # contenido ni escribe en la base; pide a la edge `agente-aprobaciones` (aprobar/rechazar, Arrancar/Parar, plazos de datos).
        d_apr = os.path.join(d, 'aprobaciones')
        os.makedirs(d_apr, exist_ok=True)
        aprob = open(os.path.join(AQUI, 'panel_aprobaciones.html'), encoding='utf-8').read()
        open(os.path.join(d_apr, 'index.html'), 'w', encoding='utf-8', newline='').write(panel_nav(aprob, 'aprobaciones'))
        compila_portada('panel/panel.css')   # su Tailwind compilado: la CSP de la instancia no admite el Play CDN
    for ruta, herr in (('generador-contratos/index.html', 'Generador de contratos'),
                       ('contratos-inversor/index.html', 'Portal del comprador'),
                       ('contracts/app.html', 'Generador de contratos'),
                       ('clasico/dossier/builder.html', 'Dossier comercial'),
                       ('clasico/creatividades/index.html', 'Creatividades')):
        d = os.path.join(DIST, *ruta.split('/'))
        os.makedirs(os.path.dirname(d), exist_ok=True)
        open(d, 'w', encoding='utf-8').write(pagina_no_instalado(no_instalado, marca, None, '/' + ruta, herramienta=herr))
    # con idiomas, el aviso de la instancia en sus idiomas («Pantalla no incluida»); sin ellos, el de siempre
    avisos_para_rotos(pagina=(lambda r: pagina_no_instalado(no_instalado, marca, None, r, herramienta=r)) if AVISO_IDIOMAS else None)
    # bbm-p42b: los colores de Lawang que quedan a fuego (editores, cajones, papel) a la piel; tras TODO lo que escribe páginas
    # (pagina_no_instalado también lleva el verde) y antes de versiona(), para que el ?v= cambie con ellos
    print('colores de Lawang a la piel: %d' % piel_colores_lawang(DIST, nombre))
    # ?v= con la huella de lo que SALE de este build, como en la demo pública (28-sep-2026). Sin esto, la v4 llevaba el
    # ?v= del fichero de Lawang (guard.js se reescribe entero aquí: mapa de módulos + ficha) y /panel/ iba sin versión:
    # Hostinger cachea 7 días y el verificador vio el guard.js viejo en /panel/ tras publicar.
    mascota_versionada(DIST)   # y la mascota, que nav.js pide con MASCOTA_V (revisor, 12-oct)
    favicon_versionado(DIST)   # y el favicon, que versiona() no toca (Calidad, 12-oct: bbm servía el icono viejo sin ?cb)
    versiona(DIST)
    # Lo que SALE lleva UNA copia de Ajustes › Correo (10-oct-2026): se mide aquí, sobre el fichero ya reescrito por limpia_publico.js, y no
    # solo al entrar. Vale para el paquete entero.
    aj = os.path.join(DIST, 'assets', 'ajustes.js')
    if not os.path.isfile(aj):
        aborta('el paquete de la instancia no trae assets/ajustes.js (la pantalla Ajustes es de la base)')
    ajustes_correo_una_copia(open(aj, encoding='utf-8').read(), 'assets/ajustes.js del paquete de ' + nombre)
    # 3. Comprobaciones: ni rastro de la base de Lawang ni de la demo, ni de ninguna clave que no sea publicable.
    restos = rastros_en(DIST)
    if restos:
        aborta('el build de la instancia no está limpio:\n  ' + '\n  '.join(restos[:40]))
    comprueba_piel(DIST, nombre)
    if idiomas:
        comprueba_idiomas(DIST, idiomas)
        comprueba_documento_idiomas(DIST, idiomas)
        comprueba_pantallas_idiomas(DIST, idiomas)
    comprueba_resultado(DIST)
    # 4. Copia al clon del repo privado de la instancia (gitignored en la agencia).
    destino = os.path.join(DESPLIEGUES, nombre)
    if os.environ.get('AXW_PRUEBA_DESPLIEGUE'):
        # Prueba local (1-oct-2026): el paquete sale a otra carpeta, FUERA de la agencia, y no toca erp/despliegues/<nombre>/
        # (el clon que se publica). Sin esto, probar el build de una instancia vaciaba el paquete de producción.
        destino = os.path.abspath(os.environ['AXW_PRUEBA_DESPLIEGUE'])
        if os.path.normcase(destino).startswith(os.path.normcase(AGENCIA) + os.sep):
            aborta('AXW_PRUEBA_DESPLIEGUE tiene que estar fuera de la agencia: ' + destino)
    else:
        r = subprocess.run(['git', 'check-ignore', '-q', os.path.join(destino, 'x.html')], cwd=AGENCIA)
        if r.returncode != 0:
            aborta('erp/despliegues/ no está en .gitignore de la agencia: el build real acabaría en su repo')
    os.makedirs(destino, exist_ok=True)
    for x in os.listdir(destino):
        if x == '.git':
            continue
        p = os.path.join(destino, x)
        shutil.rmtree(p) if os.path.isdir(p) else os.remove(p)
    for x in os.listdir(DIST):
        s_ = os.path.join(DIST, x)
        shutil.copytree(s_, os.path.join(destino, x)) if os.path.isdir(s_) else shutil.copy2(s_, destino)
    open(os.path.join(destino, '.htaccess'), 'w', encoding='utf-8', newline='\n').write(HTACCESS_INSTANCIA.format(
        nombre=nombre, dominio=dominio, sb=host_sb, legado=legado_htaccess(destino),
        dominio_re='(' + '|'.join(re.escape(d) for d in [dominio] + _instancia_alias(nombre)) + ')'))
    open(os.path.join(destino, 'robots.txt'), 'w', encoding='utf-8', newline='\n').write('User-agent: *\nDisallow: /\n')
    comprueba_resultado(destino)
    if '--panel-contra-publicado' in sys.argv:
        # Después de TODAS las comprobaciones del build (que miden el panel tal como lo escribe el build, con sus enlaces de la raíz
        # limpia): esta adaptación apunta a la estructura vieja de producción, que comprueba_resultado daría por «enlace roto».
        if not _instancia_registro(nombre).get('panel_control'):
            aborta('--panel-contra-publicado solo vale para una instancia con panel_control: true; %s no lo tiene' % nombre)
        cambios = panel_contra_publicado(os.path.join(destino, 'panel'), publicado_de_clon(nombre))
        for ruta, nueva, huella in cambios:
            print('panel contra lo publicado: %s -> %s%s' % (ruta, nueva, (' ?v=' + huella) if huella else ''))
        if not cambios:
            print('panel contra lo publicado: ya coincidía, sin cambios')
    total = sum(len(f) for r_, _d, f in os.walk(destino) if '.git' not in r_.split(os.sep))
    print('OK instancia %s en %s: %d ficheros, guard real contra %s' % (nombre, os.path.relpath(destino, AGENCIA), total, host_sb))


# Lo que el registro dice que lee la BASE y se le perdona, uno a uno y con su porqué (revisor, 27-sep: nada de exención
# en bloque). Si la base empieza a leer algo que no está aquí, el build para. En erp/modulos.json la base se lleva los
# ficheros compartidos de la v4 (contracts/assets, intranet/v4/assets): panel-gastos.js, los subidores de fotos y
# documentos, el paso de reservas… Esas llamadas solo corren desde la pantalla de su propio módulo, que con el módulo
# apagado ni se sirve ni sale en el menú (apagados_instancia.js, F4). Lo que sí lee la Home (contadores de contratos,
# reservas, facturas y comisiones) da cero con el módulo apagado: la RLS restrictiva de F4 devuelve vacío, no error.
EXENTOS_BASE = {
    'comisiones': 'Home cuenta comisiones pendientes; atribución de closer y referidos corren en la pantalla del CRM/comisiones',
    'contratos': 'Home cuenta firmas pendientes; contratos-firmados es el bucket que abre la pantalla de contratos; borrar_operacion (dueño contratos desde el 5-oct-2026) solo corre desde la ficha de operaciones',
    'deck': 'edge ficheros (base): sus RPC deck_* solo corren en la clase deck_foto, la acción deck_activa y su reconciliador (AXW-66, 28-sep)',
    'facturas': 'Home cuenta facturas con saldo; justificantes lo sube la pantalla de recibos/facturas',
    'gastos': 'panel-gastos.js y gasto_justificante_registra solo corren en /v4/gastos/',
    'modelos': 'subidores de fotos y documentos del modelo y del deck: solo en /v4/modelos/',
    'obra': 'obra_foto_registra: solo en /v4/obra/',
    'proyectos': 'documentación de proyecto y unidades: solo en /v4/proyectos/; Home cuenta unidades',
    'recibos': 'recibi_aplicaciones: solo en /v4/recibos/',
    'reservas': 'prórroga, liberación y vencimientos: pantalla de reservas; Home cuenta las que vencen',
}


def packs_casan(catalogo=None, modulos_json=None):
    """Los packs de catalogo.js tienen que casar con el registro del ERP (owner, 27-sep: «los módulos que dependen de
    otros van en pack sí o sí»). Para cada módulo, todo lo que su código lee (erp/modulos.json → depende, cerrado
    transitivamente) tiene que estar en su mismo pack o en los packs que ese pack necesita. Un suelto no puede leer
    nada fuera de la base. Una pestaña de otra pantalla (PESTANAS) va donde esté esa pantalla. La base solo se exime de
    lo que está en EXENTOS_BASE y las lecturas exentas salen del registro (depende_blanda). Una clave que el registro no conoce para el build: no se da por buena sin mirarla.
    Prueba: test_packs_casan.py."""
    registro = json.load(open(modulos_json or os.path.join(AGENCIA, 'erp', 'modulos.json'), encoding='utf-8'))['modulos']
    r = subprocess.run(['node', '-e', "global.window={};global.localStorage={getItem:function(){return null},setItem:function(){}};"
                        "require(process.argv[1]);var C=window.AXW_CATALOGO;"
                        "console.log(JSON.stringify({packs:C.PACKS,sueltos:C.SUELTOS,modulos:C.MODULOS.map(function(m){return m[0]}),"
                        "pestanas:Object.keys(C.PESTANAS),rutas:C.RUTAS}))",
                        os.path.abspath(catalogo or os.path.join(AQUI, 'catalogo.js'))], capture_output=True, text=True, encoding='utf-8')
    if r.returncode:
        aborta('no puedo leer catalogo.js: ' + r.stderr[:300])
    cat = json.loads(r.stdout)
    # Clave del catálogo → clave del registro (nombres distintos para lo mismo; pestañas y pantallas de un módulo).
    alias = {'crm': 'leads', 'setter': 'leads', 'campanas': 'leads', 'comisionadmin': 'comision-admin',
             'home': 'base', 'usuarios': 'base', 'ajustes': 'base', 'peticiones': 'asistente',
             'asistente': 'asistente-correos'}   # AXW-136 (2-oct): en el catálogo `asistente` son las respuestas de correo (módulo `asistente-correos`) y `peticiones` el de las peticiones (módulo `asistente`)
    reg = lambda k: alias.get(k, k)
    desconocidas = sorted(k for k in cat['modulos'] if reg(k) not in registro)
    if desconocidas:
        aborta('módulos del catálogo que erp/modulos.json no conoce (añádelos al registro o al alias): ' + ', '.join(desconocidas))
    nuevas_base = sorted(set(registro['base'].get('depende') or []) - set(EXENTOS_BASE))
    if nuevas_base:
        aborta('la base lee módulos que no están en EXENTOS_BASE (mira si de verdad corren sin ellos): ' + ', '.join(nuevas_base))
    # Exenciones de lectura (AXW-136/AXW-213, 2-oct-2026): UNA sola fuente, el registro (`depende_blanda` de erp/modulos.json,
    # que erp/modulos.py calcula por OBJETO y con su porqué). Una dependencia blanda no se arrastra al pack (alcance() solo
    # sigue `depende`). Aquí se comprueba que la exención declarada tenga sentido: si el módulo leído no existe, no trae
    # porqué, no nombra objetos o nombra uno que ese módulo no tiene, está huérfana; y si además sigue en `depende` el
    # registro se contradice (otra lectura del mismo módulo la volvió dura y entonces manda la dura).
    for k, m in registro.items():
        for d, ex in (m.get('depende_blanda') or {}).items():
            if d not in registro:
                aborta('depende_blanda: %s exime de %s, que no está en erp/modulos.json' % (k, d))
            if d in (m.get('depende') or []):
                aborta('depende_blanda: %s exime de %s pero también lo lee de forma dura (depende): una lectura no exenta manda' % (k, d))
            if not ex.get('objetos') or not (ex.get('porque') or '').strip():
                aborta('depende_blanda: %s -> %s sin objetos o sin porqué' % (k, d))
            propios = set(registro[d].get('tablas') or []) | set(registro[d].get('funciones') or []) | set(registro[d].get('edges') or [])
            ajenos = sorted(set(ex['objetos']) - propios)
            if ajenos:
                aborta('depende_blanda: exención huérfana %s -> %s, %s no es un objeto de %s' % (k, d, ', '.join(ajenos), d))
    def alcance(k, visto):
        for d in registro[k].get('depende') or []:
            if d not in registro:
                aborta('%s depende de %s, que no está en erp/modulos.json' % (k, d))
            if d not in visto:
                visto.add(d)
                # La base va siempre en la instalación: lo que ella lee ya lo vigila `nuevas_base` contra EXENTOS_BASE y no
                # se arrastra a quien depende de ella (AXW-130 metió deck y gastos en su «depende» y cada módulo del núcleo
                # los heredó por contratos→base, 1-oct-2026).
                if d != 'base':
                    alcance(d, visto)
        return visto
    packs = {p[0]: p for p in cat['packs']}
    def necesita(claves):
        res, cola = set(), list(claves)
        while cola:
            c = cola.pop()
            if c not in res:
                res.add(c)
                cola += packs[c][4]
        return res
    donde = {}
    for p in cat['packs']:
        for k in p[3]:
            donde[k] = necesita([p[0]])
    for k, req in cat['sueltos']:
        donde[k] = necesita(req) | {'suelto:' + k}
    sin_sitio = [k for k in cat['modulos'] if k not in donde]
    if sin_sitio:
        aborta('módulos del catálogo sin pack ni suelto: ' + ', '.join(sin_sitio))
    disponible = {}   # clave del registro → claves del catálogo que la traen
    for k in donde:
        disponible.setdefault(reg(k), []).append(k)
    fallos = []
    for k, ps in donde.items():
        if reg(k) == 'base':
            continue
        for d in sorted(alcance(reg(k), set()) - {'base', reg(k)}):
            if not [x for x in disponible.get(d, []) if donde[x] <= ps]:
                fallos.append('%s lee %s, que no está en su pack ni en los que su pack necesita' % (k, d))
    for k in cat['pestanas']:   # vive dentro de la pantalla de otro módulo: ese módulo tiene que venir con ella
        duenos = [x for x in disponible.get(reg(k), []) if x != k and x in cat['rutas']]
        if not [x for x in duenos if donde[x] <= donde[k]]:
            fallos.append('%s es una pestaña de %s y puede quedar encendida sin su pantalla' % (k, ', '.join(duenos) or '?'))
    if fallos:
        aborta('los packs de catalogo.js no casan con erp/modulos.json:\n  ' + '\n  '.join(fallos))

# Opciones retiradas: se RECHAZAN, no se ignoran. Ignorada, una orden vieja
# (`--instancia X --solo-ajustes-correo`) haría el build completo y reescribiría
# erp/despliegues/<instancia>, el clon que se publica (revisor, 11-oct-2026).
OPCIONES_RETIRADAS = {
    '--solo-ajustes-correo': 'se retiró el 11-oct-2026 junto con la vía de erp/publica_instancia.py; '
                             'el bloque de Correo va en el build normal',
}


def rechaza_retiradas(argv):
    for op, porque in OPCIONES_RETIRADAS.items():
        if op in argv:
            aborta('%s %s. No se ha construido nada.' % (op, porque))


def main():
    rechaza_retiradas(sys.argv)   # antes de vaciar dist/ ni tocar nada
    packs_casan()
    if not os.path.isfile(DOBLE_QA):
        aborta('falta proyectos/Lawang/_qa_double_guard.js (gitignored: vive solo en este equipo)')
    comprueba_salida()
    # Se vacía por dentro (no se borra la carpeta): presentar.cmd puede tenerla servida.
    os.makedirs(DIST, exist_ok=True)
    for x in os.listdir(DIST):
        p = os.path.join(DIST, x)
        shutil.rmtree(p) if os.path.isdir(p) else os.remove(p)
    copia_v4()
    cifra_cuenta()   # 15-oct: los contadores no dicen «0» (se quita al subir el fijado de Lawang por encima de 671a23edf)
    if '--instancia' in sys.argv:
        # El guard real manda a la puerta (antes /intranet/, ahora la raíz tras reraiz): es la pantalla de acceso de verdad.
        copia(os.path.join(LAWANG, 'intranet', 'index.html'), os.path.join(DIST, 'intranet', 'index.html'))
    faltan = cierra_referencias()
    tokens_solo_etiquetas()   # antes de cualquier filtro de rastro: se publica el extracto, no el fichero de Lawang
    if '--instancia' in sys.argv:
        i = sys.argv.index('--instancia')
        if i + 1 >= len(sys.argv):
            aborta('uso: build.py --instancia <nombre de erp/instancias.json>')
        return instancia(sys.argv[i + 1])
    # Solo la demo: el portal de clientes del ERP con los datos del doble (las instancias no llevan /portal/ propio).
    portal_lawang()
    cifra_cuenta_portal()   # 15-oct: el importe del portal no dice «0» (se quita con cifra_cuenta() al subir el fijado)
    faltan |= cierra_referencias()
    g = os.path.join(DIST, 'contracts', 'assets', 'guard.js')
    os.makedirs(os.path.dirname(g), exist_ok=True)
    open(g, 'w', encoding='utf-8', newline='').write(guard_demo())
    escribe_instancia({'sb_url': 'https://demo.invalid', 'sb_key': 'sb_publishable_demo', 'marca': DEMO['marca'],
                       'cabecera': DEMO['cabecera'], 'subcabecera': DEMO['subcabecera'], 'titulo': DEMO['marca'],
                       'firma_correo': DEMO['marca']})
    piel_demo()
    # URLs limpias (1-oct-2026): lo copiado de Lawang (incluido el guard falso de arriba) pasa a la raíz; paginas_propias()
    # y lo que sigue escriben ya con las rutas nuevas.
    reraiz(DIST)
    sin_marca_lawang(DIST)
    paginas_propias()
    engancha_flujo()
    marca_agua_documentos()
    comprueba_novedades_apagable()
    idioma_ingles()
    avisos_para_rotos(demo=True)
    n = neutraliza()
    comprueba_portal()
    verifica()
    comprueba_resultado(DIST)
    total = sum(len(f) for _r, _d, f in os.walk(DIST))
    print('OK dist/: %d ficheros · %d con Supabase neutralizado' % (total, n))
    if faltan:
        print('Referencias que no existen en Lawang (no se copian): ' + ', '.join(sorted(faltan)[:15]))
    if '--publico' in sys.argv:
        publica()


if __name__ == '__main__':
    main()
