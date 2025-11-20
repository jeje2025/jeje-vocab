"use client";

import { useTheme } from "next-themes@0.4.6";
import { Toaster as Sonner, ToasterProps } from "sonner@2.0.3";

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme="light"
      className="toaster group"
      toastOptions={{
        style: {
          background: 'white',
          color: '#491B6D',
          border: '1px solid #E5E7EB',
          borderRadius: '16px',
          padding: '16px',
          fontSize: '14px',
          fontWeight: 500,
          boxShadow: '0 10px 40px rgba(73, 27, 109, 0.1)',
        },
        className: 'toast-custom',
        classNames: {
          success: 'success-toast',
          error: 'error-toast',
          warning: 'warning-toast',
          info: 'info-toast',
        },
      }}
      style={
        {
          "--normal-bg": "white",
          "--normal-text": "#491B6D",
          "--normal-border": "#E5E7EB",
          "--success-bg": "white",
          "--success-text": "#166534",
          "--success-border": "#E5E7EB",
          "--error-bg": "white",
          "--error-text": "#991B1B",
          "--error-border": "#E5E7EB",
          "--info-bg": "white",
          "--info-text": "#1E40AF",
          "--info-border": "#E5E7EB",
          "--warning-bg": "white",
          "--warning-text": "#92400E",
          "--warning-border": "#E5E7EB",
        } as React.CSSProperties
      }
      {...props}
    />
  );
};

export { Toaster };
