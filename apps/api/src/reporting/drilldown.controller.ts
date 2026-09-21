import { Controller, Get, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../auth/auth.decorators';
import { AuthenticatedPrincipal } from '../auth/auth.types';
import { RequirePermissions } from '../authorization/authorization.decorators';
import { DrilldownService } from './drilldown.service';
import { DrilldownQueryDto } from './dto/drilldown-query.dto';
import { DrilldownListResponseDto } from './dto/drilldown-response.dto';
import { REPORTING_PERMISSIONS } from './reporting-permissions';

/**
 * The hierarchical drill-down (TASK-062).
 *
 * ## Why this is one route and not a route per level
 *
 * The spec allows either. One generic route wins on the requirement that matters
 * most here — "every transition validates parent-child relationship and user
 * scope". A route per level means the parent-child rule is re-stated at seven call
 * sites, and the eighth level added later gets an eighth, and the one that forgets
 * is a data leak that no test of the *other* six routes would catch. Here there is
 * one entry point and therefore one place the rule can be wrong.
 *
 * ## Why it sits under the executive reporting path
 *
 * The walk reads the same read models the executive overview reads and answers the
 * same kind of question one level down, so it is granted by the same permission.
 * Splitting the permission would let someone be allowed to see an institution's
 * totals but not the programs those totals were summed from, which is a distinction
 * with no meaning: the programs are the totals.
 *
 * ## Why the caller's identity is the account id
 *
 * `AuthenticatedPrincipal.accountId` is the user id that the scope grants are
 * written against, so it is what the resolver needs. `personId` would resolve to a
 * person, and a person has no grants of their own — access belongs to the account.
 */
@ApiTags('reporting')
@ApiBearerAuth()
@Controller('reporting/executive/drilldown')
export class DrilldownController {
  constructor(private readonly service: DrilldownService) {}

  @Get()
  @RequirePermissions(REPORTING_PERMISSIONS.EXECUTIVE_READ)
  @ApiOperation({
    summary: 'Fetch one level of the institution hierarchy',
    description:
      'Returns the children of `parentId` at the requested `level`. The parent level is derived from `level`, so a request can never name a combination the hierarchy does not define. Omit `parentId` only for the root level, where it means "the institutions this caller may enter".',
  })
  @ApiOkResponse({ type: DrilldownListResponseDto })
  list(
    @CurrentUser() user: AuthenticatedPrincipal,
    @Query() query: DrilldownQueryDto,
  ): Promise<DrilldownListResponseDto> {
    return this.service.list(user.accountId, query);
  }
}
