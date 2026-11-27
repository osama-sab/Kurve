# How Kurve is built from 27.11: quality before features

Written after the user's reports of 27.11. Seven reports in one message, each found in an hour of
ordinary work, against an app whose suite passed 3 000 checks the same morning. This document says
why that happened, what changes in the way the work is done, and what is done next. It replaces
"the next slice" as the default next step: features wait until the stabilisation below is through
its exit criteria.

## 1. The reports and their causes

Each was reproduced in a browser the way it was reported (the file picker, clicks, the menus),
before any code was read. `tools/review-drive.mjs`, section 27.11, keeps them.

| Report | Cause found | Kind of mistake |
|---|---|---|
| A sheet added in a subfolder lands at the top | Fifteen commands filed what they made into the active folder, each by calling `xNew`; the worksheet's **+** never did | A rule written as a habit at call sites, not once where it holds |
| Importing to a new sheet in another subfolder moves the other sheets | Every import also filed **the sheet it added to**, an existing one, into the folder selected | The same rule applied to the wrong thing; nothing checked that an existing item never moves |
| The first import loses the sheets and folders made before it | Four import paths each decided "a fresh project" by "no values yet" and then replaced it, sheets and all | One policy written four times, each time too narrowly |
| One click highlights a sheet but does not show it | A decision of 11.10, when the Explorer was made (select on one click, open on two, so that a redraw would not swallow the double click), never tried against a person | A local technical constraint chosen over the user's model |
| Subtract background fails with same-named columns on other sheets | The worksheet's selection is not what commands act on: the Tool took the "active column" (the last imported, on another sheet), and every list said "Intensity" three times | Two notions of "what I am working on", and names that are not unique shown as if they were |
| Combine every graph into a new graph keeps three | The Combine dialog leaves the graph in front unticked even when the target is a new graph; the desk shows two or three graph windows at a time, so dragging reaches only those | A default written for one target and kept for the other; not reproduced as "exactly three" |
| Sheets in different folders are "linked" | A project has **one workbook**. Folders are labels over a flat list of sheets, and opening any sheet shows every sheet's tab. Origin and Excel have many workbooks, each with its own sheets, each filed where it belongs | The data model never grew with what was built on it |

Four of the seven are the same shape: a policy (where new things go, what is fresh, what a command
acts on, what a name means) that exists in several places, each copy right for the case its author
had in mind. The last one is the model under all of them.

## 2. Why the tests did not find them

The numbers below were counted on 27.11.

1. **The tests drive the code, not the app.** The browser drives make 2 910 `evaluate` calls and
   1 328 clicks, key presses and fills. Most of the evaluates *do* something: `doImport()`,
   `newSheet()`, `openTool(op)`, `setActiveCol(id)`. A test that calls `openTool` with the column
   it wants can never find that the menu takes another one. The reports were all on the path
   between a person's action and the function, which is the path the tests skip.
2. **Every test starts from a blank project.** One sheet, unique column names, a graph or two,
   nothing set up first. A person's project is lived in: folders made before files, a dozen files
   from one instrument with the same column names, many graphs, an analysis, last week's sheets.
   Two drives make a folder; none imports into one through the dialog.
3. **Each slice was judged against its own specification.** A slice asked "does this feature do what
   its spec says?" and answered with tests written by the same hand as the feature. Nobody asked how
   it meets the twenty features already there (folders × imports × sheets × the active column). The
   interactions had no owner, and the specification's author is the worst person to find what it
   left out.
4. **Rigour went where it is easiest to measure.** The numerics are checked against 40-digit
   references, NIST and SciPy, to the last bit. The document structure, the selection and the
   windows, which a person touches in the first minute, were checked by scripted happy paths. The
   effort was real, and pointed at the part least likely to fail.
5. **The model did not grow with the features.** The Explorer's folders (11.10), sheets (22.10),
   sheet windows (14.11), several selected (25.11) were each built on "a project is one workbook",
   and each worked around it a little more. The Explorer looks like Origin's; the thing under it is
   not, and a person reads the Explorer, not the code.
6. **Pace was counted in slices.** 148 commits since 1 November, a wave a few days. "Done" meant the
   slice's tests passed and its documents were written, not that someone did a morning's work with
   it. Breadth outran integration.

None of this is a bug in one place. It is a way of working that produces this kind of bug, and the
remedy is a different way of working.

## 3. The new way of working

**3.1 A story first, through the interface.** Every change starts from a person's task written as
the steps they take ("make a folder per sample, drop twelve files into each, subtract the background
of the third, combine every graph"). Its test is that story in a browser: clicks, keys, the file
picker, drops, the menus. In these flow tests `evaluate` only *reads* state; it never calls a
function that changes the project. The flows live in `tools/flows/`, and a check (`tools/flows/lint.mjs`)
refuses an `evaluate` there that calls a function from the list of commands.

**3.2 A lived-in project.** The flows and the fuzzers start from projects that look used: folders
with sheets in them, files with the same column names on several sheets, ten graphs, a figure, a
fit, an analysis, hidden columns, a filter, rows sorted. Made once by a flow and kept as `.kurve`
files in `tools/flows/fixtures/`. Most of 27.11's bugs need such a project to show.

**3.3 Invariants, checked after every action.** The document's rules, written once as code
(`projCheck(p)`, pure, in a block of its own) and run after every step of every drive, fuzzer and
lab day:

- every folder entry names an item that exists, every item is in at most one folder, no folder is
  inside itself;
- every sheet belongs to one book, every column to one sheet, every error column's owner exists;
- the active column exists, is a Y column and is in the project;
- every graph's curves exist; every annotation's graph exists;
- names shown are unique or told apart;
- and for the interface: what the Explorer highlights is what is shown; a command's subject is
  what is selected; the toast and the log name the same thing.

A violation fails the run with the action that caused it.

**3.4 The interaction checklist.** A slice's plan lists what it meets, and its tests cover each, or
say why it is not affected: folders, several sheets and books, same names, several graphs and
figures, undo and redo, two tabs, a reload, a project file, a big table, a phone's width, the
history off, a read-only project.

**3.5 One rule in one place.** A policy is written once and everything goes through it: where new
things are filed (`xFileRule`), whether a project is blank (`projBlank`), what a message is
(`toastKind`), what a command acts on (`wsHandCol`), how a column is named (`specName`). A bug found
in one copy of a policy is fixed by removing the copies. The code review of a slice asks "is this a
policy, and is it already written somewhere?"

**3.6 A bug is a class.** Before the fix: a failing flow test of the report as made; then a search
for every place with the same shape (27.11: four "fresh" tests, fifteen `xNew` calls, 536 messages);
then the fix of the class; then the test passes and the siblings have tests of their own.

**3.7 Bug bash before features.** Before a wave and after each slice of the document's structure: an
hour of real work in the browser with real files (the examples, qudi's scans, a gamma spectrum, a
folder of CSV exports), by me through the interface as a person would, writing down every surprise;
the user's sessions the same. Surprises are triaged before the next feature.

**3.8 The model as its own layer.** The document's operations (make a book, a sheet, a folder;
import into; move; delete; combine) become pure functions of a project that keep the invariants,
tested in node as the numerics are, and the interface calls them. Not a rewrite: a block like
NUMERICS, beginning with the structure where the bugs are (books, sheets, folders, graphs), the
rest moving in as it is touched.

**3.9 Done means used.** A slice is done when its story passes through the interface, the
invariants hold through the fuzzers and a lab day biased to it (`BIAS=`), its checklist is ticked,
its screenshots are looked at, and then its documents are written. Progress is counted in stories
that work end to end, not slices shipped.

## 4. Stabilisation, in order

Features stop here (wave 7 at 7.6, its code kept and its documents to come; waves 8 to 11 wait).

**S.1 The reports of 27.11** (done the same day). Everything made goes into the folder selected,
by one rule in `save`, and nothing that exists moves; only a blank project is replaced by an import;
one click in the Explorer opens; the menus act on the column selected in the worksheet; two columns
of one name are named apart by where they are ("Intensity (s2!B)"); Combine onto a new graph takes
every graph; Preferences › Messages, off by default (what only reports an action goes to the status
bar with its button; warnings, refusals and errors still pop up). `tools/review-drive.mjs` 27.11.

**S.2 Invariants and the lived-in projects.** `projCheck`, the flows' folder, the lint, the
fixtures; `projCheck` run in every drive's `page()` after each step, in the fuzzer and the lab day.
What it finds is fixed before S.3.

**S.3 Workbooks.** The model Origin and Excel have:

- a project holds **books**; a book holds its sheets and is one window, with tabs of its own sheets
  only, and is filed in a folder as a whole (a sheet goes where its book goes);
- the Explorer lists books, each opening to its sheets; a new book from the Explorer, the File
  menu, a folder's menu, and an import;
- a formula reads its own book's sheets by `Sheet2!B`, another book's by `[Book2]Sheet2!B`;
  constants stay the project's;
- graphs plot columns from any book; Plot setup lists books, then sheets;
- the one live grid goes into the window of the book in front (as the sheet windows do now, which
  become books of one sheet);
- an old project opens with its sheets grouped by the folder each was in: each folder's sheets one
  book in that folder, the top level's one book, so nothing moves on screen;
- undo, two tabs, project files, Excel files (a workbook is a book), the report and the check code
  know books.

Its own specification (`ux/spec/BOOK_SPEC.md`) comes first, with its decisions, and its flows.

**S.4 Importing many files.** One dialog for one file or many (it replaces the batch dialog): a row
per file (its name, rows, columns, X range, what was detected) and, for each, where it goes: a
**folder**, a **book** and a **sheet**, each New, one that exists, or a name typed (rows typed the
same name go together). Rows selected together are set together. Above the table, arrangements in
one click:

- one sheet each (the default), all on one sheet (one X shared when they share it), one book each;
- grouped by their names (`sampleA_01`, `sampleA_02` → sheet *sampleA*; the part that groups is
  shown and can be changed);
- grouped by a header field the files have (Sample, Temperature);
- as the folders they were dropped in (a folder dropped keeps its tree).

Beside the table, the tree as it will be after Import: the folders, books and sheets, the new ones
marked. One undo step, one record entry. The arrangement chosen is remembered per project. The
reading settings (delimiter, decimal mark, which columns) are shared, with *Read it differently* per
file.

**S.5 One subject.** One selection shared by the Explorer, the worksheet and the graph, which every
command reads (S.1 made the menus read the worksheet's; the Explorer's and the graph's join it); the
status bar names it (*Working on Intensity (s2!B)*); choosing what to work on is never an undo step
and never brings another window forward by itself.

**S.6 A bug bash on all of it,** then the lab day for 40 minutes with `BIAS` on books, imports and
the Explorer; then the suite. The exit criteria: every flow passes, no invariant broken in three
seeds of the fuzzer and one lab day, nothing found in the bug bash left open.

Then wave 7 resumes at 7.6's documents, under the rules of §3.
