# Data Architecture v1

## Foundation
`persons`, `organizations`, `person_organizations`, `user_accounts`, `roles`, `permissions`, `role_permissions`, `user_role_assignments`, `role_assignment_scopes`, `audit_logs`, `login_activities`. Organizations use recursive `parent_id`.

## Academic
`education_programs`, `curriculums`, `subjects`, `curriculum_subjects`, `education_batches`, `academic_classes`, `class_subjects`, `enrollments`, `educator_types`, `educator_assignments`, `class_staff_assignments`, `academic_schedules`, `learning_meetings`.

Hierarchy: Organization -> Program -> Batch -> Class -> Class Subject. Program -> Curriculum -> Curriculum Subject -> Subject.

## Learning
`learning_activity_types`, `learning_activities`, `learning_contents`, `learning_progress`, `assignments`, `assignment_submissions`, `submission_files`, `assignment_grades`.

## Assessment/Exam
`assessment_types`, `assessments`, `question_banks`, `question_types`, `questions`, `question_versions`, `question_options`, `exams`, `exam_blueprints`, `exam_blueprint_rules`, `exam_sessions`, `exam_participants`, `exam_attempts`, `attempt_questions`, `attempt_answers`, `answer_grades`.

## Grading/Attendance/Graduation
`grading_schemes`, `grading_components`, `final_grades`; `attendance_sessions`, `attendance_records`, `attendance_corrections`; `graduation_rules`, `graduation_rule_components`, `graduation_evaluations`, `graduation_evaluation_details`, `graduation_decisions`, `certificate_templates`, `certificates`, `certificate_revocations`.

## Physical rules
Migrations for every schema change; binary files outside PostgreSQL; JSONB only for flexible metadata; preserve historical enrollment/curriculum/question/attempt/graduation data; exact indexes/constraints/delete policy finalized task-by-task.
