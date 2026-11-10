# Worksheet Book: setup guide

A digital worksheet book for GitHub Pages + Google Sites. Students see every lesson in the
unit, but a worksheet only opens after you switch it on in the teacher panel. The lock is
enforced by Firebase security rules, so a closed worksheet can't be reached by guessing a link.

Everything runs on Firebase's free Spark plan (no credit card). Worksheet pages are stored
as images in Firestore, because Firebase Cloud Storage now requires the paid Blaze plan.

## Files

| File | What it is |
|---|---|
| `index.html` | The student book (embed this in Google Sites) |
| `teacher.html` | Your control panel (open directly, never embed) |
| `config.js` | Your Firebase settings and email (**edit this**) |
| `firestore.rules` | Security rules (**edit the email, then paste into Firebase**) |
| `lib.js`, `styles.css` | Shared code and styling |
| `tests/` | Node tests: `node --test tests/*.mjs` |

## One-time setup (about 20 minutes)

**1. Create a Firebase project.** console.firebase.google.com → Add project. Use a new
project, separate from Growing Portfolios and Junior Bank, so rules and quotas don't mix.
Analytics is not needed.

**2. Register a web app.** Project settings (gear) → General → Your apps → Web (`</>`).
Copy the `apiKey`, `authDomain`, `projectId` and `appId` values into `config.js`.
(The apiKey is meant to be public. The security rules are what protect the worksheets.)

**3. Turn on Google sign-in.** Build → Authentication → Get started → Sign-in method →
Google → Enable. Then Settings → Authorized domains → Add domain → `YOURNAME.github.io`.

**4. Create Firestore and publish the rules.** Build → Firestore Database → Create database →
production mode → a US location (e.g. `us-central1`). Open the Rules tab, paste all of
`firestore.rules`, replace `YOUR.EMAIL@school.org` with your Google account, and click
Publish. Put the same email in `TEACHER_EMAILS` in `config.js`.

> If your school Google account won't sign in (some districts block outside apps),
> use a personal Gmail in both places instead.

**5. Put the site on GitHub Pages.** New repository → upload `index.html`, `teacher.html`,
`config.js`, `lib.js`, `styles.css` (the rules, README and tests can go in too; they're
harmless). Settings → Pages → Deploy from branch → `main` / root. Your links will be:

- Student book: `https://YOURNAME.github.io/REPO/`
- Teacher panel: `https://YOURNAME.github.io/REPO/teacher.html`

**Never upload answer keys to the repo or the panel.** A public repo can be read by anyone.

**6. Load Unit 4.** Open the teacher panel, sign in, and drag all 30 PDFs from
`Unit4_Worksheets_NoKeys` onto the upload box. Give the unit a title (e.g.
"Unit 4: Linear Functions") and click Upload. Everything starts closed.

**7. Embed in Google Sites.** Insert → Embed → By URL → paste the student book link →
Whole page. Drag the embed tall enough to read a worksheet.

**8. Test the lock.** In the panel, open one worksheet and click Copy link on a *closed*
one. Paste that link into an Incognito window. It should say "This worksheet isn't open
yet." Then switch it on: the Incognito window opens it by itself within a second or two.

## Day to day

- **Assign:** flip the switch for Version A (and/or B). Students' pages update live.
- **Link to one worksheet:** Copy link, then paste it into Google Classroom.
- **Preview a closed worksheet:** click Preview while signed in to the panel.
- **Fix a worksheet:** upload a PDF with the same file name. It replaces the old one
  and keeps its switch setting.
- **New unit:** name files `U5-01 Lesson Title - Version A.pdf` and upload. The book gets
  a unit tab automatically.
- **A second course:** add `?book=prealgebra` to both links to get a separate book with its
  own switches (e.g. `teacher.html?book=prealgebra`).

## Good to know

- **One set of switches per book.** All class periods using the same link see the same
  releases. If periods move at different paces, give each its own `?book=` id.
- **Free-plan room:** each worksheet page is about 0.3 MB. Unit 4 uses roughly 20 MB of the
  1 GB free storage. Each student opening a 2-page worksheet uses about 0.6 MB of the
  10 GB/month free download allowance, which covers well over 10,000 worksheet views a month.
- **Printing:** the Print button prints just the worksheet pages. If printing is blocked
  inside Google Sites, use "Open in new tab" first.
- **Google sign-in doesn't work inside an embed.** That's why the teacher panel is opened
  on its own.
