import { toast } from "sonner"

class SingletonAudioPlayer {
  private static instance: SingletonAudioPlayer
  private audio: HTMLAudioElement | null = null
  private isLoading: boolean = false
  private isPlaying: boolean = false
  private subscribers: ((isLoading: boolean, isPlaying: boolean) => void)[] = []
  private abortController: AbortController | null = null

  private constructor() {}

  public static getInstance(): SingletonAudioPlayer {
    if (!SingletonAudioPlayer.instance) {
      SingletonAudioPlayer.instance = new SingletonAudioPlayer()
    }
    return SingletonAudioPlayer.instance
  }

  private notifySubscribers() {
    this.subscribers.forEach(subscriber =>
      subscriber(this.isLoading, this.isPlaying)
    )
  }

  public subscribe(
    subscriber: (isLoading: boolean, isPlaying: boolean) => void
  ) {
    this.subscribers.push(subscriber)
    // Immediately notify new subscriber of current state
    subscriber(this.isLoading, this.isPlaying)
  }

  public unsubscribe(
    subscriber: (isLoading: boolean, isPlaying: boolean) => void
  ) {
    this.subscribers = this.subscribers.filter(sub => sub !== subscriber)
  }

  public async playAudio(messageContent: string) {
    if (this.audio) {
      this.audio.pause()
      this.audio.currentTime = 0
      this.audio = null
    }

    if (this.abortController) {
      this.abortController.abort()
    }
    this.abortController = new AbortController()

    this.isLoading = true
    this.isPlaying = false
    this.notifySubscribers()

    try {
      const response = await fetch("/api/v2/chat/text-to-speech", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ text: messageContent }),
        signal: this.abortController.signal
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message)
      }

      const audioBlob = await response.blob()
      const audioUrl = URL.createObjectURL(audioBlob)
      this.audio = new Audio(audioUrl)

      this.audio.onended = () => {
        this.isPlaying = false
        this.notifySubscribers()
      }

      this.audio
        .play()
        .then(() => {
          this.isLoading = false
          this.isPlaying = true
          this.notifySubscribers()
        })
        .catch(error => {
          console.error("Error playing audio:", error)
          this.isLoading = false
          this.isPlaying = false
          this.notifySubscribers()
        })
    } catch (error: any) {
      if (error.name !== "AbortError") {
        console.error("Error generating speech:", error)
        toast.error(error.message)
      }
      this.isLoading = false
      this.isPlaying = false
      this.notifySubscribers()
    }
  }

  public stopAudio() {
    if (this.audio) {
      this.audio.pause()
      this.audio.currentTime = 0
      this.audio = null
    }
    if (this.abortController) {
      this.abortController.abort()
      this.abortController = null
    }
    this.isPlaying = false
    this.notifySubscribers()
  }
}

export default SingletonAudioPlayer.getInstance()
