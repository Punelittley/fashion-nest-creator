import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { toast } from "sonner";
import { Star, Send, MessageSquare } from "lucide-react";
import { z } from "zod";

const reviewSchema = z.object({
  productName: z.string().min(2, "Название товара обязательно"),
  rating: z.number().min(1).max(5),
  comment: z.string().min(10, "Отзыв должен содержать минимум 10 символов"),
  author: z.string().min(2, "Укажите ваше имя")
});

interface Review {
  id: string;
  productName: string;
  rating: number;
  comment: string;
  author: string;
  date: string;
}

const Reviews = () => {
  const navigate = useNavigate();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    productName: "",
    rating: 5,
    comment: "",
    author: ""
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    setIsAuthenticated(!!token);
    loadReviews();
  }, []);

  const loadReviews = () => {
    // Загружаем из localStorage
    const saved = localStorage.getItem('reviews');
    if (saved) {
      setReviews(JSON.parse(saved));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isAuthenticated) {
      toast.error("Войдите, чтобы оставить отзыв");
      navigate("/auth");
      return;
    }

    setSubmitting(true);
    try {
      const validation = reviewSchema.safeParse(formData);
      if (!validation.success) {
        toast.error(validation.error.errors[0].message);
        setSubmitting(false);
        return;
      }

      const newReview: Review = {
        id: Date.now().toString(),
        ...formData,
        date: new Date().toISOString()
      };

      const updatedReviews = [newReview, ...reviews];
      setReviews(updatedReviews);
      localStorage.setItem('reviews', JSON.stringify(updatedReviews));

      toast.success("Спасибо за ваш отзыв!");
      setShowForm(false);
      setFormData({
        productName: "",
        rating: 5,
        comment: "",
        author: ""
      });
    } catch (error) {
      toast.error("Ошибка при отправке отзыва");
    } finally {
      setSubmitting(false);
    }
  };

  const renderStars = (rating: number, interactive: boolean = false, onChange?: (rating: number) => void) => {
    return (
      <div style={{ display: "flex", gap: "0.25rem" }}>
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            size={interactive ? 28 : 20}
            style={{
              color: star <= rating ? "hsl(var(--accent))" : "hsl(var(--muted-foreground))",
              fill: star <= rating ? "hsl(var(--accent))" : "transparent",
              cursor: interactive ? "pointer" : "default",
              transition: "var(--transition)"
            }}
            onClick={() => interactive && onChange && onChange(star)}
            onMouseEnter={(e) => interactive && (e.currentTarget.style.transform = "scale(1.2)")}
            onMouseLeave={(e) => interactive && (e.currentTarget.style.transform = "scale(1)")}
          />
        ))}
      </div>
    );
  };

  return (
    <Layout>
      <div style={{ padding: "4rem 2rem", maxWidth: "1000px", margin: "0 auto" }}>
        <div className="animate-fade-in">
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "3rem",
            flexWrap: "wrap",
            gap: "1rem"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
              <MessageSquare size={36} style={{ color: "hsl(var(--accent))" }} />
              <h1 style={{
                fontSize: "3rem",
                fontWeight: "500",
                color: "hsl(var(--foreground))"
              }}>
                Отзывы
              </h1>
            </div>

            {isAuthenticated && !showForm && (
              <button
                onClick={() => setShowForm(true)}
                style={{
                  padding: "1rem 2rem",
                  backgroundColor: "hsl(var(--primary))",
                  color: "hsl(var(--primary-foreground))",
                  border: "none",
                  fontSize: "1rem",
                  fontWeight: "500",
                  cursor: "pointer",
                  transition: "var(--transition)"
                }}
                className="hover-scale"
              >
                Оставить отзыв
              </button>
            )}
          </div>

          {showForm && (
            <div
              style={{
                padding: "2rem",
                backgroundColor: "hsl(var(--card))",
                boxShadow: "var(--shadow-medium)",
                marginBottom: "3rem"
              }}
              className="animate-scale-in"
            >
              <h2 style={{
                fontSize: "1.5rem",
                fontWeight: "500",
                marginBottom: "1.5rem",
                color: "hsl(var(--foreground))"
              }}>
                Новый отзыв
              </h2>

              <form onSubmit={handleSubmit} style={{ display: "grid", gap: "1.5rem" }}>
                <div>
                  <label style={{
                    display: "block",
                    marginBottom: "0.5rem",
                    fontSize: "0.95rem",
                    color: "hsl(var(--foreground))"
                  }}>
                    Ваше имя *
                  </label>
                  <input
                    type="text"
                    value={formData.author}
                    onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                    placeholder="Иван"
                    style={{
                      width: "100%",
                      padding: "0.75rem",
                      border: "1px solid hsl(var(--border))",
                      backgroundColor: "hsl(var(--background))",
                      color: "hsl(var(--foreground))",
                      fontSize: "1rem",
                      transition: "var(--transition)"
                    }}
                    required
                  />
                </div>

                <div>
                  <label style={{
                    display: "block",
                    marginBottom: "0.5rem",
                    fontSize: "0.95rem",
                    color: "hsl(var(--foreground))"
                  }}>
                    Название товара *
                  </label>
                  <input
                    type="text"
                    value={formData.productName}
                    onChange={(e) => setFormData({ ...formData, productName: e.target.value })}
                    placeholder="Мужская рубашка"
                    style={{
                      width: "100%",
                      padding: "0.75rem",
                      border: "1px solid hsl(var(--border))",
                      backgroundColor: "hsl(var(--background))",
                      color: "hsl(var(--foreground))",
                      fontSize: "1rem"
                    }}
                    required
                  />
                </div>

                <div>
                  <label style={{
                    display: "block",
                    marginBottom: "0.75rem",
                    fontSize: "0.95rem",
                    color: "hsl(var(--foreground))"
                  }}>
                    Оценка *
                  </label>
                  {renderStars(formData.rating, true, (rating) => setFormData({ ...formData, rating }))}
                </div>

                <div>
                  <label style={{
                    display: "block",
                    marginBottom: "0.5rem",
                    fontSize: "0.95rem",
                    color: "hsl(var(--foreground))"
                  }}>
                    Ваш отзыв *
                  </label>
                  <textarea
                    value={formData.comment}
                    onChange={(e) => setFormData({ ...formData, comment: e.target.value })}
                    rows={5}
                    placeholder="Поделитесь своими впечатлениями о товаре..."
                    style={{
                      width: "100%",
                      padding: "0.75rem",
                      border: "1px solid hsl(var(--border))",
                      backgroundColor: "hsl(var(--background))",
                      color: "hsl(var(--foreground))",
                      fontSize: "1rem",
                      resize: "vertical"
                    }}
                    required
                  />
                </div>

                <div style={{ display: "flex", gap: "1rem" }}>
                  <button
                    type="submit"
                    disabled={submitting}
                    style={{
                      flex: 1,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "0.5rem",
                      padding: "1rem",
                      backgroundColor: submitting ? "hsl(var(--muted))" : "hsl(var(--primary))",
                      color: "hsl(var(--primary-foreground))",
                      border: "none",
                      fontSize: "1rem",
                      fontWeight: "500",
                      cursor: submitting ? "not-allowed" : "pointer",
                      transition: "var(--transition)"
                    }}
                  >
                    <Send size={18} />
                    {submitting ? "Отправка..." : "Отправить"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    style={{
                      padding: "1rem 2rem",
                      backgroundColor: "hsl(var(--secondary))",
                      color: "hsl(var(--foreground))",
                      border: "none",
                      fontSize: "1rem",
                      cursor: "pointer",
                      transition: "var(--transition)"
                    }}
                  >
                    Отмена
                  </button>
                </div>
              </form>
            </div>
          )}

          <div style={{ display: "grid", gap: "1.5rem" }}>
            {reviews.length === 0 ? (
              <div
                style={{
                  textAlign: "center",
                  padding: "4rem 2rem",
                  backgroundColor: "hsl(var(--secondary))"
                }}
                className="animate-scale-in"
              >
                <MessageSquare size={64} style={{
                  color: "hsl(var(--muted-foreground))",
                  margin: "0 auto 2rem",
                  opacity: 0.5
                }} />
                <p style={{
                  fontSize: "1.25rem",
                  color: "hsl(var(--muted-foreground))"
                }}>
                  Отзывов пока нет. Будьте первым!
                </p>
              </div>
            ) : (
              reviews.map((review, index) => (
                <div
                  key={review.id}
                  style={{
                    padding: "2rem",
                    backgroundColor: "hsl(var(--card))",
                    boxShadow: "var(--shadow-soft)",
                    transition: "var(--transition)",
                    animationDelay: `${index * 0.1}s`
                  }}
                  className="animate-fade-in"
                  onMouseEnter={(e) => e.currentTarget.style.boxShadow = "var(--shadow-medium)"}
                  onMouseLeave={(e) => e.currentTarget.style.boxShadow = "var(--shadow-soft)"}
                >
                  <div style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "start",
                    marginBottom: "1rem",
                    flexWrap: "wrap",
                    gap: "1rem"
                  }}>
                    <div>
                      <h3 style={{
                        fontSize: "1.25rem",
                        fontWeight: "500",
                        marginBottom: "0.5rem",
                        color: "hsl(var(--foreground))"
                      }}>
                        {review.productName}
                      </h3>
                      {renderStars(review.rating)}
                    </div>
                    <p style={{
                      fontSize: "0.9rem",
                      color: "hsl(var(--muted-foreground))"
                    }}>
                      {new Date(review.date).toLocaleDateString('ru-RU')}
                    </p>
                  </div>

                  <p style={{
                    fontSize: "1rem",
                    lineHeight: "1.6",
                    color: "hsl(var(--foreground))",
                    marginBottom: "1rem"
                  }}>
                    {review.comment}
                  </p>

                  <p style={{
                    fontSize: "0.9rem",
                    fontWeight: "500",
                    color: "hsl(var(--accent))"
                  }}>
                    — {review.author}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Reviews;
