export interface IExternalServices {
  createUser(user: any): Promise<any>;
  updateUser(id: string, user: any): Promise<any>;
  deleteUser(id: string): Promise<any>;
  getUserById(id: string): Promise<any>;
}

export interface IImageUploadService {
  uploadImage(buffer: Buffer): Promise<string>;
}

export interface IPasswordService {
  hashPassword(password: string): Promise<string>;
  comparePassword(password: string, hash: string): Promise<boolean>;
}
