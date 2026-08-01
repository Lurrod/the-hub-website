import { promises as fs } from "node:fs";
import { imageEtag, resolveUploadPath } from "@/lib/images";

// Une journée en cache navigateur, puis revalidation conditionnelle : passé ce
// délai le client renvoie son ETag et reçoit un 304 vide tant que l'image n'a
// pas bougé, au lieu de retélécharger le fichier entier.
const CACHE_CONTROL = "public, max-age=86400, stale-while-revalidate=604800";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ key: string[] }> }
) {
  const { key } = await params;
  let filePath: string;
  try {
    filePath = resolveUploadPath(key);
  } catch {
    return new Response("Not found", { status: 404 });
  }

  let etag: string;
  try {
    // `stat` avant `readFile` : sur un 304 on ne lit jamais le fichier.
    const stat = await fs.stat(filePath);
    if (!stat.isFile()) return new Response("Not found", { status: 404 });
    etag = imageEtag(stat);
  } catch {
    return new Response("Not found", { status: 404 });
  }

  if (req.headers.get("if-none-match") === etag) {
    return new Response(null, {
      status: 304,
      headers: { ETag: etag, "Cache-Control": CACHE_CONTROL },
    });
  }

  try {
    const data = await fs.readFile(filePath);
    return new Response(new Uint8Array(data), {
      headers: {
        "Content-Type": "image/webp",
        "Cache-Control": CACHE_CONTROL,
        ETag: etag,
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
