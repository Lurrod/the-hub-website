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
        // Écoute en local uniquement : nginx est le seul exposé sur Internet.
        HOSTNAME: "127.0.0.1",
      },
      max_memory_restart: "400M",
      autorestart: true,
      // Journaux hors du dossier de release, sinon ils disparaissent au ménage.
      out_file: "../../shared/logs/out.log",
      error_file: "../../shared/logs/error.log",
      merge_logs: true,
      time: true,
    },
  ],
};
