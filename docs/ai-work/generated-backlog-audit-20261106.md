# Generated publishing backlog audit — 6 November 2026

Audit base: `c3cad3bfff8c1ed8f8786eac947d1ed126e29a6f`. Inventory: 47 open PRs, including **43 generated SEO/game/publisher PRs**; #2816 is separately identified as source research. No title-based closure or bulk merge was performed. Every listed complete binary/full-index patch and prospective three-way merge was inspected by the reproducible audit; hashes below identify the exact compared content. Existing branches/heads remain preserved.

Commands used: `git fetch origin`; `git merge-base <main> <head>`; `git diff --no-ext-diff --no-renames --binary --full-index <merge-base> <head>`; `git rev-list --left-right --count <head>...<main>`; per-path Git blob comparisons; `git merge-tree --write-tree <main> <head>`; fresh exact-head Actions API inventory. The scratch audit scripts and full patches are retained in `/workspace/work/generated-audit/` for this execution. These structural comparisons do not transfer historical qualification or establish release permission.

## Findings and active disposition

- Only #2929/#2928 and #2895/#2893/#2890 have byte-identical **complete** patches. Other matching titles have differing content or dependencies. No duplicate was closed before accounting for its work.
- All generated PR-event workflow groups in this snapshot report `action_required`, not executed success. Game-publishing PRs additionally have eight explicit validation workflow successes; those do not turn the unexecuted PR events green. Exact final-head executed checks, independent review, main ancestry and publishing safeguards remain mandatory.
- #3034 is the freshest full-pipeline output (279 files, zero behind/conflicts) and includes genuinely needed publisher count/announcement output, canonical watch-page/metadata materialization and video-library/sitemap refresh. Its input main includes released #3028 and #3010. #3033 is the prior source generation, one commit behind. Both are preserved drafts pending the semantic repair and qualification below.
- Demonstrated shared pipeline defect: committed main ZX Spectrum quiz HTML contains seven chapter anchors and seven Clip records, but the actual Pages output has **zero** because its template rebuild omitted the companion video-library enrichment. Latest #3034 keeps the chapter offsets but replaces richer published labels from refreshed YouTube descriptions. Pin the existing 21 quiz chapters (three quizzes × seven) in the already-supported source chapter fields, retaining names/ranges/offsets, rather than editing generated HTML.
- Latest #3034 also flattens the existing C64-v-Amiga guide: 111 anchors remain, but ten authored groups and rating instructions become zero/absent. The companion publisher must reuse the authoritative grouped-guide builder, preserve the deferred player, and keep restricted-video exclusions. Restore the companion pass and its existing validator in Pages before sitemap indexing. No assertions or numeric limits may be weakened.
- #2950 remains a historical missing-chapter/conflict case; it is not a safe substitute for fresh output. #2969 contains 666 changed artifacts already byte-identical to current main, plus separate remaining output. Older publisher/SEO differences and date churn cannot be silently copied wholesale.
- #2816 is **source research**, not generated output: 18 source/evidence/workflow/test paths, 156 commits behind and a catalogue-metadata conflict. Preserve its provenance/cohort/research work; it requires its own current-main, record-by-record hosted-edition/source review. It is not qualified or merged as generated publishing. Unrelated #2957/#2867/#2813 remain outside this generated-output integration.

## Exact patch inventory

“Main” counts authored changed-file payloads already byte-identical to audited main. “Latest” counts additional exact payload matches in #3034; all other differing versions remain preserved in the named PR, not silently discarded. Conflicts are actual three-way conflict counts. Successful checks shown separately from action-required events.

| PR | Family | Exact head | Files | Behind | Conflicts | Main / Latest | Checks (success / action_required) | Complete patch SHA-256 |
| --- | --- | --- | ---: | ---: | ---: | --- | --- | --- |
| #3034 | games | `cb0614b5a4f3c0d8d2d135709bdc948ea859b299` | 279 | 0 | 0 | 0 / 279 | 8 / 17 | `c9f709cf9c8eca6d9ca71f970fa1696f6f64cf8d77ad58fd5b9851979a175105` |
| #3033 | games | `ecff12960832e72f4e27252c9e9cf8374f8846ff` | 269 | 1 | 0 | 0 / 256 | 8 / 17 | `c20dcf5b090e85bc71211f10d9b720c2564d5ea0c40bd62a7ce22bb5881db837` |
| #3032 | seo | `1b98bb0c03f29e47720fca02295c655357164a5c` | 58 | 2 | 0 | 0 / 41 | 0 / 10 | `944b181838119dc84e4c6b2afa5a6745aa65e481149a6e39e177b136319c4415` |
| #3031 | seo | `17ac248a678c83693cdb9f90970f985fbf0f95ae` | 58 | 3 | 0 | 0 / 40 | 0 / 10 | `b9c4950c9bccaae357023739756892866600ac67c2ba3b3be20f811ab6280a21` |
| #3029 | seo | `e00a013294ab2c35bb68f81073c36f7bff83dde2` | 58 | 4 | 0 | 0 / 40 | 0 / 10 | `f2601231b3d4420ddbe6edaa816a9b648e054a603f71f321e300ec9f07af50e3` |
| #3027 | seo | `a3bcf31b1bce5c3e4364c58e937e86f37b50b911` | 58 | 4 | 0 | 0 / 40 | 0 / 10 | `7f0161388cd82761c125f5f88028a92f86ad9746c841fc82039a88ecaf3326de` |
| #3025 | games | `c26ff93ce531eed43a935f2a7c11d098570bdfe9` | 267 | 5 | 0 | 0 / 253 | 8 / 16 | `21d923df05f316d8a96a9e3aabea87c889804b318a6eb4af40a664cae5186e5d` |
| #3023 | games | `a42b2163d581aa2d5389a951c625e93a2ec7c90a` | 267 | 6 | 1 | 0 / 251 | 8 / 16 | `91b66304fb45629c82c7c50c68201828ec8b62a0a985c5647e3dcfa8e806fc42` |
| #3021 | seo | `85edd141abaf3562b3b80e07017e7e99fa8df2db` | 57 | 7 | 1 | 0 / 38 | 0 / 10 | `2c47ca35b3d487caaa8de96e3d5e74ae784fc97885267578bd4ec782493e5df6` |
| #3020 | seo | `40770b6fc01fd51fe8f6da500f9f03cee59df2e7` | 57 | 7 | 1 | 0 / 38 | 0 / 9 | `f34dae78f7555ebc3039b8beac12365e93bcd445a0626a7a04aa931aa3e53231` |
| #3019 | seo | `26bfb53790ce5e21581c88b3d1772d5e29eb5663` | 57 | 7 | 1 | 0 / 38 | 0 / 10 | `b244df1cda43e88201a9cdc95a8828d9554dd23bbc4f627d85894a329e8a30d7` |
| #3018 | seo | `3d77f794ba24e149095c0015cee3a20cc4dd982d` | 57 | 8 | 1 | 0 / 38 | 0 / 10 | `bf1e67d3c8e5e5241cafe5622fb4adbdb9d6dd1cfcd75f06e8f7f5be46011edd` |
| #3015 | seo | `7fe63891d688f34b14230a8ae557f9a55b189e0d` | 57 | 9 | 1 | 0 / 38 | 0 / 10 | `05bde8c812569b5eb18b5e2b4e11025948b667cf5bf3b760aa818534300e2bed` |
| #3012 | games | `1b83ef987980ee7ac7535ac8d24cf9e32f0f1ed8` | 265 | 11 | 1 | 0 / 248 | 8 / 16 | `f81127a3b4e51191a63b579630ebceff2b4265fa8546655eb5e4166fcb9f0487` |
| #3009 | seo | `3215f1013085c5ab960a0058fc484714990dea31` | 57 | 12 | 1 | 0 / 37 | 0 / 10 | `864c044b03f428757880c8f8061472be332fde721a679007902e684b99ac89ab` |
| #3008 | seo | `68057dfd83d5c8a3aa28d872330d3d433161de99` | 57 | 12 | 1 | 0 / 37 | 0 / 10 | `55cb23a9db8725cb19d5d13ad8f6ec455717f64d63d63ef7bbbf94d60888d515` |
| #3007 | seo | `3314b49709c0c3342e3ef557ec2ca53f28c508eb` | 57 | 13 | 1 | 0 / 37 | 0 / 10 | `627149a94aca737d08e09ba3a158cd15b704653f0b342ed5a687145c91dae06f` |
| #3005 | games | `6ab1d1bf5ea9086131525eb0930b8f932911ee98` | 265 | 14 | 1 | 0 / 247 | 8 / 16 | `a613b32dc6f713eec64d222716f00f77465ebb26695a1c86c22780863f9ce4a9` |
| #3003 | games | `bcdbe079a9c1a71b8e11bdfae40b943c4731c7f0` | 265 | 15 | 1 | 0 / 211 | 8 / 16 | `3ec736b917356d8ed42b9f38329a32b1b92f7004d5ab248a40c751a90d945d6a` |
| #3001 | games | `86a4378c24043c0959c955bd95689dbfd110dc15` | 260 | 16 | 1 | 0 / 207 | 8 / 14 | `067093c9b752785ee4a69e02c04cc5f2e1d082749f74e8758f4e804f2142e904` |
| #2999 | seo | `d136abe5dacee8e33fcfbe6263bb54b10aa34856` | 48 | 17 | 1 | 0 / 0 | 0 / 9 | `0a58d12ba64fd3af8e8707777a5789de54937ed955ba956d10f73ba2e3e7c327` |
| #2996 | seo | `2f608fd9b4e812fa2e2f71b2c5ecd8bd7ddbc1c7` | 47 | 17 | 0 | 0 / 0 | 0 / 9 | `4bb3a241be51159b403261fefa90900d97562fe1738884d38600fdd9033f81d4` |
| #2987 | games | `42967524e4457f3e5eb21dec22e2357d97ff1962` | 211 | 27 | 0 | 0 / 207 | 8 / 14 | `f50658f74279c27df73d184beee1354351ef7e267e23c6b633c92a7a2f7593cb` |
| #2981 | seo | `0994f5e2f7facb32d00c68f409acaeb1582d977e` | 2 | 20 | 1 | 0 / 0 | 0 / 7 | `88bdbbd3d931ded03cd7b2a05e3a132c709373ddeaab5c7c8ff6832026db939c` |
| #2973 | games | `b5dafe0ba7f0cb7e1e2e74d07ed34407a2922169` | 4 | 37 | 1 | 0 / 0 | 8 / 9 | `4b8fc4da0189476c2531769537e096bc6127edb7fe15dd8c385f63b72f0b7c20` |
| #2969 | games | `88e1e257a335a19207216b4380b91c018dedc061` | 672 | 41 | 1 | 666 / 0 | 8 / 13 | `6fdc492c57d17e086bac8a64035df561c5643dafd64d4804b760d7d0d23119c4` |
| #2950 | games | `38098fc3c5fbd2d5e06898f2f84b6e160439ded9` | 10 | 55 | 6 | 0 / 0 | 8 / 10 | `3d06f74410e6bef3b2eaefe936a38e468a57b99da46e332e8ee19ef2e4ab838e` |
| #2936 | games | `c769f5202a45dbfdad29b91e6392ac73204563b6` | 281 | 70 | 3 | 144 / 0 | 8 / 14 | `017f0cdc6bafe62f10e03994e5a5db3376b469403effed259c20b72999f45077` |
| #2935 | publishers | `9c80e970e3fbb226f35b9a0bda3bb7ff46c53581` | 207 | 70 | 0 | 114 / 0 | 0 / 11 | `ba17ec5b1d4f49de32233fe15b2fb57ca387765f92e535163ac853ce967035d7` |
| #2933 | games | `24bcc2b6bfdf477d46aff9b19b188a6abe2e5314` | 281 | 71 | 3 | 144 / 0 | 8 / 14 | `3e9412629c74e91d553aa37f36b59fbf3eb51521542adc352b91b82ef09a627c` |
| #2929 | games | `43edc0282274473a8d4cc65de75d39aab479f065` | 279 | 73 | 1 | 143 / 0 | 8 / 14 | `6f467263c4f38cfaecb6b25ee0f2251eda303ed5b21baff483a624a339fb18e6` |
| #2928 | games | `20bc29a2126023d1c8ab82db643cca95771fa10c` | 279 | 74 | 1 | 143 / 0 | 8 / 14 | `6f467263c4f38cfaecb6b25ee0f2251eda303ed5b21baff483a624a339fb18e6` |
| #2917 | games | `96ec50f64fd1d643587f212587fe1cd037655228` | 323 | 80 | 4 | 180 / 0 | 8 / 14 | `1192039c8f6c10ca8c8245baaa3825213148933e02fe2f63deb3502dfb6abc85` |
| #2911 | games | `8dfe1e1120bc5bb55475a785a4a20471052fbd81` | 281 | 83 | 3 | 143 / 0 | 8 / 15 | `6ef9befe96975d889e0f2c6506d651ddb99c4602c3621ba0e59aed14124bee47` |
| #2910 | games | `0ef2ed9f1456bf1f08853884ce54b01422720ec7` | 279 | 84 | 1 | 143 / 0 | 8 / 14 | `068d0daa4ae2346e380e8f75d12a316204c7004302303d7c7840d825362425dd` |
| #2908 | games | `2dbfa36828cfef8a875c48aea4bff26e1d2d4c56` | 320 | 86 | 1 | 143 / 0 | 8 / 14 | `ba36f8d3fed4316a561283f0e9cb6224be2160a3ffa15f7f28804a060a982ed1` |
| #2907 | publishers | `6a6d3a33547d396c9d3a46bbba98255ba1065041` | 207 | 86 | 0 | 114 / 0 | 0 / 11 | `9d78cb1d4ab9e9cb14a50236357bfb62799bf6812d82f93865778b858b687f09` |
| #2906 | games | `540a74f20f1e31db715a5b8e178a826c2db3cfdf` | 1 | 87 | 1 | 0 / 0 | 8 / 7 | `891762eee5cf2eb1b9d3ebade3fcc9d9d6bb4c1a5fe7aed025e37e8d690f686f` |
| #2902 | publishers | `31d4bd01247313b920ba1693dca6a4a5f7fc1f45` | 50 | 90 | 48 | 1 / 0 | 0 / 15 | `1a53f5b9abcbbf364dafc29734ea4fd5f77d7481a68eec37d7ab50cf72f6c2f9` |
| #2895 | games | `d9407dfa9e8eea4377b7c313c64f32fb1b87908f` | 6 | 96 | 3 | 0 / 0 | 8 / 10 | `161026d3cf1216f56f29cee6008392460b7e1ae511a7271c09d6d9502356bceb` |
| #2893 | games | `b89e16a9121ce0e6c072e9322d3c22a07fe49a00` | 6 | 97 | 3 | 0 / 0 | 8 / 10 | `161026d3cf1216f56f29cee6008392460b7e1ae511a7271c09d6d9502356bceb` |
| #2890 | games | `af346f0221bd639e82187aac5da9a8908c7e9c54` | 6 | 98 | 3 | 0 / 0 | 8 / 10 | `161026d3cf1216f56f29cee6008392460b7e1ae511a7271c09d6d9502356bceb` |
| #2872 | games | `9ee6d33d04b896aa3c5b95b6fae8846cca08e4ab` | 12 | 108 | 8 | 1 / 0 | 8 / 11 | `30ad9b3c7760671a399f347e3c67b07f4ed04221a10def839b49f9cf9969f3bd` |
| #2816 | research | `517f8cbae89f8c858cee97ab70caf8090622b9d1` | 18 | 156 | 1 | 0 / 0 | 8 / 0 | `ac05f97b82be8e8d6359e97b3a26780df663ca08246f773cd1fcb514b284f731` |

## Release state

**Complete-patch inventory finished; semantic integration is blocked on the demonstrated chapter/guide preservation defect.** Source research #2816 also has one cancelled historical run, not shown in the success/action-required columns, and is not release-qualified. The sole active source repair is `fix/retro-published-chapter-preservation-20261106`, based on the audited main. Preserve all existing generated branches. After a qualified source repair, reconcile/regenerate an existing genuinely needed output PR, repeat final-head integrity/metadata/browser/performance/review gates, use a guarded PR merge (no direct main push), and verify deployment. This checkpoint does not claim that any generated backlog PR has merged or reached production.

## 7 November follow-up — source repair released, two new native outputs preserved

Refresh main: `47cbfd4ee649f9cf96056ebbe475a56cad0d32ba` (#3035). All previous 43 generated heads remain preserved; new #3036 and #3037 bring the generated inventory to 45. No closure or integration follows from a title match. #3035's final exact-head and production evidence is in the SEO record and receipt `6713217864`. Existing #3034 is the only active output implementation, normally reconciled at `a326e7cc15b3239105db7045b324c9044a8b6d0f`; final release remains pending.

| PR | Exact head | Complete patch SHA-256 | Disposition |
| --- | --- | --- | --- |
| #3036 | `3f9b6c20f2915cccefa8c248913ce28c3f34c622` | `a689abb749d05b67b882a388ab9e708ecf69037f4cde8cd4ebf0c9bae2d35e29` | Preserved SEO draft, 70 files, clean prospective merge; verified video record mapping equals prior #3034, refresh timestamp differs. |
| #3037 | `b5280d3f23a00c8b0bac758dfb70dc9d97db4bd5` | `69acd756bb009c7aeab250ac096046a90f798dfe34b09b0ea538ee6a2438b9b4` | Preserved native full-pipeline draft, 279 files. New author correction in challenge raw description is retained in existing #3034. |

Additional complete-patch semantic checks: none of the 45 generated proposals removes a route; no route in the original 43 is missing from both current main and #3034. Every historical video ID/new field is represented by the latest record mapping. Two obsolete proposals differ in upload timestamps (#2950 ZX quiz 00:35:01 versus current 18:30:10 on 30 October; #2872 prizes 14:50:30 versus current 17:40:04 on 21 October); retain current published timestamps. Forty divergent old developer/year archive paths preserve canonicals/video IDs/emulator links/manual counts but include generic title rollbacks against current curated singleton SEO. Current metadata wins. #2902 publisher registry already matches current main byte-for-byte; its old static registry has no unique route and omits newer current entries. #2816's unique source research remains separately preserved/unqualified.

Reproducible commands also checked all unmerged commits: #2996's three and #2981's eleven commits are generated output/normal reconciliations, not hidden authoring-source dependencies. No branch was discarded. Existing #3034 ran the full offline 69-stage rebuild twice with byte-identical binary diff; current metadata's author correction is preserved, all IDs/verified dates/durations/thumbnail/access/source order retained. Final exact-head native checks/review/browser/performance and actual publishing proof remain required; this record does not yet claim generated output merged or live.
