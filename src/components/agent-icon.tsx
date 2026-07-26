import { agentIconUrl } from "@/lib/agents";

/** Icône d'agent Valorant (image valorant-api.com), avec repli si inconnu. */
export default function AgentIcon({
  agent,
  className = "",
}: {
  agent: string | null | undefined;
  className?: string;
}) {
  const url = agentIconUrl(agent);
  if (!url) {
    return (
      <span
        className={`inline-grid h-6 w-6 shrink-0 place-items-center rounded bg-[var(--surface)] text-[8px] text-[var(--text-muted)] ${className}`}
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
      className={`inline-block h-6 w-6 shrink-0 rounded object-cover ${className}`}
      loading="lazy"
    />
  );
}
