// Configuration pm2, livrée dans chaque release et lue depuis le dossier de la
// release active. `cwd: __dirname` fait donc pointer le process sur la nouvelle
// version à chaque déploiement, sans avoir à toucher la configuration.
module.exports = {
  apps: [
    {
      name: "the-hub",
      script: "server.js", // serveur autonome produit par `output: "standalone"`
      cwd: __dirname,
      instances: 1,
      exec_mode: "fork",
      // Les secrets viennent de shared/.env, chargé par le script de déploiement
      // avant l'appel pm2 (voir --update-env). On ne fixe ici que le transport.
      env: {
        NODE_ENV: "production",
        PORT: 3200,
        // Les dates saisies et affichées sont ancrées sur Paris par le code
        // (voir src/lib/timezone.ts), qui ne dépend donc pas de ce réglage.
        // On le pose quand même pour que les horodatages des journaux et tout
        // appel à `Date` non passé par ces aides parlent la même langue que
        // l'audience du site.
        TZ: "Europe/Paris",
        // Écoute en local uniquement : Apache est le seul exposé sur Internet.
        HOSTNAME: "127.0.0.1",
        // glibc ouvre une arena par thread qui alloue (8 threads tokio du moteur
        // Prisma, libvips) et ne rend presque rien au système : sans ce plafond,
        // la RSS après GC montait à 365 Mo pour 120 pages, contre 248 Mo avec.
        MALLOC_ARENA_MAX: "2",
      },
      // Budget explicite pour V8. Par défaut, Node dimensionne le heap sur la RAM
      // de la machine (~4 Go sur le serveur de 32 Go) : chaque page laissant ~2 Mo
      // de déchets, le ramassage arrivait après le seuil pm2, qui tuait le
      // process toutes les 1 à 10 h (SIGKILL). Le heap vivant tourne autour de
      // 50 Mo. Mesuré en prod le 2026-09-26 : pic à 288 Mo sur 360 pages, contre
      // un kill à 400 Mo avant.
      node_args: ["--max-old-space-size=256"],
      // Filet de sécurité seulement : au-dessus du heap V8 + mémoire hors heap
      // (moteur Prisma, libvips, code), il ne doit plus se déclencher en régime normal.
      max_memory_restart: "600M",
      autorestart: true,
      // Journaux hors du dossier de release, sinon ils disparaissent au ménage.
      out_file: "../../shared/logs/out.log",
      error_file: "../../shared/logs/error.log",
      merge_logs: true,
      time: true,
    },
  ],
};
