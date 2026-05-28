export function AmbientBackground() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10"
      style={{
        backgroundImage: `
          radial-gradient(ellipse 80% 50% at 50% -20%, oklch(0.66 0.22 285 / 0.14), transparent),
          radial-gradient(ellipse 60% 40% at 100% 100%, oklch(0.74 0.14 175 / 0.06), transparent)
        `,
      }}
    >
      <div
        className="absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage:
            "radial-gradient(circle, oklch(1 0 0 / 0.04) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
          maskImage:
            "radial-gradient(ellipse 80% 60% at 50% 40%, black 30%, transparent 80%)",
          WebkitMaskImage:
            "radial-gradient(ellipse 80% 60% at 50% 40%, black 30%, transparent 80%)",
        }}
      />
    </div>
  );
}
