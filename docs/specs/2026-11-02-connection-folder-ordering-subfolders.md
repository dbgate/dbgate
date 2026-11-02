# Connection folder ordering and subfolders

Status: agreed
Date: 2026-11-02
Area: web (connection list widget, app object list), api (connections controller); all deploy modes

## Context of the change
The connection list (`packages/web/src/widgets/ConnectionList.svelte`) groups connections into folders.
A folder is not an entity: it is the string field `parent` on each connection, stored by the
`connections` controller datastore (`packages/api/src/controllers/connections.js`). Empty folders and
collapsed folders exist only in browser localStorage (`emptyConnectionGroupNames`,
`collapsedConnectionGroupNames` in `packages/web/src/stores.ts`). Rename and delete of a folder call
`connections/batch-change-folder`, which rewrites `parent` on the connections the caller can see.
Groups are rendered by `packages/web/src/appobj/AppObjectList.svelte` / `AppObjectGroup.svelte` with a
single level and alphabetical order (`sortGroups`).

Issue dbgate/dbgate#1608 asks for custom folder order and for subfolders (moving a folder with all its
connections under another folder). In large setups the only workaround today is naming folders so
that alphabetical order matches the wanted order.

## User request
The user pointed at issue https://github.com/dbgate/dbgate/issues/1608 ("FEAT: subfolders and
reordering of folders": folders can't be reordered, always alphabetical; no subfolders; wanted custom
reordering and moving existing folders under other folders including everything in them) and asked
what I think about it, then asked to brainstorm it into a specification.

## Decisions
### What scope should this spec cover for connection folders (issue #1608)?
| Option | What it means |
|---|---|
| Order + subfolders | One spec covering both custom folder ordering and nested subfolders, possibly delivered in phases. |
| Ordering only | Only custom order of top-level folders; subfolders deferred. |
| Subfolders only | Only nesting; folders stay alphabetical within each level. |

**Answer: Order + subfolders**

### How should a subfolder hierarchy be represented in data?
| Option | What it means |
|---|---|
| Path in parent | Keep the string field `parent`, store e.g. "Prod/EU". No schema change, old data stays valid; moving a folder = rewriting a prefix. Needs a separator rule. |
| Folder entities | New folder records with id, name, parentId, sortOrder; connections reference folder id. Needs migration and new API/storage. |

**Answer: Path in parent**

### Where should the custom folder order be persisted?
| Option | What it means |
|---|---|
| Server settings | A new key in settings (presented as per user - this was inaccurate, see correction below). |
| Browser localStorage | Like today's empty/collapsed folder lists. Lost on another browser/device. |
| On connections | A folderSortOrder on connections. Shared, but spread over many records; empty folders can't carry it. |

**Answer: Server settings** - later revised, see the correction question below.

### Which separator marks nesting in the `parent` path, and what about existing folder names containing it?
| Option | What it means |
|---|---|
| '/' as separator | Natural ("Prod/EU"). Existing folders named with '/' become nested - accepted behaviour change. |
| '/' with escaping | '/' nests, '\/' is a literal slash. Preserves old names but complicates UX. |
| Unusual separator | No collision, but harder to type/import and less readable. |

**Answer: '/' as separator**

### How should the user reorder folders and move a folder under another folder?
| Option | What it means |
|---|---|
| Drag&drop + menu | Drag a folder header onto a gap (reorder) or onto another folder (nest); plus context menu Move up / Move down / Move to folder... |
| Context menu only | Move up/down and a 'Move to folder...' dialog. |
| Drag&drop only | Most intuitive, no keyboard alternative. |

**Answer: Drag&drop + menu**

### How are connections ordered inside a folder?
| Option | What it means |
|---|---|
| Keep alphabetical | Only folders get custom order; connections stay sorted by label. |
| Custom too | Connections can also be reordered within a folder. |

**Answer: Keep alphabetical**

### Where do subfolders appear relative to connections within a folder, and how are new folders placed?
| Option | What it means |
|---|---|
| Subfolders first, new at end | Subfolders above connections; a folder missing from the stored order goes after ordered ones, alphabetically. |
| Subfolders last, new at end | Connections first, then subfolders. |
| Subfolders first, new alphabetical | Unordered folders merged alphabetically among ordered ones. |

**Answer: Subfolders first, new at end**

### What happens when a folder that has subfolders is deleted?
| Option | What it means |
|---|---|
| Lift contents up one level | Subfolders and connections move to the deleted folder's parent (root for top-level). |
| Flatten to root | Everything inside, at any depth, goes to root. |
| Block if not empty | Only empty folders can be deleted. |

**Answer: Lift contents up one level**

### Empty folders are today kept only in browser localStorage. With nesting, should that change?
| Option | What it means |
|---|---|
| Keep localStorage | Leave empty/collapsed folder lists as they are, just store full paths. |
| Move to server settings | Store empty folder paths with the order in settings; needs migration. |

**Answer: Keep localStorage**

### Read-only / shared connections: how do they interact with moving folders?
| Option | What it means |
|---|---|
| Move only editable | Folder move/rename rewrites parent only for connections the user may edit; others stay at the old path. Order is per user, always allowed (order store later corrected to global settings). |
| Block move if mixed | Refuse moving/renaming a folder containing non-editable connections. |

**Answer: Move only editable**

### Correction: server settings are global and writing needs 'settings/change'. Where should the custom folder order be persisted?
| Option | What it means |
|---|---|
| Global server settings | One shared folder order per server. In multi-user deployments everyone sees the same order; users without settings/change can't reorder (UI hides reorder). |
| Browser localStorage | Per browser; each user own order; lost on another device. |
| Settings + local fallback | Global order by privileged users, local override for others. Two sources of truth. |

**Answer: Global server settings**

### Should delivery be split into phases?
| Option | What it means |
|---|---|
| Two phases | Phase 1: custom order of top-level folders. Phase 2: subfolders, nested order, move folder. Phase 1 order format already path-based. |
| Single delivery | Everything at once. |

**Answer: Two phases**

### When the connection filter is active, how should nested folders behave?
| Option | What it means |
|---|---|
| Show matching path | Show only folders containing a match at any depth, auto-expanded along the path, without changing stored collapse state. |
| Flatten while filtering | Matches in a flat list with full folder path as a hint. |

**Answer: Show matching path**

## High-level plan
**Phase 1 - folder order.** Introduce a stored, global folder order keyed by folder path. The
connection list sorts top-level folders by it; folders not in the order follow, alphabetically.
Users reorder by dragging a folder header into a gap or with Move up / Move down in the folder context
menu. Rename and delete keep the order consistent (renamed path replaces the old one, deleted path is
removed). Reorder controls are hidden for users without the settings/change permission. The
"Recent & unsaved" pseudo-folder keeps its current position and is not orderable.

**Phase 2 - subfolders.** `parent` is read as a '/'-separated path. The folder list becomes a tree:
in every folder, subfolders come first (in custom order, then unordered ones alphabetically), then
connections alphabetically. New actions: create subfolder, Move to folder... (dialog), drag a folder
onto another folder to nest it, drag a connection onto any nested folder. Moving or renaming a folder
rewrites the path prefix of all editable connections below it, of empty-folder and collapsed-folder
entries, and of order entries. Deleting a folder lifts its direct subfolders and connections one level
up. Expand/collapse, keyboard navigation and the filter work over the tree; the filter shows matching
paths expanded without touching stored collapse state. Depends on phase 1's order store.

## Database and persistent storage
**Settings (existing store, new key).** Kind: the global settings object (`settings.json` in the data
directory, or the `settings` config group in Premium storage database when `STORAGE_DATABASE` is set).
New key, e.g. `connectionFolders.order`: a JSON object mapping a parent path to an array of child
folder names in display order; the root is the empty string key. Example:
`{ "": ["Prod", "Test"], "Prod": ["EU", "US"] }`. Phase 1 uses only the `""` entry. Written by the
web UI through settings update (requires settings/change), read by every client via settings. Lifetime:
until the user changes it; stale entries (folders no longer existing) are ignored on read and pruned
on the next write. Migration: none - missing key means alphabetical order as today.

**Connections `parent` field (existing, meaning extended).** Still a string; in phase 2 a '/' in it
means nesting. No schema change, no migration. Existing folder names containing '/' start to display
as nested - accepted behaviour change, to be mentioned in the changelog.

**Browser localStorage (existing keys).** `emptyConnectionGroupNames` and
`collapsedConnectionGroupNames` keep their place and format (arrays of strings) and now contain full
paths. Existing values remain valid. Folder move/rename/delete updates them.

## Architecture decisions
- **Path string instead of folder entities.** Avoids a new table/datastore, a migration and new
  permission handling in Premium storage; old data stays valid. Cost: a folder exists only while a
  connection or a localStorage entry references it, and moving a folder is a prefix rewrite across
  many connections rather than one update.
- **Order keyed by path, stored per parent.** Keeps phase 1 forward compatible with phase 2 and keeps
  each sibling list small. Cost: every folder rename/move must also rewrite order keys.
- **Global settings for order.** One mechanism for all deploy modes, survives device change. Cost: in
  multi-user servers order is shared and only users with settings/change can change it.
- **Only editable connections are moved.** Mirrors the current `batch-change-folder` permission rule
  and never touches connections the user may not edit.

## Weaknesses and risks
- **Mixed-permission folders split on move** (likely in Premium with role-based connections): moving
  a folder leaves non-editable connections at the old path, so the old folder stays visible to others.
  Mitigation: confirmation message stating how many connections were not moved.
- **Shared order in multi-user servers**: one user's reorder changes everyone's view; users without
  settings/change cannot reorder at all. Accepted by decision; revisit if users complain.
- **Existing names with '/'** become nested after phase 2. Low likelihood, low cost; changelog note.
- **Concurrent edits**: two users reordering at once - last write wins on the whole order object.
  Low impact.
- **Portal connections defined by environment variables** cannot have their `parent` changed; moving
  such folders is limited by the same editable-only rule.
- **Drag & drop complexity** in `AppObjectList` (gap vs. onto-folder drop targets, nested levels) is
  the largest UI risk; the context-menu path guarantees a non-mouse alternative.
- Open question: exact settings key name and whether the settings modal should offer "Reset folder
  order".

## Out of scope
- Custom order of connections inside a folder (stays alphabetical).
- Per-user folder order in multi-user deployments.
- Folder entities with ids, folder-level permissions, colors or icons.
- Moving empty folders and collapsed state to server storage.
- Nested folders for other lists (saved files, archives, cloud) that share `AppObjectList`.
