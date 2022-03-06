<script lang="ts" context="module">
  import createActivator, { getActiveComponent } from '../utility/createActivator';

  const getCurrentEditor = () => getActiveComponent('DbKeyDetailTab');

  export const matchingProps = ['conid', 'database', 'isDefaultBrowser'];
  export const allowAddToFavorites = props => true;
</script>

<script lang="ts">
  export let conid;
  export let database;
  export let key;
  export let isDefaultBrowser = false;

  export const activator = createActivator('DbKeyDetailTab', true);
</script>
