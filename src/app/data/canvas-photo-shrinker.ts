import { Injectable } from '@angular/core';
import type { Bytes } from '../domain/models';
import { fitWithin } from '../domain/photo';
import { PhotoShrinker } from '../domain/ports';

const JPEG_QUALITY = 0.85;

/** Redraws a picture smaller on a canvas and saves it as a JPEG (this also applies the photo's rotation). */
@Injectable()
export class CanvasPhotoShrinker extends PhotoShrinker {
  override async toJpeg(file: Blob, maxSide: number): Promise<Bytes> {
    const bitmap = await createImageBitmap(file);
    try {
      const { width, height } = fitWithin(bitmap.width, bitmap.height, maxSide);
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext('2d');
      if (!context) {
        throw new Error('This browser cannot draw pictures.');
      }
      context.drawImage(bitmap, 0, 0, width, height);
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY));
      if (!blob) {
        throw new Error('The picture could not be saved as a JPEG.');
      }
      return new Uint8Array(await blob.arrayBuffer());
    } finally {
      bitmap.close();
    }
  }
}
