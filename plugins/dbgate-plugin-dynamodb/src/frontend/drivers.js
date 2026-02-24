const { driverBase } = global.DBGATE_PACKAGES['dbgate-tools'];
const { mongoSplitterOptions } = require('dbgate-query-splitter/lib/options');
const { convertToDynamoDbCondition, convertToDynamoDbOrder } = require('./convertToDynamoDbCondition');
const dynamoIcon = `<svg width="14" height="14" viewBox="-40 -40 336 369" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid"><path d="M165.258 288.501h3.508l57.261-28.634.953-1.347V29.964l-.953-1.354L168.766 0h-3.551l.043 288.501" fill="#5294CF"/><path d="M90.741 288.501h-3.557l-57.212-28.634-1.161-1.997-.589-226.742 1.75-2.518L87.184 0h3.601l-.044 288.501" fill="#1F5B98"/><path d="M87.285 0h81.426v288.501H87.285V0z" fill="#2D72B8"/><path d="M256 137.769l-1.935-.429-27.628-2.576-.41.204-57.312-2.292h-81.43l-57.313 2.292V91.264l-.06.032.06-.128 57.313-13.28h81.43l57.312 13.28 21.069 11.199v-7.2l8.904-.974-.922-1.798-28.192-20.159-.859.279-57.312-17.759h-81.43L29.972 72.515V28.61L0 63.723v30.666l.232-.168 8.672.946v7.348L0 107.28v30.513l.232-.024 8.672.128v12.807l-7.482.112L0 150.68v30.525l8.904 4.788v7.433l-8.531.942-.373-.28v30.661l29.972 35.118v-43.901l57.313 17.759h81.43l57.481-17.811.764.335 27.821-19.862 1.219-1.979-8.904-.982v-7.284l-1.167-.466-19.043 10.265-.69 1.44-57.481 13.203v.016h-81.43v-.016l-57.313-13.259v-43.864l57.313 2.284v.056h81.43l57.312-2.34 1.305.6 26.779-2.306 1.889-.923-8.904-.128v-12.807l8.904-.128" fill="#1A476F"/><path d="M226.027 215.966v43.901L256 224.749v-30.461l-29.8 21.626-.173.052M226.027 197.421l.173-.04 29.8-16.028v-30.649l-29.973 2.757v43.96M226.2 91.208l-.173-.04v43.8L256 137.769v-30.634l-29.8-15.927M226.2 72.687L256 94.193V63.731L226.027 28.61v43.905l.173.06v.112" fill="#2D72B8"/></svg>`;

const dynamodbDriver = {
  ...driverBase,
  title: 'Amazon DynamoDB',
  engine: 'dynamodb@dbgate-plugin-dynamodb',
  defaultPort: 8000,
  singleDatabase: true,
  supportsSchemas: false,
  supportsOffsetFetch: false,
  supportsDatabaseUrl: true,
  databaseUrlPlaceholder: 'e.g. dynamodb://us-east-1',
  collectionSingularLabel: 'collection',
  collectionPluralLabel: 'collections',
  disableRenameCollection: true,
  databaseEngineTypes: ['document'],
  editorMode: 'sql',
  icon: dynamoIcon,
  
  getNewConnectionTemplate: () => ({
    engine: 'dynamodb@dbgate-plugin-dynamodb',
    singleDatabase: true,
  }),
  
  beforeConnectionSave: (connection) => {
    const authType = connection.authType || 'awscloud';
    let defaultDatabase = 'DynamoDB';
    
    if (authType === 'onpremise' && connection.server) {
      defaultDatabase = 'localhost';
    } else if (authType === 'awscloud' && connection.awsRegion) {
      defaultDatabase = connection.awsRegion;
    }
    
    return {
      ...connection,
      singleDatabase: true,
      defaultDatabase,
    };
  },

  getQuerySplitterOptions: () => mongoSplitterOptions,
  
  getAuthTypes() {
    return [
      {
        title: 'On Premise',
        name: 'onpremise',
      },
      {
        title: 'AWS Cloud',
        name: 'awscloud',
      },
    ];
  },
  
  defaultAuthTypeName: 'awscloud',
  
  showConnectionField: (field, values) => {
    if (field === 'useDatabaseUrl') return true;
    if (field === 'authType') return true;
    
    if (values.useDatabaseUrl) {
      return [
        'databaseUrl', 
        'accessKeyId', 
        'secretAccessKey', 
        'sessionToken', 
        'isReadOnly'
      ].includes(field);
    }
    
    const authType = values.authType || 'awscloud';
    const commonFields = ['accessKeyId', 'secretAccessKey', 'sessionToken', 'isReadOnly'];
    
    if (authType === 'onpremise') {
      return ['server', 'port', ...commonFields].includes(field);
    }
    
    if (authType === 'awscloud') {
      return ['awsRegion', ...commonFields].includes(field);
    }
    
    return false;
  },

  newCollectionFormParams: [
    {
      type: 'text',
      label: 'Table name',
      name: 'name',
      focused: true,
    },
    {
      type: 'text',
      label: 'Partition key (hash key)',
      name: 'partitionKey',
      placeholder: 'e.g. id',
    },
    {
      type: 'select',
      label: 'Partition key type',
      name: 'partitionKeyType',
      default: 'S',
      options: [
        { name: 'String (S)', value: 'S' },
        { name: 'Number (N)', value: 'N' },
        { name: 'Binary (B)', value: 'B' },
      ],
    },
    {
      type: 'text',
      label: 'Sort key (range key) - optional',
      name: 'sortKey',
      placeholder: 'e.g. timestamp',
    },
    {
      type: 'select',
      label: 'Sort key type (optional)',
      name: 'sortKeyType',
      default: 'S',
      options: [
        { name: 'String (S)', value: 'S' },
        { name: 'Number (N)', value: 'N' },
        { name: 'Binary (B)', value: 'B' },
      ],
    },
  ],

  getCollectionExportQueryScript(collection, condition, sort) {
    // Generate PartiQL query with WHERE and ORDER BY clauses
    let sql = `SELECT * FROM "${collection}"`;
    
    if (condition) {
      const whereClause = convertToDynamoDbCondition(this, condition);
      if (whereClause) {
        sql += ` WHERE ${whereClause}`;
      }
    }
    
    if (sort && sort.length > 0) {
      const orderByClause = convertToDynamoDbOrder(this, sort);
      if (orderByClause) {
        sql += ` ORDER BY ${orderByClause}`;
      }
    }
    
    return sql;
  },

  getCollectionExportQueryJson(collection, condition, sort) {
    // For JSON query mode - returns select object for readJsonQuery
    return {
      collection: collection,
      condition: condition,
      sort: sort,
    };
  },

  sortCollectionDisplayColumns(columns) {
    // Sort columns: partition key -> sort key -> unique key -> alphabetical
    return [...columns].sort((a, b) => {
      // Partition key first
      if (a.isPartitionKey && !b.isPartitionKey) return -1;
      if (!a.isPartitionKey && b.isPartitionKey) return 1;
      // Sort key second
      if (a.isClusterKey && !b.isClusterKey) return -1;
      if (!a.isClusterKey && b.isClusterKey) return 1;
      // Unique key third (if not already a partition/cluster key)
      if (a.isUniqueKey && !b.isUniqueKey) return -1;
      if (!a.isUniqueKey && b.isUniqueKey) return 1;
      // Alphabetical order for the rest
      return a.columnName.localeCompare(b.columnName);
    });
  },
};

module.exports = [dynamodbDriver];
