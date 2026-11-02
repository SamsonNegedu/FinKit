import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, UseGuards, UseInterceptors } from '@nestjs/common'
import { AccessGuard, CurrentActor } from '../access/access.guard'
import { Actor } from '../access/access.settings'
import { CsrfGuard } from '../access/csrf.guard'
import { NoStoreInterceptor } from '../shared/http/no-store.interceptor'
import { ZodValidationPipe } from '../shared/http/zod-validation.pipe'
import {
  CreateContractInput,
  CreateContractSchema,
  IdParamSchema,
  UpdateContractInput,
  UpdateContractSchema,
} from './contracts.schemas'
import { ContractsService } from './contracts.service'

const id = new ZodValidationPipe(IdParamSchema)

/** Contracts: payments that repeat on a steady rhythm, found in synced transactions, plus ones added by hand. */
@Controller('api/contracts')
@UseGuards(AccessGuard, CsrfGuard)
@UseInterceptors(NoStoreInterceptor)
export class ContractsController {
  constructor(private readonly contracts: ContractsService) {}

  @Get()
  list(@CurrentActor() actor: Actor) {
    return this.contracts.list(actor.userId)
  }

  @Get(':id/payments')
  payments(@CurrentActor() actor: Actor, @Param('id', id) contractId: string) {
    return this.contracts.payments(actor.userId, contractId)
  }

  @Post()
  create(@CurrentActor() actor: Actor, @Body(new ZodValidationPipe(CreateContractSchema)) body: CreateContractInput) {
    return this.contracts.create(actor.userId, body)
  }

  @Patch(':id')
  update(
    @CurrentActor() actor: Actor,
    @Param('id', id) contractId: string,
    @Body(new ZodValidationPipe(UpdateContractSchema)) body: UpdateContractInput,
  ) {
    return this.contracts.update(actor.userId, contractId, body)
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@CurrentActor() actor: Actor, @Param('id', id) contractId: string) {
    this.contracts.remove(actor.userId, contractId)
  }
}
