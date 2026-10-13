interface WaitlistCardProps {
  onJoin: () => void;
  variant?: "landing" | "home";
}

export function WaitlistCard({ onJoin, variant = "landing" }: WaitlistCardProps) {
  // This feature is intentionally disabled. Keep the component as a no-op placeholder.
  void onJoin;
  void variant;
  return null;
}
