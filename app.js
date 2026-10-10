/* Loka's 30-Day Curriculum: app logic. Content lives in data.js; everything you do is saved on this device. */
const LS_KEY = "loka-manhag-v1";
const LS_EXPORTED = "loka-manhag-last-export";
const WEEK_LABEL = n => n < 5 ? "Week " + n : "Final";
const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const localDate = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
const emptyState = () => ({done:{}, notes:{}, startedAt:null, custom:[]});

let state = emptyState();
let editingId = null;

/* ---------- Lessons: the original 21 plus your own, in display order ---------- */
function allLessons(){
  return WEEKS.flatMap(w => [
    ...LESSONS.filter(l => l.w === w.n),
    ...state.custom.filter(l => l.w === w.n)
  ]);
}
const isMine = l => l.id.startsWith("C");
const stepsOf = l => [l.id+"-learn", l.id+"-apply"];
const lessonName = l => isMine(l) ? "My lesson: " + l.title : `Lesson ${l.id.slice(1)}: ${l.title}`;

/* ---------- Saving and loading ---------- */
function safeUrl(s){
  s = String(s || "").trim();
  if (!s) return "";
  if (!/^[a-z][a-z0-9+.-]*:/i.test(s)) s = "https://" + s;
  try {
    const u = new URL(s);
    return (u.protocol === "https:" || u.protocol === "http:") && u.hostname.includes(".") ? u.href : null;
  } catch(e) { return null; }
}
/* Turns anything (saved data or an imported file) into clean, safe app data. Returns null if it isn't ours. */
function normalize(raw){
  const d = raw && raw.app === "loka-curriculum" && raw.data ? raw.data : raw;
  if (!d || typeof d !== "object" || Array.isArray(d)) return null;
  if (!("done" in d) && !("notes" in d) && !("custom" in d)) return null;
  const out = emptyState();
  if (d.done && typeof d.done === "object") for (const [k, v] of Object.entries(d.done)) if (v === true) out.done[k] = true;
  if (d.notes && typeof d.notes === "object") for (const [k, v] of Object.entries(d.notes)) if (typeof v === "string" && v) out.notes[k] = v;
  if (typeof d.startedAt === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d.startedAt)) out.startedAt = d.startedAt;
  const seen = new Set();
  if (Array.isArray(d.custom)) for (const c of d.custom) {
    if (!c || typeof c.title !== "string" || !c.title.trim()) continue;
    let id = typeof c.id === "string" && /^C[\w-]{1,40}$/.test(c.id) ? c.id : newId();
    while (seen.has(id)) id = newId();
    seen.add(id);
    const w = Number(c.w);
    out.custom.push({
      id, title: c.title.trim().slice(0,120),
      t: Object.hasOwn(TRACK, c.t) ? c.t : "other",
      w: w >= 1 && w <= 5 ? Math.floor(w) : 1,
      learn: String(c.learn || "").slice(0,2000),
      apply: String(c.apply || "").slice(0,2000),
      url: safeUrl(c.url) || ""
    });
  }
  return out;
}
function newId(){ return "C" + Date.now().toString(36) + Math.random().toString(36).slice(2,6); }
function loadLocal(){
  try { const raw = localStorage.getItem(LS_KEY); if (raw) state = normalize(JSON.parse(raw)) || emptyState(); } catch(e){}
}
function save(){
  try { localStorage.setItem(LS_KEY, JSON.stringify(state)); setSync(); }
  catch(e){ setSync("Couldn't save! Your phone's storage may be full."); }
}
function setSync(err){
  const s = $("sync");
  s.textContent = err || (navigator.onLine ? "Saved on this phone" : "Offline · saved on this phone");
  s.classList.toggle("on", !err);
}

/* ---------- Building the page ---------- */
function linksHTML(arr){
  return arr && arr.length ? `<div class="links">${arr.map(x=>`<a href="${esc(x.url)}" target="_blank" rel="noopener">${esc(x.label)} ↗</a>`).join("")}</div>` : "";
}
function linkLabel(url){ try { return new URL(url).hostname.replace(/^www\./, ""); } catch(e){ return "Link"; } }
function lessonHTML(l){
  const mine = isMine(l);
  const links = mine ? (l.url ? [{label: linkLabel(l.url), url: l.url}] : []) : l.links;
  return `<article class="lesson${mine ? " mine" : ""}" id="${l.id}">
    <div class="l-top">
      <div class="l-title">
        <span class="lnum">${mine ? "MY LESSON" : "LESSON " + l.id.slice(1)}</span>
        <h3>${esc(l.title)}</h3>
        <div class="chips"><span class="chip trk-${l.t}">${TRACK[l.t]}</span>${mine ? `<span class="chip mine-chip">Added by me</span>` : ""}</div>
      </div>
      <span class="status" id="st-${l.id}">Not started</span>
    </div>
    <div class="step" id="row-${l.id}-learn">
      <input type="checkbox" id="cb-${l.id}-learn" data-step="${l.id}-learn">
      <label for="cb-${l.id}-learn"><span class="kind">Learn</span><span class="txt">${esc(l.learn)}</span></label>
    </div>
    ${linksHTML(links)}
    <div class="step" id="row-${l.id}-apply">
      <input type="checkbox" id="cb-${l.id}-apply" data-step="${l.id}-apply">
      <label for="cb-${l.id}-apply"><span class="kind">Apply</span><span class="txt">${esc(l.apply)}</span></label>
    </div>
    ${linksHTML(l.applyLinks)}
    <details class="note"><summary>What did I learn?</summary>
      <textarea id="note-${l.id}" data-lesson="${l.id}" placeholder="One line is enough" aria-label="What did I learn? ${esc(l.title)}"></textarea>
    </details>
    ${mine ? `<div class="l-actions"><button type="button" data-edit="${l.id}">Edit</button><button type="button" class="danger" data-del="${l.id}">Delete</button></div>` : ""}
  </article>`;
}
function build(){
  const lessons = allLessons();
  $("weeks").innerHTML = WEEKS.map(w => {
    const ls = lessons.filter(l => l.w === w.n);
    return `<section class="week" style="--wc:${w.color}">
      <div class="week-head"><h2>${w.n<5?`Week ${w.n}: `:""}${esc(w.name)}</h2><span class="num" id="wk-count-${w.n}"></span></div>
      ${ls.map(lessonHTML).join("")}
      <button type="button" class="add-here" data-add-week="${w.n}">+ Add a lesson to ${w.n<5 ? "Week " + w.n : "Final"}</button>
    </section>`;
  }).join("");
  $("weekBars").innerHTML = WEEKS.map(w => `<div class="wk"><span>${WEEK_LABEL(w.n)}</span><div class="bar"><i id="wk-fill-${w.n}"></i></div></div>`).join("");
}

/* ---------- Updating numbers, ticks and statuses ---------- */
function render(){
  const lessons = allLessons();
  const steps = lessons.flatMap(stepsOf);
  const done = steps.filter(s => state.done[s]).length;
  const pct = steps.length ? Math.round(done / steps.length * 100) : 0;
  $("pct").textContent = pct + "%";
  $("doneCount").textContent = done;
  $("totalCount").textContent = steps.length;
  $("mainFill").style.width = pct + "%";
  $("mainBar").setAttribute("aria-valuenow", pct);
  WEEKS.forEach(w => {
    const ss = lessons.filter(l => l.w === w.n).flatMap(stepsOf);
    const d = ss.filter(s => state.done[s]).length;
    $("wk-fill-"+w.n).style.width = (ss.length ? d/ss.length*100 : 0) + "%";
    $("wk-count-"+w.n).textContent = d + "/" + ss.length;
  });
  lessons.forEach(l => {
    const a = !!state.done[l.id+"-learn"], b = !!state.done[l.id+"-apply"];
    ["learn","apply"].forEach((k,i) => {
      const v = i ? b : a;
      const cb = $("cb-"+l.id+"-"+k); if (cb.checked !== v) cb.checked = v;
      $("row-"+l.id+"-"+k).classList.toggle("checked", v);
    });
    const st = $("st-"+l.id);
    st.className = "status" + (a && b ? " active" : (a || b ? " learning" : ""));
    st.textContent = a && b ? "Active ✓" : (a || b ? "Learning" : "Not started");
    $(l.id).classList.toggle("done", a && b);
    const ta = $("note-"+l.id);
    if (document.activeElement !== ta) {
      const v = state.notes[l.id] || "";
      if (ta.value !== v) ta.value = v;
      if (v) ta.closest("details").open = true;
    }
  });
  const nx = lessons.find(l => !state.done[l.id+"-learn"] || !state.done[l.id+"-apply"]);
  $("next").innerHTML = nx
    ? `<span class="eyebrow">Next lesson</span><a href="#${nx.id}">${esc(lessonName(nx))}</a><span class="muted" style="font-size:.88rem">${!state.done[nx.id+"-learn"] ? "Start with the Learn step" : "Only the Apply step is left"}</span>`
    : `<span class="eyebrow">Curriculum complete</span><span>You finished all ${steps.length} steps. Go through the end-of-month review below.</span>`;
  if (state.startedAt) {
    const [y,m,d] = state.startedAt.split("-").map(Number);
    const t = new Date(); t.setHours(0,0,0,0);
    const days = Math.round((t - new Date(y, m-1, d)) / 864e5) + 1;
    $("dayInfo").innerHTML = days <= 30 ? `· Day <span class="num">${days}</span> of <span class="num">30</span>` : `· Started <span class="num">${days}</span> days ago`;
  } else $("dayInfo").textContent = "· Not started yet";
  renderLastBackup();
}
function rebuild(){ build(); render(); }

/* ---------- Small helpers: toast message and in-app confirm box ---------- */
let toastTimer;
function toast(msg){
  const t = $("toast"); t.textContent = msg; t.classList.add("show");
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove("show"), 2800);
}
function confirmBox(title, text, yes){
  return new Promise(resolve => {
    const d = $("confirmDlg");
    $("cfTitle").textContent = title; $("cfText").textContent = text; $("cfYes").textContent = yes;
    d.returnValue = "";
    d.addEventListener("close", () => resolve(d.returnValue === "yes"), {once:true});
    d.showModal();
  });
}

/* ---------- Your own lessons: add, edit, delete ---------- */
function openLessonForm(id, week){
  const f = $("lessonForm").elements, l = id ? state.custom.find(c => c.id === id) : null;
  editingId = l ? l.id : null;
  $("lessonForm").reset();
  $("dlgTitle").textContent = l ? "Edit your lesson" : "Add your own lesson";
  $("dlgSave").textContent = l ? "Save changes" : "Save lesson";
  $("formErr").hidden = true;
  f.title.value = l ? l.title : "";
  f.t.value = l ? l.t : (week === 5 ? "biz" : ["biz","ads","cre","brand"][(week||1)-1]);
  f.w.value = String(l ? l.w : (week || 1));
  f.learn.value = l ? l.learn : "";
  f.apply.value = l ? l.apply : "";
  f.url.value = l ? l.url : "";
  $("lessonDlg").showModal();
}
function submitLessonForm(e){
  e.preventDefault();
  const f = $("lessonForm").elements;
  const title = f.title.value.trim(), learn = f.learn.value.trim(), apply = f.apply.value.trim();
  const url = safeUrl(f.url.value);
  const err = !title ? "Give the lesson a title." : !learn ? "Write what you'll learn." : !apply ? "Write how you'll apply it." : url === null ? "That link doesn't look right. Check it or leave it empty." : "";
  if (err) { $("formErr").textContent = err; $("formErr").hidden = false; return; }
  const data = {title, t: f.t.value, w: Number(f.w.value), learn, apply, url};
  const wasEdit = !!editingId;
  let id = editingId;
  if (id) Object.assign(state.custom.find(c => c.id === id), data);
  else { id = newId(); state.custom.push({id, ...data}); }
  save(); rebuild();
  $("lessonDlg").close();
  toast(wasEdit ? "Lesson updated" : "Lesson added to " + WEEK_LABEL(data.w));
  requestAnimationFrame(() => $(id).scrollIntoView({behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block:"start"}));
}
async function deleteLesson(id){
  const l = state.custom.find(c => c.id === id);
  if (!l) return;
  if (!await confirmBox("Delete this lesson?", `"${l.title}" and its ticks and note will be deleted.`, "Yes, delete")) return;
  state.custom = state.custom.filter(c => c.id !== id);
  stepsOf(l).forEach(s => delete state.done[s]);
  delete state.notes[id];
  save(); rebuild(); toast("Lesson deleted");
}

/* ---------- Backup: export and import ---------- */
function renderLastBackup(){
  let last = null; try { last = localStorage.getItem(LS_EXPORTED); } catch(e){}
  $("lastBackup").textContent = last
    ? "Last backup: " + new Date(last).toLocaleDateString(undefined, {day:"numeric", month:"short", year:"numeric"})
    : "No backup yet. Export one after your first week.";
}
function markExported(){ try { localStorage.setItem(LS_EXPORTED, new Date().toISOString()); } catch(e){} renderLastBackup(); }
async function exportData(){
  const json = JSON.stringify({app:"loka-curriculum", version:1, exportedAt:new Date().toISOString(), data:state}, null, 2);
  const name = `loka-curriculum-backup-${localDate()}.json`;
  const file = new File([json], name, {type:"application/json"});
  // On phones, the share sheet lets you pick "Save to Files", Drive, WhatsApp, email…
  if (matchMedia("(pointer: coarse)").matches && navigator.canShare && navigator.canShare({files:[file]})) {
    try { await navigator.share({files:[file], title:"Loka curriculum backup"}); markExported(); toast("Backup saved"); return; }
    catch(e){ if (e.name === "AbortError") return; }
  }
  const a = document.createElement("a");
  a.href = URL.createObjectURL(file); a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  markExported(); toast("Backup downloaded: " + name);
}
async function importData(file){
  let data = null;
  try { data = normalize(JSON.parse(await file.text())); } catch(e){}
  if (!data) { toast("That file isn't a backup from this app."); return; }
  const lessons = [...LESSONS, ...data.custom];
  const ticked = lessons.flatMap(stepsOf).filter(s => data.done[s]).length;
  const notes = Object.values(data.notes).filter(Boolean).length;
  const ok = await confirmBox("Restore this backup?",
    `It has ${ticked} of ${lessons.length*2} steps ticked, ${notes} note${notes===1?"":"s"} and ${data.custom.length} lesson${data.custom.length===1?"":"s"} you added. Everything currently on this phone will be replaced.`,
    "Yes, restore");
  if (!ok) return;
  state = data;
  save(); rebuild(); toast("Backup restored");
  window.scrollTo({top:0});
}

/* ---------- Restart ---------- */
function resetAll(){
  state = {...emptyState(), custom: state.custom};
  document.querySelectorAll("details.note textarea").forEach(t => t.value = "");
  document.querySelectorAll("details.note").forEach(d => d.open = false);
  save(); render(); toast("Curriculum restarted");
}

/* ---------- Wiring up taps and typing ---------- */
const weeksEl = $("weeks");
weeksEl.addEventListener("change", e => {
  const t = e.target;
  if (t.matches("input[type=checkbox]")) {
    if (t.checked) state.done[t.dataset.step] = true; else delete state.done[t.dataset.step];
    if (!state.startedAt && t.checked) state.startedAt = localDate();
    render(); save();
  }
});
weeksEl.addEventListener("input", e => {
  const t = e.target;
  if (t.matches("textarea")) {
    if (t.value) state.notes[t.dataset.lesson] = t.value; else delete state.notes[t.dataset.lesson];
    save();
  }
});
document.addEventListener("click", e => {
  const b = e.target.closest("button[data-add-week],button[data-edit],button[data-del]");
  if (!b) return;
  if (b.dataset.addWeek) openLessonForm(null, Number(b.dataset.addWeek));
  else if (b.dataset.edit) openLessonForm(b.dataset.edit);
  else deleteLesson(b.dataset.del);
});
$("lessonForm").addEventListener("submit", submitLessonForm);
$("dlgCancel").addEventListener("click", () => $("lessonDlg").close());
$("lessonDlg").addEventListener("close", () => { editingId = null; });
$("exportBtn").addEventListener("click", exportData);
$("importBtn").addEventListener("click", () => $("importFile").click());
$("importFile").addEventListener("change", e => { const f = e.target.files[0]; e.target.value = ""; if (f) importData(f); });
$("resetBtn").addEventListener("click", () => { $("resetConfirm").hidden = false; $("resetBtn").hidden = true; });
$("resetNo").addEventListener("click", () => { $("resetConfirm").hidden = true; $("resetBtn").hidden = false; });
$("resetYes").addEventListener("click", () => { $("resetConfirm").hidden = true; $("resetBtn").hidden = false; resetAll(); });
addEventListener("online", () => setSync());
addEventListener("offline", () => setSync());
// Day counter rolls over at midnight even if the app stayed open
document.addEventListener("visibilitychange", () => { if (!document.hidden) render(); });

loadLocal();
rebuild();
setSync();

/* ---------- Offline support ---------- */
if ("serviceWorker" in navigator && location.protocol !== "file:") {
  let hadController = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (hadController) toast("App updated. Close and reopen it to see the new version.");
    hadController = true;
  });
  addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
}
// Ask the browser not to clear this app's data when the phone is low on space
if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
