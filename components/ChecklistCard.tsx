type ChecklistCardProps = {
  checklist: string[];
  riskFlags: string[];
};

export default function ChecklistCard({
  checklist,
  riskFlags,
}: ChecklistCardProps) {
  if (!checklist.length && !riskFlags.length) return null;

  return (
    <div className="card">
      <h3>Checklist personalizado</h3>
      {checklist.length > 0 && (
        <>
          <h4>Documentos e ações</h4>
          <ul>
            {checklist.map((item, index) => (
              <li key={`check-${index}`}>{item}</li>
            ))}
          </ul>
        </>
      )}

      {riskFlags.length > 0 && (
        <>
          <h4>Pontos de atenção</h4>
          <ul>
            {riskFlags.map((item, index) => (
              <li key={`risk-${index}`}>{item}</li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}