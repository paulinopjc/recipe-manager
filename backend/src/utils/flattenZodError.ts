import type { ZodError } from 'zod'

export function flattenZodError(error: ZodError): Record<string, string> {
    const details: Record<string, string> = {}
    for (const issue of error.issues) {
        const path = issue.path.join('.') || '_'
        details[path] = issue.message
    }
    return details
}
