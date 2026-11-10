// ===== Edit these values (see README.md, steps 1-4) =====

// From Firebase console > Project settings > General > Your apps > Web app > Config
export const firebaseConfig = {
  apiKey: "AIzaSyANYS4BNBwhJn2DQ6cMhmTOuLOT_RkqLUA",
  authDomain: "worksheet-book.firebaseapp.com",
  projectId: "worksheet-book",
  storageBucket: "worksheet-book.firebasestorage.app",
  messagingSenderId: "570161526394",
  appId: "1:570161526394:web:31b06e8e611bbbc2336dc3",
};

// Which book this site shows. Use a different id per course if you want
// separate books (e.g. "algebra1" and "prealgebra"); add ?book=prealgebra to the URL.
export const DEFAULT_BOOK_ID = "algebra1";
export const DEFAULT_BOOK_TITLE = "Algebra 1 Worksheet Book";

// Must match the email(s) in firestore.rules.
export const TEACHER_EMAILS = ["r.miranda@ascensionoakpark.com"];
