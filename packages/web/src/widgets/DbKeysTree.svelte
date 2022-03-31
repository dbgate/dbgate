<script lang="ts">
  import { findEngineDriver } from 'dbgate-tools';

  import CloseSearchButton from '../buttons/CloseSearchButton.svelte';
  import InlineButton from '../buttons/InlineButton.svelte';
  import runCommand from '../commands/runCommand';

  import SearchBoxWrapper from '../elements/SearchBoxWrapper.svelte';
  import SearchInput from '../elements/SearchInput.svelte';
  import FontIcon from '../icons/FontIcon.svelte';
  import AddDbKeyModal from '../modals/AddDbKeyModal.svelte';
  import { showModal } from '../modals/modalTools';
  import { currentDatabase, getExtensions } from '../stores';
  import { apiCall } from '../utility/api';
  import { useConnectionInfo } from '../utility/metadataLoaders';

  import DbKeysSubTree from './DbKeysSubTree.svelte';
  import WidgetsInnerContainer from './WidgetsInnerContainer.svelte';

  export let conid;
  export let database;

  let filter;
  let reloadToken = 0;

  function handleRefreshDatabase() {
    reloadToken += 1;
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
<WidgetsInnerContainer>
  <DbKeysSubTree {conid} {database} root="" {reloadToken} connection={$currentDatabase?.connection} {filter} />
</WidgetsInnerContainer>
