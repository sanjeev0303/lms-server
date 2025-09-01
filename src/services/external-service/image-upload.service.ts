import { IImageUploadService } from "@/interfaces/IService/IExternalService"
import cloudinary from "@/config/cloudinary"


const UPLOAD_PRESETS = {
    profile: {
        width: 400,
        height: 400,
        crop: 'fill',
        gravity: 'face',
        quality: 'auto:good',
        format: 'webp' // PERFORMANCE: Modern format for better compression
    },
    avatar: {
        width: 150,
        height: 150,
        crop: 'fill',
        gravity: 'face',
        quality: 'auto:good',
        format: 'webp'
    },
    general: {
        width: 1200,
        height: 1200,
        crop: 'limit',
        quality: 'auto:good',
        format: 'webp'
    }
} as const


export class ImageUploadService implements IImageUploadService {
    async uploadImage(
        buffer: Buffer,
        folder: string = 'uploads',
        preset: keyof typeof UPLOAD_PRESETS = 'general'
    ): Promise<string> {
        try {
            // VALIDATION: Check buffer size and content
            if (!buffer || buffer.length === 0) {
                throw new Error('Invalid image buffer provided')
            }

            // PERFORMANCE: Use optimized transformation preset
            const transformation = UPLOAD_PRESETS[preset]

            return new Promise((resolve, reject) => {
                const uploadStream = cloudinary.uploader.upload_stream(
                    {
                        resource_type: 'image',
                        folder,
                        transformation: [transformation],
                        // SECURITY: Generate unique public ID
                        public_id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                        // PERFORMANCE: Optimize delivery
                        fetch_format: 'auto',
                        quality: 'auto'
                    },
                    (error: any, result: any) => {
                        if (error) {
                            console.error('Cloudinary upload error:', error)
                            reject(new Error(`Image upload failed: ${error.message}`))
                        } else if (!result) {
                            reject(new Error('Upload completed but no result received'))
                        } else {
                            // SUCCESS: Return secure URL
                            resolve(result.secure_url)
                        }
                    }
                )

                // PERFORMANCE: Stream the buffer for better memory usage
                uploadStream.end(buffer)
            })
        } catch (error) {
            console.error('Image upload service error:', error)
            throw new Error(`Failed to upload image: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
    }

    // UTILITY: Delete image from Cloudinary
    async deleteImage(publicId: string): Promise<boolean> {
        try {
            const result = await cloudinary.uploader.destroy(publicId)
            return result.result === 'ok'
        } catch (error) {
            console.error('Image deletion error:', error)
            return false
        }
    }

    // UTILITY: Get optimized image URL with transformations
    getOptimizedUrl(publicId: string, preset: keyof typeof UPLOAD_PRESETS = 'general'): string {
        const transformation = UPLOAD_PRESETS[preset]
        return cloudinary.url(publicId, { transformation })
    }
}
