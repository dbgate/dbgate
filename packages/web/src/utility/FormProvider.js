import React from 'react';
import { FormFieldTemplateDefault } from './formStyle';
import keycodes from './keycodes';

const FormContext = React.createContext(null);
const FormFieldTemplateContext = React.createContext(null);

export function FormProvider({ children, initialValues = {}, template = FormFieldTemplateDefault }) {
  const [values, setValues] = React.useState(initialValues);
  return (
    <FormProviderCore values={values} setValues={setValues} template={template}>
      {children}
    </FormProviderCore>
  );
}

export function FormProviderCore({ children, values, setValues, template = FormFieldTemplateDefault }) {
  const [submitAction, setSubmitAction] = React.useState(null);
  const handleEnter = React.useCallback(
    (e) => {
      if (e.keyCode == keycodes.enter && submitAction && submitAction.action) {
        e.preventDefault();
        submitAction.action(values);
      }
    },
    [submitAction, values]
  );
  React.useEffect(() => {
    document.addEventListener('keyup', handleEnter);
    return () => {
      document.removeEventListener('keyup', handleEnter);
    };
  }, [handleEnter]);
  const setFieldValue = React.useCallback(
    (field, value) =>
      setValues((v) => ({
        ...v,
        [field]: value,
      })),
    [setValues]
  );
  const provider = {
    values,
    setValues,
    setFieldValue,
    setSubmitAction,
  };
  return (
    <FormContext.Provider value={provider}>
      <FormFieldTemplateProvider template={template}>{children}</FormFieldTemplateProvider>
    </FormContext.Provider>
  );
}

export function useForm() {
  return React.useContext(FormContext);
}

export function FormFieldTemplateProvider({ children, template = FormFieldTemplateDefault }) {
  return <FormFieldTemplateContext.Provider value={template}>{children}</FormFieldTemplateContext.Provider>;
}

export function useFormFieldTemplate() {
  return React.useContext(FormFieldTemplateContext);
}
