# Change Log

All notable changes to the "flavorcode" extension will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

## [1.0.0]

- Launched Flavorcode in the vs-code extension store

## [1.0.1]

- added changelog

## [1.0.2]

- removed `src/**` from `.vscodeignore` so  the webview files get bundled and are accesible to the extension.

## [1.0.3]

- fixed bug that broke the extension on failed project creation and added a url parser that fixes Urls missing the `https://`

## [1.0.4]

- added new extension Logo
- fixed bug: empty Urls where replaced with `https://` instead of being `""` which caused the extension to display all link button at any time.

## [1.0.5]

- fixed bug in project creation that cleared all fields before they where read 
