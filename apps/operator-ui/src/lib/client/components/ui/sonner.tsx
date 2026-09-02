import { useTheme } from 'next-themes';
import { Toaster as Sonner, type ToasterProps } from 'sonner';

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = 'system' } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps['theme']}
      className="toaster group"
      richColors
      style={
        {
          '--normal-bg': 'var(--popover)',
          '--normal-text': 'var(--popover-foreground)',
          '--normal-border': 'var(--border)',
          // Voltu-tinted feedback (verified green / ghost red / saffron) instead of sonner's stock colours.
          '--success-bg': 'color-mix(in srgb, var(--success) 12%, var(--popover))',
          '--success-border': 'color-mix(in srgb, var(--success) 40%, var(--border))',
          '--success-text': 'var(--foreground)',
          '--error-bg': 'color-mix(in srgb, var(--destructive) 12%, var(--popover))',
          '--error-border': 'color-mix(in srgb, var(--destructive) 40%, var(--border))',
          '--error-text': 'var(--foreground)',
          '--warning-bg': 'color-mix(in srgb, var(--warning) 14%, var(--popover))',
          '--warning-border': 'color-mix(in srgb, var(--warning) 45%, var(--border))',
          '--warning-text': 'var(--foreground)',
          '--info-bg': 'var(--popover)',
          '--info-border': 'var(--border)',
          '--info-text': 'var(--popover-foreground)',
        } as React.CSSProperties
      }
      {...props}
    />
  );
};

export { Toaster };
