# Prueba de build.py:asistente_maestro() y guard_asistente_admin() (AXW-136, 2-oct-2026): python test_asistente_maestro.py
# Parte de una v4 de mentira con la forma de la de Lawang y mira que (1) la pantalla del maestro entra, (2) el permiso cambia en
# página, menú y hub y un ADMIN pasa sin la casilla en las tres puertas (guard, menú, tarjeta del hub), (3) el editor de ficha
# explica los campos que el maestro ya no deja pedir, (4) la pantalla tiene manejador de fallo en «retirar», reinicia «Aprobar» y su
# mini-diccionario ES/EN está completo (test_asistente_i18n.js), y (5) si Lawang cambia cualquiera de esos trozos el build PARA en
# vez de dejarlo a medias.
import os, re, subprocess, sys, tempfile
AQUI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, AQUI)
import build

PAG = ('<html><head><script data-herramienta="asistente"></script></head><body><main>\n'
       '<div class="flex flex-col w-full gap-8">VIEJO</div>\n</main></div>\n<script>\nviejo()\n</script>\n</body></html>\n')
NAV = ("x { path: 'asistente', texto: 'Asistente', clave: 'asistente' } y contratos: 'contratos', asistente: 'asistente', 'asistente-correos': 'asistente', z\n"
       "    if (!k || !ficha || LW_ROL.esSuperGlobal(ficha)) return true;\n")
HER = ("{ href:'/intranet/v4/asistente/', herr:'asistente', }\n"
       "const lwPermitida = (t, ficha) =>\n  (!ficha || window.LW_ROL.esSuperGlobal(ficha) || !t.herr ||\n   [].concat(t.herr).some(h => 1));\n")
ED = ("Cambia lo que haga falta y se enviará al administrador para que lo apruebe; te llegará la respuesta a la campana.' },\n"
      "      var pideCambio = function (c, accion, nuevos, motivo) {\n        return sb.rpc('solicitud_cambio_pide', {}).then(function (r) {\n"
      "          if (r.error) return { error: { message: r.error.message } };\n          var n = r.data;\n          toast('Enviado para aprobar'\n")
GUARD = "x\n            var sinLimite = LW_ROL.esSuperGlobal(ficha);   // x\n y"


def _corre(funcion, ficheros):
    d = tempfile.mkdtemp()
    for ruta, txt in ficheros:
        p = os.path.join(d, *ruta.split('/'))
        os.makedirs(os.path.dirname(p), exist_ok=True)
        open(p, 'w', encoding='utf-8').write(txt)
    viejo, build.DIST = build.DIST, d
    try:
        funcion()
        return 'pasa', d
    except SystemExit:
        return 'para', d
    finally:
        build.DIST = viejo


def corre(pag=PAG, nav=NAV, her=HER, ed=ED):
    return _corre(build.asistente_maestro, (('intranet/v4/asistente/index.html', pag), ('intranet/v4/assets/nav.js', nav),
                                            ('contracts/assets/herramientas.js', her), ('intranet/v4/assets/editores.js', ed)))


def corre_guard(guard=GUARD):
    return _corre(build.guard_asistente_admin, (('contracts/assets/guard.js', guard),))


def lee(d, ruta):
    return open(os.path.join(d, *ruta.split('/')), encoding='utf-8').read()


fallos = []
casos = 0
r, d = corre()
p, n, h, e = (lee(d, 'intranet/v4/asistente/index.html'), lee(d, 'intranet/v4/assets/nav.js'),
              lee(d, 'contracts/assets/herramientas.js'), lee(d, 'intranet/v4/assets/editores.js'))
rg, dg = corre_guard()
g = lee(dg, 'contracts/assets/guard.js')
fuente = open(os.path.join(AQUI, 'asistente_peticiones.html'), encoding='utf-8').read()
i18n = subprocess.run(['node', os.path.join(AQUI, 'test_asistente_i18n.js')], capture_output=True, text=True, encoding='utf-8')
# el manejador de fallo de «retirar»: dentro del bloque de esa acción tiene que haber un 2.º argumento de .then que avise con mal()
bloque_retirar = fuente[fuente.index("accion === 'retirar' && fila"):fuente.index("accion === 'revisar' && fila")]
for nombre, ok in (('pasa con la forma de Lawang', r == 'pasa'), ('entra la pantalla del maestro', 'data-ap="raiz"' in p and 'VIEJO' not in p and 'viejo()' not in p),
                   ('la página pide asistente_peticiones', 'data-herramienta="asistente_peticiones"' in p),
                   ('un solo contenedor cerrado', p.count('<main>') == 1 and p.count('</main>') == 1),
                   ('el menú y el mapa cambian, el de correos NO', "clave: 'asistente_peticiones'" in n and "asistente: 'asistente_peticiones', 'asistente-correos': 'asistente'," in n),
                   ('el hub cambia', "herr:'asistente_peticiones'" in h),
                   # (1) un admin pasa sin casilla en las tres puertas, y solo en la del asistente de peticiones (el agente sigue necesitándola)
                   ('la puerta (guard) deja pasar al admin SOLO con asistente_peticiones', rg == 'pasa' and "LW_ROL.esSuperGlobal(ficha) || (ficha && ficha.rol === 'admin' && HERRAMIENTA === 'asistente_peticiones')" in g),
                   ('el menú deja pasar al admin solo en la entrada asistente', "(path === 'asistente' && ficha.rol === 'admin')" in n),
                   ('la tarjeta del hub deja pasar al admin solo en asistente_peticiones', "(t.herr === 'asistente_peticiones' && ficha.rol === 'admin')" in h),
                   # (4) el editor explica los campos que ya no se piden
                   ('el editor avisa en «Pedir cambio»', 'campana. Nacionalidad, pasaporte / NPWP y estado KYC no se piden por aquí' in e),
                   ('el editor explica el 22023 de la base', "/no se puede pedir por aquí/.test(String(r.error.message || ''))" in e and 'petición libre desde Asistente' in e),
                   ('el editor sigue devolviendo el mensaje de la base en los demás rechazos', ': r.error.message } };' in e),
                   # (2) retirar tiene manejador de fallo de red; Aprobar se reinicia al fallar
                   ('retirar avisa si la red falla', '}, function (e) {' in bloque_retirar and 'mal(' in bloque_retirar.split('}, function (e) {')[1] and 'el.disabled = false' in bloque_retirar.split('}, function (e) {')[1]),
                   ('Aprobar se reinicia en las dos salidas de fallo de resolver', fuente.count('restauraAprobar(fila);') == 2 and 'function restauraAprobar' in fuente and "b.textContent = T('Aprobar')" in fuente),
                   # (3) todo texto pintable está en el mini-diccionario ES/EN y se añade sin pisar el de Lawang
                   ('mini-diccionario ES/EN completo (test_asistente_i18n.js)', i18n.returncode == 0),
                   ('el diccionario no pisa claves de Lawang', 'if (!Object.prototype.hasOwnProperty.call(window.LW_EN, k)) window.LW_EN[k] = EN_AP[k]' in fuente)):
    casos += 1
    if not ok:
        fallos.append(nombre + (' [' + (i18n.stdout + i18n.stderr).strip()[:400] + ']' if nombre.startswith('mini-diccionario') else ''))
for nombre, kw in (('para si Lawang cambia el contenedor', {'pag': PAG.replace('gap-8', 'gap-6')}),
                   ('para si Lawang cambia el cierre de main', {'pag': PAG.replace('</main></div>', '</main>')}),
                   ('para si el menú ya no es el esperado', {'nav': NAV.replace("clave: 'asistente' }", "clave: 'otra' }")}),
                   ('para si el mapa ya no es el esperado', {'nav': NAV.replace("asistente: 'asistente', 'asistente-correos'", "asistente: 'x', 'asistente-correos'")}),
                   ('para si el hub ya no es el esperado', {'her': HER.replace("herr:'asistente'", "herr:'otra'")}),
                   ('para si el menú ya no trae puedeVer', {'nav': NAV.replace("LW_ROL.esSuperGlobal(ficha)) return true;", "LW_ROL.otro(ficha)) return true;")}),
                   ('para si el hub ya no trae lwPermitida', {'her': HER.replace('esSuperGlobal(ficha) || !t.herr ||', 'esSuperGlobal(ficha) ||')}),
                   ('para si el editor cambia la nota de pedir cambio', {'ed': ED.replace('la respuesta a la campana.', 'la respuesta.')}),
                   ('para si el editor cambia el rechazo de la base', {'ed': ED.replace('if (r.error) return { error: { message: r.error.message } };', 'if (r.error) return r;')})):
    casos += 1
    if corre(**kw)[0] != 'para':
        fallos.append(nombre)
casos += 1
if corre_guard(GUARD.replace('var sinLimite', 'var otra'))[0] != 'para':
    fallos.append('para si el guard cambia la línea de sinLimite')
print('FALLOS:' if fallos else 'OK test_asistente_maestro: %d casos' % casos, *fallos)
sys.exit(1 if fallos else 0)
