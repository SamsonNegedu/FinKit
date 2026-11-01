import { Global, Module } from '@nestjs/common'
import { UsersRepository } from './users.repository'
import { UsersService } from './users.service'

@Global()
@Module({ providers: [UsersRepository, UsersService], exports: [UsersService] })
export class UsersModule {}
