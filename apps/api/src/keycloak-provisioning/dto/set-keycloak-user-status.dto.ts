import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';

/** Enable or disable the linked Keycloak user. */
export class SetKeycloakUserStatusDto {
  @ApiPropertyOptional({
    description: 'Enable (`true`) or disable (`false`) the Keycloak login.',
  })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}
