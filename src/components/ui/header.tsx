// src/components/ui/header.tsx
type HeaderProps = {
  name: string;
  role: string;
  avatarUrl?: string;
}

export default function Header({ name, role, avatarUrl = '/profile-pic.jpg' }: HeaderProps) {
  return (
    <header className="flex items-center gap-3 mb-6">
      <div className="w-12 h-12 bg-gray-200 rounded-full overflow-hidden">
        <img 
          src={avatarUrl}
          alt={`${name}'s profile`}
          className="w-full h-full object-cover"
        />
      </div>
      <div>
        <h1 className="text-xl font-semibold">{name}</h1>
        <p className="text-gray-600 text-sm">{role}</p>
      </div>
    </header>
  );
}
