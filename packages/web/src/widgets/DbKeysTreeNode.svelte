<script lang="ts">
  import AppObjectCore from '../appobj/AppObjectCore.svelte';
  import { plusExpandIcon } from '../icons/expandIcons';
  import FontIcon from '../icons/FontIcon.svelte';

  import DbKeysSubTree from './DbKeysSubTree.svelte';

  export let conid;
  export let database;

  export let root;

  export let item;
  export let indentLevel = 0;

  let isExpanded;

  function getIconForType(type) {
    switch (type) {
      case 'dir':
        return 'img folder';
      case 'string':
        return 'img type-string';
      case 'hash':
        return 'img type-hash';
      case 'set':
        return 'img type-set';
      case 'list':
        return 'img type-list';
      case 'zset':
        return 'img type-zset';
      case 'stream':
        return 'img type-stream';
      case 'binary':
        return 'img type-binary';
      case 'ReJSON-RL':
        return 'img type-rejson';
      default:
        return null;
    }
  }

  // $: console.log(item.text, indentLevel);
</script>

<AppObjectCore
  icon={getIconForType(item.type)}
  title={item.text}
  expandIcon={item.type == 'dir' ? plusExpandIcon(isExpanded) : 'icon invisible-box'}
  on:expand={() => {
    if (item.type == 'dir') {
      isExpanded = !isExpanded;
    }
  }}
  on:click={() => {
    if (item.type == 'dir') {
      isExpanded = !isExpanded;
    }
  }}
  extInfo={item.count ? `(${item.count})` : null}
  {indentLevel}
/>
<!-- <div on:click={() => (isExpanded = !isExpanded)}>
  <FontIcon icon={} />
  {item.text}
</div> -->

{#if isExpanded}
  <DbKeysSubTree {conid} {database} root={item.root} indentLevel={indentLevel + 1} />
{/if}
