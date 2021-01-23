import _ from 'lodash';
import React from 'react';
import { filterName } from 'dbgate-datalib';
import { AppObjectCore } from './AppObjectCore';

function MacroAppObject({ data, commonProps }) {
  const { name, type, title, group } = data;

  return <AppObjectCore {...commonProps} data={data} title={title} icon={'img macro'} />;
}

MacroAppObject.extractKey = data => data.name;
MacroAppObject.createMatcher = ({ name, title }) => filter => filterName(filter, name, title);

export default MacroAppObject;
