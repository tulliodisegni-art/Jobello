# Jobello

Mes candidatures, mes relances, mes entretiens et mon planning, dans une vraie appli.

Installer : ouvrir https://tulliodisegni-art.github.io/Jobello/ dans Safari, puis Partager → « Sur l'écran d'accueil ».

- Claude (dossiers, lettres, relances, lecture des mails) marche avec une clé Anthropic enregistrée sur l'appareil (⚙︎ Réglages).
- Les données sont rangées dans Supabase (`config.js`, tables créées par `supabase.sql`) et synchronisées entre appareils ; sans configuration elles restent sur l'appareil.
- `index.html` est assemblé par `python3 build.py carnet.html` à partir de la page de l'appli.
- Notifications (rappels, entretiens, nouvelles offres) et « Ajouter au calendrier » : voir [NOTIFICATIONS.md](NOTIFICATIONS.md).
- Fiche d'accueil (`accueil.js`) : à la première ouverture d'un compte vide, une fiche guidée (métier, postes visés, compétences, logiciels, secteurs, lieu et trajet, contrat, salaire…) avec « Ajouter mon CV actuel » (PDF lu dans le navigateur par pdf.js). Rangée dans `profil/main` et `profil/main.fiche` ; « Ma fiche » la rouvre dans CV & lettres.
- Atouts (`atouts.js`) : « Mes chances » honnêtes par offre (profil, fraîcheur, accès à l'entreprise, tes propres chiffres), « Qui contacter » (recruteur, futur responsable, collègue, invitations LinkedIn prêtes de 200 caractères, rien n'est envoyé seul) et « Mon bilan de la semaine » sur l'accueil.
- Page publique `decouvrir.html` (sans code d'invitation) : présentation, démo animée du copilote, tarifs Gratuit / Coach 14,90 € / Coach+ 34,90 €, FAQ et liste d'attente (fonction Supabase `jobello_attente_inscrire`, table `jobello_attente` sans lecture publique). L'écran d'invitation y renvoie (`GATE_CFG.about`).
