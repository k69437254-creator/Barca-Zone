import "./styles.css";
import { footballProvider } from "./data/football-provider.js";
import { storage } from "./storage.js";

const state = {
  page: "home",
  matches: [],
  standings: [],
  players: [],
  news: [],
  errors: {},
  updatedAt: null,
  favorites: storage.get("favorites", []),
  savedPredictions: storage.get("predictions", []),
  theme: storage.get("theme", "dark"),
  selectedMatch: null,
  query: ""
};

const app = document.querySelector("#app");
const fmtDate = (value, opts = {}) => {
  if (!value) return "الموعد غير متاح";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "الموعد غير متاح";
  return new Intl.DateTimeFormat("ar-IQ", { dateStyle: "medium", timeStyle: "short", ...opts }).format(d);
};
const escapeHtml = (s = "") => String(s).replace(/[&<>"']/g, (c) => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));
const initials = (name = "") => name.trim().split(/\s+/).slice(0, 2).map((x) => x[0] ?? "").join("");
const logo = (url, name, cls = "") => url
  ? `<img class="${cls}" src="${escapeHtml(url)}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.hidden=true;this.nextElementSibling.hidden=false"><span class="crest-fallback" hidden>${escapeHtml(initials(name))}</span>`
  : `<span class="crest-fallback">${escapeHtml(initials(name))}</span>`;
const scoreText = (m) => m.score.available ? `${m.score.home} - ${m.score.away}` : "النتيجة غير متاحة";
const stateText = (m) => m.status.state === "in" ? (m.status.label || "مباشرة") : m.status.state === "post" ? "انتهت" : m.status.state === "pre" ? "لم تبدأ" : (m.status.label || "الحالة غير متاحة");

function render() {
  document.documentElement.dataset.theme = state.theme;
  app.innerHTML = `
    <div class="shell">
      <header class="topbar">
        <div class="brand-mark">BZ</div>
        <div class="brand-copy"><strong>BARCA <span>ZONE</span></strong><small>عالم برشلونة بين يديك</small></div>
        <button class="icon-btn" data-action="theme" aria-label="تبديل المظهر">${state.theme === "dark" ? "☼" : "☾"}</button>
      </header>
      <main>${renderPage()}</main>
      <nav class="bottom-nav" aria-label="التنقل الرئيسي">
        ${navItem("home","الرئيسية","⌂")}${navItem("matches","المباريات","◷")}${navItem("players","اللاعبون","♙")}${navItem("news","الأخبار","▤")}${navItem("more","المزيد","⋯")}
      </nav>
    </div>`;
}
function navItem(id, label, icon) {
  return `<button class="nav-item ${state.page === id ? "active" : ""}" data-page="${id}"><span>${icon}</span><small>${label}</small></button>`;
}
function sectionTitle(title, action = "") {
  return `<div class="section-heading"><h2>${title}</h2>${action}</div>`;
}
function renderPage() {
  if (state.page === "matches") return renderMatches();
  if (state.page === "players") return renderPlayers();
  if (state.page === "news") return renderNews();
  if (state.page === "more") return renderMore();
  if (state.page === "standings") return renderStandings();
  if (state.page === "favorites") return renderFavorites();
  if (state.page === "builder") return renderBuilder();
  if (state.page === "predictions") return renderPredictions();
  if (state.page === "developer") return renderDeveloper();
  if (state.page === "details") return renderMatchDetails();
  return renderHome();
}
function renderHome() {
  const next = state.matches.find((m) => m.status.state === "pre");
  const latest = [...state.matches].reverse().find((m) => m.status.state === "post");
  return `
    <section class="hero">
      <div class="hero-glow"></div><div class="eyebrow"><span class="live-dot"></span> منصة المشجع الكتالوني</div>
      <h1>أكثر من نادٍ.<br><span>إنها هوية.</span></h1>
      <p>كل ما يهمك عن برشلونة، في مكان واحد.</p>
      <div class="hero-ribbon"><span>🔵🔴</span><span>MES QUE UN CLUB</span><span>✦</span></div>
    </section>
    ${sectionTitle("المباراة القادمة", `<button class="text-btn" data-page="matches">كل المباريات ←</button>`)}
    ${next ? matchCard(next) : emptyState("calendar", "لا توجد مباراة قادمة متاحة", "لم يعثر مصدر البيانات على مباراة قادمة ضمن الاستجابة الحالية.")}
    ${latest ? `${sectionTitle("آخر نتيجة")}${matchCard(latest)}` : ""}
    ${sectionTitle("آخر الأخبار", `<button class="text-btn" data-page="news">عرض الكل ←</button>`)}
    ${state.news.length ? `<div class="news-stack">${state.news.slice(0,3).map(newsCard).join("")}</div>` : dataState("news")}
    ${sectionTitle("موقف برشلونة في الدوري", `<button class="text-btn" data-page="standings">الترتيب ←</button>`)}
    ${renderBarcaStanding()}
    <div class="update-note">${state.updatedAt ? `آخر محاولة تحديث: ${fmtDate(state.updatedAt)}` : "سيظهر وقت التحديث بعد استجابة مصدر البيانات."}</div>`;
}
function matchCard(m) {
  return `<button class="match-card" data-match="${escapeHtml(m.id ?? "")}">
    <div class="match-meta"><span class="competition">${escapeHtml(m.competition || "الدوري الإسباني")}</span><span class="match-status ${m.status.state === "in" ? "live" : ""}">${escapeHtml(stateText(m))}</span></div>
    <div class="match-teams"><div class="team">${logo(m.home.logo,m.home.name)}<strong>${escapeHtml(m.home.name)}</strong></div><div class="score">${escapeHtml(scoreText(m))}<small>${escapeHtml(m.status.label || "")}</small></div><div class="team">${logo(m.away.logo,m.away.name)}<strong>${escapeHtml(m.away.name)}</strong></div></div>
    <div class="match-foot"><span>◷ ${escapeHtml(fmtDate(m.date))}</span><span>التفاصيل ←</span></div>
  </button>`;
}
function renderMatches() {
  return `<div class="page-head"><div class="eyebrow">مركز المباريات</div><h1>المباريات <span>والنتائج</span></h1><p>البيانات المعروضة تأتي من المصدر الخارجي عند توفرها.</p></div>
    <div class="filter-row"><button class="filter-chip active" data-filter="all">الكل</button><button class="filter-chip" data-filter="pre">قادمة</button><button class="filter-chip" data-filter="in">مباشرة</button><button class="filter-chip" data-filter="post">منتهية</button></div>
    <div id="match-list" class="card-stack">${state.matches.length ? state.matches.map(matchCard).join("") : dataState("matches")}</div>
    <button class="primary-btn" data-action="refresh">تحديث البيانات</button>`;
}
function renderPlayers() {
  const players = state.players.filter(p => p.name.toLowerCase().includes(state.query.toLowerCase()));
  return `<div class="page-head"><div class="eyebrow">فريق برشلونة</div><h1>دليل <span>اللاعبين</span></h1><p>قائمة ديناميكية من مزود البيانات؛ قد لا تتوفر كل الصور أو التفاصيل.</p></div>
    <input class="search-input" id="player-search" value="${escapeHtml(state.query)}" placeholder="ابحث عن لاعب..." />
    ${players.length ? `<div class="player-grid">${players.map(p => `<article class="player-card">${p.image ? `<img src="${escapeHtml(p.image)}" alt="" loading="lazy" onerror="this.hidden=true">` : `<div class="player-placeholder">${escapeHtml(initials(p.name))}</div>`}<div class="player-info"><strong>${escapeHtml(p.name)}</strong><span>${escapeHtml(p.position)}</span><small>${p.number ? `رقم ${escapeHtml(p.number)}` : "الرقم غير متاح"}${p.nationality ? ` · ${escapeHtml(p.nationality)}` : ""}</small><button class="mini-btn" data-favorite-player="${escapeHtml(p.id ?? p.name)}">${state.favorites.includes(`player:${p.id ?? p.name}`) ? "★ محفوظ" : "☆ المفضلة"}</button></div></article>`).join("")}</div>` : dataState("players")}`;
}
function newsCard(n) {
  return `<article class="news-card">${n.image ? `<img src="${escapeHtml(n.image)}" alt="" loading="lazy" onerror="this.hidden=true">` : `<div class="news-placeholder">BARÇA</div>`}<div class="news-content"><small>${escapeHtml(n.source)} · ${escapeHtml(fmtDate(n.publishedAt,{timeStyle:undefined}))}</small><h3>${escapeHtml(n.title)}</h3><p>${escapeHtml(n.summary || "لا يتوفر ملخص لهذا الخبر من المصدر.")}</p><div class="news-actions">${n.url ? `<button class="mini-btn" data-open-url="${escapeHtml(n.url)}">المصدر الأصلي ↗</button>` : ""}<button class="mini-btn" data-favorite-news="${escapeHtml(n.id ?? n.url ?? n.title)}">${state.favorites.includes(`news:${n.id ?? n.url ?? n.title}`) ? "★ محفوظ" : "☆ حفظ"}</button></div></div></article>`;
}
function renderNews() {
  return `<div class="page-head"><div class="eyebrow">من الصحافة الرياضية</div><h1>أخبار <span>برشلونة</span></h1><p>نحافظ على روابط المصادر الأصلية ولا نختلق أخباراً عند تعذر الاتصال.</p></div>${state.news.length ? `<div class="news-stack">${state.news.map(newsCard).join("")}</div>` : dataState("news")}`;
}
function renderBarcaStanding() {
  const row = state.standings.find(x => /barcelona/i.test(x.team.name) || /barcelona/i.test(x.team.shortName));
  if (!row) return emptyState("trophy", "الترتيب غير متاح", "لم تُرجع واجهة ESPN جدول ترتيب قابلاً للتحقق. لن نعرض أرقاماً تقديرية.");
  return `<div class="standing-highlight"><div><small>المركز</small><strong>${row.rank ?? "—"}</strong></div><div class="standing-team">${logo(row.team.logo,row.team.name)}<strong>${escapeHtml(row.team.name)}</strong></div><div><small>لعب</small><strong>${row.played ?? "—"}</strong></div><div><small>النقاط</small><strong>${row.points ?? "—"}</strong></div></div>`;
}
function renderStandings() {
  return `<div class="page-head"><div class="eyebrow">LaLiga</div><h1>جدول <span>الترتيب</span></h1><p>تُعرض الحقول التي وفرها المصدر فقط، دون احتساب ترتيب بديل.</p></div>${state.standings.length ? `<div class="table-wrap"><table><thead><tr><th>#</th><th>الفريق</th><th>لعب</th><th>ف</th><th>ت</th><th>خ</th><th>له</th><th>عليه</th><th>فارق</th><th>نقاط</th></tr></thead><tbody>${state.standings.map(x => `<tr class="${/barcelona/i.test(x.team.name) ? "barca-row" : ""}"><td>${x.rank ?? "—"}</td><td>${logo(x.team.logo,x.team.name,"tiny-crest")} ${escapeHtml(x.team.name)}</td><td>${x.played ?? "—"}</td><td>${x.won ?? "—"}</td><td>${x.drawn ?? "—"}</td><td>${x.lost ?? "—"}</td><td>${x.goalsFor ?? "—"}</td><td>${x.goalsAgainst ?? "—"}</td><td>${x.goalDifference ?? "—"}</td><td>${x.points ?? "—"}</td></tr>`).join("")}</tbody></table></div>` : dataState("standings")}`;
}
function renderMore() {
  return `<div class="page-head"><div class="eyebrow">مساحة المشجع</div><h1>المزيد من <span>Barca Zone</span></h1><p>أدوات محلية تعمل على جهازك، ومصادر البيانات موضحة بشفافية.</p></div>
    <div class="menu-grid">
      <button class="menu-card" data-page="standings"><b>🏆</b><strong>ترتيب الدوري</strong><small>الجدول المتاح من المصدر</small></button>
      <button class="menu-card" data-page="builder"><b>⚽</b><strong>صانع التشكيلة</strong><small>أنشئ تشكيلتك واحفظها محلياً</small></button>
      <button class="menu-card" data-page="predictions"><b>🎯</b><strong>توقعاتي</strong><small>توقعات شخصية غير رسمية</small></button>
      <button class="menu-card" data-page="favorites"><b>★</b><strong>المفضلة</strong><small>الأخبار واللاعبون المحفوظون</small></button>
      <button class="menu-card" data-page="developer"><b>✦</b><strong>واجهة المطور</strong><small>عن التطبيق وصاحبه</small></button>
      <button class="menu-card" data-action="clear-cache"><b>↻</b><strong>مسح التخزين المؤقت</strong><small>إعادة طلب البيانات من المصدر</small></button>
    </div>
    <div class="source-panel"><h3>مصادر البيانات</h3><p>المباريات والأخبار: ESPN Soccer API العامة. الترتيب وقائمة الفريق يعتمد توفرهما على استجابة المسارات الحالية. قد تتغير التغطية أو تُقيّد، لذا تظهر رسالة عند غياب البيانات.</p><a href="https://www.espn.com/soccer/" target="_blank" rel="noreferrer">ESPN Soccer ↗</a><p class="muted">لم تتم إضافة API-Football لأن مفتاحه يجب أن يبقى في خادم آمن، لا داخل التطبيق.</p></div>`;
}
function renderBuilder() {
  const formations = ["4-3-3","4-2-3-1","4-4-2"];
  const saved = storage.get("formation", { formation:"4-3-3", slots:[] });
  const slots = saved.slots ?? [];
  const positions = formations.includes(saved.formation) ? saved.formation : "4-3-3";
  return `<div class="page-head"><div class="eyebrow">أداة تفاعلية</div><h1>صانع <span>التشكيلة</span></h1><p>تشكيلة من إنشائك وليست التشكيلة الرسمية للمباراة.</p></div>
    <label class="field-label" for="formation">الخطة التكتيكية</label><select id="formation" class="search-input">${formations.map(f=>`<option ${f===positions?"selected":""}>${f}</option>`).join("")}</select>
    <div class="pitch"><div class="pitch-lines"></div><div class="pitch-players">${Array.from({length:11},(_,i)=>`<button class="pitch-slot" data-slot="${i}"><span>${escapeHtml(slots[i]?.name ? initials(slots[i].name) : (i===0?"GK":String(i+1)))}</span><small>${escapeHtml(slots[i]?.name ?? "اختر لاعباً")}</small></button>`).join("")}</div></div>
    <div class="player-picker"><label class="field-label" for="slot-player">اختر اللاعب للمركز المحدد</label><select id="slot-player" class="search-input"><option value="">اختر لاعباً من القائمة</option>${state.players.map(p=>`<option value="${escapeHtml(p.id ?? p.name)}">${escapeHtml(p.name)}</option>`).join("")}</select><div class="button-row"><button class="primary-btn" data-action="assign-player">إسناد للاعب المحدد</button><button class="secondary-btn" data-action="save-formation">حفظ التشكيلة</button><button class="secondary-btn" data-action="reset-formation">إعادة ضبط</button></div><p id="builder-hint" class="muted">اختر أحد مراكز الملعب أولاً، ثم اختر لاعباً.</p></div>`;
}
function renderPredictions() {
  return `<div class="page-head"><div class="eyebrow">توقع شخصي</div><h1>توقع <span>النتيجة</span></h1><p>توقعاتك تُحفظ على الجهاز فقط ولا تمثل نتيجة أو توقعاً رسمياً.</p></div>
    ${state.matches.filter(m=>m.status.state==="pre").length ? `<label class="field-label">المباراة</label><select id="prediction-match" class="search-input">${state.matches.filter(m=>m.status.state==="pre").map(m=>`<option value="${escapeHtml(m.id)}">${escapeHtml(m.home.name)} × ${escapeHtml(m.away.name)}</option>`).join("")}</select><div class="prediction-inputs"><label>برشلونة / صاحب الأرض<input id="pred-home" type="number" min="0" max="99" value="1"></label><span>—</span><label>الفريق الآخر<input id="pred-away" type="number" min="0" max="99" value="2"></label></div><button class="primary-btn" data-action="save-prediction">حفظ التوقع</button>` : emptyState("target", "لا توجد مباراة قادمة متاحة", "لا يمكن حفظ توقع مرتبط بمباراة لم يعرضها المصدر.")}
    ${sectionTitle("توقعاتي السابقة")}<div class="card-stack">${state.savedPredictions.length ? state.savedPredictions.map(p=>`<div class="simple-row"><div><strong>${escapeHtml(p.homeName)} × ${escapeHtml(p.awayName)}</strong><small>توقعك: ${p.home} - ${p.away}</small></div><span class="muted">${escapeHtml(fmtDate(p.createdAt))}</span></div>`).join("") : `<p class="muted">لم تحفظ أي توقع بعد.</p>`}</div>`;
}
function renderFavorites() {
  const items = [
    ...state.news.filter(n=>state.favorites.includes(`news:${n.id ?? n.url ?? n.title}`)).map(newsCard),
    ...state.players.filter(p=>state.favorites.includes(`player:${p.id ?? p.name}`)).map(p=>`<div class="simple-row">${p.image?`<img class="tiny-crest" src="${escapeHtml(p.image)}" alt="">`:""}<strong>${escapeHtml(p.name)}</strong><span>${escapeHtml(p.position)}</span></div>`)
  ];
  return `<div class="page-head"><div class="eyebrow">محفوظاتك</div><h1>المفضلة <span>★</span></h1></div>${items.length ? `<div class="news-stack">${items.join("")}</div>` : emptyState("star", "قائمتك فارغة", "احفظ لاعباً أو خبراً ليظهر هنا.")}`;
}
function renderDeveloper() {
  return `<section class="developer-hero"><div class="developer-avatar">AA</div><div class="eyebrow">صُنعت بشغف كتالوني</div><h1>واجهة <span>المطوّر</span></h1><p>Aram Aoyal</p><small>تطوير وتجربة رقمية لعشاق نادي برشلونة</small></section>
    <div class="developer-links"><a href="https://t.me/ro_gy" target="_blank" rel="noreferrer"><b>✈</b><span><strong>التواصل مع المطور</strong><small>t.me/ro_gy</small></span><span>↗</span></a><a href="https://t.me/Barcelona_analysis1" target="_blank" rel="noreferrer"><b>🔵🔴</b><span><strong>قناة برشلونة التحليلية</strong><small>t.me/Barcelona_analysis1</small></span><span>↗</span></a></div>
    <div class="source-panel"><h3>عن Barca Zone</h3><p>تطبيق مستقل للمشجعين، وليس تطبيقاً رسمياً تابعاً لنادي برشلونة. البيانات والصور تخضع لتوفر مزوديها وشروطهم.</p><p class="muted">الإصدار 1.0.0 · اللغة العربية · Android</p></div>`;
}
function renderMatchDetails() {
  const m = state.matches.find(x => x.id === state.selectedMatch);
  if (!m) return `<div class="page-head"><h1>تفاصيل المباراة</h1></div>${emptyState("calendar","التفاصيل غير متاحة","تعذر العثور على هذه المباراة في البيانات المحمّلة.")}`;
  return `<button class="text-btn" data-page="matches">→ العودة للمباريات</button>${sectionTitle("تفاصيل المباراة")}<div class="detail-score">${logo(m.home.logo,m.home.name)}<div><h2>${escapeHtml(scoreText(m))}</h2><p>${escapeHtml(stateText(m))}</p></div>${logo(m.away.logo,m.away.name)}</div><div class="source-panel"><p>الموعد: ${escapeHtml(fmtDate(m.date))}</p><p>الملعب: ${escapeHtml(m.venue || "غير متاح من المصدر")}</p><p>البطولة: ${escapeHtml(m.competition || "غير متاحة")}</p><p>المصدر: ESPN</p><p class="muted">لا تتوفر تفاصيل الأحداث أو التشكيلات من الاستجابة الحالية في هذه النسخة.</p></div>`;
}
function dataState(key) {
  if (state.errors[key]) return emptyState("wifi-off", "تعذر تحميل البيانات", `${state.errors[key]} يمكنك إعادة المحاولة عند توفر الاتصال.` , true);
  return `<div class="loading-card"><span class="loader"></span><p>جارٍ طلب بيانات حقيقية من المصدر...</p></div>`;
}
function emptyState(icon, title, body, retry = false) {
  return `<div class="empty-state"><div class="empty-icon">${icon==="wifi-off"?"⌁":icon==="calendar"?"◷":icon==="trophy"?"♜":icon==="star"?"☆":"◎"}</div><strong>${escapeHtml(title)}</strong><p>${escapeHtml(body)}</p>${retry?`<button class="secondary-btn" data-action="refresh">إعادة المحاولة</button>`:""}</div>`;
}

async function loadData(force = false) {
  if (force) footballProvider.clearCache();
  state.errors = {};
  render();
  const tasks = [
    ["matches", () => footballProvider.matches()],
    ["standings", () => footballProvider.standings()],
    ["players", () => footballProvider.roster()],
    ["news", () => footballProvider.news()]
  ];
  await Promise.all(tasks.map(async ([key, fn]) => {
    try {
      const result = await fn();
      state[key] = result.items;
      state.updatedAt = result.updatedAt;
      state.errors[key] = result.items.length ? null : "المصدر لم يُرجع بيانات متاحة.";
    } catch (err) {
      state.errors[key] = err?.name === "AbortError" ? "انتهت مهلة الاتصال." : "تعذر الاتصال بمصدر البيانات أو أن المسار غير متاح.";
    }
  }));
  render();
}
app.addEventListener("click", async (event) => {
  const page = event.target.closest("[data-page]");
  if (page) { state.page = page.dataset.page; state.query = ""; render(); return; }
  const match = event.target.closest("[data-match]");
  if (match) { state.selectedMatch = match.dataset.match; state.page = "details"; render(); return; }
  const action = event.target.closest("[data-action]")?.dataset.action;
  if (action === "theme") { state.theme = state.theme === "dark" ? "light" : "dark"; storage.set("theme", state.theme); render(); }
  if (action === "refresh") await loadData(true);
  if (action === "clear-cache") { footballProvider.clearCache(); state.errors = {}; await loadData(true); }
  if (action === "save-formation") {
    storage.set("formation", { formation: document.querySelector("#formation")?.value ?? "4-3-3", slots: builderSlots });
    const hint = document.querySelector("#builder-hint"); if (hint) hint.textContent = "تم حفظ التشكيلة على هذا الجهاز.";
  }
  if (action === "reset-formation") { builderSlots = []; storage.set("formation", { formation: document.querySelector("#formation")?.value ?? "4-3-3", slots: [] }); render(); }
  if (action === "assign-player") {
    const selected = document.querySelector("#slot-player")?.value;
    const player = state.players.find(p => String(p.id ?? p.name) === selected);
    if (!player || selectedSlot < 0) { const hint = document.querySelector("#builder-hint"); if (hint) hint.textContent = "اختر مركزاً ولاعباً صالحاً أولاً."; return; }
    builderSlots[selectedSlot] = player; storage.set("formation", { formation: document.querySelector("#formation")?.value ?? "4-3-3", slots: builderSlots }); render();
  }
  if (action === "save-prediction") {
    const match = state.matches.find(m => m.id === document.querySelector("#prediction-match")?.value);
    const home = Number(document.querySelector("#pred-home")?.value), away = Number(document.querySelector("#pred-away")?.value);
    if (!match || !Number.isInteger(home) || !Number.isInteger(away) || home < 0 || away < 0 || home > 99 || away > 99) return;
    state.savedPredictions.unshift({ matchId: match.id, homeName: match.home.name, awayName: match.away.name, home, away, createdAt: new Date().toISOString() });
    storage.set("predictions", state.savedPredictions); render();
  }
  const urlButton = event.target.closest("[data-open-url]");
  if (urlButton) { const url = urlButton.dataset.openUrl; if (/^https:\/\/[^ ]+/i.test(url)) window.open(url, "_blank", "noopener,noreferrer"); }
  const favNews = event.target.closest("[data-favorite-news]");
  const favPlayer = event.target.closest("[data-favorite-player]");
  if (favNews || favPlayer) {
    const key = favNews ? `news:${favNews.dataset.favoriteNews}` : `player:${favPlayer.dataset.favoritePlayer}`;
    state.favorites = state.favorites.includes(key) ? state.favorites.filter(x=>x!==key) : [...state.favorites,key];
    storage.set("favorites", state.favorites); render();
  }
  const slot = event.target.closest("[data-slot]");
  if (slot) { selectedSlot = Number(slot.dataset.slot); const hint = document.querySelector("#builder-hint"); if (hint) hint.textContent = `تم تحديد المركز ${selectedSlot + 1}. اختر اللاعب ثم اضغط إسناد.`; document.querySelectorAll(".pitch-slot").forEach(x=>x.classList.toggle("selected", Number(x.dataset.slot)===selectedSlot)); }
  const filter = event.target.closest("[data-filter]");
  if (filter) {
    document.querySelectorAll("[data-filter]").forEach(x=>x.classList.toggle("active", x===filter));
    const items = state.matches.filter(m=>filter.dataset.filter==="all" || m.status.state===filter.dataset.filter);
    document.querySelector("#match-list").innerHTML = items.length ? items.map(matchCard).join("") : emptyState("calendar","لا توجد مباريات ضمن هذا المرشح","لم يُرجع المصدر مباريات بهذه الحالة.");
  }
});
let selectedSlot = -1;
let builderSlots = storage.get("formation", { slots: [] }).slots ?? [];
app.addEventListener("input", (event) => {
  if (event.target.id === "player-search") {
    const pos = event.target.selectionStart;
    state.query = event.target.value;
    const parent = event.target.parentElement;
    const page = renderPlayers();
    const main = app.querySelector("main");
    main.innerHTML = page;
    const input = main.querySelector("#player-search"); input?.focus(); input?.setSelectionRange(pos,pos);
  }
});
app.addEventListener("change", (event) => {
  if (event.target.id === "formation") {
    storage.set("formation", { formation: event.target.value, slots: builderSlots });
  }
});
render();
loadData().catch(() => {});
