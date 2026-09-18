import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AUDIT_ACTIONS, AUDIT_RESOURCE_TYPES } from '../audit/audit-actions';
import { AuditService } from '../audit/audit.service';
import { OrganizationsService } from '../organizations/organizations.service';
import { CreatePersonDto } from './dto/create-person.dto';
import { CreatePersonOrganizationDto } from './dto/create-person-organization.dto';
import { EndPersonOrganizationDto } from './dto/end-person-organization.dto';
import { ListPersonsQueryDto } from './dto/list-persons-query.dto';
import { PersonOrganizationResponseDto } from './dto/person-organization-response.dto';
import {
  PersonListResponseDto,
  PersonResponseDto,
} from './dto/person-response.dto';
import { PersonStatusDto } from './dto/person-status.dto';
import { UpdatePersonDto } from './dto/update-person.dto';
import {
  PersonOrganizationRecord,
  PersonRecord,
  PersonUpdateData,
} from './person.types';
import { PERSONS_REPOSITORY, PersonsRepository } from './persons.repository';

@Injectable()
export class PersonsService {
  constructor(
    @Inject(PERSONS_REPOSITORY)
    private readonly persons: PersonsRepository,
    private readonly organizations: OrganizationsService,
    private readonly audit: AuditService,
  ) {}

  async create(dto: CreatePersonDto): Promise<PersonResponseDto> {
    const personnelNumber = normalizePersonnelNumber(dto.personnelNumber);
    await this.ensurePersonnelNumberAvailable(personnelNumber);
    const created = await this.persons.create({
      personnelNumber,
      fullName: dto.fullName.trim(),
      rank: dto.rank?.trim() || null,
      title: dto.title?.trim() || null,
      email: dto.email?.trim().toLowerCase() || null,
      phone: dto.phone?.trim() || null,
      status: dto.status ?? PersonStatusDto.ACTIVE,
      metadata: dto.metadata ?? null,
    });

    await this.audit.record({
      action: AUDIT_ACTIONS.PERSON_CREATED,
      resourceType: AUDIT_RESOURCE_TYPES.PERSON,
      resourceId: created.id,
      after: personSnapshot(created),
    });

    return toPersonResponse(created);
  }

  async list(query: ListPersonsQueryDto): Promise<PersonListResponseDto> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const result = await this.persons.list({
      search: query.search?.trim() || undefined,
      status: query.status,
      page,
      limit,
    });
    return {
      data: result.data.map(toPersonResponse),
      page,
      limit,
      total: result.total,
    };
  }

  async findOne(id: string): Promise<PersonResponseDto> {
    return toPersonResponse(await this.findPersonOrFail(id));
  }

  async update(id: string, dto: UpdatePersonDto): Promise<PersonResponseDto> {
    const existing = await this.findPersonOrFail(id);
    const data: PersonUpdateData = {};
    if (dto.personnelNumber !== undefined) {
      const personnelNumber = normalizePersonnelNumber(dto.personnelNumber);
      await this.ensurePersonnelNumberAvailable(personnelNumber, id);
      data.personnelNumber = personnelNumber;
    }
    if (dto.fullName !== undefined) data.fullName = dto.fullName.trim();
    if (dto.rank !== undefined) data.rank = dto.rank?.trim() || null;
    if (dto.title !== undefined) data.title = dto.title?.trim() || null;
    if (dto.email !== undefined) {
      data.email = dto.email?.trim().toLowerCase() || null;
    }
    if (dto.phone !== undefined) data.phone = dto.phone?.trim() || null;
    if (dto.status !== undefined) data.status = dto.status;
    if (dto.metadata !== undefined) data.metadata = dto.metadata;

    const updated = await this.persons.update(id, data);

    await this.audit.record({
      action: AUDIT_ACTIONS.PERSON_UPDATED,
      resourceType: AUDIT_RESOURCE_TYPES.PERSON,
      resourceId: updated.id,
      before: personSnapshot(existing),
      after: personSnapshot(updated),
      metadata: { changedFields: Object.keys(data).sort() },
    });

    return toPersonResponse(updated);
  }

  /**
   * Soft deactivation only. Persons are referenced by placements, user accounts
   * and later education history, so TASK-002 never hard deletes a person.
   *
   * Deactivation is an identity lifecycle event, so it gets its own audit action
   * rather than being folded into `person.updated`: "this account was switched
   * off, and by whom" is a question that must not require diffing snapshots.
   */
  async deactivate(id: string): Promise<void> {
    const existing = await this.findPersonOrFail(id);
    const updated = await this.persons.update(id, {
      status: PersonStatusDto.INACTIVE,
    });

    await this.audit.record({
      action: AUDIT_ACTIONS.PERSON_DEACTIVATED,
      resourceType: AUDIT_RESOURCE_TYPES.PERSON,
      resourceId: id,
      before: personSnapshot(existing),
      after: personSnapshot(updated),
    });
  }

  async listPlacements(
    personId: string,
  ): Promise<PersonOrganizationResponseDto[]> {
    await this.findPersonOrFail(personId);
    const placements = await this.persons.findPlacementsByPerson(personId);
    return placements.map(toPlacementResponse);
  }

  async assignPlacement(
    personId: string,
    dto: CreatePersonOrganizationDto,
  ): Promise<PersonOrganizationResponseDto> {
    await this.findPersonOrFail(personId);
    await this.organizations.findOne(dto.organizationId);

    const startDate = dto.startDate ? toDateOnly(dto.startDate) : todayUtc();
    const isPrimary = dto.isPrimary ?? false;

    const created = await this.persons.withTransaction(async (repository) => {
      if (isPrimary) {
        const activePrimaries =
          await repository.findActivePrimaryPlacements(personId);
        for (const active of activePrimaries) {
          if (active.startDate.getTime() > startDate.getTime()) {
            throw new BadRequestException(
              'Primary placement start date cannot precede the active primary placement start date',
            );
          }
          await repository.endPlacement(active.id, startDate);
        }
      }
      return await repository.createPlacement({
        personId,
        organizationId: dto.organizationId,
        positionName: dto.positionName?.trim() || null,
        startDate,
        endDate: null,
        isPrimary,
      });
    });

    // Placement is the person's relationship to an organization, so the entry is
    // scoped to that organization: it makes "who has been posted here" a direct
    // audit query instead of a join across the person domain.
    await this.audit.record({
      action: AUDIT_ACTIONS.PERSON_PLACEMENT_ASSIGNED,
      resourceType: AUDIT_RESOURCE_TYPES.PERSON_ORGANIZATION,
      resourceId: created.id,
      organizationId: created.organizationId,
      after: placementSnapshot(created),
      metadata: { personId, isPrimary },
    });

    return toPlacementResponse(created);
  }

  async endPlacement(
    personId: string,
    placementId: string,
    dto: EndPersonOrganizationDto,
  ): Promise<PersonOrganizationResponseDto> {
    await this.findPersonOrFail(personId);
    const placement = await this.persons.findPlacementById(placementId);
    if (!placement || placement.personId !== personId) {
      throw new NotFoundException('Person organization placement not found');
    }
    if (placement.endDate) {
      throw new BadRequestException('Placement has already ended');
    }
    const endDate = dto.endDate ? toDateOnly(dto.endDate) : todayUtc();
    if (endDate.getTime() < placement.startDate.getTime()) {
      throw new BadRequestException(
        'Placement end date cannot precede its start date',
      );
    }
    const ended = await this.persons.endPlacement(placementId, endDate);

    await this.audit.record({
      action: AUDIT_ACTIONS.PERSON_PLACEMENT_ENDED,
      resourceType: AUDIT_RESOURCE_TYPES.PERSON_ORGANIZATION,
      resourceId: ended.id,
      organizationId: ended.organizationId,
      before: placementSnapshot(placement),
      after: placementSnapshot(ended),
      metadata: { personId },
    });

    return toPlacementResponse(ended);
  }

  /**
   * Non-throwing lookup used by other modules (for example authentication) that
   * need a person reference without HTTP semantics.
   */
  findPersonById(id: string): Promise<PersonRecord | null> {
    return this.persons.findById(id);
  }

  /** Used by other modules that need a person reference without HTTP concerns. */
  async findPersonOrFail(id: string): Promise<PersonRecord> {
    const person = await this.persons.findById(id);
    if (!person) throw new NotFoundException('Person not found');
    return person;
  }

  private async ensurePersonnelNumberAvailable(
    personnelNumber: string,
    currentId?: string,
  ): Promise<void> {
    const existing = await this.persons.findByPersonnelNumber(personnelNumber);
    if (existing && existing.id !== currentId) {
      throw new ConflictException('Personnel number already exists');
    }
  }
}

function normalizePersonnelNumber(value: string): string {
  const normalized = value.trim().toUpperCase();
  if (!normalized) {
    throw new BadRequestException('Personnel number is required');
  }
  return normalized;
}

function toDateOnly(value: string): Date {
  const parsed = new Date(`${value.slice(0, 10)}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) {
    throw new BadRequestException('Invalid date value');
  }
  return parsed;
}

function todayUtc(): Date {
  const now = new Date();
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
}

function toDateString(value: Date): string {
  return value.toISOString().slice(0, 10);
}

/**
 * Audit snapshot of a person.
 *
 * `metadata` is included because it is caller-supplied and therefore exactly the
 * kind of free-form payload that must be redacted before it is persisted.
 */
function personSnapshot(person: PersonRecord): Record<string, unknown> {
  return {
    id: person.id,
    personnelNumber: person.personnelNumber,
    fullName: person.fullName,
    rank: person.rank,
    title: person.title,
    email: person.email,
    phone: person.phone,
    status: person.status,
    metadata: person.metadata,
  };
}

/** Audit snapshot of a placement, with dates rendered as ISO date strings. */
function placementSnapshot(
  placement: PersonOrganizationRecord,
): Record<string, unknown> {
  return {
    id: placement.id,
    personId: placement.personId,
    organizationId: placement.organizationId,
    positionName: placement.positionName,
    startDate: placement.startDate?.toISOString() ?? null,
    endDate: placement.endDate?.toISOString() ?? null,
    isPrimary: placement.isPrimary,
  };
}

function toPersonResponse(person: PersonRecord): PersonResponseDto {
  return {
    id: person.id,
    personnelNumber: person.personnelNumber,
    fullName: person.fullName,
    rank: person.rank,
    title: person.title,
    email: person.email,
    phone: person.phone,
    status: person.status,
    metadata: person.metadata,
    createdAt: person.createdAt.toISOString(),
    updatedAt: person.updatedAt.toISOString(),
  };
}

function toPlacementResponse(
  placement: PersonOrganizationRecord,
): PersonOrganizationResponseDto {
  return {
    id: placement.id,
    personId: placement.personId,
    organizationId: placement.organizationId,
    positionName: placement.positionName,
    startDate: toDateString(placement.startDate),
    endDate: placement.endDate ? toDateString(placement.endDate) : null,
    isPrimary: placement.isPrimary,
    isActive: placement.endDate === null,
    createdAt: placement.createdAt.toISOString(),
    updatedAt: placement.updatedAt.toISOString(),
  };
}
