import { randomUUID } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import { isAbsolute, resolve } from "node:path";
import { PrismaClient } from "@prisma/client";
import { del, put } from "@vercel/blob";

const prisma = new PrismaClient();
const legacyPrefix = "/uploads/statements/";
const legacyDirectory = resolve(process.cwd(), "public", "uploads", "statements");
const privateDirectorySetting =
  process.env.PRIVATE_UPLOAD_DIR ?? ".private/uploads";
const privateDirectory = isAbsolute(privateDirectorySetting)
  ? privateDirectorySetting
  : resolve(process.cwd(), privateDirectorySetting);

function getPrivateFilePath(key) {
  const filePath = resolve(privateDirectory, key);
  if (!filePath.startsWith(`${privateDirectory}\\`)) {
    throw new Error("Invalid private attachment key");
  }
  return filePath;
}

async function storePrivately(attachment, content) {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (token) {
    const blob = await put(
      `statements/${attachment.statementId}/${randomUUID()}`,
      content,
      {
        access: "private",
        addRandomSuffix: true,
        cacheControlMaxAge: 60,
        contentType: attachment.tipeMime,
        token,
      },
    );
    return `blob:${blob.url}`;
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "BLOB_READ_WRITE_TOKEN must be configured for production migration",
    );
  }

  const key = randomUUID();
  await mkdir(privateDirectory, { recursive: true });
  await writeFile(getPrivateFilePath(key), content, { flag: "wx" });
  return `local:${key}`;
}

async function removeStoredFile(storageKey) {
  if (storageKey.startsWith("blob:")) {
    await del(storageKey.slice("blob:".length));
  } else if (storageKey.startsWith("local:")) {
    await unlink(getPrivateFilePath(storageKey.slice("local:".length)));
  }
}

async function main() {
  if (process.env.MIGRATE_PUBLIC_ATTACHMENTS !== "1") {
    throw new Error(
      "Set MIGRATE_PUBLIC_ATTACHMENTS=1 after confirming DATABASE_URL and the source public/uploads/statements directory.",
    );
  }

  const attachments = await prisma.attachment.findMany({
    where: { filePath: { startsWith: legacyPrefix } },
    select: {
      id: true,
      statementId: true,
      filePath: true,
      tipeMime: true,
    },
    orderBy: { id: "asc" },
  });

  let migrated = 0;
  for (const attachment of attachments) {
    const filename = attachment.filePath.slice(legacyPrefix.length);
    if (!filename || filename.includes("/") || filename.includes("\\")) {
      throw new Error(`Unexpected legacy attachment path for ID ${attachment.id}`);
    }

    const sourcePath = resolve(legacyDirectory, filename);
    if (!sourcePath.startsWith(`${legacyDirectory}\\`)) {
      throw new Error(`Invalid legacy attachment path for ID ${attachment.id}`);
    }

    const content = await readFile(sourcePath);
    const storageKey = await storePrivately(attachment, content);
    try {
      const updated = await prisma.attachment.updateMany({
        where: { id: attachment.id, filePath: attachment.filePath },
        data: { filePath: storageKey },
      });
      if (updated.count !== 1) {
        throw new Error(`Attachment ${attachment.id} changed during migration`);
      }
    } catch (error) {
      await removeStoredFile(storageKey);
      throw error;
    }

    await unlink(sourcePath);
    migrated += 1;
    console.log(`Migrated attachment ${attachment.id}`);
  }

  console.log(`Migrated ${migrated} attachment(s) to private storage.`);
}

main()
  .catch((error) => {
    console.error("Private attachment migration failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
