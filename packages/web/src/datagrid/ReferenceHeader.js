import React from 'react';
import ToolbarButton from '../widgets/ToolbarButton';
import styled from 'styled-components';
import dimensions from '../theme/dimensions';
import { FontIcon } from '../icons';
import useTheme from '../theme/useTheme';

const Container = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: ${(props) => props.theme.gridheader_background_cyan[0]};
  height: ${dimensions.toolBar.height}px;
  min-height: ${dimensions.toolBar.height}px;
  overflow: hidden;
  border-top: 1px solid ${(props) => props.theme.border};
  border-bottom: 1px solid ${(props) => props.theme.border};
`;

const Header = styled.div`
  font-weight: bold;
  margin-left: 10px;
  display: flex;
`;

const HeaderText = styled.div`
  margin-left: 10px;
`;

export default function ReferenceHeader({ reference, onClose }) {
  const theme = useTheme();
  return (
    <Container theme={theme}>
      <Header>
        <FontIcon icon="img reference" />
        <HeaderText>
          {reference.pureName} [{reference.columns.map((x) => x.refName).join(', ')}] = master [
          {reference.columns.map((x) => x.baseName).join(', ')}]
        </HeaderText>
      </Header>
      <ToolbarButton icon="icon close" onClick={onClose} patchY={6}>
        Close
      </ToolbarButton>
    </Container>
  );
}
