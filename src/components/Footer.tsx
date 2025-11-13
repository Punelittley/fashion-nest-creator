import { Link } from "react-router-dom";

const Footer = () => {
  return (
    <footer style={{
      backgroundColor: "hsl(var(--primary))",
      color: "hsl(var(--primary-foreground))",
      marginTop: "auto",
      padding: "3rem 2rem 2rem"
    }}>
      <div style={{
        maxWidth: "1400px",
        margin: "0 auto",
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
        gap: "3rem"
      }}>
        <div>
          <h3 style={{
            fontSize: "1.25rem",
            fontWeight: "600",
            marginBottom: "1rem",
            letterSpacing: "0.05em"
          }}>siaodqq</h3>
          <p style={{
            color: "hsl(var(--primary-foreground) / 0.8)",
            lineHeight: "1.6"
          }}>
            Современный магазин одежды с эксклюзивными коллекциями и быстрой доставкой.
          </p>
        </div>

        <div>
          <h4 style={{
            fontSize: "1rem",
            fontWeight: "600",
            marginBottom: "1rem"
          }}>Каталог</h4>
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            <li style={{ marginBottom: "0.5rem" }}>
              <Link to="/catalog" style={{
                color: "hsl(var(--primary-foreground) / 0.8)",
                textDecoration: "none",
                transition: "var(--transition)"
              }}>Все товары</Link>
            </li>
            <li style={{ marginBottom: "0.5rem" }}>
              <Link to="/catalog?category=coats" style={{
                color: "hsl(var(--primary-foreground) / 0.8)",
                textDecoration: "none",
                transition: "var(--transition)"
              }}>Пальто</Link>
            </li>
            <li style={{ marginBottom: "0.5rem" }}>
              <Link to="/catalog?category=pants" style={{
                color: "hsl(var(--primary-foreground) / 0.8)",
                textDecoration: "none",
                transition: "var(--transition)"
              }}>Брюки</Link>
            </li>
            <li style={{ marginBottom: "0.5rem" }}>
              <Link to="/catalog?category=shoes" style={{
                color: "hsl(var(--primary-foreground) / 0.8)",
                textDecoration: "none",
                transition: "var(--transition)"
              }}>Обувь</Link>
            </li>
          </ul>
        </div>

        <div>
          <h4 style={{
            fontSize: "1rem",
            fontWeight: "600",
            marginBottom: "1rem"
          }}>Информация</h4>
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            <li style={{ marginBottom: "0.5rem" }}>
              <Link to="/about" style={{
                color: "hsl(var(--primary-foreground) / 0.8)",
                textDecoration: "none",
                transition: "var(--transition)"
              }}>О нас</Link>
            </li>
            <li style={{ marginBottom: "0.5rem" }}>
              <Link to="/delivery" style={{
                color: "hsl(var(--primary-foreground) / 0.8)",
                textDecoration: "none",
                transition: "var(--transition)"
              }}>Доставка</Link>
            </li>
            <li style={{ marginBottom: "0.5rem" }}>
              <Link to="/contacts" style={{
                color: "hsl(var(--primary-foreground) / 0.8)",
                textDecoration: "none",
                transition: "var(--transition)"
              }}>Контакты</Link>
            </li>
            <li style={{ marginBottom: "0.5rem" }}>
              <Link to="/support" style={{
                color: "hsl(var(--primary-foreground) / 0.8)",
                textDecoration: "none",
                transition: "var(--transition)"
              }}>Поддержка</Link>
            </li>
          </ul>
        </div>

        <div>
          <h4 style={{
            fontSize: "1rem",
            fontWeight: "600",
            marginBottom: "1rem"
          }}>Личный кабинет</h4>
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            <li style={{ marginBottom: "0.5rem" }}>
              <Link to="/profile" style={{
                color: "hsl(var(--primary-foreground) / 0.8)",
                textDecoration: "none",
                transition: "var(--transition)"
              }}>Профиль</Link>
            </li>
            <li style={{ marginBottom: "0.5rem" }}>
              <Link to="/orders" style={{
                color: "hsl(var(--primary-foreground) / 0.8)",
                textDecoration: "none",
                transition: "var(--transition)"
              }}>Заказы</Link>
            </li>
            <li style={{ marginBottom: "0.5rem" }}>
              <Link to="/wishlist" style={{
                color: "hsl(var(--primary-foreground) / 0.8)",
                textDecoration: "none",
                transition: "var(--transition)"
              }}>Избранное</Link>
            </li>
            <li style={{ marginBottom: "0.5rem" }}>
              <Link to="/cart" style={{
                color: "hsl(var(--primary-foreground) / 0.8)",
                textDecoration: "none",
                transition: "var(--transition)"
              }}>Корзина</Link>
            </li>
          </ul>
        </div>
      </div>

      <div style={{
        maxWidth: "1400px",
        margin: "0 auto",
        marginTop: "2rem",
        paddingTop: "2rem",
        borderTop: "1px solid hsl(var(--primary-foreground) / 0.2)",
        textAlign: "center",
        color: "hsl(var(--primary-foreground) / 0.6)",
        fontSize: "0.9rem"
      }}>
        © 2025 siaodqq. Все права защищены.
      </div>
    </footer>
  );
};

export default Footer;