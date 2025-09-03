import { CourseResponseDto } from "@/dto/course.dto";
import { CreateLectureDto, UpdateLectureDto, LectureResponseDto } from "@/dto/lecture.dto";
import { ILectureService } from "@/interfaces/IService/ILectureService";
import { ILectrueRepository } from "@/interfaces/IRepository/ILectureRepository"
import { ILecture } from "@/types";
import { uploadVideoToCloudinary } from "@/utils/cloudinary";

export class LectureService implements ILectureService{
    constructor( private readonly lectureRepository: ILectrueRepository ){}

    async createLecture(courseId: string, lectureData: CreateLectureDto): Promise<{ lecture: LectureResponseDto }> {

       // Create lecture
      const lecture = await this.lectureRepository.create(lectureData, courseId);

      return{
        lecture: {
          id: lecture.id,
          title: lecture.title,
          description: lecture.description,
          videoUrl: lecture.videoUrl || "",
          isFree: lecture.isFree || false,
          position: lecture.position,
          courseId: lecture.courseId,
          createdAt: lecture.createdAt,
          updatedAt: lecture.updatedAt || new Date()
        }
      }
    }
    async getCourseLectures(courseId: string): Promise<{ lectures: LectureResponseDto[] }> {
        try {
            const lectures = await this.lectureRepository.findByCourse(courseId);
            return {
                lectures: lectures.map((lecture: ILecture) => ({
                    id: lecture.id,
                    title: lecture.title,
                    description: lecture.description,
                    videoUrl: lecture.videoUrl,
                    isFree: lecture.isFree,
                    position: lecture.position,
                    courseId: lecture.courseId,
                    createdAt: lecture.createdAt,
                    updatedAt: lecture.updatedAt || lecture.createdAt
                }))
            };
        } catch (error) {
            throw error;
        }
    }

    async getLectureById(lectureId: string): Promise<{ lecture: LectureResponseDto }> {
        try {
            const lecture = await this.lectureRepository.findById(lectureId);

            if (!lecture) {
                throw new Error('Lecture not found');
            }

            return {
                lecture: {
                    id: lecture.id,
                    title: lecture.title,
                    description: lecture.description,
                    videoUrl: lecture.videoUrl,
                    isFree: lecture.isFree,
                    position: lecture.position,
                    courseId: lecture.courseId,
                    createdAt: lecture.createdAt,
                    updatedAt: lecture.updatedAt || lecture.createdAt
                }
            };
        } catch (error) {
            throw error;
        }
    }
    async updateLecture(lectureId: string, updateData: UpdateLectureDto, file?: Express.Multer.File): Promise<LectureResponseDto> {
        try {
            let videoUrl = undefined;

            // Handle video file upload if provided
            if (file) {
                console.log('Uploading video to Cloudinary:', file.originalname);
                const uploadResult = await uploadVideoToCloudinary(
                    file.buffer, // Use buffer instead of path for memory storage
                    `lecture-${lectureId}-${Date.now()}`
                );
                videoUrl = uploadResult.url;
                console.log('Video uploaded successfully:', videoUrl);
            }

            const updatedLecture = await this.lectureRepository.update(lectureId, {
                ...updateData,
                ...(videoUrl && { videoUrl })
            });

            if (!updatedLecture) {
                throw new Error('Lecture not found or update failed');
            }

            return {
                id: updatedLecture.id,
                title: updatedLecture.title,
                description: updatedLecture.description,
                videoUrl: updatedLecture.videoUrl,
                isFree: updatedLecture.isFree,
                position: updatedLecture.position,
                courseId: updatedLecture.courseId,
                createdAt: updatedLecture.createdAt,
                updatedAt: updatedLecture.updatedAt || updatedLecture.createdAt
            };
        } catch (error) {
            console.error('Error updating lecture:', error);
            throw error;
        }
    }
    async deleteLecture(lectureId: string): Promise<{ message: string; }> {
        try {
            const deleted = await this.lectureRepository.delete(lectureId);

            if (!deleted) {
                throw new Error('Lecture not found or deletion failed');
            }

            return { message: 'Lecture deleted successfully' };
        } catch (error) {
            throw error;
        }
    }

    async reorderLectures(courseId: string, lectureOrders: { id: string; position: number }[]): Promise<{ message: string }> {
        try {
            console.log('🔄 Service reorderLectures called with:', { courseId, lectureOrders });
            await this.lectureRepository.reorderLectures(courseId, lectureOrders);
            console.log('✅ Repository reorderLectures completed successfully');
            return { message: 'Lectures reordered successfully' };
        } catch (error) {
            console.error('❌ Error in service reorderLectures:', error);
            throw error;
        }
    }

}
