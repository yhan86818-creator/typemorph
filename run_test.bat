@echo off
cd /d "c:\Users\kouki\ai-factory\typemorph"
call npx vitest run src/lib/engine.test.ts --reporter=verbose 2>&1