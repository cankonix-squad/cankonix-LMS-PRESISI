# Backend Architecture

NestJS Modular Monolith. Target modules: identity, person, organization, authorization, audit, academic, curriculum, enrollment, educator, scheduling, learning, attendance, assignment, assessment, exam, grading, graduation, certificate, file, notification, reporting, configuration.

Layering: Controller -> Application Service -> Domain -> Repository -> Prisma. Modules communicate through explicit services/contracts/events. Avoid circular dependencies and cross-module DB access bypassing ownership. Exam starts in core but with a hard boundary. Executive uses dedicated reporting endpoints.
