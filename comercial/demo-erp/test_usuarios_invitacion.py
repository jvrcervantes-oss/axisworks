#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""python test_usuarios_invitacion.py — /usuarios/ de una instancia invita sin contraseña (N4/T F2, 14-oct-2026, erp-setup-b1b5).

Ejecuta la función REAL usuarios_por_invitacion() de build.py (sacada con ast, sin importar build.py) sobre una carpeta temporal con
editores.js y datos.js de Lawang en el sha fijado, después de ALTA_SIN_CONTRATOS, que es lo que deja oculta_por_modulo justo antes en el
build (revisor 14-oct: con F2 delante, el build de toda instancia paraba en oculta_por_modulo porque F2 le cambiaba sus dos anclas).
  · el orden en build.py: usuarios_por_invitacion() va DESPUÉS de oculta_por_modulo();
  · editores.js: sin campo de contraseña ni su comprobación, alta con `accion: 'invitar'`, botón «Enviar invitación» y la nota de la
    invitación en sus dos variantes (con y sin el módulo proyectos);
  · datos.js: la ficha lleva «Reenviar invitación» (llama a `reenviar_invitacion` con el user_id) y «Cambiar contraseña» sigue;
  · los dos ficheros resultantes pasan `node --check`;
  · cada texto nuevo tiene inglés e indonesio en MENU_I18N;
  · CONTRAPRUEBA: sobre el editores.js de Lawang SIN ALTA_SIN_CONTRATOS (el orden viejo), la función para.
No sustituye al build entero (otros pasos tocan esos ficheros antes): eso lo prueba el build de cada instancia."""
import ast
import os
import re
import shutil
import subprocess
import sys
import tempfile

AQUI = os.path.dirname(os.path.abspath(__file__))
fallos, total = [], 0


def ok(nombre, cond, detalle=''):
    global total
    total += 1
    if not cond:
        fallos.append(nombre + (' — ' + str(detalle) if detalle else ''))


def lawang():
    """Lawang en el sha fijado de lawang.json, o AXW_LAWANG_RAIZ para probar otro árbol: nunca el disco del clon."""
    if os.environ.get('AXW_LAWANG_RAIZ'):
        return os.environ['AXW_LAWANG_RAIZ']
    sys.path.insert(0, AQUI)
    import lawang_fijado
    return lawang_fijado.raiz()


SRC = open(os.path.join(AQUI, 'build.py'), encoding='utf-8').read()
ARBOL = ast.parse(SRC)


def valor(nombre):
    for n in ARBOL.body:
        if isinstance(n, ast.Assign) and any(isinstance(t, ast.Name) and t.id == nombre for t in n.targets):
            return ast.literal_eval(n.value)
    sys.exit('build.py no trae ' + nombre)


def funcion(nombre):
    for n in ARBOL.body:
        if isinstance(n, ast.FunctionDef) and n.name == nombre:
            return ast.get_source_segment(SRC, n)
    sys.exit('build.py no trae la función ' + nombre)


class Aborta(Exception):
    pass


def aborta(msg):
    raise Aborta(msg)


ALTA = valor('ALTA_SIN_CONTRATOS')
INV, REENVIO, NOTA = valor('USUARIOS_INVITACION'), valor('USUARIOS_REENVIO_FICHA'), valor('INVITA_NOTA')
I18N = valor('MENU_I18N')


def corre(editores, datos):
    """La función real de build.py sobre una DIST temporal; devuelve (editores, datos, error)."""
    dist = tempfile.mkdtemp(prefix='axw_f2_')
    try:
        a = os.path.join(dist, 'intranet', 'v4', 'assets')
        os.makedirs(a)
        open(os.path.join(a, 'editores.js'), 'w', encoding='utf-8', newline='').write(editores)
        open(os.path.join(a, 'datos.js'), 'w', encoding='utf-8', newline='').write(datos)
        ns = {'os': os, 'DIST': dist, 'aborta': aborta, 'quien_cambio_lawang': lambda d: '', 'ALTA_SIN_CONTRATOS': ALTA,
              'USUARIOS_INVITACION': INV, 'USUARIOS_REENVIO_FICHA': REENVIO, 'INVITA_NOTA': NOTA}
        exec(funcion('_una_vez'), ns)
        exec(funcion('usuarios_por_invitacion'), ns)
        try:
            ns['usuarios_por_invitacion']()
        except Aborta as e:
            return None, None, str(e)
        return (open(os.path.join(a, 'editores.js'), encoding='utf-8').read(),
                open(os.path.join(a, 'datos.js'), encoding='utf-8').read(), None)
    finally:
        shutil.rmtree(dist, ignore_errors=True)


# ── el orden en el build ─────────────────────────────────────────────────────────────────────────────────────────────────────────
i_oc, i_f2 = SRC.find('\n    oculta_por_modulo()'), SRC.find('\n    usuarios_por_invitacion()')
ok('build.py llama a usuarios_por_invitacion() una vez y DESPUÉS de oculta_por_modulo()',
   0 < i_oc < i_f2 and SRC.count('\n    usuarios_por_invitacion()') == 1, (i_oc, i_f2))

L = lawang()
ed0 = open(os.path.join(L, 'intranet', 'v4', 'assets', 'editores.js'), encoding='utf-8').read()
da0 = open(os.path.join(L, 'intranet', 'v4', 'assets', 'datos.js'), encoding='utf-8').read()
ed1 = ed0
for _, viejo, nuevo in ALTA:   # lo que deja oculta_por_modulo en editores.js
    ed1 = ed1.replace(viejo, nuevo)

ed, da, err = corre(ed1, da0)
ok('la función entra sobre lo que deja oculta_por_modulo', err is None, err)
if err is None:
    ok('sin campo de contraseña ni su comprobación', "k: 'password'" not in ed[ed.find("modal('Nuevo usuario'"):ed.find("modal('Nuevo usuario'") + 20000]
       and "(v.password || '').length < 10" not in ed)
    ok("el alta pide accion 'invitar' sin password", ed.count("accion: 'invitar', email: email,\n") == 1 and "accion: 'crear', email: email" not in ed)
    ok('el botón dice «Enviar invitación» (y ya no «Crear usuario»)', ed.count("'Enviar invitación', function (v) {") == 1
       and "'Crear usuario', function (v) {" not in ed)
    ok('la nota de la invitación en sus dos variantes (con y sin proyectos)', ed.count(NOTA) == 2
       and 'Se crea la cuenta y se le da acceso de inmediato.' not in ed)
    ok('el aviso lee `enviado` (el campo de la acción invitar) y no email_enviado', 'if (d.enviado === false) {' in ed and 'd.email_enviado' not in ed)
    ok('la ficha lleva «Reenviar invitación» con reenviar_invitacion y el user_id', da.count("texto: 'Reenviar invitación'") == 1
       and da.count("JSON.stringify({ accion: 'reenviar_invitacion', usuario_id: u.user_id })") == 1)
    ok('«Cambiar contraseña» sigue (decisión del owner del 13-oct, guion 3 de Bali Best)', da.count("texto: 'Cambiar contraseña'") == 1)
    if shutil.which('node'):
        for nombre, txt in (('editores.js', ed), ('datos.js', da)):
            f = tempfile.NamedTemporaryFile('w', suffix='.js', delete=False, encoding='utf-8')
            f.write(txt)
            f.close()
            r = subprocess.run(['node', '--check', f.name], capture_output=True, text=True, encoding='utf-8')
            os.unlink(f.name)
            ok('%s resultante pasa node --check' % nombre, r.returncode == 0, (r.stderr or '')[-400:])
    else:
        fallos.append('sin node: no se ha comprobado la sintaxis')

# ── traducciones: cada texto nuevo con inglés e indonesio ─────────────────────────────────────────────────────────────────────────
nuevos = ''.join(n for _, n in INV) + ''.join(n for _, n in REENVIO)
textos = set(re.findall(r"\b(?:tH|tx)\('((?:[^'\\]|\\.)+)'", nuevos)) | set(re.findall(r"texto: '([^']+)'", nuevos))
textos |= set(re.findall(r"^\s*(?:[a-z_]+): '([^']+)'[,}]", nuevos.split('var MOT = {')[1].split('};')[0], re.M)) if 'var MOT = {' in nuevos else set()
textos |= {'Enviar invitación', NOTA, NOTA + ' Nace sin ningún proyecto asignado — se asigna después editando la ficha ya creada.'}
textos.discard('Cambiar contraseña')   # de Lawang, ya traducido allí
sin = sorted(t for t in textos if not (isinstance(I18N.get(t), dict) and I18N[t].get('en') and I18N[t].get('id')))
ok('cada texto nuevo tiene en e id en MENU_I18N (%d textos)' % len(textos), not sin and len(textos) >= 12, sin)

# ── CONTRAPRUEBA: el orden viejo (sin ALTA_SIN_CONTRATOS delante) para ──────────────────────────────────────────────────────────────
_, _, err0 = corre(ed0, da0)
ok('CONTRAPRUEBA: sobre el editores.js de Lawang sin lo de oculta_por_modulo, la función para', err0 is not None)

if fallos:
    print('MAL %d/%d' % (total - len(fallos), total))
    for f in fallos:
        print('  ✗ ' + f)
    sys.exit(1)
print('OK %d/%d test_usuarios_invitacion' % (total, total))
