import { describe, it, expect } from '@jest/globals'
import request from 'supertest'
import { createApp } from '../src/app'
import { createUserAndToken } from './helper/auth'

const app = createApp()

describe('Admin user endpoints', () => {
  it('requires authentication', async () => {
    const res = await request(app).get('/api/v1/admin/users')
    expect(res.status).toBe(401)
  })

  it('rejects a member user with 403', async () => {
    const { token } = await createUserAndToken({ role: 'member' })

    const res = await request(app)
      .get('/api/v1/admin/users')
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(403)
  })

  describe('GET /api/v1/admin/users', () => {
    it('returns a paginated list of users', async () => {
      const { token } = await createUserAndToken({ role: 'admin' })
      await createUserAndToken({ role: 'member' })
      await createUserAndToken({ role: 'member' })

      const res = await request(app)
        .get('/api/v1/admin/users')
        .set('Authorization', `Bearer ${token}`)

      expect(res.status).toBe(200)
      expect(res.body.data.length).toBeGreaterThanOrEqual(3)
      expect(res.body.total).toBeGreaterThanOrEqual(3)
    })
  })

  describe('POST /api/v1/admin/users', () => {
    it('creates a user and returns 201', async () => {
      const { token } = await createUserAndToken({ role: 'admin' })

      const res = await request(app)
        .post('/api/v1/admin/users')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'New User', email: 'newuser@example.com', role: 'member' })

      expect(res.status).toBe(201)
      expect(res.body.data.email).toBe('newuser@example.com')
    })

    it('returns 422 when name is missing', async () => {
      const { token } = await createUserAndToken({ role: 'admin' })

      const res = await request(app)
        .post('/api/v1/admin/users')
        .set('Authorization', `Bearer ${token}`)
        .send({ email: 'noname@example.com', role: 'member' })

      expect(res.status).toBe(422)
    })

    it('returns 409 when email is already in use', async () => {
      const { token } = await createUserAndToken({ role: 'admin', email: 'duplicate@example.com' })

      const res = await request(app)
        .post('/api/v1/admin/users')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Dupe', email: 'duplicate@example.com', role: 'member' })

      expect(res.status).toBe(409)
    })
  })

  describe('PATCH /api/v1/admin/users/:id', () => {
    it('updates a user and returns the updated record', async () => {
      const { token } = await createUserAndToken({ role: 'admin' })
      const { userId } = await createUserAndToken({ name: 'Before', email: 'before@example.com', role: 'member' })

      const res = await request(app)
        .patch(`/api/v1/admin/users/${userId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'After', email: 'after@example.com', role: 'member' })

      expect(res.status).toBe(200)
      expect(res.body.data.name).toBe('After')
      expect(res.body.data.email).toBe('after@example.com')
    })

    it('returns 404 for a non-existent user', async () => {
      const { token } = await createUserAndToken({ role: 'admin' })

      const res = await request(app)
        .patch('/api/v1/admin/users/99999')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Ghost', email: 'ghost@example.com', role: 'member' })

      expect(res.status).toBe(404)
    })
  })

  describe('PATCH /api/v1/admin/users/:id/toggle-active', () => {
    it('disables then re-enables a user', async () => {
      const { token } = await createUserAndToken({ role: 'admin' })
      const { userId } = await createUserAndToken({ role: 'member' })

      const disable = await request(app)
        .patch(`/api/v1/admin/users/${userId}/toggle-active`)
        .set('Authorization', `Bearer ${token}`)

      expect(disable.status).toBe(200)
      expect(disable.body.data.is_active).toBe(false)

      const enable = await request(app)
        .patch(`/api/v1/admin/users/${userId}/toggle-active`)
        .set('Authorization', `Bearer ${token}`)

      expect(enable.status).toBe(200)
      expect(enable.body.data.is_active).toBe(true)
    })

    it('returns 404 for a non-existent user', async () => {
      const { token } = await createUserAndToken({ role: 'admin' })

      const res = await request(app)
        .patch('/api/v1/admin/users/99999/toggle-active')
        .set('Authorization', `Bearer ${token}`)

      expect(res.status).toBe(404)
    })
  })
})