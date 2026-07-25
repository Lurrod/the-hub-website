import { promises as fs } from "node:fs";
import { resolveUploadPath } from "@/lib/images";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ key: string[] }> }
) {
  const { key } = await params;
  let filePath: string;
  try {
    filePath = resolveUploadPath(key);
  } catch {
    return new Response("Not found", { status: 404 });
  }
  try {
    const data = await fs.readFile(filePath);
    return new Response(new Uint8Array(data), {
      headers: {
        "Content-Type": "image/webp",
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
