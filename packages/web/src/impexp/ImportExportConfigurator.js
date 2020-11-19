import React from 'react';
import _ from 'lodash';
import FormStyledButton from '../widgets/FormStyledButton';
import { useFormikContext } from 'formik';
import styled from 'styled-components';
import {
  FormReactSelect,
  FormConnectionSelect,
  FormDatabaseSelect,
  FormTablesSelect,
  FormSchemaSelect,
  FormArchiveFolderSelect,
  FormArchiveFilesSelect,
} from '../utility/forms';
import { useArchiveFiles, useConnectionInfo, useDatabaseInfo } from '../utility/metadataLoaders';
import TableControl, { TableColumn } from '../utility/TableControl';
import { TextField, SelectField, CheckboxField } from '../utility/inputs';
import { createPreviewReader, getActionOptions, getTargetName, isFileStorage } from './createImpExpScript';
import getElectron from '../utility/getElectron';
import ErrorInfo from '../widgets/ErrorInfo';
import getAsArray from '../utility/getAsArray';
import axios from '../utility/axios';
import LoadingInfo from '../widgets/LoadingInfo';
import SqlEditor from '../sqleditor/SqlEditor';
import { useUploadsProvider } from '../utility/UploadsProvider';
import { FontIcon } from '../icons';
import useTheme from '../theme/useTheme';
import { fileformats, findFileFormat, getFileFormatDirections } from '../fileformats';
import FormArgumentList from '../utility/FormArgumentList';

const Container = styled.div`
  // max-height: 50vh;
  // overflow-y: scroll;
  flex: 1;
`;

const Wrapper = styled.div`
  display: flex;
`;

const SourceListWrapper = styled.div`
  margin: 10px;
`;

const Column = styled.div`
  margin: 10px;
  flex: 1;
`;

const Label = styled.div`
  margin: 5px;
  margin-top: 15px;
  color: ${(props) => props.theme.modal_font2};
`;

const SourceNameWrapper = styled.div`
  display: flex;
  justify-content: space-between;
`;

const TrashWrapper = styled.div`
  &:hover {
    background-color: ${(props) => props.theme.modal_background2};
  }
  cursor: pointer;
  color: ${(props) => props.theme.modal_font_blue[7]};
`;

const SqlWrapper = styled.div`
  position: relative;
  height: 100px;
  width: 20vw;
`;

const DragWrapper = styled.div`
  padding: 10px;
  background: ${(props) => props.theme.modal_background2};
`;

const ArrowWrapper = styled.div`
  font-size: 30px;
  color: ${(props) => props.theme.modal_font_blue[7]};
  align-self: center;
`;

const Title = styled.div`
  font-size: 20px;
  text-align: center;
  margin: 10px 0px;
`;

function getFileFilters(storageType) {
  const res = [];
  const format = findFileFormat(storageType);
  if (format) res.push({ name: format.name, extensions: [format.extension] });
  res.push({ name: 'All Files', extensions: ['*'] });
  return res;
}

async function addFilesToSourceList(files, values, setValues, preferedStorageType, setPreviewSource) {
  const newSources = [];
  const newValues = {};
  const storage = preferedStorageType || values.sourceStorageType;
  for (const file of getAsArray(files)) {
    const format = findFileFormat(storage);
    if (format && format.addFilesToSourceList) {
      await format.addFilesToSourceList(file, newSources, newValues);
    }
  }
  newValues['sourceList'] = [...(values.sourceList || []).filter((x) => !newSources.includes(x)), ...newSources];
  if (preferedStorageType && preferedStorageType != values.sourceStorageType) {
    newValues['sourceStorageType'] = preferedStorageType;
  }
  setValues({
    ...values,
    ...newValues,
  });
  if (setPreviewSource && newSources.length == 1) {
    setPreviewSource(newSources[0]);
  }
}

function ElectronFilesInput() {
  const { values, setValues } = useFormikContext();
  const electron = getElectron();
  const [isLoading, setIsLoading] = React.useState(false);

  const handleClick = async () => {
    const files = electron.remote.dialog.showOpenDialogSync(electron.remote.getCurrentWindow(), {
      properties: ['openFile', 'multiSelections'],
      filters: getFileFilters(values.sourceStorageType),
    });
    if (files) {
      const path = window.require('path');
      try {
        setIsLoading(true);
        await addFilesToSourceList(
          files.map((full) => ({
            full,
            ...path.parse(full),
          })),
          values,
          setValues
        );
      } finally {
        setIsLoading(false);
      }
    }
  };

  return (
    <>
      <FormStyledButton type="button" value="Add file(s)" onClick={handleClick} />
      {isLoading && <LoadingInfo message="Anaysing input files" />}
    </>
  );
}

function FilesInput() {
  const theme = useTheme();
  const electron = getElectron();
  if (electron) {
    return <ElectronFilesInput />;
  }
  return <DragWrapper theme={theme}>Drag &amp; drop imported files here</DragWrapper>;
}

function SourceTargetConfig({
  direction,
  storageTypeField,
  connectionIdField,
  databaseNameField,
  archiveFolderField,
  schemaNameField,
  tablesField = undefined,
  engine = undefined,
}) {
  const theme = useTheme();
  const { values, setFieldValue } = useFormikContext();
  const types =
    values[storageTypeField] == 'jsldata'
      ? [{ value: 'jsldata', label: 'Query result data', directions: ['source'] }]
      : [
          { value: 'database', label: 'Database', directions: ['source', 'target'] },
          ...fileformats.map((format) => ({
            value: format.storageType,
            label: `${format.name} files(s)`,
            directions: getFileFormatDirections(format),
          })),
          { value: 'query', label: 'SQL Query', directions: ['source'] },
          { value: 'archive', label: 'Archive', directions: ['source', 'target'] },
        ];
  const storageType = values[storageTypeField];
  const dbinfo = useDatabaseInfo({ conid: values[connectionIdField], database: values[databaseNameField] });
  const archiveFiles = useArchiveFiles({ folder: values[archiveFolderField] });
  const format = findFileFormat(storageType);
  return (
    <Column>
      {direction == 'source' && (
        <Title theme={theme}>
          <FontIcon icon="icon import" /> Source configuration
        </Title>
      )}
      {direction == 'target' && (
        <Title theme={theme}>
          <FontIcon icon="icon export" /> Target configuration
        </Title>
      )}
      <FormReactSelect options={types.filter((x) => x.directions.includes(direction))} name={storageTypeField} />
      {(storageType == 'database' || storageType == 'query') && (
        <>
          <Label theme={theme}>Server</Label>
          <FormConnectionSelect name={connectionIdField} />
          <Label theme={theme}>Database</Label>
          <FormDatabaseSelect conidName={connectionIdField} name={databaseNameField} />
        </>
      )}
      {storageType == 'database' && (
        <>
          <Label theme={theme}>Schema</Label>
          <FormSchemaSelect conidName={connectionIdField} databaseName={databaseNameField} name={schemaNameField} />
          {tablesField && (
            <>
              <Label theme={theme}>Tables/views</Label>
              <FormTablesSelect
                conidName={connectionIdField}
                schemaName={schemaNameField}
                databaseName={databaseNameField}
                name={tablesField}
              />
              <div>
                <FormStyledButton
                  type="button"
                  value="All tables"
                  onClick={() =>
                    setFieldValue(
                      'sourceList',
                      _.uniq([...(values.sourceList || []), ...(dbinfo && dbinfo.tables.map((x) => x.pureName))])
                    )
                  }
                />
                <FormStyledButton
                  type="button"
                  value="All views"
                  onClick={() =>
                    setFieldValue(
                      'sourceList',
                      _.uniq([...(values.sourceList || []), ...(dbinfo && dbinfo.views.map((x) => x.pureName))])
                    )
                  }
                />
                <FormStyledButton type="button" value="Remove all" onClick={() => setFieldValue('sourceList', [])} />
              </div>
            </>
          )}
        </>
      )}
      {storageType == 'query' && (
        <>
          <Label theme={theme}>Query</Label>
          <SqlWrapper>
            <SqlEditor
              value={values.sourceSql}
              onChange={(value) => setFieldValue('sourceSql', value)}
              engine={engine}
              focusOnCreate
            />
          </SqlWrapper>
        </>
      )}

      {storageType == 'archive' && (
        <>
          <Label theme={theme}>Archive folder</Label>
          <FormArchiveFolderSelect
            name={archiveFolderField}
            additionalFolders={_.compact([values[archiveFolderField]])}
          />
        </>
      )}

      {storageType == 'archive' && direction == 'source' && (
        <>
          <Label theme={theme}>Source files</Label>
          <FormArchiveFilesSelect folderName={values[archiveFolderField]} name={tablesField} />
          <div>
            <FormStyledButton
              type="button"
              value="All files"
              onClick={() =>
                setFieldValue(
                  'sourceList',
                  _.uniq([...(values.sourceList || []), ...(archiveFiles && archiveFiles.map((x) => x.name))])
                )
              }
            />
            <FormStyledButton type="button" value="Remove all" onClick={() => setFieldValue('sourceList', [])} />
          </div>
        </>
      )}

      {!!format && direction == 'source' && <FilesInput />}

      {format && format.args && (
        <FormArgumentList
          args={format.args.filter((arg) => !arg.direction || arg.direction == direction)}
          namePrefix={`${direction}_${format.storageType}_`}
        />
      )}
    </Column>
  );
}

function SourceName({ name }) {
  const { values, setFieldValue } = useFormikContext();
  const theme = useTheme();
  const handleDelete = () => {
    setFieldValue(
      'sourceList',
      values.sourceList.filter((x) => x != name)
    );
  };

  return (
    <SourceNameWrapper>
      <div>{name}</div>
      <TrashWrapper onClick={handleDelete} theme={theme}>
        <FontIcon icon="icon delete" />
      </TrashWrapper>
    </SourceNameWrapper>
  );
}

export default function ImportExportConfigurator({ uploadedFile = undefined, onChangePreview = undefined }) {
  const { values, setFieldValue, setValues } = useFormikContext();
  const targetDbinfo = useDatabaseInfo({ conid: values.targetConnectionId, database: values.targetDatabaseName });
  const sourceConnectionInfo = useConnectionInfo({ conid: values.sourceConnectionId });
  const { engine: sourceEngine } = sourceConnectionInfo || {};
  const { sourceList } = values;
  const { setUploadListener } = useUploadsProvider();
  const theme = useTheme();
  const [previewSource, setPreviewSource] = React.useState(null);

  const handleUpload = React.useCallback(
    (file) => {
      addFilesToSourceList(
        [
          {
            full: file.filePath,
            name: file.shortName,
          },
        ],
        values,
        setValues,
        !sourceList || sourceList.length == 0 ? file.storageType : null,
        setPreviewSource
      );
      // setFieldValue('sourceList', [...(sourceList || []), file.originalName]);
    },
    [setFieldValue, sourceList, values]
  );

  React.useEffect(() => {
    setUploadListener(() => handleUpload);
    return () => {
      setUploadListener(null);
    };
  }, [handleUpload]);

  React.useEffect(() => {
    if (uploadedFile) {
      handleUpload(uploadedFile);
    }
  }, []);

  const supportsPreview = !!findFileFormat(values.sourceStorageType);

  const handleChangePreviewSource = async () => {
    if (previewSource && supportsPreview) {
      const reader = await createPreviewReader(values, previewSource);
      if (onChangePreview) onChangePreview(reader);
    } else {
      onChangePreview(null);
    }
  };

  React.useEffect(() => {
    handleChangePreviewSource();
  }, [previewSource, supportsPreview]);

  const oldValues = React.useRef({});
  React.useEffect(() => {
    const changed = _.pickBy(
      values,
      (v, k) => k.startsWith(`source_${values.sourceStorageType}_`) && oldValues.current[k] != v
    );
    if (!_.isEmpty(changed)) {
      handleChangePreviewSource();
    }
    oldValues.current = values;
  }, [values]);

  return (
    <Container>
      <Wrapper>
        <SourceTargetConfig
          direction="source"
          storageTypeField="sourceStorageType"
          connectionIdField="sourceConnectionId"
          databaseNameField="sourceDatabaseName"
          archiveFolderField="sourceArchiveFolder"
          schemaNameField="sourceSchemaName"
          tablesField="sourceList"
          engine={sourceEngine}
        />
        <ArrowWrapper theme={theme}>
          <FontIcon icon="icon arrow-right" />
        </ArrowWrapper>
        <SourceTargetConfig
          direction="target"
          storageTypeField="targetStorageType"
          connectionIdField="targetConnectionId"
          databaseNameField="targetDatabaseName"
          archiveFolderField="targetArchiveFolder"
          schemaNameField="targetSchemaName"
        />
      </Wrapper>
      <SourceListWrapper>
        <Title>
          <FontIcon icon="icon tables" /> Map source tables/files
        </Title>
        <TableControl rows={sourceList || []}>
          <TableColumn fieldName="source" header="Source" formatter={(row) => <SourceName name={row} />} />
          <TableColumn
            fieldName="action"
            header="Action"
            formatter={(row) => (
              <SelectField
                options={getActionOptions(row, values, targetDbinfo)}
                value={values[`actionType_${row}`] || getActionOptions(row, values, targetDbinfo)[0].value}
                onChange={(e) => setFieldValue(`actionType_${row}`, e.target.value)}
              />
            )}
          />
          <TableColumn
            fieldName="target"
            header="Target"
            formatter={(row) => (
              <TextField
                value={getTargetName(row, values)}
                onChange={(e) => setFieldValue(`targetName_${row}`, e.target.value)}
              />
            )}
          />
          <TableColumn
            fieldName="preview"
            header="Preview"
            formatter={(row) =>
              supportsPreview ? (
                <CheckboxField
                  checked={previewSource == row}
                  onChange={(e) => {
                    if (e.target.checked) setPreviewSource(row);
                    else setPreviewSource(null);
                  }}
                />
              ) : null
            }
          />
        </TableControl>
        {(sourceList || []).length == 0 && <ErrorInfo message="No source tables/files" icon="img alert" />}
      </SourceListWrapper>
    </Container>
  );
}
