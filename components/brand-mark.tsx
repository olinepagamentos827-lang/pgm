export function BrandMark({ size = 18 }: { size?: number }) {
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-full bg-white"
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <svg
        width={size * 0.72}
        height={size * 0.72}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Stylized swirl mark (green + amber) — original brand, not a copied logo */}
        <path
          d="M18 7.5C16.7 6 14.7 5 12.3 5 8.3 5 5.5 7.4 5.5 10.7c0 2.4 1.7 3.8 4.6 4.6"
          stroke="#5bab47"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <path
          d="M6 16.5C7.3 18 9.3 19 11.7 19c4 0 6.8-2.4 6.8-5.7 0-2.4-1.7-3.8-4.6-4.6"
          stroke="#e0a92e"
          strokeWidth="3"
          strokeLinecap="round"
        />
      </svg>
    </span>
  )
}
