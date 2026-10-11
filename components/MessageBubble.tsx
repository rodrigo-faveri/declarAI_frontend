type MessageBubbleProps = {
  role: "user" | "assistant";
  content: string;
};

export default function MessageBubble({ role, content }: MessageBubbleProps) {
  return (
    <div className={`message-bubble ${role === "user" ? "user" : "assistant"}`}>
      <div className="message-role">
        {role === "user" ? "Você" : "DeclarIA"}
      </div>
      <div className="message-content">{content}</div>
    </div>
  );
}