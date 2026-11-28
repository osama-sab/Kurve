# Importing many files (QUALITY_SPEC S.4)

The user's question of 27.11: *I want to group multiple files to different new or existing sheets: how do I do that in a clean
and productive way?* Today several files chosen together go into one list where only their names can be changed, and then all on
one sheet, side by side; to put them anywhere else is a move per sheet afterwards. With workbooks (S.3) a project has folders,
workbooks and sheets; an import should put each file where it belongs, in one go.

## The story it must pass (tools/flows/import.mjs)

Someone comes back from the lab with a run: four files of two samples (`sampleA_01`, `sampleA_02`, `sampleB_01`, `sampleB_02`),
a reference (`ref`) and a file that is not data. They open last week's project and import all six at once. The dialog lists the
six, the bad one skipped with its reason; by default each file is a sheet of its own in the workbook in front, and the tree beside
the list shows those five new sheets. They choose *By their names* and *each group a workbook*: the tree shows the workbooks
sampleA, sampleB and ref, a sheet a file. They tick the two sampleA rows and type *Run 3* as their folder once: both go there.
Import is one step: undone, nothing is left; redone, all of it is back. Later they import a folder of files kept in subfolders
(*File › Import a folder…*): the default is *As their folders*, and the project gets the same folders, each a workbook with a
sheet a file. A reload keeps it all and the document's rules hold.

## Decisions

1. **One dialog for several files**, in place of the list of names. One file still opens the one-file dialog, which reads its
   settings and has *Put it in* (New sheet in the workbook in front, Add to the sheet shown, New workbook, New project).
2. **A row per file**: its name (the column's, editable), points, X range, and where it goes: **Sheet**, **Workbook**,
   **Folder**, each a field with the names that exist offered (a list as it is typed). An existing name means that one; a new
   name is made, and rows with the same new name go together. A file that cannot be read is listed with its reason and not
   imported.
3. **What a name decides**: a sheet that exists is in its own workbook and folder, which its row then shows and does not offer
   to change; a workbook that exists is in its own folder. So no row can ask for the impossible.
4. **Arrangements in one click** (above the list): the files *Each on its own*, *All together*, *By their names* (the part
   before the last number, in a Group column that can be typed), *By a header field* (a field most of the files have, its value),
   or *As their folders* (files that came with folders: a folder dropped, or *Import a folder…*); and each group *on one sheet*,
   *a workbook, a sheet a file*, or *a folder, its workbook, a sheet a file*. The default is each on its own, on one sheet: a
   sheet a file, in the workbook in front (or the folder dropped on's), as one file is.
5. **A field typed wins over the arrangement** for its row, marked as typed, and kept when the arrangement changes; *Back to the
   arrangement* clears it. Rows ticked together are set together: a field changed on one ticked row changes every ticked row.
6. **The tree as it will be**, beside the list: the folders, workbooks and sheets after Import, the new ones marked, each sheet
   with the files it gets; it is what the person reads before saying yes.
7. **Several files on one sheet** share their X column when they share the axis, as now, and are side by side otherwise.
8. **One step**: Import is one undo step, one entry in the original data's record and one log line, which says where the files
   went in a sentence ("6 files into 3 workbooks in Run 3").
9. **Remembered** per project in this browser: the arrangement and the field it grouped by, as Plot setup remembers.
10. **Folders**: a folder dropped is read with its subfolders, each file keeping its path; *File › Import a folder…* does the
    same from the picker. With paths the default arrangement is *As their folders*.
11. **Read by itself…** on a row takes the file out of the list; once the import is done (or cancelled) the one-file dialog
    opens for each such file in turn.

## The interaction checklist (QUALITY_SPEC §3.4)

Several files and one; a file that fails; files on the same axis and not; existing and new names of each kind; a sheet that holds
data (the files go after its columns) and one that holds only placeholders (they give way); a folder dropped on a folder of the
Explorer; undo and redo; a reload; a project file; two tabs; the history off; a phone's width (the list above the tree); a project
that is blank (it takes the files' names, as now); into a new project; Find a command (*Import a folder…*).

## Code

- `impPlan(items, arr, typed)`: each item's group key and its sheet, workbook and folder (`{sheet, book, folder}`, each `{id}`
  or `{name, isNew}`), from the arrangement and the fields typed, resolved by decision 3; `impTree(plan)` the tree as it will be.
- `batchImport` becomes the dialog (`#biRows`, `#biTree`, `#biGroup`, `#biAs`, `#biField`, per row `biN<k>`, `biS<k>`, `biB<k>`,
  `biF<k>`, `biG<k>`, ticks `biT<k>`, *Read by itself…* `data-biself`); its listeners on its own elements.
- `doBatchImport(items, skip, plan, o)`: the folders made (a path by ›), the workbooks, the sheets, the columns placed sheet by sheet
  (`sameAxis` within a sheet; a sheet's placeholders given up, `dropBlanks`), one save with `tree`, `books`, `sheets`, `cols`, `raw`.
- `readDropped` walks directories (`webkitGetAsEntry`); `#dirIn` (`webkitdirectory`) and File › Import a folder…; an item's `path`.
- `kurve.imparr` (`{pid: {group, as, field}}`).

## Not in this slice

Reading settings per file inside the list (each file is read with the automatic choices, *Read by itself…* for the rest); a
workbook dropped (Excel) among other files keeps its own import (a workbook of its own); matrices (qudi's scans keep theirs).

## As built (28.11)

As decided, with these choices made on the way:

- **A sheet an arrangement makes is always new** (its name made unique beside the sheets there): data are never mixed because
  two names happen to agree. A sheet is put with others only when its name is typed. A **workbook** an arrangement names, and a
  **folder**, are the one already there when one of that name is in that place (a workbook in that folder; a folder under that
  parent), so a second run of sampleA goes into last week's sampleA.
- **A folder typed** is its path from the top (`Samples › 2024`), or its name alone when one folder has that name; a new path is
  made from the top level. *Top level* means the project's own level. A folder typed for a workbook that is elsewhere puts the
  file in that folder's workbook, or one made there named after it.
- **Into the sheet shown when it is empty**: the first new sheet in the workbook the files go to by default takes an empty sheet
  shown there (or, dropped on a folder, its workbook's empty sheet), keeping a name someone gave it. A blank project's sheet takes
  the first file's name when several come in; one file through the one-file dialog keeps *Sheet 1*, as before.
- **The arrangement remembered** is used by a drop; files that came with folders always go as their folders; a header field the
  files do not have falls back to each on its own.
- **Enter in a row's field** enters it and does not import; the button imports.
- **The older entry** `doBatchImport(items, skip, o)` (the tests', a series of spectra) goes through the same plan, all together on
  one sheet unless `o.arr` says otherwise.
- At most 200 files at once; a folder's hidden files are left out.
