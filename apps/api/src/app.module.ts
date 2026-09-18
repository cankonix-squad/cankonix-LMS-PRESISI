import 'reflect-metadata';
import { DynamicModule, Module } from '@nestjs/common';
import { AcademicSchedulesModule } from './academic-schedules/academic-schedules.module';
import { AssignmentsModule } from './assignments/assignments.module';
import { AttendanceModule } from './attendance/attendance.module';
import { AttendanceCorrectionsModule } from './attendance-corrections/attendance-corrections.module';
import { AttendanceSummaryModule } from './attendance-summary/attendance-summary.module';
import { AuditModule } from './audit/audit.module';
import { AuthModule, AuthModuleOptions } from './auth/auth.module';
import { ClassStaffAssignmentsModule } from './class-staff-assignments/class-staff-assignments.module';
import { ClassSubjectsModule } from './class-subjects/class-subjects.module';
import {
  AuthorizationModule,
  AuthorizationModuleOptions,
} from './authorization/authorization.module';
import { CurriculumSubjectsModule } from './curriculum-subjects/curriculum-subjects.module';
import { EducationBatchesModule } from './education-batches/education-batches.module';
import { AcademicClassesModule } from './academic-classes/academic-classes.module';
import { AssessmentsModule } from './assessments/assessments.module';
import { AssessmentTypesModule } from './assessment-types/assessment-types.module';
import { EducationProgramsModule } from './education-programs/education-programs.module';
import { EducatorAssignmentsModule } from './educator-assignments/educator-assignments.module';
import { EducatorTypesModule } from './educator-types/educator-types.module';
import { EnrollmentsModule } from './enrollments/enrollments.module';
import { FilesModule } from './files/files.module';
import { HealthModule } from './health/health.module';
import { LearningActivitiesModule } from './learning-activities/learning-activities.module';
import { LearningActivityTypesModule } from './learning-activity-types/learning-activity-types.module';
import { LearningMeetingsModule } from './learning-meetings/learning-meetings.module';
import { LearningProgressModule } from './learning-progress/learning-progress.module';
import { OrganizationsModule } from './organizations/organizations.module';
import { PersonsModule } from './persons/persons.module';
import { PrismaModule } from './prisma/prisma.module';
import { UserAccountsModule } from './user-accounts/user-accounts.module';

export type AppModuleOptions = AuthModuleOptions & AuthorizationModuleOptions;

/**
 * Root module.
 *
 * Module order is load-bearing:
 *
 * 1. `AuthModule` first, so its global bearer guard covers every controller —
 *    including controllers added by later tasks — and populates `request.user`.
 * 2. `AuthorizationModule` second, so its global Permission + Scope guard runs
 *    after the bearer guard and can read the principal.
 * 3. `AuditModule` after both, so its global interceptor can attribute an action
 *    to the principal the guards established.
 */
@Module({})
export class AppModule {
  static register(options: AppModuleOptions): DynamicModule {
    return {
      module: AppModule,
      imports: [
        PrismaModule,
        AuthModule.register(options),
        HealthModule,
        AuditModule,
        OrganizationsModule,
        EducationProgramsModule,
        CurriculumSubjectsModule,
        EducationBatchesModule,
        AcademicClassesModule,
        ClassSubjectsModule,
        EnrollmentsModule,
        EducatorTypesModule,
        EducatorAssignmentsModule,
        ClassStaffAssignmentsModule,
        AcademicSchedulesModule,
        LearningMeetingsModule,
        LearningActivityTypesModule,
        LearningActivitiesModule,
        LearningProgressModule,
        AssignmentsModule,
        AttendanceModule,
        AttendanceCorrectionsModule,
        AttendanceSummaryModule,
        AssessmentTypesModule,
        AssessmentsModule,
        FilesModule,
        PersonsModule,
        UserAccountsModule,
        AuthorizationModule.register({
          permissionEvaluator: options.permissionEvaluator,
        }),
      ],
    };
  }
}
