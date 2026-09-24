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
  Se presenta EN LOCAL compartiendo pantalla. Publicarlo en un servidor es otra
  decisión (Seguridad + Legal otra vez).
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

# Pantallas de la v4 que NO entran (Legal, revisión previa 24-sep).
FUERA_V4 = {'_plan', 'generador-contratos', 'contratos-inversor'}
# Nada que case con esto puede acabar en dist/ (Seguridad).
PROHIBIDO = re.compile(r'(/contracts/app\.html$|apoderados|/firma-|firma_|/anexos/|/folletos/|/templates/|/_plan/|\.sql$|\.test\.js$|/_[^/]*$|'
                       r'Backups|/private/|credentials|token\.json|\.md$|\.py$|\.zip$)', re.I)
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
    ]
    for viejo, nuevo in cambios:
        if doble.count(viejo) != 1:
            aborta('el doble de QA ha cambiado y no encuentro (1 vez): ' + viejo[:70])
        doble = doble.replace(viejo, nuevo)
    doble = doble.replace("'qa-user-1'", "'d-u-1'").replace('qa@axisworks.test', 'direccion@demo.test')
    # Botón «← Módulos» en todas las pantallas: vuelve a la landing (el guard es nuestro).
    volver = ("document.addEventListener('DOMContentLoaded',function(){var a=document.createElement('a');a.href='/';"
              "a.textContent='← Módulos';a.setAttribute('aria-label','Volver a los módulos');"
              "a.style.cssText='position:fixed;left:16px;bottom:16px;z-index:2147483000;background:#485B37;color:#fff;"
              "padding:8px 16px;border-radius:999px;font:500 13px/1.2 system-ui,sans-serif;text-decoration:none';"
              "document.body.appendChild(a);});\n"
              # Tour guiado (tour.js): se reanuda solo en cada pantalla si hay un tour en curso.
              "(function(){var s=document.createElement('script');s.src='/demo/tour.js';s.defer=true;"
              "(document.head||document.documentElement).appendChild(s);})();\n")
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


def paginas_propias():
    carpeta = os.path.join(DIST, 'intranet')
    redir = ('<!doctype html><meta charset="utf-8"><title>Demo</title>'
             '<script>location.replace("/intranet/v4/home/")</script>')
    open(os.path.join(carpeta, 'index.html'), 'w', encoding='utf-8').write(redir)
    # Portada: la landing de módulos (fuente: landing.html, al lado de este script).
    shutil.copy2(os.path.join(AQUI, 'landing.html'), os.path.join(DIST, 'index.html'))
    os.makedirs(os.path.join(DIST, 'demo'), exist_ok=True)
    shutil.copy2(os.path.join(AQUI, 'tour.js'), os.path.join(DIST, 'demo', 'tour.js'))
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
            aviso_propio = r == '/contracts/app.html' and os.path.getsize(p) < 5000 and \
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


if __name__ == '__main__':
    main()
