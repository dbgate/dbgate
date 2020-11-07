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

const OutputContainer = styled.div`
  position: relative;
  height: 150px;
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
    <ModalBase modalState={modalState}>
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
        <Form>
          <ModalHeader modalState={modalState}>Import/Export</ModalHeader>
          <ModalContent>
            <ImportExportConfigurator uploadedFile={uploadedFile} />
          </ModalContent>
          <ModalFooter>
            <FormStyledButton type="submit" value="Run" />
            <GenerateSctriptButton modalState={modalState} />
            <FormStyledButton type="button" value="Close" onClick={modalState.close} />
          </ModalFooter>
          {runnerId && (
            <OutputContainer>
              <RunnerOutputPane runnerId={runnerId} executeNumber={executeNumber} />
            </OutputContainer>
          )}
        </Form>
      </Formik>
    </ModalBase>
  );
}
