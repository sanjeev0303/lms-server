import { User as PrismaUser, Role as PrismaUserRole } from '@prisma/client'

export interface User extends PrismaUser {}

export interface UserCreate {
  clerkId: string
  email?: string
  firstName?: string
  lastName?: string
  imageUrl?: string
  password?: string
  phoneNumber?: string
  role?: PrismaUserRole
}

export interface UserUpdate {
  email?: string
  firstName?: string
  lastName?: string
  imageUrl?: string
  password?: string
  phoneNumber?: string
  role?: PrismaUserRole
}

export interface UserSelect {
  id?: boolean
  clerkId?: boolean
  email?: boolean
  firstName?: boolean
  lastName?: boolean
  imageUrl?: boolean
  password?: boolean
  phoneNumber?: boolean
  role?: boolean
  createdAt?: boolean
  updatedAt?: boolean
}

