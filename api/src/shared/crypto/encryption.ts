import { createCipheriv, createDecipheriv, randomBytes, createHash } from 'node:crypto'

// Bank session ids are credentials, so they're encrypted at rest (AES-256-GCM, random IV per value).
export function encrypt(plain: string, key: Buffer): string {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', key, iv)
  const ct = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()])
  return ['v1', iv.toString('base64'), cipher.getAuthTag().toString('base64'), ct.toString('base64')].join('.')
}

export function decrypt(blob: string, key: Buffer): string {
  const [v, iv, tag, ct] = blob.split('.')
  if (v !== 'v1' || !iv || !tag || !ct) throw new Error('Unsupported ciphertext')
  const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(iv, 'base64'))
  decipher.setAuthTag(Buffer.from(tag, 'base64'))
  return Buffer.concat([decipher.update(Buffer.from(ct, 'base64')), decipher.final()]).toString('utf8')
}

export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString('base64url')
}

/** A short, opaque id for an account, safe to put in URLs: derived from the bank's id, which stays private. */
export function accountRef(stableId: string): string {
  return createHash('sha256').update(`finkit-account:${stableId}`).digest('hex').slice(0, 16)
}
