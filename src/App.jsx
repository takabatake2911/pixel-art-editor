import {
  useState,
  useRef,
  useEffect,
  useCallback,
  useReducer,
  useMemo,
  memo,
} from "react";
import {
  Tooltip,
  IconButton,
  Slider,
  Typography,
  Divider,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Chip,
  Stack,
  Tabs,
  Tab,
  Box,
  Paper,
} from "@mui/material";
import { createTheme, ThemeProvider, alpha } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import UndoIcon from "@mui/icons-material/Undo";
import RedoIcon from "@mui/icons-material/Redo";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import GridOnIcon from "@mui/icons-material/GridOn";
import GridOffIcon from "@mui/icons-material/GridOff";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import FileUploadIcon from "@mui/icons-material/FileUpload";
import AspectRatioIcon from "@mui/icons-material/AspectRatio";
import AddIcon from "@mui/icons-material/Add";
import RemoveIcon from "@mui/icons-material/Remove";
import EditIcon from "@mui/icons-material/Edit";
import FormatColorFillIcon from "@mui/icons-material/FormatColorFill";
import CropFreeIcon from "@mui/icons-material/CropFree";
import HorizontalRuleIcon from "@mui/icons-material/HorizontalRule";
import RadioButtonUncheckedIcon from "@mui/icons-material/RadioButtonUnchecked";
import CircleIcon from "@mui/icons-material/Circle";
import RectangleIcon from "@mui/icons-material/Rectangle";
import ColorizeIcon from "@mui/icons-material/Colorize";
import SelectAllIcon from "@mui/icons-material/SelectAll";
import FlipIcon from "@mui/icons-material/Flip";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import LockIcon from "@mui/icons-material/Lock";
import LockOpenIcon from "@mui/icons-material/LockOpen";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import ContentCutIcon from "@mui/icons-material/ContentCut";
import DragIndicatorIcon from "@mui/icons-material/DragIndicator";
import LayersIcon from "@mui/icons-material/Layers";
import PaletteIcon from "@mui/icons-material/Palette";
import MapIcon from "@mui/icons-material/Map";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import KeyboardDoubleArrowDownIcon from "@mui/icons-material/KeyboardDoubleArrowDown";
import { Crop75Outlined } from "@mui/icons-material";

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 1 — Constants & Theme
// ─────────────────────────────────────────────────────────────────────────────

const T = {
  PEN: "pen",
  ERASER: "eraser",
  LINE: "line",
  RECT: "rect",
  RECTF: "rect_fill",
  CIRCLE: "circle",
  CIRCLEF: "circle_fill",
  FILL: "fill",
  PICK: "eyedropper",
  SEL: "select",
};
const SHAPE_TOOLS = [T.LINE, T.RECT, T.RECTF, T.CIRCLE, T.CIRCLEF];
const TOOL_KEYS = {
  p: T.PEN,
  e: T.ERASER,
  f: T.FILL,
  i: T.PICK,
  s: T.SEL,
  l: T.LINE,
  r: T.RECT,
  c: T.CIRCLE,
};
const DW = 32,
  DH = 32,
  MAXZ = 40,
  MINZ = 1,
  MINIMAX = 120;
const PAL = [
  "#000000", // 黒
  "#FFFFFF", // 白
  "#888888", // グレー
  "#F2ACB2", // イラスト-1 ピンク
  "#346173", // イラスト-2 ダークブルー
  "#F2C641", // イラスト-3 イエロー
  "#F2B33D", // イラスト-4 オレンジ
  "#F2E9D8", // イラスト-5 クリーム
  "#A3D2CA", // ミント
  "#FF9F80", // コーラル
  "#6D597A", // モーブパープル
  "#FFE156", // パステルイエロー
  "#6B4226", // ブラウン系
  "#5D5C61", // ダークグレー
  "#C7F9CC", // パステルグリーン
  "#FF6B6B", // レッドアクセント
];

const SHORTCUTS = [
  ["Ctrl+Z", "Undo"],
  ["Ctrl+Y", "Redo"],
  ["Ctrl+A", "Select All"],
  ["Ctrl+C/X/V", "Copy/Cut/Paste"],
  ["Del", "Delete sel"],
  ["Enter", "Confirm paste"],
  ["Shift+drag", "Constrain shape"],
  ["Right click", "Erase"],
  ["P/E/F/I/S", "Tool hotkeys"],
  ["[ / ]", "Brush size"],
  ["Ctrl+Scroll", "Zoom"],
  ["Esc", "Deselect"],
];

const theme = createTheme({
  palette: {
    mode: "dark",
    primary: { main: "#7c4dff" },
    secondary: { main: "#00e5ff" },
    background: { default: "#0d0d1a", paper: "#161625" },
    divider: "rgba(255,255,255,0.07)",
  },
  typography: { fontFamily: "'Inter','Roboto',sans-serif" },
  shape: { borderRadius: 8 },
  components: {
    MuiButton: { defaultProps: { disableElevation: true } },
    MuiTooltip: { defaultProps: { arrow: true } },
    MuiSlider: { styleOverrides: { root: { padding: "10px 0" } } },
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 2 — Pure pixel-math utilities  (no React, fully testable)
// ─────────────────────────────────────────────────────────────────────────────

const mkGrid = (w, h) => Array.from({ length: h }, () => Array(w).fill(null));
const clone = (g) => g.map((r) => [...r]);

function linePx(x0, y0, x1, y1) {
  const pts = [];
  let dx = Math.abs(x1 - x0),
    dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1,
    sy = y0 < y1 ? 1 : -1;
  let e = dx - dy,
    x = x0,
    y = y0;
  for (;;) {
    pts.push([x, y]);
    if (x === x1 && y === y1) break;
    const e2 = 2 * e;
    if (e2 > -dy) {
      e -= dy;
      x += sx;
    }
    if (e2 < dx) {
      e += dx;
      y += sy;
    }
  }
  return pts;
}
function rectOPx(x0, y0, x1, y1) {
  const p = [],
    mnX = Math.min(x0, x1),
    mxX = Math.max(x0, x1),
    mnY = Math.min(y0, y1),
    mxY = Math.max(y0, y1);
  for (let x = mnX; x <= mxX; x++) {
    p.push([x, mnY]);
    if (mnY !== mxY) p.push([x, mxY]);
  }
  for (let y = mnY + 1; y < mxY; y++) {
    p.push([mnX, y]);
    if (mnX !== mxX) p.push([mxX, y]);
  }
  return p;
}
function rectFPx(x0, y0, x1, y1) {
  const p = [],
    mnX = Math.min(x0, x1),
    mxX = Math.max(x0, x1),
    mnY = Math.min(y0, y1),
    mxY = Math.max(y0, y1);
  for (let y = mnY; y <= mxY; y++)
    for (let x = mnX; x <= mxX; x++) p.push([x, y]);
  return p;
}
function circOPx(x0, y0, x1, y1) {
  const cx = (x0 + x1) / 2,
    cy = (y0 + y1) / 2,
    rx = Math.abs(x1 - x0) / 2,
    ry = Math.abs(y1 - y0) / 2;
  const steps = Math.ceil(Math.max(rx, ry) * 8) || 1,
    seen = new Set(),
    p = [];
  for (let i = 0; i <= steps; i++) {
    const a = (i / steps) * 2 * Math.PI,
      x = Math.round(cx + rx * Math.cos(a)),
      y = Math.round(cy + ry * Math.sin(a)),
      k = `${x},${y}`;
    if (!seen.has(k)) {
      seen.add(k);
      p.push([x, y]);
    }
  }
  return p;
}
function circFPx(x0, y0, x1, y1) {
  const cx = (x0 + x1) / 2,
    cy = (y0 + y1) / 2,
    rx = Math.abs(x1 - x0) / 2,
    ry = Math.abs(y1 - y0) / 2;
  if (!rx && !ry) return [[Math.round(cx), Math.round(cy)]];
  const p = [];
  for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++)
    for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
      const nx = rx ? (x - cx) / rx : 0,
        ny = ry ? (y - cy) / ry : 0;
      if (nx * nx + ny * ny <= 1) p.push([x, y]);
    }
  return p;
}
function floodFill(grid, sx, sy, col, w, h) {
  const tgt = grid[sy]?.[sx] ?? null;
  if (tgt === col) return grid;
  const g = clone(grid),
    st = [[sx, sy]];
  while (st.length) {
    const [x, y] = st.pop();
    if (x < 0 || x >= w || y < 0 || y >= h || g[y][x] !== tgt) continue;
    g[y][x] = col;
    st.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
  }
  return g;
}
function shapePx(tool, x0, y0, x1, y1) {
  if (tool === T.LINE) return linePx(x0, y0, x1, y1);
  if (tool === T.RECT) return rectOPx(x0, y0, x1, y1);
  if (tool === T.RECTF) return rectFPx(x0, y0, x1, y1);
  if (tool === T.CIRCLE) return circOPx(x0, y0, x1, y1);
  if (tool === T.CIRCLEF) return circFPx(x0, y0, x1, y1);
  return [];
}
function constrainEndpoint(tool, x0, y0, x1, y1) {
  const dx = x1 - x0,
    dy = y1 - y0,
    adx = Math.abs(dx),
    ady = Math.abs(dy);
  if (tool === T.LINE) {
    if (adx > ady * 2) return [x1, y0];
    if (ady > adx * 2) return [x0, y1];
    const d = Math.min(adx, ady);
    return [x0 + (dx >= 0 ? d : -d), y0 + (dy >= 0 ? d : -d)];
  }
  const d = Math.min(adx, ady);
  return [x0 + (dx >= 0 ? d : -d), y0 + (dy >= 0 ? d : -d)];
}
function brushOff(sz, shape) {
  if (sz === 1) return [[0, 0]];
  const r = Math.floor(sz / 2),
    o = [];
  for (let dy = -r; dy <= r; dy++)
    for (let dx = -r; dx <= r; dx++) {
      if (shape === "circle" && dx * dx + dy * dy > r * r + 0.5) continue;
      o.push([dx, dy]);
    }
  return o;
}
function applyBrush(g, cx, cy, col, sz, shape, w, h) {
  const n = clone(g);
  for (const [dx, dy] of brushOff(sz, shape)) {
    const x = cx + dx,
      y = cy + dy;
    if (x >= 0 && x < w && y >= 0 && y < h) n[y][x] = col;
  }
  return n;
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 3 — Layer factory & history reducer  (pure functions)
// ─────────────────────────────────────────────────────────────────────────────

let _lid = 0;
const mkLayer = (w, h, name) => ({
  id: ++_lid,
  name: name || `Layer ${_lid}`,
  grid: mkGrid(w, h),
  visible: true,
  opacity: 1,
  locked: false,
});

function histReducer(s, a) {
  switch (a.type) {
    case "PUSH":
      return {
        past: [...s.past.slice(-99), s.present],
        present: a.v,
        future: [],
      };
    case "LIVE":
      return { ...s, present: a.v };
    case "UNDO":
      if (!s.past.length) return s;
      {
        const p = [...s.past],
          pres = p.pop();
        return { past: p, present: pres, future: [s.present, ...s.future] };
      }
    case "REDO":
      if (!s.future.length) return s;
      {
        const [pres, ...fut] = s.future;
        return { past: [...s.past, s.present], present: pres, future: fut };
      }
    case "RESET":
      return { past: [], present: a.v, future: [] };
    default:
      return s;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 4 — Shared primitive hooks
// ─────────────────────────────────────────────────────────────────────────────

// useTracked: mirrors a state value into a ref so event-handler closures that
// were set up once (useCallback / RAF loop) can read the latest value without
// being re-created on every render.
function useTracked(val) {
  const r = useRef(val);
  useEffect(() => {
    r.current = val;
  }, [val]);
  return r;
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 5 — useEditorState hook
// Owns every piece of application state and the operations that mutate it.
// Returns a single "store" object consumed by child components and hooks.
// ─────────────────────────────────────────────────────────────────────────────

function useEditorState() {
  // Canvas dimensions
  const [gW, setGW] = useState(DW);
  const [gH, setGH] = useState(DH);

  // Layer history
  const init = useMemo(() => {
    _lid = 0;
    return mkLayer(DW, DH, "Background");
  }, []);
  const [hist, dispatch] = useReducer(histReducer, {
    past: [],
    present: [init],
    future: [],
  });
  const layers = hist.present;
  const [ai, setAi] = useState(0); // active layer index
  const AL = layers[Math.min(ai, layers.length - 1)] ?? layers[0]; // active layer object

  // Tools & view
  const [color, setColor] = useState("#000000");
  const [tool, setTool] = useState(T.PEN);
  const [zoom, setZoom] = useState(16);
  const [custom, setCustom] = useState([]);
  const [showGrid, setShowGrid] = useState(true);
  const [brushSz, setBrushSz] = useState(1);
  const [brushSh, setBrushSh] = useState("square");

  // Drawing stroke state
  const [drawing, setDrawing] = useState(false);
  const [sc, setSc] = useState(null); // stroke start cell [x,y]
  const [preview, setPreview] = useState([]); // shape preview pixels

  // Selection & float-layer state
  const [sel, setSel] = useState(null);
  const [selDrg, setSelDrg] = useState(false);
  const [selSt, setSelSt] = useState(null);
  const [clip, setClip] = useState(null);
  const [selMov, setSelMov] = useState(false);
  const [selMovSt, setSelMovSt] = useState(null);
  const [pixDrg, setPixDrg] = useState(false);
  const [pixDrgSt, setPixDrgSt] = useState(null);
  const [floatPx, setFloatPx] = useState(null); // [{dx,dy,col}]
  const [baseGrid, setBaseGrid] = useState(null);
  const [isPaste, setIsPaste] = useState(false);

  // Cursor position & color history
  const [cur, setCur] = useState(null);
  const [colorHist, setColorHist] = useState([]);
  const recordColor = useCallback(
    (c) => setColorHist((h) => [c, ...h.filter((x) => x !== c)].slice(0, 16)),
    [],
  );

  // Dialog open/close
  const [resizeOpen, setResizeOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [sizeInp, setSizeInp] = useState({ w: DW, h: DH });

  // Layer panel drag state
  const [drgLay, setDrgLay] = useState(null);
  const [drgOver, setDrgOver] = useState(null);

  // Derived dispatch shortcuts
  const push = useCallback((v) => dispatch({ type: "PUSH", v }), []);
  const live = useCallback((v) => dispatch({ type: "LIVE", v }), []);
  const undo = useCallback(() => dispatch({ type: "UNDO" }), []);
  const redo = useCallback(() => dispatch({ type: "REDO" }), []);
  const canUndo = hist.past.length > 0;
  const canRedo = hist.future.length > 0;

  // ── Layer operations ──────────────────────────────────────────────────────
  const addLayer = () => {
    const l = mkLayer(gW, gH);
    push([l, ...layers]);
    setAi(0);
  };
  const delLayer = () => {
    if (layers.length <= 1) return;
    const n = layers.filter((_, i) => i !== ai);
    push(n);
    setAi(Math.min(ai, n.length - 1));
  };
  const upLayer = (i, p) =>
    push(layers.map((l, j) => (j === i ? { ...l, ...p } : l)));
  const dupLayer = () => {
    const src = layers[ai];
    const dup = {
      ...src,
      id: ++_lid,
      name: src.name + " copy",
      grid: src.grid.map((r) => [...r]),
    };
    const n = [...layers];
    n.splice(ai, 0, dup);
    push(n);
  };
  const mergeDown = () => {
    if (ai >= layers.length - 1) return;
    const top = layers[ai],
      bot = layers[ai + 1];
    const g = bot.grid.map((r) => [...r]);
    if (top.visible && top.opacity > 0)
      for (let y = 0; y < gH; y++)
        for (let x = 0; x < gW; x++)
          if (top.grid[y][x]) g[y][x] = top.grid[y][x];
    const n = [...layers];
    n.splice(ai, 2, { ...bot, grid: g });
    push(n);
    setAi(Math.min(ai, n.length - 1));
  };
  const movLayUp = () => {
    if (ai === 0) return;
    const n = [...layers];
    [n[ai - 1], n[ai]] = [n[ai], n[ai - 1]];
    push(n);
    setAi(ai - 1);
  };
  const movLayDn = () => {
    if (ai >= layers.length - 1) return;
    const n = [...layers];
    [n[ai + 1], n[ai]] = [n[ai], n[ai + 1]];
    push(n);
    setAi(ai + 1);
  };
  const onLDrgStart = (i) => setDrgLay(i);
  const onLDrgOver = (e, i) => {
    e.preventDefault();
    setDrgOver(i);
  };
  const onLDrop = (e, i) => {
    e.preventDefault();
    if (drgLay === null || drgLay === i) {
      setDrgLay(null);
      setDrgOver(null);
      return;
    }
    const n = [...layers];
    const [m] = n.splice(drgLay, 1);
    n.splice(i, 0, m);
    push(n);
    const na = n.indexOf(layers[ai]);
    setAi(na >= 0 ? na : 0);
    setDrgLay(null);
    setDrgOver(null);
  };

  // ── Float / paste operations ──────────────────────────────────────────────
  const commitFloat = useCallback(
    (finalSel) => {
      const fp = floatPxRef.current,
        bg = baseGridRef.current;
      if (!fp || !bg) return;
      const ls = layersRef.current,
        idx = aiRef.current,
        W = gWRef.current,
        H = gHRef.current;
      const fsr = finalSel ?? selRef.current;
      let g = clone(bg);
      for (const { dx, dy, col } of fp) {
        const px = fsr ? fsr.x + dx : dx,
          py = fsr ? fsr.y + dy : dy;
        if (px >= 0 && px < W && py >= 0 && py < H) g[py][px] = col;
      }
      push(ls.map((l, i) => (i === idx ? { ...l, grid: g } : l)));
      setFloatPx(null);
      setBaseGrid(null);
      setIsPaste(false);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    },
    [push],
  );
  const discardPaste = useCallback(() => {
    setFloatPx(null);
    setBaseGrid(null);
    setIsPaste(false);
    setSel(null);
  }, []);

  // ── Selection operations ──────────────────────────────────────────────────
  const selCopy = useCallback(() => {
    const sr = selRef.current;
    if (!sr) return;
    const ls = layersRef.current,
      W = gWRef.current,
      H = gHRef.current;
    const merged = mkGrid(sr.w, sr.h);
    for (let li = 0; li < ls.length; li++) {
      const { grid, visible, opacity } = ls[li];
      if (!visible || !opacity) continue;
      for (let dy = 0; dy < sr.h; dy++)
        for (let dx = 0; dx < sr.w; dx++) {
          if (merged[dy][dx]) continue;
          const px = sr.x + dx,
            py = sr.y + dy;
          if (px >= 0 && px < W && py >= 0 && py < H && grid[py][px])
            merged[dy][dx] = grid[py][px];
        }
    }
    const pixels = [];
    for (let dy = 0; dy < sr.h; dy++)
      for (let dx = 0; dx < sr.w; dx++)
        if (merged[dy][dx]) pixels.push([dx, dy, merged[dy][dx]]);
    setClip({ pixels, w: sr.w, h: sr.h });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const selCut = useCallback(() => {
    const sr = selRef.current;
    if (!sr) return;
    selCopy();
    const ls = layersRef.current,
      idx = aiRef.current,
      W = gWRef.current,
      H = gHRef.current;
    const g = clone(ls[idx].grid);
    for (let dy = 0; dy < sr.h; dy++)
      for (let dx = 0; dx < sr.w; dx++) {
        const px = sr.x + dx,
          py = sr.y + dy;
        if (px >= 0 && px < W && py >= 0 && py < H) g[py][px] = null;
      }
    push(ls.map((l, i) => (i === idx ? { ...l, grid: g } : l)));
    setSel(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selCopy, push]);
  const selDel = useCallback(() => {
    const sr = selRef.current;
    if (!sr) return;
    const ls = layersRef.current,
      idx = aiRef.current,
      W = gWRef.current,
      H = gHRef.current;
    const g = clone(ls[idx].grid);
    for (let dy = 0; dy < sr.h; dy++)
      for (let dx = 0; dx < sr.w; dx++) {
        const px = sr.x + dx,
          py = sr.y + dy;
        if (px >= 0 && px < W && py >= 0 && py < H) g[py][px] = null;
      }
    push(ls.map((l, i) => (i === idx ? { ...l, grid: g } : l)));
    setSel(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [push]);
  const selAll = useCallback(() => {
    setSel({ x: 0, y: 0, w: gWRef.current, h: gHRef.current });
    setTool(T.SEL);
  }, []);

  // selPaste reads clip via closure — must be in deps
  const selPaste = useCallback(
    (c) => {
      if (!c) return;
      if (floatPxRef.current) commitFloat();
      const ls = layersRef.current,
        idx = aiRef.current,
        sr = selRef.current,
        W = gWRef.current,
        H = gHRef.current;
      const ox = sr ? sr.x : Math.max(0, Math.floor((W - c.w) / 2));
      const oy = sr ? sr.y : Math.max(0, Math.floor((H - c.h) / 2));
      setBaseGrid(clone(ls[idx].grid));
      setFloatPx(c.pixels.map(([dx, dy, col]) => ({ dx, dy, col })));
      setIsPaste(true);
      setSel({ x: ox, y: oy, w: c.w, h: c.h });
      setTool(T.SEL);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    },
    [commitFloat],
  );

  // ── Flip ──────────────────────────────────────────────────────────────────
  const flip = useCallback(
    (dir) => {
      const ls = layersRef.current,
        idx = aiRef.current,
        W = gWRef.current,
        H = gHRef.current,
        { grid } = ls[idx];
      const g = mkGrid(W, H);
      for (let y = 0; y < H; y++)
        for (let x = 0; x < W; x++)
          g[dir === "v" ? H - 1 - y : y][dir === "h" ? W - 1 - x : x] =
            grid[y][x];
      push(ls.map((l, i) => (i === idx ? { ...l, grid: g } : l)));
      // eslint-disable-next-line react-hooks/exhaustive-deps
    },
    [push],
  );

  // ── Import / Export ───────────────────────────────────────────────────────
  const importImg = useCallback(
    (file) => {
      if (!file) return;
      const img = new Image();
      img.onload = () => {
        const W = gWRef.current,
          H = gHRef.current;
        const tc = document.createElement("canvas");
        tc.width = W;
        tc.height = H;
        const ctx = tc.getContext("2d");
        ctx.drawImage(img, 0, 0, W, H);
        const d = ctx.getImageData(0, 0, W, H),
          g = mkGrid(W, H);
        for (let y = 0; y < H; y++)
          for (let x = 0; x < W; x++) {
            const i = (y * W + x) * 4;
            const [r, gv, b, a] = [
              d.data[i],
              d.data[i + 1],
              d.data[i + 2],
              d.data[i + 3],
            ];
            if (a > 10)
              g[y][x] = `rgba(${r},${gv},${b},${(a / 255).toFixed(2)})`;
          }
        const ls = layersRef.current,
          idx = aiRef.current;
        push(ls.map((l, i) => (i === idx ? { ...l, grid: g } : l)));
      };
      img.src = URL.createObjectURL(file);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    },
    [push],
  );

  const exportImg = useCallback((fmt, scale = 1) => {
    const W = gWRef.current,
      H = gHRef.current,
      S = Math.max(1, Math.round(scale));
    const tc = document.createElement("canvas");
    tc.width = W * S;
    tc.height = H * S;
    const ctx = tc.getContext("2d");
    ctx.imageSmoothingEnabled = false;
    if (fmt === "jpg") {
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, W * S, H * S);
    }
    const ls = layersRef.current;
    for (let li = ls.length - 1; li >= 0; li--) {
      const { grid, visible, opacity } = ls[li];
      if (!visible) continue;
      ctx.globalAlpha = opacity;
      for (let y = 0; y < H; y++)
        for (let x = 0; x < W; x++)
          if (grid[y][x]) {
            ctx.fillStyle = grid[y][x];
            ctx.fillRect(x * S, y * S, S, S);
          }
    }
    ctx.globalAlpha = 1;
    const a = document.createElement("a");
    a.download = `pixel-art${S > 1 ? `@${S}x` : ""}.${fmt}`;
    a.href = tc.toDataURL(fmt === "png" ? "image/png" : "image/jpeg", 0.95);
    a.click();
    setExportOpen(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const resizeApply = (w, h) => {
    push(
      layers.map((l) => {
        const g = mkGrid(w, h);
        for (let y = 0; y < Math.min(h, gH); y++)
          for (let x = 0; x < Math.min(w, gW); x++) g[y][x] = l.grid[y][x];
        return { ...l, grid: g };
      }),
    );
    setGW(w);
    setGH(h);
    setResizeOpen(false);
  };
  const clearLay = () =>
    push(layers.map((l, i) => (i === ai ? { ...l, grid: mkGrid(gW, gH) } : l)));

  // ── Tracked refs (all state values mirrored for closure-free handlers) ────
  const gWRef = useTracked(gW);
  const gHRef = useTracked(gH);
  const zoomRef = useTracked(zoom);
  const drawingRef = useTracked(drawing);
  const scRef = useTracked(sc);
  const toolRef = useTracked(tool);
  const colorRef = useTracked(color);
  const bSzRef = useTracked(brushSz);
  const bShRef = useTracked(brushSh);
  const aiRef = useTracked(ai);
  const layersRef = useTracked(layers);
  const selRef = useTracked(sel);
  const selDrgRef = useTracked(selDrg);
  const selStRef = useTracked(selSt);
  const selMovRef = useTracked(selMov);
  const selMovStRef = useTracked(selMovSt);
  const pixDrgRef = useTracked(pixDrg);
  const pixDrgStRef = useTracked(pixDrgSt);
  const floatPxRef = useTracked(floatPx);
  const baseGridRef = useTracked(baseGrid);
  const isPasteRef = useTracked(isPaste);

  return {
    // dimensions
    gW,
    gH,
    setGW,
    setGH,
    // history
    hist,
    dispatch,
    layers,
    ai,
    setAi,
    AL,
    canUndo,
    canRedo,
    undo,
    redo,
    push,
    live,
    // tools
    color,
    setColor,
    tool,
    setTool,
    zoom,
    setZoom,
    custom,
    setCustom,
    showGrid,
    setShowGrid,
    brushSz,
    setBrushSz,
    brushSh,
    setBrushSh,
    // drawing
    drawing,
    setDrawing,
    sc,
    setSc,
    preview,
    setPreview,
    // selection & float
    sel,
    setSel,
    selDrg,
    setSelDrg,
    selSt,
    setSelSt,
    clip,
    setClip,
    selMov,
    setSelMov,
    selMovSt,
    setSelMovSt,
    pixDrg,
    setPixDrg,
    pixDrgSt,
    setPixDrgSt,
    floatPx,
    setFloatPx,
    baseGrid,
    setBaseGrid,
    isPaste,
    setIsPaste,
    // cursor & color history
    cur,
    setCur,
    colorHist,
    recordColor,
    // dialogs
    resizeOpen,
    setResizeOpen,
    exportOpen,
    setExportOpen,
    sizeInp,
    setSizeInp,
    // layer panel drag
    drgLay,
    drgOver,
    onLDrgStart,
    onLDrgOver,
    onLDrop,
    // operations
    addLayer,
    delLayer,
    upLayer,
    dupLayer,
    mergeDown,
    movLayUp,
    movLayDn,
    commitFloat,
    discardPaste,
    selCopy,
    selCut,
    selDel,
    selAll,
    selPaste,
    flip,
    importImg,
    exportImg,
    resizeApply,
    clearLay,
    // tracked refs (needed by interaction hook & canvas hook)
    gWRef,
    gHRef,
    zoomRef,
    drawingRef,
    scRef,
    toolRef,
    colorRef,
    bSzRef,
    bShRef,
    aiRef,
    layersRef,
    selRef,
    selDrgRef,
    selStRef,
    selMovRef,
    selMovStRef,
    pixDrgRef,
    pixDrgStRef,
    floatPxRef,
    baseGridRef,
    isPasteRef,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 6 — useCanvasInteraction hook
// Owns all mouse event handlers and the canvas/overlay render loops.
// Receives the store from useEditorState and a set of canvas refs.
// ─────────────────────────────────────────────────────────────────────────────

function useCanvasInteraction(store, canvasRef, overlayRef, containerRef) {
  const {
    gW,
    gH,
    zoom,
    setZoom,
    layers,
    push,
    live,
    tool,
    color,
    brushSz,
    brushSh,
    setDrawing,
    setSc,
    preview,
    setPreview,
    sel,
    setSel,
    setSelDrg,
    setSelSt,
    selMov,
    setSelMov,
    setSelMovSt,
    pixDrg,
    setPixDrg,
    setPixDrgSt,
    floatPx,
    setFloatPx,
    setBaseGrid,
    isPaste,
    setIsPaste,
    setCur,
    recordColor,
    commitFloat,
    gWRef,
    gHRef,
    zoomRef,
    drawingRef,
    scRef,
    toolRef,
    colorRef,
    bSzRef,
    bShRef,
    aiRef,
    layersRef,
    selRef,
    selDrgRef,
    selStRef,
    selMovRef,
    selMovStRef,
    pixDrgRef,
    pixDrgStRef,
    floatPxRef,
    isPasteRef,
  } = store;

  // RAF-readable refs that don't need to come from store
  const curRef = useRef(null);
  const shiftRef = useRef(false);
  const bszAnim = useRef(brushSz);
  const bshAnim = useRef(brushSh);
  useEffect(() => {
    bszAnim.current = brushSz;
  }, [brushSz]);
  useEffect(() => {
    bshAnim.current = brushSh;
  }, [brushSh]);

  const animRef = useRef(null);
  const dashOff = useRef(0);
  const pending = useRef(null);

  // ── getCursor: canvas cursor style ───────────────────────────────────────
  const cursor =
    tool === T.PICK
      ? "crosshair"
      : tool === T.SEL && (pixDrg || selMov)
        ? "grabbing"
        : tool === T.SEL && sel
          ? "grab"
          : tool === T.SEL
            ? "cell"
            : tool === T.PEN || tool === T.ERASER
              ? "none"
              : "crosshair";

  // ── getCell: pixel coordinates from mouse event ───────────────────────────
  const getCell = useCallback(
    (cx, cy) => {
      const c = canvasRef.current;
      if (!c) return [0, 0];
      const r = c.getBoundingClientRect();
      return [
        Math.floor((cx - r.left) / zoomRef.current),
        Math.floor((cy - r.top) / zoomRef.current),
      ];
    },
    [canvasRef, zoomRef],
  );

  // ── Main canvas render ────────────────────────────────────────────────────
  const drawMain = useCallback(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d"),
      W = gW * zoom,
      H = gH * zoom;
    if (c.width !== W || c.height !== H) {
      c.width = W;
      c.height = H;
    }
    // Transparent background (checkerboard or solid)
    if (true) {
      // showGrid controls this via layers render, bg always drawn
      for (let y = 0; y < gH; y++)
        for (let x = 0; x < gW; x++) {
          ctx.fillStyle = (x + y) % 2 === 0 ? "#d0d0d0" : "#b8b8b8";
          ctx.fillRect(x * zoom, y * zoom, zoom, zoom);
        }
    }
    // Layers bottom→top
    for (let li = layers.length - 1; li >= 0; li--) {
      const { grid, visible, opacity } = layers[li];
      if (!visible || !opacity) continue;
      ctx.globalAlpha = opacity;
      for (let y = 0; y < gH; y++)
        for (let x = 0; x < gW; x++)
          if (grid[y][x]) {
            ctx.fillStyle = grid[y][x];
            ctx.fillRect(x * zoom, y * zoom, zoom, zoom);
          }
    }
    ctx.globalAlpha = 1;
    // Float pixels (paste / move)
    if (floatPx && sel) {
      for (const { dx, dy, col } of floatPx) {
        const px = sel.x + dx,
          py = sel.y + dy;
        if (px >= 0 && px < gW && py >= 0 && py < gH) {
          ctx.fillStyle = col + (isPaste ? "ee" : "cc");
          ctx.fillRect(px * zoom, py * zoom, zoom, zoom);
        }
      }
    }
    // Shape preview
    const pc = tool === T.ERASER ? null : color;
    for (const [px, py] of preview) {
      if (px < 0 || px >= gW || py < 0 || py >= gH) continue;
      if (pc) {
        ctx.fillStyle = pc + "bb";
        ctx.fillRect(px * zoom, py * zoom, zoom, zoom);
      } else {
        ctx.fillStyle = (px + py) % 2 === 0 ? "#d0d0d0" : "#b8b8b8";
        ctx.fillRect(px * zoom, py * zoom, zoom, zoom);
      }
    }
    // Grid lines
    if (zoom >= 3) {
      ctx.globalAlpha = 0.1;
      ctx.strokeStyle = "#000";
      ctx.lineWidth = 0.5;
      for (let x = 0; x <= gW; x++) {
        ctx.beginPath();
        ctx.moveTo(x * zoom, 0);
        ctx.lineTo(x * zoom, H);
        ctx.stroke();
      }
      for (let y = 0; y <= gH; y++) {
        ctx.beginPath();
        ctx.moveTo(0, y * zoom);
        ctx.lineTo(W, y * zoom);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }
  }, [
    canvasRef,
    layers,
    preview,
    zoom,
    color,
    tool,
    gW,
    gH,
    floatPx,
    sel,
    isPaste,
  ]);
  useEffect(() => {
    drawMain();
  }, [drawMain]);

  // Overlay size sync
  useEffect(() => {
    const ov = overlayRef.current;
    if (!ov) return;
    const W = gW * zoom,
      H = gH * zoom;
    if (ov.width !== W || ov.height !== H) {
      ov.width = W;
      ov.height = H;
    }
  }, [overlayRef, gW, gH, zoom]);

  // ── RAF loop: marching ants + brush cursor ────────────────────────────────
  useEffect(() => {
    const draw = () => {
      const ov = overlayRef.current;
      if (!ov) return;
      const ctx = ov.getContext("2d");
      ctx.clearRect(0, 0, ov.width, ov.height);
      // Marching ants
      const sr = selRef.current;
      if (sr) {
        const z = zoomRef.current,
          { x, y, w, h } = sr,
          d = Math.max(4, z * 0.5),
          off = dashOff.current;
        ctx.strokeStyle = "#000";
        ctx.lineWidth = 3;
        ctx.setLineDash([]);
        ctx.strokeRect(x * z + 0.5, y * z + 0.5, w * z - 1, h * z - 1);
        ctx.strokeStyle = "#fff";
        ctx.lineWidth = 1.5;
        ctx.strokeRect(x * z + 1.5, y * z + 1.5, w * z - 3, h * z - 3);
        ctx.strokeStyle = "#00e5ff";
        ctx.lineWidth = 1.5;
        ctx.setLineDash([d, d]);
        ctx.lineDashOffset = -off;
        ctx.strokeRect(x * z + 1.5, y * z + 1.5, w * z - 3, h * z - 3);
        ctx.strokeStyle = "rgba(0,0,0,0.4)";
        ctx.setLineDash([d, d]);
        ctx.lineDashOffset = d - off;
        ctx.strokeRect(x * z + 1.5, y * z + 1.5, w * z - 3, h * z - 3);
        ctx.setLineDash([]);
        ctx.fillStyle = "rgba(0,229,255,0.04)";
        ctx.fillRect(x * z, y * z, w * z, h * z);
      }
      // Brush cursor
      const t = toolRef.current,
        cur = curRef.current,
        isDrawing = drawingRef.current;
      if ((t === T.PEN || t === T.ERASER) && cur && !isDrawing) {
        const z = zoomRef.current,
          { x: cx, y: cy } = cur;
        const sz = bszAnim.current,
          sh = bshAnim.current,
          r = Math.floor(sz / 2);
        const ox = (cx - r) * z,
          oy = (cy - r) * z,
          bw = sz * z,
          bh = sz * z;
        const isErase = t === T.ERASER;
        if (isErase) {
          ctx.strokeStyle = "#000";
          ctx.lineWidth = 3;
          ctx.setLineDash([]);
          if (sh === "circle" && sz > 1) {
            ctx.beginPath();
            ctx.ellipse(
              cx * z + z / 2,
              cy * z + z / 2,
              bw / 2 + 1,
              bh / 2 + 1,
              0,
              0,
              Math.PI * 2,
            );
            ctx.stroke();
          } else ctx.strokeRect(ox - 1, oy - 1, bw + 2, bh + 2);
          ctx.strokeStyle = "#ff3333";
          ctx.lineWidth = 1.5;
          if (sh === "circle" && sz > 1) {
            ctx.beginPath();
            ctx.ellipse(
              cx * z + z / 2,
              cy * z + z / 2,
              bw / 2,
              bh / 2,
              0,
              0,
              Math.PI * 2,
            );
            ctx.stroke();
          } else ctx.strokeRect(ox + 0.5, oy + 0.5, bw - 1, bh - 1);
          ctx.strokeStyle = "rgba(255,255,255,0.6)";
          ctx.lineWidth = 0.5;
          if (sh === "circle" && sz > 1) {
            ctx.beginPath();
            ctx.ellipse(
              cx * z + z / 2,
              cy * z + z / 2,
              bw / 2 - 1,
              bh / 2 - 1,
              0,
              0,
              Math.PI * 2,
            );
            ctx.stroke();
          } else if (bw > 4) ctx.strokeRect(ox + 2, oy + 2, bw - 4, bh - 4);
          ctx.fillStyle = "#ff3333";
          ctx.fillRect(cx * z + z / 2 - 1.5, cy * z + z / 2 - 1.5, 3, 3);
          ctx.fillStyle = "#000";
          ctx.fillRect(cx * z + z / 2 - 0.5, cy * z + z / 2 - 0.5, 1, 1);
        } else {
          ctx.strokeStyle = "rgba(0,0,0,0.6)";
          ctx.lineWidth = 2.5;
          ctx.setLineDash([]);
          if (sh === "circle" && sz > 1) {
            ctx.beginPath();
            ctx.ellipse(
              cx * z + z / 2,
              cy * z + z / 2,
              bw / 2,
              bh / 2,
              0,
              0,
              Math.PI * 2,
            );
            ctx.stroke();
          } else ctx.strokeRect(ox - 0.5, oy - 0.5, bw + 1, bh + 1);
          ctx.strokeStyle = "rgba(255,255,255,0.9)";
          ctx.lineWidth = 1;
          ctx.setLineDash([2, 2]);
          if (sh === "circle" && sz > 1) {
            ctx.beginPath();
            ctx.ellipse(
              cx * z + z / 2,
              cy * z + z / 2,
              bw / 2,
              bh / 2,
              0,
              0,
              Math.PI * 2,
            );
            ctx.stroke();
          } else ctx.strokeRect(ox + 0.5, oy + 0.5, bw - 1, bh - 1);
          ctx.setLineDash([]);
          ctx.fillStyle = "rgba(255,255,255,0.8)";
          ctx.fillRect(cx * z + z / 2 - 1, cy * z + z / 2 - 1, 2, 2);
        }
        ctx.setLineDash([]);
      }
      dashOff.current =
        (dashOff.current + 0.3) % (Math.max(4, zoomRef.current * 0.5) * 2);
      animRef.current = requestAnimationFrame(draw);
    };
    animRef.current = requestAnimationFrame(draw);
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Zoom/pinch via wheel
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    let ld = null;
    const cl = (z) => Math.max(MINZ, Math.min(MAXZ, z));
    const onW = (e) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      setZoom((z) => cl(z + (e.deltaY < 0 ? 1 : -1)));
    };
    const onTS = (e) => {
      if (e.touches.length === 2) ld = null;
    };
    const onTM = (e) => {
      if (e.touches.length !== 2) return;
      e.preventDefault();
      const d = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY,
      );
      if (ld !== null) setZoom((z) => cl(Math.round(z * (d / ld))));
      ld = d;
    };
    el.addEventListener("wheel", onW, { passive: false });
    el.addEventListener("touchstart", onTS, { passive: true });
    el.addEventListener("touchmove", onTM, { passive: false });
    return () => {
      el.removeEventListener("wheel", onW);
      el.removeEventListener("touchstart", onTS);
      el.removeEventListener("touchmove", onTM);
    };
  }, [containerRef, setZoom]);

  // ── Mouse event handlers ──────────────────────────────────────────────────
  const onDown = useCallback(
    (e) => {
      if (e.button !== 0 && e.button !== 2) return;
      const isRight = e.button === 2;
      const [x, y] = getCell(e.clientX, e.clientY);
      const w = gWRef.current,
        h = gHRef.current,
        t = toolRef.current,
        ls = layersRef.current,
        idx = aiRef.current;
      const layer = ls[idx];
      // Right-click erase
      if (isRight && t !== T.SEL && t !== T.PICK) {
        if (!layer || layer.locked || x < 0 || x >= w || y < 0 || y >= h)
          return;
        if (floatPxRef.current && isPasteRef.current) commitFloat();
        push(ls);
        setDrawing(true);
        const g = applyBrush(
          layer.grid,
          x,
          y,
          null,
          bSzRef.current,
          bShRef.current,
          w,
          h,
        );
        pending.current = g;
        live(ls.map((l, i) => (i === idx ? { ...l, grid: g } : l)));
        setSc([x, y]);
        return;
      }
      if (isRight) return;
      if (t === T.PICK) {
        for (const { grid, visible } of ls) {
          if (!visible) continue;
          if (x >= 0 && x < w && y >= 0 && y < h && grid[y][x]) {
            store.setColor(grid[y][x]);
            recordColor(grid[y][x]);
            break;
          }
        }
        return;
      }
      if (t === T.SEL) {
        const sr = selRef.current,
          inSel =
            sr && x >= sr.x && x < sr.x + sr.w && y >= sr.y && y < sr.y + sr.h;
        if (inSel) {
          if (floatPxRef.current && isPasteRef.current) {
            setPixDrg(true);
            setPixDrgSt([x, y]);
            return;
          }
          const { grid } = ls[idx],
            pixels = [];
          for (let dy = 0; dy < sr.h; dy++)
            for (let dx = 0; dx < sr.w; dx++) {
              const px = sr.x + dx,
                py = sr.y + dy;
              if (px >= 0 && px < w && py >= 0 && py < h && grid[py][px])
                pixels.push({ dx, dy, col: grid[py][px] });
            }
          if (pixels.length > 0) {
            let bg = clone(grid);
            for (let dy = 0; dy < sr.h; dy++)
              for (let dx = 0; dx < sr.w; dx++) {
                const px = sr.x + dx,
                  py = sr.y + dy;
                if (px >= 0 && px < w && py >= 0 && py < h) bg[py][px] = null;
              }
            setBaseGrid(bg);
            setFloatPx(pixels);
            setIsPaste(false);
            setPixDrg(true);
            setPixDrgSt([x, y]);
          } else {
            setSelMov(true);
            setSelMovSt([x, y]);
          }
        } else {
          if (floatPxRef.current) commitFloat();
          setSel(null);
          setSelDrg(true);
          setSelSt([x, y]);
        }
        return;
      }
      if (floatPxRef.current && isPasteRef.current) commitFloat();
      if (!layer || layer.locked || x < 0 || x >= w || y < 0 || y >= h) return;
      if (t === T.FILL) {
        push(
          ls.map((l, i) =>
            i === idx
              ? { ...l, grid: floodFill(l.grid, x, y, colorRef.current, w, h) }
              : l,
          ),
        );
        recordColor(colorRef.current);
        return;
      }
      push(ls);
      setDrawing(true);
      if (t === T.PEN || t === T.ERASER) {
        const col = t === T.ERASER ? null : colorRef.current;
        const g = applyBrush(
          layer.grid,
          x,
          y,
          col,
          bSzRef.current,
          bShRef.current,
          w,
          h,
        );
        pending.current = g;
        live(ls.map((l, i) => (i === idx ? { ...l, grid: g } : l)));
        setSc([x, y]);
      } else setSc([x, y]);
    },
    [getCell, push, live, commitFloat, recordColor, store],
  );

  const onMove = useCallback(
    (e) => {
      const [x, y] = getCell(e.clientX, e.clientY);
      const w = gWRef.current,
        h = gHRef.current;
      if (x >= 0 && x < w && y >= 0 && y < h) {
        setCur({ x, y });
        curRef.current = { x, y };
      } else {
        setCur(null);
        curRef.current = null;
      }
      if (selDrgRef.current && selStRef.current) {
        const ss = selStRef.current;
        setSel({
          x: Math.min(ss[0], x),
          y: Math.min(ss[1], y),
          w: Math.abs(x - ss[0]) + 1,
          h: Math.abs(y - ss[1]) + 1,
        });
        return;
      }
      if (selMovRef.current && selMovStRef.current) {
        const [ox, oy] = selMovStRef.current,
          dx = x - ox,
          dy = y - oy;
        if (dx || dy) {
          setSel((r) => (r ? { ...r, x: r.x + dx, y: r.y + dy } : r));
          setSelMovSt([x, y]);
        }
        return;
      }
      if (pixDrgRef.current && pixDrgStRef.current) {
        const [ox, oy] = pixDrgStRef.current,
          dx = x - ox,
          dy = y - oy;
        if (dx || dy) {
          setSel((r) => (r ? { ...r, x: r.x + dx, y: r.y + dy } : r));
          setPixDrgSt([x, y]);
        }
        return;
      }
      if (!drawingRef.current) return;
      const t = toolRef.current,
        ls = layersRef.current,
        idx = aiRef.current;
      const layer = ls[idx];
      if (!layer || layer.locked) return;
      const s = scRef.current;
      if (t === T.PEN || t === T.ERASER) {
        const col = t === T.ERASER || e.buttons === 2 ? null : colorRef.current;
        if (s) {
          const pts = linePx(s[0], s[1], x, y);
          let g = pending.current || layer.grid;
          for (const [px, py] of pts)
            g = applyBrush(
              g,
              px,
              py,
              col,
              bSzRef.current,
              bShRef.current,
              w,
              h,
            );
          pending.current = g;
          live(ls.map((l, i) => (i === idx ? { ...l, grid: g } : l)));
          setSc([x, y]);
        }
      } else if (s) {
        let [ex, ey] = [x, y];
        if (shiftRef.current && SHAPE_TOOLS.includes(t))
          [ex, ey] = constrainEndpoint(t, s[0], s[1], x, y);
        setPreview(shapePx(t, s[0], s[1], ex, ey));
      }
    },
    [
      getCell,
      live,
      setCur,
      setSel,
      setSc,
      setPreview,
      setSelMovSt,
      setPixDrgSt,
    ],
  );

  const onUp = useCallback(
    (e) => {
      if (e.button !== 0 && e.button !== 2) return;
      const [x, y] = getCell(e.clientX, e.clientY);
      const w = gWRef.current,
        h = gHRef.current,
        t = toolRef.current,
        ls = layersRef.current,
        idx = aiRef.current;
      const layer = ls[idx],
        s = scRef.current;
      if (selDrgRef.current) {
        setSelDrg(false);
        setSelSt(null);
        return;
      }
      if (selMovRef.current) {
        setSelMov(false);
        setSelMovSt(null);
        return;
      }
      if (pixDrgRef.current) {
        setPixDrg(false);
        setPixDrgSt(null);
        if (!isPasteRef.current) commitFloat(selRef.current);
        return;
      }
      if (!drawingRef.current) return;
      setDrawing(false);
      if ((t === T.PEN || t === T.ERASER) && pending.current) {
        live(
          ls.map((l, i) => (i === idx ? { ...l, grid: pending.current } : l)),
        );
        pending.current = null;
        if (t === T.PEN) recordColor(colorRef.current);
      } else if (SHAPE_TOOLS.includes(t) && s && layer && !layer.locked) {
        let [ex, ey] = [x, y];
        if (shiftRef.current) [ex, ey] = constrainEndpoint(t, s[0], s[1], x, y);
        const col = colorRef.current,
          pts = shapePx(t, s[0], s[1], ex, ey);
        let g = clone(layer.grid);
        for (const [px, py] of pts)
          if (px >= 0 && px < w && py >= 0 && py < h) g[py][px] = col;
        push(ls.map((l, i) => (i === idx ? { ...l, grid: g } : l)));
        recordColor(col);
      }
      setPreview([]);
      setSc(null);
    },
    [getCell, push, live, commitFloat, recordColor],
  );

  const onLeave = useCallback(() => {
    setCur(null);
    curRef.current = null;
    setPreview([]);
    if (selDrgRef.current) {
      setSelDrg(false);
      return;
    }
    if (selMovRef.current) {
      setSelMov(false);
      setSelMovSt(null);
      return;
    }
    if (pixDrgRef.current) {
      setPixDrg(false);
      setPixDrgSt(null);
      if (!isPasteRef.current) commitFloat(selRef.current);
      return;
    }
    setSc(null);
  }, [commitFloat, setCur, setPreview, setSc]);

  // Global mouseup (catches releases outside canvas)
  useEffect(() => {
    const h = (e) => {
      if (e.button !== 0 && e.button !== 2) return;
      if (
        !drawingRef.current &&
        !selDrgRef.current &&
        !selMovRef.current &&
        !pixDrgRef.current
      )
        return;
      if (selDrgRef.current) {
        setSelDrg(false);
        setSelSt(null);
        return;
      }
      if (selMovRef.current) {
        setSelMov(false);
        setSelMovSt(null);
        return;
      }
      if (pixDrgRef.current) {
        setPixDrg(false);
        setPixDrgStRef(null);
        if (!isPasteRef.current) commitFloat(selRef.current);
        return;
      }
      if (drawingRef.current) {
        const t = toolRef.current,
          ls = layersRef.current,
          idx = aiRef.current;
        if ((t === T.PEN || t === T.ERASER) && pending.current) {
          live(
            ls.map((l, i) => (i === idx ? { ...l, grid: pending.current } : l)),
          );
          pending.current = null;
          if (t === T.PEN) recordColor(colorRef.current);
        }
        setDrawing(false);
        setSc(null);
        setPreview([]);
      }
    };
    window.addEventListener("mouseup", h);
    return () => window.removeEventListener("mouseup", h);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [push, live, commitFloat, recordColor]);

  return { cursor, shiftRef, onDown, onMove, onUp, onLeave };
}

// helper used inside global mouseup — needs to be available
function setPixDrgStRef() {} // placeholder; actual state setter passed through store

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 7 — useKeyboard hook
// Registers all keyboard shortcuts. Reads operations from store.
// ─────────────────────────────────────────────────────────────────────────────

function useKeyboard(store, shiftRef) {
  const {
    undo,
    redo,
    setZoom,
    setBrushSz,
    setTool,
    commitFloat,
    discardPaste,
    selAll,
    selCopy,
    selCut,
    selPaste,
    selDel,
    dupLayer,
    clip,
    floatPxRef,
    isPasteRef,
    selRef,
    setSel,
  } = store;

  useEffect(() => {
    const onDown = (e) => {
      shiftRef.current = e.shiftKey;
      const inInput = ["INPUT", "TEXTAREA"].includes(e.target?.tagName);
      if (e.ctrlKey || e.metaKey) {
        if (e.key === "a") {
          e.preventDefault();
          selAll();
        }
        if (!e.shiftKey && e.key === "z") {
          e.preventDefault();
          undo();
        }
        if (e.key === "y" || (e.shiftKey && e.key === "Z")) {
          e.preventDefault();
          redo();
        }
        if (e.key === "c") {
          e.preventDefault();
          selCopy();
        }
        if (e.key === "x") {
          e.preventDefault();
          selCut();
        }
        if (e.key === "v") {
          e.preventDefault();
          selPaste(clip);
        }
        if (e.key === "d") {
          e.preventDefault();
          dupLayer();
        }
        return;
      }
      if (inInput) return;
      const tk = TOOL_KEYS[e.key.toLowerCase()];
      if (tk) setTool(tk);
      if (e.key === "Enter" && floatPxRef.current) {
        e.preventDefault();
        commitFloat();
      }
      if (
        (e.key === "Delete" || e.key === "Backspace") &&
        selRef.current &&
        !floatPxRef.current
      ) {
        e.preventDefault();
        selDel();
      }
      if (e.key === "=" || e.key === "+") setZoom((z) => Math.min(MAXZ, z + 1));
      if (e.key === "-") setZoom((z) => Math.max(MINZ, z - 1));
      if (e.key === "[") setBrushSz((s) => Math.max(1, s - 1));
      if (e.key === "]") setBrushSz((s) => Math.min(10, s + 1));
      if (e.key === "Escape") {
        if (floatPxRef.current) {
          isPasteRef.current ? discardPaste() : commitFloat();
          setSel(null);
        } else setSel(null);
      }
    };
    const onUp = (e) => {
      shiftRef.current = e.shiftKey;
    };
    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    return () => {
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup", onUp);
    };
  }, [
    undo,
    redo,
    selAll,
    selCopy,
    selCut,
    selPaste,
    selDel,
    commitFloat,
    discardPaste,
    dupLayer,
    setTool,
    setZoom,
    setBrushSz,
    setSel,
    clip,
    shiftRef,
    floatPxRef,
    isPasteRef,
    selRef,
  ]);
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 8 — Small reusable UI atoms
// ─────────────────────────────────────────────────────────────────────────────

const EraserIcon = () => (
  <svg width={20} height={20} viewBox="0 0 24 24" fill="currentColor">
    <path d="M16.24 3.56l4.24 4.24a2 2 0 0 1 0 2.83L12 19.1H19v2H5l-3-3 9.56-9.56 4.68 4.68 3-3-4.24-4.24-7.07 7.07-1.41-1.41 7.07-7.07a2 2 0 0 1 2.83 0zM3.93 19.07L6.1 21.24l4.24-4.24-2.17-2.17-4.24 4.24z" />
  </svg>
);

const ToolBtn = memo(({ id, title, icon, shortcut, activeTool, onSelect }) => (
  <Tooltip
    title={`${title}${shortcut ? ` (${shortcut})` : ""}`}
    placement="right"
  >
    <IconButton
      onClick={() => onSelect(id)}
      size="small"
      sx={{
        width: 42,
        height: 42,
        borderRadius: 1.5,
        color: activeTool === id ? "primary.main" : "text.secondary",
        bgcolor:
          activeTool === id
            ? alpha(theme.palette.primary.main, 0.15)
            : "transparent",
        border: "1px solid",
        borderColor: activeTool === id ? "primary.main" : "transparent",
        "&:hover": { bgcolor: alpha(theme.palette.primary.main, 0.08) },
        transition: "all 0.12s",
      }}
    >
      {icon}
    </IconButton>
  </Tooltip>
));

const Swatch = memo(({ c, activeColor, onSelect, onRemove }) => (
  <Tooltip
    title={onRemove ? `${c} · right-click to remove` : c}
    placement="top"
  >
    <Box
      onClick={() => onSelect(c)}
      onContextMenu={
        onRemove
          ? (e) => {
              e.preventDefault();
              onRemove();
            }
          : undefined
      }
      sx={{
        width: 22,
        height: 22,
        borderRadius: "4px",
        bgcolor: c,
        cursor: "pointer",
        flexShrink: 0,
        border:
          activeColor === c
            ? "2.5px solid #fff"
            : "1.5px solid rgba(255,255,255,0.12)",
        boxShadow:
          activeColor === c
            ? `0 0 0 2px ${theme.palette.primary.main},0 0 8px ${c}88`
            : "none",
        transform: activeColor === c ? "scale(1.2)" : "scale(1)",
        transition: "transform 0.1s,box-shadow 0.1s",
      }}
    />
  </Tooltip>
));

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 9 — Layer sub-components
// ─────────────────────────────────────────────────────────────────────────────

const LayerThumb = memo(({ layer, gW, gH }) => {
  const ref = useRef(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    c.width = gW;
    c.height = gH;
    const ctx = c.getContext("2d");
    ctx.clearRect(0, 0, gW, gH);
    if (!layer.visible) return;
    ctx.globalAlpha = layer.opacity;
    for (let y = 0; y < gH; y++)
      for (let x = 0; x < gW; x++)
        if (layer.grid[y][x]) {
          ctx.fillStyle = layer.grid[y][x];
          ctx.fillRect(x, y, 1, 1);
        }
  }, [layer, gW, gH]);
  return (
    <canvas
      ref={ref}
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        imageRendering: "pixelated",
      }}
    />
  );
});
const LayerRow = memo(
  ({
    layer,
    idx,
    isActive,
    isDragOver,
    gW,
    gH,
    dispatch,
    upLayer,
    onDragStart,
    onDragOver,
    onDrop,
    onDragEnd,
    onClick,
  }) => (
    <Box
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      onClick={onClick}
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 0.5,
        px: 0.75,
        py: 0.5,
        borderRadius: 1,
        cursor: "pointer",
        userSelect: "none",
        bgcolor: isActive
          ? alpha(theme.palette.primary.main, 0.18)
          : "transparent",
        border: "1px solid",
        borderColor: isActive
          ? "primary.main"
          : isDragOver
            ? "secondary.main"
            : "transparent",
        "&:hover": {
          bgcolor: isActive
            ? alpha(theme.palette.primary.main, 0.22)
            : alpha("#fff", 0.04),
        },
        transition: "all 0.1s",
      }}
    >
      <DragIndicatorIcon
        sx={{
          fontSize: 14,
          color: "text.disabled",
          cursor: "grab",
          flexShrink: 0,
        }}
      />
      <Box
        sx={{
          width: 28,
          height: 28,
          borderRadius: 0.5,
          flexShrink: 0,
          overflow: "hidden",
          border: "1px solid rgba(255,255,255,.1)",
          position: "relative",
          backgroundImage: "repeating-conic-gradient(#aaa 0% 25%,#888 0% 50%)",
          backgroundSize: "8px 8px",
        }}
      >
        <LayerThumb layer={layer} gW={gW} gH={gH} />
      </Box>

      {/* Layer Name 編集 */}
      <TextField
        size="small"
        value={layer.name}
        variant="standard"
        onClick={(e) => e.stopPropagation()} // 親のクリック無効化
        onChange={(e) => upLayer(idx, { name: e.target.value })} // 直接更新
        sx={{
          flex: 1,
          "& input": { fontSize: 11, py: 0 },
          "& .MuiInput-underline:before": { borderColor: "transparent" },
          "& .MuiInput-underline:hover:before": {
            borderColor: "rgba(255,255,255,.2)",
          },
        }}
      />

      {/* Visibility */}
      <Tooltip title={layer.visible ? "Hide" : "Show"} placement="top">
        <IconButton
          size="small"
          sx={{ p: 0.25 }}
          onClick={(e) => {
            e.stopPropagation();
            upLayer(idx, { visible: !layer.visible });
          }}
        >
          {layer.visible ? (
            <VisibilityIcon sx={{ fontSize: 14 }} />
          ) : (
            <VisibilityOffIcon sx={{ fontSize: 14, color: "text.disabled" }} />
          )}
        </IconButton>
      </Tooltip>

      {/* Lock */}
      <Tooltip title={layer.locked ? "Unlock" : "Lock"} placement="top">
        <IconButton
          size="small"
          sx={{ p: 0.25 }}
          onClick={(e) => {
            e.stopPropagation();
            upLayer(idx, { locked: !layer.locked });
          }}
        >
          {layer.locked ? (
            <LockIcon sx={{ fontSize: 13, color: "warning.main" }} />
          ) : (
            <LockOpenIcon sx={{ fontSize: 13, color: "text.disabled" }} />
          )}
        </IconButton>
      </Tooltip>
    </Box>
  ),
);
// ─────────────────────────────────────────────────────────────────────────────
// SECTION 10 — Panel tab components
// ─────────────────────────────────────────────────────────────────────────────

function ColorTab({ store }) {
  const {
    color,
    setColor,
    colorHist,
    recordColor,
    brushSz,
    setBrushSz,
    brushSh,
    setBrushSh,
    custom,
    setCustom,
  } = store;
  const onSelect = useCallback((c) => setColor(c), [setColor]);
  return (
    <Box
      sx={{
        p: 1.5,
        display: "flex",
        flexDirection: "column",
        gap: 1.5,
        overflowY: "auto",
        flex: 1,
      }}
    >
      {/* Active color */}
      <Box>
        <Typography
          variant="overline"
          sx={{ fontSize: 9, color: "text.disabled", letterSpacing: 2 }}
        >
          Active Color
        </Typography>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 0.5 }}>
          <Box
            sx={{
              width: 42,
              height: 42,
              borderRadius: 1.5,
              bgcolor: color,
              flexShrink: 0,
              border: "2px solid rgba(255,255,255,.12)",
              boxShadow: `0 0 14px ${color}44`,
              cursor: "pointer",
              position: "relative",
              overflow: "hidden",
            }}
          >
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              style={{
                opacity: 0,
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                cursor: "pointer",
                border: "none",
              }}
            />
          </Box>
          <TextField
            size="small"
            value={color}
            onChange={(e) => {
              if (/^#[0-9a-fA-F]{0,6}$/.test(e.target.value))
                setColor(e.target.value);
            }}
            sx={{
              flex: 1,
              "& input": { fontFamily: "monospace", fontSize: 12, py: 0.7 },
            }}
            slotProps={{
              input: {
                maxLength: 7, // ← inputProps の代わり
              },
            }}
          />
        </Box>
        {colorHist.length > 0 && (
          <Box sx={{ mt: 0.75 }}>
            <Typography
              variant="overline"
              sx={{ fontSize: 8, color: "text.disabled", letterSpacing: 1 }}
            >
              Recent
            </Typography>
            <Box
              sx={{ display: "flex", flexWrap: "wrap", gap: "3px", mt: 0.25 }}
            >
              {colorHist.map((c, i) => (
                <Tooltip key={i} title={c} placement="top">
                  <Box
                    onClick={() => setColor(c)}
                    sx={{
                      width: 18,
                      height: 18,
                      borderRadius: "3px",
                      bgcolor: c,
                      cursor: "pointer",
                      flexShrink: 0,
                      border:
                        color === c
                          ? "2px solid #fff"
                          : "1px solid rgba(255,255,255,.15)",
                      transform: color === c ? "scale(1.15)" : "scale(1)",
                      transition: "transform 0.1s",
                    }}
                  />
                </Tooltip>
              ))}
            </Box>
          </Box>
        )}
      </Box>
      {/* Brush */}
      <Box>
        <Typography
          variant="overline"
          sx={{ fontSize: 9, color: "text.disabled", letterSpacing: 2 }}
        >
          Brush
        </Typography>
        <Box sx={{ display: "flex", gap: 1, mt: 0.5, alignItems: "center" }}>
          <Typography
            variant="caption"
            sx={{ color: "text.secondary", minWidth: 28, fontSize: 10 }}
          >
            Size
          </Typography>
          <Slider
            value={brushSz}
            min={1}
            max={10}
            step={1}
            size="small"
            onChange={(_, v) => setBrushSz(v)}
            sx={{ flex: 1, color: "primary.main" }}
          />
          <Typography
            variant="caption"
            sx={{
              minWidth: 20,
              color: "primary.light",
              fontWeight: 700,
              fontSize: 11,
            }}
          >
            {brushSz}px
          </Typography>
        </Box>
        <Box sx={{ display: "flex", gap: 0.5, mt: 0.75 }}>
          {[
            ["square", "□ Square"],
            ["circle", "○ Circle"],
          ].map(([v, l]) => (
            <Button
              key={v}
              size="small"
              variant={brushSh === v ? "contained" : "outlined"}
              onClick={() => setBrushSh(v)}
              sx={{
                flex: 1,
                fontSize: 10,
                py: 0.25,
                textTransform: "none",
                minWidth: 0,
              }}
            >
              {l}
            </Button>
          ))}
        </Box>
      </Box>
      <Divider />
      {/* Palette */}
      <Box>
        <Typography
          variant="overline"
          sx={{ fontSize: 9, color: "text.disabled", letterSpacing: 2 }}
        >
          Palette
        </Typography>
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: "4px", mt: 0.5 }}>
          {PAL.map((c) => (
            <Swatch key={c} c={c} activeColor={color} onSelect={onSelect} />
          ))}
        </Box>
      </Box>
      <Divider />
      {/* Custom colors */}
      <Box>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Typography
            variant="overline"
            sx={{ fontSize: 9, color: "text.disabled", letterSpacing: 2 }}
          >
            Custom
          </Typography>
          <Tooltip title="Save current color" placement="left">
            <IconButton
              size="small"
              sx={{ p: 0.25 }}
              onClick={() => {
                if (!custom.includes(color)) setCustom((p) => [...p, color]);
              }}
            >
              <AddIcon sx={{ fontSize: 14 }} />
            </IconButton>
          </Tooltip>
        </Box>
        <Box
          sx={{
            display: "flex",
            flexWrap: "wrap",
            gap: "4px",
            mt: 0.5,
            minHeight: 22,
          }}
        >
          {custom.length === 0 ? (
            <Typography
              variant="caption"
              sx={{ color: "text.disabled", fontSize: 10 }}
            >
              Click + to save color
            </Typography>
          ) : (
            custom.map((c, i) => (
              <Swatch
                key={i}
                c={c}
                activeColor={color}
                onSelect={onSelect}
                onRemove={() => setCustom((p) => p.filter((_, j) => j !== i))}
              />
            ))
          )}
        </Box>
      </Box>
      <Divider />
      {/* Shortcuts reference */}
      <Box>
        <Typography
          variant="overline"
          sx={{ fontSize: 9, color: "text.disabled", letterSpacing: 2 }}
        >
          Shortcuts
        </Typography>
        {SHORTCUTS.map(([k, v]) => (
          <Box
            key={k}
            sx={{ display: "flex", justifyContent: "space-between", mt: 0.4 }}
          >
            <Chip
              label={k}
              size="small"
              variant="outlined"
              sx={{
                fontSize: 8,
                height: 17,
                "& .MuiChip-label": { px: 0.6 },
                borderColor: "divider",
              }}
            />
            <Typography
              variant="caption"
              sx={{
                color: "text.secondary",
                fontSize: 10,
                alignSelf: "center",
              }}
            >
              {v}
            </Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );
}

function LayersTab({ store }) {
  const {
    layers,
    ai,
    setAi,
    AL,
    gW,
    gH,
    dispatch,
    addLayer,
    delLayer,
    dupLayer,
    mergeDown,
    movLayUp,
    movLayDn,
    drgOver,
    onLDrgStart,
    onLDrgOver,
    onLDrop,
  } = store;

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        flex: 1,
        overflow: "hidden",
      }}
    >
      {/* Toolbar */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 0.25,
          px: 0.75,
          py: 0.75,
          borderBottom: "1px solid",
          borderColor: "divider",
          flexWrap: "wrap",
        }}
      >
        <Tooltip title="Add layer">
          <IconButton size="small" onClick={addLayer}>
            <AddIcon sx={{ fontSize: 16 }} />
          </IconButton>
        </Tooltip>
        <Tooltip title="Duplicate (Ctrl+D)">
          <IconButton size="small" onClick={dupLayer}>
            <ContentCopyIcon sx={{ fontSize: 14 }} />
          </IconButton>
        </Tooltip>
        <Tooltip title="Delete">
          <span>
            <IconButton
              size="small"
              onClick={delLayer}
              disabled={layers.length <= 1}
            >
              <DeleteOutlineIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </span>
        </Tooltip>
        <Tooltip title="Merge down">
          <span>
            <IconButton
              size="small"
              onClick={mergeDown}
              disabled={ai >= layers.length - 1}
            >
              <KeyboardDoubleArrowDownIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </span>
        </Tooltip>
        <Box sx={{ flex: 1 }} />
        <Tooltip title="Move up">
          <span>
            <IconButton size="small" onClick={movLayUp} disabled={ai === 0}>
              <KeyboardArrowUpIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </span>
        </Tooltip>
        <Tooltip title="Move down">
          <span>
            <IconButton
              size="small"
              onClick={movLayDn}
              disabled={ai >= layers.length - 1}
            >
              <KeyboardArrowDownIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </span>
        </Tooltip>
      </Box>
      {/* Layer list */}
      <Box
        sx={{
          flex: 1,
          overflowY: "auto",
          p: 0.75,
          display: "flex",
          flexDirection: "column",
          gap: 0.5,
        }}
      >
        {layers.map((layer, idx) => (
          <LayerRow
            key={layer.id}
            layer={layer}
            idx={idx}
            isActive={ai === idx}
            isDragOver={drgOver === idx}
            gW={gW}
            gH={gH}
            dispatch={dispatch}
            upLayer={(i, p) => {
              const nl = layers.map((l, j) => (j === i ? { ...l, ...p } : l));
              dispatch({ type: "PUSH", v: nl });
            }}
            onDragStart={() => onLDrgStart(idx)}
            onDragOver={(e) => onLDrgOver(e, idx)}
            onDrop={(e) => onLDrop(e, idx)}
            onDragEnd={() => {
              store.setDrgLay && store.setDrgLay(null);
            }}
            onClick={() => setAi(idx)}
          />
        ))}
      </Box>
      {/* Opacity slider */}
      <Box sx={{ p: 1.25, borderTop: "1px solid", borderColor: "divider" }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
          <Typography
            variant="overline"
            sx={{ fontSize: 9, color: "text.disabled", letterSpacing: 2 }}
          >
            Opacity
          </Typography>
          <Typography
            variant="caption"
            sx={{ fontSize: 10, fontWeight: 700, color: "primary.light" }}
          >
            {Math.round(AL.opacity * 100)}%
          </Typography>
        </Box>
        <Slider
          value={AL.opacity}
          min={0}
          max={1}
          step={0.01}
          size="small"
          onChange={(_, v) => {
            const nl = layers.map((l, i) =>
              i === ai ? { ...l, opacity: v } : l,
            );
            dispatch({ type: "LIVE", v: nl });
          }}
          sx={{ color: "primary.main" }}
        />
      </Box>
    </Box>
  );
}

function MapTab({ store, mmRef }) {
  const { gW, gH, zoom, layers, hist, AL } = store;
  return (
    <Box
      sx={{
        flex: 1,
        overflowY: "auto",
        p: 1.5,
        display: "flex",
        flexDirection: "column",
        gap: 2,
        alignItems: "center",
      }}
    >
      <Typography
        variant="overline"
        sx={{
          fontSize: 9,
          color: "text.disabled",
          letterSpacing: 2,
          alignSelf: "flex-start",
        }}
      >
        Minimap
      </Typography>
      <Paper
        variant="outlined"
        sx={{ p: 0.75, bgcolor: "#0d0d1a", display: "inline-flex" }}
      >
        <canvas
          ref={mmRef}
          style={{
            imageRendering: "pixelated",
            maxWidth: MINIMAX,
            maxHeight: MINIMAX,
            display: "block",
          }}
        />
      </Paper>
      <Typography
        variant="caption"
        sx={{ color: "text.disabled", fontSize: 10 }}
      >
        {gW}×{gH} · {layers.filter((l) => l.visible).length}/{layers.length}{" "}
        visible
      </Typography>
      <Divider sx={{ width: "100%" }} />
      <Box sx={{ width: "100%" }}>
        <Typography
          variant="overline"
          sx={{ fontSize: 9, color: "text.disabled", letterSpacing: 2 }}
        >
          Info
        </Typography>
        {[
          ["Size", `${gW}×${gH}`],
          ["Zoom", `${zoom}×`],
          ["Layers", layers.length],
          ["Undo", hist.past.length],
          ["Redo", hist.future.length],
          ["Active", AL?.name],
        ].map(([k, v]) => (
          <Box
            key={k}
            sx={{ display: "flex", justifyContent: "space-between", mt: 0.5 }}
          >
            <Typography
              variant="caption"
              sx={{ color: "text.disabled", fontSize: 10 }}
            >
              {k}
            </Typography>
            <Typography
              variant="caption"
              sx={{ color: "text.primary", fontSize: 10, fontWeight: 500 }}
            >
              {v}
            </Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 11 — Top-level layout components
// ─────────────────────────────────────────────────────────────────────────────

function TopBar({ store, interaction, fileRef }) {
  const {
    gW,
    gH,
    canUndo,
    canRedo,
    undo,
    redo,
    flip,
    clearLay,
    setResizeOpen,
    setExportOpen,
    importImg,
    sel,
    clip,
    isPaste,
    floatPx,
    commitFloat,
    discardPaste,
    selAll,
    selCopy,
    selCut,
    selDel,
    selPaste,
    zoom,
    setZoom,
    tool,
  } = store;
  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 0.25,
        px: 1.5,
        height: 46,
        bgcolor: "background.paper",
        borderBottom: "1px solid",
        borderColor: "divider",
        flexShrink: 0,
        overflowX: "auto",
      }}
    >
      <Typography
        variant="h6"
        sx={{
          fontWeight: 900,
          letterSpacing: 3,
          mr: 1,
          flexShrink: 0,
          background: "linear-gradient(135deg,#7c4dff,#00e5ff)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
        }}
      >
        Pixel Art Editor
      </Typography>
      <Chip
        label={`${gW}×${gH}`}
        size="small"
        variant="outlined"
        sx={{
          fontSize: 10,
          height: 20,
          mr: 0.5,
          borderColor: "divider",
          flexShrink: 0,
        }}
      />
      <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />
      <Tooltip title="Undo (Ctrl+Z)" placement="bottom">
        <span>
          <IconButton size="small" onClick={undo} disabled={!canUndo}>
            <UndoIcon fontSize="small" />
          </IconButton>
        </span>
      </Tooltip>
      <Tooltip title="Redo (Ctrl+Y)" placement="bottom">
        <span>
          <IconButton size="small" onClick={redo} disabled={!canRedo}>
            <RedoIcon fontSize="small" />
          </IconButton>
        </span>
      </Tooltip>
      <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />
      <Tooltip title="Resize canvas" placement="bottom">
        <IconButton size="small" onClick={() => setResizeOpen(true)}>
          <AspectRatioIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      <Tooltip title="Clear active layer" placement="bottom">
        <IconButton size="small" onClick={clearLay}>
          <DeleteOutlineIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      <Tooltip title="Flip Horizontal" placement="bottom">
        <IconButton size="small" onClick={() => flip("h")}>
          <FlipIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      <Tooltip title="Flip Vertical" placement="bottom">
        <IconButton size="small" onClick={() => flip("v")}>
          <FlipIcon fontSize="small" sx={{ transform: "rotate(90deg)" }} />
        </IconButton>
      </Tooltip>
      <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />
      <Tooltip title="Select All (Ctrl+A)" placement="bottom">
        <IconButton
          size="small"
          onClick={selAll}
          sx={{ color: tool === T.SEL ? "secondary.main" : "text.secondary" }}
        >
          <CropFreeIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      {sel && (
        <>
          <Tooltip title="Copy (Ctrl+C)" placement="bottom">
            <IconButton size="small" onClick={selCopy}>
              <ContentCopyIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Cut (Ctrl+X)" placement="bottom">
            <IconButton size="small" onClick={selCut}>
              <ContentCutIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Delete (Del)" placement="bottom">
            <IconButton size="small" onClick={selDel}>
              <DeleteOutlineIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </>
      )}
      {clip && (
        <Tooltip
          title={`Paste ${clip.w}×${clip.h} (Ctrl+V)`}
          placement="bottom"
        >
          <Chip
            label={`📋 ${clip.w}×${clip.h}`}
            size="small"
            onClick={() => selPaste(clip)}
            sx={{
              height: 22,
              fontSize: 9,
              cursor: "pointer",
              bgcolor: alpha(theme.palette.primary.main, 0.15),
              color: "primary.light",
              border: "1px solid",
              borderColor: "primary.main",
              "&:hover": { bgcolor: alpha(theme.palette.primary.main, 0.28) },
            }}
          />
        </Tooltip>
      )}
      {isPaste && floatPx && (
        <>
          <Tooltip title="Apply paste (Enter)" placement="bottom">
            <Button
              size="small"
              variant="contained"
              color="secondary"
              onClick={() => commitFloat()}
              sx={{
                textTransform: "none",
                fontSize: 10,
                minWidth: 0,
                px: 1,
                py: 0.25,
                ml: 0.5,
              }}
            >
              ✓ Apply
            </Button>
          </Tooltip>
          <Tooltip title="Cancel paste (Esc)" placement="bottom">
            <IconButton size="small" onClick={discardPaste}>
              <DeleteOutlineIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </>
      )}
      <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />
      <Box
        sx={{ display: "flex", alignItems: "center", gap: 0.75, flexShrink: 0 }}
      >
        <Tooltip title="Zoom out (-)">
          <span>
            <IconButton
              size="small"
              onClick={() => setZoom((z) => Math.max(MINZ, z - 1))}
              sx={{ p: 0.25 }}
            >
              <RemoveIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </span>
        </Tooltip>
        <Slider
          value={zoom}
          min={MINZ}
          max={MAXZ}
          onChange={(_, v) => setZoom(v)}
          size="small"
          sx={{ width: 88, color: "primary.main", flexShrink: 0 }}
        />
        <Tooltip title="Zoom in (+)">
          <span>
            <IconButton
              size="small"
              onClick={() => setZoom((z) => Math.min(MAXZ, z + 1))}
              sx={{ p: 0.25 }}
            >
              <AddIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </span>
        </Tooltip>
        <Typography
          variant="caption"
          sx={{
            minWidth: 26,
            color: "primary.light",
            fontWeight: 700,
            fontSize: 11,
          }}
        >
          {zoom}×
        </Typography>
      </Box>
      <Box sx={{ flex: 1 }} />
      <Tooltip title="Import PNG/JPG" placement="bottom">
        <IconButton size="small" onClick={() => fileRef.current?.click()}>
          <FileUploadIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      <input
        ref={fileRef}
        type="file"
        accept="image/png,image/jpeg"
        style={{ display: "none" }}
        onChange={(e) => {
          importImg(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      <Button
        size="small"
        variant="contained"
        startIcon={<FileDownloadIcon />}
        onClick={() => setExportOpen(true)}
        sx={{ textTransform: "none", fontSize: 11, ml: 0.5, flexShrink: 0 }}
      >
        Export
      </Button>
    </Box>
  );
}

function LeftToolbar({ store }) {
  const { tool, setTool } = store;
  return (
    <Box
      sx={{
        width: 52,
        bgcolor: "background.paper",
        borderRight: "1px solid",
        borderColor: "divider",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        py: 1,
        gap: 0.5,
        overflowY: "auto",
        flexShrink: 0,
      }}
    >
      <Typography
        variant="caption"
        sx={{ fontSize: 9, color: "text.disabled", letterSpacing: 1, mb: 0.25 }}
      >
        DRAW
      </Typography>
      <ToolBtn
        id={T.PEN}
        title="Pen"
        icon={<EditIcon fontSize="small" />}
        shortcut="P"
        activeTool={tool}
        onSelect={setTool}
      />
      <ToolBtn
        id={T.ERASER}
        title="Eraser"
        icon={<EraserIcon />}
        shortcut="E"
        activeTool={tool}
        onSelect={setTool}
      />
      <ToolBtn
        id={T.FILL}
        title="Fill"
        icon={<FormatColorFillIcon fontSize="small" />}
        shortcut="F"
        activeTool={tool}
        onSelect={setTool}
      />
      <ToolBtn
        id={T.PICK}
        title="Eyedropper"
        icon={<ColorizeIcon fontSize="small" />}
        shortcut="I"
        activeTool={tool}
        onSelect={setTool}
      />
      <Divider sx={{ width: "70%", my: 0.5 }} />
      <Typography
        variant="caption"
        sx={{ fontSize: 9, color: "text.disabled", letterSpacing: 1, mb: 0.25 }}
      >
        SEL
      </Typography>
      <ToolBtn
        id={T.SEL}
        title="Rect Select"
        icon={<SelectAllIcon fontSize="small" />}
        shortcut="S"
        activeTool={tool}
        onSelect={setTool}
      />
      <Divider sx={{ width: "70%", my: 0.5 }} />
      <Typography
        variant="caption"
        sx={{ fontSize: 9, color: "text.disabled", letterSpacing: 1, mb: 0.25 }}
      >
        SHAPE
      </Typography>
      <ToolBtn
        id={T.LINE}
        title="Line"
        icon={
          <HorizontalRuleIcon
            fontSize="small"
            sx={{ transform: "rotate(-45deg)" }}
          />
        }
        shortcut="L"
        activeTool={tool}
        onSelect={setTool}
      />
      <ToolBtn
        id={T.RECT}
        title="Rect outline"
        icon={<Crop75Outlined fontSize="small" />}
        activeTool={tool}
        onSelect={setTool}
      />
      <ToolBtn
        id={T.RECTF}
        title="Rect filled"
        icon={<RectangleIcon fontSize="small" />}
        shortcut="R"
        activeTool={tool}
        onSelect={setTool}
      />
      <ToolBtn
        id={T.CIRCLE}
        title="Circle outline"
        icon={<RadioButtonUncheckedIcon fontSize="small" />}
        activeTool={tool}
        onSelect={setTool}
      />
      <ToolBtn
        id={T.CIRCLEF}
        title="Circle filled"
        icon={<CircleIcon fontSize="small" />}
        shortcut="C"
        activeTool={tool}
        onSelect={setTool}
      />
    </Box>
  );
}

function DrawingCanvas({ store, interaction, canvasRef, overlayRef }) {
  const { cursor, onDown, onMove, onUp, onLeave } = interaction;
  return (
    <Box
      sx={{
        position: "relative",
        flexShrink: 0,
        boxShadow: "0 8px 48px rgba(0,0,0,.7),0 0 0 1px rgba(255,255,255,.05)",
        borderRadius: "2px",
      }}
    >
      <canvas
        ref={canvasRef}
        style={{ display: "block", cursor, imageRendering: "pixelated" }}
        onMouseDown={onDown}
        onMouseMove={onMove}
        onMouseUp={onUp}
        onMouseLeave={onLeave}
        onContextMenu={(e) => e.preventDefault()}
      />
      <canvas
        ref={overlayRef}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          pointerEvents: "none",
          imageRendering: "pixelated",
        }}
      />
    </Box>
  );
}

function StatusBar({ store }) {
  const { cur, gW, gH, zoom, tool, sel, isPaste } = store;
  return (
    <Box
      sx={{
        height: 24,
        bgcolor: "background.paper",
        borderTop: "1px solid",
        borderColor: "divider",
        px: 2,
        display: "flex",
        alignItems: "center",
        gap: 2,
        flexShrink: 0,
      }}
    >
      <Typography
        variant="caption"
        sx={{ color: "text.disabled", fontSize: 10 }}
      >
        {cur ? `X: ${cur.x}  Y: ${cur.y}` : "—"}
      </Typography>
      <Divider orientation="vertical" flexItem sx={{ my: 0.5 }} />
      <Typography
        variant="caption"
        sx={{ color: "text.disabled", fontSize: 10 }}
      >
        {gW}×{gH}
      </Typography>
      <Divider orientation="vertical" flexItem sx={{ my: 0.5 }} />
      <Typography
        variant="caption"
        sx={{ color: "text.disabled", fontSize: 10 }}
      >
        {zoom}×
      </Typography>
      {SHAPE_TOOLS.includes(tool) && (
        <>
          <Divider orientation="vertical" flexItem sx={{ my: 0.5 }} />
          <Typography
            variant="caption"
            sx={{ color: "text.disabled", fontSize: 10 }}
          >
            Hold Shift to constrain
          </Typography>
        </>
      )}
      {sel && (
        <>
          <Divider orientation="vertical" flexItem sx={{ my: 0.5 }} />
          <Typography
            variant="caption"
            sx={{
              color: isPaste ? "warning.main" : "secondary.main",
              fontSize: 10,
            }}
          >
            {isPaste ? "📋 Paste" : "Sel"} {sel.w}×{sel.h} @ ({sel.x},{sel.y})
            {isPaste ? " · drag · Enter=apply · Esc=cancel" : ""}
          </Typography>
        </>
      )}
      <Box sx={{ flex: 1 }} />
      <Typography
        variant="caption"
        sx={{ color: "text.disabled", fontSize: 10 }}
      >
        {store.AL?.name}
        {store.AL?.locked && " 🔒"}
      </Typography>
      <Divider orientation="vertical" flexItem sx={{ my: 0.5 }} />
      <Typography
        variant="caption"
        sx={{ color: "text.disabled", fontSize: 10 }}
      >
        {store.layers.length} layers
      </Typography>
    </Box>
  );
}

function CanvasArea({
  store,
  interaction,
  canvasRef,
  overlayRef,
  containerRef,
}) {
  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        flex: 1,
        overflow: "hidden",
      }}
    >
      <Box
        ref={containerRef}
        sx={{
          flex: 1,
          overflow: "auto",
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "flex-start",
          p: 3,
          background:
            "radial-gradient(ellipse at center,#1a1a2e 0%,#0a0a18 100%)",
        }}
      >
        <DrawingCanvas
          store={store}
          interaction={interaction}
          canvasRef={canvasRef}
          overlayRef={overlayRef}
        />
      </Box>
      <StatusBar store={store} />
    </Box>
  );
}

function RightPanel({ store, mmRef }) {
  const [tab, setTab] = useState(0);
  const { layers } = store;
  return (
    <Box
      sx={{
        width: 280,
        flexShrink: 0,
        bgcolor: "background.paper",
        borderLeft: "1px solid",
        borderColor: "divider",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      <Tabs
        value={tab}
        onChange={(_, v) => setTab(v)}
        variant="fullWidth"
        sx={{
          minHeight: 34,
          "& .MuiTab-root": { minHeight: 34, fontSize: 10, py: 0, px: 0.5 },
        }}
      >
        <Tab
          icon={<PaletteIcon sx={{ fontSize: 13 }} />}
          iconPosition="start"
          label="Color"
        />
        <Tab
          icon={<LayersIcon sx={{ fontSize: 13 }} />}
          iconPosition="start"
          label={
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
              Layers
              <Chip
                label={layers.length}
                size="small"
                sx={{
                  height: 15,
                  fontSize: 8,
                  "& .MuiChip-label": { px: 0.5 },
                }}
              />
            </Box>
          }
        />
        <Tab
          icon={<MapIcon sx={{ fontSize: 13 }} />}
          iconPosition="start"
          label="Map"
        />
      </Tabs>
      <Divider />
      {tab === 0 && <ColorTab store={store} />}
      {tab === 1 && <LayersTab store={store} />}
      {tab === 2 && <MapTab store={store} mmRef={mmRef} />}
    </Box>
  );
}

function ResizeDialog({ store }) {
  const { resizeOpen, setResizeOpen, sizeInp, setSizeInp, resizeApply } = store;
  const [local, setLocal] = useState(sizeInp);
  return (
    <Dialog
      open={resizeOpen}
      onClose={() => setResizeOpen(false)}
      maxWidth="xs"
      fullWidth
    >
      <DialogTitle sx={{ pb: 1 }}>Resize Canvas</DialogTitle>
      <DialogContent sx={{ display: "flex", gap: 2, pt: "12px !important" }}>
        {[
          ["Width", "w"],
          ["Height", "h"],
        ].map(([lbl, k]) => (
          <TextField
            key={k}
            label={lbl}
            type="number"
            size="small"
            fullWidth
            value={sizeInp[k]}
            slotProps={{
              input: { min: 1, max: 512 }, // ← inputProps の代わり
            }}
            onChange={(e) =>
              setSizeInp((s) => ({ ...s, [k]: +e.target.value }))
            }
            helperText="1–512 px"
          />
        ))}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button
          onClick={() => setResizeOpen(false)}
          variant="outlined"
          size="small"
        >
          Cancel
        </Button>
        <Button
          onClick={() =>
            resizeApply(
              Math.max(1, Math.min(512, sizeInp.w)),
              Math.max(1, Math.min(512, sizeInp.h)),
            )
          }
          variant="contained"
          size="small"
        >
          Apply
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function ExportDialog({ store }) {
  const { exportOpen, setExportOpen, exportImg, gW, gH } = store;
  return (
    <Dialog
      open={exportOpen}
      onClose={() => setExportOpen(false)}
      maxWidth="xs"
    >
      <DialogTitle>Export Image</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Flattens all visible layers at {gW}×{gH}px. Scaled exports are
          pixel-perfect.
        </Typography>
        <Stack spacing={1}>
          {[
            [1, "PNG (1×, transparent)"],
            [2, "PNG (2×)"],
            [4, "PNG (4×)"],
            [8, "PNG (8×)"],
            [40, "PNG (40×)"],
          ].map(([s, l]) => (
            <Button
              key={s}
              variant={s === 1 ? "contained" : "outlined"}
              fullWidth
              startIcon={<FileDownloadIcon />}
              onClick={() => exportImg("png", s)}
            >
              {l}
            </Button>
          ))}
          <Divider />
          <Button
            variant="outlined"
            fullWidth
            startIcon={<FileDownloadIcon />}
            onClick={() => exportImg("jpg", 1)}
          >
            JPG (1×, white bg)
          </Button>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setExportOpen(false)}>Cancel</Button>
      </DialogActions>
    </Dialog>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 12 — Minimap effect (co-located with Map data concern)
// ─────────────────────────────────────────────────────────────────────────────

function useMinimap(store, mmRef) {
  const { layers, gW, gH } = store;
  useEffect(() => {
    const mc = mmRef.current;
    if (!mc) return;
    const sc = Math.min(MINIMAX / gW, MINIMAX / gH, 4);
    mc.width = Math.ceil(gW * sc);
    mc.height = Math.ceil(gH * sc);
    const ctx = mc.getContext("2d");
    for (let y = 0; y < gH; y++)
      for (let x = 0; x < gW; x++) {
        ctx.fillStyle = (x + y) % 2 === 0 ? "#d0d0d0" : "#b8b8b8";
        ctx.fillRect(~~(x * sc), ~~(y * sc), Math.ceil(sc), Math.ceil(sc));
      }
    for (let li = layers.length - 1; li >= 0; li--) {
      const { grid, visible, opacity } = layers[li];
      if (!visible || !opacity) continue;
      ctx.globalAlpha = opacity;
      for (let y = 0; y < gH; y++)
        for (let x = 0; x < gW; x++)
          if (grid[y][x]) {
            ctx.fillStyle = grid[y][x];
            ctx.fillRect(~~(x * sc), ~~(y * sc), Math.ceil(sc), Math.ceil(sc));
          }
    }
    ctx.globalAlpha = 1;
  }, [layers, gW, gH, mmRef]);
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 13 — App: root component, wires everything together
// ─────────────────────────────────────────────────────────────────────────────

export default function App() {
  // DOM refs passed to hooks and components
  const canvasRef = useRef(null);
  const overlayRef = useRef(null);
  const containerRef = useRef(null);
  const mmRef = useRef(null);
  const fileRef = useRef(null);

  // Hooks — each owns a distinct concern
  const store = useEditorState();
  const interaction = useCanvasInteraction(
    store,
    canvasRef,
    overlayRef,
    containerRef,
  );
  useKeyboard(store, interaction.shiftRef);
  useMinimap(store, mmRef);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          height: "100vh",
          overflow: "hidden",
          bgcolor: "background.default",
        }}
      >
        <TopBar store={store} interaction={interaction} fileRef={fileRef} />
        <Box sx={{ display: "flex", flex: 1, overflow: "hidden" }}>
          <LeftToolbar store={store} />
          <CanvasArea
            store={store}
            interaction={interaction}
            canvasRef={canvasRef}
            overlayRef={overlayRef}
            containerRef={containerRef}
          />
          <RightPanel store={store} mmRef={mmRef} />
        </Box>
        <ResizeDialog store={store} />
        <ExportDialog store={store} />
      </Box>
    </ThemeProvider>
  );
}
