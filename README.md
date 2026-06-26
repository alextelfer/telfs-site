# Telfs Site

This is the main telfs web app. It combines a few different experiences in one React + Supabase project: a public home page, RSVP and birthday invite pages, a workout tracker, and a private documented hub for authenticated file sharing and chat.

## What’s inside

- Public landing page at `/`
- RSVP page at `/rsvp`
- Birthday invite page at `/birthday`, with password gating and an embedded RSVP form
- Workout logging page at `/workout`, backed by Supabase
- Magic-link sign-in at `/piracy`
- Private pirate hub at `/piracy_is_cool`, with:
	- folder and file browsing
	- private file uploads and downloads
	- large file multipart upload support
	- authenticated chat
	- admin delete controls
	- username editing

## Tech Stack

- React 18
- React Router 6
- Supabase Auth and PostgreSQL
- Netlify Functions
- Backblaze B2 for private file storage
- Video.js for media playback

## Project Structure

```text
src/
	components/           shared UI pieces
	features/
		auth/               magic-link sign in
		photos/             photo gallery feature work
		pirate/             private file sharing hub
	pages/                birthday, RSVP, home, workout
	lib/                  Supabase client and auth context
netlify/functions/      serverless endpoints for uploads, chat, comments, and auth-related actions
```

## Running Locally

Install dependencies:

```bash
npm install
```

Start the app:

```bash
npm start
```

Build for production:

```bash
npm run build
```

Run tests:

```bash
npm test
```

For local Netlify development, you can also use:

```bash
npm run dev:clean
```

## Environment Variables

Create a local `.env` file with the client-side values used by the app:

```env
REACT_APP_SUPABASE_URL=your_supabase_url
REACT_APP_SUPABASE_KEY=your_supabase_anon_key
REACT_APP_B2_BUCKET_NAME=your_b2_bucket_name
REACT_APP_BIRTHDAY_PASSWORD=your_birthday_password
REACT_APP_REDIRECT_URL=https://your-domain.com/piracy_is_cool
```

Set these values in Netlify for the serverless functions:

```env
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
B2_KEY_ID=your_b2_key_id
B2_APP_KEY=your_b2_app_key
B2_BUCKET_ID=your_b2_bucket_id
B2_BUCKET_NAME=your_b2_bucket_name
```

## Feature Notes

### Birthday + RSVP

The birthday page is password protected and includes the RSVP form plus event details and calendar download support.

### Workout Tracker

The workout page lets a signed-in user log training sessions by program, week, day, exercise, reps, weight, and timer data.

### Pirate Hub

The pirate area is the most feature-rich part of the app. It uses Supabase auth, private Backblaze B2 storage, and Netlify functions to handle uploads, folder management, chat, and secure downloads.

Large uploads use multipart chunking, while smaller files use presigned upload URLs with a proxy fallback for tiny files.

### Magic-Link Sign In

The `/piracy` route sends a Supabase magic link email and redirects signed-in users into the private pirate hub.

## Deployment

The project is configured for Netlify. Build output goes to `build/`, and serverless functions live in `netlify/functions/`.

If you change database tables, storage rules, or function behavior, update the matching SQL migration or function file alongside the code.
