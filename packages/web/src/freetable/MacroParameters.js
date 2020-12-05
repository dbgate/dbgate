import React from 'react';
import _ from 'lodash';
import FormArgumentList from '../utility/FormArgumentList';
import { FormProvider } from '../utility/FormProvider';

export default function MacroParameters({ args, onChangeValues, macroValues, namePrefix }) {
  if (!args || args.length == 0) return null;
  const initialValues = {
    ..._.fromPairs(args.filter((x) => x.default != null).map((x) => [`${namePrefix}${x.name}`, x.default])),
    ...macroValues,
  };
  return (
    <FormProvider initialValues={initialValues}>
      <FormArgumentList args={args} onChangeValues={onChangeValues} namePrefix={namePrefix} />
    </FormProvider>
  );
}
