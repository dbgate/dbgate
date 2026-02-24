module.exports = {
  "tables": [
    {
      "pureName": "audit_log",
      "columns": [
        {
          "pureName": "audit_log",
          "columnName": "id",
          "dataType": "int",
          "autoIncrement": true,
          "notNull": true
        },
        {
          "pureName": "audit_log",
          "columnName": "created",
          "dataType": "bigint",
          "notNull": true
        },
        {
          "pureName": "audit_log",
          "columnName": "modified",
          "dataType": "bigint",
          "notNull": false
        },
        {
          "pureName": "audit_log",
          "columnName": "user_id",
          "dataType": "int",
          "notNull": false
        },
        {
          "pureName": "audit_log",
          "columnName": "user_login",
          "dataType": "varchar(250)",
          "notNull": false
        },
        {
          "pureName": "audit_log",
          "columnName": "category",
          "dataType": "varchar(50)",
          "notNull": false
        },
        {
          "pureName": "audit_log",
          "columnName": "component",
          "dataType": "varchar(50)",
          "notNull": false
        },
        {
          "pureName": "audit_log",
          "columnName": "action",
          "dataType": "varchar(50)",
          "notNull": false
        },
        {
          "pureName": "audit_log",
          "columnName": "severity",
          "dataType": "varchar(50)",
          "notNull": false
        },
        {
          "pureName": "audit_log",
          "columnName": "event",
          "dataType": "varchar(100)",
          "notNull": false
        },
        {
          "pureName": "audit_log",
          "columnName": "message",
          "dataType": "varchar(250)",
          "notNull": false
        },
        {
          "pureName": "audit_log",
          "columnName": "detail",
          "dataType": "varchar(1000)",
          "notNull": false
        },
        {
          "pureName": "audit_log",
          "columnName": "detail_full_length",
          "dataType": "int",
          "notNull": false
        },
        {
          "pureName": "audit_log",
          "columnName": "session_id",
          "dataType": "varchar(200)",
          "notNull": false
        },
        {
          "pureName": "audit_log",
          "columnName": "session_group",
          "dataType": "varchar(50)",
          "notNull": false
        },
        {
          "pureName": "audit_log",
          "columnName": "session_param",
          "dataType": "varchar(200)",
          "notNull": false
        },
        {
          "pureName": "audit_log",
          "columnName": "conid",
          "dataType": "varchar(100)",
          "notNull": false
        },
        {
          "pureName": "audit_log",
          "columnName": "connection_data",
          "dataType": "varchar(1000)",
          "notNull": false
        },
        {
          "pureName": "audit_log",
          "columnName": "database",
          "dataType": "varchar(200)",
          "notNull": false
        },
        {
          "pureName": "audit_log",
          "columnName": "schema_name",
          "dataType": "varchar(100)",
          "notNull": false
        },
        {
          "pureName": "audit_log",
          "columnName": "pure_name",
          "dataType": "varchar(100)",
          "notNull": false
        },
        {
          "pureName": "audit_log",
          "columnName": "sumint_1",
          "dataType": "int",
          "notNull": false
        },
        {
          "pureName": "audit_log",
          "columnName": "sumint_2",
          "dataType": "int",
          "notNull": false
        }
      ],
      "foreignKeys": [
        {
          "constraintType": "foreignKey",
          "constraintName": "FK_audit_log_user_id",
          "pureName": "audit_log",
          "refTableName": "users",
          "deleteAction": "SET NULL",
          "columns": [
            {
              "columnName": "user_id",
              "refColumnName": "id"
            }
          ]
        }
      ],
      "indexes": [
        {
          "constraintName": "idx_audit_log_session",
          "pureName": "audit_log",
          "constraintType": "index",
          "columns": [
            {
              "columnName": "session_group"
            },
            {
              "columnName": "session_id"
            },
            {
              "columnName": "session_param"
            }
          ]
        }
      ],
      "primaryKey": {
        "pureName": "audit_log",
        "constraintType": "primaryKey",
        "constraintName": "PK_audit_log",
        "columns": [
          {
            "columnName": "id"
          }
        ]
      }
    },
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
        "constraintName": "PK_auth_methods",
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
          "type": "none",
          "is_disabled": 1
        },
        {
          "id": -2,
          "amoid": "53db1cbf-f488-44d9-8670-7162510eb09c",
          "name": "Local",
          "type": "local"
        }
      ],
      "preloadedRowsInsertOnly": [
        "is_disabled"
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
          "constraintName": "FK_auth_methods_config_auth_method_id",
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
      "uniques": [
        {
          "constraintName": "UQ_auth_methods_config_auth_method_id_key",
          "pureName": "auth_methods_config",
          "constraintType": "unique",
          "columns": [
            {
              "columnName": "auth_method_id"
            },
            {
              "columnName": "key"
            }
          ]
        }
      ],
      "primaryKey": {
        "pureName": "auth_methods_config",
        "constraintType": "primaryKey",
        "constraintName": "PK_auth_methods_config",
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
        },
        {
          "pureName": "config",
          "columnName": "valueType",
          "dataType": "varchar(50)",
          "notNull": false
        }
      ],
      "foreignKeys": [],
      "uniques": [
        {
          "constraintName": "UQ_config_group_key",
          "pureName": "config",
          "constraintType": "unique",
          "columns": [
            {
              "columnName": "group"
            },
            {
              "columnName": "key"
            }
          ]
        }
      ],
      "primaryKey": {
        "pureName": "config",
        "constraintType": "primaryKey",
        "constraintName": "PK_config",
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
          "columnName": "useSeparateSchemas",
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
        },
        {
          "pureName": "connections",
          "columnName": "connectionDefinition",
          "dataType": "text",
          "notNull": false
        },
        {
          "pureName": "connections",
          "columnName": "import_source_id",
          "dataType": "int",
          "notNull": false
        },
        {
          "pureName": "connections",
          "columnName": "id_original",
          "dataType": "varchar(250)",
          "notNull": false
        }
      ],
      "foreignKeys": [
        {
          "constraintType": "foreignKey",
          "constraintName": "FK_connections_import_source_id",
          "pureName": "connections",
          "refTableName": "import_sources",
          "columns": [
            {
              "columnName": "import_source_id",
              "refColumnName": "id"
            }
          ]
        }
      ],
      "primaryKey": {
        "pureName": "connections",
        "constraintType": "primaryKey",
        "constraintName": "PK_connections",
        "columns": [
          {
            "columnName": "id"
          }
        ]
      }
    },
    {
      "pureName": "database_permission_roles",
      "columns": [
        {
          "pureName": "database_permission_roles",
          "columnName": "id",
          "dataType": "int",
          "autoIncrement": true,
          "notNull": true
        },
        {
          "pureName": "database_permission_roles",
          "columnName": "name",
          "dataType": "varchar(100)",
          "notNull": true
        }
      ],
      "foreignKeys": [],
      "primaryKey": {
        "pureName": "database_permission_roles",
        "constraintType": "primaryKey",
        "constraintName": "PK_database_permission_roles",
        "columns": [
          {
            "columnName": "id"
          }
        ]
      },
      "preloadedRows": [
        {
          "id": -1,
          "name": "view"
        },
        {
          "id": -2,
          "name": "read_content"
        },
        {
          "id": -3,
          "name": "write_data"
        },
        {
          "id": -4,
          "name": "run_script"
        },
        {
          "id": -5,
          "name": "deny"
        }
      ]
    },
    {
      "pureName": "file_permission_roles",
      "columns": [
        {
          "pureName": "file_permission_roles",
          "columnName": "id",
          "dataType": "int",
          "autoIncrement": true,
          "notNull": true
        },
        {
          "pureName": "file_permission_roles",
          "columnName": "name",
          "dataType": "varchar(100)",
          "notNull": true
        }
      ],
      "foreignKeys": [],
      "primaryKey": {
        "pureName": "file_permission_roles",
        "constraintType": "primaryKey",
        "constraintName": "PK_file_permission_roles",
        "columns": [
          {
            "columnName": "id"
          }
        ]
      },
      "preloadedRows": [
        {
          "id": -1,
          "name": "allow"
        },
        {
          "id": -2,
          "name": "deny"
        }
      ]
    },
    {
      "pureName": "import_sources",
      "columns": [
        {
          "pureName": "import_sources",
          "columnName": "id",
          "dataType": "int",
          "autoIncrement": true,
          "notNull": true
        },
        {
          "pureName": "import_sources",
          "columnName": "name",
          "dataType": "varchar(250)",
          "notNull": true
        }
      ],
      "foreignKeys": [],
      "primaryKey": {
        "pureName": "import_sources",
        "constraintType": "primaryKey",
        "constraintName": "PK_import_sources",
        "columns": [
          {
            "columnName": "id"
          }
        ]
      },
      "preloadedRows": [
        {
          "id": -1,
          "name": "env"
        }
      ]
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
        },
        {
          "pureName": "roles",
          "columnName": "import_source_id",
          "dataType": "int",
          "notNull": false
        },
        {
          "pureName": "roles",
          "columnName": "id_original",
          "dataType": "varchar(250)",
          "notNull": false
        }
      ],
      "foreignKeys": [
        {
          "constraintType": "foreignKey",
          "constraintName": "FK_roles_import_source_id",
          "pureName": "roles",
          "refTableName": "import_sources",
          "columns": [
            {
              "columnName": "import_source_id",
              "refColumnName": "id"
            }
          ]
        }
      ],
      "primaryKey": {
        "pureName": "roles",
        "constraintType": "primaryKey",
        "constraintName": "PK_roles",
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
        },
        {
          "pureName": "role_connections",
          "columnName": "import_source_id",
          "dataType": "int",
          "notNull": false
        }
      ],
      "foreignKeys": [
        {
          "constraintType": "foreignKey",
          "constraintName": "FK_role_connections_role_id",
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
          "constraintName": "FK_role_connections_connection_id",
          "pureName": "role_connections",
          "refTableName": "connections",
          "deleteAction": "CASCADE",
          "columns": [
            {
              "columnName": "connection_id",
              "refColumnName": "id"
            }
          ]
        },
        {
          "constraintType": "foreignKey",
          "constraintName": "FK_role_connections_import_source_id",
          "pureName": "role_connections",
          "refTableName": "import_sources",
          "columns": [
            {
              "columnName": "import_source_id",
              "refColumnName": "id"
            }
          ]
        }
      ],
      "primaryKey": {
        "pureName": "role_connections",
        "constraintType": "primaryKey",
        "constraintName": "PK_role_connections",
        "columns": [
          {
            "columnName": "id"
          }
        ]
      }
    },
    {
      "pureName": "role_databases",
      "columns": [
        {
          "pureName": "role_databases",
          "columnName": "id",
          "dataType": "int",
          "autoIncrement": true,
          "notNull": true
        },
        {
          "pureName": "role_databases",
          "columnName": "role_id",
          "dataType": "int",
          "notNull": true
        },
        {
          "pureName": "role_databases",
          "columnName": "connection_id",
          "dataType": "int",
          "notNull": false
        },
        {
          "pureName": "role_databases",
          "columnName": "database_names_list",
          "dataType": "varchar(1000)",
          "notNull": false
        },
        {
          "pureName": "role_databases",
          "columnName": "database_names_regex",
          "dataType": "varchar(1000)",
          "notNull": false
        },
        {
          "pureName": "role_databases",
          "columnName": "database_permission_role_id",
          "dataType": "int",
          "notNull": true
        },
        {
          "pureName": "role_databases",
          "columnName": "import_source_id",
          "dataType": "int",
          "notNull": false
        },
        {
          "pureName": "role_databases",
          "columnName": "id_original",
          "dataType": "varchar(250)",
          "notNull": false
        }
      ],
      "foreignKeys": [
        {
          "constraintType": "foreignKey",
          "constraintName": "FK_role_databases_role_id",
          "pureName": "role_databases",
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
          "constraintName": "FK_role_databases_connection_id",
          "pureName": "role_databases",
          "refTableName": "connections",
          "deleteAction": "CASCADE",
          "columns": [
            {
              "columnName": "connection_id",
              "refColumnName": "id"
            }
          ]
        },
        {
          "constraintType": "foreignKey",
          "constraintName": "FK_role_databases_database_permission_role_id",
          "pureName": "role_databases",
          "refTableName": "database_permission_roles",
          "columns": [
            {
              "columnName": "database_permission_role_id",
              "refColumnName": "id"
            }
          ]
        },
        {
          "constraintType": "foreignKey",
          "constraintName": "FK_role_databases_import_source_id",
          "pureName": "role_databases",
          "refTableName": "import_sources",
          "columns": [
            {
              "columnName": "import_source_id",
              "refColumnName": "id"
            }
          ]
        }
      ],
      "primaryKey": {
        "pureName": "role_databases",
        "constraintType": "primaryKey",
        "constraintName": "PK_role_databases",
        "columns": [
          {
            "columnName": "id"
          }
        ]
      }
    },
    {
      "pureName": "role_files",
      "columns": [
        {
          "pureName": "role_files",
          "columnName": "id",
          "dataType": "int",
          "autoIncrement": true,
          "notNull": true
        },
        {
          "pureName": "role_files",
          "columnName": "role_id",
          "dataType": "int",
          "notNull": true
        },
        {
          "pureName": "role_files",
          "columnName": "folder_name",
          "dataType": "varchar(100)",
          "notNull": false
        },
        {
          "pureName": "role_files",
          "columnName": "file_names_list",
          "dataType": "varchar(1000)",
          "notNull": false
        },
        {
          "pureName": "role_files",
          "columnName": "file_names_regex",
          "dataType": "varchar(1000)",
          "notNull": false
        },
        {
          "pureName": "role_files",
          "columnName": "file_permission_role_id",
          "dataType": "int",
          "notNull": true
        }
      ],
      "foreignKeys": [
        {
          "constraintType": "foreignKey",
          "constraintName": "FK_role_files_role_id",
          "pureName": "role_files",
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
          "constraintName": "FK_role_files_file_permission_role_id",
          "pureName": "role_files",
          "refTableName": "file_permission_roles",
          "columns": [
            {
              "columnName": "file_permission_role_id",
              "refColumnName": "id"
            }
          ]
        }
      ],
      "primaryKey": {
        "pureName": "role_files",
        "constraintType": "primaryKey",
        "constraintName": "PK_role_files",
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
        },
        {
          "pureName": "role_permissions",
          "columnName": "import_source_id",
          "dataType": "int",
          "notNull": false
        }
      ],
      "foreignKeys": [
        {
          "constraintType": "foreignKey",
          "constraintName": "FK_role_permissions_role_id",
          "pureName": "role_permissions",
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
          "constraintName": "FK_role_permissions_import_source_id",
          "pureName": "role_permissions",
          "refTableName": "import_sources",
          "columns": [
            {
              "columnName": "import_source_id",
              "refColumnName": "id"
            }
          ]
        }
      ],
      "primaryKey": {
        "pureName": "role_permissions",
        "constraintType": "primaryKey",
        "constraintName": "PK_role_permissions",
        "columns": [
          {
            "columnName": "id"
          }
        ]
      }
    },
    {
      "pureName": "role_tables",
      "columns": [
        {
          "pureName": "role_tables",
          "columnName": "id",
          "dataType": "int",
          "autoIncrement": true,
          "notNull": true
        },
        {
          "pureName": "role_tables",
          "columnName": "role_id",
          "dataType": "int",
          "notNull": true
        },
        {
          "pureName": "role_tables",
          "columnName": "connection_id",
          "dataType": "int",
          "notNull": false
        },
        {
          "pureName": "role_tables",
          "columnName": "database_names_list",
          "dataType": "varchar(1000)",
          "notNull": false
        },
        {
          "pureName": "role_tables",
          "columnName": "database_names_regex",
          "dataType": "varchar(1000)",
          "notNull": false
        },
        {
          "pureName": "role_tables",
          "columnName": "schema_names_list",
          "dataType": "varchar(1000)",
          "notNull": false
        },
        {
          "pureName": "role_tables",
          "columnName": "schema_names_regex",
          "dataType": "varchar(1000)",
          "notNull": false
        },
        {
          "pureName": "role_tables",
          "columnName": "table_names_list",
          "dataType": "varchar(1000)",
          "notNull": false
        },
        {
          "pureName": "role_tables",
          "columnName": "table_names_regex",
          "dataType": "varchar(1000)",
          "notNull": false
        },
        {
          "pureName": "role_tables",
          "columnName": "table_permission_role_id",
          "dataType": "int",
          "notNull": true
        },
        {
          "pureName": "role_tables",
          "columnName": "table_permission_scope_id",
          "dataType": "int",
          "notNull": true
        },
        {
          "pureName": "role_tables",
          "columnName": "import_source_id",
          "dataType": "int",
          "notNull": false
        },
        {
          "pureName": "role_tables",
          "columnName": "id_original",
          "dataType": "varchar(250)",
          "notNull": false
        }
      ],
      "foreignKeys": [
        {
          "constraintType": "foreignKey",
          "constraintName": "FK_role_tables_role_id",
          "pureName": "role_tables",
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
          "constraintName": "FK_role_tables_connection_id",
          "pureName": "role_tables",
          "refTableName": "connections",
          "deleteAction": "CASCADE",
          "columns": [
            {
              "columnName": "connection_id",
              "refColumnName": "id"
            }
          ]
        },
        {
          "constraintType": "foreignKey",
          "constraintName": "FK_role_tables_table_permission_role_id",
          "pureName": "role_tables",
          "refTableName": "table_permission_roles",
          "columns": [
            {
              "columnName": "table_permission_role_id",
              "refColumnName": "id"
            }
          ]
        },
        {
          "constraintType": "foreignKey",
          "constraintName": "FK_role_tables_table_permission_scope_id",
          "pureName": "role_tables",
          "refTableName": "table_permission_scopes",
          "columns": [
            {
              "columnName": "table_permission_scope_id",
              "refColumnName": "id"
            }
          ]
        },
        {
          "constraintType": "foreignKey",
          "constraintName": "FK_role_tables_import_source_id",
          "pureName": "role_tables",
          "refTableName": "import_sources",
          "columns": [
            {
              "columnName": "import_source_id",
              "refColumnName": "id"
            }
          ]
        }
      ],
      "primaryKey": {
        "pureName": "role_tables",
        "constraintType": "primaryKey",
        "constraintName": "PK_role_tables",
        "columns": [
          {
            "columnName": "id"
          }
        ]
      }
    },
    {
      "pureName": "role_team_files",
      "columns": [
        {
          "pureName": "role_team_files",
          "columnName": "id",
          "dataType": "int",
          "autoIncrement": true,
          "notNull": true
        },
        {
          "pureName": "role_team_files",
          "columnName": "role_id",
          "dataType": "int",
          "notNull": true
        },
        {
          "pureName": "role_team_files",
          "columnName": "team_file_id",
          "dataType": "int",
          "notNull": true
        },
        {
          "pureName": "role_team_files",
          "columnName": "allow_read",
          "dataType": "int",
          "notNull": false
        },
        {
          "pureName": "role_team_files",
          "columnName": "allow_write",
          "dataType": "int",
          "notNull": false
        },
        {
          "pureName": "role_team_files",
          "columnName": "allow_use",
          "dataType": "int",
          "notNull": false
        }
      ],
      "foreignKeys": [
        {
          "constraintType": "foreignKey",
          "constraintName": "FK_role_team_files_role_id",
          "pureName": "role_team_files",
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
          "constraintName": "FK_role_team_files_team_file_id",
          "pureName": "role_team_files",
          "refTableName": "team_files",
          "deleteAction": "CASCADE",
          "columns": [
            {
              "columnName": "team_file_id",
              "refColumnName": "id"
            }
          ]
        }
      ],
      "primaryKey": {
        "pureName": "role_team_files",
        "constraintType": "primaryKey",
        "constraintName": "PK_role_team_files",
        "columns": [
          {
            "columnName": "id"
          }
        ]
      }
    },
    {
      "pureName": "role_team_folders",
      "columns": [
        {
          "pureName": "role_team_folders",
          "columnName": "id",
          "dataType": "int",
          "autoIncrement": true,
          "notNull": true
        },
        {
          "pureName": "role_team_folders",
          "columnName": "role_id",
          "dataType": "int",
          "notNull": true
        },
        {
          "pureName": "role_team_folders",
          "columnName": "team_folder_id",
          "dataType": "int",
          "notNull": true
        },
        {
          "pureName": "role_team_folders",
          "columnName": "allow_read_files",
          "dataType": "int",
          "notNull": false
        },
        {
          "pureName": "role_team_folders",
          "columnName": "allow_write_files",
          "dataType": "int",
          "notNull": false
        },
        {
          "pureName": "role_team_folders",
          "columnName": "allow_use_files",
          "dataType": "int",
          "notNull": false
        }
      ],
      "foreignKeys": [
        {
          "constraintType": "foreignKey",
          "constraintName": "FK_role_team_folders_role_id",
          "pureName": "role_team_folders",
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
          "constraintName": "FK_role_team_folders_team_folder_id",
          "pureName": "role_team_folders",
          "refTableName": "team_folders",
          "deleteAction": "CASCADE",
          "columns": [
            {
              "columnName": "team_folder_id",
              "refColumnName": "id"
            }
          ]
        }
      ],
      "primaryKey": {
        "pureName": "role_team_folders",
        "constraintType": "primaryKey",
        "constraintName": "PK_role_team_folders",
        "columns": [
          {
            "columnName": "id"
          }
        ]
      }
    },
    {
      "pureName": "table_permission_roles",
      "columns": [
        {
          "pureName": "table_permission_roles",
          "columnName": "id",
          "dataType": "int",
          "autoIncrement": true,
          "notNull": true
        },
        {
          "pureName": "table_permission_roles",
          "columnName": "name",
          "dataType": "varchar(100)",
          "notNull": true
        }
      ],
      "foreignKeys": [],
      "primaryKey": {
        "pureName": "table_permission_roles",
        "constraintType": "primaryKey",
        "constraintName": "PK_table_permission_roles",
        "columns": [
          {
            "columnName": "id"
          }
        ]
      },
      "preloadedRows": [
        {
          "id": -1,
          "name": "read"
        },
        {
          "id": -2,
          "name": "update_only"
        },
        {
          "id": -3,
          "name": "create_update_delete"
        },
        {
          "id": -4,
          "name": "run_script"
        },
        {
          "id": -5,
          "name": "deny"
        }
      ]
    },
    {
      "pureName": "table_permission_scopes",
      "columns": [
        {
          "pureName": "table_permission_scopes",
          "columnName": "id",
          "dataType": "int",
          "autoIncrement": true,
          "notNull": true
        },
        {
          "pureName": "table_permission_scopes",
          "columnName": "name",
          "dataType": "varchar(100)",
          "notNull": true
        }
      ],
      "foreignKeys": [],
      "primaryKey": {
        "pureName": "table_permission_scopes",
        "constraintType": "primaryKey",
        "constraintName": "PK_table_permission_scopes",
        "columns": [
          {
            "columnName": "id"
          }
        ]
      },
      "preloadedRows": [
        {
          "id": -1,
          "name": "all_objects"
        },
        {
          "id": -2,
          "name": "tables"
        },
        {
          "id": -3,
          "name": "views"
        },
        {
          "id": -4,
          "name": "tables_views_collections"
        },
        {
          "id": -5,
          "name": "procedures"
        },
        {
          "id": -6,
          "name": "functions"
        },
        {
          "id": -7,
          "name": "triggers"
        },
        {
          "id": -8,
          "name": "sql_objects"
        },
        {
          "id": -9,
          "name": "collections"
        }
      ]
    },
    {
      "pureName": "team_files",
      "columns": [
        {
          "pureName": "team_files",
          "columnName": "id",
          "dataType": "int",
          "autoIncrement": true,
          "notNull": true
        },
        {
          "pureName": "team_files",
          "columnName": "file_name",
          "dataType": "varchar(250)",
          "notNull": false
        },
        {
          "pureName": "team_files",
          "columnName": "file_content",
          "dataType": "text",
          "notNull": false
        },
        {
          "pureName": "team_files",
          "columnName": "file_type_id",
          "dataType": "int",
          "notNull": true
        },
        {
          "pureName": "team_files",
          "columnName": "owner_user_id",
          "dataType": "int",
          "notNull": false
        },
        {
          "pureName": "team_files",
          "columnName": "metadata",
          "dataType": "varchar(1000)",
          "notNull": false
        },
        {
          "pureName": "team_files",
          "columnName": "team_folder_id",
          "dataType": "int",
          "notNull": true,
          "defaultValue": -1,
          "defaultConstraint": "DF_team_files_team_folder_id"
        }
      ],
      "foreignKeys": [
        {
          "constraintType": "foreignKey",
          "constraintName": "FK_team_files_file_type_id",
          "pureName": "team_files",
          "refTableName": "team_file_types",
          "columns": [
            {
              "columnName": "file_type_id",
              "refColumnName": "id"
            }
          ]
        },
        {
          "constraintType": "foreignKey",
          "constraintName": "FK_team_files_owner_user_id",
          "pureName": "team_files",
          "refTableName": "users",
          "columns": [
            {
              "columnName": "owner_user_id",
              "refColumnName": "id"
            }
          ]
        },
        {
          "constraintType": "foreignKey",
          "constraintName": "FK_team_files_team_folder_id",
          "pureName": "team_files",
          "refTableName": "team_folders",
          "columns": [
            {
              "columnName": "team_folder_id",
              "refColumnName": "id"
            }
          ]
        }
      ],
      "primaryKey": {
        "pureName": "team_files",
        "constraintType": "primaryKey",
        "constraintName": "PK_team_files",
        "columns": [
          {
            "columnName": "id"
          }
        ]
      }
    },
    {
      "pureName": "team_file_types",
      "columns": [
        {
          "pureName": "team_file_types",
          "columnName": "id",
          "dataType": "int",
          "notNull": true
        },
        {
          "pureName": "team_file_types",
          "columnName": "name",
          "dataType": "varchar(250)",
          "notNull": true
        },
        {
          "pureName": "team_file_types",
          "columnName": "format",
          "dataType": "varchar(50)",
          "notNull": false
        }
      ],
      "foreignKeys": [],
      "primaryKey": {
        "pureName": "team_file_types",
        "constraintType": "primaryKey",
        "constraintName": "PK_team_file_types",
        "columns": [
          {
            "columnName": "id"
          }
        ]
      },
      "preloadedRows": [
        {
          "id": -1,
          "name": "sql",
          "format": "text"
        },
        {
          "id": -2,
          "name": "diagrams",
          "format": "json"
        },
        {
          "id": -3,
          "name": "query",
          "format": "json"
        },
        {
          "id": -4,
          "name": "perspectives",
          "format": "json"
        },
        {
          "id": -5,
          "name": "impexp",
          "format": "json"
        },
        {
          "id": -6,
          "name": "shell",
          "format": "text"
        },
        {
          "id": -7,
          "name": "dbcompare",
          "format": "json"
        }
      ]
    },
    {
      "pureName": "team_folders",
      "columns": [
        {
          "pureName": "team_folders",
          "columnName": "id",
          "dataType": "int",
          "autoIncrement": true,
          "notNull": true
        },
        {
          "pureName": "team_folders",
          "columnName": "folder_name",
          "dataType": "varchar(250)",
          "notNull": false
        }
      ],
      "foreignKeys": [],
      "primaryKey": {
        "pureName": "team_folders",
        "constraintType": "primaryKey",
        "constraintName": "PK_team_folders",
        "columns": [
          {
            "columnName": "id"
          }
        ]
      },
      "preloadedRows": [
        {
          "id": -1,
          "folder_name": "default"
        }
      ]
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
        "constraintName": "PK_users",
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
          "constraintName": "FK_user_connections_user_id",
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
          "constraintName": "FK_user_connections_connection_id",
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
        "constraintName": "PK_user_connections",
        "columns": [
          {
            "columnName": "id"
          }
        ]
      }
    },
    {
      "pureName": "user_databases",
      "columns": [
        {
          "pureName": "user_databases",
          "columnName": "id",
          "dataType": "int",
          "autoIncrement": true,
          "notNull": true
        },
        {
          "pureName": "user_databases",
          "columnName": "user_id",
          "dataType": "int",
          "notNull": true
        },
        {
          "pureName": "user_databases",
          "columnName": "connection_id",
          "dataType": "int",
          "notNull": false
        },
        {
          "pureName": "user_databases",
          "columnName": "database_names_list",
          "dataType": "varchar(1000)",
          "notNull": false
        },
        {
          "pureName": "user_databases",
          "columnName": "database_names_regex",
          "dataType": "varchar(1000)",
          "notNull": false
        },
        {
          "pureName": "user_databases",
          "columnName": "database_permission_role_id",
          "dataType": "int",
          "notNull": true
        }
      ],
      "foreignKeys": [
        {
          "constraintType": "foreignKey",
          "constraintName": "FK_user_databases_user_id",
          "pureName": "user_databases",
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
          "constraintName": "FK_user_databases_connection_id",
          "pureName": "user_databases",
          "refTableName": "connections",
          "deleteAction": "CASCADE",
          "columns": [
            {
              "columnName": "connection_id",
              "refColumnName": "id"
            }
          ]
        },
        {
          "constraintType": "foreignKey",
          "constraintName": "FK_user_databases_database_permission_role_id",
          "pureName": "user_databases",
          "refTableName": "database_permission_roles",
          "columns": [
            {
              "columnName": "database_permission_role_id",
              "refColumnName": "id"
            }
          ]
        }
      ],
      "primaryKey": {
        "pureName": "user_databases",
        "constraintType": "primaryKey",
        "constraintName": "PK_user_databases",
        "columns": [
          {
            "columnName": "id"
          }
        ]
      }
    },
    {
      "pureName": "user_files",
      "columns": [
        {
          "pureName": "user_files",
          "columnName": "id",
          "dataType": "int",
          "autoIncrement": true,
          "notNull": true
        },
        {
          "pureName": "user_files",
          "columnName": "user_id",
          "dataType": "int",
          "notNull": true
        },
        {
          "pureName": "user_files",
          "columnName": "folder_name",
          "dataType": "varchar(100)",
          "notNull": false
        },
        {
          "pureName": "user_files",
          "columnName": "file_names_list",
          "dataType": "varchar(1000)",
          "notNull": false
        },
        {
          "pureName": "user_files",
          "columnName": "file_names_regex",
          "dataType": "varchar(1000)",
          "notNull": false
        },
        {
          "pureName": "user_files",
          "columnName": "file_permission_role_id",
          "dataType": "int",
          "notNull": true
        }
      ],
      "foreignKeys": [
        {
          "constraintType": "foreignKey",
          "constraintName": "FK_user_files_user_id",
          "pureName": "user_files",
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
          "constraintName": "FK_user_files_file_permission_role_id",
          "pureName": "user_files",
          "refTableName": "file_permission_roles",
          "columns": [
            {
              "columnName": "file_permission_role_id",
              "refColumnName": "id"
            }
          ]
        }
      ],
      "primaryKey": {
        "pureName": "user_files",
        "constraintType": "primaryKey",
        "constraintName": "PK_user_files",
        "columns": [
          {
            "columnName": "id"
          }
        ]
      }
    },
    {
      "pureName": "user_password_reset_tokens",
      "columns": [
        {
          "pureName": "user_password_reset_tokens",
          "columnName": "id",
          "dataType": "int",
          "autoIncrement": true,
          "notNull": true
        },
        {
          "pureName": "user_password_reset_tokens",
          "columnName": "user_id",
          "dataType": "int",
          "notNull": true
        },
        {
          "pureName": "user_password_reset_tokens",
          "columnName": "token",
          "dataType": "varchar(500)",
          "notNull": true
        },
        {
          "pureName": "user_password_reset_tokens",
          "columnName": "created_at",
          "dataType": "varchar(32)",
          "notNull": true
        },
        {
          "pureName": "user_password_reset_tokens",
          "columnName": "expires_at",
          "dataType": "varchar(32)",
          "notNull": true
        },
        {
          "pureName": "user_password_reset_tokens",
          "columnName": "used_at",
          "dataType": "varchar(32)",
          "notNull": false
        }
      ],
      "foreignKeys": [
        {
          "constraintType": "foreignKey",
          "constraintName": "FK_user_password_reset_tokens_user_id",
          "pureName": "user_password_reset_tokens",
          "refTableName": "users",
          "columns": [
            {
              "columnName": "user_id",
              "refColumnName": "id"
            }
          ]
        }
      ],
      "indexes": [
        {
          "constraintName": "idx_token",
          "pureName": "user_password_reset_tokens",
          "constraintType": "index",
          "columns": [
            {
              "columnName": "token"
            }
          ]
        }
      ],
      "primaryKey": {
        "pureName": "user_password_reset_tokens",
        "constraintType": "primaryKey",
        "constraintName": "PK_user_password_reset_tokens",
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
          "constraintName": "FK_user_permissions_user_id",
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
        "constraintName": "PK_user_permissions",
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
          "constraintName": "FK_user_roles_user_id",
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
          "constraintName": "FK_user_roles_role_id",
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
        "constraintName": "PK_user_roles",
        "columns": [
          {
            "columnName": "id"
          }
        ]
      }
    },
    {
      "pureName": "user_tables",
      "columns": [
        {
          "pureName": "user_tables",
          "columnName": "id",
          "dataType": "int",
          "autoIncrement": true,
          "notNull": true
        },
        {
          "pureName": "user_tables",
          "columnName": "user_id",
          "dataType": "int",
          "notNull": true
        },
        {
          "pureName": "user_tables",
          "columnName": "connection_id",
          "dataType": "int",
          "notNull": false
        },
        {
          "pureName": "user_tables",
          "columnName": "database_names_list",
          "dataType": "varchar(1000)",
          "notNull": false
        },
        {
          "pureName": "user_tables",
          "columnName": "database_names_regex",
          "dataType": "varchar(1000)",
          "notNull": false
        },
        {
          "pureName": "user_tables",
          "columnName": "schema_names_list",
          "dataType": "varchar(1000)",
          "notNull": false
        },
        {
          "pureName": "user_tables",
          "columnName": "schema_names_regex",
          "dataType": "varchar(1000)",
          "notNull": false
        },
        {
          "pureName": "user_tables",
          "columnName": "table_names_list",
          "dataType": "varchar(1000)",
          "notNull": false
        },
        {
          "pureName": "user_tables",
          "columnName": "table_names_regex",
          "dataType": "varchar(1000)",
          "notNull": false
        },
        {
          "pureName": "user_tables",
          "columnName": "table_permission_role_id",
          "dataType": "int",
          "notNull": true
        },
        {
          "pureName": "user_tables",
          "columnName": "table_permission_scope_id",
          "dataType": "int",
          "notNull": true
        }
      ],
      "foreignKeys": [
        {
          "constraintType": "foreignKey",
          "constraintName": "FK_user_tables_user_id",
          "pureName": "user_tables",
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
          "constraintName": "FK_user_tables_connection_id",
          "pureName": "user_tables",
          "refTableName": "connections",
          "deleteAction": "CASCADE",
          "columns": [
            {
              "columnName": "connection_id",
              "refColumnName": "id"
            }
          ]
        },
        {
          "constraintType": "foreignKey",
          "constraintName": "FK_user_tables_table_permission_role_id",
          "pureName": "user_tables",
          "refTableName": "table_permission_roles",
          "columns": [
            {
              "columnName": "table_permission_role_id",
              "refColumnName": "id"
            }
          ]
        },
        {
          "constraintType": "foreignKey",
          "constraintName": "FK_user_tables_table_permission_scope_id",
          "pureName": "user_tables",
          "refTableName": "table_permission_scopes",
          "columns": [
            {
              "columnName": "table_permission_scope_id",
              "refColumnName": "id"
            }
          ]
        }
      ],
      "primaryKey": {
        "pureName": "user_tables",
        "constraintType": "primaryKey",
        "constraintName": "PK_user_tables",
        "columns": [
          {
            "columnName": "id"
          }
        ]
      }
    },
    {
      "pureName": "user_team_files",
      "columns": [
        {
          "pureName": "user_team_files",
          "columnName": "id",
          "dataType": "int",
          "autoIncrement": true,
          "notNull": true
        },
        {
          "pureName": "user_team_files",
          "columnName": "user_id",
          "dataType": "int",
          "notNull": true
        },
        {
          "pureName": "user_team_files",
          "columnName": "team_file_id",
          "dataType": "int",
          "notNull": true
        },
        {
          "pureName": "user_team_files",
          "columnName": "allow_read",
          "dataType": "int",
          "notNull": false
        },
        {
          "pureName": "user_team_files",
          "columnName": "allow_write",
          "dataType": "int",
          "notNull": false
        },
        {
          "pureName": "user_team_files",
          "columnName": "allow_use",
          "dataType": "int",
          "notNull": false
        }
      ],
      "foreignKeys": [
        {
          "constraintType": "foreignKey",
          "constraintName": "FK_user_team_files_user_id",
          "pureName": "user_team_files",
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
          "constraintName": "FK_user_team_files_team_file_id",
          "pureName": "user_team_files",
          "refTableName": "team_files",
          "deleteAction": "CASCADE",
          "columns": [
            {
              "columnName": "team_file_id",
              "refColumnName": "id"
            }
          ]
        }
      ],
      "primaryKey": {
        "pureName": "user_team_files",
        "constraintType": "primaryKey",
        "constraintName": "PK_user_team_files",
        "columns": [
          {
            "columnName": "id"
          }
        ]
      }
    },
    {
      "pureName": "user_team_folders",
      "columns": [
        {
          "pureName": "user_team_folders",
          "columnName": "id",
          "dataType": "int",
          "autoIncrement": true,
          "notNull": true
        },
        {
          "pureName": "user_team_folders",
          "columnName": "user_id",
          "dataType": "int",
          "notNull": true
        },
        {
          "pureName": "user_team_folders",
          "columnName": "team_folder_id",
          "dataType": "int",
          "notNull": true
        },
        {
          "pureName": "user_team_folders",
          "columnName": "allow_read_files",
          "dataType": "int",
          "notNull": false
        },
        {
          "pureName": "user_team_folders",
          "columnName": "allow_write_files",
          "dataType": "int",
          "notNull": false
        },
        {
          "pureName": "user_team_folders",
          "columnName": "allow_use_files",
          "dataType": "int",
          "notNull": false
        }
      ],
      "foreignKeys": [
        {
          "constraintType": "foreignKey",
          "constraintName": "FK_user_team_folders_user_id",
          "pureName": "user_team_folders",
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
          "constraintName": "FK_user_team_folders_team_folder_id",
          "pureName": "user_team_folders",
          "refTableName": "team_folders",
          "deleteAction": "CASCADE",
          "columns": [
            {
              "columnName": "team_folder_id",
              "refColumnName": "id"
            }
          ]
        }
      ],
      "primaryKey": {
        "pureName": "user_team_folders",
        "constraintType": "primaryKey",
        "constraintName": "PK_user_team_folders",
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
  "triggers": [],
  "schedulerEvents": []
};