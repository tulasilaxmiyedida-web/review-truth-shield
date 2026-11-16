# ReviewShield implementation plan

## User experience
- Replace the blank home page with a responsive navy-and-white review-analysis workspace and working navigation for Dashboard, Upload Reviews, Detection Engine, Compare Reviews, Analytics, History, Reports, and Settings.
- Start with honest empty-state metrics; offer a sample CSV so the user can populate the app without uploading their own data.
- Support CSV upload and preview, review-column selection, transparent heuristic classification, side-by-side similarity checks, data-backed charts, searchable results, saved sessions, and CSV/print-to-PDF reporting.

## Data and behavior
- Keep the active dataset, results, and analysis-session history in browser storage; calculate every metric and chart from imported or explicitly loaded sample data.
- Explain that category scores are heuristic risk estimates, not verified model accuracy. Do not invent accuracy or temporal/rating data when the source does not contain labels, dates, or ratings.
- Validate CSV content and provide clear success/error feedback, plus actions to clear the dataset or history.

## Technical approach
- Preserve the existing TanStack Start and Tailwind v4 structure. Implement the application on `/`, place CSV parsing and review-scoring logic in a reusable utility, and use the installed Recharts and design-system controls.
- Add focused tests for CSV parsing and concrete classification rules, provide page metadata, and verify with the project tests, preview diagnostics, and the upload-to-report workflow.
