<?php
/* Legal pages EN (legal notice, privacy, cookies). Written by Legal on
 * 24-sep-2026 against what the site actually does: no cookies, no analytics,
 * no pixels, no browser storage, self-hosted fonts, one contact form that goes
 * by email and is not stored in a database. If any of that changes (analytics,
 * embeds, a CRM behind the form), these texts change in the same commit. */

$LEGAL_EN = [

'legal-notice' => [
  'url'=>'/legal-notice',
  'title'=>'Legal notice — AxisWorks',
  'desc'=>'Who runs axisworks.studio, how to contact us, the terms of use of this website, intellectual property and applicable law.',
  'h1'=>'Legal notice',
  'updated'=>'2026-09-24',
  'secciones'=>[
    ['h'=>'Who runs this website','p'=>[
      '<p>The website axisworks.studio is owned and operated by <b>PT MAHKOTA PROPERTY GLOBAL</b>, a company incorporated in the Republic of Indonesia. AxisWorks is the trade name under which it offers its services.</p>',
      '<ul><li>Company: PT MAHKOTA PROPERTY GLOBAL</li><li>Country: Indonesia</li><li>Email: <a href="mailto:hello@axisworks.studio">hello@axisworks.studio</a></li><li>Website: <a href="https://axisworks.studio">https://axisworks.studio</a></li></ul>',
      '<p>Any question about this website, its content or this notice can be sent to that email address.</p>',
    ]],
    ['h'=>'Terms of use','p'=>[
      '<p>By browsing this website you accept these terms. If you do not accept them, please do not use the site.</p>',
      '<p>You may read, share and link to the pages of this website. You may not use it to break the law, to send spam or harmful code through the contact form, to try to access parts of the server that are not public, or to copy its content in bulk by automated means for reuse elsewhere.</p>',
      '<p>The site describes the services of the studio. Nothing on it is a binding offer. A project starts only with a written agreement signed by both parties, and that agreement prevails over anything published here.</p>',
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
  'desc'=>'What personal data axisworks.studio collects through its contact form, why, on what legal basis, who receives it, how long we keep it and how to exercise your rights.',
  'h1'=>'Privacy policy',
  'updated'=>'2026-09-24',
  'secciones'=>[
    ['h'=>'In short','p'=>[
      '<ul><li>We only collect what you write in the contact form, plus the page you wrote from and, if present in the link, the campaign that brought you here.</li><li>We use it to answer you. No newsletter, no marketing, no sale of data.</li><li>It reaches us by email and is not stored in any database on this website.</li><li>This website uses no cookies, no analytics and no tracking pixels.</li></ul>',
    ]],
    ['h'=>'Who is responsible for your data','p'=>[
      '<p>The data controller is <b>PT MAHKOTA PROPERTY GLOBAL</b>, a company incorporated in Indonesia that trades as AxisWorks.</p>',
      '<p>Contact for anything related to your data: <a href="mailto:hello@axisworks.studio">hello@axisworks.studio</a>.</p>',
    ]],
    ['h'=>'What data we collect','p'=>[
      '<p>Through the contact form:</p>',
      '<ul><li>Your name and email address.</li><li>Your company, if you choose to give it.</li><li>Your message and anything you include in it.</li><li>The page of this website you sent the form from.</li><li>If the link you followed carried campaign parameters (<code>utm_source</code>, <code>utm_medium</code>, <code>utm_campaign</code> and similar), the values of those parameters. They tell us which channel or campaign brought you here. They do not identify you.</li></ul>',
      '<p>To stop spam, the form limits how many messages can be sent from the same IP address. For that, the server keeps your IP address only in the form of a hash, combined with a secret that changes every day, so it cannot be read back. That hash is deleted in less than 24 hours.</p>',
      '<p>Like any web server, the one that hosts this site records technical data about each request (IP address, date and time, page requested, browser) to keep the service running and secure.</p>',
      '<p>We do not ask for special categories of data. Please do not include them in your message.</p>',
    ]],
    ['h'=>'Why we use it and on what legal basis','p'=>[
      '<ul><li><b>To answer a request about our services</b> (a quote, a project, a question before hiring us). Legal basis: steps taken at your request before entering into a contract (Article 6(1)(b) GDPR).</li><li><b>To answer any other message</b> (press, job applications, other questions). Legal basis: our legitimate interest in replying to people who write to us (Article 6(1)(f) GDPR). You write to us to get an answer, so replying is what you expect.</li><li><b>To protect the form from spam and the server from abuse</b>, including the IP hash and server logs. Legal basis: our legitimate interest in keeping the website secure (Article 6(1)(f) GDPR).</li></ul>',
      '<p>There is no checkbox in the form because we do not rely on your consent for any of this. We will not use your data to send you newsletters or advertising.</p>',
      '<p>No decision about you is made by automated means.</p>',
    ]],
    ['h'=>'Who receives your data','p'=>[
      '<p>Nobody outside the studio, except the providers that process it on our behalf under a data processing agreement:</p>',
      '<ul><li><b>Hostinger</b>, which hosts this website and our email inbox.</li></ul>',
      '<p>We do not sell or rent your data, and we do not share it with third parties for their own purposes. We will only disclose it if a law or a competent authority requires us to.</p>',
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
      '<p>The whole site runs over HTTPS. Form messages go straight to our inbox and are not saved in a database on the web server. Only the people at the studio who need to answer you can read them.</p>',
      '<p>If a security incident affects your data and puts your rights at risk, we will notify the competent authority and, where required, tell you directly within the legal deadlines.</p>',
    ]],
    ['h'=>'Minors','p'=>[
      '<p>This website is aimed at businesses and professionals. It is not directed at children and we do not knowingly collect data from anyone under 14. If you believe a minor has written to us, let us know and we will delete the message.</p>',
    ]],
    ['h'=>'Changes to this policy','p'=>[
      '<p>If we change the way we process data, we will update this page before the change applies. The date at the top shows the latest version.</p>',
    ]],
  ],
],

'cookies' => [
  'url'=>'/cookies',
  'title'=>'Cookie policy — AxisWorks',
  'desc'=>'axisworks.studio does not use cookies or similar technologies. What that means, why there is no cookie banner, and what would change if that ever changes.',
  'h1'=>'Cookie policy',
  'updated'=>'2026-09-24',
  'secciones'=>[
    ['h'=>'This website does not use cookies','p'=>[
      '<p>axisworks.studio does not place cookies on your device. It also does not use similar technologies: no analytics, no advertising or social media pixels, no fingerprinting, and nothing saved in your browser\'s local storage or session storage.</p>',
      '<p>The fonts are served from our own domain, so loading a page does not send your IP address to a font provider. There are no embedded videos, maps or other third-party content that could set their own cookies.</p>',
    ]],
    ['h'=>'Why there is no cookie banner','p'=>[
      '<p>A cookie banner exists to ask for your consent before storing or reading information on your device. Since this website does neither, there is nothing to consent to, and showing a banner would only get in your way.</p>',
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
