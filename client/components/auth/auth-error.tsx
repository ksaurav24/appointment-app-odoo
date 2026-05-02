import { ApiError } from "@/lib/api";

export function AuthError({ error }: { error: unknown }) {
  if (!error) return null;

  const messages =
    error instanceof ApiError
      ? error.messages
      : error instanceof Error
        ? [error.message]
        : ["Something went wrong."];

  return (
    <div
      role="alert"
      className="rounded-2xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
    >
      {messages.length === 1 ? (
        <p>{messages[0]}</p>
      ) : (
        <ul className="list-disc space-y-0.5 pl-4">
          {messages.map((m) => (
            <li key={m}>{m}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
