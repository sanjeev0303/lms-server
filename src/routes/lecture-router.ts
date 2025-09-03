import upload from '@/config/multer';
import { LectureController } from '@/controllers/lecture-controller';
import { CreateLectureDtoSchema } from '@/dto/lecture.dto';
import { authenticateJWT } from '../middleware/jwt-auth';
import { LectureRepository } from '@/repositories/lecture-repository';
import { LectureService } from '@/services/lecture-service';
import { validateRequest } from '@/utils/validator';
import express from 'express';
import z from 'zod';
import { authenticateToken } from '@/middleware/auth';
import { prisma } from '@/config';

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

// register route
router.post("/create-lecture/:courseId", authenticateToken, validateRequest({ body: CreateLectureDtoSchema }), lectureController.createLecture)

// Get all lectures of a course (public route - allow non-authenticated users to view lectures)
router.get("/lectures/:courseId", validateRequest({ params: CourseParamsSchema}), lectureController.getCourseLectures)

// Get a single lecture by ID (public route - allow non-authenticated users to view lecture details)
router.get("/:lectureId", validateRequest({ params: LectureParamsSchema }), lectureController.getLectureById)

// Update a lecture
router.put("/:lectureId", authenticateToken, upload.single('video'), validateRequest({ params: LectureParamsSchema }), lectureController.updateLecture)

// Delete a lecture
router.delete("/:lectureId", authenticateToken, validateRequest({ params: LectureParamsSchema }), lectureController.deleteLecture)

// Reorder lectures for a course - temporary direct implementation
router.post("/reorder/:courseId", authenticateToken, async (req: any, res: any) => {
    try {
        console.log('Reorder request received:');
        console.log('- courseId:', req.params.courseId);
        console.log('- body:', JSON.stringify(req.body, null, 2));
        console.log('- user:', req.user?.userId);

        const { courseId } = req.params;
        const { lectureOrders } = req.body;

        if (!courseId) {
            console.log('❌ Missing courseId');
            return res.status(400).json({ success: false, message: 'Course ID is required' });
        }

        if (!lectureOrders || !Array.isArray(lectureOrders)) {
            console.log('❌ Invalid lectureOrders:', lectureOrders);
            return res.status(400).json({ success: false, message: 'Valid lecture orders array is required' });
        }

        // Validate lecture orders format
        for (const order of lectureOrders) {
            if (!order.id || typeof order.position !== 'number') {
                console.log('❌ Invalid order format:', order);
                return res.status(400).json({ success: false, message: 'Each lecture order must have id and position' });
            }
        }

        console.log('✅ Implementing direct database transaction...');

        // Direct implementation using prisma
        await prisma.$transaction(async (tx) => {
            for (const { id, position } of lectureOrders) {
                console.log(`📝 Updating lecture ${id} to position ${position}`);
                await tx.lecture.update({
                    where: {
                        id,
                        courseId // Ensure lecture belongs to the specified course
                    },
                    data: { position }
                });
            }
        });

        console.log('✅ Transaction completed successfully');

        return res.status(200).json({
            success: true,
            message: 'Lectures reordered successfully'
        });
    } catch (error) {
        const err = error as Error;
        console.error('❌ Error reordering lectures:', err.message);
        console.error('- Error name:', err.name);
        console.error('- Error message:', err.message);
        console.error('- Error stack:', err.stack);
        return res.status(500).json({
          error: 'Failed to reorder lectures',
          details: err.message
        });
    }
});

export default router;
