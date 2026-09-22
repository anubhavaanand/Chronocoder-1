"""Tests for code_parser.CodeAnalyzer (AST-based analysis of user code)."""

import pytest
from code_parser import CodeAnalyzer


@pytest.fixture
def analyzer():
    return CodeAnalyzer()


SMALL_PROGRAM = """import os
from typing import List

class Greeter:
    def hello(self, name):
        greeting = 'hi'
        return greeting

def repeat(count):
    total = 0
    for i in range(count):
        if i % 2 == 0:
            total += i
    while count > 0:
        count -= 1
    return total
"""


class TestParseCodeStructure:
    def test_extracts_names_from_a_real_program(self, analyzer):
        analysis = analyzer.parse_code(SMALL_PROGRAM)

        assert analysis['imports'] == ['os', 'typing.List']
        assert sorted(analysis['classes']) == ['Greeter']
        assert sorted(analysis['functions']) == ['hello', 'repeat']
        assert analysis['errors'] == []

    def test_counts_loops_and_conditionals(self, analyzer):
        analysis = analyzer.parse_code(SMALL_PROGRAM)

        assert analysis['loops'] == 2
        assert analysis['conditionals'] == 1

    def test_counts_only_bare_assignments_as_variables(self, analyzer):
        # Loop targets and augmented assignments are deliberately not reported.
        analysis = analyzer.parse_code(SMALL_PROGRAM)

        assert sorted(analysis['variables']) == ['greeting', 'total']

    def test_nested_definitions_are_included(self, analyzer):
        analysis = analyzer.parse_code("class Outer:\n    class Inner:\n        def method(self):\n            pass\n")

        assert sorted(analysis['classes']) == ['Inner', 'Outer']
        assert analysis['functions'] == ['method']

    def test_relative_import_falls_back_to_alias_name(self, analyzer):
        analysis = analyzer.parse_code("from . import helper\n")

        assert analysis['imports'] == ['helper']

    def test_import_reports_module_and_alias(self, analyzer):
        analysis = analyzer.parse_code("import numpy as np\nfrom os import path as p\n")

        assert analysis['imports'] == ['numpy', 'os.path']

    def test_only_plain_name_targets_count_as_variables(self, analyzer):
        analysis = analyzer.parse_code("a[0] = 1\nobj.attr = 2\nplain = 3\n")

        assert analysis['variables'] == ['plain']

    def test_chained_assignment_reports_every_target(self, analyzer):
        assert analyzer.parse_code("a = b = 1\n")['variables'] == ['a', 'b']

    def test_empty_source_is_not_an_error(self, analyzer):
        analysis = analyzer.parse_code("")

        assert analysis['errors'] == []
        assert analysis['complexity_score'] == 0

    def test_syntax_error_reports_and_blanks_the_structure(self, analyzer):
        analysis = analyzer.parse_code("def (:")

        assert analysis['errors'][0].startswith("Syntax Error:")
        assert analysis['line_count'] == 0
        assert analysis['functions'] == []
        assert analysis['explanations'] == []
        assert analysis['complexity_score'] == 0


class TestComplexityScore:
    def test_weights_classes_more_than_conditionals(self, analyzer):
        # 1 class (3) + 1 function (2) + 1 loop (2) + 1 conditional (1)
        analysis = analyzer.parse_code("class A:\n    def f(self):\n        for i in x:\n            if i:\n                pass\n")

        assert analysis['complexity_score'] == 8

    def test_small_programs_accumulate_from_every_feature(self, analyzer):
        assert analyzer.parse_code(SMALL_PROGRAM)['complexity_score'] == 12

    def test_long_files_add_a_length_penalty(self, analyzer):
        short = analyzer.parse_code("x = 1\n")
        long_ = analyzer.parse_code("\n".join(f"v{i} = {i}" for i in range(25)))

        assert short['complexity_score'] == 0
        assert long_['line_count'] == 25
        assert long_['complexity_score'] == (25 - 10) // 10


class TestExplanations:
    def test_one_explanation_per_line_in_order(self, analyzer):
        program = "\n".join([
            "import os",
            "from typing import List",
            "class Widget:",
            "    def helper(self):",
            "        total = 0",
            "        if total:",
            "            total += 1",
            "        elif total:",
            "            pass",
            "        else:",
            "            print(total)",
            "        return total",
            "",
            "        # note",
            "        while True:",
            "            break",
            "        for i in range(total):",
            "            pass",
        ])

        assert analyzer.parse_code(program)['explanations'] == [
            "Line 1: Importing external modules/libraries",
            "Line 2: Importing external modules/libraries",
            "Line 3: Defining class 'Widget'",
            "Line 4: Defining function 'helper'",
            "Line 5: Assigning value to variable 'total'",
            "Line 6: Conditional statement - checking a condition",
            "Line 7: Code execution statement",
            "Line 8: Alternative condition check",
            "Line 9: Code execution statement",
            "Line 10: Default case when conditions are not met",
            "Line 11: Outputting information to the console",
            "Line 12: Returning a value from the function",
            "Line 13: Empty line for readability",
            "Line 14: Comment - documentation or notes",
            "Line 15: Starting a loop that continues while condition is true",
            "Line 16: Code execution statement",
            "Line 17: Starting a loop to iterate over items",
            "Line 18: Code execution statement",
        ]

    def test_comparison_is_not_mistaken_for_assignment(self, analyzer):
        assert analyzer.parse_code("if x == 1:\n    pass\n")['explanations'][0] == (
            "Line 1: Conditional statement - checking a condition"
        )

    def test_compound_assignment_falls_through(self, analyzer):
        assert analyzer.parse_code("total += 1\n")['explanations'] == ["Line 1: Code execution statement"]

    def test_unparsable_code_has_no_explanations(self, analyzer):
        assert analyzer.parse_code("def broken(:\n")['explanations'] == []


class TestCodeSummary:
    def test_errors_short_circuit_the_summary(self, analyzer):
        analysis = analyzer.parse_code("def (:")

        assert analyzer.get_code_summary(analysis).startswith("❌ Code contains errors: Syntax Error:")

    def test_mentions_only_the_structures_present(self, analyzer):
        summary = analyzer.get_code_summary(analyzer.parse_code("def f():\n    return 1\n"))

        assert "Defines 1 functions" in summary
        assert "Complexity score: 2" in summary
        assert "classes" not in summary
        assert "variables" not in summary

    def test_describes_a_whole_program(self, analyzer):
        summary = analyzer.get_code_summary(analyzer.parse_code(SMALL_PROGRAM))

        assert "Defines 2 functions" in summary
        assert "Defines 1 classes" in summary
        assert "Contains 2 loops" in summary
        assert "16 lines of code" in summary

    def test_line_count_and_complexity_are_always_reported(self, analyzer):
        assert analyzer.get_code_summary(analyzer.parse_code("pass\n")) == (
            "📏 1 lines of code | ⚡ Complexity score: 0"
        )
