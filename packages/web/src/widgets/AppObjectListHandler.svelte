<script lang="ts">
  import keycodes from '../utility/keycodes';
  import _ from 'lodash';

  export let list;
  export let selectedObjectStore;
  export let getSelectedObject;
  export let selectedObjectMatcher;
  export let handleObjectClick;

  export let onScrollTop = null;
  export let onFocusFilterBox = null;

  let isListFocused = false;
  let domDiv = null;

  function handleKeyDown(ev) {
    function selectByDiff(diff) {
      const selected = getSelectedObject();
      const index = _.findIndex(list, x => selectedObjectMatcher(x, selected));

      if (index == 0 && diff < 0) {
        onFocusFilterBox?.();
        return;
      }

      if (index >= 0) {
        let newIndex = index + diff;
        if (newIndex >= list.length) {
          newIndex = list.length - 1;
        }
        if (newIndex < 0) {
          newIndex = 0;
        }

        if (list[newIndex]) {
          selectedObjectStore.set(list[newIndex]);
          handleObjectClick?.(list[newIndex], { tabPreviewMode: true });
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
      handleObjectClick?.(getSelectedObject(), { tabPreviewMode: false, focusTab: true });
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
      if (list[0]) {
        selectedObjectStore.set(list[0]);
        handleObjectClick?.(list[0], { tabPreviewMode: true });
        onScrollTop?.();
      }
    }
    if (ev.keyCode == keycodes.end) {
      if (list[list.length - 1]) {
        selectedObjectStore.set(list[list.length - 1]);
        handleObjectClick?.(list[list.length - 1], { tabPreviewMode: true });
      }
    }
  }

  export function focusFirst() {
    domDiv?.focus();
    if (list[0]) {
      selectedObjectStore.set(list[0]);
      handleObjectClick?.(list[0], { tabPreviewMode: true });
      onScrollTop?.();
    }
  }
</script>

<div
  tabindex="0"
  on:keydown={handleKeyDown}
  class="wrapper"
  class:app-object-list-focused={isListFocused}
  on:focus={() => {
    isListFocused = true;
  }}
  on:blur={() => {
    isListFocused = false;
  }}
  bind:this={domDiv}
>
  <slot />
</div>

<style>
  .wrapper:focus {
    outline: none;
  }
</style>
