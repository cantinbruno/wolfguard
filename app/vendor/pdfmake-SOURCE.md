PDF export uses pdfmake 0.3.13, pinned from the official npm package:
https://registry.npmjs.org/pdfmake/-/pdfmake-0.3.13.tgz

Package integrity (SHA-512, base64):
Am2dbb5SuDwnpx1oNlCgZou91p9SMsyUs7Dws+yF6MmZbycfItt53MbyqdVUhFg6fWL3sWwu2acsJV7lzoRLlg==

`pdfmake-0.3.13.min.js` is the upstream browser bundle with its source-map
comment removed. `pdfmake-roboto-3.014.js` registers the upstream, unmodified
Roboto-Regular.ttf and Roboto-Medium.ttf as embedded base64. Italic faces
are not used; no additional font download is needed.

See LICENSE.pdfmake.txt, LICENSE.svg-to-pdfkit.txt and LICENSE.Roboto.txt.
Roboto license source: https://github.com/googlefonts/roboto-3-classic/blob/main/OFL.txt

The application loads both assets from its own origin only when exporting,
with SHA-384 integrity values for the published LF bytes in scan-pdf.js. Report data is never
uploaded to a PDF service. The PDF engine rejects external URL resources.
