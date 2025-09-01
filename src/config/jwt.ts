import jwt from "jsonwebtoken";
import * as env from "../env/index"

interface TokenPayload {
    userId: string;
    email?: string;
    role?: string;
    tokenVersion?: number;
    iat?: number;
    exp?: number;
}

export const generateToken = async (userId: string, email?: string, role: string = 'user'): Promise<string> => {
    try {
        if (!env.JWT_SECRET) {
            throw new Error("JWT_SECRET is not configured");
        }

        const payload: TokenPayload = {
            userId,
            email,
            role,
            tokenVersion: 1 // For token invalidation if needed
        };

        const token = jwt.sign(payload, env.JWT_SECRET as string, {
            expiresIn: '7d'
        } as jwt.SignOptions);

        return token;
    } catch (error) {
        console.error("Token generation error: ", error);
        throw new Error("Failed to generate token");
    }
}

export const verifyToken = async (token: string): Promise<TokenPayload> => {
    try {
        if (!env.JWT_SECRET) {
            throw new Error("JWT_SECRET is not configured");
        }

        const decoded = jwt.verify(token, env.JWT_SECRET as string) as TokenPayload;

        return decoded;
    } catch (error) {
        console.error('Token verification error:', error);
        if (error instanceof jwt.TokenExpiredError) {
            throw new Error('Token expired');
        } else if (error instanceof jwt.JsonWebTokenError) {
            throw new Error('Invalid token');
        } else {
            throw new Error('Token verification failed');
        }
    }
}

export const refreshToken = async (oldToken: string): Promise<string> => {
    try {
        // Verify the old token (even if expired, we can still decode it)
        const decoded = jwt.decode(oldToken) as TokenPayload;

        if (!decoded || !decoded.userId) {
            throw new Error('Invalid token structure');
        }

        // Generate new token with same payload
        return generateToken(decoded.userId, decoded.email, decoded.role);
    } catch (error) {
        console.error('Token refresh error:', error);
        throw new Error('Failed to refresh token');
    }
}
