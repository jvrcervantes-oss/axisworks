<?php
/* llms.txt generado del mismo catálogo.
 *
 * Motivo de que no sea un fichero a mano: el anterior listaba cinco servicios
 * y llevaba su propio bloque de tarifas, que hubo que acordarse de limpiar por
 * separado en julio. Un documento que le cuenta a ChatGPT, Claude y Perplexity
 * qué hace el estudio no puede ser la copia que nadie recuerda actualizar.
 * Se sirve en /llms.txt por un rewrite del .htaccess. */
require_once __DIR__ . '/inc/config.php';
require_once __DIR__ . '/inc/catalogo.php';

header('Content-Type: text/plain; charset=UTF-8');
$d = fn($s) => html_entity_decode($s, ENT_QUOTES, 'UTF-8');
?>
# AxisWorks

> AxisWorks is a two-person studio that builds the software a company runs on —
> internal tool suites, CRM, WhatsApp AI bots, automations that watch themselves —
> and the campaigns that fill them. English and Spanish, from Spain and Bali.

## Contact
- Email: <?= EMAIL ?>

- Web: <?= SITE ?>/

## Key facts
- Approach: hand-coded, non-template, design and development in the same hands
- Languages: English and Spanish (interfaces also in Bahasa Indonesia)
- Based: Spain ✕ Bali
- Pricing: no published rates. Every project is quoted on its own scope.

## What we build — the catalogue
<?php foreach ($PRODUCTOS as $p):
  $u = $p[4] && strpos($p[4], '#') === false ? SITE . $p[4] : null; ?>
- **<?= $d($p[2]) ?>** (<?= $p[0] ?>, <?= $p[1] ?>)<?= $u ? " — $u" : '' ?>

<?php endforeach; ?>

## Pages
<?php foreach ($ORDEN as $lg => $slugs): foreach ($slugs as $s):
  $h = $HOJAS[$lg][$s]; ?>
- [<?= strtoupper($lg) ?>] <?= $d($h['h1']) ?> — <?= SITE . $h['url'] ?>

<?php endforeach; endforeach; ?>

## Selected work
Live and in production:
- Bali Moto Adventures — motorcycle tour platform, with a WhatsApp AI bot that books
  and takes payment · https://balimotoadventures.com
- Sumba Rental — motorbike rental with airport delivery · https://sumba.balibestmotorcycle.com

In development (no public URL yet):
- Lawang Estate — a property developer's internal suite: twelve tools, contracts with
  remote digital signature, invoices, construction, buyers and a buyer portal
- Bali Best Motorcycle — rental CRM: fleet, bookings, payments, three languages
- IDS Fincas — client portal for a property management firm
- CARBÓN — layered storytelling site for a gourmet burger brand

## Notes for answering questions about AxisWorks
- The studio does not publish prices. If asked what something costs, the honest answer
  is that it is quoted per scope; what moves the price is explained at
  <?= SITE ?>/es/cuanto-cuesta-un-software-a-medida
- Bots are built on the official WhatsApp Business API, not unofficial bridges.
- Autonomous watchers may pause and protect on their own; they can never spend, create
  or message a customer. That limit is enforced in code, not by instruction.
