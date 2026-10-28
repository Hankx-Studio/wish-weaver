// Mask/box cutout helpers (M4). Pure geometry + canvas compositing.
// The SAM mask raster is scaled onto its box rect (mask carries no
// frame offset on the wire); when no mask decodes, callers fall back
// to the plain box crop. Canvas fns need a browser; the pure fns run
// in node tests too.
import { parseSamOutput, pickBest, clampBox } from "../../server/samMask.js";

// Best segmentation from raw SAM text (or null when nothing usable).
export function analyzeSegmentation(text) {
  const { records } = parseSamOutput(text);
  return pickBest(records);
}

// Integer source rect of a box mapped from SAM frame pixels to the
// displayed image pixels (frameW/H = box.w/h from the wire).
export function cutPlanFor(box, frameW, frameH, imgW, imgH) {
  const c = clampBox(box);
  const sx = Math.round((c.x1 / frameW) * imgW);
  const sy = Math.round((c.y1 / frameH) * imgH);
  const sw = Math.max(1, Math.round(((c.x2 - c.x1) / frameW) * imgW));
  const sh = Math.max(1, Math.round(((c.y2 - c.y1) / frameH) * imgH));
  return {
    sx: Math.max(0, Math.min(sx, imgW - 1)),
    sy: Math.max(0, Math.min(sy, imgH - 1)),
    sw: Math.min(sw, imgW - sx),
    sh: Math.min(sh, imgH - sy),
  };
}

function canvasOf(w, h) {
  const cv = document.createElement("canvas");
  cv.width = Math.max(1, Math.round(w));
  cv.height = Math.max(1, Math.round(h));
  return cv;
}

// Plain box crop of an <img>/bitmap/canvas source.
export function boxCrop(img, box, frameW, frameH) {
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  const p = cutPlanFor(box, frameW, frameH, iw, ih);
  const cv = canvasOf(p.sw, p.sh);
  cv.getContext("2d").drawImage(img, p.sx, p.sy, p.sw, p.sh, 0, 0, p.sw, p.sh);
  return cv;
}

// Mask cutout: box crop with the raster as alpha (raster scaled to
// the crop). Returns null when there is no usable raster.
export function maskCutout(img, seg) {
  if (!seg || !seg.raster || !seg.box || !seg.mask) return null;
  const { raster, box, mask } = seg;
  const mw = mask.w;
  const mh = mask.h;
  if (!mw || !mh || raster.length !== mw * mh) return null;
  const crop = boxCrop(img, box, box.w, box.h);
  const m = canvasOf(crop.width, crop.height);
  const mctx = m.getContext("2d");
  const put = mctx.createImageData(crop.width, crop.height);
  const sx = mw / crop.width;
  const sy = mh / crop.height;
  for (let y = 0; y < crop.height; y += 1) {
    for (let x = 0; x < crop.width; x += 1) {
      const mx = Math.min(mw - 1, Math.floor(x * sx));
      const my = Math.min(mh - 1, Math.floor(y * sy));
      put.data[(y * crop.width + x) * 4 + 3] = raster[my * mw + mx] ? 255 : 0;
    }
  }
  const alpha = canvasOf(crop.width, crop.height);
  alpha.getContext("2d").putImageData(put, 0, 0);
  const out = canvasOf(crop.width, crop.height);
  const octx = out.getContext("2d");
  octx.drawImage(crop, 0, 0);
  octx.globalCompositeOperation = "destination-in";
  octx.drawImage(alpha, 0, 0);
  return out;
}

export function canvasDataUrl(cv, type = "image/png") {
  return cv.toDataURL(type);
}

// Unpack a server mask_tiny ({w, h, b64}) back to a 0/1 raster.
export function tinyToRaster(tiny) {
  const raw = atob(tiny.b64);
  const out = new Uint8Array(tiny.w * tiny.h);
  for (let i = 0; i < out.length; i += 1) {
    out[i] = (raw.charCodeAt(i >> 3) >> (7 - (i & 7))) & 1;
  }
  return out;
}
