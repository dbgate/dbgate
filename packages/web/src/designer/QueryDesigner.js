import React from 'react';
import styled from 'styled-components';
import Designer from './Designer';

export default function QueryDesigner({ value, conid, database, engine, onChange }) {
  return <Designer value={value} onChange={onChange} conid={conid} database={database}></Designer>;
}
