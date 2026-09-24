/* contacto.js — envía el formulario [data-contacto] a /api/contacto (24-sep-2026).
   Pide el token firmado al primer foco (y otra vez si caducó), añade los utm_* de la
   URL actual y, si algo falla, deja a la vista el email para escribir directamente.
   No guarda nada en el navegador (ni cookies ni storage): la política lo promete. */
(function(){
  'use strict';
  var forms = document.querySelectorAll('form[data-contacto]');
  if(!forms.length) return;
  var utm = {};
  try {
    var q = new URLSearchParams(location.search);
    ['utm_source','utm_medium','utm_campaign','utm_content','utm_term'].forEach(function(k){ if(q.get(k)) utm[k] = q.get(k).slice(0,120); });
  } catch(e){}

  function token(){
    return fetch('/api/contacto', {credentials:'same-origin', cache:'no-store'})
      .then(function(r){ if(!r.ok) throw 0; return r.json(); });
  }

  Array.prototype.forEach.call(forms, function(form){
    var msg = form.querySelector('.fc-msg'), btn = form.querySelector('button[type=submit]');
    var tok = null, pidiendo = null;
    function pedir(){ if(!pidiendo) pidiendo = token().then(function(t){ tok = t; return t; }).catch(function(){ pidiendo = null; return null; }); return pidiendo; }
    form.addEventListener('focusin', pedir, {once:true});

    function aviso(clave, conCorreo){
      var d = msg.dataset; msg.className = 'fc-msg fc-msg--' + clave;
      msg.textContent = d[clave] + (conCorreo ? ' ' : '');
      if(conCorreo){ var a = document.createElement('a'); a.href = d.mail; a.textContent = d.to; msg.appendChild(a); }
    }

    form.addEventListener('submit', function(e){
      e.preventDefault();
      if(!form.checkValidity()){ form.reportValidity(); aviso('val', false); return; }
      btn.disabled = true; aviso('sending', false);
      pedir().then(function(t){
        if(!t) throw new Error('tok');
        /* El token caduca a las 2 h: si la pestaña llevaba abierta más, se pide otro. */
        if(Date.now()/1000 - t.t > 7000){ pidiendo = null; return pedir(); }
        return t;
      }).then(function(t){
        if(!t) throw new Error('tok');
        var fd = new FormData(form);
        fd.append('t', t.t); fd.append('n', t.n); fd.append('s', t.s);
        Object.keys(utm).forEach(function(k){ fd.append(k, utm[k]); });
        return fetch('/api/contacto', {method:'POST', body:fd, credentials:'same-origin'});
      }).then(function(r){
        return r.json().catch(function(){ return {ok:false}; }).then(function(j){ return {st:r.status, j:j}; });
      }).then(function(res){
        if(res.j && res.j.ok){ form.reset(); aviso('ok', false); btn.disabled = true; return; }
        btn.disabled = false; pidiendo = null;
        aviso(res.st === 429 ? 'lim' : (res.j && res.j.e === 'val' ? 'val' : 'err'), res.st !== 400 || (res.j && res.j.e !== 'val'));
      }).catch(function(){ btn.disabled = false; pidiendo = null; aviso('err', true); });
    });
  });
})();
