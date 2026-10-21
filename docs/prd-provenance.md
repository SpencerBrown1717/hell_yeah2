# Product requirements provenance

This file lives beside `docs/prds/` rather than inside it because `npm run validate:specs` treats every Markdown file in that folder as a specification.

The four PRDs in this folder descend from the version **2.0.0** originals delivered in ChatGPT and recovered from the owner's ChatGPT Library without content changes on October 20, 2026 (branch `docs/original-prds-20261020`, merged into `main`). This file records what was recovered and how the current files relate to it.

| Document | File | Current version | Numbered sections | Relation to the recovered original |
| --- | --- | --- | ---: | --- |
| Autonomous Growth OS | [01-autonomous-growth-os.md](prds/01-autonomous-growth-os.md) | 3.0.0 | 25 | Extends the original: pages 01–20 unchanged, pages 21–25 added, frontmatter `version` and `document_pages` updated |
| Campaign Simulator | [02-campaign-simulator.md](prds/02-campaign-simulator.md) | 2.0.0 | 12 | Byte-identical to the original |
| Creative Intelligence Engine | [03-creative-intelligence.md](prds/03-creative-intelligence.md) | 2.0.0 | 12 | Byte-identical to the original |
| Experimentation Platform | [04-experimentation-platform.md](prds/04-experimentation-platform.md) | 2.0.0 | 12 | Byte-identical to the original |

## Recovered originals

Original delivery: [HellYeah PRD delivery](https://chatgpt.com/c/6ad56048-28ec-83e8-993b-4ef64a55e5af?messageId=34e797c4-7e01-5c40-8aac-e5d45d2611e9). The Library identities and SHA-256 checksums of the version 2.0.0 originals, recorded before copying:

| Original | Library file | Bytes | SHA-256 |
| --- | --- | ---: | --- |
| 01-autonomous-growth-os.md (v2.0.0, 20 sections) | `libfile_cad2676cb5d08191b6a6f994d2166ab0` | 46,706 | `7fe756540d519433461fb3117b3e5ceb8ca82a393d2829e4140407f1f8653c33` |
| 02-campaign-simulator.md | `libfile_236854f9a4888191b4cfb5e08c4816bb` | 29,699 | `a46bb4e3553ebe58831a503cf12f4e3f290a5854c01634e6ce6f37e8adac5690` |
| 03-creative-intelligence.md | `libfile_730bf4f5460c8191bc81bd6c9674ea65` | 29,822 | `48847bc73f4dbb9135447ca3665dd5b1046c7d44d6a111405c8fa9008cf8b9ec` |
| 04-experimentation-platform.md | `libfile_8719cd5179e881918374cc898703b520` | 30,379 | `388a800361906d4e16ea2d1e0c951613886610cca3cb672fced6af4023ba1649` |

The v2.0.0 text of `01-autonomous-growth-os.md` remains available in Git history at commit `50511ee` (`git show 50511ee:docs/prds/01-autonomous-growth-os.md`). On October 21, 2026, `sha256sum` of the three unchanged files on `main` matched the recorded checksums, and the current OS PRD differed from its original only by the two frontmatter lines and the appended pages 21–25.

## Validation

`npm run validate:specs` checks every file for explicit `<!-- PAGE -->` boundaries, at least ten substantive numbered sections, working local links and the brand contrast pairs, and that the OS document is the largest. The application source, tests and CI live beside these documents at the repository root; see [verification](verification.md) for the executed evidence.
