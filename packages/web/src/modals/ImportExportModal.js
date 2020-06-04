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

export default function ImportExportModal({ modalState }) {
  return (
    <ModalBase modalState={modalState}>
      <ModalHeader modalState={modalState}>Import/Export</ModalHeader>
      <ModalContent>
        <ImportExportConfigurator />
      </ModalContent>
      <ModalFooter>
        <FormStyledButton type="button" value="Close" onClick={modalState.close} />
      </ModalFooter>
    </ModalBase>
  );
}
