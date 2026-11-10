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
  return lesson.sheetList.some((s) => isReleased(book, s.id));
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
