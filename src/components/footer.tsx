import Link from "next/link";

export default function Footer() {
  return (
    <footer className="mt-16 border-t border-[var(--border-strong)] bg-[var(--surface)]">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-5 text-sm text-[var(--text-muted)] sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="The Hub" className="h-6 w-auto object-contain" />
          <span>— T3 Valorant</span>
        </div>
        <div className="flex gap-4">
          <Link href="/tournois" className="hover:text-white">Tournois</Link>
          <Link href="/matchs" className="hover:text-white">Matchs</Link>
          <Link href="/equipes" className="hover:text-white">Équipes</Link>
        </div>
        <p className="text-xs">Projet non affilié à Riot Games.</p>
      </div>
    </footer>
  );
}
