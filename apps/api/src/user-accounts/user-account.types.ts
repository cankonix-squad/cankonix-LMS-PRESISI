import { PersonStatusDto } from '../persons/dto/person-status.dto';
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

/**
 * Identity of the person an account belongs to.
 *
 * The account directory renders the owner's identity from `Person`, so an
 * operator never re-types a name or NRP/NIP into an account form. It is a
 * projection, not a second copy: writing identity still happens on `Person`.
 */
export type UserAccountPersonRecord = {
  id: string;
  personnelNumber: string;
  fullName: string;
  rank: string | null;
  title: string | null;
  email: string | null;
  phone: string | null;
  status: PersonStatusDto;
};

export type UserAccountWithPersonRecord = UserAccountRecord & {
  person: UserAccountPersonRecord;
};

export type UserAccountListFilter = {
  search?: string;
  status?: UserAccountStatusDto;
  page: number;
  limit: number;
};

export type UserAccountListResult = {
  data: UserAccountWithPersonRecord[];
  total: number;
};
