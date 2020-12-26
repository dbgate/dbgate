import React from 'react';
import styled from 'styled-components';
import Designer from './Designer';

export default function QueryDesigner({ value, conid, database, engine, onChange, onKeyDown }) {
  return <Designer value={value} onChange={onChange}></Designer>;
}
