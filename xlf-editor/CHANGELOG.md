# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),  
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Added
- Planned: Support for additional XLIFF versions.
- Planned: Enhanced batch translation tools.
- Planned: Improved performance for large files.

---

## [1.0.4]

### Fixed
- Improved filtering logic in the search bar to provide more accurate and expected results.

### Changed
- Optimized the pre-translation process for better performance and reliability.

### Enhanced
- **Grouped Duplicates in "Different Translations" View:**  
  When displaying source texts with multiple different translations, the duplicates list now sorts and groups all translations for the same source text together.  
  **Description:**  
  Previously, translations for the same source text could appear scattered throughout the list, making it difficult to compare and manage duplicates. Now, all entries for a given source text are shown consecutively, providing a clearer overview and making it much easier to resolve duplicate translations.

## [1.0.0] - 2025-06-03

### Added
- Updated Changelog.md
- Updated Readme.md

## [0.0.1] - 2025-06-03

### Added
- Initial release of **XLF Editor** for Visual Studio Code.
- Custom editor for `.xlf` files with interactive, side-by-side source and translation columns.
- Pre-translation feature using stored references or similar strings.
- Duplicate detection for source texts with different translations.
- Reference management: import, clear, and view stored translations.
- Batch operations: clear all translations or pre-translate entire files.
- Advanced filtering and search (untranslated, translated, duplicates, text search).
- Command palette integration for all major features.
- Extension settings for pre-translation match percent and preferred translation source.
- Integration with VS Code [Custom Editor API](https://code.visualstudio.com/api/extension-guides/custom-editors).

---

[1.0.0]: https://github.com/DaJan404/xlfeditor/releases/tag/v1.0.0
[0.0.1]: https://github.com/DaJan404/xlfeditor/releases/tag/v0.0.1