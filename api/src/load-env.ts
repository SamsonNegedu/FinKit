import { existsSync } from 'node:fs'

/** Local runs read api/.env. Variables already set (Docker, shell, CI) always win. */
export function loadLocalEnv(): void {
  if (existsSync('.env') && typeof process.loadEnvFile === 'function') {
    process.loadEnvFile('.env')
  }
}

loadLocalEnv()
