package com.ssafy.arnnect.preference.application.vo;

import java.util.Map;

public class GenreMbtiWeight {

    public static final Map<Long, AxisScore> MAP = Map.ofEntries(
            Map.entry(1L, new AxisScore(0,0,0,0)),
            Map.entry(2L, new AxisScore(2,-1,-1,1)),
            Map.entry(3L, new AxisScore(-1,-1,2,-1)),
            Map.entry(4L, new AxisScore(-2,1,1,-1)),
            Map.entry(5L, new AxisScore(1,2,1,1)),
            Map.entry(6L, new AxisScore(-1,-2,-2,-1)),
            Map.entry(7L, new AxisScore(1,2,0,2)),
            Map.entry(9L, new AxisScore(1,1,-2,1)),
            Map.entry(10L,new AxisScore(-1,2,0,2)),
            Map.entry(11L,new AxisScore(-2,0,-1,-2)),
            Map.entry(12L,new AxisScore(-2,1,1,-1))
    );
}
