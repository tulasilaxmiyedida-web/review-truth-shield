# Review Truth Shield

# Build a Complete ReviewShield Application 

Act as a senior full-stack software developer and UI/UX designer. Build a complete, professional application called **ReviewShield** — a review analysis system that detects potentially fake, suspicious, and genuine customer reviews.

The application should have a modern, clean, enterprise-style interface. Use **NAVY BLUE and WHITE as the primary colours throughout the entire application**.

## 1. Design and Colour Theme

Use the following design system:

- Primary navy blue: `#0B1F3A`
- Secondary navy blue: `#142D4E`
- Accent blue: `#2563EB`
- Background: `#F5F7FA`
- Cards: `#FFFFFF`
- Main text: `#172B4D`
- Secondary text: `#64748B`
- Borders: `#E2E8F0`
- Success: `#16A34A`
- Warning: `#F59E0B`
- Danger: `#DC2626`

Design requirements:
- Professional dashboard layout.
- Navy blue sidebar with white text and icons.
- White content area.
- Clean cards with subtle shadows and rounded corners.
- Modern typography.
- Consistent spacing and alignment.
- Professional charts and tables.
- Responsive design for desktop, tablet and mobile.
- Smooth hover effects and transitions.
- Do not use a colourful gradient theme. Maintain a navy blue and white identity.

## 2. Application Layout

Create a sidebar navigation with these modules:

1. Dashboard
2. Upload Reviews
3. Detection Engine
4. Compare Reviews
5. Analytics
6. History
7. Reports
8. Settings

Add a top navigation bar containing:
- ReviewShield logo and application name.
- Page title.
- Search option.
- Notification icon.
- User profile section.

## 3. Dashboard Module

Create a professional overview dashboard.

Display summary cards for:
- Total Reviews Analyzed.
- Genuine Reviews.
- Suspicious Reviews.
- Fake Reviews Detected.
- Detection Accuracy.

Add the following visualizations:
- Pie chart showing genuine vs suspicious vs fake reviews.
- Bar chart showing reviews analyzed over time.
- Line chart showing fake review detection trends.
- Recent activity table.

The dashboard should update automatically when new reviews are uploaded and analyzed.

## 4. Upload Reviews Module

Allow users to upload review datasets.

Requirements:
- Support CSV files.
- Provide a drag-and-drop upload area.
- Include a browse files button.
- Preview uploaded data in a table.
- Allow users to select the review text column.
- Validate uploaded files.
- Show upload success and error messages.
- Include a clear option to remove the uploaded dataset.

Provide sample CSV data so the application can be tested without an external dataset.

## 5. Detection Engine Module

Build a review detection system that classifies reviews into:

- Genuine
- Suspicious
- Fake

Analyze review characteristics such as:
- Repeated words and phrases.
- Excessive promotional language.
- Very short or generic review content.
- Duplicate or highly similar reviews.
- Excessive punctuation.
- Suspicious rating and text combinations.
- Unnatural review patterns.

Display the results in a professional table with:
- Review text.
- Predicted category.
- Confidence or risk score.
- Reason for classification.
- Date analyzed.

Use clear visual labels:
- Green for Genuine.
- Orange for Suspicious.
- Red for Fake.

Provide search, filtering and sorting options.

Important: If no trained machine-learning model is available, implement a transparent rule-based detection engine and clearly label its scores as heuristic estimates. Do not claim that the application uses AI or machine learning unless it actually does.

## 6. Compare Reviews Module

Create a module that allows users to compare two reviews.

Requirements:
- Two review selection dropdowns populated from uploaded reviews.
- Display both reviews side by side.
- Calculate text similarity percentage.
- Identify common words and phrases.
- Highlight matching text where possible.
- Display whether the reviews are potentially duplicated or similar.
- Explain why the reviews may be suspicious.

Use a clean side-by-side comparison interface.

## 7. Analytics Module

Create a detailed analytics page.

Include:
- Total reviews analyzed.
- Genuine review percentage.
- Suspicious review percentage.
- Fake review percentage.
- Average risk score.
- Detection distribution chart.
- Monthly review analysis chart.
- Rating distribution chart.
- Top suspicious keywords.
- Review trend analysis.

All analytics must be calculated from the uploaded and analyzed review data. Do not display misleading hardcoded statistics.

## 8. History Module

Create a history page that stores previous analysis sessions.

Include:
- Analysis date.
- Dataset name.
- Total reviews analyzed.
- Genuine reviews count.
- Suspicious reviews count.
- Fake reviews count.
- View details option.
- Delete history option.

Persist history so it remains available after restarting the application.

## 9. Reports Module

Create a reports page that allows users to generate reports.

Include:
- Analysis summary.
- Total reviews.
- Genuine, suspicious and fake review counts.
- Detection distribution.
- Key suspicious patterns.
- Charts and insights.

Allow users to export reports as PDF and CSV.

## 10. Settings Module

Include:
- Application information.
- Theme settings, keeping navy blue and white as the default.
- Data management options.
- Clear analysis history option.
- About ReviewShield section.

## 11. Functional Requirements

- Every sidebar navigation item must work.
- All buttons and controls must perform their intended actions.
- Uploading a CSV must update the application data.
- The detection engine must analyze the uploaded reviews.
- Dashboard and Analytics must use actual analysis results.
- Compare Reviews must use uploaded review data.
- History must persist between application sessions.
- Reports must be downloadable.
- Include proper validation and error handling.
- Avoid placeholder pages and non-functional buttons.
- Do not use fake statistics to make the dashboard look populated.
- Include sample data for demonstration.

## 12. Technical Requirements

Build this as a modern web application:
- Clean modular component architecture (React, Tailwind CSS, lucide-react icons, and charting).
- Implement proper state management and persistent storage (localStorage).
- Suitable charting library (Recharts).
- Robust client-side CSV parser (PapaParse or custom robust parser) and PDF exporter.

## 13. Final Quality Requirements

The final application should look like a polished, professional software product suitable for a college major project demonstration.

Prioritize:
1. A beautiful navy blue and white user interface.
2. Fully functional navigation.
3. Working CSV upload with preloaded sample dataset option.
4. Working review detection with heuristic scoring and explanations.
5. Working review comparison with highlighted similarity.
6. Dynamic analytics computed from live review data.
7. Persistent history across sessions.
8. Downloadable reports (CSV & printable/PDF view).

Verify that the complete workflow works:
**Upload CSV → Preview Reviews → Analyze Reviews → View Results → Compare Reviews → View Analytics → Save History → Generate Report.**

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/652b9a2a-26dd-474b-8d73-e47ed89125ee).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
