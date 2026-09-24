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
LAWANG = os.path.join(AGENCIA, 'proyectos', 'Lawang')
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
REEMPLAZOS_PUBLICO = [
    ('proyectos/Lawang/_qa_double_guard.js', 'el doble de la demo'),
    ('Lawang Tropical Properties', 'AxisWorks Demo'),
    ('Lawang Properties &amp; Suite', 'AxisWorks ERP'), ('Lawang Properties & Suite', 'AxisWorks ERP'),
    ('PROPERTIES &amp; SUITE', 'ERP · DEMO'), ('PROPERTIES & SUITE', 'ERP · DEMO'),
    ('PT. LAWANG PROPERTIES BALI', 'PT DEMO NUSANTARA'), ('Lawang Properties', 'AxisWorks Demo'),
    ('Intranet Lawang', 'AxisWorks ERP'), ('Lawang Intranet', 'AxisWorks ERP'), ('Lawang v4', 'AxisWorks ERP'),
    ('Pagos de Lawang', 'Pagos de la empresa'), ('paga Lawang', 'paga la empresa'), ('pide a Lawang', 'pide a la empresa'),
    ('cobrar a Lawang', 'cobrar a la empresa'), ('A Lawang', 'A la empresa'), ('Lawang no gestiona', 'La empresa no gestiona'),
    ('PT Lawang', 'PT Demo Nusantara'), ('de Lawang', 'de la empresa'),
    ('KITAS_Inversion_Lawang_Rev04.pdf', 'KITAS_Inversion_Rev04.pdf'),
    ('lawangproperties\\.com', 'axisworks\\.studio'), ('lawangproperties.com', 'axisworks.studio'),
    ('Palm Field by Balian Hills', 'Cemara Estate'), ('Bonian Village by Balian Hills', 'Tirta Village'),
    ('PALM FIELD', 'CEMARA ESTATE'), ('Palm Field', 'Cemara Estate'), ('palmfield', 'cemara'),
    ('Bonian Beach', 'Tirta Beach'), ('Bonian Village', 'Tirta Village'), ('Bonian', 'Tirta'), ('bonian', 'tirta'),
    ('BALIAN', 'CEMARA'), ('Balian', 'Cemara'),
    ('Sumba Hills', 'Batu Ridge'), ('sumbahills', 'baturidge'), ('sumba-hills', 'batu-ridge'), ('Sumba', 'Batu'), ('sumba', 'batu'),
    ('cc00014_timon', 'cc00014_norte'), ('CC00014 Timon', 'CC00014 Norte'), ('Timon', 'Norte'),
    ('Tepi Sun Gai', 'Demo Nusantara'), ('tepi_sungai', 'soc_norte'), ('sandal_woods_ltd', 'soc_sur_ltd'),
    ('san_dal_woods', 'soc_sur'), ('Sandal Woods', 'Demo Selatan'), ('Sandalwoods', 'Demo Selatan'),
    ('HOLMACA', 'DEMO'), ('Holmaca', 'Demo'), ('Karana', 'Demo'),
    ('LAWANG_', 'AXW_'), ('LAWANG', 'AXISWORKS'), ('lawang', 'axw'),
]
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
RASTRO = re.compile(r'lawang|palm ?field|bonian|sumba|holmaca|sandal ?woods?|karana|(?<![a-z])timon|monjong|balian|'
                    r'tepi ?sun ?gai|tepi_sungai|san_dal_woods', re.I)
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


def guard_demo():
    doble = open(os.path.join(LAWANG, '_qa_double_guard.js'), encoding='utf-8').read()
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
    # «← Módulos · Panel» en todas las pantallas: las dos salidas del recorrido (el guard es nuestro).
    volver = ("document.addEventListener('DOMContentLoaded',function(){var n=document.createElement('nav');"
              "n.setAttribute('aria-label','Salir de la demo');"
              "n.style.cssText='position:fixed;left:16px;bottom:16px;z-index:2147483000;display:flex;background:#485B37;"
              "border-radius:999px;font:500 13px/1.2 system-ui,sans-serif;overflow:hidden';"
              "[['/#configurador','← Módulos'],['/panel/','Panel']].forEach(function(x,i){var a=document.createElement('a');"
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
    return ('/* GENERADO por AxisWorks/comercial/demo-erp/build.py — no editar. Demo: datos inventados, sin red real. */\n'
            + limpia_sesion + volver + datos + '\n' + doble)


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


def datos_instancia():
    """Lo que el panel enseña de la base, sacado de erp/ (nunca inventado): la línea base sellada más reciente,
    sus objetos, las migraciones publicadas y las tablas/funciones propias de cada módulo según erp/modulos.json.
    Solo nombres de esquema, ningún dato. El tamaño del equipo sale de demo_datos.js (personas inventadas)."""
    erp = os.path.join(AGENCIA, 'erp')
    selladas = sorted(f for f in os.listdir(os.path.join(erp, 'linea_base')) if re.fullmatch(r'linea_base_\d{14}\.sql', f))
    if not selladas:
        aborta('no hay línea base sellada en erp/linea_base/')
    sql = open(os.path.join(erp, 'linea_base', selladas[-1]), encoding='utf-8').read()
    migs = sorted(f[:-4] for f in os.listdir(os.path.join(erp, 'migraciones')) if re.fullmatch(r'\d{14}_[a-z0-9_]+\.sql', f))
    registro = json.load(open(os.path.join(erp, 'modulos.json'), encoding='utf-8'))['modulos']
    # Claves del catálogo de la demo → claves del registro de la base (nombres distintos para lo mismo).
    alias = {'crm': 'leads', 'comisionadmin': 'comision-admin', 'usuarios': 'base'}
    catalogo = open(os.path.join(AQUI, 'catalogo.js'), encoding='utf-8').read()
    modulos = {}
    for k in re.findall(r"\[\s*'([a-z_]+)', '[^']*', '(?:Base|Ventas|Documentos|Dinero|Producto y obra)'", catalogo):
        r = registro.get(alias.get(k, k)) or {}
        modulos[k] = {'tablas': sorted(r.get('tablas', [])), 'funciones': sorted(r.get('funciones', []))}
    datos = open(os.path.join(AQUI, 'demo_datos.js'), encoding='utf-8').read()
    equipo = re.search(r'var EQUIPO = \[(.*?)\];', datos, re.S)
    return {'version': selladas[-1][11:25], 'migraciones': migs,
            'tablas': len(re.findall(r'^CREATE TABLE (?:IF NOT EXISTS )?public\.', sql, re.M | re.I)),
            'funciones': len(re.findall(r'^CREATE (?:OR REPLACE )?FUNCTION public\.', sql, re.M | re.I)),
            'politicas': len(re.findall(r'^CREATE POLICY ', sql, re.M | re.I)),
            'equipo': len(re.findall(r'\bemail\s*:', equipo.group(1))) if equipo else None,
            'modulos': modulos}


def paginas_propias():
    carpeta = os.path.join(DIST, 'intranet')
    redir = ('<!doctype html><meta charset="utf-8"><title>Demo</title>'
             '<script>location.replace("/intranet/v4/home/")</script>')
    open(os.path.join(carpeta, 'index.html'), 'w', encoding='utf-8').write(redir)
    # Portada: la landing de módulos (fuente: landing.html, al lado de este script).
    shutil.copy2(os.path.join(AQUI, 'landing.html'), os.path.join(DIST, 'index.html'))
    os.makedirs(os.path.join(DIST, 'demo'), exist_ok=True)
    shutil.copy2(os.path.join(AQUI, 'tour.js'), os.path.join(DIST, 'demo', 'tour.js'))
    shutil.copy2(os.path.join(AQUI, 'catalogo.js'), os.path.join(DIST, 'demo', 'catalogo.js'))
    shutil.copy2(os.path.join(AQUI, 'modulos_demo.js'), os.path.join(DIST, 'demo', 'modulos.js'))
    # Panel de control de la instancia (Stitch «Architecture Studio», 24-sep) + sus datos de la base.
    os.makedirs(os.path.join(DIST, 'panel'), exist_ok=True)
    shutil.copy2(os.path.join(AQUI, 'panel.html'), os.path.join(DIST, 'panel', 'index.html'))
    open(os.path.join(DIST, 'demo', 'instancia.js'), 'w', encoding='utf-8').write(
        '/* GENERADO por build.py desde erp/ — no editar. */\nwindow.AXW_INSTANCIA = '
        + json.dumps(datos_instancia(), ensure_ascii=False) + ';\n')
    aviso = ('<!doctype html><html lang="es"><meta charset="utf-8"><title>{t} · Demo</title>'
             '<body style="margin:0;display:flex;min-height:100vh;align-items:center;justify-content:center;'
             'background:#fbf9f4;font:16px/1.6 system-ui,sans-serif;color:#2b2b25"><div style="max-width:30rem;padding:2rem">'
             '<h1 style="font-weight:500;color:#485B37">{t}</h1><p>{m}</p>'
             '<p><a href="/intranet/v4/home/" style="color:#485B37">Volver al inicio</a></p></div></body></html>')
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


def verifica():
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


def logos_neutros():
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
        d.text((230, 120), 'AxisWorks Demo', font=fuente(150), fill=color, anchor='lm')
        os.makedirs(marca, exist_ok=True)
        im.save(os.path.join(marca, nombre))
    fav = Image.new('RGBA', (32, 32), (0, 0, 0, 0))
    d = ImageDraw.Draw(fav)
    d.rounded_rectangle((0, 0, 31, 31), radius=7, fill=(79, 70, 229, 255))
    d.text((16, 16), 'A', font=fuente(22), fill=(255, 255, 255, 255), anchor='mm')
    fav.save(os.path.join(DIST, 'favicon.png'))


def publica():
    """Versión pública: sin comentarios, sin marca ni nombres de Lawang, y comprobado antes de copiar a demo/."""
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
        '<IfModule mod_headers.c>\n  Header always set X-Robots-Tag "noindex, nofollow"\n</IfModule>\n'
        'DirectoryIndex index.html\n')
    open(os.path.join(DESTINO_PUBLICO, 'robots.txt'), 'w', encoding='utf-8', newline='\n').write('User-agent: *\nDisallow: /\n')
    total = sum(len(f) for _r, _d, f in os.walk(DESTINO_PUBLICO))
    print('OK versión pública en %s: %d ficheros, sin rastros de Lawang' % (os.path.relpath(DESTINO_PUBLICO, AGENCIA), total))


def main():
    if not os.path.isfile(os.path.join(LAWANG, '_qa_double_guard.js')):
        aborta('falta proyectos/Lawang/_qa_double_guard.js (gitignored: vive solo en este equipo)')
    comprueba_salida()
    # Se vacía por dentro (no se borra la carpeta): presentar.cmd puede tenerla servida.
    os.makedirs(DIST, exist_ok=True)
    for x in os.listdir(DIST):
        p = os.path.join(DIST, x)
        shutil.rmtree(p) if os.path.isdir(p) else os.remove(p)
    copia_v4()
    faltan = cierra_referencias()
    g = os.path.join(DIST, 'contracts', 'assets', 'guard.js')
    os.makedirs(os.path.dirname(g), exist_ok=True)
    open(g, 'w', encoding='utf-8', newline='').write(guard_demo())
    paginas_propias()
    n = neutraliza()
    verifica()
    total = sum(len(f) for _r, _d, f in os.walk(DIST))
    print('OK dist/: %d ficheros · %d con Supabase neutralizado' % (total, n))
    if faltan:
        print('Referencias que no existen en Lawang (no se copian): ' + ', '.join(sorted(faltan)[:15]))
    if '--publico' in sys.argv:
        publica()


if __name__ == '__main__':
    main()
