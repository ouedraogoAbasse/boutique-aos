import { Link } from 'react-router-dom';

const Li = ({ to, children }) => (
  <li>{to ? <Link to={to}><i className="bi bi-chevron-right"></i> {children}</Link> : <a href="#" onClick={(e) => e.preventDefault()}><i className="bi bi-chevron-right"></i> {children}</a>}</li>
);

export default function Footer() {
  return (
    <footer>
      <div className="container">
        <div className="row g-4">
          <div className="col-md-3">
            <h5><img src="/logo.jpg" alt="AOS Logo" /> <span className="d-none d-md-inline">AOS Multi-service International</span></h5>
            <p className="small opacity-75">Votre boutique en ligne pour l'informatique et la mode de qualité.</p>
          </div>
          <div className="col-md-3">
            <h5>Liens Rapides</h5>
            <ul><Li to="/">Accueil</Li><Li to="/produits">Produits</Li><Li to="/mon-compte">Mon Compte</Li><Li to="/messages">Mes Messages</Li></ul>
          </div>
          <div className="col-md-3">
            <h5>Service Client</h5>
            <ul><Li>Contact</Li><Li to="/livraison">Livraison</Li><Li>Retours</Li><Li to="/inscription-vendeur">Devenir vendeur</Li></ul>
          </div>
          <div className="col-md-3">
            <h5>Informations</h5>
            <ul><Li>À Propos</Li><Li>CGV</Li><Li>Confidentialité</Li></ul>
            <div className="mt-3">
              <a href="#" onClick={(e) => e.preventDefault()} className="text-white me-3 fs-5"><i className="bi bi-facebook"></i></a>
              <a href="#" onClick={(e) => e.preventDefault()} className="text-white me-3 fs-5"><i className="bi bi-instagram"></i></a>
              <a href="#" onClick={(e) => e.preventDefault()} className="text-white fs-5"><i className="bi bi-twitter"></i></a>
            </div>
          </div>
        </div>
        <hr className="my-4 opacity-25" />
        <div className="text-center"><p className="mb-0 small">&copy; {new Date().getFullYear()} AOS MULTI-SERVICE International. Tous droits réservés.</p></div>
      </div>
    </footer>
  );
}
