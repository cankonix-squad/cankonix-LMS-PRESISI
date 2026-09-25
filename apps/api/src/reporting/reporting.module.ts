import { DynamicModule, Module, Provider } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { OrganizationsModule } from '../organizations/organizations.module';
import { PrismaModule } from '../prisma/prisma.module';
import { DrilldownController } from './drilldown.controller';
import { DrilldownService } from './drilldown.service';
import { PrismaDrilldownRepository } from './drilldown.repository';
import { ExecutiveReportingController } from './executive-reporting.controller';
import { ExecutiveReportingService } from './executive-reporting.service';
import { GraduationTrendController } from './graduation-trend.controller';
import { GraduationTrendService } from './graduation-trend.service';
import { KpiController } from './kpi.controller';
import { KpiService } from './kpi.service';
import {
  EXECUTIVE_PERMISSION_SOURCE,
  EXECUTIVE_SCOPE_GRANT_RESOLVER,
  ExecutivePermissionSource,
  ExecutiveScopeGrantResolver,
  ExecutiveScopeResolver,
} from './executive-scope.resolver';
import { ReportingController } from './reporting.controller';
import { PrismaReportingRepository } from './reporting.repository';
import { ReportingService } from './reporting.service';
import { REPORTING_REPOSITORY } from './reporting.types';
import { DRILLDOWN_REPOSITORY } from './reporting.types';

/**
 * What the composition root may inject into the reporting module.
 *
 * Everything is optional: with no options the module wires its own production
 * defaults, so `ReportingModule.register()` is a complete installation.
 */
export interface ReportingModuleOptions {
  /**
   * Where the default scope resolver reads a caller's scopes from. In production
   * this is the authorization module's evaluator; in tests it is a fixture.
   */
  executivePermissionSource?: ExecutivePermissionSource;
  /**
   * Replaces the whole scope resolver. Used by tests to state a grant directly
   * instead of reproducing the permission tables.
   */
  executiveScopeGrantResolver?: ExecutiveScopeGrantResolver;
}

/**
 * Reporting module (TASK-060, extended by TASK-061 and TASK-062).
 *
 * The repository is bound to the `REPORTING_REPOSITORY` token rather than the
 * concrete class so the service depends on the contract, which is what lets the
 * aggregation behaviour be tested without a database. The drill-down repository is
 * bound the same way and for the same reason: its contract is the four hierarchy
 * questions the walk asks, and a fake that answers them is a complete stand-in for
 * the database.
 *
 * ## Why a dynamic module
 *
 * The scope resolver has a single dependency — where a caller's scopes come from
 * — and that is the one thing the module cannot decide for itself:
 *
 * - in production the scopes live in the authorization tables, so the composition
 *   root passes the evaluator in;
 * - in a test the scopes are fixtures, so the composition root passes a stub in.
 *
 * Keeping that as an injected option means the *production* wiring is the path
 * under test, rather than a test-only module that could drift from it. When no
 * source is supplied the resolver is still constructed but has nothing to read,
 * and every caller resolves to an empty grant — which is a denial, not an
 * opening, so a missing binding cannot leak data.
 *
 * `organizations` is imported because scope expansion walks the organization
 * tree to its descendants.
 */
@Module({})
export class ReportingModule {
  static register(options: ReportingModuleOptions = {}): DynamicModule {
    const providers: Provider[] = [
      ReportingService,
      ExecutiveReportingService,
      GraduationTrendService,
      KpiService,
      DrilldownService,
      {
        provide: REPORTING_REPOSITORY,
        useClass: PrismaReportingRepository,
      },
      {
        provide: DRILLDOWN_REPOSITORY,
        useClass: PrismaDrilldownRepository,
      },
    ];

    if (options.executiveScopeGrantResolver) {
      providers.push({
        provide: EXECUTIVE_SCOPE_GRANT_RESOLVER,
        useValue: options.executiveScopeGrantResolver,
      });
    } else {
      providers.push(
        {
          provide: EXECUTIVE_PERMISSION_SOURCE,
          useValue: options.executivePermissionSource ?? null,
        },
        ExecutiveScopeResolver,
        {
          provide: EXECUTIVE_SCOPE_GRANT_RESOLVER,
          useExisting: ExecutiveScopeResolver,
        },
      );
    }

    return {
      module: ReportingModule,
      imports: [PrismaModule, AuditModule, OrganizationsModule],
      controllers: [
        ReportingController,
        ExecutiveReportingController,
        GraduationTrendController,
        KpiController,
        DrilldownController,
      ],
      providers,
      // TASK-062 onward consume reporting through these services, so the read
      // model keeps exactly one writer and the boundary TASK-060 drew stays
      // intact. The repositories are deliberately not exported: nothing outside
      // this module may read `reporting_metrics` directly.
      exports: [
        ReportingService,
        ExecutiveReportingService,
        GraduationTrendService,
        KpiService,
        DrilldownService,
      ],
    };
  }
}
