import React from 'react';

const FormContext = React.createContext(null);

export function FormProvider({ children, initialValues }) {
  const [values, setValues] = React.useState(initialValues);
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
  };
  return <FormContext.Provider value={provider}>{children}</FormContext.Provider>;
}

export function useForm() {
  return React.useContext(FormContext);
}
