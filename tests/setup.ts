import "dotenv/config";

process.env.AUTH_SECRET ??= "test-secret-not-used-in-production";

const mainUrl = process.env.DATABASE_URL;
const testUrl = process.env.TEST_DATABASE_URL;

if (!testUrl) {
  throw new Error("TEST_DATABASE_URL is not set. Refusing to run tests.");
}
if (testUrl === mainUrl) {
  throw new Error(
    "TEST_DATABASE_URL is the same as DATABASE_URL. Refusing to run tests against the main database."
  );
}

process.env.DATABASE_URL = testUrl;