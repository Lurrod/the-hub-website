import { setPlayerPhoto } from "@/lib/data/players";
import { validateImageUpload, processAndStoreImage } from "@/lib/images";

/** Traite un éventuel upload photo depuis un FormData et l'enregistre pour le joueur. */
export async function storePlayerPhotoFromForm(formData: FormData, playerId: string): Promise<void> {
  const file = formData.get("photo");
  if (!(file instanceof File) || file.size === 0) return;
  const check = validateImageUpload({ type: file.type, size: file.size });
  if (!check.ok) throw new Error(check.error);
  const buffer = Buffer.from(await file.arrayBuffer());
  const key = await processAndStoreImage(buffer, "players", playerId);
  await setPlayerPhoto(playerId, key);
}
