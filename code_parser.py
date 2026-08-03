#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Python AST Parser

- Uses ast module to parse user code
- Extracts function names, variable assignments, operations
- Returns structured explanations for each part of the code
"""

import ast
from typing import Dict, List, Any

class CodeAnalyzer:
    """Analyzes Python code using AST to extract meaningful information."""
    
    def parse_code(self, code_string: str) -> Dict[str, Any]:
        """
        Parse Python code and extract structural information.
        
        Args:
            code_string (str): The Python code to analyze
            
        Returns:
            Dict containing analysis results
        """
        try:
            # Parse the code into an AST
            tree = ast.parse(code_string)
            
            # Initialize analysis results
            analysis = {
                'imports': [],
                'functions': [],
                'classes': [],
                'variables': [],
                'loops': 0,
                'conditionals': 0,
                'errors': [],
                'complexity_score': 0,
                'line_count': len(code_string.strip().split('\n')),
                'explanations': []
            }
            
            # Walk through the AST and extract information
            for node in ast.walk(tree):
                self._analyze_node(node, analysis)
            
            # Calculate complexity score
            analysis['complexity_score'] = self._calculate_complexity(analysis)
            
            # Generate line-by-line explanations
            analysis['explanations'] = self._generate_explanations(code_string, tree)
            
            return analysis
            
        except SyntaxError as e:
            return {
                'errors': [f"Syntax Error: {str(e)} 🐛 (Grace Hopper would say: 'Time to debug!')"],
                'imports': [],
                'functions': [],
                'classes': [],
                'variables': [],
                'loops': 0,
                'conditionals': 0,
                'complexity_score': 0,
                'line_count': 0,
                'explanations': []
            }
        except Exception as e:
            return {
                'errors': [f"Analysis Error: {str(e)} ⚡ (Dennis Ritchie would say: 'Keep it simple!')"],
                'imports': [],
                'functions': [],
                'classes': [],
                'variables': [],
                'loops': 0,
                'conditionals': 0,
                'complexity_score': 0,
                'line_count': 0,
                'explanations': []
            }
    
    def _analyze_node(self, node: ast.AST, analysis: Dict[str, Any]):
        """Analyze individual AST nodes and update analysis results."""
        
        # Import statements
        if isinstance(node, ast.Import):
            for alias in node.names:
                analysis['imports'].append(alias.name)
        elif isinstance(node, ast.ImportFrom):
            module = node.module or ''
            for alias in node.names:
                analysis['imports'].append(f"{module}.{alias.name}" if module else alias.name)
        
        # Function definitions
        elif isinstance(node, ast.FunctionDef):
            analysis['functions'].append(node.name)
        
        # Class definitions
        elif isinstance(node, ast.ClassDef):
            analysis['classes'].append(node.name)
        
        # Variable assignments
        elif isinstance(node, ast.Assign):
            for target in node.targets:
                if isinstance(target, ast.Name):
                    analysis['variables'].append(target.id)
        
        # Loop structures
        elif isinstance(node, (ast.For, ast.While)):
            analysis['loops'] += 1
        
        # Conditional structures
        elif isinstance(node, ast.If):
            analysis['conditionals'] += 1
    
    def _calculate_complexity(self, analysis: Dict[str, Any]) -> int:
        """Calculate a simple complexity score based on code structure."""
        complexity = 0
        complexity += len(analysis['functions']) * 2
        complexity += len(analysis['classes']) * 3
        complexity += analysis['loops'] * 2
        complexity += analysis['conditionals'] * 1
        complexity += max(0, analysis['line_count'] - 10) // 10  # Penalty for very long code
        return complexity
    
    def _generate_explanations(self, code_string: str, tree: ast.AST) -> List[str]:
        """Generate line-by-line explanations of the code."""
        lines = code_string.strip().split('\n')
        explanations = []
        
        # Simple explanation generator based on code patterns
        for i, line in enumerate(lines, 1):
            line_stripped = line.strip()
            explanation = f"Line {i}: "
            
            if line_stripped.startswith('import ') or line_stripped.startswith('from '):
                explanation += "Importing external modules/libraries"
            elif line_stripped.startswith('def '):
                func_name = line_stripped.split('(')[0].replace('def ', '')
                explanation += f"Defining function '{func_name}'"
            elif line_stripped.startswith('class '):
                class_name = line_stripped.split('(')[0].replace('class ', '').replace(':', '')
                explanation += f"Defining class '{class_name}'"
            elif '=' in line_stripped and not line_stripped.startswith('#') and not any(op in line_stripped for op in ['==', '!=', '>=', '<=', '+=', '-=', '*=', '/=']):
                var_name = line_stripped.split('=')[0].strip()
                explanation += f"Assigning value to variable '{var_name}'"
            elif line_stripped.startswith('if '):
                explanation += "Conditional statement - checking a condition"
            elif line_stripped.startswith('elif '):
                explanation += "Alternative condition check"
            elif line_stripped.startswith('else'):
                explanation += "Default case when conditions are not met"
            elif line_stripped.startswith('for '):
                explanation += "Starting a loop to iterate over items"
            elif line_stripped.startswith('while '):
                explanation += "Starting a loop that continues while condition is true"
            elif line_stripped.startswith('return '):
                explanation += "Returning a value from the function"
            elif line_stripped.startswith('print('):
                explanation += "Outputting information to the console"
            elif line_stripped.startswith('#'):
                explanation += "Comment - documentation or notes"
            elif line_stripped == '':
                explanation += "Empty line for readability"
            else:
                explanation += "Code execution statement"
            
            explanations.append(explanation)
        
        return explanations
    
    def get_code_summary(self, analysis: Dict[str, Any]) -> str:
        """Generate a human-readable summary of the code analysis."""
        if analysis.get('errors'):
            return f"❌ Code contains errors: {', '.join(analysis['errors'])}"
        
        summary_parts = []
        
        if analysis['imports']:
            summary_parts.append(f"📦 Uses {len(analysis['imports'])} imports")
        
        if analysis['functions']:
            summary_parts.append(f"🔧 Defines {len(analysis['functions'])} functions")
        
        if analysis['classes']:
            summary_parts.append(f"🏗️ Defines {len(analysis['classes'])} classes")
        
        if analysis['variables']:
            summary_parts.append(f"📊 Uses {len(analysis['variables'])} variables")
        
        if analysis['loops']:
            summary_parts.append(f"🔄 Contains {analysis['loops']} loops")
        
        if analysis['conditionals']:
            summary_parts.append(f"❓ Has {analysis['conditionals']} conditional statements")
        
        summary_parts.append(f"📏 {analysis['line_count']} lines of code")
        summary_parts.append(f"⚡ Complexity score: {analysis['complexity_score']}")
        
        return " | ".join(summary_parts) if summary_parts else "Simple code snippet"
