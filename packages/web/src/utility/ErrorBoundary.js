import React from 'react';
import ErrorInfo from '../widgets/ErrorInfo';

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
      let message;
      try {
        message = (this.state.error.message || this.state.error).toString();
      } catch (e) {
        message = 'Error detected';
      }
      // You can render any custom fallback UI
      return (
        <div>
          <ErrorInfo message={message} />;
        </div>
      );
    }
    return this.props.children;
  }
}
