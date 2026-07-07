import unittest
from solver import SimplexSolver

class TestSimplexSolver(unittest.TestCase):
    def test_standard_maximization(self):
        # Maximize Z = 3x1 + 5x2
        # s.t.
        # x1 <= 4
        # 2x2 <= 12
        # 3x1 + 2x2 <= 18
        # x1, x2 >= 0
        c = [3.0, 5.0]
        constraints = [
            {'coefficients': [1.0, 0.0], 'operator': '<=', 'rhs': 4.0},
            {'coefficients': [0.0, 2.0], 'operator': '<=', 'rhs': 12.0},
            {'coefficients': [3.0, 2.0], 'operator': '<=', 'rhs': 18.0}
        ]
        solver = SimplexSolver('maximize', c, constraints)
        result = solver.solve()
        
        self.assertEqual(result['status'], 'Optimal')
        self.assertAlmostEqual(result['objective_value'], 36.0)
        self.assertAlmostEqual(result['variable_values']['x1'], 2.0)
        self.assertAlmostEqual(result['variable_values']['x2'], 6.0)
        
    def test_minimization_with_ge(self):
        # Minimize Z = 2x1 + 3x2
        # s.t.
        # x1 + x2 >= 6
        # x1 + 2x2 >= 8
        # x1, x2 >= 0
        c = [2.0, 3.0]
        constraints = [
            {'coefficients': [1.0, 1.0], 'operator': '>=', 'rhs': 6.0},
            {'coefficients': [1.0, 2.0], 'operator': '>=', 'rhs': 8.0}
        ]
        solver = SimplexSolver('minimize', c, constraints)
        result = solver.solve()
        
        self.assertEqual(result['status'], 'Optimal')
        # Optimal point is x1 = 4, x2 = 2 => Z = 2*4 + 3*2 = 14
        # (Another corner point is (0,6) => Z = 18, (8,0) => Z = 16)
        self.assertAlmostEqual(result['objective_value'], 14.0)
        self.assertAlmostEqual(result['variable_values']['x1'], 4.0)
        self.assertAlmostEqual(result['variable_values']['x2'], 2.0)

if __name__ == '__main__':
    unittest.main()
