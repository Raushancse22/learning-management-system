# Gatemate Learning

A full working learning management system website built with:

- Node.js + Express
- React + Vite frontend
- Tailwind CSS styling
- JWT authentication
- `bcryptjs` password hashing
- Local SQLite/local uploads by default
- Cloud-ready Postgres + Supabase Storage support

## Features

- User registration and login for `student`, `instructor`, and `admin`
- JWT-backed protected routes with role-based access control
- Course creation, update, deletion, categorization, and approval workflow
- Video and PDF lesson delivery
- MCQ quiz creation, submission, and auto evaluation
- Progress tracking with completion percentage and resume learning
- In-app notifications
- Admin analytics and user management
- One-command migration from local SQLite/uploads to cloud Postgres/Supabase Storage

## Run locally

1. Open a terminal in `lms-website`
2. Install dependencies:

```powershell
npm.cmd install
```

3. Start the app:

```powershell
npm.cmd start
```

4. Open `http://localhost:3000`

If no cloud environment variables are set, the app runs in local mode with `data/lms.db` and the `uploads` folder.

## Frontend development

Run the backend and React dev server in separate terminals:

```powershell
npm.cmd run server:dev
```

```powershell
npm.cmd run dev
```

The Vite frontend runs at `http://localhost:5173` and proxies API requests to the backend at `http://localhost:3000`.

## Cloud setup

1. Copy `.env.example` to `.env`
2. Fill in your Supabase Postgres connection string and service role key
3. Start the app normally:

```powershell
npm.cmd start
```

When `DATABASE_PROVIDER=postgres` and `STORAGE_PROVIDER=supabase`, the backend will:

- create the LMS schema in Postgres
- create the configured Supabase storage buckets if they do not exist
- read and write all new LMS data from the cloud
- store uploaded lesson videos and PDFs in Supabase Storage

## Migrate existing local data to cloud

After your `.env` is configured for Supabase, run:

```powershell
npm.cmd run migrate:cloud
```

This migrates:

- all SQLite records from `data/lms.db` into Postgres
- uploaded lesson files from `uploads/` into Supabase Storage
- existing lesson file URLs so the LMS points at cloud-hosted assets

## Seeded demo accounts

- Student: `student@gatematelearning.dev` / `Student@123`
- Instructor: `instructor@gatematelearning.dev` / `Instructor@123`
- Admin: `admin@gatematelearning.dev` / `Admin@123`
