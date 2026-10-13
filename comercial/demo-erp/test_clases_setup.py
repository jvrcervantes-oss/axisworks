#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""python test_clases_setup.py — el chequeo del build que para si una pantalla del setup usa una clase que la tw.css de la instancia no trae
(clases_que_faltan(), bbm-p41, 13-oct-2026). Sin construir: una hoja de mentira y unos ficheros de mentira.

Dos lados, porque un chequeo que solo para lo malo puede estar parando TODO (revisor, 13-oct: '2xl:…' paraba aunque estuviera compilada):
  · lo que está en la hoja PASA (dígito inicial, coma, ternarios, comparaciones, argumentos de una llamada, la flecha);
  · lo que no está PARA, también dentro de ternarios, concatenaciones, plantillas, expresiones en varias líneas y className +=."""
import os
import sys

AQUI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, AQUI)
import build  # noqa: E402

fallos, total = [], 0


def ok(nombre, cond, detalle=''):
    global total
    total += 1
    if not cond:
        fallos.append(nombre + (' — ' + str(detalle) if detalle else ''))


# Como la escribe Tailwind 3.4: dígito inicial sin espacio si sigue algo no hexadecimal; la coma como \2c y un espacio
HOJA = ('.p-4 {\n}\n.flex {\n}\n.gap-3 {\n}\n.text-error {\n}\n.\\32xl\\:grid-cols-5 {\n}\n.grid-cols-\\[1fr\\2c auto\\] {\n}\n'
        '.md\\:flex-row {\n}\n.hover\\:bg-primary:hover {\n}\n.lw-cabecera {\n}\n')

PASAN = {
    'digito': "el('div', { class: '2xl:grid-cols-5 p-4' });",
    'coma': "var CLS_X = 'grid-cols-[1fr,auto]';",
    'ternario': "el('p', { class: 'flex ' + (tipo === 'error' ? 'text-error' : 'gap-3'), id: 'x' });",
    'llamada': "el('i', { class: claseDe('nada') + ' flex' });",
    'menor_que': "el('b', { class: n < 'z' ? 'flex' : 'p-4' });",
    'flecha': "el('b', { class: (function () { return 'flex'; })() });",
    'responsive_hover': "var BTN1 = 'md:flex-row hover:bg-primary';",
    'html': '<div class="lw-cabecera flex"></div>',
    'axw_propias': "el('label', { class: 'axw-sw flex' });",
    'varias_lineas_ok': "el('p', { class: 'flex ' +\n      'gap-3',\n  text: 'hola' });",
    'comparacion_igual': "el('p', { class: modo == 'zz' ? 'flex' : 'gap-3' });",
}
for k, t in PASAN.items():
    r = build.clases_que_faltan(HOJA, {k: t})
    ok('PASA: ' + k, r == [], r)

PARAN = {
    'simple': ("el('div', { class: 'p-3' });", 'p-3'),
    'ternario': ("el('div', { class: 'flex ' + (a ? 'gap-x-5' : 'p-4'), id: 1 });", 'gap-x-5'),
    'concatenada': ("var BTN9 = 'p-4 ' + 'w-[50%]';", 'w-[50%]'),
    'classname_mas': ("b.className += ' grid-cols-[1fr,2fr]';", 'grid-cols-[1fr,2fr]'),
    'digito_que_falta': ("el('i', { class: '2xl:flex' });", '2xl:flex'),
    'plantilla': ("el('i', { class: `p-4 ${x}` });", '${x}'),
    'varias_lineas_mas': ("el('p', { class: 'flex ' +\n      'p-3',\n  text: 'x' });", 'p-3'),
    'varias_lineas_ternario': ("el('p', { class: cond\n      ? 'p-3' : 'flex',\n  text: 'x' });", 'p-3'),
    'html': ('<div class="flex tracking-[0.08em]"></div>', 'tracking-[0.08em]'),
}
for k, (t, clase) in PARAN.items():
    r = build.clases_que_faltan(HOJA, {k: t})
    ok('PARA: ' + k, any(x.endswith(' ' + clase) for x in r), r)
# y lo de al lado sigue pasando: en 'ternario' para gap-x-5, no p-4 ni flex
r = build.clases_que_faltan(HOJA, {'t': PARAN['ternario'][0]})
ok('PARA solo lo que falta', r == ['t:1 gap-x-5'], r)

# las formas del selector: dígito con y sin espacio según lo que sigue
ok('selector 2xl: sin espacio (x no es hexadecimal)', '.\\32xl\\:flex' in build._selectores_tw('2xl:flex'))
ok('selector 2a: con espacio (a es hexadecimal)', build._selectores_tw('2a') == ['.\\32 a'], build._selectores_tw('2a'))

if fallos:
    print('FALLAN %d de %d' % (len(fallos), total))
    for f in fallos:
        print('  ✗ ' + f)
    sys.exit(1)
print('OK test_clases_setup: %d/%d' % (total, total))
