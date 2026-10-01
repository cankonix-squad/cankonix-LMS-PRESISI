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
