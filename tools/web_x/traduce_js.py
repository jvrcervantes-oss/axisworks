"""traduce_js.py — genera las versiones en español de la lógica de las páginas del diseño «X marks the work».

assets/x/home.js y assets/x/aaas.js son la FUENTE (se editan a mano); sus textos visibles están en inglés como en
la mesa del owner. Este script sustituye esos literales entre comillas simples por su traducción y escribe
assets/x/home.es.js y assets/x/aaas.es.js. Las claves del mapa de colores de la ilustración (TAG: 'CEO', 'BUILD'…)
se sustituyen en todo el fichero a la vez, así la lógica sigue casando.

Uso:   python tools/web_x/traduce_js.py            (escribe los .es.js)
       python tools/web_x/traduce_js.py --check    (falla si un .es.js no es lo que se generaría; lo usa
                                                    tests/web_x.prueba.py)
Tras tocar home.js o aaas.js: regenerar y commitear los dos a la vez. Encargo 20261012_axisworks_web_nueva_brand_kit.
"""
import os, sys

RAIZ = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

HOME = {
 # registro y avisos de la X
 'building a page': 'montando una página', 'adjusting a database': 'ajustando datos', 'tuning an assistant': 'afinando un asistente',
 'running an agent': 'probando un agente', 'reviewing a plan': 'revisando un plan', 'verifying in production': 'probando lo publicado',
 'publishing a change': 'publicando un cambio', 'reviewing a design': 'revisando un diseño', 'preparing content': 'preparando contenido',
 'reviewing a text': 'revisando un texto', 'preparing a document': 'un documento', 'preparing an invoice': 'preparando una factura',
 'modelling a home in 3D': 'una casa en 3D', 'drafting a press note': 'nota de prensa', 'reviewing the structure': 'repasa la estructura',
 'working on the engine': 'trabajando en el motor', 'modelling a game asset': 'una pieza del juego', 'weighing in on a plan': 'opinando sobre un plan',
 'seal approved': 'sello aprobado',
 # nombres de nodos
 'Pilots': 'Pilotos', 'Security': 'Seguridad', 'Quality': 'Calidad', 'Design': 'Diseño', 'Docs': 'Documentación', 'Admin': 'Administración',
 'Architecture': 'Arquitectura', 'Comms': 'Comunicación', 'Organisation': 'Organización', 'Games': 'Videojuegos', 'Game 3D': 'Modelado 3D',
 'Pre-review': 'Revisión previa', 'Code reviewer': 'Revisor de código', 'Request': 'Encargo', 'AI CEO': 'CEO de IA', 'Exploration': 'Exploración',
 'Planning': 'Plan', 'Subtask': 'Subtarea', '3D Modeling': 'Modelado 3D', 'Deploy consult': 'Consulta de deploy', 'Oversight': 'Supervisión',
 'Verifier': 'Verificador', 'Trap plans': 'Planes trampa', 'Websites': 'Webs', 'Delivery': 'Entrega',
 # filas
 'INPUT': 'ENTRADA', 'DECIDE': 'DECIDE', 'SPAWNED': 'SUBAGENTES', 'REVIEW': 'REVISIÓN', 'BUILD': 'CONSTRUIR', 'CREATE': 'CREAR', 'GATES': 'PUERTAS',
 'PUBLISH · VERIFY': 'PUBLICAR · VERIFICAR', 'PRODUCTS': 'PRODUCTOS', 'OUTPUT': 'SALIDA',
 # tipos y panel de nodo
 'AI DEPARTMENT': 'DEPARTAMENTO DE IA', 'SUBAGENT': 'SUBAGENTE', 'STEP': 'PASO', 'GATE': 'PUERTA', 'HUMAN': 'PERSONA', 'PRODUCT': 'PRODUCTO',
 'HOW TO READ IT': 'CÓMO SE LEE', 'Click a node': 'Pulsa un nodo',
 'Each row is a stage of a project, from the request to the delivery. Sample data, not live activity.': 'Cada fila es una fase del proyecto, del encargo a la entrega. Datos de ejemplo, no actividad real.',
 'Always: a person decides': 'Siempre: decide una persona', 'Always on · dispatching': 'Siempre activo · repartiendo', 'Idle in this illustration': 'En espera en esta ilustración',
 ' on a plan': ' sobre un plan', 'Review': 'Revisión', 'Build': 'Construir', 'Create': 'Crear', 'Gates': 'Puertas', ' of ': ' de ', ' highlighted': ' resaltados',
 # descripciones
 'What the visitor sees and touches: pages, mobile and accessibility.': 'Lo que el visitante ve y toca: páginas, móvil y accesibilidad.',
 'Databases, functions and integrations: what you do not see.': 'Bases de datos, funciones e integraciones: lo que no se ve.',
 'WhatsApp assistants that serve customers.': 'Asistentes de WhatsApp que atienden a los clientes.',
 'Autonomous agents that run a business within hard limits.': 'Agentes autónomos que llevan un negocio dentro de límites fijos.',
 'Checks that everything is secure before and after publishing.': 'Comprueba que todo es seguro antes y después de publicar.',
 'Contracts, legal texts and regulation.': 'Contratos, textos legales y normativa.',
 'The studio’s invoicing and tax.': 'La facturación y los impuestos del estudio.',
 'Looks after the studio’s structure and retires what is not needed.': 'Cuida la estructura del estudio y retira lo que sobra.',
 'Art direction, identity and graphic pieces.': 'Dirección de arte, identidad y piezas gráficas.',
 '3D homes and plot maps from plans and photos.': 'Viviendas en 3D y planos de parcelas a partir de planos y fotos.',
 'Characters, props and environments for games.': 'Personajes, objetos y escenarios para juegos.',
 'The studio’s own engine and game.': 'El motor y el juego propios del estudio.',
 'Ads, SEO and lead generation.': 'Anuncios, SEO y captación de contactos.',
 'Press releases and media relations.': 'Notas de prensa y relación con medios.',
 'Checks in production that what was promised really works. Can block a delivery.': 'Comprueba en la web publicada que lo prometido funciona. Puede frenar una entrega.',
 'Takes work to production and keeps services running.': 'Publica el trabajo y mantiene los servicios en marcha.',
 'Proposals, reports and deliverables in PDF.': 'Propuestas, informes y entregables en PDF.',
 'AxisWorks’ management product to run a business: bookings, contracts, invoices and operations. Demo available.': 'El producto de gestión de AxisWorks para llevar un negocio: reservas, contratos, facturas y operaciones. Con demo.',
 'Agents that run a business within hard limits (Pilots and Bots).': 'Agentes que llevan un negocio dentro de límites fijos (Pilotos y Bots).',
 'Custom websites and landing pages for customers.': 'Webs y landings a medida para clientes.',
 'Subagents per department (1 to 3) that review the PLAN before building. Budget of 5 per session.': 'Subagentes por departamento (de 1 a 3) que revisan el PLAN antes de construir. Cinco por sesión como máximo.',
 'Read-only subagent that sweeps many files and returns only the conclusion.': 'Subagente de solo lectura que recorre muchos ficheros y devuelve solo la conclusión.',
 'Subagent that designs the implementation plan and its alternatives.': 'Subagente que diseña el plan de trabajo y sus alternativas.',
 'One subagent per subtask, with minimal context, verified against its acceptance criteria.': 'Un subagente por subtarea, con el contexto justo, comprobado contra su criterio de aceptación.',
 'If the reviewer asks, one subagent per department reviews the same diff before publishing.': 'Si el revisor lo pide, un subagente por departamento revisa el mismo cambio antes de publicar.',
 'Checks in production that what was published does what is expected, with proof.': 'Comprueba en la web publicada que lo publicado hace lo esperado, con pruebas.',
 'Quality hides a flaw in a plan to measure whether a department catches it.': 'Calidad esconde un fallo en un plan para medir si el departamento lo caza.',
 'What the customer asks for, in their own words.': 'Lo que pide el cliente, con sus palabras.',
 'Splits each request into tasks and assigns them to departments.': 'Parte cada encargo en tareas y las reparte entre los departamentos.',
 'Reviews code with a clean context before publishing; nothing ships without its seal.': 'Revisa el código sin contexto previo antes de publicar; nada sale sin su sello.',
 'Price, publish, delete or spend: a person decides.': 'Precio, publicar, borrar o gastar: decide una persona.',
 'The project reaches the customer. Marking it as delivered is a person’s decision.': 'El proyecto llega al cliente. Darlo por entregado lo decide una persona.',
 # proyectos de ejemplo
 'A booking site with a WhatsApp assistant': 'Una web de reservas con asistente de WhatsApp',
 'split the brief into 5 subtasks': 'parte el encargo en 5 subtareas', 'split the brief into 4 subtasks': 'parte el encargo en 4 subtareas',
 'security and backend weigh in': 'opinan seguridad y backend', 'drafting the layout': 'bocetando la maqueta', 'building the pages': 'montando las páginas',
 'tuning the WhatsApp assistant': 'afinando el asistente de WhatsApp', 'signed off': 'dio el visto bueno', 'to Websites': 'a Webs',
 'A lead CRM that reads Meta lead forms on its own': 'Un CRM de contactos que lee solo los formularios de Meta',
 'reading the existing pipeline': 'leyendo el embudo actual', 'connecting the Meta lead forms': 'conectando los formularios de Meta',
 'reviewing the board': 'revisando el tablero', 'reviewing data access': 'revisando el acceso a los datos', 'approved the interface': 'aprobó la interfaz',
 'to the ERP': 'al ERP', 'Invoices generated from each contract milestone': 'Facturas que salen de cada hito del contrato',
 'drafting the implementation plan': 'escribiendo el plan de trabajo', 'linking invoices to milestones': 'enlazando facturas e hitos',
 'reviewing the invoice text': 'revisando el texto de la factura', 'Quality hid a flaw; it was caught': 'Calidad escondió un fallo y se cazó',
 'Shipped': 'Entregado', 'SUBAGENTS': 'SUBAGENTES', 'GROW': 'CRECER', 'PERSON': 'PERSONA', 'SHIPPED': 'ENTREGADO',
}

AAAS = {
 'Captain': 'Capitán', 'Reception': 'Recepción', 'Radar': 'Radar', 'Figures': 'Cifras', 'Hook': 'Gancho', 'Quill': 'Pluma',
 'Listener': 'Oído', 'Route': 'Ruta', 'Treasurer': 'Tesorero',
 'Price': 'Precio', 'PRICE': 'PRECIO', 'Publishing': 'Publicar', 'PUBLISHING': 'PUBLICAR', 'Deleting': 'Borrar', 'DELETING': 'BORRAR',
 'Spending': 'Gastar', 'SPENDING': 'GASTAR', 'Sending to a third party': 'Enviar a un tercero', 'SENDING TO A THIRD PARTY': 'ENVIAR A UN TERCERO',
 'RESERVED FOR A PERSON': 'RESERVADA A UNA PERSONA', 'WAITS FOR A PERSON': 'ESPERA A UNA PERSONA',
 ' TRIED · WAITS FOR A PERSON': ' LO INTENTÓ · ESPERA A UNA PERSONA',
 'The owner writes the brief': 'El dueño escribe el encargo',
 'Mission, context, spending cap, permissions and which functions the agent may run. The agent can read this file and can never write it.':
   'Misión, contexto, tope de gasto, permisos y qué funciones puede usar el agente. El agente puede leer este fichero y nunca escribirlo.',
 'The agent proposes bets': 'El agente propone apuestas',
 'Every decision carries a hypothesis, a measure, a deadline and a cost. It proposes changes to the ERP; it does not make them.':
   'Cada decisión lleva una hipótesis, una medida, un plazo y un coste. Propone cambios en el ERP; no los hace.',
 'A person approves what matters': 'Una persona aprueba lo importante',
 'What touches a hard stop waits for a person. Everything the agent does is recorded in the business’s ERP, and anything not recorded there counts as not done.':
   'Lo que toca una parada obligatoria espera a una persona. Todo lo que hace el agente queda en el ERP del negocio, y lo que no está ahí cuenta como no hecho.',
 'What works becomes routine': 'Lo que funciona se vuelve rutina',
 'A bet that works becomes code that runs by itself; one that does not is dropped and kept as a lesson. After 14 days without progress it changes strategy; after two failed cycles it escalates to the owner with options.':
   'Una apuesta que funciona se convierte en código que corre solo; la que no, se deja y se guarda como lección. Tras 14 días sin avance cambia de estrategia; tras dos ciclos fallidos sube al dueño con opciones.',
 'answered a customer on WhatsApp': 'contestó a un cliente por WhatsApp', 'checked spending against the monthly cap': 'comparó el gasto con el tope del mes',
 'checked today’s bookings against availability': 'cruzó las reservas de hoy con la disponibilidad', 'found new leads in the allowed channels': 'encontró contactos nuevos en los canales permitidos',
 'grouped this week’s complaints by topic': 'agrupó por tema las quejas de la semana', 'handed a conversation to a person': 'pasó una conversación a una persona',
 'measured last month’s bet': 'midió la apuesta del mes pasado', 'read this week’s competitor prices, read-only': 'leyó los precios de la competencia, solo lectura',
 'reported last week’s bookings': 'informó de las reservas de la semana pasada',
 'proposes a new ad campaign within this month’s cap': 'propone una campaña nueva dentro del tope del mes', 'proposes a weekday discount of 5%': 'propone un 5 % de descuento entre semana',
 'proposes deleting duplicate bookings': 'propone borrar reservas duplicadas', 'proposes publishing a new landing page': 'propone publicar una landing nueva',
 'proposes sending a guest list to a supplier': 'propone enviar una lista de invitados a un proveedor',
 'Approved by the owner. Logged in the ERP.': 'Aprobado por el dueño. Anotado en el ERP.', 'Rejected. Kept as a lesson for the next bet.': 'Rechazado. Se guarda como lección para la próxima apuesta.',
 'Waiting for the owner. The agent does not act on its own.': 'Esperando al dueño. El agente no actúa por su cuenta.',
}

def genera(nombre, M):
    s = open(os.path.join(RAIZ, 'assets', 'x', nombre + '.js'), encoding='utf-8').read()
    for en, tr in sorted(M.items(), key=lambda kv: -len(kv[0])):
        s = s.replace("'" + en.replace("'", "\\'") + "'", "'" + tr.replace("'", "\\'") + "'")
    return '/* GENERADO por tools/web_x/traduce_js.py desde ' + nombre + '.js: no se edita a mano. */\n' + s

def main():
    check = '--check' in sys.argv
    mal = 0
    for nombre, M in (('home', HOME), ('aaas', AAAS)):
        es = genera(nombre, M)
        f = os.path.join(RAIZ, 'assets', 'x', nombre + '.es.js')
        if check:
            actual = open(f, encoding='utf-8').read() if os.path.exists(f) else ''
            if actual != es:
                print('DESFASADO: ' + nombre + '.es.js no es lo que genera ' + nombre + '.js'); mal += 1
            else:
                print('ok ' + nombre + '.es.js')
        else:
            open(f, 'w', encoding='utf-8', newline='\n').write(es)
            print('escrito ' + nombre + '.es.js')
    sys.exit(1 if mal else 0)

if __name__ == '__main__':
    main()
