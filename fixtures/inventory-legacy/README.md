# Inventory importer fixture

This is a small legacy CommonJS program used as an input to MigrationProof. It accepts CSV on standard input and writes a JSON array on standard output. IDs are opaque strings, including leading zeros. Names are trimmed. Quantities must be nonnegative integers. Blank lines are ignored. A duplicate ID keeps the last row's data in the original ID position. Invalid input produces a JSON error on stderr and a nonzero exit status.

Migration goal: rewrite this program in TypeScript without changing these observable behaviors. The fixture is an example workload, not the MigrationProof product.
