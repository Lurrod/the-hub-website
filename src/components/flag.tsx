import { countryCode } from "@/lib/countries";
import Tooltip from "@/components/tooltip";

/**
 * Affiche le drapeau d'un pays (image flagcdn.com). Rien si le pays est inconnu.
 * On utilise une image plutôt qu'un emoji : Windows ne rend pas les emojis drapeaux.
 */
export default function Flag({
  country,
  className = "h-3.5",
  title = true,
}: {
  country?: string | null;
  className?: string;
  title?: boolean;
}) {
  const code = countryCode(country);
  if (!code) return null;
  const img = (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`https://flagcdn.com/w40/${code}.png`}
      srcSet={`https://flagcdn.com/w80/${code}.png 2x`}
      width={24}
      height={18}
      alt={country ?? ""}
      className={`inline-block shrink-0 rounded object-cover align-middle ${className}`}
      loading="lazy"
    />
  );
  // Infobulle maison plutôt que `title=` natif : apparition immédiate,
  // stylée, et visible au focus clavier.
  if (!title || !country) return img;
  return <Tooltip label={country}>{img}</Tooltip>;
}
