#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Pruebas de las URLs limpias (encargos/20260930_erp_urls_limpias.md, 1-oct-2026).   python test_urls_limpias.py

Qué fija, cada cosa con el fallo que ya costó (o que pasó a un pelo):
  1. reraiz() sobre un bundle de juguete con extractos TEXTUALES de Lawang: mueve las carpetas al mapa, reescribe las rutas
     por token (en sus tres escrituras), deja `../assets/` apuntando a lo mismo y NO da verde con el CSS caído.
  2. nav.js y mascota.js: «¿estoy en la v4?» con la raíz nueva. Con un replace global `indexOf('/intranet/v4/')` pasaba a
     `indexOf('/')`, siempre cierto: el menú saldría en la puerta y en el login, sin un solo error. Se ejecuta la expresión.
  3. La puerta: `?next=` hostil y una ficha con `inicio` no producen un bucle puerta <-> inicio ni una salida del dominio.
  4. El legado del .htaccess, SIMULADO (mod_rewrite mínimo): rutas viejas -> nuevas, solo GET, y los intentos de open
     redirect (`/intranet//evil.com`, `/intranet/%2f%2fevil.com`, `/intranet/v4/x/%5cevil.com`...) no salen del dominio.
     Límite: cómo decodifica LiteSpeed `%2f`/`%5c` no se modela; la prueba real es el `curl` en producción.
  5. Una pregunta de código por la raíz vieja que no está en A_MANO aborta el build (TRAMPA_RUTA)."""
import os
import re
import shutil
import subprocess
import sys
import tempfile
from urllib.parse import unquote

AQUI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, AQUI)
_argv, sys.argv = sys.argv, ['build.py']
import build  # noqa: E402
from htaccess_sim import Htaccess, mismo_dominio  # noqa: E402
sys.argv = _argv

FALLOS = []


def ok(cond, msg):
    print(('ok   ' if cond else 'FALLA ') + msg)
    if not cond:
        FALLOS.append(msg)


def node(js):
    r = subprocess.run(['node', '-e', js], capture_output=True, text=True, encoding='utf-8')
    if r.returncode:
        raise RuntimeError(r.stderr[-400:])
    return r.stdout.strip()


# ── extractos TEXTUALES de Lawang (nav.js, mascota.js, novedades.js, datos.js, intranet/index.html, guard.js) ───────────
NAV = """(function () {
  if (location.pathname.indexOf('/intranet/v4/') === -1 && !document.documentElement.classList.contains('v4')) return;
  var x = 1;
  if (window.__lwFallos || location.pathname.indexOf('/intranet/v4/') === -1) return;
  var ROOT = self ? self.src.replace(/assets\\/nav\\.js.*$/, '') : '../';
  if (location.pathname.indexOf('/intranet/v4/') === -1) return;
  var RUTAS = [['CRM', '/intranet/leads/']];
  a.href = '/intranet/';
  var fuera = function () { location.replace('/intranet/'); };
  if (aut && location.pathname.indexOf('/intranet/v4/') !== -1) { cargaMascota(); }
})();
"""
MASCOTA = """(function () {
  if (location.pathname.indexOf('/intranet/v4/') === -1) return;
  var EN_ASISTENTE = /\\/intranet\\/v4\\/asistente\\/?(index\\.html)?$/.test(location.pathname);
  var yaLoVe = location.pathname.indexOf('/intranet/v4/reservas') !== -1;
})();
"""
NOVEDADES = "(function () {\n  if (location.pathname.indexOf('/intranet/v4/') === -1) return;\n})();\n"
DATOS = ('var enContratos = location.pathname.indexOf("/v4/contratos/") !== -1 || location.pathname.indexOf("/v4/operaciones/") !== -1;\n'
         'var CTA = location.origin + "/intranet/"; var u = "/intranet/v4/facturas/?id=" + id; var m = "falta intranet/vencimientos/logica.js";\n'
         'var q = "%2Fintranet%2Fv4%2Fhome%2F"; var l = "/intranet/leads/?v=agenda"; var o = "/intranet/operaciones/?contrato=1";\n'
         'var prosa = "Pide aquí lo que la intranet no te deja hacer";\n')
PUERTA = """<!doctype html><html><head><link rel="stylesheet" href="../contracts/assets/brand.css"></head><body><script>
function rutaValida(r){
  if(!/^\\/[^/\\\\]/.test(r || '')) return false;
  try{ return new URL(r, location.origin).origin === location.origin; }catch(e){ return false; }
}
function inicioInstancia(){
  const i = (window.LW_INSTANCIA || {}).inicio;
  return rutaValida(i) && i !== '/intranet/' ? i : '';
}
function siguiente(){
  const n = new URLSearchParams(location.search).get('next');
  return rutaValida(n) ? n : (inicioInstancia() || '/intranet/');
}
function mostrarApp(mostrar){ return mostrar; }
location.replace('/intranet/?desactivado=1');
</script></body></html>
"""
GUARD = "var LOGIN  = '/intranet/';\nvar HUB    = '/intranet/';\nlocation.replace(LOGIN + '?next=' + encodeURIComponent(location.pathname));\n"
PANTALLA = ('<!doctype html><html><head><link href="../assets/fonts/fonts.css?v=1" rel="stylesheet">'
            '<link href="../assets/shell.css?v=1" rel="stylesheet">'
            '<script src="/contracts/assets/guard.js?v=1"></script><script src="../assets/nav.js?v=1" defer></script></head>'
            '<body><a href="../contratos/">c</a><a href="/intranet/v4/facturas/?id=1">f</a>'
            '<a href="../../facturas/totales.js">cambia de destino</a></body></html>')


def juguete(raiz):
    def w(ruta, txt):
        p = os.path.join(raiz, *ruta.split('/'))
        os.makedirs(os.path.dirname(p), exist_ok=True)
        open(p, 'w', encoding='utf-8', newline='').write(txt)
    w('intranet/index.html', PUERTA)
    for n in ('home', 'contratos', 'facturas', 'asistente', 'reservas', 'operaciones'):
        w('intranet/v4/%s/index.html' % n, PANTALLA)
    w('intranet/v4/entrar/index.html', '<script>location.replace("/intranet/")</script>')
    w('intranet/v4/assets/nav.js', NAV)
    w('intranet/v4/assets/mascota.js', MASCOTA)
    w('intranet/v4/assets/novedades.js', NOVEDADES)
    w('intranet/v4/assets/datos.js', DATOS)
    w('intranet/v4/assets/shell.css', "@font-face{src:url(fonts/x.woff2)} .a{background:url('../assets/fonts/x.woff2')}")
    w('intranet/v4/assets/fonts/fonts.css', '')
    w('intranet/v4/assets/fonts/x.woff2', 'x')
    w('intranet/leads/index.html', '<link href="leads.css" rel="stylesheet"><script src="../../contracts/assets/dinero.js"></script>')
    w('intranet/leads/leads.css', '')
    w('intranet/facturas/totales.js', 'x')
    w('contracts/assets/guard.js', GUARD)
    w('contracts/assets/dinero.js', 'x')
    w('contracts/assets/brand.css', '')


def lee(raiz, ruta):
    return open(os.path.join(raiz, *ruta.split('/')), encoding='utf-8').read()


# ── 1. tokens ────────────────────────────────────────────────────────────────────────────────────────────────────────
def reescribe(s):
    return build.RUTA_INTRANET.sub(lambda m: build._reescribe(m, []), s)


for antes, despues in (
        ('"/intranet/v4/home/"', '"/home/"'), ('"/intranet/"', '"/"'), ("'/intranet/v4/'", "'/'"),
        (r'\/intranet\/v4\/asistente\/', r'\/asistente\/'), ('%2Fintranet%2Fv4%2Fhome%2F', '%2Fhome%2F'),
        ('intranet/vencimientos/logica.js', 'clasico/vencimientos/logica.js'), ('la intranet no te deja', 'la intranet no te deja'),
        ('/intranet/leads/?v=agenda', '/clasico/leads/?v=agenda'), ('/intranet/creatividades/redes/?id=', '/clasico/creatividades/redes/?id='),
        ('/intranet/v4/assets/img/a.png', '/assets/img/a.png'), ('/intranet/operaciones/?contrato=1', '/operaciones/?contrato=1'),
        ('https://x.example/intranet/', 'https://x.example/'), ('/intranet.css', '/intranet.css'),
        ('"/intranet/v4/reservas"', '"/reservas"'), ('/intranet/v4/entrar/', '/entrar/')):
    ok(reescribe(antes) == despues, 'token %s -> %s' % (antes, despues))
ok(build.mapea_url('/intranet/index.html') == '/', 'mapea_url: la puerta es la raíz')

# ── 2. reraiz sobre el bundle de juguete ─────────────────────────────────────────────────────────────────────────────
tmp = tempfile.mkdtemp(prefix='urls_limpias_')
try:
    juguete(tmp)
    build.DIST = tmp          # rel() y las comprobaciones miran DIST
    pantallas = build.reraiz(tmp)
    ok(pantallas == ['asistente', 'contratos', 'facturas', 'home', 'operaciones', 'reservas'], 'las pantallas v4 pasan a la raíz: %s' % pantallas)
    ok(not os.path.exists(os.path.join(tmp, 'intranet')), 'ya no existe /intranet/')
    ok(os.path.isfile(os.path.join(tmp, 'index.html')), 'la puerta (intranet/index.html) es la raíz')
    ok(os.path.isfile(os.path.join(tmp, 'clasico', 'leads', 'index.html')) and os.path.isfile(os.path.join(tmp, 'clasico', 'facturas', 'totales.js')),
       'las clásicas van a /clasico/<x>/')
    ok(os.path.isfile(os.path.join(tmp, 'assets', 'nav.js')) and not os.path.exists(os.path.join(tmp, 'entrar', 'index.html')),
       '/assets/ sale de la v4 y el stub v4/entrar se elimina')
    home = lee(tmp, 'home/index.html')
    ok('../assets/nav.js' in home and '../contratos/' in home, 'las relativas que siguen valiendo no se tocan')
    ok('href="/facturas/?id=1"' in home, 'la absoluta /intranet/v4/facturas/ pasa a /facturas/')
    ok('../../facturas/totales.js' not in home and 'href="/clasico/facturas/totales.js"' in home,
       'una relativa que ya no cae en el mismo sitio (../../facturas/ era /intranet/facturas/) pasa a absoluta: /clasico/facturas/')
    ok('url(fonts/x.woff2)' in lee(tmp, 'assets/shell.css'), 'url() relativa dentro de assets/ no se toca')
    ok('../../contracts/assets/dinero.js' in lee(tmp, 'clasico/leads/index.html'), 'clasico/leads/ conserva su profundidad: ../../contracts/ vale')
    ok(build.enlaces_rotos(tmp) == [], 'enlaces_rotos limpio sobre el bundle nuevo: %s' % build.enlaces_rotos(tmp))
    os.remove(os.path.join(tmp, 'assets', 'shell.css'))
    ok('/assets/shell.css' in build.enlaces_rotos(tmp), 'NEGATIVO: con la hoja de estilos caída, enlaces_rotos NO da verde')
    datos = lee(tmp, 'assets/datos.js')
    ok('indexOf("/contratos/")' in datos and 'indexOf("/operaciones/")' in datos, 'datos.js: «/v4/contratos/» -> «/contratos/»')
    ok('"/facturas/?id="' in datos and 'location.origin + "/"' in datos and 'clasico/vencimientos/logica.js' in datos
       and '%2Fhome%2F' in datos and '/clasico/leads/?v=agenda' in datos and '/operaciones/?contrato=1' in datos
       and 'la intranet no te deja' in datos, 'datos.js: rutas absolutas, mensajes y %2F traducidos; la prosa intacta')
    todo = ''.join(lee(tmp, r) for r in ('assets/nav.js', 'assets/mascota.js', 'assets/datos.js', 'home/index.html', 'index.html'))
    ok(not build.RESTO_RAIZ.search(todo), 'no queda ningún intranet/ ni /v4/ en lo reescrito')
    guard = lee(tmp, 'contracts/assets/guard.js')
    ok("LOGIN  = '/'" in guard and "HUB    = '/'" in guard, 'guard.js: LOGIN y HUB apuntan a la puerta nueva (/)')

    # ── 3. «¿estoy en la v4?»: se ejecuta la expresión que quedó en nav.js / mascota.js / novedades.js ─────────────────
    nav, mas, nov = lee(tmp, 'assets/nav.js'), lee(tmp, 'assets/mascota.js'), lee(tmp, 'assets/novedades.js')
    ok(not re.search(r"indexOf\(\s*['\"]/['\"]\s*\)", nav + mas + nov),
       'nav.js/mascota.js/novedades.js no preguntan por indexOf(\'/\') (siempre cierto)')
    expr = re.search(r'(/\^\(\?:.*?\)\$/)\.test\(location\.pathname\)', nav).group(1)
    tabla = {'/': 1, '/index.html': 1, '/clasico/leads/': 1, '/entrar/': 1, '/portal/': 1, '/panel/': 1, '/contracts/app.html': 1,
             '/home/': 0, '/contratos/': 0, '/facturas/': 0, '/asistente/': 0, '/assets/nav.js': 0}
    salida = node('var E=%s;var t=%s;console.log(JSON.stringify(Object.keys(t).map(function(p){return E.test(p)?1:0})))' % (
        expr, '{' + ','.join('"%s":1' % k for k in tabla) + '}'))
    ok(salida == str(list(tabla.values())).replace(' ', ''), 'la expresión «no es v4» separa la puerta/clásico/login de las pantallas: %s' % salida)
    ok(nav.count(expr) == 4 and mas.count(expr) == 1 and nov.count(expr) == 1, 'nav.js 4 veces (3 + 1 negada), mascota.js 1, novedades.js 1')
    ok('!' + expr in nav and "location.pathname.indexOf('/reservas') !== -1" in mas, 'el «!== -1» queda negado y «/v4/reservas» pasa a «/reservas»')
    ok(r'/\/asistente\/?(index\.html)?$/' in mas, 'mascota.js: la regex escapada del asistente pasa a /\\/asistente\\//')

    # ── 4. la puerta: ni bucle puerta <-> inicio ni salida del dominio ──────────────────────────────────────────────
    js = re.search(r'(function rutaValida.*?)function mostrarApp', lee(tmp, 'index.html'), re.S).group(1)
    prueba = """
      var location, window = {};
      function caso(inicio, search) {
        window.LW_INSTANCIA = inicio === null ? {} : { inicio: inicio };
        location = { origin: 'https://bbm.axisworks.studio', search: search };
        return JSON.stringify([inicioInstancia(), siguiente()]);
      }
      %s
      console.log([
        caso('/home/', ''), caso('/home/', '?next=/contratos/'), caso('/home/', '?next=/'), caso('/home/', '?next=//evil.com'),
        caso('/home/', '?next=/%%09/evil.com'), caso('/home/', '?next=/\\\\evil.com'), caso('/home/', '?next=https://evil.com'),
        caso('/', ''), caso(null, '')].join(' ; '));
    """ % js
    esperado = ' ; '.join(['["/home/","/home/"]', '["/home/","/contratos/"]'] + ['["/home/","/home/"]'] * 5 + ['["","/"]', '["","/"]'])
    salida = node(prueba)
    ok(salida == esperado, 'puerta: next hostil o inicio="/" no producen bucle ni salida del dominio\n      %s' % salida)
finally:
    shutil.rmtree(tmp, ignore_errors=True)


# ── 5. la trampa: otra pregunta por la raíz vieja no se traduce en silencio ──────────────────────────────────────────
tmp = tempfile.mkdtemp(prefix='urls_limpias_')
try:
    juguete(tmp)
    open(os.path.join(tmp, 'intranet', 'v4', 'assets', 'otro.js'), 'w', encoding='utf-8').write(
        "if (location.pathname.indexOf('/intranet/v4/') > -1) { x(); }\n")
    build.DIST = tmp
    try:
        build.reraiz(tmp)
        ok(False, 'TRAMPA: una comparación nueva con indexOf(\'/intranet/v4/\') debe abortar el build')
    except SystemExit:
        ok(True, 'TRAMPA: una comparación nueva con indexOf(\'/intranet/v4/\') aborta el build')
finally:
    shutil.rmtree(tmp, ignore_errors=True)


# ── 6. el .htaccess de legado, simulado (htaccess_sim.py) ──────────────────────────────────────────────────────────────
if __name__ == '__main__':
    tmp = tempfile.mkdtemp(prefix='urls_limpias_')
    try:
        for n in ('home', 'contratos', 'facturas', 'operaciones', 'asistente', 'obra', 'leads', 'contracts', 'portal', 'entrar', 'assets', 'demo'):
            os.makedirs(os.path.join(tmp, n))
        for n in ('obra', 'leads'):
            os.makedirs(os.path.join(tmp, 'clasico', n))
            open(os.path.join(tmp, 'clasico', n, 'index.html'), 'w').write('x')
        os.makedirs(os.path.join(tmp, 'clasico', 'facturas'))      # solo assets: sin pantalla clásica
        h = Htaccess(build.legado_htaccess(tmp))
        for ruta, consulta, esperado in (
                ('/intranet/', '', '/'), ('/intranet', '', '/'), ('/intranet/v4/', 'next=/home/', '/?next=/home/'), ('/intranet/v4', '', '/'),
                ('/intranet/index.html', '', '/'), ('/intranet/v4/home/', '', '/home/'),
                ('/intranet/v4/home', 'tour=1&sel=ab', '/home/?tour=1&sel=ab'),
                ('/intranet/v4/contratos/x/y.html', '', '/contratos/x/y.html'),
                ('/intranet/v4/assets/fonts/a.woff2', '', '/assets/fonts/a.woff2'),
                ('/intranet/v4/entrar/', '', '/entrar/'), ('/intranet/leads/', 'v=agenda', '/clasico/leads/?v=agenda'),
                ('/intranet/obra/', '', '/clasico/obra/'), ('/intranet/facturas/', '', '/facturas/'),
                ('/intranet/facturas/totales.js', '', '/clasico/facturas/totales.js'),
                ('/intranet/operaciones/', 'contrato=1', '/operaciones/?contrato=1')):
            r = h.aplica(ruta, consulta=consulta)
            ok(r == (302, esperado), 'legado GET %s%s -> 302 %s   (sale %s)' % (ruta, '?' + consulta if consulta else '', esperado, r))
        ok(h.aplica('/intranet/v4/home/', metodo='POST') is None, 'legado: un POST no se redirige (solo GET/HEAD)')
        ok(h.aplica('/home/') is None and h.aplica('/contracts/assets/a.js') is None, 'las rutas nuevas no las toca el legado')
        for ruta in ('/intranet//evil.com', '/intranet/%2f%2fevil.com', '/intranet/v4/x/%5cevil.com', '/intranet/v4//evil.com',
                     '/intranet/v4/%2fevil.com', '/intranet/%5cevil.com', '/intranet/v4/home/%2f%2fevil.com',
                     '/intranet/v4/home/%5cevil.com', '/intranet/v4/home//evil.com', '/intranet/leads//evil.com',
                     '/intranet/v4/..%2f..%2fevil.com'):
            for decodifica in (True, False):
                r = h.aplica(ruta, decodifica=decodifica)
                ok(r is None or mismo_dominio(r[1]), 'open redirect %s (%s) -> %s' % (ruta, 'decodificado' if decodifica else 'literal', r))
        candidatos = [h.aplica(r_)[1] for r_ in ('/intranet/v4/home/%2f%2fevil.com', '/intranet/v4/home//evil.com', '/intranet/leads//evil.com')]
        ok(all(re.match(r'/(home|clasico/leads)/', c) for c in candidatos),
           'con basura detrás, el destino sigue bajo /<carpeta del bundle>/: %s' % candidatos)
    finally:
        shutil.rmtree(tmp, ignore_errors=True)

    print('\n%s' % ('TODO EN VERDE' if not FALLOS else '%d FALLO(S)' % len(FALLOS)))
    sys.exit(1 if FALLOS else 0)
