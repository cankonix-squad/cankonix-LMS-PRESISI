import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  KeycloakProvisioningActionDto,
  KeycloakProvisioningStatusDto,
} from './keycloak-provisioning-status.dto';

/**
 * Honest answer to "can this person log in, and what should the operator do?".
 *
 * `externalAuthId` is echoed because it is already readable through the user
 * account contract. It is a provider subject — an opaque reference — not a
 * credential, so returning it leaks nothing the caller cannot already read.
 */
export class KeycloakProvisioningStatusResponseDto {
  @ApiProperty() personId!: string;
  @ApiProperty() userAccountId!: string;

  @ApiProperty({ enum: KeycloakProvisioningStatusDto })
  status!: KeycloakProvisioningStatusDto;

  /** Human-readable Indonesian explanation for operators. */
  @ApiProperty() summary!: string;

  /** Whether the person can authenticate right now. */
  @ApiProperty() readyToLogin!: boolean;

  @ApiProperty({ enum: KeycloakProvisioningActionDto, isArray: true })
  availableActions!: KeycloakProvisioningActionDto[];

  @ApiPropertyOptional({
    nullable: true,
    description: 'Linked Keycloak subject, when one is stored.',
  })
  externalAuthId?: string | null;

  @ApiPropertyOptional({
    nullable: true,
    description: 'Username of the linked Keycloak user, when known.',
  })
  keycloakUsername?: string | null;

  @ApiProperty({
    description: 'Whether Keycloak provisioning is configured on the API.',
  })
  provisioningConfigured!: boolean;
}

/** Result envelope for a provisioning mutation. */
export class KeycloakProvisioningOperationResponseDto {
  @ApiProperty() success!: boolean;

  @ApiProperty({ type: KeycloakProvisioningStatusResponseDto })
  provisioning!: KeycloakProvisioningStatusResponseDto;

  @ApiPropertyOptional({ nullable: true })
  message?: string | null;

  /**
   * `true` when the LMS account was linked in an earlier attempt and this call
   * re-used the existing Keycloak user instead of creating a new one.
   */
  @ApiPropertyOptional()
  adoptedExisting?: boolean;
}
