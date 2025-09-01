import { Request, Response } from 'express'
import {
    CreateUserDto,
    SignUpDto,
    VerifyPasswordDto,
    UpdateProfileDto,
    VerifyPhoneDto,
    ClerkWebhookDto
} from '@/dto'
import { AuthenticatedRequest } from '@/middleware/auth'
import { IAuthService } from '@/interfaces/IService'


export class UserController {
    constructor(private userService: IAuthService) { }

    getAllUsers = async (req: Request, res: Response): Promise<void> => {
        try {
            const result = await this.userService.getAllUsers()
            res.status(result.success ? 200 : 500).json(result)
        } catch (error) {
            res.status(500).json({
                success: false,
                error: 'Failed to fetch users',
                details: error instanceof Error ? error.message : 'Unknown error'
            })
        }
    }

    getUserById = async (req: Request, res: Response): Promise<void> => {
        try {
            const { id } = req.params;

            if (!id) {
                res.status(400).json({
                    success: false,
                    error: 'User ID is required'
                });
                return;
            }

            const result = await this.userService.getUserById(id);
            res.status(result.success ? 200 : 404).json(result);
        } catch (error) {
            res.status(500).json({
                success: false,
                error: 'Failed to fetch user',
                details: error instanceof Error ? error.message : 'Unknown error'
            })
        }
    }

    createUser = async (req: Request, res: Response): Promise<void> => {
        try {
            const dto: CreateUserDto = req.body
            const result = await this.userService.createUser(dto)
            res.status(result.success ? 201 : 500).json(result)
        } catch (error) {
            res.status(500).json({
                success: false,
                error: 'Failed to create user',
                details: error instanceof Error ? error.message : 'Unknown error'
            })
        }
    }

    signUp = async (req: Request, res: Response): Promise<void> => {
        try {
            const dto: SignUpDto = req.body
            const result = await this.userService.signUp(dto)
            res.status(result.success ? 200 : 500).json(result)
        } catch (error) {
            res.status(500).json({
                success: false,
                error: 'Failed to sign up user',
                details: error instanceof Error ? error.message : 'Unknown error'
            })
        }
    }

    verifyPassword = async (req: Request, res: Response): Promise<void> => {
        try {
            const dto: VerifyPasswordDto = req.body
            const result = await this.userService.verifyPassword(dto)
            res.status(result.success ? 200 : 404).json(result)
        } catch (error) {
            res.status(500).json({
                success: false,
                error: 'Failed to verify password',
                details: error instanceof Error ? error.message : 'Unknown error'
            })
        }
    }

    getMe = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
        try {
            const userId = req.user?.userId
            if (!userId) {
                res.status(401).json({ error: 'Not authenticated' })
                return
            }

            const result = await this.userService.getMe(userId)
            res.status(result.success ? 200 : 500).json(result.data)
        } catch (error) {
            res.status(500).json({
                success: false,
                error: 'Failed to fetch user data',
                details: error instanceof Error ? error.message : 'Unknown error'
            })
        }
    }

    updateProfile = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
        try {
            const userId = req.user?.userId
            if (!userId) {
                res.status(401).json({ error: 'Not authenticated' })
                return
            }

            const dto: UpdateProfileDto = req.body
            const file = req.file
            const result = await this.userService.updateProfile(userId, dto, file)
            res.status(result.success ? 200 : 500).json(result)
        } catch (error) {
            res.status(500).json({
                success: false,
                error: 'Failed to update profile',
                details: error instanceof Error ? error.message : 'Unknown error'
            })
        }
    }

    verifyPhone = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
        try {
            const userId = req.user?.userId
            if (!userId) {
                res.status(401).json({ error: 'Not authenticated' })
                return
            }

            const dto: VerifyPhoneDto = req.body
            const result = await this.userService.verifyPhone(userId, dto)
            res.status(result.success ? 200 : 500).json(result)
        } catch (error) {
            res.status(500).json({
                success: false,
                error: 'Failed to verify phone',
                details: error instanceof Error ? error.message : 'Unknown error'
            })
        }
    }

    handleClerkWebhook = async (req: Request, res: Response): Promise<void> => {
        try {
            const dto: ClerkWebhookDto = {
                type: req.body.type,
                data: req.body.data
            }
            const result = await this.userService.handleClerkWebhook(dto)
            res.status(result.success ? 200 : 500).json(result)
        } catch (error) {
            res.status(500).json({
                success: false,
                error: 'Failed to handle webhook',
                details: error instanceof Error ? error.message : 'Unknown error'
            })
        }
    }
}
