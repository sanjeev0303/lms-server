import { Router } from 'express';
import { LectureProgressController } from '@/controllers';
import { authenticateToken } from '@/middleware/auth';

const router = Router();
const lectureProgressController = new LectureProgressController();


// Get lecture progress for a course (optional auth - returns empty if not logged in)
router.get('/course/:courseId', authenticateToken, lectureProgressController.getCourseLectureProgress);

// Get specific lecture progress (requires auth for user-specific data)
router.get('/lecture/:lectureId', authenticateToken, lectureProgressController.getLectureProgress);

// Mark lecture as completed (requires authentication)
router.post('/lecture/:lectureId/course/:courseId/complete', authenticateToken, lectureProgressController.completeLecture);

// Update lecture progress (general update endpoint - requires authentication)
router.put('/lecture/:lectureId/course/:courseId', authenticateToken, lectureProgressController.updateLectureProgress);

export default router;
