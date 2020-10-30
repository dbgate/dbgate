import React from 'react';
import { FormTextField, FormSubmit, FormArchiveFolderSelect, FormRow, FormLabel } from '../utility/forms';
import { Formik, Form, useFormikContext } from 'formik';

function MacroArgument({ arg }) {
  if (arg.type == 'text') {
    return <FormTextField label={arg.label} name={arg.name} />;
  }
  return null;
}

function MacroArgumentList({ args, onChangeValues }) {
  const { values } = useFormikContext();
  React.useEffect(() => {
    if (onChangeValues) onChangeValues(values);
  }, [values]);
  return (
    <>
      {' '}
      {args.map((arg) => (
        <MacroArgument arg={arg} key={arg.name} />
      ))}
    </>
  );
}

export default function MacroParameters({ args, onChangeValues, initialValues }) {
  if (!args || args.length == 0) return null;
  return (
    <Formik initialValues={initialValues} onSubmit={() => {}}>
      <Form>
        <MacroArgumentList args={args} onChangeValues={onChangeValues} />
      </Form>
    </Formik>
  );
}
