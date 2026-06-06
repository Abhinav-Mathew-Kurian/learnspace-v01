// Stub for @napi-rs/canvas — satisfies pdfjs-dist's optional canvas import
// so the "Cannot load @napi-rs/canvas" warning never appears.
// We only use pdf-parse for getText() which never needs canvas rendering.
export class Canvas {}
export class Image {}
export class DOMMatrix {}
export class ImageData {}
export class Path2D {}
export function createCanvas() { return { getContext: () => ({}) }; }
