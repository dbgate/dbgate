import { TableInfo } from 'dbgate-types';
import { PerspectiveDisplay } from '../PerspectiveDisplay';
import { PerspectiveTableNode } from '../PerspectiveTreeNode';
import { chinookDbInfo } from './chinookDbInfo';
import { createPerspectiveConfig, createPerspectiveNodeConfig } from '../PerspectiveConfig';
import artistDataFlat from './artistDataFlat';
import artistDataAlbum from './artistDataAlbum';
import artistDataAlbumTrack from './artistDataAlbumTrack';
import { processPerspectiveDefaultColunns } from '../processPerspectiveDefaultColunns';
import { DatabaseAnalyser, isCollectionInfo } from 'dbgate-tools';
import { analyseDataPattern } from '../PerspectiveDataPattern';
import { PerspectiveDataProvider } from '../PerspectiveDataProvider';

test('test flat view', () => {
  const artistTable = chinookDbInfo.tables.find(x => x.pureName == 'Artist');
  const configColumns = processPerspectiveDefaultColunns(
    createPerspectiveConfig({ pureName: 'Artist' }),
    { conid: { db: chinookDbInfo } },
    null,
    'conid',
    'db'
  );
  const root = new PerspectiveTableNode(
    artistTable,
    { conid: { db: chinookDbInfo } },
    configColumns,
    null,
    null,
    { conid: 'conid', database: 'db' },
    null,
    configColumns.rootDesignerId
  );
  const display = new PerspectiveDisplay(root, artistDataFlat);

  expect(display.rows.length).toEqual(4);
  expect(display.rows[0].rowData).toEqual(['AC/DC']);
  expect(display.loadIndicatorsCounts).toEqual({
    Artist: 4,
  });
});

test('test one level nesting', () => {
  const artistTable = chinookDbInfo.tables.find(x => x.pureName == 'Artist');

  const config = createPerspectiveConfig({ pureName: 'Artist' });
  config.nodes.push(createPerspectiveNodeConfig({ pureName: 'Album' }));
  config.references.push({
    sourceId: config.nodes[0].designerId,
    targetId: config.nodes[1].designerId,
    designerId: '1',
    columns: [{ source: 'ArtistId', target: 'ArtistId' }],
  });

  const configColumns = processPerspectiveDefaultColunns(config, { conid: { db: chinookDbInfo } }, null, 'conid', 'db');

  // const config = createPerspectiveConfig({ pureName: 'Artist' });
  // config.nodes[0].checkedColumns = ['Album'];

  const root = new PerspectiveTableNode(
    artistTable,
    { conid: { db: chinookDbInfo } },
    configColumns,
    null,
    null,
    { conid: 'conid', database: 'db' },
    null,
    configColumns.nodes[0].designerId
  );
  const display = new PerspectiveDisplay(root, artistDataAlbum);

  console.log(display.loadIndicatorsCounts);
  // console.log(display.rows);

  expect(display.rows.length).toEqual(6);

  expect(display.rows[0].rowData).toEqual(['AC/DC', 'For Those About To Rock We Salute You']);
  expect(display.rows[0].rowSpans).toEqual([2, 1]);
  expect(display.rows[0].rowCellSkips).toEqual([false, false]);

  expect(display.rows[1].rowData).toEqual([undefined, 'Let There Be Rock']);
  expect(display.rows[1].rowSpans).toEqual([1, 1]);
  expect(display.rows[1].rowCellSkips).toEqual([true, false]);

  expect(display.rows[2].rowData).toEqual(['Accept', 'Balls to the Wall']);
  expect(display.rows[2].rowSpans).toEqual([2, 1]);
  expect(display.rows[2].rowCellSkips).toEqual([false, false]);

  expect(display.rows[5].rowData).toEqual(['Alanis Morissette', 'Jagged Little Pill']);
  expect(display.rows[5].rowSpans).toEqual([1, 1]);

  expect(display.loadIndicatorsCounts).toEqual({
    Artist: 6,
    'Artist.Album': 6,
  });
});

test('test two level nesting', () => {
  const artistTable = chinookDbInfo.tables.find(x => x.pureName == 'Artist');
  const config = createPerspectiveConfig({ pureName: 'Artist' });
  config.nodes.push(createPerspectiveNodeConfig({ pureName: 'Album' }));
  config.nodes.push(createPerspectiveNodeConfig({ pureName: 'Track' }));
  config.references.push({
    sourceId: config.nodes[0].designerId,
    targetId: config.nodes[1].designerId,
    designerId: '1',
    columns: [{ source: 'ArtistId', target: 'ArtistId' }],
  });
  config.references.push({
    sourceId: config.nodes[1].designerId,
    targetId: config.nodes[2].designerId,
    designerId: '2',
    columns: [{ source: 'AlbumId', target: 'AlbumId' }],
  });
  const configColumns = processPerspectiveDefaultColunns(config, { conid: { db: chinookDbInfo } }, null, 'conid', 'db');

  const root = new PerspectiveTableNode(
    artistTable,
    { conid: { db: chinookDbInfo } },
    configColumns,
    null,
    null,
    { conid: 'conid', database: 'db' },
    null,
    configColumns.nodes[0].designerId
  );
  const display = new PerspectiveDisplay(root, artistDataAlbumTrack);

  console.log(display.rows);
  expect(display.rows.length).toEqual(8);

  expect(display.rows[0].rowData).toEqual([
    'AC/DC',
    'For Those About To Rock We Salute You',
    'For Those About To Rock (We Salute You)',
  ]);
  expect(display.rows[0].rowSpans).toEqual([4, 2, 1]);
  expect(display.rows[0].rowCellSkips).toEqual([false, false, false]);

  expect(display.rows[1].rowData).toEqual([undefined, undefined, 'Put The Finger On You']);
  expect(display.rows[1].rowSpans).toEqual([1, 1, 1]);
  expect(display.rows[1].rowCellSkips).toEqual([true, true, false]);

  expect(display.rows[2].rowData).toEqual([undefined, 'Let There Be Rock', 'Go Down']);
  expect(display.rows[2].rowSpans).toEqual([1, 2, 1]);
  expect(display.rows[2].rowCellSkips).toEqual([true, false, false]);
});

test('test nosql display', () => {
  const collectionInfo = {
    objectTypeField: 'collections',
    pureName: 'Account',
  };
  const dbInfo = {
    ...DatabaseAnalyser.createEmptyStructure(),
    collections: [collectionInfo],
  };
  const accountData = [
    { name: 'jan', email: 'jan@foo.co', follows: [{ name: 'lucie' }, { name: 'petr' }] },
    { name: 'romeo', email: 'romeo@foo.co', follows: [{ name: 'julie' }, { name: 'wiliam' }] },
  ];
  const config = createPerspectiveConfig({ pureName: 'Account' });
  const dataPatterns = {
    [config.rootDesignerId]: analyseDataPattern(
      {
        conid: 'conid',
        database: 'db',
        pureName: 'Account',
      },
      accountData
    ),
  };

  const configColumns = processPerspectiveDefaultColunns(
    config,
    { conid: { db: dbInfo } },
    dataPatterns,
    'conid',
    'db'
  );
  const root = new PerspectiveTableNode(
    collectionInfo,
    { conid: { db: dbInfo } },
    configColumns,
    null,
    new PerspectiveDataProvider(null, null, dataPatterns),
    { conid: 'conid', database: 'db' },
    null,
    configColumns.rootDesignerId
  );
  const display = new PerspectiveDisplay(root, accountData);

  expect(display.rows.length).toEqual(2);
  expect(display.rows[0].rowData).toEqual(['jan']);
  expect(display.rows[1].rowData).toEqual(['romeo']);
});
