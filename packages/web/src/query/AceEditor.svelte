<script lang="ts">
  // copied from https://github.com/nateshmbhat/svelte-ace/blob/main/src/AceEditor.svelte
  import { createEventDispatcher, tick, onMount, onDestroy } from 'svelte';

  import * as ace from 'ace-builds/src-noconflict/ace';

  import 'ace-builds/src-noconflict/mode-sql';
  import 'ace-builds/src-noconflict/mode-mysql';
  import 'ace-builds/src-noconflict/mode-pgsql';
  import 'ace-builds/src-noconflict/mode-sqlserver';
  import 'ace-builds/src-noconflict/mode-json';
  import 'ace-builds/src-noconflict/mode-javascript';
  import 'ace-builds/src-noconflict/mode-markdown';
  import 'ace-builds/src-noconflict/theme-github';
  import 'ace-builds/src-noconflict/theme-twilight';
  import 'ace-builds/src-noconflict/ext-searchbox';
  import 'ace-builds/src-noconflict/ext-language_tools';
  import { currentDropDownMenu, currentThemeDefinition } from '../stores';
  import _ from 'lodash';
  import { handleCommandKeyDown } from '../commands/CommandListener.svelte';

  const EDITOR_ID = `svelte-ace-editor-div:${Math.floor(Math.random() * 10000000000)}`;
  const dispatch = createEventDispatcher<{
    init: ace.Editor;
    input: string;
    selectionChange: any;
    blur: void;
    changeMode: any;
    commandKey: { err: any; hashId: any; keyCode: any };
    copy: void;
    cursorChange: void;
    cut: void;
    documentChange: { data: any };
    focus: void;
    paste: string;
  }>();

  /**
   * translation of vue component to svelte:
   * @link https://github.com/chairuosen/vue2-ace-editor/blob/91051422b36482eaf94271f1a263afa4b998f099/index.js
   **/
  export let value: string = ''; // String, required
  export let mode: string = 'text'; // String
  // export let theme: string = 'github'; // String
  export let options: any = {}; // Object
  export let menu;
  export let readOnly;

  let editor: ace.Editor;
  let contentBackup: string = '';

  let clientWidth;
  let clientHeight;

  const stdOptions = {
    showPrintMargin: false,
  };

  $: theme = $currentThemeDefinition?.themeType == 'dark' ? 'twilight' : 'github';

  export function getEditor(): ace.Editor {
    return editor;
  }

  const requireEditorPlugins = () => {};
  requireEditorPlugins();

  $: watchValue(value);
  function watchValue(val: string) {
    if (contentBackup !== val && editor && typeof val === 'string') {
      editor.session.setValue(val);
      contentBackup = val;
    }
  }

  $: watchTheme(theme);
  function watchTheme(newTheme: string) {
    if (editor) {
      editor.setTheme('ace/theme/' + newTheme);
    }
  }

  $: watchMode(mode);
  function watchMode(newOption: any) {
    if (editor) {
      editor.getSession().setMode('ace/mode/' + newOption);
    }
  }

  $: watchOptions(options);
  function watchOptions(newOption: any) {
    if (editor) {
      editor.setOptions({
        ...stdOptions,
        newOption,
      });
    }
  }

  const resizeOnNextTick = () =>
    tick().then(() => {
      if (editor) {
        editor.resize();
      }
    });

  $: if (clientWidth != null && clientHeight != null) {
    resizeOnNextTick();
  }

  const handleContextMenu = e => {
    e.preventDefault();
    const left = e.pageX;
    const top = e.pageY;
    currentDropDownMenu.set({ left, top, items: _.isFunction(menu) ? menu() : menu });
  };

  const handleKeyDown = (data, hash, keyString, keyCode, event) => {
    if (event) handleCommandKeyDown(event);
  };

  onMount(() => {
    editor = ace.edit(EDITOR_ID);

    dispatch('init', editor);
    editor.$blockScrolling = Infinity;
    // editor.setOption("enableEmmet", true);
    editor.getSession().setMode('ace/mode/' + mode);
    editor.setTheme('ace/theme/' + theme);
    editor.setValue(value, 1);
    contentBackup = value;
    setEventCallBacks();
    if (options) {
      editor.setOptions({
        ...stdOptions,
        options,
      });
    }

    editor.container.addEventListener('contextmenu', handleContextMenu);
    editor.keyBinding.addKeyboardHandler(handleKeyDown);
  });

  onDestroy(() => {
    if (editor) {
      editor.container.removeEventListener('contextmenu', handleContextMenu);
      editor.keyBinding.removeKeyboardHandler(handleKeyDown);
      editor.destroy();
      editor.container.remove();
    }
  });

  function setEventCallBacks() {
    // editor.onBlur = () => dispatch('blur');
    // editor.onChangeMode = obj => dispatch('changeMode', obj);
    // editor.onCommandKey = (err, hashId, keyCode) => dispatch('commandKey', { err, hashId, keyCode });
    // editor.onCopy = () => dispatch('copy');
    // editor.onCursorChange = () => dispatch('cursorChange');
    // editor.onCut = () => dispatch('cut');
    // editor.onDocumentChange = (obj: { data: any }) => dispatch('documentChange', obj);
    // editor.onFocus = () => dispatch('focus');
    // editor.onPaste = text => dispatch('paste', text);
    // editor.onSelectionChange = obj => dispatch('selectionChange', obj);

    editor.setReadOnly(readOnly);
    editor.on('change', function () {
      const content = editor.getValue();
      value = content;
      dispatch('input', content);
      contentBackup = content;
    });
  }
</script>

<div bind:clientWidth bind:clientHeight class="ace-container">
  <div id={EDITOR_ID} style="width:{clientWidth}px;height:{clientHeight}px" />
</div>

<style>
  .ace-container {
    position: absolute;
    left: 0;
    top: 0;
    right: 0;
    bottom: 0;
  }
</style>
