import upload from '@/config/multer';
import { LectureController } from '@/controllers';
import { CreateLectureDtoSchema } from '@/dto/lecture.dto';
import { authenticateJWT } from '../middleware/jwt-auth';
import { LectureRepository } from '@/repositories/lecture-repository';
import { LectureService } from '@/services/lecture-service';
import { validateRequest } from '@/utils/validator';
import express from 'express';
import z from 'zod';
import { authenticateToken } from '@/middleware/auth';

const router = express.Router();

// Parameter validation schemas
const CourseParamsSchema = z.object({
    courseId: z.string().cuid('Invalid course ID format')
});

const LectureParamsSchema = z.object({
    lectureId: z.string().cuid('Invalid lecture ID format')
});



// Initialize dependencies
const lectureRepository = new LectureRepository
const lectureService = new LectureService(lectureRepository)
const lectureController = new LectureController(lectureService)


// resigter route
router.post("/create-lecture/:courseId", authenticateToken, validateRequest({ body: CreateLectureDtoSchema }), lectureController.createLecture)

// Get all lectures of a course (public route - allow non-authenticated users to view lectures)
router.get("/lectures/:courseId", validateRequest({ params: CourseParamsSchema}), lectureController.getCourseLectures)

// Get a single lecture by ID (public route - allow non-authenticated users to view lecture details)
router.get("/:lectureId", validateRequest({ params: LectureParamsSchema }), lectureController.getLectureById)

// Update a lecture
router.put("/:lectureId", authenticateToken, upload.single('video'), validateRequest({ params: LectureParamsSchema }), lectureController.updateLecture)

// Delete a lecture
router.delete("/:lectureId", authenticateToken, validateRequest({ params: LectureParamsSchema }), lectureController.deleteLecture)


export default router;
