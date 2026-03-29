export type VersionStatus = 'BETA' | 'STABLE' | 'DEPRECATED' | 'SUNSET';

export interface ApiVersionConfig {
  version: string;
  status: VersionStatus;
  releasedAt: string;
  deprecatedAt?: string;
  sunsetAt?: string;
  changelog: string;
}

export const API_VERSIONS: Record<string, ApiVersionConfig> = {
  '0': {
    version: '0',
    status: 'SUNSET',
    releasedAt: '2023-01-01',
    deprecatedAt: '2024-01-01',
    sunsetAt: '2024-07-01',
    changelog: 'Original release. Superseded by v1 with improved error shapes and pagination.',
  },
  '1': {
    version: '1',
    status: 'STABLE',
    releasedAt: '2024-01-01',
    changelog: 'Stable release. Standardised error envelope, cursor-based pagination, ' +
               'JWT authentication, Stellar transaction support.',
  },

  '2': {
    version: '2',
    status: 'BETA',
    releasedAt: '2025-01-01',
    changelog: 'Beta release. GraphQL endpoints, streaming support, ' +
               'renamed fields (walletAddress → address), improved pagination.',
  },
} as const;

export const DEFAULT_API_VERSION = '1';

export const SUPPORTED_VERSIONS = Object.values(API_VERSIONS)
  .filter((v) => v.status !== 'SUNSET')
  .map((v) => v.version);

export function isVersionSunset(versionKey: string): boolean {
  const config = API_VERSIONS[versionKey];
  if (!config) return true; // unknown version = treat as sunset
  if (config.status === 'SUNSET') return true;
  if (config.sunsetAt && new Date() > new Date(config.sunsetAt)) return true;
  return false;
}

export function isVersionDeprecated(versionKey: string): boolean {
    const config = API_VERSIONS[versionKey];
    if (!config) return false;
    if (config.status === 'DEPRECATED') return true;
    if (config.status === 'SUNSET') return false;
    return false;
}   