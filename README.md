<div align="center">
  <h2> 
    <img valign="middle" src="icons/icon-128.png" alt="Incognito Tabs" height="64" />
    Incognito Tabs
  </h2>
  <h4>𐝕 Secure incognito tab manager with AES-GCM encryption</h4>
  <img src="https://img.shields.io/badge/Chrome-Extension-green.svg" alt="Chrome Extension" />
  <img src="https://img.shields.io/badge/MIT-License-blue.svg" alt="MIT License" />
</div>


Features
--------
- 🔒 **Crypto**: AES-GCM-256, CSPRNG IV
- 🌐 **Modern**: MV3, Web Crypto API
- 🧬 **Minimal**: ~100 LOC, zero deps
- 🎨 **Native**: Browser APIs only

Usage
-----

### Save Tabs
```sh
# To File
1. Open extension from incognito window
2. Click 'To File' → Select location

# To Text
1. Open extension from incognito window
2. Click 'To Text' → Copy displayed text
```

### Load Tabs
```sh
# From File
Click 'From File' → Select file → New incognito window

# From Text
1. Paste text in textbox
2. Click 'From Text' → New incognito window
```

> [!NOTE]
> Save operations require opening from an incognito window.

Permissions
-----------

| Permission | Usage                     |
|------------|---------------------------|
| `tabs`     | Read/create tabs          |
| `windows`  | Manage incognito windows  |

> [!IMPORTANT]
> Enable "Allow in Incognito" in extension settings

---

Development
-----------
```sh
git clone git@github.com:metaory/incognito-tabs.git
cd incognito-tabs
```

---

LICENSE
-------

[MIT](LICENSE)
