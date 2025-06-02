# PowerShell script to test DB2 API endpoint methods

Write-Host "Testing DB2 API endpoint methods..." -ForegroundColor Cyan

# Navigate to the DB2 plugin directory
cd "d:\Yamany Task\dbGate-new\dbgate\plugins\dbgate-plugin-db2"

# Run the endpoints method test
Write-Host "`nRunning API endpoint methods test..." -ForegroundColor Yellow
node test-db2-endpoints-registration.js

Write-Host "`nTest completed." -ForegroundColor Green
