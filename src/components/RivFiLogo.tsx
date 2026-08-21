type RivFiLogoProps = {
  size?: number
  showName?: boolean
  className?: string
}

function RivFiLogo({
  size = 42,
  showName = true,
  className = '',
}: RivFiLogoProps) {
  return (
    <div className={`rivfi-logo ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <defs>
          <linearGradient
            id="rivfi-logo-gradient"
            x1="10"
            y1="10"
            x2="54"
            y2="54"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#66FFC2" />
            <stop offset="0.48" stopColor="#00D99A" />
            <stop offset="1" stopColor="#079C70" />
          </linearGradient>

          <filter
            id="rivfi-logo-glow"
            x="-50%"
            y="-50%"
            width="200%"
            height="200%"
          >
            <feGaussianBlur stdDeviation="1.8" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <g
          stroke="url(#rivfi-logo-gradient)"
          strokeWidth="5.5"
          strokeLinecap="round"
          fill="none"
          filter="url(#rivfi-logo-glow)"
        >
          <path d="M13 22C20 11 36 9 47 17C58 25 57 40 47 49C37 58 21 55 14 45" />
          <path d="M18 16C29 10 43 14 50 24C57 35 51 48 40 53C29 58 16 52 12 41" />
          <path d="M12 29C17 18 31 14 42 19C54 24 58 37 51 47C44 57 30 58 20 51" />
        </g>
      </svg>

      {showName && (
        <span className="rivfi-logo-name">
          Riv<span>Fi</span>
        </span>
      )}
    </div>
  )
}

export default RivFiLogo