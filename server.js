import express from "express";
import bcrypt from "bcryptjs";

const app = express();
app.use(express.json());

const PORT = 3000;
const users = [];
const loginAttempts = new Map();

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const isNonEmptyString = (value) => typeof value === "string" && value.length > 0;

// Returns the minutes left on an active lock, or 0 if the account is not locked.
// An expired lock is removed so the attempt counter starts again.
function getLockoutMinutes(key) {
  const attempt = loginAttempts.get(key);
  if (!attempt?.lockedUntil) {
    return 0;
  }

  const remainingMs = attempt.lockedUntil.getTime() - Date.now();
  if (remainingMs <= 0) {
    loginAttempts.delete(key);
    return 0;
  }

  return Math.ceil(remainingMs / 60000);
}

// Records a failed login, locks the account on the final attempt,
// and returns how many attempts are left.
function recordFailedAttempt(key) {
  const attempt = loginAttempts.get(key) ?? { count: 0, lockedUntil: null };
  attempt.count++;
  if (attempt.count >= MAX_FAILED_ATTEMPTS) {
    attempt.lockedUntil = new Date(Date.now() + LOCKOUT_MS);
  }
  loginAttempts.set(key, attempt);
  return MAX_FAILED_ATTEMPTS - attempt.count;
}

app.post("/api/auth/register", async (req, res) => {
  const { email, password, name } = req.body ?? {};

  if (!isNonEmptyString(email) || !isNonEmptyString(password) || !isNonEmptyString(name)) {
    return res.status(400).json({ error: "Email, password, and name are required" });
  }

  if (!EMAIL_PATTERN.test(email)) {
    return res.status(400).json({ error: "Invalid email format" });
  }

  if (password.length < 8) {
    return res.status(400).json({ error: "Password must be at least 8 characters, contain one uppercase letter and one number" });
  }

  if (!/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
    return res.status(400).json({ error: "Password must be at least 8 characters, contain one uppercase letter and one number" });
  }

  if (name.trim().length < 2) {
    return res.status(400).json({ error: "Name must be at least 2 characters" });
  }

  const emailLower = email.toLowerCase();
  const duplicate = users.find(u => u.email.toLowerCase() === emailLower);
  if (duplicate) {
    return res.status(409).json({ error: "Email already registered" });
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const user = {
    id: users.length + 1,
    email,
    name: name.trim()
  };

  users.push({ ...user, password: hashedPassword });

  return res.status(201).json({ user: { id: user.id, email: user.email, name: user.name } });
});

app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body ?? {};

  if (!isNonEmptyString(email) || !isNonEmptyString(password)) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  const key = email.toLowerCase();

  const lockoutMinutes = getLockoutMinutes(key);
  if (lockoutMinutes > 0) {
    return res.status(429).json({ error: `Account locked. Try again in ${lockoutMinutes} minutes.` });
  }

  const user = users.find(u => u.email.toLowerCase() === key);
  const passwordMatch = user ? await bcrypt.compare(password, user.password) : false;

  if (passwordMatch) {
    loginAttempts.delete(key);
    return res.status(200).json({ message: "Login successful", user: { id: user.id, email: user.email, name: user.name } });
  }

  // Unknown emails and wrong passwords get the same response, so it can't reveal which emails exist.
  const attemptsRemaining = recordFailedAttempt(key);
  return res.status(401).json({ error: "Invalid email or password", attemptsRemaining });
});

// Return errors such as malformed JSON as JSON, without exposing a stack trace.
app.use((err, req, res, next) => {
  const status = err.status ?? 500;
  const error = status === 400 ? "Invalid JSON in request body" : "Internal server error";
  res.status(status).json({ error });
});

app.listen(PORT, (err) => {
  if (err) {
    console.error(`Could not start server on port ${PORT}: ${err.message}`);
    process.exit(1);
  }
  console.log(`Server running on http://localhost:${PORT}`);
});