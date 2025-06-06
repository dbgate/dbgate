// This module provides UI components for configuring DB2 connection settings
// For frontend use

/**
 * DB2 connection configuration options definitions
 * This defines the UI components and properties for connection settings
 */
const db2ConnectionConfigDefinitions = {
  connectionConfig: {
    label: 'Connection Settings',
    type: 'group',
    toolbar: true,
    icon: 'icon connection',
    fields: [
      {
        name: 'maxRetries',
        label: 'Maximum Retry Attempts',
        type: 'number',
        default: 3,
        description: 'Maximum number of connection retry attempts'
      },
      {
        name: 'connectionTimeout',
        label: 'Connection Timeout (ms)',
        type: 'number',
        default: 15000,
        description: 'Timeout for connection attempts in milliseconds'
      },
      {
        name: 'adaptiveRetry',
        label: 'Adaptive Retry',
        type: 'checkbox',
        default: true,
        description: 'Use adaptive retry logic based on server health history'
      }
    ]
  },
  
  retryConfig: {
    label: 'Retry Settings',
    type: 'group',
    toolbar: true,
    icon: 'icon reload',
    fields: [
      {
        name: 'initialRetryDelay',
        label: 'Initial Retry Delay (ms)',
        type: 'number',
        default: 1000,
        description: 'Initial delay between retry attempts in milliseconds'
      },
      {
        name: 'retryBackoffMultiplier',
        label: 'Backoff Multiplier',
        type: 'number',
        default: 1.5,
        description: 'Multiplier for exponential backoff between retries'
      },
      {
        name: 'jitterFactor',
        label: 'Jitter Factor',
        type: 'number',
        default: 0.2,
        description: 'Randomization factor for retry timing (0-1)'
      }
    ]
  },
  
  diagnosticsConfig: {
    label: 'Diagnostics Settings',
    type: 'group',
    toolbar: true,
    icon: 'icon check',
    fields: [
      {
        name: 'runNetworkDiagnostics',
        label: 'Run Network Diagnostics',
        type: 'checkbox',
        default: true,
        description: 'Perform network diagnostics on connection failures'
      },
      {
        name: 'verboseLogging',
        label: 'Verbose Logging',
        type: 'checkbox',
        default: false,
        description: 'Enable detailed connection logging'
      },
      {
        name: 'logRetryAttempts',
        label: 'Log Retry Attempts',
        type: 'checkbox',
        default: true,
        description: 'Log details about each retry attempt'
      }
    ]
  },
  
  troubleshootingConfig: {
    label: 'Troubleshooting',
    type: 'group',
    toolbar: true,
    icon: 'icon bug',
    fields: [
      {
        name: 'resetServerHealth',
        label: 'Reset Server Health History',
        type: 'button',
        default: true, 
        description: 'Clear the server health history and statistics'
      },
      {
        name: 'testConnectivity',
        label: 'Test Connectivity',
        type: 'button',
        default: true,
        description: 'Run diagnostics to test connectivity to this server'
      },
      {
        name: 'exportDiagnostics',
        label: 'Export Diagnostics',
        type: 'button',
        default: true,
        description: 'Export connection diagnostics to a file'
      }
    ]
  }
};

/**
 * Form component for configuring DB2 connection settings
 * This provides the UI for the connection configuration
 * @param {object} props - Component props 
 */
function DB2ConnectionConfigForm(props) {
  const { values, onChange } = props;
  
  // Handle button clicks
  const handleButtonClick = async (name) => {
    switch (name) {
      case 'resetServerHealth':
        // Reset server health history
        if (props.services && props.services.dbgateApi) {
          await props.services.dbgateApi.runScript('dbgate-plugin-db2', 'resetServerHealth', {});
          props.services.showMessage({
            text: 'Server health history has been reset',
            type: 'success',
          });
        }
        break;
        
      case 'testConnectivity':
        // Run diagnostics test
        if (props.services && props.services.dbgateApi) {
          const diagnosticsResult = await props.services.dbgateApi.runScript(
            'dbgate-plugin-db2', 
            'testConnectivity', 
            { server: values.server, port: values.port }
          );
          
          props.services.showModal({
            title: 'Connection Diagnostics Results',
            component: props.components.JsonView,
            width: 600, 
            data: diagnosticsResult
          });
        }
        break;
        
      case 'exportDiagnostics':
        // Export diagnostics to file
        if (props.services && props.services.dbgateApi) {
          await props.services.dbgateApi.runScript(
            'dbgate-plugin-db2', 
            'exportDiagnostics', 
            { connectionId: values.id || 'temp' }
          );
          props.services.showMessage({
            text: 'Diagnostics have been exported to file',
            type: 'success',
          });
        }
        break;
    }
  };
  
  // Use the form factory to create the UI
  return props.components.FormFieldsTab({
    fields: db2ConnectionConfigDefinitions,
    values,
    onChange,
    onButtonClick: handleButtonClick
  });
}

module.exports = {
  db2ConnectionConfigDefinitions,
  DB2ConnectionConfigForm
};
