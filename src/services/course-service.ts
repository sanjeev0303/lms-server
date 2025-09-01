import cloudinary from "@/config/cloudinary";
import uploadOnCloudinary from "@/config/cloudinary";
import { CreateCourseDto, CourseResponseDto, UpdateCourseDto } from "@/dto/course.dto";
import { ICourseRepository } from "@/interfaces/IRepository/ICourseRepository";
import { ICourseService } from "@/interfaces/IService/ICourseService";
import { Level } from '@prisma/client';

export class CourseService implements ICourseService {
    constructor(private readonly courseRepository: ICourseRepository) { }


    async createCourse(courseData: CreateCourseDto, creatorId: string): Promise<CourseResponseDto> {
        try {
            const course = await this.courseRepository.create(courseData, creatorId)

            return {
                id: course.id,
                title: course.title,
                subTitle: course.subTitle || "",
                description: course.description || "",
                category: course.category,
                ...(course.level && { level: course.level as Level }),
                price: course.price || 0,
                thumbnail: course.thumbnail || "",
                isPublished: course.isPublished,
                creatorId: course.creatorId,
                createdAt: course.createdAt,
                updatedAt: course.updatedAt || new Date()
            }
        } catch (error) {
            console.error('Create course service error:', error);
            throw new Error('Failed to create course');
        }
    }

    /**
     * Get courses created by a specific user
    */
    async getCreatorCourses(creatorId: string): Promise<CourseResponseDto[]> {
        try {
            const courses = await this.courseRepository.findByCreator(creatorId)

            return courses.map((course) => ({
                id: course.id,
                title: course.title,
                subTitle: course.subTitle || "",
                description: course.description || "",
                category: course.category,
                ...(course.level && { level: course.level as Level }),
                price: course.price || 0,
                thumbnail: course.thumbnail || "",
                isPublished: course.isPublished,
                creatorId: course.creatorId,
                createdAt: course.createdAt,
                updatedAt: course.updatedAt || new Date(),
                lectures: (course as any).lectures || [],
                reviews: [], // No reviews field in schema yet
                _count: (course as any)._count || { enrollments: 0, orders: 0 },
                orders: (course as any).orders || [],
                revenue: ((course as any).orders || []).reduce((total: number, order: any) => {
                    return total + (order.isPaid ? order.amount : 0);
                }, 0)
            }))
        } catch (error) {
            console.error('Get creator courses service error:', error);
            throw new Error('Failed to get creator courses');
        }
    }

    /**
     * Get all published courses
    */
    async getPublishedCourses(): Promise<CourseResponseDto[]> {
        try {
            const courses = await this.courseRepository.findPublishedCourses()

            return courses.map((course) => ({
                id: course.id,
                title: course.title,
                subTitle: course.subTitle || "",
                description: course.description || "",
                category: course.category,
                ...(course.level && { level: course.level as Level }),
                price: course.price || 0,
                thumbnail: course.thumbnail || "",
                isPublished: course.isPublished,
                creatorId: course.creatorId,
                createdAt: course.createdAt,
                updatedAt: course.updatedAt || new Date(),
                lectures: (course as any).lectures || [],
                reviews: [], // No reviews field in schema yet
                creator: (course as any).creator ? {
                    id: (course as any).creator.id,
                    name: (course as any).creator.name,
                    email: (course as any).creator.email,
                    photoUrl: (course as any).creator.photoUrl
                } : undefined,
                _count: (course as any)._count ? {
                    lectures: (course as any)._count.lectures || 0,
                    enrollments: (course as any)._count.enrollments || 0
                } : undefined
            }))
        } catch (error) {
            console.error('Get published courses service error:', error);
            throw new Error('Failed to get published courses');
        }
    }

    /**
     * Get course by ID
    */
    async getCourseById(courseId: string): Promise<CourseResponseDto> {
        try {
            const course = await this.courseRepository.findById(courseId);

            if (!course) {
                throw new Error('Course not found');
            }

            return {
                id: course.id,
                title: course.title,
                subTitle: course.subTitle || "",
                description: course.description || "",
                category: course.category,
                ...(course.level && { level: course.level as Level }),
                price: course.price || 0,
                thumbnail: course.thumbnail || "",
                isPublished: course.isPublished,
                creatorId: course.creatorId,
                creator: (course as any).creator ? {
                    id: (course as any).creator.id,
                    name: (course as any).creator.name,
                    email: (course as any).creator.email,
                    photoUrl: (course as any).creator.photoUrl || ""
                } : undefined,
                _count: {
                    lectures: (course as any).lectures?.length || 0,
                    enrollments: (course as any).enrollments?.length || 0
                },
                createdAt: course.createdAt,
                updatedAt: course.updatedAt || new Date(),
                lectures: (course as any).lectures || [],
                reviews: [] // No reviews field in schema yet
            }
        } catch (error) {
            console.error('Get course by ID service error:', error);
            throw new Error('Failed to get course by ID');
        }
    }

    /**
     * Update course information
    */
    async updateCourse(courseId: string, updateData: UpdateCourseDto, file?: Express.Multer.File): Promise<CourseResponseDto> {
         try {
      // Check if course exists
      const existingCourse = await this.courseRepository.findById(courseId);
      if (!existingCourse) {
        throw new Error('Course not found');
      }

      let thumbnail: string | undefined;

      // Upload thumbnail to Cloudinary if file is provided
      if (file) {
        try {
          // Create a promise to handle the stream upload with buffer
          const uploadPromise = new Promise<any>((resolve, reject) => {
            const stream = cloudinary.uploader.upload_stream(
              {
                resource_type: 'auto',
                folder: 'course-thumbnails',
                public_id: `course-${courseId}-${Date.now()}`
              },
              (error, result) => {
                if (error) {
                  console.error('Cloudinary upload error:', error);
                  reject(new Error('Failed to upload course thumbnail'));
                } else {
                  resolve(result);
                }
              }
            );

            stream.write(file.buffer);
            stream.end();
          });

          const result = await uploadPromise;
          thumbnail = result.secure_url;
        } catch (uploadError) {
          console.error('Thumbnail upload error:', uploadError);
          throw new Error('Failed to upload course thumbnail');
        }
      }


      // Process and validate update data to ensure correct types
      const processedData: Partial<UpdateCourseDto> & { thumbnail?: string } = {
        ...(updateData.title && { title: updateData.title }),
        ...(updateData.subTitle && { subTitle: updateData.subTitle }),
        ...(updateData.description && { description: updateData.description }),
        ...(updateData.category && { category: updateData.category }),
        ...(updateData.level && { level: updateData.level }),
        ...(updateData.price !== undefined && {
          price: typeof updateData.price === 'string' ? parseFloat(updateData.price) : updateData.price
        }),
        ...(updateData.isPublished !== undefined && {
          isPublished: typeof updateData.isPublished === 'string'
            ? updateData.isPublished === 'true'
            : updateData.isPublished
        }),
        ...(thumbnail && { thumbnail })
      };

      // Update course
      const updatedCourse = await this.courseRepository.update(courseId, processedData);

      if (!updatedCourse) {
        throw new Error('Failed to update course');
      }

      return {
        id: updatedCourse.id,
        title: updatedCourse.title,
        subTitle: updatedCourse.subTitle || "",
        description: updatedCourse.description || "",
        category: updatedCourse.category,
        ...(updatedCourse.level && { level: updatedCourse.level as Level }),
        price: updatedCourse.price || 0,
        thumbnail: updatedCourse.thumbnail || "",
        isPublished: updatedCourse.isPublished,
        creatorId: updatedCourse.creatorId,
        createdAt: updatedCourse.createdAt,
        updatedAt: updatedCourse.updatedAt || new Date()
      };
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      console.error('Update course service error:', error);
      throw new Error('Course update failed');
    }
    }


    async deleteCourse(courseId: string): Promise<{ message: string; }> {
        try {
            const deleted = await this.courseRepository.delete(courseId);

            if (!deleted) {
                throw new Error('Course not found or deletion failed');
            }

            return { message: 'Course deleted successfully' };
        } catch (error) {
            throw error;
        }
    }

    async checkCourseEnrollment(userId: string, courseId: string): Promise<{ isEnrolled: boolean }> {
        try {
            const enrollment = await this.courseRepository.findEnrollment(userId, courseId);
            return { isEnrolled: !!enrollment };
        } catch (error) {
            console.error('Check enrollment service error:', error);
            throw new Error('Failed to check course enrollment');
        }
    }

    async getEnrolledCourses(userId: string): Promise<any[]> {
        try {
            const enrolledCourses = await this.courseRepository.findEnrolledCourses(userId);
            return enrolledCourses;
        } catch (error) {
            console.error('Get enrolled courses service error:', error);
            throw new Error('Failed to get enrolled courses');
        }
    }

    /**
     * Get course analytics
     */
    async getCourseAnalytics(courseId: string, creatorId: string): Promise<any> {
        try {
            // Verify course ownership
            const course = await this.courseRepository.findById(courseId);
            if (!course || course.creatorId !== creatorId) {
                throw new Error('Course not found or access denied');
            }

            // Get course with all related data
            const courseWithData = await this.courseRepository.findByIdWithAnalytics(courseId);

            if (!courseWithData) {
                throw new Error('Course not found');
            }

            // Calculate analytics
            const totalEnrolled = (courseWithData as any)._count?.enrollments || 0;
            const paidOrders = (courseWithData as any).orders || [];
            const totalRevenue = paidOrders.reduce((sum: number, order: any) => sum + (order.amount || 0), 0);
            const totalLectures = (courseWithData as any).lectures?.length || 0;
            const completedOrders = (courseWithData as any)._count?.orders || 0;

            // Calculate completion rate (simplified - you can enhance this)
            const completionRate = totalEnrolled > 0 ? Math.floor((completedOrders / totalEnrolled) * 100) : 0;

            // Calculate average rating (mock for now - implement when reviews are added)
            const avgRating = 4.6;

            // Recent activity (simplified - enhance with real data later)
            const recentActivity = [
                { type: "enrollment", user: "Recent Student", time: "2 hours ago" },
                { type: "completion", user: "Another Student", time: "1 day ago" }
            ];

            return {
                totalEnrolled,
                completionRate: Math.min(completionRate, 100),
                avgRating,
                totalRevenue,
                viewsThisMonth: Math.floor(totalEnrolled * 2.5),
                enrollmentsThisMonth: Math.floor(totalEnrolled * 0.1),
                recentActivity,
                course: courseWithData
            };
        } catch (error) {
            console.error('Get course analytics service error:', error);
            throw new Error('Failed to get course analytics');
        }
    }

}
