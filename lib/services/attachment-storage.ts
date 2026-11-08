import { randomUUID } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import { isAbsolute, resolve, sep } from "node:path";
import { del, get, put } from "@vercel/blob";

const BLOB_PREFIX = "blob:";
const LOCAL_PREFIX = "local:";

function getLocalStorageDirectory() {
  const configuredDirectory = process.env.PRIVATE_UPLOAD_DIR ?? ".private/uploads";
  return isAbsolute(configuredDirectory)
    ? configuredDirectory
    : resolve(process.cwd(), configuredDirectory);
}

function getLocalStoragePath(key: string) {
  const directory = getLocalStorageDirectory();
  const filePath = resolve(directory, key);
  if (!filePath.startsWith(`${directory}${sep}`)) {
    throw new Error("Invalid private attachment key");
  }
  return filePath;
}

export async function storePrivateAttachment(
  statementId: number,
  contentType: string,
  content: Buffer,
) {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (token) {
    const blob = await put(
      `statements/${statementId}/${randomUUID()}`,
      content,
      {
        access: "private",
        addRandomSuffix: true,
        cacheControlMaxAge: 60,
        contentType,
        token,
      },
    );
    return `${BLOB_PREFIX}${blob.url}`;
  }

  if (
    process.env.NODE_ENV === "production" &&
    process.env.VERCEL === "1"
  ) {
    throw new Error(
      "BLOB_READ_WRITE_TOKEN must be configured for private attachment storage in production",
    );
  }

  const key = randomUUID();
  const directory = getLocalStorageDirectory();
  await mkdir(directory, { recursive: true });
  await writeFile(getLocalStoragePath(key), content, { flag: "wx" });
  return `${LOCAL_PREFIX}${key}`;
}

export async function readPrivateAttachment(storageKey: string) {
  if (storageKey.startsWith(BLOB_PREFIX)) {
    const blob = await get(storageKey.slice(BLOB_PREFIX.length), {
      access: "private",
      useCache: false,
    });
    return blob?.statusCode === 200 ? blob.stream : null;
  }

  if (storageKey.startsWith(LOCAL_PREFIX)) {
    return readFile(
      getLocalStoragePath(storageKey.slice(LOCAL_PREFIX.length)),
    );
  }

  throw new Error(
    "Attachment uses legacy public storage; run db:migrate-public-attachments before downloading it",
  );
}

export async function removePrivateAttachment(storageKey: string) {
  if (storageKey.startsWith(BLOB_PREFIX)) {
    await del(storageKey.slice(BLOB_PREFIX.length));
    return;
  }

  if (storageKey.startsWith(LOCAL_PREFIX)) {
    await unlink(getLocalStoragePath(storageKey.slice(LOCAL_PREFIX.length)));
    return;
  }

  throw new Error(
    "Attachment uses legacy public storage; migrate it before deleting it",
  );
}
