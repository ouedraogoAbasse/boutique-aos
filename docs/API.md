# Contrat d'API — AOS Multi-Service (React ⇄ Express)

Source de vérité fonctionnelle : le code PHP d'origine, copié dans `_php_reference/` (lecture seule).
Chaque route ci-dessous remplace une page/une action PHP. **Si une page PHP affiche une donnée absente d'ici, la route
doit la renvoyer (mêmes noms de champs que les colonnes/alias SQL du PHP) et être ajoutée à la section « Ajouts » en bas.**

## Conventions
- Base : `/api`. JSON partout, sauf upload produit (multipart) et reçus (PDF).
- Noms de champs = **snake_case, identiques aux colonnes/alias SQL du PHP** (`nom`, `prix_final`, `vendeur_boutique`, `date_commande`…).
- Montants = `number`. Dates = chaînes MySQL `YYYY-MM-DD HH:MM:SS`. Booléens MySQL (`promo`, `actif`, `lu`) = `0/1`.
- Erreur : HTTP 4xx/5xx + `{ "error": "message FR", "code"?: "AUTH_REQUIRED"|"BLOCKED"|"FORBIDDEN" }`.
- Succès d'une mutation : `{ "success": true, "message": "message FR" , ...données utiles }`.
- Deux sessions indépendantes (comme `$_SESSION['user_id']` / `$_SESSION['admin_id']`) via cookies httpOnly :
  `aos_user` (client) et `aos_admin` (admin/vendeur). Le front utilise `fetch(..., {credentials:'include'})`.
- Images produit : champ `image` = nom de fichier → URL `/uploads/<image>` (si contient `/` : URL telle quelle, legacy).
  Le serveur ajoute `image_url` dans toute ligne produit.
- Pas de VUES SQL : stats calculées par requêtes (équivalents de `stats_par_admin`, `commandes_details_admin`, `conversations_vendeurs`).

## Règles métier à conserver (extraites du PHP)
- Prix final = `promo ? prix*(1-pourcentage_promo/100) : prix`.
- Panier : ajout +1 si stock dispo (« Stock insuffisant pour ce produit. » / « Ce produit n'est pas disponible. »), diminuer jamais < 1.
- **Un panier = un seul vendeur pour commander.** `garder_vendeur` sauvegarde les produits des autres vendeurs dans
  `panier_sauvegarde` puis les retire du panier ; `restaurer_vendeur` vide le panier et restaure ce vendeur.
- Frais de livraison (commander.php, source de vérité) : `sousTotal < 4000 ? 0 : 1000`. `total_final = total + frais`.
  (Le PHP avait 3 règles contradictoires ; on garde celle de `commander.php` car c'est celle qui est enregistrée.)
- Commande : champs adresse/ville/code_postal/pays obligatoires, `mode_paiement` ∈ orange_money|moov_money|coris_money,
  `numero_paiement` = 8 chiffres. Transaction : INSERT commandes (`total` = total_final, `statut_paiement`='en_attente'),
  `details_commande`, vérif stock `FOR UPDATE` (« Stock insuffisant pour <nom> »), décrément stock, vide `panier`,
  supprime `panier_sauvegarde` de CE vendeur, crée les lignes `commandes_admins` (si aucune n'existe pour la commande :
  1 ligne par détail, `total`=qté×prix_unitaire, `commission_admin`=total×admins.commission/100), notifications admin
  (nouvelle commande ; stock faible < 5), puis e-mail de confirmation (échec e-mail ⇒ log, commande tout de même OK).
- Statuts commande : `en_attente, en_preparation, confirmee, expediee, livree, annulee`.
  Super admin : met à jour `commandes.statut` ET `commandes_admins.statut` ; vendeur : seulement ses `commandes_admins`.
- Vendeur ne voit que ses produits / commandes (via `commandes_admins`) ; super admin voit tout.
- Numéros mobile money : 8 chiffres, au moins un des 3 obligatoire (inscription vendeur, admin vendeurs, mes-numéros).
- Un compte client `statut='bloqué'` ne peut plus se connecter ; un vendeur `actif=0` non plus (amélioration vs PHP).

## AUTH client
| Méthode | Route | Corps | Réponse |
|---|---|---|---|
| POST | `/auth/register` | nom, prenom, email, mot_de_passe, confirmer_mdp, telephone, adresse, ville, code_postal | `{success,message}` (validations = inscription.php) |
| POST | `/auth/login` | email, mot_de_passe | `{success, user}` + cookie `aos_user` |
| POST | `/auth/logout` | – | `{success}` |
| GET | `/auth/me` | – | `{ user: {...}|null, cart_count, messages_non_lus }` (jamais d'erreur 401 ici) |
| POST | `/auth/vendeur/register` | nom,email,boutique,telephone,password,confirm_password,numero_orange_money,numero_moov_money,numero_coris_money | `{success,message}` (inscription_vendeur.php) |

## Catalogue (public)
| GET | `/home` | – | `{ produits:[8 derniers en stock + categorie_nom + prix_final + image_url], categories:[] }` |
| GET | `/categories` | – | `[{id,nom,type}]` |
| GET | `/produits` | query: type, categorie, marque, promo, nouveau, recherche | `{ produits:[…categorie_nom, categorie_type, prix_final, image_url], categories:[], marques:[string] }` |
| GET | `/produits/:id` | – | `{ produit:{…, vendeur_nom, vendeur_email, vendeur_tel, vendeur_boutique, prix_final, image_url}, similaires:[…si la page PHP en affiche] }` — 404 si inconnu |
| GET | `/livreurs` | – | `[{nom, zone_livraison, vehicule}]` (actifs uniquement) |

## Panier (client connecté)
| GET | `/panier` | – | `{ articles:[…produit, quantite, panier_id, admin_id, vendeur_nom, boutique, prix_final, image_url], groupes:[{vendeur:{id,nom,boutique}, produits:[], total}], plusieurs_vendeurs, total, frais_livraison, total_final }` |
| POST | `/panier/ajouter` | produit_id | `{success,message}` ou 4xx `{error}` |
| POST | `/panier/quantite` | produit_id, action:`augmenter`\|`diminuer` | `{success}` |
| DELETE | `/panier/:produit_id` | – | `{success,message:"Produit retiré du panier"}` |
| POST | `/panier/garder-vendeur` | admin_id | `{success,message}` |
| DELETE | `/panier/vendeur/:admin_id` | – | `{success,message}` |
| POST | `/panier/restaurer-vendeur` | admin_id | `{success,message}` |

## Commande & compte (client connecté)
| GET | `/commander/prepare` | – | `{ panier_vide, plusieurs_vendeurs, groupes:[{vendeur:{id,nom,boutique,numero_orange_money,numero_moov_money,numero_coris_money}, produits, total}], articles, total, frais_livraison, total_final, vendeur_principal|null, numeros_formats:{orange?,moov?,coris?} (du vendeur principal), vendeurs_sauvegardes:[{id,nom,boutique,nb_produits,total}], utilisateur:{adresse,ville,code_postal,…} }` |
| POST | `/commandes` | adresse, ville, code_postal, pays, mode_paiement, numero_paiement | `{success, commande_id, mode_paiement, numero_paiement, total, total_final, frais_livraison, vendeur_principal, numeros_formats, email:{success,message}}` |
| GET | `/commandes` | – | mon-compte : `[commande + nb_articles, livreur_nom, livreur_telephone]` |
| GET | `/commandes/:id` | – | details-commande : `{ commande:{…, vendeur_nom, boutique, vendeur_email, vendeur_telephone, livreur_nom, livreur_telephone, livreur_vehicule}, details:[{…, nom, marque}], utilisateur, numeros_formats }` |
| GET | `/commandes/:id/recu` | – | **PDF** (`application/pdf`, inline) — reçu client (generer_recu.php racine) |
| PUT | `/auth/profil` | nom, prenom, telephone, adresse, ville, code_postal | seulement si mon-compte.php le permet (sinon omettre) |

## Messagerie client
| GET | `/conversations` | query: statut (ouvert\|ferme\|tous, déf. ouvert) | `{ conversations:[{id,sujet,produit_id,admin_id,statut,derniere_activite,vendeur_nom,vendeur_email,vendeur_telephone,vendeur_boutique,produit_nom,produit_image,messages_non_lus,dernier_message}], nb_non_lus }` |
| POST | `/conversations` | produit_id, admin_id?, sujet, message | `{success, conversation_id}` (creerOuRecupererConversation : réutilise la conversation ouverte du même produit) |
| GET | `/conversations/:id` | – | `{ conversation:{…, vendeur_nom, vendeur_email, boutique_nom, produit_nom, produit_image}, messages:[{…, expediteur_nom}] }` — marque lus les messages vendeur ; 403 si pas le client |
| POST | `/conversations/:id/messages` | message | `{success, messages:[…]}` ; notifie le vendeur (type `message`) |

## ADMIN (préfixe `/admin`, cookie `aos_admin`)
Auth
| POST | `/admin/auth/login` | email, mot_de_passe | `{success, admin}` |
| POST | `/admin/auth/logout` | – | `{success}` |
| GET | `/admin/auth/me` | – | `{ admin|null, est_super_admin, messages_non_lus, notifications_non_lues }` (jamais 401) |

Tableau de bord & notifications
| GET | `/admin/dashboard` | – | getDashboardData() : `{ admin, est_super_admin, nb_utilisateurs, nb_produits, nb_commandes, chiffre_affaires, dernieres_commandes(10), commissions?, taux_commission?, tous_admins?, stats_admins?, messages_non_lus, notifications(5 non lues) }` |
| GET | `/admin/notifications` | query: non_lues=1, limite | `{ notifications:[], nb_non_lues }` (tri importance DESC, date DESC) |
| GET | `/admin/notifications/check` | – | `{ total, nouvelles, derniere }` (polling toast, comme check_notifications.php) |
| POST | `/admin/notifications/:id/lire` | – | `{success}` |
| POST | `/admin/notifications/lire-toutes` | – | `{success}` |
| DELETE | `/admin/notifications/:id` | – | `{success}` |

Produits (vendeur : les siens ; super admin : tous + vendeur_nom/vendeur_boutique)
| GET | `/admin/produits` | – | `{ produits, categories, nb_produits }` |
| GET | `/admin/produits/:id` | – | produit (403 si pas permission) |
| POST | `/admin/produits` | multipart: nom, description, prix, stock, categorie_id, marque, promo, pourcentage_promo, image(file jpg/jpeg/png/gif/webp ≤5Mo) | `{success,message}` — validations: nom, description, prix>0 |
| PUT | `/admin/produits/:id` | multipart idem (+ `image_actuelle`) ; supprime l'ancienne image si remplacée | `{success,message}` |
| DELETE | `/admin/produits/:id` | – | supprime aussi le fichier image |
| GET | `/admin/categories` | – | `[]` |

Commandes
| GET | `/admin/commandes` | query: search, statut, date_debut, date_fin | `{ commandes:[…client_nom, client_email, livreur_nom, (vendeur: commission_admin, statut de commandes_admins)], stats:{ total_commandes, ca_total, en_attente, livrees, aujourdhui } }` |
| GET | `/admin/commandes/:id` | – | `{ commande:{…client_nom,client_email,client_tel}, details:[{…produit_nom,produit_image,admin_id,vendeur_nom}], livreurs_actifs, livreur_assigne, subtotal, commission_vendeur, est_super_admin }` |
| PUT | `/admin/commandes/:id/statut` | statut | `{success,message}` |
| PUT | `/admin/commandes/:id/livreur` | livreur_id ('' = retirer) — super admin seulement | `{success,message}` |
| DELETE | `/admin/commandes/:id` | super admin | supprime details_commande, commandes_admins, commandes |
| GET | `/admin/commandes/:id/recu` | – | **PDF** reçu admin/vendeur (admin/generer_recu.php) |

Vendeurs (super admin)
| GET | `/admin/vendeurs` | – | `[{admin_id, admin_nom, email, boutique, telephone, commission, actif, numero_*_money, nb_produits, nb_commandes, chiffre_affaires, total_commissions}]` |
| GET | `/admin/vendeurs/:id` | – | admin complet (sans mot_de_passe) |
| POST | `/admin/vendeurs` | nom,email,boutique,telephone,commission,mot_de_passe,numero_*_money | `{success,message}` |
| PUT | `/admin/vendeurs/:id` | idem, mot_de_passe optionnel | `{success,message}` |
| POST | `/admin/vendeurs/:id/toggle` | – | `{success,message}` |
| DELETE | `/admin/vendeurs/:id` | – | refus si produits associés |

Utilisateurs (admin ou vendeur, comme le PHP)
| GET | `/admin/utilisateurs` | query: search, statut | `{ utilisateurs:[…nb_commandes,total_achats], stats:{total, actifs, bloques, nouveaux_aujourdhui} }` |
| GET | `/admin/utilisateurs/:id` | – | `{ utilisateur, commandes, nb_commandes, total_achats, articles_panier, moyenne_commande }` |
| POST | `/admin/utilisateurs/:id/statut` | action:`bloquer`\|`debloquer` | `{success,message}` |
| DELETE | `/admin/utilisateurs/:id` | – | refus si commandes ; supprime son panier |

Livreurs (super admin)
| GET | `/admin/livreurs` | – | `[livreur]` |
| POST | `/admin/livreurs` | nom, telephone(8 chiffres), zone_livraison, vehicule | `{success,message}` |
| PUT | `/admin/livreurs/:id` | idem | |
| POST | `/admin/livreurs/:id/toggle` | – | |
| DELETE | `/admin/livreurs/:id` | – | |

Profil, commissions, paiements
| GET | `/admin/profil` | – | `{ admin, stats:{chiffre_affaires,nb_commandes,nb_produits,total_commissions}, stats_mensuelles, top_produits, stats_mois, repartition_statuts, stock_faible, dernieres_commandes(5), tendance_ca, tendance_commandes }` |
| GET | `/admin/commissions` | vendeur seulement | `{ stats_mensuelles, toutes_commissions, total_commissions, total_ca, stats_par_statut }` |
| GET | `/admin/mes-numeros` | – | `{ numero_orange_money, numero_moov_money, numero_coris_money }` |
| PUT | `/admin/mes-numeros` | numero_*_money | `{success,message}` |

Messagerie admin (vendeur : ses conversations ; super admin : toutes)
| GET | `/admin/conversations` | query: statut (ouvert\|ferme\|tous) | `{ conversations:[{…, client_nom, client_email, produit_nom, messages_non_lus}], messages_non_lus }` |
| GET | `/admin/conversations/:id` | – | `{ conversation:{…, client_nom, client_email, client_telephone, produit_nom, produit_image}, messages }` — marque lus les messages client |
| POST | `/admin/conversations/:id/messages` | message | `{success, messages}` |
| POST | `/admin/conversations/:id/fermer` / `/rouvrir` | – | `{success}` |
| GET | `/admin/messages/modeles` | – | `[{id,titre,texte}]` réponses pré-écrites (getModelesReponses) |

## Ajouts (renseignés par l'implémenteur backend)
- `PUT /auth/profil` : mise à jour du profil client (nom, prénom, téléphone, adresse, ville, code_postal, pays).
- `GET /commander/prepare` : panier groupé par vendeur + frais de livraison + numéros Mobile Money du vendeur + vendeurs sauvegardés.
- `GET /admin/commandes` : `stats.commissions` ajouté pour les vendeurs.
- `GET /admin/conversations/:id` : `client_prenom`, `client_adresse`, `produit_prix` ajoutés.
- L'ancien `admin/admin-upload-image.php` est fusionné dans `POST|PUT /admin/produits` (champ multipart `image`).
