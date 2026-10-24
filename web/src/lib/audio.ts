// 聖誕趴廚藝競賽專屬 Web Audio 音訊與音效引擎
// 100% 純代碼內嵌合成，零外部依賴、零延遲、絕不 404

class AudioManager {
  private ctx: AudioContext | null = null
  private bgmGain: GainNode | null = null
  private isBgmPlaying = false
  private bgmTimer: number | null = null
  private muted = false

  // 初始化或解鎖 AudioContext (需由使用者互動觸發)
  public init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      this.ctx = new AudioCtx()
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume()
    }
  }

  // 是否已解鎖並可播放
  public isReady(): boolean {
    return !!this.ctx && this.ctx.state === 'running'
  }

  // 靜音切換
  public toggleMute(): boolean {
    this.muted = !this.muted
    if (this.bgmGain) {
      this.bgmGain.gain.setValueAtTime(this.muted ? 0 : 0.2, this.ctx?.currentTime || 0)
    }
    return this.muted
  }

  public isMuted(): boolean {
    return this.muted
  }

  // 1. 盛大勝利號角 (Victory Fanfare) - 頒獎與揭曉瞬間專屬
  public playFanfare() {
    this.init()
    if (!this.ctx || this.muted) return

    const now = this.ctx.currentTime
    // 勝利號角大三和弦序曲 (C4 -> G4 -> C5 -> E5 -> G5)
    const notes = [
      { freq: 261.63, start: 0, dur: 0.18 },      // C4
      { freq: 392.00, start: 0.15, dur: 0.18 },   // G4
      { freq: 523.25, start: 0.30, dur: 0.22 },   // C5
      { freq: 659.25, start: 0.50, dur: 0.22 },   // E5
      { freq: 783.99, start: 0.72, dur: 1.2 },    // G5 (高亢主音長奏)
      { freq: 1046.50, start: 0.72, dur: 1.2 },   // C6 (高八度和聲)
    ]

    notes.forEach(({ freq, start, dur }) => {
      if (!this.ctx) return
      const osc = this.ctx.createOscillator()
      const gain = this.ctx.createGain()
      const filter = this.ctx.createBiquadFilter()

      // 模擬溫暖銅管音色 (鋸齒波 + 低通濾波)
      osc.type = 'sawtooth'
      osc.frequency.setValueAtTime(freq, now + start)

      filter.type = 'lowpass'
      filter.frequency.setValueAtTime(1800, now + start)
      filter.frequency.exponentialRampToValueAtTime(800, now + start + dur)

      gain.gain.setValueAtTime(0, now + start)
      gain.gain.linearRampToValueAtTime(0.28, now + start + 0.04)
      gain.gain.exponentialRampToValueAtTime(0.001, now + start + dur)

      osc.connect(filter)
      filter.connect(gain)
      gain.connect(this.ctx.destination)

      osc.start(now + start)
      osc.stop(now + start + dur)
    })
  }

  // 2. 彩帶禮炮與微光星辰音效 (Celebration Pop & Shimmer)
  public playConfettiPop() {
    this.init()
    if (!this.ctx || this.muted) return

    const now = this.ctx.currentTime

    // 低頻咚響
    const osc = this.ctx.createOscillator()
    const gain = this.ctx.createGain()
    osc.frequency.setValueAtTime(160, now)
    osc.frequency.exponentialRampToValueAtTime(40, now + 0.25)
    gain.gain.setValueAtTime(0.35, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25)

    osc.connect(gain)
    gain.connect(this.ctx.destination)
    osc.start(now)
    osc.stop(now + 0.25)

    // 晶瑩彩帶微光閃爍 (Bell Shimmer)
    const sparkles = [1200, 1600, 2200, 2800]
    sparkles.forEach((freq, idx) => {
      if (!this.ctx) return
      const sOsc = this.ctx.createOscillator()
      const sGain = this.ctx.createGain()
      const sStart = now + 0.05 + idx * 0.04

      sOsc.type = 'sine'
      sOsc.frequency.setValueAtTime(freq, sStart)
      sGain.gain.setValueAtTime(0.12, sStart)
      sGain.gain.exponentialRampToValueAtTime(0.001, sStart + 0.3)

      sOsc.connect(sGain)
      sGain.connect(this.ctx.destination)
      sOsc.start(sStart)
      sOsc.stop(sStart + 0.3)
    })
  }

  // 3. 水晶清脆叮噹聲 (Chime) - 分頁與按鈕切換專屬
  public playChime() {
    this.init()
    if (!this.ctx || this.muted) return

    const now = this.ctx.currentTime
    const notes = [1318.51, 1760.00] // E6 -> A6 水晶雙音

    notes.forEach((freq, idx) => {
      if (!this.ctx) return
      const osc = this.ctx.createOscillator()
      const gain = this.ctx.createGain()
      const start = now + idx * 0.08

      osc.type = 'sine'
      osc.frequency.setValueAtTime(freq, start)

      gain.gain.setValueAtTime(0.18, start)
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.4)

      osc.connect(gain)
      gain.connect(this.ctx.destination)
      osc.start(start)
      osc.stop(start + 0.4)
    })
  }

  // 4. 溫馨聖誕微光背景音樂循環 (Airy Celebration BGM)
  public startBGM() {
    this.init()
    if (!this.ctx || this.isBgmPlaying) return

    this.isBgmPlaying = true
    if (!this.bgmGain) {
      this.bgmGain = this.ctx.createGain()
      this.bgmGain.gain.setValueAtTime(this.muted ? 0 : 0.18, this.ctx.currentTime)
      this.bgmGain.connect(this.ctx.destination)
    }

    // 和弦進行 (Cmaj7 -> Am9 -> Fmaj7 -> Gsus4)，溫馨聖誕輕快旋律
    const progression = [
      [261.63, 329.63, 392.00, 493.88], // Cmaj7
      [220.00, 261.63, 329.63, 392.00], // Am9
      [174.61, 261.63, 329.63, 349.23], // Fmaj7
      [196.00, 261.63, 293.66, 392.00], // Gsus4
    ]

    let step = 0
    const playChordStep = () => {
      if (!this.isBgmPlaying || !this.ctx || !this.bgmGain) return

      const now = this.ctx.currentTime
      const chord = progression[step % progression.length]

      // 播放溫暖琶音
      chord.forEach((freq, idx) => {
        if (!this.ctx || !this.bgmGain) return
        const osc = this.ctx.createOscillator()
        const noteGain = this.ctx.createGain()

        osc.type = 'triangle'
        osc.frequency.setValueAtTime(freq, now + idx * 0.15)

        noteGain.gain.setValueAtTime(0.08, now + idx * 0.15)
        noteGain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.15 + 1.8)

        osc.connect(noteGain)
        noteGain.connect(this.bgmGain)

        osc.start(now + idx * 0.15)
        osc.stop(now + idx * 0.15 + 1.8)
      })

      // 八音盒清脆高音星鈴 (Celesta Sparkle)
      if (step % 2 === 0 && this.ctx && this.bgmGain) {
        const bell = this.ctx.createOscillator()
        const bellGain = this.ctx.createGain()
        bell.type = 'sine'
        bell.frequency.setValueAtTime(chord[2] * 2, now + 0.6)
        bellGain.gain.setValueAtTime(0.12, now + 0.6)
        bellGain.gain.exponentialRampToValueAtTime(0.001, now + 1.6)

        bell.connect(bellGain)
        bellGain.connect(this.bgmGain)
        bell.start(now + 0.6)
        bell.stop(now + 1.6)
      }

      step++
      this.bgmTimer = window.setTimeout(playChordStep, 2200)
    }

    playChordStep()
  }

  // 停止背景音樂
  public stopBGM() {
    this.isBgmPlaying = false
    if (this.bgmTimer) {
      clearTimeout(this.bgmTimer)
      this.bgmTimer = null
    }
  }

  // 切換背景音樂
  public toggleBGM(): boolean {
    if (this.isBgmPlaying) {
      this.stopBGM()
      return false
    } else {
      this.startBGM()
      return true
    }
  }

  public getBgmPlaying(): boolean {
    return this.isBgmPlaying
  }
}

export const audio = new AudioManager()
