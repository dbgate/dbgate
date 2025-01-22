<script lang="ts">
  import keycodes from '../utility/keycodes';
  import _ from 'lodash';
  
  export let list;
  export let selectedObjectStore;
  export let getSelectedObject;
  export let selectedObjectMatcher;
  export let handleObjectClick;
  export let handleExpansion = null;

  export let onScrollTop = null;
  export let onFocusFilterBox = null;
  export let getDefaultFocusedItem = null;

  let isListFocused = false;
  let domDiv = null;
  let lastInputMethod = null;
  export let hideContent = false;

  function handleKeyDown(ev) {
    const listInstance = _.isFunction(list) ? list() : list;

    function selectByDiff(diff) {
      const selected = getSelectedObject();
      const index = _.findIndex(listInstance, x => selectedObjectMatcher(x, selected));

      if (index < 0) {
        focusFirst();
        return;
      }

      if (index == 0 && diff < 0) {
        onFocusFilterBox?.();
        return;
      }

      if (index >= 0) {
        let newIndex = index + diff;
        if (newIndex >= listInstance.length) {
          newIndex = listInstance.length - 1;
        }
        if (newIndex < 0) {
          newIndex = 0;
        }

        if (listInstance[newIndex]) {
          selectedObjectStore.set(listInstance[newIndex]);
          handleObjectClick?.(listInstance[newIndex], 'keyArrow');
        }

        if (newIndex == 0) {
          onScrollTop?.();
        }
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
    if (ev.keyCode == keycodes.enter) {
      handleObjectClick?.(getSelectedObject(), 'keyEnter');
      ev.preventDefault();
    }
    if (ev.keyCode == keycodes.pageDown) {
      selectByDiff(10);
      ev.preventDefault();
    }
    if (ev.keyCode == keycodes.pageUp) {
      selectByDiff(-10);
      ev.preventDefault();
    }
    if (ev.keyCode == keycodes.home) {
      if (listInstance[0]) {
        selectedObjectStore.set(listInstance[0]);
        handleObjectClick?.(listInstance[0], 'keyArrow');
        onScrollTop?.();
      }
    }
    if (ev.keyCode == keycodes.end) {
      if (listInstance[listInstance.length - 1]) {
        selectedObjectStore.set(listInstance[listInstance.length - 1]);
        handleObjectClick?.(listInstance[listInstance.length - 1], 'keyArrow');
      }
    }
    if (ev.keyCode == keycodes.numPadAdd) {
      handleExpansion?.(getSelectedObject(), true);
    }
    if (ev.keyCode == keycodes.numPadSub) {
      handleExpansion?.(getSelectedObject(), false);
    }

    if (
      !ev.ctrlKey &&
      !ev.altKey &&
      !ev.metaKey &&
      ((ev.keyCode >= keycodes.a && ev.keyCode <= keycodes.z) ||
        (ev.keyCode >= keycodes.n0 && ev.keyCode <= keycodes.n9) ||
        (ev.keyCode >= keycodes.numPad0 && ev.keyCode <= keycodes.numPad9) ||
        ev.keyCode == keycodes.dash)
    ) {
      const text = ev.key;
      onFocusFilterBox?.(text);
      ev.preventDefault();
    }
  }

  export function focusFirst() {
    const listInstance = _.isFunction(list) ? list() : list;

    domDiv?.focus();
    if (listInstance[0]) {
      selectedObjectStore.set(listInstance[0]);
      handleObjectClick?.(listInstance[0], 'keyArrow');
      onScrollTop?.();
    }
  }

  async function handleFocus(e) {
    isListFocused = true;

    if (lastInputMethod == 'mouse') {
      return;
    }

    const listInstance = _.isFunction(list) ? list() : list;
    const selected = getSelectedObject();
    const index = _.findIndex(listInstance, x => selectedObjectMatcher(x, selected));
    if (index < 0) {
      const focused = getDefaultFocusedItem?.();
      if (focused) {
        const index2 = _.findIndex(listInstance, x => selectedObjectMatcher(x, focused));
        if (index2 >= 0) {
          selectedObjectStore.set(focused);
          handleObjectClick?.(focused, 'keyArrow');
          return;
        }
      }
      focusFirst();
    }
  }
</script>

<svelte:window
  on:keydown={() => {
    lastInputMethod = 'keyboard';
  }}
  on:mousedown={() => {
    lastInputMethod = 'mouse';
  }}
/>

<div
  tabindex="0"
  on:keydown={handleKeyDown}
  class="wrapper"
  class:app-object-list-focused={isListFocused}
  on:focus={handleFocus}
  on:blur={() => {
    isListFocused = false;
  }}
  bind:this={domDiv}
  class:hideContent
>
  <slot />
</div>

<style>
  .wrapper:focus {
    outline: none;
  }

  .hideContent {
    visibility: hidden;
  }
</style>
