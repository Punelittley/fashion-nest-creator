import { useState, useEffect } from "react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import Autoplay from "embla-carousel-autoplay";

interface Slide {
  id: number;
  title: string;
  subtitle: string;
  image: string;
}

const HeroSlider = () => {
  const [slides] = useState<Slide[]>([
    {
      id: 1,
      title: "Весенняя коллекция",
      subtitle: "Новые поступления 2025",
      image: "/placeholder.svg", // Замените на свое изображение
    },
    {
      id: 2,
      title: "Стиль и комфорт",
      subtitle: "Эксклюзивные модели",
      image: "/placeholder.svg", // Замените на свое изображение
    },
    {
      id: 3,
      title: "Тренды сезона",
      subtitle: "Скидки до 30%",
      image: "/placeholder.svg", // Замените на свое изображение
    },
  ]);

  return (
    <div style={{ 
      width: "100%", 
      maxWidth: "1600px", 
      margin: "0 auto",
      position: "relative"
    }}>
      <Carousel
        opts={{
          align: "start",
          loop: true,
        }}
        plugins={[
          Autoplay({
            delay: 5000,
          }),
        ]}
        style={{ width: "100%" }}
      >
        <CarouselContent>
          {slides.map((slide) => (
            <CarouselItem key={slide.id}>
              <div
                style={{
                  position: "relative",
                  width: "100%",
                  height: "600px",
                  overflow: "hidden",
                  backgroundColor: "hsl(var(--muted))",
                }}
              >
                {/* Background Image */}
                <div
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundImage: `url(${slide.image})`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                    filter: "brightness(0.7)",
                  }}
                />

                {/* Overlay Gradient */}
                <div
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: "linear-gradient(to bottom, transparent 40%, hsl(var(--background) / 0.8))",
                  }}
                />

                {/* Content */}
                <div
                  style={{
                    position: "relative",
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                    alignItems: "center",
                    textAlign: "center",
                    padding: "2rem",
                    zIndex: 1,
                  }}
                >
                  <p
                    style={{
                      fontSize: "1rem",
                      color: "hsl(var(--accent))",
                      marginBottom: "1rem",
                      fontWeight: "500",
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                    }}
                  >
                    {slide.subtitle}
                  </p>
                  <h2
                    style={{
                      fontSize: "clamp(2rem, 5vw, 4rem)",
                      fontWeight: "500",
                      color: "white",
                      marginBottom: "2rem",
                      maxWidth: "800px",
                      lineHeight: "1.2",
                    }}
                  >
                    {slide.title}
                  </h2>
                  <button
                    style={{
                      padding: "1rem 2.5rem",
                      backgroundColor: "hsl(var(--primary))",
                      color: "hsl(var(--primary-foreground))",
                      border: "none",
                      fontSize: "1rem",
                      fontWeight: "500",
                      cursor: "pointer",
                      transition: "var(--transition)",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = "hsl(var(--accent))";
                      e.currentTarget.style.transform = "translateY(-2px)";
                      e.currentTarget.style.boxShadow = "var(--shadow-hover)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = "hsl(var(--primary))";
                      e.currentTarget.style.transform = "translateY(0)";
                      e.currentTarget.style.boxShadow = "none";
                    }}
                    onClick={() => (window.location.href = "/catalog")}
                  >
                    Смотреть коллекцию
                  </button>
                </div>
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>

        {/* Navigation Buttons */}
        <div
          style={{
            position: "absolute",
            bottom: "2rem",
            right: "2rem",
            display: "flex",
            gap: "1rem",
            zIndex: 10,
          }}
        >
          <CarouselPrevious
            style={{
              position: "static",
              backgroundColor: "hsl(var(--background) / 0.8)",
              border: "1px solid hsl(var(--border))",
            }}
          />
          <CarouselNext
            style={{
              position: "static",
              backgroundColor: "hsl(var(--background) / 0.8)",
              border: "1px solid hsl(var(--border))",
            }}
          />
        </div>
      </Carousel>
    </div>
  );
};

export default HeroSlider;
