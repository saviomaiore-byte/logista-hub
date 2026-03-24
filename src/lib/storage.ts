import { supabase } from "@/integrations/supabase/client";

/**
 * Extracts the storage path from a public URL or returns the path as-is.
 * Handles both old public URLs and raw storage paths.
 */
export function extractStoragePath(urlOrPath: string): string {
  // If it's a full URL, extract the path after /documentos/
  const marker = "/object/public/documentos/";
  const idx = urlOrPath.indexOf(marker);
  if (idx !== -1) {
    return decodeURIComponent(urlOrPath.substring(idx + marker.length));
  }
  // Already a path
  return urlOrPath;
}

/**
 * Creates a signed URL for a file in the documentos bucket.
 * Returns the signed URL or null on error.
 * Default expiry: 1 hour (3600 seconds).
 */
export async function getSignedFileUrl(
  urlOrPath: string,
  expiresIn = 3600
): Promise<string | null> {
  const path = extractStoragePath(urlOrPath);
  const { data, error } = await supabase.storage
    .from("documentos")
    .createSignedUrl(path, expiresIn);

  if (error) {
    console.error("Error creating signed URL:", error);
    return null;
  }
  return data.signedUrl;
}

/**
 * Opens a file in a new tab using a signed URL.
 */
export async function openSignedFile(urlOrPath: string): Promise<void> {
  const signedUrl = await getSignedFileUrl(urlOrPath);
  if (signedUrl) {
    window.open(signedUrl, "_blank");
  }
}
