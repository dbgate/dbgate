# DB2 Plugin Connection System Documentation

This document describes the enhanced DB2 plugin connection system designed to improve reliability when connecting to DB2 servers, particularly problematic ones.

## Overview

The enhanced connection system implements several layers of improvements:

1. **Adaptive Retry Logic**: Dynamically adjusts retry attempts and backoff timing based on server health history
2. **Server Health Monitoring**: Tracks server connectivity patterns over time
3. **Network Diagnostics**: Performs comprehensive network diagnostics to identify connection issues
4. **Connection Recovery**: Implements connection recovery for transient network issues
5. **Problematic Server Handling**: Special handling for known problematic servers

## Connection Parameters

The following parameters can be configured when establishing DB2 connections:

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `host` / `server` | string | - | DB2 server hostname or IP address |
| `port` | number | 50000 | DB2 server port |
| `database` | string | - | Database name |
| `user` / `username` | string | - | Database user |
| `password` | string | - | Database password |
| `schema` | string | - | Default schema |
| `maxRetries` | number | 3 | Maximum connection retry attempts |
| `connectionTimeout` | number | 15000 | Connection timeout in milliseconds |
| `adaptiveRetry` | boolean | true | Whether to use adaptive retry logic |
| `retryBackoffMultiplier` | number | 1.5 | Backoff multiplier between retry attempts |
| `jitterFactor` | number | 0.2 | Randomization factor for retry timing (0-1) |
| `maxReconnectAttempts` | number | 3 | Maximum reconnection attempts for lost connections |

## Problematic Server Handling

The system includes special handling for servers known to have connectivity issues:

1. Automatically identifies patterns of connection problems
2. Implements longer timeouts and more retry attempts
3. Uses exponential backoff with jitter for reconnections
4. Provides detailed diagnostics for problematic connections
5. Maintains history of connection reliability across sessions

### Known Problematic Servers

The following servers are pre-configured as problematic and receive enhanced handling:
- 45.241.60.18
- 45.241.60.19

## Network Diagnostics

The system includes comprehensive network diagnostics that:

1. Checks basic socket connectivity
2. Measures connection latency
3. Assesses packet loss
4. Performs traceroute analysis (when available)
5. Identifies network routing issues

## Error Messages and Troubleshooting

Error messages have been enhanced to be more specific and include troubleshooting information:

- **Maximum retry attempts reached**: Indicates all connection attempts failed
  - Troubleshooting: Check server address, firewall settings, and DB2 server status
  
- **Network error: Unable to connect**: Basic connectivity issue
  - Troubleshooting: Verify network connectivity, DNS resolution, and server availability
  
- **Connection timeout**: Server didn't respond within timeout period
  - Troubleshooting: Check for network congestion or overloaded DB2 server
  
- **Server marked as problematic**: Server has shown consistent connectivity issues
  - Troubleshooting: Try increasing connection timeout and max retries

## Configuration Options

The connection system can be configured globally or per connection:

### Global Configuration (in dbgate settings)

```javascript
{
  "db2Plugin": {
    "connectionDefaults": {
      "maxRetries": 5,
      "connectionTimeout": 30000,
      "adaptiveRetry": true
    },
    "problematicServers": [
      "45.241.60.18",
      "45.241.60.19"
    ]
  }
}
```

### Per-Connection Configuration

Add these properties to your connection details:

```javascript
{
  "server": "localhost",
  "port": 50000,
  "database": "testdb",
  "user": "db2admin",
  "password": "password",
  "connectionOptions": {
    "maxRetries": 5,
    "connectionTimeout": 30000,
    "adaptiveRetry": true
  }
}
```

## Performance Considerations

The enhanced system includes additional diagnostics that may add a small amount of overhead during connection establishment. This overhead is minimized by:

1. Performing basic checks first and more expensive diagnostics only when needed
2. Caching results of network diagnostics
3. Using adaptive timeouts based on historical connection performance
4. Skipping unnecessary checks for known reliable servers

## Logging and Monitoring

Enhanced logging provides visibility into connection issues:

- Connection attempts are logged with detailed timing information
- Failed connections include diagnostic details
- Server health statistics are logged periodically
- Network diagnostics results are available for troubleshooting

Enable debug logging to see more detailed information about connection attempts.
