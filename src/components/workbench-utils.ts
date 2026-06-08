export type WorkbenchOutputStatus =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'error'; message?: string }
  | { status: 'unsupported'; message?: string };

export const getWorkbenchEditorText = (
  outputTab: string,
  outputs: Record<string, string | undefined>,
  outputState: Record<string, WorkbenchOutputStatus>
) => {
  const state = outputState[outputTab];
  if (state?.status === 'loading') {
    return `// Generating ${outputTab}...`;
  }
  if (state?.status === 'error') {
    return state.message || outputs[outputTab] || `// Failed to generate ${outputTab}`;
  }
  if (state?.status === 'unsupported') {
    return state.message || `// Unsupported output: ${outputTab}`;
  }
  return outputs[outputTab] || "// Generate code...";
};
