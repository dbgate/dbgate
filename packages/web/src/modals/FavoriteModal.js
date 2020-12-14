import React from 'react';
import ModalBase from './ModalBase';
import {
  FormTextField,
  FormSubmit,
  FormButton,
  FormCheckboxField,
  FormFieldTemplate,
  FormCondition,
  FormSelectField,
} from '../utility/forms';
import ModalHeader from './ModalHeader';
import ModalContent from './ModalContent';
import ModalFooter from './ModalFooter';
import { FormProvider, useForm } from '../utility/FormProvider';
import axios from '../utility/axios';
import uuidv1 from 'uuid/v1';
import { FontIcon } from '../icons';
import useHasPermission from '../utility/useHasPermission';
import _ from 'lodash';
import getElectron from '../utility/getElectron';
import { copyTextToClipboard } from '../utility/clipboard';
import localforage from 'localforage';

function FontIconPreview() {
  const { values } = useForm();
  return <FontIcon icon={values.icon} />;
}

export default function FavoriteModal({ modalState, editingData = undefined, savingTab = undefined }) {
  const hasPermission = useHasPermission();
  const electron = getElectron();
  const savedProperties = ['title', 'icon', 'showInToolbar', 'openOnStartup', 'urlPath'];
  const initialValues = React.useMemo(() => {
    if (savingTab) {
      const res = {
        title: savingTab.title,
        icon: savingTab.icon,
        urlPath: _.kebabCase(_.deburr(savingTab.title)),
      };
      if (!hasPermission('files/favorites/write')) {
        res.shareAsLink = true;
      }
      return res;
    }
    if (editingData) {
      return _.pick(editingData, savedProperties);
    }
  }, []);

  const savedFile = savingTab && savingTab.props && savingTab.props.savedFile;

  const getTabSaveData = async (values) => {
    const tabdata = {};
    const skipEditor = !!savedFile && values.whatToSave != 'content';

    const re = new RegExp(`tabdata_(.*)_${savingTab.tabid}`);
    for (const key of await localforage.keys()) {
      const match = key.match(re);
      if (!match) continue;
      if (skipEditor && match[1] == 'editor') continue;
      tabdata[match[1]] = await localforage.getItem(key);
    }
    for (const key in localStorage) {
      const match = key.match(re);
      if (!match) continue;
      if (skipEditor && match[1] == 'editor') continue;
      tabdata[match[1]] = JSON.parse(localStorage.getItem(key));
    }
    console.log('tabdata', tabdata, skipEditor, savingTab.tabid);

    return {
      props:
        values.whatToSave == 'content' && savingTab.props
          ? _.omit(savingTab.props, ['savedFile', 'savedFormat', 'savedFolder'])
          : savingTab.props,
      tabComponent: savingTab.tabComponent,
      tabdata,
      ..._.pick(values, savedProperties),
    };
  };

  const saveTab = async (values) => {
    const data = await getTabSaveData(values);

    axios.post('files/save', {
      folder: 'favorites',
      file: uuidv1(),
      format: 'json',
      data,
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

  const handleCopyLink = async (values) => {
    const tabdata = await getTabSaveData(values);
    copyTextToClipboard(`${document.location.origin}#tabdata=${encodeURIComponent(JSON.stringify(tabdata))}`);
  };

  return (
    <ModalBase modalState={modalState}>
      <ModalHeader modalState={modalState}>{editingData ? 'Edit favorite' : 'Add to favorites'}</ModalHeader>
      <FormProvider initialValues={initialValues}>
        <ModalContent>
          <FormTextField label="Title" name="title" focused />
          <FormTextField label="Icon" name="icon" />
          <FormFieldTemplate label="Icon preview" type="icon">
            <FontIconPreview />
          </FormFieldTemplate>
          <FormTextField label="URL path" name="urlPath" />
          {!!savingTab && !electron && hasPermission('files/favorites/write') && (
            <FormCheckboxField label="Share as link" name="shareAsLink" />
          )}
          <FormCondition condition={(values) => !values.shareAsLink}>
            <FormCheckboxField label="Show in toolbar" name="showInToolbar" />
            <FormCheckboxField label="Open on startup" name="openOnStartup" />
          </FormCondition>
          {!!savingTab && !!savedFile && (
            <FormSelectField label="What to save" name="whatToSave">
              <option value="fileName">Link to file</option>
              <option value="content">Content</option>
            </FormSelectField>
          )}
        </ModalContent>
        <ModalFooter>
          <FormCondition condition={(values) => !values.shareAsLink && hasPermission('files/favorites/write')}>
            <FormSubmit value="OK" onClick={handleSubmit} />
          </FormCondition>
          <FormCondition condition={(values) => values.shareAsLink}>
            <FormButton value="Copy link" onClick={handleCopyLink} />
          </FormCondition>
          <FormButton value="Cancel" onClick={() => modalState.close()} />
        </ModalFooter>
      </FormProvider>
    </ModalBase>
  );
}
