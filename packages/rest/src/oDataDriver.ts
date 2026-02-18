import type { EngineDriver } from 'dbgate-types';
import { buildRestAuthHeaders } from './restAuthTools';
import { apiDriverBase } from './restDriverBase';

function resolveServiceRoot(contextUrl: string | undefined, fallbackUrl: string): string {
  const safeFallback = String(fallbackUrl ?? '').trim();

  if (typeof contextUrl === 'string' && contextUrl.trim()) {
    try {
      const resolved = new URL(contextUrl.trim(), safeFallback || undefined);
      resolved.hash = '';
      resolved.search = '';
      resolved.pathname = resolved.pathname.replace(/\/$metadata$/i, '');

      const url = resolved.toString();
      return url.endsWith('/') ? url : `${url}/`;
    } catch {
      // ignore, fallback below
    }
  }

  return safeFallback.endsWith('/') ? safeFallback : `${safeFallback}/`;
}

async function loadODataServiceDocument(dbhan: any) {
  if (!dbhan?.connection?.apiServerUrl1) {
    throw new Error('DBGM-00000 OData endpoint URL is not configured');
  }

  const response = await dbhan.axios.get(dbhan.connection.apiServerUrl1, {
    headers: buildRestAuthHeaders(dbhan.connection.restAuth),
  });

  const document = response?.data;
  if (!document || typeof document !== 'object') {
    throw new Error('DBGM-00000 OData service document is empty or invalid');
  }

  if (!document['@odata.context']) {
    throw new Error('DBGM-00000 OData service document does not contain @odata.context');
  }

  return document;
}

function getODataVersion(document: any): string {
  const contextUrl = String(document?.['@odata.context'] ?? '').trim();
  const versionMatch = contextUrl.match(/\/v(\d+(?:\.\d+)*)\/$metadata$/i);
  if (versionMatch?.[1]) return versionMatch[1];
  return '';
}

// @ts-ignore
export const oDataDriver: EngineDriver = {
  ...apiDriverBase,
  engine: 'odata@rest',
  title: 'OData - REST (experimental)',
  databaseEngineTypes: ['rest', 'odata'],
  icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128"><rect width="128" height="128" fill="#f9a000"/><rect x="12" y="12" width="47" height="12" fill="#ffffff"/><rect x="69" y="12" width="47" height="12" fill="#ffffff"/><rect x="12" y="37" width="47" height="12" fill="#ffffff"/><rect x="69" y="37" width="47" height="12" fill="#ffffff"/><rect x="12" y="62" width="47" height="12" fill="#ffffff"/><rect x="69" y="62" width="47" height="12" fill="#ffffff"/><rect x="69" y="87" width="47" height="12" fill="#ffffff"/><circle cx="35" cy="102" r="20" fill="#e6e6e6"/></svg>',
  apiServerUrl1Label: 'OData Service URL',

  showConnectionField: (field, values) => {
    if (apiDriverBase.showAuthConnectionField(field, values)) return true;
    if (field === 'apiServerUrl1') return true;
    return false;
  },

  beforeConnectionSave: connection => ({
    ...connection,
    singleDatabase: true,
    defaultDatabase: '_api_database_',
  }),

  async connect(connection: any) {
    return {
      connection,
      client: null,
      database: '_api_database_',
      axios: connection.axios,
    };
  },

  async getVersion(dbhan: any) {
    const document = await loadODataServiceDocument(dbhan);
    const resourcesCount = Array.isArray(document?.value) ? document.value.length : 0;
    const odataVersion = getODataVersion(document);

    return {
      version: odataVersion || 'OData',
      versionText: `OData${odataVersion ? ` ${odataVersion}` : ''}, ${resourcesCount} resources`,
    };
  },
};
