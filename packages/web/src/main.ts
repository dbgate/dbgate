import App from './App.svelte';
import './utility/connectionsPinger';
import './utility/changeCurrentDbByTab';
import './commands/stdCommands';

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

const app = new App({
  target: document.body,
  props: {},
});

export default app;
