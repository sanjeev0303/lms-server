import { CourseResponseDto, CreateCourseDto, UpdateCourseDto } from "../../dto/course.dto"

export interface ICourseService {
    createCourse(courseData: CreateCourseDto, creatorId: string): Promise<CourseResponseDto>
    getPublishedCourses(): Promise<CourseResponseDto[]>
     getCreatorCourses(creatorId: string): Promise<CourseResponseDto[]>
     getCourseById(courseId: string): Promise<CourseResponseDto>
     updateCourse(courseId: string, updateData: UpdateCourseDto, file?: Express.Multer.File): Promise<CourseResponseDto>
     deleteCourse(courseId: string): Promise<{ message: string }>
     checkCourseEnrollment(userId: string, courseId: string): Promise<{ isEnrolled: boolean }>
     getEnrolledCourses(userId: string): Promise<any[]>
     getCourseAnalytics(courseId: string, creatorId: string): Promise<any>
}
