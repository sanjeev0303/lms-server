import {z} from "zod"


export const CreateLectureDtoSchema = z.object({
  title: z.string().min(3, 'Lecture title must be at least 3 characters'),
  description: z.string().optional(),
  isFree: z.boolean().optional()
});


// Update lecture request validation schema
export const UpdateLectureDtoSchema = z.object({
  title: z.string().min(3, 'Lecture title must be at least 3 characters').optional(),
  description: z.string().optional(),
  isFree: z.boolean().optional()
});

// Lecture params validation schema
export const LectureParamsSchema = z.object({
  lectureId: z.string().uuid('Invalid lecture ID format')
});

export type CreateLectureDto = z.infer<typeof CreateLectureDtoSchema>;
export type UpdateLectureDto = z.infer<typeof UpdateLectureDtoSchema>;
export type LectureParamsDto = z.infer<typeof LectureParamsSchema>;

export interface LectureResponseDto {
  id: string;
  title: string;
  description?: string;
  videoUrl?: string;
  isFree?: boolean;
  position?: number;
  courseId: string;
  createdAt: Date;
  updatedAt?: Date;
}
