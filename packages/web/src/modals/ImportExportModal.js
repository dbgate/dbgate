import React from 'react';
import ModalBase from './ModalBase';
import FormStyledButton from '../widgets/FormStyledButton';
import { Formik, Form, useFormikContext } from 'formik';
import styled from 'styled-components';
import ModalHeader from './ModalHeader';
import ModalFooter from './ModalFooter';
import ModalContent from './ModalContent';
import ImportExportConfigurator from '../impexp/ImportExportConfigurator';
import createImpExpScript from '../impexp/createImpExpScript';
import { openNewTab } from '../utility/common';
import { useCurrentArchive, useSetOpenedTabs } from '../utility/globalState';
import RunnerOutputPane from '../query/RunnerOutputPane';
import axios from '../utility/axios';
import WidgetColumnBar, { WidgetColumnBarItem } from '../widgets/WidgetColumnBar';
import SocketMessagesView from '../query/SocketMessagesView';
import RunnerOutputFiles from '../query/RunnerOuputFiles';

const headerHeight = '60px';
const footerHeight = '60px';

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
  border-left: 1px solid #ccc;
`;

const StyledForm = styled(Form)`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;

  display: flex;
  flex-direction: column;
`;

const ContentWrapper = styled.div`
  // border-bottom: 1px solid #ccc;
  border-top: 1px solid #ccc;
  // padding: 15px;
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
  background-color: #eeffff;

  border-top: 1px solid #ccc;
  // padding: 15px;
`;

const FooterButtons = styled.div`
  margin: 15px;
`;

function GenerateSctriptButton({ modalState }) {
  const setOpenedTabs = useSetOpenedTabs();
  const { values } = useFormikContext();

  const handleGenerateScript = async () => {
    const code = await createImpExpScript(values);
    openNewTab(setOpenedTabs, {
      title: 'Shell',
      icon: 'trigger.svg',
      tabComponent: 'ShellTab',
      props: {
        initialScript: code,
      },
    });
    modalState.close();
  };

  return <FormStyledButton type="button" value="Generate script" onClick={handleGenerateScript} />;
}

export default function ImportExportModal({ modalState, initialValues, uploadedFile = undefined }) {
  const [executeNumber, setExecuteNumber] = React.useState(0);
  const [runnerId, setRunnerId] = React.useState(null);
  const archive = useCurrentArchive();

  const handleExecute = async (values) => {
    const script = await createImpExpScript(values);

    setExecuteNumber((num) => num + 1);

    let runid = runnerId;
    const resp = await axios.post('runners/start', { script });
    runid = resp.data.runid;
    setRunnerId(runid);
  };

  return (
    <ModalBase modalState={modalState} fullScreen isFlex>
      <Formik
        onSubmit={handleExecute}
        initialValues={{
          sourceStorageType: 'database',
          targetStorageType: 'csv',
          sourceArchiveFolder: archive,
          targetArchiveFolder: archive,
          ...initialValues,
        }}
      >
        <StyledForm>
          <ModalHeader modalState={modalState}>Import/Export</ModalHeader>
          <Wrapper>
            <ContentWrapper>
              <ImportExportConfigurator uploadedFile={uploadedFile} />
            </ContentWrapper>
            <WidgetColumnWrapper>
              <WidgetColumnBar>
                {/* <WidgetColumnBarItem title="Preview" name="preview">
                  Preview
                </WidgetColumnBarItem> */}
                <WidgetColumnBarItem title="Output files" name="output" height="20%">
                  <RunnerOutputFiles runnerId={runnerId} executeNumber={executeNumber} />
                </WidgetColumnBarItem>
                <WidgetColumnBarItem title="Messages" name="messages">
                  <SocketMessagesView
                    eventName={runnerId ? `runner-info-${runnerId}` : null}
                    executeNumber={executeNumber}
                  />
                </WidgetColumnBarItem>
              </WidgetColumnBar>
            </WidgetColumnWrapper>
          </Wrapper>
          <Footer>
            <FooterButtons>
              <FormStyledButton type="submit" value="Run" />
              <GenerateSctriptButton modalState={modalState} />
              <FormStyledButton type="button" value="Close" onClick={modalState.close} />
            </FooterButtons>
          </Footer>
        </StyledForm>
      </Formik>
    </ModalBase>
  );
}
