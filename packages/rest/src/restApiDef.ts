export interface RestApiParameter {
  name: string;
  in: 'query' | 'header' | 'path' | 'cookie' | 'body';
  dataType?: string;
  contentType?: string;
  isStringList?: boolean;
  description?: string;
  required?: boolean;
  defaultValue?: any;
  options?: Array<{ label: string; value: string }>;
  odataLookupPath?: string;
  odataLookupEntitySet?: string;
  odataLookupValueField?: string;
  odataLookupLabelField?: string;
}

export interface RestApiEndpoint {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'OPTIONS' | 'HEAD';
  path: string;
  summary?: string;
  description?: string;
  parameters: RestApiParameter[];
}

export interface RestApiCategory {
  name: string;
  endpoints: RestApiEndpoint[];
}

export interface RestApiServer {
  url: string;
  description?: string;
}

export interface RestApiDefinition {
  categories: RestApiCategory[];
  servers?: RestApiServer[];
}

export interface RestApiAuthorization_None {
  type: 'none';
}

export interface RestApiAuthorization_Basic {
  type: 'basic';
  user: string;
  password: string;
}

export interface RestApiAuthorization_Bearer {
  type: 'bearer';
  token: string;
}

export interface RestApiAuthorization_ApiKey {
  type: 'apikey';
  header: string;
  value: string;
}

export type RestApiAuthorization =
  | RestApiAuthorization_None
  | RestApiAuthorization_Basic
  | RestApiAuthorization_Bearer
  | RestApiAuthorization_ApiKey;
