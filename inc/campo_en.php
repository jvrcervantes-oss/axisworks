<?php
/* El CASO REAL de cada hoja EN — todo sale de Lawang Estate (owner, 24-sep-2026:
 * «básate en todo lo que hemos hecho para Lawang, hay más potencia ahí; quita las
 * fotos de los proyectos»). Es la ÚNICA fuente del bloque de caso: `hojas_en.php`
 * ya no lleva `caso`, se fusiona aquí (catalogo.php).
 *
 * Reglas del panel, las mismas que el panel del home:
 *   · SAMPLE DATA siempre. Referencias como CTR-118, estados y plazos — nunca un
 *     nombre, un importe ni una decisión de negocio del cliente.
 *   · Cada fila: celdas… y un último booleano = la última celda va en Signal.
 *   · No se afirma nada que no esté en producción: el bot de Lawang corre en modo
 *     pruebas (allowlist) y así se cuenta. */

$CAMPO_EN = [

'custom-business-software' => [
  'regla'=>'One source per fact. A price written in two places will drift, and one day a villa is billed at double.',
  'panel'=>['tool'=>'LAWANG SUITE // TODAY','th'=>['Ref','Item','Tool','Status','Due'],'rows'=>[
    ['CTR-118','Construction contract','Contracts','Awaiting 2nd signature','Today',true],
    ['INV-204','Invoice — land instalment','Invoices','Receipt missing','Overdue',true],
    ['BNK-332','Bank statement line','Banks','Unreconciled','2 days',false],
    ['COM-051','Sales commission','Commissions','Ready to approve','Fri',false],
    ['OBR-017','Build milestone','Construction','Photo uploaded','—',false],
  ]],
  'modulos'=>['Contracts','E-signature','Invoices','Receipts','Reservations','Buyers','Operations','Projects &amp; plots','Construction','Due dates','Accounts','Finance','Expenses','Banks','Commissions','Sales teams','Companies','Users &amp; roles','Documents','Communications','Support'],
  'flujo'=>[['Lead','Arrives in the CRM with its source.'],['Reservation','The plot is held, with a deadline.'],['Contract','Generated from the record, signed remotely.'],['Invoice','Issued from the contract, receipt attached.'],['Bank','The statement line is matched to the receipt.'],['Accounts','Every project knows what came in and what is owed.']],
  'caso'=>[
    'titulo'=>'Lawang Estate — thirty-two tools, one system',
    'texto'=>'A property developer runs sales, contracts, invoicing, construction, commissions and banking in one intranet. Thirty-two tools under one menu and one login, with roles per person: an agent sees their own buyers, a manager sees their team, finance sees the money. Every price is read from the document that sets it, and every buyer exists in exactly one place.',
    'cifras'=>[['32','tools under one menu'],['12','server functions'],['1','source per fact']],
  ],
],

'custom-crm' => [
  'regla'=>'A CRM that someone has to copy leads into is a spreadsheet with a slower interface.',
  'panel'=>['tool'=>'LEADS // PIPELINE','th'=>['Ref','Source','Stage','Owner','Next step'],'rows'=>[
    ['LED-417','Meta form — campaign B','New','Unassigned','Call today',true],
    ['LED-409','WhatsApp','Qualified','Agent 03','Send brochure',false],
    ['LED-388','Website','Viewing booked','Agent 01','Sat 10:00',false],
    ['LED-352','Referral','Reservation','Agent 03','Deposit due',true],
    ['LED-311','Meta form — campaign A','Lost','Agent 02','—',false],
  ]],
  'modulos'=>['Kanban with editable stages','Meta lead forms in automatically','Campaign traceability','Buyer shared between closers','WhatsApp from the record','Buyer directory','Reservations with expiry','Agent / manager roles'],
  'flujo'=>[['Ad form','The lead fills a Meta form.'],['CRM','It lands on the board with its campaign.'],['Agent','Assigned, contacted on WhatsApp from the record.'],['Reservation','The buyer holds a plot, with a deadline.'],['Contract','The record becomes a document.']],
  'caso'=>[
    'titulo'=>'Lawang Estate — leads that arrive on their own',
    'texto'=>'Leads from Meta lead forms drop into the developer&rsquo;s CRM by themselves, with the campaign attached, and the owner is told without personal data leaving the database. The stages of the board are edited by the owner rather than hard-coded, a buyer can be shared between two closers, and an agent writes to the lead on WhatsApp from the record itself.',
    'cifras'=>[['0','leads copied by hand'],['4h','sync from Meta'],['1','record per buyer']],
  ],
],

'whatsapp-ai-chatbot' => [
  'regla'=>'A bot that improvises about money is a liability. Ours hand over the moment money is unclear.',
  'panel'=>['tool'=>'SETTER // CONVERSATIONS','th'=>['Ref','Lang','Intent','Bot','Handover'],'rows'=>[
    ['WA-2231','EN','Price of a plot','Answered from source','—',false],
    ['WA-2228','ES','Visit the site','Slot offered','—',false],
    ['WA-2219','EN','Payment terms','Out of scope','To agent',true],
    ['WA-2204','ID','Build time','Answered from source','—',false],
    ['WA-2197','EN','Ready to reserve','Qualified','To agent',true],
  ]],
  'modulos'=>['Official Business API','Setter inside the CRM','Agent support bot','Answers from one source','What it may not say, set by Legal','Allowlist rollout','Brake enforced on the server'],
  'flujo'=>[['Message','A lead writes on WhatsApp.'],['Source','The bot reads prices and rules from one place.'],['Qualify','It asks what an agent would ask.'],['Handover','Passes to a person with the context attached.'],['Close','The agent picks up where the bot stopped.']],
  'caso'=>[
    'titulo'=>'Lawang Estate — a setter and an agent assistant, released safely',
    'texto'=>'The developer&rsquo;s CRM has an AI setter in a two-panel, WhatsApp-style chat, and a second bot answers the sales team&rsquo;s own questions from a source Legal has reviewed. Both run on the number that already receives real leads, in testing mode: until the owner opens it, the bot only answers the numbers on an allowlist. That is how a bot is released without a new number or a new app.',
    'cifras'=>[['2','bots: buyers and agents'],['1','allowlist before going live'],['0','prices it may invent']],
  ],
],

'business-process-automation' => [
  'regla'=>'A watcher may pause, stop and protect on its own. It may never spend, create or message a customer.',
  'panel'=>['tool'=>'WATCHERS // LAST RUN','th'=>['Rule','Check','Result','Action','Next'],'rows'=>[
    ['R3','Ad sets spending, no leads','1 starving','Paused','4h',true],
    ['R7','Daily budget vs ceiling','Inside ceiling','None','4h',false],
    ['R13','Meta forms → CRM','6 new leads','Synced','4h',false],
    ['RSV','Reservations past deadline','2 expired','Plot released','Daily',true],
    ['REQ','Change requests','1 pending','Yes/No sent to owner','—',false],
  ]],
  'modulos'=>['Ad watcher, 13 rules','Budget cage inside a monthly ceiling','Lead sync to the CRM','Expired reservations released','Invoice due reminders','Change requests approved on Telegram','Data health checks'],
  'flujo'=>[['Interval','Wakes up on its own schedule.'],['Check','Reads the state against a written rule.'],['Act','Only inside the cage: pause, release, protect.'],['Tell','A direct message to the owner.'],['Log','Every action recorded and reversible.']],
  'caso'=>[
    'titulo'=>'Lawang Estate — thirteen rules watching the money',
    'texto'=>'A watcher checks the developer&rsquo;s ad account every four hours against thirteen written rules: it pauses an ad set that spends without leads, moves daily budget inside the owner&rsquo;s monthly ceiling and pulls new form leads into the CRM. Other processes release reservations whose deadline has passed, remind before an invoice falls due, and turn a request to change a buyer&rsquo;s record into a yes or no on the owner&rsquo;s Telegram — the database carries out the answer.',
    'cifras'=>[['13','written rules'],['4h','check interval'],['0','spend outside the ceiling']],
  ],
],

'client-portals' => [
  'regla'=>'Access is a rule, not a favour: a record plus a contract opens the door.',
  'panel'=>['tool'=>'BUYER PORTAL // MY FILE','th'=>['Doc','Type','Status','Payment','Due'],'rows'=>[
    ['CTR-118','Plot blocking agreement','Signed','Paid','—',false],
    ['CTR-121','Construction contract','Signed','Milestone 2 of 5','15 days',false],
    ['INV-204','Invoice','Issued','Receipt pending','Overdue',true],
    ['RCB-090','Receipt','Available','—','—',false],
    ['DOC-033','Build progress report','New','—','—',false],
  ]],
  'modulos'=>['Self-service access','Row-level isolation','Contracts and signed copies','Payment schedule','Receipts','Build progress','Language per buyer'],
  'flujo'=>[['Sign','The buyer signs a contract.'],['Rule','Record plus contract means access.'],['Log in','With their own email, no invitation.'],['Their file','Only their rows, enforced by the database.'],['Copies','Signed documents and receipts to download.']],
  'caso'=>[
    'titulo'=>'Lawang Estate — the buyer portal',
    'texto'=>'Each buyer of a villa or a plot opens their own file: contracts, signed copies, payment schedule and receipts, read live from the same database the office works on. Access is a rule checked at the door — a buyer record plus at least one contract — instead of an invitation someone has to remember to send. The database refuses to return anyone else&rsquo;s rows.',
    'cifras'=>[['1','database for office and buyers'],['0','invitations to send'],['1','file per buyer, only theirs']],
  ],
],

'integrations' => [
  'regla'=>'Every fact has one owner. Copying in both directions is how two systems end up disagreeing.',
  'panel'=>['tool'=>'INTEGRATIONS // RUNS','th'=>['Source','Destination','What','Last run','Status'],'rows'=>[
    ['Meta Lead Ads','CRM','New form leads','08:00','OK',false],
    ['GoHighLevel','CRM','Lead traceability','07:45','OK',false],
    ['Bank CSV','Banks','Statement lines','Yesterday','3 to match',true],
    ['Intranet','Website','Plot sizes','Live','OK',false],
    ['Telegram','Database','Owner approvals','—','1 waiting',true],
  ]],
  'modulos'=>['Meta Lead Ads','GoHighLevel','Bank statements, mapped per account','Duplicate fingerprint','Telegram approvals','E-signature','Email delivery','Website ← intranet','File storage'],
  'flujo'=>[['Source','Where the data is born.'],['Mapping','Its fields, translated once.'],['Owner','One system decides; the rest read.'],['Database','Stored once, with its origin.'],['Alarm','A failed run reaches a person.']],
  'caso'=>[
    'titulo'=>'Lawang Estate — nothing typed twice',
    'texto'=>'Meta lead forms and GoHighLevel feed the developer&rsquo;s CRM with their source attached. Bank statements come in as CSV, mapped per account, with a fingerprint that stops the same line being imported twice, and reconciliation happens only inside the database. The public website reads plot sizes live from the intranet, and approvals travel to the owner on Telegram.',
    'cifras'=>[['5','systems feeding one database'],['0','lines imported twice'],['1','owner per fact']],
  ],
],

'web-design-development' => [
  'regla'=>'The website and the intranet read the same database. A figure never lives in two places.',
  'panel'=>['tool'=>'LAWANGPROPERTIES.COM // PAGES','th'=>['Page','What it does','Reads from','Status'],'rows'=>[
    ['/','Cinematic home','Site CMS','Live',false],
    ['/thecollection','Villa and land marketplace','Site CMS','Live',false],
    ['/palmfield','Step-by-step plot calculator','Intranet','Live',false],
    ['/modelo','House models with a quote','Intranet','Live',false],
    ['/investor-deck','Investor deck, per project','Intranet','Live',false],
  ]],
  'modulos'=>['Cinematic home','Marketplace','Plot calculator','House configurator with quote','Investor deck','Editable CMS','EN / ES / ID from one source','Accessibility statement','Legal pages'],
  'flujo'=>[['Visit','In the visitor&rsquo;s language.'],['Explore','Marketplace, models, plots.'],['Configure','Calculator and quote, from live data.'],['Enquire','The page it came from travels with it.'],['CRM','A lead, not an email.']],
  'caso'=>[
    'titulo'=>'lawangproperties.com — a website that reads the intranet',
    'texto'=>'The developer&rsquo;s public site in English, Spanish and Bahasa Indonesia, one source per text. A marketplace of villas and land, a step-by-step plot calculator, a house configurator that produces a quote and an investor deck per project — the calculator and the configurator read from the same database the sales team uses.',
    'cifras'=>[['3','languages from one source'],['1','database for site and intranet'],['0','templates']],
  ],
],

'property-developer-software' => [
  'regla'=>'Each document decides one thing. The reservation letter records what was paid; it never sets the price.',
  'panel'=>['tool'=>'CONTRACTS // BY DOCUMENT','th'=>['Doc','Type','Sets','Status','Next'],'rows'=>[
    ['CTR-118','Reservation letter','What was paid','Signed','—',false],
    ['CTR-119','Plot blocking','Land price','Signed','—',false],
    ['CTR-121','Construction','Build price','1 of 2 signatures','Today',true],
    ['CTR-125','Hak Sewa lease','Term and parties','Draft','Notary',false],
    ['CTR-126','Power of attorney','Who signs','Registered','—',false],
  ]],
  'modulos'=>['Reservation letter','Plot blocking','Construction contract','Hak Sewa','Powers of attorney','Payment milestones','Plot map','Buyer portal','Documents in 3 languages'],
  'flujo'=>[['Reserve','A deposit holds the plot.'],['Block','The land price is fixed.'],['Build','The construction contract sets the works.'],['Milestones','Payments follow the build.'],['Hand over','Keys, documents, portal.']],
  'caso'=>[
    'titulo'=>'Lawang Estate — villas and land on two islands',
    'texto'=>'Thirty-two tools under one menu for a developer selling villas and land. Every contract type knows what it sets and what it does not; payment milestones follow the construction; a lease and the two attorneys-in-fact are distinct roles, not one &ldquo;client&rdquo; field. The public site and the internal suite share one database.',
    'cifras'=>[['32','tools, one login'],['3','document languages'],['1','source per price']],
  ],
],

'meta-ads' => [
  'regla'=>'The watcher can pause a starving ad set on its own. It can never raise spend above the owner&rsquo;s ceiling.',
  'panel'=>['tool'=>'META ADS // AD SETS, LAST 3 DAYS','th'=>['Ad set','Spend','Leads','Rule','Action'],'rows'=>[
    ['AS-07 · Expats','On pace','9','—','Keep',false],
    ['AS-04 · Investors','High','0','R3','Paused',true],
    ['AS-11 · Retargeting','Low','3','R7','Budget up, in cage',false],
    ['AS-02 · Lookalike','On pace','5','—','Keep',false],
  ]],
  'modulos'=>['Campaign structure','Explicit targeting on every ad set','Creative for mobile','Lead forms → CRM','13-rule watcher','Monthly ceiling','Reporting by lead, not click'],
  'flujo'=>[['Creative','Made for a phone.'],['Ad set','Explicit targeting, always.'],['Form','The lead answers in the ad.'],['CRM','Lands with its campaign.'],['Watcher','Every four hours, inside the ceiling.']],
  'caso'=>[
    'titulo'=>'Lawang Estate — ads watched every four hours',
    'texto'=>'Campaigns for a developer selling villas and land to buyers abroad. Every ad set carries explicit targeting, every lead lands in the CRM with its campaign attached, and a watcher checks spend and leads every four hours against thirteen written rules — it can pause, and move daily budget inside the owner&rsquo;s monthly ceiling, and nothing more.',
    'cifras'=>[['13','watcher rules'],['4h','check interval'],['0','budget raised above the ceiling']],
  ],
],

'seo-sem' => [
  'regla'=>'Nobody can promise a position. What can be promised is that nothing on your own site stands in the way.',
  'panel'=>['tool'=>'SEARCH // STRUCTURE','th'=>['Item','Where','Generated from','Status'],'rows'=>[
    ['sitemap.xml','Both sites','The page catalogue','Live',false],
    ['hreflang pairs','EN ↔ ES ↔ ID','The page map','Live',false],
    ['llms.txt','Both sites','The page catalogue','Live',false],
    ['Structured data','Every page','The page itself','Live',false],
    ['Search Console','axisworks.studio','—','Pending',true],
  ]],
  'modulos'=>['Technical audit','One page per intent','Language pairs','Structured data','Generated sitemap','llms.txt','IndexNow','Keyword research from real data','SEM tied to the CRM'],
  'flujo'=>[['Audit','What stops the site being read.'],['Structure','One address per intent and language.'],['Content','Written for the person searching.'],['Publish','Search engines told the same day.'],['Measure','Before judging anything.']],
  'caso'=>[
    'titulo'=>'lawangproperties.com, and this site',
    'texto'=>'The developer&rsquo;s site publishes in three languages with every page paired to its translations, a sitemap and an <code>llms.txt</code> generated by code rather than kept by hand, and an accessibility statement. axisworks.studio follows the same rules: one sheet per service, English and Spanish pairs, and new addresses submitted through IndexNow when they go live.',
    'cifras'=>[['3','languages paired on one site'],['2','sites on the same base'],['0','positions promised']],
  ],
],

'social-content' => [
  'regla'=>'Every account has one job. A piece goes to the account whose job it does.',
  'panel'=>['tool'=>'CREATIVES // LIBRARY','th'=>['Id','Format','Account','Status','Legal'],'rows'=>[
    ['CRV-061','Vertical video 9:16','Parent brand','Approved','Passed',false],
    ['CRV-058','Carousel 4:5','Project A','In review','Passed',false],
    ['CRV-055','Story 9:16','Project B','Draft','Vetoed phrase',true],
    ['CRV-049','Feed 1:1','Parent brand','Published','Passed',false],
  ]],
  'modulos'=>['One job per account','Reference research','Creative library','Generator from real project photos','Legal&rsquo;s vetoed phrases','Approval by role','Dossier from the database'],
  'flujo'=>[['Plan','What each account needs this month.'],['Generate','From the real project photos.'],['Legal','Vetoed phrases never print.'],['Approve','By whoever holds the role.'],['Publish','On the account whose job it does.']],
  'caso'=>[
    'titulo'=>'Lawang Estate — three accounts and a creative system',
    'texto'=>'A parent brand and two projects, each with its own account and its own job: trust, proof, desire. Behind them sits a creative library in the intranet — a generator that builds pieces from the real project photos, a list of phrases Legal has vetoed that the generator will not print, approval by role, and a dossier assembled from the database instead of copied into a slide.',
    'cifras'=>[['3','accounts, three jobs'],['32','sector references analysed'],['1','list of vetoed phrases']],
  ],
],

'management-brand-direction' => [
  'regla'=>'A decision that only lives in a meeting is gone the week after. Ours are written down with their reason and date.',
  'panel'=>['tool'=>'DECISIONS // LOG','th'=>['Date','Area','Decision','By','Status'],'rows'=>[
    ['W39','Sales','Who may edit a buyer record','Owner','Applied',false],
    ['W39','Brand','Palette for a new project','Owner','Applied',false],
    ['W38','Finance','How a commission is approved','Owner','Applied',false],
    ['W37','Operations','One registration point per person','Owner','Applied',false],
    ['—','Legal','Licence for a typeface','Owner','Waiting',true],
  ]],
  'modulos'=>['Brand identity','Voice','Organisation and roles','Sales teams','Priorities','Decision log','Pending book, with owner and age','Regular review'],
  'flujo'=>[['Listen','What the owner needs and what hurts.'],['Decide','With the data on the table.'],['Write','The decision, its reason, its date.'],['Build','The software enforces it.'],['Review','Against what we said we would do.']],
  'caso'=>[
    'titulo'=>'Lawang Estate — from brand to operations',
    'texto'=>'For the developer we built the brand system — identity, palette, voice — and the organisation the software enforces: who owns each process, which role sees what, how the sales teams are structured. Every owner decision is logged with its reason and date, and anything waiting on someone sits in a single book with an owner and an age.',
    'cifras'=>[['1','brand system: web, documents, accounts'],['32','tools organised under one menu'],['1','decision log, dated']],
  ],
],

];
