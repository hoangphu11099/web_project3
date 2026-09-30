"use client";

import { useMemo } from "react";
import { makeQrMatrix } from "@/app/qr";

export function AttendanceQr({ value }: { value: string }) {
  const matrix = useMemo(() => {
    if (!value) return [];
    try { return makeQrMatrix(value); } catch { return []; }
  }, [value]);
  if (matrix.length === 0) return null;
  const quiet = 4; const size = matrix.length + quiet * 2;
  return <svg className="attendance-qr" viewBox={`0 0 ${size} ${size}`} role="img" aria-label="Mã QR điểm danh" shapeRendering="crispEdges"><rect className="qr-background" x="0" y="0" width={size} height={size} />{matrix.flatMap((row, y) => row.map((dark, x) => dark ? <rect className="qr-module" key={`${x}-${y}`} x={x + quiet} y={y + quiet} width="1" height="1" /> : null))}</svg>;
}
