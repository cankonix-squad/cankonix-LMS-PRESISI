import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiProperty, ApiTags } from '@nestjs/swagger';
import { Public } from '../auth/auth.decorators';
import { HealthService } from './health.service';
class HealthResponseDto {
  @ApiProperty({ enum: ['ok'] }) status!: 'ok';
}
@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly health: HealthService) {}
  @Get()
  @Public()
  @ApiOkResponse({
    type: HealthResponseDto,
    description: 'API process is running; not infrastructure readiness.',
  })
  check(): HealthResponseDto {
    return this.health.check();
  }
}
