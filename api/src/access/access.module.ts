import { DynamicModule, Global, Logger, Module } from '@nestjs/common'
import { AccessGuard } from './access.guard'
import { CsrfGuard } from './csrf.guard'
import { ACCESS_SETTINGS, ACCESS_VERIFIER, loadAccessSettings } from './access.settings'
import { cloudflareVerifier, issuerFor } from './cloudflare-verifier'

@Global()
@Module({})
export class AccessModule {
  /** Reads the sign-in settings from the environment once, at start-up. */
  static forRoot(env: NodeJS.ProcessEnv = process.env): DynamicModule {
    const settings = loadAccessSettings(env)

    // One line at start-up so a wrong team name or missing audience is visible without a failed request
    new Logger('Access').log(
      settings.mode === 'cloudflare'
        ? `Cloudflare Access on, issuer ${issuerFor(settings.teamDomain!)}, ${settings.allowedEmails.length} allowed user(s)`
        : 'Cloudflare Access off (development mode)',
    )

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
        CsrfGuard,
      ],
      exports: [ACCESS_SETTINGS, ACCESS_VERIFIER, AccessGuard, CsrfGuard],
    }
  }
}
