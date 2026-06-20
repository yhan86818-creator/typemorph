import * as vscode from 'vscode';
import {
  runEngine,
  inferSchema,
  parseYAML,
  isOpenAPISpec, parseOpenAPIComponents,
  isJSONSchema,  parseJSONSchema,
  OUTPUT_TARGETS,
  analyzeQuality,
  generateSampleJson,
} from 'typemorph-core';

// ── Quick Pick items built from OUTPUT_TARGETS ────────────────────────────────

function buildPickItems(): vscode.QuickPickItem[] {
  const tier1 = Object.values(OUTPUT_TARGETS).filter(t => t.tier === 1);
  const tier2 = Object.values(OUTPUT_TARGETS).filter(t => t.tier === 2);
  return [
    { label: 'Popular', kind: vscode.QuickPickItemKind.Separator },
    ...tier1.map(t => ({ label: t.label, description: t.key })),
    { label: 'More', kind: vscode.QuickPickItemKind.Separator },
    ...tier2.map(t => ({ label: t.label, description: t.key })),
  ];
}

// ── Parse any supported input ─────────────────────────────────────────────────

function parseInput(text: string): { json: any; schemas: { name: string; schema: any }[] } | null {
  let obj: any;
  try      { obj = JSON.parse(text); }
  catch    { try { obj = parseYAML(text); } catch { return null; } }

  if (isOpenAPISpec(obj)) {
    const schemas = parseOpenAPIComponents(obj);
    return { json: obj, schemas };
  }
  if (isJSONSchema(obj)) {
    const schemas = parseJSONSchema(obj);
    return { json: obj, schemas };
  }
  return { json: obj, schemas: [{ name: 'Root', schema: inferSchema(obj) }] };
}

// ── Map target key to VS Code language id ─────────────────────────────────────

function vscodeLang(key: string): string {
  return OUTPUT_TARGETS[key]?.monaco ?? 'plaintext';
}

// ── Commands ──────────────────────────────────────────────────────────────────

async function cmdConvert() {
  const editor = vscode.window.activeTextEditor;
  if (!editor) { vscode.window.showErrorMessage('TypeMorph: Open a file first.'); return; }

  const sel  = editor.selection;
  const text = editor.document.getText(sel.isEmpty ? undefined : sel).trim();
  if (!text) { vscode.window.showErrorMessage('TypeMorph: No content to convert.'); return; }

  const parsed = parseInput(text);
  if (!parsed) {
    vscode.window.showErrorMessage('TypeMorph: Input is not valid JSON or YAML.');
    return;
  }

  const picked = await vscode.window.showQuickPick(buildPickItems(), {
    placeHolder: 'Convert to…',
    matchOnDescription: true,
  });
  if (!picked || picked.kind === vscode.QuickPickItemKind.Separator) return;

  const targetKey = picked.description!;
  const output    = runEngine(parsed.json, targetKey);

  if (!output || output.startsWith('// Unsupported')) {
    vscode.window.showErrorMessage(`TypeMorph: Format "${targetKey}" is not supported for this input.`);
    return;
  }

  const doc = await vscode.workspace.openTextDocument({ content: output, language: vscodeLang(targetKey) });
  await vscode.window.showTextDocument(doc, vscode.ViewColumn.Beside);
}

async function cmdQuality() {
  const editor = vscode.window.activeTextEditor;
  if (!editor) return;

  const text = editor.document.getText().trim();
  const parsed = parseInput(text);
  if (!parsed) { vscode.window.showErrorMessage('TypeMorph: Input is not valid JSON or YAML.'); return; }

  const schema  = parsed.schemas[0]?.schema ?? inferSchema(parsed.json);
  const result  = analyzeQuality(schema);
  const grade   = result.grade;
  const msg     = `Schema Quality: ${grade}  (${result.score}/100)`;

  const detail = result.issues.length
    ? result.issues.map(i => `• ${i.message}`).join('\n')
    : 'No issues found.';

  vscode.window.showInformationMessage(msg, { detail, modal: true });
}

async function cmdReverse() {
  const editor = vscode.window.activeTextEditor;
  if (!editor) { vscode.window.showErrorMessage('TypeMorph: Open a TypeScript file first.'); return; }

  const sel  = editor.selection;
  const text = editor.document.getText(sel.isEmpty ? undefined : sel).trim();
  if (!text) { vscode.window.showErrorMessage('TypeMorph: No content selected.'); return; }

  const { json, error } = generateSampleJson(text);
  if (error || !json) {
    vscode.window.showErrorMessage(`TypeMorph: ${error ?? 'No interfaces found.'}`);
    return;
  }

  const doc = await vscode.workspace.openTextDocument({ content: json, language: 'json' });
  await vscode.window.showTextDocument(doc, vscode.ViewColumn.Beside);
}

// ── Extension lifecycle ───────────────────────────────────────────────────────

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand('typemorph.convert', cmdConvert),
    vscode.commands.registerCommand('typemorph.quality', cmdQuality),
    vscode.commands.registerCommand('typemorph.reverse', cmdReverse),
  );
}

export function deactivate() {}
