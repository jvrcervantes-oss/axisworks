#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""El portal de clientes PUBLICADO en la demo es el del ERP con el adaptador de la demo, y nada más.   python test_portal_demo.py

Encargo 20261011_demo_cliente_flujo_total, fase E1 (12-oct-2026; revisión previa #279, Frontend + Seguridad). Lo que fija, sobre
dist/demo-erp (lo que se sube), porque un cambio en Lawang o en build.py lo podría romper sin un solo error:
  · orden de carga: el doble (guard.js) → el adaptador (demo-axw.js) → el script del portal que crea el cliente;
  · ni rastro del modo demo de origen (?demo, demo.js, sus portadas) ni de la marca, la mascota o las imágenes del cliente;
  · 0 campos de contraseña; «Sign now» enganchado por data-accion y sin abrir pestaña nueva;
  · el adaptador nunca entrega un enlace externo (`url`) ni un mapa: Documentos y Proyectos solo enseñan ficheros de muestra;
  · la marca «DEMO · NOT A VALID DOCUMENT» en el documento de factura (documentoHTML) y en la página de documento de muestra.
Importes, elección de cliente y escrituras del portal se prueban ejecutándolos en pruebas/base_falsa.harness.cjs (test_base_falsa.py).
Corre en el control de subida (el gate ejecuta los test_*.py de esta carpeta)."""
import os
import re
import sys

AQUI = os.path.dirname(os.path.abspath(__file__))
PUBLICADO = os.path.abspath(os.path.join(AQUI, '..', '..', 'dist', 'demo-erp'))
FALLOS = []


def ok(cond, msg):
    print(('ok   ' if cond else 'FALLA ') + msg)
    if not cond:
        FALLOS.append(msg)


def lee(*partes):
    p = os.path.join(PUBLICADO, *partes)
    return open(p, encoding='utf-8').read() if os.path.isfile(p) else ''


idx = lee('portal', 'index.html')
ok(bool(idx), 'dist/demo-erp/portal/index.html existe')
i_guard = idx.find('/contracts/assets/guard.js')
i_adap = idx.find('/portal/demo-axw.js')
m_crea = re.search(r'supabase\.createClient\(', idx)
ok(0 <= i_guard < i_adap and m_crea is not None and i_adap < m_crea.start(),
   'orden de carga: guard.js → demo-axw.js → el script del portal que crea el cliente')
ok('AXW_PORTAL_DEMO' in idx, 'el portal falla cerrado si el adaptador no cargó (AXW_PORTAL_DEMO)')
for patron, que in ((r'[?&]demo\b|/portal/demo\.js', 'el modo demo de origen (?demo / demo.js)'),
                    (r'(?i)type=["\']password', 'campos de contraseña'),
                    (r'/assets/img/|moanito|neue-kabel|/portal/demo/portadas', 'imágenes, mascota o tipografía del cliente'),
                    (r'(?i)lawang', 'la marca del cliente')):
    ok(not re.search(patron, idx), 'portal sin %s' % que)
ok(idx.count('data-accion="demo-firmar"') == 2, '«Sign now» enganchado por data-accion en sus 2 sitios')
ok(not re.search(r'ct-firmar"[^>]*target=', idx), '«Sign now» no abre pestaña nueva')
ok('<title>Client area · ' in idx, 'título del portal en inglés con la marca de la demo')

adap = lee('portal', 'demo-axw.js')
ok(bool(adap), 'dist/demo-erp/portal/demo-axw.js existe')
ok(not re.search(r'(?<![\w.])url\s*:', adap), 'el adaptador no entrega `url` (enlaces externos en Documentos)')
ok(re.search(r'mapa\s*:\s*null', adap) is not None and not re.search(r'mapa\s*:\s*(?!null)', adap), 'el adaptador no entrega mapa')
ok(re.search(r'''\.from\(["']hilo_soporte["']\)''', adap) is not None and 'sessionStorage' not in adap,'el adaptador lee y escribe por el doble, nunca sessionStorage a pelo')

ok(not re.search(r'\.(insert|update|upsert|delete)\(', adap), 'el adaptador no escribe tablas: lo hace por las funciones del doble (sb.rpc)')

doc = lee('clasico', 'facturas', 'documento.js')
ok('DEMO · NOT A VALID DOCUMENT' in doc and doc.count('NOT A VALID DOCUMENT') >= 2,
   'documento.js: sello en documentoHTML y marca de agua en documentoPagina')
ok('NOT A VALID DOCUMENT' in lee('portal', 'demo', 'documento.html'), 'el documento de muestra lleva la marca dentro')
ok(os.path.isfile(os.path.join(PUBLICADO, 'portal', 'demo', 'isotipo.svg')), 'el isotipo neutro está publicado')

if FALLOS:
    print('\n%d fallo(s)' % len(FALLOS))
    sys.exit(1)
print('\nOK: el portal publicado es el del ERP con el adaptador de la demo')
