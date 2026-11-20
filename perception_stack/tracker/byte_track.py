"""
ByteTrack: Multi-Object Tracking by Associating Every Detection Box
Paper: ByteTrack (Zhang et al., ECCV 2022)
"""

from enum import Enum
from typing import List, Tuple, Optional
import numpy as np
from .kalman_filter import KalmanFilter
from .matching import box_iou, linear_assignment


class TrackState(Enum):
    New = 0
    Tracked = 1
    Lost = 2
    Removed = 3


class STrack:
    """Single Object Tracklet."""

    shared_kalman = KalmanFilter()
    _count = 0

    def __init__(self, tlwh: np.ndarray, score: float, class_id: int):
        # tlwh: top-left x, top-left y, width, height
        self._tlwh = np.asarray(tlwh, dtype=np.float32)
        self.kalman_filter = None
        self.mean = None
        self.covariance = None
        self.is_activated = False

        self.score = score
        self.class_id = class_id
        self.tracklet_len = 0
        self.time_since_update = 0
        self.state = TrackState.New

        self.track_id = self.next_id()
        self.history = []

    @classmethod
    def next_id(cls):
        cls._count += 1
        return cls._count

    @classmethod
    def reset_counter(cls):
        cls._count = 0

    def activate(self, kalman_filter: KalmanFilter, frame_id: int):
        """Start a new tracklet."""
        self.kalman_filter = kalman_filter
        self.track_id = self.next_id()
        self.mean, self.covariance = self.kalman_filter.initiate(self.tlwh_to_xyah(self._tlwh))
        self.tracklet_len = 0
        self.state = TrackState.Tracked
        if frame_id == 1:
            self.is_activated = True
        self.frame_id = frame_id
        self.start_frame = frame_id

    def re_activate(self, new_track: "STrack", frame_id: int, new_id: bool = False):
        self.mean, self.covariance = self.kalman_filter.update(
            self.mean, self.covariance, self.tlwh_to_xyah(new_track.tlwh)
        )
        self.tracklet_len = 0
        self.state = TrackState.Tracked
        self.is_activated = True
        self.frame_id = frame_id
        if new_id:
            self.track_id = self.next_id()
        self.score = new_track.score

    def update(self, new_track: "STrack", frame_id: int):
        """Update track with new detection."""
        self.frame_id = frame_id
        self.tracklet_len += 1
        new_tlwh = new_track.tlwh
        self.mean, self.covariance = self.kalman_filter.update(
            self.mean, self.covariance, self.tlwh_to_xyah(new_tlwh)
        )
        self.state = TrackState.Tracked
        self.is_activated = True
        self.score = new_track.score

        # Save history for trajectory visualization
        x1, y1, w, h = self.tlwh
        self.history.append((float(x1 + w / 2), float(y1 + h)))
        if len(self.history) > 30:
            self.history.pop(0)

    @property
    def tlwh(self):
        if self.mean is None:
            return self._tlwh.copy()
        ret = self.mean[:4].copy()
        ret[2] *= ret[3]
        ret[:2] -= ret[2:] / 2
        return ret

    @property
    def tlbr(self):
        ret = self.tlwh.copy()
        ret[2:] += ret[:2]
        return ret

    @staticmethod
    def tlwh_to_xyah(tlwh: np.ndarray):
        ret = np.asarray(tlwh).copy()
        ret[:2] += ret[2:] / 2
        ret[2] /= ret[3]
        return ret

    @staticmethod
    def tlbr_to_tlwh(tlbr: np.ndarray):
        ret = np.asarray(tlbr).copy()
        ret[2:] -= ret[:2]
        return ret


class ByteTracker:
    """
    ByteTrack Multi-Object Tracker for Autonomous Driving.
    Preserves low-confidence detections across frames to prevent occlusion dropouts.
    """

    def __init__(
        self,
        track_thresh: float = 0.5,
        track_buffer: int = 30,
        match_thresh: float = 0.8,
        frame_rate: int = 30
    ):
        self.track_thresh = track_thresh
        self.match_thresh = match_thresh
        self.frame_id = 0
        self.det_thresh = track_thresh + 0.1
        self.buffer_size = int(frame_rate / 30.0 * track_buffer)
        self.max_time_lost = self.buffer_size
        self.kalman_filter = KalmanFilter()

        self.tracked_stracks: List[STrack] = []
        self.lost_stracks: List[STrack] = []
        self.removed_stracks: List[STrack] = []

    def update(self, output_results: np.ndarray) -> List[STrack]:
        """
        Processes detections in current frame.
        output_results: array of shape [N, 6] -> [x1, y1, x2, y2, score, class_id]
        Returns list of active tracked STracks.
        """
        self.frame_id += 1
        activated_starcks = []
        refind_stracks = []
        lost_stracks = []
        removed_stracks = []

        if len(output_results) > 0:
            scores = output_results[:, 4]
            bboxes = output_results[:, :4]
            classes = output_results[:, 5]

            remain_inds = scores > self.track_thresh
            inds_low = scores > 0.1
            inds_high = scores < self.track_thresh
            inds_second = np.logical_and(inds_low, inds_high)

            dets_second = bboxes[inds_second]
            dets = bboxes[remain_inds]
            scores_keep = scores[remain_inds]
            scores_second = scores[inds_second]
            classes_keep = classes[remain_inds]
            classes_second = classes[inds_second]

            detections = [
                STrack(STrack.tlbr_to_tlwh(tlbr), s, int(c))
                for (tlbr, s, c) in zip(dets, scores_keep, classes_keep)
            ]
            detections_second = [
                STrack(STrack.tlbr_to_tlwh(tlbr), s, int(c))
                for (tlbr, s, c) in zip(dets_second, scores_second, classes_second)
            ]
        else:
            detections = []
            detections_second = []

        unconfirmed = []
        tracked_stracks = []
        for track in self.tracked_stracks:
            if not track.is_activated:
                unconfirmed.append(track)
            else:
                tracked_stracks.append(track)

        strack_pool = self._joint_stracks(tracked_stracks, self.lost_stracks)

        # Kalman Filter Predict for all existing tracks
        for strack in strack_pool:
            strack.mean, strack.covariance = self.kalman_filter.predict(strack.mean, strack.covariance)

        # First association: High score detections with existing tracks
        dists = self._iou_distance(strack_pool, detections)
        matches, u_track, u_detection = linear_assignment(dists, thresh=self.match_thresh)

        for itracked, idet in matches:
            track = strack_pool[itracked]
            det = detections[idet]
            if track.state == TrackState.Tracked:
                track.update(det, self.frame_id)
                activated_starcks.append(track)
            else:
                track.re_activate(det, self.frame_id, new_id=False)
                refind_stracks.append(track)

        # Second association: Low score detections with unmatched tracks
        r_tracked_stracks = [strack_pool[i] for i in u_track if strack_pool[i].state == TrackState.Tracked]
        dists = self._iou_distance(r_tracked_stracks, detections_second)
        matches, u_track_second, _ = linear_assignment(dists, thresh=0.5)

        for itracked, idet in matches:
            track = r_tracked_stracks[itracked]
            det = detections_second[idet]
            if track.state == TrackState.Tracked:
                track.update(det, self.frame_id)
                activated_starcks.append(track)
            else:
                track.re_activate(det, self.frame_id, new_id=False)
                refind_stracks.append(track)

        for it in u_track_second:
            track = r_tracked_stracks[it]
            if not track.state == TrackState.Lost:
                track.state = TrackState.Lost
                lost_stracks.append(track)

        # Deal with unconfirmed tracks
        detections = [detections[i] for i in u_detection]
        dists = self._iou_distance(unconfirmed, detections)
        matches, u_unconfirmed, u_detection = linear_assignment(dists, thresh=0.7)
        for itracked, idet in matches:
            unconfirmed[itracked].update(detections[idet], self.frame_id)
            activated_starcks.append(unconfirmed[itracked])
        for it in u_unconfirmed:
            track = unconfirmed[it]
            track.state = TrackState.Removed
            removed_stracks.append(track)

        # Init new tracks
        for inew in u_detection:
            track = detections[inew]
            if track.score < self.det_thresh:
                continue
            track.activate(self.kalman_filter, self.frame_id)
            activated_starcks.append(track)

        # Update state
        for track in self.lost_stracks:
            if self.frame_id - track.frame_id > self.max_time_lost:
                track.state = TrackState.Removed
                removed_stracks.append(track)

        self.tracked_stracks = [t for t in self.tracked_stracks if t.state == TrackState.Tracked]
        self.tracked_stracks = self._joint_stracks(self.tracked_stracks, activated_starcks)
        self.tracked_stracks = self._joint_stracks(self.tracked_stracks, refind_stracks)
        self.lost_stracks = self._sub_stracks(self.lost_stracks, self.tracked_stracks)
        self.lost_stracks.extend(lost_stracks)
        self.lost_stracks = self._sub_stracks(self.lost_stracks, self.removed_stracks)
        self.removed_stracks.extend(removed_stracks)
        self.tracked_stracks, self.lost_stracks = self._remove_duplicate_stracks(
            self.tracked_stracks, self.lost_stracks
        )

        output_stracks = [track for track in self.tracked_stracks if track.is_activated]
        return output_stracks

    @staticmethod
    def _joint_stracks(tlista: List[STrack], tlistb: List[STrack]) -> List[STrack]:
        exists = {}
        res = []
        for t in tlista:
            exists[t.track_id] = 1
            res.append(t)
        for t in tlistb:
            tid = t.track_id
            if not exists.get(tid, 0):
                exists[tid] = 1
                res.append(t)
        return res

    @staticmethod
    def _sub_stracks(tlista: List[STrack], tlistb: List[STrack]) -> List[STrack]:
        stracks = {t.track_id: t for t in tlista}
        for t in tlistb:
            tid = t.track_id
            if tid in stracks:
                del stracks[tid]
        return list(stracks.values())

    @staticmethod
    def _remove_duplicate_stracks(s_a: List[STrack], s_b: List[STrack]):
        pdist = ByteTracker._iou_distance(s_a, s_b)
        pairs = np.where(pdist < 0.15)
        dupa, dupb = list(), list()
        for p, q in zip(*pairs):
            timep = s_a[p].frame_id - s_a[p].start_frame
            timeq = s_b[q].frame_id - s_b[q].start_frame
            if timep > timeq:
                dupb.append(q)
            else:
                dupa.append(p)
        resa = [t for i, t in enumerate(s_a) if i not in dupa]
        resb = [t for i, t in enumerate(s_b) if i not in dupb]
        return resa, resb

    @staticmethod
    def _iou_distance(atracks: List[STrack], btracks: List[STrack]) -> np.ndarray:
        if (len(atracks) > 0 and isinstance(atracks[0], np.ndarray)) or (
            len(btracks) > 0 and isinstance(btracks[0], np.ndarray)
        ):
            atlbrs = atracks
            btlbrs = btracks
        else:
            atlbrs = [track.tlbr for track in atracks]
            btlbrs = [track.tlbr for track in btracks]

        _ious = box_iou(np.array(atlbrs), np.array(btlbrs))
        cost_matrix = 1.0 - _ious
        return cost_matrix
