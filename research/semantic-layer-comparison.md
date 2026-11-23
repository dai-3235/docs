# Semantic-layer comparison notes

Source-checked notes for the semantic-layer series. Every claim about another system links a primary source (official documentation, official repository, official engineering blog) and carries the date it was retrieved. A claim that could not be checked against a primary source is not asserted; it is listed under "Unverified".

All sources were retrieved on 2026-11-22. Retrieval was by page fetch with an automated summarizer, so quoted phrases are as returned by that step; re-read the linked page before quoting it in a post.

"Absence" statements (for example "the page does not describe a path-selection algorithm") mean only that the cited page, on the retrieval date, did not describe it. They are not claims that the system lacks the feature.

## The series design, as the baseline

Terms are those of `GLOSSARY.md`. The series design has these parts:

- Logical metrics and logical dimensions are business-named and independent of storage. Physical metrics and physical dimensions bind them to columns of specific tables, with an aggregation and a priority.
- Grain orders tables and dimensions from fine to coarse. A metric table can be broken down only by dimensions at its own grain or coarser.
- Join rules are declared connections between two tables with a cost, a cardinality and an on-off switch.
- A route is the chosen sequence of joins. Routes are found in cost order, with fan-out used as a tie-break.
- A role lets the same table appear twice in a route.
- A strategy ladder orders the ways of finding a route: explicit rule for a dimension, declared multi-hop route, rule over several columns, join inferred from a shared dimension.
- Failures to resolve a query carry an explainable reason.
- Metadata (metrics, dimensions, join rules, virtual tables) is managed as data.

## Summary table

| Aspect | Minerva | DataJunction | MetricFlow | Cube | LookML | Uber |
|---|---|---|---|---|---|---|
| Primary source retrieved | No (see Unverified) | Yes | Yes | Yes | Yes | Yes |
| Join declaration | Not verified | Dimension links with `join_on`, join type | Entities (primary, unique, foreign, natural) as join keys | `join` with `relationship` inside a cube | `join` with `relationship`, `sql_on`, `type` inside an explore | Not described in the sources found |
| Cost on a join | Not verified | Not described in the pages read | Not described in the pages read | Not described in the pages read | Not described in the pages read | Not described |
| Cardinality on a join | Not verified | Not described in the pages read | Derived from entity types | `relationship` | `relationship` | Not described |
| Path selection documented | Not verified | Graph-based discovery stated; algorithm not described | Graph of semantic models; algorithm not described; two-hop limit | Not described; explicit `join_path` in views resolves ambiguity | Not described | Not described for joins; table resolution is described |
| Fan-out handling | Not verified | Not described in the pages read | Fan-out and chasm joins restricted | Primary keys used to avoid fan-outs | Symmetric aggregates, or avoid one-to-many joins | Not described |

## Airbnb Minerva

### What it is

The Airbnb engineering blog has a multi-part series on Minerva, its metric platform. The posts are the primary source:

- Part I: <https://medium.com/airbnb-engineering/how-airbnb-achieved-metric-consistency-at-scale-f23cc53dea70>
- Part II: <https://medium.com/airbnb-engineering/airbnb-metric-computation-with-minerva-part-2-9afe6695b486>
- Part III: <https://medium.com/airbnb-engineering/how-airbnb-enables-consistent-data-consumption-at-scale-1c0b6a8b9206>
- Conference slides, "DAIS 22 - Minerva": <https://microsites.databricks.com/sites/default/files/2022-07/Democratizing-Metrics-at-Airbnb.pdf>

Retrieved 2026-11-22: the three Medium posts returned HTTP 403 to the fetch tool, and the slide PDF returned no extractable text (images only). The only content seen was search-result excerpts, which are not a primary retrieval. No claim about Minerva's internals is therefore asserted in these notes.

### Metrics and dimensions, join choice, comparison

Not verified. See "Unverified". The posts above are the place to read these before the series cites Minerva. A person with a browser can read them directly, or the fetch can be retried with another route.

## Netflix DataJunction

### What it is

DataJunction (DJ) is an open-source metrics platform. Users define metrics and the data models behind them in SQL, and it acts as "a semantic layer on top of a physical data warehouse". Source: <https://github.com/DataJunction/dj> (README), retrieved 2026-11-22.

The repository is under the `DataJunction` GitHub organization. Whether it is a Netflix project was not checked against a primary source (see Unverified), so these notes name it DataJunction, as the issue does.

### Metrics and dimensions

- Metrics and upstream logic are stored as "interconnected nodes". Node types named in the README are source nodes (warehouse tables), transform nodes (SQL logic), dimension nodes, metric nodes and cube nodes (a selection of metrics, dimensions and filters). Source: <https://github.com/DataJunction/dj>, retrieved 2026-11-22.
- Dimension nodes are described as special views that must have a primary key and can have any number of dimensional attributes. Source: <https://datajunction.io/docs/0.1.0/data-modeling/dimensions>, retrieved 2026-11-22.

### How it chooses joins

- A dimension node is linked to another node by one of two link types. A join link connects a dimension node to a source, transform or dimension node; it carries a `join_on` condition (usually primary key equals foreign key) and a join type of LEFT, RIGHT or INNER. A reference link maps a column directly to a dimension column, so no join is performed. Source: <https://datajunction.io/docs/0.1.0/data-modeling/dimension-links/>, retrieved 2026-11-22.
- A `role` distinguishes the capacities in which one dimension attaches to a node, for example a country as registration country and as event country. Without a role, a request for such a dimension is ambiguous. Source: same page, retrieved 2026-11-22.
- Dimensions can link to other dimensions, which adds join paths and lets metrics reach more dimensions in several hops. Source: same page, retrieved 2026-11-22.
- DJ parses each node's SQL into an AST and, with the dimension links, infers a dependency graph used to "find the appropriate join paths between nodes to generate queries for metrics". Source: <https://github.com/DataJunction/dj>, retrieved 2026-11-22.
- The dimension-links page does not describe the algorithm for choosing among multiple paths (retrieved 2026-11-22).

### Compared with the series design

- Similar: a declared join condition and join type per link; a role concept that serves the same purpose as the series role (one entity in two capacities).
- Difference: the pages read do not show a cost or a cardinality on a link, and do not describe an ordering among candidate paths, whereas the series design orders routes by declared cost with a fan-out tie-break.
- Difference: DJ derives metric and dimension relationships from SQL definitions in a node graph; the series separates logical definitions from physical bindings with a priority.
- Difference: DJ documents a reference link that skips a join when the attribute already exists on a node. The series strategy ladder has no step described by that name.
- No documentation of explainable failure reasons was found in the pages read.

## dbt MetricFlow

### What it is

MetricFlow is a semantic layer for defining and managing metrics, developed by dbt Labs. Metric requests are compiled into a dataflow-based query plan, optimized, and rendered as engine-specific SQL. The repository states Apache 2.0 licensing for current versions and a license history that passed through AGPL and BSL. Source: <https://github.com/dbt-labs/metricflow>, retrieved 2026-11-22. The README capture showed a badge that conflicts with the Apache 2.0 statement, so confirm the current license in the LICENSE file before stating it.

### Metrics and dimensions

- A semantic model maps to one dbt model and is configured in YAML. Semantic models are "nodes connected by entities in a semantic graph". Source: <https://docs.getdbt.com/docs/build/semantic-models>, retrieved 2026-11-22.
- Dimensions are categorical or time, and "are bound to the primary entity of the semantic model in which they are defined". Source: same page, retrieved 2026-11-22.
- Simple metrics are aggregations over columns; the page states that simple metrics replace the older "measures". Source: same page, retrieved 2026-11-22.

### How it chooses joins

- Entities are the join keys, with types primary, unique, foreign and natural. Source: <https://docs.getdbt.com/docs/build/semantic-models>, retrieved 2026-11-22.
- MetricFlow "creates a graph using the semantic models as nodes and the join paths as edges to perform joins automatically". Left joins are used between fact and dimension models, and full outer joins when several fact models are queried. Source: <https://docs.getdbt.com/docs/build/join-logic>, retrieved 2026-11-22.
- Which pairs of entity types may join is determined by type. Foreign-to-primary and foreign-to-unique are allowed as left joins; pairs with foreign on both sides, and primary-to-foreign or unique-to-foreign, are listed as fan-out and not allowed. The page states MetricFlow "restricts the use of fan-out and chasm joins". Source: same page, retrieved 2026-11-22.
- Multi-hop joins are limited to two hops, and dimensions reached by multi-hop need an entity path. Multi-hop joins for simple metrics and dimensions require dbt v1.12 or later. Source: same page, retrieved 2026-11-22.
- Validation runs before execution and checks, among other things, for ambiguous joins or paths. Direct three-hop paths are restricted "to prevent confusion from multiple routes to the same data". Source: same page, retrieved 2026-11-22.
- The page does not document the exact path-selection algorithm (retrieved 2026-11-22).

### Compared with the series design

- Similar: cardinality is part of join admissibility. In MetricFlow it is derived from entity types; in the series it is declared on the join rule.
- Similar: fan-out is treated as a hazard. MetricFlow blocks fan-out pairings; the series design uses fan-out as a tie-break between otherwise admissible routes.
- Difference: the pages read show no declared cost, so no cost-ordered choice among routes; ambiguity is reported by validation rather than resolved by ordering.
- Difference: a hop limit (two) bounds paths in MetricFlow; the series design bounds by cost.
- Difference: dimensions are bound to the primary entity of one semantic model, whereas the series separates a logical dimension from its physical bindings.
- Stronger in MetricFlow: pre-execution validation against the data platform with `explain` queries (same join-logic page).

## Cube

### What it is

Cube models data as cubes (usually one per table) with measures and dimensions, and views on top of cubes that data consumers query. Views let the underlying model change without breaking consumers' work. Source: <https://docs.cube.dev/docs/data-modeling/overview>, retrieved 2026-11-22.

### Metrics and dimensions

- Measures hold quantitative data and have a `sql` expression and a `type`; they can apply filters or be computed from other measures. Dimensions hold categorical data, including time. Source: same page, retrieved 2026-11-22.

### How it chooses joins

- Joins are declared inside a cube with a relationship of `one_to_one`, `one_to_many` or `many_to_one`. The relationship determines which table is the left side of the LEFT JOIN in generated SQL. "All joins are directed." Source: <https://docs.cube.dev/docs/data-modeling/concepts/working-with-joins>, retrieved 2026-11-22.
- Many-to-many needs a junction cube, with joins chained in one direction. A cube can define at most one join to any other cube. Source: same page, retrieved 2026-11-22.
- "Cube uses primary keys to avoid fanouts", so every cube taking part in joins needs a primary key dimension. Source: same page, retrieved 2026-11-22.
- A diamond (more than one path between two cubes) "can lead to ambiguous query generation". Views resolve it by giving an explicit `join_path` per included cube. If no path connects cubes the error is `Can't find join path`. Source: same page, retrieved 2026-11-22.
- The pages read do not describe how a path is chosen without a view (checked on <https://docs.cube.dev/docs/data-modeling/joins>, retrieved 2026-11-22).

### Compared with the series design

- Similar: declared cardinality per join; direction matters; a named error exists for a missing path.
- Difference: Cube resolves path ambiguity by an author-written `join_path` in a view; the series design resolves it at query time by cost order and a fan-out tie-break.
- Difference: a cube can hold at most one join to another cube, with `extends` as the documented way to join twice; the series uses a role so the same table can occur twice in a route.
- Difference: the pages read show no cost on a join.
- Stronger in Cube: the view layer gives authors exact control over each route, which makes results predictable.

## Looker LookML

### What it is

LookML models are written in code. An explore defines the base table and, through `join`, the views joined to it. Source: <https://docs.cloud.google.com/looker/docs/reference/param-explore-join>, retrieved 2026-11-22.

### Metrics and dimensions

The pages read for this note describe joins and aggregation behavior only; the model of dimensions and measures was not retrieved. Not asserted here (see Unverified).

### How it chooses joins

- A join needs `sql_on` or `foreign_key`. `relationship` defaults to `many_to_one` and is called "critical" to correct operation; `one_to_many` and `one_to_one` are also shown. `type` defaults to `left_outer`; `inner` is also shown. The same view can be joined more than once using `from`. Source: <https://docs.cloud.google.com/looker/docs/reference/param-explore-join>, retrieved 2026-11-22.
- The page does not explain how Looker chooses a join order or path (retrieved 2026-11-22). The joins are those declared in the explore.
- Fan-out: symmetric aggregates keep sums, averages and counts correct when a join duplicates rows, using the primary key to count each fact once, and depend on "a unique primary key and the correct join relationship being specified". Source: <https://docs.cloud.google.com/looker/docs/best-practices/understanding-symmetric-aggregates>, retrieved 2026-11-22.
- Where the dialect does not support symmetric aggregates, most measure types are excluded from views joined one-to-many, and one-to-many joins "should generally be avoided". Source: join reference page above, retrieved 2026-11-22.

### Compared with the series design

- Similar: declared cardinality and join type per join; the same view can appear more than once, like a role.
- Difference: the explore fixes the join structure at authoring time. The series searches for a route per query.
- Difference: Looker corrects fan-out in the aggregate (symmetric aggregates). The series design avoids it at route selection, by using fan-out as a tie-break between routes.
- Difference: no cost on a join in the pages read.

## Uber

A primary source exists. Two official Uber Engineering posts describe related systems.

### uMetric

- uMetric is "a unified internal metric platform that powers the full lifecycle of a metric". Published 2021-01-12. Source: <https://www.uber.com/blog/umetric/>, retrieved 2026-11-22.
- Definitions have three parts: a view definition (a unified view over source data in different storage types), a metric definition (the business logic in SQL) and dimensions and filters, equivalent to GROUP BY and WHERE, whose values consumers supply at runtime. Source: same page, retrieved 2026-11-22.
- Joins are not described as part of the definition model. They appear only in the access-control section, noting that metric SQL can contain JOINs, which complicates matching identifiers to table columns; Apache Calcite is used to parse the SQL. Source: same page, retrieved 2026-11-22.

### Data abstraction layer

- Published 2026-06-11. It is an RPC service between data consumers and data producers that decides where to source data, orchestrates queries and assembles the response; first applied to advertiser reporting. Source: <https://www.uber.com/blog/data-abstraction-layer/>, retrieved 2026-11-22.
- Logical tables define "the shape of data without describing where or how to get it". Dimensions are grouping keys. Each metric has a list of candidate physical tables and a roll-up such as SUM. Physical tables share the same dimensions and declare availability windows. Source: same page, retrieved 2026-11-22.
- Routing is by table resolution in phases (schema eligibility, dataset availability, column continuity); for column continuity it prefers candidates closer in cardinality to the request. Source: same page, retrieved 2026-11-22.
- The post does not give explicit criteria for choosing joins. Joins are applied during result assembly and "conditionally invoked depending on the outcome of table resolution", combining complementary datasets using the dimensions of each row. Source: same page, retrieved 2026-11-22.
- A logical registry and a physical registry are named only as components of the metadata block; the post does not describe them further. Source: same page, retrieved 2026-11-22.

### Compared with the series design

- Similar: a logical definition separated from physical tables that can answer it, with several candidates per metric, and a staged resolution of which table answers a request.
- Difference: the posts do not describe declared join rules with cost and cardinality or a route search; the series design centers on them.
- Difference: the series ranks physical metrics by priority and constrains by grain; the post ranks candidates by availability windows and closeness of cardinality.

## Unverified

Not asserted anywhere above, pending a primary source.

- Everything about Minerva's modeling and join behavior. The primary posts and slides could not be retrieved (403, image-only PDF). Search-result excerpts mention dimension sets, programmatically generated join logic, denormalization, and a later move to on-the-fly joins, but these came from excerpts and third-party summaries, not a retrieved primary page.
- Minerva scale figures (numbers of metrics and dimensions). Figures differ across the excerpts and dates.
- That DataJunction is a Netflix project. The README retrieved does not state it.
- LookML's metric and dimension model (measures, dimensions, dimension groups) and any documented rule for choosing among joins, beyond the pages cited.
- Whether MetricFlow, Cube, LookML or DataJunction attach a cost to a join or return structured failure reasons. The pages read do not mention either; a negative on those pages is not a statement about the products.
- How DataJunction chooses among several candidate paths, and how MetricFlow selects a path when more than one exists. The pages read describe a graph but not the selection rule.
- Cube's path selection when no view is used.
- Whether the MetricFlow license is currently Apache 2.0 (the README capture was internally inconsistent).
