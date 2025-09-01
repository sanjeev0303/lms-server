import { CreateCourseDto, UpdateCourseDto } from "@/dto/course.dto"
import { ICourse } from "@/types"

export interface ICourseRepository {
    create(courseData: CreateCourseDto, creatorId: string): Promise<ICourse>
    findById(id: string): Promise<ICourse | null>
    findPublishedCourses(): Promise<ICourse[]>
    findByCreator(creatorId: string): Promise<ICourse[]>
    update(id: string, updateData: UpdateCourseDto & { thumbnail?: string }): Promise<ICourse | null>
    delete(id: string): Promise<boolean>
    searchCourses(query: string): Promise<ICourse[]>
    enrollStudent(courseId: string, studentId: string): Promise<boolean>
    enrollStudentWithOrder(courseId: string, studentId: string, orderId: string): Promise<boolean>
    findEnrollment(userId: string, courseId: string): Promise<any | null>
    findEnrolledCourses(userId: string): Promise<any[]>
    findByIdWithAnalytics(id: string): Promise<ICourse | null>
}
