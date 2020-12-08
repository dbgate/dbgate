import React from 'react';
import moment from 'moment';
import ModalBase from './ModalBase';
import FormStyledButton from '../widgets/FormStyledButton';
import styled from 'styled-components';
import ModalHeader from './ModalHeader';
import ModalFooter from './ModalFooter';
import ModalContent from './ModalContent';
import ImportExportConfigurator from '../impexp/ImportExportConfigurator';
import createImpExpScript from '../impexp/createImpExpScript';
import { openNewTab } from '../utility/common';
import { useCurrentArchive, useSetCurrentArchive, useSetCurrentWidget, useSetOpenedTabs } from '../utility/globalState';
import RunnerOutputPane from '../query/RunnerOutputPane';
import axios from '../utility/axios';
import WidgetColumnBar, { WidgetColumnBarItem } from '../widgets/WidgetColumnBar';
import SocketMessagesView from '../query/SocketMessagesView';
import RunnerOutputFiles from '../query/RunnerOuputFiles';
import useTheme from '../theme/useTheme';
import PreviewDataGrid from '../impexp/PreviewDataGrid';
import useSocket from '../utility/SocketProvider';
import LoadingInfo from '../widgets/LoadingInfo';
import { FontIcon } from '../icons';
import LargeButton, { LargeFormButton } from '../widgets/LargeButton';
import { getDefaultFileFormat } from '../utility/fileformats';
import useExtensions from '../utility/useExtensions';
import { FormProvider, useForm } from '../utility/FormProvider';
import { FormTextField } from '../utility/forms';

const headerHeight = '60px';
const footerHeight = '100px';

const OutputContainer = styled.div`
  position: relative;
  height: 150px;
`;

const Wrapper = styled.div`
  display: flex;
  // flex: 1;

  position: fixed;
  top: ${headerHeight};
  left: 0;
  right: 0;
  bottom: ${footerHeight};
`;

const WidgetColumnWrapper = styled.div`
  max-width: 40%;
  // flex-basis: 50%;
  // flow-grow: 0;
  display: flex;
  flex: 1;
  overflow: hidden;
  border-left: 1px solid ${(props) => props.theme.border};
`;

const FormWrapper = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;

  display: flex;
  flex-direction: column;
`;

const ContentWrapper = styled.div`
  border-top: 1px solid ${(props) => props.theme.border};
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
`;

const Footer = styled.div`
  position: fixed;
  height: ${footerHeight};
  left: 0;
  right: 0;
  bottom: 0px;
  background-color: ${(props) => props.theme.modalheader_background};

  border-top: 1px solid ${(props) => props.theme.border};
  // padding: 15px;
`;

const FooterButtons = styled.div`
  margin: 15px;
  display: flex;
`;

function GenerateSctriptButton({ modalState }) {
  const setOpenedTabs = useSetOpenedTabs();
  const { values } = useForm();
  const extensions = useExtensions();

  const handleGenerateScript = async () => {
    const code = await createImpExpScript(extensions, values);
    openNewTab(
      setOpenedTabs,
      {
        title: 'Shell',
        icon: 'img shell',
        tabComponent: 'ShellTab',
      },
      code
    );
    modalState.close();
  };

  return (
    <LargeButton icon="img sql-file" onClick={handleGenerateScript}>
      Generate script
    </LargeButton>
  );
}

export default function ImportExportModal({
  modalState,
  initialValues,
  uploadedFile = undefined,
  importToArchive = false,
}) {
  const [executeNumber, setExecuteNumber] = React.useState(0);
  const [runnerId, setRunnerId] = React.useState(null);
  const archive = useCurrentArchive();
  const theme = useTheme();
  const [previewReader, setPreviewReader] = React.useState(0);
  const targetArchiveFolder = importToArchive ? `import-${moment().format('YYYY-MM-DD-hh-mm-ss')}` : archive;
  const socket = useSocket();
  const refreshArchiveFolderRef = React.useRef(null);
  const setArchive = useSetCurrentArchive();
  const setCurrentWidget = useSetCurrentWidget();
  const extensions = useExtensions();

  const [busy, setBusy] = React.useState(false);

  const handleRunnerDone = React.useCallback(() => {
    setBusy(false);
    if (refreshArchiveFolderRef.current) {
      axios.post('archive/refresh-folders', {});
      axios.post('archive/refresh-files', { folder: refreshArchiveFolderRef.current });
      setArchive(refreshArchiveFolderRef.current);
      setCurrentWidget('archive');
    }
  }, []);

  React.useEffect(() => {
    if (runnerId && socket) {
      socket.on(`runner-done-${runnerId}`, handleRunnerDone);
      return () => {
        socket.off(`runner-done-${runnerId}`, handleRunnerDone);
      };
    }
  }, [runnerId, socket]);

  const handleExecute = async (values) => {
    if (busy) return;

    setBusy(true);
    const script = await createImpExpScript(extensions, values);

    setExecuteNumber((num) => num + 1);

    let runid = runnerId;
    const resp = await axios.post('runners/start', { script });
    runid = resp.data.runid;
    setRunnerId(runid);
    if (values.targetStorageType == 'archive') {
      refreshArchiveFolderRef.current = values.targetArchiveFolder;
    } else {
      refreshArchiveFolderRef.current = null;
    }
  };

  const handleCancel = () => {
    axios.post('runners/cancel', {
      runid: runnerId,
    });
  };

  return (
    <ModalBase modalState={modalState} fullScreen isFlex>
      <FormProvider
        initialValues={{
          sourceStorageType: 'database',
          targetStorageType: importToArchive ? 'archive' : getDefaultFileFormat(extensions).storageType,
          sourceArchiveFolder: archive,
          targetArchiveFolder,
          ...initialValues,
        }}
      >
        <FormWrapper>
          <ModalHeader modalState={modalState}>Import/Export {busy && <FontIcon icon="icon loading" />}</ModalHeader>
          <Wrapper>
            <ContentWrapper theme={theme}>
              <ImportExportConfigurator uploadedFile={uploadedFile} onChangePreview={setPreviewReader} />
            </ContentWrapper>
            <WidgetColumnWrapper theme={theme}>
              <WidgetColumnBar>
                <WidgetColumnBarItem title="Output files" name="output" height="20%">
                  <RunnerOutputFiles runnerId={runnerId} executeNumber={executeNumber} />
                </WidgetColumnBarItem>
                <WidgetColumnBarItem title="Messages" name="messages">
                  <SocketMessagesView
                    eventName={runnerId ? `runner-info-${runnerId}` : null}
                    executeNumber={executeNumber}
                  />
                </WidgetColumnBarItem>
                {previewReader && (
                  <WidgetColumnBarItem title="Preview" name="preview">
                    <PreviewDataGrid reader={previewReader} />
                  </WidgetColumnBarItem>
                )}
                <WidgetColumnBarItem title="Advanced configuration" name="config" collapsed>
                  <FormTextField label="Schedule" name="schedule" />
                  <FormTextField label="Start variable index" name="startVariableIndex" />
                </WidgetColumnBarItem>
              </WidgetColumnBar>
            </WidgetColumnWrapper>
          </Wrapper>
          <Footer theme={theme}>
            <FooterButtons>
              {busy ? (
                <LargeButton icon="icon close" onClick={handleCancel}>
                  Cancel
                </LargeButton>
              ) : (
                <LargeFormButton onClick={handleExecute} icon="icon run">
                  Run
                </LargeFormButton>
              )}
              <GenerateSctriptButton modalState={modalState} />
              <LargeButton onClick={modalState.close} icon="icon close">
                Close
              </LargeButton>
            </FooterButtons>
          </Footer>
        </FormWrapper>
      </FormProvider>
    </ModalBase>
  );
}
