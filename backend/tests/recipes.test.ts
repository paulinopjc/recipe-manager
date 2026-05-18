import { describe, it, expect } from '@jest/globals'
import request from 'supertest'
import { createApp } from '../src/app'
import { createUserAndToken } from './helper/auth'

const app = createApp()

const RECIPE = {
  title: 'Test Recipe',
  ingredients: [{ name: 'Egg', amount: 2 }],
  instructions: ['Step one'],
}

describe('Recipe endpoints', () => {
  it('requires authentication', async () => {
    const res = await request(app).get('/api/v1/recipes')
    expect(res.status).toBe(401)
  })

  describe('GET /api/v1/recipes', () => {
    it('lists recipes from all users for any authenticated user', async () => {
      const { token: tokenA } = await createUserAndToken()
      const { token: tokenB } = await createUserAndToken()

      await request(app)
        .post('/api/v1/recipes')
        .set('Authorization', `Bearer ${tokenA}`)
        .send(RECIPE)

      await request(app)
        .post('/api/v1/recipes')
        .set('Authorization', `Bearer ${tokenB}`)
        .send({ ...RECIPE, title: 'User B Recipe' })

      const res = await request(app)
        .get('/api/v1/recipes')
        .set('Authorization', `Bearer ${tokenA}`)

      expect(res.status).toBe(200)
      expect(res.body.data.length).toBeGreaterThanOrEqual(2)
      const titles = res.body.data.map((r: { title: string }) => r.title)
      expect(titles).toContain('Test Recipe')
      expect(titles).toContain('User B Recipe')
    })
  })

  describe('POST /api/v1/recipes', () => {
    it('creates a recipe and returns 201', async () => {
      const { token } = await createUserAndToken()

      const res = await request(app)
        .post('/api/v1/recipes')
        .set('Authorization', `Bearer ${token}`)
        .send(RECIPE)

      expect(res.status).toBe(201)
      expect(res.body.data.title).toBe('Test Recipe')
      expect(res.body.data.ingredients).toHaveLength(1)
      expect(res.body.data.instructions).toHaveLength(1)
    })

    it('returns 422 when title is missing', async () => {
      const { token } = await createUserAndToken()

      const res = await request(app)
        .post('/api/v1/recipes')
        .set('Authorization', `Bearer ${token}`)
        .send({ ingredients: [{ name: 'Egg', amount: 2 }], instructions: ['Step one'] })

      expect(res.status).toBe(422)
    })
  })

  describe('GET /api/v1/recipes/:id', () => {
    it('returns the recipe for the owner', async () => {
      const { token } = await createUserAndToken()

      const created = await request(app)
        .post('/api/v1/recipes')
        .set('Authorization', `Bearer ${token}`)
        .send(RECIPE)

      const res = await request(app)
        .get(`/api/v1/recipes/${created.body.data.id}`)
        .set('Authorization', `Bearer ${token}`)

      expect(res.status).toBe(200)
      expect(res.body.data.id).toBe(created.body.data.id)
    })

    it('returns any recipe to any authenticated user', async () => {
      const { token: tokenA } = await createUserAndToken()
      const { token: tokenB } = await createUserAndToken()

      const created = await request(app)
        .post('/api/v1/recipes')
        .set('Authorization', `Bearer ${tokenA}`)
        .send(RECIPE)

      const res = await request(app)
        .get(`/api/v1/recipes/${created.body.data.id}`)
        .set('Authorization', `Bearer ${tokenB}`)

      expect(res.status).toBe(200)
      expect(res.body.data.id).toBe(created.body.data.id)
    })
  })

  describe('PATCH /api/v1/recipes/:id', () => {
    it('updates a recipe and returns the updated record', async () => {
      const { token } = await createUserAndToken()

      const created = await request(app)
        .post('/api/v1/recipes')
        .set('Authorization', `Bearer ${token}`)
        .send(RECIPE)

      const res = await request(app)
        .patch(`/api/v1/recipes/${created.body.data.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'Updated Title' })

      expect(res.status).toBe(200)
      expect(res.body.data.title).toBe('Updated Title')
    })

    it('returns 404 when updating another user\'s recipe', async () => {
      const { token: tokenA } = await createUserAndToken()
      const { token: tokenB } = await createUserAndToken()

      const created = await request(app)
        .post('/api/v1/recipes')
        .set('Authorization', `Bearer ${tokenA}`)
        .send(RECIPE)

      const res = await request(app)
        .patch(`/api/v1/recipes/${created.body.data.id}`)
        .set('Authorization', `Bearer ${tokenB}`)
        .send({ title: 'Hijacked' })

      expect(res.status).toBe(404)
    })
  })

  describe('DELETE /api/v1/recipes/:id', () => {
    it('deletes a recipe and returns 204', async () => {
      const { token } = await createUserAndToken()

      const created = await request(app)
        .post('/api/v1/recipes')
        .set('Authorization', `Bearer ${token}`)
        .send(RECIPE)

      const res = await request(app)
        .delete(`/api/v1/recipes/${created.body.data.id}`)
        .set('Authorization', `Bearer ${token}`)

      expect(res.status).toBe(204)
    })

    it('returns 404 when deleting another user\'s recipe', async () => {
      const { token: tokenA } = await createUserAndToken()
      const { token: tokenB } = await createUserAndToken()

      const created = await request(app)
        .post('/api/v1/recipes')
        .set('Authorization', `Bearer ${tokenA}`)
        .send(RECIPE)

      const res = await request(app)
        .delete(`/api/v1/recipes/${created.body.data.id}`)
        .set('Authorization', `Bearer ${tokenB}`)

      expect(res.status).toBe(404)
    })
  })

  describe('PATCH /api/v1/recipes/:id — admin override', () => {
    it('allows admin to update any user\'s recipe', async () => {
      const { token: memberToken } = await createUserAndToken()
      const { token: adminToken } = await createUserAndToken({ role: 'admin' })

      const created = await request(app)
        .post('/api/v1/recipes')
        .set('Authorization', `Bearer ${memberToken}`)
        .send(RECIPE)

      const res = await request(app)
        .patch(`/api/v1/recipes/${created.body.data.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: 'Admin Updated Title' })

      expect(res.status).toBe(200)
      expect(res.body.data.title).toBe('Admin Updated Title')
    })
  })

  describe('DELETE /api/v1/recipes/:id — admin override', () => {
    it('allows admin to delete any user\'s recipe', async () => {
      const { token: memberToken } = await createUserAndToken()
      const { token: adminToken } = await createUserAndToken({ role: 'admin' })

      const created = await request(app)
        .post('/api/v1/recipes')
        .set('Authorization', `Bearer ${memberToken}`)
        .send(RECIPE)

      const res = await request(app)
        .delete(`/api/v1/recipes/${created.body.data.id}`)
        .set('Authorization', `Bearer ${adminToken}`)

      expect(res.status).toBe(204)
    })
  })

  describe('GET /api/v1/public/recipes — no auth', () => {
    it('returns only is_public recipes without authentication', async () => {
      const { token } = await createUserAndToken()

      const privateRes = await request(app)
        .post('/api/v1/recipes')
        .set('Authorization', `Bearer ${token}`)
        .send({ ...RECIPE, title: 'Private Recipe' })

      const publicRes = await request(app)
        .post('/api/v1/recipes')
        .set('Authorization', `Bearer ${token}`)
        .send({ ...RECIPE, title: 'Public Recipe', is_public: true })

      const privateId = privateRes.body.data.id
      const publicId = publicRes.body.data.id

      const res = await request(app).get('/api/v1/public/recipes')

      expect(res.status).toBe(200)
      const ids = res.body.data.map((r: { id: number }) => r.id)
      expect(ids).toContain(publicId)
      expect(ids).not.toContain(privateId)
    })
  })

  describe('GET /api/v1/public/recipes/:slug — no auth', () => {
    it('returns a public recipe without authentication', async () => {
      const { token } = await createUserAndToken()

      const created = await request(app)
        .post('/api/v1/recipes')
        .set('Authorization', `Bearer ${token}`)
        .send({ ...RECIPE, is_public: true })

      const res = await request(app)
        .get(`/api/v1/public/recipes/${created.body.data.slug}`)

      expect(res.status).toBe(200)
      expect(res.body.data.id).toBe(created.body.data.id)
    })

    it('returns 404 for a non-public recipe without authentication', async () => {
      const { token } = await createUserAndToken()

      const created = await request(app)
        .post('/api/v1/recipes')
        .set('Authorization', `Bearer ${token}`)
        .send(RECIPE)

      const res = await request(app)
        .get(`/api/v1/public/recipes/${created.body.data.slug}`)

      expect(res.status).toBe(404)
    })
  })
})