export type UserRole = 'USER' | 'ADMIN';

export type AuthenticatedUser = {
  id: string;
  email: string;
  role: UserRole;
};
