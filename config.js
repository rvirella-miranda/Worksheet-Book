// ===== Edit these values (see README.md, steps 1-4) =====

// From Firebase console > Project settings > General > Your apps > Web app > Config
export const firebaseConfig = {
  apiKey: "PASTE-YOURS",
  authDomain: "PASTE-YOURS.firebaseapp.com",
  projectId: "PASTE-YOURS",
  appId: "PASTE-YOURS",
};

// Which book this site shows. Use a different id per course if you want
// separate books (e.g. "algebra1" and "prealgebra"); add ?book=prealgebra to the URL.
export const DEFAULT_BOOK_ID = "algebra1";
export const DEFAULT_BOOK_TITLE = "Algebra 1 Worksheet Book";

// Must match the email(s) in firestore.rules.
export const TEACHER_EMAILS = ["YOUR.EMAIL@school.org"];
