import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import '@mdi/font/css/materialdesignicons.css';
import App from './App';
import * as serviceWorker from './serviceWorker';

import 'ace-builds/src-noconflict/mode-sql';
import 'ace-builds/src-noconflict/mode-mysql';
import 'ace-builds/src-noconflict/mode-pgsql';
import 'ace-builds/src-noconflict/mode-sqlserver';
import 'ace-builds/src-noconflict/mode-javascript';
import 'ace-builds/src-noconflict/theme-github';
import 'ace-builds/src-noconflict/ext-searchbox';
import 'ace-builds/src-noconflict/ext-language_tools';
import localStorageGarbageCollector from './utility/localStorageGarbageCollector';
// import 'ace-builds/src-noconflict/snippets/sqlserver';
// import 'ace-builds/src-noconflict/snippets/pgsql';
// import 'ace-builds/src-noconflict/snippets/mysql';

localStorageGarbageCollector();

ReactDOM.render(<App />, document.getElementById('root'));

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://bit.ly/CRA-PWA
serviceWorker.unregister();
