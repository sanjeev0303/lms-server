import { CourseResponseDto } from "@/dto/course.dto";
import { CreateLectureDto, UpdateLectureDto, LectureResponseDto } from "@/dto/lecture.dto";

export interface ILectureService {
    createLecture(courseId: string, lectureData: CreateLectureDto
     ): Promise<{ lecture: LectureResponseDto}>
     getCourseLectures(courseId: string): Promise<{ lectures: LectureResponseDto[] }>
     getLectureById(lectureId: string): Promise<{ lecture: LectureResponseDto }>
     updateLecture(lectureId: string, updateData: UpdateLectureDto, file?: Express.Multer.File): Promise<LectureResponseDto>
     deleteLecture(lectureId: string): Promise<{ message: string }>
     reorderLectures(courseId: string, lectureOrders: { id: string; position: number }[]): Promise<{ message: string }>
}
