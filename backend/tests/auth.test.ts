import { describe, it, expect, jest, beforeEach } from '@jest/globals'
import request from 'supertest'
import { createApp } from '../src/app'
import { userService } from '../src/services/userService'

jest.mock('../src/services/googleVerifier', () => ({
  googleVerifier: {
    verify: jest.fn(),
  },
}))

import { googleVerifier } from '../src/services/googleVerifier'

const app = createApp()

describe('POST /api/auth/google', () => {
  beforeEach(() => {
    jest.mocked(googleVerifier.verify).mockReset()
  })

  it('issues a JWT for a whitelisted email', async () => {
    await userService.create({ name: 'Pat', email: 'pat@example.com', role: 'member' })

    jest.mocked(googleVerifier.verify).mockResolvedValue({
      email: 'pat@example.com',
      emailVerified: true,
      name: 'Pat',
      sub: 'google-sub-123',
    })

    const res = await request(app)
      .post('/api/v1/auth/google')
      .send({ id_token: 'fake-but-valid-token' })

    expect(res.status).toBe(200)
    expect(res.body.data.token).toBeDefined()
    expect(res.body.data.user.email).toBe('pat@example.com')
  })

  it('rejects an unknown email with 403', async () => {
    jest.mocked(googleVerifier.verify).mockResolvedValue({
      email: 'stranger@example.com',
      emailVerified: true,
      name: 'Stranger',
      sub: 'google-sub-999',
    })

    const res = await request(app)
      .post('/api/v1/auth/google')
      .send({ id_token: 'fake-but-valid-token' })

    expect(res.status).toBe(403)
    expect(res.body.error).toMatch(/not authorised/i)
  })

  it('rejects a disabled user with 403', async () => {
    await userService.create({ name: 'Pat', email: 'pat@example.com', role: 'member' })
    const row = (await userService.findByEmail('pat@example.com'))!
    await userService.toggleActive(row.id)

    jest.mocked(googleVerifier.verify).mockResolvedValue({
      email: 'pat@example.com',
      emailVerified: true,
      name: 'Pat',
      sub: 'google-sub-123',
    })

    const res = await request(app)
      .post('/api/v1/auth/google')
      .send({ id_token: 'fake-but-valid-token' })

    expect(res.status).toBe(403)
  })

  it('rejects an invalid token with 401', async () => {
    jest.mocked(googleVerifier.verify).mockRejectedValue(new Error('bad signature'))

    const res = await request(app)
      .post('/api/v1/auth/google')
      .send({ id_token: 'not-a-real-token' })

    expect(res.status).toBe(401)
  })
})
