import React from 'react';
import ModalBase from './ModalBase';
import FormStyledButton from '../widgets/FormStyledButton';
import styled from 'styled-components';
import Select from 'react-select';
import { FontIcon } from '../icons';
import { FormButtonRow, FormSubmit } from '../utility/forms';
import ModalHeader from './ModalHeader';
import ModalFooter from './ModalFooter';
import ModalContent from './ModalContent';
import { useConnectionList, useDatabaseList } from '../utility/metadataLoaders';
import ImportExportConfigurator from '../impexp/ImportExportConfigurator';
import createImpExpScript from '../impexp/createImpExpScript';
import { openNewTab } from '../utility/common';
import { useSetOpenedTabs } from '../utility/globalState';
import { Formik, Form, useFormik, useFormikContext } from 'formik';

export default function ImportExportModal({ modalState, initialValues }) {
  const setOpenedTabs = useSetOpenedTabs();

  const handleSubmit = async (values) => {
    const code = await createImpExpScript(values);
    openNewTab(setOpenedTabs, {
      title: 'Shell',
      icon: 'trigger.svg',
      tabComponent: 'ShellTab',
      props: {
        initialScript: code,
      },
    });
    // modalState.close();
  };
  return (
    <ModalBase modalState={modalState}>
      <Formik
        onSubmit={handleSubmit}
        initialValues={{ sourceStorageType: 'database', targetStorageType: 'csv', ...initialValues }}
      >
        <Form>
          <ModalHeader modalState={modalState}>Import/Export</ModalHeader>
          <ModalContent>
            <ImportExportConfigurator />
          </ModalContent>
          <ModalFooter>
            <FormStyledButton type="submit" value="Generate script" />
            <FormStyledButton type="button" value="Close" onClick={modalState.close} />
          </ModalFooter>
        </Form>
      </Formik>
    </ModalBase>
  );
}
