<script lang="ts">
  import createActivator from './createActivator';

  export let name;
  export let activateOnTabVisible = false;

  export const activator = createActivator(name, activateOnTabVisible);
</script>
