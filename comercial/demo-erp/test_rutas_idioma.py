#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""python test_rutas_idioma.py — rutas en el idioma de la instancia (bbm-idioma-total, 15-oct-2026; owner: «la barra de dirección sigue diciendo
palabras en español»). Sin construir el paquete ni abrir navegador (eso es pruebas/rutas_idioma.harness.cjs sobre el paquete construido).

Qué fija, cada cosa con su contraprueba en rojo:
  1. Los mapas (RUTAS_IDIOMA, RUTAS_SUB, HASHES, RUTAS_BUSCA): forma ^[a-z]+(-[a-z]+)*$, ninguno igual a su clave, todos distintos, ninguno clave
     del mapa, carpeta reservada ni carpeta de pantalla (Lawang fijado + las pantallas del maestro). Contraprueba: un mapa roto da problemas.
  2. Cada pestaña de Ajustes (PESTANAS de Lawang + las que añade el build) tiene nombre inglés; y la trampa del build PARA con una pestaña nueva
     sin nombre o con una subcarpeta de pantalla que no está en RUTAS_SUB.
  3. La pasada del build: envuelve las lecturas de la barra (pathname/search/hash, con window./document.), deja las asignaciones a search/hash,
     PARA con una a pathname, no toca raiz.location, es idempotente y el resultado es JavaScript válido. Una decisión de pantalla (el `seg` de
     datos.js) ve la clave interna por la ruta inglesa; contraprueba: sin la pasada ve «workshop». La trampa caza una lectura sin envolver y un href
     leído para decidir sin axwRutaInterna.
  4. El ayudante va como PRIMER <script> (tras <meta charset> si va antes; sin <head> también) y un documento con dos <head> no se toca.
  5. El .htaccess de la instancia (alias_htaccess detrás del legado), evaluado con htaccess_sim.Htaccess.resuelve: /workshop/ se sirve desde
     taller/, /workshop redirige a /workshop/, /settings/setup/ a ajustes/configurar/, /taller/ sigue igual, el legado sigue, punto fijo, sin
     pareja identidad y los hostiles sin salir del dominio. Contraprueba: sin el bloque /workshop/ no llega a taller/; con el submapa detrás de
     su pantalla, /settings/setup/ cae en ajustes/setup/.
  6. El ayudante tal como lo escribe el build (pruebas/rutas_idioma_dom.cjs, DOM mínimo): verde. Contraprueba: sin el traductor de enlaces, y sin la
     canónica, ese mismo test sale en rojo.
"""
import os
import re
import shutil
import subprocess
import sys
import tempfile

AQUI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, AQUI)
_argv, sys.argv = sys.argv, ['build.py']
import build  # noqa: E402
from htaccess_sim import Htaccess, mismo_dominio  # noqa: E402
sys.argv = _argv

FALLOS = []


def ok(cond, msg):
    print(('ok    ' if cond else 'FALLA ') + msg)
    if not cond:
        FALLOS.append(msg)


def para(fn, *a):
    """True si fn(*a) aborta el build (sys.exit), sin que el ABORTA ensucie la salida."""
    import contextlib
    import io
    try:
        with contextlib.redirect_stdout(io.StringIO()):
            fn(*a)
    except SystemExit:
        return True
    return False


# ── 1. Mapas ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
L = build.LAWANG
v4 = os.path.join(L, 'intranet', 'v4')
carpetas = {d for d in os.listdir(v4) if os.path.isdir(os.path.join(v4, d))}
src = open(os.path.join(AQUI, 'build.py'), encoding='utf-8').read()
carpetas |= set(re.findall(r"_pantalla_bot\(v4, '[^']+', '([a-z\-]+)'", src)) | {'whatsapp-bot', 'whatsapp-bot-alta', 'crea-contrasena', 'agente'}
carpetas |= set(build.CLASICAS)
ok(not build.problemas_mapa_rutas(carpetas - set(build.RUTAS_IDIOMA)), 'mapas: forma, únicos, ni clave ni reservado ni carpeta de pantalla: '
   + '; '.join(build.problemas_mapa_rutas(carpetas - set(build.RUTAS_IDIOMA))))
for clave, en in build.RUTAS_IDIOMA.items():
    if not re.fullmatch(r'[a-z]+(-[a-z]+)*', en) or en == clave or en in build.RUTAS_IDIOMA or en in build.RUTAS_RESERVADAS:
        ok(False, 'mapa: %s → %s' % (clave, en))
ok(len(set(build.RUTAS_IDIOMA.values())) == len(build.RUTAS_IDIOMA), 'mapa: todos los nombres ingleses distintos')
ok(build.RUTAS_IDIOMA.get('productos') == 'products' and build.RUTAS_IDIOMA.get('reservas') == 'reservations', 'mapa: products (encargo del owner) y reservations reservado')
ok({'contracts', 'assets', 'entrar', 'portal', 'panel', 'clasico', 'home', 'templates'} <= build.RUTAS_RESERVADAS, 'mapa: las reservadas de la spec')
guardado = dict(build.RUTAS_IDIOMA)
for roto, que in ((('flota', 'workshop'), 'repetido'), (('flota', 'Fleet'), 'mayúsculas'), (('flota', 'assets'), 'reservada'), (('flota', 'taller'), 'clave de otra'),
                  (('flota', 'flota'), 'la propia clave')):
    build.RUTAS_IDIOMA[roto[0]] = roto[1]
    ok(bool(build.problemas_mapa_rutas()), 'contraprueba mapa: %s → %s (%s) da problema' % (roto[0], roto[1], que))
    build.RUTAS_IDIOMA.clear()
    build.RUTAS_IDIOMA.update(guardado)
ok(bool(build.problemas_mapa_rutas({'workshop'})), 'contraprueba mapa: un nombre inglés que ya es carpeta del paquete da problema')
ok(not build.problemas_mapa_rutas(), 'mapa restaurado')

# ── 2. Pestañas de Ajustes ────────────────────────────────────────────────────────────────────────────────────────────────────────────────
aj = open(os.path.join(v4, 'assets', 'ajustes.js'), encoding='utf-8').read()
pest = re.findall(r"'([a-z_]+)'", re.search(r'var PESTANAS = \[([^\]]*)\]', aj).group(1))
pest += re.findall(r"""m\.group\(1\) \+ ", '([a-z_]+)'\];""", src)          # comisiones, cobros (se añaden al final)
pest += re.findall(r"""replace\("\['empresa',", "\['([a-z_]+)', 'empresa',"\)""", src)   # puesta (delante)
ok({'empresa', 'sociedades', 'puesta', 'cobros', 'comisiones'} <= set(pest), 'pestañas: leídas de Lawang y del build: ' + ','.join(pest))
sin = [p for p in pest if p not in build.HASHES['ajustes']]
ok(not sin, 'pestañas: todas con nombre inglés en HASHES[ajustes] (faltan: %s)' % sin)


def dist_juguete(pestanas, subcarpetas=('configurar',)):
    d = tempfile.mkdtemp(prefix='rutas_')
    os.makedirs(os.path.join(d, 'assets'))
    open(os.path.join(d, 'assets', 'ajustes.js'), 'w', encoding='utf-8').write('var PESTANAS = [%s];' % ', '.join("'%s'" % p for p in pestanas))
    for s in subcarpetas:
        os.makedirs(os.path.join(d, 'ajustes', s))
        open(os.path.join(d, 'ajustes', s, 'index.html'), 'w', encoding='utf-8').write('<!doctype html><html><head><meta charset="utf-8"></head><body></body></html>')
    open(os.path.join(d, 'ajustes', 'index.html'), 'w', encoding='utf-8').write(
        '<!doctype html><html><head><meta charset="utf-8"><script>var t=location.hash;</script></head><body><header></header></body></html>')
    os.makedirs(os.path.join(d, 'taller'))
    open(os.path.join(d, 'taller', 'index.html'), 'w', encoding='utf-8').write('<!doctype html><html><head><script>var s=location.pathname;</script><meta charset="utf-8"></head></html>')
    return d


d = dist_juguete(pest)
ok(not para(build.rutas_idioma_paquete, d, 'en'), 'paquete de juguete con las pestañas de verdad: la pasada no para')
aj_html = open(os.path.join(d, 'ajustes', 'index.html'), encoding='utf-8').read()
ok(aj_html.count(build.RUTAS_SCRIPT) == 1 and aj_html.index(build.RUTAS_SCRIPT) < aj_html.index('var t='), 'ayudante delante del primer script de Ajustes')
ok('var t=(globalThis.axwHashInterno||String)(location.hash);' in aj_html, 'lectura de hash envuelta en el <script> en línea')
ok(para(build.rutas_idioma_paquete, d, 'en'), 'una segunda pasada sobre el mismo paquete PARA (el ayudante ya estaba)')
shutil.rmtree(d)
d = dist_juguete(pest + ['nueva'])
ok(para(build.rutas_idioma_paquete, d, 'en'), 'contraprueba: una pestaña nueva sin nombre inglés PARA el build')
shutil.rmtree(d)
d = dist_juguete(pest, subcarpetas=('configurar', 'avanzado'))
ok(para(build.rutas_idioma_paquete, d, 'en'), 'trampa: una subcarpeta con página que no está en RUTAS_SUB (/ajustes/avanzado/) PARA el build')
shutil.rmtree(d)

# ── 3. La pasada sobre el código ──────────────────────────────────────────────────────────────────────────────────────────────────────────
env = build.envuelve_lecturas_barra
casos = [
    ('var seg=location.pathname.replace(/x/,"");', 'var seg=(globalThis.axwRutaInterna||String)(location.pathname).replace(/x/,"");'),
    ('if(window.location.pathname==="/")', 'if((globalThis.axwRutaInterna||String)(window.location.pathname)==="/")'),
    ('a(document.location.search)', 'a((globalThis.axwBuscaInterna||String)(document.location.search))'),
    ('if(location.hash!=="#"+n)location.hash=n;', 'if((globalThis.axwHashInterno||String)(location.hash)!=="#"+n)location.hash=n;'),
    ('location.search="?hilo="+x', 'location.search="?hilo="+x'),
    ('location.hash = "#a"', 'location.hash = "#a"'),
    ('location.hash+="b"', 'location.hash+="b"'),
    ('raiz.location.pathname+"?lwv="', 'raiz.location.pathname+"?lwv="'),
    ('x.location.hashFoo', 'x.location.hashFoo'),
    ('new URLSearchParams(location.search).get("sin_permiso")', 'new URLSearchParams((globalThis.axwBuscaInterna||String)(location.search)).get("sin_permiso")'),
    ('`${location.pathname}`', '`${(globalThis.axwRutaInterna||String)(location.pathname)}`'),
    ('location.hash<=1||location.hash>=2', '(globalThis.axwHashInterno||String)(location.hash)<=1||(globalThis.axwHashInterno||String)(location.hash)>=2'),
]
for antes, despues in casos:
    t, _n, malos = env(antes)
    ok(t == despues and not malos, 'pasada: %s' % antes + ('' if t == despues else ' → ' + t))
    ok(env(t)[0] == t and env(t)[1] == 0, 'pasada idempotente: %s' % antes)
ok(env('location.pathname="/x/"')[2] and env('location.pathname = y')[2], 'una asignación a location.pathname se devuelve para PARAR el build')
# JavaScript válido y la decisión de pantalla por la ruta inglesa (seg de datos.js / editores.js / motion.js / nav.js)
seg = "var seg=location.pathname.replace(/\\/(index\\.html)?$/,'').split('/').pop();console.log(seg);"
ayu = build.rutas_idioma_script('en')[len(build.RUTAS_SCRIPT):-len('</script>')]
tmp = tempfile.mkdtemp(prefix='rutas_js_')
falso = ("var location={pathname:'/workshop/',search:'',hash:'',origin:'https://e.test',get href(){return 'https://e.test'+this.pathname}};"
         "var history={state:null,pushState:function(){},replaceState:function(s,t,u){location.pathname=new URL(u,location.href).pathname}};"
         "var localStorage={getItem:function(){return null}};var document={documentElement:{},addEventListener:function(){}};"
         "function MutationObserver(){this.observe=function(){}};var window=globalThis;window.addEventListener=function(){};")


def corre(codigo):
    f = os.path.join(tmp, 'x.js')
    open(f, 'w', encoding='utf-8').write(codigo)
    r = subprocess.run(['node', f], capture_output=True, text=True, encoding='utf-8')
    return (r.stdout.strip().splitlines() or [''])[-1] + (r.stderr.strip()[-200:] if r.returncode else '')


# la canónica del ayudante deja la barra en /workshop/ (ya lo estaba); la pantalla, con la pasada, decide por «taller»
ok(corre(falso + ayu + env(seg)[0]) == 'taller', 'decisión de pantalla por /workshop/ con la pasada: «taller»')
ok(corre(falso + ayu + seg) == 'workshop', 'contraprueba: sin la pasada la pantalla decide por «workshop» (no la encuentra)')
ok(corre(falso.replace('var window=globalThis;', 'var window={};') + env(seg)[0]) == 'workshop', 'sin el ayudante (otra ventana), lo envuelto no revienta: la ruta tal cual')
shutil.rmtree(tmp)
tr = build.trampas_barra
ok(tr('var a=location.pathname;', 'x.js'), 'trampa: una lectura sin envolver')
ok(not tr(env('var a=location.pathname;location.hash="x";')[0], 'x.js'), 'trampa: envuelta y asignación a hash, bien')
ok(not tr('var u=raiz.location.pathname;', 'contracts/assets/version.js') and tr('var u=raiz.location.pathname;', 'assets/otro.js'),
   'trampa: raiz.location.pathname solo en version.js (lista blanca con su motivo)')
ok(tr("r=new URL(a.getAttribute('href'),location.href).pathname;", 'x.js'), 'trampa: un href leído para decidir sin axwRutaInterna')
for otra in ('a=location?.pathname', 'a=document.URL', 'location.href.indexOf("/taller/")', 'new URL(location.href).searchParams.get("sin_permiso")',
             'const {pathname} = window.location', 'new URL(location.href).pathname'):
    ok(tr(otra, 'x.js'), 'trampa: lectura por otra vía (%s)' % otra)
ok(not tr('var u2=new URL(location.href);u2.searchParams.set("id",1);history.replaceState(null,"",u2.href)', 'x.js'),
   'trampa: new URL(location.href) para reescribir la consulta (datos.js) no para')
ok(not tr("r=interna(new URL(a.getAttribute('href'),location.href).pathname);g.setAttribute('href',p.getAttribute('href'));", 'x.js'),
   'trampa: normalizado con interna() o copiado tal cual, bien')
apag = open(os.path.join(AQUI, 'apagados_instancia.js'), encoding='utf-8').read()
ok(not tr(env(apag)[0], 'contracts/assets/guard.js'), 'apagados_instancia.js (en guard.js y modulos_hub.js) pasa la trampa tras la pasada: '
   + ' | '.join(tr(env(apag)[0], 'contracts/assets/guard.js'))[:300])

# ── 4. Dónde va el ayudante ───────────────────────────────────────────────────────────────────────────────────────────────────────────────
S = '<script id="axw-rutas">X</script>'
iny = build.inyecta_rutas
ok(iny('<!doctype html><html><head><meta charset="utf-8"><title>t</title><script>a</script>', S)
   == '<!doctype html><html><head><meta charset="utf-8">' + S + '<title>t</title><script>a</script>', 'tras <meta charset> si va antes que todo script')
ok(iny('<!DOCTYPE html><html lang="es"><head>\n<script>location.replace("../ajustes/#sociedades")</script>\n<meta charset="utf-8">', S)
   == '<!DOCTYPE html><html lang="es"><head>\n' + S + '<script>location.replace("../ajustes/#sociedades")</script>\n<meta charset="utf-8">',
   'delante del primer script si va antes del <meta charset> (el redirector de /sociedades/)')
ok(iny('<!doctype html><meta charset="utf-8"><title>M</title><script>location.replace("/")</script>', S)
   == '<!doctype html><meta charset="utf-8">' + S + '<title>M</title><script>location.replace("/")</script>', 'sin <head> (/entrar/, /portal/)')
ok(iny('<html><head><header></header></head>', S) is not None and iny('<html><head></head><head></head>', S) is None, '<header> no cuenta como <head>; dos <head>, nada')

# ── 5. El .htaccess ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
dest = tempfile.mkdtemp(prefix='rutas_ht_')
for c in ('taller', 'ajustes/configurar', 'facturas', 'home', 'reservas-producto', 'assets', 'contracts'):
    os.makedirs(os.path.join(dest, *c.split('/')))
alias = build.alias_htaccess(dest)
HOST = 'bbm.prueba.test'


def htaccess(con_alias=True, texto_alias=None):
    return build.HTACCESS_INSTANCIA.format(nombre='x', dominio=HOST, sb='s.supabase.co', dominio_re='(' + re.escape(HOST) + ')',
                                           legado=build.legado_htaccess(dest) + ((texto_alias or alias) if con_alias else ''))


H = Htaccess(htaccess())
r = lambda ruta, metodo='GET': H.resuelve(ruta, metodo=metodo, host=HOST)  # noqa: E731
esperado = [
    ('/workshop/', ('sirve', '/taller/')), ('/workshop/x.js', ('sirve', '/taller/x.js')), ('/workshop', ('redirige', 302, '/workshop/')),
    ('/settings/setup/', ('sirve', '/ajustes/configurar/')), ('/settings/setup/?', ('sirve', '/ajustes/configurar/?')), ('/settings/setup', ('redirige', 302, '/settings/setup/')),
    ('/settings/', ('sirve', '/ajustes/')), ('/settings/x/y', ('sirve', '/ajustes/x/y')), ('/taller/', ('sirve', '/taller/')), ('/ajustes/configurar/', ('sirve', '/ajustes/configurar/')),
    ('/intranet/v4/taller/', ('redirige', 302, '/taller/')), ('/invoices/', ('sirve', '/facturas/')), ('/bookings/', ('sirve', '/reservas-producto/')),
    ('/fleet/', ('sirve', '/fleet/')), ('/home/', ('sirve', '/home/')),
]
for ruta, e in esperado:
    ok(r(ruta) == e, 'htaccess: %s → %s' % (ruta, e) + ('' if r(ruta) == e else ' (sale %s)' % (r(ruta),)))
ok(H.resuelve('/workshop', host='otro.test')[0] == 'redirige' and H.resuelve('/workshop', host='otro.test')[2].startswith('https://' + HOST + '/'),
   'htaccess: otro host sigue yendo al dominio de la instancia (la regla de host va antes)')
ok(r('/workshop', 'POST') == ('sirve', '/workshop'), 'htaccess: el 302 sin barra solo en GET/HEAD')
ok('fleet' not in alias and 'flota' not in alias, 'htaccess: sin la carpeta (flota), sin su alias')
ok(not re.search(r'RewriteRule \^([\w\\-]+)/\(\.\*\)\$ \1/\$1', alias), 'htaccess: ninguna pareja identidad')
origenes = re.findall(r'RewriteRule \^([^$/ (]+)', alias)
destinos = re.findall(r'RewriteRule \S+ ([a-z\-]+)/', alias)
ok(origenes and destinos and not (set(o.replace('\\', '') for o in origenes) & set(destinos)), 'htaccess: punto fijo (ningún destino vuelve a casar como alias)')
ok(alias.index('^settings/setup/') < alias.index('^settings/(.*)$'), 'htaccess: el submapa antes que su pantalla')
ok(htaccess().index('# Legado') < htaccess().index('# Rutas en el idioma'), 'htaccess: el alias DETRÁS del legado')
for hostil in ('//evil.com', '/workshop//evil.com', '/workshop/%2f%2fevil.com', '/%2f%2fevil.com', '/workshop%2f%2fevil.com', '/%5cevil.com',
               '/workshop/%5c%5cevil.com', '/settings/setup//evil.com', '/workshop/..%2f..%2fevil', '//workshop', '/workshop%2f'):
    x = r(hostil)
    ok(x[0] != 'bucle' and (x[0] == 'sirve' or mismo_dominio(x[2])), 'hostil %s: sin salir del dominio (%s)' % (hostil, x))
# contrapruebas del servidor
H0 = Htaccess(htaccess(con_alias=False))
ok(H0.resuelve('/workshop/', host=HOST) == ('sirve', '/workshop/'), 'contraprueba: sin el bloque, /workshop/ no llega a taller/ (404)')
vacio = tempfile.mkdtemp(prefix='rutas_ht0_')
ok(build.alias_htaccess(vacio) == 'AddDefaultCharset UTF-8\n', 'htaccess: el charset va aunque no haya ninguna carpeta del mapa')
shutil.rmtree(vacio)
# el submapa (su RewriteCond, su 302 y su regla interna) movido al final del bloque, detrás de la regla general de settings
lineas = alias.splitlines(True)
i_sub = [i for i, x in enumerate(lineas) if '^settings/setup' in x]
i_sub = sorted(set(i_sub) | {i - 1 for i in i_sub if 'RewriteCond' in lineas[i - 1]})
fin = lineas.index('</IfModule>\n')
reordenado = ''.join(x for i, x in enumerate(lineas[:fin]) if i not in i_sub) + ''.join(lineas[i] for i in i_sub) + '</IfModule>\n'
ok(len(i_sub) == 3 and reordenado.count('RewriteRule') == alias.count('RewriteRule'), 'contraprueba: el bloque reordenado tiene las mismas reglas')
H1 = Htaccess(htaccess(texto_alias=reordenado))
ok(H1.resuelve('/settings/setup/', host=HOST) == ('sirve', '/ajustes/setup/'), 'contraprueba: con el submapa DETRÁS de settings, /settings/setup/ cae en ajustes/setup/ (%s)'
   % (H1.resuelve('/settings/setup/', host=HOST),))
shutil.rmtree(dest)

# ── 6. El ayudante tal como lo escribe el build, en un DOM mínimo ──────────────────────────────────────────────────────────────────────────
tmp = tempfile.mkdtemp(prefix='rutas_ayu_')
cuerpo = lambda idi: build.rutas_idioma_script(idi)[len(build.RUTAS_SCRIPT):-len('</script>')]  # noqa: E731
f_en, f_es = os.path.join(tmp, 'en.js'), os.path.join(tmp, 'es.js')
open(f_en, 'w', encoding='utf-8').write(cuerpo('en'))
open(f_es, 'w', encoding='utf-8').write(cuerpo('es'))
ok('/*' not in cuerpo('en') and 'axw_idioma_ui' not in cuerpo('en') and cuerpo('en').isascii(), 'el ayudante sale sin comentarios, solo ASCII y sin leer axw_idioma_ui')
TEST = os.path.join(AQUI, 'pruebas', 'rutas_idioma_dom.cjs')


def node_test(en, es=f_es):
    r = subprocess.run(['node', TEST, en, es], capture_output=True, text=True, encoding='utf-8')
    return r.returncode, (r.stdout + r.stderr).strip()


rc, sal = node_test(f_en)
ok(rc == 0, 'pruebas/rutas_idioma_dom.cjs con el ayudante del build: ' + sal.splitlines()[-1] if sal else 'sin salida')
if rc:
    print(sal[-2500:])
for nombre, viejo, nuevo, debe in (
        ('sin traductor de enlaces', "var attr = a.getAttribute('href');", "return; var attr = a.getAttribute('href');", 'enlace /taller/'),
        ('sin canónica', '  canonica();\n', '\n', 'canónica: /taller/ → /workshop/')):
    t = cuerpo('en')
    if t.count(viejo) != 1:
        ok(False, 'contraprueba %s: no encuentro el trozo a mutilar' % nombre)
        continue
    f = os.path.join(tmp, 'mutilado.js')
    open(f, 'w', encoding='utf-8').write(t.replace(viejo, nuevo))
    rc, sal = node_test(f)
    ok(rc == 1 and debe in sal, 'contraprueba %s: rojo (%s)' % (nombre, (sal.splitlines() or [''])[-1]))
shutil.rmtree(tmp)

# 7. El interruptor (agencia-c0, 15-oct: las rutas salen apagadas hasta el ensayo en el LiteSpeed de Hostinger): apagado sin la clave en el registro;
#    encendido con «rutas_idioma»: true; AXW_RUTAS_IDIOMA=1 enciende solo en un paquete de prueba y sin él PARA; un valor que no es booleano PARA.
_reg, _env = build._instancia_registro, {k: os.environ.get(k) for k in ('AXW_RUTAS_IDIOMA', 'AXW_PRUEBA_DESPLIEGUE')}
try:
    for k in _env:
        os.environ.pop(k, None)
    build._instancia_registro = lambda n: {}
    ok(build.rutas_en_idioma('x') is False, 'interruptor: sin «rutas_idioma» en el registro, apagadas')
    build._instancia_registro = lambda n: {'rutas_idioma': True}
    ok(build.rutas_en_idioma('x') is True, 'interruptor: «rutas_idioma»: true, encendidas')
    build._instancia_registro = lambda n: {'rutas_idioma': 'si'}
    ok(para(build.rutas_en_idioma, 'x'), 'interruptor: «rutas_idioma»: "si" (no booleano) para el build')
    build._instancia_registro = lambda n: {}
    os.environ['AXW_RUTAS_IDIOMA'] = '1'
    ok(para(build.rutas_en_idioma, 'x'), 'interruptor: AXW_RUTAS_IDIOMA=1 sin paquete de prueba para el build')
    os.environ['AXW_PRUEBA_DESPLIEGUE'] = os.path.join(tempfile.gettempdir(), 'pkg_x')
    ok(build.rutas_en_idioma('x') is True, 'interruptor: AXW_RUTAS_IDIOMA=1 en un paquete de prueba, encendidas')
finally:
    build._instancia_registro = _reg
    for k, v in _env.items():
        os.environ.pop(k, None)
        if v is not None:
            os.environ[k] = v

print('\n%d FALLAN' % len(FALLOS) if FALLOS else '\nTODO BIEN')
sys.exit(1 if FALLOS else 0)
