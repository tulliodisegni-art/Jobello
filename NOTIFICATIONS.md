# Notifications de Jobello

Jobello prévient au bon moment, même quand l'appli est fermée :

| Notification | Quand |
|---|---|
| Candidatures à envoyer | le matin, quand un dossier est prêt mais pas envoyé (ou une réponse à un mail en attente) |
| Dossiers à finir | le matin, quand une candidature n'a ni CV ni lettre |
| Relances | le matin du jour de la relance (par toi ou via un contact) |
| Rappels d'entretien | la veille à 19 h, le matin même (antisèche à relire), puis 1 h avant ; ils ouvrent l'antisèche |
| Après l'entretien | 1 h après la fin d'un entretien (téléphone, visio, sur place) : comment ça s'est passé ? |
| Remerciement | le lendemain matin si le mail de remerciement n'est pas parti |
| Nouveaux postes | dès que de nouvelles offres sont repérées (jamais entre 22 h et 8 h) |
| Bilan du lundi | le lundi matin : la semaine passée (envoyées, réponses, entretiens) et celle qui commence |
| Mails des recruteurs | quand Claude lit un mail important (entretien, refus, demande, offre), à midi |
| Messages LinkedIn | le matin, quand des messages au réseau sont prévus (coupé au départ) |

Chaque appareil choisit ce qu'il reçoit : cloche 🔔 de l'accueil, ou ⚙︎ Réglages › Notifications.
Dans une candidature, l'encadré de l'entretien a un bouton « 📅 Ajouter au calendrier ».
L'icône de Jobello affiche une pastille avec le nombre de choses urgentes (iPhone : notifications activées).

Sur iPhone : Jobello doit être installée sur l'écran d'accueil (Safari › Partager › « Sur l'écran d'accueil »), iOS 16.4 ou plus.

## Mise en route côté serveur (une seule fois, depuis un ordinateur, 5 minutes, 0 €)

Tout se passe sur https://supabase.com/dashboard, dans le projet de Jobello.

**1. Créer la fonction « notifications »**
1. Menu de gauche : **Edge Functions**, puis **Deploy a new function** › **Via Editor**.
2. Nom de la fonction : `notifications` (exactement).
3. Effacer le code d'exemple et coller tout le fichier [`supabase/functions/notifications/index.ts`](supabase/functions/notifications/index.ts) (bouton « Raw » sur GitHub, puis tout sélectionner et copier).
4. **Deploy function**.
5. Dans la fonction, onglet **Details** : désactiver **Verify JWT with legacy secret** (ou « Enforce JWT verification »), puis **Save**.
   La fonction est protégée autrement : elle n'envoie rien sans le code secret rangé dans la base.

**2. Brancher la base**
1. Menu de gauche : **SQL Editor** › **New query**.
2. Coller tout le fichier [`supabase/notifications.sql`](supabase/notifications.sql) et cliquer **Run**.

C'est tout. Dans Jobello : cloche 🔔 › **Activer les notifications** › **M'envoyer un essai** : la notification arrive dans la minute.

## Comment ça marche

- L'appli calcule les rappels des deux prochaines semaines et les range dans la table `push_queue` (à chaque changement).
- Chaque minute, Supabase (pg_cron) regarde s'il y a une notification à envoyer ; si oui, il réveille la fonction `notifications`, qui l'envoie aux appareils qui l'ont choisie.
- Les nouvelles offres (`alertes/jour`, `alertes/sites`) créent une notification directement dans la base.
- Les clés d'envoi sont créées par la fonction elle-même et restent dans la base : aucune clé secrète dans ce dépôt.
- Pour une autre appli (Mijonote, Repz…) : même fonction et mêmes tables, avec un autre nom d'appli (`app`).
