# Prueba de build.py:extras_pantalla() + extras.html + el rótulo por ruta de apagados_instancia.js (erp-front, 14-oct-2026; owner 13-oct: «¿Fleets and rates y
# Products no es lo mismo?»): python test_extras.py
# Parte de los ficheros REALES de Lawang (el sha fijado, solo lectura) copiados a una carpeta temporal. Mira que (1) /productos/ de una instancia de tipo Reservas
# pasa a ser la pantalla propia del maestro, con la puerta `productos` y SIN la tabla de Lawang, y el build PARA si falta la pantalla de Lawang; (2) la pantalla cumple
# las reglas del front (sin innerHTML, escribe SOLO por producto_guarda, un alta nace 'servicio' y nunca se manda 'alquiler', lee solo por productos_catalogo_datos (AXW-290), sin
# 'EUR' a mano); (3) todo texto que pinta tiene inglés e indonesio; (4) el rótulo del menú se cambia por la RUTA en apagados_instancia.js, no por el texto de nav.js.
# El comportamiento en un navegador lo miden pruebas/extras.harness.cjs y pruebas/menu_instancia.harness.cjs (sobre el paquete construido). No escribe en erp/despliegues/.
import json, os, re, shutil, subprocess, sys, tempfile
AQUI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, AQUI)
import build

FUENTE = open(os.path.join(AQUI, 'extras.html'), encoding='utf-8').read()
MARCADO, SCRIPT = FUENTE.split('<!--AXW_SCRIPT-->')
COMUN_JS = open(os.path.join(AQUI, '_compartido', 'pantalla_comun.js'), encoding='utf-8').read()
APAGADOS = open(os.path.join(AQUI, 'apagados_instancia.js'), encoding='utf-8').read()
def sin_comentarios(t):
    t = re.sub(r'/\*.*?\*/', '', t, flags=re.S)
    return re.sub(r'(?m)^\s*//.*$', '', t)
CODIGO = sin_comentarios(SCRIPT)
FICHEROS = ['intranet/v4/asistente/index.html', 'intranet/v4/productos/index.html']

fallos, casos = [], 0
def mira(nombre, ok):
    global casos
    casos += 1
    if not ok:
        fallos.append(nombre)


def corre(quita=None):
    d = tempfile.mkdtemp()
    for f in FICHEROS:
        if f == quita:
            continue
        dst = os.path.join(d, *f.split('/'))
        os.makedirs(os.path.dirname(dst), exist_ok=True)
        shutil.copy2(os.path.join(build.LAWANG, *f.split('/')), dst)
    viejo, build.DIST = build.DIST, d
    try:
        build.extras_pantalla()
        return 'pasa', d
    except SystemExit:
        return 'para', d
    finally:
        build.DIST = viejo


# -- (1) la pantalla entra en /productos/ en lugar de la de Lawang
r, d = corre()
pag = open(os.path.join(d, 'intranet', 'v4', 'productos', 'index.html'), encoding='utf-8').read() if r == 'pasa' else ''
mira('extras_pantalla() pasa con la pantalla Productos de Lawang copiada', r == 'pasa')
mira('/productos/ es la pantalla del maestro (data-ex="raiz") y ya no lleva la tabla de Lawang (lw-prd-lista)', 'data-ex="raiz"' in pag and 'lw-prd-lista' not in pag)
mira('la puerta de la cáscara es la herramienta productos (la casilla de Usuarios sigue igual)', 'data-herramienta="productos"' in pag and 'data-herramienta="asistente"' not in pag)
mira('título de pestaña «Extras y servicios»', '<title data-lw-titulo>Extras y servicios</title>' in pag)
mira('las ayudas comunes van pegadas UNA vez (sin marcas sueltas)', pag.count('function axwComun(') == 1 and '/*AXW_COMUN_JS*/' not in pag and '/*AXW_COMUN_CSS*/' not in pag)
scripts = re.findall(r'<script>([\s\S]*?)</script>', pag)
tmp = tempfile.mkdtemp()
js = os.path.join(tmp, 'ex.js')
open(js, 'w', encoding='utf-8').write(scripts[-1] if scripts else '')
mira('el script de la pantalla compila (node --check)', bool(scripts) and subprocess.run(['node', '--check', js], capture_output=True).returncode == 0)
r2, _ = corre(quita='intranet/v4/productos/index.html')
mira('sin la pantalla Productos de Lawang el build PARA (no crea una carpeta nueva a ciegas)', r2 == 'para')

# -- (2) reglas del front
mira('sin innerHTML ni esc() de Lawang', not re.search(r'innerHTML|\besc\(', CODIGO))
mira('escribe SOLO por producto_guarda (sb.rpc), sin insert/update/upsert/delete', set(re.findall(r"SB\.rpc\('([a-z_]+)'", CODIGO)) == {'producto_guarda'}
     and not re.search(r'\.(insert|update|upsert|delete)\(', CODIGO))
mira('lee SOLO por el lector del servidor productos_catalogo_datos, sin tablas (AXW-290)', 'SB.from(' not in CODIGO and '.from(' not in CODIGO
     and set(re.findall(r"window\.lwDatos\('([a-z_]+)'", CODIGO)) == {'productos_catalogo_datos'})
mira("un alta nace clase 'servicio' y nunca se manda 'alquiler'", "v.clase = 'servicio'" in CODIGO and "'alquiler'" in CODIGO and not re.search(r"clase\s*[:=]\s*'alquiler'", CODIGO))
mira("lo que se alquila no se enseña (filtro por la clase de la fila)", "x.clase !== 'alquiler'" in CODIGO)
mira("ninguna 'EUR' escrita a mano (trinquete eur_literal de contrato_front)", not re.search(r"""['"]EUR['"]""", SCRIPT))
mira('editar manda solo lo que cambió y dice si no hay nada', "T('No hay nada que cambiar.')" in CODIGO and 'if (v[k] !== antes) q[k] = v[k];' in CODIGO)
mira('la pantalla no decide el rol: 42501 y sin_herramienta se dicen tras la respuesta', not re.search(r"rol\s*===|es_admin|esAdmin|ficha\.", CODIGO) and "'sin_herramienta'" in CODIGO)
mira('engancha por data-accion / data-ex / data-campo, nunca por un rótulo', not re.search(r'textContent\s*===|innerText|querySelector\([^)]*placeholder', CODIGO))
acciones = set(re.findall(r"C\.boton\(T\([^)]*\)\)?, '(ex-[a-z-]+)'", CODIGO)) | set(re.findall(r"C\.boton\([^,]+, '(ex-[a-z-]+)'", CODIGO)) | set(re.findall(r'data-accion="(ex-[a-z-]+)"', MARCADO))
sin = sorted(a for a in acciones if not a.startswith('ex-modal') and ("a === '" + a + "'") not in CODIGO)
mira('toda acción ex-* tiene manejador (' + ', '.join(sin) + ')', not sin and len(acciones) >= 4)

# -- (3) idiomas: toda clave T()/data-lwt con inglés e indonesio
nodo = os.path.join(tmp, 'k.js')
i0 = SCRIPT.index('var ID_EX = {'); i1 = SCRIPT.index('var T = typeof window.lwT')
open(nodo, 'w', encoding='utf-8').write(SCRIPT[i0:i1] + '\n' + COMUN_JS + '\nvar c = axwComun(null, function (s) { return s; });\n'
                                        'console.log(JSON.stringify([Object.keys(EN_EX).concat(Object.keys(c.EN)), Object.keys(ID_EX).concat(Object.keys(c.ID))]));')
en, idd = json.loads(subprocess.run(['node', nodo], capture_output=True, text=True, encoding='utf-8').stdout or '[[],[]]')
textos = {m.replace("\\'", "'") for m in re.findall(r"\bT\('((?:[^'\\]|\\.)*)'\)", CODIGO)}
textos |= {m.strip() for m in re.findall(r'<(\w+)[^>]*data-lwt[^>]*>([^<]+)</\1>', MARCADO) for m in [m[1]]}
for k in ('Activo', 'Desactivado', 'Desactivar', 'Reactivar'):   # los T(x ? 'a' : 'b')
    textos.add(k)
falta_en = sorted(t for t in textos if t not in en)
falta_id = sorted(t for t in textos if t not in idd)
mira('todo texto pintable tiene inglés' + (' (faltan: ' + '; '.join(x[:40] for x in falta_en[:6]) + ')' if falta_en else ''), not falta_en and len(textos) > 20)
mira('todo texto pintable tiene indonesio' + (' (faltan: ' + '; '.join(x[:40] for x in falta_id[:6]) + ')' if falta_id else ''), not falta_id)
mira('las frases en indonesio no llevan el rastro «balian» (el build abortaría)', 'balian' not in json.dumps(idd, ensure_ascii=False).lower() and 'balian' not in SCRIPT.lower())

# -- (4) rótulo del menú por RUTA
mira('ROTULOS_RUTA_RESERVAS: /productos/ con es, en e id', build.ROTULOS_RUTA_RESERVAS.get('/productos/', {}).keys() >= {'es', 'en', 'id'})
mira('apagados_instancia.js cambia el texto por el identificador de la entrada (data-lw-pestana / data-path), nunca por su rótulo ni por su href',
     'function rotula()' in APAGADOS and """aside a[data-path]:not([data-lw-plegable]), a[data-lw-pestana], nav[id^="lw-pestanas-"] a[href]""" in APAGADOS
     and "R[id ? '/' + id + '/' : rutaDe(as[i])]" in APAGADOS
     and 'rotula();' in APAGADOS and not re.search(r"textContent\s*===\s*'Productos'", APAGADOS))
src = open(os.path.join(AQUI, 'build.py'), encoding='utf-8').read()
mira("el mapa lleva los rótulos SOLO en las instancias de tipo Reservas", "out['r'] = ROTULOS_RUTA_RESERVAS if portada_de(nombre) == 'reservas' else {}" in src)
mira("extras_pantalla() se llama solo con la portada de Reservas, tras portada_reservas()", re.search(r"if portada_de\(nombre\) == 'reservas':[^\n]*\n\s+portada_reservas\(\)\n\s+extras_pantalla\(\)", src) is not None)

if fallos:
    print('FALLOS (%d de %d):\n  ' % (len(fallos), casos) + '\n  '.join(fallos))
    sys.exit(1)
print('ok: %d comprobaciones' % casos)
