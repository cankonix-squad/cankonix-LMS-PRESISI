# Infrastructure

Local Docker Compose: PostgreSQL, Redis, MinIO, Keycloak. Production: independent portal/API containers; API N replicas behind Nginx/load balancer. CI/CD workflows are independent and path-aware. Shared package changes validate affected consumers but do not blindly deploy all production apps.

Observability baseline: application/error/audit logs, metrics, health checks; target Prometheus + Grafana + Loki. Automated DB/object/Keycloak backups and tested restore procedures.
