export default function BrandLogo({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const isSm = size === 'sm'
  const isLg = size === 'lg'

  return (
    <div className="flex items-center gap-2.5 select-none group">
      {/* 稜鏡幾何標誌圖標 */}
      <div
        className={`relative flex items-center justify-center shrink-0 bg-white shadow-soft ${
          isSm ? 'w-6 h-6' : isLg ? 'w-10 h-10' : 'w-8 h-8'
        }`}
        style={{ borderRadius: '4px' }}
      >
        <div className="absolute inset-0.5 bg-gradient-to-tr from-[#7FCBB3]/30 via-[#4FAEC8]/20 to-[#ECE2A6]/40 rounded-sm" />
        <div className="w-1.5 h-1.5 rounded-full bg-[#349282] z-10 shadow-sm" />
      </div>

      {/* 品牌文字群 */}
      <div className="flex flex-col text-left">
        <div className="flex items-center gap-1.5 leading-none">
          <span className="font-serif_jp font-bold text-sm tracking-wide text-[#2E7C94]">
            聖誕趴廚藝競賽
          </span>
        </div>
        <span className="font-sans text-[10px] tracking-wider text-[#8A9499] mt-0.5">
          北科崇德青年社 · NTUT Chong De Young Club
        </span>
      </div>
    </div>
  )
}

