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
import json
import os
import re
import shutil
import subprocess
import sys

AQUI = os.path.dirname(os.path.abspath(__file__))
AGENCIA = os.path.abspath(os.path.join(AQUI, '..', '..', '..', '..'))
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
PROHIBIDO = re.compile(r'(/contracts/app\.html$|apoderados|/firma-|firma_|/anexos/|/folletos/|/templates/|/_plan/|\.sql$|\.test\.js$|/_[^/]*$|'
                       r'Backups|/private/|credentials|token\.json|\.md$|\.py$|\.zip$|'
                       r'/intranet/v4/index\.html$|/intranet/v4/movil/|/intranet/v4/assets/img/|/intranet/dossier/)', re.I)

# ── Versión PÚBLICA (demo.axisworks.studio, owner 24-sep: «marca neutra, dispara») ──────────────────────────
# `python build.py --publico` construye lo mismo y además: quita los comentarios (limpia_publico.js), cambia marca,
# promociones, sociedades y logo por inventados, y se NIEGA a copiar a `dist/demo-erp/` si queda un rastro de Lawang.
# Porqué: el código viene de la intranet de un cliente; sus comentarios y literales cuentan sus sociedades, sus
# representantes y sus incidentes. Sin su OK escrito (AXW-11) nada suyo sale en una web pública.
# `dist/` en la ruta a propósito: los controles de push del estudio (unificar.py, fallos_mudos.py) ya saltan
# las carpetas `dist` como código generado; este código se revisa en su origen, el repo de Lawang.
DESTINO_PUBLICO = os.path.abspath(os.path.join(AQUI, '..', '..', 'dist', 'demo-erp'))   # raíz de demo.axisworks.studio
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
        ("function chainable(table) {", "function chainable(table) { if (!window.__LW_DEMO_SEMBRADO) { window.__LW_DEMO_SEMBRADO = true; "
                                        "window.LW_DEMO_SIEMBRA(FIXTURES, { fila: fila, hoy: hoy, FICHA: FICHA_QA, USUARIOS: USUARIOS_QA, VENTAS: VENTAS_QA }); "
                                        "window.LW_DEMO_LIMPIA(FIXTURES); }"),
        # Escrituras: se quedan en memoria para que «guardar» se vea en la demo.
        ("if (obj._op === 'insert' || obj._op === 'update' || obj._op === 'upsert') {",
         "if (obj._op === 'insert' || obj._op === 'upsert') { var nv = window.LW_DEMO_ESCRIBE(FIXTURES, table, obj._op, obj._val, []); "
         "return { data: obj._single ? nv[0] : nv, error: null }; }\n"
         "      if (obj._op === 'update' || obj._op === 'delete') { var rs0 = (FIXTURES[table] && Array.isArray(FIXTURES[table].data)) ? FIXTURES[table].data : []; "
         "var af = rs0.filter(function (r) { return filtros.every(function (f) { return coincide(r, f[1], f[0], f[2]); }); }); "
         "var hechas = window.LW_DEMO_ESCRIBE(FIXTURES, table, obj._op, obj._val, af); return { data: obj._single ? (hechas[0] || null) : hechas, error: null }; }\n"
         "      if (false) {"),
        # Filtros que el doble de QA deja pasar a propósito (su cabecera lo dice): en
        # una demo se VEN — «0 vencimientos en 30 días» con hitos la semana que viene.
        ("    var v = row ? row[campo] : undefined;",
         "    var v = row; String(campo).split('.').forEach(function (k) { v = v == null ? undefined : v[k]; });\n"
         "    if (op === 'gte') return v != null && v >= val;\n"
         "    if (op === 'lte') return v != null && v <= val;\n"
         "    if (op === 'lt') return v != null && v < val;"),
        ("    ['gte', 'lte', 'not', 'or', 'order', 'limit', 'contains', 'overlaps', 'range', 'match']",
         "    obj.gte = function (c, v) { filtros.push(['gte', c, v]); return obj; };\n"
         "    obj.lte = function (c, v) { filtros.push(['lte', c, v]); return obj; };\n"
         "    obj.lt = function (c, v) { filtros.push(['lt', c, v]); return obj; };\n"
         "    obj.order = function (c, o) { if (!(o && (o.foreignTable || o.referencedTable))) (obj._ord = obj._ord || []).push([c, !(o && o.ascending === false)]); return obj; };\n"
         "    obj.limit = function (n, o) { if (!(o && (o.foreignTable || o.referencedTable))) obj._lim = n; return obj; };\n"
         "    obj.like = function (c, v) { filtros.push(['ilike', c, v]); return obj; };\n"
         "    ['not', 'or', 'contains', 'overlaps', 'range', 'match', 'filter', 'textSearch', 'abortSignal', 'returns', 'csv']"),
        ("      var datos = Array.isArray(base.data) ? filtradas : base.data;",
         "      var datos = Array.isArray(base.data) ? filtradas : base.data;\n"
         "      if (Array.isArray(datos) && obj._ord) { datos = datos.slice().sort(function (a, b) { for (var i = 0; i < obj._ord.length; i++) { var c = obj._ord[i][0], x = a[c], y = b[c]; if (x === y) continue; if (x == null) return 1; if (y == null) return -1; return (x < y ? -1 : 1) * (obj._ord[i][1] ? 1 : -1); } return 0; }); }\n"
         "      if (Array.isArray(datos) && obj._lim != null && !obj._count) datos = datos.slice(0, obj._lim);"),
        ("console.warn('[qa-doble] MODO QA activo", "console.info('[demo] ERP de demostración — datos inventados, sin red real'); void ('"),
        # Algunas RPC del doble devuelven una promesa pelada y el Panel financiero les encadena .select()
        # (24-sep: «sb.rpc(...).select is not a function»). Envoltorio: si no es encadenable, los filtros
        # devuelven la misma promesa, que ya trae las filas.
        ("    rpc: function (nombre, args) {\n      console.warn('[qa-doble] rpc bloqueada (no real):', nombre, args);",
         "    rpc: function (nombre, args) {\n"
         # Guardados atómicos (26-sep): en producción son RPC que escriben; aquí, en memoria (demo_datos.js).
         "      if (window.LW_DEMO_RPC_GUARDA && window.LW_DEMO_RPC_GUARDA[nombre]) {\n"
         "        window.LW_DEMO_RPC_GUARDA[nombre](FIXTURES, args || {});\n"
         "        return Promise.resolve({ data: null, error: null });\n"
         "      }\n"
         "      var r = this._rpc(nombre, args);\n"
         "      if (r && typeof r.then === 'function' && typeof r.select !== 'function') {\n"
         "        ['select', 'order', 'limit', 'eq', 'neq', 'gte', 'lte', 'in', 'is', 'range'].forEach(function (k) { r[k] = function () { return r; }; });\n"
         "      }\n"
         "      return r;\n"
         "    },\n"
         "    _rpc: function (nombre, args) {"),
    ]
    for viejo, nuevo in cambios:
        if doble.count(viejo) != 1:
            aborta('el doble de QA ha cambiado y no encuentro (1 vez): ' + viejo[:70])
        doble = doble.replace(viejo, nuevo)
    doble = doble.replace("'qa-user-1'", "'d-u-1'").replace('qa@axisworks.test', 'direccion@demo.test')
    # «← Módulos» en todas las pantallas: la salida del recorrido (el guard es nuestro).
    volver = ("document.addEventListener('DOMContentLoaded',function(){var n=document.createElement('nav');"
              "n.setAttribute('aria-label','Salir de la demo');"
              "n.style.cssText='position:fixed;left:16px;bottom:16px;z-index:2147483000;display:flex;background:#485B37;"
              "border-radius:999px;font:500 13px/1.2 system-ui,sans-serif;overflow:hidden';"
              "[['/#configurador','← Módulos']].forEach(function(x,i){var a=document.createElement('a');"
              "a.href=x[0];a.textContent=x[1];a.style.cssText='color:#fff;text-decoration:none;padding:8px 14px'"
              "+(i?';border-left:1px solid rgba(255,255,255,.3)':'');n.appendChild(a);});"
              "document.body.appendChild(n);});\n"
              # catalogo.js (fuente única de módulos) → modulos.js (menú y aviso de módulo apagado) → tour.js, en
              # ese orden: un script insertado por JS es asíncrono salvo async=false.
              "['/demo/catalogo.js','/demo/modulos.js','/demo/tour.js'].forEach(function(u){var s=document.createElement('script');"
              "s.src=u;s.async=false;(document.head||document.documentElement).appendChild(s);});\n")
    # Sesión real que el presentador pudiera tener en este origen: fuera antes de nada (Seguridad #2).
    limpia_sesion = ("(function(){try{[localStorage,sessionStorage].forEach(function(s){for(var i=s.length-1;i>=0;i--){"
                     "var k=s.key(i);if(k&&k.indexOf('sb-')===0)s.removeItem(k);}});}catch(e){}})();\n")
    # Núcleo del ERP (25-sep): la demo ya enseña la OPERACIÓN. Bandera que Lawang no enciende nunca: su base aún no
    # tiene la tabla, y el código compartido (operaciones-cuentas.js, datos.js) solo la lee si está encendida.
    nucleo = 'window.AXW_NUCLEO_OPERACION = true;\n'
    return ('/* GENERADO por AxisWorks/comercial/demo-erp/build.py — no editar. Demo: datos inventados, sin red real. */\n'
            + nucleo + limpia_sesion + volver + datos + '\n' + doble)


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


def paginas_propias():
    carpeta = os.path.join(DIST, 'intranet')
    redir = ('<!doctype html><meta charset="utf-8"><title>Demo</title>'
             '<script>location.replace("/intranet/v4/home/")</script>')
    open(os.path.join(carpeta, 'index.html'), 'w', encoding='utf-8').write(redir)
    # Portada: la landing de módulos (fuente: landing.html, al lado de este script).
    shutil.copy2(os.path.join(AQUI, 'landing.html'), os.path.join(DIST, 'index.html'))
    os.makedirs(os.path.join(DIST, 'demo'), exist_ok=True)
    compila_portada('demo/landing.css')
    shutil.copy2(os.path.join(AQUI, 'tour.js'), os.path.join(DIST, 'demo', 'tour.js'))
    shutil.copy2(os.path.join(AQUI, 'catalogo.js'), os.path.join(DIST, 'demo', 'catalogo.js'))
    shutil.copy2(os.path.join(AQUI, 'modulos_demo.js'), os.path.join(DIST, 'demo', 'modulos.js'))
    # El panel de control (panel.html + /demo/instancia.js, que salían de datos_instancia(): ver git log) NO se publica desde el 27-sep
    # (owner: «oculta el panel»): encendía módulos solo en el navegador y la demo prometía algo que no hacía.
    # Vuelve cuando active módulos de verdad sobre la instancia (interruptores F4 del ERP maestro).
    aviso = AVISO
    for carpeta_v4, t, m in (
            ('generador-contratos', 'Generador de contratos',
             'En la demo no se incluye: sus plantillas son documentos del cliente. Lo enseñamos en la llamada con un documento de ejemplo.'),
            ('contratos-inversor', 'Portal del comprador',
             'El portal del comprador se enseña aparte, en la llamada.')):
        d = os.path.join(DIST, 'intranet', 'v4', carpeta_v4)
        os.makedirs(d, exist_ok=True)
        open(os.path.join(d, 'index.html'), 'w', encoding='utf-8').write(aviso.format(t=t, m=m))
    # El generador clásico lleva el texto de las cláusulas inline (Legal): su ruta
    # enseña el mismo aviso, para que «Ver en el generador» no acabe en un 404.
    open(os.path.join(DIST, 'contracts', 'app.html'), 'w', encoding='utf-8').write(
        aviso.format(t='Generador de contratos', m='En la demo no se incluye: sus plantillas son documentos del cliente. Lo enseñamos en la llamada con un documento de ejemplo.'))
    d = os.path.join(carpeta, 'dossier')   # el menú enlaza el constructor de dossier: aviso, no 404
    os.makedirs(d, exist_ok=True)
    open(os.path.join(d, 'builder.html'), 'w', encoding='utf-8').write(aviso.format(
        t='Dossier comercial', m='En la demo no se incluye: el dossier lleva el material de marca de cada cliente.'))
    d = os.path.join(carpeta, 'creatividades')   # está en el menú de la v4; sin esto, 404 en directo
    os.makedirs(d, exist_ok=True)
    open(os.path.join(d, 'index.html'), 'w', encoding='utf-8').write(aviso.format(
        t='Creatividades', m='La biblioteca de piezas de cada proyecto se enseña en la llamada: son anuncios reales del cliente.'))
    for sitio in ('portal', 'entrar'):
        d = os.path.join(DIST, sitio)
        os.makedirs(d, exist_ok=True)
        open(os.path.join(d, 'index.html'), 'w', encoding='utf-8').write(redir)


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


AVISO = ('<!doctype html><html lang="es"><meta charset="utf-8"><title>{t} · Demo</title>'
         '<body style="margin:0;display:flex;min-height:100vh;align-items:center;justify-content:center;'
         'background:#fbf9f4;font:16px/1.6 system-ui,sans-serif;color:#2b2b25"><div style="max-width:30rem;padding:2rem">'
         '<h1 style="font-weight:500;color:#485B37">{t}</h1><p>{m}</p>'
         '<p><a href="/intranet/v4/home/" style="color:#485B37">Volver al inicio</a></p></div></body></html>')
ENLACE_LOCAL = re.compile(r'''(?:src|href)=["'](/[^"'#?]*)''')


def enlaces_rotos(raiz_dir):
    """Rutas locales enlazadas desde el HTML que no existen en la carpeta (ni como fichero ni como carpeta con
    index.html). Auditoría de Desarrollo (25-sep): la demo tenía 3 enlaces del menú a herramientas clásicas que no
    se copian → 404 en directo."""
    rotos = set()
    for raiz, _d, fichs in os.walk(raiz_dir):
        for f in fichs:
            if not f.endswith('.html'):
                continue
            for ruta in ENLACE_LOCAL.findall(open(os.path.join(raiz, f), encoding='utf-8', errors='replace').read()):
                p = os.path.join(raiz_dir, ruta.lstrip('/').replace('/', os.sep))
                if not (os.path.isfile(p) or os.path.isfile(os.path.join(p, 'index.html'))):
                    rotos.add(ruta)
    return sorted(rotos)


def avisos_para_rotos():
    """Cada herramienta enlazada que la demo no trae enseña el aviso, no un 404."""
    for ruta in enlaces_rotos(DIST):
        if '.' in os.path.basename(ruta.rstrip('/')):
            continue                                   # un fichero que falta es un fallo, no una pantalla
        d = os.path.join(DIST, ruta.strip('/').replace('/', os.sep))
        os.makedirs(d, exist_ok=True)
        open(os.path.join(d, 'index.html'), 'w', encoding='utf-8').write(AVISO.format(
            t='Herramienta no incluida', m='En la demo no se incluye esta herramienta clásica: la demo enseña la versión 4 del ERP.'))


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
    neutraliza_ejemplos()
    malos = []
    for raiz, _d, fichs in os.walk(DIST):
        for f in fichs:
            p = os.path.join(raiz, f)
            r = rel(p)
            aviso_propio = r in ('/contracts/app.html', '/intranet/dossier/builder.html') and os.path.getsize(p) < 5000 and \
                'En la demo no se incluye' in open(p, encoding='utf-8').read()
            if PROHIBIDO.search(r) and not aviso_propio:
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
        for f in ('segoeuib.ttf', 'arialbd.ttf'):
            try:
                return ImageFont.truetype(os.path.join(os.environ.get('WINDIR', 'C:\\Windows'), 'Fonts', f), tam)
            except OSError:
                continue
        return ImageFont.load_default()
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


def tipografias_libres():
    """La demo pública no lleva las tipografías de marca de Lawang (owner, 25-sep, AXW-19): Neue Kabel y The Seasons
    son identidad del cliente y los .otf venían de fonnts.com, sin licencia web nuestra. Se sustituyen por dos parecidas
    de Google Fonts (licencia OFL): Jost (geométrica, como Kabel) y Cormorant Garamond (serif de display)."""
    fuentes = os.path.join(DIST, 'intranet', 'v4', 'assets', 'fonts')
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
    import hashlib

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


def publica():
    """Versión pública: sin comentarios, sin marca ni nombres de Lawang, y comprobado antes de copiar a demo/."""
    if not _PRIV or not REEMPLAZOS_PUBLICO:
        aborta('falta private/demo_publico.json (repo privado del estudio): sin él no se puede anonimizar la demo')
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
            t2 = t
            for a, b in REEMPLAZOS_PUBLICO:
                t2 = t2.replace(a, b)
            t2 = cambia_lawang(t2)
            if t2 != t:
                open(p, 'w', encoding='utf-8', newline='').write(t2)
    logos_neutros()
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
    if not DESTINO_PUBLICO.endswith(os.path.join('AxisWorks', 'dist', 'demo-erp')):
        aborta('destino público inesperado: ' + DESTINO_PUBLICO)
    os.makedirs(DESTINO_PUBLICO, exist_ok=True)
    for x in os.listdir(DESTINO_PUBLICO):
        p = os.path.join(DESTINO_PUBLICO, x)
        shutil.rmtree(p) if os.path.isdir(p) else os.remove(p)
    for x in os.listdir(DIST):
        s = os.path.join(DIST, x)
        shutil.copytree(s, os.path.join(DESTINO_PUBLICO, x)) if os.path.isdir(s) else shutil.copy2(s, DESTINO_PUBLICO)
    # Solo se sirve desde demo.axisworks.studio: por axisworks.studio/demo/ las rutas absolutas no casan.
    open(os.path.join(DESTINO_PUBLICO, '.htaccess'), 'w', encoding='utf-8', newline='\n').write(
        '# GENERADO por comercial/demo-erp/build.py --publico — no editar.\n'
        '# demo.axisworks.studio: la demo del ERP. Fuera de ese host, redirige a él.\n'
        '<IfModule mod_rewrite.c>\n  RewriteEngine On\n'
        '  RewriteCond %{HTTP_HOST} !^demo\\.axisworks\\.studio$ [NC]\n'
        '  RewriteRule ^(.*)$ https://demo.axisworks.studio/$1 [R=301,L]\n</IfModule>\n'
        # Cabeceras de seguridad (auditoría de Seguridad, 25-sep: el .htaccess del sitio principal no llega al
        # subdominio). connect-src 'self' es además la barrera de red de verdad: el doble ya no llama fuera, y si
        # un build se dejara algo, el navegador lo cortaría igual.
        '<IfModule mod_headers.c>\n'
        '  Header always set X-Robots-Tag "noindex, nofollow"\n'
        '  Header always set Strict-Transport-Security "max-age=31536000"\n'
        '  Header always set X-Content-Type-Options "nosniff"\n'
        '  Header always set X-Frame-Options "SAMEORIGIN"\n'
        '  Header always set Referrer-Policy "strict-origin-when-cross-origin"\n'
        '  Header always set Permissions-Policy "camera=(), microphone=(), geolocation=(), payment=()"\n'
        '  Header always set Content-Security-Policy "default-src \'self\'; script-src \'self\' \'unsafe-inline\' '
        # Sin cdn.tailwindcss.com desde el 27-sep-2026 (ERP F3 lote 4a): la v4 y la portada van con Tailwind COMPILADO.
        'https://cdn.jsdelivr.net https://cdnjs.cloudflare.com; style-src \'self\' '
        # jsdelivr en estilos y fuentes: los iconos Phosphor del CRM (visto en producción, 25-sep).
        '\'unsafe-inline\' https://fonts.googleapis.com https://cdn.jsdelivr.net; font-src \'self\' data: '
        'https://fonts.gstatic.com https://cdn.jsdelivr.net; img-src '
        '\'self\' data: blob:; connect-src \'self\'; frame-ancestors \'self\'; base-uri \'self\'; form-action '
        '\'self\'; object-src \'none\'"\n'
        # Hostinger sirve .js/.css con max-age de 7 días y la demo los pide sin versión (/demo/catalogo.js): el
        # 25-sep un catalogo.js viejo (sin PACKS) cacheado del 24 dejó la landing nueva sin módulos y sin forma de
        # activarlos. no-cache = el navegador revalida con el ETag en cada visita (304 si no cambió).
        '  <FilesMatch "\\.(html|js|css|json)$">\n'
        '    Header unset Expires\n'
        '    Header unset Cache-Control\n'
        '    Header always set Cache-Control "no-cache"\n'
        '  </FilesMatch>\n'
        '</IfModule>\n'
        'DirectoryIndex index.html\n')
    open(os.path.join(DESTINO_PUBLICO, 'robots.txt'), 'w', encoding='utf-8', newline='\n').write('User-agent: *\nDisallow: /\n')
    comprueba_resultado(DESTINO_PUBLICO)
    total = sum(len(f) for _r, _d, f in os.walk(DESTINO_PUBLICO))
    print('OK versión pública en %s: %d ficheros, sin rastros de Lawang' % (os.path.relpath(DESTINO_PUBLICO, AGENCIA), total))



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
# {dominio}: el ERP de la instancia. Fuera de ese host, redirige a él.
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteCond %{{HTTP_HOST}} !^{dominio_re}$ [NC]
  RewriteRule ^(.*)$ https://{dominio}/$1 [R=301,L]
</IfModule>
<IfModule mod_headers.c>
  Header always set X-Robots-Tag "noindex, nofollow"
  Header always set Strict-Transport-Security "max-age=31536000"
  Header always set X-Content-Type-Options "nosniff"
  Header always set X-Frame-Options "SAMEORIGIN"
  Header always set Referrer-Policy "strict-origin-when-cross-origin"
  Header always set Permissions-Policy "camera=(), microphone=(), geolocation=(), payment=()"
  Header always set Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://cdnjs.cloudflare.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net; font-src 'self' data: https://fonts.gstatic.com https://cdn.jsdelivr.net; img-src 'self' data: blob: https://{sb}; connect-src 'self' https://{sb} wss://{sb}; frame-ancestors 'self'; base-uri 'self'; form-action 'self'; object-src 'none'"
</IfModule>
DirectoryIndex index.html
"""
# connect-src: SOLO su base (REST, auth, storage y realtime). Es la barrera de red: aunque un fichero trajera otra
# URL, el navegador no la llamaría.

QA_DOBLE = re.compile(r'<script>\(function\(\)\{try\{(?:(?!</script>).)*?_qa_double_guard\.js.*?</script>', re.S)

NO_ESTA = ('<!doctype html><html lang="es"><meta charset="utf-8"><title>{t}</title>'
           '<body style="font:16px system-ui;padding:48px;max-width:560px"><h1 style="font-size:22px">{t}</h1>'
           '<p>Este módulo no está instalado en esta instancia.</p><p><a href="/intranet/v4/home/">Volver</a></p>')


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
                    out['p'][u] = mod
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
    xp = set(extra.get('p') or [])
    for mod in nunca:
        xp |= {u for u in (m['modulos'].get(mod) or {}).get('pantallas') or [] if u.startswith('/intranet/')}
    out['xp'] = sorted(xp)
    return out


def instancia(nombre):
    url, clave, dominio, marca = _instancia_conf(nombre)
    if not _PRIV or not REEMPLAZOS_PUBLICO:
        aborta('falta private/demo_publico.json: sin él quedarían nombres de Lawang en el ERP de la instancia')
    host_sb = url[len('https://'):]
    # 0. Sin comentarios, como la pública: los de Lawang cuentan sociedades, personas e incidentes.
    shutil.copy2(os.path.join(LAWANG, 'contracts', 'assets', 'guard.js'), os.path.join(DIST, 'contracts', 'assets', 'guard.js'))
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
    # ERP F3: su ficha, escrita desde el registro (después de los reemplazos, que ya no la tocan)
    escribe_instancia({'sb_url': url, 'sb_key': clave, 'marca': marca, 'cabecera': marca.upper(), 'subcabecera': 'ERP',
                       'titulo': marca + ' ERP', 'firma_correo': marca,
                       'inicio': '/intranet/v4/home/',
                       # F3 lote 3: los de la instancia en erp/instancias.json (hoy ninguna los declara → vacíos)
                       'masterplans': _instancia_registro(nombre).get('masterplans') or {},
                       'proyectos_con_fases': _instancia_registro(nombre).get('proyectos_con_fases') or []})
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
    interruptores = plantilla.replace('__AXW_MAPA__', json.dumps(mapa, ensure_ascii=False, sort_keys=True)) + '\n'
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
    logos_neutros(marca)
    tipografias_libres()
    neutraliza_ejemplos()   # ejemplos de persona que casan con gente real (pii_maqueta)
    # 2. Portada = la intranet. Lo que en la demo es un aviso, aquí dice que no está en esta instancia.
    redir = ('<!doctype html><meta charset="utf-8"><title>%s</title>'
             '<script>location.replace("/intranet/")</script>' % marca)
    if not os.path.isfile(os.path.join(DIST, 'intranet', 'index.html')):
        aborta('falta la pantalla de acceso /intranet/: el guard real mandaría a un 404')
    for sitio in ('', 'entrar', 'portal'):
        d = os.path.join(DIST, sitio)
        os.makedirs(d, exist_ok=True)
        open(os.path.join(d, 'index.html'), 'w', encoding='utf-8').write(redir)
    # Solo lo NO PORTADO se sustituye en el build (nunca estará en esta base). Lo apagado se decide en el navegador:
    # se sirve la pantalla y apagados_instancia.js la cambia por «Módulo no instalado» si su módulo está apagado.
    for u in mapa['xp']:
        f = os.path.join(DIST, *u.strip('/').split('/'), 'index.html')
        if os.path.isfile(f):
            open(f, 'w', encoding='utf-8').write(NO_ESTA.format(t='Módulo no instalado'))
    # El panel de control: solo en la instancia que manda (panel_control en erp/instancias.json)
    if _instancia_registro(nombre).get('panel_control'):
        d = os.path.join(DIST, 'panel')
        os.makedirs(d, exist_ok=True)
        shutil.copy2(os.path.join(AQUI, 'panel_control.html'), os.path.join(d, 'index.html'))
        compila_portada('panel/panel.css')   # su Tailwind compilado: la CSP de la instancia no admite el Play CDN
    for ruta, t in (('intranet/v4/generador-contratos/index.html', 'Generador de contratos'),
                    ('intranet/v4/contratos-inversor/index.html', 'Portal del comprador'),
                    ('contracts/app.html', 'Generador de contratos'),
                    ('intranet/dossier/builder.html', 'Dossier comercial'),
                    ('intranet/creatividades/index.html', 'Creatividades')):
        d = os.path.join(DIST, *ruta.split('/'))
        os.makedirs(os.path.dirname(d), exist_ok=True)
        open(d, 'w', encoding='utf-8').write(NO_ESTA.format(t=t))
    avisos_para_rotos()
    # ?v= con la huella de lo que SALE de este build, como en la demo pública (28-sep-2026). Sin esto, la v4 llevaba el
    # ?v= del fichero de Lawang (guard.js se reescribe entero aquí: mapa de módulos + ficha) y /panel/ iba sin versión:
    # Hostinger cachea 7 días y el verificador vio el guard.js viejo en /panel/ tras publicar.
    versiona(DIST)
    # 3. Comprobaciones: ni rastro de la base de Lawang ni de la demo, ni de ninguna clave que no sea publicable.
    restos = []
    for raiz, _d, fichs in os.walk(DIST):
        for f in fichs:
            p = os.path.join(raiz, f)
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
    if restos:
        aborta('el build de la instancia no está limpio:\n  ' + '\n  '.join(restos[:40]))
    comprueba_resultado(DIST)
    # 4. Copia al clon del repo privado de la instancia (gitignored en la agencia).
    destino = os.path.join(DESPLIEGUES, nombre)
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
        nombre=nombre, dominio=dominio, dominio_re=re.escape(dominio), sb=host_sb))
    open(os.path.join(destino, 'robots.txt'), 'w', encoding='utf-8', newline='\n').write('User-agent: *\nDisallow: /\n')
    comprueba_resultado(destino)
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
    'contratos': 'Home cuenta firmas pendientes; contratos-firmados es el bucket que abre la pantalla de contratos',
    'facturas': 'Home cuenta facturas con saldo; justificantes lo sube la pantalla de recibos/facturas',
    'gastos': 'panel-gastos.js y gasto_justificante_registra solo corren en /v4/gastos/',
    'modelos': 'subidores de fotos y documentos del modelo y del deck: solo en /v4/modelos/',
    'obra': 'obra_foto_registra: solo en /v4/obra/',
    'operaciones': 'borrar_operacion: solo desde la ficha de operaciones',
    'proyectos': 'documentación de proyecto y unidades: solo en /v4/proyectos/; Home cuenta unidades',
    'recibos': 'recibi_aplicaciones: solo en /v4/recibos/',
    'reservas': 'prórroga, liberación y vencimientos: pantalla de reservas; Home cuenta las que vencen',
}


def packs_casan(catalogo=None, modulos_json=None):
    """Los packs de catalogo.js tienen que casar con el registro del ERP (owner, 27-sep: «los módulos que dependen de
    otros van en pack sí o sí»). Para cada módulo, todo lo que su código lee (erp/modulos.json → depende, cerrado
    transitivamente) tiene que estar en su mismo pack o en los packs que ese pack necesita. Un suelto no puede leer
    nada fuera de la base. Una pestaña de otra pantalla (PESTANAS) va donde esté esa pantalla. La base solo se exime de
    lo que está en EXENTOS_BASE. Una clave que el registro no conoce para el build: no se da por buena sin mirarla.
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
             'home': 'base', 'usuarios': 'base', 'ajustes': 'base', 'peticiones': 'asistente'}
    reg = lambda k: alias.get(k, k)
    desconocidas = sorted(k for k in cat['modulos'] if reg(k) not in registro)
    if desconocidas:
        aborta('módulos del catálogo que erp/modulos.json no conoce (añádelos al registro o al alias): ' + ', '.join(desconocidas))
    nuevas_base = sorted(set(registro['base'].get('depende') or []) - set(EXENTOS_BASE))
    if nuevas_base:
        aborta('la base lee módulos que no están en EXENTOS_BASE (mira si de verdad corren sin ellos): ' + ', '.join(nuevas_base))
    def alcance(k, visto):
        for d in registro[k].get('depende') or []:
            if d not in registro:
                aborta('%s depende de %s, que no está en erp/modulos.json' % (k, d))
            if d not in visto:
                visto.add(d)
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

def main():
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
        # El guard real manda a /intranet/ para entrar: es la pantalla de acceso de verdad, no un aviso.
        copia(os.path.join(LAWANG, 'intranet', 'index.html'), os.path.join(DIST, 'intranet', 'index.html'))
    faltan = cierra_referencias()
    if '--instancia' in sys.argv:
        i = sys.argv.index('--instancia')
        if i + 1 >= len(sys.argv):
            aborta('uso: build.py --instancia <nombre de erp/instancias.json>')
        return instancia(sys.argv[i + 1])
    g = os.path.join(DIST, 'contracts', 'assets', 'guard.js')
    os.makedirs(os.path.dirname(g), exist_ok=True)
    open(g, 'w', encoding='utf-8', newline='').write(guard_demo())
    escribe_instancia({'sb_url': 'https://demo.invalid', 'sb_key': 'sb_publishable_demo', 'marca': 'AxisWorks Demo',
                       'cabecera': 'AXISWORKS', 'subcabecera': 'ERP DEMO', 'titulo': 'AxisWorks ERP',
                       'firma_correo': 'AxisWorks Demo'})
    paginas_propias()
    avisos_para_rotos()
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
