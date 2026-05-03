// Bare layout — the meeting room is a full-viewport experience and must
// not be wrapped in the marketing/app shell that the rest of the routes
// share. Keeping this as a separate route segment layout lets us avoid
// inheriting any header/sidebar from a higher-up layout.
export default function MeetingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="bg-black text-white">{children}</div>;
}
