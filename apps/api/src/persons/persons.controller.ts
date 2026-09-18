import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AllowAuthenticated } from '../authorization/authorization.decorators';
import { CreatePersonDto } from './dto/create-person.dto';
import { CreatePersonOrganizationDto } from './dto/create-person-organization.dto';
import { EndPersonOrganizationDto } from './dto/end-person-organization.dto';
import { ListPersonsQueryDto } from './dto/list-persons-query.dto';
import { PersonOrganizationResponseDto } from './dto/person-organization-response.dto';
import {
  PersonListResponseDto,
  PersonResponseDto,
} from './dto/person-response.dto';
import { UpdatePersonDto } from './dto/update-person.dto';
import { PersonsService } from './persons.service';

/**
 * Person records and placements (TASK-002 foundation).
 *
 * Explicitly allow-listed for authenticated callers: the fail-closed
 * `PermissionGuard` needs an auditable decision per route, and this module's
 * permission vocabulary is owned by the task that owns the module. Replace this
 * allow-list with `@RequirePermissions(...)` before production readiness.
 */
@ApiTags('persons')
@AllowAuthenticated()
@Controller('persons')
export class PersonsController {
  constructor(private readonly persons: PersonsService) {}

  @Post()
  @ApiCreatedResponse({ type: PersonResponseDto })
  create(@Body() dto: CreatePersonDto): Promise<PersonResponseDto> {
    return this.persons.create(dto);
  }

  @Get()
  @ApiOkResponse({ type: PersonListResponseDto })
  list(@Query() query: ListPersonsQueryDto): Promise<PersonListResponseDto> {
    return this.persons.list(query);
  }

  @Get(':id/organizations')
  @ApiOkResponse({ type: [PersonOrganizationResponseDto] })
  listPlacements(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<PersonOrganizationResponseDto[]> {
    return this.persons.listPlacements(id);
  }

  @Post(':id/organizations')
  @ApiCreatedResponse({ type: PersonOrganizationResponseDto })
  assignPlacement(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreatePersonOrganizationDto,
  ): Promise<PersonOrganizationResponseDto> {
    return this.persons.assignPlacement(id, dto);
  }

  @Patch(':id/organizations/:placementId/end')
  @ApiOkResponse({ type: PersonOrganizationResponseDto })
  endPlacement(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('placementId', ParseUUIDPipe) placementId: string,
    @Body() dto: EndPersonOrganizationDto,
  ): Promise<PersonOrganizationResponseDto> {
    return this.persons.endPlacement(id, placementId, dto);
  }

  @Get(':id')
  @ApiOkResponse({ type: PersonResponseDto })
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<PersonResponseDto> {
    return this.persons.findOne(id);
  }

  @Patch(':id')
  @ApiOkResponse({ type: PersonResponseDto })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePersonDto,
  ): Promise<PersonResponseDto> {
    return this.persons.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse({
    description:
      'Soft deactivation: the person is retained as INACTIVE to preserve history.',
  })
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.persons.deactivate(id);
  }
}
