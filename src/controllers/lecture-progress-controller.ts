import { Request, Response } from "express";
import { LectureProgressService } from "@/services";
import { CourseRepository, UserRepository } from "@/repositories";
import { ResponseHandler } from "@/utils/api-response";
import { AuthenticatedRequest } from "@/middleware/auth";
import { prisma } from "@/config";

export class LectureProgressController {
    private lectureProgressService: LectureProgressService;

    constructor() {
        this.lectureProgressService = new LectureProgressService(
            prisma,
            new CourseRepository(),
            new UserRepository()
        );
    }

    /**
     * Get lecture progress for a course
     */
    getCourseLectureProgress = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
        try {
            const { courseId } = req.params;
            const userId = req.user?.userId;

            if (!courseId) {
                ResponseHandler.error(res, 'Course ID is required', 400);
                return;
            }

            // If user is not authenticated, return empty progress array
            if (!userId) {
                ResponseHandler.success(res, [], 'No user authentication - returning empty progress');
                return;
            }

            const progress = await this.lectureProgressService.getCourseLectureProgress(userId, courseId as string);

            ResponseHandler.success(res, progress, 'Lecture progress retrieved successfully');
        } catch (error) {
            console.error('Get course lecture progress error:', error);
            const message = error instanceof Error ? error.message : 'Failed to get lecture progress';
            ResponseHandler.error(res, message, 500);
        }
    };

    /**
     * Get specific lecture progress
     */
    getLectureProgress = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
        try {
            const { lectureId } = req.params;
            const userId = req.user?.userId;

            console.log(`🎯 CONTROLLER: Getting specific lecture progress for User: ${userId}, Lecture: ${lectureId}`);

            if (!lectureId) {
                ResponseHandler.error(res, 'Lecture ID is required', 400);
                return;
            }

            if (!userId) {
                ResponseHandler.error(res, 'User not authenticated', 401);
                return;
            }

            const progress = await this.lectureProgressService.getUserLectureProgress(userId, lectureId as string);

            ResponseHandler.success(res, progress, 'Lecture progress retrieved successfully');
        } catch (error) {
            console.error('Get lecture progress error:', error);
            const message = error instanceof Error ? error.message : 'Failed to get lecture progress';
            ResponseHandler.error(res, message, 500);
        }
    };

    /**
     * Mark lecture as completed
     */
    completeLecture = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
        try {
            const { lectureId, courseId } = req.params;
            const userId = req.user?.userId;

            if (!lectureId) {
                ResponseHandler.error(res, 'Lecture ID is required', 400);
                return;
            }

            if (!courseId) {
                ResponseHandler.error(res, 'Course ID is required', 400);
                return;
            }

            if (!userId) {
                ResponseHandler.error(res, 'User not authenticated', 401);
                return;
            }

            await this.lectureProgressService.completeLecture(userId, lectureId as string, courseId as string);

            ResponseHandler.success(res, null, 'Lecture marked as completed successfully');
        } catch (error) {
            console.error('Complete lecture error:', error);
            const message = error instanceof Error ? error.message : 'Failed to complete lecture';
            ResponseHandler.error(res, message, 500);
        }
    };

    /**
     * Update lecture progress (watch time, etc.)
     */
    updateLectureProgress = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
        try {
            const { lectureId, courseId } = req.params;
            const { isCompleted, watchedAt } = req.body;
            const userId = req.user?.userId;

            if (!lectureId) {
                ResponseHandler.error(res, 'Lecture ID is required', 400);
                return;
            }

            if (!courseId) {
                ResponseHandler.error(res, 'Course ID is required', 400);
                return;
            }

            if (!userId) {
                ResponseHandler.error(res, 'User not authenticated', 401);
                return;
            }

            const updateData: any = {};
            if (isCompleted !== undefined) {
                updateData.isCompleted = isCompleted;
                if (isCompleted) {
                    updateData.completedAt = new Date();
                }
            }
            if (watchedAt) {
                updateData.watchedAt = new Date(watchedAt);
            }

            await this.lectureProgressService.upsertLectureProgress(userId, lectureId as string, courseId as string, updateData);

            // If lecture is completed, try to unlock next lecture
            if (isCompleted) {
                await this.lectureProgressService.completeLecture(userId, lectureId as string, courseId as string);
            }

            ResponseHandler.success(res, null, 'Lecture progress updated successfully');
        } catch (error) {
            console.error('Update lecture progress error:', error);
            const message = error instanceof Error ? error.message : 'Failed to update lecture progress';
            ResponseHandler.error(res, message, 500);
        }
    };
}
