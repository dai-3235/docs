# Glossary

Terms for the semantic-layer engineering series: how a query gateway turns business-level requests into SQL.

## Language

### Model

**Semantic layer**:
The shared, governed definitions of metrics and dimensions that sit between consumers and the databases.
_Avoid_: metrics store, reporting backend

**Grain**:
A table's or dimension's position on an ordered hierarchy from fine to coarse detail. A metric table can be broken down only by dimensions at its own grain or coarser.
_Avoid_: granularity level, resolution, detail level

**Fan-out**:
A join where one row on the near side can match many rows on the far side, so measures from the near side get counted more than once.
_Avoid_: join explosion, row multiplication

**Logical metric**:
A business-named measure that does not depend on where it is stored.
_Avoid_: KPI, measure definition

**Physical metric**:
A logical metric bound to a column of a specific table, with an aggregation and a priority.
_Avoid_: metric column, stored metric

**Logical dimension**:
A business-named attribute used to slice or filter results, with a data type and a grain.
_Avoid_: field, attribute, group-by key

**Physical dimension**:
A logical dimension bound to a column of a specific table.
_Avoid_: dimension column

**Virtual table**:
A registered view of a table that states which metrics, breakdowns and filters it can answer.
_Avoid_: view, derived table

### Joins

**Join rule**:
A declared connection between two tables, with a cost, a cardinality and an on-off switch.
_Avoid_: relationship, foreign key, edge

**Route**:
The chosen sequence of joins that connects one table to another.
_Avoid_: join path, join plan

**Role**:
The capacity in which a table appears in a route, so the same table can be joined twice without being treated as already visited.
_Avoid_: alias, occurrence

**Strategy ladder**:
The ordered ways of finding a route, from an explicit rule for a dimension, to a declared multi-hop route, to a rule over several columns, to a join inferred from a shared dimension.
_Avoid_: fallback chain, join heuristics
