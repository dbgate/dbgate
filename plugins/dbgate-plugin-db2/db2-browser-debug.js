// DB2 Plugin API Monitoring Tool

console.log("=== DB2 Plugin API Debugging Tool ===");

// This script should be pasted into the browser console to monitor API calls

const monitorScript = `
// DB2 Plugin API monitoring script for browser console
(function() {
  console.log("%c[DB2 Monitor] Starting API monitoring...", "color:blue; font-weight:bold");
  
  // Define endpoints we're interested in - expanded to catch more potential DB2 related calls
  const MONITORED_ENDPOINTS = [
    "database-connections/structure",
    "database-connections/schema-list", 
    "database-connections/server-version",
    "connections/",
    "database-connections/",
    "datagrid/",
    "plugins/",
    "/stream",
    "/db2"
  ];
  
  // 1. Monitor fetch API calls (web version)
  const originalFetch = window.fetch;
  if (originalFetch) {
    window.fetch = function(url, options) {
      // Check if this is a DB2 related API call
      const isMonitored = MONITORED_ENDPOINTS.some(endpoint => url.includes(endpoint));
      
      if (isMonitored) {
        console.log("%c[DB2 API Request]", "background:#3498db; color:white; padding:2px 5px; border-radius:2px", 
          "URL:", url, "Options:", options);
        
        // Parse request body if present
        if (options && options.body) {
          try {
            const body = JSON.parse(options.body);
            console.log("%c[DB2 API Request Body]", "background:#2980b9; color:white; padding:2px 5px; border-radius:2px", body);
          } catch (e) {
            // Not parseable JSON
          }
        }
      }
      
      return originalFetch.apply(this, arguments).then(response => {
        if (isMonitored) {
          console.log("%c[DB2 API Response]", "background:#2ecc71; color:white; padding:2px 5px; border-radius:2px", 
            "URL:", url, "Status:", response.status);
            
          // Clone the response so we can read the body but still return a usable response
          const clonedResponse = response.clone();
          clonedResponse.json().then(data => {
            console.log("%c[DB2 API Response Data]", "background:#27ae60; color:white; padding:2px 5px; border-radius:2px", data);
          }).catch(err => {
            // Not JSON data
          });
        }
        return response;
      }).catch(err => {
        if (isMonitored) {
          console.error("%c[DB2 API Error]", "background:#e74c3c; color:white; padding:2px 5px; border-radius:2px", 
            "URL:", url, "Error:", err);
        }
        throw err;
      });
    };
    console.log("%c[DB2 Monitor] Fetch API monitoring enabled", "color:blue");
  }
  
  // 2. Monitor Electron IPC calls (desktop app)
  const electron = window.electron || window.__TAURI__ || null;
  if (electron && electron.invoke) {
    const originalInvoke = electron.invoke;
    electron.invoke = function(channel, args) {
      // Check if this is a DB2 related API call
      const isMonitored = MONITORED_ENDPOINTS.some(endpoint => {
        const dashChannel = channel.replace(/-/g, '/');
        return endpoint.includes(dashChannel) || dashChannel.includes(endpoint);
      });
      
      if (isMonitored) {
        console.log("%c[DB2 Electron IPC]", "background:#9b59b6; color:white; padding:2px 5px; border-radius:2px", 
          "Channel:", channel, "Args:", args);
      }
      
      return originalInvoke.apply(this, arguments).then(result => {
        if (isMonitored) {
          console.log("%c[DB2 Electron IPC Result]", "background:#8e44ad; color:white; padding:2px 5px; border-radius:2px", 
            "Channel:", channel, "Result:", result);
        }
        return result;
      }).catch(err => {
        if (isMonitored) {
          console.error("%c[DB2 Electron IPC Error]", "background:#c0392b; color:white; padding:2px 5px; border-radius:2px", 
            "Channel:", channel, "Error:", err);
        }
        throw err;
      });
    };
    console.log("%c[DB2 Monitor] Electron IPC monitoring enabled", "color:blue");
  }
    // 3. Add enhanced SSE monitoring
  console.log("%c[DB2 Monitor] Setting up EventSource monitoring", "color:blue");
  
  // Track all EventSource instances
  let allEventSources = [];
  const OriginalEventSource = window.EventSource;
  window.EventSource = function(url, options) {
    console.log("%c[DB2 SSE Connection]", "background:#e67e22; color:white; padding:2px 5px; border-radius:2px", 
      "New EventSource created:", url, options);
    
    const instance = new OriginalEventSource(url, options);
    allEventSources.push(instance);
    
    // Monitor the onmessage handler
    const originalOnMessage = instance.onmessage;
    instance.onmessage = function(e) {
      console.log("%c[DB2 SSE Message]", "background:#27ae60; color:white; padding:2px 5px; border-radius:2px", 
        "URL:", url, "Data:", e.data);
      
      // Try to parse and look for DB2-related data
      try {
        const data = JSON.parse(e.data);
        if (data && (data.conid || data.database || data.schemaName || data.tables || data.views)) {
          console.log("%c[DB2 SSE Parsed]", "background:#8e44ad; color:white; padding:2px 5px; border-radius:2px", data);
        }
      } catch (err) {
        // Not JSON data or parsing error
      }
      
      if (originalOnMessage) return originalOnMessage.call(this, e);
    };
    
    return instance;
  };
  
  // Add SSE event listener monitoring
  const originalAddEventListener = EventSource.prototype.addEventListener;
  EventSource.prototype.addEventListener = function(event, callback) {
    console.log("%c[DB2 SSE] Registering event listener", "color:purple", "Event:", event);
    
    // Wrap the callback to monitor DB2 related events
    const wrappedCallback = function(e) {
      console.log("%c[DB2 SSE Event]", "background:#f39c12; color:white; padding:2px 5px; border-radius:2px", 
        "Event:", event, "Data:", e.data);
      
      // Try to parse data as JSON with improved DB2 detection
      try {
        const data = JSON.parse(e.data);
        console.log("%c[DB2 SSE Data]", "background:#d35400; color:white; padding:2px 5px; border-radius:2px", data);
        
        // Check for DB2 specific data
        if (data && (
            data.driver === 'db2' || 
            (data.tables && data.conid) || 
            (data.schemaName && data.database) ||
            (data.rows && data.errorMessage === null)
          )) {
          console.log("%c[DB2 IMPORTANT DATA FOUND]", "background:red; color:white; padding:4px 8px; border-radius:2px; font-weight:bold", data);
        }
      } catch (err) {
        // Not JSON data
      }
      
      return callback.apply(this, arguments);
    };
    
    return originalAddEventListener.call(this, event, wrappedCallback);
  };
  console.log("%c[DB2 Monitor] SSE monitoring enabled", "color:blue");
  
  // 4. Monitor ApiCall directly
  const originalApiCall = window.apiCall;
  if (originalApiCall) {
    window.apiCall = function(route, args, options) {
      // Check if this is a DB2 related API call
      const isMonitored = MONITORED_ENDPOINTS.some(endpoint => route.includes(endpoint));
      
      if (isMonitored) {
        console.log("%c[DB2 ApiCall]", "background:#1abc9c; color:white; padding:2px 5px; border-radius:2px", 
          "Route:", route, "Args:", args);
      }
      
      return originalApiCall.apply(this, arguments).then(result => {
        if (isMonitored) {
          console.log("%c[DB2 ApiCall Result]", "background:#16a085; color:white; padding:2px 5px; border-radius:2px", 
            "Route:", route, "Result:", result);
        }
        return result;
      }).catch(err => {
        if (isMonitored) {
          console.error("%c[DB2 ApiCall Error]", "background:#c0392b; color:white; padding:2px 5px; border-radius:2px", 
            "Route:", route, "Error:", err);
        }
        throw err;
      });
    };
    console.log("%c[DB2 Monitor] ApiCall monitoring enabled", "color:blue");
  }
  
  console.log("%c[DB2 Monitor] Monitoring setup complete - watching for DB2 API activity", "color:blue; font-weight:bold");
  
  // 5. Enable built-in API logging
  if (window.enableApiLog) {
    window.enableApiLog();
    console.log("%c[DB2 Monitor] Built-in API logging enabled", "color:blue");
  }
  
  // Instructions
  console.log(
    "%c[DB2 Debugging Instructions]", 
    "background:#34495e; color:white; padding:2px 5px; border-radius:2px; font-weight:bold",
    "\n1. Try opening the DB2 connection in DbGate" +
    "\n2. Look for API calls in this console" +
    "\n3. Check Network panel > Filter for 'stream' to see SSE connection" +
    "\n4. If no API calls appear for DB2 endpoints, the problem is elsewhere in the code"
  );
})();
`;

// Save the monitoring script for the user
console.log("\nCopy and paste this script into your browser's console when DbGate is running:");
console.log(monitorScript);

console.log("\n=== Understanding Why API Calls Don't Appear in Network Panel ===");
console.log(`
In DbGate, API calls don't appear as separate HTTP requests in the Chrome DevTools Network panel because:

1. For Electron app:
   - Communication happens through IPC (Inter-Process Communication)
   - These don't show as HTTP requests since they're internal to the app

2. For Web app:
   - Most communication happens through a single Server-Sent Events (SSE) connection
   - Look for the "/stream" endpoint in the Network panel
   - Click on it and go to the "Messages" tab to see individual messages

The key endpoints for the DB2 plugin are:
- database-connections/structure
- database-connections/schema-list
- database-connections/server-version

These aren't separate HTTP requests but are either:
1. Sent as IPC messages (in Electron)
2. Sent as messages over the SSE connection (in web app)

The monitoring script will help identify if these endpoints are being called at all.
`);
