import { Link } from 'react-router-dom';
export default function NotFoundPage() {
  return (
    <div className="container py-5 text-center">
      <div style={{ fontSize: '5rem' }}>🔍</div>
      <h1 className="fw-bold">Page introuvable</h1>
      <p className="text-muted mb-4">La page ou le produit que vous cherchez n'existe pas (ou plus).</p>
      <Link to="/produits" className="btn btn-primary"><i className="bi bi-grid"></i> Voir les produits</Link>
    </div>
  );
}
