import { Version, applyDecorators } from '@nestjs/common';
import { ApiHeader, ApiOperation } from '@nestjs/swagger';
import { API_VERSIONS, VersionStatus } from './version.constants';

export function ApiVersion(version: keyof typeof API_VERSIONS) {
  const config = API_VERSIONS[version];
  const isDeprecated = config?.status === 'DEPRECATED' || config?.status === 'SUNSET';

  const decorators = [
    // NestJS built-in — wires URL prefix /v{version}/
    Version(String(version)),
  ];

  // Add Swagger documentation if available
  if (config) {
    // Mark deprecated endpoints in Swagger UI
    if (isDeprecated && config.sunsetAt) {
      decorators.push(
        ApiHeader({
          name: 'X-Deprecated',
          description: `This API version is deprecated and will be removed on ${config.sunsetAt}`,
          required: false,
        }),
        ApiHeader({
          name: 'X-Sunset-Date',
          description: `Sunset date: ${config.sunsetAt}`,
          required: false,
        }),
      );
    }
  }

  return applyDecorators(...decorators);
}

export function VersionedEndpoint(options: {
  version: keyof typeof API_VERSIONS;
  summary?: string;
  notes?: string;
}) {
  const config = API_VERSIONS[options.version];
  const status: VersionStatus = config?.status ?? 'STABLE';

  const statusBadge: Record<VersionStatus, string> = {
    BETA: 'BETA',
    STABLE: 'STABLE',
    DEPRECATED: 'DEPRECATED',
    SUNSET: 'SUNSET',
  };

  const summary = [
    statusBadge[status],
    options.summary ?? '',
  ].filter(Boolean).join(' — ');

  const description = [
    options.notes,
    config?.status === 'DEPRECATED' || config?.status === 'SUNSET'
      ? `**Removal date:** ${config?.sunsetAt ?? 'TBD'}. See [migration guide](../docs/VERSIONING.md).`
      : undefined,
  ].filter(Boolean).join('\n\n');

  return applyDecorators(
    Version(String(options.version)),
    ApiOperation({ summary, description }),
  );
}