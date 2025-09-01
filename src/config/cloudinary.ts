import { v2 as cloudinary } from 'cloudinary'
import * as env from '../env/index'

// CLEAN ARCHITECTURE: Centralized Cloudinary configuration with validation
class CloudinaryConfig {
    private static instance: CloudinaryConfig
    private initialized = false

    private constructor() {
        this.validateConfig()
        this.initializeCloudinary()
    }

    // SINGLETON: Ensure single instance for better resource management
    static getInstance(): CloudinaryConfig {
        if (!CloudinaryConfig.instance) {
            CloudinaryConfig.instance = new CloudinaryConfig()
        }
        return CloudinaryConfig.instance
    }

    // VALIDATION: Ensure required environment variables are present
    private validateConfig(): void {
        const required = ['CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET']
        const missing = required.filter(key => !process.env[key])

        if (missing.length > 0) {
            throw new Error(`Missing required Cloudinary config: ${missing.join(', ')}`)
        }
    }

    // PERFORMANCE: Initialize once and reuse
    private initializeCloudinary(): void {
        if (!this.initialized) {
            cloudinary.config({
                cloud_name: env.CLOUDINARY_CLOUD_NAME,
                api_key: env.CLOUDINARY_API_KEY,
                api_secret: env.CLOUDINARY_API_SECRET,
                secure: true // SECURITY: Force HTTPS URLs
            })
            this.initialized = true
        }
    }

    // GETTER: Provide access to configured instance
    getCloudinary() {
        return cloudinary
    }
}

// EXPORT: Export singleton instance for consistent usage
export default CloudinaryConfig.getInstance().getCloudinary()
