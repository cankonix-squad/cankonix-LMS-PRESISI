import 'reflect-metadata';
import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import {
  AuthConfig,
  loadAuthConfig,
  resolveDocsEnabled,
} from './auth/auth.config';
import type { AuthIdentityResolver } from './auth/auth-identity.resolver';
import type { JwksProvider } from './auth/jwks.provider';
import type { PermissionEvaluator } from './authorization/permission-evaluator';

export type CreateAppOptions = {
  /** Defaults to configuration derived from the environment. */
  authConfig?: AuthConfig | null;
  /** Defaults to the Keycloak JWKS endpoint. Tests inject a local key set. */
  jwksProvider?: JwksProvider;
  /** Defaults to the Keycloak subject mapping. Tests inject an in-memory fake. */
  identityResolver?: AuthIdentityResolver;
  /**
   * Defaults to `RoleAssignmentsService`, which resolves Permission + Scope
   * from persisted role assignments. Tests may inject a deterministic evaluator;
   * it can only answer permission questions, never disable enforcement.
   */
  permissionEvaluator?: PermissionEvaluator;
  /** Defaults to enabled outside production. */
  docsEnabled?: boolean;
};

export async function createApp(options: CreateAppOptions = {}) {
  const env = process.env;
  const authConfig =
    options.authConfig !== undefined
      ? options.authConfig
      : resolveEnvironmentAuthConfig(env);
  const docsEnabled = options.docsEnabled ?? resolveDocsEnabled(env);

  const app = await NestFactory.create(
    AppModule.register({
      authConfig,
      jwksProvider: options.jwksProvider,
      identityResolver: options.identityResolver,
      permissionEvaluator: options.permissionEvaluator,
    }),
  );
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  if (docsEnabled) {
    const config = new DocumentBuilder()
      .setTitle('Lemdiklat Polri API')
      .setVersion('1')
      .addBearerAuth()
      .build();
    SwaggerModule.setup(
      'api/v1/docs',
      app,
      SwaggerModule.createDocument(app, config),
    );
  } else {
    new Logger('Bootstrap').log('OpenAPI documentation is disabled');
  }

  app.enableShutdownHooks();
  return app;
}

/**
 * Environment-derived authentication configuration.
 *
 * Authentication is never silently optional in production: a missing or partial
 * configuration is fatal there. Outside production a warning is logged and the
 * guard fails closed, so protected routes return 401 instead of allowing
 * anonymous access.
 */
function resolveEnvironmentAuthConfig(
  env: NodeJS.ProcessEnv,
): AuthConfig | null {
  const production = env.NODE_ENV === 'production';
  const { config, errors } = loadAuthConfig(env);
  const logger = new Logger('Bootstrap');

  if (!config) {
    const message =
      errors.length > 0
        ? `Invalid authentication configuration: ${errors.join('; ')}`
        : 'Authentication is not configured (KEYCLOAK_ISSUER, KEYCLOAK_AUDIENCE)';
    if (production) throw new Error(message);
    logger.warn(`${message}. Protected routes will return 401.`);
    return null;
  }

  return config;
}
