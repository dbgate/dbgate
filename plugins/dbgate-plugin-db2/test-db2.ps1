# PowerShell script to test the DB2 connection

# Set location to the plugin directory
Set-Location -Path 'd:\Yamany Task\dbGate-new\dbgate\plugins\dbgate-plugin-db2'

# Check if the driver file exists
if (-Not (Test-Path -Path ".\src\backend\driver.js")) {
    Write-Error "Driver file not found: .\src\backend\driver.js"
    exit 1
}

# Check if node_modules exists and contains ibm_db
if (-Not (Test-Path -Path ".\node_modules\ibm_db")) {
    Write-Host "Installing dependencies..."
    npm install
}

# Run the test script
Write-Host "Running DB2 driver test..."
node .\test-db2-driver.js
