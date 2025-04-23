<script lang="ts">
  import { onMount } from 'svelte';

  import FormStyledButton from '../buttons/FormStyledButton.svelte';
  import FormProvider from '../forms/FormProvider.svelte';

  import ModalBase from './ModalBase.svelte';
  import { closeCurrentModal } from './modalTools';
  import { _t } from '../translations';
  import { apiCall } from '../utility/api';
  import TabControl from '../elements/TabControl.svelte';
  import TableControl from '../elements/TableControl.svelte';
  import { writable } from 'svelte/store';
  import LargeButton from '../buttons/LargeButton.svelte';
  import { downloadFromApi } from '../utility/exportFileTools';
  import getElectron from '../utility/getElectron';
  import { showSnackbarSuccess } from '../utility/snackbar';
  import { format } from 'date-fns';
  import Link from '../elements/Link.svelte';
  import _ from 'lodash';

  export let mode: 'export' | 'import';
  export let uploadedFilePath = undefined;

  let fullData: any = {};

  async function loadExportedData() {
    fullData = await apiCall('config/export-connections-and-settings');
    initFromFullData();
  }

  async function loadImportedData() {
    fullData = await apiCall('files/get-jsons-from-zip', { filePath: uploadedFilePath });
    initFromFullData();
  }

  function initFromFullData() {
    connections = fullData.connections || [];
    users = fullData.users || [];
    roles = fullData.roles || [];
    authMethods = fullData.auth_methods || [];
    config = fullData.config || [];

    handleCheckAll(true);
  }

  function handleCheckAll(checked) {
    if (checked) {
      checkedConnections = connections.map(x => x.id);
      checkedUsers = users.map(x => x.id);
      checkedRoles = roles.map(x => x.id);
      checkedAuthMethods = authMethods.map(x => x.id);
      checkedConfig = config.map(x => x.id);
    } else {
      checkedConnections = [];
      checkedUsers = [];
      checkedRoles = [];
      checkedAuthMethods = [];
      checkedConfig = [];
    }
  }

  onMount(() => {
    if (mode == 'export') {
      loadExportedData();
    }
    if (mode == 'import') {
      loadImportedData();
    }
  });

  function getLimitedData() {
    const limitedData: any = {
      connections: fullData.connections?.filter(x => checkedConnections.includes(x.id)),

      users: fullData.users?.filter(x => checkedUsers.includes(x.id)),

      user_connections: fullData.user_connections?.filter(
        x => checkedUsers.includes(x.user_id) && checkedConnections.includes(x.connection_id)
      ),
      user_roles: fullData.user_roles?.filter(x => checkedUsers.includes(x.user_id) && checkedRoles.includes(x.role_id)),
      user_permissions: fullData.user_permissions?.filter(x => checkedUsers.includes(x.user_id)),

      roles: fullData.roles?.filter(x => checkedRoles.includes(x.id)),
      role_connections: fullData.role_connections?.filter(
        x => checkedRoles.includes(x.role_id) && checkedConnections.includes(x.connection_id)
      ),
      role_permissions: fullData.role_permissions?.filter(x => checkedRoles.includes(x.role_id)),

      auth_methods: fullData.auth_methods?.filter(x => checkedAuthMethods.includes(x.id)),
      auth_methods_config: fullData.auth_methods_config?.filter(x => checkedAuthMethods.includes(x.auth_method_id)),

      config: fullData.config?.filter(
        x => checkedConfig.includes(x.id) || (x.group == 'admin' && x.key == 'encryptionKey')
      ),
    };
    return limitedData;
  }

  async function handleExport() {
    const electron = getElectron();

    let filePath;
    let fileName;

    if (electron) {
      const electron = getElectron();
      filePath = await electron.showSaveDialog({
        filters: [
          { name: `ZIP files`, extensions: ['zip'] },
          { name: `All files`, extensions: ['*'] },
        ],
        defaultPath: `dbgateconfig.zip`,
        properties: ['showOverwriteConfirmation'],
      });
    } else {
      const resp = await apiCall('files/generate-uploads-file', { extension: 'sql' });
      filePath = resp.filePath;
      fileName = resp.fileName;
    }

    if (!filePath) {
      return;
    }

    await apiCall('files/create-zip-from-jsons', { db: getLimitedData(), filePath });

    if (electron) {
      showSnackbarSuccess(`Saved to file ${filePath}`);
    } else {
      await downloadFromApi(`uploads/get?file=${fileName}`, `dbgateconfig.zip`);
    }
  }

  async function handleSaveToArchive() {
    const filePath = `archive:dbgateconfig-${format(new Date(), 'yyyy-MM-dd-HH-mm-ss')}.zip`;
    await apiCall('files/create-zip-from-jsons', { db: getLimitedData(), filePath });
    showSnackbarSuccess(`Saved to ${filePath}`);
  }

  async function handleImport() {
    await apiCall('config/import-connections-and-settings', { db: getLimitedData() });
    showSnackbarSuccess(`Imported connections and settings`);
  }

  let connections = [];
  let checkedConnections = [];

  let users = [];
  let checkedUsers = [];

  let roles = [];
  let checkedRoles = [];

  let authMethods = [];
  let checkedAuthMethods = [];

  let config = [];
  let checkedConfig = [];

  const connectionFilters = writable({});
  const userFilters = writable({});
  const roleFilters = writable({});
  const authMethodFilters = writable({});
  const configFilters = writable({});
</script>

<FormProvider>
  <ModalBase {...$$restProps} fullScreen>
    <div slot="header">
      {mode == 'export' ? 'Export' : 'Import'} connections &amp; settings
      <span class="check-uncheck">
        <Link onClick={() => handleCheckAll(true)}>Check all</Link>
        |
        <Link onClick={() => handleCheckAll(false)}>Uncheck all</Link>
      </span>
    </div>

    <div class="tabs">
      <TabControl
        tabs={_.compact([
          connections?.length && {
            label: `Connections (${checkedConnections?.length}/${connections?.length})`,
            slot: 1,
          },
          users?.length && { label: `Users (${checkedUsers?.length}/${users?.length})`, slot: 2 },
          roles?.length && { label: `Roles (${checkedRoles?.length}/${roles?.length})`, slot: 3 },
          authMethods?.length && {
            label: `Auth methods (${checkedAuthMethods?.length}/${authMethods?.length})`,
            slot: 4,
          },
          config?.length && { label: `Config (${checkedConfig?.length}/${config?.length})`, slot: 5 },
        ])}
      >
        <svelte:fragment slot="1">
          <div class="tablewrap">
            <TableControl
              filters={connectionFilters}
              stickyHeader
              columns={[
                { header: 'ID', fieldName: 'id', sortable: true, filterable: true },
                { header: 'Display name', fieldName: 'displayName', sortable: true, filterable: true },
                { header: 'Engine', fieldName: 'engine', sortable: true, filterable: true },
                { header: 'Server', fieldName: 'server', sortable: true, filterable: true },
                { header: 'User', fieldName: 'user', sortable: true, filterable: true },
              ]}
              clickable
              rows={connections}
              on:clickrow={event => {
                checkedConnections = checkedConnections.includes(event.detail.id)
                  ? checkedConnections.filter(id => id !== event.detail.id)
                  : [...checkedConnections, event.detail.id];
              }}
              checkedKeys={checkedConnections}
              onSetCheckedKeys={keys => {
                checkedConnections = keys;
              }}
            ></TableControl>
          </div>
        </svelte:fragment>
        <svelte:fragment slot="2">
          <div class="tablewrap">
            <TableControl
              filters={userFilters}
              stickyHeader
              columns={[
                { header: 'ID', fieldName: 'id', sortable: true, filterable: true },
                { header: 'Login', fieldName: 'login', sortable: true, filterable: true },
                { header: 'E-mail', fieldName: 'email', sortable: true, filterable: true },
              ]}
              clickable
              rows={users}
              on:clickrow={event => {
                checkedUsers = checkedUsers.includes(event.detail.id)
                  ? checkedUsers.filter(id => id !== event.detail.id)
                  : [...checkedUsers, event.detail.id];
              }}
              checkedKeys={checkedUsers}
              onSetCheckedKeys={keys => {
                checkedUsers = keys;
              }}
            ></TableControl>
          </div>
        </svelte:fragment>
        <svelte:fragment slot="3">
          <div class="tablewrap">
            <TableControl
              filters={roleFilters}
              stickyHeader
              columns={[
                { header: 'ID', fieldName: 'id', sortable: true, filterable: true },
                { header: 'Name', fieldName: 'name', sortable: true, filterable: true },
              ]}
              clickable
              rows={roles}
              on:clickrow={event => {
                checkedRoles = checkedRoles.includes(event.detail.id)
                  ? checkedRoles.filter(id => id !== event.detail.id)
                  : [...checkedRoles, event.detail.id];
              }}
              checkedKeys={checkedRoles}
              onSetCheckedKeys={keys => {
                checkedRoles = keys;
              }}
            ></TableControl>
          </div>
        </svelte:fragment>
        <svelte:fragment slot="4">
          <div class="tablewrap">
            <TableControl
              filters={authMethodFilters}
              stickyHeader
              columns={[
                { header: 'ID', fieldName: 'id', sortable: true, filterable: true },
                { header: 'Name', fieldName: 'name', sortable: true, filterable: true },
                { header: 'Type', fieldName: 'type', sortable: true, filterable: true },
              ]}
              clickable
              rows={authMethods}
              on:clickrow={event => {
                checkedAuthMethods = checkedAuthMethods.includes(event.detail.id)
                  ? checkedAuthMethods.filter(id => id !== event.detail.id)
                  : [...checkedAuthMethods, event.detail.id];
              }}
              checkedKeys={checkedAuthMethods}
              onSetCheckedKeys={keys => {
                checkedAuthMethods = keys;
              }}
            ></TableControl>
          </div>
        </svelte:fragment>
        <svelte:fragment slot="5">
          <div class="tablewrap">
            <TableControl
              filters={configFilters}
              stickyHeader
              columns={[
                { header: 'ID', fieldName: 'id', sortable: true, filterable: true },
                { header: 'Group', fieldName: 'group', sortable: true, filterable: true },
                { header: 'Key', fieldName: 'key', sortable: true, filterable: true },
                { header: 'Value', fieldName: 'value', sortable: true, filterable: true },
              ]}
              clickable
              rows={config}
              on:clickrow={event => {
                checkedConfig = checkedConfig.includes(event.detail.id)
                  ? checkedConfig.filter(id => id !== event.detail.id)
                  : [...checkedConfig, event.detail.id];
              }}
              checkedKeys={checkedConfig}
              onSetCheckedKeys={keys => {
                checkedConfig = keys;
              }}
            ></TableControl>
          </div>
        </svelte:fragment>
      </TabControl>
    </div>

    <div slot="footer">
      <div class="flex m-2">
        {#if mode == 'export'}
          <LargeButton
            data-testid="ExportImportConnectionsModal_exportButton"
            icon="icon export"
            on:click={handleExport}>{_t('common.export', { defaultMessage: 'Export' })}</LargeButton
          >
          <LargeButton
            data-testid="ExportImportConnectionsModal_saveToArchive"
            icon="icon archive"
            on:click={handleSaveToArchive}
            >{_t('common.saveToArchive', { defaultMessage: 'Save to archive' })}</LargeButton
          >
        {/if}
        {#if mode == 'import'}
          <LargeButton
            data-testid="ExportImportConnectionsModal_importButton"
            icon="icon import"
            on:click={handleImport}>{_t('common.import', { defaultMessage: 'Import' })}</LargeButton
          >
        {/if}
        <LargeButton icon="icon close" on:click={closeCurrentModal} data-testid="EditJsonModal_closeButton"
          >Close</LargeButton
        >
      </div>
    </div>
  </ModalBase>
</FormProvider>

<style>
  .tablewrap {
    overflow: auto;
    width: 100%;
    height: calc(100vh - 220px);
    margin: 1rem;
  }

  .tabs {
    flex: 1;
  }

  .check-uncheck {
    margin-left: 1rem;
    font-size: 0.8rem;
  }
</style>
