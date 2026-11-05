# carvisio 🚗

**English** · [Русский](README.ru.md)

**A visual garage for people who remember when they last changed the oil. And for those who don't.**

Carvisio helps you keep an eye on your car's condition and keeps its whole service history in one place. No more digging through notes, trying to recall the mileage at the last replacement, or starting yet another Excel spreadsheet.

Add your car, list the components installed on it, and keep track of their condition, remaining life and service history.

👉 **[carvisio.pro](https://carvisio.pro)**

![Carvisio](docs/screenshot.png)

## What it can do

- **A visual garage.** Your car is shown as an interactive isometric drawing. Pick a system and jump straight to its components.
- **Component tracking.** Add parts, consumables and anything else on the car, along with the mileage it was installed at and how long it's expected to last.
- **Remaining life.** Carvisio estimates how much life is left based on mileage and time. Treat it as a guide for planning maintenance, not a diagnosis of actual wear.
- **Your own judgement counts.** You can flag a component as needing attention even if the math says it still has plenty of life left.
- **Service history.** Replacements, repairs, inspections and other work, each with a date, mileage, cost and notes. When you replace something, the old record stays in the history.
- **More than one car.** Keep the service history for your whole garage.
- **No sign-up required.** You can start right away. In guest mode your data stays in the browser; once you register, you can move it to your account and sync it across devices.
- **Works on a shaky connection.** Changes are saved locally and synced with the server once you're back online.

## Tech stack

The project has two parts:

**Frontend**
- Next.js
- React 19
- TypeScript
- Zustand
- SVG for the interactive car illustration

**Backend**
- Go
- PostgreSQL
- pgx

The frontend is built into static files, and the backend provides the API for data and accounts.

## Running locally

You'll need Node.js, Go 1.26+ and Docker.

### 1. Start the database

```bash
docker compose up -d
```

### 2. Start the API

```bash
cd server
cp .env.example .env
go run ./cmd/api
```

### 3. Start the frontend

In another terminal, from the project root:

```bash
npm install
npm run dev
```

The app will be available at [http://localhost:3017](http://localhost:3017).

For a quick look around, open the demo mode:

[http://localhost:3017/?seed=demo](http://localhost:3017/?seed=demo)

Locally, emails such as password resets aren't actually sent: they're printed to the API log instead.

## Checks

```bash
npx eslint .
npx tsc --noEmit

cd server
go vet ./...
go test ./...
```

## Project structure

```text
app/            App pages
components/     UI components
lib/            State, API, sync and calculations
lib/iso/        Car geometry and rendering
server/         Go API and database migrations
deploy/         Deployment files
```

---

Carvisio is a small project that grew out of a simple idea: it would be handy to have a car's entire service history at your fingertips instead of trying to piece it together from memory every time. 🔧
