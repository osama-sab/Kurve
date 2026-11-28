# One subject for every command (QUALITY_SPEC S.5)

The user's reports of 27.11 had one root among them: a command acted on a column the person was not looking at. *Subtract
background* went on another sheet's Intensity, a step went where the active column was rather than where the selection was.
S.1 made the menus read the worksheet's selection. What is left: the graph and the Project Explorer each have a selection of
their own that no command reads, choosing a column from a menu is an undo step and a log line, the status bar never says what
the commands will act on, and choosing a column brings another graph forward by itself.

## Today

- **The active column** (`p.activeY`) is what every command, tool window and analysis reads.
- **The worksheet**: its selection holding one Y column becomes the active column when a menu command runs (`syncHandCol`,
  S.1), quietly.
- **The graph**: a click on a curve (Zoom, Pan) selects it for its menu in the graph's bar (`S.gsel`) and changes nothing else;
  a command then acts on the active column, which may be another curve. A chip of a picture, a graph brought forward, makes its
  curve active, quietly (`activateGraph`).
- **The Explorer**: a graph or a sheet opened by one click; a graph's curve becomes active as above; a sheet's columns not.
- **Choosing from a menu** (*Make it the active column*, *Active* in the column menu, the History's *Analyse this*):
  `setActiveCol`, an undo step, a log line, a message.
- **Following**: whenever the active column is not on the graph in front, a graph that shows it comes forward
  (`syncGraphWins`), whatever made it active.

## The story it must pass (tools/flows/subject.mjs)

Last week's project, a graph of two samples' columns in front. The person clicks sample B's curve on the graph: the status bar
says *Working on* it, and Data › Smooth… opens on it, not on the column that was active. Cancelled, nothing changed and nothing
to undo. They click column B of another sheet's grid: the status bar names it, and the graph in front stays in front, showing
what it showed. Smooth… then opens on that column. In the Explorer they click a graph: its curve is the subject. The column
menu's *Active* on a fourth column: no undo step (Ctrl+Z takes back the last real change), no log line, no message, no window
moved. A reload keeps the active column.

## Decisions

1. **The subject is the column a command acts on**, and there is one. It comes from the last place worked in: the worksheet
   (its selection holding one Y column), the graph (a curve clicked or selected; the fit's curve its column), the Explorer (a
   graph selected: its curve as the graph brings it; a sheet: the column selected in its grid), and otherwise the active column.
   `subjCol()` is the one door; `S.place` (`ws`, `graph`, `xpl`) says where the person last pressed or typed.
2. **Choosing makes it the active column at once, quietly**: no undo step, no log line, no message. A curve clicked on the graph
   is active as a chip clicked is; the worksheet's choice is taken when its selection has rested (a moment after the last press or
   key, so arrows through the grid cost nothing) and before any command; the Explorer's when its item opens.
3. **Choosing never brings another window forward.** The graph in front stays in front when the active column is not on it; a
   command that draws on a graph (the Fit, Peaks and Integrate windows: `ensureGraph`) brings one that shows the column, as it
   is a command. The graph does not draw a draft or an estimate over curves that are not the column's.
4. **The status bar names it**: *Working on Intensity (s2!B)* at its left, always, beside the tool's hint or the readout.
5. **Every command reads it**: the menus (S.1's wrapper, now `syncSubject`), the tool windows' first action (`openTool`), the
   keys that act on a column.

## Code

- `S.place` set by `setupCtx`'s capture listeners (`S.wsTouch`, `S.xplTouch` kept as its readings); `subjCol()`; `syncSubject()`
  (in place of `syncHandCol`, which stays its name for the menus); `pickCol(id)` the quiet choice (`setActiveCol` is it); the
  worksheet's rested choice (`wsSubjSoon`); `S.pickQuiet` the active column chosen quietly, which `syncGraphWins` does not follow.
- `#sbSubj` in the status bar, written by `renderSubj()` from `renderSbStats` and `renderStatusBar`.

## Not in this slice

Several columns as the subject (a command on every column selected: *Apply to* already does it for steps); the subject of a
matrix window (a matrix's commands read the matrix in front).

## As built (28.11)

As decided, with these choices made on the way:

- **The worksheet's choice rests 450 ms** after the last press or key in the grid, and is not taken while a cell is typed in, a
  button is held or a dialog is open; a command run before then reads the selection itself (`syncSubject`).
- **A right-click on a curve picks it too**, as a left click: its menu acts on it, and so do the menus after.
- **A choice keeps the zoom** unless the column is in other X units, and keeps each column's drafts (a peak set being built, a
  curve fit's starting values) with that column, as bringing a graph forward did.
- **The header's right-click** does not select the column (its menu acts on that column by itself); a column's menu *Active*
  (the graph bar's) is the quiet choice like any other.
- **A tool's step waiting in the Tool window goes with the subject** (found by the bug bash, S.6): with Subtract baseline open on
  one column, a curve clicked or a column chosen elsewhere moves the step there, as the window's Column list does, so the status
  bar and the window never name two columns. A step for every column stays as it is.
- **On a phone the subject comes first** in the status bar: below 520 px the point count and the fit state give way, and the
  selection's statistics shrink before it.
