
// Response utilities
export const successResponse = (res: any, message: string, data?: any, statusCode: number = 200) => {
  return res.status(statusCode).json({
    success: true,
    message,
    ...data
  });
};

export const errorResponse = (res: any, message: string, statusCode: number = 400, errors?: any) => {
  return res.status(statusCode).json({
    success: false,
    message,
    ...(errors && { errors })
  });
};
