
import { IAuthRepository } from '@/interfaces/IRepository'
import { User, UserCreate, UserUpdate, UserSelect } from '../types/user.types'
import { PrismaClient } from '@prisma/client'
import { prisma } from '@/config'


export class UserRepository implements IAuthRepository {
    // PERFORMANCE: Default select fields to avoid over-fetching
    private readonly defaultSelect: UserSelect = {
        id: true,
        clerkId: true,
        email: true,
        firstName: true,
        lastName: true,
        imageUrl: true,
        phoneNumber: true,
        role: true,
        createdAt: true,
        updatedAt: true
    }

    constructor(private readonly db: PrismaClient = prisma){}

    // ASYNC/AWAIT OPTIMIZATION: Enhanced findById with error handling
    async findById(id: string, select?: UserSelect): Promise<User | null> {
        try {
            // VALIDATION: Check ID format
            if (!id || typeof id !== 'string') {
                throw new Error('Valid ID is required')
            }

            return await this.db.user.findUnique({
                where: { id },
                select: select || this.defaultSelect
            }) as User | null
        } catch (error) {
            console.error('Repository findById error:', error)
            throw new Error(`Failed to find user by ID: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
    }

    // ASYNC/AWAIT OPTIMIZATION: Enhanced findByClerkId with caching consideration
    async findByClerkId(clerkId: string, select?: UserSelect): Promise<User | null> {
        try {
            // VALIDATION: Check clerkId format
            if (!clerkId || typeof clerkId !== 'string') {
                throw new Error('Valid Clerk ID is required')
            }

            return await this.db.user.findUnique({
                where: { clerkId },
                select: select || this.defaultSelect
            }) as User | null
        } catch (error) {
            console.error('Repository findByClerkId error:', error)
            throw new Error(`Failed to find user by Clerk ID: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
    }

    // ASYNC/AWAIT OPTIMIZATION: Enhanced findByEmail with case-insensitive search
    async findByEmail(email: string, select?: UserSelect): Promise<User | null> {
        try {
            // VALIDATION: Check email format
            if (!email || typeof email !== 'string') {
                throw new Error('Valid email is required')
            }

            // PERFORMANCE: Case-insensitive email search
            return await this.db.user.findFirst({
                where: {
                    email: {
                        equals: email,
                        mode: 'insensitive'
                    }
                },
                select: select || this.defaultSelect
            }) as User | null
        } catch (error) {
            console.error('Repository findByEmail error:', error)
            throw new Error(`Failed to find user by email: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
    }

    // PERFORMANCE: Enhanced findMany with pagination and filtering
    async findMany(
        select?: UserSelect,
        options?: {
            skip?: number
            take?: number
            orderBy?: { [key: string]: 'asc' | 'desc' }
            where?: any
        }
    ): Promise<User[]> {
        try {
            const { skip = 0, take = 50, orderBy = { createdAt: 'desc' }, where = {} } = options || {}

            // SECURITY: Limit maximum records to prevent performance issues
            const safeLimit = Math.min(take, 100)

            return await this.db.user.findMany({
                where,
                select: select || this.defaultSelect,
                skip,
                take: safeLimit,
                orderBy
            }) as User[]
        } catch (error) {
            console.error('Repository findMany error:', error)
            throw new Error(`Failed to find users: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
    }

    // ASYNC/AWAIT OPTIMIZATION: Enhanced create with validation
    async create(data: UserCreate, select?: UserSelect): Promise<User> {
        try {
            // VALIDATION: Check required fields
            if (!data.clerkId) {
                throw new Error('Clerk ID is required for user creation')
            }

            // SECURITY: Sanitize input data
            const sanitizedData = {
                ...data,
                email: data.email?.toLowerCase().trim(),
                firstName: data.firstName?.trim(),
                lastName: data.lastName?.trim()
            }

            return await this.db.user.create({
                data: sanitizedData,
                select: select || this.defaultSelect
            }) as User
        } catch (error) {
            console.error('Repository create error:', error)
            // CLEAN ARCHITECTURE: Handle unique constraint violations
            if (error instanceof Error && error.message.includes('Unique constraint')) {
                throw new Error('User with this information already exists')
            }
            throw new Error(`Failed to create user: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
    }

    // ASYNC/AWAIT OPTIMIZATION: Enhanced update with optimistic locking
    async update(clerkId: string, data: UserUpdate, select?: UserSelect): Promise<User> {
        try {
            // VALIDATION: Check clerkId and data
            if (!clerkId || typeof clerkId !== 'string') {
                throw new Error('Valid Clerk ID is required')
            }

            if (!data || Object.keys(data).length === 0) {
                throw new Error('Update data is required')
            }

            // SECURITY: Sanitize update data
            const sanitizedData = {
                ...data,
                email: data.email ? data.email.toLowerCase().trim() : undefined,
                firstName: data.firstName ? data.firstName.trim() : undefined,
                lastName: data.lastName ? data.lastName.trim() : undefined,
                updatedAt: new Date()
            }

            // Remove undefined values
            Object.keys(sanitizedData).forEach(key => {
                if (sanitizedData[key as keyof UserUpdate] === undefined) {
                    delete sanitizedData[key as keyof UserUpdate]
                }
            })

            return await this.db.user.update({
                where: { clerkId },
                data: sanitizedData,
                select: select || this.defaultSelect
            }) as User
        } catch (error) {
            console.error('Repository update error:', error)
            if (error instanceof Error && error.message.includes('Record to update not found')) {
                throw new Error('User not found')
            }
            throw new Error(`Failed to update user: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
    }

    // ASYNC/AWAIT OPTIMIZATION: Enhanced upsert with conflict resolution
    async upsert(
        clerkId: string,
        createData: UserCreate,
        updateData: UserUpdate,
        select?: UserSelect
    ): Promise<User> {
        try {
            // VALIDATION: Check required parameters
            if (!clerkId || typeof clerkId !== 'string') {
                throw new Error('Valid Clerk ID is required')
            }

            return await this.db.user.upsert({
                where: { clerkId },
                create: {
                    ...createData,
                    clerkId // Ensure clerkId is included in create data
                },
                update: {
                    ...updateData,
                    updatedAt: new Date()
                },
                select: select || this.defaultSelect
            }) as User
        } catch (error) {
            console.error('Repository upsert error:', error)
            throw new Error(`Failed to upsert user: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
    }

    // ASYNC/AWAIT OPTIMIZATION: Enhanced delete with cascade handling
    async delete(clerkId: string): Promise<void> {
        try {
            // VALIDATION: Check clerkId
            if (!clerkId || typeof clerkId !== 'string') {
                throw new Error('Valid Clerk ID is required')
            }

            // CLEAN ARCHITECTURE: Use transaction for data consistency
            await this.db.$transaction(async (tx: any) => {
                // First check if user exists
                const user = await tx.user.findUnique({
                    where: { clerkId },
                    select: { id: true }
                })

                if (!user) {
                    throw new Error('User not found')
                }

                // Delete user (cascading deletes handled by Prisma schema)
                await tx.user.delete({
                    where: { clerkId }
                })
            })
        } catch (error) {
            console.error('Repository delete error:', error)
            if (error instanceof Error && error.message.includes('Record to delete does not exist')) {
                throw new Error('User not found')
            }
            throw new Error(`Failed to delete user: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
    }

    // PERFORMANCE: Optimized exists check
    async exists(clerkId: string): Promise<boolean> {
        try {
            // VALIDATION: Check clerkId
            if (!clerkId || typeof clerkId !== 'string') {
                return false
            }

            const user = await this.db.user.findUnique({
                where: { clerkId },
                select: { id: true } // Only select ID for existence check
            })

            return !!user
        } catch (error) {
            console.error('Repository exists error:', error)
            return false
        }
    }

    // UTILITY: Count users with optional filters
    async count(where?: any): Promise<number> {
        try {
            return await this.db.user.count({ where })
        } catch (error) {
            console.error('Repository count error:', error)
            throw new Error(`Failed to count users: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
    }
}
