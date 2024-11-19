<script lang="ts">
  import keycodes from '../utility/keycodes';
  import _ from 'lodash';

  export let list;
  export let selectedObjectStore;
  export let getSelectedObject;
  export let selectedObjectMatcher;

  function handleKeyDown(ev) {
    function selectByDiff(diff) {
      const selected = getSelectedObject();
      const index = _.findIndex(list, x => selectedObjectMatcher(x, selected));
      if (index >= 0 && list[index + diff]) {
        selectedObjectStore.set(list[index + diff]);
      }
    }
    if (ev.keyCode == keycodes.upArrow) {
      selectByDiff(-1);
      ev.preventDefault();
    }
    if (ev.keyCode == keycodes.downArrow) {
      selectByDiff(1);
      ev.preventDefault();
    }
  }
</script>

<div tabindex="0" on:keydown={handleKeyDown} class="wrapper">
  <slot />
</div>

<style>
  .wrapper:focus {
    outline: none;
  }
</style>
