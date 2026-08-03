import { readFile } from "node:fs/promises";
import path from "node:path";
import { DISPLAY, MONO } from "@/lib/og/theme";

type OgFont = {
  name: string;
  data: ArrayBuffer;
  weight: 500 | 800;
  style: "normal";
};

/** Buffer Node → ArrayBuffer exact, sans embarquer le reste du pool alloué. */
function toArrayBuffer(buf: Buffer): ArrayBuffer {
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
}

async function load(): Promise<OgFont[]> {
  const dir = path.join(process.cwd(), "assets", "fonts");
  const [display, mono] = await Promise.all([
    readFile(path.join(dir, "BricolageGrotesque-ExtraBold.ttf")),
    readFile(path.join(dir, "GeistMono-Medium.ttf")),
  ]);
  return [
    { name: DISPLAY, data: toArrayBuffer(display), weight: 800, style: "normal" },
    { name: MONO, data: toArrayBuffer(mono), weight: 500, style: "normal" },
  ];
}

let cache: Promise<OgFont[]> | null = null;

/**
 * Polices passées à `ImageResponse`. Mémoïsé au niveau du module : le disque
 * n'est lu qu'une fois par processus, pas à chaque image générée.
 */
export function ogFonts(): Promise<OgFont[]> {
  cache ??= load();
  return cache;
}
