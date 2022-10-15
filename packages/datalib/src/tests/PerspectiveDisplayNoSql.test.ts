import { PerspectiveDisplay } from '../PerspectiveDisplay';
import { PerspectiveTableNode } from '../PerspectiveTreeNode';
import { createPerspectiveConfig, PerspectiveNodeConfig } from '../PerspectiveConfig';
import { processPerspectiveDefaultColunns } from '../processPerspectiveDefaultColunns';
import { DatabaseAnalyser } from 'dbgate-tools';
import { analyseDataPattern } from '../PerspectiveDataPattern';
import { PerspectiveDataProvider } from '../PerspectiveDataProvider';

const accountData = [
  {
    name: 'jan',
    email: 'jan@foo.co',
    follows: [{ name: 'lucie' }, { name: 'petr' }],
    nested: { email: 'jan@nest.cz' },
  },
  {
    name: 'romeo',
    email: 'romeo@foo.co',
    follows: [{ name: 'julie' }, { name: 'wiliam' }],
    nested: { email: 'romeo@nest.cz' },
  },
];

function createDisplay(cfgFunc?: (cfg: PerspectiveNodeConfig) => void) {
  const collectionInfo = {
    objectTypeField: 'collections',
    pureName: 'Account',
  };
  const dbInfo = {
    ...DatabaseAnalyser.createEmptyStructure(),
    collections: [collectionInfo],
  };
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
  if (cfgFunc) {
    cfgFunc(configColumns.nodes[0]);
  }
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

  return display;
}

test('test nosql display', () => {
  const display = createDisplay();

  expect(display.rows.length).toEqual(2);
  expect(display.rows[0].rowData).toEqual(['jan']);
  expect(display.rows[1].rowData).toEqual(['romeo']);
});

test('test nosql nested array display', () => {
  const display = createDisplay(cfg => {
    cfg.checkedColumns = ['name', 'follows::name'];
  });

  expect(display.rows.length).toEqual(4);
  expect(display.rows[0].rowData).toEqual(['jan', 'lucie']);
  expect(display.rows[1].rowData).toEqual([undefined, 'petr']);
  expect(display.rows[2].rowData).toEqual(['romeo', 'julie']);
  expect(display.rows[3].rowData).toEqual([undefined, 'wiliam']);
});

test('test nosql nested object', () => {
  const display = createDisplay(cfg => {
    cfg.checkedColumns = ['name', 'nested::email'];
  });

  expect(display.rows.length).toEqual(2);
  expect(display.rows[0].rowData).toEqual(['jan', 'jan@nest.cz']);
  expect(display.rows[1].rowData).toEqual(['romeo', 'romeo@nest.cz']);
});
