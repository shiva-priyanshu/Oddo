export type UserRole = 'ADMIN' | 'STAFF' | 'CUSTOMER';

export interface User {
  id: string;
  email: string;
  role: UserRole;
  name: string;
  companyName?: string | null;
  customerId?: string | null;
  permissions?: string[];
  isActive?: boolean;
}

export interface StaffMember {
  id: string;
  name: string;
  email: string;
  role: 'STAFF';
  isActive: boolean;
  permissions: string;
  permissionsList: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateStaffData {
  name: string;
  email: string;
  password: string;
  permissions: string[];
}

export interface UpdateStaffData {
  name?: string;
  permissions?: string[];
  isActive?: boolean;
  password?: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCustomerData {
  name: string;
  email: string;
  password: string;
  companyName?: string;
  billingAddress?: string;
  phone?: string;
}
