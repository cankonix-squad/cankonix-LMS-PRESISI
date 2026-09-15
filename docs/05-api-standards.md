# API Standards

- REST under `/api/v1`; OpenAPI/Swagger mandatory.
- DTO validation for every input.
- Consistent error codes/messages, pagination/filter/sort.
- Breaking contracts require explicit versioning.
- Frontends use `packages/api-client`; do not scatter raw fetch/axios.
- Backend enforces authorization and scope.
- Sensitive mutations emit audit logs.
- `GET /api/v1/health` is baseline health endpoint.
- Exam autosave should be idempotent; server time authoritative.
