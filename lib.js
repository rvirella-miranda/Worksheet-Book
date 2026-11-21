// Pure helper functions shared by the student book and the teacher panel.
// No Firebase or browser code in here, so they can be tested with Node.

export function slugify(text) {
  return String(text)
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function lessonIdFor(unit, num) {
  return `u${slugify(unit)}-${String(num).padStart(2, "0")}`;
}

export function sheetIdFor(lessonId, label) {
  return `${lessonId}-${slugify(label)}`;
}

// Expected file name:  U4-01 Point-Slope Form - Version A.pdf
//   unit = "4", num = 1, title = "Point-Slope Form", label = "Version A"
// The LAST " - " separates the title from the sheet label, so titles may
// contain hyphens ("Transformations of Linear Functions - Intro").
const FILE_RE = /^U([A-Za-z0-9]+)-(\d{1,3})\s+(.+)\s+-\s+([^-]+?)\.pdf$/i;

export function parseSheetFilename(name) {
  const m = FILE_RE.exec(String(name).trim());
  if (!m) return null;
  const [, unit, numStr, title, label] = m;
  const num = parseInt(numStr, 10);
  const lessonId = lessonIdFor(unit, num);
  return {
    unit,
    num,
    title: title.trim(),
    label: label.trim(),
    lessonId,
    sheetId: sheetIdFor(lessonId, label.trim()),
  };
}

// Natural-ish comparison so unit "10" sorts after unit "9".
export function compareUnits(a, b) {
  const na = Number(a), nb = Number(b);
  if (!Number.isNaN(na) && !Number.isNaN(nb)) return na - nb;
  return String(a).localeCompare(String(b));
}

// book.lessons is a map { lessonId: {unit, num, title, sheets:{sheetId:{label,pages,order}}} }
// Returns [{unit, unitTitle, lessons:[{id, ...lesson, sheetList:[{id,...}]}]}] in order.
export function groupLessons(book) {
  const lessons = (book && book.lessons) || {};
  const unitTitles = (book && book.units) || {};
  const byUnit = new Map();
  for (const [id, l] of Object.entries(lessons)) {
    if (!l) continue;
    const sheetList = Object.entries(l.sheets || {})
      .map(([sid, s]) => ({ id: sid, ...s }))
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || a.label.localeCompare(b.label));
    const entry = { id, ...l, sheetList };
    if (!byUnit.has(l.unit)) byUnit.set(l.unit, []);
    byUnit.get(l.unit).push(entry);
  }
  return [...byUnit.keys()].sort(compareUnits).map((unit) => ({
    unit,
    unitTitle: unitTitles[unit] || `Unit ${unit}`,
    lessons: byUnit.get(unit).sort((a, b) => a.num - b.num),
  }));
}

export function isReleased(book, sheetId) {
  return !!(book && book.released && book.released[sheetId] === true);
}

export function lessonOpen(book, lesson) {
  return lesson.sheetList.some((s) => isReleased(book, s.id))
    || !!(lesson.ticket && isReleased(book, `${lesson.id}-exit-ticket`));
}

// Which unit the student book should show first: the latest unit with anything
// released, otherwise the first unit.
export function defaultUnit(book, groups) {
  let pick = groups.length ? groups[0].unit : null;
  for (const g of groups) {
    if (g.lessons.some((l) => lessonOpen(book, l))) pick = g.unit;
  }
  return pick;
}

// Find a sheet anywhere in the book by id.
export function findSheet(book, sheetId) {
  for (const [lid, l] of Object.entries((book && book.lessons) || {})) {
    if (l && l.sheets && l.sheets[sheetId]) {
      return { lessonId: lid, lesson: l, sheet: l.sheets[sheetId] };
    }
  }
  return null;
}

// Group parsed upload files into lessons, flagging problems.
export function planUpload(fileNames) {
  const ok = [];
  const rejected = [];
  const seen = new Set();
  for (const name of fileNames) {
    const p = parseSheetFilename(name);
    if (!p) { rejected.push({ name, reason: "Name doesn't match the pattern" }); continue; }
    if (seen.has(p.sheetId)) { rejected.push({ name, reason: "Duplicate of another file" }); continue; }
    seen.add(p.sheetId);
    ok.push({ name, ...p });
  }
  ok.sort((a, b) => compareUnits(a.unit, b.unit) || a.num - b.num || a.label.localeCompare(b.label));
  return { ok, rejected };
}

// Keep a Firestore document under the 1 MiB limit (leave headroom for fields).
export const MAX_IMAGE_CHARS = 900_000;

// ---------------------------------------------------------------------------
// Exit tickets
// ---------------------------------------------------------------------------
export const TICKET_SUFFIX = "-exit-ticket";
export const ticketIdFor = (lessonId) => `${lessonId}${TICKET_SUFFIX}`;
export const isTicketId = (id) => typeof id === "string" && id.endsWith(TICKET_SUFFIX);
export const lessonIdFromTicket = (id) => id.slice(0, -TICKET_SUFFIX.length);

export const RATINGS = [
  { value: 4, label: "I could teach this" },
  { value: 3, label: "I\u2019ve got it" },
  { value: 2, label: "Getting there" },
  { value: 1, label: "I need help" },
];
export const ratingLabel = (v) => (RATINGS.find((r) => r.value === v) || {}).label || "";

export function ticketReleased(book, lessonId) {
  const l = book && book.lessons && book.lessons[lessonId];
  return !!(l && l.ticket && isReleased(book, ticketIdFor(lessonId)));
}

// Firestore documents max out at 1 MiB; leave headroom.
export const MAX_TICKET_CHARS = 900_000;
// Picture budgets used by the teacher panel when shrinking uploads.
export const IMAGE_BUDGET = { question: { maxW: 1000, chars: 380_000 }, choice: { maxW: 520, chars: 120_000 } };

// Limits shared with firestore.rules
export const LIMITS = { name: 60, period: 30, summary: 2000, explain: 2000 };

// Checks an exit-ticket pack (the JSON file uploaded in the teacher panel).
// Returns { ok: [{lessonId, ticket, key}], errors: [string] }.
export function validateTicketPack(pack) {
  const ok = [], errors = [];
  if (!pack || typeof pack !== "object" || typeof pack.tickets !== "object") {
    return { ok, errors: ["This file isn\u2019t an exit-ticket pack."] };
  }
  for (const [lessonId, t] of Object.entries(pack.tickets)) {
    const where = `Lesson ${lessonId}`;
    if (!/^u[a-z0-9]+-\d{2,3}$/.test(lessonId)) { errors.push(`${where}: bad lesson id`); continue; }
    if (!t || typeof t.summary !== "string" || !t.summary.trim()) { errors.push(`${where}: missing summary prompt`); continue; }
    const q = t.question;
    if (!q || typeof q.stem !== "string" || !q.stem.trim()) { errors.push(`${where}: missing question`); continue; }
    const letters = q.choices ? Object.keys(q.choices) : [];
    if (letters.length && (letters.length < 2 || letters.some((k) => !/^[A-F]$/.test(k)))) {
      errors.push(`${where}: choices must be lettered A\u2013F`); continue;
    }
    const isImg = (v) => typeof v === "string" && /^data:image\/(svg\+xml|png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(v);
    if (q.image && !isImg(q.image)) { errors.push(`${where}: image must be a data URL`); continue; }
    const ci = q.choiceImages || {};
    if (Object.entries(ci).some(([k, v]) => !letters.includes(k) || !isImg(v))) { errors.push(`${where}: answer-choice pictures must match a lettered choice`); continue; }
    if (letters.some((k) => typeof q.choices[k] !== "string" || (!q.choices[k].trim() && !ci[k]))) { errors.push(`${where}: every answer choice needs text or a picture`); continue; }
    const k = t.key || {};
    if (letters.length && !letters.includes(k.correct)) { errors.push(`${where}: answer key doesn\u2019t match a choice`); continue; }
    ok.push({
      lessonId,
      ticket: {
        summary: t.summary.trim(),
        question: {
          stem: q.stem.trim(),
          ...(q.image ? { image: q.image, imageAlt: String(q.imageAlt || "Picture for this question").trim().slice(0, 200) } : {}),
          ...(letters.length ? { choices: q.choices } : {}),
          ...(letters.length && Object.keys(ci).length ? { choiceImages: ci } : {}),
          explain: (q.explain || "Explain your thinking.").trim(),
        },
      },
      key: { correct: k.correct || "", why: k.why || "", wrong: k.wrong || {} },
    });
    const size = JSON.stringify(ok[ok.length - 1].ticket).length;
    if (size > MAX_TICKET_CHARS) {
      ok.pop();
      errors.push(`${where}: pictures are too large together (${Math.round(size / 1000)} KB; limit ${Math.round(MAX_TICKET_CHARS / 1000)} KB). Use fewer or smaller pictures.`);
    }
  }
  ok.sort((a, b) => a.lessonId.localeCompare(b.lessonId));
  return { ok, errors };
}

// Tallies for the teacher's results view.
export function summarizeResponses(responses, key) {
  const ratings = { 4: 0, 3: 0, 2: 0, 1: 0 };
  const choices = {};
  let correct = 0, answered = 0;
  for (const r of responses) {
    if (ratings[r.rating] !== undefined) ratings[r.rating]++;
    if (r.choice) {
      choices[r.choice] = (choices[r.choice] || 0) + 1;
      answered++;
      if (key && r.choice === key.correct) correct++;
    }
  }
  return { total: responses.length, ratings, choices, correct, answered };
}

// Latest response per student (by name + period, case-insensitive).
export function latestPerStudent(responses) {
  const map = new Map();
  for (const r of responses) {
    const k = r.studentId ? `id:${r.studentId}` : `${(r.name || "").trim().toLowerCase()}|${(r.period || "").toLowerCase()}`;
    const prev = map.get(k);
    if (!prev || (r.createdAt || 0) > (prev.createdAt || 0)) map.set(k, r);
  }
  return [...map.values()];
}

export function toCSV(rows) {
  const cell = (v) => {
    const s = String(v ?? "");
    const safe = /^[=+\-@]/.test(s) ? `'${s}` : s;   // keep spreadsheets from running formulas
    return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
  };
  return rows.map((r) => r.map(cell).join(",")).join("\r\n");
}

// ---------------------------------------------------------------------------
// Class roster (students pick their name; one response per exit ticket)
// ---------------------------------------------------------------------------
export const ROSTER_LIMITS = { name: 40, students: 400 };

// Response documents use a fixed id, so a second submission from the same
// student is a write to an existing document, which the rules refuse.
export const responseIdFor = (lessonId, studentId) => `${lessonId}__${studentId}`;

export function newStudentId(rand = Math.random) {
  const abc = "abcdefghijkmnpqrstuvwxyz23456789";
  let s = "s";
  for (let i = 0; i < 8; i++) s += abc[Math.floor(rand() * abc.length)];
  return s;
}

// textByPeriod: { "3rd": "Ana L.\nBen O.", ... }  ("" key when there are no periods)
// existing: current roster.students map, so students who stay keep their id.
// Returns { students, problems }.
export function buildRoster(textByPeriod, existing = {}, idGen = newStudentId) {
  const students = {}, problems = [];
  const byKey = new Map(Object.entries(existing || {}).map(([id, s]) => [`${(s.period || "")}|${s.name.trim().toLowerCase()}`, id]));
  const taken = new Set();
  let count = 0;
  for (const [period, text] of Object.entries(textByPeriod || {})) {
    const seen = new Set();
    for (const raw of String(text || "").split(/\r?\n/)) {
      const name = raw.replace(/\t+/g, " ").replace(/\s+/g, " ").trim();
      if (!name) continue;
      if (name.length > ROSTER_LIMITS.name) { problems.push(`“${name.slice(0, 20)}…” is longer than ${ROSTER_LIMITS.name} characters.`); continue; }
      const k = name.toLowerCase();
      if (seen.has(k)) { problems.push(`${name} is listed twice${period ? ` in ${period}` : ""}.`); continue; }
      seen.add(k);
      if (++count > ROSTER_LIMITS.students) { problems.push(`Rosters are limited to ${ROSTER_LIMITS.students} students.`); break; }
      let id = byKey.get(`${period}|${k}`);
      while (!id || taken.has(id)) id = idGen();
      taken.add(id);
      students[id] = { name, period };
    }
  }
  return { students, problems };
}

export function rosterText(students, period) {
  return Object.values(students || {}).filter((s) => (s.period || "") === (period || ""))
    .map((s) => s.name).sort((a, b) => a.localeCompare(b)).join("\n");
}

export function rosterList(students, period) {
  return Object.entries(students || {})
    .filter(([, s]) => period == null || (s.period || "") === period)
    .map(([id, s]) => ({ id, ...s }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

// Who turned in and who didn't, for one exit ticket (optionally one period).
export function participation(students, responses, period) {
  const roster = rosterList(students, period ?? null).filter((s) => !period || s.period === period);
  const done = new Set(responses.filter((r) => r.studentId).map((r) => r.studentId));
  return {
    total: roster.length,
    turnedIn: roster.filter((s) => done.has(s.id)),
    missing: roster.filter((s) => !done.has(s.id)),
  };
}

// ---------------------------------------------------------------------------
// Refresher links (Khan Academy, YouTube, etc.) shown before each worksheet
// ---------------------------------------------------------------------------
export const LINK_LIMITS = { perLesson: 5, title: 80, url: 500 };

export function siteName(host) {
  const h = host.replace(/^www\./, "").replace(/^m\./, "");
  if (/(^|\.)khanacademy\.org$/.test(h)) return "Khan Academy";
  if (/(^|\.)youtube\.com$/.test(h) || h === "youtu.be" || /(^|\.)youtube-nocookie\.com$/.test(h)) return "YouTube";
  if (/(^|\.)google\.com$/.test(h)) return "Google";
  return h;
}

// Returns { link: {url, title, site} } or { error }.
export function cleanLink(rawUrl, rawTitle = "") {
  let s = String(rawUrl || "").trim();
  if (!s) return { error: "Paste a link." };
  if (!/^[a-z][a-z0-9+.-]*:/i.test(s)) s = "https://" + s;          // “youtube.com/watch…” is fine
  let u;
  try { u = new URL(s); } catch { return { error: "That doesn’t look like a web link." }; }
  if (u.protocol !== "https:" && u.protocol !== "http:") return { error: "Only web links (http or https) can be added." };
  if (!u.hostname.includes(".")) return { error: "That doesn’t look like a web link." };
  const url = u.toString();
  if (url.length > LINK_LIMITS.url) return { error: "That link is too long." };
  const site = siteName(u.hostname);
  const kind = site === "YouTube" ? "YouTube video" : site;
  const title = String(rawTitle || "").replace(/\s+/g, " ").trim().slice(0, LINK_LIMITS.title) || kind;
  return { link: { url, title, site } };
}

// Links stored on a lesson, re-checked before showing them to students.
export function safeLinks(lesson) {
  return ((lesson && lesson.links) || []).slice(0, LINK_LIMITS.perLesson)
    .map((l) => cleanLink(l && l.url, l && l.title).link).filter(Boolean);
}
