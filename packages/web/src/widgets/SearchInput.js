import React from 'react';
import styled from 'styled-components';
import keycodes from '../utility/keycodes';

const StyledInput = styled.input`
  flex: 1;
  min-width: 90px;
`;

export default function SearchInput({ placeholder, filter, setFilter }) {
  const handleKeyDown = (ev) => {
    if (ev.keyCode == keycodes.escape) {
      setFilter('');
    }
  };
  return (
    <StyledInput
      type="text"
      placeholder={placeholder}
      value={filter}
      onChange={(e) => setFilter(e.target.value)}
      onFocus={(e) => e.target.select()}
      onKeyDown={handleKeyDown}
    />
  );
}
