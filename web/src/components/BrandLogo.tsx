export default function BrandLogo({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const isSm = size === 'sm'
  const isLg = size === 'lg'

  const iconSize = isSm ? 24 : isLg ? 36 : 28

  return (
    <div className="flex items-center gap-2.5 sm:gap-3 select-none group">
      {/* 典雅星芒微光品牌徽標 */}
      <div className="shrink-0 flex items-center justify-center">
        <svg
          width={iconSize}
          height={iconSize}
          viewBox="0 0 32 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="transition-transform duration-300 group-hover:scale-105 shadow-sm rounded-lg"
        >
          <rect width="32" height="32" rx="8" fill="url(#fycd-brand-gradient)" />
          {/* 金色光芒與八角微星 */}
          <path
            d="M16 5.5L17.8 12.2L24.5 14L17.8 15.8L16 22.5L14.2 15.8L7.5 14L14.2 12.2L16 5.5Z"
            fill="#FFFFFF"
            fillOpacity="0.95"
          />
          <circle cx="16" cy="14" r="2.5" fill="#ECE2A6" />
          <circle cx="16" cy="25" r="1.5" fill="#FFFFFF" fillOpacity="0.75" />
          <defs>
            <linearGradient id="fycd-brand-gradient" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
              <stop stopColor="#4FAEC8" />
              <stop offset="0.55" stopColor="#349282" />
              <stop offset="1" stopColor="#2E7C94" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {/* 品牌文字群 */}
      <div className="flex flex-col text-left">
        <span className={`font-serif_jp font-bold text-[#2E7C94] tracking-wide leading-tight ${
          isSm ? 'text-xs' : isLg ? 'text-base sm:text-lg' : 'text-sm'
        }`}>
          聖誕趴廚藝競賽
        </span>
        <span className={`font-sans tracking-wider text-[#8A9499] mt-0.5 leading-none ${
          isSm ? 'text-[9px]' : isLg ? 'text-xs' : 'text-[10px]'
        }`}>
          北科崇德青年社 · NTUT Chong De Young Club
        </span>
      </div>
    </div>
  )
}


