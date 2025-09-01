import { ClerkWebhookDto, CreateUserDto, SignUpDto, UpdateProfileDto, UpdateUserDto, VerifyPasswordDto, VerifyPhoneDto } from "@/dto";
import { IAuthRepository } from "@/interfaces/IRepository";
import { IAuthService } from "@/interfaces/IService";
import { IExternalServices, IImageUploadService, IPasswordService } from "@/interfaces/IService/IExternalService";
import { ApiResponse, PaginatedResponse } from "@/types/api.types";
import { User } from "@/types/user.types";
import { Role } from "@prisma/client";


export class AuthService implements IAuthService {
    constructor(
        private userRepository: IAuthRepository,
        private clerkService: IExternalServices,
        private imageUploadService: IImageUploadService,
        private passwordService: IPasswordService
    ) { }


    async getUserById(id: string): Promise<ApiResponse<User>> {
        try {
            const user = await this.userRepository.findById(id, {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                role: true,
                imageUrl: true,
                createdAt: true
            })

            if (!user) {
                return {
                    success: false,
                    error: 'User not found'
                }
            }

            return {
                success: true,
                data: user
            }
        } catch (error) {
            return {
                success: false,
                error: 'Failed to fetch user',
                details: error instanceof Error ? error.message : 'Unknown error'
            }
        }
    }

    async getUserByClerkId(clerkId: string): Promise<ApiResponse<User>> {
        try {
            const user = await this.userRepository.findByClerkId(clerkId)

            if (!user) {
                return {
                    success: false,
                    error: 'User not found'
                }
            }

            return {
                success: true,
                data: user
            }
        } catch (error) {
            return {
                success: false,
                error: 'Failed to fetch user',
                details: error instanceof Error ? error.message : 'Unknown error'
            }
        }
    }

    async getAllUsers(): Promise<PaginatedResponse<User>> {
        try {
            const users = await this.userRepository.findMany({
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                role: true,
                imageUrl: true,
                createdAt: true
            })

            return {
                success: true,
                data: users,
                total: users.length
            }
        } catch (error) {
            return {
                success: false,
                data: [],
                total: 0,
                error: 'Failed to fetch users'
            } as any
        }
    }

    async createUser(dto: CreateUserDto): Promise<ApiResponse<User>> {
        try {
            const userData = {
                clerkId: dto.clerkId || `public_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                firstName: dto.firstName,
                lastName: dto.lastName,
                email: dto.email,
                role: dto.role || Role.STUDENT,
                imageUrl: dto.imageUrl,
                password: dto.password,
                phoneNumber: dto.phoneNumber
            }

            const user = await this.userRepository.create(userData, {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                role: true,
                createdAt: true
            })

            return {
                success: true,
                message: 'User created successfully',
                data: user
            }
        } catch (error) {
            return {
                success: false,
                error: 'Failed to create user',
                details: error instanceof Error ? error.message : 'Unknown error'
            }
        }
    }

    async updateUser(clerkId: string, dto: UpdateUserDto): Promise<ApiResponse<User>> {
        try {
            const user = await this.userRepository.update(clerkId, dto)

            return {
                success: true,
                message: 'User updated successfully',
                data: user
            }
        } catch (error) {
            return {
                success: false,
                error: 'Failed to update user',
                details: error instanceof Error ? error.message : 'Unknown error'
            }
        }
    }

    async deleteUser(clerkId: string): Promise<ApiResponse<void>> {
        try {
            await this.userRepository.delete(clerkId)

            return {
                success: true,
                message: 'User deleted successfully'
            }
        } catch (error) {
            return {
                success: false,
                error: 'Failed to delete user',
                details: error instanceof Error ? error.message : 'Unknown error'
            }
        }
    }

    async signUp(dto: SignUpDto): Promise<ApiResponse<User>> {
        try {
            if (!dto.email || !dto.password || !dto.firstName || !dto.lastName || !dto.clerkId) {
                return {
                    success: false,
                    error: 'Missing required fields: email, password, firstName, lastName, clerkId'
                }
            }

            const hashedPassword = await this.passwordService.hashPassword(dto.password)
            const defaultImageUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent((dto.firstName + ' ' + dto.lastName).substring(0, 20))}&background=374151&color=ffffff&size=200&rounded=true`

            const user = await this.userRepository.upsert(
                dto.clerkId,
                {
                    clerkId: dto.clerkId,
                    email: dto.email,
                    firstName: dto.firstName,
                    lastName: dto.lastName,
                    imageUrl: defaultImageUrl,
                    password: hashedPassword,
                    role: Role.STUDENT,
                },
                {
                    email: dto.email,
                    firstName: dto.firstName,
                    lastName: dto.lastName,
                    password: hashedPassword,
                    imageUrl: defaultImageUrl
                },
                {
                    id: true,
                    clerkId: true,
                    email: true,
                    firstName: true,
                    lastName: true,
                    role: true,
                    createdAt: true
                }
            )

            return {
                success: true,
                message: 'User created successfully with hashed password',
                data: user
            }
        } catch (error) {
            return {
                success: false,
                error: 'Failed to create user with hashed password',
                details: error instanceof Error ? error.message : 'Unknown error'
            }
        }
    }

    async verifyPassword(dto: VerifyPasswordDto): Promise<ApiResponse<any>> {
        try {
            if (!dto.email || !dto.password) {
                return {
                    success: false,
                    error: 'Email and password required'
                }
            }

            const user = await this.userRepository.findByEmail(dto.email, {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                password: true
            })

            if (!user || !user.password) {
                return {
                    success: false,
                    error: 'User not found or no password stored'
                }
            }

            const isPasswordValid = await this.passwordService.comparePassword(dto.password, user.password)

            return {
                success: true,
                data: {
                    passwordMatches: isPasswordValid,
                    userFound: true,
                    hashedPasswordExists: !!user.password,
                    userInfo: {
                        id: user.id,
                        email: user.email,
                        firstName: user.firstName,
                        lastName: user.lastName
                    }
                }
            }
        } catch (error) {
            return {
                success: false,
                error: 'Failed to verify password',
                details: error instanceof Error ? error.message : 'Unknown error'
            }
        }
    }

    async getMe(clerkId: string): Promise<ApiResponse<User>> {
        try {
            let user = await this.userRepository.findByClerkId(clerkId)

            if (!user) {
                // Create user from Clerk data if not exists
                console.log(`Creating new user for Clerk ID: ${clerkId}`)

                try {
                    const clerkUser = await this.clerkService.getUserById(clerkId)
                    const email = clerkUser.emailAddresses?.[0]?.emailAddress || null

                    const userData = {
                        clerkId: clerkUser.id,
                        firstName: clerkUser.firstName ?? undefined,
                        lastName: clerkUser.lastName ?? undefined,
                        imageUrl: clerkUser.imageUrl ?? undefined,
                        role: Role.STUDENT,
                        ...(email ? { email } : {})
                    }

                    user = await this.userRepository.create(userData)
                    console.log(`Successfully created user: ${user.id}`)
                } catch (clerkError) {
                    console.error('Failed to fetch user from Clerk:', clerkError)

                    // Create a minimal user record if Clerk fetch fails
                    const minimalUserData = {
                        clerkId: clerkId,
                        role: Role.STUDENT,
                    }

                    user = await this.userRepository.create(minimalUserData)
                    console.log(`Created minimal user record: ${user.id}`)
                }
            }

            return {
                success: true,
                data: user
            }
        } catch (error) {
            console.error('getMe error:', error)
            return {
                success: false,
                error: 'Failed to get user data',
                details: error instanceof Error ? error.message : 'Unknown error'
            }
        }
    }

    async updateProfile(clerkId: string, dto: UpdateProfileDto, file?: Express.Multer.File): Promise<ApiResponse<User>> {
        try {
            console.log('🔍 UpdateProfile called with:', { clerkId, dto, file: file ? { name: file.originalname, size: file.size, mimetype: file.mimetype } : 'No file' });

            const updateData: any = {}

            // Process basic fields
            if (dto.firstName !== undefined && dto.firstName.trim() !== '') {
                updateData.firstName = dto.firstName.trim()
            }
            if (dto.lastName !== undefined && dto.lastName.trim() !== '') {
                updateData.lastName = dto.lastName.trim()
            }
            if (dto.role !== undefined) updateData.role = dto.role
            if (dto.phoneNumber !== undefined) {
                updateData.phoneNumber = dto.phoneNumber.trim() || null
            }

            // Handle image upload if present
            if (file && file.buffer && file.buffer.length > 0) {
                console.log('📸 Processing image upload...');
                try {
                    const imageUrl = await this.imageUploadService.uploadImage(file.buffer)
                    console.log('✅ Image uploaded successfully:', imageUrl);
                    updateData.imageUrl = imageUrl
                } catch (uploadError) {
                    console.error('❌ Image upload failed:', uploadError);
                    // Don't fail the entire update if image upload fails
                }
            } else {
                console.log('🔄 No file or empty buffer, using default image logic');
                // Set default image URL if no current image exists
                const currentUser = await this.userRepository.findByClerkId(clerkId, { imageUrl: true })
                if (!currentUser?.imageUrl) {
                    const nameForAvatar = ((updateData.firstName || '') + ' ' + (updateData.lastName || '')).substring(0, 20)
                    updateData.imageUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(nameForAvatar)}&background=374151&color=ffffff&size=200&rounded=true`
                }
            }

            // Update user in database
            const updatedUser = await this.userRepository.update(clerkId, updateData, {
                id: true,
                clerkId: true,
                firstName: true,
                lastName: true,
                email: true,
                imageUrl: true,
                phoneNumber: true,
                role: true,
                updatedAt: true
            })

            // Update in Clerk as well (excluding email)
            const clerkUpdateData: any = {}
            if (dto.firstName !== undefined && dto.firstName.trim() !== '') {
                clerkUpdateData.firstName = dto.firstName.trim()
            }
            if (dto.lastName !== undefined && dto.lastName.trim() !== '') {
                clerkUpdateData.lastName = dto.lastName.trim()
            }

            if (Object.keys(clerkUpdateData).length > 0) {
                try {
                    await this.clerkService.updateUser(clerkId, clerkUpdateData)
                } catch (clerkError) {
                    console.warn('Failed to update Clerk user:', clerkError)
                }
            }

            return {
                success: true,
                message: 'Profile updated successfully',
                data: updatedUser
            }
        } catch (error) {
            return {
                success: false,
                error: 'Failed to update profile',
                details: error instanceof Error ? error.message : 'Unknown error'
            }
        }
    }

    async verifyPhone(clerkId: string, dto: VerifyPhoneDto): Promise<ApiResponse<any>> {
        try {
            if (!dto.phoneNumber) {
                return {
                    success: false,
                    error: 'Phone number is required'
                }
            }

            // Update phone number in database
            await this.userRepository.update(clerkId, { phoneNumber: dto.phoneNumber.trim() })

            return {
                success: true,
                message: 'Phone number saved successfully. Verification functionality can be implemented with SMS service.',
                data: { phoneNumber: dto.phoneNumber }
            }
        } catch (error) {
            return {
                success: false,
                error: 'Failed to verify phone number',
                details: error instanceof Error ? error.message : 'Unknown error'
            }
        }
    }

    async handleClerkWebhook(dto: ClerkWebhookDto): Promise<ApiResponse<void>> {
        try {
            const eventType = dto.type
            const data = dto.data

            console.log(`Processing Clerk webhook: ${eventType} for user: ${data.id}`)

            // Normalize common fields with better fallback handling
            const email: string | null =
                data?.email_addresses?.[0]?.email_address ??
                data?.primary_email_address?.email_address ??
                null
            const firstName: string | null = data?.first_name ?? null
            const lastName: string | null = data?.last_name ?? null
            const imageUrl: string | null = data?.image_url ?? data?.profile_image_url ?? null

            // Handle events idempotently
            if (eventType === 'user.created' || eventType === 'user.updated') {
                // Check if user already exists to preserve existing data
                const existingUser = await this.userRepository.findByClerkId(data.id)

                const baseUserData = {
                    clerkId: data.id,
                    firstName: firstName ?? undefined,
                    lastName: lastName ?? undefined,
                    imageUrl: imageUrl ?? undefined,
                    ...(email ? { email } : {})
                }

                if (existingUser) {
                    // Update existing user
                    await this.userRepository.update(data.id, baseUserData)
                    console.log(`User updated: ${data.id}`)
                } else {
                    // Create new user with default role
                    await this.userRepository.create({
                        ...baseUserData,
                        role: Role.STUDENT
                    })
                    console.log(`User created: ${data.id}`)
                }

            } else if (eventType === 'user.deleted') {
                try {
                    await this.userRepository.delete(data.id)
                    console.log(`User deleted: ${data.id}`)
                } catch (e) {
                    console.warn(`User delete skipped (not found): ${data.id}`)
                }
            } else {
                console.log(`Unhandled Clerk event: ${eventType}`)
            }

            return {
                success: true
            }
        } catch (error) {
            console.error('Webhook processing error:', error)
            return {
                success: false,
                error: 'Invalid webhook or processing error',
                details: error instanceof Error ? error.message : 'Unknown error'
            }
        }
    }

}
