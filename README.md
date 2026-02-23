# Pub Quiz Scoreboard

A lightweight pub quiz scoring tracker. Static HTML/CSS/JS frontend, Supabase backend. No frameworks, no build tools.

## Setup

### 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a free account.
2. Create a new project. Pick any name and a strong database password.
3. Wait for the project to finish provisioning.

### 2. Run the Database Schema

1. In your Supabase dashboard, go to **SQL Editor**.
2. Click **New query**.
3. Paste the entire contents of `supabase_schema.sql` and click **Run**.
4. You should see all tables created with no errors.

### 3. Verify RLS Policies

The schema SQL already enables Row Level Security and creates all policies. To verify:

1. Go to **Table Editor** in Supabase.
2. Click on each table (`quiz_config`, `teams`, `scores`).
3. Check that RLS is enabled (you'll see a shield icon or "RLS enabled" label).

The policies allow:
- **Anyone** (including anonymous visitors) can **read** all tables.
- Only **authenticated** users can **insert, update, or delete** data.

### 4. Create an Admin User

1. In Supabase, go to **Authentication** > **Users**.
2. Click **Add user** > **Create new user**.
3. Enter your email and a password. This is your admin login.

### 5. Configure the App

Open `config.js` and fill in your Supabase credentials:

```js
const SUPABASE_URL      = 'https://YOUR_PROJECT_REF.supabase.co';
const SUPABASE_ANON_KEY = 'YOUR_ANON_KEY';
```

Find these in **Supabase Dashboard** > **Settings** > **API**:
- **Project URL** = `SUPABASE_URL`
- **anon / public** key = `SUPABASE_ANON_KEY`

### 6. Deploy to GitHub Pages

1. Create a new GitHub repository.
2. Push all files to the `main` branch.
3. Go to **Settings** > **Pages**.
4. Set source to **Deploy from a branch**, branch `main`, folder `/ (root)`.
5. Your site will be live at `https://yourusername.github.io/your-repo/`.

## Usage

### Admin Panel (`admin.html`)

1. Open the admin page and sign in with the email/password from step 4.
2. **First time**: You'll see the Quiz Setup form.
   - Set the number of rounds and questions per round.
   - Toggle Tipovacka on/off (globally or per round).
   - Enter team names, one per line (max 30).
   - Click **Save Setup**. Config is now locked.
3. **Entering scores**: Select a round from the dropdown. Enter each team's points. If Tipovacka is enabled for that round, select which team earned the bonus point. Click **Save Round**.
4. **CSV import**: Upload a `.csv` file or paste CSV text. Format:
   ```
   Team Alpha,8,1
   Team Beta,7,0
   Team Gamma,9
   ```
   - Column 1: team name (must match exactly)
   - Column 2: standard points
   - Column 3 (optional): tipovacka (1 or 0)

   This prefills the score table. Review and click **Save Round**.
5. **Summary table** at the bottom shows all saved scores as a sanity check.
6. **Reset Quiz**: Deletes all data (config, teams, scores). Requires double confirmation.

### Public Scoreboard (`index.html`)

- No login required. Share this URL with all teams.
- **Overall Standings** tab: rank, team name, total points.
- **Round Breakdown** tab: per-round detail with totals.
- Auto-refreshes every 15 seconds.

## File Structure

```
index.html              Public scoreboard
admin.html              Admin panel
css/style.css           Shared styles
js/app.js               Public scoreboard logic
js/admin.js             Admin panel logic
js/supabase.js          Supabase client init
config.js               Supabase URL + anon key
supabase_schema.sql     Database schema + RLS policies
```
