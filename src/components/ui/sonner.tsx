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
            "group toast group-[.toaster]:bg-card group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-[0_8px_30px_rgba(0,0,0,0.12)] group-[.toaster]:backdrop-blur-sm group-[.toaster]:rounded-lg group-[.toaster]:px-6 group-[.toaster]:py-4",
          description: "group-[.toast]:text-muted-foreground group-[.toast]:text-sm",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground group-[.toast]:rounded-md group-[.toast]:px-4 group-[.toast]:py-2 group-[.toast]:font-medium group-[.toast]:transition-all group-[.toast]:hover:scale-105",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground group-[.toast]:rounded-md group-[.toast]:px-4 group-[.toast]:py-2 group-[.toast]:transition-all group-[.toast]:hover:bg-secondary",
          success: "group-[.toast]:bg-emerald-50 group-[.toast]:border-emerald-200 group-[.toast]:text-emerald-900 dark:group-[.toast]:bg-emerald-950 dark:group-[.toast]:border-emerald-800 dark:group-[.toast]:text-emerald-100",
          error: "group-[.toast]:bg-red-50 group-[.toast]:border-red-200 group-[.toast]:text-red-900 dark:group-[.toast]:bg-red-950 dark:group-[.toast]:border-red-800 dark:group-[.toast]:text-red-100",
          warning: "group-[.toast]:bg-amber-50 group-[.toast]:border-amber-200 group-[.toast]:text-amber-900 dark:group-[.toast]:bg-amber-950 dark:group-[.toast]:border-amber-800 dark:group-[.toast]:text-amber-100",
          info: "group-[.toast]:bg-blue-50 group-[.toast]:border-blue-200 group-[.toast]:text-blue-900 dark:group-[.toast]:bg-blue-950 dark:group-[.toast]:border-blue-800 dark:group-[.toast]:text-blue-100",
        },
        duration: 4000,
      }}
      {...props}
    />
  );
};

export { Toaster, toast };
