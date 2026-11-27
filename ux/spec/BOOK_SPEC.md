# Workbooks (QUALITY_SPEC S.3)

The user's report of 27.11: *why can't I have different worksheets in different subfolders that don't have linked sheets, just
like Excel?* A Kurve project has one workbook: its sheets are one flat list, the Project Explorer files them one by one, and
every sheet's tab is in the one worksheet window whichever folder it is in. Origin's project holds workbooks, each a window with
its own sheets, each filed in a folder; Excel's file is a workbook. This slice gives Kurve that model.

## The story it must pass (tools/flows/books.mjs)

Someone has two samples. They make a folder for each, a workbook in each (*New workbook here* from the folder's menu), and
import a sample's files into its workbook, a sheet a file. Opening Sample A's workbook shows A's sheets' tabs and only those;
B's window shows B's. A sheet dragged from A's workbook onto B's moves there, its graphs and formulas still reading it. A graph
is made from columns of both. Last month's project, made before workbooks, opens with its sheets where they were: the sheets
of each folder one workbook in that folder. A reload, an undo of each step, a project file saved and opened, and Excel's
export each keep it all.

## Decisions

1. **A workbook is data; its window is its view.** `p.books = [{id, name}]` in order; each sheet names its book (`s.book`); a
   sheet naming none, or a book that has gone, is in the first book. A book has one window, `wb-<id>`, a document as a graph
   is: in the taskbar, minimised and restored, never closed (as the worksheet window is now).
2. **The first book's window is the worksheet window** (`sheet`): nothing that opens "the worksheet" changes, and a project
   of one book looks as it does today.
3. **The tabs are the book's.** A window's tabs are its book's sheets; + adds a sheet to that book; a tab's menu has *Move to
   workbook ›* (another book, or a new one). A sheet dragged by its tab onto another book's window or taskbar button moves
   there (the column letters' drag onto another window stays: its columns move).
4. **The Explorer files books, not sheets.** A book is a row (`wb:<id>`) that opens to its sheets; a sheet is filed where its
   book is. A folder's menu has *New workbook here* and *Import files here…*; the project's menu *New workbook*. One click on
   a book opens its window; one click on a sheet opens its book's window showing it.
5. **Sheet names stay unique in the project** (Excel lets each workbook have a Sheet1; Kurve does not, yet): so `Sheet2!B`
   in a formula, `colRef`, the check code and every name shown keep their meaning, and no formula needs a book's name.
   *New sheet* names `Sheet n` with the next number free in the project.
6. **One live grid** (as today): it is in the window of the book in front; the others show a picture of their shown sheet,
   a press on which brings that book forward with the cell selected. Each book remembers its shown sheet (`S.bookAt`).
7. **Sheet windows of SHEET_SPEC 3.2 become books.** A sheet in a window of its own was this browser's layout; it is now a
   book of its own, which is data: *Window › New worksheet window › (a sheet)* becomes *Move to a new workbook* (one undo
   step). The per-browser list (`LAYOUT.swin`) is read once: each sheet in it is offered, not moved, when the project opens
   (a toast with *Make them workbooks*), so nothing changes without a person asking.
8. **Older projects**: `migrate` makes `books` from the folders: the top level's sheets one book, *Book1*; each folder's
   sheets one book named after the folder, filed there; the tree's `ws:` entries become `wb:` entries. Nothing on screen moves
   but the tabs, which now belong to their folder's book.
9. **Undo, two tabs, files**: `books` is in `UNDO_KEYS` and `UNDO_BYID` (merged book by book); a project file and a backup
   carry it; Excel's export stays one workbook, the books' sheets in order (with several books each named `Book · Sheet`,
   within Excel's 31 characters), and an Excel workbook imported is one book.
10. **Imports** (S.4 grows this): the dialog's *Put it in* offers *New sheet in <the book shown>*, *Add to <the sheet shown>*,
    *New workbook* and *New project*; a drop on a folder makes a workbook there.

## The interaction checklist (QUALITY_SPEC §3.4)

Folders (books filed, sheets not); several sheets and books; same names (columns named apart by colRef, which names the
sheet); several graphs and figures (graphs read any book); undo and redo of every book command; two tabs (books merged by id);
a reload; a project file and a backup; a big table (no change: values are not touched); a phone's width (the windows stack);
the history off; a read-only project (book commands disabled); formulas across books (by sheet name); analyses' result
sheets (in the book of their first input's sheet); matrices (their books are already their own, `mx-`, and stay so);
Excel's import and export; the fill, filters, hidden rows and conditional formatting (per sheet, unchanged); the History's
boxes (unchanged: they name sheets); Find a command (the new items).

## Code (what changes)

- Model: `bookList(p)` (as `sheetList`: a project from before has `BOOK0`), `bookOf(sid)`, `bookName`, `bookSheets(bid)`,
  `newBookId`, `nextBookName`; `migrateBooks(p)` in `migrate`; `projCheck` grows: every sheet in a book that exists, book ids
  and names unique, every book with a sheet.
- Commands, each one undo step and a log line: `newBook({folder, name})`, `renameBook`, `deleteBook` (its sheets with it,
  as `deleteSheet` does, after asking when they hold values; a project keeps one book), `moveSheetToBook(sid, bid|"new")`,
  `moveBook(bid, dir)`.
- Windows: the sheet windows' code (`swList`, `syncSheetWins`, `moveWsLive`, `wsWinOf`, `mainSheet`, `renderSwSnap`) keyed by
  book instead of sheet: `bkWin(bid)` is `sheet` for the first and `wb-<id>` for the others; `curSheet()` stays the live
  window's shown sheet.
- Tabs: `renderWsTabs` lists `bookSheets(bookOf(curSheet()))`; the tab menu's *Move to workbook*.
- Explorer: `xKeys`/`xKeysOf` hold `wb:` keys (and no `ws:`), `xRows` a book row with its sheets as children, `xOpen`, `xMenu`
  (book: Open, Rename, New sheet in it, Move to, Delete; sheet: as now, with Move to workbook), drag of a sheet onto a book.
- Imports: `doImport`'s modes, `autoImport` and `doBatchImport` put a new sheet in the book shown, or in a new book for a drop on
  a folder; `importBook` (Excel) one book.
- Menus: File › New workbook; the Explorer's; Window › (each book); `menus-after.txt`.
- Tests: `tools/flows/books.mjs` (the story above, through the interface only), `tools/sheet-drive.mjs` 3.2 rewritten for books,
  `review-drive` 27.11 updated (a sheet made with + goes into the book shown, and so where it is filed), the fuzzers and the
  lab day with `BIAS=book`.

## Not in this slice

Sheet names repeated across books (decision 5); a book's own formulas' scope; closing a book's window (it minimises); a book
saved alone as a file (a project file holds every book).
