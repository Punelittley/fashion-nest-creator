import Layout from "@/components/Layout";
import { Mail, Phone, MapPin, Clock } from "lucide-react";

const Contacts = () => {
  return (
    <Layout>
      <div style={{ padding: "4rem 2rem", maxWidth: "1000px", margin: "0 auto" }}>
        <h1 style={{
          fontSize: "3rem",
          fontWeight: "500",
          marginBottom: "1.5rem",
          color: "hsl(var(--foreground))"
        }}>
          Контакты
        </h1>
        <p style={{
          fontSize: "1.125rem",
          color: "hsl(var(--muted-foreground))",
          marginBottom: "3rem"
        }}>
          Свяжитесь с нами любым удобным способом
        </p>

        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: "2rem",
          marginBottom: "4rem"
        }}>
          <div style={{
            padding: "2rem",
            backgroundColor: "hsl(var(--card))",
            boxShadow: "var(--shadow-soft)",
            textAlign: "center"
          }}>
            <div style={{
              display: "inline-flex",
              padding: "1rem",
              backgroundColor: "hsl(var(--secondary))",
              marginBottom: "1.5rem"
            }}>
              <Phone size={32} style={{ color: "hsl(var(--accent))" }} />
            </div>
            <h3 style={{
              fontSize: "1.25rem",
              fontWeight: "500",
              marginBottom: "0.75rem",
              color: "hsl(var(--foreground))"
            }}>
              Телефон
            </h3>
            <p style={{
              color: "hsl(var(--muted-foreground))",
              lineHeight: "1.6"
            }}>
              +7 (999) 123-45-67
            </p>
            <p style={{
              color: "hsl(var(--muted-foreground))",
              fontSize: "0.9rem",
              marginTop: "0.5rem"
            }}>
              Звоните в любое время
            </p>
          </div>

          <div style={{
            padding: "2rem",
            backgroundColor: "hsl(var(--card))",
            boxShadow: "var(--shadow-soft)",
            textAlign: "center"
          }}>
            <div style={{
              display: "inline-flex",
              padding: "1rem",
              backgroundColor: "hsl(var(--secondary))",
              marginBottom: "1.5rem"
            }}>
              <Mail size={32} style={{ color: "hsl(var(--accent))" }} />
            </div>
            <h3 style={{
              fontSize: "1.25rem",
              fontWeight: "500",
              marginBottom: "0.75rem",
              color: "hsl(var(--foreground))"
            }}>
              Email
            </h3>
            <p style={{
              color: "hsl(var(--muted-foreground))",
              lineHeight: "1.6"
            }}>
              info@fashion.ru
            </p>
            <p style={{
              color: "hsl(var(--muted-foreground))",
              fontSize: "0.9rem",
              marginTop: "0.5rem"
            }}>
              Ответим в течение часа
            </p>
          </div>

          <div style={{
            padding: "2rem",
            backgroundColor: "hsl(var(--card))",
            boxShadow: "var(--shadow-soft)",
            textAlign: "center"
          }}>
            <div style={{
              display: "inline-flex",
              padding: "1rem",
              backgroundColor: "hsl(var(--secondary))",
              marginBottom: "1.5rem"
            }}>
              <MapPin size={32} style={{ color: "hsl(var(--accent))" }} />
            </div>
            <h3 style={{
              fontSize: "1.25rem",
              fontWeight: "500",
              marginBottom: "0.75rem",
              color: "hsl(var(--foreground))"
            }}>
              Адрес
            </h3>
            <p style={{
              color: "hsl(var(--muted-foreground))",
              lineHeight: "1.6"
            }}>
              Москва, ул. Модная, 1
            </p>
            <p style={{
              color: "hsl(var(--muted-foreground))",
              fontSize: "0.9rem",
              marginTop: "0.5rem"
            }}>
              БЦ "Стиль", 5 этаж
            </p>
          </div>
        </div>

        <div style={{
          padding: "3rem",
          backgroundColor: "hsl(var(--secondary))"
        }}>
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: "1rem",
            marginBottom: "2rem"
          }}>
            <Clock size={28} style={{ color: "hsl(var(--accent))" }} />
            <h2 style={{
              fontSize: "1.75rem",
              fontWeight: "500",
              color: "hsl(var(--foreground))"
            }}>
              Часы работы
            </h2>
          </div>
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "1.5rem",
            fontSize: "1.05rem",
            color: "hsl(var(--muted-foreground))"
          }}>
            <div>
              <strong style={{ color: "hsl(var(--foreground))" }}>Понедельник - Пятница:</strong>
              <br />10:00 - 21:00
            </div>
            <div>
              <strong style={{ color: "hsl(var(--foreground))" }}>Суббота - Воскресенье:</strong>
              <br />11:00 - 20:00
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Contacts;