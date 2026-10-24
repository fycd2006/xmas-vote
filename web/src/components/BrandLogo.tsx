export default function BrandLogo({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const isSm = size === 'sm'
  const isLg = size === 'lg'

  return (
    <div className="flex items-center gap-2.5 select-none group">
      {/* 稜鏡幾何折射標誌圖標 */}
      <div className={`relative flex items-center justify-center shrink-0 border border-[rgba(79,174,200,0.4)] bg-white/80 ${
        isSm ? 'w-6 h-6' : isLg ? 'w-10 h-10' : 'w-8 h-8'
      }`} style={{ borderRadius: '2px' }}>
        {/* 內層幾何切面 */}
        <div className="absolute inset-1 bg-gradient-to-tr from-[#7FCBB3]/30 via-[#4FAEC8]/25 to-[#ECE2A6]/40 opacity-80" />
        <div className="w-1.5 h-1.5 rounded-full bg-[#349282] z-10 shadow-sm" />
      </div>

      {/* 品牌文字群 */}
      <div className="flex flex-col text-left">
        <div className="flex items-center gap-1.5 leading-none">
          <span className="font-sans font-semibold tracking-[0.2em] text-[#2E7C94] text-xs">
            FYCD
          </span>
          <span className="w-1 h-1 rounded-full bg-[#7FCBB3]" />
          <span className="font-serif_jp font-medium text-xs tracking-wider text-[#3E4347]">
            <span className="text-[#349282]">聖</span>
            <span className="text-[#2E7C94]">誕</span>
            <span>廚藝</span>
          </span>
        </div>
        <span className="font-display italic text-[8.5px] tracking-[0.22em] text-[#8A9499] uppercase mt-0.5">
          culinary banquet
        </span>
      </div>
    </div>
  )
}
