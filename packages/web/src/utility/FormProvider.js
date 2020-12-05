import React from 'react';
import keycodes from './keycodes';

const FormContext = React.createContext(null);

export function FormProvider({ children, initialValues = {} }) {
  const [values, setValues] = React.useState(initialValues);
  return (
    <FormProviderCore values={values} setValues={setValues}>
      {children}
    </FormProviderCore>
  );
}

export function FormProviderCore({ children, values, setValues }) {
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
  return <FormContext.Provider value={provider}>{children}</FormContext.Provider>;
}

export function useForm() {
  return React.useContext(FormContext);
}
