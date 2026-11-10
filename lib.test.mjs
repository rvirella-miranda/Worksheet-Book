import test from "node:test";
import assert from "node:assert/strict";
import * as L from "../lib.js";

const names = [
"U4-01 Determining Slope from Linear Equations - Version A.pdf",
"U4-01 Determining Slope from Linear Equations - Version B.pdf",
"U4-02 Point-Slope Form - Version A.pdf",
"U4-02 Point-Slope Form - Version B.pdf",
"U4-03 Standard Form - Version A.pdf",
"U4-03 Standard Form - Version B.pdf",
"U4-04 Graphing Linear Equations - Version A.pdf",
"U4-04 Graphing Linear Equations - Version B.pdf",
"U4-05 Linear Equation Word Problems - Version A.pdf",
"U4-05 Linear Equation Word Problems - Version B.pdf",
"U4-06 Intro to Parallel & Perpendicular Lines - Version A.pdf",
"U4-06 Intro to Parallel & Perpendicular Lines - Version B.pdf",
"U4-07 Parallel Lines - Version A.pdf",
"U4-07 Parallel Lines - Version B.pdf",
"U4-08 Perpendicular Lines - Version A.pdf",
"U4-08 Perpendicular Lines - Version B.pdf",
"U4-09 Transformations of Linear Functions - Intro - Version A.pdf",
"U4-09 Transformations of Linear Functions - Intro - Version B.pdf",
"U4-10 Transformations of Linear Functions - Applications - Version A.pdf",
"U4-10 Transformations of Linear Functions - Applications - Version B.pdf",
"U4-11 Intro to Linear Inequalities - Version A.pdf",
"U4-11 Intro to Linear Inequalities - Version B.pdf",
"U4-12 Graphing Linear Inequalities - Version A.pdf",
"U4-12 Graphing Linear Inequalities - Version B.pdf",
"U4-13 Linear Inequalities from Graphs - Version A.pdf",
"U4-13 Linear Inequalities from Graphs - Version B.pdf",
"U4-14 Linear Inequality Word Problems - Version A.pdf",
"U4-14 Linear Inequality Word Problems - Version B.pdf",
"U4-15 Scatter Plots and Line of Best Fit - Version A.pdf",
"U4-15 Scatter Plots and Line of Best Fit - Version B.pdf"
];

test("all 30 Unit 4 file names parse", () => {
  const { ok, rejected } = L.planUpload(names);
  assert.equal(rejected.length, 0, JSON.stringify(rejected));
  assert.equal(ok.length, 30);
  assert.equal(new Set(ok.map(o => o.lessonId)).size, 15);
});

test("hyphenated titles keep their hyphen", () => {
  const p = L.parseSheetFilename("U4-09 Transformations of Linear Functions - Intro - Version B.pdf");
  assert.equal(p.title, "Transformations of Linear Functions - Intro");
  assert.equal(p.label, "Version B");
  assert.equal(p.sheetId, "u4-09-version-b");
  const q = L.parseSheetFilename("U4-02 Point-Slope Form - Version A.pdf");
  assert.equal(q.title, "Point-Slope Form");
});

test("ampersand titles and ids are safe", () => {
  const p = L.parseSheetFilename("U4-06 Intro to Parallel & Perpendicular Lines - Version A.pdf");
  assert.equal(p.title, "Intro to Parallel & Perpendicular Lines");
  assert.match(p.sheetId, /^[a-z0-9-]+$/);
});

test("bad names rejected, duplicates rejected", () => {
  const { ok, rejected } = L.planUpload(["random.pdf", "U4-01 X - Version A.pdf", "u4-01 X - version a.PDF"]);
  assert.equal(ok.length, 1);
  assert.equal(rejected.length, 2);
});

test("units sort numerically", () => {
  assert.deepEqual(["10","2","9"].sort(L.compareUnits), ["2","9","10"]);
});

const book = {
  units: { "4": "Linear Functions" },
  lessons: {
    "u4-02": { unit: "4", num: 2, title: "B", sheets: { "u4-02-version-b": { label: "Version B", order: 1 }, "u4-02-version-a": { label: "Version A", order: 0 } } },
    "u4-01": { unit: "4", num: 1, title: "A", sheets: { "u4-01-version-a": { label: "Version A", order: 0 } } },
    "u5-01": { unit: "5", num: 1, title: "C", sheets: { "u5-01-version-a": { label: "Version A", order: 0 } } },
  },
  released: { "u4-02-version-b": true, "u4-01-version-a": false },
};

test("groupLessons orders units, lessons and sheets", () => {
  const g = L.groupLessons(book);
  assert.deepEqual(g.map(x => x.unit), ["4", "5"]);
  assert.equal(g[0].unitTitle, "Linear Functions");
  assert.equal(g[1].unitTitle, "Unit 5");
  assert.deepEqual(g[0].lessons.map(l => l.id), ["u4-01", "u4-02"]);
  assert.deepEqual(g[0].lessons[1].sheetList.map(s => s.label), ["Version A", "Version B"]);
});

test("release logic", () => {
  const g = L.groupLessons(book);
  assert.equal(L.isReleased(book, "u4-01-version-a"), false);
  assert.equal(L.isReleased(book, "u4-02-version-b"), true);
  assert.equal(L.isReleased(book, "nope"), false);
  assert.equal(L.lessonOpen(book, g[0].lessons[0]), false);
  assert.equal(L.lessonOpen(book, g[0].lessons[1]), true);
  assert.equal(L.defaultUnit(book, g), "4");
  assert.equal(L.defaultUnit({ ...book, released: {} }, g), "4");
  assert.equal(L.defaultUnit({ ...book, released: { "u5-01-version-a": true } }, g), "5");
});

test("findSheet and empty book", () => {
  assert.equal(L.findSheet(book, "u4-02-version-a").lessonId, "u4-02");
  assert.equal(L.findSheet(book, "zzz"), null);
  assert.deepEqual(L.groupLessons({}), []);
  assert.deepEqual(L.groupLessons(null), []);
  assert.equal(L.defaultUnit({}, []), null);
});
