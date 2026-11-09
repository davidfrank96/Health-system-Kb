# 0010 · Preserve source identity and operator history

An external sender authenticates bytes. An operator authenticates via a staff session and attests to a source reference. Keep these identities distinct even when they report the same source run ID. Commit the run, delivery alias and audit together; conflicting terminal evidence cannot overwrite an earlier statement.

Keep observations, incidents and maintenance separate. Incidents are human decisions with append-only, revisioned statements. Maintenance is an approved future schedule, never an instruction to erase observations. Prevent edits after the first scheduled instant rather than promise a historical recalculation without complete raw evidence.

Compose reports from counts and weighted sums in one PostgreSQL snapshot. Return an explicit too-large response rather than an incomplete report. The current collection state is available, but earlier transient failures cannot be reconstructed from it. These decisions keep the existing deployment shape and add no dependency on the actual QA platform.
