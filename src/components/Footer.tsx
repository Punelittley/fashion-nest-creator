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
          }}>FASHION</h3>
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
          }}>Навигация</h4>
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            <li style={{ marginBottom: "0.5rem" }}>
              <Link to="/catalog" style={{
                color: "hsl(var(--primary-foreground) / 0.8)",
                textDecoration: "none",
                transition: "var(--transition)"
              }}>Каталог</Link>
            </li>
            <li style={{ marginBottom: "0.5rem" }}>
              <Link to="/about" style={{
                color: "hsl(var(--primary-foreground) / 0.8)",
                textDecoration: "none",
                transition: "var(--transition)"
              }}>О нас</Link>
            </li>
            <li style={{ marginBottom: "0.5rem" }}>
              <Link to="/profile" style={{
                color: "hsl(var(--primary-foreground) / 0.8)",
                textDecoration: "none",
                transition: "var(--transition)"
              }}>Личный кабинет</Link>
            </li>
          </ul>
        </div>

        <div>
          <h4 style={{
            fontSize: "1rem",
            fontWeight: "600",
            marginBottom: "1rem"
          }}>Контакты</h4>
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            <li style={{
              color: "hsl(var(--primary-foreground) / 0.8)",
              marginBottom: "0.5rem"
            }}>
              Email: info@fashion.ru
            </li>
            <li style={{
              color: "hsl(var(--primary-foreground) / 0.8)",
              marginBottom: "0.5rem"
            }}>
              Телефон: +7 (999) 123-45-67
            </li>
            <li style={{
              color: "hsl(var(--primary-foreground) / 0.8)",
              marginBottom: "0.5rem"
            }}>
              Адрес: Москва, ул. Модная, 1
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
        © 2025 FASHION. Все права защищены.
      </div>
    </footer>
  );
};

export default Footer;