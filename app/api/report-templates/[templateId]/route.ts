import { NextRequest } from "next/server"

import { deleteTemplate } from "@/lib/report-templates/server"

export async function DELETE(
  request: NextRequest,
  { params }: { params: { templateId: string } }
) {
  return deleteTemplate(request, params.templateId)
}
