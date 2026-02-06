package com.ssafy.arnnect.preference.application.vo;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@AllArgsConstructor
@NoArgsConstructor
public class AxisScore {

    private int ar = 0;
    private int nm = 0;
    private int lc = 0;
    private int se = 0;

    public void add(AxisScore other) {
        this.ar += other.ar;
        this.nm += other.nm;
        this.lc += other.lc;
        this.se += other.se;
    }
}
