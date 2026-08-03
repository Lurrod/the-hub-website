# Polices des images de partage

Satori, le moteur qui rend `opengraph-image.tsx`, ne voit pas les polices
`next/font/google` chargées par l'application : il lui faut des fichiers.
Il n'accepte que `ttf`, `otf` et `woff` — ni `woff2`, ni `eot`.

Ces deux fichiers sont les sous-ensembles latins servis par Google Fonts.
Pour les régénérer :

    UA="Mozilla/5.0 (Linux; U; Android 2.2; en-us; DROID2 Build/VZW) AppleWebKit/533.1 (KHTML, like Gecko) Version/4.0 Mobile Safari/533.1"
    curl -sL -A "$UA" "https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@800&family=Geist+Mono:wght@500"

puis télécharger les deux URLs `.ttf` de la réponse.

L'agent utilisateur n'est pas décoratif : il décide du format servi. Un agent
moderne renvoie du `woff2`, un agent IE 6 renvoie de l'`eot`. Vérifier après
téléchargement que les fichiers commencent bien par `00 01 00 00`.
