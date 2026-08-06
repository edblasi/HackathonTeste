interface QRCodePlaceholderProps {
  size?: number;
}

export function QRCodePlaceholder({ size = 140 }: QRCodePlaceholderProps) {
  const cells = Array.from({ length: 21 * 21 }, (_, i) => {
    const row = Math.floor(i / 21);
    const col = i % 21;
    // Finder patterns corners
    const inFinderTL = row < 7 && col < 7;
    const inFinderTR = row < 7 && col >= 14;
    const inFinderBL = row >= 14 && col < 7;
    const isFinderBorder =
      (inFinderTL && (row === 0 || row === 6 || col === 0 || col === 6)) ||
      (inFinderTR && (row === 0 || row === 6 || col === 14 || col === 20)) ||
      (inFinderBL && (row === 14 || row === 20 || col === 0 || col === 6));
    const isFinderInner =
      (inFinderTL && row >= 2 && row <= 4 && col >= 2 && col <= 4) ||
      (inFinderTR && row >= 2 && row <= 4 && col >= 16 && col <= 18) ||
      (inFinderBL && row >= 16 && row <= 18 && col >= 2 && col <= 4);
    const isAlignmentPattern =
      row >= 9 &&
      row <= 12 &&
      col >= 9 &&
      col <= 12 &&
      (row === 9 || row === 12 || col === 9 || col === 12 || (row === 10 && col === 10));
    // Timing patterns
    const isTiming =
      (row === 6 && col > 7 && col < 14 && col % 2 === 0) ||
      (col === 6 && row > 7 && row < 14 && row % 2 === 0);
    // Random data modules (seeded)
    const seed = (row * 31 + col * 17 + row * col) % 7;
    const isData =
      !inFinderTL && !inFinderTR && !inFinderBL && !isAlignmentPattern && !isTiming && seed < 3;
    return isFinderBorder || isFinderInner || isAlignmentPattern || isTiming || isData;
  });

  return (
    <div
      className="inline-grid bg-white p-3 rounded-lg border border-border"
      style={{ gridTemplateColumns: "repeat(21, 1fr)", gap: "1px", width: size, height: size }}
      aria-label="QR Code for the device digital identity"
    >
      {cells.map((dark, i) => (
        <div
          key={i}
          className={dark ? "bg-foreground" : "bg-white"}
          style={{ width: "100%", aspectRatio: "1" }}
        />
      ))}
    </div>
  );
}