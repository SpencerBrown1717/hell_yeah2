import { escape, creativeArt } from "./views.mjs";
import { icon } from "./icons.mjs";
import { demoContext } from "./demo-model.mjs";

export const products = [
  { key: "growth", label: "Growth OS", number: "01", title: "A better next move. Every day.", text: "Bring results and customer feedback together. See what to improve, what to test, and when there’s room to grow.", action: "Open Growth OS", icon: "spark" },
  { key: "simulator", label: "Simulator", number: "02", title: "See the possibilities before you spend.", text: "Try a budget. Compare possible outcomes. Take the plan you choose straight into campaign review.", action: "Model a campaign", icon: "simulate" },
  { key: "creative", label: "Creative intelligence", number: "03", title: "Find the idea worth testing.", text: "Review your creative, capture an observation, and turn it into a campaign or a test. Keep the source attached.", action: "Explore creative", icon: "creative" },
  { key: "experiments", label: "Experiments", number: "04", title: "Let the results shape what comes next.", text: "Give an idea a fair test. Record the outcome and feed it back into the next growth decision.", action: "Open experiments", icon: "experiment" },
];

export function siteHeader(active = "home") {
  return `<header class="site-header"><div class="site-header-inner"><a href="#home" class="site-logo" aria-label="Hellyeah home"><img src="./assets/lockup-orange.svg" alt="Hellyeah" width="145" height="28"></a><nav class="site-nav" aria-label="Platform navigation"><a href="#home" ${active === "home" ? 'aria-current="page"' : ""}>Platform</a>${products.map(p => `<a href="#${p.key}" ${active === p.key ? 'aria-current="page"' : ""}>${p.label}</a>`).join("")}</nav><a class="btn dark" href="#demo">${active === "home" ? "Try the platform" : "Campaign guide"}${icon("arrow")}</a></div></header>`;
}

function preview(key, s) {
  const a = s.assets[0];
  if (key === "creative") return `<div class="preview-creative">${creativeArt(a)}<div><span class="mini-label">CREATIVE INTELLIGENCE</span><h3>${escape(a.angle)}</h3><p>One message. A testable question.</p><div class="preview-note">${icon("link")}Source creative · v${a.version}</div><a href="#creative" class="text-btn">Inspect the creative ${icon("arrow")}</a></div></div>`;
  if (key === "simulator") return `<div class="preview-metrics"><div><span>Example budget</span><strong>$3,000</strong></div><div><span>Campaign window</span><strong>14 days</strong></div><div><span>Spend committed</span><strong>$0</strong></div></div><div class="preview-forecast"><span>Explore a range of outcomes</span><svg viewBox="0 0 640 180" role="img" aria-label="Illustration of a forecast range, not measured performance"><path d="M0 164L100 142L200 112L300 90L400 58L500 30L640 8L640 93L500 117L400 133L300 145L200 156L100 165L0 170Z" fill="#ff4301" opacity=".1"/><path d="M0 168L100 154L200 137L300 118L400 95L500 74L640 50" fill="none" stroke="#ff4301" stroke-width="2.5"/></svg><div class="row spread tiny muted"><span>Day 1</span><span>Illustrative · Fixed assumptions</span><span>Day 14</span></div></div>`;
  if (key === "experiments") return `<div class="preview-test"><span class="mini-label">A QUESTION WORTH ASKING</span><h3>Does a clearer product benefit help more people buy?</h3><div class="preview-arms"><div><span>Control</span><strong>Original message</strong><small>50% of assigned visitors</small></div><div><span>Variation</span><strong>Benefit-led message</strong><small>50% of assigned visitors</small></div></div><div class="preview-note">${icon("experiment")}Register → Test → Review → Learn</div></div>`;
  return `<div class="preview-os"><div class="preview-os-head"><span class="mini-label">YOUR NEXT MOVE</span><span class="pill outline">Example decision</span></div><h3>Scale when the evidence is ready.</h3><p>Results, feedback, and your limits inform every recommendation.</p><div class="preview-checks">${["Customer returns", "Lead quality", "Tracking", "Available budget"].map(t => `<div>${icon("check")}<span>${t}</span></div>`).join("")}</div><div class="preview-note">${icon("shield")}You review every new spending plan.</div></div>`;
}

export function siteHome(s, u) {
  const p = products.find(p => p.key === u.homeProduct) ?? products[0];
  const started = !!demoContext(s).run;
  return `${siteHeader()}<main id="main" class="site-page" tabindex="-1">
    <section class="site-hero"><div class="hero-copy"><span class="site-tag">HELLYEAH · THE NEXT CHAPTER</span><h1>You didn’t start a business<br class="desktop-break"> to run ads yourself.<br><span>Give growth a mind of its own.</span></h1><p>Your business. Four connected tools.<br>One clear path from an idea to a better campaign.</p><div class="hero-actions"><a class="btn primary" href="#demo">${started ? "Continue your campaign" : "Build your first campaign"}${icon("arrow")}</a><button class="text-btn" data-action="home-explore">Explore the four products ${icon("down")}</button></div><div class="hero-caption">Interactive prototype · Try it with sample data</div></div><div class="hero-art"><img src="./assets/owners.webp" width="3072" height="1124" alt="Business owners at work, from the Hellyeah website" fetchpriority="high"></div></section>
    <section class="site-section product-section" id="platform-products"><div class="section-heading"><span class="site-tag">BUILT INTO THE WAY YOU WORK</span><h2>Your growth team.<br>Now with a learning loop.</h2><p>Start anywhere. Every product connects to the same campaign.</p></div><div class="product-tabs" role="group" aria-label="Explore products">${products.map(x => `<button data-action="home-product" data-product="${x.key}" aria-pressed="${x.key === p.key}"><span>${x.number}</span>${x.label}</button>`).join("")}</div><div class="product-showcase"><div class="product-story"><span class="product-number">${p.number} / 04</span><h3>${p.title}</h3><p>${p.text}</p><a class="btn dark" href="#${p.key}">${p.action}${icon("arrow")}</a></div><div class="product-preview"><div class="preview-chrome"><img src="./assets/glyph-orange.svg" width="20" height="20" alt=""><span>${p.label}</span><span>Demo workspace</span></div>${preview(p.key, s)}</div></div></section>
    <section class="site-section journey-section"><div class="section-heading"><span class="site-tag">ONE CONNECTED CAMPAIGN</span><h2>From first idea<br>to the next good decision.</h2></div><ol class="site-journey">${[
      ["01", "Find your message", "Choose a creative and a question worth testing.", "creative"],
      ["02", "Model the plan", "Explore a budget and review the campaign.", "simulator"],
      ["03", "Test the idea", "Record a healthy, poor, or limited sample outcome.", "experiments"],
      ["04", "Make the next move", "See how the same evidence changes the OS decision.", "growth"],
    ].map(([n,title,text,route]) => `<li><span>${n}</span><h3>${title}</h3><p>${text}</p><a href="#${route}" aria-label="Open ${title}">${icon("arrow")}</a></li>`).join("")}</ol><a href="#demo" class="btn primary">Try the complete flow ${icon("arrow")}</a></section>
    <section class="site-section site-faq"><div><span class="site-tag">BEFORE YOU START</span><h2>A few useful answers.</h2></div><div>${[
      ["Where should I start?", "Choose Build your first campaign. The guide shows one step at a time, from creative selection through budget approval, experiment results, and a saved OS decision."],
      ["Can I explore each product separately?", "Yes. Use the four product links at the top. Creative can seed a simulator plan or experiment; saved plans can enter the complete campaign flow."],
      ["Does this demo spend real money?", "All campaign funds and outcomes here are fictional. You can explore approval, reservation, and settlement without a payment or a live ad."],
      ["What is connected today?", "The four demo products work together. Signed-in feedback and OS decisions persist on the server. Live Hellyeah reporting, campaign execution, capture, and payment adapters still need integration."],
    ].map(([q,a]) => `<details><summary>${q}${icon("plus")}</summary><p>${a}</p></details>`).join("")}</div></section>
    <section class="site-cta"><img src="./assets/glyph-orange.svg" alt="" width="46" height="46"><h2>Your next campaign.<br>A little more intelligent.</h2><a class="btn dark" href="#demo">Let’s build it ${icon("arrow")}</a></section>
    <footer class="site-footer"><a href="#home"><img src="./assets/lockup-orange.svg" alt="Hellyeah" width="145" height="28"></a><span>HellYeah 2 · Product concept & interactive demo</span><a href="https://docs.hellyeahai.com" target="_blank" rel="noopener noreferrer">Hellyeah documentation ↗</a><button class="text-btn" data-action="about-demo">Demo mode</button></footer>
  </main>`;
}
