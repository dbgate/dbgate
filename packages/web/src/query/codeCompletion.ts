import _ from 'lodash';
import { addCompleter, setCompleters } from 'ace-builds/src-noconflict/ext-language_tools';
import { getConnectionInfo, getDatabaseInfo, getSchemaList } from '../utility/metadataLoaders';
import analyseQuerySources from './analyseQuerySources';
import { getStringSettingsValue } from '../settings/settingsTools';
import { findEngineDriver, findDefaultSchema } from 'dbgate-tools';
import { getExtensions } from '../stores';

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

function createTableLikeList(schemaList, dbinfo, schemaCondition) {
  return [
    ...(schemaList?.map(x => ({
      name: x.schemaName,
      value: x.schemaName,
      caption: x.schemaName,
      meta: 'schema',
      score: 1000,
    })) || []),
    ...dbinfo.tables.filter(schemaCondition).map(x => ({
      name: x.pureName,
      value: x.pureName,
      caption: x.pureName,
      meta: 'table',
      score: 1000,
    })),
    ...dbinfo.views.filter(schemaCondition).map(x => ({
      name: x.pureName,
      value: x.pureName,
      caption: x.pureName,
      meta: 'view',
      score: 1000,
    })),
    ...dbinfo.matviews.filter(schemaCondition).map(x => ({
      name: x.pureName,
      value: x.pureName,
      caption: x.pureName,
      meta: 'matview',
      score: 1000,
    })),
    ...dbinfo.functions.filter(schemaCondition).map(x => ({
      name: x.pureName,
      value: x.pureName,
      caption: x.pureName,
      meta: 'function',
      score: 1000,
    })),
    ...dbinfo.procedures.filter(schemaCondition).map(x => ({
      name: x.pureName,
      value: x.pureName,
      caption: x.pureName,
      meta: 'procedure',
      score: 1000,
    })),
  ];
}

export function mountCodeCompletion({ conid, database, editor, getText }) {
  setCompleters([]);
  addCompleter({
    getCompletions: async function (editor, session, pos, prefix, callback) {
      const cursor = session.selection.cursor;
      const line = session.getLine(cursor.row).slice(0, cursor.column);
      const dbinfo = await getDatabaseInfo({ conid, database });
      const schemaList = await getSchemaList({ conid, database });
      const connection = await getConnectionInfo({ conid });
      const driver = findEngineDriver(connection, getExtensions());
      const defaultSchema = findDefaultSchema(schemaList, driver.dialect);

      const convertUpper = getStringSettingsValue('sqlEditor.sqlCommandsCase', 'upperCase') == 'upperCase';

      let list = COMMON_KEYWORDS.map(word => {
        if (convertUpper) {
          word = word.toUpperCase();
        }

        return {
          name: word,
          value: word,
          caption: word,
          meta: 'keyword',
          score: 800,
        };
      });

      if (dbinfo) {
        const colMatch = line.match(/([a-zA-Z0-9_]+)\.([a-zA-Z0-9_]*)?$/);
        const lastKeywordMatch = line.match(/([a-zA-Z0-9_]*)\s*$/);
        const lastKeyword = lastKeywordMatch ? lastKeywordMatch[1].toUpperCase().trim() : '';

        const sources = analyseQuerySources(getText(), [
          ...dbinfo.tables.map(x => x.pureName),
          ...dbinfo.views.map(x => x.pureName),
          ...dbinfo.matviews.map(x => x.pureName),
          // ...dbinfo.functions.map(x => x.pureName),
          // ...dbinfo.procedures.map(x => x.pureName),
        ]);
        const sourceObjects = sources.map(src => {
          const table = dbinfo.tables.find(x => x.pureName == src.name);
          const view = dbinfo.views.find(x => x.pureName == src.name);
          const matview = dbinfo.matviews.find(x => x.pureName == src.name);
          return { ...(table || view || matview), alias: src.alias };
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

            const view = [...(dbinfo.views || []), ...(dbinfo.matviews || [])].find(x => x.pureName == source.name);
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
          } else {
            const schema = (schemaList || []).find(x => x.schemaName == colMatch[1]);
            if (schema) {
              list = createTableLikeList(schemaList, dbinfo, x => x.schemaName == schema.schemaName);
            }
          }
        } else {
          const onlyTables =
            lastKeyword == 'FROM' || lastKeyword == 'JOIN' || lastKeyword == 'UPDATE' || lastKeyword == 'DELETE';
          const onlyProcedures = lastKeyword == 'EXEC' || lastKeyword == 'EXECUTE' || lastKeyword == 'CALL';
          if (onlyProcedures) {
            list = dbinfo.procedures.map(x => ({
              name: x.pureName,
              value: x.pureName,
              caption: x.pureName,
              meta: 'procedure',
              score: 1000,
            }));
          } else {
            list = [
              ...(onlyTables ? [] : list),
              ...createTableLikeList(schemaList, dbinfo, x => !defaultSchema || defaultSchema == x.schemaName),

              ...(onlyTables
                ? []
                : _.flatten(
                    sourceObjects.map(obj =>
                      (obj.columns || []).map(col => ({
                        name: col.columnName,
                        value: obj.alias ? `${obj.alias}.${col.columnName}` : col.columnName,
                        caption: obj.alias ? `${obj.alias}.${col.columnName}` : col.columnName,
                        meta: `column (${obj.pureName})`,
                        score: 1200,
                      }))
                    )
                  )),
            ];
          }
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

      if (e.args == ' ' && /((from)|(join)|(update)|(call)|(exec)|(execute))\s*$/i.test(line)) {
        editor.execCommand('startAutocomplete');
      }
    }
  };

  editor.commands.on('afterExec', doLiveAutocomplete);

  return () => {
    editor.commands.removeListener('afterExec', doLiveAutocomplete);
  };
}
