import _ from 'lodash';
import { findEngineDriver, generateDbPairingId, getAlterDatabaseScript } from 'dbgate-tools';
import InputTextModal from '../modals/InputTextModal.svelte';
import { showModal } from '../modals/modalTools';
import { getExtensions } from '../stores';
import { getConnectionInfo, getDatabaseInfo } from './metadataLoaders';
import ConfirmSqlModal, { saveScriptToDatabase } from '../modals/ConfirmSqlModal.svelte';
import { apiCall } from './api';

export async function alterDatabaseDialog(conid, database, updateFunc) {
  const conn = await getConnectionInfo({ conid });
  const driver = findEngineDriver(conn, getExtensions());

  const db = generateDbPairingId(await getDatabaseInfo({ conid, database }));
  const dbUpdated = _.cloneDeep(db);
  updateFunc(dbUpdated);

  const { sql, recreates } = getAlterDatabaseScript(db, dbUpdated, {}, db, dbUpdated, driver);

  showModal(ConfirmSqlModal, {
    sql,
    recreates,
    onConfirm: async () => {
      saveScriptToDatabase({ conid, database }, sql);
    },
    engine: driver.engine,
  });
}

export async function renameDatabaseObjectDialog(conid, database, oldName, updateFunc) {
  showModal(InputTextModal, {
    value: oldName,
    label: 'New name',
    header: 'Rename object',
    onConfirm: newName => {
      alterDatabaseDialog(conid, database, db => updateFunc(db, newName));
    },
  });
}
