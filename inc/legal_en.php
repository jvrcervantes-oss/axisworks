<?php
/* Legal pages EN (legal notice, privacy, cookies). Written by Legal on
 * 24-sep-2026 against what the site actually does: no cookies, no analytics,
 * no pixels, no browser storage, self-hosted fonts, one contact form that goes
 * by email and is not stored in a database. If any of that changes (analytics,
 * embeds, a CRM behind the form), these texts change in the same commit.
 * 12-oct-2026: scope widened to erp.axisworks.studio and demo.axisworks.studio,
 * checked against the live domains that day (curl + their scripts): no cookies
 * on either; erp. stores nothing (it only deletes leftover sb-* keys); demo.
 * keeps axw-demo:* in sessionStorage and axw_idioma_ui in localStorage; both load
 * Google Fonts; demo.'s CSP also allows jsDelivr and cdnjs. Registered address
 * added (owner, 12-oct); NIB omitted until we have it (AXW-18). If erp./demo.
 * self-host their fonts or change what they store, these texts change too. */

$LEGAL_EN = [

'legal-notice' => [
  'url'=>'/legal-notice',
  'title'=>'Legal notice — AxisWorks',
  'desc'=>'Who runs axisworks.studio, erp.axisworks.studio and demo.axisworks.studio, how to contact us, the terms of use of these websites, intellectual property and applicable law.',
  'h1'=>'Legal notice',
  'updated'=>'2026-10-12',
  'secciones'=>[
    ['h'=>'Who runs this website','p'=>[
      '<p>The website axisworks.studio and its subdomains erp.axisworks.studio and demo.axisworks.studio are owned and operated by <b>PT MAHKOTA PROPERTY GLOBAL</b>, a company incorporated in the Republic of Indonesia. AxisWorks is the trade name under which it offers its services. In this notice, "this website" means all three.</p>',
      '<ul><li>Company: PT MAHKOTA PROPERTY GLOBAL</li><li>Address: Kerobokan Kelod, Kuta Utara, Badung, Bali, Indonesia</li><li>Email: <a href="mailto:hello@axisworks.studio">hello@axisworks.studio</a></li><li>Websites: <a href="https://axisworks.studio">https://axisworks.studio</a>, <a href="https://erp.axisworks.studio">https://erp.axisworks.studio</a> and <a href="https://demo.axisworks.studio">https://demo.axisworks.studio</a></li></ul>',
      '<p>Any question about this website, its content or this notice can be sent to that email address.</p>',
    ]],
    ['h'=>'Terms of use','p'=>[
      '<p>By browsing this website you accept these terms. If you do not accept them, please do not use the site.</p>',
      '<p>You may read, share and link to the pages of this website. You may not use it to break the law, to send spam or harmful code through the contact form, to try to access parts of the server that are not public, or to copy its content in bulk by automated means for reuse elsewhere.</p>',
      '<p>The site describes the services of the studio. Nothing on it is a binding offer. A project starts only with a written agreement signed by both parties, and that agreement prevails over anything published here.</p>',
      '<p>The savings calculator on erp.axisworks.studio gives indicative figures based on the assumptions you enter. They are an estimate, not a promise of results.</p>',
      '<p>demo.axisworks.studio is a demonstration of our ERP, filled with made-up sample data. It is there for you to try the software, as it is: it is not a service for real use, and what you do in it can be reset at any time. Please do not enter real personal data in it.</p>',
    ]],
    ['h'=>'Intellectual property','p'=>[
      '<p>The texts, design, code, images and case studies on this website belong to PT MAHKOTA PROPERTY GLOBAL or are used with the permission of their owners. Reproducing, distributing or modifying them requires our prior written permission, except for short quotes that name the source and link to it.</p>',
      '<p>Screenshots and descriptions of client work are published with the client\'s agreement. The rights in that work belong to whoever the project contract says they belong to.</p>',
    ]],
    ['h'=>'Third-party trademarks','p'=>[
      '<p>This website shows the names and logos of tools we work with, such as Claude, ChatGPT, Railway, Blender or Meta. Those names and logos are trademarks of their respective owners.</p>',
      '<p>We show them only to identify the tools we use. Their presence here does not mean that any of those companies sponsors, endorses or is affiliated with AxisWorks, and no partnership should be inferred unless we say so expressly.</p>',
    ]],
    ['h'=>'Liability','p'=>[
      '<p>We keep the content of this website accurate and up to date, but it is general information about our work, not professional advice for your specific case. Decisions you take based only on what you read here are your own.</p>',
      '<p>We try to keep the site available and free of harmful code. We cannot guarantee that it will always be available or error-free, and we are not liable for interruptions caused by maintenance, by our providers or by events outside our control.</p>',
      '<p>Links to other websites are provided for convenience. We do not control those sites and are not responsible for their content or their privacy practices.</p>',
      '<p>Nothing in this notice limits liability that cannot be limited by law.</p>',
    ]],
    ['h'=>'Applicable law and jurisdiction','p'=>[
      '<p>This notice and the use of this website are governed by the laws of the Republic of Indonesia. If you use the site as a consumer, you keep the protection of the mandatory rules of your country of residence and may bring a claim before its courts.</p>',
      '<p>Contracts for our services have their own governing law and jurisdiction clause.</p>',
    ]],
    ['h'=>'Changes','p'=>[
      '<p>We may update this notice when the website or the law changes. The date at the top of the page shows the latest version.</p>',
    ]],
  ],
],

'privacy' => [
  'url'=>'/privacy',
  'title'=>'Privacy policy — AxisWorks',
  'desc'=>'What personal data axisworks.studio, erp.axisworks.studio and demo.axisworks.studio collect, why, on what legal basis, who receives it, how long we keep it and how to exercise your rights.',
  'h1'=>'Privacy policy',
  'updated'=>'2026-10-12',
  'secciones'=>[
    ['h'=>'In short','p'=>[
      '<ul><li>This policy covers axisworks.studio, erp.axisworks.studio and demo.axisworks.studio.</li><li>We only collect what you write in the contact form or send us by email, plus the page you wrote from and, if present in the link, the campaign that brought you here.</li><li>We use it to answer you. No newsletter, no marketing, no sale of data.</li><li>It reaches us by email and is not stored in any database on this website.</li><li>None of the three sites uses cookies, analytics or tracking pixels. The demo keeps its sample data and your language choice in your own browser so that it works; the cookie policy lists what and for how long.</li><li>erp.axisworks.studio and the demo load fonts from Google Fonts, so Google receives your IP address when you open them.</li></ul>',
    ]],
    ['h'=>'Who is responsible for your data','p'=>[
      '<p>The data controller is <b>PT MAHKOTA PROPERTY GLOBAL</b>, a company incorporated in Indonesia that trades as AxisWorks, with its address at Kerobokan Kelod, Kuta Utara, Badung, Bali, Indonesia.</p>',
      '<p>Contact for anything related to your data: <a href="mailto:hello@axisworks.studio">hello@axisworks.studio</a>.</p>',
    ]],
    ['h'=>'What data we collect','p'=>[
      '<p>Through the contact form:</p>',
      '<ul><li>Your name and email address.</li><li>Your company, if you choose to give it.</li><li>Your message and anything you include in it.</li><li>The page of this website you sent the form from.</li><li>If the link you followed carried campaign parameters (<code>utm_source</code>, <code>utm_medium</code>, <code>utm_campaign</code> and similar), the values of those parameters. They tell us which channel or campaign brought you here. They do not identify you.</li></ul>',
      '<p>If you write to us by email, we receive what you send. That includes the "Ask for a quote with these numbers" button on erp.axisworks.studio: it opens your own email app with a message already filled in with the figures you entered in the calculator. Nothing reaches us until you send it yourself, and we treat it like a form message.</p>',
      '<p>The demo (demo.axisworks.studio) has no accounts and no sign-in: you enter as a sample user. The people, companies, contracts and figures you see in it are made up for the demonstration and do not come from any real client database. What you type in the demo stays in your browser tab and is not sent to us or to anyone else. Closing the tab or pressing "Reset demo" deletes it. Please do not enter real personal data.</p>',
      '<p>When you open erp.axisworks.studio or the demo, your browser downloads fonts and icons from Google Fonts, a Google service, so Google receives your IP address and the technical data that any request carries (such as your browser). Some pages of the demo may also load code libraries from jsDelivr or cdnjs (Cloudflare), which receive the same data. axisworks.studio serves its fonts from its own domain and does not do this.</p>',
      '<p>To stop spam, the form limits how many messages can be sent from the same IP address. For that, the server keeps your IP address only in the form of a hash, combined with a secret that changes every day, so it cannot be read back. That hash is deleted in less than 24 hours.</p>',
      '<p>Like any web server, the ones that host these sites record technical data about each request (IP address, date and time, page requested, browser) to keep the service running and secure.</p>',
      '<p>We do not ask for special categories of data. Please do not include them in your message.</p>',
    ]],
    ['h'=>'Why we use it and on what legal basis','p'=>[
      '<ul><li><b>To answer a request about our services</b> (a quote, a project, a question before hiring us). Legal basis: steps taken at your request before entering into a contract (Article 6(1)(b) GDPR).</li><li><b>To answer any other message</b> (press, job applications, other questions). Legal basis: our legitimate interest in replying to people who write to us (Article 6(1)(f) GDPR). You write to us to get an answer, so replying is what you expect.</li><li><b>To protect the form from spam and the server from abuse</b>, including the IP hash and server logs. Legal basis: our legitimate interest in keeping the website secure (Article 6(1)(f) GDPR).</li><li><b>To display erp.axisworks.studio and the demo with their fonts and icons</b>, which is why your browser contacts Google Fonts and, on some demo pages, jsDelivr or cdnjs. Legal basis: our legitimate interest in showing those pages correctly (Article 6(1)(f) GDPR). You can object by writing to us.</li></ul>',
      '<p>There is no checkbox in the form because we do not rely on your consent for any of this. We will not use your data to send you newsletters or advertising.</p>',
      '<p>No decision about you is made by automated means.</p>',
    ]],
    ['h'=>'Who receives your data','p'=>[
      '<p>Nobody outside the studio, except the providers that process it on our behalf under a data processing agreement:</p>',
      '<ul><li><b>Hostinger</b>, which hosts these websites and our email inbox.</li></ul>',
      '<p>We do not sell or rent your data, and we do not share it with third parties for their own purposes. We will only disclose it if a law or a competent authority requires us to.</p>',
      '<p>Separately, when you open erp.axisworks.studio or the demo, your browser sends your IP address directly to <b>Google</b> (Google Fonts) and, on some demo pages, to <b>jsDelivr</b> or <b>cdnjs (Cloudflare)</b>, to download fonts, icons or code. They are not providers working on our behalf: they handle that data under their own privacy policies, for example Google\'s at <a href="https://policies.google.com/privacy" rel="noopener">policies.google.com/privacy</a>. Those requests may be served from outside your country, including from the United States.</p>',
    ]],
    ['h'=>'International transfers','p'=>[
      '<p>We are established in Indonesia. The European Commission has not adopted an adequacy decision for Indonesia, so the level of data protection there has not been declared equivalent to that of the European Union.</p>',
      '<p>When you write to us from the EU about our services, sending your message to Indonesia is necessary to take the steps you asked for before a possible contract. That transfer rests on Article 49(1)(b) GDPR. For any other message, you are sending it directly to a company established outside the EU, and we apply this policy and the GDPR to it in the same way.</p>',
      '<p>Wherever the data is, we protect it with the same measures: access limited to the people who need it, encrypted connections (HTTPS) and no copies outside our inbox.</p>',
    ]],
    ['h'=>'How long we keep it','p'=>[
      '<ul><li><b>Contact form messages:</b> for as long as the conversation lasts. If no working relationship follows, we delete them 24 months after the last message exchanged. That window covers the usual case of a project that comes back months later.</li><li><b>If you become a client:</b> the correspondence becomes part of the project file and is kept for as long as the contract lasts and, afterwards, for the period required by tax and commercial law or needed to handle possible claims.</li><li><b>IP hash for spam control:</b> less than 24 hours.</li></ul>',
      '<p>If you ask us to delete your message before those periods end, we will, unless a law requires us to keep it.</p>',
    ]],
    ['h'=>'Your rights','p'=>[
      '<p>You can ask us at any time to:</p>',
      '<ul><li>access the data we hold about you;</li><li>correct it if it is wrong;</li><li>delete it;</li><li>object to its use, including when we rely on legitimate interest;</li><li>restrict its use while we check a request;</li><li>receive it in a structured, commonly used format, or have it sent to someone else (portability).</li></ul>',
      '<p>Write to <a href="mailto:hello@axisworks.studio">hello@axisworks.studio</a> saying which right you want to exercise. We will reply within one month. We may ask you to confirm your identity if we have reasonable doubts that the request comes from you.</p>',
      '<p>If you think we have not handled your data properly, you can complain to the Spanish Data Protection Agency (<a href="https://www.aepd.es" rel="noopener">www.aepd.es</a>) or to the data protection authority of the EU country where you live or work. We would appreciate the chance to fix it first.</p>',
      '<p>As an Indonesian company we are also subject to Indonesian Law No. 27 of 2022 on Personal Data Protection (UU PDP), which gives you equivalent rights. You can exercise them at the same email address.</p>',
    ]],
    ['h'=>'Security','p'=>[
      '<p>All three sites run over HTTPS. Form messages go straight to our inbox and are not saved in a database on the web server. Only the people at the studio who need to answer you can read them.</p>',
      '<p>If a security incident affects your data and puts your rights at risk, we will notify the competent authority and, where required, tell you directly within the legal deadlines.</p>',
    ]],
    ['h'=>'Minors','p'=>[
      '<p>These websites are aimed at businesses and professionals. It is not directed at children and we do not knowingly collect data from anyone under 14. If you believe a minor has written to us, let us know and we will delete the message.</p>',
    ]],
    ['h'=>'Changes to this policy','p'=>[
      '<p>If we change the way we process data, we will update this page before the change applies. The date at the top shows the latest version.</p>',
    ]],
  ],
],

'cookies' => [
  'url'=>'/cookies',
  'title'=>'Cookie policy — AxisWorks',
  'desc'=>'axisworks.studio, erp.axisworks.studio and demo.axisworks.studio use no cookies. What the ERP demo keeps in your browser and for how long, and why there is no cookie banner.',
  'h1'=>'Cookie policy',
  'updated'=>'2026-10-12',
  'secciones'=>[
    ['h'=>'This website does not use cookies','p'=>[
      '<p>This policy covers axisworks.studio, erp.axisworks.studio and demo.axisworks.studio. None of them places cookies on your device, and none uses analytics, advertising or social media pixels, or fingerprinting.</p>',
      '<p>axisworks.studio and erp.axisworks.studio also save nothing in your browser\'s local storage or session storage. erp.axisworks.studio only deletes sign-in data that earlier versions of our software may have left in your browser; it does not store anything new.</p>',
      '<p>axisworks.studio serves its fonts from our own domain, so loading one of its pages does not send your IP address to a font provider. erp.axisworks.studio and the demo do load fonts and icons from Google Fonts, and some demo pages may load code from jsDelivr or cdnjs. That is not a cookie, but it does send your IP address to those providers; the privacy policy explains it. There are no embedded videos, maps or other third-party content that could set their own cookies.</p>',
    ]],
    ['h'=>'What the demo keeps in your browser','p'=>[
      '<p>The ERP demo at demo.axisworks.studio runs entirely in your browser, so it keeps two kinds of data there. Both are set by us, neither is a cookie, and neither is sent to us or to anyone else:</p>',
      '<ul><li><code>axw-demo:*</code> (session storage): the sample data and the changes you make while you try the demo, so that they carry over from one page to the next. Deleted when you close the tab or press "Reset demo".</li><li><code>axw_idioma_ui</code> (local storage): the language you chose for the demo screens. It is saved when you choose a language, it has no expiry date, and you can delete it by clearing your browser\'s site data for demo.axisworks.studio.</li></ul>',
    ]],
    ['h'=>'Why there is no cookie banner','p'=>[
      '<p>A cookie banner exists to ask for your consent before storing or reading information on your device that is not strictly necessary. axisworks.studio and erp.axisworks.studio store nothing. The demo stores only what it needs to work the way you asked it to: the demo session and the language you picked. The law does not require consent for that, so there is nothing to consent to, and showing a banner would only get in your way.</p>',
    ]],
    ['h'=>'Links to other websites','p'=>[
      '<p>Some pages link to other websites. If you follow those links, the other site may use its own cookies under its own policy, which we do not control.</p>',
    ]],
    ['h'=>'If this changes','p'=>[
      '<p>If we ever add cookies or similar technologies that are not strictly necessary, such as analytics, we will ask for your consent before using them. Rejecting will be as easy as accepting, and this page will list each cookie with its purpose, provider and duration.</p>',
      '<p>Questions: <a href="mailto:hello@axisworks.studio">hello@axisworks.studio</a>.</p>',
    ]],
  ],
],

];

$LEGAL_CAPA1_EN = 'PT MAHKOTA PROPERTY GLOBAL (AxisWorks) will use your details only to reply to your message; no newsletter and no marketing. You can access, correct or delete them by writing to hello@axisworks.studio. Full details in our <a href="/privacy">privacy policy</a>.';
