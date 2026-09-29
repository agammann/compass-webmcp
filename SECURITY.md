# Security and data handling

Compass stores workspace content in same-origin IndexedDB. It has no application account service, cloud database or encrypted vault. A browser agent may send permitted tool results to its own provider. WebMCP permissions constrain these tools; they do not sandbox separate browser automation or code on the same origin.

Tool arguments and imported JSON are validated. Pack, item-type and read/write access are checked in the same database transaction as a tool operation. Agents can create inactive Packs within their current scope; only the interface activates one. Item content cannot change permissions or execute code. Bookmarks accept only HTTP(S) URLs. Followed links are external websites.

Undo refuses changes that would overwrite newer content or leave references broken. JSON imports validate record IDs and references before atomic replacement, and disable imported WebMCP access. Export/import does not preserve activity or undo history.

For a suspected vulnerability, use GitHub private vulnerability reporting when available on this repository. Otherwise contact the maintainer privately before sharing sensitive data. Include the affected version, observed behavior and a minimal description using fictional data. Do not put personal workspace exports or credentials in public issues.
