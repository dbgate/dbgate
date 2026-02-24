const express = require('express');
const cors = require('cors');
const yaml = require('js-yaml');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const { createHandler } = require('graphql-http/lib/use/express');
const schema = require('./graphql/schema');
const resolvers = require('./graphql/resolvers');
const { basicAuth, apiKeyAuth } = require('./middleware/auth');

// Import routes
const usersRoutes = require('./routes/users');
const productsRoutes = require('./routes/products');
const ordersRoutes = require('./routes/orders');
const categoriesRoutes = require('./routes/categories');
const reviewsRoutes = require('./routes/reviews');
const errorsRoutes = require('./routes/errors');
const parametersRoutes = require('./routes/parameters');
const delaysRoutes = require('./routes/delays');
const odataRoutes = require('./routes/odata');

const app = express();
const PORT = process.env.PORT || 4444;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Swagger configuration (single UI with multiple server options)
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'DBGate Test API',
      version: '1.0.0',
      description: 'Testing API server with No Auth, Basic Auth, and API Key Auth modes',
    },
    servers: [
      {
        url: '/openapi/noauth',
        description: 'No authentication',
      },
      {
        url: '/openapi/baseauth',
        description: 'Basic authentication',
      },
      {
        url: '/openapi/keyauth',
        description: 'API key authentication',
      },
    ],
    components: {
      securitySchemes: {
        basicAuth: {
          type: 'http',
          scheme: 'basic',
        },
        apiKeyAuth: {
          type: 'apiKey',
          in: 'header',
          name: 'x-api-key',
        },
      },
    },
  },
  apis: ['./src/routes/*.js'],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

// OpenAPI/Swagger UI endpoint
app.use('/openapi/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.get('/openapi.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});
app.get('/openapi.yaml', (req, res) => {
  res.setHeader('Content-Type', 'application/yaml');
  res.send(yaml.dump(swaggerSpec, { noRefs: true }));
});

// REST API routes
app.use('/api/users', usersRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/orders', ordersRoutes);
app.use('/api/categories', categoriesRoutes);
app.use('/api/reviews', reviewsRoutes);
app.use('/api/errors', errorsRoutes);
app.use('/api/params', parametersRoutes);
app.use('/api/delays', delaysRoutes);

// REST API routes for OpenAPI server options
app.use('/openapi/noauth/api/users', usersRoutes);
app.use('/openapi/noauth/api/products', productsRoutes);
app.use('/openapi/noauth/api/orders', ordersRoutes);
app.use('/openapi/noauth/api/categories', categoriesRoutes);
app.use('/openapi/noauth/api/reviews', reviewsRoutes);
app.use('/openapi/noauth/api/errors', errorsRoutes);
app.use('/openapi/noauth/api/params', parametersRoutes);
app.use('/openapi/noauth/api/delays', delaysRoutes);

app.use('/openapi/baseauth/api/users', basicAuth, usersRoutes);
app.use('/openapi/baseauth/api/products', basicAuth, productsRoutes);
app.use('/openapi/baseauth/api/orders', basicAuth, ordersRoutes);
app.use('/openapi/baseauth/api/categories', basicAuth, categoriesRoutes);
app.use('/openapi/baseauth/api/reviews', basicAuth, reviewsRoutes);
app.use('/openapi/baseauth/api/errors', basicAuth, errorsRoutes);
app.use('/openapi/baseauth/api/params', basicAuth, parametersRoutes);
app.use('/openapi/baseauth/api/delays', basicAuth, delaysRoutes);

app.use('/openapi/keyauth/api/users', apiKeyAuth, usersRoutes);
app.use('/openapi/keyauth/api/products', apiKeyAuth, productsRoutes);
app.use('/openapi/keyauth/api/orders', apiKeyAuth, ordersRoutes);
app.use('/openapi/keyauth/api/categories', apiKeyAuth, categoriesRoutes);
app.use('/openapi/keyauth/api/reviews', apiKeyAuth, reviewsRoutes);
app.use('/openapi/keyauth/api/errors', apiKeyAuth, errorsRoutes);
app.use('/openapi/keyauth/api/params', apiKeyAuth, parametersRoutes);
app.use('/openapi/keyauth/api/delays', apiKeyAuth, delaysRoutes);

// OData endpoints with different auth
app.use('/odata/noauth', odataRoutes);
app.use('/odata/baseauth', basicAuth, odataRoutes);
app.use('/odata/keyauth', apiKeyAuth, odataRoutes);

// GraphQL endpoints with different auth
// No auth
app.all('/graphql/noauth', createHandler({
  schema: schema,
  rootValue: resolvers,
}));

// Basic auth
app.all('/graphql/baseauth', basicAuth, createHandler({
  schema: schema,
  rootValue: resolvers,
}));

// API Key auth
app.all('/graphql/keyauth', apiKeyAuth, createHandler({
  schema: schema,
  rootValue: resolvers,
}));

// Legacy endpoint for backwards compatibility
app.all('/graphql', createHandler({
  schema: schema,
  rootValue: resolvers,
}));

// GraphiQL IDE with different auth
function createGraphiQLHTML(title, endpoint, authType) {
  let authInfo = '';
  let fetchOptions = '';
  
  if (authType === 'none') {
    authInfo = '<p class="info">No authentication required</p>';
    fetchOptions = `headers: {
              'Content-Type': 'application/json',
            },`;
  } else if (authType === 'basic') {
    authInfo = `<p class="info">Basic Authentication: <code>username: admin, password: admin</code></p>`;
    fetchOptions = `headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Basic ' + btoa('admin:admin'),
            },`;
  } else if (authType === 'apikey') {
    authInfo = `<p class="info">API Key Authentication: <code>x-api-key: test-api-key-12345</code></p>`;
    fetchOptions = `headers: {
              'Content-Type': 'application/json',
              'x-api-key': 'test-api-key-12345',
            },`;
  }
  
  return `
<!DOCTYPE html>
<html lang="en">
  <head>
    <title>${title}</title>
    <style>
      body {
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
        margin: 0;
        padding: 20px;
        background: #f5f5f5;
      }
      .container {
        max-width: 1200px;
        margin: 0 auto;
        background: white;
        border-radius: 8px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        padding: 20px;
      }
      h1 { color: #333; margin-top: 0; }
      h2 { color: #666; font-size: 1.2em; margin-top: 30px; }
      textarea, input {
        width: 100%;
        padding: 10px;
        border: 1px solid #ddd;
        border-radius: 4px;
        font-family: 'Monaco', 'Menlo', 'Consolas', monospace;
        font-size: 14px;
        box-sizing: border-box;
      }
      textarea { min-height: 150px; resize: vertical; }
      button {
        background: #4CAF50;
        color: white;
        padding: 10px 20px;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 16px;
        margin-top: 10px;
      }
      button:hover { background: #45a049; }
      #response {
        background: #f9f9f9;
        padding: 15px;
        border-radius: 4px;
        border: 1px solid #ddd;
        margin-top: 20px;
        white-space: pre-wrap;
        font-family: 'Monaco', 'Menlo', 'Consolas', monospace;
        font-size: 13px;
        max-height: 400px;
        overflow: auto;
      }
      .example { 
        background: #e8f5e9; 
        padding: 10px; 
        border-radius: 4px; 
        margin: 10px 0;
        font-family: 'Monaco', 'Menlo', 'Consolas', monospace;
        font-size: 13px;
        cursor: pointer;
      }
      .example:hover { background: #c8e6c9; }
      .info { color: #666; font-size: 14px; margin: 10px 0; }
      .auth-info { background: #fff3cd; padding: 10px; border-radius: 4px; margin: 10px 0; border: 1px solid #ffc107; }
    </style>
  </head>
  <body>
    <div class="container">
      <h1>🔍 ${title}</h1>
      <p class="info">GraphQL endpoint: <code>${endpoint}</code></p>
      <div class="auth-info">${authInfo}</div>
      
      <h2>Query</h2>
      <textarea id="query" placeholder="Enter your GraphQL query here...">{
  users {
    id
    firstName
    lastName
    email
  }
}</textarea>
      
      <button onclick="executeQuery()">Execute Query</button>
      
      <h2>Response</h2>
      <div id="response">Results will appear here...</div>
      
      <h2>Example Queries</h2>
      <div class="example" onclick="setQuery(this.innerText)">{ users { id firstName lastName email } }</div>
      <div class="example" onclick="setQuery(this.innerText)">{ products { id name price category inStock } }</div>
      <div class="example" onclick="setQuery(this.innerText)">{ orders { id orderNumber totalAmount status } }</div>
      <div class="example" onclick="setQuery(this.innerText)">{ user(id: 1) { id firstName lastName email age } }</div>
      <div class="example" onclick="setQuery(this.innerText)">{ errorUnauthorized }</div>
      <div class="example" onclick="setQuery(this.innerText)">{ errorInternal }</div>
        <div class="example" onclick="setQuery(this.innerText)">{ delayed2s }</div>
        <div class="example" onclick="setQuery(this.innerText)">mutation { delayedMutation4s }</div>
      <div class="example" onclick="setQuery(this.innerText)">mutation {
  createUser(input: {
    firstName: "Test"
    lastName: "User"
    email: "test@example.com"
    age: 25
    active: true
  }) {
    id
    firstName
    lastName
    email
  }
}</div>
    </div>
    
    <script>
      function setQuery(query) {
        document.getElementById('query').value = query;
      }
      
      async function executeQuery() {
        const query = document.getElementById('query').value;
        const responseDiv = document.getElementById('response');
        
        responseDiv.textContent = 'Loading...';
        
        try {
          const response = await fetch('${endpoint}', {
            method: 'POST',
            ${fetchOptions}
            body: JSON.stringify({ query }),
          });
          
          const data = await response.json();
          responseDiv.textContent = JSON.stringify(data, null, 2);
        } catch (error) {
          responseDiv.textContent = 'Error: ' + error.message;
        }
      }
    </script>
  </body>
</html>
  `;
}

// GraphiQL endpoints
app.get('/graphiql/noauth', (req, res) => {
  res.type('html');
  res.send(createGraphiQLHTML('GraphQL Interface - No Auth', '/graphql/noauth', 'none'));
});

app.get('/graphiql/baseauth', (req, res) => {
  res.type('html');
  res.send(createGraphiQLHTML('GraphQL Interface - Basic Auth', '/graphql/baseauth', 'basic'));
});

app.get('/graphiql/keyauth', (req, res) => {
  res.type('html');
  res.send(createGraphiQLHTML('GraphQL Interface - API Key Auth', '/graphql/keyauth', 'apikey'));
});

// Legacy GraphiQL endpoint for backwards compatibility
app.get('/graphiql', (req, res) => {
  res.type('html');
  res.send(createGraphiQLHTML('GraphQL Interface', '/graphql', 'none'));
});

// Root endpoint - Index page with all links
app.get('/', (req, res) => {
  res.type('html');
  res.send(`
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>DBGate Test API</title>
    <style>
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }
      body {
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        min-height: 100vh;
        padding: 40px 20px;
      }
      .container {
        max-width: 1200px;
        margin: 0 auto;
        background: white;
        border-radius: 12px;
        box-shadow: 0 20px 60px rgba(0,0,0,0.3);
        padding: 40px;
      }
      h1 {
        color: #333;
        margin-bottom: 10px;
        font-size: 2.5em;
      }
      .subtitle {
        color: #666;
        margin-bottom: 40px;
        font-size: 1.2em;
      }
      .section {
        margin-bottom: 40px;
      }
      .section h2 {
        color: #444;
        margin-bottom: 20px;
        font-size: 1.8em;
        border-bottom: 2px solid #667eea;
        padding-bottom: 10px;
      }
      .cards {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
        gap: 20px;
        margin-top: 20px;
      }
      .card {
        background: #f8f9fa;
        border-radius: 8px;
        padding: 20px;
        border-left: 4px solid #667eea;
        transition: transform 0.2s, box-shadow 0.2s;
      }
      .card:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0,0,0,0.1);
      }
      .card h3 {
        color: #333;
        margin-bottom: 10px;
        font-size: 1.3em;
      }
      .card p {
        color: #666;
        margin-bottom: 15px;
        font-size: 0.95em;
      }
      .card a {
        display: inline-block;
        background: #667eea;
        color: white;
        padding: 10px 20px;
        text-decoration: none;
        border-radius: 5px;
        font-weight: 500;
        transition: background 0.2s;
      }
      .card a:hover {
        background: #5568d3;
      }
      .auth-badge {
        display: inline-block;
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 0.85em;
        font-weight: 600;
        margin-top: 10px;
      }
      .auth-none {
        background: #d4edda;
        color: #155724;
      }
      .auth-basic {
        background: #fff3cd;
        color: #856404;
      }
      .auth-apikey {
        background: #cce5ff;
        color: #004085;
      }
      .credentials {
        background: #fff3cd;
        border: 1px solid #ffc107;
        padding: 15px;
        border-radius: 8px;
        margin-top: 20px;
      }
      .credentials h3 {
        color: #856404;
        margin-bottom: 10px;
        font-size: 1.1em;
      }
      .credentials code {
        background: white;
        padding: 2px 6px;
        border-radius: 3px;
        font-family: 'Monaco', 'Menlo', 'Consolas', monospace;
      }
      .rest-api {
        background: #e8f5e9;
        padding: 20px;
        border-radius: 8px;
        margin-top: 20px;
      }
      .rest-api h3 {
        color: #2e7d32;
        margin-bottom: 15px;
      }
      .rest-api ul {
        list-style: none;
        padding-left: 0;
      }
      .rest-api li {
        padding: 8px 0;
        color: #333;
      }
      .rest-api a {
        color: #2e7d32;
        text-decoration: none;
        font-weight: 500;
      }
      .rest-api a:hover {
        text-decoration: underline;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <h1>🚀 DBGate Test API</h1>
      <p class="subtitle">Testing API server with OpenAPI/Swagger and GraphQL support</p>
      
      <div class="section">
        <h2>📚 OpenAPI / Swagger UI</h2>
        <div class="cards">
          <div class="card">
            <h3>Swagger Interface</h3>
            <p>Use one Swagger URL, then choose Server and Authorization inside Swagger</p>
            <span class="auth-badge auth-basic">Authorize: Basic Auth</span>
            <span class="auth-badge auth-apikey" style="margin-left: 6px;">Authorize: API Key</span>
            <br><br>
            <a href="/openapi/docs" target="_blank">Open Swagger UI</a>
            <a href="/openapi.yaml" target="_blank" style="margin-left: 10px; background: #5568d3;">OpenAPI YAML</a>
            <small style="color: #666; margin-top: 10px; display: block;">Servers: /openapi/noauth, /openapi/baseauth, /openapi/keyauth</small>
          </div>
        </div>
      </div>
      
      <div class="section">
        <h2>🔍 GraphQL Endpoints</h2>
        <div class="cards">
          <div class="card">
            <h3>GraphQL - No Auth</h3>
            <p>GraphQL endpoint without authentication</p>
            <span class="auth-badge auth-none">No Auth Required</span>
            <br><br>
            <a href="/graphiql/noauth" target="_blank">Open GraphiQL</a>
            <br>
            <small style="color: #666; margin-top: 10px; display: block;">Endpoint: <code>/graphql/noauth</code></small>
          </div>
          
          <div class="card">
            <h3>GraphQL - Basic Auth</h3>
            <p>GraphQL endpoint with HTTP Basic Auth</p>
            <span class="auth-badge auth-basic">Basic Auth</span>
            <br><br>
            <a href="/graphiql/baseauth" target="_blank">Open GraphiQL</a>
            <br>
            <small style="color: #666; margin-top: 10px; display: block;">Endpoint: <code>/graphql/baseauth</code></small>
          </div>
          
          <div class="card">
            <h3>GraphQL - API Key</h3>
            <p>GraphQL endpoint with API Key in header</p>
            <span class="auth-badge auth-apikey">API Key Auth</span>
            <br><br>
            <a href="/graphiql/keyauth" target="_blank">Open GraphiQL</a>
            <br>
            <small style="color: #666; margin-top: 10px; display: block;">Endpoint: <code>/graphql/keyauth</code></small>
          </div>
        </div>
      </div>

      <div class="section">
        <h2>🧭 OData Endpoints</h2>
        <div class="cards">
          <div class="card">
            <h3>OData - No Auth</h3>
            <p>OData endpoint without authentication</p>
            <span class="auth-badge auth-none">No Auth Required</span>
            <br><br>
            <a href="/odata/noauth" target="_blank">Service Document</a>
            <a href="/odata/noauth/$metadata" target="_blank" style="margin-left: 10px; background: #5568d3;">$metadata</a>
            <small style="color: #666; margin-top: 10px; display: block;">Example: <code>/odata/noauth/Users?$top=5&$count=true</code></small>
          </div>

          <div class="card">
            <h3>OData - Basic Auth</h3>
            <p>OData endpoint with HTTP Basic Auth</p>
            <span class="auth-badge auth-basic">Basic Auth</span>
            <br><br>
            <a href="/odata/baseauth" target="_blank">Service Document</a>
            <a href="/odata/baseauth/$metadata" target="_blank" style="margin-left: 10px; background: #5568d3;">$metadata</a>
            <small style="color: #666; margin-top: 10px; display: block;">Credentials: <code>admin/admin</code></small>
          </div>

          <div class="card">
            <h3>OData - API Key</h3>
            <p>OData endpoint with API Key in header</p>
            <span class="auth-badge auth-apikey">API Key Auth</span>
            <br><br>
            <a href="/odata/keyauth" target="_blank">Service Document</a>
            <a href="/odata/keyauth/$metadata" target="_blank" style="margin-left: 10px; background: #5568d3;">$metadata</a>
            <small style="color: #666; margin-top: 10px; display: block;">Header: <code>x-api-key: test-api-key-12345</code></small>
          </div>
        </div>
      </div>
      
      <div class="credentials">
        <h3>🔐 Test Credentials</h3>
        <p><strong>Basic Authentication:</strong></p>
        <ul>
          <li>Username: <code>admin</code></li>
          <li>Password: <code>admin</code></li>
        </ul>
        <br>
        <p><strong>API Key Authentication:</strong></p>
        <ul>
          <li>Header: <code>x-api-key</code></li>
          <li>Value: <code>test-api-key-12345</code></li>
        </ul>
      </div>
      
      <div class="rest-api">
        <h3>📡 REST API Endpoints</h3>
        <ul>
          <li>👥 Users: <a href="/api/users" target="_blank">/api/users</a></li>
          <li>📦 Products: <a href="/api/products" target="_blank">/api/products</a></li>
          <li>🛒 Orders: <a href="/api/orders" target="_blank">/api/orders</a></li>
          <li>📂 Categories: <a href="/api/categories" target="_blank">/api/categories</a></li>
          <li>⭐ Reviews: <a href="/api/reviews" target="_blank">/api/reviews</a></li>
          <li>🧩 Parameters testing: <a href="/api/params/query?search=test&page=1&tags=a&tags=b&fields=id,name" target="_blank">/api/params/*</a></li>
          <li>⚠️ Error testing: <a href="/api/errors/bad-request" target="_blank">/api/errors/*</a></li>
          <li>⏱️ Delay testing: <a href="/api/delays/2s" target="_blank">/api/delays/*</a></li>
        </ul>
        <p style="margin-top: 15px; font-size: 0.9em;">Each endpoint supports: GET, POST, PUT, DELETE operations</p>
      </div>
    </div>
  </body>
</html>
  `);
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
  console.log(`\n📚 OpenAPI/Swagger UI:`);
  console.log(`   - UI:         http://localhost:${PORT}/openapi/docs`);
  console.log(`   - YAML:       http://localhost:${PORT}/openapi.yaml`);
  console.log(`   - Servers:    /openapi/noauth | /openapi/baseauth | /openapi/keyauth`);
  console.log(`   - Authorize:  Basic (admin/admin) and API Key (x-api-key: test-api-key-12345)`);
  console.log(`\n🔍 GraphiQL Interface:`);
  console.log(`   - No Auth:    http://localhost:${PORT}/graphiql/noauth`);
  console.log(`   - Basic Auth: http://localhost:${PORT}/graphiql/baseauth (admin/admin)`);
  console.log(`   - API Key:    http://localhost:${PORT}/graphiql/keyauth (x-api-key: test-api-key-12345)`);
  console.log(`\n📡 GraphQL Endpoints:`);
  console.log(`   - No Auth:    http://localhost:${PORT}/graphql/noauth`);
  console.log(`   - Basic Auth: http://localhost:${PORT}/graphql/baseauth`);
  console.log(`   - API Key:    http://localhost:${PORT}/graphql/keyauth`);
  console.log(`\n🧭 OData Endpoints:`);
  console.log(`   - No Auth:    http://localhost:${PORT}/odata/noauth`);
  console.log(`   - Basic Auth: http://localhost:${PORT}/odata/baseauth (admin/admin)`);
  console.log(`   - API Key:    http://localhost:${PORT}/odata/keyauth (x-api-key: test-api-key-12345)`);
  console.log(`   - Metadata:   /odata/*/$metadata`);
  console.log(`\n🏠 Index Page: http://localhost:${PORT}/`);
});

module.exports = app;
