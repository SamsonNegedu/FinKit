import { All, Controller, Get, Inject, NotFoundException, ServiceUnavailableException } from '@nestjs/common'
import { BANKING_STATE, BankingState } from './bank-connections.tokens'

/** Stands in for the real banking routes when banking is off or set up incorrectly (it fails closed). */
@Controller('api/banking')
export class BankingUnavailableController {
  constructor(@Inject(BANKING_STATE) private readonly state: BankingState) {}

  @Get('status')
  status() {
    return { enabled: false }
  }

  @All('{*path}')
  everythingElse(): never {
    if (this.state === 'off') throw new NotFoundException({ error: 'Not Found' })
    throw new ServiceUnavailableException({ error: 'Banking is not available' })
  }
}
