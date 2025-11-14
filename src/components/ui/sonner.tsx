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
            "group toast group-[.toaster]:bg-gradient-to-br group-[.toaster]:from-background group-[.toaster]:to-background/95 group-[.toaster]:text-foreground group-[.toaster]:border group-[.toaster]:border-border/50 group-[.toaster]:shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] group-[.toaster]:backdrop-blur-xl group-[.toaster]:rounded-2xl group-[.toaster]:px-6 group-[.toaster]:py-5 group-[.toaster]:min-w-[320px]",
          description: "group-[.toast]:text-muted-foreground group-[.toast]:text-sm group-[.toast]:mt-1 group-[.toast]:font-light",
          actionButton: "group-[.toast]:bg-gradient-to-r group-[.toast]:from-primary group-[.toast]:to-primary/90 group-[.toast]:text-primary-foreground group-[.toast]:rounded-xl group-[.toast]:px-5 group-[.toast]:py-2.5 group-[.toast]:font-semibold group-[.toast]:transition-all group-[.toast]:hover:scale-105 group-[.toast]:hover:shadow-lg group-[.toast]:hover:shadow-primary/20",
          cancelButton: "group-[.toast]:bg-secondary/50 group-[.toast]:text-secondary-foreground group-[.toast]:rounded-xl group-[.toast]:px-5 group-[.toast]:py-2.5 group-[.toast]:transition-all group-[.toast]:hover:bg-secondary group-[.toast]:backdrop-blur-sm",
          success: "group-[.toast]:border-l-4 group-[.toast]:border-l-green-500 group-[.toast]:bg-gradient-to-br group-[.toast]:from-green-50/90 group-[.toast]:to-emerald-50/70 dark:group-[.toast]:from-green-950/90 dark:group-[.toast]:to-emerald-950/70 group-[.toast]:shadow-green-500/10",
          error: "group-[.toast]:border-l-4 group-[.toast]:border-l-red-500 group-[.toast]:bg-gradient-to-br group-[.toast]:from-red-50/90 group-[.toast]:to-rose-50/70 dark:group-[.toast]:from-red-950/90 dark:group-[.toast]:to-rose-950/70 group-[.toast]:shadow-red-500/10",
          warning: "group-[.toast]:border-l-4 group-[.toast]:border-l-amber-500 group-[.toast]:bg-gradient-to-br group-[.toast]:from-amber-50/90 group-[.toast]:to-orange-50/70 dark:group-[.toast]:from-amber-950/90 dark:group-[.toast]:to-orange-950/70 group-[.toast]:shadow-amber-500/10",
          info: "group-[.toast]:border-l-4 group-[.toast]:border-l-blue-500 group-[.toast]:bg-gradient-to-br group-[.toast]:from-blue-50/90 group-[.toast]:to-sky-50/70 dark:group-[.toast]:from-blue-950/90 dark:group-[.toast]:to-sky-950/70 group-[.toast]:shadow-blue-500/10",
        },
        duration: 4000,
      }}
      {...props}
    />
  );
};

export { Toaster, toast };
