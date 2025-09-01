import { IPasswordService } from '@/interfaces/IService/IExternalService';
import bcrypt from 'bcryptjs'


export class PasswordService implements IPasswordService {
    // SECURITY: Increased salt rounds for better security
    private readonly saltRounds = 12

    // PERFORMANCE: Password strength validation
    private validatePasswordStrength(password: string): { isValid: boolean; errors: string[] } {
        const errors: string[] = []

        if (password.length < 8) {
            errors.push('Password must be at least 8 characters long')
        }

        if (!/(?=.*[a-z])/.test(password)) {
            errors.push('Password must contain at least one lowercase letter')
        }

        if (!/(?=.*[A-Z])/.test(password)) {
            errors.push('Password must contain at least one uppercase letter')
        }

        if (!/(?=.*\d)/.test(password)) {
            errors.push('Password must contain at least one number')
        }

        if (!/(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])/.test(password)) {
            errors.push('Password must contain at least one special character')
        }

        return {
            isValid: errors.length === 0,
            errors
        }
    }

    // ASYNC/AWAIT OPTIMIZATION: Enhanced password hashing with validation
    async hashPassword(password: string): Promise<string> {
        try {
            // VALIDATION: Check password strength
            const validation = this.validatePasswordStrength(password)
            if (!validation.isValid) {
                throw new Error(`Password validation failed: ${validation.errors.join(', ')}`)
            }

            // SECURITY: Hash with increased salt rounds
            const hashedPassword = await bcrypt.hash(password, this.saltRounds)

            if (!hashedPassword) {
                throw new Error('Password hashing failed')
            }

            return hashedPassword
        } catch (error) {
            console.error('Password hashing error:', error)
            throw new Error(`Failed to hash password: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
    }

    // ASYNC/AWAIT OPTIMIZATION: Enhanced password comparison with timing attack protection
    async comparePassword(password: string, hashedPassword: string): Promise<boolean> {
        try {
            // VALIDATION: Check inputs
            if (!password || !hashedPassword) {
                throw new Error('Password and hash are required for comparison')
            }

            // SECURITY: Use bcrypt compare for timing attack protection
            const isMatch = await bcrypt.compare(password, hashedPassword)
            return isMatch
        } catch (error) {
            console.error('Password comparison error:', error)
            // SECURITY: Don't expose internal errors for password operations
            return false
        }
    }

    // UTILITY: Generate secure random password
    generateSecurePassword(length: number = 16): string {
        const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*'
        let password = ''

        // SECURITY: Ensure password meets complexity requirements
        password += 'A' // Uppercase
        password += 'a' // Lowercase
        password += '1' // Number
        password += '!' // Special char

        // Fill remaining length
        for (let i = 4; i < length; i++) {
            password += charset.charAt(Math.floor(Math.random() * charset.length))
        }

        // SECURITY: Shuffle the password to randomize character positions
        return password.split('').sort(() => Math.random() - 0.5).join('')
    }

    // UTILITY: Check if password needs rehashing (due to increased salt rounds)
    needsRehash(hashedPassword: string): boolean {
        try {
            const rounds = bcrypt.getRounds(hashedPassword)
            return rounds < this.saltRounds
        } catch (error) {
            return true // If we can't determine rounds, assume it needs rehashing
        }
    }
}
