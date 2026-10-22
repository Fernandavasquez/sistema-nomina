/**
 * Ilustración del panel izquierdo del inicio de sesión: una calculadora frente a una boleta
 * de pago, con monedas. Es SVG en el código (se ve nítida en cualquier tamaño y no depende
 * de archivos externos). Solo decorativa.
 */
export function IlustracionNomina({ className }: { className?: string }) {
  const teclas = ['7', '8', '9', '÷', '4', '5', '6', '×', '1', '2', '3', '−', '0', '.', '%', '+'];
  return (
    <svg viewBox="0 0 360 320" className={className} aria-hidden="true" fill="none">
      {/* Halo de fondo */}
      <circle cx="180" cy="160" r="150" fill="#10b981" opacity="0.08" />
      <circle cx="180" cy="160" r="112" fill="#10b981" opacity="0.06" />

      {/* Boleta de pago (detrás, inclinada) */}
      <g transform="rotate(-9 128 150)">
        <path d="M58 44h132v196l-11 -8 -11 8 -11 -8 -11 8 -11 -8 -11 8 -11 -8 -11 8 -11 -8 -11 8 -11 -8 -11 8z" fill="#f8fafc" />
        <rect x="74" y="62" width="58" height="8" rx="4" fill="#0f172a" opacity="0.85" />
        <rect x="74" y="78" width="88" height="5" rx="2.5" fill="#94a3b8" />
        <rect x="74" y="102" width="60" height="5" rx="2.5" fill="#cbd5e1" />
        <rect x="148" y="102" width="26" height="5" rx="2.5" fill="#cbd5e1" />
        <rect x="74" y="116" width="52" height="5" rx="2.5" fill="#cbd5e1" />
        <rect x="148" y="116" width="26" height="5" rx="2.5" fill="#cbd5e1" />
        <rect x="74" y="130" width="66" height="5" rx="2.5" fill="#cbd5e1" />
        <rect x="148" y="130" width="26" height="5" rx="2.5" fill="#fca5a5" />
        <rect x="74" y="152" width="100" height="1.5" fill="#cbd5e1" />
        <rect x="74" y="162" width="40" height="7" rx="3.5" fill="#0f172a" opacity="0.8" />
        <rect x="136" y="160" width="38" height="11" rx="3" fill="#10b981" />
      </g>

      {/* Calculadora */}
      <g transform="translate(150 70)">
        <rect width="150" height="206" rx="20" fill="#1e293b" />
        <rect x="1" y="1" width="148" height="204" rx="19" stroke="#334155" strokeWidth="2" />
        {/* Pantalla */}
        <rect x="16" y="16" width="118" height="44" rx="10" fill="#064e3b" />
        <text
          x="124"
          y="46"
          textAnchor="end"
          fill="#6ee7b7"
          fontFamily="ui-monospace, SFMono-Regular, Menlo, Consolas, monospace"
          fontSize="18"
          fontWeight="600"
        >
          Q 1,500.00
        </text>
        {/* Teclas */}
        {teclas.map((t, i) => {
          const x = 16 + (i % 4) * 30;
          const y = 74 + Math.floor(i / 4) * 30;
          const operador = i % 4 === 3;
          return (
            <g key={t + i}>
              <rect x={x} y={y} width="24" height="24" rx="7" fill={operador ? '#334155' : '#273449'} />
              <text
                x={x + 12}
                y={y + 16.5}
                textAnchor="middle"
                fill={operador ? '#6ee7b7' : '#cbd5e1'}
                fontFamily="ui-sans-serif, system-ui, sans-serif"
                fontSize="12"
                fontWeight="600"
              >
                {t}
              </text>
            </g>
          );
        })}
      </g>

      {/* Monedas */}
      <g transform="translate(70 240)">
        <ellipse cx="34" cy="30" rx="30" ry="10" fill="#b45309" />
        <rect x="4" y="18" width="60" height="12" fill="#d97706" />
        <ellipse cx="34" cy="18" rx="30" ry="10" fill="#b45309" />
        <rect x="4" y="6" width="60" height="12" fill="#f59e0b" />
        <ellipse cx="34" cy="6" rx="30" ry="10" fill="#fbbf24" />
        <text
          x="34"
          y="10.5"
          textAnchor="middle"
          fill="#92400e"
          fontFamily="ui-sans-serif, system-ui, sans-serif"
          fontSize="12"
          fontWeight="700"
        >
          Q
        </text>
      </g>
      <g transform="translate(28 262)">
        <ellipse cx="22" cy="14" rx="20" ry="7" fill="#047857" />
        <rect x="2" y="6" width="40" height="8" fill="#059669" />
        <ellipse cx="22" cy="6" rx="20" ry="7" fill="#34d399" />
      </g>

      {/* Destellos */}
      <path d="M318 58l3 8 8 3-8 3-3 8-3-8-8-3 8-3z" fill="#34d399" opacity="0.7" />
      <path d="M44 96l2 5 5 2-5 2-2 5-2-5-5-2 5-2z" fill="#fbbf24" opacity="0.7" />
    </svg>
  );
}
