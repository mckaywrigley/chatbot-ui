import React, {
  createContext,
  useContext,
  ReactNode,
  Dispatch,
  SetStateAction
} from "react"
import { Tables } from "@/supabase/types"

interface ReportContextType {
  // PROFILE STORE (shared with main context)
  profile: Tables<"profiles"> | null
  setProfile: Dispatch<SetStateAction<Tables<"profiles"> | null>>

  // WORKSPACE STORE (shared with main context)
  selectedWorkspace: Tables<"workspaces"> | null
  setSelectedWorkspace: Dispatch<SetStateAction<Tables<"workspaces"> | null>>

  // REPORT STORE
  reports: Tables<"reports">[]
  setReports: Dispatch<SetStateAction<Tables<"reports">[]>>
  selectedReport: Tables<"reports"> | null
  setSelectedReport: Dispatch<SetStateAction<Tables<"reports"> | null>>

  // REPORT CONTENT STORE
  reportOutline: string
  setReportOutline: Dispatch<SetStateAction<string>>
  reportDraft: string
  setReportDraft: Dispatch<SetStateAction<string>>

  // ACTIVE REPORT STORE
  isGenerating: boolean
  setIsGenerating: Dispatch<SetStateAction<boolean>>
  firstTokenReceived: boolean
  setFirstTokenReceived: Dispatch<SetStateAction<boolean>>
  abortController: AbortController | null
  setAbortController: Dispatch<SetStateAction<AbortController | null>>

  // ATTACHMENTS STORE
  reportFiles: {
    id: string
    name: string
    type: string
    file: File | null
  }[]
  setReportFiles: Dispatch<
    SetStateAction<
      {
        id: string
        name: string
        type: string
        file: File | null
      }[]
    >
  >
  showFilesDisplay: boolean
  setShowFilesDisplay: Dispatch<SetStateAction<boolean>>

  // Selected Files Store
  selectedFiles: {
    protocol: Tables<"files">[]
    papers: Tables<"files">[]
    dataFiles: Tables<"files">[]
  }
  setSelectedFiles: Dispatch<
    SetStateAction<{
      protocol: Tables<"files">[]
      papers: Tables<"files">[]
      dataFiles: Tables<"files">[]
    }>
  >
}

export const ReportContext = createContext<ReportContextType>({
  // PROFILE STORE
  profile: null,
  setProfile: () => {},

  // WORKSPACE STORE
  selectedWorkspace: null,
  setSelectedWorkspace: () => {},

  // REPORT STORE
  reports: [],
  setReports: () => {},
  selectedReport: null,
  setSelectedReport: () => {},

  // REPORT CONTENT STORE
  reportOutline: "",
  setReportOutline: () => {},
  reportDraft: "",
  setReportDraft: () => {},

  // ACTIVE REPORT STORE
  isGenerating: false,
  setIsGenerating: () => {},
  firstTokenReceived: false,
  setFirstTokenReceived: () => {},
  abortController: null,
  setAbortController: () => {},

  // ATTACHMENTS STORE
  reportFiles: [],
  setReportFiles: () => {},
  showFilesDisplay: false,
  setShowFilesDisplay: () => {},

  // Selected Files Store
  selectedFiles: {
    protocol: [],
    papers: [],
    dataFiles: []
  },
  setSelectedFiles: () => {}
})

export const useReportContext = () => useContext(ReportContext)
