import { Injectable } from '@angular/core';
import { FileSharer, type SharedFile, type ShareResult } from '../domain/ports';

function toFile(file: SharedFile): File {
  return new File([file.bytes], file.name, { type: file.mime });
}

/** The phone's share sheet (Web Share API), with a plain download as the last resort. */
@Injectable()
export class WebShareSharer extends FileSharer {
  override canShare(files: readonly SharedFile[]): boolean {
    if (typeof navigator === 'undefined' || !('canShare' in navigator) || !('share' in navigator)) {
      return false;
    }
    try {
      return navigator.canShare({ files: files.map(toFile) });
    } catch {
      return false;
    }
  }

  override async share(files: readonly SharedFile[], title: string): Promise<ShareResult> {
    try {
      await navigator.share({ files: files.map(toFile), title });
      return 'shared';
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        return 'cancelled';
      }
      throw error;
    }
  }

  override download(files: readonly SharedFile[]): void {
    for (const file of files) {
      const url = URL.createObjectURL(toFile(file));
      const link = document.createElement('a');
      link.href = url;
      link.download = file.name;
      document.body.append(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    }
  }
}
