# Prueba de build.py: piel_colores_lawang() y colores_lawang_en() (bbm-p42b, 13-oct-2026): python test_colores_lawang.py
# Los colores de Lawang escritos a fuego en lo que publica una instancia pasan a su piel. Mira: (1) cada forma (#rgb, #RRGGBB, #rrggbbaa,
# #rgba, %23 de un SVG en URL, rgb()/rgba() con comas, con espacios y con «/ alfa», en un fill de SVG y dentro de una cadena de JS) se
# cambia CONSERVANDO su forma; (2) el barrido las ve todas; (3) un verde ambiguo (#485B37) en un fichero nuevo PARA, igual que un
# recuento distinto en un fichero conocido; (4) sin piel no se toca nada (Lawang y la demo, byte a byte); (5) binarios y .json no se
# tocan; (6) el papel (brand.css) pasa al acento y la tinta; (7) instancia() lo llama después de escribir páginas y antes de versiona().
# NO ejecuta build.instancia(): trabaja en carpetas temporales.
import hashlib, os, re, shutil, sys, tempfile
AQUI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, AQUI)
import build

casos, fallos = 0, []


def mira(nombre, ok):
    global casos
    casos += 1
    print(('ok   ' if ok else 'FALLA ') + nombre)
    if not ok:
        fallos.append(nombre)


def para(f):
    try:
        f()
        return False
    except SystemExit:
        return True


def huella(d):
    h = hashlib.sha256()
    for r, _ds, fs in sorted(os.walk(d)):
        for f in sorted(fs):
            h.update(f.encode()); h.update(open(os.path.join(r, f), 'rb').read())
    return h.hexdigest()


def escribe(d, rel, txt, modo='w'):
    ruta = os.path.join(d, *rel.split('/'))
    os.makedirs(os.path.dirname(ruta), exist_ok=True)
    if modo == 'wb':
        open(ruta, 'wb').write(txt)
    else:
        open(ruta, 'w', encoding='utf-8', newline='').write(txt)


BBM = build._deriva().valida_preset(__import__('json').load(open(os.path.join(build.AGENCIA, 'erp', 'tema', 'presets.json'), encoding='utf-8'))['presets']['bbm'])
H = lambda tok: '%02X%02X%02X' % tuple(BBM[tok])
DL = H('deep-lagoon')   # #104C4F de Lawang → deep-lagoon de la piel
viejo_preset, viejo_reglas, viejo_papel = build._piel_preset, build.LAWANG_POR_CONTEXTO, build.PAPEL_FIJOS
try:
    build._piel_preset = lambda n: BBM
    build.LAWANG_POR_CONTEXTO = {'485B37': (('a/marca.css', r'', None, 1), ('a/estado.js', r'disponible:', 'ok', 1))}
    build.PAPEL_FIJOS = (('contracts/assets/brand.css', '--brand-primary: var(--tg);', '--brand-primary: %s;', 'accent-gold'),)
    FORMAS = ('a{color:#104c4f}', 'b{color:#104C4F}', 'c{color:#104C4FCC}', 'd{background:url("data:image/svg+xml,%3Csvg fill=\'%23104C4F\'/%3E")}',
              'e{box-shadow:0 0 0 3px rgba(16,76,79,.12)}', 'f{color:rgb(16 76 79 / 50%)}', 'g{color:rgba(16, 76, 79, .3)}')
    d = tempfile.mkdtemp()
    escribe(d, 'a/formas.css', '\n'.join(FORMAS))
    escribe(d, 'a/svg.html', '<svg><path fill="#104C4F"/></svg>')
    escribe(d, 'a/cadena.js', 'var x="color:#104C4F";var y=\'#485B37\'.length;')
    # (2) el barrido ve cada forma ANTES del pase
    vistas = build.colores_lawang_en(d)
    mira('el barrido ve las 7 formas del CSS + el fill de SVG + la cadena de JS (%d)' % len(vistas),
         sum(1 for v in vistas if v.startswith('a/formas.css')) == 7 and any(v.startswith('a/svg.html') for v in vistas)
         and sum(1 for v in vistas if v.startswith('a/cadena.js')) == 2)
    # (3) #485B37 en un fichero que no tiene regla: PARA
    mira('un verde ambiguo de Lawang en un fichero sin regla PARA el build', para(lambda: build.piel_colores_lawang(d, 'x')))
    # ya clasificado (marca y estado) + las formas: pasa y conserva la forma
    os.remove(os.path.join(d, 'a', 'cadena.js'))
    escribe(d, 'a/cadena.js', 'var x="color:#104C4F";')
    escribe(d, 'a/marca.css', '.btn{background:#485B37}')
    escribe(d, 'a/estado.js', 'var E={disponible:"#485B37"};')
    escribe(d, 'a/logo.png', b'\x89PNG#104C4F', 'wb')
    escribe(d, 'a/datos.json', '{"c":"#104C4F"}')
    escribe(d, 'a/ajustes.js', 'var C=[{k:"tinta_deep",label:"Tinta oscura",ayuda:"#42210B"},{k:"x",estilo:"color:#42210B"}];')
    escribe(d, 'a/campo.html', '<input placeholder="#104C4F">\r\n<p style="color:#104C4F">x</p>\r\n')
    n = build.piel_colores_lawang(d, 'x')
    css = open(os.path.join(d, 'a', 'formas.css'), encoding='utf-8').read()
    r = '%d %d %d' % tuple(BBM['deep-lagoon'])
    mira('cada forma pasa al token de la piel CONSERVANDO su forma (#, alfa, %23, comas, espacios)',
         ('#' + DL + '}') in css and ('#' + DL + 'CC}') in css and ('%23' + DL) in css
         and 'rgba(%s,%s,%s,.12)' % tuple(BBM['deep-lagoon']) in css and 'rgb(%s %s %s / 50%%)' % tuple(BBM['deep-lagoon']) in css
         and 'rgba(%s, %s, %s, .3)' % tuple(BBM['deep-lagoon']) in css and '104C4F' not in css.upper().replace(DL, ''))
    mira('marca → su token; estado («disponible») → el verde de estado de la piel',
         H('primary-container') in open(os.path.join(d, 'a', 'marca.css'), encoding='utf-8').read()
         and H('ok') in open(os.path.join(d, 'a', 'estado.js'), encoding='utf-8').read())
    aj = open(os.path.join(d, 'a', 'ajustes.js'), encoding='utf-8').read()
    mira('un hex que es TEXTO (ayuda:"#42210B", el ejemplo de un campo) no se cambia; el mismo color pintado, sí',
         'ayuda:"#42210B"' in aj and 'color:#42210B' not in aj)
    cp = open(os.path.join(d, 'a', 'campo.html'), encoding='utf-8', newline='').read()
    mira('placeholder="#…" es texto y se queda; el CRLF del fichero se queda CRLF', 'placeholder="#104C4F"' in cp and 'color:#104C4F' not in cp
         and cp.count('\r\n') == 2)
    mira('el barrido no cuenta el texto (ayuda/placeholder) como color de Lawang', build.colores_lawang_en(d, BBM) == [])
    mira('ni binarios ni .json se tocan', open(os.path.join(d, 'a', 'logo.png'), 'rb').read() == b'\x89PNG#104C4F'
         and '#104C4F' in open(os.path.join(d, 'a', 'datos.json'), encoding='utf-8').read())
    mira('tras el pase el barrido no ve nada (%d cambios)' % n, n >= 10 and build.colores_lawang_en(d, BBM) == [])
    # recuento distinto en un fichero CON regla: PARA (una aparición nueva de Lawang no se pinta en silencio)
    escribe(d, 'a/marca.css', '.btn{background:#485B37}.b2{color:#485B37}'); escribe(d, 'a/estado.js', 'var E={disponible:"#485B37"};')
    mira('una aparición más del verde en un fichero conocido PARA (recuento)', para(lambda: build.piel_colores_lawang(d, 'x')))
    os.remove(os.path.join(d, 'a', 'estado.js')); escribe(d, 'a/marca.css', '.btn{background:#485B37}')
    mira('una pantalla que no sale (módulo apagado) no exige su recuento', build.piel_colores_lawang(d, 'x') >= 1)
    shutil.rmtree(d)
    # la guarda «solo cambian colores»: si el pase tocara algo que no es un color, PARA
    d = tempfile.mkdtemp()
    escribe(d, 'a/x.css', 'a{color:#104C4F}')
    viejo_pon = build._pon_color
    try:
        build._pon_color = lambda m, c: viejo_pon(m, c) + ';/*x*/'
        mira('si el pase cambiara algo que no es un color, PARA (guarda «solo colores»)', para(lambda: build.piel_colores_lawang(d, 'x')))
    finally:
        build._pon_color = viejo_pon
    shutil.rmtree(d)
    # (6) el papel
    d = tempfile.mkdtemp()
    escribe(d, 'contracts/assets/brand.css', ':root{\n  --brand-primary: var(--tg);\n}')
    build.piel_colores_lawang(d, 'x')
    mira('papel: --brand-primary pasa al acento de la piel', ('--brand-primary: #%s;' % H('accent-gold')) in open(os.path.join(d, 'contracts', 'assets', 'brand.css'), encoding='utf-8').read())
    escribe(d, 'contracts/assets/brand.css', ':root{ --brand-primary:var(--tg); }')
    mira('papel: si brand.css cambia de forma, PARA', para(lambda: build.piel_colores_lawang(d, 'x')))
    shutil.rmtree(d)
    # (4) sin piel: nada
    build._piel_preset = lambda n: None
    d = tempfile.mkdtemp()
    escribe(d, 'a/formas.css', '\n'.join(FORMAS)); escribe(d, 'a/x.js', 'var c="#485B37";')
    antes = huella(d)
    mira('sin piel (Lawang, demo) devuelve 0 y el paquete queda byte a byte igual', build.piel_colores_lawang(d, 'lawang') == 0 and huella(d) == antes)
    shutil.rmtree(d)
finally:
    build._piel_preset, build.LAWANG_POR_CONTEXTO, build.PAPEL_FIJOS = viejo_preset, viejo_reglas, viejo_papel

# (7) dónde se llama
cuerpo = open(os.path.join(AQUI, 'build.py'), encoding='utf-8').read()
cuerpo = cuerpo[cuerpo.index('\ndef instancia('):]
i = cuerpo.index('piel_colores_lawang(DIST, nombre)')
mira('instancia() lo llama tras escribir las páginas «no instalado» y antes de versiona()',
     cuerpo.index('avisos_para_rotos()') < i < cuerpo.index('versiona(DIST)') and cuerpo.index('pagina_no_instalado(no_instalado') < i)
# los recuentos de LAWANG_POR_CONTEXTO cuadran con el inventario: la suma de #485B37 es la del paquete de bbm medido el 13-oct
mira('las reglas del verde de Lawang suman 44 (37 marca + 7 estado, inventario del 13-oct)',
     sum(r[3] for r in build.LAWANG_POR_CONTEXTO['485B37']) == 44 and sum(r[3] for r in build.LAWANG_POR_CONTEXTO['485B37'] if r[2] == 'ok') == 7)

print('%d/%d' % (casos - len(fallos), casos))
for f in fallos:
    print('  FALLA: ' + f)
sys.exit(1 if fallos else 0)
