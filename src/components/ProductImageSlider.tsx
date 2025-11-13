import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import useEmblaCarousel from "embla-carousel-react";

interface ProductImageSliderProps {
  images: string[];
  alt: string;
}

export const ProductImageSlider = ({ images, alt }: ProductImageSliderProps) => {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true });
  const [currentIndex, setCurrentIndex] = useState(0);

  const scrollPrev = (e: React.MouseEvent) => {
    e.preventDefault();
    if (emblaApi) {
      emblaApi.scrollPrev();
      setCurrentIndex((emblaApi.selectedScrollSnap() - 1 + images.length) % images.length);
    }
  };

  const scrollNext = (e: React.MouseEvent) => {
    e.preventDefault();
    if (emblaApi) {
      emblaApi.scrollNext();
      setCurrentIndex((emblaApi.selectedScrollSnap() + 1) % images.length);
    }
  };

  if (!images || images.length === 0) {
    return (
      <div style={{
        aspectRatio: "3/4",
        backgroundColor: "hsl(var(--muted))"
      }} />
    );
  }

  if (images.length === 1) {
    return (
      <div style={{
        aspectRatio: "3/4",
        backgroundColor: "hsl(var(--muted))",
        overflow: "hidden"
      }}>
        <img
          src={images[0]}
          alt={alt}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover"
          }}
        />
      </div>
    );
  }

  return (
    <div style={{
      position: "relative",
      aspectRatio: "3/4",
      backgroundColor: "hsl(var(--muted))",
      overflow: "hidden"
    }}>
      <div ref={emblaRef} style={{ overflow: "hidden", height: "100%" }}>
        <div style={{ display: "flex", height: "100%" }}>
          {images.map((image, index) => (
            <div
              key={index}
              style={{
                flex: "0 0 100%",
                minWidth: 0
              }}
            >
              <img
                src={image}
                alt={`${alt} - ${index + 1}`}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover"
                }}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Navigation Buttons */}
      <button
        onClick={scrollPrev}
        style={{
          position: "absolute",
          left: "0.5rem",
          top: "50%",
          transform: "translateY(-50%)",
          backgroundColor: "hsl(var(--background) / 0.8)",
          border: "none",
          borderRadius: "50%",
          width: "2rem",
          height: "2rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          transition: "var(--transition)",
          opacity: 0.7
        }}
        onMouseEnter={(e) => e.currentTarget.style.opacity = "1"}
        onMouseLeave={(e) => e.currentTarget.style.opacity = "0.7"}
      >
        <ChevronLeft size={20} color="hsl(var(--foreground))" />
      </button>

      <button
        onClick={scrollNext}
        style={{
          position: "absolute",
          right: "0.5rem",
          top: "50%",
          transform: "translateY(-50%)",
          backgroundColor: "hsl(var(--background) / 0.8)",
          border: "none",
          borderRadius: "50%",
          width: "2rem",
          height: "2rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          transition: "var(--transition)",
          opacity: 0.7
        }}
        onMouseEnter={(e) => e.currentTarget.style.opacity = "1"}
        onMouseLeave={(e) => e.currentTarget.style.opacity = "0.7"}
      >
        <ChevronRight size={20} color="hsl(var(--foreground))" />
      </button>

      {/* Dots Indicator */}
      <div style={{
        position: "absolute",
        bottom: "0.75rem",
        left: "50%",
        transform: "translateX(-50%)",
        display: "flex",
        gap: "0.375rem"
      }}>
        {images.map((_, index) => (
          <div
            key={index}
            style={{
              width: "0.375rem",
              height: "0.375rem",
              borderRadius: "50%",
              backgroundColor: index === currentIndex 
                ? "hsl(var(--foreground))" 
                : "hsl(var(--foreground) / 0.3)",
              transition: "var(--transition)"
            }}
          />
        ))}
      </div>
    </div>
  );
};
