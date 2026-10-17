# Prueba de build.py: piel_colores_lawang() y colores_lawang_en() (bbm-p42b, 13-oct-2026): python test_colores_lawang.py
# Los colores de Lawang escritos a fuego en lo que publica una instancia pasan a su piel. Mira: (1) cada forma (#rgb, #RRGGBB, #rrggbbaa,
# #rgba, %23 de un SVG en URL, rgb()/rgba() con comas, con espacios y con «/ alfa», en un fill de SVG y dentro de una cadena de JS) se
# cambia CONSERVANDO su forma; (2) el barrido las ve todas; (3) un verde ambiguo (#485B37) en un fichero nuevo PARA, igual que un
# recuento distinto en un fichero conocido; (4) sin piel no se toca nada (Lawang y la demo, byte a byte); (5) binarios y .json no se
# tocan; (6) el papel (brand.css) pasa al acento y la tinta; (7) instancia() lo llama después de escribir páginas y antes de versiona();
# (8) la cola por familias (bbm-p42c): tonos de estado y grises/cremas de Lawang a su token o fondo derivado, lo ajeno con nombre
# intacto, los del maestro con tono de Lawang (COLORES_MAESTRO) también a la piel, contraste de los estados ≥ 4,5:1 o PARA, y un ajeno metido en una familia PARA.
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
    # (8) la cola por familias (bbm-p42c): cada color toma el TONO de su token de la piel y conserva su LUZ (misma luminancia: mismo
    # contraste con lo de alrededor, y lo distinto sigue distinto); lo ajeno con nombre (Tailwind gris/azul, la ✕ de AxisWorks, el azul del
    # maestro) se queda; los del maestro con tono de Lawang (COLORES_MAESTRO) también a la piel; el ejemplo de un campo se queda
    D_ = build._deriva()
    tono = lambda tok, hx: '%02X%02X%02X' % build._ajusta_luz(D_, tuple(BBM[tok]), build._rgb_hex(hx))
    OK = 'ok' if 'ok' in BBM else 'fiduciary-green'
    d = tempfile.mkdtemp()
    escribe(d, 'a/cola.css', '.av{color:#8A5A00;background:#FBF3E4;border-color:#D6CFC2}.ok{color:#2F5D3A}.mal{color:#9E2F26;background:#FDECEA}'
                             '.tw{color:#6B7280;border:1px solid #E5E7EB}.x{fill:#E2581C}.maestro{color:#7A1A14;background:#E6EFDD}.azul{background:#E3E6FD}')
    escribe(d, 'a/campo.js', 'var C=[{k:"aviso",ayuda:"#662906"},{k:"filete",ayuda:"#E7E3D2"}];')
    # lo que se lee en barras y leyendas de Lawang (panel-finanzas.js:189 y saldo_contrato.js:92-142): tras el pase, lo distinto sigue distinto
    escribe(d, 'a/barras.js', "var COLOR={pagado:'#B06A3B',cobrado:'#104C4F',d90:'#4E8386',mas90:'#9AC0C2',sinFecha:'#BEB3A5'};"
                              "var S='repeating-linear-gradient(45deg,#7FB3B5,#7FB3B5 4px,#A9CDCE 4px,#A9CDCE 8px)',F='#C9892B',B='#E8741C',BH='#CF6312';")
    build.piel_colores_lawang(d, 'x')
    cola = open(os.path.join(d, 'a', 'cola.css'), encoding='utf-8').read().upper()
    mira('familia: el tono de aviso, su crema y su filete toman el tono de la piel con su misma luz',
         'COLOR:#%s;' % tono('aviso', '8A5A00') in cola and 'BACKGROUND:#%s;' % tono('aviso', 'FBF3E4') in cola
         and 'BORDER-COLOR:#%s}' % tono('filete', 'D6CFC2') in cola)
    mira('familia: verde y rojo de estado de Lawang (y el fondo rojo) toman ok / peligro de la piel con su misma luz',
         '.OK{COLOR:#%s}' % tono(OK, '2F5D3A') in cola and '.MAL{COLOR:#%s;BACKGROUND:#%s}' % (tono('peligro', '9E2F26'), tono('peligro', 'FDECEA')) in cola)
    mira('ajenos con nombre (Tailwind gris, la ✕ de AxisWorks, el tinte azul del maestro) NO se tocan',
         '#6B7280' in cola and '#E5E7EB' in cola and '#E2581C' in cola and '#E3E6FD' in cola)
    mira('del maestro (COLORES_MAESTRO): el rojo teja y el fondo oliva de sus cajas pasan a peligro y a ok de la piel con su misma luz',
         '.MAESTRO{COLOR:#%s;BACKGROUND:#%s}' % (tono('peligro', '7A1A14'), tono(OK, 'E6EFDD')) in cola)
    b = open(os.path.join(d, 'a', 'barras.js'), encoding='utf-8').read().upper()
    tramos = re.findall(r"(?:COBRADO|D90|MAS90|SINFECHA|PAGADO):'#([0-9A-F]{6})'", b)
    rayas = re.findall(r'#([0-9A-F]{6})', b[b.index('GRADIENT'):b.index("',F=")])
    mira('panel de finanzas: los cinco tramos de la barra siguen siendo cinco colores distintos', len(tramos) == 5 and len(set(tramos)) == 5)
    mira('saldo del contrato: el rayado de «Este documento» sigue teniendo dos colores, y ninguno es el de «Cobrado»',
         len(set(rayas)) == 2 and H('deep-lagoon') not in rayas)
    mira('el botón de reparto y su hover (#E8741C / #CF6312) siguen distintos', len(set(re.findall(r"B[H]?='#([0-9A-F]{6})'", b))) == 2)
    lum = lambda hx: D_.lum(build._rgb_hex(hx))
    origen = {'7FB3B5', 'A9CDCE', '4E8386', '9AC0C2', 'B06A3B', 'C9892B', 'E8741C', 'CF6312', 'BEB3A5'}
    mira('cada color de la cola conserva su luz (luminancia ±7 %): el contraste con lo de alrededor no cambia',
         all(0.93 <= (D_.lum(build._ajusta_luz(D_, tuple(BBM[t]), build._rgb_hex(hx))) + .05) / (lum(hx) + .05) <= 1.07
             for t in ('deep-lagoon', 'aviso', OK, 'peligro', 'accent-gold', 'outline-variant') for hx in origen))
    cj = open(os.path.join(d, 'a', 'campo.js'), encoding='utf-8').read()
    mira('el ejemplo de un campo que es color de la cola (ayuda:"#662906", "#E7E3D2") se queda', 'ayuda:"#662906"' in cj and 'ayuda:"#E7E3D2"' in cj)
    mira('tras el pase, el barrido no encuentra ni un color de la cola', build.colores_lawang_en(d, BBM) == [])
    d2 = tempfile.mkdtemp()
    escribe(d2, 'a/casi.css', '.x{background:#FBFDFC}.y{background:#E6EFE9}')
    mira('un color que con la luz conservada sale IGUAL que otro de Lawang (#FBFDFC) no hace parar el barrido final',
         not para(lambda: build.piel_colores_lawang(d2, 'x')))
    shutil.rmtree(d2)
    d2 = tempfile.mkdtemp()
    escribe(d2, 'a/elegido.css', '.sel{border-color:#CBD6B6}')   # #CBD6B6 es de LAWANG_FAMILIAS (inverse-primary) y aquí también el outline de la piel
    build._piel_preset = lambda n: dict(BBM, outline=[0xCB, 0xD6, 0xB6])
    try:
        build.piel_colores_lawang(d2, 'x')
    finally:
        build._piel_preset = lambda n: BBM
    mira('un color que YA es de la piel (lo que pinta seleccion_css antes del pase) no se retoca aunque coincida con uno de Lawang',
         '#CBD6B6' in open(os.path.join(d2, 'a', 'elegido.css'), encoding='utf-8').read())
    shutil.rmtree(d2)
    sin_ec = {k: v for k, v in BBM.items() if k != 'error-container'}
    build._piel_preset = lambda n: sin_ec
    escribe(d, 'a/y.css', 'a{background:#FDECEA}')
    mira('una piel sin error-container PARA con su mensaje (antes: TypeError de Python)', para(lambda: build.piel_colores_lawang(d, 'x')))
    build._piel_preset = lambda n: BBM
    shutil.rmtree(d)
    # un aviso de piel que no se lee (≈ gris claro): PARA antes de tocar nada; y un ajeno metido por error en una familia, PARA
    d = tempfile.mkdtemp()
    escribe(d, 'a/x.css', 'a{color:#8A5A00}')
    build._piel_preset = lambda n: dict(BBM, aviso=[190, 190, 190])
    mira('contraste: un aviso de la piel por debajo de 4,5:1 sobre blanco o sobre su fondo PARA', para(lambda: build.piel_colores_lawang(d, 'x')))
    build._piel_preset = lambda n: BBM
    viejo_fam = build.LAWANG_FAMILIAS
    try:
        build.LAWANG_FAMILIAS = dict(viejo_fam, outline=viejo_fam['outline'] + ('6B7280',))
        mira('un color ajeno (Tailwind) metido en una familia PARA', para(lambda: build.piel_colores_lawang(d, 'x')))
    finally:
        build.LAWANG_FAMILIAS = viejo_fam
    shutil.rmtree(d)
    # (9) el aviso del gate de push de LAWANG (colores_lawang_diff): contra el Lawang real, sobre un fichero que el build copia
    lee = build.lawang_que_lee_el_build()
    mira('el build lee la v4, el CRM de leads y lo que referencian (contracts/assets/brand.css), no la web pública',
         'intranet/v4/assets/datos.js' in lee and 'intranet/leads/leads.css' in lee and 'contracts/assets/brand.css' in lee and 'index.html' not in lee)
    def dif(*ls, f='intranet/v4/assets/datos.js'):
        viejas, nuevas = sum(1 for x in ls if x[:1] in ' -'), sum(1 for x in ls if x[:1] in ' +')
        return chr(10).join(['diff --git a/%s b/%s' % (f, f), '--- a/' + f, '+++ b/' + f, '@@ -10,%d +10,%d @@' % (viejas, nuevas)] + list(ls))
    r = build.colores_lawang_diff(dif(' a', '+var V="#485B37";', ' b'))
    mira('gate: un #485B37 de más (varios significados) PARA, con su línea', [(x[1], x[3]) for x in r] == [(11, True)])
    r = build.colores_lawang_diff(dif('+var V="#123456";'))
    mira('gate: un color sin token ni familia AVISA (no para): se colaría el tono', [(x[2], x[3]) for x in r] == [('#123456', False)])
    mira('gate: un token de Lawang (#104C4F), blanco, un ajeno con nombre o un texto de ayuda no avisan',
         build.colores_lawang_diff(dif('+a{color:#104C4F;background:#fff;fill:#E2581C}', '+{ayuda:"#123456"}')) == [])
    mira('gate: retocar una línea que YA llevaba el color no avisa (cuenta neto, como el build)',
         build.colores_lawang_diff(dif('-var V="#485B37";', '+var V = "#485B37";', '-x="#123456"', '+x = "#123456"')) == [])
    mira('gate: «Seguridad #163» en un comentario no es un color; una línea con predeploy-ok tampoco avisa',
         build.colores_lawang_diff(dif('+// Seguridad #163: la misma fórmula', '+x="#123456" // predeploy-ok: muestra')) == [])
    mira('gate: un fichero que el build no copia (la web pública) no avisa',
         build.colores_lawang_diff(dif('+x="#485B37"', f='index.html')) == [])
    mira('gate: lo que copia() deja fuera (un .test.js, la v4/index.html de maqueta, contracts/app.html) no avisa: misma regla, se_copia()',
         all(build.colores_lawang_diff(dif('+x="#485B37"', f=x)) == [] for x in
             ('intranet/v4/assets/ficha_publica.test.js', 'intranet/v4/index.html', 'contracts/app.html')))
    mira('gate: una línea AÑADIDA que empieza por «++ » no se toma por la cabecera de otro fichero: lo de después se sigue mirando',
         [x[1] for x in build.colores_lawang_diff(dif('+++ x', '+var V="#485B37";'))] == [11])
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
     cuerpo.index('avisos_para_rotos(') < i < cuerpo.index('versiona(DIST)') and cuerpo.index('pagina_no_instalado(no_instalado') < i)
# los recuentos de LAWANG_POR_CONTEXTO cuadran con el inventario: la suma de #485B37 es la del paquete de bbm medido el 13-oct
mira('las reglas del verde de Lawang suman 44 (37 marca + 7 estado, inventario del 13-oct)',
     sum(r[3] for r in build.LAWANG_POR_CONTEXTO['485B37']) == 44 and sum(r[3] for r in build.LAWANG_POR_CONTEXTO['485B37'] if r[2] == 'ok') == 7)
# el stone-sand de antes del 17-oct (Lawang lo oscureció a #6F6556) sigue escrito a mano en Lawang: tiene que seguir siendo suyo y
# del mismo token, con cualquier fijado; quitar la fila de LAWANG_SUELTOS no fallaría hasta mover el fijado (revisor de 197a5b3)
mira('#BEB3A5 sigue siendo color de Lawang y solo stone-sand (LAWANG_SUELTOS, 17-oct)',
     build.LAWANG_SUELTOS.get('BEB3A5') == 'stone-sand' and set(build.lawang_paleta().get((190, 179, 165), [])) == {'stone-sand'})

print('%d/%d' % (casos - len(fallos), casos))
for f in fallos:
    print('  FALLA: ' + f)
sys.exit(1 if fallos else 0)
