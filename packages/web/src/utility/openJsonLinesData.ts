import uuidv1 from 'uuid/v1';
import { apiCall } from './api';
import openNewTab from './openNewTab';

export async function openJsonLinesData(rows) {
  const jslid = uuidv1();

  // await apiCall('jsldata/save-rows', { jslid, rows });
  openNewTab(
    {
      tabComponent: 'ArchiveFileTab',
      icon: 'img archive',
      title: 'Data #',
      props: {
        jslid,
      },
    },
    {
      rows,
    }
  );
}
