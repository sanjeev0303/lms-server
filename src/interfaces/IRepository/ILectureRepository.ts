import { CreateLectureDto, UpdateLectureDto } from "@/dto/lecture.dto";
import { ILecture } from "@/types";

export interface ILectrueRepository {
    create(lectureData: CreateLectureDto, courseId: string): Promise<ILecture>
    findById(id: string): Promise<ILecture | null>;
    findByCourse(courseId: string): Promise<ILecture[]>
    update(id: string, updateData: UpdateLectureDto & { videoUrl?: string }): Promise<ILecture | null>
    delete(id: string): Promise<boolean>
    reorderLectures(courseId: string, lectureOrders: { id: string; position: number }[]): Promise<boolean>
}
