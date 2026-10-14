"""Prueba de las páginas del diseño «X marks the work» (12-oct-2026), sin navegador ni servidor.

1. Cada x('clave') que usa una plantilla existe en EN y en ES de su diccionario (inc/x/t_*.php): una página ES
   no se publica con un hueco que x() rellenaría en inglés.
2. Los .es.js son exactamente lo que genera tools/web_x/traduce_js.py desde home.js y aaas.js (EN y ES no se
   desfasan cuando alguien toca la fuente).
Uso: python tests/web_x.prueba.py   (necesita php en el PATH)
"""
import json, os, re, subprocess, sys

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PLANTILLAS = {
    'home': ['inc/x/home_tpl.php'],
    'aaas': ['inc/x/aaas_tpl.php'],
    'hoja': ['inc/x/hoja_tpl.php', 'inc/x/cabecera.php', 'inc/x/pie.php'],
}

def dic(nombre):
    php = "echo json_encode(require 'inc/x/t_%s.php');" % nombre
    out = subprocess.run(['php', '-r', php], cwd=RAIZ, capture_output=True, text=True, check=True).stdout
    return json.loads(out)

mal = 0
for nombre, ficheros in PLANTILLAS.items():
    d = dic(nombre)
    usadas = set()
    for f in ficheros:
        usadas |= set(re.findall(r"x\('([a-z0-9_]+)'\)", open(os.path.join(RAIZ, f), encoding='utf-8').read()))
    for lg in ('en', 'es'):
        faltan = sorted(k for k in usadas if k not in d.get(lg, {}))
        if faltan:
            print('MAL  t_%s.php sin %s en %s' % (nombre, ', '.join(faltan), lg)); mal += 1
        else:
            print('OK   t_%s.php: las %d claves que usan sus plantillas existen en %s' % (nombre, len(usadas), lg))

# 2. Organigrama de la portada (15-oct-2026): cada departamento pinta su busto SOLO si existe assets/images/dep-<cara>.webp; sin él,
#    la inicial en el cuadro (antes, una <img> a un fichero que no existía: 404 y hueco con los 5 departamentos nuevos).
php = ("$lang='es'; $url='/'; $XPAGINA='home'; require 'inc/x/x.php'; $o=[];"
       "foreach (['BUILD','GROW','CONTROL'] as $s) foreach (xdeps($s) as $d) $o[] = [$d[1], $d[4], xdep_cara($d[1], $d[2], $d[4])];"
       "echo json_encode($o);")
r = subprocess.run(['php', '-r', php], cwd=RAIZ, capture_output=True, text=True, encoding='utf-8')
deps = json.loads(r.stdout) if r.returncode == 0 else []
malos = []
for cara, img, html in deps:
    hay = os.path.isfile(os.path.join(RAIZ, 'assets', 'images', 'dep-%s.webp' % cara))
    if img and not hay:
        malos.append('%s pide dep-%s.webp y no existe' % (cara, cara))
    if img != ('<img' in html) or (not img and 'data-dep-ini' not in html):
        malos.append('%s: imagen=%s y pinta %s' % (cara, img, html[:60]))
if r.returncode or not deps or malos:
    print('MAL  organigrama de la portada: ' + ('; '.join(malos) or (r.stderr.strip()[-200:] or 'sin departamentos'))); mal += 1
else:
    print('OK   organigrama de la portada: %d departamentos, %d con busto y %d con inicial; ninguna <img> a un fichero que no existe'
          % (len(deps), sum(1 for d in deps if d[1]), sum(1 for d in deps if not d[1])))

r = subprocess.run([sys.executable, os.path.join(RAIZ, 'tools', 'web_x', 'traduce_js.py'), '--check'], capture_output=True, text=True)
print(('OK   ' if r.returncode == 0 else 'MAL  ') + 'los .es.js casan con su fuente: ' + r.stdout.strip().replace('\n', '; '))
mal += r.returncode != 0
sys.exit(1 if mal else 0)
