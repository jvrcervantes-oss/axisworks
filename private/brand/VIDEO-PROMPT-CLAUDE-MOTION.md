Diseña un vídeo de marca de 30 segundos para axisworks, un estudio que vende software a medida hecho con IA para que las empresas bajen su coste operativo. Formato 1920×1080, 30 fps. Al final, adapta la misma pieza a 1080×1920 (vertical) recolocando los elementos en columna, sin cambiar textos ni tiempos.

## Identidad (síguela al pie de la letra)

COLORES (no uses ningún otro)
- Night #0B0C1E: fondo por defecto.
- Ultramarine #2E3BEB: color principal, bandas y fondos de cierre.
- Volt #C8F04A: la "señal en marcha". Solo un momento Volt por plano. Nunca Volt sobre fondo claro y nunca texto Volt sobre claro.
- Chalk #F2F3F7: fondos claros. Representa "una persona".
- Apoyo sobre Night: Lifted #1A1C33 (tarjetas), Periwinkle #8C95FF (etiquetas y bordes de tarjeta al 35 %), Haze #C9CCDB (texto), Fog #A9ADC2 (texto secundario).
- Apoyo sobre Chalk: blanco #FFFFFF (tarjetas con borde #C9CCDB y sombra suave), Slate #4A4E66 (texto).

LA X (símbolo). Constrúyela exactamente con este SVG:
<svg viewBox="10 10 80 80">
  <polygon points="10,10 41,10 90,90 59,90" fill="#2E3BEB"/>   <!-- barra "construir" -->
  <polygon points="59,10 90,10 41,90 10,90" fill="#C8F04A"/>   <!-- barra "marca" -->
  <polygon points="50,24.7 65.5,50 50,75.3 34.5,50" fill="#F2F3F7"/>  <!-- el punto -->
</svg>
- Sobre Night el punto es Chalk. Sobre fondo claro el punto es Night #0B0C1E.
- Sobre Ultramarine, la barra "construir" pasa a Chalk y el punto a Night.
- La barra Ultramarine va siempre de arriba-izquierda a abajo-derecha. El punto es siempre lo de más contraste. Solo puede girar durante una animación y termina siempre recta. Nunca es un "×" tipográfico.

LOGOTIPO: "axisworks" en minúsculas, en Unbounded, con letter-spacing -0.03em. Se compone de "a" (600) + la X a 0.57em de alto, apoyada en la línea base + "is" (600) + "works" (300).

TIPOGRAFÍA (Google Fonts)
- Unbounded 600 para titulares. La segunda línea de cada titular va en Unbounded 300, en la misma frase.
- Manrope para texto.
- IBM Plex Mono en MAYÚSCULAS con tracking 0.14em para etiquetas.
- Titulares de al menos 64 px a 1080p. Márgenes de seguridad de 96 px.

MOVIMIENTO
- Curva única cubic-bezier(.2,.8,.2,1). Duraciones de 200, 450 y 700 ms.
- Entradas: el texto sube 14 px mientras aparece, con 80 ms de retardo entre líneas.
- Principio: lo que se mueve es trabajo en marcha; nada se mueve por adornar.
- Patrones permitidos: líneas que se dibujan (stroke), un punto Volt que recorre una línea a velocidad constante, un halo Volt que late una vez, cifras que cambian con un desplazamiento vertical, una tarjeta que choca contra un límite y rebota con una sacudida de 200 ms.
- Prohibido: rebotes elásticos, glitch, giros 3D, partículas decorativas, vídeo de stock, robots, cerebros, circuitos, personas genéricas y degradados arcoíris.

TONO: frases cortas y concretas. Sin palabras de hype ("revoluciona", "potencia", "lo último en IA"). Sin cifras inventadas, sin nombres ni logos de clientes. Usa solo los textos de abajo.

## Guion

0:00–0:03 · INTRO (Night)
Dos líneas diagonales muy tenues (Fog al 20 %) se dibujan formando una X grande. La barra Ultramarine entra desde arriba-izquierda y la Volt desde arriba-derecha, y se cruzan. El punto Chalk cae en el centro con un único halo Volt. La X encoge y se coloca dentro del logotipo "axisworks", que aparece completo.

0:03–0:07 · GANCHO (Night)
Texto en Chalk, línea a línea:
"Estás pagando sueldos"  (600)
"por trabajo que puede hacer el software."  (300)

0:07–0:14 · ANTES / DESPUÉS (transición a Chalk con una cortinilla Ultramarine en diagonal, siguiendo la barra "construir")
Etiquetas en mono: "HOY, A MANO" a la izquierda y "CON AXISWORKS" a la derecha. Entran tres filas escalonadas (120 ms). A la izquierda, tarjeta blanca con texto Slate; en el centro, una flecha en círculo Ultramarine que se ilumina; a la derecha, tarjeta Night con texto Chalk:
1. "El mecánico se entera por WhatsApp" → "La devolución abre el parte de taller"
2. "Alguien hace las facturas una a una" → "Un parte de obra emite todas las facturas"
3. "Alguien llama a quien no ha pagado" → "Recordatorios automáticos hasta el cobro"
Las flechas se iluminan en orden, una por fila.

0:14–0:20 · EL FLUJO (Night)
Etiqueta: "ALQUILER DE MOTOS · CASO DE USO". Cinco nodos en fila unidos por una línea:
"Entra la moto" → "Parte de taller" → "Pedido al proveedor" → "Disponible" → "El bot la ofrece".
- Los nodos son tarjetas Lifted con borde Periwinkle. "Parte de taller" es la única tarjeta Chalk, con la etiqueta "PERSONA", porque es lo único que hace alguien.
- Un punto Volt recorre la línea y cada nodo se enciende (anillo Periwinkle) cuando el punto pasa.
- Al final, una flecha curva vuelve al primer nodo: "↻ y vuelta a empezar".

0:20–0:24 · LÍMITE DURO (fondo Ultramarine)
Titular: "El agente propone." Entra una tarjeta Night: "PROPUESTA · OFERTA PARA UNA MOTO QUE SE ALQUILA POCO". Avanza hacia una línea vertical Chalk con la etiqueta "LÍMITE DURO · PRECIO", choca y rebota (sacudida de 200 ms). Aparece una tarjeta Chalk, "UNA PERSONA APRUEBA", con un check. La segunda línea del titular se completa: "Una persona aprueba." (300).

0:24–0:27 · EL ESTUDIO (Night)
Una cifra grande cambia de 0 a 17 con desplazamiento vertical y debajo aparece "departamentos de IA construyen". Luego: "Javier y Andrea firman cada entrega."

0:27–0:30 · CIERRE (fondo Ultramarine)
A la derecha, la X en su versión sobre Ultramarine (barra Chalk, barra Volt, punto Night) entra con escala de 0.86 a 1 y giro de -8° a 0°.
Titular: "¿Qué trabajo le quita" (600) / "más horas a tu equipo?" (300).
Debajo, en mono: "HELLO@AXISWORKS.STUDIO · AXISWORKS.STUDIO".
El último segundo queda quieto.

## Sonido
Opcional. Si lo hay: un pulso electrónico mínimo, con ticks suaves sincronizados con el punto Volt y con las flechas. Sin voz en off y sin música épica.

## Entrega
Exporta MP4 (H.264) en horizontal y en vertical. Antes de renderizar, comprueba que:
- cada plano tiene como mucho un momento Volt;
- no hay Volt sobre fondos claros;
- la barra Ultramarine de la X acaba siempre de arriba-izquierda a abajo-derecha.
