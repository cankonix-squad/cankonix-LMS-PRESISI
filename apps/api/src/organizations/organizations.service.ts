import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { ListOrganizationsQueryDto } from './dto/list-organizations-query.dto';
import {
  OrganizationListResponseDto,
  OrganizationResponseDto,
  OrganizationTreeResponseDto,
} from './dto/organization-response.dto';
import { OrganizationStatusDto } from './dto/organization-status.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import {
  ORGANIZATIONS_REPOSITORY,
  OrganizationsRepository,
} from './organizations.repository';
import {
  OrganizationRecord,
  OrganizationTreeNode,
  OrganizationUpdateData,
} from './organization.types';

@Injectable()
export class OrganizationsService {
  constructor(
    @Inject(ORGANIZATIONS_REPOSITORY)
    private readonly organizations: OrganizationsRepository,
  ) {}

  async create(dto: CreateOrganizationDto): Promise<OrganizationResponseDto> {
    const code = normalizeCode(dto.code);
    await this.ensureCodeAvailable(code);
    if (dto.parentId) await this.ensureExists(dto.parentId);
    const created = await this.organizations.create({
      code,
      name: dto.name.trim(),
      parentId: dto.parentId ?? null,
      organizationType: dto.organizationType?.trim() || null,
      status: dto.status ?? OrganizationStatusDto.ACTIVE,
      metadata: dto.metadata ?? null,
    });
    return toResponse(created);
  }

  async list(
    query: ListOrganizationsQueryDto,
  ): Promise<OrganizationListResponseDto> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const result = await this.organizations.list({
      search: query.search?.trim() || undefined,
      status: query.status,
      parentId: query.parentId,
      page,
      limit,
    });
    return {
      data: result.data.map(toResponse),
      page,
      limit,
      total: result.total,
    };
  }

  async findOne(id: string): Promise<OrganizationResponseDto> {
    return toResponse(await this.ensureExists(id));
  }

  async update(
    id: string,
    dto: UpdateOrganizationDto,
  ): Promise<OrganizationResponseDto> {
    await this.ensureExists(id);
    const data: OrganizationUpdateData = {};
    if (dto.code !== undefined) {
      const code = normalizeCode(dto.code);
      await this.ensureCodeAvailable(code, id);
      data.code = code;
    }
    if (dto.name !== undefined) data.name = dto.name.trim();
    if (dto.organizationType !== undefined) {
      data.organizationType = dto.organizationType?.trim() || null;
    }
    if (dto.status !== undefined) data.status = dto.status;
    if (dto.metadata !== undefined) data.metadata = dto.metadata;
    if (dto.parentId !== undefined) {
      await this.assertValidParentChange(id, dto.parentId);
      data.parentId = dto.parentId;
    }
    return toResponse(await this.organizations.update(id, data));
  }

  async children(id: string): Promise<OrganizationResponseDto[]> {
    await this.ensureExists(id);
    return (await this.organizations.findChildren(id)).map(toResponse);
  }

  async tree(id: string): Promise<OrganizationTreeResponseDto> {
    const root = await this.ensureExists(id);
    return toTreeResponse(await this.buildTree(root));
  }

  async getDescendantIds(id: string): Promise<string[]> {
    await this.ensureExists(id);
    const descendants: string[] = [];
    const visit = async (parentId: string): Promise<void> => {
      for (const child of await this.organizations.findChildren(parentId)) {
        descendants.push(child.id);
        await visit(child.id);
      }
    };
    await visit(id);
    return descendants;
  }

  private async ensureExists(id: string): Promise<OrganizationRecord> {
    const organization = await this.organizations.findById(id);
    if (!organization) throw new NotFoundException('Organization not found');
    return organization;
  }

  private async ensureCodeAvailable(
    code: string,
    currentId?: string,
  ): Promise<void> {
    const existing = await this.organizations.findByCode(code);
    if (existing && existing.id !== currentId) {
      throw new ConflictException('Organization code already exists');
    }
  }

  private async assertValidParentChange(
    organizationId: string,
    parentId: string | null,
  ): Promise<void> {
    if (!parentId) return;
    if (parentId === organizationId) {
      throw new BadRequestException('Organization cannot be its own parent');
    }
    let currentParentId: string | null = parentId;
    while (currentParentId) {
      const current = await this.ensureExists(currentParentId);
      if (current.parentId === organizationId) {
        throw new BadRequestException(
          'Organization parent would create a cycle',
        );
      }
      currentParentId = current.parentId;
    }
  }

  private async buildTree(
    root: OrganizationRecord,
  ): Promise<OrganizationTreeNode> {
    const children = await Promise.all(
      (await this.organizations.findChildren(root.id)).map((child) =>
        this.buildTree(child),
      ),
    );
    return { ...root, children };
  }
}

function normalizeCode(code: string): string {
  const normalized = code.trim().toUpperCase();
  if (!normalized)
    throw new BadRequestException('Organization code is required');
  return normalized;
}

function toResponse(organization: OrganizationRecord): OrganizationResponseDto {
  return {
    id: organization.id,
    code: organization.code,
    name: organization.name,
    parentId: organization.parentId,
    organizationType: organization.organizationType,
    status: organization.status,
    metadata: organization.metadata,
    createdAt: organization.createdAt.toISOString(),
    updatedAt: organization.updatedAt.toISOString(),
  };
}

function toTreeResponse(
  node: OrganizationTreeNode,
): OrganizationTreeResponseDto {
  return { ...toResponse(node), children: node.children.map(toTreeResponse) };
}
