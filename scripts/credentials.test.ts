import assert from "node:assert/strict";
import test from "node:test";
import {
  createWithUniqueCredentials,
  type CredentialCreationResult,
} from "../src/lib/credentials";

test("createWithUniqueCredentials retries username collisions", async () => {
  let attempts = 0;

  const result = await createWithUniqueCredentials("Alex Teacher", async () => {
    attempts += 1;
    if (attempts < 3) {
      return {
        data: null,
        error: { code: "23505", message: "duplicate key value violates unique constraint" },
      };
    }

    return { data: "created", error: null };
  });

  assert.equal(result.data, "created");
  assert.equal(result.error, null);
  assert.equal(attempts, 3);
});

test("createWithUniqueCredentials stops after five username collisions", async () => {
  let attempts = 0;
  const collision: CredentialCreationResult<null> = {
    data: null,
    error: { code: "23505", message: "duplicate key value violates unique constraint" },
  };

  const result = await createWithUniqueCredentials("Alex Teacher", async () => {
    attempts += 1;
    return collision;
  });

  assert.equal(result.error, collision.error);
  assert.equal(attempts, 5);
});
