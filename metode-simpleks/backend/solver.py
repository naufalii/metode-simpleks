import numpy as np
from typing import List, Dict, Any, Tuple, Optional

class SimplexSolver:
    def __init__(self, objective: str, c: List[float], constraints: List[Dict[str, Any]]):
        """
        objective: 'maximize' or 'minimize'
        c: list of coefficients for decision variables (e.g. [3.0, 5.0])
        constraints: list of dicts, e.g.:
            [
                {'coefficients': [1.0, 0.0], 'operator': '<=', 'rhs': 4.0},
                {'coefficients': [0.0, 2.0], 'operator': '<=', 'rhs': 12.0},
                {'coefficients': [3.0, 2.0], 'operator': '<=', 'rhs': 18.0}
            ]
        """
        self.original_objective = objective.lower()
        self.c_orig = np.array(c, dtype=float)
        self.constraints_input = constraints
        
        # We solve internally as a MAXIMIZATION problem.
        # If original objective is minimization, we maximize -Z.
        if self.original_objective == 'minimize':
            self.c = -self.c_orig
        else:
            self.c = self.c_orig.copy()
            
        self.num_decision_vars = len(c)
        self.num_constraints = len(constraints)
        
        # Preprocessing constraints: Ensure RHS is non-negative
        self.processed_constraints = []
        for i, con in enumerate(constraints):
            coef = np.array(con['coefficients'], dtype=float)
            op = con['operator']
            rhs = float(con['rhs'])
            if rhs < 0:
                coef = -coef
                rhs = -rhs
                if op == '<=':
                    op = '>='
                elif op == '>=':
                    op = '<='
            self.processed_constraints.append({
                'coefficients': coef,
                'operator': op,
                'rhs': rhs
            })
            
        # Determine slack, surplus, and artificial variables
        self.slack_surplus_info = [] # List of tuples (constraint_idx, coef_value)
        self.artificial_info = []     # List of constraint_idx
        
        for i, con in enumerate(self.processed_constraints):
            op = con['operator']
            if op == '<=':
                # Add slack variable
                self.slack_surplus_info.append((i, 1.0))
            elif op == '>=':
                # Add surplus variable
                self.slack_surplus_info.append((i, -1.0))
                # Add artificial variable
                self.artificial_info.append(i)
            elif op == '=':
                # Add artificial variable
                self.artificial_info.append(i)
                
        self.num_slack_surplus = len(self.slack_surplus_info)
        self.num_artificial = len(self.artificial_info)
        self.total_vars = self.num_decision_vars + self.num_slack_surplus + self.num_artificial
        
        # Column names
        self.headers = []
        for j in range(self.num_decision_vars):
            self.headers.append(f"x{j+1}")
        for j in range(self.num_slack_surplus):
            self.headers.append(f"s{j+1}")
        for j in range(self.num_artificial):
            self.headers.append(f"a{j+1}")
        self.headers.append("RHS")
        
        # Map variables to their column indices
        self.x_cols = list(range(self.num_decision_vars))
        self.s_cols = list(range(self.num_decision_vars, self.num_decision_vars + self.num_slack_surplus))
        self.a_cols = list(range(self.num_decision_vars + self.num_slack_surplus, self.num_decision_vars + self.num_slack_surplus + self.num_artificial))
        self.rhs_col = self.total_vars
        
        # Build initial basis
        self.basis = [] # Index of basic variables in order of constraint rows
        # Keep track of which variable is basic for each row
        s_count = 0
        a_count = 0
        for i, con in enumerate(self.processed_constraints):
            op = con['operator']
            if op == '<=':
                # Slack is basic
                self.basis.append(f"s{s_count + 1}")
                s_count += 1
            elif op == '>=':
                # Artificial is basic
                self.basis.append(f"a{a_count + 1}")
                s_count += 1 # surplus variable
                a_count += 1
            elif op == '=':
                # Artificial is basic
                self.basis.append(f"a{a_count + 1}")
                a_count += 1

    def get_var_index(self, name: str) -> int:
        return self.headers.index(name)

    def solve(self) -> Dict[str, Any]:
        history = []
        
        # Construct full initial tableau
        # If we have artificial variables, we use a 2-row objective tableau:
        # Row 0: Phase 1 objective (Minimize sum of a_k => Maximize -sum of a_k)
        # Row 1: Phase 2 objective (Original objective, Maximize Z => Z - sum c_j x_j = 0)
        # Rows 2 to m+1: Constraint rows
        
        m = self.num_constraints
        num_rows = m + 2
        num_cols = self.total_vars + 1 # variables + RHS
        
        tableau = np.zeros((num_rows, num_cols), dtype=float)
        
        # Row 1: Original objective row
        for j in range(self.num_decision_vars):
            tableau[1, j] = -self.c[j]
            
        # Constraints: Rows 2 to m+1
        s_idx_counter = 0
        a_idx_counter = 0
        for i, con in enumerate(self.processed_constraints):
            row_idx = i + 2
            # Decision variables
            tableau[row_idx, :self.num_decision_vars] = con['coefficients']
            
            # Slack/Surplus
            op = con['operator']
            if op == '<=':
                col = self.num_decision_vars + s_idx_counter
                tableau[row_idx, col] = 1.0
                s_idx_counter += 1
            elif op == '>=':
                col = self.num_decision_vars + s_idx_counter
                tableau[row_idx, col] = -1.0
                s_idx_counter += 1
                
                # Artificial
                art_col = self.num_decision_vars + self.num_slack_surplus + a_idx_counter
                tableau[row_idx, art_col] = 1.0
                a_idx_counter += 1
            elif op == '=':
                # Artificial
                art_col = self.num_decision_vars + self.num_slack_surplus + a_idx_counter
                tableau[row_idx, art_col] = 1.0
                a_idx_counter += 1
                
            # RHS
            tableau[row_idx, self.rhs_col] = con['rhs']
            
        # Row 0: Phase 1 objective (Maximize -sum of a_k)
        if self.num_artificial > 0:
            # Set coefficients for all artificial variables to 1 (which means in standard equation form: -W + \sum a_k = 0)
            for col in self.a_cols:
                tableau[0, col] = 1.0
                
            # Now, we must perform row operations to make the coefficients of basic variables (artificials) 0 in Row 0.
            # This is done by subtracting all constraint rows that have artificial variables from Row 0.
            for i, con in enumerate(self.processed_constraints):
                if con['operator'] in ('>=', '='):
                    row_idx = i + 2
                    tableau[0] -= tableau[row_idx]
        
        # Save snapshot function
        def save_snapshot(tab: np.ndarray, phase: int, pivot_r: Optional[int] = None, pivot_c: Optional[int] = None, desc: str = ""):
            # Prepare matrix representation
            # We only keep the active rows and columns.
            # If in Phase 1, we show the full tableau (including Row 0 and Row 1).
            # If in Phase 2, Row 0 (Phase 1 objective) and Artificial columns are deleted.
            
            headers_to_send = []
            basis_to_send = list(self.basis)
            
            if phase == 1:
                headers_to_send = list(self.headers)
                matrix = []
                
                # Row 0 (Phase 1 Obj -W)
                matrix.append({
                    "row_name": "-W",
                    "values": [round(val, 6) for val in tab[0]]
                })
                # Row 1 (Phase 2 Obj Z)
                matrix.append({
                    "row_name": "Z",
                    "values": [round(val, 6) for val in tab[1]]
                })
                # Constraints
                for i in range(m):
                    matrix.append({
                        "row_name": self.basis[i],
                        "values": [round(val, 6) for val in tab[i + 2]]
                    })
                
                p_row_idx = pivot_r
                p_col_idx = pivot_c
            else:
                # Phase 2: filter out Row 0 and artificial columns
                art_cols_set = set(self.a_cols)
                cols_to_keep = [col for col in range(num_cols) if col not in art_cols_set]
                headers_to_send = [self.headers[col] for col in cols_to_keep[:-1]] + ["RHS"]
                
                matrix = []
                # Row 0 of Phase 2 is Row 1 of original (Z)
                row_z_values = [tab[1, col] for col in cols_to_keep]
                matrix.append({
                    "row_name": "Z",
                    "values": [round(val, 6) for val in row_z_values]
                })
                # Constraints
                for i in range(m):
                    row_con_values = [tab[i + 2, col] for col in cols_to_keep]
                    matrix.append({
                        "row_name": self.basis[i],
                        "values": [round(val, 6) for val in row_con_values]
                    })
                
                # Adjust pivot row and column indices for the filtered Phase 2 view
                p_row_idx = pivot_r
                if pivot_c is not None:
                    if pivot_c in art_cols_set:
                        p_col_idx = None
                    else:
                        p_col_idx = cols_to_keep.index(pivot_c)
                else:
                    p_col_idx = None
                    
            # Compute current variable values
            current_vals = {}
            for h in self.headers:
                if h != "RHS":
                    current_vals[h] = 0.0
            for i in range(m):
                basic_var = self.basis[i]
                row_idx = i + 2
                current_vals[basic_var] = round(tab[row_idx, self.rhs_col], 6)
                
            # Current Z value
            # In our maximization framework:
            # Row 1 RHS has Z - \sum c_j x_j = RHS => Z = RHS + \sum c_j x_j.
            # But in basic form, the basic variables have 0 coefficients in Row 1.
            # Thus, the RHS value of Row 1 is exactly the current objective value (Z) if the basis is correct.
            # If original objective was minimize, we return -Z.
            z_val = tab[1, self.rhs_col]
            if self.original_objective == 'minimize':
                z_val = -z_val
                
            history.append({
                "phase": phase,
                "headers": headers_to_send,
                "matrix": matrix,
                "basis": basis_to_send,
                "pivot_row": p_row_idx, # Index in the 'matrix' array
                "pivot_col": p_col_idx, # Index in the headers (columns)
                "pivot_value": round(tab[pivot_r, pivot_c], 6) if (pivot_r is not None and pivot_c is not None) else None,
                "z_value": round(z_val, 6),
                "variable_values": {k: float(v) for k, v in current_vals.items()},
                "description": desc
            })

        # --- PHASE 1 ---
        is_feasible = True
        status = "Optimal"
        
        if self.num_artificial > 0:
            save_snapshot(tableau, phase=1, desc="Tabel Simplex Awal (Phase 1). Variabel buatan (artificial) dimasukkan untuk mencari basis layak awal.")
            
            phase1_iter = 0
            while True:
                # Check for optimality in Phase 1
                # Check Row 0 coefficients (excluding RHS)
                opt_check = tableau[0, :self.total_vars]
                if np.all(opt_check >= -1e-9):
                    # Phase 1 complete!
                    break
                    
                # Choose entering column (most negative)
                pivot_col = int(np.argmin(opt_check))
                
                # Choose leaving row (min ratio test on Rows 2 to m+1)
                ratios = []
                row_indices = []
                for i in range(m):
                    row_idx = i + 2
                    val = tableau[row_idx, pivot_col]
                    if val > 1e-9:
                        rhs_val = tableau[row_idx, self.rhs_col]
                        ratios.append(rhs_val / val)
                        row_indices.append(row_idx)
                        
                if not ratios:
                    # Phase 1 is unbounded or locked. If ratios is empty, it means we cannot pivot.
                    # This usually happens if the constraints are contradictory (infeasible).
                    is_feasible = False
                    status = "Infeasible"
                    break
                    
                min_ratio_idx = np.argmin(ratios)
                pivot_row = row_indices[min_ratio_idx]
                
                # Save snapshot before pivot
                save_snapshot(tableau, phase=1, pivot_r=pivot_row, pivot_c=pivot_col, 
                              desc=f"Iterasi Phase 1. Kolom pivot: {self.headers[pivot_col]} (nilai paling negatif di baris -W), "
                                   f"Baris pivot: {self.basis[pivot_row - 2]} (rasio terkecil).")
                
                # Perform Pivot
                pivot_element = tableau[pivot_row, pivot_col]
                tableau[pivot_row] /= pivot_element
                for r in range(num_rows):
                    if r != pivot_row:
                        tableau[r] -= tableau[r, pivot_col] * tableau[pivot_row]
                        
                # Update basis
                entering_var = self.headers[pivot_col]
                self.basis[pivot_row - 2] = entering_var
                
                phase1_iter += 1
                if phase1_iter > 100: # safety limit
                    is_feasible = False
                    status = "Iteration Limit Exceeded"
                    break
            
            # Post Phase 1 check
            if is_feasible:
                # W value is the negative of RHS of Row 0 (since -W = RHS => W = -RHS)
                w_val = -tableau[0, self.rhs_col]
                if w_val > 1e-6:
                    is_feasible = False
                    status = "Infeasible"
                    save_snapshot(tableau, phase=1, desc=f"Phase 1 selesai. Nilai W = {round(w_val, 6)} > 0. Masalah tidak layak (Infeasible).")
                else:
                    # Solve succeeded in finding a feasible solution.
                    # Check if any artificial variables are still in the basis
                    # if they are, we must pivot them out.
                    for i in range(m):
                        basic_var = self.basis[i]
                        if basic_var.startswith('a'):
                            # Try to pivot it out
                            row_idx = i + 2
                            # Find a non-basic non-artificial variable with a non-zero coefficient
                            pivoted = False
                            for col in range(self.num_decision_vars + self.num_slack_surplus):
                                if self.headers[col] not in self.basis:
                                    if abs(tableau[row_idx, col]) > 1e-9:
                                        # Pivot on this element
                                        pivot_row = row_idx
                                        pivot_col = col
                                        
                                        save_snapshot(tableau, phase=1, pivot_r=pivot_row, pivot_c=pivot_col,
                                                      desc=f"Mengeluarkan variabel buatan {basic_var} dari basis dengan mempivot {self.headers[col]}.")
                                        
                                        pivot_element = tableau[pivot_row, pivot_col]
                                        tableau[pivot_row] /= pivot_element
                                        for r in range(num_rows):
                                            if r != pivot_row:
                                                tableau[r] -= tableau[r, pivot_col] * tableau[pivot_row]
                                        self.basis[pivot_row - 2] = self.headers[pivot_col]
                                        pivoted = True
                                        break
                            if not pivoted:
                                # Redundant constraint, we can just ignore it (it's fine to leave it with value 0)
                                pass
                                
                    save_snapshot(tableau, phase=1, desc="Phase 1 selesai dengan sukses. Semua variabel buatan telah bernilai 0 dan dikeluarkan dari basis. Masuk ke Phase 2.")
        
        # --- PHASE 2 ---
        if is_feasible:
            # We are now in Phase 2.
            # Row 1 is the objective row. Rows 2 to m+1 are constraints.
            # Ensure Row 1 is in basic form (coefficients of basic variables should be 0).
            for i in range(m):
                row_idx = i + 2
                basic_var = self.basis[i]
                col_idx = self.get_var_index(basic_var)
                coef = tableau[1, col_idx]
                if abs(coef) > 1e-9:
                    tableau[1] -= coef * tableau[row_idx]
                    
            save_snapshot(tableau, phase=2, desc="Memulai Phase 2. Baris fungsi tujuan (Z) disesuaikan agar koefisien variabel basis bernilai 0.")
            
            phase2_iter = 0
            while True:
                # Check for optimality in Phase 2
                # We check Row 1 coefficients (excluding RHS and artificial columns)
                opt_check = tableau[1, :self.num_decision_vars + self.num_slack_surplus]
                if np.all(opt_check >= -1e-9):
                    status = "Optimal"
                    break
                    
                # Choose entering column (most negative)
                pivot_col = int(np.argmin(opt_check))
                
                # Choose leaving row
                ratios = []
                row_indices = []
                for i in range(m):
                    row_idx = i + 2
                    val = tableau[row_idx, pivot_col]
                    if val > 1e-9:
                        rhs_val = tableau[row_idx, self.rhs_col]
                        ratios.append(rhs_val / val)
                        row_indices.append(row_idx)
                        
                if not ratios:
                    status = "Unbounded"
                    break
                    
                min_ratio_idx = np.argmin(ratios)
                pivot_row = row_indices[min_ratio_idx]
                
                # Save snapshot before pivot
                save_snapshot(tableau, phase=2, pivot_r=pivot_row, pivot_c=pivot_col,
                              desc=f"Iterasi Phase 2. Kolom pivot: {self.headers[pivot_col]} (nilai paling negatif di baris Z), "
                                   f"Baris pivot: {self.basis[pivot_row - 2]} (rasio terkecil).")
                
                # Pivot
                pivot_element = tableau[pivot_row, pivot_col]
                tableau[pivot_row] /= pivot_element
                for r in range(num_rows):
                    if r != pivot_row:
                        tableau[r] -= tableau[r, pivot_col] * tableau[pivot_row]
                        
                # Update basis
                entering_var = self.headers[pivot_col]
                self.basis[pivot_row - 2] = entering_var
                
                phase2_iter += 1
                if phase2_iter > 100:
                    status = "Iteration Limit Exceeded"
                    break
            
            if status == "Optimal":
                save_snapshot(tableau, phase=2, desc="Solusi optimal tercapai! Semua koefisien pada baris fungsi tujuan (Z) bernilai non-negatif.")
            elif status == "Unbounded":
                save_snapshot(tableau, phase=2, desc="Masalah tidak terbatas (Unbounded). Kolom pivot memiliki nilai positif, tetapi tidak ada pembatas baris layak (rasio tidak ada).")
        
        # Build final outputs
        # Get final values
        final_values = {}
        for h in self.headers:
            if h != "RHS" and not h.startswith('a'):
                final_values[h] = 0.0
                
        for i in range(m):
            basic_var = self.basis[i]
            if not basic_var.startswith('a'):
                final_values[basic_var] = round(tableau[i + 2, self.rhs_col], 6)
                
        final_z = tableau[1, self.rhs_col]
        if self.original_objective == 'minimize':
            final_z = -final_z
            
        # Return response
        response = {
            "status": status,
            "objective_value": round(final_z, 6),
            "variable_values": final_values,
            "iterations": history,
            "original_objective": self.original_objective
        }
        
        # Calculate 2D graphing data if we have exactly 2 decision variables
        if self.num_decision_vars == 2:
            response["graph_data"] = self.calculate_graph_data()
            
        return response

    def calculate_graph_data(self) -> Dict[str, Any]:
        """
        Finds the intersections of all constraint boundary lines and the axes,
        filters them to find feasible region vertices, sorts them, and computes graph limits.
        """
        # Define equations: a*x1 + b*x2 = c
        # We will collect lines:
        # Line format: (A, B, C, label) representing A*x1 + B*x2 = C
        lines = []
        
        # Axes boundaries
        lines.append((1.0, 0.0, 0.0, "x1 = 0"))
        lines.append((0.0, 1.0, 0.0, "x2 = 0"))
        
        for i, con in enumerate(self.constraints_input):
            coef = con['coefficients']
            op = con['operator']
            rhs = float(con['rhs'])
            lines.append((float(coef[0]), float(coef[1]), rhs, f"Kendala {i+1} ({op})"))
            
        # Find all pairwise intersections
        intersections = []
        n_lines = len(lines)
        for i in range(n_lines):
            for j in range(i + 1, n_lines):
                A1, B1, C1, _ = lines[i]
                A2, B2, C2, _ = lines[j]
                
                det = A1 * B2 - A2 * B1
                if abs(det) > 1e-9:
                    x1 = (C1 * B2 - C2 * B1) / det
                    x2 = (A1 * C2 - A2 * C1) / det
                    intersections.append((x1, x2))
                    
        # Filter intersection points to find those that are feasible
        feasible_points = []
        for p in intersections:
            x1, x2 = p
            
            # Non-negativity check
            if x1 < -1e-5 or x2 < -1e-5:
                continue
                
            # Clip near-zero coordinates to 0
            if abs(x1) < 1e-5:
                x1 = 0.0
            if abs(x2) < 1e-5:
                x2 = 0.0
                
            # Check all constraints
            is_feasible_pt = True
            for con in self.constraints_input:
                coef = con['coefficients']
                op = con['operator']
                rhs = float(con['rhs'])
                val = coef[0] * x1 + coef[1] * x2
                
                if op == '<=':
                    if val > rhs + 1e-5:
                        is_feasible_pt = False
                        break
                elif op == '>=':
                    if val < rhs - 1e-5:
                        is_feasible_pt = False
                        break
                elif op == '=':
                    if abs(val - rhs) > 1e-5:
                        is_feasible_pt = False
                        break
            if is_feasible_pt:
                # Check for duplicates
                duplicate = False
                for fp in feasible_points:
                    if abs(fp[0] - x1) < 1e-4 and abs(fp[1] - x2) < 1e-4:
                        duplicate = True
                        break
                if not duplicate:
                    feasible_points.append((x1, x2))
                    
        # Sort the feasible points to form a simple convex polygon (counter-clockwise)
        sorted_vertices = []
        if len(feasible_points) > 0:
            if len(feasible_points) <= 2:
                sorted_vertices = feasible_points
            else:
                # Find centroid
                cx = sum(p[0] for p in feasible_points) / len(feasible_points)
                cy = sum(p[1] for p in feasible_points) / len(feasible_points)
                
                # Sort by polar angle from centroid
                def angle_from_centroid(p):
                    return np.arctan2(p[1] - cy, p[0] - cx)
                    
                sorted_vertices = sorted(feasible_points, key=angle_from_centroid)
                
        # Determine graph limits
        # Find maximum values of coordinates among feasible points and some default buffer
        max_x = 10.0
        max_y = 10.0
        
        # If we have constraint line intercepts, use them to set a reasonable viewport
        intercepts = []
        for con in self.constraints_input:
            coef = con['coefficients']
            rhs = float(con['rhs'])
            if abs(coef[0]) > 1e-9:
                intercepts.append(rhs / coef[0])
            if abs(coef[1]) > 1e-9:
                intercepts.append(rhs / coef[1])
                
        valid_intercepts = [v for v in intercepts if v > 0 and v < 1e6]
        if valid_intercepts:
            max_x = max(valid_intercepts) * 1.2
            max_y = max(valid_intercepts) * 1.2
            
        if feasible_points:
            f_max_x = max(p[0] for p in feasible_points)
            f_max_y = max(p[1] for p in feasible_points)
            max_x = max(max_x, f_max_x * 1.2)
            max_y = max(max_y, f_max_y * 1.2)
            
        # Ensure minimum size
        max_x = max(max_x, 5.0)
        max_y = max(max_y, 5.0)
        
        # Cap max limits in case of huge intercepts
        max_x = min(max_x, 1000.0)
        max_y = min(max_y, 1000.0)
        
        # Format constraints for plotting lines
        # For each constraint, we calculate line segments within the viewport [0, max_x] and [0, max_y]
        plotted_lines = []
        for idx, con in enumerate(self.constraints_input):
            A, B = con['coefficients']
            C = float(con['rhs'])
            op = con['operator']
            
            pts = []
            if abs(B) > 1e-9:
                # y = (C - A*x) / B
                # Test x = 0
                y0 = C / B
                if y0 >= 0 and y0 <= max_y * 2:
                    pts.append({"x": 0.0, "y": round(y0, 4)})
                # Test x = max_x
                ymax = (C - A * max_x) / B
                if ymax >= 0 and ymax <= max_y * 2:
                    pts.append({"x": max_x, "y": round(ymax, 4)})
            if abs(A) > 1e-9:
                # x = (C - B*y) / A
                # Test y = 0
                x0 = C / A
                if x0 >= 0 and x0 <= max_x * 2:
                    pts.append({"x": round(x0, 4), "y": 0.0})
                # Test y = max_y
                xmax = (C - B * max_y) / A
                if xmax >= 0 and xmax <= max_x * 2:
                    pts.append({"x": round(xmax, 4), "y": max_y})
                    
            # Sort points by X coordinate so it draws left-to-right
            pts = sorted(pts, key=lambda p: p["x"])
            
            # Keep unique points
            unique_pts = []
            for pt in pts:
                if not any(abs(up["x"] - pt["x"]) < 1e-3 and abs(up["y"] - pt["y"]) < 1e-3 for up in unique_pts):
                    unique_pts.append(pt)
                    
            if len(unique_pts) >= 2:
                plotted_lines.append({
                    "id": f"con_{idx}",
                    "label": f"Kendala {idx+1}: {A}x1 + {B}x2 {op} {C}",
                    "points": unique_pts
                })
                
        # Objective function line (passing through optimal point, or just a sample)
        # Z = c1*x1 + c2*x2 => x2 = (Z - c1*x1) / c2
        
        return {
            "feasible_polygon": [{"x": round(p[0], 4), "y": round(p[1], 4)} for p in sorted_vertices],
            "constraint_lines": plotted_lines,
            "x_limit": round(max_x, 2),
            "y_limit": round(max_y, 2)
        }
