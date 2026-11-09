# AOS Multi-Service International — version React.js

Migration complète du projet PHP vers **React 18 (Vite)** + **API Node.js/Express** + **SQLite**
(base de données **SQLite intégrée au projet**, comme Django : aucun serveur de base à installer ni à louer). Toutes les fonctionnalités existantes sont conservées.

## Architecture
```
client/    React + Vite (site client + espace admin/vendeur, routes protégées)
server/    API Express (JWT en cookie httpOnly, mysql2, multer, nodemailer, pdfkit)
database/  schema.sql (idempotent)
uploads/   images produits
docs/API.md  contrat complet de l'API
```
Deux sessions indépendantes (comme en PHP) : client (`aos_user`) et admin/vendeur (`aos_admin`, rôles `super_admin` / `vendeur`).

## Fonctionnalités reprises
- **Site client** : accueil, catalogue (recherche/filtres/catégories), fiche produit, panier (un seul vendeur par commande, garder/restaurer un vendeur), commande avec Mobile Money (Orange / Moov / Coris), reçu PDF, e-mail de confirmation, mon compte, détail commande + suivi + livreur, messagerie avec les vendeurs, contacter un vendeur, page livraison, inscription client / vendeur.
- **Admin / vendeur** : dashboard, produits (CRUD + upload image + promos), commandes (statuts, assignation livreur, reçu PDF, suppression), utilisateurs (bloquer/débloquer/supprimer), vendeurs (CRUD, commission, numéros de paiement), livreurs, messagerie (réponses rapides, fermer/rouvrir), notifications (+ rafraîchissement automatique), commissions, profil/statistiques, numéros de paiement.

## Installation locale
```bash
npm run install:all
cp .env.example .env        # facultatif : SUPER_ADMIN_EMAIL / SUPER_ADMIN_PASSWORD, SMTP_*
npm run dev                 # API :4000 + front :5173
```
La base (`data/aos.db`) et le super admin sont **créés automatiquement au premier démarrage**.
Production locale : `npm run build && npm start`.

## Déploiement sur Render (base incluse)
1. Poussez le projet sur GitHub, puis sur Render : **New → Blueprint** et choisissez le dépôt (`render.yaml` est détecté).
2. Renseignez `SUPER_ADMIN_EMAIL` et `SUPER_ADMIN_PASSWORD` (votre accès administrateur).
3. C'est tout : au premier démarrage la base est créée dans le disque persistant `/var/data` (avec les images produits).

**Important :** SQLite est un fichier. Sur Render il doit se trouver sur un **disque persistant** (plan payant, ~7 $/mois) ;
sans disque, le plan gratuit efface les données à chaque redéploiement/redémarrage. Gardez une seule instance.
Sauvegarde : téléchargez `/var/data/aos.db` (et `uploads/`) depuis le shell Render.

## Importer des données de l'ancienne base MySQL
La base est neuve : produits, clients et commandes de la version PHP ne sont pas repris automatiquement.
Si vous voulez les conserver, exportez-les en CSV depuis phpMyAdmin et dites-moi : je prépare un script d'import.

## Changements de comportement à connaître
- Frais de livraison unifiés (le PHP avait des règles contradictoires) : **0 si total < 4 000 FCFA, sinon 1 000 FCFA** (`server/src/lib/helpers.js`).
- Un utilisateur bloqué ou un vendeur inactif ne peut plus se connecter.
- Plus de MySQL : la base est un fichier SQLite ; les identifiants SMTP passent par `.env`.
- `admin-upload-image.php` est intégré à la création/modification de produit.

## Sécurité
Les identifiants BD et SMTP présents dans les fichiers PHP d'origine (`includes/config.php`, `email.php`) n'ont **pas** été repris. **Changez ces mots de passe** (base et compte e-mail), puisqu'ils ont été partagés.
# boutique-aos
