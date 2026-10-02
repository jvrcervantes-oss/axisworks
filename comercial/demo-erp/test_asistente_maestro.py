# Prueba de build.py:asistente_maestro() (AXW-136, 2-oct-2026): python test_asistente_maestro.py
# Parte de una v4 de mentira con la forma de la de Lawang y mira que (1) la pantalla del maestro entra, (2) el permiso
# cambia en página, menú y hub, y (3) si Lawang cambia cualquiera de esos trozos el build PARA en vez de dejarlo a medias.
import os, shutil, sys, tempfile
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import build

PAG = ('<html><head><script data-herramienta="asistente"></script></head><body><main>\n'
       '<div class="flex flex-col w-full gap-8">VIEJO</div>\n</main></div>\n<script>\nviejo()\n</script>\n</body></html>\n')
NAV = "x { path: 'asistente', texto: 'Asistente', clave: 'asistente' } y contratos: 'contratos', asistente: 'asistente', 'asistente-correos': 'asistente', z"
HER = "{ href:'/intranet/v4/asistente/', herr:'asistente', }"


def corre(pag=PAG, nav=NAV, her=HER):
    d = tempfile.mkdtemp()
    for ruta, txt in (('intranet/v4/asistente/index.html', pag), ('intranet/v4/assets/nav.js', nav), ('contracts/assets/herramientas.js', her)):
        p = os.path.join(d, *ruta.split('/'))
        os.makedirs(os.path.dirname(p), exist_ok=True)
        open(p, 'w', encoding='utf-8').write(txt)
    viejo, build.DIST = build.DIST, d
    try:
        build.asistente_maestro()
        return 'pasa', d
    except SystemExit:
        return 'para', d
    finally:
        build.DIST = viejo


def lee(d, ruta):
    return open(os.path.join(d, *ruta.split('/')), encoding='utf-8').read()


fallos = []
r, d = corre()
p, n, h = lee(d, 'intranet/v4/asistente/index.html'), lee(d, 'intranet/v4/assets/nav.js'), lee(d, 'contracts/assets/herramientas.js')
for nombre, ok in (('pasa con la forma de Lawang', r == 'pasa'), ('entra la pantalla del maestro', 'data-ap="raiz"' in p and 'VIEJO' not in p and 'viejo()' not in p),
                   ('la página pide asistente_peticiones', 'data-herramienta="asistente_peticiones"' in p),
                   ('un solo contenedor cerrado', p.count('<main>') == 1 and p.count('</main>') == 1),
                   ('el menú y el mapa cambian, el de correos NO', "clave: 'asistente_peticiones'" in n and "asistente: 'asistente_peticiones', 'asistente-correos': 'asistente'," in n),
                   ('el hub cambia', "herr:'asistente_peticiones'" in h)):
    if not ok:
        fallos.append(nombre)
for nombre, kw in (('para si Lawang cambia el contenedor', {'pag': PAG.replace('gap-8', 'gap-6')}),
                   ('para si Lawang cambia el cierre de main', {'pag': PAG.replace('</main></div>', '</main>')}),
                   ('para si el menú ya no es el esperado', {'nav': NAV.replace("clave: 'asistente' }", "clave: 'otra' }")}),
                   ('para si el mapa ya no es el esperado', {'nav': NAV.replace("asistente: 'asistente', 'asistente-correos'", "asistente: 'x', 'asistente-correos'")}),
                   ('para si el hub ya no es el esperado', {'her': HER.replace("herr:'asistente'", "herr:'otra'")})):
    if corre(**kw)[0] != 'para':
        fallos.append(nombre)
print('FALLOS:' if fallos else 'OK test_asistente_maestro: 11 casos', *fallos)
sys.exit(1 if fallos else 0)
