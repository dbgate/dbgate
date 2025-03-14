import newQuery from '../query/newQuery';
import _ from 'lodash';

export function canOpenByWeb(file, extensions) {
  if (!file) return false;
  const nameLower = file.toLowerCase();
  if (nameLower.endsWith('.sql')) return true;
  return false;
}

export async function openWebFileCore(file, extensions) {
  const nameLower = file.path.toLowerCase();

  if (nameLower.endsWith('.sql')) {
    const reader = new FileReader();

    reader.onload = function (e) {
      newQuery({
        initialData: e.target.result,
      });
    };

    reader.readAsText(file);
  }
}
