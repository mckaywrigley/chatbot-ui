"use client"

import { FC } from "react"
import { UseCaseCard } from "./use-case-card"

type UseCase = "design" | "validate" | "explore" | "browse"

const USE_CASE_OPTIONS: {
  value: UseCase
  title: string
  description: string
}[] = [
  {
    value: "design",
    title: "Design a new experiment",
    description: "Turn a research question into a structured plan."
  },
  {
    value: "validate",
    title: "Validate a hypothesis",
    description: "Pressure-test an idea and refine your approach."
  },
  {
    value: "explore",
    title: "Explore & brainstorm",
    description: "Search literature and generate new directions."
  },
  {
    value: "browse",
    title: "Just looking around",
    description: "See what Shadow AI can do before committing."
  }
]

interface UseCaseStepProps {
  /** Multiple use-cases can be selected. */
  useCases: UseCase[]
  onToggle: (value: UseCase) => void
}

export const UseCaseStep: FC<UseCaseStepProps> = ({ useCases, onToggle }) => {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {USE_CASE_OPTIONS.map(option => (
        <UseCaseCard
          key={option.value}
          title={option.title}
          description={option.description}
          selected={useCases.includes(option.value)}
          onClick={() => onToggle(option.value)}
        />
      ))}
    </div>
  )
}
