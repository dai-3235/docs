# Glossary

Terms for the semantic-layer engineering series: how a query gateway turns business-level requests into SQL.

## Language

**Semantic layer**:
The shared, governed definitions of metrics and dimensions that sit between consumers and the databases.
_Avoid_: metrics store, reporting backend

**Grain**:
A table's or dimension's position on an ordered hierarchy from fine to coarse detail. A metric table can be broken down only by dimensions at its own grain or coarser.
_Avoid_: granularity level, resolution, detail level

**Fan-out**:
A join where one row on the near side can match many rows on the far side, so measures from the near side get counted more than once.
_Avoid_: join explosion, row multiplication
