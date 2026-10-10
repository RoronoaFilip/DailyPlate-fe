import type { Bundle } from './bundle';
import type { FileSharer, SharedFile } from './ports';
import { makeZip } from './zip';

/**
 * How the bundle left the phone:
 * - `shared-zip`: one zip went to the share sheet (best case);
 * - `shared-files`: the phone refused a zip, so the CSV files and photos went as separate files;
 * - `downloaded`: neither could be shared, so the zip was saved for sharing from the Files app;
 * - `cancelled`: the share sheet was dismissed.
 */
export type SendOutcome = 'shared-zip' | 'shared-files' | 'downloaded' | 'cancelled';

const MIME_BY_EXTENSION: Record<string, string> = {
  csv: 'text/csv',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
};

function mimeFor(name: string): string {
  const extension = name.split('.').pop()?.toLowerCase() ?? '';
  return MIME_BY_EXTENSION[extension] ?? 'application/octet-stream';
}

export function bundleAsZip(bundle: Bundle): SharedFile {
  return { name: bundle.zipName, mime: 'application/zip', bytes: makeZip(bundle.entries) };
}

/** Separate files for the fallback; the photo folder is flattened because the share sheet has no folders. */
export function bundleAsFiles(bundle: Bundle): SharedFile[] {
  return bundle.entries.map((entry) => {
    const name = entry.name.split('/').pop() ?? entry.name;
    return { name, mime: mimeFor(name), bytes: entry.data };
  });
}

async function tryShare(sharer: FileSharer, files: SharedFile[], title: string): Promise<'shared' | 'cancelled' | 'failed'> {
  if (files.length === 0 || !sharer.canShare(files)) {
    return 'failed';
  }
  try {
    return await sharer.share(files, title);
  } catch {
    return 'failed';
  }
}

export async function sendBundle(bundle: Bundle, sharer: FileSharer): Promise<SendOutcome> {
  const zip = bundleAsZip(bundle);
  const title = 'Daily Plate';
  const asZip = await tryShare(sharer, [zip], title);
  if (asZip === 'shared') {
    return 'shared-zip';
  }
  if (asZip === 'cancelled') {
    return 'cancelled';
  }
  const asFiles = await tryShare(sharer, bundleAsFiles(bundle), title);
  if (asFiles === 'shared') {
    return 'shared-files';
  }
  if (asFiles === 'cancelled') {
    return 'cancelled';
  }
  sharer.download([zip]);
  return 'downloaded';
}
