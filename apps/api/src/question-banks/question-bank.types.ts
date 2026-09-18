import { QuestionVersionStatusDto } from './dto/question-version-status.dto';

/** Curriculum subject (TASK-011) that owns a bank. */
export interface CurriculumSubjectContext {
  id: string;
  curriculumId: string;
  subjectId: string;
}

/** Data-driven question type vocabulary row, plus the flags option validation reads. */
export interface QuestionTypeContext {
  id: string;
  code: string;
  name: string;
  description: string | null;
  hasOptions: boolean;
  multiSelect: boolean;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface QuestionBankRecord {
  id: string;
  curriculumSubjectId: string;
  code: string;
  name: string;
  description: string | null;
  status: string;
  metadata: unknown;
  createdAt: Date;
  updatedAt: Date;
}

export interface QuestionOptionRecord {
  id: string;
  versionId: string;
  key: string;
  label: string;
  isCorrect: boolean;
  /**
   * Prisma returns `Decimal` for this column, which serializes to a string over
   * the wire. Typed loosely so the repository can hand back the Prisma row
   * unchanged while every consumer normalizes through `Number(...)`.
   */
  value: string | { toString(): string } | null;
  sortOrder: number;
  createdAt: Date;
}

export interface QuestionVersionRecord {
  id: string;
  questionId: string;
  version: number;
  stem: string;
  scoringRule: unknown;
  explanation: string | null;
  difficulty: string | null;
  topic: string | null;
  maxScore: string | { toString(): string };
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

/** A version joined with the option set that belongs to it. */
export interface QuestionVersionWithOptions extends QuestionVersionRecord {
  options: QuestionOptionRecord[];
}

export interface QuestionRecord {
  id: string;
  questionBankId: string;
  questionTypeId: string;
  code: string | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * A question plus its latest version. `latestVersion` is the highest-numbered
 * version — which is what an educator view renders — while historical attempts
 * keep pointing at the exact version they were taken against.
 */
export interface QuestionWithVersion extends QuestionRecord {
  latestVersion: QuestionVersionWithOptions | null;
  versionCount: number;
}

export interface QuestionBankCreateData {
  curriculumSubjectId: string;
  code: string;
  name: string;
  description: string | null;
  status: string;
  metadata: unknown;
}

export interface QuestionBankUpdateData {
  name?: string;
  description?: string | null;
  status?: string;
  metadata?: unknown;
}

export interface QuestionBankListFilter {
  curriculumSubjectId?: string;
  curriculumId?: string;
  subjectId?: string;
  status?: string;
  search?: string;
  page: number;
  limit: number;
}

export interface QuestionBankListResult {
  data: QuestionBankRecord[];
  total: number;
}

export interface QuestionCreateData {
  questionBankId: string;
  questionTypeId: string;
  code: string | null;
}

export interface QuestionUpdateData {
  questionTypeId?: string;
  code?: string | null;
  status?: string;
}

export interface QuestionListFilter {
  questionBankId: string;
  questionTypeId?: string;
  status?: string;
  search?: string;
  page: number;
  limit: number;
}

export interface QuestionListResult {
  data: QuestionWithVersion[];
  total: number;
}

export interface QuestionOptionCreateData {
  key: string;
  label: string;
  isCorrect: boolean;
  value: string | null;
  sortOrder: number;
}

export interface QuestionVersionCreateData {
  questionId: string;
  version: number;
  stem: string;
  scoringRule: unknown;
  explanation: string | null;
  difficulty: string | null;
  topic: string | null;
  maxScore: string;
  status: QuestionVersionStatusDto;
  options: QuestionOptionCreateData[];
}

export interface QuestionVersionUpdateData {
  stem?: string;
  scoringRule?: unknown;
  explanation?: string | null;
  difficulty?: string | null;
  topic?: string | null;
  maxScore?: string;
  status?: QuestionVersionStatusDto;
  /** When present, the whole option set is replaced as one unit. */
  options?: QuestionOptionCreateData[];
}

/** Highest version number in a question plus how many versions exist. */
export interface QuestionVersionState {
  questionId: string;
  maxVersion: number;
  versionCount: number;
}
