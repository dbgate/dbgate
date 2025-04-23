module.exports = {
  "tables": [
    {
      "pureName": "auth_methods",
      "columns": [
        {
          "pureName": "auth_methods",
          "columnName": "id",
          "dataType": "int",
          "notNull": true
        },
        {
          "pureName": "auth_methods",
          "columnName": "name",
          "dataType": "varchar(250)",
          "notNull": false
        },
        {
          "pureName": "auth_methods",
          "columnName": "type",
          "dataType": "varchar(250)",
          "notNull": false
        },
        {
          "pureName": "auth_methods",
          "columnName": "amoid",
          "dataType": "varchar(250)",
          "notNull": false
        },
        {
          "pureName": "auth_methods",
          "columnName": "is_disabled",
          "dataType": "int",
          "notNull": false
        },
        {
          "pureName": "auth_methods",
          "columnName": "is_default",
          "dataType": "int",
          "notNull": false
        },
        {
          "pureName": "auth_methods",
          "columnName": "is_collapsed",
          "dataType": "int",
          "notNull": false
        }
      ],
      "foreignKeys": [],
      "primaryKey": {
        "pureName": "auth_methods",
        "constraintType": "primaryKey",
        "columns": [
          {
            "columnName": "id"
          }
        ]
      },
      "preloadedRows": [
        {
          "id": -1,
          "amoid": "790ca4d2-7f01-4800-955b-d691b890cc50",
          "name": "Anonymous",
          "type": "none"
        },
        {
          "id": -2,
          "amoid": "53db1cbf-f488-44d9-8670-7162510eb09c",
          "name": "Local",
          "type": "local"
        }
      ]
    },
    {
      "pureName": "auth_methods_config",
      "columns": [
        {
          "pureName": "auth_methods_config",
          "columnName": "id",
          "dataType": "int",
          "autoIncrement": true,
          "notNull": true
        },
        {
          "pureName": "auth_methods_config",
          "columnName": "auth_method_id",
          "dataType": "int",
          "notNull": true
        },
        {
          "pureName": "auth_methods_config",
          "columnName": "key",
          "dataType": "varchar(250)",
          "notNull": false
        },
        {
          "pureName": "auth_methods_config",
          "columnName": "value",
          "dataType": "varchar(250)",
          "notNull": false
        }
      ],
      "foreignKeys": [
        {
          "constraintType": "foreignKey",
          "pureName": "auth_methods_config",
          "refTableName": "auth_methods",
          "deleteAction": "CASCADE",
          "columns": [
            {
              "columnName": "auth_method_id",
              "refColumnName": "id"
            }
          ]
        }
      ],
      "primaryKey": {
        "pureName": "auth_methods_config",
        "constraintType": "primaryKey",
        "columns": [
          {
            "columnName": "id"
          }
        ]
      }
    },
    {
      "pureName": "config",
      "columns": [
        {
          "pureName": "config",
          "columnName": "id",
          "dataType": "int",
          "autoIncrement": true,
          "notNull": true
        },
        {
          "pureName": "config",
          "columnName": "group",
          "dataType": "varchar(250)",
          "notNull": false
        },
        {
          "pureName": "config",
          "columnName": "key",
          "dataType": "varchar(250)",
          "notNull": false
        },
        {
          "pureName": "config",
          "columnName": "value",
          "dataType": "varchar(1000)",
          "notNull": false
        }
      ],
      "foreignKeys": [],
      "primaryKey": {
        "pureName": "config",
        "constraintType": "primaryKey",
        "columns": [
          {
            "columnName": "id"
          }
        ]
      }
    },
    {
      "pureName": "connections",
      "columns": [
        {
          "pureName": "connections",
          "columnName": "id",
          "dataType": "int",
          "autoIncrement": true,
          "notNull": true
        },
        {
          "pureName": "connections",
          "columnName": "conid",
          "dataType": "varchar(250)",
          "notNull": false
        },
        {
          "pureName": "connections",
          "columnName": "displayName",
          "dataType": "varchar(250)",
          "notNull": false
        },
        {
          "pureName": "connections",
          "columnName": "connectionColor",
          "dataType": "varchar(250)",
          "notNull": false
        },
        {
          "pureName": "connections",
          "columnName": "engine",
          "dataType": "varchar(250)",
          "notNull": false
        },
        {
          "pureName": "connections",
          "columnName": "server",
          "dataType": "varchar(250)",
          "notNull": false
        },
        {
          "pureName": "connections",
          "columnName": "databaseFile",
          "dataType": "varchar(250)",
          "notNull": false
        },
        {
          "pureName": "connections",
          "columnName": "useDatabaseUrl",
          "dataType": "int",
          "notNull": false
        },
        {
          "pureName": "connections",
          "columnName": "databaseUrl",
          "dataType": "varchar(250)",
          "notNull": false
        },
        {
          "pureName": "connections",
          "columnName": "authType",
          "dataType": "varchar(250)",
          "notNull": false
        },
        {
          "pureName": "connections",
          "columnName": "port",
          "dataType": "varchar(20)",
          "notNull": false
        },
        {
          "pureName": "connections",
          "columnName": "serviceName",
          "dataType": "varchar(250)",
          "notNull": false
        },
        {
          "pureName": "connections",
          "columnName": "serviceNameType",
          "dataType": "varchar(250)",
          "notNull": false
        },
        {
          "pureName": "connections",
          "columnName": "socketPath",
          "dataType": "varchar(250)",
          "notNull": false
        },
        {
          "pureName": "connections",
          "columnName": "user",
          "dataType": "varchar(250)",
          "notNull": false
        },
        {
          "pureName": "connections",
          "columnName": "password",
          "dataType": "varchar(250)",
          "notNull": false
        },
        {
          "pureName": "connections",
          "columnName": "passwordMode",
          "dataType": "varchar(250)",
          "notNull": false
        },
        {
          "pureName": "connections",
          "columnName": "treeKeySeparator",
          "dataType": "varchar(250)",
          "notNull": false
        },
        {
          "pureName": "connections",
          "columnName": "windowsDomain",
          "dataType": "varchar(250)",
          "notNull": false
        },
        {
          "pureName": "connections",
          "columnName": "isReadOnly",
          "dataType": "int",
          "notNull": false
        },
        {
          "pureName": "connections",
          "columnName": "trustServerCertificate",
          "dataType": "int",
          "notNull": false
        },
        {
          "pureName": "connections",
          "columnName": "defaultDatabase",
          "dataType": "varchar(250)",
          "notNull": false
        },
        {
          "pureName": "connections",
          "columnName": "singleDatabase",
          "dataType": "int",
          "notNull": false
        },
        {
          "pureName": "connections",
          "columnName": "useSshTunnel",
          "dataType": "int",
          "notNull": false
        },
        {
          "pureName": "connections",
          "columnName": "sshHost",
          "dataType": "varchar(250)",
          "notNull": false
        },
        {
          "pureName": "connections",
          "columnName": "sshPort",
          "dataType": "varchar(20)",
          "notNull": false
        },
        {
          "pureName": "connections",
          "columnName": "sshMode",
          "dataType": "varchar(250)",
          "notNull": false
        },
        {
          "pureName": "connections",
          "columnName": "sshKeyFile",
          "dataType": "varchar(250)",
          "notNull": false
        },
        {
          "pureName": "connections",
          "columnName": "sshKeyfilePassword",
          "dataType": "varchar(250)",
          "notNull": false
        },
        {
          "pureName": "connections",
          "columnName": "sshLogin",
          "dataType": "varchar(250)",
          "notNull": false
        },
        {
          "pureName": "connections",
          "columnName": "sshPassword",
          "dataType": "varchar(250)",
          "notNull": false
        },
        {
          "pureName": "connections",
          "columnName": "sshBastionHost",
          "dataType": "varchar(250)",
          "notNull": false
        },
        {
          "pureName": "connections",
          "columnName": "useSsl",
          "dataType": "int",
          "notNull": false
        },
        {
          "pureName": "connections",
          "columnName": "sslCaFile",
          "dataType": "varchar(250)",
          "notNull": false
        },
        {
          "pureName": "connections",
          "columnName": "sslCertFilePassword",
          "dataType": "varchar(250)",
          "notNull": false
        },
        {
          "pureName": "connections",
          "columnName": "sslKeyFile",
          "dataType": "varchar(250)",
          "notNull": false
        },
        {
          "pureName": "connections",
          "columnName": "sslRejectUnauthorized",
          "dataType": "int",
          "notNull": false
        },
        {
          "pureName": "connections",
          "columnName": "clientLibraryPath",
          "dataType": "varchar(250)",
          "notNull": false
        },
        {
          "pureName": "connections",
          "columnName": "useRedirectDbLogin",
          "dataType": "int",
          "notNull": false
        },
        {
          "pureName": "connections",
          "columnName": "allowedDatabases",
          "dataType": "varchar(500)",
          "notNull": false
        },
        {
          "pureName": "connections",
          "columnName": "allowedDatabasesRegex",
          "dataType": "varchar(250)",
          "notNull": false
        },
        {
          "pureName": "connections",
          "columnName": "endpoint",
          "dataType": "varchar(250)",
          "notNull": false
        },
        {
          "pureName": "connections",
          "columnName": "endpointKey",
          "dataType": "varchar(250)",
          "notNull": false
        },
        {
          "pureName": "connections",
          "columnName": "accessKeyId",
          "dataType": "varchar(250)",
          "notNull": false
        },
        {
          "pureName": "connections",
          "columnName": "secretAccessKey",
          "dataType": "varchar(250)",
          "notNull": false
        },
        {
          "pureName": "connections",
          "columnName": "awsRegion",
          "dataType": "varchar(250)",
          "notNull": false
        }
      ],
      "foreignKeys": [],
      "primaryKey": {
        "pureName": "connections",
        "constraintType": "primaryKey",
        "columns": [
          {
            "columnName": "id"
          }
        ]
      }
    },
    {
      "pureName": "roles",
      "columns": [
        {
          "pureName": "roles",
          "columnName": "id",
          "dataType": "int",
          "autoIncrement": true,
          "notNull": true
        },
        {
          "pureName": "roles",
          "columnName": "name",
          "dataType": "varchar(250)",
          "notNull": false
        }
      ],
      "foreignKeys": [],
      "primaryKey": {
        "pureName": "roles",
        "constraintType": "primaryKey",
        "columns": [
          {
            "columnName": "id"
          }
        ]
      },
      "preloadedRows": [
        {
          "id": -1,
          "name": "anonymous-user"
        },
        {
          "id": -2,
          "name": "logged-user"
        },
        {
          "id": -3,
          "name": "superadmin"
        }
      ]
    },
    {
      "pureName": "role_connections",
      "columns": [
        {
          "pureName": "role_connections",
          "columnName": "id",
          "dataType": "int",
          "autoIncrement": true,
          "notNull": true
        },
        {
          "pureName": "role_connections",
          "columnName": "role_id",
          "dataType": "int",
          "notNull": true
        },
        {
          "pureName": "role_connections",
          "columnName": "connection_id",
          "dataType": "int",
          "notNull": true
        }
      ],
      "foreignKeys": [
        {
          "constraintType": "foreignKey",
          "pureName": "role_connections",
          "refTableName": "roles",
          "deleteAction": "CASCADE",
          "columns": [
            {
              "columnName": "role_id",
              "refColumnName": "id"
            }
          ]
        },
        {
          "constraintType": "foreignKey",
          "pureName": "role_connections",
          "refTableName": "connections",
          "deleteAction": "CASCADE",
          "columns": [
            {
              "columnName": "connection_id",
              "refColumnName": "id"
            }
          ]
        }
      ],
      "primaryKey": {
        "pureName": "role_connections",
        "constraintType": "primaryKey",
        "columns": [
          {
            "columnName": "id"
          }
        ]
      }
    },
    {
      "pureName": "role_permissions",
      "columns": [
        {
          "pureName": "role_permissions",
          "columnName": "id",
          "dataType": "int",
          "autoIncrement": true,
          "notNull": true
        },
        {
          "pureName": "role_permissions",
          "columnName": "role_id",
          "dataType": "int",
          "notNull": true
        },
        {
          "pureName": "role_permissions",
          "columnName": "permission",
          "dataType": "varchar(250)",
          "notNull": true
        }
      ],
      "foreignKeys": [
        {
          "constraintType": "foreignKey",
          "pureName": "role_permissions",
          "refTableName": "roles",
          "deleteAction": "CASCADE",
          "columns": [
            {
              "columnName": "role_id",
              "refColumnName": "id"
            }
          ]
        }
      ],
      "primaryKey": {
        "pureName": "role_permissions",
        "constraintType": "primaryKey",
        "columns": [
          {
            "columnName": "id"
          }
        ]
      }
    },
    {
      "pureName": "users",
      "columns": [
        {
          "pureName": "users",
          "columnName": "id",
          "dataType": "int",
          "autoIncrement": true,
          "notNull": true
        },
        {
          "pureName": "users",
          "columnName": "login",
          "dataType": "varchar(250)",
          "notNull": false
        },
        {
          "pureName": "users",
          "columnName": "password",
          "dataType": "varchar(250)",
          "notNull": false
        },
        {
          "pureName": "users",
          "columnName": "email",
          "dataType": "varchar(250)",
          "notNull": false
        }
      ],
      "foreignKeys": [],
      "primaryKey": {
        "pureName": "users",
        "constraintType": "primaryKey",
        "columns": [
          {
            "columnName": "id"
          }
        ]
      }
    },
    {
      "pureName": "user_connections",
      "columns": [
        {
          "pureName": "user_connections",
          "columnName": "id",
          "dataType": "int",
          "autoIncrement": true,
          "notNull": true
        },
        {
          "pureName": "user_connections",
          "columnName": "user_id",
          "dataType": "int",
          "notNull": true
        },
        {
          "pureName": "user_connections",
          "columnName": "connection_id",
          "dataType": "int",
          "notNull": true
        }
      ],
      "foreignKeys": [
        {
          "constraintType": "foreignKey",
          "pureName": "user_connections",
          "refTableName": "users",
          "deleteAction": "CASCADE",
          "columns": [
            {
              "columnName": "user_id",
              "refColumnName": "id"
            }
          ]
        },
        {
          "constraintType": "foreignKey",
          "pureName": "user_connections",
          "refTableName": "connections",
          "deleteAction": "CASCADE",
          "columns": [
            {
              "columnName": "connection_id",
              "refColumnName": "id"
            }
          ]
        }
      ],
      "primaryKey": {
        "pureName": "user_connections",
        "constraintType": "primaryKey",
        "columns": [
          {
            "columnName": "id"
          }
        ]
      }
    },
    {
      "pureName": "user_permissions",
      "columns": [
        {
          "pureName": "user_permissions",
          "columnName": "id",
          "dataType": "int",
          "autoIncrement": true,
          "notNull": true
        },
        {
          "pureName": "user_permissions",
          "columnName": "user_id",
          "dataType": "int",
          "notNull": true
        },
        {
          "pureName": "user_permissions",
          "columnName": "permission",
          "dataType": "varchar(250)",
          "notNull": true
        }
      ],
      "foreignKeys": [
        {
          "constraintType": "foreignKey",
          "pureName": "user_permissions",
          "refTableName": "users",
          "deleteAction": "CASCADE",
          "columns": [
            {
              "columnName": "user_id",
              "refColumnName": "id"
            }
          ]
        }
      ],
      "primaryKey": {
        "pureName": "user_permissions",
        "constraintType": "primaryKey",
        "columns": [
          {
            "columnName": "id"
          }
        ]
      }
    },
    {
      "pureName": "user_roles",
      "columns": [
        {
          "pureName": "user_roles",
          "columnName": "id",
          "dataType": "int",
          "autoIncrement": true,
          "notNull": true
        },
        {
          "pureName": "user_roles",
          "columnName": "user_id",
          "dataType": "int",
          "notNull": true
        },
        {
          "pureName": "user_roles",
          "columnName": "role_id",
          "dataType": "int",
          "notNull": true
        }
      ],
      "foreignKeys": [
        {
          "constraintType": "foreignKey",
          "pureName": "user_roles",
          "refTableName": "users",
          "deleteAction": "CASCADE",
          "columns": [
            {
              "columnName": "user_id",
              "refColumnName": "id"
            }
          ]
        },
        {
          "constraintType": "foreignKey",
          "pureName": "user_roles",
          "refTableName": "roles",
          "deleteAction": "CASCADE",
          "columns": [
            {
              "columnName": "role_id",
              "refColumnName": "id"
            }
          ]
        }
      ],
      "primaryKey": {
        "pureName": "user_roles",
        "constraintType": "primaryKey",
        "columns": [
          {
            "columnName": "id"
          }
        ]
      }
    }
  ],
  "collections": [],
  "views": [],
  "matviews": [],
  "functions": [],
  "procedures": [],
  "triggers": []
};