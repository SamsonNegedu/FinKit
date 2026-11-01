import { existsSync } from 'node:fs'

// Local runs read api/.env. Variables already set (by Docker, the shell, CI) always win,
// and in the container there is no .env file, so this does nothing there.
if (existsSync('.env') && typeof process.loadEnvFile === 'function') process.loadEnvFile('.env')
