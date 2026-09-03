<?php
/* Hojas EN. El inglés va VERTICAL —promotoras y operadores en Indonesia—
 * porque ahí están nuestras cinco pruebas y la SERP está casi vacía, frente
 * a `custom software development`, que copan Clutch, DesignRush e Itransition
 * (SERP medida por Marketing el 2-sep-2026). Nada aquí es un placeholder:
 * cada cifra sale de un proyecto en producción. */

$HOJAS_EN = [

'custom-business-software' => [
  'lang'=>'en','url'=>'/services/custom-business-software','codigo'=>'B01','eje'=>'BUILD',
  'title'=>'Custom business software &amp; internal tool suites — AxisWorks',
  'desc'=>'Internal tools built around how your company already works: contracts, invoices, inventory, permissions and a client portal, all reading one source. Two-person studio, hand-coded.',
  'eyebrow'=>'SHEET B01 — BUILD',
  'h1'=>'Custom business software, built around how you already work',
  'lead'=>'Most companies do not need another platform to adapt to. They need the dozen things they do every day to stop living in spreadsheets, WhatsApp threads and one person&rsquo;s memory.',
  'spec'=>[
    'An internal suite is not a template with your logo on it. It is written in your vocabulary, prints your documents, and enforces your permissions — because those three things are exactly what off-the-shelf software makes you work around.',
    'We design against one failure in particular: <b>the same fact living in two places</b>. It is the most expensive bug we know, and it never looks like a bug. A price that lives in the contract and again in the operations screen will drift, and one day a villa is billed at double. That is not hypothetical — it is why every tool we build reads a single source for each fact, and why adding a tool never means copying a list.',
    'Client portals and third-party integrations are on this sheet rather than on their own, because in practice they are not separate products: the portal is the same data with a different door, and the integrations are what stop your team retyping it.',
  ],
  'scope'=>[
    ['Data model','One source per fact. Prices, dates and names are written once and read everywhere.'],
    ['Documents','Contracts, invoices and receipts generated as PDF from the record itself — not typed twice.'],
    ['Roles &amp; permissions','Per user and per tool. What someone cannot do, they cannot see.'],
    /* Los dos `id` son el destino de B05 y B06 de la leyenda del home. Sin
       ellos el enlace lleva al principio de la página en silencio, que es la
       media afordancia que Diseño vetó. El lado ES ya los tenía. */
    ['Client portal','<span id="portal"></span>A door for the people outside the company, on the same data, with its own rules.'],
    ['Integrations','<span id="integraciones"></span>Payments, calendars, spreadsheets, messaging — wherever the data already lives.'],
    ['Languages','The interface in as many languages as the team actually speaks.'],
    ['Handover','Source code, database and deployment. Written so the next developer can read it.'],
  ],
  'caso'=>[
    'img'=>'work-lawang.jpg','alt'=>'Lawang Estate — internal suite',
    'titulo'=>'Lawang Estate — a property developer in Bali',
    'texto'=>'Contracts with remote digital signature, invoices and receipts, construction progress, buyers, payment schedules, unit catalogue, documentation and a portal where each buyer sees their own contracts and payments. Eleven tools under one menu, one shared shell, one login. A person is registered in exactly one place; every other tool reads them from there.',
    'cifras'=>[['11','tools, one menu'],['2','interface languages'],['1','sign-up point per person']],
  ],
  'faq'=>[
    ['Is this an ERP?','Sometimes it replaces one, more often it sits beside one. An off-the-shelf ERP is good at what every company does the same way — accounting, payroll. It is bad at the part that makes you different, and that part is usually where the money and the mistakes are. We build that part.'],
    ['We already use spreadsheets and they work. Why change?','Spreadsheets work until two people edit them, until a number has to appear in a document, or until someone leaves. The signal is not that the spreadsheet is slow — it is that somebody is retyping.'],
    ['Can you build on top of what we already have?','Yes, and it is usually cheaper. If the data already lives in a system with an API, we read it rather than migrate it.'],
    ['How long does it take?','It depends entirely on scope, so we do not quote a number before understanding yours. Tell us what the team does today and we come back with scope and a price.'],
    ['Who can use it — only the office?','Whoever you give a role to. In the case above the developer&rsquo;s team, the construction side and the buyers all use the same system through different doors.'],
  ],
  'asunto'=>'Custom business software — /services/custom-business-software',
],

'custom-crm' => [
  'lang'=>'en','url'=>'/services/custom-crm','codigo'=>'B02','eje'=>'BUILD',
  'title'=>'Custom CRM development — AxisWorks',
  'desc'=>'A CRM shaped like your sales process, not a generic pipeline: leads from the channels you actually use, bookings, payments and follow-up. Built and deployed by a two-person studio.',
  'eyebrow'=>'SHEET B02 — BUILD',
  'h1'=>'Custom CRM development',
  'lead'=>'Generic CRMs make you describe your business in someone else&rsquo;s words. If your leads arrive by WhatsApp and your product is a booking, a stage called &ldquo;Opportunity&rdquo; is not helping anybody.',
  'spec'=>[
    'A custom CRM is worth building when the standard one is being fought rather than used — when the team keeps a private spreadsheet next to it, or when half the fields are empty because they do not apply.',
    'The thing that makes a CRM live or die is not the pipeline view. It is whether leads arrive in it <b>automatically</b>, from the channel they actually come through. A CRM that someone has to copy leads into is a spreadsheet with a slower interface.',
    'So we build the intake first — web form, WhatsApp, ad platform, phone — and the pipeline after. And we connect it to the money: what was quoted, what was paid, what is outstanding.',
  ],
  'scope'=>[
    ['Intake','Leads captured from the channels you already use, with their source attached.'],
    ['Pipeline','Stages named the way your team names them, not a generic funnel.'],
    ['Bookings / orders','The thing you actually sell, with its dates, its units and its price.'],
    ['Payments','Deposits and balances, linked to the record — and to the payment provider where one exists.'],
    ['Follow-up','Reminders that fire on the date the customer said, not when someone remembers.'],
    ['Team','Roles, assignment and a visible history of who did what.'],
    ['Reporting','The three numbers you actually steer by, not a dashboard nobody opens.'],
  ],
  'caso'=>[
    'img'=>'work-sumba.jpg','alt'=>'Bali Best Motorcycle — CRM and fleet',
    'titulo'=>'Bali Best Motorcycle — rental fleet and bookings',
    'texto'=>'A CRM for a motorbike rental operator: fleet and availability, bookings with airport delivery, payments through the local provider, and an editable team. Three interface languages, including Bahasa Indonesia, because the people using it every day are not the people who commissioned it.',
    'cifras'=>[['3','interface languages'],['2','live public sites fed by it'],['1','record per booking, end to end']],
  ],
  'faq'=>[
    ['Why not HubSpot or Pipedrive?','If a standard CRM fits, use it — it is cheaper than anything we would build. Come to us when it does not: when the object you sell is not a &ldquo;deal&rdquo;, when your leads arrive somewhere the CRM cannot read, or when the licence cost per seat has passed the cost of owning the thing.'],
    ['Can it read leads from WhatsApp?','Yes. That is the most common intake we build, and it is the one that usually justifies the project on its own.'],
    ['Does it handle payments?','It records them, and where there is a payment provider we connect it so the record updates itself instead of someone ticking a box.'],
    ['Can we migrate our existing data?','Usually. The honest answer depends on what shape it is in — a clean export is an afternoon, a decade of inconsistent spreadsheets is a project of its own.'],
    ['What does it cost?','Every project is quoted on its own scope. Tell us how leads reach you today and what happens to them next, and we come back with scope and a price.'],
  ],
  'asunto'=>'Custom CRM — /services/custom-crm',
],

'whatsapp-ai-chatbot' => [
  'lang'=>'en','url'=>'/services/whatsapp-ai-chatbot','codigo'=>'B03','eje'=>'BUILD',
  'title'=>'WhatsApp AI chatbot development for business — AxisWorks',
  'desc'=>'WhatsApp bots on the official Business API that answer in your voice, book into a real calendar, send payment links and hand over to a human. Built, deployed and monitored.',
  'eyebrow'=>'SHEET B03 — BUILD',
  'h1'=>'WhatsApp AI chatbot development for business',
  'lead'=>'A bot that answers instantly and perfectly is not the goal. A bot that books the appointment, sends the payment link and knows when to get out of the way — that is the goal.',
  'spec'=>[
    'We build on the official WhatsApp Business API, not on an unofficial bridge. That decision costs more at the start and is the reason the number does not get banned later.',
    'The bot is given the business, not a script: prices, availability, what is and is not offered. It answers in the customer&rsquo;s language, and it hands the conversation to a human the moment it should — a bot that improvises about money is a liability, so ours are built not to.',
    'Two things we learned the expensive way and now build in by default. <b>Latency is what gives a bot away</b>: an answer that lands in 400 milliseconds reads as a machine no matter how good the words are. And a bot must never be able to send a message containing an unfilled placeholder to a real customer — that is a rule enforced in code, not a note in a prompt.',
  ],
  'scope'=>[
    ['Channel','Official WhatsApp Business API, with the number and templates properly registered.'],
    ['Knowledge','Your prices, your availability, your rules — one source, updated without redeploying.'],
    ['Booking','Writes into a real calendar, not a form the team has to re-enter.'],
    ['Payments','Sends a live payment link and knows when it has been paid.'],
    ['Handover','A defined line the bot does not cross, and a clean pass to a human when it reaches it.'],
    ['Languages','Answers in the language it is written to, including the ones your team speaks.'],
    ['Visibility','Every conversation readable by you, with what the bot said and why.'],
  ],
  'caso'=>[
    'img'=>'work-balimoto.jpg','alt'=>'Bali Moto Adventures — WhatsApp bot',
    'titulo'=>'Bali Moto Adventures — live, on the official API',
    'texto'=>'A tour operator&rsquo;s bot: it answers about routes and prices, books appointments straight into Google Calendar, sends Stripe payment links, and schedules its own follow-up when a lead says &ldquo;let me think about it&rdquo;. It reaches the team through the same panel that holds the leads.',
    'cifras'=>[['24/7','answering, in production'],['1','safety net that blocks the send'],['1','human handover line, enforced in code']],
  ],
  'faq'=>[
    ['Will it get our number banned?','Not if it is built on the official Business API with registered templates, which is how we build them. Unofficial bridges are the ones that get numbers banned, and they are cheaper for exactly that reason.'],
    ['Can it use our existing WhatsApp number?','Usually yes, through the official migration or coexistence path. It is a process with Meta rather than a switch, and how long it takes is up to them, not us.'],
    ['What stops it inventing a price?','It reads prices from one source and it is not allowed to answer outside it. Where a question touches money it does not have, it hands over to a human.'],
    ['Can a human take over mid-conversation?','Yes, and that is the point. The bot is there to remove the repetitive 80%, not to stand between you and a customer who is ready to buy.'],
    ['Does it work in more than one language?','Yes. Ours run in English, Spanish and Bahasa Indonesia depending on the project.'],
  ],
  'asunto'=>'WhatsApp AI chatbot — /services/whatsapp-ai-chatbot',
],

'business-process-automation' => [
  'lang'=>'en','url'=>'/services/business-process-automation','codigo'=>'B04','eje'=>'BUILD',
  'title'=>'Business process automation and AI agents — AxisWorks',
  'desc'=>'Automations and autonomous watchers that check your business around the clock, alert you directly, and are allowed to stop things — never to spend. Running in production today.',
  'eyebrow'=>'SHEET B04 — BUILD',
  'h1'=>'Business process automation and AI agents',
  'lead'=>'The automation worth building is not the one that saves ten minutes. It is the one that notices, at three in the morning, that you have been spending for three days and getting nothing.',
  'spec'=>[
    'We build two things on this sheet. <b>Automations</b> remove a step a person repeats: a document that generates itself, a record that updates itself, a report that arrives without being asked for. <b>Watchers</b> are different — a process that lives inside something already running 24/7, checks the state of the business on an interval, and messages you directly when something is wrong.',
    'The rule that makes a watcher safe enough to trust is <b>asymmetric autonomy</b>, and it is enforced by the shape of the code rather than by an instruction. A watcher may pause, stop and protect on its own. It may never spend, never create, and never send a message to a real customer. That asymmetry is the whole design.',
    'We do not build a watcher for a problem nobody has felt yet. Both of the ones running today came out of an incident: one business spent three days on ads with zero leads before anyone noticed; another had a payment bug and a redesign that passed an automated QA while being wrong.',
  ],
  'scope'=>[
    ['What it watches','The specific thing that hurt last time — spend, silence, a queue, a number that should never move.'],
    ['Cadence','An interval that matches how fast the thing actually changes, not the fastest one possible.'],
    ['Alerting','A direct channel to one person. One bot per business, never a group.'],
    ['Permitted actions','Pause, stop, protect. Written into the code as what it *can* do, not as what it *should*.'],
    ['Forbidden by design','Spending, creating, and messaging your customers. Not configurable.'],
    ['State','Kept in the database, never on disk — a redeploy must not make it forget what it already did.'],
    ['Audit','Every action it takes is recorded, and every one is reversible by you.'],
  ],
  'caso'=>[
    'img'=>'work-lawang.jpg','alt'=>'Autonomous watchers in production',
    'titulo'=>'Two watchers, two businesses, both in production',
    'texto'=>'One checks ad spend and leads every four hours: it can pause a starving ad set and move daily budget inside a monthly ceiling the owner sets, and it cannot step outside that cage. The other reads live lead conversations every thirty minutes and pauses ads with no return. Both report to their owner on a private Telegram channel; neither can create a campaign or message a customer.',
    'cifras'=>[['4h / 30min','check intervals in production'],['0','actions that spend outside the ceiling'],['1:1','alert channel, never a group']],
  ],
  'faq'=>[
    ['Is this n8n or Zapier?','Those are good at joining two services that already have buttons for each other. We write the ones that need judgement, that must not break silently, and that have to keep state across a redeploy.'],
    ['Would it act without asking us?','Only in the direction of stopping something, and only inside limits you set. It cannot spend, create or contact anyone. That is a property of the code, not a setting.'],
    ['Where does it run?','Inside a service that is already running for your business around the clock. If there is not one yet, building that comes first — an automation that depends on somebody opening a laptop does not watch anything.'],
    ['What if it makes a mistake?','Every action is logged and reversible, and the alert reaches you before you would have noticed on your own. The failure mode of a watcher is a false alarm; the failure mode of not having one is three days of spend.'],
    ['Can it use AI to judge?','Where judgement is actually needed, yes — reading whether a conversation went wrong, for instance. The rest is deterministic code, because most of what a watcher checks does not need a model and is more reliable without one.'],
  ],
  'asunto'=>'Process automation &amp; AI agents — /services/business-process-automation',
],

'property-developer-software' => [
  'lang'=>'en','url'=>'/services/property-developer-software','codigo'=>'B05','eje'=>'BUILD',
  'title'=>'Software for property developers and villa operators in Indonesia — AxisWorks',
  'desc'=>'Contracts with remote signature, payment schedules, construction progress and a buyer portal — built for developers selling villas and land in Bali, Sumba and across Indonesia.',
  'eyebrow'=>'SHEET B05 — BUILD · VERTICAL',
  'h1'=>'Software for property developers and villa operators in Indonesia',
  'lead'=>'Selling land and villas in Indonesia is a documentary business. The contracts are the product, the payment schedule is the cash flow, and both of them usually live in a folder nobody trusts.',
  'spec'=>[
    'We built this by doing it, not by reading about it. A developer selling units in Bali runs on reservation letters, plot blocking agreements, construction contracts, Hak Sewa leases and powers of attorney — and each of those decides a different thing. Which document sets the land price is not the same one that records what the buyer has already paid, and getting that wrong bills a villa at double.',
    'Two structural facts most generic tools get wrong here. <b>Documents in more than one language are not translations of each other</b> — where the Bahasa version governs, the system has to know that. And <b>a buyer, an owner and two different attorneys-in-fact are four distinct roles</b>, not one &ldquo;client&rdquo; field.',
    'On top of that sits the ordinary work: what is sold, what is reserved, what is built, who has paid, and what each buyer can see of their own file.',
  ],
  'scope'=>[
    ['Contracts','Reservation, blocking, construction, lease — each one knowing what it does and does not set.'],
    ['Signature','Remote signing with a verifiable record, and copies to every signatory.'],
    ['Payment schedule','Contractual dates and the operational calendar kept apart on purpose, because they are not the same thing.'],
    ['Construction','Progress per unit, tied to the contract that pays for it.'],
    ['Buyers','One registration per person, read by every other tool.'],
    ['Buyer portal','Each buyer sees their own contracts, payments and documents — and nobody else&rsquo;s.'],
    ['Languages','Documents in English, Spanish and Bahasa Indonesia; interface in English and Spanish.'],
  ],
  'caso'=>[
    'img'=>'work-lawang.jpg','alt'=>'Lawang Estate — developer suite',
    'titulo'=>'Lawang Estate — Bali',
    'texto'=>'Eleven tools under one menu: contracts with remote digital signature, invoices and receipts, unit catalogue, construction, buyers, payment schedules, documentation and the buyer portal. Every price is read from the document that sets it, and a buyer exists in exactly one place. The public showcase and the internal suite share one database.',
    'cifras'=>[['11','tools, one login'],['2','interface languages'],['1','source per price']],
  ],
  'faq'=>[
    ['Do you work with developers outside Bali?','Yes. The projects that shaped this are in Bali and Sumba, and the model — documents, schedules, units, buyers — is the same wherever the units are.'],
    ['Can it handle Hak Sewa and powers of attorney?','Yes, including the part most systems miss: three leases on one plot are not duplicates, and the attorney for the landowner is a different role from the attorney for the buyer.'],
    ['Is remote signature valid?','The system produces a verifiable signing record and delivers copies to every signatory. Whether a given document needs a notary is a legal question for your notary, not a software one — we build to whatever that answer is.'],
    ['Can buyers see their own file?','That is what the portal is for: their contracts, their payments, their documents, and nothing belonging to anyone else.'],
    ['We already have a website. Does this replace it?','No. It usually sits behind it — the public site keeps selling, and the suite runs what happens after someone says yes.'],
  ],
  'asunto'=>'Property developer software — /services/property-developer-software',
],

'meta-ads' => [
  'lang'=>'en','url'=>'/services/meta-ads','codigo'=>'G01','eje'=>'GROW',
  'title'=>'Meta Ads funnels that bring qualified leads — AxisWorks',
  'desc'=>'Facebook and Instagram sales funnels: campaigns, creative and the plumbing behind them, so a lead arrives in your CRM with its source attached instead of dying in an inbox.',
  'eyebrow'=>'SHEET G01 — GROW',
  'h1'=>'Meta Ads funnels that bring qualified leads',
  'lead'=>'Most ad accounts are not underperforming because the targeting is wrong. They are underperforming because nobody can tell which ad produced the customer.',
  'spec'=>[
    'We run the whole line, not just the media buying: campaign structure, the creative that goes in it, and the plumbing that carries a lead from the ad to somewhere a human will actually answer it. Those three are the same job — creative that converts into a form nobody reads is not a win.',
    'Because we build the software too, we can close the loop most agencies leave open: the lead lands in the CRM with its campaign attached, so the report is about revenue rather than about clicks.',
    'And what runs is watched. An ad set that stops producing gets caught by the same kind of watcher described on <a href="/services/business-process-automation">sheet B04</a> — checked every few hours, paused if it is starving, inside a monthly ceiling you set. Nobody discovers a wasted week at the end of the month.',
  ],
  'scope'=>[
    ['Structure','Campaigns and ad sets built so results can be read, not so they look tidy.'],
    ['Creative','Made for the placement and the screen it will be seen on — most of it is watched at thumbnail size.'],
    ['Landing','Where the click goes, and whether it earns the enquiry.'],
    ['Tracking','Source attached to the lead, all the way through to the sale.'],
    ['Content &amp; social','<span id="social"></span>The organic side that makes the paid side cheaper: what the account posts, and in whose voice.'],
    ['Watching','Spend and leads checked on an interval, with the authority to pause and nothing else.'],
    ['Reporting','What it cost, what it produced, and what we are changing next.'],
  ],
  'caso'=>[
    'img'=>'work-balimoto.jpg','alt'=>'Meta Ads funnels in production',
    'titulo'=>'Two live ad accounts, two very different products',
    'texto'=>'One sells motorcycle tours to travellers, the other sells villas to investors — same discipline, opposite funnels. Both run creative made for mobile, both feed a CRM that knows where each lead came from, and both are watched by a process that can pause a starving ad set on its own but can never raise spend beyond the owner&rsquo;s monthly ceiling.',
    'cifras'=>[['2','live accounts in production'],['1','monthly ceiling, never exceeded'],['0','budget raised without the owner']],
  ],
  'faq'=>[
    ['Do you need access to our ad account?','Yes, as a partner on your Business Manager. You keep ownership of the account, the pixel and the audiences — always.'],
    ['Who pays the ad spend?','You do, directly to Meta. We never hold your ad budget.'],
    ['Do you make the creative too?','Yes. That is usually where the difference is: the same offer with creative built for a 1080px canvas seen at thumbnail size performs very differently from one designed on a desktop monitor.'],
    ['Can you connect the ads to our CRM?','Yes, and it is the part we would insist on. Without it there is no way to know which campaign produced a customer rather than a click.'],
    ['What is the minimum budget?','That depends on the market and the product, so we will not invent a number. Tell us what you sell and what you are spending now, and we will tell you honestly whether we can improve it.'],
  ],
  'asunto'=>'Meta Ads funnels — /services/meta-ads',
],

];
