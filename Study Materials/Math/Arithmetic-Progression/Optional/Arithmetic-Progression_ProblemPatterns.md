# Arithmetic-Progression Problem Patterns Catalog

## Pattern 1: Nth Term Forward Calculation & Index Solving (PAT_AP_01)
- **Family ID**: nth_term_determination
- **Deep Structure**: Linear relationship between term value and integer index n in an AP
- **Governing Method**: Apply a_n = a + (n-1)d, isolate unknown variable, verify integer validity of index n
- **Decision Points**:
  - Compute common difference d = a_2 - a_1 noting sign
  - Formulate linear equation in index n
  - Assert n is a positive integer
- **Common Traps**:
  - Off-by-one error using n instead of (n - 1)
  - Sign errors when common difference d is negative
- **Error Categories**: ERR_OFF_BY_ONE, ERR_NEGATIVE_DIFFERENCE, ERR_ARITHMETIC

## Pattern 2: Boundary Terms, Term from End & Sign Inversion (PAT_AP_02)
- **Family ID**: reverse_and_boundary_terms
- **Deep Structure**: Positional calculation from the terminal end or finding the first negative/positive term boundary
- **Governing Method**: Use a'_m = l - (m-1)d or set inequality a_n < 0 to solve for minimal integer index n
- **Decision Points**:
  - Distinguish counting from beginning versus counting from terminal end
  - Solve inequality a + (n-1)d < 0 and round up to next integer for index
- **Common Traps**:
  - Inverting inequality sign incorrectly when dividing by negative common difference
  - Failing to subtract from last term l when counting from the end
- **Error Categories**: ERR_INEQUALITY_INVERSION, ERR_END_TERM_REFERENCE, ERR_INTEGER_CEILING

## Pattern 3: Algebraic Conditions & Symmetrical Term Selections (PAT_AP_03)
- **Family ID**: algebraic_relations_and_symmetry
- **Deep Structure**: Linear equations formed by multi-term constraints or symmetrical choices (a-d, a, a+d)
- **Governing Method**: Apply 2b = a + c for 3 terms, or solve simultaneous equations for unknown a and d
- **Decision Points**:
  - Use symmetrical variables (a-d, a, a+d) when sum of terms is known to cancel d
  - Use (a-3d, a-d, a+d, a+3d) with step 2d for 4 symmetrical terms
- **Common Traps**:
  - Assuming step is d instead of 2d when using symmetrical 4-term representation
  - Algebraic expansion errors in product relations
- **Error Categories**: ERR_SYMMETRICAL_STEP, ERR_SIMULTANEOUS_SOLVE, ERR_ALGEBRAIC_EXPANSION

## Pattern 4: Series Summation & Quadratic Term Count Determination (PAT_AP_04)
- **Family ID**: summation_series_ap
- **Deep Structure**: Summation S_n leading to linear or quadratic relations in term count n
- **Governing Method**: Use S_n = (n/2)[2a + (n-1)d], rearrange to an^2 + bn + c = 0, select valid positive integer roots
- **Decision Points**:
  - Check whether last term l is known to use S_n = (n/2)(a+l)
  - Factorize quadratic equation in n and interpret dual positive integer roots
- **Common Traps**:
  - Discarding valid second root when terms from first to second root sum to zero
  - Omission of 1/2 factor in sum formula
- **Error Categories**: ERR_QUADRATIC_ROOT_SELECTION, ERR_SUMMATION_FACTOR, ERR_DUAL_ROOT_INTERPRETATION

## Pattern 5: Sum Function Decomposition & Ratio of Sums/Terms (PAT_AP_05)
- **Family ID**: sum_function_and_ratio_transformation
- **Deep Structure**: Extracting nth term from sum S_n or transforming ratio of sums to ratio of terms via n -> 2m - 1
- **Governing Method**: Use a_n = S_n - S_{n-1} or substitute n = 2m - 1 into ratio of sums expression
- **Decision Points**:
  - Differentiate S_n algebraic form to get common difference d = 2A
  - Replace dummy index n with 2m - 1 to relate sum ratio to m-th term ratio
- **Common Traps**:
  - Directly substituting m instead of 2m - 1 in ratio of sums
  - Sign error when expanding S_{n-1}
- **Error Categories**: ERR_RATIO_SUBSTITUTION_MAPPING, ERR_SUM_DIFFERENCE_EXPANSION, ERR_COEFFICIENT_EXTRACTION

## Pattern 6: Real-World Contexts, Arithmetic Means & Geometric Applications (PAT_AP_06)
- **Family ID**: applied_word_problems_and_means
- **Deep Structure**: Translating physical distributions, installments, or inserted means into formal AP parameters
- **Governing Method**: Model initial quantity as a, uniform increase as d, and total as S_n; apply AM insertion formula
- **Decision Points**:
  - Identify whether the asked quantity is a specific installment (a_n) or total amount (S_n)
  - Calculate step difference D = (b - a)/(k + 1) for k inserted arithmetic means
- **Common Traps**:
  - Confusing total sum S_n with a specific term a_n in word problems
  - Dividing by k instead of (k + 1) for inserted arithmetic means
- **Error Categories**: ERR_WORD_PROBLEM_MODELING, ERR_AM_DENOMINATOR, ERR_TERM_VS_SUM_CONFUSION

