import { ICourseRepository, IAuthRepository } from "@/interfaces/IRepository";
import { ILecture } from "@/types";
import { prisma } from "@/config";
import { PrismaClient } from "@prisma/client";

export class LectureProgressService {
    constructor(
        private readonly db: PrismaClient = prisma,
        private readonly courseRepository: ICourseRepository,
        private readonly userRepository?: IAuthRepository
    ) {}

    /**
     * Initialize lecture progress for a newly enrolled student
     * Unlocks free lectures and the first paid lecture if enrolled
     */
    async initializeLectureProgress(clerkUserId: string, courseId: string): Promise<void> {
        try {
            const userId = await this.resolveUserId(clerkUserId);
            // Get all lectures for the course
            const course = await this.courseRepository.findById(courseId);
            if (!course?.lectures) {
                throw new Error('Course or lectures not found');
            }

            // Check if user is enrolled
            const enrollment = await this.courseRepository.findEnrollment(userId, courseId);
            const isEnrolled = !!enrollment;

            // Sort lectures by position
            const sortedLectures = course.lectures.sort((a: ILecture, b: ILecture) => (a.position || 0) - (b.position || 0));

            for (let i = 0; i < sortedLectures.length; i++) {
                const lecture = sortedLectures[i];
                if (!lecture) {
                    console.warn(`Lecture at index ${i} is undefined, skipping`);
                    continue;
                }

                const isFirstLecture = i === 0;
                const isFree = lecture.isFree;

                // Determine if lecture should be unlocked
                let shouldUnlock = false;
                if (isFree) {
                    shouldUnlock = true; // Always unlock free lectures
                } else if (isEnrolled && isFirstLecture) {
                    shouldUnlock = true; // Unlock first paid lecture for enrolled students
                } else if (isEnrolled) {
                    // For other paid lectures, unlock if previous lecture is completed
                    const previousLecture = sortedLectures[i - 1];
                    if (previousLecture) {
                        const previousProgress = await this.getUserLectureProgress(userId, previousLecture.id);
                        shouldUnlock = previousProgress?.isCompleted || false;
                    }
                }

                // Create or update progress record
                await this.upsertLectureProgress(userId, lecture.id, courseId, {
                    isUnlocked: shouldUnlock
                });
            }
        } catch (error) {
            console.error('Error initializing lecture progress:', error);
            throw new Error('Failed to initialize lecture progress');
        }
    }

    /**
     * Get user's progress for a specific lecture
     */
    async getUserLectureProgress(clerkUserId: string, lectureId: string) {
        try {
            const userId = await this.resolveUserId(clerkUserId);
            return await this.db.userLectureProgress.findUnique({
                where: {
                    userId_lectureId: {
                        userId,
                        lectureId
                    }
                }
            });
        } catch (error) {
            console.error('Error getting lecture progress:', error);
            return null;
        }
    }

    /**
     * Update or create lecture progress
     */
    async upsertLectureProgress(
        userId: string,
        lectureId: string,
        courseId: string,
        data: {
            isCompleted?: boolean;
            isUnlocked?: boolean;
            watchedAt?: Date;
            completedAt?: Date;
        }
    ) {
        try {
            return await this.db.userLectureProgress.upsert({
                where: {
                    userId_lectureId: {
                        userId,
                        lectureId
                    }
                },
                update: {
                    ...data,
                    updatedAt: new Date()
                },
                create: {
                    userId,
                    lectureId,
                    courseId,
                    isCompleted: data.isCompleted || false,
                    isUnlocked: data.isUnlocked || false,
                    watchedAt: data.watchedAt,
                    completedAt: data.completedAt
                }
            });
        } catch (error) {
            console.error('Error upserting lecture progress:', error);
            throw new Error('Failed to update lecture progress');
        }
    }

    /**
     * Mark lecture as completed and unlock next lecture
     */
    async completeLecture(clerkUserId: string, lectureId: string, courseId: string): Promise<void> {
        try {
            // Resolve internal user ID from Clerk ID
            const userId = await this.resolveUserId(clerkUserId);

            // Mark current lecture as completed
            await this.upsertLectureProgress(userId, lectureId, courseId, {
                isCompleted: true,
                completedAt: new Date()
            });

            // Get course lectures to find the next one
            const course = await this.courseRepository.findById(courseId);
            if (!course?.lectures) return;

            const sortedLectures = course.lectures.sort((a: ILecture, b: ILecture) => (a.position || 0) - (b.position || 0));
            const currentIndex = sortedLectures.findIndex((l: ILecture) => l.id === lectureId);

            // Unlock next lecture if it exists and user is enrolled
            if (currentIndex !== -1 && currentIndex < sortedLectures.length - 1) {
                const nextLecture = sortedLectures[currentIndex + 1];
                const enrollment = await this.courseRepository.findEnrollment(userId, courseId);

                if (enrollment && nextLecture) {
                    await this.upsertLectureProgress(userId, nextLecture.id, courseId, {
                        isUnlocked: true
                    });
                }
            }
        } catch (error) {
            console.error('Error completing lecture:', error);
            throw new Error('Failed to complete lecture');
        }
    }

    /**
     * Get all lecture progress for a course
     */
    async getCourseLectureProgress(clerkUserId: string, courseId: string) {
        try {
            const userId = await this.resolveUserId(clerkUserId);
            return await this.db.userLectureProgress.findMany({
                where: {
                    userId,
                    courseId
                },
                include: {
                    lecture: true
                },
                orderBy: {
                    lecture: {
                        position: 'asc'
                    }
                }
            });
        } catch (error) {
            console.error('Error getting course lecture progress:', error);
            throw new Error('Failed to get course lecture progress');
        }
    }

    /**
     * Helper method to resolve internal user ID from Clerk ID
     */
    private async resolveUserId(clerkUserId: string): Promise<string> {
        if (!this.userRepository) {
            // If no user repository, assume it's already an internal ID
            return clerkUserId;
        }

        const user = await this.userRepository.findByClerkId(clerkUserId);
        if (!user) {
            throw new Error(`User not found for Clerk ID: ${clerkUserId}`);
        }
        return user.id;
    }
}
