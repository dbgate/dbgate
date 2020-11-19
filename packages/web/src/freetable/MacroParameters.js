import React from 'react';
import _ from 'lodash';
import { Formik, Form, useFormikContext } from 'formik';
import FormArgumentList from '../utility/FormArgumentList';


export default function MacroParameters({ args, onChangeValues, macroValues, namePrefix }) {
  if (!args || args.length == 0) return null;
  const initialValues = {
    ..._.fromPairs(args.filter((x) => x.default != null).map((x) => [`${namePrefix}${x.name}`, x.default])),
    ...macroValues,
  };
  return (
    <Formik initialValues={initialValues} onSubmit={() => {}}>
      <Form>
        <FormArgumentList args={args} onChangeValues={onChangeValues} namePrefix={namePrefix} />
      </Form>
    </Formik>
  );
}
