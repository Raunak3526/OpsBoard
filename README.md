# OpsBoard

## Local development

The API requires MongoDB. Start a local MongoDB service first, then copy
`server/.env.example` to `server/.env` and set a private `JWT_SECRET`.

Open separate terminals from the project root:

```powershell
Set-Location .\server
npm install
npm run dev
```

```powershell
Set-Location .\client
npm install
npm run dev
```

The API is available at `http://localhost:5000`, its health check is
`http://localhost:5000/api/health`, and the frontend is at
`http://localhost:5173`. The Vite development server proxies `/api` requests
to the API.

## Administrator access

Public registration always creates an `ENGINEER`. Administrator access must be
assigned manually in MongoDB Compass; there is no public admin-registration
option.

To promote your own registered account:

1. Connect Compass to the MongoDB instance configured by `MONGODB_URI` in
   `server/.env`. With the example URI, select the `opsboard` database.
2. Open the `users` collection. Mongoose creates this collection from the
   `User` model.
3. Find your account using its email address, for example with the filter
   `{ "email": "you@example.com" }`. Email addresses are stored lowercase.
4. Edit that document and change the `role` string from `"ENGINEER"` to
   `"ADMIN"`, then save the document.
5. Sign out and sign back in to refresh the account view in the browser. The
   server checks the current database role on every protected request, so
   authorization changes take effect immediately even for an existing JWT.

To demote an account, find the same document and change `role` from `"ADMIN"`
back to `"ENGINEER"`. Admins can also manage other users' roles and account
access from the Admin page. The API prevents an administrator from changing
their own role or disabling their own account, and prevents demoting or
disabling the last active administrator.
