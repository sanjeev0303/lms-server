import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';

/**
 * Upload video file to Cloudinary from buffer (memory storage)
 * @param fileBuffer - File buffer from multer memory storage
 * @param fileName - Optional custom filename
 * @returns Promise with Cloudinary upload result
 */
export const uploadVideoToCloudinary = async (
  fileBuffer: Buffer,
  fileName?: string
): Promise<{ url: string; publicId: string }> => {
  try {
    // Upload video to Cloudinary using buffer
    const uploadResult = await new Promise<any>((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        {
          folder: 'lecture-videos', // Organize videos in a folder
          resource_type: 'video', // Specify it's a video
          public_id: fileName, // Use custom filename if provided
          quality: 'auto', // Automatic quality optimization
          format: 'mp4', // Convert to MP4 for better compatibility
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      ).end(fileBuffer);
    });

    return {
      url: uploadResult.secure_url,
      publicId: uploadResult.public_id
    };
  } catch (error) {
    console.error('Error uploading video to Cloudinary:', error);
    throw new Error('Failed to upload video');
  }
};

/**
 * Upload video file to Cloudinary from file path (disk storage)
 * @param filePath - Local file path
 * @param fileName - Optional custom filename
 * @returns Promise with Cloudinary upload result
 */
export const uploadVideoToCloudinaryFromPath = async (
  filePath: string,
  fileName?: string
): Promise<{ url: string; publicId: string }> => {
  try {
    // Upload video to Cloudinary
    const uploadResult = await cloudinary.uploader.upload(filePath, {
      folder: 'lecture-videos', // Organize videos in a folder
      resource_type: 'video', // Specify it's a video
      public_id: fileName, // Use custom filename if provided
      quality: 'auto', // Automatic quality optimization
      format: 'mp4', // Convert to MP4 for better compatibility
    });

    // Delete the local file after successful upload
    fs.unlinkSync(filePath);

    return {
      url: uploadResult.secure_url,
      publicId: uploadResult.public_id
    };
  } catch (error) {
    // Cleanup local file even if upload fails
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    console.error('Error uploading video to Cloudinary:', error);
    throw new Error('Failed to upload video');
  }
};

/**
 * Upload image file to Cloudinary from buffer (memory storage)
 * @param fileBuffer - File buffer from multer memory storage
 * @param fileName - Optional custom filename
 * @returns Promise with Cloudinary upload result
 */
export const uploadImageToCloudinary = async (
  fileBuffer: Buffer,
  fileName?: string
): Promise<{ url: string; publicId: string }> => {
  try {
    // Upload image to Cloudinary using buffer
    const uploadResult = await new Promise<any>((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        {
          folder: 'course-thumbnails', // Organize images in a folder
          resource_type: 'image',
          public_id: fileName,
          quality: 'auto',
          format: 'webp', // Convert to WebP for better compression
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      ).end(fileBuffer);
    });

    return {
      url: uploadResult.secure_url,
      publicId: uploadResult.public_id
    };
  } catch (error) {
    console.error('Error uploading image to Cloudinary:', error);
    throw new Error('Failed to upload image');
  }
};

/**
 * Upload image file to Cloudinary from file path (disk storage)
 * @param filePath - Local file path
 * @param fileName - Optional custom filename
 * @returns Promise with Cloudinary upload result
 */
export const uploadImageToCloudinaryFromPath = async (
  filePath: string,
  fileName?: string
): Promise<{ url: string; publicId: string }> => {
  try {
    // Upload image to Cloudinary
    const uploadResult = await cloudinary.uploader.upload(filePath, {
      folder: 'course-thumbnails', // Organize images in a folder
      resource_type: 'image',
      public_id: fileName,
      quality: 'auto',
      format: 'webp', // Convert to WebP for better compression
    });

    // Delete the local file after successful upload
    fs.unlinkSync(filePath);

    return {
      url: uploadResult.secure_url,
      publicId: uploadResult.public_id
    };
  } catch (error) {
    // Cleanup local file even if upload fails
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    console.error('Error uploading image to Cloudinary:', error);
    throw new Error('Failed to upload image');
  }
};

/**
 * Delete file from Cloudinary
 * @param publicId - Cloudinary public ID
 * @param resourceType - 'image' or 'video'
 */
export const deleteFromCloudinary = async (
  publicId: string,
  resourceType: 'image' | 'video' = 'image'
): Promise<boolean> => {
  try {
    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType
    });
    return result.result === 'ok';
  } catch (error) {
    console.error('Error deleting from Cloudinary:', error);
    return false;
  }
};
