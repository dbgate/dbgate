// Authentication middleware functions

// Basic Authentication middleware
// Note: These are intentionally hard-coded test credentials for a test API
// Username: admin, Password: admin
const basicAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Basic ')) {
    res.setHeader('WWW-Authenticate', 'Basic realm="Access to test API"');
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  try {
    const base64Credentials = authHeader.split(' ')[1];
    const credentials = Buffer.from(base64Credentials, 'base64').toString('utf-8');
    const [username, password] = credentials.split(':');
    
    // Simple test credentials - username: admin, password: admin
    if (username === 'admin' && password === 'admin') {
      next();
    } else {
      res.setHeader('WWW-Authenticate', 'Basic realm="Access to test API"');
      return res.status(401).json({ error: 'Invalid credentials' });
    }
  } catch (error) {
    res.setHeader('WWW-Authenticate', 'Basic realm="Access to test API"');
    return res.status(400).json({ error: 'Malformed authorization header' });
  }
};

// API Key Authentication middleware
// Note: This is an intentionally hard-coded test API key for a test API
// x-api-key: test-api-key-12345
const apiKeyAuth = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  
  if (!apiKey) {
    return res.status(401).json({ error: 'API key required' });
  }
  
  // Simple test API key - x-api-key: test-api-key-12345
  if (apiKey === 'test-api-key-12345') {
    next();
  } else {
    return res.status(401).json({ error: 'Invalid API key' });
  }
};

module.exports = {
  basicAuth,
  apiKeyAuth,
};
