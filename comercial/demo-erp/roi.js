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
    ['leads', 'Log leads in the CRM and send the first reply', 'Meta leads land in the CRM on their own and the AI setter replies on WhatsApp', 'solo', 10],
    ['contratos', 'Draft contracts and chase signatures', 'The contract is built from the deal in three languages, and signature reminders and expiry run on their own', 'prepara', 8],
    ['facturas', 'Issue invoices and receipts', 'Each invoice comes from the contract and the milestone that is due', 'prepara', 6],
    ['cobros', 'Keep the payment schedule', 'Paid and outstanding amounts are worked out from the receipts, not by hand', 'solo', 6],
    ['comisiones', 'Calculate commissions', 'The commission is generated from the sale', 'solo', 4]
  ];
  var DEFECTO = { coste: 2500, pct: 50 };

  function num(v, min, max) {
    var n = typeof v === 'number' ? v : parseFloat(String(v).replace(',', '.'));
    if (!isFinite(n)) n = 0;
    return Math.min(max, Math.max(min, n));
  }

  /* horas: {clave: horas/semana}; coste: coste mensual de una persona con cargas; pct: % que el ERP asume (0-100) */
  function calcula(horas, coste, pct) {
    var semana = 0, usadas = {};
    TAREAS.forEach(function (t) { usadas[t[0]] = num(horas && horas[t[0]], 0, 168); semana += usadas[t[0]]; });
    var c = num(coste, 0, 1e12), p = num(pct, 0, 100) / 100;
    var horasMes = semana * SEMANAS_MES * p;
    var puestos = horasMes / HORAS_MES_JORNADA;
    return {
      // Lo que de verdad entró en la cuenta (recortado): el mailto cita esto, nunca lo tecleado (revisor, 28-sep)
      entrada: { horas: usadas, coste: c, pct: p * 100 },
      horasSemanaEquipo: semana,
      horasMes: horasMes,
      puestos: puestos,
      valorMes: puestos * c,
      valorAno: puestos * c * 12
    };
  }

  /* Lectura humana del nº de puestos (Marketing: «0,8 puestos» se lee mal) */
  function frasePuestos(p) {
    // Por debajo de ~0,4 puestos se dicen las horas a la semana reales: una frase fija se quedaba corta hasta 4 veces
    // al lado de la cifra de horas/mes (revisor de código, 28-sep).
    var horasSemana = p * HORAS_MES_JORNADA / SEMANAS_MES;
    if (horasSemana < 0.5) return 'nothing yet';
    if (p < 0.4) return 'about ' + Math.round(horasSemana).toLocaleString('en-GB') + ' h a week of one person';
    if (p < 0.65) return 'half a full-time person';
    if (p < 0.9) return 'almost one full-time person';
    if (p < 1.15) return 'one full-time person';
    return 'about ' + (Math.round(p * 2) / 2).toLocaleString('en-GB') + ' full-time people';
  }

  var api = { TAREAS: TAREAS, DEFECTO: DEFECTO, HORAS_MES_JORNADA: HORAS_MES_JORNADA, SEMANAS_MES: SEMANAS_MES,
              calcula: calcula, frasePuestos: frasePuestos };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else raiz.AXW_ROI = api;
})(this);
