<script>
  import FontIcon from '../icons/FontIcon.svelte';
  import { selectedWidget } from '../stores';

  const widgets = [
    {
      icon: 'icon database',
      name: 'database',
      title: 'Database connections',
    },
    // {
    //   icon: 'fa-table',
    //   name: 'table',
    // },
    {
      icon: 'icon file',
      name: 'file',
      title: 'Closed tabs & Saved SQL files',
    },
    {
      icon: 'icon archive',
      name: 'archive',
      title: 'Archive (saved tabular data)',
    },
    {
      icon: 'icon plugin',
      name: 'plugins',
      title: 'Extensions & Plugins',
    },
    {
      icon: 'icon favorite',
      name: 'favorites',
      title: 'Favorites',
    },
    // {
    //   icon: 'fa-cog',
    //   name: 'settings',
    // },
    // {
    //   icon: 'fa-check',
    //   name: 'settings',
    // },
  ];

  function handleChangeWidget(name) {
    selectedWidget.set(name == $selectedWidget ? null : name);
  }
  //const handleChangeWidget= e => (selectedWidget.set(item.name))
</script>

{#each widgets as item}
  <div class="wrapper" class:selected={item.name == $selectedWidget} on:click={() => handleChangeWidget(item.name)}>
    <FontIcon icon={item.icon} />
  </div>
{/each}

<style>
  .wrapper {
    font-size: 23pt;
    height: 60px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--theme-widget_font2);
  }
  .wrapper:hover {
    color: var(--theme-widget_font1);
  }
  .wrapper.selected {
    color: var(--theme-widget_font1);
    background: var(--theme-widget_background3);
  }
</style>
