# Native Elaneeru — GitHub Auto Deploy

This repository keeps the Native Elaneeru Google Apps Script application in GitHub and automatically pushes + deploys it when `main` changes.

## One-time setup

1. Create a GitHub repository and upload this package.
2. In Google Apps Script, enable the Apps Script API for your Google account.
3. Get your Apps Script **Script ID** from Project Settings.
4. Install clasp locally once and run `npx clasp login`; copy the contents of your local clasp auth file.
5. In GitHub repository Settings → Secrets and variables → Actions, create:
   - `APPS_SCRIPT_ID` = your Apps Script Script ID
   - `CLASPRC_JSON` = the complete clasp auth JSON
   - `APPS_SCRIPT_DEPLOYMENT_ID` = the deployment ID from the Web App URL (recommended so the `/exec` URL remains stable)
6. Push to `main`. GitHub Actions will push and deploy automatically.

## After setup

Do not edit the Apps Script files manually unless necessary. Treat GitHub as the master copy. Each push to `main` updates Apps Script and updates the existing deployment when `APPS_SCRIPT_DEPLOYMENT_ID` is configured.

## App links

See `APP_LINKS.md`.
