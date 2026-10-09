# Public deployment

This project uses a React static site, a Flask API, PostgreSQL, and persistent
storage for uploaded exam papers. The Render Blueprint in `render.yaml` defines
these services. The API and database use paid plans; a free web service or
ephemeral disk is not suitable for confidential exam files.

## Deploy

1. Review the app and its access controls with your institution's security team.
   Do not upload real papers until the deployment and its recovery process have
   been tested with non-confidential sample data. The production Blueprint
   disables public registration; if enabled later, sign-up is restricted to
   student accounts.
2. Add this project to a private GitHub repository. Keep `.env` files, database
   files, uploads, and credentials out of Git history. If any credentials were
   previously committed or shared, rotate them.
   Do not run `backend/database/seed.py` in production; it creates demo accounts
   with a published test password and sample papers.
3. In Render, create a new Blueprint instance and connect the repository.
   Render will provision the API, static frontend, PostgreSQL database, and
   persistent upload disk defined in `render.yaml`.
4. After the first deployment, open the API service's Shell and run
   `flask --app wsgi:app create-super-admin`. Follow the prompts to create the
   first administrator; the password is entered interactively and is not stored
   in the repository or passed on the command line.
5. Open the frontend's `onrender.com` URL in Chrome. The API health check is
   available at `/api/health` on the API URL.

Keep a separate, tested backup plan for the PostgreSQL database and uploaded
papers. Persistent storage is not a backup. The generated Render URL is the
address; a custom domain can be added later in Render after domain
ownership is verified.

The Blueprint prepares hosting infrastructure; it is not a security
certification. Before using real exam content, review authentication,
authorization, encryption/key management, account provisioning, and incident
recovery with your institution. Run the administrator bootstrap command in
step 4 before the first production login. OAuth credentials are intentionally
not configured by the Blueprint; do not enable OAuth until its state/CSRF
protection has been reviewed and secured.
