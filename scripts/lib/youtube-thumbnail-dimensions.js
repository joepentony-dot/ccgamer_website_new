"use strict";

function youtubeThumbnailCardUrl(url) {
  const value = String(url || "").trim();
  const match = value.match(/^(https:\/\/(?:i|img)\.ytimg\.com\/vi\/[A-Za-z0-9_-]+\/)(?:maxresdefault|sddefault|hqdefault|mqdefault|default)\.jpg([?#].*)?$/i);
  if (!match) return value;
  return `${match[1]}mqdefault.jpg${match[2] || ""}`;
}

function youtubeThumbnailIntrinsicAttributes(url) {
  const value = String(url || "").trim();
  const match = value.match(/^https:\/\/(?:i|img)\.ytimg\.com\/vi\/[A-Za-z0-9_-]+\/(maxresdefault|sddefault|hqdefault|mqdefault|default)\.jpg(?:[?#].*)?$/i);
  if (!match) return "";

  const dimensions = {
    maxresdefault: [1280, 720],
    sddefault: [640, 480],
    hqdefault: [480, 360],
    mqdefault: [320, 180],
    default: [120, 90]
  };
  const [width, height] = dimensions[match[1].toLowerCase()];
  return ` width="${width}" height="${height}"`;
}

module.exports = { youtubeThumbnailCardUrl, youtubeThumbnailIntrinsicAttributes };
