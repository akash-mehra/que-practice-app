"use client";

/**
 * Client-side PDF content extraction using pdf.js: pulls out text and
 * embedded images in document reading order (the input pdfImageMatch.ts
 * needs), and renders each image to a PNG data URL for display/storage.
 *
 * Runs entirely in the browser — pdf.js's worker and canvas rendering are
 * both browser APIs unavailable in a plain Node environment, which is why
 * this file is excluded from the Node-based unit tests covering the
 * matching logic itself (pdfImageMatch.ts). This is the one piece of the
 * image pipeline that genuinely needs verification in a real browser.
 */

export interface PdfToken {
  order: number;
  type: "text" | "image";
  page: number;
  /** For text tokens. */
  text?: string;
  /** For image tokens: a unique id used to look the pixel data back up. */
  tokenId?: string;
  /** For image tokens: the rendered PNG, ready to display or store. */
  dataUrl?: string;
}

// pdf.js ships its own worker script; point at the matching version's CDN
// build rather than bundling a separate worker file into this project.
async function getPdfjs() {
  const pdfjsLib = await import("pdfjs-dist");
  // Resolve the worker as a bundled asset (Turbopack/webpack rewrite this to
  // a local URL at build time) rather than fetching it from a CDN at
  // runtime. A CDN dependency here is a real, silent failure mode on a
  // static site — if unpkg is unreachable, blocked by a network filter, or
  // briefly out of sync with the installed pdfjs-dist version, extraction
  // fails with no obvious cause. Bundling it removes that dependency
  // entirely; the worker ships with the app itself.
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url
  ).toString();
  return pdfjsLib;
}

/** 2D affine transform matrix [a, b, c, d, e, f], PDF/Postscript convention. */
type Matrix = [number, number, number, number, number, number];

function multiplyMatrix(m1: Matrix, m2: Matrix): Matrix {
  return [
    m1[0] * m2[0] + m1[1] * m2[2],
    m1[0] * m2[1] + m1[1] * m2[3],
    m1[2] * m2[0] + m1[3] * m2[2],
    m1[2] * m2[1] + m1[3] * m2[3],
    m1[4] * m2[0] + m1[5] * m2[2] + m2[4],
    m1[4] * m2[1] + m1[5] * m2[3] + m2[5],
  ];
}

function imageDataToPngDataUrl(width: number, height: number, rgba: Uint8ClampedArray): string {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context unavailable.");
  const imageData = new ImageData(rgba as unknown as Uint8ClampedArray<ArrayBuffer>, width, height);
  ctx.putImageData(imageData, 0, 0);
  return canvas.toDataURL("image/png");
}

/**
 * Converts whatever pixel format pdf.js's page.objs.get() handed back into
 * a straightforward RGBA buffer. pdf.js image objects are commonly RGB
 * (3 bytes/pixel) or already RGBA (4 bytes/pixel) depending on the source
 * image's color space; this normalizes either into RGBA for canvas.
 */
function toRGBA(data: Uint8ClampedArray | Uint8Array, width: number, height: number): Uint8ClampedArray {
  const pixelCount = width * height;
  if (data.length === pixelCount * 4) {
    return data instanceof Uint8ClampedArray ? data : new Uint8ClampedArray(data);
  }
  if (data.length === pixelCount * 3) {
    const rgba = new Uint8ClampedArray(pixelCount * 4);
    for (let i = 0; i < pixelCount; i++) {
      rgba[i * 4] = data[i * 3];
      rgba[i * 4 + 1] = data[i * 3 + 1];
      rgba[i * 4 + 2] = data[i * 3 + 2];
      rgba[i * 4 + 3] = 255;
    }
    return rgba;
  }
  throw new Error(`Unexpected image byte length ${data.length} for ${width}x${height}.`);
}

export async function extractPdfContent(file: File): Promise<PdfToken[]> {
  const pdfjsLib = await getPdfjs();
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  const tokens: PdfToken[] = [];
  let order = 0;
  let imageCounter = 0;

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);

    // Text content, in pdf.js's reading order (reliable for standard
    // single/near-single-column layouts, which is what this whole matching
    // approach assumes per how these source PDFs are structured).
    const textContent = await page.getTextContent();
    const textItems = textContent.items as { str: string }[];

    // Image content: walk the raw operator list, tracking the transform
    // stack so we know each image paint's position in the SAME reading
    // sequence as the text — this is what lets us interleave "text, text,
    // image, text" in true document order rather than getting all text
    // then all images with no relative ordering between them.
    const opList = await page.getOperatorList();
    const { OPS } = pdfjsLib;

    let currentMatrix: Matrix = [1, 0, 0, 1, 0, 0];
    const stack: Matrix[] = [];
    let textItemIndex = 0;
    const pageImagePositions: { name: string; y: number }[] = [];

    for (let i = 0; i < opList.fnArray.length; i++) {
      const fn = opList.fnArray[i];
      const args = opList.argsArray[i];

      if (fn === OPS.save) {
        stack.push([...currentMatrix]);
      } else if (fn === OPS.restore) {
        const popped = stack.pop();
        if (popped) currentMatrix = popped;
      } else if (fn === OPS.transform) {
        currentMatrix = multiplyMatrix(
          [args[0], args[1], args[2], args[3], args[4], args[5]],
          currentMatrix
        );
      } else if (fn === OPS.paintImageXObject || fn === OPS.paintImageMaskXObject) {
        pageImagePositions.push({ name: args[0], y: currentMatrix[5] });
      } else if (fn === OPS.showText && textItemIndex < textItems.length) {
        // Interleave text items in the same relative order they're drawn.
        // showText calls correspond 1:1 with text runs in most simple PDFs;
        // this is an approximation, not a guaranteed perfect mapping, but
        // it's sufficient for establishing coarse reading-order sequence.
        textItemIndex++;
      }
    }

    // Text events, ordered top-to-bottom by their own transform Y (pdf.js
    // text items include `transform`, where transform[5] is the Y position;
    // larger Y = higher on the page in PDF's coordinate space).
    const textContentFull = await page.getTextContent();
    type TextItemWithTransform = { str: string; transform: number[] };
    const sortedTextItems = (textContentFull.items as TextItemWithTransform[])
      .filter((it) => it.str && it.str.trim())
      .map((it) => ({ str: it.str, y: it.transform[5] }))
      .sort((a, b) => b.y - a.y);

    // Merge text and image events into one page-local sequence sorted by Y
    // (top to bottom), then append to the document-wide ordered stream.
    const pageEvents: { y: number; kind: "text" | "image"; text?: string; name?: string }[] = [
      ...sortedTextItems.map((t) => ({ y: t.y, kind: "text" as const, text: t.str })),
      ...pageImagePositions.map((p) => ({ y: p.y, kind: "image" as const, name: p.name })),
    ].sort((a, b) => b.y - a.y);

    for (const ev of pageEvents) {
      if (ev.kind === "text") {
        tokens.push({ order, type: "text", text: ev.text, page: pageNum });
        order++;
      } else {
        try {
          const imgObj = await new Promise<{
            data: Uint8ClampedArray | Uint8Array;
            width: number;
            height: number;
          }>((resolve, reject) => {
            page.objs.get(ev.name!, (obj: unknown) => {
              if (!obj) reject(new Error("Image object not found"));
              else resolve(obj as { data: Uint8ClampedArray | Uint8Array; width: number; height: number });
            });
          });
          const rgba = toRGBA(imgObj.data, imgObj.width, imgObj.height);
          const dataUrl = imageDataToPngDataUrl(imgObj.width, imgObj.height, rgba);
          const tokenId = `img-${imageCounter++}`;
          tokens.push({ order, type: "image", tokenId, dataUrl, page: pageNum });
          order++;
        } catch {
          // Some XObjects (e.g. soft masks, unsupported filters) can't be
          // resolved to plain pixel data — skip rather than fail the whole
          // extraction over one problematic image.
        }
      }
    }
  }

  return tokens;
}

