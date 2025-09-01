import { User, UserCreate, UserSelect, UserUpdate } from "@/types/user.types"

export interface IAuthRepository {
  findById(id: string, select?: UserSelect): Promise<User | null>
  findByClerkId(clerkId: string, select?: UserSelect): Promise<User | null>
  findByEmail(email: string, select?: UserSelect): Promise<User | null>
  findMany(select?: UserSelect): Promise<User[]>
  create(data: UserCreate, select?: UserSelect): Promise<User>
  update(clerkId: string, data: UserUpdate, select?: UserSelect): Promise<User>
  upsert(clerkId: string, createData: UserCreate, updateData: UserUpdate, select?: UserSelect): Promise<User>
  delete(clerkId: string): Promise<void>
  exists(clerkId: string): Promise<boolean>
}
