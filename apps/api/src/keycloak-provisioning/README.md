# Keycloak user provisioning (Admin portal)

Backend credentials for the Keycloak Admin API. The LMS creates the Keycloak
_identity_ (username, email, initial password) from the Admin UI; Authorization
stays in the LMS as Permission + Scope.

Required only when Admin user provisioning is used. Without these the API still
boots, but every `/persons/:personId/keycloak/*` route fails closed with a clear
`NOT_CONFIGURED` answer instead of pretending an account was created.

## Preferred: service account (client_credentials)

Create a confidential client in the `lemdiklat` realm with
`Service accounts enabled = ON`, then grant its service account the realm role
`manage-users` (and `view-users`).

```
KEYCLOAK_ADMIN_BASE_URL=https://auth.lms-presisi.digitallearningcenter.id
KEYCLOAK_ADMIN_REALM=lemdiklat
KEYCLOAK_ADMIN_CLIENT_ID=lms-admin-provisioning
KEYCLOAK_ADMIN_CLIENT_SECRET=change-me
# Optional. When true (default), a password set from the UI is a one-time
# credential the user must change at first login.
KEYCLOAK_ADMIN_RESET_PASSWORD_TEMPORARY=true
KEYCLOAK_ADMIN_TIMEOUT_MS=8000
```

### One-time production setup (runbook)

Run these inside the Keycloak container (`kcadm.sh`) as a realm administrator.
Only `view-users`, `query-users` and `manage-users` are granted; nothing else.

```bash
/opt/keycloak/bin/kcadm.sh config credentials \
  --server http://localhost:8080 --realm master \
  --user "$KEYCLOAK_ADMIN" --password "$KEYCLOAK_ADMIN_PASSWORD"

/opt/keycloak/bin/kcadm.sh create clients -r lemdiklat \
  -s clientId=lms-admin-provisioning \
  -s enabled=true \
  -s publicClient=false \
  -s serviceAccountsEnabled=true \
  -s standardFlowEnabled=false \
  -s directAccessGrantsEnabled=false

CID=$(/opt/keycloak/bin/kcadm.sh get clients -r lemdiklat \
  -q clientId=lms-admin-provisioning --fields id --format csv | tail -n1 | tr -d '\r"')
SAID=$(/opt/keycloak/bin/kcadm.sh get "clients/$CID/service-account-user" -r lemdiklat \
  --fields id --format csv | tail -n1 | tr -d '\r"')

/opt/keycloak/bin/kcadm.sh add-roles -r lemdiklat --uid "$SAID" \
  --cclientid realm-management \
  --rolename view-users --rolename query-users --rolename manage-users

# Read the secret once and write it straight into the VPS .env; never print it.
/opt/keycloak/bin/kcadm.sh get "clients/$CID/client-secret" -r lemdiklat \
  --fields value --format csv | tail -n1 | tr -d '\r"'
```

Then set `KEYCLOAK_ADMIN_CLIENT_ID`/`KEYCLOAK_ADMIN_CLIENT_SECRET` in the VPS
`.env` (untracked, `chmod 600`) and recreate the API so it picks them up:

```bash
docker compose -f docker-compose.production.yml up -d --no-build api
```

Verify without revealing the secret — the API log must say
`Keycloak user provisioning enabled for realm lemdiklat`, and the Admin panel
badge must stop showing `Provisioning nonaktif`.

## Alternative: administrative username/password (password grant)

Not recommended for production: a human credential then lives in the API
environment. Use only for local development.

```
KEYCLOAK_ADMIN_USERNAME=admin
KEYCLOAK_ADMIN_PASSWORD=change-me
```

`KEYCLOAK_ADMIN_BASE_URL` and `KEYCLOAK_ADMIN_REALM` are derived from
`KEYCLOAK_ISSUER` when omitted.

## FreeIPA / LDAP federation

If Keycloak federates an LDAP directory, set `KEYCLOAK_ADMIN_REALM` to the realm
that owns the federated users and ensure the service account can write them.
Duplicate usernames in the directory surface as `LINK_CONFLICT` rather than as a
second user, because the LMS adopts an existing same-username Keycloak user
instead of creating a new one.
