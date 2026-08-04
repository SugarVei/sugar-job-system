export interface OcrProgress {
  imageIndex: number;
  imageCount: number;
  progress: number;
}

function cleanOcrText(text: string) {
  return text
    .replace(/\f/g, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export async function extractTextFromImages(
  images: string[],
  onProgress?: (progress: OcrProgress) => void,
) {
  const { createWorker } = await import('tesseract.js');
  let activeImageIndex = 0;
  const worker = await createWorker(['chi_sim', 'eng'], 1, {
    logger: (message) => {
      if (message.status !== 'recognizing text') return;
      onProgress?.({
        imageIndex: activeImageIndex + 1,
        imageCount: images.length,
        progress: message.progress,
      });
    },
  });

  try {
    const results: string[] = [];
    for (let index = 0; index < images.length; index += 1) {
      activeImageIndex = index;
      const result = await worker.recognize(images[index]);
      const text = cleanOcrText(result.data.text);
      if (text) results.push(`[截图 ${index + 1} OCR 文字]\n${text}`);
    }
    return results.join('\n\n');
  } finally {
    await worker.terminate();
  }
}
