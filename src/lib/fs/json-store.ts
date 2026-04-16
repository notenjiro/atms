import { promises as fs } from "node:fs";
import path from "node:path";

async function ensureDirectoryExists(filePath: string): Promise<void> {
  const directoryPath = path.dirname(filePath);
  await fs.mkdir(directoryPath, { recursive: true });
}

async function ensureFileExists<T>(filePath: string, fallbackData: T): Promise<void> {
  try {
    await fs.access(filePath);
  } catch {
    await ensureDirectoryExists(filePath);
    await fs.writeFile(filePath, JSON.stringify(fallbackData, null, 2), "utf8");
  }
}

export async function readJsonFile<T>(filePath: string, fallbackData: T): Promise<T> {
  await ensureFileExists(filePath, fallbackData);

  try {
    const fileContent = await fs.readFile(filePath, "utf8");

    if (!fileContent.trim()) {
      return fallbackData;
    }

    return JSON.parse(fileContent) as T;
  } catch (error) {
    console.error(`Failed to read JSON file: ${filePath}`, error);
    return fallbackData;
  }
}

export async function writeJsonFile<T>(filePath: string, data: T): Promise<void> {
  await ensureDirectoryExists(filePath);

  const tempFilePath = `${filePath}.tmp`;
  const serialized = JSON.stringify(data, null, 2);

  await fs.writeFile(tempFilePath, serialized, "utf8");
  await fs.rename(tempFilePath, filePath);
}

export async function updateJsonFile<T>(
  filePath: string,
  fallbackData: T,
  updater: (currentData: T) => T | Promise<T>,
): Promise<T> {
  const currentData = await readJsonFile(filePath, fallbackData);
  const nextData = await updater(currentData);

  await writeJsonFile(filePath, nextData);

  return nextData;
}