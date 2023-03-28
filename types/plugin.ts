export interface Plugin {
  id: string;
  name: string;
  manifest: PluginManifest;
}

type ManifestAuthType = 'none' | 'user_http' | 'service_http' | 'oauth';

interface BaseManifestAuth {
  type: ManifestAuthType;
  instructions: string;
}

interface ManifestNoAuth extends BaseManifestAuth {
  type: 'none';
}

interface ManifestServiceHttpAuth extends BaseManifestAuth {
  type: 'service_http';
  httpAuthorizationType: 'basic' | 'bearer';
}

interface ManifestUserHttpAuth extends BaseManifestAuth {
  type: 'user_http';
  httpAuthorizationType: 'basic' | 'bearer';
}

interface ManifestOAuthAuth extends BaseManifestAuth {
  type: 'oauth';
  authorizationUrl: string;
  tokenUrl: string;
  scopes: string[];
}

type ManifestAuth =
  | ManifestNoAuth
  | ManifestServiceHttpAuth
  | ManifestUserHttpAuth
  | ManifestOAuthAuth;

interface OpenApiSpecification {}

interface PluginManifest {
  schema_version: string;
  name_for_model: string;
  name_for_human: string;
  description_for_model: string;
  description_for_human: string;
  auth: ManifestAuth;
  api: OpenApiSpecification;
  logo_url: string;
  contact_email: string;
  legal_info_url: string;
}

export const dummyPlugins = [
  {
    id: '1',
    name: 'plugin1',
    manifest: {
      schema_version: '1.0.0',
      name_for_model: 'plugin1',
      name_for_human: 'Plugin 1',
      description_for_model: 'plugin1',
      description_for_human: 'Plugin 1',
      auth: {
        type: 'none',
        instructions: 'No auth',
      },
      api: {},
      logo_url: 'https://via.placeholder.com/150',
      contact_email: '',
      legal_info_url: 'https://via.placeholder.com/150',
    },
  },
  {
    id: '2',
    name: 'plugin2',
    manifest: {
      schema_version: '1.0.0',
      name_for_model: 'plugin2',
      name_for_human: 'Plugin 2',
      description_for_model: 'plugin2',
      description_for_human: 'Plugin 2',
      auth: {
        type: 'service_http',
        instructions: 'Service HTTP auth',
        httpAuthorizationType: 'basic',
      },
      api: {},
      logo_url: 'https://via.placeholder.com/150',
      contact_email: '',
      legal_info_url: 'https://via.placeholder.com/150',
    },
  },
];
