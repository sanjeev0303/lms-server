import { prisma } from "@/config";
import { CreateLectureDto, UpdateLectureDto } from "@/dto/lecture.dto";
import { ILectrueRepository } from "@/interfaces/IRepository";
import { ILecture } from "@/types";
import { PrismaClient } from "@prisma/client";

export class LectureRepository implements ILectrueRepository{
    constructor( private readonly db: PrismaClient = prisma ){}

   async create(lectureData: CreateLectureDto, courseId: string): Promise<ILecture> {
        try {
            // Get the next position for this course
            const maxPosition = await this.db.lecture.aggregate({
                where: { courseId },
                _max: { position: true }
            });

            const nextPosition = (maxPosition._max.position || 0) + 1;

            const lecture = await this.db.lecture.create({
                data: {
                    title: lectureData.title,
                    description: lectureData.description,
                    isFree: lectureData.isFree || false,
                    position: nextPosition,
                    courseId
                }
            })

            return {
                id: lecture.id,
                title: lecture.title,
                description: lecture.description,
                videoUrl: lecture.videoUrl,
                isFree: lecture.isFree,
                position: lecture.position,
                courseId: lecture.courseId,
                createdAt: lecture.createdAt,
                updatedAt: lecture.updatedAt
            } as ILecture
        } catch (error) {
            console.error('Error creating lecture:', error);
            throw new Error('Failed to create lecture');
        }
    }

   /**
     * Find lecture by ID
    */
    async findById(id: string): Promise<ILecture | null> {
        try {
            const lecture = await this.db.lecture.findUnique({
                where: { id }
            });

            if (!lecture) {
                return null;
            }

            return {
                id: lecture.id,
                title: lecture.title,
                description: lecture.description,
                videoUrl: lecture.videoUrl,
                isFree: lecture.isFree,
                position: lecture.position,
                courseId: lecture.courseId,
                createdAt: lecture.createdAt,
                updatedAt: lecture.updatedAt
            } as ILecture
        } catch (error) {
            console.error('Error finding lecture by ID:', error);
            throw new Error('Database operation failed');
        }
    }

    /**
     * Get all lectures for a course
    */
    async findByCourse(courseId: string): Promise<ILecture[]> {
        try {
            const lectures = await this.db.lecture.findMany({
                where: { courseId },
                orderBy: { position: 'asc' }
            })

            return lectures.map(lecture => ({
                id: lecture.id,
                title: lecture.title,
                description: lecture.description,
                videoUrl: lecture.videoUrl,
                isFree: lecture.isFree,
                position: lecture.position,
                courseId: lecture.courseId,
                createdAt: lecture.createdAt,
                updatedAt: lecture.updatedAt
            })) as ILecture[]
        } catch (error) {
            console.error('Error finding lectures by course:', error);
            throw new Error('Failed to get course lectures');
        }
    }

    async update(id: string, updateData: UpdateLectureDto & { videoUrl?: string; }): Promise<ILecture | null> {
        try {
            const lecture = await this.db.lecture.update({
                where: { id },
                data: {
                    ...(updateData.title && { title: updateData.title }),
                    ...(updateData.description !== undefined && { description: updateData.description }),
                    ...(updateData.isFree !== undefined && { isFree: updateData.isFree }),
                    ...(updateData.videoUrl && { videoUrl: updateData.videoUrl })
                }
            });

            return {
                id: lecture.id,
                title: lecture.title,
                description: lecture.description,
                videoUrl: lecture.videoUrl,
                isFree: lecture.isFree,
                position: lecture.position,
                courseId: lecture.courseId,
                createdAt: lecture.createdAt,
                updatedAt: lecture.updatedAt
            } as ILecture;
        } catch (error) {
            console.error('Error updating lecture:', error);
            throw new Error('Failed to update lecture');
        }
    }

    async delete(id: string): Promise<boolean> {
        try {
            await this.db.lecture.delete({
                where: { id }
            });
            return true;
        } catch (error) {
            console.error('Error deleting lecture:', error);
            return false;
        }
    }

    /**
     * Bulk update lecture positions for reordering
     */
    async reorderLectures(courseId: string, lectureOrders: { id: string; position: number }[]): Promise<boolean> {
        try {
            console.log('🔄 Repository reorderLectures called with:', { courseId, lectureOrders });

            // Use transaction to ensure all updates succeed or fail together
            await this.db.$transaction(async (tx) => {
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
            return true;
        } catch (error) {
            console.error('❌ Error in repository reorderLectures:', error);
            throw new Error('Failed to reorder lectures');
        }
    }

}
