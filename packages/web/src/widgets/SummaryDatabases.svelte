<script lang="ts">
  import TableControl from '../elements/TableControl.svelte';
  import CtaButton from '../buttons/CtaButton.svelte';
  import { _t } from '../translations';
  import formatFileSize from '../utility/formatFileSize';

  export let databases: any[] = [];

  async function profileOff(database: any) {
    // TODO: Implement profile off functionality
    console.log('Profile off:', database.name);
  }

  async function profileFiltered(database: any) {
    // TODO: Implement profile filtered functionality
    console.log('Profile filtered:', database.name);
  }

  async function profileAll(database: any) {
    // TODO: Implement profile all functionality
    console.log('Profile all:', database.name);
  }
</script>

<div>
  <TableControl
    rows={databases}
    columns={[
      { header: 'Name', fieldName: 'name', slot: 1 },
      { header: 'Size', fieldName: 'sizeOnDisk', slot: 2 },
      { header: 'Collections', fieldName: 'collections' },
      { header: 'Indexes', fieldName: 'indexes' },
      { header: 'Data Size', fieldName: 'dataSize', slot: 3 },
      { header: 'Index Size', fieldName: 'indexSize', slot: 4 },
      {
        header: 'Actions',
        fieldName: 'name',
        slot: 0,
      },
    ]}
  >
    <svelte:fragment slot="0" let:row>
      <CtaButton on:click={() => profileOff(row)}>Profile Off</CtaButton>
      <span class="action-separator">|</span>
      <CtaButton on:click={() => profileFiltered(row)}>Profile Filtered</CtaButton>
      <span class="action-separator">|</span>
      <CtaButton on:click={() => profileAll(row)}>Profile All</CtaButton>
    </svelte:fragment>

    <svelte:fragment slot="1" let:row>
      <strong>{row.name}</strong>
    </svelte:fragment>

    <svelte:fragment slot="2" let:row>
      <span>{formatFileSize(row.sizeOnDisk)}</span>
    </svelte:fragment>

    <svelte:fragment slot="3" let:row>
      <span>{formatFileSize(row.dataSize)}</span>
    </svelte:fragment>

    <svelte:fragment slot="4" let:row>
      <span>{formatFileSize(row.indexSize)}</span>
    </svelte:fragment>
  </TableControl>
</div>

<style>
  div {
    padding: 10px;
  }

  .action-separator {
    margin: 0 5px;
    color: var(--theme-font-3);
  }
</style>
