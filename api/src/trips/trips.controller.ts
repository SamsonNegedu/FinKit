import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, UseGuards, UseInterceptors } from '@nestjs/common'
import { AccessGuard, CurrentActor } from '../access/access.guard'
import { Actor } from '../access/access.settings'
import { CsrfGuard } from '../access/csrf.guard'
import { NoStoreInterceptor } from '../shared/http/no-store.interceptor'
import { ZodValidationPipe } from '../shared/http/zod-validation.pipe'
import {
  CategorySchema,
  CreateTripInput,
  CreateTripSchema,
  EntryInput,
  EntrySchema,
  IdParamSchema,
  RemoveItemsSchema,
  TagItemsInput,
  TagItemsSchema,
  UpdateTripInput,
  UpdateTripSchema,
} from './trips.schemas'
import { TripsService } from './trips.service'

const id = new ZodValidationPipe(IdParamSchema)

/** Trips: a separate pot of spending whose transactions leave the monthly view. */
@Controller('api')
@UseGuards(AccessGuard, CsrfGuard)
@UseInterceptors(NoStoreInterceptor)
export class TripsController {
  constructor(private readonly trips: TripsService) {}

  @Get('trips')
  list(@CurrentActor() actor: Actor) {
    return { trips: this.trips.list(actor.userId) }
  }

  @Post('trips')
  create(@CurrentActor() actor: Actor, @Body(new ZodValidationPipe(CreateTripSchema)) body: CreateTripInput) {
    return this.trips.create(actor.userId, body)
  }

  @Get('trips/:id')
  detail(@CurrentActor() actor: Actor, @Param('id', id) tripId: string) {
    return this.trips.detail(actor.userId, tripId)
  }

  @Patch('trips/:id')
  update(
    @CurrentActor() actor: Actor,
    @Param('id', id) tripId: string,
    @Body(new ZodValidationPipe(UpdateTripSchema)) body: UpdateTripInput,
  ) {
    return this.trips.update(actor.userId, tripId, body)
  }

  @Delete('trips/:id')
  @HttpCode(204)
  remove(@CurrentActor() actor: Actor, @Param('id', id) tripId: string) {
    this.trips.delete(actor.userId, tripId)
  }

  @Post('trips/:id/items')
  @HttpCode(204)
  tag(
    @CurrentActor() actor: Actor,
    @Param('id', id) tripId: string,
    @Body(new ZodValidationPipe(TagItemsSchema)) body: TagItemsInput,
  ) {
    this.trips.tag(actor.userId, tripId, body)
  }

  @Post('trips/:id/entries')
  addEntry(
    @CurrentActor() actor: Actor,
    @Param('id', id) tripId: string,
    @Body(new ZodValidationPipe(EntrySchema)) body: EntryInput,
  ) {
    return this.trips.addEntry(actor.userId, tripId, body)
  }

  @Post('trips/:id/items/remove')
  @HttpCode(204)
  untag(
    @CurrentActor() actor: Actor,
    @Param('id', id) tripId: string,
    @Body(new ZodValidationPipe(RemoveItemsSchema)) body: { refs: string[] },
  ) {
    this.trips.untag(actor.userId, tripId, body.refs)
  }

  @Get('trip-categories')
  categories(@CurrentActor() actor: Actor) {
    return { categories: this.trips.categories(actor.userId), subcategories: this.trips.subcategories(actor.userId) }
  }

  @Post('trip-categories')
  @HttpCode(204)
  addCategory(@CurrentActor() actor: Actor, @Body(new ZodValidationPipe(CategorySchema)) body: { name: string }) {
    this.trips.addCategory(actor.userId, body.name)
  }

  @Delete('trip-categories/:name')
  @HttpCode(204)
  removeCategory(@CurrentActor() actor: Actor, @Param('name') name: string) {
    this.trips.removeCategory(actor.userId, name)
  }
}
