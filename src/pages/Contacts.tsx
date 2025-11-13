import Layout from "@/components/Layout";
import { Mail, Phone, MapPin, Clock, Send } from "lucide-react";

const Contacts = () => {
  return (
    <Layout>
      <div style={{ 
        minHeight: "80vh",
        background: "linear-gradient(135deg, hsl(var(--secondary)) 0%, hsl(var(--background)) 100%)"
      }}>
        {/* Hero Section */}
        <div style={{
          padding: "4rem 2rem 2rem",
          textAlign: "center",
          maxWidth: "800px",
          margin: "0 auto"
        }}>
          <h1 style={{
            fontSize: "3.5rem",
            fontWeight: "600",
            marginBottom: "1rem",
            color: "hsl(var(--foreground))",
            letterSpacing: "-0.02em"
          }}>
            Свяжитесь с нами
          </h1>
          <p style={{
            fontSize: "1.25rem",
            color: "hsl(var(--muted-foreground))",
            lineHeight: "1.6"
          }}>
            Мы всегда рады ответить на ваши вопросы и помочь с выбором
          </p>
        </div>

        {/* Contact Cards Section */}
        <div style={{
          maxWidth: "1200px",
          margin: "0 auto",
          padding: "3rem 2rem"
        }}>
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: "2rem",
            marginBottom: "4rem"
          }}>
            {/* Phone Card */}
            <div 
              className="hover-scale"
              style={{
                padding: "2.5rem 2rem",
                backgroundColor: "hsl(var(--card))",
                borderRadius: "16px",
                boxShadow: "0 4px 20px rgba(0, 0, 0, 0.08)",
                textAlign: "center",
                transition: "all 0.3s ease",
                cursor: "pointer",
                border: "1px solid hsl(var(--border))"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = "0 8px 30px rgba(0, 0, 0, 0.12)";
                e.currentTarget.style.transform = "translateY(-4px)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = "0 4px 20px rgba(0, 0, 0, 0.08)";
                e.currentTarget.style.transform = "translateY(0)";
              }}
            >
              <div style={{
                display: "inline-flex",
                padding: "1.25rem",
                backgroundColor: "hsl(var(--accent))",
                borderRadius: "50%",
                marginBottom: "1.5rem"
              }}>
                <Phone size={28} style={{ color: "hsl(var(--accent-foreground))" }} />
              </div>
              <h3 style={{
                fontSize: "1.5rem",
                fontWeight: "600",
                marginBottom: "1rem",
                color: "hsl(var(--foreground))"
              }}>
                Телефон
              </h3>
              <p style={{
                fontSize: "1.125rem",
                color: "hsl(var(--accent))",
                fontWeight: "500",
                marginBottom: "0.5rem"
              }}>
                +7 (999) 123-45-67
              </p>
              <p style={{
                color: "hsl(var(--muted-foreground))",
                fontSize: "0.95rem"
              }}>
                Работаем круглосуточно
              </p>
            </div>

            {/* Email Card */}
            <div 
              className="hover-scale"
              style={{
                padding: "2.5rem 2rem",
                backgroundColor: "hsl(var(--card))",
                borderRadius: "16px",
                boxShadow: "0 4px 20px rgba(0, 0, 0, 0.08)",
                textAlign: "center",
                transition: "all 0.3s ease",
                cursor: "pointer",
                border: "1px solid hsl(var(--border))"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = "0 8px 30px rgba(0, 0, 0, 0.12)";
                e.currentTarget.style.transform = "translateY(-4px)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = "0 4px 20px rgba(0, 0, 0, 0.08)";
                e.currentTarget.style.transform = "translateY(0)";
              }}
            >
              <div style={{
                display: "inline-flex",
                padding: "1.25rem",
                backgroundColor: "hsl(var(--accent))",
                borderRadius: "50%",
                marginBottom: "1.5rem"
              }}>
                <Mail size={28} style={{ color: "hsl(var(--accent-foreground))" }} />
              </div>
              <h3 style={{
                fontSize: "1.5rem",
                fontWeight: "600",
                marginBottom: "1rem",
                color: "hsl(var(--foreground))"
              }}>
                Email
              </h3>
              <p style={{
                fontSize: "1.125rem",
                color: "hsl(var(--accent))",
                fontWeight: "500",
                marginBottom: "0.5rem"
              }}>
                info@siaodqq.ru
              </p>
              <p style={{
                color: "hsl(var(--muted-foreground))",
                fontSize: "0.95rem"
              }}>
                Ответим в течение часа
              </p>
            </div>

            {/* Address Card */}
            <div 
              className="hover-scale"
              style={{
                padding: "2.5rem 2rem",
                backgroundColor: "hsl(var(--card))",
                borderRadius: "16px",
                boxShadow: "0 4px 20px rgba(0, 0, 0, 0.08)",
                textAlign: "center",
                transition: "all 0.3s ease",
                cursor: "pointer",
                border: "1px solid hsl(var(--border))"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = "0 8px 30px rgba(0, 0, 0, 0.12)";
                e.currentTarget.style.transform = "translateY(-4px)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = "0 4px 20px rgba(0, 0, 0, 0.08)";
                e.currentTarget.style.transform = "translateY(0)";
              }}
            >
              <div style={{
                display: "inline-flex",
                padding: "1.25rem",
                backgroundColor: "hsl(var(--accent))",
                borderRadius: "50%",
                marginBottom: "1.5rem"
              }}>
                <MapPin size={28} style={{ color: "hsl(var(--accent-foreground))" }} />
              </div>
              <h3 style={{
                fontSize: "1.5rem",
                fontWeight: "600",
                marginBottom: "1rem",
                color: "hsl(var(--foreground))"
              }}>
                Адрес
              </h3>
              <p style={{
                fontSize: "1.125rem",
                color: "hsl(var(--accent))",
                fontWeight: "500",
                marginBottom: "0.5rem"
              }}>
                Москва, ул. Модная, 1
              </p>
              <p style={{
                color: "hsl(var(--muted-foreground))",
                fontSize: "0.95rem"
              }}>
                Приходите в любое время
              </p>
            </div>
          </div>

          {/* Working Hours Banner */}
          <div style={{
            backgroundColor: "hsl(var(--accent))",
            padding: "3rem 2rem",
            borderRadius: "20px",
            textAlign: "center",
            marginBottom: "4rem",
            position: "relative",
            overflow: "hidden"
          }}>
            <div style={{
              position: "absolute",
              top: "-50%",
              right: "-10%",
              width: "300px",
              height: "300px",
              background: "hsl(var(--accent-foreground) / 0.1)",
              borderRadius: "50%",
              filter: "blur(60px)"
            }} />
            <div style={{
              position: "relative",
              zIndex: 1
            }}>
              <Clock size={48} style={{ 
                color: "hsl(var(--accent-foreground))",
                marginBottom: "1.5rem"
              }} />
              <h2 style={{
                fontSize: "2rem",
                fontWeight: "600",
                marginBottom: "1rem",
                color: "hsl(var(--accent-foreground))"
              }}>
                Время работы
              </h2>
              <p style={{
                fontSize: "1.25rem",
                color: "hsl(var(--accent-foreground))",
                opacity: 0.9
              }}>
                Пн-Вс: 09:00 - 21:00
              </p>
            </div>
          </div>

          {/* Contact Form Section */}
          <div style={{
            backgroundColor: "hsl(var(--card))",
            padding: "3rem 2rem",
            borderRadius: "20px",
            boxShadow: "0 4px 20px rgba(0, 0, 0, 0.08)",
            border: "1px solid hsl(var(--border))"
          }}>
            <div style={{
              textAlign: "center",
              marginBottom: "2rem"
            }}>
              <h2 style={{
                fontSize: "2rem",
                fontWeight: "600",
                marginBottom: "0.5rem",
                color: "hsl(var(--foreground))"
              }}>
                Остались вопросы?
              </h2>
              <p style={{
                fontSize: "1.125rem",
                color: "hsl(var(--muted-foreground))"
              }}>
                Напишите нам, и мы обязательно свяжемся с вами
              </p>
            </div>

            <div style={{
              maxWidth: "600px",
              margin: "0 auto",
              display: "flex",
              flexDirection: "column",
              gap: "1.5rem"
            }}>
              <input
                type="text"
                placeholder="Ваше имя"
                style={{
                  padding: "1rem 1.5rem",
                  fontSize: "1rem",
                  border: "2px solid hsl(var(--border))",
                  borderRadius: "12px",
                  backgroundColor: "hsl(var(--background))",
                  color: "hsl(var(--foreground))",
                  outline: "none",
                  transition: "border-color 0.3s ease"
                }}
                onFocus={(e) => e.currentTarget.style.borderColor = "hsl(var(--accent))"}
                onBlur={(e) => e.currentTarget.style.borderColor = "hsl(var(--border))"}
              />
              <input
                type="email"
                placeholder="Email"
                style={{
                  padding: "1rem 1.5rem",
                  fontSize: "1rem",
                  border: "2px solid hsl(var(--border))",
                  borderRadius: "12px",
                  backgroundColor: "hsl(var(--background))",
                  color: "hsl(var(--foreground))",
                  outline: "none",
                  transition: "border-color 0.3s ease"
                }}
                onFocus={(e) => e.currentTarget.style.borderColor = "hsl(var(--accent))"}
                onBlur={(e) => e.currentTarget.style.borderColor = "hsl(var(--border))"}
              />
              <textarea
                placeholder="Ваше сообщение"
                rows={5}
                style={{
                  padding: "1rem 1.5rem",
                  fontSize: "1rem",
                  border: "2px solid hsl(var(--border))",
                  borderRadius: "12px",
                  backgroundColor: "hsl(var(--background))",
                  color: "hsl(var(--foreground))",
                  outline: "none",
                  resize: "vertical",
                  transition: "border-color 0.3s ease"
                }}
                onFocus={(e) => e.currentTarget.style.borderColor = "hsl(var(--accent))"}
                onBlur={(e) => e.currentTarget.style.borderColor = "hsl(var(--border))"}
              />
              <button
                style={{
                  padding: "1.25rem 2rem",
                  fontSize: "1.125rem",
                  fontWeight: "600",
                  backgroundColor: "hsl(var(--accent))",
                  color: "hsl(var(--accent-foreground))",
                  border: "none",
                  borderRadius: "12px",
                  cursor: "pointer",
                  transition: "all 0.3s ease",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "0.75rem",
                  margin: "0 auto"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-2px)";
                  e.currentTarget.style.boxShadow = "0 8px 20px rgba(0, 0, 0, 0.15)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "none";
                }}
              >
                <Send size={20} />
                Отправить сообщение
              </button>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Contacts;