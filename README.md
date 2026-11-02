# Week 7 Day 1: Password Hashing and Login Security

This project covers the basics of handling passwords safely in a Node.js app. It has two parts:

- `hash-demo.js` is a small script that shows how bcrypt hashing and comparison work.
- `server.js` is an Express API with register and login endpoints. Login locks an account after too many failed attempts.

## Requirements

- Node.js 18 or newer (tested on v20)
- npm

## Getting started

```bash
git clone https://github.com/Abdisamad6378/week-7-day-1-assignment.git
cd week-7-day-1-assignment
npm install
```

Start the server:

```bash
npm start
```

It runs on http://localhost:3000. If that port is already taken, the server prints an error and exits, so stop whatever is using the port and try again.

Run the hashing demo:

```bash
node hash-demo.js
```

## The hashing demo

The script takes five sample passwords and:

1. Hashes each one with a cost factor of 10 and prints the password next to its hash
2. Hashes `Nairobi2026!` twice to show that the two hashes are different
3. Checks each password against its own hash, which should print `true`
4. Checks `wrongPassword` against every hash, which should print `false`

Step 2 is the interesting one. bcrypt generates a new random salt every time and stores it inside the hash, so the same password never produces the same hash twice. `bcrypt.compare()` can still verify a password because it reads the salt back out of the stored hash.

## API

### POST /api/auth/register

Creates a new user.

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email": "wanjiku@mail.com", "password": "Secure123", "name": "Wanjiku"}'
```

Validation rules:

| Field | Rule |
|---|---|
| `email` | Must look like `name@domain.com`. Must not already be registered (upper and lower case count as the same email). |
| `password` | At least 8 characters, with one uppercase letter and one number |
| `name` | At least 2 characters after trimming spaces |

Responses:

| Status | When | Body |
|---|---|---|
| 201 | User created | `{ "user": { "id": 1, "email": "wanjiku@mail.com", "name": "Wanjiku" } }` |
| 400 | A field is missing or not a string | `{ "error": "Email, password, and name are required" }` |
| 400 | Bad email | `{ "error": "Invalid email format" }` |
| 400 | Weak password | `{ "error": "Password must be at least 8 characters, contain one uppercase letter and one number" }` |
| 400 | Name too short | `{ "error": "Name must be at least 2 characters" }` |
| 409 | Email already registered | `{ "error": "Email already registered" }` |

The password hash is never included in a response.

### POST /api/auth/login

Checks an email and password.

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "wanjiku@mail.com", "password": "Secure123"}'
```

Responses:

| Status | When | Body |
|---|---|---|
| 200 | Login worked | `{ "message": "Login successful", "user": { "id": 1, "email": "wanjiku@mail.com", "name": "Wanjiku" } }` |
| 400 | Email or password is missing or not a string | `{ "error": "Email and password are required" }` |
| 401 | Wrong email or password | `{ "error": "Invalid email or password", "attemptsRemaining": 4 }` |
| 429 | Account is locked | `{ "error": "Account locked. Try again in 15 minutes." }` |

A request with malformed JSON gets a 400 with `{ "error": "Invalid JSON in request body" }` on either endpoint.

## How the lockout works

Failed attempts are tracked per email in a `Map`:

```javascript
// Key: email, Value: { count: number, lockedUntil: Date | null }
const loginAttempts = new Map();
```

- Each failed login adds one to the count, and the response says how many attempts are left.
- The 5th failure locks the account for 15 minutes.
- While it's locked, every attempt gets a 429 with the time remaining, even if the password is correct.
- When the lock runs out, the count starts again from zero.
- A successful login also resets the count.

Unknown emails go through the same steps as wrong passwords and get the same message, so the response doesn't reveal whether an email is registered.

## Trying out the lockout

Register a user with the command above, then run this:

```bash
for i in 1 2 3 4 5 6; do
  curl -s -X POST http://localhost:3000/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email": "wanjiku@mail.com", "password": "wrongPassword"}'
  echo
done
```

The first five requests return 401 with `attemptsRemaining` counting down from 4 to 0. The sixth returns 429.

To clear a lock while testing, restart the server. This also deletes all users, so you'll need to register again.

## Limitations

This is a learning project and isn't ready for production as it is:

- Users and login attempts are stored in memory, so they're lost whenever the server restarts.
- Successful logins don't create a session or token. The API only confirms that the password was right.
- Anyone who knows an email can lock that account by failing on purpose.
- Unknown emails skip the bcrypt check and get a slightly faster response, which could be measured to work out which emails exist.

## Project files

| File | Purpose |
|---|---|
| `hash-demo.js` | bcrypt hashing and comparison demo |
| `server.js` | Express server with the register and login endpoints |
| `package.json` | Project settings and dependencies |

## Built with

- [Express 5](https://expressjs.com/) for the API
- [bcryptjs](https://www.npmjs.com/package/bcryptjs), a plain JavaScript version of bcrypt with the same API
