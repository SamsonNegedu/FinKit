import { Controller, Get } from '@nestjs/common'

const status = () => ({ status: 'ok', timestamp: new Date().toISOString() })

// Used by the container health check (/health) and by anything behind the /api proxy
@Controller()
export class HealthController {
  @Get('health') plain() {
    return status()
  }
  @Get('api/health') api() {
    return status()
  }
}
