# TASK-009Z — Admin Foundation Pattern Rollout

Status: REVIEW

## Goal

Roll out the reusable Admin frontend component foundation to the remaining
Foundation pages so the Admin portal feels consistent and is easier to maintain.

## Scope

- Refactor `/roles` to use the shared Admin components.
- Refactor `/assignments` to use the shared Admin components.
- Preserve existing API contracts, session behavior, permissions, and scope model.
- Keep mutation behavior unchanged.
- Keep `/organisasi` and `/personel` behavior intact.

## Out of Scope

- New backend endpoints.
- New authorization model.
- Academic module implementation.
- Keycloak theme changes.

## Verification

- `../../node_modules/.bin/eslint src/features/foundation/role-permission-management.tsx src/features/foundation/assignment-scope-management.tsx`
- `./node_modules/.bin/tsc --noEmit`
- `./node_modules/.bin/next build --webpack`
