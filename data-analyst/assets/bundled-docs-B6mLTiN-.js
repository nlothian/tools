const e={"aggregates.md":'---\ntitle: Aggregate Functions\n---\n\n<!-- markdownlint-disable MD001 -->\n\n## Examples\n\nProduce a single row containing the sum of the `amount` column:\n\n```sql\nSELECT sum(amount)\nFROM sales;\n```\n\nProduce one row per unique region, containing the sum of `amount` for each group:\n\n```sql\nSELECT region, sum(amount)\nFROM sales\nGROUP BY region;\n```\n\nReturn only the regions that have a sum of `amount` higher than 100:\n\n```sql\nSELECT region\nFROM sales\nGROUP BY region\nHAVING sum(amount) > 100;\n```\n\nReturn the number of unique values in the `region` column:\n\n```sql\nSELECT count(DISTINCT region)\nFROM sales;\n```\n\nReturn two values, the total sum of `amount` and the sum of `amount` minus columns where the region is `north` using the [`FILTER` clause]({% link docs/stable/sql/query_syntax/filter.md %}):\n\n```sql\nSELECT sum(amount), sum(amount) FILTER (region != \'north\')\nFROM sales;\n```\n\nReturns a list of all regions in order of the `amount` column:\n\n```sql\nSELECT list(region ORDER BY amount DESC)\nFROM sales;\n```\n\nReturns the amount of the first sale using the `first()` aggregate function:\n\n```sql\nSELECT first(amount ORDER BY date ASC)\nFROM sales;\n```\n\n## Syntax\n\n<div id="rrdiagram"></div>\n\nAggregates are functions that *combine* multiple rows into a single value. Aggregates are different from scalar functions and window functions because they change the cardinality of the result. As such, aggregates can only be used in the `SELECT` and `HAVING` clauses of a SQL query.\n\n### `DISTINCT` Clause in Aggregate Functions\n\nWhen the `DISTINCT` clause is provided, only distinct values are considered in the computation of the aggregate. This is typically used in combination with the `count` aggregate to get the number of distinct elements; but it can be used together with any aggregate function in the system.\nThere are some aggregates that are insensitive to duplicate values (e.g., `min` and `max`) and for them this clause is parsed and ignored.\n\n### `ORDER BY` Clause in Aggregate Functions\n\nAn `ORDER BY` clause can be provided after the last argument of the function call. Note the lack of the comma separator before the clause.\n\n```sql\nSELECT ⟨aggregate_function⟩(⟨arg⟩, ⟨sep⟩ ORDER BY ⟨ordering_criteria⟩);\n```\n\nThis clause ensures that the values being aggregated are sorted before applying the function.\nMost aggregate functions are order-insensitive, and for them this clause is parsed and discarded.\nHowever, there are some order-sensitive aggregates that can have non-deterministic results without ordering, e.g., `first`, `last`, `list` and `string_agg` / `group_concat` / `listagg`.\nThese can be made deterministic by ordering the arguments.\n\nFor example:\n\n```sql\nCREATE TABLE tbl AS\n    SELECT s FROM range(1, 4) r(s);\n\nSELECT string_agg(s, \', \' ORDER BY s DESC) AS countdown\nFROM tbl;\n```\n\n| countdown |\n|-----------|\n| 3, 2, 1   |\n\n### Handling `NULL` Values\n\nAll general aggregate functions ignore `NULL`s, except for [`list`](#listarg) ([`array_agg`](#listarg)), [`first`](#firstarg) ([`arbitrary`](#firstarg)) and [`last`](#lastarg).\nTo exclude `NULL`s from `list`, you can use a [`FILTER` clause]({% link docs/stable/sql/query_syntax/filter.md %}).\nTo ignore `NULL`s from `first`, you can use the [`any_value` aggregate](#any_valuearg).\n\nAll general aggregate functions except [`count`](#countarg) return `NULL` on empty groups.\nIn particular, [`list`](#listarg) does *not* return an empty list, [`sum`](#sumarg) does *not* return zero, and [`string_agg`](#string_aggarg-sep) does *not* return an empty string in this case.\n\n## General Aggregate Functions\n\nThe table below shows the available general aggregate functions.\n\n| Function | Description |\n|:--|:--------|\n| [`any_value(arg)`](#any_valuearg) | Returns the first non-null value from `arg`. This function is [affected by ordering](#order-by-clause-in-aggregate-functions). |\n| [`arg_max(arg, val)`](#arg_maxarg-val) | Finds the row with the maximum `val` and calculates the `arg` expression at that row. Rows where the value of the `arg` or `val` expression is `NULL` are ignored. This function is [affected by ordering](#order-by-clause-in-aggregate-functions). |\n| [`arg_max(arg, val, n)`](#arg_maxarg-val-n) | The generalized case of [`arg_max`](#arg_maxarg-val) for `n` values: returns a `LIST` containing the `arg` expressions for the top `n` rows ordered by `val` descending. This function is [affected by ordering](#order-by-clause-in-aggregate-functions). |\n| [`arg_max_null(arg, val)`](#arg_max_nullarg-val) | Finds the row with the maximum `val` and calculates the `arg` expression at that row. Rows where the `val` expression evaluates to `NULL` are ignored. This function is [affected by ordering](#order-by-clause-in-aggregate-functions). |\n| [`arg_min(arg, val)`](#arg_minarg-val) | Finds the row with the minimum `val` and calculates the `arg` expression at that row. Rows where the value of the `arg` or `val` expression is `NULL` are ignored. This function is [affected by ordering](#order-by-clause-in-aggregate-functions). |\n| [`arg_min(arg, val, n)`](#arg_minarg-val-n) | Returns a `LIST` containing the `arg` expressions for the "bottom" `n` rows ordered by `val` ascending. This function is [affected by ordering](#order-by-clause-in-aggregate-functions). |\n| [`arg_min_null(arg, val)`](#arg_min_nullarg-val) | Finds the row with the minimum `val` and calculates the `arg` expression at that row. Rows where the `val` expression evaluates to `NULL` are ignored. This function is [affected by ordering](#order-by-clause-in-aggregate-functions). |\n| [`avg(arg)`](#avgarg) | Calculates the average of all non-null values in `arg`. This function is [affected by ordering](#order-by-clause-in-aggregate-functions). |\n| [`bit_and(arg)`](#bit_andarg) | Returns the bitwise AND of all bits in a given expression. |\n| [`bit_or(arg)`](#bit_orarg) | Returns the bitwise OR of all bits in a given expression. |\n| [`bit_xor(arg)`](#bit_xorarg) | Returns the bitwise XOR of all bits in a given expression. |\n| [`bitstring_agg(arg)`](#bitstring_aggarg) | Returns a bitstring whose length corresponds to the range of the non-null (integer) values, with bits set at the location of each (distinct) value. |\n| [`bool_and(arg)`](#bool_andarg) | Returns `true` if every input value is `true`, otherwise `false`. |\n| [`bool_or(arg)`](#bool_orarg) | Returns `true` if any input value is `true`, otherwise `false`. |\n| [`count()`](#count) | Returns the number of rows. |\n| [`count(arg)`](#countarg) | Returns the number of rows where `arg` is not `NULL`. |\n| [`countif(arg)`](#countifarg) | Returns the number of rows where `arg` is `true`. |\n| [`favg(arg)`](#favgarg) | Calculates the average using a more accurate floating point summation (Kahan Sum). This function is [affected by ordering](#order-by-clause-in-aggregate-functions). |\n| [`first(arg)`](#firstarg) | Returns the first value (null or non-null) from `arg`. This function is [affected by ordering](#order-by-clause-in-aggregate-functions). |\n| [`fsum(arg)`](#fsumarg) | Calculates the sum using a more accurate floating point summation (Kahan Sum). This function is [affected by ordering](#order-by-clause-in-aggregate-functions). |\n| [`geometric_mean(arg)`](#geometric_meanarg) | Calculates the geometric mean of all non-null values in `arg`. This function is [affected by ordering](#order-by-clause-in-aggregate-functions). |\n| [`histogram(arg)`](#histogramarg) | Returns a `MAP` of key-value pairs representing buckets and counts. |\n| [`histogram(arg, boundaries)`](#histogramarg-boundaries) | Returns a `MAP` of key-value pairs representing the provided upper `boundaries` and counts of elements in the corresponding bins (left-open and right-closed partitions) of the datatype. A boundary at the largest value of the datatype is automatically added when elements larger than all provided `boundaries` appear, see [`is_histogram_other_bin`]({% link docs/stable/sql/functions/utility.md %}#is_histogram_other_binarg). Boundaries may be provided, e.g., via [`equi_width_bins`]({% link docs/stable/sql/functions/utility.md %}#equi_width_binsminmaxbincountnice). |\n| [`histogram_exact(arg, elements)`](#histogram_exactarg-elements) | Returns a `MAP` of key-value pairs representing the requested elements and their counts. A catch-all element specific to the data-type is automatically added to count other elements when they appear, see [`is_histogram_other_bin`]({% link docs/stable/sql/functions/utility.md %}#is_histogram_other_binarg). |\n| [`histogram_values(source, boundaries)`](#histogram_valuessource-col_name-technique-bin_count) | Returns the upper boundaries of the bins and their counts. |\n| [`last(arg)`](#lastarg) | Returns the last value of a column. This function is [affected by ordering](#order-by-clause-in-aggregate-functions). |\n| [`list(arg)`](#listarg) | Returns a `LIST` containing all the values of a column. This function is [affected by ordering](#order-by-clause-in-aggregate-functions). |\n| [`max(arg)`](#maxarg) | Returns the maximum value present in `arg`. This function is [unaffected by distinctness](#distinct-clause-in-aggregate-functions). |\n| [`max(arg, n)`](#maxarg-n) | Returns a `LIST` containing the `arg` values for the "top" `n` rows ordered by `arg` descending. |\n| [`min(arg)`](#minarg) | Returns the minimum value present in `arg`. This function is [unaffected by distinctness](#distinct-clause-in-aggregate-functions). |\n| [`min(arg, n)`](#minarg-n) | Returns a `LIST` containing the `arg` values for the "bottom" `n` rows ordered by `arg` ascending. |\n| [`product(arg)`](#productarg) | Calculates the product of all non-null values in `arg`. This function is [affected by ordering](#order-by-clause-in-aggregate-functions). |\n| [`string_agg(arg)`](#string_aggarg-sep) | Concatenates the column string values with a comma separator (`,`). This function is [affected by ordering](#order-by-clause-in-aggregate-functions). |\n| [`string_agg(arg, sep)`](#string_aggarg-sep) | Concatenates the column string values with a separator. This function is [affected by ordering](#order-by-clause-in-aggregate-functions). |\n| [`sum(arg)`](#sumarg) | Calculates the sum of all non-null values in `arg` / counts `true` values when `arg` is boolean. The floating-point versions of this function are [affected by ordering](#order-by-clause-in-aggregate-functions). |\n| [`weighted_avg(arg, weight)`](#weighted_avgarg-weight) | Calculates the weighted average all non-null values in `arg`, where each value is scaled by its corresponding `weight`. If `weight` is `NULL`, the corresponding `arg` value will be skipped. This function is [affected by ordering](#order-by-clause-in-aggregate-functions). |\n\n#### `any_value(arg)`\n\n<div class="nostroke_table"></div>\n\n| **Description** | Returns the first non-`NULL` value from `arg`. This function is [affected by ordering](#order-by-clause-in-aggregate-functions). |\n| **Example** | `any_value(A)` |\n\n#### `arg_max(arg, val)`\n\n<div class="nostroke_table"></div>\n\n| **Description** | Finds the row with the maximum `val` and calculates the `arg` expression at that row. Rows where the value of the `arg` or `val` expression is `NULL` are ignored. This function is [affected by ordering](#order-by-clause-in-aggregate-functions). |\n| **Example** | `arg_max(A, B)` |\n| **Alias(es)** | `argmax(arg, val)`, `max_by(arg, val)` |\n\n#### `arg_max(arg, val, n)`\n\n<div class="nostroke_table"></div>\n\n| **Description** | The generalized case of [`arg_max`](#arg_maxarg-val) for `n` values: returns a `LIST` containing the `arg` expressions for the top `n` rows ordered by `val` descending. This function is [affected by ordering](#order-by-clause-in-aggregate-functions). |\n| **Example** | `arg_max(A, B, 2)` |\n| **Alias(es)** | `argmax(arg, val, n)`, `max_by(arg, val, n)` |\n\n#### `arg_max_null(arg, val)`\n\n<div class="nostroke_table"></div>\n\n| **Description** | Finds the row with the maximum `val` and calculates the `arg` expression at that row. Rows where the `val` expression evaluates to `NULL` are ignored. This function is [affected by ordering](#order-by-clause-in-aggregate-functions). |\n| **Example** | `arg_max_null(A, B)` |\n\n#### `arg_min(arg, val)`\n\n<div class="nostroke_table"></div>\n\n| **Description** | Finds the row with the minimum `val` and calculates the `arg` expression at that row. Rows where the value of the `arg` or `val` expression is `NULL` are ignored. This function is [affected by ordering](#order-by-clause-in-aggregate-functions). |\n| **Example** | `arg_min(A, B)` |\n| **Alias(es)** | `argmin(arg, val)`, `min_by(arg, val)` |\n\n#### `arg_min(arg, val, n)`\n\n<div class="nostroke_table"></div>\n\n| **Description** | The generalized case of [`arg_min`](#arg_minarg-val) for `n` values: returns a `LIST` containing the `arg` expressions for the top `n` rows ordered by `val` descending. This function is [affected by ordering](#order-by-clause-in-aggregate-functions). |\n| **Example** | `arg_min(A, B, 2)` |\n| **Alias(es)** | `argmin(arg, val, n)`, `min_by(arg, val, n)` |\n\n#### `arg_min_null(arg, val)`\n\n<div class="nostroke_table"></div>\n\n| **Description** | Finds the row with the minimum `val` and calculates the `arg` expression at that row. Rows where the `val` expression evaluates to `NULL` are ignored. This function is [affected by ordering](#order-by-clause-in-aggregate-functions). |\n| **Example** | `arg_min_null(A, B)` |\n\n#### `avg(arg)`\n\n<div class="nostroke_table"></div>\n\n| **Description** | Calculates the average of all non-null values in `arg`. This function is [affected by ordering](#order-by-clause-in-aggregate-functions). |\n| **Example** | `avg(A)` |\n| **Alias(es)** | `mean` |\n\n#### `bit_and(arg)`\n\n<div class="nostroke_table"></div>\n\n| **Description** | Returns the bitwise `AND` of all bits in a given expression. |\n| **Example** | `bit_and(A)` |\n\n#### `bit_or(arg)`\n\n<div class="nostroke_table"></div>\n\n| **Description** | Returns the bitwise `OR` of all bits in a given expression. |\n| **Example** | `bit_or(A)` |\n\n#### `bit_xor(arg)`\n\n<div class="nostroke_table"></div>\n\n| **Description** | Returns the bitwise `XOR` of all bits in a given expression. |\n| **Example** | `bit_xor(A)` |\n\n#### `bitstring_agg(arg)`\n\n<div class="nostroke_table"></div>\n\n| **Description** | Returns a bitstring whose length corresponds to the range of the non-null (integer) values, with bits set at the location of each (distinct) value. |\n| **Example** | `bitstring_agg(A)` |\n\n#### `bool_and(arg)`\n\n<div class="nostroke_table"></div>\n\n| **Description** | Returns `true` if every input value is `true`, otherwise `false`. |\n| **Example** | `bool_and(A)` |\n\n#### `bool_or(arg)`\n\n<div class="nostroke_table"></div>\n\n| **Description** | Returns `true` if any input value is `true`, otherwise `false`. |\n| **Example** | `bool_or(A)` |\n\n#### `count()`\n\n<div class="nostroke_table"></div>\n\n| **Description** | Returns the number of rows. |\n| **Example** | `count()` |\n| **Alias(es)** | `count(*)` |\n\n#### `count(arg)`\n\n<div class="nostroke_table"></div>\n\n| **Description** | Returns the number rows where `arg` is not `NULL`. |\n| **Example** | `count(A)` |\n\n#### `countif(arg)`\n\n<div class="nostroke_table"></div>\n\n| **Description** | Returns the number of rows where `arg` is `true`. |\n| **Example** | `countif(A)` |\n\n#### `favg(arg)`\n\n<div class="nostroke_table"></div>\n\n| **Description** | Calculates the average using a more accurate floating point summation (Kahan Sum). This function is [affected by ordering](#order-by-clause-in-aggregate-functions). |\n| **Example** | `favg(A)` |\n\n#### `first(arg)`\n\n<div class="nostroke_table"></div>\n\n| **Description** | Returns the first value (null or non-null) from `arg`. This function is [affected by ordering](#order-by-clause-in-aggregate-functions). |\n| **Example** | `first(A)` |\n| **Alias(es)** | `arbitrary(A)` |\n\n#### `fsum(arg)`\n\n<div class="nostroke_table"></div>\n\n| **Description** | Calculates the sum using a more accurate floating point summation (Kahan Sum). This function is [affected by ordering](#order-by-clause-in-aggregate-functions). |\n| **Example** | `fsum(A)` |\n| **Alias(es)** | `sumkahan`, `kahan_sum` |\n\n#### `geometric_mean(arg)`\n\n<div class="nostroke_table"></div>\n\n| **Description** | Calculates the geometric mean of all non-null values in `arg`. This function is [affected by ordering](#order-by-clause-in-aggregate-functions). |\n| **Example** | `geometric_mean(A)` |\n| **Alias(es)** | `geomean(A)` |\n\n#### `histogram(arg)`\n\n<div class="nostroke_table"></div>\n\n| **Description** | Returns a `MAP` of key-value pairs representing buckets and counts. |\n| **Example** | `histogram(A)` |\n\n#### `histogram(arg, boundaries)`\n\n<div class="nostroke_table"></div>\n\n| **Description** | Returns a `MAP` of key-value pairs representing the provided upper `boundaries` and counts of elements in the corresponding bins (left-open and right-closed partitions) of the datatype. A boundary at the largest value of the datatype is automatically added when elements larger than all provided `boundaries` appear, see [`is_histogram_other_bin`]({% link docs/stable/sql/functions/utility.md %}#is_histogram_other_binarg). Boundaries may be provided, e.g., via [`equi_width_bins`]({% link docs/stable/sql/functions/utility.md %}#equi_width_binsminmaxbincountnice). |\n| **Example** | `histogram(A, [0, 1, 10])` |\n\n#### `histogram_exact(arg, elements)`\n\n<div class="nostroke_table"></div>\n\n| **Description** | Returns a `MAP` of key-value pairs representing the requested elements and their counts. A catch-all element specific to the data-type is automatically added to count other elements when they appear, see [`is_histogram_other_bin`]({% link docs/stable/sql/functions/utility.md %}#is_histogram_other_binarg). |\n| **Example** | `histogram_exact(A, [\'a\', \'b\', \'c\'])` |\n\n#### `histogram_values(source, col_name, technique, bin_count)`\n\n<div class="nostroke_table"></div>\n\n| **Description** | Returns the upper boundaries of the bins and their counts. |\n| **Example** | `histogram_values(integers, i, bin_count := 2)` |\n\n#### `last(arg)`\n\n<div class="nostroke_table"></div>\n\n| **Description** | Returns the last value of a column. This function is [affected by ordering](#order-by-clause-in-aggregate-functions). |\n| **Example** | `last(A)` |\n\n#### `list(arg)`\n\n<div class="nostroke_table"></div>\n\n| **Description** | Returns a `LIST` containing all the values of a column. This function is [affected by ordering](#order-by-clause-in-aggregate-functions). |\n| **Example** | `list(A)` |\n| **Alias(es)** | `array_agg` |\n\n#### `max(arg)`\n\n<div class="nostroke_table"></div>\n\n| **Description** | Returns the maximum value present in `arg`. This function is [unaffected by distinctness](#distinct-clause-in-aggregate-functions). |\n| **Example** | `max(A)` |\n\n#### `max(arg, n)`\n\n<div class="nostroke_table"></div>\n\n| **Description** |  Returns a `LIST` containing the `arg` values for the "top" `n` rows ordered by `arg` descending. |\n| **Example** | `max(A, 2)` |\n\n#### `min(arg)`\n\n<div class="nostroke_table"></div>\n\n| **Description** | Returns the minimum value present in `arg`. This function is [unaffected by distinctness](#distinct-clause-in-aggregate-functions). |\n| **Example** | `min(A)` |\n\n#### `min(arg, n)`\n\n<div class="nostroke_table"></div>\n\n| **Description** | Returns a `LIST` containing the `arg` values for the "bottom" `n` rows ordered by `arg` ascending. |\n| **Example** | `min(A, 2)` |\n\n#### `product(arg)`\n\n<div class="nostroke_table"></div>\n\n| **Description** | Calculates the product of all non-null values in `arg`. This function is [affected by ordering](#order-by-clause-in-aggregate-functions). |\n| **Example** | `product(A)` |\n\n#### `string_agg(arg)`\n\n<div class="nostroke_table"></div>\n\n| **Description** | Concatenates the column string values with a comma separator (`,`). This function is [affected by ordering](#order-by-clause-in-aggregate-functions). |\n| **Example** | `string_agg(S, \',\')` |\n| **Alias(es)** | `group_concat(arg)`, `listagg(arg)` |\n\n#### `string_agg(arg, sep)`\n\n<div class="nostroke_table"></div>\n\n| **Description** | Concatenates the column string values with a separator. This function is [affected by ordering](#order-by-clause-in-aggregate-functions). |\n| **Example** | `string_agg(S, \',\')` |\n| **Alias(es)** | `group_concat(arg, sep)`, `listagg(arg, sep)` |\n\n#### `sum(arg)`\n\n<div class="nostroke_table"></div>\n\n| **Description** | Calculates the sum of all non-null values in `arg` / counts `true` values when `arg` is boolean. The floating-point versions of this function are [affected by ordering](#order-by-clause-in-aggregate-functions). |\n| **Example** | `sum(A)` |\n\n#### `weighted_avg(arg, weight)`\n\n<div class="nostroke_table"></div>\n\n| **Description** | Calculates the weighted average of all non-null values in `arg`, where each value is scaled by its corresponding `weight`. If `weight` is `NULL`, the value will be skipped. This function is [affected by ordering](#order-by-clause-in-aggregate-functions). |\n| **Example** | `weighted_avg(A, W)` |\n| **Alias(es)** | `wavg(arg, weight)` |\n\n## Approximate Aggregates\n\nThe table below shows the available approximate aggregate functions.\n\n| Function | Description | Example |\n|:---|:---|:---|\n| `approx_count_distinct(x)` | Calculates the approximate count of distinct elements using HyperLogLog. | `approx_count_distinct(A)` |\n| `approx_quantile(x, pos)` | Calculates the approximate quantile using T-Digest. | `approx_quantile(A, 0.5)` |\n| `approx_top_k(arg, k)` | Calculates a `LIST` of the `k` approximately most frequent values of `arg` using Filtered Space-Saving. | |\n| `reservoir_quantile(x, quantile, sample_size = 8192)` | Calculates the approximate quantile using reservoir sampling, the sample size is optional and uses 8192 as a default size. | `reservoir_quantile(A, 0.5, 1024)` |\n\n## Statistical Aggregates\n\nThe table below shows the available statistical aggregate functions.\nThey all ignore `NULL` values (in the case of a single input column `x`), or pairs where either input is `NULL` (in the case of two input columns `y` and `x`).\n\n| Function | Description |\n|:--|:--------|\n| [`corr(y, x)`](#corry-x) | The correlation coefficient. |\n| [`covar_pop(y, x)`](#covar_popy-x) | The population covariance, which does not include bias correction. |\n| [`covar_samp(y, x)`](#covar_sampy-x) | The sample covariance, which includes Bessel\'s bias correction. |\n| [`entropy(x)`](#entropyx) | The log-2 entropy of count input-values. |\n| [`kurtosis_pop(x)`](#kurtosis_popx) | The excess kurtosis (Fisher’s definition) without bias correction. |\n| [`kurtosis(x)`](#kurtosisx) | The excess kurtosis (Fisher\'s definition) with bias correction according to the sample size. |\n| [`mad(x)`](#madx) | The median absolute deviation. Temporal types return a positive `INTERVAL`. |\n| [`median(x)`](#medianx) | The middle value of the set. For even value counts, quantitative values are averaged and ordinal values return the lower value. |\n| [`mode(x)`](#modex)| The most frequent value. This function is [affected by ordering](#order-by-clause-in-aggregate-functions). |\n| [`quantile_cont(x, pos)`](#quantile_contx-pos) | The interpolated `pos`-quantile of `x` for `-1 <= pos <= 1`. Returns the `pos * (n_nonnull_values - 1)`th (zero-indexed, in the specified order) value of `x` or an interpolation between the adjacent values if the index is not an integer. Values of `pos` between `-1` and `0` correspond to counting backwards from `1`. More precisely, `quantile_cont(x, -y) = quantile_cont(x, 1 - y)`. Intuitively, arranges the values of `x` as equispaced *points* on a line, starting at 0 and ending at 1, and returns the (interpolated) value at `pos`. This is Type 7 in Hyndman & Fan (1996). If `pos` is a `LIST` of `FLOAT`s, then the result is a `LIST` of the corresponding interpolated quantiles. |\n| [`quantile_disc(x, pos)`](#quantile_discx-pos) | The discrete `pos`-quantile of `x` for `0 <= pos <= 1`. Returns  the `greatest(ceil(pos * n_nonnull_values) - 1, 0)`th (zero-indexed, in the specified order) value of `x`. Intuitively, assigns to each value of `x` an equisized *sub-interval* (left-open and right-closed except for the initial interval) of the interval `[0, 1]`, and picks the value of the sub-interval that contains `pos`. This is Type 1 in Hyndman & Fan (1996). If `pos` is a `LIST` of `FLOAT`s, then the result is a `LIST` of the corresponding discrete quantiles. |\n| [`regr_avgx(y, x)`](#regr_avgxy-x) | The average of the independent variable for non-`NULL` pairs, where x is the independent variable and y is the dependent variable. |\n| [`regr_avgy(y, x)`](#regr_avgyy-x) | The average of the dependent variable for non-`NULL` pairs, where x is the independent variable and y is the dependent variable. |\n| [`regr_count(y, x)`](#regr_county-x) | The number of non-`NULL` pairs. |\n| [`regr_intercept(y, x)`](#regr_intercepty-x) | The intercept of the univariate linear regression line, where x is the independent variable and y is the dependent variable. |\n| [`regr_r2(y, x)`](#regr_r2y-x) | The squared Pearson correlation coefficient between y and x. Also: The coefficient of determination in a linear regression, where x is the independent variable and y is the dependent variable. |\n| [`regr_slope(y, x)`](#regr_slopey-x) | The slope of the linear regression line, where x is the independent variable and y is the dependent variable. |\n| [`regr_sxx(y, x)`](#regr_sxxy-x) | The sample variance, which includes Bessel\'s bias correction, of the independent variable for non-`NULL` pairs, where x is the independent variable and y is the dependent variable. |\n| [`regr_sxy(y, x)`](#regr_sxyy-x) | The sample covariance, which includes Bessel\'s bias correction. |\n| [`regr_syy(y, x)`](#regr_syyy-x) | The sample variance, which includes Bessel\'s bias correction, of the dependent variable for non-`NULL` pairs , where x is the independent variable and y is the dependent variable. |\n| [`skewness(x)`](#skewnessx) | The skewness. |\n| [`sem(x)`](#semx) | The standard error of the mean. |\n| [`stddev_pop(x)`](#stddev_popx) | The population standard deviation. |\n| [`stddev_samp(x)`](#stddev_sampx) | The sample standard deviation. |\n| [`var_pop(x)`](#var_popx) | The population variance, which does not include bias correction. |\n| [`var_samp(x)`](#var_sampx) | The sample variance, which includes Bessel\'s bias correction. |\n\n#### `corr(y, x)`\n\n<div class="nostroke_table"></div>\n\n| **Description** | The correlation coefficient.\n| **Formula** | `covar_pop(y, x) / (stddev_pop(x) * stddev_pop(y))` |\n\n#### `covar_pop(y, x)`\n\n<div class="nostroke_table"></div>\n\n| **Description** | The population covariance, which does not include bias correction. |\n| **Formula** | `(sum(x*y) - sum(x) * sum(y) / regr_count(y, x)) / regr_count(y, x)`, `covar_samp(y, x) * (1 - 1 / regr_count(y, x))` |\n\n#### `covar_samp(y, x)`\n\n<div class="nostroke_table"></div>\n\n| **Description** | The sample covariance, which includes Bessel\'s bias correction. |\n| **Formula** | `(sum(x*y) - sum(x) * sum(y) / regr_count(y, x)) / (regr_count(y, x) - 1)`, `covar_pop(y, x) / (1 - 1 / regr_count(y, x))` |\n| **Alias(es)** | `regr_sxy(y, x)` |\n\n#### `entropy(x)`\n\n<div class="nostroke_table"></div>\n\n| **Description** | The log-2 entropy of count input-values. |\n| **Formula** | - |\n\n#### `kurtosis_pop(x)`\n\n<div class="nostroke_table"></div>\n\n| **Description** | The excess kurtosis (Fisher’s definition) without bias correction. |\n| **Formula** | - |\n\n#### `kurtosis(x)`\n\n<div class="nostroke_table"></div>\n\n| **Description** | The excess kurtosis (Fisher\'s definition) with bias correction according to the sample size. |\n| **Formula** | - |\n\n#### `mad(x)`\n\n<div class="nostroke_table"></div>\n\n| **Description** | The median absolute deviation. Temporal types return a positive `INTERVAL`. |\n| **Formula** | `median(abs(x - median(x)))` |\n\n#### `median(x)`\n\n<div class="nostroke_table"></div>\n\n| **Description** | The middle value of the set. For even value counts, quantitative values are averaged and ordinal values return the lower value. |\n| **Formula** | `quantile_cont(x, 0.5)` |\n\n#### `mode(x)`\n\n<div class="nostroke_table"></div>\n\n| **Description** | The most frequent value. This function is [affected by ordering](#order-by-clause-in-aggregate-functions). |\n| **Formula** | - |\n\n#### `quantile_cont(x, pos)`\n\n<div class="nostroke_table"></div>\n\n| **Description** | The interpolated `pos`-quantile of `x` for `0 <= pos <= 1`. Returns the `pos * (n_nonnull_values - 1)`th (zero-indexed, in the specified order) value of `x` or an interpolation between the adjacent values if the index is not an integer. Intuitively, arranges the values of `x` as equispaced *points* on a line, starting at 0 and ending at 1, and returns the (interpolated) value at `pos`. This is Type 7 in Hyndman & Fan (1996). If `pos` is a `LIST` of `FLOAT`s, then the result is a `LIST` of the corresponding interpolated quantiles. |\n| **Formula** | - |\n\n#### `quantile_disc(x, pos)`\n\n<div class="nostroke_table"></div>\n\n| **Description** | The discrete `pos`-quantile of `x` for `0 <= pos <= 1`. Returns  the `greatest(ceil(pos * n_nonnull_values) - 1, 0)`th (zero-indexed, in the specified order) value of `x`. Intuitively, assigns to each value of `x` an equisized *sub-interval* (left-open and right-closed except for the initial interval) of the interval `[0, 1]`, and picks the value of the sub-interval that contains `pos`. This is Type 1 in Hyndman & Fan (1996). If `pos` is a `LIST` of `FLOAT`s, then the result is a `LIST` of the corresponding discrete quantiles.  |\n| **Formula** | - |\n| **Alias(es)** | `quantile` |\n\n#### `regr_avgx(y, x)`\n\n<div class="nostroke_table"></div>\n\n| **Description** | The average of the independent variable for non-`NULL` pairs, where x is the independent variable and y is the dependent variable. |\n| **Formula** | - |\n\n#### `regr_avgy(y, x)`\n\n<div class="nostroke_table"></div>\n\n| **Description** | The average of the dependent variable for non-`NULL` pairs, where x is the independent variable and y is the dependent variable. |\n| **Formula** | - |\n\n#### `regr_count(y, x)`\n\n<div class="nostroke_table"></div>\n\n| **Description** | The number of non-`NULL` pairs. |\n| **Formula** | - |\n\n#### `regr_intercept(y, x)`\n\n<div class="nostroke_table"></div>\n\n| **Description** | The intercept of the univariate linear regression line, where x is the independent variable and y is the dependent variable. |\n| **Formula** | `regr_avgy(y, x) - regr_slope(y, x) * regr_avgx(y, x)` |\n\n#### `regr_r2(y, x)`\n\n<div class="nostroke_table"></div>\n\n| **Description** | The squared Pearson correlation coefficient between y and x. Also: The coefficient of determination in a linear regression, where x is the independent variable and y is the dependent variable. |\n| **Formula** | - |\n\n#### `regr_slope(y, x)`\n\n<div class="nostroke_table"></div>\n\n| **Description** | Returns the slope of the linear regression line, where x is the independent variable and y is the dependent variable. |\n| **Formula** | `regr_sxy(y, x) / regr_sxx(y, x)` |\n| **Alias(es)** | - |\n\n#### `regr_sxx(y, x)`\n\n<div class="nostroke_table"></div>\n\n| **Description** | The sample variance, which includes Bessel\'s bias correction, of the independent variable for non-`NULL` pairs, where x is the independent variable and y is the dependent variable. |\n| **Formula** | - |\n\n#### `regr_sxy(y, x)`\n\n<div class="nostroke_table"></div>\n\n| **Description** | The sample covariance, which includes Bessel\'s bias correction. |\n| **Formula** | `(sum(x*y) - sum(x) * sum(y) / regr_count(y, x)) / (regr_count(y, x) - 1)`, `covar_pop(y, x) / (1 - 1 / regr_count(y, x))` |\n| **Alias(es)** | `covar_samp(y, x)` |\n\n#### `regr_syy(y, x)`\n\n<div class="nostroke_table"></div>\n\n| **Description** | The sample variance, which includes Bessel\'s bias correction, of the dependent variable for non-`NULL` pairs, where x is the independent variable and y is the dependent variable. |\n| **Formula** | - |\n\n#### `sem(x)`\n\n<div class="nostroke_table"></div>\n\n| **Description** | The standard error of the mean. |\n| **Formula** | - |\n\n#### `skewness(x)`\n\n<div class="nostroke_table"></div>\n\n| **Description** | The skewness. |\n| **Formula** | - |\n\n#### `stddev_pop(x)`\n\n<div class="nostroke_table"></div>\n\n| **Description** | The population standard deviation. |\n| **Formula** | `sqrt(var_pop(x))` |\n\n#### `stddev_samp(x)`\n\n<div class="nostroke_table"></div>\n\n| **Description** | The sample standard deviation. |\n| **Formula** | `sqrt(var_samp(x))`|\n| **Alias(es)** | `stddev(x)`|\n\n#### `var_pop(x)`\n\n<div class="nostroke_table"></div>\n\n| **Description** | The population variance, which does not include bias correction. |\n| **Formula** | `(sum(x^2) - sum(x)^2 / count(x)) / count(x)`, `var_samp(y, x) * (1 - 1 / count(x))` |\n\n#### `var_samp(x)`\n\n<div class="nostroke_table"></div>\n\n| **Description** | The sample variance, which includes Bessel\'s bias correction. |\n| **Formula** | `(sum(x^2) - sum(x)^2 / count(x)) / (count(x) - 1)`, `var_pop(y, x) / (1 - 1 / count(x))` |\n| **Alias(es)** | `variance(arg, val)` |\n\n## Ordered Set Aggregate Functions\n\nThe table below shows the available “ordered set” aggregate functions.\nThese functions are specified using the `WITHIN GROUP (ORDER BY sort_expression)` syntax,\nand they are converted to an equivalent aggregate function that takes the ordering expression\nas the first argument.\n\n| Function | Equivalent |\n|:---|:---|\n| <code>mode() WITHIN GROUP (ORDER BY column [(ASC&#124;DESC)])</code> | <code>mode(column ORDER BY column [(ASC&#124;DESC)])</code> |\n| <code>percentile_cont(fraction) WITHIN GROUP (ORDER BY column [(ASC&#124;DESC)])</code> | <code>quantile_cont(column, fraction ORDER BY column [(ASC&#124;DESC)])</code> |\n| <code>percentile_cont(fractions) WITHIN GROUP (ORDER BY column [(ASC&#124;DESC)])</code> | <code>quantile_cont(column, fractions ORDER BY column [(ASC&#124;DESC)])</code> |\n| <code>percentile_disc(fraction) WITHIN GROUP (ORDER BY column [(ASC&#124;DESC)])</code> | <code>quantile_disc(column, fraction ORDER BY column [(ASC&#124;DESC)])</code> |\n| <code>percentile_disc(fractions) WITHIN GROUP (ORDER BY column [(ASC&#124;DESC)])</code> | <code>quantile_disc(column, fractions ORDER BY column [(ASC&#124;DESC)])</code> |\n\n## Miscellaneous Aggregate Functions\n\n| Function | Description | Alias |\n|:--|:---|:--|\n| `grouping()` | For queries with `GROUP BY` and either [`ROLLUP` or `GROUPING SETS`]({% link docs/stable/sql/query_syntax/grouping_sets.md %}#identifying-grouping-sets-with-grouping_id): Returns an integer identifying which of the argument expressions where used to group on to create the current super-aggregate row. | `grouping_id()` |\n',"array.md":'---\ntitle: Array Functions\n---\n\n<!-- markdownlint-disable MD001 -->\n\nAll [`LIST` functions]({% link docs/stable/sql/functions/list.md %}) work with the [`ARRAY` data type]({% link docs/stable/sql/data_types/array.md %}). Additionally, several `ARRAY`-native functions are also supported.\n\n## Array-Native Functions\n<!-- Start of section generated by scripts/generate_sql_function_docs.py; categories: [array] -->\n<!-- markdownlint-disable MD056 -->\n\n| Function | Description |\n|:--|:-------|\n| [`array_cosine_distance(array1, array2)`](#array_cosine_distancearray1-array2) | Computes the cosine distance between two arrays of the same size. The array elements can not be `NULL`. The arrays can have any size as long as the size is the same for both arguments. |\n| [`array_cosine_similarity(array1, array2)`](#array_cosine_similarityarray1-array2) | Computes the cosine similarity between two arrays of the same size. The array elements can not be `NULL`. The arrays can have any size as long as the size is the same for both arguments. |\n| [`array_cross_product(array, array)`](#array_cross_productarray-array) | Computes the cross product of two arrays of size 3. The array elements can not be `NULL`. |\n| [`array_distance(array1, array2)`](#array_distancearray1-array2) | Computes the distance between two arrays of the same size. The array elements can not be `NULL`. The arrays can have any size as long as the size is the same for both arguments. |\n| [`array_dot_product(array1, array2)`](#array_inner_productarray1-array2) | Alias for `array_inner_product`. |\n| [`array_inner_product(array1, array2)`](#array_inner_productarray1-array2) | Computes the inner product between two arrays of the same size. The array elements can not be `NULL`. The arrays can have any size as long as the size is the same for both arguments. |\n| [`array_negative_dot_product(array1, array2)`](#array_negative_inner_productarray1-array2) | Alias for `array_negative_inner_product`. |\n| [`array_negative_inner_product(array1, array2)`](#array_negative_inner_productarray1-array2) | Computes the negative inner product between two arrays of the same size. The array elements can not be `NULL`. The arrays can have any size as long as the size is the same for both arguments. |\n| [`array_value(arg, ...)`](#array_valuearg-) | Creates an `ARRAY` containing the argument values. |\n\n<!-- markdownlint-enable MD056 -->\n\n#### `array_cosine_distance(array1, array2)`\n\n<div class="nostroke_table"></div>\n\n| **Description** | Computes the cosine distance between two arrays of the same size. The array elements can not be `NULL`. The arrays can have any size as long as the size is the same for both arguments. |\n| **Example** | `array_cosine_distance(array_value(1.0::FLOAT, 2.0::FLOAT, 3.0::FLOAT), array_value(2.0::FLOAT, 3.0::FLOAT, 4.0::FLOAT))` |\n| **Result** | `0.007416606` |\n\n#### `array_cosine_similarity(array1, array2)`\n\n<div class="nostroke_table"></div>\n\n| **Description** | Computes the cosine similarity between two arrays of the same size. The array elements can not be `NULL`. The arrays can have any size as long as the size is the same for both arguments. |\n| **Example** | `array_cosine_similarity(array_value(1.0::FLOAT, 2.0::FLOAT, 3.0::FLOAT), array_value(2.0::FLOAT, 3.0::FLOAT, 4.0::FLOAT))` |\n| **Result** | `0.9925834` |\n\n#### `array_cross_product(array, array)`\n\n<div class="nostroke_table"></div>\n\n| **Description** | Computes the cross product of two arrays of size 3. The array elements can not be `NULL`. |\n| **Example** | `array_cross_product(array_value(1.0::FLOAT, 2.0::FLOAT, 3.0::FLOAT), array_value(2.0::FLOAT, 3.0::FLOAT, 4.0::FLOAT))` |\n| **Result** | `[-1.0, 2.0, -1.0]` |\n\n#### `array_distance(array1, array2)`\n\n<div class="nostroke_table"></div>\n\n| **Description** | Computes the distance between two arrays of the same size. The array elements can not be `NULL`. The arrays can have any size as long as the size is the same for both arguments. |\n| **Example** | `array_distance(array_value(1.0::FLOAT, 2.0::FLOAT, 3.0::FLOAT), array_value(2.0::FLOAT, 3.0::FLOAT, 4.0::FLOAT))` |\n| **Result** | `1.7320508` |\n\n#### `array_inner_product(array1, array2)`\n\n<div class="nostroke_table"></div>\n\n| **Description** | Computes the inner product between two arrays of the same size. The array elements can not be `NULL`. The arrays can have any size as long as the size is the same for both arguments. |\n| **Example** | `array_inner_product(array_value(1.0::FLOAT, 2.0::FLOAT, 3.0::FLOAT), array_value(2.0::FLOAT, 3.0::FLOAT, 4.0::FLOAT))` |\n| **Result** | `20.0` |\n| **Alias** | `array_dot_product` |\n\n#### `array_negative_inner_product(array1, array2)`\n\n<div class="nostroke_table"></div>\n\n| **Description** | Computes the negative inner product between two arrays of the same size. The array elements can not be `NULL`. The arrays can have any size as long as the size is the same for both arguments. |\n| **Example** | `array_negative_inner_product(array_value(1.0::FLOAT, 2.0::FLOAT, 3.0::FLOAT), array_value(2.0::FLOAT, 3.0::FLOAT, 4.0::FLOAT))` |\n| **Result** | `-20.0` |\n| **Alias** | `array_negative_dot_product` |\n\n#### `array_value(arg, ...)`\n\n<div class="nostroke_table"></div>\n\n| **Description** | Creates an `ARRAY` containing the argument values. |\n| **Example** | `array_value(1.0::FLOAT, 2.0::FLOAT, 3.0::FLOAT)` |\n| **Result** | `[1.0, 2.0, 3.0]` |\n\n<!-- End of section generated by scripts/generate_sql_function_docs.py -->\n',"bitstring.md":`---
title: Bitstring Functions
---

<!-- markdownlint-disable MD001 -->

This section describes functions and operators for examining and manipulating [\`BITSTRING\`]({% link docs/stable/sql/data_types/bitstring.md %}) values.
Bitstrings must be of equal length when performing the bitwise operands AND, OR and XOR. When bit shifting, the original length of the string is preserved.

## Bitstring Operators

The table below shows the available mathematical operators for \`BIT\` type.

<!-- markdownlint-disable MD056 -->

| Operator | Description | Example | Result |
|:---|:---|:---|---:|
| \`&\` | Bitwise AND | \`'10101'::BITSTRING & '10001'::BITSTRING\` | \`10001\` |
| \`|\` | Bitwise OR | \`'1011'::BITSTRING | '0001'::BITSTRING\` | \`1011\` |
| \`xor\` | Bitwise XOR | \`xor('101'::BITSTRING, '001'::BITSTRING)\` | \`100\` |
| \`~\` | Bitwise NOT | \`~('101'::BITSTRING)\` | \`010\` |
| \`<<\` | Bitwise shift left | \`'1001011'::BITSTRING << 3\` | \`1011000\` |
| \`>>\` | Bitwise shift right | \`'1001011'::BITSTRING >> 3\` | \`0001001\` |

<!-- markdownlint-enable MD056 -->

## Bitstring Functions

The table below shows the available scalar functions for \`BIT\` type.

| Name | Description |
|:--|:-------|
| [\`bit_count(bitstring)\`](#bit_countbitstring) | Returns the number of set bits in the bitstring. |
| [\`bit_length(bitstring)\`](#bit_lengthbitstring) | Returns the number of bits in the bitstring. |
| [\`bit_position(substring, bitstring)\`](#bit_positionsubstring-bitstring) | Returns first starting index of the specified substring within bits, or zero if it's not present. The first (leftmost) bit is indexed 1. |
| [\`bitstring(bitstring, length)\`](#bitstringbitstring-length) | Returns a bitstring of determined length. |
| [\`get_bit(bitstring, index)\`](#get_bitbitstring-index) | Extracts the nth bit from bitstring; the first (leftmost) bit is indexed 0. |
| [\`length(bitstring)\`](#lengthbitstring) | Alias for \`bit_length\`. |
| [\`octet_length(bitstring)\`](#octet_lengthbitstring) | Returns the number of bytes in the bitstring. |
| [\`set_bit(bitstring, index, new_value)\`](#set_bitbitstring-index-new_value) | Sets the nth bit in bitstring to newvalue; the first (leftmost) bit is indexed 0. Returns a new bitstring. |

#### \`bit_count(bitstring)\`

<div class="nostroke_table"></div>

| **Description** | Returns the number of set bits in the bitstring. |
| **Example** | \`bit_count('1101011'::BITSTRING)\` |
| **Result** | \`5\` |

#### \`bit_length(bitstring)\`

<div class="nostroke_table"></div>

| **Description** | Returns the number of bits in the bitstring. |
| **Example** | \`bit_length('1101011'::BITSTRING)\` |
| **Result** | \`7\` |

#### \`bit_position(substring, bitstring)\`

<div class="nostroke_table"></div>

| **Description** | Returns first starting index of the specified substring within bits, or zero if it's not present. The first (leftmost) bit is indexed 1 |
| **Example** | \`bit_position('010'::BITSTRING, '1110101'::BITSTRING)\` |
| **Result** | \`4\` |

#### \`bitstring(bitstring, length)\`

<div class="nostroke_table"></div>

| **Description** | Returns a bitstring of determined length. |
| **Example** | \`bitstring('1010'::BITSTRING, 7)\` |
| **Result** | \`0001010\` |

#### \`get_bit(bitstring, index)\`

<div class="nostroke_table"></div>

| **Description** | Extracts the nth bit from bitstring; the first (leftmost) bit is indexed 0. |
| **Example** | \`get_bit('0110010'::BITSTRING, 2)\` |
| **Result** | \`1\` |

#### \`length(bitstring)\`

<div class="nostroke_table"></div>

| **Description** | Alias for \`bit_length\`. |
| **Example** | \`length('1101011'::BITSTRING)\` |
| **Result** | \`7\` |

#### \`octet_length(bitstring)\`

<div class="nostroke_table"></div>

| **Description** | Returns the number of bytes in the bitstring. |
| **Example** | \`octet_length('1101011'::BITSTRING)\` |
| **Result** | \`1\` |

#### \`set_bit(bitstring, index, new_value)\`

<div class="nostroke_table"></div>

| **Description** | Sets the nth bit in bitstring to newvalue; the first (leftmost) bit is indexed 0. Returns a new bitstring. |
| **Example** | \`set_bit('0110010'::BITSTRING, 2, 0)\` |
| **Result** | \`0100010\` |

## Bitstring Aggregate Functions

These aggregate functions are available for \`BIT\` type.

| Name | Description |
|:--|:-------|
| [\`bit_and(arg)\`](#bit_andarg) | Returns the bitwise AND operation performed on all bitstrings in a given expression. |
| [\`bit_or(arg)\`](#bit_orarg) | Returns the bitwise OR operation performed on all bitstrings in a given expression. |
| [\`bit_xor(arg)\`](#bit_xorarg) | Returns the bitwise XOR operation performed on all bitstrings in a given expression. |
| [\`bitstring_agg(arg)\`](#bitstring_aggarg) | Returns a bitstring with bits set for each distinct position defined in \`arg\`. |
| [\`bitstring_agg(arg, min, max)\`](#bitstring_aggarg-min-max) | Returns a bitstring with bits set for each distinct position defined in \`arg\`. All positions must be within the range [\`min\`, \`max\`] or an \`Out of Range Error\` will be thrown. |

#### \`bit_and(arg)\`

<div class="nostroke_table"></div>

| **Description** | Returns the bitwise AND operation performed on all bitstrings in a given expression. |
| **Example** | \`bit_and(A)\` |

#### \`bit_or(arg)\`

<div class="nostroke_table"></div>

| **Description** | Returns the bitwise OR operation performed on all bitstrings in a given expression. |
| **Example** | \`bit_or(A)\` |

#### \`bit_xor(arg)\`

<div class="nostroke_table"></div>

| **Description** | Returns the bitwise XOR operation performed on all bitstrings in a given expression. |
| **Example** | \`bit_xor(A)\` |

#### \`bitstring_agg(arg)\`

<div class="nostroke_table"></div>

| **Description** | The \`bitstring_agg\` function takes any integer type as input and returns a bitstring with bits set for each distinct value. The left-most bit represents the smallest value in the column and the right-most bit the maximum value. If possible, the min and max are retrieved from the column statistics. Otherwise, it is also possible to provide the min and max values. |
| **Example** | \`bitstring_agg(A)\` |

> Tip The combination of \`bit_count\` and \`bitstring_agg\` can be used as an alternative to \`count(DISTINCT ...)\`, with possible performance improvements in cases of low cardinality and dense values.

#### \`bitstring_agg(arg, min, max)\`

<div class="nostroke_table"></div>

| **Description** | Returns a bitstring with bits set for each distinct position defined in \`arg\`. All positions must be within the range [\`min\`, \`max\`] or an \`Out of Range Error\` will be thrown. |
| **Example** | \`bitstring_agg(A, 1, 42)\` |
`,"blob.md":"---\ntitle: Blob Functions\n---\n\n<!-- markdownlint-disable MD001 -->\n\nThis section describes functions and operators for examining and manipulating [`BLOB` values]({% link docs/stable/sql/data_types/blob.md %}).\n\n<!-- Start of section generated by scripts/generate_sql_function_docs.py; categories: [blob] -->\n<!-- markdownlint-disable MD056 -->\n\n| Function | Description |\n|:--|:-------|\n| [`arg1 || arg2`](#arg1--arg2) | Concatenates two strings, lists, or blobs. Any `NULL` input results in `NULL`. See also [`concat(arg1, arg2, ...)`]({% link docs/stable/sql/functions/text.md %}#concatvalue-) and [`list_concat(list1, list2, ...)`]({% link docs/stable/sql/functions/list.md %}#list_concatlist_1--list_n). |\n| [`base64(blob)`](#to_base64blob) | Alias for `to_base64`. |\n| [`decode(blob)`](#decodeblob) | Converts `blob` to `VARCHAR`. Fails if `blob` is not valid UTF-8. |\n| [`encode(string)`](#encodestring) | Converts the `string` to `BLOB`. Converts UTF-8 characters into literal encoding. |\n| [`from_base64(string)`](#from_base64string) | Converts a base64 encoded `string` to a character string (`BLOB`). |\n| [`from_binary(value)`](#unbinvalue) | Alias for `unbin`. |\n| [`from_hex(value)`](#unhexvalue) | Alias for `unhex`. |\n| [`hex(blob)`](#hexblob) | Converts `blob` to `VARCHAR` using hexadecimal encoding. |\n| [`md5(blob)`](#md5blob) | Returns the MD5 hash of the `blob` as a `VARCHAR`. |\n| [`md5_number(blob)`](#md5_numberblob) | Returns the MD5 hash of the `blob` as a `HUGEINT`. |\n| [`octet_length(blob)`](#octet_lengthblob) | Number of bytes in `blob`. |\n| [`read_blob(source)`](#read_blobsource) | Returns the content from `source` (a filename, a list of filenames, or a glob pattern) as a `BLOB`. See the [`read_blob` guide]({% link docs/stable/guides/file_formats/read_file.md %}#read_blob) for more details. |\n| [`repeat(blob, count)`](#repeatblob-count) | Repeats the `blob` `count` number of times. |\n| [`sha1(blob)`](#sha1blob) | Returns a `VARCHAR` with the SHA-1 hash of the `blob`. |\n| [`sha256(blob)`](#sha256blob) | Returns a `VARCHAR` with the SHA-256 hash of the `blob`. |\n| [`to_base64(blob)`](#to_base64blob) | Converts a `blob` to a base64 encoded string. |\n| [`to_hex(blob)`](#hexblob) | Alias for `hex`. |\n| [`unbin(value)`](#unbinvalue) | Converts a `value` from binary representation to a blob. |\n| [`unhex(value)`](#unhexvalue) | Converts a `value` from hexadecimal representation to a blob. |\n\n<!-- markdownlint-enable MD056 -->\n\n#### `arg1 || arg2`\n\n<div class=\"nostroke_table\"></div>\n\n| **Description** | Concatenates two strings, lists, or blobs. Any `NULL` input results in `NULL`. See also [`concat(arg1, arg2, ...)`]({% link docs/stable/sql/functions/text.md %}#concatvalue-) and [`list_concat(list1, list2, ...)`]({% link docs/stable/sql/functions/list.md %}#list_concatlist_1--list_n). |\n| **Example 1** | `'Duck' || 'DB'` |\n| **Result** | `DuckDB` |\n| **Example 2** | `[1, 2, 3] || [4, 5, 6]` |\n| **Result** | `[1, 2, 3, 4, 5, 6]` |\n| **Example 3** | `'\\xAA'::BLOB || '\\xBB'::BLOB` |\n| **Result** | `\\xAA\\xBB` |\n\n#### `decode(blob)`\n\n<div class=\"nostroke_table\"></div>\n\n| **Description** | Converts `blob` to `VARCHAR`. Fails if `blob` is not valid UTF-8. |\n| **Example** | `decode('\\xC3\\xBC'::BLOB)` |\n| **Result** | `ü` |\n\n#### `encode(string)`\n\n<div class=\"nostroke_table\"></div>\n\n| **Description** | Converts the `string` to `BLOB`. Converts UTF-8 characters into literal encoding. |\n| **Example** | `encode('my_string_with_ü')` |\n| **Result** | `my_string_with_\\xC3\\xBC` |\n\n#### `from_base64(string)`\n\n<div class=\"nostroke_table\"></div>\n\n| **Description** | Converts a base64 encoded `string` to a character string (`BLOB`). |\n| **Example** | `from_base64('QQ==')` |\n| **Result** | `A` |\n\n#### `hex(blob)`\n\n<div class=\"nostroke_table\"></div>\n\n| **Description** | Converts `blob` to `VARCHAR` using hexadecimal encoding. |\n| **Example** | `hex('\\xAA\\xBB'::BLOB)` |\n| **Result** | `AABB` |\n| **Alias** | `to_hex` |\n\n#### `md5(blob)`\n\n<div class=\"nostroke_table\"></div>\n\n| **Description** | Returns the MD5 hash of the `blob` as a `VARCHAR`. |\n| **Example** | `md5('\\xAA\\xBB'::BLOB)` |\n| **Result** | `58cea1f6b2b06520613e09af90dc1c47` |\n\n#### `md5_number(blob)`\n\n<div class=\"nostroke_table\"></div>\n\n| **Description** | Returns the MD5 hash of the `blob` as a `HUGEINT`. |\n| **Example** | `md5_number('\\xAA\\xBB'::BLOB)` |\n| **Result** | `94525045605907259200829535064523132504` |\n\n#### `octet_length(blob)`\n\n<div class=\"nostroke_table\"></div>\n\n| **Description** | Number of bytes in `blob`. |\n| **Example** | `octet_length('\\xAA\\xBB'::BLOB)` |\n| **Result** | `2` |\n\n#### `read_blob(source)`\n\n<div class=\"nostroke_table\"></div>\n\n| **Description** | Returns the content from `source` (a filename, a list of filenames, or a glob pattern) as a `BLOB`. See the [`read_blob` guide]({% link docs/stable/guides/file_formats/read_file.md %}#read_blob) for more details. |\n| **Example** | `read_blob('hello.bin')` |\n| **Result** | `hello\\x0A` |\n\n#### `repeat(blob, count)`\n\n<div class=\"nostroke_table\"></div>\n\n| **Description** | Repeats the `blob` `count` number of times. |\n| **Example** | `repeat('\\xAA\\xBB'::BLOB, 5)` |\n| **Result** | `\\xAA\\xBB\\xAA\\xBB\\xAA\\xBB\\xAA\\xBB\\xAA\\xBB` |\n\n#### `sha1(blob)`\n\n<div class=\"nostroke_table\"></div>\n\n| **Description** | Returns a `VARCHAR` with the SHA-1 hash of the `blob`. |\n| **Example** | `sha1('\\xAA\\xBB'::BLOB)` |\n| **Result** | `65b1e351a6cbfeb41c927222bc9ef53aad3396b0` |\n\n#### `sha256(blob)`\n\n<div class=\"nostroke_table\"></div>\n\n| **Description** | Returns a `VARCHAR` with the SHA-256 hash of the `blob`. |\n| **Example** | `sha256('\\xAA\\xBB'::BLOB)` |\n| **Result** | `d798d1fac6bd4bb1c11f50312760351013379a0ab6f0a8c0af8a506b96b2525a` |\n\n#### `to_base64(blob)`\n\n<div class=\"nostroke_table\"></div>\n\n| **Description** | Converts a `blob` to a base64 encoded string. |\n| **Example** | `to_base64('A'::BLOB)` |\n| **Result** | `QQ==` |\n| **Alias** | `base64` |\n\n#### `unbin(value)`\n\n<div class=\"nostroke_table\"></div>\n\n| **Description** | Converts a `value` from binary representation to a blob. |\n| **Example** | `unbin('0110')` |\n| **Result** | `\\x06` |\n| **Alias** | `from_binary` |\n\n#### `unhex(value)`\n\n<div class=\"nostroke_table\"></div>\n\n| **Description** | Converts a `value` from hexadecimal representation to a blob. |\n| **Example** | `unhex('2A')` |\n| **Result** | `*` |\n| **Alias** | `from_hex` |\n\n<!-- End of section generated by scripts/generate_sql_function_docs.py -->\n","case.md":`---
title: CASE Expression
---

<div id="rrdiagram"></div>

The \`CASE\` expression performs a switch based on a condition. The basic form is identical to the ternary condition used in many programming languages (\`CASE WHEN cond THEN a ELSE b END\` is equivalent to \`cond ? a : b\`). With a single condition this can be expressed with \`IF(cond, a, b)\`.

\`\`\`sql
CREATE OR REPLACE TABLE integers AS SELECT unnest([1, 2, 3]) AS i;
SELECT i, CASE WHEN i > 2 THEN 1 ELSE 0 END AS test
FROM integers;
\`\`\`

| i | test |
|--:|-----:|
| 1 | 0    |
| 2 | 0    |
| 3 | 1    |

This is equivalent to:

\`\`\`sql
SELECT i, IF(i > 2, 1, 0) AS test
FROM integers;
\`\`\`

The \`WHEN cond THEN expr\` part of the \`CASE\` expression can be chained, whenever any of the conditions returns true for a single tuple, the corresponding expression is evaluated and returned.

\`\`\`sql
CREATE OR REPLACE TABLE integers AS SELECT unnest([1, 2, 3]) AS i;
SELECT i, CASE WHEN i = 1 THEN 10 WHEN i = 2 THEN 20 ELSE 0 END AS test
FROM integers;
\`\`\`

| i | test |
|--:|-----:|
| 1 | 10   |
| 2 | 20   |
| 3 | 0    |

The \`ELSE\` clause of the \`CASE\` expression is optional. If no \`ELSE\` clause is provided and none of the conditions match, the \`CASE\` expression will return \`NULL\`.

\`\`\`sql
CREATE OR REPLACE TABLE integers AS SELECT unnest([1, 2, 3]) AS i;
SELECT i, CASE WHEN i = 1 THEN 10 END AS test
FROM integers;
\`\`\`

| i | test |
|--:|-----:|
| 1 | 10   |
| 2 | NULL |
| 3 | NULL |

It is also possible to provide an individual expression after the \`CASE\` but before the \`WHEN\`. When this is done, the \`CASE\` expression is effectively transformed into a switch statement.

\`\`\`sql
CREATE OR REPLACE TABLE integers AS SELECT unnest([1, 2, 3]) AS i;
SELECT i, CASE i WHEN 1 THEN 10 WHEN 2 THEN 20 WHEN 3 THEN 30 END AS test
FROM integers;
\`\`\`

| i | test |
|--:|-----:|
| 1 | 10   |
| 2 | 20   |
| 3 | 30   |

This is equivalent to:

\`\`\`sql
SELECT i, CASE WHEN i = 1 THEN 10 WHEN i = 2 THEN 20 WHEN i = 3 THEN 30 END AS test
FROM integers;
\`\`\`
`,"cast.md":`---
title: Casting
---

<div id="rrdiagram"></div>

Casting refers to the operation of converting a value in a particular data type to the corresponding value in another data type.
Casting can occur either implicitly or explicitly. The syntax described here performs an explicit cast. More information on casting can be found on the [typecasting page]({% link docs/stable/sql/data_types/typecasting.md %}).

## Explicit Casting

The standard SQL syntax for explicit casting is \`CAST(expr AS TYPENAME)\`, where \`TYPENAME\` is a name (or alias) of one of [DuckDB's data types]({% link docs/stable/sql/data_types/overview.md %}). DuckDB also supports the shorthand \`expr::TYPENAME\`, which is also present in PostgreSQL.

\`\`\`sql
SELECT CAST(i AS VARCHAR) AS i
FROM generate_series(1, 3) tbl(i);
\`\`\`

| i |
|---|
| 1 |
| 2 |
| 3 |

\`\`\`sql
SELECT i::DOUBLE AS i
FROM generate_series(1, 3) tbl(i);
\`\`\`

|  i  |
|----:|
| 1.0 |
| 2.0 |
| 3.0 |

### Casting Rules

Not all casts are possible. For example, it is not possible to convert an \`INTEGER\` to a \`DATE\`. Casts may also throw errors when the cast could not be successfully performed. For example, trying to cast the string \`'hello'\` to an \`INTEGER\` will result in an error being thrown.

\`\`\`sql
SELECT CAST('hello' AS INTEGER);
\`\`\`

\`\`\`console
Conversion Error:
Could not convert string 'hello' to INT32
\`\`\`

The exact behavior of the cast depends on the source and destination types. For example, when casting from \`VARCHAR\` to any other type, the string will be attempted to be converted.

### \`TRY_CAST\`

\`TRY_CAST\` can be used when the preferred behavior is not to throw an error, but instead to return a \`NULL\` value. \`TRY_CAST\` will never throw an error, and will instead return \`NULL\` if a cast is not possible.

\`\`\`sql
SELECT TRY_CAST('hello' AS INTEGER) AS i;
\`\`\`

|  i   |
|------|
| NULL |

## \`cast_to_type\` Function

The \`cast_to_type\` function allows generating a cast from an expression to the type of another column.
For example:

\`\`\`sql
SELECT cast_to_type('42', NULL::INTEGER) AS result;
\`\`\`

\`\`\`text
┌───────┐
│  res  │
│ int32 │
├───────┤
│  42   │
└───────┘
\`\`\`

This function is primarily useful in [macros]({% link docs/stable/guides/snippets/sharing_macros.md %}), as it allows you to maintain types.
This helps with making generic macros that operate on different types. For example, the following macro adds to a number if the input is an \`INTEGER\`:

\`\`\`sql
CREATE TABLE tbl (i INT, s VARCHAR);
INSERT INTO tbl VALUES (42, 'hello world');

CREATE MACRO conditional_add(col, nr) AS
    CASE
        WHEN typeof(col) == 'INTEGER' THEN cast_to_type(col::INTEGER + nr, col)
        ELSE col
    END;
SELECT conditional_add(COLUMNS(*), 100) FROM tbl;
\`\`\`

\`\`\`text
┌───────┬─────────────┐
│   i   │      s      │
│ int32 │   varchar   │
├───────┼─────────────┤
│  142  │ hello world │
└───────┴─────────────┘
\`\`\`

Note that the \`CASE\` statement needs to return the same type in all code paths. We can perform the addition on any input column by adding a cast to the desired type – but we need to cast the result of the addition back to the source type to make the binding work.
`,"collations.md":"---\ntitle: Collations\n---\n\n<div id=\"rrdiagram\"></div>\n\nCollations provide rules for how text should be sorted or compared in the execution engine. Collations are useful for localization, as the rules for how text should be ordered are different for different languages or for different countries. These orderings are often incompatible with one another. For example, in English the letter `y` comes between `x` and `z`. However, in Lithuanian the letter `y` comes between the `i` and `j`. For that reason, different collations are supported. The user must choose which collation they want to use when performing sorting and comparison operations.\n\nBy default, the `BINARY` collation is used. That means that strings are ordered and compared based only on their binary contents. This makes sense for standard ASCII characters (i.e., the letters A-Z and numbers 0-9), but generally does not make much sense for special unicode characters. It is, however, by far the fastest method of performing ordering and comparisons. Hence it is recommended to stick with the `BINARY` collation unless required otherwise.\n\n> The `BINARY` collation is also available under the aliases `C` and `POSIX`.\n\n> Warning Collation support in DuckDB has [some known limitations](https://github.com/duckdb/duckdb/issues?q=is%3Aissue+is%3Aopen+collation+) and has [several planned improvements](https://github.com/duckdb/duckdb/issues/604).\n\n## Using Collations\n\nIn the stand-alone installation of DuckDB three collations are included: `NOCASE`, `NOACCENT` and `NFC`. The `NOCASE` collation compares characters as equal regardless of their casing. The `NOACCENT` collation compares characters as equal regardless of their accents. The `NFC` collation performs NFC-normalized comparisons, see [Unicode normalization](https://en.wikipedia.org/wiki/Unicode_equivalence#Normalization) for more information.\n\n```sql\nSELECT 'hello' = 'hElLO';\n```\n\n```text\nfalse\n```\n\n```sql\nSELECT 'hello' COLLATE NOCASE = 'hElLO';\n```\n\n```text\ntrue\n```\n\n```sql\nSELECT 'hello' = 'hëllo';\n```\n\n```text\nfalse\n```\n\n```sql\nSELECT 'hello' COLLATE NOACCENT = 'hëllo';\n```\n\n```text\ntrue\n```\n\nCollations can be combined by chaining them using the dot operator. Note, however, that not all collations can be combined together. In general, the `NOCASE` collation can be combined with any other collator, but most other collations cannot be combined.\n\n```sql\nSELECT 'hello' COLLATE NOCASE = 'hElLÖ';\n```\n\n```text\nfalse\n```\n\n```sql\nSELECT 'hello' COLLATE NOACCENT = 'hElLÖ';\n```\n\n```text\nfalse\n```\n\n```sql\nSELECT 'hello' COLLATE NOCASE.NOACCENT = 'hElLÖ';\n```\n\n```text\ntrue\n```\n\n## Default Collations\n\nThe collations we have seen so far have all been specified *per expression*. It is also possible to specify a default collator, either on the global database level or on a base table column. The `PRAGMA` `default_collation` can be used to specify the global default collator. This is the collator that will be used if no other one is specified.\n\n```sql\nSET default_collation = NOCASE;\nSELECT 'hello' = 'HeLlo';\n```\n\n```text\ntrue\n```\n\nCollations can also be specified per-column when creating a table. When that column is then used in a comparison, the per-column collation is used to perform that comparison.\n\n```sql\nCREATE TABLE names (name VARCHAR COLLATE NOACCENT);\nINSERT INTO names VALUES ('hännes');\n```\n\n```sql\nSELECT name\nFROM names\nWHERE name = 'hannes';\n```\n\n```text\nhännes\n```\n\nBe careful here, however, as different collations cannot be combined. This can be problematic when you want to compare columns that have a different collation specified.\n\n```sql\nSELECT name\nFROM names\nWHERE name = 'hannes' COLLATE NOCASE;\n```\n\n```console\nERROR: Cannot combine types with different collation!\n```\n\n```sql\nCREATE TABLE other_names (name VARCHAR COLLATE NOCASE);\nINSERT INTO other_names VALUES ('HÄNNES');\n```\n\n```sql\nSELECT names.name AS name, other_names.name AS other_name\nFROM names, other_names\nWHERE names.name = other_names.name;\n```\n\n```console\nERROR: Cannot combine types with different collation!\n```\n\nWe need to manually overwrite the collation:\n\n```sql\nSELECT names.name AS name, other_names.name AS other_name\nFROM names, other_names\nWHERE names.name COLLATE NOACCENT.NOCASE = other_names.name COLLATE NOACCENT.NOCASE;\n```\n\n|  name  | other_name |\n|--------|------------|\n| hännes | HÄNNES     |\n\n## ICU Collations\n\nThe collations we have seen so far are not region-dependent, and do not follow any specific regional rules. If you wish to follow the rules of a specific region or language, you will need to use one of the ICU collations. For that, you need to [load the ICU extension]({% link docs/stable/core_extensions/icu.md %}#installing-and-loading).\n\nLoading this extension will add a number of language and region specific collations to your database. These can be queried using `PRAGMA collations` command, or by querying the `pragma_collations` function.\n\n```sql\nPRAGMA collations;\nSELECT list(collname) FROM pragma_collations();\n```\n\n```text\n[af, am, ar, ar_sa, as, az, be, bg, bn, bo, br, bs, ca, ceb, chr, cs, cy, da, de, de_at, dsb, dz, ee, el, en, en_us, eo, es, et, fa, fa_af, ff, fi, fil, fo, fr, fr_ca, fy, ga, gl, gu, ha, haw, he, he_il, hi, hr, hsb, hu, hy, icu_noaccent, id, id_id, ig, is, it, ja, ka, kk, kl, km, kn, ko, kok, ku, ky, lb, lkt, ln, lo, lt, lv, mk, ml, mn, mr, ms, mt, my, nb, nb_no, ne, nfc, nl, nn, noaccent, nocase, om, or, pa, pa_in, pl, ps, pt, ro, ru, sa, se, si, sk, sl, smn, sq, sr, sr_ba, sr_me, sr_rs, sv, sw, ta, te, th, tk, to, tr, ug, uk, ur, uz, vi, wae, wo, xh, yi, yo, yue, yue_cn, zh, zh_cn, zh_hk, zh_mo, zh_sg, zh_tw, zu]\n```\n\nThese collations can then be used as the other collations would be used before. They can also be combined with the `NOCASE` collation. For example, to use the German collation rules you could use the following code snippet:\n\n```sql\nCREATE TABLE strings (s VARCHAR COLLATE DE);\nINSERT INTO strings VALUES ('Gabel'), ('Göbel'), ('Goethe'), ('Goldmann'), ('Göthe'), ('Götz');\nSELECT * FROM strings ORDER BY s;\n```\n\n```text\n\"Gabel\", \"Göbel\", \"Goethe\", \"Goldmann\", \"Göthe\", \"Götz\"\n```\n","comparison_operators.md":"---\ntitle: Comparisons\n---\n\n## Comparison Operators\n\n<div id=\"rrdiagram2\"></div>\n\nThe table below shows the standard comparison operators.\nWhenever either of the input arguments is `NULL`, the output of the comparison is `NULL`.\n\n| Operator | Description | Example | Result |\n|:---|:---|:---|:---|\n| `<` | less than | `2 < 3` | `true` |\n| `>` | greater than | `2 > 3` | `false` |\n| `<=` | less than or equal to | `2 <= 3` | `true` |\n| `>=` | greater than or equal to | `4 >= NULL` | `NULL` |\n| `=` or `==` | equal | `NULL = NULL` | `NULL` |\n| `<>` or `!=` | not equal | `2 <> 2` | `false` |\n\nThe table below shows the standard distinction operators.\nThese operators treat `NULL` values as equal.\n\n| Operator | Description | Example | Result |\n|:---|:---|:---|:-|\n| `IS DISTINCT FROM` | not equal, including `NULL` | `2 IS DISTINCT FROM NULL` | `true` |\n| `IS NOT DISTINCT FROM` | equal, including `NULL` | `NULL IS NOT DISTINCT FROM NULL` | `true` |\n\n### Combination Casting\n\nWhen performing comparison on different types, DuckDB performs [Combination Casting]({% link docs/stable/sql/data_types/typecasting.md %}#combination-casting).\nThese casts were introduced to make interactive querying more convenient and are in line with the casts performed by several programming languages but are often not compatible with PostgreSQL's behavior. For example, the following expressions evaluate and return `true` in DuckDB but fail in PostgreSQL.\n\n```sql\nSELECT 1 = true;\nSELECT 1 = '1.1';\n```\n\n> It is not possible to enforce stricter type-checking for DuckDB's comparison operators. If you require stricter type-checking, consider creating a [macro]({% link docs/stable/sql/statements/create_macro.md %}) with the [`typeof` function]({% link docs/stable/sql/functions/utility.md %}#typeofexpression) or implementing a [user-defined function]({% link docs/stable/clients/python/function.md %}).\n\n## `BETWEEN` and `IS [NOT] NULL`\n\n<div id=\"rrdiagram1\"></div>\n\nBesides the standard comparison operators there are also the `BETWEEN` and `IS (NOT) NULL` operators. These behave much like operators, but have special syntax mandated by the SQL standard. They are shown in the table below.\n\nNote that `BETWEEN` and `NOT BETWEEN` are only equivalent to the examples below in the cases where both `a`, `x` and `y` are of the same type, as `BETWEEN` will cast all of its inputs to the same type.\n\n| Predicate | Description |\n|:---|:---|\n| `a BETWEEN x AND y` | equivalent to `x <= a AND a <= y` |\n| `a NOT BETWEEN x AND y` | equivalent to `x > a OR a > y` |\n| `expression IS NULL` | `true` if expression is `NULL`, `false` otherwise |\n| `expression ISNULL` | alias for `IS NULL` (non-standard) |\n| `expression IS NOT NULL` | `false` if expression is `NULL`, `true` otherwise |\n| `expression NOTNULL` | alias for `IS NOT NULL` (non-standard) |\n\n> For the expression `BETWEEN x AND y`, `x` is used as the lower bound and `y` is used as the upper bound. Therefore, if `x > y`, the result will always be `false`.\n","date.md":"---\ntitle: Date Functions\n---\n\n<!-- markdownlint-disable MD001 -->\n\nThis section describes functions and operators for examining and manipulating [`DATE`]({% link docs/stable/sql/data_types/date.md %}) values.\n\n## Date Operators\n\nThe table below shows the available mathematical operators for `DATE` types.\n\n| Operator | Description | Example | Result |\n|:-|:--|:---|:--|\n| `+` | addition of days (integers) | `DATE '1992-03-22' + 5` | `1992-03-27` |\n| `+` | addition of an `INTERVAL` | `DATE '1992-03-22' + INTERVAL 5 DAY` | `1992-03-27 00:00:00` |\n| `+` | addition of a variable `INTERVAL` | `SELECT DATE '1992-03-22' + INTERVAL (d.days) DAY FROM (VALUES (5), (11)) d(days)` | `1992-03-27 00:00:00` and `1992-04-02 00:00:00` |\n| `-` | subtraction of `DATE`s | `DATE '1992-03-27' - DATE '1992-03-22'` | `5` |\n| `-` | subtraction of an `INTERVAL` | `DATE '1992-03-27' - INTERVAL 5 DAY` | `1992-03-22 00:00:00` |\n| `-` | subtraction of a variable `INTERVAL` | `SELECT DATE '1992-03-27' - INTERVAL (d.days) DAY FROM (VALUES (5), (11)) d(days)` | `1992-03-22 00:00:00` and `1992-03-16 00:00:00` |\n\nAdding to or subtracting from [infinite values]({% link docs/stable/sql/data_types/date.md %}#special-values) produces the same infinite value.\n\n## Date Functions\n\nThe table below shows the available functions for `DATE` types.\nDates can also be manipulated with the [timestamp functions]({% link docs/stable/sql/functions/timestamp.md %}) through type promotion.\n\n| Name | Description |\n|:--|:-------|\n| [`date_add(date, interval)`](#date_adddate-interval) | Add the interval to the date and return a `DATETIME` value. |\n| [`date_diff(part, startdate, enddate)`](#date_diffpart-startdate-enddate) | The number of [`part`]({% link docs/stable/sql/functions/datepart.md %}) boundaries between `startdate` and `enddate`, inclusive of the larger date and exclusive of the smaller date. |\n| [`date_part(part, date)`](#date_partpart-date) | Get [subfield]({% link docs/stable/sql/functions/datepart.md %}) (equivalent to `extract`). |\n| [`date_sub(part, startdate, enddate)`](#date_subpart-startdate-enddate) | The signed length of the interval between `startdate` and `enddate`, truncated to whole multiples of [`part`]({% link docs/stable/sql/functions/datepart.md %}). |\n| [`date_trunc(part, date)`](#date_truncpart-date) | Truncate to specified [precision]({% link docs/stable/sql/functions/datepart.md %}). |\n| [`dayname(date)`](#daynamedate) | The (English) name of the weekday. |\n| [`extract(part from date)`](#extractpart-from-date) | Get [subfield]({% link docs/stable/sql/functions/datepart.md %}) from a date. |\n| [`greatest(date, date)`](#greatestdate-date) | The later of two dates. |\n| [`isfinite(date)`](#isfinitedate) | Returns true if the date is finite, false otherwise. |\n| [`isinf(date)`](#isinfdate) | Returns true if the date is infinite, false otherwise. |\n| [`julian(date)`](#juliandate) | Extract the Julian Day number from a date. |\n| [`last_day(date)`](#last_daydate) | The last day of the corresponding month in the date. |\n| [`least(date, date)`](#leastdate-date) | The earlier of two dates. |\n| [`make_date(year, month, day)`](#make_dateyear-month-day) | The date for the given parts. |\n| [`monthname(date)`](#monthnamedate) | The (English) name of the month. |\n| [`strftime(date, format)`](#strftimedate-format) | Converts a date to a string according to the [format string]({% link docs/stable/sql/functions/dateformat.md %}). |\n| [`time_bucket(bucket_width, date[, offset])`](#time_bucketbucket_width-date-offset) | Truncate `date` to a grid of width `bucket_width`. The grid is anchored at `2000-01-01[ + offset]` when `bucket_width` is a number of months or coarser units, else `2000-01-03[ + offset]`. Note that `2000-01-03` is a Monday. |\n| [`time_bucket(bucket_width, date[, origin])`](#time_bucketbucket_width-date-origin) | Truncate `timestamptz` to a grid of width `bucket_width`. The grid is anchored at the `origin` timestamp, which defaults to `2000-01-01` when `bucket_width` is a number of months or coarser units, else `2000-01-03`. Note that `2000-01-03` is a Monday. |\n| [`today()`](#today) | Current date (start of current transaction) in the local time zone. |\n\n#### `date_add(date, interval)`\n\n<div class=\"nostroke_table\"></div>\n\n| **Description** | Add the interval to the date and return a `DATETIME` value. |\n| **Example** | `date_add(DATE '1992-09-15', INTERVAL 2 MONTH)` |\n| **Result** | `1992-11-15 00:00:00` |\n\n#### `date_diff(part, startdate, enddate)`\n\n<div class=\"nostroke_table\"></div>\n\n| **Description** | The number of [`part`]({% link docs/stable/sql/functions/datepart.md %}) boundaries between `startdate` and `enddate`, inclusive of the larger date and exclusive of the smaller date. |\n| **Example** | `date_diff('month', DATE '1992-09-15', DATE '1992-11-14')` |\n| **Result** | `2` |\n| **Alias** | `datediff` |\n\n#### `date_part(part, date)`\n\n<div class=\"nostroke_table\"></div>\n\n| **Description** | Get the [subfield]({% link docs/stable/sql/functions/datepart.md %}) (equivalent to `extract`). |\n| **Example** | `date_part('year', DATE '1992-09-20')` |\n| **Result** | `1992` |\n| **Alias** | `datepart` |\n\n#### `date_sub(part, startdate, enddate)`\n\n<div class=\"nostroke_table\"></div>\n\n| **Description** | The signed length of the interval between `startdate` and `enddate`, truncated to whole multiples of [`part`]({% link docs/stable/sql/functions/datepart.md %}). |\n| **Example** | `date_sub('month', DATE '1992-09-15', DATE '1992-11-14')` |\n| **Result** | `1` |\n| **Alias** | `datesub` |\n\n#### `date_trunc(part, date)`\n\n<div class=\"nostroke_table\"></div>\n\n| **Description** | Truncate to specified [precision]({% link docs/stable/sql/functions/datepart.md %}). |\n| **Example** | `date_trunc('month', DATE '1992-03-07')` |\n| **Result** | `1992-03-01` |\n| **Alias** | `datetrunc` |\n\n#### `dayname(date)`\n\n<div class=\"nostroke_table\"></div>\n\n| **Description** | The (English) name of the weekday. |\n| **Example** | `dayname(DATE '1992-09-20')` |\n| **Result** | `Sunday` |\n\n#### `extract(part from date)`\n\n<div class=\"nostroke_table\"></div>\n\n| **Description** | Get [subfield]({% link docs/stable/sql/functions/datepart.md %}) from a date. |\n| **Example** | `extract('year' FROM DATE '1992-09-20')` |\n| **Result** | `1992` |\n\n#### `greatest(date, date)`\n\n<div class=\"nostroke_table\"></div>\n\n| **Description** | The later of two dates. |\n| **Example** | `greatest(DATE '1992-09-20', DATE '1992-03-07')` |\n| **Result** | `1992-09-20` |\n\n#### `isfinite(date)`\n\n<div class=\"nostroke_table\"></div>\n\n| **Description** | Returns `true` if the date is finite, false otherwise. |\n| **Example** | `isfinite(DATE '1992-03-07')` |\n| **Result** | `true` |\n\n#### `isinf(date)`\n\n<div class=\"nostroke_table\"></div>\n\n| **Description** | Returns `true` if the date is infinite, false otherwise. |\n| **Example** | `isinf(DATE '-infinity')` |\n| **Result** | `true` |\n\n#### `julian(date)`\n\n<div class=\"nostroke_table\"></div>\n\n| **Description** | Extract the Julian Day number from a date. |\n| **Example** | `julian(DATE '1992-09-20')` |\n| **Result** | `2448886.0` |\n\n#### `last_day(date)`\n\n<div class=\"nostroke_table\"></div>\n\n| **Description** | The last day of the corresponding month in the date. |\n| **Example** | `last_day(DATE '1992-09-20')` |\n| **Result** | `1992-09-30` |\n\n#### `least(date, date)`\n\n<div class=\"nostroke_table\"></div>\n\n| **Description** | The earlier of two dates. |\n| **Example** | `least(DATE '1992-09-20', DATE '1992-03-07')` |\n| **Result** | `1992-03-07` |\n\n#### `make_date(year, month, day)`\n\n<div class=\"nostroke_table\"></div>\n\n| **Description** | The date for the given parts. |\n| **Example** | `make_date(1992, 9, 20)` |\n| **Result** | `1992-09-20` |\n\n#### `monthname(date)`\n\n<div class=\"nostroke_table\"></div>\n\n| **Description** | The (English) name of the month. |\n| **Example** | `monthname(DATE '1992-09-20')` |\n| **Result** | `September` |\n\n#### `strftime(date, format)`\n\n<div class=\"nostroke_table\"></div>\n\n| **Description** | Converts a date to a string according to the [format string]({% link docs/stable/sql/functions/dateformat.md %}). |\n| **Example** | `strftime(DATE '1992-01-01', '%a, %-d %B %Y')` |\n| **Result** | `Wed, 1 January 1992` |\n\n#### `time_bucket(bucket_width, date[, offset])`\n\n<div class=\"nostroke_table\"></div>\n\n| **Description** | Truncate `date` to a grid of width `bucket_width`. The grid is anchored at `2000-01-01[ + offset]` when `bucket_width` is a number of months or coarser units, else `2000-01-03[ + offset]`. Note that `2000-01-03` is a Monday. |\n| **Example** | `time_bucket(INTERVAL '2 months', DATE '1992-04-20', INTERVAL '1 month')` |\n| **Result** | `1992-04-01` |\n\n#### `time_bucket(bucket_width, date[, origin])`\n\n<div class=\"nostroke_table\"></div>\n\n| **Description** | Truncate `timestamptz` to a grid of width `bucket_width`. The grid is anchored at the `origin` timestamp, which defaults to `2000-01-01` when `bucket_width` is a number of months or coarser units, else `2000-01-03`. Note that `2000-01-03` is a Monday. |\n| **Example** | `time_bucket(INTERVAL '2 weeks', DATE '1992-04-20', DATE '1992-04-01')` |\n| **Result** | `1992-04-15` |\n\n#### `today()`\n\n<div class=\"nostroke_table\"></div>\n\n| **Description** | Current date (start of current transaction) in the local time zone. |\n| **Example** | `today()` |\n| **Result** | `2022-10-08` |\n| **Alias** | `current_date` (no parentheses necessary) |\n\n## Date Part Extraction Functions\n\nThere are also dedicated extraction functions to get the [subfields]({% link docs/stable/sql/functions/datepart.md %}#part-functions).\nA few examples include extracting the day from a date, or the day of the week from a date.\n\nFunctions applied to infinite dates will either return the same infinite dates\n(e.g., `greatest`) or `NULL` (e.g., `date_part`) depending on what “makes sense”.\nIn general, if the function needs to examine the parts of the infinite date, the result will be `NULL`.\n","dateformat.md":"---\ntitle: Date Format Functions\n---\n\nThe `strftime` and `strptime` functions can be used to convert between [`DATE`]({% link docs/stable/sql/data_types/date.md %}) / [`TIMESTAMP`]({% link docs/stable/sql/data_types/timestamp.md %}) values and strings. This is often required when parsing CSV files, displaying output to the user or transferring information between programs. Because there are many possible date representations, these functions accept a [format string](#format-specifiers) that describes how the date or timestamp should be structured.\n\n## `strftime` Examples\n\nThe [`strftime(timestamp, format)`]({% link docs/stable/sql/functions/timestamp.md %}#strftimetimestamp-format) converts timestamps or dates to strings according to the specified pattern.\n\n```sql\nSELECT strftime(DATE '1992-03-02', '%d/%m/%Y');\n```\n\n```text\n02/03/1992\n```\n\n```sql\nSELECT strftime(TIMESTAMP '1992-03-02 20:32:45', '%A, %-d %B %Y - %I:%M:%S %p');\n```\n\n```text\nMonday, 2 March 1992 - 08:32:45 PM\n```\n\n## `strptime` Examples\n\nThe [`strptime(text, format)` function]({% link docs/stable/sql/functions/timestamp.md %}#strptimetext-format) converts strings to timestamps according to the specified pattern.\n\n```sql\nSELECT strptime('02/03/1992', '%d/%m/%Y');\n```\n\n```text\n1992-03-02 00:00:00\n```\n\n```sql\nSELECT strptime('Monday, 2 March 1992 - 08:32:45 PM', '%A, %-d %B %Y - %I:%M:%S %p');\n```\n\n```text\n1992-03-02 20:32:45\n```\n\nThe `strptime` function throws an error on failure:\n\n```sql\nSELECT strptime('02/50/1992', '%d/%m/%Y') AS x;\n```\n\n```console\nInvalid Input Error: Could not parse string \"02/50/1992\" according to format specifier \"%d/%m/%Y\"\n02/50/1992\n   ^\nError: Month out of range, expected a value between 1 and 12\n```\n\nTo return `NULL` on failure, use the [`try_strptime` function]({% link docs/stable/sql/functions/timestamp.md %}#try_strptimetext-format):\n\n```text\nNULL\n```\n\n## CSV Parsing\n\nThe date formats can also be specified during CSV parsing, either in the [`COPY` statement]({% link docs/stable/sql/statements/copy.md %}) or in the `read_csv` function. This can be done by either specifying a `DATEFORMAT` or a `TIMESTAMPFORMAT` (or both). `DATEFORMAT` will be used for converting dates, and `TIMESTAMPFORMAT` will be used for converting timestamps. Below are some examples for how to use this.\n\nIn a `COPY` statement:\n\n```sql\nCOPY dates FROM 'test.csv' (DATEFORMAT '%d/%m/%Y', TIMESTAMPFORMAT '%A, %-d %B %Y - %I:%M:%S %p');\n```\n\nIn a `read_csv` function:\n\n```sql\nSELECT *\nFROM read_csv('test.csv', dateformat = '%m/%d/%Y', timestampformat = '%A, %-d %B %Y - %I:%M:%S %p');\n```\n\n## Format Specifiers\n\nBelow is a full list of all available format specifiers.\n\n| Specifier | Description | Example |\n|:-|:------|:---|\n| `%a` | Abbreviated weekday name. | Sun, Mon, ... |\n| `%A` | Full weekday name. | Sunday, Monday, ... |\n| `%b` | Abbreviated month name. | Jan, Feb, ..., Dec |\n| `%B` | Full month name. | January, February, ... |\n| `%c` | ISO date and time representation | 1992-03-02 10:30:20 |\n| `%d` | Day of the month as a zero-padded decimal. | 01, 02, ..., 31 |\n| `%-d` | Day of the month as a decimal number. | 1, 2, ..., 30 |\n| `%f` | Microsecond as a decimal number, zero-padded on the left. | 000000 - 999999 |\n| `%g` | Millisecond as a decimal number, zero-padded on the left. | 000 - 999 |\n| `%G` | ISO 8601 year with century representing the year that contains the greater part of the ISO week (see `%V`). | 0001, 0002, ..., 2013, 2014, ..., 9998, 9999 |\n| `%H` | Hour (24-hour clock) as a zero-padded decimal number. | 00, 01, ..., 23 |\n| `%-H` | Hour (24-hour clock) as a decimal number. | 0, 1, ..., 23 |\n| `%I` | Hour (12-hour clock) as a zero-padded decimal number. | 01, 02, ..., 12 |\n| `%-I` | Hour (12-hour clock) as a decimal number. | 1, 2, ... 12 |\n| `%j` | Day of the year as a zero-padded decimal number. | 001, 002, ..., 366 |\n| `%-j` | Day of the year as a decimal number. | 1, 2, ..., 366 |\n| `%m` | Month as a zero-padded decimal number. | 01, 02, ..., 12 |\n| `%-m` | Month as a decimal number. | 1, 2, ..., 12 |\n| `%M` | Minute as a zero-padded decimal number. | 00, 01, ..., 59 |\n| `%-M` | Minute as a decimal number. | 0, 1, ..., 59 |\n| `%n` | Nanosecond as a decimal number, zero-padded on the left. | 000000000 - 999999999 |\n| `%p` | Locale's AM or PM. | AM, PM |\n| `%S` | Second as a zero-padded decimal number. | 00, 01, ..., 59 |\n| `%-S` | Second as a decimal number. | 0, 1, ..., 59 |\n| `%u` | ISO 8601 weekday as a decimal number where 1 is Monday. | 1, 2, ..., 7 |\n| `%U` | Week number of the year. Week 01 starts on the first Sunday of the year, so there can be week 00. Note that this is not compliant with the week date standard in ISO-8601. | 00, 01, ..., 53 |\n| `%V` | ISO 8601 week as a decimal number with Monday as the first day of the week. Week 01 is the week containing Jan 4. Note that `%V` is incompatible with year directive `%Y`. Use the ISO year `%G` instead. | 01, ..., 53 |\n| `%w` | Weekday as a decimal number. | 0, 1, ..., 6 |\n| `%W` | Week number of the year. Week 01 starts on the first Monday of the year, so there can be week 00. Note that this is not compliant with the week date standard in ISO-8601. | 00, 01, ..., 53 |\n| `%x` | ISO date representation | 1992-03-02 |\n| `%X` | ISO time representation | 10:30:20 |\n| `%y` | Year without century as a zero-padded decimal number. | 00, 01, ..., 99 |\n| `%-y` | Year without century as a decimal number. | 0, 1, ..., 99 |\n| `%Y` | Year with century as a decimal number. | 2013, 2019 etc. |\n| `%z` | [Time offset from UTC](https://en.wikipedia.org/wiki/ISO_8601#Time_offsets_from_UTC) in the form ±HH:MM, ±HHMM, or ±HH. | -0700 |\n| `%Z` | Time zone name. | Europe/Amsterdam  |\n| `%%` | A literal `%` character. | % |\n","datepart.md":"---\ntitle: Date Part Functions\n---\n\n<!-- markdownlint-disable MD001 -->\n\nThe `date_part`, `date_trunc` and `date_diff` functions can be used to extract or manipulate parts of temporal types such as [`TIMESTAMP`]({% link docs/stable/sql/data_types/timestamp.md %}), [`TIMESTAMPTZ`]({% link docs/stable/sql/data_types/timestamp.md %}), [`DATE`]({% link docs/stable/sql/data_types/date.md %}) and [`INTERVAL`]({% link docs/stable/sql/data_types/interval.md %}).\n\nThe parts to be extracted or manipulated are specified by one of the strings in the tables below.\nThe example column provides the corresponding parts of the timestamp `2021-08-03 11:59:44.123456`.\nOnly the entries of the first table can be extracted from `INTERVAL`s or used to construct them.\n\n> Except for `julian` and `epoch`, which return `DOUBLE`s, all parts are extracted as integers. Since there are no infinite integer values in DuckDB, `NULL`s are returned for infinite timestamps.\n\n## Part Specifiers Usable as Date Part Specifiers and in Intervals\n\n| Specifier | Description | Synonyms | Example |\n|:--|:--|:---|--:|\n| `century` | Gregorian century | `cent`, `centuries`, `c` | `21` |\n| `day` | Gregorian day | `days`, `d`, `dayofmonth` | `3` |\n| `decade` | Gregorian decade | `dec`, `decades`, `decs` | `202` |\n| `hour` | Hours | `hr`, `hours`, `hrs`, `h` | `11` |\n| `microseconds` | Sub-minute microseconds | `microsecond`, `us`, `usec`, `usecs`, `usecond`, `useconds` | `44123456` |\n| `millennium` | Gregorian millennium | `mil`, `millenniums`, `millenia`, `mils`, `millenium` | `3` |\n| `milliseconds` | Sub-minute milliseconds | `millisecond`, `ms`, `msec`, `msecs`, `msecond`, `mseconds` | `44123` |\n| `minute` | Minutes | `min`, `minutes`, `mins`, `m` | `59` |\n| `month` | Gregorian month | `mon`, `months`, `mons` | `8` |\n| `quarter` | Quarter of the year (1-4) | `quarters` | `3` |\n| `second` | Seconds | `sec`, `seconds`, `secs`, `s` | `44` |\n| `year` | Gregorian year | `yr`, `y`, `years`, `yrs` | `2021` |\n\n## Part Specifiers Only Usable as Date Part Specifiers\n\n| Specifier | Description | Synonyms | Example |\n|:--|:--|:---|--:|\n| `dayofweek` | Day of the week (Sunday = 0, Saturday = 6) | `weekday`, `dow` | `2` |\n| `dayofyear` | Day of the year (1-365/366) | `doy` | `215` |\n| `epoch` | Seconds since 1970-01-01 | | `1760465850.6698709` |\n| `era` | Gregorian era (CE/AD, BCE/BC) | | `1` |\n| `isodow` | ISO day of the week (Monday = 1, Sunday = 7) | | `2` |\n| `isoyear` | ISO Year number (Starts on Monday of week containing Jan 4th) | | `2021` |\n| `julian` | Julian Day number. | | `2459430.4998162435` |\n| `timezone_hour` | Time zone offset hour portion | | `0` |\n| `timezone_minute` | Time zone offset minute portion | | `0` |\n| `timezone` | Time zone offset in seconds | | `0` |\n| `week` | Week number | `weeks`, `w` | `31` |\n| `yearweek` | ISO year and week number in `YYYYWW` format | | `202131` |\n\nNote that the time zone parts are all zero unless a time zone extension such as [ICU]({% link docs/stable/core_extensions/icu.md %})\nhas been installed to support `TIMESTAMP WITH TIME ZONE`.\n\n## Part Functions\n\nThere are dedicated extraction functions to get certain subfields:\n\n| Name | Description |\n|:--|:-------|\n| [`century(date)`](#centurydate) | Century. |\n| [`day(date)`](#daydate) | Day. |\n| [`dayofmonth(date)`](#dayofmonthdate) | Day (synonym). |\n| [`dayofweek(date)`](#dayofweekdate) | Numeric weekday (Sunday = 0, Saturday = 6). |\n| [`dayofyear(date)`](#dayofyeardate) | Day of the year (starts from 1, i.e., January 1 = 1). |\n| [`decade(date)`](#decadedate) | Decade (year / 10). |\n| [`epoch(date)`](#epochdate) | Seconds since 1970-01-01. |\n| [`era(date)`](#eradate) | Calendar era. |\n| [`hour(date)`](#hourdate) | Hours. |\n| [`isodow(date)`](#isodowdate) | Numeric ISO weekday (Monday = 1, Sunday = 7). |\n| [`isoyear(date)`](#isoyeardate) | ISO Year number (Starts on Monday of week containing Jan 4th). |\n| [`julian(date)`](#juliandate) | `DOUBLE` Julian Day number. |\n| [`microsecond(date)`](#microseconddate) | Sub-minute microseconds. |\n| [`millennium(date)`](#millenniumdate) | Millennium. |\n| [`millisecond(date)`](#milliseconddate) | Sub-minute milliseconds. |\n| [`minute(date)`](#minutedate) | Minutes. |\n| [`month(date)`](#monthdate) | Month. |\n| [`quarter(date)`](#quarterdate) | Quarter. |\n| [`second(date)`](#seconddate) | Seconds. |\n| [`timezone_hour(date)`](#timezone_hourdate) | Time zone offset hour portion. |\n| [`timezone_minute(date)`](#timezone_minutedate) | Time zone offset minutes portion. |\n| [`timezone(date)`](#timezonedate) | Time zone offset in minutes. |\n| [`week(date)`](#weekdate) | ISO Week. |\n| [`weekday(date)`](#weekdaydate) | Numeric weekday synonym (Sunday = 0, Saturday = 6). |\n| [`weekofyear(date)`](#weekofyeardate) | ISO Week (synonym). |\n| [`year(date)`](#yeardate) | Year. |\n| [`yearweek(date)`](#yearweekdate) | `BIGINT` of combined ISO Year number and 2-digit version of ISO Week number. |\n\n#### `century(date)`\n\n<div class=\"nostroke_table\"></div>\n\n| **Description** | Century. |\n| **Example** | `century(DATE '1992-02-15')` |\n| **Result** | `20` |\n\n#### `day(date)`\n\n<div class=\"nostroke_table\"></div>\n\n| **Description** | Day. |\n| **Example** | `day(DATE '1992-02-15')` |\n| **Result** | `15` |\n\n#### `dayofmonth(date)`\n\n<div class=\"nostroke_table\"></div>\n\n| **Description** | Day (synonym). |\n| **Example** | `dayofmonth(DATE '1992-02-15')` |\n| **Result** | `15` |\n\n#### `dayofweek(date)`\n\n<div class=\"nostroke_table\"></div>\n\n| **Description** | Numeric weekday (Sunday = 0, Saturday = 6). |\n| **Example** | `dayofweek(DATE '1992-02-15')` |\n| **Result** | `6` |\n\n#### `dayofyear(date)`\n\n<div class=\"nostroke_table\"></div>\n\n| **Description** | Day of the year (starts from 1, i.e., January 1 = 1). |\n| **Example** | `dayofyear(DATE '1992-02-15')` |\n| **Result** | `46` |\n\n#### `decade(date)`\n\n<div class=\"nostroke_table\"></div>\n\n| **Description** | Decade (year / 10). |\n| **Example** | `decade(DATE '1992-02-15')` |\n| **Result** | `199` |\n\n#### `epoch(date)`\n\n<div class=\"nostroke_table\"></div>\n\n| **Description** | Seconds since 1970-01-01. |\n| **Example** | `epoch(DATE '1992-02-15')` |\n| **Result** | `698112000` |\n\n#### `era(date)`\n\n<div class=\"nostroke_table\"></div>\n\n| **Description** | Calendar era. |\n| **Example** | `era(DATE '0044-03-15 (BC)')` |\n| **Result** | `0` |\n\n#### `hour(date)`\n\n<div class=\"nostroke_table\"></div>\n\n| **Description** | Hours. |\n| **Example** | `hour(timestamp '2021-08-03 11:59:44.123456')` |\n| **Result** | `11` |\n\n#### `isodow(date)`\n\n<div class=\"nostroke_table\"></div>\n\n| **Description** | Numeric ISO weekday (Monday = 1, Sunday = 7). |\n| **Example** | `isodow(DATE '1992-02-15')` |\n| **Result** | `6` |\n\n#### `isoyear(date)`\n\n<div class=\"nostroke_table\"></div>\n\n| **Description** | ISO Year number (Starts on Monday of week containing Jan 4th). |\n| **Example** | `isoyear(DATE '2022-01-01')` |\n| **Result** | `2021` |\n\n\n#### `julian(date)`\n\n<div class=\"nostroke_table\"></div>\n\n| **Description** | `DOUBLE` Julian Day number. |\n| **Example** | `julian(DATE '1992-09-20')` |\n| **Result** | `2448886.0` |\n\n\n#### `microsecond(date)`\n\n<div class=\"nostroke_table\"></div>\n\n| **Description** | Sub-minute microseconds. |\n| **Example** | `microsecond(timestamp '2021-08-03 11:59:44.123456')` |\n| **Result** | `44123456` |\n\n#### `millennium(date)`\n\n<div class=\"nostroke_table\"></div>\n\n| **Description** | Millennium. |\n| **Example** | `millennium(DATE '1992-02-15')` |\n| **Result** | `2` |\n\n#### `millisecond(date)`\n\n<div class=\"nostroke_table\"></div>\n\n| **Description** | Sub-minute milliseconds. |\n| **Example** | `millisecond(timestamp '2021-08-03 11:59:44.123456')` |\n| **Result** | `44123` |\n\n#### `minute(date)`\n\n<div class=\"nostroke_table\"></div>\n\n| **Description** | Minutes. |\n| **Example** | `minute(timestamp '2021-08-03 11:59:44.123456')` |\n| **Result** | `59` |\n\n#### `month(date)`\n\n<div class=\"nostroke_table\"></div>\n\n| **Description** | Month. |\n| **Example** | `month(DATE '1992-02-15')` |\n| **Result** | `2` |\n\n#### `quarter(date)`\n\n<div class=\"nostroke_table\"></div>\n\n| **Description** | Quarter. |\n| **Example** | `quarter(DATE '1992-02-15')` |\n| **Result** | `1` |\n\n#### `second(date)`\n\n<div class=\"nostroke_table\"></div>\n\n| **Description** | Seconds. |\n| **Example** | `second(timestamp '2021-08-03 11:59:44.123456')` |\n| **Result** | `44` |\n\n#### `timezone_hour(date)`\n\n<div class=\"nostroke_table\"></div>\n\n| **Description** | Time zone offset hour portion. |\n| **Example** | `timezone_hour(DATE '1992-02-15')` |\n| **Result** | `0` |\n\n#### `timezone_minute(date)`\n\n<div class=\"nostroke_table\"></div>\n\n| **Description** | Time zone offset minutes portion. |\n| **Example** | `timezone_minute(DATE '1992-02-15')` |\n| **Result** | `0` |\n\n#### `timezone(date)`\n\n<div class=\"nostroke_table\"></div>\n\n| **Description** | Time zone offset in minutes. |\n| **Example** | `timezone(DATE '1992-02-15')` |\n| **Result** | `0` |\n\n#### `week(date)`\n\n<div class=\"nostroke_table\"></div>\n\n| **Description** | ISO Week. |\n| **Example** | `week(DATE '1992-02-15')` |\n| **Result** | `7` |\n\n#### `weekday(date)`\n\n<div class=\"nostroke_table\"></div>\n\n| **Description** | Numeric weekday synonym (Sunday = 0, Saturday = 6). |\n| **Example** | `weekday(DATE '1992-02-15')` |\n| **Result** | `6` |\n\n#### `weekofyear(date)`\n\n<div class=\"nostroke_table\"></div>\n\n| **Description** | ISO Week (synonym). |\n| **Example** | `weekofyear(DATE '1992-02-15')` |\n| **Result** | `7` |\n\n#### `year(date)`\n\n<div class=\"nostroke_table\"></div>\n\n| **Description** | Year. |\n| **Example** | `year(DATE '1992-02-15')` |\n| **Result** | `1992` |\n\n#### `yearweek(date)`\n\n<div class=\"nostroke_table\"></div>\n\n| **Description** | `BIGINT` of combined ISO Year number and 2-digit version of ISO Week number. |\n| **Example** | `yearweek(DATE '1992-02-15')` |\n| **Result** | `199207` |\n","enum.md":`---
title: Enum Functions
---

<!-- markdownlint-disable MD001 -->

This section describes functions and operators for examining and manipulating [\`ENUM\` values]({% link docs/stable/sql/data_types/enum.md %}).
The examples assume an enum type created as:

\`\`\`sql
CREATE TYPE mood AS ENUM ('sad', 'ok', 'happy', 'anxious');
\`\`\`

These functions can take \`NULL\` or a specific value of the type as argument(s).
With the exception of \`enum_range_boundary\`, the result depends only on the type of the argument and not on its value.

| Name | Description |
|:--|:-------|
| [\`enum_code(enum_value)\`](#enum_codeenum_value) | Returns the numeric value backing the given enum value. |
| [\`enum_first(enum)\`](#enum_firstenum) | Returns the first value of the input enum type. |
| [\`enum_last(enum)\`](#enum_lastenum) | Returns the last value of the input enum type. |
| [\`enum_range(enum)\`](#enum_rangeenum) | Returns all values of the input enum type as an array. |
| [\`enum_range_boundary(enum, enum)\`](#enum_range_boundaryenum-enum) | Returns the range between the two given enum values as an array. |

#### \`enum_code(enum_value)\`

<div class="nostroke_table"></div>

| **Description** | Returns the numeric value backing the given enum value. |
| **Example** | \`enum_code('happy'::mood)\` |
| **Result** | \`2\` |

#### \`enum_first(enum)\`

<div class="nostroke_table"></div>

| **Description** | Returns the first value of the input enum type. |
| **Example** | \`enum_first(NULL::mood)\` |
| **Result** | \`sad\` |

#### \`enum_last(enum)\`

<div class="nostroke_table"></div>

| **Description** | Returns the last value of the input enum type. |
| **Example** | \`enum_last(NULL::mood)\` |
| **Result** | \`anxious\` |

#### \`enum_range(enum)\`

<div class="nostroke_table"></div>

| **Description** | Returns all values of the input enum type as an array. |
| **Example** | \`enum_range(NULL::mood)\` |
| **Result** | \`[sad, ok, happy, anxious]\` |

#### \`enum_range_boundary(enum, enum)\`

<div class="nostroke_table"></div>

| **Description** | Returns the range between the two given enum values as an array. The values must be of the same enum type. When the first parameter is \`NULL\`, the result starts with the first value of the enum type. When the second parameter is \`NULL\`, the result ends with the last value of the enum type. |
| **Example** | \`enum_range_boundary(NULL, 'happy'::mood)\` |
| **Result** | \`[sad, ok, happy]\` |
`,"filter.md":`---
title: FILTER Clause
---

The \`FILTER\` clause may optionally follow an aggregate function in a \`SELECT\` statement. This will filter the rows of data that are fed into the aggregate function in the same way that a \`WHERE\` clause filters rows, but localized to the specific aggregate function.

There are multiple types of situations where this is useful, including when evaluating multiple aggregates with different filters, and when creating a pivoted view of a dataset. \`FILTER\` provides a cleaner syntax for pivoting data when compared with the more traditional \`CASE WHEN\` approach discussed below.

Some aggregate functions also do not filter out \`NULL\` values, so using a \`FILTER\` clause will return valid results when at times the \`CASE WHEN\` approach will not. This occurs with the functions \`first\` and \`last\`, which are desirable in a non-aggregating pivot operation where the goal is to simply re-orient the data into columns rather than re-aggregate it. \`FILTER\` also improves \`NULL\` handling when using the \`list\` and \`array_agg\` functions, as the \`CASE WHEN\` approach will include \`NULL\` values in the list result, while the \`FILTER\` clause will remove them.

## Examples

Return the following:

* The total number of rows
* The number of rows where \`i <= 5\`
* The number of rows where \`i\` is odd

\`\`\`sql
SELECT
    count() AS total_rows,
    count() FILTER (i <= 5) AS lte_five,
    count() FILTER (i % 2 = 1) AS odds
FROM generate_series(1, 10) tbl(i);
\`\`\`

<div class="monospace_table"></div>

| total_rows | lte_five | odds |
|:---|:---|:---|
| 10 | 5 | 5 |

> Simply counting rows that satisfy a condition can also be achieved without \`FILTER\` clause, using the boolean \`sum\` aggregate function, e.g., \`sum(i <= 5)\`.

Different aggregate functions may be used, and multiple \`WHERE\` expressions are also permitted:

\`\`\`sql
SELECT
    sum(i) FILTER (i <= 5) AS lte_five_sum,
    median(i) FILTER (i % 2 = 1) AS odds_median,
    median(i) FILTER (i % 2 = 1 AND i <= 5) AS odds_lte_five_median
FROM generate_series(1, 10) tbl(i);
\`\`\`

<div class="monospace_table"></div>

| lte_five_sum | odds_median | odds_lte_five_median |
|:---|:---|:---|
| 15 | 5.0 | 3.0 |

The \`FILTER\` clause can also be used to pivot data from rows into columns. This is a static pivot, as columns must be defined prior to runtime in SQL. However, this kind of statement can be dynamically generated in a host programming language to leverage DuckDB's SQL engine for rapid, larger than memory pivoting.

First generate an example dataset:

\`\`\`sql
CREATE TEMP TABLE stacked_data AS
    SELECT
        i,
        CASE WHEN i <= rows * 0.25  THEN 2022
             WHEN i <= rows * 0.5   THEN 2023
             WHEN i <= rows * 0.75  THEN 2024
             WHEN i <= rows * 0.875 THEN 2025
             ELSE NULL
             END AS year
    FROM (
        SELECT
            i,
            count(*) OVER () AS rows
        FROM generate_series(1, 100_000_000) tbl(i)
    ) tbl;
\`\`\`

“Pivot” the data out by year (move each year out to a separate column):

\`\`\`sql
SELECT
    count(i) FILTER (year = 2022) AS "2022",
    count(i) FILTER (year = 2023) AS "2023",
    count(i) FILTER (year = 2024) AS "2024",
    count(i) FILTER (year = 2025) AS "2025",
    count(i) FILTER (year IS NULL) AS "NULLs"
FROM stacked_data;
\`\`\`

This syntax produces the same results as the \`FILTER\` clauses above:

\`\`\`sql
SELECT
    count(CASE WHEN year = 2022 THEN i END) AS "2022",
    count(CASE WHEN year = 2023 THEN i END) AS "2023",
    count(CASE WHEN year = 2024 THEN i END) AS "2024",
    count(CASE WHEN year = 2025 THEN i END) AS "2025",
    count(CASE WHEN year IS NULL THEN i END) AS "NULLs"
FROM stacked_data;
\`\`\`

<div class="monospace_table"></div>

|   2022   |   2023   |   2024   |   2025   |  NULLs   |
|:---|:---|:---|:---|:---|
| 25000000 | 25000000 | 25000000 | 12500000 | 12500000 |

However, the \`CASE WHEN\` approach will not work as expected when using an aggregate function that does not ignore \`NULL\` values. The \`first\` function falls into this category, so \`FILTER\` is preferred in this case.

“Pivot” the data out by year (move each year out to a separate column):

\`\`\`sql
SELECT
    first(i) FILTER (year = 2022) AS "2022",
    first(i) FILTER (year = 2023) AS "2023",
    first(i) FILTER (year = 2024) AS "2024",
    first(i) FILTER (year = 2025) AS "2025",
    first(i) FILTER (year IS NULL) AS "NULLs"
FROM stacked_data;
\`\`\`

<div class="monospace_table"></div>

|   2022   |   2023   |   2024   |   2025   |  NULLs   |
|:---|:---|:---|:---|:---|
| 1474561 | 25804801 | 50749441 | 76431361 | 87500001 |

This will produce \`NULL\` values whenever the first evaluation of the \`CASE WHEN\` clause returns a \`NULL\`:

\`\`\`sql
SELECT
    first(CASE WHEN year = 2022 THEN i END) AS "2022",
    first(CASE WHEN year = 2023 THEN i END) AS "2023",
    first(CASE WHEN year = 2024 THEN i END) AS "2024",
    first(CASE WHEN year = 2025 THEN i END) AS "2025",
    first(CASE WHEN year IS NULL THEN i END) AS "NULLs"
FROM stacked_data;
\`\`\`

<div class="monospace_table"></div>

|   2022   |   2023   |   2024   |   2025   |  NULLs   |
|:---|:---|:---|:---|:---|
| 1228801 | NULL | NULL | NULL | NULL  |

## Aggregate Function Syntax (Including \`FILTER\` Clause)

<div id="rrdiagram"></div>
`,"from.md":`---
title: FROM and JOIN Clauses
---

The \`FROM\` clause specifies the *source* of the data on which the remainder of the query should operate. Logically, the \`FROM\` clause is where the query starts execution. The \`FROM\` clause can contain a single table, a combination of multiple tables that are joined together using \`JOIN\` clauses, or another \`SELECT\` query inside a subquery node. DuckDB also has an optional \`FROM\`-first syntax which enables you to also query without a \`SELECT\` statement.

## Examples

Select all columns from the table called \`tbl\`:

\`\`\`sql
SELECT *
FROM tbl;
\`\`\`

Select all columns from the table using the \`FROM\`-first syntax:

\`\`\`sql
FROM tbl
SELECT *;
\`\`\`

Select all columns using the \`FROM\`-first syntax and omitting the \`SELECT\` clause:

\`\`\`sql
FROM tbl;
\`\`\`

Select all columns from the table called \`tbl\` through an alias \`tn\`:

\`\`\`sql
SELECT tn.*
FROM tbl tn;
\`\`\`

Use a prefix alias:

\`\`\`sql
SELECT tn.*
FROM tn: tbl;
\`\`\`

Select all columns from the table \`tbl\` in the schema \`schema_name\`:

\`\`\`sql
SELECT *
FROM schema_name.tbl;
\`\`\`

Select the column \`i\` from the table function \`range\`, where the first column of the range function is renamed to \`i\`:

\`\`\`sql
SELECT t.i
FROM range(100) AS t(i);
\`\`\`

Select all columns from the CSV file called \`test.csv\`:

\`\`\`sql
SELECT *
FROM 'test.csv';
\`\`\`

Select all columns from a subquery:

\`\`\`sql
SELECT *
FROM (SELECT * FROM tbl);
\`\`\`

Select the entire row of the table as a struct:

\`\`\`sql
SELECT t
FROM t;
\`\`\`

Select the entire row of the subquery as a struct (i.e., a single column):

\`\`\`sql
SELECT t
FROM (SELECT unnest(generate_series(41, 43)) AS x, 'hello' AS y) t;
\`\`\`

Join two tables together:

\`\`\`sql
SELECT *
FROM tbl
JOIN other_table
  ON tbl.key = other_table.key;
\`\`\`

Select a 10% sample from a table:

\`\`\`sql
SELECT *
FROM tbl
TABLESAMPLE 10%;
\`\`\`

Select a sample of 10 rows from a table:

\`\`\`sql
SELECT *
FROM tbl
TABLESAMPLE 10 ROWS;
\`\`\`

Use the \`FROM\`-first syntax with \`WHERE\` clause and aggregation:

\`\`\`sql
FROM range(100) AS t(i)
SELECT sum(t.i)
WHERE i % 2 = 0;
\`\`\`

### Table Functions

Some functions in duckdb return entire tables rather than individual values. These functions are accordingly called _table functions_ and can be used with a \`FROM\` clause like regular table references. 
Examples include [\`read_csv\`]({%link docs/stable/data/csv/overview.md %}#csv-functions), [\`read_parquet\`]({%link docs/stable/data/parquet/overview.md %}#read_parquet-function), [\`range\`]({% link docs/stable/sql/functions/list.md %}#rangestart-stop-step), [\`generate_series\`]({% link docs/stable/sql/functions/list.md %}#generate_seriesstart-stop-step), [\`repeat\`]({% link docs/stable/sql/functions/utility.md %}#repeat_rowvarargs-num_rows), [\`unnest\`]({% link docs/stable/sql/query_syntax/unnest.md %}), and [\`glob\`]({%link docs/stable/sql/functions/utility.md %}#globsearch_path) (note that some of the examples here can be used as both scalar and table functions). 

For example,

\`\`\`sql
SELECT *
FROM 'test.csv';
\`\`\`

is implicitly translated to a call of the \`read_csv\` table function:


\`\`\`sql
SELECT *
FROM read_csv('test.csv');
\`\`\`

All table functions support a \`WITH ORDINALITY\` suffix, which extends the returned table by an integer column \`ordinality\` that enumerates the generated rows starting at \`1\`.

\`\`\`sql
SELECT * 
FROM read_csv('test.csv') WITH ORDINALITY;
\`\`\`

Note that the same result could be achieved using the [\`row_number\` window function]({% link docs/stable/sql/functions/window_functions.md %}#row_numberorder-by-ordering).
In the presence of [joins](#joins), however, \`WITH ORDINALITY\` allows enumerating one side of the join instead of the final result set, without having to resort to sub-queries.

## Joins

Joins are a fundamental relational operation used to connect two tables or relations horizontally.
The relations are referred to as the _left_ and _right_ sides of the join
based on how they are written in the join clause.
Each result row has the columns from both relations.

A join uses a rule to match pairs of rows from each relation.
Often this is a predicate, but there are other implied rules that may be specified.

### Outer Joins

Rows that do not have any matches can still be returned if an \`OUTER\` join is specified.
Outer joins can be one of:

* \`LEFT\` (All rows from the left relation appear at least once)
* \`RIGHT\` (All rows from the right relation appear at least once)
* \`FULL\` (All rows from both relations appear at least once)

A join that is not \`OUTER\` is \`INNER\` (only rows that get paired are returned).

When an unpaired row is returned, the attributes from the other table are set to \`NULL\`.

### Cross Product Joins (Cartesian Product)

The simplest type of join is a \`CROSS JOIN\`.
There are no conditions for this type of join,
and it just returns all the possible pairs.

Return all pairs of rows:

\`\`\`sql
SELECT a.*, b.*
FROM a
CROSS JOIN b;
\`\`\`

This is equivalent to omitting the \`JOIN\` clause:

\`\`\`sql
SELECT a.*, b.*
FROM a, b;
\`\`\`

### Conditional Joins

Most joins are specified by a predicate that connects
attributes from one side to attributes from the other side.
The conditions can be explicitly specified using an \`ON\` clause
with the join (clearer) or implied by the \`WHERE\` clause (old-fashioned).

We use the \`l_regions\` and the \`l_nations\` tables from the TPC-H schema:

\`\`\`sql
CREATE TABLE l_regions (
    r_regionkey INTEGER NOT NULL PRIMARY KEY,
    r_name      CHAR(25) NOT NULL,
    r_comment   VARCHAR(152)
);

CREATE TABLE l_nations (
    n_nationkey INTEGER NOT NULL PRIMARY KEY,
    n_name      CHAR(25) NOT NULL,
    n_regionkey INTEGER NOT NULL,
    n_comment   VARCHAR(152),
    FOREIGN KEY (n_regionkey) REFERENCES l_regions(r_regionkey)
);
\`\`\`

Return the regions for the nations:

\`\`\`sql
SELECT n.*, r.*
FROM l_nations n
JOIN l_regions r ON (n_regionkey = r_regionkey);
\`\`\`

If the column names are the same and are required to be equal,
then the simpler \`USING\` syntax can be used:

\`\`\`sql
CREATE TABLE l_regions (regionkey INTEGER NOT NULL PRIMARY KEY,
                        name      CHAR(25) NOT NULL,
                        comment   VARCHAR(152));

CREATE TABLE l_nations (nationkey INTEGER NOT NULL PRIMARY KEY,
                        name      CHAR(25) NOT NULL,
                        regionkey INTEGER NOT NULL,
                        comment   VARCHAR(152),
                        FOREIGN KEY (regionkey) REFERENCES l_regions(regionkey));
\`\`\`

Return the regions for the nations:

\`\`\`sql
SELECT n.*, r.*
FROM l_nations n
JOIN l_regions r USING (regionkey);
\`\`\`

The expressions do not have to be equalities – any predicate can be used:

Return the pairs of jobs where one ran longer but cost less:

\`\`\`sql
SELECT s1.t_id, s2.t_id
FROM west s1, west s2
WHERE s1.time > s2.time
  AND s1.cost < s2.cost;
\`\`\`

### Natural Joins

Natural joins join two tables based on attributes that share the same name.

For example, take the following example with cities, airport codes and airport names. Note that both tables are intentionally incomplete, i.e., they do not have a matching pair in the other table.

\`\`\`sql
CREATE TABLE city_airport (city_name VARCHAR, iata VARCHAR);
CREATE TABLE airport_names (iata VARCHAR, airport_name VARCHAR);
INSERT INTO city_airport VALUES
    ('Amsterdam', 'AMS'),
    ('Rotterdam', 'RTM'),
    ('Eindhoven', 'EIN'),
    ('Groningen', 'GRQ');
INSERT INTO airport_names VALUES
    ('AMS', 'Amsterdam Airport Schiphol'),
    ('RTM', 'Rotterdam The Hague Airport'),
    ('MST', 'Maastricht Aachen Airport');
\`\`\`

To join the tables on their shared [\`IATA\`](https://en.wikipedia.org/wiki/IATA_airport_code) attributes, run:

\`\`\`sql
SELECT *
FROM city_airport
NATURAL JOIN airport_names;
\`\`\`

This produces the following result:

| city_name | iata |        airport_name         |
|-----------|------|-----------------------------|
| Amsterdam | AMS  | Amsterdam Airport Schiphol  |
| Rotterdam | RTM  | Rotterdam The Hague Airport |

Note that only rows where the same \`iata\` attribute was present in both tables were included in the result.

We can also express query using the vanilla \`JOIN\` clause with the \`USING\` keyword:

\`\`\`sql
SELECT *
FROM city_airport
JOIN airport_names
USING (iata);
\`\`\`

### Semi and Anti Joins

Semi joins return rows from the left table that have at least one match in the right table.
Anti joins return rows from the left table that have _no_ matches in the right table.
When using a semi or anti join the result will never have more rows than the left hand side table.
Semi joins provide the same logic as the [\`IN\` operator]({% link docs/stable/sql/expressions/in.md %}) statement.
Anti joins provide the same logic as the \`NOT IN\` operator, except anti joins ignore \`NULL\` values from the right table.

#### Semi Join Example

Return a list of city–airport code pairs from the \`city_airport\` table where the airport name **is available** in the \`airport_names\` table:

\`\`\`sql
SELECT *
FROM city_airport
SEMI JOIN airport_names
    USING (iata);
\`\`\`

| city_name | iata |
|-----------|------|
| Amsterdam | AMS  |
| Rotterdam | RTM  |

This query is equivalent with:

\`\`\`sql
SELECT *
FROM city_airport
WHERE iata IN (SELECT iata FROM airport_names);
\`\`\`

#### Anti Join Example

Return a list of city–airport code pairs from the \`city_airport\` table where the airport name **is not available** in the \`airport_names\` table:

\`\`\`sql
SELECT *
FROM city_airport
ANTI JOIN airport_names
    USING (iata);
\`\`\`

| city_name | iata |
|-----------|------|
| Eindhoven | EIN  |
| Groningen | GRQ  |

This query is equivalent with:

\`\`\`sql
SELECT *
FROM city_airport
WHERE iata NOT IN (SELECT iata FROM airport_names WHERE iata IS NOT NULL);
\`\`\`

### Lateral Joins

The \`LATERAL\` keyword allows subqueries in the \`FROM\` clause to refer to previous subqueries. This feature is also known as a _lateral join_.

\`\`\`sql
SELECT *
FROM range(3) t(i), LATERAL (SELECT i + 1) t2(j);
\`\`\`

<div class="center_aligned_header_table"></div>

| i | j |
|--:|--:|
| 0 | 1 |
| 2 | 3 |
| 1 | 2 |

Lateral joins are a generalization of correlated subqueries, as they can return multiple values per input value rather than only a single value.

\`\`\`sql
SELECT *
FROM
    generate_series(0, 1) t(i),
    LATERAL (SELECT i + 10 UNION ALL SELECT i + 100) t2(j);
\`\`\`

<div class="center_aligned_header_table"></div>

| i |  j  |
|--:|----:|
| 0 | 10  |
| 1 | 11  |
| 0 | 100 |
| 1 | 101 |

It may be helpful to think about \`LATERAL\` as a loop where we iterate through the rows of the first subquery and use it as input to the second (\`LATERAL\`) subquery.
In the examples above, we iterate through table \`t\` and refer to its column \`i\` from the definition of table \`t2\`. The rows of \`t2\` form column \`j\` in the result.

It is possible to refer to multiple attributes from the \`LATERAL\` subquery. Using the table from the first example:

\`\`\`sql
CREATE TABLE t1 AS
    SELECT *
    FROM range(3) t(i), LATERAL (SELECT i + 1) t2(j);

SELECT *
    FROM t1, LATERAL (SELECT i + j) t2(k)
    ORDER BY ALL;
\`\`\`

<div class="center_aligned_header_table"></div>

| i | j | k |
|--:|--:|--:|
| 0 | 1 | 1 |
| 1 | 2 | 3 |
| 2 | 3 | 5 |

> DuckDB detects when \`LATERAL\` joins should be used, making the use of the \`LATERAL\` keyword optional.

### Positional Joins

When working with data frames or other embedded tables of the same size,
the rows may have a natural correspondence based on their physical order.
In scripting languages, this is easily expressed using a loop:

\`\`\`cpp
for (i = 0; i < n; i++) {
    f(t1.a[i], t2.b[i]);
}
\`\`\`

It is difficult to express this in standard SQL because
relational tables are not ordered, but imported tables such as [data frames]({% link docs/stable/clients/python/data_ingestion.md %}#pandas-dataframes-–-object-columns)
or disk files (like [CSVs]({% link docs/stable/data/csv/overview.md %}) or [Parquet files]({% link docs/stable/data/parquet/overview.md %})) do have a natural ordering.

Connecting them using this ordering is called a _positional join:_

\`\`\`sql
CREATE TABLE t1 (x INTEGER);
CREATE TABLE t2 (s VARCHAR);

INSERT INTO t1 VALUES (1), (2), (3);
INSERT INTO t2 VALUES ('a'), ('b');

SELECT *
FROM t1
POSITIONAL JOIN t2;
\`\`\`

<div class="center_aligned_header_table"></div>

| x |  s   |
|--:|------|
| 1 | a    |
| 2 | b    |
| 3 | NULL |

Positional joins are always \`FULL OUTER\` joins, i.e., the resulting table has the length of the longer input table and the missing entries are filled with \`NULL\` values.

### As-Of Joins

A common operation when working with temporal or similarly-ordered data
is to find the nearest (first) event in a reference table (such as prices).
This is called an _as-of join:_

Attach prices to stock trades:

\`\`\`sql
SELECT t.*, p.price
FROM trades t
ASOF JOIN prices p
       ON t.symbol = p.symbol AND t.when >= p.when;
\`\`\`

The \`ASOF\` join requires at least one inequality condition on the ordering field.
The inequality can be any inequality condition (\`>=\`, \`>\`, \`<=\`, \`<\`)
on any data type, but the most common form is \`>=\` on a temporal type.
Any other conditions must be equalities (or \`NOT DISTINCT\`).
This means that the left/right order of the tables is significant.

\`ASOF\` joins each left side row with at most one right side row.
It can be specified as an \`OUTER\` join to find unpaired rows
(e.g., trades without prices or prices which have no trades.)

Attach prices or NULLs to stock trades:

\`\`\`sql
SELECT *
FROM trades t
ASOF LEFT JOIN prices p
            ON t.symbol = p.symbol
           AND t.when >= p.when;
\`\`\`

\`ASOF\` joins can also specify join conditions on matching column names with the \`USING\` syntax,
but the *last* attribute in the list must be the inequality,
which will be greater than or equal to (\`>=\`):

\`\`\`sql
SELECT *
FROM trades t
ASOF JOIN prices p USING (symbol, "when");
\`\`\`

Returns symbol, trades.when, price (but NOT prices.when):

If you combine \`USING\` with a \`SELECT *\` like this,
the query will return the left side (probe) column values for the matches,
not the right side (build) column values.
To get the \`prices\` times in the example, you will need to list the columns explicitly:

\`\`\`sql
SELECT t.symbol, t.when AS trade_when, p.when AS price_when, price
FROM trades t
ASOF LEFT JOIN prices p USING (symbol, "when");
\`\`\`

### Self-Joins

DuckDB allows self-joins for all types of joins.
Note that tables need to be aliased, using the same table name without aliases will result in an error:

\`\`\`sql
CREATE TABLE t (x INTEGER);
SELECT * FROM t JOIN t USING(x);
\`\`\`

\`\`\`console
Binder Error:
Duplicate alias "t" in query!
\`\`\`

Adding the aliases allows the query to parse successfully:

\`\`\`sql
SELECT * FROM t AS t1 JOIN t AS t2 USING(x);
\`\`\`

### Shorthands in the \`JOIN\` Clause

You can specify column names in the \`JOIN\` clause:

\`\`\`sql
CREATE TABLE t1 (x INTEGER);
CREATE TABLE t2 (y INTEGER);
INSERT INTO t1 VALUES (1), (2), (4);
INSERT INTO t2 VALUES (2), (3);
SELECT * FROM t1 NATURAL JOIN t2 t2(x);
\`\`\`

| x |
|--:|
| 2 |

You can also use the \`VALUES\` clause in the \`JOIN\` clause:

\`\`\`sql
SELECT * FROM t1 NATURAL JOIN (VALUES (2), (4)) _(x);
\`\`\`

| x |
|--:|
| 2 |
| 4 |

## \`FROM\`-First Syntax

DuckDB's SQL supports the \`FROM\`-first syntax, i.e., it allows putting the \`FROM\` clause before the \`SELECT\` clause or completely omitting the \`SELECT\` clause. We use the following example to demonstrate it:

\`\`\`sql
CREATE TABLE tbl AS
    SELECT *
    FROM (VALUES ('a'), ('b')) t1(s), range(1, 3) t2(i);
\`\`\`

### \`FROM\`-First Syntax with a \`SELECT\` Clause

The following statement demonstrates the use of the \`FROM\`-first syntax:

\`\`\`sql
FROM tbl
SELECT i, s;
\`\`\`

This is equivalent to:

\`\`\`sql
SELECT i, s
FROM tbl;
\`\`\`

<div class="center_aligned_header_table"></div>

| i | s |
|--:|---|
| 1 | a |
| 2 | a |
| 1 | b |
| 2 | b |

### \`FROM\`-First Syntax without a \`SELECT\` Clause

The following statement demonstrates the use of the optional \`SELECT\` clause:

\`\`\`sql
FROM tbl;
\`\`\`

This is equivalent to:

\`\`\`sql
SELECT *
FROM tbl;
\`\`\`

<div class="center_aligned_header_table"></div>

| s | i |
|---|--:|
| a | 1 |
| a | 2 |
| b | 1 |
| b | 2 |

## Syntax

<div id="rrdiagram"></div>
`,"groupby.md":'---\ntitle: GROUP BY Clause\n---\n\nThe `GROUP BY` clause specifies which grouping columns should be used to perform any aggregations in the `SELECT` clause.\nIf the `GROUP BY` clause is specified, the query is always an aggregate query, even if no aggregations are present in the `SELECT` clause.\n\nWhen a `GROUP BY` clause is specified, all tuples that have matching data in the grouping columns (i.e., all tuples that belong to the same group) will be combined.\nThe values of the grouping columns themselves are unchanged, and any other columns can be combined using an [aggregate function]({% link docs/stable/sql/functions/aggregates.md %}) (such as `count`, `sum`, `avg`, etc).\n\n## `GROUP BY ALL`\n\nUse `GROUP BY ALL` to `GROUP BY` all columns in the `SELECT` statement that are not wrapped in aggregate functions.\nThis simplifies the syntax by allowing the columns list to be maintained in a single location, and prevents bugs by keeping the `SELECT` granularity aligned to the `GROUP BY` granularity (e.g., it prevents duplication).\nSee examples below and additional examples in the [“Friendlier SQL with DuckDB” blog post]({% post_url 2022-05-04-friendlier-sql %}#group-by-all).\n\n## Multiple Dimensions\n\nNormally, the `GROUP BY` clause groups along a single dimension.\nUsing the [`GROUPING SETS`, `CUBE` or `ROLLUP` clauses]({% link docs/stable/sql/query_syntax/grouping_sets.md %}) it is possible to group along multiple dimensions.\nSee the [`GROUPING SETS`]({% link docs/stable/sql/query_syntax/grouping_sets.md %}) page for more information.\n\n## Examples\n\nCount the number of entries in the `addresses` table that belong to each different city:\n\n```sql\nSELECT city, count(*)\nFROM addresses\nGROUP BY city;\n```\n\nCompute the average income per city per street_name:\n\n```sql\nSELECT city, street_name, avg(income)\nFROM addresses\nGROUP BY city, street_name;\n```\n\n### `GROUP BY ALL` Examples\n\nGroup by city and street_name to remove any duplicate values:\n\n```sql\nSELECT city, street_name\nFROM addresses\nGROUP BY ALL;\n```\n\nCompute the average income per city per street_name. Since income is wrapped in an aggregate function, do not include it in the `GROUP BY`:\n\n```sql\nSELECT city, street_name, avg(income)\nFROM addresses\nGROUP BY ALL;\n-- GROUP BY city, street_name:\n```\n\n## Syntax\n\n<div id="rrdiagram"></div>\n',"grouping_sets.md":`---
title: GROUPING SETS
---

\`GROUPING SETS\`, \`ROLLUP\` and \`CUBE\` can be used in the \`GROUP BY\` clause to perform a grouping over multiple dimensions within the same query.
Note that this syntax is not compatible with [\`GROUP BY ALL\`]({% link docs/stable/sql/query_syntax/groupby.md %}#group-by-all).

## Examples

Compute the average income along the provided four different dimensions:

\`\`\`sql
-- the syntax () denotes the empty set (i.e., computing an ungrouped aggregate)
SELECT city, street_name, avg(income)
FROM addresses
GROUP BY GROUPING SETS ((city, street_name), (city), (street_name), ());
\`\`\`

Compute the average income along the same dimensions:

\`\`\`sql
SELECT city, street_name, avg(income)
FROM addresses
GROUP BY CUBE (city, street_name);
\`\`\`

Compute the average income along the dimensions \`(city, street_name)\`, \`(city)\` and \`()\`:

\`\`\`sql
SELECT city, street_name, avg(income)
FROM addresses
GROUP BY ROLLUP (city, street_name);
\`\`\`

## Description

\`GROUPING SETS\` perform the same aggregate across different \`GROUP BY clauses\` in a single query.

\`\`\`sql
CREATE TABLE students (course VARCHAR, type VARCHAR);
INSERT INTO students (course, type)
VALUES
    ('CS', 'Bachelor'), ('CS', 'Bachelor'), ('CS', 'PhD'), ('Math', 'Masters'),
    ('CS', NULL), ('CS', NULL), ('Math', NULL);
\`\`\`

\`\`\`sql
SELECT course, type, count(*)
FROM students
GROUP BY GROUPING SETS ((course, type), course, type, ());
\`\`\`

| course |   type   | count_star() |
|--------|----------|-------------:|
| Math   | NULL     | 1            |
| NULL   | NULL     | 7            |
| CS     | PhD      | 1            |
| CS     | Bachelor | 2            |
| Math   | Masters  | 1            |
| CS     | NULL     | 2            |
| Math   | NULL     | 2            |
| CS     | NULL     | 5            |
| NULL   | NULL     | 3            |
| NULL   | Masters  | 1            |
| NULL   | Bachelor | 2            |
| NULL   | PhD      | 1            |

In the above query, we group across four different sets: \`course, type\`, \`course\`, \`type\` and \`()\` (the empty group). The result contains \`NULL\` for a group which is not in the grouping set for the result, i.e., the above query is equivalent to the following statement of \`UNION ALL\` clauses:

\`\`\`sql
-- Group by course, type:
SELECT course, type, count(*)
FROM students
GROUP BY course, type
UNION ALL
-- Group by type:
SELECT NULL AS course, type, count(*)
FROM students
GROUP BY type
UNION ALL
-- Group by course:
SELECT course, NULL AS type, count(*)
FROM students
GROUP BY course
UNION ALL
-- Group by nothing:
SELECT NULL AS course, NULL AS type, count(*)
FROM students;
\`\`\`

\`CUBE\` and \`ROLLUP\` are syntactic sugar to easily produce commonly used grouping sets.

The \`ROLLUP\` clause will produce all “sub-groups” of a grouping set, e.g., \`ROLLUP (country, city, zip)\` produces the grouping sets \`(country, city, zip), (country, city), (country), ()\`. This can be useful for producing different levels of detail of a group by clause. This produces \`n+1\` grouping sets where n is the amount of terms in the \`ROLLUP\` clause.

\`CUBE\` produces grouping sets for all combinations of the inputs, e.g., \`CUBE (country, city, zip)\` will produce \`(country, city, zip), (country, city), (country, zip), (city, zip), (country), (city), (zip), ()\`. This produces \`2^n\` grouping sets.

## Identifying Grouping Sets with \`GROUPING_ID()\`

The super-aggregate rows generated by \`GROUPING SETS\`, \`ROLLUP\` and \`CUBE\` can often be identified by \`NULL\`-values returned for the respective column in the grouping. But if the columns used in the grouping can themselves contain actual \`NULL\`-values, then it can be challenging to distinguish whether the value in the resultset is a “real” \`NULL\`-value coming out of the data itself, or a \`NULL\`-value generated by the grouping construct. The \`GROUPING_ID()\` or \`GROUPING()\` function is designed to identify which groups generated the super-aggregate rows in the result.

\`GROUPING_ID()\` is an aggregate function that takes the column expressions that make up the grouping(s). It returns a \`BIGINT\` value. The return value is \`0\` for the rows that are not super-aggregate rows. But for the super-aggregate rows, it returns an integer value that identifies the combination of expressions that make up the group for which the super-aggregate is generated. At this point, an example might help. Consider the following query:

\`\`\`sql
WITH days AS (
    SELECT
        year("generate_series")    AS y,
        quarter("generate_series") AS q,
        month("generate_series")   AS m
    FROM generate_series(DATE '2023-01-01', DATE '2023-12-31', INTERVAL 1 DAY)
)
SELECT y, q, m, GROUPING_ID(y, q, m) AS "grouping_id()"
FROM days
GROUP BY GROUPING SETS (
    (y, q, m),
    (y, q),
    (y),
    ()
)
ORDER BY y, q, m;
\`\`\`

These are the results:

|  y   |  q   |  m   | grouping_id() |
|-----:|-----:|-----:|--------------:|
| 2023 | 1    | 1    | 0             |
| 2023 | 1    | 2    | 0             |
| 2023 | 1    | 3    | 0             |
| 2023 | 1    | NULL | 1             |
| 2023 | 2    | 4    | 0             |
| 2023 | 2    | 5    | 0             |
| 2023 | 2    | 6    | 0             |
| 2023 | 2    | NULL | 1             |
| 2023 | 3    | 7    | 0             |
| 2023 | 3    | 8    | 0             |
| 2023 | 3    | 9    | 0             |
| 2023 | 3    | NULL | 1             |
| 2023 | 4    | 10   | 0             |
| 2023 | 4    | 11   | 0             |
| 2023 | 4    | 12   | 0             |
| 2023 | 4    | NULL | 1             |
| 2023 | NULL | NULL | 3             |
| NULL | NULL | NULL | 7             |

In this example, the lowest level of grouping is at the month level, defined by the grouping set \`(y, q, m)\`. Result rows corresponding to that level are simply aggregate rows and the \`GROUPING_ID(y, q, m)\` function returns \`0\` for those. The grouping set \`(y, q)\` results in super-aggregate rows over the month level, leaving a \`NULL\`-value for the \`m\` column, and for which \`GROUPING_ID(y, q, m)\` returns \`1\`. The grouping set \`(y)\` results in super-aggregate rows over the quarter level, leaving \`NULL\`-values for the \`m\` and \`q\` column, for which \`GROUPING_ID(y, q, m)\` returns \`3\`. Finally, the \`()\` grouping set results in one super-aggregate row for the entire resultset, leaving \`NULL\`-values for \`y\`, \`q\` and \`m\` and for which \`GROUPING_ID(y, q, m)\` returns \`7\`.

To understand the relationship between the return value and the grouping set, you can think of \`GROUPING_ID(y, q, m)\` writing to a bitfield, where the first bit corresponds to the last expression passed to \`GROUPING_ID()\`, the second bit to the one-but-last expression passed to \`GROUPING_ID()\`, and so on. This may become clearer by casting \`GROUPING_ID()\` to \`BIT\`:

\`\`\`sql
WITH days AS (
    SELECT
        year("generate_series")    AS y,
        quarter("generate_series") AS q,
        month("generate_series")   AS m
    FROM generate_series(DATE '2023-01-01', DATE '2023-12-31', INTERVAL 1 DAY)
)
SELECT
    y, q, m,
    GROUPING_ID(y, q, m) AS "grouping_id(y, q, m)",
    right(GROUPING_ID(y, q, m)::BIT::VARCHAR, 3) AS "y_q_m_bits"
FROM days
GROUP BY GROUPING SETS (
    (y, q, m),
    (y, q),
    (y),
    ()
)
ORDER BY y, q, m;
\`\`\`

Which returns these results:

|  y   |  q   |  m   | grouping_id(y, q, m) | y_q_m_bits |
|-----:|-----:|-----:|---------------------:|------------|
| 2023 | 1    | 1    | 0                    | 000        |
| 2023 | 1    | 2    | 0                    | 000        |
| 2023 | 1    | 3    | 0                    | 000        |
| 2023 | 1    | NULL | 1                    | 001        |
| 2023 | 2    | 4    | 0                    | 000        |
| 2023 | 2    | 5    | 0                    | 000        |
| 2023 | 2    | 6    | 0                    | 000        |
| 2023 | 2    | NULL | 1                    | 001        |
| 2023 | 3    | 7    | 0                    | 000        |
| 2023 | 3    | 8    | 0                    | 000        |
| 2023 | 3    | 9    | 0                    | 000        |
| 2023 | 3    | NULL | 1                    | 001        |
| 2023 | 4    | 10   | 0                    | 000        |
| 2023 | 4    | 11   | 0                    | 000        |
| 2023 | 4    | 12   | 0                    | 000        |
| 2023 | 4    | NULL | 1                    | 001        |
| 2023 | NULL | NULL | 3                    | 011        |
| NULL | NULL | NULL | 7                    | 111        |

Note that the number of expressions passed to \`GROUPING_ID()\`, or the order in which they are passed is independent from the actual group definitions appearing in the \`GROUPING SETS\`-clause (or the groups implied by \`ROLLUP\` and \`CUBE\`). As long as the expressions passed to \`GROUPING_ID()\` are expressions that appear some where in the \`GROUPING SETS\`-clause, \`GROUPING_ID()\` will set a bit corresponding to the position of the expression whenever that expression is rolled up to a super-aggregate.

## Syntax

<div id="rrdiagram"></div>
`,"having.md":'---\ntitle: HAVING Clause\n---\n\nThe `HAVING` clause can be used after the `GROUP BY` clause to provide filter criteria *after* the grouping has been completed. In terms of syntax the `HAVING` clause is identical to the `WHERE` clause, but while the `WHERE` clause occurs before the grouping, the `HAVING` clause occurs after the grouping.\n\n## Examples\n\nCount the number of entries in the `addresses` table that belong to each different `city`, filtering out cities with a count below 50:\n\n```sql\nSELECT city, count(*)\nFROM addresses\nGROUP BY city\nHAVING count(*) >= 50;\n```\n\nCompute the average income per city per `street_name`, filtering out cities with an average `income` bigger than twice the median `income`:\n\n```sql\nSELECT city, street_name, avg(income)\nFROM addresses\nGROUP BY city, street_name\nHAVING avg(income) > 2 * median(income);\n```\n\n## Syntax\n\n<div id="rrdiagram"></div>\n',"in.md":"---\ntitle: IN Operator\n---\n\nThe `IN` operator checks containment of the left expression inside the _collection_ on the right hand side (RHS).\nSupported collections on the RHS are tuples, lists, maps and subqueries that return a single column.\n\n<div id=\"rrdiagram\"></div>\n\n## `IN (val1, val2, ...)` (Tuple)\n\nThe `IN` operator on a tuple `(val1, val2, ...)` returns `true` if the expression is present in the RHS, `false` if the expression is not in the RHS and the RHS has no `NULL` values, or `NULL` if the expression is not in the RHS and the RHS has `NULL` values.\n\n```sql\nSELECT 'Math' IN ('CS', 'Math');\n```\n\n```text\ntrue\n```\n\n```sql\nSELECT 'English' IN ('CS', 'Math');\n```\n\n```text\nfalse\n```\n\n```sql\nSELECT 'Math' IN ('CS', 'Math', NULL);\n```\n\n```text\ntrue\n```\n\n```sql\nSELECT 'English' IN ('CS', 'Math', NULL);\n```\n\n```text\nNULL\n```\n\n## `IN [val1, val2, ...]` (List)\n\nThe `IN` operator works on lists according to the semantics used in Python.\nUnlike for the [`IN tuple` operator](#in-val1-val2--tuple), the presence of `NULL` values on the right hand side of the expression does not make a difference in the result:\n\n```sql\nSELECT 'Math' IN ['CS', 'Math', NULL];\n```\n\n```text\ntrue\n```\n\n```sql\nSELECT 'English' IN ['CS', 'Math', NULL];\n```\n\n```text\nfalse\n```\n\n## `IN` Map\n\nThe `IN` operator works on [maps]({% link docs/stable/sql/data_types/map.md %}) according to the semantics used in Python, i.e., it checks for the presence of keys (not values):\n\n```sql\nSELECT 'key1' IN MAP {'key1': 50, 'key2': 75};\n```\n\n```text\ntrue\n```\n\n```sql\nSELECT 'key3' IN MAP {'key1': 50, 'key2': 75};\n```\n\n```text\nfalse\n```\n\n## `IN` Subquery\n\nThe `IN` operator works with [subqueries]({% link docs/stable/sql/expressions/subqueries.md %}) that return a single column.\nFor example:\n\n```sql\nSELECT 42 IN (SELECT unnest([32, 42, 52]) AS x);\n```\n\n```text\ntrue\n```\n\nIf the subquery returns more than one column, a Binder Error is thrown:\n\n```sql\nSELECT 42 IN (SELECT unnest([32, 42, 52]) AS x, 'a' AS y);\n```\n\n```console\nBinder Error:\nSubquery returns 2 columns - expected 1\n```\n\n## `IN` String\n\nThe `IN` operator can be used as a shorthand for the [`contains` string function]({% link docs/stable/sql/functions/text.md %}#containsstring-search_string).\nFor example:\n\n```sql\nSELECT 'Hello' IN 'Hello World';\n```\n\n```text\ntrue\n```\n\n## `NOT IN`\n\n`NOT IN` can be used to check if an element is not present in the set.\n`x NOT IN y` is equivalent to `NOT (x IN y)`.\n","interval.md":'---\ntitle: Interval Functions\n---\n\n<!-- markdownlint-disable MD001 -->\n\nThis section describes functions and operators for examining and manipulating [`INTERVAL`]({% link docs/stable/sql/data_types/interval.md %}) values.\n\n## Interval Operators\n\nThe table below shows the available mathematical operators for `INTERVAL` types.\n\n| Operator | Description | Example | Result |\n|:-|:--|:----|:--|\n| `+` | Addition of an `INTERVAL` | `INTERVAL 1 HOUR + INTERVAL 5 HOUR` | `INTERVAL 6 HOUR` |\n| `+` | Addition to a `DATE` | `DATE \'1992-03-22\' + INTERVAL 5 DAY` | `1992-03-27` |\n| `+` | Addition to a `TIMESTAMP` | `TIMESTAMP \'1992-03-22 01:02:03\' + INTERVAL 5 DAY` | `1992-03-27 01:02:03` |\n| `+` | Addition to a `TIME` | `TIME \'01:02:03\' + INTERVAL 5 HOUR` | `06:02:03` |\n| `-` | Subtraction of an `INTERVAL` | `INTERVAL 5 HOUR - INTERVAL 1 HOUR` | `INTERVAL 4 HOUR` |\n| `-` | Subtraction from a `DATE` | `DATE \'1992-03-27\' - INTERVAL 5 DAY` | `1992-03-22` |\n| `-` | Subtraction from a `TIMESTAMP` | `TIMESTAMP \'1992-03-27 01:02:03\' - INTERVAL 5 DAY` | `1992-03-22 01:02:03` |\n| `-` | Subtraction from a `TIME` | `TIME \'06:02:03\' - INTERVAL 5 HOUR` | `01:02:03` |\n\n## Interval Functions\n\nThe table below shows the available scalar functions for `INTERVAL` types.\n\n| Name | Description |\n|:--|:-------|\n| [`date_part(part, interval)`](#date_partpart-interval) | Extract [datepart component]({% link docs/stable/sql/functions/datepart.md %}) (equivalent to `extract`). See [`INTERVAL`]({% link docs/stable/sql/data_types/interval.md %}) for the sometimes surprising rules governing this extraction. |\n| [`datepart(part, interval)`](#datepartpart-interval) | Alias of `date_part`. |\n| [`extract(part FROM interval)`](#extractpart-from-interval) | Alias of `date_part`. |\n| [`epoch(interval)`](#epochinterval) | Get total number of seconds, as double precision floating point number, in interval. |\n| [`to_centuries(integer)`](#to_centuriesinteger) | Construct a century interval. |\n| [`to_days(integer)`](#to_daysinteger) | Construct a day interval. |\n| [`to_decades(integer)`](#to_decadesinteger) | Construct a decade interval. |\n| [`to_hours(integer)`](#to_hoursinteger) | Construct an hour interval. |\n| [`to_microseconds(integer)`](#to_microsecondsinteger) | Construct a microsecond interval. |\n| [`to_millennia(integer)`](#to_millenniainteger) | Construct a millennium interval. |\n| [`to_milliseconds(integer)`](#to_millisecondsinteger) | Construct a millisecond interval. |\n| [`to_minutes(integer)`](#to_minutesinteger) | Construct a minute interval. |\n| [`to_months(integer)`](#to_monthsinteger) | Construct a month interval. |\n| [`to_quarters(integer`)](#to_quartersinteger) | Construct an interval of `integer` quarters. |\n| [`to_seconds(integer)`](#to_secondsinteger) | Construct a second interval. |\n| [`to_weeks(integer)`](#to_weeksinteger) | Construct a week interval. |\n| [`to_years(integer)`](#to_yearsinteger) | Construct a year interval. |\n\n> Only the documented [date part components]({% link docs/stable/sql/functions/datepart.md %}) are defined for intervals.\n\n#### `date_part(part, interval)`\n\n<div class="nostroke_table"></div>\n\n| **Description** | Extract [datepart component]({% link docs/stable/sql/functions/datepart.md %}) (equivalent to `extract`). See [`INTERVAL`]({% link docs/stable/sql/data_types/interval.md %}) for the sometimes surprising rules governing this extraction. |\n| **Example** | `date_part(\'year\', INTERVAL \'14 months\')` |\n| **Result** | `1` |\n\n#### `datepart(part, interval)`\n\n<div class="nostroke_table"></div>\n\n| **Description** | Alias of `date_part`. |\n| **Example** | `datepart(\'year\', INTERVAL \'14 months\')` |\n| **Result** | `1` |\n\n#### `extract(part FROM interval)`\n\n<div class="nostroke_table"></div>\n\n| **Description** | Alias of `date_part`. |\n| **Example** | `extract(\'month\' FROM INTERVAL \'14 months\')` |\n| **Result** | 2 |\n\n#### `epoch(interval)`\n\n<div class="nostroke_table"></div>\n\n| **Description** | Get total number of seconds, as double precision floating point number, in interval. |\n| **Example** | `epoch(INTERVAL 5 HOUR)` |\n| **Result** | `18000.0` |\n\n#### `to_centuries(integer)`\n\n<div class="nostroke_table"></div>\n\n| **Description** | Construct a century interval. |\n| **Example** | `to_centuries(5)` |\n| **Result** | `INTERVAL 500 YEAR` |\n\n#### `to_days(integer)`\n\n<div class="nostroke_table"></div>\n\n| **Description** | Construct a day interval. |\n| **Example** | `to_days(5)` |\n| **Result** | `INTERVAL 5 DAY` |\n\n#### `to_decades(integer)`\n\n<div class="nostroke_table"></div>\n\n| **Description** | Construct a decade interval. |\n| **Example** | `to_decades(5)` |\n| **Result** | `INTERVAL 50 YEAR` |\n\n#### `to_hours(integer)`\n\n<div class="nostroke_table"></div>\n\n| **Description** | Construct an hour interval. |\n| **Example** | `to_hours(5)` |\n| **Result** | `INTERVAL 5 HOUR` |\n\n#### `to_microseconds(integer)`\n\n<div class="nostroke_table"></div>\n\n| **Description** | Construct a microsecond interval. |\n| **Example** | `to_microseconds(5)` |\n| **Result** | `INTERVAL 5 MICROSECOND` |\n\n#### `to_millennia(integer)`\n\n<div class="nostroke_table"></div>\n\n| **Description** | Construct a millennium interval. |\n| **Example** | `to_millennia(5)` |\n| **Result** | `INTERVAL 5000 YEAR` |\n\n#### `to_milliseconds(integer)`\n\n<div class="nostroke_table"></div>\n\n| **Description** | Construct a millisecond interval. |\n| **Example** | `to_milliseconds(5)` |\n| **Result** | `INTERVAL 5 MILLISECOND` |\n\n#### `to_minutes(integer)`\n\n<div class="nostroke_table"></div>\n\n| **Description** | Construct a minute interval. |\n| **Example** | `to_minutes(5)` |\n| **Result** | `INTERVAL 5 MINUTE` |\n\n#### `to_months(integer)`\n\n<div class="nostroke_table"></div>\n\n| **Description** | Construct a month interval. |\n| **Example** | `to_months(5)` |\n| **Result** | `INTERVAL 5 MONTH` |\n\n#### `to_quarters(integer)`\n\n<div class="nostroke_table"></div>\n\n| **Description** | Construct an interval of `integer` quarters. |\n| **Example** | `to_quarters(5)` |\n| **Result** | `INTERVAL 1 YEAR 3 MONTHS` |\n\n#### `to_seconds(integer)`\n\n<div class="nostroke_table"></div>\n\n| **Description** | Construct a second interval. |\n| **Example** | `to_seconds(5)` |\n| **Result** | `INTERVAL 5 SECOND` |\n\n#### `to_weeks(integer)`\n\n<div class="nostroke_table"></div>\n\n| **Description** | Construct a week interval. |\n| **Example** | `to_weeks(5)` |\n| **Result** | `INTERVAL 35 DAY` |\n\n#### `to_years(integer)`\n\n<div class="nostroke_table"></div>\n\n| **Description** | Construct a year interval. |\n| **Example** | `to_years(5)` |\n| **Result** | `INTERVAL 5 YEAR` |\n',"lambda.md":"---\ntitle: Lambda Functions\n---\n\n> Deprecated DuckDB 1.3.0 deprecated the old lambda single arrow syntax (`x -> x + 1`)\n> in favor of the Python-style syntax (`lambda x : x + 1`).\n>\n> DuckDB 1.3.0 also introduces a new setting to configure the lambda syntax.\n>\n> ```sql\n> SET lambda_syntax = 'DEFAULT';\n> SET lambda_syntax = 'ENABLE_SINGLE_ARROW';\n> SET lambda_syntax = 'DISABLE_SINGLE_ARROW';\n> ```\n>\n> Currently, `DEFAULT` enables both syntax styles, i.e.,\n> the old single arrow syntax and the Python-style syntax.\n>\n> DuckDB 1.5.0 will be the last release supporting the single arrow syntax without explicitly enabling it.\n>\n> DuckDB 1.6.0 disables the single arrow syntax on default.\n>\n> DuckDB 1.7.0 removes the `lambda_syntax` flag and fully deprecates the single arrow syntax,\n> so the old behavior will no longer be possible.\n\nLambda functions enable the use of more complex and flexible expressions in queries.\nDuckDB supports several scalar functions that operate on [`LIST`s]({% link docs/stable/sql/data_types/list.md %}) and\naccept lambda functions as parameters\nin the form `lambda ⟨parameter1⟩, ⟨parameter2⟩, ... : ⟨expression⟩`{:.language-sql .highlight}.\nIf the lambda function has only one parameter, then the parentheses can be omitted.\nThe parameters can have any names.\nFor example, the following are all valid lambda functions:\n\n* `lambda param : param > 1`{:.language-sql .highlight}\n* `lambda s : contains(concat(s, 'DB'), 'duck')`{:.language-sql .highlight}\n* `lambda acc, x : acc + x`{:.language-sql .highlight}\n\n## Scalar Functions That Accept Lambda Functions\n\n<!-- markdownlint-disable MD001 -->\n\n<!-- Start of section generated by scripts/generate_sql_function_docs.py; categories: [lambda] -->\n<!-- markdownlint-disable MD056 -->\n\n| Function | Description |\n|:--|:-------|\n| [`apply(list, lambda(x))`](#list_transformlist-lambdax) | Alias for `list_transform`. |\n| [`array_apply(list, lambda(x))`](#list_transformlist-lambdax) | Alias for `list_transform`. |\n| [`array_filter(list, lambda(x))`](#list_filterlist-lambdax) | Alias for `list_filter`. |\n| [`array_reduce(list, lambda(x, y)[, initial_value])`](#list_reducelist-lambdax-y-initial_value) | Alias for `list_reduce`. |\n| [`array_transform(list, lambda(x))`](#list_transformlist-lambdax) | Alias for `list_transform`. |\n| [`filter(list, lambda(x))`](#list_filterlist-lambdax) | Alias for `list_filter`. |\n| [`list_apply(list, lambda(x))`](#list_transformlist-lambdax) | Alias for `list_transform`. |\n| [`list_filter(list, lambda(x))`](#list_filterlist-lambdax) | Constructs a list from those elements of the input `list` for which the `lambda` function returns `true`. DuckDB must be able to cast the `lambda` function's return type to `BOOL`. The return type of `list_filter` is the same as the input list's. See [`list_filter` examples]({% link docs/stable/sql/functions/lambda.md %}#list_filter-examples). |\n| [`list_reduce(list, lambda(x, y)[, initial_value])`](#list_reducelist-lambdax-y-initial_value) | Reduces all elements of the input `list` into a single scalar value by executing the `lambda` function on a running result and the next list element. The `lambda` function has an optional `initial_value` argument. See [`list_reduce` examples]({% link docs/stable/sql/functions/lambda.md %}#list_reduce-examples). |\n| [`list_transform(list, lambda(x))`](#list_transformlist-lambdax) | Returns a list that is the result of applying the `lambda` function to each element of the input `list`. The return type is defined by the return type of the `lambda` function. See [`list_transform` examples]({% link docs/stable/sql/functions/lambda.md %}#list_transform-examples). |\n| [`reduce(list, lambda(x, y)[, initial_value])`](#list_reducelist-lambdax-y-initial_value) | Alias for `list_reduce`. |\n\n<!-- markdownlint-enable MD056 -->\n\n#### `list_filter(list, lambda(x))`\n\n<div class=\"nostroke_table\"></div>\n\n| **Description** | Constructs a list from those elements of the input `list` for which the `lambda` function returns `true`. DuckDB must be able to cast the `lambda` function's return type to `BOOL`. The return type of `list_filter` is the same as the input list's. See [`list_filter` examples]({% link docs/stable/sql/functions/lambda.md %}#list_filter-examples). |\n| **Example** | `list_filter([3, 4, 5], lambda x : x > 4)` |\n| **Result** | `[5]` |\n| **Aliases** | `array_filter`, `filter` |\n\n#### `list_reduce(list, lambda(x, y)[, initial_value])`\n\n<div class=\"nostroke_table\"></div>\n\n| **Description** | Reduces all elements of the input `list` into a single scalar value by executing the `lambda` function on a running result and the next list element. The `lambda` function has an optional `initial_value` argument. See [`list_reduce` examples]({% link docs/stable/sql/functions/lambda.md %}#list_reduce-examples). |\n| **Example** | `list_reduce([1, 2, 3], lambda x, y : x + y)` |\n| **Result** | `6` |\n| **Aliases** | `array_reduce`, `reduce` |\n\n#### `list_transform(list, lambda(x))`\n\n<div class=\"nostroke_table\"></div>\n\n| **Description** | Returns a list that is the result of applying the `lambda` function to each element of the input `list`. The return type is defined by the return type of the `lambda` function. See [`list_transform` examples]({% link docs/stable/sql/functions/lambda.md %}#list_transform-examples). |\n| **Example** | `list_transform([1, 2, 3], lambda x : x + 1)` |\n| **Result** | `[2, 3, 4]` |\n| **Aliases** | `apply`, `array_apply`, `array_transform`, `list_apply` |\n\n<!-- End of section generated by scripts/generate_sql_function_docs.py -->\n\n<!-- markdownlint-enable MD001 -->\n\n## Nesting Lambda Functions\n\nAll scalar functions can be arbitrarily nested. For example, nested lambda functions to get all squares of even list elements:\n\n```sql\nSELECT list_transform(\n        list_filter([0, 1, 2, 3, 4, 5], lambda x: x % 2 = 0),\n        lambda y: y * y\n    );\n```\n\n```text\n[0, 4, 16]\n```\n\nNested lambda function to add each element of the first list to the sum of the second list:\n\n```sql\nSELECT list_transform(\n        [1, 2, 3],\n        lambda x :\n            list_reduce([4, 5, 6], lambda a, b: a + b) + x\n    );\n```\n\n```text\n[16, 17, 18]\n```\n\n## Scoping\n\nLambda functions conform to scoping rules in the following order:\n\n* inner lambda parameters\n* outer lambda parameters\n* column names\n* macro parameters\n\n```sql\nCREATE TABLE tbl (x INTEGER);\nINSERT INTO tbl VALUES (10);\nSELECT list_apply(\n            [1, 2],\n            lambda x: list_apply([4], lambda x: x + tbl.x)[1] + x\n    )\nFROM tbl;\n```\n\n```text\n[15, 16]\n```\n\n## Indexes as Parameters\n\nAll lambda functions accept an optional extra parameter that represents the index of the current element.\nThis is always the last parameter of the lambda function (e.g., `i` in `(x, i)`), and is 1-based (i.e., the first element has index 1).\n\nGet all elements that are larger than their index:\n\n```sql\nSELECT list_filter([1, 3, 1, 5], lambda x, i: x > i);\n```\n\n```text\n[3, 5]\n```\n\n## Examples\n\n### `list_transform` Examples\n\nIncrementing each list element by one:\n\n```sql\nSELECT list_transform([1, 2, NULL, 3], lambda x: x + 1);\n```\n\n```text\n[2, 3, NULL, 4]\n```\n\nTransforming strings:\n\n```sql\nSELECT list_transform(['Duck', 'Goose', 'Sparrow'], lambda s: concat(s, 'DB'));\n```\n\n```text\n[DuckDB, GooseDB, SparrowDB]\n```\n\nCombining lambda functions with other functions:\n\n```sql\nSELECT list_transform([5, NULL, 6], lambda x: coalesce(x, 0) + 1);\n```\n\n```text\n[6, 1, 7]\n```\n\n### `list_filter` Examples\n\nFilter out negative values:\n\n```sql\nSELECT list_filter([5, -6, NULL, 7], lambda x: x > 0);\n```\n\n```text\n[5, 7]\n```\n\nDivisible by 2 and 5:\n\n```sql\nSELECT list_filter(\n        list_filter([2, 4, 3, 1, 20, 10, 3, 30], lambda x: x % 2 = 0),\n        lambda y: y % 5 = 0\n    );\n```\n\n```text\n[20, 10, 30]\n```\n\nIn combination with `range(...)` to construct lists:\n\n```sql\nSELECT list_filter([1, 2, 3, 4], lambda x: x > #1) FROM range(4);\n```\n\n```text\n[1, 2, 3, 4]\n[2, 3, 4]\n[3, 4]\n[4]\n```\n\n### `list_reduce` Examples\n\nSum of all list elements:\n\n```sql\nSELECT list_reduce([1, 2, 3, 4], lambda acc, x: acc + x);\n```\n\n```text\n10\n```\n\nOnly add up list elements if they are greater than 2:\n\n```sql\nSELECT list_reduce(\n        list_filter([1, 2, 3, 4], lambda x: x > 2),\n        lambda acc, x: acc + x\n    );\n```\n\n```text\n7\n```\n\nConcat all list elements:\n\n```sql\nSELECT list_reduce(['DuckDB', 'is', 'awesome'], lambda acc, x: concat(acc, ' ', x));\n```\n\n```text\nDuckDB is awesome\n```\n\nConcatenate elements with the index without an initial value:\n\n```sql\nSELECT list_reduce(\n        ['a', 'b', 'c', 'd'],\n        lambda x, y, i: x || ' - ' || CAST(i AS VARCHAR) || ' - ' || y\n    );\n```\n\n```text\na - 2 - b - 3 - c - 4 - d\n```\n\nConcatenate elements with the index with an initial value:\n\n```sql\nSELECT list_reduce(\n        ['a', 'b', 'c', 'd'],\n        lambda x, y, i: x || ' - ' || CAST(i AS VARCHAR) || ' - ' || y, 'INITIAL'\n    );\n```\n\n```text\nINITIAL - 1 - a - 2 - b - 3 - c - 4 - d\n```\n\n## Limitations\n\nSubqueries in lambda expressions are currently not supported.\nFor example:\n\n```sql\nSELECT list_apply([1, 2, 3], lambda x: (SELECT 42) + x);\n```\n\n```console\nBinder Error:\nsubqueries in lambda expressions are not supported\n```\n","limit.md":`---
title: LIMIT and OFFSET Clauses
---

\`LIMIT\` is an output modifier. Logically it is applied at the very end of the query. The \`LIMIT\` clause restricts the amount of rows fetched. The \`OFFSET\` clause indicates at which position to start reading the values, i.e., the first \`OFFSET\` values are ignored.

Note that while \`LIMIT\` can be used without an \`ORDER BY\` clause, the results might not be deterministic without the \`ORDER BY\` clause. This can still be useful, however, for example when you want to inspect a quick snapshot of the data.

## Examples

Select the first 5 rows from the addresses table:

\`\`\`sql
SELECT *
FROM addresses
LIMIT 5;
\`\`\`

Select the 5 rows from the addresses table, starting at position 5 (i.e., ignoring the first 5 rows):

\`\`\`sql
SELECT *
FROM addresses
LIMIT 5
OFFSET 5;
\`\`\`

Select the top 5 cities with the highest population:

\`\`\`sql
SELECT city, count(*) AS population
FROM addresses
GROUP BY city
ORDER BY population DESC
LIMIT 5;
\`\`\`

Select 10% of the rows from the addresses table:

\`\`\`sql
SELECT *
FROM addresses
LIMIT 10%;
\`\`\`

## Syntax

<div id="rrdiagram"></div>
`,"list.md":'---\ntitle: List Functions\n---\n\n<!-- markdownlint-disable MD001 -->\n\n<!-- Start of section generated by scripts/generate_sql_function_docs.py; categories: [list] -->\n<!-- markdownlint-disable MD056 -->\n\n| Function | Description |\n|:--|:-------|\n| [`list[index]`](#listindex) | Extracts a single list element using a (1-based) `index`. |\n| [`list[begin[:end][:step]]`](#listbeginendstep) | Extracts a sublist using [slice conventions]({% link docs/stable/sql/functions/list.md %}#slicing). Negative values are accepted. |\n| [`list1 && list2`](#list_has_anylist1-list2) | Alias for `list_has_any`. |\n| [`list1 <-> list2`](#list_distancelist1-list2) | Alias for `list_distance`. |\n| [`list1 <=> list2`](#list_cosine_distancelist1-list2) | Alias for `list_cosine_distance`. |\n| [`list1 <@ list2`](#list_has_alllist1-list2) | Alias for `list_has_all`. |\n| [`list1 @> list2`](#list_has_alllist1-list2) | Alias for `list_has_all`. |\n| [`arg1 || arg2`](#arg1--arg2) | Concatenates two strings, lists, or blobs. Any `NULL` input results in `NULL`. See also [`concat(arg1, arg2, ...)`]({% link docs/stable/sql/functions/text.md %}#concatvalue-) and [`list_concat(list1, list2, ...)`]({% link docs/stable/sql/functions/list.md %}#list_concatlist_1--list_n). |\n| [`aggregate(list, function_name, ...)`](#list_aggregatelist-function_name-) | Alias for `list_aggregate`. |\n| [`apply(list, lambda(x))`](#list_transformlist-lambdax) | Alias for `list_transform`. |\n| [`array_aggr(list, function_name, ...)`](#list_aggregatelist-function_name-) | Alias for `list_aggregate`. |\n| [`array_aggregate(list, function_name, ...)`](#list_aggregatelist-function_name-) | Alias for `list_aggregate`. |\n| [`array_append(list, element)`](#list_appendlist-element) | Alias for `list_append`. |\n| [`array_apply(list, lambda(x))`](#list_transformlist-lambdax) | Alias for `list_transform`. |\n| [`array_cat(list_1, ..., list_n)`](#list_concatlist_1--list_n) | Alias for `list_concat`. |\n| [`array_concat(list_1, ..., list_n)`](#list_concatlist_1--list_n) | Alias for `list_concat`. |\n| [`array_contains(list, element)`](#list_containslist-element) | Alias for `list_contains`. |\n| [`array_distinct(list)`](#list_distinctlist) | Alias for `list_distinct`. |\n| [`array_extract(list, index)`](#array_extractlist-index) | Extracts the `index`th (1-based) value from the `list`. |\n| [`array_filter(list, lambda(x))`](#list_filterlist-lambdax) | Alias for `list_filter`. |\n| [`array_grade_up(list[, col1][, col2])`](#list_grade_uplist-col1-col2) | Alias for `list_grade_up`. |\n| [`array_has(list, element)`](#list_containslist-element) | Alias for `list_contains`. |\n| [`array_has_all(list1, list2)`](#list_has_alllist1-list2) | Alias for `list_has_all`. |\n| [`array_has_any(list1, list2)`](#list_has_anylist1-list2) | Alias for `list_has_any`. |\n| [`array_indexof(list, element)`](#list_positionlist-element) | Alias for `list_position`. |\n| [`array_intersect(list1, list2)`](#list_intersectlist1-list2) | Alias for `list_intersect`. |\n| [`array_length(list)`](#lengthlist) | Alias for `length`. |\n| [`array_pop_back(list)`](#array_pop_backlist) | Returns the `list` without the last element. |\n| [`array_pop_front(list)`](#array_pop_frontlist) | Returns the `list` without the first element. |\n| [`array_position(list, element)`](#list_positionlist-element) | Alias for `list_position`. |\n| [`array_prepend(element, list)`](#list_prependelement-list) | Alias for `list_prepend`. |\n| [`array_push_back(list, element)`](#list_appendlist-element) | Alias for `list_append`. |\n| [`array_push_front(list, element)`](#array_push_frontlist-element) | Prepends `element` to `list`. |\n| [`array_reduce(list, lambda(x,y)[, initial_value])`](#list_reducelist-lambdaxy-initial_value) | Alias for `list_reduce`. |\n| [`array_resize(list, size[[, value]])`](#list_resizelist-size-value) | Alias for `list_resize`. |\n| [`array_reverse(list)`](#list_reverselist) | Alias for `list_reverse`. |\n| [`array_reverse_sort(list[, col1])`](#list_reverse_sortlist-col1) | Alias for `list_reverse_sort`. |\n| [`array_select(value_list, index_list)`](#list_selectvalue_list-index_list) | Alias for `list_select`. |\n| [`array_slice(list, begin, end)`](#list_slicelist-begin-end) | Alias for `list_slice`. |\n| [`array_slice(list, begin, end, step)`](#list_slicelist-begin-end-step) | Alias for `list_slice`. |\n| [`array_sort(list[, col1][, col2])`](#list_sortlist-col1-col2) | Alias for `list_sort`. |\n| [`array_to_string(list, delimiter)`](#array_to_stringlist-delimiter) | Concatenates list/array elements using an optional `delimiter`. |\n| [`array_to_string_comma_default(array)`](#array_to_string_comma_defaultarray) | Concatenates list/array elements with a comma delimiter. |\n| [`array_transform(list, lambda(x))`](#list_transformlist-lambdax) | Alias for `list_transform`. |\n| [`array_unique(list)`](#list_uniquelist) | Alias for `list_unique`. |\n| [`array_where(value_list, mask_list)`](#list_wherevalue_list-mask_list) | Alias for `list_where`. |\n| [`array_zip(list_1, ..., list_n[, truncate])`](#list_ziplist_1--list_n-truncate) | Alias for `list_zip`. |\n| [`char_length(list)`](#lengthlist) | Alias for `length`. |\n| [`character_length(list)`](#lengthlist) | Alias for `length`. |\n| [`concat(value, ...)`](#concatvalue-) | Concatenates multiple strings or lists. `NULL` inputs are skipped. See also [operator `||`](#arg1--arg2). |\n| [`contains(list, element)`](#containslist-element) | Returns `true` if the `list` contains the `element`. |\n| [`filter(list, lambda(x))`](#list_filterlist-lambdax) | Alias for `list_filter`. |\n| [`flatten(nested_list)`](#flattennested_list) | [Flattens](#flattening) a nested list by one level. |\n| [`generate_series(start[, stop][, step])`](#generate_seriesstart-stop-step) | Creates a list of values between `start` and `stop` - the stop parameter is inclusive. |\n| [`grade_up(list[, col1][, col2])`](#list_grade_uplist-col1-col2) | Alias for `list_grade_up`. |\n| [`len(list)`](#lengthlist) | Alias for `length`. |\n| [`length(list)`](#lengthlist) | Returns the length of the `list`. |\n| [`list_aggr(list, function_name, ...)`](#list_aggregatelist-function_name-) | Alias for `list_aggregate`. |\n| [`list_aggregate(list, function_name, ...)`](#list_aggregatelist-function_name-) | Executes the aggregate function `function_name` on the elements of `list`. See the [List Aggregates](#list-aggregates) section for more details. |\n| [`list_any_value(list)`](#list_any_valuelist) | Applies aggregate function [`any_value`]({% link docs/stable/sql/functions/aggregates.md %}#general-aggregate-functions) to the `list`. |\n| [`list_append(list, element)`](#list_appendlist-element) | Appends `element` to `list`. |\n| [`list_apply(list, lambda(x))`](#list_transformlist-lambdax) | Alias for `list_transform`. |\n| [`list_approx_count_distinct(list)`](#list_approx_count_distinctlist) | Applies aggregate function [`approx_count_distinct`]({% link docs/stable/sql/functions/aggregates.md %}#general-aggregate-functions) to the `list`. |\n| [`list_avg(list)`](#list_avglist) | Applies aggregate function [`avg`]({% link docs/stable/sql/functions/aggregates.md %}#general-aggregate-functions) to the `list`. |\n| [`list_bit_and(list)`](#list_bit_andlist) | Applies aggregate function [`bit_and`]({% link docs/stable/sql/functions/aggregates.md %}#general-aggregate-functions) to the `list`. |\n| [`list_bit_or(list)`](#list_bit_orlist) | Applies aggregate function [`bit_or`]({% link docs/stable/sql/functions/aggregates.md %}#general-aggregate-functions) to the `list`. |\n| [`list_bit_xor(list)`](#list_bit_xorlist) | Applies aggregate function [`bit_xor`]({% link docs/stable/sql/functions/aggregates.md %}#general-aggregate-functions) to the `list`. |\n| [`list_bool_and(list)`](#list_bool_andlist) | Applies aggregate function [`bool_and`]({% link docs/stable/sql/functions/aggregates.md %}#general-aggregate-functions) to the `list`. |\n| [`list_bool_or(list)`](#list_bool_orlist) | Applies aggregate function [`bool_or`]({% link docs/stable/sql/functions/aggregates.md %}#general-aggregate-functions) to the `list`. |\n| [`list_cat(list_1, ..., list_n)`](#list_concatlist_1--list_n) | Alias for `list_concat`. |\n| [`list_concat(list_1, ..., list_n)`](#list_concatlist_1--list_n) | Concatenates lists. `NULL` inputs are skipped. See also [operator `||`](#arg1--arg2). |\n| [`list_contains(list, element)`](#list_containslist-element) | Returns true if the list contains the element. |\n| [`list_cosine_distance(list1, list2)`](#list_cosine_distancelist1-list2) | Computes the cosine distance between two same-sized lists. |\n| [`list_cosine_similarity(list1, list2)`](#list_cosine_similaritylist1-list2) | Computes the cosine similarity between two same-sized lists. |\n| [`list_count(list)`](#list_countlist) | Applies aggregate function [`count`]({% link docs/stable/sql/functions/aggregates.md %}#general-aggregate-functions) to the `list`. |\n| [`list_distance(list1, list2)`](#list_distancelist1-list2) | Calculates the Euclidean distance between two points with coordinates given in two inputs lists of equal length. |\n| [`list_distinct(list)`](#list_distinctlist) | Removes all duplicates and `NULL` values from a list. Does not preserve the original order. |\n| [`list_dot_product(list1, list2)`](#list_inner_productlist1-list2) | Alias for `list_inner_product`. |\n| [`list_element(list, index)`](#list_extractlist-index) | Alias for `list_extract`. |\n| [`list_entropy(list)`](#list_entropylist) | Applies aggregate function [`entropy`]({% link docs/stable/sql/functions/aggregates.md %}#general-aggregate-functions) to the `list`. |\n| [`list_extract(list, index)`](#list_extractlist-index) | Extract the `index`th (1-based) value from the list. |\n| [`list_filter(list, lambda(x))`](#list_filterlist-lambdax) | Constructs a list from those elements of the input `list` for which the `lambda` function returns `true`. DuckDB must be able to cast the `lambda` function\'s return type to `BOOL`. The return type of `list_filter` is the same as the input list\'s. See [`list_filter` examples]({% link docs/stable/sql/functions/lambda.md %}#list_filter-examples). |\n| [`list_first(list)`](#list_firstlist) | Applies aggregate function [`first`]({% link docs/stable/sql/functions/aggregates.md %}#general-aggregate-functions) to the `list`. |\n| [`list_grade_up(list[, col1][, col2])`](#list_grade_uplist-col1-col2) | Works like [`list_sort`](#list_sortlist-col1-col2), but the results are the indexes that correspond to the position in the original list instead of the actual values. |\n| [`list_has(list, element)`](#list_containslist-element) | Alias for `list_contains`. |\n| [`list_has_all(list1, list2)`](#list_has_alllist1-list2) | Returns true if all elements of list2 are in list1. NULLs are ignored. |\n| [`list_has_any(list1, list2)`](#list_has_anylist1-list2) | Returns true if the lists have any element in common. NULLs are ignored. |\n| [`list_histogram(list)`](#list_histogramlist) | Applies aggregate function [`histogram`]({% link docs/stable/sql/functions/aggregates.md %}#general-aggregate-functions) to the `list`. |\n| [`list_indexof(list, element)`](#list_positionlist-element) | Alias for `list_position`. |\n| [`list_inner_product(list1, list2)`](#list_inner_productlist1-list2) | Computes the inner product between two same-sized lists. |\n| [`list_intersect(list1, list2)`](#list_intersectlist1-list2) | Returns a list of all the elements that exist in both `list1` and `list2`, without duplicates. |\n| [`list_kurtosis(list)`](#list_kurtosislist) | Applies aggregate function [`kurtosis`]({% link docs/stable/sql/functions/aggregates.md %}#general-aggregate-functions) to the `list`. |\n| [`list_kurtosis_pop(list)`](#list_kurtosis_poplist) | Applies aggregate function [`kurtosis_pop`]({% link docs/stable/sql/functions/aggregates.md %}#general-aggregate-functions) to the `list`. |\n| [`list_last(list)`](#list_lastlist) | Applies aggregate function [`last`]({% link docs/stable/sql/functions/aggregates.md %}#general-aggregate-functions) to the `list`. |\n| [`list_mad(list)`](#list_madlist) | Applies aggregate function [`mad`]({% link docs/stable/sql/functions/aggregates.md %}#general-aggregate-functions) to the `list`. |\n| [`list_max(list)`](#list_maxlist) | Applies aggregate function [`max`]({% link docs/stable/sql/functions/aggregates.md %}#general-aggregate-functions) to the `list`. |\n| [`list_median(list)`](#list_medianlist) | Applies aggregate function [`median`]({% link docs/stable/sql/functions/aggregates.md %}#general-aggregate-functions) to the `list`. |\n| [`list_min(list)`](#list_minlist) | Applies aggregate function [`min`]({% link docs/stable/sql/functions/aggregates.md %}#general-aggregate-functions) to the `list`. |\n| [`list_mode(list)`](#list_modelist) | Applies aggregate function [`mode`]({% link docs/stable/sql/functions/aggregates.md %}#general-aggregate-functions) to the `list`. |\n| [`list_negative_dot_product(list1, list2)`](#list_negative_inner_productlist1-list2) | Alias for `list_negative_inner_product`. |\n| [`list_negative_inner_product(list1, list2)`](#list_negative_inner_productlist1-list2) | Computes the negative inner product between two same-sized lists. |\n| [`list_pack(arg, ...)`](#list_valuearg-) | Alias for `list_value`. |\n| [`list_position(list, element)`](#list_positionlist-element) | Returns the index of the `element` if the `list` contains the `element`. If the `element` is not found, it returns `NULL`. |\n| [`list_prepend(element, list)`](#list_prependelement-list) | Prepends `element` to `list`. |\n| [`list_product(list)`](#list_productlist) | Applies aggregate function [`product`]({% link docs/stable/sql/functions/aggregates.md %}#general-aggregate-functions) to the `list`. |\n| [`list_reduce(list, lambda(x,y)[, initial_value])`](#list_reducelist-lambdaxy-initial_value) | Reduces all elements of the input `list` into a single scalar value by executing the `lambda` function on a running result and the next list element. The `lambda` function has an optional `initial_value` argument. See [`list_reduce` examples]({% link docs/stable/sql/functions/lambda.md %}#list_reduce-examples). |\n| [`list_resize(list, size[[, value]])`](#list_resizelist-size-value) | Resizes the `list` to contain `size` elements. Initializes new elements with `value` or `NULL` if `value` is not set. |\n| [`list_reverse(list)`](#list_reverselist) | Reverses the `list`. |\n| [`list_reverse_sort(list[, col1])`](#list_reverse_sortlist-col1) | Sorts the elements of the list in reverse order. See the [Sorting Lists](#sorting-lists) section for more details about sorting order and `NULL` values. |\n| [`list_select(value_list, index_list)`](#list_selectvalue_list-index_list) | Returns a list based on the elements selected by the `index_list`. |\n| [`list_sem(list)`](#list_semlist) | Applies aggregate function [`sem`]({% link docs/stable/sql/functions/aggregates.md %}#general-aggregate-functions) to the `list`. |\n| [`list_skewness(list)`](#list_skewnesslist) | Applies aggregate function [`skewness`]({% link docs/stable/sql/functions/aggregates.md %}#general-aggregate-functions) to the `list`. |\n| [`list_slice(list, begin, end)`](#list_slicelist-begin-end) | Extracts a sublist or substring using [slice conventions]({% link docs/stable/sql/functions/list.md %}#slicing). Negative values are accepted. |\n| [`list_slice(list, begin, end, step)`](#list_slicelist-begin-end-step) | list_slice with added step feature. |\n| [`list_sort(list[, col1][, col2])`](#list_sortlist-col1-col2) | Sorts the elements of the list. See the [Sorting Lists](#sorting-lists) section for more details about sorting order and `NULL` values. |\n| [`list_stddev_pop(list)`](#list_stddev_poplist) | Applies aggregate function [`stddev_pop`]({% link docs/stable/sql/functions/aggregates.md %}#general-aggregate-functions) to the `list`. |\n| [`list_stddev_samp(list)`](#list_stddev_samplist) | Applies aggregate function [`stddev_samp`]({% link docs/stable/sql/functions/aggregates.md %}#general-aggregate-functions) to the `list`. |\n| [`list_string_agg(list)`](#list_string_agglist) | Applies aggregate function [`string_agg`]({% link docs/stable/sql/functions/aggregates.md %}#general-aggregate-functions) to the `list`. |\n| [`list_sum(list)`](#list_sumlist) | Applies aggregate function [`sum`]({% link docs/stable/sql/functions/aggregates.md %}#general-aggregate-functions) to the `list`. |\n| [`list_transform(list, lambda(x))`](#list_transformlist-lambdax) | Returns a list that is the result of applying the `lambda` function to each element of the input `list`. The return type is defined by the return type of the `lambda` function. See [`list_transform` examples]({% link docs/stable/sql/functions/lambda.md %}#list_transform-examples). |\n| [`list_unique(list)`](#list_uniquelist) | Counts the unique elements of a `list`. |\n| [`list_value(arg, ...)`](#list_valuearg-) | Creates a LIST containing the argument values. |\n| [`list_var_pop(list)`](#list_var_poplist) | Applies aggregate function [`var_pop`]({% link docs/stable/sql/functions/aggregates.md %}#general-aggregate-functions) to the `list`. |\n| [`list_var_samp(list)`](#list_var_samplist) | Applies aggregate function [`var_samp`]({% link docs/stable/sql/functions/aggregates.md %}#general-aggregate-functions) to the `list`. |\n| [`list_where(value_list, mask_list)`](#list_wherevalue_list-mask_list) | Returns a list with the `BOOLEAN`s in `mask_list` applied as a mask to the `value_list`. |\n| [`list_zip(list_1, ..., list_n[, truncate])`](#list_ziplist_1--list_n-truncate) | Zips n `LIST`s to a new `LIST` whose length will be that of the longest list. Its elements are structs of n elements from each list `list_1`, …, `list_n`, missing elements are replaced with `NULL`. If `truncate` is set, all lists are truncated to the smallest list length. |\n| [`range(start[, stop][, step])`](#rangestart-stop-step) | Creates a list of values between `start` and `stop` - the stop parameter is exclusive. |\n| [`reduce(list, lambda(x,y)[, initial_value])`](#list_reducelist-lambdaxy-initial_value) | Alias for `list_reduce`. |\n| [`repeat(list, count)`](#repeatlist-count) | Repeats the `list` `count` number of times. |\n| [`unnest(list)`](#unnestlist) | Unnests a list by one level. Note that this is a special function that alters the cardinality of the result. See the [unnest page]({% link docs/stable/sql/query_syntax/unnest.md %}) for more details. |\n| [`unpivot_list(arg, ...)`](#unpivot_listarg-) | Identical to list_value, but generated as part of unpivot for better error messages. |\n\n<!-- markdownlint-enable MD056 -->\n\n#### `list[index]`\n\n<div class="nostroke_table"></div>\n\n| **Description** | Extracts a single list element using a (1-based) `index`. |\n| **Example** | `[4, 5, 6][3]` |\n| **Result** | `6` |\n| **Alias** | `list_extract` |\n\n#### `list[begin[:end][:step]]`\n\n<div class="nostroke_table"></div>\n\n| **Description** | Extracts a sublist using [slice conventions]({% link docs/stable/sql/functions/list.md %}#slicing). Negative values are accepted. |\n| **Example** | `[4, 5, 6][3]` |\n| **Result** | `6` |\n| **Alias** | `list_slice` |\n\n#### `arg1 || arg2`\n\n<div class="nostroke_table"></div>\n\n| **Description** | Concatenates two strings, lists, or blobs. Any `NULL` input results in `NULL`. See also [`concat(arg1, arg2, ...)`]({% link docs/stable/sql/functions/text.md %}#concatvalue-) and [`list_concat(list1, list2, ...)`]({% link docs/stable/sql/functions/list.md %}#list_concatlist_1--list_n). |\n| **Example 1** | `\'Duck\' || \'DB\'` |\n| **Result** | `DuckDB` |\n| **Example 2** | `[1, 2, 3] || [4, 5, 6]` |\n| **Result** | `[1, 2, 3, 4, 5, 6]` |\n| **Example 3** | `\'\\xAA\'::BLOB || \'\\xBB\'::BLOB` |\n| **Result** | `\\xAA\\xBB` |\n\n#### `array_extract(list, index)`\n\n<div class="nostroke_table"></div>\n\n| **Description** | Extracts the `index`th (1-based) value from the `list`. |\n| **Example** | `array_extract([4, 5, 6], 3)` |\n| **Result** | `6` |\n\n#### `array_pop_back(list)`\n\n<div class="nostroke_table"></div>\n\n| **Description** | Returns the `list` without the last element. |\n| **Example** | `array_pop_back([4, 5, 6])` |\n| **Result** | `[4, 5]` |\n\n#### `array_pop_front(list)`\n\n<div class="nostroke_table"></div>\n\n| **Description** | Returns the `list` without the first element. |\n| **Example** | `array_pop_front([4, 5, 6])` |\n| **Result** | `[5, 6]` |\n\n#### `array_push_front(list, element)`\n\n<div class="nostroke_table"></div>\n\n| **Description** | Prepends `element` to `list`. |\n| **Example** | `array_push_front([4, 5, 6], 3)` |\n| **Result** | `[3, 4, 5, 6]` |\n\n#### `array_to_string(list, delimiter)`\n\n<div class="nostroke_table"></div>\n\n| **Description** | Concatenates list/array elements using an optional `delimiter`. |\n| **Example 1** | `array_to_string([1, 2, 3], \'-\')` |\n| **Result** | `1-2-3` |\n| **Example 2** | `array_to_string([\'aa\', \'bb\', \'cc\'], \'\')` |\n| **Result** | `aabbcc` |\n\n#### `array_to_string_comma_default(array)`\n\n<div class="nostroke_table"></div>\n\n| **Description** | Concatenates list/array elements with a comma delimiter. |\n| **Example** | `array_to_string_comma_default([\'Banana\', \'Apple\', \'Melon\'])` |\n| **Result** | `Banana,Apple,Melon` |\n\n#### `concat(value, ...)`\n\n<div class="nostroke_table"></div>\n\n| **Description** | Concatenates multiple strings or lists. `NULL` inputs are skipped. See also [operator `||`](#arg1--arg2). |\n| **Example 1** | `concat(\'Hello\', \' \', \'World\')` |\n| **Result** | `Hello World` |\n| **Example 2** | `concat([1, 2, 3], NULL, [4, 5, 6])` |\n| **Result** | `[1, 2, 3, 4, 5, 6]` |\n\n#### `contains(list, element)`\n\n<div class="nostroke_table"></div>\n\n| **Description** | Returns `true` if the `list` contains the `element`. |\n| **Example** | `contains([1, 2, NULL], 1)` |\n| **Result** | `true` |\n\n#### `flatten(nested_list)`\n\n<div class="nostroke_table"></div>\n\n| **Description** | [Flattens](#flattening) a nested list by one level. |\n| **Example** | `flatten([[1, 2, 3], [4, 5]])` |\n| **Result** | `[1, 2, 3, 4, 5]` |\n\n#### `generate_series(start[, stop][, step])`\n\n<div class="nostroke_table"></div>\n\n| **Description** | Creates a list of values between `start` and `stop` - the stop parameter is inclusive. |\n| **Example** | `generate_series(2, 5, 3)` |\n| **Result** | `[2, 5]` |\n\n#### `length(list)`\n\n<div class="nostroke_table"></div>\n\n| **Description** | Returns the length of the `list`. |\n| **Example** | `length([1,2,3])` |\n| **Result** | `3` |\n| **Aliases** | `char_length`, `character_length`, `len` |\n\n#### `list_aggregate(list, function_name, ...)`\n\n<div class="nostroke_table"></div>\n\n| **Description** | Executes the aggregate function `function_name` on the elements of `list`. See the [List Aggregates](#list-aggregates) section for more details. |\n| **Example** | `list_aggregate([1, 2, NULL], \'min\')` |\n| **Result** | `1` |\n| **Aliases** | `aggregate`, `array_aggr`, `array_aggregate`, `list_aggr` |\n\n#### `list_any_value(list)`\n\n<div class="nostroke_table"></div>\n\n| **Description** | Applies aggregate function [`any_value`]({% link docs/stable/sql/functions/aggregates.md %}#general-aggregate-functions) to the `list`. |\n| **Example** | `list_any_value([3,3,9])` |\n| **Result** | `3` |\n\n#### `list_append(list, element)`\n\n<div class="nostroke_table"></div>\n\n| **Description** | Appends `element` to `list`. |\n| **Example** | `list_append([2, 3], 4)` |\n| **Result** | `[2, 3, 4]` |\n| **Aliases** | `array_append`, `array_push_back` |\n\n#### `list_approx_count_distinct(list)`\n\n<div class="nostroke_table"></div>\n\n| **Description** | Applies aggregate function [`approx_count_distinct`]({% link docs/stable/sql/functions/aggregates.md %}#general-aggregate-functions) to the `list`. |\n| **Example** | `list_approx_count_distinct([3,3,9])` |\n| **Result** | `2` |\n\n#### `list_avg(list)`\n\n<div class="nostroke_table"></div>\n\n| **Description** | Applies aggregate function [`avg`]({% link docs/stable/sql/functions/aggregates.md %}#general-aggregate-functions) to the `list`. |\n| **Example** | `list_avg([3,3,9])` |\n| **Result** | `5.0` |\n\n#### `list_bit_and(list)`\n\n<div class="nostroke_table"></div>\n\n| **Description** | Applies aggregate function [`bit_and`]({% link docs/stable/sql/functions/aggregates.md %}#general-aggregate-functions) to the `list`. |\n| **Example** | `list_bit_and([3,3,9])` |\n| **Result** | `1` |\n\n#### `list_bit_or(list)`\n\n<div class="nostroke_table"></div>\n\n| **Description** | Applies aggregate function [`bit_or`]({% link docs/stable/sql/functions/aggregates.md %}#general-aggregate-functions) to the `list`. |\n| **Example** | `list_bit_or([3,3,9])` |\n| **Result** | `11` |\n\n#### `list_bit_xor(list)`\n\n<div class="nostroke_table"></div>\n\n| **Description** | Applies aggregate function [`bit_xor`]({% link docs/stable/sql/functions/aggregates.md %}#general-aggregate-functions) to the `list`. |\n| **Example** | `list_bit_xor([3,3,9])` |\n| **Result** | `9` |\n\n#### `list_bool_and(list)`\n\n<div class="nostroke_table"></div>\n\n| **Description** | Applies aggregate function [`bool_and`]({% link docs/stable/sql/functions/aggregates.md %}#general-aggregate-functions) to the `list`. |\n| **Example** | `list_bool_and([true, false])` |\n| **Result** | `false` |\n\n#### `list_bool_or(list)`\n\n<div class="nostroke_table"></div>\n\n| **Description** | Applies aggregate function [`bool_or`]({% link docs/stable/sql/functions/aggregates.md %}#general-aggregate-functions) to the `list`. |\n| **Example** | `list_bool_or([true, false])` |\n| **Result** | `true` |\n\n#### `list_concat(list_1, ..., list_n)`\n\n<div class="nostroke_table"></div>\n\n| **Description** | Concatenates lists. `NULL` inputs are skipped. See also [operator `||`](#arg1--arg2). |\n| **Example** | `list_concat([2, 3], [4, 5, 6], [7])` |\n| **Result** | `[2, 3, 4, 5, 6, 7]` |\n| **Aliases** | `list_cat`, `array_concat`, `array_cat` |\n\n#### `list_contains(list, element)`\n\n<div class="nostroke_table"></div>\n\n| **Description** | Returns true if the list contains the element. |\n| **Example** | `list_contains([1, 2, NULL], 1)` |\n| **Result** | `true` |\n| **Aliases** | `array_contains`, `array_has`, `list_has` |\n\n#### `list_cosine_distance(list1, list2)`\n\n<div class="nostroke_table"></div>\n\n| **Description** | Computes the cosine distance between two same-sized lists. |\n| **Example** | `list_cosine_distance([1, 2, 3], [1, 2, 3])` |\n| **Result** | `0.0` |\n| **Alias** | `<=>` |\n\n#### `list_cosine_similarity(list1, list2)`\n\n<div class="nostroke_table"></div>\n\n| **Description** | Computes the cosine similarity between two same-sized lists. |\n| **Example** | `list_cosine_similarity([1, 2, 3], [1, 2, 3])` |\n| **Result** | `1.0` |\n\n#### `list_count(list)`\n\n<div class="nostroke_table"></div>\n\n| **Description** | Applies aggregate function [`count`]({% link docs/stable/sql/functions/aggregates.md %}#general-aggregate-functions) to the `list`. |\n| **Example** | `list_count([3,3,9])` |\n| **Result** | `3` |\n\n#### `list_distance(list1, list2)`\n\n<div class="nostroke_table"></div>\n\n| **Description** | Calculates the Euclidean distance between two points with coordinates given in two inputs lists of equal length. |\n| **Example** | `list_distance([1, 2, 3], [1, 2, 5])` |\n| **Result** | `2.0` |\n| **Alias** | `<->` |\n\n#### `list_distinct(list)`\n\n<div class="nostroke_table"></div>\n\n| **Description** | Removes all duplicates and `NULL` values from a list. Does not preserve the original order. |\n| **Example** | `list_distinct([1, 1, NULL, -3, 1, 5])` |\n| **Result** | `[5, -3, 1]` |\n| **Alias** | `array_distinct` |\n\n#### `list_entropy(list)`\n\n<div class="nostroke_table"></div>\n\n| **Description** | Applies aggregate function [`entropy`]({% link docs/stable/sql/functions/aggregates.md %}#general-aggregate-functions) to the `list`. |\n| **Example** | `list_entropy([3,3,9])` |\n| **Result** | `0.9182958340544893` |\n\n#### `list_extract(list, index)`\n\n<div class="nostroke_table"></div>\n\n| **Description** | Extract the `index`th (1-based) value from the list. |\n| **Example** | `list_extract([4, 5, 6], 3)` |\n| **Result** | `6` |\n| **Alias** | `list_element` |\n\n#### `list_filter(list, lambda(x))`\n\n<div class="nostroke_table"></div>\n\n| **Description** | Constructs a list from those elements of the input `list` for which the `lambda` function returns `true`. DuckDB must be able to cast the `lambda` function\'s return type to `BOOL`. The return type of `list_filter` is the same as the input list\'s. See [`list_filter` examples]({% link docs/stable/sql/functions/lambda.md %}#list_filter-examples). |\n| **Example** | `list_filter([3, 4, 5], lambda x : x > 4)` |\n| **Result** | `[5]` |\n| **Aliases** | `array_filter`, `filter` |\n\n#### `list_first(list)`\n\n<div class="nostroke_table"></div>\n\n| **Description** | Applies aggregate function [`first`]({% link docs/stable/sql/functions/aggregates.md %}#general-aggregate-functions) to the `list`. |\n| **Example** | `list_first([3,3,9])` |\n| **Result** | `3` |\n\n#### `list_grade_up(list[, col1][, col2])`\n\n<div class="nostroke_table"></div>\n\n| **Description** | Works like [`list_sort`](#list_sortlist-col1-col2), but the results are the indexes that correspond to the position in the original list instead of the actual values. |\n| **Example** | `list_grade_up([3, 6, 1, 2])` |\n| **Result** | `[3, 4, 1, 2]` |\n| **Aliases** | `array_grade_up`, `grade_up` |\n\n#### `list_has_all(list1, list2)`\n\n<div class="nostroke_table"></div>\n\n| **Description** | Returns true if all elements of list2 are in list1. NULLs are ignored. |\n| **Example** | `list_has_all([1, 2, 3], [2, 3])` |\n| **Result** | `true` |\n| **Aliases** | `<@`, `@>`, `array_has_all` |\n\n#### `list_has_any(list1, list2)`\n\n<div class="nostroke_table"></div>\n\n| **Description** | Returns true if the lists have any element in common. NULLs are ignored. |\n| **Example** | `list_has_any([1, 2, 3], [2, 3, 4])` |\n| **Result** | `true` |\n| **Aliases** | `&&`, `array_has_any` |\n\n#### `list_histogram(list)`\n\n<div class="nostroke_table"></div>\n\n| **Description** | Applies aggregate function [`histogram`]({% link docs/stable/sql/functions/aggregates.md %}#general-aggregate-functions) to the `list`. |\n| **Example** | `list_histogram([3,3,9])` |\n| **Result** | `{3=2, 9=1}` |\n\n#### `list_inner_product(list1, list2)`\n\n<div class="nostroke_table"></div>\n\n| **Description** | Computes the inner product between two same-sized lists. |\n| **Example** | `list_inner_product([1, 2, 3], [1, 2, 3])` |\n| **Result** | `14.0` |\n| **Alias** | `list_dot_product` |\n\n#### `list_intersect(list1, list2)`\n\n<div class="nostroke_table"></div>\n\n| **Description** | Returns a list of all the elements that exist in both `list1` and `list2`, without duplicates. |\n| **Example** | `list_intersect([1, 2, 3], [2, 3, 4])` |\n| **Result** | `[3, 2]` |\n| **Alias** | `array_intersect` |\n\n#### `list_kurtosis(list)`\n\n<div class="nostroke_table"></div>\n\n| **Description** | Applies aggregate function [`kurtosis`]({% link docs/stable/sql/functions/aggregates.md %}#general-aggregate-functions) to the `list`. |\n| **Example** | `list_kurtosis([3,3,9])` |\n| **Result** | `NULL` |\n\n#### `list_kurtosis_pop(list)`\n\n<div class="nostroke_table"></div>\n\n| **Description** | Applies aggregate function [`kurtosis_pop`]({% link docs/stable/sql/functions/aggregates.md %}#general-aggregate-functions) to the `list`. |\n| **Example** | `list_kurtosis_pop([3,3,9])` |\n| **Result** | `-1.4999999999999978` |\n\n#### `list_last(list)`\n\n<div class="nostroke_table"></div>\n\n| **Description** | Applies aggregate function [`last`]({% link docs/stable/sql/functions/aggregates.md %}#general-aggregate-functions) to the `list`. |\n| **Example** | `list_last([3,3,9])` |\n| **Result** | `9` |\n\n#### `list_mad(list)`\n\n<div class="nostroke_table"></div>\n\n| **Description** | Applies aggregate function [`mad`]({% link docs/stable/sql/functions/aggregates.md %}#general-aggregate-functions) to the `list`. |\n| **Example** | `list_mad([3,3,9])` |\n| **Result** | `0.0` |\n\n#### `list_max(list)`\n\n<div class="nostroke_table"></div>\n\n| **Description** | Applies aggregate function [`max`]({% link docs/stable/sql/functions/aggregates.md %}#general-aggregate-functions) to the `list`. |\n| **Example** | `list_max([3,3,9])` |\n| **Result** | `9` |\n\n#### `list_median(list)`\n\n<div class="nostroke_table"></div>\n\n| **Description** | Applies aggregate function [`median`]({% link docs/stable/sql/functions/aggregates.md %}#general-aggregate-functions) to the `list`. |\n| **Example** | `list_median([3,3,9])` |\n| **Result** | `3.0` |\n\n#### `list_min(list)`\n\n<div class="nostroke_table"></div>\n\n| **Description** | Applies aggregate function [`min`]({% link docs/stable/sql/functions/aggregates.md %}#general-aggregate-functions) to the `list`. |\n| **Example** | `list_min([3,3,9])` |\n| **Result** | `3` |\n\n#### `list_mode(list)`\n\n<div class="nostroke_table"></div>\n\n| **Description** | Applies aggregate function [`mode`]({% link docs/stable/sql/functions/aggregates.md %}#general-aggregate-functions) to the `list`. |\n| **Example** | `list_mode([3,3,9])` |\n| **Result** | `3` |\n\n#### `list_negative_inner_product(list1, list2)`\n\n<div class="nostroke_table"></div>\n\n| **Description** | Computes the negative inner product between two same-sized lists. |\n| **Example** | `list_negative_inner_product([1, 2, 3], [1, 2, 3])` |\n| **Result** | `-14.0` |\n| **Alias** | `list_negative_dot_product` |\n\n#### `list_position(list, element)`\n\n<div class="nostroke_table"></div>\n\n| **Description** | Returns the index of the `element` if the `list` contains the `element`. If the `element` is not found, it returns `NULL`. |\n| **Example** | `list_position([1, 2, NULL], 2)` |\n| **Result** | `2` |\n| **Aliases** | `array_indexof`, `array_position`, `list_indexof` |\n\n#### `list_prepend(element, list)`\n\n<div class="nostroke_table"></div>\n\n| **Description** | Prepends `element` to `list`. |\n| **Example** | `list_prepend(3, [4, 5, 6])` |\n| **Result** | `[3, 4, 5, 6]` |\n| **Alias** | `array_prepend` |\n\n#### `list_product(list)`\n\n<div class="nostroke_table"></div>\n\n| **Description** | Applies aggregate function [`product`]({% link docs/stable/sql/functions/aggregates.md %}#general-aggregate-functions) to the `list`. |\n| **Example** | `list_product([3,3,9])` |\n| **Result** | `81.0` |\n\n#### `list_reduce(list, lambda(x,y)[, initial_value])`\n\n<div class="nostroke_table"></div>\n\n| **Description** | Reduces all elements of the input `list` into a single scalar value by executing the `lambda` function on a running result and the next list element. The `lambda` function has an optional `initial_value` argument. See [`list_reduce` examples]({% link docs/stable/sql/functions/lambda.md %}#list_reduce-examples). |\n| **Example** | `list_reduce([1, 2, 3], lambda x, y : x + y)` |\n| **Result** | `6` |\n| **Aliases** | `array_reduce`, `reduce` |\n\n#### `list_resize(list, size[[, value]])`\n\n<div class="nostroke_table"></div>\n\n| **Description** | Resizes the `list` to contain `size` elements. Initializes new elements with `value` or `NULL` if `value` is not set. |\n| **Example** | `list_resize([1, 2, 3], 5, 0)` |\n| **Result** | `[1, 2, 3, 0, 0]` |\n| **Alias** | `array_resize` |\n\n#### `list_reverse(list)`\n\n<div class="nostroke_table"></div>\n\n| **Description** | Reverses the `list`. |\n| **Example** | `list_reverse([3, 6, 1, 2])` |\n| **Result** | `[2, 1, 6, 3]` |\n| **Alias** | `array_reverse` |\n\n#### `list_reverse_sort(list[, col1])`\n\n<div class="nostroke_table"></div>\n\n| **Description** | Sorts the elements of the list in reverse order. See the [Sorting Lists](#sorting-lists) section for more details about sorting order and `NULL` values. |\n| **Example** | `list_reverse_sort([3, 6, 1, 2])` |\n| **Result** | `[6, 3, 2, 1]` |\n| **Alias** | `array_reverse_sort` |\n\n#### `list_select(value_list, index_list)`\n\n<div class="nostroke_table"></div>\n\n| **Description** | Returns a list based on the elements selected by the `index_list`. |\n| **Example** | `list_select([10, 20, 30, 40], [1, 4])` |\n| **Result** | `[10, 40]` |\n| **Alias** | `array_select` |\n\n#### `list_sem(list)`\n\n<div class="nostroke_table"></div>\n\n| **Description** | Applies aggregate function [`sem`]({% link docs/stable/sql/functions/aggregates.md %}#general-aggregate-functions) to the `list`. |\n| **Example** | `list_sem([3,3,9])` |\n| **Result** | `1.6329931618554523` |\n\n#### `list_skewness(list)`\n\n<div class="nostroke_table"></div>\n\n| **Description** | Applies aggregate function [`skewness`]({% link docs/stable/sql/functions/aggregates.md %}#general-aggregate-functions) to the `list`. |\n| **Example** | `list_skewness([3,3,9])` |\n| **Result** | `1.7320508075688796` |\n\n#### `list_slice(list, begin, end)`\n\n<div class="nostroke_table"></div>\n\n| **Description** | Extracts a sublist or substring using [slice conventions]({% link docs/stable/sql/functions/list.md %}#slicing). Negative values are accepted. |\n| **Example** | `list_slice([4, 5, 6], 2, 3)` |\n| **Result** | `[5, 6]` |\n| **Alias** | `array_slice` |\n\n#### `list_slice(list, begin, end, step)`\n\n<div class="nostroke_table"></div>\n\n| **Description** | list_slice with added step feature. |\n| **Example** | `list_slice([4, 5, 6], 1, 3, 2)` |\n| **Result** | `[4, 6]` |\n| **Alias** | `array_slice` |\n\n#### `list_sort(list[, col1][, col2])`\n\n<div class="nostroke_table"></div>\n\n| **Description** | Sorts the elements of the list. See the [Sorting Lists](#sorting-lists) section for more details about sorting order and `NULL` values. |\n| **Example** | `list_sort([3, 6, 1, 2])` |\n| **Result** | `[1, 2, 3, 6]` |\n| **Alias** | `array_sort` |\n\n#### `list_stddev_pop(list)`\n\n<div class="nostroke_table"></div>\n\n| **Description** | Applies aggregate function [`stddev_pop`]({% link docs/stable/sql/functions/aggregates.md %}#general-aggregate-functions) to the `list`. |\n| **Example** | `list_stddev_pop([3,3,9])` |\n| **Result** | `2.8284271247461903` |\n\n#### `list_stddev_samp(list)`\n\n<div class="nostroke_table"></div>\n\n| **Description** | Applies aggregate function [`stddev_samp`]({% link docs/stable/sql/functions/aggregates.md %}#general-aggregate-functions) to the `list`. |\n| **Example** | `list_stddev_samp([3,3,9])` |\n| **Result** | `3.4641016151377544` |\n\n#### `list_string_agg(list)`\n\n<div class="nostroke_table"></div>\n\n| **Description** | Applies aggregate function [`string_agg`]({% link docs/stable/sql/functions/aggregates.md %}#general-aggregate-functions) to the `list`. |\n| **Example** | `list_string_agg([3,3,9])` |\n| **Result** | `3,3,9` |\n\n#### `list_sum(list)`\n\n<div class="nostroke_table"></div>\n\n| **Description** | Applies aggregate function [`sum`]({% link docs/stable/sql/functions/aggregates.md %}#general-aggregate-functions) to the `list`. |\n| **Example** | `list_sum([3,3,9])` |\n| **Result** | `15` |\n\n#### `list_transform(list, lambda(x))`\n\n<div class="nostroke_table"></div>\n\n| **Description** | Returns a list that is the result of applying the `lambda` function to each element of the input `list`. The return type is defined by the return type of the `lambda` function. See [`list_transform` examples]({% link docs/stable/sql/functions/lambda.md %}#list_transform-examples). |\n| **Example** | `list_transform([1, 2, 3], lambda x : x + 1)` |\n| **Result** | `[2, 3, 4]` |\n| **Aliases** | `apply`, `array_apply`, `array_transform`, `list_apply` |\n\n#### `list_unique(list)`\n\n<div class="nostroke_table"></div>\n\n| **Description** | Counts the unique elements of a `list`. |\n| **Example** | `list_unique([1, 1, NULL, -3, 1, 5])` |\n| **Result** | `3` |\n| **Alias** | `array_unique` |\n\n#### `list_value(arg, ...)`\n\n<div class="nostroke_table"></div>\n\n| **Description** | Creates a LIST containing the argument values. |\n| **Example** | `list_value(4, 5, 6)` |\n| **Result** | `[4, 5, 6]` |\n| **Alias** | `list_pack` |\n\n#### `list_var_pop(list)`\n\n<div class="nostroke_table"></div>\n\n| **Description** | Applies aggregate function [`var_pop`]({% link docs/stable/sql/functions/aggregates.md %}#general-aggregate-functions) to the `list`. |\n| **Example** | `list_var_pop([3,3,9])` |\n| **Result** | `8.0` |\n\n#### `list_var_samp(list)`\n\n<div class="nostroke_table"></div>\n\n| **Description** | Applies aggregate function [`var_samp`]({% link docs/stable/sql/functions/aggregates.md %}#general-aggregate-functions) to the `list`. |\n| **Example** | `list_var_samp([3,3,9])` |\n| **Result** | `12.0` |\n\n#### `list_where(value_list, mask_list)`\n\n<div class="nostroke_table"></div>\n\n| **Description** | Returns a list with the `BOOLEAN`s in `mask_list` applied as a mask to the `value_list`. |\n| **Example** | `list_where([10, 20, 30, 40], [true, false, false, true])` |\n| **Result** | `[10, 40]` |\n| **Alias** | `array_where` |\n\n#### `list_zip(list_1, ..., list_n[, truncate])`\n\n<div class="nostroke_table"></div>\n\n| **Description** | Zips n `LIST`s to a new `LIST` whose length will be that of the longest list. Its elements are structs of n elements from each list `list_1`, …, `list_n`, missing elements are replaced with `NULL`. If `truncate` is set, all lists are truncated to the smallest list length. |\n| **Example 1** | `list_zip([1, 2], [3, 4], [5, 6])` |\n| **Result** | `[(1, 3, 5), (2, 4, 6)]` |\n| **Example 2** | `list_zip([1, 2], [3, 4], [5, 6, 7])` |\n| **Result** | `[(1, 3, 5), (2, 4, 6), (NULL, NULL, 7)]` |\n| **Example 3** | `list_zip([1, 2], [3, 4], [5, 6, 7], true)` |\n| **Result** | `[(1, 3, 5), (2, 4, 6)]` |\n| **Alias** | `array_zip` |\n\n#### `range(start[, stop][, step])`\n\n<div class="nostroke_table"></div>\n\n| **Description** | Creates a list of values between `start` and `stop` - the stop parameter is exclusive. |\n| **Example** | `range(2, 5, 3)` |\n| **Result** | `[2]` |\n\n#### `repeat(list, count)`\n\n<div class="nostroke_table"></div>\n\n| **Description** | Repeats the `list` `count` number of times. |\n| **Example** | `repeat([1, 2, 3], 5)` |\n| **Result** | `[1, 2, 3, 1, 2, 3, 1, 2, 3, 1, 2, 3, 1, 2, 3]` |\n\n#### `unnest(list)`\n\n<div class="nostroke_table"></div>\n\n| **Description** | Unnests a list by one level. Note that this is a special function that alters the cardinality of the result. See the [unnest page]({% link docs/stable/sql/query_syntax/unnest.md %}) for more details. |\n| **Example** | `unnest([1, 2, 3])` |\n| **Result** | Multiple rows: `\'1\'`, `\'2\'`, `\'3\'` |\n\n#### `unpivot_list(arg, ...)`\n\n<div class="nostroke_table"></div>\n\n| **Description** | Identical to list_value, but generated as part of unpivot for better error messages. |\n| **Example** | `unpivot_list(4, 5, 6)` |\n| **Result** | `[4, 5, 6]` |\n\n<!-- End of section generated by scripts/generate_sql_function_docs.py -->\n\n\n## List Operators\n\nThe following operators are supported for lists:\n\n<!-- markdownlint-disable MD056 -->\n\n| Operator | Description | Example | Result |\n|-|--|---|-|\n| `&&`  | Alias for [`list_has_any`](#list_has_anylist1-list2).                                                                   | `[1, 2, 3, 4, 5] && [2, 5, 5, 6]` | `true`               |\n| `@>`  | Alias for [`list_has_all`](#list_has_alllist1-list2), where the list on the **right** of the operator is the sublist. | `[1, 2, 3, 4] @> [3, 4, 3]`       | `true`               |\n| `<@`  | Alias for [`list_has_all`](#list_has_alllist1-list2), where the list on the **left** of the operator is the sublist.  | `[1, 4] <@ [1, 2, 3, 4]`          | `true`               |\n| `||`  | Similar to [`list_concat`](#list_concatlist_1--list_n), except any `NULL` input results in `NULL`.                        | `[1, 2, 3] || [4, 5, 6]`          | `[1, 2, 3, 4, 5, 6]` |\n| `<=>` | Alias for [`list_cosine_distance`](#list_cosine_distancelist1-list2).                                                   | `[1, 2, 3] <=> [1, 2, 5]`         | `0.007416606`        |\n| `<->` | Alias for [`list_distance`](#list_distancelist1-list2).                                                                 | `[1, 2, 3] <-> [1, 2, 5]`         | `2.0`                |\n\n<!-- markdownlint-enable MD056 -->\n\n## List Comprehension\n\nPython-style list comprehension can be used to compute expressions over elements in a list. For example:\n\n```sql\nSELECT [lower(x) FOR x IN strings] AS strings\nFROM (VALUES ([\'Hello\', \'\', \'World\'])) t(strings);\n```\n\n<div class="monospace_table"></div>\n\n|     strings      |\n|------------------|\n| [hello, , world] |\n\n```sql\nSELECT [upper(x) FOR x IN strings IF len(x) > 0] AS strings\nFROM (VALUES ([\'Hello\', \'\', \'World\'])) t(strings);\n```\n\n<div class="monospace_table"></div>\n\n|    strings     |\n|----------------|\n| [HELLO, WORLD] |\n\nList comprehensions can also use the position of the list elements by adding a second variable.\nIn the following example, we use `x, i`, where `x` is the value and `i` is the position:\n\n```sql\nSELECT [4, 5, 6] AS l, [x FOR x, i IN l IF i != 2] AS filtered;\n```\n\n<div class="monospace_table"></div>\n\n|     l     | filtered |\n|-----------|----------|\n| [4, 5, 6] | [4, 6]   |\n\nUnder the hood, `[f(x) FOR x IN l IF g(x)]` is translated to:\n\n```sql\nl.list_apply(lambda x, i: {\'filter\': g(x, i), \'result\': f(x, i)})\n    .list_filter(lambda x: x.filter)\n    .list_apply(lambda x: x.result)\n```\n\n## Range Functions\n\nDuckDB offers two range functions, [`range(start, stop, step)`](#range) and [`generate_series(start, stop, step)`](#generate_series), and their variants with default arguments for `stop` and `step`. The two functions\' behavior is different regarding their `stop` argument. This is documented below.\n\n### `range`\n\nThe `range` function creates a list of values in the range between `start` and `stop`.\nThe `start` parameter is inclusive, while the `stop` parameter is exclusive.\nThe default value of `start` is 0 and the default value of `step` is 1.\n\nBased on the number of arguments, the following variants of `range` exist.\n\n#### `range(stop)`\n\n```sql\nSELECT range(5);\n```\n\n```text\n[0, 1, 2, 3, 4]\n```\n\n#### `range(start, stop)`\n\n```sql\nSELECT range(2, 5);\n```\n\n```text\n[2, 3, 4]\n```\n\n#### `range(start, stop, step)`\n\n```sql\nSELECT range(2, 5, 3);\n```\n\n```text\n[2]\n```\n\n### `generate_series`\n\nThe `generate_series` function creates a list of values in the range between `start` and `stop`.\nBoth the `start` and the `stop` parameters are inclusive.\nThe default value of `start` is 0 and the default value of `step` is 1.\nBased on the number of arguments, the following variants of `generate_series` exist.\n\n#### `generate_series(stop)`\n\n```sql\nSELECT generate_series(5);\n```\n\n```text\n[0, 1, 2, 3, 4, 5]\n```\n\n#### `generate_series(start, stop)`\n\n```sql\nSELECT generate_series(2, 5);\n```\n\n```text\n[2, 3, 4, 5]\n```\n\n#### `generate_series(start, stop, step)`\n\n```sql\nSELECT generate_series(2, 5, 3);\n```\n\n```text\n[2, 5]\n```\n\n#### `generate_subscripts(arr, dim)`\n\nThe `generate_subscripts(arr, dim)` function generates indexes along the `dim`th dimension of array `arr`.\n\n```sql\nSELECT generate_subscripts([4, 5, 6], 1) AS i;\n```\n\n| i |\n|--:|\n| 1 |\n| 2 |\n| 3 |\n\n### Date Ranges\n\nDate ranges are also supported for `TIMESTAMP` and `TIMESTAMP WITH TIME ZONE` values.\nNote that for these types, the `stop` and `step` arguments have to be specified explicitly (a default value is not provided).\n\n#### `range` for Date Ranges\n\n```sql\nSELECT *\nFROM range(DATE \'1992-01-01\', DATE \'1992-03-01\', INTERVAL \'1\' MONTH);\n```\n\n|        range        |\n|---------------------|\n| 1992-01-01 00:00:00 |\n| 1992-02-01 00:00:00 |\n\n#### `generate_series` for Date Ranges\n\n```sql\nSELECT *\nFROM generate_series(DATE \'1992-01-01\', DATE \'1992-03-01\', INTERVAL \'1\' MONTH);\n```\n\n|   generate_series   |\n|---------------------|\n| 1992-01-01 00:00:00 |\n| 1992-02-01 00:00:00 |\n| 1992-03-01 00:00:00 |\n\n## Slicing\n\nThe function [`list_slice`](#list_slicelist-begin-end) can be used to extract a sublist from a list. The following variants exist:\n\n* `list_slice(list, begin, end)`\n* `list_slice(list, begin, end, step)`\n* `array_slice(list, begin, end)`\n* `array_slice(list, begin, end, step)`\n* `list[begin:end]`\n* `list[begin:end:step]`\n\nThe arguments are as follows:\n\n* `list`\n    * Is the list to be sliced\n* `begin`\n    * Is the index of the first element to be included in the slice\n    * When `begin < 0` the index is counted from the end of the list\n    * When `begin < 0` and `-begin > length`, `begin` is clamped to the beginning of the list\n    * When `begin > length`, the result is an empty list\n    * **Bracket Notation:** When `begin` is omitted, it defaults to the beginning of the list\n* `end`\n    * Is the index of the last element to be included in the slice\n    * When `end < 0` the index is counted from the end of the list\n    * When `end > length`, end is clamped to `length`\n    * When `end < begin`, the result is an empty list\n    * **Bracket Notation:** When `end` is omitted, it defaults to the end of the list. When `end` is omitted and a `step` is provided, `end` must be replaced with a `-`\n* `step` *(optional)*\n    * Is the step size between elements in the slice\n    * When `step < 0` the slice is reversed, and `begin` and `end` are swapped\n    * Must be non-zero\n\nExamples:\n\n```sql\nSELECT list_slice([1, 2, 3, 4, 5], 2, 4);\n```\n\n```text\n[2, 3, 4]\n```\n\n```sql\nSELECT ([1, 2, 3, 4, 5])[2:4:2];\n```\n\n```text\n[2, 4]\n```\n\n```sql\nSELECT([1, 2, 3, 4, 5])[4:2:-2];\n```\n\n```text\n[4, 2]\n```\n\n```sql\nSELECT ([1, 2, 3, 4, 5])[:];\n```\n\n```text\n[1, 2, 3, 4, 5]\n```\n\n```sql\nSELECT ([1, 2, 3, 4, 5])[:-:2];\n```\n\n```text\n[1, 3, 5]\n```\n\n```sql\nSELECT ([1, 2, 3, 4, 5])[:-:-2];\n```\n\n```text\n[5, 3, 1]\n```\n\n## List Aggregates\n\nThe function [`list_aggregate`](#list_aggregatelist-function_name-) allows the execution of arbitrary existing aggregate functions on the elements of a list. Its first argument is the list (column), its second argument is the aggregate function name, e.g., `min`, `histogram` or `sum`.\n\n`list_aggregate` accepts additional arguments after the aggregate function name. These extra arguments are passed directly to the aggregate function, which serves as the second argument of `list_aggregate`.\n\nOrder-sensitive aggregate functions are applied in the order of the list. The `ORDER BY`, `DISTINCT` and `FILTER` clauses are not supported by `list_aggregate`.\nThey may instead be emulated using `list_sort`, `list_grade_up`, `list_select`, `list_distinct` and `list_filter`.\n\n```sql\nSELECT list_aggregate([1, 2, -4, NULL], \'min\');\n```\n\n```text\n-4\n```\n\n```sql\nSELECT list_aggregate([2, 4, 8, 42], \'sum\');\n```\n\n```text\n56\n```\n\n```sql\nSELECT list_aggregate([[1, 2], [NULL], [2, 10, 3]], \'last\');\n```\n\n```text\n[2, 10, 3]\n```\n\n```sql\nSELECT list_aggregate([2, 4, 8, 42], \'string_agg\', \'|\');\n```\n\n```text\n2|4|8|42\n```\n\n### `list_*` Rewrite Functions\n\nThe following is a list of existing rewrites. Rewrites simplify the use of the list aggregate function by only taking the list (column) as their argument. `list_avg`, `list_var_samp`, `list_var_pop`, `list_stddev_pop`, `list_stddev_samp`, `list_sem`, `list_approx_count_distinct`, `list_bit_xor`, `list_bit_or`, `list_bit_and`, `list_bool_and`, `list_bool_or`, `list_count`, `list_entropy`, `list_last`, `list_first`, `list_kurtosis`, `list_kurtosis_pop`, `list_min`, `list_max`, `list_product`, `list_skewness`, `list_sum`, `list_string_agg`, `list_mode`, `list_median`, `list_mad` and `list_histogram`.\n\n```sql\nSELECT list_min([1, 2, -4, NULL]);\n```\n\n```text\n-4\n```\n\n```sql\nSELECT list_sum([2, 4, 8, 42]);\n```\n\n```text\n56\n```\n\n```sql\nSELECT list_last([[1, 2], [NULL], [2, 10, 3]]);\n```\n\n```text\n[2, 10, 3]\n```\n\n#### `array_to_string`\n\nConcatenates list/array elements using an optional delimiter.\n\n```sql\nSELECT array_to_string([1, 2, 3], \'-\') AS str;\n```\n\n```text\n1-2-3\n```\n\nThis is equivalent to the following SQL:\n\n```sql\nSELECT list_aggr([1, 2, 3], \'string_agg\', \'-\') AS str;\n```\n\n```text\n1-2-3\n```\n\n## Sorting Lists\n\nThe function `list_sort` sorts the elements of a list either in ascending or descending order.\nIn addition, it allows specifying whether `NULL` values should be moved to the beginning or to the end of the list.\nIt has the same sorting behavior as DuckDB\'s `ORDER BY` clause.\nTherefore, (nested) values compare the same in `list_sort` as in `ORDER BY`.\n\nBy default, if no modifiers are provided, DuckDB sorts `ASC NULLS FIRST`.\nI.e., the values are sorted in ascending order and `NULL` values are placed first.\nThis is identical to the default sort order of SQLite.\nThe default sort order can be changed using [`PRAGMA` statements.](../query_syntax/orderby).\n\n`list_sort` leaves it open to the user whether they want to use the default sort order or a custom order.\n`list_sort` takes up to two additional optional parameters.\nThe second parameter provides the sort order and can be either `ASC` or `DESC`.\nThe third parameter provides the `NULL` order and can be either `NULLS FIRST` or `NULLS LAST`.\n\nThis query uses the default sort order and the default `NULL` order.\n\n```sql\nSELECT list_sort([1, 3, NULL, 5, NULL, -5]);\n```\n\n```sql\n[NULL, NULL, -5, 1, 3, 5]\n```\n\nThis query provides the sort order.\nThe `NULL` order uses the configurable default value.\n\n```sql\nSELECT list_sort([1, 3, NULL, 2], \'ASC\');\n```\n\n```sql\n[NULL, 1, 2, 3]\n```\n\nThis query provides both the sort order and the `NULL` order.\n\n```sql\nSELECT list_sort([1, 3, NULL, 2], \'DESC\', \'NULLS FIRST\');\n```\n\n```sql\n[NULL, 3, 2, 1]\n```\n\n`list_reverse_sort` has an optional second parameter providing the `NULL` sort order.\nIt can be either `NULLS FIRST` or `NULLS LAST`.\n\nThis query uses the default `NULL` sort order.\n\n```sql\nSELECT list_sort([1, 3, NULL, 5, NULL, -5]);\n```\n\n```sql\n[NULL, NULL, -5, 1, 3, 5]\n```\n\nThis query provides the `NULL` sort order.\n\n```sql\nSELECT list_reverse_sort([1, 3, NULL, 2], \'NULLS LAST\');\n```\n\n```sql\n[3, 2, 1, NULL]\n```\n\n## Flattening\n\nThe flatten function is a scalar function that converts a list of lists into a single list by concatenating each sub-list together.\nNote that this only flattens one level at a time, not all levels of sub-lists.\n\nConvert a list of lists into a single list:\n\n```sql\nSELECT\n    flatten([\n        [1, 2],\n        [3, 4]\n    ]);\n```\n\n```text\n[1, 2, 3, 4]\n```\n\nIf the list has multiple levels of lists, only the first level of sub-lists is concatenated into a single list:\n\n```sql\nSELECT\n    flatten([\n        [\n            [1, 2],\n            [3, 4],\n        ],\n        [\n            [5, 6],\n            [7, 8],\n        ]\n    ]);\n```\n\n```text\n[[1, 2], [3, 4], [5, 6], [7, 8]]\n```\n\nIn general, the input to the flatten function should be a list of lists (not a single level list).\nHowever, the behavior of the flatten function has specific behavior when handling empty lists and `NULL` values.\n\nIf the input list is empty, return an empty list:\n\n```sql\nSELECT flatten([]);\n```\n\n```text\n[]\n```\n\nIf the entire input to flatten is `NULL`, return `NULL`:\n\n```sql\nSELECT flatten(NULL);\n```\n\n```text\nNULL\n```\n\nIf a list whose only entry is `NULL` is flattened, return an empty list:\n\n```sql\nSELECT flatten([NULL]);\n```\n\n```text\n[]\n```\n\nIf the sub-list in a list of lists only contains `NULL`, do not modify the sub-list:\n\n```sql\n-- (Note the extra set of parentheses vs. the prior example)\nSELECT flatten([[NULL]]);\n```\n\n```text\n[NULL]\n```\n\nEven if the only contents of each sub-list is `NULL`, still concatenate them together. Note that no de-duplication occurs when flattening. See `list_distinct` function for de-duplication:\n\n```sql\nSELECT flatten([[NULL], [NULL]]);\n```\n\n```text\n[NULL, NULL]\n```\n\n## Lambda Functions\n\nDuckDB supports lambda functions in the form `lambda parameter1, parameter2, ...:  expression`.\nFor details, see the [lambda functions page]({% link docs/stable/sql/functions/lambda.md %}).\n\n## Related Functions\n\n* The [aggregate functions]({% link docs/stable/sql/functions/aggregates.md %}) `list` and `histogram` produce lists and lists of structs.\n* The [`unnest` function]({% link docs/stable/sql/query_syntax/unnest.md %}) is used to unnest a list by one level.\n',"logical_operators.md":'---\ntitle: Logical Operators\n---\n\n<div id="rrdiagram"></div>\n\nThe following logical operators are available: `AND`, `OR` and `NOT`. SQL uses a three-valued logic system with `true`, `false` and `NULL`. Note that logical operators involving `NULL` do not always evaluate to `NULL`. For example, `NULL AND false` will evaluate to `false`, and `NULL OR true` will evaluate to `true`. Below are the complete truth tables.\n\n## Binary Operators: `AND` and `OR`\n\n<div class="monospace_table"></div>\n\n| `a` | `b` | `a AND b` | `a OR b` |\n|:---|:---|:---|:---|\n| true | true | true | true |\n| true | false | false | true |\n| true | NULL | NULL | true |\n| false | false | false | false |\n| false | NULL | false | NULL |\n| NULL | NULL | NULL | NULL|\n\n## Unary Operator: `NOT`\n\n<div class="monospace_table"></div>\n\n| `a` | `NOT a` |\n|:---|:---|\n| true | false |\n| false | true |\n| NULL | NULL |\n\nThe operators `AND` and `OR` are commutative, that is, you can switch the left and right operand without affecting the result.\n',"map.md":`---
title: Map Functions
---

<!-- markdownlint-disable MD001 -->

| Name | Description |
|:--|:-------|
| [\`cardinality(map)\`](#cardinalitymap) | Return the size of the map (or the number of entries in the map). |
| [\`element_at(map, key)\`](#element_atmap-key) | Return the value for a given \`key\` as a list, or an empty list if the key is not contained in the map. The type of the key provided in the second parameter must match the type of the map's keys; else, an error is thrown. |
| [\`map_concat(maps...)\`](#map_concatmaps) | Returns a map created from merging the input \`maps\`. On key collision the value is taken from the last map with that key. |
| [\`map_contains(map, key)\`](#map_containsmap-key) | Checks if a map contains a given key. |
| [\`map_contains_entry(map, key, value)\`](#map_contains_entrymap-key-value) | Check if a map contains a given key-value pair. |
| [\`map_contains_value(map, value)\`](#map_contains_valuemap-value) | Checks if a map contains a given value. |
| [\`map_entries(map)\`](#map_entriesmap) | Return a list of struct(k, v) for each key-value pair in the map. |
| [\`map_extract(map, key)\`](#map_extractmap-key) | Return the value for a given \`key\` as a list, or an empty list if the key is not contained in the map. The type of the key provided in the second parameter must match the type of the map's keys; else, an error is thrown. |
| [\`map_extract_value(map, key)\`](#map_extract_valuemap-key) | Returns the value for a given \`key\` or \`NULL\` if the \`key\` is not contained in the map. The type of the key provided in the second parameter must match the type of the map's keys; else, an error is thrown. |
| [\`map_from_entries(STRUCT(k, v)[])\`](#map_from_entriesstructk-v) | Returns a map created from the entries of the array. |
| [\`map_keys(map)\`](#map_keysmap) | Return a list of all keys in the map. |
| [\`map_values(map)\`](#map_valuesmap) | Return a list of all values in the map. |
| [\`map()\`](#map) | Returns an empty map. |
| [\`map[entry]\`](#mapentry) | Returns the value for a given \`key\` or \`NULL\` if the \`key\` is not contained in the map. The type of the key provided in the second parameter must match the type of the map's keys; else, an error is thrown. |

#### \`cardinality(map)\`

<div class="nostroke_table"></div>

| **Description** | Return the size of the map (or the number of entries in the map). |
| **Example** | \`cardinality(map([4, 2], ['a', 'b']))\` |
| **Result** | \`2\` |

#### \`element_at(map, key)\`

<div class="nostroke_table"></div>

| **Description** | Return the value for a given \`key\` as a list, or an empty list if the key is not contained in the map. The type of the key provided in the second parameter must match the type of the map's keys; else, an error is thrown. |
| **Example** | \`element_at(map([100, 5], [42, 43]), 100)\` |
| **Result** | \`[42]\` |
| **Aliases** | \`map_extract(map, key)\` |

#### \`map_concat(maps...)\`

<div class="nostroke_table"></div>

| **Description** | Returns a map created from merging the input \`maps\`. On key collision the value is taken from the last map with that key. |
| **Example** | \`map_concat(MAP {'key1': 10, 'key2': 20}, MAP {'key3': 30}, MAP {'key2': 5})\` |
| **Result** | \`{key1=10, key2=5, key3=30}\` |

#### \`map_contains(map, key)\`

<div class="nostroke_table"></div>

| **Description** | Checks if a map contains a given key. |
| **Example** | \`map_contains(MAP {'key1': 10, 'key2': 20, 'key3': 30}, 'key2')\` |
| **Result** | \`true\` |

#### \`map_contains_entry(map, key, value)\`

<div class="nostroke_table"></div>

| **Description** | Check if a map contains a given key-value pair. |
| **Example** | \`map_contains_entry(MAP {'key1': 10, 'key2': 20, 'key3': 30}, 'key2', 20)\` |
| **Result** | \`true\` |

#### \`map_contains_value(map, value)\`

<div class="nostroke_table"></div>

| **Description** | Checks if a map contains a given value. |
| **Example** | \`map_contains_value(MAP {'key1': 10, 'key2': 20, 'key3': 30}, 20)\` |
| **Result** | \`true\` |

#### \`map_entries(map)\`

<div class="nostroke_table"></div>

| **Description** | Return a list of struct(k, v) for each key-value pair in the map. |
| **Example** | \`map_entries(map([100, 5], [42, 43]))\` |
| **Result** | \`[{'key': 100, 'value': 42}, {'key': 5, 'value': 43}]\` |

#### \`map_extract(map, key)\`

<div class="nostroke_table"></div>

| **Description** | Return the value for a given \`key\` as a list, or \`NULL\` if the key is not contained in the map. The type of the key provided in the second parameter must match the type of the map's keys else an error is returned. |
| **Example** | \`map_extract(map([100, 5], [42, 43]), 100)\` |
| **Result** | \`[42]\` |
| **Aliases** | \`element_at(map, key)\` |

#### \`map_extract_value(map, key)\`

<div class="nostroke_table"></div>

| **Description** | Returns the value for a given \`key\` or \`NULL\` if the \`key\` is not contained in the map. The type of the key provided in the second parameter must match the type of the map's keys; else, an error is thrown. |
| **Example** | \`map_extract_value(map([100, 5], [42, 43]), 100);\` |
| **Result** | \`42\` |
| **Aliases** | \`map[key]\` |

#### \`map_from_entries(STRUCT(k, v)[])\`

<div class="nostroke_table"></div>

| **Description** | Returns a map created from the entries of the array. |
| **Example** | \`map_from_entries([{k: 5, v: 'val1'}, {k: 3, v: 'val2'}])\` |
| **Result** | \`{5=val1, 3=val2}\` |

#### \`map_keys(map)\`

<div class="nostroke_table"></div>

| **Description** | Return a list of all keys in the map. |
| **Example** | \`map_keys(map([100, 5], [42,43]))\` |
| **Result** | \`[100, 5]\` |

#### \`map_values(map)\`

<div class="nostroke_table"></div>

| **Description** | Return a list of all values in the map. |
| **Example** | \`map_values(map([100, 5], [42, 43]))\` |
| **Result** | \`[42, 43]\` |

#### \`map()\`

<div class="nostroke_table"></div>

| **Description** | Returns an empty map. |
| **Example** | \`map()\` |
| **Result** | \`{}\` |

#### \`map[entry]\`

<div class="nostroke_table"></div>

| **Description** | Returns the value for a given \`key\` or \`NULL\` if the \`key\` is not contained in the map. The type of the key provided in the second parameter must match the type of the map's keys; else, an error is thrown. |
| **Example** | \`map([100, 5], ['a', 'b'])[100]\` |
| **Result** | \`a\` |
| **Aliases** | \`map_extract_value(map, key)\` |
`,"nested.md":"---\ntitle: Nested Functions\n---\n\nThere are five [nested data types]({% link docs/stable/sql/data_types/overview.md %}#nested--composite-types):\n\n| Name | Type page | Functions page |\n|--|---|---|\n| `ARRAY`  | [`ARRAY` type]({% link docs/stable/sql/data_types/array.md %})   | [`ARRAY` functions]({% link docs/stable/sql/functions/array.md %})   |\n| `LIST`   | [`LIST` type]({% link docs/stable/sql/data_types/list.md %})     | [`LIST` functions]({% link docs/stable/sql/functions/list.md %})     |\n| `MAP`    | [`MAP` type]({% link docs/stable/sql/data_types/map.md %})       | [`MAP` functions]({% link docs/stable/sql/functions/map.md %})       |\n| `STRUCT` | [`STRUCT` type]({% link docs/stable/sql/data_types/struct.md %}) | [`STRUCT` functions]({% link docs/stable/sql/functions/struct.md %}) |\n| `UNION`  | [`UNION` type]({% link docs/stable/sql/data_types/union.md %})   | [`UNION` functions]({% link docs/stable/sql/functions/union.md %})   |\n","numeric.md":'---\ntitle: Numeric Functions\n---\n\n<!-- markdownlint-disable MD001 -->\n\n## Numeric Operators\n\nThe table below shows the available mathematical operators for [numeric types]({% link docs/stable/sql/data_types/numeric.md %}).\n\n<!-- markdownlint-disable MD056 -->\n\n| Operator | Description | Example | Result |\n|-|-----|--|-|\n| `+`      | Addition                  | `2 + 3`   | `5`   |\n| `-`      | Subtraction               | `2 - 3`   | `-1`  |\n| `*`      | Multiplication            | `2 * 3`   | `6`   |\n| `/`      | Float division            | `5 / 2`   | `2.5` |\n| `//`     | Division                  | `5 // 2`  | `2`   |\n| `%`      | Modulo (remainder)        | `5 % 4`   | `1`   |\n| `**`     | Exponent                  | `3 ** 4`  | `81`  |\n| `^`      | Exponent (alias for `**`) | `3 ^ 4`   | `81`  |\n| `&`      | Bitwise AND               | `91 & 15` | `11`  |\n| `|`      | Bitwise OR                | `32 | 3`  | `35`  |\n| `<<`     | Bitwise shift left        | `1 << 4`  | `16`  |\n| `>>`     | Bitwise shift right       | `8 >> 2`  | `2`   |\n| `~`      | Bitwise negation          | `~15`     | `-16` |\n| `!`      | Factorial of `x`          | `4!`      | `24`  |\n\n<!-- markdownlint-enable MD056 -->\n\n### Division and Modulo Operators\n\nThere are two division operators: `/` and `//`.\nThey are equivalent when at least one of the operands is a `FLOAT` or a `DOUBLE`.\nWhen both operands are integers, `/` performs floating points division (`5 / 2 = 2.5`) while `//` performs integer division (`5 // 2 = 2`).\n\n### Supported Types\n\nThe modulo, bitwise and negation and factorial operators work only on integral data types,\nwhereas the others are available for all numeric data types.\n\n## Numeric Functions\n\nThe table below shows the available mathematical functions.\n\n| Name | Description |\n|:--|:-------|\n| [`@(x)`](#x) | Absolute value. Parentheses are optional if `x` is a column name. |\n| [`abs(x)`](#absx) | Absolute value. |\n| [`acos(x)`](#acosx) | Computes the inverse cosine of `x`. |\n| [`acosh(x)`](#acoshx) | Computes the inverse hyperbolic cosine of `x`. |\n| [`add(x, y)`](#addx-y) | Alias for `x + y`. |\n| [`asin(x)`](#asinx) | Computes the inverse sine of `x`. |\n| [`asinh(x)`](#asinhx) | Computes the inverse hyperbolic sine of `x`. |\n| [`atan(x)`](#atanx) | Computes the inverse tangent of `x`. |\n| [`atanh(x)`](#atanhx) | Computes the inverse hyperbolic tangent of `x`. |\n| [`atan2(y, x)`](#atan2y-x) | Computes the inverse tangent of `(y, x)`. |\n| [`bit_count(x)`](#bit_countx) | Returns the number of bits that are set. |\n| [`cbrt(x)`](#cbrtx) | Returns the cube root of the number. |\n| [`ceil(x)`](#ceilx) | Rounds the number up. |\n| [`ceiling(x)`](#ceilingx) | Rounds the number up. Alias of `ceil`. |\n| [`cos(x)`](#cosx) | Computes the cosine of `x`. |\n| [`cot(x)`](#cotx) | Computes the cotangent of `x`. |\n| [`degrees(x)`](#degreesx) | Converts radians to degrees. |\n| [`divide(x, y)`](#dividex-y) | Alias for `x // y`. |\n| [`even(x)`](#evenx) | Round to next even number by rounding away from zero. |\n| [`exp(x)`](#expx) | Computes `e ** x`. |\n| [`factorial(x)`](#factorialx) | See the `!` operator. Computes the product of the current integer and all integers below it. |\n| [`fdiv(x, y)`](#fdivx-y) | Performs integer division (`x // y`) but returns a `DOUBLE` value. |\n| [`floor(x)`](#floorx) | Rounds the number down. |\n| [`fmod(x, y)`](#fmodx-y) | Calculates the modulo value. Always returns a `DOUBLE` value. |\n| [`gamma(x)`](#gammax) | Interpolation of the factorial of `x - 1`. Fractional inputs are allowed. |\n| [`gcd(x, y)`](#gcdx-y) | Computes the greatest common divisor of `x` and `y`. |\n| [`greatest_common_divisor(x, y)`](#greatest_common_divisorx-y) | Computes the greatest common divisor of `x` and `y`. |\n| [`greatest(x1, x2, ...)`](#greatestx1-x2-) | Selects the largest value. |\n| [`isfinite(x)`](#isfinitex) | Returns true if the floating point value is finite, false otherwise. |\n| [`isinf(x)`](#isinfx) | Returns true if the floating point value is infinite, false otherwise. |\n| [`isnan(x)`](#isnanx) | Returns true if the floating point value is not a number, false otherwise. |\n| [`lcm(x, y)`](#lcmx-y) | Computes the least common multiple of `x` and `y`. |\n| [`least_common_multiple(x, y)`](#least_common_multiplex-y) | Computes the least common multiple of `x` and `y`. |\n| [`least(x1, x2, ...)`](#leastx1-x2-) | Selects the smallest value. |\n| [`lgamma(x)`](#lgammax) | Computes the log of the `gamma` function. |\n| [`ln(x)`](#lnx) | Computes the natural logarithm of `x`. |\n| [`log(x)`](#logx) | Computes the base-10 logarithm of `x`. |\n| [`log10(x)`](#log10x) | Alias of `log`. Computes the base-10 logarithm of `x`. |\n| [`log2(x)`](#log2x) | Computes the base-2 log of `x`. |\n| [`multiply(x, y)`](#multiplyx-y) | Alias for `x * y`. |\n| [`nextafter(x, y)`](#nextafterx-y) | Return the next floating point value after `x` in the direction of `y`. |\n| [`pi()`](#pi) | Returns the value of pi. |\n| [`pow(x, y)`](#powx-y) | Computes `x` to the power of `y`. |\n| [`power(x, y)`](#powerx-y) | Alias of `pow`. Computes `x` to the power of `y`. |\n| [`radians(x)`](#radiansx) | Converts degrees to radians. |\n| [`random()`](#random) | Returns a random number `x` in the range `0.0 <= x < 1.0`. |\n| [`round_even(v NUMERIC, s INTEGER)`](#round_evenv-numeric-s-integer) | Alias of `roundbankers(v, s)`. Round to `s` decimal places using the [_rounding half to even_ rule](https://en.wikipedia.org/wiki/Rounding#Rounding_half_to_even). Values `s < 0` are allowed. |\n| [`round(v NUMERIC, s INTEGER)`](#roundv-numeric-s-integer) | Round to `s` decimal places. Values `s < 0` are allowed. |\n| [`setseed(x)`](#setseedx) | Sets the seed to be used for the random function. |\n| [`sign(x)`](#signx) | Returns the sign of `x` as -1, 0 or 1. |\n| [`signbit(x)`](#signbitx) | Returns whether the signbit is set or not. |\n| [`sin(x)`](#sinx) | Computes the sin of `x`. |\n| [`sqrt(x)`](#sqrtx) | Returns the square root of the number. |\n| [`subtract(x, y)`](#subtractx-y) | Alias for `x - y`. |\n| [`tan(x)`](#tanx) | Computes the tangent of `x`. |\n| [`trunc(x)`](#truncx) | Truncates the number. |\n| [`xor(x, y)`](#xorx-y) | Bitwise XOR. |\n\n#### `@(x)`\n\n<div class="nostroke_table"></div>\n\n| **Description** | Absolute value. Parentheses are optional if `x` is a column name. |\n| **Example** | `@(-17.4)` |\n| **Result** | `17.4` |\n| **Alias** | `abs` |\n\n#### `abs(x)`\n\n<div class="nostroke_table"></div>\n\n| **Description** | Absolute value. |\n| **Example** | `abs(-17.4)` |\n| **Result** | `17.4` |\n| **Alias** | `@` |\n\n#### `acos(x)`\n\n<div class="nostroke_table"></div>\n\n| **Description** | Computes the inverse cosine of `x`. |\n| **Example** | `acos(0.5)` |\n| **Result** | `1.0471975511965976` |\n\n#### `acosh(x)`\n\n<div class="nostroke_table"></div>\n\n| **Description** | Computes the inverse hyperbolic cosine of `x`. |\n| **Example** | `acosh(1.5)` |\n| **Result** | `0.9624236501192069` |\n\n#### `add(x, y)`\n\n<div class="nostroke_table"></div>\n\n| **Description** | Alias for `x + y`. |\n| **Example** | `add(2, 3)` |\n| **Result** | `5` |\n\n#### `asin(x)`\n\n<div class="nostroke_table"></div>\n\n| **Description** | Computes the inverse sine of `x`. |\n| **Example** | `asin(0.5)` |\n| **Result** | `0.5235987755982989` |\n\n#### `asinh(x)`\n\n<div class="nostroke_table"></div>\n\n| **Description** | Computes the inverse hyperbolix sine of `x`. |\n| **Example** | `asinh(0.5)` |\n| **Result** | `0.48121182505960347` |\n\n#### `atan(x)`\n\n<div class="nostroke_table"></div>\n\n| **Description** | Computes the inverse tangent of `x`. |\n| **Example** | `atan(0.5)` |\n| **Result** | `0.4636476090008061` |\n\n#### `atanh(x)`\n\n<div class="nostroke_table"></div>\n\n| **Description** | Computes the inverse hyperbolic tangent of `x`. |\n| **Example** | `atanh(0.5)` |\n| **Result** | `0.5493061443340549` |\n\n#### `atan2(y, x)`\n\n<div class="nostroke_table"></div>\n\n| **Description** | Computes the inverse tangent (y, x). |\n| **Example** | `atan2(0.5, 0.5)` |\n| **Result** | `0.7853981633974483` |\n\n#### `bit_count(x)`\n\n<div class="nostroke_table"></div>\n\n| **Description** | Returns the number of bits that are set. |\n| **Example** | `bit_count(31)` |\n| **Result** | `5` |\n\n#### `cbrt(x)`\n\n<div class="nostroke_table"></div>\n\n| **Description** | Returns the cube root of the number. |\n| **Example** | `cbrt(8)` |\n| **Result** | `2` |\n\n#### `ceil(x)`\n\n<div class="nostroke_table"></div>\n\n| **Description** | Rounds the number up. |\n| **Example** | `ceil(17.4)` |\n| **Result** | `18` |\n\n#### `ceiling(x)`\n\n<div class="nostroke_table"></div>\n\n| **Description** | Rounds the number up. Alias of `ceil`. |\n| **Example** | `ceiling(17.4)` |\n| **Result** | `18` |\n\n#### `cos(x)`\n\n<div class="nostroke_table"></div>\n\n| **Description** | Computes the cosine of `x`. |\n| **Example** | `cos(pi() / 3)` |\n| **Result** | `0.5000000000000001 ` |\n\n#### `cot(x)`\n\n<div class="nostroke_table"></div>\n\n| **Description** | Computes the cotangent of `x`. |\n| **Example** | `cot(0.5)` |\n| **Result** | `1.830487721712452` |\n\n#### `degrees(x)`\n\n<div class="nostroke_table"></div>\n\n| **Description** | Converts radians to degrees. |\n| **Example** | `degrees(pi())` |\n| **Result** | `180` |\n\n#### `divide(x, y)`\n\n<div class="nostroke_table"></div>\n\n| **Description** | Alias for `x // y`. |\n| **Example** | `divide(5, 2)` |\n| **Result** | `2` |\n\n#### `even(x)`\n\n<div class="nostroke_table"></div>\n\n| **Description** | Round to next even number by rounding away from zero. |\n| **Example** | `even(2.9)` |\n| **Result** | `4` |\n\n#### `exp(x)`\n\n<div class="nostroke_table"></div>\n\n| **Description** | Computes `e ** x`. |\n| **Example** | `exp(0.693)` |\n| **Result** | `2` |\n\n#### `factorial(x)`\n\n<div class="nostroke_table"></div>\n\n| **Description** | See the `!` operator. Computes the product of the current integer and all integers below it. |\n| **Example** | `factorial(4)` |\n| **Result** | `24` |\n\n#### `fdiv(x, y)`\n\n<div class="nostroke_table"></div>\n\n| **Description** | Performs integer division (`x // y`) but returns a `DOUBLE` value. |\n| **Example** | `fdiv(5, 2)` |\n| **Result** | `2.0` |\n\n#### `floor(x)`\n\n<div class="nostroke_table"></div>\n\n| **Description** | Rounds the number down. |\n| **Example** | `floor(17.4)` |\n| **Result** | `17` |\n\n#### `fmod(x, y)`\n\n<div class="nostroke_table"></div>\n\n| **Description** | Calculates the modulo value. Always returns a `DOUBLE` value. |\n| **Example** | `fmod(5, 2)` |\n| **Result** | `1.0` |\n\n#### `gamma(x)`\n\n<div class="nostroke_table"></div>\n\n| **Description** | Interpolation of the factorial of `x - 1`. Fractional inputs are allowed. |\n| **Example** | `gamma(5.5)` |\n| **Result** | `52.34277778455352` |\n\n#### `gcd(x, y)`\n\n<div class="nostroke_table"></div>\n\n| **Description** | Computes the greatest common divisor of `x` and `y`. |\n| **Example** | `gcd(42, 57)` |\n| **Result** | `3` |\n\n#### `greatest_common_divisor(x, y)`\n\n<div class="nostroke_table"></div>\n\n| **Description** | Computes the greatest common divisor of `x` and `y`. |\n| **Example** | `greatest_common_divisor(42, 57)` |\n| **Result** | `3` |\n\n#### `greatest(x1, x2, ...)`\n\n<div class="nostroke_table"></div>\n\n| **Description** | Selects the largest value. |\n| **Example** | `greatest(3, 2, 4, 4)` |\n| **Result** | `4` |\n\n#### `isfinite(x)`\n\n<div class="nostroke_table"></div>\n\n| **Description** | Returns true if the floating point value is finite, false otherwise. |\n| **Example** | `isfinite(5.5)` |\n| **Result** | `true` |\n\n#### `isinf(x)`\n\n<div class="nostroke_table"></div>\n\n| **Description** | Returns true if the floating point value is infinite, false otherwise. |\n| **Example** | `isinf(\'Infinity\'::float)` |\n| **Result** | `true` |\n\n#### `isnan(x)`\n\n<div class="nostroke_table"></div>\n\n| **Description** | Returns true if the floating point value is not a number, false otherwise. |\n| **Example** | `isnan(\'NaN\'::float)` |\n| **Result** | `true` |\n\n#### `lcm(x, y)`\n\n<div class="nostroke_table"></div>\n\n| **Description** | Computes the least common multiple of `x` and `y`. |\n| **Example** | `lcm(42, 57)` |\n| **Result** | `798` |\n\n#### `least_common_multiple(x, y)`\n\n<div class="nostroke_table"></div>\n\n| **Description** | Computes the least common multiple of `x` and `y`. |\n| **Example** | `least_common_multiple(42, 57)` |\n| **Result** | `798` |\n\n#### `least(x1, x2, ...)`\n\n<div class="nostroke_table"></div>\n\n| **Description** | Selects the smallest value. |\n| **Example** | `least(3, 2, 4, 4)` |\n| **Result** | `2` |\n\n#### `lgamma(x)`\n\n<div class="nostroke_table"></div>\n\n| **Description** | Computes the log of the `gamma` function. |\n| **Example** | `lgamma(2)` |\n| **Result** | `0` |\n\n#### `ln(x)`\n\n<div class="nostroke_table"></div>\n\n| **Description** | Computes the natural logarithm of `x`. |\n| **Example** | `ln(2)` |\n| **Result** | `0.693` |\n\n#### `log(x)`\n\n<div class="nostroke_table"></div>\n\n| **Description** | Computes the base-10 log of `x`. |\n| **Example** | `log(100)` |\n| **Result** | `2` |\n\n#### `log10(x)`\n\n<div class="nostroke_table"></div>\n\n| **Description** | Alias of `log`. Computes the base-10 log of `x`. |\n| **Example** | `log10(1000)` |\n| **Result** | `3` |\n\n#### `log2(x)`\n\n<div class="nostroke_table"></div>\n\n| **Description** | Computes the base-2 log of `x`. |\n| **Example** | `log2(8)` |\n| **Result** | `3` |\n\n#### `multiply(x, y)`\n\n<div class="nostroke_table"></div>\n\n| **Description** | Alias for `x * y`. |\n| **Example** | `multiply(2, 3)` |\n| **Result** | `6` |\n\n#### `nextafter(x, y)`\n\n<div class="nostroke_table"></div>\n\n| **Description** | Return the next floating point value after `x` in the direction of `y`. |\n| **Example** | `nextafter(1::float, 2::float)` |\n| **Result** | `1.0000001` |\n\n#### `pi()`\n\n<div class="nostroke_table"></div>\n\n| **Description** | Returns the value of pi. |\n| **Example** | `pi()` |\n| **Result** | `3.141592653589793` |\n\n#### `pow(x, y)`\n\n<div class="nostroke_table"></div>\n\n| **Description** | Computes `x` to the power of `y`. |\n| **Example** | `pow(2, 3)` |\n| **Result** | `8` |\n\n#### `power(x, y)`\n\n<div class="nostroke_table"></div>\n\n| **Description** | Alias of `pow`. Computes `x` to the power of `y`. |\n| **Example** | `power(2, 3)` |\n| **Result** | `8` |\n\n#### `radians(x)`\n\n<div class="nostroke_table"></div>\n\n| **Description** | Converts degrees to radians. |\n| **Example** | `radians(90)` |\n| **Result** | `1.5707963267948966` |\n\n#### `random()`\n\n<div class="nostroke_table"></div>\n\n| **Description** | Returns a random number `x` in the range `0.0 <= x < 1.0`. |\n| **Example** | `random()` |\n| **Result** | various |\n\n#### `round_even(v NUMERIC, s INTEGER)`\n\n<div class="nostroke_table"></div>\n\n| **Description** | Alias of `roundbankers(v, s)`. Round to `s` decimal places using the [_rounding half to even_ rule](https://en.wikipedia.org/wiki/Rounding#Rounding_half_to_even). Values `s < 0` are allowed. |\n| **Example** | `round_even(24.5, 0)` |\n| **Result** | `24.0` |\n\n#### `round(v NUMERIC, s INTEGER)`\n\n<div class="nostroke_table"></div>\n\n| **Description** | Round to `s` decimal places. Values `s < 0` are allowed. |\n| **Example** | `round(42.4332, 2)` |\n| **Result** | `42.43` |\n\n#### `setseed(x)`\n\n<div class="nostroke_table"></div>\n\n| **Description** | Sets the seed to be used for the random function. |\n| **Example** | `setseed(0.42)` |\n\n#### `sign(x)`\n\n<div class="nostroke_table"></div>\n\n| **Description** | Returns the sign of `x` as -1, 0 or 1. |\n| **Example** | `sign(-349)` |\n| **Result** | `-1` |\n\n#### `signbit(x)`\n\n<div class="nostroke_table"></div>\n\n| **Description** | Returns whether the signbit is set or not. |\n| **Example** | `signbit(-1.0)` |\n| **Result** | `true` |\n\n#### `sin(x)`\n\n<div class="nostroke_table"></div>\n\n| **Description** | Computes the sin of `x`. |\n| **Example** | `sin(pi() / 6)` |\n| **Result** | `0.49999999999999994` |\n\n#### `sqrt(x)`\n\n<div class="nostroke_table"></div>\n\n| **Description** | Returns the square root of the number. |\n| **Example** | `sqrt(9)` |\n| **Result** | `3` |\n\n#### `subtract(x, y)`\n\n<div class="nostroke_table"></div>\n\n| **Description** | Alias for `x - y`. |\n| **Example** | `subtract(2, 3)` |\n| **Result** | `-1` |\n\n#### `tan(x)`\n\n<div class="nostroke_table"></div>\n\n| **Description** | Computes the tangent of `x`. |\n| **Example** | `tan(pi() / 4)` |\n| **Result** | `0.9999999999999999` |\n\n#### `trunc(x)`\n\n<div class="nostroke_table"></div>\n\n| **Description** | Truncates the number. |\n| **Example** | `trunc(17.4)` |\n| **Result** | `17` |\n\n#### `xor(x, y)`\n\n<div class="nostroke_table"></div>\n\n| **Description** | Bitwise XOR. |\n| **Example** | `xor(17, 5)` |\n| **Result** | `20` |\n',"orderby.md":"---\ntitle: ORDER BY Clause\n---\n\n`ORDER BY` is an output modifier. Logically it is applied near the very end of the query (just prior to [`LIMIT`]({% link docs/stable/sql/query_syntax/limit.md %}) or [`OFFSET`]({% link docs/stable/sql/query_syntax/limit.md %}), if present).\nThe `ORDER BY` clause sorts the rows on the sorting criteria in either ascending or descending order.\nIn addition, every order clause can specify whether `NULL` values should be moved to the beginning or to the end.\n\nThe `ORDER BY` clause may contain one or more expressions, separated by commas.\nAn error will be thrown if no expressions are included, since the `ORDER BY` clause should be removed in that situation.\nThe expressions may begin with either an arbitrary scalar expression (which could be a column name), a column position number (where the indexing starts from 1), or the keyword `ALL`.\nEach expression can optionally be followed by an order modifier (`ASC` or `DESC`, default is `ASC`), and/or a `NULL` order modifier (`NULLS FIRST` or `NULLS LAST`, default is `NULLS LAST`).\n\n## `ORDER BY ALL`\n\nThe `ALL` keyword indicates that the output should be sorted by every column in order from left to right.\nThe direction of this sort may be modified using either `ORDER BY ALL ASC` or `ORDER BY ALL DESC` and/or `NULLS FIRST` or `NULLS LAST`.\nNote that `ALL` may not be used in combination with other expressions in the `ORDER BY` clause – it must be by itself.\nSee examples below.\n\n## `NULL` Order Modifier\n\nBy default, DuckDB sorts `ASC` and `NULLS LAST`, i.e., the values are sorted in ascending order and `NULL` values are placed last.\nThis is identical to the default sort order of PostgreSQL.\nThe default sort order can be changed with the following configuration options.\n\nUse the `default_null_order` option to change the default `NULL` sorting order to either `NULLS_FIRST`, `NULLS_LAST`, `NULLS_FIRST_ON_ASC_LAST_ON_DESC` or `NULLS_LAST_ON_ASC_FIRST_ON_DESC`:\n\n```sql\nSET default_null_order = 'NULLS_FIRST';\n```\n\nUse the `default_order` to change the direction of the default sorting order to either `DESC` or `ASC`:\n\n```sql\nSET default_order = 'DESC';\n```\n\n## Collations\n\nText is sorted using the binary comparison collation by default, which means values are sorted on their binary UTF-8 values.\nWhile this works well for ASCII text (e.g., for English language data), the sorting order can be incorrect for other languages.\nFor this purpose, DuckDB provides collations.\nFor more information on collations, see the [Collation page]({% link docs/stable/sql/expressions/collations.md %}).\n\n## Examples\n\nAll examples use this example table:\n\n```sql\nCREATE OR REPLACE TABLE addresses AS\n    SELECT '123 Quack Blvd' AS address, 'DuckTown' AS city, '11111' AS zip\n    UNION ALL\n    SELECT '111 Duck Duck Goose Ln', 'DuckTown', '11111'\n    UNION ALL\n    SELECT '111 Duck Duck Goose Ln', 'Duck Town', '11111'\n    UNION ALL\n    SELECT '111 Duck Duck Goose Ln', 'Duck Town', '11111-0001';\n```\n\nSelect the addresses, ordered by city name using the default `NULL` order and default order:\n\n```sql\nSELECT *\nFROM addresses\nORDER BY city;\n```\n\nSelect the addresses, ordered by city name in descending order with nulls at the end:\n\n```sql\nSELECT *\nFROM addresses\nORDER BY city DESC NULLS LAST;\n```\n\nOrder by city and then by zip code, both using the default orderings:\n\n```sql\nSELECT *\nFROM addresses\nORDER BY city, zip;\n```\n\nOrder by city using German collation rules:\n\n```sql\nSELECT *\nFROM addresses\nORDER BY city COLLATE DE;\n```\n\n### `ORDER BY ALL` Examples\n\nOrder from left to right (by address, then by city, then by zip) in ascending order:\n\n```sql\nSELECT *\nFROM addresses\nORDER BY ALL;\n```\n\n|        address         |   city    |    zip     |\n|------------------------|-----------|------------|\n| 111 Duck Duck Goose Ln | Duck Town | 11111      |\n| 111 Duck Duck Goose Ln | Duck Town | 11111-0001 |\n| 111 Duck Duck Goose Ln | DuckTown  | 11111      |\n| 123 Quack Blvd         | DuckTown  | 11111      |\n\nOrder from left to right (by address, then by city, then by zip) in descending order:\n\n```sql\nSELECT *\nFROM addresses\nORDER BY ALL DESC;\n```\n\n|        address         |   city    |    zip     |\n|------------------------|-----------|------------|\n| 123 Quack Blvd         | DuckTown  | 11111      |\n| 111 Duck Duck Goose Ln | DuckTown  | 11111      |\n| 111 Duck Duck Goose Ln | Duck Town | 11111-0001 |\n| 111 Duck Duck Goose Ln | Duck Town | 11111      |\n\n## Syntax\n\n<div id=\"rrdiagram\"></div>\n","overview copy.md":`---
title: Functions
---

## Function Syntax

<div id="rrdiagram"></div>

## Function Chaining via the Dot Operator

DuckDB supports the dot syntax for function chaining. This allows the function call \`fn(arg1, arg2, arg3, ...)\` to be rewritten as \`arg1.fn(arg2, arg3, ...)\`. For example, take the following use of the [\`replace\` function]({% link docs/stable/sql/functions/text.md %}#replacestring-source-target):

\`\`\`sql
SELECT replace(goose_name, 'goose', 'duck') AS duck_name
FROM unnest(['African goose', 'Faroese goose', 'Hungarian goose', 'Pomeranian goose']) breed(goose_name);
\`\`\`

This can be rewritten as follows:

\`\`\`sql
SELECT goose_name.replace('goose', 'duck') AS duck_name
FROM unnest(['African goose', 'Faroese goose', 'Hungarian goose', 'Pomeranian goose']) breed(goose_name);
\`\`\`

### Using with Literals and Arrays

To apply function chaining to literals and following array access operations, you must surround the argument with parentheses, e.g.:

\`\`\`sql
SELECT ('hello world').replace(' ', '_');
\`\`\`

\`\`\`sql
SELECT (2).sqrt();
\`\`\`

\`\`\`sql
SELECT (m[1]).map_entries()
FROM (VALUES ([MAP {'hello': 42}, MAP {'world': 42}])) t(m);
\`\`\`

In the absence of these parentheses, DuckDB will return a \`Parser Error\` for the function call:

\`\`\`console
Parser Error:
syntax error at or near "("
\`\`\`

### Limitations

Function chaining via the dot operator is limited to *scalar* functions and is not supported for *table* functions.
For example, the following call returns a \`Parser Error\`:

\`\`\`sql
SELECT * FROM ('my_file.parquet').read_parquet(); -- does not work
\`\`\`

Additionally, the functions \`coalesce\` and \`ifnull\` cannot be used with function chaining for the time being:

\`\`\`sql
SELECT (2).coalesce(0); -- does not work
SELECT (2).ifnull(0); -- does not work
\`\`\`

## Query Functions

The \`duckdb_functions()\` table function shows the list of functions currently built into the system.

\`\`\`sql
SELECT DISTINCT ON(function_name)
    function_name,
    function_type,
    return_type,
    parameters,
    parameter_types,
    description
FROM duckdb_functions()
WHERE function_type = 'scalar'
  AND function_name LIKE 'b%'
ORDER BY function_name;
\`\`\`

| function_name | function_type | return_type | parameters             | parameter_types                  | description                                                                                                                              |
| ------------- | ------------- | ----------- | ---------------------- | -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| bar           | scalar        | VARCHAR     | [x, min, max, width]   | [DOUBLE, DOUBLE, DOUBLE, DOUBLE] | Draws a band whose width is proportional to (x - min) and equal to width characters when x = max. width defaults to 80                   |
| base64        | scalar        | VARCHAR     | [blob]                 | [BLOB]                           | Convert a blob to a base64 encoded string                                                                                                |
| bin           | scalar        | VARCHAR     | [value]                | [VARCHAR]                        | Converts the value to binary representation                                                                                              |
| bit_count     | scalar        | TINYINT     | [x]                    | [TINYINT]                        | Returns the number of bits that are set                                                                                                  |
| bit_length    | scalar        | BIGINT      | [col0]                 | [VARCHAR]                        | Number of bits in a string                                                                                                               |
| bit_position  | scalar        | INTEGER     | [substring, bitstring] | [BIT, BIT]                       | Returns first starting index of the specified substring within bits, or zero if it is not present. The first (leftmost) bit is indexed 1 |
| bitstring     | scalar        | BIT         | [bitstring, length]    | [VARCHAR, INTEGER]               | Pads the bitstring until the specified length                                                                                            |

> Currently, the description and parameter names of functions are not available in the \`duckdb_functions()\` function.
`,"overview.md":`---
title: Expressions
---

An expression is a combination of values, operators and functions. Expressions are highly composable, and range from very simple to arbitrarily complex. They can be found in many different parts of SQL statements. This section describes the different types of operators and functions that can be used within expressions.
`,"pattern_matching.md":"---\ntitle: Pattern Matching\n---\n\nThere are four separate approaches to pattern matching provided by DuckDB:\nthe traditional SQL [`LIKE` operator](#like),\nthe more recent [`SIMILAR TO` operator](#similar-to) (added in SQL:1999),\na [`GLOB` operator](#glob),\nand POSIX-style [regular expressions](#regular-expressions).\n\n## `LIKE`\n\n<div id=\"rrdiagram1\"></div>\n\nThe `LIKE` expression returns `true` if the string matches the supplied pattern. (As expected, the `NOT LIKE` expression returns `false` if `LIKE` returns `true`, and vice versa. An equivalent expression is `NOT (string LIKE pattern)`.)\n\nIf pattern does not contain percent signs or underscores, then the pattern only represents the string itself; in that case `LIKE` acts like the equals operator. An underscore (`_`) in pattern stands for (matches) any single character; a percent sign (`%`) matches any sequence of zero or more characters.\n\n`LIKE` pattern matching always covers the entire string. Therefore, if it's desired to match a sequence anywhere within a string, the pattern must start and end with a percent sign.\n\nSome examples:\n\n```sql\nSELECT 'abc' LIKE 'abc';    -- true\nSELECT 'abc' LIKE 'a%' ;    -- true\nSELECT 'abc' LIKE '_b_';    -- true\nSELECT 'abc' LIKE 'c';      -- false\nSELECT 'abc' LIKE 'c%' ;    -- false\nSELECT 'abc' LIKE '%c';     -- true\nSELECT 'abc' NOT LIKE '%c'; -- false\n```\n\nThe keyword `ILIKE` can be used instead of `LIKE` to make the match case-insensitive according to the active locale:\n\n```sql\nSELECT 'abc' ILIKE '%C'; -- true\n```\n\n```sql\nSELECT 'abc' NOT ILIKE '%C'; -- false\n```\n\nTo search within a string for a character that is a wildcard (`%` or `_`), the pattern must use an `ESCAPE` clause and an escape character to indicate the wildcard should be treated as a literal character instead of a wildcard. See an example below.\n\nAdditionally, the function `like_escape` has the same functionality as a `LIKE` expression with an `ESCAPE` clause, but using function syntax. See the [Text Functions Docs]({% link docs/stable/sql/functions/text.md %}) for details.\n\nSearch for strings with 'a' then a literal percent sign then 'c':\n\n```sql\nSELECT 'a%c' LIKE 'a$%c' ESCAPE '$'; -- true\nSELECT 'azc' LIKE 'a$%c' ESCAPE '$'; -- false\n```\n\nCase-insensitive ILIKE with ESCAPE:\n\n```sql\nSELECT 'A%c' ILIKE 'a$%c' ESCAPE '$'; -- true\n```\n\nThere are also alternative characters that can be used as keywords in place of `LIKE` expressions. These enhance PostgreSQL compatibility.\n\n<div class=\"monospace_table\"></div>\n\n| PostgreSQL-style | `LIKE`-style |\n| :--------------- | :----------- |\n| `~~`             | `LIKE`       |\n| `!~~`            | `NOT LIKE`   |\n| `~~*`            | `ILIKE`      |\n| `!~~*`           | `NOT ILIKE`  |\n\n## `SIMILAR TO`\n\n<div id=\"rrdiagram2\"></div>\n\nThe `SIMILAR TO` operator returns true or false depending on whether its pattern matches the given string. It is similar to `LIKE`, except that it interprets the pattern using a [regular expression]({% link docs/stable/sql/functions/regular_expressions.md %}). Like `LIKE`, the `SIMILAR TO` operator succeeds only if its pattern matches the entire string; this is unlike common regular expression behavior where the pattern can match any part of the string.\n\nA regular expression is a character sequence that is an abbreviated definition of a set of strings (a regular set). A string is said to match a regular expression if it is a member of the regular set described by the regular expression. As with `LIKE`, pattern characters match string characters exactly unless they are special characters in the regular expression language — but regular expressions use different special characters than `LIKE` does.\n\nSome examples:\n\n```sql\nSELECT 'abc' SIMILAR TO 'abc';       -- true\nSELECT 'abc' SIMILAR TO 'a';         -- false\nSELECT 'abc' SIMILAR TO '.*(b|d).*'; -- true\nSELECT 'abc' SIMILAR TO '(b|c).*';   -- false\nSELECT 'abc' NOT SIMILAR TO 'abc';   -- false\n```\n\n> In PostgreSQL, `~` is equivalent to `SIMILAR TO`\n> and `!~` is equivalent to `NOT SIMILAR TO`.\n> In DuckDB, these equivalences do not hold currently,\n> see the [PostgreSQL compatibility page]({% link docs/stable/sql/dialect/postgresql_compatibility.md %}).\n\n## Globbing\n\nDuckDB supports file name expansion, also known as globbing, for discovering files.\nDuckDB's glob syntax uses the question mark (`?`) wildcard to match any single character and the asterisk (`*`) to match zero or more characters.\nIn addition, you can use the bracket syntax (`[...]`) to match any single character contained within the brackets, or within the character range specified by the brackets. An exclamation mark (`!`) may be used inside the first bracket to search for a character that is not contained within the brackets.\nTo learn more, visit the [“glob (programming)” Wikipedia page](https://en.wikipedia.org/wiki/Glob_(programming)).\n\n### `GLOB`\n\n<div id=\"rrdiagram3\"></div>\n\nThe `GLOB` operator returns `true` or `false` if the string matches the `GLOB` pattern. The `GLOB` operator is most commonly used when searching for filenames that follow a specific pattern (for example a specific file extension).\n\nSome examples:\n\n```sql\nSELECT 'best.txt' GLOB '*.txt';            -- true\nSELECT 'best.txt' GLOB '????.txt';         -- true\nSELECT 'best.txt' GLOB '?.txt';            -- false\nSELECT 'best.txt' GLOB '[abc]est.txt';     -- true\nSELECT 'best.txt' GLOB '[a-z]est.txt';     -- true\n```\n\nThe bracket syntax is case-sensitive:\n\n```sql\nSELECT 'Best.txt' GLOB '[a-z]est.txt';     -- false\nSELECT 'Best.txt' GLOB '[a-zA-Z]est.txt';  -- true\n```\n\nThe `!` applies to all characters within the brackets:\n\n```sql\nSELECT 'Best.txt' GLOB '[!a-zA-Z]est.txt'; -- false\n```\n\nTo negate a GLOB operator, negate the entire expression:\n\n```sql\nSELECT NOT 'best.txt' GLOB '*.txt';        -- false\n```\n\nThree tildes (`~~~`) may also be used in place of the `GLOB` keyword.\n\n| GLOB-style | Symbolic-style |\n| :--------- | :------------- |\n| `GLOB`     | `~~~`          |\n\n### Glob Function to Find Filenames\n\nThe glob pattern matching syntax can also be used to search for filenames using the `glob` table function.\nIt accepts one parameter: the path to search (which may include glob patterns).\n\nSearch the current directory for all files:\n\n```sql\nSELECT * FROM glob('*');\n```\n\n<div class=\"monospace_table\"></div>\n\n| file          |\n| ------------- |\n| duckdb.exe    |\n| test.csv      |\n| test.json     |\n| test.parquet  |\n| test2.csv     |\n| test2.parquet |\n| todos.json    |\n\n### Globbing Semantics\n\nDuckDB's globbing implementation follows the semantics of [Python's `glob`](https://docs.python.org/3/library/glob.html) and not the `glob` used in the shell.\nA notable difference is the behavior of the `**/` construct: `**/⟨filename⟩`{:.language-sql .highlight} will not return a file with `⟨filename⟩`{:.language-sql .highlight} in top-level directory.\nFor example, with a `README.md` file present in the directory, the following query finds it:\n\n```sql\nSELECT * FROM glob('README.md');\n```\n\n<div class=\"monospace_table\"></div>\n\n| file      |\n| --------- |\n| README.md |\n\nHowever, the following query returns an empty result:\n\n```sql\nSELECT * FROM glob('**/README.md');\n```\n\nMeanwhile, the globbing of Bash, Zsh, etc. finds the file using the same syntax:\n\n```batch\nls **/README.md\n```\n\n```text\nREADME.md\n```\n\n## Regular Expressions\n\nDuckDB's regular expression support is documented on the [Regular Expressions page]({% link docs/stable/sql/functions/regular_expressions.md %}).\nDuckDB supports some PostgreSQL-style operators for regular expression matching:\n\n| PostgreSQL-style | Equivalent expression                                                                                    |\n| :--------------- | :------------------------------------------------------------------------------------------------------- |\n| `~`              | [`regexp_full_match`]({% link docs/stable/sql/functions/text.md %}#regexp_full_matchstring-regex)       |\n| `!~`             | `NOT` [`regexp_full_match`]({% link docs/stable/sql/functions/text.md %}#regexp_full_matchstring-regex) |\n| `~*`             | (not supported)                                                                                          |\n| `!~*`            | (not supported)                                                                                          |\n","prepared_statements.md":`---
title: Prepared Statements
---

DuckDB supports prepared statements where parameters are substituted when the query is executed.
This can improve readability and is useful for preventing [SQL injections](https://en.wikipedia.org/wiki/SQL_injection).

## Syntax

There are three syntaxes for denoting parameters in prepared statements:
auto-incremented (\`?\`),
positional (\`$1\`),
and named (\`$param\`).
Note that not all clients support all of these syntaxes, e.g., the [JDBC client]({% link docs/stable/clients/java.md %}) only supports auto-incremented parameters in prepared statements.

### Example Dataset

In the following, we introduce the three different syntaxes and illustrate them with examples using the following table.

\`\`\`sql
CREATE TABLE person (name VARCHAR, age BIGINT);
INSERT INTO person VALUES ('Alice', 37), ('Ana', 35), ('Bob', 41), ('Bea', 25);
\`\`\`

In our example query, we'll look for people whose name starts with a \`B\` and are at least 40 years old.
This will return a single row \`<'Bob', 41>\`.

### Auto-Incremented Parameters: \`?\`

DuckDB support using prepared statements with auto-incremented indexing,
i.e., the position of the parameters in the query corresponds to their position in the execution statement.
For example:

\`\`\`sql
PREPARE query_person AS
    SELECT *
    FROM person
    WHERE starts_with(name, ?)
      AND age >= ?;
\`\`\`

Using the CLI client, the statement is executed as follows.

\`\`\`sql
EXECUTE query_person('B', 40);
\`\`\`

### Positional Parameters: \`$1\`

Prepared statements can use positional parameters, where parameters are denoted with an integer (\`$1\`, \`$2\`).
For example:

\`\`\`sql
PREPARE query_person AS
    SELECT *
    FROM person
    WHERE starts_with(name, $2)
      AND age >= $1;
\`\`\`

Using the CLI client, the statement is executed as follows.
Note that the first parameter corresponds to \`$1\`, the second to \`$2\`, and so on.

\`\`\`sql
EXECUTE query_person(40, 'B');
\`\`\`

### Named Parameters: \`$parameter\`

DuckDB also supports names parameters where parameters are denoted with \`$parameter_name\`.
For example:

\`\`\`sql
PREPARE query_person AS
    SELECT *
    FROM person
    WHERE starts_with(name, $name_start_letter)
      AND age >= $minimum_age;
\`\`\`

Using the CLI client, the statement is executed as follows.

\`\`\`sql
EXECUTE query_person(name_start_letter := 'B', minimum_age := 40);
\`\`\`

## Dropping Prepared Statements: \`DEALLOCATE\`

To drop a prepared statement, use the \`DEALLOCATE\` statement:

\`\`\`sql
DEALLOCATE query_person;
\`\`\`

Alternatively, use:

\`\`\`sql
DEALLOCATE PREPARE query_person;
\`\`\`
`,"qualify.md":`---
title: QUALIFY Clause
---

The \`QUALIFY\` clause is used to filter the results of [\`WINDOW\` functions]({% link docs/stable/sql/functions/window_functions.md %}). This filtering of results is similar to how a [\`HAVING\` clause]({% link docs/stable/sql/query_syntax/having.md %}) filters the results of aggregate functions applied based on the [\`GROUP BY\` clause]({% link docs/stable/sql/query_syntax/groupby.md %}).

The \`QUALIFY\` clause avoids the need for a subquery or [\`WITH\` clause]({% link docs/stable/sql/query_syntax/with.md %}) to perform this filtering (much like \`HAVING\` avoids a subquery). An example using a \`WITH\` clause instead of \`QUALIFY\` is included below the \`QUALIFY\` examples.

Note that this is filtering based on [\`WINDOW\` functions]({% link docs/stable/sql/functions/window_functions.md %}), not necessarily based on the [\`WINDOW\` clause]({% link docs/stable/sql/query_syntax/window.md %}). The \`WINDOW\` clause is optional and can be used to simplify the creation of multiple \`WINDOW\` function expressions.

The position of where to specify a \`QUALIFY\` clause is following the [\`WINDOW\` clause]({% link docs/stable/sql/query_syntax/window.md %}) in a \`SELECT\` statement (\`WINDOW\` does not need to be specified), and before the [\`ORDER BY\`]({% link docs/stable/sql/query_syntax/orderby.md %}).

## Examples

Each of the following examples produce the same output, located below.

Filter based on a window function defined in the \`QUALIFY\` clause:

\`\`\`sql
SELECT
    schema_name,
    function_name,
    -- In this example the function_rank column in the select clause is for reference
    row_number() OVER (PARTITION BY schema_name ORDER BY function_name) AS function_rank
FROM duckdb_functions()
QUALIFY
    row_number() OVER (PARTITION BY schema_name ORDER BY function_name) < 3;
\`\`\`

Filter based on a window function defined in the \`SELECT\` clause:

\`\`\`sql
SELECT
    schema_name,
    function_name,
    row_number() OVER (PARTITION BY schema_name ORDER BY function_name) AS function_rank
FROM duckdb_functions()
QUALIFY
    function_rank < 3;
\`\`\`

Filter based on a window function defined in the \`QUALIFY\` clause, but using the \`WINDOW\` clause:

\`\`\`sql
SELECT
    schema_name,
    function_name,
    -- In this example the function_rank column in the select clause is for reference
    row_number() OVER my_window AS function_rank
FROM duckdb_functions()
WINDOW
    my_window AS (PARTITION BY schema_name ORDER BY function_name)
QUALIFY
    row_number() OVER my_window < 3;
\`\`\`

Filter based on a window function defined in the \`SELECT\` clause, but using the \`WINDOW\` clause:

\`\`\`sql
SELECT
    schema_name,
    function_name,
    row_number() OVER my_window AS function_rank
FROM duckdb_functions()
WINDOW
    my_window AS (PARTITION BY schema_name ORDER BY function_name)
QUALIFY
    function_rank < 3;
\`\`\`

Equivalent query based on a \`WITH\` clause (without a \`QUALIFY\` clause):

\`\`\`sql
WITH ranked_functions AS (
    SELECT
        schema_name,
        function_name,
        row_number() OVER (PARTITION BY schema_name ORDER BY function_name) AS function_rank
    FROM duckdb_functions()
)
SELECT
    *
FROM ranked_functions
WHERE
    function_rank < 3;
\`\`\`

| schema_name |  function_name  | function_rank |
|:---|:---|:---|
| main        | !__postfix      | 1             |
| main        | !~~             | 2             |
| pg_catalog  | col_description | 1             |
| pg_catalog  | format_pg_type  | 2             |

## Syntax

<div id="rrdiagram"></div>
`,"regular_expressions.md":"---\ntitle: Regular Expressions\n---\n\n<!-- markdownlint-disable MD001 -->\n\nDuckDB offers [pattern matching operators]({% link docs/stable/sql/functions/pattern_matching.md %})\n([`LIKE`]({% link docs/stable/sql/functions/pattern_matching.md %}#like),\n[`SIMILAR TO`]({% link docs/stable/sql/functions/pattern_matching.md %}#similar-to),\n[`GLOB`]({% link docs/stable/sql/functions/pattern_matching.md %}#glob)),\nas well as support for regular expressions via functions.\n\n## Regular Expression Syntax\n\nDuckDB uses the [RE2 library](https://github.com/google/re2) as its regular expression engine. For the regular expression syntax, see the [RE2 docs](https://github.com/google/re2/wiki/Syntax).\n\n## Functions\n\nAll functions accept an optional set of [options](#options-for-regular-expression-functions).\n\n| Name | Description |\n|:--|:-------|\n| [`regexp_extract(string, pattern[, group = 0][, options])`](#regexp_extractstring-pattern-group--0-options) | If `string` contains the regexp `pattern`, returns the capturing group specified by optional parameter `group`; otherwise, returns the empty string. The `group` must be a constant value. If no `group` is given, it defaults to 0. A set of optional [`options`](#options-for-regular-expression-functions) can be set. |\n| [`regexp_extract(string, pattern, name_list[, options])`](#regexp_extractstring-pattern-name_list-options) | If `string` contains the regexp `pattern`, returns the capturing groups as a struct with corresponding names from `name_list`; otherwise, returns a struct with the same keys and empty strings as values. |\n| [`regexp_extract_all(string, regex[, group = 0][, options])`](#regexp_extract_allstring-regex-group--0-options) | Finds non-overlapping occurrences of `regex` in `string` and returns the corresponding values of `group`. |\n| [`regexp_full_match(string, regex[, options])`](#regexp_full_matchstring-regex-options) | Returns `true` if the entire `string` matches the `regex`. |\n| [`regexp_matches(string, pattern[, options])`](#regexp_matchesstring-pattern-options) | Returns `true` if  `string` contains the regexp `pattern`, `false` otherwise. |\n| [`regexp_replace(string, pattern, replacement[, options])`](#regexp_replacestring-pattern-replacement-options) | If `string` contains the regexp `pattern`, replaces the matching part with `replacement`. By default, only the first occurrence is replaced. A set of optional [`options`](#options-for-regular-expression-functions), including the global flag `g`, can be set. |\n| [`regexp_split_to_array(string, regex[, options])`](#regexp_split_to_arraystring-regex-options) | Alias of `string_split_regex`. Splits the `string` along the `regex`. |\n| [`regexp_split_to_table(string, regex[, options])`](#regexp_split_to_tablestring-regex-options) | Splits the `string` along the `regex` and returns a row for each part. |\n\n#### `regexp_extract(string, pattern[, group = 0][, options])`\n\n<div class=\"nostroke_table\"></div>\n\n| **Description** | If `string` contains the regexp `pattern`, returns the capturing group specified by optional parameter `group`; otherwise, returns the empty string. The `group` must be a constant value. If no `group` is given, it defaults to 0. A set of optional [`options`](#options-for-regular-expression-functions) can be set. |\n| **Example** | `regexp_extract('abc', '([a-z])(b)', 1)` |\n| **Result** | `a` |\n\n#### `regexp_extract(string, pattern, name_list[, options])`\n\n<div class=\"nostroke_table\"></div>\n\n| **Description** | If `string` contains the regexp `pattern`, returns the capturing groups as a struct with corresponding names from `name_list`; otherwise, returns a struct with the same keys and empty strings as values. A set of optional [`options`](#options-for-regular-expression-functions) can be set. |\n| **Example** | `regexp_extract('2023-04-15', '(\\d+)-(\\d+)-(\\d+)', ['y', 'm', 'd'])` |\n| **Result** | `{'y':'2023', 'm':'04', 'd':'15'}` |\n\n#### `regexp_extract_all(string, regex[, group = 0][, options])`\n\n<div class=\"nostroke_table\"></div>\n\n| **Description** | Finds non-overlapping occurrences of `regex` in `string` and returns the corresponding values of `group`. A set of optional [`options`](#options-for-regular-expression-functions) can be set. |\n| **Example** | `regexp_extract_all('Peter: 33, Paul:14', '(\\w+):\\s*(\\d+)', 2)` |\n| **Result** | `[33, 14]` |\n\n#### `regexp_full_match(string, regex[, options])`\n\n<div class=\"nostroke_table\"></div>\n\n| **Description** | Returns `true` if the entire `string` matches the `regex`. A set of optional [`options`](#options-for-regular-expression-functions) can be set. |\n| **Example** | `regexp_full_match('anabanana', '(an)*')` |\n| **Result** | `false` |\n\n#### `regexp_matches(string, pattern[, options])`\n\n<div class=\"nostroke_table\"></div>\n\n| **Description** | Returns `true` if  `string` contains the regexp `pattern`, `false` otherwise. A set of optional [`options`](#options-for-regular-expression-functions) can be set. |\n| **Example** | `regexp_matches('anabanana', '(an)*')` |\n| **Result** | `true` |\n\n#### `regexp_replace(string, pattern, replacement[, options])`\n\n<div class=\"nostroke_table\"></div>\n\n| **Description** | If `string` contains the regexp `pattern`, replaces the matching part with `replacement`. By default, only the first occurrence is replaced. A set of optional [`options`](#options-for-regular-expression-functions), including the global flag `g`, can be set. |\n| **Example** | `regexp_replace('hello', '[lo]', '-')` |\n| **Result** | `he-lo` |\n\n#### `regexp_split_to_array(string, regex[, options])`\n\n<div class=\"nostroke_table\"></div>\n\n| **Description** | Alias of `string_split_regex`. Splits the `string` along the `regex`. A set of optional [`options`](#options-for-regular-expression-functions) can be set. |\n| **Example** | `regexp_split_to_array('hello world; 42', ';? ')` |\n| **Result** | `['hello', 'world', '42']` |\n\n#### `regexp_split_to_table(string, regex[, options])`\n\n<div class=\"nostroke_table\"></div>\n\n| **Description** | Splits the `string` along the `regex` and returns a row for each part. A set of optional [`options`](#options-for-regular-expression-functions) can be set. |\n| **Example** | `regexp_split_to_table('hello world; 42', ';? ')` |\n| **Result** | Three rows: `'hello'`, `'world'`, `'42'` |\n\nThe `regexp_matches` function is similar to the `SIMILAR TO` operator, however, it does not require the entire string to match. Instead, `regexp_matches` returns `true` if the string merely contains the pattern (unless the special tokens `^` and `$` are used to anchor the regular expression to the start and end of the string). Below are some examples:\n\n```sql\nSELECT regexp_matches('abc', 'abc');       -- true\nSELECT regexp_matches('abc', '^abc$');     -- true\nSELECT regexp_matches('abc', 'a');         -- true\nSELECT regexp_matches('abc', '^a$');       -- false\nSELECT regexp_matches('abc', '.*(b|d).*'); -- true\nSELECT regexp_matches('abc', '(b|c).*');   -- true\nSELECT regexp_matches('abc', '^(b|c).*');  -- false\nSELECT regexp_matches('abc', '(?i)A');     -- true\nSELECT regexp_matches('abc', 'A', 'i');    -- true\n```\n\n## Options for Regular Expression Functions\n\nThe regex functions support the following `options`.\n\n| Option | Description |\n|:---|:---|\n| `'c'`               | Case-sensitive matching                             |\n| `'i'`               | Case-insensitive matching                           |\n| `'l'`               | Match literals instead of regular expression tokens |\n| `'m'`, `'n'`, `'p'` | Newline sensitive matching                          |\n| `'g'`               | Global replace, only available for `regexp_replace` |\n| `'s'`               | Non-newline sensitive matching                      |\n\nFor example:\n\n```sql\nSELECT regexp_matches('abcd', 'ABC', 'c'); -- false\nSELECT regexp_matches('abcd', 'ABC', 'i'); -- true\nSELECT regexp_matches('ab^/$cd', '^/$', 'l'); -- true\nSELECT regexp_matches(E'hello\\nworld', 'hello.world', 'p'); -- false\nSELECT regexp_matches(E'hello\\nworld', 'hello.world', 's'); -- true\n```\n\n### Using `regexp_matches`\n\nThe `regexp_matches` operator will be optimized to the `LIKE` operator when possible. To achieve best performance, the `'c'` option (case-sensitive matching) should be passed if applicable. Note that by default the [`RE2` library](#regular-expression-syntax) doesn't match the `.` character to newline.\n\n| Original | Optimized equivalent |\n|:---|:---|\n| `regexp_matches('hello world', '^hello', 'c')`      | `prefix('hello world', 'hello')` |\n| `regexp_matches('hello world', 'world$', 'c')`      | `suffix('hello world', 'world')` |\n| `regexp_matches('hello world', 'hello.world', 'c')` | `LIKE 'hello_world'`             |\n| `regexp_matches('hello world', 'he.*rld', 'c')`     | `LIKE '%he%rld'`                 |\n\n### Using `regexp_replace`\n\nThe `regexp_replace` function can be used to replace the part of a string that matches the regexp pattern with a replacement string. The notation `\\d` (where `d` is a number indicating the group) can be used to refer to groups captured in the regular expression in the replacement string. Note that by default, `regexp_replace` only replaces the first occurrence of the regular expression. To replace all occurrences, use the global replace (`g`) flag.\n\nSome examples for using `regexp_replace`:\n\n```sql\nSELECT regexp_replace('abc', '(b|c)', 'X');        -- aXc\nSELECT regexp_replace('abc', '(b|c)', 'X', 'g');   -- aXX\nSELECT regexp_replace('abc', '(b|c)', '\\1\\1\\1\\1'); -- abbbbc\nSELECT regexp_replace('abc', '(.*)c', '\\1e');      -- abe\nSELECT regexp_replace('abc', '(a)(b)', '\\2\\1');    -- bac\n```\n\n### Using `regexp_extract`\n\nThe `regexp_extract` function is used to extract a part of a string that matches the regexp pattern.\nA specific capturing group within the pattern can be extracted using the `group` parameter. If `group` is not specified, it defaults to 0, extracting the first match with the whole pattern.\n\n```sql\nSELECT regexp_extract('abc', '.b.');           -- abc\nSELECT regexp_extract('abc', '.b.', 0);        -- abc\nSELECT regexp_extract('abc', '.b.', 1);        -- (empty)\nSELECT regexp_extract('abc', '([a-z])(b)', 1); -- a\nSELECT regexp_extract('abc', '([a-z])(b)', 2); -- b\n```\n\nThe `regexp_extract` function also supports a `name_list` argument, which is a `LIST` of strings. Using `name_list`, the `regexp_extract` will return the corresponding capture groups as fields of a `STRUCT`:\n\n```sql\nSELECT regexp_extract('2023-04-15', '(\\d+)-(\\d+)-(\\d+)', ['y', 'm', 'd']);\n```\n\n```text\n{'y': 2023, 'm': 04, 'd': 15}\n```\n\n```sql\nSELECT regexp_extract('2023-04-15 07:59:56', '^(\\d+)-(\\d+)-(\\d+) (\\d+):(\\d+):(\\d+)', ['y', 'm', 'd']);\n```\n\n```text\n{'y': 2023, 'm': 04, 'd': 15}\n```\n\n```sql\nSELECT regexp_extract('duckdb_0_7_1', '^(\\w+)_(\\d+)_(\\d+)', ['tool', 'major', 'minor', 'fix']);\n```\n\n```console\nBinder Error:\nNot enough group names in regexp_extract\n```\n\nIf the number of column names is less than the number of capture groups, then only the first groups are returned.\nIf the number of column names is greater, then an error is generated.\n\n## Limitations\n\nRegular expressions only support 9 capture groups: `\\1`, `\\2`, `\\3`, ..., `\\9`.\nCapture groups with two or more digits are not supported.\n","sample.md":`---
title: SAMPLE Clause
---

The \`SAMPLE\` clause allows you to run the query on a sample from the base table. This can significantly speed up processing of queries, at the expense of accuracy in the result. Samples can also be used to quickly see a snapshot of the data when exploring a dataset. The sample clause is applied right after anything in the \`FROM\` clause (i.e., after any joins, but before the \`WHERE\` clause or any aggregates). See the [\`SAMPLE\`]({% link docs/stable/sql/samples.md %}) page for more information.

## Examples

Select a sample of 1% of the addresses table using default (system) sampling:

\`\`\`sql
SELECT *
FROM addresses
USING SAMPLE 1%;
\`\`\`

Select a sample of 1% of the addresses table using bernoulli sampling:

\`\`\`sql
SELECT *
FROM addresses
USING SAMPLE 1% (bernoulli);
\`\`\`

Select a sample of 10 rows from the subquery:

\`\`\`sql
SELECT *
FROM (SELECT * FROM addresses)
USING SAMPLE 10 ROWS;
\`\`\`

## Syntax

<div id="rrdiagram"></div>
`,"select.md":"---\ntitle: SELECT Clause\n---\n\nThe `SELECT` clause specifies the list of columns that will be returned by the query. While it appears first in the clause, *logically* the expressions here are executed only at the end. The `SELECT` clause can contain arbitrary expressions that transform the output, as well as aggregates and window functions.\n\n## Examples\n\nSelect all columns from the table called `tbl`:\n\n```sql\nSELECT * FROM tbl;\n```\n\nPerform arithmetic on the columns in a table, and provide an alias:\n\n```sql\nSELECT col1 + col2 AS res, sqrt(col1) AS root FROM tbl;\n```\n\nUse prefix aliases:\n\n```sql\nSELECT\n    res: col1 + col2,\n    root: sqrt(col1)\nFROM tbl;\n```\n\nSelect all unique cities from the `addresses` table:\n\n```sql\nSELECT DISTINCT city FROM addresses;\n```\n\nReturn the total number of rows in the `addresses` table:\n\n```sql\nSELECT count(*) FROM addresses;\n```\n\nSelect all columns except the city column from the `addresses` table:\n\n```sql\nSELECT * EXCLUDE (city) FROM addresses;\n```\n\nSelect all columns from the `addresses` table, but replace `city` with `lower(city)`:\n\n```sql\nSELECT * REPLACE (lower(city) AS city) FROM addresses;\n```\n\nSelect all columns matching the given regular expression from the table:\n\n```sql\nSELECT COLUMNS('number\\d+') FROM addresses;\n```\n\nCompute a function on all given columns of a table:\n\n```sql\nSELECT min(COLUMNS(*)) FROM addresses;\n```\n\nTo select columns with spaces or special characters, use double quotes (`\"`):\n\n```sql\nSELECT \"Some Column Name\" FROM tbl;\n```\n\n## Syntax\n\n<div id=\"rrdiagram\"></div>\n\n## `SELECT` List\n\nThe `SELECT` clause contains a list of expressions that specify the result of a query. The select list can refer to any columns in the `FROM` clause, and combine them using expressions. As the output of a SQL query is a table – every expression in the `SELECT` clause also has a name. The expressions can be explicitly named using the `AS` clause (e.g., `expr AS name`). If a name is not provided by the user the expressions are named automatically by the system.\n\n> Column names are case-insensitive. See the [Rules for Case Sensitivity]({% link docs/stable/sql/dialect/keywords_and_identifiers.md %}#rules-for-case-sensitivity) for more details.\n\n### Star Expressions\n\nSelect all columns from the table called `tbl`:\n\n```sql\nSELECT *\nFROM tbl;\n```\n\nSelect all columns matching the given regular expression from the table:\n\n```sql\nSELECT COLUMNS('number\\d+')\nFROM addresses;\n```\n\nThe [star expression]({% link docs/stable/sql/expressions/star.md %}) is a special expression that expands to *multiple expressions* based on the contents of the `FROM` clause. In the simplest case, `*` expands to **all** expressions in the `FROM` clause. Columns can also be selected using regular expressions or lambda functions. See the [star expression page]({% link docs/stable/sql/expressions/star.md %}) for more details.\n\n### `DISTINCT` Clause\n\nSelect all unique cities from the addresses table:\n\n```sql\nSELECT DISTINCT city\nFROM addresses;\n```\n\nThe `DISTINCT` clause can be used to return **only** the unique rows in the result – so that any duplicate rows are filtered out.\n\n> Queries starting with `SELECT DISTINCT` run deduplication, which is an expensive operation. Therefore, only use `DISTINCT` if necessary.\n\n### `DISTINCT ON` Clause\n\nSelect only the highest population city for each country:\n\n```sql\nSELECT DISTINCT ON(country) city, population\nFROM cities\nORDER BY population DESC;\n```\n\nThe `DISTINCT ON` clause returns only one row per unique value in the set of expressions as defined in the `ON` clause. If an `ORDER BY` clause is present, the row that is returned is the first row that is encountered as per the `ORDER BY` criteria. If an `ORDER BY` clause is not present, the first row that is encountered is not defined and can be any row in the table.\n\n> When querying large datasets, using `DISTINCT` on all columns can be expensive. Therefore, consider using `DISTINCT ON` on a column (or a set of columns) which guarantees a sufficient degree of uniqueness for your results. For example, using `DISTINCT ON` on the key column(s) of a table guarantees full uniqueness.\n\n### Aggregates\n\nReturn the total number of rows in the addresses table:\n\n```sql\nSELECT count(*)\nFROM addresses;\n```\n\nReturn the total number of rows in the addresses table grouped by city:\n\n```sql\nSELECT city, count(*)\nFROM addresses\nGROUP BY city;\n```\n\n[Aggregate functions]({% link docs/stable/sql/functions/aggregates.md %}) are special functions that *combine* multiple rows into a single value. When aggregate functions are present in the `SELECT` clause, the query is turned into an aggregate query. In an aggregate query, **all** expressions must either be part of an aggregate function, or part of a group (as specified by the [`GROUP BY clause`]({% link docs/stable/sql/query_syntax/groupby.md %})).\n\n### Window Functions\n\nGenerate a `row_number` column containing incremental identifiers for each row:\n\n```sql\nSELECT row_number() OVER ()\nFROM sales;\n```\n\nCompute the difference between the current amount, and the previous amount, by order of time:\n\n```sql\nSELECT amount - lag(amount) OVER (ORDER BY time)\nFROM sales;\n```\n\n[Window functions]({% link docs/stable/sql/functions/window_functions.md %}) are special functions that allow the computation of values relative to *other rows* in a result. Window functions are marked by the `OVER` clause which contains the *window specification*. The window specification defines the frame or context in which the window function is computed. See the [window functions page]({% link docs/stable/sql/functions/window_functions.md %}) for more information.\n\n### `unnest` Function\n\nUnnest an array by one level:\n\n```sql\nSELECT unnest([1, 2, 3]);\n```\n\nUnnest a struct by one level:\n\n```sql\nSELECT unnest({'a': 42, 'b': 84});\n```\n\nThe [`unnest`]({% link docs/stable/sql/query_syntax/unnest.md %}) function is a special function that can be used together with [arrays]({% link docs/stable/sql/data_types/array.md %}), [lists]({% link docs/stable/sql/data_types/list.md %}), or [structs]({% link docs/stable/sql/data_types/struct.md %}). The unnest function strips one level of nesting from the type. For example, `INTEGER[]` is transformed into `INTEGER`. `STRUCT(a INTEGER, b INTEGER)` is transformed into `a INTEGER, b INTEGER`. The unnest function can be used to transform nested types into regular scalar types, which makes them easier to operate on.\n","setops.md":`---
title: Set Operations
---

Set operations allow queries to be combined according to [set operation semantics](https://en.wikipedia.org/wiki/Set_(mathematics)#Basic_operations). Set operations refer to the [\`UNION [ALL]\`](#union), [\`INTERSECT [ALL]\`](#intersect) and [\`EXCEPT [ALL]\`](#except) clauses. The vanilla variants use set semantics, i.e., they eliminate duplicates, while the variants with \`ALL\` use bag semantics.

Traditional set operations unify queries **by column position**, and require the to-be-combined queries to have the same number of input columns. If the columns are not of the same type, casts may be added. The result will use the column names from the first query.

DuckDB also supports [\`UNION [ALL] BY NAME\`](#union-all-by-name), which joins columns by name instead of by position. \`UNION BY NAME\` does not require the inputs to have the same number of columns. \`NULL\` values will be added in case of missing columns.

## \`UNION\`

The \`UNION\` clause can be used to combine rows from multiple queries. The queries are required to return the same number of columns. [Implicit casting](https://duckdb.org/docs/sql/data_types/typecasting#implicit-casting) to one of the returned types is performed to combine columns of different types where necessary. If this is not possible, the \`UNION\` clause throws an error.

### Vanilla \`UNION\` (Set Semantics)

The vanilla \`UNION\` clause follows set semantics, therefore it performs duplicate elimination, i.e., only unique rows will be included in the result.

\`\`\`sql
SELECT * FROM range(2) t1(x)
UNION
SELECT * FROM range(3) t2(x);
\`\`\`

| x |
|--:|
| 2 |
| 1 |
| 0 |

### \`UNION ALL\` (Bag Semantics)

\`UNION ALL\` returns all rows of both queries following bag semantics, i.e., *without* duplicate elimination.

\`\`\`sql
SELECT * FROM range(2) t1(x)
UNION ALL
SELECT * FROM range(3) t2(x);
\`\`\`

| x |
|--:|
| 0 |
| 1 |
| 0 |
| 1 |
| 2 |

### \`UNION [ALL] BY NAME\`

The \`UNION [ALL] BY NAME\` clause can be used to combine rows from different tables by name, instead of by position. \`UNION BY NAME\` does not require both queries to have the same number of columns. Any columns that are only found in one of the queries are filled with \`NULL\` values for the other query.

Take the following tables for example:

\`\`\`sql
CREATE TABLE capitals (city VARCHAR, country VARCHAR);
INSERT INTO capitals VALUES
    ('Amsterdam', 'NL'),
    ('Berlin', 'Germany');
CREATE TABLE weather (city VARCHAR, degrees INTEGER, date DATE);
INSERT INTO weather VALUES
    ('Amsterdam', 10, '2022-10-14'),
    ('Seattle', 8, '2022-10-12');
\`\`\`

\`\`\`sql
SELECT * FROM capitals
UNION BY NAME
SELECT * FROM weather;
\`\`\`

|   city    | country | degrees |    date    |
|-----------|---------|--------:|------------|
| Seattle   | NULL    | 8       | 2022-10-12 |
| Amsterdam | NL      | NULL    | NULL       |
| Berlin    | Germany | NULL    | NULL       |
| Amsterdam | NULL    | 10      | 2022-10-14 |

\`UNION BY NAME\` follows set semantics (therefore it performs duplicate elimination), whereas \`UNION ALL BY NAME\` follows bag semantics.

## \`INTERSECT\`

The \`INTERSECT\` clause can be used to select all rows that occur in the result of **both** queries.

### Vanilla \`INTERSECT\` (Set Semantics)

Vanilla \`INTERSECT\` performs duplicate elimination, so only unique rows are returned.

\`\`\`sql
SELECT * FROM range(2) t1(x)
INTERSECT
SELECT * FROM range(6) t2(x);
\`\`\`

| x |
|--:|
| 0 |
| 1 |

### \`INTERSECT ALL\` (Bag Semantics)

\`INTERSECT ALL\` follows bag semantics, so duplicates are returned.

\`\`\`sql
SELECT unnest([5, 5, 6, 6, 6, 6, 7, 8]) AS x
INTERSECT ALL
SELECT unnest([5, 6, 6, 7, 7, 9]);
\`\`\`

| x |
|--:|
| 5 |
| 6 |
| 6 |
| 7 |

## \`EXCEPT\`

The \`EXCEPT\` clause can be used to select all rows that **only** occur in the left query.

### Vanilla \`EXCEPT\` (Set Semantics)

Vanilla \`EXCEPT\` follows set semantics, therefore, it performs duplicate elimination, so only unique rows are returned.

\`\`\`sql
SELECT * FROM range(5) t1(x)
EXCEPT
SELECT * FROM range(2) t2(x);
\`\`\`

| x |
|--:|
| 2 |
| 3 |
| 4 |

### \`EXCEPT ALL\` (Bag Semantics)

\`EXCEPT ALL\` uses bag semantics:

\`\`\`sql
SELECT unnest([5, 5, 6, 6, 6, 6, 7, 8]) AS x
EXCEPT ALL
SELECT unnest([5, 6, 6, 7, 7, 9]);
\`\`\`

| x |
|--:|
| 5 |
| 8 |
| 6 |
| 6 |

## Syntax

<div id="rrdiagram"></div>
`,"star.md":`---
title: Star Expression
---

## Syntax

<div id="rrdiagram"></div>

The \`*\` expression can be used in a \`SELECT\` statement to select all columns that are projected in the \`FROM\` clause.

\`\`\`sql
SELECT *
FROM tbl;
\`\`\`

### \`TABLE.*\` and \`STRUCT.*\`

The \`*\` expression can be prepended by a table name to select only columns from that table.

\`\`\`sql
SELECT tbl.*
FROM tbl
JOIN other_tbl USING (id);
\`\`\`

Similarly, the \`*\` expression can also be used to retrieve all keys from a struct as separate columns.
This is particularly useful when a prior operation creates a struct of unknown shape, or if a query must handle any potential struct keys.
See the [\`STRUCT\` data type]({% link docs/stable/sql/data_types/struct.md %}) and [\`STRUCT\` functions]({% link docs/stable/sql/functions/struct.md %}) pages for more details on working with structs.

For example:

\`\`\`sql
SELECT st.* FROM (SELECT {'x': 1, 'y': 2, 'z': 3} AS st);
\`\`\`

| x | y | z |
|--:|--:|--:|
| 1 | 2 | 3 |


### \`EXCLUDE\` Clause

\`EXCLUDE\` allows you to exclude specific columns from the \`*\` expression.

\`\`\`sql
SELECT * EXCLUDE (col)
FROM tbl;
\`\`\`

### \`REPLACE\` Clause

\`REPLACE\` allows you to replace specific columns by alternative expressions.

\`\`\`sql
SELECT * REPLACE (col1 / 1_000 AS col1, col2 / 1_000 AS col2)
FROM tbl;
\`\`\`

### \`RENAME\` Clause

\`RENAME\` allows you to replace specific columns.

\`\`\`sql
SELECT * RENAME (col1 AS height, col2 AS width)
FROM tbl;
\`\`\`

### Column Filtering via Pattern Matching Operators

The [pattern matching operators]({% link docs/stable/sql/functions/pattern_matching.md %}) \`LIKE\`, \`GLOB\`, \`SIMILAR TO\` and their variants allow you to select columns by matching their names to patterns.

\`\`\`sql
SELECT * LIKE 'col%'
FROM tbl;
\`\`\`

\`\`\`sql
SELECT * GLOB 'col*'
FROM tbl;
\`\`\`

\`\`\`sql
SELECT * SIMILAR TO 'col.'
FROM tbl;
\`\`\`

## \`COLUMNS\` Expression


The \`COLUMNS\` expression is similar to the regular star expression, but additionally allows you to execute the same expression on the resulting columns.

\`\`\`sql
CREATE TABLE numbers (id INTEGER, number INTEGER);
INSERT INTO numbers VALUES (1, 10), (2, 20), (3, NULL);
SELECT min(COLUMNS(*)), count(COLUMNS(*)) FROM numbers;
\`\`\`

| id | number | id | number |
|---:|-------:|---:|-------:|
| 1  | 10     | 3  | 2      |

\`\`\`sql
SELECT
    min(COLUMNS(* REPLACE (number + id AS number))),
    count(COLUMNS(* EXCLUDE (number)))
FROM numbers;
\`\`\`

| id | min(number := (number + id)) | id |
|---:|-----------------------------:|---:|
| 1  | 11                           | 3  |

\`COLUMNS\` expressions can also be combined, as long as they contain the same star expression:

\`\`\`sql
SELECT COLUMNS(*) + COLUMNS(*) FROM numbers;
\`\`\`

| id | number |
|---:|-------:|
| 2  | 20     |
| 4  | 40     |
| 6  | NULL   |


### \`COLUMNS\` Expression in a \`WHERE\` Clause

\`COLUMNS\` expressions can also be used in \`WHERE\` clauses. The conditions are applied to all columns and are combined using the logical \`AND\` operator.

\`\`\`sql
SELECT *
FROM (
    SELECT 'a', 'a'
    UNION ALL
    SELECT 'a', 'b'
    UNION ALL
    SELECT 'b', 'b'
) _(x, y)
WHERE COLUMNS(*) = 'a'; -- equivalent to: x = 'a' AND y = 'a'
\`\`\`

| x | y |
|--:|--:|
| a | a |

To combine conditions using the logical \`OR\` operator, you can \`UNPACK\` the \`COLUMNS\` expression into the variadic \`greatest\` function.

\`\`\`sql
SELECT *
FROM (
    SELECT 'a', 'a'
    UNION ALL
    SELECT 'a', 'b'
    UNION ALL
    SELECT 'b', 'b'
) _(x, y)
WHERE greatest(UNPACK(COLUMNS(*) = 'a')); -- equivalent to: x = 'a' OR y = 'a'
\`\`\`

| x | y |
|--:|--:|
| a | a |
| a | b |

### Regular Expressions in a \`COLUMNS\` Expression

\`COLUMNS\` expressions don't currently support the pattern matching operators, but they do support regular expression matching by simply passing a string constant in place of the star:

\`\`\`sql
SELECT COLUMNS('(id|numbers?)') FROM numbers;
\`\`\`

| id | number |
|---:|-------:|
| 1  | 10     |
| 2  | 20     |
| 3  | NULL   |

### Renaming Columns with Regular Expressions in a \`COLUMNS\` Expression

The matches of capture groups in regular expressions can be used to rename matching columns.
The capture groups are one-indexed; \`\\0\` is the original column name.

For example, to select the first three letters of column names, run:

\`\`\`sql
SELECT COLUMNS('(\\w{3}).*') AS '\\1' FROM numbers;
\`\`\`

| id | num  |
|---:|-----:|
| 1  | 10   |
| 2  | 20   |
| 3  | NULL |

To remove a colon (\`:\`) character in the middle of a column name, run:

\`\`\`sql
CREATE TABLE tbl ("Foo:Bar" INTEGER, "Foo:Baz" INTEGER, "Foo:Qux" INTEGER);
SELECT COLUMNS('(\\w*):(\\w*)') AS '\\1\\2' FROM tbl;
\`\`\`

To add the original column name to the expression alias, run:

\`\`\`sql
SELECT min(COLUMNS(*)) AS "min_\\0" FROM numbers;
\`\`\`

| min_id | min_number |
|-------:|-----------:|
|      1 |         10 |

### \`COLUMNS\` Lambda Function

\`COLUMNS\` also supports passing in a lambda function. The lambda function will be evaluated for all columns present in the \`FROM\` clause, and only columns that match the lambda function will be returned. This allows the execution of arbitrary expressions in order to select and rename columns.

\`\`\`sql
SELECT COLUMNS(lambda c: c LIKE '%num%') FROM numbers;
\`\`\`

| number |
|-------:|
| 10     |
| 20     |
| NULL   |


### \`COLUMNS\` List

\`COLUMNS\` also supports passing in a list of column names.

\`\`\`sql
SELECT COLUMNS(['id', 'num']) FROM numbers;
\`\`\`

| id | num  |
|---:|-----:|
| 1  | 10   |
| 2  | 20   |
| 3  | NULL |

## Unpacking a \`COLUMNS\` Expression

By wrapping a \`COLUMN\` expression in \`UNPACK\`, the columns expand into a parent expression,  much like the [iterable unpacking behavior in Python](https://peps.python.org/pep-3132/).

Without \`UNPACK\`, operations on the \`COLUMNS\` expression are applied to each column separately:

\`\`\`sql
SELECT coalesce(COLUMNS(['a', 'b', 'c'])) AS result
FROM (SELECT NULL a, 42 b, true c);
\`\`\`

| result | result | result |
|--------|-------:|-------:|
| NULL   | 42     | true   |

With \`UNPACK\`, the \`COLUMNS\` expression is expanded into its parent expression, \`coalesce\` in the example above, which results in a single column:

\`\`\`sql
SELECT coalesce(UNPACK(COLUMNS(['a', 'b', 'c']))) AS result
FROM (SELECT NULL AS a, 42 AS b, true AS c);
\`\`\`

| result |
|-------:|
| 42     |

The \`UNPACK\` keyword may be replaced by \`*\`, [matching Python syntax](https://peps.python.org/pep-3132/), when it is applied directly to the \`COLUMNS\` expression without any intermediate operations.

\`\`\`sql
SELECT coalesce(*COLUMNS(*)) AS result
FROM (SELECT NULL a, 42 AS b, true AS c);
\`\`\`

| result |
|-------:|
| 42     |

> Warning In the following example, replacing \`UNPACK\` by \`*\` results in a syntax error:
> 
> \`\`\`sql
> SELECT greatest(UNPACK(COLUMNS(*) + 1)) AS result
> FROM (SELECT 1 AS a, 2 AS b, 3 AS c);
> \`\`\`
> 
> | result |
> |-------:|
> | 4      |

## \`STRUCT.*\`

The \`*\` expression can also be used to retrieve all keys from a struct as separate columns.
This is particularly useful when a prior operation creates a struct of unknown shape, or if a query must handle any potential struct keys.
See the [\`STRUCT\` data type]({% link docs/stable/sql/data_types/struct.md %}) and [\`STRUCT\` functions]({% link docs/stable/sql/functions/struct.md %}) pages for more details on working with structs.

For example:

\`\`\`sql
SELECT st.* FROM (SELECT {'x': 1, 'y': 2, 'z': 3} AS st);
\`\`\`

| x | y | z |
|--:|--:|--:|
| 1 | 2 | 3 |
`,"struct.md":"---\ntitle: Struct Functions\n---\n\n<!-- markdownlint-disable MD001 -->\n\n| Name | Description |\n|:--|:-------|\n| [`struct.entry`](#structentry) | Dot notation that serves as an alias for `struct_extract` from named `STRUCT`s. |\n| [`struct[entry]`](#structentry) | Bracket notation that serves as an alias for `struct_extract` from named `STRUCT`s. |\n| [`struct[idx]`](#structidx) | Bracket notation that serves as an alias for `struct_extract` from unnamed `STRUCT`s (tuples), using an index (1-based). |\n| [`row(any, ...)`](#rowany-) | Create an unnamed `STRUCT` (tuple) containing the argument values. |\n| [`struct_concat(structs...)`](#struct_concatstructs) | Merge the multiple `structs` into a single `STRUCT`. |\n| [`struct_contains(struct, entry)`](#struct_containsstruct-entry) | Check if the `STRUCT` contains the specified entry. |\n| [`struct_extract(struct, 'entry')`](#struct_extractstruct-entry) | Extract the named entry from the `STRUCT`. |\n| [`struct_extract(struct, idx)`](#struct_extractstruct-idx) | Extract the entry from an unnamed `STRUCT` (tuple) using an index (1-based). |\n| [`struct_extract_at(struct, idx)`](#struct_extract_atstruct-idx) | Extract the entry from a `STRUCT` (tuple) using an index (1-based). |\n| [`struct_insert(struct, name := any, ...)`](#struct_insertstruct-name--any-) | Add field(s) to an existing `STRUCT`. |\n| [`struct_pack(name := any, ...)`](#struct_packname--any-) | Create a `STRUCT` containing the argument values. The entry name will be the bound variable name. |\n| [`struct_position(struct, entry)`](#struct_positionstruct-entry) | Return the index of the entry within the `STRUCT` (1-based), or `NULL` if not found. |\n| [`struct_update(struct, name := any, ...)`](#struct_updatestruct-name--any-) | Add or update field(s) of an existing `STRUCT`. |\n\n#### `struct.entry`\n\n<div class=\"nostroke_table\"></div>\n\n| **Description** | Dot notation that serves as an alias for `struct_extract` from named `STRUCT`s. |\n| **Example** | `({'i': 3, 's': 'string'}).i` |\n| **Result** | `3` |\n\n#### `struct[entry]`\n\n<div class=\"nostroke_table\"></div>\n\n| **Description** | Bracket notation that serves as an alias for `struct_extract` from named `STRUCT`s. |\n| **Example** | `({'i': 3, 's': 'string'})['i']` |\n| **Result** | `3` |\n\n#### `struct[idx]`\n\n<div class=\"nostroke_table\"></div>\n\n| **Description** | Bracket notation that serves as an alias for `struct_extract` from unnamed `STRUCT`s (tuples), using an index (1-based). |\n| **Example** | `(row(42, 84))[1]` |\n| **Result** | `42` |\n\n#### `row(any, ...)`\n\n<div class=\"nostroke_table\"></div>\n\n| **Description** | Create an unnamed `STRUCT` (tuple) containing the argument values. |\n| **Example** | `row(i, i % 4, i / 4)` |\n| **Result** | `(10, 2, 2.5)` |\n\n#### `struct_concat(structs...)`\n\n<div class=\"nostroke_table\"></div>\n\n| **Description** | Merge the multiple `structs` into a single `STRUCT`. |\n| **Example** | `struct_concat(struct_pack(i := 4), struct_pack(s := 'string'))` |\n| **Result** | `{'i': 4, 's': string}` |\n\n#### `struct_contains(struct, entry)`\n\n<div class=\"nostroke_table\"></div>\n\n| **Description** | Check if the `STRUCT` contains the specified entry. |\n| **Example** | `struct_contains(row(1, 2, 3), 2)` |\n| **Result** | `true` |\n| **Alias** | `struct_has` |\n\n#### `struct_extract(struct, 'entry')`\n\n<div class=\"nostroke_table\"></div>\n\n| **Description** | Extract the named entry from the `STRUCT`. |\n| **Example** | `struct_extract({'i': 3, 'v2': 3, 'v3': 0}, 'i')` |\n| **Result** | `3` |\n\n#### `struct_extract(struct, idx)`\n\n<div class=\"nostroke_table\"></div>\n\n| **Description** | Extract the entry from an unnamed `STRUCT` (tuple) using an index (1-based). |\n| **Example** | `struct_extract(row(42, 84), 1)` |\n| **Result** | `42` |\n\n#### `struct_extract_at(struct, idx)`\n\n<div class=\"nostroke_table\"></div>\n\n| **Description** | Extract the entry from a `STRUCT` (tuple) using an index (1-based). |\n| **Example** | `struct_extract_at({'v1': 10, 'v2': 20, 'v3': 3}, 20)` |\n| **Result** | `20` |\n\n#### `struct_insert(struct, name := any, ...)`\n\n<div class=\"nostroke_table\"></div>\n\n| **Description** | Add field(s) to an existing `STRUCT`. |\n| **Example** | `struct_insert({'a': 1}, b := 2)` |\n| **Result** | `{'a': 1, 'b': 2}` |\n\n#### `struct_pack(name := any, ...)`\n\n<div class=\"nostroke_table\"></div>\n\n| **Description** | Create a `STRUCT` containing the argument values. The entry name will be the bound variable name. |\n| **Example** | `struct_pack(i := 4, s := 'string')` |\n| **Result** | `{'i': 4, 's': string}` |\n\n#### `struct_position(struct, entry)`\n\n<div class=\"nostroke_table\"></div>\n\n| **Description** | Return the index of the entry within the `STRUCT` (1-based), or `NULL` if not found. |\n| **Example** | `struct_position(row(1, 2, 3), 2)` |\n| **Result** | `2` |\n| **Alias** | `struct_indexof` |\n\n#### `struct_update(struct, name := any, ...)`\n\n<div class=\"nostroke_table\"></div>\n\n| **Description** | Add or update field(s) of an existing `STRUCT`. |\n| **Example** | `struct_insert({'a': 1, 'b': 2}, b := 3, c := 4)` |\n| **Result** | `{'a': 1, 'b': 3, 'c': 4}` |\n","subqueries.md":`---
title: Subqueries
---

Subqueries are parenthesized query expressions that appear as part of a larger, outer query. Subqueries are usually based on \`SELECT ... FROM\`, but in DuckDB other query constructs such as [\`PIVOT\`]({% link docs/stable/sql/statements/pivot.md %}) can also appear as a subquery.

## Scalar Subquery

<div id="rrdiagram1"></div>

Scalar subqueries are subqueries that return a single value. They can be used anywhere where an expression can be used. If a scalar subquery returns more than a single value, an error is raised (unless \`scalar_subquery_error_on_multiple_rows\` is set to \`false\`, in which case a row is selected randomly).

Consider the following table:

### Grades

| grade | course |
|---:|:---|
| 7 | Math |
| 9 | Math |
| 8 | CS |

\`\`\`sql
CREATE TABLE grades (grade INTEGER, course VARCHAR);
INSERT INTO grades VALUES (7, 'Math'), (9, 'Math'), (8, 'CS');
\`\`\`

We can run the following query to obtain the minimum grade:

\`\`\`sql
SELECT min(grade) FROM grades;
\`\`\`

| min(grade) |
|-----------:|
| 7          |

By using a scalar subquery in the \`WHERE\` clause, we can figure out for which course this grade was obtained:

\`\`\`sql
SELECT course FROM grades WHERE grade = (SELECT min(grade) FROM grades);
\`\`\`

| course |
|--------|
| Math   |

## \`ARRAY\` Subqueries

Subqueries that return multiple values can be wrapped with \`ARRAY\` to collect all results in a list.

\`\`\`sql
SELECT ARRAY(SELECT grade FROM grades) AS all_grades;
\`\`\`

| all_grades |
|-----------:|
| [7, 9, 8]  |



## Subquery Comparisons: \`ALL\`, \`ANY\` and \`SOME\`

In the section on [scalar subqueries](#scalar-subquery), a scalar expression was compared directly to a subquery using the equality [comparison operator]({% link docs/stable/sql/expressions/comparison_operators.md %}#comparison-operators) (\`=\`).
Such direct comparisons only make sense with scalar subqueries.

Scalar expressions can still be compared to single-column subqueries returning multiple rows by specifying a quantifier. Available quantifiers are \`ALL\`, \`ANY\` and \`SOME\`. The quantifiers \`ANY\` and \`SOME\` are equivalent.

### \`ALL\`

The \`ALL\` quantifier specifies that the comparison as a whole evaluates to \`true\` when the individual comparison results of _the expression at the left hand side of the comparison operator_ with each of the values from _the subquery at the right hand side of the comparison operator_ **all** evaluate to \`true\`:

\`\`\`sql
SELECT 6 <= ALL (SELECT grade FROM grades) AS adequate;
\`\`\`

returns:

| adequate |
|----------|
| true     |

because 6 is less than or equal to each of the subquery results 7, 8 and 9.

However, the following query

\`\`\`sql
SELECT 8 >= ALL (SELECT grade FROM grades) AS excellent;
\`\`\`

returns

| excellent |
|-----------|
| false     |

because 8 is not greater than or equal to the subquery result 7. And thus, because not all comparisons evaluate \`true\`, \`>= ALL\` as a whole evaluates to \`false\`.

### \`ANY\`

The \`ANY\` quantifier specifies that the comparison as a whole evaluates to \`true\` when at least one of the individual comparison results evaluates to \`true\`.
For example:

\`\`\`sql
SELECT 5 >= ANY (SELECT grade FROM grades) AS fail;
\`\`\`

returns

| fail  |
|-------|
| false |

because no result of the subquery is less than or equal to 5.

The quantifier \`SOME\` maybe used instead of \`ANY\`: \`ANY\` and \`SOME\` are interchangeable.

## \`EXISTS\`

<div id="rrdiagram2"></div>

The \`EXISTS\` operator tests for the existence of any row inside the subquery. It returns either true when the subquery returns one or more records, and false otherwise. The \`EXISTS\` operator is generally the most useful as a *correlated* subquery to express semijoin operations. However, it can be used as an uncorrelated subquery as well.

For example, we can use it to figure out if there are any grades present for a given course:

\`\`\`sql
SELECT EXISTS (FROM grades WHERE course = 'Math') AS math_grades_present;
\`\`\`

| math_grades_present |
|--------------------:|
| true                |

\`\`\`sql
SELECT EXISTS (FROM grades WHERE course = 'History') AS history_grades_present;
\`\`\`

| history_grades_present |
|-----------------------:|
| false                  |

> The subqueries in the examples above make use of the fact that you can omit the \`SELECT *\` in DuckDB thanks to the [\`FROM\`-first syntax]({% link docs/stable/sql/query_syntax/from.md %}). The \`SELECT\` clause is required in subqueries by other SQL systems but cannot fulfill any purpose in \`EXISTS\` and \`NOT EXISTS\` subqueries.

### \`NOT EXISTS\`

The \`NOT EXISTS\` operator tests for the absence of any row inside the subquery. It returns either true when the subquery returns an empty result, and false otherwise. The \`NOT EXISTS\` operator is generally the most useful as a *correlated* subquery to express antijoin operations. For example, to find Person nodes without an interest:

\`\`\`sql
CREATE TABLE Person (id BIGINT, name VARCHAR);
CREATE TABLE interest (PersonId BIGINT, topic VARCHAR);

INSERT INTO Person VALUES (1, 'Jane'), (2, 'Joe');
INSERT INTO interest VALUES (2, 'Music');

SELECT *
FROM Person
WHERE NOT EXISTS (FROM interest WHERE interest.PersonId = Person.id);
\`\`\`

| id | name |
|---:|------|
| 1  | Jane |

> DuckDB automatically detects when a \`NOT EXISTS\` query expresses an antijoin operation. There is no need to manually rewrite such queries to use \`LEFT OUTER JOIN ... WHERE ... IS NULL\`.

## \`IN\` Operator

<div id="rrdiagram3"></div>

The \`IN\` operator checks containment of the left expression inside the result defined by the subquery or the set of expressions on the right hand side (RHS). The \`IN\` operator returns true if the expression is present in the RHS, false if the expression is not in the RHS and the RHS has no \`NULL\` values, or \`NULL\` if the expression is not in the RHS and the RHS has \`NULL\` values.

We can use the \`IN\` operator in a similar manner as we used the \`EXISTS\` operator:

\`\`\`sql
SELECT 'Math' IN (SELECT course FROM grades) AS math_grades_present;
\`\`\`

| math_grades_present |
|--------------------:|
| true                |

## Correlated Subqueries

All the subqueries presented here so far have been **uncorrelated** subqueries, where the subqueries themselves are entirely self-contained and can be run without the parent query. There exists a second type of subqueries called **correlated** subqueries. For correlated subqueries, the subquery uses values from the parent subquery.

Conceptually, the subqueries are run once for every single row in the parent query. Perhaps a simple way of envisioning this is that the correlated subquery is a **function** that is applied to every row in the source dataset.

For example, suppose that we want to find the minimum grade for every course. We could do that as follows:

\`\`\`sql
SELECT *
FROM grades grades_parent
WHERE grade =
    (SELECT min(grade)
     FROM grades
     WHERE grades.course = grades_parent.course);
\`\`\`

| grade | course |
|------:|--------|
| 7     | Math   |
| 8     | CS     |

The subquery uses a column from the parent query (\`grades_parent.course\`). Conceptually, we can see the subquery as a function where the correlated column is a parameter to that function:

\`\`\`sql
SELECT min(grade)
FROM grades
WHERE course = ?;
\`\`\`

Now when we execute this function for each of the rows, we can see that for \`Math\` this will return \`7\`, and for \`CS\` it will return \`8\`. We then compare it against the grade for that actual row. As a result, the row \`(Math, 9)\` will be filtered out, as \`9 <> 7\`.

## Returning Each Row of the Subquery as a Struct

Using the name of a subquery in the \`SELECT\` clause (without referring to a specific column) turns each row of the subquery into a struct whose fields correspond to the columns of the subquery. For example:

\`\`\`sql
SELECT t
FROM (SELECT unnest(generate_series(41, 43)) AS x, 'hello' AS y) t;
\`\`\`

<div class="monospace_table"></div>

|           t           |
|-----------------------|
| {'x': 41, 'y': hello} |
| {'x': 42, 'y': hello} |
| {'x': 43, 'y': hello} |
`,"text.md":"---\ntitle: Text Functions\n---\n\n<!-- markdownlint-disable MD001 -->\n\n## Text Functions and Operators\n\nThis section describes functions and operators for examining and manipulating [`STRING` values]({% link docs/stable/sql/data_types/text.md %}).\n\n<!-- Start of section generated by scripts/generate_sql_function_docs.py; categories: [string, regex] -->\n<!-- markdownlint-disable MD056 -->\n\n| Function | Description |\n|:--|:-------|\n| [`string[index]`](#stringindex) | Extracts a single character using a (1-based) `index`. |\n| [`string[begin:end]`](#stringbeginend) | Extracts a string using [slice conventions]({% link docs/stable/sql/functions/list.md %}#slicing) similar to Python. Missing `begin` or `end` arguments are interpreted as the beginning or end of the list respectively. Negative values are accepted. |\n| [`string LIKE target`](#string-like-target) | Returns `true` if the `string` matches the like specifier (see [Pattern Matching]({% link docs/stable/sql/functions/pattern_matching.md %})). |\n| [`string SIMILAR TO regex`](#string-similar-to-regex) | Returns `true` if the `string` matches the `regex` (see [Pattern Matching]({% link docs/stable/sql/functions/pattern_matching.md %})). |\n| [`string ^@ search_string`](#starts_withstring-search_string) | Alias for `starts_with`. |\n| [`arg1 || arg2`](#arg1--arg2) | Concatenates two strings, lists, or blobs. Any `NULL` input results in `NULL`. See also [`concat(arg1, arg2, ...)`]({% link docs/stable/sql/functions/text.md %}#concatvalue-) and [`list_concat(list1, list2, ...)`]({% link docs/stable/sql/functions/list.md %}#list_concatlist_1--list_n). |\n| [`array_extract(string, index)`](#array_extractstring-index) | Extracts a single character from a `string` using a (1-based) `index`. |\n| [`array_slice(list, begin, end)`](#array_slicelist-begin-end) | Extracts a sublist or substring using [slice conventions]({% link docs/stable/sql/functions/list.md %}#slicing). Negative values are accepted. |\n| [`ascii(string)`](#asciistring) | Returns an integer that represents the Unicode code point of the first character of the `string`. |\n| [`bar(x, min, max[, width])`](#barx-min-max-width) | Draws a band whose width is proportional to (`x - min`) and equal to `width` characters when `x` = `max`. `width` defaults to 80. |\n| [`base64(blob)`](#to_base64blob) | Alias for `to_base64`. |\n| [`bin(string)`](#binstring) | Converts the `string` to binary representation. |\n| [`bit_length(string)`](#bit_lengthstring) | Number of bits in a `string`. |\n| [`char_length(string)`](#lengthstring) | Alias for `length`. |\n| [`character_length(string)`](#lengthstring) | Alias for `length`. |\n| [`chr(code_point)`](#chrcode_point) | Returns a character which is corresponding the ASCII code value or Unicode code point. |\n| [`concat(value, ...)`](#concatvalue-) | Concatenates multiple strings or lists. `NULL` inputs are skipped. See also [operator `||`](#arg1--arg2). |\n| [`concat_ws(separator, string, ...)`](#concat_wsseparator-string-) | Concatenates many strings, separated by `separator`. `NULL` inputs are skipped. |\n| [`contains(string, search_string)`](#containsstring-search_string) | Returns `true` if `search_string` is found within `string`. Note that [collations]({% link docs/stable/sql/expressions/collations.md %}) are not supported. |\n| [`ends_with(string, search_string)`](#suffixstring-search_string) | Alias for `suffix`. |\n| [`format(format, ...)`](#formatformat-) | Formats a string using the [fmt syntax](#fmt-syntax). |\n| [`formatReadableDecimalSize(integer)`](#formatreadabledecimalsizeinteger) | Converts `integer` to a human-readable representation using units based on powers of 10 (KB, MB, GB, etc.). |\n| [`format_bytes(integer)`](#format_bytesinteger) | Converts `integer` to a human-readable representation using units based on powers of 2 (KiB, MiB, GiB, etc.). |\n| [`from_base64(string)`](#from_base64string) | Converts a base64 encoded `string` to a character string (`BLOB`). |\n| [`from_binary(value)`](#unbinvalue) | Alias for `unbin`. |\n| [`from_hex(value)`](#unhexvalue) | Alias for `unhex`. |\n| [`greatest(arg1, ...)`](#greatestarg1-) | Returns the largest value in lexicographical order. Note that lowercase characters are considered larger than uppercase characters and [collations]({% link docs/stable/sql/expressions/collations.md %}) are not supported. |\n| [`hash(value, ...)`](#hashvalue-) | Returns a `UBIGINT` with the hash of the `value`. Note that this is not a cryptographic hash. |\n| [`hex(string)`](#hexstring) | Converts the `string` to hexadecimal representation. |\n| [`ilike_escape(string, like_specifier, escape_character)`](#ilike_escapestring-like_specifier-escape_character) | Returns `true` if the `string` matches the `like_specifier` (see [Pattern Matching]({% link docs/stable/sql/functions/pattern_matching.md %})) using case-insensitive matching. `escape_character` is used to search for wildcard characters in the `string`. |\n| [`instr(string, search_string)`](#instrstring-search_string) | Returns location of first occurrence of `search_string` in `string`, counting from 1. Returns 0 if no match found. |\n| [`lcase(string)`](#lowerstring) | Alias for `lower`. |\n| [`least(arg1, ...)`](#leastarg1-) | Returns the smallest value in lexicographical order. Note that uppercase characters are considered smaller than lowercase characters and [collations]({% link docs/stable/sql/expressions/collations.md %}) are not supported. |\n| [`left(string, count)`](#leftstring-count) | Extracts the left-most count characters. |\n| [`left_grapheme(string, count)`](#left_graphemestring-count) | Extracts the left-most count grapheme clusters. |\n| [`len(string)`](#lengthstring) | Alias for `length`. |\n| [`length(string)`](#lengthstring) | Number of characters in `string`. |\n| [`length_grapheme(string)`](#length_graphemestring) | Number of grapheme clusters in `string`. |\n| [`like_escape(string, like_specifier, escape_character)`](#like_escapestring-like_specifier-escape_character) | Returns `true` if the `string` matches the `like_specifier` (see [Pattern Matching]({% link docs/stable/sql/functions/pattern_matching.md %})) using case-sensitive matching. `escape_character` is used to search for wildcard characters in the `string`. |\n| [`lower(string)`](#lowerstring) | Converts `string` to lower case. |\n| [`lpad(string, count, character)`](#lpadstring-count-character) | Pads the `string` with the `character` on the left until it has `count` characters. Truncates the `string` on the right if it has more than `count` characters. |\n| [`ltrim(string[, characters])`](#ltrimstring-characters) | Removes any occurrences of any of the `characters` from the left side of the `string`. `characters` defaults to `space`. |\n| [`md5(string)`](#md5string) | Returns the MD5 hash of the `string` as a `VARCHAR`. |\n| [`md5_number(string)`](#md5_numberstring) | Returns the MD5 hash of the `string` as a `HUGEINT`. |\n| [`md5_number_lower(string)`](#md5_number_lowerstring) | Returns the lower 64-bit segment of the MD5 hash of the `string` as a `UBIGINT`. |\n| [`md5_number_upper(string)`](#md5_number_upperstring) | Returns the upper 64-bit segment of the MD5 hash of the `string` as a `UBIGINT`. |\n| [`nfc_normalize(string)`](#nfc_normalizestring) | Converts `string` to Unicode NFC normalized string. Useful for comparisons and ordering if text data is mixed between NFC normalized and not. |\n| [`not_ilike_escape(string, like_specifier, escape_character)`](#not_ilike_escapestring-like_specifier-escape_character) | Returns `false` if the `string` matches the `like_specifier` (see [Pattern Matching]({% link docs/stable/sql/functions/pattern_matching.md %})) using case-insensitive matching. `escape_character` is used to search for wildcard characters in the `string`. |\n| [`not_like_escape(string, like_specifier, escape_character)`](#not_like_escapestring-like_specifier-escape_character) | Returns `false` if the `string` matches the `like_specifier` (see [Pattern Matching]({% link docs/stable/sql/functions/pattern_matching.md %})) using case-sensitive matching. `escape_character` is used to search for wildcard characters in the `string`. |\n| [`ord(string)`](#unicodestring) | Alias for `unicode`. |\n| [`parse_dirname(path[, separator])`](#parse_dirnamepath-separator) | Returns the top-level directory name from the given `path`. `separator` options: `system`, `both_slash` (default), `forward_slash`, `backslash`. |\n| [`parse_dirpath(path[, separator])`](#parse_dirpathpath-separator) | Returns the head of the `path` (the pathname until the last slash) similarly to Python's [`os.path.dirname`](https://docs.python.org/3.7/library/os.path.html#os.path.dirname). `separator` options: `system`, `both_slash` (default), `forward_slash`, `backslash`. |\n| [`parse_filename(string[, trim_extension][, separator])`](#parse_filenamestring-trim_extension-separator) | Returns the last component of the `path` similarly to Python's [`os.path.basename`](https://docs.python.org/3.7/library/os.path.html#os.path.basename) function. If `trim_extension` is `true`, the file extension will be removed (defaults to `false`). `separator` options: `system`, `both_slash` (default), `forward_slash`, `backslash`. |\n| [`parse_path(path[, separator])`](#parse_pathpath-separator) | Returns a list of the components (directories and filename) in the `path` similarly to Python's [`pathlib.parts`](https://docs.python.org/3/library/pathlib.html#pathlib.PurePath.parts) function. `separator` options: `system`, `both_slash` (default), `forward_slash`, `backslash`. |\n| [`position(search_string IN string)`](#positionsearch_string-in-string) | Return location of first occurrence of `search_string` in `string`, counting from 1. Returns 0 if no match found. |\n| [`position(string, search_string)`](#instrstring-search_string) | Alias for `instr`. |\n| [`prefix(string, search_string)`](#prefixstring-search_string) | Returns `true` if `string` starts with `search_string`. |\n| [`printf(format, ...)`](#printfformat-) | Formats a `string` using [printf syntax](#printf-syntax). |\n| [`read_text(source)`](#read_textsource) | Returns the content from `source` (a filename, a list of filenames, or a glob pattern) as a `VARCHAR`. The file content is first validated to be valid UTF-8. If `read_text` attempts to read a file with invalid UTF-8 an error is thrown suggesting to use `read_blob` instead. See the [`read_text` guide]({% link docs/stable/guides/file_formats/read_file.md %}#read_text) for more details. |\n| [`regexp_escape(string)`](#regexp_escapestring) | Escapes special patterns to turn `string` into a regular expression similarly to Python's [`re.escape` function](https://docs.python.org/3/library/re.html#re.escape). |\n| [`regexp_extract(string, regex[, group][, options])`](#regexp_extractstring-regex-group-options) | If `string` contains the `regex` pattern, returns the capturing group specified by optional parameter `group`; otherwise, returns the empty string. The `group` must be a constant value. If no `group` is given, it defaults to 0. A set of optional [regex `options`]({% link docs/stable/sql/functions/regular_expressions.md %}#options-for-regular-expression-functions) can be set. |\n| [`regexp_extract(string, regex, name_list[, options])`](#regexp_extractstring-regex-name_list-options) | If `string` contains the `regex` pattern, returns the capturing groups as a struct with corresponding names from `name_list`; otherwise, returns a struct with the same keys and empty strings as values. A set of optional [regex `options`]({% link docs/stable/sql/functions/regular_expressions.md %}#options-for-regular-expression-functions) can be set. |\n| [`regexp_extract_all(string, regex[, group][, options])`](#regexp_extract_allstring-regex-group-options) | Finds non-overlapping occurrences of the `regex` in the `string` and returns the corresponding values of the capturing `group`. A set of optional [regex `options`]({% link docs/stable/sql/functions/regular_expressions.md %}#options-for-regular-expression-functions) can be set. |\n| [`regexp_full_match(string, regex[, col2])`](#regexp_full_matchstring-regex-col2) | Returns `true` if the entire `string` matches the `regex`. A set of optional [regex `options`]({% link docs/stable/sql/functions/regular_expressions.md %}#options-for-regular-expression-functions) can be set. |\n| [`regexp_matches(string, regex[, options])`](#regexp_matchesstring-regex-options) | Returns `true` if `string` contains the `regex`, `false` otherwise. A set of optional [regex `options`]({% link docs/stable/sql/functions/regular_expressions.md %}#options-for-regular-expression-functions) can be set. |\n| [`regexp_replace(string, regex, replacement[, options])`](#regexp_replacestring-regex-replacement-options) | If `string` contains the `regex`, replaces the matching part with `replacement`. A set of optional [regex `options`]({% link docs/stable/sql/functions/regular_expressions.md %}#options-for-regular-expression-functions) can be set. |\n| [`regexp_split_to_array(string, regex[, options])`](#string_split_regexstring-regex-options) | Alias for `string_split_regex`. |\n| [`regexp_split_to_table(string, regex)`](#regexp_split_to_tablestring-regex) | Splits the `string` along the `regex` and returns a row for each part. |\n| [`repeat(string, count)`](#repeatstring-count) | Repeats the `string` `count` number of times. |\n| [`replace(string, source, target)`](#replacestring-source-target) | Replaces any occurrences of the `source` with `target` in `string`. |\n| [`reverse(string)`](#reversestring) | Reverses the `string`. |\n| [`right(string, count)`](#rightstring-count) | Extract the right-most `count` characters. |\n| [`right_grapheme(string, count)`](#right_graphemestring-count) | Extracts the right-most `count` grapheme clusters. |\n| [`rpad(string, count, character)`](#rpadstring-count-character) | Pads the `string` with the `character` on the right until it has `count` characters. Truncates the `string` on the right if it has more than `count` characters. |\n| [`rtrim(string[, characters])`](#rtrimstring-characters) | Removes any occurrences of any of the `characters` from the right side of the `string`. `characters` defaults to `space`. |\n| [`sha1(value)`](#sha1value) | Returns a `VARCHAR` with the SHA-1 hash of the `value`. |\n| [`sha256(value)`](#sha256value) | Returns a `VARCHAR` with the SHA-256 hash of the `value` |\n| [`split(string, separator)`](#string_splitstring-separator) | Alias for `string_split`. |\n| [`split_part(string, separator, index)`](#split_partstring-separator-index) | Splits the `string` along the `separator` and returns the data at the (1-based) `index` of the list. If the `index` is outside the bounds of the list, return an empty string (to match PostgreSQL's behavior). |\n| [`starts_with(string, search_string)`](#starts_withstring-search_string) | Returns `true` if `string` begins with `search_string`. |\n| [`str_split(string, separator)`](#string_splitstring-separator) | Alias for `string_split`. |\n| [`str_split_regex(string, regex[, options])`](#string_split_regexstring-regex-options) | Alias for `string_split_regex`. |\n| [`string_split(string, separator)`](#string_splitstring-separator) | Splits the `string` along the `separator`. |\n| [`string_split_regex(string, regex[, options])`](#string_split_regexstring-regex-options) | Splits the `string` along the `regex`. A set of optional [regex `options`]({% link docs/stable/sql/functions/regular_expressions.md %}#options-for-regular-expression-functions) can be set. |\n| [`string_to_array(string, separator)`](#string_splitstring-separator) | Alias for `string_split`. |\n| [`strip_accents(string)`](#strip_accentsstring) | Strips accents from `string`. |\n| [`strlen(string)`](#strlenstring) | Number of bytes in `string`. |\n| [`strpos(string, search_string)`](#instrstring-search_string) | Alias for `instr`. |\n| [`substr(string, start[, length])`](#substringstring-start-length) | Alias for `substring`. |\n| [`substring(string, start[, length])`](#substringstring-start-length) | Extracts substring starting from character `start` up to the end of the string. If optional argument `length` is set, extracts a substring of `length` characters instead. Note that a `start` value of `1` refers to the first character of the `string`. |\n| [`substring_grapheme(string, start[, length])`](#substring_graphemestring-start-length) | Extracts substring starting from grapheme clusters `start` up to the end of the string. If optional argument `length` is set, extracts a substring of `length` grapheme clusters instead. Note that a `start` value of `1` refers to the `first` character of the `string`. |\n| [`suffix(string, search_string)`](#suffixstring-search_string) | Returns `true` if `string` ends with `search_string`. Note that [collations]({% link docs/stable/sql/expressions/collations.md %}) are not supported. |\n| [`to_base(number, radix[, min_length])`](#to_basenumber-radix-min_length) | Converts `number` to a string in the given base `radix`, optionally padding with leading zeros to `min_length`. |\n| [`to_base64(blob)`](#to_base64blob) | Converts a `blob` to a base64 encoded string. |\n| [`to_binary(string)`](#binstring) | Alias for `bin`. |\n| [`to_hex(string)`](#hexstring) | Alias for `hex`. |\n| [`translate(string, from, to)`](#translatestring-from-to) | Replaces each character in `string` that matches a character in the `from` set with the corresponding character in the `to` set. If `from` is longer than `to`, occurrences of the extra characters in `from` are deleted. |\n| [`trim(string[, characters])`](#trimstring-characters) | Removes any occurrences of any of the `characters` from either side of the `string`. `characters` defaults to `space`. |\n| [`ucase(string)`](#upperstring) | Alias for `upper`. |\n| [`unbin(value)`](#unbinvalue) | Converts a `value` from binary representation to a blob. |\n| [`unhex(value)`](#unhexvalue) | Converts a `value` from hexadecimal representation to a blob. |\n| [`unicode(string)`](#unicodestring) | Returns an `INTEGER` representing the `unicode` codepoint of the first character in the `string`. |\n| [`upper(string)`](#upperstring) | Converts `string` to upper case. |\n| [`url_decode(string)`](#url_decodestring) | Decodes a URL from a representation using [Percent-Encoding](https://datatracker.ietf.org/doc/html/rfc3986#section-2.1). |\n| [`url_encode(string)`](#url_encodestring) | Encodes a URL to a representation using [Percent-Encoding](https://datatracker.ietf.org/doc/html/rfc3986#section-2.1). |\n\n<!-- markdownlint-enable MD056 -->\n\n#### `string[index]`\n\n<div class=\"nostroke_table\"></div>\n\n| **Description** | Extracts a single character using a (1-based) `index`. |\n| **Example** | `'DuckDB'[4]` |\n| **Result** | `k` |\n| **Alias** | `array_extract` |\n\n#### `string[begin:end]`\n\n<div class=\"nostroke_table\"></div>\n\n| **Description** | Extracts a string using [slice conventions]({% link docs/stable/sql/functions/list.md %}#slicing) similar to Python. Missing `begin` or `end` arguments are interpreted as the beginning or end of the list respectively. Negative values are accepted. |\n| **Example** | `'DuckDB'[:4]` |\n| **Result** | `Duck` |\n| **Alias** | `array_slice` |\n\n#### `string LIKE target`\n\n<div class=\"nostroke_table\"></div>\n\n| **Description** | Returns `true` if the `string` matches the like specifier (see [Pattern Matching]({% link docs/stable/sql/functions/pattern_matching.md %})). |\n| **Example** | `'hello' LIKE '%lo'` |\n| **Result** | `true` |\n\n#### `string SIMILAR TO regex`\n\n<div class=\"nostroke_table\"></div>\n\n| **Description** | Returns `true` if the `string` matches the `regex` (see [Pattern Matching]({% link docs/stable/sql/functions/pattern_matching.md %})). |\n| **Example** | `'hello' SIMILAR TO 'l+'` |\n| **Result** | `false` |\n| **Alias** | `regexp_full_match` |\n\n#### `arg1 || arg2`\n\n<div class=\"nostroke_table\"></div>\n\n| **Description** | Concatenates two strings, lists, or blobs. Any `NULL` input results in `NULL`. See also [`concat(arg1, arg2, ...)`]({% link docs/stable/sql/functions/text.md %}#concatvalue-) and [`list_concat(list1, list2, ...)`]({% link docs/stable/sql/functions/list.md %}#list_concatlist_1--list_n). |\n| **Example 1** | `'Duck' || 'DB'` |\n| **Result** | `DuckDB` |\n| **Example 2** | `[1, 2, 3] || [4, 5, 6]` |\n| **Result** | `[1, 2, 3, 4, 5, 6]` |\n| **Example 3** | `'\\xAA'::BLOB || '\\xBB'::BLOB` |\n| **Result** | `\\xAA\\xBB` |\n\n#### `array_extract(string, index)`\n\n<div class=\"nostroke_table\"></div>\n\n| **Description** | Extracts a single character from a `string` using a (1-based) `index`. |\n| **Example** | `array_extract('DuckDB', 2)` |\n| **Result** | `u` |\n\n#### `array_slice(list, begin, end)`\n\n<div class=\"nostroke_table\"></div>\n\n| **Description** | Extracts a sublist or substring using [slice conventions]({% link docs/stable/sql/functions/list.md %}#slicing). Negative values are accepted. |\n| **Example 1** | `array_slice('DuckDB', 3, 4)` |\n| **Result** | `ck` |\n| **Example 2** | `array_slice('DuckDB', 3, NULL)` |\n| **Result** | `NULL` |\n| **Example 3** | `array_slice('DuckDB', 0, -3)` |\n| **Result** | `Duck` |\n| **Alias** | `list_slice` |\n\n#### `ascii(string)`\n\n<div class=\"nostroke_table\"></div>\n\n| **Description** | Returns an integer that represents the Unicode code point of the first character of the `string`. |\n| **Example** | `ascii('Ω')` |\n| **Result** | `937` |\n\n#### `bar(x, min, max[, width])`\n\n<div class=\"nostroke_table\"></div>\n\n| **Description** | Draws a band whose width is proportional to (`x - min`) and equal to `width` characters when `x` = `max`. `width` defaults to 80. |\n| **Example** | `bar(5, 0, 20, 10)` |\n| **Result** | `██▌       ` |\n\n#### `bin(string)`\n\n<div class=\"nostroke_table\"></div>\n\n| **Description** | Converts the `string` to binary representation. |\n| **Example** | `bin('Aa')` |\n| **Result** | `0100000101100001` |\n| **Alias** | `to_binary` |\n\n#### `bit_length(string)`\n\n<div class=\"nostroke_table\"></div>\n\n| **Description** | Number of bits in a `string`. |\n| **Example** | `bit_length('abc')` |\n| **Result** | `24` |\n\n#### `chr(code_point)`\n\n<div class=\"nostroke_table\"></div>\n\n| **Description** | Returns a character which is corresponding the ASCII code value or Unicode code point. |\n| **Example** | `chr(65)` |\n| **Result** | `A` |\n\n#### `concat(value, ...)`\n\n<div class=\"nostroke_table\"></div>\n\n| **Description** | Concatenates multiple strings or lists. `NULL` inputs are skipped. See also [operator `||`](#arg1--arg2). |\n| **Example 1** | `concat('Hello', ' ', 'World')` |\n| **Result** | `Hello World` |\n| **Example 2** | `concat([1, 2, 3], NULL, [4, 5, 6])` |\n| **Result** | `[1, 2, 3, 4, 5, 6]` |\n\n#### `concat_ws(separator, string, ...)`\n\n<div class=\"nostroke_table\"></div>\n\n| **Description** | Concatenates many strings, separated by `separator`. `NULL` inputs are skipped. |\n| **Example** | `concat_ws(', ', 'Banana', 'Apple', 'Melon')` |\n| **Result** | `Banana, Apple, Melon` |\n\n#### `contains(string, search_string)`\n\n<div class=\"nostroke_table\"></div>\n\n| **Description** | Returns `true` if `search_string` is found within `string`. |\n| **Example** | `contains('abc', 'a')` |\n| **Result** | `true` |\n\n#### `format(format, ...)`\n\n<div class=\"nostroke_table\"></div>\n\n| **Description** | Formats a string using the [fmt syntax](#fmt-syntax). |\n| **Example** | `format('Benchmark \"{}\" took {} seconds', 'CSV', 42)` |\n| **Result** | `Benchmark \"CSV\" took 42 seconds` |\n\n#### `formatReadableDecimalSize(integer)`\n\n<div class=\"nostroke_table\"></div>\n\n| **Description** | Converts `integer` to a human-readable representation using units based on powers of 10 (KB, MB, GB, etc.). |\n| **Example** | `formatReadableDecimalSize(16000)` |\n| **Result** | `16.0 kB` |\n\n#### `format_bytes(integer)`\n\n<div class=\"nostroke_table\"></div>\n\n| **Description** | Converts `integer` to a human-readable representation using units based on powers of 2 (KiB, MiB, GiB, etc.). |\n| **Example** | `format_bytes(16_000)` |\n| **Result** | `15.6 KiB` |\n| **Alias** | `formatReadableSize`, `pg_size_pretty` |\n\n#### `from_base64(string)`\n\n<div class=\"nostroke_table\"></div>\n\n| **Description** | Converts a base64 encoded `string` to a character string (`BLOB`). |\n| **Example** | `from_base64('QQ==')` |\n| **Result** | `A` |\n\n#### `greatest(arg1, ...)`\n\n<div class=\"nostroke_table\"></div>\n\n| **Description** | Returns the largest value in lexicographical order. Note that lowercase characters are considered larger than uppercase characters and [collations]({% link docs/stable/sql/expressions/collations.md %}) are not supported. |\n| **Example 1** | `greatest(42, 84)` |\n| **Result** | `84` |\n| **Example 2** | `greatest('abc', 'bcd', 'cde', 'EFG')` |\n| **Result** | `cde` |\n\n#### `hash(value, ...)`\n\n<div class=\"nostroke_table\"></div>\n\n| **Description** | Returns a `UBIGINT` with the hash of the `value`. Note that this is not a cryptographic hash. |\n| **Example** | `hash('🦆')` |\n| **Result** | `4164431626903154684` |\n\n#### `hex(string)`\n\n<div class=\"nostroke_table\"></div>\n\n| **Description** | Converts the `string` to hexadecimal representation. |\n| **Example** | `hex('Hello')` |\n| **Result** | `48656C6C6F` |\n| **Alias** | `to_hex` |\n\n#### `ilike_escape(string, like_specifier, escape_character)`\n\n<div class=\"nostroke_table\"></div>\n\n| **Description** | Returns `true` if the `string` matches the `like_specifier` (see [Pattern Matching]({% link docs/stable/sql/functions/pattern_matching.md %})) using case-insensitive matching. `escape_character` is used to search for wildcard characters in the `string`. |\n| **Example** | `ilike_escape('A%c', 'a$%C', '$')` |\n| **Result** | `true` |\n\n#### `instr(string, search_string)`\n\n<div class=\"nostroke_table\"></div>\n\n| **Description** | Returns location of first occurrence of `search_string` in `string`, counting from 1. Returns 0 if no match found. |\n| **Example** | `instr('test test', 'es')` |\n| **Result** | `2` |\n| **Aliases** | `position`, `strpos` |\n\n#### `least(arg1, ...)`\n\n<div class=\"nostroke_table\"></div>\n\n| **Description** | Returns the smallest value in lexicographical order. Note that uppercase characters are considered smaller than lowercase characters and [collations]({% link docs/stable/sql/expressions/collations.md %}) are not supported. |\n| **Example 1** | `least(42, 84)` |\n| **Result** | `42` |\n| **Example 2** | `least('abc', 'bcd', 'cde', 'EFG')` |\n| **Result** | `EFG` |\n\n#### `left(string, count)`\n\n<div class=\"nostroke_table\"></div>\n\n| **Description** | Extracts the left-most count characters. |\n| **Example** | `left('Hello🦆', 2)` |\n| **Result** | `He` |\n\n#### `left_grapheme(string, count)`\n\n<div class=\"nostroke_table\"></div>\n\n| **Description** | Extracts the left-most count grapheme clusters. |\n| **Example** | `left_grapheme('🤦🏼‍♂️🤦🏽‍♀️', 1)` |\n| **Result** | `🤦🏼‍♂️` |\n\n#### `length(string)`\n\n<div class=\"nostroke_table\"></div>\n\n| **Description** | Number of characters in `string`. |\n| **Example** | `length('Hello🦆')` |\n| **Result** | `6` |\n| **Aliases** | `char_length`, `character_length`, `len` |\n\n#### `length_grapheme(string)`\n\n<div class=\"nostroke_table\"></div>\n\n| **Description** | Number of grapheme clusters in `string`. |\n| **Example** | `length_grapheme('🤦🏼‍♂️🤦🏽‍♀️')` |\n| **Result** | `2` |\n\n#### `like_escape(string, like_specifier, escape_character)`\n\n<div class=\"nostroke_table\"></div>\n\n| **Description** | Returns `true` if the `string` matches the `like_specifier` (see [Pattern Matching]({% link docs/stable/sql/functions/pattern_matching.md %})) using case-sensitive matching. `escape_character` is used to search for wildcard characters in the `string`. |\n| **Example** | `like_escape('a%c', 'a$%c', '$')` |\n| **Result** | `true` |\n\n#### `lower(string)`\n\n<div class=\"nostroke_table\"></div>\n\n| **Description** | Converts `string` to lower case. |\n| **Example** | `lower('Hello')` |\n| **Result** | `hello` |\n| **Alias** | `lcase` |\n\n#### `lpad(string, count, character)`\n\n<div class=\"nostroke_table\"></div>\n\n| **Description** | Pads the `string` with the `character` on the left until it has `count` characters. Truncates the `string` on the right if it has more than `count` characters. |\n| **Example** | `lpad('hello', 8, '>')` |\n| **Result** | `>>>hello` |\n\n#### `ltrim(string[, characters])`\n\n<div class=\"nostroke_table\"></div>\n\n| **Description** | Removes any occurrences of any of the `characters` from the left side of the `string`. `characters` defaults to `space`. |\n| **Example 1** | <code class=\"language-plaintext highlighter-rouge\">ltrim('&nbsp;&nbsp;&nbsp;&nbsp;test&nbsp;&nbsp;')</code> |\n| **Result** | <code class=\"language-plaintext highlighter-rouge\">test&nbsp;&nbsp;</code> |\n| **Example 2** | `ltrim('>>>>test<<', '><')` |\n| **Result** | `test<<` |\n\n#### `md5(string)`\n\n<div class=\"nostroke_table\"></div>\n\n| **Description** | Returns the MD5 hash of the `string` as a `VARCHAR`. |\n| **Example** | `md5('abc')` |\n| **Result** | `900150983cd24fb0d6963f7d28e17f72` |\n\n#### `md5_number(string)`\n\n<div class=\"nostroke_table\"></div>\n\n| **Description** | Returns the MD5 hash of the `string` as a `HUGEINT`. |\n| **Example** | `md5_number('abc')` |\n| **Result** | `152195979970564155685860391459828531600` |\n\n#### `md5_number_lower(string)`\n\n<div class=\"nostroke_table\"></div>\n\n| **Description** | Returns the lower 64-bit segment of the MD5 hash of the `string` as a `UBIGINT`. |\n| **Example** | `md5_number_lower('abc')` |\n| **Result** | `8250560606382298838` |\n\n#### `md5_number_upper(string)`\n\n<div class=\"nostroke_table\"></div>\n\n| **Description** | Returns the upper 64-bit segment of the MD5 hash of the `string` as a `UBIGINT`. |\n| **Example** | `md5_number_upper('abc')` |\n| **Result** | `12704604231530709392` |\n\n#### `nfc_normalize(string)`\n\n<div class=\"nostroke_table\"></div>\n\n| **Description** | Converts `string` to Unicode NFC normalized string. Useful for comparisons and ordering if text data is mixed between NFC normalized and not. |\n| **Example** | `nfc_normalize('ardèch')` |\n| **Result** | `ardèch` |\n\n#### `not_ilike_escape(string, like_specifier, escape_character)`\n\n<div class=\"nostroke_table\"></div>\n\n| **Description** | Returns `false` if the `string` matches the `like_specifier` (see [Pattern Matching]({% link docs/stable/sql/functions/pattern_matching.md %})) using case-insensitive matching. `escape_character` is used to search for wildcard characters in the `string`. |\n| **Example** | `not_ilike_escape('A%c', 'a$%C', '$')` |\n| **Result** | `false` |\n\n#### `not_like_escape(string, like_specifier, escape_character)`\n\n<div class=\"nostroke_table\"></div>\n\n| **Description** | Returns `false` if the `string` matches the `like_specifier` (see [Pattern Matching]({% link docs/stable/sql/functions/pattern_matching.md %})) using case-sensitive matching. `escape_character` is used to search for wildcard characters in the `string`. |\n| **Example** | `not_like_escape('a%c', 'a$%c', '$')` |\n| **Result** | `false` |\n\n#### `parse_dirname(path[, separator])`\n\n<div class=\"nostroke_table\"></div>\n\n| **Description** | Returns the top-level directory name from the given `path`. `separator` options: `system`, `both_slash` (default), `forward_slash`, `backslash`. |\n| **Example** | `parse_dirname('path/to/file.csv', 'system')` |\n| **Result** | `path` |\n\n#### `parse_dirpath(path[, separator])`\n\n<div class=\"nostroke_table\"></div>\n\n| **Description** | Returns the head of the `path` (the pathname until the last slash) similarly to Python's [`os.path.dirname`](https://docs.python.org/3.7/library/os.path.html#os.path.dirname). `separator` options: `system`, `both_slash` (default), `forward_slash`, `backslash`. |\n| **Example** | `parse_dirpath('path/to/file.csv', 'forward_slash')` |\n| **Result** | `path/to` |\n\n#### `parse_filename(string[, trim_extension][, separator])`\n\n<div class=\"nostroke_table\"></div>\n\n| **Description** | Returns the last component of the `path` similarly to Python's [`os.path.basename`](https://docs.python.org/3.7/library/os.path.html#os.path.basename) function. If `trim_extension` is `true`, the file extension will be removed (defaults to `false`). `separator` options: `system`, `both_slash` (default), `forward_slash`, `backslash`. |\n| **Example** | `parse_filename('path/to/file.csv', true, 'forward_slash')` |\n| **Result** | `file` |\n\n#### `parse_path(path[, separator])`\n\n<div class=\"nostroke_table\"></div>\n\n| **Description** | Returns a list of the components (directories and filename) in the `path` similarly to Python's [`pathlib.parts`](https://docs.python.org/3/library/pathlib.html#pathlib.PurePath.parts) function. `separator` options: `system`, `both_slash` (default), `forward_slash`, `backslash`. |\n| **Example** | `parse_path('path/to/file.csv', 'system')` |\n| **Result** | `[path, to, file.csv]` |\n\n#### `position(search_string IN string)`\n\n<div class=\"nostroke_table\"></div>\n\n| **Description** | Return location of first occurrence of `search_string` in `string`, counting from 1. Returns 0 if no match found. |\n| **Example** | `position('b' IN 'abc')` |\n| **Result** | `2` |\n| **Aliases** | `instr`, `strpos` |\n\n#### `prefix(string, search_string)`\n\n<div class=\"nostroke_table\"></div>\n\n| **Description** | Returns `true` if `string` starts with `search_string`. |\n| **Example** | `prefix('abc', 'ab')` |\n| **Result** | `true` |\n\n#### `printf(format, ...)`\n\n<div class=\"nostroke_table\"></div>\n\n| **Description** | Formats a `string` using [printf syntax](#printf-syntax). |\n| **Example** | `printf('Benchmark \"%s\" took %d seconds', 'CSV', 42)` |\n| **Result** | `Benchmark \"CSV\" took 42 seconds` |\n\n#### `read_text(source)`\n\n<div class=\"nostroke_table\"></div>\n\n| **Description** | Returns the content from `source` (a filename, a list of filenames, or a glob pattern) as a `VARCHAR`. The file content is first validated to be valid UTF-8. If `read_text` attempts to read a file with invalid UTF-8 an error is thrown suggesting to use `read_blob` instead. See the [`read_text` guide]({% link docs/stable/guides/file_formats/read_file.md %}#read_text) for more details. |\n| **Example** | `read_text('hello.txt')` |\n| **Result** | `hello\\n` |\n\n#### `regexp_escape(string)`\n\n<div class=\"nostroke_table\"></div>\n\n| **Description** | Escapes special patterns to turn `string` into a regular expression similarly to Python's [`re.escape` function](https://docs.python.org/3/library/re.html#re.escape). |\n| **Example** | `regexp_escape('https://duckdb.org')` |\n| **Result** | `https\\:\\/\\/duckdb\\.org` |\n\n#### `regexp_extract(string, regex[, group][, options])`\n\n<div class=\"nostroke_table\"></div>\n\n| **Description** | If `string` contains the `regex` pattern, returns the capturing group specified by optional parameter `group`; otherwise, returns the empty string. The `group` must be a constant value. If no `group` is given, it defaults to 0. A set of optional [regex `options`]({% link docs/stable/sql/functions/regular_expressions.md %}#options-for-regular-expression-functions) can be set. |\n| **Example** | `regexp_extract('ABC', '([a-z])(b)', 1, 'i')` |\n| **Result** | `A` |\n\n#### `regexp_extract(string, regex, name_list[, options])`\n\n<div class=\"nostroke_table\"></div>\n\n| **Description** | If `string` contains the `regex` pattern, returns the capturing groups as a struct with corresponding names from `name_list`; otherwise, returns a struct with the same keys and empty strings as values. A set of optional [regex `options`]({% link docs/stable/sql/functions/regular_expressions.md %}#options-for-regular-expression-functions) can be set. |\n| **Example** | `regexp_extract('John Doe', '([a-z]+) ([a-z]+)', ['first_name', 'last_name'], 'i')` |\n| **Result** | `{'first_name': John, 'last_name': Doe}` |\n\n#### `regexp_extract_all(string, regex[, group][, options])`\n\n<div class=\"nostroke_table\"></div>\n\n| **Description** | Finds non-overlapping occurrences of the `regex` in the `string` and returns the corresponding values of the capturing `group`. A set of optional [regex `options`]({% link docs/stable/sql/functions/regular_expressions.md %}#options-for-regular-expression-functions) can be set. |\n| **Example** | `regexp_extract_all('Peter: 33, Paul:14', '(\\w+):\\s*(\\d+)', 2)` |\n| **Result** | `[33, 14]` |\n\n#### `regexp_full_match(string, regex[, col2])`\n\n<div class=\"nostroke_table\"></div>\n\n| **Description** | Returns `true` if the entire `string` matches the `regex`. A set of optional [regex `options`]({% link docs/stable/sql/functions/regular_expressions.md %}#options-for-regular-expression-functions) can be set. |\n| **Example** | `regexp_full_match('anabanana', '(an)*')` |\n| **Result** | `false` |\n\n#### `regexp_matches(string, regex[, options])`\n\n<div class=\"nostroke_table\"></div>\n\n| **Description** | Returns `true` if `string` contains the `regex`, `false` otherwise. A set of optional [regex `options`]({% link docs/stable/sql/functions/regular_expressions.md %}#options-for-regular-expression-functions) can be set. |\n| **Example** | `regexp_matches('anabanana', '(an)*')` |\n| **Result** | `true` |\n\n#### `regexp_replace(string, regex, replacement[, options])`\n\n<div class=\"nostroke_table\"></div>\n\n| **Description** | If `string` contains the `regex`, replaces the matching part with `replacement`. A set of optional [regex `options`]({% link docs/stable/sql/functions/regular_expressions.md %}#options-for-regular-expression-functions) can be set. |\n| **Example** | `regexp_replace('hello', '[lo]', '-')` |\n| **Result** | `he-lo` |\n\n#### `regexp_split_to_table(string, regex)`\n\n<div class=\"nostroke_table\"></div>\n\n| **Description** | Splits the `string` along the `regex` and returns a row for each part. |\n| **Example** | `regexp_split_to_table('hello world; 42', ';? ')` |\n| **Result** | Multiple rows: `'hello'`, `'world'`, `'42'` |\n\n#### `repeat(string, count)`\n\n<div class=\"nostroke_table\"></div>\n\n| **Description** | Repeats the `string` `count` number of times. |\n| **Example** | `repeat('A', 5)` |\n| **Result** | `AAAAA` |\n\n#### `replace(string, source, target)`\n\n<div class=\"nostroke_table\"></div>\n\n| **Description** | Replaces any occurrences of the `source` with `target` in `string`. |\n| **Example** | `replace('hello', 'l', '-')` |\n| **Result** | `he--o` |\n\n#### `reverse(string)`\n\n<div class=\"nostroke_table\"></div>\n\n| **Description** | Reverses the `string`. |\n| **Example** | `reverse('hello')` |\n| **Result** | `olleh` |\n\n#### `right(string, count)`\n\n<div class=\"nostroke_table\"></div>\n\n| **Description** | Extract the right-most `count` characters. |\n| **Example** | `right('Hello🦆', 3)` |\n| **Result** | `lo🦆` |\n\n#### `right_grapheme(string, count)`\n\n<div class=\"nostroke_table\"></div>\n\n| **Description** | Extracts the right-most `count` grapheme clusters. |\n| **Example** | `right_grapheme('🤦🏼‍♂️🤦🏽‍♀️', 1)` |\n| **Result** | `🤦🏽‍♀️` |\n\n#### `rpad(string, count, character)`\n\n<div class=\"nostroke_table\"></div>\n\n| **Description** | Pads the `string` with the `character` on the right until it has `count` characters. Truncates the `string` on the right if it has more than `count` characters. |\n| **Example** | `rpad('hello', 10, '<')` |\n| **Result** | `hello<<<<<` |\n\n#### `rtrim(string[, characters])`\n\n<div class=\"nostroke_table\"></div>\n\n| **Description** | Removes any occurrences of any of the `characters` from the right side of the `string`. `characters` defaults to `space`. |\n| **Example 1** | <code class=\"language-plaintext highlighter-rouge\">rtrim('&nbsp;&nbsp;&nbsp;&nbsp;test&nbsp;&nbsp;')</code> |\n| **Result** | <code class=\"language-plaintext highlighter-rouge\">&nbsp;&nbsp;&nbsp;&nbsp;test</code> |\n| **Example 2** | `rtrim('>>>>test<<', '><')` |\n| **Result** | `>>>>test` |\n\n#### `sha1(value)`\n\n<div class=\"nostroke_table\"></div>\n\n| **Description** | Returns a `VARCHAR` with the SHA-1 hash of the `value`. |\n| **Example** | `sha1('🦆')` |\n| **Result** | `949bf843dc338be348fb9525d1eb535d31241d76` |\n\n#### `sha256(value)`\n\n<div class=\"nostroke_table\"></div>\n\n| **Description** | Returns a `VARCHAR` with the SHA-256 hash of the `value` |\n| **Example** | `sha256('🦆')` |\n| **Result** | `d7a5c5e0d1d94c32218539e7e47d4ba9c3c7b77d61332fb60d633dde89e473fb` |\n\n#### `split_part(string, separator, index)`\n\n<div class=\"nostroke_table\"></div>\n\n| **Description** | Splits the `string` along the `separator` and returns the data at the (1-based) `index` of the list. If the `index` is outside the bounds of the list, return an empty string (to match PostgreSQL's behavior). |\n| **Example** | `split_part('a;b;c', ';', 2)` |\n| **Result** | `b` |\n\n#### `starts_with(string, search_string)`\n\n<div class=\"nostroke_table\"></div>\n\n| **Description** | Returns `true` if `string` begins with `search_string`. |\n| **Example** | `starts_with('abc', 'a')` |\n| **Result** | `true` |\n| **Alias** | `^@` |\n\n#### `string_split(string, separator)`\n\n<div class=\"nostroke_table\"></div>\n\n| **Description** | Splits the `string` along the `separator`. |\n| **Example** | `string_split('hello-world', '-')` |\n| **Result** | `[hello, world]` |\n| **Aliases** | `split`, `str_split`, `string_to_array` |\n\n#### `string_split_regex(string, regex[, options])`\n\n<div class=\"nostroke_table\"></div>\n\n| **Description** | Splits the `string` along the `regex`. A set of optional [regex `options`]({% link docs/stable/sql/functions/regular_expressions.md %}#options-for-regular-expression-functions) can be set. |\n| **Example** | `string_split_regex('hello world; 42', ';? ')` |\n| **Result** | `[hello, world, 42]` |\n| **Aliases** | `regexp_split_to_array`, `str_split_regex` |\n\n#### `strip_accents(string)`\n\n<div class=\"nostroke_table\"></div>\n\n| **Description** | Strips accents from `string`. |\n| **Example** | `strip_accents('mühleisen')` |\n| **Result** | `muhleisen` |\n\n#### `strlen(string)`\n\n<div class=\"nostroke_table\"></div>\n\n| **Description** | Number of bytes in `string`. |\n| **Example** | `strlen('🦆')` |\n| **Result** | `4` |\n\n#### `substring(string, start[, length])`\n\n<div class=\"nostroke_table\"></div>\n\n| **Description** | Extracts substring starting from character `start` up to the end of the string. If optional argument `length` is set, extracts a substring of `length` characters instead. Note that a `start` value of `1` refers to the first character of the `string`. |\n| **Example 1** | `substring('Hello', 2)` |\n| **Result** | `ello` |\n| **Example 2** | `substring('Hello', 2, 2)` |\n| **Result** | `el` |\n| **Alias** | `substr` |\n\n#### `substring_grapheme(string, start[, length])`\n\n<div class=\"nostroke_table\"></div>\n\n| **Description** | Extracts substring starting from grapheme clusters `start` up to the end of the string. If optional argument `length` is set, extracts a substring of `length` grapheme clusters instead. Note that a `start` value of `1` refers to the `first` character of the `string`. |\n| **Example 1** | `substring_grapheme('🦆🤦🏼‍♂️🤦🏽‍♀️🦆', 3)` |\n| **Result** | `🤦🏽‍♀️🦆` |\n| **Example 2** | `substring_grapheme('🦆🤦🏼‍♂️🤦🏽‍♀️🦆', 3, 2)` |\n| **Result** | `🤦🏽‍♀️🦆` |\n\n#### `suffix(string, search_string)`\n\n<div class=\"nostroke_table\"></div>\n\n| **Description** | Returns `true` if `string` ends with `search_string`. Note that [collations]({% link docs/stable/sql/expressions/collations.md %}) are not supported. |\n| **Example** | `suffix('abc', 'bc')` |\n| **Result** | `true` |\n| **Alias** | `ends_with` |\n\n#### `to_base(number, radix[, min_length])`\n\n<div class=\"nostroke_table\"></div>\n\n| **Description** | Converts `number` to a string in the given base `radix`, optionally padding with leading zeros to `min_length`. |\n| **Example** | `to_base(42, 16, 5)` |\n| **Result** | `0002A` |\n\n#### `to_base64(blob)`\n\n<div class=\"nostroke_table\"></div>\n\n| **Description** | Converts a `blob` to a base64 encoded string. |\n| **Example** | `to_base64('A'::BLOB)` |\n| **Result** | `QQ==` |\n| **Alias** | `base64` |\n\n#### `translate(string, from, to)`\n\n<div class=\"nostroke_table\"></div>\n\n| **Description** | Replaces each character in `string` that matches a character in the `from` set with the corresponding character in the `to` set. If `from` is longer than `to`, occurrences of the extra characters in `from` are deleted. |\n| **Example** | `translate('12345', '143', 'ax')` |\n| **Result** | `a2x5` |\n\n#### `trim(string[, characters])`\n\n<div class=\"nostroke_table\"></div>\n\n| **Description** | Removes any occurrences of any of the `characters` from either side of the `string`. `characters` defaults to `space`. |\n| **Example 1** | <code class=\"language-plaintext highlighter-rouge\">trim('&nbsp;&nbsp;&nbsp;&nbsp;test&nbsp;&nbsp;')</code> |\n| **Result** | `test` |\n| **Example 2** | `trim('>>>>test<<', '><')` |\n| **Result** | `test` |\n\n#### `unbin(value)`\n\n<div class=\"nostroke_table\"></div>\n\n| **Description** | Converts a `value` from binary representation to a blob. |\n| **Example** | `unbin('0110')` |\n| **Result** | `\\x06` |\n| **Alias** | `from_binary` |\n\n#### `unhex(value)`\n\n<div class=\"nostroke_table\"></div>\n\n| **Description** | Converts a `value` from hexadecimal representation to a blob. |\n| **Example** | `unhex('2A')` |\n| **Result** | `*` |\n| **Alias** | `from_hex` |\n\n#### `unicode(string)`\n\n<div class=\"nostroke_table\"></div>\n\n| **Description** | Returns an `INTEGER` representing the `unicode` codepoint of the first character in the `string`. |\n| **Example** | `[unicode('âbcd'), unicode('â'), unicode(''), unicode(NULL)]` |\n| **Result** | `[226, 226, -1, NULL]` |\n| **Alias** | `ord` |\n\n#### `upper(string)`\n\n<div class=\"nostroke_table\"></div>\n\n| **Description** | Converts `string` to upper case. |\n| **Example** | `upper('Hello')` |\n| **Result** | `HELLO` |\n| **Alias** | `ucase` |\n\n#### `url_decode(string)`\n\n<div class=\"nostroke_table\"></div>\n\n| **Description** | Decodes a URL from a representation using [Percent-Encoding](https://datatracker.ietf.org/doc/html/rfc3986#section-2.1). |\n| **Example** | `url_decode('https%3A%2F%2Fduckdb.org%2Fwhy_duckdb%23portable')` |\n| **Result** | `https://duckdb.org/why_duckdb#portable` |\n\n#### `url_encode(string)`\n\n<div class=\"nostroke_table\"></div>\n\n| **Description** | Encodes a URL to a representation using [Percent-Encoding](https://datatracker.ietf.org/doc/html/rfc3986#section-2.1). |\n| **Example** | `url_encode('this string has/ special+ characters>')` |\n| **Result** | `this%20string%20has%2F%20special%2B%20characters%3E` |\n\n<!-- End of section generated by scripts/generate_sql_function_docs.py -->\n\n## Text Similarity Functions\n\nThese functions are used to measure the similarity of two strings using various [similarity measures](https://en.wikipedia.org/wiki/Similarity_measure).\n\n<!-- Start of section generated by scripts/generate_sql_function_docs.py; categories: [text_similarity] -->\n<!-- markdownlint-disable MD056 -->\n\n| Function | Description |\n|:--|:-------|\n| [`damerau_levenshtein(s1, s2)`](#damerau_levenshteins1-s2) | Extension of Levenshtein distance to also include transposition of adjacent characters as an allowed edit operation. In other words, the minimum number of edit operations (insertions, deletions, substitutions or transpositions) required to change one string to another. Characters of different cases (e.g., `a` and `A`) are considered different. |\n| [`editdist3(s1, s2)`](#levenshteins1-s2) | Alias for `levenshtein`. |\n| [`hamming(s1, s2)`](#hammings1-s2) | The Hamming distance between to strings, i.e., the number of positions with different characters for two strings of equal length. Strings must be of equal length. Characters of different cases (e.g., `a` and `A`) are considered different. |\n| [`jaccard(s1, s2)`](#jaccards1-s2) | The Jaccard similarity between two strings. Characters of different cases (e.g., `a` and `A`) are considered different. Returns a number between 0 and 1. |\n| [`jaro_similarity(s1, s2[, score_cutoff])`](#jaro_similaritys1-s2-score_cutoff) | The Jaro similarity between two strings. Characters of different cases (e.g., `a` and `A`) are considered different. Returns a number between 0 and 1. For similarity < `score_cutoff`, 0 is returned instead. `score_cutoff` defaults to 0. |\n| [`jaro_winkler_similarity(s1, s2[, score_cutoff])`](#jaro_winkler_similaritys1-s2-score_cutoff) | The Jaro-Winkler similarity between two strings. Characters of different cases (e.g., `a` and `A`) are considered different. Returns a number between 0 and 1. For similarity < `score_cutoff`, 0 is returned instead. `score_cutoff` defaults to 0. |\n| [`levenshtein(s1, s2)`](#levenshteins1-s2) | The minimum number of single-character edits (insertions, deletions or substitutions) required to change one string to the other. Characters of different cases (e.g., `a` and `A`) are considered different. |\n| [`mismatches(s1, s2)`](#hammings1-s2) | Alias for `hamming`. |\n\n<!-- markdownlint-enable MD056 -->\n\n#### `damerau_levenshtein(s1, s2)`\n\n<div class=\"nostroke_table\"></div>\n\n| **Description** | Extension of Levenshtein distance to also include transposition of adjacent characters as an allowed edit operation. In other words, the minimum number of edit operations (insertions, deletions, substitutions or transpositions) required to change one string to another. Characters of different cases (e.g., `a` and `A`) are considered different. |\n| **Example** | `damerau_levenshtein('duckdb', 'udckbd')` |\n| **Result** | `2` |\n\n#### `hamming(s1, s2)`\n\n<div class=\"nostroke_table\"></div>\n\n| **Description** | The Hamming distance between to strings, i.e., the number of positions with different characters for two strings of equal length. Strings must be of equal length. Characters of different cases (e.g., `a` and `A`) are considered different. |\n| **Example** | `hamming('duck', 'luck')` |\n| **Result** | `1` |\n| **Alias** | `mismatches` |\n\n#### `jaccard(s1, s2)`\n\n<div class=\"nostroke_table\"></div>\n\n| **Description** | The Jaccard similarity between two strings. Characters of different cases (e.g., `a` and `A`) are considered different. Returns a number between 0 and 1. |\n| **Example** | `jaccard('duck', 'luck')` |\n| **Result** | `0.6` |\n\n#### `jaro_similarity(s1, s2[, score_cutoff])`\n\n<div class=\"nostroke_table\"></div>\n\n| **Description** | The Jaro similarity between two strings. Characters of different cases (e.g., `a` and `A`) are considered different. Returns a number between 0 and 1. For similarity < `score_cutoff`, 0 is returned instead. `score_cutoff` defaults to 0. |\n| **Example** | `jaro_similarity('duck', 'duckdb')` |\n| **Result** | `0.8888888888888888` |\n\n#### `jaro_winkler_similarity(s1, s2[, score_cutoff])`\n\n<div class=\"nostroke_table\"></div>\n\n| **Description** | The Jaro-Winkler similarity between two strings. Characters of different cases (e.g., `a` and `A`) are considered different. Returns a number between 0 and 1. For similarity < `score_cutoff`, 0 is returned instead. `score_cutoff` defaults to 0. |\n| **Example** | `jaro_winkler_similarity('duck', 'duckdb')` |\n| **Result** | `0.9333333333333333` |\n\n#### `levenshtein(s1, s2)`\n\n<div class=\"nostroke_table\"></div>\n\n| **Description** | The minimum number of single-character edits (insertions, deletions or substitutions) required to change one string to the other. Characters of different cases (e.g., `a` and `A`) are considered different. |\n| **Example** | `levenshtein('duck', 'db')` |\n| **Result** | `3` |\n| **Alias** | `editdist3` |\n\n<!-- End of section generated by scripts/generate_sql_function_docs.py -->\n\n## Formatters\n\n### `fmt` Syntax\n\nThe `format(format, parameters...)` function formats strings, loosely following the syntax of the [{fmt} open-source formatting library](https://fmt.dev/latest/syntax/).\n\nFormat without additional parameters:\n\n```sql\nSELECT format('Hello world'); -- Hello world\n```\n\nFormat a string using {}:\n\n```sql\nSELECT format('The answer is {}', 42); -- The answer is 42\n```\n\nFormat a string using positional arguments:\n\n```sql\nSELECT format('I''d rather be {1} than {0}.', 'right', 'happy'); -- I'd rather be happy than right.\n```\n\n#### Format Specifiers\n\n| Specifier | Description | Example |\n|:-|:------|:---|\n| `{:d}`   | integer                                | `654321`       |\n| `{:E}`   | scientific notation                    | `3.141593E+00` |\n| `{:f}`   | float                                  | `4.560000`     |\n| `{:o}`   | octal                                  | `2375761`      |\n| `{:s}`   | string                                 | `asd`          |\n| `{:x}`   | hexadecimal                            | `9fbf1`        |\n| `{:tX}`  | integer, `X` is the thousand separator | `654 321`      |\n\n#### Formatting Types\n\nIntegers:\n\n```sql\nSELECT format('{} + {} = {}', 3, 5, 3 + 5); -- 3 + 5 = 8\n```\n\nBooleans:\n\n```sql\nSELECT format('{} != {}', true, false); -- true != false\n```\n\nFormat datetime values:\n\n```sql\nSELECT format('{}', DATE '1992-01-01'); -- 1992-01-01\nSELECT format('{}', TIME '12:01:00'); -- 12:01:00\nSELECT format('{}', TIMESTAMP '1992-01-01 12:01:00'); -- 1992-01-01 12:01:00\n```\n\nFormat BLOB:\n\n```sql\nSELECT format('{}', BLOB '\\x00hello'); -- \\x00hello\n```\n\nPad integers with 0s:\n\n```sql\nSELECT format('{:04d}', 33); -- 0033\n```\n\n> Padding cannot currently be combined with the specification of a thousands separator.\n\nCreate timestamps from integers:\n\n```sql\nSELECT format('{:02d}:{:02d}:{:02d} {}', 12, 3, 16, 'AM'); -- 12:03:16 AM\n```\n\nConvert to hexadecimal:\n\n```sql\nSELECT format('{:x}', 123_456_789); -- 75bcd15\n```\n\nConvert to binary:\n\n```sql\nSELECT format('{:b}', 123_456_789); -- 111010110111100110100010101\n```\n\n#### Print Numbers with Thousand Separators\n\nIntegers:\n\n```sql\nSELECT format('{:,}',  123_456_789); -- 123,456,789\nSELECT format('{:t.}', 123_456_789); -- 123.456.789\nSELECT format('{:''}', 123_456_789); -- 123'456'789\nSELECT format('{:_}',  123_456_789); -- 123_456_789\nSELECT format('{:t }', 123_456_789); -- 123 456 789\nSELECT format('{:tX}', 123_456_789); -- 123X456X789\n```\n\nFloat, double and decimal:\n\n```sql\nSELECT format('{:,f}',    123456.789); -- 123,456.78900\nSELECT format('{:,.2f}',  123456.789); -- 123,456.79\nSELECT format('{:t..2f}', 123456.789); -- 123.456,79\n```\n\n### `printf` Syntax\n\nThe `printf(format, parameters...)` function formats strings using the [`printf` syntax](https://cplusplus.com/reference/cstdio/printf/).\n\nFormat without additional parameters:\n\n```sql\nSELECT printf('Hello world');\n```\n\n```text\nHello world\n```\n\nFormat a string using arguments in a given order:\n\n```sql\nSELECT printf('The answer to %s is %d', 'life', 42);\n```\n\n```text\nThe answer to life is 42\n```\n\nFormat a string using positional arguments `%position$formatter`, e.g., the second parameter as a string is encoded as `%2$s`:\n\n```sql\nSELECT printf('I''d rather be %2$s than %1$s.', 'right', 'happy');\n```\n\n```text\nI'd rather be happy than right.\n```\n\n#### Format Specifiers\n\n| Specifier | Description | Example |\n|:-|:------|:---|\n| `%c`   | character code to character                                    | `a`            |\n| `%d`   | integer                                                        | `654321`       |\n| `%Xd`  | integer with thousand seperarator `X` from `,`, `.`, `''`, `_` | `654_321`      |\n| `%E`   | scientific notation                                            | `3.141593E+00` |\n| `%f`   | float                                                          | `4.560000`     |\n| `%hd`  | integer                                                        | `654321`       |\n| `%hhd` | integer                                                        | `654321`       |\n| `%lld` | integer                                                        | `654321`       |\n| `%o`   | octal                                                          | `2375761`      |\n| `%s`   | string                                                         | `asd`          |\n| `%x`   | hexadecimal                                                    | `9fbf1`        |\n\n#### Formatting Types\n\nIntegers:\n\n```sql\nSELECT printf('%d + %d = %d', 3, 5, 3 + 5); -- 3 + 5 = 8\n```\n\nBooleans:\n\n```sql\nSELECT printf('%s != %s', true, false); -- true != false\n```\n\nFormat datetime values:\n\n```sql\nSELECT printf('%s', DATE '1992-01-01'); -- 1992-01-01\nSELECT printf('%s', TIME '12:01:00'); -- 12:01:00\nSELECT printf('%s', TIMESTAMP '1992-01-01 12:01:00'); -- 1992-01-01 12:01:00\n```\n\nFormat BLOB:\n\n```sql\nSELECT printf('%s', BLOB '\\x00hello'); -- \\x00hello\n```\n\nPad integers with 0s:\n\n```sql\nSELECT printf('%04d', 33); -- 0033\n```\n\nCreate timestamps from integers:\n\n```sql\nSELECT printf('%02d:%02d:%02d %s', 12, 3, 16, 'AM'); -- 12:03:16 AM\n```\n\nConvert to hexadecimal:\n\n```sql\nSELECT printf('%x', 123_456_789); -- 75bcd15\n```\n\nConvert to binary:\n\n```sql\nSELECT printf('%b', 123_456_789); -- 111010110111100110100010101\n```\n\n#### Thousand Separators\n\nIntegers:\n\n```sql\nSELECT printf('%,d',  123_456_789); -- 123,456,789\nSELECT printf('%.d',  123_456_789); -- 123.456.789\nSELECT printf('%''d', 123_456_789); -- 123'456'789\nSELECT printf('%_d',  123_456_789); -- 123_456_789\n```\n\nFloat, double and decimal:\n\n```sql\nSELECT printf('%,f',   123456.789); -- 123,456.789000\nSELECT printf('%,.2f', 123456.789); -- 123,456.79\n```\n","time.md":"---\ntitle: Time Functions\n---\n\n<!-- markdownlint-disable MD001 -->\n\nThis section describes functions and operators for examining and manipulating [`TIME` values]({% link docs/stable/sql/data_types/time.md %}).\n\n## Time Operators\n\nThe table below shows the available mathematical operators for `TIME` types.\n\n| Operator | Description | Example | Result |\n|:-|:---|:----|:--|\n| `+` | addition of an `INTERVAL` | `TIME '01:02:03' + INTERVAL 5 HOUR` | `06:02:03` |\n| `-` | subtraction of an `INTERVAL` | `TIME '06:02:03' - INTERVAL 5 HOUR` | `01:02:03` |\n\n## Time Functions\n\nThe table below shows the available scalar functions for `TIME` types.\n\n| Name | Description |\n|:--|:-------|\n| [`date_diff(part, starttime, endtime)`](#date_diffpart-starttime-endtime) | The number of [`part`]({% link docs/stable/sql/functions/datepart.md %}) boundaries between `starttime` and `endtime`, inclusive of the larger time and exclusive of the smaller time. |\n| [`date_part(part, time)`](#date_partpart-time) | Get [subfield]({% link docs/stable/sql/functions/datepart.md %}) (equivalent to `extract`). |\n| [`date_sub(part, starttime, endtime)`](#date_subpart-starttime-endtime) | The signed length of the interval between `starttime` and `endtime`, truncated to whole multiples of [`part`]({% link docs/stable/sql/functions/datepart.md %}). |\n| [`extract(part FROM time)`](#extractpart-from-time) | Get subfield from a time. |\n| [`get_current_time()`](#get_current_time) | Current time (start of current transaction). |\n| [`make_time(bigint, bigint, double)`](#make_timebigint-bigint-double) | The time for the given parts. |\n\nThe only [date parts]({% link docs/stable/sql/functions/datepart.md %}) that are defined for times are `epoch`, `hours`, `minutes`, `seconds`, `milliseconds` and `microseconds`.\n\n#### `date_diff(part, starttime, endtime)`\n\n<div class=\"nostroke_table\"></div>\n\n| **Description** | The number of [`part`]({% link docs/stable/sql/functions/datepart.md %}) boundaries between `starttime` and `endtime`, inclusive of the larger time and exclusive of the smaller time. |\n| **Example** | `date_diff('hour', TIME '01:02:03', TIME '06:01:03')` |\n| **Result** | `5` |\n| **Alias** | `datediff` |\n\n#### `date_part(part, time)`\n\n<div class=\"nostroke_table\"></div>\n\n| **Description** | Get [subfield]({% link docs/stable/sql/functions/datepart.md %}) (equivalent to `extract`). |\n| **Example** | `date_part('minute', TIME '14:21:13')` |\n| **Result** | `21` |\n| **Alias** | `datepart` |\n\n#### `date_sub(part, starttime, endtime)`\n\n<div class=\"nostroke_table\"></div>\n\n| **Description** | The signed length of the interval between `starttime` and `endtime`, truncated to whole multiples of [`part`]({% link docs/stable/sql/functions/datepart.md %}). |\n| **Example** | `date_sub('hour', TIME '01:02:03', TIME '06:01:03')` |\n| **Result** | `4` |\n| **Alias** | `datesub` |\n\n#### `extract(part FROM time)`\n\n<div class=\"nostroke_table\"></div>\n\n| **Description** | Get subfield from a time. |\n| **Example** | `extract('hour' FROM TIME '14:21:13')` |\n| **Result** | `14` |\n\n#### `get_current_time()`\n\n<div class=\"nostroke_table\"></div>\n\n| **Description** | Current time (start of current transaction) in the local timezone as `TIMETZ`. |\n| **Example** | `get_current_time()` |\n| **Result** | `06:09:59.988+2` |\n| **Alias** | `current_time` (no parentheses necessary) |\n\n#### `make_time(bigint, bigint, double)`\n\n<div class=\"nostroke_table\"></div>\n\n| **Description** | The time for the given parts. |\n| **Example** | `make_time(13, 34, 27.123456)` |\n| **Result** | `13:34:27.123456` |\n","timestamp.md":"---\ntitle: Timestamp Functions\n---\n\n<!-- markdownlint-disable MD001 -->\n\nThis section describes functions and operators for examining and manipulating [`TIMESTAMP` values]({% link docs/stable/sql/data_types/timestamp.md %}).\nSee also the related [`TIMESTAMPTZ` functions]({% link docs/stable/sql/functions/timestamptz.md %}).\n\n## Timestamp Operators\n\nThe table below shows the available mathematical operators for `TIMESTAMP` types.\n\n| Operator | Description | Example | Result |\n|:-|:--|:----|:--|\n| `+` | addition of an `INTERVAL` | `TIMESTAMP '1992-03-22 01:02:03' + INTERVAL 5 DAY` | `1992-03-27 01:02:03` |\n| `-` | subtraction of `TIMESTAMP`s | `TIMESTAMP '1992-03-27' - TIMESTAMP '1992-03-22'` | `5 days` |\n| `-` | subtraction of an `INTERVAL` | `TIMESTAMP '1992-03-27 01:02:03' - INTERVAL 5 DAY` | `1992-03-22 01:02:03` |\n\nAdding to or subtracting from [infinite values]({% link docs/stable/sql/data_types/timestamp.md %}#special-values) produces the same infinite value.\n\n## Scalar Timestamp Functions\n\nThe table below shows the available scalar functions for `TIMESTAMP` values.\n\n| Name | Description |\n|:--|:-------|\n| [`age(timestamp, timestamp)`](#agetimestamp-timestamp) | Subtract arguments, resulting in the time difference between the two timestamps. |\n| [`age(timestamp)`](#agetimestamp) | Subtract from current_date. |\n| [`ago(interval)`](#agointerval) | Subtracts an interval from the current timestamp. |\n| [`century(timestamp)`](#centurytimestamp) | Extracts the century of a timestamp. |\n| [`current_localtimestamp()`](#current_localtimestamp) | Returns the current timestamp (at the start of the transaction). |\n| [`date_diff(part, starttimestamp, endtimestamp)`](#date_diffpart-starttimestamp-endtimestamp) | The number of [`part`]({% link docs/stable/sql/functions/datepart.md %}) boundaries between `starttimestamp` and `endtimestamp`, inclusive of the larger timestamp and exclusive of the smaller timestamp. |\n| [`date_part([part, ...], timestamp)`](#date_partpart--timestamp) | Get the listed [subfields]({% link docs/stable/sql/functions/datepart.md %}) as a `struct`. The list must be constant. |\n| [`date_part(part, timestamp)`](#date_partpart-timestamp) | Get [subfield]({% link docs/stable/sql/functions/datepart.md %}) (equivalent to `extract`). |\n| [`date_sub(part, starttimestamp, endtimestamp)`](#date_subpart-starttimestamp-endtimestamp) | The signed length of the interval between `starttimestamp` and `endtimestamp`, truncated to whole multiples of [`part`]({% link docs/stable/sql/functions/datepart.md %}). |\n| [`date_trunc(part, timestamp)`](#date_truncpart-timestamp) | Truncate to specified [precision]({% link docs/stable/sql/functions/datepart.md %}). |\n| [`dayname(timestamp)`](#daynametimestamp) | The (English) name of the weekday. |\n| [`epoch_ms(timestamp)`](#epoch_mstimestamp) | Returns the total number of milliseconds since the epoch. |\n| [`epoch_ns(timestamp)`](#epoch_nstimestamp) | Returns the total number of nanoseconds since the epoch. |\n| [`epoch_us(timestamp)`](#epoch_ustimestamp) | Returns the total number of microseconds since the epoch. |\n| [`epoch(timestamp)`](#epochtimestamp) | Returns the total number of seconds since the epoch. |\n| [`extract(field FROM timestamp)`](#extractfield-from-timestamp) | Get [subfield]({% link docs/stable/sql/functions/datepart.md %}) from a timestamp. |\n| [`greatest(timestamp, timestamp)`](#greatesttimestamp-timestamp) | The later of two timestamps. |\n| [`isfinite(timestamp)`](#isfinitetimestamp) | Returns true if the timestamp is finite, false otherwise. |\n| [`isinf(timestamp)`](#isinftimestamp) | Returns true if the timestamp is infinite, false otherwise. |\n| [`julian(timestamp)`](#juliantimestamp) | Extract the Julian Day number from a timestamp. |\n| [`last_day(timestamp)`](#last_daytimestamp) | The last day of the month. |\n| [`least(timestamp, timestamp)`](#leasttimestamp-timestamp) | The earlier of two timestamps. |\n| [`make_timestamp(bigint, bigint, bigint, bigint, bigint, double)`](#make_timestampbigint-bigint-bigint-bigint-bigint-double) | The timestamp for the given parts. |\n| [`make_timestamp(microseconds)`](#make_timestampmicroseconds) | Converts microseconds since the epoch to a timestamp. |\n| [`make_timestamp_ms(milliseconds)`](#make_timestamp_msmilliseconds) | Converts milliseconds since the epoch to a timestamp. |\n| [`make_timestamp_ns(nanoseconds)`](#make_timestamp_nsnanoseconds) | Converts nanoseconds since the epoch to a timestamp. |\n| [`monthname(timestamp)`](#monthnametimestamp) | The (English) name of the month. |\n| [`strftime(timestamp, format)`](#strftimetimestamp-format) | Converts timestamp to string according to the [format string]({% link docs/stable/sql/functions/dateformat.md %}#format-specifiers). |\n| [`strptime(text, format-list)`](#strptimetext-format-list) | Converts the string `text` to timestamp applying the [format strings]({% link docs/stable/sql/functions/dateformat.md %}) in the list until one succeeds. Throws an error on failure. To return `NULL` on failure, use [`try_strptime`](#try_strptimetext-format-list). |\n| [`strptime(text, format)`](#strptimetext-format) | Converts the string `text` to timestamp according to the [format string]({% link docs/stable/sql/functions/dateformat.md %}#format-specifiers). Throws an error on failure. To return `NULL` on failure, use [`try_strptime`](#try_strptimetext-format). |\n| [`time_bucket(bucket_width, timestamp[, offset])`](#time_bucketbucket_width-timestamp-offset) | Truncate `timestamp` to a grid of width `bucket_width`. The grid is anchored at `2000-01-01 00:00:00[ + offset]` when `bucket_width` is a number of months or coarser units, else `2000-01-03 00:00:00[ + offset]`. Note that `2000-01-03` is a Monday. |\n| [`time_bucket(bucket_width, timestamp[, origin])`](#time_bucketbucket_width-timestamp-origin) | Truncate `timestamp` to a grid of width `bucket_width`. The grid is anchored at the `origin` timestamp, which defaults to `2000-01-01 00:00:00` when `bucket_width` is a number of months or coarser units, else `2000-01-03 00:00:00`. Note that `2000-01-03` is a Monday. |\n| [`try_strptime(text, format-list)`](#try_strptimetext-format-list) | Converts the string `text` to timestamp applying the [format strings]({% link docs/stable/sql/functions/dateformat.md %}) in the list until one succeeds. Returns `NULL` on failure. |\n| [`try_strptime(text, format)`](#try_strptimetext-format) | Converts the string `text` to timestamp according to the [format string]({% link docs/stable/sql/functions/dateformat.md %}#format-specifiers). Returns `NULL` on failure. |\n\nThere are also dedicated extraction functions to get the [subfields]({% link docs/stable/sql/functions/datepart.md %}).\n\nFunctions applied to infinite dates will either return the same infinite dates\n(e.g., `greatest`) or `NULL` (e.g., `date_part`) depending on what “makes sense”.\nIn general, if the function needs to examine the parts of the infinite date, the result will be `NULL`.\n\n#### `age(timestamp, timestamp)`\n\n<div class=\"nostroke_table\"></div>\n\n| **Description** | Subtract arguments, resulting in the time difference between the two timestamps. |\n| **Example** | `age(TIMESTAMP '2001-04-10', TIMESTAMP '1992-09-20')` |\n| **Result** | `8 years 6 months 20 days` |\n\n#### `age(timestamp)`\n\n<div class=\"nostroke_table\"></div>\n\n| **Description** | Subtract from current_date. |\n| **Example** | `age(TIMESTAMP '1992-09-20')` |\n| **Result** | `29 years 1 month 27 days 12:39:00.844` |\n\n#### `ago(interval)`\n\n<div class=\"nostroke_table\"></div>\n\n| **Description** | Subtracts an interval from the current timestamp, returning a timestamp in the past. Equivalent to `current_timestamp - interval`. |\n| **Example** | `ago(INTERVAL 1 HOUR)` |\n| **Result** | `2024-11-30 12:28:48.895` (if current time is `2024-11-30 13:28:48.895`) |\n\n#### `century(timestamp)`\n\n<div class=\"nostroke_table\"></div>\n\n| **Description** | Extracts the century of a timestamp. |\n| **Example** | `century(TIMESTAMP '1992-03-22')` |\n| **Result** | `20` |\n\n#### `current_localtimestamp()`\n\n<div class=\"nostroke_table\"></div>\n\n| **Description** | Returns the current timestamp with time zone (at the start of the transaction). |\n| **Example** | `current_localtimestamp()` |\n| **Result** | `2024-11-30 13:28:48.895` |\n\n#### `date_diff(part, starttimestamp, endtimestamp)`\n\n<div class=\"nostroke_table\"></div>\n\n| **Description** | The signed number of [`part`]({% link docs/stable/sql/functions/datepart.md %}) boundaries between `starttimestamp` and `endtimestamp`, inclusive of the larger timestamp and exclusive of the smaller timestamp. |\n| **Example** | `date_diff('hour', TIMESTAMP '1992-09-30 23:59:59', TIMESTAMP '1992-10-01 01:58:00')` |\n| **Result** | `2` |\n\n#### `date_part([part, ...], timestamp)`\n\n<div class=\"nostroke_table\"></div>\n\n| **Description** | Get the listed [subfields]({% link docs/stable/sql/functions/datepart.md %}) as a `struct`. The list must be constant. |\n| **Example** | `date_part(['year', 'month', 'day'], TIMESTAMP '1992-09-20 20:38:40')` |\n| **Result** | `{year: 1992, month: 9, day: 20}` |\n\n#### `date_part(part, timestamp)`\n\n<div class=\"nostroke_table\"></div>\n\n| **Description** | Get [subfield]({% link docs/stable/sql/functions/datepart.md %}) (equivalent to `extract`). |\n| **Example** | `date_part('minute', TIMESTAMP '1992-09-20 20:38:40')` |\n| **Result** | `38` |\n\n#### `date_sub(part, starttimestamp, endtimestamp)`\n\n<div class=\"nostroke_table\"></div>\n\n| **Description** | The signed length of the interval between `starttimestamp` and `endtimestamp`, truncated to whole multiples of [`part`]({% link docs/stable/sql/functions/datepart.md %}). |\n| **Example** | `date_sub('hour', TIMESTAMP '1992-09-30 23:59:59', TIMESTAMP '1992-10-01 01:58:00')` |\n| **Result** | `1` |\n\n#### `date_trunc(part, timestamp)`\n\n<div class=\"nostroke_table\"></div>\n\n| **Description** | Truncate to specified [precision]({% link docs/stable/sql/functions/datepart.md %}). |\n| **Example** | `date_trunc('hour', TIMESTAMP '1992-09-20 20:38:40')` |\n| **Result** | `1992-09-20 20:00:00` |\n\n#### `dayname(timestamp)`\n\n<div class=\"nostroke_table\"></div>\n\n| **Description** | The (English) name of the weekday. |\n| **Example** | `dayname(TIMESTAMP '1992-03-22')` |\n| **Result** | `Sunday` |\n\n#### `epoch_ms(timestamp)`\n\n<div class=\"nostroke_table\"></div>\n\n| **Description** | Returns the total number of milliseconds since the epoch. |\n| **Example** | `epoch_ms(TIMESTAMP '2021-08-03 11:59:44.123456')` |\n| **Result** | `1627991984123` |\n\n#### `epoch_ns(timestamp)`\n\n<div class=\"nostroke_table\"></div>\n\n| **Description** | Return the total number of nanoseconds since the epoch. |\n| **Example** | `epoch_ns(TIMESTAMP '2021-08-03 11:59:44.123456')` |\n| **Result** | `1627991984123456000` |\n\n#### `epoch_us(timestamp)`\n\n<div class=\"nostroke_table\"></div>\n\n| **Description** | Returns the total number of microseconds since the epoch. |\n| **Example** | `epoch_us(TIMESTAMP '2021-08-03 11:59:44.123456')` |\n| **Result** | `1627991984123456` |\n\n#### `epoch(timestamp)`\n\n<div class=\"nostroke_table\"></div>\n\n| **Description** | Returns the total number of seconds since the epoch. |\n| **Example** | `epoch('2022-11-07 08:43:04'::TIMESTAMP);` |\n| **Result** | `1667810584` |\n\n#### `extract(field FROM timestamp)`\n\n<div class=\"nostroke_table\"></div>\n\n| **Description** | Get [subfield]({% link docs/stable/sql/functions/datepart.md %}) from a timestamp. |\n| **Example** | `extract('hour' FROM TIMESTAMP '1992-09-20 20:38:48')` |\n| **Result** | `20` |\n\n#### `greatest(timestamp, timestamp)`\n\n<div class=\"nostroke_table\"></div>\n\n| **Description** | The later of two timestamps. |\n| **Example** | `greatest(TIMESTAMP '1992-09-20 20:38:48', TIMESTAMP '1992-03-22 01:02:03.1234')` |\n| **Result** | `1992-09-20 20:38:48` |\n\n#### `isfinite(timestamp)`\n\n<div class=\"nostroke_table\"></div>\n\n| **Description** | Returns true if the timestamp is finite, false otherwise. |\n| **Example** | `isfinite(TIMESTAMP '1992-03-07')` |\n| **Result** | `true` |\n\n#### `isinf(timestamp)`\n\n<div class=\"nostroke_table\"></div>\n\n| **Description** | Returns true if the timestamp is infinite, false otherwise. |\n| **Example** | `isinf(TIMESTAMP '-infinity')` |\n| **Result** | `true` |\n\n#### `julian(timestamp)`\n\n<div class=\"nostroke_table\"></div>\n\n| **Description** | Extract the Julian Day number from a timestamp. |\n| **Example** | `julian(TIMESTAMP '1992-03-22 01:02:03.1234')` |\n| **Result** | `2448704.043091706` |\n\n#### `last_day(timestamp)`\n\n<div class=\"nostroke_table\"></div>\n\n| **Description** | The last day of the month. |\n| **Example** | `last_day(TIMESTAMP '1992-03-22 01:02:03.1234')` |\n| **Result** | `1992-03-31` |\n\n#### `least(timestamp, timestamp)`\n\n<div class=\"nostroke_table\"></div>\n\n| **Description** | The earlier of two timestamps. |\n| **Example** | `least(TIMESTAMP '1992-09-20 20:38:48', TIMESTAMP '1992-03-22 01:02:03.1234')` |\n| **Result** | `1992-03-22 01:02:03.1234` |\n\n#### `make_timestamp(bigint, bigint, bigint, bigint, bigint, double)`\n\n<div class=\"nostroke_table\"></div>\n\n| **Description** | The timestamp for the given parts. |\n| **Example** | `make_timestamp(1992, 9, 20, 13, 34, 27.123456)` |\n| **Result** | `1992-09-20 13:34:27.123456` |\n\n#### `make_timestamp(microseconds)`\n\n<div class=\"nostroke_table\"></div>\n\n| **Description** | Converts microseconds since the epoch to a timestamp. |\n| **Example** | `make_timestamp(1667810584123456)` |\n| **Result** | `2022-11-07 08:43:04.123456` |\n\n#### `make_timestamp_ms(milliseconds)`\n\n<div class=\"nostroke_table\"></div>\n\n| **Description** | Converts milliseconds since the epoch to a timestamp. |\n| **Example** | `make_timestamp(1667810584123)` |\n| **Result** | `2022-11-07 08:43:04.123` |\n\n#### `make_timestamp_ns(nanoseconds)`\n\n<div class=\"nostroke_table\"></div>\n\n| **Description** | Converts nanoseconds since the epoch to a timestamp. |\n| **Example** | `make_timestamp_ns(1667810584123456789)` |\n| **Result** | `2022-11-07 08:43:04.123456789` |\n\n#### `monthname(timestamp)`\n\n<div class=\"nostroke_table\"></div>\n\n| **Description** | The (English) name of the month. |\n| **Example** | `monthname(TIMESTAMP '1992-09-20')` |\n| **Result** | `September` |\n\n#### `strftime(timestamp, format)`\n\n<div class=\"nostroke_table\"></div>\n\n| **Description** | Converts timestamp to string according to the [format string]({% link docs/stable/sql/functions/dateformat.md %}#format-specifiers). |\n| **Example** | `strftime(timestamp '1992-01-01 20:38:40', '%a, %-d %B %Y - %I:%M:%S %p')` |\n| **Result** | `Wed, 1 January 1992 - 08:38:40 PM` |\n\n#### `strptime(text, format-list)`\n\n<div class=\"nostroke_table\"></div>\n\n| **Description** | Converts the string `text` to timestamp applying the [format strings]({% link docs/stable/sql/functions/dateformat.md %}) in the list until one succeeds. Throws an error on failure. To return `NULL` on failure, use [`try_strptime`](#try_strptimetext-format-list). |\n| **Example** | `strptime('4/15/2023 10:56:00', ['%d/%m/%Y %H:%M:%S', '%m/%d/%Y %H:%M:%S'])` |\n| **Result** | `2023-04-15 10:56:00` |\n\n#### `strptime(text, format)`\n\n<div class=\"nostroke_table\"></div>\n\n| **Description** | Converts the string `text` to timestamp according to the [format string]({% link docs/stable/sql/functions/dateformat.md %}#format-specifiers). Throws an error on failure. To return `NULL` on failure, use [`try_strptime`](#try_strptimetext-format). |\n| **Example** | `strptime('Wed, 1 January 1992 - 08:38:40 PM', '%a, %-d %B %Y - %I:%M:%S %p')` |\n| **Result** | `1992-01-01 20:38:40` |\n\n#### `time_bucket(bucket_width, timestamp[, offset])`\n\n<div class=\"nostroke_table\"></div>\n\n| **Description** | Truncate `timestamp` to a grid of width `bucket_width`. The grid includes `2000-01-01 00:00:00[ + offset]` when `bucket_width` is a number of months or coarser units, else `2000-01-03 00:00:00[ + offset]`. Note that `2000-01-03` is a Monday. |\n| **Example** | `time_bucket(INTERVAL '10 minutes', TIMESTAMP '1992-04-20 15:26:00-07', INTERVAL '5 minutes')` |\n| **Result** | `1992-04-20 15:25:00` |\n\n#### `time_bucket(bucket_width, timestamp[, origin])`\n\n<div class=\"nostroke_table\"></div>\n\n| **Description** | Truncate `timestamp` to a grid of width `bucket_width`. The grid includes the `origin` timestamp, which defaults to `2000-01-01 00:00:00` when `bucket_width` is a number of months or coarser units, else `2000-01-03 00:00:00`. Note that `2000-01-03` is a Monday. |\n| **Example** | `time_bucket(INTERVAL '2 weeks', TIMESTAMP '1992-04-20 15:26:00', TIMESTAMP '1992-04-01 00:00:00')` |\n| **Result** | `1992-04-15 00:00:00` |\n\n#### `try_strptime(text, format-list)`\n\n<div class=\"nostroke_table\"></div>\n\n| **Description** | Converts the string `text` to timestamp applying the [format strings]({% link docs/stable/sql/functions/dateformat.md %}) in the list until one succeeds. Returns `NULL` on failure. |\n| **Example** | `try_strptime('4/15/2023 10:56:00', ['%d/%m/%Y %H:%M:%S', '%m/%d/%Y %H:%M:%S'])` |\n| **Result** | `2023-04-15 10:56:00` |\n\n#### `try_strptime(text, format)`\n\n<div class=\"nostroke_table\"></div>\n\n| **Description** | Converts the string `text` to timestamp according to the [format string]({% link docs/stable/sql/functions/dateformat.md %}#format-specifiers). Returns `NULL` on failure. |\n| **Example** | `try_strptime('Wed, 1 January 1992 - 08:38:40 PM', '%a, %-d %B %Y - %I:%M:%S %p')` |\n| **Result** | `1992-01-01 20:38:40` |\n\n## Timestamp Table Functions\n\nThe table below shows the available table functions for `TIMESTAMP` types.\n\n| Name | Description |\n|:--|:-------|\n| [`generate_series(timestamp, timestamp, interval)`](#generate_seriestimestamp-timestamp-interval) | Generate a table of timestamps in the closed range, stepping by the interval. |\n| [`range(timestamp, timestamp, interval)`](#rangetimestamp-timestamp-interval) | Generate a table of timestamps in the half open range, stepping by the interval. |\n\n> Infinite values are not allowed as table function bounds.\n\n#### `generate_series(timestamp, timestamp, interval)`\n\n<div class=\"nostroke_table\"></div>\n\n| **Description** | Generate a table of timestamps in the closed range, stepping by the interval. |\n| **Example** | `generate_series(TIMESTAMP '2001-04-10', TIMESTAMP '2001-04-11', INTERVAL 30 MINUTE)` |\n\n#### `range(timestamp, timestamp, interval)`\n\n<div class=\"nostroke_table\"></div>\n\n| **Description** | Generate a table of timestamps in the half open range, stepping by the interval. |\n| **Example** | `range(TIMESTAMP '2001-04-10', TIMESTAMP '2001-04-11', INTERVAL 30 MINUTE)` |\n","timestamptz.md":"---\ntitle: Timestamp with Time Zone Functions\n---\n\n<!-- markdownlint-disable MD001 -->\n\nThis section describes functions and operators for examining and manipulating [`TIMESTAMP WITH TIME ZONE`\n(or `TIMESTAMPTZ`) values]({% link docs/stable/sql/data_types/timestamp.md %}). See also the related [`TIMESTAMP` functions]({% link docs/stable/sql/functions/timestamp.md %}).\n\nTime zone support is provided by the built-in [ICU extension]({% link docs/stable/core_extensions/icu.md %}).\n\nIn the examples below, the current time zone is presumed to be `America/Los_Angeles`\nusing the Gregorian calendar.\n\n## Built-In Timestamp with Time Zone Functions\n\nThe table below shows the available scalar functions for `TIMESTAMPTZ` values.\nSince these functions do not involve binning or display,\nthey are always available.\n\n| Name | Description |\n|:--|:-------|\n| [`current_timestamp`](#current_timestamp) | Current date and time (start of current transaction). |\n| [`get_current_timestamp()`](#get_current_timestamp) | Current date and time (start of current transaction). |\n| [`greatest(timestamptz, timestamptz)`](#greatesttimestamptz-timestamptz) | The later of two timestamps. |\n| [`isfinite(timestamptz)`](#isfinitetimestamptz) | Returns true if the timestamp with time zone is finite, false otherwise. |\n| [`isinf(timestamptz)`](#isinftimestamptz) | Returns true if the timestamp with time zone is infinite, false otherwise. |\n| [`least(timestamptz, timestamptz)`](#leasttimestamptz-timestamptz) | The earlier of two timestamps. |\n| [`now()`](#now) | Current date and time (start of current transaction). |\n| [`timetz_byte_comparable(timetz)`](#timetz_byte_comparabletimetz) | Converts a `TIME WITH TIME ZONE` to a `UBIGINT` sort key. |\n| [`to_timestamp(double)`](#to_timestampdouble) | Converts seconds since the epoch to a timestamp with time zone. |\n| [`transaction_timestamp()`](#transaction_timestamp) | Current date and time (start of current transaction). |\n\n#### `current_timestamp`\n\n<div class=\"nostroke_table\"></div>\n\n| **Description** | Current date and time (start of current transaction). |\n| **Example** | `current_timestamp` |\n| **Result** | `2022-10-08 12:44:46.122-07` |\n\n#### `get_current_timestamp()`\n\n<div class=\"nostroke_table\"></div>\n\n| **Description** | Current date and time (start of current transaction). |\n| **Example** | `get_current_timestamp()` |\n| **Result** | `2022-10-08 12:44:46.122-07` |\n\n#### `greatest(timestamptz, timestamptz)`\n\n<div class=\"nostroke_table\"></div>\n\n| **Description** | The later of two timestamps. |\n| **Example** | `greatest(TIMESTAMPTZ '1992-09-20 20:38:48', TIMESTAMPTZ '1992-03-22 01:02:03.1234')` |\n| **Result** | `1992-09-20 20:38:48-07` |\n\n#### `isfinite(timestamptz)`\n\n<div class=\"nostroke_table\"></div>\n\n| **Description** | Returns true if the timestamp with time zone is finite, false otherwise. |\n| **Example** | `isfinite(TIMESTAMPTZ '1992-03-07')` |\n| **Result** | `true` |\n\n#### `isinf(timestamptz)`\n\n<div class=\"nostroke_table\"></div>\n\n| **Description** | Returns true if the timestamp with time zone is infinite, false otherwise. |\n| **Example** | `isinf(TIMESTAMPTZ '-infinity')` |\n| **Result** | `true` |\n\n#### `least(timestamptz, timestamptz)`\n\n<div class=\"nostroke_table\"></div>\n\n| **Description** | The earlier of two timestamps. |\n| **Example** | `least(TIMESTAMPTZ '1992-09-20 20:38:48', TIMESTAMPTZ '1992-03-22 01:02:03.1234')` |\n| **Result** | `1992-03-22 01:02:03.1234-08` |\n\n#### `now()`\n\n<div class=\"nostroke_table\"></div>\n\n| **Description** | Current date and time (start of current transaction). |\n| **Example** | `now()` |\n| **Result** | `2022-10-08 12:44:46.122-07` |\n\n#### `timetz_byte_comparable(timetz)`\n\n<div class=\"nostroke_table\"></div>\n\n| **Description** | Converts a `TIME WITH TIME ZONE` to a `UBIGINT` sort key. |\n| **Example** | `timetz_byte_comparable('18:18:16.21-07:00'::TIMETZ)` |\n| **Result** | `2494691656335442799` |\n\n#### `to_timestamp(double)`\n\n<div class=\"nostroke_table\"></div>\n\n| **Description** | Converts seconds since the epoch to a timestamp with time zone. |\n| **Example** | `to_timestamp(1284352323.5)` |\n| **Result** | `2010-09-13 04:32:03.5+00` |\n\n#### `transaction_timestamp()`\n\n<div class=\"nostroke_table\"></div>\n\n| **Description** | Current date and time (start of current transaction). |\n| **Example** | `transaction_timestamp()` |\n| **Result** | `2022-10-08 12:44:46.122-07` |\n\n## Timestamp with Time Zone Strings\n\nWith no time zone extension loaded, `TIMESTAMPTZ` values will be cast to and from strings\nusing offset notation.\nThis will let you specify an instant correctly without access to time zone information.\nFor portability, `TIMESTAMPTZ` values will always be displayed using GMT offsets:\n\n```sql\nSELECT '2022-10-08 13:13:34-07'::TIMESTAMPTZ;\n```\n\n```text\n2022-10-08 20:13:34+00\n```\n\nIf a time zone extension such as ICU is loaded, then a time zone can be parsed from a string\nand cast to a representation in the local time zone:\n\n```sql\nSELECT '2022-10-08 13:13:34 Europe/Amsterdam'::TIMESTAMPTZ::VARCHAR;\n```\n\n```text\n2022-10-08 04:13:34-07 -- the offset will differ based on your local time zone\n```\n\n## ICU Timestamp with Time Zone Operators\n\nThe table below shows the available mathematical operators for `TIMESTAMP WITH TIME ZONE` values\nprovided by the ICU extension.\n\n| Operator | Description | Example | Result |\n|:-|:--|:----|:--|\n| `+` | addition of an `INTERVAL` | `TIMESTAMPTZ '1992-03-22 01:02:03' + INTERVAL 5 DAY` | `1992-03-27 01:02:03` |\n| `-` | subtraction of `TIMESTAMPTZ`s | `TIMESTAMPTZ '1992-03-27' - TIMESTAMPTZ '1992-03-22'` | `5 days` |\n| `-` | subtraction of an `INTERVAL` | `TIMESTAMPTZ '1992-03-27 01:02:03' - INTERVAL 5 DAY` | `1992-03-22 01:02:03` |\n\nAdding to or subtracting from [infinite values]({% link docs/stable/sql/data_types/timestamp.md %}#special-values) produces the same infinite value.\n\n## ICU Timestamp with Time Zone Functions\n\nThe table below shows the ICU provided scalar functions for `TIMESTAMP WITH TIME ZONE` values.\n\n| Name | Description |\n|:--|:-------|\n| [`age(timestamptz, timestamptz)`](#agetimestamptz-timestamptz) | Subtract arguments, resulting in the time difference between the two timestamps. |\n| [`age(timestamptz)`](#agetimestamptz) | Subtract from current_date. |\n| [`date_diff(part, starttimestamptz, endtimestamptz)`](#date_diffpart-starttimestamptz-endtimestamptz) | The number of [`part`]({% link docs/stable/sql/functions/datepart.md %}) boundaries between `starttimestamptz` and `endtimestamptz` inclusive of the larger timestamp and exclusive of the smaller timestamp. |\n| [`date_part([part, ...], timestamp)`](#date_partpart--timestamptz) | Get the listed [subfields]({% link docs/stable/sql/functions/datepart.md %}) as a `struct`. The list must be constant. |\n| [`date_part(part, timestamp)`](#date_partpart-timestamptz) | Get [subfield]({% link docs/stable/sql/functions/datepart.md %}) (equivalent to `extract`). |\n| [`date_sub(part, starttimestamptz, endtimestamptz)`](#date_subpart-starttimestamptz-endtimestamptz) | The signed length of the interval between `starttimestamptz` and `endtimestamptz`, truncated to whole multiples of [`part`]({% link docs/stable/sql/functions/datepart.md %}). |\n| [`date_trunc(part, timestamptz)`](#date_truncpart-timestamptz) | Truncate to specified [precision]({% link docs/stable/sql/functions/datepart.md %}). |\n| [`epoch_ns(timestamptz)`](#epoch_nstimestamptz) | Converts a timestamptz to nanoseconds since the epoch. |\n| [`epoch_us(timestamptz)`](#epoch_ustimestamptz) | Converts a timestamptz to microseconds since the epoch. |\n| [`extract(field FROM timestamptz)`](#extractfield-from-timestamptz) | Get [subfield]({% link docs/stable/sql/functions/datepart.md %}) from a `TIMESTAMP WITH TIME ZONE`. |\n| [`last_day(timestamptz)`](#last_daytimestamptz) | The last day of the month. |\n| [`make_timestamptz(bigint, bigint, bigint, bigint, bigint, double, string)`](#make_timestamptzbigint-bigint-bigint-bigint-bigint-double-string) | The `TIMESTAMP WITH TIME ZONE` for the given parts and time zone. |\n| [`make_timestamptz(bigint, bigint, bigint, bigint, bigint, double)`](#make_timestamptzbigint-bigint-bigint-bigint-bigint-double) | The `TIMESTAMP WITH TIME ZONE` for the given parts in the current time zone. |\n| [`make_timestamptz(microseconds)`](#make_timestamptzmicroseconds) | The `TIMESTAMP WITH TIME ZONE` for the given µs since the epoch. |\n| [`strftime(timestamptz, format)`](#strftimetimestamptz-format) | Converts a `TIMESTAMP WITH TIME ZONE` value to string according to the [format string]({% link docs/stable/sql/functions/dateformat.md %}#format-specifiers). |\n| [`strptime(text, format)`](#strptimetext-format) | Converts string to `TIMESTAMP WITH TIME ZONE` according to the [format string]({% link docs/stable/sql/functions/dateformat.md %}#format-specifiers) if `%Z` is specified. |\n| [`time_bucket(bucket_width, timestamptz[, offset])`](#time_bucketbucket_width-timestamptz-offset) | Truncate `timestamptz` to a grid of width `bucket_width`. The grid is anchored at `2000-01-01 00:00:00+00:00[ + offset]` when `bucket_width` is a number of months or coarser units, else `2000-01-03 00:00:00+00:00[ + offset]`. Note that `2000-01-03` is a Monday. |\n| [`time_bucket(bucket_width, timestamptz[, origin])`](#time_bucketbucket_width-timestamptz-origin) | Truncate `timestamptz` to a grid of width `bucket_width`. The grid is anchored at the `origin` timestamp, which defaults to `2000-01-01 00:00:00+00:00` when `bucket_width` is a number of months or coarser units, else `2000-01-03 00:00:00+00:00`. Note that `2000-01-03` is a Monday. |\n| [`time_bucket(bucket_width, timestamptz[, timezone])`](#time_bucketbucket_width-timestamptz-origin) | Truncate `timestamptz` to a grid of width `bucket_width`. The grid is anchored at the `origin` timestamp, which defaults to `2000-01-01 00:00:00` in the provided `timezone` when `bucket_width` is a number of months or coarser units, else `2000-01-03 00:00:00` in the provided `timezone`. The default timezone is `'UTC'`. Note that `2000-01-03` is a Monday. |\n\n\n\n#### `age(timestamptz, timestamptz)`\n\n<div class=\"nostroke_table\"></div>\n\n| **Description** | Subtract arguments, resulting in the time difference between the two timestamps. |\n| **Example** | `age(TIMESTAMPTZ '2001-04-10', TIMESTAMPTZ '1992-09-20')` |\n| **Result** | `8 years 6 months 20 days` |\n\n#### `age(timestamptz)`\n\n<div class=\"nostroke_table\"></div>\n\n| **Description** | Subtract from current_date. |\n| **Example** | `age(TIMESTAMP '1992-09-20')` |\n| **Result** | `29 years 1 month 27 days 12:39:00.844` |\n\n#### `date_diff(part, starttimestamptz, endtimestamptz)`\n\n<div class=\"nostroke_table\"></div>\n\n| **Description** | The signed number of [`part`]({% link docs/stable/sql/functions/datepart.md %}) boundaries between `starttimestamptz` and `endtimestamptz`, inclusive of the larger timestamp and exclusive of the smaller timestamp. |\n| **Example** | `date_diff('hour', TIMESTAMPTZ '1992-09-30 23:59:59', TIMESTAMPTZ '1992-10-01 01:58:00')` |\n| **Result** | `2` |\n\n#### `date_part([part, ...], timestamptz)`\n\n<div class=\"nostroke_table\"></div>\n\n| **Description** | Get the listed [subfields]({% link docs/stable/sql/functions/datepart.md %}) as a `struct`. The list must be constant. |\n| **Example** | `date_part(['year', 'month', 'day'], TIMESTAMPTZ '1992-09-20 20:38:40-07')` |\n| **Result** | `{year: 1992, month: 9, day: 20}` |\n\n#### `date_part(part, timestamptz)`\n\n<div class=\"nostroke_table\"></div>\n\n| **Description** | Get [subfield]({% link docs/stable/sql/functions/datepart.md %}) (equivalent to *extract*). |\n| **Example** | `date_part('minute', TIMESTAMPTZ '1992-09-20 20:38:40')` |\n| **Result** | `38` |\n\n#### `date_sub(part, starttimestamptz, endtimestamptz)`\n\n<div class=\"nostroke_table\"></div>\n\n| **Description** | The signed length of the interval between `starttimestamptz` and `endtimestamptz`, truncated to whole multiples of [`part`]({% link docs/stable/sql/functions/datepart.md %}). |\n| **Example** | `date_sub('hour', TIMESTAMPTZ '1992-09-30 23:59:59', TIMESTAMPTZ '1992-10-01 01:58:00')` |\n| **Result** | `1` |\n\n#### `date_trunc(part, timestamptz)`\n\n<div class=\"nostroke_table\"></div>\n\n| **Description** | Truncate to specified [precision]({% link docs/stable/sql/functions/datepart.md %}). |\n| **Example** | `date_trunc('hour', TIMESTAMPTZ '1992-09-20 20:38:40')` |\n| **Result** | `1992-09-20 20:00:00` |\n\n#### `epoch_ns(timestamptz)`\n\n<div class=\"nostroke_table\"></div>\n\n| **Description** | Converts a timestamptz to nanoseconds since the epoch. |\n| **Example** | `epoch_ns('2022-11-07 08:43:04.123456+00'::TIMESTAMPTZ);` |\n| **Result** | `1667810584123456000` |\n\n#### `epoch_us(timestamptz)`\n\n<div class=\"nostroke_table\"></div>\n\n| **Description** | Converts a timestamptz to microseconds since the epoch. |\n| **Example** | `epoch_us('2022-11-07 08:43:04.123456+00'::TIMESTAMPTZ);` |\n| **Result** | `1667810584123456` |\n\n#### `extract(field FROM timestamptz)`\n\n<div class=\"nostroke_table\"></div>\n\n| **Description** | Get [subfield]({% link docs/stable/sql/functions/datepart.md %}) from a `TIMESTAMP WITH TIME ZONE`. |\n| **Example** | `extract('hour' FROM TIMESTAMPTZ '1992-09-20 20:38:48')` |\n| **Result** | `20` |\n\n#### `last_day(timestamptz)`\n\n<div class=\"nostroke_table\"></div>\n\n| **Description** | The last day of the month. |\n| **Example** | `last_day(TIMESTAMPTZ '1992-03-22 01:02:03.1234')` |\n| **Result** | `1992-03-31` |\n\n#### `make_timestamptz(bigint, bigint, bigint, bigint, bigint, double, string)`\n\n<div class=\"nostroke_table\"></div>\n\n| **Description** | The `TIMESTAMP WITH TIME ZONE` for the given parts and time zone. |\n| **Example** | `make_timestamptz(1992, 9, 20, 15, 34, 27.123456, 'CET')` |\n| **Result** | `1992-09-20 06:34:27.123456-07` |\n\n#### `make_timestamptz(bigint, bigint, bigint, bigint, bigint, double)`\n\n<div class=\"nostroke_table\"></div>\n\n| **Description** | The `TIMESTAMP WITH TIME ZONE` for the given parts in the current time zone. |\n| **Example** | `make_timestamptz(1992, 9, 20, 13, 34, 27.123456)` |\n| **Result** | `1992-09-20 13:34:27.123456-07` |\n\n#### `make_timestamptz(microseconds)`\n\n<div class=\"nostroke_table\"></div>\n\n| **Description** | The `TIMESTAMP WITH TIME ZONE` for the given µs since the epoch. |\n| **Example** | `make_timestamptz(1667810584123456)` |\n| **Result** | `2022-11-07 16:43:04.123456-08` |\n\n#### `strftime(timestamptz, format)`\n\n<div class=\"nostroke_table\"></div>\n\n| **Description** | Converts a `TIMESTAMP WITH TIME ZONE` value to string according to the [format string]({% link docs/stable/sql/functions/dateformat.md %}#format-specifiers). |\n| **Example** | `strftime(timestamptz '1992-01-01 20:38:40', '%a, %-d %B %Y - %I:%M:%S %p')` |\n| **Result** | `Wed, 1 January 1992 - 08:38:40 PM` |\n\n#### `strptime(text, format)`\n\n<div class=\"nostroke_table\"></div>\n\n| **Description** | Converts string to `TIMESTAMP WITH TIME ZONE` according to the [format string]({% link docs/stable/sql/functions/dateformat.md %}#format-specifiers) if `%Z` is specified. |\n| **Example** | `strptime('Wed, 1 January 1992 - 08:38:40 PST', '%a, %-d %B %Y - %H:%M:%S %Z')` |\n| **Result** | `1992-01-01 08:38:40-08` |\n\n#### `time_bucket(bucket_width, timestamptz[, offset])`\n\n<div class=\"nostroke_table\"></div>\n\n| **Description** | Truncate `timestamptz` to a grid of width `bucket_width`. The grid is anchored at `2000-01-01 00:00:00+00:00[ + offset]` when `bucket_width` is a number of months or coarser units, else `2000-01-03 00:00:00+00:00[ + offset]`. Note that `2000-01-03` is a Monday. |\n| **Example** | `time_bucket(INTERVAL '10 minutes', TIMESTAMPTZ '1992-04-20 15:26:00-07', INTERVAL '5 minutes')` |\n| **Result** | `1992-04-20 15:25:00-07` |\n\n#### `time_bucket(bucket_width, timestamptz[, origin])`\n\n<div class=\"nostroke_table\"></div>\n\n| **Description** | Truncate `timestamptz` to a grid of width `bucket_width`. The grid is anchored at the `origin` timestamp, which defaults to `2000-01-01 00:00:00+00:00` when `bucket_width` is a number of months or coarser units, else `2000-01-03 00:00:00+00:00`. Note that `2000-01-03` is a Monday. |\n| **Example** | `time_bucket(INTERVAL '2 weeks', TIMESTAMPTZ '1992-04-20 15:26:00-07', TIMESTAMPTZ '1992-04-01 00:00:00-07')` |\n| **Result** | `1992-04-15 00:00:00-07` |\n\n#### `time_bucket(bucket_width, timestamptz[, timezone])`\n\n<div class=\"nostroke_table\"></div>\n\n| **Description** | Truncate `timestamptz` to a grid of width `bucket_width`. The grid is anchored at the `origin` timestamp, which defaults to `2000-01-01 00:00:00` in the provided `timezone` when `bucket_width` is a number of months or coarser units, else `2000-01-03 00:00:00` in the provided `timezone`. The default timezone is `'UTC'`. Note that `2000-01-03` is a Monday. |\n| **Example** | `time_bucket(INTERVAL '2 days', TIMESTAMPTZ '1992-04-20 15:26:00-07', 'Europe/Berlin')` |\n| **Result** | `1992-04-19 15:00:00-07` (=`1992-04-20 00:00:00 Europe/Berlin`) |\n\nThere are also dedicated extraction functions to get the [subfields]({% link docs/stable/sql/functions/datepart.md %}).\n\n## ICU Timestamp Table Functions\n\nThe table below shows the available table functions for `TIMESTAMP WITH TIME ZONE` types.\n\n| Name | Description |\n|:--|:-------|\n| [`generate_series(timestamptz, timestamptz, interval)`](#generate_seriestimestamptz-timestamptz-interval) | Generate a table of timestamps in the closed range (including both the starting timestamp and the ending timestamp), stepping by the interval. |\n| [`range(timestamptz, timestamptz, interval)`](#rangetimestamptz-timestamptz-interval) | Generate a table of timestamps in the half open range (including the starting timestamp, but stopping before the ending timestamp), stepping by the interval. |\n\n> Infinite values are not allowed as table function bounds.\n\n#### `generate_series(timestamptz, timestamptz, interval)`\n\n<div class=\"nostroke_table\"></div>\n\n| **Description** | Generate a table of timestamps in the closed range (including both the starting timestamp and the ending timestamp), stepping by the interval. |\n| **Example** | `generate_series(TIMESTAMPTZ '2001-04-10', TIMESTAMPTZ '2001-04-11', INTERVAL 30 MINUTE)` |\n\n#### `range(timestamptz, timestamptz, interval)`\n\n<div class=\"nostroke_table\"></div>\n\n| **Description** | Generate a table of timestamps in the half open range (including the starting timestamp, but stopping before the ending timestamp), stepping by the interval. |\n| **Example** | `range(TIMESTAMPTZ '2001-04-10', TIMESTAMPTZ '2001-04-11', INTERVAL 30 MINUTE)` |\n\n## ICU Timestamp Without Time Zone Functions\n\nThe table below shows the ICU provided scalar functions that operate on plain `TIMESTAMP` values.\nThese functions assume that the `TIMESTAMP` is a “local timestamp”.\n\nA local timestamp is effectively a way of encoding the part values from a time zone into a single value.\nThey should be used with caution because the produced values can contain gaps and ambiguities thanks to daylight savings time.\nOften the same functionality can be implemented more reliably using the `struct` variant of the `date_part` function.\n\n| Name | Description |\n|:--|:-------|\n| [`current_localtime()`](#current_localtime) | Returns a `TIME` whose GMT bin values correspond to local time in the current time zone. |\n| [`current_localtimestamp()`](#current_localtimestamp) | Returns a `TIMESTAMP` whose GMT bin values correspond to local date and time in the current time zone. |\n| [`localtime`](#localtime) | Synonym for the `current_localtime()` function call. |\n| [`localtimestamp`](#localtimestamp) | Synonym for the `current_localtimestamp()` function call. |\n| [`timezone(text, timestamp)`](#timezonetext-timestamp) | Use the [date parts]({% link docs/stable/sql/functions/datepart.md %}) of the timestamp in GMT to construct a timestamp in the given time zone. Effectively, the argument is a “local” time. |\n| [`timezone(text, timestamptz)`](#timezonetext-timestamptz) | Use the [date parts]({% link docs/stable/sql/functions/datepart.md %}) of the timestamp in the given time zone to construct a timestamp. Effectively, the result is a “local” time. |\n\n#### `current_localtime()`\n\n<div class=\"nostroke_table\"></div>\n\n| **Description** | Returns a `TIME` whose GMT bin values correspond to local time in the current time zone. |\n| **Example** | `current_localtime()` |\n| **Result** | `08:47:56.497` |\n\n#### `current_localtimestamp()`\n\n<div class=\"nostroke_table\"></div>\n\n| **Description** | Returns a `TIMESTAMP` whose GMT bin values correspond to local date and time in the current time zone. |\n| **Example** | `current_localtimestamp()` |\n| **Result** | `2022-12-17 08:47:56.497` |\n\n#### `localtime`\n\n<div class=\"nostroke_table\"></div>\n\n| **Description** | Synonym for the `current_localtime()` function call. |\n| **Example** | `localtime` |\n| **Result** | `08:47:56.497` |\n\n#### `localtimestamp`\n\n<div class=\"nostroke_table\"></div>\n\n| **Description** | Synonym for the `current_localtimestamp()` function call. |\n| **Example** | `localtimestamp` |\n| **Result** | `2022-12-17 08:47:56.497` |\n\n#### `timezone(text, timestamp)`\n\n<div class=\"nostroke_table\"></div>\n\n| **Description** | Use the [date parts]({% link docs/stable/sql/functions/datepart.md %}) of the timestamp in GMT to construct a timestamp in the given time zone. Effectively, the argument is a “local” time. |\n| **Example** | `timezone('America/Denver', TIMESTAMP '2001-02-16 20:38:40')` |\n| **Result** | `2001-02-16 19:38:40-08` |\n\n#### `timezone(text, timestamptz)`\n\n<div class=\"nostroke_table\"></div>\n\n| **Description** | Use the [date parts]({% link docs/stable/sql/functions/datepart.md %}) of the timestamp in the given time zone to construct a timestamp. Effectively, the result is a “local” time. |\n| **Example** | `timezone('America/Denver', TIMESTAMPTZ '2001-02-16 20:38:40-05')` |\n| **Result** | `2001-02-16 18:38:40` |\n\n## At Time Zone\n\nThe `AT TIME ZONE` syntax is syntactic sugar for the (two argument) `timezone` function listed above:\n\n```sql\nSELECT TIMESTAMP '2001-02-16 20:38:40' AT TIME ZONE 'America/Denver' AS ts;\n```\n\n```text\n2001-02-16 19:38:40-08\n```\n\n```sql\nSELECT TIMESTAMP WITH TIME ZONE '2001-02-16 20:38:40-05' AT TIME ZONE 'America/Denver' AS ts;\n```\n\n```text\n2001-02-16 18:38:40\n```\n\nNote that numeric timezones are not allowed:\n\n```sql\nSELECT TIMESTAMP '2001-02-16 20:38:40-05' AT TIME ZONE '0200' AS ts;\n```\n\n```console\nNot implemented Error: Unknown TimeZone '0200'\n```\n\n## Infinities\n\nFunctions applied to infinite dates will either return the same infinite dates\n(e.g., `greatest`) or `NULL` (e.g., `date_part`) depending on what “makes sense”.\nIn general, if the function needs to examine the parts of the infinite temporal value,\nthe result will be `NULL`.\n\n## Calendars\n\nThe ICU extension also supports [non-Gregorian calendars]({% link docs/stable/sql/data_types/timestamp.md %}#calendar-support).\nIf such a calendar is current, then the display and binning operations will use that calendar.\n","try.md":"---\ntitle: TRY expression\n---\n\nThe `TRY` expression ensures that errors caused by the input rows in the child (scalar) expression result in `NULL` for those rows, instead of causing the query to throw an error.\n\n> The `TRY` expression was inspired by the [`TRY_CAST` expression]({% link docs/stable/sql/expressions/cast.md %}#try_cast).\n\n## Examples\n\nThe following calls return errors when invoked without the `TRY` expression.\nWhen they are wrapped into as `TRY` expression, they return `NULL`:\n\n### Casting\n\n#### Without `TRY`\n\n```sql\nSELECT 'abc'::INTEGER;\n```\n\n```console\nConversion Error:\nCould not convert string 'abc' to INT32\n```\n\n#### With `TRY`\n\n```sql\nSELECT TRY('abc'::INTEGER);\n```\n\n```text\nNULL\n```\n\n### Logarithm on Zero\n\n#### Without `TRY`\n\n```sql\nSELECT ln(0);\n```\n\n```console\nOut of Range Error:\ncannot take logarithm of zero\n```\n\n#### With `TRY`\n\n```sql\nSELECT TRY(ln(0));\n```\n\n```text\nNULL\n```\n\n### Casting Multiple Rows\n\n#### Without `TRY`\n\n```sql\nWITH cte AS (FROM (VALUES ('123'), ('test'), ('235')) t(a))\nSELECT a::INTEGER AS x FROM cte;\n```\n\n```console\nConversion Error:\nCould not convert string 'test' to INT32\n```\n\n#### With `TRY`\n\n```sql\nWITH cte AS (FROM (VALUES ('123'), ('test'), ('235')) t(a))\nSELECT TRY(a::INTEGER) AS x FROM cte;\n```\n\n<div class=\"center_aligned_header_table\"></div>\n\n|  x   |\n|-----:|\n| 123  |\n| NULL |\n| 235  |\n\n## Limitations\n\n`TRY` cannot be used in combination with a volatile function or with a [scalar subquery]({% link docs/stable/sql/expressions/subqueries.md %}#scalar-subquery).\nFor example:\n\n```sql\nSELECT TRY(random())\n```\n\n```console\nBinder Error:\nTRY can not be used in combination with a volatile function\n```\n","union.md":`---
title: Union Functions
---

<!-- markdownlint-disable MD001 -->

| Name | Description |
|:--|:-------|
| [\`union.tag\`](#uniontag) | Dot notation serves as an alias for \`union_extract\`. |
| [\`union_extract(union, 'tag')\`](#union_extractunion-tag) | Extract the value with the named tags from the union. \`NULL\` if the tag is not currently selected. |
| [\`union_value(tag := any)\`](#union_valuetag--any) | Create a single member \`UNION\` containing the argument value. The tag of the value will be the bound variable name. |
| [\`union_tag(union)\`](#union_tagunion) | Retrieve the currently selected tag of the union as an [Enum]({% link docs/stable/sql/data_types/enum.md %}). |

#### \`union.tag\`

<div class="nostroke_table"></div>

| **Description** | Dot notation serves as an alias for \`union_extract\`. |
| **Example** | \`(union_value(k := 'hello')).k\` |
| **Result** | \`string\` |

#### \`union_extract(union, 'tag')\`

<div class="nostroke_table"></div>

| **Description** | Extract the value with the named tags from the union. \`NULL\` if the tag is not currently selected. |
| **Example** | \`union_extract(s, 'k')\` |
| **Result** | \`hello\` |

#### \`union_value(tag := any)\`

<div class="nostroke_table"></div>

| **Description** | Create a single member \`UNION\` containing the argument value. The tag of the value will be the bound variable name. |
| **Example** | \`union_value(k := 'hello')\` |
| **Result** | \`'hello'::UNION(k VARCHAR)\` |

#### \`union_tag(union)\`

<div class="nostroke_table"></div>

| **Description** | Retrieve the currently selected tag of the union as an [Enum]({% link docs/stable/sql/data_types/enum.md %}). |
| **Example** | \`union_tag(union_value(k := 'foo'))\` |
| **Result** | \`'k'\` |
`,"unnest.md":`---
title: Unnesting
---

## Examples

Unnest a list, generating 3 rows (1, 2, 3):

\`\`\`sql
SELECT unnest([1, 2, 3]);
\`\`\`

Unnesting a struct, generating two columns (a, b):

\`\`\`sql
SELECT unnest({'a': 42, 'b': 84});
\`\`\`

Recursive unnest of a list of structs:

\`\`\`sql
SELECT unnest([{'a': 42, 'b': 84}, {'a': 100, 'b': NULL}], recursive := true);
\`\`\`

Limit depth of recursive unnest using \`max_depth\`:

\`\`\`sql
SELECT unnest([[[1, 2], [3, 4]], [[5, 6], [7, 8, 9], []], [[10, 11]]], max_depth := 2);
\`\`\`

The \`unnest\` special function is used to unnest lists or structs by one level. The function can be used as a regular scalar function, but only in the \`SELECT\` clause. Invoking \`unnest\` with the \`recursive\` parameter will unnest lists and structs of multiple levels. The depth of unnesting can be limited using the \`max_depth\` parameter (which assumes \`recursive\` unnesting by default).

### Unnesting Lists

Unnest a list, generating 3 rows (1, 2, 3):

\`\`\`sql
SELECT unnest([1, 2, 3]);
\`\`\`

Unnest a list, generating 3 rows ((1, 10), (2, 10), (3, 10)):

\`\`\`sql
SELECT unnest([1, 2, 3]), 10;
\`\`\`

Unnest two lists of different sizes, generating 3 rows ((1, 10), (2, 11), (3, NULL)):

\`\`\`sql
SELECT unnest([1, 2, 3]), unnest([10, 11]);
\`\`\`
Unnest a list column from a subquery:

\`\`\`sql
SELECT unnest(l) + 10 FROM (VALUES ([1, 2, 3]), ([4, 5])) tbl(l);
\`\`\`

Empty result:

\`\`\`sql
SELECT unnest([]);
\`\`\`

Empty result:

\`\`\`sql
SELECT unnest(NULL);
\`\`\`

Using \`unnest\` on a list emits one row per list entry. Regular scalar expressions in the same \`SELECT\` clause are repeated for every emitted row. When multiple lists are unnested in the same \`SELECT\` clause, the lists are unnested side-by-side. If one list is longer than the other, the shorter list is padded with \`NULL\` values.

Empty and \`NULL\` lists both unnest to zero rows.

### Unnesting Structs

Unnesting a struct, generating two columns (a, b):

\`\`\`sql
SELECT unnest({'a': 42, 'b': 84});
\`\`\`

Unnesting a struct, generating two columns (a, b):

\`\`\`sql
SELECT unnest({'a': 42, 'b': {'x': 84}});
\`\`\`

\`unnest\` on a struct will emit one column per entry in the struct.

### Recursive Unnest

Unnesting a list of lists recursively, generating 5 rows (1, 2, 3, 4, 5):

\`\`\`sql
SELECT unnest([[1, 2, 3], [4, 5]], recursive := true);
\`\`\`

Unnesting a list of structs recursively, generating two rows of two columns (a, b):

\`\`\`sql
SELECT unnest([{'a': 42, 'b': 84}, {'a': 100, 'b': NULL}], recursive := true);
\`\`\`

Unnesting a struct, generating two columns (a, b):

\`\`\`sql
SELECT unnest({'a': [1, 2, 3], 'b': 88}, recursive := true);
\`\`\`

Calling \`unnest\` with the \`recursive\` setting will fully unnest lists, followed by fully unnesting structs. This can be useful to fully flatten columns that contain lists within lists, or lists of structs. Note that lists *within* structs are not unnested.

### Setting the Maximum Depth of Unnesting

The \`max_depth\` parameter allows limiting the maximum depth of recursive unnesting (which is assumed by default and does not have to be specified separately).
For example, unnesting to \`max_depth\` of 2 yields the following:

\`\`\`sql
SELECT unnest([[[1, 2], [3, 4]], [[5, 6], [7, 8, 9], []], [[10, 11]]], max_depth := 2) AS x;
\`\`\`

|     x     |
|-----------|
| [1, 2]    |
| [3, 4]    |
| [5, 6]    |
| [7, 8, 9] |
| []        |
| [10, 11]  |

Meanwhile, unnesting to \`max_depth\` of 3 results in:

\`\`\`sql
SELECT unnest([[[1, 2], [3, 4]], [[5, 6], [7, 8, 9], []], [[10, 11]]], max_depth := 3) AS x;
\`\`\`

| x  |
|---:|
| 1  |
| 2  |
| 3  |
| 4  |
| 5  |
| 6  |
| 7  |
| 8  |
| 9  |
| 10 |
| 11 |

### Keeping Track of List Entry Positions

To keep track of each entry's position within the original list, \`unnest\` may be combined with [\`generate_subscripts\`]({% link docs/stable/sql/functions/list.md %}#generate_subscripts):

\`\`\`sql
SELECT unnest(l) AS x, generate_subscripts(l, 1) AS index
FROM (VALUES ([1, 2, 3]), ([4, 5])) tbl(l);
\`\`\`

| x | index |
|--:|------:|
| 1 | 1     |
| 2 | 2     |
| 3 | 3     |
| 4 | 1     |
| 5 | 2     |`,"utility.md":'---\ntitle: Utility Functions\n---\n\n<!-- markdownlint-disable MD001 -->\n\n## Scalar Utility Functions\n\nThe functions below are difficult to categorize into specific function types and are broadly useful.\n\n| Name | Description |\n|:--|:-------|\n| [`alias(column)`](#aliascolumn) | Return the name of the column. |\n| [`can_cast_implicitly(source_value, target_value)`](#can_cast_implicitlysource_value-target_value) | Whether or not we can implicitly cast from the types of the source value to the target value. |\n| [`checkpoint(database)`](#checkpointdatabase) | Synchronize WAL with file for (optional) database without interrupting transactions. |\n| [`coalesce(expr, ...)`](#coalesceexpr-) | Return the first expression that evaluates to a non-`NULL` value. Accepts 1 or more parameters. Each expression can be a column, literal value, function result, or many others. |\n| [`constant_or_null(arg1, arg2)`](#constant_or_nullarg1-arg2) | If `arg2` is `NULL`, return `NULL`. Otherwise, return `arg1`. |\n| [`count_if(x)`](#count_ifx) | Aggregate function; rows contribute 1 if `x` is `true` or a non-zero number, else 0. |\n| [`create_sort_key(parameters...)`](#create_sort_keyparameters) | Constructs a binary-comparable sort key based on a set of input parameters and sort qualifiers. |\n| [`current_catalog()`](#current_catalog) | Return the name of the currently active catalog. Default is memory. |\n| [`current_database()`](#current_database) | Return the name of the currently active database. |\n| [`current_query()`](#current_query) | Return the current query as a string. |\n| [`current_schema()`](#current_schema) | Return the name of the currently active schema. Default is main. |\n| [`current_schemas(boolean)`](#current_schemasboolean) | Return list of schemas. Pass a parameter of `true` to include implicit schemas. |\n| [`current_setting(\'setting_name\')`](#current_settingsetting_name) | Return the current value of the configuration setting. |\n| [`currval(\'sequence_name\')`](#currvalsequence_name) | Return the current value of the sequence. Note that `nextval` must be called at least once prior to calling `currval`. |\n| [`error(message)`](#errormessage) | Throws the given error `message`. |\n| [`equi_width_bins(min, max, bincount, nice := false)`](#equi_width_binsmin-max-bincount-nice--false) | Returns the upper boundaries of a partition of the interval `[min, max]` into `bin_count` equal-sized subintervals (for use with, e.g., [`histogram`]({% link docs/stable/sql/functions/aggregates.md %}#histogramargboundaries)). If `nice = true`, then `min`, `max` and `bincount` may be adjusted to produce more aesthetically pleasing results. |\n| [`force_checkpoint(database)`](#force_checkpointdatabase) | Synchronize WAL with file for (optional) database interrupting transactions. |\n| [`gen_random_uuid()`](#gen_random_uuid) | Return a random UUID similar to this: `eeccb8c5-9943-b2bb-bb5e-222f4e14b687`. |\n| [`getenv(var)`](#getenvvar) | Returns the value of the environment variable `var`. Only available in the [command line client]({% link docs/stable/clients/cli/overview.md %}). |\n| [`hash(value)`](#hashvalue) | Returns a `UBIGINT` with a hash of `value`. The used hash function may change across DuckDB versions.|\n| [`icu_sort_key(string, collator)`](#icu_sort_keystring-collator) | Surrogate [sort key](https://unicode-org.github.io/icu/userguide/collation/architecture.html#sort-keys) used to sort special characters according to the specific locale. Collator parameter is optional. Only available when the ICU extension is installed. |\n| [`if(a, b, c)`](#ifa-b-c) | Ternary conditional operator. |\n| [`ifnull(expr, other)`](#ifnullexpr-other) | A two-argument version of coalesce. |\n| [`is_histogram_other_bin(arg)`](#is_histogram_other_binarg) | Returns `true` when `arg` is the "catch-all element" of its datatype for the purpose of the [`histogram_exact`]({% link docs/stable/sql/functions/aggregates.md %}#histogram_exactargelements) function, which is equal to the "right-most boundary" of its datatype for the purpose of the [`histogram`]({% link docs/stable/sql/functions/aggregates.md %}#histogramargboundaries) function. |\n| [`md5(string)`](#md5string) | Returns the MD5 hash of the `string` as a `VARCHAR`. |\n| [`md5_number(string)`](#md5_numberstring) | Returns the MD5 hash of the `string` as a `UHUGEINT`. |\n| [`md5_number_lower(string)`](#md5_number_lowerstring) | Returns the lower 64-bit segment of the MD5 hash of the `string` as a `UBIGINT`. |\n| [`md5_number_upper(string)`](#md5_number_upperstring) | Returns the upper 64-bit segment of the MD5 hash of the `string` as a `UBIGINT`. |\n| [`nextval(\'sequence_name\')`](#nextvalsequence_name) | Return the following value of the sequence. |\n| [`nullif(a, b)`](#nullifa-b) | Return `NULL` if `a = b`, else return `a`. Equivalent to `CASE WHEN a = b THEN NULL ELSE a END`. |\n| [`pg_typeof(expression)`](#pg_typeofexpression) | Returns the lower case name of the data type of the result of the expression. For PostgreSQL compatibility. |\n| [`query(`*`query_string`*`)`](#queryquery_string) | Table function that parses and executes the query defined in *`query_string`*. Only constant strings are allowed. Warning: this function allows invoking arbitrary queries, potentially altering the database state. |\n| [`query_table(`*`tbl_name`*`)`](#query_tabletbl_name) | Table function that returns the table given in *`tbl_name`*. |\n| [`query_table(`*`tbl_names`*`, [`*`by_name`*`])`](#query_tabletbl_names-by_name) | Table function that returns the union of tables given in *`tbl_names`*. If the optional *`by_name`* parameter is set to `true`, it uses [`UNION ALL BY NAME`]({% link docs/stable/sql/query_syntax/setops.md %}#union-all-by-name) semantics. |\n| [`read_blob(source)`](#read_blobsource) | Returns the content from `source` (a filename, a list of filenames, or a glob pattern) as a `BLOB`. See the [`read_blob` guide]({% link docs/stable/guides/file_formats/read_file.md %}#read_blob) for more details. |\n| [`read_text(source)`](#read_textsource) | Returns the content from `source` (a filename, a list of filenames, or a glob pattern) as a `VARCHAR`. The file content is first validated to be valid UTF-8. If `read_text` attempts to read a file with invalid UTF-8 an error is thrown suggesting to use `read_blob` instead. See the [`read_text` guide]({% link docs/stable/guides/file_formats/read_file.md %}#read_text) for more details. |\n| [`sha1(string)`](#sha1string) | Returns a `VARCHAR` with the SHA-1 hash of the `string`. |\n| [`sha256(string)`](#sha256string) | Returns a `VARCHAR` with the SHA-256 hash of the `string`. |\n| [`stats(expression)`](#statsexpression) | Returns a string with statistics about the expression. Expression can be a column, constant, or SQL expression. |\n| [`txid_current()`](#txid_current) | Returns the current transaction\'s identifier, a `BIGINT` value. It will assign a new one if the current transaction does not have one already. |\n| [`typeof(expression)`](#typeofexpression) | Returns the name of the data type of the result of the expression. |\n| [`uuid()`](#uuid) | Return a random UUID (UUIDv4) similar to this: `eeccb8c5-9943-b2bb-bb5e-222f4e14b687`. |\n| [`uuidv4()`](#uuidv4) | Return a random UUID (UUIDv4) similar to this: `eeccb8c5-9943-b2bb-bb5e-222f4e14b687`. |\n| [`uuidv7()`](#uuidv7) | Return a random UUIDv7 similar to this: `81964ebe-00b1-7e1d-b0f9-43c29b6fb8f5`. |\n| [`uuid_extract_timestamp(uuidv7)`](#uuid_extract_timestampuuidv7) | Extracts `TIMESTAMP WITH TIME ZONE` from a UUIDv7 value. |\n| [`uuid_extract_version(uuid)`](#uuid_extract_versionuuid) | Extracts UUID version (`4` or `7`). |\n| [`version()`](#version) | Return the currently active version of DuckDB in this format. |\n\n#### `alias(column)`\n\n<div class="nostroke_table"></div>\n\n| **Description** | Return the name of the column. |\n| **Example** | `alias(column1)` |\n| **Result** | `column1` |\n\n#### `can_cast_implicitly(source_value, target_value)`\n\n<div class="nostroke_table"></div>\n\n| **Description** | Whether or not we can implicitly cast from the types of the source value to the target value. |\n| **Example** | `can_cast_implicitly(1::BIGINT, 1::SMALLINT)` |\n| **Result** | `false` |\n\n#### `checkpoint(database)`\n\n<div class="nostroke_table"></div>\n\n| **Description** | Synchronize WAL with file for (optional) database without interrupting transactions. |\n| **Example** | `checkpoint(my_db)` |\n| **Result** | success Boolean |\n\n#### `coalesce(expr, ...)`\n\n<div class="nostroke_table"></div>\n\n| **Description** | Return the first expression that evaluates to a non-`NULL` value. Accepts 1 or more parameters. Each expression can be a column, literal value, function result, or many others. |\n| **Example** | `coalesce(NULL, NULL, \'default_string\')` |\n| **Result** | `default_string` |\n\n#### `constant_or_null(arg1, arg2)`\n\n<div class="nostroke_table"></div>\n\n| **Description** | If `arg2` is `NULL`, return `NULL`. Otherwise, return `arg1`. |\n| **Example** | `constant_or_null(42, NULL)` |\n| **Result** | `NULL` |\n\n#### `count_if(x)`\n\n<div class="nostroke_table"></div>\n\n| **Description** | Aggregate function; rows contribute 1 if `x` is `true` or a non-zero number, else 0. |\n| **Example** | `count_if(42)` |\n| **Result** | 1 |\n\n#### `create_sort_key(parameters...)`\n\n<div class="nostroke_table"></div>\n\n| **Description** | Constructs a binary-comparable sort key based on a set of input parameters and sort qualifiers. |\n| **Example** | `create_sort_key(\'abc\', \'ASC NULLS FIRST\');` |\n| **Result** | `\\x02bcd\\x00` |\n\n#### `current_catalog()`\n\n<div class="nostroke_table"></div>\n\n| **Description** | Return the name of the currently active catalog. Default is memory. |\n| **Example** | `current_catalog()` |\n| **Result** | `memory` |\n\n#### `current_database()`\n\n<div class="nostroke_table"></div>\n\n| **Description** | Return the name of the currently active database. |\n| **Example** | `current_database()` |\n| **Result** | `memory` |\n\n#### `current_query()`\n\n<div class="nostroke_table"></div>\n\n| **Description** | Return the current query as a string. |\n| **Example** | `current_query()` |\n| **Result** | `SELECT current_query();` |\n\n#### `current_schema()`\n\n<div class="nostroke_table"></div>\n\n| **Description** | Return the name of the currently active schema. Default is main. |\n| **Example** | `current_schema()` |\n| **Result** | `main` |\n\n#### `current_schemas(boolean)`\n\n<div class="nostroke_table"></div>\n\n| **Description** | Return list of schemas. Pass a parameter of `true` to include implicit schemas. |\n| **Example** | `current_schemas(true)` |\n| **Result** | `[\'temp\', \'main\', \'pg_catalog\']` |\n\n#### `current_setting(\'setting_name\')`\n\n<div class="nostroke_table"></div>\n\n| **Description** | Return the current value of the configuration setting. |\n| **Example** | `current_setting(\'access_mode\')` |\n| **Result** | `automatic` |\n\n#### `currval(\'sequence_name\')`\n\n<div class="nostroke_table"></div>\n\n| **Description** | Return the current value of the sequence. Note that `nextval` must be called at least once prior to calling `currval`. |\n| **Example** | `currval(\'my_sequence_name\')` |\n| **Result** | `1` |\n\n#### `error(message)`\n\n<div class="nostroke_table"></div>\n\n| **Description** | Throws the given error `message`. |\n| **Example** | `error(\'access_mode\')` |\n\n#### `equi_width_bins(min, max, bincount, nice := false)`\n\n<div class="nostroke_table"></div>\n\n| **Description** | Returns the upper boundaries of a partition of the interval `[min, max]` into `bin_count` equal-sized subintervals (for use with, e.g., [`histogram`]({% link docs/stable/sql/functions/aggregates.md %}#histogramargboundaries)). If `nice = true`, then `min`, `max` and `bincount` may be adjusted to produce more aesthetically pleasing results.  |\n| **Example** | `equi_width_bins(0.1, 2.7, 4, true)` |\n| **Result** | `[0.5, 1.0, 1.5, 2.0, 2.5, 3.0]` |\n\n#### `force_checkpoint(database)`\n\n<div class="nostroke_table"></div>\n\n| **Description** | Synchronize WAL with file for (optional) database interrupting transactions. |\n| **Example** | `force_checkpoint(my_db)` |\n| **Result** | success Boolean |\n\n#### `gen_random_uuid()`\n\n<div class="nostroke_table"></div>\n\n| **Description** | Return a random UUID (UUIDv4) similar to this: `eeccb8c5-9943-b2bb-bb5e-222f4e14b687`. |\n| **Example** | `gen_random_uuid()` |\n| **Result** | various |\n\n#### `getenv(var)`\n\n| **Description** | Returns the value of the environment variable `var`. Only available in the [command line client]({% link docs/stable/clients/cli/overview.md %}). |\n| **Example** | `getenv(\'HOME\')` |\n| **Result** | `/path/to/user/home` |\n\n#### `hash(value)`\n\n<div class="nostroke_table"></div>\n\n| **Description** | Returns a `UBIGINT` with the hash of the `value`. The used hash function may change across DuckDB versions. |\n| **Example** | `hash(\'🦆\')` |\n| **Result** | `2595805878642663834` |\n\n#### `icu_sort_key(string, collator)`\n\n<div class="nostroke_table"></div>\n\n| **Description** | Surrogate [sort key](https://unicode-org.github.io/icu/userguide/collation/architecture.html#sort-keys) used to sort special characters according to the specific locale. Collator parameter is optional. Only available when the ICU extension is installed. |\n| **Example** | `icu_sort_key(\'ö\', \'DE\')` |\n| **Result** | `460145960106` |\n\n#### `if(a, b, c)`\n\n<div class="nostroke_table"></div>\n\n| **Description** | Ternary conditional operator; returns b if a, else returns c. Equivalent to `CASE WHEN a THEN b ELSE c END`. |\n| **Example** | `if(2 > 1, 3, 4)` |\n| **Result** | `3` |\n\n#### `ifnull(expr, other)`\n\n<div class="nostroke_table"></div>\n\n| **Description** | A two-argument version of coalesce. |\n| **Example** | `ifnull(NULL, \'default_string\')` |\n| **Result** | `default_string` |\n\n#### `is_histogram_other_bin(arg)`\n\n<div class="nostroke_table"></div>\n\n| **Description** | Returns `true` when `arg` is the "catch-all element" of its datatype for the purpose of the [`histogram_exact`]({% link docs/stable/sql/functions/aggregates.md %}#histogram_exactargelements) function, which is equal to the "right-most boundary" of its datatype for the purpose of the [`histogram`]({% link docs/stable/sql/functions/aggregates.md %}#histogramargboundaries) function. |\n| **Example** | `is_histogram_other_bin(\'\')` |\n| **Result** | `true` |\n\n#### `md5(string)`\n\n<div class="nostroke_table"></div>\n\n| **Description** | Returns the MD5 hash of the `string` as a `VARCHAR`. |\n| **Example** | `md5(\'abc\')` |\n| **Result** | `900150983cd24fb0d6963f7d28e17f72` |\n\n#### `md5_number(string)`\n\n<div class="nostroke_table"></div>\n\n| **Description** | Returns the MD5 hash of the `string` as a `UHUGEINT`. |\n| **Example** | `md5_number(\'abc\')` |\n| **Result** | `152195979970564155685860391459828531600` |\n\n#### `md5_number_lower(string)`\n\n<div class="nostroke_table"></div>\n\n| **Description** | Returns the lower 8 bytes of the MD5 hash of `string` as a `UBIGINT`. |\n| **Example** | `md5_number_lower(\'abc\')` |\n| **Result** | `8250560606382298838` |\n\n#### `md5_number_upper(string)`\n\n<div class="nostroke_table"></div>\n\n| **Description** | Returns the upper 8 bytes of the MD5 hash of `string` as a `UBIGINT`. |\n| **Example** | `md5_number_upper(\'abc\')` |\n| **Result** | `12704604231530709392` |\n\n#### `nextval(\'sequence_name\')`\n\n<div class="nostroke_table"></div>\n\n| **Description** | Return the following value of the sequence. |\n| **Example** | `nextval(\'my_sequence_name\')` |\n| **Result** | `2` |\n\n#### `nullif(a, b)`\n\n<div class="nostroke_table"></div>\n\n| **Description** | Return `NULL` if a = b, else return a. Equivalent to `CASE WHEN a = b THEN NULL ELSE a END`. |\n| **Example** | `nullif(1+1, 2)` |\n| **Result** | `NULL` |\n\n#### `pg_typeof(expression)`\n\n<div class="nostroke_table"></div>\n\n| **Description** | Returns the lower case name of the data type of the result of the expression. For PostgreSQL compatibility. |\n| **Example** | `pg_typeof(\'abc\')` |\n| **Result** | `varchar` |\n\n#### `query(query_string)`\n\n<div class="nostroke_table"></div>\n\n| **Description** | Table function that parses and executes the query defined in `query_string`. Only constant strings are allowed. Warning: this function allows invoking arbitrary queries, potentially altering the database state. |\n| **Example** | `query(\'SELECT 42 AS x\')` |\n| **Result** | `42` |\n\n#### `query_table(tbl_name)`\n\n<div class="nostroke_table"></div>\n\n| **Description** | Table function that returns the table given in `tbl_name`. |\n| **Example** | `query_table(\'t1\')` |\n| **Result** | (the rows of `t1`) |\n\n#### `query_table(tbl_names, [by_name])`\n\n<div class="nostroke_table"></div>\n\n| **Description** | Table function that returns the union of tables given in `tbl_names`. If the optional `by_name` parameter is set to `true`, it uses [`UNION ALL BY NAME`]({% link docs/stable/sql/query_syntax/setops.md %}#union-all-by-name) semantics. |\n| **Example** | `query_table([\'t1\', \'t2\'])` |\n| **Result** | (the union of the two tables) |\n\n#### `read_blob(source)`\n\n<div class="nostroke_table"></div>\n\n| **Description** | Returns the content from `source` (a filename, a list of filenames, or a glob pattern) as a `BLOB`. See the [`read_blob` guide]({% link docs/stable/guides/file_formats/read_file.md %}#read_blob) for more details. |\n| **Example** | `read_blob(\'hello.bin\')` |\n| **Result** | `hello\\x0A` |\n\n#### `read_text(source)`\n\n<div class="nostroke_table"></div>\n\n| **Description** | Returns the content from `source` (a filename, a list of filenames, or a glob pattern) as a `VARCHAR`. The file content is first validated to be valid UTF-8. If `read_text` attempts to read a file with invalid UTF-8 an error is thrown suggesting to use `read_blob` instead. See the [`read_text` guide]({% link docs/stable/guides/file_formats/read_file.md %}#read_text) for more details. |\n| **Example** | `read_text(\'hello.txt\')` |\n| **Result** | `hello\\n` |\n\n#### `sha1(string)`\n\n<div class="nostroke_table"></div>\n\n| **Description** | Returns a `VARCHAR` with the SHA-1 hash of the `string`. |\n| **Example** | `sha1(\'🦆\')` |\n| **Result** | `949bf843dc338be348fb9525d1eb535d31241d76` |\n\n#### `sha256(string)`\n\n<div class="nostroke_table"></div>\n\n| **Description** | Returns a `VARCHAR` with the SHA-256 hash of the `string`. |\n| **Example** | `sha256(\'🦆\')` |\n| **Result** | `d7a5c5e0d1d94c32218539e7e47d4ba9c3c7b77d61332fb60d633dde89e473fb` |\n\n#### `stats(expression)`\n\n<div class="nostroke_table"></div>\n\n| **Description** | Returns a string with statistics about the expression. Expression can be a column, constant, or SQL expression. |\n| **Example** | `stats(5)` |\n| **Result** | `\'[Min: 5, Max: 5][Has Null: false]\'` |\n\n#### `txid_current()`\n\n<div class="nostroke_table"></div>\n\n| **Description** | Returns the current transaction\'s identifier, a `BIGINT` value. It will assign a new one if the current transaction does not have one already. |\n| **Example** | `txid_current()` |\n| **Result** | various |\n\n#### `typeof(expression)`\n\n<div class="nostroke_table"></div>\n\n| **Description** | Returns the name of the data type of the result of the expression. |\n| **Example** | `typeof(\'abc\')` |\n| **Result** | `VARCHAR` |\n\n#### `uuid()`\n\n<div class="nostroke_table"></div>\n\n| **Description** | Return a random UUID (UUIDv4) similar to this: `eeccb8c5-9943-b2bb-bb5e-222f4e14b687`. |\n| **Example** | `uuid()` |\n| **Result** | various |\n\n#### `uuidv4()`\n\n| **Description** | Return a random UUID (UUIDv4) similar to this: `eeccb8c5-9943-b2bb-bb5e-222f4e14b687`. |\n| **Example** | `uuidv4()` |\n| **Result** | various |\n\n#### `uuidv7()`\n\n| **Description** | Return a random UUIDv7 similar to this: `81964ebe-00b1-7e1d-b0f9-43c29b6fb8f5`. |\n| **Example** | `uuidv7()` |\n| **Result** | various |\n\n#### `uuid_extract_timestamp(uuidv7)`\n\n| **Description** | Extracts `TIMESTAMP WITH TIME ZONE` from a UUIDv7 value. |\n| **Example** | `uuid_extract_timestamp(uuidv7())` |\n| **Result** | `2025-04-19 15:51:20.07+00` |\n\n#### `uuid_extract_version(uuid)`\n\n| **Description** | Extracts UUID version (`4` or `7`). |\n| **Example** | `uuid_extract_version(uuidv7())` |\n| **Result** | `7` |\n\n#### `version()`\n\n<div class="nostroke_table"></div>\n\n| **Description** | Return the currently active version of DuckDB in this format. |\n| **Example** | `version()` |\n| **Result** | various |\n\n## Utility Table Functions\n\nA [table function]({% link docs/stable/sql/query_syntax/from.md %}#table-functions) is used in place of a table in a `FROM` clause.\n\n| Name | Description |\n|:--|:-------|\n| [`glob(search_path)`](#globsearch_path) | Return filenames found at the location indicated by the *search_path* in a single column named `file`. The *search_path* may contain [glob pattern matching syntax]({% link docs/stable/sql/functions/pattern_matching.md %}). |\n| [`repeat_row(varargs, num_rows)`](#repeat_rowvarargs-num_rows) | Returns a table with `num_rows` rows, each containing the fields defined in `varargs`. |\n\n#### `glob(search_path)`\n\n<div class="nostroke_table"></div>\n\n| **Description** | Return filenames found at the location indicated by the *search_path* in a single column named `file`. The *search_path* may contain [glob pattern matching syntax]({% link docs/stable/sql/functions/pattern_matching.md %}). |\n| **Example** | `glob(\'*\')` |\n| **Result** | (table of filenames) |\n\n#### `repeat_row(varargs, num_rows)`\n\n<div class="nostroke_table"></div>\n\n| **Description** | Returns a table with `num_rows` rows, each containing the fields defined in `varargs`. |\n| **Example** | `repeat_row(1, 2, \'foo\', num_rows = 3)` |\n| **Result** | 3 rows of `1, 2, \'foo\'` |\n',"values.md":`---
title: VALUES Clause
---

The \`VALUES\` clause is used to specify a fixed number of rows. The \`VALUES\` clause can be used as a stand-alone statement, as part of the \`FROM\` clause, or as input to an \`INSERT INTO\` statement.

## Examples

Generate two rows and directly return them:

\`\`\`sql
VALUES ('Amsterdam', 1), ('London', 2);
\`\`\`

Generate two rows as part of a \`FROM\` clause, and rename the columns:

\`\`\`sql
SELECT *
FROM (VALUES ('Amsterdam', 1), ('London', 2)) cities(name, id);
\`\`\`

Generate two rows and insert them into a table:

\`\`\`sql
INSERT INTO cities
VALUES ('Amsterdam', 1), ('London', 2);
\`\`\`

Create a table directly from a \`VALUES\` clause:

\`\`\`sql
CREATE TABLE cities AS
    SELECT *
    FROM (VALUES ('Amsterdam', 1), ('London', 2)) cities(name, id);
\`\`\`

## Syntax

<div id="rrdiagram"></div>
`,"where.md":`---
title: WHERE Clause
---

The \`WHERE\` clause specifies any filters to apply to the data. This allows you to select only a subset of the data in which you are interested. Logically the \`WHERE\` clause is applied immediately after the \`FROM\` clause.

## Examples

Select all rows where the \`id\` is equal to 3:

\`\`\`sql
SELECT *
FROM tbl
WHERE id = 3;
\`\`\`

Select all rows that match the given **case-sensitive** \`LIKE\` expression:

\`\`\`sql
SELECT *
FROM tbl
WHERE name LIKE '%mark%';
\`\`\`

Select all rows that match the given **case-insensitive** expression formulated with the \`ILIKE\` operator:

\`\`\`sql
SELECT *
FROM tbl
WHERE name ILIKE '%mark%';
\`\`\`

Select all rows that match the given composite expression:

\`\`\`sql
SELECT *
FROM tbl
WHERE id = 3 OR id = 7;
\`\`\`

## Syntax

<div id="rrdiagram"></div>
`,"window.md":`---
title: WINDOW Clause
---

The \`WINDOW\` clause allows you to specify named windows that can be used within [window functions]({% link docs/stable/sql/functions/window_functions.md %}). These are useful when you have multiple window functions, as they allow you to avoid repeating the same window clause.

## Syntax

<div id="rrdiagram"></div>
`,"window_functions.md":'---\ntitle: Window Functions\n---\n\n<!-- markdownlint-disable MD001 -->\n\nDuckDB supports [window functions](https://en.wikipedia.org/wiki/Window_function_(SQL)), which can use multiple rows to calculate a value for each row.\nWindow functions are [blocking operators]({% link docs/stable/guides/performance/how_to_tune_workloads.md %}#blocking-operators), i.e., they require their entire input to be buffered, making them one of the most memory-intensive operators in SQL.\n\nWindow functions are available in SQL since [SQL:2003](https://en.wikipedia.org/wiki/SQL:2003) and are supported by major SQL database systems.\n\n## Examples\n\nGenerate a `row_number` column to enumerate rows:\n\n```sql\nSELECT row_number() OVER ()\nFROM sales;\n```\n\n> Tip If you only need a number for each row in a table, you can use the [`rowid` pseudocolumn]({% link docs/stable/sql/statements/select.md %}#row-ids).\n\nGenerate a `row_number` column to enumerate rows, ordered by `time`:\n\n```sql\nSELECT row_number() OVER (ORDER BY time)\nFROM sales;\n```\n\nGenerate a `row_number` column to enumerate rows, ordered by `time` and partitioned by `region`:\n\n```sql\nSELECT row_number() OVER (PARTITION BY region ORDER BY time)\nFROM sales;\n```\n\nCompute the difference between the current and the previous-by-`time` `amount`:\n\n```sql\nSELECT amount - lag(amount) OVER (ORDER BY time)\nFROM sales;\n```\n\nCompute the percentage of the total `amount` of sales per `region` for each row:\n\n```sql\nSELECT amount / sum(amount) OVER (PARTITION BY region)\nFROM sales;\n```\n\n## Syntax\n\n<div id="rrdiagram"></div>\n\nWindow functions can only be used in the `SELECT` clause. To share `OVER` specifications between functions, use the statement\'s [`WINDOW` clause]({% link docs/stable/sql/query_syntax/window.md %}) and use the `OVER ⟨window_name⟩`{:.language-sql .highlight} syntax.\n\n## General-Purpose Window Functions\n\nThe table below shows the available general window functions.\n\n| Name | Description |\n|:--|:-------|\n| [`cume_dist([ORDER BY ordering])`](#cume_distorder-by-ordering) | The cumulative distribution: (number of partition rows preceding or peer with current row) / total partition rows. |\n| [`dense_rank()`](#dense_rank) | The rank of the current row *without gaps;* this function counts peer groups. |\n| [`fill(expr [ ORDER BY ordering])`](#fillexpr-order-by-ordering) | Fill in missing values using linear interpolation with `ORDER BY` as the X-axis. |\n| [`first_value(expr[ ORDER BY ordering][ IGNORE NULLS])`](#first_valueexpr-order-by-ordering-ignore-nulls) | Returns `expr` evaluated at the row that is the first row (with a non-null value of `expr` if `IGNORE NULLS` is set) of the window frame. |\n| [`lag(expr[, offset[, default]][ ORDER BY ordering][ IGNORE NULLS])`](#lagexpr-offset-default-order-by-ordering-ignore-nulls) | Returns `expr` evaluated at the row that is `offset` rows (among rows with a non-null value of `expr` if `IGNORE NULLS` is set) before the current row within the window frame; if there is no such row, instead return `default` (which must be of the Same type as `expr`). Both `offset` and `default` are evaluated with respect to the current row. If omitted, `offset` defaults to `1` and default to `NULL`. |\n| [`last_value(expr[ ORDER BY ordering][ IGNORE NULLS])`](#last_valueexpr-order-by-ordering-ignore-nulls) | Returns `expr` evaluated at the row that is the last row (among rows with a non-null value of `expr` if `IGNORE NULLS` is set) of the window frame. |\n| [`lead(expr[, offset[, default]][ ORDER BY ordering][ IGNORE NULLS])`](#leadexpr-offset-default-order-by-ordering-ignore-nulls) | Returns `expr` evaluated at the row that is `offset` rows after the current row (among rows with a non-null value of `expr` if `IGNORE NULLS` is set) within the window frame; if there is no such row, instead return `default` (which must be of the Same type as `expr`). Both `offset` and `default` are evaluated with respect to the current row. If omitted, `offset` defaults to `1` and default to `NULL`. |\n| [`nth_value(expr, nth[ ORDER BY ordering][ IGNORE NULLS])`](#nth_valueexpr-nth-order-by-ordering-ignore-nulls) | Returns `expr` evaluated at the nth row (among rows with a non-null value of `expr` if `IGNORE NULLS` is set) of the window frame (counting from 1); `NULL` if no such row. |\n| [`ntile(num_buckets[ ORDER BY ordering])`](#ntilenum_buckets-order-by-ordering) | An integer ranging from 1 to `num_buckets`, dividing the partition as equally as possible. |\n| [`percent_rank([ORDER BY ordering])`](#percent_rankorder-by-ordering) | The relative rank of the current row: `(rank() - 1) / (total partition rows - 1)`. |\n| [`rank([ORDER BY ordering])`](#rankorder-by-ordering) | The rank of the current row *with gaps;* same as `row_number` of its first peer. |\n| [`row_number([ORDER BY ordering])`](#row_numberorder-by-ordering) | The number of the current row within the partition, counting from 1. |\n\n#### `cume_dist([ORDER BY ordering])`\n\n<div class="nostroke_table"></div>\n\n| **Description** | The cumulative distribution: (number of partition rows preceding or peer with current row) / total partition rows. If an `ORDER BY` clause is specified, the distribution is computed within the frame using the provided ordering instead of the frame ordering. |\n| **Return type** | `DOUBLE` |\n| **Example** | `cume_dist()` |\n\n#### `dense_rank()`\n\n<div class="nostroke_table"></div>\n\n| **Description** | The rank of the current row *without gaps;* this function counts peer groups. |\n| **Return type** | `BIGINT` |\n| **Example** | `dense_rank()` |\n| **Aliases** | `rank_dense()` |\n\n#### `fill(expr[ ORDER BY ordering])`\n\n<div class="nostroke_table"></div>\n\n| **Description** | Replaces `NULL` values of `expr` with a linear interpolation based on the closest non-`NULL` values and  the sort values. Both values must support arithmetic and there must be only one ordering key. For missing values at the ends, linear extrapolation is used. Failure to interpolate results in the `NULL` value being retained. |\n| **Return type** | Same type as `expr` |\n| **Example** | `fill(column)` |\n\n#### `first_value(expr[ ORDER BY ordering][ IGNORE NULLS])`\n\n<div class="nostroke_table"></div>\n\n| **Description** | Returns `expr` evaluated at the row that is the first row (with a non-null value of `expr` if `IGNORE NULLS` is set) of the window frame. If an `ORDER BY` clause is specified, the first row number is computed within the frame using the provided ordering instead of the frame ordering. |\n| **Return type** | Same type as `expr` |\n| **Example** | `first_value(column)` |\n\n#### `lag(expr[, offset[, default]][ ORDER BY ordering][ IGNORE NULLS])`\n\n<div class="nostroke_table"></div>\n\n| **Description** | Returns `expr` evaluated at the row that is `offset` rows (among rows with a non-null value of `expr` if `IGNORE NULLS` is set) before the current row within the window frame; if there is no such row, instead return `default` (which must be of the Same type as `expr`). Both `offset` and `default` are evaluated with respect to the current row. If omitted, `offset` defaults to `1` and default to `NULL`. If an `ORDER BY` clause is specified, the lagged row number is computed within the frame using the provided ordering instead of the frame ordering. |\n| **Return type** | Same type as `expr` |\n| **Example** | `lag(column, 3, 0)` |\n\n#### `last_value(expr[ ORDER BY ordering][ IGNORE NULLS])`\n\n<div class="nostroke_table"></div>\n\n| **Description** | Returns `expr` evaluated at the row that is the last row (among rows with a non-null value of `expr` if `IGNORE NULLS` is set) of the window frame. If omitted, `offset` defaults to `1` and default to `NULL`. If an `ORDER BY` clause is specified, the last row is determined within the frame using the provided ordering instead of the frame ordering. |\n| **Return type** | Same type as `expr` |\n| **Example** | `last_value(column)` |\n\n#### `lead(expr[, offset[, default]][ ORDER BY ordering][ IGNORE NULLS])`\n\n<div class="nostroke_table"></div>\n\n| **Description** | Returns `expr` evaluated at the row that is `offset` rows after the current row (among rows with a non-null value of `expr` if `IGNORE NULLS` is set) within the window frame; if there is no such row, instead return `default` (which must be of the Same type as `expr`). Both `offset` and `default` are evaluated with respect to the current row. If omitted, `offset` defaults to `1` and default to `NULL`. If an `ORDER BY` clause is specified, the leading row number is computed within the frame using the provided ordering instead of the frame ordering. |\n| **Return type** | Same type as `expr` |\n| **Example** | `lead(column, 3, 0)` |\n\n#### `nth_value(expr, nth[ ORDER BY ordering][ IGNORE NULLS])`\n\n<div class="nostroke_table"></div>\n\n| **Description** | Returns `expr` evaluated at the nth row (among rows with a non-null value of `expr` if `IGNORE NULLS` is set) of the window frame (counting from 1); `NULL` if no such row. If an `ORDER BY` clause is specified, the nth row number is computed within the frame using the provided ordering instead of the frame ordering. |\n| **Return type** | Same type as `expr` |\n| **Example** | `nth_value(column, 2)` |\n\n#### `ntile(num_buckets[ ORDER BY ordering])`\n\n<div class="nostroke_table"></div>\n\n| **Description** | An integer ranging from 1 to `num_buckets`, dividing the partition as equally as possible. If an `ORDER BY` clause is specified, the ntile is computed within the frame using the provided ordering instead of the frame ordering. |\n| **Return type** | `BIGINT` |\n| **Example** | `ntile(4)` |\n\n#### `percent_rank([ORDER BY ordering])`\n\n<div class="nostroke_table"></div>\n\n| **Description** | The relative rank of the current row: `(rank() - 1) / (total partition rows - 1)`. If an `ORDER BY` clause is specified, the relative rank is computed within the frame using the provided ordering instead of the frame ordering. |\n| **Return type** | `DOUBLE` |\n| **Example** | `percent_rank()` |\n\n#### `rank([ORDER BY ordering])`\n\n<div class="nostroke_table"></div>\n\n| **Description** | The rank of the current row *with gaps*; same as `row_number` of its first peer. If an `ORDER BY` clause is specified, the rank is computed within the frame using the provided ordering instead of the frame ordering. |\n| **Return type** | `BIGINT` |\n| **Example** | `rank()` |\n\n#### `row_number([ORDER BY ordering])`\n\n<div class="nostroke_table"></div>\n\n| **Description** | The number of the current row within the partition, counting from 1. If an `ORDER BY` clause is specified, the row number is computed within the frame using the provided ordering instead of the frame ordering. |\n| **Return type** | `BIGINT` |\n| **Example** | `row_number()` |\n\n## Aggregate Window Functions\n\nAll [aggregate functions]({% link docs/stable/sql/functions/aggregates.md %}) can be used in a windowing context, including the optional [`FILTER` clause]({% link docs/stable/sql/query_syntax/filter.md %}).\nThe `first` and `last` aggregate functions are shadowed by the respective general-purpose window functions, with the minor consequence that the `FILTER` clause is not available for these but `IGNORE NULLS` is.\n\n## DISTINCT Arguments\n\nAll aggregate window functions support using a `DISTINCT` clause for the arguments. When the `DISTINCT` clause is\nprovided, only distinct values are considered in the computation of the aggregate. This is typically used in combination\nwith the `COUNT` aggregate to get the number of distinct elements; but it can be used together with any aggregate\nfunction in the system. There are some aggregates that are insensitive to duplicate values (e.g., `min`, `max`) and for\nthem this clause is parsed and ignored.\n\n```sql\n-- Count the number of distinct users at a given point in time\nSELECT count(DISTINCT name) OVER (ORDER BY time) FROM sales;\n-- Concatenate those distinct users into a list\nSELECT list(DISTINCT name) OVER (ORDER BY time) FROM sales;\n```\n\n## ORDER BY Arguments\n\nAll aggregate window functions support using an `ORDER BY` argument clause that is *different* from the window ordering.\nWhen the `ORDER BY` argument clause is provided, the values being aggregated are sorted before applying the function.\nUsually this is not important, but there are some order-sensitive aggregates that can have indeterminate results (e.g.,\n`mode`, `list` and `string_agg`). These can be made deterministic by ordering the arguments. For order-insensitive\naggregates, this clause is parsed and ignored.\n\n```sql\n-- Compute the modal value up to each time, breaking ties in favor of the most recent value.\nSELECT mode(value ORDER BY time DESC) OVER (ORDER BY time) FROM sales;\n```\n\nThe SQL standard does not provide for using `ORDER BY` with general-purpose window functions, but we have extended all\nof these functions (except `dense_rank`) to accept this syntax and use framing to restrict the range that the secondary\nordering applies to.\n\n```sql\n-- Compare each athlete\'s time in an event with the best time to date\nSELECT event, date, athlete, time\n    first_value(time ORDER BY time DESC) OVER w AS record_time,\n    first_value(athlete ORDER BY time DESC) OVER w AS record_athlete,\nFROM meet_results\nWINDOW w AS (PARTITION BY event ORDER BY datetime)\nORDER BY ALL\n```\n\nNote that there is no comma separating the arguments from the `ORDER BY` clause.\n\n## Nulls\n\nAll [general-purpose window functions](#general-purpose-window-functions) that accept `IGNORE NULLS` respect nulls by default. This default behavior can optionally be made explicit via `RESPECT NULLS`.\n\nIn contrast, all [aggregate window functions](#aggregate-window-functions) (except for `list` and its aliases, which can be made to ignore nulls via a `FILTER`) ignore nulls and do not accept `RESPECT NULLS`. For example, `sum(column) OVER (ORDER BY time) AS cumulativeColumn` computes a cumulative sum where rows with a `NULL` value of `column` have the same value of `cumulativeColumn` as the row that precedes them.\n\n## Evaluation\n\nWindowing works by breaking a relation up into independent *partitions*,\n*ordering* those partitions,\nand then computing a new column for each row as a function of the nearby values.\nSome window functions depend only on the partition boundary and the ordering,\nbut a few (including all the aggregates) also use a *frame*.\nFrames are specified as a number of rows on either side (*preceding* or *following*) of the *current row*.\nThe distance can be specified as a number of *rows*,\nas a *range* of values using the partition\'s ordering value and a distance,\nor as a number of *groups* (sets of rows with the same sort value).\n\nThe full syntax is shown in the diagram at the top of the page,\nand this diagram visually illustrates computation environment:\n\n<img src="/images/framing-light.png" alt="The Window Computation Environment" title="Figure 1: The Window Computation Environment" style="max-width:90%;width:90%;height:auto" class="lightmode-img" />\n<img src="/images/framing-dark.png" alt="The Window Computation Environment" title="Figure 1: The Window Computation Environment" style="max-width:90%;width:90%;height:auto" class="darkmode-img" />\n\n### Partition and Ordering\n\nPartitioning breaks the relation up into independent, unrelated pieces.\nPartitioning is optional, and if none is specified then the entire relation is treated as a single partition.\nWindow functions cannot access values outside of the partition containing the row they are being evaluated at.\n\nOrdering is also optional, but without it the results of [general-purpose window functions](#general-purpose-window-functions) and [order-sensitive aggregate functions]({% link docs/stable/sql/functions/aggregates.md %}#order-by-clause-in-aggregate-functions), and the order of [framing](#framing) are not well-defined.\nEach partition is ordered using the same ordering clause.\n\nHere is a table of power generation data, available as a CSV file ([`power-plant-generation-history.csv`]({% link data/power-plant-generation-history.csv %})). To load the data, run:\n\n```sql\nCREATE TABLE "Generation History" AS\n    FROM \'power-plant-generation-history.csv\';\n```\n\nAfter partitioning by plant and ordering by date, it will have this layout:\n\n| Plant | Date | MWh |\n|:---|:---|---:|\n| Boston | 2019-01-02 | 564337 |\n| Boston | 2019-01-03 | 507405 |\n| Boston | 2019-01-04 | 528523 |\n| Boston | 2019-01-05 | 469538 |\n| Boston | 2019-01-06 | 474163 |\n| Boston | 2019-01-07 | 507213 |\n| Boston | 2019-01-08 | 613040 |\n| Boston | 2019-01-09 | 582588 |\n| Boston | 2019-01-10 | 499506 |\n| Boston | 2019-01-11 | 482014 |\n| Boston | 2019-01-12 | 486134 |\n| Boston | 2019-01-13 | 531518 |\n| Worcester | 2019-01-02 | 118860 |\n| Worcester | 2019-01-03 | 101977 |\n| Worcester | 2019-01-04 | 106054 |\n| Worcester | 2019-01-05 | 92182 |\n| Worcester | 2019-01-06 | 94492 |\n| Worcester | 2019-01-07 | 99932 |\n| Worcester | 2019-01-08 | 118854 |\n| Worcester | 2019-01-09 | 113506 |\n| Worcester | 2019-01-10 | 96644 |\n| Worcester | 2019-01-11 | 93806 |\n| Worcester | 2019-01-12 | 98963 |\n| Worcester | 2019-01-13 | 107170 |\n\nIn what follows,\nwe shall use this table (or small sections of it) to illustrate various pieces of window function evaluation.\n\nThe simplest window function is `row_number()`.\nThis function just computes the 1-based row number within the partition using the query:\n\n```sql\nSELECT\n    "Plant",\n    "Date",\n    row_number() OVER (PARTITION BY "Plant" ORDER BY "Date") AS "Row"\nFROM "Generation History"\nORDER BY 1, 2;\n```\n\nThe result will be the following:\n\n| Plant | Date | Row |\n|:---|:---|---:|\n| Boston | 2019-01-02 | 1 |\n| Boston | 2019-01-03 | 2 |\n| Boston | 2019-01-04 | 3 |\n| ... | ... | ... |\n| Worcester | 2019-01-02 | 1 |\n| Worcester | 2019-01-03 | 2 |\n| Worcester | 2019-01-04 | 3 |\n| ... | ... | ... |\n\nNote that even though the function is computed with an `ORDER BY` clause,\nthe result does not have to be sorted,\nso the `SELECT` also needs to be explicitly sorted if that is desired.\n\n### Framing\n\nFraming specifies a set of rows relative to each row where the function is evaluated.\nThe distance from the current row is given as an expression either `PRECEDING` or `FOLLOWING` the current row in the order specified by the `ORDER BY` clause in the `OVER` specification.\nThis distance can either be specified as an integral number of `ROWS` or `GROUPS`,\nor as a `RANGE` delta expression. It is invalid for a frame to start after it ends.\nFor a `RANGE` specification, there must  be only one ordering expression and it must support subtraction unless only the sentinel boundary values `UNBOUNDED PRECEDING` / `UNBOUNDED FOLLOWING` / `CURRENT ROW` are used.\nUsing the [`EXCLUDE` clause](#exclude-clause), rows comparing equal to the current row in the specified ordering expression (so-called peers) can be excluded from the frame.\n\nThe default frame is unbounded (i.e., the entire partition) when no `ORDER BY` clause is present and `RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW` when an `ORDER BY` clause is present. By default, the `CURRENT ROW` boundary value (but not the `CURRENT ROW` in the `EXCLUDE` clause) means the current row and all its peers when `RANGE` or `GROUP` framing are used but it means only the current row when `ROWS` framing is used.\n\n#### `ROWS` Framing\n\nHere is a simple `ROW` frame query, using an aggregate function:\n\n```sql\nSELECT points,\n    sum(points) OVER (\n        ROWS BETWEEN 1 PRECEDING\n                 AND 1 FOLLOWING) AS we\nFROM results;\n```\n\nThis query computes the `sum` of each point and the points on either side of it:\n\n<img src="/images/blog/windowing/moving-sum.jpg" alt="Moving SUM of three values" title="Figure 2: A moving SUM of three values" style="max-width:90%;width:90%;height:auto"/>\n\nNotice that at the edge of the partition, there are only two values added together.\nThis is because frames are cropped to the edge of the partition.\n\n#### `RANGE` Framing\n\nReturning to the power data, suppose the data is noisy.\nWe might want to compute a 7 day moving average for each plant to smooth out the noise.\nTo do this, we can use this window query:\n\n```sql\nSELECT "Plant", "Date",\n    avg("MWh") OVER (\n        PARTITION BY "Plant"\n        ORDER BY "Date" ASC\n        RANGE BETWEEN INTERVAL 3 DAYS PRECEDING\n                  AND INTERVAL 3 DAYS FOLLOWING)\n        AS "MWh 7-day Moving Average"\nFROM "Generation History"\nORDER BY 1, 2;\n```\n\nThis query partitions the data by `Plant` (to keep the different power plants\' data separate),\norders each plant\'s partition by `Date` (to put the energy measurements next to each other),\nand uses a `RANGE` frame of three days on either side of each day for the `avg`\n(to handle any missing days).\nThis is the result:\n\n| Plant | Date | MWh 7-day Moving Average |\n|:---|:---|---:|\n| Boston | 2019-01-02 | 517450.75 |\n| Boston | 2019-01-03 | 508793.20 |\n| Boston | 2019-01-04 | 508529.83 |\n| ... | ... | ... |\n| Boston | 2019-01-13 | 499793.00 |\n| Worcester | 2019-01-02 | 104768.25 |\n| Worcester | 2019-01-03 | 102713.00 |\n| Worcester | 2019-01-04 | 102249.50 |\n| ... | ... | ... |\n\n#### `GROUPS` Framing\n\nThe third type of framing counts *groups* of rows relative the current row.\nA *group* in this framing is a set of values with identical `ORDER BY` values.\nIf we assume that power is being generated on every day,\nwe can use `GROUPS` framing to compute the moving average of all power generated in the system\nwithout having to resort to date arithmetic:\n\n```sql\nSELECT "Date", "Plant",\n    avg("MWh") OVER (\n        ORDER BY "Date" ASC\n        GROUPS BETWEEN 3 PRECEDING\n                   AND 3 FOLLOWING)\n        AS "MWh 7-day Moving Average"\nFROM "Generation History"\nORDER BY 1, 2;\n```\n\n|    Date    |   Plant   | MWh 7-day Moving Average |\n|------------|-----------|-------------------------:|\n| 2019-01-02 | Boston    | 311109.500               |\n| 2019-01-02 | Worcester | 311109.500               |\n| 2019-01-03 | Boston    | 305753.100               |\n| 2019-01-03 | Worcester | 305753.100               |\n| 2019-01-04 | Boston    | 305389.667               |\n| 2019-01-04 | Worcester | 305389.667               |\n| ... | ... | ... |\n| 2019-01-12 | Boston    | 309184.900               |\n| 2019-01-12 | Worcester | 309184.900               |\n| 2019-01-13 | Boston    | 299469.375               |\n| 2019-01-13 | Worcester | 299469.375               |\n\nNotice how the values for each date are the same.\n\n#### `EXCLUDE` Clause\n\n`EXCLUDE` is an optional modifier to the frame clause for excluding rows around the `CURRENT ROW`.\nThis is useful when you want to compute some aggregate value of nearby rows\nto see how the current row compares to it.\n\nIn the following example, we want to know how an athlete\'s time in an event compares to\nthe average of all the times recorded for their event within ±10 days:\n\n```sql\nSELECT\n    event,\n    date,\n    athlete,\n    avg(time) OVER w AS recent,\nFROM results\nWINDOW w AS (\n    PARTITION BY event\n    ORDER BY date\n    RANGE BETWEEN INTERVAL 10 DAYS PRECEDING AND INTERVAL 10 DAYS FOLLOWING\n        EXCLUDE CURRENT ROW\n)\nORDER BY event, date, athlete;\n```\n\nThere are four options for `EXCLUDE` that specify how to treat the current row:\n\n* `CURRENT ROW` – exclude just the current row\n* `GROUP` – exclude the current row and all its “peers” (rows that have the same `ORDER BY` value)\n* `TIES` – exclude all peer rows, but _not_ the current row (this makes a hole on either side)\n* `NO OTHERS` – don\'t exclude anything (the default)\n\nExclusion is implemented for both windowed aggregates as well as for the `first`, `last` and `nth_value` functions.\n\n### `WINDOW` Clauses\n\nMultiple different `OVER` clauses can be specified in the same `SELECT`, and each will be computed separately.\nOften, however, we want to use the same layout for multiple window functions.\nThe `WINDOW` clause can be used to define a *named* window that can be shared between multiple window functions:\n\n```sql\nSELECT "Plant", "Date",\n    min("MWh") OVER seven AS "MWh 7-day Moving Minimum",\n    avg("MWh") OVER seven AS "MWh 7-day Moving Average",\n    max("MWh") OVER seven AS "MWh 7-day Moving Maximum"\nFROM "Generation History"\nWINDOW seven AS (\n    PARTITION BY "Plant"\n    ORDER BY "Date" ASC\n    RANGE BETWEEN INTERVAL 3 DAYS PRECEDING\n              AND INTERVAL 3 DAYS FOLLOWING)\nORDER BY 1, 2;\n```\n\nThe three window functions will also share the data layout, which will improve performance.\n\nMultiple windows can be defined in the same `WINDOW` clause by comma-separating them:\n\n```sql\nSELECT "Plant", "Date",\n    min("MWh") OVER seven AS "MWh 7-day Moving Minimum",\n    avg("MWh") OVER seven AS "MWh 7-day Moving Average",\n    max("MWh") OVER seven AS "MWh 7-day Moving Maximum",\n    min("MWh") OVER three AS "MWh 3-day Moving Minimum",\n    avg("MWh") OVER three AS "MWh 3-day Moving Average",\n    max("MWh") OVER three AS "MWh 3-day Moving Maximum"\nFROM "Generation History"\nWINDOW\n    seven AS (\n        PARTITION BY "Plant"\n        ORDER BY "Date" ASC\n        RANGE BETWEEN INTERVAL 3 DAYS PRECEDING\n                  AND INTERVAL 3 DAYS FOLLOWING),\n    three AS (\n        PARTITION BY "Plant"\n        ORDER BY "Date" ASC\n        RANGE BETWEEN INTERVAL 1 DAYS PRECEDING\n        AND INTERVAL 1 DAYS FOLLOWING)\nORDER BY 1, 2;\n```\n\nThe queries above do not use a number of clauses commonly found in select statements, like\n`WHERE`, `GROUP BY`, etc. For more complex queries you can find where `WINDOW` clauses fall in\nthe canonical order of the [`SELECT statement`]({% link docs/stable/sql/statements/select.md %}).\n\n### Filtering the Results of Window Functions Using `QUALIFY`\n\nWindow functions are executed after the [`WHERE`]({% link docs/stable/sql/query_syntax/where.md %}) and [`HAVING`]({% link docs/stable/sql/query_syntax/having.md %}) clauses have been already evaluated, so it\'s not possible to use these clauses to filter the results of window functions\nThe [`QUALIFY` clause]({% link docs/stable/sql/query_syntax/qualify.md %}) avoids the need for a subquery or [`WITH` clause]({% link docs/stable/sql/query_syntax/with.md %}) to perform this filtering.\n\n### Box and Whisker Queries\n\nAll aggregates can be used as windowing functions, including the complex statistical functions.\nThese function implementations have been optimized for windowing,\nand we can use the window syntax to write queries that generate the data for moving box-and-whisker plots:\n\n```sql\nSELECT "Plant", "Date",\n    min("MWh") OVER seven AS "MWh 7-day Moving Minimum",\n    quantile_cont("MWh", [0.25, 0.5, 0.75]) OVER seven\n        AS "MWh 7-day Moving IQR",\n    max("MWh") OVER seven AS "MWh 7-day Moving Maximum",\nFROM "Generation History"\nWINDOW seven AS (\n    PARTITION BY "Plant"\n    ORDER BY "Date" ASC\n    RANGE BETWEEN INTERVAL 3 DAYS PRECEDING\n              AND INTERVAL 3 DAYS FOLLOWING)\nORDER BY 1, 2;\n```\n',"with.md":`---
title: WITH Clause
---

The \`WITH\` clause allows you to specify common table expressions (CTEs).
Regular (non-recursive) common-table-expressions are essentially views that are limited in scope to a particular query.
CTEs can reference each-other and can be nested. [Recursive CTEs](#recursive-ctes) can reference themselves.

## Basic CTE Examples

Create a CTE called \`cte\` and use it in the main query:

\`\`\`sql
WITH cte AS (SELECT 42 AS x)
SELECT * FROM cte;
\`\`\`

| x  |
|---:|
| 42 |

Create two CTEs \`cte1\` and \`cte2\`, where the second CTE references the first CTE:

\`\`\`sql
WITH
    cte1 AS (SELECT 42 AS i),
    cte2 AS (SELECT i * 100 AS x FROM cte1)
SELECT * FROM cte2;
\`\`\`

|  x   |
|-----:|
| 4200 |

You can specify column names for CTEs:

\`\`\`sql
WITH cte(j) AS (SELECT 42 AS i)
FROM cte;
\`\`\`

## CTE Materialization

DuckDB handles CTEs as _materialized_ by default, meaning that the CTE is evaluated
once and the result is stored in a temporary table. However, under certain conditions,
DuckDB can _inline_ the CTE into the main query, which means that the CTE is not
materialized and its definition is duplicated in each place it is referenced.
Inlining is done using the following heuristics:
* The CTE is not referenced more than once.
* The CTE does not contain a \`VOLATILE\` function.
* The CTE is using \`AS NOT MATERIALIZED\` and does not use \`AS MATERIALIZED\`.
* The CTE does not perform a grouped aggregation.

Materialization can be explicitly activated by defining the CTE using \`AS MATERIALIZED\` and disabled by using \`AS NOT MATERIALIZED\`. Note that inlining is not always possible, even if the heuristics are met. For example, if the CTE contains a \`read_csv\` function, it cannot be inlined.

Take the following query for example, which invokes the same CTE three times:

\`\`\`sql
WITH t(x) AS (⟨complex_query⟩)
SELECT *
FROM
    t AS t1,
    t AS t2,
    t AS t3;
\`\`\`

Inlining duplicates the definition of \`t\` for each reference which results in the following query:

\`\`\`sql
SELECT *
FROM
    (⟨complex_query⟩) AS t1(x),
    (⟨complex_query⟩) AS t2(x),
    (⟨complex_query⟩) AS t3(x);
\`\`\`

If \`complex_query\` is expensive, materializing it with the \`MATERIALIZED\` keyword can improve performance. In this case, \`complex_query\` is evaluated only once.

\`\`\`sql
WITH t(x) AS MATERIALIZED (⟨complex_query⟩)
SELECT *
FROM
    t AS t1,
    t AS t2,
    t AS t3;
\`\`\`

If one wants to disable materialization, use \`NOT MATERIALIZED\`:

\`\`\`sql
WITH t(x) AS NOT MATERIALIZED (⟨complex_query⟩)
SELECT *
FROM
    t AS t1,
    t AS t2,
    t AS t3;
\`\`\`

Generally, it is not recommended to use explicit materialization hints, as DuckDB's query optimizer is capable of deciding when to materialize or inline a CTE based on the query structure and the heuristics mentioned above. However, in some cases, it may be beneficial to use \`MATERIALIZED\` or \`NOT MATERIALIZED\` to control the behavior explicitly.

## Recursive CTEs

\`WITH RECURSIVE\` allows the definition of CTEs which can refer to themselves. Note that the query must be formulated in a way that ensures termination, otherwise, it may run into an infinite loop.

### Example: Fibonacci Sequence

\`WITH RECURSIVE\` can be used to make recursive calculations. For example, here is how \`WITH RECURSIVE\` could be used to calculate the first ten Fibonacci numbers:

\`\`\`sql
WITH RECURSIVE FibonacciNumbers (
    RecursionDepth, FibonacciNumber, NextNumber
) AS (
        -- Base case
        SELECT
            0 AS RecursionDepth,
            0 AS FibonacciNumber,
            1 AS NextNumber
        UNION ALL
        -- Recursive step
        SELECT
            fib.RecursionDepth + 1 AS RecursionDepth,
            fib.NextNumber AS FibonacciNumber,
            fib.FibonacciNumber + fib.NextNumber AS NextNumber
        FROM
            FibonacciNumbers fib
        WHERE
            fib.RecursionDepth + 1 < 10
    )
SELECT
    fn.RecursionDepth AS FibonacciNumberIndex,
    fn.FibonacciNumber
FROM
    FibonacciNumbers fn;
\`\`\`

| FibonacciNumberIndex | FibonacciNumber |
|---------------------:|----------------:|
| 0                    | 0               |
| 1                    | 1               |
| 2                    | 1               |
| 3                    | 2               |
| 4                    | 3               |
| 5                    | 5               |
| 6                    | 8               |
| 7                    | 13              |
| 8                    | 21              |
| 9                    | 34              |

### Example: Tree Traversal

\`WITH RECURSIVE\` can be used to traverse trees. For example, take a hierarchy of tags:

<img src="/images/examples/with-recursive-tree-example-light.svg" alt="Example graph" style="width: 700px; text-align: center" class="lightmode-img">
<img src="/images/examples/with-recursive-tree-example-dark.svg" alt="Example graph" style="width: 700px; text-align: center" class="darkmode-img">

\`\`\`sql
CREATE TABLE tag (id INTEGER, name VARCHAR, subclassof INTEGER);
INSERT INTO tag VALUES
    (1, 'U2',     5),
    (2, 'Blur',   5),
    (3, 'Oasis',  5),
    (4, '2Pac',   6),
    (5, 'Rock',   7),
    (6, 'Rap',    7),
    (7, 'Music',  9),
    (8, 'Movies', 9),
    (9, 'Art', NULL);
\`\`\`

The following query returns the path from the node \`Oasis\` to the root of the tree (\`Art\`).

\`\`\`sql
WITH RECURSIVE tag_hierarchy(id, source, path) AS (
        SELECT id, name, [name] AS path
        FROM tag
        WHERE subclassof IS NULL
    UNION ALL
        SELECT tag.id, tag.name, list_prepend(tag.name, tag_hierarchy.path)
        FROM tag, tag_hierarchy
        WHERE tag.subclassof = tag_hierarchy.id
    )
SELECT path
FROM tag_hierarchy
WHERE source = 'Oasis';
\`\`\`

|           path            |
|---------------------------|
| [Oasis, Rock, Music, Art] |

### Graph Traversal

The \`WITH RECURSIVE\` clause can be used to express graph traversal on arbitrary graphs. However, if the graph has cycles, the query must perform cycle detection to prevent infinite loops.
One way to achieve this is to store the path of a traversal in a [list]({% link docs/stable/sql/data_types/list.md %}) and, before extending the path with a new edge, check whether its endpoint has been visited before (see the example later).

Take the following directed graph from the [LDBC Graphalytics benchmark](https://arxiv.org/pdf/2011.15028.pdf):

<img src="/images/examples/with-recursive-graph-example-light.svg" alt="Example graph" style="width: 700px; text-align: center" class="lightmode-img">
<img src="/images/examples/with-recursive-graph-example-dark.svg" alt="Example graph" style="width: 700px; text-align: center" class="darkmode-img">

\`\`\`sql
CREATE TABLE edge (node1id INTEGER, node2id INTEGER);
INSERT INTO edge VALUES
    (1, 3), (1, 5), (2, 4), (2, 5), (2, 10), (3, 1),
    (3, 5), (3, 8), (3, 10), (5, 3), (5, 4), (5, 8),
    (6, 3), (6, 4), (7, 4), (8, 1), (9, 4);
\`\`\`

Note that the graph contains directed cycles, e.g., between nodes 1, 5 and 8.

#### Enumerate All Paths from a Node

The following query returns **all paths** starting in node 1:

\`\`\`sql
WITH RECURSIVE paths(startNode, endNode, path) AS (
        SELECT -- Define the path as the first edge of the traversal
            node1id AS startNode,
            node2id AS endNode,
            [node1id, node2id] AS path
        FROM edge
        WHERE startNode = 1
        UNION ALL
        SELECT -- Concatenate new edge to the path
            paths.startNode AS startNode,
            node2id AS endNode,
            array_append(path, node2id) AS path
        FROM paths
        JOIN edge ON paths.endNode = node1id
        -- Prevent adding a repeated node to the path.
        -- This ensures that no cycles occur.
        WHERE list_position(paths.path, node2id) IS NULL
    )
SELECT startNode, endNode, path
FROM paths
ORDER BY length(path), path;
\`\`\`

| startNode | endNode |     path      |
|----------:|--------:|---------------|
| 1         | 3       | [1, 3]        |
| 1         | 5       | [1, 5]        |
| 1         | 5       | [1, 3, 5]     |
| 1         | 8       | [1, 3, 8]     |
| 1         | 10      | [1, 3, 10]    |
| 1         | 3       | [1, 5, 3]     |
| 1         | 4       | [1, 5, 4]     |
| 1         | 8       | [1, 5, 8]     |
| 1         | 4       | [1, 3, 5, 4]  |
| 1         | 8       | [1, 3, 5, 8]  |
| 1         | 8       | [1, 5, 3, 8]  |
| 1         | 10      | [1, 5, 3, 10] |

Note that the result of this query is not restricted to shortest paths, e.g., for node 5, the results include paths \`[1, 5]\` and \`[1, 3, 5]\`.

#### Enumerate Unweighted Shortest Paths from a Node

In most cases, enumerating all paths is not practical or feasible. Instead, only the **(unweighted) shortest paths** are of interest. To find these, the second half of the \`WITH RECURSIVE\` query should be adjusted such that it only includes a node if it has not yet been visited. This is implemented by using a subquery that checks if any of the previous paths includes the node:

\`\`\`sql
WITH RECURSIVE paths(startNode, endNode, path) AS (
        SELECT -- Define the path as the first edge of the traversal
            node1id AS startNode,
            node2id AS endNode,
            [node1id, node2id] AS path
        FROM edge
        WHERE startNode = 1
        UNION ALL
        SELECT -- Concatenate new edge to the path
            paths.startNode AS startNode,
            node2id AS endNode,
            array_append(path, node2id) AS path
        FROM paths
        JOIN edge ON paths.endNode = node1id
        -- Prevent adding a node that was visited previously by any path.
        -- This ensures that (1) no cycles occur and (2) only nodes that
        -- were not visited by previous (shorter) paths are added to a path.
        WHERE NOT EXISTS (
                FROM paths previous_paths
                WHERE list_contains(previous_paths.path, node2id)
              )
    )
SELECT startNode, endNode, path
FROM paths
ORDER BY length(path), path;
\`\`\`

| startNode | endNode |    path    |
|----------:|--------:|------------|
| 1         | 3       | [1, 3]     |
| 1         | 5       | [1, 5]     |
| 1         | 8       | [1, 3, 8]  |
| 1         | 10      | [1, 3, 10] |
| 1         | 4       | [1, 5, 4]  |
| 1         | 8       | [1, 5, 8]  |

#### Enumerate Unweighted Shortest Paths between Two Nodes

\`WITH RECURSIVE\` can also be used to find **all (unweighted) shortest paths between two nodes**. To ensure that the recursive query is stopped as soon as we reach the end node, we use a [window function]({% link docs/stable/sql/functions/window_functions.md %}) which checks whether the end node is among the newly added nodes.

The following query returns all unweighted shortest paths between nodes 1 (start node) and 8 (end node):

\`\`\`sql
WITH RECURSIVE paths(startNode, endNode, path, endReached) AS (
   SELECT -- Define the path as the first edge of the traversal
        node1id AS startNode,
        node2id AS endNode,
        [node1id, node2id] AS path,
        (node2id = 8) AS endReached
     FROM edge
     WHERE startNode = 1
   UNION ALL
   SELECT -- Concatenate new edge to the path
        paths.startNode AS startNode,
        node2id AS endNode,
        array_append(path, node2id) AS path,
        max(CASE WHEN node2id = 8 THEN 1 ELSE 0 END)
            OVER (ROWS BETWEEN UNBOUNDED PRECEDING
                           AND UNBOUNDED FOLLOWING) AS endReached
     FROM paths
     JOIN edge ON paths.endNode = node1id
    WHERE NOT EXISTS (
            FROM paths previous_paths
            WHERE list_contains(previous_paths.path, node2id)
          )
      AND paths.endReached = 0
)
SELECT startNode, endNode, path
FROM paths
WHERE endNode = 8
ORDER BY length(path), path;
\`\`\`

| startNode | endNode |   path    |
|----------:|--------:|-----------|
| 1         | 8       | [1, 3, 8] |
| 1         | 8       | [1, 5, 8] |

## Recursive CTEs with \`USING KEY\`

\`USING KEY\` alters the behavior of a regular recursive CTE.

In each iteration, a regular recursive CTE appends result rows to the union table, which ultimately defines the overall result of the CTE. In contrast, a CTE with \`USING KEY\` has the ability to update rows that have been placed in the union table in an earlier iteration: if the current iteration produces a row with key \`k\`, it replaces a row with the same key \`k\` in the union table (like a dictionary). If no such row exists in the union table yet, the new row is appended to the union table as usual.

This allows a CTE to exercise fine-grained control over the union table contents. Avoiding the append-only behavior can lead to significantly smaller union table sizes. This helps query runtime, memory consumption, and makes it feasible to access the union table while the iteration is still ongoing (this is impossible for regular recursive CTEs): in a CTE \`WITH RECURSIVE T(...) USING KEY ...\`, table \`T\` denotes the rows added by the last iteration (as is usual for recursive CTEs), while table \`recurring.T\` denotes the union table built so far. References to \`recurring.T\` allow for the elegant and idiomatic translation of rather complex algorithms into readable SQL code.

### Example: \`USING KEY\`

This is a recursive CTE where \`USING KEY\` has a key column (\`a\`) and a payload column (\`b\`).
The payload columns correspond to the columns to be overwritten.
In the first iteration we have two different keys, \`1\` and \`2\`.
These two keys will generate two new rows, \`(1, 3)\` and \`(2, 4)\`.
In the next iteration we produce a new key, \`3\`, which generates a new row.
We also generate the row \`(2, 3)\`, where \`2\` is a key that already exists from the previous iteration.
This will overwrite the old payload \`4\` with the new payload \`3\`.

\`\`\`sql
WITH RECURSIVE tbl(a, b) USING KEY (a) AS (
    SELECT a, b
    FROM (VALUES (1, 3), (2, 4)) t(a, b)
        UNION
    SELECT a + 1, b
    FROM tbl
    WHERE a < 3
)
SELECT *
FROM tbl;
\`\`\`

| a | b |
|--:|--:|
| 1 | 3 |
| 2 | 3 |
| 3 | 3 |

## Using \`VALUES\`

You can use the \`VALUES\` clause for the initial (anchor) part of the CTE:

\`\`\`sql
WITH RECURSIVE tbl(a, b) USING KEY (a) AS (
    VALUES (1, 3), (2, 4)
        UNION
    SELECT a + 1, b
    FROM tbl
    WHERE a < 3
)
SELECT *
FROM tbl;
\`\`\`

### Example: \`USING KEY\` References Union Table

As well as using the union table as a dictionary, we can now reference it in queries. This allows you to use results from not just the previous iteration, but also earlier ones. This new feature makes certain algorithms easier to implement.

One example is the connected components algorithm. For each node, the algorithm determines the node with the lowest ID to which it is connected. To achieve this, we use the entries in the union table to track the lowest ID found for a node. If a new incoming row contains a lower ID, we update this value.

<img src="/images/examples/using-key-graph-example-light.svg" alt="Example graph" style="width: 700px; text-align: center" class="lightmode-img">
<img src="/images/examples/using-key-graph-example-dark.svg" alt="Example graph" style="width: 700px; text-align: center" class="darkmode-img">

\`\`\`sql
CREATE TABLE nodes (id INTEGER);
INSERT INTO nodes VALUES (1), (2), (3), (4), (5), (6), (7), (8);
CREATE TABLE edges (node1id INTEGER, node2id INTEGER);
INSERT INTO edges VALUES
    (1, 3), (2, 3), (3, 7), (7, 8), (5, 4), (6, 4);
\`\`\`

\`\`\`sql
WITH RECURSIVE connected_components(id, comp) USING KEY (id) AS (
    SELECT n.id, n.id AS comp
    FROM nodes AS n
        UNION (
    SELECT DISTINCT ON (previous_iter.id) previous_iter.id, initial_iter.comp
    FROM 
        recurring.connected_components AS previous_iter,
        connected_components AS initial_iter,
        edges AS e
    WHERE ((e.node1id, e.node2id) = (previous_iter.id, initial_iter.id)
       OR (e.node2id, e.node1id) = (previous_iter.id, initial_iter.id))
      AND initial_iter.comp < previous_iter.comp
    ORDER BY initial_iter.id ASC, previous_iter.comp ASC)
)
TABLE connected_components
ORDER BY id;
\`\`\`

| id | comp |
|---:|-----:|
| 1  | 1    |
| 2  | 1    |
| 3  | 1    |
| 4  | 4    |
| 5  | 4    |
| 6  | 4    |
| 7  | 1    |
| 8  | 1    |

## Limitations

DuckDB does not support mutually recursive CTEs. See the [related issue and discussion in the DuckDB repository](https://github.com/duckdb/duckdb/issues/14716#issuecomment-2467952456).

## Syntax

<div id="rrdiagram"></div>
`};export{e as BUNDLED_DOCS};
