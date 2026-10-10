/* red.js — el diagrama animado de la portada (10-oct-2026).
 * Es una ILUSTRACIÓN con datos de ejemplo, no actividad en vivo: la página lo dice en tres sitios.
 * Un solo estado («actividad»). Textos EN/ES en el diccionario X, elegido por <html lang>.
 * Sin dependencias, sin red, sin almacenamiento. El número de departamentos llega en
 * #netw[data-deps] (sale de inc/organigrama.php, generado), no se escribe aquí. */
(function(){
  'use strict';
  var $=function(i){return document.getElementById(i)};
  var cv=$('cv'); if(!cv) return;
  var RM=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;
  var ES=document.documentElement.lang==='es';
  var NDEP=parseInt(($('netw').getAttribute('data-deps')||'17'),10)||17;
  var COL={pink:[255,45,85],blue:[10,132,255],green:[48,182,80],yellow:[255,159,10],gray:[142,142,147],white:[88,86,214],teal:[50,173,230],violet:[175,82,222]};

  var X=ES?{
    desc:{frontend:'Lo que ve y toca el visitante: páginas, móvil y accesibilidad.',backend:'Bases de datos, funciones e integraciones: lo que no se ve.',bots:'Asistentes de WhatsApp que atienden a los clientes.',pilotos:'Agentes autónomos que llevan un negocio dentro de límites duros. En pruebas, modo sombra.',
      seguridad:'Revisa que todo sea seguro antes y después de publicar.',legal:'Contratos, textos legales y normativa.',administracion:'Facturación y fiscalidad del estudio.',organizacion:'Cuida la estructura del estudio y retira lo que sobra.',
      diseno:'Dirección de arte, identidad y piezas gráficas.',arquitectura:'Viviendas en 3D y parcelarios a partir de planos y fotos.',modelado:'Personajes, props y escenarios para videojuegos.',videojuegos:'Motor y juego propio del estudio.',marketing:'Anuncios, SEO y captación de contactos.',comunicacion:'Notas de prensa y relación con medios.',
      calidad:'Comprueba en producción que lo prometido funciona de verdad. Puede frenar una entrega.',deploy:'Lleva el trabajo a producción y mantiene los servicios.',documentacion:'Propuestas, informes y entregas en PDF.',
      erp:'El producto de gestión de AxisWorks para llevar un negocio: reservas, contratos, facturas y operación. Demo disponible.',aaas:'Agentes que llevan un negocio dentro de límites duros (Pilotos y Bots). En pruebas en modo sombra: todavía no es un servicio en marcha.',webs:'Webs a medida para clientes, ya publicadas. Previsto: landings generadas con la información del ERP.',
      revprev:'Subagentes por departamento (1 a 3) que opinan sobre el PLAN antes de construir. Presupuesto de 5 por sesión.',explore:'Subagente de solo lectura que rastrea muchos ficheros y devuelve solo la conclusión.',plan:'Subagente que diseña el plan de implementación y sus alternativas.',encargo:'Un subagente por subtarea, con contexto mínimo, verificado contra su criterio de aceptación.',consulta:'Si el revisor lo pide, un subagente por departamento revisa el mismo diff antes de publicar.',verificador:'Comprueba en producción que lo publicado hace lo esperado, con prueba.',trampas:'Calidad esconde un fallo en un plan para medir si un departamento lo detecta.',
      brief:'El encargo que arranca el trabajo, con las palabras de quien lo pide.',ceo:'Reparte el trabajo entre los departamentos y sostiene el hilo del encargo.',revisor:'Revisa el código con contexto limpio antes de publicar; sin su sello no sube.',humano:'Precio, publicar, borrar o gastar: lo decide una persona.',entrega:'El proyecto llega al cliente. Marcarlo como entregado lo decide una persona.'},
    work:{backend:'Ajustando una base de datos',seguridad:'Revisando un plan',calidad:'Verificando en producción',frontend:'Construyendo una página',diseno:'Revisando un diseño',deploy:'Publicando un cambio',bots:'Afinando un asistente',legal:'Revisando un texto',marketing:'Preparando contenido',documentacion:'Preparando un documento',organizacion:'Revisando la estructura',pilotos:'Probando un agente en modo de prueba'},
    rows:{Input:'Entrada',Decide:'Decide',Spawned:'Se levantan',Review:'Opinan',Build:'Construyen',Create:'Crean',Gates:'Puertas',Publish:'Publican',Verify:'Verifican',Products:'Productos',Output:'Salida'},
    names:{brief:'Encargo',ceo:'CEO · reparto',revprev:'Revisión previa',explore:'Exploración',plan:'Planificación',encargo:'Subtarea',seguridad:'Seguridad',legal:'Legal',administracion:'Administración',organizacion:'Organización',frontend:'Frontend',backend:'Backend',bots:'Bots',pilotos:'Pilotos',diseno:'Diseño',arquitectura:'Arquitectura',modelado:'Modelado 3D',videojuegos:'Videojuegos',marketing:'Marketing',comunicacion:'Comunicación',calidad:'Calidad',revisor:'Revisor de código',consulta:'Consulta deploy',humano:'Supervisión',deploy:'Deploy',documentacion:'Documentación',verificador:'Verificador',trampas:'Planes trampa',aaas:'AaaS',erp:'ERP',webs:'Webs',entrega:'Entrega'},
    notes:{aaas:'en pruebas',erp:'demo disponible',webs:'en producción'},
    LS:{3:'activo · 1 h',2:'activo hoy',1:'reposo'},always:'siempre',
    hover:['Pasa el cursor por un nodo','El diagrama es el camino del trabajo en el estudio. Las partículas y los datos son una ilustración, no actividad en vivo.'],
    pAgents:'Pack de un negocio',pNine:'9 agentes',pNote:'1 negocio en pruebas · 2 previstos',AG:['Capitán','Recepción','Radar','Cifras','Gancho','Pluma','Oído','Ruta','Tesorero'],
    tools:'Herramientas IA',planned:'previsto',toolsSub:'Los pilotos tendrán acceso',toolNames:['Estilos de vídeo','Carruseles','Investigador','Mapas de parcelas'],
    operates:'opera sobre',landings:'landings',types:'3 tipos de ERP',typeNames:['Propiedades','Reservas','Servicios'],aaasTag:'AaaS',
    pLog:'Tráfico de nodos',pLogE:'ejemplo',pLay:'Actividad por capa',pLayE:'ejemplo',pSub:'Subagentes lanzados',pSubE:'ejemplo',
    G:{Build:'Construyen',Create:'Crean',Review:'Opinan',Gates:'Puertas'},
    SA:['Revisión previa','Exploración','Planificación','Subtarea','Revisor de código','Verificador','Consulta deploy'],
    lead:function(n){return 'En esta ilustración hay '+n+' de '+NDEP+' departamentos activos a la vez. Equipos de IA bajo supervisión humana.'},
    log:[['09:15','revisión previa','seguridad + backend','sobre un plan'],['09:14','revisor de código','sello aprobado','código revisado'],['09:12','seguridad','backend','revisión de un plan'],['09:08','calidad','verificando en producción'],['09:01','diseño','frontend','revisión de un diseño'],['08:55','legal','revisando un texto'],['08:47','deploy','publicando un cambio'],['08:40','documentación','preparando un documento'],['08:31','bots','afinando un asistente']]
  }:{
    desc:{frontend:'What the visitor sees and touches: pages, mobile and accessibility.',backend:'Databases, functions and integrations: what you do not see.',bots:'WhatsApp assistants that serve customers.',pilotos:'Autonomous agents that run a business within hard limits. In testing, shadow mode.',
      seguridad:'Checks that everything is secure before and after publishing.',legal:'Contracts, legal texts and regulation.',administracion:'The studio’s invoicing and tax.',organizacion:'Looks after the studio’s structure and retires what is not needed.',
      diseno:'Art direction, identity and graphic pieces.',arquitectura:'3D homes and plot maps from plans and photos.',modelado:'Characters, props and environments for games.',videojuegos:'The studio’s own engine and game.',marketing:'Ads, SEO and lead generation.',comunicacion:'Press releases and media relations.',
      calidad:'Checks in production that what was promised really works. Can block a delivery.',deploy:'Takes work to production and keeps services running.',documentacion:'Proposals, reports and deliverables in PDF.',
      erp:'AxisWorks’ management product to run a business: bookings, contracts, invoices and operations. Demo available.',aaas:'Agents that run a business within hard limits (Pilots and Bots). In shadow-mode testing: not yet a running service.',webs:'Custom websites for customers, already published. Planned: landing pages generated from the information held in the ERP.',
      revprev:'Subagents per department (1 to 3) that review the PLAN before building. Budget of 5 per session.',explore:'Read-only subagent that sweeps many files and returns only the conclusion.',plan:'Subagent that designs the implementation plan and its alternatives.',encargo:'One subagent per subtask, with minimal context, verified against its acceptance criteria.',consulta:'If the reviewer asks, one subagent per department reviews the same diff before publishing.',verificador:'Checks in production that what was published does what is expected, with proof.',trampas:'Quality hides a flaw in a plan to measure whether a department catches it.',
      brief:'The request that starts the work, in the requester’s own words.',ceo:'Dispatches work across departments and holds the thread of the assignment.',revisor:'Reviews code with a clean context before publishing; nothing ships without its seal.',humano:'Price, publish, delete or spend: a person decides.',entrega:'The project reaches the customer. Marking it as delivered is a person’s decision.'},
    work:{backend:'Adjusting a database',seguridad:'Reviewing a plan',calidad:'Verifying in production',frontend:'Building a page',diseno:'Reviewing a design',deploy:'Publishing a change',bots:'Tuning an assistant',legal:'Reviewing a text',marketing:'Preparing content',documentacion:'Preparing a document',organizacion:'Reviewing the structure',pilotos:'Testing an agent in test mode'},
    rows:{Input:'Input',Decide:'Decide',Spawned:'Spawned',Review:'Review',Build:'Build',Create:'Create',Gates:'Gates',Publish:'Publish',Verify:'Verify',Products:'Products',Output:'Output'},
    names:{brief:'Brief',ceo:'CEO · dispatch',revprev:'Pre-review',explore:'Exploration',plan:'Planning',encargo:'Subtask',seguridad:'Security',legal:'Legal',administracion:'Administration',organizacion:'Organization',frontend:'Frontend',backend:'Backend',bots:'Bots',pilotos:'Pilots',diseno:'Design',arquitectura:'Architecture',modelado:'3D Modeling',videojuegos:'Games',marketing:'Marketing',comunicacion:'Comms',calidad:'Quality',revisor:'Code reviewer',consulta:'Deploy consult',humano:'Oversight',deploy:'Deploy',documentacion:'Documentation',verificador:'Verifier',trampas:'Trap plans',aaas:'AaaS',erp:'ERP',webs:'Websites',entrega:'Delivery'},
    notes:{aaas:'in testing',erp:'demo available',webs:'in production'},
    LS:{3:'active · 1 h',2:'active today',1:'idle'},always:'always',
    hover:['Hover over a node','The diagram is the path work takes through the studio. Particles and figures are an illustration, not live activity.'],
    pAgents:'Per-business pack',pNine:'9 agents',pNote:'1 business in testing · 2 planned',AG:['Captain','Reception','Radar','Figures','Hook','Quill','Listener','Route','Treasurer'],
    tools:'AI Tools',planned:'planned',toolsSub:'Pilots will get access',toolNames:['Video styles','Carousels','Researcher','Plot maps'],
    operates:'operates on',landings:'landings',types:'3 ERP types',typeNames:['Properties','Bookings','Services'],aaasTag:'AaaS',
    pLog:'Node traffic',pLogE:'sample',pLay:'Activity by layer',pLayE:'sample',pSub:'Subagents launched',pSubE:'sample',
    G:{Build:'Build',Create:'Create',Review:'Review',Gates:'Gates'},
    SA:['Pre-review','Exploration','Planning','Subtask','Code reviewer','Verifier','Deploy consult'],
    lead:function(n){return 'In this illustration, '+n+' of '+NDEP+' departments are active at once. AI teams under human oversight.'},
    log:[['09:15','pre-review','security + backend','on a plan'],['09:14','code reviewer','seal approved','code reviewed'],['09:12','security','backend','plan review'],['09:08','quality','verifying in production'],['09:01','design','frontend','design review'],['08:55','legal','reviewing a text'],['08:47','deploy','publishing a change'],['08:40','documentation','preparing a document'],['08:31','bots','tuning an assistant']]
  };

  /* [id, ¿proceso? (no es un departamento), color propio] por fila */
  var ROWS=[
    {k:'Input',t:'gray',n:[['brief',1]]},
    {k:'Decide',t:'pink',n:[['ceo',1]]},
    {k:'Spawned',t:'teal',n:[['revprev',1],['explore',1],['plan',1],['encargo',1]]},
    {k:'Review',t:'blue',n:[['seguridad'],['legal'],['administracion'],['organizacion']]},
    {k:'Build',t:'green',n:[['frontend'],['backend'],['bots'],['pilotos']]},
    {k:'Create',t:'green',n:[['diseno'],['arquitectura'],['modelado'],['videojuegos'],['marketing'],['comunicacion']]},
    {k:'Gates',t:'pink',n:[['calidad'],['revisor',1],['consulta',1,'teal'],['humano',1,'white']]},
    {k:'Publish',t:'yellow',n:[['deploy'],['documentacion']]},
    {k:'Verify',t:'teal',n:[['verificador',1],['trampas',1]]},
    {k:'Products',t:'violet',n:[['aaas',1,'violet'],['erp',1,'violet'],['webs',1,'violet']]},
    {k:'Output',t:'gray',n:[['entrega',1]]}
  ];
  var LVL={backend:3,seguridad:3,calidad:3,frontend:3,diseno:3,deploy:3,bots:3,legal:2,marketing:2,documentacion:2,organizacion:2,pilotos:2,revprev:3,explore:3,plan:2,encargo:3,consulta:2,verificador:3,trampas:2};
  var MEETS=3;
  var cur_sel=null,hov=null,W=1250,H=1080,NW=132,NH=58,ROWH=90,TOP=64;
  var N=[],E=[],P=[],off=null,cx=cv.getContext('2d'),dirty=true,last=0,LIFT={};

  function nm(id){return X.names[id]}
  function lvlDept(id){return LVL[id]||1}
  function lvl(id){
    if(id==='ceo')return 3;
    if(id==='brief')return 2;
    if(id==='revisor')return (lvlDept('frontend')===3||lvlDept('backend')===3)?3:1;
    if(id==='humano')return 2;
    if(id==='entrega')return lvlDept('deploy')>=2?2:1;
    if(id==='erp')return lvlDept('backend')>=2?2:1;
    if(id==='aaas')return Math.max(lvlDept('bots'),lvlDept('pilotos'))>=2?2:1;
    if(id==='webs')return lvlDept('frontend')>=2?2:1;
    return lvlDept(id);
  }
  function layout(){
    N=[];
    ROWS.forEach(function(r,ri){
      var m=r.n.length,sp=r.k==='Products'?250:Math.min(156,860/m),cxx=600,y=TOP+ri*ROWH+(r.k==='Output'?44:0);
      r.n.forEach(function(n,j){N.push({id:n[0],proc:!!n[1],col:n[2]||r.t,row:ri,x:cxx+(j-(m-1)/2)*sp,y:y,note:X.notes[n[0]]})});
    });
    E=[];
    for(var ri=0;ri<ROWS.length-1;ri++)N.filter(function(a){return a.row===ri}).forEach(function(a){N.filter(function(b){return b.row===ri+1}).forEach(function(b){E.push({a:a,b:b})})});
    [['bots','aaas'],['pilotos','aaas'],['backend','erp'],['frontend','webs']].forEach(function(p){var a=N.filter(function(n){return n.id===p[0]})[0],b=N.filter(function(n){return n.id===p[1]})[0];if(a&&b)E.push({a:a,b:b,x:1})});
    N.forEach(function(n){LIFT[n.id]={x:0,v:0,t:0}});
  }
  function bez(e,t,dx){
    var x1=e.a.x,y1=e.a.y+NH/2,x2=e.b.x,y2=e.b.y-NH/2,g=(y2-y1)*.55,cx1=x1+(dx||0),cy1=y1+g,cx2=x2+(dx||0),cy2=y2-g,u=1-t;
    return [u*u*u*x1+3*u*u*t*cx1+3*u*t*t*cx2+t*t*t*x2,u*u*u*y1+3*u*u*t*cy1+3*u*t*t*cy2+t*t*t*y2];
  }
  function drawWires(){
    var o=document.createElement('canvas'),dpr=Math.min(window.devicePixelRatio||1,2);o.width=W*dpr;o.height=H*dpr;var c=o.getContext('2d');c.setTransform(dpr,0,0,dpr,0,0);
    E.forEach(function(e,i){
      var l=lvl(e.a.id),hot=l===3,mid=l===2,col=COL[e.a.col]||COL.gray;
      var x1=e.a.x,y1=e.a.y+NH/2,x2=e.b.x,y2=e.b.y-NH/2,g=(y2-y1)*.55;
      for(var k=0;k<4;k++){
        var j=(k-1.5)*7+((i*13+k*5)%9-4);
        c.beginPath();c.moveTo(x1,y1);c.bezierCurveTo(x1+j,y1+g,x2+j,y2-g,x2,y2);
        c.strokeStyle=hot?'rgba('+col[0]+','+col[1]+','+col[2]+',.30)':(mid?'rgba(90,100,130,.16)':'rgba(90,100,130,.08)');c.lineWidth=.8;c.stroke();
      }
    });
    off=o;
  }
  function seedParticles(){
    P=[];
    N.forEach(function(n){
      var l=lvl(n.id),out=E.filter(function(e){return e.a===n});if(!out.length||l<2)return;
      var cnt=l===3?9:2;for(var i=0;i<cnt;i++)P.push({n:n,e:out[Math.floor(Math.random()*out.length)],p:Math.random(),v:.18+Math.random()*.4,j:(Math.random()-.5)*14});
    });
  }
  function spring(s,dt){var k=Math.pow(2*Math.PI/.38,2),c=2*Math.sqrt(k);s.v+=(-k*(s.x-s.t)-c*s.v)*dt;s.x+=s.v*dt;if(Math.abs(s.x-s.t)<.002&&Math.abs(s.v)<.002){s.x=s.t;s.v=0;return false}return true}
  function applyLift(id){var s=LIFT[id],el=document.querySelector('[data-nodo="'+id+'"].nd');if(el&&s)el.style.transform='translateY('+(-5*s.x).toFixed(2)+'px) scale('+(1+.045*s.x).toFixed(4)+')'}
  function setLift(){N.forEach(function(n){var t=(cur_sel===n.id)?.6:(hov===n.id?1:0);if(RM){LIFT[n.id].x=LIFT[n.id].t=t;applyLift(n.id)}else LIFT[n.id].t=t})}
  function frame(t){
    var dt=Math.min((t-last)/1000,.05);last=t;
    N.forEach(function(n){if(spring(LIFT[n.id],dt)||LIFT[n.id].x!==0)applyLift(n.id)});
    if(!document.hidden&&off&&(dirty||(!RM&&P.length))){
      var dpr=Math.min(window.devicePixelRatio||1,2);cx.setTransform(1,0,0,1,0,0);cx.clearRect(0,0,cv.width,cv.height);cx.drawImage(off,0,0,cv.width,cv.height);
      cx.setTransform(dpr,0,0,dpr,0,0);
      if(!RM)P.forEach(function(q){
        q.p+=dt*q.v;if(q.p>1){var out=E.filter(function(e){return e.a===q.n});q.e=out[Math.floor(Math.random()*out.length)];q.p=0}
        var pt=bez(q.e,q.p,q.j),col=COL[q.n.col]||COL.gray,a=1-q.p*.55;
        cx.fillStyle='rgba('+col[0]+','+col[1]+','+col[2]+','+(.16*a)+')';cx.beginPath();cx.arc(pt[0],pt[1],6,0,6.283);cx.fill();
        cx.fillStyle='rgba('+col[0]+','+col[1]+','+col[2]+','+a+')';cx.beginPath();cx.arc(pt[0],pt[1],2.6,0,6.283);cx.fill();
        cx.fillStyle='rgba(255,255,255,'+(.9*a)+')';cx.beginPath();cx.arc(pt[0]-.5,pt[1]-.5,1,0,6.283);cx.fill();
      });
      dirty=false;
    }
    requestAnimationFrame(frame);
  }
  function esc(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}
  var PERSON='<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8z"/></svg>';
  var TOOLPATH=['M8 5v14l11-7z','M12 3 2 8l10 5 10-5zM2 12l10 5 10-5-2-1-8 4-8-4zM2 16l10 5 10-5-2-1-8 4-8-4z','M10 4a6 6 0 1 0 3.5 10.9l5 5 1.5-1.5-5-5A6 6 0 0 0 10 4zm0 2a4 4 0 1 1 0 8 4 4 0 0 1 0-8z','M9 4 3 6v14l6-2 6 2 6-2V4l-6 2z'];
  function buildNodes(){
    var net=$('net'),h='';
    ROWS.forEach(function(r,ri){h+='<div class="lay" aria-hidden="true" style="top:'+(TOP+ri*ROWH-8)+'px">'+esc(X.rows[r.k])+'</div>'});
    N.forEach(function(n){
      var l=lvl(n.id),c=COL[n.col]||COL.gray;
      h+='<button type="button" class="nd '+(l>=2?'on'+(l===3?' on3':''):'off')+(cur_sel===n.id?' sel':'')+'" data-nodo="'+n.id+'" aria-label="'+esc(nm(n.id))+'" style="left:'+(n.x-NW/2)+'px;top:'+(n.y-NH/2)+'px;--c:rgb('+c+');--rgb:'+c.join(',')+'">'
        +'<b>'+esc(nm(n.id))+'</b><span>'+esc(n.id==='humano'?X.always:(n.note||X.LS[l]))+'</span><i class="dt"></i><div class="bar"><i style="width:'+(l===3?86:(l===2?44:8))+'%"></i></div></button>';
    });
    var ga=N.filter(function(n){return n.id==='bots'||n.id==='pilotos'});
    if(ga.length===2){var gx=Math.min(ga[0].x,ga[1].x)-NW/2-9,gw=Math.abs(ga[0].x-ga[1].x)+NW+18;h+='<div class="grp" style="left:'+gx+'px;top:'+(ga[0].y-NH/2-12)+'px;width:'+gw+'px;height:'+(NH+24)+'px"><i>'+X.aaasTag+'</i></div>'}
    var aa=N.filter(function(n){return n.id==='aaas'})[0],er=N.filter(function(n){return n.id==='erp'})[0],wb=N.filter(function(n){return n.id==='webs'})[0];
    if(aa&&er&&wb){
      h+='<div class="xcon on" style="left:'+(aa.x+NW/2)+'px;top:'+(aa.y-1)+'px;width:'+(er.x-aa.x-NW)+'px"><span>'+X.operates+'</span><i></i></div>';
      h+='<div class="xcon on" style="left:'+(er.x+NW/2)+'px;top:'+(er.y-1)+'px;width:'+(wb.x-er.x-NW)+'px"><span>'+X.landings+'</span><i></i></div>';
      h+='<div class="etypes" style="left:'+(er.x-130)+'px;top:'+(er.y+NH/2+8)+'px;width:260px"><small>'+X.types+'</small>'+X.typeNames.map(function(t){return '<span>'+t+'</span>'}).join('')+'</div>';
    }
    var pp=N.filter(function(n){return n.id==='pilotos'})[0];
    if(pp){
      var pst=lvl('pilotos')>=2?'on':'off',x0=pp.x+NW/2;
      h+='<div class="pcon '+pst+'" style="left:'+x0+'px;top:'+(pp.y-1)+'px;width:'+(1044-x0)+'px"><i></i></div>';
      h+='<div class="pcol" style="left:1044px;top:'+(pp.y-118)+'px;width:176px"><div class="pack '+pst+'"><h5>'+X.pAgents+'</h5><b>'+X.pNine+'</b><div class="pg">'+X.AG.map(function(a,i){return '<span style="animation-delay:-'+(i*0.28).toFixed(2)+'s">'+PERSON+'<em>'+a+'</em></span>'}).join('')+'</div><p>'+X.pNote+'</p></div><div class="tcon '+pst+'"></div><div class="aitools"><h5>'+X.tools+' <span>'+X.planned+'</span></h5><small>'+X.toolsSub+'</small><ul>'+X.toolNames.map(function(t,i){return '<li><svg viewBox="0 0 24 24" aria-hidden="true"><path d="'+TOOLPATH[i]+'"/></svg>'+t+'</li>'}).join('')+'</ul></div></div>';
    }
    net.querySelectorAll('.nd,.lay,.grp,.pack,.pcon,.pcol,.xcon,.etypes').forEach(function(x){x.remove()});
    net.insertAdjacentHTML('beforeend',h);
    N.forEach(function(n){applyLift(n.id)});
  }
  function info(id){
    var n=N.filter(function(x){return x.id===id})[0];if(!n)return;
    var l=lvl(id);
    $('info').innerHTML='<b>'+esc(nm(id))+'</b><em>'+esc(X.desc[id]||'')+'</em><em>'+esc(id==='humano'?X.always:X.LS[l])+(X.work[id]&&l>=2?' · '+esc(X.work[id]):'')+'</em>';
  }
  function rail(){
    var log=X.log.map(function(r){return r.length===4?'<li><time>'+r[0]+'</time><span>'+esc(r[1])+' <i>→</i> '+esc(r[2])+' · '+esc(r[3])+'</span></li>':'<li><time>'+r[0]+'</time><span>'+esc(r[1])+' · '+esc(r[2])+'</span></li>'}).join('');
    var mv=!RM;
    var rs='<div class="pn"><h3>'+X.pLog+'<em>'+X.pLogE+'</em></h3><div class="log'+(mv?' mv':'')+'" aria-hidden="true"><ul>'+log+(mv?log:'')+'</ul></div></div>';
    var G=[['Build','green',['frontend','backend','bots','pilotos']],['Create','green',['diseno','arquitectura','modelado','videojuegos','marketing','comunicacion']],['Review','blue',['seguridad','legal','administracion','organizacion']],['Gates','pink',['calidad','deploy','documentacion']]];
    var rw='';G.forEach(function(g){var a=g[2].filter(function(x){return lvl(x)===3}).length,c=COL[g[1]];rw+='<div class="rw"><span>'+X.G[g[0]]+'</span><div class="t"><i style="width:'+Math.round(a/g[2].length*100)+'%;background:rgb('+c+')"></i></div><b>'+a+'/'+g[2].length+'</b></div>'});
    rs+='<div class="pn"><h3>'+X.pLay+'<em>'+X.pLayE+'</em></h3>'+rw+'</div>';
    var SA=[7,12,3,9,6,4,2],COLS=[COL.teal,COL.teal,COL.teal,COL.teal,COL.pink,COL.teal,COL.teal],sr='';
    X.SA.forEach(function(nme,i){sr+='<div class="rw"><span>'+nme+'</span><div class="t"><i style="width:'+Math.round(SA[i]/12*100)+'%;background:rgb('+COLS[i]+')"></i></div><b>'+SA[i]+'</b></div>'});
    rs+='<div class="pn"><h3>'+X.pSub+'<em>'+X.pSubE+'</em></h3>'+sr+'</div>';
    $('rail').innerHTML=rs;
    var dep=N.filter(function(n){return !n.proc}),n3=dep.filter(function(n){return lvl(n.id)===3}).length;
    $('c-a').textContent=n3;$('c-c').textContent=MEETS;
    $('lead').textContent=X.lead(n3);
  }
  function mlist(){
    var h='';
    ROWS.forEach(function(r){h+='<h4>'+esc(X.rows[r.k])+'</h4>';r.n.forEach(function(n){var id=n[0],c=COL[n[2]||r.t],l=lvl(id);h+='<button type="button" data-nodo="'+id+'" style="--c:rgb('+c+')"><i class="'+(l>=2?'on':'')+'"></i>'+esc(nm(id))+'<s>'+esc(id==='humano'?X.always:(X.notes[id]||X.LS[l]))+'</s></button>'});});
    $('mlist').innerHTML=h;
  }
  function fit(){var w=$('netw').clientWidth||1000,k=Math.min(1,w/W,Math.max(.6,(window.innerHeight-110)/H));$('net').style.transform='scale('+k+')';$('netw').style.height=Math.round(H*k)+'px'}
  function all(){buildNodes();drawWires();seedParticles();rail();mlist();fit();setLift();dirty=true}
  document.addEventListener('click',function(e){
    var n=e.target.closest('[data-nodo]');if(n){cur_sel=n.getAttribute('data-nodo');info(cur_sel);buildNodes();setLift()}
  });
  $('netw').addEventListener('mouseover',function(e){var n=e.target.closest&&e.target.closest('.nd');var id=n?n.getAttribute('data-nodo'):null;if(id!==hov){hov=id;if(id)info(id);setLift()}});
  window.addEventListener('resize',fit);
  var dpr=Math.min(window.devicePixelRatio||1,2);cv.width=W*dpr;cv.height=H*dpr;
  layout();all();
  $('info').innerHTML='<b>'+X.hover[0]+'</b><em>'+X.hover[1]+'</em>';
  requestAnimationFrame(frame);
})();
