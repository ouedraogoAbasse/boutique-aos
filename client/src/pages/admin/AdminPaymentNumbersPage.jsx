import { useEffect, useState } from 'react';
import api from '../../lib/api.js';
import { Spinner } from '../../components/guards.jsx';
import './AdminPaymentNumbersPage.css';

const OPS = [['numero_orange_money', 'Orange Money', 'OM', 'orange', '--orange-money', '70 12 34 56', '#144#'], ['numero_moov_money', 'Moov Money', 'MM', 'moov', '--moov-money', '60 12 34 56', '*155#'], ['numero_coris_money', 'Coris Money', 'CM', 'coris', '--coris-money', '50 12 34 56', '*662#']];

export default function AdminPaymentNumbersPage() {
  const [saved, setSaved] = useState(null);
  const [form, setForm] = useState({});
  const [msg, setMsg] = useState(null);
  useEffect(() => { api.get('/admin/mes-numeros').then((r) => { setSaved(r); setForm({ numero_orange_money: r.numero_orange_money || '', numero_moov_money: r.numero_moov_money || '', numero_coris_money: r.numero_coris_money || '' }); }); }, []);
  if (!saved) return <Spinner />;
  const aucun = !saved.numero_orange_money && !saved.numero_moov_money && !saved.numero_coris_money;

  async function submit(e) {
    e.preventDefault(); setMsg(null);
    try { await api.put('/admin/mes-numeros', form); setSaved(await api.get('/admin/mes-numeros')); setMsg({ type: 'success', text: 'Vos numéros de paiement ont été mis à jour avec succès !' }); }
    catch (err) { setMsg({ type: 'danger', text: err.message }); }
  }

  return (
    <div className="adm-paynum"><div className="container-main"><div className="card">
      <div className="card-header"><h2><i className="bi bi-phone-fill me-2"></i>Mes Numéros de Paiement</h2><p>Gérez les numéros sur lesquels vous recevrez les paiements de vos clients</p></div>
      <div className="card-body">
        {msg && <div className={`alert alert-${msg.type}`}><i className={`bi bi-${msg.type === 'success' ? 'check-circle-fill' : 'exclamation-triangle'} me-2`}></i>{msg.text}</div>}
        {aucun ? <div className="warning-box"><i className="bi bi-exclamation-triangle-fill me-2"></i><strong>Action requise :</strong> Vous devez renseigner au moins un numéro de paiement pour recevoir les paiements de vos clients.</div>
          : <div className="info-box"><i className="bi bi-info-circle me-2"></i>Ces numéros sont affichés aux clients lors de la confirmation de commande pour qu'ils puissent vous payer directement.</div>}
        <form onSubmit={submit}>
          {OPS.map(([k, label, ab, cls, v, ph, ussd]) => (
            <div className="payment-input-group" key={k}><div className={`payment-card ${saved[k] ? 'has-number' : ''}`}>
              <span className={`payment-icon-badge ${cls}-badge`}>{ab}</span>
              <label htmlFor={k} className="form-label"><i className="bi bi-phone-fill" style={{ color: `var(${v})` }}></i> {label}</label>
              {saved[k] && <div className="current-number"><span className="text-muted">Numéro actuel :</span> <span className="current-number-value"><i className="bi bi-check-circle-fill me-1"></i>+226 {saved[k]}</span></div>}
              <div className="mt-2"><span className="phone-prefix-display">+226</span>
                <input type="tel" className="form-control d-inline-block" style={{ width: 'calc(100% - 60px)' }} id={k} placeholder={ph} maxLength={8} value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value.replace(/\D/g, '').slice(0, 8) })} /></div>
              <small className="text-muted">Code USSD : {ussd}</small>
            </div></div>))}
          <button type="submit" className="btn btn-primary"><i className="bi bi-check-circle me-2"></i>Enregistrer mes numéros</button>
        </form>
      </div>
    </div></div></div>
  );
}
