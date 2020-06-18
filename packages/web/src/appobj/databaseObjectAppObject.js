import _ from 'lodash';
import React from 'react';
import { getIconImage } from '../icons';
import { DropDownMenuItem } from '../modals/DropDownMenu';
import { openNewTab } from '../utility/common';
import { getConnectionInfo } from '../utility/metadataLoaders';
import fullDisplayName from '../utility/fullDisplayName';
import { filterName, fullNameToString } from '@dbgate/datalib';
import ImportExportModal from '../modals/ImportExportModal';

const icons = {
  tables: 'table2.svg',
  views: 'view2.svg',
  procedures: 'procedure2.svg',
  functions: 'function.svg',
};

const menus = {
  tables: [
    {
      label: 'Open data',
      tab: 'TableDataTab',
    },
    {
      label: 'Open structure',
      tab: 'TableStructureTab',
    },
    {
      label: 'Show CREATE TABLE script',
      sqlTemplate: 'CREATE TABLE',
    },
    {
      label: 'Export',
      isExport: true,
    },
  ],
  views: [
    {
      label: 'Open data',
      tab: 'ViewDataTab',
    },
    {
      label: 'Show CREATE VIEW script',
      sqlTemplate: 'CREATE OBJECT',
    },
    {
      label: 'Export',
      isExport: true,
    },
  ],
  procedures: [
    {
      label: 'Show CREATE PROCEDURE script',
      sqlTemplate: 'CREATE OBJECT',
    },
    {
      label: 'Show EXECUTE script',
      sqlTemplate: 'EXECUTE PROCEDURE',
    },
  ],
  functions: [
    {
      label: 'Show CREATE FUNCTION script',
      sqlTemplate: 'CREATE OBJECT',
    },
  ],
};

const defaultTabs = {
  tables: 'TableDataTab',
  views: 'ViewDataTab',
};

async function openObjectDetail(
  setOpenedTabs,
  tabComponent,
  sqlTemplate,
  { schemaName, pureName, conid, database, objectTypeField }
) {
  const connection = await getConnectionInfo({ conid });
  const tooltip = `${connection.displayName || connection.server}\n${database}\n${fullDisplayName({
    schemaName,
    pureName,
  })}`;

  openNewTab(setOpenedTabs, {
    title: pureName,
    tooltip,
    icon: sqlTemplate ? 'sql.svg' : icons[objectTypeField],
    tabComponent: sqlTemplate ? 'QueryTab' : tabComponent,
    props: {
      schemaName,
      pureName,
      conid,
      database,
      objectTypeField,
      initialArgs: sqlTemplate ? { sqlTemplate } : null,
    },
  });
}

function Menu({ data, makeAppObj, setOpenedTabs, showModal }) {
  return (
    <>
      {menus[data.objectTypeField].map((menu) => (
        <DropDownMenuItem
          key={menu.label}
          onClick={() => {
            if (menu.isExport) {
              showModal((modalState) => (
                <ImportExportModal
                  modalState={modalState}
                  initialValues={{
                    sourceStorageType: 'database',
                    sourceConnectionId: data.conid,
                    sourceDatabaseName: data.database,
                    sourceSchemaName: data.schemaName,
                    sourceTables: [data.pureName],
                  }}
                />
              ));
            } else {
              openObjectDetail(setOpenedTabs, menu.tab, menu.sqlTemplate, data);
            }
          }}
        >
          {menu.label}
        </DropDownMenuItem>
      ))}
    </>
  );
}

const databaseObjectAppObject = () => (
  { conid, database, pureName, schemaName, objectTypeField },
  { setOpenedTabs }
) => {
  const title = schemaName ? `${schemaName}.${pureName}` : pureName;
  const key = title;
  const Icon = (props) => getIconImage(icons[objectTypeField], props);
  const onClick = ({ schemaName, pureName }) => {
    openObjectDetail(
      setOpenedTabs,
      defaultTabs[objectTypeField],
      defaultTabs[objectTypeField] ? null : 'CREATE OBJECT',
      {
        schemaName,
        pureName,
        conid,
        database,
        objectTypeField,
      }
    );
  };
  const matcher = (filter) => filterName(filter, pureName);
  const groupTitle = _.startCase(objectTypeField);

  return { title, key, Icon, Menu, onClick, matcher, groupTitle };
};

export default databaseObjectAppObject;
