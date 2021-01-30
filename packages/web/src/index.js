import React from 'react';
import ReactDOM from 'react-dom';
import _ from 'lodash';
import './index.css';
import '@mdi/font/css/materialdesignicons.css';
import App from './App';
import * as serviceWorker from './serviceWorker';

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
import localStorageGarbageCollector from './utility/localStorageGarbageCollector';
// import 'ace-builds/src-noconflict/snippets/sqlserver';
// import 'ace-builds/src-noconflict/snippets/pgsql';
// import 'ace-builds/src-noconflict/snippets/mysql';

localStorageGarbageCollector();
window['tabExports'] = {};
window['getCurrentTabCommands'] = () => {
  const tabid = window['activeTabId'];
  return _.mapValues(window['tabExports'][tabid] || {}, v => !!v);
};
window['dbgate_tabCommand'] = cmd => {
  const tabid = window['activeTabId'];
  const commands = window['tabExports'][tabid];
  const func = (commands || {})[cmd];
  if (func) func();
};

ReactDOM.render(<App />, document.getElementById('root'));

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://bit.ly/CRA-PWA
serviceWorker.unregister();
