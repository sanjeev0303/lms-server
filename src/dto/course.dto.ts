import { z } from 'zod';
import { Level } from '@prisma/client';

/**
 * Data Transfer Objects for Course operations
 */

// Create course request validation schema
export const CreateCourseDtoSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  category: z.string().min(2, 'Category is required')
});

// Update course request validation schema
export const UpdateCourseDtoSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').optional(),
  subTitle: z.string().max(200, 'Subtitle must be less than 200 characters').optional(),
  description: z.string().max(5000, 'Description must be less than 5000 characters').optional(),
  category: z.string().min(2, 'Category is required').optional(),
  level: z.nativeEnum(Level).optional(),
  price: z.union([z.number(), z.string()]).optional(), // Accept both number and string
  thumbnail: z.string().optional(),
  isPublished: z.union([z.boolean(), z.string()]).optional() // Accept both boolean and string
});


// Type definitions from schemas
export type CreateCourseDto = z.infer<typeof CreateCourseDtoSchema>;
export type UpdateCourseDto = z.infer<typeof UpdateCourseDtoSchema>;



// Response DTOs
export interface CourseResponseDto {
  id: string;
  title: string;
  subTitle?: string;
  description?: string;
  category: string;
  level?: Level;
  price?: number;
  thumbnail?: string;
  isPublished: boolean;
  creatorId: string;
  createdAt: Date;
  updatedAt: Date;
  lectures?: LectureResponseDto[];
  reviews?: any[];
  creator?: {
    id: string;
    name: string;
    email: string;
    photoUrl?: string;
  };
  _count?: {
    lectures: number;
    enrollments: number;
    orders?: number;
  };
  orders?: any[];
  revenue?: number;
}

export interface LectureResponseDto {
  id: string;
  lectureTitle: string;
  videoUrl?: string;
  isPreviewFree?: boolean;
  courseId: string;
  createdAt: Date;
  updatedAt: Date;
}
