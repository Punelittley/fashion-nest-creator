import Layout from "@/components/Layout";

const Delivery = () => {
  return (
    <Layout>
      <div style={{ padding: "4rem 2rem", maxWidth: "1000px", margin: "0 auto" }}>
        <h1 style={{
          fontSize: "3rem",
          fontWeight: "500",
          marginBottom: "1.5rem",
          color: "hsl(var(--foreground))"
        }}>
          Доставка и оплата
        </h1>
        <p style={{
          fontSize: "1.125rem",
          color: "hsl(var(--muted-foreground))",
          marginBottom: "3rem"
        }}>
          Вся информация о способах доставки и оплаты
        </p>

        {/* Доставка */}
        <section style={{ marginBottom: "4rem" }}>
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: "1rem",
            marginBottom: "2rem"
          }}>
          <h2 style={{
            fontSize: "2rem",
            fontWeight: "500",
            color: "hsl(var(--foreground))"
          }}>
            Доставка
          </h2>
          </div>

          <div style={{
            display: "grid",
            gap: "1.5rem"
          }}>
            <div style={{
              padding: "2rem",
              backgroundColor: "hsl(var(--card))",
              boxShadow: "var(--shadow-soft)"
            }}>
              <h3 style={{
                fontSize: "1.25rem",
                fontWeight: "500",
                marginBottom: "1rem",
                color: "hsl(var(--foreground))"
              }}>
                Курьерская доставка по Москве
              </h3>
              <p style={{
                color: "hsl(var(--muted-foreground))",
                lineHeight: "1.8",
                marginBottom: "0.75rem"
              }}>
                • Срок доставки: 1-2 дня
              </p>
              <p style={{
                color: "hsl(var(--muted-foreground))",
                lineHeight: "1.8",
                marginBottom: "0.75rem"
              }}>
                • Стоимость: 300 ₽ (бесплатно при заказе от 5000 ₽)
              </p>
              <p style={{
                color: "hsl(var(--muted-foreground))",
                lineHeight: "1.8"
              }}>
                • Доставка с 10:00 до 21:00
              </p>
            </div>

            <div style={{
              padding: "2rem",
              backgroundColor: "hsl(var(--card))",
              boxShadow: "var(--shadow-soft)"
            }}>
              <h3 style={{
                fontSize: "1.25rem",
                fontWeight: "500",
                marginBottom: "1rem",
                color: "hsl(var(--foreground))"
              }}>
                Доставка по России
              </h3>
              <p style={{
                color: "hsl(var(--muted-foreground))",
                lineHeight: "1.8",
                marginBottom: "0.75rem"
              }}>
                • Срок доставки: 3-7 дней (в зависимости от региона)
              </p>
              <p style={{
                color: "hsl(var(--muted-foreground))",
                lineHeight: "1.8",
                marginBottom: "0.75rem"
              }}>
                • Стоимость: от 500 ₽ (бесплатно при заказе от 7000 ₽)
              </p>
              <p style={{
                color: "hsl(var(--muted-foreground))",
                lineHeight: "1.8"
              }}>
                • Доставка до пункта выдачи или курьером
              </p>
            </div>

            <div style={{
              padding: "2rem",
              backgroundColor: "hsl(var(--card))",
              boxShadow: "var(--shadow-soft)"
            }}>
              <h3 style={{
                fontSize: "1.25rem",
                fontWeight: "500",
                marginBottom: "1rem",
                color: "hsl(var(--foreground))"
              }}>
                Самовывоз
              </h3>
              <p style={{
                color: "hsl(var(--muted-foreground))",
                lineHeight: "1.8",
                marginBottom: "0.75rem"
              }}>
                • Бесплатно
              </p>
              <p style={{
                color: "hsl(var(--muted-foreground))",
                lineHeight: "1.8",
                marginBottom: "0.75rem"
              }}>
                • Готов к выдаче в день заказа
              </p>
              <p style={{
                color: "hsl(var(--muted-foreground))",
                lineHeight: "1.8"
              }}>
                • Адрес: Москва, ул. Модная, 1, БЦ "Стиль"
              </p>
            </div>
          </div>
        </section>

        {/* Оплата */}
        <section style={{ marginBottom: "4rem" }}>
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: "1rem",
            marginBottom: "2rem"
          }}>
          <h2 style={{
            fontSize: "2rem",
            fontWeight: "500",
            color: "hsl(var(--foreground))"
          }}>
            Способы оплаты
          </h2>
          </div>

          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: "1.5rem"
          }}>
            <div style={{
              padding: "2rem",
              backgroundColor: "hsl(var(--secondary))",
              textAlign: "center"
            }}>
              <h3 style={{
                fontSize: "1.125rem",
                fontWeight: "500",
                marginBottom: "0.75rem",
                color: "hsl(var(--foreground))"
              }}>
                Банковская карта
              </h3>
              <p style={{
                color: "hsl(var(--muted-foreground))",
                lineHeight: "1.6",
                fontSize: "0.95rem"
              }}>
                Visa, Mastercard, МИР
              </p>
            </div>

            <div style={{
              padding: "2rem",
              backgroundColor: "hsl(var(--secondary))",
              textAlign: "center"
            }}>
              <h3 style={{
                fontSize: "1.125rem",
                fontWeight: "500",
                marginBottom: "0.75rem",
                color: "hsl(var(--foreground))"
              }}>
                Наличные
              </h3>
              <p style={{
                color: "hsl(var(--muted-foreground))",
                lineHeight: "1.6",
                fontSize: "0.95rem"
              }}>
                При получении заказа
              </p>
            </div>

            <div style={{
              padding: "2rem",
              backgroundColor: "hsl(var(--secondary))",
              textAlign: "center"
            }}>
              <h3 style={{
                fontSize: "1.125rem",
                fontWeight: "500",
                marginBottom: "0.75rem",
                color: "hsl(var(--foreground))"
              }}>
                Электронные кошельки
              </h3>
              <p style={{
                color: "hsl(var(--muted-foreground))",
                lineHeight: "1.6",
                fontSize: "0.95rem"
              }}>
                ЮMoney, QIWI
              </p>
            </div>
          </div>
        </section>

        {/* Возврат */}
        <section>
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: "1rem",
            marginBottom: "2rem"
          }}>
          <h2 style={{
            fontSize: "2rem",
            fontWeight: "500",
            color: "hsl(var(--foreground))"
          }}>
            Возврат и обмен
          </h2>
          </div>

          <div style={{
            padding: "2rem",
            backgroundColor: "hsl(var(--card))",
            boxShadow: "var(--shadow-soft)"
          }}>
            <p style={{
              color: "hsl(var(--muted-foreground))",
              lineHeight: "1.8",
              marginBottom: "1rem"
            }}>
              Вы можете вернуть или обменять товар в течение 14 дней с момента получения заказа.
            </p>
            <p style={{
              color: "hsl(var(--muted-foreground))",
              lineHeight: "1.8",
              marginBottom: "1rem"
            }}>
              Условия возврата:
            </p>
            <ul style={{
              listStyle: "none",
              padding: 0,
              color: "hsl(var(--muted-foreground))",
              lineHeight: "1.8"
            }}>
              <li style={{ marginBottom: "0.5rem" }}>• Товар не был в использовании</li>
              <li style={{ marginBottom: "0.5rem" }}>• Сохранены все бирки и упаковка</li>
              <li style={{ marginBottom: "0.5rem" }}>• Товарный вид и потребительские свойства сохранены</li>
              <li>• Есть документ, подтверждающий покупку</li>
            </ul>
          </div>
        </section>
      </div>
    </Layout>
  );
};

export default Delivery;