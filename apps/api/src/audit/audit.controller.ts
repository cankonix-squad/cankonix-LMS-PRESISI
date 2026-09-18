import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import {
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { RequirePermissions } from '../authorization/authorization.decorators';
import { AUDIT_PERMISSIONS } from './audit-permissions';
import { AuditService } from './audit.service';
import {
  AuditLogListResponseDto,
  AuditLogResponseDto,
} from './dto/audit-log-response.dto';
import { ListAuditLogsQueryDto } from './dto/list-audit-logs-query.dto';

/**
 * Read-only audit trail endpoints (TASK-006).
 *
 * Deliberately read-only. There is no POST, PATCH, or DELETE: entries are written
 * by the application services that perform the audited mutation, so a client can
 * never author or alter history. Exposing an append endpoint would let a caller
 * create entries that attribute an action to a different actor, and exposing an
 * update or delete endpoint would defeat the point of an audit trail entirely.
 *
 * Both routes require `audit.log.read`. The fail-closed global `PermissionGuard`
 * would reject them anyway if the decorator were missing, but the explicit policy
 * documents the boundary and keeps the route out of the anonymous allow-list.
 */
@ApiTags('audit')
@ApiUnauthorizedResponse({
  description: 'Missing, invalid, expired or unmapped access token.',
})
@ApiForbiddenResponse({
  description: 'Authenticated caller without `audit.log.read`.',
})
@Controller('audit-logs')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @RequirePermissions(AUDIT_PERMISSIONS.READ)
  @ApiOkResponse({ type: AuditLogListResponseDto })
  list(
    @Query() query: ListAuditLogsQueryDto,
  ): Promise<AuditLogListResponseDto> {
    return this.auditService.search(query);
  }

  @Get(':id')
  @RequirePermissions(AUDIT_PERMISSIONS.READ)
  @ApiOkResponse({ type: AuditLogResponseDto })
  @ApiNotFoundResponse({ description: 'No audit entry with that id.' })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<AuditLogResponseDto> {
    return this.auditService.findOne(id);
  }
}
