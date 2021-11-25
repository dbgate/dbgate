import _ from 'lodash';
import { findEngineDriver, generateDbPairingId, getAlterDatabaseScript } from 'dbgate-tools';
import InputTextModal from '../modals/InputTextModal.svelte';
import { showModal } from '../modals/modalTools';
import { getExtensions } from '../stores';
import { getConnectionInfo, getDatabaseInfo } from './metadataLoaders';
import ConfirmSqlModal from '../modals/ConfirmSqlModal.svelte';
import axiosInstance from './axiosInstance';

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
      const resp = await axiosInstance.request({
        url: 'database-connections/run-script',
        method: 'post',
        params: {
          conid,
          database,
        },
        data: { sql },
      });
      await axiosInstance.post('database-connections/sync-model', { conid, database });
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
