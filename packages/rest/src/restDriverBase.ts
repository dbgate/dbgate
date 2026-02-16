import { driverBase } from 'dbgate-tools';

export const apiDriverBase = {
  ...driverBase,
  supportExecuteQuery: false,
  getAuthTypes() {
    return [
      {
        title: 'No Authentication',
        name: 'none',
      },
      {
        title: 'Basic Authentication',
        name: 'basic',
      },
      {
        title: 'Bearer Token Authentication',
        name: 'bearer',
      },
      {
        title: 'API Key Authentication',
        name: 'apikey',
      },
    ];
  },

  showAuthConnectionField: (field, values) => {
    if (field === 'authType') return true;
    if (values?.authType === 'basic') {
      if (field === 'user') return true;
      if (field === 'password') return true;
    }
    if (values?.authType === 'bearer') {
      if (field === 'authToken') return true;
    }
    if (values?.authType === 'apikey') {
      if (field === 'apiKeyHeader') return true;
      if (field === 'apiKeyValue') return true;
    }
    return false;
  },
};
