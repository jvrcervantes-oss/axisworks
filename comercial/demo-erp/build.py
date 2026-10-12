#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Demo del ERP (intranet v4 de Lawang) para enseñar a prospectos SIN darles acceso — 24-sep-2026.

    python build.py            # genera dist/ desde proyectos/Lawang (en disco, tal cual esté hoy)
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
# AXW_AGENCIA_RAIZ: raíz de la AGENCIA (donde viven erp/, tools/, private/ y proyectos/Lawang) cuando se construye desde una copia de
# sesión de AxisWorks, que vive en _sesiones/<id>/AxisWorks y no cuatro niveles bajo la agencia: apunta a la copia de sesión de la agencia.
AGENCIA = os.path.abspath(os.environ.get('AXW_AGENCIA_RAIZ') or os.path.join(AQUI, '..', '..', '..', '..'))
# AXW_LAWANG_RAIZ: construir desde una copia de sesión (tools/sesion.py) en vez del clon principal, para probar un
# cambio del núcleo ANTES de aterrizarlo (26-sep-2026, F3 lote 2b).
LAWANG = os.path.abspath(os.environ.get('AXW_LAWANG_RAIZ') or os.path.join(AGENCIA, 'proyectos', 'Lawang'))
# El doble de QA está gitignorado: no viaja a las copias de sesión. Se lee del clon principal (solo lectura).
DOBLE_QA = next((d for d in (os.path.join(LAWANG, '_qa_double_guard.js'),
                             os.path.join(AGENCIA, 'proyectos', 'Lawang', '_qa_double_guard.js')) if os.path.isfile(d)),
                os.path.join(LAWANG, '_qa_double_guard.js'))
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
                            r'riverfront|bali\s*moto|bali2komodo|' + SB_HOST)
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
    if os.path.normcase(os.path.realpath(LAWANG)) in d:
        aborta('la salida cae dentro de proyectos/Lawang')
    r = subprocess.run(['git', 'check-ignore', '-q', os.path.join(DIST, 'x.html')], cwd=AQUI)
    if r.returncode != 0:
        aborta('dist/ no está en .gitignore del repo AxisWorks: el webhook lo publicaría')


def rel(p):
    return '/' + os.path.relpath(p, DIST).replace(os.sep, '/')


def copia(src_abs, dst_abs):
    if not src_abs.lower().endswith(EXT_OK):
        return False
    if PROHIBIDO.search('/' + os.path.relpath(src_abs, LAWANG).replace(os.sep, '/')):
        return False
    os.makedirs(os.path.dirname(dst_abs), exist_ok=True)
    shutil.copy2(src_abs, dst_abs)
    return True


def copia_v4():
    base = os.path.join(LAWANG, 'intranet', 'v4')
    for raiz, dirs, fichs in os.walk(base):
        rel_raiz = os.path.relpath(raiz, base)
        if rel_raiz == '.':
            dirs[:] = [d for d in dirs if d not in FUERA_V4]
        dirs[:] = [d for d in dirs if not d.startswith('_')]
        for f in fichs:
            s = os.path.join(raiz, f)
            copia(s, os.path.join(DIST, 'intranet', 'v4', os.path.relpath(s, base)))
    copia(os.path.join(LAWANG, 'favicon.png'), os.path.join(DIST, 'favicon.png'))
    # El CRM de leads (v3) está en el menú de la v4.
    for f in ('index.html', 'leads.css', 'leads.js'):
        copia(os.path.join(LAWANG, 'intranet', 'leads', f), os.path.join(DIST, 'intranet', 'leads', f))


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
         "createSignedUrl: function (path) { return Promise.resolve({ data: { signedUrl: 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 4 3%22%3E%3Crect width=%224%22 height=%223%22 fill=%22%23e7e5df%22/%3E%3C/svg%3E' }, error: null }); },"),
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
    volver = ("window.__lwNovedades = true;\n"
              "['/demo/catalogo.js','/demo/modulos.js','/demo/tour.js','/demo/cascara.js','/flujo/nuevo-contrato.js'].filter(function(u){"
              "return u.indexOf('/flujo/')!==0||location.pathname.indexOf('/portal/')!==0;}).forEach(function(u){var s=document.createElement('script');"
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
  function noDemo(que) { var e = new Error(que + ': no disponible en la demo'); e.clave = 'no_disponible_en_la_demo'; return Promise.reject(e); }
  fija('LW_SB_URL', URL_SB);
  fija('LW_SB_KEY', FICHA.sb_key || 'demo-publishable-key');
  fija('lwEdge', function (nombre) {
    if (!/^[a-z0-9-]+$/.test(String(nombre))) throw new Error('lwEdge: nombre de edge no válido');
    return URL_SB + '/functions/v1/' + nombre;
  });
  fija('lwDatos', function (nombre, args) {
    if (!/^[a-z][a-z0-9_]*_datos$/.test(String(nombre))) throw new Error('lwDatos: solo RPC *_datos (' + nombre + ')');
    if (!(window.LW_DEMO_DATOS && Object.prototype.hasOwnProperty.call(window.LW_DEMO_DATOS, nombre))) {
      return Promise.resolve({ data: null, error: { message: 'no disponible en la demo' } });
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
    """Tailwind COMPILADO de la portada (ERP F3 lote 4a, 27-sep-2026): landing.html pintaba con el Play CDN, que la CSP
    de demo.axisworks.studio ya no admite. Su tema (el config que llevaba en línea) vive en tailwind.json, al lado; lo
    compila la misma herramienta que el de Lawang (tools/empaqueta_css.py de la agencia: binario v3.4.17 verificado
    por SHA256) a dist/demo/landing.css. Se compila en cada build: nunca se queda atrás de landing.html."""
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
        config_portada(open(os.path.join(AQUI, 'landing.html'), encoding='utf-8').read(), ''))
    os.makedirs(os.path.join(DIST, 'demo'), exist_ok=True)
    compila_portada('demo/landing.css')
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
    open(os.path.join(d, 'builder.html'), 'w', encoding='utf-8').write(aviso.format(
        t='Sales brochure', m=AVISO_NO_INCLUIDO + ' the brochure carries each client\'s own brand material.'))
    d = os.path.join(DIST, 'clasico', 'creatividades')   # está en el menú de la v4; sin esto, 404 en directo
    os.makedirs(d, exist_ok=True)
    open(os.path.join(d, 'index.html'), 'w', encoding='utf-8').write(aviso.format(
        t='Creatives', m='We show each project\'s asset library on the call: they are the client\'s real ads.'))
    # /entrar/ (el acceso de la intranet real) lleva a la portada de dos puertas: en la demo no hay contraseña.
    os.makedirs(os.path.join(DIST, 'entrar'), exist_ok=True)
    open(os.path.join(DIST, 'entrar', 'index.html'), 'w', encoding='utf-8').write(redir.replace('/home/', '/'))
    # /portal/: el portal de cliente de la demo (paquete B) cuando llegue; hasta entonces, un aviso que no engaña.
    os.makedirs(os.path.join(DIST, 'portal'), exist_ok=True)
    open(os.path.join(DIST, 'portal', 'index.html'), 'w', encoding='utf-8').write(AVISO_DEMO.format(
        t='Client portal', m='The client portal of the demo opens here in its next update. Meanwhile, the intranet shows '
                             'every client\'s record with their contracts, invoices and payments.'))


FLUJO = os.path.join(AQUI, 'flujo')
FLUJO_FICHEROS = ('textos.js', 'contrato_ejemplo.js', 'nuevo-contrato.js', 'flujo.css')
FLUJO_PORTAL = ('portal.js', 'portal.css')
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
    """El pop-up de novedades de la intranet (anuncios internos del cliente) se apaga en la demo poniendo __lwNovedades antes de
    que cargue: aprovecha su guarda contra doble carga. Si Lawang la cambia, el pop-up volvería sin avisar: el build para."""
    p = os.path.join(DIST, 'assets', 'novedades.js')
    if os.path.isfile(p) and NOVEDADES_APAGA not in open(p, encoding='utf-8').read():
        aborta('novedades.js ya no trae %r: la demo no puede apagar el pop-up de novedades (revisa guard_demo)' % NOVEDADES_APAGA)


def marca_agua_documentos():
    p = os.path.join(DIST, 'clasico', 'facturas', 'documento.js')
    t = open(p, encoding='utf-8').read()
    open(p, 'w', encoding='utf-8', newline='').write(_una_vez(t, DOC_CIERRE, DOC_MARCA, 'documento.js (marca de agua de la demo)'))


def engancha_flujo():
    """Paquete B de la demo para un cliente (12-oct-2026): «New contract» y la firma de ejemplo (flujo/, un panel dentro de la
    intranet que escribe en la base falsa de la pestaña) y el portal de cliente (flujo/portal/). Se publican en /flujo/ y
    /portal/, pasan por los mismos filtros que el resto (neutraliza, RASTRO, pii, comprueba_sin_secretos) y sustituyen a los
    avisos «Not included» del generador y del portal."""
    destino = os.path.join(DIST, 'flujo')
    os.makedirs(os.path.join(destino, 'portal'), exist_ok=True)
    for f in FLUJO_FICHEROS:
        shutil.copy2(os.path.join(FLUJO, f), os.path.join(destino, f))
    for f in FLUJO_PORTAL:
        shutil.copy2(os.path.join(FLUJO, 'portal', f), os.path.join(destino, 'portal', f))
    shutil.copy2(os.path.join(FLUJO, 'portal', 'index.html'), os.path.join(DIST, 'portal', 'index.html'))
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


def avisos_para_rotos(demo=False):
    """Cada herramienta enlazada que la demo no trae enseña el aviso, no un 404. `demo`: el de la demo para un cliente (en
    inglés, AVISO_DEMO); sin él, el de siempre, que es el que usan las instancias."""
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
        open(os.path.join(d, 'index.html'), 'w', encoding='utf-8').write(texto)


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
            aviso_propio = r in ('/contracts/app.html', '/clasico/dossier/builder.html') and os.path.getsize(p) < 5000 and \
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
    with open(envoltorio, 'w', encoding='utf-8') as fh:
        fh.write('<script>' + open(os.path.join(DIST, 'contracts', 'assets', 'guard.js'), encoding='utf-8').read() + '</script>')
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


# Lo que la portada de dos puertas necesita además de su HTML: las dos fuentes de la web de AxisWorks (autoalojadas, Legal
# 24-sep: sin Google Fonts), del propio repo.
FUENTES_PUERTA = ('inter-400-latin.woff2', 'inter-500-latin.woff2', 'space-grotesk-500-latin.woff2')
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
        shutil.copy2(os.path.join(AQUI, '..', '..', 'assets', 'fonts', f), os.path.join(fuentes, f))


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


def menu_oscuro_css(nombre):
    """La regla CSS del menú oscuro de la instancia, o '' si no lo declara. Requiere piel."""
    if _instancia_registro(nombre).get('menu') != 'oscuro':
        return ''
    p = _piel_preset(nombre)
    if p is None:
        aborta('menu "oscuro" de %s sin piel: el menú se pinta con los colores de su preset' % nombre)
    D = _deriva()
    tinta, fondo, acento = tuple(p['on-background']), tuple(p['background']), tuple(p['accent-gold'])
    acento_menu, _p = D.minimo_p(acento, fondo, [tinta])   # el acento, aclarado lo justo para 4,5:1 sobre la tinta
    m = {'surface-container-low': tinta, 'surface-container': D.mix(tinta, fondo, 0.10),
         'surface-container-high': D.mix(tinta, fondo, 0.16), 'on-surface': fondo,
         'on-surface-variant': D.mix(fondo, tinta, 0.12), 'outline': D.mix(fondo, tinta, 0.30),
         'primary': acento_menu, 'primary-container': acento_menu, 'deep-lagoon': acento_menu, 'on-primary': tinta}
    parejas = [(t, f) for t in ('on-surface', 'on-surface-variant', 'outline')
               for f in ('surface-container-low', 'surface-container', 'surface-container-high')]
    parejas += [('deep-lagoon', 'surface-container-low'), ('on-primary', 'primary-container')]
    bajas = ['%s/%s %.2f' % (a, b, D.contraste(m[a], m[b])) for a, b in parejas if D.contraste(m[a], m[b]) < 4.5]
    if bajas:
        aborta('menú oscuro de %s por debajo de 4,5:1: %s' % (nombre, ', '.join(bajas)))
    cuerpo = ';'.join('--tema-%s:%d %d %d' % ((k,) + tuple(v)) for k, v in sorted(m.items()))
    return '\n%s{%s}\n' % (MENU_SELECTOR, cuerpo)


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
                  ('--muted', 'on-surface-variant'))
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
                     ('--muted', '--paper'), ('--linen', '--dl'), ('--ink', '--rl'))


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
    'Reservas de producto': {'en': 'Product bookings', 'id': 'Booking sewa motor'},
    'Puesta en marcha': {'en': 'Setup', 'id': 'Pengaturan awal'},
}


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
]


REF_INTERNA = re.compile(r'\s*\((?:LAW|AXW|BBM|EST)-\d+\)|(?:LAW|AXW|BBM|EST)-\d+')
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
    r = subprocess.run(['node', os.path.join(AQUI, 'limpia_publico.js'), DIST], cwd=AQUI)
    if r.returncode != 0:
        aborta('limpia_publico.js no pudo quitar los comentarios de algún fichero (ver arriba)')
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
    if not PRUEBA_ORIGENES and not DESTINO_PUBLICO.endswith(os.path.join('AxisWorks', 'dist', 'demo-erp')):
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
    # 301 en una subida aparte, ya verificado (decisión por defecto del 12-oct en el encargo).
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
PORTADA_SOLO = ('index.html', 'demo/landing.css', 'demo/roi.js')
LISTA_WEB = ('index.html', 'demo/landing.css', 'demo/catalogo.js', 'demo/roi.js', 'favicon.png', 'favicon.ico',
             'robots.txt', '.htaccess')
CONFIG_PORTADA_RE = re.compile(r'<script id="?axw-config"?>[\s\S]*?</script>')
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
    if not PRUEBA_ORIGENES and not destino.endswith(os.path.join('AxisWorks', 'dist', 'erp-web')):
        aborta('destino de la portada inesperado: ' + destino)
    os.makedirs(destino, exist_ok=True)
    for x in os.listdir(destino):
        p = os.path.join(destino, x)
        shutil.rmtree(p) if os.path.isdir(p) else os.remove(p)
    for f in LISTA_WEB:
        if f in ('index.html', 'robots.txt', '.htaccess'):
            continue
        s = os.path.join(DIST, f.replace('/', os.sep))
        if not os.path.isfile(s):
            aborta('falta en el build lo que la portada necesita: ' + f)
        os.makedirs(os.path.dirname(os.path.join(destino, f.replace('/', os.sep))), exist_ok=True)
        shutil.copy2(s, os.path.join(destino, f.replace('/', os.sep)))
    t = config_portada(open(os.path.join(DIST, 'index.html'), encoding='utf-8').read(), DEMO_URL, APP_URL)
    # Enlaces a la demo, ABSOLUTOS: en erp. una ruta /home/ la manda el .htaccess al ERP real, no a la demo.
    t, n = re.subn(r'''(href=["']?)/home/''', lambda m: m.group(1) + DEMO_URL + '/home/', t)
    if not n:
        aborta('la portada no enlaza la demo (/home/): ¿ha cambiado landing.html?')
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
            'default-src \'self\'; script-src \'self\' \'unsafe-inline\'; style-src \'self\' \'unsafe-inline\' '
            'https://fonts.googleapis.com; font-src \'self\' https://fonts.gstatic.com; img-src \'self\' data:; '
            'connect-src \'self\'; frame-ancestors \'self\'; base-uri \'self\'; form-action \'self\'; object-src \'none\''))
    versiona(destino)
    # Lista cerrada: ni un fichero más ni uno menos.
    hay = sorted(os.path.relpath(os.path.join(r, f), destino).replace(os.sep, '/') for r, _d, fs in os.walk(destino) for f in fs)
    if hay != sorted(LISTA_WEB):
        aborta('dist/erp-web no es la lista cerrada:\n  sobra: %s\n  falta: %s'
               % (sorted(set(hay) - set(LISTA_WEB)), sorted(set(LISTA_WEB) - set(hay))))
    t = open(os.path.join(destino, 'index.html'), encoding='utf-8').read()
    malos = [x for x in ('href="/home', "href='/home", 'href=/home', '/contracts/', '/portal/', '/entrar/',
                         'guard.js', '/demo/tour.js', '/demo/modulos.js') if x in t]
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


# Los textos de pantalla() en apagados_instancia.js: deben ser los mismos que aquí (no_instalado_base lo comprueba).
TEXTOS_NO_INSTALADO = ('Módulo no instalado', ' no está activo en esta instancia.',
                       'Este módulo no está activo en esta instancia.', 'Activar módulo: ')


def pagina_no_instalado(base, marca, ficha, ruta, herramienta=None):
    """La pantalla estática: mismos textos que pantalla() de apagados_instancia.js. `herramienta` (nombre): una pantalla
    que esta instancia no trae aunque su módulo esté encendido (el generador de contratos, el portal clásico…): es
    estática y no sabe qué está activo, así que no nombra el módulo ni invita a contratarlo (revisor, 28-sep)."""
    from urllib.parse import quote
    if herramienta:
        v = {'titulo': 'Pantalla no incluida', 'texto': '«%s» no se incluye en esta instancia.' % herramienta,
             'que_hace': '', 'asunto': '', 'oculta_que_hace': 'hidden', 'oculta_contacto': 'hidden',
             'oculta_reintenta': 'hidden'}
    else:
        nombre, que_hace = ficha or (None, None)
        v = {'titulo': TEXTOS_NO_INSTALADO[0],
             'texto': ('«%s»%s' % (nombre, TEXTOS_NO_INSTALADO[1])) if nombre else TEXTOS_NO_INSTALADO[2],
             'que_hace': que_hace or '', 'asunto': quote(TEXTOS_NO_INSTALADO[3] + (nombre or ruta), safe=''),
             'oculta_que_hace': '' if que_hace else 'hidden', 'oculta_contacto': '', 'oculta_reintenta': 'hidden'}
    cuerpo = re.sub(r'\{\{([a-z_]+)\}\}', lambda m: html.escape(v[m.group(1)]), base)
    return ('<!doctype html>\n<html lang="es"><head><meta charset="utf-8">'
            '<meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex">'
            '<title>%s · %s</title><link rel="icon" href="/favicon.png">'
            '<link href="/assets/fonts/fonts.css" rel="stylesheet">'
            '<link href="/assets/tw-base.css" rel="stylesheet"></head>\n<body>%s</body></html>\n'
            % (html.escape(v['titulo']), html.escape(marca), cuerpo))


def ruta_limpia(u):
    """Una pantalla de erp/modulos.json (/intranet/v4/x/) con la ruta que tiene en el bundle (/x/). Esas claves se comparan
    con location.pathname en el navegador (apagados_instancia.js): sin traducirlas, el apagado de módulos moriría sin
    error. Una ruta que quedara en `/` ocultaría TODOS los enlaces absolutos (a[href^="/"]): se rechaza."""
    n = mapea_url(u)
    if not re.fullmatch(r'/[a-z0-9-]+/(?:[a-z0-9-]+/)?', n):
        aborta('pantalla de módulo sin ruta limpia válida: %s → %s' % (u, n))
    return n


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
    out['xp'] = sorted(xp)
    # n: nombre y «qué hace» de cada módulo, para la pantalla «Módulo no instalado» (28-sep-2026)
    out['n'] = {k: [v[0], v[3]] for k, v in rotulos().items() if k != 'base'}
    return out


# Textos del editor de ficha (editores.js, copia de Lawang): van en español a secas, como el resto de ese formulario (la copia no
# traduce sus avisos y el diccionario i18n.js es de Lawang).
MSG_CAMPO_NO_PEDIBLE = 'Ese dato (nacionalidad, pasaporte / NPWP o estado KYC) no se puede pedir por aquí. Envía una petición libre desde Asistente y la resuelve un administrador.'
NOTA_EDITOR = 'Nacionalidad, pasaporte / NPWP y estado KYC no se piden por aquí: envía una petición libre desde Asistente.'


def _una_vez(texto, viejo, nuevo, donde):
    """Reemplazo LITERAL de algo que tiene que aparecer exactamente una vez: si Lawang cambia ese trozo, el build para (nunca
    un reemplazo que no encuentra nada y deja el permiso o el menú a medias, sin un solo error)."""
    if texto.count(viejo) != 1:
        aborta('%s: esperaba exactamente 1 vez %r y hay %d (¿cambió el fichero de Lawang?)' % (donde, viejo[:90], texto.count(viejo)))
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
COMUN_MARCAS = {'/*AXW_COMUN_CSS*/': 'pantalla_comun.css', '/*AXW_COMUN_JS*/': 'pantalla_comun.js'}


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
                 "  /* TALLER (F8 pieza 2, 8-oct-2026): órdenes de trabajo del taller. Permiso propio `taller` (es el que exigen las RPC orden_trabajo_*); sin esta tarjeta la casilla no existiría en Usuarios. */" + '\n' +
                 "  LW_HERRAMIENTAS.splice(LW_HERRAMIENTAS.findIndex(t => t.herr === 'reservas-producto') + 1, 0," + '\n' +
                 "    { grupo:'Seguimiento', nombre:'Taller', icon:'ph-wrench', href:'/intranet/v4/taller/', herr:'taller'," + '\n' +
                 "      para:'Las motos que entran al taller y por qué: mientras una orden que bloquea esté abierta, la moto no se puede reservar.'," + '\n' +
                 "      claves:'taller orden de trabajo moto reparacion mecanico mantenimiento bloquear reservas workshop repair mechanic maintenance work order' });" + '\n' + "}",
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
    ancla = "maintenance work order' });" + '\n' + "}"
    h = _una_vez(h, ancla,
                 "maintenance work order' });" + '\n' +
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
                 "      claves:'flota motos moto matricula unidades tarifa tarifas precio dias tramo alquiler fleet bikes bike plate units rate rates price days tier rental' });" + '\n' + "}",
                 'herramientas.js tarjeta Flota')
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
                      'Puesta en marcha</button>\n')
AJUSTES_PUESTA_PANEL_ANCLA = '<section id="lw-panel-empresa" role="tabpanel"'
AJUSTES_PUESTA_PANEL = (
    '<section id="lw-panel-puesta" role="tabpanel" aria-labelledby="lw-tab-puesta" data-lw-panel="puesta" class="bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden" hidden>\n'
    '<div class="px-8 pt-8 pb-4 flex flex-col gap-1 border-b border-outline-variant/40">\n'
    '<span class="font-label-md text-[11px] tracking-[0.16em] uppercase text-outline font-bold" data-lwt>Puesta en marcha</span>\n'
    '<h2 class="font-headline-sm text-headline-sm text-deep-lagoon tracking-tight" data-lwt>Lo que hace falta para empezar a facturar, en orden</h2>\n'
    '<p class="font-body-sm text-body-sm text-outline" data-lwt>Cada paso dice si está hecho y dónde se hace. Cuando estén todos, el ERP ya puede facturar.</p>\n'
    '</div>\n'
    '<div id="lw-aj-puesta">\n'
    '<p class="px-8 py-6 font-body-md text-body-md text-on-surface-variant" data-lwt>Trayendo la puesta en marcha…</p>\n'
    '</div>\n'
    '</section>\n\n')
AJUSTES_PESTANAS = "var PESTANAS = ['empresa', 'correo', 'usuarios', 'mantenimiento', 'reservas', 'registro'];"
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
    t = t.replace(m[0], m[0] + '<script src="../assets/ajustes_puesta.js" defer></script>')
    open(pag, 'w', encoding='utf-8', newline='').write(t)
    js = os.path.join(v4, 'assets', 'ajustes.js')
    a = open(js, encoding='utf-8').read()
    a = _una_vez(a, AJUSTES_PESTANAS, AJUSTES_PESTANAS.replace("['empresa',", "['puesta', 'empresa',"), 'ajustes.js PESTANAS')
    a = _una_vez(a, AJUSTES_DEFECTO, AJUSTES_DEFECTO.replace("'empresa';", "'puesta';"), 'ajustes.js pestaña por defecto')
    open(js, 'w', encoding='utf-8', newline='').write(a)
    shutil.copy2(os.path.join(AQUI, 'ajustes_puesta.js'), os.path.join(v4, 'assets', 'ajustes_puesta.js'))


# ── Idiomas de la interfaz por instancia (owner, 11-oct-2026: bbm «Añade Indonesio y quita español») ─────────────────────────────────────────
# Una instancia con `"idiomas": ["id", "en"]` en erp/instancias.json sale en indonesio (el primero, por defecto) e inglés, y el español deja de
# ofrecerse. Todo con reemplazos literales sobre la COPIA (DIST), nunca en Lawang; si Lawang cambia un trozo, el build para. Sin la clave, nada cambia.
# Plan y revisión previa (Calidad + Diseño): encargo estudio_erp_plan_unico F8; lo no traducido cae a INGLÉS y se cuenta (LW_T_CAIDA_EN), lo que
# quede en español se cuenta aparte (LW_T_ESPANOL) para que la prueba pueda ponerse roja.
IDIOMAS_CONOCIDOS = (('id', 'en'),)
# Palabras que en indonesio se escriben igual que en español (Diseño, 12-oct): las únicas traducciones que pueden ser iguales a su clave.
IGUALES_EN_ID = ('CRM', 'Intranet', 'Total', 'Km gratis', 'Panel', 'Bot')
# Lo que hay que tocar en el front copiado: (fichero en DIST, trozo de Lawang, sustituto). Cada trozo tiene que aparecer EXACTAMENTE una vez.
IDIOMAS_PARCHES = (
    ('contracts/assets/idioma.js', "  window.LW_IDIOMA = (v === 'en') ? 'en' : 'es';",
     "  window.AXW_IDIOMAS = __AXW_IDIOMAS__;\n  window.LW_IDIOMA = (window.AXW_IDIOMAS.indexOf(v) >= 0) ? v : window.AXW_IDIOMAS[0];"),
    ('contracts/assets/idioma.js', "    window.LW_IDIOMA = (idioma === 'en') ? 'en' : 'es';",
     "    window.LW_IDIOMA = (window.AXW_IDIOMAS.indexOf(idioma) >= 0) ? idioma : window.AXW_IDIOMAS[0];"),
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


def idiomas_instancia(idiomas):
    """Aplica los idiomas de la instancia sobre la copia del front (DIST, ANTES de quitar comentarios y de los reemplazos de marca: así las claves del
    diccionario reciben el mismo trato que el código que las pide). Solo lo copiado, nunca el repo de Lawang."""
    v4 = os.path.join(DIST, 'intranet', 'v4')
    for rel_, viejo, nuevo in IDIOMAS_PARCHES:
        ruta = os.path.join(DIST, *rel_.split('/'))
        t = open(ruta, encoding='utf-8').read()
        t = _una_vez(t, viejo, nuevo.replace('__AXW_IDIOMAS__', json.dumps(idiomas)), 'idiomas ' + rel_)
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
    if portada_de(nombre) == 'reservas':   # 11-oct-2026: la Home de las reservas del día y Ajustes › Puesta en marcha (solo instancias de tipo Reservas)
        portada_reservas()
        ajustes_puesta_en_marcha()
    idiomas = idiomas_de(nombre)
    if idiomas:   # 12-oct-2026: interfaz en los idiomas de la instancia (bbm: indonesio e inglés)
        idiomas_instancia(idiomas)
    menu_i18n()   # rótulos del menú en en/id en todas las páginas (después del núcleo del indonesio)
    if not _PRIV or not REEMPLAZOS_PUBLICO:
        aborta('falta private/demo_publico.json: sin él quedarían nombres de Lawang en el ERP de la instancia')
    host_sb = url[len('https://'):]
    # 0. Sin comentarios, como la pública: los de Lawang cuentan sociedades, personas e incidentes.
    shutil.copy2(os.path.join(LAWANG, 'contracts', 'assets', 'guard.js'), os.path.join(DIST, 'contracts', 'assets', 'guard.js'))
    guard_asistente_admin()   # AXW-136: el admin entra a /asistente/ sin la casilla (como la base)
    r = subprocess.run(['node', os.path.join(AQUI, 'limpia_publico.js'), DIST], cwd=AQUI)
    if r.returncode != 0:
        aborta('limpia_publico.js no pudo quitar los comentarios de algún fichero (ver arriba)')
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
    interruptores = (plantilla.replace('__AXW_MAPA__', json.dumps(mapa, ensure_ascii=False, sort_keys=True))
                     .replace('__AXW_NO_INSTALADO__', json.dumps(no_instalado, ensure_ascii=False)) + '\n')
    t = open(g, encoding='utf-8').read()
    open(g, 'w', encoding='utf-8', newline='').write(
        '/* GENERADO por AxisWorks/comercial/demo-erp/build.py --instancia %s — no editar. */\n'
        'window.AXW_NUCLEO_OPERACION = true;\n' % nombre + interruptores + t)
    for raiz, dirs, fichs in os.walk(DIST, topdown=False):
        for f in fichs + dirs:
            nuevo = f
            for a, b in REEMPLAZOS_PUBLICO:
                nuevo = nuevo.replace(a, b)
            nuevo = nuevo.replace('Lawang', 'Axw')
            if nuevo != f:
                os.replace(os.path.join(raiz, f), os.path.join(raiz, nuevo))
    logos_instancia(nombre, marca)
    crea_contrasena_pantalla(marca)   # pieza C de I6 (9-oct-2026): «Crea tu contraseña» para el primer administrador invitado
    piel_suite_clasica(DIST, nombre)   # tras el renombrado (axw.css) y tras crea-contrasena; antes de versiona()
    puerta_instancia(DIST, idiomas_de(nombre))   # selector de idioma visible, correo neutro, marca centrada (12-oct)
    tipografias_libres()
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
    rotulos_fuera = {ruta_limpia(u): r for u, r in (extra_p.get('p_rotulos') or {}).items()}
    cargaban = set()   # ficheros que cargaban las pantallas que salen del paquete: candidatos a salir con ellas
    for u in mapa['xp']:
        f = os.path.join(DIST, *u.strip('/').split('/'), 'index.html')
        if os.path.isfile(f):
            if u in fuera:
                # Declarada en apagados_extra.p («pantalla no incluida en esta instancia»): no nombra un módulo (taller cuelga de
                # reservas-producto, que SÍ se enciende: decir «Reservas de producto no está activo» sería mentir) y sus ficheros salen con ella.
                cargaban |= ficheros_cargados(f, DIST)
                open(f, 'w', encoding='utf-8').write(pagina_no_instalado(
                    no_instalado, marca, None, u, herramienta=rotulos_fuera.get(u) or mapa['n'].get(mapa['p'].get(u), [u])[0]))
            else:
                open(f, 'w', encoding='utf-8').write(pagina_no_instalado(no_instalado, marca, mapa['n'].get(mapa['p'].get(u)), u))
    quitados = poda_ficheros_sin_pantalla(DIST, cargaban)
    if quitados:
        print('pantallas fuera del paquete: %d fichero(s) que solo ellas cargaban, fuera: %s' % (len(quitados), ', '.join(quitados)))
    # El panel de control: solo en la instancia que manda (panel_control en erp/instancias.json)
    if _instancia_registro(nombre).get('panel_control'):
        d = os.path.join(DIST, 'panel')
        os.makedirs(d, exist_ok=True)
        panel = open(os.path.join(AQUI, 'panel_control.html'), encoding='utf-8').read()
        if '__AXW_ROTULOS__' not in panel:
            aborta('panel_control.html sin el hueco __AXW_ROTULOS__')
        open(os.path.join(d, 'index.html'), 'w', encoding='utf-8', newline='').write(
            panel_nav(panel, 'modulos').replace('__AXW_ROTULOS__', json.dumps(rotulos(), ensure_ascii=False, sort_keys=True)))
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
    avisos_para_rotos()
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
