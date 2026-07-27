const FEATURES = [
  { title: "Joueur", desc: "Crée ton profil, suis tes stats et ta carrière." },
  { title: "Équipe", desc: "Référence ton équipe, gère ton roster et tes résultats." },
  { title: "Compétition", desc: "Inscris-toi aux tournois — brackets et scoreboards." },
];

/** Bloc statique « Ta place dans le Hub » de la landing. */
export default function LandingFeatures() {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {FEATURES.map((f) => (
        <div key={f.title} className="card p-5">
          <div className="text-base font-semibold text-[var(--accent)]">{f.title}</div>
          <p className="mt-1.5 text-sm text-[var(--text-muted)]">{f.desc}</p>
        </div>
      ))}
    </div>
  );
}
