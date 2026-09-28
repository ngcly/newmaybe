/**
 * Web Audio API 白噪音合成引擎 (雨声 / 微风)
 * 零网络请求、零外部音频资源加载，纯数学振荡与频响滤波实时合成
 * 移植自 lab 实验 01 禅意写作空间
 */

class ZenAudioEngine {
  private ctx: AudioContext | null = null;
  private rainNode: { stop: () => void } | null = null;
  private windNode: { stop: () => void } | null = null;

  private initCtx(): AudioContext {
    if (!this.ctx) {
      const AudioCtxClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtxClass();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  private createNoiseBuffer(ctx: AudioContext): AudioBuffer {
    const bufferSize = 2 * ctx.sampleRate;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }
    return noiseBuffer;
  }

  /**
   * 启动/停止雨声合成器
   * 雨声频响滤波：使用带通滤波器 (Bandpass 600Hz, Q 1.2)
   */
  public toggleRain(): boolean {
    if (this.rainNode) {
      this.rainNode.stop();
      this.rainNode = null;
      return false;
    }
    const ctx = this.initCtx();
    const noise = ctx.createBufferSource();
    noise.buffer = this.createNoiseBuffer(ctx);
    noise.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 600;
    filter.Q.value = 1.2;

    const gain = ctx.createGain();
    gain.gain.value = 0.15;

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    noise.start();

    this.rainNode = {
      stop: () => {
        try {
          noise.stop();
          noise.disconnect();
          filter.disconnect();
          gain.disconnect();
        } catch {
          /* ignore audio node cleanup error */
        }
      },
    };
    return true;
  }

  /**
   * 启动/停止微风合成器
   * 微风频响滤波：带通滤波 (Bandpass 750Hz, Q 2.0) + 低频正弦调制 (LFO 0.08Hz +-350Hz) 模拟风息起伏
   */
  public toggleWind(): boolean {
    if (this.windNode) {
      this.windNode.stop();
      this.windNode = null;
      return false;
    }
    const ctx = this.initCtx();
    const noise = ctx.createBufferSource();
    noise.buffer = this.createNoiseBuffer(ctx);
    noise.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 750;
    filter.Q.value = 2.0;

    const gain = ctx.createGain();
    gain.gain.value = 0.2;

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    noise.start();

    // 低频振荡器 (LFO) 来缓慢调节截止频率，产生呼啸的风息起伏效果 (约 12 秒一个周期)
    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = 0.08;
    oscGain.gain.value = 350;

    osc.connect(oscGain);
    oscGain.connect(filter.frequency);
    osc.start();

    this.windNode = {
      stop: () => {
        try {
          noise.stop();
          osc.stop();
          noise.disconnect();
          osc.disconnect();
          oscGain.disconnect();
          filter.disconnect();
          gain.disconnect();
        } catch {
          /* ignore audio node cleanup error */
        }
      },
    };
    return true;
  }

  public stopAll() {
    if (this.rainNode) {
      this.rainNode.stop();
      this.rainNode = null;
    }
    if (this.windNode) {
      this.windNode.stop();
      this.windNode = null;
    }
  }

  public isRainActive(): boolean {
    return this.rainNode !== null;
  }

  public isWindActive(): boolean {
    return this.windNode !== null;
  }
}

export const zenAudio = new ZenAudioEngine();
