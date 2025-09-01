import { prisma } from "@/config";
import { CreateCourseDto, UpdateCourseDto } from "@/dto/course.dto";
import { ICourseRepository } from "@/interfaces/IRepository/ICourseRepository";
import { ICourse } from "@/types";
import { PrismaClient, Level } from "@prisma/client";

export class CourseRepository implements ICourseRepository{
    constructor(private readonly db:PrismaClient = prisma){}


    /**
     * Create a new course
    */
    async create(courseData: CreateCourseDto, creatorId: string): Promise<ICourse> {
        try {
            const course = await this.db.course.create({
                data: {
                    title: courseData.title,
                    category: courseData.category,
                    creatorId
                }
            })

            return course as unknown as ICourse
        } catch (error) {
            console.error('Error creating course from repository:', error);
            throw new Error('Failed to create course');
        }
    }

    /**
     * Find course by ID
     */
    async findById(id: string): Promise<ICourse | null> {
        try {
            const course = await this.db.course.findUnique({
                where: { id },
                include: {
                    lectures: true,
                    enrollments: true,
                    creator: true
                }
            })

            return course as unknown as ICourse
        } catch (error) {
            console.error('Error finding course by ID from repository:', error);
            throw new Error('Failed to find course by ID');
        }
    }

    /**
     * Find course by ID with analytics data
     */
    async findByIdWithAnalytics(id: string): Promise<ICourse | null> {
        try {
            const course = await this.db.course.findUnique({
                where: { id },
                include: {
                    lectures: true,
                    enrollments: true,
                    orders: {
                        where: {
                            isPaid: true
                        }
                    },
                    _count: {
                        select: {
                            enrollments: true,
                            orders: {
                                where: {
                                    isPaid: true
                                }
                            }
                        }
                    }
                }
            })

            return course as unknown as ICourse
        } catch (error) {
            console.error('Error finding course by ID with analytics from repository:', error);
            throw new Error('Failed to find course with analytics');
        }
    }

    async findPublishedCourses(): Promise<ICourse[]> {
        try {
            const courses = await this.db.course.findMany({
                where: {
                    isPublished: true
                },
                include: {
                    lectures: true,
                    creator: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            email: true,
                            imageUrl: true
                        }
                    },
                    enrollments: true,
                    _count: {
                        select: {
                            lectures: true,
                            enrollments: true
                        }
                    }
                },
                orderBy: {
                    createdAt: 'desc'
                }
            })

            return courses as unknown as ICourse[]
        } catch (error) {
            console.error('Error finding published courses from repository:', error);
            throw new Error('Failed to find published courses');
        }
    }

    /**
     * Find courses by creator ID
    */
    async findByCreator(creatorId: string): Promise<ICourse[]> {
        try {
            const courses = await this.db.course.findMany({
                where: {
                    creatorId: creatorId
                },
                include: {
                    lectures: true,
                    enrollments: true,
                    orders: {
                        where: {
                            isPaid: true
                        }
                    },
                    _count: {
                        select: {
                            enrollments: true,
                            orders: {
                                where: {
                                    isPaid: true
                                }
                            }
                        }
                    }
                },
                orderBy: {
                    createdAt: 'desc'
                }
            })

            return courses as unknown as ICourse[]
        } catch (error) {
            console.error('Error finding courses by creator from repository:', error);
            throw new Error('Failed to find courses by creator');
        }
    }
   /**
     * Update course information
    */
    async update(id: string, updateData: Partial<{
        title: string;
        subTitle: string;
        description: string;
        category: string;
        level: Level;
        price: number;
        thumbnail: string;
        isPublished: boolean;
    }>): Promise<ICourse | null> {
        try {
            const course = await this.db.course.update({
                where: { id },
                data: updateData
            })

            return course as unknown as ICourse
        } catch (error) {
            console.error('Error updating course:', error);
            throw new Error('Failed to update course');
        }
    }
    async delete(id: string): Promise<boolean> {
        try {
            await this.db.course.delete({
                where: { id }
            });
            return true;
        } catch (error) {
            console.error('Error deleting course:', error);
            return false;
        }
    }

    async findEnrollment(userId: string, courseId: string): Promise<any | null> {
        try {
            const enrollment = await this.db.userCourseEnrollment.findUnique({
                where: {
                    userId_courseId: {
                        userId,
                        courseId
                    }
                }
            });
            return enrollment;
        } catch (error) {
            console.error('Error finding enrollment:', error);
            throw new Error('Failed to find enrollment');
        }
    }

    async findEnrolledCourses(userId: string): Promise<any[]> {
        try {
            const enrollments = await this.db.userCourseEnrollment.findMany({
                where: { userId },
                include: {
                    course: {
                        include: {
                            creator: {
                                select: {
                                    id: true,
                                    firstName: true,
                                    lastName: true,
                                    email: true,
                                    imageUrl: true
                                }
                            },
                            enrollments: true,
                            lectures: {
                                select: {
                                    id: true,
                                    title: true,
                                    position: true
                                },
                                orderBy: {
                                    position: 'asc'
                                }
                            }
                        }
                    }
                },
                orderBy: {
                    enrolledAt: 'desc'
                }
            });

           return enrollments.map(enrollment => ({
                ...enrollment.course,
                instructor: `${enrollment.course.creator?.firstName || ''} ${enrollment.course.creator?.lastName || ''}`.trim() || 'Anonymous',
                duration: `${enrollment.course.lectures?.length || 0} lectures`,
                enrolledStudents: enrollment.course.enrollments?.map((e: any) => e.userId) || []
            }));
        } catch (error) {
            console.error('Error finding enrolled courses:', error);
            throw new Error('Failed to find enrolled courses');
        }
    }

    searchCourses(query: string): Promise<ICourse[]> {
        throw new Error("Method not implemented.");
    }

    async enrollStudent(courseId: string, studentId: string): Promise<boolean> {
        try {
            await this.db.userCourseEnrollment.upsert({
                where: {
                    userId_courseId: {
                        userId: studentId,
                        courseId: courseId
                    }
                },
                update: {
                    enrolledAt: new Date() // Update enrollment timestamp if already exists
                },
                create: {
                    userId: studentId,
                    courseId: courseId
                }
            });
            return true;
        } catch (error) {
            console.error('Error enrolling student:', error);
            throw new Error('Failed to enroll student in course');
        }
    }

    async enrollStudentWithOrder(courseId: string, studentId: string, orderId: string): Promise<boolean> {
        try {
            // Use transaction to ensure both enrollment and course update happen atomically
            await this.db.$transaction(async (prisma) => {
                // Create or update enrollment record with upsert to handle duplicates
                await prisma.userCourseEnrollment.upsert({
                    where: {
                        userId_courseId: {
                            userId: studentId,
                            courseId: courseId
                        }
                    },
                    update: {
                        orderId: orderId, // Update the order ID if enrollment already exists
                        enrolledAt: new Date() // Update enrollment timestamp
                    },
                    create: {
                        userId: studentId,
                        courseId: courseId,
                        orderId: orderId
                    }
                });

                // Update course's enrolledStudents array (if it exists in the database)
                // Note: This field might not exist in the current schema but is in the interface
                const course = await prisma.course.findUnique({
                    where: { id: courseId },
                    select: { id: true }
                });

                if (course) {
                    // If there's an enrolledStudents field, we would update it here
                    // For now, we'll just ensure the enrollment relationship is created
                    console.log(`Student ${studentId} successfully enrolled in course ${courseId} with order ${orderId}`);
                }
            });

            return true;
        } catch (error) {
            console.error('Error enrolling student with order:', error);
            throw new Error('Failed to enroll student in course');
        }
    }

}
