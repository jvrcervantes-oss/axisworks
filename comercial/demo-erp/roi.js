/* Calculadora de horas liberadas de la portada (28-sep-2026, owner: «el objetivo es que gracias al ERP + agentes
   autónomos se ahorren dinero de contratar»). Función PURA: la portada solo pinta lo que devuelve, y roi.test.js la
   prueba con números a mano (aritmética de dinero: función pura + test).
   Revisión previa #145 (Marketing + Legal), cada regla con su porqué:
   - Una fila por tarea que la portada ya afirma que funciona, con horas editables: dos porcentajes en abstracto se
     leen como número de agencia (Marketing).
   - El % que el ERP asume es un SUPUESTO del visitante, no una medida nuestra: nunca «conservador» ni «lo hace solo»
     como promesa (Legal, LCD art. 5). El resultado es un «valor equivalente», no un ahorro prometido.
   - La moneda es solo la etiqueta: no hay conversión, entra y sale en la misma unidad.
   - Nada sale del navegador: ni formulario, ni endpoint, ni almacenamiento. */
(function (raiz) {
  var HORAS_MES_JORNADA = 160;          // una persona a jornada completa
  var SEMANAS_MES = 52 / 12;            // 4,33

  // [clave, tarea, qué hace el ERP (lo que la portada ya afirma), 'solo' | 'prepara', horas/semana del equipo por defecto]
  var TAREAS = [
    ['leads', 'Pasar leads al CRM y dar la primera respuesta', 'Los leads de Meta entran solos al CRM y el setter IA contesta en WhatsApp', 'solo', 10],
    ['contratos', 'Preparar contratos y perseguir firmas', 'El contrato sale de la operación, en tres idiomas, y la firma se recuerda y caduca sola', 'prepara', 8],
    ['facturas', 'Emitir facturas y recibís', 'Cada factura sale del contrato y del hito que toca', 'prepara', 6],
    ['cobros', 'Llevar el calendario de cobros', 'Lo cobrado y lo pendiente se calculan con los recibís, no a mano', 'solo', 6],
    ['comisiones', 'Calcular comisiones', 'La comisión se genera desde la venta', 'solo', 4]
  ];
  var DEFECTO = { coste: 2500, pct: 50 };

  function num(v, min, max) {
    var n = typeof v === 'number' ? v : parseFloat(String(v).replace(',', '.'));
    if (!isFinite(n)) n = 0;
    return Math.min(max, Math.max(min, n));
  }

  /* horas: {clave: horas/semana}; coste: coste mensual de una persona con cargas; pct: % que el ERP asume (0-100) */
  function calcula(horas, coste, pct) {
    var semana = 0;
    TAREAS.forEach(function (t) { semana += num(horas && horas[t[0]], 0, 168); });
    var c = num(coste, 0, 1e12), p = num(pct, 0, 100) / 100;
    var horasMes = semana * SEMANAS_MES * p;
    var puestos = horasMes / HORAS_MES_JORNADA;
    return {
      horasSemanaEquipo: semana,
      horasMes: horasMes,
      puestos: puestos,
      valorMes: puestos * c,
      valorAno: puestos * c * 12
    };
  }

  /* Lectura humana del nº de puestos (Marketing: «0,8 puestos» se lee mal) */
  function frasePuestos(p) {
    if (p < 0.1) return 'unas horas sueltas al mes';
    if (p < 0.4) return 'una media jornada larga a la semana';
    if (p < 0.65) return 'media persona a jornada completa';
    if (p < 0.9) return 'casi una persona a jornada completa';
    if (p < 1.15) return 'una persona a jornada completa';
    return 'unas ' + (Math.round(p * 2) / 2).toLocaleString('es-ES') + ' personas a jornada completa';
  }

  var api = { TAREAS: TAREAS, DEFECTO: DEFECTO, HORAS_MES_JORNADA: HORAS_MES_JORNADA, SEMANAS_MES: SEMANAS_MES,
              calcula: calcula, frasePuestos: frasePuestos };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else raiz.AXW_ROI = api;
})(this);
