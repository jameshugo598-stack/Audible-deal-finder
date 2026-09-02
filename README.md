# Audible PowerHub & Deal Hunter

[![Support me on Ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/YOUR_KOFI_LINK)

*Please consider donating to help fund the $5 registration fee so I can publish this extension on the Chrome Web Store!*

## Features
- **Arbitrage Tagger**: Highlights when to Buy Cash (under $7/R100) vs Use Credit (over $25/R350).
- **Cost/Hour Badges**: Calculates and displays the cost per hour for audiobooks.
- **Deal Filter**: Quickly hide regular-priced books to only show actionable deals.
- **Markdown Export**: One-click copy of all page deals to your clipboard in Markdown format.

## Installation Instructions

### Option 1: Browser Extension (Chrome, Edge, Brave, etc.)
This method runs the script as a native browser extension (Manifest V3).

1. Download or clone this repository to your local machine.
2. Open your Chromium-based browser and navigate to the extensions page (`chrome://extensions/`).
3. Enable **Developer mode** (usually a toggle in the top right corner).
4. Click **Load unpacked** and select the folder containing these repository files (`manifest.json`, `content.js`, etc.).
5. Visit Audible to see the extension in action!

### Option 2: Tampermonkey (Userscript)
If you prefer using a script manager, you can install this as a userscript.

1. Install the [Tampermonkey](https://www.tampermonkey.net/) extension for your browser.
2. Click on the Tampermonkey icon and select **"Create a new script..."**.
3. Copy the entire contents of the `userscript.user.js` file.
4. Paste it into the Tampermonkey editor, overwriting any default template.
5. Click **File -> Save** (or press Ctrl+S/Cmd+S).
6. Visit Audible to see the extension in action!
