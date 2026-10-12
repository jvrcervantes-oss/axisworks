/* GENERADO por tr_home.py desde home.js: no se edita a mano. */
/* Lógica de la mesa, copiada del diseño (clase DCLogic del lienzo) y montada con dc.js.
 * GENERADO por convierte/gen_js.py desde WebHome.dc.html: no se edita a mano. */
(function () {
'use strict';
if (!window.XDC || !window.XD) return;
var XD = window.XD;
function DCLogic(props) { this.props = props || {}; this.state = {}; }
class Component extends DCLogic {
constructor(props) {
super(props);
this.state = { t: 0, sel: null };
this.timer = null;
var cells = [], spots = [];
for (var r = 0; r < 19; r++) {
for (var c = 0; c < 20; c++) {
var x = 18 + c * 36, y = 18 + r * 37;
var h = ((c * 73856093) ^ (r * 19349663)) >>> 0;
var k = h % 10;
var dx = x - 360, dy = y - 300, d = Math.sqrt(dx * dx + dy * dy);
var cin = (0.55 + d / 1300).toFixed(2) + 's';
var cls = k < 3 ? 'c1' : k < 5 ? 'c2' : 'c0';
cells.push({ x: x, y: y, cls: cls, op: Math.max(0.25, 1 - Math.abs(x - 360) / 420).toFixed(2), delay: cls === 'c0' ? cin : cin + ', -' + ((h % 700) / 100).toFixed(2) + 's' });
if (d > 210 && y > 30 && y < 480 && x > 20 && x < 700) spots.push([x, y]);
}
}
this.cells = cells;
this.spots = spots;
}
componentDidMount() {
var rm = false;
try { rm = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}
if (!rm) this.timer = setInterval(() => this.setState((s) => ({ t: (s.t || 0) + 1 })), 650);
}
componentWillUnmount() { if (this.timer) clearInterval(this.timer); }
event(n) {
var W = [['Frontend', 'montando una página'], ['Backend', 'ajustando datos'], ['Bots', 'afinando un asistente'], ['Pilotos', 'probando un agente'], ['Seguridad', 'revisando un plan'], ['Calidad', 'probando lo publicado'], ['Deploy', 'publicando un cambio'], ['Diseño', 'revisando un diseño'], ['Marketing', 'preparando contenido'], ['Legal', 'revisando un texto'], ['Documentación', 'un documento'], ['Administración', 'preparando una factura'], ['Arquitectura', 'una casa en 3D'], ['Comunicación', 'nota de prensa'], ['Organización', 'repasa la estructura'], ['Videojuegos', 'trabajando en el motor'], ['Modelado 3D', 'una pieza del juego'], ['Revisión previa', 'opinando sobre un plan'], ['Revisor de código', 'sello aprobado']];
var a = (n * 2654435761) >>> 0;
var sp = this.spots[a % this.spots.length];
var w = W[(a >>> 7) % W.length];
var dx = 360 - sp[0], dy = 300 - sp[1];
var right = sp[0] < 380;
return { x: sp[0], y: sp[1], len: Math.sqrt(dx * dx + dy * dy).toFixed(1), angle: (Math.atan2(dy, dx) * 180 / Math.PI).toFixed(2), lx: right ? sp[0] + 14 : sp[0] - 250, ly: sp[1] - 34, who: w[0], what: w[1], border: (a >>> 3) % 3 === 0 ? '#6F79F5' : '#C8F04A' };
}
rng(seed) {
var a = seed >>> 0;
return function () { a = (a + 0x6D2B79F5) >>> 0; var t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
data() {

return {
rows: [
['ENTRADA', [['brief', 'Encargo', 'p']]],
['DECIDE', [['ceo', 'CEO de IA', 'c']]],
['SUBAGENTES', [['revprev', 'Revisión previa', 's'], ['explore', 'Exploración', 's'], ['plan', 'Plan', 's'], ['encargo', 'Subtarea', 's']]],
['REVISIÓN', [['seguridad', 'Seguridad', 'd'], ['legal', 'Legal', 'd'], ['administracion', 'Administración', 'd'], ['organizacion', 'Organización', 'd']]],
['CONSTRUIR', [['frontend', 'Frontend', 'd'], ['backend', 'Backend', 'd'], ['bots', 'Bots', 'd'], ['pilotos', 'Pilotos', 'd']]],
['CREAR', [['diseno', 'Diseño', 'd'], ['arquitectura', 'Arquitectura', 'd'], ['modelado', 'Modelado 3D', 'd'], ['videojuegos', 'Videojuegos', 'd'], ['marketing', 'Marketing', 'd'], ['comunicacion', 'Comunicación', 'd']]],
['PUERTAS', [['calidad', 'Calidad', 'd'], ['revisor', 'Revisor de código', 'g'], ['consulta', 'Consulta de deploy', 's'], ['humano', 'Supervisión', 'h']]],
['PUBLICAR · VERIFICAR', [['deploy', 'Deploy', 'd'], ['documentacion', 'Documentación', 'd'], ['verificador', 'Verificador', 's'], ['trampas', 'Planes trampa', 's']]],
['PRODUCTOS', [['aaas', 'AaaS', 'x'], ['erp', 'ERP', 'x'], ['webs', 'Webs', 'x']]],
['SALIDA', [['entrega', 'Entrega', 'p']]]
],
img: {
ceo: '/assets/images/team-pepito.webp', frontend: '/assets/images/dep-dev.webp', backend: '/assets/images/dep-data.webp', bots: '/assets/images/dep-bots.webp',
arquitectura: '/assets/images/dep-arch.webp', deploy: '/assets/images/dep-deploy.webp', videojuegos: '/assets/images/dep-games.webp', modelado: '/assets/images/dep-models.webp',
pilotos: '/assets/images/dep-pilots.webp', diseno: '/assets/images/dep-design.webp', marketing: '/assets/images/dep-marketing.webp', comunicacion: '/assets/images/dep-comms.webp',
seguridad: '/assets/images/dep-security.webp', calidad: '/assets/images/dep-quality.webp', legal: '/assets/images/dep-legal.webp', administracion: '/assets/images/dep-admin.webp',
documentacion: '/assets/images/dep-docs.webp', organizacion: '/assets/images/dep-org.webp'
},
desc: {
frontend: 'Lo que el visitante ve y toca: páginas, móvil y accesibilidad.', backend: 'Bases de datos, funciones e integraciones: lo que no se ve.', bots: 'Asistentes de WhatsApp que atienden a los clientes.', pilotos: 'Agentes autónomos que llevan un negocio dentro de límites fijos.',
seguridad: 'Comprueba que todo es seguro antes y después de publicar.', legal: 'Contratos, textos legales y normativa.', administracion: 'La facturación y los impuestos del estudio.', organizacion: 'Cuida la estructura del estudio y retira lo que sobra.',
diseno: 'Dirección de arte, identidad y piezas gráficas.', arquitectura: 'Viviendas en 3D y planos de parcelas a partir de planos y fotos.', modelado: 'Personajes, objetos y escenarios para juegos.', videojuegos: 'El motor y el juego propios del estudio.', marketing: 'Anuncios, SEO y captación de contactos.', comunicacion: 'Notas de prensa y relación con medios.',
calidad: 'Comprueba en la web publicada que lo prometido funciona. Puede frenar una entrega.', deploy: 'Publica el trabajo y mantiene los servicios en marcha.', documentacion: 'Propuestas, informes y entregables en PDF.',
erp: 'El producto de gestión de AxisWorks para llevar un negocio: reservas, contratos, facturas y operaciones. Con demo.', aaas: 'Agentes que llevan un negocio dentro de límites fijos (Pilotos y Bots).', webs: 'Webs y landings a medida para clientes.',
revprev: 'Subagentes por departamento (de 1 a 3) que revisan el PLAN antes de construir. Cinco por sesión como máximo.', explore: 'Subagente de solo lectura que recorre muchos ficheros y devuelve solo la conclusión.', plan: 'Subagente que diseña el plan de trabajo y sus alternativas.', encargo: 'Un subagente por subtarea, con el contexto justo, comprobado contra su criterio de aceptación.',
consulta: 'Si el revisor lo pide, un subagente por departamento revisa el mismo cambio antes de publicar.', verificador: 'Comprueba en la web publicada que lo publicado hace lo esperado, con pruebas.', trampas: 'Calidad esconde un fallo en un plan para medir si el departamento lo caza.',
brief: 'Lo que pide el cliente, con sus palabras.', ceo: 'Parte cada encargo en tareas y las reparte entre los departamentos.', revisor: 'Revisa el código sin contexto previo antes de publicar; nada sale sin su sello.', humano: 'Precio, publicar, borrar o gastar: decide una persona.', entrega: 'El proyecto llega al cliente. Darlo por entregado lo decide una persona.'
},
work: {
backend: 'ajustando datos', seguridad: 'revisando un plan', calidad: 'probando lo publicado', frontend: 'montando una página', diseno: 'revisando un diseño', deploy: 'publicando un cambio', bots: 'afinando un asistente', legal: 'revisando un texto',
marketing: 'preparando contenido', documentacion: 'un documento', organizacion: 'repasa la estructura', pilotos: 'probando un agente', arquitectura: 'una casa en 3D', modelado: 'una pieza del juego',
videojuegos: 'trabajando en el motor', comunicacion: 'nota de prensa', administracion: 'preparando una factura'
},
kinds: { d: 'DEPARTAMENTO DE IA', s: 'SUBAGENTE', p: 'PASO', c: 'CEO de IA', g: 'PUERTA', h: 'PERSONA', x: 'PRODUCTO' },
depts: ['seguridad', 'legal', 'administracion', 'organizacion', 'frontend', 'backend', 'bots', 'pilotos', 'diseno', 'arquitectura', 'modelado', 'videojuegos', 'marketing', 'comunicacion', 'calidad', 'deploy', 'documentacion']
};
}
activeAt(t, D) {
var r = this.rng(t * 9973 + 17);
var ids = D.depts.slice();
for (var i = ids.length - 1; i > 0; i--) { var j = Math.floor(r() * (i + 1)); var tmp = ids[i]; ids[i] = ids[j]; ids[j] = tmp; }
var n = 6 + (t % 4);
var on = {}; var order = ids.slice(0, n);
order.forEach(function (id) { on[id] = true; });
['revprev', 'explore', 'plan', 'encargo', 'consulta', 'verificador', 'trampas'].forEach(function (id) { if (r() < 0.45) on[id] = true; });
on.brief = true; on.ceo = true; on.humano = true;
if (on.frontend || on.backend) on.revisor = true;
if (on.backend) on.erp = true;
if (on.frontend) on.webs = true;
if (on.pilotos || on.bots) on.aaas = true;
if (on.deploy) on.entrega = true;
return { on: on, order: order };
}
tools() {
return [["Claude","m4.7144 15.9555 4.7174-2.6471.079-.2307-.079-.1275h-.2307l-.7893-.0486-2.6956-.0729-2.3375-.0971-2.2646-.1214-.5707-.1215-.5343-.7042.0546-.3522.4797-.3218.686.0608 1.5179.1032 2.2767.1578 1.6514.0972 2.4468.255h.3886l.0546-.1579-.1336-.0971-.1032-.0972L6.973 9.8356l-2.55-1.6879-1.3356-.9714-.7225-.4918-.3643-.4614-.1578-1.0078.6557-.7225.8803.0607.2246.0607.8925.686 1.9064 1.4754 2.4893 1.8336.3643.3035.1457-.1032.0182-.0728-.164-.2733-1.3539-2.4467-1.445-2.4893-.6435-1.032-.17-.6194c-.0607-.255-.1032-.4674-.1032-.7285L6.287.1335 6.6997 0l.9957.1336.419.3642.6192 1.4147 1.0018 2.2282 1.5543 3.0296.4553.8985.2429.8318.091.255h.1579v-.1457l.1275-1.706.2368-2.0947.2307-2.6957.0789-.7589.3764-.9107.7468-.4918.5828.2793.4797.686-.0668.4433-.2853 1.8517-.5586 2.9021-.3643 1.9429h.2125l.2429-.2429.9835-1.3053 1.6514-2.0643.7286-.8196.85-.9046.5464-.4311h1.0321l.759 1.1293-.34 1.1657-1.0625 1.3478-.8804 1.1414-1.2628 1.7-.7893 1.36.0729.1093.1882-.0183 2.8535-.607 1.5421-.2794 1.8396-.3157.8318.3886.091.3946-.3278.8075-1.967.4857-2.3072.4614-3.4364.8136-.0425.0304.0486.0607 1.5482.1457.6618.0364h1.621l3.0175.2247.7892.522.4736.6376-.079.4857-1.2142.6193-1.6393-.3886-3.825-.9107-1.3113-.3279h-.1822v.1093l1.0929 1.0686 2.0035 1.8092 2.5075 2.3314.1275.5768-.3218.4554-.34-.0486-2.2039-1.6575-.85-.7468-1.9246-1.621h-.1275v.17l.4432.6496 2.3436 3.5214.1214 1.0807-.17.3521-.6071.2125-.6679-.1214-1.3721-1.9246L14.38 17.959l-1.1414-1.9428-.1397.079-.674 7.2552-.3156.3703-.7286.2793-.6071-.4614-.3218-.7468.3218-1.4753.3886-1.9246.3157-1.53.2853-1.9004.17-.6314-.0121-.0425-.1397.0182-1.4328 1.9672-2.1796 2.9446-1.7243 1.8456-.4128.164-.7164-.3704.0667-.6618.4008-.5889 2.386-3.0357 1.4389-1.882.929-1.0868-.0062-.1579h-.0546l-6.3385 4.1164-1.1293.1457-.4857-.4554.0608-.7467.2307-.2429 1.9064-1.3114Z"],["ChatGPT",""],["Supabase","M11.9 1.036c-.015-.986-1.26-1.41-1.874-.637L.764 12.05C-.33 13.427.65 15.455 2.409 15.455h9.579l.113 7.51c.014.985 1.259 1.408 1.873.636l9.262-11.653c1.093-1.375.113-3.403-1.645-3.403h-9.642z"],["PostgreSQL","M23.5594 14.7228a.5269.5269 0 0 0-.0563-.1191c-.139-.2632-.4768-.3418-1.0074-.2321-1.6533.3411-2.2935.1312-2.5256-.0191 1.342-2.0482 2.445-4.522 3.0411-6.8297.2714-1.0507.7982-3.5237.1222-4.7316a1.5641 1.5641 0 0 0-.1509-.235C21.6931.9086 19.8007.0248 17.5099.0005c-1.4947-.0158-2.7705.3461-3.1161.4794a9.449 9.449 0 0 0-.5159-.0816 8.044 8.044 0 0 0-1.3114-.1278c-1.1822-.0184-2.2038.2642-3.0498.8406-.8573-.3211-4.7888-1.645-7.2219.0788C.9359 2.1526.3086 3.8733.4302 6.3043c.0409.818.5069 3.334 1.2423 5.7436.4598 1.5065.9387 2.7019 1.4334 3.582.553.9942 1.1259 1.5933 1.7143 1.7895.4474.1491 1.1327.1441 1.8581-.7279.8012-.9635 1.5903-1.8258 1.9446-2.2069.4351.2355.9064.3625 1.39.3772a.0569.0569 0 0 0 .0004.0041 11.0312 11.0312 0 0 0-.2472.3054c-.3389.4302-.4094.5197-1.5002.7443-.3102.064-1.1344.2339-1.1464.8115-.0025.1224.0329.2309.0919.3268.2269.4231.9216.6097 1.015.6331 1.3345.3335 2.5044.092 3.3714-.6787-.017 2.231.0775 4.4174.3454 5.0874.2212.5529.7618 1.9045 2.4692 1.9043.2505 0 .5263-.0291.8296-.0941 1.7819-.3821 2.5557-1.1696 2.855-2.9059.1503-.8707.4016-2.8753.5388-4.1012.0169-.0703.0357-.1207.057-.1362.0007-.0005.0697-.0471.4272.0307a.3673.3673 0 0 0 .0443.0068l.2539.0223.0149.001c.8468.0384 1.9114-.1426 2.5312-.4308.6438-.2988 1.8057-1.0323 1.5951-1.6698zM2.371 11.8765c-.7435-2.4358-1.1779-4.8851-1.2123-5.5719-.1086-2.1714.4171-3.6829 1.5623-4.4927 1.8367-1.2986 4.8398-.5408 6.108-.13-.0032.0032-.0066.0061-.0098.0094-2.0238 2.044-1.9758 5.536-1.9708 5.7495-.0002.0823.0066.1989.0162.3593.0348.5873.0996 1.6804-.0735 2.9184-.1609 1.1504.1937 2.2764.9728 3.0892.0806.0841.1648.1631.2518.2374-.3468.3714-1.1004 1.1926-1.9025 2.1576-.5677.6825-.9597.5517-1.0886.5087-.3919-.1307-.813-.5871-1.2381-1.3223-.4796-.839-.9635-2.0317-1.4155-3.5126zm6.0072 5.0871c-.1711-.0428-.3271-.1132-.4322-.1772.0889-.0394.2374-.0902.4833-.1409 1.2833-.2641 1.4815-.4506 1.9143-1.0002.0992-.126.2116-.2687.3673-.4426a.3549.3549 0 0 0 .0737-.1298c.1708-.1513.2724-.1099.4369-.0417.156.0646.3078.26.3695.4752.0291.1016.0619.2945-.0452.4444-.9043 1.2658-2.2216 1.2494-3.1676 1.0128zm2.094-3.988-.0525.141c-.133.3566-.2567.6881-.3334 1.003-.6674-.0021-1.3168-.2872-1.8105-.8024-.6279-.6551-.9131-1.5664-.7825-2.5004.1828-1.3079.1153-2.4468.079-3.0586-.005-.0857-.0095-.1607-.0122-.2199.2957-.2621 1.6659-.9962 2.6429-.7724.4459.1022.7176.4057.8305.928.5846 2.7038.0774 3.8307-.3302 4.7363-.084.1866-.1633.3629-.2311.5454zm7.3637 4.5725c-.0169.1768-.0358.376-.0618.5959l-.146.4383a.3547.3547 0 0 0-.0182.1077c-.0059.4747-.054.6489-.115.8693-.0634.2292-.1353.4891-.1794 1.0575-.11 1.4143-.8782 2.2267-2.4172 2.5565-1.5155.3251-1.7843-.4968-2.0212-1.2217a6.5824 6.5824 0 0 0-.0769-.2266c-.2154-.5858-.1911-1.4119-.1574-2.5551.0165-.5612-.0249-1.9013-.3302-2.6462.0044-.2932.0106-.5909.019-.8918a.3529.3529 0 0 0-.0153-.1126 1.4927 1.4927 0 0 0-.0439-.208c-.1226-.4283-.4213-.7866-.7797-.9351-.1424-.059-.4038-.1672-.7178-.0869.067-.276.1831-.5875.309-.9249l.0529-.142c.0595-.16.134-.3257.213-.5012.4265-.9476 1.0106-2.2453.3766-5.1772-.2374-1.0981-1.0304-1.6343-2.2324-1.5098-.7207.0746-1.3799.3654-1.7088.5321a5.6716 5.6716 0 0 0-.1958.1041c.0918-1.1064.4386-3.1741 1.7357-4.4823a4.0306 4.0306 0 0 1 .3033-.276.3532.3532 0 0 0 .1447-.0644c.7524-.5706 1.6945-.8506 2.802-.8325.4091.0067.8017.0339 1.1742.081 1.939.3544 3.2439 1.4468 4.0359 2.3827.8143.9623 1.2552 1.9315 1.4312 2.4543-1.3232-.1346-2.2234.1268-2.6797.779-.9926 1.4189.543 4.1729 1.2811 5.4964.1353.2426.2522.4522.2889.5413.2403.5825.5515.9713.7787 1.2552.0696.087.1372.1714.1885.245-.4008.1155-1.1208.3825-1.0552 1.717-.0123.1563-.0423.4469-.0834.8148-.0461.2077-.0702.4603-.0994.7662zm.8905-1.6211c-.0405-.8316.2691-.9185.5967-1.0105a2.8566 2.8566 0 0 0 .135-.0406 1.202 1.202 0 0 0 .1342.103c.5703.3765 1.5823.4213 3.0068.1344-.2016.1769-.5189.3994-.9533.6011-.4098.1903-1.0957.333-1.7473.3636-.7197.0336-1.0859-.0807-1.1721-.151zm.5695-9.2712c-.0059.3508-.0542.6692-.1054 1.0017-.055.3576-.112.7274-.1264 1.1762-.0142.4368.0404.8909.0932 1.3301.1066.887.216 1.8003-.2075 2.7014a3.5272 3.5272 0 0 1-.1876-.3856c-.0527-.1276-.1669-.3326-.3251-.6162-.6156-1.1041-2.0574-3.6896-1.3193-4.7446.3795-.5427 1.3408-.5661 2.1781-.463zm.2284 7.0137a12.3762 12.3762 0 0 0-.0853-.1074l-.0355-.0444c.7262-1.1995.5842-2.3862.4578-3.4385-.0519-.4318-.1009-.8396-.0885-1.2226.0129-.4061.0666-.7543.1185-1.0911.0639-.415.1288-.8443.1109-1.3505.0134-.0531.0188-.1158.0118-.1902-.0457-.4855-.5999-1.938-1.7294-3.253-.6076-.7073-1.4896-1.4972-2.6889-2.0395.5251-.1066 1.2328-.2035 2.0244-.1859 2.0515.0456 3.6746.8135 4.8242 2.2824a.908.908 0 0 1 .0667.1002c.7231 1.3556-.2762 6.2751-2.9867 10.5405zm-8.8166-6.1162c-.025.1794-.3089.4225-.6211.4225a.5821.5821 0 0 1-.0809-.0056c-.1873-.026-.3765-.144-.5059-.3156-.0458-.0605-.1203-.178-.1055-.2844.0055-.0401.0261-.0985.0925-.1488.1182-.0894.3518-.1226.6096-.0867.3163.0441.6426.1938.6113.4186zm7.9305-.4114c.0111.0792-.049.201-.1531.3102-.0683.0717-.212.1961-.4079.2232a.5456.5456 0 0 1-.075.0052c-.2935 0-.5414-.2344-.5607-.3717-.024-.1765.2641-.3106.5611-.352.297-.0414.6111.0088.6356.1851z"],["Railway","M.113 10.27A13.026 13.026 0 000 11.48h18.23c-.064-.125-.15-.237-.235-.347-3.117-4.027-4.793-3.677-7.19-3.78-.8-.034-1.34-.048-4.524-.048-1.704 0-3.555.005-5.358.01-.234.63-.459 1.24-.567 1.737h9.342v1.216H.113v.002zm18.26 2.426H.009c.02.326.05.645.094.961h16.955c.754 0 1.179-.429 1.315-.96zm-17.318 4.28s2.81 6.902 10.93 7.024c4.855 0 9.027-2.883 10.92-7.024H1.056zM11.988 0C7.5 0 3.593 2.466 1.531 6.108l4.75-.005v-.002c3.71 0 3.849.016 4.573.047l.448.016c1.563.052 3.485.22 4.996 1.364.82.621 2.007 1.99 2.712 2.965.654.902.842 1.94.396 2.934-.408.914-1.289 1.458-2.353 1.458H.391s.099.42.249.886h22.748A12.026 12.026 0 0024 12.005C24 5.377 18.621 0 11.988 0z"],["GitHub","M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"],["Python","M14.25.18l.9.2.73.26.59.3.45.32.34.34.25.34.16.33.1.3.04.26.02.2-.01.13V8.5l-.05.63-.13.55-.21.46-.26.38-.3.31-.33.25-.35.19-.35.14-.33.1-.3.07-.26.04-.21.02H8.77l-.69.05-.59.14-.5.22-.41.27-.33.32-.27.35-.2.36-.15.37-.1.35-.07.32-.04.27-.02.21v3.06H3.17l-.21-.03-.28-.07-.32-.12-.35-.18-.36-.26-.36-.36-.35-.46-.32-.59-.28-.73-.21-.88-.14-1.05-.05-1.23.06-1.22.16-1.04.24-.87.32-.71.36-.57.4-.44.42-.33.42-.24.4-.16.36-.1.32-.05.24-.01h.16l.06.01h8.16v-.83H6.18l-.01-2.75-.02-.37.05-.34.11-.31.17-.28.25-.26.31-.23.38-.2.44-.18.51-.15.58-.12.64-.1.71-.06.77-.04.84-.02 1.27.05zm-6.3 1.98l-.23.33-.08.41.08.41.23.34.33.22.41.09.41-.09.33-.22.23-.34.08-.41-.08-.41-.23-.33-.33-.22-.41-.09-.41.09zm13.09 3.95l.28.06.32.12.35.18.36.27.36.35.35.47.32.59.28.73.21.88.14 1.04.05 1.23-.06 1.23-.16 1.04-.24.86-.32.71-.36.57-.4.45-.42.33-.42.24-.4.16-.36.09-.32.05-.24.02-.16-.01h-8.22v.82h5.84l.01 2.76.02.36-.05.34-.11.31-.17.29-.25.25-.31.24-.38.2-.44.17-.51.15-.58.13-.64.09-.71.07-.77.04-.84.01-1.27-.04-1.07-.14-.9-.2-.73-.25-.59-.3-.45-.33-.34-.34-.25-.34-.16-.33-.1-.3-.04-.25-.02-.2.01-.13v-5.34l.05-.64.13-.54.21-.46.26-.38.3-.32.33-.24.35-.2.35-.14.33-.1.3-.06.26-.04.21-.02.13-.01h5.84l.69-.05.59-.14.5-.21.41-.28.33-.32.27-.35.2-.36.15-.36.1-.35.07-.32.04-.28.02-.21V6.07h2.09l.14.01zm-6.47 14.25l-.23.33-.08.41.08.41.23.33.33.23.41.08.41-.08.33-.23.23-.33.08-.41-.08-.41-.23-.33-.33-.23-.41-.08-.41.08z"],["PHP","M7.01 10.207h-.944l-.515 2.648h.838c.556 0 .97-.105 1.242-.314.272-.21.455-.559.55-1.049.092-.47.05-.802-.124-.995-.175-.193-.523-.29-1.047-.29zM12 5.688C5.373 5.688 0 8.514 0 12s5.373 6.313 12 6.313S24 15.486 24 12c0-3.486-5.373-6.312-12-6.312zm-3.26 7.451c-.261.25-.575.438-.917.551-.336.108-.765.164-1.285.164H5.357l-.327 1.681H3.652l1.23-6.326h2.65c.797 0 1.378.209 1.744.628.366.418.476 1.002.33 1.752a2.836 2.836 0 0 1-.305.847c-.143.255-.33.49-.561.703zm4.024.715l.543-2.799c.063-.318.039-.536-.068-.651-.107-.116-.336-.174-.687-.174H11.46l-.704 3.625H9.388l1.23-6.327h1.367l-.327 1.682h1.218c.767 0 1.295.134 1.586.401s.378.7.263 1.299l-.572 2.944h-1.389zm7.597-2.265a2.782 2.782 0 0 1-.305.847c-.143.255-.33.49-.561.703a2.44 2.44 0 0 1-.917.551c-.336.108-.765.164-1.286.164h-1.18l-.327 1.682h-1.378l1.23-6.326h2.649c.797 0 1.378.209 1.744.628.366.417.477 1.001.331 1.751zM17.766 10.207h-.943l-.516 2.648h.838c.557 0 .971-.105 1.242-.314.272-.21.455-.559.551-1.049.092-.47.049-.802-.125-.995s-.524-.29-1.047-.29z"],["Three.js","M.38 0a.268.268 0 0 0-.256.332l2.894 11.716a.268.268 0 0 0 .01.04l2.89 11.708a.268.268 0 0 0 .447.128L23.802 7.15a.268.268 0 0 0-.112-.45l-5.784-1.667a.268.268 0 0 0-.123-.035L6.38 1.715a.268.268 0 0 0-.144-.04L.456.01A.268.268 0 0 0 .38 0zm.374.654L5.71 2.08 1.99 5.664zM6.61 2.34l4.864 1.4-3.65 3.515zm-.522.12l1.217 4.926-4.877-1.4zm6.28 1.538l4.878 1.404-3.662 3.53zm-.52.13l1.208 4.9-4.853-1.392zm6.3 1.534l4.947 1.424-3.715 3.574zm-.524.12l1.215 4.926-4.876-1.398zm-15.432.696l4.964 1.424-3.726 3.586zM8.047 8.15l4.877 1.4-3.66 3.527zm-.518.137l1.236 5.017-4.963-1.432zm6.274 1.535l4.965 1.425-3.73 3.586zm-.52.127l1.235 5.012-4.958-1.43zm-9.63 2.438l4.873 1.406-3.656 3.523zm5.854 1.687l4.863 1.403-3.648 3.51zm-.54.04l1.214 4.927-4.875-1.4zm-3.896 4.02l5.037 1.442-3.782 3.638z"],["GSAP","M9.83,7.59C10.647,7.595 11.267,7.828 11.672,8.282C12.055,8.713 12.239,9.336 12.219,10.132L12.205,10.193C12.197,10.211 12.185,10.229 12.17,10.243C12.14,10.272 12.099,10.288 12.057,10.288L10.398,10.288C10.29,10.288 10.199,10.2 10.199,10.093C10.199,9.669 10.071,9.435 9.809,9.383L9.689,9.372C9.347,9.372 9.125,9.583 9.119,9.951C9.112,10.361 9.344,10.734 10.004,11.374C10.872,12.19 11.221,12.913 11.204,13.867C11.177,15.411 10.127,16.41 8.531,16.41C7.716,16.41 7.093,16.191 6.678,15.761C6.258,15.324 6.066,14.683 6.106,13.855C6.108,13.813 6.125,13.772 6.155,13.743C6.185,13.714 6.226,13.698 6.267,13.698L7.983,13.698C8.007,13.699 8.03,13.705 8.052,13.715C8.073,13.726 8.092,13.741 8.107,13.76C8.12,13.775 8.129,13.793 8.135,13.813C8.14,13.832 8.141,13.853 8.137,13.873C8.118,14.171 8.171,14.394 8.288,14.518C8.363,14.598 8.469,14.639 8.599,14.639C8.916,14.639 9.102,14.414 9.109,14.024C9.115,13.687 9.007,13.39 8.427,12.792C7.676,12.058 7.003,11.3 7.024,10.108C7.037,9.416 7.311,8.784 7.798,8.327C8.312,7.845 9.014,7.59 9.83,7.59ZM4.047,7.618C4.794,7.612 5.381,7.842 5.789,8.303C6.221,8.79 6.44,9.524 6.441,10.485C6.44,10.527 6.422,10.567 6.392,10.597C6.362,10.626 6.322,10.643 6.28,10.643L4.479,10.643C4.448,10.642 4.417,10.629 4.395,10.607C4.373,10.584 4.361,10.553 4.36,10.522C4.346,9.899 4.172,9.576 3.828,9.538L3.757,9.534C3.067,9.535 2.66,10.472 2.444,10.992C2.142,11.719 1.988,12.507 2.018,13.293C2.033,13.659 2.092,14.173 2.438,14.386C2.746,14.575 3.185,14.45 3.451,14.24C3.716,14.031 3.93,13.669 4.02,13.339C4.033,13.293 4.033,13.258 4.021,13.241C4.015,13.233 4.003,13.229 3.989,13.226L3.485,13.222C3.461,13.222 3.436,13.216 3.414,13.206C3.392,13.196 3.372,13.181 3.356,13.162C3.344,13.148 3.335,13.13 3.331,13.112C3.327,13.093 3.327,13.074 3.331,13.056L3.647,11.682C3.663,11.611 3.726,11.558 3.804,11.548L3.804,11.545L6.839,11.545C6.846,11.545 6.854,11.545 6.86,11.546C6.939,11.556 6.995,11.63 6.994,11.71L6.994,11.714L6.678,13.085C6.661,13.163 6.583,13.22 6.494,13.22L6.113,13.22C6.1,13.22 6.086,13.225 6.075,13.233C6.064,13.241 6.056,13.253 6.052,13.266C5.7,14.46 5.223,15.282 4.594,15.775C4.058,16.195 3.399,16.391 2.517,16.391C1.725,16.391 1.191,16.136 0.738,15.633C0.14,14.967 -0.107,13.879 0.043,12.566C0.313,10.103 1.589,7.618 4.047,7.618ZM21.016,7.75C23.026,7.75 24.03,8.662 23.999,10.461C23.962,12.569 22.678,14.119 20.745,14.477C20.47,14.527 20.191,14.547 19.912,14.545L18.978,14.541C18.963,14.541 18.948,14.547 18.937,14.558C18.926,14.568 18.92,14.583 18.92,14.598C18.92,14.608 18.922,14.618 18.928,14.627C18.933,14.636 18.941,14.643 18.95,14.648L19.744,15.062C19.809,15.096 19.835,15.153 19.82,15.226C19.815,15.249 19.618,16.139 19.613,16.159C19.596,16.237 19.533,16.282 19.442,16.282L17.739,16.282C17.715,16.282 17.69,16.277 17.668,16.267C17.646,16.257 17.626,16.241 17.61,16.223C17.598,16.208 17.589,16.191 17.585,16.173C17.58,16.155 17.581,16.135 17.585,16.116L19.481,7.875C19.5,7.789 19.581,7.751 19.653,7.751L21.016,7.75ZM17.273,7.762C17.292,7.77 17.31,7.781 17.324,7.795C17.338,7.81 17.351,7.828 17.358,7.847C17.366,7.866 17.369,7.886 17.369,7.906L17.358,16.119C17.361,16.138 17.36,16.158 17.355,16.177C17.35,16.196 17.34,16.213 17.328,16.228C17.313,16.245 17.295,16.259 17.274,16.268C17.254,16.277 17.232,16.282 17.21,16.281L15.397,16.281C15.377,16.282 15.356,16.277 15.337,16.27C15.318,16.262 15.3,16.25 15.286,16.236C15.272,16.221 15.26,16.204 15.253,16.185C15.245,16.166 15.241,16.146 15.241,16.125L15.28,15.328C15.282,15.241 15.28,15.217 15.229,15.211L15.161,15.209L13.447,15.209C13.323,15.209 13.314,15.22 13.27,15.334L12.914,16.191C12.882,16.252 12.818,16.281 12.722,16.281L10.927,16.281C10.818,16.281 10.74,16.173 10.781,16.072L14.499,7.873C14.524,7.824 14.562,7.75 14.648,7.75L17.214,7.75C17.234,7.75 17.254,7.754 17.273,7.762ZM15.5,9.985C15.492,9.953 15.466,9.956 15.445,9.998C15.43,10.028 15.416,10.06 15.405,10.091L14.121,13.274C14.114,13.294 14.109,13.31 14.105,13.322C14.104,13.328 14.103,13.335 14.104,13.341C14.105,13.347 14.108,13.353 14.111,13.358C14.115,13.363 14.12,13.367 14.126,13.37C14.131,13.373 14.137,13.376 14.143,13.376L15.215,13.39C15.334,13.38 15.34,13.374 15.352,13.253C15.354,13.21 15.506,10.022 15.5,9.985ZM20.112,9.582C20.097,9.582 20.083,9.588 20.072,9.599C20.061,9.609 20.055,9.624 20.054,9.639C20.054,9.649 20.057,9.659 20.062,9.668C20.068,9.677 20.075,9.685 20.084,9.69C20.097,9.697 20.869,10.104 20.926,10.135C20.968,10.158 20.969,10.198 20.955,10.267C20.948,10.298 20.415,12.642 20.416,12.644C20.419,12.647 20.435,12.655 20.515,12.655L20.551,12.655C21.446,12.619 21.934,11.561 21.952,10.534C21.961,9.979 21.772,9.638 21.429,9.588L21.358,9.582L20.112,9.582Z"],["Blender","M12.51 13.214c.046-.8.438-1.506 1.03-2.006a3.424 3.424 0 0 1 2.212-.79c.85 0 1.631.3 2.211.79.592.5.983 1.206 1.028 2.005.045.823-.285 1.586-.865 2.153a3.389 3.389 0 0 1-2.374.938 3.393 3.393 0 0 1-2.376-.938c-.58-.567-.91-1.33-.865-2.152M7.35 14.831c.006.314.106.922.256 1.398a7.372 7.372 0 0 0 1.593 2.757 8.227 8.227 0 0 0 2.787 2.001 8.947 8.947 0 0 0 3.66.76 8.964 8.964 0 0 0 3.657-.772 8.285 8.285 0 0 0 2.785-2.01 7.428 7.428 0 0 0 1.592-2.762 6.964 6.964 0 0 0 .25-3.074 7.123 7.123 0 0 0-1.016-2.779 7.764 7.764 0 0 0-1.852-2.043h.002L13.566 2.55l-.02-.015c-.492-.378-1.319-.376-1.86.002-.547.382-.609 1.015-.123 1.415l-.001.001 3.126 2.543-9.53.01h-.013c-.788.001-1.545.518-1.695 1.172-.154.665.38 1.217 1.2 1.22V8.9l4.83-.01-8.62 6.617-.034.025c-.813.622-1.075 1.658-.563 2.313.52.667 1.625.668 2.447.004L7.414 14s-.069.52-.063.831zm12.09 1.741c-.97.988-2.326 1.548-3.795 1.55-1.47.004-2.827-.552-3.797-1.538a4.51 4.51 0 0 1-1.036-1.622 4.282 4.282 0 0 1 .282-3.519 4.702 4.702 0 0 1 1.153-1.371c.942-.768 2.141-1.183 3.396-1.185 1.256-.002 2.455.41 3.398 1.175.48.391.87.854 1.152 1.367a4.28 4.28 0 0 1 .522 1.706 4.236 4.236 0 0 1-.239 1.811 4.54 4.54 0 0 1-1.035 1.626"],["Remotion",""],["Stitch",""],["Higgsfield",""],["Canva",""],["Meta Ads","M6.915 4.03c-1.968 0-3.683 1.28-4.871 3.113C.704 9.208 0 11.883 0 14.449c0 .706.07 1.369.21 1.973a6.624 6.624 0 0 0 .265.86 5.297 5.297 0 0 0 .371.761c.696 1.159 1.818 1.927 3.593 1.927 1.497 0 2.633-.671 3.965-2.444.76-1.012 1.144-1.626 2.663-4.32l.756-1.339.186-.325c.061.1.121.196.183.3l2.152 3.595c.724 1.21 1.665 2.556 2.47 3.314 1.046.987 1.992 1.22 3.06 1.22 1.075 0 1.876-.355 2.455-.843a3.743 3.743 0 0 0 .81-.973c.542-.939.861-2.127.861-3.745 0-2.72-.681-5.357-2.084-7.45-1.282-1.912-2.957-2.93-4.716-2.93-1.047 0-2.088.467-3.053 1.308-.652.57-1.257 1.29-1.82 2.05-.69-.875-1.335-1.547-1.958-2.056-1.182-.966-2.315-1.303-3.454-1.303zm10.16 2.053c1.147 0 2.188.758 2.992 1.999 1.132 1.748 1.647 4.195 1.647 6.4 0 1.548-.368 2.9-1.839 2.9-.58 0-1.027-.23-1.664-1.004-.496-.601-1.343-1.878-2.832-4.358l-.617-1.028a44.908 44.908 0 0 0-1.255-1.98c.07-.109.141-.224.211-.327 1.12-1.667 2.118-2.602 3.358-2.602zm-10.201.553c1.265 0 2.058.791 2.675 1.446.307.327.737.871 1.234 1.579l-1.02 1.566c-.757 1.163-1.882 3.017-2.837 4.338-1.191 1.649-1.81 1.817-2.486 1.817-.524 0-1.038-.237-1.383-.794-.263-.426-.464-1.13-.464-2.046 0-2.221.63-4.535 1.66-6.088.454-.687.964-1.226 1.533-1.533a2.264 2.264 0 0 1 1.088-.285z"],["WhatsApp Business","M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"],["Telegram","M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"],["Stripe","M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-6.99-2.109l-.9 5.555C5.175 22.99 8.385 24 11.714 24c2.641 0 4.843-.624 6.328-1.813 1.664-1.305 2.525-3.236 2.525-5.732 0-4.128-2.524-5.851-6.594-7.305h.003z"],["Google Sheets","M11.318 12.545H7.91v-1.909h3.41v1.91zM14.728 0v6h6l-6-6zm1.363 10.636h-3.41v1.91h3.41v-1.91zm0 3.273h-3.41v1.91h3.41v-1.91zM20.727 6.5v15.864c0 .904-.732 1.636-1.636 1.636H4.909a1.636 1.636 0 0 1-1.636-1.636V1.636C3.273.732 4.005 0 4.909 0h9.318v6.5h6.5zm-3.273 2.773H6.545v7.909h10.91v-7.91zm-6.136 4.636H7.91v1.91h3.41v-1.91z"],["GoHighLevel",""],["Hostinger","M16.415 0v7.16l5.785 3.384V2.949L16.415 0ZM1.8 0v11.237h18.815L14.89 8.09l-7.457-.003V3.024L1.8 0Zm14.615 20.894v-5.019l-7.514-.005c.007.033-5.82-3.197-5.82-3.197l19.119.091V24l-5.785-3.106ZM1.8 13.551v7.343l5.633 2.949v-6.988L1.8 13.551Z"]];
}
diagramVals() {
var self = this;
var st = this.state || {};
var t = Math.floor((st.t || 0) / 3);
var sel = st.sel || null;
var D = this.data();
var A = this.activeAt(t, D);
var on = A.on;
var pos = {}; var kindOf = {}; var nameOf = {};
var rowLabels = [];
D.rows.forEach(function (row, r) {
var y = 40 + r * 76; var list = row[1]; var n = list.length;
rowLabels.push({ label: row[0], top: (y / 7.6) + '%' });
list.forEach(function (nd, i) { pos[nd[0]] = { x: 130 + (i + 0.5) * (870 / n), y: y, r: r }; kindOf[nd[0]] = nd[2]; nameOf[nd[0]] = nd[1]; });
});
var edges = []; var k = 0;
D.rows.forEach(function (row, r) {
if (r === 0) return;
var prev = D.rows[r - 1][1];
row[1].forEach(function (nd) {
var id = nd[0]; var parents;
if (id === 'entrega') parents = ['aaas', 'erp', 'webs'];
else { var best = prev[0][0], bd = 1e9; prev.forEach(function (p) { var d = Math.abs(pos[p[0]].x - pos[id].x); if (d < bd) { bd = d; best = p[0]; } }); parents = [best]; }
parents.forEach(function (pid) {
var a = pos[pid], b = pos[id];
var dx = b.x - a.x, dy = b.y - a.y; var len = Math.sqrt(dx * dx + dy * dy);
var live = !!(on[id] && on[pid]);
edges.push({ left: (a.x / 10) + '%', top: (a.y / 7.6) + '%', width: (len / 10) + '%', angle: (Math.atan2(dy, dx) * 180 / Math.PI).toFixed(2), line: live ? 'rgba(200,240,74,.45)' : 'rgba(110,115,145,.28)', dot: live ? '#C8F04A' : 'rgba(169,173,194,.45)', delay: ((k * 0.37) % 2.4).toFixed(2) + 's' });
k++;
});
});
});
var nodes = [];
D.rows.forEach(function (row) {
var n = row[1].length;
row[1].forEach(function (nd) {
var id = nd[0], kind = nd[2], act = !!on[id], isSel = sel === id;
var bg = '#14152A', border = '#2A2D47', fg = '#A9ADC2', shadow = 'none';
if (kind === 'x') { bg = act ? '#2E3BEB' : '#1E2350'; border = act ? '#8C95FF' : '#2E3BEB'; fg = '#F2F3F7'; }
else if (kind === 'h') { border = '#F2F3F7'; fg = '#F2F3F7'; }
else if (kind === 'c') { bg = '#1F2340'; border = '#C8F04A'; fg = '#F2F3F7'; shadow = '0 0 0 4px rgba(200,240,74,.12)'; }
else if (act) { bg = '#1F2340'; border = '#C8F04A'; fg = '#F2F3F7'; shadow = '0 0 16px rgba(200,240,74,.18)'; }
if (isSel) shadow = '0 0 0 2px #F2F3F7';
nodes.push({
name: nd[1], left: (pos[id].x / 10) + '%', top: (pos[id].y / 7.6) + '%', width: (n >= 6 ? 13 : 14.5) + '%',
bg: bg, border: border, fg: fg, shadow: shadow, active: act && kind !== 'h' && kind !== 'x',
hasImg: false, img: '', isMark: kind === 'x' || kind === 'c', isHuman: kind === 'h', isDot: kind !== 'x' && kind !== 'h' && kind !== 'c',
dotColor: act ? '#C8F04A' : '#4A4E66', pressed: isSel ? 'true' : 'false',
pick: function () { self.setState({ sel: id }); }
});
});
});
var log = [];
for (var q = t; q > t - 6 && q >= 0; q--) {
var Aq = q === t ? A : this.activeAt(q, D);
var who = Aq.order[0];
var mins = 9 * 60 + q * 2 + (q % 3);
var hh = Math.floor(mins / 60) % 24, mm = mins % 60;
var time = (hh < 10 ? '0' : '') + hh + ':' + (mm < 10 ? '0' : '') + mm;
if (q % 3 === 2) log.push({ time: time, who: 'Revisión previa', what: nameOf[Aq.order[1]].toLowerCase() + ' + ' + nameOf[Aq.order[2]].toLowerCase() + ' sobre un plan', op: String(1 - (t - q) * 0.13) });
else log.push({ time: time, who: nameOf[who], what: D.work[who], op: String(1 - (t - q) * 0.13) });
}
var layer = function (label, ids) { var c = ids.filter(function (i) { return on[i]; }).length; return { label: label, v: c + '/' + ids.length, w: Math.round(c / ids.length * 100) + '%', title: label + ': ' + c + ' de ' + ids.length + ' resaltados' }; };
var layers = [
layer('Revisión', ['seguridad', 'legal', 'administracion', 'organizacion']),
layer('Construir', ['frontend', 'backend', 'bots', 'pilotos']),
layer('Crear', ['diseno', 'arquitectura', 'modelado', 'videojuegos', 'marketing', 'comunicacion']),
layer('Puertas', ['calidad', 'revisor', 'consulta'])
];
var activeCount = D.depts.filter(function (i) { return on[i]; }).length;
var coordCount = ['revprev', 'explore', 'plan', 'encargo', 'consulta'].filter(function (i) { return on[i]; }).length;
var infoKind = 'CÓMO SE LEE', infoName = 'Pulsa un nodo', infoDesc = 'Cada fila es una fase del proyecto, del encargo a la entrega. Datos de ejemplo, no actividad real.', infoStatus = '';
if (sel) {
var sk = kindOf[sel];
infoKind = D.kinds[sk]; infoName = nameOf[sel]; infoDesc = D.desc[sel] || '';
infoStatus = sk === 'h' ? 'Siempre: decide una persona' : sk === 'c' ? 'Siempre activo · repartiendo' : on[sel] ? (XD.t.highlighted + (D.work[sel] ? ' · ' + D.work[sel] : '')) : 'En espera en esta ilustración';
}
return {
rowLabels: rowLabels, edges: edges, nodes: nodes, log: log, layers: layers,
activeCount: activeCount, coordCount: coordCount,
infoKind: infoKind, infoName: infoName, infoDesc: infoDesc, infoStatus: infoStatus,
lead: XD.t.lead.replace('{A}', activeCount).replace('{N}', XD.n)
};
}
renderVals() {
var t = (this.state && this.state.t) || 0;
var pops = [];
for (var k = 0; k < 4; k++) {
var tk = t - (((t - k) % 4) + 4) % 4;
if (tk < 0) tk += 4;
var e = this.event(tk + 11);
var age = t - tk;
var alt = Math.floor(tk / 4) % 2 ? 'A' : 'B';
e.op = String([1, 0.8, 0.5, 0.25][Math.max(0, Math.min(3, age))]);
e.dot = 'dot' + alt; e.line = 'line' + alt; e.tag = 'tag' + alt;
pops.push(e);
}
var briefs = [
{ q: 'Una web de reservas con asistente de WhatsApp', steps: [['CEO de IA', 'parte el encargo en 5 subtareas', 'CEO'], ['Revisión previa', 'opinan seguridad y backend', 'SUBAGENTES'], ['Diseño', 'bocetando la maqueta', 'CRECER'], ['Frontend', 'montando las páginas', 'CONSTRUIR'], ['Bots', 'afinando el asistente de WhatsApp', 'CONSTRUIR'], ['Revisor de código', 'sello aprobado', 'CONSTRUIR'], ['Calidad', 'probando lo publicado', 'CONTROL'], ['Javier', 'dio el visto bueno', 'PERSONA'], ['Entregado', 'a Webs', 'ENTREGADO']] },
{ q: 'Un CRM de contactos que lee solo los formularios de Meta', steps: [['CEO de IA', 'parte el encargo en 4 subtareas', 'CEO'], ['Exploración', 'leyendo el embudo actual', 'SUBAGENTES'], ['Backend', 'conectando los formularios de Meta', 'CONSTRUIR'], ['Diseño', 'revisando el tablero', 'CRECER'], ['Seguridad', 'revisando el acceso a los datos', 'CONTROL'], ['Calidad', 'probando lo publicado', 'CONTROL'], ['Andrea', 'aprobó la interfaz', 'PERSONA'], ['Entregado', 'al ERP', 'ENTREGADO']] },
{ q: 'Facturas que salen de cada hito del contrato', steps: [['CEO de IA', 'parte el encargo en 4 subtareas', 'CEO'], ['Plan', 'escribiendo el plan de trabajo', 'SUBAGENTES'], ['Backend', 'enlazando facturas e hitos', 'CONSTRUIR'], ['Legal', 'revisando el texto de la factura', 'CONTROL'], ['Planes trampa', 'Calidad escondió un fallo y se cazó', 'CONTROL'], ['Javier', 'dio el visto bueno', 'PERSONA'], ['Entregado', 'al ERP', 'ENTREGADO']] }
];
var seq = [];
briefs.forEach(function (b, bi) { seq.push({ bi: bi, s: 0, hold: false }); for (var j = 1; j <= b.steps.length; j++) seq.push({ bi: bi, s: j, hold: false }); seq.push({ bi: bi, s: b.steps.length, hold: true }); });
var step = Math.floor(t / 2);
var cur = seq[step % seq.length];
var b = briefs[cur.bi], s = cur.s, N = b.steps.length;
var TAG = { CEO: ['#C8F04A', '#0B0C1E'], SUBAGENTS: ['#2A3315', '#C8F04A'], BUILD: ['#1E2350', '#8C95FF'], GROW: ['#2A3315', '#C8F04A'], CONTROL: ['#23253D', '#F2F3F7'], PERSON: ['#F2F3F7', '#0B0C1E'], SHIPPED: ['#C8F04A', '#0B0C1E'] };
var shown = b.steps.slice(0, s);
var start = Math.max(0, shown.length - 3);
var rows = shown.slice(start).map(function (st, i) {
var idx = start + i, isCur = idx === s - 1 && !cur.hold;
return { who: st[0], what: st[1], tag: st[2], tagBg: TAG[st[2]][0], tagFg: TAG[st[2]][1], current: isCur, done: !isCur, op: String(isCur ? 1 : 0.5 + 0.2 * i), anim: idx === s - 1 ? (s % 2 ? 'rowA' : 'rowB') : '' };
});
var tag = s > 0 && !cur.hold ? b.steps[s - 1][2] : '';
var pct = Math.round(s / N * 100);
var phase = Math.floor(t / 3);
var T = this.tools().map(function (x) { return { name: x[0], d: x[1], has: !!x[1] }; });
return Object.assign(this.diagramVals(), {
cells: this.cells, pops: pops, toolsA: T.slice(0, 11), toolsB: T.slice(11),
showConsole: this.props.showConsole ?? true,
brief: b.q, briefNo: cur.bi + 1, rows: rows, pct: pct, pctW: pct + '%',
pointFill: tag === 'CEO' || tag === 'SUBAGENTES' || tag === 'PERSONA' ? '#C8F04A' : '#F2F3F7',
active: [7, 9, 8, 11, 6, 10, 12, 9][phase % 8], coord: [2, 3, 1, 4, 2, 3][phase % 6],
numAnim: phase % 2 ? 'numA' : 'numB'
});
}
}
var raiz = document.getElementById('xroot');
if (raiz) window.XDC.monta(raiz, new Component({}));
})();
