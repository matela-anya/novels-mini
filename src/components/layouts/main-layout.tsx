// src/components/layouts/main-layout.tsx
import Header from '@/components/ui/header';

type MainLayoutProps = {
  children: React.ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
  return (
    <main className="min-h-screen bg-gray-100 p-4">
      <Header 
        name="Саня"
        role="переводчик"
      />
      {children}
    </main>
  );
}
