
const { useState, useEffect } = React;

// Detect whether this page is the separate admin page.
const isAdminPage = window.location.pathname.toLowerCase().endsWith('/admin.html');

// Global Toast Notification Component
function ToastContainer({ toasts, removeToast }) {
    if (!toasts || toasts.length === 0) return null;
    return (
        <div className="toast-container" aria-live="polite">
            {toasts.map(toast => {
                const icon =
                    toast.type === "success" ? "✓" :
                    toast.type === "error" ? "✕" :
                    toast.type === "warning" ? "⚠" : "ℹ";

                return (
                    <div
                        key={toast.id}
                        className={`toast-item toast-${toast.type} ${toast.isExiting ? "toast-exit" : ""}`}
                        role="alert"
                    >
                        <div className="toast-icon">{icon}</div>
                        <div className="toast-content">
                            {toast.title && <div className="toast-title">{toast.title}</div>}
                            <div className="toast-message">{toast.message}</div>
                        </div>
                        <button
                            type="button"
                            className="toast-close-btn"
                            onClick={() => removeToast(toast.id)}
                            aria-label="Close notification"
                        >
                            ×
                        </button>
                        <div className="toast-progress" style={{ animationDuration: `${toast.duration || 3500}ms` }} />
                    </div>
                );
            })}
        </div>
    );
}

// In-Website Confirmation Dialog Component
function ConfirmDialog({ dialog, setDialog }) {
    if (!dialog || !dialog.isOpen) return null;

    const handleConfirm = () => {
        if (dialog.onConfirm) {
            dialog.onConfirm();
        }
        setDialog(null);
    };

    const handleCancel = () => {
        if (dialog.onCancel) {
            dialog.onCancel();
        }
        setDialog(null);
    };

    return (
        <div className="confirm-modal-backdrop" onClick={handleCancel}>
            <div className="confirm-modal-card" onClick={e => e.stopPropagation()}>
                <div className={`confirm-modal-icon ${dialog.isDanger ? "danger" : ""}`}>
                    {dialog.isDanger ? "⚠" : "ℹ"}
                </div>
                <h3 className="confirm-modal-title">{dialog.title || "Please Confirm"}</h3>
                <p className="confirm-modal-message">{dialog.message}</p>
                <div className="confirm-modal-actions">
                    <button
                        type="button"
                        className="confirm-btn-cancel"
                        onClick={handleCancel}
                    >
                        {dialog.cancelText || "Cancel"}
                    </button>
                    <button
                        type="button"
                        className={`confirm-btn-confirm ${dialog.isDanger ? "danger" : ""}`}
                        onClick={handleConfirm}
                    >
                        {dialog.confirmText || "Confirm"}
                    </button>
                </div>
            </div>
        </div>
    );
}

function App() {
    const [foods, setFoods] = useState([]);
    const [categories, setCategories] = useState([
        "All", "Indian", "Chinese", "Italian"
    ]);

    const [activeCategory, setActiveCategory] = useState("All");
    const [search, setSearch] = useState("");
    const [cart, setCart] = useState([]);
    const [orders, setOrders] = useState([]);
    const [deliveryAddress, setDeliveryAddress] = useState("");
    const [paymentMethod, setPaymentMethod] = useState("UPI");
    const [isDemoPaid, setIsDemoPaid] = useState(false);
    const [navOpen, setNavOpen] = useState(false);

    const [toasts, setToasts] = useState([]);
    const [confirmDialog, setConfirmDialog] = useState(null);

    const removeToast = (id) => {
        setToasts(prev => prev.map(t => t.id === id ? { ...t, isExiting: true } : t));
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, 300);
    };

    const notify = {
        show: (type, message, title = "", duration = 3500) => {
            const id = Date.now() + Math.random().toString(36).substring(2, 9);
            setToasts(prev => [...prev, { id, type, message, title, duration, isExiting: false }]);
            setTimeout(() => {
                setToasts(prev => prev.map(t => t.id === id ? { ...t, isExiting: true } : t));
                setTimeout(() => {
                    setToasts(prev => prev.filter(t => t.id !== id));
                }, 300);
            }, duration);
        },
        success: (msg, title = "Success") => notify.show("success", msg, title),
        error: (msg, title = "Error") => notify.show("error", msg, title),
        warning: (msg, title = "Notice") => notify.show("warning", msg, title),
        info: (msg, title = "Info") => notify.show("info", msg, title)
    };

    const [user, setUser] = useState(null);
    const [showLogin, setShowLogin] = useState(isAdminPage);
    const [loginRole, setLoginRole] = useState("customer");
    const [loginMode, setLoginMode] = useState("login");

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [customerName, setCustomerName] = useState("");

    const [page, setPage] = useState("home");
    const [editingFood, setEditingFood] = useState(null);

    const [foodForm, setFoodForm] = useState({
        name: "",
        category: "Indian",
        type: "Veg",
        description: "",
        price: "",
        image: "assets/indian-food.png",
        tag: "Popular",
        available: true
    });

    // LOAD MENU DATA
    useEffect(() => {
        fetch("./menu.json")
            .then(response => {
                if (!response.ok) {
                    throw new Error("Unable to load menu");
                }
                return response.json();
            })
            .then(data => {
                setFoods(data.foods || []);
                setCategories(data.categories || [
                    "All", "Indian", "Chinese", "Italian"
                ]);
            })
            .catch(error => {
                console.error("Menu loading error:", error);
                notify.error("Unable to load menu data. Please refresh or check connection.", "Menu Error");
            });
    }, []);

    // LOAD ORDERS FROM MONGODB
    useEffect(() => {
        if (!user || !user.token) return;

        const endpoint = user.role === "admin"
            ? "http://localhost:5000/api/orders"
            : "http://localhost:5000/api/orders/my";

        fetch(endpoint, {
            headers: {
                "Authorization": `Bearer ${user.token}`
            }
        })
            .then(response => {
                if (!response.ok) {
                    throw new Error("Unable to load orders");
                }
                return response.json();
            })
            .then(data => {
                setOrders(data.map(order => ({
                    id: order._id,
                    customer: order.customerName,
                    email: order.customerEmail,
                    items: order.items,
                    total: order.total,
                    status: order.status,
                    paymentMethod: order.paymentMethod || "Cash on Delivery (COD)",
                    paymentStatus: order.paymentStatus || "Pending",
                    date: new Date(order.createdAt).toLocaleString(),
                    deliveryAddress: order.deliveryAddress
                })));
            })
            .catch(error => {
                console.error("Order loading error:", error);
                notify.error("Unable to load orders from the server.", "Sync Error");
            });
    }, [user]);

    // FILTER FOOD
    const filteredFoods = foods.filter(food => {
        const categoryMatch =
            activeCategory === "All" ||
            food.category === activeCategory;

        const searchMatch =
            food.name.toLowerCase().includes(search.toLowerCase());

        return categoryMatch && searchMatch && food.available !== false;
    });

    // LOGIN AND REGISTRATION - connected to the Express API
    async function handleLogin(event) {
        event.preventDefault();

        const API_URL = "http://localhost:5000/api/auth";

        try {
            // Public registration always creates a customer account.
            if (!isAdminPage && loginMode === "register") {
                if (!customerName.trim()) {
                    notify.warning("Please enter your name to complete registration.", "Validation Error");
                    return;
                }

                if (!email.includes("@") || password.length < 8) {
                    notify.warning("Enter a valid email address and a password with at least 8 characters.", "Validation Error");
                    return;
                }

                const registerResponse = await fetch(`${API_URL}/register`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        name: customerName.trim(),
                        email: email.trim().toLowerCase(),
                        password
                    })
                });

                const registerData = await registerResponse.json();

                if (!registerResponse.ok) {
                    throw new Error(registerData.message || "Registration failed.");
                }
            }

            // Sign in after registration, or sign in an existing customer/admin.
            const loginResponse = await fetch(`${API_URL}/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    email: email.trim().toLowerCase(),
                    password
                })
            });

            const loginData = await loginResponse.json();

            if (!loginResponse.ok) {
                throw new Error(loginData.message || "Login failed.");
            }

            // The admin page is separate. A customer account cannot enter it.
            if (isAdminPage && loginData.user.role !== "admin") {
                throw new Error("This account is not authorized for admin access.");
            }

            // Verify the JWT and admin role with the protected backend route.
            if (isAdminPage) {
                const dashboardResponse = await fetch("http://localhost:5000/api/admin/dashboard", {
                    method: "GET",
                    headers: {
                        "Authorization": `Bearer ${loginData.token}`,
                        "Content-Type": "application/json"
                    }
                });

                const dashboardData = await dashboardResponse.json();

                if (!dashboardResponse.ok) {
                    throw new Error(dashboardData.message || "Admin authorization failed.");
                }
            }

            if (!isAdminPage && loginData.user.role !== "customer") {
                throw new Error("Please use the separate admin login page.");
            }

            setUser({ ...loginData.user, token: loginData.token });
            setPage(isAdminPage ? "admin" : "home");
            setShowLogin(false);
            setEmail("");
            setPassword("");
            setCustomerName("");

            const successMsg = loginMode === "register" && !isAdminPage
                ? "Your account has been created successfully! Welcome to The Grand Table."
                : (loginData.message || "Login successful! Welcome back.");
            notify.success(successMsg, isAdminPage ? "Admin Authenticated" : "Welcome");

        } catch (error) {
            console.error("Authentication error:", error);
            notify.error(error.message || "Unable to connect to the server. Make sure the backend is running.", "Authentication Failed");
        }
    }

    function logout() {
        const roleLabel = user?.role === "admin" ? "Admin" : "Customer";
        setUser(null);
        setPage(isAdminPage ? "admin" : "home");
        setShowLogin(isAdminPage);
        setCart([]);
        notify.info(`${roleLabel} logged out successfully.`, "Signed Out");
    }

    // ADD FOOD TO CART
    function addToCart(food) {
        if (!user || user.role !== "customer") {
            notify.warning("Please sign in as a customer to order food.", "Sign In Required");
            setLoginRole("customer");
            setLoginMode("login");
            setShowLogin(true);
            return;
        }

        setCart(previous => {
            const existing = previous.find(item => item.id === food.id);

            if (existing) {
                return previous.map(item =>
                    item.id === food.id
                        ? { ...item, quantity: item.quantity + 1 }
                        : item
                );
            }

            return [...previous, { ...food, quantity: 1 }];
        });

        notify.success(`${food.name} added to your cart!`, "Added to Cart");
    }

    function updateQuantity(id, amount) {
        const item = cart.find(i => i.id === id);
        if (item) {
            const nextQty = item.quantity + amount;
            if (nextQty <= 0) {
                notify.info(`"${item.name}" removed from your cart.`, "Cart Updated");
            } else if (amount > 0) {
                notify.info(`Increased "${item.name}" quantity to ${nextQty}.`, "Cart Updated");
            } else {
                notify.info(`Decreased "${item.name}" quantity to ${nextQty}.`, "Cart Updated");
            }
        }
        setCart(previous =>
            previous
                .map(item =>
                    item.id === id
                        ? { ...item, quantity: item.quantity + amount }
                        : item
                )
                .filter(item => item.quantity > 0)
        );
    }

    function clearCart() {
        if (cart.length === 0) {
            notify.warning("Your cart is already empty.", "Cart Empty");
            return;
        }
        setConfirmDialog({
            isOpen: true,
            title: "Empty Shopping Cart",
            message: "Are you sure you want to remove all items from your cart?",
            confirmText: "Empty Cart",
            isDanger: true,
            onConfirm: () => {
                setCart([]);
                notify.info("All items have been removed from your cart.", "Cart Emptied");
            }
        });
    }

    const cartTotal = cart.reduce(
        (total, item) => total + item.price * item.quantity,
        0
    );

    // PLACE ORDER - SAVE TO MONGODB
    async function placeOrder() {
        if (cart.length === 0) {
            notify.warning("Your cart is empty! Please add some delicious dishes first.", "Cart Empty");
            return;
        }

        if (!deliveryAddress.trim()) {
            notify.warning("Please enter your complete delivery address.", "Address Required");
            return;
        }

        try {
            const calculatedPaymentStatus =
                paymentMethod === "Cash on Delivery (COD)"
                    ? "Pending"
                    : isDemoPaid
                        ? "Demo Paid"
                        : "Pending";

            const response = await fetch("http://localhost:5000/api/orders", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${user.token}`
                },
                body: JSON.stringify({
                    items: cart.map(item => ({
                        name: item.name,
                        price: item.price,
                        quantity: item.quantity
                    })),
                    total: cartTotal,
                    deliveryAddress: deliveryAddress.trim(),
                    paymentMethod,
                    paymentStatus: calculatedPaymentStatus
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || "Unable to place order.");
            }

            const savedOrder = {
                id: data.order._id,
                customer: user.name,
                email: user.email,
                items: data.order.items,
                total: data.order.total,
                status: data.order.status,
                paymentMethod: data.order.paymentMethod || paymentMethod,
                paymentStatus: data.order.paymentStatus || calculatedPaymentStatus,
                date: new Date(data.order.createdAt).toLocaleString(),
                deliveryAddress: data.order.deliveryAddress
            };

            setOrders(previous => [...previous, savedOrder]);
            setCart([]);
            setDeliveryAddress("");
            setIsDemoPaid(false);
            setPage("orders");

            notify.success("Your order has been placed and saved successfully!", "Order Confirmed");

        } catch (error) {
            console.error("Order error:", error);
            notify.error(error.message || "Unable to connect to the server.", "Order Failed");
        }
    }

    // ADMIN: ADD OR UPDATE FOOD
    function saveFood(event) {
        event.preventDefault();

        if (!foodForm.name.trim() || !foodForm.price) {
            notify.warning("Please enter food name and price.", "Validation Error");
            return;
        }

        const newFood = {
            ...foodForm,
            id: editingFood ? editingFood.id : Date.now(),
            price: Number(foodForm.price)
        };

        if (editingFood) {
            setFoods(previous =>
                previous.map(food =>
                    food.id === editingFood.id ? newFood : food
                )
            );
        } else {
            setFoods(previous => [...previous, newFood]);
        }

        setEditingFood(null);

        setFoodForm({
            name: "",
            category: "Indian",
            type: "Veg",
            description: "",
            price: "",
            image: "assets/indian-food.png",
            tag: "Popular",
            available: true
        });

        notify.success(
            editingFood ? "Food details updated successfully!" : "New food item added to the menu!",
            editingFood ? "Item Updated" : "Item Added"
        );
    }

    function editFood(food) {
        setEditingFood(food);
        setFoodForm({ ...food });
        setPage("manage");
        notify.info(`Editing details for "${food.name}".`, "Edit Food");
    }

    function deleteFood(id) {
        const targetFood = foods.find(f => f.id === id);
        const foodName = targetFood ? targetFood.name : "this item";
        setConfirmDialog({
            isOpen: true,
            title: "Delete Menu Item",
            message: `Are you sure you want to delete "${foodName}" from the menu? This action cannot be undone.`,
            confirmText: "Delete Item",
            isDanger: true,
            onConfirm: () => {
                setFoods(previous =>
                    previous.filter(food => food.id !== id)
                );
                notify.success(`"${foodName}" was removed from the menu.`, "Item Deleted");
            }
        });
    }

    async function updateOrderStatus(id, status) {
        try {
            const response = await fetch(
                `http://localhost:5000/api/orders/${id}/status`,
                {
                    method: "PATCH",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${user.token}`
                    },
                    body: JSON.stringify({ status })
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || "Unable to update order status");
            }

            setOrders(previous =>
                previous.map(order =>
                    order.id === id
                        ? { ...order, status: data.order.status }
                        : order
                )
            );

            notify.success(`Order #${id} status updated to "${status}".`, "Order Status Updated");

        } catch (error) {
            console.error("Status update error:", error);
            notify.error(error.message || "Failed to update order status.", "Update Failed");
        }
    }

    async function updateOrderPaymentStatus(id, paymentStatus) {
        try {
            const response = await fetch(
                `http://localhost:5000/api/orders/${id}/payment-status`,
                {
                    method: "PATCH",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${user.token}`
                    },
                    body: JSON.stringify({ paymentStatus })
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || "Unable to update payment status");
            }

            setOrders(previous =>
                previous.map(order =>
                    order.id === id
                        ? { ...order, paymentStatus: data.order.paymentStatus }
                        : order
                )
            );

            notify.success(`Order #${id} payment status marked as "${paymentStatus}".`, "Payment Status Updated");

        } catch (error) {
            console.error("Payment status update error:", error);
            notify.error(error.message || "Failed to update payment status.", "Update Failed");
        }
    }


    // COMMON BUTTON STYLE
    const goldButton = {
        background: "#d9b477",
        color: "#24180d",
        border: "none",
        padding: "12px 20px",
        cursor: "pointer",
        fontWeight: "bold",
        borderRadius: "3px"
    };

    const inputStyle = {
        width: "100%",
        maxWidth: "100%",
        boxSizing: "border-box",
        padding: "12px",
        margin: "8px 0 15px",
        border: "1px solid #c9bba5",
        background: "#fffdf9",
        color: "#241b12"
    };

    // LOGIN MODAL
    const loginModal = showLogin && (
        <div className="login-modal-backdrop">
            <div className="login-modal-card" style={{ width: "100%", maxWidth: "480px", boxSizing: "border-box" }}>
                {!isAdminPage && (
                    <button
                        onClick={() => setShowLogin(false)}
                        style={{ float: "right", border: "none", background: "none", fontSize: "23px", cursor: "pointer" }}
                    >×</button>
                )}

                <p className="section-label">THE GRAND TABLE</p>
                <h2 style={{
                    fontFamily: "Georgia, serif",
                    margin: "15px 0"
                }}>
                    {isAdminPage ? "Admin Login" :
                        loginMode === "register" ? "Create Account" : "Welcome Back"}
                </h2>

                <form onSubmit={handleLogin}>
                    {!isAdminPage && loginMode === "register" && (
                        <>
                            <label>Full Name</label>
                            <input
                                style={inputStyle}
                                value={customerName}
                                onChange={e => setCustomerName(e.target.value)}
                                placeholder="Enter your name"
                                required
                            />
                        </>
                    )}

                    <label>Email Address</label>
                    <input
                        type="email"
                        style={inputStyle}
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        placeholder="Enter email"
                        required
                    />

                    <label>Password</label>
                    <input
                        type="password"
                        style={inputStyle}
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        placeholder="Enter password"
                        required
                    />

                    <button type="submit" style={{ ...goldButton, width: "100%" }}>
                        {loginMode === "register" && loginRole === "customer"
                            ? "Register"
                            : "Login"}
                    </button>
                </form>

                {!isAdminPage && (
                    <p style={{ marginTop: "20px", fontSize: "13px" }}>
                        {loginMode === "login"
                            ? "New customer? "
                            : "Already registered? "}

                        <span
                            onClick={() => setLoginMode(
                                loginMode === "login" ? "register" : "login"
                            )}
                            style={{
                                color: "#9c713a",
                                cursor: "pointer",
                                fontWeight: "bold"
                            }}
                        >
                            {loginMode === "login" ? "Create Account" : "Login"}
                        </span>
                    </p>
                )}

                {isAdminPage && (
                    <p style={{ fontSize: "12px", marginTop: "15px", color: "#756d62" }}>
                        
                    </p>
                )}
            </div>
        </div>
    );

    // ADMIN PAGE: separate login screen; no admin controls on the customer website.
    if (isAdminPage && (!user || user.role !== "admin")) {
        return (
            <div style={{
                minHeight: "100vh",
                background: "#17120d",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "20px"
            }}>
                <ToastContainer toasts={toasts} removeToast={removeToast} />
                <ConfirmDialog dialog={confirmDialog} setDialog={setConfirmDialog} />
                {loginModal}
            </div>
        );
    }

    // ADMIN DASHBOARD
    if (isAdminPage && user && user.role === "admin") {
        return (
            <div className="admin-page-container">
                <ToastContainer toasts={toasts} removeToast={removeToast} />
                <ConfirmDialog dialog={confirmDialog} setDialog={setConfirmDialog} />
                {loginModal}

                <header className="admin-header">
                    <h2>THE GRAND TABLE | ADMIN</h2>
                    <button onClick={logout} style={goldButton}>Logout</button>
                </header>

                <h1 style={{ margin: "35px 0 10px", fontFamily: "Georgia, serif" }}>
                    Admin Dashboard
                </h1>
                <p>Welcome, {user.name}</p>

                <div className="admin-stats-grid">
                    {[
                        ["Total Food Items", foods.length],
                        ["Total Orders", orders.length],
                        ["Pending Orders", orders.filter(o => o.status === "Pending").length]
                    ].map((item, index) => (
                        <div key={index} style={{
                            background: "#fffdf9",
                            padding: "25px",
                            border: "1px solid #e5d8c6"
                        }}>
                            <p style={{ color: "#827969" }}>{item[0]}</p>
                            <h2 style={{ color: "#9c713a", marginTop: "10px" }}>{item[1]}</h2>
                        </div>
                    ))}
                </div>

                <div className="admin-nav-buttons">
                    <button style={goldButton} onClick={() => {
                        setPage("manage");
                        setEditingFood(null);
                    }}>Manage Food</button>

                    <button style={goldButton} onClick={() => setPage("admin")}>
                        Dashboard
                    </button>

                    <button style={goldButton} onClick={() => setPage("admin-orders")}>
                        Manage Orders
                    </button>
                </div>

                {page === "admin" && (
                    <div style={{ background: "#fffdf9", padding: "25px" }}>
                        <h2>Restaurant Management</h2>
                        <p style={{ marginTop: "12px" }}>
                            Use Manage Food to add, edit or delete menu items.
                            Use Manage Orders to update customer order status.
                        </p>
                    </div>
                )}

                {page === "manage" && (
                    <div style={{ background: "#fffdf9", padding: "25px" }}>
                        <h2>{editingFood ? "Update Food" : "Add New Food"}</h2>

                        <form onSubmit={saveFood}>
                            <label>Food Name</label>
                            <input
                                style={inputStyle}
                                value={foodForm.name}
                                onChange={e => setFoodForm({ ...foodForm, name: e.target.value })}
                                required
                            />

                            <label>Category</label>
                            <select
                                style={inputStyle}
                                value={foodForm.category}
                                onChange={e => setFoodForm({ ...foodForm, category: e.target.value })}
                            >
                                <option>Indian</option>
                                <option>Chinese</option>
                                <option>Italian</option>
                            </select>

                            <label>Food Type</label>
                            <select
                                style={inputStyle}
                                value={foodForm.type}
                                onChange={e => setFoodForm({ ...foodForm, type: e.target.value })}
                            >
                                <option>Veg</option>
                                <option>Non-Veg</option>
                            </select>

                            <label>Description</label>
                            <textarea
                                style={inputStyle}
                                value={foodForm.description}
                                onChange={e => setFoodForm({ ...foodForm, description: e.target.value })}
                                required
                            />

                            <label>Price (₹)</label>
                            <input
                                type="number"
                                min="1"
                                style={inputStyle}
                                value={foodForm.price}
                                onChange={e => setFoodForm({ ...foodForm, price: e.target.value })}
                                required
                            />

                            <label>Image path</label>
                            <select
                                style={inputStyle}
                                value={foodForm.image}
                                onChange={e => setFoodForm({ ...foodForm, image: e.target.value })}
                            >
                                <option value="assets/indian-food.png">Indian Food</option>
                                <option value="assets/chinese-food.png">Chinese Food</option>
                                <option value="assets/italian-food.png">Italian Food</option>
                            </select>

                            <button type="submit" style={goldButton}>
                                {editingFood ? "Update Food" : "Add Food"}
                            </button>

                            <button
                                type="button"
                                style={{ ...goldButton, marginLeft: "10px", background: "#ddd" }}
                                onClick={() => {
                                    setEditingFood(null);
                                    setPage("admin");
                                    notify.info("Food editing cancelled.", "Food Management");
                                }}
                            >Cancel</button>
                        </form>

                        <h2 style={{ margin: "35px 0 15px" }}>Food Inventory</h2>

                        <div className="admin-table-container">
                            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "500px" }}>
                                <thead>
                                    <tr style={{ background: "#eee8dc" }}>
                                        <th style={{ padding: "12px" }}>Food</th>
                                        <th>Category</th>
                                        <th>Price</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {foods.map(food => (
                                        <tr key={food.id}>
                                            <td style={{ padding: "12px", borderBottom: "1px solid #eee" }}>
                                                {food.name}
                                            </td>
                                            <td>{food.category}</td>
                                            <td>₹{food.price}</td>
                                            <td>
                                                <button onClick={() => editFood(food)}>Edit</button>
                                                {" "}
                                                <button onClick={() => deleteFood(food.id)}>Delete</button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {page === "admin-orders" && (
                    <div style={{ background: "#fffdf9", padding: "25px", overflowX: "auto" }}>
                        <h2>Customer Orders</h2>

                        {orders.length === 0 ? (
                            <p style={{ marginTop: "20px" }}>No orders received yet.</p>
                        ) : (
                            orders.map(order => (
                                <div key={order.id} className="admin-order-card">
                                    <h3>Order #{order.id}</h3>
                                    <p>Customer: {order.customer} ({order.email})</p>
                                    <p>Items: {order.items.map(item =>
                                        `${item.name} x ${item.quantity}`
                                    ).join(", ")}</p>
                                    <p>Order Amount: <strong>₹{order.total}</strong></p>
                                    <p>Payment Method: <strong>{order.paymentMethod || "Cash on Delivery (COD)"}</strong></p>
                                    <p>Payment Status: <strong>{order.paymentStatus || "Pending"}</strong></p>
                                    <p>Order Status: <strong>{order.status}</strong></p>

                                    <div className="admin-order-controls">
                                        <div>
                                            <label style={{ display: "block", fontSize: "13px", fontWeight: "bold", color: "#827969", marginBottom: "4px" }}>
                                                Order Status
                                            </label>
                                            <select
                                                style={inputStyle}
                                                value={order.status}
                                                onChange={e => updateOrderStatus(order.id, e.target.value)}
                                            >
                                                <option>Pending</option>
                                                <option>Preparing</option>
                                                <option>Out for Delivery</option>
                                                <option>Delivered</option>
                                                <option>Cancelled</option>
                                            </select>
                                        </div>

                                        <div>
                                            <label style={{ display: "block", fontSize: "13px", fontWeight: "bold", color: "#827969", marginBottom: "4px" }}>
                                                Payment Status
                                            </label>
                                            <select
                                                style={inputStyle}
                                                value={order.paymentStatus || "Pending"}
                                                onChange={e => updateOrderPaymentStatus(order.id, e.target.value)}
                                            >
                                                <option value="Pending">Pending</option>
                                                <option value="Demo Paid">Demo Paid</option>
                                                <option value="Paid">Paid</option>
                                                <option value="Failed">Failed</option>
                                            </select>
                                        </div>
                                    </div>

                                    {order.paymentMethod === "Cash on Delivery (COD)" && order.paymentStatus !== "Paid" && (
                                        <button
                                            style={{ ...goldButton, padding: "8px 16px", fontSize: "12px", marginTop: "4px" }}
                                            onClick={() => updateOrderPaymentStatus(order.id, "Paid")}
                                        >
                                            Mark COD as Paid (Cash Collected)
                                        </button>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>
        );
    }

    // CUSTOMER ORDERS PAGE
    if (page === "orders") {
        return (
            <div className="orders-page-container">
                <ToastContainer toasts={toasts} removeToast={removeToast} />
                <ConfirmDialog dialog={confirmDialog} setDialog={setConfirmDialog} />
                <button style={goldButton} onClick={() => setPage("home")}>
                    Back to Home
                </button>
                <h1 style={{ margin: "30px 0" }}>My Orders</h1>

                {orders.filter(order => order.email === user?.email).map(order => (
                    <div key={order.id} className="order-card">
                        <h3>Order #{order.id}</h3>
                        <p>{order.items.map(item =>
                            `${item.name} x ${item.quantity}`
                        ).join(", ")}</p>
                        <p>Total: ₹{order.total}</p>
                        <p>Payment Method: <strong>{order.paymentMethod || "Cash on Delivery (COD)"}</strong></p>
                        <p>Payment Status: <strong>{order.paymentStatus || "Pending"}</strong></p>
                        <p>Status: <strong>{order.status}</strong></p>
                    </div>
                ))}
            </div>
        );
    }

    // CUSTOMER CART PAGE
    if (page === "cart") {
        return (
            <div className="cart-page-container">
                <ToastContainer toasts={toasts} removeToast={removeToast} />
                <ConfirmDialog dialog={confirmDialog} setDialog={setConfirmDialog} />
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px", marginBottom: "15px" }}>
                    <button style={goldButton} onClick={() => setPage("home")}>
                        Continue Shopping
                    </button>
                    {cart.length > 0 && (
                        <button
                            type="button"
                            style={{
                                ...goldButton,
                                background: "transparent",
                                border: "1px solid rgba(36, 24, 13, 0.35)",
                                color: "#24180d"
                            }}
                            onClick={clearCart}
                        >
                            Empty Cart
                        </button>
                    )}
                </div>

                <h1 style={{ margin: "20px 0 30px" }}>Your Shopping Cart</h1>

                {cart.length === 0 ? (
                    <p>Your cart is empty.</p>
                ) : (
                    <>
                        {cart.map(item => (
                            <div key={item.id} className="cart-item-card">
                                <div>
                                    <h3>{item.name}</h3>
                                    <p>₹{item.price}</p>
                                </div>

                                <div style={{ display: "flex", alignItems: "center" }}>
                                    <button className="cart-qty-btn" onClick={() => updateQuantity(item.id, -1)} aria-label="Decrease quantity">−</button>
                                    <span style={{ margin: "0 14px", fontWeight: "bold", minWidth: "24px", display: "inline-block", textAlign: "center" }}>{item.quantity}</span>
                                    <button className="cart-qty-btn" onClick={() => updateQuantity(item.id, 1)} aria-label="Increase quantity">+</button>
                                </div>
                            </div>
                        ))}

                        <h2 style={{ margin: "25px 0" }}>Total: ₹{cartTotal}</h2>
                        <label>Delivery Address</label>

<textarea
    style={inputStyle}
    rows="3"
    placeholder="Enter your complete delivery address"
    value={deliveryAddress}
    onChange={e => setDeliveryAddress(e.target.value)}
/>

                        <div style={{ marginTop: "20px", marginBottom: "25px" }}>
                            <label style={{ display: "block", marginBottom: "10px", fontWeight: "bold" }}>
                                Payment Method
                            </label>

                            <div className="payment-methods-grid">
                                {[
                                    "UPI",
                                    "Credit/Debit Card",
                                    "Net Banking",
                                    "Cash on Delivery (COD)"
                                ].map(method => (
                                    <label
                                        key={method}
                                        className="payment-card-option"
                                        style={{
                                            border: paymentMethod === method ? "2px solid #9c713a" : "1px solid #c9bba5",
                                            fontWeight: paymentMethod === method ? "bold" : "normal"
                                        }}
                                    >
                                        <input
                                            type="radio"
                                            name="paymentMethod"
                                            value={method}
                                            checked={paymentMethod === method}
                                            onChange={() => {
                                                setPaymentMethod(method);
                                                setIsDemoPaid(false);
                                                notify.info(`Payment method set to ${method}.`, "Payment Selection");
                                            }}
                                            style={{ accentColor: "#9c713a" }}
                                        />
                                        <span>{method}</span>
                                    </label>
                                ))}
                            </div>

                            {paymentMethod === "UPI" && (
                                <div style={{
                                    background: "#fffdf9",
                                    border: "1px solid #c9bba5",
                                    padding: "20px",
                                    borderRadius: "4px",
                                    marginBottom: "15px",
                                    textAlign: "center"
                                }}>
                                    <div style={{
                                        display: "inline-block",
                                        background: "#fff3cd",
                                        border: "1px solid #ffeeba",
                                        color: "#856404",
                                        padding: "6px 14px",
                                        borderRadius: "3px",
                                        fontSize: "12px",
                                        fontWeight: "bold",
                                        letterSpacing: "1px",
                                        marginBottom: "10px"
                                    }}>
                                        DEMO PAYMENT ONLY
                                    </div>
                                    <p style={{ fontSize: "13px", color: "#666", marginBottom: "15px" }}>
                                        This is a demonstration QR code for testing purposes only. It does not transfer or verify real money.
                                    </p>

                                    <div style={{
                                        display: "inline-block",
                                        padding: "15px",
                                        background: "#ffffff",
                                        border: "1px solid #e5d8c6",
                                        borderRadius: "4px",
                                        boxShadow: "0 2px 6px rgba(0,0,0,0.05)"
                                    }}>
                                        <svg width="160" height="160" viewBox="0 0 160 160" style={{ display: "block" }}>
                                            <rect width="160" height="160" fill="#ffffff" />
                                            {/* Finder Pattern Top-Left */}
                                            <rect x="12" y="12" width="40" height="40" fill="none" stroke="#17120d" strokeWidth="6" />
                                            <rect x="22" y="22" width="20" height="20" fill="#17120d" />
                                            {/* Finder Pattern Top-Right */}
                                            <rect x="108" y="12" width="40" height="40" fill="none" stroke="#17120d" strokeWidth="6" />
                                            <rect x="118" y="22" width="20" height="20" fill="#17120d" />
                                            {/* Finder Pattern Bottom-Left */}
                                            <rect x="12" y="108" width="40" height="40" fill="none" stroke="#17120d" strokeWidth="6" />
                                            <rect x="22" y="118" width="20" height="20" fill="#17120d" />
                                            {/* Data Pattern Modules */}
                                            <rect x="58" y="16" width="8" height="8" fill="#17120d" />
                                            <rect x="74" y="16" width="8" height="8" fill="#17120d" />
                                            <rect x="90" y="16" width="8" height="8" fill="#17120d" />
                                            <rect x="16" y="58" width="8" height="8" fill="#17120d" />
                                            <rect x="16" y="74" width="8" height="8" fill="#17120d" />
                                            <rect x="16" y="90" width="8" height="8" fill="#17120d" />
                                            <rect x="58" y="58" width="8" height="8" fill="#17120d" />
                                            <rect x="74" y="58" width="8" height="8" fill="#17120d" />
                                            <rect x="90" y="58" width="8" height="8" fill="#17120d" />
                                            <rect x="106" y="58" width="8" height="8" fill="#17120d" />
                                            <rect x="122" y="58" width="8" height="8" fill="#17120d" />
                                            <rect x="138" y="58" width="8" height="8" fill="#17120d" />
                                            <rect x="58" y="74" width="8" height="8" fill="#17120d" />
                                            <rect x="94" y="74" width="8" height="8" fill="#17120d" />
                                            <rect x="138" y="74" width="8" height="8" fill="#17120d" />
                                            <rect x="58" y="90" width="8" height="8" fill="#17120d" />
                                            <rect x="74" y="90" width="8" height="8" fill="#17120d" />
                                            <rect x="106" y="90" width="8" height="8" fill="#17120d" />
                                            <rect x="122" y="90" width="8" height="8" fill="#17120d" />
                                            <rect x="58" y="106" width="8" height="8" fill="#17120d" />
                                            <rect x="90" y="106" width="8" height="8" fill="#17120d" />
                                            <rect x="106" y="106" width="8" height="8" fill="#17120d" />
                                            <rect x="138" y="106" width="8" height="8" fill="#17120d" />
                                            <rect x="58" y="122" width="8" height="8" fill="#17120d" />
                                            <rect x="74" y="122" width="8" height="8" fill="#17120d" />
                                            <rect x="90" y="122" width="8" height="8" fill="#17120d" />
                                            <rect x="122" y="122" width="8" height="8" fill="#17120d" />
                                            <rect x="58" y="138" width="8" height="8" fill="#17120d" />
                                            <rect x="90" y="138" width="8" height="8" fill="#17120d" />
                                            <rect x="106" y="138" width="8" height="8" fill="#17120d" />
                                            <rect x="138" y="138" width="8" height="8" fill="#17120d" />
                                            {/* Center Badge */}
                                            <rect x="60" y="68" width="40" height="24" rx="4" fill="#f7f3eb" stroke="#9c713a" strokeWidth="1.5" />
                                            <text x="80" y="84" textAnchor="middle" fontSize="10" fontWeight="bold" fill="#24180d" fontFamily="sans-serif">DEMO</text>
                                        </svg>
                                        <p style={{ fontSize: "11px", color: "#827969", marginTop: "8px", fontWeight: "bold" }}>
                                            Scan to simulate UPI payment of ₹{cartTotal}
                                        </p>
                                    </div>

                                    <div style={{ marginTop: "15px" }}>
                                        <button
                                            type="button"
                                            style={{
                                                ...goldButton,
                                                background: isDemoPaid ? "#2e7d32" : "#d9b477",
                                                color: isDemoPaid ? "#ffffff" : "#24180d"
                                            }}
                                            onClick={() => {
                                                setIsDemoPaid(true);
                                                notify.success("Demo UPI payment simulated! Payment status recorded as 'Demo Paid'. Click 'Place Order' to finish.", "Demo Payment Recorded");
                                            }}
                                        >
                                            {isDemoPaid ? "✓ Demo Payment Completed (Demo Paid)" : "I've Paid (Demo)"}
                                        </button>
                                        {isDemoPaid && (
                                            <p style={{ color: "#2e7d32", fontSize: "13px", fontWeight: "bold", marginTop: "8px" }}>
                                                ✓ Simulated payment status: Demo Paid. Now click Place Order.
                                            </p>
                                        )}
                                    </div>
                                </div>
                            )}

                            {paymentMethod === "Credit/Debit Card" && (
                                <div style={{
                                    background: "#fffdf9",
                                    border: "1px solid #c9bba5",
                                    padding: "20px",
                                    borderRadius: "4px",
                                    marginBottom: "15px"
                                }}>
                                    <div style={{
                                        display: "inline-block",
                                        background: "#fff3cd",
                                        border: "1px solid #ffeeba",
                                        color: "#856404",
                                        padding: "6px 14px",
                                        borderRadius: "3px",
                                        fontSize: "12px",
                                        fontWeight: "bold",
                                        letterSpacing: "1px",
                                        marginBottom: "10px"
                                    }}>
                                        DEMO PAYMENT ONLY
                                    </div>
                                    <p style={{ fontSize: "13px", color: "#666", marginBottom: "15px" }}>
                                        Simulated card payment. No real credit or debit card transaction will be processed.
                                    </p>

                                    <div style={{ maxWidth: "420px" }}>
                                        <label style={{ display: "block", fontSize: "13px", marginBottom: "4px" }}>Card Number (Demo)</label>
                                        <input
                                            style={inputStyle}
                                            readOnly
                                            value="4242 •••• •••• 4242 (Demo Card)"
                                        />

                                        <div style={{ display: "flex", gap: "10px" }}>
                                            <div style={{ flex: 1 }}>
                                                <label style={{ display: "block", fontSize: "13px", marginBottom: "4px" }}>Expiry (Demo)</label>
                                                <input style={inputStyle} value="12/28" readOnly />
                                            </div>
                                            <div style={{ flex: 1 }}>
                                                <label style={{ display: "block", fontSize: "13px", marginBottom: "4px" }}>CVV (Demo)</label>
                                                <input style={inputStyle} value="•••" readOnly />
                                            </div>
                                        </div>

                                        <button
                                            type="button"
                                            style={{
                                                ...goldButton,
                                                background: isDemoPaid ? "#2e7d32" : "#d9b477",
                                                color: isDemoPaid ? "#ffffff" : "#24180d"
                                            }}
                                            onClick={() => {
                                                setIsDemoPaid(true);
                                                notify.success("Demo card payment simulated! Payment status recorded as 'Demo Paid'. Click 'Place Order' to finish.", "Demo Payment Recorded");
                                            }}
                                        >
                                            {isDemoPaid ? "✓ Demo Payment Completed (Demo Paid)" : "I've Paid (Demo)"}
                                        </button>
                                        {isDemoPaid && (
                                            <p style={{ color: "#2e7d32", fontSize: "13px", fontWeight: "bold", marginTop: "8px" }}>
                                                ✓ Simulated payment status: Demo Paid. Now click Place Order.
                                            </p>
                                        )}
                                    </div>
                                </div>
                            )}

                            {paymentMethod === "Net Banking" && (
                                <div style={{
                                    background: "#fffdf9",
                                    border: "1px solid #c9bba5",
                                    padding: "20px",
                                    borderRadius: "4px",
                                    marginBottom: "15px"
                                }}>
                                    <div style={{
                                        display: "inline-block",
                                        background: "#fff3cd",
                                        border: "1px solid #ffeeba",
                                        color: "#856404",
                                        padding: "6px 14px",
                                        borderRadius: "3px",
                                        fontSize: "12px",
                                        fontWeight: "bold",
                                        letterSpacing: "1px",
                                        marginBottom: "10px"
                                    }}>
                                        DEMO PAYMENT ONLY
                                    </div>
                                    <p style={{ fontSize: "13px", color: "#666", marginBottom: "15px" }}>
                                        Simulated net banking payment. No real bank transfer will be performed.
                                    </p>

                                    <div style={{ maxWidth: "420px" }}>
                                        <label style={{ display: "block", fontSize: "13px", marginBottom: "4px" }}>Select Bank (Demo)</label>
                                        <select style={inputStyle}>
                                            <option>State Bank of India (Demo)</option>
                                            <option>HDFC Bank (Demo)</option>
                                            <option>ICICI Bank (Demo)</option>
                                            <option>Axis Bank (Demo)</option>
                                            <option>Kotak Mahindra Bank (Demo)</option>
                                        </select>

                                        <button
                                            type="button"
                                            style={{
                                                ...goldButton,
                                                background: isDemoPaid ? "#2e7d32" : "#d9b477",
                                                color: isDemoPaid ? "#ffffff" : "#24180d"
                                            }}
                                            onClick={() => {
                                                setIsDemoPaid(true);
                                                notify.success("Demo net banking payment simulated! Payment status recorded as 'Demo Paid'. Click 'Place Order' to finish.", "Demo Payment Recorded");
                                            }}
                                        >
                                            {isDemoPaid ? "✓ Demo Payment Completed (Demo Paid)" : "I've Paid (Demo)"}
                                        </button>
                                        {isDemoPaid && (
                                            <p style={{ color: "#2e7d32", fontSize: "13px", fontWeight: "bold", marginTop: "8px" }}>
                                                ✓ Simulated payment status: Demo Paid. Now click Place Order.
                                            </p>
                                        )}
                                    </div>
                                </div>
                            )}

                            {paymentMethod === "Cash on Delivery (COD)" && (
                                <div style={{
                                    background: "#fffdf9",
                                    border: "1px solid #c9bba5",
                                    padding: "16px 20px",
                                    borderRadius: "4px",
                                    marginBottom: "15px"
                                }}>
                                    <p style={{ fontSize: "14px", color: "#241b12", margin: 0 }}>
                                        <strong>Cash on Delivery (COD):</strong> Please pay the amount of <strong>₹{cartTotal}</strong> in cash upon delivery.
                                        Your order payment status will automatically be set to <strong>Pending</strong> until cash is collected by the delivery staff.
                                    </p>
                                </div>
                            )}
                        </div>

                        <button style={goldButton} onClick={placeOrder} className="place-order-btn">
                            Place Order
                        </button>
                    </>
                )}
            </div>
        );
    }

    // MAIN CUSTOMER WEBSITE
    return (
        <>
            <ToastContainer toasts={toasts} removeToast={removeToast} />
            <ConfirmDialog dialog={confirmDialog} setDialog={setConfirmDialog} />
            {loginModal}

            <nav className="navbar">
                <a href="#home" className="brand" onClick={() => setNavOpen(false)}>
                    <div className="brand-emblem">
                        <span>GT</span>
                    </div>
                    <div className="brand-name">
                        <h2>THE GRAND TABLE</h2>
                        <span>FIVE STAR DINING</span>
                    </div>
                </a>

                <div className={`nav-links ${navOpen ? "open" : ""}`}>
                    <a href="#home" onClick={() => setNavOpen(false)}>Home</a>
                    <a href="#menu" onClick={() => setNavOpen(false)}>Menu</a>
                    <a href="#experience" onClick={() => setNavOpen(false)}>Experience</a>
                    <a href="#about" onClick={() => setNavOpen(false)}>About</a>
                    <a href="#contact" onClick={() => setNavOpen(false)}>Contact</a>

                    <div className="nav-mobile-auth">
                        {user ? (
                            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                                <span style={{ color: "#f5e7cf", fontSize: "13px" }}>
                                    Signed in as <strong>{user.name}</strong>
                                </span>
                                <button style={goldButton} onClick={() => { logout(); setNavOpen(false); }}>
                                    Logout
                                </button>
                            </div>
                        ) : (
                            <button
                                className="nav-button mobile-auth-btn"
                                onClick={() => { setShowLogin(true); setNavOpen(false); }}
                            >
                                Login / Register
                            </button>
                        )}
                    </div>
                </div>

                <div className="nav-actions">
                    {user ? (
                        <div className="nav-user-desktop" style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                            <span style={{ color: "#f5e7cf", fontSize: "12px" }}>
                                Hi, {user.name}
                            </span>
                            <button style={goldButton} onClick={logout}>Logout</button>
                        </div>
                    ) : (
                        <button
                            className="nav-button nav-login-desktop"
                            onClick={() => setShowLogin(true)}
                        >Login / Register</button>
                    )}

                    <button
                        className="nav-button nav-cart-btn"
                        onClick={() => { setPage("cart"); setNavOpen(false); }}
                    >
                        Cart ({cart.reduce((sum, item) => sum + item.quantity, 0)})
                    </button>

                    <button
                        className="mobile-toggle"
                        onClick={() => setNavOpen(!navOpen)}
                        aria-label="Toggle navigation menu"
                    >
                        {navOpen ? "✕" : "☰"}
                    </button>
                </div>
            </nav>

            <section className="hero" id="home">
                <div className="hero-overlay"></div>

                <div className="hero-content">
                    <p className="eyebrow">✦ AN EXTRAORDINARY DINING EXPERIENCE</p>

                    <h1>
                        Taste the Art<br />
                        of <em>Fine Dining.</em>
                    </h1>

                    <p className="hero-description">
                        Discover exceptional flavours from India, China and Italy,
                        thoughtfully crafted for an unforgettable dining experience.
                    </p>

                    <div className="hero-buttons">
                        <a href="#menu" className="gold-button">
                            Discover Our Menu →
                        </a>
                        <a href="#about" className="outline-button">
                            Our Story
                        </a>
                    </div>

                    <div className="hero-rating">
                        <span>★★★★★</span>
                        <p>A WORLD OF FLAVOUR. A STANDARD OF EXCELLENCE.</p>
                    </div>
                </div>

                <p className="hero-bottom-label">
                    A CELEBRATION OF TASTE
                </p>
            </section>

            <section className="intro" id="experience">
                <p className="section-label">THE GRAND EXPERIENCE</p>
                <h2>Where Every Meal Becomes a Memory</h2>
                <p>
                    An exquisite collection of world cuisines, created with passion,
                    precision and the finest ingredients.
                </p>
                <div className="intro-divider">✦ ───────── ✦</div>
            </section>

            <section className="cuisine-section">
                <div className="cuisine-grid">
                    {[
                        ["01 / TRADITIONAL", "Indian Cuisine", "indian", "Indian"],
                        ["02 / AUTHENTIC", "Chinese Cuisine", "chinese", "Chinese"],
                        ["03 / CLASSIC", "Italian Cuisine", "italian", "Italian"]
                    ].map((item, index) => (
                        <div className={`cuisine-card ${item[2]}`} key={index}>
                            <div>
                                <span>{item[0]}</span>
                                <h3>{item[1]}</h3>
                                <button onClick={() => {
                                    setActiveCategory(item[3]);
                                    document.getElementById("menu").scrollIntoView();
                                }}>
                                    Explore ↗
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            <section className="menu-section" id="menu">
                <div className="menu-heading">
                    <p className="section-label">OUR SIGNATURE COLLECTION</p>
                    <h2>Discover Our Menu</h2>
                    <p>Carefully prepared dishes for unforgettable moments.</p>
                </div>

                <div className="menu-controls">
                    <div className="category-tabs">
                        {categories.map(category => (
                            <button
                                key={category}
                                className={`category-btn ${activeCategory === category ? "active" : ""}`}
                                onClick={() => setActiveCategory(category)}
                            >
                                {category}
                            </button>
                        ))}
                    </div>

                    <input
                        className="search-box"
                        placeholder="Search your favourite food..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>

                <div className="food-grid">
                    {filteredFoods.map(food => {
                        const cartItem = cart.find(item => item.id === food.id);
                        const quantity = cartItem ? cartItem.quantity : 0;

                        return (
                            <div className="food-card" key={food.id}>
                                <div className="food-image">
                                    <img src={food.image} alt={food.name} />
                                    <span className="food-tag">{food.tag}</span>
                                </div>

                                <div className="food-details">
                                    <div className="food-meta">
                                        <span className={food.type === "Veg" ? "veg-dot" : "nonveg-dot"}></span>
                                        {food.type}
                                        <span className="food-category">{food.category}</span>
                                    </div>

                                    <h3>{food.name}</h3>
                                    <p>{food.description}</p>

                                    <div className="food-bottom">
                                        <strong>₹{food.price}</strong>
                                        {quantity > 0 ? (
                                            <div className="food-qty-selector">
                                                <button
                                                    type="button"
                                                    className="food-qty-btn"
                                                    onClick={() => updateQuantity(food.id, -1)}
                                                    aria-label={`Decrease ${food.name} quantity`}
                                                >
                                                    −
                                                </button>
                                                <span className="food-qty-value">
                                                    {quantity}
                                                </span>
                                                <button
                                                    type="button"
                                                    className="food-qty-btn"
                                                    onClick={() => updateQuantity(food.id, 1)}
                                                    aria-label={`Increase ${food.name} quantity`}
                                                >
                                                    +
                                                </button>
                                            </div>
                                        ) : (
                                            <button
                                                type="button"
                                                style={goldButton}
                                                onClick={() => addToCart(food)}
                                            >
                                                Add to Cart +
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {filteredFoods.length === 0 && (
                    <div className="empty-state">
                        No food items found.
                    </div>
                )}

                <p className="menu-note">
                    All prices are in Indian Rupees (₹).
                </p>
            </section>

            <section className="about-section" id="about">
                <div className="about-image"></div>

                <div className="about-content">
                    <p className="section-label">OUR PHILOSOPHY</p>
                    <h2>Crafted With Passion. Served With Elegance.</h2>
                    <p>
                        At The Grand Table, dining is more than just a meal.
                        It is a celebration of culinary artistry, exceptional
                        hospitality and unforgettable moments.
                    </p>

                    <div className="about-points">
                        <div><strong>01</strong><span>Expert Master Chefs</span></div>
                        <div><strong>02</strong><span>Premium Ingredients</span></div>
                        <div><strong>03</strong><span>Exceptional Hospitality</span></div>
                    </div>
                </div>
            </section>

            <footer className="footer" id="contact">
                <div className="footer-brand">
                    <div className="footer-emblem">GT</div>
                    <h2>THE GRAND TABLE</h2>
                    <p>FIVE STAR DINING</p>
                </div>

                <div className="footer-text">
                    <p>A celebration of taste, crafted for you.</p>
                    <span>INDIAN · CHINESE · ITALIAN</span>
                </div>

                <div className="footer-bottom">
                    <span>© 2026 THE GRAND TABLE</span>
                    <span>EXPERIENCE THE ART OF FINE DINING</span>
                </div>
            </footer>
        </>
    );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
