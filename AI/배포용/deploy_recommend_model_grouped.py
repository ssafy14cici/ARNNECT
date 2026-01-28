# -*- coding: utf-8 -*-
# Deploy recommender for VectorSASRec + TwoTowerAlign
# - logs: flat (old) OR grouped (new) json/jsonl (auto-detect)

from __future__ import annotations
import argparse, json
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, Iterator, List, Optional, Tuple

import torch
import torch.nn as nn
import torch.nn.functional as F

ACTION_SET = {"VIEW","LIKE","STAY","COMMENT","REVIEW"}
ACT2IDX = {"<PAD>":0,"VIEW":1,"LIKE":2,"STAY":3,"COMMENT":4,"REVIEW":5}

# ---------- models ----------
class VectorSASRec(nn.Module):
    def __init__(self, clip_dim=512, hidden_dim=512, num_actions=6, n_layers=2, n_heads=4, dropout=0.1, maxlen=200):
        super().__init__()
        self.clip_dim=int(clip_dim); self.hidden_dim=int(hidden_dim); self.maxlen=int(maxlen)
        self.item_in_proj = nn.Linear(self.clip_dim, self.hidden_dim, bias=False)
        self.act_emb = nn.Embedding(int(num_actions), self.hidden_dim, padding_idx=0)
        self.pos_emb = nn.Embedding(self.maxlen, self.hidden_dim)
        self.drop = nn.Dropout(float(dropout))
        layer = nn.TransformerEncoderLayer(
            d_model=self.hidden_dim, nhead=int(n_heads), dim_feedforward=4*self.hidden_dim,
            dropout=float(dropout), batch_first=True, activation="gelu", norm_first=True
        )
        self.enc = nn.TransformerEncoder(layer, num_layers=int(n_layers))

    def item_base(self, item_vectors: torch.Tensor) -> torch.Tensor:
        return self.item_in_proj(item_vectors)

    def forward(self, item_ids: torch.Tensor, act_ids: torch.Tensor, item_vectors: torch.Tensor) -> torch.Tensor:
        if item_ids.dim()!=2: raise ValueError(f"item_ids must be (B,S), got {tuple(item_ids.shape)}")
        B,S=item_ids.shape
        if S>self.maxlen:
            item_ids=item_ids[:,-self.maxlen:]; act_ids=act_ids[:,-self.maxlen:]; B,S=item_ids.shape
        if item_vectors.device!=item_ids.device:
            item_vectors=item_vectors.to(item_ids.device, non_blocking=True)
        v = F.embedding(item_ids, item_vectors)
        x = self.item_in_proj(v) + self.act_emb(act_ids)
        pos = torch.arange(S, device=item_ids.device).unsqueeze(0).expand(B,S)
        x = self.drop(x + self.pos_emb(pos))
        x = self.enc(x, src_key_padding_mask=(item_ids==0))
        return x

    @torch.no_grad()
    def encode_last(self, item_ids, act_ids, item_vectors):
        return self.forward(item_ids, act_ids, item_vectors)[:,-1,:]

class TwoTowerAlign(nn.Module):
    def __init__(self, dim=512, dropout=0.1):
        super().__init__()
        d=int(dim)
        self.user = nn.Sequential(nn.LayerNorm(d), nn.Dropout(float(dropout)), nn.Linear(d,d,bias=False))
        self.item = nn.Sequential(nn.LayerNorm(d), nn.Dropout(float(dropout)), nn.Linear(d,d,bias=False))
    def user_proj(self,x): return self.user(x)
    def item_proj(self,x): return self.item(x)

# ---------- IO: vectors ----------
def load_item_vectors(path: Path, expected_dim=512):
    obj = json.loads(path.read_text(encoding="utf-8"))
    a2i={"<PAD>":0}; i2a={0:"<PAD>"}; vecs=[[0.0]*expected_dim]
    def add(aid, vec):
        if aid in a2i: return
        if vec is None or len(vec)!=expected_dim: return
        idx=len(vecs); a2i[aid]=idx; i2a[idx]=aid; vecs.append(vec)
    if isinstance(obj, dict):
        for aid,vec in obj.items(): add(str(aid), vec)
    elif isinstance(obj, list):
        for it in obj:
            if not isinstance(it, dict): continue
            aid = it.get("artwork_id") or it.get("id") or it.get("artworkId")
            vec = it.get("vector") or it.get("embedding") or it.get("vec")
            if aid is not None and vec is not None: add(str(aid), vec)
    else:
        raise ValueError("Unsupported vector format")
    return torch.tensor(vecs, dtype=torch.float32), a2i, i2a

# ---------- IO: logs ----------
def _iter_jsonl(p: Path) -> Iterator[Dict[str,Any]]:
    with p.open("r", encoding="utf-8") as f:
        for line in f:
            s=line.strip()
            if not s: continue
            try: obj=json.loads(s)
            except json.JSONDecodeError: continue
            if isinstance(obj, dict): yield obj

def _is_json_array(p: Path) -> bool:
    try:
        h=p.read_text(encoding="utf-8", errors="ignore").lstrip()[:1]
        return h=="["
    except Exception:
        return False

def _read_small(p: Path) -> List[Dict[str,Any]]:
    if _is_json_array(p):
        obj=json.loads(p.read_text(encoding="utf-8"))
        return obj if isinstance(obj,list) else []
    return list(_iter_jsonl(p))

def _get_action(d: Any, default="VIEW") -> str:
    if isinstance(d, dict):
        for k in ("action_type","action","act","timestamp"):
            v=d.get(k)
            if isinstance(v,str) and v.strip():
                s=v.strip().upper()
                if s in ACTION_SET: return s
        return default
    if isinstance(d,str) and d.strip():
        s=d.strip().upper()
        return s if s in ACTION_SET else default
    return default

def _parse_dt(x: Any) -> Optional[datetime]:
    if x is None: return None
    if isinstance(x,(int,float)):
        try: return datetime.fromtimestamp(float(x))
        except Exception: return None
    if isinstance(x,str):
        s=x.strip()
        if not s: return None
        try: return datetime.fromisoformat(s.replace("Z","+00:00"))
        except Exception: return None
    return None

def _detect_format(row: Dict[str,Any]) -> str:
    if isinstance(row.get("timestamp"), list) and ("member_id" in row or "user_id" in row): return "grouped"
    return "flat"

@dataclass
class LogCfg:
    logs_are_latest_first: bool = True
    use_timestamp_sort: bool = False

def _grouped_events(row: Dict[str,Any], cfg: LogCfg) -> List[Tuple[Optional[datetime], str, str]]:
    seq=row.get("timestamp")
    if not isinstance(seq,list): return []
    out=[]
    for ev in seq:
        if not isinstance(ev,dict): continue
        aid=ev.get("artwork_id") or ev.get("item_id") or ev.get("artworkId")
        if aid is None: continue
        out.append((_parse_dt(ev.get("timestamp")), str(aid), _get_action(ev,"VIEW")))
    if cfg.use_timestamp_sort and any(t is not None for t,_,_ in out):
        out.sort(key=lambda x: datetime.min if x[0] is None else x[0])
    else:
        if cfg.logs_are_latest_first: out=list(reversed(out))
    return out  # old->new

def _seq_from_events(events_old_to_new, a2i, maxlen):
    idxs=[]; acts=[]
    for _t, aid, act in events_old_to_new:
        idx=a2i.get(aid,0)
        if idx==0: continue
        idxs.append(idx); acts.append(ACT2IDX.get(act, ACT2IDX["VIEW"]))
    if not idxs:
        return torch.zeros((1,maxlen),dtype=torch.long), torch.zeros((1,maxlen),dtype=torch.long), []
    hist=idxs[-maxlen:]; hact=acts[-maxlen:]
    pad=maxlen-len(hist)
    hist=[0]*pad+hist; hact=[0]*pad+hact
    return torch.tensor(hist,dtype=torch.long).unsqueeze(0), torch.tensor(hact,dtype=torch.long).unsqueeze(0), idxs

def load_user_seq(log_path: Path, member_id: str, a2i, maxlen: int, cfg: LogCfg, logs_format="auto"):
    rows=_read_small(log_path) if _is_json_array(log_path) else None
    if rows is not None:
        if not rows: return _seq_from_events([],a2i,maxlen)
        fmt=_detect_format(rows[0]) if logs_format=="auto" else logs_format
        if fmt=="grouped":
            for r in rows:
                uid=str(r.get("member_id") or r.get("user_id") or r.get("uid"))
                if uid==str(member_id):
                    return _seq_from_events(_grouped_events(r,cfg), a2i, maxlen)
            return _seq_from_events([],a2i,maxlen)
        # flat array
        evs=[]
        for r in rows:
            uid=str(r.get("member_id") or r.get("user_id") or r.get("uid"))
            if uid!=str(member_id): continue
            aid=r.get("artwork_id") or r.get("item_id") or r.get("artworkId")
            if aid is None: continue
            evs.append((_parse_dt(r.get("timestamp")), str(aid), _get_action(r, str(r.get("action_type") or "VIEW"))))
        if cfg.use_timestamp_sort and any(t is not None for t,_,_ in evs):
            evs.sort(key=lambda x: datetime.min if x[0] is None else x[0])
        else:
            if cfg.logs_are_latest_first: evs=list(reversed(evs))
        return _seq_from_events(evs,a2i,maxlen)

    # jsonl
    it=_iter_jsonl(log_path)
    try: first=next(it)
    except StopIteration: return _seq_from_events([],a2i,maxlen)
    fmt=_detect_format(first) if logs_format=="auto" else logs_format
    if fmt=="grouped":
        # each line is a user row
        # check first then the rest
        rows=[first]; rows.extend(list(it))
        for r in rows:
            uid=str(r.get("member_id") or r.get("user_id") or r.get("uid"))
            if uid==str(member_id):
                return _seq_from_events(_grouped_events(r,cfg), a2i, maxlen)
        return _seq_from_events([],a2i,maxlen)

    # flat per-event jsonl
    evs=[]
    def gen():
        yield first
        for r in it: yield r
    for r in gen():
        uid=str(r.get("member_id") or r.get("user_id") or r.get("uid"))
        if uid!=str(member_id): continue
        aid=r.get("artwork_id") or r.get("item_id") or r.get("artworkId")
        if aid is None: continue
        evs.append((_parse_dt(r.get("timestamp")), str(aid), _get_action(r, str(r.get("action_type") or "VIEW"))))
    if cfg.use_timestamp_sort and any(t is not None for t,_,_ in evs):
        evs.sort(key=lambda x: datetime.min if x[0] is None else x[0])
    else:
        if cfg.logs_are_latest_first: evs=list(reversed(evs))
    return _seq_from_events(evs,a2i,maxlen)

# ---------- recommender ----------
def load_ckpt(p: Path):
    ckpt=torch.load(str(p), map_location="cpu")
    if isinstance(ckpt, dict) and "state_dict" in ckpt:
        return ckpt["state_dict"], ckpt.get("two_tower_state_dict",{}), ckpt.get("config",{})
    return ckpt, {}, {}

@torch.no_grad()
def recommend(sas, tt, item_mat, item_final, seq_items, seq_acts, seen, topk=20):
    device=item_mat.device
    if item_final is None:
        # vector-only fallback
        if not seen: return []
        vecs=item_mat[torch.tensor(list(set(seen)), device=device)]
        user=F.normalize(vecs.mean(dim=0, keepdim=True), dim=-1)
        scores=(user @ F.normalize(item_mat, dim=-1).t()).squeeze(0)
    else:
        u=F.normalize(tt.user_proj(sas.encode_last(seq_items.to(device), seq_acts.to(device), item_mat)), dim=-1)
        scores=(u @ item_final.t()).squeeze(0)
    scores[0]=-1e9
    if seen:
        idx=torch.tensor(list(set(seen)), device=device, dtype=torch.long)
        scores[idx]=-1e9
    s, idx=torch.topk(scores, k=min(int(topk), scores.numel()-1))
    return [(int(i), float(sc)) for sc,i in zip(s.tolist(), idx.tolist())]

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument("--vectors", required=True)
    ap.add_argument("--logs", required=True)
    ap.add_argument("--member_id", required=True)
    ap.add_argument("--ckpt", default=None)
    ap.add_argument("--topk", type=int, default=20)
    ap.add_argument("--device", default="cuda" if torch.cuda.is_available() else "cpu")
    ap.add_argument("--vector_only", action="store_true")
    ap.add_argument("--logs_format", default="auto", choices=["auto","flat","grouped"])
    ap.add_argument("--logs_are_latest_first", action="store_true")
    ap.add_argument("--logs_are_oldest_first", action="store_true")
    ap.add_argument("--use_timestamp_sort", action="store_true")
    args=ap.parse_args()

    device=torch.device(args.device)

    # 1) load ckpt first -> know clip_dim/maxlen (so vectors can be loaded with correct dim)
    sas=tt=None; item_final=None
    clip_dim=512; hid=512; maxlen=200; drop=0.1; layers=2; heads=4
    if (args.ckpt is not None) and (not args.vector_only):
        sas_sd, tt_sd, cfg = load_ckpt(Path(args.ckpt))
        clip_dim=int(cfg.get("clip_dim",512))
        hid=int(cfg.get("hidden", cfg.get("hidden_dim",512)))
        maxlen=int(cfg.get("maxlen",200))
        drop=float(cfg.get("dropout",0.1))
        layers=int(cfg.get("n_layers",2))
        heads=int(cfg.get("n_heads",4))
    else:
        sas_sd=tt_sd=cfg=None

    # 2) load vectors with correct expected_dim
    item_mat, a2i, i2a = load_item_vectors(Path(args.vectors), expected_dim=512)
    device=torch.device(args.device)
    item_mat=item_mat.to(device, non_blocking=True)

    # 3) build model (optional)
    if (args.ckpt is not None) and (not args.vector_only):
        sas=VectorSASRec(clip_dim=clip_dim, hidden_dim=hid, n_layers=layers, n_heads=heads, dropout=drop, maxlen=maxlen).to(device)
        tt=TwoTowerAlign(dim=hid, dropout=drop).to(device)
        sas.load_state_dict(sas_sd, strict=False)
        if tt_sd: tt.load_state_dict(tt_sd, strict=False)
        sas.eval(); tt.eval()
        with torch.no_grad():
            item_final=F.normalize(tt.item_proj(sas.item_base(item_mat)), dim=-1)

    latest_first=True
    if args.logs_are_oldest_first: latest_first=False
    elif args.logs_are_latest_first: latest_first=True
    else: latest_first=True
    logcfg=LogCfg(logs_are_latest_first=latest_first, use_timestamp_sort=bool(args.use_timestamp_sort))

    seq_items, seq_acts, raw_idxs = load_user_seq(Path(args.logs), args.member_id, a2i, maxlen, logcfg, logs_format=args.logs_format)
    seen=[i for i in raw_idxs if i!=0]

    recs = recommend(sas, tt, item_mat, item_final, seq_items, seq_acts, seen, topk=args.topk)
    print(f">>> top{args.topk} for {args.member_id}")
    for r,(idx,sc) in enumerate(recs,1):
        print(f"{r:02d}. {i2a.get(idx,'?')}\t{sc:.6f}")

if __name__=="__main__":
    main()
