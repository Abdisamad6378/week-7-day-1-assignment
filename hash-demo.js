import bcrypt from "bcryptjs";

const passwords = [
  "Nairobi2026!",
  "securePass123",
  "myS3cretK3y",
  "W@njiku#Strong",
  "simple"
];

async function runHashDemo() {
  const hashes = [];

  console.log("Hashing passwords with bcrypt (cost factor 10):\n");

  for (const password of passwords) {
    const hash = await bcrypt.hash(password, 10);
    hashes.push(hash);
    console.log(`Password: "${password}" -> Hash: ${hash}`);
  }

  console.log("\nSame password, different hashes:");
  const hash1 = await bcrypt.hash("Nairobi2026!", 10);
  const hash2 = await bcrypt.hash("Nairobi2026!", 10);
  console.log(`"Nairobi2026!" -> Hash 1: ${hash1}`);
  console.log(`"Nairobi2026!" -> Hash 2: ${hash2}`);
  console.log(`Hashes are different: ${hash1 !== hash2}`);

  console.log("\nVerification:");
  for (let i = 0; i < passwords.length; i++) {
    const password = passwords[i];
    const hash = hashes[i];
    const match = await bcrypt.compare(password, hash);
    console.log(`"${password}" vs Hash ${i + 1}: ${match}`);
  }

  console.log("\nWrong password test:");
  const wrongPassword = "wrongPassword";
  for (let i = 0; i < passwords.length; i++) {
    const hash = hashes[i];
    const match = await bcrypt.compare(wrongPassword, hash);
    console.log(`"wrongPassword" vs Hash ${i + 1}: ${match}`);
  }
}

runHashDemo().catch(console.error);