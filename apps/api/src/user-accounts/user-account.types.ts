import { UserAccountStatusDto } from './dto/user-account-status.dto';

export type UserAccountRecord = {
  id: string;
  personId: string;
  externalAuthId: string | null;
  username: string | null;
  email: string | null;
  status: UserAccountStatusDto;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type UserAccountCreateData = {
  personId: string;
  externalAuthId?: string | null;
  username?: string | null;
  email?: string | null;
  status: UserAccountStatusDto;
};

export type UserAccountUpdateData = Partial<
  Omit<UserAccountCreateData, 'personId'>
>;
