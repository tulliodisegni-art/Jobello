# Jobello

Mes candidatures, mes relances, mes entretiens et mon planning, dans une vraie appli.

Installer : ouvrir https://tulliodisegni-art.github.io/Jobello/ dans Safari, puis Partager → « Sur l'écran d'accueil ».

- Claude (dossiers, lettres, relances, lecture des mails) marche avec une clé Anthropic enregistrée sur l'appareil (⚙︎ Réglages).
- Les données sont rangées dans Supabase (`config.js`, tables créées par `supabase.sql`) et synchronisées entre appareils ; sans configuration elles restent sur l'appareil.
- `index.html` est assemblé par `python3 build.py carnet.html` à partir de la page de l'appli.
