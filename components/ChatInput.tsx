"use client";

import { FormEvent, useState } from "react";

type ChatInputProps = {
  onSend: (message: string) => Promise<void>;
  loading: boolean;
};

export default function ChatInput({ onSend, loading }: ChatInputProps) {
  const [message, setMessage] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    const trimmed = message.trim();
    if (!trimmed || loading) return;

    await onSend(trimmed);
    setMessage("");
  }

  return (
    <form onSubmit={handleSubmit} className="chat-input-form">
      <textarea
        className="chat-input"
        placeholder="Digite sua pergunta ou peça para iniciar uma triagem..."
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        rows={3}
      />
      <button className="primary-button" type="submit" disabled={loading}>
        {loading ? "Enviando..." : "Enviar"}
      </button>
    </form>
  );
}