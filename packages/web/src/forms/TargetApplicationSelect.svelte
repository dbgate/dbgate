<script lang="ts">
  import _ from 'lodash';
  import { createEventDispatcher, tick } from 'svelte';

  import SelectField from '../forms/SelectField.svelte';
  import { currentDatabase } from '../stores';
  import { filterAppsForDatabase } from '../utility/appTools';
  import { getConnectionInfo, useAllApps, useConnectionInfo, useDatabaseInfo } from '../utility/metadataLoaders';
  import InlineButton from '../buttons/InlineButton.svelte';
  import FontIcon from '../icons/FontIcon.svelte';
  import { showModal } from '../modals/modalTools';
  import InputTextModal from '../modals/InputTextModal.svelte';
  import { apiCall } from '../utility/api';
  import { _t } from '../translations';

  export let value = '';
  export let conid;
  export let database;

  const dispatch = createEventDispatcher();
  let selectFieldKey = 0;

  $: dbInfo = useDatabaseInfo({ conid, database });
  $: connectionInfo = useConnectionInfo({ conid });

  $: allApps = useAllApps();
  $: apps = filterAppsForDatabase($connectionInfo, database, $allApps || [], $dbInfo);

  $: if (apps?.length == 1) {
    value = apps[0].appid;
    selectFieldKey++;
    dispatch('change', value);
  }

  async function handleAddNewApplication() {
    showModal(InputTextModal, {
      header: _t('database.newApplication', { defaultMessage: 'New application' }),
      label: _t('database.applicationName', { defaultMessage: 'Application name' }),
      value: _.startCase(database),
      onConfirm: async appName => {
        const newAppId = await apiCall('apps/create-app-from-db', {
          appName,
          server: $connectionInfo?.server,
          database,
        });
        await tick();
        value = newAppId;
        dispatch('change', value);
      },
    });
  }
</script>

<div class="flex">
  {#key selectFieldKey}
    <SelectField
      isNative
      {...$$restProps}
      {value}
      on:change={e => {
        value = e.detail;
        dispatch('change', value);
      }}
      options={[
        {
          label: '(not selected)',
          value: '',
        },
        ...(apps || []).map(app => ({
          label: app.applicationName,
          value: app.appid,
        })),
      ]}
    />
  {/key}
  <InlineButton on:click={handleAddNewApplication} square>
    <FontIcon icon="icon plus-thick" padLeft padRight />
  </InlineButton>
</div>
