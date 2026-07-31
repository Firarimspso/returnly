# Customer passwordless authentication

Customer authentication is separate from restaurant administrator authentication. Public QR
visitors receive a short-lived verification challenge and, after verification, a customer portal
JWT. Admin JWTs cannot be used for customer portal endpoints and customer tokens cannot be used
for dashboard endpoints.

## Development setup

1. Configure the PostgreSQL and admin JWT secrets using user secrets or environment variables.
2. Set `CustomerAuth__CodeHashSecret` to a random secret of at least 32 characters outside
   development. Do not reuse the admin JWT secret.
3. Run the API with `ASPNETCORE_ENVIRONMENT=Development`.
4. Request an email code with `POST /api/public/customer-auth/request-code`.
5. In development only, the `DevelopmentEmailVerificationSender` writes the code to the local API
   log. Responses never contain the plain code.

The code lifetime, resend cooldown, maximum attempts, and resend limit are configured in the
`CustomerAuth` appsettings section. Code hashes are HMAC-SHA256 values bound to the challenge ID;
plain verification codes are never persisted.

## Provider integration

`ICustomerVerificationSender` is the provider boundary. Replace the development email sender with
an implementation backed by the selected transactional email provider and report
`IsConfigured = true`. Production does not log or return verification codes.

SMS uses the same challenge model and sender interface, but
`UnconfiguredSmsVerificationSender` deliberately reports the channel as unavailable until an SMS
provider is configured. The customer UI therefore labels SMS as **Coming soon** while email works
end to end.

Provider credentials should be supplied using environment configuration or a managed secret store,
never committed to `appsettings.json`.

## Database migration

The repository includes a pinned local EF Core tool manifest and a migration-only startup project:

```sh
cd backend/Returnly.Migrations
dotnet tool restore
dotnet build
dotnet tool run dotnet-ef database update \
  --project ../Returnly.Api/Returnly.Api.csproj \
  --startup-project Returnly.Migrations.csproj \
  --no-build
```

The `AddCustomerPasswordlessAuthentication` migration creates
`customer_verification_challenges` with restaurant and QR foreign keys, expiry/consumption
timestamps, attempt and resend counters, and only the secure code hash.

## Public endpoints

- `POST /api/public/customer-auth/request-code`
- `POST /api/public/customer-auth/verify-code`
- `POST /api/public/customer-auth/resend-code`
- `POST /api/public/customer-auth/trusted-scan` (customer portal bearer token required)
- `GET /api/public/customer-portal` (existing customer portal bearer token)

The former identifier-only scan endpoint no longer awards points. This prevents account access
based solely on knowing a phone number or email address.

## Trusted-device persistence

After successful verification, Returnly issues the existing 24-hour customer portal JWT through
two secure transports:

- the response body, which the Angular app keeps under
  `returnly_customer_portal_token` in local storage with session-storage and in-memory fallbacks;
- an HttpOnly, tenant-bound `returnly_customer_session` cookie scoped to `/api/public`.

The cookie is `SameSite=Lax`, becomes `Secure` automatically under HTTPS, and cannot be read by
JavaScript. Customer API requests use credentials and prefer a valid bearer token when JavaScript
storage is available. This keeps route reloads and normal Safari navigation working while providing
a safer fallback when JavaScript storage is restricted.

Some social-media and embedded QR browsers launch each link in a completely isolated or ephemeral
web view. Such a browser may discard both site storage and cookies when the view closes. A web
application cannot securely bridge those isolated containers without putting credentials in the
URL, which Returnly deliberately does not do. In that case the customer must verify again or open
the scan in Safari/Chrome. Returnly never places customer portal tokens in QR URLs or navigation
parameters.
