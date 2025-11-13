import Layout from "@/components/Layout";
import aboutImage from "@/assets/about-image.svg";

const About = () => {
  return (
    <Layout>
      <div style={{ padding: "4rem 2rem", maxWidth: "900px", margin: "0 auto" }}>
        <h1 style={{
          fontSize: "3rem",
          fontWeight: "500",
          marginBottom: "1.5rem",
          color: "hsl(var(--foreground))"
        }}>
          О нас
        </h1>

        <div style={{
          lineHeight: "1.8",
          color: "hsl(var(--muted-foreground))",
          fontSize: "1.125rem"
        }}>
          <p style={{ marginBottom: "1.5rem" }}>
            siaodqq — это современный онлайн-магазин одежды, который предлагает эксклюзивные коллекции 
            от ведущих дизайнеров и брендов.
          </p>

          <p style={{ marginBottom: "1.5rem" }}>
            Мы тщательно отбираем каждую вещь в нашем каталоге, чтобы предложить вам только качественную 
            и стильную одежду, которая подчеркнет вашу индивидуальность.
          </p>

          {/* Image Section */}
          <div style={{
            marginTop: "3rem",
            marginBottom: "3rem",
            borderRadius: "12px",
            overflow: "hidden",
            boxShadow: "0 10px 40px rgba(0, 0, 0, 0.1)"
          }}>
            <img 
              src={aboutImage} 
              alt="О нас" 
              style={{
                width: "100%",
                height: "auto",
                display: "block"
              }}
            />
          </div>

          <h2 style={{
            fontSize: "2rem",
            fontWeight: "500",
            marginTop: "3rem",
            marginBottom: "1.5rem",
            color: "hsl(var(--foreground))"
          }}>
            Наши преимущества
          </h2>

          <ul style={{
            listStyle: "none",
            padding: 0,
            display: "flex",
            flexDirection: "column",
            gap: "1rem"
          }}>
            <li style={{
              padding: "1.5rem",
              backgroundColor: "hsl(var(--secondary))"
            }}>
              <strong style={{ color: "hsl(var(--foreground))" }}>Качество:</strong> Работаем только 
              с проверенными поставщиками и брендами
            </li>
            <li style={{
              padding: "1.5rem",
              backgroundColor: "hsl(var(--secondary))"
            }}>
              <strong style={{ color: "hsl(var(--foreground))" }}>Быстрая доставка:</strong> Доставляем 
              заказы по всей России в течение 1-3 дней
            </li>
            <li style={{
              padding: "1.5rem",
              backgroundColor: "hsl(var(--secondary))"
            }}>
              <strong style={{ color: "hsl(var(--foreground))" }}>Удобная оплата:</strong> Принимаем 
              все виды оплаты с защитой данных
            </li>
            <li style={{
              padding: "1.5rem",
              backgroundColor: "hsl(var(--secondary))"
            }}>
              <strong style={{ color: "hsl(var(--foreground))" }}>Поддержка:</strong> Наша команда 
              всегда готова помочь с выбором и ответить на вопросы
            </li>
          </ul>

          <h2 style={{
            fontSize: "2rem",
            fontWeight: "500",
            marginTop: "3rem",
            marginBottom: "1.5rem",
            color: "hsl(var(--foreground))"
          }}>
            Контакты
          </h2>

          <div style={{
            padding: "2rem",
            backgroundColor: "hsl(var(--secondary))"
          }}>
            <p style={{ marginBottom: "0.75rem" }}>
              <strong>Email:</strong> info@fashion.ru
            </p>
            <p style={{ marginBottom: "0.75rem" }}>
              <strong>Телефон:</strong> +7 (999) 123-45-67
            </p>
            <p>
              <strong>Адрес:</strong> Москва, ул. Модная, 1
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default About;