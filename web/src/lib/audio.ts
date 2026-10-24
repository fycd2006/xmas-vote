// 聖誕趴廚藝競賽專屬 Web Audio 音訊與音效引擎
// 100% 純代碼內嵌合成，零外部依賴、零延遲、絕不 404
// 風格：歡樂、熱鬧、輕快且充滿慶典感的頒獎現場進行曲與勝利號角

const N = {
  C2: 65.41,
  E2: 82.41,
  F2: 87.31,
  G2: 98.00,
  A2: 110.00,
  B2: 123.47,
  C3: 130.81,
  D3: 146.83,
  E3: 164.81,
  F3: 174.61,
  G3: 196.00,
  A3: 220.00,
  B3: 246.94,
  C4: 261.63,
  D4: 293.66,
  E4: 329.63,
  F4: 349.23,
  G4: 392.00,
  A4: 440.00,
  B4: 493.88,
  C5: 523.25,
  D5: 587.33,
  E5: 659.25,
  F5: 698.46,
  G5: 783.99,
  A5: 880.00,
  B5: 987.77,
  C6: 1046.50,
  D6: 1174.66,
  E6: 1318.51,
  G6: 1567.98,
  C7: 2093.00,
}

class AudioManager {
  private ctx: AudioContext | null = null
  private bgmGain: GainNode | null = null
  private isBgmPlaying = false
  private bgmTimer: number | null = null
  private muted = false
  private noiseBuffer: AudioBuffer | null = null

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

  public isReady(): boolean {
    return !!this.ctx && this.ctx.state === 'running'
  }

  // 靜音切換
  public toggleMute(): boolean {
    this.muted = !this.muted
    if (this.bgmGain) {
      this.bgmGain.gain.setValueAtTime(this.muted ? 0 : 0.22, this.ctx?.currentTime || 0)
    }
    return this.muted
  }

  public isMuted(): boolean {
    return this.muted
  }

  // 取得共用白噪聲緩衝區（用於打擊樂鼓點、手拍掌與節慶沙鈴）
  private getNoiseBuffer(): AudioBuffer | null {
    if (!this.ctx) return null
    if (!this.noiseBuffer) {
      const sampleRate = this.ctx.sampleRate
      const bufferSize = Math.floor(sampleRate * 0.4) // 400ms
      const buffer = this.ctx.createBuffer(1, bufferSize, sampleRate)
      const data = buffer.getChannelData(0)
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1
      }
      this.noiseBuffer = buffer
    }
    return this.noiseBuffer
  }

  // ----------------- 音效產生器 -----------------

  // 1. 盛大勝利號角 (Victory Fanfare) - 揭曉第一名瞬間專屬
  public playFanfare() {
    this.init()
    if (!this.ctx || this.muted) return

    const now = this.ctx.currentTime

    // 歡樂高亢的號角旋律序曲 (G4 -> C5 -> E5 -> G5 -> E5 -> G5 -> C6 -> A5 -> B5 -> C6 -> 大和弦齊鳴)
    const fanfareNotes = [
      // 樂句 1：躍動上揚
      { f: N.G4, t: 0.00, d: 0.12, v: 0.25 },
      { f: N.C5, t: 0.12, d: 0.12, v: 0.28 },
      { f: N.E5, t: 0.24, d: 0.12, v: 0.28 },
      { f: N.G5, t: 0.36, d: 0.32, v: 0.35 },

      // 樂句 2：再度揚起
      { f: N.E5, t: 0.72, d: 0.12, v: 0.26 },
      { f: N.G5, t: 0.84, d: 0.12, v: 0.30 },
      { f: N.C6, t: 0.96, d: 0.38, v: 0.38 },

      // 樂句 3：歡樂進行步調
      { f: N.A5, t: 1.40, d: 0.12, v: 0.28 },
      { f: N.B5, t: 1.52, d: 0.12, v: 0.28 },
      { f: N.C6, t: 1.64, d: 0.14, v: 0.32 },
      { f: N.D6, t: 1.78, d: 0.14, v: 0.32 },
      { f: N.E6, t: 1.92, d: 0.20, v: 0.36 },

      // 樂句 4：榮耀大三和弦高潮齊鳴 (C4 + G4 + C5 + E5 + G5 + C6)
      { f: N.C4, t: 2.15, d: 1.8, v: 0.25 },
      { f: N.G4, t: 2.15, d: 1.8, v: 0.25 },
      { f: N.C5, t: 2.15, d: 1.8, v: 0.28 },
      { f: N.E5, t: 2.15, d: 1.8, v: 0.28 },
      { f: N.G5, t: 2.15, d: 1.8, v: 0.30 },
      { f: N.C6, t: 2.15, d: 2.0, v: 0.35 },
    ]

    fanfareNotes.forEach(({ f, t, d, v }) => {
      if (!this.ctx) return
      // 雙振盪器雙音模擬飽滿金色小號
      ;[-3, 3].forEach(detune => {
        if (!this.ctx) return
        const osc = this.ctx.createOscillator()
        const gain = this.ctx.createGain()
        const filter = this.ctx.createBiquadFilter()

        osc.type = 'sawtooth'
        osc.frequency.setValueAtTime(f, now + t)
        osc.detune.setValueAtTime(detune, now + t)

        filter.type = 'lowpass'
        filter.frequency.setValueAtTime(2200, now + t)
        filter.frequency.exponentialRampToValueAtTime(750, now + t + d)

        gain.gain.setValueAtTime(0, now + t)
        gain.gain.linearRampToValueAtTime(v * 0.5, now + t + 0.025)
        gain.gain.exponentialRampToValueAtTime(0.001, now + t + d)

        osc.connect(filter)
        filter.connect(gain)
        gain.connect(this.ctx.destination)

        osc.start(now + t)
        osc.stop(now + t + d + 0.05)
      })
    })

    // 定音鼓轟鳴底音 (Timpani Boom)
    const timpaniTimes = [0.00, 0.72, 1.40, 2.15]
    timpaniTimes.forEach(t => {
      if (!this.ctx) return
      const tOsc = this.ctx.createOscillator()
      const tGain = this.ctx.createGain()
      tOsc.type = 'sine'
      tOsc.frequency.setValueAtTime(130, now + t)
      tOsc.frequency.exponentialRampToValueAtTime(45, now + t + 0.3)
      tGain.gain.setValueAtTime(0.35, now + t)
      tGain.gain.exponentialRampToValueAtTime(0.001, now + t + 0.35)
      tOsc.connect(tGain)
      tGain.connect(this.ctx.destination)
      tOsc.start(now + t)
      tOsc.stop(now + t + 0.4)
    })

    // 晶瑩星芒鐘琴碎音 (Celebration Sparkles)
    const sparkles = [
      { f: N.E6, t: 2.25 },
      { f: N.G6, t: 2.38 },
      { f: N.C7, t: 2.52 },
    ]
    sparkles.forEach(({ f, t }) => {
      if (!this.ctx) return
      const sOsc = this.ctx.createOscillator()
      const sGain = this.ctx.createGain()
      sOsc.type = 'sine'
      sOsc.frequency.setValueAtTime(f, now + t)
      sGain.gain.setValueAtTime(0.2, now + t)
      sGain.gain.exponentialRampToValueAtTime(0.001, now + t + 0.6)
      sOsc.connect(sGain)
      sGain.connect(this.ctx.destination)
      sOsc.start(now + t)
      sOsc.stop(now + t + 0.6)
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
    osc.frequency.setValueAtTime(180, now)
    osc.frequency.exponentialRampToValueAtTime(40, now + 0.25)
    gain.gain.setValueAtTime(0.4, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25)

    osc.connect(gain)
    gain.connect(this.ctx.destination)
    osc.start(now)
    osc.stop(now + 0.25)

    // 晶瑩彩帶微光閃爍 (Bell Shimmer)
    const sparkles = [1318.51, 1567.98, 2093.00, 2637.02]
    sparkles.forEach((freq, idx) => {
      if (!this.ctx) return
      const sOsc = this.ctx.createOscillator()
      const sGain = this.ctx.createGain()
      const sStart = now + 0.04 + idx * 0.04

      sOsc.type = 'sine'
      sOsc.frequency.setValueAtTime(freq, sStart)
      sGain.gain.setValueAtTime(0.15, sStart)
      sGain.gain.exponentialRampToValueAtTime(0.001, sStart + 0.35)

      sOsc.connect(sGain)
      sGain.connect(this.ctx.destination)
      sOsc.start(sStart)
      sOsc.stop(sStart + 0.35)
    })
  }

  // 3. 水晶清脆叮噹聲 (Chime) - 分頁與按鈕切換專屬
  public playChime() {
    this.init()
    if (!this.ctx || this.muted) return

    const now = this.ctx.currentTime
    const notes = [N.E6, N.A5 * 2] // 水晶雙音

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

  // ----------------- 歡樂頒獎進行曲背景音樂 (126 BPM 歡樂跳動進行曲) -----------------

  private playKick(time: number) {
    if (!this.ctx || !this.bgmGain) return
    const osc = this.ctx.createOscillator()
    const gain = this.ctx.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(140, time)
    osc.frequency.exponentialRampToValueAtTime(40, time + 0.08)
    gain.gain.setValueAtTime(0.24, time)
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.1)
    osc.connect(gain)
    gain.connect(this.bgmGain)
    osc.start(time)
    osc.stop(time + 0.12)
  }

  private playSnare(time: number) {
    if (!this.ctx || !this.bgmGain) return
    const noise = this.getNoiseBuffer()
    if (!noise) return
    const src = this.ctx.createBufferSource()
    src.buffer = noise
    const filter = this.ctx.createBiquadFilter()
    filter.type = 'bandpass'
    filter.frequency.setValueAtTime(1700, time)
    filter.Q.setValueAtTime(1.4, time)
    const gain = this.ctx.createGain()
    gain.gain.setValueAtTime(0.16, time)
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.11)
    src.connect(filter)
    filter.connect(gain)
    gain.connect(this.bgmGain)
    src.start(time)
    src.stop(time + 0.12)
  }

  private playShaker(time: number) {
    if (!this.ctx || !this.bgmGain) return
    const noise = this.getNoiseBuffer()
    if (!noise) return
    const src = this.ctx.createBufferSource()
    src.buffer = noise
    const filter = this.ctx.createBiquadFilter()
    filter.type = 'highpass'
    filter.frequency.setValueAtTime(6000, time)
    const gain = this.ctx.createGain()
    gain.gain.setValueAtTime(0.05, time)
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.05)
    src.connect(filter)
    filter.connect(gain)
    gain.connect(this.bgmGain)
    src.start(time)
    src.stop(time + 0.06)
  }

  private playBass(freq: number, time: number, dur = 0.22) {
    if (!this.ctx || !this.bgmGain) return
    const osc = this.ctx.createOscillator()
    const filter = this.ctx.createBiquadFilter()
    const gain = this.ctx.createGain()
    osc.type = 'triangle'
    osc.frequency.setValueAtTime(freq, time)
    filter.type = 'lowpass'
    filter.frequency.setValueAtTime(480, time)
    gain.gain.setValueAtTime(0, time)
    gain.gain.linearRampToValueAtTime(0.20, time + 0.015)
    gain.gain.exponentialRampToValueAtTime(0.001, time + dur)
    osc.connect(filter)
    filter.connect(gain)
    gain.connect(this.bgmGain)
    osc.start(time)
    osc.stop(time + dur + 0.02)
  }

  private playChordStab(freqs: number[], time: number, dur = 0.16) {
    if (!this.ctx || !this.bgmGain) return
    freqs.forEach(freq => {
      if (!this.ctx || !this.bgmGain) return
      const osc = this.ctx.createOscillator()
      const filter = this.ctx.createBiquadFilter()
      const gain = this.ctx.createGain()
      osc.type = 'sawtooth'
      osc.frequency.setValueAtTime(freq, time)
      filter.type = 'lowpass'
      filter.frequency.setValueAtTime(1400, time)
      filter.frequency.exponentialRampToValueAtTime(500, time + dur)
      gain.gain.setValueAtTime(0, time)
      gain.gain.linearRampToValueAtTime(0.05, time + 0.012)
      gain.gain.exponentialRampToValueAtTime(0.001, time + dur)
      osc.connect(filter)
      filter.connect(gain)
      gain.connect(this.bgmGain)
      osc.start(time)
      osc.stop(time + dur + 0.02)
    })
  }

  private playLead(freq: number, time: number, dur = 0.28) {
    if (!this.ctx || !this.bgmGain) return
    const osc1 = this.ctx.createOscillator()
    const osc2 = this.ctx.createOscillator()
    const gain = this.ctx.createGain()

    osc1.type = 'sine'
    osc1.frequency.setValueAtTime(freq, time)

    osc2.type = 'triangle'
    osc2.frequency.setValueAtTime(freq * 2, time)

    gain.gain.setValueAtTime(0, time)
    gain.gain.linearRampToValueAtTime(0.12, time + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.001, time + dur)

    osc1.connect(gain)
    osc2.connect(gain)
    gain.connect(this.bgmGain)

    osc1.start(time)
    osc1.stop(time + dur + 0.02)
    osc2.start(time)
    osc2.stop(time + dur + 0.02)
  }

  // 排程 8 小節歡樂頒獎進行曲循環
  private scheduleJoyfulLoop(startTime: number) {
    if (!this.isBgmPlaying || !this.ctx || !this.bgmGain) return

    const beat = 0.476 // 126 BPM (四分音符時長)
    const halfBeat = beat / 2 // 八分音符時長

    // 8 小節結構定義
    const bars = [
      // 小節 0: C Major (活力歡樂開場)
      {
        bass: [{ f: N.C3, b: 0 }, { f: N.G2, b: 2 }, { f: N.C3, b: 3 }],
        chord: [N.C4, N.E4, N.G4],
        melody: [
          { f: N.G4, b: 0.0, d: 0.2 },
          { f: N.C5, b: 0.5, d: 0.2 },
          { f: N.D5, b: 1.0, d: 0.2 },
          { f: N.E5, b: 1.5, d: 0.2 },
          { f: N.G5, b: 2.0, d: 0.42 },
          { f: N.E5, b: 3.0, d: 0.35 }
        ]
      },
      // 小節 1: F Major (溫暖雀躍)
      {
        bass: [{ f: N.F2, b: 0 }, { f: N.C3, b: 2 }, { f: N.F3, b: 3 }],
        chord: [N.C4, N.F4, N.A4],
        melody: [
          { f: N.A5, b: 0.0, d: 0.4 },
          { f: N.C6, b: 1.0, d: 0.4 },
          { f: N.G5, b: 2.0, d: 0.35 },
          { f: N.E5, b: 3.0, d: 0.35 }
        ]
      },
      // 小節 2: G Major (步調攀升)
      {
        bass: [{ f: N.G2, b: 0 }, { f: N.D3, b: 2 }, { f: N.G3, b: 3 }],
        chord: [N.D4, N.G4, N.B4],
        melody: [
          { f: N.D5, b: 0.0, d: 0.2 },
          { f: N.E5, b: 0.5, d: 0.2 },
          { f: N.F5, b: 1.0, d: 0.2 },
          { f: N.A5, b: 1.5, d: 0.2 },
          { f: N.G5, b: 2.0, d: 0.42 },
          { f: N.B5, b: 3.0, d: 0.35 }
        ]
      },
      // 小節 3: C Major (榮耀鐘琴落點)
      {
        bass: [{ f: N.C3, b: 0 }, { f: N.E3, b: 1 }, { f: N.G3, b: 2 }, { f: N.C4, b: 3 }],
        chord: [N.E4, N.G4, N.C5],
        melody: [
          { f: N.C6, b: 0.0, d: 0.65 },
          { f: N.G5, b: 1.5, d: 0.2 },
          { f: N.E5, b: 2.0, d: 0.25 },
          { f: N.C5, b: 3.0, d: 0.35 }
        ]
      },
      // 小節 4: Am -> F (節慶豐富層次)
      {
        bass: [{ f: N.A2, b: 0 }, { f: N.E3, b: 1 }, { f: N.F2, b: 2 }, { f: N.C3, b: 3 }],
        chord: [N.C4, N.E4, N.A4],
        melody: [
          { f: N.E5, b: 0.0, d: 0.2 },
          { f: N.D5, b: 0.5, d: 0.2 },
          { f: N.C5, b: 1.0, d: 0.2 },
          { f: N.A4, b: 1.5, d: 0.2 },
          { f: N.C5, b: 2.0, d: 0.35 },
          { f: N.E5, b: 3.0, d: 0.35 }
        ]
      },
      // 小節 5: Dm -> G (俏皮向前推進)
      {
        bass: [{ f: N.D3, b: 0 }, { f: N.A2, b: 1 }, { f: N.G2, b: 2 }, { f: N.D3, b: 3 }],
        chord: [N.D4, N.F4, N.A4],
        melody: [
          { f: N.F5, b: 0.0, d: 0.38 },
          { f: N.G5, b: 1.0, d: 0.38 },
          { f: N.A5, b: 2.0, d: 0.35 },
          { f: N.B5, b: 3.0, d: 0.35 }
        ]
      },
      // 小節 6: C/E -> F (慶典高潮前奏)
      {
        bass: [{ f: N.E2, b: 0 }, { f: N.G2, b: 1 }, { f: N.F2, b: 2 }, { f: N.A2, b: 3 }],
        chord: [N.E4, N.G4, N.C5],
        melody: [
          { f: N.C6, b: 0.0, d: 0.2 },
          { f: N.B5, b: 0.5, d: 0.2 },
          { f: N.A5, b: 1.0, d: 0.2 },
          { f: N.G5, b: 1.5, d: 0.2 },
          { f: N.A5, b: 2.0, d: 0.35 },
          { f: N.C6, b: 3.0, d: 0.35 }
        ]
      },
      // 小節 7: G7 -> C 凱旋大收尾
      {
        bass: [{ f: N.G2, b: 0 }, { f: N.G3, b: 1 }, { f: N.G2, b: 2 }, { f: N.B2, b: 3 }],
        chord: [N.F4, N.G4, N.B4, N.D5],
        melody: [
          { f: N.D6, b: 0.0, d: 0.35 },
          { f: N.E6, b: 1.0, d: 0.4 },
          { f: N.C6, b: 2.0, d: 0.8 }
        ]
      }
    ]

    bars.forEach((bar, mIdx) => {
      const mTime = startTime + mIdx * (4 * beat)

      // 1. 鼓組 (每個小節的踩大鼓與歡呼小鼓)
      this.playKick(mTime + 0 * beat)
      this.playSnare(mTime + 1 * beat)
      this.playKick(mTime + 2 * beat)
      this.playKick(mTime + 2.5 * beat) // 切分歡樂彈跳
      this.playSnare(mTime + 3 * beat)

      // 2. 節慶高音鈴鐺沙鈴 (每半拍輕盈搖響)
      for (let s = 0; s < 8; s++) {
        this.playShaker(mTime + s * halfBeat)
      }

      // 3. 低音貝斯走弦
      bar.bass.forEach(({ f, b }) => {
        this.playBass(f, mTime + b * beat)
      })

      // 4. 反拍輕快銅管節奏 (Offbeat Stabs on 0.5, 1.5, 2.5, 3.5)
      for (let c = 0; c < 4; c++) {
        this.playChordStab(bar.chord, mTime + (c + 0.5) * beat)
      }

      // 5. 歡樂旋律 (主音鐘琴)
      bar.melody.forEach(({ f, b, d }) => {
        this.playLead(f, mTime + b * beat, d)
      })
    })

    // 8 小節總時長
    const totalLoopDuration = 8 * 4 * beat
    // 提前 300ms 預先排程下一循環
    this.bgmTimer = window.setTimeout(() => {
      if (this.isBgmPlaying && this.ctx) {
        this.scheduleJoyfulLoop(startTime + totalLoopDuration)
      }
    }, Math.max(0, (totalLoopDuration - 0.3) * 1000))
  }

  // 4. 啟動歡樂頒獎進行曲背景音樂
  public startBGM() {
    this.init()
    if (!this.ctx || this.isBgmPlaying) return

    this.isBgmPlaying = true
    if (!this.bgmGain) {
      this.bgmGain = this.ctx.createGain()
      this.bgmGain.connect(this.ctx.destination)
    }

    const now = this.ctx.currentTime
    this.bgmGain.gain.cancelScheduledValues(now)
    this.bgmGain.gain.setValueAtTime(0, now)
    this.bgmGain.gain.linearRampToValueAtTime(this.muted ? 0 : 0.22, now + 0.3)

    // 從當前時間起算排程歡樂循環
    this.scheduleJoyfulLoop(now + 0.05)
  }

  // 停止背景音樂 (平滑淡出)
  public stopBGM() {
    this.isBgmPlaying = false
    if (this.bgmTimer) {
      clearTimeout(this.bgmTimer)
      this.bgmTimer = null
    }
    if (this.ctx && this.bgmGain) {
      const now = this.ctx.currentTime
      this.bgmGain.gain.cancelScheduledValues(now)
      this.bgmGain.gain.linearRampToValueAtTime(0, now + 0.2)
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
