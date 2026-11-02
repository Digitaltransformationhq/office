package com.kaps.office.mobile;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(MobilePrintPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
