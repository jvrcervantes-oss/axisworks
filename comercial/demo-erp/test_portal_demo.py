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
import subprocess
import sys

AQUI = os.path.dirname(os.path.abspath(__file__))
# `--publicado <carpeta>` (lo pasa lawang_fijado.py prueba/sube, 14-oct-2026): se mira lo que ACABA de construir `build.py --publico`
# fuera del repo, no el dist/ de git; si no, el `sube` daba por buena la demo publicada vieja (axw-cola). Por ARGUMENTO y no por
# la variable AXW_PRUEBA_PUBLICO: heredada en el control de subida haría que se comprobara otra carpeta que la que sube (revisor).
PUBLICADO = (os.path.join(os.path.abspath(sys.argv[sys.argv.index('--publicado') + 1]), 'demo-erp') if '--publicado' in sys.argv
             else os.path.abspath(os.path.join(AQUI, '..', '..', 'dist', 'demo-erp')))
print('Comprobando la demo publicada en %s' % PUBLICADO)
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

# Fotos de relleno (12-oct-2026): todas las que nombra el adaptador están publicadas, son webp de verdad y cada una tiene su
# fila de procedencia en LICENCIAS.txt (que vive en el fuente y no se publica).
# Fotos de obra con un solo dueño (13-oct-2026, demo en inglés): ya no las inventa el adaptador; las siembra demo_datos.js
# (publicado dentro de guard.js) como `…/demo-obra-<escena>.webp`, y el portal (fotoDe del adaptador) y Obra en la intranet
# (createSignedUrl del doble) las resuelven a /portal/demo/fotos/obra-<escena>.webp. Las escenas son el 3.er campo de cada
# título (["Excavation",-19,"excavacion"]: el publicado va minificado) del tramo de la siembra de obra_fotos; las portadas,
# portada-1..3.
guard = lee('contracts', 'assets', 'guard.js')
i_fotos = guard.find('FOTOS_POR_FASE')
m_fin = re.compile(r'''tabla\(\s*["']obra_fotos["']''').search(guard, max(i_fotos, 0))
tramo = guard[i_fotos:m_fin.start()] if i_fotos >= 0 and m_fin else ''
# El dist/ que hay en git es el de la ÚLTIMA publicación de la demo, y hasta que se republique trae la forma de antes (los
# títulos dentro del adaptador). Se acepta una forma u otra, nunca una mezcla: si el adaptador ya resuelve por demo-obra-,
# las fotos tienen que salir de la siembra.
nuevo = 'demo-obra-' in adap
TITULO = r"""\[\s*["'][^"'\]]+["']\s*,\s*[^,\]]+,\s*["']([a-z]+)["']\s*\]"""
pasos = set(re.findall(TITULO, tramo if nuevo else adap))
pedidas = {'portada-%d.webp' % n for n in (1, 2, 3)} | {'obra-%s.webp' % p for p in pasos}
ok(len(pasos) >= 8, '%s nombra sus fotos de obra por paso (%d)'
   % ('la siembra de obra_fotos (guard.js)' if nuevo else 'el adaptador', len(pasos)))
if nuevo:
    ok('demo-obra-' in guard and '/portal/demo/fotos/obra-' in guard,
       'el portal y Obra resuelven las fotos de obra por el mismo nombre (demo-obra-<escena> → /portal/demo/fotos/obra-<escena>.webp)')
else:
    ok('FOTOS_POR_FASE' not in guard and 'demo-obra-' not in guard,
       'forma vieja entera: con las fotos en el adaptador, guard.js no siembra fotos de obra (nunca mezcladas)')
fotos_dir = os.path.join(PUBLICADO, 'portal', 'demo', 'fotos')
publicadas = set(os.listdir(fotos_dir)) if os.path.isdir(fotos_dir) else set()
ok(pedidas <= publicadas, 'las fotos que pide el adaptador están publicadas (%d)' % len(pedidas))
ok(all(open(os.path.join(fotos_dir, f), 'rb').read(12)[8:12] == b'WEBP' for f in publicadas), 'las fotos publicadas son webp')
lic = os.path.join(AQUI, 'portal_demo', 'fotos', 'LICENCIAS.txt')
lic_t = open(lic, encoding='utf-8').read() if os.path.isfile(lic) else ''
ok(bool(publicadas) and all(f in lic_t for f in publicadas), 'cada foto publicada tiene su procedencia en portal_demo/fotos/LICENCIAS.txt')
ok(not any(f.startswith('LICENCIAS') for f in publicadas), 'LICENCIAS.txt no se publica')
# .txt y no .md: el .gitignore del repo ignora *.md y la procedencia no llegaría a otra copia (revisor, 12-oct)
ok(subprocess.run(['git', '-C', AQUI, 'check-ignore', '-q', lic]).returncode == 1, 'LICENCIAS.txt no lo ignora git')

if FALLOS:
    print('\n%d fallo(s)' % len(FALLOS))
    sys.exit(1)
print('\nOK: el portal publicado es el del ERP con el adaptador de la demo')
