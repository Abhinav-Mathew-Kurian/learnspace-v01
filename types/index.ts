import { DefaultSession } from 'next-auth';

export type UserRole = 'admin' | 'teacher' | 'student';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      role: UserRole;
      avatar: string;
      isBanned: boolean;
      banReason: string;
      isActive: boolean;
      subscriptionExpiry: string | null; // ISO string so it survives JWT serialization
    } & DefaultSession['user'];
  }

  interface User {
    id: string;
    role: UserRole;
    avatar: string;
    isBanned: boolean;
    banReason: string;
    isActive: boolean;
    subscriptionExpiry: string | null;
  }
}



export interface ApiSuccess<T> {
  success: true;
  data: T;
  message?: string;
}

export interface ApiError {
  success: false;
  error: string;
  code?: string;
}

export interface ApiPaginated<T> {
  success: true;
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;
