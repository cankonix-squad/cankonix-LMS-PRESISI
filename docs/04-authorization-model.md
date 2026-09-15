# Authorization Model

Keycloak answers who the user is. NestJS answers what the user may do.

User Account -> Role Assignment -> Role -> Permission; Role Assignment -> one or more Scopes. Roles are data, not hardcoded branching.

Example permissions: `academic.program.read`, `academic.class.manage`, `learning.content.create`, `attendance.manage`, `assessment.grade`, `exam.manage`, `exam.participate`, `report.executive.read`, `portal.*.access`.

Scopes may target organization, program, batch, class or class subject. Backend validates permission + scope. Descendant access follows organization/academic hierarchy.

Enrollment/Educator/Class Staff assignments remain business relationships and are not replaced by RBAC records.
