import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sistema de Gestión de Gastos Administrativos",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
