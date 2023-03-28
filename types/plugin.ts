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
