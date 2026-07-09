# LegalSphere AI v4 Architecture

This document describes the design and components of the LegalSphere AI v4 Foundation (Milestone 1). The AI Core is designed as an independent, extensible, UI-agnostic library strictly following Clean Architecture and SOLID principles.

## Core Responsibilities
The AI Core acts as a standalone library that processes text and files and returns professional, formatted responses without ever knowing about React, Expo, or specific UI layouts.

*   **LegalSphereEngine.js:** The sole public API facade. The UI strictly imports and interacts with this class to execute requests (`processLexAI`, `processAIChatRoom`, `processDocumentVault`).
*   **AIRouter.js & Domain Routers:** The engine delegates requests to domain-specific routers (`OfficeRouter`, `CaseRouter`, `DocumentRouter`). Routers execute the business logic: fetch context -> run OCR -> build prompt -> execute LLM -> return response.

## Extensibility & Registries
*   **ProviderRegistry:** Replaces hardcoded imports of API classes. Registers capabilities (e.g., `Chat`, `OCR`, `Summarization`) and health status for all AI vendors (`DeepSeekProvider`, `OCRSpaceProvider`). Routers fetch providers dynamically, enabling plug-and-play swapping.
*   **AIEvents:** Provides optional event hooks (`REQUEST_STARTED`, `OCR_STARTED`, etc.) so the UI can listen and display granular progress bars without the AI Core needing to know about UI state.

## Pipelines
*   **OCRPipeline:** A unified, single source of truth for all OCR extraction. It handles automatic failovers (PDFs try OCR.Space first and fallback to Vision; Images try Vision first and fallback to OCR.Space) and reports health back to the ProviderRegistry.
*   **LanguagePipeline:** A linear pipeline that cleans OCR artifacts, normalizes text, and detects the primary language using Unicode script bounds.

## Prompts & Context
*   **Prompt Architecture:** Prompts are strictly separated by domain (`SystemPrompts`, `OfficePrompts`, `CasePrompts`, `DocumentPrompts`). The `PromptBuilder` strings them together, eliminating duplication.
*   **Context Builders:** Domain-specific singletons (`OfficeContext`, `CaseContext`) that interface with the SQLite database to fetch relevant state before execution.

## Data Flow (Request / Response)
The engine strictly uses standardized models for robustness.
1.  **Request:** UI invokes an endpoint with a structured class (`LexAIRequest`, `CaseAIRequest`, `DocumentVaultRequest`).
2.  **Processing:** Execution flows through Router -> Context -> DocumentReader (Language + OCR) -> LLM.
3.  **Response:** The engine returns an `AIResponse` object that clearly separates the Markdown intended for the screen (`userFacing`) from the diagnostic/internal data (`metadata`).
4.  **Error Handling:** All exceptions are caught and wrapped in a standard `AIError` containing a safe `userMessage` and detailed `technicalMessage`.
