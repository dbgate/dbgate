import { archiveFilesAsDataSheets } from '../stores';

export function markArchiveFileAsDataSheet(folder, file) {
  archiveFilesAsDataSheets.update(ar =>
    ar.find(x => x.folder == folder && x.file == file) ? ar : [...ar, { folder, file }]
  );
}

export function markArchiveFileAsReadonly(folder, file) {
  archiveFilesAsDataSheets.update(ar => ar.filter(x => x.folder != folder || x.file != file));
}

export function isArchiveFileMarkedAsDataSheet(store, folder, file) {
  return !!store.find(x => x.folder == folder && x.file == file);
}
