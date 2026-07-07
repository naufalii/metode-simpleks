import React, { useState, useEffect } from 'react';
import { Plus, Calculator, RefreshCw, BarChart2, CheckCircle2, AlertTriangle, HelpCircle, Layers, ArrowLeft, ArrowRight, X, Printer, BookOpen, TrendingUp } from 'lucide-react';
import SimplexGraph from './components/SimplexGraph';

// ─── Small reusable components ───────────────────────────────────────────────

function SectionTitle({ children }) {
  return (
    <h2 style={{
      fontSize: '11px',
      fontWeight: 800,
      color: '#8E7A75',
      letterSpacing: '0.08em',
      textTransform: 'uppercase',
      borderBottom: '1.5px solid #F3D7CD',
      paddingBottom: '10px',
      marginBottom: '4px',
    }}>{children}</h2>
  );
}

function Card({ children, style = {} }) {
  return (
    <div style={{
      background: '#fff',
      border: '1px solid rgba(62,39,35,0.06)',
      borderRadius: '10px',
      padding: '18px',
      boxShadow: '0 2px 12px rgba(62,39,35,0.04)',
      ...style
    }}>
      {children}
    </div>
  );
}

function Label({ children }) {
  return (
    <div style={{
      fontSize: '10px',
      fontWeight: 700,
      color: '#8E7A75',
      textTransform: 'uppercase',
      letterSpacing: '0.07em',
      marginBottom: '8px',
    }}>{children}</div>
  );
}

function SmallInput({ value, onChange, width = '60px', style = {} }) {
  return (
    <input
      type="number"
      step="any"
      value={value}
      onChange={onChange}
      style={{
        width,
        padding: '7px 8px',
        background: '#fff',
        border: '1px solid #E3A38F',
        borderRadius: '7px',
        color: '#3E2723',
        fontSize: '13px',
        fontWeight: 600,
        textAlign: 'center',
        outline: 'none',
        ...style
      }}
    />
  );
}

function StyledSelect({ value, onChange, children, style = {} }) {
  return (
    <select
      value={value}
      onChange={onChange}
      style={{
        padding: '9px 12px',
        background: '#fff',
        border: '1px solid #E3A38F',
        borderRadius: '8px',
        color: '#3E2723',
        fontSize: '13px',
        fontWeight: 600,
        outline: 'none',
        cursor: 'pointer',
        ...style
      }}
    >
      {children}
    </select>
  );
}

function PrimaryBtn({ onClick, disabled, children, style = {} }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        background: disabled ? '#e0c9c3' : '#CC6F57',
        color: '#fff',
        border: 'none',
        borderRadius: '8px',
        padding: '10px 18px',
        fontSize: '12px',
        fontWeight: 700,
        cursor: disabled ? 'not-allowed' : 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        letterSpacing: '0.04em',
        boxShadow: disabled ? 'none' : '0 2px 8px rgba(204,111,87,0.25)',
        transition: 'all 0.15s ease',
        ...style
      }}
    >
      {children}
    </button>
  );
}

function SecondaryBtn({ onClick, disabled, children, style = {} }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        background: '#fff',
        color: '#5C4A45',
        border: '1px solid #E3A38F',
        borderRadius: '8px',
        padding: '9px 14px',
        fontSize: '12px',
        fontWeight: 600,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        transition: 'all 0.15s ease',
        ...style
      }}
    >
      {children}
    </button>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────

export default function App() {
  const [numVars, setNumVars] = useState(2);
  const [objective, setObjective] = useState('maximize');
  const [objectiveCoeffs, setObjectiveCoeffs] = useState(['3', '5']);
  const [constraints, setConstraints] = useState([
    { coefficients: ['1', '0'], operator: '<=', rhs: '4' },
    { coefficients: ['0', '2'], operator: '<=', rhs: '12' },
    { coefficients: ['3', '2'], operator: '<=', rhs: '18' },
  ]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [currentStep, setCurrentStep] = useState(0);

  // Sync arrays when numVars changes
  useEffect(() => {
    setObjectiveCoeffs(prev => {
      const next = [...prev];
      while (next.length < numVars) next.push('0');
      return next.slice(0, numVars);
    });
    setConstraints(prev => prev.map(con => {
      const coef = [...con.coefficients];
      while (coef.length < numVars) coef.push('0');
      return { ...con, coefficients: coef.slice(0, numVars) };
    }));
  }, [numVars]);

  const handleAddVariable = () => { if (numVars < 8) setNumVars(v => v + 1); };
  const handleRemoveVariable = (idx) => {
    if (numVars <= 1) return;
    setObjectiveCoeffs(prev => prev.filter((_, i) => i !== idx));
    setConstraints(prev => prev.map(con => ({
      ...con, coefficients: con.coefficients.filter((_, i) => i !== idx)
    })));
    setNumVars(v => v - 1);
  };

  const handleAddConstraint = () => {
    if (constraints.length >= 10) return;
    setConstraints(prev => [...prev, { coefficients: Array(numVars).fill('0'), operator: '<=', rhs: '0' }]);
  };
  const handleRemoveConstraint = (idx) => {
    if (constraints.length <= 1) return;
    setConstraints(prev => prev.filter((_, i) => i !== idx));
  };

  const handleReset = () => {
    setNumVars(2);
    setObjective('maximize');
    setObjectiveCoeffs(['3', '5']);
    setConstraints([
      { coefficients: ['1', '0'], operator: '<=', rhs: '4' },
      { coefficients: ['0', '2'], operator: '<=', rhs: '12' },
      { coefficients: ['3', '2'], operator: '<=', rhs: '18' },
    ]);
    setResult(null);
    setError(null);
  };

  const handleCalculate = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    setCurrentStep(0);
    try {
      const res = await fetch('https://metode-simpleks-backend.vercel.app/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          objective,
          c: objectiveCoeffs.map(v => parseFloat(v) || 0),
          constraints: constraints.map(con => ({
            coefficients: con.coefficients.map(v => parseFloat(v) || 0),
            operator: con.operator,
            rhs: parseFloat(con.rhs) || 0,
          })),
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Kesalahan sistem.');
      }
      setResult(await res.json());
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const getOptimalPoint = () => {
    if (!result || result.status !== 'Optimal') return null;
    return { x: result.variable_values['x1'] || 0, y: result.variable_values['x2'] || 0 };
  };

  const varLabel = (name) => {
    const letter = name[0];
    const num = name.substring(1);
    return <span>{letter}<sub>{num}</sub></span>;
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#FDF8F5', paddingBottom: '60px' }}>

      {/* ── HEADER ───────────────────────────────────────────────────────── */}
      <header style={{
        maxWidth: '1560px', margin: '0 auto',
        padding: '24px 32px 0',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexWrap: 'wrap', gap: '12px',
          borderBottom: '1.5px solid #F3D7CD', paddingBottom: '16px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{
              padding: '10px', background: '#FDF1EC',
              borderRadius: '12px', border: '1px solid #E3A38F',
            }}>
              <TrendingUp size={22} color="#CC6F57" />
            </div>
            <div>
              <h1 style={{ fontSize: '22px', fontWeight: 800, color: '#3E2723', letterSpacing: '-0.3px' }}>
                Analisis Metode Simplex
              </h1>
              <p style={{ fontSize: '11px', color: '#8E7A75', fontWeight: 600, marginTop: '1px' }}>
                Sistem Komputasi & Visualisasi Linear Programming
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            {['FastAPI + NumPy', 'React + Vite'].map(t => (
              <span key={t} style={{
                fontSize: '10px', fontWeight: 700, padding: '4px 10px',
                borderRadius: '6px', background: '#FDF1EC',
                border: '1px solid #E3A38F', color: '#CC6F57',
                textTransform: 'uppercase', letterSpacing: '0.05em',
              }}>{t}</span>
            ))}
          </div>
        </div>
      </header>

      {/* ── MAIN 3-COLUMN GRID ───────────────────────────────────────────── */}
      <main style={{
        maxWidth: '1560px', margin: '0 auto',
        padding: '24px 32px',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 340px), 1fr))',
        gap: '20px',
        alignItems: 'start',
      }}>

        {/* ════════════════════════════════════════════════════════════════
            KOLOM 1 — INPUT CONTROL
        ════════════════════════════════════════════════════════════════ */}
        <Card>
          <SectionTitle>Input Data</SectionTitle>

          {/* ── Tipe Optimasi ── */}
          <div style={{ marginTop: '16px' }}>
            <Label>Tipe Optimasi</Label>
            <StyledSelect value={objective} onChange={e => setObjective(e.target.value)} style={{ width: '100%' }}>
              <option value="maximize">Maksimalisasi</option>
              <option value="minimize">Minimalisasi</option>
            </StyledSelect>
          </div>

          {/* ── Variabel Keputusan ── */}
          <div style={{ marginTop: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <Label>Variabel Keputusan</Label>
              <span style={{
                fontSize: '10px', fontWeight: 700, color: '#CC6F57',
                background: '#FDF1EC', border: '1px solid #E3A38F',
                padding: '2px 8px', borderRadius: '20px',
              }}>{numVars} Var</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '140px', overflowY: 'auto' }}>
              {Array.from({ length: numVars }).map((_, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: '10px',
                  background: '#FCFAF8', borderRadius: '8px',
                  border: '1px solid rgba(62,39,35,0.06)',
                  padding: '8px 12px',
                }}>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: '#CC6F57', minWidth: '24px' }}>
                    x<sub>{i + 1}</sub>
                  </span>
                  <span style={{ flex: 1, fontSize: '12px', color: '#8E7A75', fontWeight: 500 }}>
                    Variabel keputusan ke-{i + 1}
                  </span>
                  {numVars > 1 && (
                    <button onClick={() => handleRemoveVariable(i)} style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      color: '#c0b0ab', padding: '2px', borderRadius: '4px',
                      display: 'flex', alignItems: 'center',
                    }}>
                      <X size={13} />
                    </button>
                  )}
                </div>
              ))}
            </div>

            <SecondaryBtn onClick={handleAddVariable} disabled={numVars >= 8} style={{ marginTop: '10px', width: '100%', justifyContent: 'center', fontSize: '11px' }}>
              <Plus size={13} /> Tambah Variabel
            </SecondaryBtn>
          </div>

          {/* ── Koefisien Fungsi Tujuan (Z) — INLINE ROW ── */}
          <div style={{ marginTop: '20px' }}>
            <Label>Koefisien Fungsi Tujuan (Z)</Label>
            <div style={{
              background: '#FCFAF8', border: '1px solid rgba(62,39,35,0.06)',
              borderRadius: '8px', padding: '12px',
            }}>
              {/* Z = [c1]x1 + [c2]x2 ... all inline */}
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#CC6F57', whiteSpace: 'nowrap' }}>Z =</span>
                {objectiveCoeffs.map((val, i) => (
                  <React.Fragment key={i}>
                    <SmallInput
                      value={val}
                      onChange={e => {
                        const next = [...objectiveCoeffs];
                        next[i] = e.target.value;
                        setObjectiveCoeffs(next);
                      }}
                      width="56px"
                    />
                    <span style={{ fontSize: '12px', fontWeight: 600, color: '#5C4A45', whiteSpace: 'nowrap' }}>
                      x<sub>{i + 1}</sub>
                      {i < numVars - 1 && <span style={{ marginLeft: '6px' }}>+</span>}
                    </span>
                  </React.Fragment>
                ))}
              </div>
            </div>
          </div>

          {/* ── Fungsi Kendala — each row INLINE ── */}
          <div style={{ marginTop: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <Label>Fungsi Kendala</Label>
              <span style={{
                fontSize: '10px', fontWeight: 700, color: '#CC6F57',
                background: '#FDF1EC', border: '1px solid #E3A38F',
                padding: '2px 8px', borderRadius: '20px',
              }}>{constraints.length} Kendala</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '280px', overflowY: 'auto' }}>
              {constraints.map((con, ci) => (
                <div key={ci} style={{
                  background: '#FCFAF8', border: '1px solid rgba(62,39,35,0.06)',
                  borderRadius: '8px', padding: '10px 12px',
                }}>
                  {/* Header row: label + delete */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontSize: '10px', fontWeight: 700, color: '#8E7A75' }}>Kendala #{ci + 1}</span>
                    {constraints.length > 1 && (
                      <button onClick={() => handleRemoveConstraint(ci)} style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: '#c0b0ab', padding: '2px', display: 'flex', alignItems: 'center',
                      }}>
                        <X size={13} />
                      </button>
                    )}
                  </div>
                  {/* Inline math row: [c1]x1 + [c2]x2 <= [rhs] */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '6px' }}>
                    {con.coefficients.map((cv, vi) => (
                      <React.Fragment key={vi}>
                        <SmallInput
                          value={cv}
                          onChange={e => {
                            const next = constraints.map((c, idx) =>
                              idx === ci ? { ...c, coefficients: c.coefficients.map((v, k) => k === vi ? e.target.value : v) } : c
                            );
                            setConstraints(next);
                          }}
                          width="50px"
                        />
                        <span style={{ fontSize: '12px', fontWeight: 600, color: '#5C4A45', whiteSpace: 'nowrap' }}>
                          x<sub>{vi + 1}</sub>
                          {vi < numVars - 1 && <span style={{ marginLeft: '4px' }}>+</span>}
                        </span>
                      </React.Fragment>
                    ))}
                    {/* Operator */}
                    <StyledSelect
                      value={con.operator}
                      onChange={e => setConstraints(prev => prev.map((c, i) => i === ci ? { ...c, operator: e.target.value } : c))}
                      style={{ padding: '6px 8px', fontSize: '13px', width: 'auto', minWidth: '50px' }}
                    >
                      <option value="<=">≤</option>
                      <option value=">=">≥</option>
                      <option value="=">=</option>
                    </StyledSelect>
                    {/* RHS */}
                    <SmallInput
                      value={con.rhs}
                      onChange={e => setConstraints(prev => prev.map((c, i) => i === ci ? { ...c, rhs: e.target.value } : c))}
                      width="56px"
                    />
                  </div>
                </div>
              ))}
            </div>

            <SecondaryBtn onClick={handleAddConstraint} disabled={constraints.length >= 10} style={{ marginTop: '10px', width: '100%', justifyContent: 'center', fontSize: '11px' }}>
              <Plus size={13} /> Tambah Kendala
            </SecondaryBtn>
          </div>

          {/* ── Non-negativity note ── */}
          <div style={{
            marginTop: '16px', padding: '10px 12px',
            background: '#FDF1EC', border: '1px solid #F3D7CD',
            borderRadius: '8px', fontSize: '11px', color: '#5C4A45', fontWeight: 500,
          }}>
            <strong style={{ color: '#CC6F57' }}>Batas bawah:</strong> x<sub>j</sub> ≥ 0 untuk semua variabel.
          </div>

          {/* ── Hitung / Reset Buttons ── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '10px', marginTop: '20px', paddingTop: '16px', borderTop: '1px solid #F3D7CD' }}>
            <SecondaryBtn onClick={handleReset} style={{ justifyContent: 'center' }}>
              <RefreshCw size={13} /> Reset
            </SecondaryBtn>
            <PrimaryBtn onClick={handleCalculate} disabled={loading} style={{ justifyContent: 'center' }}>
              {loading ? <><RefreshCw size={13} className="animate-spin" /> Menghitung...</> : <><Calculator size={13} /> HITUNG</>}
            </PrimaryBtn>
          </div>
        </Card>

        {/* ════════════════════════════════════════════════════════════════
            KOLOM 2 — DETAIL ANALISIS
        ════════════════════════════════════════════════════════════════ */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

          {/* Error */}
          {error && (
            <Card style={{ background: '#fff5f5', border: '1px solid #fecaca' }}>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                <AlertTriangle size={18} color="#ef4444" style={{ flexShrink: 0, marginTop: '1px' }} />
                <div>
                  <div style={{ fontWeight: 700, color: '#991b1b', fontSize: '13px' }}>Gagal Kalkulasi</div>
                  <div style={{ fontSize: '12px', color: '#7f1d1d', marginTop: '4px' }}>{error}</div>
                </div>
              </div>
            </Card>
          )}

          {/* Empty state */}
          {!result && !loading && !error && (
            <>
              <Card style={{ textAlign: 'center', padding: '40px 24px' }}>
                <div style={{
                  display: 'inline-flex', padding: '16px',
                  background: '#FDF1EC', borderRadius: '50%',
                  border: '1px solid #F3D7CD', marginBottom: '16px',
                }}>
                  <HelpCircle size={32} color="#CC6F57" />
                </div>
                <div style={{ fontWeight: 700, fontSize: '14px', color: '#3E2723', marginBottom: '8px' }}>Menunggu Perhitungan</div>
                <p style={{ fontSize: '12px', color: '#8E7A75', lineHeight: '1.6', maxWidth: '260px', margin: '0 auto' }}>
                  Lengkapi form input di panel kiri, lalu klik <strong>HITUNG</strong> untuk memulai komputasi Simplex.
                </p>
              </Card>
              <Card>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                  <BookOpen size={15} color="#CC6F57" />
                  <span style={{ fontSize: '11px', fontWeight: 800, color: '#CC6F57', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Tentang Metode Simplex</span>
                </div>
                <p style={{ fontSize: '12px', color: '#8E7A75', lineHeight: '1.7', marginBottom: '12px' }}>
                  Metode Simplex adalah algoritma iteratif yang menelusuri tepi daerah kelayakan (feasible region) dari titik sudut ke titik sudut menuju solusi optimum.
                </p>
                {[
                  ['Standard Form', 'Semua kendala dikonversi menjadi persamaan menggunakan slack/surplus.'],
                  ['Two-Phase', 'Diterapkan saat ada kendala ≥ atau = yang memerlukan variabel buatan.'],
                  ['Pivoting', 'Operasi baris elementer untuk menukar variabel dalam basis.'],
                ].map(([title, desc]) => (
                  <div key={title} style={{
                    padding: '8px 10px', background: '#FCFAF8',
                    borderRadius: '6px', border: '1px solid rgba(62,39,35,0.05)',
                    marginBottom: '6px',
                  }}>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#3E2723', marginBottom: '2px' }}>{title}</div>
                    <div style={{ fontSize: '11px', color: '#8E7A75', lineHeight: '1.5' }}>{desc}</div>
                  </div>
                ))}
              </Card>
            </>
          )}

          {/* Loading */}
          {loading && (
            <Card style={{ textAlign: 'center', padding: '60px 24px' }}>
              <RefreshCw size={30} color="#CC6F57" style={{ animation: 'spin 1s linear infinite', marginBottom: '16px' }} />
              <div style={{ fontWeight: 700, fontSize: '14px', color: '#3E2723' }}>Sedang Menghitung...</div>
              <p style={{ fontSize: '12px', color: '#8E7A75', marginTop: '6px' }}>Mengeksekusi algoritma NumPy backend.</p>
            </Card>
          )}

          {/* RESULTS */}
          {result && (
            <>
              {/* Summary Card */}
              <Card>
                <SectionTitle>Detail Analisis</SectionTitle>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '14px' }}>
                  {/* Status */}
                  <div style={{ background: '#FCFAF8', border: '1px solid rgba(62,39,35,0.05)', borderRadius: '8px', padding: '12px' }}>
                    <div style={{ fontSize: '10px', fontWeight: 700, color: '#8E7A75', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '8px' }}>Status Solusi</div>
                    {result.status === 'Optimal' ? (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: '#FDF1EC', color: '#CC6F57', border: '1px solid #E3A38F', padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 700 }}>
                        <CheckCircle2 size={12} /> Optimal
                      </span>
                    ) : result.status === 'Unbounded' ? (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: '#fff5f5', color: '#dc2626', border: '1px solid #fecaca', padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 700 }}>
                        <AlertTriangle size={12} /> Unbounded
                      </span>
                    ) : (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: '#fffbeb', color: '#d97706', border: '1px solid #fde68a', padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 700 }}>
                        <AlertTriangle size={12} /> Infeasible
                      </span>
                    )}
                  </div>
                  {/* Z value */}
                  <div style={{ background: '#FCFAF8', border: '1px solid rgba(62,39,35,0.05)', borderRadius: '8px', padding: '12px' }}>
                    <div style={{ fontSize: '10px', fontWeight: 700, color: '#8E7A75', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '6px' }}>Nilai Optimum Z</div>
                    <div style={{ fontSize: '22px', fontWeight: 900, color: '#3E2723', lineHeight: 1 }}>
                      {result.status === 'Optimal' ? result.objective_value : '—'}
                    </div>
                  </div>
                </div>

                {/* Variable Badge Grid — structured, not plain text */}
                {result.status === 'Optimal' && (
                  <div style={{ marginTop: '14px' }}>
                    <div style={{ fontSize: '10px', fontWeight: 700, color: '#8E7A75', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '8px' }}>Nilai Variabel Solusi</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: '8px' }}>
                      {Object.entries(result.variable_values).map(([key, val]) => (
                        <div key={key} style={{
                          background: '#FDF1EC', border: '1px solid #E3A38F',
                          borderRadius: '8px', padding: '8px 10px',
                          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px',
                        }}>
                          <span style={{ fontSize: '12px', fontWeight: 700, color: '#3E2723' }}>{varLabel(key)}</span>
                          <span style={{ fontSize: '14px', fontWeight: 900, color: '#CC6F57' }}>{parseFloat(val).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Penjelasan */}
                <div style={{
                  marginTop: '14px', padding: '12px', background: '#FAF9F6',
                  border: '1px solid rgba(62,39,35,0.06)', borderRadius: '8px',
                }}>
                  <div style={{ fontSize: '10px', fontWeight: 800, color: '#3E2723', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '5px' }}>Penjelasan Singkat</div>
                  <p style={{ fontSize: '12px', color: '#5C4A45', lineHeight: '1.65', fontWeight: 500 }}>
                    {result.status === 'Optimal'
                      ? `Solusi optimal dicapai pada iterasi ke-${result.iterations.filter(it => it.phase === 2).length + result.iterations.filter(it => it.phase === 1).length - 2}. Nilai Z ${result.original_objective === 'maximize' ? 'maksimum' : 'minimum'} adalah ${result.objective_value}, dengan: ${Object.entries(result.variable_values).filter(([k]) => k.startsWith('x')).map(([k, v]) => `${k} = ${parseFloat(v).toFixed(2)}`).join(', ')}.`
                      : result.status === 'Unbounded'
                        ? 'Daerah layak tidak memiliki batas yang mengunci nilai Z, sehingga nilainya dapat bertambah tanpa batas.'
                        : 'Tidak ada irisan daerah layak yang memenuhi seluruh kendala secara bersamaan. Solusi layak tidak ditemukan.'}
                  </p>
                </div>
              </Card>

              {/* TABEL ITERASI */}
              {result.iterations?.length > 0 && (
                <Card>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', marginBottom: '14px' }}>
                    <SectionTitle>Tabel Iterasi</SectionTitle>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <button
                        onClick={() => setCurrentStep(p => Math.max(0, p - 1))}
                        disabled={currentStep === 0}
                        style={{
                          background: '#fff', border: '1px solid #E3A38F', borderRadius: '7px',
                          padding: '6px 8px', cursor: 'pointer', opacity: currentStep === 0 ? 0.3 : 1,
                          display: 'flex', alignItems: 'center',
                        }}
                      ><ArrowLeft size={14} color="#CC6F57" /></button>
                      <span style={{
                        fontSize: '12px', fontWeight: 700, color: '#CC6F57',
                        background: '#FDF1EC', border: '1px solid #E3A38F',
                        padding: '5px 12px', borderRadius: '7px',
                      }}>Langkah {currentStep + 1} / {result.iterations.length}</span>
                      <button
                        onClick={() => setCurrentStep(p => Math.min(result.iterations.length - 1, p + 1))}
                        disabled={currentStep === result.iterations.length - 1}
                        style={{
                          background: '#fff', border: '1px solid #E3A38F', borderRadius: '7px',
                          padding: '6px 8px', cursor: 'pointer', opacity: currentStep === result.iterations.length - 1 ? 0.3 : 1,
                          display: 'flex', alignItems: 'center',
                        }}
                      ><ArrowRight size={14} color="#CC6F57" /></button>
                    </div>
                  </div>

                  {/* Step description */}
                  <div style={{
                    padding: '10px 12px', background: 'rgba(253,241,236,0.4)',
                    borderLeft: '3px solid #CC6F57', borderRadius: '0 6px 6px 0',
                    fontSize: '11px', color: '#5C4A45', lineHeight: '1.6',
                    fontWeight: 500, marginBottom: '14px',
                  }}>
                    <strong style={{ color: '#CC6F57' }}>Detail: </strong>
                    {result.iterations[currentStep].description}
                  </div>

                  {/* Table - horizontal scroll on small screens */}
                  <div style={{ overflowX: 'auto', borderRadius: '8px', border: '1px solid #F3D7CD' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'center', minWidth: '360px' }}>
                      <thead>
                        <tr>
                          <th style={{ background: '#F3D7CD', color: '#3E2723', fontWeight: 700, padding: '10px 12px', textAlign: 'left', borderBottom: '1.5px solid #E3A38F' }}>Basis</th>
                          {result.iterations[currentStep].headers.map((h, i) => {
                            const isPivotCol = result.iterations[currentStep].pivot_col === i;
                            return (
                              <th key={i} style={{
                                background: isPivotCol ? '#FCF4F0' : '#F3D7CD',
                                color: isPivotCol ? '#CC6F57' : '#3E2723',
                                fontWeight: 700, padding: '10px 12px',
                                borderBottom: '1.5px solid #E3A38F',
                              }}>
                                {h === 'RHS' ? 'RHS' : <span>{h[0]}<sub>{h.substring(1)}</sub></span>}
                              </th>
                            );
                          })}
                        </tr>
                      </thead>
                      <tbody>
                        {result.iterations[currentStep].matrix.map((rowObj, rIdx) => {
                          const isPivotRow = result.iterations[currentStep].pivot_row === rIdx;
                          return (
                            <tr key={rIdx} style={{
                              background: isPivotRow ? '#FDF1EC' : rIdx % 2 === 0 ? '#fff' : '#FCFAF8',
                              outline: isPivotRow ? '2px solid #CC6F57' : 'none',
                              outlineOffset: '-1px',
                            }}>
                              <td style={{
                                padding: '9px 12px', fontWeight: 700, color: '#CC6F57',
                                textAlign: 'left', borderRight: '1.5px solid #F3D7CD',
                                background: isPivotRow ? '#FDF1EC' : '#FCFAF8',
                              }}>
                                {rowObj.row_name === 'Z' || rowObj.row_name === '-W'
                                  ? rowObj.row_name
                                  : <span>{rowObj.row_name[0]}<sub>{rowObj.row_name.substring(1)}</sub></span>}
                              </td>
                              {rowObj.values.map((val, cIdx) => {
                                const isPivotCol = result.iterations[currentStep].pivot_col === cIdx;
                                const isPivotEl = isPivotRow && isPivotCol;
                                return (
                                  <td key={cIdx} style={{
                                    padding: '9px 12px',
                                    background: isPivotEl ? '#F3D7CD' : isPivotCol ? '#FCF4F0' : 'inherit',
                                    fontWeight: isPivotEl ? 900 : 500,
                                    color: isPivotEl ? '#B55B44' : '#3E2723',
                                    borderBottom: '1px solid #F3D7CD',
                                  }}>
                                    {val.toFixed(4)}
                                  </td>
                                );
                              })}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </Card>
              )}

              {/* Print */}
              <Card style={{ display: 'flex', justifyContent: 'center', padding: '14px' }}>
                <PrimaryBtn onClick={() => window.print()}>
                  <Printer size={14} /> Cetak / Simpan PDF
                </PrimaryBtn>
              </Card>
            </>
          )}
        </div>

        {/* ════════════════════════════════════════════════════════════════
            KOLOM 3 — VISUALISASI GRAFIK & KOORDINAT
        ════════════════════════════════════════════════════════════════ */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

          {/* Graph panel */}
          <Card>
            <SectionTitle>Grafik Layak (2D)</SectionTitle>
            <div style={{ marginTop: '14px' }}>
              {result && numVars === 2 && result.graph_data ? (
                <div style={{ background: '#fff', borderRadius: '10px', padding: '8px', border: '1px solid rgba(62,39,35,0.05)' }}>
                  <SimplexGraph graphData={result.graph_data} optimalPoint={getOptimalPoint()} />
                </div>
              ) : (
                <div style={{
                  textAlign: 'center', padding: '40px 20px',
                  background: '#FCFAF8', borderRadius: '10px',
                  border: '1px solid rgba(62,39,35,0.05)',
                }}>
                  <BarChart2 size={36} color="#E3A38F" style={{ marginBottom: '12px' }} />
                  <div style={{ fontSize: '12px', fontWeight: 700, color: '#5C4A45', marginBottom: '6px' }}>
                    {result ? `Grafik Tidak Aktif (${numVars} variabel)` : 'Grafik Menunggu Data'}
                  </div>
                  <p style={{ fontSize: '11px', color: '#8E7A75', lineHeight: '1.6', maxWidth: '220px', margin: '0 auto' }}>
                    {result
                      ? `Visualisasi 2D hanya tersedia untuk model dengan tepat 2 variabel keputusan.`
                      : 'Jalankan kalkulasi terlebih dahulu untuk melihat grafik area kelayakan.'}
                  </p>
                </div>
              )}
            </div>
          </Card>

          {/* Feasible Vertices Table */}
          {result && numVars === 2 && result.graph_data?.feasible_polygon?.length > 0 && (
            <Card>
              <SectionTitle>Koordinat Daerah Layak</SectionTitle>
              <div style={{ marginTop: '14px', overflowX: 'auto', borderRadius: '8px', border: '1px solid #F3D7CD' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'center' }}>
                  <thead>
                    <tr style={{ background: '#F3D7CD' }}>
                      <th style={{ padding: '9px 12px', fontWeight: 700, color: '#3E2723', borderBottom: '1.5px solid #E3A38F' }}>Titik</th>
                      <th style={{ padding: '9px 12px', fontWeight: 700, color: '#3E2723', borderBottom: '1.5px solid #E3A38F' }}>x₁</th>
                      <th style={{ padding: '9px 12px', fontWeight: 700, color: '#3E2723', borderBottom: '1.5px solid #E3A38F' }}>x₂</th>
                      <th style={{ padding: '9px 12px', fontWeight: 700, color: '#3E2723', borderBottom: '1.5px solid #E3A38F' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.graph_data.feasible_polygon.map((pt, i) => {
                      const opt = getOptimalPoint();
                      const isOpt = opt && Math.abs(opt.x - pt.x) < 0.001 && Math.abs(opt.y - pt.y) < 0.001;
                      return (
                        <tr key={i} style={{
                          background: isOpt ? '#FDF1EC' : i % 2 === 0 ? '#fff' : '#FCFAF8',
                          outline: isOpt ? '2px solid #CC6F57' : 'none',
                          outlineOffset: '-1px',
                        }}>
                          <td style={{ padding: '8px 12px', fontWeight: 800, color: '#CC6F57', borderBottom: '1px solid #F3D7CD' }}>
                            {String.fromCharCode(65 + i)}
                          </td>
                          <td style={{ padding: '8px 12px', fontWeight: 600, color: '#3E2723', borderBottom: '1px solid #F3D7CD' }}>{pt.x.toFixed(2)}</td>
                          <td style={{ padding: '8px 12px', fontWeight: 600, color: '#3E2723', borderBottom: '1px solid #F3D7CD' }}>{pt.y.toFixed(2)}</td>
                          <td style={{ padding: '8px 12px', borderBottom: '1px solid #F3D7CD' }}>
                            {isOpt ? (
                              <span style={{
                                background: '#FDF1EC', color: '#CC6F57', border: '1px solid #E3A38F',
                                padding: '3px 8px', borderRadius: '5px', fontSize: '10px', fontWeight: 800,
                              }}>Optimal</span>
                            ) : (
                              <span style={{ color: '#8E7A75', fontSize: '11px' }}>Layak</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {/* Guide when no result */}
          {!result && (
            <Card>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <BarChart2 size={15} color="#CC6F57" />
                <span style={{ fontSize: '11px', fontWeight: 800, color: '#CC6F57', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Panduan Grafik</span>
              </div>
              <p style={{ fontSize: '12px', color: '#8E7A75', lineHeight: '1.7', marginBottom: '12px' }}>
                Grafik daerah kelayakan (feasible region) akan muncul secara otomatis saat Anda menggunakan <strong>tepat 2 variabel keputusan</strong>.
              </p>
              <div style={{ padding: '10px 12px', background: '#FCFAF8', borderRadius: '8px', border: '1px solid rgba(62,39,35,0.05)', fontSize: '11px', color: '#5C4A45', lineHeight: '1.6' }}>
                <strong style={{ color: '#CC6F57', display: 'block', marginBottom: '4px' }}>Cara Kerja:</strong>
                Setiap fungsi kendala digambar sebagai garis batas. Irisan daerah pertidaksamaan membentuk polygon area layak yang diarsir. Titik optimal berada di salah satu sudut polygon.
              </div>
            </Card>
          )}
        </div>

      </main>

      {/* spin animation */}
      <style>{`@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>
    </div>
  );
}
