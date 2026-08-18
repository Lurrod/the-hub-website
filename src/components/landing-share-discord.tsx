import { Tag } from "@/components/landing-panel-chrome";

/**
 * Maquette « Partage » : une conversation Discord rejouée, hors du cadre
 * `.lf-panel` des autres maquettes — la démonstration est le client où la
 * carte est réellement vue, pas une vitrine du site. Les gris viennent de
 * Discord (famille `.lf-dc-*`, components.css) ; seule la carte dépliée garde
 * les jetons de la charte, puisqu'elle rejoue l'image produite par le site.
 *
 * La scène est scriptée, pas lue en base : une question, le lien qui y
 * répond. Un match arbitraire sorti de la base ne répondrait pas à la
 * question posée — et c'est la question qui fait la démonstration.
 *
 * Le match, lui, est réel : la finale des Playoff Premier Invite V26A4 telle
 * que sa fiche la donne (`/matchs/<id>`), libellés au format de
 * `lib/og/labels`.
 */
const SCENE = {
  id: "cmsutba5a005qhixwr3li5j1q",
  badge: "MATCH · TERMINÉ",
  teamA: { tag: "LYO", name: "Lyost", logo: "/landing/lyost.webp" },
  teamB: { tag: "PuR", name: "PuR Esport", logo: "/landing/pur.webp" },
  center: "2 – 0",
  meta: "Playoff Premier Invite V26A4 · Finale · Bo3",
  maps: ["Lotus 13-11", "Ascent 13-7"],
} as const;

/** Un camp du duel : logo au-dessus, nom en dessous, sur une colonne égale. */
function Side({ tag, name, logo }: { tag: string; name: string; logo: string }) {
  return (
    <div className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
      <Tag tag={tag} logo={logo} size="h-10 w-10" />
      <span className="lf-t11 w-full truncate text-center font-semibold text-white">{name}</span>
    </div>
  );
}

/**
 * Un message : avatar, nom, horodatage, puis le contenu passé en enfant.
 * L'avatar est la vraie photo de profil quand la personne en a une sur sa
 * fiche (`avatarImg`, copiée dans `public/landing/`) ; sinon le monogramme,
 * exactement comme sur le site.
 */
function Message({
  avatar,
  avatarImg,
  tone,
  author,
  time,
  children,
}: {
  avatar: string;
  avatarImg?: string;
  tone: "a" | "b";
  author: string;
  time: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-w-0 gap-3">
      {avatarImg ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={avatarImg}
          alt=""
          loading="lazy"
          decoding="async"
          className="h-9 w-9 shrink-0 rounded-full object-cover"
        />
      ) : (
        <span
          className={`lf-t10 grid h-9 w-9 shrink-0 place-items-center rounded-full font-semibold ${
            tone === "a" ? "lf-dc-av-a" : "lf-dc-av-b"
          }`}
        >
          {avatar}
        </span>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className="lf-t13 lf-dc-text font-semibold">{author}</span>
          <span className="lf-t10 lf-dc-muted">{time}</span>
        </div>
        {children}
      </div>
    </div>
  );
}

export function ShareDiscord() {
  const m = SCENE;

  return (
    <div className="lf-dc min-w-0 overflow-hidden">
      {/* Barre de canal. */}
      <div className="lf-dc-header flex items-center gap-2 px-4 py-2.5">
        <span className="lf-dc-hash lf-t18 font-semibold">#</span>
        <span className="lf-t13 lf-dc-text shrink-0 font-semibold">général</span>
        <span className="lf-dc-sep h-4 w-px shrink-0" aria-hidden="true" />
        <span className="lf-t10 lf-dc-muted truncate">le Tier 3 français, soir de finale</span>
      </div>

      <div className="flex min-w-0 flex-col gap-4 px-4 py-4">
        {/* La question, à laquelle le lien va répondre. */}
        <Message avatar="SN" tone="a" author="SneaX" time="aujourd’hui à 21:04">
          <p className="lf-t13 lf-dc-text mt-0.5">
            <span className="lf-dc-mention">@Lurrod</span> tu sais qui a gagné les Premier Invite ?
          </p>
        </Message>

        {/* La réponse : rien que le lien, la carte parle pour lui. */}
        <Message
          avatar="LU"
          avatarImg="/landing/lurrod.webp"
          tone="b"
          author="Lurrod"
          time="aujourd’hui à 21:05"
        >
          <p className="lf-t13 lf-dc-link mt-0.5 truncate">the-hub-vrc.fr/matchs/{m.id}</p>

          {/* L'embed déplié : liseré à la couleur du site, et dedans la carte
              telle que l'image de partage la compose (couleurs de la charte,
              proportion 1200×630 tenue à partir de `sm`). */}
          <div className="lf-dc-embed mt-1.5 max-w-[440px] p-3">
            <div className="overflow-hidden rounded-[4px] border border-[var(--border)] bg-[var(--bg)]">
              <div className="flex min-w-0 flex-col justify-between gap-3 p-3.5 sm:aspect-[1200/630]">
                <div className="flex items-center justify-between gap-2 border-b border-[var(--border)] pb-2.5">
                  <div className="flex min-w-0 items-center gap-2">
                    {/* Rendu à 20 px : le webp de 3,7 Ko suffit, comme dans la
                        barre de navigation. Le PNG source reste côté serveur
                        pour les vraies images de partage (src/lib/og/frame.tsx). */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src="/logo.webp"
                      width={130}
                      height={128}
                      alt=""
                      loading="lazy"
                      decoding="async"
                      className="h-5 w-5 shrink-0 rounded-[4px] object-cover"
                    />
                    <span className="stat lf-t10 truncate tracking-[0.16em] text-white">
                      THE HUB
                    </span>
                  </div>
                  <span className="stat lf-t10 shrink-0 truncate tracking-[0.22em] text-[var(--accent)]">
                    {m.badge}
                  </span>
                </div>

                <div className="flex min-w-0 flex-col items-center gap-2.5">
                  <div className="flex w-full min-w-0 items-center justify-between gap-2">
                    <Side tag={m.teamA.tag} name={m.teamA.name} logo={m.teamA.logo} />
                    <span className="lf-og-title lf-hov-pop shrink-0 text-[var(--accent)]">
                      {m.center}
                    </span>
                    <Side tag={m.teamB.tag} name={m.teamB.name} logo={m.teamB.logo} />
                  </div>
                  <span className="stat lf-t10 max-w-full truncate text-[var(--text-muted)]">
                    {m.meta}
                  </span>
                  <div className="flex max-w-full flex-wrap justify-center gap-1.5">
                    {m.maps.map((map, i) => (
                      <span
                        key={map}
                        className="stat lf-t10 lf-hov-row truncate rounded-[6px] border border-[var(--border)] bg-[var(--category)] px-2 py-1 text-[var(--accent)]"
                        style={{ animationDelay: `${i * 70}ms` }}
                      >
                        {map}
                      </span>
                    ))}
                  </div>
                </div>

                <span className="stat lf-t10 text-[var(--accent)]">the-hub-vrc.fr</span>
              </div>
            </div>
          </div>

          {/* Une réaction : la conversation a des lecteurs. */}
          <div className="mt-1.5 flex">
            <span className="lf-dc-reaction lf-t11 inline-flex items-center gap-1.5 px-2 py-0.5">
              🔥 <span className="font-semibold">3</span>
            </span>
          </div>
        </Message>
      </div>

      {/* Barre de saisie, inactive : le décor s'arrête où commence le vrai
          client. */}
      <div className="px-4 pb-4">
        <div className="lf-dc-input flex items-center gap-3 px-3.5 py-2.5">
          <span className="lf-dc-plus lf-t13 grid h-5 w-5 shrink-0 place-items-center rounded-full">
            +
          </span>
          <span className="lf-t11 truncate">Envoyer un message dans #général</span>
        </div>
      </div>
    </div>
  );
}
