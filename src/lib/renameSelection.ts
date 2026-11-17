/** Draft ids picked on the Drafts tab, handed to the rename sheet. Not persisted. */
let ids: string[] = [];

export function setRenameSelection(next: string[]) {
  ids = [...next];
}

export function renameSelection(): string[] {
  return ids;
}
