import React from 'react';
import _ from 'lodash';
import ErrorInfo from '../widgets/ErrorInfo';
import styled from 'styled-components';
import localforage from 'localforage';
import FormStyledButton from '../widgets/FormStyledButton';

const Stack = styled.pre`
  margin-left: 20px;
`;

const WideButton = styled(FormStyledButton)`
  width: 150px;
`;

const Info = styled.div`
  margin: 20px;
`;

export function ErrorScreen({ error }) {
  let message;
  try {
    message = 'Error: ' + (error.message || error).toString();
  } catch (e) {
    message = 'DbGate internal error detected';
  }

  const handleReload = () => {
    window.location.reload();
  };

  const handleClearReload = async () => {
    localStorage.clear();
    try {
      await localforage.clear();
    } catch (err) {
      console.error('Error clearing app data', err);
    }
    window.location.reload();
  };

  return (
    <div>
      <ErrorInfo message={message} />
      <WideButton type="button" value="Reload app" onClick={handleReload} />
      <WideButton type="button" value="Clear and reload" onClick={handleClearReload} />
      <Info>
        If reloading doesn&apos;t help, you can try to clear all browser data (opened tabs, history of opened windows)
        and reload app. Your connections and saved files are not touched by this clear operation. <br />
        If you see this error in the tab, closing the tab should solve the problem.
      </Info>
      <Stack>{_.isString(error.stack) ? error.stack : null}</Stack>
    </div>
  );
}

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI.
    return {
      hasError: true,
      error,
    };
  }
  componentDidCatch(error, errorInfo) {
    // You can also log the error to an error reporting service
    // logErrorToMyService(error, errorInfo);
    console.error(error);
    // console.log('errorInfo', errorInfo);
    // console.log('error', error);
  }
  render() {
    if (this.state.hasError) {
      return <ErrorScreen error={this.state.error} />;
    }
    return this.props.children;
  }
}

export function ErrorBoundaryTest({ children }) {
  let error;
  try {
    const x = 1;
    // @ts-ignore
    x.log();
  } catch (err) {
    error = err;
  }
  return <ErrorScreen error={error} />;
}
