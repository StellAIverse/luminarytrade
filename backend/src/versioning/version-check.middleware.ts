import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import {
  API_VERSIONS,
  DEFAULT_API_VERSION,
  isVersionDeprecated,
  isVersionSunset,
} from './version.constants';

@Injectable()
export class VersionCheckMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    const version = this.resolveVersion(req.path);

    // Always add which version was resolved
    res.setHeader('X-Api-Version', version);

    // ── SUNSET → 410 Gone ─────────────────────────────────────────────────
    if (isVersionSunset(version)) {
      const config = API_VERSIONS[version];
      const sunsetDate = config?.sunsetAt ?? 'unknown';

      res.status(410).json({
        success: false,
        error: {
          code: 'API_VERSION_SUNSET',
          message: `API version ${version} has been permanently removed as of ${sunsetDate}.`,
          sunsetDate,
          migrationGuide: 'https://docs.luminarytrade.com/api/versioning',
          currentStableVersion: DEFAULT_API_VERSION,
          timestamp: new Date().toISOString(),
          path: req.path,
        },
      });
      return;
    }

    // ── DEPRECATED → warn headers, continue ───────────────────────────────
    if (isVersionDeprecated(version)) {
      const config = API_VERSIONS[version];

      if (config?.sunsetAt) {
        const sunsetRfc = new Date(config.sunsetAt).toUTCString();
        const deprecatedRfc = config.deprecatedAt
          ? new Date(config.deprecatedAt).toUTCString()
          : sunsetRfc;

        // Standard RFC 8594 headers
        res.setHeader('Sunset', sunsetRfc);
        res.setHeader('Deprecation', deprecatedRfc);

        // Informational headers for clients that read non-standard headers
        res.setHeader('X-Deprecated', 'true');
        res.setHeader('X-Sunset-Date', config.sunsetAt);
        res.setHeader('X-Api-Version-Status', 'deprecated');
        res.setHeader(
          'X-Deprecation-Info',
          'https://docs.luminarytrade.com/api/versioning#migration',
        );
        res.setHeader(
          'Link',
          `<https://docs.luminarytrade.com/api/versioning>; rel="deprecation"`,
        );
      }
    }

    // ── BETA → informational header ────────────────────────────────────────
    const config = API_VERSIONS[version];
    if (config?.status === 'BETA') {
      res.setHeader('X-Api-Version-Status', 'beta');
      res.setHeader(
        'X-Beta-Warning',
        'This API version is in beta. Breaking changes may occur before stable release.',
      );
    }

    next();
  }

  private resolveVersion(path: string): string {
    const match = path.match(/^\/v(\d+)\//);
    if (match) return match[1];
    const matchNoSlash = path.match(/^\/v(\d+)$/);
    if (matchNoSlash) return matchNoSlash[1];

    return DEFAULT_API_VERSION;
  }
}