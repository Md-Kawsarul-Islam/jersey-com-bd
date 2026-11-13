import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { CartProvider } from './context/CartContext';
import { UIProvider } from './context/UIContext';
import { ProductsProvider, useProducts } from './context/ProductsContext';
import { AdminProvider } from './context/AdminContext';
import { ScrollToTop, Toast } from './components/Utilities';
import Header from './components/Header';
import Footer from './components/Footer';
import StickyFooter from './components/StickyFooter';
import CartDrawer from './components/CartDrawer';
import MobileMenu from './components/MobileMenu';
import SearchModal from './components/SearchModal';
import FloatingContact from './components/FloatingContact';
import BackToTop from './components/BackToTop';

import Home from './pages/Home';
import Shop from './pages/Shop';
import Category from './pages/Category';
import Combos from './pages/Combos';
import ProductDetail from './pages/ProductDetail';
import Wishlist from './pages/Wishlist';
import Checkout from './pages/Checkout';
import OrderSuccess from './pages/OrderSuccess';
import TrackOrder from './pages/TrackOrder';
import Login from './pages/Login';
import Register from './pages/Register';
import Account from './pages/Account';
import Contact from './pages/Contact';
import StaticPage from './pages/StaticPage';
import NotFound from './pages/NotFound';

import AdminLogin from './pages/admin/AdminLogin';
import AdminLayout from './pages/admin/AdminLayout';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminOrders from './pages/admin/AdminOrders';
import AdminProducts from './pages/admin/AdminProducts';
import AdminMessages from './pages/admin/AdminMessages';
import AdminSubscribers from './pages/admin/AdminSubscribers';

/** Re-fetch the catalog on every route change so storefront edits feel live. */
function CatalogRefresher() {
  const { pathname } = useLocation();
  const { refresh } = useProducts();
  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);
  return null;
}

function Storefront() {
  return (
    <>
      <Header />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/shop" element={<Shop />} />
        <Route path="/category/:slug" element={<Category />} />
        <Route path="/combos" element={<Combos />} />
        <Route path="/product/:slug" element={<ProductDetail />} />
        <Route path="/wishlist" element={<Wishlist />} />
        <Route path="/checkout" element={<Checkout />} />
        <Route path="/order-success/:orderId" element={<OrderSuccess />} />
        <Route path="/track/order" element={<TrackOrder />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/account" element={<Account />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/page/:slug" element={<StaticPage />} />
        {/* legacy alias from the reference site */}
        <Route path="/home" element={<Home />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      <Footer />
      <CartDrawer />
      <MobileMenu />
      <SearchModal />
      <StickyFooter />
      <FloatingContact />
      <BackToTop />
    </>
  );
}

export default function App() {
  return (
    <ProductsProvider>
      <CartProvider>
        <AdminProvider>
          <UIProvider>
            <BrowserRouter>
              <ScrollToTop />
              <CatalogRefresher />
              <Routes>
                <Route path="/admin/login" element={<AdminLogin />} />
                <Route path="/admin" element={<AdminLayout />}>
                  <Route index element={<AdminDashboard />} />
                  <Route path="orders" element={<AdminOrders />} />
                  <Route path="products" element={<AdminProducts />} />
                  <Route path="messages" element={<AdminMessages />} />
                  <Route path="subscribers" element={<AdminSubscribers />} />
                </Route>
                <Route path="/*" element={<Storefront />} />
              </Routes>
              <Toast />
            </BrowserRouter>
          </UIProvider>
        </AdminProvider>
      </CartProvider>
    </ProductsProvider>
  );
}
