<div align="center">
  <h2><img valign="middle" src="icons/icon-128.png" alt="incognito-tabs" height="32" /> incognito-tabs</h2>
  <h4>Encrypted Incognito Tab Manager</h4>
  <img src=".github/banner.png" alt="banner" height="196" />
  <div>
    <br>
    <img src="https://img.shields.io/badge/Chrome-Extension-green.svg" alt="Chrome Extension" />
    <img src="https://img.shields.io/badge/MIT-License-blue.svg" alt="MIT License" />
  </div>
  <h5>A minimal Chrome extension to securely save and restore incognito tabs across browser sessions</h5>
</div>

---

## Features

- Save incognito tabs to encrypted file or text
- Restore tabs in separate incognito windows grouped by domain
- Zero dependencies, pure browser APIs
- Strong AES-256-GCM encryption
- Metadata format for tab stats

---

## Usage

1. **Save Tabs**
   - Open extension in incognito window
   - Click "Save" for encrypted file
   - Click "Copy" for encrypted text

2. **Restore Tabs**
   - Click "Load" to restore from file
   - Paste encrypted text and click "Paste"
   - Review domains before opening
   - Tabs open grouped by domain

---

## Format

```
INC@1.{YYMMDDHHmm}.W{n}.T{n}::{data}
```

Example:
```
INC@1.2411221845.W3.T8::base64_data
```

---

## Security

- AES-256-GCM encryption
- Browser-local keys
- No data persistence
- No analytics/tracking

---

## Installation

1. Clone repository
2. Open Chrome Extensions (chrome://extensions)
3. Enable Developer Mode
4. Click "Load unpacked"
5. Select extension directory
6. Enable "Allow in Incognito"

---

### Limitations

- Max 50 tabs per window
- Max 10MB file size
- Requires Chrome v109+

---

## LICENSE

[MIT](LICENSE)
