import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { RedirectIfAdmin, RedirectIfUser, RequireAdmin, RequireUser, Spinner } from './components/guards.jsx';

import PublicLayout from './components/PublicLayout.jsx';
import AdminLayout from './components/admin/AdminLayout.jsx';

// (imports explicites ci-dessous pour que Vite puisse les analyser)
const HomePage = lazy(() => import('./pages/HomePage.jsx'));
const ProductsPage = lazy(() => import('./pages/ProductsPage.jsx'));
const ProductDetailPage = lazy(() => import('./pages/ProductDetailPage.jsx'));
const CartPage = lazy(() => import('./pages/CartPage.jsx'));
const CheckoutPage = lazy(() => import('./pages/CheckoutPage.jsx'));
const AccountPage = lazy(() => import('./pages/AccountPage.jsx'));
const OrderDetailPage = lazy(() => import('./pages/OrderDetailPage.jsx'));
const ConversationsPage = lazy(() => import('./pages/ConversationsPage.jsx'));
const ConversationPage = lazy(() => import('./pages/ConversationPage.jsx'));
const ContactSellerPage = lazy(() => import('./pages/ContactSellerPage.jsx'));
const DeliveryPage = lazy(() => import('./pages/DeliveryPage.jsx'));
const LoginPage = lazy(() => import('./pages/LoginPage.jsx'));
const RegisterPage = lazy(() => import('./pages/RegisterPage.jsx'));
const SellerRegisterPage = lazy(() => import('./pages/SellerRegisterPage.jsx'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage.jsx'));

const AdminLoginPage = lazy(() => import('./pages/admin/AdminLoginPage.jsx'));
const AdminDashboardPage = lazy(() => import('./pages/admin/AdminDashboardPage.jsx'));
const AdminProductsPage = lazy(() => import('./pages/admin/AdminProductsPage.jsx'));
const AdminOrdersPage = lazy(() => import('./pages/admin/AdminOrdersPage.jsx'));
const AdminOrderDetailPage = lazy(() => import('./pages/admin/AdminOrderDetailPage.jsx'));
const AdminSellersPage = lazy(() => import('./pages/admin/AdminSellersPage.jsx'));
const AdminUsersPage = lazy(() => import('./pages/admin/AdminUsersPage.jsx'));
const AdminUserDetailPage = lazy(() => import('./pages/admin/AdminUserDetailPage.jsx'));
const AdminCouriersPage = lazy(() => import('./pages/admin/AdminCouriersPage.jsx'));
const AdminCommissionsPage = lazy(() => import('./pages/admin/AdminCommissionsPage.jsx'));
const AdminMessagesPage = lazy(() => import('./pages/admin/AdminMessagesPage.jsx'));
const AdminConversationPage = lazy(() => import('./pages/admin/AdminConversationPage.jsx'));
const AdminNotificationsPage = lazy(() => import('./pages/admin/AdminNotificationsPage.jsx'));
const AdminProfilePage = lazy(() => import('./pages/admin/AdminProfilePage.jsx'));
const AdminPaymentNumbersPage = lazy(() => import('./pages/admin/AdminPaymentNumbersPage.jsx'));

export default function App() {
  return (
    <Suspense fallback={<Spinner />}>
      <Routes>
        {/* ===== Site client ===== */}
        <Route element={<PublicLayout />}>
          <Route path="/" element={<HomePage />} />                                  {/* index.php */}
          <Route path="/produits" element={<ProductsPage />} />                      {/* produits.php */}
          <Route path="/produits/:id" element={<ProductDetailPage />} />             {/* produit-detail.php?id= */}
          <Route path="/livraison" element={<DeliveryPage />} />                     {/* livreurs.php */}
          <Route element={<RequireUser />}>
            <Route path="/panier" element={<CartPage />} />                          {/* panier.php */}
            <Route path="/commander" element={<CheckoutPage />} />                   {/* commander.php */}
            <Route path="/mon-compte" element={<AccountPage />} />                   {/* mon-compte.php */}
            <Route path="/commandes/:id" element={<OrderDetailPage />} />            {/* details-commande.php?id= */}
            <Route path="/messages" element={<ConversationsPage />} />               {/* mes-conversations.php */}
            <Route path="/contacter-vendeur/:produitId" element={<ContactSellerPage />} /> {/* contacter-vendeur.php?produit_id= */}
          </Route>
          <Route path="*" element={<NotFoundPage />} />
        </Route>
        <Route element={<RequireUser />}>
          <Route path="/messages/:id" element={<ConversationPage />} />              {/* conversation.php?id= (plein écran) */}
        </Route>
        <Route element={<RedirectIfUser />}>
          <Route path="/connexion" element={<LoginPage />} />                        {/* connexion.php */}
          <Route path="/inscription" element={<RegisterPage />} />                   {/* inscription.php */}
        </Route>
        <Route path="/inscription-vendeur" element={<SellerRegisterPage />} />       {/* inscription_vendeur.php */}

        {/* ===== Espace admin / vendeur ===== */}
        <Route element={<RedirectIfAdmin />}>
          <Route path="/admin/connexion" element={<AdminLoginPage />} />             {/* admin/connexion.php */}
        </Route>
        <Route element={<RequireAdmin />}>
          <Route path="/admin/messagerie/:id" element={<AdminConversationPage />} />   {/* admin/conversation-detail.php (plein écran) */}
          <Route element={<AdminLayout />}>
            <Route path="/admin" element={<AdminDashboardPage />} />                 {/* admin/index.php */}
            <Route path="/admin/produits" element={<AdminProductsPage />} />         {/* admin/produits.php (liste + formulaire) */}
            <Route path="/admin/commandes" element={<AdminOrdersPage />} />
            <Route path="/admin/commandes/:id" element={<AdminOrderDetailPage />} />
            <Route path="/admin/utilisateurs" element={<AdminUsersPage />} />
            <Route path="/admin/utilisateurs/:id" element={<AdminUserDetailPage />} />
            <Route path="/admin/messagerie" element={<AdminMessagesPage />} />       {/* admin/messagerie.php (?conv=) */}
            <Route path="/admin/notifications" element={<AdminNotificationsPage />} />
            <Route path="/admin/profil" element={<AdminProfilePage />} />
            <Route path="/admin/mes-numeros-paiement" element={<AdminPaymentNumbersPage />} />
            <Route element={<RequireAdmin superOnly />}>
              <Route path="/admin/vendeurs" element={<AdminSellersPage />} />
              <Route path="/admin/livreurs" element={<AdminCouriersPage />} />
            </Route>
            <Route element={<RequireAdmin vendeurOnly />}>
              <Route path="/admin/commissions" element={<AdminCommissionsPage />} />
            </Route>
          </Route>
        </Route>
        <Route path="/admin/*" element={<Navigate to="/admin" replace />} />
      </Routes>
    </Suspense>
  );
}
