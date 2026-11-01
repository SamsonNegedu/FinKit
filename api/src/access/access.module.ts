import { DynamicModule, Global, Module } from '@nestjs/common'
import { AccessGuard } from './access.guard'
import { AdminGuard } from './admin.guard'
import { CsrfGuard } from './csrf.guard'
import { ACCESS_SETTINGS, ACCESS_VERIFIER, loadAccessSettings } from './access.settings'
import { cloudflareVerifier } from './cloudflare-verifier'

@Global()
@Module({})
export class AccessModule {
  /** Reads the sign-in settings from the environment once, at start-up. */
  static forRoot(env: NodeJS.ProcessEnv = process.env): DynamicModule {
    const settings = loadAccessSettings(env)
    return {
      module: AccessModule,
      providers: [
        { provide: ACCESS_SETTINGS, useValue: settings },
        {
          provide: ACCESS_VERIFIER,
          useValue:
            settings.mode === 'cloudflare' ? cloudflareVerifier(settings.teamDomain!, settings.audience!) : null,
        },
        AccessGuard,
        AdminGuard,
        CsrfGuard,
      ],
      exports: [ACCESS_SETTINGS, ACCESS_VERIFIER, AccessGuard, AdminGuard, CsrfGuard],
    }
  }
}
