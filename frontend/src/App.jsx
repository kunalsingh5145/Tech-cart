import { useEffect, useMemo, useState } from "react";
import { Search, ShoppingBag, UserRound, LogOut, ShieldCheck, Package, Plus, Minus, X, Boxes, Truck, CheckCircle2 } from "lucide-react";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
const money = (n) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
const fallbackImages = {
  Laptops: "https://images.unsplash.com/photo-1603302576837-37561b2e2302?auto=format&fit=crop&w=900&q=80",
  Phones: "https://images.unsplash.com/photo-1592899677977-9c10ca588bbd?auto=format&fit=crop&w=900&q=80",
  Keyboards: "https://images.unsplash.com/photo-1595225476474-87563907a212?auto=format&fit=crop&w=900&q=80",
  Mice: "https://images.unsplash.com/photo-1527814050087-3793815479db?auto=format&fit=crop&w=900&q=80",
  Audio: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=900&q=80",
  Monitors: "https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?auto=format&fit=crop&w=900&q=80"
};
async function request(path, { token, ...options } = {}) {
  const res = await fetch(`${API}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(options.headers || {}) }
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || "Something went wrong");
  return data;
}



export default function App() {
  const [products, setProducts] = useState([]);
  const [user, setUser] = useState(() => JSON.parse(localStorage.getItem("techcart_user") || "null"));
  const [token, setToken] = useState(() => localStorage.getItem("techcart_token") || "");
  const [cart, setCart] = useState([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [view, setView] = useState("shop");
  const [modal, setModal] = useState("");
  const [form, setForm] = useState({});
  const [address, setAddress] = useState("");
  const [orders, setOrders] = useState([]);
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [adminProducts, setAdminProducts] = useState([]);
  const [adminForm, setAdminForm] = useState({ name: "", category: "Laptops", description: "", price: "", stock: "", image: "" });

  async function loadProducts() {
    try { setProducts(await request("/products")); }
    catch (e) { setNotice(`${e.message}. Is the backend running and MongoDB connected?`); }
  }
  useEffect(() => { loadProducts(); }, []);
  useEffect(() => { if (notice) { const t = setTimeout(() => setNotice(""), 4200); return () => clearTimeout(t); } }, [notice]);

  const categories = ["All", ...new Set(products.map(p => p.category))];
  const filtered = useMemo(() => products.filter(p =>
    (category === "All" || p.category === category) &&
    `${p.name} ${p.description} ${p.category}`.toLowerCase().includes(search.toLowerCase())
  ), [products, category, search]);
  const cartCount = cart.reduce((s, item) => s + item.quantity, 0);
  const total = cart.reduce((s, item) => s + item.price * item.quantity, 0);

  function saveSession(data) {
    localStorage.setItem("techcart_token", data.token);
    localStorage.setItem("techcart_user", JSON.stringify(data.user));
    setToken(data.token); setUser(data.user); setModal(""); setForm({});
    setNotice(`Welcome, ${data.user.name}!`);
  }
  function logout() {
    localStorage.removeItem("techcart_token"); localStorage.removeItem("techcart_user");
    setToken(""); setUser(null); setOrders([]); setView("shop"); setCart([]);
    setNotice("You have logged out.");
  }
  async function submitAuth(e) {
    e.preventDefault(); setBusy(true);
    try {
      const path = modal === "register" ? "/auth/register" : "/auth/login";
      const data = await request(path, { method: "POST", body: JSON.stringify(form) });
      saveSession(data);
    } catch (e) { setNotice(e.message); }
    finally { setBusy(false); }
  }
  function addToCart(product) {
    if (product.stock < 1) return setNotice("This product is currently out of stock.");
    setCart(old => {
      const existing = old.find(x => x._id === product._id);
      if (existing) {
        if (existing.quantity >= product.stock) { setNotice("You've reached the available stock."); return old; }
        return old.map(x => x._id === product._id ? { ...x, quantity: x.quantity + 1 } : x);
      }
      return [...old, { ...product, quantity: 1 }];
    });
    setNotice("Added to your bag.");
  }
  function changeQty(id, delta) {
    const p = products.find(x => x._id === id);
    setCart(old => old.map(x => x._id === id ? { ...x, quantity: Math.min(p?.stock ?? x.quantity, x.quantity + delta) } : x).filter(x => x.quantity > 0));
  }
  async function checkout() {
    if (!user) { setModal("login"); return setNotice("Log in before checking out."); }
    if (!address.trim()) return setNotice("Enter a shipping address.");
    setBusy(true);
    try {
      await request("/orders", { token, method: "POST", body: JSON.stringify({ items: cart.map(x => ({ productId: x._id, quantity: x.quantity })), shippingAddress: address }) });
      setCart([]); setAddress(""); setView("shop"); await loadProducts(); await loadOrders();
      setNotice("Order placed! Payment is pending in this demo.");
    } catch (e) { setNotice(e.message); await loadProducts(); }
    finally { setBusy(false); }
  }
  async function loadOrders() {
    try { setOrders(await request(user?.role === "admin" ? "/orders" : "/orders/mine", { token })); }
    catch (e) { setNotice(e.message); }
  }
  async function openOrders() { await loadOrders(); setView("orders"); }
  async function openAdmin() {
    if (user?.role !== "admin") return setNotice("Admin access required.");
    await loadOrders();
    setAdminProducts(await request("/products", { token }));
    setView("admin");
  }
  async function addProduct(e) {
    e.preventDefault(); setBusy(true);
    try {
      await request("/products", { token, method: "POST", body: JSON.stringify({ ...adminForm, price: Number(adminForm.price), stock: Number(adminForm.stock) }) });
      setAdminForm({ name: "", category: "Laptops", description: "", price: "", stock: "", image: "" });
      setAdminProducts(await request("/products", { token })); await loadProducts();
      setNotice("Product added to inventory.");
    } catch (e) { setNotice(e.message); }
    finally { setBusy(false); }
  }
  async function updateStock(product, delta) {
    const stock = Math.max(0, product.stock + delta);
    try {
      const updated = await request(`/products/${product._id}`, { token, method: "PATCH", body: JSON.stringify({ stock }) });
      setAdminProducts(old => old.map(p => p._id === updated._id ? updated : p)); await loadProducts();
    } catch (e) { setNotice(e.message); }
  }
  async function deleteProduct(id) {
    if (!confirm("Delete this product? Existing order records will remain.")) return;
    try {
      await request(`/products/${id}`, { token, method: "DELETE" });
      setAdminProducts(old => old.filter(p => p._id !== id)); await loadProducts(); setNotice("Product deleted.");
    } catch (e) { setNotice(e.message); }
  }
  async function updateStatus(order, status) {
    try {
      await request(`/orders/${order._id}/status`, { token, method: "PATCH", body: JSON.stringify({ status }) });
      await loadOrders(); setNotice("Order status updated.");
    } catch (e) { setNotice(e.message); }
  }

  return <div className="app-shell">
 
    <div className="announcement">TECH THAT MOVES YOU <span>·</span> Free shipping on demo orders over ₹5,000</div>
    <header className="topbar">
      <button className="brand" onClick={() => setView("shop")}><span className="brand-mark">T</span><span>tech<span className="brand-light">cart</span><small>YOUR NEXT UPGRADE</small></span></button>
      <div className="searchbar"><Search size={18}/><input value={search} onChange={e => { setSearch(e.target.value); setView("shop"); }} placeholder="Search laptops, phones, accessories..." /></div>
      <div className="top-actions">
        {user ? <div className="user-chip"><UserRound size={16}/><span>{user.name.split(" ")[0]}</span></div> : <button className="icon-action" onClick={() => { setModal("login"); setForm({}); }}><UserRound size={19}/><span>Sign in</span></button>}
        <button className="bag-button" onClick={() => setView("cart")}><ShoppingBag size={19}/><span>Bag</span><b>{cartCount}</b></button>
      </div>
    </header>

    <nav className="nav-row">
      <div className="nav-cats">{categories.map(c => <button key={c} className={category === c ? "cat active" : "cat"} onClick={() => { setCategory(c); setView("shop"); }}>{c}</button>)}</div>
      <div className="nav-links">
        {user && <button onClick={openOrders}>My orders</button>}
        {user?.role === "admin" && <button className="admin-link" onClick={openAdmin}><ShieldCheck size={15}/> Admin</button>}
        {user && <button onClick={logout}><LogOut size={15}/> Log out</button>}
      </div>
    </nav>

    {notice && <div className="toast" role="status">{notice}<button onClick={() => setNotice("")}><X size={15}/></button></div>}

    {view === "shop" && <>
      <section className="hero">
        <div className="hero-copy"><div className="eyebrow"><span className="live-dot"/> THE NEXT-GEN TECH STORE</div><h1>Upgrade your<br/><em>everyday.</em></h1><p>Gear that works hard, plays harder, and makes every click count.</p><button className="primary-btn" onClick={() => document.getElementById("catalog")?.scrollIntoView({ behavior: "smooth" })}>Explore collection <span>↗</span></button><div className="hero-stats"><div><b>6+</b><small>Tech categories</small></div><div><b>100%</b><small>Upgrade energy</small></div><div><b>∞</b><small>Possibilities</small></div></div></div>
        <div className="hero-art"><div className="orbit orbit-one"/><div className="orbit orbit-two"/><div className="hero-glow"/><img src="https://images.unsplash.com/photo-1593640408182-31c70c8268f5?auto=format&fit=crop&w=1200&q=85" alt="Premium laptop setup" /><div className="float-card"><span className="float-dot"/> PERFORMANCE MODE <b>ON</b></div><div className="hero-tag">POWER UP <span>↗</span></div></div>
        <div className="hero-index">01 / 04 <span>—</span> DISCOVER</div>
      </section>
      <section className="perks"><div><Package/><span><b>Curated tech</b><small>Products for every setup</small></span></div><div><Truck/><span><b>Order tracking</b><small>Know what happens next</small></span></div><div><ShieldCheck/><span><b>Secure accounts</b><small>Customer & admin access</small></span></div><div><Boxes/><span><b>Live inventory</b><small>Stock updates on purchase</small></span></div></section>
      <main id="catalog" className="catalog section-wrap"><div className="section-heading"><div><div className="eyebrow">THE COLLECTION</div><h2>Find your next <em>favorite.</em></h2></div><span className="result-count">{filtered.length} PRODUCTS</span></div>
        <div className="product-grid">{filtered.map((p, i) => <article className="product-card" key={p._id}><div className="product-image"><img src={p.image || fallbackImages[p.category] || fallbackImages.Laptops} alt={p.name} loading="lazy"/><span className="product-number">0{i + 1}</span><span className={p.stock > 0 ? "stock-pill" : "stock-pill out"}>{p.stock > 0 ? `${p.stock} IN STOCK` : "SOLD OUT"}</span><button className="quick-add" disabled={p.stock < 1} onClick={() => addToCart(p)}><Plus size={18}/></button></div><div className="product-info"><div className="product-category">{p.category}</div><h3>{p.name}</h3><p>{p.description}</p><div className="product-bottom"><b>{money(p.price)}</b><button onClick={() => addToCart(p)} disabled={p.stock < 1}>{p.stock > 0 ? "Add to bag ↗" : "Unavailable"}</button></div></div></article>)}
        {!filtered.length && <div className="empty-state"><ShoppingBag size={28}/><h3>No products found</h3><p>Try another search or category.</p><button className="secondary-btn" onClick={() => { setSearch(""); setCategory("All"); }}>Clear filters</button></div>}</div>
      </main>
    </>}

    {view === "cart" && <main className="section-wrap page-panel"><div className="eyebrow">YOUR SELECTION</div><h2>Your <em>bag.</em></h2>{!cart.length ? <div className="empty-state"><ShoppingBag size={30}/><h3>Your bag is taking a breather.</h3><p>Find something great for your setup.</p><button className="primary-btn" onClick={() => setView("shop")}>Browse products ↗</button></div> : <div className="cart-layout"><div className="cart-list">{cart.map(item => <div className="cart-item" key={item._id}><img src={item.image || fallbackImages[item.category] || fallbackImages.Laptops} alt=""/><div className="cart-item-info"><b>{item.name}</b><small>{money(item.price)} each</small><div className="quantity"><button onClick={() => changeQty(item._id, -1)}><Minus size={14}/></button><span>{item.quantity}</span><button disabled={item.quantity >= item.stock} onClick={() => changeQty(item._id, 1)}><Plus size={14}/></button></div></div><strong>{money(item.price * item.quantity)}</strong><button className="remove" onClick={() => setCart(old => old.filter(x => x._id !== item._id))}><X size={17}/></button></div>)}</div><aside className="checkout-card"><h3>Order summary</h3><div><span>Subtotal</span><b>{money(total)}</b></div><div><span>Shipping</span><b>Free</b></div><div className="summary-total"><span>Total</span><b>{money(total)}</b></div><label>Shipping address<textarea value={address} onChange={e => setAddress(e.target.value)} placeholder="House, street, city, PIN code..." rows="3"/></label><button className="primary-btn full" disabled={busy} onClick={checkout}>{busy ? "Placing order..." : user ? "Place demo order ↗" : "Sign in to checkout ↗"}</button><small className="fine-print">Demo checkout only. No payment is collected.</small></aside></div>}</main>}

    {view === "orders" && <main className="section-wrap page-panel"><div className="eyebrow">ORDER HISTORY</div><h2>{user?.role === "admin" ? "All customer " : "Your "}<em>orders.</em></h2>{orders.length ? <div className="orders-list">{orders.map(o => <OrderCard key={o._id} order={o} admin={user?.role === "admin"} updateStatus={updateStatus}/>)}</div> : <div className="empty-state"><Package size={30}/><h3>No orders yet</h3><p>Your orders will show up here.</p><button className="primary-btn" onClick={() => setView("shop")}>Shop now ↗</button></div>}</main>}

    {view === "admin" && <main className="section-wrap page-panel"><div className="admin-title-row"><div><div className="eyebrow">CONTROL CENTER</div><h2>Store <em>admin.</em></h2></div><button className="secondary-btn" onClick={async () => { await loadOrders(); setAdminProducts(await request("/products", { token })); }}>↻ Refresh data</button></div>
      <div className="admin-stats"><div><span>PRODUCTS</span><b>{adminProducts.length}</b><small>In catalog</small></div><div><span>ORDERS</span><b>{orders.length}</b><small>Customer orders</small></div><div><span>LOW STOCK</span><b>{adminProducts.filter(p => p.stock <= 5).length}</b><small>5 units or fewer</small></div><div><span>REVENUE*</span><b>{money(orders.reduce((s, o) => s + o.total, 0))}</b><small>*Orders placed, not paid</small></div></div>
      <div className="admin-columns"><section className="admin-box"><div className="box-title"><h3><Plus size={17}/> Add a product</h3></div><form className="admin-form" onSubmit={addProduct}><label>Product name<input required value={adminForm.name} onChange={e => setAdminForm({...adminForm, name:e.target.value})} placeholder="e.g. Wireless controller"/></label><div className="form-two"><label>Category<select value={adminForm.category} onChange={e => setAdminForm({...adminForm, category:e.target.value})}>{["Laptops","Phones","Keyboards","Mice","Audio","Monitors","Accessories"].map(c=><option key={c}>{c}</option>)}</select></label><label>Price (₹)<input required type="number" min="0" value={adminForm.price} onChange={e => setAdminForm({...adminForm, price:e.target.value})}/></label></div><div className="form-two"><label>Stock<input required type="number" min="0" step="1" value={adminForm.stock} onChange={e => setAdminForm({...adminForm, stock:e.target.value})}/></label><label>Image URL<input value={adminForm.image} onChange={e => setAdminForm({...adminForm, image:e.target.value})} placeholder="https://..."/></label></div><label>Description<textarea value={adminForm.description} onChange={e => setAdminForm({...adminForm, description:e.target.value})} rows="2"/></label><button className="primary-btn full" disabled={busy}>Save product ↗</button></form></section>
      <section className="admin-box"><div className="box-title"><h3><Boxes size={17}/> Inventory <span>{adminProducts.length} items</span></h3></div><div className="inventory-list">{adminProducts.map(p=><div className="inventory-item" key={p._id}><img src={p.image || fallbackImages[p.category] || fallbackImages.Laptops} alt=""/><div className="inventory-name"><b>{p.name}</b><small>{money(p.price)} · {p.category}</small><span className={p.stock <= 5 ? "low-stock" : "in-stock"}>{p.stock} in stock</span></div><div className="stock-controls"><button onClick={() => updateStock(p,-1)} disabled={p.stock <= 0}><Minus size={13}/></button><button onClick={() => updateStock(p,1)}><Plus size={13}/></button><button className="delete-btn" onClick={() => deleteProduct(p._id)}><X size={14}/></button></div></div>)}</div></section></div>
      <section className="admin-box order-admin"><div className="box-title"><h3><Truck size={17}/> Customer orders <span>{orders.length} total</span></h3></div>{orders.length ? <div className="orders-list">{orders.map(o=><OrderCard key={o._id} order={o} admin updateStatus={updateStatus}/>)}</div> : <div className="empty-inline">No orders yet. Place a test order from a customer account.</div>}</section>
    </main>}

    <footer className="footer"><div className="footer-brand"><span className="brand-mark">T</span><b>techcart</b></div><span>BUILT FOR YOUR NEXT UPGRADE.</span><span>© 2026 TECHCART · LEARNING PROJECT</span></footer>

    {modal && <div className="modal-backdrop" onClick={() => setModal("")}><div className="auth-modal" onClick={e => e.stopPropagation()}><button className="modal-close" onClick={() => setModal("")}><X/></button><div className="brand-mark big">T</div><div className="eyebrow">{modal === "register" ? "JOIN THE COMMUNITY" : "WELCOME BACK"}</div><h2>{modal === "register" ? "Create your account." : "Good to see you."}</h2><p>{modal === "register" ? "Your next favorite piece of tech is waiting." : "Sign in to manage your bag and orders."}</p><form onSubmit={submitAuth}>{modal === "register" && <label>Full name<input required autoComplete="name" value={form.name || ""} onChange={e => setForm({...form,name:e.target.value})} placeholder="Your name"/></label>}<label>Email address<input required type="email" autoComplete="email" value={form.email || ""} onChange={e => setForm({...form,email:e.target.value})} placeholder="you@example.com"/></label><label>Password<input required type="password" minLength={modal === "register" ? 8 : undefined} autoComplete={modal === "register" ? "new-password" : "current-password"} value={form.password || ""} onChange={e => setForm({...form,password:e.target.value})} placeholder={modal === "register" ? "At least 8 characters" : "Your password"}/></label><button className="primary-btn full" disabled={busy}>{busy ? "Please wait..." : modal === "register" ? "Create account ↗" : "Sign in ↗"}</button></form><div className="switch-auth">{modal === "register" ? "Already have an account?" : "New to TechCart?"} <button onClick={() => {setModal(modal === "register" ? "login" : "register");setForm({});}}>{modal === "register" ? "Sign in" : "Create account"}</button></div><small className="auth-note"><ShieldCheck size={13}/> Admins must be created using the backend script.</small></div></div>}
  </div>;
}

function OrderCard({ order, admin, updateStatus }) {
  return <article className="order-card"><div className="order-top"><div><span className="order-id">ORDER #{order._id.slice(-8).toUpperCase()}</span><small>{new Date(order.createdAt).toLocaleString("en-IN")}</small></div><span className={`status status-${order.status}`}>{order.status}</span></div>{admin && <div className="customer-details"><b>{order.customerName}</b><span>{order.customerEmail}</span><span>{order.shippingAddress}</span></div>}<div className="order-items">{order.items.map((it,i)=><div key={i}><span>{it.name} <small>× {it.quantity}</small></span><b>{money(it.price * it.quantity)}</b></div>)}</div><div className="order-bottom"><span>Payment: <b>{order.paymentStatus}</b></span><strong>{money(order.total)}</strong></div>{admin && <div className="status-controls"><label>Update status <select value={order.status} onChange={e => updateStatus(order,e.target.value)}>{["processing","shipped","delivered","cancelled"].map(s=><option key={s}>{s}</option>)}</select></label></div>}</article>;
}
