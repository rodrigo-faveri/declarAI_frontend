import { SourceItem } from "@/types/chat";

type SourceListProps = {
  sources: SourceItem[];
};

export default function SourceList({ sources }: SourceListProps) {
  if (!sources.length) return null;

  return (
    <div className="card">
      <h3>Fontes</h3>
      <ul>
        {sources.map((item, index) => (
          <li key={`${item.source}-${index}`}>
            {item.source}
            {item.score !== null ? ` (score: ${item.score})` : ""}
          </li>
        ))}
      </ul>
    </div>
  );
}