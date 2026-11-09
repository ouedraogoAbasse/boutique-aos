// Envoi des e-mails (équivalent de includes/email.php + PHPMailer) avec nodemailer
import fs from 'node:fs';
import path from 'node:path';
import nodemailer from 'nodemailer';
import { config } from '../config.js';
import { getVendeurNumerosFormats } from './helpers.js';

const LOG_FILE = path.join(config.logsDir, 'email_errors.log');
const OPERATEURS = {
  orange_money: 'Orange Money',
  moov_money: 'Moov Money',
  coris_money: 'Coris Money',
};

/** logEmail() PHP : "[YYYY-MM-DD HH:MM:SS] message" */
export function logEmail(message) {
  try {
    fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });
    const d = new Date();
    const p = (n) => String(n).padStart(2, '0');
    const ts = `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
    fs.appendFileSync(LOG_FILE, `[${ts}] ${message}\n`);
  } catch (e) {
    console.error('logEmail:', e.message);
  }
}

/** number_format($n, 0, ',', ' ') */
export const fmtFCFA = (n) =>
  Math.round(Number(n) || 0)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

const esc = (v) =>
  String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

const numCmd = (id) => String(id).padStart(6, '0');

const CSS = `
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f8fafc; }
        .container { max-width: 600px; margin: 20px auto; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #1a56c4, #0d2a6e); color: white; padding: 40px 30px; text-align: center; }
        .header h1 { margin: 0; font-size: 28px; }
        .content { padding: 30px; }
        .order-number { background: #dcfce7; color: #166534; padding: 12px 20px; border-radius: 8px; display: inline-block; font-weight: bold; margin: 20px 0; font-size: 16px; }
        .amount { font-size: 32px; color: #1a56c4; font-weight: bold; }
        .instructions { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 20px; margin: 25px 0; border-radius: 5px; }
        .instructions h3 { margin-top: 0; color: #92400e; }
        .alert-warning { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 15px 0; border-radius: 5px; color: #92400e; }
        .step { margin: 15px 0; padding-left: 35px; position: relative; color: #1e293b; }
        .step-number { position: absolute; left: 0; top: 2px; background: #1a56c4; color: white; width: 26px; height: 26px; border-radius: 50%; text-align: center; line-height: 26px; font-size: 13px; font-weight: bold; }
        .products { background: #f8fafc; padding: 20px; border-radius: 8px; margin: 25px 0; }
        .products h3 { margin-top: 0; color: #1e293b; }
        .product-item { border-bottom: 1px solid #e2e8f0; padding: 12px 0; }
        .product-item:last-child { border-bottom: none; }
        .product-name { font-weight: 600; color: #1e293b; margin-bottom: 5px; }
        .product-details { font-size: 14px; color: #64748b; }
        .address-box { background: #f1f5f9; padding: 15px; border-radius: 8px; margin: 20px 0; }
        .address-box h4 { margin-top: 0; color: #1e293b; }
        .footer { text-align: center; padding: 30px; background: #f8fafc; color: #64748b; font-size: 13px; border-top: 1px solid #e2e8f0; }
        .footer a { color: #1a56c4; text-decoration: none; }
        .info-box { background: #dbeafe; border-left: 4px solid #3b82f6; padding: 15px; margin: 20px 0; border-radius: 5px; }
        @media only screen and (max-width: 600px) { .container { margin: 0; border-radius: 0; } .header, .content { padding: 20px; } .amount { font-size: 24px; } }`;

const ETAPES = {
  orange_money: ['#144#', '"Transfert d\'argent"', 'Validez avec votre code secret'],
  moov_money: ['*155#', '"Transfert"', 'Confirmez avec votre code PIN'],
  coris_money: ['*662#', '"Transfert"', 'Validez avec votre code secret'],
};

/** construireEmailHTML() PHP */
export function construireEmailHTML(commandeId, total, modePaiement, articles, numerosReception, adresse) {
  const operateur = OPERATEURS[modePaiement] || modePaiement;
  const numeroAffiche = numerosReception?.[modePaiement] || null;
  const hasAdresse = adresse && Object.keys(adresse).length > 0;

  let html = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>${CSS}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>✅ Commande Confirmée !</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">Merci pour votre confiance</p>
        </div>

        <div class="content">
            <p style="font-size: 16px;">Bonjour,</p>

            <p style="font-size: 16px;">Nous avons bien reçu votre commande et nous vous en remercions.</p>

            <div class="order-number">
                📦 N° de commande : #${numCmd(commandeId)}
            </div>

            <p style="font-size: 16px;">Montant total : <span class="amount">${fmtFCFA(total)} FCFA</span></p>`;

  if (hasAdresse) {
    html += `
            <div class="address-box">
                <h4>📍 Adresse de livraison</h4>
                <p style="margin: 5px 0;">${esc(adresse.adresse)}</p>
                <p style="margin: 5px 0;">${esc(adresse.ville)}, ${esc(adresse.code_postal)}</p>
                <p style="margin: 5px 0;">${esc(adresse.pays)}</p>
            </div>`;
  }

  html += `
            <div class="products">
                <h3>📦 Détails de votre commande</h3>`;
  for (const a of articles || []) {
    html += `
                <div class="product-item">
                    <div class="product-name">${esc(a.nom)}</div>
                    <div class="product-details">
                        Quantité : ${a.quantite} × ${fmtFCFA(a.prix_final)} FCFA =
                        <strong>${fmtFCFA(a.prix_final * a.quantite)} FCFA</strong>
                    </div>
                </div>`;
  }
  html += `
            </div>

            <div class="instructions">
                <h3>💳 Instructions de paiement via ${esc(operateur)}</h3>`;

  if (!numeroAffiche) {
    html += `
                <div class="alert-warning">
                    <strong>⚠️ Attention :</strong> Le vendeur n'a pas renseigné son numéro ${esc(operateur)}.
                    Veuillez le contacter directement pour obtenir ses coordonnées de paiement.
                </div>`;
  } else {
    const [ussd, choix, validation] = ETAPES[modePaiement] || ETAPES.coris_money;
    html += `
                <div class="step"><span class="step-number">1</span> Composez <strong>${ussd}</strong> sur votre téléphone</div>
                <div class="step"><span class="step-number">2</span> Choisissez <strong>${esc(choix)}</strong></div>
                <div class="step"><span class="step-number">3</span> Entrez le numéro : <strong style="color: #1a56c4; font-size: 18px;">${esc(numeroAffiche)}</strong></div>
                <div class="step"><span class="step-number">4</span> Montant : <strong style="color: #1a56c4; font-size: 18px;">${fmtFCFA(total)} FCFA</strong></div>
                <div class="step"><span class="step-number">5</span> ${validation}</div>`;
  }

  html += `
            </div>

            <div class="info-box">
                <strong>ℹ️ Information importante</strong>
                <p style="margin: 10px 0 0 0;">Votre commande sera traitée dès réception du paiement. Vous recevrez une notification lorsque votre colis sera expédié.</p>
            </div>

            <p style="font-size: 16px; margin-top: 30px;">Merci de votre confiance !</p>
            <p style="font-size: 16px; margin-top: 10px;"><strong>L'équipe AOS Multi-Service</strong></p>
        </div>

        <div class="footer">
            <p style="margin: 5px 0;"><strong>AOS Multi-Service International</strong></p>
            <p style="margin: 5px 0;">Ouagadougou, Burkina Faso</p>
            <p style="margin: 5px 0;">📧 <a href="mailto:aosmultiserviceinternational@gmail.com">contact@aos-multiservice.com</a></p>
            <p style="margin: 5px 0;">📱 +226 64 55 38 70</p>
            <p style="margin: 20px 0 5px 0; font-size: 12px; color: #94a3b8;">
                &copy; ${new Date().getFullYear()} AOS Multi-Service - Tous droits réservés
            </p>
        </div>
    </div>
</body>
</html>`;
  return html;
}

/** construireEmailTexte() PHP */
export function construireEmailTexte(commandeId, total, modePaiement, numerosReception) {
  const operateur = OPERATEURS[modePaiement] || modePaiement;
  const numeroAffiche = numerosReception?.[modePaiement] || 'Non renseigné';

  let t = 'COMMANDE CONFIRMÉE\n\n';
  t += `N° de commande : #${numCmd(commandeId)}\n`;
  t += `Montant total : ${fmtFCFA(total)} FCFA\n\n`;
  t += `INSTRUCTIONS DE PAIEMENT VIA ${operateur.toUpperCase()}\n\n`;

  if (numeroAffiche === 'Non renseigné') {
    t += `⚠️ ATTENTION : Le vendeur n'a pas renseigné son numéro ${operateur}.\n`;
    t += 'Veuillez le contacter directement pour obtenir ses coordonnées de paiement.\n\n';
  } else {
    if (modePaiement === 'orange_money') {
      t += '1. Composez #144# sur votre téléphone\n';
      t += "2. Choisissez 'Transfert d'argent'\n";
    } else if (modePaiement === 'moov_money') {
      t += '1. Composez *155# sur votre téléphone\n';
      t += "2. Sélectionnez 'Transfert'\n";
    } else {
      t += '1. Composez *662# sur votre téléphone\n';
      t += "2. Choisissez 'Transfert'\n";
    }
    t += `3. Entrez le numéro : ${numeroAffiche}\n`;
    t += `4. Montant : ${fmtFCFA(total)} FCFA\n`;
    t += '5. Validez avec votre code secret\n\n';
  }
  t += 'Merci de votre confiance !\n\n';
  t += 'AOS Multi-Service International\n';
  t += 'aosmultiserviceinternational@gmail.com\n';
  t += '+226 64 55 38 70';
  return t;
}

let transporter = null;
function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: config.smtp.host,
      port: config.smtp.port,
      secure: config.smtp.port === 465, // 587 => STARTTLS
      requireTLS: config.smtp.port !== 465,
      auth: { user: config.smtp.user, pass: config.smtp.pass },
    });
  }
  return transporter;
}

/**
 * envoyerEmailConfirmation() PHP
 * @returns {Promise<{success:boolean,message:string}>} ne lève jamais d'exception
 */
export async function envoyerEmailConfirmation(destinataire, commandeId, total, modePaiement, articles, adresse = {}, adminId = null) {
  if (!config.smtp.user || !config.smtp.pass) {
    logEmail(`⚠️ SMTP non configuré : email non envoyé à ${destinataire} - Commande #${commandeId}`);
    return { success: false, message: 'SMTP non configuré' };
  }
  try {
    const formats = adminId ? await getVendeurNumerosFormats(adminId) : {};
    const numerosReception = {
      orange_money: formats.orange?.numero ?? null,
      moov_money: formats.moov?.numero ?? null,
      coris_money: formats.coris?.numero ?? null,
    };
    await getTransporter().sendMail({
      from: { name: config.smtp.fromName, address: config.smtp.user },
      to: destinataire,
      subject: `Confirmation de commande #${numCmd(commandeId)} - AOS Multi-Service International`,
      html: construireEmailHTML(commandeId, total, modePaiement, articles, numerosReception, adresse),
      text: construireEmailTexte(commandeId, total, modePaiement, numerosReception),
    });
    logEmail(`✅ Email envoyé avec succès à ${destinataire} - Commande #${commandeId}`);
    return { success: true, message: 'Email envoyé avec succès' };
  } catch (e) {
    logEmail(`❌ Erreur d'envoi d'email à ${destinataire} - Commande #${commandeId}\nErreur SMTP : ${e.message}\n`);
    return { success: false, message: `Erreur lors de l'envoi de l'email : ${e.message}` };
  }
}
