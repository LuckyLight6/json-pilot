import { Badge } from "@/components/ui"
import { useEditorStore } from "@/store/editor"

export function JsonStatusIndicator() {
  const errorCount = useEditorStore((state) => state.errors.length)
  const goToFirstError = useEditorStore((state) => state.goToFirstError)

  if (errorCount === 0) {
    return <Badge variant="secondary">Valid JSON</Badge>
  }

  return (
    <Badge
      variant="destructive"
      className="cursor-pointer"
      onClick={goToFirstError}
    >
      {errorCount} {errorCount > 1 ? "Errors" : "Error"}
    </Badge>
  )
}