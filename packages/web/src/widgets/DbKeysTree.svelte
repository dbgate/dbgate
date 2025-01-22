<script lang="ts">
  import { dbKeys_loadMissing, dbKeys_refreshAll, findEngineDriver } from 'dbgate-tools';

  import CloseSearchButton from '../buttons/CloseSearchButton.svelte';
  import InlineButton from '../buttons/InlineButton.svelte';

  import SearchBoxWrapper from '../elements/SearchBoxWrapper.svelte';
  import SearchInput from '../elements/SearchInput.svelte';
  import FontIcon from '../icons/FontIcon.svelte';
  import AddDbKeyModal from '../modals/AddDbKeyModal.svelte';
  import { showModal } from '../modals/modalTools';
  import { currentDatabase, focusedConnectionOrDatabase, getExtensions } from '../stores';
  import { apiCall } from '../utility/api';
  import { useConnectionInfo } from '../utility/metadataLoaders';

  import DbKeysSubTree from './DbKeysSubTree.svelte';
  import WidgetsInnerContainer from './WidgetsInnerContainer.svelte';
  import FocusedConnectionInfoWidget from './FocusedConnectionInfoWidget.svelte';
  
  export let conid;
  export let database;

  let filter;

  let model = dbKeys_refreshAll();

  function handleRefreshDatabase() {
    changeModel(model => dbKeys_refreshAll(model));
  }

  function handleAddKey() {
    const connection = $currentDatabase?.connection;
    const database = $currentDatabase?.name;
    const driver = findEngineDriver(connection, getExtensions());

    showModal(AddDbKeyModal, {
      conid: connection._id,
      database,
      driver,
      onConfirm: async item => {
        const type = driver.supportedKeyTypes.find(x => x.name == item.type);

        await apiCall('database-connections/call-method', {
          conid: connection._id,
          database,
          method: type.addMethod,
          args: [item.keyName, ...type.dbKeyFields.map(fld => item[fld.name])],
        });

        handleRefreshDatabase();
      },
    });
  }

  $: differentFocusedDb =
    $focusedConnectionOrDatabase &&
    ($focusedConnectionOrDatabase.conid != conid ||
      ($focusedConnectionOrDatabase?.database && $focusedConnectionOrDatabase?.database != database));

  $: connection = useConnectionInfo({ conid });

  async function changeModel(modelUpdate) {
    model = modelUpdate(model);
    model = await dbKeys_loadMissing(model, async (root, limit) => {
      const result = await apiCall('database-connections/load-keys', {
        conid,
        database,
        root,
        filter,
        limit,
      });
      return result;
    });
  }

  function reloadModel() {
    changeModel(model => dbKeys_refreshAll(model));
  }

  $: {
    conid;
    database;
    filter;
    reloadModel();
  }
</script>

<SearchBoxWrapper>
  <SearchInput placeholder="Search keys" bind:value={filter} isDebounced />
  <CloseSearchButton bind:filter />
  <InlineButton on:click={handleAddKey} title="Add new key">
    <FontIcon icon="icon plus-thick" />
  </InlineButton>
  <InlineButton on:click={handleRefreshDatabase} title="Refresh key list">
    <FontIcon icon="icon refresh" />
  </InlineButton>
</SearchBoxWrapper>
{#if differentFocusedDb}
  <FocusedConnectionInfoWidget {conid} {database} connection={$connection} />
{/if}
<WidgetsInnerContainer hideContent={differentFocusedDb}>
  <DbKeysSubTree root="" {filter} {model} {changeModel} {conid} {database} {connection} />
</WidgetsInnerContainer>
