import { Role } from '@prisma/client'
import { z } from 'zod'

// Zod schemas for validation
export const CreateUserSchema = z.object({
    clerkId: z.string(),
    email: z.string().email().optional(),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    imageUrl: z.string().url().optional(),
    password: z.string().min(6).optional(),
    phoneNumber: z.string().optional(),
    role: z.nativeEnum(Role).optional()
})

export const UpdateUserSchema = z.object({
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    imageUrl: z.string().url().optional(),
    phoneNumber: z.string().optional(),
    role: z.nativeEnum(Role).optional()
})

export const SignUpSchema = z.object({
    email: z.string().email(),
    password: z.string().min(6),
    firstName: z.string(),
    lastName: z.string(),
    clerkId: z.string()
})

export const VerifyPasswordSchema = z.object({
    email: z.string().email(),
    password: z.string()
})

export const UpdateProfileSchema = z.object({
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    phoneNumber: z.string().optional(),
    role: z.string().optional()
})

export const VerifyPhoneSchema = z.object({
    phoneNumber: z.string()
})

export const ClerkWebhookSchema = z.object({
    type: z.string(),
    data: z.object({
        id: z.string(),
        email_addresses: z.array(z.object({ email_address: z.string().email() })).optional(),
        primary_email_address: z.object({ email_address: z.string().email() }).optional(),
        first_name: z.string().optional(),
        last_name: z.string().optional(),
        image_url: z.string().url().optional(),
        profile_image_url: z.string().url().optional()
    })
})

// Type definitions inferred from schemas
export type CreateUserDto = z.infer<typeof CreateUserSchema>
export type UpdateUserDto = z.infer<typeof UpdateUserSchema>
export type SignUpDto = z.infer<typeof SignUpSchema>
export type VerifyPasswordDto = z.infer<typeof VerifyPasswordSchema>
export type UpdateProfileDto = z.infer<typeof UpdateProfileSchema>
export type VerifyPhoneDto = z.infer<typeof VerifyPhoneSchema>
export type ClerkWebhookDto = z.infer<typeof ClerkWebhookSchema>
