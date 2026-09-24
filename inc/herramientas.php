<?php
/* Carrusel de herramientas con las que trabaja el estudio (owner, 24-sep-2026).
 * Una sola lista para portada, índice y hojas. Solo lo que se usa DE VERDAD en
 * los proyectos (comprobado en el repo); añadir una herramienta = una fila aquí.
 *
 * Logotipos: Simple Icons (CC0), servidos desde /assets/logos/ — nada se pide a
 * terceros. Las marcas son de sus titulares y el aviso legal lo dice; se usan solo
 * para nombrar la herramienta. Las que no tienen logotipo en Simple Icons salen
 * con su nombre, sin inventar un icono. El SVG va en línea para teñirlo con
 * currentColor (monocromo, como pide el sistema: un solo acento por pantalla). */
$HERRAMIENTAS = [
  ['claude','Claude'], ['openai','ChatGPT'], [null,'Stitch'],
  ['railway','Railway'], ['supabase','Supabase'], ['postgresql','PostgreSQL'], ['github','GitHub'],
  ['hostinger','Hostinger'], ['php','PHP'], ['python','Python'], ['greensock','GSAP'],
  ['threedotjs','Three.js'], ['blender','Blender'], [null,'Remotion'], [null,'Higgsfield'],
  ['canva','Canva'], ['meta','Meta Ads'], ['whatsapp','WhatsApp Business'], ['telegram','Telegram'],
  ['stripe','Stripe'], ['googlesheets','Google Sheets'], [null,'GoHighLevel'],
];
$herr_t = ['en'=>'Tools we build with','es'=>'Con lo que trabajamos'];

if (!function_exists('herr_svg')) {
  function herr_svg($slug) {
    $f = __DIR__ . '/../assets/logos/' . basename($slug) . '.svg';
    if (!is_file($f)) return '';
    $s = file_get_contents($f);
    $s = preg_replace('/<title>.*?<\/title>/s', '', $s);
    return str_replace('<svg ', '<svg aria-hidden="true" focusable="false" fill="currentColor" ', $s);
  }
}
?>
<section class="tools" aria-label="<?= e($herr_t[$lang] ?? $herr_t['en']) ?>">
  <p class="tools__l"><?= $herr_t[$lang] ?? $herr_t['en'] ?> · <?= count($HERRAMIENTAS) ?></p>
  <div class="tools__win">
    <?php for ($copia = 0; $copia < 2; $copia++): ?>
    <ul class="tools__track"<?= $copia ? ' aria-hidden="true"' : '' ?>>
      <?php foreach ($HERRAMIENTAS as [$slug, $nom]): ?>
      <li><?= $slug ? herr_svg($slug) : '' ?><span><?= $nom ?></span></li>
      <?php endforeach; ?>
    </ul>
    <?php endfor; ?>
  </div>
</section>
