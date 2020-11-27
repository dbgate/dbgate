import React from 'react';
import styled from 'styled-components';
import { FontIcon } from './icons';
import useTheme from './theme/useTheme';
import useExtensions from './utility/useExtensions';

const TargetStyled = styled.div`
  position: fixed;
  display: flex;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: ${(props) => props.theme.main_background_blue[3]};
  align-items: center;
  justify-content: space-around;
  z-index: 1000;
`;

const InfoBox = styled.div``;

const IconWrapper = styled.div`
  display: flex;
  justify-content: space-around;
  font-size: 50px;
  margin-bottom: 20px;
`;

const InfoWrapper = styled.div`
  display: flex;
  justify-content: space-around;
  margin-top: 10px;
`;

const TitleWrapper = styled.div`
  font-size: 30px;
  display: flex;
  justify-content: space-around;
`;

export default function DragAndDropFileTarget({ isDragActive, inputProps }) {
  const theme = useTheme();
  const { fileFormats } = useExtensions();
  return (
    !!isDragActive && (
      <TargetStyled theme={theme}>
        <InfoBox>
          <IconWrapper>
            <FontIcon icon="icon cloud-upload" />
          </IconWrapper>
          <TitleWrapper>Drop the files to upload to DbGate</TitleWrapper>
          <InfoWrapper>
            Supported file types:{' '}
            {fileFormats
              .filter((x) => x.readerFunc)
              .map((x) => x.name)
              .join(', ')}
          </InfoWrapper>
        </InfoBox>
        <input {...inputProps} />
      </TargetStyled>
    )
  );
}
