<script lang="ts">
  import _ from 'lodash';
  import FontIcon from '../icons/FontIcon.svelte';
  import Link from './Link.svelte';
  import TableControl from './TableControl.svelte';
  import { writable } from 'svelte/store';

  export let title;
  export let collection;
  export let columns;
  export let showIfEmpty = false;
  export let emptyMessage = null;
  export let hideDisplayName = false;
  export let clickable = false;
  export let onAddNew = null;
  export let displayNameFieldName = null;
  export let multipleItemsActions = null;

  export let filters = writable({});

  let collapsed = false;
  let activeMultipleSelection;

  function handleChangeMultipleSelection(list) {
    activeMultipleSelection = list;
  }
</script>

{#if collection?.length > 0 || showIfEmpty || emptyMessage}
  <div class="wrapper">
    <div class="header">
      <span
        class="collapse"
        on:click={() => {
          collapsed = !collapsed;
        }}
      >
        <FontIcon icon={collapsed ? 'icon chevron-down' : 'icon chevron-up'} />
      </span>
      <span class="title mr-1">{title}</span>
      {#if onAddNew}
        <Link onClick={onAddNew}><FontIcon icon="icon add" /> Add new</Link>
      {/if}
      {#if multipleItemsActions && activeMultipleSelection && activeMultipleSelection?.length > 0}
        {#each multipleItemsActions as item}
          <span class="ml-2">
            <Link onClick={() => item.onClick(activeMultipleSelection)}>
              <FontIcon icon={item.icon} />
              {item.text} ({activeMultipleSelection.length})
            </Link>
          </span>
        {/each}
      {/if}
    </div>
    {#if (collection?.length || 0) == 0 && emptyMessage}
      <div class="body">
        {emptyMessage}
      </div>
    {/if}
    {#if !collapsed && (collection?.length > 0 || showIfEmpty)}
      <div class="body">
        <TableControl
          rows={collection || []}
          allowMultiSelect={!!multipleItemsActions}
          columns={_.compact([
            !hideDisplayName && {
              fieldName: displayNameFieldName || 'displayName',
              header: 'Name',
              slot: -1,
              sortable: true,
              filterable: !!displayNameFieldName,
            },
            ...columns,
          ])}
          {clickable}
          {filters}
          on:clickrow
          onChangeMultipleSelection={handleChangeMultipleSelection}
        >
          <svelte:fragment slot="-1" let:row let:col>
            <slot name="name" {row} {col} />
          </svelte:fragment>
          <svelte:fragment slot="0" let:row let:col>
            <slot name="0" {row} {col} />
          </svelte:fragment>
          <svelte:fragment slot="1" let:row let:col>
            <slot name="1" {row} {col} />
          </svelte:fragment>
          <svelte:fragment slot="2" let:row let:col>
            <slot name="2" {row} {col} />
          </svelte:fragment>
          <svelte:fragment slot="3" let:row let:col>
            <slot name="3" {row} {col} />
          </svelte:fragment>
          <svelte:fragment slot="4" let:row let:col>
            <slot name="4" {row} {col} />
          </svelte:fragment>
          <svelte:fragment slot="5" let:row let:col>
            <slot name="5" {row} {col} />
          </svelte:fragment>
          <svelte:fragment slot="6" let:row let:col>
            <slot name="6" {row} {col} />
          </svelte:fragment>
          <svelte:fragment slot="7" let:row let:col>
            <slot name="7" {row} {col} />
          </svelte:fragment>
        </TableControl>
      </div>
    {/if}
  </div>
{/if}

<style>
  .wrapper {
    margin-bottom: 20px;
    user-select: none;
  }

  .header {
    background-color: var(--theme-bg-1);
    padding: 5px;
  }

  .title {
    font-weight: bold;
    margin-left: 5px;
  }

  .body {
    margin: 20px;
  }

  .collapse {
    cursor: pointer;
  }

  .collapse:hover {
    color: var(--theme-font-hover);
    background: var(--theme-bg-3);
  }
</style>
