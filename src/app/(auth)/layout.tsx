export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4"
      style={{ background: "linear-gradient(135deg, #0d9488 0%, #14b8a6 50%, #0f766e 100%)" }}>
      {children}
    </div>
  );
}
