import { Target } from "./targets";
import { PI, sqrt } from "./math";
import A from "../components/A";
import React from "react";

export const ThreeEqualCircles: Target[] = [
    [ "0**", PI ],
    [ "*1*", PI ],
    [ "**2", PI ],
    [ "01*", 2*PI/3 - sqrt(3)/2 ],
    [ "0*2", 2*PI/3 - sqrt(3)/2 ],
    [ "*12", 2*PI/3 - sqrt(3)/2 ],
    [ "012", PI/2 - sqrt(3)/2 ],
]

export const FizzBuzz: Target[] = [
    [ "0*", 5 ],
    [ "*1", 3 ],
    [ "01", 1 ],
]

// Inclusive:
// A 35
// B 21
// C 15
// A B 7
// A C 5
// B C 3
// A B C 1
// Exclusive:
// A 24
// B 12
// C 8
// A B 6
// A C 4
// B C 2
// A B C 1
export const FizzBuzzBazz: Target[] = [ // Fractions scaled up by LCM
    [ "0**", 35 ],  // 1 / 3
    [ "*1*", 21 ],  // 1 / 5
    [ "**2", 15 ],  // 1 / 7
    [ "01*",  7 ],  // 1 / 15
    [ "0*2",  5 ],  // 1 / 21
    [ "*12",  3 ],  // 1 / 35
    [ "012",  1 ],  // 1 / 105
]

// Inclusive:
// Two 105
// Three 70
// Five 42
// Seven 30
// Two Three 35
// Two Five 21
// Two Seven 15
// Three Five 14
// Three Seven 10
// Five Seven 6
// Two Three Five 7
// Two Three Seven 5
// Two Five Seven 3
// Three Five Seven 2
// Two Three Five Seven 1
// Exclusive:
// Two 48
// Three 24
// Five 12
// Seven 8
// Two Three 24
// Two Five 12
// Two Seven 8
// Three Five 6
// Three Seven 4
// Five Seven 2
// Two Three Five 6
// Two Three Seven 4
// Two Five Seven 2
// Three Five Seven 1
// Two Three Five Seven 1
export const FizzBuzzBazzQux: Target[] = [ // Fractions scaled up by LCM
    [ "0***", 105 ],  // 1 / 2
    [ "*1**",  70 ],  // 1 / 3
    [ "**2*",  42 ],  // 1 / 5
    [ "***3",  30 ],  // 1 / 7
    [ "01**",  35 ],  // 1 / 6
    [ "0*2*",  21 ],  // 1 / 10
    [ "0**3",  15 ],  // 1 / 14
    [ "*12*",  14 ],  // 1 / 15
    [ "*1*3",  10 ],  // 1 / 21
    [ "**23",   6 ],  // 1 / 35
    [ "012*",   7 ],  // 1 / 30
    [ "01*3",   5 ],  // 1 / 42
    [ "0*23",   3 ],  // 1 / 70
    [ "*123",   2 ],  // 1 / 105
    [ "0123",   1 ],  // 1 / 210
]

// 5-set FizzBuzz: primes {3, 5, 7, 11, 23} (LCM = 26565)
// Uses odd primes only so all 31 exclusive region sizes are distinct.
// (With {2,3,5,7,11}, (2-1)=1 causes 15 pairs of duplicate exclusive values.)
// Exclusive formula: exclusive(S) = φ(LCM) / ∏_{p∈S}(p-1) where φ(26565) = 10560
// Exclusive values range from 5280 ({3} only) down to 1 (all five).
export const FizzBuzzBazzQuxQuux: Target[] = [
    [ "0****", 8855 ],  // 1 / 3
    [ "*1***", 5313 ],  // 1 / 5
    [ "**2**", 3795 ],  // 1 / 7
    [ "***3*", 2415 ],  // 1 / 11
    [ "****4", 1155 ],  // 1 / 23
    [ "01***", 1771 ],  // 1 / 15
    [ "0*2**", 1265 ],  // 1 / 21
    [ "0**3*",  805 ],  // 1 / 33
    [ "0***4",  385 ],  // 1 / 69
    [ "*12**",  759 ],  // 1 / 35
    [ "*1*3*",  483 ],  // 1 / 55
    [ "*1**4",  231 ],  // 1 / 115
    [ "**23*",  345 ],  // 1 / 77
    [ "**2*4",  165 ],  // 1 / 161
    [ "***34",  105 ],  // 1 / 253
    [ "012**",  253 ],  // 1 / 105
    [ "01*3*",  161 ],  // 1 / 165
    [ "01**4",   77 ],  // 1 / 345
    [ "0*23*",  115 ],  // 1 / 231
    [ "0*2*4",   55 ],  // 1 / 483
    [ "0**34",   35 ],  // 1 / 759
    [ "*123*",   69 ],  // 1 / 385
    [ "*12*4",   33 ],  // 1 / 805
    [ "*1*34",   21 ],  // 1 / 1265
    [ "**234",   15 ],  // 1 / 1771
    [ "0123*",   23 ],  // 1 / 1155
    [ "012*4",   11 ],  // 1 / 2415
    [ "01*34",    7 ],  // 1 / 3795
    [ "0*234",    5 ],  // 1 / 5313
    [ "*1234",    3 ],  // 1 / 8855
    [ "01234",    1 ],  // 1 / 26565
]

export const CentroidRepel: Target[] = [
    [ "0**", 3.  ],
    [ "*1*", 1.  ],
    [ "**2", 1.  ],
    [ "01*", 0.3 ],
    [ "0*2", 0.3 ],
    [ "*12", 0.3 ],
    [ "012", 0.1 ],
]

// Cenomic variants identified by 4 variant callers: VarScan, SomaticSniper, Strelka, JSM2
// cf. https://www.ncbi.nlm.nih.gov/pmc/articles/PMC3753564/pdf/btt375.pdf, ../4-ellipses.png
export const VariantCallers: Target[] = [
    [ "0---", 633 ],
    [ "-1--", 618 ],
    [ "--2-", 187 ],
    [ "---3", 319 ],
    [ "01--", 112 ],
    [ "0-2-",   0 ],
    [ "0--3",  13 ],
    [ "-12-",  14 ],
    [ "-1-3",  55 ],
    [ "--23",  21 ],
    [ "012-",   1 ],
    [ "01-3",  17 ],
    [ "0-23",   0 ],
    [ "-123",   9 ],
    [ "0123",  36 ],
]

export const MPowerPaperHref = "https://pubmed.ncbi.nlm.nih.gov/35190375/"
export const MPowerSupplementHref = "https://jitc.bmj.com/content/jitc/10/2/e003027.full.pdf?with-ds=yes"
export const MPowerLink = <A href={MPowerSupplementHref}>West HJ et al (2022)</A>
// https://pubmed.ncbi.nlm.nih.gov/35190375/ (supplement, pg. 13): https://jitc.bmj.com/content/jitc/10/2/e003027.full.pdf?with-ds=yes
// 0: KRAS
// 1: STK11
// 2: KEAP1
// 3: TP53
export const MPower: Target[] = [
    [ "0---",  42 ],
    [ "-1--",  15 ],
    [ "--2-",  10 ],
    [ "---3", 182 ],
    [ "01--",  16 ],
    [ "0-2-",  10 ],
    [ "0--3",  60 ],
    [ "-12-",  12 ],
    [ "-1-3",  23 ],
    [ "--23",  44 ],
    [ "012-",  25 ],
    [ "01-3",  13 ],
    [ "0-23",  13 ],
    [ "-123",  18 ],
    [ "0123",  11 ],
]

export const Zhang2014Href = "https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0103207"

export const BenFredCircles: Target[] = [
    [ "0**", 16 ],
    [ "*1*", 16 ],
    [ "**2", 12 ],
    [ "01*",  4 ],
    [ "0*2",  4 ],
    [ "*12",  3 ],
    [ "012",  2 ],
]

// 5-set test cases (synthetic examples for testing 31-region layouts)
// These are used to verify the 5-shape polygon layouts work correctly

// Example 1: A sparse distribution with many empty regions
export const FiveSetExample1: Target[] = [
    [ "0----", 21 ],
    [ "-1---", 10 ],
    [ "--2--",  5 ],
    [ "---3-",  7 ],
    [ "----4", 11 ],
    [ "01---", 11 ],
    [ "0-2--",  2 ],
    [ "0--3-",  0 ],
    [ "0---4",  4 ],
    [ "-12--",  2 ],
    [ "-1-3-",  0 ],
    [ "-1--4",  0 ],
    [ "--23-",  3 ],
    [ "--2-4",  0 ],
    [ "---34",  3 ],
    [ "012--",  1 ],
    [ "01-3-",  0 ],
    [ "01--4",  0 ],
    [ "0-23-",  0 ],
    [ "0-2-4",  0 ],
    [ "0--34",  0 ],
    [ "-123-",  3 ],
    [ "-12-4",  0 ],
    [ "-1-34",  0 ],
    [ "--234",  6 ],
    [ "0123-",  0 ],
    [ "012-4",  2 ],
    [ "01-34",  0 ],
    [ "0-234",  1 ],
    [ "-1234",  1 ],
    [ "01234",  1 ],
]

// Example 2: Another sparse distribution with different non-zero regions
export const FiveSetExample2: Target[] = [
    [ "0----", 21 ],
    [ "-1---", 10 ],
    [ "--2--",  5 ],
    [ "---3-",  2 ],
    [ "----4",  7 ],
    [ "01---", 11 ],
    [ "0-2--",  6 ],
    [ "0--3-",  0 ],
    [ "0---4",  3 ],
    [ "-12--",  3 ],
    [ "-1-3-",  0 ],
    [ "-1--4",  1 ],
    [ "--23-",  3 ],
    [ "--2-4",  2 ],
    [ "---34",  2 ],
    [ "012--",  3 ],
    [ "01-3-",  0 ],
    [ "01--4",  0 ],
    [ "0-23-",  1 ],
    [ "0-2-4",  0 ],
    [ "0--34",  1 ],
    [ "-123-",  0 ],
    [ "-12-4",  1 ],
    [ "-1-34",  0 ],
    [ "--234",  1 ],
    [ "0123-",  0 ],
    [ "012-4",  0 ],
    [ "01-34",  1 ],
    [ "0-234",  0 ],
    [ "-1234",  0 ],
    [ "01234",  0 ],
]
