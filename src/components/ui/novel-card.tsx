// src/components/ui/novel-card.tsx
type NovelCardProps = {
  title: string;
  coverUrl: string;
  status: string;
  onClick?: () => void;
}

export default function NovelCard({ title, coverUrl, status, onClick }: NovelCardProps) {
  return (
    <div 
      onClick={onClick}
      className="bg-white rounded-lg p-3 flex gap-3 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
    >
      <div className="w-16 h-20 bg-gray-200 rounded overflow-hidden flex-shrink-0">
        <img
          src={coverUrl}
          alt={`Обложка ${title}`}
          className="w-full h-full object-cover"
        />
      </div>
      <div className="flex-1">
        <h3 className="font-medium mb-1">{title}</h3>
        <p className="text-sm text-gray-600">перевод: {status}</p>
      </div>
    </div>
  );
}
