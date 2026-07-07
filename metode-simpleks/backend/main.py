from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
import uvicorn
from solver import SimplexSolver

app = FastAPI(title="Simplex Method API", version="1.0.0")

# Setup CORS so the React frontend can call this backend API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://metode-simpleks-backend.vercel.app/docs"], # In development we can allow all origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ConstraintInput(BaseModel):
    coefficients: List[float] = Field(..., description="Koefisien untuk variabel keputusan (x1, x2, ...)")
    operator: str = Field(..., description="Operator pertidaksamaan: '<=', '>=', atau '='")
    rhs: float = Field(..., description="Nilai ruas kanan (Right Hand Side / RHS)")

class CalculateRequest(BaseModel):
    objective: str = Field(..., description="Tipe optimasi: 'maximize' atau 'minimize'")
    c: List[float] = Field(..., description="Koefisien fungsi tujuan Z")
    constraints: List[ConstraintInput] = Field(..., description="Daftar fungsi kendala")

@app.post("/api/calculate")
def calculate(request: CalculateRequest):
    # Validate request
    if not request.c:
        raise HTTPException(status_code=400, detail="Koefisien fungsi tujuan (c) tidak boleh kosong.")
    if not request.constraints:
        raise HTTPException(status_code=400, detail="Fungsi kendala tidak boleh kosong.")
        
    num_vars = len(request.c)
    for i, con in enumerate(request.constraints):
        if len(con.coefficients) != num_vars:
            raise HTTPException(
                status_code=400, 
                detail=f"Jumlah koefisien pada kendala ke-{i+1} ({len(con.coefficients)}) tidak sesuai dengan jumlah variabel keputusan ({num_vars})."
            )
        if con.operator not in ("<=", ">=", "="):
            raise HTTPException(
                status_code=400,
                detail=f"Operator pada kendala ke-{i+1} tidak valid. Gunakan '<=', '>=', atau '='."
            )
            
    try:
        # Solve using our custom Simplex solver
        solver = SimplexSolver(
            objective=request.objective,
            c=request.c,
            constraints=[con.model_dump() for con in request.constraints]
        )
        result = solver.solve()
        return result
    except Exception as e:
        import traceback
        error_trace = traceback.format_exc()
        print(error_trace)
        raise HTTPException(status_code=500, detail=f"Terjadi kesalahan saat menghitung: {str(e)}")

@app.get("/")
def read_root():
    return {"message": "Simplex Method Solver API is running"}

if __name__ == "__main__":
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
