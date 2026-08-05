import { agentIconUrl } from "@/lib/agents";

/** Icône d'agent Valorant (image valorant-api.com), avec repli si inconnu. */
export default function AgentIcon({
  agent,
  className = "",
  size = "h-6 w-6",
}: {
  agent: string | null | undefined;
  className?: string;
  /** Taille de la vignette. Remplace la valeur par défaut plutôt que de s'y
      ajouter : deux utilitaires de taille en conflit ne donnent pas un
      vainqueur fiable. */
  size?: string;
}) {
  const url = agentIconUrl(agent);
  if (!url) {
    return (
      <span
        className={`inline-grid ${size} shrink-0 place-items-center rounded bg-[var(--surface)] text-[8px] text-[var(--text-muted)] ${className}`}
        title={agent ?? ""}
      >
        {agent ? agent.slice(0, 2).toUpperCase() : "?"}
      </span>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt={agent ?? ""}
      title={agent ?? ""}
      width={24}
      height={24}
      className={`inline-block ${size} shrink-0 rounded object-cover ${className}`}
      loading="lazy"
    />
  );
}
