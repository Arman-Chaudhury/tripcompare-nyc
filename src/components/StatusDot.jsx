export default function StatusDot({ color, label }) {
  return (
    <span className={`dot dot-${color}`} role="img" aria-label={label} title={label} />
  );
}
