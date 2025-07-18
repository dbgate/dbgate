# Troubleshooting DB2 Error 10060 (Connection Timeout)

This document provides guidance for resolving the DB2 connection error with code 10060, which indicates a connection timeout.

## Error Details

```
[DB2] Connection attempt failed: Network error: Unable to connect to DB2 server at 45.241.60.18:50000... SQL30081N ... Protocol specific error code(s): '10060', '*', '*'.
```

## Quick Fixes

1. **Use Direct Database URL**:
   - Enable "Use Database URL" in your connection settings
   - Use this connection string format:
   ```
   DATABASE=your_database;HOSTNAME=45.241.60.18;PORT=50000;PROTOCOL=TCPIP;UID=your_username;PWD=your_password;CONNECTTIMEOUT=180;QUERYTIMEOUT=120;AUTOCOMMIT=1;KEEPALIVE=1
   ```

2. **Advanced Connection Settings**:
   - Set `connectTimeout` to 180 or higher
   - Set `connectionRetries` to 10 or higher
   - Set `queryTimeout` to 120 or higher

## Network Troubleshooting

1. **Check Firewall Settings**:
   - Ensure your firewall allows outgoing connections to port 50000
   - Check if any antivirus or security software is blocking the connection

2. **Test Network Connectivity**:
   - Run `ping 45.241.60.18` to check basic connectivity
   - Try connecting from a different network (switch from WiFi to wired)
   - Check if a VPN is interfering with the connection

3. **DNS Resolution**:
   - If using a hostname instead of IP, verify DNS resolution
   - Try using the IP address directly in the connection string

## Server-side Issues

If the same connection string works in another application but not in DbGate:

1. **Server Connection Limits**:
   - The DB2 server might have connection limits or IP-based restrictions
   - Check if the server has any specific connection settings

2. **Application Authentication**:
   - Some DB2 servers handle authentication differently between applications
   - Try explicit authentication settings in the connection string

## DbGate Specific Solutions

1. **Using the CLI**:
   If the GUI fails to connect, try the CLI approach:
   ```
   dbgate-cli --server=45.241.60.18 --port=50000 --user=your_username --password=your_password --database=your_database --driver=db2
   ```

2. **Plugin Version**:
   - Check if you're using the latest version of the DB2 plugin
   - Try reinstalling the plugin

## When All Else Fails

If nothing else works, here's a more advanced approach:

1. **Modify Connection Retry Logic**:
   - Edit the `connect-fixed.js` file
   - Increase timeouts for specific error codes
   - Add additional retry attempts for your specific server

2. **Use TCP Keep-Alive**:
   - Modify connection parameters to use TCP keep-alive
   - This helps maintain connection through firewalls

3. **Try Alternative Connection Methods**:
   - Use IBM's Data Server Driver instead of the node-ibm_db driver
   - Try connecting through an ODBC bridge
