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
  export let hideContent = false;

  function handleKeyDown(ev) {
    const listInstance = _.isFunction(list) ? list() : list;

    function selectByDiff(diff) {
      const selected = getSelectedObject();
      const index = _.findIndex(listInstance, x => selectedObjectMatcher(x, selected));

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
          handleObjectClick?.(listInstance[newIndex], { tabPreviewMode: true });
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
      if (listInstance[0]) {
        selectedObjectStore.set(listInstance[0]);
        handleObjectClick?.(listInstance[0], { tabPreviewMode: true });
        onScrollTop?.();
      }
    }
    if (ev.keyCode == keycodes.end) {
      if (listInstance[listInstance.length - 1]) {
        selectedObjectStore.set(listInstance[listInstance.length - 1]);
        handleObjectClick?.(listInstance[listInstance.length - 1], { tabPreviewMode: true });
      }
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
      handleObjectClick?.(listInstance[0], { tabPreviewMode: true });
      onScrollTop?.();
    }
  }

  function handleFocus() {
    isListFocused = true;
    const listInstance = _.isFunction(list) ? list() : list;
    const selected = getSelectedObject();
    const index = _.findIndex(listInstance, x => selectedObjectMatcher(x, selected));
    if (index < 0) {
      focusFirst();
    }
  }
</script>

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
