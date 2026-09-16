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
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { ListOrganizationsQueryDto } from './dto/list-organizations-query.dto';
import {
  OrganizationListResponseDto,
  OrganizationResponseDto,
  OrganizationTreeResponseDto,
} from './dto/organization-response.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { OrganizationsService } from './organizations.service';

@ApiTags('organizations')
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
