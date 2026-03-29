"use client";

interface ActiveSecretariesCounterProps {
  count: number;
}

export default function ActiveSecretariesCounter({ count }: ActiveSecretariesCounterProps) {
  return (
    <p className="text-2xl font-medium" style={{ color: "#1F1F1F" }}>
      {count}
    </p>
  );
}
