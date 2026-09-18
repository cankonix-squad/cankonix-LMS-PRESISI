import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { AllowAuthenticated } from '../authorization/authorization.decorators';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { ListOrganizationsQueryDto } from './dto/list-organizations-query.dto';
import {
  OrganizationListResponseDto,
  OrganizationResponseDto,
  OrganizationTreeResponseDto,
} from './dto/organization-response.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { OrganizationsService } from './organizations.service';

/**
 * Organization master data (TASK-001 foundation).
 *
 * These routes are explicitly allow-listed for authenticated callers so the
 * fail-closed `PermissionGuard` has an auditable decision instead of silently
 * granting access. The permission vocabulary for this domain is owned by the
 * task that owns the module and must replace this allow-list before production
 * readiness; until then the route is no more permissive than the reviewed
 * TASK-001 baseline (authentication only).
 */
@ApiTags('organizations')
@AllowAuthenticated()
@Controller('organizations')
export class OrganizationsController {
  constructor(private readonly organizations: OrganizationsService) {}

  @Post()
  @ApiCreatedResponse({ type: OrganizationResponseDto })
  create(@Body() dto: CreateOrganizationDto): Promise<OrganizationResponseDto> {
    return this.organizations.create(dto);
  }

  @Get()
  @ApiOkResponse({ type: OrganizationListResponseDto })
  list(
    @Query() query: ListOrganizationsQueryDto,
  ): Promise<OrganizationListResponseDto> {
    return this.organizations.list(query);
  }

  @Get(':id/children')
  @ApiOkResponse({ type: [OrganizationResponseDto] })
  children(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<OrganizationResponseDto[]> {
    return this.organizations.children(id);
  }

  @Get(':id/tree')
  @ApiOkResponse({ type: OrganizationTreeResponseDto })
  tree(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<OrganizationTreeResponseDto> {
    return this.organizations.tree(id);
  }

  @Get(':id')
  @ApiOkResponse({ type: OrganizationResponseDto })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<OrganizationResponseDto> {
    return this.organizations.findOne(id);
  }

  @Patch(':id')
  @ApiOkResponse({ type: OrganizationResponseDto })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateOrganizationDto,
  ): Promise<OrganizationResponseDto> {
    return this.organizations.update(id, dto);
  }
}
