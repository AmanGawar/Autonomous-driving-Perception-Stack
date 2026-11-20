"""
Unit Tests for ByteTrack Tracker
"""

import numpy as np
import pytest
from perception_stack.tracker.byte_track import ByteTracker, STrack


def test_bytetrack_lifecycle():
    STrack.reset_counter()
    tracker = ByteTracker(track_thresh=0.4, track_buffer=10)

    # Frame 1: Detection of vehicle [x1, y1, x2, y2, score, class_id]
    frame1_dets = np.array([
        [100.0, 150.0, 200.0, 250.0, 0.92, 0.0]
    ])
    tracks1 = tracker.update(frame1_dets)
    assert len(tracks1) == 1
    track_id = tracks1[0].track_id

    # Frame 2: Vehicle moves slightly
    frame2_dets = np.array([
        [104.0, 152.0, 204.0, 252.0, 0.88, 0.0]
    ])
    tracks2 = tracker.update(frame2_dets)
    assert len(tracks2) == 1
    assert tracks2[0].track_id == track_id  # Track ID maintained!


def test_bytetrack_low_confidence_recovery():
    STrack.reset_counter()
    tracker = ByteTracker(track_thresh=0.5, track_buffer=10)

    # Frame 1: high conf
    f1 = np.array([[100.0, 100.0, 200.0, 200.0, 0.90, 0.0]])
    tracker.update(f1)

    # Frame 2: Occluded / blurry detection with low confidence (0.25)
    # Standard SORT would drop this; ByteTrack associates it in second pass!
    f2 = np.array([[102.0, 101.0, 202.0, 201.0, 0.28, 0.0]])
    tracks2 = tracker.update(f2)
    assert len(tracks2) == 1
    assert tracks2[0].score == pytest.approx(0.28, abs=1e-2)


if __name__ == "__main__":
    test_bytetrack_lifecycle()
    test_bytetrack_low_confidence_recovery()
    print("All ByteTrack tests passed!")
