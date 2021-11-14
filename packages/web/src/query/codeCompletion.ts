import _ from 'lodash';
import { addCompleter, setCompleters } from 'ace-builds/src-noconflict/ext-language_tools';
import { getDatabaseInfo } from '../utility/metadataLoaders';
import analyseQuerySources from './analyseQuerySources';

const COMMON_KEYWORDS = [
  'select',
  'where',
  'update',
  'delete',
  'group',
  'order',
  'from',
  'by',
  'create',
  'table',
  'drop',
  'alter',
  'view',
  'execute',
  'procedure',
  'distinct',
  'go',
];

export function mountCodeCompletion({ conid, database, editor }) {
  setCompleters([]);
  addCompleter({
    getCompletions: async function (editor, session, pos, prefix, callback) {
      const cursor = session.selection.cursor;
      const line = session.getLine(cursor.row).slice(0, cursor.column);
      const dbinfo = await getDatabaseInfo({ conid, database });

      let list = COMMON_KEYWORDS.map(word => ({
        name: word,
        value: word,
        caption: word,
        meta: 'keyword',
        score: 800,
      }));

      if (dbinfo) {
        const colMatch = line.match(/([a-zA-Z0-9_]+)\.([a-zA-Z0-9_]*)?$/);
        const lastKeywordMatch = line.match(/([a-zA-Z0-9_]*)\s*$/);
        const lastKeyword = lastKeywordMatch ? lastKeywordMatch[1].toUpperCase().trim() : '';

        const sources = analyseQuerySources(editor.getValue(), [
          ...dbinfo.tables.map(x => x.pureName),
          ...dbinfo.views.map(x => x.pureName),
        ]);
        const sourceObjects = sources.map(src => {
          const table = dbinfo.tables.find(x => x.pureName == src.name);
          const view = dbinfo.views.find(x => x.pureName == src.name);
          return { ...(table || view), alias: src.alias };
        });

        if (colMatch) {
          const table = colMatch[1];
          const source = sources.find(x => (x.alias || x.name) == table);

          // console.log('sources', sources);
          // console.log('table', table, source);
          if (source) {
            const table = dbinfo.tables.find(x => x.pureName == source.name);
            if (table) {
              list = [
                ...table.columns.map(x => ({
                  name: x.columnName,
                  value: x.columnName,
                  caption: x.columnName,
                  meta: 'column',
                  score: 1000,
                })),
              ];
            }

            const view = dbinfo.views.find(x => x.pureName == source.name);
            if (view) {
              list = [
                ...view.columns.map(x => ({
                  name: x.columnName,
                  value: x.columnName,
                  caption: x.columnName,
                  meta: 'column',
                  score: 1000,
                })),
              ];
            }
          }
        } else {
          const onlyTables =
            lastKeyword == 'FROM' || lastKeyword == 'JOIN' || lastKeyword == 'UPDATE' || lastKeyword == 'DELETE';
          list = [
            ...(onlyTables ? [] : list),
            ...dbinfo.tables.map(x => ({
              name: x.pureName,
              value: x.pureName,
              caption: x.pureName,
              meta: 'table',
              score: 1000,
            })),
            ...dbinfo.views.map(x => ({
              name: x.pureName,
              value: x.pureName,
              caption: x.pureName,
              meta: 'view',
              score: 1000,
            })),
            ...(onlyTables
              ? []
              : _.flatten(
                  sourceObjects.map(obj =>
                    obj.columns.map(col => ({
                      name: col.columnName,
                      value: obj.alias ? `${obj.alias}.${col.columnName}` : col.columnName,
                      caption: obj.alias ? `${obj.alias}.${col.columnName}` : col.columnName,
                      meta: 'column',
                      score: 1200,
                    }))
                  )
                )),
          ];
        }
      }

      // if (/(join)|(from)|(update)|(delete)|(insert)\s*([a-zA-Z0-9_]*)?$/i.test(line)) {
      //   if (dbinfo) {
      //   }
      // }

      callback(null, list);
    },
  });

  const doLiveAutocomplete = function (e) {
    const editor = e.editor;
    var hasCompleter = editor.completer && editor.completer.activated;
    const session = editor.session;
    const cursor = session.selection.cursor;
    const line = session.getLine(cursor.row).slice(0, cursor.column);

    // We don't want to autocomplete with no prefix
    if (e.command.name === 'backspace') {
      // do not hide after backspace
    } else if (e.command.name === 'insertstring') {
      if ((!hasCompleter && /^[a-zA-Z]/.test(e.args)) || e.args == '.') {
        editor.execCommand('startAutocomplete');
      }

      if (e.args == ' ' && /((from)|(join)|(update))\s*$/i.test(line)) {
        editor.execCommand('startAutocomplete');
      }
    }
  };

  editor.commands.on('afterExec', doLiveAutocomplete);

  return () => {
    editor.commands.removeListener('afterExec', doLiveAutocomplete);
  };
}
