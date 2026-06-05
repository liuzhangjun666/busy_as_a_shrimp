import * as path from "path";

export function resolveUploadsDir(): string {
  const configured = process.env.UPLOAD_DIR?.trim();
  if (configured) {
    return path.isAbsolute(configured) ? configured : path.resolve(process.cwd(), configured);
  }

  // Default to a stable path under apps/api/uploads, independent of process.cwd().
  return path.resolve(__dirname, "..", "..", "uploads");
}
