import multer from 'multer';
import path from 'path';
import { v2 as cloudinary } from 'cloudinary';
import * as env from '../env/index';

// Configure Cloudinary only if credentials are available
const isCloudinaryConfigured =
    env.CLOUDINARY_CLOUD_NAME &&
    env.CLOUDINARY_API_KEY &&
    env.CLOUDINARY_API_SECRET &&
    env.CLOUDINARY_CLOUD_NAME !== 'demo';

if (isCloudinaryConfigured) {
    cloudinary.config({
        cloud_name: env.CLOUDINARY_CLOUD_NAME,
        api_key: env.CLOUDINARY_API_KEY,
        api_secret: env.CLOUDINARY_API_SECRET,
    });
    console.log('✅ Cloudinary configured successfully');
} else {
    console.log('⚠️  Cloudinary not configured - using local storage');
}

// Enhanced file type validation
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/avif'];
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/ogg'];
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.avif', '.mp4', '.webm', '.ogg'];

// Memory storage configuration for Cloudinary upload
const storage = multer.memoryStorage();

// Enhanced file filter with security checks
const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    try {
        // Check file extension
        const ext = path.extname(file.originalname).toLowerCase();
        if (!ALLOWED_EXTENSIONS.includes(ext)) {
            return cb(new Error(`File extension ${ext} not allowed. Allowed: ${ALLOWED_EXTENSIONS.join(', ')}`));
        }

        // Check MIME type
        const isAllowedImage = ALLOWED_IMAGE_TYPES.includes(file.mimetype);
        const isAllowedVideo = ALLOWED_VIDEO_TYPES.includes(file.mimetype);

        if (!isAllowedImage && !isAllowedVideo) {
            return cb(new Error(`MIME type ${file.mimetype} not allowed`));
        }

        // Check filename for suspicious patterns
        if (file.originalname.includes('..') || file.originalname.includes('/') || file.originalname.includes('\\')) {
            return cb(new Error('Invalid filename detected'));
        }

        cb(null, true);
    } catch (error) {
        cb(error as Error);
    }
};

// Enhanced multer configuration
const upload = multer({
    storage: storage,
    limits: {
        fileSize: 100 * 1024 * 1024, // 100MB limit
        files: 1, // Only one file at a time
        fieldSize: 1024 * 1024, // 1MB field size limit
    },
    fileFilter: fileFilter
});

export default upload;
export { isCloudinaryConfigured, ALLOWED_IMAGE_TYPES, ALLOWED_VIDEO_TYPES };
