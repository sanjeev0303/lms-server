import { CreateLectureDto } from "@/dto/lecture.dto";
import { ICourseService } from "@/interfaces/IService/ICourseService";
import { ILectureService } from "@/interfaces/IService/ILectureService";
import { AuthenticatedRequest } from "@/middleware/auth";
import { ResponseHandler } from "@/utils/api-response";
import { Response } from "express"

export class LectureController {
    constructor( private readonly lectureService: ILectureService ){}

    /**
     * Create a new lecture
    */
   createLecture = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { courseId } = req.params
        const lectureData: CreateLectureDto = req.body

        if (!courseId) {
            return ResponseHandler.error(res, 'Course ID is required', 400)
        }

        const result = await this.lectureService.createLecture(courseId, lectureData)

        return ResponseHandler.success(
            res,
            result,
            'Lecture created successfully',
            201
        )
    } catch (error) {
        console.error('Error creating lecture:', error)
        return ResponseHandler.error(res, 'Failed to create lecture', 500)
    }
   }

   /**
     * Get all lectures for a course
    */
    getCourseLectures = async (req: AuthenticatedRequest, res: Response) => {
        try {
            const { courseId } = req.params

            const result = await this.lectureService.getCourseLectures(courseId!)

            return ResponseHandler.success(
                res,
                result,
                'Course lectures retrieved successfully'
            )
        } catch (error) {
            console.error('Error getting course lectures:', error)
            return ResponseHandler.error(res, 'Failed to get course lectures', 500)
        }
    }

    /**
     * Get a single lecture by ID
     */
    getLectureById = async (req: AuthenticatedRequest, res: Response) => {
        try {
            const { lectureId } = req.params

            if (!lectureId) {
                return ResponseHandler.error(res, 'Lecture ID is required', 400)
            }

            const result = await this.lectureService.getLectureById(lectureId)

            return ResponseHandler.success(
                res,
                result,
                'Lecture retrieved successfully'
            )
        } catch (error) {
            console.error('Error getting lecture by ID:', error)
            return ResponseHandler.error(res, 'Failed to get lecture', 500)
        }
    }

    /**
     * Update a lecture
     */
    updateLecture = async (req: AuthenticatedRequest, res: Response) => {
        try {
            const { lectureId } = req.params
            const file = req.file

            if (!lectureId) {
                return ResponseHandler.error(res, 'Lecture ID is required', 400)
            }

            // Handle form data - convert string booleans to actual booleans
            const updateData = {
                ...req.body,
                ...(req.body.isFree !== undefined && {
                    isFree: req.body.isFree === 'true' || req.body.isFree === true
                })
            }

            console.log('Update data received:', updateData)
            console.log('File received:', file ? file.originalname : 'No file')

            const result = await this.lectureService.updateLecture(lectureId, updateData, file)

            return ResponseHandler.success(
                res,
                result,
                'Lecture updated successfully'
            )
        } catch (error) {
            console.error('Error updating lecture:', error)
            return ResponseHandler.error(res, 'Failed to update lecture', 500)
        }
    }

    /**
     * Delete a lecture
     */
    deleteLecture = async (req: AuthenticatedRequest, res: Response) => {
        try {
            const { lectureId } = req.params

            if (!lectureId) {
                return ResponseHandler.error(res, 'Lecture ID is required', 400)
            }

            const result = await this.lectureService.deleteLecture(lectureId)

            return ResponseHandler.success(
                res,
                result,
                'Lecture deleted successfully'
            )
        } catch (error) {
            console.error('Error deleting lecture:', error)
            return ResponseHandler.error(res, 'Failed to delete lecture', 500)
        }
    }

    /**
     * Reorder lectures for a course
     */
    async reorderLectures(req: AuthenticatedRequest, res: Response) {
        try {
            const { courseId } = req.params
            const { lectureOrders } = req.body

            if (!courseId) {
                return ResponseHandler.error(res, 'Course ID is required', 400)
            }

            if (!lectureOrders || !Array.isArray(lectureOrders)) {
                return ResponseHandler.error(res, 'Valid lecture orders array is required', 400)
            }

            // Validate lecture orders format
            for (const order of lectureOrders) {
                if (!order.id || typeof order.position !== 'number') {
                    return ResponseHandler.error(res, 'Each lecture order must have id and position', 400)
                }
            }

            const result = await this.lectureService.reorderLectures(courseId, lectureOrders)

            return ResponseHandler.success(
                res,
                result,
                'Lectures reordered successfully'
            )
        } catch (error) {
            console.error('Error reordering lectures:', error)
            return ResponseHandler.error(res, 'Failed to reorder lectures', 500)
        }
    }

}
