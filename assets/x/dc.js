/* dc.js — motor mínimo para las partes que se mueven en las páginas del diseño «X marks the work»
 * (12-oct-2026, encargo 20261012_axisworks_web_nueva_brand_kit).
 *
 * Por qué existe: el diseño del owner viene del lienzo de claude.ai con su propio motor (React +
 * plantillas). Publicar ese motor no es una opción (pesado, ajeno, no servimos código de terceros
 * que no controlamos). Este fichero entiende EXACTAMENTE la sintaxis de los fragmentos del diseño:
 *   {{ ruta.con.puntos }} en texto y atributos · <sc-for list="{{ x }}" as="y"> · <sc-if value="{{ c }}">
 *   · onClick="{{ fn }}" (cualquier on*).
 * Así los fragmentos se copian del diseño tal cual y el calco no depende de reescribirlos a mano.
 *
 * Lo estático lo pinta PHP; aquí solo las zonas marcadas con <template data-r>. Cada zona se pinta
 * en un <x-r> (display: contents) justo detrás de su plantilla, y en cada actualización se PARCHEA
 * lo que ya hay (mismos nodos), así un botón con foco no lo pierde cuando la red cambia.
 * Sin dependencias. Expone window.XDC = { monta }.
 */
(function () {
  'use strict';
  var HUECO = /\{\{\s*([^}]+?)\s*\}\}/g;
  var ENTERO = /^\s*\{\{\s*([^}]+?)\s*\}\}\s*$/;

  function lee(scope, ruta) {
    ruta = ruta.trim();
    if (ruta === 'true') return true;
    if (ruta === 'false') return false;
    if (/^-?\d+(\.\d+)?$/.test(ruta)) return Number(ruta);
    var v = scope;
    var partes = ruta.split('.');
    for (var i = 0; i < partes.length; i++) {
      if (v == null) return undefined;
      v = v[partes[i]];
    }
    return v;
  }

  function interpola(txt, scope) {
    return txt.replace(HUECO, function (_, r) { var v = lee(scope, r); return v == null ? '' : String(v); });
  }

  /* Pinta los hijos de `origen` (nodos de la plantilla) dentro de `destino` con `scope`. */
  function pinta(origen, destino, scope) {
    for (var n = origen.firstChild; n; n = n.nextSibling) {
      if (n.nodeType === 3) { destino.appendChild(document.createTextNode(interpola(n.nodeValue, scope))); continue; }
      if (n.nodeType !== 1) continue;
      var tag = n.tagName.toLowerCase();
      if (tag === 'sc-for') {
        var m = ENTERO.exec(n.getAttribute('list') || '');
        var lista = m ? lee(scope, m[1]) : null;
        var como = n.getAttribute('as') || 'item';
        if (lista && lista.length) {
          for (var i = 0; i < lista.length; i++) {
            var s = Object.create(scope);
            s[como] = lista[i];
            s.$index = i;
            pinta(n, destino, s);
          }
        }
        continue;
      }
      if (tag === 'sc-if') {
        var c = ENTERO.exec(n.getAttribute('value') || '');
        if (c && lee(scope, c[1])) pinta(n, destino, scope);
        continue;
      }
      var el = n.namespaceURI === 'http://www.w3.org/2000/svg'
        ? document.createElementNS(n.namespaceURI, n.tagName)
        : document.createElement(tag);
      for (var a = 0; a < n.attributes.length; a++) {
        var at = n.attributes[a];
        var nombre = at.name;
        var entero = ENTERO.exec(at.value);
        if (/^on/i.test(nombre)) {
          var fn = entero ? lee(scope, entero[1]) : null;
          if (typeof fn === 'function') { el.__h = el.__h || {}; el.__h[nombre.slice(2).toLowerCase()] = fn; }
          continue;
        }
        var valor = at.value.indexOf('{{') < 0 ? at.value : interpola(at.value, scope);
        if (nombre === 'class' || nombre === 'classname') nombre = 'class';
        el.setAttribute(nombre, valor);
      }
      pinta(n.content || n, el, scope);
      destino.appendChild(el);
    }
  }

  /* Parchea `viejo` para que quede como `nuevo` reutilizando los nodos que ya existen. */
  function parchea(viejo, nuevo) {
    var a = viejo.firstChild, b = nuevo.firstChild;
    while (b) {
      var sigB = b.nextSibling;
      if (!a) { viejo.appendChild(b); b = sigB; continue; }
      var sigA = a.nextSibling;
      if (a.nodeType !== b.nodeType || (a.nodeType === 1 && a.tagName !== b.tagName)) {
        viejo.replaceChild(b, a);
      } else if (a.nodeType === 3) {
        if (a.nodeValue !== b.nodeValue) a.nodeValue = b.nodeValue;
      } else if (a.nodeType === 1) {
        for (var i = a.attributes.length - 1; i >= 0; i--) {
          var nom = a.attributes[i].name;
          if (!b.hasAttribute(nom)) a.removeAttribute(nom);
        }
        for (var j = 0; j < b.attributes.length; j++) {
          var at = b.attributes[j];
          if (a.getAttribute(at.name) !== at.value) a.setAttribute(at.name, at.value);
        }
        a.__h = b.__h;
        parchea(a, b);
      }
      a = sigA; b = sigB;
    }
    while (a) { var s = a.nextSibling; viejo.removeChild(a); a = s; }
  }

  /* Monta una página: `logica` es un objeto con renderVals() y state; setState repinta todas las zonas. */
  function monta(raiz, logica) {
    var zonas = [];
    var tpls = raiz.querySelectorAll('template[data-r]');
    for (var i = 0; i < tpls.length; i++) {
      var out = document.createElement('x-r');
      out.style.display = 'contents';
      tpls[i].parentNode.insertBefore(out, tpls[i].nextSibling);
      zonas.push({ tpl: tpls[i], out: out });
    }
    ['click', 'change', 'input', 'submit', 'keydown'].forEach(function (tipo) {
      raiz.addEventListener(tipo, function (ev) {
        for (var el = ev.target; el && el !== raiz; el = el.parentNode) {
          if (el.__h && el.__h[tipo]) { el.__h[tipo].call(null, ev); return; }
        }
      });
    });
    function repinta() {
      var vals = logica.renderVals();
      for (var z = 0; z < zonas.length; z++) {
        var tmp = document.createElement('x-r');
        pinta(zonas[z].tpl.content, tmp, vals);
        parchea(zonas[z].out, tmp);
      }
    }
    logica.state = logica.state || {};
    logica.setState = function (cambio) {
      var c = typeof cambio === 'function' ? cambio(logica.state) : cambio;
      for (var k in c) if (Object.prototype.hasOwnProperty.call(c, k)) logica.state[k] = c[k];
      repinta();
    };
    repinta();
    if (logica.componentDidMount) logica.componentDidMount();
    return logica;
  }

  window.XDC = { monta: monta };
})();
