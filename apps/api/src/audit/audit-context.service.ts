import { Injectable } from '@nestjs/common';
import { AsyncLocalStorage } from 'node:async_hooks';
import { AuditActor, AuditRequestContext } from './audit.types';

/** Everything an audit entry needs that is not supplied by the calling domain. */
export type AuditCallContext = AuditRequestContext & {
  actor: AuditActor;
};

const ANONYMOUS_ACTOR: AuditActor = {
  userAccountId: null,
};

/**
 * Carries the provenance of an audited action to the audit service.
 *
 * A mutation deep inside a domain service has no direct access to the HTTP
 * request, and threading an `ipAddress`/`userAgent`/actor triple (or worse, the
 * whole `Request`) through every service, mapper, and transaction boundary would
 * make the audit requirement leak into unrelated signatures.
 *
 * Instead the context is carried implicitly, the same way a trace context
 * propagates. Every domain service's call to `audit.record(...)` then stays free
 * of transport concerns and cannot forget to pass an actor.
 *
 * Scope boundaries: Node's `AsyncLocalStorage` follows the async continuation, so
 * a value stored for one request can never be observed by another. Code that
 * deliberately escapes the request's async context — a cron job, a queue worker,
 * or a detached callback outside the request chain — legitimately reads no
 * context and records an anonymous, IP-less entry, which is the honest outcome.
 */
@Injectable()
export class AuditContextService {
  private readonly storage = new AsyncLocalStorage<AuditCallContext>();

  /** Runs `callback` with `context` visible to every nested audit call. */
  run<T>(context: AuditCallContext, callback: () => T): T {
    return this.storage.run(context, callback);
  }

  /**
   * The context of the request currently being handled, or `null` outside an
   * HTTP request (startup, background jobs, tests calling a service directly).
   */
  getContext(): AuditCallContext | null {
    return this.storage.getStore() ?? null;
  }

  /**
   * The actor performing the current action.
   *
   * Returns an all-`null` actor when there is no context, so a domain service
   * never has to null-check before recording. `null` means "the system did this,
   * not a signed-in user", which is exactly what should be stored.
   */
  getActor(): AuditActor {
    return this.storage.getStore()?.actor ?? ANONYMOUS_ACTOR;
  }

  /** The request provenance of the current action, or `null` outside a request. */
  getRequestContext(): AuditRequestContext | null {
    const store = this.storage.getStore();
    if (!store) return null;
    return { ipAddress: store.ipAddress, userAgent: store.userAgent };
  }
}
