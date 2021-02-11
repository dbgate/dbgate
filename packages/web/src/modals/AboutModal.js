import React from 'react';
import ModalBase from './ModalBase';
import ModalHeader from './ModalHeader';
import ModalContent from './ModalContent';
import ModalFooter from './ModalFooter';
import { useConfig } from '../utility/metadataLoaders';
import FormStyledButton from '../widgets/FormStyledButton';
import moment from 'moment';
import styled from 'styled-components';
import getElectron from '../utility/getElectron';
import useTheme from '../theme/useTheme';
import { StyledThemedLink } from '../widgets/FormStyledButton';

const Container = styled.div`
  display: flex;
`;

const TextContainer = styled.div``;

const StyledLine = styled.div`
  margin: 5px;
`;

const StyledValue = styled.span`
  font-weight: bold;
`;

function Line({ label, children }) {
  return (
    <StyledLine>
      {label}: <StyledValue>{children}</StyledValue>
    </StyledLine>
  );
}

function Link({ label, children, href }) {
  const electron = getElectron();
  const theme = useTheme();
  return (
    <StyledLine>
      {label}:{' '}
      {electron ? (
        <StyledThemedLink theme={theme} onClick={() => electron.shell.openExternal(href)}>
          {children}
        </StyledThemedLink>
      ) : (
        <StyledThemedLink theme={theme} href={href} target="_blank" rel="noopener noreferrer">
          {children}
        </StyledThemedLink>
      )}
    </StyledLine>
  );
}

export default function AboutModal({ modalState }) {
  const config = useConfig();
  const { version, buildTime } = config || {};
  return (
    <ModalBase modalState={modalState}>
      <ModalHeader modalState={modalState}>About DbGate</ModalHeader>
      <ModalContent>
        <Container>
          <img
            // eslint-disable-next-line
            src={`${process.env.PUBLIC_URL}/logo192.png`}
          />
          <TextContainer>
            <Line label="Version">{version}</Line>
            <Line label="Build date">{moment(buildTime).format('YYYY-MM-DD')}</Line>
            <Link label="Web" href="https://dbgate.org">
              dbgate.org
            </Link>
            <Link label="Source codes" href="https://github.com/dbgate/dbgate/">
              github
            </Link>
            <Link label="Docker container" href="https://hub.docker.com/r/dbgate/dbgate">
              docker hub
            </Link>
            <Link label="Online demo" href="https://demo.dbgate.org">
              demo.dbgate.org
            </Link>
            <Link label="Search plugins" href="https://www.npmjs.com/search?q=keywords:dbgateplugin">
              npmjs.com
            </Link>
          </TextContainer>
        </Container>
      </ModalContent>
      <ModalFooter>
        <FormStyledButton value="Close" onClick={() => modalState.close()} />
      </ModalFooter>
    </ModalBase>
  );
}
