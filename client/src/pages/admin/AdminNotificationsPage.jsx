import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../lib/api.js';
import { useAdminAuth } from '../../context/AdminAuthContext.jsx';
import { NOTIF_ICONS, NOTIF_COLORS, tempsNotification } from '../../lib/utils.js';
import { Spinner } from '../../components/guards.jsx';
import './AdminNotificationsPage.css';

export default function AdminNotificationsPage() {
  const [d, setD] = useState(null);
  const { refresh } = useAdminAuth();
  const charger = useCallback(() => api.get('/admin/notifications', { limite: 100 }).then(setD), []);
  useEffect(() => { charger(); }, [charger]);
  if (!d) return <Spinner />;
  const agir = async (fn) => { await fn(); await charger(); refresh(); };

  return (
    <div className="admin-notifs">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2><i className="bi bi-bell"></i> Mes Notifications {d.nb_non_lues > 0 && <span className="badge bg-danger">{d.nb_non_lues}</span>}</h2>
        <div>
          <Link to="/admin" className="btn btn-secondary me-2"><i className="bi bi-arrow-left"></i> Retour</Link>
          {d.nb_non_lues > 0 && <button className="btn btn-primary" onClick={() => agir(() => api.post('/admin/notifications/lire-toutes'))}><i className="bi bi-check-all"></i> Tout marquer comme lu</button>}
        </div>
      </div>
      {d.notifications.length === 0 ? (
        <div className="text-center py-5"><i className="bi bi-bell-slash fs-1 text-muted d-block mb-3"></i><h4 className="text-muted">Aucune notification</h4><p className="text-muted">Vous n'avez pas encore de notifications.</p></div>
      ) : d.notifications.map((n) => (
        <div key={n.id} className={`notification-card ${n.lu ? '' : 'unread'} ${n.importance}`}>
          <div className="d-flex align-items-start">
            <div className="me-3"><i className={`bi bi-${NOTIF_ICONS[n.type] || 'info-circle'} fs-2 text-${NOTIF_COLORS[n.importance] || 'secondary'}`}></i></div>
            <div className="flex-grow-1">
              <div className="d-flex justify-content-between align-items-start mb-2"><h5 className="mb-0">{n.titre}</h5>
                <span className={`badge bg-${NOTIF_COLORS[n.importance] || 'secondary'}`}>{n.importance[0].toUpperCase() + n.importance.slice(1)}</span></div>
              <p className="mb-2">{n.message}</p>
              <div className="d-flex justify-content-between align-items-center">
                <small className="text-muted"><i className="bi bi-clock"></i> {tempsNotification(n.date_creation)}</small>
                <div>
                  {n.lien && <Link to={n.lien} onClick={() => api.post(`/admin/notifications/${n.id}/lire`).catch(() => {})} className="btn btn-sm btn-primary me-1"><i className="bi bi-arrow-right"></i> Voir</Link>}
                  {!n.lu && <button className="btn btn-sm btn-outline-primary me-1" onClick={() => agir(() => api.post(`/admin/notifications/${n.id}/lire`))}><i className="bi bi-check"></i> Marquer lu</button>}
                  <button className="btn btn-sm btn-outline-danger" onClick={() => window.confirm('Supprimer cette notification ?') && agir(() => api.del(`/admin/notifications/${n.id}`))}><i className="bi bi-trash"></i></button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
