import { CreateCourseDto, UpdateCourseDto, UpdateCourseDtoSchema } from "@/dto/course.dto";
import { ICourseService } from "@/interfaces/IService/ICourseService";
import { IAuthRepository } from "@/interfaces/IRepository";
import { AuthenticatedRequest } from "@/middleware/auth";
import { ResponseHandler } from "@/utils/api-response";
import { Response } from 'express'

export class CourseController {
    constructor(
        private readonly courseService: ICourseService,
        private readonly userRepository: IAuthRepository
    ) { }

    /**
     * Helper method to get local user ID from Clerk user ID, creating user if not exists
     */
    private async getLocalUserId(req: AuthenticatedRequest): Promise<string> {
        const clerkUserId = req.user?.userId
        if (!clerkUserId) {
            throw new Error("User not authenticated")
        }

        // Use upsert to create user if they don't exist
        const localUser = await this.userRepository.upsert(
            clerkUserId,
            {
                // Create data - what to use if user doesn't exist
                clerkId: clerkUserId,
                email: req.user?.email,
                firstName: req.user?.firstName,
                lastName: req.user?.lastName,
                imageUrl: req.user?.imageUrl,
            },
            {
                // Update data - what to update if user exists
                email: req.user?.email,
                firstName: req.user?.firstName,
                lastName: req.user?.lastName,
                imageUrl: req.user?.imageUrl,
            }
        )

        return localUser.id
    }

    /**
     * Create a new course
    */
    createCourse = async (req: AuthenticatedRequest, res: Response) => {
        try {
            const courseData: CreateCourseDto = req.body
            if (!courseData) {
                throw new Error("Course fields required");
            }

            // Get local user ID from Clerk user ID
            const localUserId = await this.getLocalUserId(req)
            const course = await this.courseService.createCourse(courseData, localUserId)

            return ResponseHandler.success(
                res,
                course,
                'Course created successfully',
                201
            )

        } catch (error) {
            console.log("create course controller error: ", error);
            return res.status(500).json({
                message: error instanceof Error ? error.message : "Failed to create course"
            })
        }
    }

    /**
     * Get course created by INSTRUCTOR user
    */
    getCreatorCourses = async (req: AuthenticatedRequest, res: Response) => {
        try {
            if (!req.user?.userId) {
                return res.status(401).json({
                    message: "User not authenticated"
                })
            }

            // Get local user ID from Clerk user ID
            const localUserId = await this.getLocalUserId(req)
            const courses = await this.courseService.getCreatorCourses(localUserId)

            return ResponseHandler.success(
                res,
                courses,
                'Creator courses retrieved successfully'
            )
        } catch (error) {
            console.log("get creator courses controller error: ", error);
            return res.status(500).json({
                message: error instanceof Error ? error.message : "Failed to retrieve creator courses"
            })
        }
    }

    /**
     * Get all published courses (public endpoint)
    */
    getPublishedCourses = async (req: any, res: Response) => {
        try {
            const courses = await this.courseService.getPublishedCourses()

            return ResponseHandler.success(
                res,
                courses,
                'Published courses retrieved successfully'
            )
        } catch (error) {
            console.log("get published courses controller error: ", error);
            return res.status(500).json({
                message: "Failed to retrieve published courses"
            })
        }
    }

    /**
     * Get course by ID
    */
    getCourseById = async (req: AuthenticatedRequest, res: Response) => {
        try {
            const { courseId } = req.params

            if (!courseId) {
                return res.status(400).json({
                    message: "Course ID is required"
                })
            }

            const course = await this.courseService.getCourseById(courseId)

            if (!course) {
                return res.status(404).json({
                    message: "Course not found"
                })
            }

            return ResponseHandler.success(
                res,
                course,
                'Course retrieved successfully'
            )
        } catch (error) {
            console.log("get course by id controller error: ", error);
            return res.status(500).json({
                message: "Failed to retrieve course"
            })
        }
    }

    /**
     * Update course information
    */
    updateCourse = async (req: AuthenticatedRequest, res: Response) => {
        try {
            const { courseId } = req.params
            const updateData = req.body
            const file = req.file

            console.log('Update course request - courseId:', courseId);
            console.log('Update course request - body:', req.body);
            console.log('Update course request - file:', file ? `${file.originalname} (${file.size} bytes)` : 'No file');

            if (!courseId) {
                return res.status(400).json({
                    message: "Course ID is required"
                })
            }

            // Manual validation for multipart form data
            try {
                // Only validate the fields that are present
                const fieldsToValidate: any = {};

                if (updateData.title !== undefined) fieldsToValidate.title = updateData.title;
                if (updateData.subTitle !== undefined) fieldsToValidate.subTitle = updateData.subTitle;
                if (updateData.description !== undefined) fieldsToValidate.description = updateData.description;
                if (updateData.category !== undefined) fieldsToValidate.category = updateData.category;
                if (updateData.level !== undefined) fieldsToValidate.level = updateData.level;
                if (updateData.price !== undefined) fieldsToValidate.price = updateData.price;
                if (updateData.isPublished !== undefined) fieldsToValidate.isPublished = updateData.isPublished;

                // Validate only the present fields
                const validatedData = UpdateCourseDtoSchema.partial().parse(fieldsToValidate);

                // Convert string values to appropriate types
                const processedUpdateData: UpdateCourseDto = {
                    ...validatedData,
                    ...(validatedData.price && { price: parseFloat(validatedData.price as any) }),
                    ...(validatedData.isPublished !== undefined && {
                        isPublished: typeof validatedData.isPublished === 'string'
                            ? validatedData.isPublished === 'true'
                            : validatedData.isPublished
                    })
                };

                const updateCourse = await this.courseService.updateCourse(courseId, processedUpdateData, file)

                return ResponseHandler.success(
                    res,
                    updateCourse,
                    'Course updated successfully'
                )
            } catch (validationError: any) {
                console.log("validation error:", validationError);
                return res.status(400).json({
                    message: "Validation failed",
                    errors: validationError.issues || validationError.message
                })
            }
        } catch (error) {
            console.log("update course controller error: ", error);
            return res.status(500).json({
                message: error instanceof Error ? error.message : "Failed to update course"
            })
        }
    }

    /**
     * Delete a course
     */
    deleteCourse = async (req: AuthenticatedRequest, res: Response) => {
        try {
            const { courseId } = req.params;

            if (!courseId) {
                return ResponseHandler.error(res, 'Course ID is required', 400);
            }

            const result = await this.courseService.deleteCourse(courseId);

            return ResponseHandler.success(
                res,
                result,
                'Course deleted successfully'
            );
        } catch (error) {
            console.error('Error deleting course:', error);
            return ResponseHandler.error(res, 'Failed to delete course', 500);
        }
    }

    /**
     * Check course enrollment status for a user
     */
    checkCourseEnrollment = async (req: AuthenticatedRequest, res: Response) => {
        try {
            const { courseId } = req.params;

            if (!courseId) {
                return ResponseHandler.error(res, 'Course ID is required', 400);
            }

            if (!req.user?.userId) {
                return ResponseHandler.error(res, 'User not authenticated', 401);
            }

            // Get local user ID from Clerk user ID
            const localUserId = await this.getLocalUserId(req)

            const result = await this.courseService.checkCourseEnrollment(localUserId, courseId);

            return ResponseHandler.success(
                res,
                result,
                'Enrollment status retrieved successfully'
            );
        } catch (error) {
            console.error('Error checking course enrollment:', error);
            return ResponseHandler.error(res, error instanceof Error ? error.message : 'Failed to check enrollment status', 500);
        }
    }

    /**
     * Get enrolled courses for a user
     */
    getEnrolledCourses = async (req: AuthenticatedRequest, res: Response) => {
        try {
            if (!req.user?.userId) {
                return ResponseHandler.error(res, 'User not authenticated', 401);
            }

            // Get local user ID from Clerk user ID
            const localUserId = await this.getLocalUserId(req)
            const enrolledCourses = await this.courseService.getEnrolledCourses(localUserId);

            return ResponseHandler.success(
                res,
                enrolledCourses,
                'Enrolled courses retrieved successfully'
            );
        } catch (error) {
            console.error('Error getting enrolled courses:', error);
            return ResponseHandler.error(res, error instanceof Error ? error.message : 'Failed to get enrolled courses', 500);
        }
    }

    /**
     * Get course analytics
     */
    getCourseAnalytics = async (req: AuthenticatedRequest, res: Response) => {
        try {
            const courseId = req.params.courseId;

            if (!courseId) {
                return res.status(400).json({
                    success: false,
                    message: "Course ID is required"
                });
            }

            if (!req.user?.userId) {
                return res.status(401).json({
                    message: "User not authenticated"
                });
            }

            // Get local user ID from Clerk user ID
            const localUserId = await this.getLocalUserId(req)
            const analytics = await this.courseService.getCourseAnalytics(courseId as string, localUserId);

            return ResponseHandler.success(
                res,
                analytics,
                'Course analytics retrieved successfully'
            );
        } catch (error) {
            console.error('Error getting course analytics:', error);
            return ResponseHandler.error(res, error instanceof Error ? error.message : 'Failed to get course analytics', 500);
        }
    }
}
