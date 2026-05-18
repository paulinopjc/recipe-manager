const blocklist = new Set<string>()

export const tokenBlocklist = {
  add(token: string)          { blocklist.add(token) },
  has(token: string): boolean { return blocklist.has(token) },
}
