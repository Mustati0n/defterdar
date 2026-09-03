export function SignatureLine() {
  return (
    <div className="signature-line" aria-hidden="true">
      <svg viewBox="0 0 1200 54" preserveAspectRatio="none">
        <path
          className="signature-line__track"
          d="M0 34 H1090 C1148 34 1178 30 1178 8 V4"
        />
        <circle cx="1178" cy="4" r="3" />
      </svg>
    </div>
  );
}
