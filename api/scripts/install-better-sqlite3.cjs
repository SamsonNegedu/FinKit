#!/usr/bin/env node

/**
 * Pre-built binary installer for better-sqlite3
 * Downloads platform-specific prebuilt binaries to avoid compilation during Docker builds
 * Falls back to npm rebuild if download fails
 */

const https = require('https')
const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

// Extract better-sqlite3 version from package.json
const packageJson = require('../package.json')
const BETTER_SQLITE3_VERSION = packageJson.dependencies['better-sqlite3'].replace(/[\^~]/, '')
const NODE_ABI_VERSION = process.versions.modules
const PLATFORM = process.platform
const ARCH = process.arch

const BINARY_NAME = 'better_sqlite3.node'
const BINARY_URL = `https://github.com/WiseLibs/better-sqlite3/releases/download/v${BETTER_SQLITE3_VERSION}/better-sqlite3-v${BETTER_SQLITE3_VERSION}-node-v${NODE_ABI_VERSION}-${PLATFORM}-${ARCH}.tar.gz`

const BETTER_SQLITE3_PATH = path.join(__dirname, '..', 'node_modules', 'better-sqlite3')

const BUILD_DIR = path.join(BETTER_SQLITE3_PATH, 'build', 'Release')
const BINARY_PATH = path.join(BUILD_DIR, BINARY_NAME)
const STAMP_PATH = path.join(BUILD_DIR, '.better-sqlite3-stamp.json')

function expectedStamp() {
  return {
    version: BETTER_SQLITE3_VERSION,
    nodeAbi: String(NODE_ABI_VERSION),
    platform: PLATFORM,
    arch: ARCH,
  }
}

function stampMatches() {
  if (!fs.existsSync(STAMP_PATH) || !fs.existsSync(BINARY_PATH)) {
    return false
  }
  try {
    const stamp = JSON.parse(fs.readFileSync(STAMP_PATH, 'utf8'))
    const want = expectedStamp()

    return (
      stamp.version === want.version &&
      stamp.nodeAbi === want.nodeAbi &&
      stamp.platform === want.platform &&
      stamp.arch === want.arch
    )
  } catch {
    return false
  }
}

function writeStamp() {
  fs.mkdirSync(BUILD_DIR, { recursive: true })
  fs.writeFileSync(STAMP_PATH, JSON.stringify(expectedStamp()))
}

function removeInstalledBinary() {
  for (const p of [BINARY_PATH, STAMP_PATH]) {
    if (fs.existsSync(p)) {
      fs.rmSync(p, { force: true })
    }
  }
}

/** Darwin needs Mach-O; a Linux ELF left in node_modules (e.g. after Docker) fails dlopen. */
function binaryLooksNative() {
  if (PLATFORM !== 'darwin' || !fs.existsSync(BINARY_PATH)) {
    return true
  }
  try {
    const kind = execSync(`file -b ${JSON.stringify(BINARY_PATH)}`, { encoding: 'utf8' })

    return kind.includes('Mach-O')
  } catch {
    return false
  }
}

function canOpenDatabase() {
  if (!fs.existsSync(BINARY_PATH)) {
    return false
  }
  try {
    const Database = require(BETTER_SQLITE3_PATH)
    const db = new Database(':memory:')

    db.close()

    return true
  } catch {
    return false
  }
}

if (stampMatches() && binaryLooksNative() && canOpenDatabase()) {
  console.log(`✓ better-sqlite3 binary OK for Node ${process.version} (${PLATFORM}-${ARCH})`)
  process.exit(0)
}

if (fs.existsSync(BINARY_PATH)) {
  console.log('Replacing better-sqlite3 binary (wrong platform, Node ABI, or corrupt)')
  removeInstalledBinary()
}

console.log(`Downloading better-sqlite3 pre-built binary...`)
console.log(`  Version: ${BETTER_SQLITE3_VERSION}`)
console.log(`  Platform: ${PLATFORM}-${ARCH}`)
console.log(`  Node ABI: v${NODE_ABI_VERSION}`)
console.log(`  URL: ${BINARY_URL}`)

// Ensure build directory exists
fs.mkdirSync(BUILD_DIR, { recursive: true })

const tempTarball = path.join('/tmp', `better-sqlite3-${Date.now()}.tar.gz`)
const file = fs.createWriteStream(tempTarball)

/**
 * Extract the tarball and move binary to correct location
 */
function extractBinary() {
  try {
    console.log(`✓ Downloaded to ${tempTarball}`)
    console.log(`Extracting...`)

    // Extract tarball
    execSync(`tar -xzf ${tempTarball} -C ${BUILD_DIR}`, { stdio: 'inherit' })

    // Handle nested build directory structure
    const extractedBuildDir = path.join(BUILD_DIR, 'build', 'Release', BINARY_NAME)

    if (fs.existsSync(extractedBuildDir)) {
      fs.renameSync(extractedBuildDir, BINARY_PATH)
      fs.rmSync(path.join(BUILD_DIR, 'build'), { recursive: true })
    }

    // Cleanup temp file
    fs.unlinkSync(tempTarball)

    if (fs.existsSync(BINARY_PATH) && canOpenDatabase()) {
      writeStamp()
      console.log(`✓ better-sqlite3 binary installed at ${BINARY_PATH}`)
      process.exit(0)
    } else {
      console.error(`✗ Binary not loadable after extraction`)
      removeInstalledBinary()
      fallbackToBuild()
    }
  } catch (err) {
    console.error(`✗ Extraction failed:`, err.message)
    fallbackToBuild()
  }
}

/**
 * Fallback to building from source
 */
function fallbackToBuild() {
  console.log(`\nFalling back to build from source...`)
  try {
    execSync('npm rebuild better-sqlite3', {
      stdio: 'inherit',
      cwd: path.join(__dirname, '..'),
    })
    if (!canOpenDatabase()) {
      throw new Error('rebuild succeeded but module still fails to load')
    }
    writeStamp()
    console.log(`✓ better-sqlite3 built from source successfully`)
    process.exit(0)
  } catch (err) {
    console.error(`✗ Build from source failed:`, err.message)
    process.exit(1)
  }
}

/**
 * Handle HTTP response
 */
function handleResponse(response) {
  if (response.statusCode === 302 || response.statusCode === 301) {
    // Follow redirect
    https.get(response.headers.location, handleResponse).on('error', handleError)
  } else if (response.statusCode === 200) {
    response.pipe(file)
    file.on('finish', () => {
      file.close(extractBinary)
    })
  } else if (response.statusCode === 404) {
    console.error(`✗ Pre-built binary not available for this platform`)
    console.error(`  HTTP ${response.statusCode}: ${BINARY_URL}`)
    fs.unlinkSync(tempTarball)
    fallbackToBuild()
  } else {
    console.error(`✗ Failed to download: HTTP ${response.statusCode}`)
    fs.unlinkSync(tempTarball)
    fallbackToBuild()
  }
}

/**
 * Handle download errors
 */
function handleError(err) {
  if (fs.existsSync(tempTarball)) {
    fs.unlinkSync(tempTarball)
  }
  console.error(`✗ Download failed:`, err.message)
  fallbackToBuild()
}

// Start download
https.get(BINARY_URL, handleResponse).on('error', handleError)
