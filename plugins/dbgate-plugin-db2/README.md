# DB2 Plugin for DbGate

This plugin provides IBM DB2 database support for [DbGate](https://dbgate.org/).

## Recent Improvements

The plugin has been significantly enhanced with:

1. **Improved Connection Stability**
   - Extended timeouts for intermittent connections (increased from 90s to 180s)
   - Enhanced retry logic with adaptive backoff
   - Better diagnostics for network issues

2. **Fixed SQL Syntax Errors**
   - Resolved issues with the RETURNS keyword in function queries
   - Implemented multiple fallback mechanisms for different DB2 versions
   - Enhanced column name handling for case sensitivity

3. **Implemented Missing API Endpoints**
   - Added schema listing endpoint
   - Added database structure retrieval endpoint
   - These ensure proper display of database objects in the UI

4. **Enhanced Error Handling**
   - More detailed error logging
   - Improved error recovery mechanisms
   - Better diagnostic messages

## Documentation

For detailed information about the fixes and improvements, see:

- [DB2-FIXES.md](./DB2-FIXES.md) - Overview of all fixes
- [DB2-API-ENDPOINTS.md](./DB2-API-ENDPOINTS.md) - Details about API endpoints implementation
- [DB2-ERROR-10060-TROUBLESHOOTING.md](./DB2-ERROR-10060-TROUBLESHOOTING.md) - Guide for handling connection timeouts
- [DB2-FIXES-VERIFICATION.md](./DB2-FIXES-VERIFICATION.md) - Instructions for testing the fixes

## Connection Troubleshooting Guide

If you're experiencing connection issues with the DB2 plugin, particularly the error:

```
ERROR (59292): Original error: [IBM][CLI Driver] SQL30081N  A communication error has been detected. Communication protocol being used: "TCP/IP".  Communication API being used: "SOCKETS".  Location where the error was detected: "45.241.60.18".  Communication function detecting the error: "selectForConnectTimeout".  Protocol specific error code(s): "0", "*", "*".  SQLSTATE=08001
```

This indicates a network connectivity issue when trying to connect to the DB2 server. Here are some troubleshooting steps:

### 1. Check Network Connectivity

- Verify that the DB2 server is running and accessible from your network
- Check if you can ping the server IP address
- Ensure that the port (default 50000) is open and not blocked by any firewall
- If using a VPN, verify that it's properly connected and allows access to the DB2 server

### 2. Adjust Connection Timeout Settings

The plugin now includes enhanced timeout settings to handle network latency issues. You can try:

- Using the "Database URL" option in the connection dialog
- Adding explicit timeout parameters to your connection string:

```
DATABASE=SAMPLE;HOSTNAME=your-server;PORT=50000;PROTOCOL=TCPIP;UID=your-username;PWD=your-password;CONNECTTIMEOUT=120;COMMTIMEOUT=120;RETRIES=10;RETRYINTERVAL=15;SOCKETTIMEOUT=120;TCPIPKEEPALIVE=1
```

### 3. Check Server Configuration

- Verify that the DB2 server is configured to accept remote connections
- Check if the DB2 instance is running
- Verify that the user has the necessary permissions to connect to the database

### 4. Use the Diagnostic Function

The plugin now includes a diagnostic function that can help identify connection issues. You can use it programmatically:

```javascript
const driver = require('dbgate-plugin-db2');

async function diagnoseConnection() {
  const diagnosticResults = await driver.diagnoseConnectionIssue({
    server: 'your-server',
    port: 50000,
    user: 'your-username',
    password: 'your-password',
    database: 'SAMPLE'
  });
  
  console.log(diagnosticResults);
}

diagnoseConnection();
```

### 5. Common Error Codes

- **SQL30081N**: Network connectivity issue. Check server address, port, and network connectivity.
- **SQL30082N**: Authentication failure. Check username and password.
- **SQL1013N**: Invalid database name. Verify the database exists and is spelled correctly.
- **SQL1032N**: Required database not found. Ensure the database exists on the server.
- **SQL5043N**: Access denied. Check user permissions.

## Installation

This plugin is included in the standard DbGate installation. If you need to install it manually:

```
yarn add dbgate-plugin-db2
```

or

```
npm install dbgate-plugin-db2
```

## Usage

1. Open DbGate
2. Click "Add connection" in the left sidebar
3. Select "DB2" from the database type dropdown
4. Fill in your connection details:
   - Server: Your DB2 server address
   - Port: DB2 port (default 50000)
   - User: Your DB2 username
   - Password: Your DB2 password
   - Database: Your DB2 database name (default SAMPLE)
5. Click "Test connection" to verify connectivity
6. Click "Save" to save the connection

## Advanced Connection Options

The plugin supports several advanced connection options:

- **SSL**: Enable SSL/TLS encryption for the connection
- **Read-only**: Connect in read-only mode
- **Database URL**: Use a custom connection string instead of individual parameters
- **SSH Tunnel**: Connect through an SSH tunnel

## Development

To build this plugin:

```
yarn
yarn build
```

To start in development mode:

```
yarn
yarn watch
```

## License

GPL-3.0
