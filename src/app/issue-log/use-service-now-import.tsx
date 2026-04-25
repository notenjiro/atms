"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";

type ImportApiResponse = {
  success?: boolean;
  message?: unknown;
  data?: {
    batch?: {
      createdRows?: number;
      updatedRows?: number;
      skippedRows?: number;
      warnings?: string[];
    };
    importedItems?: number;
  };
  error?: unknown;
  details?: unknown;
};

function stringifyErrorValue(value: unknown): string | null {
  if (!value) return null;

  if (typeof value === "string") {
    return value;
  }

  if (value instanceof Error) {
    return value.message;
  }

  if (typeof value === "object") {
    const maybeObject = value as Record<string, unknown>;

    if (typeof maybeObject.message === "string") {
      return maybeObject.message;
    }

    if (typeof maybeObject.error === "string") {
      return maybeObject.error;
    }

    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return String(value);
    }
  }

  return String(value);
}

function getImportErrorMessage(
  json: ImportApiResponse | null,
  fileName: string,
  status: number,
): string {
  return (
    stringifyErrorValue(json?.message) ||
    stringifyErrorValue(json?.error) ||
    stringifyErrorValue(json?.details) ||
    `Import failed for ${fileName}. HTTP ${status}`
  );
}

async function uploadOneFile(file: File): Promise<ImportApiResponse> {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch("/api/service-tickets/import", {
    method: "POST",
    body: formData,
  });

  const json = (await res.json().catch(() => null)) as ImportApiResponse | null;

  if (!res.ok) {
    throw new Error(getImportErrorMessage(json, file.name, res.status));
  }

  return json ?? {};
}

export function useServiceNowImport() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isImporting, setIsImporting] = useState(false);

  const openFilePicker = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const files = event.target.files;

    if (!files?.length) return;

    setIsImporting(true);

    try {
      const results: ImportApiResponse[] = [];

      for (const file of Array.from(files)) {
        const result = await uploadOneFile(file);
        results.push(result);
      }

      const importedItems = results.reduce(
        (sum, result) => sum + (result.data?.importedItems ?? 0),
        0,
      );

      const createdRows = results.reduce(
        (sum, result) => sum + (result.data?.batch?.createdRows ?? 0),
        0,
      );

      const updatedRows = results.reduce(
        (sum, result) => sum + (result.data?.batch?.updatedRows ?? 0),
        0,
      );

      const skippedRows = results.reduce(
        (sum, result) => sum + (result.data?.batch?.skippedRows ?? 0),
        0,
      );

      toast.success(
        `Import completed: ${importedItems} items, ${createdRows} created, ${updatedRows} updated, ${skippedRows} skipped.`,
      );

      window.location.reload();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Import failed.";

      console.error("SERVICE NOW IMPORT FAILED", error);
      toast.error(message);
    } finally {
      setIsImporting(false);
      event.target.value = "";
    }
  };

  return {
    fileInputRef,
    isImporting,
    openFilePicker,
    handleFileChange,
  };
}