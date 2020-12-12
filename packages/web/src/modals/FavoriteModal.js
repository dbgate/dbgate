import React from 'react';
import ModalBase from './ModalBase';
import { FormTextField, FormSubmit, FormButton, FormCheckboxField } from '../utility/forms';
import ModalHeader from './ModalHeader';
import ModalContent from './ModalContent';
import ModalFooter from './ModalFooter';
import { FormProvider, useForm } from '../utility/FormProvider';
import axios from '../utility/axios';
import uuidv1 from 'uuid/v1';
import { FontIcon } from '../icons';
import { FormFieldTemplateDefault } from '../utility/formStyle';

function FontIconPreview() {
  const { values } = useForm();
  return <FontIcon icon={values.icon} />;
}

export default function FavoriteModal({ modalState, editingData = undefined, savingTab = undefined }) {
  const initialValues = React.useMemo(() => {
    if (savingTab) {
      return {
        title: savingTab.title,
        icon: savingTab.icon,
      };
    }
    if (editingData) {
      return {
        title: editingData.title,
        icon: editingData.icon,
      };
    }
  }, []);

  const saveTab = async (values) => {
    const tabdata = {};

    const re = new RegExp(`tabdata_(.*)_${savingTab.tabid}`);
    for (const key in localStorage) {
      const match = key.match(re);
      if (!match) continue;
      if (match[1] == 'editor') continue;
      tabdata[match[1]] = JSON.parse(localStorage.getItem(key));
    }

    axios.post('files/save', {
      folder: 'favorites',
      file: uuidv1(),
      format: 'json',
      data: {
        props: savingTab.props,
        tabComponent: savingTab.tabComponent,
        tabdata,
        ...values,
        // title: values.title,
        // icon: values.icon,
        // showInToolbar: values.showInToolbar,
        // openOnStartup: values.openOnStartup,
      },
    });
  };

  const saveFile = async (values) => {
    const oldDataResp = await axios.post('files/load', {
      folder: 'favorites',
      file: editingData.file,
      format: 'json',
    });

    axios.post('files/save', {
      folder: 'favorites',
      file: editingData.file,
      format: 'json',
      data: {
        ...oldDataResp.data,
        ...values,
      },
    });
  };

  const handleSubmit = async (values) => {
    modalState.close();
    if (savingTab) {
      saveTab(values);
    }
    if (editingData) {
      saveFile(values);
    }
  };
  return (
    <ModalBase modalState={modalState}>
      <ModalHeader modalState={modalState}>{editingData ? 'Edit favorite' : 'Add to favorites'}</ModalHeader>
      <FormProvider initialValues={initialValues}>
        <ModalContent>
          <FormTextField label="Title" name="title" focused />
          <FormTextField label="Icon" name="icon" />
          <FormFieldTemplateDefault label="Icon preview" type="icon">
            <FontIconPreview />
          </FormFieldTemplateDefault>
          <FormCheckboxField label="Show in toolbar" name="showInToolbar" />
          <FormCheckboxField label="Open on startup" name="openOnStartup" />
        </ModalContent>
        <ModalFooter>
          <FormButton value="Cancel" onClick={() => modalState.close()} />
          <FormSubmit value="OK" onClick={handleSubmit} />
        </ModalFooter>
      </FormProvider>
    </ModalBase>
  );
}
