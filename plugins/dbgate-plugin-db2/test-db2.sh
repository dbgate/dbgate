#!/bin/bash

# Simple bash script to test the DB2 connection
echo "Installing dependencies..."
npm install ibm_db

echo "Testing DB2 connection..."
node test-db2-driver.js
