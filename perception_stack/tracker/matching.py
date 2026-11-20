"""
Data association and linear sum assignment utilities for ByteTrack.
"""

import numpy as np


def box_iou(boxes_a: np.ndarray, boxes_b: np.ndarray) -> np.ndarray:
    """
    Computes Intersection over Union (IoU) between two sets of boxes.
    boxes_a: [N, 4] format [x1, y1, x2, y2]
    boxes_b: [M, 4] format [x1, y1, x2, y2]
    Returns [N, M] matrix of IoU values.
    """
    if len(boxes_a) == 0 or len(boxes_b) == 0:
        return np.zeros((len(boxes_a), len(boxes_b)), dtype=np.float32)

    boxes_a = np.ascontiguousarray(boxes_a, dtype=np.float32)
    boxes_b = np.ascontiguousarray(boxes_b, dtype=np.float32)

    area_a = (boxes_a[:, 2] - boxes_a[:, 0]) * (boxes_a[:, 3] - boxes_a[:, 1])
    area_b = (boxes_b[:, 2] - boxes_b[:, 0]) * (boxes_b[:, 3] - boxes_b[:, 1])

    lt = np.maximum(boxes_a[:, None, :2], boxes_b[:, :2])  # [N, M, 2]
    rb = np.minimum(boxes_a[:, None, 2:], boxes_b[:, 2:])  # [N, M, 2]

    wh = np.clip(rb - lt, 0, None)  # [N, M, 2]
    inter = wh[:, :, 0] * wh[:, :, 1]  # [N, M]

    union = area_a[:, None] + area_b - inter
    iou = inter / np.clip(union, 1e-6, None)
    return iou


def linear_assignment(cost_matrix: np.ndarray, thresh: float):
    """
    Solves linear assignment problem with threshold gating.
    Uses greedy matching or scipy/numpy fallback.
    """
    if cost_matrix.size == 0:
        return np.empty((0, 2), dtype=int), tuple(range(cost_matrix.shape[0])), tuple(range(cost_matrix.shape[1]))

    try:
        from scipy.optimize import linear_sum_assignment
        row_ind, col_ind = linear_sum_assignment(cost_matrix)
    except ImportError:
        # Fast greedy fallback if scipy is not installed
        row_ind, col_ind = _greedy_assignment(cost_matrix)

    matches = []
    unmatched_a = list(range(cost_matrix.shape[0]))
    unmatched_b = list(range(cost_matrix.shape[1]))

    for r, c in zip(row_ind, col_ind):
        if cost_matrix[r, c] <= thresh:
            matches.append([r, c])
            if r in unmatched_a:
                unmatched_a.remove(r)
            if c in unmatched_b:
                unmatched_b.remove(c)

    return np.array(matches, dtype=int) if matches else np.empty((0, 2), dtype=int), tuple(unmatched_a), tuple(unmatched_b)


def _greedy_assignment(cost_matrix: np.ndarray):
    """Simple greedy assignment fallback."""
    rows, cols = cost_matrix.shape
    used_rows = set()
    used_cols = set()
    matches = []

    # Flatten indices sorted by ascending cost
    flat_indices = np.argsort(cost_matrix.ravel())
    for idx in flat_indices:
        r = idx // cols
        c = idx % cols
        if r not in used_rows and c not in used_cols:
            used_rows.add(r)
            used_cols.add(c)
            matches.append((r, c))
            if len(used_rows) == rows or len(used_cols) == cols:
                break

    if not matches:
        return [], []
    r_inds, c_inds = zip(*matches)
    return list(r_inds), list(c_inds)
