<script lang="ts" context="module">
  export const EDITOR_THEMES = [
    'ambiance',
    'chaos',
    'chrome',
    'clouds',
    'clouds_midnight',
    'cobalt',
    'crimson_editor',
    'dawn',
    'dracula',
    'dreamweaver',
    'eclipse',
    'github',
    'gob',
    'gruvbox',
    'idle_fingers',
    'iplastic',
    'katzenmilch',
    'kr_theme',
    'kuroir',
    'merbivore',
    'merbivore_soft',
    'mono_industrial',
    'monokai',
    'nord_dark',
    'pastel_on_dark',
    'solarized_dark',
    'solarized_light',
    'sqlserver',
    'terminal',
    'textmate',
    'tomorrow',
    'tomorrow_night_blue',
    'tomorrow_night_bright',
    'tomorrow_night_eighties',
    'tomorrow_night',
    'twilight',
  ];

  export const FONT_SIZES = [
    { label: '8', value: '8' },
    { label: '9', value: '9' },
    { label: '10', value: '10' },
    { label: '11', value: '11' },
    { label: '12 - Normal', value: '12' },
    { label: '13', value: '13' },
    { label: '14', value: '14' },
    { label: '15', value: '15' },
    { label: '16', value: '16' },
    { label: '17', value: '17' },
    { label: 'Custom', value: 'custom' },
  ];
</script>

<script lang="ts">
  // copied from https://github.com/nateshmbhat/svelte-ace/blob/main/src/AceEditor.svelte
  import { createEventDispatcher, tick, onMount, onDestroy, getContext } from 'svelte';

  import * as ace from 'ace-builds/src-noconflict/ace';

  import 'ace-builds/src-noconflict/mode-sql';
  import 'ace-builds/src-noconflict/mode-mysql';
  import 'ace-builds/src-noconflict/mode-pgsql';
  import 'ace-builds/src-noconflict/mode-sqlserver';
  import 'ace-builds/src-noconflict/mode-json';
  import 'ace-builds/src-noconflict/mode-javascript';
  import 'ace-builds/src-noconflict/mode-yaml';
  import 'ace-builds/src-noconflict/mode-markdown';
  import 'ace-builds/src-noconflict/ext-searchbox';
  import 'ace-builds/src-noconflict/ext-language_tools';

  // import 'ace-builds/src-noconflict/theme-github';
  // import 'ace-builds/src-noconflict/theme-sqlserver';

  // import 'ace-builds/src-noconflict/theme-twilight';
  // import 'ace-builds/src-noconflict/theme-monokai';
  // import 'ace-builds/src-noconflict/theme-chaos';
  // import 'ace-builds/src-noconflict/theme-merbivore';

  import 'ace-builds/src-noconflict/theme-ambiance';
  import 'ace-builds/src-noconflict/theme-chaos';
  import 'ace-builds/src-noconflict/theme-chrome';
  import 'ace-builds/src-noconflict/theme-clouds';
  import 'ace-builds/src-noconflict/theme-clouds_midnight';
  import 'ace-builds/src-noconflict/theme-cobalt';
  import 'ace-builds/src-noconflict/theme-crimson_editor';
  import 'ace-builds/src-noconflict/theme-dawn';
  import 'ace-builds/src-noconflict/theme-dracula';
  import 'ace-builds/src-noconflict/theme-dreamweaver';
  import 'ace-builds/src-noconflict/theme-eclipse';
  import 'ace-builds/src-noconflict/theme-github';
  import 'ace-builds/src-noconflict/theme-gob';
  import 'ace-builds/src-noconflict/theme-gruvbox';
  import 'ace-builds/src-noconflict/theme-idle_fingers';
  import 'ace-builds/src-noconflict/theme-iplastic';
  import 'ace-builds/src-noconflict/theme-katzenmilch';
  import 'ace-builds/src-noconflict/theme-kr_theme';
  import 'ace-builds/src-noconflict/theme-kuroir';
  import 'ace-builds/src-noconflict/theme-merbivore';
  import 'ace-builds/src-noconflict/theme-merbivore_soft';
  import 'ace-builds/src-noconflict/theme-mono_industrial';
  import 'ace-builds/src-noconflict/theme-monokai';
  import 'ace-builds/src-noconflict/theme-nord_dark';
  import 'ace-builds/src-noconflict/theme-pastel_on_dark';
  import 'ace-builds/src-noconflict/theme-solarized_dark';
  import 'ace-builds/src-noconflict/theme-solarized_light';
  import 'ace-builds/src-noconflict/theme-sqlserver';
  import 'ace-builds/src-noconflict/theme-terminal';
  import 'ace-builds/src-noconflict/theme-textmate';
  import 'ace-builds/src-noconflict/theme-tomorrow';
  import 'ace-builds/src-noconflict/theme-tomorrow_night_blue';
  import 'ace-builds/src-noconflict/theme-tomorrow_night_bright';
  import 'ace-builds/src-noconflict/theme-tomorrow_night_eighties';
  import 'ace-builds/src-noconflict/theme-tomorrow_night';
  import 'ace-builds/src-noconflict/theme-twilight';

  import {
    currentDropDownMenu,
    currentEditorFontSize,
    currentEditorFont,
    currentEditorTheme,
    currentThemeDefinition,
  } from '../stores';
  import _ from 'lodash';
  import { handleCommandKeyDown } from '../commands/CommandListener.svelte';
  import resizeObserver from '../utility/resizeObserver';
  import queryParserWorkerFallback from './queryParserWorkerFallback';

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
  export let menu = null;
  export let readOnly = false;
  export let splitterOptions = null;

  const tabVisible: any = getContext('tabVisible');

  let editor: ace.Editor;
  let contentBackup: string = '';

  let clientWidth;
  let clientHeight;

  let queryParts = [];
  let currentPart = null;
  let currentPartMarker = null;

  let queryParserWorker;

  let defaultFontSize;

  const stdOptions = {
    showPrintMargin: false,
  };

  $: theme = $currentEditorTheme || ($currentThemeDefinition?.themeType == 'dark' ? 'merbivore' : 'github');
  $: watchEditorFontSize($currentEditorFontSize);

  export function getEditor(): ace.Editor {
    return editor;
  }

  export function getCurrentCommandText(): string {
    if (currentPart != null) return currentPart.text;
    if (!editor) return '';
    const selectedText = editor.getSelectedText();
    if (selectedText) return selectedText;
    if (editor.getHighlightActiveLine()) {
      const line = editor.getSelectionRange().start.row;
      return editor.session.getLine(line);
    }
    return '';
  }

  export function getCodeCompletionCommandText() {
    if (currentPart != null) return currentPart.text;
    return editor.getValue();
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

  function watchEditorFontSize(value) {
    if (editor) {
      editor.setFontSize(value ? parseInt(value) : defaultFontSize);
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

  $: watchOptions(options, $currentEditorFont);
  function watchOptions(newOption: any, fontFamily) {
    if (editor) {
      editor.setOptions({
        ...stdOptions,
        ...newOption,
        fontFamily: fontFamily || 'Menlo, Monaco, Ubuntu Mono, Consolas, source-code-pro, monospace',
        // fontFamily: 'tahoma,Menlo',
        // fontSize: '10pt',
      });
    }
  }

  $: watchQueryParserWorker(splitterOptions && $tabVisible);
  function watchQueryParserWorker(enabled) {
    if (enabled) {
      if (!queryParserWorker) {
        try {
          queryParserWorker = new Worker('build/query-parser-worker.js');
          // console.log('WORKER', queryParserWorker);
          queryParserWorker.onmessage = e => {
            processParserResult(e.data);
          };
        } catch (err) {
          // console.error('WORKER ERROR', err);
          console.log('WORKER ERROR, using fallback worker', err.message);
          queryParserWorker = 'fallback';
        }
      }
    } else {
      if (queryParserWorker) {
        if (queryParserWorker != 'fallback') {
          queryParserWorker.terminate();
        }
        queryParserWorker = null;
      }
    }

    changedQueryParts();
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

  function processParserResult(data) {
    queryParts = data;
    editor.setHighlightActiveLine(queryParts.length <= 1);
    changedCurrentQueryPart();
  }

  const handleContextMenu = e => {
    e.preventDefault();
    const left = e.pageX;
    const top = e.pageY;
    currentDropDownMenu.set({ left, top, items: menu, targetElement: e.target });
  };

  const handleKeyDown = (data, hash, keyString, keyCode, event) => {
    if (event) handleCommandKeyDown(event);
  };

  function changedQueryParts() {
    const editor = getEditor();
    if (splitterOptions && editor && queryParserWorker) {
      const editor = getEditor();

      const message = {
        text: editor.getValue(),
        options: {
          ...splitterOptions,
          returnRichInfo: true,
        },
      };

      if (queryParserWorker == 'fallback') {
        const res = queryParserWorkerFallback(message);
        processParserResult(res);
      } else {
        queryParserWorker.postMessage(message);
      }
    }
    // if (splitterOptions && editor) {
    //   const sql = editor.getValue();
    // }
  }

  function changedCurrentQueryPart() {
    if (queryParts.length <= 1) {
      removeCurrentPartMarker();
      return;
    }

    const selectionRange = editor.getSelectionRange();

    if (
      selectionRange.start.row != selectionRange.end.row ||
      selectionRange.start.column != selectionRange.end.column
    ) {
      removeCurrentPartMarker();
      currentPart = null;
      return;
    }

    const cursor = selectionRange.start;
    const part = queryParts.find(
      x =>
        ((cursor.row == x.start.line && cursor.column >= x.start.column) || cursor.row > x.start.line) &&
        ((cursor.row == x.end.line && cursor.column <= x.end.column) || cursor.row < x.end.line)
    );

    if (part?.text != currentPart?.text || part?.start?.position != currentPart?.start?.position) {
      removeCurrentPartMarker();

      currentPart = part;
      if (currentPart) {
        const start = currentPart.trimStart || currentPart.start;
        const end = currentPart.trimEnd || currentPart.end;
        currentPartMarker = editor
          .getSession()
          .addMarker(new ace.Range(start.line, start.column, end.line, end.column), 'ace_active-line', 'text');
      }
    }
  }

  function removeCurrentPartMarker() {
    if (currentPartMarker != null) {
      editor.getSession().removeMarker(currentPartMarker);
      currentPartMarker = null;
    }
  }

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
        ...options,
      });
    }

    editor.container.addEventListener('contextmenu', handleContextMenu);
    editor.keyBinding.addKeyboardHandler(handleKeyDown);
    changedQueryParts();
  });

  onDestroy(() => {
    if (editor) {
      editor.container.removeEventListener('contextmenu', handleContextMenu);
      editor.keyBinding.removeKeyboardHandler(handleKeyDown);
      editor.destroy();
      editor.container.remove();
    }
    if (queryParserWorker) {
      if (queryParserWorker != 'fallback') {
        queryParserWorker.terminate();
      }
      queryParserWorker = null;
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
    // editor.onFocus = () => {
    //   dispatch('focus');
    //   return false;
    // };
    // editor.onPaste = text => dispatch('paste', text);
    // editor.onSelectionChange = obj => dispatch('selectionChange', obj);

    editor.on('focus', () => dispatch('focus'));

    editor.setReadOnly(readOnly);
    editor.on('change', () => {
      const content = editor.getValue();
      value = content;
      dispatch('input', content);
      contentBackup = content;
      changedQueryParts();
    });
    defaultFontSize = editor.getFontSize();
    if ($currentEditorFontSize) {
      editor.setFontSize(parseInt($currentEditorFontSize) || 12);
    }

    editor.on('changeSelection', () => {
      changedCurrentQueryPart();
    });
  }
</script>

<div
  use:resizeObserver={true}
  on:resize={e => {
    // @ts-ignore
    clientWidth = e.detail.width;
    // @ts-ignore
    clientHeight = e.detail.height;
  }}
  class="ace-container"
>
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
