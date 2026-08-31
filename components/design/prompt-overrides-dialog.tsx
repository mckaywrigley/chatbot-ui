"use client"

/* eslint-disable tailwindcss/classnames-order */

import { useEffect, useMemo, useState } from "react"
import {
  Context,
  Instructions,
  Constraints,
  Formatting,
  Output,
  prompt
} from "react-prompt-kit"

import {
  designAgentPromptOrder,
  designAgentPromptSchemas
} from "@/lib/design/prompt-schemas"
import {
  AgentPromptOverrides,
  DesignAgentPromptId,
  PromptSectionSchema,
  PromptSectionType
} from "@/types/design-prompts"
import { DesignPlanHypothesis } from "@/types/design-plan"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"

const sectionComponentMap: Record<
  PromptSectionType,
  (props: { children: React.ReactNode }) => JSX.Element
> = {
  context: Context,
  instructions: Instructions,
  constraints: Constraints,
  formatting: Formatting,
  output: Output
}

const tagLabel: Record<PromptSectionType, string> = {
  context: "<context>",
  instructions: "<instructions>",
  constraints: "<constraints>",
  formatting: "<formatting>",
  output: "<output>"
}

const buildInitialOverrides = (): AgentPromptOverrides => {
  return designAgentPromptOrder.reduce<AgentPromptOverrides>((acc, agentId) => {
    const schema = designAgentPromptSchemas[agentId]
    acc[agentId] = {
      sections: schema.sections.reduce<Record<string, string>>(
        (sectionMap, section) => {
          sectionMap[section.id] = section.defaultValue
          return sectionMap
        },
        {}
      ),
      userPrompt: schema.userPrompt?.defaultValue
    }
    return acc
  }, {})
}

const getSectionValue = (
  overrides: AgentPromptOverrides,
  agentId: DesignAgentPromptId,
  section: PromptSectionSchema
) => overrides[agentId]?.sections?.[section.id] ?? section.defaultValue

const PromptSectionEditor = ({
  agentId,
  section,
  value,
  onChange
}: {
  agentId: DesignAgentPromptId
  section: PromptSectionSchema
  value: string
  onChange: (next: string) => void
}) => {
  const TagComponent = sectionComponentMap[section.type] || Context
  const preview = useMemo(
    () =>
      prompt(
        <TagComponent>
          <p>{value}</p>
        </TagComponent>
      ),
    [TagComponent, value]
  )

  return (
    <div className="bg-card/40 border border-border/70 rounded-lg p-4 space-y-2">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-semibold text-foreground text-sm">
            {section.label}
          </p>
          {section.helperText && (
            <p className="text-muted-foreground text-xs">
              {section.helperText}
            </p>
          )}
        </div>
        <span className="font-mono text-muted-foreground text-xs">
          {tagLabel[section.type]}
        </span>
      </div>
      <Textarea
        value={value}
        rows={6}
        onChange={event => onChange(event.target.value)}
        className="font-mono text-xs"
      />
      <div>
        <p className="font-semibold text-muted-foreground text-xs">
          Prompt Preview
        </p>
        <pre className="mt-1 max-h-32 overflow-auto rounded-md bg-muted/70 p-2 text-muted-foreground text-xs whitespace-pre-wrap">
          {preview}
        </pre>
      </div>
    </div>
  )
}

const PromptOverridesDialog = ({
  open,
  onOpenChange,
  onSubmit,
  isSubmitting,
  hypothesis
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (overrides: AgentPromptOverrides) => Promise<void> | void
  isSubmitting?: boolean
  hypothesis?: DesignPlanHypothesis | null
}) => {
  const [formState, setFormState] = useState<AgentPromptOverrides>(
    buildInitialOverrides
  )

  useEffect(() => {
    if (open) {
      setFormState(buildInitialOverrides())
    }
  }, [open])

  const handleSectionChange = (
    agentId: DesignAgentPromptId,
    section: PromptSectionSchema,
    nextValue: string
  ) => {
    setFormState(prev => ({
      ...prev,
      [agentId]: {
        sections: {
          ...(prev[agentId]?.sections || {}),
          [section.id]: nextValue
        },
        userPrompt: prev[agentId]?.userPrompt
      }
    }))
  }

  const handleUserPromptChange = (
    agentId: DesignAgentPromptId,
    nextValue: string
  ) => {
    setFormState(prev => ({
      ...prev,
      [agentId]: {
        sections: prev[agentId]?.sections || {},
        userPrompt: nextValue
      }
    }))
  }

  const handleSubmit = () => {
    if (!isSubmitting) {
      onSubmit(formState)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={value => !isSubmitting && onOpenChange(value)}
    >
      <DialogContent className="max-w-5xl p-0 gap-0 overflow-hidden">
        <DialogHeader className="border-b border-border/60 px-6 py-4 space-y-2">
          <DialogTitle>Customize Agent Prompts</DialogTitle>
          <DialogDescription className="text-muted-foreground text-sm">
            Review and edit the structured prompts that drive each agent in the
            design pipeline.
            {hypothesis && (
              <span className="block text-xs mt-1">
                Target hypothesis: <strong>{hypothesis.content}</strong>
              </span>
            )}
          </DialogDescription>
        </DialogHeader>
        <div className="h-[70vh] flex flex-col overflow-hidden">
          <Tabs
            defaultValue={designAgentPromptOrder[0]}
            className="h-full flex flex-col overflow-hidden"
          >
            <TabsList className="flex flex-wrap gap-2 px-6 py-3">
              {designAgentPromptOrder.map(agentId => {
                const schema = designAgentPromptSchemas[agentId]
                return (
                  <TabsTrigger
                    key={agentId}
                    value={agentId}
                    className="text-xs"
                  >
                    {schema.title}
                  </TabsTrigger>
                )
              })}
            </TabsList>
            <div className="flex-1 px-6 pb-6 min-h-0">
              {designAgentPromptOrder.map(agentId => {
                const schema = designAgentPromptSchemas[agentId]
                return (
                  <TabsContent
                    key={agentId}
                    value={agentId}
                    className="h-full min-h-0 pt-2 data-[state=active]:flex data-[state=active]:flex-col"
                  >
                    <ScrollArea
                      className="h-full min-h-0 rounded-lg pr-3"
                      type="always"
                    >
                      <div className="space-y-4 pb-10">
                        <div>
                          <p className="font-semibold text-foreground text-lg">
                            {schema.title}
                          </p>
                          <p className="text-muted-foreground text-sm">
                            {schema.description}
                          </p>
                        </div>
                        {schema.sections.map(section => (
                          <PromptSectionEditor
                            key={`${agentId}-${section.id}`}
                            agentId={agentId}
                            section={section}
                            value={getSectionValue(formState, agentId, section)}
                            onChange={next =>
                              handleSectionChange(agentId, section, next)
                            }
                          />
                        ))}
                        {schema.userPrompt && (
                          <div className="bg-card/40 border border-border/70 rounded-lg p-4 space-y-2">
                            <div className="flex items-center justify-between">
                              <p className="font-semibold text-foreground text-sm">
                                {schema.userPrompt.label}
                              </p>
                              <span className="font-mono text-muted-foreground text-xs">
                                {"<user>"}
                              </span>
                            </div>
                            {schema.userPrompt.helperText && (
                              <p className="text-muted-foreground text-xs">
                                {schema.userPrompt.helperText}
                              </p>
                            )}
                            <Textarea
                              rows={4}
                              className="font-mono text-xs"
                              value={
                                formState[agentId]?.userPrompt ||
                                schema.userPrompt.defaultValue
                              }
                              onChange={event =>
                                handleUserPromptChange(
                                  agentId,
                                  event.target.value
                                )
                              }
                            />
                          </div>
                        )}
                      </div>
                    </ScrollArea>
                  </TabsContent>
                )
              })}
            </div>
          </Tabs>
        </div>
        <DialogFooter className="border-t border-border/60 px-6 py-4">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
            type="button"
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting} type="button">
            {isSubmitting ? "Generating…" : "Generate Experiment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default PromptOverridesDialog
