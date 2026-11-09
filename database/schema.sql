-- =====================================================================
-- AOS Multi-Service International — schéma SQLite (reconstruit depuis le code PHP)
-- Toutes les instructions sont idempotentes.
-- Aucune VUE n'est nécessaire : l'API calcule les statistiques par requêtes SQL.
-- =====================================================================

CREATE TABLE IF NOT EXISTS utilisateurs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nom TEXT NOT NULL,
  prenom TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  mot_de_passe TEXT NOT NULL,
  telephone TEXT DEFAULT NULL,
  adresse TEXT DEFAULT NULL,
  ville TEXT DEFAULT NULL,
  code_postal TEXT DEFAULT NULL,
  pays TEXT DEFAULT NULL,
  statut TEXT NOT NULL DEFAULT 'actif',            -- 'actif' | 'bloqué'
  est_admin INTEGER NOT NULL DEFAULT 0,
  date_inscription TEXT DEFAULT CURRENT_TIMESTAMP
) ;

CREATE TABLE IF NOT EXISTS admins (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nom TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  mot_de_passe TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'vendeur',
  boutique TEXT DEFAULT NULL,
  telephone TEXT DEFAULT NULL,
  commission REAL NOT NULL DEFAULT 10,           -- taux en %
  actif INTEGER NOT NULL DEFAULT 1,
  numero_orange_money TEXT DEFAULT NULL,
  numero_moov_money TEXT DEFAULT NULL,
  numero_coris_money TEXT DEFAULT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
) ;

CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nom TEXT NOT NULL,
  type TEXT DEFAULT NULL                              -- 'informatique' | 'vetement'
) ;

CREATE TABLE IF NOT EXISTS produits (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  admin_id INTEGER DEFAULT NULL,
  nom TEXT NOT NULL,
  description TEXT,
  prix REAL NOT NULL,
  stock INTEGER NOT NULL DEFAULT 0,
  categorie_id INTEGER DEFAULT NULL,
  marque TEXT DEFAULT NULL,
  image TEXT DEFAULT NULL,
  promo INTEGER NOT NULL DEFAULT 0,
  pourcentage_promo INTEGER NOT NULL DEFAULT 0,
  nouveau INTEGER NOT NULL DEFAULT 0,
  date_ajout TEXT DEFAULT CURRENT_TIMESTAMP
) ;

CREATE TABLE IF NOT EXISTS panier (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  utilisateur_id INTEGER NOT NULL,
  produit_id INTEGER NOT NULL,
  quantite INTEGER NOT NULL DEFAULT 1,
  UNIQUE (utilisateur_id, produit_id)
) ;

CREATE TABLE IF NOT EXISTS panier_sauvegarde (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  utilisateur_id INTEGER NOT NULL,
  produit_id INTEGER NOT NULL,
  admin_id INTEGER DEFAULT NULL,
  quantite INTEGER NOT NULL DEFAULT 1,
  date_sauvegarde TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (utilisateur_id, produit_id)
) ;

CREATE TABLE IF NOT EXISTS livreurs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nom TEXT NOT NULL,
  telephone TEXT NOT NULL,
  zone_livraison TEXT DEFAULT NULL,
  vehicule TEXT DEFAULT 'moto',
  actif INTEGER NOT NULL DEFAULT 1,
  date_ajout TEXT DEFAULT CURRENT_TIMESTAMP
) ;

CREATE TABLE IF NOT EXISTS commandes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  utilisateur_id INTEGER NOT NULL,
  admin_id INTEGER DEFAULT NULL,
  total REAL NOT NULL,
  adresse_livraison TEXT DEFAULT NULL,
  ville TEXT DEFAULT NULL,
  code_postal TEXT DEFAULT NULL,
  pays TEXT DEFAULT NULL,
  mode_paiement TEXT DEFAULT NULL,                    -- orange_money | moov_money | coris_money
  numero_paiement TEXT DEFAULT NULL,
  statut_paiement TEXT DEFAULT 'en_attente',
  statut TEXT NOT NULL DEFAULT 'en_attente',          -- en_attente | en_preparation | confirmee | expediee | livree | annulee
  date_commande TEXT DEFAULT CURRENT_TIMESTAMP,
  livreur_id INTEGER NULL DEFAULT NULL,
  date_assignation_livreur TEXT NULL DEFAULT NULL
) ;

CREATE TABLE IF NOT EXISTS details_commande (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  commande_id INTEGER NOT NULL,
  produit_id INTEGER NOT NULL,
  quantite INTEGER NOT NULL,
  prix_unitaire REAL NOT NULL
) ;

-- Une ligne par produit commandé et par vendeur (alimente commissions / statistiques vendeur)
CREATE TABLE IF NOT EXISTS commandes_admins (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  commande_id INTEGER NOT NULL,
  admin_id INTEGER NOT NULL,
  produit_id INTEGER DEFAULT NULL,
  quantite INTEGER NOT NULL DEFAULT 1,
  total REAL NOT NULL DEFAULT 0,
  commission_admin REAL NOT NULL DEFAULT 0,
  statut TEXT NOT NULL DEFAULT 'en_attente',
  date_creation TEXT DEFAULT CURRENT_TIMESTAMP
) ;

CREATE TABLE IF NOT EXISTS conversations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  utilisateur_id INTEGER NOT NULL,
  admin_id INTEGER NOT NULL,
  produit_id INTEGER DEFAULT NULL,
  sujet TEXT DEFAULT '',
  statut TEXT NOT NULL DEFAULT 'ouvert',
  date_creation TEXT DEFAULT CURRENT_TIMESTAMP,
  derniere_activite TEXT DEFAULT CURRENT_TIMESTAMP
) ;

CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  conversation_id INTEGER NOT NULL,
  expediteur_type TEXT NOT NULL,
  expediteur_id INTEGER NOT NULL,
  message TEXT NOT NULL,
  lu INTEGER NOT NULL DEFAULT 0,
  date_envoi TEXT DEFAULT CURRENT_TIMESTAMP,
  date_lecture TEXT NULL DEFAULT NULL
) ;

CREATE TABLE IF NOT EXISTS notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  admin_id INTEGER NOT NULL,
  type TEXT NOT NULL DEFAULT 'system',                -- commande | produit | stock | system | message
  titre TEXT NOT NULL,
  message TEXT,
  lien TEXT DEFAULT NULL,
  importance TEXT NOT NULL DEFAULT 'medium',
  lu INTEGER NOT NULL DEFAULT 0,
  date_creation TEXT DEFAULT CURRENT_TIMESTAMP,
  date_lecture TEXT NULL DEFAULT NULL
) ;


CREATE INDEX IF NOT EXISTS idx_produits_admin_id ON produits(admin_id);
CREATE INDEX IF NOT EXISTS idx_produits_categorie_id ON produits(categorie_id);
CREATE INDEX IF NOT EXISTS idx_commandes_utilisateur_id ON commandes(utilisateur_id);
CREATE INDEX IF NOT EXISTS idx_commandes_admin_id ON commandes(admin_id);
CREATE INDEX IF NOT EXISTS idx_details_commande_commande_id ON details_commande(commande_id);
CREATE INDEX IF NOT EXISTS idx_commandes_admins_commande_id ON commandes_admins(commande_id);
CREATE INDEX IF NOT EXISTS idx_commandes_admins_admin_id ON commandes_admins(admin_id);
CREATE INDEX IF NOT EXISTS idx_conversations_utilisateur_id ON conversations(utilisateur_id);
CREATE INDEX IF NOT EXISTS idx_conversations_admin_id ON conversations(admin_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_notifications_admin_id ON notifications(admin_id);

-- Catégories par défaut (uniquement si la table est vide)
INSERT INTO categories (nom, type)
SELECT * FROM (
  SELECT 'Ordinateurs portables' AS nom, 'informatique' AS type UNION ALL
  SELECT 'Accessoires informatiques', 'informatique' UNION ALL
  SELECT 'Téléphones & tablettes', 'informatique' UNION ALL
  SELECT 'Vêtements homme', 'vetement' UNION ALL
  SELECT 'Vêtements femme', 'vetement' UNION ALL
  SELECT 'Chaussures', 'vetement'
) AS t WHERE NOT EXISTS (SELECT 1 FROM categories);
