import { CourseController } from '@/controllers'
import { authenticateJWT } from '../middleware/jwt-auth'
import { CourseRepository } from '@/repositories/course-repository'
import { UserRepository } from '@/repositories/auth-repository'
import { CourseService } from '@/services/course-service'
import { CreateCourseDtoSchema, UpdateCourseDtoSchema } from '../dto/course.dto'
import express from 'express'
import upload from '@/config/multer'
import z from 'zod'
import { validateRequest } from '@/utils/validator'
import { authenticateToken } from '@/middleware/auth'


const router = express.Router()

const courseRepository = new CourseRepository
const userRepository = new UserRepository
const courseService = new CourseService(courseRepository)
const courseController = new CourseController(courseService, userRepository)


// Parameter validation schemas
const CourseParamsSchema = z.object({
    courseId: z.string().cuid('Invalid course ID format')
});

// Create a new course
router.post(
    '/create',
    authenticateToken,
    validateRequest({ body: CreateCourseDtoSchema }),
    courseController.createCourse
);


// Get courses created by specific user
router.get("/creator-courses", authenticateToken, courseController.getCreatorCourses)

// Get all published courses (public route)
router.get("/published", courseController.getPublishedCourses)

// Get enrolled courses for the authenticated user
router.get("/enrolled", authenticateToken, courseController.getEnrolledCourses)

// Get course by ID (public route - allow non-authenticated users to view course details)
router.get("/:courseId", validateRequest({ params: CourseParamsSchema }), courseController.getCourseById)

// Check course enrollment status
router.get("/:courseId/enrollment", authenticateToken, validateRequest({ params: CourseParamsSchema }), courseController.checkCourseEnrollment)

// Update course information
router.post(
    '/editcourse/:courseId',
    authenticateToken,
    upload.single('thumbnail'),
    validateRequest({
        params: CourseParamsSchema
        // Remove body validation since multipart/form-data might have partial data
    }),
    courseController.updateCourse
);

// Delete course
router.delete("/:courseId", authenticateToken, validateRequest({ params: CourseParamsSchema }), courseController.deleteCourse)

// Get course analytics
router.get("/:courseId/analytics", authenticateToken, validateRequest({ params: CourseParamsSchema }), courseController.getCourseAnalytics)

export default router
