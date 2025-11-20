import { useTheme } from "next-themes";
import { Toaster as Sonner, toast } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-card group-[.toaster]:text-foreground group-[.toaster]:border group-[.toaster]:border-border group-[.toaster]:shadow-soft group-[.toaster]:px-6 group-[.toaster]:py-4 group-[.toaster]:min-w-[320px] group-[.toaster]:font-light",
          description: "group-[.toast]:text-muted-foreground group-[.toast]:text-sm group-[.toast]:mt-1.5 group-[.toast]:leading-relaxed",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground group-[.toast]:px-4 group-[.toast]:py-2 group-[.toast]:text-sm group-[.toast]:font-medium group-[.toast]:tracking-wide group-[.toast]:uppercase",
          cancelButton: "group-[.toast]:bg-secondary group-[.toast]:text-secondary-foreground group-[.toast]:px-4 group-[.toast]:py-2 group-[.toast]:text-sm group-[.toast]:font-medium",
          success: "group-[.toast]:border-l-2 group-[.toast]:border-l-foreground",
          error: "group-[.toast]:border-l-2 group-[.toast]:border-l-destructive",
          warning: "group-[.toast]:border-l-2 group-[.toast]:border-l-accent",
          info: "group-[.toast]:border-l-2 group-[.toast]:border-l-accent",
        },
        duration: 4000,
      }}
      {...props}
    />
  );
};

export { Toaster, toast };
