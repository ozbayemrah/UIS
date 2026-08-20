// Loads the equirectangular texture and exposes a brightness(u, v) lookup
// by sampling it into an offscreen canvas. Land reads as near-black in the
// source texture, ocean as lighter gray, so downstream code thresholds on
// low brightness to decide "this is land". Ported from worldinformationcenter.
let cached = null;

// Memoized so re-entering the Earth scene (leave, come back) doesn't refetch
// and redecode the same ~93KB image every time - createEarth() is called
// fresh on each entry, but the mask itself never changes.
export async function loadLandMask(url) {
  if (!cached) cached = fetchLandMask(url);
  return cached;
}

async function fetchLandMask(url) {
  const img = await loadImage(url);

  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;

  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(img, 0, 0);

  const { data, width, height } = ctx.getImageData(0, 0, img.width, img.height);

  function brightnessAt(u, v) {
    const x = Math.min(width - 1, Math.max(0, Math.floor(u * width)));
    const y = Math.min(height - 1, Math.max(0, Math.floor(v * height)));
    const i = (y * width + x) * 4;
    // simple luma
    return (data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114) / 255;
  }

  return { brightnessAt, width, height };
}

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}
