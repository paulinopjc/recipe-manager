import { userService } from '../../src/services/userService'
import { tokenService } from '../../src/services/tokenService'
import type { UserRole } from '../../src/types/user'

export async function createUserAndToken(
  overrides: { name?: string; email?: string; role?: UserRole } = {}
): Promise<{ token: string; userId: number }> {
  const user = await userService.create({
    name: overrides.name ?? 'Test User',
    email: overrides.email ?? `user-${Date.now()}-${Math.random()}@example.com`,
    role: overrides.role ?? 'member',
  })
  const token = tokenService.sign({ userId: user.id, role: user.role })
  return { token, userId: user.id }
}