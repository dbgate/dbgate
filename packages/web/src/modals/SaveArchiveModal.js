import React from 'react';
import ModalBase from './ModalBase';
import { FormTextField, FormSubmit, FormArchiveFolderSelect, FormFieldTemplate } from '../utility/forms';
import styled from 'styled-components';
import ModalHeader from './ModalHeader';
import ModalContent from './ModalContent';
import ModalFooter from './ModalFooter';
import { FormProvider } from '../utility/FormProvider';

const SelectWrapper = styled.div`
  width: 150px;
  position: relative;
  flex: 1;
`;

export default function SaveArchiveModal({ file = 'new-table', folder = 'default', modalState, onSave }) {
  const handleSubmit = async (values) => {
    const { file, folder } = values;
    modalState.close();
    if (onSave) onSave(folder, file);
  };
  return (
    <ModalBase modalState={modalState}>
      <ModalHeader modalState={modalState}>Save to archive</ModalHeader>
      <FormProvider initialValues={{ file, folder }}>
        <ModalContent>
          <FormFieldTemplate label="Folder" type="select">
            <SelectWrapper>
              <FormArchiveFolderSelect name="folder" />
            </SelectWrapper>
          </FormFieldTemplate>
          <FormTextField label="File name" name="file" />
        </ModalContent>
        <ModalFooter>
          <FormSubmit value="Save" onClick={handleSubmit} />
        </ModalFooter>
      </FormProvider>
    </ModalBase>
  );
}
