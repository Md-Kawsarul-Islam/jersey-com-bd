import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  FiX,
  FiTrash2,
  FiGift,
  FiShoppingCart,
  FiArrowRight,
  FiCheckCircle,
} from 'react-icons/fi';
import { useCart } from '../context/CartContext';
import { useProducts } from '../context/ProductsContext';
import { taka } from './ProductCard';

export default function CartDrawer() {
  const { getBySlug } = useProducts();
  const {
    cartOpen,
    setCartOpen,
    items,
    setQty,
    removeFromCart,
    subtotal,
    originalSubtotal,
    itemCount,
    freeDelivery,
    amountToFreeDelivery,
    freeDeliveryThreshold,
  } = useCart();
  const [promoDismissed, setPromoDismissed] = useState(false);
  const navigate = useNavigate();

  const progress = Math.min(100, (subtotal / freeDeliveryThreshold) * 100);
  const savings = originalSubtotal - subtotal;

  return (
    <>
      <div
        className={`cart-overlay ${cartOpen ? 'open' : ''}`}
        onClick={() => setCartOpen(false)}
        aria-hidden="true"
      />
      <aside
        className={`cart-drawer ${cartOpen ? 'open' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label="Shopping cart"
        aria-hidden={!cartOpen}
      >
        <div className="cart-header">
          <span>Shopping Cart {itemCount > 0 && `(${itemCount})`}</span>
          <button className="cart-close" onClick={() => setCartOpen(false)}>
            Close <FiArrowRight />
          </button>
        </div>

        {!promoDismissed && (
          <div className={`promo-alert ${freeDelivery ? 'unlocked' : ''}`}>
            <div className="promo-alert-inner">
              <div className="promo-alert-icon">
                {freeDelivery ? <FiCheckCircle /> : <FiGift />}
              </div>
              <div className="promo-alert-content">
                <span className="promo-alert-title">
                  {freeDelivery ? 'FREE delivery unlocked!' : 'Free Delivery Offer'}
                </span>
                <p className="promo-alert-text">
                  {freeDelivery ? (
                    <>Your order ships <b>free</b> — anywhere in Bangladesh!</>
                  ) : (
                    <>Add <b>{taka(amountToFreeDelivery)}</b> more to unlock FREE delivery!</>
                  )}
                </p>
              </div>
              <button
                className="promo-dismiss"
                aria-label="Dismiss promotion"
                onClick={() => setPromoDismissed(true)}
              >
                <FiX />
              </button>
            </div>
            <div className="promo-progress">
              <div style={{ width: `${progress}%` }} />
            </div>
          </div>
        )}

        {items.length === 0 ? (
          <div className="cart-empty">
            <img src="/assets/empty_cart.png" alt="Empty cart" />
            <p>No items in your cart!</p>
            <button
              className="btn-primary"
              onClick={() => {
                setCartOpen(false);
                navigate('/shop');
              }}
            >
              Continue Shopping <FiArrowRight />
            </button>
          </div>
        ) : (
          <>
            <div className="cart-items">
              {items.map((item) => {
                const p = getBySlug(item.slug);
                if (!p) {
                  // product was deleted from the catalog — keep the line but flag it clearly
                  return (
                    <div className="cart-item cart-item-stale" key={`${item.slug}-${item.size}`}>
                      <div className="cart-item-stale-thumb">?</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <span className="cart-item-name" style={{ textDecoration: 'none' }}>This jersey is no longer available</span>
                        <div className="cart-item-meta" style={{ color: 'var(--alert-color)' }}>Removed from the catalog by the store</div>
                        <div className="cart-item-price">{taka(item.price * item.qty)} × {item.qty}</div>
                      </div>
                      <button
                        className="cart-item-remove"
                        aria-label="Remove unavailable item"
                        onClick={() => removeFromCart(item.slug, item.size)}
                      >
                        <FiTrash2 size={18} />
                      </button>
                    </div>
                  );
                }
                return (
                  <div className="cart-item" key={`${item.slug}-${item.size}`}>
                    <Link to={`/product/${item.slug}`} onClick={() => setCartOpen(false)}>
                      <img src={p.images[0]} alt={p.name} />
                    </Link>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <Link
                        to={`/product/${item.slug}`}
                        className="cart-item-name"
                        onClick={() => setCartOpen(false)}
                      >
                        {p.name}
                      </Link>
                      <div className="cart-item-meta">
                        {item.size ? `Size: ${item.size} · ` : ''}Qty: {item.qty}
                      </div>
                      <div className="cart-item-price">
                        {taka(item.price * item.qty)}
                        {p.originalPrice && (
                          <span style={{ fontSize: 11, color: '#999', textDecoration: 'line-through', marginLeft: 8, fontWeight: 500 }}>
                            {taka(p.originalPrice * item.qty)}
                          </span>
                        )}
                      </div>
                      <div className="qty-ctrl" aria-label="Quantity controls">
                        <button aria-label="Decrease quantity" onClick={() => setQty(item.slug, item.size, item.qty - 1)}>−</button>
                        <span>{item.qty}</span>
                        <button aria-label="Increase quantity" onClick={() => setQty(item.slug, item.size, item.qty + 1)}>+</button>
                      </div>
                    </div>
                    <button
                      className="cart-item-remove"
                      aria-label="Remove item"
                      onClick={() => removeFromCart(item.slug, item.size)}
                    >
                      <FiTrash2 size={18} />
                    </button>
                  </div>
                );
              })}
            </div>

            <div className="cart-footer">
              {savings > 0 && (
                <div className="cart-totals-row" style={{ color: 'var(--success-color)', fontWeight: 700 }}>
                  <span>You save</span>
                  <span>{taka(savings)}</span>
                </div>
              )}
              <div className="cart-totals-row">
                <span>Subtotal</span>
                <span>{taka(subtotal)}</span>
              </div>
              <div className="cart-totals-row">
                <span>Delivery</span>
                <span>{freeDelivery ? 'FREE' : 'Calculated at checkout'}</span>
              </div>
              <div className="cart-totals-row grand">
                <span>Total</span>
                <span>{taka(subtotal)}</span>
              </div>
              {freeDelivery && <p className="delivery-note">✓ Free nationwide delivery applied</p>}
              <button
                className="btn-checkout"
                onClick={() => {
                  setCartOpen(false);
                  navigate('/checkout');
                }}
              >
                <FiShoppingCart /> Checkout Now
              </button>
              <button className="btn-continue" onClick={() => setCartOpen(false)}>
                Continue shopping
              </button>
            </div>
          </>
        )}
      </aside>
    </>
  );
}
