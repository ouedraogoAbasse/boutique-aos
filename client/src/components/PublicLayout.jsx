import { Outlet } from 'react-router-dom';
import Header from './Header.jsx';
import Footer from './Footer.jsx';
import '../site.css';

/** Gabarit du site client : header.php + contenu + footer.php */
export default function PublicLayout() {
  return (
    <div className="site">
      <Header />
      <main><Outlet /></main>
      <Footer />
    </div>
  );
}
