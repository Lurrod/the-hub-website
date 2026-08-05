import { setPlayerPhoto } from "@/lib/data/players";
import { readUploadedImage, processAndStoreImage } from "@/lib/images";

/** Traite un éventuel upload photo depuis un FormData et l'enregistre pour le joueur. */
export async function storePlayerPhotoFromForm(formData: FormData, playerId: string): Promise<void> {
  const buffer = await readUploadedImage(formData.get("photo"));
  if (!buffer) return;
  const key = await processAndStoreImage(buffer, "players", playerId);
  await setPlayerPhoto(playerId, key);
}
