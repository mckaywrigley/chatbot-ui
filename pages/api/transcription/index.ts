import FormData from "form-data"
import fetch from "node-fetch"
import nextConnect from "next-connect"
import fs from "fs"
import FFMpeg from "ffmpeg"
import middleware from "@/middleware/middleware"

const handler = nextConnect()

handler.use(middleware)

interface Segment {
  id: number
  seek: number
  start: number
  end: number
  text: string
  tokens: []
  temperature: number
}

interface TranscriptionResult {
  language: string
  duration: number
  text: string
  segments: Segment[]
}

handler.post(async (req: any, res: any) => {
  const audioFile = req.files.audio
  processTranscription(audioFile)
    .then(async data => {
      if (data) {
        const { text, url, duration, textWithTimeStamps } = data
        res.status(200).json({
          text: text,
          url: url,
          duration: duration,
          textWithTimeStamps: textWithTimeStamps
        })
      } else {
        res.status(500).json({
          error: "Error getting transcription"
        })
      }
    })
    .catch(error => {
      console.log("Transcription error: ", error)
      res.status(500).json({
        status: "Failed"
      })
    })
})

interface ITranscriptionResponse {
  text: string
  url?: string
  duration?: number
  textWithTimeStamps?: string
}

const processTranscription = async (
  audio: any
): Promise<ITranscriptionResponse | undefined> => {
  if (audio?.length) {
    if (audio[0]) {
      const audioData = audio[0]
      let format = audioData.mimetype.split("/")[1].split(";")[0]
      let audioFilePath = audioData.filepath

      if (format === "x-m4a" || format === "mp4") {
        audioFilePath = await convertM4aToMp3(audioFilePath)
        format = "mp3"
      }

      const fileName = "audiofile." + format
      const formData = new FormData()

      formData.append("file", fs.createReadStream(audioFilePath), fileName)
      formData.append("model", "whisper-1")
      formData.append("response_format", "verbose_json")
      formData.append(
        "prompt",
        "Preserve any different languages spoken in the audio file. Do not translate."
      )

      const response = await fetch(
        "https://api.openai.com/v1/audio/transcriptions",
        {
          headers: {
            Authorization: `Bearer ${process.env.OPENAI_API_KEY ?? ""}`
          },
          method: "POST",
          body: formData
        }
      )

      const data = await response.json()

      const transcriptionResult = data as TranscriptionResult
      const transcriptionText = transcriptionResult.text

      if (!transcriptionResult.segments) {
        return {
          text: "Error: Transcription results did not contain segments.",
          url: ""
        }
      }

      const segments = transcriptionResult.segments

      const formatToHHMMSS = (seconds: number) => {
        const date = new Date(0)
        date.setSeconds(seconds)
        return date.toISOString().substr(11, 8)
      }

      const segmentsWithTimeStamps = segments.map(segment => {
        return ` ${formatToHHMMSS(segment.start)} ${segment.text}`
      })

      const textWithTimeStamps = segmentsWithTimeStamps.join("")

      if (transcriptionText === "") {
        return { text: "", url: "" }
      }

      return {
        text: transcriptionText,
        textWithTimeStamps: textWithTimeStamps
      }
    }
  }
  return undefined
}

const convertM4aToMp3 = async (inputFilePath: string): Promise<string> => {
  const outputPath = inputFilePath + ".mp3"
  const process = await new FFMpeg(inputFilePath)
  await process.fnExtractSoundToMP3(outputPath)
  return outputPath
}

export const config = {
  api: {
    bodyParser: false
  }
}

export default handler
